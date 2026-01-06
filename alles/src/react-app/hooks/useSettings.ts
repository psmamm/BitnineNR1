import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface UserSettings {
  notifications: {
    tradeAlerts: boolean;
    performanceReports: boolean;
    productUpdates: boolean;
  };
  theme: 'dark' | 'light' | 'auto';
  profile: {
    displayName: string;
    email: string;
    avatarIcon?: string;
  };
}

const defaultSettings: UserSettings = {
  notifications: {
    tradeAlerts: true,
    performanceReports: true,
    productUpdates: false,
  },
  theme: 'dark',
  profile: {
    displayName: '',
    email: '',
    avatarIcon: '',
  },
};

export function useSettings() {
  const { user, updateUserProfile } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);

  // Load settings from server and localStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Initialize profile from user data
        if (user) {
          setSettings(prev => ({
            ...prev,
            profile: {
              displayName: user.displayName || '',
              email: user.email || '',
              avatarIcon: user.photoURL || '',
            }
          }));

          // Try to load server settings
          const response = await fetch('/api/users/settings', {
            credentials: 'include'
          });

          if (response.ok) {
            const serverSettings = await response.json();
            setSettings(prev => ({
              ...prev,
              notifications: serverSettings.notifications || defaultSettings.notifications,
              theme: serverSettings.theme || defaultSettings.theme,
            }));
          }
        }

        // Load from localStorage as fallback
        const savedSettings = localStorage.getItem('tradecircle_settings');
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setSettings(prev => ({ ...prev, ...parsed }));
          } catch (error) {
            console.warn('Failed to parse saved settings');
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, [user]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('tradecircle_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [settings]);

  const updateNotifications = async (key: keyof UserSettings['notifications'], value: boolean) => {
    const newNotifications = {
      ...settings.notifications,
      [key]: value,
    };

    setSettings(prev => ({
      ...prev,
      notifications: newNotifications,
    }));

    // Update server
    try {
      const response = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          notifications: newNotifications,
          theme: settings.theme
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update settings on server');
      }
    } catch (error) {
      console.error('Failed to update notifications on server:', error);
    }
  };

  const updateTheme = async (theme: UserSettings['theme']) => {
    setSettings(prev => ({
      ...prev,
      theme,
    }));

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);

    // Update server
    try {
      const response = await fetch('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          notifications: settings.notifications,
          theme
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update theme on server');
      }
    } catch (error) {
      console.error('Failed to update theme on server:', error);
    }
  };

  const updateProfileData = async (profileData: Partial<UserSettings['profile']>) => {
    try {
      setLoading(true);

      // 1. Update Firebase Auth Profile directly
      const { error } = await updateUserProfile({
        displayName: profileData.displayName,
        photoURL: profileData.avatarIcon // Map avatarIcon to photoURL
      });

      if (error) throw error;

      // 2. Update local state immediately
      setSettings(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          ...profileData,
        },
      }));

      // 3. Update backend (Optional / Sync)
      try {
        await fetch('/api/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(profileData)
        });
      } catch (backendError) {
        console.warn("Backend sync failed, but firebase update successful", backendError);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to update profile:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update profile' };
    } finally {
      setLoading(false);
    }
  };

  const exportSettings = () => {
    const exportData = {
      settings,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tradecircle_settings_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importSettings = (file: File) => {
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData = JSON.parse(content);

          if (importData.settings) {
            setSettings({ ...defaultSettings, ...importData.settings });
            resolve({ success: true });
          } else {
            resolve({ success: false, error: 'Invalid settings file format' });
          }
        } catch (error) {
          resolve({ success: false, error: 'Failed to parse settings file' });
        }
      };
      reader.readAsText(file);
    });
  };

  return {
    settings,
    loading,
    updateNotifications,
    updateTheme,
    updateProfileData,
    exportSettings,
    importSettings,
  };
}
