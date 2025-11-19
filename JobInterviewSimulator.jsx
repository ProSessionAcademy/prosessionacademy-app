
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  Mic,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Loader2,
  LogIn,
  User,
  Users,
  Plus,
  Copy,
  StopCircle,
  MicOff,
  Video,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import TwilioPracticeRoom from '@/components/practice/TwilioPracticeRoom';

const INTERVIEWER_PHOTOS = [
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800'
];

export default function JobInterviewSimulator({ onComplete }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState('mode_selection');
  const [jobRole, setJobRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [interviewerPhoto] = useState(INTERVIEWER_PHOTOS[Math.floor(Math.random() * INTERVIEWER_PHOTOS.length)]);

  const [conversation, setConversation] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const [currentSession, setCurrentSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [userRole, setUserRole] = useState(null);
  // Screenshots and liveTranscript will now be passed by TwilioPracticeRoom for 2-person mode,
  // but kept as state for consistency and potential future solo mode use.
  const [screenshots, setScreenshots] = useState([]);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const canvasRef = useRef(null); // Canvas ref is still needed for captureScreenshot (solo mode)

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

  const { data: sessions = [] } = useQuery({
    queryKey: ['practiceSessions', 'job_interview'],
    queryFn: () => base44.entities.PracticeSession.filter({ module_type: 'job_interview', status: 'waiting' }),
    enabled: mode === '2person' && step === 'join_partner',
    refetchInterval: 2000,
    initialData: []
  });

  const { data: sessionUpdate } = useQuery({
    queryKey: ['currentSession', currentSession?.id],
    queryFn: async () => {
      if (!currentSession?.id) return null;
      const sessions = await base44.entities.PracticeSession.filter({ id: currentSession.id });
      return sessions[0] || null;
    },
    enabled: !!currentSession && (step === 'waiting_partner' || step === 'interview_2person' || step === 'waiting_partner_feedback' || step === 'waiting_approval'),
    refetchInterval: 500
  });

  useEffect(() => {
    if (sessionUpdate?.participants?.length >= 1 && step === 'waiting_partner') {
      setCurrentSession(sessionUpdate);
      setStep('interview_2person');
      // Removed: setTimeout(() => initVideoCall(sessionUpdate), 300); // TwilioPracticeRoom handles video initiation
    }

    // DETECT APPROVAL: If I was waiting for approval and now I'm in participants, join the session
    if (step === 'waiting_approval' && sessionUpdate?.participants?.some(p => p.email === user?.email)) {
      console.log('✅ Approved! Joining interview...');
      setCurrentSession(sessionUpdate);
      setStep('interview_2person');
      // Removed: setTimeout(() => initVideoCall(sessionUpdate), 300); // TwilioPracticeRoom handles video initiation
    }
  }, [sessionUpdate?.participants?.length, sessionUpdate?.participants, step, user?.email]);

  useEffect(() => {
    if (sessionUpdate?.status === 'completed' && step === 'waiting_partner_feedback' && sessionUpdate?.feedback) {
      const partnerEmail = sessionUpdate.participants?.[0]?.email !== user?.email
        ? sessionUpdate.participants?.[0]?.email
        : sessionUpdate.creator_email;

      const myFeedback = sessionUpdate.feedback[user?.email];
      const partnerFeedback = sessionUpdate.feedback[partnerEmail];

      if (myFeedback && partnerFeedback) {
        setCurrentSession(sessionUpdate);
        setStep('show_dual_feedback');
      }
    }
  }, [sessionUpdate, step, user?.email]);

  // Removed the WebRTC signaling useEffect - Twilio handles this

  const createSessionMutation = useMutation({
    mutationFn: (data) => base44.entities.PracticeSession.create(data),
    onSuccess: (session) => {
      setCurrentSession(session);
      queryClient.invalidateQueries({ queryKey: ['practiceSessions'] });
    }
  });

  const updateSessionMutation = useMutation({
    mutationFn: ({ sessionId, updates }) => base44.entities.PracticeSession.update(sessionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practiceSessions'] });
      queryClient.invalidateQueries({ queryKey: ['currentSession'] });
    }
  });

  const captureScreenshot = async (videoElement) => {
    // This captureScreenshot is primarily for solo mode now, or if a custom implementation for 2-person was desired outside Twilio.
    // TwilioPracticeRoom will handle its own screenshots.
    if (!videoElement || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoElement;

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

  const cleanup = () => {
    // Only cleanup solo mode specific resources now. TwilioPracticeRoom handles its own media cleanup.
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const handleSpeak = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (aiSpeaking) {
      alert('⚠️ Wait for interviewer');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('⚠️ Speech not supported. Try Safari or Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let finalText = '';

    recognition.onstart = () => {
      console.log('🎤 USER STARTED SPEAKING');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (text.trim()) {
        console.log('✅ USER SAID:', text);
        finalText = text.trim();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        alert('⚠️ Microphone denied! Enable in browser settings.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🛑 USER STOPPED');
      setIsListening(false);
      if (finalText) {
        setConversation(prev => [...prev, { role: 'candidate', text: finalText }]);
        handleAIQuestion(finalText);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      alert('⚠️ Failed: ' + error.message);
      setIsListening(false);
    }
  };

  const speak = (text) => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setAiSpeaking(true);
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.onend = () => {
      setAiSpeaking(false);
    };
    utterance.onerror = () => {
      setAiSpeaking(false);
    };
    synthRef.current.speak(utterance);
    setConversation(prev => [...prev, { role: 'interviewer', text }]);
  };

  const handleAIQuestion = async (userText) => {
    try {
      const recentConversation = conversation.slice(-4).map(c => `${c.role}: ${c.text}`).join('\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are interviewing for: ${jobRole}

${jobDescription ? `Job description: ${jobDescription}` : ''}

RECENT CONVERSATION:
${recentConversation}

Candidate just answered: "${userText}"

CRITICAL: Acknowledge their specific answer briefly (1 sentence), then ask ONE new, relevant follow-up question based on what they just said. Be natural and conversational. Under 45 words total.`
      });

      speak(response);
    } catch (error) {
      console.error('AI error:', error);
      setAiSpeaking(false);
    }
  };

  const startInterview = async () => {
    try {
      const question = await base44.integrations.Core.InvokeLLM({
        prompt: `You are interviewing for: ${jobRole}. ${jobDescription ? `Context: ${jobDescription}` : ''} Greet the candidate warmly and ask the first interview question. Under 35 words.`
      });
      speak(question);
    } catch (error) {
      alert('❌ Failed to start: ' + error.message);
    }
  };

  const endInterview = async () => {
    // This is for solo mode
    const transcriptText = conversation.map(c => `${c.role}: ${c.text}`).join('\n');

    if (!transcriptText || transcriptText.length < 20) {
      alert('⚠️ No conversation!');
      return;
    }

    setAnalyzing(true);
    try {
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze interview for: ${jobRole}

FULL CONVERSATION:
${transcriptText}

Evaluate: answer quality, communication, relevance, confidence, professionalism.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            next_steps: { type: "string" }
          }
        }
      });
      setFeedback(analysis);
      setStep('feedback');
    } catch (error) {
      alert('❌ Failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const endInterviewForBoth = async (data) => {
    const { screenshots, liveTranscript } = data;

    setAnalyzing(true);

    try {
      const screenshotUrls = [];
      const screenshotsToUpload = screenshots.slice(-10); // Take last 10 screenshots
      for (const screenshot of screenshotsToUpload) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: screenshot });
        screenshotUrls.push(file_url);
      }

      const transcriptText = liveTranscript
        .map(t => `${t.speaker === user.email ? userRole : (userRole === 'interviewer' ? 'candidate' : 'interviewer')}: ${t.text}`)
        .join('\n');

      const myAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the ${userRole} in this job interview for role: ${jobRole}

FULL CONVERSATION TRANSCRIPT:
${transcriptText || 'No transcript available - analyze based on screenshots only.'}

Review ${screenshotUrls.length} screenshots of their body language, facial expressions, posture.

Evaluate:
- Body language and presence
- Communication style
- Confidence level
- Professional demeanor
- How they handled the interview
- Engagement and eye contact

Provide detailed feedback for the ${userRole}.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            body_language_notes: { type: "string" },
            next_steps: { type: "string" }
          }
        },
        file_urls: screenshotUrls
      });

      await updateSessionMutation.mutateAsync({
        sessionId: currentSession.id,
        updates: {
          status: 'completed',
          completed_at: new Date().toISOString(),
          transcripts: {
            ...currentSession.transcripts,
            [user.email]: liveTranscript
          },
          feedback: {
            ...currentSession.feedback,
            [user.email]: myAnalysis
          }
        }
      });

      setFeedback(myAnalysis);
      setStep('waiting_partner_feedback');
    } catch (error) {
      alert('❌ Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateSession = () => {
    if (!jobRole.trim()) {
      alert('Enter job role');
      return;
    }

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    createSessionMutation.mutate({
      session_code: code,
      module_type: 'job_interview',
      creator_email: user.email,
      creator_name: user.full_name || user.email,
      creator_role: userRole,
      max_participants: 2,
      status: 'waiting',
      context: jobRole,
      scenario: jobDescription,
      webrtc_signals: {}
    });

    setSessionCode(code);
    setStep('waiting_partner');
  };

  const handleJoinSession = async (session) => {
    // If user is candidate, they will join the session and set status to active.
    // If user is interviewer, they will request to join (setting status to 'pending'), and creator will accept.
    if (userRole === 'candidate') {
      const participants = [{
        email: user.email,
        name: user.full_name || user.email,
        role: userRole,
        joined_at: new Date().toISOString()
      }];

      await updateSessionMutation.mutateAsync({
        sessionId: session.id,
        updates: { participants, status: 'active', started_at: new Date().toISOString() }
      });

      const updatedSession = { ...session, participants, status: 'active' };
      setCurrentSession(updatedSession);
      setJobRole(session.context);
      setJobDescription(session.scenario);
      setStep('interview_2person');
      // Removed: setTimeout(() => initVideoCall(updatedSession), 300); // TwilioPracticeRoom handles video initiation
    } else if (userRole === 'interviewer') {
      // Request to join as interviewer
      await updateSessionMutation.mutateAsync({
        sessionId: session.id,
        updates: {
          pending_participant: {
            email: user.email,
            name: user.full_name || user.email,
            role: userRole,
            requested_at: new Date().toISOString()
          }
        }
      });
      setCurrentSession(session); // Keep currentSession to listen for updates
      setStep('waiting_approval');
      setJobRole(session.context);
      setJobDescription(session.scenario);
    }
  };

  const reset = () => {
    cleanup(); // Cleans up solo mode speech resources
    setMode(null);
    setStep('mode_selection');
    setConversation([]);
    setFeedback(null);
    setJobRole('');
    setJobDescription('');
    setCurrentSession(null);
    setScreenshots([]);
    setLiveTranscript([]);
    setAiSpeaking(false);
    setIsListening(false);
    setUserRole(null); // Reset userRole
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <LogIn className="w-16 h-16 text-slate-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-4">Login Required</h3>
            <Button onClick={() => base44.auth.redirectToLogin()} size="lg">Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'mode_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 p-4 md:p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <Button onClick={onComplete} variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 text-center">💼 Job Interview</h1>
          <p className="text-blue-200 text-lg mb-8 text-center">Choose mode</p>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('solo'); setStep('job_input'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
                <CardContent className="p-8">
                  <User className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">AI Interview</h3>
                  <ul className="space-y-2 text-blue-100 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>AI asks questions</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Voice conversation</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>AI feedback</span></li>
                  </ul>
                  <Button className="w-full mt-6 bg-white text-indigo-600 font-bold">AI Mode</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('2person'); setStep('role_selection'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <CardContent className="p-8">
                  <Users className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">2-Person + AI Feedback</h3>
                  <ul className="space-y-2 text-purple-100 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Real partner</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Both cameras ON</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>AI analyzes BOTH</span></li>
                  </ul>
                  <Button className="w-full mt-6 bg-white text-purple-600 font-bold">Partner + AI</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'job_input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Button onClick={() => setStep('mode_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Job Interview Setup</h2>

              <div>
                <Label>Job Title/Role *</Label>
                <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="e.g., Business Manager" className="h-12" />
              </div>

              <div>
                <Label>Job Description (Optional)</Label>
                <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste job description..." rows={6} />
              </div>

              <Button onClick={() => { setStep('interview_solo'); startInterview(); }} disabled={!jobRole.trim()} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 py-6 text-xl font-bold">
                <Sparkles className="w-6 h-6 mr-2" />
                Start AI Interview
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'interview_solo') {
    if (analyzing) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
          <Card className="max-w-md border-none shadow-2xl">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-24 h-24 text-white animate-spin mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white">Analyzing...</h2>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (feedback) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="border-none shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4" />
                <div className="text-7xl font-black mb-2">{feedback.overall_score}</div>
                <p className="text-xl opacity-80">out of 100</p>
                <p className="text-purple-100 mt-2">Your Interview Performance</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-xl bg-green-50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-green-900 mb-4">
                    <CheckCircle2 className="w-6 h-6 inline mr-2" />💪 Strengths
                  </h3>
                  <ul className="space-y-2">
                    {feedback.strengths?.map((s, i) => <li key={i} className="text-green-800">✓ {s}</li>)}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-orange-50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-orange-900 mb-4">
                    <TrendingUp className="w-6 h-6 inline mr-2" />📈 Improvements
                  </h3>
                  <ul className="space-y-2">
                    {feedback.improvements?.map((i, idx) => <li key={idx} className="text-orange-800">→ {i}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {feedback.next_steps && (
              <Card className="border-none shadow-xl bg-indigo-50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-indigo-900 mb-4">🎯 Next Steps</h3>
                  <p className="text-indigo-800 leading-relaxed">{feedback.next_steps}</p>
                </CardContent>
              </Card>
            )}

            <Button onClick={onComplete} className="w-full bg-white text-indigo-600 py-6 text-xl font-bold">
              <Sparkles className="w-6 h-6 mr-2" />
              Back to Practice Hub
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white">💼 {jobRole} Interview</h1>
            <Button onClick={() => setStep('job_input')} variant="ghost" size="sm" className="text-white">
              <ArrowLeft className="w-5 h-5 mr-2" />Exit
            </Button>
          </div>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-0">
              <div className="bg-indigo-800 text-white p-3 text-center">
                <h3 className="font-bold">AI INTERVIEWER</h3>
              </div>
              <div className="aspect-video bg-slate-900">
                <img src={interviewerPhoto} alt="Interviewer" className="w-full h-full object-cover" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white/95 border-4 border-indigo-500">
            <CardContent className="p-6">
              <h3 className="font-bold text-2xl mb-4 flex items-center gap-2">
                <MessageSquare className="w-7 h-7 text-indigo-600" />
                📝 Interview ({conversation.length} exchanges)
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {conversation.length === 0 ? (
                  <div className="text-center text-slate-400 py-12">
                    <Mic className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-xl font-semibold">AI will ask you questions</p>
                    <p className="text-sm mt-2">Click mic when ready to answer</p>
                  </div>
                ) : (
                  conversation.map((c, i) => (
                    <div key={i} className={`p-4 rounded-xl ${c.role === 'candidate' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'}`}>
                      <p className="text-sm font-bold mb-2">{c.role === 'candidate' ? 'You:' : 'Interviewer:'}</p>
                      <p className="text-lg">{c.text}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-gradient-to-r from-green-600 to-emerald-600">
            <CardContent className="p-6">
              <button
                onClick={handleSpeak}
                disabled={aiSpeaking}
                className={`w-full py-12 rounded-2xl font-bold text-3xl transition-all shadow-2xl ${
                  isListening ? 'bg-red-600 text-white animate-pulse' :
                  aiSpeaking ? 'bg-slate-400 text-white cursor-not-allowed' :
                  'bg-white text-green-600'
                }`}
              >
                <Mic className={`w-14 h-14 mx-auto mb-3 ${isListening ? 'animate-pulse' : ''}`} />
                {aiSpeaking ? '⏳ INTERVIEWER ASKING...' :
                 isListening ? '🔴 CLICK TO STOP' :
                 '🎤 SPEAK YOUR ANSWER'}
              </button>
              <p className="text-white text-center mt-4 text-base font-semibold">
                {aiSpeaking ? 'Listen to question...' :
                 isListening ? '📱 Answer, then click to stop' :
                 '📱 Click → Answer → Click when done'}
              </p>
            </CardContent>
          </Card>

          {aiSpeaking && (
            <Card className="bg-blue-600 border-none animate-pulse">
              <CardContent className="p-6 text-center">
                <p className="text-white text-2xl font-bold">🗣️ Interviewer asking next question...</p>
              </CardContent>
            </Card>
          )}

          {conversation.length >= 4 && !aiSpeaking && !isListening && (
            <Button onClick={endInterview} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-xl font-bold">
              <CheckCircle2 className="w-6 h-6 mr-2" />Get AI Feedback
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'role_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <Button onClick={() => setStep('mode_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h1 className="text-4xl font-black text-white mb-8 text-center">Choose Role</h1>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Card onClick={() => { setUserRole('interviewer'); setStep('create_session'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white">
                <CardContent className="p-10 text-center">
                  <Briefcase className="w-20 h-20 mx-auto mb-4" />
                  <h3 className="text-3xl font-black mb-4">👔 Interviewer</h3>
                  <Button className="w-full bg-white text-indigo-600 py-4 font-bold">I'll Interview</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }}>
              <Card onClick={() => { setUserRole('candidate'); setStep('join_partner'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <CardContent className="p-10 text-center">
                  <User className="w-20 h-20 mx-auto mb-4" />
                  <h3 className="text-3xl font-black mb-4">🙋 Candidate</h3>
                  <Button className="w-full bg-white text-purple-600 py-4 font-bold">I'm Candidate</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'create_session') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Button onClick={() => setStep('role_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Create Interview</h2>

              <div>
                <Label>Job Role *</Label>
                <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="e.g., Sales Manager" className="h-12" />
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={4} />
              </div>

              <Button onClick={handleCreateSession} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 py-6 text-xl font-bold" disabled={!jobRole.trim()}>
                <Plus className="w-6 h-6 mr-2" />Create
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'join_partner') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => setStep('role_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h2 className="text-4xl font-bold text-white mb-6 text-center">Join Interview</h2>

          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="border-none shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-2">{session.creator_name} ({session.creator_role}) created a session</h3>
                  <p className="text-slate-600 mb-3"><strong>Role:</strong> {session.context}</p>
                  <Button onClick={() => handleJoinSession(session)} className="w-full bg-purple-600">Join as {userRole}</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {sessions.length === 0 && (
            <Card className="border-none shadow-2xl">
              <CardContent className="p-16 text-center">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-xl font-bold">No sessions</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (step === 'waiting_partner') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-6 flex items-center justify-center">
        <Card className="max-w-2xl border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Users className="w-24 h-24 text-indigo-400 mx-auto mb-6 animate-pulse" />
            <h2 className="text-4xl font-bold mb-4">Waiting...</h2>
            <div className="bg-slate-100 rounded-xl p-6 mb-6">
              <p className="text-sm text-slate-600 mb-2">Code:</p>
              <div className="text-5xl font-black text-indigo-600">{sessionCode}</div>
              <Button onClick={() => { navigator.clipboard.writeText(sessionCode); alert('✅ Copied!'); }} variant="outline" size="sm" className="mt-3">
                <Copy className="w-4 h-4 mr-2" />Copy
              </Button>
            </div>
            {currentSession?.pending_participant && (
              <Card className="mb-6 bg-yellow-50 text-yellow-800 shadow-md">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold">{currentSession.pending_participant.name} ({currentSession.pending_participant.role}) wants to join.</p>
                    <p className="text-sm">Approve to start the interview.</p>
                  </div>
                  <Button
                    onClick={async () => {
                      const participants = [{
                        email: user.email,
                        name: user.full_name || user.email,
                        role: userRole,
                        joined_at: new Date().toISOString()
                      }, currentSession.pending_participant]; // Add pending participant
                      await updateSessionMutation.mutateAsync({
                        sessionId: currentSession.id,
                        updates: { participants, status: 'active', started_at: new Date().toISOString(), pending_participant: null }
                      });
                      // The useEffect will catch the status change and move to interview_2person
                    }}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    Approve
                  </Button>
                </CardContent>
              </Card>
            )}
            <Button onClick={reset} variant="outline">Cancel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'waiting_approval') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-blue-900 p-6 flex items-center justify-center">
        <Card className="max-w-2xl border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Users className="w-24 h-24 text-indigo-400 mx-auto mb-6 animate-pulse" />
            <h2 className="text-4xl font-bold mb-4">Request Sent!</h2>
            <p className="text-slate-600 text-lg mb-6">Waiting for the session creator to approve your join request.</p>
            <p className="text-slate-500">You'll automatically be redirected when approved.</p>
            <Button onClick={reset} variant="outline" className="mt-8">Cancel Request</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <Card className="max-w-md border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 text-white animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">AI Analyzing...</h2>
            <p className="text-blue-200">Processing screenshots & transcript...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'interview_2person') {
    return (
      <TwilioPracticeRoom
        session={currentSession}
        userRole={userRole}
        onEnd={endInterviewForBoth}
        moduleType="job_interview"
      />
    );
  }

  if (step === 'feedback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-none shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4" />
              <div className="text-7xl font-black mb-2">{feedback.overall_score}</div>
              <p className="text-xl opacity-80">out of 100</p>
              <p className="text-purple-100 mt-2">Your Interview Performance</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl bg-green-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-green-900 mb-4">
                  <CheckCircle2 className="w-6 h-6 inline mr-2" />💪 Strengths
                </h3>
                <ul className="space-y-2">
                  {feedback.strengths?.map((s, i) => <li key={i} className="text-green-800">✓ {s}</li>)}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-orange-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-orange-900 mb-4">
                  <TrendingUp className="w-6 h-6 inline mr-2" />📈 Improvements
                </h3>
                <ul className="space-y-2">
                  {feedback.improvements?.map((i, idx) => <li key={idx} className="text-orange-800">→ {i}</li>)}
                </ul>
              </CardContent>
            </Card>
          </div>

          {feedback.body_language_notes && (
            <Card className="border-none shadow-xl bg-blue-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4">🎭 Body Language Analysis</h3>
                <p className="text-blue-800 leading-relaxed">{feedback.body_language_notes}</p>
              </CardContent>
            </Card>
          )}

          {feedback.next_steps && (
            <Card className="border-none shadow-xl bg-indigo-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-indigo-900 mb-4">🎯 Next Steps</h3>
                <p className="text-indigo-800 leading-relaxed">{feedback.next_steps}</p>
                </CardContent>
              </Card>
          )}

          <Button onClick={onComplete} className="w-full bg-white text-indigo-600 py-6 text-xl font-bold">
            <Sparkles className="w-6 h-6 mr-2" />Back to Practice Hub
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'waiting_partner_feedback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 animate-spin text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">⏳ Waiting for Partner...</h2>
            <p className="text-slate-600">Your feedback submitted. Waiting for partner's analysis.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'show_dual_feedback') {
    const myFeedback = currentSession?.feedback?.[user?.email];
    // Determine the partner's email based on who is not the current user's email among creator and first participant
    const partnerEmail = currentSession?.creator_email === user?.email
      ? currentSession?.participants?.[0]?.email
      : currentSession?.creator_email;

    const partnerFeedback = currentSession?.feedback?.[partnerEmail];

    // Determine the partner's name
    const partnerName = currentSession?.creator_email === user?.email
      ? currentSession?.participants?.[0]?.name
      : currentSession?.creator_name;


    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-4xl font-black">📊 Complete Analysis</h2>
              <p className="text-lg mt-2">Both participants' AI feedback</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold mb-4 text-blue-900">Your Performance</h3>
                <div className="bg-blue-600 text-white p-6 rounded-xl text-center mb-4">
                  <div className="text-6xl font-black">{myFeedback?.overall_score}</div>
                  <p className="text-lg">out of 100</p>
                </div>

                {myFeedback?.strengths && (
                  <div className="bg-green-50 p-4 rounded-lg mb-4">
                    <h4 className="font-bold text-green-900 mb-2">✅ Strengths</h4>
                    <ul className="space-y-1">
                      {myFeedback.strengths.map((s, i) => (
                        <li key={i} className="text-green-800 text-sm">✓ {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {myFeedback?.improvements && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-bold text-orange-900 mb-2">📈 Improvements</h4>
                    <ul className="space-y-1">
                      {myFeedback.improvements.map((i, idx) => (
                        <li key={idx} className="text-orange-800 text-sm">→ {i}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold mb-4 text-purple-900">{partnerName}'s Performance</h3>
                <div className="bg-purple-600 text-white p-6 rounded-xl text-center mb-4">
                  <div className="text-6xl font-black">{partnerFeedback?.overall_score}</div>
                  <p className="text-lg">out of 100</p>
                </div>

                {partnerFeedback?.strengths && (
                  <div className="bg-green-50 p-4 rounded-lg mb-4">
                    <h4 className="font-bold text-green-900 mb-2">✅ Strengths</h4>
                    <ul className="space-y-1">
                      {partnerFeedback.strengths.map((s, i) => (
                        <li key={i} className="text-green-800 text-sm">✓ {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {partnerFeedback?.improvements && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-bold text-orange-900 mb-2">📈 Improvements</h4>
                    <ul className="space-y-1">
                      {partnerFeedback.improvements.map((i, idx) => (
                        <li key={idx} className="text-orange-800 text-sm">→ {i}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Button onClick={onComplete} className="w-full bg-white text-purple-600 py-6 text-xl font-bold">
            <Sparkles className="w-6 h-6 mr-2" />Back to Hub
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'feedback_sent') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="w-24 h-24 text-green-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">✅ Done!</h2>
            <Button onClick={onComplete} className="bg-green-600 mt-4">Back to Hub</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
