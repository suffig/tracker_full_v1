import { supabase } from './supabaseClient.js';

export async function renderStatsTab(containerId = "app") {
	console.log("renderStatsTab aufgerufen!", { containerId });
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
        document.getElementById(containerId).innerHTML =
            `<div class="text-red-700 dark:text-red-300 p-4">Fehler beim Laden der Statistiken: ${errorBans?.message || ''} ${errorMatches?.message || ''} ${errorPlayers?.message || ''}</div>`;
        return;
    }

    // Spielerlisten
    const aekPlayers = players.filter(p => p.team === "AEK");
    const realPlayers = players.filter(p => p.team === "Real");

    // Übersicht: Tore, Karten, etc.
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
    const avgCardsPerMatch = totalMatches ? ((gelbA+rotA+gelbB+rotB)/totalMatches).toFixed(2) : "0.00";

    // Höchster Sieg pro Team
    function getHighestWin(team) {
        let maxDiff = -1;
        let result = null;
        matches.forEach(m => {
            let diff = 0, goalsFor = 0, goalsAgainst = 0, date = m.date || "";
            if (team === "AEK") {
                diff = (m.goalsa || 0) - (m.goalsb || 0);
                goalsFor = m.goalsa || 0;
                goalsAgainst = m.goalsb || 0;
            } else {
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
        <div class="mt-4" id="bans-table-wrap" style="display:none;">
            <div class="overflow-x-auto">
                <table class="w-full mt-3 text-sm bg-white dark:bg-slate-700 rounded-lg overflow-hidden shadow-sm border border-slate-200 dark:border-slate-600">
                    <thead>
                        <tr class="bg-slate-50 dark:bg-slate-600">
                            <th class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Spieler</th>
                            <th class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Typ</th>
                            <th class="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Spiele</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200 dark:divide-slate-600">
                        ${bans.map(b => {
                            const p = players.find(pl => pl.id === b.player_id);
                            return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-600/50">
                                <td class="px-4 py-3 text-slate-900 dark:text-slate-100">${p ? p.name : "?"}</td>
                                <td class="px-4 py-3 text-slate-700 dark:text-slate-300">${b.type || ""}</td>
                                <td class="px-4 py-3 text-slate-700 dark:text-slate-300">${b.totalgames || ""}</td>
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
        <div class="space-y-6">
            <!-- Header -->
            <div class="text-center">
                <h1 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">📊 Statistiken</h1>
                <p class="text-slate-600 dark:text-slate-400">Übersicht über alle Spiele, Tore und Karten</p>
            </div>

            <!-- Overview Stats -->
            <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span class="text-2xl">⚽</span>
                    Spielübersicht
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${totalGoals}</div>
                        <div class="text-sm text-blue-700 dark:text-blue-300">Tore gesamt</div>
                    </div>
                    <div class="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${totalGelb}</div>
                        <div class="text-sm text-yellow-700 dark:text-yellow-300">Gelbe Karten</div>
                    </div>
                    <div class="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div class="text-2xl font-bold text-red-600 dark:text-red-400">${totalRot}</div>
                        <div class="text-sm text-red-700 dark:text-red-300">Rote Karten</div>
                    </div>
                    <div class="text-center p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                        <div class="text-2xl font-bold text-slate-600 dark:text-slate-400">${totalMatches}</div>
                        <div class="text-sm text-slate-700 dark:text-slate-300">Spiele gesamt</div>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div class="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
                        <span class="text-slate-600 dark:text-slate-400">Ø Tore pro Spiel:</span>
                        <span class="font-bold text-slate-900 dark:text-white ml-2">${avgGoalsPerMatch}</span>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
                        <span class="text-slate-600 dark:text-slate-400">Ø Karten pro Spiel:</span>
                        <span class="font-bold text-slate-900 dark:text-white ml-2">${avgCardsPerMatch}</span>
                    </div>
                </div>
                ${maxGoalsSingle > 0 ? `
                    <div class="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <span class="text-emerald-700 dark:text-emerald-300 text-sm">
                            🥅 Rekord: <strong>${maxGoalsSingle}</strong> Tore von <strong>${maxGoalsPlayer?.name || "?"}</strong> in einem Spiel
                        </span>
                    </div>
                ` : ''}
            </div>

            <!-- Team High Scores -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
                    <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
                        <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">🏆</span>
                        AEK Athen - Höchster Sieg
                    </h3>
                    <div class="text-2xl font-bold">
                        ${aekBestWin ? `${aekBestWin.goalsFor}:${aekBestWin.goalsAgainst}` : "–"}
                    </div>
                    <div class="text-blue-100 text-sm mt-1">
                        ${aekBestWin ? aekBestWin.date : "Noch kein Sieg"}
                    </div>
                </div>
                
                <div class="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl p-6 shadow-lg">
                    <h3 class="text-lg font-bold mb-3 flex items-center gap-2">
                        <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">🏆</span>
                        Real Madrid - Höchster Sieg
                    </h3>
                    <div class="text-2xl font-bold">
                        ${realBestWin ? `${realBestWin.goalsFor}:${realBestWin.goalsAgainst}` : "–"}
                    </div>
                    <div class="text-red-100 text-sm mt-1">
                        ${realBestWin ? realBestWin.date : "Noch kein Sieg"}
                    </div>
                </div>
            </div>

            <!-- Bans Statistics -->
            <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span class="text-2xl">🚫</span>
                    Sperren-Statistiken
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-3">
                        <h3 class="font-semibold text-blue-600 dark:text-blue-400">AEK Athen</h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-slate-600 dark:text-slate-400">Gesamt Sperren:</span>
                                <span class="font-bold">${totalBansAek}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-600 dark:text-slate-400">Ø Dauer:</span>
                                <span class="font-bold">${avgBanDurationAek} Spiele</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-600 dark:text-slate-400">Meiste Sperren:</span>
                                <span class="font-bold">${topBannedAek}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-3">
                        <h3 class="font-semibold text-red-600 dark:text-red-400">Real Madrid</h3>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-slate-600 dark:text-slate-400">Gesamt Sperren:</span>
                                <span class="font-bold">${totalBansReal}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-600 dark:text-slate-400">Ø Dauer:</span>
                                <span class="font-bold">${avgBanDurationReal} Spiele</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-600 dark:text-slate-400">Meiste Sperren:</span>
                                <span class="font-bold">${topBannedReal}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${bans.length > 0 ? `
                    <div class="mt-6">
                        <button id="toggle-bans-table" class="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm transition-colors">
                            📋 Alle Sperren anzeigen
                        </button>
                        ${bansTableHtml}
                    </div>
                ` : ''}
            </div>

            <!-- Goal Statistics -->
            <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <span class="text-2xl">⚽</span>
                    Tor-Statistiken
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">${totalToreAek}</div>
                        <div class="text-blue-700 dark:text-blue-300 font-medium">AEK Athen Tore</div>
                        <div class="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            Ø ${aekPlayers.length ? (totalToreAek / aekPlayers.length).toFixed(2) : "0.00"} pro Spieler
                        </div>
                    </div>
                    
                    <div class="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div class="text-3xl font-bold text-red-600 dark:text-red-400">${totalToreReal}</div>
                        <div class="text-red-700 dark:text-red-300 font-medium">Real Madrid Tore</div>
                        <div class="text-sm text-red-600 dark:text-red-400 mt-1">
                            Ø ${realPlayers.length ? (totalToreReal / realPlayers.length).toFixed(2) : "0.00"} pro Spieler
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
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