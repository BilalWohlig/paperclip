# WebSocket Reconnection Handling — Integration Test Plan

**Project:** Tic-Tac-Toe (NestJS + Socket.io)
**Scope:** WebSocket disconnect and reconnect behaviour in the `/game` namespace
**Status:** Planning — no reconnection logic exists yet; this plan specifies the required behaviour and the tests that must pass once it is implemented.

---

## Architecture Baseline

Before reading the test cases, understand the current system:

| Component | Detail |
|---|---|
| Transport | Socket.io over the `/game` namespace |
| State store | In-memory `Map` in `RoomService` (process-local) |
| Player identity | `socket.id` — rotates on every new connection |
| Reconnection token | **Does not exist yet** — must be added |
| Grace period | **Does not exist yet** — must be added |
| Room cleanup | Immediate on last player disconnect |

The tests below assume a **reconnection token** (opaque string, e.g. UUID) is issued at room creation / join time and that a **grace period** (recommended: 30 s) is honoured before permanent player removal.

---

## Shared Test Fixtures

```typescript
// test/helpers/ws-client.ts
import { io, Socket } from 'socket.io-client';

export function createClient(): Socket {
  return io('http://localhost:3001/game', { autoConnect: false });
}

export function connect(client: Socket): Promise<void> {
  return new Promise((resolve) => {
    client.connect();
    client.once('connect', resolve);
  });
}

export function waitFor(client: Socket, event: string): Promise<unknown> {
  return new Promise((resolve) => client.once(event, resolve));
}
```

All test suites use `beforeAll` to start the NestJS app and `afterAll` to close it.
Each test that needs a "live" game uses a helper that:
1. Connects Alice (`create_room`) → receives `room_created` + `reconnectToken`
2. Connects Bob (`join_room`) → both receive `game_started`

---

## Scenario 1 — Mid-Game Disconnect (Single Player Drops)

**Intent:** When one player loses their socket connection during an active game, the game must pause, the surviving player must be notified, and the room must remain intact for the grace period.

### TC-1.1 — Disconnect emits `player_disconnected` to the remaining player

```
Given Alice and Bob have started a game
When Alice's socket closes unexpectedly
Then Bob receives { event: 'player_disconnected', payload: { playerName: 'Alice', gracePeriodSeconds: 30 } }
 And the room status remains 'paused' (not 'finished')
 And the board state is unchanged
```

### TC-1.2 — Disconnected player's slot is reserved for the grace period

```
Given Alice has disconnected
When a third client attempts to join Alice and Bob's room with join_room
Then that client receives an error: 'Room is reserved for a reconnecting player'
 And the room still shows 2 player slots
```

### TC-1.3 — Surviving player cannot make moves while opponent is disconnected

```
Given Alice has disconnected and it was Alice's turn
When Bob attempts make_move { position: 4 }
Then Bob receives an error: 'Game is paused — waiting for opponent to reconnect'
 And the board is unchanged
```

### TC-1.4 — Surviving player cannot make moves when it is the disconnected player's turn

Same expectation as TC-1.3 — moves are blocked regardless of whose turn it was.

---

## Scenario 2 — Reconnect Within the Grace Period

**Intent:** A player who reconnects before the grace period expires must be able to resume the game exactly where it left off.

### TC-2.1 — Successful reconnection re-associates the player

```
Given Alice disconnected mid-game (board partially filled)
 And Bob received player_disconnected
When Alice connects a NEW socket and emits reconnect { token: '<aliceReconnectToken>' }
Then Alice receives game_resumed {
       board: <exact board at disconnect>,
       yourSymbol: 'X',
       opponentName: 'Bob',
       turn: <turn at disconnect>,
       roomCode: '<code>'
     }
 And Bob receives opponent_reconnected { playerName: 'Alice' }
 And the room status transitions back to 'playing'
```

### TC-2.2 — Game resumes from correct turn after reconnect

```
Given it was Bob's turn when Alice disconnected
 And Alice reconnects within the grace period
When Bob emits make_move { position: 0 }
Then both players receive move_made with the updated board
```

### TC-2.3 — Board state is exactly preserved across the reconnect

