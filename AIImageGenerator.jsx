import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Download, 
  Loader2, 
  AlertTriangle,
  Shield,
  Camera,
  XCircle
} from "lucide-react";
import { motion } from "framer-motion";

const STYLE_OPTIONS = [
  { id: 'realistic', label: 'Realistic', icon: '📸' },
  { id: 'anime', label: 'Anime', icon: '🎨' },
  { id: 'cartoon', label: 'Cartoon', icon: '🎭' },
  { id: 'oil_painting', label: 'Oil Painting', icon: '🖼️' },
  { id: 'watercolor', label: 'Watercolor', icon: '💧' },
  { id: 'sketch', label: 'Sketch', icon: '✏️' }
];

// 🚨 ULTRA STRICT FILTER - COMPREHENSIVE BLOCKING
const explicitRegex = new RegExp(
  '(naked|nakked|naaked|nakkid|nked|nude|nud|nudity|nudy|topless|top less|bottomless|bottom less|' +
  'nsfw|porn|porno|xxx|explicit|adult|18\\+|mature|' +
  'boob|boobs|boobie|boobies|breast|breasts|tit|tits|titty|titties|nipple|nipples|nip|cleavage|chest|' +
  'booty|bootie|butt|butts|ass|arse|bum|buttock|buttocks|bottom|buns|' +
  'vagina|pussy|cunt|vulva|penis|dick|cock|balls|genital|genitals|crotch|groin|privates|junk|' +
  'sex|sexy|sexi|sexx|sexual|erotic|sensual|seductive|aroused|horny|kinky|naughty|dirty|' +
  'hot girl|hot woman|hot lady|hot body|hot latina|hot asian|hot black|hot white|attractive (woman|girl|lady|man)|' +
  'latina|asian girl|black girl|white girl|curvy girl|thick girl|slim girl|fit girl|' +
  'lingerie|underwear|bra|panties|thong|bikini|swimsuit|swim suit|bathing suit|tank top|crop top|short shorts|' +
  'undress|undressing|strip|stripping|take off|taking off|remove cloth|no cloth|without cloth|barely cloth|minimal cloth|' +
  'revealing|exposed|bare|skin|see through|transparent|sheer|tight (dress|clothes|clothing|pants|shirt)|' +
  'bedroom|bed room|shower|bath|bathroom|hotel room|massage|onlyfans|webcam|cam girl|' +
  'big booty|big butt|big ass|big tit|big breast|thick|thicc|curvy body|voluptuous|shapely|' +
  'hentai|ecchi|ahegao|lewd|waifu|anime girl|harem|oppai|' +
  'blood|gore|murder|kill|killed|dead|death|weapon|gun|knife|violence|violent|attack|hurt|' +
  'pose|posing|model|modeling|photoshoot|photo shoot|glamour|pin.?up|' +
  'cleavage|leg|legs|thigh|thighs|midriff|stomach|belly|navel|' +
  'skin.?tight|body.?suit|spandex|latex|leather clothes|' +
  'bedroom eyes|sultry|provocative|flirty|tempting|alluring|' +
  'onsen|hot spring|sauna|spa|changing room|locker room|' +
  'romance|romantic|intimate|intimacy|lover|kissing|embrace|' +
  'f.ck|sh.t|b.tch|damn|hell|slut|whore|prostitute)',
  'i'
);

const anatomyRegex = new RegExp(
  '(anatomy|figure study|nude art|nude model|life drawing|artistic nude|classical nude|renaissance nude|' +
  'exposed (skin|body|chest|breast|butt|torso|leg|thigh)|bare (skin|body|chest|torso|shoulder|back|leg)|' +
  'showing (breast|butt|body|chest|skin|leg|thigh)|visible (breast|nipple|butt|genital|underwear)|' +
  '(woman|girl|lady|female|man|boy|male|person|people) (naked|nude|topless|bottomless|undress|bare|exposed)|' +
  '(naked|nude|topless|bottomless|bare|exposed) (woman|girl|lady|female|man|boy|male|person|people)|' +
  '(without|no|remove|take off|taking off) (clothes|clothing|shirt|pants|bra|panties|dress|top|bottom)|' +
  '(in|on|at) (bed|shower|bath|bathtub|bedroom)|bedroom scene|' +
  'body (parts?|anatomy)|human (body|anatomy|form)|figure (study|drawing)|' +
  'unbuttoned|unzipped|partially (dressed|clothed)|half (dressed|clothed|naked)|' +
  'wardrobe malfunction|nip slip|upskirt|downblouse)',
  'i'
);

