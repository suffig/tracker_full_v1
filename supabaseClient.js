// Simplified Supabase Client with enhanced error handling and fallback
const supabaseConfig = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: {
      'X-Client-Info': 'fifa-tracker/1.0.0'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
};

// Real Supabase configuration
const SUPABASE_URL = 'https://buduldeczjwnjvsckqat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1ZHVsZGVjempqd25qdnNja3FhdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI0ODY5Nzc1LCJleHAiOjIwNDA0NDU3NzV9.hKQJ3PsQFKI8vLqWgMCvzlZ5l9s_4rRtHaOxXfyKEE8';

// Sample data for fallback mode
const sampleData = {
  players: [
    { id: 1, name: 'Max Müller', team: 'AEK', position: 'ST', value: 120000, goals: 3, created_at: '2024-01-01' },
    { id: 2, name: 'Tom Schmidt', team: 'AEK', position: 'TH', value: 100000, goals: 1, created_at: '2024-01-02' },
    { id: 3, name: 'Leon Wagner', team: 'AEK', position: 'IV', value: 90000, goals: 1, created_at: '2024-01-03' },
    { id: 4, name: 'Tim Fischer', team: 'AEK', position: 'ZM', value: 85000, goals: 1, created_at: '2024-01-04' },
    { id: 5, name: 'Jan Becker', team: 'Real', position: 'ST', value: 110000, goals: 4, created_at: '2024-01-05' }
  ],
  matches: [
    { id: 1, teama: 'AEK', teamb: 'Real', goalsa: 2, goalsb: 1, date: '2024-08-12', created_at: '2024-08-12', manofthematch: 'Max Müller' },
    { id: 2, teama: 'AEK', teamb: 'Real', goalsa: 1, goalsb: 3, date: '2024-08-10', created_at: '2024-08-10', manofthematch: 'Jan Becker' }
  ],
  bans: [
    { id: 1, player_id: 1, matches_remaining: 2, reason: 'Gelb-Rot Karte', created_at: '2024-08-01' },
    { id: 2, player_id: 5, matches_remaining: 1, reason: 'Unsportlichkeit', created_at: '2024-08-05' }
  ],
  transactions: [
    { id: 1, amount: -50000, info: 'Spielerkauf: Max Müller', team: 'AEK', date: '2024-08-10', type: 'Spielerkauf' },
    { id: 2, amount: 30000, info: 'Spielerverkauf: Klaus Meyer', team: 'AEK', date: '2024-08-11', type: 'Spielerverkauf' }
  ],
  finances: [
    { id: 1, team: 'AEK', budget: 150000, created_at: '2024-01-01' },
    { id: 2, team: 'Real', budget: 175000, created_at: '2024-01-01' }
  ],
  spieler_des_spiels: [
    { id: 1, name: 'Max Müller', team: 'AEK', count: 3, created_at: '2024-08-01' },
    { id: 2, name: 'Jan Becker', team: 'Real', count: 2, created_at: '2024-08-05' }
  ]
};

// Create fallback client that mimics Supabase API
function createFallbackClient() {
  console.warn('⚠️ Using fallback client - Supabase not available');
  
  // Track auth state for fallback
  let fallbackAuthState = null;
  let authChangeCallbacks = [];
  
  return {
    auth: {
      signInWithPassword: async ({ email, password }) => {
        console.log('🔐 Fallback login:', email);
        if (!email || !password) {
          return { error: new Error('Email and password required') };
        }
        if (password.length < 3) {
          return { error: new Error('Invalid credentials') };
        }
        
        const user = { id: 'demo', email, created_at: new Date().toISOString() };
        const session = { user, access_token: 'demo_token', expires_at: Date.now() / 1000 + 3600 };
        fallbackAuthState = { user, session };
        
        // Notify auth state change callbacks
        authChangeCallbacks.forEach(callback => {
          callback('SIGNED_IN', session);
        });
        
        return { data: { user, session }, error: null };
      },
      signUp: async ({ email, password }) => {
        console.log('📝 Fallback signup:', email);
        return { data: { user: null, session: null }, error: null };
      },
      signOut: async () => {
        console.log('👋 Fallback logout');
        fallbackAuthState = null;
        
        // Notify auth state change callbacks
        authChangeCallbacks.forEach(callback => {
          callback('SIGNED_OUT', null);
        });
        
        return { error: null };
      },
      getSession: async () => {
        // Return null session initially - no auto-login
        return { data: { session: fallbackAuthState?.session || null } };
      },
      onAuthStateChange: (callback) => {
        console.log('🔄 Setting up fallback auth state listener');
        authChangeCallbacks.push(callback);
        
        // Don't auto-trigger sign in - wait for actual login
        return { data: { subscription: { unsubscribe: () => {
          const index = authChangeCallbacks.indexOf(callback);
          if (index > -1) authChangeCallbacks.splice(index, 1);
        } } } };
      }
    },
    from: (table) => {
      const data = sampleData[table] || [];
      let queryState = {};
      
      const queryBuilder = {
        select: (query = '*') => queryBuilder,
        insert: (newData) => {
          const id = Math.max(0, ...data.map(item => item.id || 0)) + 1;
          const item = { id, ...newData, created_at: new Date().toISOString() };
          data.push(item);
          return Promise.resolve({ data: [item], error: null });
        },
        update: (updateData) => ({
          eq: (column, value) => {
            const items = data.filter(item => item[column] === value);
            items.forEach(item => Object.assign(item, updateData));
            return Promise.resolve({ data: items, error: null });
          }
        }),
        delete: () => ({
          eq: (column, value) => {
            const beforeLength = data.length;
            sampleData[table] = data.filter(item => item[column] !== value);
            const deletedCount = beforeLength - sampleData[table].length;
            return Promise.resolve({ data: [], error: null });
          }
        }),
        eq: function(column, value) {
          queryState.eq = { [column]: value };
          return queryBuilder;
        },
        order: function(column, options = {}) {
          queryState.order = { column, ascending: options.ascending !== false };
          return queryBuilder;
        },
        limit: function(count) {
          queryState.limit = count;
          return queryBuilder;
        },
        // Make it thenable (awaitable)
        then: function(resolve, reject) {
          try {
            let result = [...data];
            
            // Apply filters
            if (queryState.eq) {
              Object.entries(queryState.eq).forEach(([column, value]) => {
                result = result.filter(item => item[column] === value);
              });
            }
            
            // Apply ordering
            if (queryState.order) {
              const { column, ascending } = queryState.order;
              result.sort((a, b) => {
                if (ascending) {
                  return a[column] > b[column] ? 1 : -1;
                } else {
                  return b[column] > a[column] ? 1 : -1;
                }
              });
            }
            
            // Apply limit
            if (queryState.limit) {
              result = result.slice(0, queryState.limit);
            }
            
            queryState = {}; // Reset for next query
            resolve({ data: result, error: null });
          } catch (error) {
            reject({ data: null, error });
          }
        }
      };
      
      return queryBuilder;
    },
    channel: () => ({
      on: function(event, options, callback) {
        console.log('📡 Demo: Setting up realtime listener for', event, options?.table);
        return this;
      },
      subscribe: function(callback) {
        console.log('📡 Demo: Subscribing to realtime channel');
        if (callback) callback('SUBSCRIBED');
        return 'SUBSCRIBED';
      },
      unsubscribe: () => Promise.resolve({ error: null })
    }),
    removeChannel: () => Promise.resolve({ error: null })
  };
}

