// Multilingual Named Entity Recognition Engine for Web
// Optimized for CV/Resume content extraction from speech transcription
// Supports all 13 Bhashini languages

class MultilingualNEREngine {
    constructor() {
        this.nerData = null;
        this.processedRanges = [];
        this.entityTypes = {
            PERSON: 'PERSON',
            LOCATION: 'LOCATION',
            ORGANIZATION: 'ORGANIZATION',
            SKILL: 'SKILL',
            EDUCATION: 'EDUCATION',
            DATE: 'DATE',
            CONTACT: 'CONTACT'
        };
        
        this.confidenceThresholds = {
            HIGH: 0.9,
            MEDIUM: 0.7,
            LOW: 0.5
        };
        
        // Load NER data
        this.loadNERData();
    }
    
    /**
     * Load NER data from JSON file
     */
    async loadNERData() {
        try {
            const response = await fetch('ner-data.json');
            this.nerData = await response.json();
            console.log('NER data loaded successfully');
        } catch (error) {
            console.error('Failed to load NER data:', error);
            // Fallback to minimal data
            this.nerData = this.getMinimalNERData();
        }
    }
    
    /**
     * Extract entities from text for a specific language
     * @param {string} text - Input text to analyze
     * @param {string} language - Language code (e.g., 'hi', 'en')
     * @returns {Promise<Array>} Array of extracted entities
     */
    async extractEntities(text, language = 'hi') {
        if (!this.nerData) {
            console.warn('NER data not loaded yet');
            return [];
        }
        
        if (!text || text.trim().length === 0) {
            return [];
        }
        
        // Reset processed ranges for new text
        this.processedRanges = [];
        
        // Get language-specific data
        const langData = this.nerData.languages[language];
        if (!langData) {
            console.warn(`Language ${language} not supported`);
            return [];
        }
        
        // Tokenize text
        const tokens = this.tokenize(text);
        
        // Extract entities in order of priority
        const entities = [];
        
        // 1. Contact information (highest priority)
        entities.push(...this.extractContactInfo(text, tokens, language));
        
        // 2. Person names (high priority)
        entities.push(...this.extractPersonNames(tokens, langData, text));
        
        // 3. Organizations and companies
        entities.push(...this.extractOrganizations(tokens, langData, text));
        
        // 4. Locations
        entities.push(...this.extractLocations(tokens, langData, text));
        
        // 5. Skills
        entities.push(...this.extractSkills(tokens, langData, text));
        
        // 6. Education-related terms
        entities.push(...this.extractEducation(tokens, langData, text));
        
        // 7. Dates
        entities.push(...this.extractDates(tokens, langData, text));
        
        // Sort by position and filter overlapping entities
        return this.postProcessEntities(entities, text);
    }
    
    /**
     * Tokenize text into words with position information
     * @param {string} text - Input text
     * @returns {Array} Array of token objects
     */
    tokenize(text) {
        const tokens = [];
        const words = text.split(/\s+/);
        let currentPos = 0;
        
        for (const word of words) {
            const startPos = text.indexOf(word, currentPos);
            if (startPos !== -1) {
                tokens.push({
                    text: word.replace(/[^\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FF\w]/g, ''),
                    originalText: word,
                    startPos: startPos,
                    endPos: startPos + word.length
                });
                currentPos = startPos + word.length;
            }
        }
        
        return tokens.filter(token => token.text.length > 0);
    }
    
    /**
     * Extract contact information (email, phone)
     * @param {string} text - Full text
     * @param {Array} tokens - Tokenized text
     * @param {string} language - Language code
     * @returns {Array} Contact entities
     */
    extractContactInfo(text, tokens, language) {
        const entities = [];
        
        // Email extraction
        const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        let match;
        while ((match = emailRegex.exec(text)) !== null) {
            if (!this.isOverlapping(match.index, match.index + match[0].length)) {
                entities.push({
                    text: match[0],
                    type: this.entityTypes.CONTACT,
                    subtype: 'email',
                    startPos: match.index,
                    endPos: match.index + match[0].length,
                    confidence: 0.98,
                    language: language
                });
                this.processedRanges.push({
                    start: match.index,
                    end: match.index + match[0].length
                });
            }
        }
        
        // Phone extraction (Indian and international)
        const phoneRegexes = [
            /(\+91[\s-]?[6-9]\d{9})/g,  // Indian with +91
            /([6-9]\d{9})/g,            // Indian without code
            /(\+[1-9]\d{1,14})/g        // International
        ];
        
        for (const regex of phoneRegexes) {
            while ((match = regex.exec(text)) !== null) {
                if (!this.isOverlapping(match.index, match.index + match[0].length)) {
                    entities.push({
                        text: match[0],
                        type: this.entityTypes.CONTACT,
                        subtype: 'phone',
                        startPos: match.index,
                        endPos: match.index + match[0].length,
                        confidence: 0.95,
                        language: language
                    });
                    this.processedRanges.push({
                        start: match.index,
                        end: match.index + match[0].length
                    });
                }
            }
        }
        
        return entities;
    }
    
