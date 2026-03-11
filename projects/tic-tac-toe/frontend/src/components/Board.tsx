import Cell from "./Cell";

type CellValue = "X" | "O" | null;
type GameStatus = "idle" | "waiting" | "playing" | "finished";

interface BoardProps {
  board: CellValue[];
  onCellClick: (index: number) => void;
  isMyTurn: boolean;
  gameStatus: GameStatus;
}

export default function Board({ board, onCellClick, isMyTurn, gameStatus }: BoardProps) {
  const disabled = !isMyTurn || gameStatus !== "playing";

  return (
    <div className="board">
      {board.map((cell, i) => (
        <Cell key={i} value={cell} index={i} onClick={onCellClick} disabled={disabled} />
      ))}
    </div>
  );
}
