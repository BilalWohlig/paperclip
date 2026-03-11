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
  players: Player[];
  board: CellValue[];
  turn: Symbol;
  status: GameStatus;
  winner: Symbol | 'draw' | null;
}
