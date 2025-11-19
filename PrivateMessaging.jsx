import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare, Send, Mail, User, GraduationCap, Clock, Upload, Loader2 } from "lucide-react";

export default function PrivateMessaging({ group, currentUser }) {
  const queryClient = useQueryClient();
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [messageForm, setMessageForm] = useState({
    subject: "",
    message: "",
    attachments: []
  });

  const teachers = (group?.members || []).filter(m => m.role === "teacher");

  const { data: myMessages = [], refetch } = useQuery({
    queryKey: ['privateMessages', currentUser?.email, group?.id],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const sent = await base44.entities.PrivateMessage.filter({
        sender_email: currentUser.email,
        group_id: group.id
      });
      const received = await base44.entities.PrivateMessage.filter({
        recipient_email: currentUser.email,
        group_id: group.id
      });
      return [...sent, ...received].sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    },
    initialData: [],
    enabled: !!currentUser?.email && !!group?.id,
    refetchInterval: 3000
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.PrivateMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privateMessages'] });
      refetch();
      setShowComposeDialog(false);
      setSelectedTeacher(null);
      setMessageForm({ subject: "", message: "", attachments: [] });
      alert("✅ Message sent!");
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.PrivateMessage.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privateMessages'] });
      refetch();
    },
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setMessageForm({
        ...messageForm,
        attachments: [...messageForm.attachments, response.file_url]
      });
      alert('✅ File uploaded!');
    } catch (error) {
      alert('❌ Upload failed');
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleSendMessage = () => {
    if (!messageForm.message || !selectedTeacher) {
      alert("Please select a teacher and write a message");
      return;
    }

    const threadId = selectedThread?.thread_id || `thread_${Date.now()}`;

    sendMessageMutation.mutate({
      sender_email: currentUser.email,
      sender_name: currentUser.full_name || "User",
      recipient_email: selectedTeacher.user_email,
      recipient_name: selectedTeacher.full_name,
      group_id: group.id,
      subject: messageForm.subject || "No Subject",
      message: messageForm.message,
      attachments: messageForm.attachments,
      thread_id: threadId,
      read: false
    });
  };

  const getThreads = () => {
    const threads = {};
    myMessages.forEach(msg => {
      const threadId = msg.thread_id || msg.id;
      if (!threads[threadId]) {
        threads[threadId] = [];
      }
      threads[threadId].push(msg);
    });
    return Object.values(threads).map(thread => ({
      thread_id: thread[0].thread_id || thread[0].id,
      messages: thread.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)),
      lastMessage: thread[thread.length - 1],
      unread: thread.some(m => !m.read && m.recipient_email === currentUser.email)
    }));
  };

  const threads = getThreads();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-slate-900">Private Messages</h3>
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message a Teacher
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Send Private Message</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Teacher</Label>
                <div className="grid gap-2 mt-2">
                  {teachers.map((teacher) => (
                    <button
                      key={teacher.user_email}
                      onClick={() => setSelectedTeacher(teacher)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTeacher?.user_email === teacher.user_email
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                          <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{teacher.full_name}</p>
                          <p className="text-sm text-slate-500">{teacher.title} - {teacher.specialization}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {teachers.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">No teachers available in this group yet.</p>
                )}
              </div>

              {selectedTeacher && (
                <>
                  <div>
                    <Label>Subject (Optional)</Label>
                    <Input
                      value={messageForm.subject}
                      onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                      placeholder="e.g., Question about assignment"
                    />
                  </div>

                  <div>
                    <Label>Message</Label>
                    <Textarea
                      value={messageForm.message}
                      onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                      placeholder="Type your message here..."
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label>Attachments</Label>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="message-file-upload"
                        disabled={uploadingFile}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('message-file-upload').click()}
                        disabled={uploadingFile}
                      >
                        {uploadingFile ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload File
                      </Button>
                    </div>
                    {messageForm.attachments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {messageForm.attachments.map((url, idx) => (
                          <p key={idx} className="text-sm text-blue-600">📎 Attachment {idx + 1}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleSendMessage}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                    disabled={!messageForm.message || sendMessageMutation.isPending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-2">
          <h4 className="font-semibold text-slate-700 mb-3">Conversations</h4>
          {threads.length > 0 ? (
            threads.map((thread) => {
              const otherPerson = thread.lastMessage.sender_email === currentUser.email
                ? { name: thread.lastMessage.recipient_name, email: thread.lastMessage.recipient_email }
                : { name: thread.lastMessage.sender_name, email: thread.lastMessage.sender_email };
              
              return (
                <button
                  key={thread.thread_id}
                  onClick={() => {
                    setSelectedThread(thread);
                    thread.messages.forEach(msg => {
                      if (!msg.read && msg.recipient_email === currentUser.email) {
                        markAsReadMutation.mutate(msg.id);
                      }
                    });
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedThread?.thread_id === thread.thread_id
                      ? 'bg-blue-100 border-2 border-blue-600'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{otherPerson.name}</p>
                    {thread.unread && (
                      <Badge className="bg-red-500 text-white text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{thread.lastMessage.message}</p>
                </button>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No messages yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2">
          {selectedThread ? (
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedThread.lastMessage.subject}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
                {selectedThread.messages.map((msg) => {
                  const isMe = msg.sender_email === currentUser.email;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isMe ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'} rounded-2xl p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-xs font-semibold">{msg.sender_name}</p>
                          <p className="text-xs opacity-70">{new Date(msg.created_date).toLocaleString()}</p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" className="block text-xs underline">
                                📎 Attachment {idx + 1}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Select a conversation to view messages</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}