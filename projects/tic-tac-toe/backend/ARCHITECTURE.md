# Tic-Tac-Toe Backend Architecture

## Overview

This is the backend for a real-time 2-player Tic-Tac-Toe game built with **NestJS** and **Socket.io**. It manages rooms, game state, and real-time WebSocket communication. There is no database — all state is held in memory for the lifetime of the server process.

---

## NestJS Core Concepts Applied

### Modules

NestJS organizes code into modules. Each module is a class decorated with `@Module({ imports, providers, exports })`. The root module (`AppModule`) bootstraps the app and imports feature modules.

```
AppModule
├── ConfigModule (global)       // @nestjs/config — env vars
└── GameModule                  // All game/room logic
    ├── GameGateway              // WebSocket gateway
    ├── GameService              // Board logic, win/draw detection
    └── RoomService              // Room creation, joining, storage
```

**Do not** mix module concerns. `GameModule` owns everything game-related; nothing leaks into `AppModule`.

### Dependency Injection

NestJS uses TypeScript metadata reflection for DI. Providers decorated with `@Injectable()` are registered in a module and injected via constructor parameters:

```typescript
@Injectable()
export class GameService {
  constructor(private readonly roomService: RoomService) {}
}
```

Providers are singletons by default — `RoomService` holds the single in-memory rooms Map shared across all gateway connections.

### WebSocket Gateway

`@WebSocketGateway()` is a special provider that handles WebSocket connections via Socket.io. It implements lifecycle hooks:

- `OnGatewayInit` → `afterInit(server: Server)` — called after Socket.io server starts
- `OnGatewayConnection` → `handleConnection(client: Socket)` — new socket connected
- `OnGatewayDisconnect` → `handleDisconnect(client: Socket)` — socket disconnected

Event handlers use `@SubscribeMessage('event_name')` and receive `(client: Socket, payload: Dto)`. The gateway injects `GameService` and `RoomService`.

```typescript
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/game' })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly roomService: RoomService,
  ) {}

  @SubscribeMessage('make_move')
  handleMove(client: Socket, payload: MakeMoveDto): void { ... }
}
```

### Validation Pipes and DTOs

DTOs (Data Transfer Objects) define the shape of incoming payloads. They use `class-validator` decorators. The `ValidationPipe` transforms and validates payloads automatically when configured globally.

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
);
```

**For WebSocket**, the `ValidationPipe` must be explicitly applied to each `@SubscribeMessage` handler using `@UsePipes()`, because the global pipe only auto-applies to HTTP controllers.

### ConfigModule

`@nestjs/config` provides environment variable management. Configured once at root:

```typescript
ConfigModule.forRoot({ isGlobal: true })
```

`isGlobal: true` means any module can inject `ConfigService` without re-importing `ConfigModule`. The backend uses it for `PORT` only (no external secrets needed).

---

## Directory Structure

```
backend/
├── src/
│   ├── main.ts                        # Bootstrap (NestFactory.create, CORS, port)
│   ├── app.module.ts                  # Root module: imports ConfigModule + GameModule
│   ├── game/
│   │   ├── game.module.ts             # Declares GameGateway, provides GameService+RoomService
│   │   ├── game.gateway.ts            # WebSocket gateway — all @SubscribeMessage handlers
│   │   ├── game.service.ts            # Pure game logic: move validation, win/draw detection
│   │   ├── room.service.ts            # Room lifecycle: create, join, find, remove player
│   │   ├── interfaces/
│   │   │   └── game.interfaces.ts     # Room, Player, GameState, Symbol type definitions
│   │   └── dto/
│   │       ├── create-room.dto.ts     # { playerName: string }
│   │       ├── join-room.dto.ts       # { roomCode: string; playerName: string }
│   │       └── make-move.dto.ts       # { position: number (0-8) }
│   └── common/
│       └── filters/
│           └── ws-exception.filter.ts # Catches WsException, emits error event to client
├── test/
│   └── game.gateway.spec.ts           # Unit tests for gateway / service logic
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env.example                       # PORT=3001
```

---

## Data Models

```typescript
// game.interfaces.ts

export type Symbol = 'X' | 'O';
export type CellValue = Symbol | null;
export type GameStatus = 'waiting' | 'playing' | 'finished';

export interface Player {
  socketId: string;
  name: string;
  symbol: Symbol;
  rematchReady: boolean;
}

