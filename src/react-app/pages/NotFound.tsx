import DashboardLayout from "@/react-app/components/DashboardLayout";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-4"
        >
          {/* 404 Icon */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-32 h-32 mx-auto mb-8 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#FCD535]/20 to-[#FCD535]/5 rounded-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Search className="w-16 h-16 text-[#FCD535]" />
            </div>
            {/* Floating elements */}
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-[#F43F5E] rounded-full flex items-center justify-center text-white text-xs font-bold"
            >
              ?
            </motion.div>
          </motion.div>

          {/* Error Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-6xl font-bold text-white mb-4">404</h1>
            <h2 className="text-xl font-semibold text-white mb-2">Page Not Found</h2>
            <p className="text-[#9CA3AF] mb-8">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#1B1B1D] border border-[#2B2F36] hover:border-[#3A3E45] text-white rounded-lg font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#FCD535] hover:bg-[#FFE066] text-[#151517] rounded-lg font-semibold transition-colors"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </button>
          </motion.div>

          {/* Helpful Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-12 pt-8 border-t border-[#2B2F36]"
          >
            <p className="text-[#6B7280] text-sm mb-4">Popular pages:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: 'Trading', path: '/trading' },
                { label: 'Markets', path: '/markets' },
                { label: 'Assets', path: '/assets' },
                { label: 'Settings', path: '/settings' },
              ].map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="px-3 py-1.5 text-sm text-[#9CA3AF] hover:text-white hover:bg-[#1B1B1D] rounded-lg transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
