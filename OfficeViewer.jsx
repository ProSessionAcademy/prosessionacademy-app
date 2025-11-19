import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ExternalLink, RefreshCw, FileText, Table, Presentation, FolderOpen } from 'lucide-react';

const EMBEDDABLE_APPS = {
  google_docs: {
    url: 'https://docs.google.com/document/u/0/',
    title: '📝 Google Docs',
    icon: FileText,
    description: 'Create and edit documents',
    color: 'from-blue-500 to-blue-600'
  },
  google_sheets: {
    url: 'https://docs.google.com/spreadsheets/u/0/',
    title: '📊 Google Sheets',
    icon: Table,
    description: 'Create and edit spreadsheets',
    color: 'from-green-500 to-green-600'
  },
  google_slides: {
    url: 'https://docs.google.com/presentation/u/0/',
    title: '🎨 Google Slides',
    icon: Presentation,
    description: 'Create and edit presentations',
    color: 'from-yellow-500 to-orange-600'
  },
  google_drive: {
    url: 'https://drive.google.com/drive/u/0/my-drive',
    title: '📁 Google Drive',
    icon: FolderOpen,
    description: 'Access your files',
    color: 'from-purple-500 to-purple-600'
  }
};

export default function OfficeViewer({ appKey, onClose, theme }) {
  const [loading, setLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const app = EMBEDDABLE_APPS[appKey];
  
  if (!app) return null;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [iframeKey]);

  const handleReload = () => {
    setLoading(true);
    setIframeKey(prev => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(app.url, '_blank', 'noopener,noreferrer');
  };

  const Icon = app.icon;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col">
      {/* Top Bar */}
      <div className={`${theme.dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-b px-6 py-4 flex items-center justify-between flex-shrink-0 shadow-lg`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${theme.dark ? 'text-white' : 'text-slate-900'}`}>
              {app.title}
            </h2>
            <p className={`text-sm ${theme.dark ? 'text-slate-400' : 'text-slate-500'}`}>
              {app.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleReload}
            variant="outline"
            size="sm"
            className={theme.dark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reload
          </Button>
          <Button
            onClick={handleOpenExternal}
            variant="outline"
            size="sm"
            className={theme.dark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : ''}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in New Tab
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className={theme.dark ? 'text-slate-300 hover:bg-slate-700' : ''}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 relative overflow-hidden bg-white">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 z-10">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-semibold text-slate-700">Loading {app.title}...</p>
              <p className="text-sm text-slate-500 mt-2">Sign in with your Google account when prompted</p>
            </div>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={app.url}
          className="w-full h-full border-none"
          title={app.title}
          allow="camera; microphone; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox allow-top-navigation allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
}