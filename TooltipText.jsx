import React, { useState } from "react";
import { HelpCircle, Info } from "lucide-react";

export function TooltipText({ text, tooltips }) {
  const [activeTooltip, setActiveTooltip] = useState(null);

  const renderTextWithTooltips = () => {
    let processedText = text;
    const elements = [];
    let lastIndex = 0;

    tooltips.forEach((tooltip, idx) => {
      const startIndex = processedText.indexOf(tooltip.term, lastIndex);
      if (startIndex !== -1) {
        // Add text before tooltip
        if (startIndex > lastIndex) {
          elements.push(
            <span key={`text-${idx}`}>{processedText.slice(lastIndex, startIndex)}</span>
          );
        }

        // Add tooltip term
        elements.push(
          <span key={`tooltip-${idx}`} className="relative inline-block">
            <button
              onClick={() => setActiveTooltip(activeTooltip === idx ? null : idx)}
              className="relative inline-flex items-baseline gap-1 text-blue-600 font-semibold hover:text-blue-800 transition-all border-b-2 border-blue-300 hover:border-blue-600"
            >
              {tooltip.term}
              <HelpCircle className="w-3 h-3 mb-0.5" />
            </button>
            {activeTooltip === idx && (
              <div className="absolute z-50 left-0 top-full mt-2 w-80 max-w-[90vw] bg-white border-2 border-blue-300 rounded-lg shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Info className="w-5 h-5 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-slate-900">{tooltip.term}</h4>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">{tooltip.definition}</p>
                {tooltip.example && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Example:</p>
                    <p className="text-sm text-blue-800 italic">{tooltip.example}</p>
                  </div>
                )}
                {tooltip.image && (
                  <img src={tooltip.image} alt={tooltip.term} className="w-full h-32 object-cover rounded-lg mt-3" />
                )}
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="absolute top-2 right-2 w-6 h-6 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            )}
          </span>
        );

        lastIndex = startIndex + tooltip.term.length;
      }
    });

    // Add remaining text
    if (lastIndex < processedText.length) {
      elements.push(
        <span key="text-end">{processedText.slice(lastIndex)}</span>
      );
    }

    return elements;
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-xl border-2 border-slate-200 shadow-lg">
      <p className="text-lg text-slate-800 leading-relaxed">
        {renderTextWithTooltips()}
      </p>
      <p className="text-xs text-slate-500 mt-4 flex items-center gap-2">
        <HelpCircle className="w-4 h-4" />
        Click on highlighted terms to learn more
      </p>
    </div>
  );
}

export default TooltipText;