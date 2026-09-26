import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  ShieldCheck,
  UserCheck,
  LogOut,
  Compass,
  Menu,
  X,
  Palette,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const isSurveyorOrAdmin = user?.role === 'Surveyor' || user?.role === 'Admin';

  const navLinks = [
    { name: '3D Explorer', path: '/explore', icon: Compass, roles: null },
    { name: user?.role === 'Admin' ? 'Admin Dashboard' : 'Surveyor Dashboard', path: '/surveyor', icon: FileCheck2, roles: ['Surveyor', 'Admin'] },
    { name: 'Flag Queue', path: '/flags', icon: AlertTriangle, roles: ['Surveyor', 'Admin'] },
    { name: 'User Management', path: '/admin/users', icon: UserCheck, roles: ['Admin'] },
    { name: 'Validate ULPIN', path: '/validate', icon: ShieldCheck, roles: null },
  ].filter((link) => {
    if (!link.roles) return true;
    if (!user) return false;
    return link.roles.includes(user.role);
  });

  return (
    <header className="sticky top-0 z-40 w-full bg-[#071426]/95 border-b border-[#243B53] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#38BDF8]/40 group-hover:border-[#38BDF8] transition-colors shadow-sm shadow-[#38BDF8]/20">
            <img src="/favicon.png" alt="GeoMesh" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-[#F8FAFC] leading-none">GEOMESH</span>
              <span className="text-[10px] font-mono font-black text-[#071426] bg-[#38BDF8] px-1.5 py-0.5 rounded leading-none">3D</span>
            </div>
            <div className="text-[9px] font-mono text-[#94A3B8] tracking-tight -mt-0.5 hidden xl:block">
              3D CADASTRAL INTELLIGENCE
            </div>
          </div>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-xs mx-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-[#64748B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location, ULPIN..."
              className="w-full pl-8 pr-3 py-1.5 text-[11px] font-mono bg-[#0B1F33] border border-[#243B53] rounded-lg text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8] transition-colors"
            />
          </div>
        </form>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-0.5 text-[11px] font-mono shrink-0">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'text-[#38BDF8] bg-[#10253D] font-semibold border border-[#38BDF8]/30 shadow-sm shadow-[#38BDF8]/10'
                    : 'text-[#94A3B8] border border-transparent hover:text-[#F8FAFC] hover:bg-[#0B1F33] hover:border-[#243B53]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Role Switcher, Theme Switcher & Auth Section */}
        <div className="hidden sm:flex items-center gap-2 shrink-0 ml-auto">
          <div className="w-px h-6 bg-[#243B53]" />

          {/* Theme Palette Switcher */}
          <ThemeSwitcher />

          <div className="w-px h-6 bg-[#243B53]" />

          {isAuthenticated && (
            <div className="flex items-center gap-1.5">
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-[11px] font-mono text-[#94A3B8] hover:text-[#38BDF8] hover:border-[#38BDF8]/40 transition-colors px-2.5 py-1.5 rounded-lg bg-[#0B1F33] border border-[#243B53]"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
                <span className="truncate max-w-[100px]">{user?.username}</span>
              </Link>
              <button
                onClick={() => logout()}
                title="Log Out"
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#EF4444] hover:bg-[#0B1F33] transition-colors border border-transparent hover:border-[#EF4444]/30"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden sm:ml-0 ml-auto p-2 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#0B1F33] border border-[#243B53]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#243B53] bg-[#071426] px-4 py-4 space-y-3 font-mono text-xs">
          <form onSubmit={handleSearch} className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location, ULPIN..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#0B1F33] border border-[#243B53] rounded-lg text-[#F8FAFC]"
              />
            </div>
          </form>

          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#94A3B8] hover:text-[#38BDF8] hover:bg-[#0B1F33]"
              >
                <link.icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            ))}
          </div>

          {/* Mobile Theme Selector */}
          <div className="pt-2 border-t border-[#243B53] flex items-center justify-between">
            <span className="text-[11px] text-[#64748B]">Color Theme:</span>
            <ThemeSwitcher align="left" />
          </div>

        </div>
      )}
    </header>
  );
};
