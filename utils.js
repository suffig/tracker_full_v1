/**
 * Utility Functions
 * Common helper functions for the application
 */

// Configuration
const DEBUG_MODE = true; // Set to false for production

// Debug utilities for better console management
export class Debug {
    static log(...args) {
        if (DEBUG_MODE) console.log(...args);
    }
    
    static warn(...args) {
        if (DEBUG_MODE) console.warn(...args);
    }
    
    static error(...args) {
        console.error(...args); // Always show errors
    }
    
    static info(...args) {
        if (DEBUG_MODE) console.info(...args);
    }
}

// DOM Utility Functions
export const DOM = {
    // Safe element selection
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
        }
        return element;
    },

    // Safe element creation with error handling
    createElement(tag, attributes = {}, children = []) {
        try {
            const element = document.createElement(tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'textContent') {
                    element.textContent = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else {
                    element.setAttribute(key, value);
                }
            });

            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Element) {
                    element.appendChild(child);
                }
            });

            return element;
        } catch (error) {
            console.error('Error creating element:', error);
            return document.createElement('div'); // Fallback
        }
    },

    // Debounced event listener
    addDebouncedListener(element, event, handler, delay = 300) {
        let timeoutId;
        const debouncedHandler = (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handler(e), delay);
        };
        
        element.addEventListener(event, debouncedHandler);
        
        // Return cleanup function
        return () => {
            clearTimeout(timeoutId);
            element.removeEventListener(event, debouncedHandler);
        };
    },

    // Safe innerHTML with sanitization
    setSafeHTML(element, html) {
        if (!element) return;
        
        // Basic XSS prevention
        const sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        element.innerHTML = sanitized;
    }
};

// Loading State Management
export class LoadingManager {
    constructor() {
        this.loadingStates = new Set();
        this.loadingIndicators = new Map();
    }

    show(key, element = null, message = 'Lädt...') {
        this.loadingStates.add(key);
        
        if (element) {
            const indicator = this.createLoadingIndicator(message);
            this.loadingIndicators.set(key, { element, indicator, originalContent: element.innerHTML });
            element.innerHTML = '';
            element.appendChild(indicator);
        }

        this.updateGlobalLoadingState();
    }

    hide(key) {
        this.loadingStates.delete(key);
        
        if (this.loadingIndicators.has(key)) {
            const { element, originalContent } = this.loadingIndicators.get(key);
            element.innerHTML = originalContent;
            this.loadingIndicators.delete(key);
        }

        this.updateGlobalLoadingState();
    }

    createLoadingIndicator(message) {
        const indicator = document.createElement('div');
        indicator.className = 'flex items-center justify-center py-4';
        indicator.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span class="text-sm text-gray-600">${message}</span>
            </div>
        `;
        return indicator;
    }

    updateGlobalLoadingState() {
        const hasLoading = this.loadingStates.size > 0;
        document.body.classList.toggle('loading', hasLoading);
    }

    isLoading(key = null) {
        return key ? this.loadingStates.has(key) : this.loadingStates.size > 0;
    }
}

// Error Handling Utilities
export class ErrorHandler {
    static showUserError(message, type = 'error') {
        console.error('User Error:', message);
        
        // Create or update error notification
        let notification = document.getElementById('error-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'error-notification';
            notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full mx-4';
            document.body.appendChild(notification);
        }

        const colorClasses = {
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white',
            success: 'bg-green-500 text-white'
        };

        notification.innerHTML = `
            <div class="rounded-lg p-4 shadow-lg ${colorClasses[type] || colorClasses.error}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} mr-2"></i>
                        <span>${message}</span>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        // Auto-remove after 5 seconds for error/warning, 3 seconds for success
        const autoRemoveTime = type === 'success' ? 3000 : 5000;
        setTimeout(() => {
            if (notification && notification.parentElement) {
                notification.remove();
            }
        }, autoRemoveTime);
    }

    static showSuccessMessage(message) {
        this.showUserError(message, 'success');
    }

