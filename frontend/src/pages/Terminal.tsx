import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type Step = {
  key: string;
  label: string;
  prompt: string;
  kind: 'text' | 'select';
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
    prompt: 'Share any socials (X, LinkedIn, website). Optional.',
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
    prompt: 'How should we market this? Optional.',
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
];

const Terminal: React.FC = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string>('Fill the form, then submit.');
  const [resultText, setResultText] = useState<string>('');
  const [resultError, setResultError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [currentKey, setCurrentKey] = useState<string>('type');

  const missingKeys = useMemo(() => {
    return steps
      .filter((step) => !step.optional)
      .map((step) => step.key)
      .filter((key) => !values[key]);
  }, [values]);

  const updateValue = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = async () => {
    setValues({});
    setStatus('Fill the form, then submit.');
    setResultText('');
    setResultError('');
    setCurrentKey('type');
    try {
      await api.post('/reset');
    } catch {
      // ignore
    }
  };

  const refreshState = async () => {
    try {
      const res = await api.get('/state');
      const missing: string[] = res.data?.missing ?? [];
      const nextKey = missing.length ? missing[0] : 'confirm';
      setCurrentKey(nextKey);
    } catch {
      // ignore
    }
  };

  const submitForm = async () => {
    if (missingKeys.length) {
      setStatus('Please fill all required fields before submitting.');
      return;
    }
    setSubmitting(true);
    setStatus('Submitting to BizMart...');
    setResultText('');
    setResultError('');
    try {
      await api.post('/reset');
      for (const step of steps) {
        const value = values[step.key];
        if (!value && step.optional) {
          await api.post('/chat', { message: 'skip' });
        } else {
          await api.post('/chat', { message: value });
        }
      }
      const confirmRes = await api.post('/chat', { message: 'confirm' });
      const responseText = confirmRes?.data?.response ?? 'Launch submitted.';
      setResultText(responseText);
      setStatus('Submitted. Review the result panel below.');
      await refreshState();
    } catch {
      setStatus('Connection error. Make sure the service is running at http://localhost:8000');
      setResultError('Unable to reach the backend. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    refreshState();
  }, []);

  const resultDetails = useMemo(() => {
    if (!resultText) {
      return { token: '', market: '', tx: '' };
    }
    const tokenMatch = resultText.match(/token\s+([A-Za-z0-9]+)/i);
    const marketMatch = resultText.match(/market\s+([A-Za-z0-9]+)/i);
    const txMatch =
      resultText.match(/tx(?:hash)?\s*[:#]?\s*([A-Za-z0-9]+)/i) ||
      resultText.match(/transaction\s*[:#]?\s*([A-Za-z0-9]+)/i);
    return {
      token: tokenMatch?.[1] ?? '',
      market: marketMatch?.[1] ?? '',
      tx: txMatch?.[1] ?? '',
    };
  }, [resultText]);

  return (
    <section className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8 rounded-[32px] border border-white/10 bg-white/5 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.9)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-slate-400">BizMart Form</div>
            <div className="text-[11px] text-slate-500">Quick Launch</div>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-300 hover:bg-white/10"
          >
            Reset
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          {steps.map((step) => (
            <div key={step.key} className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{step.label}</div>
                {step.optional && (
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Optional
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm text-slate-300">{step.prompt}</div>

              {step.kind === 'select' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {step.options?.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateValue(step.key, option)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        values[step.key] === option
                          ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200'
                          : 'border-white/10 bg-slate-900/60 text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {step.kind === 'text' && (
                <textarea
                  value={values[step.key] ?? ''}
                  onChange={(e) => updateValue(step.key, e.target.value)}
                  placeholder={step.placeholder ?? 'Type your answer...'}
                  className="mt-3 w-full bg-slate-950/60 text-sm text-slate-100 placeholder:text-slate-600 outline-none resize-none rounded-xl border border-white/10 px-3 py-2"
                  rows={2}
                />
              )}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submitForm}
              disabled={submitting}
              className="rounded-full bg-emerald-400 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit & Launch'}
            </button>
            <span className="text-xs text-slate-500">{status}</span>
          </div>
        </div>
      </div>

      <aside className="lg:col-span-4 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Progress</div>
          <div className="mt-4 space-y-3 text-xs text-slate-200">
            {steps.map((step) => {
              const filled = Boolean(values[step.key]);
              const isMissing = !filled && !step.optional;
              return (
                <div key={step.key} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">{step.label}</div>
                  <div className={`mt-1 text-sm ${filled ? 'text-emerald-200' : isMissing ? 'text-rose-200' : 'text-slate-400'}`}>
                    {filled ? values[step.key] : step.optional ? 'Optional' : 'Required'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Terminal Help</div>
          <pre className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs text-slate-200 whitespace-pre-wrap">
{`bizmart --help

USAGE:
  Fill the form and submit once.
  Optional fields can be left empty.

NOTE:
  The backend will run the launch flow in order.`}
          </pre>
          <div className="mt-4 text-xs text-slate-500">
            Current backend step: <span className="text-slate-300">{currentKey}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Result</div>
          <div className="mt-4 space-y-3 text-sm text-slate-200">
            {resultError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-100">
                {resultError}
              </div>
            )}
            {!resultError && resultText && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 whitespace-pre-wrap">
                {resultText}
              </div>
            )}
            {!resultError && !resultText && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-400">
                Submit the form to see the launch response.
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-xs text-slate-300 space-y-2">
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Transaction Details</div>
            <div>Chain: <span className="text-slate-100">{values.chain ?? '—'}</span></div>
            <div>Duration: <span className="text-slate-100">{values.duration ?? '—'}</span></div>
            <div>Wallet: <span className="text-slate-100">{values.wallet ?? '—'}</span></div>
            <div>Vibe: <span className="text-slate-100">{values.vibe ?? '—'}</span></div>
            <div>Token: <span className="text-slate-100">{resultDetails.token || '—'}</span></div>
            <div>Market: <span className="text-slate-100">{resultDetails.market || '—'}</span></div>
            <div>Tx Hash: <span className="text-slate-100">{resultDetails.tx || '—'}</span></div>
          </div>
        </div>
      </aside>
    </section>
  );
};

export default Terminal;
