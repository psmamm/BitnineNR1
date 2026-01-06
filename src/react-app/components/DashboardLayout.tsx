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
        ? 'bg-[#0D0F18] text-white' 
        : 'bg-[#F5F7FA] text-gray-900'
    }`}>
      {/* Top Navigation */}
      <TopNavigation />

      {/* Main Content */}
      <main className="min-h-screen pt-16">
        <div className="p-4 lg:p-8 pt-4 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
