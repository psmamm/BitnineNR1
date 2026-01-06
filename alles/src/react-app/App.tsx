import { lazy, Suspense, ReactNode, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageCurrencyProvider } from "./contexts/LanguageCurrencyContext";
import LoadingSpinner from "@/react-app/components/LoadingSpinner";
import ErrorBoundary from "@/react-app/components/ErrorBoundary";
import ProtectedRoute from "@/react-app/components/ProtectedRoute";

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

const LayoutProbe = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  useEffect(() => {
    const doc = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const main = document.querySelector('main') ?? document.querySelector('section');
    const rect = main?.getBoundingClientRect();
    const style = main ? window.getComputedStyle(main) : null;

    // #region agent log
    emitDebugLog({
      sessionId: 'debug-session',
      runId: 'layout-run1',
      hypothesisId: 'H9',
      location: 'App.tsx:LayoutProbe',
      message: 'Route layout bounds',
      data: {
        path: location.pathname,
        viewportWidth: window.innerWidth,
        docClientWidth: doc.clientWidth,
        docScrollWidth: doc.scrollWidth,
        mainWidth: rect?.width,
        mainLeft: rect?.left,
        mainRight: rect?.right,
        hasOverflow: doc.scrollWidth > doc.clientWidth
      },
      timestamp: Date.now()
    });
    // #endregion

    // #region agent log
    emitDebugLog({
      sessionId: 'debug-session',
      runId: 'layout-run1',
      hypothesisId: 'H10',
      location: 'App.tsx:LayoutProbe',
      message: 'Backgrounds',
      data: {
        path: location.pathname,
        bodyBg: window.getComputedStyle(body).backgroundColor,
        rootBg: root ? window.getComputedStyle(root).backgroundColor : null,
        mainBg: style?.backgroundImage || style?.backgroundColor || null
      },
      timestamp: Date.now()
    });
    // #endregion

    // #region agent log
    emitDebugLog({
      sessionId: 'debug-session',
      runId: 'layout-run1',
      hypothesisId: 'H11',
      location: 'App.tsx:LayoutProbe',
      message: 'Padding and margins',
      data: {
        path: location.pathname,
        mainPaddingInline: style?.paddingInline,
        mainMarginInline: style?.marginInline,
        rootPaddingLeft: root ? window.getComputedStyle(root).paddingLeft : null,
        rootPaddingRight: root ? window.getComputedStyle(root).paddingRight : null
      },
      timestamp: Date.now()
    });
    // #endregion
  }, [location.pathname]);

  return <>{children}</>;
};