    /**
     * Extract person names using title + name and name + surname patterns
     * @param {Array} tokens - Tokenized text
     * @param {Object} langData - Language-specific data
     * @param {string} fullText - Original text
     * @returns {Array} Person entities
     */
    extractPersonNames(tokens, langData, fullText) {
        const entities = [];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            // Skip if already processed
            if (this.isOverlapping(token.startPos, token.endPos)) {
                continue;
            }
            
            // Pattern 1: Title + Name [+ Surname]
            if (langData.titles && langData.titles.includes(token.text)) {
                const nameTokens = this.extractTitleNamePattern(tokens, i, langData);
                if (nameTokens.length > 0) {
                    const entity = this.createPersonEntity(nameTokens, 0.95);
                    entities.push(entity);
                    this.markAsProcessed(nameTokens);
                }
            }
            
            // Pattern 2: Name + Surname
            else if (i < tokens.length - 1) {
                const nextToken = tokens[i + 1];
                if (langData.surnames && langData.surnames.includes(nextToken.text) &&
                    this.isValidName(token.text) && 
                    !this.isOverlapping(nextToken.startPos, nextToken.endPos)) {
                    
                    const nameTokens = [token, nextToken];
                    const entity = this.createPersonEntity(nameTokens, 0.85);
                    entities.push(entity);
                    this.markAsProcessed(nameTokens);
                    i++; // Skip next token
                }
            }
        }
        
