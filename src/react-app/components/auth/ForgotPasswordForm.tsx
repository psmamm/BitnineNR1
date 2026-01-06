import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { X, Loader2, AlertCircle, CheckCircle, Mail, ArrowLeft } from 'lucide-react';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cooldown time in seconds
const RESEND_COOLDOWN = 60;

// Error message mapping
const getErrorMessage = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email address.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many requests. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
  };
  return errorMessages[errorCode] || 'Failed to send reset link. Please try again.';
};

export const ForgotPasswordForm = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [emailSent, setEmailSent] = useState(false);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, []);

  // Handle cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            if (cooldownRef.current) {
              clearInterval(cooldownRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
      }
    };
  }, [cooldown]);

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
    // Reset states when email changes
    if (emailSent) {
      setEmailSent(false);
      setMessage('');
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // Validate email
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      setEmailTouched(true);
      return;
    }

    // Check cooldown
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before requesting another link.`);
      return;
    }

    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setMessage('Reset link sent! Check your email inbox.');
      setEmailSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (err: any) {
      const errorMessage = err.code 
        ? getErrorMessage(err.code) 
        : (err?.message || 'Failed to send reset link');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (cooldown === 0) {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }
  };

  return (
    <div className="relative bg-[#1E2232] rounded-2xl border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-8 space-y-8 max-w-md w-full">
      {/* Close button */}
      <Link
        to="/login"
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
        aria-label="Back to login"
      >
        <X className="w-5 h-5" />
      </Link>

      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] uppercase tracking-[0.2em] text-gray-400">
            {emailSent ? 'Email sent' : 'Forgot password'}
          </div>
          <h2 className="text-3xl font-extrabold text-white">
            {emailSent ? 'Check your email' : 'Reset your password'}
          </h2>
          <p className="text-sm text-[#7F8C8D]">
            {emailSent 
              ? `We've sent a password reset link to ${email}`
              : "We'll send you a secure link to reset your password."
            }
          </p>
        </div>

        {/* Email Sent Success State */}
        {emailSent && (
          <div className="space-y-4">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-[#2ECC71]/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-[#2ECC71]" />
              </div>
            </div>

            {/* Success Message */}
            <div className="bg-[#2ECC71]/10 border border-[#2ECC71]/30 text-[#2ECC71] px-4 py-3 rounded-xl text-sm flex items-center gap-2" role="alert">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{message}</span>
            </div>

            {/* Instructions */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <p className="text-sm text-[#AAB0C0] font-medium">Didn't receive the email?</p>
              <ul className="text-xs text-[#7F8C8D] space-y-1">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• Wait a few minutes for the email to arrive</li>
              </ul>
            </div>

            {/* Resend Button */}
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || loading}
              className="w-full rounded-xl border border-white/10 bg-[#0D0F18]/50 px-4 py-3 text-sm font-medium text-white hover:bg-white/5 hover:border-white/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : cooldown > 0 ? (
                <span>Resend link in {cooldown}s</span>
              ) : (
                <span>Resend reset link</span>
              )}
            </button>

            {/* Back to login */}
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 text-[#6A3DF4] hover:text-[#8A5CFF] transition-colors text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to sign in</span>
            </Link>
          </div>
        )}

        {/* Form State (before email sent) */}
        {!emailSent && (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
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
                        : 'border-white/10 focus:ring-[#667eea]/50 focus:border-[#667eea]/50'
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

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className="w-full rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending link...</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>Wait {cooldown}s to resend</span>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>

            <div className="text-center text-sm text-[#7F8C8D]">
              Remembered your password?{' '}
              <Link to="/login" className="text-[#667eea] hover:text-[#764ba2] transition-colors font-medium">
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
