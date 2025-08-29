import { supabase } from './supabaseClient.js';

export async function renderStatsTab(containerId = "app") {
	console.log("renderStatsTab aufgerufen!", { containerId });
    
    const app = document.getElementById(containerId);
    app.innerHTML = `
        <div class="mb-6 text-center">
            <h1 class="text-2xl font-bold text-text-primary mb-2">Statistiken</h1>
            <p class="text-text-secondary">Detaillierte Spielstatistiken und Analysen</p>
        </div>
        
        <div class="loading-card">
            <div class="spinner"></div>
            <span class="text-text-secondary">Lädt Statistiken...</span>
        </div>
    `;
    
    try {
        // Lade Daten
        const [
            { data: bans = [], error: errorBans },
            { data: matches = [], error: errorMatches },
            { data: players = [], error: errorPlayers }
        ] = await Promise.all([
            supabase.from('bans').select('*'),
            supabase.from('matches').select('*'),
            supabase.from('players').select('*')
        ]);
        
        if (errorBans || errorMatches || errorPlayers) {
            app.innerHTML = `
                <div class="native-card text-center">
                    <i class="fas fa-exclamation-triangle text-6xl text-interactive-danger mb-4"></i>
                    <h3 class="card-title mb-2">Fehler beim Laden</h3>
                    <p class="text-text-secondary">Statistiken konnten nicht geladen werden.</p>
                </div>
            `;
            return;
        }

        // Statistiken berechnen
        const totalMatches = matches.length;
        const totalGoals = matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0);
        let gelbA = 0, rotA = 0, gelbB = 0, rotB = 0;
        matches.forEach(m => {
            gelbA += m.yellowa || 0;
            rotA += m.reda || 0;
            gelbB += m.yellowb || 0;
            rotB += m.redb || 0;
        });
        const totalGelb = gelbA + gelbB;
        const totalRot = rotA + rotB;
        const avgGoalsPerMatch = totalMatches ? (totalGoals / totalMatches).toFixed(2) : "0.00";

        app.innerHTML = `
            <div class="mb-6 text-center">
                <h1 class="text-2xl font-bold text-text-primary mb-2">Statistiken</h1>
                <p class="text-text-secondary">Detaillierte Spielstatistiken und Analysen</p>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="native-card text-center">
                    <div class="card-content">
                        <i class="fas fa-futbol text-3xl text-primary-emerald mb-2"></i>
                        <div class="text-2xl font-bold text-text-primary">${totalMatches}</div>
                        <div class="text-sm text-text-secondary">Spiele</div>
                    </div>
                </div>
                
                <div class="native-card text-center">
                    <div class="card-content">
                        <i class="fas fa-bullseye text-3xl text-interactive-success mb-2"></i>
                        <div class="text-2xl font-bold text-text-primary">${totalGoals}</div>
                        <div class="text-sm text-text-secondary">Tore</div>
                    </div>
                </div>
                
                <div class="native-card text-center">
                    <div class="card-content">
                        <i class="fas fa-square text-3xl text-warning mb-2"></i>
                        <div class="text-2xl font-bold text-text-primary">${totalGelb}</div>
                        <div class="text-sm text-text-secondary">Gelbe Karten</div>
                    </div>
                </div>
                
                <div class="native-card text-center">
                    <div class="card-content">
                        <i class="fas fa-square text-3xl text-interactive-danger mb-2"></i>
                        <div class="text-2xl font-bold text-text-primary">${totalRot}</div>
                        <div class="text-sm text-text-secondary">Rote Karten</div>
                    </div>
                </div>
            </div>
            
            <div class="native-card">
                <div class="card-header">
                    <h3 class="card-title">Durchschnittswerte</h3>
                    <i class="fas fa-chart-line text-text-tertiary"></i>
                </div>
                <div class="card-content">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div class="flex justify-between items-center p-3 bg-surface-tertiary rounded-lg">
                            <span class="text-sm font-medium">Tore pro Spiel</span>
                            <span class="text-lg font-bold text-interactive-success">${avgGoalsPerMatch}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-surface-tertiary rounded-lg">
                            <span class="text-sm font-medium">Karten pro Spiel</span>
                            <span class="text-lg font-bold text-interactive-warning">${((totalGelb + totalRot) / Math.max(totalMatches, 1)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading stats:', error);
        app.innerHTML = `
            <div class="native-card text-center">
                <i class="fas fa-exclamation-triangle text-6xl text-interactive-danger mb-4"></i>
                <h3 class="card-title mb-2">Fehler beim Laden</h3>
                <p class="text-text-secondary">Ein unerwarteter Fehler ist aufgetreten.</p>
            </div>
        `;
    }
}
                diff = (m.goalsb || 0) - (m.goalsa || 0);
                goalsFor = m.goalsb || 0;
                goalsAgainst = m.goalsa || 0;
            }
            if (diff > maxDiff) {
                maxDiff = diff;
                result = { goalsFor, goalsAgainst, date, diff };
            }
        });
        return (result && result.diff > 0) ? result : null;
    }
    const aekBestWin = getHighestWin("AEK");
    const realBestWin = getHighestWin("Real");

    // Sperren Stats
    const bansAek = bans.filter(b => b.team === "AEK");
    const bansReal = bans.filter(b => b.team === "Real");
    const totalBansAek = bansAek.length;
    const totalBansReal = bansReal.length;
    const avgBanDurationAek = totalBansAek ? (bansAek.reduce((s, b) => s + (b.totalgames || b.matchesserved || 0), 0) / totalBansAek).toFixed(2) : "0.00";
    const avgBanDurationReal = totalBansReal ? (bansReal.reduce((s, b) => s + (b.totalgames || b.matchesserved || 0), 0) / totalBansReal).toFixed(2) : "0.00";
    function getTopBannedPlayer(bansArr, teamPlayers) {
        const counter = {};
        bansArr.forEach(b => {
            if (!b.player_id) return;
            counter[b.player_id] = (counter[b.player_id] || 0) + 1;
        });
        const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return "–";
        if (sorted.length === 1 || (sorted.length > 1 && sorted[0][1] > sorted[1][1])) {
            const p = teamPlayers.find(pl => pl.id === Number(sorted[0][0]));
            return p ? `${p.name} (${sorted[0][1]})` : "–";
        }
        return "mehrere";
    }
    const topBannedAek = getTopBannedPlayer(bansAek, aekPlayers);
    const topBannedReal = getTopBannedPlayer(bansReal, realPlayers);

    // Sperren-Tabelle
    const bansTableHtml = bans.length
        ? `
        <div class="mt-3" id="bans-table-wrap" style="display:none;">
            <b>Alle Sperren</b>
            <div style="overflow-x:auto;">
                <table class="w-full mt-2 text-xs border border-gray-600 rounded overflow-hidden bg-gray-800">
                    <thead>
                        <tr class="bg-gray-700">
                            <th class="p-1 text-left">Spieler</th>
                            <th class="p-1 text-left">Typ</th>
                            <th class="p-1 text-left">Spiele</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bans.map(b => {
                            const p = players.find(pl => pl.id === b.player_id);
                            return `<tr>
                                <td class="p-1">${p ? p.name : "?"}</td>
                                <td class="p-1">${b.type || ""}</td>
                                <td class="p-1">${b.totalgames || ""}</td>
                            </tr>`;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
        `
        : '';

    // Tore Stats
    const totalToreAek = aekPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
    const totalToreReal = realPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
    function getTopScorer(playersArr) {
        if (!playersArr.length) return null;
        const top = playersArr.slice().sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];
        return (top && top.goals > 0) ? { name: top.name, goals: top.goals } : null;
    }
    const topScorerAek = getTopScorer(aekPlayers);
    const topScorerReal = getTopScorer(realPlayers);

    // Karten pro Spiel
    const avgGelbA = totalMatches ? (gelbA / totalMatches).toFixed(2) : "0.00";
    const avgRotA = totalMatches ? (rotA / totalMatches).toFixed(2) : "0.00";
    const avgGelbB = totalMatches ? (gelbB / totalMatches).toFixed(2) : "0.00";
    const avgRotB = totalMatches ? (rotB / totalMatches).toFixed(2) : "0.00";

    // Meiste Tore eines Spielers
    let maxGoalsSingle = 0, maxGoalsPlayer = null;
    matches.forEach(m => {
        if (m.goalslista) {
            m.goalslista.forEach(g => {
                if (g.count > maxGoalsSingle) {
                    maxGoalsSingle = g.count;
                    maxGoalsPlayer = aekPlayers.find(p => p.id === g.player_id) || { name: g.player };
                }
            });
        }
        if (m.goalslistb) {
            m.goalslistb.forEach(g => {
                if (g.count > maxGoalsSingle) {
                    maxGoalsSingle = g.count;
                    maxGoalsPlayer = realPlayers.find(p => p.id === g.player_id) || { name: g.player };
                }
            });
        }
    });

    // --- HTML ---
    const app = document.getElementById(containerId);
    app.innerHTML = `
        <div class="mb-4 flex items-center gap-2">
            <span class="text-3xl">📊</span>
            <h2 class="text-2xl font-bold">Statistiken</h2>
        </div>
        <div class="flex flex-col gap-6">

            <!-- Übersicht -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-2">
                <div class="font-bold text-lg mb-1">Übersicht</div>
                <div class="flex flex-wrap gap-4 items-center text-base font-medium mb-2">
                    <span class="flex items-center gap-1 text-blue-700"><span class="text-xl">⚽</span> ${totalGoals} Tore</span>
                    <span class="flex items-center gap-1 text-yellow-600"><span class="text-xl">🟨</span> ${totalGelb} Gelbe Karten</span>
                    <span class="flex items-center gap-1 text-red-600"><span class="text-xl">🟥</span> ${totalRot} Rote Karten</span>
                </div>
                <div class="flex flex-wrap gap-4 text-base mt-1">
                    <span>Ø Tore/Spiel: <b>${avgGoalsPerMatch}</b></span>
                    <span>Ø Karten/Spiel: <b>${avgCardsPerMatch}</b></span>
                </div>
                <div class="flex flex-col gap-1 text-xs mt-2 text-gray-600">
                    ${maxGoalsSingle > 0 ? `Meiste Tore eines Spielers in einem Spiel: <b>${maxGoalsSingle}</b> (${maxGoalsPlayer?.name || "?"})` : ""}
                </div>
                <div class="flex flex-col gap-1 text-xs mt-2">
                    <div>
                        <span class="font-bold text-blue-800">Höchster AEK-Sieg:</span>
                        ${aekBestWin ? `${aekBestWin.goalsFor}:${aekBestWin.goalsAgainst} (${aekBestWin.date})` : "–"}
                    </div>
                    <div>
                        <span class="font-bold text-red-800">Höchster Real-Sieg:</span>
                        ${realBestWin ? `${realBestWin.goalsFor}:${realBestWin.goalsAgainst} (${realBestWin.date})` : "–"}
                    </div>
                </div>
            </div>

            <!-- Sperren -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-2">
                <div class="flex items-center gap-2 font-bold text-lg mb-2">
                    <span class="text-xl">🚫</span>
                    <span>Sperren</span>
                </div>
                <div class="flex flex-col gap-3 text-base mb-1">
                    <div>
                        <div class="flex flex-wrap items-center gap-4">
                            <span class="inline-flex items-center bg-blue-100 text-blue-900 rounded px-3 py-1 font-bold text-base min-w-[80px]">AEK</span>
                            <span class="flex items-center gap-1"><span class="text-amber-600">🔒</span> <b>${totalBansAek}</b> Sperren</span>
                            <span class="flex items-center gap-1"><span>⏱️</span> Ø <b>${avgBanDurationAek}</b> Spiele</span>
                        </div>
                        <div class="pl-[90px] text-blue-900 text-sm italic mt-1">${topBannedAek !== "–" ? `Top: ${topBannedAek}` : ""}</div>
                    </div>
                    <div>
                        <div class="flex flex-wrap items-center gap-4 mt-2">
                            <span class="inline-flex items-center bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-200 rounded px-3 py-1 font-bold text-base min-w-[80px]">Real</span>
                            <span class="flex items-center gap-1"><span class="text-amber-600">🔒</span> <b>${totalBansReal}</b> Sperren</span>
                            <span class="flex items-center gap-1"><span>⏱️</span> Ø <b>${avgBanDurationReal}</b> Spiele</span>
                        </div>
                        <div class="pl-[90px] text-red-900 text-sm italic mt-1">${topBannedReal !== "–" ? `Top: ${topBannedReal}` : ""}</div>
                    </div>
                </div>
                ${bans.length ? `
                    <button id="show-bans-table" class="my-2 bg-gray-700 hover:bg-blue-200 transition text-blue-800 font-semibold py-2 px-4 rounded shadow-sm text-sm">
                        Alle Sperren anzeigen
                    </button>
                ` : ""}
                ${bansTableHtml}
            </div>

            <!-- Geschossene Tore -->
            <div class="flex gap-4 mb-2">
                <div class="flex-1 flex flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-900 border border-blue-200 shadow px-4 py-3 min-w-[130px]">
                    <span class="font-bold text-lg flex items-center gap-2">AEK: <span class="text-2xl">${totalToreAek}</span></span>
                    <span class="flex items-center gap-1 mt-1 text-base">${topScorerAek ? `👑 <span class="font-semibold">${topScorerAek.name}</span> <span class="text-xs">(${topScorerAek.goals})</span>` : "–"}</span>
                </div>
                <div class="flex-1 flex flex-col items-center justify-center rounded-xl bg-red-50 text-red-900 border border-red-200 shadow px-4 py-3 min-w-[130px]">
                    <span class="font-bold text-lg flex items-center gap-2">Real: <span class="text-2xl">${totalToreReal}</span></span>
                    <span class="flex items-center gap-1 mt-1 text-base">${topScorerReal ? `👑 <span class="font-semibold">${topScorerReal.name}</span> <span class="text-xs">(${topScorerReal.goals})</span>` : "–"}</span>
                </div>
            </div>
            
            <!-- Karten (modern, mit schönen Badges & Durchschnitt) -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-2 flex flex-col gap-4">
                <div class="font-bold text-lg mb-2">Karten</div>
                <div class="flex flex-col sm:flex-row gap-4">
                    <div class="flex-1">
                        <div class="font-bold text-blue-900 text-base mb-1">AEK:</div>
                        <div class="flex gap-2 mb-2">
                            <span class="inline-flex items-center bg-yellow-100 text-yellow-900 rounded-full px-3 py-1 font-semibold shadow-sm border border-yellow-200">
                                <span class="mr-1">🟨</span>Gelb: <span class="ml-1">${gelbA}</span>
                            </span>
                            <span class="inline-flex items-center bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 font-semibold shadow-sm border border-red-200 dark:border-red-600">
                                <span class="mr-1">🟥</span>Rot: <span class="ml-1">${rotA}</span>
                            </span>
                        </div>
                        <div class="flex gap-3 mt-1">
                            <span class="inline-flex items-center bg-yellow-50 text-yellow-900 rounded-full px-3 py-1 text-xs font-medium border border-yellow-100 shadow-sm">
                                Ø GK/Spiel: <b class="ml-1">${avgGelbA}</b>
                            </span>
                            <span class="inline-flex items-center bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 text-xs font-medium border border-red-100 dark:border-red-600 shadow-sm">
                                Ø RK/Spiel: <b class="ml-1">${avgRotA}</b>
                            </span>
                        </div>
                    </div>
                    <div class="flex-1">
                        <div class="font-bold text-red-900 text-base mb-1">Real:</div>
                        <div class="flex gap-2 mb-2">
                            <span class="inline-flex items-center bg-yellow-100 text-yellow-900 rounded-full px-3 py-1 font-semibold shadow-sm border border-yellow-200">
                                <span class="mr-1">🟨</span>Gelb: <span class="ml-1">${gelbB}</span>
                            </span>
                            <span class="inline-flex items-center bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 font-semibold shadow-sm border border-red-200 dark:border-red-600">
                                <span class="mr-1">🟥</span>Rot: <span class="ml-1">${rotB}</span>
                            </span>
                        </div>
                        <div class="flex gap-3 mt-1">
                            <span class="inline-flex items-center bg-yellow-50 text-yellow-900 rounded-full px-3 py-1 text-xs font-medium border border-yellow-100 shadow-sm">
                                Ø GK/Spiel: <b class="ml-1">${avgGelbB}</b>
                            </span>
                            <span class="inline-flex items-center bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 text-xs font-medium border border-red-100 dark:border-red-600 shadow-sm">
                                Ø RK/Spiel: <b class="ml-1">${avgRotB}</b>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Button-Logik für die Sperren-Tabelle
    if (bans.length) {
        setTimeout(() => {
            const btn = document.getElementById("show-bans-table");
            const wrap = document.getElementById("bans-table-wrap");
            if (btn && wrap) {
                btn.onclick = () => {
                    wrap.style.display = wrap.style.display === "none" ? "" : "none";
                    btn.innerText = wrap.style.display === "none" ? "Alle Sperren anzeigen" : "Alle Sperren ausblenden";
                };
            }
        }, 0);
    }
}
export function resetStatsState() {}