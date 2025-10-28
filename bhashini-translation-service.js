// Bhashini Translation Service Module
// Handles text translation using Bhashini NMT API

class BhashiniTranslationService {
    constructor() {
        // API credentials (same as BhashiniService)
        this.userId = '21d41f1e0ae54d958d93d8a1c65f96a4';
        this.ulcaApiKey = '025f6d4ca8-74bc-4847-8bbf-70f1ed42b166';
        
        // API endpoints
        this.pipelineURL = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
        this.computeURL = 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
        
        // Cache for pipeline configurations (keyed by "source-target")
        this.pipelineCache = new Map();
        
        // Cache for translated strings to avoid redundant API calls
        this.translationCache = new Map();
        
        this.isTranslating = false;
        this.lastError = null;
    }
    
    /**
     * Translate text from one language to another using Bhashini NMT
     * @param {string} text - Text to translate
     * @param {string} sourceLanguage - Source language code (e.g., 'en')
     * @param {string} targetLanguage - Target language code (e.g., 'hi')
     * @returns {Promise<string>} Translated text
     */
    async translate(text, sourceLanguage, targetLanguage) {
        if (!text || text.trim().length === 0) {
            return text;
        }
        
        // If source and target are the same, return original text
        if (sourceLanguage === targetLanguage) {
            return text;
        }
        
        // Check translation cache
        const cacheKey = `${sourceLanguage}-${targetLanguage}:${text}`;
        if (this.translationCache.has(cacheKey)) {
            console.log('Using cached translation for:', text);
            return this.translationCache.get(cacheKey);
        }
        
        try {
            this.isTranslating = true;
            console.log(`Translating from ${sourceLanguage} to ${targetLanguage}: "${text}"`);
            
            // Step 1: Get pipeline config
            const { serviceId, authToken } = await this.getPipelineConfig(sourceLanguage, targetLanguage);
            
            // Step 2: Call compute API
            const translatedText = await this.computeTranslation(
                text,
                serviceId,
                authToken,
                sourceLanguage,
                targetLanguage
            );
            
            // Cache the translation
            this.translationCache.set(cacheKey, translatedText);
            
            return translatedText;
        } catch (error) {
            console.error('Translation error:', error);
            this.lastError = error.message;
            // Return original text if translation fails
            return text;
        } finally {
            this.isTranslating = false;
        }
    }
    
    /**
     * Translate multiple texts in batch
     * @param {Array<string>} texts - Array of texts to translate
     * @param {string} sourceLanguage - Source language code
     * @param {string} targetLanguage - Target language code
     * @returns {Promise<Array<string>>} Array of translated texts
     */
    async translateBatch(texts, sourceLanguage, targetLanguage) {
        const promises = texts.map(text => this.translate(text, sourceLanguage, targetLanguage));
        return Promise.all(promises);
    }
    
