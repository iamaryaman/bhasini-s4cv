// Integration Layer: NER to Resume Visualization
// Connects the NER processing pipeline with the resume visualization component

class NERResumeIntegration {
    constructor() {
        // Initialize components
        this.nerUI = null;
        this.resumeViz = null;
        this.bhashiniService = null;
        
        // State management
        this.processingState = {
            nerCompleted: false,
            entitiesValidated: false,
            cvGenerated: false
        };
        
        this.extractedData = {
            rawText: '',
            entities: [],
            cvData: null
        };
    }
    
    /**
     * Initialize the integration with existing components
     * @param {Object} components - Object containing initialized components
     */
    initialize(components) {
        const { 
            nerVisualizationUI, 
            resumeVisualization, 
            bhashiniNERService 
        } = components;
        
        this.nerUI = nerVisualizationUI;
        this.resumeViz = resumeVisualization;
        this.bhashiniService = bhashiniNERService;
        
        // Set up callbacks
        this.setupNERCallbacks();
        this.setupResumeCallbacks();
        this.setupServiceCallbacks();
        
        console.log('NER-Resume integration initialized');
    }
    
    /**
     * Setup NER UI callbacks
     */
    setupNERCallbacks() {
        if (!this.nerUI) return;
        
        this.nerUI.setCallbacks({
            onValidationComplete: (data) => {
                console.log('NER validation complete:', data);
                this.handleNERValidationComplete(data);
            },
            onEntityValidated: (entity, index) => {
                console.log('Entity validated:', entity);
                this.updateResumePreview();
            },
            onEntityEdited: (entity, index, changes) => {
                console.log('Entity edited:', changes);
                this.updateResumePreview();
            }
        });
    }
    
    /**
     * Setup Resume visualization callbacks
     */
    setupResumeCallbacks() {
        if (!this.resumeViz) return;
        
        this.resumeViz.setCallbacks({
            onEdit: (cvData) => {
                console.log('Resume edited:', cvData);
                this.extractedData.cvData = cvData;
            },
            onComplete: (data) => {
                console.log('Resume finalized:', data);
                this.processingState.cvGenerated = true;
            }
        });
    }
    
    /**
     * Setup Bhashini service callbacks
     */
    setupServiceCallbacks() {
        if (!this.bhashiniService) return;
        
        this.bhashiniService.setHandlers({
            onEntityExtracted: (data) => {
                console.log('Entities extracted:', data);
                this.handleEntitiesExtracted(data);
            },
            onCVUpdated: (cvData) => {
                console.log('CV data updated:', cvData);
                this.handleCVDataUpdated(cvData);
            }
        });
    }
    
    /**
     * Handle entities extracted from NER
     * @param {Object} data - Extracted entities data
     */
    handleEntitiesExtracted(data) {
        const { entities, language } = data;
        
        // Store extracted entities
        this.extractedData.entities = entities;
        
        // Display in NER UI for validation
        if (this.nerUI) {
            this.nerUI.displayEntities(
                entities, 
                this.extractedData.rawText
            );
        }
        
        this.processingState.nerCompleted = true;
        
        // Show notification
        this.showNotification(
            `Extracted ${entities.length} entities. Please review and validate.`,
            'info'
        );
    }
    
    /**
     * Handle CV data updates from NER service
     * @param {Object} cvData - Structured CV data
     */
    handleCVDataUpdated(cvData) {
        this.extractedData.cvData = cvData;
        
        // Auto-display resume preview if validation is complete
        if (this.processingState.entitiesValidated) {
            this.displayResumePreview(cvData);
        }
    }
    
    /**
     * Handle NER validation completion
     * @param {Object} data - Validation results
     */
    handleNERValidationComplete(data) {
        const { validated, rejected, stats } = data;
        
        this.processingState.entitiesValidated = true;
        
        console.log('Validation stats:', stats);
        
        // Generate CV from validated entities
        if (validated.length > 0) {
            this.generateResumeFromValidated(validated);
        } else {
            this.showNotification(
                'No entities validated. Cannot generate resume.',
                'warning'
            );
        }
    }
    
