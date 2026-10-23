import React, { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  showNav?: boolean;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  showNav = true,
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090B18] text-slate-800 dark:text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-violet-500/30 selection:text-violet-900 dark:selection:text-white transition-colors duration-200">
      {/* Ambient background glow layers */}
      <div className="fixed top-[-10rem] left-[20%] w-[35rem] h-[35rem] bg-violet-600/5 dark:bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-[30%] right-[-10rem] w-[30rem] h-[30rem] bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="fixed bottom-[-10rem] left-[10%] w-[40rem] h-[40rem] bg-cyan-600/5 dark:bg-cyan-600/8 rounded-full blur-[160px] pointer-events-none" />

      {showNav && <Navbar />}

      <main className={`flex-1 relative z-10 ${className}`}>
        {children}
      </main>

      <footer className="border-t border-slate-200 dark:border-white/[0.05] py-8 text-center text-xs text-slate-500 relative z-10 bg-white/60 dark:bg-[#090B18]/60 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 LearnMate • Personalised AI Learning Workspace</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Deterministic Scoring</span>
            <span>•</span>
            <span>PyMuPDF Grounded</span>
            <span>•</span>
            <span>Powered by Gemini</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
