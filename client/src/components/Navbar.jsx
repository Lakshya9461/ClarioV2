import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  History,
  BookMarked,
  BarChart2,
  LogOut,
  User,
  Menu,
  X,
  GraduationCap,
  Shield,
  Layers,
  Terminal,
  Video,
  GitBranch,
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isTeacher, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Console', path: '/', icon: Terminal },
    { name: 'Shorts', path: '/shorts', icon: Video },
    { name: 'History', path: '/history', icon: History },
    { name: 'Study Lists', path: '/study-lists', icon: BookMarked },
    { name: 'Learning Map', path: '/learning-map', icon: GitBranch },
    ...(isTeacher || isAdmin
      ? [{ name: 'Analytics', path: '/analytics', icon: BarChart2 }]
      : []),
  ];

  const getRoleBadge = (role) => {
    const configs = {
      teacher: { label: 'Faculty', icon: GraduationCap, cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
      admin:   { label: 'Admin',   icon: Shield,        cls: 'bg-rose-500/10   text-rose-300   border-rose-500/20'   },
      student: { label: 'Engineer',icon: User,          cls: 'bg-blue-500/10   text-blue-300   border-blue-500/20'   },
    };
    const cfg = configs[role] || configs.student;
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border font-medium ${cfg.cls}`}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </span>
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-200 ${
        scrolled
          ? 'bg-[#080c14]/95 backdrop-blur-md border-b border-slate-800/80 shadow-md shadow-black/40'
          : 'bg-[#080c14]/75 backdrop-blur-sm border-b border-slate-800/40'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ── Brand Logo ── */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-mono font-bold text-base shadow-sm group-hover:bg-blue-500 transition-colors">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg tracking-tight text-white leading-none">
                  Clario
                </span>
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/25">
                  CSE
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-500 leading-none mt-1 hidden sm:block tracking-wide">
                COGNITIVE ENGINEERING WORKSTATION
              </p>
            </div>
          </Link>

          {/* ── Desktop Nav Links ── */}
          {user && (
            <nav
              aria-label="Main Navigation"
              className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-[#0e1422] border border-slate-800/80"
            >
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                      isActive
                        ? 'bg-[#182238] text-white shadow-sm border border-slate-700/60'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* ── Right: User Profile & Actions ── */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.name}
                  </div>
                  <div className="flex justify-end mt-1">{getRoleBadge(user.role)}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  aria-label="Sign Out"
                  className="p-2 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-white/[0.05] transition-all"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-xs py-1.5 px-3.5"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* ── Mobile Hamburger ── */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          role="region"
          aria-label="Mobile Navigation Drawer"
          className="md:hidden border-b border-slate-800 bg-[#0c121d] px-4 pt-3 pb-5 space-y-3 animate-fade-in"
        >
          {user && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#141d2e] border border-slate-800 mb-3">
              <div>
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs font-mono text-slate-400">{user.email}</div>
              </div>
              <div>{getRoleBadge(user.role)}</div>
            </div>
          )}

          <div className="space-y-1">
            {user ? (
              navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-300 border border-blue-500/25'
                        : 'text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-blue-400" />
                    <span>{item.name}</span>
                  </Link>
                );
              })
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/[0.04] rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-500/10 rounded-lg"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>

          {user && (
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
