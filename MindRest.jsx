import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Volume2, VolumeX, Settings, Play, Wind } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AMBIENT_SOUNDS = [
  {
    id: 'ocean',
    name: 'Ocean Waves',
    emoji: '🌊',
    url: 'https://assets.mixkit.co/active_storage/sfx/2393/2393.wav'
  },
  {
    id: 'rain',
    name: 'Rain',
    emoji: '🌧️',
    url: 'https://assets.mixkit.co/active_storage/sfx/2393/2393.wav'
  },
  {
    id: 'forest',
    name: 'Forest Birds',
    emoji: '🦜',
    url: 'https://assets.mixkit.co/active_storage/sfx/2393/2393.wav'
  },
  {
    id: 'wind',
    name: 'Gentle Wind',
    emoji: '💨',
    url: 'https://assets.mixkit.co/active_storage/sfx/2393/2393.wav'
  },
  {
    id: 'fire',
    name: 'Fireplace',
    emoji: '🔥',
    url: 'https://assets.mixkit.co/active_storage/sfx/2393/2393.wav'
  },
  {
    id: 'night',
    name: 'Night Ambience',
    emoji: '🌙',
    url: 'https://assets.mixkit.co/active_storage/sfx/2393/2393.wav'
  }
];

const DURATIONS = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '20 min', seconds: 1200 },
  { label: '30 min', seconds: 1800 }
];

const BREATHING_EXERCISES = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: '4-4-4-4 pattern',
    phases: [
      { text: 'Breathe In', duration: 4 },
      { text: 'Hold', duration: 4 },
      { text: 'Breathe Out', duration: 4 },
      { text: 'Hold', duration: 4 }
    ]
  },
  {
    id: 'calm',
    name: '4-7-8 Breathing',
    description: 'Deep relaxation',
    phases: [
      { text: 'Breathe In', duration: 4 },
      { text: 'Hold', duration: 7 },
      { text: 'Breathe Out', duration: 8 }
    ]
  },
  {
    id: 'simple',
    name: 'Simple Breathing',
    description: '5-5 pattern',
    phases: [
      { text: 'Breathe In', duration: 5 },
      { text: 'Breathe Out', duration: 5 }
    ]
  }
];

const NATURE_SCENES = [
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80',
    name: 'Tropical Beach'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
    name: 'Forest Path'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
    name: 'Mountain Lake'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=1920&q=80',
    name: 'Waterfall'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1920&q=80',
    name: 'Rainforest'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80',
    name: 'Sunset Beach'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&q=80',
    name: 'Misty Valley'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1920&q=80',
    name: 'Bamboo Forest'
  }
];

