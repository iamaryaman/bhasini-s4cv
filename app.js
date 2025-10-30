// Application State
class VoiceCVApp {
    constructor() {
        this.currentScreen = 'welcomeScreen';
        this.accessibilityMode = 'normal';
        this.selectedTemplate = null;
        this.currentSection = 0;
        this.isRecording = false;
        this.recognition = null;
        // New properties for Bhashini integration
        this.bhashiniService = new BhashiniService();
        this.aldService = new BhashiniALDService(); // ALD service for language detection
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.audioStream = null;
        this.currentAudioBlob = null;
        this.isProcessingAudio = false;
        this.resumeData = {
            contact: {},
            summary: '',
            experience: [],
            education: [],
            skills: {}
        };
        this.currentLanguage = 'en'; // Default to English
        this.autoDetectEnabled = false; // ALD toggle state (OFF by default)
        this.user = null;
        this.uploadedDocuments = [];
        
        // Initialize Hybrid CV Extraction (AI + NER)
        this.hybridExtractor = new HybridCVExtraction();
        this.hybridExtractor.setNEREngine(new MultilingualNEREngine());
        
        // Check if API key is configured (load from localStorage)
        const savedApiKey = localStorage.getItem('openrouter_api_key');
        if (savedApiKey && savedApiKey.trim().length > 0) {
            this.hybridExtractor.setApiKey(savedApiKey);
            console.log('✅ AI service initialized with saved API key');
        }
        
        // Initialize Bhashini Translation Service
        this.translationService = null;
        if (typeof BhashiniTranslationService !== 'undefined') {
            this.translationService = new BhashiniTranslationService();
            console.log('✅ Bhashini Translation Service initialized');
        }

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
        
        // DO NOT load translations on page load - keep original English
        // Translations only happen when user explicitly changes language
        
        // Load saved theme preference
        this.loadThemePreference();
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

        // Document upload (existing review screen)
        const documentUpload = document.getElementById('documentUpload');
        if (documentUpload) {
            documentUpload.addEventListener('change', (e) => this.handleDocumentUpload(e));
        }
        
        // Additional documents upload (new feature in resume preview)
        const additionalDocsUpload = document.getElementById('additionalDocsUpload');
        if (additionalDocsUpload) {
            additionalDocsUpload.addEventListener('change', (e) => this.handleAdditionalDocsUpload(e));
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
        const appLanguageSelect = document.getElementById('appLanguageSelect');
        const logoutBtn = document.getElementById('logoutBtn');

        if (accessibilityModeSelect) accessibilityModeSelect.addEventListener('change', (e) => this.changeAccessibilityMode(e.target.value));
        if (highContrastCheck) highContrastCheck.addEventListener('change', (e) => this.toggleHighContrast(e.target.checked));
        if (voiceLanguageSelect) voiceLanguageSelect.addEventListener('change', (e) => this.changeVoiceLanguage(e.target.value));
        if (appLanguageSelect) appLanguageSelect.addEventListener('change', (e) => this.changeAppLanguage(e.target.value));
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
        // Check if MediaRecorder is supported
        if (!navigator.mediaDevices || !window.MediaRecorder) {
            this.showStatusMessage('Audio recording not supported in this browser', 'error');
            return;
        }

        // Initialize Bhashini ASR
        console.log('Initializing Bhashini ASR with language:', this.currentLanguage);
        
        // Pre-load pipeline configuration for better performance
        this.bhashiniService.getPipelineConfig(this.currentLanguage)
            .then(config => {
                console.log('Pipeline pre-configured for', this.currentLanguage);
            })
            .catch(error => {
                console.error('Failed to pre-configure pipeline:', error);
            });
    }

    /**
     * Start recording audio using MediaRecorder API
     */
    async startMediaRecording() {
        try {
            // Request microphone permission
            this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                } 
            });

            // Reset audio chunks
            this.audioChunks = [];

