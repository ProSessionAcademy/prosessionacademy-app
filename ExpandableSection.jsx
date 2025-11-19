import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Minus } from "lucide-react";

export default function ExpandableSection({ title, content, image }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="border-2 border-slate-200 hover:border-blue-400 transition-all">
      <CardContent className="p-0">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-4">
            {image && (
              <img src={image} alt={title} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <h3 className="font-semibold text-slate-900 text-left">{title}</h3>
          </div>
          <div className={`w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}>
            {isExpanded ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          </div>
        </button>
        
        <div className={`overflow-hidden transition-all duration-300 ${
          isExpanded ? 'max-h-96' : 'max-h-0'
        }`}>
          <div className="p-4 pt-0 bg-slate-50">
            <p className="text-slate-700 leading-relaxed">{content}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}