export interface Room {
  code: string;
  players: Player[];           // max 2
  board: CellValue[];          // 9 cells, index 0-8 (row-major)
  turn: Symbol;                // whose turn — always starts with 'X'
  status: GameStatus;
  winner: Symbol | 'draw' | null;
}
```

`RoomService` maintains: `private rooms = new Map<string, Room>()` and `private socketToRoom = new Map<string, string>()` for O(1) disconnect lookup.

---

## WebSocket Event Contract

All events are on the `/game` namespace.

### Client → Server

| Event | Payload (DTO) | Validation |
|-------|--------------|------------|
| `create_room` | `{ playerName: string }` | `@IsString() @IsNotEmpty() @MaxLength(20)` |
| `join_room` | `{ roomCode: string; playerName: string }` | both strings, roomCode length 6 |
| `make_move` | `{ position: number }` | `@IsInt() @Min(0) @Max(8)` |
| `rematch_request` | _(no payload)_ | — |
| `rematch_accept` | _(no payload)_ | — |

### Server → Client

| Event | Payload | Recipients | When |
|-------|---------|-----------|------|
| `room_created` | `{ roomCode: string }` | creator only | after `create_room` |
| `game_started` | `{ board: CellValue[], yourSymbol: Symbol, opponentName: string, turn: 'X' }` | both players | both joined or rematch accepted |
| `move_made` | `{ board: CellValue[], position: number, symbol: Symbol, nextTurn: Symbol, gameState: 'playing'\|'won'\|'draw', winner?: Symbol }` | both players | after valid move |
| `player_disconnected` | `{ message: string }` | remaining player | on disconnect |
| `rematch_requested` | `{ requesterName: string }` | opponent | after `rematch_request` |
| `error` | `{ message: string }` | offending client | validation fail, invalid move, room full, etc. |

**Emission pattern:** Use `this.server.to(roomCode).emit(...)` to broadcast to a room. Use `client.emit(...)` for sender-only messages. Socket joins a Socket.io room keyed by the room code on `join_room`.

---

## Game Logic (GameService)

### Move Validation
1. Room must be `playing`
2. `client.socketId` must match `room.turn`'s player
3. `board[position]` must be `null`

### Win Detection
Check all 8 winning lines after each move:
```
Rows:    [0,1,2], [3,4,5], [6,7,8]
Cols:    [0,3,6], [1,4,7], [2,5,8]
Diags:   [0,4,8], [2,4,6]
```

### Draw Detection
No winner AND all 9 cells are non-null.

### Rematch Flow
1. Player A sends `rematch_request` → room records `rematchReady = true` for A, broadcasts `rematch_requested` to B
2. Player B sends `rematch_accept` → reset board, swap symbols (X↔O), set status back to `playing`, emit `game_started` to both

---

## Bootstrap (main.ts)

```typescript
const app = await NestFactory.create(AppModule);
app.enableCors({ origin: process.env.FRONTEND_URL || '*' });
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
// Note: socket.io adapter is default when @nestjs/platform-socket.io is installed
await app.listen(process.env.PORT || 3001);
```

The Socket.io server is configured via `@WebSocketGateway({ cors: { origin: '*' } })`. No extra adapter setup needed.

---

## Dependencies

```json
{
  "@nestjs/common": "^10",
  "@nestjs/core": "^10",
  "@nestjs/platform-express": "^10",
  "@nestjs/websockets": "^10",
  "@nestjs/platform-socket.io": "^10",
  "@nestjs/config": "^3",
  "socket.io": "^4",
  "class-validator": "^0.14",
  "class-transformer": "^0.5",
  "reflect-metadata": "^0.1",
  "rxjs": "^7"
}
```

Dev:
```json
{
  "@nestjs/cli": "^10",
  "@nestjs/testing": "^10",
  "jest": "^29",
  "ts-jest": "^29",
  "@types/jest": "^29",
  "typescript": "^5"
}
```

---

## Frontend Architecture (React + Vite)

```
frontend/
├── src/
│   ├── socket.ts              # io('http://localhost:3001/game') singleton
│   ├── App.tsx                # React Router: /, /waiting/:code, /game/:code
│   ├── pages/
│   │   ├── Home.tsx           # Enter name + Create Room or Join Room (enter code)
│   │   ├── WaitingRoom.tsx    # Show room code, "waiting for opponent..."
│   │   ├── Game.tsx           # Board + status bar + turn indicator
│   │   └── GameOver.tsx       # Result + Rematch button
│   ├── components/
│   │   ├── Board.tsx          # 3×3 grid, receives board + onCellClick
│   │   ├── Cell.tsx           # Single cell, shows X/O, handles click
│   │   └── StatusBar.tsx      # "Your turn" / "Opponent's turn" / winner message
│   └── hooks/
│       └── useGame.ts         # All socket event listeners/emitters, game state
├── index.html
├── vite.config.ts
└── package.json
```

**State management:** React `useState` + `useReducer` in `useGame` hook. No external state library needed.

**Socket singleton:** Export a single `socket` instance from `socket.ts`. Import it in `useGame.ts`. Connect/disconnect lifecycle tied to component mount/unmount via `useEffect`.

---

## What Engineers Should NOT Do

- Do not put game logic in the gateway — gateway handles I/O only, delegates to services
- Do not use `@Controller` or HTTP routes for game events — everything is WebSocket
- Do not store rooms in a database — in-memory Map is correct for this scope
- Do not use `socket.broadcast.emit` for room messages — use `server.to(roomCode).emit`
- Do not import `GameModule` providers into `AppModule` directly — let NestJS module system handle it
- Do not skip DTOs — all incoming payloads must be typed and validated

---

## Implementation Order

1. **Backend first**: scaffold NestJS project, implement `RoomService` + `GameService` + `GameGateway`, test with a WebSocket client (e.g. Postman or wscat)
2. **Frontend second**: scaffold Vite+React project, implement socket connection and all pages
3. **Integration**: verify full flow end-to-end — create room, join, play a game, rematch, disconnect handling
4. **QA**: Tester writes and runs tests for game logic and WebSocket events
