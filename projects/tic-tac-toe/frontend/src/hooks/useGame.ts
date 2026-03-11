import { useEffect, useReducer, useCallback } from "react";
import { socket } from "../socket";

type Symbol = "X" | "O";
type CellValue = Symbol | null;
type GameStatus = "idle" | "waiting" | "playing" | "finished";

interface GameState {
  board: CellValue[];
  yourSymbol: Symbol | null;
  turn: Symbol;
  gameStatus: GameStatus;
  winner: Symbol | "draw" | null;
  opponentName: string;
  roomCode: string;
  errorMessage: string;
  playerName: string;
}

type Action =
  | { type: "SET_PLAYER_NAME"; name: string }
  | { type: "ROOM_CREATED"; roomCode: string }
  | { type: "GAME_STARTED"; board: CellValue[]; yourSymbol: Symbol; opponentName: string; turn: Symbol }
  | { type: "MOVE_MADE"; board: CellValue[]; nextTurn: Symbol; gameState: "playing" | "won" | "draw"; winner?: Symbol }
  | { type: "PLAYER_DISCONNECTED"; message: string }
  | { type: "REMATCH_REQUESTED"; requesterName: string }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

const initialState: GameState = {
  board: Array(9).fill(null),
  yourSymbol: null,
  turn: "X",
  gameStatus: "idle",
  winner: null,
  opponentName: "",
  roomCode: "",
  errorMessage: "",
  playerName: "",
};

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SET_PLAYER_NAME":
      return { ...state, playerName: action.name };
    case "ROOM_CREATED":
      return { ...state, roomCode: action.roomCode, gameStatus: "waiting" };
    case "GAME_STARTED":
      return {
        ...state,
        board: action.board,
        yourSymbol: action.yourSymbol,
        opponentName: action.opponentName,
        turn: action.turn,
        gameStatus: "playing",
        winner: null,
        errorMessage: "",
      };
    case "MOVE_MADE": {
      const winner =
        action.gameState === "won"
          ? (action.winner ?? null)
          : action.gameState === "draw"
          ? "draw"
          : null;
      return {
        ...state,
        board: action.board,
        turn: action.nextTurn,
        gameStatus: action.gameState === "playing" ? "playing" : "finished",
        winner,
      };
    }
    case "PLAYER_DISCONNECTED":
      return { ...state, gameStatus: "finished", errorMessage: action.message };
    case "REMATCH_REQUESTED":
      return { ...state, errorMessage: `${action.requesterName} wants a rematch!` };
    case "ERROR":
      return { ...state, errorMessage: action.message };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    socket.connect();

    socket.on("room_created", ({ roomCode }: { roomCode: string }) => {
      dispatch({ type: "ROOM_CREATED", roomCode });
    });

    socket.on(
      "game_started",
      ({
        board,
        yourSymbol,
        opponentName,
        turn,
      }: {
        board: CellValue[];
        yourSymbol: Symbol;
        opponentName: string;
        turn: Symbol;
      }) => {
        dispatch({ type: "GAME_STARTED", board, yourSymbol, opponentName, turn });
      }
    );

    socket.on(
      "move_made",
      ({
        board,
        nextTurn,
        gameState,
        winner,
      }: {
        board: CellValue[];
        position: number;
        symbol: Symbol;
        nextTurn: Symbol;
        gameState: "playing" | "won" | "draw";
        winner?: Symbol;
      }) => {
        dispatch({ type: "MOVE_MADE", board, nextTurn, gameState, winner });
      }
    );

    socket.on("player_disconnected", ({ message }: { message: string }) => {
      dispatch({ type: "PLAYER_DISCONNECTED", message });
    });

    socket.on("rematch_requested", ({ requesterName }: { requesterName: string }) => {
      dispatch({ type: "REMATCH_REQUESTED", requesterName });
    });

    socket.on("error", ({ message }: { message: string }) => {
      dispatch({ type: "ERROR", message });
    });

    return () => {
      socket.off("room_created");
      socket.off("game_started");
      socket.off("move_made");
      socket.off("player_disconnected");
      socket.off("rematch_requested");
      socket.off("error");
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((playerName: string) => {
    dispatch({ type: "SET_PLAYER_NAME", name: playerName });
    socket.emit("create_room", { playerName });
  }, []);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    dispatch({ type: "SET_PLAYER_NAME", name: playerName });
    socket.emit("join_room", { roomCode, playerName });
  }, []);

  const makeMove = useCallback((position: number) => {
    socket.emit("make_move", { position });
  }, []);

  const requestRematch = useCallback(() => {
    socket.emit("rematch_request");
  }, []);

  const acceptRematch = useCallback(() => {
    socket.emit("rematch_accept");
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "ERROR", message: "" });
  }, []);

  return {
    ...state,
    createRoom,
    joinRoom,
    makeMove,
    requestRematch,
    acceptRematch,
    reset,
    clearError,
  };
}
