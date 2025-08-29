// FIFA Tracker - Hybrid Main.js with dynamic module loading to avoid ES6 issues
console.log("Starting FIFA Tracker...");

// Global variables
let currentTab = "matches";
let liveSyncInitialized = false;
let tabButtonsInitialized = false;
let realtimeChannel = null;
let isAppVisible = true;
let inactivityCleanupTimer = null;

// Dynamic module cache
const moduleCache = {};

// Dynamic module loader function
async function loadModule(path) {
    if (moduleCache[path]) {
        return moduleCache[path];
    }
    
    try {
        const module = await import(path);
        moduleCache[path] = module;
        return module;
    } catch (error) {
        console.error(`Failed to load module ${path}:`, error);
        throw error;
    }
}

// Initialize core modules
let supabase, supabaseDb, usingFallback;
let connectionMonitor, isDatabaseAvailable;
let dataManager;
let loadingManager, ErrorHandler, eventBus;
let authFunctions = {};
let tabRenderers = {};
let resetFunctions = {};

// Core initialization function
async function initializeCore() {
    try {
        console.log("🔄 Loading core modules...");
        
        // Load supabase client
        const supabaseModule = await loadModule('./supabaseClient.js');
        supabase = supabaseModule.supabase;
        supabaseDb = supabaseModule.supabaseDb;
        usingFallback = supabaseModule.usingFallback;
        console.log("✅ Supabase module loaded");
        
        // Load utilities
        const utilsModule = await loadModule('./utils.js');
        loadingManager = utilsModule.loadingManager;
        ErrorHandler = utilsModule.ErrorHandler;
        eventBus = utilsModule.eventBus;
        console.log("✅ Utils module loaded");
        
        // Load connection monitor if available
        try {
            const connModule = await loadModule('./connectionMonitor.js');
            connectionMonitor = connModule.connectionMonitor;
            isDatabaseAvailable = connModule.isDatabaseAvailable;
            console.log("✅ Connection monitor loaded");
        } catch (error) {
            console.warn("Connection monitor not available, continuing without it");
            isDatabaseAvailable = () => Promise.resolve(true);
        }
        
        // Load data manager if available
        try {
            const dataModule = await loadModule('./dataManager.js');
            dataManager = dataModule.dataManager;
            console.log("✅ Data manager loaded");
        } catch (error) {
            console.warn("Data manager not available, continuing without it");
        }
        
        // Load auth module
        const authModule = await loadModule('./auth.js');
        authFunctions.signUp = authModule.signUp;
        authFunctions.signIn = authModule.signIn;
        authFunctions.signOut = authModule.signOut;
        console.log("✅ Auth module loaded");
        
        // Load tab renderers
        const modules = [
            { name: 'kader', file: './kader.js', render: 'renderKaderTab', reset: 'resetKaderState' },
            { name: 'bans', file: './bans.js', render: 'renderBansTab', reset: 'resetBansState' },
            { name: 'matches', file: './matches.js', render: 'renderMatchesTab', reset: 'resetMatchesState' },
            { name: 'stats', file: './stats.js', render: 'renderStatsTab', reset: 'resetStatsState' },
            { name: 'finanzen', file: './finanzen.js', render: 'renderFinanzenTab', reset: 'resetFinanzenState' },
            { name: 'spieler', file: './spieler.js', render: 'renderSpielerTab', reset: 'resetSpielerState' }
        ];
        
        for (const module of modules) {
            try {
                const mod = await loadModule(module.file);
                tabRenderers[module.name] = mod[module.render];
                if (mod[module.reset]) {
                    resetFunctions[module.name] = mod[module.reset];
                }
                console.log(`✅ ${module.name} module loaded`);
            } catch (error) {
                console.error(`❌ Failed to load ${module.name} module:`, error);
                // Create fallback renderer
                tabRenderers[module.name] = () => {
                    const app = document.getElementById('app');
                    if (app) {
                        app.innerHTML = `
                            <div class="content-container">
                                <h1 class="text-title-primary font-bold text-lg mb-4">${module.name.charAt(0).toUpperCase() + module.name.slice(1)}</h1>
                                <p class="text-text-secondary">Modul konnte nicht geladen werden. Bitte versuchen Sie es später erneut.</p>
                            </div>
                        `;
                    }
                };
            }
        }
        
        console.log("✅ All modules loaded successfully");
        return true;
        
    } catch (error) {
        console.error("❌ Core initialization failed:", error);
        ErrorHandler?.showUserError?.('Fehler beim Laden der Anwendung. Bitte laden Sie die Seite neu.', 'error');
        return false;
    }
}

