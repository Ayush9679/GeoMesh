import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, User, Mail, Lock, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup({ fullName, username, email, password, role: 'Citizen' });
      navigate('/explore');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#071426] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#10253D] border border-[#38BDF8]/40 flex items-center justify-center mx-auto shadow-lg shadow-[#38BDF8]/10">
            <UserPlus className="w-6 h-6 text-[#38BDF8]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
            NEW CADASTRAL REGISTRATION
          </h1>
          <p className="text-xs font-mono text-[#94A3B8]">
            Create a citizen account
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-2xl bg-[#0B1F33] border border-[#243B53] shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-center gap-2 text-xs font-mono text-[#EF4444]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Vikramaditya Singh"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-[#10253D] border border-[#243B53] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-1">
                Cadastral Handle / Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. vikram_surveyor"
                className="w-full px-3 py-2 text-xs font-mono bg-[#10253D] border border-[#243B53] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="v.singh@cadastral.gov.in"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-[#10253D] border border-[#243B53] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#94A3B8] uppercase mb-1">
                Security Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-[#10253D] border border-[#243B53] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#38BDF8] text-[#071426] font-mono font-bold text-xs tracking-wider uppercase hover:bg-[#60A5FA] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#38BDF8]/10"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>CREATE CITIZEN ACCOUNT</span>
            </button>
          </form>
        </div>

        <div className="text-center font-mono text-xs text-[#64748B]">
          Already have credentials?{' '}
          <Link to="/login" className="text-[#38BDF8] hover:underline">
            Officer Login
          </Link>
        </div>
      </div>
    </div>
  );
};
