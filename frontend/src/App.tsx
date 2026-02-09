import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, Wallet, Send, Terminal as TerminalIcon, CheckCircle2, Sparkles, TrendingUp, Users, Zap, Shield, Globe, ArrowRight, Play } from 'lucide-react';
import axios from 'axios';

interface Message {
  text: string;
  isBot: boolean;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hey 👋 I'm $BizMart. I help tokenize ideas, businesses, and even careers and launch their prediction markets. Ready?", isBot: true }
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(1);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { text: input, isBot: false };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await axios.post('http://localhost:5001/chat', { message: input });
      setIsTyping(false);
      setMessages(prev => [...prev, { text: response.data.response, isBot: true }]);
      
      // Dynamic step increment
      if (messages.length > 5) setStep(2);
      if (messages.length > 12) setStep(3);
      if (response.data.response.toLowerCase().includes("fund the bizfun wallet") || 
          response.data.response.toLowerCase().includes("10 usdc fee")) {
        setStep(4);
      }
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, { text: "⚠️ Connection error. Make sure the backend is running on http://localhost:8000", isBot: true }]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800/50 pb-6 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <TerminalIcon className="text-emerald-400 w-10 h-10" />
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white">
                  BizFun <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">$BIZMART</span>
                </h1>
                <p className="text-slate-400 text-sm mt-1">AI-Powered Prediction Markets</p>
              </div>
            </div>
            <p className="text-slate-500 text-sm ml-13 max-w-md">
              Let AI agents fund your business, idea, project, startup, or career through tokenized prediction markets
            </p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm px-5 py-3 rounded-xl shadow-lg">
              <span className="text-xs text-slate-400 block uppercase font-semibold tracking-wider">Network</span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                Solana Devnet
              </span>
            </div>
            <button className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-6 py-3 rounded-xl transition-all font-bold text-white shadow-lg shadow-emerald-500/30 active:scale-95 border border-emerald-400/20">
              <Wallet size={20} />
              Connect Wallet
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1600px] mx-auto">
          {/* Progress Tracker (Left) */}
          <aside className="lg:col-span-2 space-y-6 hidden lg:block">
            <div className="bg-slate-900/30 border border-slate-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <TrendingUp size={14} />
                Journey Steps
              </h3>
              <div className="space-y-5">
                {[
                  { id: 1, label: "Discovery", icon: "🔍" },
                  { id: 2, label: "Context", icon: "📋" },
                  { id: 3, label: "Market", icon: "📊" },
                  { id: 4, label: "Launch", icon: "🚀" }
                ].map((s) => (
                  <div key={s.id} className="flex items-center gap-3 transition-all group">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                      step >= s.id 
                        ? 'bg-emerald-500/20 border-2 border-emerald-500' 
                        : 'bg-slate-800/50 border-2 border-slate-700'
                    }`}>
                      {step > s.id ? <CheckCircle2 className="text-emerald-400" size={20} /> : s.icon}
                    </div>
                    <div>
                      <span className={`text-sm font-bold block transition-colors ${
                        step >= s.id ? 'text-white' : 'text-slate-600'
                      }`}>
                        {s.label}
                      </span>
                      {step === s.id && (
                        <span className="text-xs text-emerald-400">In Progress</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 backdrop-blur-sm p-5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="text-emerald-400" size={16} />
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-tight">Revenue Model</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                One-time fee of <span className="font-bold text-emerald-400">10 USDC</span> to deploy your prediction market across <span className="font-bold">3 chains</span> simultaneously.
              </p>
            </div>

            <div className="bg-slate-900/30 border border-slate-800/50 backdrop-blur-sm p-5 rounded-2xl shadow-xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users size={14} />
                Live Stats
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Active Markets</span>
                  <span className="text-sm font-bold text-white">127</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Total Volume</span>
                  <span className="text-sm font-bold text-emerald-400">$45.2K</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">Traders</span>
                  <span className="text-sm font-bold text-white">1,834</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Chat Section (Middle) */}
          <section className="lg:col-span-7 bg-slate-900/40 border border-slate-800/50 backdrop-blur-xl rounded-2xl flex flex-col h-[80vh] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800/50 flex items-center justify-between bg-gradient-to-r from-slate-900/80 to-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80 animate-pulse"></div>
                </div>
                <h2 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                  <TerminalIcon size={16} className="text-emerald-400" />
                  Agent Terminal
                  <span className="text-xs text-slate-500 font-normal">v1.0.0</span>
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs text-slate-400 font-medium">Online</span>
                </div>
                <span className="text-xs text-slate-600 font-mono">PID: 7741</span>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[80%] ${
                    msg.isBot 
                      ? 'bg-slate-800/60 text-slate-100 border border-slate-700/50 rounded-2xl rounded-tl-sm' 
                      : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl rounded-tr-sm shadow-lg shadow-emerald-500/20'
                  } p-4`}>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start animate-in fade-in">
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl rounded-tl-sm p-4">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            <div className="p-5 bg-gradient-to-t from-slate-900/80 to-slate-800/50 border-t border-slate-800/50">
              <div className="flex gap-3 bg-slate-950/50 p-2 rounded-xl border border-slate-700/50 items-center focus-within:border-emerald-500/50 focus-within:shadow-lg focus-within:shadow-emerald-500/10 transition-all">
                <span className="pl-2 text-emerald-400 font-bold text-lg">$</span>
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent border-none px-2 py-3 focus:ring-0 outline-none text-sm text-slate-100 placeholder:text-slate-600"
                />
                <button 
                  onClick={handleSend} 
                  disabled={!input.trim()}
                  className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-emerald-500"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-2 text-center">
                Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400">Enter</kbd> to send
              </p>
            </div>
          </section>

          {/* Info/Markets (Right) */}
          <section className="lg:col-span-3 space-y-6">
            <div className="bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-slate-700/50 backdrop-blur-sm p-6 rounded-2xl shadow-2xl">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide mb-5 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-400" />
                Live Markets
              </h2>
              
              <div className="space-y-4">
                {[
                  { 
                    title: "User Growth", 
                    desc: "Twitter following > 50k in 90 days", 
                    pool: "2,405 USDC",
                    yes: 67,
                    no: 33,
                    ends: "14d"
                  },
                  { 
                    title: "Revenue Milestone", 
                    desc: "Hit $3,000 MRR in 30 days", 
                    pool: "1,120 USDC",
                    yes: 42,
                    no: 58,
                    ends: "7d"
                  },
                  { 
                    title: "Product Launch", 
                    desc: "Ship MVP before Q2 2025", 
                    pool: "890 USDC",
                    yes: 78,
                    no: 22,
                    ends: "21d"
                  }
                ].map((m, i) => (
                  <div key={i} className="group cursor-pointer hover:scale-[1.02] transition-transform">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{m.title}</span>
                      <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                        {m.ends} left
                      </span>
                    </div>
                    <div className="bg-slate-800/40 group-hover:bg-slate-800/60 border border-slate-700/50 group-hover:border-slate-600/50 p-4 rounded-xl transition-all">
                      <p className="text-xs text-slate-200 font-medium mb-3 leading-relaxed">"{m.desc}"</p>
                      
                      {/* Yes/No Progress */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-emerald-400 font-semibold">YES {m.yes}%</span>
                          <span className="text-red-400 font-semibold">NO {m.no}%</span>
                        </div>
                        <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500" style={{width: `${m.yes}%`}}></div>
                          <div className="bg-red-500" style={{width: `${m.no}%`}}></div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-700/30">
                        <span className="text-xs text-slate-500 font-medium">Pool: {m.pool}</span>
                        <div className="flex gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-xl text-sm font-semibold text-slate-300 transition-all">
                View All Markets →
              </button>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-xl">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Multi-Chain Deploy</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Solana', status: 'Primary' },
                  { name: 'Base', status: 'Via Clanker' },
                  { name: 'Monad', status: 'Via nad.fun' },
                  { name: 'BSC', status: 'Via four.meme' }
                ].map(chain => (
                  <div key={chain.name} className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-lg hover:border-emerald-500/30 hover:bg-slate-800/60 transition-all cursor-pointer group">
                    <div className="text-xs font-bold text-white mb-1">{chain.name}</div>
                    <div className="text-[10px] text-slate-500 group-hover:text-emerald-400 transition-colors">{chain.status}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 backdrop-blur-sm p-5 rounded-2xl">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Sparkles size={14} />
                Agent Features
              </h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>AI-powered market creation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Multi-chain deployment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Automated social marketing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span>Real-time settlement</span>
                </li>
              </ul>
            </div>
          </section>
        </main>
        
        {/* Footer */}
        <footer className="mt-12 text-center text-slate-600 text-xs uppercase tracking-wider font-semibold border-t border-slate-800/50 pt-8">
          <p className="mb-2">No promises. No guarantees. Just public experimentation.</p>
          <p className="text-slate-700">© 2024 BIZFUN • Built on Solana</p>
        </footer>
      </div>
    </div>
  );
};

export default App;