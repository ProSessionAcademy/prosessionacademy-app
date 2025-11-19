import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

export default function FlipCard({ frontText, backText, frontImage, backImage }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className="perspective-1000 cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className={`relative w-full h-64 transition-transform duration-700 transform-style-3d ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front Side */}
        <Card 
          className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-500 to-purple-600 text-white p-6 flex flex-col items-center justify-center shadow-xl"
        >
          {frontImage && (
            <img src={frontImage} alt="Front" className="w-full h-32 object-cover rounded-lg mb-4" />
          )}
          <p className="text-xl font-bold text-center mb-4">{frontText}</p>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <RotateCcw className="w-4 h-4" />
            <span>Click to flip</span>
          </div>
        </Card>

        {/* Back Side */}
        <Card 
          className="absolute inset-0 backface-hidden bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6 flex flex-col items-center justify-center shadow-xl rotate-y-180"
        >
          {backImage && (
            <img src={backImage} alt="Back" className="w-full h-32 object-cover rounded-lg mb-4" />
          )}
          <p className="text-lg text-center">{backText}</p>
          <div className="flex items-center gap-2 text-sm opacity-80 mt-4">
            <RotateCcw className="w-4 h-4" />
            <span>Click to flip back</span>
          </div>
        </Card>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}