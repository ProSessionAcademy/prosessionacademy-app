import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, CheckCircle, FileText, Sparkles, Building2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BusinessPlanGenerator({ user, onClose }) {
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const [formData, setFormData] = useState({
    // STEP 1: Core Business Info
    company_name: '',
    industry: '',
    location: '',
    problem: '',
    goal: '',
    
    // STEP 2: Financial & Market
    current_revenue: '',
    target_revenue: '',
    budget: '',
    timeline: '6 months',
    target_customers: '',
    customer_pain_points: '',
    unique_selling_point: '',
    
    // STEP 3: Operations & Team
    team_size: '',
    team_structure: '',
    current_operations: '',
    supply_chain_details: '',
    technology_stack: '',
    key_partnerships: '',
    
    // STEP 4: Market & Competition
    competitors: '',
    competitor_advantages: '',
    market_size: '',
    market_trends: '',
    barriers_to_entry: '',
    regulatory_considerations: '',
    
    // STEP 5: Strategy & Constraints
    brand_values: '',
    current_marketing_channels: '',
    distribution_channels: '',
    pricing_strategy: '',
    things_to_avoid: '',
    critical_success_factors: '',
    biggest_risks: ''
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an EXPERT BUSINESS CONSULTANT creating a comprehensive plan for ${formData.company_name}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 CLIENT PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: ${formData.company_name}
Industry: ${formData.industry}
Location: ${formData.location}
Current Revenue: ${formData.current_revenue || 'Startup'}
Target Revenue: ${formData.target_revenue}
Budget: ${formData.budget || '$0 (Bootstrap - use LOW COST strategies)'}

CHALLENGE:
${formData.problem}

GOAL:
${formData.goal}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 TARGET MARKET:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Target Customers: ${formData.target_customers}
Customer Pain Points: ${formData.customer_pain_points}
Market Size: ${formData.market_size || 'Not specified'}
Market Trends: ${formData.market_trends || 'Not specified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 COMPETITIVE LANDSCAPE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Main Competitors: ${formData.competitors}
Their Advantages: ${formData.competitor_advantages || 'Not specified'}
Our USP: ${formData.unique_selling_point}
Barriers to Entry: ${formData.barriers_to_entry || 'None specified'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏭 OPERATIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Team Size: ${formData.team_size}
Team Structure: ${formData.team_structure || 'Not specified'}
Current Operations: ${formData.current_operations}
Supply Chain: ${formData.supply_chain_details || 'Not specified'}
Technology: ${formData.technology_stack}
Key Partnerships: ${formData.key_partnerships || 'None yet'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 MARKETING & SALES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brand Values: ${formData.brand_values}
Current Marketing: ${formData.current_marketing_channels}
Distribution: ${formData.distribution_channels}
Pricing Strategy: ${formData.pricing_strategy}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ABSOLUTE CONSTRAINTS - AVOID:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${formData.things_to_avoid || 'None specified'}

Critical Success Factors: ${formData.critical_success_factors}
Biggest Risks: ${formData.biggest_risks}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE A DEEPLY ANALYTICAL BUSINESS PLAN:

1. EXECUTIVE SUMMARY (comprehensive, strategic overview - 300+ words)

2. DEEP MARKET ANALYSIS:
- Specific market size DATA for ${formData.industry} in ${formData.location}
- Customer buying behavior patterns
- Specific trends in ${formData.location}
- Growth opportunities with numbers
- Market segmentation (at least 3 segments with detailed profiles)

3. DETAILED COMPETITOR INTELLIGENCE:
For EACH major competitor from ${formData.competitors}, analyze:
- Their exact business model
- Their pricing strategy (specific prices if possible)
- Their marketing channels and tactics
- Their strengths/weaknesses
- Specific gaps we can exploit
- Their estimated market share

4. SWOT (ultra-specific to ${formData.company_name})
- 8-10 items per category
- Each with specific implications

5. GENERATE 5-7 STRATEGIC OPTIONS:

Each option must be AS DETAILED as this example:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXAMPLE (REQUIRED QUALITY LEVEL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OPTION: "Local Partnership Ecosystem Strategy"

DESCRIPTION:
Build strategic partnerships with 10-15 complementary local businesses to create cross-promotional network. Each partner displays your materials, you display theirs. Create "Local Business Passport" - customers collect stamps from 5 partners, get 20% off at any participating business. Organize monthly networking events for all partners. Share customer data (with permission) to build joint marketing campaigns.

IMPLEMENTATION (25 SPECIFIC STEPS):
1. Identify 20 potential partner businesses within 2km radius (cafés, gyms, salons, bookstores)
2. Create partnership proposal document (1-page benefits overview)
3. Visit 3-4 businesses per week to pitch in person
4. Offer free trial: display their flyers for 2 weeks, track results
5. Design "Local Business Passport" cards (500 cards at €100 from local printer)
... [20 more detailed steps]

EXACT RESOURCES NEEDED:
- Partnership proposal design: €0 (use Canva free)
- Passport cards: €100 (500 cards)
- Cross-promo flyers: €300 (4000 flyers)
- Kickoff event: €150 (snacks, drinks)
- Monthly prizes: €200/month
TOTAL FIRST MONTH: €750

EXPECTED OUTCOMES (REALISTIC):
- 10-12 active partnerships
- 150-200 new customers (Month 1)
- Average purchase: €65
- Monthly revenue: €9,750-€13,000
- Customer retention: 40%
- ROI: 1,200%

RISKS & MITIGATION:
- Partners may not promote actively → Monthly incentives
- High passport printing cost → Start digital-first

SUCCESS METRICS:
- 10+ active partners
- €10K+ monthly revenue from referrals
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GENERATE 5-7 OPTIONS THIS DETAILED!

6. COMPREHENSIVE MARKETING & SALES STRATEGY:
- Positioning statement
- Customer acquisition channels (10+ tactics)
- Sales process (step-by-step)
- Customer retention strategy
- Budget allocation by channel
- Expected CAC and LTV

7. OPERATIONAL PLAN:
- Daily/weekly operations breakdown
- Technology and tools needed
- Supply chain and logistics
- Quality control measures
- Scalability plan

8. DETAILED FINANCIAL PROJECTIONS:
- Month-by-month revenue/costs for 12 months (table format)
- Break-even analysis with specific numbers
- Cash flow projections
- Funding requirements (if any)
- Key financial assumptions

9. IMPLEMENTATION TIMELINE:
- Week-by-week plan for first 3 months
- Monthly milestones for months 4-12
- Specific deliverables and success criteria

10. COMPREHENSIVE RISK ANALYSIS:
- 15+ specific risks
- Each with: probability, impact, mitigation strategy, contingency plan
- Early warning indicators

11. KPI FRAMEWORK:
- 20+ specific metrics to track
- Current baseline → Target
- Tracking method and frequency`,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            company_overview: {
              type: "object",
              properties: {
                mission: { type: "string" },
                vision: { type: "string" },
                values: { type: "array", items: { type: "string" } }
              }
            },
            market_analysis: {
              type: "object",
              properties: {
                market_size_data: { type: "string" },
                target_segments: { type: "array", items: { 
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    size: { type: "string" },
                    characteristics: { type: "string" },
                    needs: { type: "array", items: { type: "string" } }
                  }
                }},
                buying_behavior: { type: "string" },
                market_trends: { type: "array", items: { type: "string" } },
                growth_opportunities: { type: "array", items: { type: "string" } }
              }
            },
            competitor_analysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  competitor: { type: "string" },
                  business_model: { type: "string" },
                  pricing_strategy: { type: "string" },
                  marketing_approach: { type: "string" },
                  estimated_market_share: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                  gaps_to_exploit: { type: "array", items: { type: "string" } }
                }
              }
            },
            swot: {
              type: "object",
              properties: {
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                opportunities: { type: "array", items: { type: "string" } },
                threats: { type: "array", items: { type: "string" } }
              }
            },
            strategy_options: {
              type: "array",
              description: "5-7 ultra-detailed strategic options",
              items: {
                type: "object",
                properties: {
                  option_name: { type: "string" },
                  description: { type: "string" },
                  implementation_steps: { type: "array", items: { type: "string" }, description: "20-30 specific steps" },
                  exact_resources_needed: { type: "array", items: { type: "string" } },
                  expected_outcomes: { type: "array", items: { type: "string" } },
                  timeline: { type: "string" },
                  risks: { type: "array", items: { type: "string" } },
                  mitigation_strategies: { type: "array", items: { type: "string" } },
                  success_metrics: { type: "array", items: { type: "string" } },
                  estimated_cost: { type: "string" },
                  estimated_roi: { type: "string" },
                  why_this_works: { type: "string" },
                  variations: { type: "array", items: { type: "string" } }
                }
              }
            },
            marketing_sales_strategy: {
              type: "object",
              properties: {
                positioning_statement: { type: "string" },
                acquisition_channels: { type: "array", items: { type: "string" } },
                sales_process: { type: "array", items: { type: "string" } },
                retention_strategy: { type: "string" },
                budget_allocation: { type: "array", items: { 
                  type: "object",
                  properties: {
                    channel: { type: "string" },
                    budget: { type: "string" },
                    expected_roi: { type: "string" }
                  }
                }},
                cac_ltv_analysis: { type: "string" }
              }
            },
            operational_plan: {
              type: "object",
              properties: {
                daily_operations: { type: "array", items: { type: "string" } },
                technology_tools: { type: "array", items: { type: "string" } },
                supply_chain_logistics: { type: "string" },
                quality_control: { type: "array", items: { type: "string" } },
                scalability_plan: { type: "string" }
              }
            },
            financial_projections: {
              type: "object",
              properties: {
                revenue_forecast_12_months: { type: "array", items: { 
                  type: "object",
                  properties: {
                    month: { type: "string" },
                    revenue: { type: "string" },
                    costs: { type: "string" },
                    profit: { type: "string" },
                    cumulative_profit: { type: "string" }
                  }
                }},
                break_even_analysis: { type: "string" },
                cash_flow_projections: { type: "string" },
                funding_requirements: { type: "string" },
                key_assumptions: { type: "array", items: { type: "string" } }
              }
            },
            implementation_timeline: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  period: { type: "string" },
                  milestones: { type: "array", items: { type: "string" } },
                  deliverables: { type: "array", items: { type: "string" } },
                  success_criteria: { type: "string" },
                  responsible_parties: { type: "array", items: { type: "string" } }
                }
              }
            },
            risks_mitigation: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  probability: { type: "string" },
                  impact: { type: "string" },
                  mitigation: { type: "string" },
                  contingency_plan: { type: "string" },
                  early_warning_indicators: { type: "array", items: { type: "string" } }
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
                  tracking_method: { type: "string" },
                  frequency: { type: "string" }
                }
              }
            }
          }
        }
      });

      setGeneratedPlan(result);
      setStep(6);
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
      const response = await base44.functions.invoke('generateBusinessPlanPDF', {
        planData: generatedPlan,
        formData: formData
      });

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
      link.download = `BusinessPlan_${formData.company_name.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('✅ PDF Downloaded Successfully!');
    } catch (error) {
      console.error("PDF download error:", error);
      alert('❌ Download failed: ' + (error.message || 'An unknown error occurred.'));
    } finally {
      setGenerating(false);
    }
  };

  // STEP 1: Core Business Info
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl w-full">
            <Card className="border-none shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-white/20 text-white px-3 py-1 mb-2">Step 1 of 5</Badge>
                    <CardTitle className="text-3xl mb-1">🏢 Core Business Info</CardTitle>
                    <p className="text-white/90">Company identity and primary challenge</p>
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
                    <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="Your business name" className="border-2" />
                  </div>
                  <div>
                    <label className="block font-bold mb-2 text-sm">Industry *</label>
                    <Input value={formData.industry} onChange={(e) => setFormData({ ...formData, industry: e.target.value })} placeholder="e.g., Retail, SaaS, Manufacturing" className="border-2" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Location/Market *</label>
                  <Input value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g., Antwerp, Belgium / United States" className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Primary Problem/Challenge *</label>
                  <Textarea value={formData.problem} onChange={(e) => setFormData({ ...formData, problem: e.target.value })} placeholder="What's the main business challenge you're facing? Be specific." rows={4} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Business Goal *</label>
                  <Textarea value={formData.goal} onChange={(e) => setFormData({ ...formData, goal: e.target.value })} placeholder="What do you want to achieve? Include numbers and timeline." rows={3} className="border-2" />
                </div>

                <Button 
                  onClick={() => setStep(2)} 
                  disabled={!formData.company_name || !formData.industry || !formData.location || !formData.problem || !formData.goal} 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-lg font-bold"
                >
                  Next: Financial & Market →
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // STEP 2: Financial & Market
  if (step === 2) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl w-full">
            <Card className="border-none shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-white/20 text-white px-3 py-1 mb-2">Step 2 of 5</Badge>
                    <CardTitle className="text-3xl mb-1">💰 Financial & Market</CardTitle>
                    <p className="text-white/90">Revenue, customers, and market position</p>
                  </div>
                  <Button onClick={onClose} variant="ghost" className="text-white" size="icon">
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold mb-2 text-sm">Current Revenue</label>
                    <Input value={formData.current_revenue} onChange={(e) => setFormData({ ...formData, current_revenue: e.target.value })} placeholder="e.g., $50K/mo" className="border-2" />
                  </div>
                  <div>
                    <label className="block font-bold mb-2 text-sm">Target Revenue *</label>
                    <Input value={formData.target_revenue} onChange={(e) => setFormData({ ...formData, target_revenue: e.target.value })} placeholder="e.g., $100K/mo" className="border-2" />
                  </div>
                  <div>
                    <label className="block font-bold mb-2 text-sm">Available Budget</label>
                    <Input value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} placeholder="$0 is OK" className="border-2" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Timeline</label>
                  <select value={formData.timeline} onChange={(e) => setFormData({ ...formData, timeline: e.target.value })} className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg">
                    <option>3 months</option>
                    <option>6 months</option>
                    <option>1 year</option>
                    <option>2 years</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Target Customers *</label>
                  <Textarea value={formData.target_customers} onChange={(e) => setFormData({ ...formData, target_customers: e.target.value })} placeholder="Who are your ideal customers? Demographics, behaviors, needs..." rows={3} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Customer Pain Points *</label>
                  <Textarea value={formData.customer_pain_points} onChange={(e) => setFormData({ ...formData, customer_pain_points: e.target.value })} placeholder="What problems do your customers face? What frustrates them?" rows={3} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Your Unique Selling Point *</label>
                  <Textarea value={formData.unique_selling_point} onChange={(e) => setFormData({ ...formData, unique_selling_point: e.target.value })} placeholder="What makes you different from competitors? Why should customers choose you?" rows={3} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Market Size & Trends</label>
                  <Textarea value={formData.market_size} onChange={(e) => setFormData({ ...formData, market_size: e.target.value })} placeholder="How big is your market? What are the trends?" rows={2} className="border-2" />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => setStep(1)} variant="outline" className="flex-1">← Back</Button>
                  <Button 
                    onClick={() => setStep(3)} 
                    disabled={!formData.target_revenue || !formData.target_customers || !formData.customer_pain_points || !formData.unique_selling_point}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 py-4 text-lg font-bold"
                  >
                    Next: Operations →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // STEP 3: Operations & Team
  if (step === 3) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl w-full">
            <Card className="border-none shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-white/20 text-white px-3 py-1 mb-2">Step 3 of 5</Badge>
                    <CardTitle className="text-3xl mb-1">🏭 Operations & Team</CardTitle>
                    <p className="text-white/90">How you operate and deliver value</p>
                  </div>
                  <Button onClick={onClose} variant="ghost" className="text-white" size="icon">
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-2 text-sm">Team Size</label>
                    <Input value={formData.team_size} onChange={(e) => setFormData({ ...formData, team_size: e.target.value })} placeholder="e.g., 5 people, Solo, 50+" className="border-2" />
                  </div>
                  <div>
                    <label className="block font-bold mb-2 text-sm">Team Structure</label>
                    <Input value={formData.team_structure} onChange={(e) => setFormData({ ...formData, team_structure: e.target.value })} placeholder="e.g., 2 sales, 1 marketing, 2 ops" className="border-2" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Current Operations *</label>
                  <Textarea value={formData.current_operations} onChange={(e) => setFormData({ ...formData, current_operations: e.target.value })} placeholder="How do you currently operate? Describe your day-to-day processes..." rows={3} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Technology & Tools</label>
                  <Textarea value={formData.technology_stack} onChange={(e) => setFormData({ ...formData, technology_stack: e.target.value })} placeholder="What software, tools, and systems do you use?" rows={2} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Supply Chain / Logistics</label>
                  <Textarea value={formData.supply_chain_details} onChange={(e) => setFormData({ ...formData, supply_chain_details: e.target.value })} placeholder="How do you source, produce, and deliver? Any partnerships?" rows={2} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Key Partnerships</label>
                  <Textarea value={formData.key_partnerships} onChange={(e) => setFormData({ ...formData, key_partnerships: e.target.value })} placeholder="Existing or needed strategic partners, suppliers, distributors..." rows={2} className="border-2" />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => setStep(2)} variant="outline" className="flex-1">← Back</Button>
                  <Button 
                    onClick={() => setStep(4)}
                    disabled={!formData.current_operations}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 py-4 text-lg font-bold"
                  >
                    Next: Competition →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // STEP 4: Market & Competition
  if (step === 4) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl w-full">
            <Card className="border-none shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-white/20 text-white px-3 py-1 mb-2">Step 4 of 5</Badge>
                    <CardTitle className="text-3xl mb-1">🎯 Competition & Market</CardTitle>
                    <p className="text-white/90">Understand your competitive landscape</p>
                  </div>
                  <Button onClick={onClose} variant="ghost" className="text-white" size="icon">
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block font-bold mb-2 text-sm">Main Competitors *</label>
                  <Textarea value={formData.competitors} onChange={(e) => setFormData({ ...formData, competitors: e.target.value })} placeholder="List your top 3-5 competitors. Be specific with names." rows={2} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">What Are Competitors Doing Better?</label>
                  <Textarea value={formData.competitor_advantages} onChange={(e) => setFormData({ ...formData, competitor_advantages: e.target.value })} placeholder="Be honest - what advantages do they have over you?" rows={3} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Market Trends</label>
                  <Textarea value={formData.market_trends} onChange={(e) => setFormData({ ...formData, market_trends: e.target.value })} placeholder="What's changing in your industry? Technology, customer behavior, regulations..." rows={3} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Barriers to Entry</label>
                  <Textarea value={formData.barriers_to_entry} onChange={(e) => setFormData({ ...formData, barriers_to_entry: e.target.value })} placeholder="What makes it hard for new competitors to enter? What protects your position?" rows={2} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Regulatory / Legal Considerations</label>
                  <Textarea value={formData.regulatory_considerations} onChange={(e) => setFormData({ ...formData, regulatory_considerations: e.target.value })} placeholder="Any licenses, permits, regulations, compliance requirements?" rows={2} className="border-2" />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => setStep(3)} variant="outline" className="flex-1">← Back</Button>
                  <Button 
                    onClick={() => setStep(5)}
                    disabled={!formData.competitors}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 py-4 text-lg font-bold"
                  >
                    Next: Strategy & Constraints →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // STEP 5: Strategy & Constraints
  if (step === 5 && !generatedPlan) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl w-full">
            <Card className="border-none shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="bg-white/20 text-white px-3 py-1 mb-2">Step 5 of 5 - Final Details</Badge>
                    <CardTitle className="text-3xl mb-1">📊 Strategy & Constraints</CardTitle>
                    <p className="text-white/90">Marketing approach and what to avoid</p>
                  </div>
                  <Button onClick={onClose} variant="ghost" className="text-white" size="icon">
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-6 space-y-4">
                <div>
                  <label className="block font-bold mb-2 text-sm">Brand Values</label>
                  <Input value={formData.brand_values} onChange={(e) => setFormData({ ...formData, brand_values: e.target.value })} placeholder="e.g., Quality, Sustainability, Innovation" className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Current Marketing Channels</label>
                  <Input value={formData.current_marketing_channels} onChange={(e) => setFormData({ ...formData, current_marketing_channels: e.target.value })} placeholder="e.g., Social media, Email, SEO, Paid ads" className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Distribution Channels</label>
                  <Input value={formData.distribution_channels} onChange={(e) => setFormData({ ...formData, distribution_channels: e.target.value })} placeholder="How do customers get your product/service?" className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Pricing Strategy</label>
                  <Textarea value={formData.pricing_strategy} onChange={(e) => setFormData({ ...formData, pricing_strategy: e.target.value })} placeholder="Current pricing model, planned changes, competitor pricing..." rows={2} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    ⚠️ Strategies to AVOID
                  </label>
                  <Textarea 
                    value={formData.things_to_avoid} 
                    onChange={(e) => setFormData({ ...formData, things_to_avoid: e.target.value })} 
                    placeholder="e.g., No debt financing, Avoid price wars, Don't expand before profitable, No heavy discounting" 
                    rows={3} 
                    className="border-2 border-red-300 bg-red-50" 
                  />
                  <p className="text-xs text-red-600 mt-1 font-semibold">💡 AI will NOT recommend these approaches!</p>
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Critical Success Factors</label>
                  <Textarea value={formData.critical_success_factors} onChange={(e) => setFormData({ ...formData, critical_success_factors: e.target.value })} placeholder="What MUST go right for this plan to succeed?" rows={2} className="border-2" />
                </div>

                <div>
                  <label className="block font-bold mb-2 text-sm">Biggest Risks You're Worried About</label>
                  <Textarea value={formData.biggest_risks} onChange={(e) => setFormData({ ...formData, biggest_risks: e.target.value })} placeholder="What keeps you up at night? What could go wrong?" rows={3} className="border-2" />
                </div>

                <Card className="bg-yellow-50 border-2 border-yellow-400">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-1" />
                      <div>
                        <p className="font-bold text-yellow-900 text-sm mb-2">✨ Your comprehensive plan will include:</p>
                        <ul className="text-xs text-yellow-800 space-y-1">
                          <li>✅ Deep market & competitor analysis with specific data</li>
                          <li>✅ 5-7 STRATEGIC OPTIONS (each with 20-30 detailed steps, exact budgets, ROI projections)</li>
                          <li>✅ Comprehensive marketing & sales strategy (10+ acquisition channels)</li>
                          <li>✅ Month-by-month financial projections for 12 months</li>
                          <li>✅ Detailed operational roadmap</li>
                          <li>✅ 15+ risk mitigation strategies</li>
                          <li>✅ 20+ KPIs to track your progress</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => setStep(4)} variant="outline" className="flex-1">← Back</Button>
                  <Button onClick={handleGenerate} disabled={generating} className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 py-6 text-xl font-bold shadow-xl">
                    {generating ? <><Loader2 className="w-6 h-6 mr-2 animate-spin" />Generating Your Plan...</> : <><Sparkles className="w-6 h-6 mr-2" />Generate Complete Business Plan 🚀</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // STEP 6: Success & Download
  if (step === 6 && generatedPlan) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl w-full">
          <Card className="border-none shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-4xl mb-2">✅ Business Plan Ready!</CardTitle>
              <p className="text-white/90 text-lg">Professional business plan for {formData.company_name}</p>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-2 border-blue-300">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{(generatedPlan.strategy_options || []).length}</p>
                    <p className="text-xs text-slate-600">Strategy Options</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-2 border-purple-300">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">12</p>
                    <p className="text-xs text-slate-600">Month Forecast</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-2 border-green-300">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{(generatedPlan.risks_mitigation || []).length}</p>
                    <p className="text-xs text-slate-600">Risks Analyzed</p>
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
                    <li>✅ Deep market & competitor analysis</li>
                    <li>✅ {(generatedPlan.strategy_options || []).length} strategic options with detailed implementation</li>
                    <li>✅ 12-month financial projections</li>
                    <li>✅ Comprehensive operational roadmap</li>
                    <li>✅ {(generatedPlan.risks_mitigation || []).length} risk mitigation strategies</li>
                    <li>✅ {(generatedPlan.kpi_framework || []).length} KPIs to track</li>
                  </ul>
                </CardContent>
              </Card>

              <Button onClick={handleDownload} disabled={generating} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-8 text-2xl font-bold">
                {generating ? (
                  <><Loader2 className="w-8 h-8 mr-3 animate-spin" />Downloading...</>
                ) : (
                  <><FileText className="w-8 h-8 mr-3" />DOWNLOAD PLAN 📄</>
                )}
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