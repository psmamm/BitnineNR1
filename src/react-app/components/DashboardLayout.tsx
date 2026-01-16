import { ReactNode } from 'react';
import TopNavigation from './TopNavigation';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen overflow-x-hidden transition-colors ${
      theme === 'dark'
        ? 'bg-[#151517] text-white'
        : 'bg-[#151517] text-white'
    }`}>
      {/* Top Navigation */}
      <TopNavigation />

      {/* Main Content */}
      <main className="min-h-screen pt-16">
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}







