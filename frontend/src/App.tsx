import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, Wallet, Send, Terminal as TerminalIcon, CheckCircle2, Circle } from 'lucide-react';
import axios from 'axios';

interface Message {
  text: string;
  isBot: boolean;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hey 👋 I’m $BizMart. I help tokenize ideas, businesses, and even careers and launch their prediction markets. Ready?", isBot: true }
  ]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState(1);
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

    try {
      const response = await axios.post('http://localhost:8000/chat', { message: input });
      setMessages(prev => [...prev, { text: response.data.response, isBot: true }]);
      
      // Dynamic step increment for demo purposes
      if (messages.length > 5) setStep(2);
      if (messages.length > 12) setStep(3);
      if (response.data.response.toLowerCase().includes("fund the bizfun wallet") || 
          response.data.response.toLowerCase().includes("10 usdc fee")) {
        setStep(4);
      }
    } catch (error) {
      setMessages(prev => [...prev, { text: "Connection error. Is the $BizMart brain running?", isBot: true }]);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-mono p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <TerminalIcon className="text-emerald-500 w-8 h-8" />
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">BizFun <span className="text-emerald-500">$BIZMART</span></h1>
          </div>
          <p className="text-slate-500 text-sm italic">Let AI Agents Fund Your business, Idea, Project, StartUp, Career</p>
        </div>
        <div className="flex gap-4 items-center">
            <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl">
                <span className="text-xs text-slate-500 block uppercase font-bold tracking-widest">Network</span>
                <span className="text-sm font-semibold text-emerald-400">Solana Devnet</span>
            </div>
          <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl transition-all font-bold text-white shadow-lg shadow-emerald-500/20 active:scale-95">
            <Wallet size={18} />
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
        {/* Progress Tracker (Left) */}
        <aside className="lg:col-span-2 space-y-8 hidden lg:block">
            <div className="space-y-6">
                {[
                    { id: 1, label: "Discovery" },
                    { id: 2, label: "Context" },
                    { id: 3, label: "Market" },
                    { id: 4, label: "Launch" }
                ].map((s) => (
                    <div key={s.id} className="flex items-center gap-3 transition-opacity">
                        {step >= s.id ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Circle className="text-slate-700" size={20} />}
                        <span className={`text-sm font-bold uppercase tracking-wider ${step === s.id ? 'text-white' : 'text-slate-600'}`}>
                            {s.label}
                        </span>
                    </div>
                ))}
            </div>
            
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl">
                <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2 leading-tight tracking-tighter">Revenue Model</h4>
                <p className="text-xs text-slate-400 leading-relaxed">$10 USDC one-time fee to deploy across 3 chains.</p>
            </div>
        </aside>

        {/* Chat Section (Middle) */}
        <section className="lg:col-span-6 bg-slate-900/30 border border-slate-800/50 backdrop-blur-xl rounded-2xl flex flex-col h-[75vh] shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="font-bold uppercase tracking-widest text-xs text-slate-400">Agent Terminal v1.0</h2>
            </div>
            <span className="text-[10px] text-slate-600 font-mono">PID: 7741</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end animate-in fade-in slide-in-from-right-4 duration-300'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl font-sans text-sm leading-relaxed ${
                    msg.isBot 
                    ? 'bg-slate-800/80 text-emerald-50 border border-slate-700/50' 
                    : 'bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/10'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-slate-900/50 border-t border-slate-800">
            <div className="flex gap-2 bg-[#020617] p-1 rounded-xl border border-slate-800 items-center focus-within:border-emerald-500/50 transition-colors">
              <span className="pl-3 text-emerald-500 font-bold">$</span>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="talk to $bizmart..."
                className="flex-1 bg-transparent border-none px-2 py-3 focus:ring-0 outline-none text-sm text-emerald-400 placeholder:text-slate-700 uppercase"
              />
              <button onClick={handleSend} className="p-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                <Send size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* Info/Markets (Right) */}
        <section className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <BarChart3 size={16} className="text-emerald-500" />
                Live BizMart Markets
            </h2>
            
            <div className="space-y-4">
              {[
                { title: "User Growth", desc: "Twitter following > 50k", pool: "2,405 USDC" },
                { title: "Revenue", desc: "Hit $3,000 in 30 days", pool: "1,120 USDC" }
              ].map((m, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{m.title}</span>
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Trading</span>
                  </div>
                  <div className="bg-slate-800/20 group-hover:bg-slate-800/40 border border-slate-800/50 p-4 rounded-xl transition-all">
                    <p className="text-xs text-white font-medium mb-3 italic">"{m.desc}"</p>
                    <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Volume: {m.pool}</span>
                        <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#020617] border-2 border-dashed border-slate-800 p-6 rounded-2xl opacity-80">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Meme Utilities</h3>
            <div className="grid grid-cols-2 gap-3">
                {['MoltBook', 'Clanker', 'nad.fun', 'four.meme'].map(tool => (
                    <div key={tool} className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-[10px] font-bold text-slate-400 text-center uppercase hover:text-emerald-400 hover:border-emerald-500/30 transition-all cursor-crosshair">
                        {tool}
                    </div>
                ))}
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer Info */}
      <footer className="mt-12 text-center text-slate-700 text-[10px] uppercase tracking-[0.3em] font-bold">
          No promises. No guarantees. Just public experimentation. &copy; 2024 BIZFUN
      </footer>
    </div>
  );
};

export default App;
