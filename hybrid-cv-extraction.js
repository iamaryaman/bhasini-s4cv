// Hybrid CV Extraction Service
// Combines AI-powered extraction (primary) with NER fallback (secondary)
// Based on iOS S4CV app architecture

class HybridCVExtraction {
    constructor() {
        this.aiService = new AIExtractionService();
        this.nerEngine = null; // Will be initialized when MultilingualNEREngine is available
        
        // Configuration
        this.config = {
            useAI: true,
            aiTimeout: 30000,
            fallbackToNER: false,
            mergeResults: false
        };
        
        // Statistics
        this.stats = {
            totalExtractions: 0,
            aiSuccesses: 0,
            nerFallbacks: 0,
            failures: 0
        };
    }
    
    /**
     * Initialize NER engine
     * @param {MultilingualNEREngine} nerEngine - Instance of NER engine
     */
    setNEREngine(nerEngine) {
        this.nerEngine = nerEngine;
        console.log('✅ NER engine initialized for fallback');
    }
    
    /**
     * Set OpenRouter API key for AI service
     * @param {string} apiKey - OpenRouter API key
     */
    setApiKey(apiKey) {
        this.aiService.setApiKey(apiKey);
        console.log('✅ AI service configured with API key');
    }
    
    /**
     * Configure extraction behavior
     * @param {Object} options - Configuration options
     */
    configure(options) {
        this.config = { ...this.config, ...options };
        console.log('⚙️ Extraction configured:', this.config);
    }
    
    /**
     * Main extraction method
     * Tries AI first, falls back to NER on failure
     * @param {string} text - Transcribed text to analyze
     * @param {string} language - Language code ('hi', 'en', 'mixed')
     * @returns {Promise<Object>} Extracted CV data with metadata
     */
    async extractCV(text, language = 'mixed') {
        this.stats.totalExtractions++;
        
        if (!text || text.trim().length === 0) {
            throw new Error('Text is required for extraction');
        }
        
        console.log('\n🔍 Starting Hybrid CV Extraction...');
        console.log(`   Text length: ${text.length} characters`);
        console.log(`   Language: ${language}`);
        console.log(`   AI enabled: ${this.config.useAI && this.aiService.isConfigured()}`);
        console.log(`   NER fallback: ${this.config.fallbackToNER && this.nerEngine}`);
        
        let result = null;
        let extractionMethod = null;
        let error = null;
        
        // Always use AI directly; no NER fallback
        if (this.aiService.isConfigured()) {
            try {
                console.log('\n🤖 Attempting AI extraction...');
                result = await this.aiService.extractCVData(text, language);
                extractionMethod = 'ai';
                this.stats.aiSuccesses++;
                console.log('✅ AI extraction successful!');
            } catch (aiError) {
                this.stats.failures++;
                throw new Error(`AI extraction failed: ${aiError.message}`);
            }
        } else {
            this.stats.failures++;
            throw new Error('AI service not configured. Please set your OpenRouter API key.');
        }
        
        // Add metadata
        const finalResult = {
            ...result,
            metadata: {
                extractionMethod: extractionMethod,
                language: language,
                textLength: text.length,
                timestamp: new Date().toISOString(),
                aiAttempted: true,
                aiSuccess: extractionMethod === 'ai',
                error: error ? error.message : null
            }
        };
        
        console.log('\n✅ Extraction complete!');
        console.log(`   Method: ${extractionMethod.toUpperCase()}`);
        console.log(`   Confidence: ${finalResult.confidence || 'N/A'}`);
        this.logExtractionSummary(finalResult);
        
        return finalResult;
    }
    
    /**
     * Extract using NER engine
     * Converts NER output to match AI format
     * @param {string} text - Text to analyze
     * @param {string} language - Language code
     * @returns {Promise<Object>} Extracted data in AI format
     */
    async extractWithNER(text, language) {
        throw new Error('NER extraction disabled. Using AI-only mode.');
        if (!this.nerEngine) {
            throw new Error('NER engine not initialized');
        }
        
        // Use NER engine to extract entities
        const entities = await this.nerEngine.extractEntities(text, language);
        
        // Convert NER entities to AI-compatible format
        const converted = this.convertNERToAIFormat(entities, text);
        
        return {
            ...converted,
            source: 'ner',
            confidence: 0.75  // NER has lower confidence than AI
        };
    }
    