    /**
     * Get pipeline configuration for translation
     * @private
     */
    async getPipelineConfig(sourceLanguage, targetLanguage) {
        const cacheKey = `${sourceLanguage}-${targetLanguage}`;
        
        // Check cache first
        if (this.pipelineCache.has(cacheKey)) {
            console.log(`Using cached pipeline config for ${cacheKey}`);
            return this.pipelineCache.get(cacheKey);
        }
        
        const payload = {
            pipelineTasks: [
                {
                    taskType: "translation",
                    config: {
                        language: {
                            sourceLanguage: sourceLanguage,
                            targetLanguage: targetLanguage
                        }
                    }
                }
            ],
            pipelineRequestConfig: {
                pipelineId: "64392f96daac500b55c543cd"
            }
        };
        
        try {
            const response = await fetch(this.pipelineURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'userID': this.userId,
                    'ulcaApiKey': this.ulcaApiKey
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Translation pipeline error:', errorText);
                throw new Error(`Failed to get translation pipeline config: ${response.statusText}`);
            }
            
            const json = await response.json();
            console.log('Translation pipeline response:', json);
            
            // Extract service ID and auth token
            const pipelineResponseConfig = json.pipelineResponseConfig;
            if (!pipelineResponseConfig || pipelineResponseConfig.length === 0) {
                throw new Error('No pipeline response config found');
            }
            
            const firstResponse = pipelineResponseConfig[0];
            const config = firstResponse.config;
            if (!config || config.length === 0) {
                throw new Error('No config found in pipeline response');
            }
            
            const firstConfig = config[0];
            const serviceId = firstConfig.serviceId;
            
            const pipelineInferenceAPIEndPoint = json.pipelineInferenceAPIEndPoint;
            if (!pipelineInferenceAPIEndPoint) {
                throw new Error('No pipeline inference endpoint found');
            }
            
            const inferenceApiKey = pipelineInferenceAPIEndPoint.inferenceApiKey;
            if (!inferenceApiKey) {
                throw new Error('No inference API key found');
            }
            
            const authToken = inferenceApiKey.value;
            
            if (!serviceId || !authToken) {
                throw new Error('Missing serviceId or authToken in pipeline config');
            }
            
            const result = { serviceId, authToken };
            
            // Cache the configuration
            this.pipelineCache.set(cacheKey, result);
            console.log(`Translation config cached for ${cacheKey}:`, { serviceId });
            
            return result;
        } catch (error) {
            console.error('Error getting pipeline config:', error);
            throw error;
        }
    }
    
    /**
     * Call compute API to translate text
     * @private
     */
    async computeTranslation(text, serviceId, authToken, sourceLanguage, targetLanguage) {
        const payload = {
            pipelineTasks: [
                {
                    taskType: "translation",
                    config: {
                        language: {
                            sourceLanguage: sourceLanguage,
                            targetLanguage: targetLanguage
                        },
                        serviceId: serviceId
                    }
                }
            ],
            inputData: {
                input: [
                    {
                        source: text
                    }
                ]
            }
        };
        
        try {
            const response = await fetch(this.computeURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authToken
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Translation compute error:', errorText);
                throw new Error(`Translation API request failed: ${response.statusText}`);
            }
            
            const json = await response.json();
            console.log('Translation compute response:', json);
            
            // Extract translation from response
            const pipelineResponse = json.pipelineResponse;
            if (!pipelineResponse || pipelineResponse.length === 0) {
                throw new Error('No pipeline response found');
            }
            
            const firstResponse = pipelineResponse[0];
            const output = firstResponse.output;
            if (!output || output.length === 0) {
                throw new Error('No output found in response');
            }
            
            const firstOutput = output[0];
            const translatedText = firstOutput.target;
            
            if (!translatedText) {
                throw new Error('No translation output received from API');
            }
            
            console.log('Translation result:', translatedText);
            return translatedText;
        } catch (error) {
            console.error('Error in compute translation:', error);
            throw error;
        }
    }
    
    /**
     * Clear all caches
     */
    clearCache() {
        this.pipelineCache.clear();
        this.translationCache.clear();
        console.log('Translation caches cleared');
    }
    
    /**
     * Get supported language pairs for translation
     */
    getSupportedLanguages() {
        return [
            { code: 'en', name: 'English' },
            { code: 'hi', name: 'Hindi' },
            { code: 'ta', name: 'Tamil' },
            { code: 'te', name: 'Telugu' },
            { code: 'kn', name: 'Kannada' },
            { code: 'ml', name: 'Malayalam' },
            { code: 'mr', name: 'Marathi' },
            { code: 'gu', name: 'Gujarati' },
            { code: 'bn', name: 'Bengali' },
            { code: 'pa', name: 'Punjabi' },
            { code: 'or', name: 'Odia' },
            { code: 'as', name: 'Assamese' },
            { code: 'ur', name: 'Urdu' }
        ];
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.BhashiniTranslationService = BhashiniTranslationService;
}
