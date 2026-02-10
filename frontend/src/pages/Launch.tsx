import React, { useState } from 'react';
import { api } from '../lib/api';

const Launch: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [duration, setDuration] = useState('14');
  const [chain, setChain] = useState('Solana');
  const [vibe, setVibe] = useState('Serious');
  const [response, setResponse] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    try {
      const message = `Launch request: ${question}. Duration: ${duration} days. Chain: ${chain}. Vibe: ${vibe}.`;
      const res = await api.post('/chat', { message });
      setResponse(res.data.response);
    } catch {
      setResponse('Launch request failed. Make sure the backend is running on http://localhost:8000');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Launch</div>
        <h1 className="mt-2 text-3xl font-semibold text-white">Create a new market</h1>
        <p className="mt-3 text-sm text-slate-300">
          Submit a market idea and start the BizMart flow. This will call the backend agent and return the next step.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Prediction question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-emerald-400/60"
              rows={4}
              placeholder="Will this project reach 50k followers in 90 days?"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Chain</label>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white"
              >
                <option>Solana</option>
                <option>Base</option>
                <option>Monad</option>
                <option>BSC</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.3em] text-slate-400">Vibe</label>
              <select
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white"
              >
                <option>Serious</option>
                <option>Meme</option>
                <option>Experimental</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-emerald-400 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-slate-900 transition hover:bg-emerald-300 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Start Launch Flow'}
          </button>
        </form>
      </div>

      <aside className="lg:col-span-5 space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">BizMart Response</div>
          <p className="mt-4 text-sm text-slate-200 whitespace-pre-wrap">
            {response ?? 'Submit a launch request to see the agent response.'}
          </p>
        </div>
        <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/10 via-slate-950/70 to-slate-950/90 p-5">
          <p className="text-sm text-slate-200">
            On-chain creation is read-only for now. PDA seeds are wired, and write calls will be enabled once the final accounts are confirmed.
          </p>
        </div>
      </aside>
    </section>
  );
};

export default Launch;