// Lazy load all pages for better performance
const HomePage = lazy(() => import("@/react-app/pages/Home"));
const DashboardPage = lazy(() => import("@/react-app/pages/Dashboard"));
const JournalPage = lazy(() => import("@/react-app/pages/Journal"));
const ReportsPage = lazy(() => import("@/react-app/pages/Reports"));
// const OrderHeatmapPage = lazy(() => import("@/react-app/pages/OrderHeatmap")); // Temporarily disabled
const StrategiesPage = lazy(() => import("@/react-app/pages/Strategies"));
const SettingsPage = lazy(() => import("@/react-app/pages/Settings"));
// const BitcoinHalvingPage = lazy(() => import("@/react-app/pages/BitcoinHalving")); // Temporarily disabled
const USDebtPage = lazy(() => import("@/react-app/pages/USDebt"));
const StudyPage = lazy(() => import("@/react-app/pages/Study"));
const AlphaHubPage = lazy(() => import("@/react-app/pages/AlphaHub"));
const MarketsPage = lazy(() => import("@/react-app/pages/Markets"));
const CoinDetailPage = lazy(() => import("@/react-app/pages/CoinDetail"));
const CompetitionPage = lazy(() => import("@/react-app/pages/competition/index"));
const CompetitionPlayPage = lazy(() => import("@/react-app/pages/competition/Play"));
const MatchmakingPage = lazy(() => import("@/react-app/pages/competition/Matchmaking"));
const DailyChallengePage = lazy(() => import("@/react-app/pages/competition/DailyChallenge"));
const TournamentsPage = lazy(() => import("@/react-app/pages/competition/Tournaments"));
const TournamentDetailsPage = lazy(() => import("@/react-app/pages/competition/TournamentDetails"));
const MatchCompletePage = lazy(() => import("@/react-app/pages/competition/MatchComplete"));
const LeaderboardPage = lazy(() => import("@/react-app/pages/competition/Leaderboard"));
const LoginPage = lazy(() => import("@/react-app/pages/Login"));
const SignupPage = lazy(() => import("@/react-app/pages/Signup"));
const ForgotPasswordPage = lazy(() => import("@/react-app/pages/ForgotPassword"));
const AuthActionPage = lazy(() => import("@/react-app/pages/AuthAction"));

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageCurrencyProvider>
          <Router>
          <Suspense fallback={<LoadingSpinner />}>
            <LayoutProbe>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/auth-action" element={<AuthActionPage />} />

                {/* Protected Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } />
                <Route path="/journal" element={
                  <ProtectedRoute>
                    <JournalPage />
                  </ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <ReportsPage />
                  </ProtectedRoute>
                } />

                <Route path="/markets" element={
                  <ProtectedRoute>
                    <MarketsPage />
                  </ProtectedRoute>
                } />
                <Route path="/markets/:symbol" element={
                  <ProtectedRoute>
                    <CoinDetailPage />
                  </ProtectedRoute>
                } />
                {/* Temporarily disabled - Order Heatmap */}
                {/* <Route path="/order-heatmap" element={
                  <ProtectedRoute>
                    <OrderHeatmapPage />
                  </ProtectedRoute>
                } /> */}

                <Route path="/strategies" element={
                  <ProtectedRoute>
                    <StrategiesPage />
                  </ProtectedRoute>
                } />
                {/* Temporarily disabled - Bitcoin Halving */}
                {/* <Route path="/bitcoin-halving" element={
                  <ProtectedRoute>
                    <BitcoinHalvingPage />
                  </ProtectedRoute>
                } /> */}
                <Route path="/us-debt" element={
                  <ProtectedRoute>
                    <USDebtPage />
                  </ProtectedRoute>
                } />
                <Route path="/study" element={
                  <ProtectedRoute>
                    <StudyPage />
                  </ProtectedRoute>
                } />
                <Route path="/alpha-hub" element={
                  <ProtectedRoute>
                    <AlphaHubPage />
                  </ProtectedRoute>
                } />
                <Route path="/competition" element={
                  <ProtectedRoute>
                    <CompetitionPage />
                  </ProtectedRoute>
                } />
                <Route path="/competition/play" element={
                  <ProtectedRoute>
                    <CompetitionPlayPage />
                  </ProtectedRoute>
                } />
                <Route path="/competition/matchmaking" element={
                  <ProtectedRoute>
                    <MatchmakingPage />
                  </ProtectedRoute>
                } />
                <Route path="/competition/match-complete" element={
                  <ProtectedRoute>
                    <MatchCompletePage />
                  </ProtectedRoute>
                } />
                <Route path="/competition/daily-challenge" element={
                  <ProtectedRoute>
                    <DailyChallengePage />
                  </ProtectedRoute>
                } />
                <Route path="/competition/tournaments" element={
                  <ProtectedRoute>
                    <TournamentsPage />
                  </ProtectedRoute>
                } />
                <Route path="/competition/tournaments/:id" element={
                  <ProtectedRoute>
                    <TournamentDetailsPage />
                  </ProtectedRoute>
                } />
                <Route path="/competition/leaderboard" element={
                  <ProtectedRoute>
                    <LeaderboardPage />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                } />
              </Routes>
            </LayoutProbe>
          </Suspense>
        </Router>
        </LanguageCurrencyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
