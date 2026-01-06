import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode, applyActionCode } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AuthLayout } from '../components/auth/AuthLayout';

export default function AuthAction() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [mode, setMode] = useState<string | null>(null);
    const [oobCode, setOobCode] = useState<string | null>(null);

    // State for Password Reset
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [verifiedEmail, setVerifiedEmail] = useState('');

    // State for page initialization
    const [isCheckingCode, setIsCheckingCode] = useState(true);

    useEffect(() => {
        const modeParam = searchParams.get('mode');
        const oobCodeParam = searchParams.get('oobCode');

        if (!modeParam || !oobCodeParam) {
            setError('Invalid link. Missing parameters.');
            setIsCheckingCode(false);
            return;
        }

        setMode(modeParam);
        setOobCode(oobCodeParam);

        const checkCode = async () => {
            try {
                if (modeParam === 'resetPassword') {
                    const email = await verifyPasswordResetCode(auth, oobCodeParam);
                    setVerifiedEmail(email);
                } else if (modeParam === 'verifyEmail') {
                    await applyActionCode(auth, oobCodeParam);
                    setMessage('Email verified successfully! You can now sign in.');
                }
            } catch (err: any) {
                setError(err.message || 'Invalid or expired action code.');
            } finally {
                setIsCheckingCode(false);
            }
        };

        checkCode();
    }, [searchParams]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oobCode) return;

        if (newPassword !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        setLoading(true);
        setError('');

        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setMessage('Password has been reset successfully. Redirecting to login...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const renderContent = () => {
        if (isCheckingCode) {
            return (
                <div className="flex justify-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            );
        }

        if (mode === 'resetPassword') {
            if (message) {
                return (
                    <div className="text-center space-y-4">
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm">
                            {message}
                        </div>
                    </div>
                );
            }

            return (
                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                        {verifiedEmail && <p className="text-gray-400 text-sm mt-1">for {verifiedEmail}</p>}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                className="appearance-none block w-full px-4 py-3 bg-[#1E222D] border border-[#2A2E39] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 sm:text-sm"
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Confirm Password</label>
                            <input
                                type="password"
                                required
                                className="appearance-none block w-full px-4 py-3 bg-[#1E222D] border border-[#2A2E39] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200 sm:text-sm"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#131722] focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_25px_rgba(37,99,235,0.4)]"
                    >
                        {loading ? 'Reseting...' : 'Save New Password'}
                    </button>
                </form>
            );
        }

        if (mode === 'verifyEmail') {
            return (
                <div className="text-center space-y-6">
                    <h2 className="text-2xl font-bold text-white">Email Verification</h2>
                    {message ? (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg text-sm">
                            {message}
                        </div>
                    ) : (
                        <p className="text-gray-400">Verifying your email...</p>
                    )}
                    <Link to="/login" className="inline-block text-blue-400 hover:text-blue-300 font-medium">
                        Back to Sign In
                    </Link>
                </div>
            );
        }

        // Default or Error state
        return (
            <div className="text-center">
                <h2 className="text-xl font-bold text-gray-200 mb-4">Action Request</h2>
                <p className="text-gray-400 mb-6">{error || 'Unknown action'}</p>
                <Link to="/login" className="text-blue-400 hover:text-blue-300">Return to Login</Link>
            </div>
        );
    };

    return (
        <AuthLayout>
            <div className="w-full max-w-md p-8 bg-[#131722] rounded-2xl shadow-2xl border border-[#2A2E39] backdrop-blur-xl relative overflow-hidden">
                {/* Background glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />

                {error && !loading && !isCheckingCode && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {renderContent()}
            </div>
        </AuthLayout>
    );
}
