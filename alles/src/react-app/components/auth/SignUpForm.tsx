import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

export const SignUpForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError("Passwords don't match");
    }

    setError('');
    setLoading(true);

    try {
      const { error } = await signUp(email, password);
      if (error) throw error;
      navigate('/verify-email');
    } catch (error: any) {
      setError(error.message || 'Failed to create an account');
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
      setError(error.message || 'Failed to sign up with Google');
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
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm" role="alert">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
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

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-[#AAB0C0] font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0D0F18]/50 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#667eea]/50 focus:border-[#667eea]/50 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm text-[#AAB0C0] font-medium">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-xl border border-white/10 bg-[#0D0F18]/50 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#667eea]/50 focus:border-[#667eea]/50 transition-all"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Sign up'}
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
              <img className="h-5 w-5" src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google logo" />
              Sign up with Google
            </button>
          </div>
        </form>

        <div className="text-center text-sm text-[#7F8C8D]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#667eea] hover:text-[#764ba2] transition-colors font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;
