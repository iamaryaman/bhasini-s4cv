// Bhashini Text-to-Speech Service Module
// JavaScript port of tts.swift - Provides voice feedback in user's preferred language

class BhashiniTTSService {
    constructor() {
        // API credentials (same as BhashiniService)
        this.userId = '21d41f1e0ae54d958d93d8a1c65f96a4';
        this.ulcaApiKey = '025f6d4ca8-74bc-4847-8bbf-70f1ed42b166';
        
        // API endpoints
        this.pipelineURL = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
        this.computeURL = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
        
        // State management
        this.isSpeaking = false;
        this.audioPlayer = null;
        this.pipelineCache = new Map();
        this.currentScreenId = null;
        this.screenObserver = null;
        
        // Language code mapping
        this.languageCodes = {
            'english': 'en',
            'hindi': 'hi',
            'telugu': 'te',
            'tamil': 'ta',
            'bengali': 'bn',
            'kannada': 'kn',
            'malayalam': 'ml',
            'marathi': 'mr',
            'gujarati': 'gu',
            'punjabi': 'pa'
        };
        
        // Predefined messages
        this.messages = {
            success: {
                'en': 'Success! Your information has been saved.',
                'hi': 'सफलता! आपकी जानकारी सहेज ली गई है।',
                'te': 'విజయం! మీ సమాచారం సేవ్ చేయబడింది.',
                'ta': 'வெற்றி! உங்கள் தகவல் சேமிக்கப்பட்டது.',
                'bn': 'সফল! আপনার তথ্য সংরক্ষিত হয়েছে।'
            },
            error: {
                'en': 'Sorry, something went wrong. Please try again.',
                'hi': 'क्षमा करें, कुछ गलत हो गया। कृपया पुनः प्रयास करें।',
                'te': 'క్షమించండి, ఏదో తప్పు జరిగింది। దయచేసి మళ్లీ ప్రయత్నించండి.',
                'ta': 'மன்னிக்கவும், ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.',
                'bn': 'দুঃখিত, কিছু ভুল হয়েছে। আবার চেষ্টা করুন।'
            }
        };
    }

    /**
     * Speak text in the specified language
     * @param {string} text - Text to speak
     * @param {string} language - Language code (e.g., 'hi', 'en')
     * @returns {Promise<void>}
     */
    async speak(text, language) {
        if (this.isSpeaking) {
            console.warn('TTS is already speaking. Please wait.');
            return;
        }

        this.isSpeaking = true;
        this.updateSpeakingState(true);

        try {
            console.log(`Generating speech for language: ${language}`);
            
            // Get audio data from Bhashini TTS
            const audioData = await this.generateSpeech(text, language);
            
            // Play the audio
            await this.playAudio(audioData);
            
        } catch (error) {
            console.error('TTS Error:', error);
            throw error;
        } finally {
            this.isSpeaking = false;
            this.updateSpeakingState(false);
        }
    }

    /**
     * Speak success message in user's language
     * @param {string} language - Language code
     */
    async speakSuccess(language) {
        const message = this.messages.success[language] || this.messages.success['en'];
        try {
            await this.speak(message, language);
        } catch (error) {
            console.error('Failed to speak success message:', error);
        }
    }

    /**
     * Speak error message in user's language
     * @param {string} language - Language code
     */
    async speakError(language) {
        const message = this.messages.error[language] || this.messages.error['en'];
        try {
            await this.speak(message, language);
        } catch (error) {
            console.error('Failed to speak error message:', error);
        }
    }

    /**
     * Read current active screen content only
     * @param {string} language - Language code
     */
    async readPageContent(language) {
        // Find the currently active screen
        const activeScreen = this.getActiveScreen();
        
        if (!activeScreen) {
            console.error('No active screen found');
            return;
        }

        console.log('Reading content from active screen:', activeScreen.id);

        // Extract visible text content from active screen only
        const textContent = this.extractReadableText(activeScreen);
        
        if (textContent.trim().length === 0) {
            console.warn('No readable content found on active screen');
            return;
        }

        console.log(`Extracted ${textContent.length} characters from active screen`);
        await this.speak(textContent, language);
    }

    /**
     * Get the currently active/visible screen
     * @returns {HTMLElement|null} Active screen element
     */
    getActiveScreen() {
        // Method 1: Check for screen with 'active' class
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            return activeScreen;
        }

        // Method 2: Check for visible screens (not hidden)
        const visibleScreens = document.querySelectorAll('.screen:not([style*="display: none"]):not([style*="display:none"])');
        if (visibleScreens.length === 1) {
            return visibleScreens[0];
        }

