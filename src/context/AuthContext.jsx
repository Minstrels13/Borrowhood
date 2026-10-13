import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getMyProfile } from '../lib/profiles';
import { isStudentEmail } from '../lib/auth';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  async function loadUser(nextUser) {
    const ticket = ++generation.current;
    setUser(nextUser);
    setProfile(null);
    setError('');
    setLoading(true);
    try {
      const nextProfile = nextUser ? await getMyProfile(nextUser.id) : null;
      if (ticket === generation.current) setProfile(nextProfile);
    } catch (err) {
      if (ticket === generation.current) setError(err.message);
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;
    // Keep the Auth callback synchronous; profile queries run outside its internal lock.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (active) void loadUser(session?.user || null);
      });
    });
    return () => {
      active = false;
      generation.current++;
      subscription.unsubscribe();
    };
  }, []);
  const confirmed = Boolean(user?.email_confirmed_at) && isStudentEmail(user?.email || '');
  const isVerified =
    confirmed &&
    profile?.verification_status === 'approved' &&
    Boolean(profile?.photo_path && profile?.submitted_at);
  const isAdmin = confirmed && profile?.role === 'admin';
  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        error,
        confirmed,
        isVerified,
        isAdmin,
        refresh: () => loadUser(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
