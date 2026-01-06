import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

const emitDebugLog = (payload: Record<string, any>) => {
  const url = 'http://127.0.0.1:7242/ingest/f3961031-a2d1-4bfa-88fe-0afd58d89888';
  const body = JSON.stringify(payload);
  try {
    fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body
    }).catch(() => {});
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    }
  } catch {
    // ignore logging transport errors
  }
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  logout: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  updateUserProfile: (data: { displayName?: string; photoURL?: string }) => Promise<{ error: any }>;
  refreshUserData: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // #region agent log
      emitDebugLog({
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'H3',
        location: 'AuthContext.tsx:signIn',
        message: 'Firebase email sign-in success',
        data: {
          emailProvided: Boolean(email)
        },
        timestamp: Date.now()
      });
      // #endregion
      return { error: null };
    } catch (error) {
      // #region agent log
      emitDebugLog({
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'H3',
        location: 'AuthContext.tsx:signIn',
        message: 'Firebase email sign-in error',
        data: {
          emailProvided: Boolean(email),
          errorCode: (error as any)?.code,
          errorMessage: (error as any)?.message
        },
        timestamp: Date.now()
      });
      // #endregion
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // #region agent log
      emitDebugLog({
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'H4',
        location: 'AuthContext.tsx:signInWithGoogle',
        message: 'Firebase Google sign-in success',
        data: {},
        timestamp: Date.now()
      });
      // #endregion
      return { error: null };
    } catch (error) {
      // #region agent log
      emitDebugLog({
        sessionId: 'debug-session',
        runId: 'run2',
        hypothesisId: 'H4',
        location: 'AuthContext.tsx:signInWithGoogle',
        message: 'Firebase Google sign-in error',
        data: {
          errorCode: (error as any)?.code,
          errorMessage: (error as any)?.message
        },
        timestamp: Date.now()
      });
      // #endregion
      return { error };
    }
  };

  const updateUserProfile = async (data: { displayName?: string; photoURL?: string }) => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, data);
        setUser({ ...auth.currentUser });
        return { error: null };
      }
      return { error: 'No user logged in' };
    } catch (error) {
      return { error };
    }
  };

  const refreshUserData = async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        setUser({ ...auth.currentUser });
        return auth.currentUser;
      }
      return null;
    } catch (error) {
      console.error('Failed to refresh user data', error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    logout: signOut,
    resetPassword,
    signInWithGoogle,
    updateUserProfile,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
