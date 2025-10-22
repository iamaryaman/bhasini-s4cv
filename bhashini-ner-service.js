// Enhanced Bhashini WebSocket Service with Integrated NER
// Combines speech transcription with real-time Named Entity Recognition

class BhashiniNERService {
    constructor() {
        // Core WebSocket and audio components
        this.websocket = null;
        this.mediaRecorder = null;
        this.mediaStream = null;
        this.audioContext = null;
        this.audioChunks = [];
        this.accumulatedText = '';
        this.isRecording = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        
        // Current language and configuration
        this.currentLanguage = 'hi';
        this.isAutoDetectEnabled = false;
        
        // NER Integration
        this.nerEngine = new MultilingualNEREngine();
        this.cvMapper = new CVFieldMapper(this.nerEngine);
        this.extractedEntities = [];
        this.cvData = null;
        this.nerUpdateCallbacks = [];
        
        // Event handlers
        this.eventHandlers = {
            onTranscriptionUpdate: null,
            onLanguageDetected: null,
            onConnectionStatus: null,
            onError: null,
            onEntityExtracted: null,
            onCVUpdated: null,
            onConfidenceUpdate: null
        };
        
        // Processing configuration
        this.processingConfig = {
            enableRealTimeNER: true,
            nerBatchSize: 50, // Process NER every 50 characters
            confidenceThreshold: 0.5,
            autoUpdateCV: true,
            nerDebounceMs: 500 // Debounce NER processing
        };
        
        // Debounce timer for NER processing
        this.nerDebounceTimer = null;
    }
    
    /**
     * Initialize the service with handlers and configuration
     * @param {Object} handlers - Event handlers
     * @param {Object} config - Service configuration
     */
    setHandlers(handlers, config = {}) {
        this.eventHandlers = { ...this.eventHandlers, ...handlers };
        this.processingConfig = { ...this.processingConfig, ...config };
        
        // Initialize NER engine if not already done
        if (!this.nerEngine.nerData) {
            this.nerEngine.loadNERData().then(() => {
                console.log('NER engine ready for entity extraction');
            });
        }
    }
    
    /**
     * Initialize WebSocket connection for streaming ASR
     * @param {string} language - Language code
     * @returns {Promise<void>}
     */
    async initializeWebSocket(language = 'hi') {
        try {
            this.currentLanguage = language;
            this.updateConnectionStatus('connecting');
            
            // Reset state
            this.accumulatedText = '';
            this.extractedEntities = [];
            this.cvData = null;
            
            // Create WebSocket connection to Bhashini streaming endpoint
            const wsUrl = `wss://bhashini-streaming-asr.replit.app/ws?lang=${language}`;
            this.websocket = new WebSocket(wsUrl);
            
            this.setupWebSocketHandlers();
            
            // Wait for connection
            await this.waitForConnection();
            
            console.log(`WebSocket connected for language: ${language}`);
            this.updateConnectionStatus('connected');
            
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            this.handleError('Failed to connect to speech service', error);
            this.updateConnectionStatus('disconnected');
            throw error;
        }
    }
    