// Initialize Supabase client
let supabase;
let usingFallback = false;

try {
  // Check if Supabase is available globally
  if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
    console.log('🔄 Attempting to connect to Supabase...');
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfig);
    console.log('✅ Supabase client created');
    
    // Quick connection test
    supabase.from('players').select('id').limit(1).then(({ error }) => {
      if (error && !error.message.includes('relation')) {
        console.warn('⚠️ Database connection test failed:', error.message);
        console.log('📝 Ensure your Supabase database has the required tables');
      } else {
        console.log('✅ Database connection verified');
      }
    }).catch(() => {
      console.log('🔄 Database connectivity check skipped');
    });
    
  } else {
    throw new Error('Supabase library not available');
  }
} catch (error) {
  console.warn('⚠️ Real Supabase not available, using fallback:', error.message);
  usingFallback = true;
  supabase = createFallbackClient();
}

// Enhanced wrapper for better error handling
class SupabaseWrapper {
  constructor(client) {
    this.client = client;
    this.maxRetries = 3;
    this.baseDelay = 1000;
  }

  async retryOperation(operation, maxRetries = this.maxRetries) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (result.error) throw result.error;
        return result;
      } catch (error) {
        lastError = error;
        if (attempt === maxRetries) break;
        await new Promise(resolve => setTimeout(resolve, this.baseDelay * attempt));
      }
    }
    throw lastError;
  }

  async select(table, query = '*', options = {}) {
    return this.retryOperation(async () => {
      let builder = this.client.from(table).select(query);
      if (options.eq) {
        Object.entries(options.eq).forEach(([column, value]) => {
          builder = builder.eq(column, value);
        });
      }
      if (options.order) {
        builder = builder.order(options.order.column, { ascending: options.order.ascending ?? true });
      }
      if (options.limit) {
        builder = builder.limit(options.limit);
      }
      return await builder;
    });
  }

  async insert(table, data) {
    return this.retryOperation(async () => {
      return await this.client.from(table).insert(data).select();
    });
  }

  async update(table, data, conditions) {
    return this.retryOperation(async () => {
      let builder = this.client.from(table).update(data);
      Object.entries(conditions).forEach(([column, value]) => {
        builder = builder.eq(column, value);
      });
      return await builder.select();
    });
  }

  async deleteRow(table, conditions) {
    return this.retryOperation(async () => {
      let builder = this.client.from(table).delete();
      Object.entries(conditions).forEach(([column, value]) => {
        builder = builder.eq(column, value);
      });
      return await builder;
    });
  }

  getClient() {
    return this.client;
  }
}

const supabaseDb = new SupabaseWrapper(supabase);

// Auth state listener
const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  console.log(`Auth state changed: ${event}`, session?.user?.email || 'No user');
  window.dispatchEvent(new CustomEvent('auth-state-change', {
    detail: { event, session, user: session?.user }
  }));
});

// Export for use in other modules
export { supabase, supabaseDb, usingFallback };

// Global access for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase;
  window.supabaseDb = supabaseDb;
  window.usingFallback = usingFallback;
}