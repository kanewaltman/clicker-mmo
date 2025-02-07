import { supabase } from './supabase';

export async function signInWithGoogle() {
  // Get the current URL without any query parameters
  const baseUrl = window.location.origin + window.location.pathname;
  
  // Check if we're on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      redirectTo: isMobile ? baseUrl : window.location.origin,
      skipBrowserRedirect: false
    }
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  try {
    // First kill the session
    await supabase.auth.setSession(null);
    
    // Then clear any stored session data
    await supabase.auth.clearSession();
    
    // Finally sign out
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Small delay to ensure session cleanup completes
    setTimeout(() => {
      // Clear any localStorage data
      localStorage.removeItem('sb-' + supabase.supabaseUrl + '-auth-token');
      
      // Force a hard reload to clear any cached state
      window.location.href = window.location.origin + window.location.pathname;
    }, 100);
  } catch (error) {
    console.error('Error signing out:', error);
    // Even if there's an error, try to force a clean state
    window.location.href = window.location.origin + window.location.pathname;
    throw error;
  }
}

export function subscribeToAuthChanges(callback: (session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session);
  });
}