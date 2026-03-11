import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";
import Board from "../components/Board";
import StatusBar from "../components/StatusBar";

export default function Game() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    board,
    yourSymbol,
    turn,
    gameStatus,
    winner,
    opponentName,
    errorMessage,
    makeMove,
  } = useGame();

  useEffect(() => {
    if (gameStatus === "finished") {
      navigate(`/gameover/${code}`);
    }
    if (gameStatus === "idle") {
      navigate("/");
    }
  }, [gameStatus, code, navigate]);

  const isMyTurn = yourSymbol !== null && turn === yourSymbol;

  return (
    <div className="container">
      <h1 className="title">Tic-Tac-Toe</h1>

      <div className="game-info">
        <span>
          You: <strong>{yourSymbol}</strong>
        </span>
        <span>
          Opponent: <strong>{opponentName}</strong>
        </span>
      </div>

      <StatusBar
        isMyTurn={isMyTurn}
        yourSymbol={yourSymbol}
        opponentName={opponentName}
        winner={winner}
        errorMessage={errorMessage}
      />

      <Board board={board} onCellClick={makeMove} isMyTurn={isMyTurn} gameStatus={gameStatus} />
    </div>
  );
}
