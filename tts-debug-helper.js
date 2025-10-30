// TTS Debug Helper - Testing utilities for Bhashini TTS
// Add this script to help debug and test TTS screen detection

window.TTSDebug = {
    /**
     * Show which screen is currently active
     */
    showActiveScreen() {
        if (!window.ttsUI || !window.ttsUI.ttsService) {
            console.error('TTS not initialized');
            return;
        }

        const activeScreen = window.ttsUI.ttsService.getActiveScreen();
        if (activeScreen) {
            console.log('🎯 Active Screen:', {
                id: activeScreen.id,
                class: activeScreen.className,
                visible: activeScreen.offsetParent !== null
            });
            
            // Highlight the active screen temporarily
            const originalBorder = activeScreen.style.border;
            activeScreen.style.border = '3px solid #10b981';
            setTimeout(() => {
                activeScreen.style.border = originalBorder;
            }, 2000);
        } else {
            console.log('❌ No active screen found');
        }
    },

    /**
     * Show content that will be read by TTS
     */
    showContentPreview() {
        if (!window.ttsUI || !window.ttsUI.ttsService) {
            console.error('TTS not initialized');
            return;
        }

        const summary = window.ttsUI.ttsService.getCurrentScreenSummary();
        console.log('📝 Content Preview:', summary);
        console.log('Full text:', summary.preview);
        
        return summary;
    },

    /**
     * List all screens and their status
     */
    listAllScreens() {
        const screens = document.querySelectorAll('.screen');
        console.log(`📄 Found ${screens.length} screens:`);
        
        screens.forEach((screen, index) => {
            const style = window.getComputedStyle(screen);
            const isActive = screen.classList.contains('active');
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
            
            console.log(`${index + 1}. ${screen.id}`, {
                active: isActive,
                visible: isVisible,
                display: style.display,
                className: screen.className
            });
        });
    },

    /**
     * Test reading current screen
     */
    async testRead(language = 'en') {
        if (!window.ttsUI) {
            console.error('TTS UI not initialized');
            return;
        }

        console.log('🔊 Testing TTS read...');
        this.showActiveScreen();
        this.showContentPreview();
        
        await window.ttsUI.testCurrentScreen();
    },

    /**
     * Monitor screen changes in real-time
     */
    startMonitoring() {
        console.log('👁️ Starting TTS screen monitoring...');
        
        window.addEventListener('tts-screen-change', (e) => {
            console.log('🔄 Screen changed to:', e.detail.screenId);
            this.showContentPreview();
        });
        
        console.log('Monitoring started. Navigate between screens to see updates.');
    },

    /**
     * Extract and show raw text from active screen
     */
    showRawText() {
        if (!window.ttsUI || !window.ttsUI.ttsService) {
            console.error('TTS not initialized');
            return;
        }

        const activeScreen = window.ttsUI.ttsService.getActiveScreen();
        if (!activeScreen) {
            console.log('No active screen');
            return;
        }

        const text = window.ttsUI.ttsService.extractReadableText(activeScreen);
        console.log('📄 Raw extracted text:');
        console.log('─'.repeat(50));
        console.log(text);
        console.log('─'.repeat(50));
        console.log(`Total characters: ${text.length}`);
        
        return text;
    },

    /**
     * Compare text from all screens
     */
    compareAllScreens() {
        if (!window.ttsUI || !window.ttsUI.ttsService) {
            console.error('TTS not initialized');
            return;
        }

        const screens = document.querySelectorAll('.screen');
        console.log('🔍 Comparing content from all screens:\n');
        
        screens.forEach((screen) => {
            const text = window.ttsUI.ttsService.extractReadableText(screen);
            const isActive = screen.classList.contains('active');
            
            console.log(`${isActive ? '✅' : '⬜'} ${screen.id}:`, {
                characters: text.length,
                preview: text.substring(0, 80) + '...'
            });
        });
    },

    /**
     * Test specific screen by ID
     */
    async testScreenById(screenId, language = 'en') {
        const screen = document.getElementById(screenId);
        if (!screen) {
            console.error(`Screen "${screenId}" not found`);
            return;
        }

        console.log(`🎯 Testing screen: ${screenId}`);
        
        const text = window.ttsUI.ttsService.extractReadableText(screen);
        console.log(`Content length: ${text.length} characters`);
        console.log('Preview:', text.substring(0, 200) + '...');
        
        if (text.length > 0) {
            await window.ttsUI.ttsService.speak(text, language);
        } else {
            console.warn('No content to read from this screen');
        }
    },

    /**
     * Show statistics about current TTS state
     */
    showStats() {
        if (!window.ttsUI || !window.ttsUI.ttsService) {
            console.error('TTS not initialized');
            return;
        }

        const service = window.ttsUI.ttsService;
        const summary = service.getCurrentScreenSummary();
        
        console.log('📊 TTS Statistics:');
        console.log('─'.repeat(50));
        console.log('Current screen:', service.currentScreenId);
        console.log('Content length:', summary.contentLength);
        console.log('Is speaking:', service.isSpeaking);
        console.log('Current language:', window.ttsUI.currentLanguage);
        console.log('Cached pipelines:', service.pipelineCache.size);
        console.log('─'.repeat(50));
    }
};

// Add keyboard shortcut for debugging (Ctrl+Shift+D)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        console.log('\n🔧 TTS Debug Info:');
        window.TTSDebug.showStats();
        window.TTSDebug.showActiveScreen();
        window.TTSDebug.showContentPreview();
    }
});

console.log('🔧 TTS Debug Helper loaded!');
console.log('Available commands:');
console.log('  TTSDebug.showActiveScreen()     - Show which screen is active');
console.log('  TTSDebug.showContentPreview()   - Show what will be read');
console.log('  TTSDebug.listAllScreens()       - List all screens');
console.log('  TTSDebug.testRead()             - Test reading current screen');
console.log('  TTSDebug.showRawText()          - Show extracted text');
console.log('  TTSDebug.compareAllScreens()    - Compare content from all screens');
console.log('  TTSDebug.showStats()            - Show TTS statistics');
console.log('\nKeyboard shortcut: Ctrl+Shift+D for debug info');
