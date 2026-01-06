import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Firebase handles authentication via popup/redirect
    // This page is kept for compatibility but just redirects to dashboard
    navigate("/dashboard");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0F18] to-[#1C1F2E] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-[#6A3DF4] animate-spin mx-auto mb-4" />
        <p className="text-[#AAB0C0]">Redirecting...</p>
      </div>
    </div>
  );
}
