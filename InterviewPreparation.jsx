import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, UserCheck, User, ArrowLeft, Sparkles, 
  FileText, Building2, Briefcase, Loader2, CheckCircle2,
  AlertCircle, MessageSquare, Shirt
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function InterviewPreparation({ onComplete }) {
  const [mode, setMode] = useState(null); // 'interviewer' or 'interviewee'
  const [step, setStep] = useState('mode'); // mode, upload, details, analysis
  const [uploadedFile, setUploadedFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  
  // Interviewer mode data
  const [position, setPosition] = useState('');
  const [companyName, setCompanyName] = useState('');
  
  // Interviewee mode data
  const [interviewCompany, setInterviewCompany] = useState('');
  const [interviewRole, setInterviewRole] = useState('');
  
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('document') && !file.type.includes('text')) {
      alert('Please upload a PDF or document file');
      return;
    }

    setUploadedFile(file);
    setStep('details');
  };

  const analyzeForInterviewer = async () => {
    setAnalyzing(true);
    setStep('analysis');

    try {
      const upload = await base44.integrations.Core.UploadFile({ file: uploadedFile });
      const fileUrl = upload.file_url;

      const prompt = `You are analyzing a CV/Resume for an interview preparation.

CONTEXT:
- Position applying for: ${position}
- Company: ${companyName}
- CV/Resume attached

TASKS:
1. Analyze the candidate's CV and extract key information
2. Identify strengths and potential red flags
3. Generate 10-15 tailored interview questions aligned with the company and position
4. Suggest areas to probe deeper during the interview

Be specific to the company and position. Make questions professional and relevant.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            candidate_summary: { type: "string" },
            key_strengths: {
              type: "array",
              items: { type: "string" }
            },
            red_flags: {
              type: "array",
              items: { type: "string" }
            },
            interview_questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  purpose: { type: "string" },
                  category: { type: "string" }
                }
              }
            },
            areas_to_probe: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      alert('Analysis failed: ' + error.message);
      setStep('details');
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeForInterviewee = async () => {
    setAnalyzing(true);
    setStep('analysis');

    try {
      const upload = await base44.integrations.Core.UploadFile({ file: uploadedFile });
      const fileUrl = upload.file_url;

      const prompt = `You are helping someone prepare for a job interview.

CONTEXT:
- They're interviewing at: ${interviewCompany}
- For position: ${interviewRole}
- Their CV/Application attached

TASKS:
1. Review their background and qualifications
2. Suggest 8-12 smart questions they should ask the interviewer
3. Provide dress code recommendations based on company/role
4. Give professional tips for making a great impression
5. Identify potential weak points they should prepare to address

Be specific and actionable.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [fileUrl],
        response_json_schema: {
          type: "object",
          properties: {
            your_profile_summary: { type: "string" },
            questions_to_ask: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  why_ask_this: { type: "string" },
                  category: { type: "string" }
                }
              }
            },
            dress_code: {
              type: "object",
              properties: {
                recommendation: { type: "string" },
                specific_tips: { type: "array", items: { type: "string" } }
              }
            },
            interview_tips: {
              type: "array",
              items: { type: "string" }
            },
            prepare_for_these: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      alert('Analysis failed: ' + error.message);
      setStep('details');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setMode(null);
    setStep('mode');
    setUploadedFile(null);
    setAnalysis(null);
    setPosition('');
    setCompanyName('');
    setInterviewCompany('');
    setInterviewRole('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (step === 'mode') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6 flex items-center justify-center">
        <div className="max-w-5xl w-full">
          <Button onClick={onComplete} variant="ghost" className="mb-6 text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Practice Hub
          </Button>

          <Card className="border-none shadow-2xl bg-white/10 backdrop-blur-xl mb-6">
            <CardContent className="p-8 text-center">
              <Briefcase className="w-20 h-20 text-purple-400 mx-auto mb-4" />
              <h1 className="text-5xl font-black text-white mb-3">💼 Interview Preparation</h1>
              <p className="text-2xl text-purple-200">AI-Powered Interview Assistance</p>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              whileHover={{ scale: 1.03, y: -8 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="border-none shadow-2xl cursor-pointer overflow-hidden h-full"
                onClick={() => { setMode('interviewer'); setStep('upload'); }}
              >
                <div className="h-3 bg-gradient-to-r from-blue-600 to-cyan-600" />
                <CardContent className="p-8 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                    <UserCheck className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-3">👔 Interviewer Mode</h2>
                  <p className="text-slate-600 mb-6">You're conducting the interview</p>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Upload candidate's CV</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">AI analyzes their background</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Get tailored interview questions</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Spot red flags & strengths</span>
                    </div>
                  </div>
                  
                  <Badge className="w-full justify-center py-3 mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
                    Start as Interviewer
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03, y: -8 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="border-none shadow-2xl cursor-pointer overflow-hidden h-full"
                onClick={() => { setMode('interviewee'); setStep('upload'); }}
              >
                <div className="h-3 bg-gradient-to-r from-purple-600 to-pink-600" />
                <CardContent className="p-8 bg-gradient-to-br from-purple-50 to-pink-50">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                    <User className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-3">🎯 Interviewee Mode</h2>
                  <p className="text-slate-600 mb-6">You're being interviewed</p>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Upload your CV/application</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Get smart questions to ask</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Dress code recommendations</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">Professional impression tips</span>
                    </div>
                  </div>
                  
                  <Badge className="w-full justify-center py-3 mt-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    Start as Interviewee
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
        <div className="max-w-3xl mx-auto">
          <Button onClick={handleReset} variant="ghost" className="mb-6 text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardHeader className={`bg-gradient-to-r ${mode === 'interviewer' ? 'from-blue-600 to-cyan-600' : 'from-purple-600 to-pink-600'} text-white p-8`}>
              <CardTitle className="text-3xl font-black">
                {mode === 'interviewer' ? '📄 Upload Candidate CV' : '📄 Upload Your CV/Application'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-8">
              {!uploadedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-4 border-dashed border-purple-300 rounded-2xl p-16 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-20 h-20 text-purple-500 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Upload CV/Resume</h3>
                  <p className="text-slate-600 mb-4">Click to select or drag & drop</p>
                  <Badge className="bg-purple-600 text-white">PDF, DOC, DOCX, TXT</Badge>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card className="bg-green-50 border-2 border-green-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="font-bold text-green-900">{uploadedFile.name}</p>
                          <p className="text-sm text-green-700">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Button
                    onClick={() => setUploadedFile(null)}
                    variant="outline"
                    className="w-full"
                  >
                    Upload Different File
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'details') {
    const canProceed = mode === 'interviewer' 
      ? position.trim() && companyName.trim()
      : interviewCompany.trim() && interviewRole.trim();

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-6">
        <div className="max-w-3xl mx-auto">
          <Button onClick={() => setStep('upload')} variant="ghost" className="mb-6 text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card className="border-none shadow-2xl">
            <CardHeader className={`bg-gradient-to-r ${mode === 'interviewer' ? 'from-blue-600 to-cyan-600' : 'from-purple-600 to-pink-600'} text-white p-8`}>
              <CardTitle className="text-3xl font-black">
                {mode === 'interviewer' ? '🏢 Interview Details' : '🎯 Interview Information'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="p-8 space-y-6">
              {mode === 'interviewer' ? (
                <>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-900">Position/Role *</label>
                    <Input
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="e.g., Senior Software Engineer, Marketing Manager"
                      className="border-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-900">Company Name *</label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g., Google, Tesla, Your Company"
                      className="border-2"
                    />
                  </div>

                  <Card className="bg-blue-50 border-2 border-blue-300">
                    <CardContent className="p-4">
                      <p className="text-sm text-blue-900">
                        <Sparkles className="w-4 h-4 inline mr-2" />
                        AI will analyze the CV and create company-specific interview questions
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-900">Company You're Interviewing At *</label>
                    <Input
                      value={interviewCompany}
                      onChange={(e) => setInterviewCompany(e.target.value)}
                      placeholder="e.g., Google, Microsoft, Local Business"
                      className="border-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 text-slate-900">Position You're Applying For *</label>
                    <Input
                      value={interviewRole}
                      onChange={(e) => setInterviewRole(e.target.value)}
                      placeholder="e.g., Sales Manager, Marketing Coordinator"
                      className="border-2"
                    />
                  </div>

                  <Card className="bg-purple-50 border-2 border-purple-300">
                    <CardContent className="p-4">
                      <p className="text-sm text-purple-900">
                        <Sparkles className="w-4 h-4 inline mr-2" />
                        AI will prepare you with smart questions, dress code, and professional tips
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              <Button
                onClick={mode === 'interviewer' ? analyzeForInterviewer : analyzeForInterviewee}
                disabled={!canProceed}
                className={`w-full py-6 text-lg font-bold ${
                  mode === 'interviewer' 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600' 
                    : 'bg-gradient-to-r from-purple-600 to-pink-600'
                }`}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze & Prepare
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'analysis' && analyzing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6">
        <Card className="max-w-2xl w-full border-none shadow-2xl">
          <CardContent className="p-12 text-center">
            <Loader2 className="w-24 h-24 animate-spin text-purple-400 mx-auto mb-8" />
            <h2 className="text-4xl font-black text-white mb-4">Analyzing...</h2>
            <p className="text-purple-200 text-lg">
              {mode === 'interviewer' 
                ? 'AI is reviewing CV and preparing interview questions'
                : 'AI is preparing your interview strategy'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'analysis' && analysis) {
    if (mode === 'interviewer') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-black text-white">📋 Interview Guide</h1>
              <Button onClick={onComplete} variant="outline" className="text-white border-white/20 hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Practice Hub
              </Button>
            </div>

            <Card className="border-none shadow-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-2">Candidate Summary</h2>
                <p className="text-white/90 text-lg leading-relaxed">{analysis.candidate_summary}</p>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-none shadow-xl bg-green-50">
                <CardHeader className="bg-green-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6" />
                    Key Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {analysis.key_strengths?.map((strength, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Badge className="bg-green-600 text-white flex-shrink-0">{idx + 1}</Badge>
                        <span className="text-slate-800 text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-red-50">
                <CardHeader className="bg-red-600 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-6 h-6" />
                    Red Flags / Watch Out
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-3">
                    {analysis.red_flags?.map((flag, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Badge className="bg-red-600 text-white flex-shrink-0">{idx + 1}</Badge>
                        <span className="text-slate-800 text-sm">{flag}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-xl bg-white/95">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="text-2xl">❓ Interview Questions ({analysis.interview_questions?.length})</CardTitle>
                <p className="text-white/90 text-sm">Tailored for {companyName} - {position}</p>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {analysis.interview_questions?.map((q, idx) => (
                    <Card key={idx} className="border-2 border-purple-200">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3 mb-2">
                          <Badge className="bg-purple-600 text-white">{idx + 1}</Badge>
                          <Badge variant="outline" className="text-xs">{q.category}</Badge>
                        </div>
                        <p className="font-bold text-slate-900 text-lg mb-2">{q.question}</p>
                        <p className="text-sm text-slate-600 italic">Purpose: {q.purpose}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-orange-50">
              <CardHeader className="bg-orange-600 text-white">
                <CardTitle>🎯 Areas to Probe Deeper</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-2">
                  {analysis.areas_to_probe?.map((area, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-800">
                      <span className="text-orange-600 font-bold">•</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Button onClick={handleReset} variant="outline" className="py-6 border-white/20 text-white hover:bg-white/10">
                Analyze Another CV
              </Button>
              <Button onClick={onComplete} className="bg-gradient-to-r from-blue-600 to-purple-600 py-6">
                Done
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Interviewee feedback
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-pink-900 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-black text-white">🎯 Your Interview Preparation</h1>
            <Button onClick={onComplete} variant="outline" className="text-white border-white/20 hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Practice Hub
            </Button>
          </div>

          <Card className="border-none shadow-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-2">Your Profile Analysis</h2>
              <p className="text-white/90 text-lg leading-relaxed">{analysis.your_profile_summary}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white/95">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
              <CardTitle className="text-2xl">❓ Smart Questions to Ask ({analysis.questions_to_ask?.length})</CardTitle>
              <p className="text-white/90 text-sm">Impress them with these questions</p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {analysis.questions_to_ask?.map((q, idx) => (
                  <Card key={idx} className="border-2 border-blue-200">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3 mb-2">
                        <Badge className="bg-blue-600 text-white">{idx + 1}</Badge>
                        <Badge variant="outline" className="text-xs">{q.category}</Badge>
                      </div>
                      <p className="font-bold text-slate-900 text-lg mb-2">{q.question}</p>
                      <p className="text-sm text-slate-600 italic">Why ask: {q.why_ask_this}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-pink-50 to-rose-50">
            <CardHeader className="bg-gradient-to-r from-pink-600 to-rose-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Shirt className="w-6 h-6" />
                Dress Code Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="font-bold text-lg text-slate-900 mb-4">{analysis.dress_code?.recommendation}</p>
              <ul className="space-y-2">
                {analysis.dress_code?.specific_tips?.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-pink-600 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-green-50">
            <CardHeader className="bg-green-600 text-white">
              <CardTitle>💡 Professional Tips</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-3">
                {analysis.interview_tips?.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Badge className="bg-green-600 text-white flex-shrink-0">{idx + 1}</Badge>
                    <span className="text-slate-800">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-orange-50">
            <CardHeader className="bg-orange-600 text-white">
              <CardTitle>⚠️ Prepare to Address These</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-2">
                {analysis.prepare_for_these?.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-800">
                    <span className="text-orange-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleReset} variant="outline" className="py-6 border-white/20 text-white hover:bg-white/10">
              Prepare for Another Interview
            </Button>
            <Button onClick={onComplete} className="bg-gradient-to-r from-purple-600 to-pink-600 py-6">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}