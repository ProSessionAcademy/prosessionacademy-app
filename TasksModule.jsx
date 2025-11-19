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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle,
  Circle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Calendar,
  RotateCcw,
  Save,
  Sparkles,
  Loader2,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function TasksModule({ user, theme }) {
  const queryClient = useQueryClient();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [aiPlanning, setAiPlanning] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    due_date: '',
    category: '',
    estimated_hours: null,
    tags: []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['professionalTasks', user.email],
    queryFn: () => base44.entities.ProfessionalTask.filter({ user_email: user.email }, '-created_date'),
    initialData: []
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.ProfessionalTask.create({ ...data, user_email: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalTasks'] });
      setShowTaskDialog(false);
      resetForm();
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProfessionalTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalTasks'] });
      setShowTaskDialog(false);
      resetForm();
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.ProfessionalTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['professionalTasks'] })
  });

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      due_date: '',
      category: '',
      estimated_hours: null,
      tags: []
    });
    setEditingTask(null);
  };

  const handleSave = () => {
    if (!taskForm.title.trim()) {
      alert('Task title is required');
      return;
    }

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: taskForm });
    } else {
      createTaskMutation.mutate(taskForm);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      due_date: task.due_date || '',
      category: task.category || '',
      estimated_hours: task.estimated_hours || null,
      tags: task.tags || []
    });
    setShowTaskDialog(true);
  };

  const handleToggleStatus = (task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    const updateData = { status: newStatus };
    if (newStatus === 'completed') {
      updateData.completed_date = new Date().toISOString();
    }
    updateTaskMutation.mutate({ id: task.id, data: updateData });
  };

  const handleAIPlan = async () => {
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    
    if (pendingTasks.length === 0) {
      alert('No tasks to plan!');
      return;
    }

    setAiPlanning(true);
    try {
      const taskList = pendingTasks.map((t, i) => `${i + 1}. ${t.title} (Priority: ${t.priority})`).join('\n');
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a productivity expert. I have these tasks:

${taskList}

Create an optimized daily/weekly plan. For each task:
1. Suggest best time to work on it
2. Provide time estimate
3. Group related tasks
4. Flag potential blockers

Be specific and actionable.`,
        add_context_from_internet: false
      });

      alert(`🎯 AI Planning:\n\n${result}`);
    } catch (error) {
      alert('AI planning failed: ' + error.message);
    } finally {
      setAiPlanning(false);
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-green-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const textColor = theme.dark ? 'text-white' : 'text-slate-900';
  const textSecondary = theme.dark ? 'text-slate-300' : 'text-slate-600';
  const cardBg = theme.dark ? 'bg-slate-800/50' : 'bg-white';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${textColor}`}>Task Control Center</h2>
          <p className={textSecondary}>Manage and prioritize your work</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleAIPlan}
            variant="outline"
            disabled={aiPlanning}
          >
            {aiPlanning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            AI Plan My Week
          </Button>
          <Button 
            onClick={() => {
              resetForm();
              setShowTaskDialog(true);
            }}
            className={`bg-gradient-to-r ${theme.accent} text-white`}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* To Do */}
        <Card className={`border-none shadow-lg ${cardBg}`}>
          <CardHeader className={theme.dark ? 'bg-slate-700/50' : 'bg-slate-100'}>
            <CardTitle className={`flex items-center gap-2 text-lg ${textColor}`}>
              <Circle className="w-5 h-5" />
              To Do ({todoTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <AnimatePresence>
              {todoTasks.map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card className={theme.dark ? 'bg-slate-700 border-slate-600' : 'border-2 hover:shadow-md transition-shadow'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className={`font-semibold ${textColor} mb-1`}>{task.title}</h4>
                          {task.description && (
                            <p className={`text-sm ${textSecondary} line-clamp-2 mb-2`}>{task.description}</p>
                          )}
                        </div>
                        <Badge className={`${getPriorityColor(task.priority)} text-xs ml-2`}>
                          {task.priority}
                        </Badge>
                      </div>

                      {task.due_date && (
                        <div className={`flex items-center gap-1 text-xs ${textSecondary} mb-3`}>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(task.due_date), 'MMM d')}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleToggleStatus(task)}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Done
                        </Button>
                        <Button
                          onClick={() => handleEdit(task)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {todoTasks.length === 0 && (
              <div className="text-center py-8">
                <Circle className={`w-12 h-12 mx-auto mb-2 opacity-30 ${textSecondary}`} />
                <p className={`text-sm ${textSecondary}`}>No tasks</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className={`border-none shadow-lg ${cardBg}`}>
          <CardHeader className={theme.dark ? 'bg-blue-900/30' : 'bg-blue-100'}>
            <CardTitle className={`flex items-center gap-2 text-lg ${theme.dark ? 'text-blue-300' : 'text-blue-900'}`}>
              <Clock className="w-5 h-5" />
              In Progress ({inProgressTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <AnimatePresence>
              {inProgressTasks.map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                >
                  <Card className={theme.dark ? 'bg-slate-700 border-blue-600' : 'border-2 border-blue-200'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className={`font-semibold ${textColor} mb-1`}>{task.title}</h4>
                          {task.description && (
                            <p className={`text-sm ${textSecondary} line-clamp-2 mb-2`}>{task.description}</p>
                          )}
                        </div>
                        <Badge className={`${getPriorityColor(task.priority)} text-xs ml-2`}>
                          {task.priority}
                        </Badge>
                      </div>

                      {task.due_date && (
                        <div className={`flex items-center gap-1 text-xs ${textSecondary} mb-3`}>
                          <Calendar className="w-3 h-3" />
                          {format(new Date(task.due_date), 'MMM d')}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleToggleStatus(task)}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Done
                        </Button>
                        <Button
                          onClick={() => handleEdit(task)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {inProgressTasks.length === 0 && (
              <div className="text-center py-8">
                <Clock className={`w-12 h-12 mx-auto mb-2 opacity-30 ${textSecondary}`} />
                <p className={`text-sm ${textSecondary}`}>No active tasks</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className={`border-none shadow-lg ${cardBg}`}>
          <CardHeader className={theme.dark ? 'bg-green-900/30' : 'bg-green-100'}>
            <CardTitle className={`flex items-center gap-2 text-lg ${theme.dark ? 'text-green-300' : 'text-green-900'}`}>
              <CheckCircle className="w-5 h-5" />
              Completed ({completedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <AnimatePresence>
              {completedTasks.slice(0, 10).map(task => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                >
                  <Card className={theme.dark ? 'bg-slate-700 border-green-600' : 'border-2 border-green-200 bg-green-50/50'}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className={`font-semibold ${textSecondary} line-through`}>{task.title}</h4>
                        </div>
                      </div>

                      {task.completed_date && (
                        <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                          <CheckCircle className="w-3 h-3" />
                          {format(new Date(task.completed_date), 'MMM d, h:mm a')}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleToggleStatus(task)}
                          size="sm"
                          variant="outline"
                          className="flex-1"
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Reopen
                        </Button>
                        <Button
                          onClick={() => deleteTaskMutation.mutate(task.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
            {completedTasks.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className={`w-12 h-12 mx-auto mb-2 opacity-30 ${textSecondary}`} />
                <p className={`text-sm ${textSecondary}`}>No completed tasks</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Title *</label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Description</label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                placeholder="Add details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Priority</label>
                <Select value={taskForm.priority} onValueChange={(v) => setTaskForm({ ...taskForm, priority: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Status</label>
                <Select value={taskForm.status} onValueChange={(v) => setTaskForm({ ...taskForm, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Due Date</label>
                <Input
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Category</label>
                <Input
                  value={taskForm.category}
                  onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                  placeholder="e.g., Work, Client..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setShowTaskDialog(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                className="flex-1"
                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}