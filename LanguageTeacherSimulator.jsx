
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Globe,
  Volume2,
  Lock,
  CheckCircle,
  X,
  Sparkles,
  ChevronRight,
  Trophy,
  BookOpen,
  Zap,
  Flame,
  Award,
  Mic,
  ArrowRight,
  Check,
  Star,
  Brain,
  MessageCircle,
  Send,
  Upload,
  FileText
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const LANGUAGES = {
  french: { name: 'French', flag: '🇫🇷', code: 'fr-FR' },
  spanish: { name: 'Spanish', flag: '🇪🇸', code: 'es-ES' },
  german: { name: 'German', flag: '🇩🇪', code: 'de-DE' },
  italian: { name: 'Italian', flag: '🇮🇹', code: 'it-IT' }
};

export default function LanguageTeacherSimulator() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userLoading, setUserLoading] = useState(true); // NEW: Track user loading state

  // Step 1: Language Selection
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  // Step 2: Placement Test
  const [showPlacementTest, setShowPlacementTest] = useState(false);
  const [placementTestQuestions, setPlacementTestQuestions] = useState([]);
  const [currentPlacementQ, setCurrentPlacementQ] = useState(0);
  const [placementAnswers, setPlacementAnswers] = useState([]);
  const [userLevel, setUserLevel] = useState(null);

  // Step 3: Lesson Selection
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Step 4: Learning Session
  const [lessonContent, setLessonContent] = useState(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseAnswers, setExerciseAnswers] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [userInput, setUserInput] = useState('');

  // Progress & Stats (These are now for the selected language)
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completedLessons, setCompletedLessons] = useState([]);

  const [loading, setLoading] = useState(false);

  // AI Teacher Assistant
  const [showTeacherChat, setShowTeacherChat] = useState(false);
  const [teacherMessages, setTeacherMessages] = useState([]);
  const [teacherInput, setTeacherInput] = useState('');
  const [teacherLoading, setTeacherLoading] = useState(false);
  // AI Teacher - Add voice input state
  const [isTeacherListening, setIsTeacherListening] = useState(false);
  const [teacherVoiceInput, setTeacherVoiceInput] = useState('');
  const teacherRecognitionRef = useRef(null);

  // Vocabulary Upload
  const [showVocabUpload, setShowVocabUpload] = useState(false);
  const [vocabInput, setVocabInput] = useState('');
  const [vocabFile, setVocabFile] = useState(null);
  const [vocabLoading, setVocabLoading] = useState(false);

  // Draggable AI Teacher state
  const [teacherPosition, setTeacherPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const checkAuth = async () => {
      setUserLoading(true); // Start loading
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Initialize language_learning_progress if not exists
        if (!currentUser.language_learning_progress) {
          await base44.auth.updateMe({
            language_learning_progress: {}
          });
          currentUser.language_learning_progress = {};
        }
        
        // Load legacy data for backwards compatibility
        setTotalXP(currentUser.language_xp || 0);
        setStreak(currentUser.language_streak || 0);
        setCompletedLessons(currentUser.completed_language_lessons || []);
      }
      setUserLoading(false); // Done loading
    };
    checkAuth();
  }, []);

  // Initialize speech recognition for AI teacher
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      teacherRecognitionRef.current = new SpeechRecognition();
      teacherRecognitionRef.current.continuous = true;
      teacherRecognitionRef.current.interimResults = true;
      teacherRecognitionRef.current.lang = 'en-US'; // Teacher speaks English

      teacherRecognitionRef.current.onresult = (event) => {
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
        
        setTeacherVoiceInput(prev => prev + finalTranscript + interimTranscript);
      };

      teacherRecognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsTeacherListening(false);
      };

      teacherRecognitionRef.current.onend = () => {
        setIsTeacherListening(false);
      };
    }

    return () => {
      if (teacherRecognitionRef.current) {
        try {
          teacherRecognitionRef.current.stop();
        } catch (e) {
          // Ignore error if recognition was not started or already stopped
        }
      }
    };
  }, []);

  // Start voice input for teacher chat
  const startTeacherVoiceInput = () => {
    if (teacherRecognitionRef.current && !isTeacherListening && !teacherLoading) {
      setTeacherVoiceInput('');
      setIsTeacherListening(true);
      setTeacherInput(''); // Clear text input when starting voice
      try {
        teacherRecognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        setIsTeacherListening(false);
      }
    }
  };

  // Stop voice input and submit
  const stopTeacherVoiceInput = () => {
    if (teacherRecognitionRef.current && isTeacherListening) {
      try {
        teacherRecognitionRef.current.stop();
      } catch (e) {
        console.error('Failed to stop recognition:', e);
      }
      setIsTeacherListening(false);
      
      // Submit the voice input
      if (teacherVoiceInput.trim()) {
        setTeacherInput(teacherVoiceInput.trim()); // Set the recognized text to the input field
        askTeacher(teacherVoiceInput.trim());
        setTeacherVoiceInput('');
      } else {
        setTeacherInput(''); // Clear input if nothing was recognized
      }
    }
  };

  // Load progress for selected language - FIXED VERSION
  const loadLanguageProgress = async (languageKey) => {
    if (!user) {
      console.error('User not loaded yet');
      return;
    }

    setLoading(true);
    setSelectedLanguage(languageKey); // ✅ Ensure selectedLanguage state is set IMMEDIATELY

    try {
      const progress = user.language_learning_progress?.[languageKey];

      if (progress && progress.placement_completed && progress.level) {
        // HAS SAVED PROGRESS - Skip placement test and show lessons
        setUserLevel(progress.level);
        setCompletedLessons(progress.completed_lessons || []);
        setTotalXP(progress.xp || 0);
        setStreak(progress.streak || 0);
        setShowPlacementTest(false); // ✅ Make sure placement test is hidden
        
        speak(`Welcome back! Continuing your ${LANGUAGES[languageKey].name} learning at level ${progress.level}.`, 'en-US');
        
        // ✅ Generate lessons and show them
        await generateLessons(progress.level);
      } else {
        // NO SAVED PROGRESS - Take placement test
        setUserLevel(null);
        setCompletedLessons([]);
        setTotalXP(0);
        setStreak(0);
        setLessons([]); // ✅ Clear lessons before starting placement test
        
        speak(`Welcome! Let's start with a ${LANGUAGES[languageKey].name} placement test to find your level.`, 'en-US');
        
        await generatePlacementTest();
      }
    } catch (error) {
      console.error('Error loading language progress:', error);
      alert('Failed to load progress. Please try again.');
      setSelectedLanguage(null);
      setLoading(false); // Make sure to turn off loading on error
    }

    setLoading(false);
  };

  // Save progress for current language - ENHANCED with per-lesson progress
  const saveLanguageProgress = async (updates) => {
    if (!user || !selectedLanguage) {
      console.warn('Cannot save progress: user or selected language missing.');
      return;
    }
    
    // Fetch latest user data from DB to ensure we don't overwrite concurrent updates
    const latestUser = await base44.auth.me(); 
    const currentProgress = latestUser.language_learning_progress || {};

    const languageProgress = currentProgress[selectedLanguage] || {};
    
    const updatedProgress = {
      ...currentProgress,
      [selectedLanguage]: {
        ...languageProgress,
        ...updates,
        last_active: new Date().toISOString()
      }
    };
    
    try {
      await base44.auth.updateMe({
        language_learning_progress: updatedProgress
      });
      
      // Update local user state immediately for responsiveness
      setUser(prevUser => {
        if (!prevUser) return null;
        return {
          ...prevUser,
          language_learning_progress: updatedProgress
        };
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
      alert('Failed to save progress. Please try again.');
    }
  };

  const speak = (text, lang = 'en-US') => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  // AI Teacher Chat Function - Modified to accept optional text parameter and speak responses
  const askTeacher = async (questionText) => {
    const question = questionText || teacherInput.trim();
    
    if (!question || teacherLoading) return;

    setTeacherInput('');
    setTeacherVoiceInput(''); // Clear voice input field as well
    setTeacherMessages(prev => [...prev, { role: 'user', content: question }]);
    setTeacherLoading(true);

    try {
      const languageName = LANGUAGES[selectedLanguage]?.name || 'the language';
      const currentExercise = lessonContent?.exercises[currentExerciseIndex];

      let context = `You are a friendly ${languageName} teacher helping a student. `;

      if (currentExercise) {
        context += `The student is currently working on a ${currentExercise.type} exercise. `;
        if (currentExercise.word) context += `Current word: "${currentExercise.word}". `;
      }

      context += `Student's question: ${question}\n\nProvide a helpful, encouraging response in English (2-3 sentences max). If explaining ${languageName} concepts, be clear and use examples.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: context,
        add_context_from_internet: false
      });

      setTeacherMessages(prev => [...prev, { role: 'assistant', content: response }]);
      
      // Speak the response out loud
      speak(response, 'en-US');
    } catch (error) {
      const errorMsg = "Sorry, I couldn't process that. Please try again!";
      setTeacherMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMsg
      }]);
      speak(errorMsg, 'en-US');
    }

    setTeacherLoading(false);
  };

  // Vocabulary Upload Function
  const handleVocabUpload = async () => {
    if (!selectedLanguage) {
      alert('Please select a language first.');
      return;
    }
    if (!vocabInput.trim() && !vocabFile) {
      alert('Please enter vocabulary or upload a file.');
      return;
    }

    setVocabLoading(true);

    try {
      let vocabularyText = vocabInput;

      // If file uploaded, extract data
      if (vocabFile) {
        const fileUrl = await base44.integrations.Core.UploadFile({ file: vocabFile });

        // Extract text from file
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: fileUrl.file_url,
          json_schema: {
            type: "object",
            properties: {
              vocabulary: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    word: { type: "string" },
                    translation: { type: "string" }
                  },
                  required: ["word", "translation"]
                }
              }
            },
            required: ["vocabulary"]
          }
        });

        if (extractResult.status === 'success' && extractResult.output?.vocabulary) {
          vocabularyText = extractResult.output.vocabulary
            .map(item => `${item.word} = ${item.translation}`)
            .join('\n');
        } else {
          throw new Error("Failed to extract vocabulary from file.");
        }
      }

      // Generate test from vocabulary
      const languageName = LANGUAGES[selectedLanguage].name;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a ${languageName} vocabulary test from this vocabulary list:

${vocabularyText}

Create EXACTLY 20 exercises to test these words:

EXERCISES 1-10: VOCABULARY MATCHING
- Type: "listening"
- word: The ${languageName} word
- options: 4 English translation options (including the correct one + 3 distractors)
- correct_answer: Index of correct option

EXERCISES 11-15: FILL IN THE BLANK
- Type: "fill_blank"
- sentence: A sentence in ${languageName} with "____" where the word should go
- correct_word: The exact ${languageName} word that fills the blank

EXERCISES 16-20: SPEAKING PRACTICE
- Type: "speaking"
- phrase: A sentence using the vocabulary word in ${languageName}
- translation: English translation
- pronunciation: Pronunciation guide

ALL exercises must use words from the provided vocabulary list!

Return valid JSON with 20 exercises.`,
        response_json_schema: {
          type: "object",
          properties: {
            exercises: {
              type: "array",
              minItems: 20,
              maxItems: 20,
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["listening", "fill_blank", "speaking"] },
                  word: { type: "string" },
                  translation: { type: "string" },
                  pronunciation: { type: "string" },
                  sentence: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "number" },
                  correct_word: { type: "string" },
                  phrase: { type: "string" }
                },
                required: ["type"]
              }
            }
          }
        }
      });

      // Validate exercises
      const validatedExercises = response.exercises.map((ex, idx) => {
        if (ex.type === 'fill_blank' && (!ex.correct_word || ex.correct_word.trim() === '')) {
          ex.correct_word = ex.word || 'answer'; // Fallback if correct_word is missing
        }
        if (ex.type === 'listening') {
          if (!ex.options || ex.options.length !== 4) {
            // Provide sensible defaults if options are missing or malformed
            ex.options = [ex.translation || 'Option 1', 'Option 2', 'Option 3', 'Option 4'];
            ex.correct_answer = ex.options.findIndex(opt => opt === ex.translation) || 0;
          }
          if (typeof ex.correct_answer !== 'number' || ex.correct_answer < 0 || ex.correct_answer > 3) {
            ex.correct_answer = 0; // Default to first option
          }
        }
        return ex;
      });

      setLessonContent({
        exercises: validatedExercises,
        title: 'Custom Vocabulary Test'
      });
      setSelectedLesson({ title: 'Custom Vocabulary Test', lesson_number: 999 }); // Assign a dummy lesson number for custom tests
      setCurrentExerciseIndex(0);
      setExerciseAnswers([]);
      setShowVocabUpload(false);
      setVocabInput('');
      setVocabFile(null);

      speak('Starting your custom vocabulary test!', 'en-US');
    } catch (error) {
      console.error('Failed to create vocabulary test:', error);
      alert('Failed to create test. Please try again: ' + error.message);
    }

    setVocabLoading(false);
  };

  // Generate Placement Test - SIMPLIFIED
  const generatePlacementTest = async () => {
    if (!selectedLanguage) {
      console.error('No language selected');
      return;
    }

    setLoading(true);
    setShowPlacementTest(true);
    
    try {
      const languageName = LANGUAGES[selectedLanguage].name;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a ${languageName} placement test with EXACTLY 10 questions to determine proficiency level (A1-C2).

IMPORTANT: ALL questions must be about ${languageName} language, NOT French or any other language!

Questions should cover:
- Basic vocabulary (Questions 1-3) - Test knowledge of ${languageName} words
- Grammar understanding (Questions 4-6) - Test ${languageName} grammar rules
- Reading comprehension (Questions 7-8) - Short texts in ${languageName}
- Advanced structures (Questions 9-10) - Complex ${languageName} usage

For EACH question provide:
1. question_text: Question in English (asking about ${languageName})
2. target_sentence: Sentence in ${languageName} (NOT in French!)
3. options: 4 multiple choice options
4. correct_answer: Index (0-3) of correct answer
5. difficulty: "beginner", "intermediate", or "advanced"

Example for ${languageName}:
{
  "question_text": "What is the ${languageName} word for 'hello'?",
  "target_sentence": "[${languageName} greeting phrase]",
  "options": ["[option in ${languageName}]", "[option in ${languageName}]", "[option in ${languageName}]", "[option in ${languageName}]"],
  "correct_answer": 0,
  "difficulty": "beginner"
}

Return VALID JSON with array of 10 questions about ${languageName}.`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              minItems: 10,
              maxItems: 10,
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  target_sentence: { type: "string" },
                  options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                  correct_answer: { type: "number" },
                  difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] }
                },
                required: ["question_text", "options", "correct_answer", "difficulty"]
              }
            }
          },
          required: ["questions"]
        }
      });

      if (!response || !response.questions || response.questions.length < 10) {
        throw new Error('Invalid AI response - not enough questions generated.');
      }

      setPlacementTestQuestions(response.questions);
      setCurrentPlacementQ(0);
      setPlacementAnswers([]);
      speak(`Let's start your ${languageName} placement test. This will help us understand your level.`, 'en-US');
    } catch (error) {
      console.error('Failed to generate placement test:', error);
      alert(`Failed to create placement test. Please try again.\n\nError: ${error.message || 'Unknown error'}`);
      setShowPlacementTest(false);
      setSelectedLanguage(null);
    }
    
    setLoading(false);
  };

  // Submit Placement Answer
  const submitPlacementAnswer = async (answerIndex) => {
    const newAnswers = [...placementAnswers, answerIndex];
    setPlacementAnswers(newAnswers);

    if (currentPlacementQ < placementTestQuestions.length - 1) {
      setCurrentPlacementQ(currentPlacementQ + 1);
    } else {
      // Calculate level based on correct answers
      let correct = 0;
      placementTestQuestions.forEach((q, idx) => {
        if (newAnswers[idx] === q.correct_answer) correct++;
      });

      const percentage = (correct / placementTestQuestions.length) * 100;
      let level = 'A1';
      if (percentage >= 90) level = 'C2';
      else if (percentage >= 75) level = 'C1';
      else if (percentage >= 60) level = 'B2';
      else if (percentage >= 45) level = 'B1';
      else if (percentage >= 30) level = 'A2';

      setUserLevel(level);

      // SAVE PLACEMENT TEST COMPLETION and initial stats for this language
      await saveLanguageProgress({
        level: level,
        placement_completed: true,
        xp: 0, // Placement test doesn't give XP, lessons do.
        streak: 0,
        completed_lessons: []
      });

      speak(`Great job! Your level is ${level}. Let's start your personalized lessons.`, 'en-US');
      generateLessons(level); // Pass level
    }
  };

  // Generate Lessons - FIXED to ensure lessons array is populated
  const generateLessons = async (level) => {
    if (!selectedLanguage) {
      console.error('No language selected for generateLessons');
      return;
    }
    
    setLoading(true);
    setShowPlacementTest(false); // ✅ Hide placement test when generating lessons

    try {
      const languageName = LANGUAGES[selectedLanguage].name;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Create 12 progressive ${languageName} lessons for level ${level}.

IMPORTANT: All lessons must be for ${languageName} language specifically!

Each lesson should have:
1. title: Lesson title (focused on ${languageName})
2. description: What students will learn in ${languageName}
3. lesson_number: 1-12
4. topics: Array of ${languageName} topics covered
5. estimated_minutes: Estimated completion time

Make lessons progressive - each building on the previous.
Focus on practical ${languageName} communication and grammar.

Return valid JSON with array of 12 lessons for ${languageName}.`,
        response_json_schema: {
          type: "object",
          properties: {
            lessons: {
              type: "array",
              minItems: 12,
              maxItems: 12,
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  lesson_number: { type: "number" },
                  topics: { type: "array", items: { type: "string" } },
                  estimated_minutes: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (!response || !response.lessons || response.lessons.length === 0) {
        throw new Error('No lessons generated');
      }

      setLessons(response.lessons);
      setUserLevel(level); // ✅ Make sure level is set
      console.log('✅ Generated lessons:', response.lessons.length);
    } catch (error) {
      console.error('Failed to generate lessons:', error);
      alert('Failed to generate lessons. Please try again.');
      resetToLanguageSelection();
    }

    setLoading(false);
  };

  // Start a lesson - generate exercises
  const startLesson = async (lesson) => {
    setSelectedLesson(lesson);
    setLoading(true);
    
    // ✅ Load saved exercise progress for this lesson if it exists
    const lessonProgressKey = `lesson_${lesson.lesson_number}_progress`;
    const savedProgress = user?.language_learning_progress?.[selectedLanguage]?.[lessonProgressKey];
    
    if (savedProgress) {
      setCurrentExerciseIndex(savedProgress.current_exercise || 0);
      setExerciseAnswers(savedProgress.answers || []);
    } else {
      setCurrentExerciseIndex(0);
      setExerciseAnswers([]);
    }

    try {
      const languageName = LANGUAGES[selectedLanguage].name;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a complete ${languageName} lesson: "${lesson.title}"

CRITICAL: This lesson must teach ${languageName} language, NOT French or any other language!

Level: ${userLevel}
Topics: ${lesson.topics.join(', ')}

Create EXACTLY 20 exercises in this order:

EXERCISES 1-5: VOCABULARY INTRODUCTION
- Type: "vocabulary"
- word: The word in ${languageName}
- translation: English translation
- pronunciation: Simple pronunciation guide
- example: Example sentence in ${languageName}
- example_translation: English translation of example
- mnemonic: Memory trick

EXERCISES 6-10: LISTENING & MATCHING
- Type: "listening"
- word: Word in ${languageName}
- options: Array of 4 English translation options
- correct_answer: Index (0-3) of correct option

EXERCISES 11-15: FILL IN THE BLANK
- Type: "fill_blank"
- sentence: Sentence with "____" blank in ${languageName}
- correct_word: The EXACT word that should fill the blank (in ${languageName})
IMPORTANT: correct_word must ALWAYS be provided!

EXERCISES 16-18: SPEAKING PRACTICE
- Type: "speaking"
- phrase: Phrase to say in ${languageName}
- translation: English translation
- pronunciation: Pronunciation guide

EXERCISES 19-20: CONVERSATION
- Type: "conversation"
- dialogue: Array of 4-6 lines in ${languageName}
- dialogue_translation: Array of English translations
- question: Comprehension question in English
- options: 4 answer options
- correct_answer: Index (0-3) of correct answer

ALL content must be in ${languageName}! No French or other languages!

Return valid JSON with exactly 20 exercises.`,
        response_json_schema: {
          type: "object",
          properties: {
            exercises: {
              type: "array",
              minItems: 20,
              maxItems: 20,
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["vocabulary", "listening", "fill_blank", "speaking", "conversation"] },
                  word: { type: "string" },
                  translation: { type: "string" },
                  pronunciation: { type: "string" },
                  example: { type: "string" },
                  example_translation: { type: "string" },
                  mnemonic: { type: "string" },
                  sentence: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "number" },
                  correct_word: { type: "string" },
                  phrase: { type: "string" },
                  dialogue: { type: "array", items: { type: "string" } },
                  dialogue_translation: { type: "array", items: { type: "string" } },
                  question: { type: "string" }
                },
                required: ["type"]
              }
            }
          }
        }
      });

      // Validate and fix exercises
      const validatedExercises = response.exercises.map((ex, idx) => {
        if (ex.type === 'fill_blank') {
          if (!ex.correct_word || ex.correct_word.trim() === '') {
            console.warn(`Exercise ${idx + 1} missing correct_word, attempting to extract...`);
            const words = ex.sentence?.split('____') || [];
            ex.correct_word = words[0]?.trim().split(' ').pop() || 'answer';
          }
        }

        if (ex.type === 'listening' || ex.type === 'conversation') {
          if (!ex.options || ex.options.length !== 4) {
            ex.options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
            ex.correct_answer = 0;
          }
          if (typeof ex.correct_answer !== 'number' || ex.correct_answer < 0 || ex.correct_answer > 3) {
            ex.correct_answer = 0;
          }
        }

        return ex;
      });

      setLessonContent({ ...response, exercises: validatedExercises });
      speak(`Starting lesson: ${lesson.title}`, 'en-US');
    } catch (error) {
      console.error('Failed to generate lesson:', error);
      alert('Failed to create lesson. Please try again.');
      setSelectedLesson(null);
    }

    setLoading(false);
  };

  // Submit exercise answer - ENHANCED to save progress per exercise
  const submitExerciseAnswer = async (answer) => {
    const exercise = lessonContent.exercises[currentExerciseIndex];
    let isCorrect = false;

    if (exercise.type === 'listening' || exercise.type === 'conversation') {
      isCorrect = answer === exercise.correct_answer;
    } else if (exercise.type === 'fill_blank') {
      const correctWord = exercise.correct_word || '';
      const userAnswer = typeof answer === 'string' ? answer : '';
      isCorrect = userAnswer.toLowerCase().trim() === correctWord.toLowerCase().trim() ||
        correctWord.toLowerCase().includes(userAnswer.toLowerCase().trim());
    } else if (exercise.type === 'vocabulary' || exercise.type === 'speaking') {
      isCorrect = true;
    }

    setCurrentAnswer(answer);
    setShowFeedback(true);

    const newAnswers = [...exerciseAnswers, { exercise: currentExerciseIndex, answer, isCorrect }];
    setExerciseAnswers(newAnswers);

    // ✅ SAVE PROGRESS AFTER EACH EXERCISE
    const lessonProgressKey = `lesson_${selectedLesson.lesson_number}_progress`;
    await saveLanguageProgress({
      level: userLevel,
      placement_completed: true,
      completed_lessons: completedLessons,
      xp: totalXP,
      streak: streak,
      [lessonProgressKey]: {
        current_exercise: currentExerciseIndex + 1,
        total_exercises: lessonContent.exercises.length,
        answers: newAnswers,
        last_updated: new Date().toISOString()
      }
    });

    if (isCorrect) {
      speak("Correct! Great job!", 'en-US');
    } else {
      speak("Not quite. Let's see the correct answer.", 'en-US');
    }
  };

  const nextExercise = () => {
    setShowFeedback(false);
    setCurrentAnswer('');
    setUserInput('');

    if (currentExerciseIndex < lessonContent.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      completeLesson();
    }
  };

  const completeLesson = async () => {
    const correctCount = exerciseAnswers.filter(a => a.isCorrect).length;
    const totalCount = exerciseAnswers.length;
    const score = Math.round((correctCount / totalCount) * 100);
    const earnedXP = score * 5;

    const newTotalXP = totalXP + earnedXP;
    const newCompletedLessons = [...completedLessons, selectedLesson.lesson_number];

    setTotalXP(newTotalXP);
    setCompletedLessons(newCompletedLessons);
    setStreak(streak + 1);

    // ✅ CLEAR LESSON PROGRESS WHEN COMPLETED + SAVE FINAL PROGRESS
    const lessonProgressKey = `lesson_${selectedLesson.lesson_number}_progress`;
    await saveLanguageProgress({
      level: userLevel,
      placement_completed: true,
      completed_lessons: newCompletedLessons,
      xp: newTotalXP,
      streak: streak + 1,
      [lessonProgressKey]: null // Clear in-progress data
    });

    speak(`Lesson complete! You scored ${score}% and earned ${earnedXP} XP!`, 'en-US');
    
    // Return to lesson selection screen
    setLessonContent(null);
    setSelectedLesson(null);
    setCurrentExerciseIndex(0);
    setExerciseAnswers([]);
  };

  // ✅ IMPROVED reset function - properly clears all state
  const resetToLanguageSelection = () => {
    setSelectedLanguage(null);
    setShowPlacementTest(false);
    setUserLevel(null);
    setLessons([]);
    setSelectedLesson(null);
    setLessonContent(null);
    setTeacherMessages([]);
    setVocabInput('');
    setVocabFile(null);
    setCurrentExerciseIndex(0); // Add this
    setExerciseAnswers([]); // Add this
    setPlacementTestQuestions([]); // Add this
    setCurrentPlacementQ(0); // Add this
    setPlacementAnswers([]); // Add this
    // Reset stats to 0 as no language is selected
    setTotalXP(0);
    setStreak(0);
    setCompletedLessons([]);
  };

  if (!isAuthenticated) {
    return (
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-purple-600" />
            Language Learning - Like Babbel
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Lock className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <Button onClick={() => base44.auth.redirectToLogin()} className="bg-purple-600">
            Login to Start Learning
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 flex items-center justify-center">
        <Card className="max-w-md border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
            <h3 className="text-xl font-bold mb-2">Creating your personalized content...</h3>
            <p className="text-slate-600">This may take a moment</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 4: LESSON IN PROGRESS
  if (lessonContent && selectedLesson) {
    const exercise = lessonContent.exercises[currentExerciseIndex];
    const progress = ((currentExerciseIndex + 1) / lessonContent.exercises.length) * 100;
    const isLastExercise = currentExerciseIndex === lessonContent.exercises.length - 1;

    // Draggable AI Teacher Button handlers
    const handleMouseDown = (e) => {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - teacherPosition.x,
        y: e.clientY - teacherPosition.y
      });
    };

    const handleMouseMove = (e) => {
      if (isDragging) {
        setTeacherPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Draggable AI Teacher Button */}
        <div
          style={{
            position: 'fixed',
            bottom: teacherPosition.y ? `${window.innerHeight - teacherPosition.y - 80}px` : '32px',
            right: teacherPosition.x ? `${window.innerWidth - teacherPosition.x - 80}px` : '32px',
            zIndex: 50,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="relative group">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isDragging) {
                  setShowTeacherChat(true);
                }
              }}
              className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl flex flex-col items-center justify-center hover:scale-110 transition-all animate-bounce hover:animate-none"
            >
              <MessageCircle className="w-8 h-8 mb-1" />
              <span className="text-[10px] font-bold">Ask Teacher</span> {/* Changed from Ask AI */}
            </button>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-900 text-white text-sm rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
              <p className="font-bold mb-1">👨‍🏫 AI Teacher</p>
              <p className="text-xs">Click to ask questions or drag to move!</p>
              <div className="absolute top-full right-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-900"></div>
            </div>
          </div>
        </div>

        {/* AI Teacher Chat Dialog - WITH VOICE INPUT */}
        <Dialog open={showTeacherChat} onOpenChange={setShowTeacherChat}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-blue-600" />
                Ask Your Teacher 👨‍🏫
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="h-80 overflow-y-auto space-y-3 p-4 bg-slate-50 rounded-lg">
                {teacherMessages.length === 0 && !isTeacherListening && (
                  <div className="text-center text-slate-500 py-8">
                    <Brain className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                    <p>Ask me anything about {LANGUAGES[selectedLanguage]?.name || 'the language'}!</p>
                    <p className="text-sm mt-2">I'm here to help explain, clarify, and support you! 💪</p>
                    <p className="text-xs mt-3 text-blue-600">💬 Type or 🎤 Speak - I understand both!</p>
                  </div>
                )}

                {teacherMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] rounded-2xl p-4 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                          : 'bg-white text-slate-900 border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {teacherLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl p-4 border">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Voice input indicator */}
                {isTeacherListening && (
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl p-4 max-w-[75%]">
                      <div className="flex items-center gap-2 mb-2">
                        <Mic className="w-4 h-4 animate-pulse" />
                        <span className="text-sm font-semibold">Listening...</span>
                      </div>
                      {teacherVoiceInput && (
                        <p className="text-sm">{teacherVoiceInput}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input area with voice & text options */}
              <div className="space-y-2">
                {!isTeacherListening ? (
                  <div className="flex gap-2">
                    <Input
                      value={teacherInput}
                      onChange={(e) => setTeacherInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          askTeacher();
                        }
                      }}
                      placeholder="Type your question..."
                      className="flex-1"
                      disabled={teacherLoading}
                    />
                    <Button
                      onClick={() => askTeacher()}
                      disabled={!teacherInput.trim() || teacherLoading}
                      className="bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={startTeacherVoiceInput}
                      disabled={teacherLoading || !('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600"
                      title="Ask with voice"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={stopTeacherVoiceInput}
                    className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 py-6 text-lg animate-pulse"
                  >
                    <Mic className="w-6 h-6 mr-2" />
                    Stop & Send Question
                  </Button>
                )}
                <p className="text-xs text-center text-slate-500">
                  {isTeacherListening 
                    ? '🎤 Speaking... Click "Stop" when done'
                    : '💬 Type or click 🎤 to speak your question'
                  }
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              onClick={() => {
                // ✅ FIXED: Go back to lesson selection, not start page
                setLessonContent(null);
                setSelectedLesson(null);
                setCurrentExerciseIndex(0);
                setExerciseAnswers([]);
                setShowFeedback(false);
                setCurrentAnswer('');
                setUserInput('');
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Back to Lessons
            </Button>
            <Badge className="bg-purple-600 text-white">
              {currentExerciseIndex + 1} / {lessonContent.exercises.length}
            </Badge>
          </div>

          <Progress value={progress} className="h-3 mb-8" />

          <Card className="border-none shadow-2xl">
            <CardContent className="p-8 lg:p-12">
              {/* VOCABULARY TYPE */}
              {exercise.type === 'vocabulary' && (
                <div className="text-center space-y-6">
                  <Badge className="bg-blue-100 text-blue-800">New Word</Badge>

                  <div>
                    <Button
                      onClick={() => speak(exercise.word, LANGUAGES[selectedLanguage].code)}
                      className="bg-blue-600 hover:bg-blue-700 mb-4"
                    >
                      <Volume2 className="w-5 h-5 mr-2" />
                      Listen
                    </Button>
                    <h1 className="text-6xl font-bold text-slate-900 mb-2">{exercise.word}</h1>
                    <p className="text-lg text-slate-600">/{exercise.pronunciation}/</p>
                  </div>

                  <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                    <p className="text-3xl font-bold text-green-900 mb-2">{exercise.translation}</p>
                  </div>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-6">
                      <p className="text-lg font-semibold text-blue-900 mb-2">{exercise.example}</p>
                      <p className="text-blue-700">{exercise.example_translation}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-6">
                      <p className="font-bold text-yellow-900 mb-2">💡 Memory Tip:</p>
                      <p className="text-yellow-800">{exercise.mnemonic}</p>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={() => submitExerciseAnswer('learned')}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                    size="lg"
                  >
                    Got It! Continue
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              )}

              {/* LISTENING TYPE */}
              {exercise.type === 'listening' && !showFeedback && (
                <div className="space-y-6">
                  <Badge className="bg-purple-100 text-purple-800">Listening Practice</Badge>

                  <div className="text-center mb-8">
                    <Button
                      onClick={() => speak(exercise.word, LANGUAGES[selectedLanguage].code)}
                      className="bg-purple-600 hover:bg-purple-700"
                      size="lg"
                    >
                      <Volume2 className="w-6 h-6 mr-2" />
                      Play Word
                    </Button>
                    <p className="text-sm text-slate-500 mt-2">What does this word mean?</p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {exercise.options.map((option, idx) => (
                      <Button
                        key={idx}
                        onClick={() => submitExerciseAnswer(idx)}
                        variant="outline"
                        className="w-full py-6 text-lg hover:bg-purple-50 hover:border-purple-400"
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* FILL IN THE BLANK */}
              {exercise.type === 'fill_blank' && !showFeedback && (
                <div className="space-y-6">
                  <Badge className="bg-orange-100 text-orange-800">Fill in the Blank</Badge>

                  <div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200">
                    <p className="text-xl text-slate-900 font-medium">{exercise.sentence}</p>
                  </div>

                  <div>
                    <Input
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={`Type the word in ${LANGUAGES[selectedLanguage].name}...`}
                      className="text-xl p-6"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && userInput.trim()) {
                          submitExerciseAnswer(userInput);
                        }
                      }}
                    />
                  </div>

                  <Button
                    onClick={() => submitExerciseAnswer(userInput)}
                    disabled={!userInput.trim()}
                    className="w-full bg-gradient-to-r from-orange-600 to-red-600"
                    size="lg"
                  >
                    Check Answer
                  </Button>
                </div>
              )}

              {/* SPEAKING TYPE */}
              {exercise.type === 'speaking' && (
                <div className="text-center space-y-6">
                  <Badge className="bg-pink-100 text-pink-800">Speaking Practice</Badge>

                  <div>
                    <p className="text-sm text-slate-600 mb-4">Say this phrase out loud:</p>
                    <h1 className="text-5xl font-bold text-slate-900 mb-4">{exercise.phrase}</h1>
                    <p className="text-lg text-slate-600">/{exercise.pronunciation}/</p>
                  </div>

                  <Button
                    onClick={() => speak(exercise.phrase, LANGUAGES[selectedLanguage].code)}
                    className="bg-pink-600 hover:bg-pink-700"
                    size="lg"
                  >
                    <Volume2 className="w-6 h-6 mr-2" />
                    Hear Pronunciation
                  </Button>

                  <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                    <p className="text-xl text-green-900">{exercise.translation}</p>
                  </div>

                  <Button
                    onClick={() => submitExerciseAnswer('practiced')}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                    size="lg"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    I Practiced - Continue
                  </Button>
                </div>
              )}

              {/* CONVERSATION TYPE */}
              {exercise.type === 'conversation' && !showFeedback && (
                <div className="space-y-6">
                  <Badge className="bg-indigo-100 text-indigo-800">Conversation</Badge>

                  <div className="space-y-4">
                    {exercise.dialogue.map((line, idx) => (
                      <Card key={idx} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-purple-50'}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Button
                              onClick={() => speak(line, LANGUAGES[selectedLanguage].code)}
                              size="sm"
                              variant="ghost"
                            >
                              <Volume2 className="w-4 h-4" />
                            </Button>
                            <p className="font-semibold text-lg">{line}</p>
                          </div >
                          <p className="text-sm text-slate-600 ml-10">{exercise.dialogue_translation[idx]}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="bg-slate-100 rounded-xl p-6">
                    <p className="font-semibold mb-4">{exercise.question}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {exercise.options.map((option, idx) => (
                        <Button
                          key={idx}
                          onClick={() => submitExerciseAnswer(idx)}
                          variant="outline"
                          className="w-full py-4 hover:bg-indigo-50 hover:border-indigo-400"
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* FEEDBACK */}
              {showFeedback && (
                <div className="text-center space-y-6">
                  {exerciseAnswers[exerciseAnswers.length - 1]?.isCorrect ? (
                    <>
                      <CheckCircle className="w-24 h-24 text-green-600 mx-auto" />
                      <h2 className="text-3xl font-bold text-green-900">Excellent! 🎉</h2>
                      {(exercise.type === 'listening' || exercise.type === 'conversation') && (
                        <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                          <p className="text-xl font-semibold text-green-900 mb-2">{exercise.word || exercise.dialogue[0]}</p>
                          <p className="text-green-700">{exercise.options[exercise.correct_answer]}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <X className="w-24 h-24 text-orange-600 mx-auto" />
                      <h2 className="text-3xl font-bold text-orange-900">Not Quite</h2>
                      <div className="bg-orange-50 rounded-xl p-6 border-2 border-orange-200">
                        <p className="text-sm text-orange-700 mb-2">Correct answer:</p>
                        {exercise.type === 'fill_blank' ? (
                          <p className="text-2xl font-bold text-orange-900">{exercise.correct_word}</p>
                        ) : (
                          <p className="text-xl font-bold text-orange-900">{exercise.options[exercise.correct_answer]}</p>
                        )}
                      </div>
                    </>
                  )}

                  <Button
                    onClick={isLastExercise ? completeLesson : nextExercise}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                    size="lg"
                  >
                    {isLastExercise ? (
                      <>Complete Lesson <Trophy className="w-5 h-5 ml-2" /></>
                    ) : (
                      <>Continue <ArrowRight className="w-5 h-5 ml-2" /></>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // STEP 3: LESSON SELECTION - ✅ ADDED PER-LESSON PROGRESS BARS
  if (lessons.length > 0 && !selectedLesson) {
    const totalLessons = lessons.length;
    const completedCount = completedLessons.length;
    const overallProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
        <div className="max-w-5xl mx-auto">
          <Button variant="ghost" onClick={resetToLanguageSelection} className="mb-6">
            <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
            Back to Languages
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4">
              <span className="text-6xl">{LANGUAGES[selectedLanguage].flag}</span> {LANGUAGES[selectedLanguage].name}
            </h1>
            <Badge className="bg-purple-600 text-white text-lg px-6 py-2">Level: {userLevel}</Badge>
          </div>

          {/* Overall Progress Bar */}
          <Card className="mb-6 border-none shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">Overall Progress</h3>
                <span className="text-2xl font-bold text-purple-600">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3 mb-2" />
              <p className="text-sm text-slate-600 text-center">
                {completedCount} of {totalLessons} lessons completed
              </p>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-none">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{totalXP}</p>
                <p className="text-xs">XP</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500 to-pink-500 text-white border-none">
              <CardContent className="p-4 text-center">
                <Flame className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{streak}</p>
                <p className="text-xs">Day Streak</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-none">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2" />
                <p className="text-3xl font-bold">{completedLessons.length}</p>
                <p className="text-xs">Completed</p>
              </CardContent>
            </Card>
          </div>

          <h2 className="text-3xl font-bold mb-6">Your Learning Path</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {lessons.map((lesson) => {
              const isCompleted = completedLessons.includes(lesson.lesson_number);
              
              // ✅ GET PER-LESSON PROGRESS
              const lessonProgressKey = `lesson_${lesson.lesson_number}_progress`;
              const lessonProgress = user?.language_learning_progress?.[selectedLanguage]?.[lessonProgressKey];
              const currentEx = lessonProgress?.current_exercise || 0;
              const totalEx = lessonProgress?.total_exercises || 20;
              const lessonProgressPercent = lessonProgress ? Math.round((currentEx / totalEx) * 100) : 0;

              return (
                <Card
                  key={lesson.lesson_number}
                  className={`border-none shadow-xl hover:scale-105 transition-all cursor-pointer ${
                    isCompleted ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-500' : ''
                  }`}
                  onClick={() => startLesson(lesson)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <Badge className="bg-purple-600 text-white">
                        Lesson {lesson.lesson_number}
                      </Badge>
                      {isCompleted && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                    </div>

                    <h3 className="font-bold text-xl mb-2">{lesson.title}</h3>
                    <p className="text-sm text-slate-600 mb-4">{lesson.description}</p>

                    {/* ✅ PER-LESSON PROGRESS BAR */}
                    {!isCompleted && lessonProgress && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                          <span>In Progress</span>
                          <span>{currentEx}/{totalEx} exercises</span>
                        </div>
                        <Progress value={lessonProgressPercent} className="h-2" />
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                      <span>⏱️ {lesson.estimated_minutes} min</span>
                      <span>📚 {lesson.topics.length} topics</span>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {isCompleted ? 'Review Lesson' : lessonProgress ? 'Continue Lesson' : 'Start Lesson'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: PLACEMENT TEST
  if (showPlacementTest && placementTestQuestions.length > 0) {
    const question = placementTestQuestions[currentPlacementQ];
    const progress = ((currentPlacementQ + 1) / placementTestQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 flex items-center justify-center">
        <Card className="max-w-2xl w-full border-none shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <Badge className="bg-purple-100 text-purple-700">
                Question {currentPlacementQ + 1} of {placementTestQuestions.length}
              </Badge>
              <Badge className={`${
                question.difficulty === 'beginner' ? 'bg-green-100 text-green-700' :
                question.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {question.difficulty}
              </Badge>
            </div>
            <Progress value={progress} className="h-2 mb-4" />
            <CardTitle className="text-2xl">{question.question_text}</CardTitle>
            {question.target_sentence && (
              <div className="bg-blue-50 rounded-lg p-4 mt-4 border-2 border-blue-200">
                <p className="text-xl font-semibold text-blue-900">{question.target_sentence}</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {question.options.map((option, idx) => (
              <Button
                key={idx}
                onClick={() => submitPlacementAnswer(idx)}
                variant="outline"
                className="w-full p-6 text-left hover:bg-purple-50 hover:border-purple-400 text-lg"
              >
                {option}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // STEP 1: LANGUAGE SELECTION - FIXED
  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Globe className="w-7 h-7 text-purple-600" />
          <div>
            <h3 className="text-2xl">Language Learning - Like Babbel 🌍</h3>
            <p className="text-sm text-slate-600">Complete placement test → Personalized lessons → Real practice</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        {user?.language_learning_progress && Object.keys(user.language_learning_progress).length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white border-none">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {Object.values(user.language_learning_progress).reduce((sum, lang) => sum + (lang.xp || 0), 0)}
                </p>
                <p className="text-xs">Total XP</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500 to-pink-500 text-white border-none">
              <CardContent className="p-4 text-center">
                <Flame className="w-8 h-8 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {Object.values(user.language_learning_progress).reduce((max, lang) => Math.max(max, (lang.streak || 0)), 0)}
                </p>
                <p className="text-xs">Longest Streak</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-none">
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 mx-auto mb-2" />
                <p className="text-2xl font-bold">
                  {Object.values(user.language_learning_progress).reduce((sum, lang) => sum + (lang.completed_lessons?.length || 0), 0)}
                </p>
                <p className="text-xs">Lessons Done</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div>
          <h3 className="font-bold mb-3">Choose Your Language</h3>
          
          {userLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
              <p className="text-sm text-slate-600">Loading your progress...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(LANGUAGES).map(([key, lang]) => (
                <Button
                  key={key}
                  onClick={async () => {
                    // setSelectedLanguage(key); // Already handled inside loadLanguageProgress
                    await loadLanguageProgress(key);
                  }}
                  disabled={loading || userLoading}
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-2 hover:bg-purple-100"
                >
                  <span className="text-4xl">{lang.flag}</span>
                  <span className="font-bold">{lang.name}</span>
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Upload Vocabulary Button */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Upload className="w-6 h-6 text-green-600" />
              <h3 className="font-bold text-lg">Upload Your Own Vocabulary 📝</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Upload a vocabulary list and we'll create a personalized test for you!
            </p>
            <Button
              onClick={() => setShowVocabUpload(true)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Custom Test
            </Button>
          </CardContent>
        </Card>

        {/* Vocabulary Upload Dialog */}
        <Dialog open={showVocabUpload} onOpenChange={setShowVocabUpload}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Vocabulary Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold mb-2">Select Language</h3>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(LANGUAGES).map(([key, lang]) => (
                    <Button
                      key={key}
                      onClick={() => setSelectedLanguage(key)}
                      variant={selectedLanguage === key ? "default" : "outline"}
                      className="h-auto py-4"
                    >
                      <span className="text-2xl">{lang.flag}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-2">Enter Vocabulary</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Format: word = translation (one per line)
                </p>
                <Textarea
                  value={vocabInput}
                  onChange={(e) => setVocabInput(e.target.value)}
                  placeholder={`Example:\nbonjour = hello\nmerci = thank you\nau revoir = goodbye`}
                  rows={10}
                  className="font-mono"
                />
              </div>

              <div>
                <h3 className="font-bold mb-2">Or Upload File</h3>
                <input
                  type="file"
                  accept=".txt,.csv"
                  onChange={(e) => setVocabFile(e.target.files[0])}
                  className="w-full"
                />
                {vocabFile && (
                  <p className="text-sm text-green-600 mt-2">
                    ✓ {vocabFile.name} selected
                  </p>
                )}
              </div>

              <Button
                onClick={handleVocabUpload}
                disabled={vocabLoading || !selectedLanguage || (!vocabInput.trim() && !vocabFile)}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600"
                size="lg"
              >
                {vocabLoading ? (
                  <>Creating Test...</>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Test (20 Questions)
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              How It Works (Like Babbel):
            </h3>
            <ul className="space-y-2 text-sm">
              <li>✅ <strong>1. Placement Test</strong> - 10 questions to find your level (A1-C2)</li>
              <li>✅ <strong>2. Personalized Lessons</strong> - 12 lessons adapted to YOUR level</li>
              <li>✅ <strong>3. Real Practice</strong> - 20 exercises per lesson</li>
              <li>✅ <strong>4. Multiple Methods</strong> - Vocabulary, listening, speaking, conversation</li>
              <li>✅ <strong>5. Native Audio</strong> - Hear correct pronunciation</li>
              <li>✅ <strong>6. Progress Tracking</strong> - XP, streaks, completed lessons</li>
              <li>✨ <strong>7. AI Teacher</strong> - Ask questions anytime during lessons!</li>
              <li>📝 <strong>8. Custom Tests</strong> - Upload your own vocabulary lists</li>
            </ul>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
