import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';

interface Message {
  text: string;
  isBot: boolean;
}

const Terminal: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { text: "Hey, I'm $BizMart. I help tokenize ideas, businesses, and even careers and launch their prediction markets. Ready?", isBot: true }
  ]);
  const [input, setInput] = useState('');
  const [currentField, setCurrentField] = useState('Type');
  const [currentPrompt, setCurrentPrompt] = useState('Type: Business | Startup | Idea | Career | Experiment');
  const [isTyping, setIsTyping] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    return remaining < 120;
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    if (isNearBottom()) {
      scrollToBottom();
      setShowJump(false);
    } else {
      setShowJump(true);
    }
  }, [messages, isTyping]);

  const fieldOrder = [
    'Type',
    'Name',
    'Socials',
    'Description',
    'Audience/Value',
    'Stage',
    'Prediction',
    'Question',
    'Duration',
    'Chain',
    'Vibe',
    'Marketing',
    'Wallet',
  ];

  const promptMap: Record<string, string> = {
    Type: 'Type: Business | Startup | Idea | Career | Experiment',
    Name: 'Name: <project name>',
    Socials: 'Socials: <X / LinkedIn / website links>',
    Description: 'Description: <short pitch>',
    'Audience/Value': 'Audience/Value: <who + value delivered>',
    Stage: 'Stage: Idea | Building | Launched | Making Money | Growing',
    Prediction: 'Prediction: Revenue | Sales | Growth | Followers',
    Question: 'Question: <plain English prediction>',
    Duration: 'Duration: 7 | 14 | 30 days',
    Chain: 'Chain: Solana | Base | Monad | BSC',
    Vibe: 'Vibe: Meme | Serious | Experimental',
    Marketing: 'Marketing: MoltBook | AI debates | Reply chaos | Chaos mode',
    Wallet: 'Wallet: <USDC address>',
  };

  const refreshState = async () => {
    try {
      const res = await api.get('/state');
      const missing = res.data?.missing ?? [];
      if (missing.length) {
        const raw = missing[0].replace('_', ' ');
        const normalized = raw.toLowerCase() === 'value audience'
          ? 'Audience/Value'
          : raw.replace(/\b\w/g, (m: string) => m.toUpperCase());
        const match = fieldOrder.find((f) => f.toLowerCase() === normalized.toLowerCase());
        if (match) {
          setCurrentField(match);
          setCurrentPrompt(promptMap[match] ?? `${match}:`);
        }
      } else {
        setCurrentField('Confirm');
        setCurrentPrompt('Confirm: type confirm to launch');
      }
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const prepared = input.trim();
    const userMsg = { text: `${currentField}: ${prepared}`, isBot: false };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.post('/chat', { message: prepared });
      setIsTyping(false);
      setMessages((prev) => [...prev, { text: response.data.response, isBot: true }]);
      await refreshState();
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        { text: 'Connection error. Make sure the service is running at http://localhost:8000', isBot: true }
      ]);
    }
  };

  const handleReset = async () => {
    try {
      await api.post('/reset');
    } finally {
      setMessages([
        {
          text:
            "Hey, I'm $BizMart. I help tokenize ideas, businesses, and even careers and launch their prediction markets. Ready?",
          isBot: true
        }
      ]);
      setInput('');
      scrollToBottom();
      await refreshState();
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  return (
    <section className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 rounded-[32px] border border-white/10 bg-white/5 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] overflow-hidden flex flex-col h-[70vh]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">BizMart Terminal</div>
            <div className="text-[11px] text-slate-500">Live Session</div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-300 hover:bg-white/10"
          >
            Start Over
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
          <div ref={bottomRef} />
        </div>

        {showJump && (
          <div className="px-5 pb-2">
            <button
              type="button"
              onClick={scrollToBottom}
              className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-300 hover:bg-white/10"
            >
              Jump to latest
            </button>
          </div>
        )}

        <div className="border-t border-white/10 bg-slate-950/60 px-5 py-4">
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2.5">
            <span className="text-lg font-semibold text-emerald-300">$</span>
            <span className="rounded-xl border border-white/10 bg-slate-900/60 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">
              {currentField}
            </span>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your answer... (Enter to send, Shift+Enter for new line)"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-600 outline-none resize-none"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-900 transition hover:bg-emerald-300 disabled:opacity-40"
            >
              Send
            </button>
            {(currentField === 'Socials' || currentField === 'Marketing') && (
              <button
                type="button"
                onClick={() => setInput('skip')}
                className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-300 hover:bg-white/10"
              >
                Skip
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">{currentPrompt}</p>
        </div>
      </div>

      <aside className="lg:col-span-4 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Terminal Help</div>
          <pre className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-200 whitespace-pre-wrap">
{`bizmart --help

USAGE:
  One field at a time. The label is locked above the input.
  Just type the value and press Enter.

  Example:
  Type -> Business
  Name -> BizFun AI
  Socials -> https://x.com/bizfunai

TIP:
  Optional fields (Socials, Marketing) can be skipped with: skip`}
          </pre>
        </div>
      </aside>
    </section>
  );
};

export default Terminal;
