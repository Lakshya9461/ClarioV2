import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Layers, Mail, Lock, Loader2, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg('');
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8 animate-fade-in">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sign In to Clario
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
              Enter your engineering credentials or choose a pre-seeded account below.
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="panel-elevated p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@clario.edu"
                  className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg transition-colors font-sans"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg transition-colors font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-blue-400" /> Demo Credentials
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('student@clario.edu', 'student123')}
                className="p-2.5 rounded-lg bg-[#080c14] hover:bg-[#121929] border border-slate-800 text-left transition-colors"
              >
                <div className="font-semibold text-slate-200">Alex (Student)</div>
                <div className="text-[10px] font-mono text-slate-500">student123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('teacher@clario.edu', 'teacher123')}
                className="p-2.5 rounded-lg bg-[#080c14] hover:bg-[#121929] border border-slate-800 text-left transition-colors"
              >
                <div className="font-semibold text-amber-300">Prof. Chen (Faculty)</div>
                <div className="text-[10px] font-mono text-slate-500">teacher123</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 font-sans">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
