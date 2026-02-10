import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';

interface Message {
  text: string;
  isBot: boolean;
}

type StepKind = 'text' | 'select' | 'confirm';

type Step = {
  key: string;
  label: string;
  prompt: string;
  kind: StepKind;
  options?: string[];
  optional?: boolean;
  placeholder?: string;
};

const steps: Step[] = [
  {
    key: 'type',
    label: 'Type',
    prompt: 'What are we tokenizing?',
    kind: 'select',
    options: ['Business', 'Startup', 'Idea', 'Career', 'Experiment'],
  },
  {
    key: 'name',
    label: 'Name',
    prompt: 'What is the project name?',
    kind: 'text',
    placeholder: 'BizFun AI',
  },
  {
    key: 'socials',
    label: 'Socials',
    prompt: 'Share any socials (X, LinkedIn, website). You can skip this.',
    kind: 'text',
    optional: true,
    placeholder: 'https://x.com/bizfunai',
  },
  {
    key: 'description',
    label: 'Description',
    prompt: 'Give a short pitch (2–3 sentences).',
    kind: 'text',
    placeholder: 'We are building an AI agent for prediction markets.',
  },
  {
    key: 'value_audience',
    label: 'Value & Audience',
    prompt: 'Who is this for, and what value do you deliver?',
    kind: 'text',
    placeholder: 'Startup founders and crypto builders; automated market creation.',
  },
  {
    key: 'stage',
    label: 'Stage',
    prompt: 'What stage are you at?',
    kind: 'select',
    options: ['Idea', 'Building', 'Launched', 'Making Money', 'Growing'],
  },
  {
    key: 'prediction_type',
    label: 'Prediction',
    prompt: 'What should the market predict?',
    kind: 'select',
    options: ['Revenue', 'Sales', 'Growth', 'Followers'],
  },
  {
    key: 'prediction_question',
    label: 'Question',
    prompt: 'Write the prediction in plain English.',
    kind: 'text',
    placeholder: 'Will we reach $3k MRR in 30 days?',
  },
  {
    key: 'duration',
    label: 'Duration',
    prompt: 'How long should the market run?',
    kind: 'select',
    options: ['7 days', '14 days', '30 days'],
  },
  {
    key: 'chain',
    label: 'Chain',
    prompt: 'Choose a chain.',
    kind: 'select',
    options: ['Solana', 'Base', 'Monad', 'BSC'],
  },
  {
    key: 'vibe',
    label: 'Vibe',
    prompt: 'Pick a vibe for the launch.',
    kind: 'select',
    options: ['Meme', 'Serious', 'Experimental'],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    prompt: 'How should we market this? You can skip this.',
    kind: 'select',
    optional: true,
    options: ['MoltBook', 'AI debates', 'Reply chaos', 'Chaos mode'],
  },
  {
    key: 'wallet',
    label: 'Settlement Wallet',
    prompt: 'Drop a USDC settlement address.',
    kind: 'text',
    placeholder: 'Your USDC address',
  },
  {
    key: 'confirm',
    label: 'Confirm',
    prompt: 'Review your details and confirm to launch.',
    kind: 'confirm',
  },
];

const introMessage =
  "Hey, I'm $BizMart. I help tokenize ideas, businesses, and even careers and launch their prediction markets. Ready?";

