// Home page
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';
import {
  TrendingUp,
  Check,
  BarChart3,
  Target,
  Shield,
  X,
  Menu,
  FileText,
  Users,
  Trophy,
  Brain,
  BookOpen,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SignInForm from '../components/auth/SignInForm';

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

const floatingAnimation = {
  y: [0, -20, 0],
};

const floatingTransition = {
  duration: 4,
  repeat: Infinity,
  ease: "easeInOut" as const,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const doc = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const page = pageRef.current;
    const hero = heroRef.current;
    const heroRect = hero?.getBoundingClientRect();
    const pageStyle = page ? window.getComputedStyle(page) : null;

    // #region agent log
    emitDebugLog({
      sessionId: 'debug-session',
      runId: 'home-run2',
      hypothesisId: 'H6',
      location: 'Home.tsx:layout',
      message: 'Viewport vs document dimensions',
      data: {
        viewportWidth: window.innerWidth,
        docClientWidth: doc.clientWidth,
        docScrollWidth: doc.scrollWidth,
        bodyClientWidth: body.clientWidth,
        hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth
      },
      timestamp: Date.now()
    });
    // #endregion

    // #region agent log
    emitDebugLog({
      sessionId: 'debug-session',
      runId: 'home-run2',
      hypothesisId: 'H7',
      location: 'Home.tsx:layout',
      message: 'Backgrounds and padding',
      data: {
        bodyBg: window.getComputedStyle(body).backgroundColor,
        rootBg: root ? window.getComputedStyle(root).backgroundColor : null,
        pageBg: pageStyle?.backgroundImage || pageStyle?.backgroundColor || null,
        pagePadding: {
          left: pageStyle?.paddingLeft,
          right: pageStyle?.paddingRight
        }
      },
      timestamp: Date.now()
    });
    // #endregion

    // #region agent log
    emitDebugLog({
      sessionId: 'debug-session',
      runId: 'home-run2',
      hypothesisId: 'H8',
      location: 'Home.tsx:layout',
      message: 'Hero bounding box',
      data: {
        heroWidth: heroRect?.width,
        heroLeft: heroRect?.left,
        heroRight: heroRect?.right,
        heroPaddingInline: hero ? window.getComputedStyle(hero).paddingInline : null
      },
      timestamp: Date.now()
    });
    // #endregion
  }, [isLoaded]);

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#0D0F18] to-[#1C1F2E]">
        <motion.div
          className="animate-pulse"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <TrendingUp className="w-12 h-12 text-[#6A3DF4]" />
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={pageRef}
      className="min-h-screen bg-gradient-to-br from-[#0D0F18] to-[#1C1F2E] overflow-hidden"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      {/* Header */}
      <motion.header
        className="bg-[#1E2232]/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6 gap-4">
            <motion.div
              className="flex items-center space-x-3 flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <div className="bg-[#6A3DF4] p-2.5 rounded-xl shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">Tradecircle</span>
            </motion.div>

            <nav className="hidden md:flex items-center gap-4 ml-auto">
              <a
                href="#pricing"
                className="text-[#AAB0C0] hover:text-white font-medium transition-all duration-300 whitespace-nowrap"
              >
                Pricing
              </a>
              <a
                href="#features"
                className="text-[#AAB0C0] hover:text-white font-medium transition-all duration-300 whitespace-nowrap"
              >
                Features
              </a>
              {user ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-[#AAB0C0] hover:text-white font-medium transition-all duration-300 whitespace-nowrap"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="bg-[#1E2232] hover:bg-[#2A2F42] border border-white/10 hover:border-white/20 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-300 whitespace-nowrap"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className="bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#1E2232] border-b border-white/5 overflow-hidden"
            >
              <div className="px-4 pt-2 pb-6 space-y-4">
                <a
                  href="#pricing"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-[#AAB0C0] hover:text-white font-medium py-2 transition-colors"
                >
                  Pricing
                </a>
                <a
                  href="#features"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-[#AAB0C0] hover:text-white font-medium py-2 transition-colors"
                >
                  Features
                </a>
                <div className="pt-4 border-t border-white/5 flex flex-col space-y-3">
                  {user ? (
                    <button
                      onClick={() => {
                        navigate('/dashboard');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg"
                    >
                      Dashboard
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setShowLoginModal(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full bg-[#1E2232] hover:bg-[#2A2F42] border border-white/10 hover:border-white/20 text-white px-6 py-3 rounded-xl font-medium transition-all"
                      >
                        Log In
                      </button>
                      <button
                        onClick={() => {
                          navigate('/signup');
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
                      >
                        Sign Up
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative py-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-[#6A3DF4]/10 rounded-full blur-3xl"
            animate={floatingAnimation}
            transition={floatingTransition}
          />
          <motion.div
            className="absolute top-40 right-20 w-96 h-96 bg-[#6A3DF4]/8 rounded-full blur-3xl"
            animate={floatingAnimation}
            transition={{ delay: 1, duration: 4, repeat: Infinity, ease: "easeInOut" as const }}
          />
          <motion.div
            className="absolute bottom-20 left-1/3 w-64 h-64 bg-[#6A3DF4]/5 rounded-full blur-3xl"
            animate={floatingAnimation}
            transition={{ delay: 2, duration: 5, repeat: Infinity, ease: "easeInOut" as const }}
          />
        </div>

        <motion.div
          className="w-full max-w-screen-2xl px-4 sm:px-8 lg:px-12 mx-auto text-center relative z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Icons */}
          <motion.div
            className="flex justify-center items-center space-x-8 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.div
              className="bg-[#1E2232] backdrop-blur-xl p-6 rounded-xl border border-white/5"
              animate={floatingAnimation}
              transition={floatingTransition}
              whileHover={{ scale: 1.1, rotateY: 15 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <BarChart3 className="w-12 h-12 text-[#BDC3C7]" />
            </motion.div>
            <motion.div
              className="bg-[#1E2232] backdrop-blur-xl p-6 rounded-xl border border-white/5"
              animate={floatingAnimation}
              transition={{ delay: 0.5, duration: 3, repeat: Infinity, ease: "easeInOut" as const }}
              whileHover={{ scale: 1.1, rotateY: -15 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Target className="w-12 h-12 text-[#BDC3C7]" />
            </motion.div>
            <motion.div
              className="bg-[#1E2232] backdrop-blur-xl p-6 rounded-xl border border-white/5"
              animate={floatingAnimation}
              transition={{ delay: 1, duration: 3, repeat: Infinity, ease: "easeInOut" as const }}
              whileHover={{ scale: 1.1, rotateY: 15 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Shield className="w-12 h-12 text-[#BDC3C7]" />
            </motion.div>
          </motion.div>

          <motion.h1
            className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            Master Your
            <motion.span
              className="bg-gradient-to-r from-[#6A3DF4] to-[#8A5CFF] bg-clip-text text-transparent block"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                backgroundSize: '200% 200%',
              }}
            >
              Trading Game
            </motion.span>
          </motion.h1>

          <motion.p
            className="text-2xl text-[#AAB0C0] mb-8 max-w-3xl mx-auto leading-relaxed font-light"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            Professional trading analytics platform that helps you become consistently profitable
          </motion.p>

          <motion.div
            className="flex justify-center items-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <motion.button
              onClick={() => navigate('/signup')}
              className="bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-12 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              Start your Journey Now
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold text-white mb-6">Simple Pricing</h2>
            <p className="text-2xl text-[#AAB0C0] font-light">Choose what works for you</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Free Plan */}
            <motion.div
              className="bg-[#1E2232] rounded-xl border border-white/5 p-10 relative group hover:border-white/10 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className="text-center mb-10">
                <h3 className="text-3xl font-bold text-white mb-4">Free</h3>
                <div className="mb-6">
                  <span className="text-6xl font-black text-white">$0</span>
                  <span className="text-[#AAB0C0] ml-2 text-xl">/forever</span>
                </div>
                <p className="text-[#AAB0C0] text-lg">Perfect for getting started</p>
              </div>

              <div className="space-y-4 mb-10">
                {[
                  'Up to 50 trades per month',
                  'Basic analytics dashboard',
                  'Trade journaling',
                  'Community support',
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    <div className="bg-[#2ECC71]/20 rounded-full p-1">
                      <Check className="w-4 h-4 text-[#2ECC71]" />
                    </div>
                    <span className="text-[#AAB0C0]">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={handleGetStarted}
                className="w-full bg-[#1E2232] hover:bg-[#2A2F42] border border-white/20 hover:border-white/30 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started Free
              </motion.button>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              className="bg-[#1E2232] rounded-xl border-2 border-[#6A3DF4]/50 p-10 relative group hover:border-[#6A3DF4]/70 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-[#6A3DF4] text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-10">
                <h3 className="text-3xl font-bold text-white mb-4">Pro</h3>
                <div className="mb-6">
                  <span className="text-6xl font-black text-white">$19.99</span>
                  <span className="text-[#AAB0C0] ml-2 text-xl">/month</span>
                </div>
                <p className="text-[#AAB0C0] text-lg">For serious traders</p>
              </div>

              <div className="space-y-4 mb-10">
                {[
                  'Unlimited trades',
                  'Advanced analytics & reports',
                  'Strategy backtesting',
                  'Trade journaling & analysis',
                  'Competition mode & tournaments',
                  'Alpha Hub access',
                  'Study & educational content',
                  'Trade against other traders',
                  'Win prizes in tournaments',
                  'Custom alerts',
                  'Priority support',
                  'API access',
                  'Export capabilities',
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center space-x-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    viewport={{ once: true }}
                  >
                    <div className="bg-[#6A3DF4]/20 rounded-full p-1">
                      <Check className="w-4 h-4 text-[#6A3DF4]" />
                    </div>
                    <span className="text-[#AAB0C0]">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={handleGetStarted}
                className="w-full bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Free Trial
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold text-white mb-6">Powerful Features</h2>
            <p className="text-2xl text-[#AAB0C0] font-light">Everything you need to succeed</p>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BarChart3,
                title: 'Advanced Analytics',
                description: 'Get deep insights into your trading performance with comprehensive analytics and beautiful charts.',
              },
              {
                icon: Target,
                title: 'Strategy Backtesting',
                description: 'Backtest your strategies against historical data to validate your approach before risking real money.',
              },
              {
                icon: Shield,
                title: 'Risk Management',
                description: 'Track your risk metrics and get alerts when you\'re approaching your limits.',
              },
              {
                icon: FileText,
                title: 'Trade Journaling',
                description: 'Document every trade, analyze your decisions, and learn from your wins and losses with our comprehensive journal.',
              },
              {
                icon: Users,
                title: 'Competition Mode',
                description: 'Trade against other traders in real-time competitions. Win bets and prove your trading skills against the best.',
              },
              {
                icon: Trophy,
                title: 'Tournaments & Prizes',
                description: 'Join trading tournaments and compete for prizes. Climb the leaderboard and win rewards based on your performance.',
              },
              {
                icon: Brain,
                title: 'Alpha Hub',
                description: 'Discover market insights, trading signals, and alpha-generating strategies from top traders and analysts.',
              },
              {
                icon: BookOpen,
                title: 'Study & Learn',
                description: 'Access comprehensive trading courses, tutorials, and educational content to improve your trading skills.',
              },
              {
                icon: Zap,
                title: 'Live Trading',
                description: 'Execute trades in real-time with advanced order types, leverage, and professional trading tools.',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-[#1E2232] rounded-xl border border-white/5 p-8 group hover:border-white/10 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2, duration: 0.8 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -10 }}
              >
                <div className="bg-[#6A3DF4]/10 rounded-xl p-4 w-16 h-16 flex items-center justify-center mb-6">
                  <feature.icon className="w-8 h-8 text-[#BDC3C7]" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-[#AAB0C0] leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold text-white mb-6">Frequently Asked Questions</h2>
            <p className="text-2xl text-[#AAB0C0] font-light">Everything you need to know about Tradecircle</p>
          </motion.div>

          <div className="space-y-4">
            {[
              {
                question: 'What is Tradecircle?',
                answer: 'Tradecircle is a comprehensive trading analytics platform that helps traders become consistently profitable. We offer advanced analytics, strategy backtesting, trade journaling, competition mode, tournaments, and educational content all in one place.',
              },
              {
                question: 'How does Competition Mode work?',
                answer: 'In Competition Mode, you can trade against other traders in real-time. You can place bets on your trades and compete for prizes. Win matches to climb the leaderboard and earn rewards based on your trading performance.',
              },
              {
                question: 'What are Tournaments?',
                answer: 'Tournaments are structured trading competitions where you compete against other traders over a set period. Winners receive prizes based on their performance, including highest P&L, best win rate, and other metrics. Join tournaments to test your skills and win rewards.',
              },
              {
                question: 'How does Strategy Backtesting work?',
                answer: 'Our Strategy Backtesting feature allows you to test your trading strategies against historical market data. You can validate your approach, optimize parameters, and see how your strategy would have performed in the past before risking real money.',
              },
              {
                question: 'What is Trade Journaling?',
                answer: 'Trade Journaling helps you document every trade, analyze your decisions, and learn from your wins and losses. Track your emotions, market conditions, entry/exit reasons, and review your performance to continuously improve your trading skills.',
              },
              {
                question: 'What is Alpha Hub?',
                answer: 'Alpha Hub is your source for market insights, trading signals, and alpha-generating strategies. Discover valuable information from top traders and analysts to help you make better trading decisions and find profitable opportunities.',
              },
              {
                question: 'What educational content is available?',
                answer: 'Our Study section offers comprehensive trading courses, tutorials, quizzes, and educational content covering everything from basics to advanced trading strategies. Learn at your own pace and improve your trading knowledge.',
              },
              {
                question: 'Is there a free plan?',
                answer: 'Yes! We offer a free plan that includes up to 50 trades per month, basic analytics dashboard, trade journaling, access to Study materials, and community support. Perfect for getting started with trading analytics.',
              },
              {
                question: 'What does the Pro plan include?',
                answer: 'The Pro plan includes unlimited trades, advanced analytics & reports, strategy backtesting, trade journaling & analysis, competition mode & tournaments, Alpha Hub access, Study & educational content, ability to trade against other traders, win prizes in tournaments, custom alerts, priority support, API access, and export capabilities.',
              },
              {
                question: 'Can I cancel my subscription anytime?',
                answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your current billing period, and you won\'t be charged for the next period.',
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                className="bg-[#1E2232] rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <button
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left group"
                >
                  <h3 className="text-xl font-semibold text-white group-hover:text-[#6A3DF4] transition-colors pr-8">
                    {faq.question}
                  </h3>
                  <motion.div
                    animate={{ rotate: openFAQ === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown className="w-6 h-6 text-[#AAB0C0] group-hover:text-[#6A3DF4] transition-colors" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFAQ === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-8 pb-6">
                        <p className="text-[#AAB0C0] leading-relaxed">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="bg-[#1E2232] rounded-xl border border-white/10 p-16 text-center relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#6A3DF4]/5 to-[#6A3DF4]/10" />
            <div className="relative z-10">
              <motion.h2
                className="text-5xl font-bold text-white mb-6"
                animate={{
                  textShadow: [
                    '0 0 20px rgba(106, 61, 244, 0.1)',
                    '0 0 30px rgba(106, 61, 244, 0.2)',
                    '0 0 20px rgba(106, 61, 244, 0.1)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" as const }}
              >
                Ready to Transform Your Trading?
              </motion.h2>
              <p className="text-2xl text-[#AAB0C0] mb-8 font-light">
                Join traders who are making a difference
              </p>
              <motion.button
                onClick={handleGetStarted}
                className="bg-[#6A3DF4] hover:bg-[#8A5CFF] text-white px-12 py-5 rounded-xl font-bold text-xl transition-all duration-300 shadow-lg hover:shadow-[0_4px_20px_rgba(106,61,244,0.4)]"
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Your Journey
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E2232]/50 backdrop-blur-xl border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="bg-[#6A3DF4] p-2.5 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Tradecircle</span>
            </div>

            <div className="flex items-center space-x-6">
              <p className="text-[#7F8C8D] text-sm">&copy; 2025 Tradecircle. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative bg-[#1E2232] rounded-2xl shadow-2xl max-w-md w-full border border-white/10"
            >
              {/* Close Button */}
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-4 right-4 text-[#AAB0C0] hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Sign In Form */}
              <div className="p-8">
                <SignInForm layout="plain" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
