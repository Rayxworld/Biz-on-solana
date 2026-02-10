import React from 'react';

type AppShellProps = {
  children: React.ReactNode;
};

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100 font-['Plus_Jakarta_Sans']">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18),rgba(14,116,144,0))] blur-2xl"></div>
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),rgba(11,13,18,0))] blur-3xl"></div>
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_35%,rgba(255,255,255,0.02))]"></div>
      </div>
      <div className="relative z-10 px-4 py-6 md:px-10 md:py-10">{children}</div>
    </div>
  );
};

export default AppShell;
