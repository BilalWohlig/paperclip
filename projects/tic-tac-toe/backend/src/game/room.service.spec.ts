import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { RoomService } from './room.service';

describe('RoomService', () => {
  let service: RoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomService],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  // ─── createRoom ──────────────────────────────────────────────────────────────

  describe('createRoom', () => {
    it('creates a room and returns it', () => {
      const room = service.createRoom('Alice', 'socket-1');
      expect(room).toBeDefined();
      expect(room.players).toHaveLength(1);
      expect(room.players[0].name).toBe('Alice');
      expect(room.players[0].socketId).toBe('socket-1');
      expect(room.players[0].symbol).toBe('X');
      expect(room.status).toBe('waiting');
      expect(room.board).toHaveLength(9);
      expect(room.board.every((c) => c === null)).toBe(true);
      expect(room.winner).toBeNull();
      expect(room.turn).toBe('X');
    });

    it('generates a 6-character uppercase alphanumeric room code', () => {
      const room = service.createRoom('Alice', 'socket-1');
      expect(room.code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('generates unique room codes for multiple rooms', () => {
      const codes = new Set<string>();
      for (let i = 0; i < 10; i++) {
        const room = service.createRoom(`Player${i}`, `socket-${i}`);
        codes.add(room.code);
      }
      expect(codes.size).toBe(10);
    });

    it('allows lookup via findRoom after creation', () => {
      const room = service.createRoom('Alice', 'socket-1');
      const found = service.findRoom(room.code);
      expect(found).toBeDefined();
      expect(found!.code).toBe(room.code);
    });

    it('allows lookup via findRoomBySocket after creation', () => {
      const room = service.createRoom('Alice', 'socket-1');
      const found = service.findRoomBySocket('socket-1');
      expect(found).toBeDefined();
      expect(found!.code).toBe(room.code);
    });
  });

  // ─── joinRoom ────────────────────────────────────────────────────────────────

  describe('joinRoom', () => {
    it('allows a second player to join and sets status to playing', () => {
      const room = service.createRoom('Alice', 'socket-1');
      const updated = service.joinRoom(room.code, 'Bob', 'socket-2');

      expect(updated.players).toHaveLength(2);
      expect(updated.players[1].name).toBe('Bob');
      expect(updated.players[1].symbol).toBe('O');
      expect(updated.status).toBe('playing');
    });

    it('registers second player in socketToRoom map', () => {
      const room = service.createRoom('Alice', 'socket-1');
      service.joinRoom(room.code, 'Bob', 'socket-2');

      const found = service.findRoomBySocket('socket-2');
      expect(found).toBeDefined();
      expect(found!.code).toBe(room.code);
    });

    it('throws WsException when room code is not found', () => {
      expect(() => {
        service.joinRoom('XXXXXX', 'Bob', 'socket-2');
      }).toThrow(WsException);
    });

    it('throws WsException when room is full (3rd player tries to join)', () => {
      const room = service.createRoom('Alice', 'socket-1');
      service.joinRoom(room.code, 'Bob', 'socket-2');

      expect(() => {
        service.joinRoom(room.code, 'Charlie', 'socket-3');
      }).toThrow(WsException);
    });

    it('throws WsException when game is already in progress', () => {
      const room = service.createRoom('Alice', 'socket-1');
      service.joinRoom(room.code, 'Bob', 'socket-2');
      // status is now 'playing', so can't join again
      expect(() => {
        service.joinRoom(room.code, 'Dave', 'socket-4');
      }).toThrow(WsException);
    });

    it('throws WsException when joining a finished room (1 player left after disconnect)', () => {
      const room = service.createRoom('Alice', 'socket-1');
      service.joinRoom(room.code, 'Bob', 'socket-2');
      // Bob disconnects — room now has 1 player and status: 'finished'
      service.removePlayer('socket-2');

      // Dave tries to join: room.players.length < 2 but status !== 'waiting'
      expect(() => {
        service.joinRoom(room.code, 'Dave', 'socket-4');
      }).toThrow(WsException);
    });
  });

  // ─── findRoom ────────────────────────────────────────────────────────────────

  describe('findRoom', () => {
    it('returns undefined for unknown room code', () => {
      expect(service.findRoom('XXXXXX')).toBeUndefined();
    });

    it('returns the room for a valid code', () => {
      const room = service.createRoom('Alice', 'socket-1');
      const found = service.findRoom(room.code);
      expect(found).toBeDefined();
      expect(found!.players[0].name).toBe('Alice');
    });
  });

  // ─── findRoomBySocket ────────────────────────────────────────────────────────

  describe('findRoomBySocket', () => {
    it('returns undefined for unknown socket', () => {
      expect(service.findRoomBySocket('nonexistent')).toBeUndefined();
    });

    it('returns correct room for player X socket', () => {
      const room = service.createRoom('Alice', 'socket-1');
      const found = service.findRoomBySocket('socket-1');
      expect(found!.code).toBe(room.code);
    });
  });

  // ─── removePlayer ────────────────────────────────────────────────────────────

  describe('removePlayer', () => {
    it('returns wasInRoom=false for a socket that was never in a room', () => {
      const result = service.removePlayer('ghost-socket');
      expect(result.wasInRoom).toBe(false);
      expect(result.room).toBeUndefined();
    });

    it('removes player and clears socketToRoom entry', () => {
      const room = service.createRoom('Alice', 'socket-1');
      service.joinRoom(room.code, 'Bob', 'socket-2');

      service.removePlayer('socket-1');

      // socketToRoom for socket-1 should be gone
      const found = service.findRoomBySocket('socket-1');
      expect(found).toBeUndefined();
    });

    it('sets room status to finished when one player disconnects', () => {
      const room = service.createRoom('Alice', 'socket-1');
      service.joinRoom(room.code, 'Bob', 'socket-2');

      const result = service.removePlayer('socket-1');
      expect(result.wasInRoom).toBe(true);
      expect(result.room).toBeDefined();
      expect(result.room!.status).toBe('finished');
    });

    it('deletes the room entirely when the last player disconnects', () => {
      const room = service.createRoom('Alice', 'socket-1');
      // Only one player; removing them should delete the room
      const result = service.removePlayer('socket-1');
      expect(result.wasInRoom).toBe(true);
      // Room should be gone
      expect(service.findRoom(room.code)).toBeUndefined();
    });

    it('keeps opponent in room after disconnect', () => {
      const room = service.createRoom('Alice', 'socket-1');
      service.joinRoom(room.code, 'Bob', 'socket-2');

      service.removePlayer('socket-1');

      const remaining = service.findRoomBySocket('socket-2');
      expect(remaining).toBeDefined();
      expect(remaining!.players).toHaveLength(1);
      expect(remaining!.players[0].name).toBe('Bob');
    });
  });

  // ─── makeMove ────────────────────────────────────────────────────────────────

  describe('makeMove', () => {
    it('places the correct symbol on the board', () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');

      const updated = service.makeMove(room.code, 'socket-x', 4);
      expect(updated.board[4]).toBe('X');
    });

    it('advances turn after a valid move', () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');

      const updated = service.makeMove(room.code, 'socket-x', 0);
      expect(updated.turn).toBe('O');
    });

    it('detects a winning move and sets status to finished', () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');

      // X: 0,1,2 — O: 3,4
      service.makeMove(room.code, 'socket-x', 0);
      service.makeMove(room.code, 'socket-o', 3);
      service.makeMove(room.code, 'socket-x', 1);
      service.makeMove(room.code, 'socket-o', 4);
      const final = service.makeMove(room.code, 'socket-x', 2);

      expect(final.status).toBe('finished');
      expect(final.winner).toBe('X');
    });

    it('detects a draw and sets winner to draw', () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');

      // Build a draw:
      // X O X
      // X X O
      // O X O
      const moves: Array<[string, number]> = [
        ['socket-x', 0], ['socket-o', 1], ['socket-x', 2],
        ['socket-o', 5], ['socket-x', 3], ['socket-o', 6],
        ['socket-x', 4], ['socket-o', 8], ['socket-x', 7],
      ];
      let final = room;
      for (const [sid, pos] of moves) {
        final = service.makeMove(room.code, sid, pos);
      }
      expect(final.winner).toBe('draw');
      expect(final.status).toBe('finished');
    });

    it('throws WsException when room is not found', () => {
      expect(() => {
        service.makeMove('XXXXXX', 'socket-x', 0);
      }).toThrow(WsException);
    });

    it('throws WsException when player is not in the room', () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');

      expect(() => {
        service.makeMove(room.code, 'unknown-socket', 0);
      }).toThrow(WsException);
    });

    it('throws WsException when it is not the player\'s turn', () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');

      expect(() => {
        service.makeMove(room.code, 'socket-o', 0); // O tries to go first
      }).toThrow(WsException);
    });

    it('throws WsException when cell is already occupied', () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');

      service.makeMove(room.code, 'socket-x', 0);
      service.makeMove(room.code, 'socket-o', 1);

      expect(() => {
        service.makeMove(room.code, 'socket-x', 0); // already taken
      }).toThrow(WsException);
    });
  });

  // ─── acceptRematch ───────────────────────────────────────────────────────────

  describe('acceptRematch', () => {
    const setupFinishedGame = () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');
      // Fast win for X: positions 0, 1, 2
      service.makeMove(room.code, 'socket-x', 0);
      service.makeMove(room.code, 'socket-o', 3);
      service.makeMove(room.code, 'socket-x', 1);
      service.makeMove(room.code, 'socket-o', 4);
      service.makeMove(room.code, 'socket-x', 2); // X wins
      return room;
    };

    it('resets board to all nulls', () => {
      const room = setupFinishedGame();
      const updated = service.acceptRematch('socket-o');
      expect(updated.board.every((c) => c === null)).toBe(true);
      expect(updated.board).toHaveLength(9);
    });

    it('swaps symbols: original X becomes O and vice versa', () => {
      const room = setupFinishedGame();
      const originalXPlayer = room.players.find((p) => p.socketId === 'socket-x')!;
      const originalOPlayer = room.players.find((p) => p.socketId === 'socket-o')!;

      service.acceptRematch('socket-o');

      const updatedRoom = service.findRoomBySocket('socket-x')!;
      const newXPlayer = updatedRoom.players.find((p) => p.socketId === 'socket-x')!;
      const newOPlayer = updatedRoom.players.find((p) => p.socketId === 'socket-o')!;

      expect(newXPlayer.symbol).toBe('O'); // was X, now O
      expect(newOPlayer.symbol).toBe('X'); // was O, now X
    });

    it('resets status to playing', () => {
      const room = setupFinishedGame();
      const updated = service.acceptRematch('socket-o');
      expect(updated.status).toBe('playing');
    });

    it('resets winner to null', () => {
      const room = setupFinishedGame();
      const updated = service.acceptRematch('socket-o');
      expect(updated.winner).toBeNull();
    });

    it('resets turn to X', () => {
      const room = setupFinishedGame();
      const updated = service.acceptRematch('socket-o');
      expect(updated.turn).toBe('X');
    });

    it('resets rematchReady flags for both players', () => {
      const room = setupFinishedGame();
      service.requestRematch('socket-x'); // Mark X as rematch-ready
      const updated = service.acceptRematch('socket-o');
      updated.players.forEach((p) => {
        expect(p.rematchReady).toBe(false);
      });
    });

    it('throws WsException when socket is not in a room', () => {
      expect(() => {
        service.acceptRematch('ghost');
      }).toThrow(WsException);
    });

    it('throws WsException when game is not finished', () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');
      // status is 'playing', not 'finished'
      expect(() => {
        service.acceptRematch('socket-o');
      }).toThrow(WsException);
    });
  });

  // ─── requestRematch ──────────────────────────────────────────────────────────

  describe('requestRematch', () => {
    const setupFinishedGame = () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');
      service.makeMove(room.code, 'socket-x', 0);
      service.makeMove(room.code, 'socket-o', 3);
      service.makeMove(room.code, 'socket-x', 1);
      service.makeMove(room.code, 'socket-o', 4);
      service.makeMove(room.code, 'socket-x', 2);
      return room;
    };

    it('marks the requesting player as rematchReady', () => {
      const room = setupFinishedGame();
      service.requestRematch('socket-x');
      const updated = service.findRoomBySocket('socket-x')!;
      const xPlayer = updated.players.find((p) => p.socketId === 'socket-x')!;
      expect(xPlayer.rematchReady).toBe(true);
    });

    it('returns the requester name', () => {
      const room = setupFinishedGame();
      const { requesterName } = service.requestRematch('socket-x');
      expect(requesterName).toBe('Alice');
    });

    it('throws WsException if game is not finished', () => {
      const room = service.createRoom('Alice', 'socket-x');
      service.joinRoom(room.code, 'Bob', 'socket-o');
      expect(() => {
        service.requestRematch('socket-x');
      }).toThrow(WsException);
    });
  });
});