// Connection status indicator
function updateConnectionStatus(status) {
    let indicator = document.getElementById('connection-status');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.className = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer';
        indicator.title = 'Klicken für Details';
        document.body.appendChild(indicator);
    }
    
    // Clear previous classes
    indicator.className = indicator.className.replace(/bg-\w+-\d+/g, '').replace(/text-\w+-\d+/g, '');
    
    if (status.connected) {
        const baseClass = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer';
        if (usingFallback) {
            indicator.className = `${baseClass} bg-yellow-500 text-white`;
            indicator.textContent = '📡 Demo';
            indicator.title = 'Demo-Modus aktiv - Keine echte Datenbankverbindung';
        } else {
            indicator.className = `${baseClass} bg-green-500 text-white`;
            indicator.textContent = '🟢 Online';
            indicator.title = 'Verbunden mit Datenbank';
        }
    } else {
        indicator.className = `${baseClass} bg-red-500 text-white`;
        indicator.textContent = '🔴 Offline';
        indicator.title = 'Keine Verbindung zur Datenbank';
    }
}

// Initialize connection status
function initializeConnectionStatus() {
    updateConnectionStatus({ connected: true });
    
    // Update status periodically if connection monitor is available
    if (connectionMonitor) {
        setInterval(async () => {
            const isAvailable = await isDatabaseAvailable();
            updateConnectionStatus({ connected: isAvailable });
        }, 30000); // Check every 30 seconds
    }
}

// Live sync initialization
async function initializeLiveSync() {
    if (liveSyncInitialized || !supabase) return;
    
    try {
        console.log("🔄 Initializing live sync...");
        
        // Create realtime channel
        realtimeChannel = supabase.channel('public:*');
        
        // Listen for all table changes
        const tables = ['players', 'matches', 'bans', 'transactions', 'finances', 'spieler_des_spiels'];
        
        tables.forEach(table => {
            realtimeChannel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table: table },
                (payload) => {
                    console.log('Real-time update:', payload);
                    // Trigger refresh of current tab
                    if (typeof window.refreshCurrentTab === 'function') {
                        window.refreshCurrentTab();
                    }
                }
            );
        });
        
        realtimeChannel.subscribe((status) => {
            console.log('Realtime status:', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Live sync active');
                liveSyncInitialized = true;
            }
        });
        
    } catch (error) {
        console.warn('Live sync not available:', error);
    }
}

// Auth initialization
function initializeAuth() {
    console.log("🔄 Initializing authentication...");
    
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN' && session) {
            console.log('✅ User signed in');
            await showMainApp();
            await initializeLiveSync();
        } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            showLoginArea();
            cleanup();
        }
    });
    
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log('✅ Existing session found');
            showMainApp();
            initializeLiveSync();
        } else {
            console.log('🔑 No session - showing login');
            showLoginArea();
        }
    });
}