```
Given moves [4, 0, 8] have been played when Alice disconnects
 And Alice reconnects within the grace period
Then the board received in game_resumed equals [null,null,null,null,'X',null,null,null,'O']
  (position 4 = X first move, position 8 = O second move, etc.)
```

### TC-2.4 — Old socket cannot be used after reconnect

```
Given Alice's original socket is still technically open (TCP linger)
When the original socket emits make_move
Then it receives error: 'Socket superseded by reconnection'
 And the new socket continues to receive events normally
```

### TC-2.5 — Reconnect token is single-use

```
Given Alice has successfully reconnected using her token
When Alice (or any other client) uses the same token again
Then the second attempt receives error: 'Reconnect token already consumed'
```

---

## Scenario 3 — Reconnect After Grace Period Expires

**Intent:** If the grace period elapses with no reconnection, the room must be cleaned up and the surviving player must be informed that the game is over.

### TC-3.1 — Room transitions to finished after grace period

```
Given Alice disconnected and the grace period is set to 30 s
When 30 s elapse without Alice reconnecting
Then Bob receives player_left_permanently { playerName: 'Alice', reason: 'timeout' }
 And the room status is 'finished'
 And the room is removed from RoomService.rooms
```

*Implementation note: use fake timers (`jest.useFakeTimers`) so tests do not actually wait 30 s.*

### TC-3.2 — Reconnect attempt after timeout is rejected

```
Given Alice's grace period has expired
When Alice emits reconnect { token: '<aliceReconnectToken>' }
Then she receives error: 'Reconnect token expired — game has ended'
 And she is NOT added to any room
```

### TC-3.3 — Surviving player receives a final game result

```
Given Alice disconnected and did not reconnect within the grace period
Then Bob's player_left_permanently event includes:
  { result: 'win', reason: 'opponent_timeout', yourSymbol: 'O' }
```

### TC-3.4 — Bob can create or join a new room after the timeout

```
Given Bob received player_left_permanently
When Bob emits create_room { playerName: 'Bob' }
Then Bob receives room_created with a new room code
 And no error occurs
```

---

## Scenario 4 — Both Players Disconnect Simultaneously

**Intent:** When both sockets drop at the same time (e.g., network outage), the room must be handled deterministically — no orphaned state, no partial cleanup, no race conditions.

### TC-4.1 — Room is cleaned up when both players disconnect with no reconnect

```
Given Alice and Bob are in an active game
When both sockets close within 100 ms of each other
 And neither reconnects within the grace period
Then RoomService.rooms does NOT contain the room code
 And RoomService.socketToRoom does NOT contain either socket ID
```

### TC-4.2 — First reconnect finds the room still alive

```
Given both players disconnected simultaneously
When Alice reconnects within the grace period (Bob has not yet reconnected)
Then Alice receives game_resumed with the preserved board state
 And the room status is 'paused'
```

### TC-4.3 — Second reconnect also succeeds while room is paused

```
Given Alice reconnected (room is paused)
When Bob also reconnects within the grace period
Then Bob receives game_resumed
 And Alice receives opponent_reconnected
 And the room status transitions to 'playing'
 And the turn is correct (matching game state at the time of disconnect)
```

### TC-4.4 — Grace period timer uses the last disconnect time

```
Given Alice disconnected at T+0 and Bob disconnected at T+20 s
 And the grace period is 30 s
When Bob (second to disconnect) fails to reconnect by T+50 s (30 s after Bob's drop)
Then the room is marked finished and removed
 And the grace period did NOT expire at T+30 s (Alice's disconnect + 30 s)
```

### TC-4.5 — No duplicate player_left_permanently events

```
Given both players disconnected and neither reconnected
When the grace period expires for the last disconnected player
Then exactly one cleanup sweep runs
 And no redundant state-change events are emitted to any client
```

---

## Scenario 5 — Server Restart During an Active Game

**Intent:** Because state is in-memory only, a server restart permanently destroys all room state. Players must receive a clear error on reconnection rather than hanging indefinitely.

### TC-5.1 — Reconnect token is invalid after server restart

