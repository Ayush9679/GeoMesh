import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { ShieldCheck, Lock, Mail, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { AuthScene3D } from '../components/cadastral-3d/AuthScene3D';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { user } = useAuth();
  const rawRedirect = (location.state as { from?: string } | null)?.from;
  const showSessionExpired = (location.state as { sessionExpired?: boolean } | null)?.sessionExpired === true;

  const [email, setEmail] = useState('surveyor.demo@GeoMesh.local');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Surveyor');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password, role);
      // Route based on role from the auth response
      const loggedInRole = (res?.user?.role || role).toLowerCase();
      if (rawRedirect) {
        navigate(rawRedirect);
      } else if (loggedInRole === 'citizen') {
        navigate('/explore');
      } else {
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err?.status === 401
        ? 'Email or password is incorrect.'
        : err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[calc(100vh-4rem)] relative bg-[#071426] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Animated 3D cadastral globe background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AuthScene3D />
      </div>
      {/* Vignette so the form stays readable over the 3D scene */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(7,20,38,0.35) 0%, rgba(7,20,38,0.85) 65%, rgba(7,20,38,0.97) 100%)',
        }}
      />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[#10253D] border border-[#38BDF8]/40 flex items-center justify-center mx-auto shadow-lg shadow-[#38BDF8]/10">
            <ShieldCheck className="w-6 h-6 text-[#38BDF8]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
            SURVEYOR AUTHENTICATION
          </h1>
          <p className="text-xs font-medium text-[#94A3B8]">
            Authorized Access to 3D Cadastral Records & Field Mutation
          </p>
        </div>

        {/* Form Card */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0B1F33]/95 backdrop-blur-sm border border-[#243B53] shadow-2xl space-y-5">
          {showSessionExpired && (
            <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-center gap-2 text-xs font-medium text-[#EF4444]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Your session has expired. Please log in again.</span>
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-center gap-2 text-xs font-medium text-[#EF4444]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Select */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] uppercase mb-1.5 tracking-wide">
                Designated Credential Role
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Citizen', 'Surveyor', 'Admin'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      if (r === 'Surveyor') setEmail('surveyor@GeoMesh.gov.in');
                      else if (r === 'Admin') setEmail('admin@GeoMesh.gov.in');
                      else setEmail('citizen@example.com');
                    }}
                    className={`py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                      role === r
                        ? 'bg-[#38BDF8] text-[#071426] font-bold border-white'
                        : 'bg-[#10253D] text-[#94A3B8] border-[#243B53] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] uppercase mb-1 tracking-wide">
                Official Identifier / Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="surveyor@GeoMesh.gov.in"
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-[#10253D] border border-[#243B53] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-[#94A3B8] uppercase mb-1 tracking-wide">
                Security Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-[#10253D] border border-[#243B53] rounded-lg text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#38BDF8] text-[#071426] font-bold text-xs tracking-wider uppercase hover:bg-[#60A5FA] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#38BDF8]/10"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>AUTHENTICATE SESSION</span>
            </button>
          </form>

        </div>

        <div className="text-center font-medium text-xs text-[#64748B]">
          Need new field credentials?{' '}
          <Link to="/signup" className="text-[#38BDF8] hover:underline">
            Register / Create Citizen Account
          </Link>
        </div>
      </div>
    </div>
  );
};
