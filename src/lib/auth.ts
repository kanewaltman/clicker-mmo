import { supabase } from './supabase';

export async function signInWithGoogle() {
  // Clear any stale auth state first
  localStorage.removeItem('supabase.auth.token');
  sessionStorage.removeItem('supabase.auth.token');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      redirectTo: `${window.location.origin}/?time=${Date.now()}`,
      skipBrowserRedirect: true // Prevent automatic redirect
    }
  });
  
  if (error) throw error;

  // Manually handle the redirect
  if (data?.url) {
    window.location.replace(data.url);
  }
  
  return data;
}

export async function signOut() {
  try {
    // Clear all storage first
    localStorage.clear();
    sessionStorage.clear();

    // Then sign out from Supabase
    const { error } = await supabase.auth.signOut({
      scope: 'global'
    });
    
    if (error) throw error;

    // Wait a moment to ensure signout is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Force a clean reload without any cache
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
      // Clear all storage on sign out
      localStorage.clear();
      sessionStorage.clear();
    }
    callback(session);
  });
}