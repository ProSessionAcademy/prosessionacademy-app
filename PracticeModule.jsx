
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX, Loader2, CheckCircle, XCircle, Phone, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/components/LanguageSelector';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea is needed for user input display

export default function PracticeModule({ scenario, onComplete }) {
  const { language } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState(''); // Holds the last AI response (for display while AI is generating/speaking)
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [score, setScore] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const recognitionRef = useRef(null);
  const conversationEndRef = useRef(null); // Ref to scroll to bottom of conversation

  // LANGUAGE MAPPING
  const getLanguageCode = () => {
    switch(language) {
      case 'dutch': return 'nl-NL';
      case 'french': return 'fr-FR';
      default: return 'en-US';
    }
  };

  const getLanguageName = () => {
    switch(language) {
      case 'dutch': return 'Dutch';
      case 'french': return 'French';
      default: return 'English';
    }
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = getLanguageCode(); // SET LANGUAGE

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        // Update userTranscript with the combined final and interim results
        setUserTranscript(finalTranscript + interimTranscript);
      };

      recognitionRef.current.onend = () => {
        // If recognition stops but we intended to keep listening (e.g., due to browser timeout),
        // we might want to restart, but `continuous=true` should usually handle this.
        // For our flow, `onend` usually means `stopListening` was called, or an error.
        if (isListening && userTranscript.trim()) {
          // If listening was active and there's a transcript, process it
          handleUserInput(userTranscript);
        }
        setIsListening(false); // Ensure listening state is false
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        // Provide user feedback for common errors
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone in your browser settings.');
        } else if (event.error === 'no-speech') {
          // This can happen if continuous is true but no speech for a while
          console.log('No speech detected.');
          // Don't alert for no-speech if user hasn't explicitly stopped, just clear input for next attempt
          setUserTranscript(''); 
        }
      };
    } else {
      console.warn('Speech recognition not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [language]); // Depend on language to re-initialize recognition with new language

  // Scroll to bottom of conversation whenever it updates
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationHistory]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setUserTranscript(''); // Clear previous transcript
      recognitionRef.current.start();
      setIsListening(true);
      // Ensure AI speech is cancelled when user starts speaking
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsAISpeaking(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      if (userTranscript.trim()) {
        handleUserInput(userTranscript);
      } else {
        // If user stops listening without saying anything, clear transcript
        setUserTranscript('');
      }
    }
  };

  const handleUserInput = async (transcript) => {
    if (!transcript.trim()) {
      setUserTranscript(''); // Clear if it was just whitespace
      return;
    }

    const newHistory = [...conversationHistory, { role: 'user', content: transcript }];
    setConversationHistory(newHistory);
    setUserTranscript(''); // Clear transcript once it's added to history

    try {
      const systemPrompt = `You are a ${scenario.module} practice simulator. 
      
CRITICAL: Respond ONLY in ${getLanguageName()}. All your responses must be in ${getLanguageName()}.

${scenario.ai_prompt}

Industry: ${scenario.industry}
Difficulty: ${scenario.difficulty}

Conversation so far:
${newHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Respond naturally in ${getLanguageName()} as the ${scenario.module === 'sales' ? 'customer' : 'candidate'}.
Keep responses conversational (2-3 sentences max).
Stay in character.`;

      setAiResponse('AI is thinking...'); // Placeholder while AI generates response

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        add_context_from_internet: false
      });

      setAiResponse(result);
      setConversationHistory(prev => [...prev, { role: 'ai', content: result }]);
      speakText(result);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setAiResponse(`Error: Could not get AI response. ${error.message}`);
      setConversationHistory(prev => [...prev, { role: 'ai', content: `Error: Could not get AI response. ${error.message}` }]);
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      
      // SET LANGUAGE FOR SPEECH
      utterance.lang = getLanguageCode();
      
      // TRY TO FIND VOICE IN SELECTED LANGUAGE
      const voices = window.speechSynthesis.getVoices();
      const languageVoice = voices.find(voice => voice.lang.startsWith(getLanguageCode().split('-')[0]));
      if (languageVoice) {
        utterance.voice = languageVoice;
      } else {
        console.warn(`No specific voice found for ${getLanguageCode()}, using default.`);
      }
      
      utterance.rate = 0.95;
      utterance.pitch = 1;
      
      utterance.onstart = () => setIsAISpeaking(true);
      utterance.onend = () => setIsAISpeaking(false);
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsAISpeaking(false);
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn("Speech synthesis not supported in this browser.");
    }
  };

  const endSession = async () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsAISpeaking(false);
    }

    // GET FEEDBACK IN SELECTED LANGUAGE
    const feedbackPrompt = `You are evaluating a ${scenario.module} practice session.

CRITICAL: Provide ALL feedback in ${getLanguageName()}. Every word must be in ${getLanguageName()}.

Conversation:
${conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Provide:
1. Overall score (0-100)
2. 3 strengths
3. 3 areas for improvement
4. Specific actionable advice

Respond in ${getLanguageName()} in this JSON format:
{
  "score": <number>,
  "strengths": ["<strength 1 in ${getLanguageName()}>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1 in ${getLanguageName()}>", "<improvement 2>", "<improvement 3>"],
  "advice": "<detailed advice in ${getLanguageName()}>"
}`;

    try {
      // Temporarily show a loading message
      setFeedback({ message: 'Generating feedback...', isLoading: true });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: feedbackPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
            advice: { type: "string" }
          },
          required: ["score", "strengths", "improvements", "advice"]
        }
      });

      setScore(result.score);
      setFeedback(result);
    } catch (error) {
      console.error('Error getting feedback:', error);
      setFeedback({ message: 'Failed to generate feedback.', isError: true, errorDetails: error.message });
      setScore(null);
      alert('Error generating feedback. Please try again.');
    }
  };

  const startSession = () => {
    setSessionStarted(true);
    setConversationHistory([]);
    setFeedback(null);
    setScore(null);
    setUserTranscript('');
    setAiResponse('');

    // INITIAL GREETING IN SELECTED LANGUAGE
    let greeting = '';
    const moduleType = scenario.module || 'practice'; // Default to 'practice' if not specified
    const aiRole = moduleType === 'sales' ? 'customer' : 'candidate'; // Changed to aiRole for clarity

    switch(language) {
      case 'dutch':
        greeting = `Hallo! Ik ben je ${aiRole} voor deze oefensessie. Laten we beginnen!`;
        break;
      case 'french':
        greeting = `Bonjour! Je suis votre ${aiRole} pour cette session de pratique. Commençons!`;
        break;
      default:
        greeting = `Hello! I'm your ${aiRole} for this practice session. Let's get started!`;
    }
    
    setAiResponse(greeting);
    setConversationHistory([{ role: 'ai', content: greeting }]);
    speakText(greeting);
  };

  // JSX return based on the states
  if (feedback && feedback.isLoading) {
    return (
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Generating Feedback...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex items-center justify-center">
          <p className="text-center text-lg mt-4">Please wait while we analyze your performance.</p>
        </CardContent>
      </Card>
    );
  }

  if (feedback && feedback.isError) {
    return (
      <Card className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" /> Feedback Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col items-center justify-center">
          <p className="text-center text-lg mt-4 text-red-700">There was an error generating feedback.</p>
          <p className="text-center text-sm text-red-500">{feedback.errorDetails}</p>
          <Button onClick={() => onComplete(true)} className="w-full mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (feedback) {
    return (
      <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" /> Your Performance Review
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col space-y-6 overflow-y-auto">
          <div className="text-center">
            {score !== null && (
              <div className="text-6xl font-bold text-green-600 mb-2">{score}/100</div>
            )}
            <p className="text-slate-600 text-lg">{feedback.advice}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="font-semibold mb-2 text-green-700">✓ Strengths</p>
              <ul className="text-sm space-y-1 list-disc pl-5">
                {feedback.strengths?.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="font-semibold mb-2 text-orange-700">→ Improvements</p>
              <ul className="text-sm space-y-1 list-disc pl-5">
                {feedback.improvements?.map((i, idx) => <li key={idx}>{i}</li>)}
              </ul>
            </div>
          </div>

          <Button onClick={() => onComplete(true)} className="w-full">
            Restart Practice
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-cyan-50 h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {scenario.module === 'sales' ? (
            <Phone className="w-6 h-6 text-blue-600" />
          ) : (
            <Target className="w-6 h-6 text-blue-600" />
          )}
          {scenario.title || 'Practice Session'}
          <span className="ml-auto text-sm text-slate-500 font-normal">({getLanguageName()})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col space-y-4">
        {!sessionStarted ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h3 className="text-2xl font-semibold mb-4">Ready to start your {scenario.module} practice?</h3>
            <p className="text-slate-600 mb-6 max-w-md">
              You will be interacting with an AI representing a {scenario.module === 'sales' ? 'customer' : 'candidate'}.
              Speak your responses and the AI will respond in {getLanguageName()}.
            </p>
            <Button onClick={startSession} className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-4 rounded-lg shadow-md">
              Start Session
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-grow bg-white rounded-xl p-4 overflow-y-auto space-y-3 shadow-inner">
              {conversationHistory.map((msg, idx) => (
                <div key={idx} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-[80%] p-3 rounded-lg text-sm ${
                    msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-800'
                  }`}>
                    <p className="font-bold mb-1">{msg.role === 'user' ? 'You' : (scenario.module === 'sales' ? 'Customer' : 'Candidate')}</p>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              {/* Display current AI response if it's not yet in conversationHistory */}
              {isAISpeaking && aiResponse && !conversationHistory.some(m => m.content === aiResponse) && (
                <div className="text-left">
                  <div className="inline-block max-w-[80%] p-3 rounded-lg bg-slate-200 text-slate-800 text-sm animate-pulse">
                    <p className="font-bold mb-1">{scenario.module === 'sales' ? 'Customer' : 'Candidate'}</p>
                    <p>{aiResponse}</p>
                  </div>
                </div>
              )}
              <div ref={conversationEndRef} /> {/* For auto-scrolling */}
            </div>

            <AnimatePresence>
              {isAISpeaking && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center justify-center gap-2 text-slate-600"
                >
                  <Volume2 className="w-4 h-4 animate-pulse" />
                  <span>AI is speaking...</span>
                </motion.div>
              )}
              {isListening && (
                 <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 10 }}
                 className="flex items-center justify-center gap-2 text-blue-600"
               >
                 <Mic className="w-4 h-4 animate-pulse" />
                 <span>Listening...</span>
               </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2 mt-4">
              <Button
                onClick={isListening ? stopListening : startListening}
                className={`flex-shrink-0 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                disabled={isAISpeaking}
                aria-label={isListening ? "Stop listening" : "Start listening"}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>
              <Textarea
                value={userTranscript}
                onChange={(e) => setUserTranscript(e.target.value)}
                placeholder={isListening ? "Listening..." : "Speak or type your response..."}
                rows={1}
                className="flex-grow resize-none max-h-[100px]" // Limit height for UX
                disabled={isListening || isAISpeaking}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (userTranscript.trim()) {
                      handleUserInput(userTranscript);
                    }
                  }
                }}
              />
              <Button onClick={() => handleUserInput(userTranscript)} disabled={!userTranscript.trim() || isListening || isAISpeaking}>
                Send
              </Button>
            </div>

            <Button onClick={endSession} variant="destructive" className="w-full mt-4">
              End Session & Get Feedback
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
