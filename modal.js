import { ErrorHandler } from './utils.js';

// Zentrale Modal-Hilfsfunktionen für alle Module
export function showModal(html, options = {}) {
    const {
        closeOnEscape = true,
        closeOnBackdrop = true,
        showCloseButton = true,
        className = '',
        onOpen = null,
        onClose = null
    } = options;

    let modal = document.getElementById("modal-root");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-root";
        document.body.appendChild(modal);
    }

    // Store close callback for later use
    modal._onClose = onClose;

    const closeButtonHtml = showCloseButton ? 
        `<button class="close-modal-btn" aria-label="Schließen" onclick="window.hideModal && window.hideModal(); event.stopPropagation();" tabindex="0"></button>` : '';

    modal.innerHTML = `
        <div class="modal ${className}" onclick="${closeOnBackdrop ? 'window.hideModal && window.hideModal()' : 'event.stopPropagation()'}">
            <div class="modal-content" onclick="event.stopPropagation();" role="dialog" aria-modal="true" tabindex="-1">
                ${closeButtonHtml}
                ${html}
            </div>
        </div>
    `;

    // Enhanced keyboard navigation
    if (closeOnEscape) {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                hideModal();
            }
            // Trap focus within modal
            if (e.key === 'Tab') {
                trapFocus(e);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        modal._keydownHandler = handleKeyDown;
    }

    // Focus management
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.focus();
    }

    window.hideModal = hideModal;

    // Call onOpen callback if provided
    if (onOpen && typeof onOpen === 'function') {
        setTimeout(onOpen, 100); // Small delay to ensure modal is rendered
    }
}

// Focus trap helper function
function trapFocus(e) {
    const modal = document.getElementById("modal-root");
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
    }
}

export function hideModal() {
    let modal = document.getElementById("modal-root");
    if (!modal) return;

    // Call onClose callback if exists
    if (modal._onClose && typeof modal._onClose === 'function') {
        modal._onClose();
    }

    // Remove keyboard event listener
    if (modal._keydownHandler) {
        document.removeEventListener('keydown', modal._keydownHandler);
        delete modal._keydownHandler;
    }

    // Clear modal content with animation
    const modalElement = modal.querySelector('.modal');
    if (modalElement) {
        modalElement.style.opacity = '0';
        modalElement.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            modal.innerHTML = "";
            delete modal._onClose;
        }, 200);
    } else {
        modal.innerHTML = "";
        delete modal._onClose;
    }
}

// Enhanced success notification with better UX
export function showSuccessAndCloseModal(message, options = {}) {
    const { delay = 1500, showProgress = true } = options;
    
    ErrorHandler.showSuccessMessage(message);
    
    if (showProgress) {
        // Show a progress indicator
        const modal = document.getElementById("modal-root");
        if (modal) {
            const progressBar = document.createElement('div');
            progressBar.className = 'modal-close-progress';
            progressBar.innerHTML = `
                <div class="progress-bar-container">
                    <div class="progress-bar" style="animation: progress ${delay}ms linear forwards;"></div>
                </div>
            `;
            modal.appendChild(progressBar);
        }
    }
    
    // Kurze Verzögerung, damit User die Benachrichtigung sieht
    setTimeout(() => {
        hideModal();
    }, delay);
}

// New utility function for confirmation modals
export function showConfirmModal(message, onConfirm, onCancel = null) {
    const confirmHtml = `
        <div class="confirm-modal-content">
            <div class="confirm-icon">
                <i class="fas fa-question-circle text-yellow-500 text-4xl mb-4"></i>
            </div>
            <h3 class="text-lg font-semibold mb-4 text-center">${message}</h3>
            <div class="form-btn-row">
                <button type="button" class="btn-secondary" onclick="handleModalCancel()">
                    <i class="fas fa-times mr-2"></i>Abbrechen
                </button>
                <button type="button" class="btn-primary" onclick="handleModalConfirm()">
                    <i class="fas fa-check mr-2"></i>Bestätigen
                </button>
            </div>
        </div>
    `;

    // Store callbacks globally for access from inline handlers
    window.handleModalConfirm = () => {
        if (onConfirm && typeof onConfirm === 'function') {
            onConfirm();
        }
        hideModal();
        // Cleanup
        delete window.handleModalConfirm;
        delete window.handleModalCancel;
    };

    window.handleModalCancel = () => {
        if (onCancel && typeof onCancel === 'function') {
            onCancel();
        }
        hideModal();
        // Cleanup
        delete window.handleModalConfirm;
        delete window.handleModalCancel;
    };

    showModal(confirmHtml, {
        closeOnBackdrop: false,
        closeOnEscape: true,
        onClose: () => {
            // Cleanup if modal is closed via escape or close button
            delete window.handleModalConfirm;
            delete window.handleModalCancel;
        }
    });
}