        return entities;
    }
    
    /**
     * Extract organizations and companies
     * @param {Array} tokens - Tokenized text
     * @param {Object} langData - Language-specific data
     * @param {string} fullText - Original text
     * @returns {Array} Organization entities
     */
    extractOrganizations(tokens, langData, fullText) {
        const entities = [];
        const orgTypes = [...(langData.organizations || []), ...(langData.companies || [])];
        
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (this.isOverlapping(token.startPos, token.endPos)) {
                continue;
            }
            
            // Direct company/organization match
            if (orgTypes.includes(token.text)) {
                const confidence = langData.companies && langData.companies.includes(token.text) ? 0.95 : 0.80;
                entities.push({
                    text: token.text,
                    type: this.entityTypes.ORGANIZATION,
                    startPos: token.startPos,
                    endPos: token.endPos,
                    confidence: confidence,
                    language: this.getLanguageFromData(langData)
                });
                this.processedRanges.push({
                    start: token.startPos,
                    end: token.endPos
                });
            }
            
            // Pattern: [Name] + Organization type
            else if (langData.organizations && langData.organizations.includes(token.text) && i > 0) {
                const prevToken = tokens[i - 1];
                if (this.isValidName(prevToken.text) && !this.isOverlapping(prevToken.startPos, prevToken.endPos)) {
                    entities.push({
                        text: prevToken.text + ' ' + token.text,
                        type: this.entityTypes.ORGANIZATION,
                        startPos: prevToken.startPos,
                        endPos: token.endPos,
                        confidence: 0.75,
                        language: this.getLanguageFromData(langData)
                    });
                    this.processedRanges.push({
                        start: prevToken.startPos,
                        end: token.endPos
                    });
                }
            }
        }
        
        return entities;
    }
    
    /**
     * Extract location entities
     * @param {Array} tokens - Tokenized text
     * @param {Object} langData - Language-specific data
     * @param {string} fullText - Original text
     * @returns {Array} Location entities
     */
    extractLocations(tokens, langData, fullText) {
        const entities = [];
        const locations = [...(langData.cities || []), ...(langData.states || [])];
        
        for (const token of tokens) {
            if (this.isOverlapping(token.startPos, token.endPos)) {
                continue;
            }
            
            if (locations.includes(token.text)) {
                const confidence = langData.cities && langData.cities.includes(token.text) ? 0.90 : 0.85;
                entities.push({
                    text: token.text,
                    type: this.entityTypes.LOCATION,
                    startPos: token.startPos,
                    endPos: token.endPos,
                    confidence: confidence,
                    language: this.getLanguageFromData(langData)
                });
                this.processedRanges.push({
                    start: token.startPos,
                    end: token.endPos
                });
            }
        }
        
        // Context-based location detection
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const locationPrepositions = ['में', 'से', 'को', 'in', 'at', 'from', 'to'];
            
            if (locationPrepositions.includes(token.text) && i > 0) {
                const prevToken = tokens[i - 1];
                if (this.isValidName(prevToken.text) && 
                    !this.isOverlapping(prevToken.startPos, prevToken.endPos) &&
                    !locations.includes(prevToken.text)) {
                    
                    entities.push({
                        text: prevToken.text,
                        type: this.entityTypes.LOCATION,
                        startPos: prevToken.startPos,
                        endPos: prevToken.endPos,
                        confidence: 0.60,
                        language: this.getLanguageFromData(langData)
                    });
                    this.processedRanges.push({
                        start: prevToken.startPos,
                        end: prevToken.endPos
                    });
                }
            }
        }
        
        return entities;
    }
    
    /**
     * Extract skills
     * @param {Array} tokens - Tokenized text
     * @param {Object} langData - Language-specific data
     * @param {string} fullText - Original text
     * @returns {Array} Skill entities
     */
    extractSkills(tokens, langData, fullText) {
        const entities = [];
        const skills = langData.skills || [];
        
        for (const token of tokens) {
            if (this.isOverlapping(token.startPos, token.endPos)) {
                continue;
            }
            
            if (skills.includes(token.text)) {
                entities.push({
                    text: token.text,
                    type: this.entityTypes.SKILL,
                    startPos: token.startPos,
                    endPos: token.endPos,
                    confidence: 0.80,
                    language: this.getLanguageFromData(langData)
                });
                this.processedRanges.push({
                    start: token.startPos,
                    end: token.endPos
                });
            }
        }
        
        return entities;
    }
    
    /**
     * Extract education-related entities
     * @param {Array} tokens - Tokenized text
     * @param {Object} langData - Language-specific data
     * @param {string} fullText - Original text
     * @returns {Array} Education entities
     */
    extractEducation(tokens, langData, fullText) {
        const entities = [];
        const educationTerms = langData.education || [];
        
        for (const token of tokens) {
            if (this.isOverlapping(token.startPos, token.endPos)) {
                continue;
            }
            
            if (educationTerms.includes(token.text)) {
                entities.push({
                    text: token.text,
                    type: this.entityTypes.EDUCATION,
                    startPos: token.startPos,
                    endPos: token.endPos,
                    confidence: 0.75,
                    language: this.getLanguageFromData(langData)
                });
                this.processedRanges.push({
                    start: token.startPos,
                    end: token.endPos
                });
            }
        }
        
        return entities;
    }
    
    /**
     * Extract date entities
     * @param {Array} tokens - Tokenized text
     * @param {Object} langData - Language-specific data
     * @param {string} fullText - Original text
     * @returns {Array} Date entities
     */
    extractDates(tokens, langData, fullText) {
        const entities = [];
        const dateWords = langData.dateWords || [];
        
        // Extract date words
        for (const token of tokens) {
            if (this.isOverlapping(token.startPos, token.endPos)) {
                continue;
            }
            
            if (dateWords.includes(token.text)) {
                entities.push({
                    text: token.text,
                    type: this.entityTypes.DATE,
                    startPos: token.startPos,
                    endPos: token.endPos,
                    confidence: 0.85,
                    language: this.getLanguageFromData(langData)
                });
                this.processedRanges.push({
                    start: token.startPos,
                    end: token.endPos
                });
            }
        }
        
        // Extract numerical dates
        const dateRegexes = [
            /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,     // DD/MM/YYYY or MM/DD/YYYY
            /(\d{1,2}-\d{1,2}-\d{2,4})/g,      // DD-MM-YYYY
            /(\d{4}-\d{1,2}-\d{1,2})/g,        // YYYY-MM-DD
            /(\d{1,2}\s+(जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)\s+\d{4})/g
        ];
        
        for (const regex of dateRegexes) {
            let match;
            while ((match = regex.exec(fullText)) !== null) {
                if (!this.isOverlapping(match.index, match.index + match[0].length)) {
                    entities.push({
                        text: match[0],
                        type: this.entityTypes.DATE,
                        startPos: match.index,
                        endPos: match.index + match[0].length,
                        confidence: 0.90,
                        language: this.getLanguageFromData(langData)
                    });
                    this.processedRanges.push({
                        start: match.index,
                        end: match.index + match[0].length
                    });
                }
            }
        }
        
        return entities;
    }
    
    /**
     * Helper methods
     */
    
    extractTitleNamePattern(tokens, startIndex, langData) {
        const result = [tokens[startIndex]]; // Title
        
        // Get next token (should be name)
        if (startIndex + 1 < tokens.length) {
            const nameToken = tokens[startIndex + 1];
            if (this.isValidName(nameToken.text)) {
                result.push(nameToken);
                
                // Check for surname
                if (startIndex + 2 < tokens.length) {
                    const surnameToken = tokens[startIndex + 2];
                    if (langData.surnames && langData.surnames.includes(surnameToken.text)) {
                        result.push(surnameToken);
                    }
                }
            }
        }
        
        return result.length > 1 ? result : [];
    }
    
    createPersonEntity(tokens, confidence) {
        const firstToken = tokens[0];
        const lastToken = tokens[tokens.length - 1];
        
        return {
            text: tokens.map(t => t.text).join(' '),
            type: this.entityTypes.PERSON,
            startPos: firstToken.startPos,
            endPos: lastToken.endPos,
            confidence: confidence,
            language: this.getCurrentLanguage()
        };
    }
    
    isValidName(text) {
        // Check if text looks like a name (not a common word)
        return text.length >= 2 && 
               /^[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FFa-zA-Z]/.test(text);
    }
    
    isOverlapping(start, end) {
        return this.processedRanges.some(range => 
            (start >= range.start && start < range.end) ||
            (end > range.start && end <= range.end) ||
            (start <= range.start && end >= range.end)
        );
    }
    
    markAsProcessed(tokens) {
        const start = Math.min(...tokens.map(t => t.startPos));
        const end = Math.max(...tokens.map(t => t.endPos));
        this.processedRanges.push({ start, end });
    }
    
    getLanguageFromData(langData) {
        return langData.name || 'unknown';
    }
    
    getCurrentLanguage() {
        return 'current'; // This should be set based on current processing language
    }
    
    /**
     * Post-process entities to remove overlaps and sort by position
     * @param {Array} entities - Raw extracted entities
     * @param {string} text - Original text
     * @returns {Array} Processed entities
     */
    postProcessEntities(entities, text) {
        // Sort by position
        entities.sort((a, b) => a.startPos - b.startPos);
        
        // Remove overlapping entities (keep higher confidence)
        const filtered = [];
        for (const entity of entities) {
            const overlapping = filtered.find(existing => 
                (entity.startPos >= existing.startPos && entity.startPos < existing.endPos) ||
                (entity.endPos > existing.startPos && entity.endPos <= existing.endPos) ||
                (entity.startPos <= existing.startPos && entity.endPos >= existing.endPos)
            );
            
            if (!overlapping) {
                filtered.push(entity);
            } else if (entity.confidence > overlapping.confidence) {
                const index = filtered.indexOf(overlapping);
                filtered[index] = entity;
            }
        }
        
        return filtered;
    }
    
    /**
     * Map entities to CV fields
     * @param {Array} entities - Extracted entities
     * @returns {Object} CV field mappings
     */
    mapToCV(entities) {
        const cvData = {
            contact: {
                name: '',
                email: '',
                phone: '',
                address: ''
            },
            skills: {
                technical: [],
                soft: [],
                languages: []
            },
            experience: [],
            education: [],
            other: []
        };
        
        for (const entity of entities) {
            switch (entity.type) {
                case this.entityTypes.PERSON:
                    if (!cvData.contact.name) {
                        cvData.contact.name = entity.text;
                    }
                    break;
                    
                case this.entityTypes.CONTACT:
                    if (entity.subtype === 'email' && !cvData.contact.email) {
                        cvData.contact.email = entity.text;
                    } else if (entity.subtype === 'phone' && !cvData.contact.phone) {
                        cvData.contact.phone = entity.text;
                    }
                    break;
                    
                case this.entityTypes.LOCATION:
                    if (!cvData.contact.address) {
                        cvData.contact.address = entity.text;
                    }
                    break;
                    
                case this.entityTypes.SKILL:
                    cvData.skills.technical.push(entity.text);
                    break;
                    
                case this.entityTypes.ORGANIZATION:
                    cvData.experience.push({
                        company: entity.text,
                        position: '',
                        startDate: '',
                        endDate: '',
                        description: ''
                    });
                    break;
                    
                case this.entityTypes.EDUCATION:
                    cvData.education.push({
                        institution: '',
                        degree: entity.text,
                        field: '',
                        startDate: '',
                        endDate: ''
                    });
                    break;
                    
                default:
                    cvData.other.push(entity);
            }
        }
        
        return cvData;
    }
    
    /**
     * Get minimal NER data as fallback
     */
    getMinimalNERData() {
        return {
            languages: {
                hi: {
                    name: "Hindi",
                    titles: ["श्री", "श्रीमती", "डॉ"],
                    surnames: ["सिंह", "कुमार", "शर्मा"],
                    cities: ["दिल्ली", "मुंबई"],
                    skills: ["प्रोग्रामिंग", "कंप्यूटर"]
                },
                en: {
                    name: "English", 
                    titles: ["Mr", "Mrs", "Dr"],
                    surnames: ["Singh", "Kumar", "Sharma"],
                    cities: ["Delhi", "Mumbai"],
                    skills: ["Programming", "Computer"]
                }
            }
        };
    }
}

