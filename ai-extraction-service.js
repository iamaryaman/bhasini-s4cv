// AI Extraction Service for CV/Resume Data
// Ported from iOS S4CV app's QwenService.swift
// Uses OpenRouter API with Mistral 7B (free tier)

class AIExtractionService {
    constructor() {
        // OpenRouter API configuration (same as iOS app)
        this.apiURL = "https://openrouter.ai/api/v1/chat/completions";
        this.model = "mistralai/mistral-7b-instruct:free"; // Free tier model
        
        // API key should be set via config or environment
        // For demo purposes, can be set directly (NOT recommended for production)
        this.apiKey = null; // Set this via setApiKey() method
        
        this.maxRetries = 2;
        this.timeout = 30000; // 30 seconds
    }
    
    /**
     * Set OpenRouter API key
     * @param {string} key - API key
     */
    setApiKey(key) {
        this.apiKey = key;
    }
    
    /**
     * Check if API is configured
     * @returns {boolean}
     */
    isConfigured() {
        return this.apiKey && this.apiKey.length > 0;
    }
    
    /**
     * Main extraction method
     * Extracts CV data from transcribed text
     * @param {string} text - Transcribed text to analyze
     * @param {string} language - Language code ('hi', 'en', 'mixed')
     * @returns {Promise<Object>} Extracted CV data
     */
    async extractCVData(text, language = 'mixed') {
        if (!this.isConfigured()) {
            throw new Error('AI service not configured. Please set API key first.');
        }
        
        if (!text || text.trim().length === 0) {
            throw new Error('Text is required for extraction');
        }
        
        console.log(`🤖 AI Extraction: Starting for ${language} text (${text.length} chars)`);
        
        try {
            // Build extraction prompt
            const prompt = this.buildExtractionPrompt(text, language);
            
            // Call AI API
            const response = await this.callAIAPI(prompt);
            
            // Parse JSON response
            const parsedData = this.parseJSONResponse(response);
            
            console.log('✅ AI Extraction: Successful');
            console.log(`   Name: ${parsedData.personal_info?.name || 'Not found'}`);
            console.log(`   Skills: ${parsedData.skills?.length || 0} found`);
            console.log(`   Education: ${parsedData.education?.length || 0} entries`);
            console.log(`   Experience: ${parsedData.work_experience?.length || 0} entries`);
            
            return {
                ...parsedData,
                source: 'ai',
                confidence: 0.9,
                model: this.model
            };
        } catch (error) {
            console.error('❌ AI Extraction failed:', error.message);
            throw error;
        }
    }
    
    /**
     * Build extraction prompt for AI model
     * Adapted from QwenService.swift's buildExtractionPrompt()
     * @param {string} text - Input text
     * @param {string} language - Language code
     * @returns {string} Prompt for AI model
     */
    buildExtractionPrompt(text, language) {
        const languageInstructions = {
            'hi': 'The text is primarily in Hindi (Devanagari script). Preserve all Hindi names and text in Devanagari.',
            'en': 'The text is primarily in English.',
            'mixed': 'The text contains mixed Hindi and English. Preserve Hindi names in Devanagari script and English names in Latin script.'
        };
        
        const langInstruction = languageInstructions[language] || languageInstructions['mixed'];
        
        return `You are an expert at extracting structured information from Indian CV/resume content, especially from voice transcriptions.

${langInstruction}

TEXT TO ANALYZE:
${text}

EXTRACTION INSTRUCTIONS:
1. Look for name patterns:
   - Hindi: "मेरा नाम [NAME] है", "मैं [NAME] हूं"
   - English: "I am [NAME]", "My name is [NAME]", "This is [NAME]"
   
2. Extract contact information:
   - Email addresses
   - Phone numbers (Indian: 10 digits starting with 6-9, or +91 prefix)
   - Location (city, state)

3. Extract education:
   - Degrees: BTech, MTech, MBA, BCA, MCA, Bachelor's, Master's, PhD, बी.टेक, एम.टेक
   - Field of study: Computer Science, AI, Data Science, etc.
   - Institutions: IIT, NIT, IIIT, universities, colleges
   - Look for phrases like "पढ़ता हूं", "studying at", "from [institution]"

4. Extract work experience:
   - Job titles: Software Engineer, Developer, Manager, etc.
   - Company names: Google, TCS, Infosys, etc.
   - Duration patterns: "2018 to 2020", "from 2020", "currently working"
   - Look for phrases like "काम करता हूं", "working at", "worked at"

5. Extract skills:
   - Technical skills: Python, Java, React, Node.js, AWS, Machine Learning, etc.
   - Look for phrases like "मेरी स्किल्स", "my skills are", "expertise in", "tech stack"
   - Extract from lists and comma-separated values

6. Handle voice transcription specifics:
   - Names may be spelled phonetically
   - Accept variations in spelling
   - Context matters more than exact matches

7. Preserve language authenticity:
   - Keep Hindi names and words in Devanagari: अगम, प्रिया, विवेकानंद
   - Keep English names in Latin script: John, Sarah, Rahul
   - Don't translate names

Return ONLY this JSON structure (no markdown, no explanation, no code blocks):
{
  "personal_info": {
    "name": "Full name (preserve original script)",
    "email": "email@example.com or null",
    "phone": "phone number or null",
    "location": "city/state or null",
    "linkedin": null,
    "github": null
  },
  "summary": "Brief professional summary if mentioned, otherwise null",
  "work_experience": [
    {
      "job_title": "position",
      "company": "company name",
      "location": null,
      "start_date": "year or month-year",
      "end_date": "year or Present",
      "responsibilities": ["duty 1", "duty 2"]
    }
  ],
  "education": [
    {
      "degree": "BTech/MTech/Bachelor's/etc",
      "field_of_study": "Computer Science, AI, etc",
      "institution": "college/university name",
      "location": null,
      "start_date": "year",
      "end_date": "year",
      "gpa": "if mentioned, otherwise null"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "certifications": []
}

IMPORTANT:
- Use null for any missing information
- Return ONLY the JSON object, nothing else
- No markdown code blocks or formatting
- Extract all information present in the text
- Preserve the original language and script of names and institutions`;
    }
    