    static handleDatabaseError(error, operation = 'Database operation') {
        console.error(`${operation} failed:`, error);
        
        let userMessage = 'Ein unerwarteter Fehler ist aufgetreten.';
        let errorType = 'error';
        
        if (error.message) {
            const message = error.message.toLowerCase();
            
            if (error.message.includes('nicht verfügbar')) {
                // Fallback service message - show as-is since it's already user-friendly
                userMessage = error.message;
                errorType = 'warning';
            } else if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
                userMessage = 'Authentifizierungsfehler. Bitte melden Sie sich erneut an.';
            } else if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
                userMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
            } else if (message.includes('constraint') || message.includes('duplicate') || message.includes('unique')) {
                userMessage = 'Diese Daten existieren bereits oder verletzen Datenbankregeln.';
            } else if (message.includes('validierung') || error.message.includes('Validierungsfehler')) {
                userMessage = error.message;
                errorType = 'warning';
            } else if (message.includes('cdn') || message.includes('blocked')) {
                userMessage = 'CDN blockiert - Anwendung läuft im Demo-Modus.';
                errorType = 'info';
            } else if (message.includes('session') || message.includes('token')) {
                userMessage = 'Session abgelaufen. Bitte melden Sie sich erneut an.';
            } else if (message.includes('permission') || message.includes('denied')) {
                userMessage = 'Keine Berechtigung für diese Aktion.';
            } else if (message.includes('not found') || message.includes('404')) {
                userMessage = 'Die angeforderten Daten wurden nicht gefunden.';
                errorType = 'warning';
            } else if (message.includes('server') || message.includes('500') || message.includes('503')) {
                userMessage = 'Server temporär nicht verfügbar. Bitte versuchen Sie es später erneut.';
            } else if (message.includes('offline')) {
                userMessage = 'Keine Internetverbindung. Funktionen sind eingeschränkt.';
                errorType = 'warning';
            }
        }

        // Add context about current connection state
        if (typeof window !== 'undefined' && window.connectionMonitor) {
            const status = window.connectionMonitor.getStatus();
            if (!status.connected) {
                if (status.connectionType === 'fallback') {
                    userMessage += ' (Demo-Modus aktiv)';
                    errorType = 'info';
                } else if (status.connectionType === 'offline') {
                    userMessage += ' (Offline)';
                }
            }
        }

        this.showUserError(userMessage, errorType);
        return userMessage;
    }

    static async withErrorHandling(operation, errorMessage = 'Operation fehlgeschlagen') {
        try {
            return await operation();
        } catch (error) {
            this.handleDatabaseError(error, errorMessage);
            throw error;
        }
    }
}

