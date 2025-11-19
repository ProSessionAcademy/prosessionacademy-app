import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";

export function Timeline({ events, title }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-xl">
      <CardContent className="p-8">
        <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
          <Clock className="w-7 h-7 text-indigo-600" />
          {title || "Timeline"}
        </h3>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500"></div>

          {/* Events */}
          <div className="space-y-8">
            {events.map((event, index) => (
              <div key={index} className="relative pl-20">
                {/* Timeline Dot */}
                <div
                  className={`absolute left-4 w-9 h-9 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all transform hover:scale-110 ${
                    selectedEvent === index
                      ? 'bg-gradient-to-br from-indigo-600 to-purple-600 ring-4 ring-indigo-200'
                      : 'bg-gradient-to-br from-indigo-400 to-purple-400'
                  }`}
                  onClick={() => setSelectedEvent(selectedEvent === index ? null : index)}
                >
                  <span className="text-white font-bold text-sm">{index + 1}</span>
                </div>

                {/* Event Card */}
                <div
                  className={`bg-white p-6 rounded-xl shadow-lg border-2 transition-all cursor-pointer ${
                    selectedEvent === index
                      ? 'border-indigo-500 scale-105'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                  onClick={() => setSelectedEvent(selectedEvent === index ? null : index)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge className="bg-indigo-100 text-indigo-700 mb-2">
                        {event.date || event.year}
                      </Badge>
                      <h4 className="text-xl font-bold text-slate-900">{event.title}</h4>
                    </div>
                    {event.icon && (
                      <div className="text-3xl">{event.icon}</div>
                    )}
                  </div>

                  <p className="text-slate-700 leading-relaxed mb-4">{event.description}</p>

                  {selectedEvent === index && event.details && (
                    <div className="mt-4 pt-4 border-t-2 border-indigo-100">
                      {event.image && (
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-48 object-cover rounded-lg mb-4 shadow-md"
                        />
                      )}
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {event.details}
                      </p>
                      {event.impact && (
                        <div className="mt-4 bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                          <p className="text-xs font-semibold text-indigo-900 mb-1">Impact:</p>
                          <p className="text-sm text-indigo-800">{event.impact}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {event.keyPoints && (
                    <div className="mt-4 space-y-2">
                      {event.keyPoints.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-indigo-600">•</span>
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-6 text-center flex items-center justify-center gap-2">
          <Calendar className="w-4 h-4" />
          Click on events to see more details
        </p>
      </CardContent>
    </Card>
  );
}

export default Timeline;