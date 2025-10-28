/**
 * UI Integration for Ollama Optimization
 * Adds "Optimize for AI" button and displays optimization results
 */

class OllamaUIIntegration {
    constructor(app) {
        this.app = app;
        this.optimizer = window.ollamaOptimizer;
        this.init();
    }

    init() {
        this.injectOptimizeButton();
        this.setupEventListeners();
    }

    /**
     * Inject "Optimize for AI" button after Generate CV button
     */
    injectOptimizeButton() {
        const actionControls = document.getElementById('actionControls');
        if (!actionControls) {
            console.warn('⚠️ Action controls not found');
            return;
        }

        // Create button container if it doesn't exist
        let optimizeContainer = document.getElementById('optimizeButtonContainer');
        if (!optimizeContainer) {
            optimizeContainer = document.createElement('div');
            optimizeContainer.id = 'optimizeButtonContainer';
            optimizeContainer.style.cssText = `
                text-align: center;
                margin-top: 1.5rem;
                padding-top: 1.5rem;
                border-top: 2px solid rgba(99, 102, 241, 0.2);
            `;

            const optimizeButton = document.createElement('button');
            optimizeButton.id = 'optimizeForAIBtn';
            optimizeButton.className = 'btn btn--primary btn-lg';
            optimizeButton.style.cssText = `
                background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
                padding: 1rem 2.5rem;
                font-size: 1.1rem;
            `;
            optimizeButton.innerHTML = `
                <span style="margin-right: 8px;">🤖</span>
                <span>Optimize for AI</span>
            `;

            const helpText = document.createElement('p');
            helpText.style.cssText = `
                color: var(--text-secondary);
                font-size: 0.85rem;
                margin-top: 0.75rem;
                font-style: italic;
            `;
            helpText.textContent = 'Use AI to enhance your resume for better ATS compatibility';

            optimizeContainer.appendChild(optimizeButton);
            optimizeContainer.appendChild(helpText);

            // Insert after generate CV button
            const generateBtn = document.getElementById('generateCVBtn');
            if (generateBtn && generateBtn.parentElement) {
                generateBtn.parentElement.insertAdjacentElement('afterend', optimizeContainer);
            }
        }
    }