// Enhanced Form Validation Utilities with real-time feedback
export const FormValidator = {
    validateRequired(value, fieldName) {
        if (!value || value.toString().trim() === '') {
            throw new Error(`${fieldName} ist erforderlich`);
        }
        return true;
    },

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Ungültige E-Mail-Adresse');
        }
        return true;
    },

    validateNumber(value, fieldName, min = null, max = null) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            throw new Error(`${fieldName} muss eine gültige Zahl sein`);
        }
        if (min !== null && num < min) {
            throw new Error(`${fieldName} muss mindestens ${min} sein`);
        }
        if (max !== null && num > max) {
            throw new Error(`${fieldName} darf maximal ${max} sein`);
        }
        return num;
    },

    validateString(value, fieldName, minLength = 0, maxLength = 255) {
        if (typeof value !== 'string') {
            throw new Error(`${fieldName} muss ein Text sein`);
        }
        if (value.length < minLength) {
            throw new Error(`${fieldName} muss mindestens ${minLength} Zeichen haben`);
        }
        if (value.length > maxLength) {
            throw new Error(`${fieldName} darf maximal ${maxLength} Zeichen haben`);
        }
        return value.trim();
    },

    sanitizeInput(value) {
        if (typeof value !== 'string') return value;
        
        return value
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/[<>]/g, '');
    },

    // New: Real-time form validation
    setupRealTimeValidation(form) {
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            this.setupInputValidation(input);
        });
    },

    setupInputValidation(input) {
        if (!input) return;

        const validateField = () => {
            this.clearFieldError(input);
            
            try {
                const value = input.value;
                const fieldName = input.getAttribute('data-field-name') || input.name || input.id;
                
                // Required validation
                if (input.hasAttribute('required') && !value.trim()) {
                    throw new Error(`${fieldName} ist erforderlich`);
                }

                // Type-specific validation
                if (value.trim()) {
                    switch (input.type) {
                        case 'email':
                            this.validateEmail(value);
                            break;
                        case 'number':
                            const min = input.getAttribute('min');
                            const max = input.getAttribute('max');
                            this.validateNumber(value, fieldName, min ? parseFloat(min) : null, max ? parseFloat(max) : null);
                            break;
                        case 'text':
                        case 'textarea':
                            const minLength = input.getAttribute('minlength') || 0;
                            const maxLength = input.getAttribute('maxlength') || 255;
                            this.validateString(value, fieldName, parseInt(minLength), parseInt(maxLength));
                            break;
                    }
                }

                this.showFieldSuccess(input);
                return true;
            } catch (error) {
                this.showFieldError(input, error.message);
                return false;
            }
        };

        // Add event listeners for real-time validation
        input.addEventListener('blur', validateField);
        input.addEventListener('input', Performance.debounce(validateField, 500));
    },

    showFieldError(input, message) {
        input.classList.add('input-error');
        input.classList.remove('input-success');
        
        // Remove existing error message
        this.clearFieldError(input);
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle mr-1"></i>${message}`;
        input.parentNode.appendChild(errorDiv);
    },

    showFieldSuccess(input) {
        input.classList.add('input-success');
        input.classList.remove('input-error');
        this.clearFieldError(input);
    },

    clearFieldError(input) {
        input.classList.remove('input-error', 'input-success');
        const errorMsg = input.parentNode.querySelector('.field-error-message');
        if (errorMsg) {
            errorMsg.remove();
        }
    },

    // Validate entire form
    validateForm(form) {
        if (!form) return { valid: false, errors: ['Form not found'] };

        const inputs = form.querySelectorAll('input, select, textarea');
        const errors = [];
        let allValid = true;

        inputs.forEach(input => {
            try {
                const value = input.value;
                const fieldName = input.getAttribute('data-field-name') || input.name || input.id;
                
                if (input.hasAttribute('required')) {
                    this.validateRequired(value, fieldName);
                }

                if (value.trim()) {
                    switch (input.type) {
                        case 'email':
                            this.validateEmail(value);
                            break;
                        case 'number':
                            const min = input.getAttribute('min');
                            const max = input.getAttribute('max');
                            this.validateNumber(value, fieldName, min ? parseFloat(min) : null, max ? parseFloat(max) : null);
                            break;
                    }
                }

                this.showFieldSuccess(input);
            } catch (error) {
                this.showFieldError(input, error.message);
                errors.push(error.message);
                allValid = false;
            }
        });

        return { valid: allValid, errors };
    }
};

// Performance Utilities
export const Performance = {
    // Simple debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Simple throttle function  
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Measure and log performance
    measurePerformance(operation, name = 'operation') {
        return async function(...args) {
            const start = performance.now();
            try {
                const result = await operation.apply(this, args);
                const end = performance.now();
                console.log(`${name} took ${(end - start).toFixed(2)}ms`);
                return result;
            } catch (error) {
                const end = performance.now();
                console.error(`${name} failed after ${(end - start).toFixed(2)}ms:`, error);
                throw error;
            }
        };
    }
};

// Date and Time Utilities
export const DateUtils = {
    formatDate(dateString, locale = 'de-DE') {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(locale);
        } catch (error) {
            console.error('Date formatting error:', error);
            return dateString;
        }
    },

    formatDateTime(dateString, locale = 'de-DE') {
        try {
            const date = new Date(dateString);
            return date.toLocaleString(locale);
        } catch (error) {
            console.error('DateTime formatting error:', error);
            return dateString;
        }
    },

    isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    },

    getCurrentDateString() {
        return new Date().toISOString().split('T')[0];
    }
};

// Create singleton instances
export const loadingManager = new LoadingManager();

// Constants
export const POSITIONS = ["TH","LV","RV","IV","ZDM","ZM","ZOM","LM","RM","LF","RF","ST"];
export const TEAMS = ["AEK", "Real", "Ehemalige"];

