
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, ArrowLeft, Loader2, User, CheckCircle2, TrendingUp, Mic, StopCircle, Users, Plus, Copy, Sparkles, Camera, Video, UserCheck, UserX, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import TwilioPracticeRoom from '@/components/practice/TwilioPracticeRoom'; // Added import

const AI_PERSON_IMAGES = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
];

export default function DifficultConversationSimulator({ onComplete }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mode, setMode] = useState(null);
  const [step, setStep] = useState('mode_selection');
  const [scenarioDescription, setScenarioDescription] = useState('');
  const [myRole, setMyRole] = useState('');
  const [aiPersonImage] = useState(AI_PERSON_IMAGES[Math.floor(Math.random() * AI_PERSON_IMAGES.length)]);

  const [conversation, setConversation] = useState([]);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [screenshots, setScreenshots] = useState([]);

  const [currentSession, setCurrentSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState([]);

  const videoRefMe = useRef(null);
  const videoRefPartner = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const peerConnectionRef = useRef(null);
  const sessionRef = useRef(null);
  const screenshotIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const liveRecognitionRef = useRef(null);
  const isLiveRecordingRef = useRef(false);

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
    queryKey: ['practiceSessions', 'difficult_conversation'],
    queryFn: () => base44.entities.PracticeSession.filter({ module_type: 'difficult_conversation', status: 'waiting' }),
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
    enabled: !!currentSession && (step === 'waiting_partner' || step === 'conversation_2person' || step === 'waiting_partner_feedback' || step === 'waiting_approval'),
    refetchInterval: 500
  });

  useEffect(() => {
    if (sessionUpdate?.participants?.length >= 1 && step === 'waiting_partner') {
      console.log('✅ Partner joined conversation!');
      setCurrentSession(sessionUpdate);
      setStep('conversation_2person');
      // Removed: setTimeout(() => initVideoCall(sessionUpdate), 300); // Handled by TwilioPracticeRoom
    }

    // DETECT APPROVAL: If I was waiting for approval and now I'm in participants, join the session
    if (step === 'waiting_approval' && sessionUpdate?.participants?.some(p => p.email === user?.email)) {
      console.log('✅ Approved! Joining session...');
      setCurrentSession(sessionUpdate);
      setStep('conversation_2person');
      // Removed: setTimeout(() => initVideoCall(sessionUpdate), 300); // Handled by TwilioPracticeRoom
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
        console.log('✅ Both feedbacks ready!');
        setCurrentSession(sessionUpdate);
        setStep('show_dual_feedback');
      }
    }
  }, [sessionUpdate, step, user?.email]);

  // Removed the WebRTC signaling useEffect:
  // useEffect(() => {
  //   if (!sessionUpdate || mode !== '2person' || step !== 'conversation_2person') return;
  //   if (!mediaStreamRef.current || !peerConnectionRef.current) return;
  //   if (!sessionRef.current) return;
  //   const isCreator = sessionRef.current.creator_email === user?.email;
  //   const signals = sessionUpdate.webrtc_signals || {};
  //   if (!isCreator && signals.offer && peerConnectionRef.current.signalingState === 'stable') {
  //     peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signals.offer))
  //       .then(() => peerConnectionRef.current.createAnswer())
  //       .then(answer => peerConnectionRef.current.setLocalDescription(answer))
  //       .then(async () => {
  //         const sessions = await base44.entities.PracticeSession.filter({ id: sessionRef.current.id });
  //         const latest = sessions[0];
  //         await updateSessionMutation.mutateAsync({
  //           sessionId: sessionRef.current.id,
  //           updates: {
  //             webrtc_signals: {
  //               ...(latest.webrtc_signals || {}),
  //               answer: peerConnectionRef.current.localDescription.toJSON()
  //             }
  //           }
  //         });
  //       })
  //       .catch(e => console.error(e));
  //   }
  //   if (isCreator && signals.answer && peerConnectionRef.current.signalingState === 'have-local-offer') {
  //     peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signals.answer))
  //       .catch(e => console.error(e));
  //   }
  //   if (peerConnectionRef.current.remoteDescription) {
  //     const candidates = isCreator ? signals.partner_candidates : signals.creator_candidates;
  //     if (Array.isArray(candidates)) {
  //       candidates.forEach(c => {
  //         if (c) {
  //           peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
  //         }
  //       });
  //     }
  //   }
  // }, [sessionUpdate, mode, step, user?.email]);

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
    
    if (!video.videoWidth || !video.videoHeight) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
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
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          if (text && text.trim()) {
            console.log('✅ 2-PERSON SPEECH:', text);
            liveTranscriptParts.push({
              speaker: user.email,
              text: text.trim(),
              timestamp: new Date().toISOString()
            });
            setLiveTranscript([...liveTranscriptParts]);
          }
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
          } catch (e) {}
        }, 100);
      }
    };

    try {
      recognition.start();
      liveRecognitionRef.current = recognition;
      console.log('🎤 Live transcription started');
    } catch (e) {
      console.error('Failed to start:', e);
      alert('⚠️ Failed to start microphone. Please check permissions.');
    }
  };

  const initVideoCall = async (session) => {
    // This function is no longer called in 2-person mode
    if (!session || !user) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280, max: 1920 }, 
          height: { ideal: 720, max: 1080 },
          facingMode: 'user'
        }, 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      if (videoRefMe.current) {
        videoRefMe.current.srcObject = stream;
        videoRefMe.current.muted = true;
        videoRefMe.current.playsInline = true;
        await videoRefMe.current.play();
      }
      
      mediaStreamRef.current = stream;

      screenshotIntervalRef.current = setInterval(async () => {
        const screenshot = await captureScreenshot();
        if (screenshot) setScreenshots(prev => [...prev, screenshot]);
      }, 3000);

      startLiveTranscription();
      
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: "turn:numb.viagenie.ca",
            username: "webrtc@live.com",
            credential: "muazkh"
          }
        ],
        iceCandidatePoolSize: 10
      });
      
      peerConnectionRef.current = pc;
      stream.getTracks().forEach(track => {
        console.log('➕ Adding track:', track.kind);
        pc.addTrack(track, stream);
      });
      
      pc.ontrack = (e) => {
        console.log('📥 Remote track:', e.track.kind);
        if (videoRefPartner.current && e.streams[0]) {
          videoRefPartner.current.srcObject = e.streams[0];
          videoRefPartner.current.playsInline = true;
          videoRefPartner.current.volume = 1.0;
          videoRefPartner.current.play().then(() => {
            console.log('✅ Remote playing');
            setRemoteVideoReady(true);
          }).catch(e => console.error('Video play error:', e));
        }
      };
      
      const isCreator = session.creator_email === user?.email;
      
      pc.onicecandidate = async (e) => {
        if (e.candidate) {
          console.log('🧊 ICE candidate:', e.candidate.type, '| Protocol:', e.candidate.protocol, '| Address:', e.candidate.address);
          try {
            const sessions = await base44.entities.PracticeSession.filter({ id: session.id });
            const latest = sessions[0];
            if (!latest) return;
            
            const sigs = latest.webrtc_signals || {};
            const myKey = isCreator ? 'creator_candidates' : 'partner_candidates';
            
            await updateSessionMutation.mutateAsync({
              sessionId: session.id,
              updates: {
                webrtc_signals: {
                  ...sigs,
                  [myKey]: [...(sigs[myKey] || []), e.candidate.toJSON()]
                }
              }
            });
          } catch (e) {
            console.error('❌ ICE error:', e);
          }
        } else {
          console.log('🧊 ICE gathering complete');
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🔌 ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') {
          console.error('❌ ICE connection failed - attempting ICE restart');
          pc.restartIce();
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('🔗 Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log('✅ Peer connection established successfully!');
          pc.getStats(null).then(stats => {
            stats.forEach(stat => {
              if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
                console.log('✅ Active connection type:', stat.currentRoundTripTime ? 'relay (TURN)' : 'direct (STUN)');
              }
            });
          });
        }
      };
      
      if (isCreator) {
        setTimeout(async () => {
          console.log('📤 Creating offer...');
          const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
          await pc.setLocalDescription(offer);
          console.log('✅ Offer set');
          
          await updateSessionMutation.mutateAsync({
            sessionId: session.id,
            updates: {
              webrtc_signals: {
                offer: pc.localDescription.toJSON(),
                answer: null,
                creator_candidates: [],
                partner_candidates: []
              }
            }
          });
          console.log('✅ Offer sent');
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ Media error:', error);
      alert('Camera Error: ' + error.message);
    }
  };

  const cleanup = () => {
    isLiveRecordingRef.current = false;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (screenshotIntervalRef.current) {
      clearInterval(screenshotIntervalRef.current);
      screenshotIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (liveRecognitionRef.current) {
      try { liveRecognitionRef.current.stop(); } catch (e) {}
      liveRecognitionRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setRemoteVideoReady(false);
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
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let finalText = '';

    recognition.onstart = () => {
      console.log('🎤 LISTENING');
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (text.trim()) {
        console.log('✅ HEARD:', text);
        finalText = text.trim();
      }
    };

    recognition.onerror = (event) => {
      console.error('Error:', event.error);
      if (event.error === 'not-allowed') {
        alert('⚠️ Microphone denied! Enable in settings.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log('🛑 ENDED, finalText:', finalText);
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
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
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
      const oppositeRole = myRole === 'boss' ? 'employee' : 'boss';
      const conversationHistory = conversation.slice(-4).map(c => `${c.role === 'user' ? myRole : oppositeRole}: ${c.text}`).join('\n');
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `CRITICAL: This is a DIFFICULT conversation practice. "${scenarioDescription}"

You are the ${oppositeRole}. This is NOT a normal conversation.

IMPORTANT INSTRUCTIONS:
- If the ${myRole} admits fault or wrongdoing, you MUST react accordingly - be upset, disappointed, critical, or stern
- If they screwed up, DO NOT be understanding or sympathetic
- Express frustration, concern, or anger as appropriate to the situation
- Challenge them, ask tough follow-up questions
- Make them work to resolve the situation
- This is difficult conversation practice - BE DIFFICULT

RECENT CONVERSATION:
${conversationHistory}

${myRole} just said: "${userText}"

React as a real ${oppositeRole} would in this difficult situation. Show emotion - frustration, disappointment, concern. Under 35 words.`
      });
      
      speak(response);
    } catch (error) {
      console.error('AI error:', error);
      setAiSpeaking(false);
    }
  };

  const startConversation = async () => {
    try {
      const oppositeRole = myRole === 'boss' ? 'employee' : 'boss';
      const initialMessage = await base44.integrations.Core.InvokeLLM({
        prompt: `CRITICAL: This is DIFFICULT conversation practice: "${scenarioDescription}"

You are the ${oppositeRole}. This should be TENSE and CHALLENGING.

INSTRUCTIONS:
- Start with concern, frustration, or disappointment
- Make it clear this is a serious situation
- Set a stern, critical tone
- DO NOT be friendly or sympathetic
- Express the gravity of the situation

Start the difficult conversation showing appropriate negative emotion. Under 30 words.`
      });
      
      speak(initialMessage);
      
      if (mediaStreamRef.current) {
        screenshotIntervalRef.current = setInterval(async () => {
          const screenshot = await captureScreenshot();
          if (screenshot) setScreenshots(prev => [...prev, screenshot]);
        }, 3000);
      }
    } catch (error) {
      alert('❌ Failed to start: ' + error.message);
    }
  };

  const endConversation = async () => {
    if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    if (synthRef.current) synthRef.current.cancel();

    const transcriptText = conversation.map(c => `${c.role === 'user' ? myRole : (myRole === 'boss' ? 'employee' : 'boss')}: ${c.text}`).join('\n');

    if (!transcriptText || transcriptText.length < 20) {
      alert('⚠️ Too short!');
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
        prompt: `Analyze difficult conversation:

SCENARIO: "${scenarioDescription}"
ROLE: ${myRole}

CONVERSATION:
${transcriptText}

Evaluate empathy, de-escalation, communication.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            body_language_notes: {type: "string" },
            next_steps: { type: "string" }
          }
        },
        file_urls: screenshotUrls.length > 0 ? screenshotUrls : undefined
      });

      setFeedback(analysis);
      setStep('feedback');
    } catch (error) {
      alert('❌ Failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, 
        audio: true
      });
      
      console.log('✅ Camera enabled:', stream.getTracks());
      
      if (videoRefMe.current) {
        videoRefMe.current.srcObject = stream;
        videoRefMe.current.muted = true;
        videoRefMe.current.playsInline = true;
        try {
          await videoRefMe.current.play();
          console.log('✅ Local video preview playing');
        } catch (e) {
          console.error('Video play error:', e);
        }
      }
      
      mediaStreamRef.current = stream;
      return true;
    } catch (error) {
      console.error('Camera error:', error);
      alert('❌ Camera denied: ' + error.message);
      return false;
    }
  };

  const endSessionWithFeedback = async (data) => {
    const { screenshots, liveTranscript } = data; // Modified to accept data object

    // Removed cleanup logic for liveRecordingRef, screenshotIntervalRef, liveRecognitionRef
    // isLiveRecordingRef.current = false;
    // if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    // if (liveRecognitionRef.current) {
    //   liveRecognitionRef.current.stop();
    //   liveRecognitionRef.current = null;
    // }

    // Adjusted transcript mapping based on prompt's example
    const transcriptText = liveTranscript.map(t => `${userRole}: ${t.text}`).join('\n');

    if (!transcriptText || transcriptText.length < 15) {
      alert('⚠️ NO SPEECH DETECTED! Please speak during the session.');
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
        prompt: `Analyze ${userRole} in difficult conversation:\n\nScenario: "${scenarioDescription}"\n\nTranscript:\n${transcriptText}\n\nEvaluate empathy, communication.`,
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
    if (!scenarioDescription.trim()) {
      alert('Describe scenario');
      return;
    }
    if (!userRole) {
      alert('Select your role');
      return;
    }

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    createSessionMutation.mutate({
      session_code: code,
      module_type: 'difficult_conversation',
      creator_email: user.email,
      creator_name: user.full_name || user.email,
      creator_role: userRole,
      max_participants: 1,
      status: 'waiting',
      context: scenarioDescription,
      webrtc_signals: {},
      pending_participants: []
    });

    setSessionCode(code);
    setStep('waiting_partner');
  };

  const handleJoinSession = async (session) => {
    const oppositeRole = session.creator_role === 'boss' ? 'employee' : 'boss';

    const pendingRequest = {
      email: user.email,
      name: user.full_name || user.email,
      role: oppositeRole,
      requested_at: new Date().toISOString()
    };

    await updateSessionMutation.mutateAsync({
      sessionId: session.id,
      updates: { 
        pending_participants: [...(session.pending_participants || []), pendingRequest]
      }
    });

    setCurrentSession(session);
    setScenarioDescription(session.context);
    setUserRole(oppositeRole);
    setStep('waiting_approval');
  };

  const handleApproveParticipant = async (participantEmail, participantName, participantRole) => {
    const approvedParticipant = {
      email: participantEmail,
      name: participantName,
      role: participantRole,
      joined_at: new Date().toISOString()
    };

    const updatedPending = sessionUpdate.pending_participants.filter(p => p.email !== participantEmail);
    const updatedParticipants = [...(sessionUpdate.participants || []), approvedParticipant];

    await updateSessionMutation.mutateAsync({
      sessionId: currentSession.id,
      updates: {
        participants: updatedParticipants,
        pending_participants: updatedPending,
        status: 'active',
        started_at: new Date().toISOString()
      }
    });
  };

  const handleRejectParticipant = async (participantEmail) => {
    const updatedPending = sessionUpdate.pending_participants.filter(p => p.email !== participantEmail);

    await updateSessionMutation.mutateAsync({
      sessionId: currentSession.id,
      updates: {
        pending_participants: updatedPending
      }
    });
  };

  const reset = () => {
    cleanup();
    setMode(null);
    setStep('mode_selection');
    setConversation([]);
    setFeedback(null);
    setScenarioDescription('');
    setMyRole('');
    setCurrentSession(null);
    setScreenshots([]);
    setAiSpeaking(false);
    setIsListening(false);
    setLiveTranscript([]);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-16 h-16 animate-spin" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button></div>;

  if (step === 'mode_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-rose-900 p-4 md:p-6 flex items-center justify-center">
        <div className="max-w-4xl w-full">
          <Button onClick={onComplete} variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 text-center">💬 Difficult Conversations</h1>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('solo'); setStep('setup_solo'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-red-600 to-rose-600 text-white">
                <CardContent className="p-8">
                  <User className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">AI Conversation</h3>
                  <p className="text-sm text-center opacity-90">Talk with AI person, get feedback</p>
                  <Button className="w-full mt-6 bg-white text-red-600 font-bold">Start AI Mode</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('2person'); setStep('setup_2person'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <CardContent className="p-8">
                  <Users className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">2-Person Practice</h3>
                  <p className="text-sm text-center opacity-90">Practice with a partner</p>
                  <Button className="w-full mt-6 bg-white text-purple-600 font-bold">Find Partner</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'setup_solo') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-rose-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Button onClick={() => setStep('mode_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Solo AI Setup</h2>

              <div>
                <Label htmlFor="scenario">Describe Situation *</Label>
                <Textarea id="scenario" value={scenarioDescription} onChange={(e) => setScenarioDescription(e.target.value)} placeholder="e.g., Laying off an employee, Delivering bad news..." rows={4} />
              </div>

              <div>
                <Label>Your Role *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => setMyRole('boss')} variant={myRole === 'boss' ? 'default' : 'outline'} className="h-16 text-lg">👔 Boss</Button>
                  <Button onClick={() => setMyRole('employee')} variant={myRole === 'employee' ? 'default' : 'outline'} className="h-16 text-lg">🙋 Employee</Button>
                </div>
              </div>

              <Button 
                onClick={async () => { 
                  const success = await enableCamera();
                  if (success && mediaStreamRef.current) { 
                    setStep('conversation_solo'); 
                    startConversation(); 
                  } 
                }} 
                disabled={!scenarioDescription.trim() || !myRole || !user} 
                className="w-full bg-red-600 py-6 text-xl font-bold"
              >
                <Camera className="w-6 h-6 mr-2" />Start AI Conversation
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'conversation_solo') {
    if (analyzing) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-24 h-24 animate-spin mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-2">AI Analyzing...</h2>
              <p className="text-slate-600">Processing {screenshots.length} screenshots & transcript...</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const oppositeRole = myRole === 'boss' ? 'employee' : 'boss';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-rose-900 p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">💬 {scenarioDescription}</h1>
            <Button onClick={reset} variant="destructive" className="bg-red-600 hover:bg-red-700">
              <XCircle className="w-5 h-5 mr-2" />
              Force Exit
            </Button>
          </div>

          <p className="text-red-200 text-center text-lg">You: {myRole} • AI: {oppositeRole}</p>

          <canvas ref={canvasRef} className="hidden" />

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-none shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-red-800 text-white p-3 text-center">
                  <h3 className="font-bold text-lg">YOU ({myRole})</h3>
                </div>
                <div className="aspect-video bg-slate-900 relative">
                  <video ref={videoRefMe} autoPlay muted playsInline className="w-full h-full object-cover" />
                  {!mediaStreamRef.current && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
                      <Camera className="w-16 h-16 animate-pulse" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-slate-800 text-white p-3 text-center">
                  <h3 className="font-bold text-lg">AI ({oppositeRole})</h3>
                </div>
                <div className="aspect-video bg-slate-900">
                  <img src={aiPersonImage} alt="AI Person" className="w-full h-full object-cover" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-blue-50 border-2 border-blue-400">
            <CardContent className="p-4 text-center">
              <p className="text-blue-900 font-semibold">
                📸 AI capturing screenshots every 3s • {screenshots.length} captured so far
              </p>
            </CardContent>
          </Card>

          {conversation.length > 0 && (
            <Card className="border-none shadow-xl bg-white/95">
              <CardContent className="p-6">
                <h3 className="font-bold text-2xl mb-4 flex items-center gap-2">
                  <MessageSquare className="w-7 h-7 text-red-600" />
                  Conversation ({conversation.length} exchanges)
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {conversation.map((msg, i) => (
                    <div key={i} className={`p-4 rounded-xl ${msg.role === 'user' ? 'bg-red-600 text-white' : 'bg-slate-700 text-white'}`}>
                      <p className="text-sm font-bold mb-2">{msg.role === 'user' ? `You (${myRole}):` : `AI (${oppositeRole}):`}</p>
                      <p className="text-lg">{msg.text}</p>
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
                className={`w-full py-12 rounded-2xl font-bold text-3xl transition-all shadow-2xl 
                  ${aiSpeaking ? 'bg-slate-400 text-white cursor-not-allowed' :
                    isListening ? 'bg-red-600 text-white scale-95 animate-pulse' : 
                    'bg-white text-green-600 hover:scale-105'}`
                }
              >
                <Mic className={`w-14 h-14 mx-auto mb-3 ${isListening ? 'animate-pulse' : ''}`} />
                {aiSpeaking ? '⏳ AI SPEAKING...' :
                 isListening ? '🔴 CLICK STOP' : 
                 '🎤 SPEAK'}
              </button>
              <p className="text-white text-center mt-4 font-semibold text-lg">
                {aiSpeaking ? 'Wait for AI...' :
                 isListening ? '🗣️ Speak, click when done' : 
                 '📱 Click → Speak → Click'}
              </p>
            </CardContent>
          </Card>

          {aiSpeaking && (
            <Card className="bg-blue-600 border-none animate-pulse">
              <CardContent className="p-6 text-center">
                <p className="text-white text-2xl font-bold">🗣️ AI responding...</p>
              </CardContent>
            </Card>
          )}

          <Button 
            onClick={endConversation} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-xl font-bold" 
            disabled={conversation.length < 4 || aiSpeaking || isListening}
          >
            <StopCircle className="w-6 h-6 mr-2" />End & Get Feedback
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'setup_2person') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Button onClick={() => setStep('mode_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Setup Session</h2>

              <div>
                <Label htmlFor="scenario2person">Describe Situation *</Label>
                <Textarea id="scenario2person" value={scenarioDescription} onChange={(e) => setScenarioDescription(e.target.value)} placeholder="e.g., Performance review..." rows={4} />
              </div>

              <div>
                <Label>Your Role *</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={() => setUserRole('boss')} variant={userRole === 'boss' ? 'default' : 'outline'} className="h-16">👔 Boss</Button>
                  <Button onClick={() => setUserRole('employee')} variant={userRole === 'employee' ? 'default' : 'outline'} className="h-16">🙋 Employee</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button onClick={handleCreateSession} disabled={!scenarioDescription.trim() || !userRole} className="bg-purple-600 py-6">
                  <Plus className="w-5 h-5 mr-2" />Create Session
                </Button>
                <Button onClick={() => setStep('join_partner')} className="bg-pink-600 py-6">
                  <Users className="w-5 h-5 mr-2" />Join Session
                </Button>
              </div>
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
          <Button onClick={() => setStep('setup_2person')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h2 className="text-4xl font-bold text-white mb-6 text-center">Join Session</h2>

          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id} className="border-none shadow-2xl">
                <CardContent className="p-6">
                  <h3 className="font-bold text-xl mb-2">Host: {session.creator_name}</h3>
                  <p className="text-slate-600 mb-3"><strong>Scenario:</strong> {session.context}</p>
                  <Button onClick={() => handleJoinSession(session)} className="w-full bg-purple-600">Request to Join</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {sessions.length === 0 && (
            <Card className="border-none shadow-2xl mt-8">
              <CardContent className="p-16 text-center">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-xl font-bold">No sessions are currently waiting.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (step === 'waiting_approval') {
    const wasRejected = sessionUpdate && !sessionUpdate.pending_participants?.some(p => p.email === user.email) && !sessionUpdate.participants?.some(p => p.email === user.email);

    if (wasRejected) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-pink-900 p-6 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-12 text-center">
              <UserX className="w-24 h-24 text-red-400 mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4 text-red-600">Request Rejected</h2>
              <p className="text-slate-600 mb-6">The host did not approve your request to join.</p>
              <Button onClick={reset} className="bg-slate-600">Back to Practice Hub</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 animate-spin text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">⏳ Waiting for Host Approval...</h2>
            <p className="text-slate-600">Your request has been sent to {currentSession?.creator_name}</p>
            <Button onClick={reset} variant="outline" className="mt-6">Cancel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'waiting_partner') {
    const pendingRequests = sessionUpdate?.pending_participants || [];

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-rose-900 p-6 flex items-center justify-center">
        <Card className="max-w-2xl border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Users className="w-24 h-24 text-purple-400 mx-auto mb-6 animate-pulse" />
            <h2 className="text-4xl font-bold mb-4">Waiting for Partner...</h2>
            <div className="bg-slate-100 rounded-xl p-6 mb-6">
              <div className="text-5xl font-black text-purple-600">{sessionCode}</div>
              <Button onClick={() => { navigator.clipboard.writeText(sessionCode); alert('✅ Copied!'); }} variant="outline" size="sm" className="mt-3">
                <Copy className="w-4 h-4 mr-2" />Copy Code
              </Button>
            </div>

            {pendingRequests.length > 0 && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mt-6">
                <h3 className="font-bold text-lg mb-4 text-blue-900">🔔 Join Requests ({pendingRequests.length})</h3>
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div key={req.email} className="bg-white p-4 rounded-lg border-2 border-slate-200">
                      <p className="font-bold text-slate-900 mb-2">{req.name}</p>
                      <p className="text-sm text-slate-600 mb-3">{req.email}</p>
                      <div className="flex gap-2">
                        <Button onClick={() => handleApproveParticipant(req.email, req.name, req.role)} className="flex-1 bg-green-600">
                          <UserCheck className="w-4 h-4 mr-2" />Approve
                        </Button>
                        <Button onClick={() => handleRejectParticipant(req.email)} variant="outline" className="flex-1 border-red-300 text-red-600">
                          <UserX className="w-4 h-4 mr-2" />Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={reset} variant="outline">Cancel Session</Button>
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
            <h2 className="text-2xl font-bold mb-2">AI Analyzing...</h2>
            <p className="text-slate-600">Processing {screenshots.length} screenshots & transcript...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'feedback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="bg-red-600 text-white">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4" />
              <div className="text-7xl font-black mb-2">{feedback.overall_score}</div>
              <p className="text-xl">out of 100</p>
              <p className="text-sm mt-3 opacity-80">Analyzed {screenshots.length} screenshots</p>
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

          {feedback.body_language_notes && (
            <Card className="bg-purple-50 border-2 border-purple-300">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-purple-900 mb-4">🎭 Body Language</h3>
                <p className="text-purple-900">{feedback.body_language_notes}</p>
              </CardContent>
            </Card>
          )}

          {feedback.next_steps && (
            <Card className="bg-blue-50 border-2 border-blue-300">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-blue-900 mb-4">🚀 Next Steps</h3>
                <p className="text-blue-900">{feedback.next_steps}</p>
              </CardContent>
            </Card>
          )}

          <Button onClick={onComplete} className="w-full bg-white text-slate-800 py-6 text-xl font-bold border-2 border-slate-300">
            <ArrowLeft className="w-6 h-6 mr-2" />Back to Hub
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
            <Button onClick={reset} className="mt-8" variant="outline">Cancel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'show_dual_feedback') {
    const myFeedback = currentSession?.feedback?.[user?.email];
    const partner = currentSession?.participants?.find(p => p.email !== user?.email);
    const partnerEmail = partner?.email || (currentSession?.creator_email !== user?.email ? currentSession?.creator_email : null);
    const partnerFeedback = currentSession?.feedback?.[partnerEmail];
    const partnerName = partner?.name || (currentSession?.creator_email === partnerEmail ? currentSession?.creator_name : 'Partner');

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-4xl font-black">📊 Complete Analysis</h2>
              <p className="text-lg mt-2">Both participants' performance for "{scenarioDescription}"</p>
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

  if (step === 'conversation_2person') {
    return (
      <TwilioPracticeRoom
        session={currentSession}
        userRole={userRole}
        onEnd={endSessionWithFeedback}
        moduleType="difficult_conversation"
      />
    );
  }

  return null;
}
