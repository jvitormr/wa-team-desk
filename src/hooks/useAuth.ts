import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Operator } from '@/types/crm';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            const { data } = await supabase
              .from('operators')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            setOperator((data as Operator) ?? null);
          } else {
            setOperator(null);
          }
        } catch (e) {
          console.error('useAuth onAuthStateChange error', e);
          setOperator(null);
        } finally {
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            const { data } = await supabase
              .from('operators')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            setOperator((data as Operator) ?? null);
          } else {
            setOperator(null);
          }
        } catch (e) {
          console.error('useAuth getSession error', e);
          setOperator(null);
        } finally {
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error('useAuth getSession catch', e);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    operator,
    loading,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user && !!operator,
  };
};