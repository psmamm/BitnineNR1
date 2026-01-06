import { ReactNode } from 'react';
import TopNavigation from './TopNavigation';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {

  return (
    <div className="min-h-screen bg-[#0D0F18] text-white overflow-x-hidden">
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