    /**
     * Call OpenRouter AI API
     * Adapted from QwenService.swift's callHuggingFaceAPI()
     * @param {string} prompt - Prompt to send
     * @returns {Promise<string>} AI response
     */
    async callAIAPI(prompt) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        try {
            const response = await fetch(this.apiURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': window.location.origin || 'https://s4cv.app',
                    'X-Title': 'S4CV Resume Builder'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { 
                            role: 'user', 
                            content: prompt 
                        }
                    ],
                    temperature: 0.1,  // Low temperature for more consistent extraction
                    max_tokens: 2000
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`AI API Error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
            }
            
            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid response format from AI API');
            }
            
            return data.choices[0].message.content;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('AI API request timed out');
            }
            
            throw error;
        }
    }
    
    /**
     * Parse JSON response from AI model
     * Handles markdown code blocks and extracts JSON
     * Adapted from QwenService.swift's parseJSONResponse()
     * @param {string} response - Raw AI response
     * @returns {Object} Parsed JSON object
     */
    parseJSONResponse(response) {
        if (!response || response.trim().length === 0) {
            throw new Error('Empty response from AI');
        }
        
        // Clean response - remove markdown code blocks if present
        let cleanedResponse = response
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();
        
        // Extract JSON if there's extra text
        const jsonStart = cleanedResponse.indexOf('{');
        if (jsonStart !== -1) {
            cleanedResponse = cleanedResponse.substring(jsonStart);
            
            // Find matching closing brace
            let braceCount = 0;
            let jsonEnd = -1;
            
            for (let i = 0; i < cleanedResponse.length; i++) {
                if (cleanedResponse[i] === '{') braceCount++;
                if (cleanedResponse[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        jsonEnd = i;
                        break;
                    }
                }
            }
            
            if (jsonEnd !== -1) {
                cleanedResponse = cleanedResponse.substring(0, jsonEnd + 1);
            }
        } else {
            throw new Error('No JSON object found in AI response');
        }
        
        try {
            const parsed = JSON.parse(cleanedResponse);
            
            // Validate structure
            if (!parsed.personal_info) {
                parsed.personal_info = {};
            }
            if (!parsed.skills) {
                parsed.skills = [];
            }
            if (!parsed.education) {
                parsed.education = [];
            }
            if (!parsed.work_experience) {
                parsed.work_experience = [];
            }
            
            return parsed;
        } catch (error) {
            console.error('JSON parsing error:', error);
            console.error('Attempted to parse:', cleanedResponse.substring(0, 500));
            throw new Error('Failed to parse AI response as JSON');
        }
    }
    
    /**
     * Test API connection
     * @returns {Promise<Object>} Test result
     */
    async testConnection() {
        const testText = "My name is Test User. Email: test@example.com. I am a software engineer with skills in JavaScript and Python.";
        
        try {
            const result = await this.extractCVData(testText, 'en');
            return {
                success: true,
                message: 'AI service is working correctly',
                testResult: result
            };
        } catch (error) {
            return {
                success: false,
                message: 'AI service connection failed',
                error: error.message
            };
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIExtractionService;
}
