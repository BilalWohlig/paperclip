import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./context/GameContext";
import Home from "./pages/Home";
import WaitingRoom from "./pages/WaitingRoom";
import Game from "./pages/Game";
import GameOver from "./pages/GameOver";

export default function App() {
  return (
    <BrowserRouter>
      <GameProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/waiting/:code" element={<WaitingRoom />} />
          <Route path="/game/:code" element={<Game />} />
          <Route path="/gameover/:code" element={<GameOver />} />
        </Routes>
      </GameProvider>
    </BrowserRouter>
  );
}
