import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })));
const QuestionDetail = lazy(() => import('./pages/QuestionDetail').then((m) => ({ default: m.QuestionDetail })));
const StudyLists = lazy(() => import('./pages/StudyLists').then((m) => ({ default: m.StudyLists })));
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const Shorts = lazy(() => import('./pages/Shorts').then((m) => ({ default: m.Shorts })));
const LearningGraph = lazy(() => import('./pages/LearningGraph').then((m) => ({ default: m.LearningGraph })));
const LearningHarness = lazy(() => import('./pages/LearningHarness').then((m) => ({ default: m.LearningHarness })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));

const RouteLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh] p-8 text-xs font-mono text-slate-400">
    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />
    <span>Loading module...</span>
  </div>
);

function AppLayout() {
  const location = useLocation();
  const isShorts = location.pathname.startsWith('/shorts');

  return (
    <div className={`min-h-screen bg-[#080c14] flex flex-col font-sans text-slate-200 ${isShorts ? '' : 'engineering-grid'}`}>
      {!isShorts && <Navbar />}

      <main className={isShorts ? 'flex-1 w-full h-[100dvh] overflow-hidden' : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8'}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/shorts" element={<ProtectedRoute><Shorts /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="/questions/:id" element={<ProtectedRoute><QuestionDetail /></ProtectedRoute>} />
            <Route path="/study-lists" element={<ProtectedRoute><StudyLists /></ProtectedRoute>} />
            <Route path="/learning-map" element={<ProtectedRoute><LearningGraph /></ProtectedRoute>} />
            <Route path="/harness" element={<ProtectedRoute><LearningHarness /></ProtectedRoute>} />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer (hidden on immersive Shorts page) */}
      {!isShorts && (
        <footer
          className="border-t border-slate-800 bg-[#06090f] py-6 mt-16"
          style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center shadow-sm">
                <span className="text-[10px] text-white font-mono font-bold">C</span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                Clario: computer science engineering workbench
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
              <span>React 18</span>
              <span>Express</span>
              <span>MongoDB</span>
              <span>Redis</span>
              <span className="text-slate-400">SSE streaming</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
