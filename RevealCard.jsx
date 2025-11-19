import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

export function RevealCard({ question, answer, hint, image }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  return (
    <Card className="border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-xl overflow-hidden">
      <CardContent className="p-8">
        {/* Question */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">?</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Think About It</h3>
          </div>
          <p className="text-lg text-slate-800 leading-relaxed">{question}</p>
        </div>

        {/* Hint Button */}
        {hint && !isRevealed && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="mb-4 flex items-center gap-2 text-sm text-yellow-700 hover:text-yellow-900 transition-all"
          >
            <Lightbulb className="w-4 h-4" />
            {showHint ? 'Hide' : 'Show'} Hint
          </button>
        )}

        {/* Hint */}
        {showHint && hint && !isRevealed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-r-lg mb-6"
          >
            <p className="text-sm text-yellow-900 italic">💡 {hint}</p>
          </motion.div>
        )}

        {/* Reveal Button */}
        <button
          onClick={() => setIsRevealed(!isRevealed)}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg ${
            isRevealed
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
          }`}
        >
          {isRevealed ? (
            <>
              <EyeOff className="w-5 h-5" />
              Hide Answer
            </>
          ) : (
            <>
              <Eye className="w-5 h-5" />
              Reveal Answer
            </>
          )}
        </button>

        {/* Answer */}
        {isRevealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-6 bg-white p-6 rounded-xl border-2 border-green-400 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xl">✓</span>
              </div>
              <h4 className="text-xl font-bold text-green-900">Answer</h4>
            </div>
            
            {image && (
              <img
                src={image}
                alt="Answer visualization"
                className="w-full h-48 object-cover rounded-lg mb-4 shadow-md"
              />
            )}
            
            <p className="text-lg text-slate-800 leading-relaxed whitespace-pre-wrap">
              {answer}
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

export default RevealCard;