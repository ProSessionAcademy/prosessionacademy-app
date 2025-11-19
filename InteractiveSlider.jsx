import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Activity } from "lucide-react";

export function InteractiveSlider({ data }) {
  const [value, setValue] = useState(data.defaultValue || 50);
  const [showInfo, setShowInfo] = useState(false);

  const getValueLabel = () => {
    if (data.labels) {
      const index = Math.floor((value / 100) * (data.labels.length - 1));
      return data.labels[index];
    }
    return `${value}${data.unit || ''}`;
  };

  const getValueColor = () => {
    if (value < 33) return 'from-red-500 to-orange-500';
    if (value < 66) return 'from-yellow-500 to-amber-500';
    return 'from-green-500 to-emerald-500';
  };

  const getValueDescription = () => {
    if (!data.descriptions) return null;
    if (value < 33) return data.descriptions.low;
    if (value < 66) return data.descriptions.medium;
    return data.descriptions.high;
  };

  return (
    <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            {data.title}
          </CardTitle>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-blue-100 rounded-full transition-all"
          >
            <Info className="w-5 h-5 text-blue-600" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showInfo && data.description && (
          <div className="bg-blue-100 border-l-4 border-blue-600 p-4 rounded-r-lg">
            <p className="text-sm text-blue-900">{data.description}</p>
          </div>
        )}

        {/* Value Display */}
        <div className="text-center">
          <div className={`inline-block bg-gradient-to-r ${getValueColor()} text-white px-8 py-4 rounded-2xl shadow-lg transform hover:scale-105 transition-all`}>
            <div className="text-5xl font-bold mb-1">{getValueLabel()}</div>
            {data.subtitle && (
              <div className="text-sm opacity-90">{data.subtitle}</div>
            )}
          </div>
        </div>

        {/* Slider */}
        <div className="px-4">
          <Slider
            value={[value]}
            onValueChange={(val) => setValue(val[0])}
            min={data.min || 0}
            max={data.max || 100}
            step={data.step || 1}
            className="cursor-pointer"
          />
          <div className="flex justify-between mt-2 text-sm text-slate-600 font-medium">
            <span>{data.min || 0}{data.unit || ''}</span>
            <span>{data.max || 100}{data.unit || ''}</span>
          </div>
        </div>

        {/* Description based on value */}
        {getValueDescription() && (
          <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
            <p className="text-slate-800 leading-relaxed">{getValueDescription()}</p>
          </div>
        )}

        {/* Visual representation */}
        {data.showVisual && (
          <div className="relative h-32 bg-gradient-to-r from-slate-100 to-slate-200 rounded-lg overflow-hidden">
            <div
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getValueColor()} transition-all duration-300 flex items-end justify-center pb-2`}
              style={{ height: `${value}%` }}
            >
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        )}

        {/* Milestones */}
        {data.milestones && (
          <div className="space-y-2">
            {data.milestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 transition-all ${
                  value >= milestone.value
                    ? 'bg-green-100 border-green-500'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{milestone.label}</span>
                  <Badge className={value >= milestone.value ? 'bg-green-600' : 'bg-slate-400'}>
                    {milestone.value}{data.unit || ''}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default InteractiveSlider;