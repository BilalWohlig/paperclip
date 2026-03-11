# Tic-Tac-Toe WebSocket Event Contract

**Namespace**: `/game`
**Connection URL**: `http://localhost:3001/game`
**Transport**: Socket.IO over WebSocket

This document is the authoritative contract for all WebSocket events in the Tic-Tac-Toe game. Every event flowing between client and server is defined here with its payload interface, direction, trigger conditions, and error cases.

---

## Type Definitions

```typescript
// Core game types — shared across all event payloads
export type Symbol = 'X' | 'O';
export type CellValue = Symbol | null;  // null = empty cell
export type GameStatus = 'waiting' | 'playing' | 'finished';

// Board is a flat array of 9 cells representing the 3×3 grid
// Index layout:
//   0 | 1 | 2
//   ---------
//   3 | 4 | 5
//   ---------
//   6 | 7 | 8
export type Board = CellValue[];  // always length 9

export interface Player {
  socketId: string;
  name: string;
  symbol: Symbol;
  rematchReady: boolean;
}

export interface Room {
  code: string;         // 6-character alphanumeric room code
  players: Player[];    // 0–2 players
  board: Board;
  turn: Symbol;         // Whose turn it is
  status: GameStatus;
  winner: Symbol | 'draw' | null;
}
```

---

## Client → Server Events

Events the client sends to the server. All are handled by `GameGateway` in `backend/src/game/game.gateway.ts`. The gateway uses `@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))` and `@UseFilters(new WsExceptionFilter())`.

---

### `create_room`

Player creates a new game room and becomes the first player (symbol X).

**Payload** (`CreateRoomDto`):
```typescript
interface CreateRoomPayload {
  playerName: string;  // Required. Max 20 characters.
}
```

**Behavior**:
- Generates a unique 6-character room code.
- Assigns the creator symbol `X`.
- Room status set to `waiting`.