const contextualRegex = new RegExp(
  '((beautiful|attractive|pretty|gorgeous|stunning|hot) (woman|girl|lady|female) (in|with|wearing|at))|' +
  '(woman|girl|lady|female) (in|with|wearing) (tight|short|revealing|low.?cut|skimpy)|' +
  '(lying|laying) (on bed|in bed|down)|' +
  '(wet (clothes|clothing|shirt|dress|body))|' +
  '(covered in|dripping|soaked)|' +
  '(rear view|back view|from behind) (woman|girl)|' +
  '(bent over|bending over|leaning forward)|' +
  '(close.?up|closeup) (of )?(body|skin|chest|breast|butt|thigh|leg)',
  'i'
);

// MAIN SAFETY CHECK - ULTRA STRICT
function isPromptSafe(prompt) {
  const normalized = prompt.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
  
  console.log('🔍 CHECKING PROMPT:', normalized);
  
  // Check all three filter levels
  const explicitBlock = explicitRegex.test(normalized);
  const anatomyBlock = anatomyRegex.test(normalized);
  const contextBlock = contextualRegex.test(normalized);
  
  if (explicitBlock) console.log('🚫 BLOCKED BY EXPLICIT FILTER');
  if (anatomyBlock) console.log('🚫 BLOCKED BY ANATOMY FILTER');
  if (contextBlock) console.log('🚫 BLOCKED BY CONTEXTUAL FILTER');
  
  const result = !(explicitBlock || anatomyBlock || contextBlock);
  
  if (result) {
    console.log('✅ PASSED ALL FILTERS');
  }
  
  return result;
}