        // Method 3: Find screen that's actually visible in viewport
        const allScreens = document.querySelectorAll('.screen');
        for (const screen of allScreens) {
            const style = window.getComputedStyle(screen);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
                return screen;
            }
        }

        // Fallback: Use main-content if no screen is found
        console.warn('No active screen detected, falling back to main-content');
        return document.getElementById('main-content');
    }

    /**
     * Extract readable text from an element (excluding hidden content)
     * @param {HTMLElement} element - Element to extract text from
     * @returns {string} Readable text
     */
    extractReadableText(element) {
        if (!element) {
            return '';
        }

        // Clone the element to avoid modifying the original
        const clone = element.cloneNode(true);
        
        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 
            'style', 
            'noscript',
            '.sr-only', 
            '[aria-hidden="true"]', 
            '[hidden]',
            '.hidden',
            '.modal.hidden',
            '.screen:not(.active)', // Remove inactive screens
            'header',  // Remove header navigation
            '.app-header', // Remove app header
            '.nav-menu', // Remove navigation menu
            '.status-messages', // Remove status messages
            '.loading-overlay', // Remove loading overlays
            'button', // Remove button text (just icons/labels)
            '.btn', // Remove button classes
        ];
        
        unwantedSelectors.forEach(selector => {
            try {
                clone.querySelectorAll(selector).forEach(el => el.remove());
            } catch (e) {
                // Ignore selector errors
            }
        });
        
        // Get text content and clean it up
        let text = clone.textContent || '';
        
        // Remove extra whitespace and clean up
        text = text.replace(/\s+/g, ' ').trim();
        
        // Remove common UI artifacts
        text = text.replace(/[⚙️🌐📄✂️⏹️🎤📝🔊]+/g, ''); // Remove emoji icons
        text = text.replace(/×/g, ''); // Remove close buttons
        
        // Limit length to avoid overly long speech
        const maxLength = 3000; // Reduced from 5000 for better performance
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '. Content truncated.';
        }
        
        return text;
    }

    /**
     * Generate speech audio from text
     * @param {string} text - Text to convert to speech
     * @param {string} language - Language code
     * @returns {Promise<ArrayBuffer>} Audio data
     */
    async generateSpeech(text, language) {
        // Step 1: Get pipeline config for TTS
        const { serviceId, authToken } = await this.getPipelineConfig(language);
        
        // Step 2: Call TTS compute API
        const audioBase64 = await this.computeTTS(text, serviceId, authToken, language);
        
        // Step 3: Decode base64 audio
        const audioData = this.base64ToArrayBuffer(audioBase64);
        
        console.log(`TTS audio generated: ${audioData.byteLength} bytes`);
        return audioData;
    }

    /**
     * Get pipeline configuration for TTS
     * @param {string} language - Language code
     * @returns {Promise<Object>} Service ID and auth token
     */
    async getPipelineConfig(language) {
        // Check cache first
        if (this.pipelineCache.has(language)) {
            console.log(`Using cached TTS pipeline config for ${language}`);
            return this.pipelineCache.get(language);
        }

        const payload = {
            pipelineTasks: [{
                taskType: "tts",
                config: {
                    language: {
                        sourceLanguage: language
                    }
                }
            }],
            pipelineRequestConfig: {
                pipelineId: "64392f96daac500b55c543cd"
            }
        };

        try {
            console.log('TTS pipeline request:', JSON.stringify(payload));
            
            const response = await fetch(this.pipelineURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'userID': this.userId,
                    'ulcaApiKey': this.ulcaApiKey
                },
                body: JSON.stringify(payload)
            });

            console.log('TTS pipeline response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('TTS pipeline error:', errorText);
                throw new Error(`TTS pipeline config failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('TTS pipeline response:', data);

            // Extract service ID and auth token
            const pipelineResponseConfig = data.pipelineResponseConfig?.[0];
            const config = pipelineResponseConfig?.config?.[0];
            const serviceId = config?.serviceId;
            const authToken = data.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value;

            if (!serviceId || !authToken) {
                throw new Error('Failed to extract TTS configuration from pipeline response');
            }

            const result = { serviceId, authToken };
            
            // Cache the configuration
            this.pipelineCache.set(language, result);
            console.log(`TTS config cached for ${language}:`, { serviceId });
            
            return result;
        } catch (error) {
            console.error('Error getting TTS pipeline config:', error);
            throw new Error(`TTS configuration failed: ${error.message}`);
        }
    }

    /**
     * Call TTS compute API to generate audio
     * @param {string} text - Text to convert
     * @param {string} serviceId - Service ID from pipeline
     * @param {string} authToken - Authorization token
     * @param {string} language - Language code
     * @returns {Promise<string>} Base64 encoded audio
     */
    async computeTTS(text, serviceId, authToken, language) {
        const payload = {
            pipelineTasks: [{
                taskType: "tts",
                config: {
                    language: {
                        sourceLanguage: language
                    },
                    serviceId: serviceId,
                    gender: "female"
                }
            }],
            inputData: {
                input: [{
                    source: text
                }]
            }
        };

        try {
            console.log('TTS compute payload:', JSON.stringify(payload));
            
            const response = await fetch(this.computeURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                body: JSON.stringify(payload)
            });

            console.log('TTS compute response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('TTS compute error:', errorText);
                throw new Error(`TTS compute failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('TTS compute response:', data);

            // Extract audio content from response
            const pipelineResponse = data.pipelineResponse?.[0];
            const audio = pipelineResponse?.audio?.[0];
            const audioContent = audio?.audioContent;

            if (!audioContent) {
                throw new Error('No audio output received from TTS');
            }

            console.log('TTS audio content length:', audioContent.length);
            return audioContent;
        } catch (error) {
            console.error('Error calling TTS compute API:', error);
            throw new Error(`TTS generation failed: ${error.message}`);
        }
    }

    /**
     * Play audio from ArrayBuffer
     * @param {ArrayBuffer} audioData - Audio data to play
     * @returns {Promise<void>}
     */
    async playAudio(audioData) {
        return new Promise((resolve, reject) => {
            try {
                // Create audio context
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Decode audio data
                audioContext.decodeAudioData(
                    audioData,
                    (buffer) => {
                        // Create audio source
                        const source = audioContext.createBufferSource();
                        source.buffer = buffer;
                        source.connect(audioContext.destination);
                        
                        // Handle playback end
                        source.onended = () => {
                            console.log('Audio playback finished');
                            resolve();
                        };
                        
                        // Start playback
                        source.start(0);
                        this.audioPlayer = source;
                    },
                    (error) => {
                        console.error('Audio decoding failed:', error);
                        reject(new Error('Audio playback failed: ' + error.message));
                    }
                );
            } catch (error) {
                console.error('Error playing audio:', error);
                reject(error);
            }
        });
    }

    /**
     * Stop current audio playback
     */
    stopSpeaking() {
        if (this.audioPlayer) {
            try {
                this.audioPlayer.stop();
                this.audioPlayer = null;
            } catch (error) {
                console.warn('Error stopping audio:', error);
            }
        }
        this.isSpeaking = false;
        this.updateSpeakingState(false);
    }

    /**
     * Convert base64 string to ArrayBuffer
     * @param {string} base64 - Base64 encoded string
     * @returns {ArrayBuffer}
     */
    base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Update UI speaking state
     * @param {boolean} speaking - Whether currently speaking
     */
    updateSpeakingState(speaking) {
        // Update button states
        const ttsButtons = document.querySelectorAll('.tts-btn');
        ttsButtons.forEach(btn => {
            if (speaking) {
                btn.classList.add('speaking');
                btn.disabled = true;
            } else {
                btn.classList.remove('speaking');
                btn.disabled = false;
            }
        });

        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('tts-state-change', { 
            detail: { isSpeaking: speaking } 
        }));
    }

    /**
     * Get supported TTS languages
     * @returns {Array<Object>}
     */
    getSupportedLanguages() {
        return [
            { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
            { code: 'te', name: 'Telugu', flag: '🇮🇳' },
            { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
            { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
            { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
            { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
            { code: 'bn', name: 'Bengali', flag: '🇮🇳' },
            { code: 'pa', name: 'Punjabi', flag: '🇮🇳' }
        ];
    }

    /**
     * Clear pipeline cache
     */
    clearCache() {
        this.pipelineCache.clear();
        console.log('TTS pipeline cache cleared');
    }

    /**
     * Start monitoring for screen changes
     */
    startScreenMonitoring() {
        // Observe changes to screen elements
        if (this.screenObserver) {
            this.screenObserver.disconnect();
        }

        this.screenObserver = new MutationObserver((mutations) => {
            const currentActive = this.getActiveScreen();
            const newScreenId = currentActive ? currentActive.id : null;
            
            if (newScreenId && newScreenId !== this.currentScreenId) {
                console.log(`Screen changed from ${this.currentScreenId} to ${newScreenId}`);
                this.currentScreenId = newScreenId;
                
                // Dispatch event for UI to react
                window.dispatchEvent(new CustomEvent('tts-screen-change', {
                    detail: { screenId: newScreenId }
                }));
            }
        });

        // Observe class changes on screens
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            this.screenObserver.observe(mainContent, {
                attributes: true,
                attributeFilter: ['class', 'style'],
                subtree: true,
                childList: true
            });
        }

        // Set initial screen
        const initialScreen = this.getActiveScreen();
        if (initialScreen) {
            this.currentScreenId = initialScreen.id;
            console.log('Initial active screen:', this.currentScreenId);
        }
    }

    /**
     * Stop monitoring screen changes
     */
    stopScreenMonitoring() {
        if (this.screenObserver) {
            this.screenObserver.disconnect();
            this.screenObserver = null;
        }
    }

    /**
     * Get content summary of current screen (for debugging)
     */
    getCurrentScreenSummary() {
        const activeScreen = this.getActiveScreen();
        if (!activeScreen) {
            return 'No active screen';
        }

        const text = this.extractReadableText(activeScreen);
        return {
            screenId: activeScreen.id,
            contentLength: text.length,
            preview: text.substring(0, 100) + '...'
        };
    }
}

// Export for use in other modules
window.BhashiniTTSService = BhashiniTTSService;