**Response events**: [`room_created`](#room_created) → creator only.

**Errors**: None typical. Validation error if `playerName` is missing or too long.

---

### `join_room`

Player joins an existing room as the second player (symbol O).

**Payload** (`JoinRoomDto`):
```typescript
interface JoinRoomPayload {
  roomCode: string;    // Required. Exactly 6 characters.
  playerName: string;  // Required. Max 20 characters.
}
```

**Behavior**:
- Adds joiner to room with symbol `O`.
- Room status advances from `waiting` → `playing`.
- Triggers game start for both players.

**Response events**: [`game_started`](#game_started) → both players (targeted individually).

**Errors** (via [`error`](#error) event):
| Message | Condition |
|---|---|
| `"Room not found"` | `roomCode` does not match any room |
| `"Room is full"` | Room already has 2 players |
| `"Game already in progress"` | Room status is not `waiting` |

---

### `make_move`

Current-turn player places their symbol on the board.

**Payload** (`MakeMoveDto`):
```typescript
interface MakeMovePayload {
  position: number;  // Required. Integer 0–8 (inclusive).
}
```

**Behavior**:
- Validates it is the sender's turn.
- Places symbol at `position` on the board.
- Checks for win or draw.
- Advances turn to opponent.

**Response events**: [`move_made`](#move_made) → broadcast to all players in room.

**Errors** (via [`error`](#error) event):
| Message | Condition |
|---|---|
| `"You are not in a room"` | Sender socket is not associated with any room |
| `"Game is not in progress"` | Room status is not `playing` |
| `"You are not in this room"` | Sender not found among room players |
| `"Not your turn"` | Sender's symbol does not match `room.turn` |
| `"Cell already taken"` | `board[position]` is not `null` |
| `"Invalid move"` | General validation failure (position out of range, etc.) |

---

### `rematch_request`

Player signals they want to replay after the current game has finished.

**Payload**: None (send with no data or empty object).

**Behavior**:
- Marks the sender as wanting a rematch.
- Notifies the opponent.

**Response events**: [`rematch_requested`](#rematch_requested) → opponent only.

**Errors** (via [`error`](#error) event):
| Message | Condition |
|---|---|
| `"Room not found"` | Sender is not in any room |
| `"Game is not finished"` | Room status is not `finished` |

---

### `rematch_accept`

Player accepts an opponent's rematch request, starting a new game.

**Payload**: None (send with no data or empty object).

**Behavior**:
- Resets the board to 9 `null` cells.
- Swaps symbols between players (X↔O).
- Resets `turn` to `X`.
- Sets room status back to `playing`.

**Response events**: [`game_started`](#game_started) → both players (targeted individually).

**Errors** (via [`error`](#error) event):
| Message | Condition |
|---|---|
| `"Room not found"` | Sender is not in any room |
| `"Game is not finished"` | Room status is not `finished` |
| `"Player not found"` | Sender's socket not found in room players |

---

## Server → Client Events

Events the server emits to clients. Targeting is noted for each event.

---

### `room_created`

Confirms successful room creation. Delivered only to the creating player.

**Target**: Requesting client only (`client.emit`).

**Payload**:
```typescript
interface RoomCreatedPayload {
  roomCode: string;  // 6-character room code to share with second player
}
```

**Trigger**: Server successfully processes [`create_room`](#create_room).

---

### `game_started`

Signals that the game is starting. Each player receives a personalized payload with their own symbol and the opponent's name.

**Target**: Both players individually (`this.server.to(socketId).emit` × 2). Not a room broadcast — each player receives a distinct payload.

**Payload**:
```typescript
interface GameStartedPayload {
  board: Board;           // Initial empty board: [null, null, null, null, null, null, null, null, null]
  yourSymbol: Symbol;     // 'X' or 'O' — specific to the receiving player
  opponentName: string;   // Name of the other player
  turn: Symbol;           // Always 'X' at game start; after rematch may be 'X' or 'O'
  roomCode: string;       // The room code (useful for display/sharing)
}
```

**Triggers**:
1. After [`join_room`](#join_room) — initial game start.
2. After [`rematch_accept`](#rematch_accept) — rematch game start (symbols are swapped from previous round).

---

### `move_made`

Broadcasts the result of a valid move to all players in the room.

**Target**: All sockets in the room (`this.server.to(room.code).emit`).

**Payload**:
```typescript
interface MoveMadePayload {
  board: Board;                        // Full updated board state
  position: number;                    // Index (0–8) where the move was placed
  symbol: Symbol;                      // Symbol ('X' or 'O') that was placed
  nextTurn: Symbol;                    // Symbol of the player who moves next
  gameState: 'playing' | 'won' | 'draw';  // Current game state after this move
  winner?: Symbol;                     // Present only when gameState === 'won'
}
```

**Trigger**: Server successfully validates and applies a [`make_move`](#make_move) event.

**Notes**:
- When `gameState` is `'won'`, `winner` is set to the winning symbol.
- When `gameState` is `'draw'`, `winner` is absent.
- When `gameState` is `'playing'`, game continues and `nextTurn` indicates who plays next.

---

### `rematch_requested`

Notifies the opponent that the other player wants a rematch.

**Target**: Opponent only (not the requesting player).

**Payload**:
```typescript
interface RematchRequestedPayload {
  requesterName: string;  // Name of the player who sent rematch_request
}
```

**Trigger**: Server successfully processes [`rematch_request`](#rematch_request).

---

### `player_disconnected`

Notifies the remaining player that their opponent has disconnected. The game is effectively abandoned.

**Target**: Remaining player in the room (`this.server.to(room.code).emit`, though only one player remains).

**Payload**:
```typescript
interface PlayerDisconnectedPayload {
  message: string;  // Always: "Your opponent has disconnected."
}
```

**Trigger**: A player socket disconnects while in an active room (`handleDisconnect()` in the gateway).

---

### `error`

Standard error response for any `WsException` thrown during event handling.

**Target**: Requesting client only (via `WsExceptionFilter`).

**Payload**:
```typescript
interface ErrorPayload {
  message: string;  // Human-readable error description
}
```

**Possible messages** (see individual events above for full context):
- `"You are not in a room"`
- `"Game is not in progress"`
- `"You are not in this room"`
- `"Not your turn"`
- `"Cell already taken"`
- `"Invalid move"`
- `"Room not found"`
- `"Room is full"`
- `"Game already in progress"`
- `"Game is not finished"`
- `"Player not found"`

**Source**: `backend/src/game/filters/ws-exception.filter.ts`.

---

## Socket.IO Lifecycle Events

These are standard Socket.IO lifecycle events handled by the gateway — not custom game events.

| Event | Direction | Handler | Behavior |
|---|---|---|---|
| `connect` | C→S (automatic) | `handleConnection()` | Logs `Client connected: <socketId>` |
| `disconnect` | C→S (automatic) | `handleDisconnect()` | Removes player from room; emits `player_disconnected` to remaining player |

---

## Event Flow Diagrams

### New Game Flow

```
Client 1 (Creator)                 Server                  Client 2 (Joiner)
        |                             |                              |
        |--- create_room ---------->  |                              |
        |      {playerName}           |  [Room created, code: ABCD1] |
        |<-- room_created ----------  |                              |
        |      {roomCode}             |                              |
        |                             |                              |
        |   [Shares room code]        |                              |
        |                             |                              |
        |                             |  <-- join_room --------------|
        |                             |       {roomCode, playerName} |
        |                             |  [Both players ready]        |
        |<-- game_started ----------  |                              |
        |     {board, yourSymbol:'X', |  -- game_started ----------> |
        |      opponentName, turn,    |    {board, yourSymbol:'O',   |
        |      roomCode}              |     opponentName, turn,      |
        |                             |     roomCode}                |
```

### Move Flow

```
Current Player (X)                 Server                  Other Player (O)
        |                             |                              |
        |--- make_move ----------->   |                              |
        |      {position: 4}          |  [Validated, board updated]  |
        |<-- move_made -----------    |  -- move_made ------------> |
        |      {board, position: 4,   |    {board, position: 4,      |
        |       symbol:'X',           |     symbol:'X',              |
        |       nextTurn:'O',         |     nextTurn:'O',            |
        |       gameState:'playing'}  |     gameState:'playing'}     |
```

### Game End Flow (Win)

```
Winning Player (X)                 Server                  Losing Player (O)
        |                             |                              |
        |--- make_move ----------->   |                              |
        |      {position: 8}          |  [Win detected]              |
        |<-- move_made -----------    |  -- move_made ------------> |
        |      {board, position: 8,   |    {board, position: 8,      |
        |       symbol:'X',           |     symbol:'X',              |
        |       nextTurn:'X',         |     nextTurn:'X',            |
        |       gameState:'won',      |     gameState:'won',         |
        |       winner:'X'}           |     winner:'X'}              |
```

### Rematch Flow

```
Player 1                           Server                        Player 2
    |                                 |                               |
    |--- rematch_request ---------->  |                               |
    |                                 |  -- rematch_requested ------> |
    |                                 |      {requesterName}          |
    |                                 |                               |
    |                                 |  <-- rematch_accept ----------|
    |                                 |  [Board reset, symbols swapped]
    |<-- game_started (new symbols) - |  -- game_started -----------> |
```

### Disconnection Flow

```
Player 1 (Disconnects)             Server                        Player 2
    |                                 |                               |
    | [Socket closes]                 |                               |
    |                                 |  [Player removed from room]   |
    |                                 |  -- player_disconnected ----> |
    |                                 |      {message: "Your opponent |
    |                                 |       has disconnected."}     |
```

---

## Summary Table

| Event | Direction | Target | Payload Fields | Trigger |
|---|---|---|---|---|
| `create_room` | C→S | Server | `playerName` | Player creates room |
| `room_created` | S→C | Requester | `roomCode` | After `create_room` |
| `join_room` | C→S | Server | `roomCode`, `playerName` | Player joins room |
| `game_started` | S→C | Both players (individual) | `board`, `yourSymbol`, `opponentName`, `turn`, `roomCode` | After `join_room` or `rematch_accept` |
| `make_move` | C→S | Server | `position` | Player places symbol |
| `move_made` | S→C | Room broadcast | `board`, `position`, `symbol`, `nextTurn`, `gameState`, `winner?` | After valid `make_move` |
| `rematch_request` | C→S | Server | _(none)_ | Player requests rematch |
| `rematch_requested` | S→C | Opponent only | `requesterName` | After `rematch_request` |
| `rematch_accept` | C→S | Server | _(none)_ | Player accepts rematch |
| `player_disconnected` | S→C | Remaining player | `message` | Opponent disconnects |
| `error` | S→C | Requester | `message` | Any `WsException` |

---

## Implementation Notes

- **Validation**: All incoming DTOs are validated with `class-validator`. Invalid payloads result in an `error` event.
- **Error handling**: All `WsException` instances are caught by `WsExceptionFilter` and emitted as an `error` event to the originating client.
- **Room codes**: 6-character strings generated server-side; used as Socket.IO room names for broadcasting.
- **Turn enforcement**: The server is the source of truth. Clients must not allow moves out of turn — the server will reject them with `"Not your turn"`.
- **Symbol assignment**: Creator always starts as `X`. On rematch, symbols swap (creator gets `O`, joiner gets `X`).
- **`game_started` individualization**: The server sends two separate `game_started` emissions (one per player) rather than one broadcast, because each player's `yourSymbol` and `opponentName` differ.
- **`winner` field**: Only present in `move_made` payload when `gameState === 'won'`. Clients should check `gameState` before reading `winner`.
