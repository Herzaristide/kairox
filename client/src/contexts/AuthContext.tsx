import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { User, AuthResponse } from '../types';
import { authApi } from '../services/api';
import { gameSocket } from '../services/socket';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on mount
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Connect to socket with token (with error handling)
        try {
          gameSocket.connect(token);
        } catch (socketError) {
          console.warn('Socket connection failed:', socketError);
          // Don't fail the auth process if socket fails
        }
      } catch (error) {
        console.error('Invalid stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<void> => {
    try {
      console.log('🔄 Attempting login for:', username);
      setLoading(true);
      const authResponse: AuthResponse = await authApi.login(
        username,
        password
      );

      console.log('✅ Login successful:', authResponse.user.username);

      // Store auth data
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('user', JSON.stringify(authResponse.user));

      setUser(authResponse.user);

      // Connect to socket
      try {
        gameSocket.connect(authResponse.token);
        console.log('✅ Socket connected');
      } catch (socketError) {
        console.warn('Socket connection failed after login:', socketError);
        // Don't fail login if socket fails
      }

      toast.success(`Welcome back, ${authResponse.user.username}!`);
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string
  ): Promise<void> => {
    try {
      setLoading(true);
      const authResponse: AuthResponse = await authApi.register(
        username,
        email,
        password
      );

      // Store auth data
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('user', JSON.stringify(authResponse.user));

      setUser(authResponse.user);

      // Connect to socket
      gameSocket.connect(authResponse.token);

      toast.success(`Account created! Welcome, ${authResponse.user.username}!`);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);

    // Disconnect socket
    gameSocket.disconnect();

    toast.success('Logged out successfully');
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