// Show login area
function showLoginArea() {
    const loginArea = document.getElementById('login-area');
    const appContainer = document.querySelector('.app-container');
    
    if (loginArea) {
        loginArea.style.display = 'block';
        loginArea.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <div class="login-header">
                        <h1 class="text-title-primary">FIFA Tracker</h1>
                        <p class="text-text-secondary">Melden Sie sich an, um fortzufahren</p>
                    </div>
                    
                    <form id="login-form" class="login-form">
                        <div class="form-group">
                            <label for="email" class="form-label">E-Mail</label>
                            <input type="email" id="email" class="form-input" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="password" class="form-label">Passwort</label>
                            <input type="password" id="password" class="form-input" required>
                        </div>
                        
                        <button type="submit" class="btn-primary w-full">
                            <span id="login-text">Anmelden</span>
                            <div id="login-spinner" class="spinner-sm" style="display:none;"></div>
                        </button>
                    </form>
                    
                    <div class="login-footer">
                        <p class="text-text-secondary text-sm">
                            Noch kein Account? 
                            <a href="#" id="signup-link" class="text-primary-500 hover:underline">Registrieren</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (appContainer) {
        appContainer.style.display = 'none';
    }
    
    // Setup login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    const signupLink = document.getElementById('signup-link');
    if (signupLink) {
        signupLink.addEventListener('click', (e) => {
            e.preventDefault();
            // For demo: just show message
            if (ErrorHandler) {
                ErrorHandler.showUserError('Registrierung: Verwenden Sie beliebige E-Mail und Passwort für Demo-Modus', 'info');
            }
        });
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email')?.value;
    const password = document.getElementById('password')?.value;
    const loginText = document.getElementById('login-text');
    const loginSpinner = document.getElementById('login-spinner');
    
    if (!email || !password) {
        if (ErrorHandler) {
            ErrorHandler.showUserError('Bitte geben Sie E-Mail und Passwort ein', 'error');
        }
        return;
    }
    
    // Show loading state
    if (loginText) loginText.style.display = 'none';
    if (loginSpinner) loginSpinner.style.display = 'block';
    
    try {
        if (authFunctions.signIn) {
            await authFunctions.signIn(email, password);
        } else {
            throw new Error('Auth functions not loaded');
        }
    } catch (error) {
        console.error('Login failed:', error);
        if (ErrorHandler) {
            ErrorHandler.showUserError('Anmeldung fehlgeschlagen: ' + error.message, 'error');
        }
    } finally {
        // Reset loading state
        if (loginText) loginText.style.display = 'block';
        if (loginSpinner) loginSpinner.style.display = 'none';
    }
}

// Show main app
async function showMainApp() {
    const loginArea = document.getElementById('login-area');
    const appContainer = document.querySelector('.app-container');
    
    if (loginArea) {
        loginArea.style.display = 'none';
    }
    
    if (appContainer) {
        appContainer.style.display = 'block';
    }
    
    // Initialize tab buttons if not already done
    if (!tabButtonsInitialized) {
        initializeTabButtons();
        tabButtonsInitialized = true;
    }
    
    // Load initial tab
    await switchTab('matches');
}

// Initialize tab buttons
function initializeTabButtons() {
    console.log("🔄 Initializing tab navigation...");
    
    const tabButtons = document.querySelectorAll('.nav-item:not(.logout-nav)');
    const logoutBtn = document.getElementById('logout-btn');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            // Map nav IDs to internal tab names
            const navId = button.id.replace('nav-', '');
            const tabMapping = {
                'squad': 'kader',
                'matches': 'matches',
                'bans': 'bans',
                'finanzen': 'finanzen', 
                'stats': 'stats',
                'spieler': 'spieler'
            };
            const tabName = tabMapping[navId] || navId;
            await switchTab(tabName);
        });
    });
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (authFunctions.signOut) {
                await authFunctions.signOut();
            }
        });
    }
}

