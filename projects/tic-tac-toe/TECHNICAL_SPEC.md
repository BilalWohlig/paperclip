# Tic-Tac-Toe — Technical Specification

**Project:** Real-time 2-player Tic-Tac-Toe
**Stack:** NestJS 11 (WebSocket backend) + React 18 + Vite (frontend)
**Last Updated:** 2026-03-11
**Author:** GenAI Dev 1 (WOH-35)

---

## Table of Contents

1. [NestJS Architecture Overview](#1-nestjs-architecture-overview)
2. [Module Design & Dependency Graph](#2-module-design--dependency-graph)
3. [WebSocket Event Contract](#3-websocket-event-contract)
4. [Game State Machine](#4-game-state-machine)
5. [Frontend Component Tree](#5-frontend-component-tree)
6. [Error Catalog](#6-error-catalog)
7. [Testing Strategy](#7-testing-strategy)
8. [Dependencies & Configuration](#8-dependencies--configuration)

---

## 1. NestJS Architecture Overview

### 1.1 Core Concepts and How They Apply

#### Modules (`@Module`)

NestJS organizes application code into **modules**. Every module is a class decorated with `@Module({ imports, providers, exports })`. Modules define the boundaries of a feature and control what is visible outside that feature.

**In this project:**
- `AppModule` — root module; bootstraps the entire app; imports `ConfigModule` (global) and `GameModule`.
- `GameModule` — owns all game and room logic; declares `GameGateway`, `GameService`, `RoomService` as providers.

There are no HTTP controllers — all communication is WebSocket only.

#### Providers & Dependency Injection (`@Injectable`)

Providers are classes decorated with `@Injectable()` that NestJS manages as singletons within their module scope. They are injected via constructor parameters using TypeScript reflection metadata.

**In this project:**
- `GameService` — pure game logic (win/draw detection, move validation). Injected into `GameGateway`.
- `RoomService` — room lifecycle management (create, join, remove player, rematch). Holds the single in-memory `Map<roomCode, Room>` shared across all socket connections. Injected into `GameGateway`.

Because providers are singletons, the same `RoomService` instance (and its in-memory maps) is used for every WebSocket client connection.

#### Controllers (`@Controller`)

HTTP controllers handle REST/HTTP requests. **This project has no HTTP controllers.** All game logic flows through WebSocket gateways. The `AppModule` uses Express as the HTTP adapter (required by NestJS's bootstrap) but no routes are defined.

#### Gateways (`@WebSocketGateway`)

A gateway is a special provider that wraps a Socket.io server. It is the WebSocket equivalent of an HTTP controller.

**Declaration:**
```typescript
@UseFilters(new WsExceptionFilter())
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/game' })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
```

**Key points:**
- `namespace: '/game'` — all events are scoped to the `/game` Socket.io namespace; clients connect to `http://host:3001/game`.
- `cors` must be set on the gateway itself — Socket.io has its own CORS layer separate from Express.
- `@WebSocketServer()` injects the raw `Server` instance for broadcasting.

**Lifecycle hooks implemented:**

| Interface | Method | Purpose |
|---|---|---|
| `OnGatewayInit` | `afterInit(server)` | Logs "WebSocket Gateway initialized" after Socket.io server starts. |
| `OnGatewayConnection` | `handleConnection(client)` | Logs new socket connection with socket ID. |
| `OnGatewayDisconnect` | `handleDisconnect(client)` | Evicts player from room; notifies opponent via `player_disconnected`. |

#### Guards (`@UseGuards`)

Guards are executed before a handler to determine if the request should proceed (authorization). **Not currently implemented** in this project. Future additions (e.g., rate limiting, player authentication) would use guards.

#### Pipes (`@UsePipes`, `ValidationPipe`)

Pipes transform and validate incoming data before it reaches the handler. The global `ValidationPipe` set in `main.ts` applies to HTTP requests only. WebSocket handlers require explicit `@UsePipes` decoration.

**Applied at gateway class level:**
```typescript
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
```

- `whitelist: true` — strips any properties not defined in the DTO (prevents payload injection).
- `transform: true` — coerces primitive types (e.g., string `"4"` to integer `4`).

#### Interceptors (`@UseInterceptors`)

Interceptors wrap handler execution (like middleware) and can transform responses or add cross-cutting concerns (logging, response shaping, caching). **Not currently used.** Could be added for logging all WebSocket events.

#### Exception Filters (`@UseFilters`)

Exception filters catch exceptions thrown during handler execution and shape the error response.

**In this project:** `WsExceptionFilter` extends `BaseWsExceptionFilter` and catches all `WsException` instances. When a handler throws `WsException`, the filter emits an `error` event with `{ message }` back to the offending client's socket only.

```typescript
@Catch(WsException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    client.emit('error', { message: ... });
  }
}
```

Applied at the gateway class level: `@UseFilters(new WsExceptionFilter())`.

#### ConfigModule (`@nestjs/config`)

`ConfigModule.forRoot({ isGlobal: true })` loads environment variables from `.env` and makes them available anywhere via `ConfigService` without re-importing `ConfigModule`. In this project only `PORT` and `FRONTEND_URL` are consumed (via `process.env` directly in `main.ts`).

---

## 2. Module Design & Dependency Graph

### 2.1 Module Structure

```
AppModule
├── imports:
│   ├── ConfigModule (isGlobal: true)   ← env vars
│   └── GameModule                       ← all game logic
│
GameModule
└── providers:
    ├── GameGateway                      ← WebSocket I/O
    ├── GameService                      ← pure game logic
    └── RoomService                      ← room state
```

### 2.2 Provider Dependency Graph (ASCII)

```
                    ┌──────────────────────────────────────┐
                    │              AppModule                │
                    │  ConfigModule (global)  GameModule   │
                    └──────────────┬───────────────────────┘
                                   │
                    ┌──────────────▼───────────────────────┐
                    │             GameModule                │
                    │                                      │
                    │   ┌─────────────────────────────┐   │
                    │   │        GameGateway           │   │
                    │   │  @WebSocketGateway('/game')  │   │
                    │   │                             │   │
                    │   │  injects:                   │   │
                    │   │  ├── GameService ◄──────────┤   │
                    │   │  └── RoomService ◄──────────┤   │
                    │   └─────────────────────────────┘   │
                    │                                      │
                    │   ┌──────────────┐                  │
                    │   │  GameService │  @Injectable()   │
                    │   │  (singleton) │  pure logic      │
                    │   └──────────────┘                  │
                    │                                      │
                    │   ┌──────────────┐                  │
                    │   │  RoomService │  @Injectable()   │
                    │   │  (singleton) │  in-memory state │
                    │   └──────────────┘                  │
                    └──────────────────────────────────────┘
```

### 2.3 File/Directory Layout

```
backend/
├── src/
│   ├── main.ts                        # Bootstrap: NestFactory, CORS, ValidationPipe, listen
│   ├── app.module.ts                  # Root: imports ConfigModule + GameModule
│   ├── game/
│   │   ├── game.module.ts             # Feature: declares providers [GameGateway, GameService, RoomService]
│   │   ├── game.gateway.ts            # @WebSocketGateway — all @SubscribeMessage handlers + lifecycle hooks
│   │   ├── game.service.ts            # Pure game logic: validateMove, applyMove, checkWinner, checkDraw, getNextTurn, resetBoard
│   │   ├── room.service.ts            # Room lifecycle: createRoom, joinRoom, makeMove, removePlayer, requestRematch, acceptRematch
│   │   ├── interfaces/
│   │   │   └── game.interfaces.ts     # Room, Player, Symbol, CellValue, GameStatus types
│   │   └── dto/
│   │       ├── create-room.dto.ts     # { playerName: string } — @IsString @IsNotEmpty @MaxLength(20)
│   │       ├── join-room.dto.ts       # { roomCode: string; playerName: string } — roomCode @Length(6,6)
│   │       └── make-move.dto.ts       # { position: number } — @IsInt @Min(0) @Max(8)
│   └── common/
│       └── filters/
│           └── ws-exception.filter.ts # @Catch(WsException) → emits 'error' to client
├── test/
│   ├── app.e2e-spec.ts                # HTTP smoke test
│   ├── game.gateway.e2e-spec.ts       # Full WebSocket integration tests
│   └── jest-e2e.json                  # Jest config for e2e
└── src/game/
    ├── game.service.spec.ts           # Unit tests for GameService
    └── room.service.spec.ts           # Unit tests for RoomService

frontend/
├── src/
│   ├── main.tsx                       # React entry — renders <App />
│   ├── App.tsx                        # BrowserRouter + GameProvider + Routes
│   ├── socket.ts                      # Socket.io singleton: io('http://localhost:3001/game', { autoConnect: false })
│   ├── context/
│   │   └── GameContext.tsx            # React context + useReducer + socket event wiring
│   ├── hooks/
│   │   └── useGame.ts                 # Alternative hook (same logic as context; used pre-context refactor)
│   ├── pages/
│   │   ├── Home.tsx                   # Enter name + Create Room / Join Room form
│   │   ├── WaitingRoom.tsx            # Display room code, spinner, navigate on game_started
│   │   ├── Game.tsx                   # Board + StatusBar + turn logic
│   │   └── GameOver.tsx               # Result display + Rematch / Back Home
│   └── components/
│       ├── Board.tsx                  # 3×3 grid, renders 9 <Cell> components
│       ├── Cell.tsx                   # Single button cell: X/O display, click handler
│       └── StatusBar.tsx              # "Your turn" / "Opponent's turn" / winner text
```

---

## 3. WebSocket Event Contract

All events are on the **`/game` namespace** (Socket.io). Client connects to `http://localhost:3001/game`.

### 3.1 TypeScript Interfaces — Complete Contract

```typescript
// ─── Shared Types ──────────────────────────────────────────────────────────

type Symbol = 'X' | 'O';
type CellValue = Symbol | null;         // 9-element array, index 0–8 (row-major)
type GameStatus = 'waiting' | 'playing' | 'finished';
type GameState  = 'playing' | 'won' | 'draw';

// ─── Internal Data Models (backend) ────────────────────────────────────────

interface Player {
  socketId: string;
  name: string;
  symbol: Symbol;
  rematchReady: boolean;
}

interface Room {
  code: string;           // 6-char alphanumeric, e.g. "A3B7KZ"
  players: Player[];      // max 2 entries
  board: CellValue[];     // Array(9), index 0-8
  turn: Symbol;           // whose turn it is
  status: GameStatus;
  winner: Symbol | 'draw' | null;
}

// ─── DTOs (client → server payloads) ───────────────────────────────────────

interface CreateRoomPayload {
  playerName: string;     // required, non-empty, max 20 chars
}

interface JoinRoomPayload {
  roomCode: string;       // required, exactly 6 chars
  playerName: string;     // required, non-empty, max 20 chars
}

interface MakeMovePayload {
  position: number;       // required, integer 0–8
}

// rematch_request and rematch_accept have no payload

// ─── Server → Client Events ────────────────────────────────────────────────

interface RoomCreatedPayload {
  roomCode: string;       // 6-char alphanumeric
}

interface GameStartedPayload {
  board: CellValue[];     // always Array(9).fill(null) at game start
  yourSymbol: Symbol;     // 'X' (creator) or 'O' (joiner); swapped on rematch
  opponentName: string;   // the other player's name
  turn: Symbol;           // always 'X' at game start
  roomCode: string;       // the room code (for routing)
}

interface MoveMadePayload {
  board: CellValue[];     // updated board state
  position: number;       // cell index 0–8 that was played
  symbol: Symbol;         // symbol that was placed ('X' or 'O')
  nextTurn: Symbol;       // whose turn is next (undefined when game ends)
  gameState: GameState;   // 'playing' | 'won' | 'draw'
  winner?: Symbol;        // present only when gameState === 'won'
}

interface PlayerDisconnectedPayload {
  message: string;        // "Your opponent has disconnected."
}

interface RematchRequestedPayload {
  requesterName: string;  // name of the player who requested rematch
}

interface ErrorPayload {
  message: string;        // human-readable error message
}
```

### 3.2 Client → Server Events

| Event | Payload Type | Validation Rules | Description |
|---|---|---|---|
| `create_room` | `CreateRoomPayload` | `playerName`: string, not empty, max 20 chars | Creates a new game room; creator gets symbol `'X'` |
| `join_room` | `JoinRoomPayload` | `roomCode`: string, exactly 6 chars; `playerName`: string, not empty, max 20 chars | Joins existing room; joiner gets symbol `'O'` |
| `make_move` | `MakeMovePayload` | `position`: integer 0–8 | Places current player's symbol at the given board position |
| `rematch_request` | _(none)_ | — | Signals current player wants a rematch |
| `rematch_accept` | _(none)_ | — | Accepts the rematch request from the opponent |

### 3.3 Server → Client Events

| Event | Payload Type | Sent To | When |
|---|---|---|---|
| `room_created` | `RoomCreatedPayload` | Creator only (`client.emit`) | Immediately after `create_room` succeeds |
| `game_started` | `GameStartedPayload` | Both players (individual `server.to(socketId).emit`) | When second player joins OR when rematch is accepted |
| `move_made` | `MoveMadePayload` | All in room (`server.to(roomCode).emit`) | After any valid move |
| `player_disconnected` | `PlayerDisconnectedPayload` | Remaining player (`server.to(room.code).emit`) | When a player's socket disconnects and a room partner exists |
| `rematch_requested` | `RematchRequestedPayload` | Opponent only (`server.to(opponent.socketId).emit`) | After `rematch_request` event from one player |
| `error` | `ErrorPayload` | Offending client only (`client.emit`) | Validation failure, invalid move, room errors, etc. |

### 3.4 Emission Patterns

```typescript
// Creator receives room code (sender only)
client.emit('room_created', { roomCode: room.code });

// Both players receive game_started with personalized payload (per-socket)
this.server.to(xSocketId).emit('game_started', { board, yourSymbol: 'X', opponentName: oName, turn: 'X', roomCode });
this.server.to(oSocketId).emit('game_started', { board, yourSymbol: 'O', opponentName: xName, turn: 'X', roomCode });

// All in room receive move result (broadcast to room)
this.server.to(room.code).emit('move_made', { board, position, symbol, nextTurn, gameState, winner? });

// Opponent receives rematch notification (targeted)
this.server.to(opponent.socketId).emit('rematch_requested', { requesterName });

// Remaining player notified of disconnect (room broadcast, one recipient)
this.server.to(room.code).emit('player_disconnected', { message });

// Error goes only to the offending socket
client.emit('error', { message });
```

---

## 4. Game State Machine

### 4.1 Room States

```
                         create_room
                   ┌─────────────────────┐
                   │                     ▼
              [START]             ┌─────────────┐
                                  │   WAITING   │ ← room created, 1 player inside
                                  └──────┬──────┘
                                         │ join_room (2nd player)
                                         ▼
                                  ┌─────────────┐
                                  │   PLAYING   │ ← game in progress, turns alternate
                                  └──┬──────┬───┘
                        valid move   │      │  disconnect (any player)
                        (win/draw)   │      └──────────────────────────┐
                                     ▼                                 ▼
                                  ┌─────────────┐             ┌──────────────┐
                                  │  FINISHED   │             │   FINISHED   │
                                  │  (outcome)  │             │ (abandoned)  │
                                  └──┬──────┬───┘             └──────────────┘
                         rematch_    │      │  back to home         (room deleted if
                         accept      │      └── (reset + navigate)   last player left)
                                     ▼
                                  ┌─────────────┐
                                  │   PLAYING   │ ← new round, symbols swapped
                                  └─────────────┘
```

### 4.2 Backend `GameStatus` Values

| Value | Meaning | Valid Next States |
|---|---|---|
| `'waiting'` | Room created, only 1 player | `'playing'` (2nd player joins) |
| `'playing'` | Both players in, game active | `'finished'` (win/draw/disconnect) |
| `'finished'` | Game over (win, draw, or disconnect) | `'playing'` (rematch accepted) or deleted (all players gone) |

### 4.3 Frontend `GameStatus` Values

| Value | Meaning | Page |
|---|---|---|
| `'idle'` | No active session | `/` (Home) |
| `'waiting'` | Room created, waiting for opponent | `/waiting/:code` (WaitingRoom) |
| `'playing'` | Active game | `/game/:code` (Game) |
| `'finished'` | Game ended | `/gameover/:code` (GameOver) |

### 4.4 State Transitions — All Paths

#### Happy Path: Normal Game

```
[Player A]                          [Server]                        [Player B]
    │                                  │                                │
    │── emit create_room ──────────────►│                                │
    │                                  │ createRoom() → status: waiting  │
    │◄── room_created ─────────────────│                                │
    │                                  │                                │
    │                                  │◄──────────── emit join_room ───│
    │                                  │ joinRoom() → status: playing   │
    │◄── game_started (X) ────────────│─────────── game_started (O) ──►│
    │                                  │                                │
    │── emit make_move (X's turn) ──►  │                                │
    │                                  │ validateMove() + makeMove()    │
    │◄── move_made ───────────────────│────────────── move_made ───────►│
    │                                  │ (repeat turns until win/draw)  │
    │◄── move_made (gameState:'won') ─│──── move_made (gameState:'won')►│
    │                                  │ status: finished               │
    │── emit rematch_request ─────────►│                                │
    │                                  │── rematch_requested ──────────►│
    │                                  │◄──────────── emit rematch_accept│
    │                                  │ symbols swapped, board reset   │
    │◄── game_started (O) ────────────│─────────── game_started (X) ──►│
    │                                  │ status: playing                │
```

#### Disconnect During Game

```
[Player A]                          [Server]                        [Player B]
    │                                  │                                │
    │   (game in progress)             │                                │
    │                                  │         ✕ disconnect ──────────│
    │                                  │ removePlayer(B.socketId)       │
    │                                  │ room.status = 'finished'       │
    │◄── player_disconnected ──────────│                                │
    │   (A navigates to GameOver)      │                                │
```

#### Room Cleanup: Last Player Leaves

```
[Server]
    │
    │  removePlayer(socketId) → room.players.length === 0
    │  → this.rooms.delete(code)       ← room is permanently deleted
    │  → socketToRoom.delete(socketId) ← lookup removed
```

### 4.5 Edge Cases

| Scenario | Behavior |
|---|---|
| Player tries to join their own room | Technically allowed by current implementation (no check for duplicate socket); would require a duplicate-name or duplicate-socket check to prevent. |
| Player disconnects while waiting (only 1 player in room) | `removePlayer()` deletes the room entirely; no notification sent (no opponent). |
| Both players request rematch simultaneously | First `rematch_request` sets `player.rematchReady = true` and emits `rematch_requested` to opponent. Second player's `rematch_accept` triggers the reset. There is no conflict — only `rematch_accept` triggers game restart. |
| `rematch_request` when game is still playing | `RoomService.requestRematch()` throws `WsException('Game is not finished')` → client receives `error` event. |
| `rematch_accept` when game is still playing | Same — `acceptRematch()` throws `WsException('Game is not finished')`. |
| `make_move` after game is finished | `GameService.validateMove()` returns `{ valid: false, error: 'Game is not in progress' }` → gateway throws `WsException` → client receives `error`. |
| `make_move` when not your turn | Returns `{ valid: false, error: 'Not your turn' }`. |
| `make_move` on occupied cell | Returns `{ valid: false, error: 'Cell already taken' }`. |
| Third player tries to join a full room | `RoomService.joinRoom()` throws `WsException('Room is full')`. |
| Joining with invalid or non-existent room code | `RoomService.joinRoom()` throws `WsException('Room not found')`. |
| Player disconnects mid-move (after emit, before server processes) | Socket.io queues events; if socket disconnects, the event is dropped. `handleDisconnect` fires and room is marked finished. |

### 4.6 Symbol Assignment and Rematch Swap

- **Initial assignment:** Creator → `'X'`, Joiner → `'O'`. Turn always starts with `'X'`.
- **On rematch accepted:** All players' symbols are toggled: `X → O`, `O → X`. Board resets, `turn` resets to `'X'`, `status` resets to `'playing'`, `winner` resets to `null`.

---

## 5. Frontend Component Tree

### 5.1 Component Hierarchy

```
App (BrowserRouter)
└── GameProvider (React Context + useReducer + socket wiring)
    ├── Route "/"                    → <Home />
    ├── Route "/waiting/:code"       → <WaitingRoom />
    ├── Route "/game/:code"          → <Game />
    │                                    ├── <StatusBar />
    │                                    └── <Board />
    │                                            └── <Cell /> × 9
    └── Route "/gameover/:code"      → <GameOver />
```

### 5.2 Component Specifications

#### `App` (`src/App.tsx`)

| Aspect | Detail |
|---|---|
| Props | None |
| State | None |
| Responsibilities | Sets up `BrowserRouter`, wraps everything in `GameProvider`, defines `Routes`. |
| WebSocket events | None directly |

---

#### `GameProvider` / `GameContext` (`src/context/GameContext.tsx`)

This is the central state hub for the entire frontend. It holds all game state via `useReducer` and wires all socket events.

**State shape (`GameState`):**
```typescript
interface GameState {
  board: CellValue[];             // Array(9) of null/'X'/'O'
  yourSymbol: Symbol | null;      // assigned on game_started
  turn: Symbol;                   // whose turn ('X' or 'O')
  gameStatus: GameStatus;         // 'idle' | 'waiting' | 'playing' | 'finished'
  winner: Symbol | 'draw' | null; // set on game over
  opponentName: string;           // set on game_started
  roomCode: string;               // set on room_created or game_started
  errorMessage: string;           // transient error display
  playerName: string;             // local player name
}
```

**Reducer actions:**
```typescript
type Action =
  | { type: 'SET_PLAYER_NAME'; name: string }
  | { type: 'ROOM_CREATED'; roomCode: string }
  | { type: 'GAME_STARTED'; board: CellValue[]; yourSymbol: Symbol; opponentName: string; turn: Symbol; roomCode: string }
  | { type: 'MOVE_MADE'; board: CellValue[]; nextTurn: Symbol; gameState: 'playing' | 'won' | 'draw'; winner?: Symbol }
  | { type: 'PLAYER_DISCONNECTED'; message: string }
  | { type: 'REMATCH_REQUESTED'; requesterName: string }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };
```

**Context value / exposed API:**
```typescript
interface GameContextValue extends GameState {
  createRoom: (playerName: string) => void;   // emits create_room
  joinRoom: (roomCode: string, playerName: string) => void; // emits join_room
  makeMove: (position: number) => void;       // emits make_move
  requestRematch: () => void;                 // emits rematch_request
  acceptRematch: () => void;                  // emits rematch_accept
  reset: () => void;                          // dispatches RESET
  clearError: () => void;                     // clears errorMessage
}
```

**Socket events listened to:**
- `room_created` → `ROOM_CREATED`
- `game_started` → `GAME_STARTED`
- `move_made` → `MOVE_MADE`
- `player_disconnected` → `PLAYER_DISCONNECTED`
- `rematch_requested` → `REMATCH_REQUESTED`
- `error` → `ERROR`

Socket is connected in `useEffect` on mount, disconnected on unmount.

---

#### `Home` (`src/pages/Home.tsx`)

| Aspect | Detail |
|---|---|
| Props | None |
| Local state | `name: string`, `roomCode: string`, `mode: 'create' \| 'join' \| null` |
| Context consumed | `gameStatus`, `roomCode` (from context), `errorMessage`, `createRoom`, `joinRoom`, `clearError` |
| Socket events | None directly (uses context actions) |
| Navigation | On `gameStatus === 'waiting'` → `/waiting/:code`; on `gameStatus === 'playing'` → `/game/:code` |
| Validation | Create: `name.trim()` required; Join: `name.trim()` + `roomCode.trim()` required, code length 4+ (UI), 6 exactly (server) |

---

#### `WaitingRoom` (`src/pages/WaitingRoom.tsx`)

| Aspect | Detail |
|---|---|
| Props | None (reads `code` from URL params) |
| Local state | None |
| Context consumed | `gameStatus`, `errorMessage` |
| Socket events | None directly |
| Navigation | On `gameStatus === 'playing'` → `/game/:code`; on `gameStatus === 'idle'` → `/` |
| Actions | Clipboard copy of room code |

---

#### `Game` (`src/pages/Game.tsx`)

| Aspect | Detail |
|---|---|
| Props | None (reads `code` from URL params) |
| Local state | None |
| Context consumed | `board`, `yourSymbol`, `turn`, `gameStatus`, `winner`, `opponentName`, `errorMessage`, `makeMove` |
| Socket events | None directly |
| Navigation | On `gameStatus === 'finished'` → `/gameover/:code`; on `gameStatus === 'idle'` → `/` |
| Derived state | `isMyTurn = yourSymbol !== null && turn === yourSymbol` |
| Children | `<StatusBar />`, `<Board />` |

---

#### `GameOver` (`src/pages/GameOver.tsx`)

| Aspect | Detail |
|---|---|
| Props | None (reads `code` from URL params) |
| Local state | None |
| Context consumed | `winner`, `yourSymbol`, `opponentName`, `errorMessage`, `gameStatus`, `requestRematch`, `acceptRematch`, `reset` |
| Socket events | None directly |
| Navigation | On `gameStatus === 'playing'` → `/game/:code` (rematch started); Back Home → `reset()` + navigate `/` |
| Display logic | `errorMessage && winner === null` → show error (disconnect); `winner === 'draw'` → "It's a draw!"; `winner === yourSymbol` → "You win!"; else → "{opponent} wins!" |
| Conditional UI | If `errorMessage.includes('wants a rematch')` → show Accept Rematch button; else show Rematch button |

---

#### `Board` (`src/components/Board.tsx`)

| Aspect | Detail |
|---|---|
| Props | `board: CellValue[]`, `onCellClick: (index: number) => void`, `isMyTurn: boolean`, `gameStatus: GameStatus` |
| State | None |
| Responsibilities | Renders 9 `<Cell>` components in a 3×3 grid. Computes `disabled = !isMyTurn \|\| gameStatus !== 'playing'`. |
| WebSocket events | None |

---

#### `Cell` (`src/components/Cell.tsx`)

| Aspect | Detail |
|---|---|
| Props | `value: CellValue`, `index: number`, `onClick: (index: number) => void`, `disabled: boolean` |
| State | None |
| Responsibilities | Single clickable button. Shows `'X'`, `'O'`, or empty. Adds CSS classes for styling: `cell`, `cell-x`/`cell-o`, `cell-hover`. Applies `aria-label` for accessibility. Ignores clicks when `disabled` or when `value !== null`. |
| WebSocket events | None |

---

#### `StatusBar` (`src/components/StatusBar.tsx`)

| Aspect | Detail |
|---|---|
| Props | `isMyTurn: boolean`, `yourSymbol: Symbol \| null`, `opponentName: string`, `winner: Symbol \| 'draw' \| null`, `errorMessage: string` |
| State | None |
| Responsibilities | Displays game status. Priority: error (no winner) > winner > turn indicator. CSS class changes for visual cue: `status-error`, `status-finished`, `status-your-turn`, `status-opponent-turn`. |
| WebSocket events | None |

---

#### `socket.ts` (`src/socket.ts`)

Not a component, but a critical singleton:
```typescript
export const socket = io('http://localhost:3001/game', { autoConnect: false });
```

- `autoConnect: false` — prevents connecting before `GameProvider` mounts.
- Imported by `GameContext.tsx` (and legacy `useGame.ts`).
- Never instantiate multiple times — one connection per namespace per app.

---

## 6. Error Catalog

All errors are delivered to the client via the `error` Socket.io event with shape `{ message: string }`.

### 6.1 Room Errors

| Error Code | Message | Trigger Condition | Source |
|---|---|---|---|
| `ROOM_NOT_FOUND` | `"Room not found"` | `join_room` with nonexistent code; `make_move` / `rematch_*` when player has no room mapping | `RoomService` |
| `ROOM_FULL` | `"Room is full"` | `join_room` when `room.players.length >= 2` | `RoomService` |
| `GAME_ALREADY_IN_PROGRESS` | `"Game already in progress"` | `join_room` when `room.status !== 'waiting'` | `RoomService` |

### 6.2 Move Errors

| Error Code | Message | Trigger Condition | Source |
|---|---|---|---|
| `NOT_IN_ROOM` | `"You are not in a room"` | `make_move` when socket has no room association | `GameGateway` |
| `GAME_NOT_IN_PROGRESS` | `"Game is not in progress"` | `make_move` when `room.status !== 'playing'` | `GameService` / `RoomService` |
| `NOT_YOUR_TURN` | `"Not your turn"` | `make_move` when `player.symbol !== room.turn` | `GameService` / `RoomService` |
| `CELL_ALREADY_TAKEN` | `"Cell already taken"` | `make_move` when `board[position] !== null` | `GameService` / `RoomService` |
| `NOT_IN_ROOM_2` | `"You are not in this room"` | `make_move` when player not in player list (race condition) | `RoomService` |

### 6.3 Rematch Errors

| Error Code | Message | Trigger Condition | Source |
|---|---|---|---|
| `REMATCH_GAME_NOT_FINISHED` | `"Game is not finished"` | `rematch_request` or `rematch_accept` when `room.status !== 'finished'` | `RoomService` |
| `REMATCH_PLAYER_NOT_FOUND` | `"Player not found"` | `rematch_request` or `rematch_accept` when player not in room.players | `RoomService` |

### 6.4 Validation Errors (DTO)

These are generated by `ValidationPipe` and also sent as `error` events via `WsExceptionFilter`.

| Field | Rule | Example Error Message |
|---|---|---|
| `create_room.playerName` | Required, string, non-empty, max 20 chars | `"playerName must be shorter than or equal to 20 characters"` |
| `join_room.roomCode` | Required, string, exactly 6 chars | `"roomCode must be longer than or equal to 6 and shorter than or equal to 6 characters"` |
| `join_room.playerName` | Required, string, non-empty, max 20 chars | Same as above |
| `make_move.position` | Required, integer, min 0, max 8 | `"position must not be greater than 8"` |

### 6.5 Disconnect Notification (Not an Error)

| Event | Message | Condition |
|---|---|---|
| `player_disconnected` | `"Your opponent has disconnected."` | Opponent's socket drops while 2 players were in a room |

---

## 7. Testing Strategy

### 7.1 Overview

The test suite covers three layers:

| Layer | Framework | Location | Coverage |
|---|---|---|---|
| Unit — `GameService` | Jest + `@nestjs/testing` | `src/game/game.service.spec.ts` | Pure game logic |
| Unit — `RoomService` | Jest + `@nestjs/testing` | `src/game/room.service.spec.ts` | Room lifecycle, in-memory state |
| Integration (E2E) — Gateway | Jest + socket.io-client | `test/game.gateway.e2e-spec.ts` | Full WebSocket flow |
| Manual | — | — | Visual / multi-browser checks |

### 7.2 Unit Tests — `GameService`

**Test file:** `src/game/game.service.spec.ts`

| Test Group | Cases |
|---|---|
| `checkWinner` | All 8 win lines (3 rows, 3 cols, 2 diags) for both X and O; empty board returns null; partial board returns null; draw board returns null; mixed symbols in line return null |
| `checkDraw` | Full board with no winner → true; board with empty cells → false; empty board → false |
| `validateMove` | Valid move returns `{ valid: true }`; game not playing → invalid; game finished → invalid; unknown socket → invalid; wrong turn → invalid; occupied cell → invalid |
| `getNextTurn` | X → O; O → X; alternates correctly |
| `applyMove` | Places correct symbol; does not mutate original board; returns new 9-element array |
| `resetBoard` | Returns 9 nulls; each call returns a fresh array |

### 7.3 Unit Tests — `RoomService`

**Test file:** `src/game/room.service.spec.ts`

| Test Group | Cases |
|---|---|
| `createRoom` | Returns room with 1 player; generates 6-char alphanumeric code; generates unique codes; findRoom works; findRoomBySocket works |
| `joinRoom` | 2nd player joins → status playing, symbol O; registers in socketToRoom; WsException for unknown code; WsException when full; WsException when already playing; WsException when finished |
| `findRoom` | Returns undefined for unknown code; returns correct room |
| `findRoomBySocket` | Returns undefined for unknown socket; returns correct room |
| `removePlayer` | Returns wasInRoom=false for ghost socket; removes socketToRoom entry; status → finished when 1 player disconnects; deletes room when last player leaves; opponent remains in room |
| `makeMove` | Places correct symbol; advances turn; detects win → finished; detects draw; WsException for unknown room; WsException for unknown player; WsException for wrong turn; WsException for occupied cell |
| `acceptRematch` | Resets board; swaps symbols; status → playing; winner → null; turn → X; resets rematchReady flags; WsException for unknown socket; WsException when not finished |
| `requestRematch` | Marks player rematchReady; returns requesterName; WsException when not finished |

### 7.4 Integration Tests — WebSocket E2E

**Test file:** `test/game.gateway.e2e-spec.ts`

The E2E suite spins up a real NestJS app on a random port, connects real Socket.io clients, and verifies events end-to-end.

**Test structure:**
```typescript
const waitForEvent = <T>(socket, event, timeoutMs = 3000): Promise<T>
const connectClient = (port): Promise<Socket>
```

| Test Group | Cases |
|---|---|
| Room lifecycle | create_room → room_created with 6-char code; join_room → both receive game_started (A=X, B=O); error on unknown room code; error on 3rd player joining full room |
| Full game flow | Both receive move_made after valid move; error on duplicate cell; error on wrong-turn move; X wins → gameState='won' with winner field; draw → gameState='draw' |
| Disconnect handling | Remaining player receives player_disconnected when opponent disconnects |
| Rematch flow | Opponent receives rematch_requested after request; both receive game_started with swapped symbols after rematch_accept |

### 7.5 Manual Test Cases

These are browser-level tests that require two browser windows (or tabs) open simultaneously.

| ID | Scenario | Steps | Expected Result |
|---|---|---|---|
| M-01 | Full happy path | Open 2 tabs; A creates room; B joins with code; play until X wins | Both see correct board, winner announced |
| M-02 | Draw game | Play through a draw sequence | Both see "It's a draw!" |
| M-03 | Rematch flow | After game ends, A requests rematch; B accepts | New game starts with swapped symbols |
| M-04 | Disconnect mid-game | A and B join; A closes tab mid-game | B sees "Your opponent has disconnected." |
| M-05 | Invalid room code | B enters wrong 6-char code | B sees error message |
| M-06 | Join full room | Create room; B joins; C tries to join | C sees "Room is full" error |
| M-07 | Back to home | From GameOver, click "Back to Home" | Returns to Home page with fresh state |
| M-08 | Room code copy | On WaitingRoom, click "Copy code" | Room code copied to clipboard |
| M-09 | Mobile viewport | Repeat M-01 on mobile viewport (375px wide) | Board renders correctly, cells are tappable |
| M-10 | Rapid moves | X and O click rapidly in alternation | Server correctly enforces turn order, no race conditions |

### 7.6 Running Tests

```bash
# Backend unit tests
cd backend
npm test

# Backend unit tests with coverage report
npm run test:cov

# Backend E2E tests
npm run test:e2e

# Watch mode (TDD)
npm run test:watch
```

---

## 8. Dependencies & Configuration

### 8.1 Backend Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.1",
    "@nestjs/config": "^4.0.3",
    "@nestjs/core": "^11.0.1",
    "@nestjs/platform-express": "^11.0.1",
    "@nestjs/platform-socket.io": "^11.1.16",
    "@nestjs/websockets": "^11.1.16",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.15.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "socket.io": "^4.8.3"
  },
  "devDependencies": {
    "@nestjs/testing": "^11.0.1",
    "@types/jest": "^30.0.0",
    "jest": "^30.0.0",
    "socket.io-client": "^4.8.3",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.3"
  }
}
```

### 8.2 Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "socket.io-client": "^4.8.3"
  },
  "devDependencies": {
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "typescript": "^5"
  }
}
```

### 8.3 Environment Variables

**Backend `.env`:**
```
PORT=3001
FRONTEND_URL=http://localhost:5173   # optional; defaults to '*' in CORS
```

**Frontend** — socket URL is hardcoded in `src/socket.ts`:
```typescript
io('http://localhost:3001/game', { autoConnect: false })
```
For production, this should be an environment variable (`VITE_SOCKET_URL`).

### 8.4 Scripts

| Command | Action |
|---|---|
| `cd backend && npm run start:dev` | Run backend in watch mode |
| `cd frontend && npm run dev` | Run Vite dev server |
| `cd backend && npm test` | Run unit tests |
| `cd backend && npm run test:e2e` | Run WebSocket integration tests |
| `cd backend && npm run test:cov` | Unit tests + coverage report |
| `cd backend && npm run build` | Compile TypeScript → dist/ |
| `cd frontend && npm run build` | Vite production build → dist/ |

---

*End of Technical Specification — WOH-35*
