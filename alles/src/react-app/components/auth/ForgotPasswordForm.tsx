import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

export const ForgotPasswordForm = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setMessage('Reset link sent. Check your email inbox.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative bg-[#1E2232] rounded-2xl border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-8 space-y-8 max-w-md w-full">
      {/* Close button */}
      <Link
        to="/login"
        className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all"
      >
        <X className="w-5 h-5" />
      </Link>

      <div className="space-y-6">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] uppercase tracking-[0.2em] text-gray-400">
            Forgot password
          </div>
          <h2 className="text-3xl font-extrabold text-white">Reset your password</h2>
          <p className="text-sm text-[#7F8C8D]">We'll send you a secure link to reset your password.</p>
        </div>

        {message && (
          <div className="bg-[#2ECC71]/10 border border-[#2ECC71]/30 text-[#2ECC71] px-4 py-3 rounded-xl text-sm" role="alert">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm" role="alert">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="email-address" className="text-sm text-[#AAB0C0] font-medium">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-white/10 bg-[#0D0F18]/50 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#667eea]/50 focus:border-[#667eea]/50 transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending link...' : 'Send reset link'}
          </button>
        </form>

        <div className="text-center text-sm text-[#7F8C8D]">
          Remembered your password?{' '}
          <Link to="/login" className="text-[#667eea] hover:text-[#764ba2] transition-colors font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
