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
      skipBrowserRedirect: false // Ensure redirect happens automatically
    }
  });
  
  if (error) throw error;
  return data;
}

export async function signOut() {
  try {
    // First clear any stored session data
    await supabase.auth.clearSession();
    
    // Then sign out
    const { error } = await supabase.auth.signOut({
      scope: 'global' // Sign out from all tabs/windows
    });
    
    if (error) throw error;

    // Force reload the page to ensure clean state
    // This is particularly important for Chromium browsers
    window.location.reload();
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

export function subscribeToAuthChanges(callback: (session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session);
  });
}