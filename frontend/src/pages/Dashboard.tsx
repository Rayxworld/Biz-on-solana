import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

type Stats = {
  active_markets: number;
  total_volume: string;
  total_traders: number;
  markets_resolved: number;
};

type ProgramStatus = {
  program_id: string;
  exists: boolean;
  executable?: boolean;
  owner?: string;
  lamports?: number;
  error?: string;
};

type ProgramAccounts = {
  program_id: string;
  accounts: { pubkey: string; lamports: number; owner: string }[];
  error?: string;
};

type DashboardProps = {
  walletAddress: string | null;
};

const Dashboard: React.FC<DashboardProps> = ({ walletAddress }) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [programStatus, setProgramStatus] = useState<ProgramStatus | null>(null);
  const [programAccounts, setProgramAccounts] = useState<ProgramAccounts | null>(null);

  useEffect(() => {
    api.get('/stats').then((res) => setStats(res.data)).catch(() => setStats(null));
    api.get('/program/status').then((res) => setProgramStatus(res.data)).catch(() => setProgramStatus(null));
    api.get('/program/accounts').then((res) => setProgramAccounts(res.data)).catch(() => setProgramAccounts(null));
  }, []);

  return (
    <section className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Wallet</div>
          <p className="mt-3 text-sm text-slate-200">
            {walletAddress ? `Connected: ${walletAddress}` : 'Not connected. Use Connect Wallet in the header.'}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Program Status</div>
          <p className="mt-3 text-sm text-slate-200">
            {programStatus?.error ?? (programStatus?.exists ? 'Program is deployed and reachable.' : 'Program not found.')}
          </p>
          {programStatus?.program_id && (
            <div className="mt-4 text-xs text-slate-400">
              Program ID: <span className="text-slate-200">{programStatus.program_id}</span>
            </div>
          )}
          {programStatus?.owner && (
            <div className="mt-2 text-xs text-slate-400">
              Owner: <span className="text-slate-200">{programStatus.owner}</span>
            </div>
          )}
        </div>
      </div>

      <aside className="lg:col-span-5 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Platform Stats</div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
              <div className="text-lg font-semibold text-white">{stats?.active_markets ?? '—'}</div>
              Active Markets
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
              <div className="text-lg font-semibold text-white">{stats?.total_volume ?? '—'}</div>
              Total Volume
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
              <div className="text-lg font-semibold text-white">{stats?.total_traders ?? '—'}</div>
              Traders
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
              <div className="text-lg font-semibold text-white">{stats?.markets_resolved ?? '—'}</div>
              Resolved
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Program Accounts</div>
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            {programAccounts?.accounts?.length ? (
              programAccounts.accounts.slice(0, 5).map((acc) => (
                <div key={acc.pubkey} className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3">
                  <div className="text-[11px] text-slate-500">{acc.pubkey}</div>
                  <div className="mt-1 text-[10px] text-slate-400">Lamports: {acc.lamports}</div>
                </div>
              ))
            ) : (
              <div className="text-slate-500">No program accounts found.</div>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
};

export default Dashboard;
