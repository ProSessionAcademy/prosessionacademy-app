import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lock, 
  Crown, 
  Check, 
  X,
  Sparkles,
  Clock,
  Zap
} from "lucide-react";

export default function PaymentWall({ user, onUpgrade }) {
  const [daysLeft, setDaysLeft] = useState(0);
  const [isTrialActive, setIsTrialActive] = useState(false);

  useEffect(() => {
    if (!user) return;

    const now = new Date();
    const trialEnd = user.trial_end_date ? new Date(user.trial_end_date) : null;
    
    if (trialEnd) {
      const diffTime = trialEnd - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysLeft(Math.max(0, diffDays));
      setIsTrialActive(diffDays > 0);
    }
  }, [user]);

  const isPremium = user?.subscription_status === 'premium';
  const isFreeTrial = user?.subscription_status === 'free_trial';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <Card className="max-w-4xl w-full border-none shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10 text-center">
            <Crown className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">
              {isFreeTrial && isTrialActive ? (
                <>Uw gratis proefperiode: {daysLeft} dagen over</>
              ) : (
                <>Ontgrendel volledige toegang</>
              )}
            </h2>
            <p className="text-white/90">
              {isFreeTrial && isTrialActive ? (
                `Upgrade nu om onbeperkte toegang te blijven genieten na uw proefperiode`
              ) : (
                `Uw proefperiode is afgelopen. Upgrade naar premium of ga verder met beperkte toegang`
              )}
            </p>
          </div>
        </div>

        <CardContent className="p-8">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Standard Plan */}
            <Card className="border-2 border-slate-200">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-slate-500" />
                  <h3 className="text-xl font-bold">Standard (Gratis)</h3>
                </div>
                <p className="text-3xl font-bold text-slate-900 mb-6">€0<span className="text-sm font-normal text-slate-500">/maand</span></p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Max 3 cursussen per maand</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Max 2 AI vragen per dag</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Max 1 meeting per maand</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Max 3 posts per maand</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Max 1 course request</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Max 2 documenten downloaden</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Max 1 online event per maand</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>Geen certificaten</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>Geen fysieke events</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" disabled>
                  Huidig Plan
                </Button>
              </div>
            </Card>

            {/* Premium Plan */}
            <Card className="border-4 border-blue-500 shadow-xl relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AANBEVOLEN
                </Badge>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <h3 className="text-xl font-bold">Premium</h3>
                </div>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
                  €2.99<span className="text-sm font-normal text-slate-500">/maand</span>
                </p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">✨ Onbeperkte cursussen</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">🏆 Alle certificaten</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">🤖 Onbeperkt PSA Agent</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">📹 Onbeperkt meetings</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">💬 Onbeperkt community posts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">📥 Onbeperkt downloads</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">🎫 Alle events (online + live)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">👨‍🏫 1-op-1 mentorschap</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="font-semibold">🚫 Geen advertenties</span>
                  </div>
                </div>
                <Button 
                  onClick={onUpgrade}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="lg"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade naar Premium
                </Button>
              </div>
            </Card>
          </div>

          {/* Trial Info */}
          {isFreeTrial && isTrialActive && (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">Uw proefperiode eindigt over {daysLeft} dagen</p>
                  <p className="text-sm text-blue-700">Upgrade nu voor slechts €2.99/maand en behoud volledige toegang!</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-slate-500">
            <p>💳 Veilige betaling • Op elk moment opzegbaar • Geld-terug-garantie</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}