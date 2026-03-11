import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { CellValue, Room, Symbol } from './interfaces/game.interfaces';

@Injectable()
export class RoomService {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<string, string>();

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    do {
      code = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  private createBoard(): CellValue[] {
    return Array(9).fill(null);
  }

  createRoom(playerName: string, socketId: string): Room {
    const code = this.generateRoomCode();
    const room: Room = {
      code,
      players: [
        { socketId, name: playerName, symbol: 'X', rematchReady: false },
      ],
      board: this.createBoard(),
      turn: 'X',
      status: 'waiting',
      winner: null,
    };
    this.rooms.set(code, room);
    this.socketToRoom.set(socketId, code);
    return room;
  }

  joinRoom(roomCode: string, playerName: string, socketId: string): Room {
    const room = this.rooms.get(roomCode);
    if (!room) {
      throw new WsException('Room not found');
    }
    if (room.players.length >= 2) {
      throw new WsException('Room is full');
    }
    if (room.status !== 'waiting') {
      throw new WsException('Game already in progress');
    }
    room.players.push({
      socketId,
      name: playerName,
      symbol: 'O',
      rematchReady: false,
    });
    room.status = 'playing';
    this.socketToRoom.set(socketId, roomCode);
    return room;
  }

  findRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  findRoomBySocket(socketId: string): Room | undefined {
    const code = this.socketToRoom.get(socketId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  removePlayer(socketId: string): { room: Room | undefined; wasInRoom: boolean } {
    const code = this.socketToRoom.get(socketId);
    if (!code) return { room: undefined, wasInRoom: false };

    const room = this.rooms.get(code);
    this.socketToRoom.delete(socketId);

    if (!room) return { room: undefined, wasInRoom: true };

    room.players = room.players.filter((p) => p.socketId !== socketId);

    if (room.players.length === 0) {
      this.rooms.delete(code);
      return { room: undefined, wasInRoom: true };
    }

    room.status = 'finished';
    return { room, wasInRoom: true };
  }

  makeMove(
    roomCode: string,
    socketId: string,
    position: number,
  ): Room {
    const room = this.rooms.get(roomCode);
    if (!room) throw new WsException('Room not found');

    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) throw new WsException('You are not in this room');

    if (room.status !== 'playing') throw new WsException('Game is not in progress');
    if (player.symbol !== room.turn) throw new WsException('Not your turn');
    if (room.board[position] !== null) throw new WsException('Cell already taken');

    room.board[position] = player.symbol;

    const winner = this.checkWinner(room.board);
    if (winner) {
      room.status = 'finished';
      room.winner = winner;
    } else if (this.checkDraw(room.board)) {
      room.status = 'finished';
      room.winner = 'draw';
    } else {
      room.turn = room.turn === 'X' ? 'O' : 'X';
    }

    return room;
  }

  private checkWinner(board: CellValue[]): Symbol | null {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as Symbol;
      }
    }
    return null;
  }

  private checkDraw(board: CellValue[]): boolean {
    return board.every((cell) => cell !== null);
  }

  requestRematch(socketId: string): { room: Room; requesterName: string } {
    const room = this.findRoomBySocket(socketId);
    if (!room) throw new WsException('Room not found');
    if (room.status !== 'finished') throw new WsException('Game is not finished');

    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) throw new WsException('Player not found');

    player.rematchReady = true;
    return { room, requesterName: player.name };
  }

  acceptRematch(socketId: string): Room {
    const room = this.findRoomBySocket(socketId);
    if (!room) throw new WsException('Room not found');
    if (room.status !== 'finished') throw new WsException('Game is not finished');

    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) throw new WsException('Player not found');

    // Swap symbols
    room.players.forEach((p) => {
      p.symbol = p.symbol === 'X' ? 'O' : 'X';
      p.rematchReady = false;
    });

    // Reset board
    room.board = this.createBoard();
    room.turn = 'X';
    room.status = 'playing';
    room.winner = null;

    return room;
  }
}
