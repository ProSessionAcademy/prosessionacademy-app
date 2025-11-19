
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ShoppingBag,
  User,
  Users,
  ArrowLeft,
  Loader2,
  Mic,
  StopCircle,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  Plus,
  Copy,
  Video,
  XCircle // Added XCircle import
} from 'lucide-react';
import { motion } from 'framer-motion';
import TwilioPracticeRoom from '@/components/practice/TwilioPracticeRoom';

const AI_CUSTOMER_IMAGES = [
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800'
];

export default function RetailSalesPractice({ onComplete }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState('mode_selection');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [customerPersona, setCustomerPersona] = useState('');
  const [aiCustomerImage] = useState(AI_CUSTOMER_IMAGES[Math.floor(Math.random() * AI_CUSTOMER_IMAGES.length)]);

  const [conversation, setConversation] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [currentSession, setCurrentSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState([]); // Kept for solo mode, TwilioPracticeRoom handles it for 2-person
  const [remoteVideoReady, setRemoteVideoReady] = useState(false); // Kept for solo mode, TwilioPracticeRoom handles it for 2-person
  const [screenshots, setScreenshots] = useState([]); // Kept for solo mode, TwilioPracticeRoom handles it for 2-person

  const videoRefMe = useRef(null); // Kept for solo mode
  const videoRefPartner = useRef(null); // Kept for solo mode
  const canvasRef = useRef(null); // Kept for solo mode
  const mediaStreamRef = useRef(null); // Kept for solo mode
  const synthRef = useRef(window.speechSynthesis);
  const peerConnectionRef = useRef(null); // Kept for solo mode
  const sessionRef = useRef(null);
  const screenshotIntervalRef = useRef(null); // Kept for solo mode
  const liveRecognitionRef = useRef(null); // Kept for solo mode
  const recognitionRef = useRef(null);
  const isLiveRecordingRef = useRef(false); // Kept for solo mode

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
        console.error('Error:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ['practiceSessions', 'retail_sales'],
    queryFn: () => base44.entities.PracticeSession.filter({ module_type: 'retail_sales', status: 'waiting' }),
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
    enabled: !!currentSession && (step === 'waiting_partner' || step === 'practice_2person' || step === 'waiting_partner_feedback' || step === 'waiting_approval'),
    refetchInterval: 500
  });

  useEffect(() => {
    if (sessionUpdate?.participants?.length >= 1 && step === 'waiting_partner') {
      setCurrentSession(sessionUpdate);
      setStep('practice_2person');
      // initVideoCall will be handled by TwilioPracticeRoom component
    }

    // DETECT APPROVAL: If I was waiting for approval and now I'm in participants, join the session
    if (step === 'waiting_approval' && sessionUpdate?.participants?.some(p => p.email === user?.email)) {
      console.log('✅ Approved! Joining session...');
      setCurrentSession(sessionUpdate);
      setStep('practice_2person');
      // initVideoCall will be handled by TwilioPracticeRoom component
    }

    // Check if partner's feedback is ready and transition to dual feedback
    if (sessionUpdate && sessionUpdate.status === 'completed' && step === 'waiting_partner_feedback') {
        setCurrentSession(sessionUpdate); // Update session with latest feedback
        setStep('show_dual_feedback');
    }
  }, [sessionUpdate?.participants?.length, sessionUpdate?.participants, sessionUpdate?.status, step, user?.email]);

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

  // This function is for SOLO mode only now
  const handleSpeak = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    if (aiSpeaking) {
      alert('⚠️ Wait for customer');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('⚠️ Speech not supported in this browser. Try Safari or Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let finalText = '';

    recognition.onstart = () => {
      console.log('🎤 RETAIL LISTENING');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (text.trim()) {
        console.log('✅ RETAIL SPEECH:', text);
        finalText = text.trim();
      }
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('⚠️ Microphone denied! Please allow microphone access in browser settings.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🛑 RETAIL ENDED');
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

  // This function is for SOLO mode only now
  const speak = (text) => {
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
    setConversation(prev => [...prev, { role: 'ai', text }]);
  };

  // This function is for SOLO mode only now
  const handleAIResponse = async (userText) => {
    try {
      const conversationHistory = conversation.slice(-6).map(c => `${c.role === 'user' ? 'Salesperson' : 'Customer'}: ${c.text}`).join('\n');
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a customer in a retail store. You're interested in buying: ${productName} (Price: ${productPrice})
${customerPersona ? `You are: ${customerPersona}` : ''}

RECENT CONVERSATION:
${conversationHistory}

The salesperson just said: "${userText}"

Respond naturally as the customer. React to what they said - ask questions, express concerns about price/quality, show interest or hesitation. Keep it under 35 words and conversational.`
      });
      
      speak(response);
    } catch (error) {
      console.error('AI error:', error);
      setAiSpeaking(false);
    }
  };

  // This function is for SOLO mode only now
  const startSale = async () => {
    try {
      const initialMessage = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a customer walking into a retail store. You're interested in: ${productName} (${productPrice}). ${customerPersona ? `You are: ${customerPersona}.` : ''} Greet the salesperson and ask about the product. Under 25 words.`
      });
      
      speak(initialMessage);
    } catch (error) {
      alert('❌ Failed to start: ' + error.message);
    }
  };

  // This function is for SOLO mode only now
  const endSale = async () => {
    const transcriptText = conversation.map(c => `${c.role === 'user' ? 'Salesperson' : 'Customer'}: ${c.text}`).join('\n');

    if (!transcriptText || transcriptText.length < 20) {
      alert('⚠️ Conversation too short!');
      return;
    }

    setAnalyzing(true);

    try {
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze retail sales performance for: ${productName} (${productPrice})

FULL CONVERSATION:
${transcriptText}

Evaluate: customer engagement, product knowledge, sales techniques, closing ability, professionalism. Give detailed, specific feedback.`,
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
      alert('❌ Failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // This function was for WebRTC in 2-person mode, now removed
  const initVideoCall = async (session) => {
    // This function is no longer used, TwilioPracticeRoom handles video calls
    // Its logic was replaced by TwilioPracticeRoom component
    console.log("initVideoCall was called, but should be handled by TwilioPracticeRoom now.");
  };

  const cleanup = () => {
    isLiveRecordingRef.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (liveRecognitionRef.current) {
      try { liveRecognitionRef.current.stop(); } catch(e) {}
      liveRecognitionRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
      recognitionRef.current = null;
    }
    if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setRemoteVideoReady(false);
  };

  // This function is for SOLO mode only now
  const startLiveTranscription = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    isLiveRecordingRef.current = true;
    let liveTranscriptParts = [];

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        
        if (event.results[i].isFinal && text.trim()) {
          console.log('✅ RETAIL 2P SPEECH:', text);
          liveTranscriptParts.push({
            speaker: user.email,
            text: text.trim(),
            timestamp: new Date().toISOString()
          });
          setLiveTranscript([...liveTranscriptParts]);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Live transcription error:', event.error);
      if (event.error === 'not-allowed') {
        alert('⚠️ Microphone denied!');
        isLiveRecordingRef.current = false;
      }
    };

    recognition.onend = () => {
      if (isLiveRecordingRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error('Failed to restart:', e);
          }
        }, 100);
      }
    };

    try {
      recognition.start();
      liveRecognitionRef.current = recognition;
      console.log('🎤 Live transcription started');
    } catch (e) {
      console.error('Failed to start mic:', e);
    }
  };

  const endSessionWithFeedback = async (data) => {
    const { screenshots, liveTranscript } = data;

    const productContext = currentSession?.context || '';
    const [prodName, prodPrice] = productContext.split(' - ');

    const transcriptText = liveTranscript.map(t => `${t.speaker === user.email ? userRole : (userRole === 'salesperson' ? 'customer' : 'salesperson')}: ${t.text}`).join('\n');

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
        prompt: `Analyze ${userRole} in retail sales:\n\nProduct: ${prodName} (Price: ${prodPrice})\n\nTranscript:\n${transcriptText}\n\nEvaluate sales skills.`,
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
    if (!productName.trim() || !productPrice.trim()) {
      alert('Enter product and price');
      return;
    }

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    createSessionMutation.mutate({
      session_code: code,
      module_type: 'retail_sales',
      creator_email: user.email,
      creator_name: user.full_name || user.email,
      creator_role: userRole,
      max_participants: 1,
      status: 'waiting',
      context: `${productName} - ${productPrice}`,
      scenario: customerPersona,
      webrtc_signals: {} // This is still here for historical reasons but not used for Twilio now
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
      updates: { 
        participants, 
        status: 'active', // If we want creator approval, this would be 'pending' or similar
        started_at: new Date().toISOString() 
      }
    });

    const updatedSession = { ...session, participants, status: 'active' };
    setCurrentSession(updatedSession);
    
    const [prod, price] = session.context.split(' - ');
    setProductName(prod);
    setProductPrice(price);
    setCustomerPersona(session.scenario);
    setUserRole(oppositeRole);
    setStep('practice_2person');
    // initVideoCall will be handled by TwilioPracticeRoom component
  };

  const reset = () => {
    cleanup(); // Keep the general cleanup for internal states
    setMode(null);
    setStep('mode_selection');
    setFeedback(null);
    setProductName('');
    setProductPrice('');
    setCustomerPersona('');
    setCurrentSession(null);
    setConversation([]);
    setScreenshots([]);
    setLiveTranscript([]);
    setAiSpeaking(false);
    setIsListening(false);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-16 h-16 animate-spin" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button></div>;

  if (step === 'mode_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900 p-4 md:p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <Button onClick={onComplete} variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-8 text-center">🛍️ Retail Sales</h1>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('solo'); setStep('product_input'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-green-600 to-emerald-600 text-white">
                <CardContent className="p-8">
                  <User className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">AI Customer (Voice Only)</h3>
                  <p className="text-sm text-center opacity-90">Talk to AI customer, no camera needed</p>
                  <Button className="w-full mt-6 bg-white text-green-600 font-bold">AI Voice Mode</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('2person'); setStep('role_selection'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <CardContent className="p-8">
                  <Users className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">2-Person + AI</h3>
                  <p className="text-sm text-center opacity-90">Practice with partner</p>
                  <Button className="w-full mt-6 bg-white text-purple-600 font-bold">Partner</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'product_input') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Button onClick={() => setStep('mode_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Setup Sale (Voice Only)</h2>
              <p className="text-slate-600">NO camera needed - just voice conversation with AI customer</p>

              <div>
                <Label>Product Name *</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., Blue Sneakers" className="h-12" />
              </div>

              <div>
                <Label>Price *</Label>
                <Input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="e.g., $79.99" className="h-12" />
              </div>

              <div>
                <Label>Customer Persona (Optional)</Label>
                <Textarea value={customerPersona} onChange={(e) => setCustomerPersona(e.target.value)} placeholder="e.g., Budget-conscious, quality-focused" rows={3} />
              </div>

              <Button onClick={() => { setStep('sale_solo'); startSale(); }} disabled={!productName.trim() || !productPrice.trim()} className="w-full bg-green-600 py-6 text-xl font-bold">
                <Mic className="w-6 h-6 mr-2" />Start Voice Sale
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'sale_solo') {
    if (analyzing) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-24 h-24 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold">AI Analyzing...</h2>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (feedback) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="bg-green-600 text-white">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4" />
                <div className="text-7xl font-black mb-2">{feedback.overall_score}</div>
                <p className="text-xl">out of 100</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-green-50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-green-900 mb-4"><CheckCircle2 className="w-6 h-6 inline mr-2" />Strengths</h3>
                  <ul className="space-y-2">{feedback.strengths?.map((s, i) => <li key={i} className="text-green-800">✓ {s}</li>)}</ul>
                </CardContent>
              </Card>

              <Card className="bg-orange-50">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-orange-900 mb-4"><TrendingUp className="w-6 h-6 inline mr-2" />Improvements</h3>
                  <ul className="space-y-2">{feedback.improvements?.map((i, idx) => <li key={idx} className="text-orange-800">→ {i}</li>)}</ul>
                </CardContent>
              </Card>
            </div>

            <Button onClick={onComplete} className="w-full bg-white text-green-600 py-6 text-xl font-bold">
              <Sparkles className="w-6 h-6 mr-2" />Back to Hub
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-emerald-900 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">🛍️ Selling: {productName} ({productPrice})</h1>
            <Button onClick={reset} variant="destructive" className="bg-red-600 hover:bg-red-700">
              <XCircle className="w-5 h-5 mr-2" />
              Force Exit
            </Button>
          </div>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-0">
              <div className="aspect-video bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center relative">
                <img src={aiCustomerImage} alt="AI Customer" className="w-full h-full object-cover opacity-40" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <ShoppingBag className="w-32 h-32 mb-4" />
                  <h2 className="text-4xl font-black">AI CUSTOMER</h2>
                  <p className="text-xl mt-2 opacity-90">Voice conversation - no camera</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {conversation.length > 0 && (
            <Card className="border-none shadow-xl bg-white/95">
              <CardContent className="p-6">
                <h3 className="font-bold text-2xl mb-4 flex items-center gap-2">
                  <MessageSquare className="w-7 h-7 text-green-600" />
                  Sales Conversation ({conversation.length} exchanges)
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {conversation.map((msg, i) => (
                    <div key={i} className={`p-4 rounded-xl ${msg.role === 'user' ? 'bg-green-600 text-white' : 'bg-slate-700 text-white'}`}>
                      <p className="text-sm font-bold mb-2">{msg.role === 'user' ? 'You (Salesperson):' : 'Customer:'}</p>
                      <p className="text-lg">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-2xl bg-gradient-to-r from-blue-600 to-cyan-600">
            <CardContent className="p-6">
              <button
                onClick={handleSpeak}
                disabled={aiSpeaking}
                className={`w-full py-12 rounded-2xl font-bold text-3xl transition-all shadow-2xl 
                  ${aiSpeaking ? 'bg-slate-400 text-white cursor-not-allowed' :
                    isListening ? 'bg-red-600 text-white scale-95 animate-pulse' : 
                    'bg-white text-blue-600 hover:scale-105'}`
                }
              >
                <Mic className={`w-14 h-14 mx-auto mb-3 ${isListening ? 'animate-pulse' : ''}`} />
                {aiSpeaking ? '⏳ CUSTOMER SPEAKING...' :
                 isListening ? '🔴 LISTENING - Click STOP' : 
                 '🎤 SPEAK TO CUSTOMER'}
              </button>
              <p className="text-white text-center mt-4 font-semibold text-lg">
                {aiSpeaking ? 'Listen to customer...' :
                 isListening ? '🗣️ Make your pitch, click when done' : 
                 '📱 Click → Speak → Click to send'}
              </p>
            </CardContent>
          </Card>

          {aiSpeaking && (
            <Card className="bg-purple-600 border-none animate-pulse">
              <CardContent className="p-6 text-center">
                <p className="text-white text-2xl font-bold">🗣️ Customer is responding...</p>
              </CardContent>
            </Card>
          )}

          <Button 
            onClick={endSale} 
            className="w-full bg-gradient-to-r from-red-600 to-orange-600 py-6 text-xl font-bold" 
            disabled={conversation.length < 4 || aiSpeaking || isListening}
          >
            <StopCircle className="w-6 h-6 mr-2" />End Sale & Get Feedback
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
              <Card onClick={() => { setUserRole('salesperson'); setStep('create_session'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-green-600 to-emerald-600 text-white">
                <CardContent className="p-10 text-center">
                  <ShoppingBag className="w-20 h-20 mx-auto mb-4" />
                  <h3 className="text-3xl font-black mb-4">👔 Salesperson</h3>
                  <Button className="w-full bg-white text-green-600 py-4 font-bold">I'll Sell</Button>
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
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Button onClick={() => setStep('role_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Create Session</h2>

              <div>
                <Label>Product *</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., Fancy Watch" className="h-12" />
              </div>

              <div>
                <Label>Price *</Label>
                <Input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="e.g., $299.00" className="h-12" />
              </div>

              <div>
                <Label>Customer Persona (Optional)</Label>
                <Textarea value={customerPersona} onChange={(e) => setCustomerPersona(e.target.value)} placeholder="e.g., Wealthy, looking for gift" rows={3} />
              </div>

              <Button onClick={handleCreateSession} className="w-full bg-green-600 py-6 text-xl font-bold" disabled={!productName.trim() || !productPrice.trim()}>
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
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6 flex items-center justify-center">
        <Card className="max-w-2xl border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Users className="w-24 h-24 text-green-400 mx-auto mb-6 animate-pulse" />
            <h2 className="text-4xl font-bold mb-4">Waiting...</h2>
            <div className="bg-slate-100 rounded-xl p-6 mb-6">
              <p className="text-sm text-slate-600 mb-2">Code:</p>
              <div className="text-5xl font-black text-green-600">{sessionCode}</div>
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

  if (analyzing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold">AI Analyzing...</h2>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'feedback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="bg-green-600 text-white">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4" />
              <div className="text-7xl font-black mb-2">{feedback.overall_score}</div>
              <p className="text-xl">out of 100</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-green-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-green-900 mb-4"><CheckCircle2 className="w-6 h-6 inline mr-2" />Strengths</h3>
                <ul className="space-y-2">{feedback.strengths?.map((s, i) => <li key={i} className="text-green-800">✓ {s}</li>)}</ul>
              </CardContent>
            </Card>

            <Card className="bg-orange-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-orange-900 mb-4"><TrendingUp className="w-6 h-6 inline mr-2" />Improvements</h3>
                <ul className="space-y-2">{feedback.improvements?.map((i, idx) => <li key={idx} className="text-orange-800">→ {i}</li>)}</ul>
              </CardContent>
            </Card>
          </div>

          <Button onClick={onComplete} className="w-full bg-white text-green-600 py-6 text-xl font-bold">
            <Sparkles className="w-6 h-6 mr-2" />Back to Hub
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'waiting_partner_feedback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6 flex items-center justify-center">
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
    const otherParticipantEmails = [currentSession?.creator_email, ...(currentSession?.participants?.map(p => p.email) || [])].filter(email => email !== user?.email);
    const partnerEmail = otherParticipantEmails[0]; // Assuming only one other participant
    const partnerFeedback = currentSession?.feedback?.[partnerEmail];
    
    // Determine partner's name
    let partnerName = 'Partner';
    if (currentSession?.creator_email === partnerEmail) {
        partnerName = currentSession?.creator_name || 'Creator';
    } else if (currentSession?.participants?.[0]?.email === partnerEmail) {
        partnerName = currentSession?.participants?.[0]?.name || 'Participant';
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-4xl font-black">📊 Complete Analysis</h2>
              <p className="text-lg mt-2">Both participants' performance</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold mb-4 text-blue-900">Your Performance</h3>
                <div className="bg-blue-600 text-white p-6 rounded-xl text-center mb-4">
                  <div className="text-6xl font-black">{myFeedback?.overall_score || 'N/A'}</div>
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
                  <div className="text-6xl font-black">{partnerFeedback?.overall_score || 'N/A'}</div>
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

  if (step === 'practice_2person') {
    return (
      <TwilioPracticeRoom
        session={currentSession}
        userRole={userRole}
        onEnd={endSessionWithFeedback}
        moduleType="retail_sales"
      />
    );
  }

  return null;
}
