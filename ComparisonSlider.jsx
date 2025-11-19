import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ArrowLeftRight } from "lucide-react";

export function ComparisonSlider({ leftImage, rightImage, title, leftLabel, rightLabel }) {
  const [position, setPosition] = useState(50);

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-purple-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative h-96 rounded-xl overflow-hidden shadow-2xl">
          {/* Left Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${leftImage})`,
              clipPath: `inset(0 ${100 - position}% 0 0)`
            }}
          />
          
          {/* Right Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${rightImage})`,
              clipPath: `inset(0 0 0 ${position}%)`
            }}
          />

          {/* Slider Line */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
            style={{ left: `${position}%` }}
          >
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-purple-600">
              <ArrowLeftRight className="w-6 h-6 text-purple-600" />
            </div>
          </div>

          {/* Labels */}
          <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-semibold">
            {leftLabel}
          </div>
          <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-semibold">
            {rightLabel}
          </div>
        </div>

        {/* Slider Control */}
        <div className="px-4">
          <Slider
            value={[position]}
            onValueChange={(val) => setPosition(val[0])}
            min={0}
            max={100}
            step={1}
            className="cursor-pointer"
          />
          <div className="flex justify-between mt-2 text-sm font-semibold">
            <span className="text-purple-600">{leftLabel}</span>
            <span className="text-pink-600">{rightLabel}</span>
          </div>
        </div>

        <p className="text-sm text-slate-600 text-center italic">
          Drag the slider to compare
        </p>
      </CardContent>
    </Card>
  );
}

export default ComparisonSlider;