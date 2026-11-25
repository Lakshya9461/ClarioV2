import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Home } from './pages/Home';
import { History } from './pages/History';
import { QuestionDetail } from './pages/QuestionDetail';
import { StudyLists } from './pages/StudyLists';
import { Analytics } from './pages/Analytics';
import { Shorts } from './pages/Shorts';
import { LearningGraph } from './pages/LearningGraph';
import { LearningHarness } from './pages/LearningHarness';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

function AppLayout() {
  const location = useLocation();
  const isShorts = location.pathname.startsWith('/shorts');

  return (
    <div className={`min-h-screen bg-[#080c14] flex flex-col font-sans text-slate-200 ${isShorts ? '' : 'engineering-grid'}`}>
      {!isShorts && <Navbar />}

      <main className={isShorts ? 'flex-1 w-full h-[100dvh] overflow-hidden' : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8'}>
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
      </main>

      {/* Footer (hidden on immersive Shorts page) */}
      {!isShorts && (
        <footer className="border-t border-slate-800 bg-[#06090f] py-6 mt-16">
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