// Event emitter for app-wide communication
export class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for '${event}':`, error);
            }
        });
    }
}

export const eventBus = new EventEmitter();

// Data Export Utilities
export const DataExport = {
    // Export data to JSON
    exportToJSON(data, filename = 'fifa_tracker_export') {
        try {
            const exportData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                data: data
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}_${DateUtils.getCurrentDateString()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            ErrorHandler.showSuccessMessage('Daten erfolgreich exportiert');
            return true;
        } catch (error) {
            ErrorHandler.handleDatabaseError(error, 'Data Export');
            return false;
        }
    },

    // Export data to CSV
    exportToCSV(data, filename = 'fifa_tracker_export', headers = null) {
        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Keine Daten zum Exportieren vorhanden');
            }

            // Generate headers if not provided
            if (!headers) {
                headers = Object.keys(data[0]);
            }

            // Create CSV content
            const csvContent = [
                headers.join(','),
                ...data.map(row => 
                    headers.map(header => {
                        const value = row[header] || '';
                        // Escape commas and quotes
                        return `"${String(value).replace(/"/g, '""')}"`;
                    }).join(',')
                )
            ].join('\n');

            const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}_${DateUtils.getCurrentDateString()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            ErrorHandler.showSuccessMessage('CSV erfolgreich exportiert');
            return true;
        } catch (error) {
            ErrorHandler.handleDatabaseError(error, 'CSV Export');
            return false;
        }
    },

    // Import data from JSON file
    importFromJSON(file, onSuccess, onError) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = JSON.parse(e.target.result);
                if (jsonData.version && jsonData.data) {
                    onSuccess(jsonData.data, jsonData);
                } else {
                    onSuccess(jsonData, jsonData);
                }
            } catch (error) {
                if (onError) onError(error);
                ErrorHandler.handleDatabaseError(error, 'JSON Import');
            }
        };
        reader.readAsText(file);
    }
};

// Advanced Search and Filter Utilities
export const SearchFilter = {
    // Advanced text search with multiple criteria
    searchData(data, searchTerm, searchFields = []) {
        if (!searchTerm || !Array.isArray(data)) return data;
        
        const normalizedTerm = searchTerm.toLowerCase().trim();
        const terms = normalizedTerm.split(' ').filter(term => term.length > 0);
        
        return data.filter(item => {
            const fieldsToSearch = searchFields.length > 0 ? searchFields : Object.keys(item);
            
            return terms.every(term => 
                fieldsToSearch.some(field => {
                    const value = String(item[field] || '').toLowerCase();
                    return value.includes(term);
                })
            );
        });
    },

    // Multi-criteria filtering
    filterData(data, filters = {}) {
        if (!Array.isArray(data) || Object.keys(filters).length === 0) return data;
        
        return data.filter(item => {
            return Object.entries(filters).every(([field, filterValue]) => {
                if (filterValue === null || filterValue === undefined || filterValue === '') {
                    return true; // No filter applied
                }
                
                const itemValue = item[field];
                
                // Handle different filter types
                if (Array.isArray(filterValue)) {
                    return filterValue.includes(itemValue);
                } else if (typeof filterValue === 'object' && filterValue.min !== undefined) {
                    // Range filter
                    const num = parseFloat(itemValue);
                    if (isNaN(num)) return false;
                    if (filterValue.min !== null && num < filterValue.min) return false;
                    if (filterValue.max !== null && num > filterValue.max) return false;
                    return true;
                } else {
                    return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
                }
            });
        });
    },

    // Smart sort with multiple criteria
    sortData(data, sortBy, sortOrder = 'asc') {
        if (!Array.isArray(data) || !sortBy) return data;
        
        return [...data].sort((a, b) => {
            let valueA = a[sortBy];
            let valueB = b[sortBy];
            
            // Handle null/undefined values
            if (valueA == null && valueB == null) return 0;
            if (valueA == null) return sortOrder === 'asc' ? 1 : -1;
            if (valueB == null) return sortOrder === 'asc' ? -1 : 1;
            
            // Convert to numbers if possible
            const numA = parseFloat(valueA);
            const numB = parseFloat(valueB);
            if (!isNaN(numA) && !isNaN(numB)) {
                valueA = numA;
                valueB = numB;
            } else {
                // String comparison
                valueA = String(valueA).toLowerCase();
                valueB = String(valueB).toLowerCase();
            }
            
            if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }
};

// Keyboard Shortcuts Manager
export class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            
            const key = this.getKeyString(e);
            const handler = this.shortcuts.get(key);
            
            if (handler) {
                // Don't prevent default if typing in input fields
                if (this.isTypingInInput(e.target)) return;
                
                e.preventDefault();
                handler(e);
            }
        });
    }

    register(keys, handler, description = '') {
        const keyString = Array.isArray(keys) ? keys.join(' OR ') : keys;
        this.shortcuts.set(keyString, handler);
        Debug.log(`Keyboard shortcut registered: ${keyString} - ${description}`);
    }

    unregister(keys) {
        const keyString = Array.isArray(keys) ? keys.join(' OR ') : keys;
        this.shortcuts.delete(keyString);
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }

    getKeyString(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Meta');
        
        if (event.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
            parts.push(event.key.toLowerCase());
        }
        
        return parts.join('+');
    }

    isTypingInInput(target) {
        return target && (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.contentEditable === 'true'
        );
    }

    showHelp() {
        const shortcuts = Array.from(this.shortcuts.entries());
        const helpHtml = `
            <div class="shortcuts-help">
                <h3 class="text-lg font-semibold mb-4">Tastenkürzel</h3>
                <div class="shortcuts-list">
                    ${shortcuts.map(([key, handler]) => `
                        <div class="shortcut-item">
                            <kbd class="shortcut-key">${key}</kbd>
                            <span class="shortcut-desc">${handler.description || 'Aktion ausführen'}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        // You would need to import showModal here or pass it as dependency
        if (typeof showModal === 'function') {
            showModal(helpHtml);
        }
    }
}

