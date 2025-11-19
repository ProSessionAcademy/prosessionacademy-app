import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Settings, Palette, Bot, Save, RotateCcw, Camera, Loader2, User } from 'lucide-react';

const THEMES = [
  { value: 'minimal_zen', label: 'Minimal Zen', color: 'from-slate-400 to-slate-600' },
  { value: 'dynamic_visual', label: 'Dynamic & Visual', color: 'from-blue-500 to-purple-600' },
  { value: 'dark_executive', label: 'Dark Executive', color: 'from-slate-800 to-slate-900' },
  { value: 'vibrant_energetic', label: 'Vibrant Energetic', color: 'from-orange-500 to-pink-600' }
];

const AI_PERSONALITIES = [
  { value: 'calm_professional', label: 'Calm Professional', emoji: '🧘' },
  { value: 'energetic_motivator', label: 'Energetic Motivator', emoji: '⚡' },
  { value: 'data_analyst', label: 'Data-Driven Analyst', emoji: '📊' },
  { value: 'friendly_coworker', label: 'Friendly Co-worker', emoji: '😊' }
];

export default function SettingsModule({ user, theme, config }) {
  const queryClient = useQueryClient();
  const [localConfig, setLocalConfig] = useState(config || {});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePicture, setProfilePicture] = useState(user.profile_picture_url || '');
  const [fullName, setFullName] = useState(user.full_name || '');

  const updateConfigMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkspaceConfig.update(config.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaceConfig'] });
      alert('✅ Settings saved! Refreshing...');
      window.location.reload();
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      alert('✅ Profile updated!');
    }
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfilePicture(file_url);
      await updateUserMutation.mutateAsync({ profile_picture_url: file_url });
      queryClient.invalidateQueries();
    } catch (error) {
      alert('❌ Upload failed: ' + error.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserMutation.mutateAsync({ 
        full_name: fullName,
        profile_picture_url: profilePicture
      });
    } catch (error) {
      alert('Failed to update profile');
    }
  };

  const handleSave = () => {
    updateConfigMutation.mutate(localConfig);
  };

  const textColor = theme.dark ? 'text-white' : 'text-slate-900';
  const textSecondary = theme.dark ? 'text-slate-300' : 'text-slate-600';
  const cardBg = theme.dark ? 'bg-slate-800/50' : 'bg-white';

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-3xl font-bold ${textColor} mb-2`}>Workspace Settings</h2>
        <p className={textSecondary}>Customize your Professional Space</p>
      </div>

      {/* Profile Settings */}
      <Card className={`border-none shadow-lg ${cardBg}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColor}`}>
            <User className="w-5 h-5" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profilePicture} />
                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl">
                  {fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <input
                type="file"
                onChange={handlePhotoUpload}
                className="hidden"
                id="profile-photo-upload"
                accept="image/*"
              />
              <button
                onClick={() => document.getElementById('profile-photo-upload').click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors shadow-lg"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <Button onClick={handleSaveProfile} size="sm" disabled={updateUserMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={`border-none shadow-lg ${cardBg}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColor}`}>
            <Palette className="w-5 h-5" />
            Workspace Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {THEMES.map(t => (
            <button
              key={t.value}
              onClick={() => setLocalConfig({ ...localConfig, theme: t.value })}
              className={`p-6 rounded-xl border-2 transition-all ${
                localConfig.theme === t.value
                  ? 'border-blue-600 shadow-xl'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className={`h-24 rounded-lg bg-gradient-to-br ${t.color} mb-4`} />
              <p className={`font-bold ${textColor}`}>{t.label}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card className={`border-none shadow-lg ${cardBg}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${textColor}`}>
            <Bot className="w-5 h-5" />
            AI Assistant Personality
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          {AI_PERSONALITIES.map(p => (
            <button
              key={p.value}
              onClick={() => setLocalConfig({ ...localConfig, ai_personality: p.value })}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                localConfig.ai_personality === p.value
                  ? 'border-purple-600 bg-purple-50 shadow-xl'
                  : 'border-slate-200 hover:border-purple-300'
              }`}
            >
              <div className="text-4xl mb-2">{p.emoji}</div>
              <p className={`font-bold ${textColor}`}>{p.label}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={() => setLocalConfig(config)}
          variant="outline"
          className="flex-1"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Changes
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateConfigMutation.isPending}
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}