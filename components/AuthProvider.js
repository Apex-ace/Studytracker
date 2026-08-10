"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ensureUserProfile, watchUserProfile } from "@/lib/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopProfile = null;
    const stopAuth = onAuthStateChanged(auth, async (nextUser) => {
      if (stopProfile) {
        stopProfile();
        stopProfile = null;
      }

      setUser(nextUser);
      setProfile(null);

      if (!nextUser) {
        setLoading(false);
        return;
      }

      try {
        await ensureUserProfile(nextUser);
        stopProfile = watchUserProfile(nextUser.uid, (nextProfile) => {
          setProfile(nextProfile);
          setLoading(false);
        });
      } catch (error) {
        console.error("Failed to load user profile", error);
        setLoading(false);
      }
    });

    return () => {
      stopAuth();
      if (stopProfile) stopProfile();
    };
  }, []);

  const value = useMemo(() => ({ user, profile, loading }), [user, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
