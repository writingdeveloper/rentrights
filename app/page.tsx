'use client';
import { useState } from 'react';
import { ResultCard } from '@/components/ResultCard';
import { ConfirmingQuestions } from '@/components/ConfirmingQuestions';
import { Disclaimer } from '@/components/Disclaimer';
import { UserAnswers } from '@/lib/rules/types';

export default function Home() {
  const [address, setAddress] = useState('');
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(addr: string, ans: UserAnswers) {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: addr, answers: ans }) });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Error'); setData(null); }
      else setData(json);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-blue-700">RentRights</h1>
      <p className="text-sm text-gray-500">Know your renter rights in the City of LA — free, no sign-up, nothing stored.</p>

      <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); setAnswers({}); run(address, {}); }}>
        <input className="flex-1 rounded-lg border px-3 py-2" placeholder="1234 S Main St, Los Angeles" value={address} onChange={(e) => setAddress(e.target.value)} />
        <button className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white" disabled={loading}>{loading ? '…' : 'Check'}</button>
      </form>

      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {data && (
        <div className="mt-6">
          <ResultCard result={data.result} />
          {data.result.questions.length > 0 && (
            <ConfirmingQuestions
              questions={data.result.questions}
              answers={answers}
              onAnswer={(next) => { setAnswers(next); run(address, next); }}
            />
          )}
          {data.dataWarnings?.map((w: string, i: number) => (
            <p key={i} className="mt-3 text-xs text-gray-500">{w}</p>
          ))}
          <Disclaimer lastVerified={data.lastVerified} />
        </div>
      )}
    </main>
  );
}
