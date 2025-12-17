// Authentication Module
const Auth = {
    currentUser: null,

    async init() {
        const { supabase } = window.APP_CONFIG;
        
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.currentUser = session.user;
            return true;
        }
        return false;
    },

    async signUp(email, password, displayName) {
        const { supabase } = window.APP_CONFIG;
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: displayName || email.split('@')[0]
                }
            }
        });

        if (error) throw error;
        
        if (data.user) {
            this.currentUser = data.user;
        }
        
        return data;
    },

    async signIn(email, password) {
        const { supabase } = window.APP_CONFIG;
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        
        if (data.user) {
            this.currentUser = data.user;
        }
        
        return data;
    },

    async signOut() {
        const { supabase } = window.APP_CONFIG;
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        this.currentUser = null;
    },

    async resetPassword(email) {
        const { supabase } = window.APP_CONFIG;
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin
        });

        if (error) throw error;
    },

    async updateProfile(updates) {
        const { supabase } = window.APP_CONFIG;
        
        const { data, error } = await supabase.auth.updateUser({
            data: updates
        });

        if (error) throw error;
        
        if (data.user) {
            this.currentUser = data.user;
        }
        
        return data;
    },

    getDisplayName() {
        if (!this.currentUser) return 'Guest';
        return this.currentUser.user_metadata?.display_name || 
               this.currentUser.email?.split('@')[0] || 
               'User';
    },

    getUserId() {
        return this.currentUser?.id || null;
    },

    isLoggedIn() {
        return !!this.currentUser;
    },

    onAuthStateChange(callback) {
        const { supabase } = window.APP_CONFIG;
        
        return supabase.auth.onAuthStateChange((event, session) => {
            this.currentUser = session?.user || null;
            callback(event, session);
        });
    }
};

window.Auth = Auth;

