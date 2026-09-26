import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CadastralProvider } from './context/CadastralContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/LandingPage';
import { ValidatePage } from './pages/ValidatePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { FlagQueuePage } from './pages/surveyor/FlagQueuePage';
import { CitizenRegistryPage } from './pages/CitizenRegistryPage';
import { SurveyorRecordsPage } from './pages/surveyor/SurveyorRecordsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';

// Gate for pages that require an authenticated session. Unauthenticated
// visitors are bounced to /login, and get sent back to where they were
// headed once they sign in (see LoginPage's `from` handling).
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, sessionExpired } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-[#64748B] text-sm font-mono">
        Verifying session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname, sessionExpired }} />;
  }

  return <>{children}</>;
};

const RoleRoute: React.FC<{ children: React.ReactNode; allowed: Array<'Citizen' | 'Surveyor' | 'Admin'> }> = ({ children, allowed }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="p-8 text-center text-[#94A3B8]">Verifying session...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!user || !allowed.includes(user.role)) return <Navigate to={user?.role === 'Citizen' ? '/explore' : '/surveyor'} replace />;
  return <>{children}</>;
};

const ExploreByRole: React.FC = () => {
  return <CitizenRegistryPage />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CadastralProvider>
          <div className="min-h-screen flex flex-col bg-[#071426] text-[#F8FAFC] selection:bg-[#38BDF8]/25 selection:text-[#38BDF8]">
            <Navbar />
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/explore"
                  element={
                    <ProtectedRoute>
                      <ExploreByRole />
                    </ProtectedRoute>
                  }
                />
                <Route path="/validate" element={<ValidatePage />} />
                <Route
                  path="/surveyor"
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowed={['Surveyor', 'Admin']}><SurveyorRecordsPage /></RoleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route path="/surveyor/records" element={<ProtectedRoute><RoleRoute allowed={['Surveyor', 'Admin']}><SurveyorRecordsPage /></RoleRoute></ProtectedRoute>} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowed={['Admin']}><SurveyorRecordsPage /></RoleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route path="/admin/users" element={<ProtectedRoute><RoleRoute allowed={['Admin']}><AdminUsersPage /></RoleRoute></ProtectedRoute>} />
                <Route
                  path="/flags"
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowed={['Surveyor', 'Admin']}><FlagQueuePage /></RoleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </CadastralProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
