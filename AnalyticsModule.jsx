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
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  Pin,
  PinOff,
  Sparkles,
  Target,
  BarChart3,
  Loader2,
  Calendar,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';

export default function AnalyticsModule({ user, config, theme }) {
  const queryClient = useQueryClient();
  const [showKPIDialog, setShowKPIDialog] = useState(false);
  const [showDataDialog, setShowDataDialog] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [generatingFormula, setGeneratingFormula] = useState(false);
  
  const [kpiForm, setKpiForm] = useState({
    title: '',
    description: '',
    formula: '',
    current_value: 0,
    target_value: 0,
    unit: '%',
    timeframe: 'monthly',
    category: '',
    data_source: '',
    visualization_type: 'line',
    pinned_to_dashboard: false,
    history: []
  });

  const [dataPoint, setDataPoint] = useState({
    date: new Date().toISOString().split('T')[0],
    value: 0
  });

  const { data: kpis = [] } = useQuery({
    queryKey: ['professionalKPIs', user.email],
    queryFn: () => base44.entities.ProfessionalKPI.filter({ user_email: user.email }, '-created_date'),
    initialData: []
  });

  const createKPIMutation = useMutation({
    mutationFn: (data) => base44.entities.ProfessionalKPI.create({
      ...data,
      user_email: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalKPIs'] });
      setShowKPIDialog(false);
      resetForm();
    }
  });

  const updateKPIMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProfessionalKPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalKPIs'] });
    }
  });

  const deleteKPIMutation = useMutation({
    mutationFn: (id) => base44.entities.ProfessionalKPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionalKPIs'] });
      setEditingKPI(null);
    }
  });

  const resetForm = () => {
    setKpiForm({
      title: '',
      description: '',
      formula: '',
      current_value: 0,
      target_value: 0,
      unit: '%',
      timeframe: 'monthly',
      category: '',
      data_source: '',
      visualization_type: 'line',
      pinned_to_dashboard: false,
      history: []
    });
    setEditingKPI(null);
  };

  const handleSaveKPI = () => {
    if (!kpiForm.title.trim()) {
      alert('KPI titel is verplicht');
      return;
    }

    if (editingKPI) {
      updateKPIMutation.mutate({ id: editingKPI.id, data: kpiForm });
    } else {
      createKPIMutation.mutate(kpiForm);
    }
  };

  const handleEditKPI = (kpi) => {
    setEditingKPI(kpi);
    setKpiForm({
      title: kpi.title,
      description: kpi.description || '',
      formula: kpi.formula || '',
      current_value: kpi.current_value || 0,
      target_value: kpi.target_value || 0,
      unit: kpi.unit || '%',
      timeframe: kpi.timeframe || 'monthly',
      category: kpi.category || '',
      data_source: kpi.data_source || '',
      visualization_type: kpi.visualization_type || 'line',
      pinned_to_dashboard: kpi.pinned_to_dashboard || false,
      history: kpi.history || []
    });
    setShowKPIDialog(true);
  };

  const handleDeleteKPI = (id) => {
    if (confirm('Weet je zeker dat je deze KPI wilt verwijderen?')) {
      deleteKPIMutation.mutate(id);
    }
  };

  const handleTogglePin = (kpi) => {
    updateKPIMutation.mutate({
      id: kpi.id,
      data: { pinned_to_dashboard: !kpi.pinned_to_dashboard }
    });
  };

  const handleGenerateFormula = async () => {
    if (!kpiForm.title || !kpiForm.description) {
      alert('Vul eerst titel en beschrijving in voor AI hulp');
      return;
    }

    setGeneratingFormula(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a KPI formula for:
Title: ${kpiForm.title}
Description: ${kpiForm.description}

Provide a simple, practical formula (e.g., "(Sales / Target) * 100" or "Total Revenue / Number of Customers")`,
        response_json_schema: {
          type: "object",
          properties: {
            formula: { type: "string" }
          }
        }
      });

      setKpiForm({ ...kpiForm, formula: result.formula });
    } catch (error) {
      alert('Formula generatie mislukt');
    } finally {
      setGeneratingFormula(false);
    }
  };

  const handleAddDataPoint = () => {
    if (!dataPoint.date || dataPoint.value === undefined) {
      alert('Vul datum en waarde in');
      return;
    }

    const newHistory = [...(selectedKPI.history || []), dataPoint].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    updateKPIMutation.mutate({
      id: selectedKPI.id,
      data: { 
        history: newHistory,
        current_value: dataPoint.value
      }
    });

    setDataPoint({
      date: new Date().toISOString().split('T')[0],
      value: 0
    });
    setShowDataDialog(false);
    setSelectedKPI(null);
  };

  const handleOpenDataDialog = (kpi) => {
    setSelectedKPI(kpi);
    setDataPoint({
      date: new Date().toISOString().split('T')[0],
      value: kpi.current_value || 0
    });
    setShowDataDialog(true);
  };

  const getChartData = (kpi) => {
    if (!kpi.history || kpi.history.length === 0) return [];
    
    return kpi.history.map(point => ({
      date: format(new Date(point.date), 'MMM d'),
      value: point.value,
      fullDate: point.date
    }));
  };

  const getTrend = (kpi) => {
    if (!kpi.history || kpi.history.length < 2) return null;
    
    const latest = kpi.history[kpi.history.length - 1].value;
    const previous = kpi.history[kpi.history.length - 2].value;
    
    return latest > previous ? 'up' : latest < previous ? 'down' : 'stable';
  };

  const pinnedKPIs = kpis.filter(k => k.pinned_to_dashboard);
  const allKPIs = kpis;

  const textColor = theme.dark ? 'text-white' : 'text-slate-900';
  const textSecondary = theme.dark ? 'text-slate-300' : 'text-slate-600';
  const cardBg = theme.dark ? 'bg-slate-800/50' : 'bg-white';

  const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold ${textColor}`}>Analytics Dashboard</h2>
          <p className={textSecondary}>Track your key performance indicators</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowKPIDialog(true);
          }}
          className={`bg-gradient-to-r ${theme.accent} text-white shadow-lg`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nieuwe KPI
        </Button>
      </div>

      {/* Pinned KPIs */}
      {pinnedKPIs.length > 0 && (
        <div>
          <h3 className={`text-xl font-bold ${textColor} mb-4 flex items-center gap-2`}>
            <Pin className="w-5 h-5" />
            Pinned KPIs
          </h3>
          <div className="grid lg:grid-cols-2 gap-6">
            {pinnedKPIs.map(kpi => {
              const chartData = getChartData(kpi);
              const trend = getTrend(kpi);
              const progress = kpi.target_value ? (kpi.current_value / kpi.target_value) * 100 : 0;

              return (
                <Card key={kpi.id} className={`border-none shadow-lg ${cardBg}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className={`text-lg ${textColor} mb-1`}>{kpi.title}</CardTitle>
                        <p className={`text-sm ${textSecondary}`}>{kpi.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={() => handleTogglePin(kpi)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                        >
                          <PinOff className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditKPI(kpi)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-3">
                      <div className="text-4xl font-bold text-blue-600">
                        {kpi.current_value}{kpi.unit}
                      </div>
                      {kpi.target_value > 0 && (
                        <div className={`text-sm ${textSecondary}`}>
                          / {kpi.target_value}{kpi.unit}
                        </div>
                      )}
                      {trend && (
                        <Badge className={trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                          {trend}
                        </Badge>
                      )}
                    </div>

                    {kpi.target_value > 0 && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className={textSecondary}>Progress</span>
                          <span className="font-semibold">{Math.round(progress)}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {chartData.length > 0 ? (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          {kpi.visualization_type === 'line' && (
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme.dark ? '#475569' : '#E2E8F0'} />
                              <XAxis 
                                dataKey="date" 
                                stroke={theme.dark ? '#94A3B8' : '#64748B'}
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis 
                                stroke={theme.dark ? '#94A3B8' : '#64748B'}
                                style={{ fontSize: '12px' }}
                              />
                              <Tooltip 
                                contentStyle={{
                                  backgroundColor: theme.dark ? '#1E293B' : '#FFFFFF',
                                  border: `1px solid ${theme.dark ? '#475569' : '#E2E8F0'}`,
                                  borderRadius: '8px'
                                }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#3B82F6" 
                                strokeWidth={3}
                                dot={{ fill: '#3B82F6', r: 5 }}
                              />
                            </LineChart>
                          )}
                          {kpi.visualization_type === 'bar' && (
                            <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme.dark ? '#475569' : '#E2E8F0'} />
                              <XAxis dataKey="date" stroke={theme.dark ? '#94A3B8' : '#64748B'} />
                              <YAxis stroke={theme.dark ? '#94A3B8' : '#64748B'} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#8B5CF6" />
                            </BarChart>
                          )}
                          {kpi.visualization_type === 'area' && (
                            <AreaChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme.dark ? '#475569' : '#E2E8F0'} />
                              <XAxis dataKey="date" stroke={theme.dark ? '#94A3B8' : '#64748B'} />
                              <YAxis stroke={theme.dark ? '#94A3B8' : '#64748B'} />
                              <Tooltip />
                              <Area type="monotone" dataKey="value" stroke="#EC4899" fill="#EC4899" fillOpacity={0.3} />
                            </AreaChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className={`h-48 rounded-lg border-2 border-dashed ${theme.dark ? 'border-slate-600 bg-slate-700/30' : 'border-slate-300 bg-slate-50'} flex items-center justify-center`}>
                        <div className="text-center">
                          <BarChart3 className={`w-12 h-12 mx-auto mb-2 opacity-30 ${textSecondary}`} />
                          <p className={`text-sm ${textSecondary} mb-3`}>Nog geen data</p>
                          <Button
                            onClick={() => handleOpenDataDialog(kpi)}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Voeg Data Toe
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        onClick={() => handleOpenDataDialog(kpi)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Data
                      </Button>
                      <Button
                        onClick={() => handleEditKPI(kpi)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All KPIs */}
      <div>
        <h3 className={`text-xl font-bold ${textColor} mb-4`}>Alle KPIs</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {allKPIs.map(kpi => {
            const chartData = getChartData(kpi);
            const progress = kpi.target_value ? (kpi.current_value / kpi.target_value) * 100 : 0;

            return (
              <Card key={kpi.id} className={`border-none shadow-lg ${cardBg} hover:shadow-xl transition-shadow`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className={`font-bold ${textColor} text-base flex-1`}>{kpi.title}</h4>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleTogglePin(kpi)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                      >
                        {kpi.pinned_to_dashboard ? (
                          <Pin className="w-3 h-3 text-blue-600" />
                        ) : (
                          <PinOff className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        onClick={() => handleEditKPI(kpi)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteKPI(kpi.id)}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-3xl font-bold text-blue-600">
                      {kpi.current_value}{kpi.unit}
                    </span>
                    {kpi.target_value > 0 && (
                      <span className={`text-xs ${textSecondary}`}>
                        / {kpi.target_value}{kpi.unit}
                      </span>
                    )}
                  </div>

                  {chartData.length > 0 ? (
                    <div className="h-24 mb-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <Line 
                            type="monotone" 
                            dataKey="value" 
                            stroke="#3B82F6" 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className={`h-24 mb-3 rounded-lg border ${theme.dark ? 'border-slate-600 bg-slate-700/30' : 'border-slate-200 bg-slate-50'} flex items-center justify-center`}>
                      <p className={`text-xs ${textSecondary}`}>Geen data</p>
                    </div>
                  )}

                  <Button
                    onClick={() => handleOpenDataDialog(kpi)}
                    size="sm"
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Data Toevoegen
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {allKPIs.length === 0 && (
          <Card className={`border-none shadow-lg ${cardBg}`}>
            <CardContent className="p-16 text-center">
              <Target className={`w-16 h-16 mx-auto mb-4 opacity-30 ${textSecondary}`} />
              <h3 className={`text-xl font-bold ${textColor} mb-2`}>Nog geen KPIs</h3>
              <p className={`${textSecondary} mb-6`}>Maak je eerste KPI om performance te tracken</p>
              <Button
                onClick={() => setShowKPIDialog(true)}
                className={`bg-gradient-to-r ${theme.accent} text-white`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Eerste KPI Maken
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* KPI Creation/Edit Dialog */}
      <Dialog open={showKPIDialog} onOpenChange={(open) => {
        setShowKPIDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKPI ? 'KPI Bewerken' : 'Nieuwe KPI'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">KPI Titel *</label>
              <Input
                value={kpiForm.title}
                onChange={(e) => setKpiForm({ ...kpiForm, title: e.target.value })}
                placeholder="bijv. Conversie Percentage, Maandelijkse Omzet..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Beschrijving</label>
              <Textarea
                value={kpiForm.description}
                onChange={(e) => setKpiForm({ ...kpiForm, description: e.target.value })}
                placeholder="Wat meet deze KPI?"
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Formule</label>
                <Button
                  onClick={handleGenerateFormula}
                  size="sm"
                  variant="outline"
                  disabled={generatingFormula || !kpiForm.title}
                >
                  {generatingFormula ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3 mr-1" />
                  )}
                  AI Help
                </Button>
              </div>
              <Input
                value={kpiForm.formula}
                onChange={(e) => setKpiForm({ ...kpiForm, formula: e.target.value })}
                placeholder="bijv. (Current value / target value) * 100"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Huidige Waarde</label>
                <Input
                  type="number"
                  step="0.01"
                  value={kpiForm.current_value}
                  onChange={(e) => setKpiForm({ ...kpiForm, current_value: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Doel Waarde</label>
                <Input
                  type="number"
                  step="0.01"
                  value={kpiForm.target_value}
                  onChange={(e) => setKpiForm({ ...kpiForm, target_value: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Eenheid</label>
                <Input
                  value={kpiForm.unit}
                  onChange={(e) => setKpiForm({ ...kpiForm, unit: e.target.value })}
                  placeholder="%, €, stuks"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Tijdsperiode</label>
                <Select
                  value={kpiForm.timeframe}
                  onValueChange={(value) => setKpiForm({ ...kpiForm, timeframe: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Dagelijks</SelectItem>
                    <SelectItem value="weekly">Wekelijks</SelectItem>
                    <SelectItem value="monthly">Maandelijks</SelectItem>
                    <SelectItem value="quarterly">Per Kwartaal</SelectItem>
                    <SelectItem value="yearly">Jaarlijks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Visualisatie Type</label>
                <Select
                  value={kpiForm.visualization_type}
                  onValueChange={(value) => setKpiForm({ ...kpiForm, visualization_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Lijn Grafiek</SelectItem>
                    <SelectItem value="bar">Staaf Grafiek</SelectItem>
                    <SelectItem value="area">Area Grafiek</SelectItem>
                    <SelectItem value="number">Alleen Nummer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Categorie</label>
                <Input
                  value={kpiForm.category}
                  onChange={(e) => setKpiForm({ ...kpiForm, category: e.target.value })}
                  placeholder="bijv. Sales, Marketing, Operations"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Data Bron</label>
                <Input
                  value={kpiForm.data_source}
                  onChange={(e) => setKpiForm({ ...kpiForm, data_source: e.target.value })}
                  placeholder="bijv. Excel, CRM, Website Analytics"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="pin_kpi"
                checked={kpiForm.pinned_to_dashboard}
                onChange={(e) => setKpiForm({ ...kpiForm, pinned_to_dashboard: e.target.checked })}
                className="w-5 h-5 rounded accent-blue-600"
              />
              <label htmlFor="pin_kpi" className="font-medium cursor-pointer">
                Pin naar hoofddashboard
              </label>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowKPIDialog(false);
                  resetForm();
                }}
                variant="outline"
                className="flex-1"
              >
                Annuleer
              </Button>
              <Button
                onClick={handleSaveKPI}
                disabled={createKPIMutation.isPending || updateKPIMutation.isPending}
                className="flex-1"
              >
                {(createKPIMutation.isPending || updateKPIMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Target className="w-4 h-4 mr-2" />
                )}
                {editingKPI ? 'Update KPI' : 'KPI Opslaan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Data Point Dialog */}
      <Dialog open={showDataDialog} onOpenChange={(open) => {
        setShowDataDialog(open);
        if (!open) {
          setSelectedKPI(null);
          setDataPoint({
            date: new Date().toISOString().split('T')[0],
            value: 0
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data Punt Toevoegen</DialogTitle>
          </DialogHeader>

          {selectedKPI && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-bold text-blue-900 mb-1">{selectedKPI.title}</h4>
                <p className="text-sm text-blue-700">{selectedKPI.description}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Datum *
                </label>
                <Input
                  type="date"
                  value={dataPoint.date}
                  onChange={(e) => setDataPoint({ ...dataPoint, date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Voor welke datum is deze waarde?
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Waarde *
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={dataPoint.value}
                    onChange={(e) => setDataPoint({ ...dataPoint, value: Number(e.target.value) })}
                    className="flex-1"
                    placeholder="0"
                  />
                  <span className="text-lg font-semibold text-slate-700 px-2">
                    {selectedKPI.unit}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Huidige waarde: {selectedKPI.current_value}{selectedKPI.unit}
                  {selectedKPI.target_value > 0 && ` | Doel: ${selectedKPI.target_value}${selectedKPI.unit}`}
                </p>
              </div>

              {selectedKPI.history && selectedKPI.history.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Historische Data ({selectedKPI.history.length} punten)</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedKPI.history.slice(-5).reverse().map((point, idx) => (
                      <div key={idx} className="flex justify-between text-sm bg-slate-50 p-2 rounded">
                        <span className="text-slate-600">{format(new Date(point.date), 'MMM d, yyyy')}</span>
                        <span className="font-semibold text-slate-900">{point.value}{selectedKPI.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleAddDataPoint}
                disabled={updateKPIMutation.isPending}
                className="w-full"
              >
                {updateKPIMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Data Punt Opslaan
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}