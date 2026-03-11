import { Injectable } from '@nestjs/common';
import { CellValue, Room, Symbol } from './interfaces/game.interfaces';

@Injectable()
export class GameService {
  private readonly WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  validateMove(
    room: Room,
    socketId: string,
    position: number,
  ): { valid: boolean; error?: string } {
    if (room.status !== 'playing') {
      return { valid: false, error: 'Game is not in progress' };
    }
    const player = room.players.find((p) => p.socketId === socketId);
    if (!player) {
      return { valid: false, error: 'You are not in this room' };
    }
    if (player.symbol !== room.turn) {
      return { valid: false, error: 'Not your turn' };
    }
    if (room.board[position] !== null) {
      return { valid: false, error: 'Cell already taken' };
    }
    return { valid: true };
  }

  applyMove(board: CellValue[], position: number, symbol: Symbol): CellValue[] {
    const newBoard = [...board];
    newBoard[position] = symbol;
    return newBoard;
  }

  checkWinner(board: CellValue[]): Symbol | null {
    for (const [a, b, c] of this.WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as Symbol;
      }
    }
    return null;
  }

  checkDraw(board: CellValue[]): boolean {
    return board.every((cell) => cell !== null);
  }

  getNextTurn(current: Symbol): Symbol {
    return current === 'X' ? 'O' : 'X';
  }

  resetBoard(): CellValue[] {
    return Array(9).fill(null);
  }
}