// CV Field Mapper Class
class CVFieldMapper {
    constructor(nerEngine) {
        this.nerEngine = nerEngine;
        this.fieldMappings = {
            'contact.name': ['PERSON'],
            'contact.email': ['CONTACT'],
            'contact.phone': ['CONTACT'],
            'contact.address': ['LOCATION'],
            'experience.company': ['ORGANIZATION'],
            'experience.location': ['LOCATION'],
            'education.institution': ['ORGANIZATION'],
            'education.degree': ['EDUCATION'],
            'skills.technical': ['SKILL'],
            'skills.languages': ['SKILL'],
            'dates': ['DATE']
        };
    }
    
    /**
     * Create structured CV data from entities
     * @param {Array} entities - Extracted entities
     * @param {string} originalText - Original transcribed text
     * @returns {Object} Structured CV data
     */
    createCVStructure(entities, originalText) {
        // Extract entity values with fallback text analysis
        const personEntity = this.getBestEntity(entities, 'PERSON');
        const emailEntity = this.getBestEntity(entities, 'CONTACT', 'email');
        const phoneEntity = this.getBestEntity(entities, 'CONTACT', 'phone');
        const locationEntity = this.getBestEntity(entities, 'LOCATION');
        
        // Enhanced text analysis for missing entities
        const extractedInfo = this.analyzeTextForMissingInfo(originalText, entities);
        
        const cv = {
            // Format for export compatibility - separate personalInfo structure
            personalInfo: {
                fullName: personEntity?.text || extractedInfo.name || '',
                email: emailEntity?.text || extractedInfo.email || '',
                phone: phoneEntity?.text || extractedInfo.phone || '',
                location: locationEntity?.text || extractedInfo.location || ''
            },
            contact: {
                name: personEntity?.text || extractedInfo.name || '',
                email: emailEntity?.text || extractedInfo.email || '',
                phone: phoneEntity?.text || extractedInfo.phone || '',
                location: locationEntity?.text || extractedInfo.location || ''
            },
            summary: this.extractSummary(originalText, entities) || this.generateSummaryFromText(originalText),
            professionalSummary: this.extractSummary(originalText, entities) || this.generateSummaryFromText(originalText),
            experience: this.extractExperience(entities, originalText),
            workExperience: this.extractWorkExperience(entities, originalText),
            education: this.extractEducation(entities),
            skills: {
                technical: this.extractSkills(entities).technical || extractedInfo.skills || [],
                soft: this.extractSoftSkills(originalText),
                languages: this.extractLanguages(originalText, entities)
            },
            // Metadata for internal use
            metadata: {
                confidence: this.calculateOverallConfidence(entities),
                language: this.detectPrimaryLanguage(entities),
                extractionDate: new Date().toISOString(),
                rawText: originalText,
                extractedEntities: entities,
                needsReview: this.needsManualReview(entities)
            }
        };
        
        return cv;
    }
    