// Switch tab function
async function switchTab(tabName) {
    console.log(`🔄 Switching to tab: ${tabName}`);
    
    // Show loading
    const loader = document.getElementById('tab-loader');
    if (loader) {
        loader.style.display = 'flex';
    }
    
    try {
        // Update active button
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`nav-${tabName}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Render tab content
        if (tabRenderers[tabName]) {
            await tabRenderers[tabName]();
            currentTab = tabName;
        } else {
            console.error(`No renderer found for tab: ${tabName}`);
            const app = document.getElementById('app');
            if (app) {
                app.innerHTML = `
                    <div class="content-container">
                        <h1 class="text-title-primary font-bold text-lg mb-4">${tabName.charAt(0).toUpperCase() + tabName.slice(1)}</h1>
                        <p class="text-text-secondary">Dieser Bereich ist noch nicht verfügbar.</p>
                    </div>
                `;
            }
        }
        
    } catch (error) {
        console.error(`Failed to load tab ${tabName}:`, error);
        if (ErrorHandler) {
            ErrorHandler.showUserError('Fehler beim Laden des Bereichs', 'error');
        }
    } finally {
        // Hide loading
        if (loader) {
            loader.style.display = 'none';
        }
    }
}

// Cleanup function
function cleanup() {
    if (realtimeChannel) {
        supabase?.removeChannel(realtimeChannel);
        realtimeChannel = null;
        liveSyncInitialized = false;
    }
    
    // Reset all module states
    Object.values(resetFunctions).forEach(resetFn => {
        try {
            if (typeof resetFn === 'function') {
                resetFn();
            }
        } catch (error) {
            console.warn('Reset function failed:', error);
        }
    });
}

// Global refresh function for real-time updates
window.refreshCurrentTab = async () => {
    if (currentTab && tabRenderers[currentTab]) {
        console.log(`🔄 Refreshing current tab: ${currentTab}`);
        try {
            await tabRenderers[currentTab]();
        } catch (error) {
            console.warn('Failed to refresh tab:', error);
        }
    }
};

// Visibility change handler for performance
document.addEventListener('visibilitychange', () => {
    isAppVisible = !document.hidden;
    
    if (isAppVisible) {
        // Clear any pending cleanup
        if (inactivityCleanupTimer) {
            clearTimeout(inactivityCleanupTimer);
            inactivityCleanupTimer = null;
        }
        
        // Refresh current tab
        window.refreshCurrentTab();
    } else {
        // Schedule cleanup for inactive state
        inactivityCleanupTimer = setTimeout(() => {
            console.log('🧹 Cleaning up inactive app state');
            // Perform minimal cleanup for inactive state
        }, 300000); // 5 minutes
    }
});

// Initialize the application
async function initializeApp() {
    console.log("🚀 Initializing FIFA Tracker...");
    
    try {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // Load core modules
        const success = await initializeCore();
        if (!success) {
            throw new Error('Core module loading failed');
        }
        
        // Initialize connection status
        initializeConnectionStatus();
        
        // Initialize authentication
        initializeAuth();
        
        console.log("✅ FIFA Tracker initialized successfully");
        
    } catch (error) {
        console.error("❌ Application initialization failed:", error);
        
        // Show basic error page
        document.body.innerHTML = `
            <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px;">
                <div style="text-align: center; max-width: 500px;">
                    <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 16px; color: #1f2937;">
                        FIFA Tracker Fehler
                    </h1>
                    <p style="color: #6b7280; margin-bottom: 24px;">
                        Die Anwendung konnte nicht geladen werden. Bitte laden Sie die Seite neu.
                    </p>
                    <button onclick="window.location.reload()" 
                            style="background: #3b82f6; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer;">
                        Seite neu laden
                    </button>
                    <details style="margin-top: 20px; text-align: left; background: #f9fafb; padding: 16px; border-radius: 8px;">
                        <summary style="cursor: pointer; font-weight: 600;">Fehlerdetails</summary>
                        <pre style="margin-top: 10px; white-space: pre-wrap; font-size: 12px; color: #374151;">${error.message}\n\n${error.stack}</pre>
                    </details>
                </div>
            </div>
        `;
    }
}

// Start the application
initializeApp();