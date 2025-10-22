// Bhashini API Service Module
// Handles all interactions with Bhashini's ASR API

class BhashiniService {
    constructor() {
        // Bhashini API credentials
        this.userId = '21d41f1e0ae54d958d93d8a1c65f96a4';
        this.apiKey = '025f6d4ca8-74bc-4847-8bbf-70f1ed42b166';
        this.inferenceApiKey = '_YAUfmAYfUNLzxvgSCskYG1SwoyckUG3fUQpED4X8ReBi-5jS-GyaUf-9W9eEplG';
        
        // API endpoints
        this.pipelineConfigUrl = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
        this.computeUrl = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
        
        // Cache for pipeline configurations
        this.pipelineCache = new Map();
        
        // Language to service mapping
        this.languageServices = {
            'hi': 'ai4bharat/conformer-hi-gpu--t4',
            'en': 'ai4bharat/whisper-medium-en--gpu--t4',
            'ta': 'ai4bharat/conformer-ta-gpu--t4',
            'te': 'ai4bharat/conformer-te-gpu--t4',
            'kn': 'ai4bharat/conformer-kn-gpu--t4',
            'ml': 'ai4bharat/conformer-ml-gpu--t4',
            'mr': 'ai4bharat/conformer-mr-gpu--t4',
            'gu': 'ai4bharat/conformer-gu-gpu--t4',
            'bn': 'ai4bharat/conformer-bn-gpu--t4',
            'pa': 'ai4bharat/conformer-pa-gpu--t4'
        };
    }

    /**
     * Get pipeline configuration for a specific language
     * @param {string} language - Language code (e.g., 'hi', 'en')
     * @returns {Promise<Object>} Pipeline configuration
     */
    async getPipelineConfig(language) {
        // Check cache first
        if (this.pipelineCache.has(language)) {
            console.log(`Using cached pipeline config for ${language}`);
            return this.pipelineCache.get(language);
        }

        try {
            const requestBody = {
                pipelineTasks: [{
                    taskType: "asr",
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

            const response = await fetch(this.pipelineConfigUrl, {
                method: 'POST',
                headers: {
                    'Accept': '*/*',
                    'Content-Type': 'application/json',
                    'userID': this.userId,
                    'ulcaApiKey': this.apiKey
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Pipeline config failed: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract ASR configuration
            const asrConfig = data.pipelineResponseConfig?.[0]?.config?.[0];
            
            if (!asrConfig) {
                throw new Error('No ASR configuration found in pipeline response');
            }

            const config = {
                serviceId: asrConfig.serviceId,
                modelId: asrConfig.modelId,
                language: asrConfig.language?.sourceLanguage || language,
                inferenceApiKey: asrConfig.inferenceApiKey?.value || this.inferenceApiKey,
                callbackUrl: asrConfig.apiEndPoint?.callbackUrl || this.computeUrl
            };

            // Cache the configuration
            this.pipelineCache.set(language, config);
            console.log(`Pipeline config cached for ${language}:`, config);
            
            return config;
        } catch (error) {
            console.error('Error getting pipeline config:', error);
            throw error;
        }
    }

    /**
     * Transcribe audio using Bhashini ASR
     * @param {string} language - Language code
     * @param {string} audioBase64 - Base64 encoded audio data
     * @returns {Promise<string>} Transcribed text
     */
    async transcribeAudio(language, audioBase64) {
        try {
            console.log(`Starting transcription for language: ${language}`);
            console.log(`Audio data length: ${audioBase64 ? audioBase64.length : 'null'} characters`);
            
            // Validate input
            if (!audioBase64 || audioBase64.length === 0) {
                throw new Error('No audio data provided for transcription');
            }
            
            // Get pipeline configuration
            const config = await this.getPipelineConfig(language);
            console.log('Pipeline config obtained:', config);
            
            const requestBody = {
                pipelineTasks: [{
                    taskType: "asr",
                    config: {
                        language: {
                            sourceLanguage: language
                        },
                        serviceId: config.serviceId,
                        audioFormat: "wav",
                        samplingRate: 16000
                    }
                }],
                inputData: {
                    audio: [{
                        audioContent: audioBase64
                    }]
                }
            };

            console.log('Sending transcription request...');
            console.log('Request URL:', config.callbackUrl || this.computeUrl);
            console.log('Request headers:', {
                'Accept': '*/*',
                'Content-Type': 'application/json',
                'Authorization': config.inferenceApiKey ? 'Bearer [REDACTED]' : 'No auth key'
            });
            
            const response = await fetch(config.callbackUrl || this.computeUrl, {
                method: 'POST',
                headers: {
                    'Accept': '*/*',
                    'Content-Type': 'application/json',
                    'Authorization': config.inferenceApiKey
                },
                body: JSON.stringify(requestBody)
            });

            console.log('Response status:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`Bhashini API error (${response.status}): ${errorText}`);
            }

            const data = await response.json();
            console.log('Full API response:', JSON.stringify(data, null, 2));
            
            // Extract transcription from response
            const transcription = data.pipelineResponse?.[0]?.output?.[0]?.source || '';
            
            if (!transcription) {
                console.warn('No transcription found in response. Response structure:', data);
                return '';
            }
            
            console.log('Transcription successfully extracted:', transcription);
            return transcription;
        } catch (error) {
            console.error('Detailed transcription error:', {
                message: error.message,
                stack: error.stack,
                language: language,
                audioDataLength: audioBase64 ? audioBase64.length : 'null'
            });
            throw error;
        }
    }

    /**
     * Get supported languages
     * @returns {Array<Object>} Array of supported languages
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
        console.log('Pipeline cache cleared');
    }
}

// Export for use in other modules
window.BhashiniService = BhashiniService;
