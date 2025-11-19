import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageSquare,
  Send,
  Star,
  Trash2,
  Plus,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';

export default function CommunicationModule({ user, theme }) {
  const queryClient = useQueryClient();
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messageForm, setMessageForm] = useState({
    recipient_email: '',
    subject: '',
    content: ''
  });
  const [replyContent, setReplyContent] = useState('');

  const { data: messages = [] } = useQuery({
    queryKey: ['professionalMessages', user.email],
    queryFn: async () => {
      const sent = await base44.entities.ProfessionalMessage.filter({ sender_email: user.email }, '-created_date');
      const received = await base44.entities.ProfessionalMessage.filter({ recipient_email: user.email }, '-created_date');
      return [...sent, ...received].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    initialData: []
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ProfessionalMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalMessages'] });
      setShowNewMessageDialog(false);
      setMessageForm({ recipient_email: '', subject: '', content: '' });
    }
  });

  const updateMessageMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProfessionalMessage.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionalMessages'] })
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id) => base44.entities.ProfessionalMessage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalMessages'] });
      setSelectedThread(null);
    }
  });

  const handleSend = () => {
    if (!messageForm.recipient_email || !messageForm.content.trim()) {
      alert('Recipient and message are required');
      return;
    }

    sendMessageMutation.mutate({
      sender_email: user.email,
      recipient_email: messageForm.recipient_email,
      subject: messageForm.subject,
      content: messageForm.content,
      thread_id: Date.now().toString(),
      read: false,
      starred: false
    });
  };

  const handleReply = () => {
    if (!replyContent.trim() || !selectedThread) return;

    sendMessageMutation.mutate({
      sender_email: user.email,
      recipient_email: selectedThread.sender_email === user.email ? selectedThread.recipient_email : selectedThread.sender_email,
      subject: `Re: ${selectedThread.subject}`,
      content: replyContent,
      thread_id: selectedThread.thread_id,
      read: false,
      starred: false
    });

    setReplyContent('');
  };

  const handleToggleStar = (message) => {
    updateMessageMutation.mutate({
      id: message.id,
      data: { starred: !message.starred }
    });
  };

  const handleMarkRead = (message) => {
    if (!message.read && message.recipient_email === user.email) {
      updateMessageMutation.mutate({
        id: message.id,
        data: { read: true }
      });
    }
  };

  // Group messages by thread
  const threads = messages.reduce((acc, msg) => {
    const threadId = msg.thread_id || msg.id;
    if (!acc[threadId]) {
      acc[threadId] = [];
    }
    acc[threadId].push(msg);
    return acc;
  }, {});

  const threadList = Object.values(threads).map(thread => {
    const latest = thread.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    return { threadId: latest.thread_id || latest.id, latest, messages: thread, count: thread.length };
  }).sort((a, b) => new Date(b.latest.created_date) - new Date(a.latest.created_date));

  const unreadCount = messages.filter(m => !m.read && m.recipient_email === user.email).length;

  const textColor = theme.dark ? 'text-white' : 'text-slate-900';
  const textSecondary = theme.dark ? 'text-slate-300' : 'text-slate-600';
  const cardBg = theme.dark ? 'bg-slate-800/50' : 'bg-white';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${textColor}`}>Communication Hub</h2>
          <p className={textSecondary}>Internal workspace messages</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Badge className="bg-red-600 text-white">
              {unreadCount} unread
            </Badge>
          )}
          <Button 
            onClick={() => setShowNewMessageDialog(true)}
            className={`bg-gradient-to-r ${theme.accent} text-white`}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Message
            </Button>
        </div>
      </div>

      {/* Message Threads */}
      <div className="space-y-3">
        {threadList.map(thread => {
          const isUnread = !thread.latest.read && thread.latest.recipient_email === user.email;
          const otherPerson = thread.latest.sender_email === user.email 
            ? thread.latest.recipient_email 
            : thread.latest.sender_email;

          return (
            <Card
              key={thread.threadId}
              className={`border-none shadow-lg ${cardBg} cursor-pointer hover:shadow-xl transition-all ${
                isUnread ? 'border-l-4 border-blue-600' : ''
              }`}
              onClick={() => {
                setSelectedThread(thread.latest);
                handleMarkRead(thread.latest);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>{otherPerson.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-semibold ${textColor} truncate`}>
                          {otherPerson}
                        </p>
                        {thread.count > 1 && (
                          <Badge variant="secondary" className="text-xs">
                            {thread.count}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm ${isUnread ? 'font-semibold' : ''} ${textColor} mb-1`}>
                        {thread.latest.subject || '(No subject)'}
                      </p>
                      <p className={`text-sm ${textSecondary} line-clamp-2`}>
                        {thread.latest.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className={`text-xs ${textSecondary}`}>
                      {format(new Date(thread.latest.created_date), 'MMM d')}
                    </p>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStar(thread.latest);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      <Star className={`w-4 h-4 ${thread.latest.starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {messages.length === 0 && (
        <Card className={`border-none shadow-lg ${cardBg}`}>
          <CardContent className="p-16 text-center">
            <MessageSquare className={`w-16 h-16 mx-auto mb-4 opacity-30 ${textSecondary}`} />
            <h3 className={`text-xl font-bold ${textColor} mb-2`}>No messages yet</h3>
            <p className={`${textSecondary} mb-6`}>Start a conversation with a colleague</p>
            <Button onClick={() => setShowNewMessageDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Send First Message
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Message Dialog */}
      <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">To *</label>
              <Input
                value={messageForm.recipient_email}
                onChange={(e) => setMessageForm({ ...messageForm, recipient_email: e.target.value })}
                placeholder="colleague@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Subject</label>
              <Input
                value={messageForm.subject}
                onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                placeholder="Message subject..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Message *</label>
              <Textarea
                value={messageForm.content}
                onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                placeholder="Write your message..."
                rows={6}
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={sendMessageMutation.isPending}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Thread Dialog */}
      <Dialog open={!!selectedThread} onOpenChange={() => setSelectedThread(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedThread && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle>{selectedThread.subject || '(No subject)'}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {threads[selectedThread.thread_id || selectedThread.id]?.map(msg => {
                  const isSender = msg.sender_email === user.email;
                  return (
                    <div key={msg.id} className={`flex ${isSender ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-xl ${
                        isSender 
                          ? 'bg-blue-600 text-white' 
                          : theme.dark ? 'bg-slate-700' : 'bg-slate-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-sm">
                            {isSender ? 'You' : msg.sender_email}
                          </p>
                          <p className={`text-xs ${isSender ? 'text-blue-100' : 'text-slate-500'}`}>
                            {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={3}
                  className="flex-1"
                />
                <Button onClick={handleReply} disabled={sendMessageMutation.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={() => deleteMessageMutation.mutate(selectedThread.id)}
                variant="outline"
                className="w-full text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Thread
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}