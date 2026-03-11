# NestJS WebSocket Gateway Patterns for Room-Based Messaging

_Research based on the Tic-Tac-Toe backend (`backend/src/game/`)._

---

## 1. Gateway Declaration

The `@WebSocketGateway()` decorator wraps a class in a Socket.io server. Key options:

```typescript
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/game' })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server; // injected Socket.io Server instance
}
```

- **`namespace`** scopes events to `/game` — clients must connect to `io('http://host/game')`.
- **`cors`** must be set here (not just on the HTTP adapter) because Socket.io has its own CORS layer.
- `@WebSocketServer()` injects the raw `Server` object for broadcasting.

---

## 2. Lifecycle Hooks

| Interface | Method | When |
|---|---|---|
| `OnGatewayInit` | `afterInit(server)` | Socket.io server ready |
| `OnGatewayConnection` | `handleConnection(client)` | New socket connected |
| `OnGatewayDisconnect` | `handleDisconnect(client)` | Socket disconnected |

`handleDisconnect` is critical for cleanup — the server must evict the player from their room and notify the opponent when a socket drops unexpectedly.

```typescript
handleDisconnect(client: Socket) {
  const { room, wasInRoom } = this.roomService.removePlayer(client.id);
  if (wasInRoom && room) {
    this.server.to(room.code).emit('player_disconnected', { message: 'Opponent disconnected.' });
  }
}
```

---

## 3. Subscribing to Events

`@SubscribeMessage('event_name')` maps incoming client events to handler methods:

```typescript
@SubscribeMessage('create_room')
handleCreateRoom(client: Socket, payload: CreateRoomDto): void {
  const room = this.roomService.createRoom(payload.playerName, client.id);
  void client.join(room.code);    // join Socket.io room keyed by room code
  client.emit('room_created', { roomCode: room.code });
}
```

Handler signature: `(client: Socket, payload: T): void | WsResponse<T>`.
Returning `void` and calling `client.emit(...)` manually is cleaner than returning `WsResponse` because it gives explicit control over event names.

---

## 4. Room-Based Broadcasting

Socket.io rooms are the primitive for group messaging. Join on create/join, then broadcast by room code:

```typescript
// Client joins a Socket.io room when they join a game room
void client.join(room.code);

// Broadcast to everyone in the room (including sender)
this.server.to(room.code).emit('move_made', payload);

// Send to a specific socket only (use socketId as a room name — Socket.io default)
this.server.to(client.id).emit('game_started', payload);

// Send only to sender
client.emit('room_created', { roomCode: room.code });
```

Pattern summary:
| Audience | Method |
|---|---|
| All in a room | `server.to(roomCode).emit(...)` |
| Specific socket | `server.to(socketId).emit(...)` |
| Sender only | `client.emit(...)` |
| All except sender | `client.broadcast.to(roomCode).emit(...)` |

---

## 5. Payload Validation with DTOs

Global `ValidationPipe` does **not** apply to WebSocket handlers — it must be declared explicitly:

```typescript
@UseFilters(new WsExceptionFilter())
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@WebSocketGateway(...)
export class GameGateway { ... }
```

Apply `@UsePipes` at the class level so all handlers get validation. DTOs use `class-validator` decorators:

```typescript
export class MakeMoveDto {
  @IsInt()
  @Min(0)
  @Max(8)
  position: number;
}
```

`whitelist: true` strips unknown fields. `transform: true` coerces string-serialized numbers/booleans to their types.

---

## 6. Error Handling

Throw `WsException` from handlers or services — **not** `HttpException`:

```typescript
throw new WsException('Room not found');
```

Catch with a custom filter that emits an `error` event back to the offending client:

```typescript
@Catch(WsException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    client.emit('error', { message: exception.getError() });
  }
}
```

Apply the filter at the class level with `@UseFilters(new WsExceptionFilter())`.

---

## 7. State Management Pattern

**Gateway is stateless** — it handles I/O only. State lives in injectable services:

```
GameGateway  →  RoomService   (room lifecycle, in-memory Map<code, Room>)
             →  GameService   (move validation, win/draw detection)
```

`RoomService` maintains two Maps for O(1) lookups:
- `rooms: Map<roomCode, Room>` — the authoritative room store
- `socketToRoom: Map<socketId, roomCode>` — fast disconnect resolution

Services are `@Injectable()` singletons — the same instance is shared across all socket connections.

---

## 8. Module Wiring

```typescript
@Module({
  providers: [GameGateway, GameService, RoomService],
})
export class GameModule {}
```

Gateways are declared in `providers`, not `controllers`. NestJS registers them with the underlying platform (Socket.io) automatically.

---

## 9. Key Pitfalls

| Mistake | Fix |
|---|---|
| Using `socket.broadcast.emit` for room messages | Use `server.to(roomCode).emit` |
| Storing per-connection state in the gateway class | Push all state to an injectable service singleton |
| Forgetting `client.join(roomCode)` | Without joining, `server.to(roomCode)` won't reach that client |
| Using global `ValidationPipe` assuming it covers WS | Add `@UsePipes` explicitly on the gateway class |
| Throwing `HttpException` in a WS handler | Use `WsException` so the WS exception filter catches it |
| `void client.join(...)` — forgetting `void` | `join()` returns a `Promise<void>`; ignoring it avoids unhandled rejection lint warnings |

---

## 10. Client-Side Connection

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/game'); // must match namespace

socket.emit('create_room', { playerName: 'Alice' });
socket.on('room_created', ({ roomCode }) => { ... });
socket.on('error', ({ message }) => { ... });
```

Export a single socket singleton — do not create multiple connections per namespace.
