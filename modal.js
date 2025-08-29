import { ErrorHandler } from './utils.js';

// Zentrale Modal-Hilfsfunktionen für alle Module
export function showModal(html) {
    let modal = document.getElementById("modal-root");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-root";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal" onclick="window.hideModal && window.hideModal()">
            <div class="modal-content" onclick="event.stopPropagation();">
                <div class="modal-header">
                    <button class="modal-close" aria-label="Schließen" onclick="window.hideModal && window.hideModal(); event.stopPropagation();">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${html}
                </div>
            </div>
        </div>
    `;
    window.hideModal = hideModal;
}

export function hideModal() {
    let modal = document.getElementById("modal-root");
    if (modal) modal.innerHTML = "";
}

// Neue Funktion für Success-Benachrichtigung und Modal-Schließung
export function showSuccessAndCloseModal(message) {
    ErrorHandler.showSuccessMessage(message);
    // Kurze Verzögerung, damit User die Benachrichtigung sieht
    setTimeout(() => {
        hideModal();
    }, 500);
}