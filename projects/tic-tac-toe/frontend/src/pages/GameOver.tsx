import { useParams, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

export default function GameOver() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const {
    winner,
    yourSymbol,
    opponentName,
    errorMessage,
    gameStatus,
    requestRematch,
    acceptRematch,
    reset,
  } = useGame();

  // If game restarted (rematch accepted)
  if (gameStatus === "playing") {
    navigate(`/game/${code}`);
    return null;
  }

  let resultMessage = "";
  if (errorMessage && winner === null) {
    resultMessage = errorMessage;
  } else if (winner === "draw") {
    resultMessage = "It's a draw!";
  } else if (winner === yourSymbol) {
    resultMessage = "You win!";
  } else {
    resultMessage = `${opponentName} wins!`;
  }

  const isRematchPrompt =
    errorMessage.includes("wants a rematch") && gameStatus === "finished";

  const handleBackHome = () => {
    reset();
    navigate("/");
  };

  return (
    <div className="container">
      <h1 className="title">Game Over</h1>

      <div className="card">
        <p className="result-message">{resultMessage}</p>

        {isRematchPrompt ? (
          <>
            <p className="label">{errorMessage}</p>
            <div className="button-group">
              <button className="btn btn-primary" onClick={acceptRematch}>
                Accept Rematch
              </button>
              <button className="btn btn-ghost" onClick={handleBackHome}>
                Back to Home
              </button>
            </div>
          </>
        ) : (
          <div className="button-group">
            <button className="btn btn-primary" onClick={requestRematch}>
              Rematch
            </button>
            <button className="btn btn-ghost" onClick={handleBackHome}>
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
