/**
 * Ollama AI Optimization Service
 * Provides resume optimization using Ollama LLM running on remote server
 */

class OllamaOptimizationService {
    constructor() {
        // Configure your Ollama server URL here
        this.ollamaBaseURL = 'http://YOUR_SERVER_IP:11434'; // Replace with your Ollama server URL
        this.modelName = 'qwen2.5:7b'; // Or your preferred model
        this.isOptimizing = false;
        this.lastError = null;
    }

    /**
     * Set custom Ollama server URL
     * @param {string} url - Ollama server URL (e.g., 'http://192.168.1.100:11434')
     */
    setServerURL(url) {
        this.ollamaBaseURL = url;
        console.log(`🔧 Ollama server URL updated: ${url}`);
    }

    /**
     * Set custom model name
     * @param {string} modelName - Model name (e.g., 'qwen2.5:7b', 'llama2', 'mistral')
     */
    setModel(modelName) {
        this.modelName = modelName;
        console.log(`🤖 Ollama model updated: ${modelName}`);
    }

    /**
     * Test connection to Ollama server
     * @returns {Promise<boolean>} - Connection status
     */
    async testConnection() {
        try {
            // Normalize URL - remove trailing slash if present
            const baseURL = this.ollamaBaseURL.replace(/\/$/, '');
            
            const response = await fetch(`${baseURL}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                redirect: 'follow' // Follow redirects automatically
            });

            if (response.ok) {
                console.log('✅ Ollama server is reachable');
                this.lastError = null;
                return true;
            } else if (response.status === 301 || response.status === 302) {
                // Handle redirect
                const redirectURL = response.headers.get('Location');
                console.warn('⚠️ Server redirected to:', redirectURL);
                console.warn('Update your server URL to:', redirectURL.replace('/api/tags', ''));
                this.lastError = `Server redirected (301). Check URL format.`;
                return false;
            } else {
                this.lastError = `HTTP ${response.status}`;
                console.error('❌ Ollama server returned error:', response.status);
                return false;
            }
        } catch (error) {
            this.lastError = error.message;
            console.error('❌ Ollama connection failed:', error);
            return false;
        }
    }

    /**
     * Optimize resume content using Ollama AI
     * @param {Object} resumeData - Parsed resume data from speech/text input
     * @returns {Promise<Object>} - Optimized resume content with suggestions
     */
    async optimizeResumeContent(resumeData) {
        this.isOptimizing = true;
        this.lastError = null;

        try {
            // DEBUG: Log the resume data being sent
            console.log('🔍 Resume data being sent to Ollama:', JSON.stringify(resumeData, null, 2));
            
            // Build comprehensive prompt for optimization
            const prompt = this.buildOptimizationPrompt(resumeData);
            
            // DEBUG: Log a preview of the prompt
            console.log('📝 Prompt preview (first 500 chars):', prompt.substring(0, 500));

            // Prepare request body for Ollama API
            const requestBody = {
                model: this.modelName,
                prompt: prompt,
                stream: false,
                format: 'json',
                options: {
                    temperature: 0.3,
                    top_p: 0.9,
                    num_predict: 2000
                }
            };

            console.log('🚀 Sending optimization request to Ollama...');
            
            // Normalize URL - remove trailing slash if present
            const baseURL = this.ollamaBaseURL.replace(/\/$/, '');

            // POST request to Ollama
            const response = await fetch(`${baseURL}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                redirect: 'follow' // Follow redirects automatically
            });

            if (!response.ok) {
                if (response.status === 301 || response.status === 302) {
                    const redirectURL = response.headers.get('Location');
                    throw new Error(`Server redirected (${response.status}). Your server URL might be incorrect. Redirect to: ${redirectURL}`);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Ollama responded successfully');

            // Parse the JSON response from Ollama
            const optimizedContent = this.parseOptimizedResponse(data.response);

            this.isOptimizing = false;
            return optimizedContent;

        } catch (error) {
            this.isOptimizing = false;
            this.lastError = error.message;
            console.error('❌ Optimization failed:', error);
            throw error;
        }
    }

    /**
     * Build optimization prompt for Ollama
     * @private
     */
    buildOptimizationPrompt(resumeData) {
        // Extract resume data fields - FIXED: Handle BOTH data structures (AI extraction vs NER)
        // AI extraction uses: contact.name
        // Manual NER uses: personalInfo.fullName
        const name = resumeData.contact?.name || resumeData.personalInfo?.fullName || resumeData.contact?.fullName || '';
        const email = resumeData.contact?.email || resumeData.personalInfo?.email || '';
        const phone = resumeData.contact?.phone || resumeData.personalInfo?.phone || '';
        const location = resumeData.contact?.location || resumeData.personalInfo?.location || resumeData.personalInfo?.address || resumeData.contact?.address || '';
        const summary = resumeData.summary || resumeData.professionalSummary || '';
        // Handle both field names: experience vs workExperience
        const experience = JSON.stringify(resumeData.experience || resumeData.workExperience || []);
        const education = JSON.stringify(resumeData.education || []);
        const skills = JSON.stringify(resumeData.skills || []);

        // DEBUG: Log extracted fields
        console.log('🔍 Extracted fields for prompt:');
        console.log('  Name:', name || '(empty)');
        console.log('  Email:', email || '(empty)');
        console.log('  Location:', location || '(empty)');
        console.log('  Summary length:', summary.length, 'chars');
        console.log('  Experience items:', (resumeData.experience || resumeData.workExperience || []).length);
        console.log('  Education items:', (resumeData.education || []).length);
        console.log('  Skills:', skills !== '[]' ? 'present' : 'empty');

        return `You are an expert resume optimization AI that improves resumes for Applicant Tracking Systems (ATS) and readability.

Given the following resume data, optimize it by:
1. EXPAND ANY SMALL CONTENTS that are insufficient for the given section.
2. Improving clarity and conciseness
3. Adding strong action verbs
4. Quantifying achievements where possible
5. Highlighting key skills and accomplishments
6. Fixing grammar and spelling
7. Improving keyword density for relevant skills

Input Resume Data:
{
  "name": "${name}",
  "email": "${email}",
  "phone": "${phone}",
  "location": "${location}",
  "summary": "${summary}",
  "experience": ${experience},
  "education": ${education},
  "skills": ${skills}
}

Return optimized resume in this exact JSON format:
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "optimized_summary": "",
  "optimized_experience": [
    {
      "job_title": "",
      "company": "",
      "location": "",
      "duration": "",
      "responsibilities": [""],
      "achievements": [""]
    }
  ],
  "optimized_education": [
    {
      "degree": "",
      "institution": "",
      "location": "",
      "year": "",
      "gpa": ""
    }
  ],
  "optimized_skills": [],
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"
  ],
  "ats_score": 85
}

IMPORTANT: Return ONLY valid JSON, no explanation.`;
    }

    /**
     * Parse Ollama's response and extract optimized content
     * @private
     */
    parseOptimizedResponse(responseText) {
        try {
            const json = JSON.parse(responseText);

            return {
                name: json.name || '',
                email: json.email || '',
                phone: json.phone || '',
                location: json.location || '',
                optimizedSummary: json.optimized_summary || '',
                optimizedExperience: json.optimized_experience || [],
                optimizedEducation: json.optimized_education || [],
                optimizedSkills: json.optimized_skills || [],
                suggestions: json.suggestions || [],
                atsScore: json.ats_score || 0
            };
        } catch (error) {
            console.error('❌ Failed to parse Ollama response:', error);
            throw new Error('Invalid JSON response from Ollama');
        }
    }

    /**
     * Get current optimization status
     * @returns {Object} - Status object with isOptimizing and lastError
     */
    getStatus() {
        return {
            isOptimizing: this.isOptimizing,
            lastError: this.lastError,
            serverURL: this.ollamaBaseURL,
            modelName: this.modelName
        };
    }
}

// Initialize global instance
window.ollamaOptimizer = new OllamaOptimizationService();

console.log('✅ Ollama Optimization Service loaded');