export const keyboardShortcuts = new KeyboardShortcuts();

// Theme Management System
export class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('fifa-tracker-theme') || 'dark';
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.setupKeyboardShortcuts();
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        return newTheme;
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('fifa-tracker-theme', theme);
        this.applyTheme(theme);
        eventBus.emit('theme-changed', { theme });
    }

    applyTheme(theme) {
        const body = document.body;
        const html = document.documentElement;
        
        // Remove existing theme classes
        body.classList.remove('theme-dark', 'theme-light', 'nativewind-theme');
        html.classList.remove('dark', 'light');
        
        // Apply new theme classes
        if (theme === 'light') {
            body.classList.add('theme-light');
            html.classList.add('light');
        } else {
            body.classList.add('theme-dark', 'nativewind-theme');
            html.classList.add('dark');
        }
    }

    setupKeyboardShortcuts() {
        keyboardShortcuts.register('ctrl+shift+t', () => {
            const newTheme = this.toggleTheme();
            ErrorHandler.showSuccessMessage(`Theme zu ${newTheme === 'dark' ? 'Dunkel' : 'Hell'} gewechselt`);
        }, 'Theme umschalten');
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

// Accessibility Helper Functions
export const AccessibilityUtils = {
    // Announce content to screen readers
    announceToScreenReader(message, priority = 'polite') {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    },

    // Focus management for modals and dynamic content
    manageFocus: {
        previousFocus: null,
        
        saveFocus() {
            this.previousFocus = document.activeElement;
        },
        
        restoreFocus() {
            if (this.previousFocus && this.previousFocus.focus) {
                this.previousFocus.focus();
                this.previousFocus = null;
            }
        },
        
        trapFocus(container) {
            const focusableElements = container.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            
            if (focusableElements.length === 0) return;
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            const handleTabKey = (e) => {
                if (e.key !== 'Tab') return;
                
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            };
            
            container.addEventListener('keydown', handleTabKey);
            firstElement.focus();
            
            return () => container.removeEventListener('keydown', handleTabKey);
        }
    },

    // Add ARIA labels and descriptions
    enhanceFormAccessibility(form) {
        if (!form) return;

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            // Add required indicator to screen readers
            if (input.hasAttribute('required') && !input.getAttribute('aria-required')) {
                input.setAttribute('aria-required', 'true');
            }

            // Link labels with inputs
            const label = form.querySelector(`label[for="${input.id}"]`);
            if (label && !input.getAttribute('aria-labelledby')) {
                input.setAttribute('aria-labelledby', label.id || `label-${input.id}`);
                if (!label.id) label.id = `label-${input.id}`;
            }

            // Add descriptive text for validation
            const fieldName = input.getAttribute('data-field-name') || input.name || input.id;
            if (!input.getAttribute('aria-describedby')) {
                const descId = `desc-${input.id || Date.now()}`;
                input.setAttribute('aria-describedby', descId);
            }
        });
    },

    // Add skip links for keyboard navigation
    addSkipLinks() {
        const skipNav = document.createElement('div');
        skipNav.className = 'skip-nav';
        skipNav.innerHTML = `
            <a href="#main-content" class="skip-link">Zum Hauptinhalt springen</a>
            <a href="#navigation" class="skip-link">Zur Navigation springen</a>
        `;
        document.body.insertBefore(skipNav, document.body.firstChild);
    },

    // Enhance button accessibility
    enhanceButtonAccessibility(button, description) {
        if (!button) return;
        
        if (!button.getAttribute('aria-label') && description) {
            button.setAttribute('aria-label', description);
        }
        
        // Add keyboard activation for non-button elements
        if (button.tagName !== 'BUTTON' && !button.getAttribute('role')) {
            button.setAttribute('role', 'button');
            button.setAttribute('tabindex', '0');
            
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    button.click();
                }
            });
        }
    }
};

