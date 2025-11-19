import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Briefcase, Mic, User, Users, ArrowLeft, Loader2, LogIn, Copy, Plus, StopCircle, Sparkles, CheckCircle2, TrendingUp, Video, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import TwilioPracticeRoom from '@/components/practice/TwilioPracticeRoom'; // Added import

export default function SalesLiveRolePlay({ onComplete }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [productContext, setProductContext] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [step, setStep] = useState('role_selection');
  
  // These are now collected by TwilioPracticeRoom and passed to onEnd
  // The parent component no longer directly manages screenshots or live transcript collection.
  // const [screenshots, setScreenshots] = useState([]); 
  // const [liveTranscript, setLiveTranscript] = useState([]); 

  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null); // Feedback for current user
  const [allParticipantsFeedback, setAllParticipantsFeedback] = useState({}); // All feedback once available
  
  // WebRTC specific refs are removed as Twilio handles this internally
  // const videoRefMe = useRef(null);
  // const videoRefPartner = useRef(null);
  // const canvasRef = useRef(null);
  // const mediaStreamRef = useRef(null);
  // const peerConnectionRef = useRef(null);
  // const sessionRef = useRef(null);
  // const screenshotIntervalRef = useRef(null);
  // const liveRecognitionRef = useRef(null);

  // The sessionRef is still useful for tracking the current session state across renders
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
        console.error('Error:', error);
      } finally {
        setAuthLoading(false);
      }
    };
    fetchUser();
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ['practiceSessions', 'sales_roleplay'],
    queryFn: () => base44.entities.PracticeSession.filter({ module_type: 'sales_roleplay', status: 'waiting' }),
    enabled: step === 'join_partner',
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
    enabled: !!currentSession && (step === 'waiting_partner' || step === 'roleplay_2person' || step === 'waiting_partner_feedback'),
    refetchInterval: 500
  });

  // New useEffect to handle session state changes for Twilio room
  useEffect(() => {
    if (!sessionUpdate || !currentSession) return;

    // If a partner joins while waiting
    if (sessionUpdate.participants?.length >= 1 && step === 'waiting_partner') {
      const partnerParticipant = sessionUpdate.participants.find(p => p.email !== user.email);
      if (partnerParticipant) {
        setCurrentSession(sessionUpdate);
        setProductContext(sessionUpdate.context); // Ensure context is updated for joined user
        const newRole = partnerParticipant.role === 'salesperson' ? 'customer' : 'salesperson'; // This logic seems reversed based on previous 'oppositeRole'
        // Let's assume the userRole for the joining participant is already set
        // and currentSession.participants will contain both.
        setStep('roleplay_2person');
      }
    }
    
    // If the session moves to completed status
    if (sessionUpdate.status === 'completed' && step === 'waiting_partner_feedback') {
      setAllParticipantsFeedback(sessionUpdate.feedback || {});
      setStep('show_dual_feedback');
    }
  }, [sessionUpdate, step, user, currentSession]);

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

  // captureScreenshot and startLiveTranscription are now handled by TwilioPracticeRoom
  // No need for them in the parent component.

  // initVideoCall is removed as TwilioPracticeRoom handles it.

  const cleanup = () => {
    // Simplified cleanup - TwilioPracticeRoom will manage its own media resources
    // All media refs and intervals previously managed here are now inside TwilioPracticeRoom
    setCurrentSession(null);
    setProductContext('');
    setUserRole(null);
    setFeedback(null);
    setAllParticipantsFeedback({});
    // No need to stop media streams or peer connections here anymore
  };

  const reset = () => {
    cleanup();
    setStep('role_selection');
    setCurrentSession(null);
    setSessionCode('');
    setProductContext('');
    setUserRole(null);
    setAnalyzing(false);
    setFeedback(null);
    setAllParticipantsFeedback({});
    if (onComplete) onComplete(); // Go back to practice hub
  };

  const handleCreateSession = () => {
    if (!productContext.trim()) {
      alert('Enter product');
      return;
    }
    
    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    createSessionMutation.mutate({
      session_code: code,
      module_type: 'sales_roleplay',
      creator_email: user.email,
      creator_name: user.full_name || user.email,
      creator_role: userRole,
      max_participants: 1, // Max 1 partner = 2 total participants (creator + 1)
      status: 'waiting',
      context: productContext,
      webrtc_signals: {} // This field might become obsolete or unused by Twilio, but keeping for compatibility
    });
    
    setSessionCode(code);
    setStep('waiting_partner');
  };

  const handleJoinSession = async (session) => {
    // Determine the role for the joining participant (the current user)
    // The creator_role is the first participant's role. The joining participant takes the opposite.
    const oppositeRole = session.creator_role === 'salesperson' ? 'customer' : 'salesperson';
    
    const newParticipant = {
      email: user.email,
      name: user.full_name || user.email,
      role: oppositeRole,
      joined_at: new Date().toISOString()
    };
    
    // Ensure `participants` is an array and add the new participant
    const updatedParticipants = [...(session.participants || []), newParticipant];

    await updateSessionMutation.mutateAsync({
      sessionId: session.id,
      updates: { participants: updatedParticipants, status: 'active', started_at: new Date().toISOString() }
    });
    
    // Update local state for the current session
    const updatedSession = { ...session, participants: updatedParticipants, status: 'active' };
    setCurrentSession(updatedSession);
    setProductContext(session.context); // Set context for the joining user
    setUserRole(oppositeRole); // Set the role for the joining user
    setStep('roleplay_2person'); // Transition to Twilio room
  };

  const endSessionWithFeedback = async (data) => {
    // FIRST THING: Check forceExit - NO logs, NO delays, just exit
    if (data?.forceExit === true) {
      onComplete?.();
      return;
    }

    const { screenshots, liveTranscript } = data || {};

    // Filter transcript by the current user's spoken lines
    const transcriptText = (liveTranscript || [])
        .filter(t => t.speaker === user.email)
        .map(t => `${userRole}: ${t.text}`)
        .join('\n');

    if (!transcriptText || transcriptText.length < 15) {
      alert('⚠️ No significant speech detected from you for analysis!');
      setAnalyzing(false);
      reset();
      return;
    }

    setAnalyzing(true);

    try {
      const screenshotUrls = [];
      // Only upload a subset of screenshots to save on costs/time for analysis
      for (const screenshot of screenshots.slice(0, Math.min(screenshots.length, 10))) { 
        const { file_url } = await base44.integrations.Core.UploadFile({ file: screenshot });
        screenshotUrls.push(file_url);
      }

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert sales coach. Analyze the following sales roleplay based on the provided product context and transcript. Focus your analysis on the performance of the ${userRole} from this transcript.
        
        Product: ${productContext}
        
        Transcript for ${userRole}:
        ${transcriptText}
        
        Evaluate the participant's sales performance and communication. Provide an overall score (0-100), key strengths, areas for improvement, and actionable next steps.
        `,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number", description: "Overall score out of 100 for the participant's performance." },
            strengths: { type: "array", items: { type: "string" }, description: "Key strengths identified in the performance." },
            improvements: { type: "array", items: { type: "string" }, description: "Areas for improvement with specific suggestions." },
            next_steps: { type: "string", description: "Actionable next steps for skill development." }
          },
          required: ["overall_score", "strengths", "improvements", "next_steps"]
        },
        file_urls: screenshotUrls
      });

      const sessions = await base44.entities.PracticeSession.filter({ id: currentSession.id });
      const latestSession = sessions[0];
      const existingFeedback = latestSession?.feedback || {};
      const existingTranscripts = latestSession?.transcripts || {};

      const updatedFeedback = {
        ...existingFeedback,
        [user.email]: analysis
      };

      const updatedTranscripts = {
        ...existingTranscripts,
        [user.email]: liveTranscript // Store the full transcript for this user's perspective
      };

      await updateSessionMutation.mutateAsync({
        sessionId: currentSession.id,
        updates: {
          feedback: updatedFeedback,
          transcripts: updatedTranscripts
        }
      });

      // Determine if all participants have submitted feedback
      const allParticipants = [
        latestSession.creator_email,
        ...(latestSession.participants?.map(p => p.email) || [])
      ].filter((value, index, self) => self.indexOf(value) === index); // Ensure unique emails

      const allFeedbackSubmitted = allParticipants.every(email => updatedFeedback[email]);

      setFeedback(analysis); // Set feedback for the current user to display
      setAllParticipantsFeedback(updatedFeedback); // Keep track of all feedback

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

    } catch (error) {
      console.error('Error during analysis:', error);
      alert('❌ Analysis failed: ' + error.message);
      reset(); // Fallback to start if analysis fails
    } finally {
      setAnalyzing(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-16 h-16 animate-spin text-blue-500" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><Button onClick={() => base44.auth.redirectToLogin()} className="bg-blue-600 hover:bg-blue-700 text-white"><LogIn className="mr-2" />Sign In</Button></div>;

  if (step === 'role_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <Button onClick={onComplete} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h1 className="text-4xl font-black text-white mb-8 text-center">💼 Sales Roleplay</h1>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Card onClick={() => { setUserRole('salesperson'); setStep('create_session'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
                <CardContent className="p-10 text-center">
                  <Briefcase className="w-20 h-20 mx-auto mb-4" />
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
                <Label htmlFor="product-context">Product/Service *</Label>
                <Input id="product-context" value={productContext} onChange={(e) => setProductContext(e.target.value)} placeholder="e.g., CRM Software" className="h-12" />
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

          <h2 className="text-4xl font-bold text-white mb-6 text-center">Join Session</h2>

          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="border-none shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-2">{session.creator_name} ({session.creator_role})</h3>
                  <p className="text-slate-600 mb-3"><strong>Product:</strong> {session.context}</p>
                  <Button onClick={() => handleJoinSession(session)} className="w-full bg-purple-600">Join as {session.creator_role === 'salesperson' ? 'Customer' : 'Salesperson'}</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {sessions.length === 0 && (
            <Card className="border-none shadow-2xl mt-8">
              <CardContent className="p-16 text-center">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-xl font-bold">No sessions available to join.</p>
                <p className="text-slate-600 mt-2">Try creating one or wait for others.</p>
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
            <h2 className="text-4xl font-bold mb-4">Waiting for a partner...</h2>
            <div className="bg-slate-100 rounded-xl p-6 mb-6">
              <p className="text-sm text-slate-600 mb-2">Share this code with your partner:</p>
              <div className="text-5xl font-black text-blue-600">{sessionCode}</div>
              <Button onClick={() => { navigator.clipboard.writeText(sessionCode); alert('✅ Copied!'); }} variant="outline" size="sm" className="mt-3">
                <Copy className="w-4 h-4 mr-2" />Copy
              </Button>
            </div>
            <Button onClick={reset} variant="outline" className="text-red-500 border-red-500 hover:bg-red-50">Cancel Session</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'roleplay_2person') {
    // currentSession, userRole, and productContext are available here
    // TwilioPracticeRoom manages its own media, recording, and transcription.
    return (
      <TwilioPracticeRoom
        session={currentSession}
        user={user}
        userRole={userRole}
        onEnd={endSessionWithFeedback}
        moduleType="sales_roleplay"
        productContext={productContext}
      />
    );
  }

  if (analyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <Card className="max-w-md border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 text-white animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white">Analyzing your performance...</h2>
            <p className="text-white/70">This might take a moment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'waiting_partner_feedback') {
    const isMyFeedbackAvailable = !!feedback;
    const partnerEmail = currentSession.participants?.find(p => p.email !== user.email)?.email || currentSession.creator_email; // Assuming current user is not creator if they are partner
    const isPartnerFeedbackAvailable = !!allParticipantsFeedback[partnerEmail];

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <Card className="max-w-md border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 text-white animate-spin mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">Waiting for partner's feedback...</h2>
            <p className="text-white/70">Your feedback is ready, but we're waiting for your partner to complete their analysis before showing both reports.</p>
            {isMyFeedbackAvailable && (
              <p className="text-green-300 mt-4"><CheckCircle2 className="inline mr-2" />Your analysis is complete!</p>
            )}
            {isPartnerFeedbackAvailable && (
              <p className="text-green-300 mt-2"><CheckCircle2 className="inline mr-2" />Partner's analysis is also complete!</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'show_dual_feedback') {
    const creatorEmail = currentSession?.creator_email;
    const partnerEmail = currentSession?.participants?.find(p => p.email !== creatorEmail)?.email;

    const creatorFeedback = allParticipantsFeedback[creatorEmail];
    const partnerFeedback = allParticipantsFeedback[partnerEmail];

    const creatorRole = currentSession?.creator_role;
    const partnerRole = creatorRole === 'salesperson' ? 'customer' : 'salesperson';

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold text-white text-center mb-8">Dual Performance Review</h2>

          {creatorFeedback && (
            <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
              <CardContent className="p-8">
                <h3 className="text-3xl font-bold mb-4 flex items-center">
                  <User className="w-8 h-8 mr-3" />
                  {currentSession.creator_email === user.email ? `Your Feedback (${creatorRole})` : `Partner's Feedback (${creatorRole})`}
                </h3>
                <div className="text-6xl font-black mb-2">{creatorFeedback.overall_score}</div>
                <p className="text-xl opacity-80">out of 100</p>

                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xl font-semibold mb-2"><CheckCircle2 className="w-5 h-5 inline mr-2" />Strengths</h4>
                    <ul className="list-disc list-inside space-y-1 pl-2">{creatorFeedback.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2"><TrendingUp className="w-5 h-5 inline mr-2" />Improvements</h4>
                    <ul className="list-disc list-inside space-y-1 pl-2">{creatorFeedback.improvements?.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                  </div>
                </div>
                <p className="mt-4 text-lg font-semibold">Next Steps: {creatorFeedback.next_steps}</p>
              </CardContent>
            </Card>
          )}

          {partnerFeedback && (
            <Card className="border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
              <CardContent className="p-8">
                <h3 className="text-3xl font-bold mb-4 flex items-center">
                  <User className="w-8 h-8 mr-3" />
                  {partnerEmail === user.email ? `Your Feedback (${partnerRole})` : `Partner's Feedback (${partnerRole})`}
                </h3>
                <div className="text-6xl font-black mb-2">{partnerFeedback.overall_score}</div>
                <p className="text-xl opacity-80">out of 100</p>

                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xl font-semibold mb-2"><CheckCircle2 className="w-5 h-5 inline mr-2" />Strengths</h4>
                    <ul className="list-disc list-inside space-y-1 pl-2">{partnerFeedback.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold mb-2"><TrendingUp className="w-5 h-5 inline mr-2" />Improvements</h4>
                    <ul className="list-disc list-inside space-y-1 pl-2">{partnerFeedback.improvements?.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                  </div>
                </div>
                <p className="mt-4 text-lg font-semibold">Next Steps: {partnerFeedback.next_steps}</p>
              </CardContent>
            </Card>
          )}

          <Button onClick={onComplete} className="w-full bg-white text-blue-600 py-6 text-xl font-bold">
            <Sparkles className="w-6 h-6 mr-2" />Back to Hub
          </Button>
        </div>
      </div>
    );
  }


  // The original 'feedback' step was likely for solo feedback.
  // Now with dual feedback and a dedicated 'show_dual_feedback' step,
  // this 'feedback' step might become less critical or used in a different context.
  // Keeping it for displaying individual feedback if needed before dual display.
  // The current flow skips this if the partner has also submitted feedback.
  if (step === 'feedback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-none shadow-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4" />
              <div className="text-7xl font-black mb-2">{feedback?.overall_score}</div>
              <p className="text-xl opacity-80">out of 100</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl bg-green-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-green-900 mb-4"><CheckCircle2 className="w-6 h-6 inline mr-2" />Strengths</h3>
                <ul className="space-y-2">{feedback?.strengths?.map((s, i) => <li key={i} className="text-green-800">✓ {s}</li>)}</ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-orange-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-orange-900 mb-4"><TrendingUp className="w-6 h-6 inline mr-2" />Improvements</h3>
                <ul className="space-y-2">{feedback?.improvements?.map((i, idx) => <li key={idx} className="text-orange-800">→ {i}</li>)}</ul>
              </CardContent>
            </Card>
          </div>
          
          {/* Next steps from feedback */}
          {feedback?.next_steps && (
            <Card className="border-none shadow-xl bg-blue-50">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4"><Sparkles className="w-6 h-6 inline mr-2" />Next Steps</h3>
                <p className="text-blue-800">{feedback.next_steps}</p>
              </CardContent>
            </Card>
          )}

          <Button onClick={onComplete} className="w-full bg-white text-blue-600 py-6 text-xl font-bold">
            <Sparkles className="w-6 h-6 mr-2" />Back to Hub
          </Button>
        </div>
      </div>
    );
  }
  
  // The 'live_session' block is completely removed as 'roleplay_2person' replaces it.

  return null;
}