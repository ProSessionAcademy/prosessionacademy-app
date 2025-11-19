import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Mail,
  FileText,
  BarChart3,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  Loader2,
  Wand2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const AI_COMMANDS = [
  { id: 'email', label: 'Draft Email', icon: Mail, color: 'from-blue-600 to-cyan-600' },
  { id: 'proposal', label: 'Write Proposal', icon: FileText, color: 'from-purple-600 to-pink-600' },
  { id: 'report', label: 'Generate Report', icon: BarChart3, color: 'from-green-600 to-emerald-600' },
  { id: 'summary', label: 'Summarize Text', icon: MessageSquare, color: 'from-orange-600 to-red-600' },
  { id: 'free', label: 'Free Command', icon: Wand2, color: 'from-indigo-600 to-purple-600' }
];

export default function AIStudioModule({ user, theme, config }) {
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [input, setInput] = useState('');
  const [context, setContext] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const handleExecute = async () => {
    if (!input.trim()) {
      alert('Please provide input');
      return;
    }

    setProcessing(true);
    setResult('');

    try {
      let prompt = '';

      switch (selectedCommand) {
        case 'email':
          prompt = `Write a professional email about: ${input}

${context ? `Additional context: ${context}` : ''}

Include appropriate subject line, greeting, body, and closing.`;
          break;

        case 'proposal':
          prompt = `Create a professional proposal for: ${input}

${context ? `Context: ${context}` : ''}

Include: Executive Summary, Objectives, Approach, Timeline, Budget Estimate.`;
          break;

        case 'report':
          prompt = `Generate a professional report on: ${input}

${context ? `Data/Context: ${context}` : ''}

Include: Summary, Key Findings, Analysis, Recommendations.`;
          break;

        case 'summary':
          prompt = `Summarize this text concisely:

${input}

Provide a clear, professional summary in 3-5 bullet points.`;
          break;

        case 'free':
          prompt = input;
          break;

        default:
          prompt = input;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setResult(response);
    } catch (error) {
      setResult('❌ Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const textColor = theme.dark ? 'text-white' : 'text-slate-900';
  const textSecondary = theme.dark ? 'text-slate-300' : 'text-slate-600';
  const cardBg = theme.dark ? 'bg-slate-800/50' : 'bg-white';

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-3xl font-bold ${textColor} mb-2`}>AI Studio</h2>
        <p className={textSecondary}>The brain of your workspace</p>
      </div>

      {!selectedCommand ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AI_COMMANDS.map(cmd => {
            const Icon = cmd.icon;
            return (
              <Card
                key={cmd.id}
                className={`border-none shadow-xl cursor-pointer hover:scale-105 transition-transform ${cardBg}`}
                onClick={() => setSelectedCommand(cmd.id)}
              >
                <CardContent className="p-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cmd.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={`font-bold ${textColor} text-lg`}>{cmd.label}</h3>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className={`border-none shadow-2xl ${cardBg}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={textColor}>
                {AI_COMMANDS.find(c => c.id === selectedCommand)?.label}
              </CardTitle>
              <Button onClick={() => {
                setSelectedCommand(null);
                setInput('');
                setContext('');
                setResult('');
              }} variant="outline">
                ← Back
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                {selectedCommand === 'free' ? 'Your Command' : 'Main Input'}
              </label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  selectedCommand === 'email' ? 'Describe the email purpose...' :
                  selectedCommand === 'proposal' ? 'Describe the project/proposal...' :
                  selectedCommand === 'report' ? 'What should the report cover?' :
                  selectedCommand === 'summary' ? 'Paste text to summarize...' :
                  'What do you want AI to do?'
                }
                rows={6}
              />
            </div>

            {selectedCommand !== 'free' && selectedCommand !== 'summary' && (
              <div>
                <label className={`block text-sm font-semibold ${textColor} mb-2`}>
                  Additional Context (Optional)
                </label>
                <Textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Add any relevant details, data, or background..."
                  rows={3}
                />
              </div>
            )}

            <Button
              onClick={handleExecute}
              disabled={processing || !input.trim()}
              className={`w-full bg-gradient-to-r ${theme.accent} text-white py-6 text-lg`}
              size="lg"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI is working...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Execute Command
                </>
              )}
            </Button>

            {result && (
              <Card className={theme.dark ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-2'}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className={`font-bold ${textColor}`}>✨ AI Result</h4>
                    <Button onClick={copyResult} size="sm" variant="outline">
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className={`whitespace-pre-wrap text-sm ${textColor} font-sans`}>
                    {result}
                  </pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}