const Terminal: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([{ text: introMessage, isBot: true }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [currentKey, setCurrentKey] = useState<string>('type');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const currentStep = useMemo(() => steps.find((step) => step.key === currentKey) ?? steps[0], [currentKey]);

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

  const rebuildTranscript = (nextAnswers: Record<string, string>, nextKey: string) => {
    const nextMessages: Message[] = [{ text: introMessage, isBot: true }];

    steps.forEach((step) => {
      if (step.key === 'confirm') {
        return;
      }
      const value = nextAnswers[step.key];
      if (value) {
        nextMessages.push({ text: step.prompt, isBot: true });
        nextMessages.push({ text: value === 'skipped' ? 'Skipped' : value, isBot: false });
        return;
      }
      if (step.key === nextKey) {
        nextMessages.push({ text: step.prompt, isBot: true });
      }
    });

    if (nextKey === 'confirm') {
      nextMessages.push({ text: steps[steps.length - 1].prompt, isBot: true });
    }

    setMessages(nextMessages);
  };

  const refreshState = async () => {
    try {
      const res = await api.get('/state');
      const collected = res.data?.collected ?? {};
      const missing: string[] = res.data?.missing ?? [];
      const nextKey = missing.length ? missing[0] : 'confirm';
      setAnswers(collected);
      setCurrentKey(nextKey);
      rebuildTranscript(collected, nextKey);
    } catch {
      // ignore
    }
  };

  const sendValue = async (value: string) => {
    if (!value.trim()) return;
    setIsTyping(true);
    try {
      await api.post('/chat', { message: value.trim() });
      await refreshState();
    } catch {
      setMessages((prev) => [
        ...prev,
        { text: 'Connection error. Make sure the service is running at http://localhost:8000', isBot: true },
      ]);
    } finally {
      setIsTyping(false);
      setInput('');
    }
  };

  const handleSend = async () => {
    if (currentStep.kind === 'confirm') {
      await sendValue('confirm');
      return;
    }
    await sendValue(input);
  };

  const handleOptionClick = async (option: string) => {
    await sendValue(option);
  };

  const handleSkip = async () => {
    await sendValue('skip');
  };

  const handleReset = async () => {
    try {
      await api.post('/reset');
    } finally {
      setInput('');
      setAnswers({});
      setCurrentKey('type');
      rebuildTranscript({}, 'type');
      scrollToBottom();
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  const summaryItems = useMemo(() => {
    const formatValue = (value?: string) => {
      if (!value) return '—';
      return value === 'skipped' ? 'Skipped' : value;
    };

    return [
      { label: 'Type', value: formatValue(answers.type) },
      { label: 'Name', value: formatValue(answers.name) },
      { label: 'Socials', value: formatValue(answers.socials) },
      { label: 'Description', value: formatValue(answers.description) },
      { label: 'Value & Audience', value: formatValue(answers.value_audience) },
      { label: 'Stage', value: formatValue(answers.stage) },
      { label: 'Prediction', value: formatValue(answers.prediction_type) },
      { label: 'Question', value: formatValue(answers.prediction_question) },
      { label: 'Duration', value: formatValue(answers.duration) },
      { label: 'Chain', value: formatValue(answers.chain) },
      { label: 'Vibe', value: formatValue(answers.vibe) },
      { label: 'Marketing', value: formatValue(answers.marketing) },
      { label: 'Wallet', value: formatValue(answers.wallet) },
    ];
  }, [answers]);

  return (
    <section className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 rounded-[32px] border border-white/10 bg-white/5 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] overflow-hidden flex flex-col h-[70vh]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">BizMart Terminal</div>
            <div className="text-[11px] text-slate-500">Guided Session</div>
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
            <div
              key={i}
              className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.isBot
                    ? 'border border-white/10 bg-slate-950/70 text-slate-200'
                    : 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-900 shadow-[0_12px_30px_-18px_rgba(16,185,129,0.9)]'
                }`}
              >
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
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold text-emerald-300">$</span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{currentStep.label}</span>
              <div className="flex-1 min-w-[220px] text-sm text-slate-200">{currentStep.prompt}</div>
              {currentStep.kind === 'confirm' && (
                <button
                  onClick={handleSend}
                  className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-900 transition hover:bg-emerald-300"
                >
                  Confirm
                </button>
              )}
            </div>

            {currentStep.kind === 'select' && (
              <div className="flex flex-wrap gap-2">
                {currentStep.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleOptionClick(option)}
                    className="rounded-full border border-white/10 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10"
                  >
                    {option}
                  </button>
                ))}
                {currentStep.optional && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:bg-white/10"
                  >
                    Skip
                  </button>
                )}
              </div>
            )}

            {currentStep.kind === 'text' && (
              <div className="flex flex-wrap items-start gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={currentStep.placeholder ?? 'Type your answer...'}
                  className="flex-1 min-w-[240px] bg-transparent text-sm text-slate-100 placeholder:text-slate-600 outline-none resize-none rounded-xl border border-white/10 px-3 py-2"
                  rows={2}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-900 transition hover:bg-emerald-300 disabled:opacity-40"
                  >
                    Send
                  </button>
                  {currentStep.optional && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      className="rounded-full border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-300 hover:bg-white/10"
                    >
                      Skip
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside className="lg:col-span-4 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Terminal Help</div>
          <pre className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-200 whitespace-pre-wrap">
{`bizmart --help

USAGE:
  Answer one question at a time.
  Use the buttons for choices.
  Press Enter to send.
  Shift+Enter adds a new line.

NOTES:
  Socials and Marketing are optional.
  You can skip them anytime.`}
          </pre>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Form View</div>
          <div className="mt-4 space-y-3 text-xs text-slate-200">
            {summaryItems.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{item.label}</div>
                <div className="mt-1 text-sm text-slate-100 break-words">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
};

export default Terminal;
