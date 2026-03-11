import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module';

// Helper: wait for a specific event on a socket with a timeout
const waitForEvent = <T = unknown>(
  socket: Socket,
  event: string,
  timeoutMs = 3000,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout waiting for event "${event}"`)),
      timeoutMs,
    );
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });

// Helper: connect a socket client and wait for connection
const connectClient = (port: number): Promise<Socket> =>
  new Promise((resolve, reject) => {
    const socket = io(`http://127.0.0.1:${port}/game`, {
      transports: ['websocket'],
    });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });

describe('GameGateway (e2e)', () => {
  let app: INestApplication;
  let port: number;
  let clientA: Socket;
  let clientB: Socket;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0); // listen on random port

    const server = app.getHttpServer();
    port = (server.address() as { port: number }).port;
  });

  afterAll(async () => {
    if (clientA?.connected) clientA.disconnect();
    if (clientB?.connected) clientB.disconnect();
    await app.close();
  });

  beforeEach(async () => {
    clientA = await connectClient(port);
    clientB = await connectClient(port);
  });

  afterEach(() => {
    if (clientA?.connected) clientA.disconnect();
    if (clientB?.connected) clientB.disconnect();
  });

  // ─── create_room / join_room ─────────────────────────────────────────────────

  describe('Room lifecycle', () => {
    it('client A creates a room and receives room_created with a 6-char code', async () => {
      const promise = waitForEvent<{ roomCode: string }>(clientA, 'room_created');
      clientA.emit('create_room', { playerName: 'Alice' });
      const data = await promise;

      expect(data.roomCode).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('client B joins room and both receive game_started', async () => {
      const createdPromise = waitForEvent<{ roomCode: string }>(clientA, 'room_created');
      clientA.emit('create_room', { playerName: 'Alice' });
      const { roomCode } = await createdPromise;

      const gameStartedA = waitForEvent<{
        board: (string | null)[];
        yourSymbol: string;
        opponentName: string;
        turn: string;
      }>(clientA, 'game_started');

      const gameStartedB = waitForEvent<{
        board: (string | null)[];
        yourSymbol: string;
        opponentName: string;
        turn: string;
      }>(clientB, 'game_started');

      clientB.emit('join_room', { roomCode, playerName: 'Bob' });

      const [dataA, dataB] = await Promise.all([gameStartedA, gameStartedB]);

      expect(dataA.yourSymbol).toBe('X');
      expect(dataA.opponentName).toBe('Bob');
      expect(dataA.board).toHaveLength(9);
      expect(dataA.turn).toBe('X');

      expect(dataB.yourSymbol).toBe('O');
      expect(dataB.opponentName).toBe('Alice');
    });

    it('emits error when joining a non-existent room', async () => {
      const errorPromise = waitForEvent<{ message: string }>(clientB, 'error');
      clientB.emit('join_room', { roomCode: 'ZZZZZZ', playerName: 'Bob' });
      const err = await errorPromise;
      expect(err.message).toBeTruthy();
    });

    it('emits error when a third player tries to join a full room', async () => {
      const createdPromise = waitForEvent<{ roomCode: string }>(clientA, 'room_created');
      clientA.emit('create_room', { playerName: 'Alice' });
      const { roomCode } = await createdPromise;

      // clientB joins (room now full)
      const gameStartedA = waitForEvent(clientA, 'game_started');
      const gameStartedB = waitForEvent(clientB, 'game_started');
      clientB.emit('join_room', { roomCode, playerName: 'Bob' });
      await Promise.all([gameStartedA, gameStartedB]);

      // clientC tries to join
      const clientC = await connectClient(port);
      try {
        const errorPromise = waitForEvent<{ message: string }>(clientC, 'error');
        clientC.emit('join_room', { roomCode, playerName: 'Charlie' });
        const err = await errorPromise;
        expect(err.message).toBeTruthy();
      } finally {
        clientC.disconnect();
      }
    });
  });

  // ─── Full game flow ──────────────────────────────────────────────────────────

  describe('Full game flow', () => {
    let roomCode: string;

    beforeEach(async () => {
      const createdPromise = waitForEvent<{ roomCode: string }>(clientA, 'room_created');
      clientA.emit('create_room', { playerName: 'Alice' });
      const created = await createdPromise;
      roomCode = created.roomCode;

      const startedA = waitForEvent(clientA, 'game_started');
      const startedB = waitForEvent(clientB, 'game_started');
      clientB.emit('join_room', { roomCode, playerName: 'Bob' });
      await Promise.all([startedA, startedB]);
    });

    it('both players receive move_made after a valid move', async () => {
      const moveA = waitForEvent<{
        board: (string | null)[];
        position: number;
        symbol: string;
        nextTurn: string;
        gameState: string;
      }>(clientA, 'move_made');
      const moveB = waitForEvent<{
        board: (string | null)[];
        position: number;
        symbol: string;
        nextTurn: string;
        gameState: string;
      }>(clientB, 'move_made');

      clientA.emit('make_move', { position: 4 }); // X goes center

      const [dataA, dataB] = await Promise.all([moveA, moveB]);

      expect(dataA.board[4]).toBe('X');
      expect(dataA.symbol).toBe('X');
      expect(dataA.nextTurn).toBe('O');
      expect(dataA.gameState).toBe('playing');
      expect(dataB.board).toEqual(dataA.board);
    });

    it('rejects invalid move — cell already taken — with error event', async () => {
      // X plays position 0
      const move1A = waitForEvent(clientA, 'move_made');
      const move1B = waitForEvent(clientB, 'move_made');
      clientA.emit('make_move', { position: 0 });
      await Promise.all([move1A, move1B]);

      // O plays position 1
      const move2A = waitForEvent(clientA, 'move_made');
      const move2B = waitForEvent(clientB, 'move_made');
      clientB.emit('make_move', { position: 1 });
      await Promise.all([move2A, move2B]);

      // X tries to play position 0 again (already taken)
      const errorPromise = waitForEvent<{ message: string }>(clientA, 'error');
      clientA.emit('make_move', { position: 0 });
      const err = await errorPromise;
      expect(err.message).toBeTruthy();
    });

    it('rejects move when it is not the player\'s turn', async () => {
      // clientB (O) tries to move first
      const errorPromise = waitForEvent<{ message: string }>(clientB, 'error');
      clientB.emit('make_move', { position: 0 });
      const err = await errorPromise;
      expect(err.message).toBeTruthy();
    });

    it('X wins: game_state becomes won with winner field in move_made', async () => {
      // X wins via [0,1,2]
      // X:0, O:3, X:1, O:4, X:2
      const moves: Array<[Socket, number]> = [
        [clientA, 0], [clientB, 3],
        [clientA, 1], [clientB, 4],
        [clientA, 2], // winning move
      ];

      let lastMoveData: Record<string, unknown> = {};
      for (const [client, position] of moves) {
        const moveA = waitForEvent<Record<string, unknown>>(clientA, 'move_made');
        const moveB = waitForEvent<Record<string, unknown>>(clientB, 'move_made');
        client.emit('make_move', { position });
        const [dataA] = await Promise.all([moveA, moveB]);
        lastMoveData = dataA;
      }

      expect(lastMoveData.gameState).toBe('won');
      expect(lastMoveData.winner).toBe('X');
    });

    it('draw: game_state becomes draw when board is full with no winner', async () => {
      // X O X
      // X X O
      // O X O  → no winner
      const sequence: Array<[Socket, number]> = [
        [clientA, 0], [clientB, 1], [clientA, 2],
        [clientB, 5], [clientA, 3], [clientB, 6],
        [clientA, 4], [clientB, 8], [clientA, 7],
      ];

      let lastData: Record<string, unknown> = {};
      for (const [client, position] of sequence) {
        const moveA = waitForEvent<Record<string, unknown>>(clientA, 'move_made');
        const moveB = waitForEvent<Record<string, unknown>>(clientB, 'move_made');
        client.emit('make_move', { position });
        const [dataA] = await Promise.all([moveA, moveB]);
        lastData = dataA;
      }

      expect(lastData.gameState).toBe('draw');
    });
  });

  // ─── Disconnect handling ─────────────────────────────────────────────────────

  describe('Disconnect handling', () => {
    it('remaining player receives player_disconnected when opponent disconnects mid-game', async () => {
      const createdPromise = waitForEvent<{ roomCode: string }>(clientA, 'room_created');
      clientA.emit('create_room', { playerName: 'Alice' });
      const { roomCode } = await createdPromise;

      const startedA = waitForEvent(clientA, 'game_started');
      const startedB = waitForEvent(clientB, 'game_started');
      clientB.emit('join_room', { roomCode, playerName: 'Bob' });
      await Promise.all([startedA, startedB]);

      const disconnectPromise = waitForEvent<{ message: string }>(clientA, 'player_disconnected');
      clientB.disconnect();
      const data = await disconnectPromise;
      expect(data.message).toBeTruthy();
    });
  });

  // ─── Rematch flow ────────────────────────────────────────────────────────────

  describe('Rematch flow', () => {
    let roomCode: string;

    const setupAndWinGame = async () => {
      const createdPromise = waitForEvent<{ roomCode: string }>(clientA, 'room_created');
      clientA.emit('create_room', { playerName: 'Alice' });
      const created = await createdPromise;
      roomCode = created.roomCode;

      const startedA = waitForEvent(clientA, 'game_started');
      const startedB = waitForEvent(clientB, 'game_started');
      clientB.emit('join_room', { roomCode, playerName: 'Bob' });
      await Promise.all([startedA, startedB]);

      // X wins via [0,1,2]
      const seq: Array<[Socket, number]> = [
        [clientA, 0], [clientB, 3],
        [clientA, 1], [clientB, 4],
        [clientA, 2],
      ];
      for (const [client, position] of seq) {
        const mA = waitForEvent(clientA, 'move_made');
        const mB = waitForEvent(clientB, 'move_made');
        client.emit('make_move', { position });
        await Promise.all([mA, mB]);
      }
    };

    it('opponent receives rematch_requested after request', async () => {
      await setupAndWinGame();

      const rematchNotifyB = waitForEvent<{ requesterName: string }>(clientB, 'rematch_requested');
      clientA.emit('rematch_request');
      const data = await rematchNotifyB;
      expect(data.requesterName).toBe('Alice');
    });

    it('both players receive game_started after rematch_accept with swapped symbols', async () => {
      await setupAndWinGame();

      // A requests
      const rematchNotify = waitForEvent(clientB, 'rematch_requested');
      clientA.emit('rematch_request');
      await rematchNotify;

      // B accepts
      const restartA = waitForEvent<{ yourSymbol: string; board: unknown[]; turn: string }>(clientA, 'game_started');
      const restartB = waitForEvent<{ yourSymbol: string; board: unknown[]; turn: string }>(clientB, 'game_started');
      clientB.emit('rematch_accept');

      const [dataA, dataB] = await Promise.all([restartA, restartB]);

      // Symbols should be swapped from original (A was X, now O; B was O, now X)
      expect(dataA.yourSymbol).toBe('O');
      expect(dataB.yourSymbol).toBe('X');
      expect(dataA.board).toHaveLength(9);
      expect(dataA.board.every((c) => c === null)).toBe(true);
      expect(dataA.turn).toBe('X');
    });
  });
});
