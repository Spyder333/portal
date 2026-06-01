import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { LocalUser, getDb, login as dbLogin, signUp as dbSignUp, SignUpInput } from "./db";

const SESSION_KEY = "fees_approval_current_user_v1";

interface AuthContextValue {
  user: LocalUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await getDb(); // ensure DB ready
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {
          localStorage.removeItem(SESSION_KEY);
        }
      }
      setLoading(false);
    })();
  }, []);

  const persistUser = (u: LocalUser | null) => {
    if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_KEY);
    setUser(u);
  };

  const value: AuthContextValue = {
    user,
    loading,
    login: async (email, password) => {
      const u = await dbLogin(email, password);
      persistUser(u);
    },
    signUp: async (input) => {
      const u = await dbSignUp(input);
      persistUser(u);
    },
    logout: () => persistUser(null),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