    /**
     * Setup WebSocket event handlers
     */
    setupWebSocketHandlers() {
        this.websocket.onopen = () => {
            console.log('WebSocket connected');
            this.reconnectAttempts = 0;
            this.updateConnectionStatus('connected');
        };
        
        this.websocket.onmessage = (event) => {
            this.handleWebSocketMessage(event);
        };
        
        this.websocket.onclose = (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            this.updateConnectionStatus('disconnected');
            
            if (this.isRecording && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.attemptReconnection();
            }
        };
        
        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.handleError('WebSocket connection error', error);
        };
    }
    
    /**
     * Handle WebSocket messages and process transcription
     * @param {MessageEvent} event - WebSocket message event
     */
    async handleWebSocketMessage(event) {
        try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'transcription':
                    await this.processTranscription(data);
                    break;
                    
                case 'language_detected':
                    await this.handleLanguageDetection(data);
                    break;
                    
                case 'error':
                    this.handleError('Transcription error', data.message);
                    break;
                    
                case 'status':
                    this.handleStatusUpdate(data);
                    break;
                    
                default:
                    console.log('Unknown message type:', data.type);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }
    
    /**
     * Process transcription data and perform NER
     * @param {Object} data - Transcription data
     */
    async processTranscription(data) {
        const { text, isFinal, confidence, timestamp } = data;
        
        // Update accumulated text
        if (isFinal) {
            this.accumulatedText += (this.accumulatedText ? ' ' : '') + text;
        }
        
        // Call original transcription handler
        if (this.eventHandlers.onTranscriptionUpdate) {
            this.eventHandlers.onTranscriptionUpdate({
                text,
                isFinal,
                confidence,
                timestamp,
                accumulatedText: this.accumulatedText
            });
        }
        
        // Perform NER processing if enabled
        if (this.processingConfig.enableRealTimeNER && isFinal) {
            this.scheduleNERProcessing(this.accumulatedText);
        }
    }
    
    /**
     * Schedule NER processing with debouncing
     * @param {string} text - Text to process
     */
    scheduleNERProcessing(text) {
        // Clear existing timer
        if (this.nerDebounceTimer) {
            clearTimeout(this.nerDebounceTimer);
        }
        
        // Schedule new processing
        this.nerDebounceTimer = setTimeout(async () => {
            await this.performNERProcessing(text);
        }, this.processingConfig.nerDebounceMs);
    }
    
    /**
     * Perform Named Entity Recognition on the text
     * @param {string} text - Text to process for entities
     */
    async performNERProcessing(text) {
        try {
            if (!text || text.length < 5) {
                return; // Skip very short texts
            }
            
            console.log('Performing NER on:', text.substring(0, 100) + '...');
            
            // Extract entities using the NER engine
            const entities = await this.nerEngine.extractEntities(text, this.currentLanguage);
            
            // Filter by confidence threshold
            const highConfidenceEntities = entities.filter(
                entity => entity.confidence >= this.processingConfig.confidenceThreshold
            );
            
            // Update stored entities
            this.extractedEntities = highConfidenceEntities;
            
            // Create CV structure if auto-update is enabled
            if (this.processingConfig.autoUpdateCV && highConfidenceEntities.length > 0) {
                this.cvData = this.cvMapper.createCVStructure(highConfidenceEntities, text);
            }
            
            // Notify handlers
            if (this.eventHandlers.onEntityExtracted) {
                this.eventHandlers.onEntityExtracted({
                    entities: highConfidenceEntities,
                    totalEntities: entities.length,
                    filteredCount: highConfidenceEntities.length,
                    language: this.currentLanguage
                });
            }
            
            if (this.eventHandlers.onCVUpdated && this.cvData) {
                this.eventHandlers.onCVUpdated(this.cvData);
            }
            
            // Update confidence metrics
            this.updateConfidenceMetrics(entities);
            
        } catch (error) {
            console.error('NER processing error:', error);
            this.handleError('Entity extraction failed', error);
        }
    }
    
    /**
     * Handle language detection from speech
     * @param {Object} data - Language detection data
     */
    async handleLanguageDetection(data) {
        if (this.isAutoDetectEnabled) {
            const { language, confidence, name } = data;
            
            if (confidence > 0.8 && language !== this.currentLanguage) {
                console.log(`Language detected: ${name} (${language}) with confidence: ${confidence}`);
                
                // Switch language
                await this.switchLanguage(language);
                
                if (this.eventHandlers.onLanguageDetected) {
                    this.eventHandlers.onLanguageDetected({
                        language,
                        name,
                        confidence
                    });
                }
            }
        }
    }
    
    /**
     * Switch to a different language
     * @param {string} language - New language code
     */
    async switchLanguage(language) {
        if (language === this.currentLanguage) {
            return;
        }
        
        console.log(`Switching language from ${this.currentLanguage} to ${language}`);
        this.currentLanguage = language;
        
        // Send language switch message to WebSocket
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'language_switch',
                language: language
            }));
        }
        
        // Re-process accumulated text with new language if needed
        if (this.accumulatedText && this.processingConfig.enableRealTimeNER) {
            await this.performNERProcessing(this.accumulatedText);
        }
    }
    
    /**
     * Start streaming audio for transcription
     */
    async startStreaming() {
        try {
            console.log('Requesting microphone access...');
            
            // Check if browser supports getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Your browser does not support microphone access. Please use a modern browser.');
            }
            
            // Check permissions first
            await this.checkMicrophonePermission();
            
            // Try different audio constraints in order of preference
            const audioConstraints = [
                {
                    audio: {
                        sampleRate: { ideal: 16000 },
                        channelCount: { ideal: 1 },
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: false
                    }
                },
                {
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true
                    }
                },
                {
                    audio: true
                }
            ];
            
            let streamObtained = false;
            let lastError = null;
            
            // Try each constraint until one works
            for (const constraint of audioConstraints) {
                try {
                    console.log('Trying audio constraint:', constraint);
                    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraint);
                    streamObtained = true;
                    console.log('Successfully obtained media stream');
                    break;
                } catch (err) {
                    console.warn('Failed with constraint:', constraint, 'Error:', err.message);
                    lastError = err;
                    continue;
                }
            }
            
            if (!streamObtained) {
                throw lastError || new Error('Failed to obtain microphone access with any constraints');
            }
            
            // Setup audio context for processing
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Setup MediaRecorder for streaming with fallback MIME types
            let mimeType = this.getBestMimeType();
            
            this.mediaRecorder = new MediaRecorder(this.mediaStream, {
                mimeType: mimeType
            });
            
            this.setupMediaRecorderHandlers();
            
            // Start recording
            this.mediaRecorder.start(1000); // Send audio every 1 second
            this.isRecording = true;
            
            console.log('Started streaming audio with MIME type:', mimeType);
            
        } catch (error) {
            console.error('Failed to start streaming:', error);
            
            // Provide specific error messages
            let errorMessage = 'Failed to access microphone. ';
            
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Please allow microphone access and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No microphone found. Please check your audio devices.';
            } else if (error.name === 'NotReadableError') {
                errorMessage += 'Microphone is being used by another application.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage += 'Microphone does not meet the required constraints.';
            } else {
                errorMessage += error.message;
            }
            
            this.handleError(errorMessage, error);
            throw new Error(errorMessage);
        }
    }
    
    /**
     * Check microphone permission status
     */
    async checkMicrophonePermission() {
        try {
            if (navigator.permissions) {
                const permission = await navigator.permissions.query({ name: 'microphone' });
                console.log('Microphone permission status:', permission.state);
                
                if (permission.state === 'denied') {
                    throw new Error('Microphone access has been denied. Please enable microphone permissions in your browser settings.');
                }
            }
        } catch (error) {
            console.warn('Could not check permission status:', error.message);
            // Continue anyway as some browsers don't support permission query
        }
    }
    
    /**
     * Get the best supported MIME type for MediaRecorder
     * @returns {string} Best MIME type
     */
    getBestMimeType() {
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/wav',
            'audio/mp4',
            'audio/mpeg'
        ];
        
        for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                console.log('Using MIME type:', mimeType);
                return mimeType;
            }
        }
        
        console.warn('No supported MIME type found, using default');
        return 'audio/webm'; // Fallback
    }
    
    /**
     * Setup MediaRecorder event handlers
     */
    setupMediaRecorderHandlers() {
        this.mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                await this.sendAudioChunk(event.data);
            }
        };
        
        this.mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped');
            this.isRecording = false;
        };
        
        this.mediaRecorder.onerror = (error) => {
            console.error('MediaRecorder error:', error);
            this.handleError('Audio recording error', error);
        };
    }
    
    /**
     * Send audio chunk to WebSocket
     * @param {Blob} audioBlob - Audio data chunk
     */
    async sendAudioChunk(audioBlob) {
        try {
            if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
                console.warn('WebSocket not ready for audio transmission');
                return;
            }
            
            // Convert to WAV format
            const wavBlob = await AudioUtils.convertToWav(audioBlob);
            
            // Convert to base64
            const base64Audio = await AudioUtils.blobToBase64(wavBlob);
            
            // Send to WebSocket
            this.websocket.send(JSON.stringify({
                type: 'audio_chunk',
                audio: base64Audio,
                timestamp: Date.now(),
                language: this.currentLanguage
            }));
            
        } catch (error) {
            console.error('Error sending audio chunk:', error);
        }
    }
    
    /**
     * Stop streaming audio
     */
    stopStreaming() {
        console.log('Stopping audio streaming');
        
        // Stop MediaRecorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        // Close media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }
        
        // Close audio context
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.isRecording = false;
    }
    
    /**
     * Enable or disable auto language detection
     * @param {boolean} enabled - Whether to enable auto-detection
     */
    setAutoDetectLanguage(enabled) {
        this.isAutoDetectEnabled = enabled;
        
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify({
                type: 'auto_detect',
                enabled: enabled
            }));
        }
    }
    
    /**
     * Get current extracted entities
     * @returns {Array} Current entities
     */
    getExtractedEntities() {
        return this.extractedEntities;
    }
    
    /**
     * Get current CV data
     * @returns {Object} Current CV structure
     */
    getCurrentCV() {
        return this.cvData;
    }
    
    /**
     * Manual entity extraction from custom text
     * @param {string} text - Text to process
     * @param {string} language - Language code
     * @returns {Promise<Object>} Extraction results
     */
    async extractEntitiesManual(text, language = this.currentLanguage) {
        try {
            const entities = await this.nerEngine.extractEntities(text, language);
            const cvData = this.cvMapper.createCVStructure(entities, text);
            
            return {
                entities,
                cvData,
                language,
                confidence: this.calculateAverageConfidence(entities)
            };
        } catch (error) {
            console.error('Manual entity extraction failed:', error);
            throw error;
        }
    }
    
    /**
     * Update NER processing configuration
     * @param {Object} config - New configuration
     */
    updateNERConfig(config) {
        this.processingConfig = { ...this.processingConfig, ...config };
        console.log('NER configuration updated:', this.processingConfig);
    }
    
    /**
     * Clear all accumulated data
     */
    clearData() {
        this.accumulatedText = '';
        this.extractedEntities = [];
        this.cvData = null;
        
        if (this.nerDebounceTimer) {
            clearTimeout(this.nerDebounceTimer);
            this.nerDebounceTimer = null;
        }
        
        console.log('All accumulated data cleared');
    }
    
    /**
     * Export CV data in various formats
     * @param {string} format - Export format ('json', 'text', 'structured')
     * @returns {string|Object} Exported data
     */
    exportCVData(format = 'json') {
        if (!this.cvData) {
            throw new Error('No CV data available for export');
        }
        
        switch (format) {
            case 'json':
                return JSON.stringify(this.cvData, null, 2);
                
            case 'text':
                return this.formatCVAsText(this.cvData);
                
            case 'structured':
                return this.cvData;
                
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    
    /**
     * Helper methods
     */
    
    formatCVAsText(cvData) {
        let text = '';
        
        if (cvData.contact.name?.text) {
            text += `Name: ${cvData.contact.name.text}\n`;
        }
        
        if (cvData.contact.email?.text) {
            text += `Email: ${cvData.contact.email.text}\n`;
        }
        
        if (cvData.contact.phone?.text) {
            text += `Phone: ${cvData.contact.phone.text}\n`;
        }
        
        if (cvData.contact.address?.text) {
            text += `Address: ${cvData.contact.address.text}\n`;
        }
        
        if (cvData.professional.skills.technical.length > 0) {
            text += `\nSkills:\n${cvData.professional.skills.technical.join(', ')}\n`;
        }
        
        if (cvData.professional.experience.length > 0) {
            text += '\nExperience:\n';
            cvData.professional.experience.forEach(exp => {
                text += `- ${exp.position || 'Position'} at ${exp.company}\n`;
            });
        }
        
        return text;
    }
    
    calculateAverageConfidence(entities) {
        if (entities.length === 0) return 0;
        const total = entities.reduce((sum, entity) => sum + entity.confidence, 0);
        return total / entities.length;
    }
    
    updateConfidenceMetrics(entities) {
        const metrics = {
            averageConfidence: this.calculateAverageConfidence(entities),
            highConfidenceCount: entities.filter(e => e.confidence >= 0.8).length,
            mediumConfidenceCount: entities.filter(e => e.confidence >= 0.6 && e.confidence < 0.8).length,
            lowConfidenceCount: entities.filter(e => e.confidence < 0.6).length,
            totalEntities: entities.length
        };
        
        if (this.eventHandlers.onConfidenceUpdate) {
            this.eventHandlers.onConfidenceUpdate(metrics);
        }
    }
    
    async waitForConnection() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, 10000);
            
            if (this.websocket.readyState === WebSocket.OPEN) {
                clearTimeout(timeout);
                resolve();
                return;
            }
            
            this.websocket.onopen = () => {
                clearTimeout(timeout);
                resolve();
            };
            
            this.websocket.onerror = (error) => {
                clearTimeout(timeout);
                reject(error);
            };
        });
    }
    
    async attemptReconnection() {
        this.reconnectAttempts++;
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(async () => {
            try {
                await this.initializeWebSocket(this.currentLanguage);
                if (this.mediaStream) {
                    await this.startStreaming();
                }
            } catch (error) {
                console.error('Reconnection failed:', error);
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    this.handleError('Maximum reconnection attempts reached', error);
                }
            }
        }, 2000 * this.reconnectAttempts);
    }
    
    updateConnectionStatus(status) {
        if (this.eventHandlers.onConnectionStatus) {
            this.eventHandlers.onConnectionStatus(status);
        }
    }
    
    handleStatusUpdate(data) {
        console.log('Status update:', data);
        if (data.status === 'ready') {
            this.updateConnectionStatus('connected');
        }
    }
    
    handleError(message, details = null) {
        console.error('BhashiniNERService error:', message, details);
        if (this.eventHandlers.onError) {
            this.eventHandlers.onError(message, details);
        }
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopStreaming();
        
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        
        if (this.nerDebounceTimer) {
            clearTimeout(this.nerDebounceTimer);
        }
        
        // Clear data
        this.clearData();
        
        console.log('BhashiniNERService destroyed');
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.BhashiniNERService = BhashiniNERService;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BhashiniNERService;
}
