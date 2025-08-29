import { supabase } from './supabaseClient.js';

export async function renderSpielerTab(containerId = "app") {
    console.log("renderSpielerTab aufgerufen!", { containerId });
    const app = document.getElementById(containerId);
    
    if (app) {
        app.innerHTML = `
            <div class="content-container">
                <div class="mb-6 text-center">
                    <h1 class="text-title-primary font-bold text-2xl mb-2">Spieler-Übersicht</h1>
                    <p class="text-text-secondary">Torschützen und Spieler des Spiels</p>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <button id="show-tore" class="btn btn-primary">
                        <i class="fas fa-futbol"></i>
                        <span>Torschützen</span>
                    </button>
                    <button id="show-sds" class="btn btn-secondary">
                        <i class="fas fa-star"></i>
                        <span>Spieler des Spiels</span>
                    </button>
                </div>
                
                <div id="spieler-content" class="content-area">
                    <div class="text-center text-text-secondary">
                        <p>Wählen Sie eine Kategorie aus, um die Daten anzuzeigen.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listeners
        const toreBtn = document.getElementById('show-tore');
        const sdsBtn = document.getElementById('show-sds');
        
        if (toreBtn) {
            toreBtn.addEventListener('click', () => {
                document.getElementById('spieler-content').innerHTML = `
                    <div class="text-center">
                        <h3 class="text-lg font-semibold mb-4">Torschützenliste</h3>
                        <p class="text-text-secondary">Torschützen werden aus der Datenbank geladen...</p>
                    </div>
                `;
            });
        }
        
        if (sdsBtn) {
            sdsBtn.addEventListener('click', () => {
                document.getElementById('spieler-content').innerHTML = `
                    <div class="text-center">
                        <h3 class="text-lg font-semibold mb-4">Spieler des Spiels</h3>
                        <p class="text-text-secondary">Spieler des Spiels werden aus der Datenbank geladen...</p>
                    </div>
                `;
            });
        }
    }
}

export function resetSpielerState() {
    console.log("Spieler state reset");
}