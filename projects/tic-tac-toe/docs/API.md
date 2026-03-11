# Tic-Tac-Toe Backend — API Reference

This document is the complete API reference for the Tic-Tac-Toe backend server. All real-time game communication uses **WebSocket (Socket.IO)**. There are no REST endpoints — this is a WebSocket-only server.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Connecting to the Server](#2-connecting-to-the-server)
3. [Authentication](#3-authentication)
4. [Data Types](#4-data-types)
5. [Client → Server Events](#5-client--server-events)
6. [Server → Client Events](#6-server--client-events)
7. [Error Handling](#7-error-handling)
8. [Example Flows](#8-example-flows)

---

## 1. Getting Started

### Prerequisites

- Node.js v16 or later
- npm

### Install and Run

```bash
# From the project root
cd backend
npm install

# Development mode (hot reload)
npm run start:dev

# Production mode
npm run build && npm run start:prod
```

The server listens on **port 3001** by default.

### Environment Variables

Create a `.env` file in `backend/` (or copy from `.env.example`):

| Variable       | Default                   | Description                                               |
| -------------- | ------------------------- | --------------------------------------------------------- |
| `PORT`         | `3001`                    | TCP port the server listens on                            |
| `FRONTEND_URL` | `*` (any origin)          | CORS origin for the WebSocket gateway. Set in production. |

```bash
# backend/.env
PORT=3001
FRONTEND_URL=http://localhost:5173
```

### Running Tests

```bash
# Unit tests
npm test

# Unit tests in watch mode
npm run test:watch

# Coverage report
npm run test:cov

# End-to-end integration tests (full WebSocket flows)
npm run test:e2e
```

---

## 2. Connecting to the Server

**Namespace:** `/game`
**Connection URL:** `http://localhost:3001/game`
**Transport:** Socket.IO over WebSocket

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001/game');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

> **Important:** Connect to the `/game` namespace, not the root namespace. A connection to `http://localhost:3001` (without `/game`) will not receive game events.

---

## 3. Authentication

**There is no authentication.** Any client can connect and create or join rooms. Each socket connection is identified by its auto-assigned `socket.id` (managed by Socket.IO internally). The server maintains all session state in memory — no tokens, cookies, or API keys are required.

> **Note for production:** Consider adding token-based authentication via Socket.IO middleware before deploying publicly.

---

## 4. Data Types

```typescript
/** The symbol assigned to each player */
type Symbol = 'X' | 'O';

/** A single board cell — null means empty */
type CellValue = Symbol | null;

/** Room lifecycle state */
type GameStatus = 'waiting' | 'playing' | 'finished';
```

### Board Layout

The board is a flat array of 9 `CellValue` elements representing a 3×3 grid in row-major order:

```
Index:   0 | 1 | 2
         ---------
         3 | 4 | 5
         ---------
         6 | 7 | 8
```

An empty board: `[null, null, null, null, null, null, null, null, null]`

---

## 5. Client → Server Events

These events are sent **from the client to the server**. All payloads are validated on arrival — invalid payloads result in an `error` event (see [§7 Error Handling](#7-error-handling)).

---

### `create_room`

Create a new game room. The creator is assigned symbol `'X'` and the room status is set to `'waiting'`.

**Payload:**

```typescript
{
  playerName: string  // Your display name. Required. Max 20 characters.
}
```

**Validation rules:**
- `playerName`: non-empty string, maximum 20 characters

**Success response:** [`room_created`](#room_created) emitted to the creator only.

**Example:**

```javascript
socket.emit('create_room', { playerName: 'Alice' });
```

---

### `join_room`

Join an existing room as the second player. The joiner is assigned symbol `'O'`. The room status transitions from `'waiting'` to `'playing'` and both players receive a [`game_started`](#game_started) event.

**Payload:**

```typescript
{
  roomCode: string,   // 6-character room code from room_created. Required.
  playerName: string  // Your display name. Required. Max 20 characters.
}
```

**Validation rules:**
- `roomCode`: exactly 6 characters
- `playerName`: non-empty string, maximum 20 characters

**Success response:** [`game_started`](#game_started) emitted to **both** players individually.

**Possible errors:**

| Message                    | Cause                                         |
| -------------------------- | --------------------------------------------- |
| `"Room not found"`         | No room matches the provided `roomCode`       |
| `"Room is full"`           | Room already has 2 players                    |
| `"Game already in progress"` | Room status is not `'waiting'`              |

**Example:**

```javascript
socket.emit('join_room', { roomCode: 'AB12CD', playerName: 'Bob' });
```

---

### `make_move`

Place your symbol on the board. Only valid when it is your turn and the game is in progress.

**Payload:**

```typescript
{
  position: number  // Board index 0–8. Required.
}
```

**Validation rules:**
- `position`: integer between 0 and 8 (inclusive)

**Success response:** [`move_made`](#move_made) broadcast to all players in the room.

**Possible errors:**

| Message                   | Cause                                              |
| ------------------------- | -------------------------------------------------- |
| `"You are not in a room"` | Your socket is not associated with any room        |
| `"Game is not in progress"` | Room status is not `'playing'`                  |
| `"You are not in this room"` | Your socket is not in the player list           |
| `"Not your turn"`         | It is the other player's turn                      |
| `"Cell already taken"`    | `board[position]` is already occupied              |
| `"Invalid move"`          | Other validation failure                           |

**Example:**

```javascript
socket.emit('make_move', { position: 4 }); // Play center cell
```

---

### `rematch_request`

Signal that you want to play again after a game ends. Notifies the opponent.
Both players must accept (one sends `rematch_request`, the other sends `rematch_accept`) to start a new game.

**Payload:** None (send empty object or omit)

**Success response:** [`rematch_requested`](#rematch_requested) emitted to the **opponent** only.

**Possible errors:**

| Message                | Cause                                         |
| ---------------------- | --------------------------------------------- |
| `"Room not found"`     | Your socket is not associated with any room   |
| `"Game is not finished"` | Room status is not `'finished'`             |

**Example:**

```javascript
socket.emit('rematch_request');
```

---

### `rematch_accept`

Accept the opponent's rematch request. Starts a new game with swapped symbols (`X` ↔ `O`) and a fresh board. Both players receive a new [`game_started`](#game_started) event.

**Payload:** None (send empty object or omit)

**Success response:** [`game_started`](#game_started) emitted to **both** players individually (with swapped symbols).

**Possible errors:**

| Message                | Cause                                         |
| ---------------------- | --------------------------------------------- |
| `"Room not found"`     | Your socket is not associated with any room   |
| `"Game is not finished"` | Room status is not `'finished'`             |
| `"Player not found"`   | Your socket is not in the player list         |

**Example:**

```javascript
// After receiving rematch_requested:
socket.on('rematch_requested', ({ requesterName }) => {
  // Show UI to accept
  socket.emit('rematch_accept');
});
```

---

## 6. Server → Client Events

These events are sent **from the server to the client**. Listen for them with `socket.on(...)`.

---

### `room_created`

Sent to the **creator only** after a successful `create_room`. Contains the room code to share with the opponent.

**Payload:**

```typescript
{
  roomCode: string  // 6-character alphanumeric code, e.g. "AB12CD"
}
```

**Example:**

```javascript
socket.on('room_created', ({ roomCode }) => {
  console.log('Share this code:', roomCode);
});
```

---

### `game_started`

Sent **individually** to each player when a game begins (after `join_room` or `rematch_accept`). Each player receives a payload tailored to their symbol — `yourSymbol` will differ between the two players.

**Payload:**

```typescript
{
  board: CellValue[],     // Initial board — 9 nulls at game start
  yourSymbol: Symbol,     // 'X' or 'O' — unique per recipient
  opponentName: string,   // Display name of the other player
  turn: Symbol,           // Always 'X' at the start of a new game
  roomCode: string        // The room code
}
```

**Example:**

```javascript
socket.on('game_started', ({ board, yourSymbol, opponentName, turn, roomCode }) => {
  console.log(`You are ${yourSymbol}, playing against ${opponentName}`);
  console.log(`${turn} goes first`);
});
```

---

### `move_made`

Broadcast to **all players in the room** after a valid `make_move`. Contains the updated board and game state.

**Payload:**

```typescript
{
  board: CellValue[],                        // Full board after the move
  position: number,                          // Index (0–8) where the move was placed
  symbol: Symbol,                            // Symbol that was placed ('X' or 'O')
  nextTurn: Symbol,                          // Who moves next (only meaningful when gameState is 'playing')
  gameState: 'playing' | 'won' | 'draw',    // Current game outcome
  winner?: Symbol                            // Present only when gameState === 'won'
}
```

**Example:**

```javascript
socket.on('move_made', ({ board, position, symbol, nextTurn, gameState, winner }) => {
  renderBoard(board);

  if (gameState === 'won') {
    console.log(`${winner} wins!`);
  } else if (gameState === 'draw') {
    console.log('Draw!');
  } else {
    console.log(`${nextTurn}'s turn`);
  }
});
```

---

### `rematch_requested`

Sent to the **opponent only** when a player emits `rematch_request`.

**Payload:**

```typescript
{
  requesterName: string  // Display name of the player who sent rematch_request
}
```

**Example:**

```javascript
socket.on('rematch_requested', ({ requesterName }) => {
  console.log(`${requesterName} wants a rematch!`);
});
```

---

### `player_disconnected`

Sent to the **remaining player** when their opponent's socket disconnects during a game. The room is preserved for the remaining player to see this message, then cleaned up.

**Payload:**

```typescript
{
  message: string  // Always: "Your opponent has disconnected."
}
```

**Example:**

```javascript
socket.on('player_disconnected', ({ message }) => {
  console.log(message); // "Your opponent has disconnected."
  returnToLobby();
});
```

---

### `error`

Sent to the **offending client only** when a handler throws a `WsException` (invalid room code, wrong turn, validation failure, etc.).

**Payload:**

```typescript
{
  message: string  // Human-readable description of the error
}
```

**Example:**

```javascript
socket.on('error', ({ message }) => {
  console.error('Game error:', message);
  showErrorToast(message);
});
```

---

## 7. Error Handling

All errors are delivered via the `error` WebSocket event — there are no HTTP error status codes.

### Error Reference

| Error Message                        | Trigger Event(s)       | Cause                                                 |
| ------------------------------------ | ---------------------- | ----------------------------------------------------- |
| `"Room not found"`                   | `join_room`, `rematch_request`, `rematch_accept` | Room code doesn't exist or socket has no room |
| `"Room is full"`                     | `join_room`            | Room already has 2 players                            |
| `"Game already in progress"`         | `join_room`            | Room status is not `'waiting'`                        |
| `"You are not in a room"`            | `make_move`            | Socket has no room association                        |
| `"Game is not in progress"`          | `make_move`            | Room status is not `'playing'`                        |
| `"You are not in this room"`         | `make_move`            | Socket not in the room's player list                  |
| `"Not your turn"`                    | `make_move`            | Other player's symbol matches `room.turn`             |
| `"Cell already taken"`               | `make_move`            | `board[position]` is already `'X'` or `'O'`          |
| `"Invalid move"`                     | `make_move`            | Other move validation failure                         |
| `"Game is not finished"`             | `rematch_request`, `rematch_accept` | Room status is not `'finished'`          |
| `"Player not found"`                 | `rematch_accept`       | Accepting player's socket is not in the player list   |
| Validation messages (class-validator)| any event with payload | DTO constraint violated — e.g., `"playerName must be shorter than or equal to 20 characters"` |

### Validation Error Examples

```
"playerName should not be empty"
"playerName must be shorter than or equal to 20 characters"
"roomCode must be longer than or equal to 6 and shorter than or equal to 6 characters"
"position must not be greater than 8"
"position must not be less than 0"
"position must be an integer number"
```

---

## 8. Example Flows

### 8.1 Full Game: Create → Join → Play → Win

```javascript
// --- Player A (Alice) ---

const alice = io('http://localhost:3001/game');

alice.emit('create_room', { playerName: 'Alice' });

alice.on('room_created', ({ roomCode }) => {
  console.log('Room code:', roomCode); // e.g. "XK9P2A"
  // Share roomCode with Bob out-of-band
});

alice.on('game_started', ({ yourSymbol, opponentName, turn }) => {
  // yourSymbol: 'X', opponentName: 'Bob', turn: 'X'
  if (turn === yourSymbol) {
    alice.emit('make_move', { position: 4 }); // Alice takes center
  }
});

alice.on('move_made', ({ board, gameState, winner, nextTurn }) => {
  if (gameState === 'won' && winner === 'X') {
    console.log('Alice wins!');
  }
});


// --- Player B (Bob) ---

const bob = io('http://localhost:3001/game');

bob.emit('join_room', { roomCode: 'XK9P2A', playerName: 'Bob' });

bob.on('game_started', ({ yourSymbol, opponentName, turn }) => {
  // yourSymbol: 'O', opponentName: 'Alice', turn: 'X'
});

bob.on('move_made', ({ board, gameState, nextTurn }) => {
  if (gameState === 'playing' && nextTurn === 'O') {
    bob.emit('make_move', { position: 0 }); // Bob takes top-left
  }
});
```

---

### 8.2 Rematch Flow

```javascript
// After game ends (gameState === 'won' or 'draw' in move_made):

// Alice requests rematch
alice.emit('rematch_request');

// Bob receives notification
bob.on('rematch_requested', ({ requesterName }) => {
  console.log(`${requesterName} wants a rematch!`); // "Alice wants a rematch!"
  bob.emit('rematch_accept');
});

// Both players receive game_started again (symbols are swapped)
alice.on('game_started', ({ yourSymbol }) => {
  // Alice now has 'O' (was 'X')
});

bob.on('game_started', ({ yourSymbol }) => {
  // Bob now has 'X' (was 'O')
});
```

---

### 8.3 Handling Disconnect

```javascript
alice.on('player_disconnected', ({ message }) => {
  console.log(message); // "Your opponent has disconnected."
  // Navigate back to lobby or show message
});
```

---

### 8.4 Error Handling

```javascript
socket.on('error', ({ message }) => {
  switch (message) {
    case 'Room not found':
      alert('Invalid room code. Please check and try again.');
      break;
    case 'Room is full':
      alert('This room already has two players.');
      break;
    case 'Not your turn':
      // Ignore — UI should prevent this anyway
      break;
    default:
      console.error('Unexpected error:', message);
  }
});
```
