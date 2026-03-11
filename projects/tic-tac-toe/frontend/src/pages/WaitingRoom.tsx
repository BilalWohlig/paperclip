import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

export default function WaitingRoom() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { gameStatus, errorMessage } = useGame();

  useEffect(() => {
    if (gameStatus === "playing") {
      navigate(`/game/${code}`);
    }
    if (gameStatus === "idle") {
      // Disconnected or reset — go home
      navigate("/");
    }
  }, [gameStatus, code, navigate]);

  const copyCode = () => {
    navigator.clipboard.writeText(code ?? "").catch(() => {});
  };

  return (
    <div className="container">
      <h1 className="title">Waiting for opponent</h1>

      <div className="card">
        <p className="label">Share this room code:</p>
        <div className="room-code">{code}</div>
        <button className="btn btn-ghost copy-btn" onClick={copyCode}>
          Copy code
        </button>

        <div className="spinner-row">
          <div className="spinner" />
          <span>Waiting...</span>
        </div>

        {errorMessage && <p className="error">{errorMessage}</p>}
      </div>
    </div>
  );
}
