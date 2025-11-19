
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, CheckCircle, FileText, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MarketingPlanGenerator({ user, onClose }) {
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    product_service: '',
    marketing_goal: '',
    target_audience: '',
    timeline: '3 months',
    budget: '',
    current_channels: '',
    competitors: '',
    brand_positioning: '',
    pain_points: '',
    customer_journey_stage: '',
    kpi_focus: '',
    content_preferences: '',
    geographic_focus: '',
    seasonality: '',
    past_campaigns: '',
    things_to_avoid: '' // NEW
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a WORLD-CLASS MARKETING STRATEGIST creating a comprehensive and actionable plan for ${formData.company_name}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 CLIENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: ${formData.company_name}
Industry: ${formData.industry}
Product/Service: ${formData.product_service}
Location: ${formData.geographic_focus || 'Not specified'}
Target Audience: ${formData.target_audience}
Budget: ${formData.budget || '$0 (Bootstrap - use LOW/NO COST tactics)'}
Goal: ${formData.marketing_goal}
Timeline: ${formData.timeline}

CURRENT SITUATION:
- Current Channels: ${formData.current_channels || 'None specified'}
- Competitors: ${formData.competitors || 'None specified'}
- Brand Positioning: ${formData.brand_positioning || 'Not explicitly defined'}
- Customer Pain Points: ${formData.pain_points || 'None specified'}
- Past Campaigns (What worked/didn't work): ${formData.past_campaigns || 'None specified'}
- Seasonality: ${formData.seasonality || 'None specified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ABSOLUTE CONSTRAINTS - DO NOT SUGGEST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${formData.things_to_avoid || 'None specified'}
DO NOT suggest any strategies that involve the above constraints!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE 6-10 CAMPAIGN IDEAS AS DETAILED AS THIS EXAMPLE:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE EXAMPLE (QUALITY LEVEL REQUIRED):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAMPAIGN: "Hot Chocolate Flyer Incentive"
FOR: Watch store in Antwerp

DESCRIPTION:
Create eye-catching flyers distributed by staff to drive foot traffic. Front shows featured watch collection with prices. Back has store location map + photo of delicious hot chocolate drink + waffle. Customers bring flyer to store = FREE hot chocolate & waffle. Each staff member has uniquely coded flyers (QR code or unique number). Track which staff brings most visitors. Winner gets €200 bonus + recognition.

HOW IT WORKS (15 SPECIFIC STEPS):
1. Design flyer template with brand colors (hire freelancer on Fiverr for €50)
2. Front: Add 6 featured watches with prices, brand logo
3. Back: Google Maps screenshot with route from city center, photo of hot chocolate setup
4. Add QR code system - each staff gets unique code (use free QR generator)
5. Print 500 flyers at local printer (€150 for high quality glossy)
6. Give each of 5 staff members 100 flyers with their unique code
7. Staff distributes at: nearby offices (lunch break), gym entrances (morning), coffee shops (ask permission), university campus
8. Set up hot chocolate station in store (buy supplies: €200)
9. Train staff: scan QR when customer arrives with flyer
10. Create leaderboard poster visible in staff room (update daily)
11. Post daily updates in staff WhatsApp group
12. Mid-month bonus: Leader gets €50 extra motivation
13. Track: visits, conversion rate, average purchase per flyer customer
14. End of month: Announce winner, award €200 + trophy
15. Collect customer emails during visit (offer 10% next purchase)

DURATION: 1 month (repeat if successful)

EXACT MATERIALS NEEDED:
- Flyer design: €50 (Fiverr designer)
- Printing: €150 (500 flyers)
- Hot chocolate supplies: €200 (100 servings)
- Waffles: €150 (100 servings, frozen bulk)
- Staff prize: €200 + €15 trophy
- Email collection tablets: €0 (use existing phones)
TOTAL: €765

EXPECTED OUTCOMES (REALISTIC NUMBERS):
- 250-300 people visit with flyer (50% redemption rate)
- 60-75 make purchase (25% conversion) = €3,000-€4,500 revenue
- 80-100 email signups for future marketing
- Staff engagement boost (competitive fun)
- 200+ people see flyers (didn't visit but aware of store)
- Social media: customers post photos of hot chocolate = free marketing
- Cost per customer visit: €2.55
- ROI: 400-500% if average purchase is €60

VARIATIONS/OPTIMIZATIONS:
- Week 1: Test 2 flyer designs (A/B test which performs better)
- Add Instagram hashtag contest: #WatchAndChocolate for extra entry
- Partner with nearby café: they display your flyers, you mention them
- Seasonal: Christmas theme, Valentine's theme

WHY IT WORKS:
- Tangible incentive (free food)
- Easy to understand
- Staff motivated by competition
- Trackable results
- Low cost, high impact
- Gamification keeps energy high
- Creates social proof (store looks busy)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GENERATE 6-10 IDEAS THIS DETAILED FOR ${formData.company_name}!

CRITICAL REQUIREMENTS FOR EACH IDEA:
✅ MUST be 100% specific to ${formData.company_name}, ${formData.product_service}, ${formData.geographic_focus}
✅ MUST include 12-20 step-by-step execution points
✅ MUST list EXACT materials/resources needed with costs
✅ MUST give REALISTIC outcome numbers (not vague - give ranges!)
✅ MUST respect budget: ${formData.budget || '$0 = use FREE/LOW COST tactics'}
✅ MUST explain WHY it works psychologically
✅ MUST include variations/optimizations
✅ MUST fit the timeline: ${formData.timeline}
✅ BE CREATIVE - think like a guerrilla marketing expert!

ALSO CREATE A PROFESSIONAL MARKETING PLAN WITH THE FOLLOWING SECTIONS (INCLUDING ALL SUB-SECTIONS):

1. EXECUTIVE SUMMARY
2. MARKET ANALYSIS (deep dive into target audience, customer personas)
3. COMPETITOR ANALYSIS (specific strengths/weaknesses, our advantage)
4. DETAILED TACTICAL CAMPAIGN IDEAS (6-10 ideas as detailed as the example above)
5. CHANNEL STRATEGY (specific tactics per channel, budget % & expected ROI)
6. CONTENT STRATEGY (content pillars, specific topics, posting schedule)
7. BUDGET ALLOCATION (category, amount, percentage, justification - even if $0, show time investment)
8. KPI FRAMEWORK (metric, current baseline, target, tracking method)
9. EXECUTION ROADMAP (week-by-week activities, deliverables, responsible)

Make it SPECIFIC to ${formData.company_name} in ${formData.geographic_focus || 'their location'}.`,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            market_analysis: {
              type: "object",
              properties: {
                target_segments: { type: "array", items: { type: "string" } },
                market_size: { type: "string" },
                customer_personas: { type: "array", items: { 
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    demographics: { type: "string" },
                    pain_points: { type: "array", items: { type: "string" } },
                    preferred_channels: { type: "array", items: { type: "string" } }
                  }
                }}
              }
            },
            competitor_analysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  competitor: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  our_advantage: { type: "string" }
                }
              }
            },
            campaign_ideas: {
              type: "array",
              description: "6-10 ULTRA-DETAILED tactical campaigns",
              items: {
                type: "object",
                properties: {
                  campaign_name: { type: "string" },
                  description: { type: "string", description: "Full detailed description" },
                  how_it_works: { type: "array", items: { type: "string" }, description: "12-20 specific execution steps" },
                  duration: { type: "string" },
                  exact_materials_needed: { type: "array", items: { type: "string" }, description: "List everything needed with costs" },
                  expected_outcomes: { type: "array", items: { type: "string" }, description: "SPECIFIC NUMBERS - not vague" },
                  budget_breakdown: { type: "array", items: { type: "string" } },
                  total_cost: { type: "string" },
                  roi_estimate: { type: "string" },
                  why_it_works: { type: "string", description: "Psychological/strategic reasoning" },
                  variations: { type: "array", items: { type: "string" }, description: "2-3 ways to optimize" }
                }
              }
            },
            channel_strategy: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  channel: { type: "string" },
                  specific_tactics: { type: "array", items: { type: "string" } },
                  budget_percentage: { type: "string" },
                  expected_roi: { type: "string" }
                }
              }
            },
            content_strategy: {
              type: "object",
              properties: {
                content_pillars: { type: "array", items: { type: "string" } },
                specific_content_ideas: { type: "array", items: { type: "string" } },
                posting_schedule: { type: "string" }
              }
            },
            budget_allocation: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  amount: { type: "string" },
                  percentage: { type: "string" },
                  justification: { type: "string" }
                }
              }
            },
            kpi_framework: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  metric: { type: "string" },
                  current_baseline: { type: "string" },
                  target: { type: "string" },
                  tracking_method: { type: "string" }
                }
              }
            },
            execution_roadmap: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  week: { type: "string" },
                  activities: { type: "array", items: { type: "string" } },
                  deliverables: { type: "array", items: { type: "string" } },
                  responsible: { type: "string" }
                }
              }
            }
          }
        }
      });

      setGeneratedPlan(result);
      setStep(3);
    } catch (error) {
      alert('❌ Generation failed: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedPlan) return;

    setGenerating(true);
    try {
      const response = await base44.functions.invoke('generateMarketingPlanPDF', {
        planData: generatedPlan,
        formData: formData
      });

      // FIXED: Properly decode Base64 PDF
      const base64 = response.data.pdfBase64;
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MarketingPlan_${formData.company_name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('✅ PDF Downloaded Successfully!');
    } catch (error) {
      alert('❌ Download failed: ' + error.message);
      console.error('PDF download error:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl w-full">
            <Card className="border-none shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-pink-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-white/20 text-white px-3 py-1 mb-2">Step 1 of 2</Badge>
                    <CardTitle className="text-3xl mb-1">📈 Business & Goals</CardTitle>
                  </div>
                  <Button onClick={onClose} variant="ghost" className="text-white" size="icon">
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-2 text-sm">Company Name *</label>
                    <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} className="border-2" />
                  </div>
                  <div>
                    <label className="block font-bold mb-2 text-sm">Industry *</label>
                    <Input value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} placeholder="e.g., Retail, Fashion" className="border-2" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Product/Service *</label>
                  <Input value={formData.product_service} onChange={(e) => setFormData({ ...formData, product_service: e.target.value })} placeholder="What do you sell?" className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Marketing Goal *</label>
                  <Textarea value={formData.marketing_goal} onChange={(e) => setFormData({ ...formData, marketing_goal: e.target.value })} placeholder="e.g., Increase store foot traffic by 50% and drive 200 new customers" rows={3} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Target Audience *</label>
                  <Input value={formData.target_audience} onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })} placeholder="e.g., Young professionals 25-40" className="border-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-2 text-sm">Budget (can be $0)</label>
                    <Input value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} placeholder="e.g., $5K/month or $0" className="border-2" />
                    <p className="text-xs text-slate-500 mt-1">💡 Leave empty or enter $0 for bootstrap ideas</p>
                  </div>
                  <div>
                    <label className="block font-bold mb-2 text-sm">Timeline</label>
                    <select value={formData.timeline} onChange={(e) => setFormData({ ...formData, timeline: e.target.value })} className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg">
                      <option>1 month</option>
                      <option>3 months</option>
                      <option>6 months</option>
                      <option>1 year</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Geographic Focus</label>
                  <Input value={formData.geographic_focus} onChange={(e) => setFormData({ ...formData, geographic_focus: e.target.value })} placeholder="e.g., Antwerp, Belgium" className="border-2" />
                </div>

                <Button onClick={() => setStep(2)} disabled={!formData.company_name || !formData.industry || !formData.product_service || !formData.marketing_goal || !formData.target_audience} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 py-6 text-lg font-bold">
                  Next: Marketing Details →
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 2 && !generatedPlan) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl w-full">
            <Card className="border-none shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-white/20 text-white px-3 py-1 mb-2">Step 2 of 2</Badge>
                    <CardTitle className="text-3xl mb-1">📊 Marketing Context & Constraints</CardTitle>
                  </div>
                  <Button onClick={onClose} variant="ghost" className="text-white" size="icon">
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block font-bold mb-2 text-sm">Current Marketing Channels</label>
                  <Input value={formData.current_channels} onChange={(e) => setFormData({ ...formData, current_channels: e.target.value })} placeholder="e.g., Instagram, Email, Google Ads" className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Main Competitors</label>
                  <Input value={formData.competitors} onChange={(e) => setFormData({ ...formData, competitors: e.target.value })} placeholder="e.g., Brand X, Brand Y" className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Brand Positioning</label>
                  <Textarea value={formData.brand_positioning} onChange={(e) => setFormData({ ...formData, brand_positioning: e.target.value })} placeholder="How do you want to be perceived?" rows={2} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Customer Pain Points</label>
                  <Textarea value={formData.pain_points} onChange={(e) => setFormData({ ...formData, pain_points: e.target.value })} placeholder="What problems do your customers have?" rows={2} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">KPI Focus</label>
                  <Input value={formData.kpi_focus} onChange={(e) => setFormData({ ...formData, kpi_focus: e.target.value })} placeholder="e.g., Store visits, Sales, Brand awareness" className="border-2" />
                </div>

                {/* NEW: Things to AVOID */}
                <div>
                  <label className="block font-bold mb-2 text-sm text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    ⚠️ Marketing Strategies to AVOID
                  </label>
                  <Textarea 
                    value={formData.things_to_avoid} 
                    onChange={(e) => setFormData({ ...formData, things_to_avoid: e.target.value })} 
                    placeholder="e.g., No heavy discounts, Avoid spam tactics, Don't copy competitors, No cold calling" 
                    rows={3} 
                    className="border-2 border-red-300 bg-red-50" 
                  />
                  <p className="text-xs text-red-600 mt-1 font-semibold">💡 AI will NOT suggest these strategies!</p>
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Past Campaigns (What worked/didn't work)</label>
                  <Textarea value={formData.past_campaigns} onChange={(e) => setFormData({ ...formData, past_campaigns: e.target.value })} placeholder="e.g., Instagram ads worked well, Facebook didn't" rows={2} className="border-2" />
                </div>

                <Card className="bg-yellow-50 border-2 border-yellow-400">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-yellow-900 text-sm mb-2">✨ AI Will Generate:</p>
                        <ul className="text-xs text-yellow-800 space-y-1">
                          <li>✅ 6-10 DETAILED tactical campaign ideas (like: flyer + hot chocolate + staff competition)</li>
                          <li>✅ Each with 12-20 step-by-step execution, exact budget breakdown, expected outcomes with specific numbers, ROI, why it works, and variations</li>
                          <li>✅ Ideas tailored to your budget (even if $0!)</li>
                          <li>✅ Comprehensive sections for Market Analysis, Competitor Analysis, Channel Strategy, Content, Budget, KPIs, and Execution Roadmap.</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => setStep(1)} variant="outline" className="flex-1">← Back</Button>
                  <Button onClick={handleGenerate} disabled={generating} className="flex-1 bg-gradient-to-r from-pink-600 to-purple-600 py-4 text-lg font-bold">
                    {generating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-5 h-5 mr-2" />Generate Plan</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (step === 3 && generatedPlan) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full">
          <Card className="border-none shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-pink-600 to-purple-600 text-white p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-4xl mb-2">✅ Marketing Plan Ready!</CardTitle>
              <p className="text-white/90 text-lg">Comprehensive marketing strategy for {formData.company_name}</p>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-yellow-50 border-2 border-yellow-300">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{(generatedPlan.campaign_ideas || []).length}</p>
                    <p className="text-xs text-slate-600">Campaign Ideas</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-2 border-purple-300">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{(generatedPlan.channel_strategy || []).length}</p>
                    <p className="text-xs text-slate-600">Channels</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-2 border-blue-300">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{(generatedPlan.execution_roadmap || []).length}</p>
                    <p className="text-xs text-slate-600">Weeks</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-green-50 border-2 border-green-300">
                <CardContent className="p-4">
                  <p className="font-bold text-green-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Includes:
                  </p>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>✅ Deep market analysis</li>
                    <li>✅ {(generatedPlan.campaign_ideas || []).length} fully detailed campaign ideas with budgets & ROI</li>
                    <li>✅ Competitor positioning</li>
                    <li>✅ Week-by-week execution roadmap</li>
                  </ul>
                </CardContent>
              </Card>

              <Button 
                onClick={handleDownload} 
                disabled={generating} 
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 py-8 text-2xl font-bold"
              >
                {generating ? <><Loader2 className="w-8 h-8 mr-3 animate-spin" />Downloading PDF...</> : <><FileText className="w-8 h-8 mr-3" />DOWNLOAD PLAN AS PDF 📄</>}
              </Button>

              <div className="flex gap-3">
                <Button onClick={() => { setGeneratedPlan(null); setStep(1); }} variant="outline" className="flex-1">Create Another</Button>
                <Button onClick={onClose} variant="outline" className="flex-1">Close</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return null;
}