            // Get best supported MIME type
            const mimeType = AudioUtils.getBestMimeType();
            
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });

            // Handle data available event
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // Handle stop event
            this.mediaRecorder.onstop = async () => {
                // Create blob from chunks
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                this.currentAudioBlob = audioBlob;
                
                // Process the audio
                await this.processRecordedAudio(audioBlob);
            };

            // Start recording
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            
            this.updateVoiceStatus('Recording... Speak now');
            const recordBtn = document.getElementById('recordBtn');
            if (recordBtn) {
                recordBtn.classList.add('recording');
                const recordText = recordBtn.querySelector('.record-text');
                if (recordText) {
                    recordText.textContent = 'Recording... Click to stop';
                }
            }
            this.announceToScreenReader('Recording started. Please speak now.');
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showStatusMessage('Failed to access microphone. Please check permissions.', 'error');
        }
    }

    /**
     * Stop recording and process audio
     */
    async stopMediaRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        if (this.audioStream) {
            this.audioStream.getTracks().forEach(track => track.stop());
            this.audioStream = null;
        }
        
        this.isRecording = false;
        
        const recordBtn = document.getElementById('recordBtn');
        if (recordBtn) {
            recordBtn.classList.remove('recording');
            const recordText = recordBtn.querySelector('.record-text');
            if (recordText) {
                recordText.textContent = 'Click to Start Recording';
            }
        }
        
        this.updateVoiceStatus('Processing audio...');
    }

    /**
     * Process recorded audio with Bhashini ASR and AI Extraction
     */
    async processRecordedAudio(audioBlob) {
        if (this.isProcessingAudio) {
            return;
        }
        
        this.isProcessingAudio = true;
        this.updateVoiceStatus('Converting audio format...');
        
        try {
            // Convert to WAV format at 16kHz
            const wavBlob = await AudioUtils.convertToWav(audioBlob);
            
            // Convert to base64
            this.updateVoiceStatus('Preparing for transcription...');
            const audioBase64 = await AudioUtils.blobToBase64(wavBlob);
            
            // Get transcription from Bhashini
            this.updateVoiceStatus('Transcribing with Bhashini ASR...');
            const transcription = await this.bhashiniService.transcribeAudio(
                this.currentLanguage, 
                audioBase64
            );
            
            // Update transcription area
            const transcriptionArea = document.getElementById('transcription');
            if (transcriptionArea) {
                const currentText = transcriptionArea.value;
                transcriptionArea.value = currentText + (currentText ? ' ' : '') + transcription;
            }
            
            this.updateVoiceStatus('Transcription complete!');
            this.showStatusMessage('Audio transcribed successfully', 'success');
            
            // NEW: Extract CV data using AI ONLY (no hybrid, no NER)
            console.log('\n🤖 Starting AI CV Extraction...');
            this.updateVoiceStatus('Extracting CV data with AI...');
            
            try {
                const fullTranscript = transcriptionArea.value;
                
                // Check if AI is configured
                if (!this.hybridExtractor.aiService.isConfigured()) {
                    throw new Error('AI service not configured. Please add your OpenRouter API key in Settings.');
                }
                
                // Use AI service directly (no hybrid, no NER fallback)
                console.log('📝 Using pure AI extraction for best results...');
                const extractedData = await this.hybridExtractor.aiService.extractCVData(
                    fullTranscript,
                    this.currentLanguage
                );
                
                console.log('✅ AI extraction complete:', extractedData);
                
                // Update resume data with extracted information
                this.resumeData = this.convertExtractedToResumeData(extractedData);
                
                // Show success message
                this.showStatusMessage(
                    '✨ CV data extracted successfully with AI!',
                    'success'
                );
                
                // Auto-navigate to review screen
                setTimeout(() => {
                    this.showScreen('reviewScreen');
                    this.generateResumePreview();
                }, 1500);
                
            } catch (extractionError) {
                console.error('❌ AI extraction failed:', extractionError);
                
                // Show helpful error message
                if (extractionError.message.includes('not configured')) {
                    this.showStatusMessage(
                        '⚠️ AI service not configured. Please add your OpenRouter API key in Settings.',
                        'error'
                    );
                } else {
                    this.showStatusMessage(
                        `⚠️ AI extraction failed: ${extractionError.message}`,
                        'error'
                    );
                }
                
                // Don't navigate, let user see transcription
                console.log('💡 Tip: Check your API key and network connection');
            }
            
            // Auto-hide status after 3 seconds
            setTimeout(() => {
                this.updateVoiceStatus('');
            }, 3000);
            
        } catch (error) {
            console.error('Error processing audio:', error);
            this.showStatusMessage('Failed to transcribe audio. Please try again.', 'error');
            this.updateVoiceStatus('Transcription failed');
        } finally {
            this.isProcessingAudio = false;
        }
    }
    
    /**
     * Convert hybrid extractor output to resumeData format
     * @param {Object} extracted - Extracted CV data from hybrid extractor
     * @returns {Object} Resume data in app format
     */
    convertExtractedToResumeData(extracted) {
        const resumeData = {
            contact: {},
            summary: '',
            experience: [],
            education: [],
            skills: {}
        };
        
        // Convert personal info
        if (extracted.personal_info) {
            resumeData.contact = {
                name: extracted.personal_info.name,
                email: extracted.personal_info.email,
                phone: extracted.personal_info.phone,
                location: extracted.personal_info.location,
                linkedin: extracted.personal_info.linkedin,
                github: extracted.personal_info.github
            };
        }
        
        // Convert summary
        resumeData.summary = extracted.summary || '';
        
        // Convert work experience
        if (extracted.work_experience && Array.isArray(extracted.work_experience)) {
            resumeData.experience = extracted.work_experience.map(exp => ({
                company: exp.company,
                jobTitle: exp.job_title,
                location: exp.location,
                startDate: exp.start_date,
                endDate: exp.end_date,
                description: exp.responsibilities ? exp.responsibilities.join('\n• ') : '',
                responsibilities: exp.responsibilities
            }));
        }
        
        // Convert education
        if (extracted.education && Array.isArray(extracted.education)) {
            resumeData.education = extracted.education.map(edu => ({
                institution: edu.institution,
                degree: edu.degree,
                field: edu.field_of_study,
                location: edu.location,
                startDate: edu.start_date,
                endDate: edu.end_date,
                gpa: edu.gpa,
                description: `${edu.degree}${edu.field_of_study ? ' in ' + edu.field_of_study : ''}`
            }));
        }
        
        // Convert skills
        if (extracted.skills && Array.isArray(extracted.skills)) {
            resumeData.skills = {
                all: extracted.skills,
                technical: extracted.skills
            };
        }
        
        // Store extraction metadata
        resumeData.extractionMetadata = extracted.metadata;
        
        console.log('📊 Converted resume data:', resumeData);
        return resumeData;
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
            
            // Auto-proceed after selection - skip auth if using ngrok OAuth
            setTimeout(() => {
                // Check if ngrok OAuth is being used (user already authenticated)
                if (this.isNgrokOAuth()) {
                    this.user = { email: 'ngrok-user', name: 'User' };
                    this.showScreen('templateScreen');
                } else {
                    this.showScreen('authScreen');
                }
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
    
    // Check if user accessed via ngrok with OAuth
    isNgrokOAuth() {
        // ngrok OAuth adds specific headers that we can detect
        // Also check if URL contains ngrok domain
        const hostname = window.location.hostname;
        return hostname.includes('ngrok') || 
               hostname.includes('ngrok.io') || 
               hostname.includes('ngrok-free.app') ||
               hostname.includes('ngrok.app');
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

        if (this.isRecording) {
            this.stopMediaRecording();
        } else {
            this.startMediaRecording();
        }
    }

    // Legacy methods - redirected to new MediaRecorder implementation
    startRecording() {
        this.startMediaRecording();
    }

    stopRecording() {
        this.stopMediaRecording();
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
    
    handleAdditionalDocsUpload(e) {
        const files = Array.from(e.target.files);
        let successCount = 0;
        
        files.forEach(file => {
            // 10MB limit per file
            if (file.size > 10 * 1024 * 1024) {
                this.showStatusMessage(`File ${file.name} is too large. Maximum size is 10MB per file.`, 'error');
                return;
            }
            
            // Check if already uploaded
            const isDuplicate = this.uploadedDocuments.some(doc => doc.name === file.name && doc.size === file.size);
            if (isDuplicate) {
                this.showStatusMessage(`${file.name} is already uploaded.`, 'info');
                return;
            }

            this.uploadedDocuments.push({
                name: file.name,
                size: (file.size / 1024).toFixed(2) + ' KB',
                type: file.type,
                file: file
            });
            successCount++;
        });

        this.updateAdditionalDocumentsList();
        
        if (successCount > 0) {
            this.showStatusMessage(`✅ ${successCount} document(s) uploaded successfully. They will be attached to your CV export.`, 'success');
        }
        
        // Clear the input so the same file can be selected again if removed
        e.target.value = '';
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
    
    updateAdditionalDocumentsList() {
        const container = document.getElementById('uploadedDocumentsList');
        if (!container) return;
        
        if (this.uploadedDocuments.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        container.innerHTML = '<div style="margin-top: 1rem; padding: 1rem; background: rgba(16, 185, 129, 0.05); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">' +
            '<p style="color: #10b981; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">📄 Uploaded Documents (' + this.uploadedDocuments.length + '):</p>';

        this.uploadedDocuments.forEach((doc, index) => {
            container.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; margin: 0.25rem 0; background: rgba(255, 255, 255, 0.05); border-radius: 4px;">
                    <div style="flex: 1; overflow: hidden;">
                        <span style="color: #f1f5f9; font-size: 0.85rem; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📎 ${doc.name}</span>
                        <span style="color: #94a3b8; font-size: 0.75rem;">${doc.size}</span>
                    </div>
                    <button onclick="app.removeAdditionalDocument(${index})" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600;" aria-label="Remove ${doc.name}">
                        × Remove
                    </button>
                </div>
            `;
        });
        
        container.innerHTML += '</div>';
    }

    removeDocument(index) {
        const doc = this.uploadedDocuments[index];
        this.uploadedDocuments.splice(index, 1);
        this.updateDocumentsList();
        this.showStatusMessage(`${doc.name} removed`, 'info');
    }
    
    removeAdditionalDocument(index) {
        const doc = this.uploadedDocuments[index];
        this.uploadedDocuments.splice(index, 1);
        this.updateAdditionalDocumentsList();
        this.showStatusMessage(`🗑️ ${doc.name} removed`, 'info');
    }

    async exportResume(format) {
        this.showLoadingOverlay(true);
        
        try {
            // Make sure the export module is loaded
            if (!window.resumeExporter) {
                // Load the export module if not already loaded
                const script = document.createElement('script');
                script.src = 'resume-export.js';
                document.head.appendChild(script);
                
                // Wait for it to load
                await new Promise((resolve) => {
                    script.onload = resolve;
                    setTimeout(resolve, 2000); // Fallback timeout
                });
            }
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `resume_${timestamp}.${format === 'pdf' ? 'pdf' : 'docx'}`;
            
            // Use the generated CV data from single input or resumeData as fallback
            const dataToExport = this.generatedCVData || this.resumeData;
            
            if (!dataToExport) {
                throw new Error('No resume data available for export. Please generate your CV first.');
            }
            
            console.log('Exporting data:', dataToExport);
            
            // Export based on format
            if (format === 'pdf') {
                await window.resumeExporter.exportToPDF(dataToExport, filename);
            } else if (format === 'word') {
                await window.resumeExporter.exportToWord(dataToExport, filename);
            }
            
            this.showLoadingOverlay(false);
            this.showStatusMessage(`Resume exported as ${format.toUpperCase()}`, 'success');
            this.announceToScreenReader(`Resume successfully exported as ${format}`);
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showLoadingOverlay(false);
            this.showStatusMessage(`Failed to export resume: ${error.message}`, 'error');
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            
            // Update theme buttons when settings modal opens
            if (modalId === 'settingsModal') {
                this.updateThemeButtons();
            }
            
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
        
        // Save language preference
        localStorage.setItem('appLanguage', lang);
        
        // Clear Bhashini cache and pre-load new language
        this.bhashiniService.clearCache();
        this.bhashiniService.getPipelineConfig(lang)
            .then(config => {
                console.log('Pipeline configured for', lang);
                
                // Update all page translations if translations are loaded
                if (typeof updatePageTranslations === 'function') {
                    updatePageTranslations();
                }
                
                this.showStatusMessage(`Voice recognition language updated to ${lang}`, 'success');
            })
            .catch(error => {
                console.error('Failed to configure pipeline for', lang, error);
                this.showStatusMessage('Failed to update language', 'error');
            });
        this.saveUserPreferences();
    }

    selectLanguage(lang) {
        // Update UI in language modal
        document.querySelectorAll('.language-option').forEach(opt => opt.classList.remove('selected'));
        const selectedOption = document.querySelector(`[data-lang="${lang}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        // Close modal
        this.closeModal(document.getElementById('languageModal'));
        
        // Use the unified changeAppLanguage method
        this.changeAppLanguage(lang);
    }

    setTheme(theme) {
        const root = document.documentElement;
        const body = document.body;
        
        // Set theme attributes
        root.setAttribute('data-theme', theme);
        body.setAttribute('data-theme', theme);
        
        // Save preference
        localStorage.setItem('theme', theme);
        
        // Update button states
        this.updateThemeButtons();
        
        // Show notification
        this.showStatusMessage(`Theme changed to ${theme} mode`, 'success');
    }
    
    updateThemeButtons() {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        const lightBtn = document.getElementById('lightThemeBtn');
        const darkBtn = document.getElementById('darkThemeBtn');
        
        if (lightBtn && darkBtn) {
            if (currentTheme === 'light') {
                lightBtn.classList.remove('btn--outline');
                lightBtn.classList.add('btn--primary');
                darkBtn.classList.remove('btn--primary');
                darkBtn.classList.add('btn--outline');
            } else {
                darkBtn.classList.remove('btn--outline');
                darkBtn.classList.add('btn--primary');
                lightBtn.classList.remove('btn--primary');
                lightBtn.classList.add('btn--outline');
            }
        }
    }
    
    loadThemePreference() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.setTheme(savedTheme);
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
    
    // ========== SINGLE INPUT CV FUNCTIONALITY ==========
    
    startVoiceInput() {
        console.log('Starting single voice input mode');
        this.showScreen('voiceScreen');
        
        // Initialize NER service for single input
        this.initializeSingleInputMode();
    }
    
    initializeSingleInputMode() {
        // Initialize Bhashini service for audio transcription
        this.bhashiniService = new BhashiniService();
        this.aldService = new BhashiniALDService(); // Initialize ALD service
        this.autoDetectEnabled = false; // ALD OFF by default
        this.finalText = '';
        this.generatedCVData = null;
        this.currentLanguage = 'en'; // Default to English
        
        // Ensure manual language selector is visible on initialization
        setTimeout(() => {
            const manualSelector = document.getElementById('manualLanguageSelector');
            const manualLanguageSelect = document.getElementById('manualLanguageSelect');
            if (manualSelector) {
                manualSelector.style.display = 'block';
            }
            if (manualLanguageSelect) {
                manualLanguageSelect.value = this.currentLanguage;
            }
            console.log('✅ Manual language selector initialized and visible');
        }, 100);
        
        // Initialize audio-related variables
        this.audioStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.isProcessingAudio = false;
        
        // Initialize NER service if available
        if (typeof BhashiniNERService !== 'undefined') {
            this.nerService = new BhashiniNERService();
            this.setupNERHandlers();
        }
        
        // Set up event listeners for single input mode
        this.setupSingleInputEventListeners();
        
        // Initialize waveform canvas
        this.initializeWaveform();
        
        // Pre-load pipeline configuration for better performance
        this.bhashiniService.getPipelineConfig(this.currentLanguage)
            .then(config => {
                console.log('Pipeline pre-configured for', this.currentLanguage);
            })
            .catch(error => {
                console.warn('Failed to pre-configure pipeline:', error);
            });
        
        console.log('Single input mode initialized with Bhashini service');
    }
    
    setupSingleInputEventListeners() {
        // Override existing record button functionality for single input
        const recordBtn = document.getElementById('recordBtn');
        const generateCVBtn = document.getElementById('generateCVBtn');
        const clearBtn = document.getElementById('clearBtn');
        const copyBtn = document.getElementById('copyBtn');
        const autoDetectToggle = document.getElementById('autoDetectToggle');
        
        if (recordBtn) {
            // Remove existing listeners and add single input functionality
            recordBtn.replaceWith(recordBtn.cloneNode(true));
            const newRecordBtn = document.getElementById('recordBtn');
            newRecordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSingleInputRecording();
            });
        }
        
        if (generateCVBtn) {
            generateCVBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.generateCVFromSingleInput();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearSingleInputTranscription();
            });
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.copySingleInputText();
            });
        }
        
        if (autoDetectToggle) {
            autoDetectToggle.addEventListener('click', () => this.toggleAutoDetect());
        }
        
        // Manual language selector - ONLY changes ASR voice input language
        const manualLanguageSelect = document.getElementById('manualLanguageSelect');
        console.log('Setting up language selector, element found:', !!manualLanguageSelect);
        
        if (manualLanguageSelect) {
            // Remove any existing listeners first
            const newSelect = manualLanguageSelect.cloneNode(true);
            manualLanguageSelect.parentNode.replaceChild(newSelect, manualLanguageSelect);
            
            newSelect.addEventListener('change', (e) => {
                console.log('Language selector changed to:', e.target.value);
                
                // Only change the ASR language, not the UI/page language
                this.currentLanguage = e.target.value;
                
                // Update the language indicator
                const indicator = document.getElementById('currentLangIndicator');
                if (indicator && !this.autoDetectEnabled) {
                    const selectedOption = e.target.options[e.target.selectedIndex];
                    const langName = selectedOption.text;
                    indicator.textContent = `${langName}`;
                    console.log('Updated indicator to:', langName);
                }
                
                // Pre-load Bhashini pipeline for the selected language
                if (this.bhashiniService) {
                    this.bhashiniService.getPipelineConfig(this.currentLanguage)
                        .then(() => {
                            console.log(`✅ ASR pipeline configured for ${this.currentLanguage}`);
                        })
                        .catch(error => {
                            console.error('❌ Failed to configure ASR pipeline:', error);
                        });
                }
                
                // Show confirmation that ONLY voice input language changed
                const selectedText = e.target.options[e.target.selectedIndex].text;
                this.showStatusMessage(`Voice input language set to ${selectedText}`, 'success');
            });
            
            console.log('✅ Language selector event listener attached');
        } else {
            console.error('❌ Could not find manualLanguageSelect element!');
        }
        
        // Add text input mode toggle
        const inputModeToggle = document.getElementById('inputModeToggle');
        if (inputModeToggle) {
            inputModeToggle.addEventListener('click', () => this.toggleInputMode());
        }
        
        // Add Bhashini test button
        const testBhashiniBtn = document.getElementById('testBhashiniBtn');
        if (testBhashiniBtn) {
            testBhashiniBtn.addEventListener('click', () => this.testBhashiniService());
        }
        
        // Add manual text input handler
        const manualTextInput = document.getElementById('manualTextInput');
        const processTextBtn = document.getElementById('processTextBtn');
        
        if (processTextBtn) {
            processTextBtn.addEventListener('click', () => this.handleManualTextInput());
        }
        
        if (manualTextInput) {
            manualTextInput.addEventListener('input', (e) => {
                // Enable process button when there's text
                if (processTextBtn) {
                    processTextBtn.disabled = !e.target.value.trim();
                }
            });
        }
    }
    
    setupNERHandlers() {
        if (this.nerService) {
            this.nerService.setHandlers({
                onTranscriptionUpdate: (data) => this.handleSingleInputTranscription(data),
                onLanguageDetected: (data) => this.handleLanguageDetection(data),
                onConnectionStatus: (status) => this.updateConnectionStatus(status),
                onError: (error, details) => this.handleNERError(error, details),
                onEntityExtracted: (data) => this.handleEntityExtraction(data),
                onCVUpdated: (data) => this.handleCVUpdate(data),
                onConfidenceUpdate: (metrics) => this.handleConfidenceUpdate(metrics)
            });
        }
    }
    
    async toggleSingleInputRecording() {
        const btn = document.getElementById('recordBtn');
        const recordingTips = document.getElementById('recordingTips');
        
        if (this.isRecording) {
            // Stop recording
            if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                this.mediaRecorder.stop();
            }
            if (this.audioStream) {
                this.audioStream.getTracks().forEach(track => track.stop());
                this.audioStream = null;
            }
            this.isRecording = false;
            btn.classList.remove('recording');
            btn.innerHTML = `
                <span style="font-size: 3.5rem;">🎤</span>
                <div style="font-size: 1.2rem; margin-top: 10px; font-weight: 700;">START COMPLETE CV RECORDING</div>
                <div style="font-size: 0.85rem; opacity: 0.85; margin-top: 6px; line-height: 1.4;">One continuous session • All CV information • AI auto-extracts everything</div>
            `;
            
            // Hide recording tips
            if (recordingTips) recordingTips.style.display = 'none';
            
            // Update microphone status
            this.updateMicrophoneStatus('idle', 'Recording stopped');
            
            // Auto-extract entities when recording stops and we have text
            if (this.finalText && this.finalText.trim()) {
                setTimeout(() => this.generateCVFromSingleInput(), 500);
            }
        } else {
            // Start recording
            try {
                // Test microphone access first
                this.showStatusMessage('Testing microphone access...', 'info');
                const micTestPassed = await this.testMicrophoneAccess();
                
                if (!micTestPassed) {
                    throw new Error('Microphone access test failed. Please check permissions.');
                }
                
                this.showStatusMessage('Microphone access confirmed. Starting recording...', 'info');
                
                // Use Bhashini service for transcription
                await this.startBhashiniRecording();
                
                this.isRecording = true;
                btn.classList.add('recording');
                btn.innerHTML = `
                    <span style="font-size: 3.5rem;">⏹️</span>
                    <div style="font-size: 1.2rem; margin-top: 10px; font-weight: 700;">COMPLETE CV SESSION</div>
                    <div style="font-size: 0.85rem; opacity: 0.85; margin-top: 6px; line-height: 1.4;">Stop recording & let AI extract all CV information</div>
                `;
                
                // Update microphone status
                this.updateMicrophoneStatus('recording', 'Recording in progress...');
                
                // Show recording tips
                if (recordingTips) recordingTips.style.display = 'block';
                
            } catch (error) {
                console.error('Failed to start recording:', error);
                
                // Provide specific guidance based on error
                let message = 'Failed to start recording. ';
                
                if (error.message.includes('denied') || error.message.includes('NotAllowed')) {
                    message += 'Please click the microphone icon in your browser\'s address bar and allow microphone access, then try again.';
                } else if (error.message.includes('NotFound') || error.message.includes('not found')) {
                    message += 'No microphone detected. Please check that your microphone is connected and try again.';
                } else if (error.message.includes('NotReadable') || error.message.includes('being used')) {
                    message += 'Your microphone is being used by another application. Please close other apps using the microphone and try again.';
                } else if (error.message.includes('not support')) {
                    message += 'Your browser doesn\'t support microphone access. Please use Chrome, Firefox, or Safari.';
                } else {
                    message += 'Please check your microphone permissions in browser settings.';
                }
                
                this.showStatusMessage(message, 'error');
                this.updateMicrophoneStatus('error', 'Microphone access failed');
                
                // Show additional help
                this.showMicrophoneHelp();
            }
        }
    }
    
    handleSingleInputTranscription(data) {
        const finalTextEl = document.getElementById('finalText');
        const partialTextEl = document.getElementById('partialText');
        const placeholderEl = document.getElementById('placeholderText');
        
        // Hide placeholder when we start getting transcriptions
        if (placeholderEl && (data.text || data.accumulatedText)) {
            placeholderEl.style.display = 'none';
        }
        
        if (data.isFinal && data.accumulatedText) {
            // Use accumulated text from the service to prevent duplication
            this.finalText = data.accumulatedText;
            if (finalTextEl) finalTextEl.textContent = this.finalText;
            if (partialTextEl) partialTextEl.textContent = '';
            
            // Show action controls when we have text
            this.showActionControls();
        } else if (!data.isFinal && partialTextEl) {
            // Show partial text
            partialTextEl.textContent = data.text;
        }
    }
    
    async generateCVFromSingleInput() {
        if (!this.finalText || this.finalText.trim().length === 0) {
            this.showStatusMessage('No speech text available. Please record your complete CV information first.', 'error');
            return;
        }
        
        try {
            this.showStatusMessage('🤖 Processing CV information with enhanced NER...', 'info');
            
            // Use improved text processing with better categorization
            const structuredCV = this.processTextForCV(this.finalText);
            
            console.log('Generated CV data from improved NER:', structuredCV);
            
            // Check if we extracted meaningful information - be more lenient
            const hasContact = structuredCV.personalInfo.fullName || structuredCV.personalInfo.email || structuredCV.personalInfo.phone;
            const hasContent = structuredCV.workExperience.length > 0 || structuredCV.education.length > 0 || structuredCV.skills.technical.length > 0;
            const hasLanguages = structuredCV.languages.length > 0;
            
            // More lenient validation - any meaningful information is acceptable
            if (hasContact || hasContent || hasLanguages || this.finalText.length > 100) {
                // Store generated data
                this.resumeData = structuredCV;
                this.generatedCVData = structuredCV;
                
                // Show detailed extraction results
                const extractionSummary = this.generateExtractionSummary(structuredCV);
                
                // Show preview with improved HTML structure
                this.showResumePreview(structuredCV);
                
                this.showStatusMessage(`✅ CV generated successfully! ${extractionSummary}`, 'success');
                
                // Add helpful message if some sections are missing
                if (!hasContact && !hasContent) {
                    setTimeout(() => {
                        this.showStatusMessage('💡 Tip: For better results, mention your name, work experience, education, and skills clearly in your next recording.', 'info');
                    }, 3000);
                }
            } else {
                // Provide more helpful error message
                let helpMessage = '⚠️ Could not extract CV information. ';
                if (this.finalText.length < 50) {
                    helpMessage += 'Please provide more detailed information about yourself.';
                } else {
                    helpMessage += 'Try speaking more clearly about your name, work experience, education, and skills.';
                }
                
                // Still show whatever we captured for debugging
                if (this.finalText.trim()) {
                    console.log('Full transcribed text for debugging:', this.finalText);
                    this.showStatusMessage(helpMessage + ' Check browser console for transcribed text.', 'error');
                } else {
                    this.showStatusMessage(helpMessage, 'error');
                }
            }
        } catch (error) {
            console.error('CV generation failed:', error);
            this.showStatusMessage('❌ Failed to process CV information. Please try again.', 'error');
        }
    }
    
    showActionControls() {
        const controls = document.getElementById('actionControls');
        if (controls) {
            controls.style.display = 'block';
        }
    }
    
    hideActionControls() {
        const controls = document.getElementById('actionControls');
        if (controls) {
            controls.style.display = 'none';
        }
    }
    
    showResumePreview(cvData) {
        const previewSection = document.getElementById('resumePreview');
        const previewContent = document.getElementById('previewContent');
        
        if (!previewSection || !previewContent) return;
        
        // Generate preview HTML
        let previewHTML = this.generatePreviewHTML(cvData);
        
        previewContent.innerHTML = previewHTML;
        previewSection.style.display = 'block';
        
        // Scroll to preview
        setTimeout(() => {
            previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
    }
    
    generatePreviewHTML(cvData) {
        let html = '';
        
        // CV Title
        html += '<div style="text-align: center; margin-bottom: 20px; font-family: Arial, sans-serif;">';
        html += '<h1 style="font-size: 22px; font-weight: bold; margin-bottom: 5px; color: #2c3e50;">CURRICULUM VITAE</h1>';
        html += '</div>';
        
        // Name (Properly categorized)
        if (cvData.personalInfo?.fullName) {
            html += `<h2 style="color: #34495e; margin-bottom: 20px; text-align: center; font-size: 18px;">${this.escapeHtml(cvData.personalInfo.fullName)}</h2>`;
        }
        
        // Contact Information Section (Properly separated)
        const hasContact = cvData.personalInfo?.email || cvData.personalInfo?.phone || cvData.personalInfo?.location;
        if (hasContact) {
            const contactTitle = (typeof t === 'function') ? t('contactInformation') : 'Contact Information';
            html += `<h3 style="color: #2c3e50; margin: 20px 0 10px 0; font-size: 16px; border-bottom: 2px solid #3498db; padding-bottom: 5px;">${contactTitle}</h3>`;
            if (cvData.personalInfo.email) {
                const emailLabel = (typeof t === 'function') ? t('email') : 'Email';
                html += `<p style="color: #000000; margin: 8px 0; font-size: 14px;"><strong>${emailLabel}:</strong> ${this.escapeHtml(cvData.personalInfo.email)}</p>`;
            }
            if (cvData.personalInfo.phone) {
                const phoneLabel = (typeof t === 'function') ? t('phone') : 'Phone';
                html += `<p style="color: #000000; margin: 8px 0; font-size: 14px;"><strong>${phoneLabel}:</strong> ${this.escapeHtml(cvData.personalInfo.phone)}</p>`;
            }
            if (cvData.personalInfo.location) {
                const locationLabel = (typeof t === 'function') ? t('location') : 'Location';
                html += `<p style="color: #000000; margin: 8px 0; font-size: 14px;"><strong>${locationLabel}:</strong> ${this.escapeHtml(cvData.personalInfo.location)}</p>`;
            }
        }
        
        // Professional Summary (Clean, without contact info)
        if (cvData.professionalSummary && cvData.professionalSummary.trim()) {
            const summaryTitle = (typeof t === 'function') ? t('professionalSummary') : 'Professional Summary';
            html += `<h3 style="color: #2c3e50; margin: 20px 0 10px 0; font-size: 16px; border-bottom: 2px solid #3498db; padding-bottom: 5px;">${summaryTitle}</h3>`;
            html += `<p style="color: #000000; margin: 10px 0; font-size: 14px; line-height: 1.6; text-align: justify;">${this.escapeHtml(cvData.professionalSummary)}</p>`;
        }
        
        // Work Experience Section
        if (cvData.workExperience && cvData.workExperience.length > 0) {
            const workExpTitle = (typeof t === 'function') ? t('workExperienceSection') : 'Work Experience';
            html += `<h3 style="color: #2c3e50; margin: 20px 0 10px 0; font-size: 16px; border-bottom: 2px solid #3498db; padding-bottom: 5px;">${workExpTitle}</h3>`;
            cvData.workExperience.forEach(job => {
                html += `<div style="margin: 15px 0; padding: 10px 0; border-left: 3px solid #3498db; padding-left: 15px;">`;
                html += `<h4 style="margin: 0 0 5px 0; font-size: 15px; color: #2c3e50;">${this.escapeHtml(job.jobTitle)}</h4>`;
                html += `<p style="margin: 0 0 5px 0; font-size: 14px; color: #7f8c8d;"><strong>${this.escapeHtml(job.company)}</strong> - ${this.escapeHtml(job.duration)}</p>`;
                if (job.description) {
                    html += `<p style="margin: 5px 0; font-size: 13px; line-height: 1.5;">${this.escapeHtml(job.description)}</p>`;
                }
                html += '</div>';
            });
        }
        
        // Education Section
        if (cvData.education && cvData.education.length > 0) {
            const educationTitle = (typeof t === 'function') ? t('educationSection') : 'Education';
            html += `<h3 style="color: #2c3e50; margin: 20px 0 10px 0; font-size: 16px; border-bottom: 2px solid #3498db; padding-bottom: 5px;">${educationTitle}</h3>`;
            cvData.education.forEach(edu => {
                html += `<div style="margin: 15px 0; padding: 10px 0;">`;
                html += `<h4 style="margin: 0 0 5px 0; font-size: 15px; color: #2c3e50;">${this.escapeHtml(edu.degree)}</h4>`;
                html += `<p style="margin: 0 0 5px 0; font-size: 14px; color: #7f8c8d;"><strong>${this.escapeHtml(edu.institution)}</strong> - ${this.escapeHtml(edu.year)}</p>`;
                html += '</div>';
            });
        }
        
        // Skills Section
        if (cvData.skills?.technical && cvData.skills.technical.length > 0) {
            const skillsTitle = (typeof t === 'function') ? t('technicalSkillsLabel') : 'Technical Skills';
            html += `<h3 style="color: #2c3e50; margin: 20px 0 10px 0; font-size: 16px; border-bottom: 2px solid #3498db; padding-bottom: 5px;">${skillsTitle}</h3>`;
            html += '<p style="margin: 10px 0; font-size: 14px; line-height: 1.6;">';
            html += cvData.skills.technical.map(skill => `<span style="display: inline-block; background: #ecf0f1; padding: 4px 8px; margin: 2px; border-radius: 4px; font-size: 13px;">${this.escapeHtml(skill)}</span>`).join('');
            html += '</p>';
        }
        
        // Languages Section
        if (cvData.languages && cvData.languages.length > 0) {
            const languagesTitle = (typeof t === 'function') ? t('languagesLabel') : 'Languages';
            html += `<h3 style="color: #2c3e50; margin: 20px 0 10px 0; font-size: 16px; border-bottom: 2px solid #3498db; padding-bottom: 5px;">${languagesTitle}</h3>`;
            cvData.languages.forEach(lang => {
                html += `<p style="margin: 5px 0; font-size: 14px;"><strong>${this.escapeHtml(lang.name)}</strong> - ${this.escapeHtml(lang.proficiency)}</p>`;
            });
        }
        
        return html;
    }
    
    generateExtractionSummary(cvData) {
        const extracted = [];
        if (cvData.personalInfo?.fullName) extracted.push('Name');
        if (cvData.personalInfo?.email) extracted.push('Email');
        if (cvData.personalInfo?.phone) extracted.push('Phone');
        if (cvData.personalInfo?.location) extracted.push('Location');
        if (cvData.workExperience?.length > 0) extracted.push(`${cvData.workExperience.length} job(s)`);
        if (cvData.education?.length > 0) extracted.push(`${cvData.education.length} education`);
        if (cvData.skills?.technical?.length > 0) extracted.push(`${cvData.skills.technical.length} skills`);
        if (cvData.languages?.length > 0) extracted.push(`${cvData.languages.length} languages`);
        
        return `Extracted: ${extracted.join(', ')}`;
    }
    
    clearSingleInputTranscription() {
        this.finalText = '';
        const finalTextEl = document.getElementById('finalText');
        const partialTextEl = document.getElementById('partialText');
        const placeholderEl = document.getElementById('placeholderText');
        
        if (finalTextEl) finalTextEl.textContent = '';
        if (partialTextEl) partialTextEl.textContent = '';
        if (placeholderEl) placeholderEl.style.display = 'block';
        
        // Hide action controls and resume preview
        this.hideActionControls();
        const previewEl = document.getElementById('resumePreview');
        if (previewEl) previewEl.style.display = 'none';
        
        // Clear service data
        if (this.nerService) {
            this.nerService.clearData();
        }
        
        this.generatedCVData = null;
        this.showStatusMessage('Starting fresh - ready for new CV recording!', 'info');
    }
    
    copySingleInputText() {
        if (!this.finalText) {
            this.showStatusMessage('No text to copy', 'error');
            return;
        }
        
        navigator.clipboard.writeText(this.finalText).then(() => {
            this.showStatusMessage('Text copied to clipboard', 'success');
        }).catch(() => {
            this.showStatusMessage('Failed to copy text', 'error');
        });
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
    
    // Placeholder methods for NER handlers
    handleLanguageDetection(data) {
        console.log('Language detected:', data);
    }
    
    updateConnectionStatus(status) {
        console.log('Connection status:', status);
    }
    
    handleNERError(error, details) {
        console.error('NER error:', error, details);
        
        // Provide more specific error messages based on the error type
        let message = 'Speech processing error: ';
        
        if (error.includes('network') || error.includes('connection')) {
            message += 'Connection issue. Please check your internet and try again.';
        } else if (error.includes('microphone') || error.includes('audio')) {
            message += 'Microphone issue. Please check microphone permissions.';
        } else if (error.includes('language')) {
            message += 'Language detection failed. Please try speaking more clearly.';
        } else {
            message += 'Please try recording again or refresh the page.';
        }
        
        this.showStatusMessage(message, 'error');
    }
    
    handleEntityExtraction(data) {
        console.log('Entities extracted:', data);
    }
    
    handleCVUpdate(data) {
        console.log('CV updated:', data);
    }
    
    handleConfidenceUpdate(metrics) {
        console.log('Confidence metrics:', metrics);
    }
    
    toggleAutoDetect() {
        this.autoDetectEnabled = !this.autoDetectEnabled;
        
        const toggle = document.getElementById('autoDetectToggle');
        const indicator = document.getElementById('currentLangIndicator');
        const manualSelector = document.getElementById('manualLanguageSelector');
        
        if (toggle) {
            if (this.autoDetectEnabled) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        }
        
        // Show/hide manual language selector
        if (manualSelector) {
            manualSelector.style.display = this.autoDetectEnabled ? 'none' : 'block';
        }
        
        if (indicator) {
            if (this.autoDetectEnabled) {
                indicator.textContent = '🔄 Auto-detect: ON';
                indicator.style.background = '#10b981'; // Green
            } else {
                const langName = this.aldService.languageNames[this.currentLanguage] || this.currentLanguage;
                indicator.textContent = `${langName}`;
                indicator.style.background = '#000000'; // Black
            }
        }
        
        console.log(`🎤 ALD: Auto-detect ${this.autoDetectEnabled ? 'ENABLED' : 'DISABLED'}`);
        this.showStatusMessage(
            `Language auto-detection ${this.autoDetectEnabled ? 'enabled' : 'disabled'}`,
            'info'
        );
    }
    
    initializeWaveform() {
        const canvas = document.getElementById('waveformCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            // Set initial style
            ctx.fillStyle = '#1e2139';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    showExportModal() {
        // Use the existing export functionality but with generated CV data
        if (this.generatedCVData) {
            this.showScreen('reviewScreen');
            
            // Update the review screen with generated data
            const resumePreview = document.getElementById('resumePreview');
            if (resumePreview) {
                resumePreview.innerHTML = this.generatePreviewHTML(this.generatedCVData);
            }
        } else {
            this.showStatusMessage('Please generate a CV first', 'error');
        }
    }
    
    /**
     * Show microphone troubleshooting help
     */
    showMicrophoneHelp() {
        setTimeout(() => {
            const helpMessage = `
            🎤 Microphone Troubleshooting:
            
            1. Click the 🔒 or 🔊 icon in your browser's address bar
            2. Set microphone permission to "Allow" 
            3. Refresh the page and try again
            
            If issues persist:
            • Check your microphone is connected and working
            • Close other apps that might be using the microphone
            • Try using Chrome, Firefox, or Safari browser
            • Check your system's microphone privacy settings
            `;
            
            this.showStatusMessage(helpMessage.trim(), 'info');
        }, 2000);
    }
    
    /**
     * Test microphone access before recording
     */
    async testMicrophoneAccess() {
        try {
            this.updateMicrophoneStatus('testing', 'Testing microphone...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately after test
            this.updateMicrophoneStatus('ready', 'Microphone ready');
            return true;
        } catch (error) {
            console.error('Microphone test failed:', error);
            this.updateMicrophoneStatus('error', 'Microphone access denied');
            return false;
        }
    }
    
    /**
     * Start Bhashini audio recording
     */
    async startBhashiniRecording() {
        try {
            // Request microphone permission with optimized settings for speech recognition
            this.audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                } 
            });

            // Reset audio chunks
            this.audioChunks = [];

            // Get best supported MIME type
            const mimeType = AudioUtils.getBestMimeType();
            console.log('Using MIME type:', mimeType);
            
            // Create MediaRecorder with optimized settings
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: mimeType,
                audioBitsPerSecond: 128000
            });

            // Handle data available event
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                    console.log('Audio chunk received:', event.data.size, 'bytes');
                }
            };

            // Handle stop event
            this.mediaRecorder.onstop = async () => {
                console.log('Recording stopped, processing', this.audioChunks.length, 'chunks');
                // Create blob from chunks
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });
                console.log('Created audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);
                
                // Process the audio
                await this.processAudioWithBhashini(audioBlob);
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('MediaRecorder error:', event.error);
                this.showStatusMessage('Recording failed. Please try again.', 'error');
            };

            // Start recording
            this.mediaRecorder.start(1000); // Collect data every second
            this.updateMicrophoneStatus('recording', 'Recording with Bhashini ASR...');
            
            console.log('Recording started successfully');
            
        } catch (error) {
            console.error('Failed to start Bhashini recording:', error);
            throw error;
        }
    }
    
    /**
     * Process recorded audio with Bhashini API
     */
    async processAudioWithBhashini(audioBlob) {
        if (this.isProcessingAudio) {
            console.log('Already processing audio, skipping...');
            return;
        }
        
        this.isProcessingAudio = true;
        
        try {
            console.log('Starting audio processing for Bhashini ASR');
            this.showStatusMessage('🔄 Converting audio format...', 'info');
            
            // Check if audio blob is valid
            if (!audioBlob || audioBlob.size === 0) {
                throw new Error('No audio data to process');
            }
            
            console.log('Input audio:', audioBlob.size, 'bytes, type:', audioBlob.type);
            
            // Convert to WAV format at 16kHz (required by Bhashini)
            this.showStatusMessage('🔄 Converting to WAV format...', 'info');
            const wavBlob = await AudioUtils.convertToWav(audioBlob);
            console.log('Converted to WAV:', wavBlob.size, 'bytes');
            
            // Convert to base64
            this.showStatusMessage('🔄 Preparing for transcription...', 'info');
            const audioBase64 = await AudioUtils.blobToBase64(wavBlob);
            console.log('Base64 audio prepared:', audioBase64.length, 'characters');
            
            // === ALD INTEGRATION: Detect language first if auto-detect is ON ===
            let languageToUse = this.currentLanguage;
            let transcription = '';
            
            if (this.autoDetectEnabled) {
                try {
                    this.showStatusMessage('🔄 Detecting language from audio (testing multiple languages)...', 'info');
                    const detectedLang = await this.aldService.detectLanguageFromAudio(audioBase64);
                    
                    // Override current language with detected language
                    languageToUse = detectedLang.languageCode;
                    this.currentLanguage = languageToUse;
                    
                    // Use the transcription from ALD (already transcribed during detection)
                    transcription = detectedLang.transcription;
                    
                    // Update UI indicator
                    const indicator = document.getElementById('currentLangIndicator');
                    if (indicator) {
                        indicator.textContent = `✅ Detected: ${detectedLang.languageName} (${(detectedLang.confidence * 100).toFixed(0)}%)`;
                        indicator.style.background = '#10b981'; // Green for success
                    }
                    
                    this.showStatusMessage(
                        `✅ Detected ${detectedLang.languageName} (${(detectedLang.confidence * 100).toFixed(0)}% confidence)`,
                        'success'
                    );
                    
                    console.log(`🎤 ALD: Using ${languageToUse} with transcription already obtained`);
                    
                } catch (aldError) {
                    console.error('🎤 ALD failed, falling back to current language:', aldError);
                    this.showStatusMessage(
                        `⚠️ Language detection failed, using ${this.aldService.languageNames[languageToUse] || languageToUse}`,
                        'warning'
                    );
                    // Fall through to regular ASR below
                }
            }
            
            // If ALD didn't provide transcription, get it from regular ASR
            if (!transcription || transcription.trim().length === 0) {
                this.showStatusMessage(`🔄 Transcribing in ${this.aldService.languageNames[languageToUse] || languageToUse}...`, 'info');
                transcription = await this.bhashiniService.transcribeAudio(
                    languageToUse, 
                    audioBase64
                );
            }
            
            console.log('Transcription result:', transcription);
            
            if (transcription && transcription.trim()) {
                // Store the transcription
                this.finalText = transcription.trim();
                
                // Update the transcription display
                this.handleSingleInputTranscription({
                    text: transcription.trim(),
                    isFinal: true,
                    accumulatedText: this.finalText
                });
                
                this.showStatusMessage('✅ Transcription completed successfully!', 'success');
                
                // Show action controls
                this.showActionControls();
                
            } else {
                this.showStatusMessage('No speech detected. Please speak clearly and try again.', 'error');
            }
            
        } catch (error) {
            console.error('Audio processing failed:', error);
            
            let errorMessage = 'Failed to transcribe audio: ';
            
            if (error.message.includes('Failed to convert audio')) {
                errorMessage += 'Audio format conversion failed.';
            } else if (error.message.includes('404')) {
                errorMessage += 'Bhashini service unavailable.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage += 'Authentication failed.';
            } else if (error.message.includes('Network')) {
                errorMessage += 'Network connection issue.';
            } else {
                errorMessage += error.message || 'Unknown error occurred.';
            }
            
            this.showStatusMessage(errorMessage, 'error');
            
        } finally {
            this.isProcessingAudio = false;
        }
    }
    
    
    /**
     * Toggle between voice and text input modes
     */
    toggleInputMode() {
        const voiceMode = document.getElementById('voiceMode');
        const textMode = document.getElementById('textMode');
        const modeToggle = document.getElementById('inputModeToggle');
        
        if (voiceMode.style.display === 'none') {
            // Switch to voice mode
            voiceMode.style.display = 'block';
            textMode.style.display = 'none';
            modeToggle.textContent = '📝 Switch to Text Input';
        } else {
            // Switch to text mode
            voiceMode.style.display = 'none';
            textMode.style.display = 'block';
            modeToggle.textContent = '🎤 Switch to Voice Input';
            
            // Pre-fill text area with existing transcription if any
            const textInput = document.getElementById('manualTextInput');
            if (textInput && this.finalText) {
                textInput.value = this.finalText;
            }
        }
    }
    
    /**
     * Advanced text processing for CV generation with proper NER categorization
     */
    processTextForCV(text) {
        const cvData = {
            personalInfo: {
                fullName: '',
                email: '',
                phone: '',
                address: '',
                location: ''
            },
            workExperience: [],
            education: [],
            skills: {
                technical: [],
                soft: []
            },
            languages: []
        };
        
        // Enhanced patterns with better context awareness - multilingual support
        const contactPatterns = {
            // English and Hindi patterns
            name: /(?:my name is|i am|i'?m|name is|मेरा नाम है|मेरा नाम|नाम है|मैं हूं)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\s\u0900-\u097F]{1,40})(?=\s*(?:and|,|\.|।|$|my|i|email|phone|live|work|currently|और|मेरा|मैं|मेरी|है))/i,
            email: /(?:email\s+(?:is\s+)?|ईमेल\s*)?([a-zA-Z0-9._%+-]+(?:\s+at\s+|@)[a-zA-Z0-9.-]+\.(?:com|org|net|edu|gov|co|in))/gi,
            phone: /(?:phone\s+(?:number\s+)?(?:is\s+)?|फोन\s*(?:नंबर\s*)?)?([+]?[0-9]{1,3}[\s-]?[0-9]{3,4}[\s-]?[0-9]{3,4}[\s-]?[0-9]{3,4}|[0-9]{10,15})/g,
            location: /(?:live in|from|located in|based in|रहता हूं|रहती हूं|से हूं|में रहता|में रहती|स्थित|निवासी)\s+([a-zA-Z\s,\u0900-\u097F]+?)(?=\s*(?:and|,|\.|।|$|i|my|work|study|currently|और|मैं|मेरा|मेरी))/i
        };
        
        const workPatterns = {
            // English patterns
            currentJob: /(?:currently work|working|work|am working|I work|वर्तमान में काम|काम करता हूं)\s+(?:as|at|के रूप में)?\s*(?:a|an|एक)?\s*([^.,।]+?)(?:\s+(?:at|for|with|में|पर)\s+([^.,।]+?))?(?:\s+for\s+(?:the\s+)?(?:past\s+)?(\d+)\s+(?:years?|साल|वर्ष))?/i,
            previousJob: /(?:before that|previously|earlier|used to work|worked|I was|इससे पहले|पहले|था|काम करता था).*?(?:work|was|worked|काम|था).*?(?:as|at|के रूप में)?\s*(?:a|an|एक)?\s*([^.,।]+?)(?:\s+(?:at|for|with|में|पर)\s+([^.,।]+?))?(?:\s+for\s+(\d+)\s+(?:years?|साल|वर्ष))?/i,
            seniorRole: /(?:I was|was|मैं था|था)\s+(?:a|an|एक)?\s*(senior[^.,।]+?|वरिष्ठ[^.,।]+?)(?:\s+(?:at|for|with|में|पर)\s+([^.,।]+?))?(?:\s+for\s+(\d+)\s+(?:years?|साल|वर्ष))?/i,
            juniorRole: /(?:I was|was|मैं था|था)\s+(?:a|an|एक)?\s*(junior[^.,।]+?|कनिष्ठ[^.,।]+?)(?:\s+(?:at|for|with|में|पर)\s+([^.,।]+?))?(?:\s+for\s+(\d+)\s+(?:years?|साल|वर्ष))?/i,
            experience: /(?:have|with|है|अनुभव)\s+(\d+)\s*(?:years?|yrs?|साल|वर्ष)\s*(?:of|का)?\s*(?:experience|exp|अनुभव)(?:\s+in|में)?\s*([^.।]+)/i,
            generalWork: /(?:been working|working|work|काम करता|काम कर रहा)\s+(?:as|at|के रूप में)?\s*(?:a|an|एक)?\s*([^.।]+?)(?:\s+(?:at|for|with|में|पर)\s+([^.।]+?))?/i
        };
        
        const educationPatterns = {
            // English and Hindi patterns - more comprehensive
            // Pattern 1: "I completed my bachelor of computer science from MIT in 2018"
            degreeWithYear: /(?:completed|graduated|have|पूरा किया|स्नातक|पढ़ाई).*?(?:my)?\s*([Bb]achelor[^.,।]*?|[Mm]aster[^.,।]*?|[Bb]\.[Aa]|[Mm]\.[Aa]|[Bb]\.[Tt]ech|[Bb]\.?[Ss]c|[Mm]\.?[Ss]c|बैचलर[^.,।]*?|मास्टर[^.,।]*?|[Bb]\.?[Ee]\.)\s+(?:from|at|से|में)\s+([A-Z][^.,।]+?)(?:\s+in|\s+during|\s+में|,)?\s*(\d{4})/i,
            // Pattern 2: "bachelor of computer science from MIT"
            degree: /(?:completed|graduated|have|bachelor|master|phd|degree|studied|पूरा किया|स्नातक|डिग्री|पढ़ा).*?(?:my|in|of|मेरा|मेरी)?\s*([^.,।]+?)\s+(?:from|at|से|में)\s+([A-Z][A-Za-z\s\u0900-\u097F]+?)(?:\s+(?:in|year|साल)\s+(\d{4}))?(?:[.,।]|$|\s+I\s|\s+My\s|मेर)/i,
            // Pattern 3: Just degree and institution
            simpleEducation: /(?:bachelor|master|degree|स्नातक|डिग्री)\s+(?:of|in)?\s*([^.,।]+?)\s+(?:from|at|से)\s+([A-Z][A-Za-z\s]+)/i,
            certification: /(?:certified|certification|प्रमाणित|सर्टिफिकेशन)\s+(?:in|of|में|का)?\s*([^.।]+)/i,
            
            // MULTILINGUAL EDUCATION PATTERNS - ALL SUPPORTED LANGUAGES
            // Tamil patterns
            tamilEducation: [
                /(?:படித்தது|கல்வி|படித்தேன்)\s*([^.,।]+?)\s+(?:இல்|அல்)\s+([^.,।]+?)(?:\s+(\d{4}))?/gi,
                /([^.,।]+?)\s*(?:பல்கலைக்கழகம்|கல்லூரி)(?:\s+(\d{4}))?/gi
            ],
            // Telugu patterns  
            teluguEducation: [
                /(?:పటించినాను|విద్య|చదువుకున్నాను)\s*([^.,।]+?)\s+(?:లో|నుండి)\s+([^.,।]+?)(?:\s+(\d{4}))?/gi,
                /([^.,।]+?)\s*(?:విశ్వవిద్యాలయం|కళాశాల)(?:\s+(\d{4}))?/gi
            ],
            // Kannada patterns
            kannadaEducation: [
                /(?:ಪದವಿ ಪಡೆದೇನೆ|ಶಿಕ್ಷಣ|ಓದಿದೇನೆ)\s*([^.,।]+?)\s+(?:ನಲ್ಲಿ|ಇಂದ)\s+([^.,।]+?)(?:\s+(\d{4}))?/gi,
                /([^.,।]+?)\s*(?:ವಿಶ್ವವಿದ್ಯಾಲಯ|ಕಾಲೇಜು)(?:\s+(\d{4}))?/gi
            ],
            // Malayalam patterns
            malayalamEducation: [
                /(?:പഠിച്ചു|വിദ്യാഭ്യാസം|പഠിച്ചത്)\s*([^.,।]+?)\s+(?:ൽ|നിന്ന്)\s+([^.,।]+?)(?:\s+(\d{4}))?/gi,
                /([^.,।]+?)\s*(?:സർവകലാശാല|കോളേജ്)(?:\s+(\d{4}))?/gi
            ],
            // Marathi patterns
            marathiEducation: [
                /(?:पदवी पूर्ण|शिक्षण|अभ्यास)\s*([^.,।]+?)\s+(?:मध्ये|पासून)\s+([^.,।]+?)(?:\s+(\d{4}))?/gi,
                /([^.,।]+?)\s*(?:विद्यापीठ|महाविद्यालय)(?:\s+(\d{4}))?/gi
            ],
            // Gujarati patterns
            gujaratiEducation: [
                /(?:પદવી પૂરી|શિક્ષણ|અભ્યાસ)\s*([^.,।]+?)\s+(?:માં|થી)\s+([^.,।]+?)(?:\s+(\d{4}))?/gi,
                /([^.,।]+?)\s*(?:યુનિવર્સિટી|કોલેજ)(?:\s+(\d{4}))?/gi
            ],
            // Bengali patterns
            bengaliEducation: [
                /(?:পড়াশোনা শেষ|শিক্ষা|অধ্যয়ন)\s*([^.,।]+?)\s+(?:এ|থেকে)\s+([^.,।]+?)(?:\s+(\d{4}))?/gi,
                /([^.,।]+?)\s*(?:বিশ্ববিদ্যালয়|কলেজ)(?:\s+(\d{4}))?/gi
            ],
            // Punjabi patterns
            punjabiEducation: [
                /(?:ਪੜ੍ਹਾਈ ਮੁਕੰਮਲ|ਸਿੱਖਿਆ|ਅਧਿਐਨ)\s*([^.,।]+?)\s+(?:ਵਿੱਚ|ਤੋਂ)\s+([^.,।]+?)(?:\s+(\d{4}))?/gi,
                /([^.,।]+?)\s*(?:ਯੂਨੀਵਰਸਿਟੀ|ਕਾਲਜ)(?:\s+(\d{4}))?/gi
            ]
        };
        
        const skillPatterns = {
            // English patterns
            technical: /(?:technical\s+skills?|my\s+skills?|skills?).*?(?:include|are|:|with|in)\s*([^.!?]*?)(?=\s*(?:\.|!|\?|$|I\s+am|I\s+have|My|also|languages?))/i,
            programming: /(?:programming|coding|development).*?(?:languages?|skills?|experience).*?(?:include|are|:)?\s*([^.!?]+)/i,
            frameworks: /(?:frameworks?|libraries|tools).*?(?:include|are|:)?\s*([^.!?]+)/i,
            // Hindi patterns - more flexible
            skillsHindi: /(?:मेरे?\s+(?:स्किल्स?|कौशल)|स्किल्स?|कौशल|मुझे\s+आता\s+है).*?(?:हैं|हैं|शामिल|में|में|है)?\s*([^.!?।]*?)(?=\s*(?:और|\.|!|\?|।|$|मैं|मेरे|मेरी|भाषा))/i,
            // Generic catch-all pattern - very broad
            allSkills: /(?:skills?|कौशल|abilities|क्षमता)\s*(?:include|are|:|हैं|शामिल|में)?\s*([^.!?।]+?)(?=\s*(?:\.|!|\?|।|$|and|और|I|मैं|languages?|भाषा))/i
        };
        
        const languagePatterns = {
            // English patterns - multiple variations
            fluent: /(?:I'?m\s+fluent\s+in|fluent\s+in|I\s+speak\s+fluent)\s*([^.!?]+?)(?=\s*(?:\.|!|\?|$|and\s+I|I\s+also|My|Skills?))/i,
            speak: /(?:I\s+(?:can\s+)?speak|I\s+know)\s*([^.!?]+?)(?=\s*(?:\.|!|\?|$|and\s+I|I\s+also|My|Skills?))/i,
            languages: /languages?\s*(?:I\s+(?:speak|know))?\s*(?:are|include|:)?\s*([^.!?]+?)(?=\s*(?:\.|!|\?|$|I\s+am|I\s+have|My|Skills?))/i,
            // Hindi patterns
            hindiSpeak: /(?:मैं\s+(?:बोल\s+सकता\s+हूं|बोलता\s+हूं)|मुझे\s+(?:आती\s+है|आती\s+हैं))\s*([^.!?।]+?)(?=\s*(?:\.|!|\?|।|$|और|मैं|मेरे|स्किल))/i,
            hindiLanguages: /भाषाएं\s*(?:हैं|शामिल)?\s*([^.!?।]+?)(?=\s*(?:\.|!|\?|।|$|और|मैं|मेरे|स्किल))/i,
            // Generic broad pattern as final fallback
            general: /(?:languages?|भाषाएं)\s*(?:are|हैं|include|शामिल|:|I\s+know|I\s+speak)?\s*([^.!?।]+?)(?=\s*(?:\.|!|\?|।|$|and|और))/i
        };
        
        // MULTILINGUAL FALLBACK: Try to extract name from ALL supported languages
        console.log('=== MULTILINGUAL NAME EXTRACTION ===');
        
        const multilingualNamePatterns = [
            // English
            /(?:my name is|i am|i'?m|name is)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\s\u0900-\u097F]{1,40})(?=\s*(?:and|,|\.|।|$|my|i|email|phone|live|work|currently|और|मेरा|मैं))/i,
            // Hindi
            /(?:मेरा नाम है|मेरा नाम|नाम है|मैं हूं)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\s\u0900-\u097F]{1,40})(?=\s*(?:और|है|मैं|मेरा))/i,
            // Tamil  
            /(?:என் பெயர்|எனது பெயர்|நான்)\s+([a-zA-Z\u0B80-\u0BFF][a-zA-Z\s\u0B80-\u0BFF]{1,40})(?=\s*(?:ஆகும்|நான்|என்))/i,
            // Telugu
            /(?:నా పేరు|నేను)\s+([a-zA-Z\u0C00-\u0C7F][a-zA-Z\s\u0C00-\u0C7F]{1,40})(?=\s*(?:అని|నేను|నా))/i,
            // Kannada
            /(?:ನನ್ನ ಹೆಸರು|ನಾನು)\s+([a-zA-Z\u0C80-\u0CFF][a-zA-Z\s\u0C80-\u0CFF]{1,40})(?=\s*(?:ಎನ್ನುತ್ತೇನೆ|ನಾನು|ನನ್ನ))/i,
            // Malayalam
            /(?:എന്റെ പേര്|ഞാൻ)\s+([a-zA-Z\u0D00-\u0D7F][a-zA-Z\s\u0D00-\u0D7F]{1,40})(?=\s*(?:ആണ്|ഞാൻ|എന്റെ))/i,
            // Marathi
            /(?:माझे नाव|मी)\s+([a-zA-Z\u0900-\u097F][a-zA-Z\s\u0900-\u097F]{1,40})(?=\s*(?:आहे|मी|माझे))/i,
            // Gujarati
            /(?:મારું નામ|હું)\s+([a-zA-Z\u0A80-\u0AFF][a-zA-Z\s\u0A80-\u0AFF]{1,40})(?=\s*(?:છે|હું|મારું))/i,
            // Bengali
            /(?:আমার নাম|আমি)\s+([a-zA-Z\u0980-\u09FF][a-zA-Z\s\u0980-\u09FF]{1,40})(?=\s*(?:আমি|আমার))/i,
            // Punjabi
            /(?:ਮੇਰਾ ਨਾਮ|ਮੈਂ)\s+([a-zA-Z\u0A00-\u0A7F][a-zA-Z\s\u0A00-\u0A7F]{1,40})(?=\s*(?:ਹੈ|ਮੈਂ|ਮੇਰਾ))/i
        ];
        
        let nameFound = false;
        for (const pattern of multilingualNamePatterns) {
            const nameMatch = text.match(pattern);
            if (nameMatch && !nameFound) {
                cvData.personalInfo.fullName = nameMatch[1].trim().replace(/\s+/g, ' ');
                console.log('MULTILINGUAL: Extracted name:', cvData.personalInfo.fullName);
                nameFound = true;
                break;
            }
        }
        
        // Extract contact information (highest priority - process first)
        console.log('Extracting contact information...');
        
        // Extract name (fallback to original pattern if multilingual didn't work)
        if (!nameFound) {
            const nameMatch = text.match(contactPatterns.name);
            if (nameMatch) {
                cvData.personalInfo.fullName = nameMatch[1].trim().replace(/\s+/g, ' ');
                console.log('Extracted name:', cvData.personalInfo.fullName);
            }
        }
        
        // Extract email
        const emailMatches = text.matchAll(contactPatterns.email);
        for (const match of emailMatches) {
            let email = match[1].replace(/\s+at\s+/, '@').replace(/\s/g, '');
            cvData.personalInfo.email = email;
            console.log('Extracted email:', cvData.personalInfo.email);
            break; // Take first email
        }
        
        // Extract phone - handle various formats including incomplete patterns
        const phoneMatches = text.matchAll(contactPatterns.phone);
        for (const match of phoneMatches) {
            let phone = match[1].replace(/\s+/g, '');
            // If phone seems too short (like "15"), create a placeholder
            if (phone.length < 8) {
                // Look for more context - maybe it's partial speech recognition
                const phoneContext = text.match(/phone\s+number\s+(\d+)/i);
                if (phoneContext) {
                    // Create a placeholder phone number for incomplete recognition
                    phone = `(Phone: ${phoneContext[1]} - incomplete speech recognition)`;
                } else {
                    phone = `(Phone: ${phone} - please verify)`;
                }
            }
            cvData.personalInfo.phone = phone;
            console.log('Extracted phone:', cvData.personalInfo.phone);
            break; // Take first phone
        }
        
        // Extract location
        const locationMatch = text.match(contactPatterns.location);
        if (locationMatch) {
            cvData.personalInfo.location = locationMatch[1].trim();
            console.log('Extracted location:', cvData.personalInfo.location);
        }
        
        // Extract work experience
        console.log('Extracting work experience...');
        
        // Comprehensive multilingual work experience patterns for ALL supported languages
        const workExperienceTexts = [
            // English: "I was a junior software engineer at TechCorp for 4 years"
            /(?:I was|was)\s+(?:a|an)?\s*([^.,।]+?)\s+at\s+([^.,।]+?)\s+for\s+(\d+)\s+(?:years?|yrs?)/gi,
            // English: "Before that I was a junior developer at Startup XYZ for 2 years"
            /(?:before that|previously)\s+(?:I was|was)\s+(?:a|an)?\s*([^.,।]+?)\s+at\s+([^.,।]+?)\s+for\s+(\d+)\s+(?:years?|yrs?)/gi,
            // English: "I currently work as a senior [role]"
            /(?:currently work|working as|work as|I work as)\s+(?:a|an)?\s*([^.,।]+?)(?:\s+(?:at|for|with|in)\s+([^.,।]+?))?/gi,
            
            // Hindi patterns - comprehensive
            /(?:मैं था|था)\s+(?:एक)?\s*([^.,।]+?)\s+(?:में|पर)\s+([^.,।]+?)(?:\s+(?:के लिए)?\s+(\d+)\s+(?:साल|वर्ष))?/gi,
            /(?:इससे पहले|पहले)\s+(?:मैं था|था)\s+(?:एक)?\s*([^.,।]+?)(?:\s+(?:में|पर)\s+([^.,।]+?))?(?:\s+(\d+)\s+(?:साल|वर्ष))?/gi,
            /(?:वर्तमान में काम|काम करता हूं|काम कर रहा हूं)\s+(?:के रूप में)?\s*([^.,।]+?)(?:\s+(?:में|पर)\s+([^.,।]+?))?/gi,
            /(?:काम|नौकरी|पद)\s*(?:करता हूं|है)?\s*([^.,।]+?)\s+(?:में|पर)\s+([^.,।]+?)(?:\s+(\d+)\s+(?:साल|वर्ष))?/gi,
            
            // Tamil patterns
            /(?:நான் இருந்தேன்|நான்)\s+(?:ஒரு)?\s*([^.,।]+?)\s+(?:இல்|அல்)?\s+([^.,।]+?)(?:\s+(?:க்காக)?\s+(\d+)\s+(?:வருடம்|ஆண்டு))?/gi,
            /(?:இதற்கு முன்|முன்பு)\s+(?:நான் இருந்தேன்|நான்)\s+(?:ஒரு)?\s*([^.,।]+?)(?:\s+(?:இல்|அல்)\s+([^.,।]+?))?(?:\s+(\d+)\s+(?:வருடம்|ஆண்டு))?/gi,
            /(?:தற்போது வேலை|வேலை செய்கிறேன்)\s+(?:என்று)?\s*([^.,।]+?)(?:\s+(?:இல்|அல்)\s+([^.,।]+?))?/gi,
            /(?:வேலை|பணி|பொறுப்பு)\s*(?:செய்கிறேன்)?\s*([^.,।]+?)\s+(?:இல்|அல்)\s+([^.,।]+?)(?:\s+(\d+)\s+(?:வருடம்|ஆண்டு))?/gi,
            
            // Telugu patterns
            /(?:నేను ఉన్నాను|నేను)\s+(?:ఒక)?\s*([^.,।]+?)\s+(?:లో|వద్ద)?\s+([^.,।]+?)(?:\s+(?:కోసం)?\s+(\d+)\s+(?:సంవత్సరం|సంవత్సరాలు))?/gi,
            /(?:అంతకు మునుపు|మునుపు)\s+(?:నేను ఉన్నాను|నేను)\s+(?:ఒక)?\s*([^.,।]+?)(?:\s+(?:లో|వద్ద)\s+([^.,।]+?))?(?:\s+(\d+)\s+(?:సంవత్సరం|సంవత్సరాలు))?/gi,
            /(?:ప్రస్తుతం పని|పని చేస్తున్నాను)\s+(?:గా)?\s*([^.,।]+?)(?:\s+(?:లో|వద్ద)\s+([^.,।]+?))?/gi,
            /(?:పని|ఉద్యోగం|స్థానం)\s*(?:చేస్తున్నాను)?\s*([^.,।]+?)\s+(?:లో|వద్ద)\s+([^.,।]+?)(?:\s+(\d+)\s+(?:సంవత్సరం|సంవత్సరాలు))?/gi,
            
            // Kannada patterns
            /(?:ನಾನು ಇದ್ದೇನೆ|ನಾನು)\s+(?:ಒಂದು)?\s*([^.,।]+?)\s+(?:ನಲ್ಲಿ|ಯಲ್ಲಿ)?\s+([^.,।]+?)(?:\s+(?:ಕಾಗಿ)?\s+(\d+)\s+(?:ವರ್ಷ|ವರ್ಷಗಳು))?/gi,
            /(?:ಅದಕ್ಕೆ ಮೊದಲು|ಮೊದಲು)\s+(?:ನಾನು ಇದ್ದೇನೆ|ನಾನು)\s+(?:ಒಂದು)?\s*([^.,।]+?)(?:\s+(?:ನಲ್ಲಿ|ಯಲ್ಲಿ)\s+([^.,।]+?))?(?:\s+(\d+)\s+(?:ವರ್ಷ|ವರ್ಷಗಳು))?/gi,
            /(?:ಪ್ರಸ್ತುತ ಕೆಲಸ|ಕೆಲಸ ಮಾಡುತ್ತಿದ್ದೇನೆ)\s+(?:ಎಂದು)?\s*([^.,।]+?)(?:\s+(?:ನಲ್ಲಿ|ಯಲ್ಲಿ)\s+([^.,।]+?))?/gi,
            /(?:ಕೆಲಸ|ಉದ್ಯೋಗ|ಸ್ಥಾನ)\s*(?:ಮಾಡುತ್ತಿದ್ದೇನೆ)?\s*([^.,।]+?)\s+(?:ನಲ್ಲಿ|ಯಲ್ಲಿ)\s+([^.,।]+?)(?:\s+(\d+)\s+(?:ವರ್ಷ|ವರ್ಷಗಳು))?/gi,
            
            // Malayalam patterns
            /(?:ഞാൻ ആയിരുന്നു|ഞാൻ)\s+(?:ഒരു)?\s*([^.,।]+?)\s+(?:ൽ|യിൽ)?\s+([^.,।]+?)(?:\s+(?:ന്)?\s+(\d+)\s+(?:വർഷം|വർഷങ്ങൾ))?/gi,
            /(?:അതിനു മുൻപ്|മുൻപ്)\s+(?:ഞാൻ ആയിരുന്നു|ഞാൻ)\s+(?:ഒരു)?\s*([^.,।]+?)(?:\s+(?:ൽ|യിൽ)\s+([^.,।]+?))?(?:\s+(\d+)\s+(?:വർഷം|വർഷങ്ങൾ))?/gi,
            /(?:ഇപ്പോൾ പണി|പണി ചെയ്യുന്നു)\s+(?:എന്ന്)?\s*([^.,।]+?)(?:\s+(?:ൽ|യിൽ)\s+([^.,।]+?))?/gi,
            /(?:പണി|ജോലി|സ്ഥാനം)\s*(?:ചെയ്യുന്നു)?\s*([^.,।]+?)\s+(?:ൽ|യിൽ)\s+([^.,।]+?)(?:\s+(\d+)\s+(?:വർഷം|വർഷങ്ങൾ))?/gi,
            
            // Marathi patterns
            /(?:मी होतो|मी)\s+(?:एक)?\s*([^.,।]+?)\s+(?:मध्ये|वर)?\s+([^.,।]+?)(?:\s+(?:साठी)?\s+(\d+)\s+(?:वर्ष|वर्षे))?/gi,
            /(?:त्याआधी|आधी)\s+(?:मी होतो|मी)\s+(?:एक)?\s*([^.,।]+?)(?:\s+(?:मध्ये|वर)\s+([^.,।]+?))?(?:\s+(\d+)\s+(?:वर्ष|वर्षे))?/gi,
            /(?:सध्या काम|काम करतो)\s+(?:म्हणून)?\s*([^.,।]+?)(?:\s+(?:मध्ये|वर)\s+([^.,।]+?))?/gi,
            /(?:काम|नोकरी|पद)\s*(?:करतो)?\s*([^.,।]+?)\s+(?:मध्ये|वर)\s+([^.,।]+?)(?:\s+(\d+)\s+(?:वर्ष|वर्षे))?/gi,
            
            // Gujarati patterns
            /(?:હું હતો|હું)\s+(?:એક)?\s*([^.,।]+?)\s+(?:માં|પર)?\s+([^.,।]+?)(?:\s+(?:માટે)?\s+(\d+)\s+(?:વર્ષ|વર્ષો))?/gi,
            /(?:તે પહેલાં|પહેલાં)\s+(?:હું હતો|હું)\s+(?:એક)?\s*([^.,।]+?)(?:\s+(?:માં|પર)\s+([^.,।]+?))?(?:\s+(\d+)\s+(?:વર્ષ|વર્ષો))?/gi,
            /(?:હાલ કામ|કામ કરું છું)\s+(?:તરીકે)?\s*([^.,।]+?)(?:\s+(?:માં|પર)\s+([^.,।]+?))?/gi,
            /(?:કામ|નોકરી|પદ)\s*(?:કરું છું)?\s*([^.,।]+?)\s+(?:માં|પર)\s+([^.,।]+?)(?:\s+(\d+)\s+(?:વર્ષ|વર્ષો))?/gi,
            
            // Bengali patterns
            /(?:আমি ছিলাম|আমি)\s+(?:একজন)?\s*([^.,।]+?)\s+(?:এ|তে)?\s+([^.,।]+?)(?:\s+(?:র জন্য)?\s+(\d+)\s+(?:বছর|বছর))?/gi,
            /(?:তার আগে|আগে)\s+(?:আমি ছিলাম|আমি)\s+(?:একজন)?\s*([^.,।]+?)(?:\s+(?:এ|তে)\s+([^.,।]+?))?(?:\s+(\d+)\s+(?:বছর|বছর))?/gi,
            /(?:বর্তমানে কাজ|কাজ করছি)\s+(?:হিসেবে)?\s*([^.,।]+?)(?:\s+(?:এ|তে)\s+([^.,।]+?))?/gi,
            /(?:কাজ|চাকরি|পদ)\s*(?:করছি)?\s*([^.,।]+?)\s+(?:এ|তে)\s+([^.,।]+?)(?:\s+(\d+)\s+(?:বছর|বছর))?/gi,
            
            // Punjabi patterns
            /(?:ਮੈਂ ਸੀ|ਮੈਂ)\s+(?:ਇੱਕ)?\s*([^.,।]+?)\s+(?:ਵਿੱਚ|ਤੇ)?\s+([^.,।]+?)(?:\s+(?:ਲਈ)?\s+(\d+)\s+(?:ਸਾਲ|ਸਾਲ))?/gi,
            /(?:ਉਸ ਤੋਂ ਪਹਿਲਾਂ|ਪਹਿਲਾਂ)\s+(?:ਮੈਂ ਸੀ|ਮੈਂ)\s+(?:ਇੱਕ)?\s*([^.,।]+?)(?:\s+(?:ਵਿੱਚ|ਤੇ)\s+([^.,।]+?))?(?:\s+(\d+)\s+(?:ਸਾਲ|ਸਾਲ))?/gi,
            /(?:ਵਰਤਮਾਨ ਵਿੱਚ ਕੰਮ|ਕੰਮ ਕਰਦਾ ਹਾਂ)\s+(?:ਵਜੋਂ)?\s*([^.,।]+?)(?:\s+(?:ਵਿੱਚ|ਤੇ)\s+([^.,।]+?))?/gi,
            /(?:ਕੰਮ|ਨੌਕਰੀ|ਅਹੁਦਾ)\s*(?:ਕਰਦਾ ਹਾਂ)?\s*([^.,।]+?)\s+(?:ਵਿੱਚ|ਤੇ)\s+([^.,।]+?)(?:\s+(\d+)\s+(?:ਸਾਲ|ਸਾਲ))?/gi
        ];
        
        // Extract all work experiences from the text
        for (const pattern of workExperienceTexts) {
            const matches = [...text.matchAll(pattern)];
            for (const match of matches) {
                let jobTitle = match[1] ? match[1].trim() : '';
                let company = match[2] ? match[2].trim() : '';
                let duration = match[3] ? `${match[3]} years` : '';
                
                // Clean up job title - remove trailing prepositions/conjunctions
                jobTitle = jobTitle.replace(/\s+(at|in|for|with|और|में|पर|के|की)$/i, '').trim();
                company = company.replace(/\s+(for|with|और|के|की)$/i, '').trim();
                
                if (jobTitle && jobTitle.length > 3) {
                    // Determine if this is a current or previous role
                    const isCurrent = /currently|work as|working as|वर्तमान में|काम करता/i.test(match[0]);
                    const isPrevious = /before|previously|was|था|पहले/i.test(match[0]);
                    
                    // Set defaults if company or duration not found
                    if (!company) {
                        company = 'Company';
                    }
                    if (!duration) {
                        duration = isCurrent ? 'Present' : 'Previous';
                    }
                    
                    // Check if already exists (avoid duplicates)
                    const exists = cvData.workExperience.some(job => 
                        job.jobTitle.toLowerCase().includes(jobTitle.toLowerCase().substring(0, Math.min(10, jobTitle.length)))
                    );
                    
                    if (!exists) {
                        cvData.workExperience.push({
                            jobTitle: jobTitle,
                            company: company,
                            duration: duration,
                            description: `${jobTitle} at ${company}`,
                            isCurrent: isCurrent && !isPrevious
                        });
                        console.log(`Extracted ${isCurrent ? 'current' : 'previous'} job:`, jobTitle, 'at', company, 'for', duration);
                    }
                }
            }
        }
        
        // Add fallback for any remaining unmatched work experience
        if (cvData.workExperience.length === 0) {
            const generalWorkMatch = text.match(workPatterns.generalWork);
            if (generalWorkMatch) {
                const jobTitle = generalWorkMatch[1].trim();
                const company = generalWorkMatch[2] ? generalWorkMatch[2].trim() : 'Company';
                
                cvData.workExperience.push({
                    jobTitle: jobTitle,
                    company: company,
                    duration: 'Recent',
                    description: `${jobTitle} at ${company}`,
                    isCurrent: true
                });
                console.log('Extracted fallback work:', jobTitle, 'at', company);
            }
        }
        
        // Extract education with improved patterns
        console.log('Extracting education...');
        
        let educationExtracted = false;
        
        // Try pattern 1: With year
        const degreeWithYearMatch = text.match(educationPatterns.degreeWithYear);
        if (degreeWithYearMatch) {
            let degree = degreeWithYearMatch[1].trim();
            let institution = degreeWithYearMatch[2].trim();
            let year = degreeWithYearMatch[3] || 'Recent';
            
            // Clean up institution name - remove trailing words
            institution = institution.replace(/\s+(in|from|at|में|से).*$/i, '').trim();
            
            cvData.education.push({
                degree: degree,
                institution: institution,
                year: year,
                details: `${degree} from ${institution} (${year})`
            });
            console.log('Extracted education with year:', degree, 'from', institution, 'in', year);
            educationExtracted = true;
        }
        
        // Try pattern 2: General degree pattern
        if (!educationExtracted) {
            const degreeMatch = text.match(educationPatterns.degree);
            if (degreeMatch) {
                let degree = degreeMatch[1].trim();
                let institution = degreeMatch[2].trim();
                let year = degreeMatch[3] || 'Recent';
                
                // Clean up institution and degree
                institution = institution.replace(/\s+(in|from|at|I|My|में|से|मेर).*$/i, '').trim();
                degree = degree.replace(/\s+(from|at|से).*$/i, '').trim();
                
                if (institution.length > 1) {
                    cvData.education.push({
                        degree: degree,
                        institution: institution,
                        year: year,
                        details: `${degree} from ${institution}`
                    });
                    console.log('Extracted education:', degree, 'from', institution, year);
                    educationExtracted = true;
                }
            }
        }
        
        // Try pattern 3: Simple education pattern
        if (!educationExtracted) {
            const simpleEduMatch = text.match(educationPatterns.simpleEducation);
            if (simpleEduMatch) {
                const degree = simpleEduMatch[1].trim();
                const institution = simpleEduMatch[2].trim();
                
                cvData.education.push({
                    degree: degree,
                    institution: institution,
                    year: 'Recent',
                    details: `${degree} from ${institution}`
                });
                console.log('Extracted simple education:', degree, 'from', institution);
                educationExtracted = true;
            }
        }
        
        // MULTILINGUAL EDUCATION EXTRACTION - Try all supported languages
        if (!educationExtracted) {
            console.log('Trying multilingual education patterns...');
            
            const allEducationPatterns = [
                ...educationPatterns.tamilEducation,
                ...educationPatterns.teluguEducation,
                ...educationPatterns.kannadaEducation,
                ...educationPatterns.malayalamEducation,
                ...educationPatterns.marathiEducation,
                ...educationPatterns.gujaratiEducation,
                ...educationPatterns.bengaliEducation,
                ...educationPatterns.punjabiEducation
            ];
            
            for (const pattern of allEducationPatterns) {
                const matches = [...text.matchAll(pattern)];
                for (const match of matches) {
                    if (match[1] && match[2]) {
                        const degree = match[1].trim();
                        const institution = match[2].trim();
                        const year = match[3] || 'Recent';
                        
                        cvData.education.push({
                            degree: degree,
                            institution: institution,
                            year: year,
                            details: `${degree} from ${institution}` + (year !== 'Recent' ? ` (${year})` : '')
                        });
                        console.log('MULTILINGUAL: Extracted education:', degree, 'from', institution, year);
                        educationExtracted = true;
                        break;
                    }
                }
                if (educationExtracted) break;
            }
        }
        
        // Extract skills with improved patterns
        console.log('Extracting skills...');
        
        let skillsText = '';
        let skillsMatch = text.match(skillPatterns.technical) || 
                         text.match(skillPatterns.programming) || 
                         text.match(skillPatterns.frameworks) ||
                         text.match(skillPatterns.skillsHindi) ||
                         text.match(skillPatterns.allSkills);
        
        if (skillsMatch) {
            skillsText = skillsMatch[1];
            console.log('Raw skills text:', skillsText);
            
            // Enhanced splitting and cleaning
            const skills = skillsText
                .split(/,|\s+and\s+|\s+और\s+|;|\n/i)
                .map(skill => skill.trim())
                .filter(skill => skill.length > 1 && !skill.match(/^(and|or|with|also|have|experience|in|I|my|are|include|हैं|शामिल|और|मैं)$/i))
                .map(skill => {
                    // Clean up conjunctions and extra words from both languages
                    return skill.replace(/^(and|or|with|also|और|तथा)\s+/i, '')
                               .replace(/\s+(and|or|with|also|और|तथा)$/i, '')
                               .replace(/[,.;।]+$/, '')
                               .trim();
                })
                .filter(skill => skill.length > 1 && !skill.match(/^(I|my|me|मैं|मेरे|का|की|के)$/i));
            
            cvData.skills.technical = skills;
            console.log('Extracted and cleaned skills:', skills);
        }
        
        // Fallback: try to extract technology names directly from text
        if (cvData.skills.technical.length === 0) {
            const techKeywords = /(JavaScript|Python|React|Node\.?js|MongoDB|HTML|CSS|Java|C\+\+|Angular|Vue|PHP|SQL|MySQL|PostgreSQL|Docker|Git|AWS|Azure)/gi;
            const techMatches = text.match(techKeywords);
            if (techMatches) {
                cvData.skills.technical = [...new Set(techMatches)]; // Remove duplicates
                console.log('Extracted skills using fallback pattern:', cvData.skills.technical);
            }
        }
        
        // Extract languages with multilingual support
        console.log('Extracting languages...');
        
        let langsText = '';
        let langMatch = text.match(languagePatterns.fluent) || 
                       text.match(languagePatterns.speak) ||
                       text.match(languagePatterns.languages) ||
                       text.match(languagePatterns.hindiSpeak) ||
                       text.match(languagePatterns.hindiLanguages) ||
                       text.match(languagePatterns.general);
        
        if (langMatch) {
            langsText = langMatch[1];
            console.log('Raw languages text:', langsText);
            
            // Enhanced language splitting and cleaning
            const langs = langsText
                .split(/,|\s+and\s+|\s+और\s+|;|\n/i)
                .map(lang => lang.trim())
                .filter(lang => lang.length > 1 && !lang.match(/^(and|or|also|in|I|my|have|strong|good|हैं|और|मैं|मेरे)$/i))
                .map(lang => {
                    // Clean up language names - remove adjectives and extra words
                    return lang.replace(/^(fluent\s+|good\s+|strong\s+|native\s+|अच्छी\s+|धाराप्रवाह\s+)/i, '')
                              .replace(/[,.;।]+$/, '')
                              .trim();
                })
                .filter(lang => lang.length > 1);
                
            cvData.languages = langs.map(lang => ({ 
                name: lang, 
                proficiency: 'Fluent' 
            }));
            console.log('Extracted and cleaned languages:', langs);
        }
        
        // Fallback: extract common language names directly
        if (cvData.languages.length === 0) {
            const languageKeywords = /(English|Hindi|Spanish|French|German|Chinese|Japanese|Arabic|Russian|Portuguese|Italian|Dutch|Korean|Swedish|Norwegian|Danish|हिंदी|अंग्रेजी)/gi;
            const langMatches = text.match(languageKeywords);
            if (langMatches) {
                const uniqueLanguages = [...new Set(langMatches)];
                cvData.languages = uniqueLanguages.map(lang => ({
                    name: lang,
                    proficiency: 'Fluent'
                }));
                console.log('Extracted languages using fallback pattern:', uniqueLanguages);
            }
        }
        
        // EMERGENCY: Very specific Hindi patterns for the exact transcription format
        console.log('=== EMERGENCY HINDI PATTERNS ===');
        
        // Try to extract from the exact Hindi format we're seeing
        const emergencyHindiMatch = text.match(/मेरा नाम ([^है]+) है[\s\S]*?([बीटेक|स्नातक][^\s][\s\S]*?)\s*से\s*कर\s*रही\s*हैं[\s\S]*?स्केट्स\s*([^\s]+(?:\s+[^\s]+){0,10})[\s\S]*?([हिंदी|इंग्लिश][^।]*)/i);
        
        if (emergencyHindiMatch) {
            console.log('EMERGENCY: Found specific Hindi pattern match!');
            
            // Extract name
            if (emergencyHindiMatch[1] && !cvData.personalInfo.fullName) {
                cvData.personalInfo.fullName = emergencyHindiMatch[1].trim();
                console.log('EMERGENCY: Extracted name:', cvData.personalInfo.fullName);
            }
            
            // Extract education
            if (emergencyHindiMatch[2] && cvData.education.length === 0) {
                const eduText = emergencyHindiMatch[2].trim();
                cvData.education.push({
                    degree: eduText.split(' ').slice(0, 5).join(' '), // First few words as degree
                    institution: eduText.split(' ').slice(-5).join(' '), // Last few words as institution
                    year: 'Recent',
                    details: eduText
                });
                console.log('EMERGENCY: Extracted education:', eduText);
            }
            
            // Extract skills
            if (emergencyHindiMatch[3] && cvData.skills.technical.length === 0) {
                const skillsText = emergencyHindiMatch[3].trim();
                const skills = skillsText.split(/\s+/)
                    .map(skill => {
                        // Convert Hindi transliterations to English
                        const skillMap = {
                            'पाइथन': 'Python',
                            'जेसन': 'JSON', 
                            'जावस्कप': 'JavaScript',
                            'यसस': 'CSS',
                            'रिएक्ट': 'React',
                            'नोड': 'Node.js'
                        };
                        return skillMap[skill] || skill;
                    })
                    .filter(skill => skill.length > 1);
                
                cvData.skills.technical = skills;
                console.log('EMERGENCY: Extracted skills:', skills);
            }
            
            // Extract languages
            if (emergencyHindiMatch[4] && cvData.languages.length === 0) {
                const langText = emergencyHindiMatch[4].trim();
                const langs = langText.split(/\s+और\s+|\s+/)
                    .map(lang => {
                        const langMap = {
                            'इंग्लिश': 'English',
                            'हिंदी': 'Hindi'
                        };
                        return langMap[lang] || lang;
                    })
                    .filter(lang => lang.length > 2);
                
                cvData.languages = langs.map(lang => ({
                    name: lang,
                    proficiency: 'Fluent'
                }));
                console.log('EMERGENCY: Extracted languages:', langs);
            }
        }
        
        // Simple word-based extraction for Hindi text
        console.log('=== SIMPLE HINDI WORD EXTRACTION ===');
        
        // Extract name after "मेरा नाम"
        if (!cvData.personalInfo.fullName) {
            const namePattern = /मेरा नाम ([^हैमैं]+)/i;
            const nameMatch = text.match(namePattern);
            if (nameMatch) {
                cvData.personalInfo.fullName = nameMatch[1].trim();
                console.log('SIMPLE: Extracted name:', cvData.personalInfo.fullName);
            }
        }
        
        // Extract education keywords
        if (cvData.education.length === 0) {
            const educationKeywords = ['बीटेक', 'स्नातक', 'डिग्री', 'बैचलर', 'मास्टर'];
            const institutionKeywords = ['विवेकानंदा', 'इंस्टीट्यूट', 'यूनिवर्सिटी', 'कॉलेज'];
            
            let foundEducation = false;
            educationKeywords.forEach(keyword => {
                if (text.includes(keyword) && !foundEducation) {
                    // Find the context around the education keyword
                    const eduIndex = text.indexOf(keyword);
                    const before = text.substring(Math.max(0, eduIndex - 50), eduIndex);
                    const after = text.substring(eduIndex, Math.min(text.length, eduIndex + 100));
                    
                    let institution = 'University';
                    institutionKeywords.forEach(instKeyword => {
                        if (after.includes(instKeyword)) {
                            const instIndex = after.indexOf(instKeyword);
                            institution = after.substring(instIndex, instIndex + 20).trim();
                        }
                    });
                    
                    cvData.education.push({
                        degree: keyword,
                        institution: institution,
                        year: 'Recent',
                        details: after.substring(0, 50)
                    });
                    console.log('SIMPLE: Extracted education:', keyword, 'from', institution);
                    foundEducation = true;
                }
            });
        }
        
        // MULTILINGUAL SKILLS EXTRACTION
        if (cvData.skills.technical.length === 0) {
            console.log('=== MULTILINGUAL SKILLS EXTRACTION ===');
            
            // Comprehensive multilingual skill mapping
            const multilingualSkillMap = {
                // English (original terms)
                'Python': 'Python',
                'JavaScript': 'JavaScript', 
                'Java': 'Java',
                'React': 'React',
                'Node.js': 'Node.js',
                'CSS': 'CSS',
                'HTML': 'HTML',
                'JSON': 'JSON',
                'SQL': 'SQL',
                'MongoDB': 'MongoDB',
                
                // Hindi transliterations
                'पाइथन': 'Python',
                'जेसन': 'JSON',
                'जावास्क्रिप्ट': 'JavaScript',
                'जावस्कप': 'JavaScript',
                'रिएक्ट': 'React',
                'नोड': 'Node.js',
                'सीएसएस': 'CSS',
                'यसस': 'CSS',
                'एचटीएमएल': 'HTML',
                
                // Tamil transliterations
                'பைதான்': 'Python',
                'ஜாவாஸ்க்ரிப்ட்': 'JavaScript',
                'ரியாக்ட்': 'React',
                
                // Telugu transliterations
                'పైథాన్': 'Python',
                'జావాస్క్రిప్ట్': 'JavaScript',
                'రియాక్ట్': 'React',
                
                // Kannada transliterations
                'ಪೈಥಾನ್': 'Python',
                'ಜಾವಾಸ್ಕ್ರಿಪ್ಟ್': 'JavaScript',
                'ರಿಯಾಕ್ಟ್': 'React',
                
                // Malayalam transliterations
                'പൈത്തൻ': 'Python',
                'ജാവാസ്ക്രിപ്റ്റ്': 'JavaScript',
                'രിയാക്റ്': 'React',
                
                // Marathi transliterations
                'पायथन': 'Python',
                'जावास्क्रिप्ट': 'JavaScript',
                'रिअॅक्ट': 'React',
                
                // Gujarati transliterations
                'પાઇથાન': 'Python',
                'જાવાસ્ક્રિપ્ટ': 'JavaScript',
                'રિએક્ટ': 'React',
                
                // Bengali transliterations
                'পাইথন': 'Python',
                'জাভাস্ক্রিপ্ট': 'JavaScript',
                'রিয়াক্ট': 'React',
                
                // Punjabi transliterations  
                'ਪਾਈਥਨ': 'Python',
                'ਜਾਵਾਸਕਰਿਪਟ': 'JavaScript',
                'ਰੀਏਕਟ': 'React'
            };
            
            const foundSkills = [];
            Object.keys(multilingualSkillMap).forEach(skill => {
                if (text.toLowerCase().includes(skill.toLowerCase()) || text.includes(skill)) {
                    const englishSkill = multilingualSkillMap[skill];
                    if (!foundSkills.includes(englishSkill)) {
                        foundSkills.push(englishSkill);
                        console.log('MULTILINGUAL: Found skill:', skill, '->', englishSkill);
                    }
                }
            });
            
            if (foundSkills.length > 0) {
                cvData.skills.technical = foundSkills;
            }
        }
        
        // MULTILINGUAL LANGUAGES EXTRACTION
        if (cvData.languages.length === 0) {
            console.log('=== MULTILINGUAL LANGUAGES EXTRACTION ===');
            
            const multilingualLanguageMap = {
                // English
                'English': 'English',
                'Hindi': 'Hindi',
                'Tamil': 'Tamil',
                'Telugu': 'Telugu', 
                'Kannada': 'Kannada',
                'Malayalam': 'Malayalam',
                'Marathi': 'Marathi',
                'Gujarati': 'Gujarati',
                'Bengali': 'Bengali',
                'Punjabi': 'Punjabi',
                'Spanish': 'Spanish',
                'French': 'French',
                'German': 'German',
                
                // Hindi
                'इंग्लिश': 'English',
                'हिंदी': 'Hindi',
                'तमिल': 'Tamil',
                'तेलुगू': 'Telugu',
                'कन्नड': 'Kannada',
                'मलयालम': 'Malayalam',
                'मराठी': 'Marathi',
                'गुजराती': 'Gujarati',
                'बंगाली': 'Bengali',
                'पंजाबी': 'Punjabi',
                
                // Tamil
                'ஆங்கிலம்': 'English',
                'ஹிந்தி': 'Hindi',
                'தமிழ்': 'Tamil',
                'தெலுங்கு': 'Telugu',
                
                // Telugu
                'ఇంగ్లీషు': 'English',
                'హిందీ': 'Hindi',
                'తెలుగు': 'Telugu',
                'తమిళ్': 'Tamil',
                
                // Kannada
                'ಇಂಗ್ಲೀಷ್': 'English', 
                'ಹಿಂದಿ': 'Hindi',
                'ಕನ್ನಡ': 'Kannada',
                
                // Malayalam
                'ഇങ്ഗ്ലീഷ്': 'English',
                'ഹിന്ദി': 'Hindi',
                'മലയാളം': 'Malayalam',
                
                // Marathi 
                'इंग्रजी': 'English',
                'हिंदी': 'Hindi',
                'मराठी': 'Marathi',
                
                // Gujarati
                'ઇંગ્રેજી': 'English',
                'હિન્દી': 'Hindi',
                'ગુજરાતી': 'Gujarati',
                
                // Bengali
                'ইংরেজি': 'English',
                'হিন্দী': 'Hindi', 
                'বাংলা': 'Bengali',
                
                // Punjabi
                'ਅੰਗਰੇਜੀ': 'English',
                'ਹਿੰਦੀ': 'Hindi',
                'ਪੰਜਾਬੀ': 'Punjabi'
            };
            
            const foundLangs = [];
            const foundLangNames = new Set();
            
            Object.keys(multilingualLanguageMap).forEach(langKey => {
                if (text.toLowerCase().includes(langKey.toLowerCase()) || text.includes(langKey)) {
                    const englishLang = multilingualLanguageMap[langKey];
                    if (!foundLangNames.has(englishLang)) {
                        foundLangs.push({
                            name: englishLang,
                            proficiency: 'Fluent'
                        });
                        foundLangNames.add(englishLang);
                        console.log('MULTILINGUAL: Found language:', langKey, '->', englishLang);
                    }
                }
            });
            
            if (foundLangs.length > 0) {
                cvData.languages = foundLangs;
            }
        }
        
        console.log('=== END SIMPLE HINDI WORD EXTRACTION ===');
        console.log('=== END EMERGENCY HINDI PATTERNS ===');
        
        // Add comprehensive fallback extraction for cases where main patterns don't match
        console.log('=== FALLBACK EXTRACTION CHECK ===');
        
        // If we didn't extract work experience, try more aggressive patterns
        if (cvData.workExperience.length === 0) {
            console.log('No work experience found, trying aggressive fallback patterns...');
            
            // Try to find ANY mention of job titles (English + Hindi)
            const jobKeywords = /(?:senior|junior|lead|principal)?\s*(?:software\s+)?(?:engineer|developer|manager|designer|analyst|consultant|architect|specialist|coordinator|administrator|programmer|tester|इंजीनियर|सॉफ्टवेयर|डेवलपर|प्रबंधक|विशेषज्ञ|निर्देशक)/gi;
            const jobMatches = [...new Set(text.match(jobKeywords) || [])];
            
            if (jobMatches.length > 0) {
                jobMatches.forEach((job, index) => {
                    cvData.workExperience.push({
                        jobTitle: job.trim(),
                        company: 'Company',
                        duration: index === 0 ? 'Present' : 'Previous',
                        description: job.trim(),
                        isCurrent: index === 0
                    });
                    console.log(`Extracted job ${index + 1} from keywords:`, job.trim());
                });
            }
            
            // Try Hindi work patterns - very aggressive
            const hindiWorkPattern = /(इंजीनियर|डेवलपर|प्रोग्रामर)/gi;
            const hindiJobs = text.match(hindiWorkPattern);
            if (hindiJobs && cvData.workExperience.length === 0) {
                cvData.workExperience.push({
                    jobTitle: hindiJobs[0],
                    company: 'Company',
                    duration: 'Recent',
                    description: hindiJobs[0],
                    isCurrent: true
                });
                console.log('Extracted Hindi job from keywords:', hindiJobs[0]);
            }
        }
        
        // If we didn't extract education, try fallback
        if (cvData.education.length === 0) {
            console.log('No education found, trying fallback patterns...');
            
            const eduKeywords = /(?:bachelor|master|phd|degree|university|college|institute|स्नातक|मास्टर|डिग्री|विश्वविद्यालय)/gi;
            const eduMatches = text.match(eduKeywords);
            if (eduMatches && eduMatches.length > 0) {
                cvData.education.push({
                    degree: eduMatches[0],
                    institution: 'University',
                    year: 'Recent',
                    details: eduMatches[0]
                });
                console.log('Extracted education from keywords:', eduMatches[0]);
            }
        }
        
        console.log('=== END FALLBACK EXTRACTION ===');
        
        // ENHANCED PROFESSIONAL SUMMARY CLEANUP - Remove all extracted multilingual content
        let remainingText = text;
        
        console.log('=== PROFESSIONAL SUMMARY CLEANUP ===');
        console.log('Original text length:', remainingText.length);
        
        // Remove all extracted contact information patterns (multilingual)
        if (cvData.personalInfo.fullName) {
            // Remove English name patterns
            remainingText = remainingText.replace(new RegExp(`(?:my name is|i am|i'?m|name is)\\s*${cvData.personalInfo.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '');
            // Remove Hindi name patterns
            remainingText = remainingText.replace(new RegExp(`(?:मेरा नाम है|मेरा नाम|नाम है|मैं हूं)\\s*${cvData.personalInfo.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '');
            // Remove other language name patterns
            remainingText = remainingText.replace(new RegExp(cvData.personalInfo.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        }
        
        if (cvData.personalInfo.email) {
            remainingText = remainingText.replace(new RegExp(cvData.personalInfo.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
        }
        
        if (cvData.personalInfo.phone && !cvData.personalInfo.phone.includes('incomplete')) {
            remainingText = remainingText.replace(new RegExp(cvData.personalInfo.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
        }
        
        // Remove ALL work experience content (multilingual)
        cvData.workExperience.forEach(job => {
            if (job.jobTitle) {
                remainingText = remainingText.replace(new RegExp(job.jobTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
            }
            if (job.company) {
                remainingText = remainingText.replace(new RegExp(job.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
            }
            if (job.description) {
                remainingText = remainingText.replace(new RegExp(job.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
            }
        });
        
        // Remove ALL education content (multilingual)
        cvData.education.forEach(edu => {
            if (edu.degree) {
                remainingText = remainingText.replace(new RegExp(edu.degree.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
            }
            if (edu.institution) {
                remainingText = remainingText.replace(new RegExp(edu.institution.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
            }
            if (edu.details) {
                remainingText = remainingText.replace(new RegExp(edu.details.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
            }
        });
        
        // Remove ALL skills content
        cvData.skills.technical.forEach(skill => {
            if (skill) {
                remainingText = remainingText.replace(new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
            }
        });
        
        // Remove ALL languages content
        cvData.languages.forEach(lang => {
            if (lang.name) {
                remainingText = remainingText.replace(new RegExp(lang.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
            }
        });
        
        // Remove common multilingual structural words/phrases
        const commonPhrases = [
            // English
            'my name is', 'i am', 'i work', 'i studied', 'my skills', 'languages', 'experience', 'education',
            // Hindi
            'मेरा नाम', 'मैं हूं', 'मैं काम', 'मैंने पढ़ा', 'मेरे स्किल', 'भाषाएं', 'अनुभव', 'शिक्षा',
            // Tamil
            'என் பெயர்', 'நான்', 'நான் வேலை', 'நான் படித்தேன்',
            // Telugu  
            'నా పేరు', 'నేను', 'నేను వేలై', 'నేను పడిచాను',
            // Kannada
            'ನನ್ನ ಹೆಸರು', 'ನಾನು', 'ನಾನು ವೇಲೆ', 'ನಾನು ಓದಿದೇನೆ'
        ];
        
        commonPhrases.forEach(phrase => {
            remainingText = remainingText.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
        });
        
        // Clean up extra whitespace, punctuation, and short fragments
        remainingText = remainingText
            .replace(/\s+/g, ' ')  // Multiple spaces to single
            .replace(/[,;\u0964]+\s*/g, ' ')  // Remove commas, semicolons, Hindi periods
            .replace(/\b\w{1,2}\b/g, '')  // Remove 1-2 letter words
            .replace(/^[\s,.;\u0964]+|[\s,.;\u0964]+$/g, '')  // Trim punctuation
            .trim();
        
        // Only keep meaningful remaining text (longer fragments)
        cvData.professionalSummary = remainingText.length > 30 ? remainingText.substring(0, 300) : '';
        
        console.log('Cleaned text length:', remainingText.length);
        console.log('Final summary length:', cvData.professionalSummary.length);
        console.log('=== END CLEANUP ===');
        
        // COMPREHENSIVE DEBUGGING FOR MULTILINGUAL CONTENT
        console.log('=== COMPREHENSIVE DEBUGGING ===');
        console.log('Input text length:', text.length);
        console.log('Contains Hindi characters:', /[\u0900-\u097F]/.test(text));
        console.log('Contains Tamil characters:', /[\u0B80-\u0BFF]/.test(text));
        console.log('Contains Telugu characters:', /[\u0C00-\u0C7F]/.test(text));
        console.log('Contains Kannada characters:', /[\u0C80-\u0CFF]/.test(text));
        console.log('Contains Malayalam characters:', /[\u0D00-\u0D7F]/.test(text));
        console.log('Contains Marathi characters:', /[\u0900-\u097F]/.test(text));
        console.log('Contains Gujarati characters:', /[\u0A80-\u0AFF]/.test(text));
        console.log('Contains Bengali characters:', /[\u0980-\u09FF]/.test(text));
        console.log('Contains Punjabi characters:', /[\u0A00-\u0A7F]/.test(text));
        
        // Check if critical information was extracted
        if (!cvData.personalInfo.fullName) {
            console.warn('WARNING: No name extracted!');
            // Try emergency name extraction
            const nameWords = text.match(/[A-Za-z\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0980-\u09FF\u0A00-\u0A7F]{2,}/g);
            if (nameWords && nameWords.length >= 2) {
                cvData.personalInfo.fullName = nameWords.slice(0, 2).join(' ');
                console.log('EMERGENCY: Extracted name from words:', cvData.personalInfo.fullName);
            }
        }
        
        if (cvData.workExperience.length === 0) {
            console.warn('WARNING: No work experience extracted!');
            console.log('Text sample for debugging:', text.substring(0, 200) + '...');
        }
        
        if (cvData.education.length === 0) {
            console.warn('WARNING: No education extracted!');
        }
        
        if (cvData.skills.technical.length === 0) {
            console.warn('WARNING: No skills extracted!');
        }
        
        if (cvData.languages.length === 0) {
            console.warn('WARNING: No languages extracted!');
        }
        
        // Final validation and logging
        console.log('=== CV EXTRACTION SUMMARY ===');
        console.log('Personal Info:', cvData.personalInfo);
        console.log('Work Experience:', cvData.workExperience);
        console.log('Education:', cvData.education);
        console.log('Skills:', cvData.skills);
        console.log('Languages:', cvData.languages);
        console.log('Professional Summary length:', cvData.professionalSummary?.length || 0);
        console.log('Professional Summary preview:', cvData.professionalSummary?.substring(0, 100) + '...');
        console.log('=== END SUMMARY ===');
        
        return cvData;
    }
    
    /**
     * Handle manual text input
     */
    handleManualTextInput() {
        const textInput = document.getElementById('manualTextInput');
        if (textInput && textInput.value.trim()) {
            this.finalText = textInput.value.trim();
            
            // Update the transcription display
            this.handleSingleInputTranscription({
                text: this.finalText,
                isFinal: true,
                accumulatedText: this.finalText
            });
            
            this.showActionControls();
            this.showStatusMessage('✅ Text input received', 'success');
        }
    }
    
    /**
     * Test Bhashini service connectivity
     */
    async testBhashiniService() {
        try {
            this.showStatusMessage('🔍 Testing Bhashini service...', 'info');
            
            // Test pipeline config
            const config = await this.bhashiniService.getPipelineConfig('hi');
            console.log('Pipeline config test successful:', config);
            
            this.showStatusMessage('✅ Bhashini service is working. Try recording again.', 'success');
        } catch (error) {
            console.error('Bhashini service test failed:', error);
            this.showStatusMessage(`❌ Bhashini service test failed: ${error.message}`, 'error');
        }
    }
    
    /**
     * Update microphone status indicator
     * @param {string} status - Status: 'idle', 'testing', 'ready', 'recording', 'error'
     * @param {string} message - Status message
     */
    updateMicrophoneStatus(status, message) {
        const indicator = document.getElementById('micStatusIndicator');
        const textElement = document.getElementById('micStatusText');
        
        if (!indicator || !textElement) return;
        
        // Remove existing status classes
        indicator.className = 'mic-status-indicator';
        
        // Update text
        textElement.textContent = message;
        
        // Apply status-specific styling
        switch (status) {
            case 'idle':
                indicator.style.background = 'rgba(156, 163, 175, 0.1)';
                indicator.style.color = '#9ca3af';
                break;
            case 'testing':
                indicator.style.background = 'rgba(245, 158, 11, 0.1)';
                indicator.style.color = '#f59e0b';
                break;
            case 'ready':
                indicator.style.background = 'rgba(16, 185, 129, 0.1)';
                indicator.style.color = '#10b981';
                break;
            case 'recording':
                indicator.style.background = 'rgba(239, 68, 68, 0.1)';
                indicator.style.color = '#ef4444';
                break;
            case 'error':
                indicator.style.background = 'rgba(239, 68, 68, 0.1)';
                indicator.style.color = '#ef4444';
                break;
        }
    }
    
    /**
     * Initialize translations and apply them
     */
    initializeTranslations() {
        // Load saved language preference
        const savedLang = localStorage.getItem('appLanguage') || 'en';
        this.currentUILanguage = savedLang;
        
        // Apply initial translations
        setTimeout(() => {
            this.updateTranslations();
        }, 100);
    }
    
    /**
     * Set theme (light/dark)
     */
    setTheme(theme) {
        const root = document.documentElement;
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Update button states
        const lightBtn = document.getElementById('lightThemeBtn');
        const darkBtn = document.getElementById('darkThemeBtn');
        
        if (lightBtn && darkBtn) {
            lightBtn.classList.remove('selected');
            darkBtn.classList.remove('selected');
            
            if (theme === 'light') {
                lightBtn.classList.add('selected');
            } else {
                darkBtn.classList.add('selected');
            }
        }
        
        this.showStatusMessage(`Theme changed to ${theme} mode`, 'info');
    }
    
    /**
     * Update all translations using old fallback method (deprecated - only used as fallback)
     */
    async updateTranslations() {
        // This is now a fallback only - page translator handles most translations
        console.warn('Using fallback translation method');
        
        if (typeof updatePageTranslations === 'function') {
            await updatePageTranslations();
        }
        
        // Refresh resume preview if it exists
        if (this.generatedCVData) {
            setTimeout(() => {
                this.showResumePreview(this.generatedCVData);
            }, 100);
        }
    }
    
    /**
     * Change app language (interface language, independent from voice recognition)
     * Now uses Bhashini Translation Service for dynamic translation
     */
    async changeAppLanguage(lang) {
        localStorage.setItem('appLanguage', lang);
        this.currentUILanguage = lang;
        
        // Update the ASR language as well to match
        this.currentLanguage = lang;
        
        // Update current language display in header
        const currentLangEl = document.getElementById('currentLanguage');
        if (currentLangEl) {
            const langNames = {
                'en': 'English',
                'hi': 'Hindi', 
                'ta': 'Tamil',
                'te': 'Telugu',
                'kn': 'Kannada',
                'ml': 'Malayalam',
                'mr': 'Marathi',
                'gu': 'Gujarati',
                'bn': 'Bengali',
                'pa': 'Punjabi',
                'or': 'Odia',
                'as': 'Assamese',
                'ur': 'Urdu'
            };
            currentLangEl.textContent = langNames[lang] || 'English';
        }
        
        // Update the select dropdown if it exists
        const appLanguageSelect = document.getElementById('appLanguageSelect');
        if (appLanguageSelect) {
            appLanguageSelect.value = lang;
        }
        
        // Update voice language dropdown too
        const voiceLanguageSelect = document.getElementById('voiceLanguage');
        if (voiceLanguageSelect) {
            voiceLanguageSelect.value = lang;
        }
        
        // Use Page Translator for dynamic Bhashini translation
        // Initialize on first use to capture original English content
        if (lang !== 'en') {
            try {
                // Lazy initialize page translator on first language change
                if (!window.pageTranslator) {
                    console.log('🌍 Initializing Page Translator for first time...');
                    window.pageTranslator = new PageTranslator();
                }
                
                // Translate entire page to target language
                await window.pageTranslator.translatePage(lang);
            } catch (error) {
                console.error('Page translation error:', error);
                this.showStatusMessage('Translation service error. Using fallback.', 'warning');
                // Fallback to old method
                await this.updateTranslations();
            }
        } else {
            // Reset to English if translator exists
            if (window.pageTranslator) {
                window.pageTranslator.resetToOriginal();
            }
            // No need for fallback translation for English
        }
        
        // Preload pipeline for ASR
        if (this.bhashiniService) {
            this.bhashiniService.getPipelineConfig(lang)
                .then(config => {
                    console.log('ASR pipeline configured for', lang);
                })
                .catch(error => {
                    console.error('Failed to configure ASR pipeline:', error);
                });
        }
        
        this.showStatusMessage('Language changed successfully', 'success');
    }
    
    /**
     * Change voice recognition language (independent from app interface language)
     */
    changeVoiceLanguage(lang) {
        this.currentLanguage = lang;
        this.showStatusMessage(`Voice recognition language changed`, 'info');
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