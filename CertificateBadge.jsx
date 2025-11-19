import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Star, Trophy, Crown, Gem, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const badgeTiers = {
  bronze: {
    name: "Bronze Achiever",
    icon: Award,
    color: "from-orange-600 to-amber-700",
    requiredCourses: 1,
    glowColor: "rgba(251, 146, 60, 0.5)"
  },
  silver: {
    name: "Silver Scholar",
    icon: Star,
    color: "from-gray-400 to-gray-600",
    requiredCourses: 3,
    glowColor: "rgba(156, 163, 175, 0.5)"
  },
  gold: {
    name: "Gold Expert",
    icon: Trophy,
    color: "from-yellow-400 to-yellow-600",
    requiredCourses: 5,
    glowColor: "rgba(250, 204, 21, 0.5)"
  },
  platinum: {
    name: "Platinum Pro",
    icon: Crown,
    color: "from-blue-400 to-purple-600",
    requiredCourses: 10,
    glowColor: "rgba(147, 51, 234, 0.5)"
  },
  diamond: {
    name: "Diamond Master",
    icon: Gem,
    color: "from-cyan-400 to-blue-600",
    requiredCourses: 15,
    glowColor: "rgba(34, 211, 238, 0.5)"
  },
  master: {
    name: "Ultimate Master",
    icon: Sparkles,
    color: "from-pink-500 via-purple-500 to-indigo-600",
    requiredCourses: 20,
    glowColor: "rgba(236, 72, 153, 0.5)"
  }
};

export function BadgeDisplay({ badge, size = "md" }) {
  const badgeInfo = badgeTiers[badge.badge_tier];
  const Icon = badgeInfo.icon;
  
  const sizes = {
    sm: { container: "w-16 h-16", icon: "w-8 h-8" },
    md: { container: "w-24 h-24", icon: "w-12 h-12" },
    lg: { container: "w-32 h-32", icon: "w-16 h-16" }
  };

  return (
    <div className="relative group cursor-pointer">
      <div className={`${sizes[size].container} rounded-full bg-gradient-to-br ${badgeInfo.color} flex items-center justify-center shadow-2xl transform transition-transform hover:scale-110`}>
        <Icon className={`${sizes[size].icon} text-white`} />
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
          <p className="font-bold">{badgeInfo.name}</p>
          <p className="text-slate-300">Earned: {new Date(badge.earned_date).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

export function GlitterCelebration({ badge, onComplete }) {
  const [particles, setParticles] = useState([]);
  const badgeInfo = badgeTiers[badge.badge_tier];
  const Icon = badgeInfo.icon;

  useEffect(() => {
    // Generate random particles
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,
      y: Math.random() * 100 - 50,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.3,
      size: Math.random() * 8 + 4
    }));
    setParticles(newParticles);

    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm"
      onClick={onComplete}
    >
      {/* Confetti/Glitter Particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute"
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
            scale: 0,
            rotate: 0
          }}
          animate={{
            x: particle.x * 10,
            y: particle.y * 10,
            opacity: 0,
            scale: 1,
            rotate: particle.rotation
          }}
          transition={{
            duration: 2,
            delay: particle.delay,
            ease: "easeOut"
          }}
          style={{
            left: '50%',
            top: '50%',
            width: particle.size,
            height: particle.size,
          }}
        >
          <Sparkles className="text-yellow-400" style={{ width: particle.size, height: particle.size }} />
        </motion.div>
      ))}

      {/* Badge Animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          duration: 0.8
        }}
        className="relative"
      >
        {/* Glow Effect */}
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl"
          style={{ backgroundColor: badgeInfo.glowColor }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Badge Card */}
        <Card className="relative border-4 border-white shadow-2xl overflow-hidden" style={{ width: 400 }}>
          <div className={`h-32 bg-gradient-to-br ${badgeInfo.color} relative overflow-hidden`}>
            {/* Animated background pattern */}
            <motion.div
              className="absolute inset-0"
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)",
                backgroundSize: "20px 20px"
              }}
            />
          </div>

          <CardContent className="text-center -mt-16 pb-8">
            {/* Badge Icon */}
            <motion.div
              className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br ${badgeInfo.color} flex items-center justify-center shadow-2xl relative`}
              animate={{
                rotate: [0, 360]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <Icon className="w-16 h-16 text-white" />
              
              {/* Sparkle effects around badge */}
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${i * 90}deg) translateY(-80px)`
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                >
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </motion.div>
              ))}
            </motion.div>

            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6"
            >
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                🎉 Congratulations! 🎉
              </h2>
              <p className="text-xl font-semibold text-slate-700 mb-2">
                You've earned the
              </p>
              <p className={`text-2xl font-bold bg-gradient-to-r ${badgeInfo.color} bg-clip-text text-transparent mb-4`}>
                {badgeInfo.name}
              </p>
              <p className="text-sm text-slate-600">
                Completed {badge.course_count} courses
              </p>
            </motion.div>

            {/* Click to continue */}
            <motion.p
              className="text-xs text-slate-400 mt-6"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Click anywhere to continue
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export function BadgeGrid({ badges }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-8">
        <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">Complete courses to earn badges!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {badges.map((badge, idx) => (
        <motion.div
          key={badge.badge_id}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
        >
          <BadgeDisplay badge={badge} size="md" />
        </motion.div>
      ))}
    </div>
  );
}

export function NextBadgeProgress({ completedCourses }) {
  // Find next badge to earn
  const tiers = Object.entries(badgeTiers).sort((a, b) => a[1].requiredCourses - b[1].requiredCourses);
  const nextBadge = tiers.find(([_, info]) => info.requiredCourses > completedCourses);
  
  if (!nextBadge) {
    return (
      <Card className="border-none shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <CardContent className="p-6 text-center">
          <Trophy className="w-12 h-12 mx-auto mb-3" />
          <p className="font-bold text-xl">🏆 You've earned ALL badges! 🏆</p>
          <p className="text-sm opacity-90 mt-2">You're a true master! Keep learning!</p>
        </CardContent>
      </Card>
    );
  }

  const [tierId, tierInfo] = nextBadge;
  const Icon = tierInfo.icon;
  const progress = (completedCourses / tierInfo.requiredCourses) * 100;
  const remaining = tierInfo.requiredCourses - completedCourses;

  return (
    <Card className="border-none shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${tierInfo.color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-600 font-semibold">Next Badge</p>
            <p className={`text-xl font-bold bg-gradient-to-r ${tierInfo.color} bg-clip-text text-transparent`}>
              {tierInfo.name}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Progress</span>
            <span className="font-bold text-slate-900">{completedCourses} / {tierInfo.requiredCourses}</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${tierInfo.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-slate-500 text-center">
            {remaining} more {remaining === 1 ? 'course' : 'courses'} to unlock!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default { BadgeDisplay, GlitterCelebration, BadgeGrid, NextBadgeProgress };