    /**
     * Generate resume from validated entities
     * @param {Array} validatedEntities - Array of validated entities
     */
    generateResumeFromValidated(validatedEntities) {
        // Use CV mapper to create structure
        if (this.bhashiniService && this.bhashiniService.cvMapper) {
            const cvData = this.bhashiniService.cvMapper.createCVStructure(
                validatedEntities,
                this.extractedData.rawText
            );
            
            this.extractedData.cvData = cvData;
            this.displayResumePreview(cvData);
        } else {
            // Fallback: create basic structure
            const cvData = this.createBasicCVStructure(validatedEntities);
            this.extractedData.cvData = cvData;
            this.displayResumePreview(cvData);
        }
    }
    
    /**
     * Display resume preview
     * @param {Object} cvData - CV data structure
     */
    displayResumePreview(cvData) {
        if (!this.resumeViz) {
            console.error('Resume visualization component not initialized');
            return;
        }
        
        // Display the resume
        this.resumeViz.displayResume(cvData, this.extractedData.entities);
        
        // Scroll to resume preview
        this.scrollToResumePreview();
        
        this.showNotification(
            'Resume generated successfully! Review and download.',
            'success'
        );
        
        this.processingState.cvGenerated = true;
    }
    
    /**
     * Update resume preview in real-time
     */
    updateResumePreview() {
        if (!this.processingState.entitiesValidated) return;
        
        // Get current validated entities from NER UI
        const validatedEntities = this.nerUI.validatedEntities;
        
        if (validatedEntities.length > 0) {
            this.generateResumeFromValidated(validatedEntities);
        }
    }
    
    /**
     * Create basic CV structure from entities (fallback)
     * @param {Array} entities - Array of entities
     * @returns {Object} Basic CV structure
     */
    createBasicCVStructure(entities) {
        const cvData = {
            contact: {
                name: { text: '', confidence: 0 },
                email: { text: '', confidence: 0 },
                phone: { text: '', confidence: 0 },
                address: { text: '', confidence: 0 },
                linkedin: { text: '', confidence: 0 },
                github: { text: '', confidence: 0 }
            },
            professional: {
                summary: '',
                skills: {
                    technical: [],
                    soft: [],
                    languages: []
                },
                experience: [],
                languages: []
            },
            education: {
                degrees: [],
                certifications: []
            }
        };
        
        // Map entities to CV structure
        entities.forEach(entity => {
            const entityText = entity.text;
            
            switch (entity.type) {
                case 'PERSON':
                    if (!cvData.contact.name.text) {
                        cvData.contact.name = {
                            text: entityText,
                            confidence: entity.confidence
                        };
                    }
                    break;
                    
                case 'CONTACT':
                    // Try to determine contact type
                    if (entityText.includes('@')) {
                        cvData.contact.email = {
                            text: entityText,
                            confidence: entity.confidence
                        };
                    } else if (/\d{10}|\+\d{11,}/.test(entityText)) {
                        cvData.contact.phone = {
                            text: entityText,
                            confidence: entity.confidence
                        };
                    }
                    break;
                    
                case 'LOCATION':
                    if (!cvData.contact.address.text) {
                        cvData.contact.address = {
                            text: entityText,
                            confidence: entity.confidence
                        };
                    }
                    break;
                    
                case 'SKILL':
                    cvData.professional.skills.technical.push(entityText);
                    break;
                    
                case 'ORGANIZATION':
                    // Add as experience company
                    cvData.professional.experience.push({
                        company: entityText,
                        position: '',
                        startDate: '',
                        endDate: '',
                        description: '',
                        achievements: []
                    });
                    break;
                    
                case 'EDUCATION':
                    // Add as education degree
                    cvData.education.degrees.push({
                        degree: entityText,
                        institution: '',
                        field: '',
                        graduationDate: '',
                        gpa: '',
                        honors: []
                    });
                    break;
            }
        });
        
        return cvData;
    }
    
