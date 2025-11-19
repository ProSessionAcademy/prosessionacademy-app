
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserCheck, ArrowLeft, Loader2, LogIn, CheckCircle2, TrendingUp, Sparkles, Mic } from 'lucide-react';
import * as THREE from 'three';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import TwilioPracticeRoom from '@/components/practice/TwilioPracticeRoom';

export default function ManagerInterviewSimulator({ onComplete, selectedRole }) {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('interview'); // Can be 'interview', 'interview_2person', 'feedback', 'waiting_partner_feedback'
  const [interviewActive, setInterviewActive] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  
  // State for 2-person interview specific data
  const [userRole, setUserRole] = useState('interviewer'); // The role of the current user in the session
  const [currentSession, setCurrentSession] = useState(null); // The practice session object

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const canvasRef = useRef(null); // For 3D candidate
  const sceneRef = useRef(null);

  // Initialize query client for mutations
  const queryClient = useQueryClient();

  // Define the mutation for updating the session
  const updateSessionMutation = useMutation({
      mutationFn: async ({ sessionId, updates }) => {
          // This assumes `base44.entities.PracticeSession.update` exists
          const response = await base44.entities.PracticeSession.update(sessionId, updates);
          return response;
      },
      onSuccess: () => {
          // Invalidate queries or refetch relevant data if needed
          // queryClient.invalidateQueries(['practiceSession', currentSession?.id]); // Example invalidation
      },
      onError: (error) => {
          console.error("Error updating session:", error);
      },
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchUser();

    return () => {
      stopListening();
      if (synthRef.current) synthRef.current.cancel();
      if (sceneRef.current) sceneRef.current.renderer?.dispose();
    };
  }, []);

  const init3DCandidate = () => {
    if (!canvasRef.current) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e293b);
    const camera = new THREE.PerspectiveCamera(75, canvasRef.current.clientWidth / canvasRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 3;
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 1, 2);
    scene.add(light);
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const headGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    scene.add(head);
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x4a5568 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.5;
    scene.add(body);
    sceneRef.current = { scene, camera, renderer, head, body };
    const animate = () => { requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();
  };

  const startListening = () => {
    if (aiSpeaking) {
      alert('⚠️ Wait for candidate');
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
      console.log('🎤 MANAGER LISTENING');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (text && text.trim()) {
        console.log('✅ MANAGER HEARD:', text);
        finalText = text.trim();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      if (event.error === 'not-allowed') {
        alert('⚠️ Microphone denied!');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🛑 MANAGER ENDED');
      setIsListening(false);
      if (finalText) {
        setConversation(prev => [...prev, { role: 'interviewer', text: finalText }]);
        handleAIResponse(finalText);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error('Failed:', error);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

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
    setConversation(prev => [...prev, { role: 'candidate', text }]);
  };

  const handleAIResponse = async (userQuestion) => {
    try {
      if (!candidateProfile) {
        const profile = await base44.integrations.Core.InvokeLLM({
          prompt: `Create ONE realistic candidate for ${selectedRole}:

- Real name (e.g., "Sarah Martinez")
- Age (e.g., 28)
- Years experience (e.g., 5)
- Previous company name
- Specific achievement

Return profile.`,
          response_json_schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" },
              years_experience: { type: "number" },
              previous_company: { type: "string" },
              key_achievement: { type: "string" }
            }
          }
        });
        
        setCandidateProfile(profile);
      }

      const profile = candidateProfile || { name: "Candidate", years_experience: 5 };
      const conversationHistory = conversation.slice(-4).map(c => `${c.role}: ${c.text}`).join('\n');
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are ${profile.name} interviewing for ${selectedRole}.

${profile.years_experience} years experience at ${profile.previous_company || 'previous company'}.

RECENT CONVERSATION:
${conversationHistory}

INTERVIEWER ASKED: "${userQuestion}"

Answer THIS specific question naturally as ${profile.name}. Under 45 words.`
      });
      
      speak(response);
    } catch (error) {
      console.error('AI error:', error);
      setAiSpeaking(false);
    }
  };

  const startInterview = async () => {
    setInterviewActive(true);
    init3DCandidate();
    const greeting = `Hello, I'm here for the ${selectedRole} position. Thanks for this opportunity.`;
    speak(greeting);
  };

  const endInterview = async () => {
    setInterviewActive(false);
    stopListening();
    
    const transcriptText = conversation.map(c => `${c.role}: ${c.text}`).join('\n');
    
    if (!transcriptText || transcriptText.length < 30) {
      alert('⚠️ Too short!');
      resetSession();
      return;
    }

    setAnalyzing(true);
    try {
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze manager's interview for ${selectedRole}:\n\n${transcriptText}\n\nEvaluate question quality, listening, professionalism.`,
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
      resetSession();
    } finally {
      setAnalyzing(false);
    }
  };

  const endInterviewForBoth = async (data) => {
    const { screenshots, liveTranscript } = data;

    setAnalyzing(true);

    try {
      const screenshotUrls = [];
      for (const screenshot of screenshots.slice(0, 10)) { // Limit screenshots to upload for performance
        const { file_url } = await base44.integrations.Core.UploadFile({ file: screenshot });
        screenshotUrls.push(file_url);
      }

      const transcriptText = liveTranscript.map(t => `${t.role}: ${t.text}`).join('\n');

      const myAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the interviewer in this manager interview:\n\nTranscript:\n${transcriptText}\n\nEvaluate question quality, listening, professionalism.`,
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

  const resetSession = () => {
    setStep('interview');
    setInterviewActive(false);
    setConversation([]);
    setFeedback(null);
    setIsListening(false);
    setCandidateProfile(null);
    setAiSpeaking(false);
    setCurrentSession(null); // Clear session
    setUserRole('interviewer'); // Reset user role for next session
    if (synthRef.current) synthRef.current.cancel();
  };

  if (!user) return <div className="min-h-screen flex items-center justify-center"><Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button></div>;

  if (analyzing) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card><CardContent className="p-12 text-center"><Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" /><h3 className="text-2xl font-bold">Analyzing...</h3></CardContent></Card>
    </div>
  );

  if (step === 'waiting_partner_feedback') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card><CardContent className="p-12 text-center">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" />
          <h3 className="text-2xl font-bold">Waiting for partner's feedback...</h3>
          <p className="text-gray-500 mt-2">Your feedback has been saved.</p>
          <Button onClick={onComplete} className="mt-6">Return to Dashboard</Button>
        </CardContent></Card>
      </div>
    );
  }

  if (step === 'interview_2person') {
    return (
      <TwilioPracticeRoom
        session={currentSession}
        userRole={userRole}
        onEnd={endInterviewForBoth}
        moduleType="manager_interview"
      />
    );
  }

  if (step === 'feedback' && feedback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="border-none shadow-2xl bg-gradient-to-br from-pink-600 to-rose-600 text-white">
            <CardContent className="p-8 text-center">
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

          <div className="flex gap-4">
            <Button onClick={resetSession} className="flex-1 bg-white text-pink-600 py-6 text-xl font-bold">
              <Sparkles className="w-6 h-6 mr-2" />Again
            </Button>
            <Button onClick={onComplete} variant="outline" className="flex-1 py-6 text-xl font-bold">Back</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-pink-900 to-rose-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">👔 Manager - {selectedRole}</h1>
            <p className="text-pink-200">Ask questions using voice</p>
          </div>
          {!interviewActive && (
            <Button onClick={onComplete} variant="outline" className="bg-white/10 text-white">
              <ArrowLeft className="w-5 h-5 mr-2" />Exit
            </Button>
          )}
        </div>

        <Card className="border-none shadow-2xl">
          <CardContent className="p-0">
            <div className="bg-slate-800 text-white p-4 text-center">
              <h3 className="font-bold">AI CANDIDATE ({selectedRole})</h3>
            </div>
            {/* Original 3D candidate view */}
            <canvas ref={canvasRef} className="w-full aspect-video bg-slate-900" />
          </CardContent>
        </Card>

        {conversation.length > 0 && (
          <Card className="border-none shadow-xl bg-white/95">
            <CardContent className="p-6">
              <h3 className="font-bold text-xl mb-4">📝 Interview Transcript</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {conversation.map((c, i) => (
                  <div key={i} className={`p-3 rounded-lg ${
                    c.role === 'interviewer' ? 'bg-pink-600 text-white' : 'bg-slate-700 text-slate-100'
                  }`}>
                    <p className="text-sm font-bold mb-1">
                      {c.role === 'interviewer' ? 'You (Interviewer):' : 'Candidate (AI):'}
                    </p>
                    <p>{c.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-2xl">
          <CardContent className="p-8">
            {!interviewActive ? (
              <div className="text-center space-y-4">
                <Button onClick={startInterview} className="bg-gradient-to-r from-green-600 to-emerald-600 py-8 px-12 text-2xl font-bold">
                  <UserCheck className="w-8 h-8 mr-3" />Start Interview
                </Button>
                {/* Example button to start a 2-person session. In a real app, this would be triggered by a session join/create flow */}
                <Button onClick={() => { 
                  // Placeholder for setting up a 2-person session
                  // In a real app, `currentSession` would be fetched or created
                  setCurrentSession({ id: 'mock-twilio-session-123', creator_email: user.email, webrtc_signals: {} }); 
                  setUserRole('interviewer');
                  setStep('interview_2person');
                }} className="bg-gradient-to-r from-purple-600 to-indigo-600 py-8 px-12 text-2xl font-bold ml-4">
                  <UserCheck className="w-8 h-8 mr-3" />Start 2-Person Interview
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 border-none">
                  <CardContent className="p-6">
                    <button
                      onClick={isListening ? stopListening : startListening}
                      disabled={aiSpeaking}
                      className={`w-full py-12 rounded-2xl font-bold text-3xl transition-all shadow-2xl ${
                        aiSpeaking ? 'bg-slate-400 text-white cursor-not-allowed' :
                        isListening ? 'bg-red-600 text-white animate-pulse' :
                        'bg-white text-blue-600'
                      }`}
                    >
                      <Mic className={`w-14 h-14 mx-auto mb-3 ${isListening ? 'animate-pulse' : ''}`} />
                      {aiSpeaking ? '⏳ CANDIDATE ANSWERING' :
                       isListening ? '🔴 CLICK TO STOP' :
                       '🎤 ASK QUESTION'}
                    </button>
                    <p className="text-white text-center mt-3 text-base font-semibold">
                      {aiSpeaking ? 'Candidate is answering...' :
                       isListening ? '🗣️ Ask your question, click when done' :
                       '📱 Click → Ask → Click to send'}
                    </p>
                  </CardContent>
                </Card>

                {aiSpeaking && (
                  <Card className="bg-purple-600 border-none animate-pulse">
                    <CardContent className="p-6 text-center">
                      <p className="text-white text-2xl font-bold">🗣️ Candidate is answering your question...</p>
                    </CardContent>
                  </Card>
                )}
                
                <Button onClick={endInterview} variant="outline" className="w-full bg-red-600 text-white py-6 text-xl font-bold" disabled={conversation.length < 2 || isListening || aiSpeaking}>
                  End Interview & Get Feedback
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