    getBestEntity(entities, type, subtype = null) {
        const candidates = entities.filter(e => {
            if (subtype) {
                return e.type === type && e.subtype === subtype;
            }
            return e.type === type;
        });
        
        if (candidates.length === 0) return null;
        
        // Return highest confidence entity
        return candidates.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
    }
    
    extractSummary(text, entities) {
        // Simple extraction - look for sentences with personal pronouns
        const sentences = text.split(/[।.!?]+/);
        const summaryKeywords = ['मैं', 'I', 'am', 'हूं', 'experience', 'अनुभव', 'expert', 'विशेषज्ञ'];
        
        const summarySentences = sentences.filter(sentence => 
            summaryKeywords.some(keyword => sentence.includes(keyword))
        );
        
        return summarySentences.join('. ').trim();
    }
    
    extractExperience(entities, text) {
        const experience = [];
        const organizations = entities.filter(e => e.type === 'ORGANIZATION');
        const dates = entities.filter(e => e.type === 'DATE');
        const educationTerms = entities.filter(e => e.type === 'EDUCATION');
        
        // Filter out educational institutions from work experience
        const workOrganizations = organizations.filter(org => {
            // Check if this org is near education terms (likely a university/college)
            const nearEducation = educationTerms.some(edu => 
                Math.abs(edu.startPos - org.startPos) < 200
            );
            // Check if org name contains educational keywords
            const eduKeywords = ['विश्वविद्यालय', 'कॉलेज', 'संस्थान', 'University', 'College', 'Institute', 'School', 'विद्यालय'];
            const isEducational = eduKeywords.some(keyword => org.text.includes(keyword));
            
            return !nearEducation && !isEducational;
        });
        
        // Extract ALL work experiences from text using patterns
        const workExperiencePatterns = [
            /(?:worked|work|कार्य|काम)\s+(?:at|in|as|में)\s+([^.,।]+?)(?:[.,।]|$)/gi,
            /(?:company|कंपनी|organization|संगठन)[:\s]+([^.,।]+?)(?:[.,।]|$)/gi,
            /([A-Z][A-Za-z\s&]+(?:Ltd|Limited|Inc|Corporation|Pvt|Private|Company|Technologies|Solutions|Services))/g
        ];
        
        const extractedCompanies = new Set();
        
        // Add all detected organizations
        for (const org of workOrganizations) {
            extractedCompanies.add(org.text);
        }
        
        // Extract additional companies from text patterns
        for (const pattern of workExperiencePatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1] && match[1].trim().length > 2) {
                    const company = match[1].trim();
                    // Don't add if it's an educational institution
                    const eduKeywords = ['University', 'College', 'Institute', 'School', 'विश्वविद्यालय', 'कॉलेज'];
                    if (!eduKeywords.some(keyword => company.includes(keyword))) {
                        extractedCompanies.add(company);
                    }
                }
            }
        }
        
        // Create experience entries for each company
        for (const company of extractedCompanies) {
            // Find the organization entity if exists
            const orgEntity = organizations.find(org => org.text === company);
            const nearbyEntities = orgEntity ? this.findNearbyEntities(entities, orgEntity, text, 150) : [];
            
            // Find context around this company mention
            const companyIndex = text.indexOf(company);
            const contextStart = Math.max(0, companyIndex - 200);
            const contextEnd = Math.min(text.length, companyIndex + company.length + 200);
            const context = text.substring(contextStart, contextEnd);
            
            // Extract dates near this company
            const datesNearby = dates.filter(d => {
                if (!orgEntity) return false;
                return Math.abs(d.startPos - orgEntity.startPos) <= 150;
            });
            
            experience.push({
                company: company,
                jobTitle: this.inferPosition(context, { text: company, startPos: companyIndex }),
                position: this.inferPosition(context, { text: company, startPos: companyIndex }),
                location: nearbyEntities.find(e => e.type === 'LOCATION')?.text || '',
                duration: datesNearby[0]?.text || '',
                startDate: datesNearby[0]?.text || '',
                endDate: datesNearby[1]?.text || '',
                description: this.extractContextualDescription(text, { text: company, startPos: companyIndex }),
                confidence: orgEntity?.confidence || 0.7
            });
        }
        
        // Sort by confidence and position in text
        return experience.sort((a, b) => b.confidence - a.confidence);
    }
    
    extractWorkExperience(entities, text) {
        // Same as extractExperience but with workExperience format
        return this.extractExperience(entities, text);
    }
    
    extractSkills(entities) {
        const skills = entities.filter(e => e.type === 'SKILL');
        
        return {
            technical: skills.map(s => s.text),
            soft: [], // Could be enhanced with soft skill detection
            languages: entities
                .filter(e => e.type === 'SKILL' && this.isLanguageSkill(e.text))
                .map(s => s.text)
        };
    }
    
    extractEducation(entities) {
        const education = [];
        const educationTerms = entities.filter(e => e.type === 'EDUCATION');
        const organizations = entities.filter(e => e.type === 'ORGANIZATION');
        const text = entities[0]?.language || '';
        
        // Look for educational institutions from organizations
        const educationalOrgs = organizations.filter(org => 
            this.isEducationalInstitution(org.text)
        );
        
        // Extract institution names from text patterns
        const institutionPatterns = [
            /(?:from|at|studied at|पढ़ाई|अध्ययन)\s+([^.,।]+?(?:University|College|Institute|School|विश्वविद्यालय|कॉलेज|संस्थान|विद्यालय)[^.,।]*?)(?:[.,।]|$)/gi,
            /([A-Z][A-Za-z\s]+(?:University|College|Institute|School))/g,
            /((?:विश्वविद्यालय|कॉलेज|संस्थान)[^.,।]*?)(?:[.,।]|$)/g
        ];
        
        const extractedInstitutions = new Set();
        
        // Add all detected educational organizations
        for (const org of educationalOrgs) {
            extractedInstitutions.add(org.text);
        }
        
        // Extract additional institutions from text (using metadata rawText if available)
        const fullText = entities.find(e => e.metadata?.rawText)?.metadata?.rawText || '';
        if (fullText) {
            for (const pattern of institutionPatterns) {
                let match;
                while ((match = pattern.exec(fullText)) !== null) {
                    if (match[1] && match[1].trim().length > 3) {
                        extractedInstitutions.add(match[1].trim());
                    }
                }
            }
        }
        
        // Match education terms with institutions
        for (const term of educationTerms) {
            // Find nearby organizations (within 200 chars)
            const nearbyOrgs = educationalOrgs.filter(org => 
                Math.abs(org.startPos - term.startPos) < 200
            );
            
            // Find ANY nearby organization (not just educational)
            const nearbyAnyOrgs = organizations.filter(org => 
                Math.abs(org.startPos - term.startPos) < 200
            );
            
            // Pick the best institution
            let institution = '';
            if (nearbyOrgs.length > 0) {
                institution = nearbyOrgs[0].text;
            } else if (nearbyAnyOrgs.length > 0) {
                // Check if any nearby org looks educational
                const probablyEducational = nearbyAnyOrgs.find(org => 
                    this.isEducationalInstitution(org.text)
                );
                if (probablyEducational) {
                    institution = probablyEducational.text;
                }
            } else if (extractedInstitutions.size > 0) {
                // Use first extracted institution
                institution = Array.from(extractedInstitutions)[0];
            }
            
            education.push({
                degree: term.text,
                institution: institution,
                field: this.inferField(term.text),
                year: '',
                confidence: term.confidence
            });
        }
        
        // If no education terms found but we have educational institutions, create entries
        if (education.length === 0 && extractedInstitutions.size > 0) {
            for (const inst of extractedInstitutions) {
                education.push({
                    degree: '',
                    institution: inst,
                    field: '',
                    year: '',
                    confidence: 0.75
                });
            }
        }
        
        return education;
    }
    
    findNearbyEntities(entities, targetEntity, text, maxDistance) {
        return entities.filter(entity => 
            entity !== targetEntity &&
            Math.abs(entity.startPos - targetEntity.startPos) <= maxDistance
        );
    }
    
    inferPosition(text, orgEntity) {
        const positionKeywords = {
            'engineer': ['इंजीनियर', 'engineer'],
            'manager': ['मैनेजर', 'manager', 'प्रबंधक'],
            'developer': ['डेवलपर', 'developer', 'विकासकर्ता'],
            'analyst': ['विश्लेषक', 'analyst'],
            'consultant': ['सलाहकार', 'consultant']
        };
        
        const contextText = text.substring(
            Math.max(0, orgEntity.startPos - 100),
            Math.min(text.length, orgEntity.endPos + 100)
        );
        
        for (const [position, keywords] of Object.entries(positionKeywords)) {
            if (keywords.some(keyword => contextText.includes(keyword))) {
                return position;
            }
        }
        
        return '';
    }
    
    extractContextualDescription(text, entity) {
        // Extract surrounding sentences for context
        const sentences = text.split(/[।.!?]+/);
        const entitySentence = sentences.find(s => s.includes(entity.text));
        return entitySentence ? entitySentence.trim() : '';
    }
    
    isLanguageSkill(skill) {
        const languages = ['हिंदी', 'अंग्रेजी', 'English', 'Hindi', 'Tamil', 'Telugu'];
        return languages.some(lang => skill.includes(lang));
    }
    
    isEducationalInstitution(orgName) {
        const eduKeywords = ['विश्वविद्यालय', 'कॉलेज', 'संस्थान', 'University', 'College', 'Institute'];
        return eduKeywords.some(keyword => orgName.includes(keyword));
    }
    
    inferField(degree) {
        const fieldMappings = {
            'engineering': ['इंजीनियरिंग', 'engineering', 'B.Tech', 'M.Tech'],
            'computer_science': ['कंप्यूटर', 'computer', 'CS', 'IT'],
            'management': ['MBA', 'प्रबंधन', 'management'],
            'science': ['विज्ञान', 'science', 'B.Sc', 'M.Sc']
        };
        
        for (const [field, keywords] of Object.entries(fieldMappings)) {
            if (keywords.some(keyword => degree.includes(keyword))) {
                return field;
            }
        }
        
        return 'general';
    }
    
    calculateOverallConfidence(entities) {
        if (entities.length === 0) return 0;
        
        const totalConfidence = entities.reduce((sum, entity) => sum + entity.confidence, 0);
        return totalConfidence / entities.length;
    }
    
    detectPrimaryLanguage(entities) {
        const languageCounts = {};
        
        for (const entity of entities) {
            const lang = entity.language || 'unknown';
            languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        }
        
        return Object.entries(languageCounts)
            .sort(([,a], [,b]) => b - a)[0]?.[0] || 'unknown';
    }
    
    needsManualReview(entities) {
        const lowConfidenceEntities = entities.filter(e => e.confidence < 0.7);
        const hasContact = entities.some(e => e.type === 'CONTACT');
        const hasName = entities.some(e => e.type === 'PERSON');
        
        return lowConfidenceEntities.length > entities.length * 0.3 || !hasContact || !hasName;
    }
    
    /**
     * Analyze text for missing information using regex patterns
     * @param {string} text - Original text
     * @param {Array} entities - Already extracted entities
     * @returns {Object} Additional extracted information
     */
    analyzeTextForMissingInfo(text, entities) {
        const info = {
            name: '',
            email: '',
            phone: '',
            location: '',
            skills: []
        };
        
        // Extract email if not found by NER
        if (!entities.find(e => e.type === 'CONTACT' && e.subtype === 'email')) {
            const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
            if (emailMatch) info.email = emailMatch[0];
        }
        
        // Extract phone if not found by NER
        if (!entities.find(e => e.type === 'CONTACT' && e.subtype === 'phone')) {
            const phoneMatch = text.match(/(?:\+91[\s-]?)?[6-9]\d{9}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g);
            if (phoneMatch) info.phone = phoneMatch[0];
        }
        
        // Extract name if not found (look for "My name is" patterns)
        if (!entities.find(e => e.type === 'PERSON')) {
            const namePatterns = [
                /(?:my name is|i am|i'm)\s+([a-zA-Z\s]{2,30}?)(?:\s|[.,!]|$)/gi,
                /^([A-Z][a-z]+\s+[A-Z][a-z]+)/m // First line capitalized words
            ];
            
            for (const pattern of namePatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    info.name = match[1].trim();
                    break;
                }
            }
        }
        
        // Extract common skills mentioned
        const commonSkills = [
            'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'HTML', 'CSS',
            'project management', 'leadership', 'communication', 'teamwork'
        ];
        
        const skillsFound = commonSkills.filter(skill => 
            text.toLowerCase().includes(skill.toLowerCase())
        );
        info.skills = skillsFound;
        
        return info;
    }
    
    generateSummaryFromText(text) {
        // Extract first few sentences as summary if no specific summary found
        const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
        return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '');
    }
    
    extractSoftSkills(text) {
        const softSkills = [
            'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
            'creativity', 'adaptability', 'time management', 'organization'
        ];
        
        return softSkills.filter(skill => 
            text.toLowerCase().includes(skill.toLowerCase())
        );
    }
    
    extractLanguages(text, entities) {
        // Look for language skills in entities first
        const languageEntities = entities.filter(e => e.type === 'SKILL' && this.isLanguageSkill(e.text));
        const languages = languageEntities.map(e => e.text);
        
        // Also check for common language patterns in text
        const commonLanguages = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali'];
        const foundLanguages = commonLanguages.filter(lang => 
            text.toLowerCase().includes(lang.toLowerCase()) && !languages.includes(lang)
        );
        
        return [...languages, ...foundLanguages];
    }
}

// Export classes
if (typeof window !== 'undefined') {
    window.MultilingualNEREngine = MultilingualNEREngine;
    window.CVFieldMapper = CVFieldMapper;
}

// For Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MultilingualNEREngine,
        CVFieldMapper
    };
}
