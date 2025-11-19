import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Sparkles, TrendingUp, CheckCircle2, Loader2, LogIn, 
  Camera, Mic, StopCircle, AlertTriangle, Clock, MessageSquare 
} from 'lucide-react';

const SCENARIOS = [
  { id: 'presentation', title: '🎤 Presentation', desc: 'Present to a large audience' },
  { id: 'meeting', title: '💼 Meeting', desc: 'Lead a team meeting' },
  { id: 'pitch', title: '🚀 Pitch', desc: 'Pitch your idea' },
  { id: 'feedback', title: '💬 Feedback', desc: 'Give difficult feedback' },
  { id: 'negotiation', title: '🤝 Negotiation', desc: 'Negotiate a deal' }
];

export default function ConfidenceBootcamp({ onComplete }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [step, setStep] = useState('scenario_selection');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [customScenario, setCustomScenario] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [screenshots, setScreenshots] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  
  const videoRefMe = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);
  const screenshotIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const isRecordingRef = useRef(false);
  const transcriptPartsRef = useRef([]);

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        if (authenticated) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const cleanup = () => {
    isRecordingRef.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      
      if (videoRefMe.current) {
        videoRefMe.current.srcObject = stream;
        videoRefMe.current.muted = true;
        await videoRefMe.current.play();
      }
      
      mediaStreamRef.current = stream;
      setCameraReady(true);
    } catch (error) {
      alert('❌ Camera denied: ' + error.message);
    }
  };

  const captureScreenshot = async () => {
    if (!videoRefMe.current || !canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const video = videoRefMe.current;
    
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.jpg`, { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.8);
    });
  };

  const startRecording = async () => {
    if (!cameraReady || !mediaStreamRef.current) {
      alert('⚠️ Enable camera first!');
      return;
    }

    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingTime(0);
    setTranscript([]);
    setWordCount(0);
    setScreenshots([]);
    transcriptPartsRef.current = [];
    
    timerIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    screenshotIntervalRef.current = setInterval(async () => {
      const screenshot = await captureScreenshot();
      if (screenshot) setScreenshots(prev => [...prev, screenshot]);
    }, 3000);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('⚠️ Speech recognition not supported');
      setIsRecording(false);
      isRecordingRef.current = false;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalParts = [];

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        
        if (event.results[i].isFinal && text.trim()) {
          console.log('✅ CONFIDENCE SPEECH:', text);
          finalParts.push(text.trim());
          transcriptPartsRef.current = [...finalParts];
          setTranscript([...finalParts]);
          setWordCount(finalParts.join(' ').split(' ').filter(w => w).length);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('⚠️ Microphone permission denied!');
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {}
        }, 100);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      alert('⚠️ Failed to start');
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    const transcriptText = transcript.join(' ');
    
    if (!transcriptText || transcriptText.trim().length < 20 || wordCount < 10) {
      const retry = confirm('⚠️ TOO SHORT! Speak at least 10 words.\n\nClick OK to try again');
      if (retry) {
        setTranscript([]);
        setScreenshots([]);
        setWordCount(0);
        setRecordingTime(0);
        transcriptPartsRef.current = [];
      } else {
        reset();
      }
      return;
    }
    
    setAnalyzing(true);

    try {
      const screenshotUrls = [];
      for (const screenshot of screenshots.slice(0, 10)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: screenshot });
        screenshotUrls.push(file_url);
      }

      const scenarioText = selectedScenario?.title || customScenario || 'general confidence';

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze confidence bootcamp performance for scenario: "${scenarioText}"

TRANSCRIPT:
${transcriptText}

WORD COUNT: ${wordCount}
SCREENSHOTS: ${screenshotUrls.length}

Evaluate:
- Body language and posture
- Vocal confidence and clarity
- Eye contact and presence
- Overall confidence level
- Specific improvements needed

Provide detailed, actionable feedback.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            body_language_analysis: { type: "string" },
            confidence_assessment: { type: "string" },
            next_steps: { type: "string" }
          }
        },
        file_urls: screenshotUrls
      });

      setResult(analysis);
      setStep('feedback');
    } catch (error) {
      alert('❌ Failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    cleanup();
    setStep('scenario_selection');
    setSelectedScenario(null);
    setCustomScenario('');
    setIsRecording(false);
    setTranscript([]);
    setWordCount(0);
    setRecordingTime(0);
    setScreenshots([]);
    setAnalyzing(false);
    setResult(null);
    setCameraReady(false);
    transcriptPartsRef.current = [];
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-16 h-16 animate-spin" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button></div>;

  if (step === 'scenario_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <Button onClick={onComplete} variant="outline" className="mb-6 bg-white/10 text-white">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h1 className="text-5xl font-black text-white mb-8 text-center">💪 Confidence Bootcamp</h1>
          <p className="text-xl text-blue-200 mb-8 text-center">Choose your practice scenario</p>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {SCENARIOS.map((scenario) => (
              <Card 
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className={`cursor-pointer border-2 transition-all ${
                  selectedScenario?.id === scenario.id 
                    ? 'border-blue-500 bg-blue-50 scale-105' 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <CardContent className="p-6 text-center">
                  <h3 className="text-2xl font-bold mb-2">{scenario.title}</h3>
                  <p className="text-slate-600">{scenario.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-6">
              <Label>Or describe your own scenario:</Label>
              <Textarea 
                value={customScenario} 
                onChange={(e) => {
                  setCustomScenario(e.target.value);
                  setSelectedScenario(null);
                }}
                placeholder="e.g., Asking for a raise..."
                rows={3}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Button 
            onClick={() => { enableCamera(); setStep('practice'); }}
            disabled={!selectedScenario && !customScenario.trim()}
            className="w-full mt-6 bg-blue-600 py-8 text-2xl font-bold"
          >
            <Camera className="w-8 h-8 mr-3" />
            Start Practice
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'practice') {
    if (analyzing) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-24 h-24 animate-spin mx-auto mb-6 text-blue-600" />
              <h3 className="text-3xl font-bold mb-2">AI Analyzing...</h3>
              <p className="text-slate-600">Processing {screenshots.length} screenshots & {wordCount} words</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (result) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4" />
                <div className="text-7xl font-black mb-2">{result.overall_score}</div>
                <p className="text-2xl">Confidence Score</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-green-50">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold text-green-900 mb-4">
                    <CheckCircle2 className="w-7 h-7 inline mr-2" />
                    ✅ Strengths
                  </h3>
                  <ul className="space-y-3">
                    {result.strengths?.map((s, i) => (
                      <li key={i} className="text-green-800 flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-orange-50">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold text-orange-900 mb-4">
                    <TrendingUp className="w-7 h-7 inline mr-2" />
                    📈 Improvements
                  </h3>
                  <ul className="space-y-3">
                    {result.improvements?.map((i, idx) => (
                      <li key={idx} className="text-orange-800 flex items-start gap-2">
                        <span className="text-orange-600 font-bold">→</span>
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {result.body_language_analysis && (
              <Card className="bg-purple-50 border-2 border-purple-300">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold text-purple-900 mb-4">🎭 Body Language</h3>
                  <p className="text-purple-900 text-lg">{result.body_language_analysis}</p>
                </CardContent>
              </Card>
            )}

            {result.confidence_assessment && (
              <Card className="bg-blue-50 border-2 border-blue-300">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold text-blue-900 mb-4">💪 Confidence</h3>
                  <p className="text-blue-900 text-lg">{result.confidence_assessment}</p>
                </CardContent>
              </Card>
            )}

            {result.next_steps && (
              <Card className="bg-indigo-50 border-2 border-indigo-300">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold text-indigo-900 mb-4">🎯 Next Steps</h3>
                  <p className="text-indigo-900 text-lg">{result.next_steps}</p>
                </CardContent>
              </Card>
            )}

            <Button onClick={reset} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-8 text-2xl font-bold text-white">
              <Sparkles className="w-7 h-7 mr-3" />
              Try Another Scenario
            </Button>
          </div>
        </div>
      );
    }

    const scenarioDisplay = selectedScenario?.title || customScenario || 'Confidence';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl md:text-4xl font-black text-white">💪 {scenarioDisplay}</h1>
            <Button onClick={reset} variant="outline" className="bg-white/10 text-white">
              <ArrowLeft className="w-5 h-5 mr-2" />End
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-blue-600 text-white">
              <CardContent className="p-6 text-center">
                <Clock className="w-10 h-10 mx-auto mb-2" />
                <div className="text-4xl font-black">{formatTime(recordingTime)}</div>
                <p className="text-sm opacity-80">Duration</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-600 text-white">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-10 h-10 mx-auto mb-2" />
                <div className="text-4xl font-black">{wordCount}</div>
                <p className="text-sm opacity-80">Words</p>
              </CardContent>
            </Card>

            <Card className="bg-pink-600 text-white">
              <CardContent className="p-6 text-center">
                <Camera className="w-10 h-10 mx-auto mb-2" />
                <div className="text-4xl font-black">{screenshots.length}</div>
                <p className="text-sm opacity-80">Screenshots</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-0">
              <div className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden">
                <video ref={videoRefMe} autoPlay muted playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                
                {isRecording && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full font-black text-lg flex items-center gap-2 animate-pulse shadow-2xl">
                    <Mic className="w-6 h-6 animate-pulse" />
                    ● RECORDING
                  </div>
                )}

                {!cameraReady && (
                  <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8">
                    <AlertTriangle className="w-20 h-20 text-yellow-500 mb-6" />
                    <h3 className="text-3xl font-bold text-white mb-4">Camera Not Enabled</h3>
                    <Button onClick={enableCamera} size="lg" className="bg-blue-600 text-white py-6 px-12 text-xl">
                      <Camera className="w-6 h-6 mr-2" />
                      Enable Camera
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {transcript.length > 0 && (
            <Card className="bg-white/95 border-4 border-green-500">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-7 h-7 text-green-600" />
                  ✅ TRANSCRIPT ({transcript.length} segments | {wordCount} words)
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-3 bg-slate-50 p-4 rounded-lg">
                  {transcript.map((t, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg border-2 border-green-200">
                      <p className="text-lg text-slate-800 font-medium">{t}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!isRecording ? (
            <Button 
              onClick={startRecording} 
              disabled={!cameraReady}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 disabled:opacity-50 py-8 text-2xl font-bold"
            >
              <Mic className="w-8 h-8 mr-3" />
              🎤 START RECORDING
            </Button>
          ) : (
            <Button onClick={stopRecording} className="w-full bg-gradient-to-r from-red-600 to-orange-600 py-8 text-2xl font-bold">
              <StopCircle className="w-8 h-8 mr-3" />
              ⏹️ STOP & GET ANALYSIS
            </Button>
          )}

          {isRecording && (
            <Card className="bg-green-600 border-none animate-pulse">
              <CardContent className="p-6 text-center">
                <Mic className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
                <p className="text-white text-3xl font-black mb-2">🎤 MICROPHONE LIVE</p>
                <p className="text-white text-xl">Speak confidently about your scenario!</p>
                <p className="text-green-200 mt-3 text-lg font-bold">✅ {transcript.length} segments, {screenshots.length} screenshots</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return null;
}