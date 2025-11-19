
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { 
  Mic, 
  Loader2, 
  FileText, 
  List, 
  Sparkles,
  X,
  Volume2,
  Square,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VoiceSummarizer({ isOpen, onClose }) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const isRecordingRef = useRef(false); // Added for persistent tracking of recording state
  const accumulatedTranscriptRef = useRef(''); // Added to accumulate transcript reliably

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());

      accumulatedTranscriptRef.current = ''; // Reset accumulated transcript
      setTranscript('');
      setSummary(null);
      setShowOptions(false);
      setRecordingTime(0);
      setIsRecording(true);
      isRecordingRef.current = true; // Set recording status to true

      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              const newText = event.results[i][0].transcript;
              accumulatedTranscriptRef.current += newText + ' '; // Accumulate transcript
              setTranscript(accumulatedTranscriptRef.current.trim()); // Update UI state
            }
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Recognition error:', event.error);
          if (event.error === 'not-allowed') {
            alert('❌ Microphone access denied!');
            setIsRecording(false);
            isRecordingRef.current = false; // Reset recording status
          }
        };

        recognitionRef.current.onend = () => {
          console.log('Recognition ended');
          // Restart recognition if we're still actively recording to handle browser's auto-stop
          if (isRecordingRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error('Restart error:', e);
            }
          }
        };

        recognitionRef.current.start();

        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        alert('❌ Speech recognition not supported in your browser');
      }
    } catch (error) {
      alert('❌ Microphone access denied!');
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false; // Explicitly set recording status to false
    setIsRecording(false); // Update UI state

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const finalText = accumulatedTranscriptRef.current.trim();
    setTranscript(finalText); // Ensure transcript state reflects final accumulated text
    
    if (finalText) {
      setShowOptions(true);
    } else {
      alert('⚠️ No speech detected! Please try again and speak clearly.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateSummary = async (type) => {
    if (!transcript.trim()) {
      alert('⚠️ No transcript available!');
      return;
    }

    setLoading(true);
    setShowOptions(false);

    try {
      let prompt = '';
      let responseSchema = {};

      if (type === 'general') {
        prompt = `IMPORTANT: Only summarize the exact content below. DO NOT add any information that wasn't mentioned. DO NOT elaborate or expand.

Transcribed audio:
${transcript}

Provide a brief summary of ONLY what was said, nothing more.`;
        responseSchema = {
          type: 'object',
          properties: {
            summary: { type: 'string' }
          }
        };
      } else if (type === 'bullets') {
        prompt = `IMPORTANT: Only summarize the exact content below. DO NOT add information that wasn't mentioned.

Transcribed audio:
${transcript}

Create bullet points of ONLY what was actually said.`;
        responseSchema = {
          type: 'object',
          properties: {
            bullets: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        };
      } else if (type === 'complete') {
        prompt = `IMPORTANT: Only analyze the exact content below. DO NOT add information that wasn't mentioned.

Transcribed audio:
${transcript}

Provide:
1. Brief summary of what was said
2. Key points from the audio
3. Important highlights if any
4. Simple mind map structure
5. Action items if mentioned

Only use information from the transcript above.`;
        responseSchema = {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            key_points: { type: 'array', items: { type: 'string' } },
            important_highlights: { type: 'array', items: { type: 'string' } },
            mind_map: {
              type: 'object',
              properties: {
                main_topic: { type: 'string' },
                subtopics: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      points: { type: 'array', items: { type: 'string' } }
                    }
                  }
                }
              }
            },
            action_items: { type: 'array', items: { type: 'string' } }
          }
        };
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: responseSchema
      });

      setSummary({ type, data: result });
    } catch (error) {
      alert('❌ Failed to generate summary: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!summary) return;

    setDownloadingPDF(true);
    try {
      const response = await base44.functions.invoke('generateVoiceSummaryPDF', {
        transcript,
        summary: summary.data,
        summaryType: summary.type
      });

      if (response.data.success && response.data.pdfBase64) {
        const binary = atob(response.data.pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.data.filename || 'Voice-Summary.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        alert('✅ PDF Downloaded!');
      }
    } catch (error) {
      alert('❌ PDF download failed: ' + error.message);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const reset = () => {
    accumulatedTranscriptRef.current = ''; // Reset accumulated transcript on reset
    setTranscript('');
    setSummary(null);
    setShowOptions(false);
    setRecordingTime(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <Card className="border-none shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-red-600 to-pink-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Volume2 className="w-7 h-7" />
                </div>
                <div>
                  <CardTitle className="text-2xl">🎤 Voice Summarizer</CardTitle>
                  <p className="text-white/90 text-sm">Record audio and get AI summaries</p>
                </div>
              </div>
              <Button onClick={onClose} variant="ghost" className="text-white hover:bg-white/20" size="icon">
                <X className="w-6 h-6" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              {!isRecording && !transcript && !summary && (
                <div className="space-y-4">
                  <Button
                    onClick={startRecording}
                    size="lg"
                    className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white py-8 px-12 text-xl font-bold shadow-xl"
                  >
                    <Mic className="w-8 h-8 mr-3" />
                    Start Recording
                  </Button>
                  <p className="text-sm text-slate-600">Click to start recording your voice</p>
                </div>
              )}

              {isRecording && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-4xl font-bold text-red-600">{formatTime(recordingTime)}</span>
                  </div>
                  
                  <Button
                    onClick={stopRecording}
                    size="lg"
                    className="bg-slate-800 hover:bg-slate-900 text-white py-6 px-10 text-lg font-bold"
                  >
                    <Square className="w-6 h-6 mr-2 fill-current" />
                    Stop Recording
                  </Button>

                  <p className="text-sm text-slate-600">🎤 Recording... Keep speaking naturally with pauses</p>
                  
                  {transcript && (
                    <Card className="bg-green-50 border-2 border-green-300 mt-4">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Volume2 className="w-5 h-5 text-green-600" />
                          Transcript
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="max-h-40 overflow-y-auto">
                        <p className="text-sm text-slate-700 text-left leading-relaxed whitespace-pre-wrap">{transcript}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>

            <AnimatePresence>
              {showOptions && !loading && !summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <h3 className="text-xl font-bold text-center text-slate-900">Choose Summary Type</h3>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card
                      onClick={() => generateSummary('general')}
                      className="border-2 border-blue-300 hover:border-blue-500 cursor-pointer hover:shadow-xl transition-all"
                    >
                      <CardContent className="p-6 text-center">
                        <FileText className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                        <h4 className="font-bold text-lg mb-2">General Summary</h4>
                        <p className="text-sm text-slate-600">Concise paragraph summary</p>
                      </CardContent>
                    </Card>

                    <Card
                      onClick={() => generateSummary('bullets')}
                      className="border-2 border-green-300 hover:border-green-500 cursor-pointer hover:shadow-xl transition-all"
                    >
                      <CardContent className="p-6 text-center">
                        <List className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        <h4 className="font-bold text-lg mb-2">Bullet Points</h4>
                        <p className="text-sm text-slate-600">Short, scannable points</p>
                      </CardContent>
                    </Card>

                    <Card
                      onClick={() => generateSummary('complete')}
                      className="border-2 border-purple-300 hover:border-purple-500 cursor-pointer hover:shadow-xl transition-all"
                    >
                      <CardContent className="p-6 text-center">
                        <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                        <h4 className="font-bold text-lg mb-2">Complete Analysis</h4>
                        <p className="text-sm text-slate-600">Full breakdown with mind map</p>
                      </CardContent>
                    </Card>
                  </div>

                  <Button onClick={reset} variant="outline" className="w-full">
                    Record Again
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-lg text-slate-600">Generating summary...</p>
              </div>
            )}

            <AnimatePresence>
              {summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-900">Your Summary</h3>
                    <div className="flex gap-2">
                      <Badge className="bg-green-600 text-white">
                        {summary.type === 'general' ? 'General' : summary.type === 'bullets' ? 'Bullets' : 'Complete'}
                      </Badge>
                      <Button
                        onClick={downloadPDF}
                        disabled={downloadingPDF}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {downloadingPDF ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-1" />
                        )}
                        PDF
                      </Button>
                    </div>
                  </div>

                  {summary.type === 'general' && (
                    <Card className="bg-blue-50 border-2 border-blue-300">
                      <CardContent className="p-6">
                        <p className="text-slate-800 leading-relaxed">{summary.data.summary}</p>
                      </CardContent>
                    </Card>
                  )}

                  {summary.type === 'bullets' && (
                    <Card className="bg-green-50 border-2 border-green-300">
                      <CardContent className="p-6">
                        <ul className="space-y-2">
                          {summary.data.bullets?.map((bullet, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-green-600 font-bold">•</span>
                              <span className="text-slate-800">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {summary.type === 'complete' && (
                    <div className="space-y-4">
                      <Card className="bg-purple-50 border-2 border-purple-300">
                        <CardHeader>
                          <CardTitle className="text-lg">📝 Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-800 leading-relaxed">{summary.data.summary}</p>
                        </CardContent>
                      </Card>

                      <Card className="bg-blue-50 border-2 border-blue-300">
                        <CardHeader>
                          <CardTitle className="text-lg">🔑 Key Points</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {summary.data.key_points?.map((point, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="text-blue-600 font-bold">•</span>
                                <span className="text-slate-800">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      {summary.data.important_highlights?.length > 0 && (
                        <Card className="bg-yellow-50 border-2 border-yellow-400">
                          <CardHeader>
                            <CardTitle className="text-lg">⭐ Important Highlights</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {summary.data.important_highlights.map((highlight, idx) => (
                                <li key={idx} className="bg-yellow-200 p-3 rounded-lg font-semibold text-yellow-900">
                                  {highlight}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {summary.data.mind_map && (
                        <Card className="bg-pink-50 border-2 border-pink-300">
                          <CardHeader>
                            <CardTitle className="text-lg">🧠 Mind Map</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="bg-pink-200 p-4 rounded-xl text-center">
                                <p className="font-bold text-xl text-pink-900">{summary.data.mind_map.main_topic}</p>
                              </div>
                              <div className="grid md:grid-cols-2 gap-4">
                                {summary.data.mind_map.subtopics?.map((subtopic, idx) => (
                                  <Card key={idx} className="bg-white border-2 border-pink-200">
                                    <CardHeader className="pb-2">
                                      <CardTitle className="text-base text-pink-900">{subtopic.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <ul className="space-y-1">
                                        {subtopic.points?.map((point, pidx) => (
                                          <li key={pidx} className="text-sm text-slate-700 flex items-start gap-2">
                                            <span className="text-pink-600">→</span>
                                            <span>{point}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {summary.data.action_items?.length > 0 && (
                        <Card className="bg-green-50 border-2 border-green-400">
                          <CardHeader>
                            <CardTitle className="text-lg">✅ Action Items</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {summary.data.action_items.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-green-100 p-3 rounded-lg">
                                  <span className="text-green-600 font-bold">{idx + 1}.</span>
                                  <span className="text-slate-800 font-medium">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button onClick={reset} variant="outline" className="flex-1">
                      Record New Audio
                    </Button>
                    <Button onClick={onClose} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600">
                      Close
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
