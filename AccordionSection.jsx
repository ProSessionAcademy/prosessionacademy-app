import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AccordionSection({ sections }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleSection = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <Card
          key={index}
          className={`border-2 transition-all duration-300 overflow-hidden ${
            expandedIndex === index
              ? 'border-blue-500 shadow-lg'
              : 'border-slate-200 hover:border-blue-300 shadow-md'
          }`}
        >
          <button
            onClick={() => toggleSection(index)}
            className="w-full p-6 flex items-center justify-between hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all"
          >
            <div className="flex items-center gap-4 flex-1 text-left">
              {section.icon && (
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  expandedIndex === index
                    ? 'bg-gradient-to-br from-blue-600 to-purple-600'
                    : 'bg-gradient-to-br from-slate-100 to-slate-200'
                }`}>
                  <span className={`text-2xl ${expandedIndex === index ? '' : 'grayscale'}`}>
                    {section.icon}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h3 className={`font-bold text-lg transition-colors ${
                  expandedIndex === index ? 'text-blue-600' : 'text-slate-900'
                }`}>
                  {section.title}
                </h3>
                {section.subtitle && (
                  <p className="text-sm text-slate-600 mt-1">{section.subtitle}</p>
                )}
              </div>
            </div>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              expandedIndex === index
                ? 'bg-blue-600 rotate-180'
                : 'bg-slate-200'
            }`}>
              {expandedIndex === index ? (
                <Minus className="w-5 h-5 text-white" />
              ) : (
                <Plus className="w-5 h-5 text-slate-600" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {expandedIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <CardContent className="p-6 pt-0 bg-gradient-to-br from-blue-50 to-purple-50 border-t-2 border-blue-200">
                  <div className="prose prose-sm max-w-none">
                    {section.image && (
                      <img
                        src={section.image}
                        alt={section.title}
                        className="w-full h-48 object-cover rounded-lg mb-4 shadow-md"
                      />
                    )}
                    <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </p>
                    
                    {section.keyPoints && (
                      <div className="mt-4 space-y-2">
                        <p className="font-semibold text-slate-900">Key Points:</p>
                        <ul className="space-y-2">
                          {section.keyPoints.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span className="text-slate-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.video && (
                      <div className="mt-4 rounded-lg overflow-hidden shadow-lg">
                        <iframe
                          src={section.video}
                          className="w-full h-64"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {section.quiz && (
                      <div className="mt-4 bg-white p-4 rounded-lg border-2 border-purple-300">
                        <p className="font-semibold text-purple-900 mb-2">Quick Check:</p>
                        <p className="text-slate-700 mb-3">{section.quiz.question}</p>
                        <div className="space-y-2">
                          {section.quiz.options.map((option, idx) => (
                            <button
                              key={idx}
                              className="w-full text-left p-3 rounded-lg border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all"
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      ))}
    </div>
  );
}

export default AccordionSection;