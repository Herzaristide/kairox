import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Battle from './components/Battle';
import MonsterManagement from './components/MonsterManagement';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-900'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500'></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to='/login' />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-900'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500'></div>
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to='/dashboard' />;
};

const AppContent: React.FC = () => {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <div className='min-h-screen bg-gray-900'>
        <Routes>
          {/* Public routes */}
          <Route
            path='/login'
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path='/register'
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path='/dashboard'
            element={
              <ProtectedRoute>
                <Navbar />
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path='/monsters'
            element={
              <ProtectedRoute>
                <Navbar />
                <MonsterManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path='/battle'
            element={
              <ProtectedRoute>
                <Navbar />
                <Battle />
              </ProtectedRoute>
            }
          />
          <Route
            path='/shop'
            element={
              <ProtectedRoute>
                <Navbar />
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
                  <h1 className='text-3xl font-bold text-white mb-8'>
                    Monster Shop
                  </h1>
                  <div className='card p-8 text-center'>
                    <p className='text-gray-400'>Shop features coming soon!</p>
                    <p className='text-gray-500 text-sm mt-2'>
                      Buy new monsters, equipment, and upgrades here.
                    </p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path='/settings'
            element={
              <ProtectedRoute>
                <Navbar />
                <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
                  <h1 className='text-3xl font-bold text-white mb-8'>
                    Settings
                  </h1>
                  <div className='card p-8 text-center'>
                    <p className='text-gray-400'>Settings coming soon!</p>
                    <p className='text-gray-500 text-sm mt-2'>
                      Customize your game experience and account settings.
                    </p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path='/' element={<Navigate to='/dashboard' />} />
          <Route path='*' element={<Navigate to='/dashboard' />} />
        </Routes>
      </div>

      {/* Toast notifications */}
      <Toaster
        position='top-right'
        toastOptions={{
          duration: 4000,
          style: {
            background: '#374151',
            color: '#fff',
            border: '1px solid #4B5563',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
