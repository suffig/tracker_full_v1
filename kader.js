import { POSITIONEN, savePlayer as dataSavePlayer, deletePlayer as dataDeletePlayer } from './data.js';
import { showModal, hideModal, showSuccessAndCloseModal } from './modal.js';
import { supabaseDb, supabase } from './supabaseClient.js';
import { isDatabaseAvailable } from './connectionMonitor.js';
import { ErrorHandler } from './utils.js';

let aekAthen = [];
let realMadrid = [];
let ehemalige = [];
let finances = {
    aekAthen: { balance: 0 },
    realMadrid: { balance: 0 }
};
let transactions = [];

const POSITION_ORDER = {
    "TH": 0, "IV": 1, "LV": 2, "RV": 3, "ZDM": 4, "ZM": 5,
    "ZOM": 6, "LM": 7, "RM": 8, "LF": 9, "RF": 10, "ST": 11
};

// --- ACCORDION Panel Zustand ---
let openPanel = null; // "aek", "real", "ehemalige" oder null

// --- Enhanced Positions-Badge Classes with Modern Design ---
function getPositionBadgeClass(pos) {
    if (pos === "TH") return "bg-gradient-to-r from-purple-500 to-purple-600 text-purple-100 border-purple-400";
    if (["IV", "LV", "RV", "ZDM"].includes(pos)) return "bg-gradient-to-r from-blue-500 to-blue-600 text-blue-100 border-blue-400";
    if (["ZM", "ZOM", "LM", "RM"].includes(pos)) return "bg-gradient-to-r from-green-500 to-green-600 text-green-100 border-green-400";
    if (["LF", "RF", "ST"].includes(pos)) return "bg-gradient-to-r from-red-500 to-red-600 text-red-100 border-red-400";
    return "bg-gradient-to-r from-gray-500 to-gray-600 text-gray-100 border-gray-400";
}