// Enhanced Loading Manager with better UX
export class EnhancedLoadingManager extends LoadingManager {
    constructor() {
        super();
        this.loadingQueue = new Set();
        this.minimumDisplayTime = 500; // Minimum time to show loading to avoid flicker
    }

    async showLoading(message = "Lädt...", options = {}) {
        const {
            id = 'default',
            showProgress = false,
            cancellable = false,
            onCancel = null
        } = options;

        this.loadingQueue.add(id);
        
        const startTime = Date.now();
        super.showLoading(message);

        // Add progress bar if requested
        if (showProgress) {
            this.addProgressBar(id);
        }

        // Add cancel button if requested
        if (cancellable && onCancel) {
            this.addCancelButton(id, onCancel);
        }

        // Announce to screen readers
        AccessibilityUtils.announceToScreenReader(`${message} gestartet`);

        return {
            hide: async () => {
                const elapsed = Date.now() - startTime;
                const remainingTime = Math.max(0, this.minimumDisplayTime - elapsed);
                
                if (remainingTime > 0) {
                    await new Promise(resolve => setTimeout(resolve, remainingTime));
                }
                
                this.loadingQueue.delete(id);
                if (this.loadingQueue.size === 0) {
                    super.hideLoading();
                    AccessibilityUtils.announceToScreenReader("Laden abgeschlossen");
                }
            }
        };
    }

    addProgressBar(id) {
        const loader = document.getElementById('tab-loader');
        if (!loader) return;

        const progressBar = document.createElement('div');
        progressBar.id = `progress-${id}`;
        progressBar.className = 'loading-progress';
        progressBar.innerHTML = `
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: 0%"></div>
            </div>
        `;
        loader.appendChild(progressBar);
    }

    updateProgress(id, percentage) {
        const progressBar = document.getElementById(`progress-${id}`);
        if (progressBar) {
            const fill = progressBar.querySelector('.progress-bar-fill');
            if (fill) {
                fill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
            }
        }
    }

    addCancelButton(id, onCancel) {
        const loader = document.getElementById('tab-loader');
        if (!loader) return;

        const cancelBtn = document.createElement('button');
        cancelBtn.id = `cancel-${id}`;
        cancelBtn.className = 'loading-cancel-btn';
        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Abbrechen';
        cancelBtn.setAttribute('aria-label', 'Laden abbrechen');
        cancelBtn.onclick = () => {
            this.loadingQueue.delete(id);
            if (this.loadingQueue.size === 0) {
                super.hideLoading();
            }
            onCancel();
        };
        loader.appendChild(cancelBtn);
    }
}

// Create enhanced instances
export const themeManager = new ThemeManager();
export const enhancedLoadingManager = new EnhancedLoadingManager();