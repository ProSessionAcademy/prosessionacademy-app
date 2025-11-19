
import React, { useState, useEffect } from 'react';
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
  Calendar,
  Plus,
  Sparkles,
  CheckSquare,
  Trash2,
  Clock,
  Users,
  Loader2,
  Brain,
  Target,
  Mail,
  X,
  Video,
  Zap,
  Copy,
  PhoneOff,
  MessageSquare,
  ExternalLink,
  Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';

export default function MeetingsModule({ user, config, theme }) {
  const queryClient = useQueryClient();
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showInAppMeeting, setShowInAppMeeting] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [inMeeting, setInMeeting] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState('');
  const [meetingMessages, setMeetingMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    scheduled_date: '',
    duration_minutes: 60,
    participants: [],
    agenda: '',
    notes: ''
  });
  const [participantInput, setParticipantInput] = useState('');

  const { data: meetings = [] } = useQuery({
    queryKey: ['professionalMeetings', user.email],
    queryFn: () => base44.entities.ProfessionalMeeting.filter({ user_email: user.email }, '-scheduled_date'),
    initialData: []
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data) => {
      // Generate unique room ID for Jitsi
      const roomId = `prosession-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const meeting = await base44.entities.ProfessionalMeeting.create({
        ...data,
        user_email: user.email,
        status: 'scheduled',
        action_items: [],
        key_decisions: [],
        meeting_url: roomId
      });

      // DIRECT JITSI LINK - NO LOGIN REQUIRED!
      const directMeetingLink = `https://meet.jit.si/${roomId}`;
      
      // Send email invitations with DIRECT meeting link
      for (const participantEmail of data.participants) {
        try {
          await base44.integrations.Core.SendEmail({
            to: participantEmail,
            subject: `📅 Meeting Invitation: ${data.title}`,
            body: `Hello!

You're invited to join a video meeting:

📋 MEETING DETAILS:
━━━━━━━━━━━━━━━━━━━━
📌 Subject: ${data.title}
👤 Organizer: ${user.full_name || user.email}
📅 Date & Time: ${format(new Date(data.scheduled_date), 'EEEE d MMMM yyyy - HH:mm')}
⏱️ Duration: ${data.duration_minutes} minutes

${data.agenda ? `📋 AGENDA:\n${data.agenda}\n\n` : ''}

🎥 JOIN THE MEETING:
━━━━━━━━━━━━━━━━━━━━

👉 DIRECT LINK (Click to join immediately):
${directMeetingLink}

✅ NO registration or login required
✅ Works on any device (computer, phone, tablet)
✅ With video, audio, and screen sharing

💡 TIP: For best experience, use Google Chrome or Firefox

━━━━━━━━━━━━━━━━━━━━

See you there! 🎉

---
Meeting ID: ${meeting.id}
Room Code: ${roomId}

This invitation was sent via Pro-Session Platform`
          });
        } catch (error) {
          console.error('Failed to send invitation to', participantEmail, error);
        }
      }

      return meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalMeetings'] });
      setShowMeetingDialog(false);
      resetForm();
      alert('✅ Meeting scheduled and invitations sent!\n\n🔗 Participants received a DIRECT link - no login needed!');
    }
  });

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProfessionalMeeting.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalMeetings'] });
    }
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: (id) => base44.entities.ProfessionalMeeting.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalMeetings'] });
      setSelectedMeeting(null);
    }
  });

  const resetForm = () => {
    setMeetingForm({
      title: '',
      scheduled_date: '',
      duration_minutes: 60,
      participants: [],
      agenda: '',
      notes: ''
    });
    setParticipantInput('');
  };

  const handleAddParticipant = () => {
    const email = participantInput.trim();
    if (email && !meetingForm.participants.includes(email)) {
      setMeetingForm({
        ...meetingForm,
        participants: [...meetingForm.participants, email]
      });
      setParticipantInput('');
    }
  };

  const handleRemoveParticipant = (email) => {
    setMeetingForm({
      ...meetingForm,
      participants: meetingForm.participants.filter(p => p !== email)
    });
  };

  const handleSave = async () => {
    if (!meetingForm.title.trim()) {
      alert('Meeting title is required');
      return;
    }

    if (!meetingForm.scheduled_date) {
      alert('Please select a date and time');
      return;
    }

    if (meetingForm.participants.length === 0) {
      alert('⚠️ Add at least 1 participant!\n\nA direct meeting link will be sent via email.');
      return;
    }

    createMeetingMutation.mutate(meetingForm);
  };

  const handleStartInstantMeeting = () => {
    const roomId = 'prosession-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const instantMeeting = {
      id: 'instant-' + Date.now(),
      title: `Instant Meeting - ${format(new Date(), 'h:mm a')}`,
      scheduled_date: new Date().toISOString(),
      duration_minutes: 60,
      participants: [],
      agenda: 'Instant meeting',
      notes: '',
      meeting_url: roomId
    };
    
    setCurrentRoomId(roomId);
    setSelectedMeeting(instantMeeting);
    setShowInAppMeeting(true);
    setInMeeting(true);
    setMeetingNotes('');
    setMeetingMessages([
      { sender: 'System', message: `Meeting started`, time: new Date().toLocaleTimeString() }
    ]);
  };

  const handleStartMeeting = (meeting) => {
    const roomId = meeting.meeting_url || ('prosession-' + meeting.id + '-' + Date.now());
    setCurrentRoomId(roomId);
    setSelectedMeeting(meeting);
    setShowInAppMeeting(true);
    setInMeeting(true);
    setMeetingNotes(meeting.notes || '');
    setMeetingMessages([
      { sender: 'System', message: `Meeting "${meeting.title}" started`, time: new Date().toLocaleTimeString() }
    ]);
  };

  const handleEndMeeting = async () => {
    if (selectedMeeting && meetingNotes.trim() && !selectedMeeting.id.toString().startsWith('instant-')) {
      await updateMeetingMutation.mutateAsync({
        id: selectedMeeting.id,
        data: { notes: meetingNotes, status: 'completed' }
      });
    }
    setInMeeting(false);
    setShowInAppMeeting(false);
    setMeetingNotes('');
    setMeetingMessages([]);
    setSelectedMeeting(null);
    setCurrentRoomId(null);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMeetingMessages([
        ...meetingMessages,
        { sender: user.full_name || user.email, message: newMessage, time: new Date().toLocaleTimeString() }
      ]);
      setNewMessage('');
    }
  };

  const handleCopyMeetingLink = (meeting) => {
    const directLink = `https://meet.jit.si/${meeting.meeting_url}`;
    const message = `📅 Join Meeting: ${meeting.title}

🔗 DIRECT LINK (click to join):
${directLink}

📅 ${format(new Date(meeting.scheduled_date), 'EEEE d MMMM yyyy - HH:mm')}
⏱️ ${meeting.duration_minutes} min

✅ No login required
✅ Works on any device`;

    navigator.clipboard.writeText(message);
    alert('✅ Direct meeting link copied!\n\nShare via WhatsApp, Teams, Email, etc.');
  };

  const handleShareViaEmail = async (meeting) => {
    const email = prompt('📧 Enter email address to share meeting link:');
    if (!email) return;

    try {
      const directMeetingLink = `https://meet.jit.si/${meeting.meeting_url}`;

      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `📅 Meeting Invitation: ${meeting.title}`,
        body: `Hello!

You're invited to join a video meeting:

📋 MEETING DETAILS:
━━━━━━━━━━━━━━━━━━━━
📌 Subject: ${meeting.title}
👤 Organizer: ${user.full_name || user.email}
📅 Date & Time: ${format(new Date(meeting.scheduled_date), 'EEEE d MMMM yyyy - HH:mm')}
⏱️ Duration: ${meeting.duration_minutes} minutes

${meeting.agenda ? `📋 AGENDA:\n${meeting.agenda}\n\n` : ''}

🎥 JOIN THE MEETING:
━━━━━━━━━━━━━━━━━━━━

👉 DIRECT LINK (Click to join immediately):
${directMeetingLink}

✅ NO registration or login required
✅ Works on any device (computer, phone, tablet)
✅ With video, audio, and screen sharing

See you there! 🎉`
      });

      alert('✅ Invitation sent to ' + email);
    } catch (error) {
      alert('❌ Failed to send: ' + error.message);
    }
  };

  const handleAnalyzeNotes = async (meeting) => {
    if (!meeting.notes || !meeting.notes.trim()) {
      alert('No meeting notes to analyze');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze these meeting notes and extract:

MEETING: ${meeting.title}
NOTES:
${meeting.notes}

Provide:
1. A 2-3 sentence summary
2. Action items (with suggested owners if mentioned)
3. Key decisions made

Format clearly.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            action_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task: { type: "string" },
                  assigned_to: { type: "string" },
                  due_date: { type: "string" }
                }
              }
            },
            key_decisions: { type: "array", items: { type: "string" } }
          }
        }
      });

      await updateMeetingMutation.mutateAsync({
        id: meeting.id,
        data: {
          ai_summary: result.summary,
          action_items: result.action_items,
          key_decisions: result.key_decisions,
          status: 'completed'
        }
      });

      alert('✅ Meeting analyzed! Check action items.');
    } catch (error) {
      alert('Analysis failed: ' + error.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateTasksFromActions = async (meeting) => {
    if (!meeting.action_items || meeting.action_items.length === 0) {
      alert('No action items to create tasks from');
      return;
    }

    try {
      for (const action of meeting.action_items) {
        await base44.entities.ProfessionalTask.create({
          user_email: user.email,
          title: action.task,
          description: `From meeting: ${meeting.title}`,
          priority: 'medium',
          status: 'todo',
          due_date: action.due_date || '',
          category: 'Meeting Actions',
          tags: ['meeting']
        });
      }

      queryClient.invalidateQueries({ queryKey: ['professionalTasks'] });
      alert(`✅ ${meeting.action_items.length} tasks created!`);
    } catch (error) {
      alert('Error creating tasks: ' + error.message);
    }
  };

  const upcomingMeetings = meetings.filter(m =>
    m.status === 'scheduled' && new Date(m.scheduled_date) > new Date()
  );
  const pastMeetings = meetings.filter(m =>
    m.status === 'completed' || (m.status === 'scheduled' && new Date(m.scheduled_date) <= new Date())
  );

  const textColor = theme.dark ? 'text-white' : 'text-slate-900';
  const textSecondary = theme.dark ? 'text-slate-300' : 'text-slate-600';
  const cardBg = theme.dark ? 'bg-slate-800/50' : 'bg-white';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${theme.dark ? 'text-white' : 'text-slate-900'} mb-2`}>
            Meetings & Video Calls
          </h2>
          <div className={`flex items-center gap-2 ${theme.dark ? 'text-green-400' : 'text-green-600'} text-sm font-semibold`}>
            <Video className="w-4 h-4" />
            <span>✅ DIRECT video calls - send link, anyone joins - no login!</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleStartInstantMeeting}
            data-instant-meeting
            className={`bg-gradient-to-r ${theme.accent} text-white shadow-lg hover:scale-105 transition-transform`}
            size="lg"
          >
            <Video className="w-5 h-5 mr-2" />
            <div className="text-left">
              <div className="font-bold">START NOW</div>
              <div className="text-xs opacity-90">Instant call</div>
            </div>
          </Button>

          <Button
            onClick={() => setShowMeetingDialog(true)}
            variant="outline"
            size="lg"
            className={theme.dark ? 'border-slate-600 hover:bg-slate-700' : ''}
          >
            <Calendar className="w-5 h-5 mr-2" />
            Plan Meeting
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className={`border-2 ${theme.dark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-300'}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${theme.dark ? 'bg-green-800' : 'bg-green-600'} flex items-center justify-center flex-shrink-0`}>
              <ExternalLink className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold text-lg mb-2 ${theme.dark ? 'text-white' : 'text-slate-900'}`}>
                🎥 REAL video meetings with DIRECT links!
              </h3>
              <div className={`space-y-1 text-sm ${theme.dark ? 'text-green-200' : 'text-green-900'}`}>
                <p>✅ <strong>Instant access</strong> - participants click link and join</p>
                <p>✅ <strong>No account needed</strong> - works for ANYONE</p>
                <p>✅ <strong>Full features</strong> - webcam, mic, screen share, chat</p>
                <p>✅ <strong>Share anywhere</strong> - email, WhatsApp, Teams, etc.</p>
                <p className="text-yellow-300 font-bold mt-2">🔗 Each meeting gets a unique Jitsi link sent via email!</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div>
          <h3 className={`text-xl font-bold ${textColor} mb-4`}>Upcoming</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {upcomingMeetings.map(meeting => (
              <Card key={meeting.id} className={`border-none shadow-lg ${cardBg} hover:shadow-xl transition-shadow`}>
                <CardContent className="p-6">
                  <h4 className={`font-bold ${textColor} text-lg mb-3`}>{meeting.title}</h4>
                  
                  <div className="space-y-2 mb-4">
                    <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                      <Calendar className="w-4 h-4" />
                      {format(new Date(meeting.scheduled_date), 'MMM d, yyyy h:mm a')}
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                      <Clock className="w-4 h-4" />
                      {meeting.duration_minutes} minutes
                    </div>
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div className={`flex items-center gap-2 text-sm ${textSecondary}`}>
                        <Users className="w-3 h-3" />
                        {meeting.participants.length} participants
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleStartMeeting(meeting)} size="sm" className="flex-1 bg-green-600 hover:bg-green-700">
                      <Video className="w-4 h-4 mr-1" />
                      Join
                    </Button>
                    <Button onClick={() => handleCopyMeetingLink(meeting)} size="sm" variant="outline" title="Copy direct link">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => handleShareViaEmail(meeting)} size="sm" variant="outline" title="Share via email">
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => setSelectedMeeting(meeting)} size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Meetings */}
      <div>
        <h3 className={`text-xl font-bold ${textColor} mb-4`}>Past Meetings</h3>
        <div className="space-y-3">
          {pastMeetings.slice(0, 10).map(meeting => (
            <Card key={meeting.id} className={`border-none shadow-lg ${cardBg}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className={`font-semibold ${textColor} mb-1`}>{meeting.title}</h4>
                    <p className={`text-sm ${textSecondary}`}>
                      {format(new Date(meeting.scheduled_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {meeting.ai_summary && (
                      <Badge className="bg-green-100 text-green-700">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Analyzed
                      </Badge>
                    )}
                    <Button onClick={() => setSelectedMeeting(meeting)} size="sm" variant="outline">
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {meetings.length === 0 && (
        <Card className={`border-none shadow-lg ${cardBg}`}>
          <CardContent className="p-16 text-center">
            <Calendar className={`w-16 h-16 mx-auto mb-4 opacity-30 ${textSecondary}`} />
            <h3 className={`text-xl font-bold ${textColor} mb-2`}>No meetings yet</h3>
            <p className={`${textSecondary} mb-6`}>Start an instant video meeting</p>
            <Button onClick={handleStartInstantMeeting} className="bg-green-600 hover:bg-green-700" size="lg">
              <Zap className="w-5 h-5 mr-2" />
              Meet Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* In-App Meeting Room */}
      <Dialog open={showInAppMeeting} onOpenChange={(open) => {
        if (!open) {
          handleEndMeeting();
        }
      }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] h-[90vh] p-0">
          {selectedMeeting && currentRoomId && (
            <div className="h-full flex flex-col">
              <DialogHeader className="p-4 border-b bg-slate-900 text-white">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl">{selectedMeeting.title}</DialogTitle>
                  <div className="flex items-center gap-2">
                    {inMeeting && <Badge className="bg-red-600 text-white animate-pulse">● LIVE</Badge>}
                    <Button onClick={handleEndMeeting} size="sm" variant="ghost" className="text-white hover:bg-red-600">
                      <PhoneOff className="w-4 h-4 mr-1" />
                      End
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 grid grid-cols-3 gap-4 p-4 overflow-hidden">
                {/* Video Area */}
                <div className="col-span-2 bg-slate-900 rounded-xl overflow-hidden relative">
                  <iframe
                    src={`https://meet.jit.si/${currentRoomId}`}
                    allow="camera; microphone; fullscreen; display-capture; autoplay"
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                  />
                </div>

                {/* Sidebar */}
                <div className="flex flex-col h-full gap-4">
                  <Card className="flex-1 overflow-hidden flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Chat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
                      {meetingMessages.map((msg, idx) => (
                        <div key={idx} className="p-2 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-bold text-slate-900">{msg.sender}</p>
                            <p className="text-xs text-slate-500">{msg.time}</p>
                          </div>
                          <p className="text-sm text-slate-700">{msg.message}</p>
                        </div>
                      ))}
                    </CardContent>
                    <div className="p-3 border-t flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="text-sm"
                      />
                      <Button onClick={handleSendMessage} size="sm">
                        Send
                      </Button>
                    </div>
                  </Card>

                  <Card className="flex-1 overflow-hidden flex flex-col">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 p-3">
                      <Textarea
                        value={meetingNotes}
                        onChange={(e) => setMeetingNotes(e.target.value)}
                        placeholder="Take notes..."
                        className="h-full resize-none text-sm"
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan New Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Meeting Title *</label>
              <Input
                value={meetingForm.title}
                onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                placeholder="e.g. Team Sync, Client Review..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={meetingForm.scheduled_date}
                  onChange={(e) => setMeetingForm({ ...meetingForm, scheduled_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Duration (minutes)</label>
                <Input
                  type="number"
                  value={meetingForm.duration_minutes}
                  onChange={(e) => setMeetingForm({ ...meetingForm, duration_minutes: Number(e.target.value) })}
                  min="15"
                  step="15"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Participants *</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={participantInput}
                  onChange={(e) => setParticipantInput(e.target.value)}
                  placeholder="Enter email address..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddParticipant();
                    }
                  }}
                />
                <Button onClick={handleAddParticipant} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {meetingForm.participants.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-lg">
                  {meetingForm.participants.map((email, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {email}
                      <button
                        onClick={() => handleRemoveParticipant(email)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2">
                ✉️ Participants will receive a direct meeting link via email (no login required!)
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Agenda</label>
              <Textarea
                value={meetingForm.agenda}
                onChange={(e) => setMeetingForm({ ...meetingForm, agenda: e.target.value })}
                placeholder="• Topic 1&#10;• Topic 2&#10;• Topic 3..."
                rows={4}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={createMeetingMutation.isPending}
              className="w-full"
            >
              {createMeetingMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4 mr-2" />
              )}
              Schedule & Send Invitations
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Detail Dialog */}
      <Dialog open={!!selectedMeeting && !showInAppMeeting} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedMeeting && (
            <div className="space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedMeeting.title}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Scheduled</p>
                  <p className="font-medium">{format(new Date(selectedMeeting.scheduled_date), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Duration</p>
                  <p className="font-medium">{selectedMeeting.duration_minutes} minutes</p>
                </div>
              </div>

              {selectedMeeting.status === 'scheduled' && (
                <>
                  <Button onClick={() => handleStartMeeting(selectedMeeting)} className="w-full bg-green-600 hover:bg-green-700" size="lg">
                    <Video className="w-5 h-5 mr-2" />
                    Start Meeting
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button onClick={() => handleCopyMeetingLink(selectedMeeting)} variant="outline" className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button onClick={() => handleShareViaEmail(selectedMeeting)} variant="outline" className="flex-1">
                      <Mail className="w-4 h-4 mr-2" />
                      Share via Email
                    </Button>
                  </div>
                </>
              )}

              {selectedMeeting.participants && selectedMeeting.participants.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Participants ({selectedMeeting.participants.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMeeting.participants.map((p, idx) => (
                      <Badge key={idx} variant="secondary">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedMeeting.agenda && (
                <div>
                  <p className="text-sm font-semibold mb-2">Agenda</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedMeeting.agenda}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold">Meeting Notes</label>
                  {selectedMeeting.notes && !selectedMeeting.ai_summary && (
                    <Button
                      onClick={() => handleAnalyzeNotes(selectedMeeting)}
                      size="sm"
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Brain className="w-3 h-3 mr-1" />
                      )}
                      AI Analyze
                    </Button>
                  )}
                </div>
                <Textarea
                  value={selectedMeeting.notes || ''}
                  onChange={(e) => {
                    const updatedMeeting = { ...selectedMeeting, notes: e.target.value };
                    setSelectedMeeting(updatedMeeting);
                    updateMeetingMutation.mutate({ id: selectedMeeting.id, data: { notes: e.target.value } });
                  }}
                  placeholder="Add notes..."
                  rows={6}
                />
              </div>

              {selectedMeeting.ai_summary && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <h4 className="font-bold text-blue-900">AI Summary</h4>
                    </div>
                    <p className="text-sm text-slate-700">{selectedMeeting.ai_summary}</p>
                  </CardContent>
                </Card>
              )}

              {selectedMeeting.action_items && selectedMeeting.action_items.length > 0 && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-green-600" />
                        <h4 className="font-bold text-green-900">Action Items</h4>
                      </div>
                      <Button
                        onClick={() => handleCreateTasksFromActions(selectedMeeting)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Target className="w-3 h-3 mr-1" />
                        Create Tasks
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {selectedMeeting.action_items.map((action, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <CheckSquare className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-slate-900 font-medium">{action.task}</p>
                            {action.assigned_to && (
                              <p className="text-xs text-slate-600">Assigned: ${action.assigned_to}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={() => deleteMeetingMutation.mutate(selectedMeeting.id)}
                variant="outline"
                className="w-full text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Meeting
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
