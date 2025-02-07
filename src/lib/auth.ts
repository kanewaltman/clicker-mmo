import { supabase } from './supabase';

export async function signInWithGoogle() {
  const baseUrl = window.location.origin + window.location.pathname;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      redirectTo: isMobile ? baseUrl : window.location.origin
    }
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  try {
    // First sign out from Supabase
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear all Supabase-related localStorage data
    const prefix = 'sb-' + new URL(supabase.supabaseUrl).hostname.split('.')[0];
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Clear session storage as well
    sessionStorage.clear();

    // Force a clean reload
    window.location.href = window.location.origin + window.location.pathname;
  } catch (error) {
    console.error('Error signing out:', error);
    // Force reload even if there's an error
    window.location.href = window.location.origin + window.location.pathname;
  }
}

export function subscribeToAuthChanges(callback: (session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      // Clear any remaining auth data
      const prefix = 'sb-' + new URL(supabase.supabaseUrl).hostname.split('.')[0];
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
    }
    callback(session);
  });
}