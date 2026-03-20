import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

interface AuthUser {
  id: string;
  email: string;
  [key: string]: any;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  checkAuth: () => void;
  login: (userData: AuthUser, token: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  checkAuth: () => {},
  login: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(() => {
    const stored = localStorage.getItem("auth_user");
    const token = localStorage.getItem("auth_token");
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = (userData: AuthUser, token: string) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(userData));
    setUser(userData);
    setLoading(false);
  };

  const signOut = async () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, checkAuth, login }}>
      {children}
    </AuthContext.Provider>
  );
}