    /**
     * Process text input (for text mode)
     * @param {string} text - Input text
     */
    async processTextInput(text) {
        this.extractedData.rawText = text;
        
        if (this.bhashiniService) {
            try {
                // Extract entities manually
                const result = await this.bhashiniService.extractEntitiesManual(text);
                this.handleEntitiesExtracted({
                    entities: result.entities,
                    language: result.language
                });
                this.handleCVDataUpdated(result.cvData);
            } catch (error) {
                console.error('Error processing text:', error);
                this.showNotification(
                    'Failed to process text. Please try again.',
                    'error'
                );
            }
        }
    }
    
    /**
     * Process voice input (for speech mode)
     */
    startVoiceProcessing() {
        if (!this.bhashiniService) {
            this.showNotification(
                'Bhashini service not initialized',
                'error'
            );
            return;
        }
        
        // Voice processing is handled by the service
        // Entities will be extracted automatically via callbacks
        console.log('Voice processing started');
    }
    
    /**
     * Reset all processing
     */
    resetProcessing() {
        // Reset state
        this.processingState = {
            nerCompleted: false,
            entitiesValidated: false,
            cvGenerated: false
        };
        
        this.extractedData = {
            rawText: '',
            entities: [],
            cvData: null
        };
        
        // Clear UI components
        if (this.nerUI) {
            this.nerUI.clear();
        }
        
        if (this.resumeViz) {
            this.resumeViz.resetResume();
        }
        
        console.log('Processing reset');
    }
    
    /**
     * Get current processing status
     * @returns {Object} Processing status
     */
    getStatus() {
        return {
            ...this.processingState,
            hasEntities: this.extractedData.entities.length > 0,
            hasCVData: !!this.extractedData.cvData
        };
    }
    
    /**
     * Export complete resume data
     * @returns {Object} Complete data package
     */
    exportData() {
        return {
            rawText: this.extractedData.rawText,
            entities: this.extractedData.entities,
            cvData: this.extractedData.cvData,
            status: this.processingState,
            exportDate: new Date().toISOString()
        };
    }
    
    /**
     * Scroll to resume preview section
     */
    scrollToResumePreview() {
        if (this.resumeViz && this.resumeViz.container) {
            this.resumeViz.container.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
    
    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `integration-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }
    
    /**
     * Get notification icon based on type
     * @param {string} type - Notification type
     * @returns {string} Icon
     */
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }
    
    /**
     * Add notification styles
     */
    static addStyles() {
        if (document.getElementById('ner-resume-integration-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ner-resume-integration-styles';
        style.textContent = `
            .integration-notification {
                position: fixed;
                top: 80px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                padding: 1rem 1.5rem;
                min-width: 300px;
                max-width: 400px;
                transform: translateX(450px);
                transition: transform 0.3s ease;
                z-index: 10001;
            }
            
            .integration-notification.show {
                transform: translateX(0);
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            
            .notification-icon {
                font-size: 1.5rem;
                flex-shrink: 0;
            }
            
            .notification-message {
                color: #333;
                font-size: 0.95rem;
                line-height: 1.4;
            }
            
            .integration-notification.success {
                border-left: 4px solid #10b981;
            }
            
            .integration-notification.error {
                border-left: 4px solid #ef4444;
            }
            
            .integration-notification.warning {
                border-left: 4px solid #f59e0b;
            }
            
            .integration-notification.info {
                border-left: 4px solid #3b82f6;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Initialize styles when loaded
if (typeof window !== 'undefined') {
    window.NERResumeIntegration = NERResumeIntegration;
    NERResumeIntegration.addStyles();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NERResumeIntegration;
}
