
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Upload,
  Tag,
  Sparkles,
  Search,
  Folder,
  Trash2,
  ExternalLink,
  Loader2,
  MessageSquare,
  Brain,
  Link as LinkIcon,
  Share2,
  Mail,
  Copy,
  Download,
  FileSpreadsheet,
  FileCode,
  Save,
  CheckCircle,
  File
} from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentsModule({ user, theme, searchQuery }) {
  const queryClient = useQueryClient();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [summary, setSummary] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    folder: '',
    tags: []
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [newTag, setNewTag] = useState('');

  const { data: documents = [] } = useQuery({
    queryKey: ['professionalDocuments', user.email],
    queryFn: () => base44.entities.ProfessionalDocument.filter({ user_email: user.email }, '-created_date'),
    initialData: []
  });

  const createDocMutation = useMutation({
    mutationFn: (data) => base44.entities.ProfessionalDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalDocuments'] });
      setShowUploadDialog(false);
      setUploadForm({ title: '', folder: '', tags: [] });
      setSelectedFile(null);
    }
  });

  const deleteDocMutation = useMutation({
    mutationFn: (id) => base44.entities.ProfessionalDocument.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalDocuments'] });
      setShowDocDialog(false);
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadForm.title) {
        setUploadForm({ ...uploadForm, title: file.name });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadForm.title.trim()) {
      alert('Please select a file and enter a title');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      
      const fileType = selectedFile.name.split('.').pop().toLowerCase();
      const fileSize = selectedFile.size;

      let aiSummary = '';
      let aiInsights = [];
      let readingTime = 0;

      try {
        const analysisResult = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this document titled "${uploadForm.title}" (${fileType} file).

Provide:
1. A 2-sentence summary
2. 3 key insights or topics
3. Estimated reading time in minutes
4. Suggested tags (3-5 relevant tags)

Be concise and professional.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              insights: { type: "array", items: { type: "string" } },
              reading_time_minutes: { type: "number" },
              suggested_tags: { type: "array", items: { type: "string" } }
            }
          }
        });

        aiSummary = analysisResult.summary;
        aiInsights = analysisResult.insights;
        readingTime = analysisResult.reading_time_minutes;
        
        if (!uploadForm.tags.length && analysisResult.suggested_tags) {
          setUploadForm({ ...uploadForm, tags: analysisResult.suggested_tags.slice(0, 3) });
        }
      } catch (error) {
        console.error('AI analysis failed:', error);
      }

      await createDocMutation.mutateAsync({
        user_email: user.email,
        title: uploadForm.title,
        file_url,
        file_type: fileType,
        file_size: fileSize,
        folder: uploadForm.folder || 'General',
        tags: uploadForm.tags,
        ai_summary: aiSummary,
        ai_insights: aiInsights,
        reading_time_minutes: readingTime,
        linked_tasks: [],
        linked_kpis: [],
        version: 1
      });

      alert('✅ Document uploaded and analyzed!');
    } catch (error) {
      alert('❌ Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim() || !selectedDoc) return;

    setAnalyzing(true);
    try {
      const answer = await base44.integrations.Core.InvokeLLM({
        prompt: `You are analyzing a document titled "${selectedDoc.title}".

${selectedDoc.ai_summary ? `Document summary: ${selectedDoc.ai_summary}` : ''}

User question: ${aiQuestion}

Provide a clear, concise answer based on the document content.`,
        file_urls: [selectedDoc.file_url],
        add_context_from_internet: false
      });

      setAiAnswer(answer);
    } catch (error) {
      setAiAnswer('❌ Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedDoc) return;

    setSummarizing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a comprehensive, professional summary of this document: "${selectedDoc.title}"

Provide a beautifully formatted summary with:

# Executive Summary
[2-3 sentences capturing the essence]

# Key Points
• [Main point 1]
• [Main point 2]
• [Main point 3]
• [etc.]

# Main Takeaways
[What readers should remember]

# Action Items
[Any recommended actions or next steps]

Make it clear, professional, and actionable. Use markdown formatting for visual appeal.`,
        file_urls: [selectedDoc.file_url],
        add_context_from_internet: false
      });

      setSummary(result);
    } catch (error) {
      setSummary('❌ Summary generation failed: ' + error.message);
    } finally {
      setSummarizing(false);
    }
  };

  const handleDownloadSummaryHTML = async () => {
    if (!summary || !selectedDoc) return;

    setDownloadingSummary(true);
    try {
      // Convert markdown to styled HTML
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${selectedDoc.title} - AI Summary</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 40px auto;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 60px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .header {
            border-bottom: 4px solid #667eea;
            padding-bottom: 20px;
            margin-bottom: 40px;
        }
        h1 {
            color: #667eea;
            font-size: 32px;
            margin: 0 0 10px 0;
            font-weight: 700;
        }
        .subtitle {
            color: #888;
            font-size: 14px;
            font-weight: 500;
        }
        h2 {
            color: #764ba2;
            font-size: 24px;
            margin-top: 40px;
            margin-bottom: 20px;
            font-weight: 600;
            border-left: 5px solid #667eea;
            padding-left: 15px;
        }
        h3 {
            color: #555;
            font-size: 18px;
            margin-top: 25px;
            margin-bottom: 15px;
        }
        p {
            line-height: 1.8;
            color: #444;
            margin-bottom: 15px;
            font-size: 16px;
        }
        ul, ol {
            line-height: 2;
            color: #444;
            padding-left: 25px;
        }
        li {
            margin-bottom: 10px;
            font-size: 16px;
        }
        .ai-badge {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 30px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #eee;
            text-align: center;
            color: #888;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="ai-badge">✨ AI Generated Summary</div>
            <h1>${selectedDoc.title}</h1>
            <div class="subtitle">Generated on ${format(new Date(), 'MMMM d, yyyy @ h:mm a')}</div>
        </div>
        
        <div class="content">
            ${summary.split('\n').map(line => {
                if (line.startsWith('# ')) {
                    return `<h2>${line.replace('# ', '')}</h2>`;
                } else if (line.startsWith('## ')) {
                    return `<h3>${line.replace('## ', '')}</h3>`;
                } else if (line.startsWith('• ')) {
                    return `<li>${line.replace('• ', '')}</li>`;
                } else if (line.trim()) {
                    return `<p>${line}</p>`;
                }
                return '';
            }).join('')}
        </div>
        
        <div class="footer">
            <p><strong>Original Document:</strong> ${selectedDoc.title}</p>
            <p>Summarized using AI • Professional Space by Pro-Session</p>
        </div>
    </div>
</body>
</html>`;

      // Create and download HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDoc.title} - AI Summary.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      alert('✅ Beautiful HTML summary downloaded! Open it in your browser to see the styled version, then you can print it as PDF.');
    } catch (error) {
      alert('❌ Download failed: ' + error.message);
    } finally {
      setDownloadingSummary(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!summary || !selectedDoc) return;

    setSavingSummary(true);
    try {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${selectedDoc.title} - AI Summary</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 40px auto;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333; /* Added for better legibility */
        }
        .container {
            background: white;
            padding: 60px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { color: #667eea; font-size: 32px; }
        h2 { color: #764ba2; font-size: 24px; margin-top: 40px; }
        p { line-height: 1.8; color: #444; } /* Added for better legibility */
        ul, ol { /* Added for markdown list support */
            line-height: 2;
            color: #444;
            padding-left: 25px;
        }
        li { /* Added for markdown list support */
            margin-bottom: 10px;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${selectedDoc.title} - AI Summary</h1>
        <p><em>Generated on ${format(new Date(), 'MMMM d, yyyy')}</em></p>
        <hr>
        ${summary.split('\n').map(line => {
            if (line.startsWith('# ')) return `<h2>${line.replace('# ', '')}</h2>`;
            if (line.startsWith('## ')) return `<h3>${line.replace('## ', '')}</h3>`;
            if (line.startsWith('• ')) return `<li>${line.replace('• ', '')}</li>`;
            if (line.trim()) return `<p>${line}</p>`;
            return '';
        }).join('')}
    </div>
</body>
</html>`;

      // Create a blob with HTML content type
      const summaryBlob = new Blob([htmlContent], { type: 'text/html' });
      const timestamp = Date.now();
      // Ensure filename has .html extension and correct content type
      const filename = `${selectedDoc.title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)}_Summary_${timestamp}.html`;
      
      // Create File object with HTML content type and .html extension
      const fileForUpload = new File([summaryBlob], filename, { type: 'text/html' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file: fileForUpload });

      await createDocMutation.mutateAsync({
        user_email: user.email,
        title: `📄 ${selectedDoc.title} - AI Summary`,
        file_url,
        file_type: 'html', 
        file_size: summaryBlob.size,
        folder: selectedDoc.folder || 'General',
        tags: [...(selectedDoc.tags || []), 'AI Summary', 'Summary'],
        ai_summary: `AI-generated summary of "${selectedDoc.title}" (Styled HTML)`,
        ai_insights: ['Summarized version', 'Contains key points', 'AI-generated', 'Styled HTML format'],
        reading_time_minutes: 5,
        linked_tasks: [],
        linked_kpis: [],
        version: 1
      });

      alert('✅ Summary saved as new styled HTML document! Open it anytime from your library.');
      setSummary('');
    } catch (error) {
      console.error('Save error:', error);
      alert('❌ Failed to save: ' + error.message);
    } finally {
      setSavingSummary(false);
    }
  };

  const handleShareViaEmail = async () => {
    if (!shareEmail.trim() || !selectedDoc) {
      alert('Please enter an email address');
      return;
    }

    try {
      await base44.integrations.Core.SendEmail({
        to: shareEmail,
        subject: `Shared Document: ${selectedDoc.title}`,
        body: `${user.full_name || user.email} has shared a document with you:

Document: ${selectedDoc.title}
${shareMessage ? `\nMessage: ${shareMessage}` : ''}

${selectedDoc.ai_summary ? `Summary: ${selectedDoc.ai_summary}\n` : ''}

Access the document: ${selectedDoc.file_url}

---
Shared via Professional Space`
      });

      alert('✅ Document shared successfully!');
      setShowShareDialog(false);
      setShareEmail('');
      setShareMessage('');
    } catch (error) {
      alert('❌ Failed to share: ' + error.message);
    }
  };

  const handleCopyLink = () => {
    if (selectedDoc) {
      navigator.clipboard.writeText(selectedDoc.file_url);
      alert('✅ Link copied to clipboard!');
    }
  };

  const handleShareToExternalApp = (app) => {
    if (!selectedDoc) return;

    const text = `${selectedDoc.title}\n${selectedDoc.ai_summary || ''}\n${selectedDoc.file_url}`;
    const url = selectedDoc.file_url;

    switch (app) {
      case 'outlook':
        window.open(`mailto:?subject=${encodeURIComponent(selectedDoc.title)}&body=${encodeURIComponent(text)}`);
        break;
      case 'teams':
        window.open(`https://teams.microsoft.com/share?href=${encodeURIComponent(url)}&msgText=${encodeURIComponent(selectedDoc.title)}`);
        break;
      case 'onedrive':
        window.open(`https://onedrive.live.com/`);
        alert('💡 Tip: Upload the file to OneDrive from the file URL');
        break;
      case 'excel':
        if (selectedDoc.file_type === 'xlsx' || selectedDoc.file_type === 'xls') {
          window.open(selectedDoc.file_url);
        } else {
          alert('This is not an Excel file');
        }
        break;
      default:
        break;
    }
  };

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.folder?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const folders = [...new Set(documents.map(d => d.folder).filter(Boolean))];

  const textColor = theme.dark ? 'text-white' : 'text-slate-900';
  const textSecondary = theme.dark ? 'text-slate-300' : 'text-slate-600';
  const cardBg = theme.dark ? 'bg-slate-800/50' : 'bg-white';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${textColor}`}>Document Intelligence Center</h2>
          <p className={textSecondary}>Upload, organize, and analyze with AI</p>
        </div>
        <Button 
          onClick={() => setShowUploadDialog(true)}
          className={`bg-gradient-to-r ${theme.accent} text-white`}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {folders.map(folder => {
            const count = documents.filter(d => d.folder === folder).length;
            return (
              <Badge key={folder} variant="outline" className="px-3 py-1">
                <Folder className="w-3 h-3 mr-1" />
                {folder} ({count})
              </Badge>
            );
          })}
        </div>
      )}

      {/* Documents Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map(doc => (
          <Card 
            key={doc.id}
            className={`border-none shadow-lg ${cardBg} hover:shadow-xl transition-all cursor-pointer`}
            onClick={() => {
              setSelectedDoc(doc);
              setShowDocDialog(true);
              setAiQuestion('');
              setAiAnswer('');
              setSummary('');
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {doc.tags?.includes('AI Summary') || doc.tags?.includes('Summary') ? (
                    <Sparkles className="w-8 h-8 text-purple-600" />
                  ) : (
                    <FileText className={`w-8 h-8 ${textColor}`} />
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {doc.file_type}
                  </Badge>
                </div>
              </div>
              
              <h3 className={`font-bold ${textColor} mb-2 line-clamp-2`}>{doc.title}</h3>
              
              {doc.ai_summary && (
                <p className={`text-xs ${textSecondary} line-clamp-3 mb-3`}>
                  {doc.ai_summary}
                </p>
              )}

              <div className="flex flex-wrap gap-1 mb-3">
                {doc.tags?.slice(0, 3).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className={`text-xs ${textSecondary} flex items-center justify-between`}>
                <span>{format(new Date(doc.created_date), 'MMM d, yyyy')}</span>
                {doc.reading_time_minutes && (
                  <span>{doc.reading_time_minutes}min</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {documents.length === 0 && (
        <Card className={`border-none shadow-lg ${cardBg}`}>
          <CardContent className="p-16 text-center">
            <Upload className={`w-16 h-16 ${textSecondary} mx-auto mb-4 opacity-50`} />
            <h3 className={`text-xl font-bold ${textColor} mb-2`}>No documents yet</h3>
            <p className={`${textSecondary} mb-6`}>Upload your first document</p>
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Select File *
              </label>
              <input
                type="file"
                onChange={handleFileSelect}
                className="w-full"
                accept=".pdf,.doc,.docx,.xlsx,.xls,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
              />
              {selectedFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Document Title *
              </label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                placeholder="Enter document title..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Folder
              </label>
              <Input
                value={uploadForm.folder}
                onChange={(e) => setUploadForm({ ...uploadForm, folder: e.target.value })}
                placeholder="e.g., Contracts, Reports, Invoices..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newTag.trim()) {
                      setUploadForm({ ...uploadForm, tags: [...uploadForm.tags, newTag.trim()] });
                      setNewTag('');
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (newTag.trim()) {
                      setUploadForm({ ...uploadForm, tags: [...uploadForm.tags, newTag.trim()] });
                      setNewTag('');
                    }
                  }}
                  variant="outline"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {uploadForm.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                    <button 
                      onClick={() => setUploadForm({ ...uploadForm, tags: uploadForm.tags.filter((_, i) => i !== idx) })}
                      className="ml-2"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading & Analyzing with AI...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Analyze
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Dialog - keeping rest of the component the same */}
      <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedDoc && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3">
                  {selectedDoc.tags?.includes('AI Summary') || selectedDoc.tags?.includes('Summary') ? (
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                  {selectedDoc.title}
                </DialogTitle>
              </DialogHeader>

              <div className="flex gap-2 flex-wrap">
                <Button asChild variant="outline">
                  <a href={selectedDoc.file_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open File
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={selectedDoc.file_url} download>
                    <Download className="w-4 h-4 mr-2" />
                    Download Original
                  </a>
                </Button>
                <Button onClick={handleCopyLink} variant="outline">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
                <Button onClick={() => setShowShareDialog(true)} variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                {!selectedDoc.tags?.includes('AI Summary') && (
                  <Button onClick={handleGenerateSummary} variant="outline" disabled={summarizing} className="bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100">
                    {summarizing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Brain className="w-4 h-4 mr-2" />
                    )}
                    AI Summarizer
                  </Button>
                )}
                <Button
                  onClick={() => deleteDocMutation.mutate(selectedDoc.id)}
                  variant="outline"
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>

              {/* AI Generated Summary - Enhanced Visual Design */}
              {summary && (
                <Card className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 border-2 border-purple-300 shadow-2xl">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-purple-900 text-lg">AI Document Summary</h4>
                          <p className="text-sm text-purple-600">Beautifully formatted with visuals</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleDownloadSummaryHTML} size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" disabled={downloadingSummary}>
                          {downloadingSummary ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-1" />
                          )}
                          Download Beautiful HTML
                        </Button>
                        <Button onClick={handleSaveSummary} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={savingSummary}>
                          {savingSummary ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-1" />
                          )}
                          Save as New Doc
                        </Button>
                      </div>
                    </div>
                    
                    <div className="prose prose-sm max-w-none bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200">
                      <div className="text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                        {summary.split('\n').map((line, idx) => {
                          if (line.startsWith('# ')) {
                            return <h2 key={idx} className="text-2xl font-bold text-purple-900 mb-3 mt-6 first:mt-0">{line.replace('# ', '')}</h2>;
                          } else if (line.startsWith('## ')) {
                            return <h3 key={idx} className="text-xl font-bold text-purple-800 mb-2 mt-4">{line.replace('## ', '')}</h3>;
                          } else if (line.startsWith('• ')) {
                            return <li key={idx} className="ml-6 mb-2 text-slate-700">{line.replace('• ', '')}</li>;
                          } else if (line.trim()) {
                            return <p key={idx} className="mb-3 text-slate-700">{line}</p>;
                          }
                          return null;
                        })}
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-3 text-sm text-purple-700 bg-purple-100 px-4 py-3 rounded-lg">
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold mb-1">💾 Your original document "{selectedDoc.title}" is safe and unchanged!</p>
                        <p className="text-purple-600">Download as beautiful HTML (opens in browser, can print as PDF) or save as new document in your library.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Share to External Apps */}
              <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                  <p className="text-sm font-semibold mb-3">Quick Share To:</p>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => handleShareToExternalApp('outlook')} size="sm" variant="outline">
                      <Mail className="w-4 h-4 mr-1" />
                      Outlook
                    </Button>
                    <Button onClick={() => handleShareToExternalApp('teams')} size="sm" variant="outline">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Teams
                    </Button>
                    {(selectedDoc.file_type === 'xlsx' || selectedDoc.file_type === 'xls') && (
                      <Button onClick={() => handleShareToExternalApp('excel')} size="sm" variant="outline">
                        <FileSpreadsheet className="w-4 h-4 mr-1" />
                        Excel Online
                      </Button>
                    )}
                    <Button onClick={() => handleShareToExternalApp('onedrive')} size="sm" variant="outline">
                      <FileCode className="w-4 h-4 mr-1" />
                      OneDrive
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Summary */}
              {selectedDoc.ai_summary && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-blue-900 mb-2">Quick Summary</h4>
                        <p className="text-sm text-slate-700">{selectedDoc.ai_summary}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Insights */}
              {selectedDoc.ai_insights && selectedDoc.ai_insights.length > 0 && (
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      Key Insights
                    </h4>
                    <ul className="space-y-2">
                      {selectedDoc.ai_insights.map((insight, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-purple-600 font-bold">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Folder</p>
                  <Badge variant="outline">{selectedDoc.folder || 'General'}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">File Type</p>
                  <Badge variant="outline">{selectedDoc.file_type}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Uploaded</p>
                  <p className="text-sm font-medium">{format(new Date(selectedDoc.created_date), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Reading Time</p>
                  <p className="text-sm font-medium">{selectedDoc.reading_time_minutes || '?'} min</p>
                </div>
              </div>

              {/* Tags */}
              {selectedDoc.tags && selectedDoc.tags.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDoc.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Reading Mode */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    <h4 className="font-bold text-green-900">AI Reading Mode</h4>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      placeholder='Ask: "Summarize this", "Find mentions of revenue"...'
                      onKeyPress={(e) => e.key === 'Enter' && handleAskAI()}
                    />
                    <Button
                      onClick={handleAskAI}
                      disabled={analyzing || !aiQuestion.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {analyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {aiAnswer && (
                    <div className="p-4 bg-white rounded-lg border-2 border-green-300">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{aiAnswer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Recipient Email *</label>
              <Input
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="colleague@company.com"
                type="email"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Message (Optional)</label>
              <Textarea
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={3}
              />
            </div>

            <Button onClick={handleShareViaEmail} className="w-full">
              <Mail className="w-4 h-4 mr-2" />
              Send via Email
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
