// Enhanced Bhashini Service with WebSocket ASR and Language Detection
// Implements real-time streaming transcription and automatic language detection

class BhashiniWebSocketService {
    constructor() {
        // API Credentials
        this.userId = '21d41f1e0ae54d958d93d8a1c65f96a4';
        this.apiKey = '025f6d4ca8-74bc-4847-8bbf-70f1ed42b166';
        this.inferenceApiKey = '_YAUfmAYfUNLzxvgSCskYG1SwoyckUG3fUQpED4X8ReBi-5jS-GyaUf-9W9eEplG';
        
        // WebSocket endpoints
        this.wsBaseUrl = 'wss://api.bhashini.gov.in/v1/asr/streaming';
        
        // Language Detection API
        this.languageDetectionUrl = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/compute';
        
        // WebSocket connection
        this.websocket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Audio streaming
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.source = null;
        
        // Callbacks
        this.onTranscriptionUpdate = null;
        this.onLanguageDetected = null;
        this.onConnectionStatus = null;
        this.onError = null;
        
        // Current session
        this.currentLanguage = 'hi';
        this.sessionId = null;
        this.isStreaming = false;
        
        // Supported languages with models
        this.languageModels = {
            'hi': { model: 'ai4bharat/conformer-hi-gpu--t4', name: 'Hindi' },
            'en': { model: 'ai4bharat/whisper-medium-en--gpu--t4', name: 'English' },
            'ta': { model: 'ai4bharat/conformer-ta-gpu--t4', name: 'Tamil' },
            'te': { model: 'ai4bharat/conformer-te-gpu--t4', name: 'Telugu' },
            'kn': { model: 'ai4bharat/conformer-kn-gpu--t4', name: 'Kannada' },
            'ml': { model: 'ai4bharat/conformer-ml-gpu--t4', name: 'Malayalam' },
            'mr': { model: 'ai4bharat/conformer-mr-gpu--t4', name: 'Marathi' },
            'gu': { model: 'ai4bharat/conformer-gu-gpu--t4', name: 'Gujarati' },
            'bn': { model: 'ai4bharat/conformer-bn-gpu--t4', name: 'Bengali' },
            'pa': { model: 'ai4bharat/conformer-pa-gpu--t4', name: 'Punjabi' },
            'or': { model: 'ai4bharat/conformer-or-gpu--t4', name: 'Odia' },
            'as': { model: 'ai4bharat/conformer-as-gpu--t4', name: 'Assamese' },
            'ur': { model: 'ai4bharat/conformer-ur-gpu--t4', name: 'Urdu' }
        };
    }
    
