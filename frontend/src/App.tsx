import React, { useMemo, useState } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { Wallet, CandlestickChart } from "lucide-react";
import AppShell from './components/AppShell';
import Home from './pages/Home';
import Markets from './pages/Markets';
import MarketDetail from './pages/MarketDetail';
import { createDummyMintAndAta } from './lib/autoMint';

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
        
        // Auto-mint logic
        const existingMint = localStorage.getItem("bizfi_market_mint");
        const existingAta = localStorage.getItem("bizfi_user_usdc_ata");
        
        if (!existingMint || !existingAta) {
          try {
            const result = await createDummyMintAndAta(window.solana, resp.publicKey.toString());
            if (result) {
              localStorage.setItem("bizfi_market_mint", result.mint);
              localStorage.setItem("bizfi_user_usdc_ata", result.ata);
              console.log("Successfully auto-created token mint and ATA:", result);
            }
          } catch (err) {
            console.error("Auto-mint flow failed:", err);
          }
        }
        
        navigate("/markets");
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <CandlestickChart className="h-5 w-5 text-emerald-300" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-400">BizFi Terminal</div>
            <div className="text-sm font-semibold text-white">AI Co-Pilot for Solana Markets</div>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          <span className="rounded-md border border-sky-400/40 bg-sky-400/10 px-3 py-2 text-[10px] text-sky-200">
            Devnet
          </span>
          <NavLink
            to="/"
            className={({ isActive }) =>
              `rounded-md border px-4 py-2 ${isActive ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200' : 'border-white/10 text-slate-400 hover:text-white'}`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/markets"
            className={({ isActive }) =>
              `rounded-md border px-4 py-2 ${isActive ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200' : 'border-white/10 text-slate-400 hover:text-white'}`
            }
          >
            Markets
          </NavLink>
        </nav>

        <button
          onClick={handleConnect}
          className="flex items-center gap-2 rounded-md bg-emerald-400/90 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-emerald-300 disabled:opacity-60"
          disabled={isConnecting}
        >
          <Wallet size={16} />
          {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : 'Connect Wallet'}
        </button>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/markets" element={<Markets />} />
        <Route path="/markets/:id" element={<MarketDetail walletAddress={walletAddress} />} />
        <Route path="*" element={<Navigate to="/markets" replace />} />
      </Routes>
    </AppShell>
  );
};

export default App;