async function loadPlayersAndFinances(renderFn = renderPlayerLists) {
    try {
        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Lade Daten...</div>';
        const appDiv = document.getElementById('app');
        if (appDiv) appDiv.appendChild(loadingDiv);

        const [playersResult, finResult, transResult] = await Promise.allSettled([
            supabaseDb.select('players', '*'),
            supabaseDb.select('finances', '*'),
            supabaseDb.select('transactions', '*', { 
                order: { column: 'id', ascending: false } 
            })
        ]);

        if (playersResult.status === 'fulfilled' && playersResult.value.data) {
            const players = playersResult.value.data;
            aekAthen = players.filter(p => p.team === "AEK");
            realMadrid = players.filter(p => p.team === "Real");
            ehemalige = players.filter(p => p.team === "Ehemalige");
        }
        if (finResult.status === 'fulfilled' && finResult.value.data) {
            const finData = finResult.value.data;
            finances = {
                aekAthen: finData.find(f => f.team === "AEK") || { balance: 0 },
                realMadrid: finData.find(f => f.team === "Real") || { balance: 0 }
            };
        }
        if (transResult.status === 'fulfilled' && transResult.value.data) {
            transactions = transResult.value.data;
        }

        if (loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }

        renderFn();
    } catch (error) {
        console.error('Error loading data:', error);
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
                <strong>Fehler beim Laden der Daten.</strong> 
                ${isDatabaseAvailable() ? 'Bitte versuchen Sie es erneut.' : 'Keine Datenbankverbindung.'}
                <button onclick="this.parentElement.remove()" class="float-right font-bold text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100">×</button>
            </div>
        `;
        const appDiv = document.getElementById('app');
        if (appDiv) appDiv.insertBefore(errorDiv, appDiv.firstChild);
        renderFn();
    }
}

export function renderKaderTab(containerId = "app") {
    const app = document.getElementById(containerId);
    loadPlayersAndFinances(renderPlayerLists);

    app.innerHTML = `
        <div class="w-full px-1 animate-fade-in">
            <div class="flex flex-col sm:flex-row justify-between mb-6 gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <i class="fas fa-users text-white text-xl"></i>
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold text-white mb-1">Team-Kader</h2>
                        <p class="text-gray-400 text-sm">Verwalte deine FIFA-Teams</p>
                    </div>
                </div>
            </div>
            <div class="space-y-6">
                ${accordionPanelHtml('AEK Athen', 'aek', 'from-blue-600 to-blue-700', 'text-blue-100', '⚽')}
                ${accordionPanelHtml('Real Madrid', 'real', 'from-red-600 to-red-700', 'text-red-100', '👑')}
                ${accordionPanelHtml('Ehemalige', 'ehemalige', 'from-gray-600 to-gray-700', 'text-gray-100', '📋')}
            </div>
        </div>
    `;
    ['aek', 'real', 'ehemalige'].forEach(team => {
        document.getElementById(`panel-toggle-${team}`)?.addEventListener('click', () => {
            openPanel = openPanel === team ? null : team;
            renderKaderTab(containerId); // Neu rendern, damit Panel-Inhalt sichtbar wird
        });
    });
}

function accordionPanelHtml(team, key, gradientClass, textClass, icon) {
    const isOpen = openPanel === key;
    return `
        <div class="bg-gradient-to-r ${gradientClass} rounded-3xl border-2 border-white/20 shadow-xl backdrop-blur-sm transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
            <button id="panel-toggle-${key}" class="flex justify-between items-center w-full px-6 py-5 ${textClass} font-bold transition-all duration-200 group" style="font-size:1.2rem;">
                <div class="flex items-center gap-3">
                    <span class="text-2xl">${icon}</span>
                    <span class="font-extrabold tracking-wide">${team}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-lg transition-transform duration-300 ${isOpen ? 'rotate-90' : ''} group-hover:scale-110">▶</span>
                </div>
            </button>
            <div id="panel-content-${key}" class="transition-all duration-300 overflow-hidden" style="${isOpen ? 'max-height: 2000px; opacity: 1;' : 'max-height: 0; opacity: 0;'}">
                <div class="px-6 pb-6">
                    <button id="add-player-${key}" class="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white w-full px-6 py-4 rounded-2xl text-lg flex items-center justify-center gap-3 font-bold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] border border-white/30 group">
                        <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                        </div>
                        <span>Spieler hinzufügen</span>
                    </button>
                    <div id="team-${key}-players" class="space-y-3 mt-4 animate-slide-up"></div>
                    ${team !== 'Ehemalige' ? `
                        <div class="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-semibold ${textClass} opacity-90">Gesamter Marktwert:</span>
                                <span id="${key}-marktwert" class="text-lg font-bold ${textClass}">0M €</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderPlayerLists() {
    if (openPanel === 'aek' && document.getElementById('team-aek-players')) {
        renderPlayerList('team-aek-players', aekAthen, "AEK");
        const mwSpan = document.getElementById('aek-marktwert');
        if (mwSpan) mwSpan.innerText = getKaderMarktwert(aekAthen).toLocaleString('de-DE') + "M €";
    }
    if (openPanel === 'real' && document.getElementById('team-real-players')) {
        renderPlayerList('team-real-players', realMadrid, "Real");
        const mwSpan = document.getElementById('real-marktwert');
        if (mwSpan) mwSpan.innerText = getKaderMarktwert(realMadrid).toLocaleString('de-DE') + "M €";
    }
    if (openPanel === 'ehemalige' && document.getElementById('team-ehemalige-players')) {
        renderEhemaligeList('team-ehemalige-players');
    }
    // Add Player-Button Handler nur im offenen Panel
    if (openPanel === 'aek' && document.getElementById('add-player-aek')) document.getElementById('add-player-aek').onclick = () => openPlayerForm('AEK');
    if (openPanel === 'real' && document.getElementById('add-player-real')) document.getElementById('add-player-real').onclick = () => openPlayerForm('Real');
    if (openPanel === 'ehemalige' && document.getElementById('add-player-ehemalige')) document.getElementById('add-player-ehemalige').onclick = () => openPlayerForm('Ehemalige');
}

function renderPlayerList(containerId, arr, team) {
    const c = document.getElementById(containerId);
    if (!c) return;
    arr = arr.slice().sort((a, b) => {
        const posA = POSITION_ORDER[a.position] ?? 99;
        const posB = POSITION_ORDER[b.position] ?? 99;
        return posA - posB;
    });
    c.innerHTML = "";
    
    if (arr.length === 0) {
        c.innerHTML = `
            <div class="text-center py-8 px-4">
                <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-user-plus text-2xl text-white/60"></i>
                </div>
                <p class="text-white/70 text-lg">Noch keine Spieler</p>
                <p class="text-white/50 text-sm mt-1">Füge den ersten Spieler hinzu</p>
            </div>
        `;
        return;
    }
    
    arr.forEach((player, index) => {
        const marktwert = typeof player.value === 'number'
            ? player.value
            : (player.value ? parseFloat(player.value) : 0);

        // Enhanced position badge with better styling
        const posBadge = player.position
            ? `<span class="inline-flex items-center justify-center rounded-xl px-3 py-1.5 border-2 font-bold text-xs mr-3 ${getPositionBadgeClass(player.position)} shadow-lg backdrop-blur-sm">${player.position}</span>`
            : "";

        const d = document.createElement("div");
        d.className = "player-card flex items-center bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border-2 border-white/20 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 min-h-[120px] group animate-slide-in";
        d.style.animationDelay = `${index * 0.1}s`;
        d.innerHTML = `
          <div class="flex flex-col gap-3 mr-4">
            <button class="edit-btn bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all duration-200 p-3 rounded-xl flex items-center group-hover:scale-110 border border-white/30" title="Bearbeiten">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 17H6v-3L16.293 3.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414L9 17z" />
              </svg>
            </button>
          </div>
          <div class="flex-1 flex flex-col min-w-0">
            <div class="flex items-center mb-2 flex-wrap gap-2">
              ${posBadge}
              <p class="font-bold text-white text-lg truncate">${player.name}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-white/70 text-sm">Marktwert:</span>
              <span class="font-extrabold text-white text-lg">${marktwert}M €</span>
            </div>
          </div>
          <div class="flex flex-col gap-3 ml-4">
            <button class="move-btn bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500 text-white transition-all duration-200 p-3 rounded-xl flex items-center group-hover:scale-110 shadow-lg border border-gray-400/30" title="Zu Ehemalige">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        `;
        d.querySelector('.edit-btn').onclick = () => openPlayerForm(team, player.id);
        d.querySelector('.move-btn').onclick = () => movePlayerWithTransaction(player.id, "Ehemalige");
        c.appendChild(d);
    });
}


function renderEhemaligeList(containerId = "ehemalige-players") {
    const c = document.getElementById(containerId);
    if (!c) return;
    const sorted = ehemalige.slice().sort((a, b) => {
        const posA = POSITION_ORDER[a.position] ?? 99;
        const posB = POSITION_ORDER[b.position] ?? 99;
        return posA - posB;
    });
    c.innerHTML = "";
    
    if (sorted.length === 0) {
        c.innerHTML = `
            <div class="text-center py-8 px-4">
                <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i class="fas fa-archive text-2xl text-white/60"></i>
                </div>
                <p class="text-white/70 text-lg">Keine ehemaligen Spieler</p>
                <p class="text-white/50 text-sm mt-1">Hier werden ausgemusterte Spieler angezeigt</p>
            </div>
        `;
        return;
    }
    
    sorted.forEach((player, index) => {
        const marktwert = typeof player.value === 'number'
            ? player.value
            : (player.value ? parseFloat(player.value) : 0);

        // Enhanced position badge
        const posBadge = player.position
            ? `<span class="inline-flex items-center justify-center rounded-xl px-3 py-1.5 border-2 font-bold text-xs mr-3 ${getPositionBadgeClass(player.position)} shadow-lg backdrop-blur-sm">${player.position}</span>`
            : "";

        const d = document.createElement("div");
        d.className = "player-card flex items-center bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-md border-2 border-white/20 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 min-h-[120px] group animate-slide-in";
        d.style.animationDelay = `${index * 0.1}s`;
        d.innerHTML = `
          <div class="flex flex-col gap-2 mr-4">
            <button class="edit-btn bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all duration-200 p-3 rounded-xl flex items-center group-hover:scale-110 border border-white/30" title="Bearbeiten">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 17H6v-3L16.293 3.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414L9 17z" />
              </svg>
            </button>
            <button class="delete-btn bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white transition-all duration-200 p-3 rounded-xl flex items-center group-hover:scale-110 shadow-lg border border-red-400/30" title="Löschen">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4a2 2 0 012 2v2H8V5a2 2 0 012-2z" />
              </svg>
            </button>
          </div>
          <div class="flex-1 flex flex-col min-w-0">
            <div class="flex items-center mb-2 flex-wrap gap-2">
              ${posBadge}
              <p class="font-bold text-white text-lg truncate">${player.name}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-white/70 text-sm">Marktwert:</span>
              <span class="font-extrabold text-white text-lg">${marktwert ? marktwert + "M €" : "Unbekannt"}</span>
            </div>
          </div>
          <div class="flex flex-col gap-2 ml-4">
            <button class="move-aek-btn bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white transition-all duration-200 p-3 rounded-xl flex items-center group-hover:scale-110 shadow-lg border border-blue-400/30" title="Zu AEK">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <button class="move-real-btn bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white transition-all duration-200 p-3 rounded-xl flex items-center group-hover:scale-110 shadow-lg border border-red-400/30" title="Zu Real">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        `;
        d.querySelector('.edit-btn').onclick = () => openPlayerForm('Ehemalige', player.id);
        d.querySelector('.delete-btn').onclick = () => deletePlayerDb(player.id);
        d.querySelector('.move-aek-btn').onclick = () => movePlayerWithTransaction(player.id, 'AEK');
        d.querySelector('.move-real-btn').onclick = () => movePlayerWithTransaction(player.id, 'Real');
        c.appendChild(d);
    });
}

function getKaderMarktwert(arr) {
    return arr.reduce((sum, p) => {
        let v = (typeof p.value === "number" ? p.value : (p.value ? parseFloat(p.value) : 0));
        return sum + v;
    }, 0);
}

async function savePlayer(player) {
    try {
        await dataSavePlayer(player);
    } catch (error) {
        ErrorHandler.showUserError(error.message, "error");
        throw error;
    }
}

async function deletePlayerDb(id) {
    try {
        await dataDeletePlayer(id);
    } catch (error) {
        ErrorHandler.showUserError(error.message, "error");
        throw error;
    }
}

async function movePlayerWithTransaction(id, newTeam) {
    let all = [...aekAthen, ...realMadrid, ...ehemalige];
    const player = all.find(p => p.id === id);
    if (!player) return;

    const oldTeam = player.team;
    const value = typeof player.value === "number" ? player.value : parseFloat(player.value) || 0;
    const abloese = value * 1000000;
    const now = new Date().toISOString().slice(0, 10);

    // Von TEAM zu Ehemalige: VERKAUF
    if ((oldTeam === "AEK" || oldTeam === "Real") && newTeam === "Ehemalige") {
        await supabase.from('transactions').insert([{
            date: now,
            type: "Spielerverkauf",
            team: oldTeam,
            amount: abloese,
            info: `Verkauf von ${player.name} (${player.position})`
        }]);
        let finKey = oldTeam === "AEK" ? "aekAthen" : "realMadrid";
        await supabase.from('finances').update({
            balance: (finances[finKey].balance || 0) + abloese
        }).eq('team', oldTeam);
        await movePlayerToTeam(id, newTeam);
        return;
    }

    // Von Ehemalige zu TEAM: KAUF
    if (oldTeam === "Ehemalige" && (newTeam === "AEK" || newTeam === "Real")) {
        let finKey = newTeam === "AEK" ? "aekAthen" : "realMadrid";
        const konto = finances[finKey].balance || 0;
        if (konto < abloese) {
            ErrorHandler.showUserError("Kontostand zu gering für diesen Transfer!", "warning");
            return;
        }
        await supabase.from('transactions').insert([{
            date: now,
            type: "Spielerkauf",
            team: newTeam,
            amount: -abloese,
            info: `Kauf von ${player.name} (${player.position})`
        }]);
        await supabase.from('finances').update({
            balance: konto - abloese
        }).eq('team', newTeam);
        await movePlayerToTeam(id, newTeam);
        return;
    }

    // Innerhalb Teams oder Ehemalige zu Ehemalige: Nur Move
    await movePlayerToTeam(id, newTeam);
}

async function movePlayerToTeam(id, newTeam) {
    const { error } = await supabase.from('players').update({ team: newTeam }).eq('id', id);
    if (error) ErrorHandler.showUserError(`Fehler beim Verschieben: ${error.message}`, "error");
}

async function saveTransactionAndFinance(team, type, amount, info = "") {
    const now = new Date().toISOString().slice(0, 10);
    await supabase.from('transactions').insert([{ date: now, type, team, amount, info }]);
    const finKey = team === "AEK" ? "aekAthen" : "realMadrid";
    let updateObj = {};
    updateObj.balance = (finances[finKey].balance || 0) + amount;
    await supabase.from('finances').update(updateObj).eq('team', team);
}

function openPlayerForm(team, id) {
    let player = null;
    let edit = false;
    if (id) {
        let all = [...aekAthen, ...realMadrid, ...ehemalige];
        player = all.find(p => p.id === id);
        if (player) edit = true;
    }
    showModal(`
        <form id="player-form" class="space-y-4 w-full">
            <div class="space-y-4">
                <input type="text" name="name" class="border border-slate-600 bg-slate-700 text-slate-100 rounded-lg p-3 w-full text-base placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent" placeholder="Name" value="${player ? player.name : ""}" required>
                <select name="position" class="border border-slate-600 bg-slate-700 text-slate-100 rounded-lg p-3 w-full text-base focus:ring-2 focus:ring-sky-500 focus:border-transparent" required>
                    <option value="">Position wählen</option>
                    ${POSITIONEN.map(pos => `<option${player && player.position === pos ? " selected" : ""}>${pos}</option>`).join("")}
                </select>
                <input type="number" min="0" step="0.1" name="value" class="border border-slate-600 bg-slate-700 text-slate-100 rounded-lg p-3 w-full text-base placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent" placeholder="Marktwert (M)" value="${player && player.value !== undefined ? player.value : ""}" required>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="submit" class="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white w-full px-4 py-3 rounded-lg text-base font-semibold transition-all duration-200 flex gap-2 items-center justify-center shadow-lg hover:shadow-xl active:scale-95">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  ${edit ? "Speichern" : "Anlegen"}
                </button>
                <button type="button" class="bg-slate-600 hover:bg-slate-700 text-slate-100 w-full px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 active:scale-95" onclick="window.hideModal()">Abbrechen</button>
            </div>
        </form>
    `);
    document.getElementById("player-form").onsubmit = (e) => submitPlayerForm(e, team, player ? player.id : null);
}

async function submitPlayerForm(event, team, id) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const position = form.position.value;
    const value = parseFloat(form.value.value);

    try {
        if (!id && (team === "AEK" || team === "Real")) {
            let fin = team === "AEK" ? finances.aekAthen : finances.realMadrid;
            if (fin.balance < value * 1000000) {
                ErrorHandler.showUserError("Kontostand zu gering für diesen Spielerkauf!", "warning");
                return;
            }
            try {
                await saveTransactionAndFinance(team, "Spielerkauf", -value * 1000000, `Kauf von ${name} (${position})`);
            } catch (error) {
                console.warn("Transaction save failed (demo mode):", error);
                // Continue with player save even if transaction fails in demo mode
            }
        }
        if (id) {
            await savePlayer({ id, name, position, value, team });
            showSuccessAndCloseModal(`Spieler ${name} erfolgreich aktualisiert`);
        } else {
            await savePlayer({ name, position, value, team });
            showSuccessAndCloseModal(`Spieler ${name} erfolgreich hinzugefügt`);
        }
    } catch (error) {
        console.error("Error submitting player form:", error);
        ErrorHandler.showUserError(`Fehler beim Speichern des Spielers: ${error.message}`, "error");
    }
}

export { deletePlayerDb };

export function resetKaderState() {
    aekAthen = [];
    realMadrid = [];
    ehemalige = [];
    finances = { aekAthen: { balance: 0 }, realMadrid: { balance: 0 } };
    transactions = [];
    openPanel = null;
}