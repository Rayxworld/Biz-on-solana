import React from 'react';

type AppShellProps = {
  children: React.ReactNode;
};

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#0B0F14] text-slate-100 font-['IBM_Plex_Sans']">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-48 left-[20%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.12),rgba(11,15,20,0))] blur-3xl" />
        <div className="absolute -bottom-32 right-[8%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(20,184,166,0.10),rgba(11,15,20,0))] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.03),transparent_35%,rgba(255,255,255,0.015))]" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">{children}</div>
    </div>
  );
};

export default AppShell;
