// Bhashini TTS UI Integration
// Adds TTS controls to the web dashboard

class BhashiniTTSUI {
    constructor() {
        this.ttsService = null;
        this.currentLanguage = 'en'; // Default language
        this.initialized = false;
    }

    /**
     * Initialize TTS UI components
     */
    async init() {
        if (this.initialized) {
            console.warn('TTS UI already initialized');
            return;
        }

        try {
            // Initialize TTS service
            this.ttsService = new BhashiniTTSService();
            
            // Start monitoring screen changes
            this.ttsService.startScreenMonitoring();
            
            // Add TTS controls to header
            this.addHeaderControls();
            
            // Add floating TTS button
            this.addFloatingTTSButton();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load saved language preference
            this.loadLanguagePreference();
            
            this.initialized = true;
            console.log('TTS UI initialized successfully');
            
            // Log current screen info
            this.logCurrentScreen();
        } catch (error) {
            console.error('Failed to initialize TTS UI:', error);
        }
    }

    /**
     * Add TTS controls to the header navigation
     */
    addHeaderControls() {
        // No longer adding header controls as per user request
        // TTS controls are only available via floating button
    }

    /**
     * Add floating TTS button for accessibility
     */
    addFloatingTTSButton() {
        const floatingButton = document.createElement('div');
        floatingButton.className = 'tts-floating-btn';
        floatingButton.innerHTML = `
            <button class="tts-btn tts-floating-trigger" aria-label="Text-to-Speech controls">
                <span class="tts-icon">🔊</span>
            </button>
            <div class="tts-floating-menu hidden">
                <button class="tts-menu-item" data-action="read-page">
                    <span>📄</span> Read Entire Page
                </button>
                <button class="tts-menu-item" data-action="read-selection">
                    <span>✂️</span> Read Selection
                </button>
                <button class="tts-menu-item tts-stop-btn" data-action="stop" style="display: none;">
                    <span>⏹️</span> Stop Reading
                </button>
            </div>
        `;
        document.body.appendChild(floatingButton);
    }

