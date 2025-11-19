
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge'; // Added Badge for video upload UI
import { ArrowLeft, Loader2, User, CheckCircle2, TrendingUp, Mic, StopCircle, Users, Plus, Copy, Sparkles, Camera, Video, UserCheck, UserX, XCircle, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import TwilioPracticeRoom from '@/components/practice/TwilioPracticeRoom';

const AI_PERSON_IMAGES = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
];

// Safe play utility to handle autoplay restrictions
async function safePlay(element) {
  try {
    await element.play();
    console.log('✅ Video/audio playing');
  } catch (err) {
    console.warn("Autoplay blocked. Waiting for user gesture.", err);
    element.muted = true;
    window.addEventListener("click", () => element.play().catch(e => console.error(e)), { once: true });
  }
}

export default function PublicSpeakingSimulator({ onComplete }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mode, setMode] = useState(null); // 'solo', '2person', 'video_upload'
  const [step, setStep] = useState('mode_selection');
  const [presentationTopic, setPresentationTopic] = useState('');
  const [audienceSize, setAudienceSize] = useState('1');
  const [userRole, setUserRole] = useState(null);
  const [aiPersonImage] = useState(AI_PERSON_IMAGES[Math.floor(Math.random() * AI_PERSON_IMAGES.length)]);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [wordCount, setWordCount] = useState(0);
  const [screenshots, setScreenshots] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Video upload mode
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [currentSession, setCurrentSession] = useState(null);
  const [sessionCode, setSessionCode] = useState('');
  const [remoteVideoReady, setRemoteVideoReady] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState([]);
  const [iceConnected, setIceConnected] = useState(false);

  const videoRefMe = useRef(null);
  const videoRefPartner = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const sessionRef = useRef(null);
  const recognitionRef = useRef(null);
  const liveRecognitionRef = useRef(null);
  const screenshotIntervalRef = useRef(null);
  const isRecordingRef = useRef(false);
  const isLiveRecordingRef = useRef(false);
  const transcriptPartsRef = useRef([]);
  const fileInputRef = useRef(null); // Ref for video upload input

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);

  // ✅ Re-attach stream when entering solo step
  useEffect(() => {
    if (step === 'solo' && mediaStreamRef.current && videoRefMe.current) {
      console.log('🔄 Re-attaching stream to video element');
      videoRefMe.current.srcObject = mediaStreamRef.current;
      videoRefMe.current.muted = true;
      videoRefMe.current.playsInline = true;
      safePlay(videoRefMe.current);
    }
  }, [step]);

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
    queryKey: ['practiceSessions', 'public_speaking'],
    queryFn: () => base44.entities.PracticeSession.filter({ module_type: 'public_speaking', status: 'waiting' }),
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
    enabled: !!currentSession && (step === 'waiting_partner' || step === 'presentation_2person' || step === 'waiting_partner_feedback' || step === 'waiting_approval'),
    refetchInterval: 500
  });

  useEffect(() => {
    if (sessionUpdate?.participants?.length >= 1 && step === 'waiting_partner') {
      console.log('✅ Audience joined!');
      setCurrentSession(sessionUpdate);
      setStep('presentation_2person');
      // No initVideoCall here as Twilio handles it.
    }

    if (step === 'waiting_approval' && sessionUpdate?.participants?.some(p => p.email === user?.email)) {
      console.log('✅ Approved! Joining session...');
      setCurrentSession(sessionUpdate);
      setStep('presentation_2person');
      // No initVideoCall here as Twilio handles it.
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
            console.log('✅ 2P SPEECH:', text);
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
      console.error('Transcription error:', event.error);
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
      console.log('🎤 Live transcription ON');
    } catch (e) {
      console.error('Failed to start mic:', e);
    }
  };

  const enableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, 
        audio: true
      });
      
      console.log('✅ SOLO Camera enabled:', stream.getTracks());
      mediaStreamRef.current = stream;
      setCameraEnabled(true);
      
      // Wait for next render cycle before attaching to video
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (videoRefMe.current) {
        videoRefMe.current.srcObject = stream;
        videoRefMe.current.muted = true;
        videoRefMe.current.playsInline = true;
        await safePlay(videoRefMe.current);
        console.log('✅ SOLO video playing');
      }
      
      // Start screenshot capture immediately
      screenshotIntervalRef.current = setInterval(async () => {
        const screenshot = await captureScreenshot();
        if (screenshot) {
          console.log('📸 Screenshot captured');
          setScreenshots(prev => [...prev, screenshot]);
        }
      }, 3000);
      
      return true;
    } catch (error) {
      console.error('Camera error:', error);
      alert('Camera Error: ' + error.message);
      setCameraEnabled(false);
      return false;
    }
  };

  const startRecording = () => {
    if (!cameraEnabled || !mediaStreamRef.current) {
      alert('⚠️ Enable camera first!');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('⚠️ Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    isRecordingRef.current = true;
    setIsRecording(true);
    transcriptPartsRef.current = [];
    setTranscript([]);
    setWordCount(0);

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript;
          if (text && text.trim()) {
            console.log('✅ SOLO SPEECH:', text);
            transcriptPartsRef.current = [...transcriptPartsRef.current, text.trim()];
            setTranscript([...transcriptPartsRef.current]);
            setWordCount(transcriptPartsRef.current.join(' ').split(' ').filter(w => w).length);
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('⚠️ Microphone denied!');
        setIsRecording(false);
        isRecordingRef.current = false;
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
      console.log('✅ Speech recognition started');
    } catch (e) {
      alert('⚠️ Failed to start mic: ' + e.message);
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    isRecordingRef.current = false;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    // Stop screenshot capturing for solo mode only
    if (screenshotIntervalRef.current) {
      clearInterval(screenshotIntervalRef.current);
      screenshotIntervalRef.current = null;
    }

    const transcriptText = transcript.join(' ');
    
    if (!transcriptText || transcriptText.trim().length < 10) {
      alert('⚠️ NO SPEECH DETECTED! Please try again.');
      setTranscript([]);
      setScreenshots([]);
      setWordCount(0);
      transcriptPartsRef.current = [];
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
        prompt: `Analyze public speaking presentation on "${presentationTopic}":\n\nFULL TRANSCRIPT:\n${transcriptText}\n\nAnalyze clarity, confidence, structure, delivery, body language from ${screenshotUrls.length} screenshots.`,
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

      setFeedback(analysis);
      setStep('feedback');
    } catch (error) {
      alert('❌ Failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // initVideoCall removed because Twilio handles it.

  const cleanup = () => {
    isRecordingRef.current = false;
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
    if (peerConnectionRef.current) { // Though Twilio replaces this, keeping for robustness if other paths still use it
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (videoUrl) { // Release object URL for uploaded video
      URL.revokeObjectURL(videoUrl);
    }
    setRemoteVideoReady(false);
    setCameraEnabled(false);
    setIceConnected(false);
    setUploadedVideo(null);
    setVideoUrl(null);
    setUploadProgress(0);
  };

  const endSessionWithFeedback = async (data) => {
    const { screenshots, liveTranscript } = data;

    const transcriptText = liveTranscript.map(t => `${userRole}: ${t.text}`).join('\n');

    if (!transcriptText || transcriptText.length < 15) {
      alert('⚠️ NO SPEECH! Enable mic.');
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
        prompt: `Analyze ${userRole} in public speaking presentation on "${presentationTopic}":\n\nTranscript:\n${transcriptText}\n\nEvaluate presentation skills, body language from ${screenshotUrls.length} screenshots.`,
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
    if (!presentationTopic.trim()) {
      alert('Enter topic');
      return;
    }

    const code = Math.random().toString(36).substr(2, 6).toUpperCase();
    createSessionMutation.mutate({
      session_code: code,
      module_type: 'public_speaking',
      creator_email: user.email,
      creator_name: user.full_name || user.email,
      creator_role: 'presenter',
      max_participants: parseInt(audienceSize) || 1,
      status: 'waiting',
      context: presentationTopic,
      // Removed webrtc_signals: {} as Twilio handles signaling externally
      pending_participants: []
    });

    setSessionCode(code);
    setUserRole('presenter');
    setStep('waiting_partner');
  };

  const handleJoinSession = async (session) => {
    const pendingRequest = {
      email: user.email,
      name: user.full_name || user.email,
      role: 'audience',
      requested_at: new Date().toISOString()
    };

    await updateSessionMutation.mutateAsync({
      sessionId: session.id,
      updates: { 
        pending_participants: [...(session.pending_participants || []), pendingRequest]
      }
    });

    setCurrentSession(session);
    setPresentationTopic(session.context);
    setUserRole('audience');
    setStep('waiting_approval');
  };

  const handleApproveParticipant = async (participantEmail, participantName) => {
    const approvedParticipant = {
      email: participantEmail,
      name: participantName,
      role: 'audience',
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
    setFeedback(null);
    setPresentationTopic('');
    setCurrentSession(null);
    setScreenshots([]);
    setTranscript([]);
    setLiveTranscript([]);
    setWordCount(0);
    setIsRecording(false);
    transcriptPartsRef.current = [];
    setSessionCode('');
    setAudienceSize('1');
    setUserRole(null);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('video/')) {
      alert('Please upload a video file');
      return;
    }
    if (file.size > 100 * 1024 * 1024) { // Max 100MB
      alert('Video file is too large. Max size is 100MB.');
      return;
    }
    setUploadedVideo(file);
    setVideoUrl(URL.createObjectURL(file));
    setStep('video_uploaded');
  };

  const captureVideoFrames = async (videoElement, count = 10) => {
    const frames = [];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Ensure video metadata is loaded before trying to get duration/dimensions
    if (videoElement.readyState < 2) {
      await new Promise(resolve => {
        videoElement.onloadedmetadata = () => resolve();
      });
    }

    const duration = videoElement.duration;
    if (duration === 0 || isNaN(duration)) {
      console.error("Video duration is 0 or NaN, cannot capture frames.");
      return frames;
    }
    const interval = duration / count;

    for (let i = 0; i < count; i++) {
      videoElement.currentTime = Math.min(duration, interval * i); // Ensure currentTime does not exceed duration
      
      await new Promise((resolve) => {
        // Set a timeout to resolve if onseeked doesn't fire (e.g., if already at end)
        const timeoutId = setTimeout(() => {
          console.warn(`Seeked timeout for frame ${i}`);
          resolve();
        }, 1000); // 1 second timeout

        videoElement.onseeked = () => {
          clearTimeout(timeoutId);
          if (!videoElement.videoWidth || !videoElement.videoHeight) {
            console.warn(`Video dimensions not available for frame ${i}`);
            resolve();
            return;
          }

          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `frame-${i}.jpg`, { type: 'image/jpeg' });
              frames.push(file);
            } else {
              console.warn(`Failed to create blob for frame ${i}`);
            }
            resolve();
          }, 'image/jpeg', 0.8);
        };
        // If the seek doesn't trigger onseeked (e.g. already at position), force resolve
        if (videoElement.currentTime === Math.min(duration, interval * i) && videoElement.readyState >= 2) {
            videoElement.onseeked(); // Manually trigger if already at position
        }
      });
    }
    
    return frames;
  };

  const analyzeUploadedVideo = async () => {
    if (!uploadedVideo || !videoRefMe.current) {
      alert('No video uploaded to analyze.');
      return;
    }
    setAnalyzing(true);
    setUploadProgress(0);

    try {
      // Step 1: Upload the video file itself
      setUploadProgress(10);
      const { file_url: videoFileUrl } = await base44.integrations.Core.UploadFile({ file: uploadedVideo });
      console.log('Uploaded video file:', videoFileUrl);
      setUploadProgress(20);

      // Step 2: Capture frames from the video
      const frames = await captureVideoFrames(videoRefMe.current, 8); // Capture 8 frames
      if (frames.length === 0) {
        throw new Error("Could not capture any frames from the video.");
      }
      setUploadProgress(50);

      // Step 3: Upload the captured frames
      const frameUrls = [];
      for (const frame of frames) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: frame });
        frameUrls.push(file_url);
      }
      setUploadProgress(70);

      // Step 4: Invoke LLM for analysis
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this public speaking presentation video. The video provided (${videoFileUrl}) and associated frames show the speaker.
Review the provided video frames for body language, posture, gestures, facial expressions, and overall confidence.
Provide a comprehensive analysis including:
1. Overall Score (1-100): A numerical score representing the overall effectiveness of the presentation.
2. Voice & Speech Analysis: Detailed feedback on speaking pace, clarity, tone of voice, use of filler words, and vocal projection.
3. Body Language Analysis: Detailed feedback on posture, gestures, eye contact, facial expressions, and overall physical presence, indicating confidence and engagement.
4. Content Delivery Analysis: Detailed feedback on the structure of the presentation, ability to engage the audience, clarity of message, and flow.
5. Strengths: Specific things the speaker did well, providing examples where possible.
6. Improvements: Actionable suggestions for improvement, focusing on specific areas.
7. Next Steps: Top 3 recommendations for practice or further development.

Ensure the response is structured as valid JSON according to the provided schema.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number", description: "Overall score out of 100." },
            voice_analysis: { type: "string", description: "Detailed feedback on voice and speech." },
            body_language_notes: { type: "string", description: "Detailed feedback on body language and physical presence." },
            content_delivery: { type: "string", description: "Detailed feedback on content structure and delivery." },
            strengths: { type: "array", items: { type: "string" }, description: "List of specific strengths." },
            improvements: { type: "array", items: { type: "string" }, description: "List of actionable improvements." },
            next_steps: { type: "array", items: { type: "string" }, description: "Top 3 recommendations." } // Changed to array for consistency with other analysis
          },
          required: ["overall_score", "voice_analysis", "body_language_notes", "content_delivery", "strengths", "improvements", "next_steps"]
        },
        file_urls: frameUrls
      });

      setUploadProgress(100);
      setFeedback(result);
      setStep('feedback');
    } catch (error) {
      console.error('Video analysis failed:', error);
      alert('❌ Analysis failed: ' + error.message);
      setStep('video_uploaded'); // Return to the video uploaded screen
    } finally {
      setAnalyzing(false);
      setUploadProgress(0); // Reset progress
    }
  };


  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-16 h-16 animate-spin" /></div>;
  if (!user) return <div className="min-h-screen flex items-center justify-center"><Button onClick={() => base44.auth.redirectToLogin()}>Sign In</Button></div>;

  if (step === 'mode_selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-900 to-red-900 p-4 md:p-6 flex items-center justify-center">
        <div className="max-w-5xl w-full">
          <Button onClick={onComplete} variant="outline" className="mb-4 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <h1 className="text-4xl md:text-5xl font-black text-white mb-8 text-center">🎤 Public Speaking</h1>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('solo'); setStep('setup_solo'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-orange-600 to-red-600 text-white h-full">
                <CardContent className="p-8">
                  <User className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">Solo AI Practice</h3>
                  <p className="text-white/80 text-sm mb-4 text-center">Live camera + mic</p>
                  <Button className="w-full mt-4 bg-white text-orange-600 font-bold">Start Solo</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('2person'); setStep('role_selection'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white h-full">
                <CardContent className="p-8">
                  <Users className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">2-Person Practice</h3>
                  <p className="text-white/80 text-sm mb-4 text-center">Live with partner</p>
                  <Button className="w-full mt-4 bg-white text-purple-600 font-bold">Find Partner</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.03 }}>
              <Card onClick={() => { setMode('video_upload'); setStep('upload_video'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white h-full">
                <CardContent className="p-8">
                  <Video className="w-16 h-16 mb-4 mx-auto" />
                  <h3 className="text-2xl font-black mb-3 text-center">Video Analysis</h3>
                  <p className="text-white/80 text-sm mb-4 text-center">Upload past presentation</p>
                  <Button className="w-full mt-4 bg-white text-blue-600 font-bold">Upload Video</Button>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => setStep('mode_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <div className="text-center mb-6">
                <Camera className="w-24 h-24 text-red-500 mx-auto mb-4" />
                <h2 className="text-4xl font-black mb-4 text-red-600">⚠️ CAMERA REQUIRED</h2>
                <p className="text-xl text-slate-700 mb-6">
                  Public speaking is <span className="font-bold text-blue-600">55% body language</span>, 
                  <span className="font-bold text-purple-600"> 38% tone of voice</span>, and only 
                  <span className="font-bold text-slate-600"> 7% words</span>.
                </p>
              </div>

              <Card className="bg-blue-50 border-2 border-blue-300">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg text-blue-900 mb-3">📸 AI will capture screenshots every 3 seconds to analyze:</h3>
                  <ul className="space-y-2 text-blue-800">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Your speaking pace and rhythm</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Body language changes over time</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Facial expressions and engagement</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Posture and presence throughout</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">•</span>
                      <span>Gestures and movement patterns</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <div>
                <Label className="text-lg font-bold mb-2 block">Presentation Topic *</Label>
                <Textarea value={presentationTopic} onChange={(e) => setPresentationTopic(e.target.value)} placeholder="e.g., Climate Change Solutions..." rows={3} className="text-lg" />
              </div>

              <Card className="bg-red-50 border-2 border-red-400">
                <CardContent className="p-4">
                  <p className="text-red-800 font-bold text-center">
                    📹 CAMERA MUST BE ON
                  </p>
                  <p className="text-red-700 text-sm text-center mt-2">
                    Professional training requires full performance analysis. We'll capture screenshots every 3 seconds to track your body language throughout the presentation.
                  </p>
                  <p className="text-red-900 text-xs text-center mt-3 font-bold">
                    ⚠️ Camera must be enabled during recording for complete feedback!
                  </p>
                </CardContent>
              </Card>

              {!cameraEnabled ? (
                <Button 
                  onClick={enableCamera}
                  disabled={!presentationTopic.trim()}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 py-8 text-2xl font-black shadow-2xl"
                >
                  <Camera className="w-8 h-8 mr-3" />
                  ⚠️ Enable Camera NOW
                </Button>
              ) : (
                <Button 
                  onClick={() => setStep('solo')}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-8 text-2xl font-black shadow-2xl"
                >
                  <CheckCircle2 className="w-8 h-8 mr-3" />
                  ✅ Camera Ready - Start Practice
                </Button>
              )}

              {!cameraEnabled && (
                <p className="text-center text-orange-300 font-bold text-lg animate-pulse">
                  👆 You must enable camera before you can record!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'solo') {
    if (analyzing) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900 to-orange-900">
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

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 p-4">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-white">🎤 {presentationTopic}</h1>
            <Button onClick={reset} variant="destructive" className="bg-red-600 hover:bg-red-700">
              <XCircle className="w-5 h-5 mr-2" />
              Force Exit
            </Button>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-none shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-orange-800 text-white p-3 text-center">
                  <h3 className="font-bold text-lg">YOU (Presenter)</h3>
                </div>
                <div className="aspect-video bg-slate-900 relative">
                  <video ref={videoRefMe} autoPlay muted playsInline className="w-full h-full object-cover" />
                  {isRecording && (
                    <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full font-black text-lg flex items-center gap-2 animate-pulse">
                      <Mic className="w-6 h-6 animate-pulse" />● RECORDING
                    </div>
                  )}
                  {!cameraEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white">
                      <div className="text-center">
                        <Camera className="w-16 h-16 animate-pulse mx-auto mb-4" />
                        <p className="text-xl font-bold">Camera Initializing...</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl">
              <CardContent className="p-0">
                <div className="bg-slate-800 text-white p-3 text-center">
                  <h3 className="font-bold text-lg">AI AUDIENCE</h3>
                </div>
                <div className="aspect-video bg-slate-900">
                  <img src={aiPersonImage} alt="AI Audience" className="w-full h-full object-cover" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-blue-50 border-2 border-blue-400">
            <CardContent className="p-4 text-center">
              <p className="text-blue-900 font-semibold text-lg">
                📸 Capturing screenshots every 3s • {screenshots.length} screenshots captured
              </p>
            </CardContent>
          </Card>

          {transcript.length > 0 && (
            <Card className="bg-white/95 border-4 border-green-500">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-7 h-7 inline mr-2" />
                  ✅ LIVE TRANSCRIPT ({wordCount} words • {screenshots.length} screenshots)
                </h3>
                <div className="max-h-64 overflow-y-auto space-y-3 bg-slate-50 p-4 rounded-lg">
                  {transcript.map((t, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg border-2 border-green-200">
                      <p className="text-lg text-slate-800">{t}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!isRecording ? (
            <Button 
              onClick={startRecording}
              disabled={!cameraEnabled}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 py-8 text-2xl font-black disabled:opacity-50"
            >
              <Mic className="w-8 h-8 mr-3" />🎤 START RECORDING
            </Button>
          ) : (
            <Button onClick={stopRecording} className="w-full bg-gradient-to-r from-red-600 to-orange-600 py-8 text-2xl font-black">
              <StopCircle className="w-8 h-8 mr-3" />⏹️ STOP & GET AI FEEDBACK
            </Button>
          )}

          {isRecording && (
            <Card className="bg-red-600 border-none animate-pulse">
              <CardContent className="p-6 text-center">
                <Mic className="w-16 h-16 text-white mx-auto mb-4 animate-pulse" />
                <p className="text-white text-3xl font-black mb-2">🎤 RECORDING LIVE</p>
                <p className="text-white text-xl">Speak your presentation!</p>
                <p className="text-red-200 mt-3 text-lg font-bold">✅ {wordCount} words • {screenshots.length} screenshots</p>
              </CardContent>
            </Card>
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
              <Card onClick={() => { setUserRole('presenter'); setStep('setup_2person'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-orange-600 to-red-600 text-white">
                <CardContent className="p-10 text-center">
                  <User className="w-20 h-20 mx-auto mb-4" />
                  <h3 className="text-3xl font-black mb-4">🎤 Presenter</h3>
                  <Button className="w-full bg-white text-orange-600 py-4 font-bold">I'll Present</Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }}>
              <Card onClick={() => { setUserRole('audience'); setStep('join_partner'); }} className="cursor-pointer border-none shadow-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <CardContent className="p-10 text-center">
                  <Users className="w-20 h-20 mx-auto mb-4" />
                  <h3 className="text-3xl font-black mb-4">👥 Audience</h3>
                  <Button className="w-full bg-white text-purple-600 py-4 font-bold">I'll Watch</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'setup_2person') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <Button onClick={() => setStep('role_selection')} variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <h2 className="text-3xl font-bold">Create Presentation Session</h2>

              <div>
                <Label>Presentation Topic *</Label>
                <Textarea value={presentationTopic} onChange={(e) => setPresentationTopic(e.target.value)} placeholder="e.g., Marketing Strategy..." rows={4} />
              </div>

              <div>
                <Label>How many audience members?</Label>
                <Input type="number" min="1" max="10" value={audienceSize} onChange={(e) => setAudienceSize(e.target.value)} className="h-12" />
              </div>

              <Button onClick={handleCreateSession} disabled={!presentationTopic.trim()} className="w-full bg-orange-600 py-6 text-xl font-bold">
                <Plus className="w-6 h-6 mr-2" />Create Session
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
                  <h3 className="font-bold text-xl mb-2">Presenter: {session.creator_name}</h3>
                  <p className="text-slate-600 mb-3"><strong>Topic:</strong> {session.context}</p>
                  <p className="text-slate-500 text-sm mb-3">Code: {session.session_code}</p>
                  <Button onClick={() => handleJoinSession(session)} className="w-full bg-purple-600">Request to Join</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {sessions.length === 0 && (
            <Card className="border-none shadow-2xl mt-8">
              <CardContent className="p-16 text-center">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <p className="text-xl font-bold text-white">No active sessions</p>
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
            <h2 className="text-4xl font-bold mb-4">Waiting for Audience...</h2>
            <div className="bg-slate-100 rounded-xl p-6 mb-6">
              <p className="text-sm text-slate-600 mb-2">Session Code:</p>
              <div className="text-6xl font-black text-purple-600">{sessionCode}</div>
              <Button onClick={() => { navigator.clipboard.writeText(sessionCode); alert('✅ Copied!'); }} variant="outline" size="sm" className="mt-4">
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
                        <Button onClick={() => handleApproveParticipant(req.email, req.name)} className="flex-1 bg-green-600">
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

  if (step === 'upload_video') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-900 to-teal-900 p-6 flex items-center justify-center">
        <div className="max-w-3xl w-full">
          <Button onClick={() => setStep('mode_selection')} variant="ghost" className="mb-6 text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <Video className="w-20 h-20 text-blue-500 mx-auto mb-4" />
                <h2 className="text-3xl font-black mb-2">Upload Presentation Video</h2>
                <p className="text-slate-600">AI will analyze your recorded presentation</p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-blue-300 rounded-2xl p-16 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                <Upload className="w-20 h-20 text-blue-500 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Click to Upload</h3>
                <p className="text-slate-600 mb-4">MP4, MOV, AVI supported</p>
                <Badge className="bg-blue-600 text-white">Max 100MB</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'video_uploaded') {
    if (analyzing) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-cyan-900 to-teal-900">
          <Card className="max-w-md">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-24 h-24 animate-spin mx-auto mb-6 text-blue-600" />
              <h3 className="text-3xl font-bold mb-2">AI Analyzing Video...</h3>
              <p className="text-slate-600">This might take a moment.</p>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-cyan-900 to-teal-900 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button onClick={() => { setStep('upload_video'); setUploadedVideo(null); setVideoUrl(null); }} variant="ghost" className="text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />Upload Different Video
          </Button>

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 space-y-6">
              <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden">
                <video
                  ref={videoRefMe}
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <canvas ref={canvasRef} className="hidden" /> {/* Hidden canvas for frame capturing */}

              <Card className="bg-blue-50 border-2 border-blue-300">
                <CardContent className="p-6">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Will Analyze:
                  </h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Camera className="w-4 h-4" />
                      <span>Body language & posture</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-800">
                      <Mic className="w-4 h-4" />
                      <span>Voice tone & delivery</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-800">
                      <Video className="w-4 h-4" />
                      <span>Visual presence</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-800">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Performance score (1-100)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={analyzeUploadedVideo}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 py-8 text-xl font-bold"
              >
                <Sparkles className="w-6 h-6 mr-2" />
                Analyze Video Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }


  if (step === 'feedback') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
            <CardContent className="p-8 text-center">
              <Sparkles className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-4xl font-black mb-2">Your Score:</h2>
              <div className="text-7xl font-black mb-2">{feedback.overall_score}</div>
              <p className="text-2xl">out of 100</p>
              {mode === 'solo' && <p className="text-sm mt-3 opacity-80">Analyzed {screenshots.length} screenshots</p>}
              {mode === 'video_upload' && <p className="text-sm mt-3 opacity-80">Analyzed your uploaded video</p>}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-green-50">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-green-900 mb-4"><CheckCircle2 className="w-7 h-7 inline mr-2" />Strengths</h3>
                <ul className="space-y-2 text-lg">{feedback.strengths?.map((s, i) => <li key={i} className="text-green-800">✓ {s}</li>)}</ul>
              </CardContent>
            </Card>

            <Card className="bg-orange-50">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-orange-900 mb-4"><TrendingUp className="w-7 h-7 inline mr-2" />Improvements</h3>
                <ul className="space-y-2 text-lg">{feedback.improvements?.map((i, idx) => <li key={idx} className="text-orange-800">→ {i}</li>)}</ul>
              </CardContent>
            </Card>
          </div>

          {feedback.voice_analysis && (
            <Card className="bg-purple-50 border-2 border-purple-300">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-purple-900 mb-4">🎤 Voice & Speech</h3>
                <p className="text-purple-900 text-lg">{feedback.voice_analysis}</p>
              </CardContent>
            </Card>
          )}

          {feedback.body_language_notes && (
            <Card className="bg-teal-50 border-2 border-teal-300">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-teal-900 mb-4">🎭 Body Language</h3>
                <p className="text-teal-900 text-lg">{feedback.body_language_notes}</p>
              </CardContent>
            </Card>
          )}

          {feedback.content_delivery && (
            <Card className="bg-blue-50 border-2 border-blue-300">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-blue-900 mb-4">📝 Content Delivery</h3>
                <p className="text-blue-900 text-lg">{feedback.content_delivery}</p>
              </CardContent>
            </Card>
          )}

          {feedback.next_steps && (
            <Card className="bg-yellow-50 border-2 border-yellow-300">
              <CardContent className="p-6">
                <h3 className="text-2xl font-bold text-yellow-900 mb-4">🚀 Next Steps</h3>
                {Array.isArray(feedback.next_steps) ? (
                  <ul className="space-y-2 text-lg">
                    {feedback.next_steps.map((step, idx) => (
                      <li key={idx} className="text-yellow-800">➤ {step}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-yellow-900 text-lg">{feedback.next_steps}</p>
                )}
              </CardContent>
            </Card>
          )}

          <Button onClick={onComplete} className="w-full bg-white text-orange-600 py-6 text-xl font-bold">
            <Sparkles className="w-6 h-6 mr-2" />Back to Hub
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
    const partnerEmail = currentSession?.participants?.[0]?.email !== user?.email 
      ? currentSession?.participants?.[0]?.email 
      : currentSession?.creator_email;
    const partnerName = currentSession?.participants?.[0]?.email !== user?.email
      ? currentSession?.participants?.[0]?.name
      : currentSession?.creator_name;
    const partnerFeedback = currentSession?.feedback?.[partnerEmail];

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

  if (step === 'presentation_2person') {
    return (
      <TwilioPracticeRoom
        session={currentSession}
        userRole={userRole}
        onEnd={endSessionWithFeedback}
        moduleType="public_speaking"
      />
    );
  }

  return null;
}
