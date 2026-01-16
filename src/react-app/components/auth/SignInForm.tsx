import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';

type SignInFormProps = {
  layout?: 'card' | 'plain';
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Error message mapping for better UX
const getErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
    'auth/user-not-found': 'No account found with this email address.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
    'auth/user-disabled': 'This account has been disabled. Contact support.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  };
  return errorMessages[errorCode] || 'Failed to sign in. Please try again.';
};

export const SignInForm = ({ layout = 'card' }: SignInFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
      setIsEmailValid(EMAIL_REGEX.test(savedEmail));
    }
  }, []);

  // Validate email
  const validateEmail = useCallback((value: string) => {
    const isValid = EMAIL_REGEX.test(value);
    setIsEmailValid(isValid);
    return isValid;
  }, []);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (emailTouched) {
      validateEmail(value);
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate before submission
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      setEmailTouched(true);
      return;
    }

    if (password.length < 1) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      
      navigate('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? getErrorMessage(error.code)
        : (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
        ? error.message
        : 'Failed to sign in';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
      navigate('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
        ? getErrorMessage(error.code)
        : (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
        ? error.message
        : 'Failed to sign in with Google';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const cardContent = (
    <div className="space-y-3 text-center">
      <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-[#2B2F36] text-[11px] uppercase tracking-[0.2em] text-gray-400">
        Welcome back
      </div>
      <h2 className="text-3xl font-extrabold text-white">Sign in to your account</h2>
      <p className="text-sm text-[#7F8C8D]">Manage trades, track PnL and get started right away.</p>
    </div>
  );

  const formContent = (
    <>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email-address" className="text-sm text-[#AAB0C0] font-medium">
              Email address
            </label>
            <div className="relative">
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={emailTouched && !isEmailValid}
                aria-describedby={emailTouched && !isEmailValid ? "email-error" : undefined}
                className={`w-full rounded-xl border bg-[#1B1B1D]/50 px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  emailTouched
                    ? isEmailValid
                      ? 'border-[#03AAC7]/50 focus:ring-[#03AAC7]/50 focus:border-[#03AAC7]/50'
                      : 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                    : 'border-[#2B2F36] focus:ring-[#03AAC7]/50 focus:border-[#03AAC7]/50'
                }`}
                placeholder="you@example.com"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
              />
              {emailTouched && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {isEmailValid ? (
                    <CheckCircle className="w-4 h-4 text-[#03AAC7]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              )}
            </div>
            {emailTouched && !isEmailValid && (
              <p id="email-error" className="text-xs text-red-400 mt-1">Please enter a valid email address</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="password" className="text-[#AAB0C0] font-medium">
                Password
              </label>
              <Link to="/forgot-password" className="text-[#03AAC7] hover:text-[#26BFD4] transition-colors">
                Forgot your password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-[#2B2F36] bg-[#1B1B1D]/50 px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#03AAC7]/50 focus:border-[#03AAC7]/50 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={togglePasswordVisibility}
                className="absolute inset-y-0 right-0 text-gray-400 hover:text-white h-auto"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center">
          <div className="relative">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="peer sr-only"
            />
            <label
              htmlFor="remember-me"
              className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border-2 border-white/20 bg-white/5 transition-all duration-200 hover:border-[#03AAC7]/50 hover:bg-[#03AAC7]/10 peer-checked:border-[#03AAC7] peer-checked:bg-[#03AAC7] peer-focus-visible:ring-2 peer-focus-visible:ring-[#03AAC7]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#1B1B1D]"
            >
              <svg
                className="h-3 w-3 text-white opacity-0 transition-opacity duration-200 peer-checked:opacity-100"
                style={{ opacity: rememberMe ? 1 : 0 }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </label>
          </div>
          <label htmlFor="remember-me" className="ml-3 text-sm text-[#AAB0C0] cursor-pointer select-none hover:text-white transition-colors">
            Remember me
          </label>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="submit"
            variant="default"
            disabled={loading}
            className="w-full bg-[#03AAC7] hover:bg-[#26BFD4] shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2B2F36]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-[0.15em] text-gray-500">
              <span className="bg-[#1B1B1D] px-3">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-[#1B1B1D]/50 border-[#2B2F36] hover:bg-white/5 hover:border-white/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <img className="h-4 w-4 mr-2" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" />
            )}
            Sign in with Google
          </Button>
        </div>
      </form>

      <div className="text-center text-sm text-[#7F8C8D]">
        Don't have an account?{' '}
        <Link to="/signup" className="text-[#03AAC7] hover:text-[#26BFD4] transition-colors font-medium">
          Sign up
        </Link>
      </div>
    </>
  );

  if (layout === 'plain') {
    return (
      <div className="space-y-8">
        {cardContent}
        {formContent}
      </div>
    );
  }

  return (
    <div className="relative bg-[#1B1B1D] rounded-2xl border border-[#2B2F36] shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-8 space-y-8 max-w-md w-full">
      {/* Close button */}
      <Link
        to="/"
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
      >
        <X className="w-5 h-5" />
      </Link>

      <div className="space-y-8">
        {cardContent}
        {formContent}
      </div>
    </div>
  );
};

export default SignInForm;









