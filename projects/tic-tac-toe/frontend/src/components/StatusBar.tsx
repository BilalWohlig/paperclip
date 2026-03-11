type Symbol = "X" | "O";

interface StatusBarProps {
  isMyTurn: boolean;
  yourSymbol: Symbol | null;
  opponentName: string;
  winner: Symbol | "draw" | null;
  errorMessage: string;
}

export default function StatusBar({
  isMyTurn,
  opponentName,
  winner,
  errorMessage,
}: StatusBarProps) {
  if (errorMessage && !winner) {
    return <div className="status-bar status-error">{errorMessage}</div>;
  }

  if (winner) {
    return <div className="status-bar status-finished">{winner === "draw" ? "Draw!" : `${winner} wins!`}</div>;
  }

  return (
    <div className={`status-bar ${isMyTurn ? "status-your-turn" : "status-opponent-turn"}`}>
      {isMyTurn ? "Your turn" : `${opponentName}'s turn`}
    </div>
  );
}
