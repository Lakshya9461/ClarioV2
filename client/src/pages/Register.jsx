import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Mail,
  Lock,
  User,
  GraduationCap,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      await register({ name, email, password, role });
      navigate('/');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
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
              Create Clario Account
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-sans">
              Join the cognitive engineering workspace to ask concepts and curate study lists.
            </p>
          </div>
        </div>

        {/* Register Card */}
        <div className="panel-elevated p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg transition-colors font-sans"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                Academic / Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@university.edu"
                  className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg transition-colors font-sans"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-[#080c14] border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white placeholder:text-slate-500 pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg transition-colors font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
                Workspace Role
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    role === 'student'
                      ? 'bg-blue-600/15 border-blue-500/40 text-blue-300 font-semibold'
                      : 'bg-[#080c14] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <User className="w-3.5 h-3.5 text-blue-400" /> Engineer
                  </div>
                  <div className="text-[10px] text-slate-500">Learner & Researcher</div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    role === 'teacher'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                      : 'bg-[#080c14] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" /> Faculty
                  </div>
                  <div className="text-[10px] text-slate-500">Instructor & Analytics</div>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="text-center text-xs text-slate-500 font-sans">
          Already registered?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
            Sign In Here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
