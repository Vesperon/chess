import React, { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import "./ChessGame.css";

const ChessGame = () => {
  const [game] = useState(new Chess());
  const [position, setPosition] = useState(game.fen());
  const [moveHistory, setMoveHistory] = useState([]); // Stores move pairs
  const [currentPlayer, setCurrentPlayer] = useState("w"); // 'w' for White, 'b' for Black
  const [historyStack, setHistoryStack] = useState([game.fen()]); // Initialize with starting position
  const [redoStack, setRedoStack] = useState([]); // Stack for redo actions

  const onDrop = (sourceSquare, targetSquare) => {
    try {
      const isPromotion =
        game.get(sourceSquare).type === "p" &&
        (targetSquare[1] === "8" || targetSquare[1] === "1");

      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? "q" : undefined,
      });

      if (move === null) return false; // Invalid move

      // Update position, move history, and current player
      const newFEN = game.fen();
      setPosition(newFEN);
      updateMoveHistory(move, sourceSquare); // Update move history with notation
      setCurrentPlayer(currentPlayer === "w" ? "b" : "w"); // Switch players
      saveGameState(newFEN); // Save the new FEN to the stack
      setRedoStack([]); // Clear redo stack on new move
      return true;
    } catch (error) {
      console.warn("Invalid move attempted.");
      return false;
    }
  };

  const updateMoveHistory = (move, sourceSquare) => {
    let notation = "";

    // Determine the piece type and create the basic move notation
    const pieceNotation = {
      p: "",   // Pawn moves don't get a notation
      r: "R",  // Rook
      n: "N",  // Knight
      b: "B",  // Bishop
      q: "Q",  // Queen
      k: "K",  // King
    };

    notation += pieceNotation[move.piece];

    // If it's a capture, add an "x" and specify the originating file if it's a pawn
    if (move.captured) {
      notation += (move.piece === 'p' ? sourceSquare[0] : '') + "x";
    }

    // Add the target square
    notation += move.to;

    // Check for promotion
    if (move.promotion) {
      notation += `=${move.promotion.toUpperCase()}`; // e.g., e8=Q
    }

    // Update the move history
    setMoveHistory((prevHistory) => {
      const lastMovePair = prevHistory[prevHistory.length - 1] || [];
      if (lastMovePair.length < 2) {
        // If the last move pair has only one move, add the current move
        return [...prevHistory.slice(0, -1), [...lastMovePair, notation]];
      } else {
        // Start a new move pair with the current move
        return [...prevHistory, [notation]];
      }
    });
  };

  const saveGameState = (fen) => {
    setHistoryStack((prevStack) => [...prevStack, fen]); // Save the FEN to the stack
  };

  const undoMove = () => {
    if (historyStack.length <= 1) return; // Do not undo the initial state

    // Pop the last state from the history stack
    const previousState = historyStack[historyStack.length - 2]; // Get the state before the last move
    game.load(previousState); // Load the previous state into the game
    setPosition(previousState); // Update the board position
    setHistoryStack((prevStack) => prevStack.slice(0, -1)); // Remove the last FEN from the history stack

    // Remove the last move from history
    setMoveHistory((prevHistory) => {
      const lastMovePair = prevHistory[prevHistory.length - 1] || [];
      const updatedPair = lastMovePair.slice(0, -1); // Remove last move from the pair
      if (updatedPair.length === 0) {
        return prevHistory.slice(0, -1); // Remove the pair if empty
      }
      return [...prevHistory.slice(0, -1), updatedPair]; // Return updated pair
    });

    // Add the previous state to redo stack
    setRedoStack((prevRedo) => [...prevRedo, historyStack[historyStack.length - 1]]);
    // Switch back to the previous player
    setCurrentPlayer(currentPlayer === "w" ? "b" : "w");
  };

  const redoMove = () => {
    if (redoStack.length === 0) return; // No moves to redo

    const redoState = redoStack[redoStack.length - 1]; // Get the last state to redo
    game.load(redoState); // Load the redo state into the game
    setPosition(redoState); // Update the board position

    // Save this redo state to the history stack
    setHistoryStack((prevStack) => [...prevStack, redoState]); // Add redo state to history
    setRedoStack((prevRedo) => prevRedo.slice(0, -1)); // Remove the last redo state

    // Get the last move made
    const lastMove = game.history().slice(-1)[0]; // Get the last move made after redoing
    if (lastMove) {
      // Create the move object for updating notation
      const move = {
        from: lastMove.from,
        to: lastMove.to,
        piece: lastMove.piece,
        captured: lastMove.captured,
        promotion: lastMove.promotion,
      };

      updateMoveHistory(move, lastMove.from); // Update the move history with the move notation
    }

    // Switch back to the current player
    setCurrentPlayer(currentPlayer === "w" ? "b" : "w");
  };

  // Handle keydown event for undo and redo
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowLeft") {
        undoMove();
      } else if (event.key === "ArrowRight") {
        redoMove();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [historyStack, redoStack]);

  return (
    <div className="chess-container">
      <div>
        <h2>React Chess Game</h2>
        <Chessboard position={position} onPieceDrop={onDrop} boardWidth={800} />
        {game.isGameOver() && <h3>Game Over</h3>}
        <h4>Current Player: {currentPlayer === "w" ? "White" : "Black"}</h4>
      </div>

      {/* Move Notation Panel */}
      <div className="notation-panel">
        <h3>Move Notation</h3>
        <ol>
          {moveHistory.map((movePair, index) => (
            <li key={index}>
              {movePair.join(", ")}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default ChessGame;