    /**
     * Setup event listeners for optimization button
     */
    setupEventListeners() {
        const optimizeBtn = document.getElementById('optimizeForAIBtn');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => this.handleOptimizeClick());
        }

        // Add settings button for Ollama configuration
        this.injectOllamaSettings();
    }

    /**
     * Handle optimize button click
     */
    async handleOptimizeClick() {
        const optimizeBtn = document.getElementById('optimizeForAIBtn');
        if (!optimizeBtn) return;

        try {
            // Disable button during optimization
            optimizeBtn.disabled = true;
            optimizeBtn.innerHTML = `
                <span style="margin-right: 8px;">⏳</span>
                <span>Optimizing...</span>
            `;

            // Get current resume data from app
            const resumeData = this.app.resumeData;
            if (!resumeData || Object.keys(resumeData).length === 0) {
                throw new Error('No resume data found. Please generate your CV first.');
            }

            // Show loading message
            this.app.showStatusMessage('🤖 Connecting to AI optimization service...', 'info');

            // Test connection first
            const connected = await this.optimizer.testConnection();
            if (!connected) {
                throw new Error('Cannot connect to Ollama server. Please check your server configuration.');
            }

            // Perform optimization
            this.app.showStatusMessage('✨ AI is optimizing your resume...', 'info');
            const optimizedContent = await this.optimizer.optimizeResumeContent(resumeData);

            // Display results
            this.displayOptimizationResults(optimizedContent);

            // Success message
            this.app.showStatusMessage(`✅ Resume optimized! ATS Score: ${optimizedContent.atsScore}/100`, 'success');

        } catch (error) {
            console.error('Optimization error:', error);
            this.app.showStatusMessage(`❌ Optimization failed: ${error.message}`, 'error');
        } finally {
            // Re-enable button
            if (optimizeBtn) {
                optimizeBtn.disabled = false;
                optimizeBtn.innerHTML = `
                    <span style="margin-right: 8px;">🤖</span>
                    <span>Optimize for AI</span>
                `;
            }
        }
    }

    /**
     * Display optimization results
     */
    displayOptimizationResults(optimizedContent) {
        // Create or get results container
        let resultsContainer = document.getElementById('optimizationResults');
        if (!resultsContainer) {
            resultsContainer = document.createElement('div');
            resultsContainer.id = 'optimizationResults';
            resultsContainer.style.cssText = `
                margin-top: 2rem;
                padding: 2rem;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
                border: 2px solid rgba(16, 185, 129, 0.3);
                border-radius: 16px;
            `;

            const resumePreview = document.getElementById('resumePreview');
            if (resumePreview) {
                resumePreview.insertAdjacentElement('beforebegin', resultsContainer);
            }
        }

        // Build results HTML
        resultsContainer.innerHTML = `
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <h2 style="color: #10b981; font-size: 1.8rem; margin-bottom: 0.5rem;">
                    🤖 AI-Optimized Resume
                </h2>
                <div style="display: inline-block; padding: 0.5rem 1.5rem; background: #10b981; color: white; border-radius: 20px; font-weight: 600; font-size: 1.1rem;">
                    ATS Score: ${optimizedContent.atsScore}/100
                </div>
            </div>

            <!-- Optimized Summary -->
            <div style="background: #1a1d35; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                <h3 style="color: #f1f5f9; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                    <span>📝</span> Optimized Summary
                </h3>
                <p style="color: #94a3b8; line-height: 1.6;">${optimizedContent.optimizedSummary || 'No changes suggested'}</p>
            </div>

            <!-- Suggestions -->
            ${optimizedContent.suggestions && optimizedContent.suggestions.length > 0 ? `
                <div style="background: #1a1d35; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="color: #f1f5f9; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                        <span>💡</span> AI Suggestions
                    </h3>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        ${optimizedContent.suggestions.map(suggestion => `
                            <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1; border-radius: 6px; color: #94a3b8;">
                                ${suggestion}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            ` : ''}

            <!-- Optimized Skills -->
            ${optimizedContent.optimizedSkills && optimizedContent.optimizedSkills.length > 0 ? `
                <div style="background: #1a1d35; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
                    <h3 style="color: #f1f5f9; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;">
                        <span>🔧</span> Optimized Skills
                    </h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${optimizedContent.optimizedSkills.map(skill => `
                            <span style="padding: 0.5rem 1rem; background: rgba(99, 102, 241, 0.2); color: #6366f1; border-radius: 20px; font-size: 0.9rem;">
                                ${skill}
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Action Buttons -->
            <div style="text-align: center; margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                <button onclick="ollamaUI.applyOptimizations()" class="btn btn--primary">
                    ✅ Apply Optimizations
                </button>
                <button onclick="ollamaUI.discardOptimizations()" class="btn btn--secondary">
                    ❌ Discard Changes
                </button>
            </div>
        `;

        // Store optimized content for later use
        this.lastOptimizedContent = optimizedContent;

        // Scroll to results
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Apply AI optimizations to resume data
     */
    applyOptimizations() {
        if (!this.lastOptimizedContent) {
            this.app.showStatusMessage('No optimizations to apply', 'error');
            return;
        }

        // Update app resume data with optimized content
        // Update professional summary
        if (this.lastOptimizedContent.optimizedSummary) {
            this.app.generatedCVData.professionalSummary = this.lastOptimizedContent.optimizedSummary;
        }
        
        // Update skills - convert array to object format if needed
        if (this.lastOptimizedContent.optimizedSkills && this.lastOptimizedContent.optimizedSkills.length > 0) {
            this.app.generatedCVData.skills = {
                technical: this.lastOptimizedContent.optimizedSkills.filter(s => 
                    ['java', 'python', 'javascript', 'react', 'node', 'angular', 'vue', 'sql', 'mongodb', 
                     'aws', 'docker', 'kubernetes', 'git', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 
                     'swift', 'kotlin', 'rust', 'scala', 'html', 'css', 'sass', 'webpack', 'redux', 'spring',
                     'django', 'flask', 'express', 'graphql', 'rest', 'api', 'microservices', 'ci/cd'].some(tech => 
                        s.toLowerCase().includes(tech)
                    )
                ),
                soft: this.lastOptimizedContent.optimizedSkills.filter(s => 
                    ['leadership', 'communication', 'teamwork', 'problem', 'management', 'collaboration', 
                     'agile', 'scrum', 'analytical', 'creative', 'organizational'].some(soft => 
                        s.toLowerCase().includes(soft)
                    )
                )
            };
            
            // If no technical skills detected, put all in technical
            if (this.app.generatedCVData.skills.technical.length === 0) {
                this.app.generatedCVData.skills.technical = this.lastOptimizedContent.optimizedSkills;
            }
        }
        
        // Update experience if provided
        if (this.lastOptimizedContent.optimizedExperience && this.lastOptimizedContent.optimizedExperience.length > 0) {
            this.app.generatedCVData.workExperience = this.lastOptimizedContent.optimizedExperience.map(exp => ({
                jobTitle: exp.job_title || exp.jobTitle || '',
                company: exp.company || '',
                duration: exp.duration || exp.dateRange || '',
                description: (exp.responsibilities || []).join('. ') + (exp.achievements ? '. ' + exp.achievements.join('. ') : '')
            }));
        }
        
        // Update education if provided
        if (this.lastOptimizedContent.optimizedEducation && this.lastOptimizedContent.optimizedEducation.length > 0) {
            this.app.generatedCVData.education = this.lastOptimizedContent.optimizedEducation.map(edu => ({
                degree: edu.degree || '',
                institution: edu.institution || '',
                year: edu.year || edu.graduationDate || '',
                gpa: edu.gpa || ''
            }));
        }

        this.app.showStatusMessage('✅ Optimizations applied to your resume!', 'success');
        
        // Regenerate preview with updated data
        this.app.showResumePreview(this.app.generatedCVData);
        
        // Remove the optimization results box
        const resultsContainer = document.getElementById('optimizationResults');
        if (resultsContainer) {
            resultsContainer.remove();
        }
    }

    /**
     * Discard AI optimizations
     */
    discardOptimizations() {
        const resultsContainer = document.getElementById('optimizationResults');
        if (resultsContainer) {
            resultsContainer.remove();
        }
        this.lastOptimizedContent = null;
        this.app.showStatusMessage('Optimizations discarded', 'info');
    }

    /**
     * Inject Ollama settings in Settings modal
     */
    injectOllamaSettings() {
        const settingsModal = document.querySelector('#settingsModal .modal-body');
        if (!settingsModal) return;

        let ollamaSection = document.getElementById('ollamaSettingsSection');
        if (ollamaSection) return; // Already injected

        ollamaSection = document.createElement('div');
        ollamaSection.id = 'ollamaSettingsSection';
        ollamaSection.className = 'settings-section';
        ollamaSection.innerHTML = `
            <h3>🤖 Ollama AI Optimization</h3>
            <p class="form-help" style="margin-bottom: 15px;">
                Configure your Ollama server for AI-powered resume optimization
            </p>
            <div class="form-group">
                <label class="form-label">Ollama Server URL</label>
                <input type="text" id="ollamaServerURL" class="form-control" 
                    placeholder="http://192.168.1.100:11434" 
                    value="${this.optimizer.ollamaBaseURL}">
                <small class="form-help">Enter your Ollama server URL (include http://)</small>
            </div>
            <div class="form-group">
                <label class="form-label">Model Name</label>
                <input type="text" id="ollamaModelName" class="form-control" 
                    placeholder="qwen2.5:7b" 
                    value="${this.optimizer.modelName}">
                <small class="form-help">Model name (e.g., qwen2.5:7b, llama2, mistral)</small>
            </div>
            <div class="form-group">
                <button onclick="ollamaUI.saveOllamaSettings()" class="btn btn--primary" style="width: 100%;">
                    💾 Save Settings
                </button>
                <button onclick="ollamaUI.testOllamaConnection()" class="btn btn--outline" style="width: 100%; margin-top: 10px;">
                    🔍 Test Connection
                </button>
            </div>
            <div id="ollamaStatus" style="margin-top: 10px; padding: 10px; border-radius: 8px; display: none;"></div>
        `;

        settingsModal.appendChild(ollamaSection);
    }

    /**
     * Save Ollama settings
     */
    saveOllamaSettings() {
        const serverURL = document.getElementById('ollamaServerURL')?.value;
        const modelName = document.getElementById('ollamaModelName')?.value;

        if (serverURL) {
            this.optimizer.setServerURL(serverURL);
            localStorage.setItem('ollama_server_url', serverURL);
        }
        if (modelName) {
            this.optimizer.setModel(modelName);
            localStorage.setItem('ollama_model_name', modelName);
        }

        this.app.showStatusMessage('✅ Ollama settings saved!', 'success');
    }

    /**
     * Test Ollama connection
     */
    async testOllamaConnection() {
        const statusDiv = document.getElementById('ollamaStatus');
        if (!statusDiv) return;

        statusDiv.style.display = 'block';
        statusDiv.style.background = 'rgba(59, 130, 246, 0.1)';
        statusDiv.style.color = '#3b82f6';
        statusDiv.textContent = '🔍 Testing connection...';

        const connected = await this.optimizer.testConnection();

        if (connected) {
            statusDiv.style.background = 'rgba(16, 185, 129, 0.1)';
            statusDiv.style.color = '#10b981';
            statusDiv.textContent = '✅ Connected to Ollama server!';
        } else {
            statusDiv.style.background = 'rgba(239, 68, 68, 0.1)';
            statusDiv.style.color = '#ef4444';
            statusDiv.textContent = `❌ Connection failed: ${this.optimizer.lastError}`;
        }
    }

    /**
     * Load saved Ollama settings from localStorage
     */
    loadSavedSettings() {
        const savedURL = localStorage.getItem('ollama_server_url');
        const savedModel = localStorage.getItem('ollama_model_name');

        if (savedURL) this.optimizer.setServerURL(savedURL);
        if (savedModel) this.optimizer.setModel(savedModel);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.app && window.ollamaOptimizer) {
        window.ollamaUI = new OllamaUIIntegration(window.app);
        window.ollamaUI.loadSavedSettings();
        console.log('✅ Ollama UI Integration initialized');
    } else {
        console.warn('⚠️ App or Ollama Optimizer not found. Retrying...');
        setTimeout(() => {
            if (window.app && window.ollamaOptimizer) {
                window.ollamaUI = new OllamaUIIntegration(window.app);
                window.ollamaUI.loadSavedSettings();
                console.log('✅ Ollama UI Integration initialized (delayed)');
            }
        }, 1000);
    }
});
