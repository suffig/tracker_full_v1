// FIFA Tracker - Working main.js without problematic ES6 module imports
console.log("Starting FIFA Tracker...");

// Global variables
let currentTab = "matches";
let liveSyncInitialized = false;
let tabButtonsInitialized = false;
let realtimeChannel = null;
let isAppVisible = true;
let inactivityCleanupTimer = null;

// Create fallback supabase client inline
const createFallbackSupabase = () => {
    return {
        auth: {
            signInWithPassword: (credentials) => {
                console.log("Demo login:", credentials.email);
                return Promise.resolve({ 
                    data: { 
                        user: { email: credentials.email }, 
                        session: { access_token: 'demo', user: { email: credentials.email } }
                    }, 
                    error: null 
                });
            },
            signOut: () => {
                console.log("Demo logout");
                return Promise.resolve({ error: null });
            },
            getSession: () => {
                return Promise.resolve({ 
                    data: { 
                        session: { 
                            user: { email: 'demo@example.com' }, 
                            access_token: 'demo' 
                        } 
                    }, 
                    error: null 
                });
            },
            onAuthStateChange: (callback) => {
                // Simulate auth state change
                setTimeout(() => {
                    callback('SIGNED_IN', { 
                        user: { email: 'demo@example.com' }, 
                        access_token: 'demo' 
                    });
                }, 100);
                return { data: { subscription: { unsubscribe: () => {} } } };
            }
        },
        from: (table) => ({
            select: () => Promise.resolve({ data: getSampleData(table), error: null }),
            insert: (data) => Promise.resolve({ data: [data], error: null }),
            update: () => Promise.resolve({ data: [], error: null }),
            delete: () => Promise.resolve({ data: [], error: null })
        }),
        channel: () => ({
            on: () => this,
            subscribe: () => 'SUBSCRIBED',
            unsubscribe: () => Promise.resolve({ error: null })
        }),
        removeChannel: () => Promise.resolve({ error: null })
    };
};

// Sample data for demo mode
const getSampleData = (table) => {
    const sampleData = {
        players: [
            { id: 1, name: 'Max Müller', team: 'AEK', position: 'ST', value: 120000, goals: 3 },
            { id: 2, name: 'Tom Schmidt', team: 'AEK', position: 'TH', value: 100000, goals: 1 },
            { id: 3, name: 'Leon Wagner', team: 'AEK', position: 'IV', value: 90000, goals: 1 },
            { id: 4, name: 'Tim Fischer', team: 'AEK', position: 'ZM', value: 85000, goals: 1 },
            { id: 5, name: 'Jan Becker', team: 'Real', position: 'ST', value: 110000, goals: 4 },
            { id: 6, name: 'Paul Klein', team: 'Real', position: 'TH', value: 95000, goals: 1 },
            { id: 7, name: 'Lukas Wolf', team: 'Real', position: 'IV', value: 88000, goals: 1 },
            { id: 8, name: 'Ben Richter', team: 'Real', position: 'ZM', value: 92000, goals: 1 }
        ],
        matches: [
            { id: 1, teama: 'AEK', teamb: 'Real', goalsa: 2, goalsb: 1, date: '2024-08-12', manofthematch: 'Max Müller' },
            { id: 2, teama: 'Real', teamb: 'AEK', goalsa: 0, goalsb: 3, date: '2024-08-15', manofthematch: 'Tom Schmidt' }
        ],
        finances: [
            { id: 1, team: 'AEK', balance: 2500000, debt: 500000 },
            { id: 2, team: 'Real', balance: 1800000, debt: 200000 }
        ],
        bans: [],
        transactions: []
    };
    return sampleData[table] || [];
};

// Initialize supabase
const supabase = window.supabase ? window.supabase.createClient('demo', 'demo') : createFallbackSupabase();

// Simple auth functions
const signIn = async (email, password) => {
    return await supabase.auth.signInWithPassword({ email, password });
};

const signOut = async () => {
    return await supabase.auth.signOut();
};

