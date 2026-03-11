import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../context/GameContext";

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const navigate = useNavigate();
  const { gameStatus, roomCode: createdCode, errorMessage, createRoom, joinRoom, clearError } = useGame();

  useEffect(() => {
    if (gameStatus === "waiting" && createdCode) {
      navigate(`/waiting/${createdCode}`);
    } else if (gameStatus === "playing" && createdCode) {
      navigate(`/game/${createdCode}`);
    }
  }, [gameStatus, createdCode, navigate]);

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    clearError();
    createRoom(name.trim());
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomCode.trim()) return;
    clearError();
    joinRoom(roomCode.trim().toUpperCase(), name.trim());
  };

  return (
    <div className="container">
      <h1 className="title">Tic-Tac-Toe</h1>
      <p className="subtitle">Real-time 2-player game</p>

      <div className="card">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            autoFocus
          />
        </div>

        {!mode && (
          <div className="button-group">
            <button className="btn btn-primary" onClick={() => setMode("create")} disabled={!name.trim()}>
              Create Room
            </button>
            <button className="btn btn-secondary" onClick={() => setMode("join")} disabled={!name.trim()}>
              Join Room
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate}>
            <div className="button-group">
              <button type="submit" className="btn btn-primary">
                Start Game
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode(null)}>
                Back
              </button>
            </div>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin}>
            <div className="field">
              <label htmlFor="code">Room code</label>
              <input
                id="code"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-char code"
                maxLength={6}
              />
            </div>
            <div className="button-group">
              <button type="submit" className="btn btn-primary" disabled={roomCode.trim().length < 4}>
                Join
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setMode(null)}>
                Back
              </button>
            </div>
          </form>
        )}

        {errorMessage && <p className="error">{errorMessage}</p>}
      </div>
    </div>
  );
}
