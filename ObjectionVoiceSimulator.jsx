
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
  MessageCircle,
  Mic,
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  Loader2,
  LogIn,
  User,
  Users,
  Plus,
  Copy,
  Send,
  StopCircle,
  Target,
  Video,
  Sparkles,
  XCircle // Added XCircle import
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TwilioPracticeRoom from '@/components/practice/TwilioPracticeRoom';

export default function ObjectionVoiceSimulator({ onComplete }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState('mode_selection');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');

  const [conversation, setConversation] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [currentSession, setCurrentSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [context, setContext] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [partnerFeedback, setPartnerFeedback] = useState('');

  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        if (authenticated) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    initialData: []
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['practiceSessions', 'objection_handling'],
    queryFn: () => base44.entities.PracticeSession.filter({ module_type: 'objection_handling', status: 'waiting' }),
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
    enabled: !!currentSession && (step === 'waiting_partner' || step === 'objection_2person' || step === 'waiting_partner_feedback' || step === 'waiting_approval'),
    refetchInterval: 500
  });

  useEffect(() => {
    if (sessionUpdate?.participants?.length >= 1 && step === 'waiting_partner') {
      setCurrentSession(sessionUpdate);
      setStep('objection_2person');
    }

    if (step === 'waiting_approval' && sessionUpdate?.participants?.some(p => p.email === user?.email)) {
      console.log('✅ Approved! Joining session...');
      setCurrentSession(sessionUpdate);
      setStep('objection_2person');
    }
  }, [sessionUpdate?.participants?.length, sessionUpdate?.participants, step, user?.email]);

  useEffect(() => {
    if (sessionUpdate?.status === 'completed' && step === 'waiting_partner_feedback' && sessionUpdate?.feedback) {
      const allParticipantsEmails = [
        currentSession.creator_email,
        ...(currentSession.participants?.map(p => p.email) || [])
      ];

      const allFeedbackSubmitted = allParticipantsEmails.every(email => 
        sessionUpdate.feedback && sessionUpdate.feedback[email]
      );

      if (allFeedbackSubmitted) {
        setCurrentSession(sessionUpdate);
        setStep('show_dual_feedback');
      }
    }
  }, [sessionUpdate, step, user?.email, currentSession]);

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

  const scenarios = appSettings.find(s => s.setting_key === 'practice_scenarios')?.module_scenarios?.filter(s => s.module === 'objection_handling') || [];

  const cleanup = () => {
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
      alert('⚠️ Wait for AI');
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
    recognition.lang = selectedLanguage;
    recognition.maxAlternatives = 1;

    let finalText = '';

    recognition.onstart = () => {
      console.log('🎤 LISTENING');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        console.log('✅ HEARD:', transcript);
        finalText = transcript.trim();
      }
    };

    recognition.onerror = (event) => {
      console.error('Error:', event.error);
      if (event.error === 'not-allowed') {
        alert('⚠️ Microphone denied! Enable in browser settings.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🛑 ENDED');
      setIsListening(false);
      
      if (finalText) {
        setConversation(prev => [...prev, { role: 'user', text: finalText }]);
        handleAIResponse(finalText);
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
    setAiSpeaking(true);
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage;
    utterance.rate = 1.0;
    utterance.onend = () => {
      setAiSpeaking(false);
    };
    utterance.onerror = () => {
      setAiSpeaking(false);
    };
    synthRef.current.speak(utterance);
    setConversation(prev => [...prev, { role: 'ai', text }]);
  };

  const handleAIResponse = async (userText) => {
    try {
      const recentConversation = conversation.slice(-4).map(c => `${c.role === 'user' ? 'Salesperson' : 'Customer'}: ${c.text}`).join('\n');
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a DIFFICULT customer with objections. Scenario: ${selectedScenario?.title}

${selectedScenario?.description}

RECENT CONVERSATION:
${recentConversation}

The salesperson just said: "${userText}"

CRITICAL: Respond DIRECTLY to what they said. If they answered your question, acknowledge it then raise a NEW related objection. If they haven't addressed your concern, push back. Be challenging but realistic. Under 35 words.`
      });
      speak(response);
    } catch (error) {
      console.error('AI error:', error);
      setAiSpeaking(false);
    }
  };

  const startPractice = async () => {
    try {
      const initialObjection = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a customer with objections. Scenario: ${selectedScenario?.title}. ${selectedScenario?.description}. Start with your first objection or concern. Under 30 words.`
      });
      speak(initialObjection);
    } catch (error) {
      alert('❌ Failed to start');
    }
  };

  const endPractice = async () => {
    const transcriptText = conversation.map(c => `${c.role === 'user' ? 'Salesperson' : 'Customer'}: ${c.text}`).join('\n');

    if (!transcriptText || transcriptText.length < 20) {
      alert('⚠️ Too short!');
      return;
    }

    setAnalyzing(true);
    try {
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze objection handling:

SCENARIO: ${selectedScenario?.title}

FULL CONVERSATION:
${transcriptText}

Evaluate: how well they handled objections, persuasiveness, staying calm, addressing concerns.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            next_steps: { type: "string" }
          },
          required: ["overall_score", "strengths", "improvements", "next_steps"]
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

  const endSessionWithFeedback = async (data) => {
    const { screenshots, liveTranscript } = data;

    const productContext = currentSession?.context || 'No specific product/service defined.';

    const transcriptText = liveTranscript.map(t => `${userRole}: ${t.text}`).join('\n');

    if (!transcriptText || transcriptText.length < 15) {
      alert('⚠️ NO SPEECH!');
      return;
    }

    setAnalyzing(true);

    try {
      const screenshotUrls = [];
      for (const screenshot of screenshots.slice(0, 10)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: screenshot });
        screenshotUrls.push(file_url);
      }

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze ${userRole} handling objections:\n\nProduct: ${productContext}\n\nTranscript:\n${transcriptText}\n\nEvaluate objection handling.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            next_steps: { type: "string" }
          }
        },
        file_urls: screenshotUrls
      });

      const sessions = await base44.entities.PracticeSession.filter({ id: currentSession.id });
      const latestSession = sessions[0];
      const existingFeedback = latestSession?.feedback || {};

      await updateSessionMutation.mutateAsync({
        sessionId: currentSession.id,
        updates: {
          feedback: {
            ...existingFeedback,
            [user.email]: analysis
          }
        }
      });

      const allParticipants = [
        currentSession.creator_email,
        ...(currentSession.participants?.map(p => p.email) || [])
      ];

      const updatedFeedback = {
        ...existingFeedback,
        [user.email]: analysis
      };

      const allFeedbackSubmitted = allParticipants.every(email => updatedFeedback[email]);

      if (allFeedbackSubmitted) {
        await updateSessionMutation.mutateAsync({
          sessionId: currentSession.id,
          updates: {
            status: 'completed',
            completed_at: new Date().toISOString()
          }
        });
        setStep('show_dual_feedback');
      } else {
        setStep('waiting_partner_feedback');
      }

      setFeedback(analysis);
    } catch (error) {
      alert('❌ Failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateSession = () => {
    if (!context.trim()) {
      alert('Enter product/context');
      return;
    }

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    createSessionMutation.mutate({
      session_code: code,
      module_type: 'objection_handling',
      creator_email: user.email,
      creator_name: user.full_name || user.email,
      creator_role: userRole,
      max_participants: 1,
      status: 'waiting',
      context: context,
    });

    setSessionCode(code);
    setStep('waiting_partner');
  };

  const handleJoinSession = async (session) => {
    setCurrentSession(session);
    const joiningUserRole = session.creator_role === 'salesperson' ? 'customer' : 'salesperson';
    setUserRole(joiningUserRole);
    setContext(session.context);

    await updateSessionMutation.mutateAsync({
      sessionId: session.id,
      updates: {
        join_requests: [
          ...(session.join_requests || []),
          {
            email: user.email,
            name: user.full_name || user.email,
            role: joiningUserRole,
            requested_at: new Date().toISOString()
          }
        ]
      }
    });

    setStep('waiting_approval');
  };

  const handleApproveJoin = async (sessionId, participant) => {
    const sessions = await base44.entities.PracticeSession.filter({ id: sessionId });
    const latestSession = sessions[0];

    const existingParticipants = latestSession.participants || [];
    const isAlreadyParticipant = existingParticipants.some(p => p.email === participant.email);

    if (!isAlreadyParticipant) {
      await updateSessionMutation.mutateAsync({
        sessionId: sessionId,
        updates: {
          participants: [...existingParticipants, participant],
          status: 'active',
          started_at: new Date().toISOString(),
          join_requests: latestSession.join_requests.filter(req => req.email !== participant.email)
        }
      });
    } else {
      await updateSessionMutation.mutateAsync({
        sessionId: sessionId,
        updates: {
          join_requests: latestSession.join_requests.filter(req => req.email !== participant.email)
        }
      });
    }
  };

  const reset = () => {
    cleanup();
    setMode(null);
    setStep('mode_selection');
    setConversation([]);
    setFeedback(null);
    setSelectedScenario(null);
    setCurrentSession(null);
    setContext('');
    setPartnerFeedback('');
    setAiSpeaking(false);
    setIsListening(false);
    setSessionCode('');
    setUserRole(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <LogIn className="w-16 h-16 text-slate-400 mx-auto mb-6" />
            <Button onClick={() => base44.auth.redirectToLogin()} size="lg">Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'mode_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-red-900 p-4 md:p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <Button onClick={onComplete} variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 text-center">🎯 Objection Handling</h1>
          <p className="text-orange-200 text-lg mb-8 text-center">Choose mode</p>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('solo'); setStep('scenario_selection'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-orange-600 to-red-600 text-white">
                <CardContent className="p-8">
                  <User className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">AI Customer</h3>
                  <ul className="space-y-2 text-orange-100 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>AI raises contextual objections</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Voice practice</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>AI feedback</span></li>
                  </ul>
                  <Button className="w-full mt-6 bg-white text-orange-600 font-bold">AI Mode</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('2person'); setStep('role_selection'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <CardContent className="p-8">
                  <Users className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">2-Person</h3>
                  <ul className="space-y-2 text-purple-100 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Real partner</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Both cameras ON</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>AI feedback & screenshots</span></li>
                  </ul>
                  <Button className="w-full mt-6 bg-white text-purple-600 font-bold">Partner</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'scenario_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Button onClick={() => setStep('mode_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <div className="mb-6">
            <Label className="text-white mb-2 block">Language</Label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">🇺🇸 English</SelectItem>
                <SelectItem value="he-IL">🇮🇱 Hebrew</SelectItem>
                <SelectItem value="ar-SA">🇸🇦 Arabic</SelectItem>
                <SelectItem value="es-ES">🇪🇸 Spanish</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <h2 className="text-4xl font-bold text-white text-center mb-8">Select Scenario</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map((scenario) => (
              <motion.div key={scenario.id} whileHover={{ scale: 1.05 }}>
                <Card onClick={() => { setSelectedScenario(scenario); setStep('practice_solo'); startPractice(); }} className="cursor-pointer border-none shadow-2xl">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-xl mb-2">{scenario.title}</h3>
                    <p className="text-slate-600 text-sm mb-3">{scenario.description}</p>
                    <Badge>{scenario.difficulty}</Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'practice_solo') {
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
            <Card className="border-none shadow-2xl bg-gradient-to-br from-orange-600 to-red-600 text-white">
              <CardContent className="p-8 text-center">
                <div className="text-7xl font-black mb-2">{feedback.overall_score}</div>
                <p className="text-xl opacity-80">out of 100</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-xl bg-green-50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-green-900 mb-4"><CheckCircle2 className="w-6 h-6 inline mr-2" />Strengths</h3>
                  <ul className="space-y-2">{feedback.strengths?.map((s, i) => <li key={i} className="text-green-800">✓ {s}</li>)}</ul>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-orange-50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-orange-900 mb-4"><TrendingUp className="w-6 h-6 inline mr-2" />Improvements</h3>
                  <ul className="space-y-2">{feedback.improvements?.map((i, idx) => <li key={idx} className="text-orange-800">→ {i}</li>)}</ul>
                </CardContent>
              </Card>
            </div>

            <Button onClick={reset} className="w-full bg-white text-orange-600 py-6 text-xl font-bold">Again</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-red-900 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white">🎯 {selectedScenario?.title}</h1>
            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" size="sm" className="bg-red-600/20 border-red-500 text-white hover:bg-red-600">
                <XCircle className="w-5 h-5 mr-2" />Force Exit
              </Button>
              <Button onClick={() => setStep('scenario_selection')} variant="ghost" size="sm" className="text-white">
                <ArrowLeft className="w-5 h-5 mr-2" />Exit
              </Button>
            </div>
          </div>

          {conversation.length > 0 && (
            <Card className="border-none shadow-xl bg-white/95 border-4 border-orange-500">
              <CardContent className="p-4">
                <h3 className="font-bold mb-3">📝 Conversation ({conversation.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {conversation.map((c, i) => (
                    <div key={i} className={`p-3 rounded-lg ${c.role === 'user' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-white'}`}>
                      <p className="text-xs font-bold mb-1">{c.role === 'user' ? 'You (Salesperson):' : 'Customer:'}</p>
                      <p>{c.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-2xl bg-gradient-to-r from-green-600 to-emerald-600">
            <CardContent className="p-6">
              <button
                onClick={handleSpeak}
                disabled={aiSpeaking}
                className={`w-full py-12 rounded-2xl font-bold text-3xl transition-all shadow-2xl ${
                  isListening ? 'bg-red-600 text-white scale-95 animate-pulse' : 
                  aiSpeaking ? 'bg-slate-400 text-white cursor-not-allowed' :
                  'bg-white text-green-600'
                }`}
              >
                <Mic className={`w-14 h-14 mx-auto mb-3 ${isListening ? 'animate-pulse' : ''}`} />
                {aiSpeaking ? '⏳ AI SPEAKING' : 
                 isListening ? '🔴 CLICK TO STOP' : 
                 '🎤 CLICK TO SPEAK'}
              </button>
              <p className="text-white text-center mt-3 font-semibold text-base">
                {aiSpeaking ? 'Listen to customer objection...' :
                 isListening ? '🗣️ Speak, then click to stop' : 
                 '📱 Click → Speak → Click when done'}
              </p>
            </CardContent>
          </Card>

          {aiSpeaking && (
            <Card className="bg-blue-600 border-none animate-pulse">
              <CardContent className="p-6 text-center">
                <p className="text-white text-2xl font-bold">Customer is responding to what you said...</p>
              </CardContent>
            </Card>
          )}

          <Button onClick={endPractice} className="w-full bg-gradient-to-r from-red-600 to-orange-600 py-6 text-xl font-bold" disabled={conversation.length < 2 || aiSpeaking}>
            <StopCircle className="w-6 h-6 mr-2" />End & Get Feedback
          </Button>
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
              <Card onClick={() => { setUserRole('salesperson'); setStep('create_session'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-orange-600 to-red-600 text-white">
                <CardContent className="p-10 text-center">
                  <User className="w-20 h-20 mx-auto mb-4" />
                  <h3 className="text-3xl font-black mb-4">👔 Salesperson</h3>
                  <Button className="w-full bg-white text-orange-600 py-4 font-bold">I'll Sell</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }}>
              <Card onClick={() => { setUserRole('customer'); setStep('join_partner'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <CardContent className="p-10 text-center">
                  <Users className="w-20 h-20 mx-auto mb-4" />
                  <h3 className="text-3xl font-black mb-4">🤝 Customer</h3>
                  <Button className="w-full bg-white text-purple-600 py-4 font-bold">I'll Object</Button>
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
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Button onClick={() => setStep('role_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Create Session</h2>

              <div>
                <Label>Product/Service *</Label>
                <Input value={context} onChange={(e) => setContext(e.target.value)} placeholder="e.g., CRM Software" className="h-12" />
              </div>

              <Button onClick={handleCreateSession} className="w-full bg-gradient-to-r from-orange-600 to-red-600 py-6 text-xl font-bold" disabled={!context.trim()}>
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

          <h2 className="text-4xl font-bold text-white mb-6 text-center">Join Session</h2>

          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="border-none shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-2">{session.creator_name}</h3>
                  <p className="text-slate-600 mb-3"><strong>Product:</strong> {session.context}</p>
                  <Button onClick={() => handleJoinSession(session)} className="w-full bg-purple-600">Join</Button>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-900 to-purple-900 p-6 flex items-center justify-center">
        <Card className="max-w-2xl border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Users className="w-24 h-24 text-blue-400 mx-auto mb-6 animate-pulse" />
            <h2 className="text-4xl font-bold mb-4">Waiting...</h2>
            <p className="text-lg mb-4">Share this code with your partner to join:</p>
            <div className="bg-slate-100 rounded-xl p-6 mb-6">
              <p className="text-sm text-slate-600 mb-2">Session Code:</p>
              <div className="text-5xl font-black text-blue-600">{sessionCode}</div>
              <Button onClick={() => { navigator.clipboard.writeText(sessionCode); alert('✅ Copied!'); }} variant="outline" size="sm" className="mt-3">
                <Copy className="w-4 h-4 mr-2" />Copy
              </Button>
            </div>
            
            {currentSession?.join_requests?.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-lg mb-2 text-yellow-800">Join Requests:</h3>
                {currentSession.join_requests.map((request, index) => (
                  <div key={index} className="flex justify-between items-center bg-yellow-100 p-3 rounded-md mb-2">
                    <p className="text-yellow-900">{request.name} wants to join as {request.role}.</p>
                    <Button onClick={() => handleApproveJoin(currentSession.id, { email: request.email, name: request.name, role: request.role, joined_at: new Date().toISOString() })} size="sm" className="bg-green-500 hover:bg-green-600">Approve</Button>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={reset} variant="outline">Cancel Session</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'waiting_approval') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 animate-spin text-pink-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Waiting for Creator Approval...</h2>
            <p className="text-slate-600">The session creator needs to approve your request to join.</p>
            <Button onClick={reset} variant="outline" className="mt-6">Cancel Request</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'objection_2person') {
    if (!currentSession) {
      console.error("No current session available for TwilioPracticeRoom.");
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 p-6 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-12 text-center text-white">
              <p className="text-2xl font-bold mb-4">Error: Session data missing.</p>
              <Button onClick={reset} variant="outline" className="mt-6 bg-white/10 text-white border-white/20">Return to modes</Button>
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
              <h2 className="text-3xl font-bold text-white">Analyzing Session Feedback...</h2>
              <p className="text-sm text-gray-300">This might take a moment as AI processes the call and screenshots.</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <TwilioPracticeRoom
        session={currentSession}
        userRole={userRole}
        onEnd={endSessionWithFeedback}
        moduleType="objection_handling"
      />
    );
  }

  if (step === 'waiting_partner_feedback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 animate-spin text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">⏳ Waiting for Partner's Feedback...</h2>
            <p className="text-slate-600">Your feedback has been submitted and is being analyzed.</p>
            <p className="text-sm text-slate-500 mt-2">We'll show both your and your partner's feedback once available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'show_dual_feedback') {
    const myFeedback = currentSession?.feedback?.[user?.email];
    
    const partnerInfo = currentSession?.participants?.find(p => p.email !== user?.email) || 
                        (currentSession?.creator_email !== user?.email ? { email: currentSession.creator_email, name: currentSession.creator_name } : null);

    const partnerEmail = partnerInfo?.email;
    const partnerName = partnerInfo?.name || partnerEmail;

    const partnerFeedback = currentSession?.feedback?.[partnerEmail];

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6">
        {analyzing && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <Card className="max-w-md border-none shadow-2xl">
              <CardContent className="p-12 text-center">
                <Loader2 className="w-24 h-24 text-white animate-spin mx-auto mb-6" />
                <h2 className="text-3xl font-bold text-white">Finalizing Feedback...</h2>
              </CardContent>
            </Card>
          </div>
        )}
        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-4xl font-black">📊 Partner Feedback Exchange</h2>
              <p className="text-lg mt-2 opacity-80">AI-powered analysis for both participants.</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold mb-4 text-blue-900">Your Performance Feedback</h3>
                <p className="text-sm text-slate-600 mb-4">Provided by AI for your role as {userRole}.</p>
                {myFeedback ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-xl">
                      <p className="text-blue-900 text-lg leading-relaxed font-bold">Overall Score: {myFeedback.overall_score}/100</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl">
                      <p className="font-semibold text-blue-900 mb-2">Strengths:</p>
                      <ul className="list-disc list-inside text-blue-800 space-y-1">
                        {myFeedback.strengths?.map((s, i) => <li key={`my-strength-${i}`}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl">
                      <p className="font-semibold text-blue-900 mb-2">Improvements:</p>
                      <ul className="list-disc list-inside text-blue-800 space-y-1">
                        {myFeedback.improvements?.map((i, idx) => <li key={`my-improvement-${idx}`}>{i}</li>)}
                      </ul>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl">
                      <p className="font-semibold text-blue-900 mb-2">Next Steps:</p>
                      <p className="text-blue-800">{myFeedback.next_steps}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-50 p-6 rounded-xl">
                    <p className="text-blue-900 text-lg leading-relaxed">No AI feedback generated for you yet. Please ensure the session was completed properly.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold mb-4 text-purple-900">{partnerName}'s Performance Feedback</h3>
                <p className="text-sm text-slate-600 mb-4">Provided by AI for your partner's role.</p>
                {partnerFeedback ? (
                  <div className="space-y-4">
                    <div className="bg-purple-50 p-4 rounded-xl">
                      <p className="text-purple-900 text-lg leading-relaxed font-bold">Overall Score: {partnerFeedback.overall_score}/100</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl">
                      <p className="font-semibold text-purple-900 mb-2">Strengths:</p>
                      <ul className="list-disc list-inside text-purple-800 space-y-1">
                        {partnerFeedback.strengths?.map((s, i) => <li key={`partner-strength-${i}`}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl">
                      <p className="font-semibold text-purple-900 mb-2">Improvements:</p>
                      <ul className="list-disc list-inside text-purple-800 space-y-1">
                        {partnerFeedback.improvements?.map((i, idx) => <li key={`partner-improvement-${idx}`}>{i}</li>)}
                      </ul>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl">
                      <p className="font-semibold text-purple-900 mb-2">Next Steps:</p>
                      <p className="text-purple-800">{partnerFeedback.next_steps}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-purple-50 p-6 rounded-xl">
                    <p className="text-purple-900 text-lg leading-relaxed">No AI feedback generated for {partnerName} yet. Please ensure the session was completed properly.</p>
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

  return null;
}
