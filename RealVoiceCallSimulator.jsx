
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Phone,
  Mic,
  User,
  Users,
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  Loader2,
  LogIn,
  Copy,
  Plus,
  Send,
  StopCircle,
  Sparkles,
  XCircle // Added XCircle import
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TwilioPracticeRoom from '@/components/practice/TwilioPracticeRoom';

export default function RealVoiceCallSimulator({ onComplete }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState('mode_selection');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');

  const [conversation, setConversation] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const [currentSession, setCurrentSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [productContext, setProductContext] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [partnerFeedback, setPartnerFeedback] = useState('');

  const synthRef = useRef(window.speechSynthesis);
  const recognitionRef = useRef(null);

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

  const { data: appSettings = [] } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => base44.entities.AppSettings.list(),
    initialData: []
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['practiceSessions', 'sales_call'],
    queryFn: () => base44.entities.PracticeSession.filter({ module_type: 'sales_call', status: 'waiting' }),
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
    enabled: !!currentSession && (step === 'waiting_partner' || step === 'call_2person'),
    refetchInterval: 500
  });

  useEffect(() => {
    if (sessionUpdate?.participants?.length >= 1 && step === 'waiting_partner') {
      setCurrentSession(sessionUpdate);
      setStep('call_2person');
    }
  }, [sessionUpdate?.participants?.length, step]);

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

  const scenarios = appSettings.find(s => s.setting_key === 'practice_scenarios')?.module_scenarios?.filter(s => s.module === 'sales') || [];

  const cleanup = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
  };

  const handleSpeak = () => {
    if (isSpeaking) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        console.log('🎤 Recognition started');
        setIsSpeaking(true);
      };

      recognition.onresult = (event) => {
        console.log('🎤 Speech detected');
        const text = event.results[0][0].transcript;
        if (text && text.trim()) {
          console.log('✅ Transcript:', text);
          setConversation(prev => [...prev, { role: 'user', text }]);
          if (mode === 'solo') handleAIResponse(text);
        }
        setIsSpeaking(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'no-speech') {
          alert('⚠️ No speech detected. Please speak clearly.');
        } else if (event.error === 'not-allowed') {
          alert('⚠️ Microphone access denied. Please allow microphone access.');
        }
        setIsSpeaking(false);
      };
      
      recognition.onend = () => {
        console.log('🛑 Recognition ended');
        setIsSpeaking(false);
      };
      
      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (error) {
        console.error('Recognition start error:', error);
        alert('⚠️ Failed to start: ' + error.message);
        setIsSpeaking(false);
      }
    } else {
      alert('⚠️ Speech recognition not supported in your browser');
      setIsSpeaking(false);
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedLanguage;
    synthRef.current.speak(utterance);
    setConversation(prev => [...prev, { role: 'ai', text }]);
  };

  const handleAIResponse = async (userText) => {
    try {
      const history = conversation.map(t => `${t.role === 'user' ? 'Salesperson' : 'Customer'}: ${t.text}`).join('\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Sales call. Scenario: ${selectedScenario?.title}

${selectedScenario?.description}

${history}
Salesperson: ${userText}

Respond as CUSTOMER naturally. Under 40 words.`
      });

      speak(response);
    } catch (error) {
      console.error('AI error:', error);
    }
  };

  const startCall = () => {
    speak('Hello? Who is this?');
  };

  const endCall = async () => {
    const transcriptText = conversation.map(t => `${t.role === 'user' ? 'YOU (Salesperson)' : 'Customer (AI)'}: ${t.text}`).join('\n');

    if (!transcriptText || transcriptText.length < 20) {
      const confirmRetry = confirm('⚠️ Call too short! No speech detected.\n\nTroubleshooting:\n- Click the SPEAK button\n- Speak clearly into microphone\n- Click STOP when done\n- Wait for AI response\n\nClick OK to try again\nClick Cancel to exit');
      if (confirmRetry) {
        setConversation([]);
        return;
      } else {
        reset();
        return;
      }
    }

    setAnalyzing(true);

    try {
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this sales call transcript where YOU were the SALESPERSON:

FULL SALES CALL TRANSCRIPT:
${transcriptText}

Evaluate the salesperson's performance on:
1. OPENING: How did they start the call? Professional greeting?
2. DISCOVERY: Did they ask questions to understand customer needs?
3. PRESENTATION: How well did they present the product/solution?
4. HANDLING CONCERNS: How did they address customer objections or questions?
5. CLOSING: Did they attempt to close or suggest next steps?
6. OVERALL EFFECTIVENESS: How likely would this lead to a sale?

Provide detailed, actionable feedback with specific examples from the call.`,
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

      setResult(analysis);
      setStep('solo_feedback');
    } catch (error) {
      alert('❌ Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateSession = () => {
    if (!productContext.trim()) {
      alert('Enter product');
      return;
    }

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    createSessionMutation.mutate({
      session_code: code,
      module_type: 'sales_call',
      creator_email: user.email,
      creator_name: user.full_name || user.email,
      creator_role: userRole,
      max_participants: 1,
      status: 'waiting',
      context: productContext
    });

    setSessionCode(code);
    setStep('waiting_partner');
  };

  const handleJoinSession = async (session) => {
    const oppositeRole = session.creator_role === 'salesperson' ? 'customer' : 'salesperson';

    const participants = [{
      email: user.email,
      name: user.full_name || user.email,
      role: oppositeRole,
      joined_at: new Date().toISOString()
    }];

    await updateSessionMutation.mutateAsync({
      sessionId: session.id,
      updates: { participants, status: 'active', started_at: new Date().toISOString() }
    });

    const updatedSession = { ...session, participants, status: 'active' };
    setCurrentSession(updatedSession);
    setProductContext(session.context);
    setUserRole(oppositeRole);
    setStep('call_2person');
  };

  const endSessionWithFeedback = async (data) => {
    const { screenshots, liveTranscript } = data;

    const transcriptText = liveTranscript.map(t => `${userRole}: ${t.text}`).join('\n');

    if (!transcriptText || transcriptText.length < 15) {
      alert('⚠️ NO SPEECH DETECTED! Please speak during the call.');
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
        prompt: `Analyze ${userRole} in sales call:\n\nProduct: "${productContext}"\n\nTranscript:\n${transcriptText}\n\nEvaluate sales technique.`,
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

      await updateSessionMutation.mutateAsync({
        sessionId: currentSession.id,
        updates: {
          status: 'completed',
          completed_at: new Date().toISOString(),
          feedback: {
            ...(currentSession.feedback || {}),
            [user.email]: analysis
          }
        }
      });

      setResult(analysis);
      setStep('solo_feedback');
    } catch (error) {
      alert('❌ Failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    cleanup();
    setMode(null);
    setStep('mode_selection');
    setConversation([]);
    setResult(null);
    setSelectedScenario(null);
    setCurrentSession(null);
    setProductContext('');
    setPartnerFeedback('');
    setIsSpeaking(false);
    if (onComplete) onComplete(); // Go back to practice hub
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <Loader2 className="w-16 h-16 text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-4 md:p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <Button onClick={onComplete} variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 text-center">📞 Sales Call</h1>
          <p className="text-blue-200 text-lg mb-8 text-center">Choose mode</p>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('solo'); setStep('scenario_selection'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
                <CardContent className="p-8">
                  <User className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">AI Customer</h3>
                  <ul className="space-y-2 text-blue-100 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>AI customer</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Voice conversation</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>AI feedback</span></li>
                  </ul>
                  <Button className="w-full mt-6 bg-white text-blue-600 font-bold">AI Mode</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('2person'); setStep('role_selection'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <CardContent className="p-8">
                  <Users className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">2-Person + Twilio</h3>
                  <ul className="space-y-2 text-purple-100 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Real partner</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>Twilio video & audio</span></li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /><span>AI analyzes both</span></li>
                  </ul>
                  <Button className="w-full mt-6 bg-white text-purple-600 font-bold">Partner Mode</Button>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-6">
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
                <Card onClick={() => { setSelectedScenario(scenario); setStep('call_solo'); startCall(); }} className="cursor-pointer border-none shadow-2xl">
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

  if (step === 'solo_feedback' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4" />
              <div className="text-7xl font-black mb-2">{result.overall_score}</div>
              <p className="text-xl opacity-80">out of 100</p>
              <p className="text-blue-100 mt-2">Sales Call Performance</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl bg-green-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-green-900 mb-4"><CheckCircle2 className="w-6 h-6 inline mr-2" />✅ Your Strengths</h3>
                <ul className="space-y-2">{result.strengths?.map((s, i) => <li key={i} className="text-green-800 flex items-start gap-2"><span>✓</span><span>{s}</span></li>)}</ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-orange-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-orange-900 mb-4"><TrendingUp className="w-6 h-6 inline mr-2" />📈 Improvements</h3>
                <ul className="space-y-2">{result.improvements?.map((i, idx) => <li key={idx} className="text-orange-800 flex items-start gap-2"><span>→</span><span>{i}</span></li>)}</ul>
              </CardContent>
            </Card>
          </div>

          {result.next_steps && (
            <Card className="border-none shadow-xl bg-indigo-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-indigo-900 mb-4">🎯 Next Steps</h3>
                <p className="text-indigo-800 leading-relaxed">{result.next_steps}</p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button onClick={reset} variant="outline" className="flex-1 bg-white/10 text-white border-white/20">
              <Sparkles className="w-6 h-6 mr-2" />
              Practice Again
            </Button>
            <Button onClick={onComplete} className="flex-1 bg-white text-blue-600">
              Back to Hub
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'call_solo') {
    if (analyzing) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
          <Card className="max-w-md border-none shadow-2xl">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-24 h-24 text-white animate-spin mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white">Analyzing Your Sales Performance...</h2>
              <p className="text-blue-200 mt-2">Evaluating your call technique...</p>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white">📞 Sales Call</h1>
            <div className="flex gap-2">
              <Button onClick={reset} variant="outline" size="sm" className="bg-red-600/20 border-red-500 text-white hover:bg-red-600">
                <XCircle className="w-5 h-5 mr-2" />Force Exit
              </Button>
              <Button onClick={() => setStep('scenario_selection')} variant="ghost" size="sm" className="text-white">
                <ArrowLeft className="w-5 h-5 mr-2" />Exit
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
            <CardContent className="p-6 text-center">
              <Phone className="w-16 h-16 mx-auto mb-3" />
              <h3 className="text-2xl font-bold mb-2">Call In Progress</h3>
              <p className="text-blue-100">YOU = Salesperson • AI = Customer</p>
            </CardContent>
          </Card>

          {conversation.length > 0 && (
            <Card className="border-none shadow-xl bg-white/95">
              <CardContent className="p-4">
                <h3 className="font-bold mb-3">📝 Call Transcript</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {conversation.map((c, i) => (
                    <div key={i} className={`p-3 rounded-lg ${c.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-white'}`}>
                      <p className="text-xs font-bold mb-1">{c.role === 'user' ? 'You:' : 'Customer:'}</p>
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
                className={`w-full py-12 rounded-2xl font-bold text-3xl transition-all shadow-2xl ${
                  isSpeaking ? 'bg-red-600 text-white animate-pulse scale-95' : 'bg-white text-green-600'
                }`}
              >
                <Mic className={`w-14 h-14 mx-auto mb-3 ${isSpeaking ? 'animate-pulse' : ''}`} />
                {isSpeaking ? '🔴 LISTENING... Click to STOP' : '🎤 CLICK TO SPEAK'}
              </button>
              <p className="text-white text-center mt-4 text-base leading-relaxed">
                {isSpeaking
                  ? '🗣️ Speak now! Click button again when done speaking.'
                  : '📱 Click button → Speak → Click again to stop → AI responds'}
              </p>
            </CardContent>
          </Card>

          <Button onClick={endCall} className="w-full bg-gradient-to-r from-red-600 to-orange-600 py-6 text-xl font-bold" disabled={conversation.length < 2}>
            <StopCircle className="w-6 h-6 mr-2" />
            END CALL & GET AI FEEDBACK
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
              <Card onClick={() => { setUserRole('salesperson'); setStep('create_session'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
                <CardContent className="p-10 text-center">
                  <User className="w-20 h-20 mx-auto mb-4" />
                  <h3 className="text-3xl font-black mb-4">👔 Salesperson</h3>
                  <Button className="w-full bg-white text-blue-600 py-4 font-bold">I'll Sell</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }}>
              <Card onClick={() => { setUserRole('customer'); setStep('join_partner'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <CardContent className="p-10 text-center">
                  <Users className="w-20 h-20 mx-auto mb-4" />
                  <h3 className="text-3xl font-black mb-4">🤝 Customer</h3>
                  <Button className="w-full bg-white text-purple-600 py-4 font-bold">I'm Customer</Button>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-900 to-purple-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Button onClick={() => setStep('role_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Create Session</h2>

              <div>
                <Label>Product/Service *</Label>
                <Input value={productContext} onChange={(e) => setProductContext(e.target.value)} placeholder="e.g., CRM Software" className="h-12" />
              </div>

              <Button onClick={handleCreateSession} className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 py-6 text-xl font-bold" disabled={!productContext.trim()}>
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

          <h2 className="text-4xl font-bold text-white mb-6 text-center">Join Call</h2>

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
            <div className="bg-slate-100 rounded-xl p-6 mb-6">
              <p className="text-sm text-slate-600 mb-2">Code:</p>
              <div className="text-5xl font-black text-blue-600">{sessionCode}</div>
              <Button onClick={() => { navigator.clipboard.writeText(sessionCode); alert('✅ Copied!'); }} variant="outline" size="sm" className="mt-3">
                <Copy className="w-4 h-4 mr-2" />Copy
              </Button>
            </div>
            <Button onClick={reset} variant="outline">Cancel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'call_2person') {
    return (
      <TwilioPracticeRoom
        session={currentSession}
        userRole={userRole}
        onEnd={endSessionWithFeedback}
        moduleType="sales_call"
      />
    );
  }

  if (step === 'give_partner_feedback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Give Feedback</h2>

              <div>
                <Label>Feedback *</Label>
                <Textarea
                  value={partnerFeedback}
                  onChange={(e) => setPartnerFeedback(e.target.value)}
                  placeholder="What went well? What could improve?"
                  rows={8}
                />
              </div>

              <Button onClick={async () => {
                await updateSessionMutation.mutateAsync({
                  sessionId: currentSession.id,
                  updates: {
                    feedback: {
                      ...(currentSession.feedback || {}),
                      [user.email]: { from_name: user.full_name || user.email, feedback: partnerFeedback }
                    }
                  }
                });
                alert('✅ Sent!');
                setStep('feedback_sent');
              }} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-xl font-bold" disabled={!partnerFeedback.trim()}>
                <Send className="w-6 h-6 mr-2" />
                Submit
              </Button>
            </CardContent>
          </Card>
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
