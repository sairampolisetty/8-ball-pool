import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PoolGame from "./components/PoolGame";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PoolGame />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;