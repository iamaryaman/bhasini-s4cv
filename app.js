// Application State
class VoiceCVApp {
    constructor() {
        this.currentScreen = 'welcomeScreen';
        this.accessibilityMode = 'normal';
        this.selectedTemplate = null;
        this.currentSection = 0;
        this.isRecording = false;
        this.recognition = null;
        this.resumeData = {
            contact: {},
            summary: '',
            experience: [],
            education: [],
            skills: {}
        };
        this.currentLanguage = 'en-US';
        this.user = null;
        this.uploadedDocuments = [];

        this.sections = [
            { id: 'contact', name: 'Contact Information', description: 'Provide your basic contact details' },
            { id: 'summary', name: 'Professional Summary', description: 'Describe your professional background and goals' },
            { id: 'experience', name: 'Work Experience', description: 'Tell us about your work history' },
            { id: 'education', name: 'Education', description: 'Share your educational background' },
            { id: 'skills', name: 'Skills', description: 'List your technical and soft skills' }
        ];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeSpeechRecognition();
        this.loadUserPreferences();
        this.setupAccessibility();
    }

    setupEventListeners() {
        // Welcome screen - accessibility mode selection
        document.querySelectorAll('.accessibility-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectAccessibilityMode(e.target.closest('.accessibility-btn').dataset.mode);
            });
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectAccessibilityMode(e.target.closest('.accessibility-btn').dataset.mode);
                }
            });
        });

        // Auth forms
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');
        
        if (signinForm) {
            signinForm.addEventListener('submit', (e) => this.handleSignIn(e));
        }
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignUp(e));
        }
        
        // Auth tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthTab(e.target.dataset.tab);
            });
        });

        // Template selection
        document.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTemplate(e.currentTarget.dataset.template);
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectTemplate(e.currentTarget.dataset.template);
                }
            });
        });

        const continueBtn = document.getElementById('continueWithTemplate');
        if (continueBtn) {
            continueBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Continue button clicked, selected template:', this.selectedTemplate);
                if (this.selectedTemplate) {
                    this.startVoiceInput();
                } else {
                    this.showStatusMessage('Please select a template first', 'error');
                }
            });
        }

        // Voice input controls
        const recordBtn = document.getElementById('recordBtn');
        const clearBtn = document.getElementById('clearBtn');
        const confirmBtn = document.getElementById('confirmSectionBtn');
        const nextBtn = document.getElementById('nextSectionBtn');
        const prevBtn = document.getElementById('prevSectionBtn');

        if (recordBtn) recordBtn.addEventListener('click', (e) => { e.preventDefault(); this.toggleRecording(); });
        if (clearBtn) clearBtn.addEventListener('click', (e) => { e.preventDefault(); this.clearTranscription(); });
        if (confirmBtn) confirmBtn.addEventListener('click', (e) => { e.preventDefault(); this.confirmSection(); });
        if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); this.nextSection(); });
        if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); this.previousSection(); });

        // Input method selection
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchInputMethod(e.target.dataset.method);
            });
        });

        // Review screen
        const editModeBtn = document.getElementById('editModeBtn');
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        const exportWordBtn = document.getElementById('exportWordBtn');

        if (editModeBtn) editModeBtn.addEventListener('click', (e) => { e.preventDefault(); this.showScreen('voiceScreen'); });
        if (exportPdfBtn) exportPdfBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportResume('pdf'); });
        if (exportWordBtn) exportWordBtn.addEventListener('click', (e) => { e.preventDefault(); this.exportResume('word'); });

        // Document upload
        const documentUpload = document.getElementById('documentUpload');
        if (documentUpload) {
            documentUpload.addEventListener('change', (e) => this.handleDocumentUpload(e));
        }

        // Settings and language
        const settingsBtn = document.getElementById('settingsBtn');
        const languageBtn = document.getElementById('languageBtn');

        if (settingsBtn) settingsBtn.addEventListener('click', (e) => { e.preventDefault(); this.showModal('settingsModal'); });
        if (languageBtn) languageBtn.addEventListener('click', (e) => { e.preventDefault(); this.showModal('languageModal'); });

        // Modal controls
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(e.target.closest('.modal'));
            });
        });

        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // Settings form
        const accessibilityModeSelect = document.getElementById('accessibilityMode');
        const highContrastCheck = document.getElementById('highContrast');
        const voiceLanguageSelect = document.getElementById('voiceLanguage');
        const logoutBtn = document.getElementById('logoutBtn');

        if (accessibilityModeSelect) accessibilityModeSelect.addEventListener('change', (e) => this.changeAccessibilityMode(e.target.value));
        if (highContrastCheck) highContrastCheck.addEventListener('change', (e) => this.toggleHighContrast(e.target.checked));
        if (voiceLanguageSelect) voiceLanguageSelect.addEventListener('change', (e) => this.changeVoiceLanguage(e.target.value));
        if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); this.logout(); });

        // Language selection
        document.querySelectorAll('.language-option').forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectLanguage(e.currentTarget.dataset.lang);
            });
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboardNavigation(e));

        // Fix input field focus issues
        this.setupInputFieldFixes();
    }

    setupInputFieldFixes() {
        // Ensure all input fields are properly clickable and focusable
        const inputs = document.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            // Remove any potential pointer-events: none
            input.style.pointerEvents = 'auto';
            
            // Add click handler to ensure focus
            input.addEventListener('click', function() {
                this.focus();
            });
            
            // Add mouse down handler as backup
            input.addEventListener('mousedown', function(e) {
                e.preventDefault();
                this.focus();
            });
        });
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = this.currentLanguage;

            this.recognition.onstart = () => {
                this.updateVoiceStatus('Listening... Speak now');
                const recordBtn = document.getElementById('recordBtn');
                if (recordBtn) recordBtn.classList.add('recording');
                this.announceToScreenReader('Recording started. Please speak now.');
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                const transcriptionArea = document.getElementById('transcription');
                if (transcriptionArea) {
                    const currentText = transcriptionArea.value;
                    transcriptionArea.value = currentText + finalTranscript;
                }
                
                if (interimTranscript) {
                    this.updateVoiceStatus(`Hearing: "${interimTranscript}"`);
                }
            };

            this.recognition.onerror = (event) => {
                this.showStatusMessage(`Speech recognition error: ${event.error}`, 'error');
                this.stopRecording();
            };

            this.recognition.onend = () => {
                this.stopRecording();
            };
        } else {
            this.showStatusMessage('Speech recognition not supported in this browser', 'info');
        }
    }

    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('voicecv-preferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.accessibilityMode = prefs.accessibilityMode || 'normal';
                this.currentLanguage = prefs.language || 'en-US';
                
                if (prefs.highContrast) {
                    document.body.classList.add('high-contrast');
                    const highContrastCheck = document.getElementById('highContrast');
                    if (highContrastCheck) highContrastCheck.checked = true;
                }
            }
        } catch (e) {
            console.log('Error loading preferences:', e);
        }
    }

    saveUserPreferences() {
        try {
            const prefs = {
                accessibilityMode: this.accessibilityMode,
                language: this.currentLanguage,
                highContrast: document.body.classList.contains('high-contrast')
            };
            localStorage.setItem('voicecv-preferences', JSON.stringify(prefs));
        } catch (e) {
            console.log('Error saving preferences:', e);
        }
    }

    setupAccessibility() {
        // Set up ARIA live regions
        const statusContainer = document.getElementById('statusMessages');
        if (statusContainer) {
            statusContainer.setAttribute('aria-live', 'polite');
            statusContainer.setAttribute('aria-atomic', 'true');
        }

        // Setup keyboard navigation for custom elements
        this.setupKeyboardNavigation();
    }

    setupKeyboardNavigation() {
        // Template cards keyboard navigation
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach((card, index) => {
            card.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowRight' && index < templateCards.length - 1) {
                    templateCards[index + 1].focus();
                } else if (e.key === 'ArrowLeft' && index > 0) {
                    templateCards[index - 1].focus();
                }
            });
        });

        // Accessibility buttons keyboard navigation
        const accessibilityBtns = document.querySelectorAll('.accessibility-btn');
        accessibilityBtns.forEach((btn, index) => {
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' && index < accessibilityBtns.length - 1) {
                    accessibilityBtns[index + 1].focus();
                } else if (e.key === 'ArrowUp' && index > 0) {
                    accessibilityBtns[index - 1].focus();
                }
            });
        });
    }

    handleKeyboardNavigation(e) {
        // Global keyboard shortcuts
        if (e.altKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.showModal('settingsModal');
                    break;
                case 'l':
                    e.preventDefault();
                    this.showModal('languageModal');
                    break;
                case 'r':
                    e.preventDefault();
                    if (this.currentScreen === 'voiceScreen') {
                        this.toggleRecording();
                    }
                    break;
            }
        }

        // Escape key to close modals
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal:not(.hidden)');
            if (openModal) {
                this.closeModal(openModal);
            }
        }
    }

    selectAccessibilityMode(mode) {
        console.log('Selecting accessibility mode:', mode);
        this.accessibilityMode = mode;
        
        // Update UI
        document.querySelectorAll('.accessibility-btn').forEach(btn => {
            btn.classList.remove('selected');
            btn.setAttribute('aria-checked', 'false');
        });
        
        const selectedBtn = document.querySelector(`[data-mode="${mode}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
            selectedBtn.setAttribute('aria-checked', 'true');

            // Apply accessibility-specific settings
            this.applyAccessibilityMode(mode);
            
            // Announce selection to screen readers
            const modeName = selectedBtn.querySelector('.mode-name');
            if (modeName) {
                this.announceToScreenReader(`${modeName.textContent} mode selected`);
            }
            
            // Show success message and proceed
            this.showStatusMessage(`${mode} mode selected`, 'success');
            
            // Auto-proceed after selection
            setTimeout(() => {
                this.showScreen('authScreen');
            }, 1000);
        }
    }

    applyAccessibilityMode(mode) {
        document.body.setAttribute('data-accessibility-mode', mode);
        
        switch (mode) {
            case 'blind':
                // Enhanced screen reader support
                this.enableTextToSpeech();
                // Auto-focus management
                this.enableAutoFocus();
                break;
            case 'deaf':
                // Visual feedback enhancements
                this.enableVisualFeedback();
                // Disable audio features
                this.disableAudioFeatures();
                break;
            case 'normal':
            default:
                // Standard functionality
                break;
        }
    }

    enableTextToSpeech() {
        if ('speechSynthesis' in window) {
            this.speak = (text) => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = this.currentLanguage;
                speechSynthesis.speak(utterance);
            };
        }
    }

    enableAutoFocus() {
        // Automatically focus the first interactive element when screens change
        this.autoFocusEnabled = true;
    }

    enableVisualFeedback() {
        // Add visual indicators for audio feedback
        document.body.classList.add('visual-feedback-mode');
    }

    disableAudioFeatures() {
        // Disable speech recognition for deaf mode
        this.speechDisabled = true;
        
        // Hide voice input method
        const voiceMethodBtn = document.querySelector('[data-method="voice"]');
        if (voiceMethodBtn) {
            voiceMethodBtn.style.display = 'none';
            // Auto-select text method
            this.switchInputMethod('text');
        }
    }

    switchAuthTab(tab) {
        console.log('Switching auth tab to:', tab);
        
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        
        // Update form visibility - properly hide/show forms
        const signinForm = document.getElementById('signin-form');
        const signupForm = document.getElementById('signup-form');
        
        if (tab === 'signin') {
            if (signinForm) {
                signinForm.classList.add('active');
                signinForm.style.display = 'block';
            }
            if (signupForm) {
                signupForm.classList.remove('active');
                signupForm.style.display = 'none';
            }
        } else if (tab === 'signup') {
            if (signupForm) {
                signupForm.classList.add('active');
                signupForm.style.display = 'block';
            }
            if (signinForm) {
                signinForm.classList.remove('active');
                signinForm.style.display = 'none';
            }
        }
        
        // Activate selected tab
        const selectedTab = document.querySelector(`[data-tab="${tab}"]`);
        if (selectedTab) {
            selectedTab.classList.add('active');
            selectedTab.setAttribute('aria-selected', 'true');
        }
        
        // Focus first input in the active form
        const activeForm = document.querySelector('.auth-form.active');
        if (activeForm) {
            const firstInput = activeForm.querySelector('input');
            if (firstInput) {
                setTimeout(() => {
                    firstInput.focus();
                    firstInput.click(); // Ensure it's clickable
                }, 100);
            }
        }
        
        // Fix input fields in the new form
        setTimeout(() => {
            this.setupInputFieldFixes();
        }, 100);
    }

    handleSignIn(e) {
        e.preventDefault();
        console.log('Handling sign in');
        
        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value.trim();

        // Basic validation
        if (!email || !password) {
            this.showStatusMessage('Please fill in all fields', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showStatusMessage('Please enter a valid email address', 'error');
            return;
        }

        // Simulate authentication
        this.showLoadingOverlay(true);
        
        setTimeout(() => {
            this.user = { email, name: email.split('@')[0] };
            this.showLoadingOverlay(false);
            this.showStatusMessage('Successfully signed in!', 'success');
            this.announceToScreenReader('Sign in successful. Moving to template selection.');
            this.showScreen('templateScreen');
        }, 1500);
    }

    handleSignUp(e) {
        e.preventDefault();
        console.log('Handling sign up');
        
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value.trim();

        // Basic validation
        if (!name || !email || !password) {
            this.showStatusMessage('Please fill in all fields', 'error');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showStatusMessage('Please enter a valid email address', 'error');
            return;
        }

        if (password.length < 6) {
            this.showStatusMessage('Password must be at least 6 characters long', 'error');
            return;
        }

        // Simulate account creation
        this.showLoadingOverlay(true);
        
        setTimeout(() => {
            this.user = { email, name };
            this.showLoadingOverlay(false);
            this.showStatusMessage('Account created successfully!', 'success');
            this.announceToScreenReader('Account created successfully. Moving to template selection.');
            this.showScreen('templateScreen');
        }, 1500);
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    selectTemplate(templateId) {
        console.log('Selecting template:', templateId);
        this.selectedTemplate = templateId;
        
        // Update UI
        document.querySelectorAll('.template-card').forEach(card => {
            card.setAttribute('aria-checked', 'false');
            card.classList.remove('selected');
        });
        
        const selectedCard = document.querySelector(`[data-template="${templateId}"]`);
        if (selectedCard) {
            selectedCard.setAttribute('aria-checked', 'true');
            selectedCard.classList.add('selected');
            
            const continueBtn = document.getElementById('continueWithTemplate');
            if (continueBtn) {
                continueBtn.disabled = false;
                continueBtn.focus(); // Focus the continue button
            }
            
            // Announce selection
            const templateName = selectedCard.querySelector('h3');
            if (templateName) {
                this.announceToScreenReader(`${templateName.textContent} template selected`);
                this.showStatusMessage(`${templateName.textContent} template selected`, 'success');
            }
        }
    }

    startVoiceInput() {
        console.log('Starting voice input - selected template:', this.selectedTemplate);
        if (!this.selectedTemplate) {
            this.showStatusMessage('Please select a template first', 'error');
            return;
        }
        
        this.showScreen('voiceScreen');
        this.currentSection = 0; // Reset to first section
        this.updateSectionUI();
        
        if (this.autoFocusEnabled) {
            const transcription = document.getElementById('transcription');
            if (transcription) {
                setTimeout(() => transcription.focus(), 200);
            }
        }
        
        this.announceToScreenReader('Voice input screen loaded. You can now start building your resume.');
    }

    switchInputMethod(method) {
        document.querySelectorAll('.method-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        
        const selectedBtn = document.querySelector(`[data-method="${method}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
            selectedBtn.setAttribute('aria-pressed', 'true');
        }
        
        if (method === 'text') {
            const transcription = document.getElementById('transcription');
            if (transcription) {
                transcription.focus();
            }
            this.announceToScreenReader('Switched to text input mode');
        } else {
            this.announceToScreenReader('Switched to voice input mode');
        }
    }

    toggleRecording() {
        if (this.speechDisabled) {
            this.showStatusMessage('Voice input is disabled in current accessibility mode', 'info');
            return;
        }

        if (!this.recognition) {
            this.showStatusMessage('Speech recognition not available', 'error');
            return;
        }

        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    startRecording() {
        this.isRecording = true;
        this.recognition.lang = this.currentLanguage;
        this.recognition.start();
        
        const recordBtn = document.getElementById('recordBtn');
        const recordText = recordBtn?.querySelector('.record-text');
        if (recordText) {
            recordText.textContent = 'Recording... Click to stop';
        }
        this.updateVoiceStatus('Starting recording...');
    }

    stopRecording() {
        this.isRecording = false;
        if (this.recognition) {
            this.recognition.stop();
        }
        
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.classList.remove('recording');
            const recordText = recordBtn.querySelector('.record-text');
            if (recordText) {
                recordText.textContent = 'Click to Start Recording';
            }
        }
        this.updateVoiceStatus('Recording stopped');
        this.announceToScreenReader('Recording stopped');
    }

    updateVoiceStatus(message) {
        const voiceStatus = document.getElementById('voiceStatus');
        if (voiceStatus) {
            voiceStatus.textContent = message;
        }
    }

    clearTranscription() {
        const transcription = document.getElementById('transcription');
        if (transcription) {
            transcription.value = '';
            transcription.focus();
        }
        this.announceToScreenReader('Transcription cleared');
    }

    confirmSection() {
        const transcription = document.getElementById('transcription');
        const content = transcription ? transcription.value.trim() : '';
        
        if (!content) {
            this.showStatusMessage('Please provide content for this section', 'error');
            return;
        }

        // Store section data
        const sectionId = this.sections[this.currentSection].id;
        this.resumeData[sectionId] = this.processContent(content, sectionId);
        
        this.showStatusMessage(`${this.sections[this.currentSection].name} saved!`, 'success');
        this.announceToScreenReader(`${this.sections[this.currentSection].name} confirmed and saved`);
        
        // Clear for next section
        this.clearTranscription();
        
        // Auto-advance to next section
        setTimeout(() => {
            this.nextSection();
        }, 500);
    }

    processContent(content, sectionId) {
        // Basic content processing - in real app, this would use AI/NLP
        switch (sectionId) {
            case 'contact':
                return this.parseContactInfo(content);
            case 'summary':
                return content;
            case 'experience':
                return this.parseExperience(content);
            case 'education':
                return this.parseEducation(content);
            case 'skills':
                return this.parseSkills(content);
            default:
                return content;
        }
    }

    parseContactInfo(content) {
        // Simple parsing - in real app, would use more sophisticated NLP
        const contact = {};
        const lines = content.split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
            if (line.includes('@')) {
                contact.email = line.trim();
            } else if (line.match(/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)) {
                contact.phone = line.trim();
            } else if (line.toLowerCase().includes('linkedin')) {
                contact.linkedin = line.trim();
            } else if (!contact.name) {
                contact.name = line.trim();
            } else if (!contact.location) {
                contact.location = line.trim();
            }
        });
        
        return contact;
    }

    parseExperience(content) {
        // Simple experience parsing
        return content.split('\n\n').map(exp => ({
            company: exp.split('\n')[0] || '',
            description: exp
        }));
    }

    parseEducation(content) {
        return content.split('\n\n').map(edu => ({
            institution: edu.split('\n')[0] || '',
            description: edu
        }));
    }

    parseSkills(content) {
        const skills = content.split(',').map(skill => skill.trim());
        return { all: skills };
    }

    nextSection() {
        if (this.currentSection < this.sections.length - 1) {
            this.currentSection++;
            this.updateSectionUI();
        } else {
            // All sections completed
            this.showScreen('reviewScreen');
            this.generateResumePreview();
        }
    }

    previousSection() {
        if (this.currentSection > 0) {
            this.currentSection--;
            this.updateSectionUI();
        }
    }

    updateSectionUI() {
        const section = this.sections[this.currentSection];
        
        const sectionTitle = document.getElementById('sectionTitle');
        const sectionDescription = document.getElementById('sectionDescription');
        const currentStep = document.getElementById('currentStep');
        const stepCounter = document.getElementById('stepCounter');
        
        if (sectionTitle) sectionTitle.textContent = section.name;
        if (sectionDescription) sectionDescription.textContent = section.description;
        if (currentStep) currentStep.textContent = section.name;
        if (stepCounter) stepCounter.textContent = `(${this.currentSection + 1} of ${this.sections.length})`;
        
        // Update progress bar
        const progress = ((this.currentSection + 1) / this.sections.length) * 100;
        const progressBar = document.querySelector('.progress-bar');
        if (progressBar) {
            progressBar.style.setProperty('--progress-width', `${progress}%`);
        }
        
        const progressElement = document.querySelector('[role="progressbar"]');
        if (progressElement) {
            progressElement.setAttribute('aria-valuenow', this.currentSection + 1);
        }
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prevSectionBtn');
        const nextBtn = document.getElementById('nextSectionBtn');
        
        if (prevBtn) prevBtn.disabled = this.currentSection === 0;
        if (nextBtn) {
            nextBtn.textContent = this.currentSection === this.sections.length - 1 ? 'Complete Resume' : 'Next Section';
        }
        
        // Load existing data
        const existingData = this.resumeData[section.id];
        const transcription = document.getElementById('transcription');
        if (transcription) {
            if (existingData) {
                transcription.value = typeof existingData === 'string' ? existingData : JSON.stringify(existingData, null, 2);
            } else {
                transcription.value = '';
            }
        }

        this.announceToScreenReader(`Now on ${section.name}. ${section.description}`);
    }

    generateResumePreview() {
        const preview = document.getElementById('resumePreview');
        if (!preview) return;
        
        let html = '';

        // Contact Information
        if (this.resumeData.contact) {
            html += `<div class="resume-section">
                <h3>Contact Information</h3>
                ${this.resumeData.contact.name ? `<p><strong>${this.resumeData.contact.name}</strong></p>` : ''}
                ${this.resumeData.contact.email ? `<p>Email: ${this.resumeData.contact.email}</p>` : ''}
                ${this.resumeData.contact.phone ? `<p>Phone: ${this.resumeData.contact.phone}</p>` : ''}
                ${this.resumeData.contact.location ? `<p>Location: ${this.resumeData.contact.location}</p>` : ''}
                ${this.resumeData.contact.linkedin ? `<p>LinkedIn: ${this.resumeData.contact.linkedin}</p>` : ''}
            </div>`;
        }

        // Professional Summary
        if (this.resumeData.summary) {
            html += `<div class="resume-section">
                <h3>Professional Summary</h3>
                <p>${this.resumeData.summary}</p>
            </div>`;
        }

        // Work Experience
        if (this.resumeData.experience && this.resumeData.experience.length > 0) {
            html += `<div class="resume-section">
                <h3>Work Experience</h3>`;
            this.resumeData.experience.forEach(exp => {
                html += `<div style="margin-bottom: 16px;">
                    ${exp.company ? `<p><strong>${exp.company}</strong></p>` : ''}
                    <p>${exp.description}</p>
                </div>`;
            });
            html += `</div>`;
        }

        // Education
        if (this.resumeData.education && this.resumeData.education.length > 0) {
            html += `<div class="resume-section">
                <h3>Education</h3>`;
            this.resumeData.education.forEach(edu => {
                html += `<div style="margin-bottom: 16px;">
                    ${edu.institution ? `<p><strong>${edu.institution}</strong></p>` : ''}
                    <p>${edu.description}</p>
                </div>`;
            });
            html += `</div>`;
        }

        // Skills
        if (this.resumeData.skills && this.resumeData.skills.all) {
            html += `<div class="resume-section">
                <h3>Skills</h3>
                <p>${this.resumeData.skills.all.join(', ')}</p>
            </div>`;
        }

        preview.innerHTML = html || '<p>No resume content available. Please go back and complete the sections.</p>';
        this.announceToScreenReader('Resume preview generated and ready for review');
    }

    handleDocumentUpload(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                this.showStatusMessage(`File ${file.name} is too large. Maximum size is 10MB.`, 'error');
                return;
            }

            this.uploadedDocuments.push({
                name: file.name,
                size: file.size,
                type: file.type,
                file: file
            });
        });

        this.updateDocumentsList();
        this.showStatusMessage(`${files.length} document(s) uploaded successfully`, 'success');
    }

    updateDocumentsList() {
        const container = document.getElementById('uploadedDocuments');
        if (!container) return;
        
        container.innerHTML = '';

        this.uploadedDocuments.forEach((doc, index) => {
            const docElement = document.createElement('div');
            docElement.className = 'document-item';
            docElement.innerHTML = `
                <span class="document-name">${doc.name}</span>
                <button class="document-remove" onclick="app.removeDocument(${index})" aria-label="Remove ${doc.name}">×</button>
            `;
            container.appendChild(docElement);
        });
    }

    removeDocument(index) {
        const doc = this.uploadedDocuments[index];
        this.uploadedDocuments.splice(index, 1);
        this.updateDocumentsList();
        this.showStatusMessage(`${doc.name} removed`, 'info');
    }

    exportResume(format) {
        this.showLoadingOverlay(true);
        
        // Simulate export process
        setTimeout(() => {
            this.showLoadingOverlay(false);
            this.showStatusMessage(`Resume exported as ${format.toUpperCase()}`, 'success');
            this.announceToScreenReader(`Resume successfully exported as ${format}`);
            
            // In a real app, this would generate and download the file
            // For demo, we'll just show a success message
        }, 2000);
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            
            // Focus the first focusable element in the modal
            const firstFocusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                setTimeout(() => firstFocusable.focus(), 100);
            }
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    changeAccessibilityMode(mode) {
        this.accessibilityMode = mode;
        this.applyAccessibilityMode(mode);
        this.saveUserPreferences();
        this.showStatusMessage(`Accessibility mode changed to ${mode}`, 'info');
    }

    toggleHighContrast(enabled) {
        if (enabled) {
            document.body.classList.add('high-contrast');
        } else {
            document.body.classList.remove('high-contrast');
        }
        this.saveUserPreferences();
        this.showStatusMessage(`High contrast mode ${enabled ? 'enabled' : 'disabled'}`, 'info');
    }

    changeVoiceLanguage(lang) {
        this.currentLanguage = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
        }
        this.saveUserPreferences();
        this.showStatusMessage('Voice recognition language updated', 'info');
    }

    selectLanguage(lang) {
        this.currentLanguage = lang;
        
        // Update UI
        document.querySelectorAll('.language-option').forEach(opt => opt.classList.remove('selected'));
        const selectedOption = document.querySelector(`[data-lang="${lang}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        const langNameElement = document.querySelector(`[data-lang="${lang}"] .language-name`);
        const currentLanguageElement = document.getElementById('currentLanguage');
        if (langNameElement && currentLanguageElement) {
            const langName = langNameElement.textContent;
            currentLanguageElement.textContent = langName.split(' ')[0];
        }
        
        this.saveUserPreferences();
        this.closeModal(document.getElementById('languageModal'));
        this.showStatusMessage(`Language changed to ${langNameElement ? langNameElement.textContent : lang}`, 'info');
    }

    logout() {
        this.user = null;
        this.resumeData = { contact: {}, summary: '', experience: [], education: [], skills: {} };
        this.uploadedDocuments = [];
        this.currentSection = 0;
        this.selectedTemplate = null;
        
        this.closeModal(document.getElementById('settingsModal'));
        this.showScreen('welcomeScreen');
        this.showStatusMessage('Logged out successfully', 'info');
    }

    showScreen(screenId) {
        console.log('Showing screen:', screenId);
        
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
            
            // Fix input fields when switching screens
            setTimeout(() => {
                this.setupInputFieldFixes();
            }, 100);
            
            // Auto-focus for accessibility
            if (this.autoFocusEnabled) {
                const firstFocusable = targetScreen.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
                if (firstFocusable) {
                    setTimeout(() => firstFocusable.focus(), 200);
                }
            }
        }
    }

    showLoadingOverlay(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.remove('hidden');
                overlay.setAttribute('aria-hidden', 'false');
            } else {
                overlay.classList.add('hidden');
                overlay.setAttribute('aria-hidden', 'true');
            }
        }
    }

    showStatusMessage(message, type = 'info') {
        const container = document.getElementById('statusMessages');
        if (!container) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `status-message ${type}`;
        messageElement.textContent = message;
        messageElement.setAttribute('role', 'alert');
        
        container.appendChild(messageElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 5000);
    }

    announceToScreenReader(message) {
        // Create a temporary element for screen reader announcements
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            if (document.body.contains(announcement)) {
                document.body.removeChild(announcement);
            }
        }, 1000);
        
        // Also use speech synthesis if available and enabled
        if (this.speak && this.accessibilityMode === 'blind') {
            this.speak(message);
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing VoiceCV App');
    window.app = new VoiceCVApp();
    
    // Add global error handling
    window.addEventListener('error', (e) => {
        console.error('Application error:', e);
        if (window.app) {
            window.app.showStatusMessage('An error occurred. Please try refreshing the page.', 'error');
        }
    });
    
    // Add offline detection
    window.addEventListener('online', () => {
        if (window.app) {
            window.app.showStatusMessage('Connection restored', 'success');
        }
    });
    
    window.addEventListener('offline', () => {
        if (window.app) {
            window.app.showStatusMessage('Working offline - some features may be limited', 'info');
        }
    });
});