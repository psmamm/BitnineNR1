import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { User, Mail, Award, Edit2, Save, X, RefreshCw } from 'lucide-react';

interface UserProfile {
  username: string | null;
  email: string;
  name: string;
  xp: number;
  rank_tier: string;
  reputation_score: number;
  current_streak: number;
  avatar_icon?: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setError(null);
        const token = await user.getIdToken();
        const response = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setEditedName(data.name || '');
        } else {
          throw new Error('Failed to load profile');
        }
      } catch (error) {
        console.error('[Profile] Failed to fetch:', error);
        setError('Failed to load profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || !editedName.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: editedName.trim(),
        }),
      });

      if (response.ok) {
        setProfile(prev => prev ? { ...prev, name: editedName.trim() } : null);
        setEditing(false);
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('[Profile] Failed to update:', error);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <RefreshCw className="w-16 h-16 text-[#00D9C8] animate-spin mx-auto mb-4" />
            <p className="text-zinc-400">Loading profile...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-400 text-lg">Please log in to view your profile</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-400">{error || 'Failed to load profile'}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4 bg-[#00D9C8] hover:bg-[#00A89C]"
            >
              Retry
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Profile</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00D9C8] to-[#00A89C] flex items-center justify-center text-3xl font-bold text-white">
              {profile.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {editing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter your name"
                    className="text-2xl font-bold bg-zinc-800 text-white px-3 py-1 rounded border border-zinc-700 focus:border-[#00D9C8] outline-none"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-white">{profile.name}</h2>
                )}

                {editing ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving || !editedName.trim()}
                      className="bg-[#00D9C8] hover:bg-[#00A89C]"
                    >
                      {saving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        setEditedName(profile.name || '');
                        setError(null);
                      }}
                      disabled={saving}
                      className="border-zinc-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing(true)}
                    className="hover:bg-zinc-800"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <User className="w-4 h-4" />
                  {profile.username || 'No username set'}
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Award className="w-4 h-4" />
                  {profile.rank_tier} Rank
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-zinc-800">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#00D9C8]">{profile.xp}</p>
              <p className="text-xs text-zinc-500 mt-1">Experience Points</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400">{profile.current_streak}</p>
              <p className="text-xs text-zinc-500 mt-1">Day Streak</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-400">{profile.reputation_score}</p>
              <p className="text-xs text-zinc-500 mt-1">Reputation</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
