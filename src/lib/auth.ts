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
    // Clear all local storage data first
    const prefix = 'sb-' + new URL(supabase.supabaseUrl).hostname;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut({
      scope: 'local'
    });
    if (error) throw error;

    // Force a clean reload after a brief delay
    await new Promise(resolve => setTimeout(resolve, 100));
    window.location.replace(window.location.origin + window.location.pathname);
  } catch (error) {
    console.error('Error signing out:', error);
    // Force reload even if there's an error
    window.location.replace(window.location.origin + window.location.pathname);
  }
}

export function subscribeToAuthChanges(callback: (session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      // Clear any remaining auth data
      const prefix = 'sb-' + new URL(supabase.supabaseUrl).hostname;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      }
    }
    callback(session);
  });
}