export default function MindRest({ isOpen, onClose }) {
  const [step, setStep] = useState('setup'); // 'setup' or 'session'
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(300);
  const [selectedSound, setSelectedSound] = useState(AMBIENT_SOUNDS[0]);
  const [selectedBreathing, setSelectedBreathing] = useState(BREATHING_EXERCISES[0]);
  const [timeLeft, setTimeLeft] = useState(300);
  const [breathingPhase, setBreathingPhase] = useState(0);
  const [breathingTimer, setBreathingTimer] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const audioRef = useRef(null);

  const currentScene = NATURE_SCENES[currentSceneIndex];
  const currentPhase = selectedBreathing.phases[breathingPhase];

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCurrentSceneIndex(prev => (prev + 1) % NATURE_SCENES.length);
    }, 12000);

    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isMuted || step !== 'session') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(selectedSound.url);
    audio.loop = true;
    audio.volume = 0.3;
    
    const playAudio = () => {
      audio.play()
        .then(() => console.log('✅ Ambient sound playing'))
        .catch(err => {
          console.log('Audio play prevented, will retry on user interaction:', err);
          document.addEventListener('click', () => {
            audio.play().catch(e => console.log('Still blocked:', e));
          }, { once: true });
        });
    };

    playAudio();
    audioRef.current = audio;

    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, [selectedSound, isMuted, isOpen, step]);

  useEffect(() => {
    if (!isOpen || step !== 'session') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose, step]);

  useEffect(() => {
    if (!isOpen || step !== 'session') return;

    const breathingTimer = setInterval(() => {
      setBreathingTimer(prev => {
        if (prev >= currentPhase.duration) {
          setBreathingPhase(p => (p + 1) % selectedBreathing.phases.length);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(breathingTimer);
  }, [isOpen, step, currentPhase, selectedBreathing]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setStep('setup');
      setTimeLeft(selectedDuration);
      setCurrentSceneIndex(0);
      setBreathingPhase(0);
      setBreathingTimer(0);
      setShowSettings(false);
    }
  }, [isOpen, selectedDuration]);

  const startSession = () => {
    setTimeLeft(selectedDuration);
    setStep('session');
  };

  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Setup screen
  if (step === 'setup') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4"
      >
        <Card className="max-w-2xl w-full border-none shadow-2xl">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-slate-900">🌊 Mind Rest Setup</h2>
              <Button onClick={onClose} variant="ghost" size="icon">
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-bold mb-3 text-slate-900">Session Duration</label>
                <div className="grid grid-cols-5 gap-2">
                  {DURATIONS.map(duration => (
                    <Button
                      key={duration.seconds}
                      onClick={() => setSelectedDuration(duration.seconds)}
                      variant={selectedDuration === duration.seconds ? 'default' : 'outline'}
                      className={selectedDuration === duration.seconds ? 'bg-blue-600 text-white' : ''}
                    >
                      {duration.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Sound Selection */}
              <div>
                <label className="block text-sm font-bold mb-3 text-slate-900">Ambient Sound</label>
                <div className="grid grid-cols-3 gap-2">
                  {AMBIENT_SOUNDS.map(sound => (
                    <Button
                      key={sound.id}
                      onClick={() => setSelectedSound(sound)}
                      variant={selectedSound.id === sound.id ? 'default' : 'outline'}
                      className={`flex items-center gap-2 ${selectedSound.id === sound.id ? 'bg-blue-600 text-white' : ''}`}
                    >
                      <span className="text-xl">{sound.emoji}</span>
                      <span className="text-xs">{sound.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Breathing Exercise Selection */}
              <div>
                <label className="block text-sm font-bold mb-3 text-slate-900">Breathing Guide</label>
                <div className="grid grid-cols-3 gap-2">
                  {BREATHING_EXERCISES.map(exercise => (
                    <Button
                      key={exercise.id}
                      onClick={() => setSelectedBreathing(exercise)}
                      variant={selectedBreathing.id === exercise.id ? 'default' : 'outline'}
                      className={selectedBreathing.id === exercise.id ? 'bg-purple-600 text-white' : ''}
                    >
                      <div className="text-left">
                        <p className="font-bold text-sm">{exercise.name}</p>
                        <p className="text-xs opacity-80">{exercise.description}</p>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={startSession}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 text-xl font-bold shadow-xl"
                size="lg"
              >
                <Play className="w-6 h-6 mr-2" />
                Start Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Active session
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black"
      >
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSceneIndex}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
            >
              <img
                src={currentScene.url}
                alt={currentScene.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80';
                }}
              />
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
        </div>

        <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-1 drop-shadow-lg">Mind Rest</h2>
            <p className="text-white/90 text-sm sm:text-base drop-shadow-md">{currentScene.name}</p>
          </motion.div>

          <div className="flex gap-2 sm:gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
              <p className="text-3xl font-bold text-white tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
            </div>

            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="ghost"
              size="icon"
              className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 h-10 w-10 sm:h-12 sm:w-12"
            >
              <Settings className="w-5 h-5" />
            </Button>

            <Button
              onClick={() => setIsMuted(!isMuted)}
              variant="ghost"
              size="icon"
              className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 h-10 w-10 sm:h-12 sm:w-12"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white border border-white/20 h-10 w-10 sm:h-12 sm:w-12"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {NATURE_SCENES.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentSceneIndex(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSceneIndex
                  ? 'bg-white w-8'
                  : 'bg-white/40 w-2 hover:bg-white/60'
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>

        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <motion.div
            key={breathingPhase}
            className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-4 border-white/50 flex items-center justify-center backdrop-blur-sm"
            animate={{
              scale: currentPhase.text.includes('In') ? [1, 1.3] : currentPhase.text.includes('Out') ? [1.3, 1] : [1, 1],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{
              duration: currentPhase.duration,
              ease: "easeInOut"
            }}
          >
            <div className="text-white text-center">
              <p className="font-bold text-2xl sm:text-3xl mb-2 drop-shadow-lg">{currentPhase.text}</p>
              <p className="text-5xl sm:text-6xl font-black drop-shadow-lg">{currentPhase.duration - breathingTimer}</p>
            </div>
          </motion.div>
        </motion.div>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-20 right-6 z-20"
          >
            <Card className="border-none shadow-2xl bg-white/95 backdrop-blur-xl">
              <CardContent className="p-4 space-y-3 w-64">
                <h3 className="font-bold text-slate-900 mb-2">Quick Settings</h3>
                
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Sound</label>
                  <div className="grid grid-cols-3 gap-1">
                    {AMBIENT_SOUNDS.slice(0, 6).map(sound => (
                      <Button
                        key={sound.id}
                        onClick={() => setSelectedSound(sound)}
                        variant="outline"
                        size="sm"
                        className={`p-1 h-auto ${selectedSound.id === sound.id ? 'bg-blue-100 border-blue-500' : ''}`}
                      >
                        <span className="text-lg">{sound.emoji}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Breathing</label>
                  <div className="space-y-1">
                    {BREATHING_EXERCISES.map(exercise => (
                      <Button
                        key={exercise.id}
                        onClick={() => {
                          setSelectedBreathing(exercise);
                          setBreathingPhase(0);
                          setBreathingTimer(0);
                        }}
                        variant="outline"
                        size="sm"
                        className={`w-full justify-start ${selectedBreathing.id === exercise.id ? 'bg-purple-100 border-purple-500' : ''}`}
                      >
                        <span className="text-xs">{exercise.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 text-center z-10 max-w-xs sm:max-w-2xl px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Wind className="w-5 h-5 text-white/80" />
              <p className="text-white/90 text-sm font-medium">{selectedSound.name}</p>
            </div>
            <p className="text-white text-lg sm:text-xl font-medium mb-2">
              {selectedBreathing.name}
            </p>
            <p className="text-white/80 text-sm sm:text-base italic">
              Follow the breathing guide and let go of all tension
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}