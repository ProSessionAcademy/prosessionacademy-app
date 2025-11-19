import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Lightbulb } from "lucide-react";

export function CrosswordPuzzle({ puzzle }) {
  const [grid, setGrid] = useState(
    puzzle.grid.map(row => row.map(cell => ({ ...cell, userInput: '' })))
  );
  const [selectedClue, setSelectedClue] = useState(null);
  const [showHints, setShowHints] = useState(false);

  const handleCellInput = (rowIdx, colIdx, value) => {
    const newGrid = [...grid];
    newGrid[rowIdx][colIdx].userInput = value.toUpperCase();
    setGrid(newGrid);
  };

  const checkAnswers = () => {
    let correct = 0;
    let total = 0;
    
    const newGrid = grid.map(row => 
      row.map(cell => {
        if (cell.letter) {
          total++;
          const isCorrect = cell.userInput === cell.letter;
          if (isCorrect) correct++;
          return { ...cell, isChecked: true, isCorrect };
        }
        return cell;
      })
    );
    
    setGrid(newGrid);
    alert(`You got ${correct} out of ${total} correct! (${Math.round((correct/total)*100)}%)`);
  };

  const getCellClass = (cell) => {
    if (!cell.letter) return 'bg-slate-800';
    if (cell.isChecked) {
      return cell.isCorrect ? 'bg-green-100 border-green-500' : 'bg-red-100 border-red-500';
    }
    return 'bg-white border-slate-300';
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🧩 Interactive Crossword Puzzle
          <Button size="sm" variant="outline" onClick={() => setShowHints(!showHints)}>
            <Lightbulb className="w-4 h-4 mr-1" />
            {showHints ? 'Hide' : 'Show'} Hints
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Crossword Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {grid.map((row, rowIdx) => (
              <div key={rowIdx} className="flex">
                {row.map((cell, colIdx) => (
                  <div key={colIdx} className="relative">
                    {cell.letter ? (
                      <div className={`w-12 h-12 border-2 ${getCellClass(cell)} relative`}>
                        {cell.number && (
                          <span className="absolute top-0 left-1 text-[10px] font-bold text-slate-600">
                            {cell.number}
                          </span>
                        )}
                        <Input
                          maxLength={1}
                          value={cell.userInput}
                          onChange={(e) => handleCellInput(rowIdx, colIdx, e.target.value)}
                          className="w-full h-full text-center text-lg font-bold border-none p-0 uppercase bg-transparent"
                          disabled={cell.isChecked}
                        />
                        {cell.isChecked && (
                          <div className="absolute top-1 right-1">
                            {cell.isCorrect ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-slate-800"></div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Clues */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-lg mb-3 text-slate-900">📍 Across</h3>
            <div className="space-y-2">
              {puzzle.clues.across.map((clue, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border hover:border-purple-400 cursor-pointer">
                  <span className="font-bold text-purple-600">{clue.number}.</span> {clue.text}
                  {showHints && clue.hint && (
                    <p className="text-xs text-slate-500 mt-1 italic">💡 {clue.hint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg mb-3 text-slate-900">📍 Down</h3>
            <div className="space-y-2">
              {puzzle.clues.down.map((clue, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border hover:border-purple-400 cursor-pointer">
                  <span className="font-bold text-purple-600">{clue.number}.</span> {clue.text}
                  {showHints && clue.hint && (
                    <p className="text-xs text-slate-500 mt-1 italic">💡 {clue.hint}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button onClick={checkAnswers} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-lg py-6">
          ✅ Check Answers
        </Button>
      </CardContent>
    </Card>
  );
}

export default CrosswordPuzzle;