import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

interface Message {
  text: string;
  isBot: boolean;
}

type Stats = {
  active_markets: number;
  total_volume: string;
  total_traders: number;
  markets_resolved: number;
};

const Home: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hey, I'm $BizMart. I help tokenize ideas, businesses, and even careers and launch their prediction markets. Ready?", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/stats').then((res) => setStats(res.data)).catch(() => setStats(null));
    api.post('/reset').catch(() => undefined);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { text: input, isBot: false };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.post('/chat', { message: input });
      setIsTyping(false);
      setMessages((prev) => [...prev, { text: response.data.response, isBot: true }]);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { text: 'Connection error. Make sure the backend is running on http://localhost:8000', isBot: true }
      ]);
    }
  };

  return (
    <main className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <section className="lg:col-span-7 space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)]">
          <div className="text-sm uppercase tracking-[0.35em] text-slate-400">BizMart Studio</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-6xl font-['Space_Grotesk']">
            A premium interface for launching prediction markets.
          </h1>
          <p className="mt-4 text-sm text-slate-300 md:text-base">
            Tokenize ideas, founders, and products into liquid markets. Build a narrative, fund a thesis, and launch in minutes.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/launch"
              className="rounded-full bg-emerald-400/90 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-900 transition hover:bg-emerald-300"
            >
              Launch Market
            </Link>
            <Link
              to="/markets"
              className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:bg-white/10"
            >
              Explore Markets
            </Link>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] overflow-hidden flex flex-col h-[60vh]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-rose-400/80"></div>
                <div className="h-3 w-3 rounded-full bg-amber-300/80"></div>
                <div className="h-3 w-3 rounded-full bg-emerald-300/90"></div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Agent Terminal</div>
                <div className="text-[11px] text-slate-500">Operational v1.0.0</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              Online
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.isBot
                    ? 'border border-white/10 bg-slate-950/70 text-slate-200'
                    : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 shadow-[0_12px_30px_-18px_rgba(16,185,129,0.9)]'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-slate-500 animate-bounce"></div>
                    <div className="h-2 w-2 rounded-full bg-slate-500 animate-bounce delay-75"></div>
                    <div className="h-2 w-2 rounded-full bg-slate-500 animate-bounce delay-150"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-white/10 bg-slate-950/60 px-5 py-4">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2.5">
              <span className="text-lg font-semibold text-emerald-300">$</span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Describe the market you want to launch..."
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-900 transition hover:bg-emerald-300 disabled:opacity-40"
              >
                Send
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-slate-600">
              Press Enter to send
            </p>
          </div>
        </div>
      </section>

      <aside className="lg:col-span-5 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.35em] text-slate-400">Live Metrics</h2>
            <BarChart3 size={18} className="text-emerald-300" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 text-xs text-slate-300">
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
              Resolved Markets
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 via-slate-950/70 to-slate-950/90 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-200">
            <Sparkles size={14} />
            Premium Launch
          </div>
          <p className="mt-3 text-sm text-slate-200">
            One-time fee of <span className="font-semibold text-emerald-300">10 USDC</span> to deploy on three chains with managed liquidity and automated marketing.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
            <TrendingUp size={14} />
            Launch Path
          </div>
          <div className="mt-4 space-y-3 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span>Discovery</span>
              <span className="text-emerald-300">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Context</span>
              <span className="text-slate-500">Queued</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Market</span>
              <span className="text-slate-500">Queued</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Launch</span>
              <span className="text-slate-500">Queued</span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
};

export default Home;
