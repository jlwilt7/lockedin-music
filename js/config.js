// Supabase Configuration
const SUPABASE_URL = 'https://jvfsrgxkvokapxnuuabf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2ZnNyZ3hrdm9rYXB4bnV1YWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDA0NjcsImV4cCI6MjA4MTA3NjQ2N30.emQa9ExAaI2Akd5wtPWfn0dZQFxvNKj0z7O5u9EfB10';

// Initialize Supabase client with persistent session
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

// Export for use in other modules
window.APP_CONFIG = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    supabase: supabaseClient
};

// Debug helper - check auth state
window.debugAuth = async () => {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    console.log('Current Session:', session);
    console.log('User ID:', session?.user?.id);
    console.log('Session Error:', error);
    return session;
};

