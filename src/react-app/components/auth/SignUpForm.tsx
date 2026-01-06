import { useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Check } from 'lucide-react';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength criteria
const PASSWORD_CRITERIA = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lowercase', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
];

// Error message mapping
const getErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/operation-not-allowed': 'Sign up is currently disabled. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
  };
  return errorMessages[errorCode] || 'Failed to create an account. Please try again.';
};

export const SignUpForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Validate email
  const validateEmail = useCallback((value: string) => {
    const isValid = EMAIL_REGEX.test(value);
    setIsEmailValid(isValid);
    return isValid;
  }, []);

  // Calculate password strength
  const passwordStrength = useMemo(() => {
    const passed = PASSWORD_CRITERIA.filter(c => c.test(password)).length;
    return {
      score: passed,
      percentage: (passed / PASSWORD_CRITERIA.length) * 100,
      label: passed === 0 ? '' : passed <= 1 ? 'Weak' : passed <= 2 ? 'Fair' : passed <= 3 ? 'Good' : 'Strong',
      color: passed <= 1 ? 'bg-red-500' : passed <= 2 ? 'bg-yellow-500' : passed <= 3 ? 'bg-blue-500' : 'bg-[#2ECC71]',
    };
  }, [password]);

  // Check if passwords match
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

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

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
  };

  const handleConfirmPasswordBlur = () => {
    setConfirmPasswordTouched(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      setEmailTouched(true);
      return;
    }

    // Check password strength
    if (passwordStrength.score < 3) {
      setError('Please create a stronger password.');
      setPasswordTouched(true);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      setConfirmPasswordTouched(true);
      return;
    }

    // Check terms acceptance
    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password);
      if (error) throw error;
      navigate('/verify-email');
    } catch (error: any) {
      const errorMessage = error.code 
        ? getErrorMessage(error.code) 
        : (error.message || 'Failed to create an account');
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
    } catch (error: any) {
      const errorMessage = error.code 
        ? getErrorMessage(error.code) 
        : (error.message || 'Failed to sign up with Google');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-[#1E2232] rounded-2xl border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-8 space-y-8 max-w-md w-full">
      {/* Close button */}
      <Link
        to="/"
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
      >
        <X className="w-5 h-5" />
      </Link>

      <div className="space-y-6">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] uppercase tracking-[0.2em] text-gray-400">
            Join Tradecircle
          </div>
          <h2 className="text-3xl font-extrabold text-white">Create a new account</h2>
          <p className="text-sm text-[#7F8C8D]">Handle trades, PnL and your strategies in one place.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Email Field */}
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
                  className={`w-full rounded-xl border bg-[#0D0F18]/50 px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                    emailTouched
                      ? isEmailValid
                        ? 'border-[#2ECC71]/50 focus:ring-[#2ECC71]/50 focus:border-[#2ECC71]/50'
                        : 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-[#6A3DF4]/50 focus:border-[#6A3DF4]/50'
                  }`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                />
                {emailTouched && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {isEmailValid ? (
                      <CheckCircle className="w-4 h-4 text-[#2ECC71]" />
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

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-[#AAB0C0] font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-[#0D0F18]/50 px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6A3DF4]/50 focus:border-[#6A3DF4]/50 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {passwordTouched && password.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden mr-3">
                      <div 
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${passwordStrength.percentage}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.score <= 1 ? 'text-red-400' : 
                      passwordStrength.score <= 2 ? 'text-yellow-400' : 
                      passwordStrength.score <= 3 ? 'text-blue-400' : 'text-[#2ECC71]'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {PASSWORD_CRITERIA.map(criteria => (
                      <div 
                        key={criteria.id}
                        className={`flex items-center gap-1.5 text-xs ${
                          criteria.test(password) ? 'text-[#2ECC71]' : 'text-[#7F8C8D]'
                        }`}
                      >
                        {criteria.test(password) ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <div className="w-3 h-3 rounded-full border border-current" />
                        )}
                        <span>{criteria.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm text-[#AAB0C0] font-medium">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  aria-invalid={confirmPasswordTouched && !passwordsMatch}
                  className={`w-full rounded-xl border bg-[#0D0F18]/50 px-4 py-3 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                    confirmPasswordTouched && confirmPassword.length > 0
                      ? passwordsMatch
                        ? 'border-[#2ECC71]/50 focus:ring-[#2ECC71]/50 focus:border-[#2ECC71]/50'
                        : 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50'
                      : 'border-white/10 focus:ring-[#6A3DF4]/50 focus:border-[#6A3DF4]/50'
                  }`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={handleConfirmPasswordBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPasswordTouched && confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-400 mt-1">Passwords don't match</p>
              )}
              {confirmPasswordTouched && passwordsMatch && (
                <p className="text-xs text-[#2ECC71] mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Passwords match
                </p>
              )}
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <div className="relative mt-0.5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="peer sr-only"
              />
              <label
                htmlFor="terms"
                className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border-2 border-white/20 bg-white/5 transition-all duration-200 hover:border-[#6A3DF4]/50 hover:bg-[#6A3DF4]/10 peer-checked:border-[#6A3DF4] peer-checked:bg-[#6A3DF4] peer-focus-visible:ring-2 peer-focus-visible:ring-[#6A3DF4]/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#1E2232]"
              >
                <svg
                  className="h-3 w-3 text-white transition-opacity duration-200"
                  style={{ opacity: acceptedTerms ? 1 : 0 }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </label>
            </div>
            <label htmlFor="terms" className="ml-3 text-sm text-[#AAB0C0] cursor-pointer select-none leading-tight hover:text-white/80 transition-colors">
              I agree to the{' '}
              <Link to="/terms" className="text-[#6A3DF4] hover:text-[#8A5CFF] transition-colors">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-[#6A3DF4] hover:text-[#8A5CFF] transition-colors">
                Privacy Policy
              </Link>
            </label>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#6A3DF4] hover:bg-[#8A5CFF] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Sign up'
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-[0.15em] text-gray-500">
                <span className="bg-[#1E2232] px-3">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-[#0D0F18]/50 px-4 py-3 text-sm font-medium text-white hover:bg-white/5 hover:border-white/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <img className="h-5 w-5" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" />
              )}
              Sign up with Google
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-[#7F8C8D]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#6A3DF4] hover:text-[#8A5CFF] transition-colors font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;
