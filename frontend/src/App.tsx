import React, { useMemo, useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Wallet, Terminal as TerminalIcon } from 'lucide-react';
import AppShell from './components/AppShell';
import Home from './pages/Home';
import Terminal from './pages/Terminal';
import Markets from './pages/Markets';
import Launch from './pages/Launch';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  const isPhantomAvailable = useMemo(() => Boolean(window.solana?.isPhantom), []);

  const handleConnect = async () => {
    if (!isPhantomAvailable) {
      window.open('https://phantom.app/', '_blank');
      return;
    }
    if (walletAddress) {
      await window.solana?.disconnect();
      setWalletAddress(null);
      return;
    }

    try {
      setIsConnecting(true);
      const resp = await window.solana?.connect();
      if (resp?.publicKey) {
        setWalletAddress(resp.publicKey.toString());
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Wallet connect failed', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <AppShell>
      <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <TerminalIcon className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">BizMart Studio</div>
            <div className="text-sm font-semibold text-white">AI Prediction Markets</div>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-full border px-4 py-2 ${isActive ? 'border-emerald-400/60 text-emerald-200' : 'border-white/10 text-slate-400 hover:text-white'}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/terminal"
            className={({ isActive }) =>
              `rounded-full border px-4 py-2 ${isActive ? 'border-emerald-400/60 text-emerald-200' : 'border-white/10 text-slate-400 hover:text-white'}`
            }
          >
            Terminal
          </NavLink>
          <NavLink
            to="/markets"
            className={({ isActive }) =>
              `rounded-full border px-4 py-2 ${isActive ? 'border-emerald-400/60 text-emerald-200' : 'border-white/10 text-slate-400 hover:text-white'}`
            }
          >
            Markets
          </NavLink>
          <NavLink
            to="/launch"
            className={({ isActive }) =>
              `rounded-full border px-4 py-2 ${isActive ? 'border-emerald-400/60 text-emerald-200' : 'border-white/10 text-slate-400 hover:text-white'}`
            }
          >
            Launch
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `rounded-full border px-4 py-2 ${isActive ? 'border-emerald-400/60 text-emerald-200' : 'border-white/10 text-slate-400 hover:text-white'}`
            }
          >
            Dashboard
          </NavLink>
        </nav>

        <button
          onClick={handleConnect}
          className="flex items-center gap-2 rounded-full bg-emerald-400/90 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60"
          disabled={isConnecting}
        >
          <Wallet size={16} />
          {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'Connect Wallet'}
        </button>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/terminal" element={<Terminal />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/launch" element={<Launch />} />
        <Route path="/dashboard" element={<Dashboard walletAddress={walletAddress} />} />
      </Routes>
    </AppShell>
  );
};

export default App;