    /**
     * Convert NER entities to AI-compatible CV data format
     * @param {Array} entities - NER entities
     * @param {string} originalText - Original text
     * @returns {Object} CV data in AI format
     */
    convertNERToAIFormat(entities, originalText) {
        const cvData = {
            personal_info: {
                name: null,
                email: null,
                phone: null,
                location: null,
                linkedin: null,
                github: null
            },
            summary: null,
            work_experience: [],
            education: [],
            skills: [],
            certifications: []
        };
        
        // Group entities by type
        const grouped = this.groupEntitiesByType(entities);
        
        // Extract personal information
        if (grouped.PERSON && grouped.PERSON.length > 0) {
            // Use the first person name found (usually the candidate's name)
            cvData.personal_info.name = grouped.PERSON[0].text;
        }
        
        if (grouped.CONTACT) {
            grouped.CONTACT.forEach(contact => {
                if (contact.subtype === 'email') {
                    cvData.personal_info.email = contact.text;
                } else if (contact.subtype === 'phone') {
                    cvData.personal_info.phone = contact.text;
                }
            });
        }
        
        if (grouped.LOCATION && grouped.LOCATION.length > 0) {
            cvData.personal_info.location = grouped.LOCATION[0].text;
        }
        
        // Extract skills
        if (grouped.SKILL) {
            cvData.skills = grouped.SKILL.map(skill => skill.text);
        }
        
        // Extract education
        if (grouped.EDUCATION) {
            // Group education entities by proximity
            const educationGroups = this.groupByProximity(grouped.EDUCATION, 200);
            
            cvData.education = educationGroups.map(group => {
                const entry = {
                    degree: null,
                    field_of_study: null,
                    institution: null,
                    location: null,
                    start_date: null,
                    end_date: null,
                    gpa: null
                };
                
                group.forEach(item => {
                    if (item.subtype === 'degree') {
                        entry.degree = item.text;
                    } else if (item.subtype === 'institution') {
                        entry.institution = item.text;
                    } else if (item.subtype === 'field') {
                        entry.field_of_study = item.text;
                    }
                });
                
                return entry;
            }).filter(entry => entry.degree || entry.institution);
        }
        
        // Extract work experience
        if (grouped.ORGANIZATION) {
            // Try to identify work experience from organizations and context
            const experienceGroups = this.groupByProximity(grouped.ORGANIZATION, 150);
            
            cvData.work_experience = experienceGroups.map(group => {
                return {
                    job_title: null,
                    company: group[0].text,
                    location: null,
                    start_date: null,
                    end_date: null,
                    responsibilities: []
                };
            });
        }
        
        // Extract dates and associate with education/experience
        if (grouped.DATE) {
            // This is a simplified approach; in production, you'd want more sophisticated date association
            // For now, we'll just note that dates were found
            console.log(`   Found ${grouped.DATE.length} date(s) in text`);
        }
        
        return cvData;
    }
    
    /**
     * Group entities by type
     * @param {Array} entities - Array of entities
     * @returns {Object} Entities grouped by type
     */
    groupEntitiesByType(entities) {
        const grouped = {};
        
        entities.forEach(entity => {
            if (!grouped[entity.type]) {
                grouped[entity.type] = [];
            }
            grouped[entity.type].push(entity);
        });
        
        return grouped;
    }
    
    /**
     * Group entities by proximity in text
     * @param {Array} entities - Array of entities
     * @param {number} maxDistance - Maximum character distance to consider entities related
     * @returns {Array} Array of entity groups
     */
    groupByProximity(entities, maxDistance = 200) {
        if (!entities || entities.length === 0) return [];
        
        // Sort by position
        const sorted = [...entities].sort((a, b) => a.startPos - b.startPos);
        
        const groups = [];
        let currentGroup = [sorted[0]];
        
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const current = sorted[i];
            
            if (current.startPos - prev.endPos <= maxDistance) {
                currentGroup.push(current);
            } else {
                groups.push(currentGroup);
                currentGroup = [current];
            }
        }
        
        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }
        
        return groups;
    }
    
    /**
     * Log extraction summary
     * @param {Object} result - Extraction result
     */
    logExtractionSummary(result) {
        console.log('\n📊 Extraction Summary:');
        console.log(`   Name: ${result.personal_info?.name || '❌ Not found'}`);
        console.log(`   Email: ${result.personal_info?.email || '❌ Not found'}`);
        console.log(`   Phone: ${result.personal_info?.phone || '❌ Not found'}`);
        console.log(`   Skills: ${result.skills?.length || 0} found`);
        console.log(`   Education: ${result.education?.length || 0} entries`);
        console.log(`   Experience: ${result.work_experience?.length || 0} entries`);
    }
    
    /**
     * Get extraction statistics
     * @returns {Object} Statistics
     */
    getStats() {
        const aiSuccessRate = this.stats.totalExtractions > 0 
            ? ((this.stats.aiSuccesses / this.stats.totalExtractions) * 100).toFixed(1)
            : 0;
            
        return {
            ...this.stats,
            aiSuccessRate: `${aiSuccessRate}%`,
            nerUsageRate: `${((this.stats.nerFallbacks / this.stats.totalExtractions) * 100).toFixed(1)}%`
        };
    }
    
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalExtractions: 0,
            aiSuccesses: 0,
            nerFallbacks: 0,
            failures: 0
        };
    }
    
    /**
     * Check if service is ready
     * @returns {Object} Readiness status
     */
    checkReadiness() {
        const aiReady = this.aiService.isConfigured();
        const nerReady = this.nerEngine !== null;
        
        return {
            ready: aiReady || nerReady,
            aiAvailable: aiReady,
            nerAvailable: nerReady,
            recommendedMethod: aiReady ? 'ai' : 'ner',
            message: aiReady 
                ? '✅ AI extraction available (recommended)'
                : nerReady 
                    ? '⚠️ Only NER extraction available (AI not configured)'
                    : '❌ No extraction method available'
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridCVExtraction;
}
