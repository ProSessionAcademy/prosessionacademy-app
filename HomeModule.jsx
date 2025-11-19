
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  CheckCircle,
  Clock,
  FileText,
  TrendingUp,
  Calendar,
  Target,
  Zap,
  Users,
  Briefcase,
  Mail,
  BarChart2,
  ExternalLink,
  Video,
  Presentation,
  Sparkles
} from
'lucide-react';
import { format } from 'date-fns';

export default function HomeModule({ user, config, theme, onStartInstantMeeting, onOpenOfficeApp }) {
  const navigate = useNavigate();

  const { data: tasks = [] } = useQuery({
    queryKey: ['professionalTasks', user.email],
    queryFn: () => base44.entities.ProfessionalTask.filter({ user_email: user.email }, '-created_date'),
    initialData: []
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['professionalDocuments', user.email],
    queryFn: () => base44.entities.ProfessionalDocument.filter({ user_email: user.email }, '-created_date'),
    initialData: []
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['professionalKPIs', user.email],
    queryFn: () => base44.entities.ProfessionalKPI.filter({ user_email: user.email, pinned_to_dashboard: true }),
    initialData: []
  });

  const { data: meetings = [] } = useQuery({
    queryKey: ['professionalMeetings', user.email],
    queryFn: () => base44.entities.ProfessionalMeeting.filter({ user_email: user.email }, 'scheduled_date'),
    initialData: []
  });

  const { data: todayMetrics } = useQuery({
    queryKey: ['todayMetrics', user.email],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const metrics = await base44.entities.WorkspaceMetric.filter({
        user_email: user.email,
        metric_date: today
      });
      return metrics[0] || { tasks_completed: 0, focus_minutes: 0 };
    }
  });

  const handleMeetNow = () => {
    // Navigate to meetings module and trigger instant meeting
    if (onStartInstantMeeting) {
      onStartInstantMeeting();
    } else {
      // Fallback - navigate to meeting rooms
      navigate(createPageUrl('MeetingRooms'));
    }
  };

  const todoTasks = tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
  const completedToday = tasks.filter((t) =>
  t.status === 'completed' &&
  t.completed_date &&
  new Date(t.completed_date).toDateString() === new Date().toDateString()
  );

  const upcomingMeetings = meetings.filter((m) =>
  m.status === 'scheduled' &&
  new Date(m.scheduled_date) > new Date()
  ).slice(0, 3);

  const textColor = theme.dark ? 'text-white' : 'text-slate-900';
  const textSecondary = theme.dark ? 'text-slate-300' : 'text-slate-600';
  const cardBg = theme.dark ? 'bg-slate-800/50' : 'bg-white';

  const getGreeting = () => {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const name = user.full_name?.split(' ')[0] || 'there';

    switch (config.ai_personality) {
      case 'energetic_motivator':
        return `Good ${timeOfDay}, ${name}! Let's crush some goals today! 💪`;
      case 'data_analyst':
        return `Good ${timeOfDay}, ${name}. You have ${todoTasks.length} tasks pending. Ready to optimize?`;
      case 'friendly_coworker':
        return `Hey ${name}! Hope you're having a great ${timeOfDay}! 😊`;
      default:
        return `Good ${timeOfDay}, ${name}. Here's your workspace overview.`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting Card */}
      <Card className={`border-none shadow-2xl ${cardBg}`}>
        <CardContent className="p-8">
          <h1 className={`text-3xl font-bold ${textColor} mb-2`}>
            {getGreeting()}
          </h1>
          <p className={textSecondary}>
            {config.profession} • {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </CardContent>
      </Card>

      {/* Quick Access - UPDATED WITH GOOGLE + MICROSOFT */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <button onClick={() => onOpenOfficeApp && onOpenOfficeApp({ appKey: 'google_docs', embedded: true })} className="block w-full">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:scale-105 transition-transform cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center min-h-[120px] justify-center">
              <FileText className="w-8 h-8 mb-2 flex-shrink-0" />
              <div className="text-base font-bold mb-0.5 leading-tight">Docs</div>
              <p className="text-xs opacity-90">Google</p>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => onOpenOfficeApp && onOpenOfficeApp({ appKey: 'google_sheets', embedded: true })} className="block w-full">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white hover:scale-105 transition-transform cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center min-h-[120px] justify-center">
              <BarChart2 className="w-8 h-8 mb-2 flex-shrink-0" />
              <div className="text-base font-bold mb-0.5 leading-tight">Sheets</div>
              <p className="text-xs opacity-90">Google</p>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => onOpenOfficeApp && onOpenOfficeApp({ appKey: 'google_slides', embedded: true })} className="block w-full">
          <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-500 to-orange-600 text-white hover:scale-105 transition-transform cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center min-h-[120px] justify-center">
              <Presentation className="w-8 h-8 mb-2 flex-shrink-0" />
              <div className="text-base font-bold mb-0.5 leading-tight">Slides</div>
              <p className="text-xs opacity-90">Google</p>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => onOpenOfficeApp && onOpenOfficeApp({ externalUrl: 'https://outlook.office.com' })} className="block w-full">
          <Card className="border-none shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white hover:scale-105 transition-transform cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center min-h-[120px] justify-center relative">
              <Mail className="w-8 h-8 mb-2 flex-shrink-0" />
              <div className="text-base font-bold mb-0.5 leading-tight">Outlook</div>
              <p className="text-xs opacity-90">Email</p>
              <ExternalLink className="w-3 h-3 absolute top-2 right-2 opacity-60" />
            </CardContent>
          </Card>
        </button>

        <button onClick={handleMeetNow} className="w-full h-full">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-600 to-emerald-600 text-white hover:scale-105 transition-transform cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center min-h-[120px] justify-center">
              <Video className="w-8 h-8 mb-2 flex-shrink-0" />
              <div className="text-base font-bold mb-0.5 leading-tight">Meet</div>
              <p className="text-xs opacity-90">Instant</p>
            </CardContent>
          </Card>
        </button>

        <Link to={createPageUrl('CareerLink')} className="block">
          <Card className="border-none shadow-lg bg-gradient-to-br from-pink-600 to-purple-600 text-white hover:scale-105 transition-transform cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center min-h-[120px] justify-center">
              <Users className="w-8 h-8 mb-2 flex-shrink-0" />
              <div className="text-base font-bold mb-0.5 leading-tight">Career</div>
              <p className="text-xs opacity-90">Network</p>
            </CardContent>
          </Card>
        </Link>

        <Link to={createPageUrl('PowerPointGenerator')} className="block">
          <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white hover:scale-105 transition-transform cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center min-h-[120px] justify-center">
              <Presentation className="w-8 h-8 mb-2 flex-shrink-0" />
              <div className="text-sm font-bold mb-0.5 leading-tight">Training</div>
              <p className="text-xs opacity-90">& Reports</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* PROMINENT Training & Report Generator Card */}
      <Card className="border-none shadow-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <CardContent className="p-8 relative z-10">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xl">
              <Presentation className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-white/30 text-white border-white/50 px-3 py-1">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Powered
                </Badge>
                <Badge className="bg-white/30 text-white border-white/50 px-3 py-1">
                  ⚡ Instant
                </Badge>
              </div>
              <h3 className="text-2xl font-bold mb-2">Training & Report Generator</h3>
              <p className="text-white/90 mb-4 leading-relaxed">
                Create professional training materials, presentations, and business reports in seconds with AI.
                Includes real photos, interactive charts, and detailed content - perfect for meetings, training sessions, and professional documentation.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-green-500 text-white">✓ Real Stock Photos</Badge>
                <Badge className="bg-blue-500 text-white">✓ Data Charts</Badge>
                <Badge className="bg-purple-500 text-white">✓ Professional Design</Badge>
              </div>
              <Link to={createPageUrl('PowerPointGenerator')}>
                <Button size="lg" className="bg-white text-indigo-700 hover:bg-white/90 font-bold shadow-xl">
                  <Presentation className="w-5 h-5 mr-2" />
                  Generate Now
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats - REDESIGNED */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`border-none shadow-lg ${theme.dark ? 'bg-blue-900/30' : 'bg-gradient-to-br from-blue-500 to-blue-600'} text-white`}>
          <CardContent className="px-2 py-6 flex items-center gap-4">
            <CheckCircle className="w-10 h-10 flex-shrink-0 opacity-80" />
            <div>
              <div className="text-3xl font-bold">{completedToday.length}</div>
              <p className="text-sm opacity-90">Completed<br />Today</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-lg ${theme.dark ? 'bg-purple-900/30' : 'bg-gradient-to-br from-purple-500 to-purple-600'} text-white`}>
          <CardContent className="p-6 flex items-center gap-4">
            <Target className="w-10 h-10 flex-shrink-0 opacity-80" />
            <div>
              <div className="text-3xl font-bold">{todoTasks.length}</div>
              <p className="text-sm opacity-90">Active<br />Tasks</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-lg ${theme.dark ? 'bg-green-900/30' : 'bg-gradient-to-br from-green-500 to-green-600'} text-white`}>
          <CardContent className="px-1 py-8 flex items-center gap-4">
            <FileText className="w-10 h-10 flex-shrink-0 opacity-80" />
            <div>
              <div className="text-3xl font-bold">{documents.length}</div>
              <p className="text-sm opacity-90">Documents</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-lg ${theme.dark ? 'bg-orange-900/30' : 'bg-gradient-to-br from-orange-500 to-orange-600'} text-white`}>
          <CardContent className="p-6 flex items-center gap-4">
            <Clock className="w-10 h-10 flex-shrink-0 opacity-80" />
            <div>
              <div className="text-3xl font-bold">{todayMetrics?.focus_minutes || 0}m</div>
              <p className="text-sm opacity-90">Focus<br />Time</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <Card className={`border-none shadow-lg ${cardBg}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${textColor}`}>
              <Target className="w-5 h-5" />
              Today's Priority Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todoTasks.slice(0, 5).map((task) =>
            <div key={task.id} className={`p-3 rounded-lg ${theme.dark ? 'bg-slate-700/50' : 'bg-slate-50'} border ${theme.dark ? 'border-slate-600' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className={`font-semibold ${textColor} text-sm`}>{task.title}</h4>
                    {task.due_date &&
                  <p className={`text-xs ${textSecondary} mt-1`}>
                        Due: {format(new Date(task.due_date), 'MMM d')}
                      </p>
                  }
                  </div>
                  <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
              </div>
            )}
            {todoTasks.length === 0 &&
            <p className={`text-center py-8 ${textSecondary}`}>
                No tasks for today. Great work! 🎉
              </p>
            }
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card className={`border-none shadow-lg ${cardBg}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${textColor}`}>
              <Calendar className="w-5 h-5" />
              Upcoming Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingMeetings.map((meeting) =>
            <div key={meeting.id} className={`p-3 rounded-lg ${theme.dark ? 'bg-slate-700/50' : 'bg-slate-50'} border ${theme.dark ? 'border-slate-600' : 'border-slate-200'}`}>
                <h4 className={`font-semibold ${textColor} text-sm mb-1`}>{meeting.title}</h4>
                <p className={`text-xs ${textSecondary}`}>
                  {format(new Date(meeting.scheduled_date), 'MMM d, h:mm a')} • {meeting.duration_minutes}min
                </p>
              </div>
            )}
            {upcomingMeetings.length === 0 &&
            <p className={`text-center py-8 ${textSecondary}`}>
                No upcoming meetings
              </p>
            }
          </CardContent>
        </Card>
      </div>

      {/* Pinned KPIs */}
      {kpis.length > 0 &&
      <Card className={`border-none shadow-lg ${cardBg}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${textColor}`}>
              <TrendingUp className="w-5 h-5" />
              Key Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {kpis.slice(0, 6).map((kpi) => {
              const progress = kpi.target_value ? kpi.current_value / kpi.target_value * 100 : 0;

              return (
                <div key={kpi.id} className={`p-4 rounded-lg ${theme.dark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                    <h4 className={`font-semibold ${textColor} text-sm mb-2`}>{kpi.title}</h4>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-2xl font-bold text-blue-600">
                        {kpi.current_value}{kpi.unit}
                      </span>
                      {kpi.target_value &&
                    <span className={`text-xs ${textSecondary}`}>
                          / {kpi.target_value}{kpi.unit}
                        </span>
                    }
                    </div>
                    {kpi.target_value &&
                  <Progress value={Math.min(progress, 100)} className="h-2" />
                  }
                  </div>);

            })}
            </div>
          </CardContent>
        </Card>
      }

      {/* AI Insights */}
      <Card className={`border-none shadow-lg ${theme.dark ? 'bg-gradient-to-br from-blue-900/30 to-purple-900/30' : 'bg-gradient-to-br from-blue-50 to-purple-50'} border-2 ${theme.dark ? 'border-blue-800' : 'border-blue-200'}`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 ${theme.dark ? 'bg-blue-800' : 'bg-blue-600'} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className={`font-bold ${textColor} text-lg mb-2`}>AI Insight</h3>
              <p className={textSecondary}>
                {config.ai_personality === 'energetic_motivator' &&
                `You're on fire! ${completedToday.length} tasks done today. Keep that momentum going! 🚀`}
                {config.ai_personality === 'data_analyst' &&
                `Task completion rate: ${(completedToday.length / (tasks.length || 1) * 100).toFixed(1)}%. ${todayMetrics?.focus_minutes || 0} minutes of focused work recorded.`}
                {config.ai_personality === 'friendly_coworker' &&
                `Great progress today! You've completed ${completedToday.length} tasks. Remember to take breaks! ☕`}
                {config.ai_personality === 'calm_professional' &&
                `Today's focus: ${todoTasks.slice(0, 2).map((t) => t.title).join(', ')}. Prioritize based on urgency.`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