// Simple loading manager
const showTabLoader = (show = true) => {
    const loader = document.getElementById('tab-loader');
    if (loader) {
        loader.style.display = show ? "flex" : "none";
    }
};

// Error handler
const showError = (message) => {
    console.error(message);
    // Could add toast notification here
};

// Simple tab rendering functions
const renderMatchesTab = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const matches = getSampleData('matches');
    
    container.innerHTML = `
        <div class="native-card">
            <div class="native-card-header">
                <h2 class="card-title">Match Center</h2>
                <p class="card-subtitle">Verwalten Sie Ihre FIFA-Spiele</p>
            </div>
            <div class="native-card-content">
                <button class="btn btn-primary btn-full mb-4">
                    <i class="fas fa-plus"></i> Neues Match hinzufügen
                </button>
                <div class="match-list">
                    ${matches.map(match => `
                        <div class="match-card">
                            <div class="match-header">
                                <span class="team-badge team-${match.teama.toLowerCase()}">${match.teama}</span>
                                <span class="match-score">${match.goalsa} : ${match.goalsb}</span>
                                <span class="team-badge team-${match.teamb.toLowerCase()}">${match.teamb}</span>
                            </div>
                            <div class="match-details">
                                <p>Man of the Match: ${match.manofthematch}</p>
                                <p>Datum: ${new Date(match.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

const renderKaderTab = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const players = getSampleData('players');
    const aekPlayers = players.filter(p => p.team === 'AEK');
    const realPlayers = players.filter(p => p.team === 'Real');
    
    container.innerHTML = `
        <div class="native-card">
            <div class="native-card-header">
                <h2 class="card-title">Team Management</h2>
                <p class="card-subtitle">Verwalten Sie Ihre FIFA-Teams und Spieler</p>
            </div>
            <div class="native-card-content">
                <div class="team-section">
                    <h3 class="team-title">AEK Athen</h3>
                    <div class="player-list">
                        ${aekPlayers.map(player => `
                            <div class="player-card">
                                <div class="player-info">
                                    <h4>${player.name}</h4>
                                    <span class="position-badge badge-${player.position.toLowerCase()}">${player.position}</span>
                                </div>
                                <div class="player-value">${(player.value / 1000)}K €</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="team-section">
                    <h3 class="team-title">Real Madrid</h3>
                    <div class="player-list">
                        ${realPlayers.map(player => `
                            <div class="player-card">
                                <div class="player-info">
                                    <h4>${player.name}</h4>
                                    <span class="position-badge badge-${player.position.toLowerCase()}">${player.position}</span>
                                </div>
                                <div class="player-value">${(player.value / 1000)}K €</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderBansTab = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="native-card">
            <div class="native-card-header">
                <h2 class="card-title">Sperren Management</h2>
                <p class="card-subtitle">Verwalten Sie Spielersperren</p>
            </div>
            <div class="native-card-content">
                <p class="text-center py-4">Keine aktiven Sperren vorhanden.</p>
                <button class="btn btn-primary btn-full">
                    <i class="fas fa-ban"></i> Neue Sperre hinzufügen
                </button>
            </div>
        </div>
    `;
};

const renderFinanzenTab = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const finances = getSampleData('finances');
    
    container.innerHTML = `
        <div class="native-card">
            <div class="native-card-header">
                <h2 class="card-title">Finanz Management</h2>
                <p class="card-subtitle">Verwalten Sie Teamfinanzen und Transaktionen</p>
            </div>
            <div class="native-card-content">
                ${finances.map(finance => `
                    <div class="finance-card team-${finance.team.toLowerCase()}">
                        <h3>${finance.team}</h3>
                        <div class="finance-details">
                            <div class="balance">
                                <span>Kontostand:</span>
                                <span class="amount">${(finance.balance / 1000000).toFixed(1)}M €</span>
                            </div>
                            <div class="debt">
                                <span>Schulden:</span>
                                <span class="amount text-red">${(finance.debt / 1000)}K €</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
                <button class="btn btn-primary btn-full mt-4">
                    <i class="fas fa-plus"></i> Neue Transaktion hinzufügen
                </button>
            </div>
        </div>
    `;
};

const renderStatsTab = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = `
        <div class="native-card">
            <div class="native-card-header">
                <h2 class="card-title">Statistiken</h2>
                <p class="card-subtitle">Spieler- und Teamstatistiken</p>
            </div>
            <div class="native-card-content">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h4>Spiele gesamt</h4>
                        <div class="stat-value">2</div>
                    </div>
                    <div class="stat-card">
                        <h4>AEK Siege</h4>
                        <div class="stat-value">1</div>
                    </div>
                    <div class="stat-card">
                        <h4>Real Siege</h4>
                        <div class="stat-value">1</div>
                    </div>
                    <div class="stat-card">
                        <h4>Tore gesamt</h4>
                        <div class="stat-value">6</div>
                    </div>
                </div>
            </div>
        </div>
    `;
};

const renderSpielerTab = async (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const players = getSampleData('players');
    
    container.innerHTML = `
        <div class="native-card">
            <div class="native-card-header">
                <h2 class="card-title">Spieler Übersicht</h2>
                <p class="card-subtitle">Alle Spieler im Überblick</p>
            </div>
            <div class="native-card-content">
                <div class="player-grid">
                    ${players.map(player => `
                        <div class="player-overview-card">
                            <div class="player-header">
                                <h4>${player.name}</h4>
                                <span class="team-badge team-${player.team.toLowerCase()}">${player.team}</span>
                            </div>
                            <div class="player-stats">
                                <div class="stat">
                                    <span>Position:</span>
                                    <span>${player.position}</span>
                                </div>
                                <div class="stat">
                                    <span>Wert:</span>
                                    <span>${(player.value / 1000)}K €</span>
                                </div>
                                <div class="stat">
                                    <span>Tore:</span>
                                    <span>${player.goals}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
};

// Navigation functions
const updateBottomNavActive = (tab) => {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const navElement = document.getElementById(`nav-${tab}`);
    if (navElement) {
        navElement.classList.add('active');
    }
};

const switchTab = async (tab) => {
    try {
        currentTab = tab;
        updateBottomNavActive(tab);
        showTabLoader(true);
        
        await new Promise(resolve => setTimeout(resolve, 200));
        await renderCurrentTab();
        showTabLoader(false);
    } catch (error) {
        console.error('Error switching tab:', error);
        showTabLoader(false);
    }
};

const renderCurrentTab = async () => {
    const appDiv = document.getElementById("app");
    if (!appDiv) return;
    
    try {
        appDiv.innerHTML = "";
        
        const tabRenderers = {
            'squad': () => renderKaderTab("app"),
            'bans': () => renderBansTab("app"), 
            'matches': () => renderMatchesTab("app"),
            'stats': () => renderStatsTab("app"),
            'finanzen': () => renderFinanzenTab("app"),
            'spieler': () => renderSpielerTab("app")
        };
        
        const renderer = tabRenderers[currentTab];
        if (renderer) {
            await renderer();
        } else {
            appDiv.innerHTML = `<div class="text-center py-6">Unbekannter Tab: ${currentTab}</div>`;
        }
    } catch (error) {
        console.error('Error rendering tab:', error);
        appDiv.innerHTML = `<div class="text-red-700 text-center py-6">Fehler beim Laden des Tabs.</div>`;
    }
};

// Setup functions
const setupBottomNav = () => {
    document.getElementById("nav-squad")?.addEventListener("click", e => { e.preventDefault(); switchTab("squad"); });
    document.getElementById("nav-matches")?.addEventListener("click", e => { e.preventDefault(); switchTab("matches"); });
    document.getElementById("nav-bans")?.addEventListener("click", e => { e.preventDefault(); switchTab("bans"); });
    document.getElementById("nav-finanzen")?.addEventListener("click", e => { e.preventDefault(); switchTab("finanzen"); });
    document.getElementById("nav-stats")?.addEventListener("click", e => { e.preventDefault(); switchTab("stats"); });
    document.getElementById("nav-spieler")?.addEventListener("click", e => { e.preventDefault(); switchTab("spieler"); });
};

const setupLogoutButton = () => {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await signOut();
            renderLoginArea();
        };
    }
};

const renderLoginArea = async () => {
    console.log("renderLoginArea aufgerufen");
    const loginDiv = document.getElementById('login-area');
    const appContainer = document.querySelector('.app-container');
    
    if (!loginDiv || !appContainer) return;
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Current session:", session ? "Active" : "None");
        
        if (session) {
            console.log("✅ User authenticated, showing main app");
            loginDiv.innerHTML = "";
            appContainer.style.display = '';
            setupLogoutButton();
            setupBottomNav();
            switchTab(currentTab);
        } else {
            console.log("❌ No session, showing login form");
            loginDiv.innerHTML = `
                <div class="login-container">
                    <div class="login-card">
                        <div class="login-header">
                            <div class="login-logo">
                                <i class="fas fa-futbol"></i>
                            </div>
                            <h1 class="login-title">FIFA Tracker</h1>
                            <p class="login-subtitle">Verwalten Sie Ihre FIFA-Teams und Spiele</p>
                        </div>
                        
                        <form id="loginform">
                            <div class="form-group">
                                <label for="email" class="form-label">E-Mail-Adresse</label>
                                <input 
                                    type="email" 
                                    id="email" 
                                    required 
                                    placeholder="ihre@email.com" 
                                    class="form-input" 
                                    value="demo@example.com" />
                            </div>
                            <div class="form-group">
                                <label for="pw" class="form-label">Passwort</label>
                                <input 
                                    type="password" 
                                    id="pw" 
                                    required 
                                    placeholder="Ihr Passwort" 
                                    class="form-input" 
                                    value="demo123" />
                            </div>
                            <button
                                type="submit"
                                class="btn btn-primary btn-full login-btn">
                                <i class="fas fa-sign-in-alt"></i> 
                                <span>Anmelden</span>
                            </button>
                        </form>
                        
                        <div class="demo-note">
                            <p><strong>Demo-Modus:</strong> Verwenden Sie beliebige Anmeldedaten.</p>
                        </div>
                    </div>
                </div>
            `;
            appContainer.style.display = 'none';
            
            const loginForm = document.getElementById('loginform');
            if (loginForm) {
                loginForm.onsubmit = async e => {
                    e.preventDefault();
                    const emailInput = document.getElementById('email');
                    const passwordInput = document.getElementById('pw');
                    const loginBtn = document.querySelector('.login-btn');
                    
                    if (loginBtn) {
                        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Anmelden...';
                    }
                    
                    try {
                        await signIn(emailInput.value, passwordInput.value);
                        console.log("✅ Login successful");
                    } catch (error) {
                        console.error("❌ Login failed:", error);
                        if (loginBtn) {
                            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Anmelden';
                        }
                    }
                };
            }
        }
    } catch (error) {
        console.error("Error in renderLoginArea:", error);
    }
};

// Auth state change listener
supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`🔐 Auth state changed: ${event}`);
    
    setTimeout(async () => {
        try {
            if (event === 'SIGNED_IN' && session) {
                const loginDiv = document.getElementById('login-area');
                const appContainer = document.querySelector('.app-container');
                
                if (loginDiv) loginDiv.innerHTML = "";
                if (appContainer) appContainer.style.display = '';
                
                setupLogoutButton();
                setupBottomNav();
                switchTab(currentTab);
            } else {
                renderLoginArea();
            }
        } catch (error) {
            console.error('Error handling auth state change:', error);
        }
    }, 100);
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOMContentLoaded!");
    setupBottomNav();
    await renderLoginArea();
});

console.log("FIFA Tracker main.js loaded successfully!");