    /**
     * Setup event listeners for TTS controls
     */
    setupEventListeners() {
        // Header TTS button removed - no longer needed

        // Floating TTS button
        const floatingTrigger = document.querySelector('.tts-floating-trigger');
        if (floatingTrigger) {
            floatingTrigger.addEventListener('click', () => this.toggleFloatingMenu());
        }

        // Floating menu items
        document.querySelectorAll('.tts-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleMenuAction(action);
            });
        });

        // Listen for language changes
        window.addEventListener('language-changed', (e) => {
            this.currentLanguage = e.detail.language || 'en';
            this.saveLanguagePreference();
        });

        // Listen for screen changes
        window.addEventListener('tts-screen-change', (e) => {
            console.log('TTS: Active screen changed to', e.detail.screenId);
            this.logCurrentScreen();
        });

        // Listen for TTS state changes to show/hide stop button
        window.addEventListener('tts-state-change', (e) => {
            this.updateStopButtonVisibility(e.detail.isSpeaking);
        });

        // Listen for app language changes (from settings)
        const appLanguageSelect = document.getElementById('appLanguageSelect');
        if (appLanguageSelect) {
            appLanguageSelect.addEventListener('change', (e) => {
                this.currentLanguage = e.target.value;
                this.saveLanguagePreference();
            });
        }

        // Listen for voice language changes (from settings)
        const voiceLanguageSelect = document.getElementById('voiceLanguage');
        if (voiceLanguageSelect) {
            voiceLanguageSelect.addEventListener('change', (e) => {
                this.currentLanguage = e.target.value;
                this.saveLanguagePreference();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + R: Read page
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
                e.preventDefault();
                this.handleReadPage();
            }
            // Ctrl/Cmd + Shift + S: Stop reading
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.handleStop();
            }
        });
    }

    /**
     * Handle read page action
     */
    async handleReadPage() {
        if (!this.ttsService) {
            console.error('TTS service not initialized');
            return;
        }

        try {
            // Get current screen info
            const screenSummary = this.ttsService.getCurrentScreenSummary();
            console.log('Reading from screen:', screenSummary);
            
            const screenName = screenSummary.screenId ? screenSummary.screenId.replace('Screen', '').replace(/([A-Z])/g, ' $1').trim() : 'current page';
            
            this.showStatus(`Reading ${screenName} content...`, 'info');
            await this.ttsService.readPageContent(this.currentLanguage);
            this.showStatus('Finished reading', 'success');
        } catch (error) {
            console.error('Error reading page:', error);
            this.showStatus('Failed to read page content', 'error');
        }
    }

    /**
     * Handle read selection action
     */
    async handleReadSelection() {
        if (!this.ttsService) {
            console.error('TTS service not initialized');
            return;
        }

        const selectedText = window.getSelection().toString().trim();
        
        if (!selectedText) {
            this.showStatus('No text selected', 'info');
            return;
        }

        try {
            this.showStatus('Reading selected text...', 'info');
            await this.ttsService.speak(selectedText, this.currentLanguage);
            this.showStatus('Finished reading selection', 'success');
        } catch (error) {
            console.error('Error reading selection:', error);
            this.showStatus('Failed to read selection', 'error');
        }
    }

    /**
     * Handle stop reading action
     */
    handleStop() {
        if (!this.ttsService) {
            console.error('TTS service not initialized');
            return;
        }

        this.ttsService.stopSpeaking();
        this.showStatus('Stopped reading', 'info');
    }

    /**
     * Handle floating menu actions
     */
    async handleMenuAction(action) {
        this.toggleFloatingMenu(); // Close menu

        switch (action) {
            case 'read-page':
                await this.handleReadPage();
                break;
            case 'read-selection':
                await this.handleReadSelection();
                break;
            case 'stop':
                this.handleStop();
                break;
            default:
                console.warn('Unknown TTS action:', action);
        }
    }

    /**
     * Toggle floating menu visibility
     */
    toggleFloatingMenu() {
        const menu = document.querySelector('.tts-floating-menu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }

    /**
     * Update stop button visibility based on speaking state
     */
    updateStopButtonVisibility(isSpeaking) {
        const stopBtn = document.querySelector('.tts-stop-btn');
        const floatingTrigger = document.querySelector('.tts-floating-trigger');
        
        if (stopBtn) {
            stopBtn.style.display = isSpeaking ? 'flex' : 'none';
        }
        
        // Update floating trigger appearance when speaking
        if (floatingTrigger) {
            if (isSpeaking) {
                floatingTrigger.classList.add('speaking');
            } else {
                floatingTrigger.classList.remove('speaking');
            }
        }
    }

    /**
     * Show status message to user
     */
    showStatus(message, type = 'info') {
        // Try to use existing status message system
        if (window.app && typeof window.app.showStatus === 'function') {
            window.app.showStatus(message, type);
        } else {
            // Fallback: create temporary notification
            const notification = document.createElement('div');
            notification.className = `tts-notification tts-notification-${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
                color: white;
                z-index: 10000;
                animation: slideInRight 0.3s ease-out;
            `;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    }

    /**
     * Save language preference to localStorage
     */
    saveLanguagePreference() {
        try {
            localStorage.setItem('tts-language', this.currentLanguage);
        } catch (error) {
            console.warn('Failed to save language preference:', error);
        }
    }

    /**
     * Load language preference from localStorage
     */
    loadLanguagePreference() {
        try {
            const saved = localStorage.getItem('tts-language');
            if (saved) {
                this.currentLanguage = saved;
            }
        } catch (error) {
            console.warn('Failed to load language preference:', error);
        }
    }

    /**
     * Speak custom text (for programmatic use)
     */
    async speak(text, language = null) {
        if (!this.ttsService) {
            console.error('TTS service not initialized');
            return;
        }

        const lang = language || this.currentLanguage;
        await this.ttsService.speak(text, lang);
    }

    /**
     * Speak success message
     */
    async speakSuccess(language = null) {
        if (!this.ttsService) {
            console.error('TTS service not initialized');
            return;
        }

        const lang = language || this.currentLanguage;
        await this.ttsService.speakSuccess(lang);
    }

    /**
     * Speak error message
     */
    async speakError(language = null) {
        if (!this.ttsService) {
            console.error('TTS service not initialized');
            return;
        }

        const lang = language || this.currentLanguage;
        await this.ttsService.speakError(lang);
    }

    /**
     * Log current screen information (for debugging)
     */
    logCurrentScreen() {
        if (!this.ttsService) return;
        
        const summary = this.ttsService.getCurrentScreenSummary();
        console.log('📄 Current TTS Context:', summary);
    }

    /**
     * Test TTS with current screen content
     */
    async testCurrentScreen() {
        if (!this.ttsService) {
            console.error('TTS service not initialized');
            return;
        }

        const summary = this.ttsService.getCurrentScreenSummary();
        console.log('Testing TTS with current screen:', summary);
        
        if (summary.contentLength === 0) {
            this.showStatus('No content to read on current screen', 'info');
            return;
        }

        await this.handleReadPage();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ttsUI = new BhashiniTTSUI();
    window.ttsUI.init();
});

// Export for global access
window.BhashiniTTSUI = BhashiniTTSUI;