```
Given Alice and Bob are mid-game with valid reconnect tokens
When the NestJS process restarts
 And Alice emits reconnect { token: '<aliceReconnectToken>' }
Then Alice receives error: 'Reconnect token not found — server may have restarted'
```

*Test by: stopping the app, clearing in-memory state, restarting the app, then attempting reconnect.*

### TC-5.2 — New connection after restart starts fresh

```
Given the server has restarted
When Alice emits create_room { playerName: 'Alice' }
Then she receives a valid room_created response
 And no leftover state from before the restart interferes
```

### TC-5.3 — Clients detect server restart via Socket.io disconnect event

```
Given Alice is connected mid-game
When the server process is killed (SIGTERM / SIGKILL)
Then Alice's socket emits disconnect with reason 'transport close' or 'transport error'
 And the client-side UI can display 'Server restarted — please start a new game'
```

*This test runs at the infrastructure level (e2e) by killing the server process and observing client-side events.*

### TC-5.4 — Server restart does not leave zombie rooms in memory

```
Given the server has restarted cleanly
When GET /api/health (or equivalent) is called
Then the in-memory room count is 0
 And no prior room codes are accessible via join_room
```

---

## Non-Functional / Cross-Cutting Requirements

| ID | Requirement | Verification |
|---|---|---|
| NFR-1 | Grace period is configurable via env var `RECONNECT_GRACE_PERIOD_MS` | Unit test — inject different values |
| NFR-2 | Reconnect tokens are cryptographically random (UUID v4 minimum) | Regex assertion in token-issuing test |
| NFR-3 | Expired tokens are purged from memory — no unbounded growth | Run 1000 simulated expired sessions; assert memory delta < threshold |
| NFR-4 | Grace-period timers are cancelled when both players reconnect | Verify no setTimeout fires after full reconnect using spy |
| NFR-5 | All reconnect-related events are logged at `debug` level | Log capture assertion in unit tests |

---

## Test Environment Setup

### Required Changes to Application Code

Before tests can pass, the following must be implemented:

1. **Reconnect token issuance** — `room_created` and `game_started` responses must include a per-player `reconnectToken` (UUID).
2. **`reconnect` event handler** in the gateway — accepts `{ token: string }`, validates, and calls a new `RoomService.reconnectPlayer(token, newSocketId)`.
3. **Grace period timer** in `RoomService` — started on `removePlayer`, cancelled on successful reconnect, triggers permanent removal on expiry.
4. **`player_disconnected` payload extension** — add `gracePeriodSeconds`.
5. **New event: `game_resumed`** — mirrors `game_started` but includes full current board.
6. **New event: `opponent_reconnected`** — emitted to the surviving player on successful reconnect.
7. **New event: `player_left_permanently`** — emitted when grace period expires.

### Jest Configuration

```jsonc
// jest-e2e.json (additions)
{
  "testTimeout": 15000,
  "fakeTimers": {
    "enableGlobally": true,
    "doNotFake": ["nextTick", "setImmediate"]
  }
}
```

### Running the Tests

```bash
# Unit tests (RoomService reconnect logic)
pnpm test --testPathPattern="room.service"

# E2E tests (full gateway + Socket.io)
pnpm test:e2e --testPathPattern="reconnect"
```

---

## Test File Locations

| File | Coverage |
|---|---|
| `backend/src/game/room.service.spec.ts` | Token issuance, grace timer, state preservation |
| `backend/test/reconnect.e2e-spec.ts` | All TC-* scenarios above |
| `backend/test/server-restart.e2e-spec.ts` | TC-5.1 through TC-5.4 |

---

## Acceptance Criteria

All of the following must be true before the reconnection feature is marked done:

- [ ] TC-1.1 through TC-1.4 pass (mid-game disconnect)
- [ ] TC-2.1 through TC-2.5 pass (reconnect within grace period)
- [ ] TC-3.1 through TC-3.4 pass (reconnect after timeout)
- [ ] TC-4.1 through TC-4.5 pass (both players disconnect)
- [ ] TC-5.1 through TC-5.4 pass (server restart)
- [ ] All NFR-1 through NFR-5 requirements verified
- [ ] No existing e2e tests regress (`game.gateway.e2e-spec.ts` still green)
