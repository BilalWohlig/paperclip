import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { CellValue, Room, Symbol } from './interfaces/game.interfaces';

describe('GameService', () => {
  let service: GameService;

  const makeBoard = (values: (Symbol | null)[]): CellValue[] => values;

  const makeRoom = (overrides: Partial<Room> = {}): Room => ({
    code: 'ABCDEF',
    players: [
      { socketId: 'socket-x', name: 'Alice', symbol: 'X', rematchReady: false },
      { socketId: 'socket-o', name: 'Bob', symbol: 'O', rematchReady: false },
    ],
    board: Array(9).fill(null),
    turn: 'X',
    status: 'playing',
    winner: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GameService],
    }).compile();

    service = module.get<GameService>(GameService);
  });

  // ─── checkWinner ────────────────────────────────────────────────────────────

  describe('checkWinner', () => {
    it('detects row 0 win [0,1,2] for X', () => {
      const board = makeBoard(['X', 'X', 'X', null, null, null, null, null, null]);
      expect(service.checkWinner(board)).toBe('X');
    });

    it('detects row 1 win [3,4,5] for O', () => {
      const board = makeBoard([null, null, null, 'O', 'O', 'O', null, null, null]);
      expect(service.checkWinner(board)).toBe('O');
    });

    it('detects row 2 win [6,7,8] for X', () => {
      const board = makeBoard([null, null, null, null, null, null, 'X', 'X', 'X']);
      expect(service.checkWinner(board)).toBe('X');
    });

    it('detects column 0 win [0,3,6] for O', () => {
      const board = makeBoard(['O', null, null, 'O', null, null, 'O', null, null]);
      expect(service.checkWinner(board)).toBe('O');
    });

    it('detects column 1 win [1,4,7] for X', () => {
      const board = makeBoard([null, 'X', null, null, 'X', null, null, 'X', null]);
      expect(service.checkWinner(board)).toBe('X');
    });

    it('detects column 2 win [2,5,8] for O', () => {
      const board = makeBoard([null, null, 'O', null, null, 'O', null, null, 'O']);
      expect(service.checkWinner(board)).toBe('O');
    });

    it('detects diagonal win [0,4,8] for X', () => {
      const board = makeBoard(['X', null, null, null, 'X', null, null, null, 'X']);
      expect(service.checkWinner(board)).toBe('X');
    });

    it('detects anti-diagonal win [2,4,6] for O', () => {
      const board = makeBoard([null, null, 'O', null, 'O', null, 'O', null, null]);
      expect(service.checkWinner(board)).toBe('O');
    });

    it('returns null when no winner on empty board', () => {
      const board = makeBoard(Array(9).fill(null));
      expect(service.checkWinner(board)).toBeNull();
    });

    it('returns null when no winner on partial board', () => {
      const board = makeBoard(['X', 'O', 'X', 'O', 'X', null, null, null, null]);
      expect(service.checkWinner(board)).toBeNull();
    });

    it('returns null for a draw board with no winner', () => {
      // X O X
      // X X O
      // O X O  — no three in a row
      const board = makeBoard(['X', 'O', 'X', 'X', 'X', 'O', 'O', 'X', 'O']);
      expect(service.checkWinner(board)).toBeNull();
    });

    it('does not produce false positive for mixed symbols in a line', () => {
      const board = makeBoard(['X', 'O', 'X', null, null, null, null, null, null]);
      expect(service.checkWinner(board)).toBeNull();
    });
  });

  // ─── checkDraw ──────────────────────────────────────────────────────────────

  describe('checkDraw', () => {
    it('returns true when board is full with no winner', () => {
      const board = makeBoard(['X', 'O', 'X', 'X', 'X', 'O', 'O', 'X', 'O']);
      expect(service.checkDraw(board)).toBe(true);
    });

    it('returns false when board has empty cells', () => {
      const board = makeBoard(['X', 'O', null, null, null, null, null, null, null]);
      expect(service.checkDraw(board)).toBe(false);
    });

    it('returns false on empty board', () => {
      const board = makeBoard(Array(9).fill(null));
      expect(service.checkDraw(board)).toBe(false);
    });

    it('returns true only when all 9 cells are filled', () => {
      // 8 filled, 1 null
      const board = makeBoard(['X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', null]);
      expect(service.checkDraw(board)).toBe(false);
    });
  });

  // ─── validateMove ───────────────────────────────────────────────────────────

  describe('validateMove', () => {
    it('returns valid for correct player, correct turn, empty cell', () => {
      const room = makeRoom();
      expect(service.validateMove(room, 'socket-x', 0)).toEqual({ valid: true });
    });

    it('returns invalid when game is not in playing status', () => {
      const room = makeRoom({ status: 'waiting' });
      const result = service.validateMove(room, 'socket-x', 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Game is not in progress');
    });

    it('returns invalid when game is finished', () => {
      const room = makeRoom({ status: 'finished' });
      const result = service.validateMove(room, 'socket-x', 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Game is not in progress');
    });

    it('returns invalid when socket is not a player in the room', () => {
      const room = makeRoom();
      const result = service.validateMove(room, 'unknown-socket', 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('You are not in this room');
    });

    it('returns invalid when it is not the player\'s turn', () => {
      const room = makeRoom({ turn: 'X' }); // X's turn, but O tries to move
      const result = service.validateMove(room, 'socket-o', 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Not your turn');
    });

    it('returns invalid when cell is already occupied', () => {
      const board = makeBoard(['X', null, null, null, null, null, null, null, null]);
      const room = makeRoom({ board, turn: 'O' }); // O's turn, but cell 0 is taken
      const result = service.validateMove(room, 'socket-o', 0);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cell already taken');
    });

    it('validates out-of-range position as occupied when checking board', () => {
      // board[position] with in-bounds checks are from DTO; service trusts the position
      // For a valid in-range occupied cell:
      const board = makeBoard([null, null, null, null, 'X', null, null, null, null]);
      const room = makeRoom({ board, turn: 'O' });
      const result = service.validateMove(room, 'socket-o', 4);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cell already taken');
    });
  });

  // ─── getNextTurn ─────────────────────────────────────────────────────────────

  describe('getNextTurn', () => {
    it('returns O when current turn is X', () => {
      expect(service.getNextTurn('X')).toBe('O');
    });

    it('returns X when current turn is O', () => {
      expect(service.getNextTurn('O')).toBe('X');
    });

    it('alternates correctly: X -> O -> X', () => {
      let turn: Symbol = 'X';
      turn = service.getNextTurn(turn);
      expect(turn).toBe('O');
      turn = service.getNextTurn(turn);
      expect(turn).toBe('X');
    });
  });

  // ─── applyMove ───────────────────────────────────────────────────────────────

  describe('applyMove', () => {
    it('places X on the given position', () => {
      const board = makeBoard(Array(9).fill(null));
      const result = service.applyMove(board, 4, 'X');
      expect(result[4]).toBe('X');
    });

    it('does not mutate the original board', () => {
      const board = makeBoard(Array(9).fill(null));
      service.applyMove(board, 0, 'X');
      expect(board[0]).toBeNull();
    });

    it('returns a new 9-element array', () => {
      const board = makeBoard(Array(9).fill(null));
      const result = service.applyMove(board, 0, 'O');
      expect(result).toHaveLength(9);
      expect(result).not.toBe(board);
    });

    it('places O on corner position 8', () => {
      const board = makeBoard(Array(9).fill(null));
      const result = service.applyMove(board, 8, 'O');
      expect(result[8]).toBe('O');
    });
  });

  // ─── resetBoard ──────────────────────────────────────────────────────────────

  describe('resetBoard', () => {
    it('returns a 9-element array of nulls', () => {
      const board = service.resetBoard();
      expect(board).toHaveLength(9);
      expect(board.every((cell) => cell === null)).toBe(true);
    });

    it('returns a fresh array each call', () => {
      const b1 = service.resetBoard();
      const b2 = service.resetBoard();
      expect(b1).not.toBe(b2);
    });
  });
});
