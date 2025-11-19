import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export default function QuickQuiz({ question, options, correctAnswer, explanation }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleReset = () => {
    setSelectedAnswer(null);
    setSubmitted(false);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg">{question}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === correctAnswer;
            const showResult = submitted;

            return (
              <button
                key={idx}
                onClick={() => !submitted && setSelectedAnswer(idx)}
                disabled={submitted}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  showResult && isCorrect
                    ? 'border-green-500 bg-green-50'
                    : showResult && isSelected && !isCorrect
                    ? 'border-red-500 bg-red-50'
                    : isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option}</span>
                  {showResult && isCorrect && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                </div>
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
          >
            Submit Answer
          </Button>
        ) : (
          <div className="space-y-3">
            {explanation && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-700">{explanation}</p>
              </div>
            )}
            <Button onClick={handleReset} variant="outline" className="w-full">
              Try Another Question
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}