export default function AIImageGenerator() {
  const [user, setUser] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [strikes, setStrikes] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.image_generation_blocked === true) {
          setIsBlocked(true);
        }
        
        const userStrikes = await base44.entities.ContentStrike.filter({ user_email: currentUser.email });
        setStrikes(userStrikes.length);
        
        if (userStrikes.length >= 3 && !currentUser.image_generation_blocked) {
          await base44.auth.updateMe({ image_generation_blocked: true });
          setIsBlocked(true);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchUser();
  }, []);

  const createStrikeMutation = useMutation({
    mutationFn: (data) => base44.entities.ContentStrike.create(data)
  });

  const handleGenerate = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎯 GENERATE BUTTON CLICKED');
    console.log('User:', user?.email);
    console.log('Blocked status:', isBlocked);
    console.log('Current strikes:', strikes);
    console.log('Prompt:', prompt);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (isBlocked) {
      alert('🚫 YOU ARE PERMANENTLY BLOCKED\n\nContact admin to unlock.');
      return;
    }

    if (!prompt.trim()) {
      alert('⚠️ Enter a description!');
      return;
    }

    // 🚨 CRITICAL: REGEX VALIDATION
    console.log('🔍 STEP 1: Running isPromptSafe()...');
    const safe = isPromptSafe(prompt);
    console.log('Result:', safe ? '✅ SAFE' : '🚫 UNSAFE');
    
    if (!safe) {
      console.log('🚫🚫🚫 PROMPT BLOCKED - LOGGING STRIKE');
      
      // Log strike
      try {
        await createStrikeMutation.mutateAsync({
          user_email: user.email,
          user_name: user.full_name || user.email,
          prompt: prompt,
          image_url: null,
          ai_analysis: `BLOCKED BY REGEX FILTER\n\nPrompt: "${prompt}"\n\nMatched forbidden pattern.`,
          severity: 'extreme'
        });
        console.log('✅ Strike logged successfully');
      } catch (e) {
        console.error('❌ Strike logging failed:', e);
      }

      const newStrikes = strikes + 1;
      setStrikes(newStrikes);
      console.log('New strike count:', newStrikes);
      
      setError(`🚫 CONTENT VIOLATION\n\nYour prompt contains inappropriate language.\n\n⚠️ STRIKE ${newStrikes}/3`);
      setGeneratedImage(null);
      setPrompt('');

      if (newStrikes >= 3) {
        console.log('🚫 PERMANENT BAN TRIGGERED');
        await base44.auth.updateMe({ image_generation_blocked: true });
        setIsBlocked(true);
        alert('⛔ PERMANENTLY BANNED\n\n3 strikes = PERMANENT BAN\n\nAdmin unlock only.');
      } else {
        alert(`🚫 VIOLATION DETECTED\n\nYour prompt was blocked.\n\n⚠️ Strike ${newStrikes}/3\n\n${3 - newStrikes} more = PERMANENT BAN`);
      }

      console.log('━━━━ GENERATION STOPPED ━━━━');
      return;
    }

    console.log('✅ Prompt passed validation - proceeding...');

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const safePrompt = `CRITICAL SAFETY RULES - ABSOLUTE ENFORCEMENT:
- Everyone FULLY CLOTHED in professional attire
- NO skin exposure beyond face, hands, and arms
- NO suggestive poses or angles
- NO bedroom, bathroom, or intimate settings
- EDUCATIONAL AND PROFESSIONAL CONTEXT ONLY
- Suitable for children ages 5+

USER REQUEST: ${prompt}${selectedStyle !== 'realistic' ? `, ${selectedStyle} style` : ''}

MANDATORY: All people fully dressed in business or casual professional clothing.`;

      console.log('📸 Generating image...');
      const { url } = await base44.integrations.Core.GenerateImage({ prompt: safePrompt });
      console.log('✅ Image URL:', url);

      setIsAnalyzing(true);
      console.log('🔍 AI analysis...');
      
      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `ULTRA STRICT MODERATION - ZERO TOLERANCE FOR EDUCATIONAL PLATFORM

Examine this image with EXTREME scrutiny:

❌ Mark is_safe: FALSE if ANY of these are present:
- ANY visible nudity or partial nudity (breasts, nipples, buttocks, genitals, underwear visible)
- Swimwear, bikinis, lingerie, underwear, bras, revealing clothing
- Tight clothing showing body contours suggestively
- Low-cut tops, short shorts, crop tops, or any revealing attire
- Suggestive poses (bent over, lying down, provocative angles)
- Bedroom, bathroom, shower, or any intimate settings
- ANY skin exposure beyond face, neck, hands, and forearms
- Sexual or romantic content (kissing, embracing intimately)
- Violence, weapons, blood, gore, fighting
- Drugs, alcohol, smoking, hate symbols
- ANY content that could be considered suggestive or inappropriate

✅ Mark is_safe: TRUE ONLY if:
- All people fully clothed in conservative professional or casual attire
- No suggestive elements whatsoever
- Appropriate for kindergarten classroom display
- Zero sexual, violent, or inappropriate content

Be EXTREMELY conservative. When in doubt, mark as UNSAFE.

Describe what you see:`,
        response_json_schema: {
          type: "object",
          properties: {
            is_safe: { type: "boolean" },
            detected_issues: { type: "array", items: { type: "string" } },
            image_description: { type: "string" },
            severity: { type: "string", enum: ["safe", "low", "medium", "high", "extreme"] }
          }
        },
        file_urls: [url]
      });

      console.log('🔍 AI result:', analysis);
      setIsAnalyzing(false);

      if (analysis.is_safe === false || analysis.severity !== 'safe') {
        console.log('🚫 AI BLOCKED IMAGE');
        
        await createStrikeMutation.mutateAsync({
          user_email: user.email,
          user_name: user.full_name || user.email,
          prompt: prompt,
          image_url: url,
          ai_analysis: `AI BLOCKED\n\n${analysis.image_description}\n\nIssues: ${analysis.detected_issues?.join(', ')}`,
          severity: 'extreme'
        });

        const newStrikes = strikes + 1;
        setStrikes(newStrikes);
        
        setError(`🚫 UNSAFE IMAGE\n\nAI found inappropriate content.\n\n⚠️ STRIKE ${newStrikes}/3`);
        setGeneratedImage(null);
        setPrompt('');

        if (newStrikes >= 3) {
          await base44.auth.updateMe({ image_generation_blocked: true });
          setIsBlocked(true);
          alert('⛔ BANNED - 3 strikes');
        } else {
          alert(`🚫 Strike ${newStrikes}/3 added`);
        }

        return;
      }

      console.log('✅ SAFE - Showing image');
      setGeneratedImage(url);
      
    } catch (error) {
      console.error('❌ Error:', error);
      setError('Failed: ' + error.message);
    } finally {
      setIsGenerating(false);
      setIsAnalyzing(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-pink-900 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 text-white/50 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-4">Login Required</h3>
            <Button onClick={() => base44.auth.redirectToLogin()} size="lg">Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 p-6 flex items-center justify-center">
        <Card className="max-w-2xl border-4 border-red-600 shadow-2xl bg-white">
          <CardContent className="p-12 text-center">
            <div className="w-32 h-32 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <XCircle className="w-20 h-20 text-white" />
            </div>
            <h2 className="text-5xl font-black text-red-900 mb-6">🚫 PERMANENTLY BANNED</h2>
            <p className="text-xl text-red-800 mb-8">Access permanently revoked due to {strikes} content violations.</p>
            <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-400">
              <p className="font-bold text-yellow-900">Contact administrator to appeal.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-2xl">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-black text-white">AI Image Generator</h1>
          </div>
          <p className="text-purple-200 text-xl">Educational & professional images only</p>
        </div>

        {strikes > 0 && (
          <Card className="border-4 border-red-500 bg-red-50 shadow-2xl max-w-3xl mx-auto">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="font-black text-red-900 text-2xl">⚠️ {strikes} VIOLATION{strikes > 1 ? 'S' : ''}</p>
                  <p className="text-red-700 font-bold text-lg">
                    {3 - strikes} more = PERMANENT BAN
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-4 border-red-500 bg-red-50 max-w-3xl mx-auto">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <Shield className="w-12 h-12 text-red-600" />
              <div>
                <h3 className="font-black text-red-900 mb-4 text-2xl">🚨 ZERO TOLERANCE</h3>
                <p className="font-bold text-red-800 text-lg mb-2">❌ FORBIDDEN:</p>
                <ul className="space-y-1 text-red-800">
                  <li className="font-bold">• Nudity or revealing clothing</li>
                  <li className="font-bold">• Sexual or suggestive content</li>
                  <li className="font-bold">• Violence or gore</li>
                  <li className="font-bold">• Drugs or hate symbols</li>
                </ul>
                <div className="bg-red-600 text-white p-3 rounded-xl mt-4">
                  <p className="font-black text-center">3 STRIKES = PERMANENT BAN</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card className="border-none shadow-2xl bg-white">
            <CardContent className="p-8 space-y-6">
              <div>
                <Label className="text-xl font-bold mb-4 block">📝 Description</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Mountain landscape at sunset..."
                  rows={8}
                  className="text-lg border-2 border-slate-300"
                />
                <div className="bg-red-50 border-2 border-red-400 rounded-xl p-3 mt-3">
                  <p className="text-red-900 font-bold text-center text-sm">
                    ⚠️ PROFESSIONAL CONTENT ONLY
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-lg font-bold mb-3 block">🎨 Style</Label>
                <div className="grid grid-cols-3 gap-3">
                  {STYLE_OPTIONS.map(style => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedStyle === style.id
                          ? 'border-purple-600 bg-purple-50 shadow-lg'
                          : 'border-slate-300 hover:border-purple-400'
                      }`}
                    >
                      <div className="text-3xl mb-2">{style.icon}</div>
                      <div className="text-sm font-bold">{style.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating || isAnalyzing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 py-8 text-xl font-black shadow-2xl"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Generating...
                  </>
                ) : isAnalyzing ? (
                  <>
                    <Shield className="w-6 h-6 mr-3 animate-pulse" />
                    AI Check...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 mr-3" />
                    Generate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-2xl bg-white">
            <CardContent className="p-8">
              <Label className="text-xl font-bold mb-6 block">✨ Result</Label>
              
              <div className="aspect-square bg-gradient-to-br from-slate-100 to-purple-100 rounded-2xl flex items-center justify-center border-4 border-slate-300 overflow-hidden">
                {generatedImage ? (
                  <motion.img
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={generatedImage}
                    alt="Generated"
                    className="w-full h-full object-cover"
                  />
                ) : error ? (
                  <div className="text-center p-8">
                    <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                    <p className="text-red-700 font-black text-xl mb-3">BLOCKED</p>
                    <p className="text-red-800 text-sm whitespace-pre-line">{error}</p>
                    <Badge className="bg-red-600 text-white mt-4">Violation Logged</Badge>
                  </div>
                ) : (
                  <div className="text-center p-10">
                    <Camera className="w-20 h-20 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 font-bold">Image will appear here</p>
                  </div>
                )}
              </div>

              {generatedImage && (
                <div className="mt-6 space-y-4">
                  <Card className="bg-green-50 border-2 border-green-500">
                    <CardContent className="p-3">
                      <p className="text-sm font-bold text-green-900 text-center">✅ Safe</p>
                    </CardContent>
                  </Card>
                  <Button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = generatedImage;
                      link.download = `image-${Date.now()}.png`;
                      link.click();
                    }}
                    className="w-full bg-green-600 py-6 text-xl font-bold"
                  >
                    <Download className="w-6 h-6 mr-2" />
                    Download
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-xl bg-white/95 max-w-4xl mx-auto">
          <CardContent className="p-6">
            <h3 className="font-bold text-xl text-center mb-4">✅ Safe Examples:</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                '🏔️ Mountain landscape',
                '🌆 City skyline',
                '🌸 Cherry blossoms',
                '🎨 Abstract art',
                '🐕 Cute dog',
                '☕ Coffee shop'
              ].map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex.substring(3))}
                  className="p-3 bg-slate-50 rounded-lg border hover:border-purple-400 text-sm font-semibold"
                >
                  {ex}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}