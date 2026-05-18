"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onIdTokenChanged,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase"; // your client-side firebase init

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_COOKIE = "__session";

async function syncSessionCookie(user: User | null) {
  if (user) {
    const token = await user.getIdToken();
    // Max-age matches Firebase ID token lifetime (1 hour).
    // HttpOnly is NOT set here because JS must also read it for refresh;
    // the middleware only needs presence, not the value.
    document.cookie = `${SESSION_COOKIE}=${token}; path=/; max-age=3600; SameSite=Strict; Secure`;
  } else {
    // Expire the cookie immediately.
    document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Strict; Secure`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Start as true so children never flash while Firebase resolves.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onIdTokenChanged fires on sign-in, sign-out, AND token refresh (~every 55 min).
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      try {
        await syncSessionCookie(firebaseUser);
        setUser(firebaseUser);
      } catch (err) {
        // Token fetch failed (network, revoked). Treat as signed-out.
        console.error("[AuthProvider] token sync failed:", err);
        await syncSessionCookie(null);
        setUser(null);
      } finally {
        // Only set loading=false once — subsequent token refreshes keep it false.
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    // Cookie is cleared by the onIdTokenChanged null emission above,
    // but wipe it eagerly so the middleware redirects immediately.
    await syncSessionCookie(null);
  }, []);

  if (loading) {
    return (
      <div
        aria-label="Loading"
        className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}