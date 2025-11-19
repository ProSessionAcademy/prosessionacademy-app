import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Briefcase, Users, Calendar, MessageSquare, 
  Sparkles, ChevronRight, ChevronLeft, X, Target, Award,
  Video, Brain, Shield, Crown, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GUIDE_STEPS = [
  {
    title: "Welcome to Pro-Session! 🎉",
    description: "Your complete professional development platform",
    icon: Sparkles,
    color: "from-blue-600 to-purple-600",
    features: [
      "📚 Expert-led courses in leadership, management, sales",
      "🎯 AI-powered practice sessions with real scenarios",
      "👥 Professional community & networking",
      "📊 Track your progress and earn XP points"
    ]
  },
  {
    title: "Learning Hub 📚",
    description: "Access world-class courses and learning pathways",
    icon: BookOpen,
    color: "from-green-600 to-emerald-600",
    features: [
      "Browse courses by category and difficulty",
      "Follow structured learning pathways",
      "Complete quizzes and earn certificates",
      "Track your progress in real-time"
    ]
  },
  {
    title: "Practice Hub 🎯",
    description: "Master skills with AI-powered practice",
    icon: Target,
    color: "from-orange-600 to-red-600",
    features: [
      "Sales calls with AI customers",
      "Job interview simulations",
      "Public speaking practice with feedback",
      "Live role-play with other users"
    ]
  },
  {
    title: "Professional Space 💼",
    description: "Your AI-powered productivity workspace",
    icon: Briefcase,
    color: "from-indigo-600 to-purple-600",
    features: [
      "Manage tasks, documents & meetings",
      "Generate business & marketing plans",
      "Create professional CVs instantly",
      "AI assistant for all work tasks"
    ]
  },
  {
    title: "Community & Groups 👥",
    description: "Connect, collaborate, and grow together",
    icon: Users,
    color: "from-pink-600 to-rose-600",
    features: [
      "Join company or university groups",
      "Share knowledge in discussion forums",
      "Attend live events and workshops",
      "Network with professionals"
    ]
  },
  {
    title: "XP & Rewards ⭐",
    description: "Gamify your professional development",
    icon: Star,
    color: "from-yellow-600 to-orange-600",
    features: [
      "Earn XP by completing courses & activities",
      "Build business empire in Business Tycoon game",
      "Climb global leaderboards",
      "Unlock achievements and badges"
    ]
  },
  {
    title: "Premium Features 👑",
    description: "Upgrade for unlimited access",
    icon: Crown,
    color: "from-purple-600 to-pink-600",
    features: [
      "Unlimited practice sessions",
      "Advanced AI tools & generators",
      "Priority support",
      "All courses & pathways unlocked"
    ]
  }
];

export default function AppGuide({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < GUIDE_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = GUIDE_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 gap-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className={`bg-gradient-to-r ${step.color} text-white p-8 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-white/20 text-white">
                    Step {currentStep + 1} of {GUIDE_STEPS.length}
                  </Badge>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Icon className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black mb-2">{step.title}</h2>
                    <p className="text-xl text-white/90">{step.description}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="space-y-4 mb-8">
                {step.features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-bold text-sm">{idx + 1}</span>
                    </div>
                    <p className="text-slate-700 text-lg leading-relaxed">{feature}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <Button
                  onClick={handlePrev}
                  variant="outline"
                  disabled={currentStep === 0}
                  className="px-6"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  {GUIDE_STEPS.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentStep 
                          ? `bg-gradient-to-r ${step.color} w-8` 
                          : 'bg-slate-300 w-2'
                      }`}
                    />
                  ))}
                </div>

                <Button
                  onClick={handleNext}
                  className={`bg-gradient-to-r ${step.color} px-6`}
                >
                  {currentStep === GUIDE_STEPS.length - 1 ? (
                    <>Get Started</>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}