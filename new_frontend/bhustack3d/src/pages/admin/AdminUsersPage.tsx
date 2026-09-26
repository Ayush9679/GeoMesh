import React, { useState } from 'react';
import { request } from '../../services/api';

export const AdminUsersPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'surveyor' | 'admin'>('surveyor');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const user = await request<{ email: string; role: string }>('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });
      setMessage(`Created ${user.role} account for ${user.email}.`);
      setEmail('');
      setPassword('');
      setRole('surveyor');
    } catch (err: any) {
      setError(err?.message || 'Account creation failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#071426] px-4 py-8 text-[#F8FAFC] sm:px-8">
      <section className="mx-auto max-w-xl space-y-4 rounded-xl border border-[#243B53] bg-[#0B1F33] p-5">
        <header>
          <p className="font-mono text-xs text-[#38BDF8]">PLATFORM ADMINISTRATION</p>
          <h1 className="mt-1 text-2xl font-bold">Create staff account</h1>
          <p className="mt-1 text-sm text-[#94A3B8]">Create a surveyor or another administrator account.</p>
        </header>
        {error && <p role="alert" className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        {message && <p role="status" className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm text-[#94A3B8]">Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded border border-[#243B53] bg-[#071426] px-3 py-2 text-white" />
          </label>
          <label className="block text-sm text-[#94A3B8]">Password
            <input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded border border-[#243B53] bg-[#071426] px-3 py-2 text-white" />
          </label>
          <label className="block text-sm text-[#94A3B8]">Role
            <select value={role} onChange={(event) => setRole(event.target.value as 'surveyor' | 'admin')} className="mt-1 w-full rounded border border-[#243B53] bg-[#071426] px-3 py-2 text-white">
              <option value="surveyor">Surveyor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button disabled={busy} className="rounded-lg bg-[#38BDF8] px-4 py-2 font-semibold text-[#071426] disabled:opacity-50">
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
};
