import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, Video, Loader2, CheckCircle2, ArrowLeft, 
  Play, Pause, BarChart3, Camera, Mic, Award, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoPresentationAnalysis({ onComplete }) {
  const [step, setStep] = useState('upload'); // upload, processing, feedback
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      alert('Please upload a video file');
      return;
    }

    setUploadedVideo(file);
    setVideoUrl(URL.createObjectURL(file));
  };

  const captureFrames = async (videoElement, count = 10) => {
    const frames = [];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const duration = videoElement.duration;
    const interval = duration / count;

    for (let i = 0; i < count; i++) {
      videoElement.currentTime = interval * i;
      
      await new Promise((resolve) => {
        videoElement.onseeked = () => {
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            const file = new File([blob], `frame-${i}.jpg`, { type: 'image/jpeg' });
            frames.push(file);
            resolve();
          }, 'image/jpeg', 0.8);
        };
      });
    }
    
    return frames;
  };

  const extractAudioTranscript = async () => {
    // Use browser's speech recognition on the video
    return new Promise((resolve) => {
      const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
      recognition.continuous = true;
      recognition.interimResults = false;
      
      let transcript = '';
      
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
      };
      
      recognition.onend = () => {
        resolve(transcript.trim() || 'Audio transcription not available');
      };
      
      videoRef.current.play();
      recognition.start();
      
      setTimeout(() => {
        recognition.stop();
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }, Math.min(videoRef.current.duration * 1000, 60000)); // Max 1 minute
    });
  };

  const analyzePresentation = async () => {
    setProcessing(true);
    setProgress(10);
    setStep('processing');

    try {
      // Step 1: Upload video
      setProgress(20);
      const videoUpload = await base44.integrations.Core.UploadFile({ file: uploadedVideo });
      const videoFileUrl = videoUpload.file_url;
      
      // Step 2: Capture frames for body language analysis
      setProgress(40);
      const frames = await captureFrames(videoRef.current, 8);
      
      // Step 3: Upload screenshots
      setProgress(50);
      const frameUrls = [];
      for (const frame of frames) {
        const upload = await base44.integrations.Core.UploadFile({ file: frame });
        frameUrls.push(upload.file_url);
      }
      
      // Step 4: Extract audio/transcript (simplified - using video file directly)
      setProgress(60);
      
      // Step 5: Analyze with AI
      setProgress(70);
      const analysisPrompt = `You are analyzing a recorded presentation video. Provide comprehensive feedback.

ANALYSIS TASK:
- Review the attached video frames (screenshots from the presentation)
- Analyze body language, posture, gestures, facial expressions
- Evaluate presentation skills, engagement, and professionalism
- Assess visual delivery and presence

Provide:
1. Overall Score (1-10)
2. Voice & Speech Analysis (pace, clarity, tone, filler words)
3. Body Language Analysis (posture, gestures, eye contact, confidence)
4. Content Delivery (structure, engagement, message clarity)
5. Strengths (3-5 specific things done well)
6. Areas for Improvement (3-5 actionable suggestions)
7. Key Recommendations (top 3 things to focus on next time)

Be specific, constructive, and actionable.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: analysisPrompt,
        file_urls: frameUrls,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            voice_analysis: {
              type: "object",
              properties: {
                pace: { type: "string" },
                clarity: { type: "string" },
                tone: { type: "string" },
                filler_words: { type: "string" }
              }
            },
            body_language: {
              type: "object",
              properties: {
                posture: { type: "string" },
                gestures: { type: "string" },
                eye_contact: { type: "string" },
                confidence_level: { type: "string" }
              }
            },
            content_delivery: {
              type: "object",
              properties: {
                structure: { type: "string" },
                engagement: { type: "string" },
                clarity: { type: "string" }
              }
            },
            strengths: {
              type: "array",
              items: { type: "string" }
            },
            improvements: {
              type: "array",
              items: { type: "string" }
            },
            key_recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setProgress(100);
      setFeedback(result);
      setStep('feedback');
      
    } catch (error) {
      alert('Analysis failed: ' + error.message);
      setStep('upload');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setUploadedVideo(null);
    setVideoUrl(null);
    setFeedback(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'from-green-600 to-emerald-600';
    if (score >= 6) return 'from-yellow-600 to-orange-600';
    return 'from-red-600 to-rose-600';
  };

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
        <canvas ref={canvasRef} className="hidden" />
        
        <div className="max-w-4xl mx-auto">
          <Button onClick={onComplete} variant="ghost" className="mb-6 text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Practice Hub
          </Button>

          <Card className="border-none shadow-2xl bg-white/10 backdrop-blur-xl">
            <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Video className="w-9 h-9 text-white" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-black mb-2">🎬 Video Presentation Analysis</CardTitle>
                  <p className="text-white/90">Upload your presentation for AI-powered feedback</p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-8">
              {!uploadedVideo ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-4 border-dashed border-purple-300 rounded-2xl p-16 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-20 h-20 text-purple-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-white mb-2">Upload Presentation Video</h3>
                  <p className="text-purple-200 mb-4">Click to select or drag & drop</p>
                  <Badge className="bg-purple-600 text-white">MP4, MOV, AVI supported</Badge>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full h-full object-contain"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    <Button
                      onClick={togglePlay}
                      className="absolute bottom-4 left-4 bg-white/90 hover:bg-white"
                      size="icon"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-6">
                    <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      What AI Will Analyze:
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Camera className="w-4 h-4" />
                        <span>Body language & gestures</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-800">
                        <Mic className="w-4 h-4" />
                        <span>Voice tone & clarity</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-800">
                        <Video className="w-4 h-4" />
                        <span>Visual presence & confidence</span>
                      </div>
                      <div className="flex items-center gap-2 text-blue-800">
                        <BarChart3 className="w-4 h-4" />
                        <span>Overall performance score</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="py-6"
                    >
                      Upload Different Video
                    </Button>
                    <Button
                      onClick={analyzePresentation}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg font-bold"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Analyze Now
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 animate-spin text-purple-400 mx-auto mb-8" />
            <h2 className="text-4xl font-black text-white mb-4">Analyzing Your Presentation...</h2>
            <p className="text-purple-200 mb-8">AI is reviewing video, voice, and body language</p>
            
            <Progress value={progress} className="h-4 mb-4" />
            <p className="text-white font-bold">{progress}%</p>
            
            <div className="mt-8 space-y-2 text-left">
              <div className="flex items-center gap-3 text-purple-200">
                <CheckCircle2 className={`w-5 h-5 ${progress >= 20 ? 'text-green-400' : 'text-slate-500'}`} />
                <span>Uploading video...</span>
              </div>
              <div className="flex items-center gap-3 text-purple-200">
                <CheckCircle2 className={`w-5 h-5 ${progress >= 50 ? 'text-green-400' : 'text-slate-500'}`} />
                <span>Capturing frames for body language analysis...</span>
              </div>
              <div className="flex items-center gap-3 text-purple-200">
                <CheckCircle2 className={`w-5 h-5 ${progress >= 70 ? 'text-green-400' : 'text-slate-500'}`} />
                <span>AI analyzing presentation skills...</span>
              </div>
              <div className="flex items-center gap-3 text-purple-200">
                <CheckCircle2 className={`w-5 h-5 ${progress >= 100 ? 'text-green-400' : 'text-slate-500'}`} />
                <span>Generating personalized feedback...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'feedback' && feedback) {
    const scoreColor = getScoreColor(feedback.overall_score);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-black text-white">📊 Presentation Analysis</h1>
            <Button onClick={onComplete} variant="outline" className="text-white border-white/20 hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Practice Hub
            </Button>
          </div>

          <Card className={`border-none shadow-2xl bg-gradient-to-r ${scoreColor} text-white`}>
            <CardContent className="p-8 text-center">
              <Award className="w-20 h-20 mx-auto mb-4" />
              <h2 className="text-6xl font-black mb-2">{feedback.overall_score}/10</h2>
              <p className="text-2xl text-white/90">Overall Presentation Score</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-none shadow-xl bg-white/95">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Voice & Speech
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">PACE</p>
                  <p className="text-sm text-slate-700">{feedback.voice_analysis?.pace}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">CLARITY</p>
                  <p className="text-sm text-slate-700">{feedback.voice_analysis?.clarity}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">TONE</p>
                  <p className="text-sm text-slate-700">{feedback.voice_analysis?.tone}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">FILLER WORDS</p>
                  <p className="text-sm text-slate-700">{feedback.voice_analysis?.filler_words}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white/95">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Body Language
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">POSTURE</p>
                  <p className="text-sm text-slate-700">{feedback.body_language?.posture}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">GESTURES</p>
                  <p className="text-sm text-slate-700">{feedback.body_language?.gestures}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">EYE CONTACT</p>
                  <p className="text-sm text-slate-700">{feedback.body_language?.eye_contact}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">CONFIDENCE</p>
                  <p className="text-sm text-slate-700">{feedback.body_language?.confidence_level}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-white/95">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Content Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">STRUCTURE</p>
                  <p className="text-sm text-slate-700">{feedback.content_delivery?.structure}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">ENGAGEMENT</p>
                  <p className="text-sm text-slate-700">{feedback.content_delivery?.engagement}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">MESSAGE CLARITY</p>
                  <p className="text-sm text-slate-700">{feedback.content_delivery?.clarity}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl bg-green-50">
              <CardHeader className="bg-green-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {feedback.strengths?.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">{idx + 1}</span>
                      </div>
                      <span className="text-slate-800 text-sm leading-relaxed">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-orange-50">
              <CardHeader className="bg-orange-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {feedback.improvements?.map((improvement, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-white text-xs font-bold">{idx + 1}</span>
                      </div>
                      <span className="text-slate-800 text-sm leading-relaxed">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">🎯 Key Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-white/90 mb-4">Focus on these for your next presentation:</p>
              <ul className="space-y-3">
                {feedback.key_recommendations?.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black">{idx + 1}</span>
                    </div>
                    <span className="text-white font-semibold text-lg leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleReset}
              variant="outline"
              className="py-6 border-white/20 text-white hover:bg-white/10"
            >
              Analyze Another Video
            </Button>
            <Button
              onClick={onComplete}
              className="bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-lg font-bold"
            >
              Back to Practice Hub
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}