    /**
     * Initialize WebSocket connection for streaming ASR
     */
    async initializeWebSocket(language = 'hi') {
        return new Promise((resolve, reject) => {
            try {
                this.currentLanguage = language;
                this.sessionId = this.generateSessionId();
                
                // Construct WebSocket URL with parameters
                const wsUrl = `${this.wsBaseUrl}?` + 
                    `userId=${this.userId}&` +
                    `apiKey=${this.apiKey}&` +
                    `language=${language}&` +
                    `sessionId=${this.sessionId}`;
                
                // Close existing connection if any
                if (this.websocket) {
                    this.websocket.close();
                }
                
                // Create new WebSocket connection
                this.websocket = new WebSocket(wsUrl);
                
                // Handle connection open
                this.websocket.onopen = () => {
                    console.log('WebSocket connected for language:', language);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    
                    // Send initial configuration
                    this.sendConfiguration();
                    
                    if (this.onConnectionStatus) {
                        this.onConnectionStatus('connected', language);
                    }
                    
                    resolve();
                };
                
                // Handle incoming messages
                this.websocket.onmessage = (event) => {
                    this.handleWebSocketMessage(event);
                };
                
                // Handle errors
                this.websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.isConnected = false;
                    
                    if (this.onError) {
                        this.onError('WebSocket connection error', error);
                    }
                    
                    reject(error);
                };
                
                // Handle connection close
                this.websocket.onclose = () => {
                    console.log('WebSocket disconnected');
                    this.isConnected = false;
                    
                    if (this.onConnectionStatus) {
                        this.onConnectionStatus('disconnected', language);
                    }
                    
                    // Attempt reconnection if streaming
                    if (this.isStreaming && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnect();
                    }
                };
                
            } catch (error) {
                console.error('Failed to initialize WebSocket:', error);
                reject(error);
            }
        });
    }
    
    /**
     * Send initial configuration to WebSocket
     */
    sendConfiguration() {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            return;
        }
        
        const config = {
            type: 'config',
            config: {
                language: this.currentLanguage,
                model: this.languageModels[this.currentLanguage]?.model,
                sampleRate: 16000,
                encoding: 'pcm16',
                channels: 1,
                punctuation: true,
                numerals: true
            }
        };
        
        this.websocket.send(JSON.stringify(config));
    }
    
    /**
     * Handle incoming WebSocket messages
     */
    handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'partial':
                    // Partial transcription (real-time updates)
                    if (this.onTranscriptionUpdate) {
                        this.onTranscriptionUpdate({
                            text: data.transcript,
                            isFinal: false,
                            confidence: data.confidence || 0,
                            language: this.currentLanguage
                        });
                    }
                    break;
                    
                case 'final':
                    // Final transcription for a segment
                    if (this.onTranscriptionUpdate) {
                        this.onTranscriptionUpdate({
                            text: data.transcript,
                            isFinal: true,
                            confidence: data.confidence || 0,
                            language: this.currentLanguage
                        });
                    }
                    break;
                    
                case 'error':
                    console.error('WebSocket error message:', data.error);
                    if (this.onError) {
                        this.onError('Transcription error', data.error);
                    }
                    break;
                    
                default:
                    console.log('Unknown message type:', data);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    }
    
    /**
     * Start streaming audio to WebSocket
     */
    async startStreaming() {
        if (!this.isConnected) {
            await this.initializeWebSocket(this.currentLanguage);
        }
        
        try {
            // Get user media
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 16000
                }
            });
            
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });
            
            // Create source from media stream
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
            
            // Create script processor (deprecated but still works)
            this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
            
            // Process audio chunks
            this.processor.onaudioprocess = (e) => {
                if (!this.isStreaming) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = this.float32ToPCM16(inputData);
                
                if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
                    this.websocket.send(pcm16);
                }
            };
            
            // Connect audio pipeline
            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);
            
            this.isStreaming = true;
            console.log('Audio streaming started');
            
        } catch (error) {
            console.error('Failed to start streaming:', error);
            throw error;
        }
    }
    
    /**
     * Stop streaming audio
     */
    stopStreaming() {
        this.isStreaming = false;
        
        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // Disconnect audio nodes
        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }
        
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Send end of stream signal
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({ type: 'end_of_stream' }));
        }
        
        console.log('Audio streaming stopped');
    }
    
    /**
     * Convert Float32Array to PCM16 ArrayBuffer
     */
    float32ToPCM16(float32Array) {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        
        for (let i = 0; i < float32Array.length; i++) {
            const sample = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        }
        
        return buffer;
    }
    
    /**
     * Detect language from audio
     */
    async detectLanguage(audioBase64) {
        try {
            const requestBody = {
                modelId: 'ai4bharat/audio-language-detection',
                task: 'asr',
                input: {
                    audio: [{
                        audioContent: audioBase64
                    }]
                },
                userId: this.userId,
                ulcaApiKey: this.apiKey
            };
            
            const response = await fetch(this.languageDetectionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.inferenceApiKey
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                throw new Error(`Language detection failed: ${response.statusText}`);
            }
            
            const data = await response.json();
            const detectedLanguage = data.output?.[0]?.langPrediction?.[0];
            
            if (detectedLanguage) {
                const result = {
                    language: detectedLanguage.langCode,
                    confidence: detectedLanguage.confidence,
                    name: this.languageModels[detectedLanguage.langCode]?.name || detectedLanguage.langCode
                };
                
                console.log('Language detected:', result);
                
                if (this.onLanguageDetected) {
                    this.onLanguageDetected(result);
                }
                
                return result;
            }
            
            throw new Error('No language detected');
            
        } catch (error) {
            console.error('Language detection error:', error);
            throw error;
        }
    }
    
    /**
     * Switch language during streaming
     */
    async switchLanguage(newLanguage) {
        if (this.currentLanguage === newLanguage) {
            return;
        }
        
        console.log(`Switching language from ${this.currentLanguage} to ${newLanguage}`);
        
        const wasStreaming = this.isStreaming;
        
        if (wasStreaming) {
            this.stopStreaming();
        }
        
        // Close current WebSocket
        if (this.websocket) {
            this.websocket.close();
        }
        
        // Initialize new WebSocket with new language
        await this.initializeWebSocket(newLanguage);
        
        if (wasStreaming) {
            await this.startStreaming();
        }
    }
    
    /**
     * Reconnect WebSocket
     */
    async reconnect() {
        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(async () => {
            try {
                await this.initializeWebSocket(this.currentLanguage);
                if (this.isStreaming) {
                    await this.startStreaming();
                }
            } catch (error) {
                console.error('Reconnection failed:', error);
            }
        }, 1000 * this.reconnectAttempts);
    }
    
    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return Object.entries(this.languageModels).map(([code, info]) => ({
            code,
            name: info.name,
            model: info.model
        }));
    }
    
    /**
     * Close WebSocket connection
     */
    close() {
        this.stopStreaming();
        
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        this.isConnected = false;
    }
    
    /**
     * Set event handlers
     */
    setHandlers(handlers) {
        if (handlers.onTranscriptionUpdate) {
            this.onTranscriptionUpdate = handlers.onTranscriptionUpdate;
        }
        if (handlers.onLanguageDetected) {
            this.onLanguageDetected = handlers.onLanguageDetected;
        }
        if (handlers.onConnectionStatus) {
            this.onConnectionStatus = handlers.onConnectionStatus;
        }
        if (handlers.onError) {
            this.onError = handlers.onError;
        }
    }
}

// Export for use in other modules
window.BhashiniWebSocketService = BhashiniWebSocketService;
