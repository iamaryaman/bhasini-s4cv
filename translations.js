// Language translations for the S4CV application
// Now using Bhashini Translation Service for dynamic translation

// English is the base language - all strings defined here
const baseTranslations = {
    en: {
        // Header
        appName: "S4CV",
        dashboard: "Dashboard",
        settings: "Settings",
        newResume: "New Resume",
        connecting: "Connecting...",
        connected: "Connected",
        disconnected: "Disconnected",
        
        // Main page content
        singleVoiceInputCVBuilder: "Single Voice Input CV Builder",
        oneRecordingSession: "ONE RECORDING SESSION - ALL CV INFORMATION",
        noMultipleInputs: "No multiple inputs! Just press record and speak continuously about your entire professional background. The AI will extract and organize everything automatically.",
        speakAboutAll: "Speak about ALL of these in ONE go:",
        fullNameContact: "Your full name & contact details",
        workExperience: "All work experience & companies",
        educationHistory: "Complete education history",
        technicalSkills: "All technical & soft skills",
        languagesFluent: "Languages you speak fluently",
        locationDetails: "Location & other details",
        aiProcessing: "AI Processing:",
        aiProcessingDesc: "The system will automatically parse your speech and organize it into proper CV sections with appropriate headings.",
        autoDetectLanguage: "Auto-detect language",
        autoDetectEnabled: "Auto-detect enabled",
        singleSpeechInput: "SINGLE SPEECH INPUT:",
        speakContinuously: "Speak continuously about your entire professional background",
        startCompleteCVRecording: "START COMPLETE CV RECORDING",
        oneContinuousSession: "One continuous session • All CV information • AI auto-extracts everything",
        noNeedToPause: "No need to pause or separate topics - just speak naturally about everything!",
        singleVoiceInputComplete: "Single Voice Input - Complete CV Information",
        exampleRecording: "Example of what to say in ONE recording:",
        aiWillExtract: "The AI will automatically extract and organize this into proper CV sections!",
        generateMyCV: "Generate My CV",
        startOver: "Start Over",
        copyText: "Copy Text",
        resumePreview: "Resume Preview",
        exportThisResume: "Export This Resume",
        exportResume: "Export Resume",
        chooseExportFormat: "Choose your export format:",
        exportAsPDF: "Export as PDF",
        exportAsWord: "Export as Word",
        additionalDocuments: "Additional Documents",
        uploadDocumentsHint: "Upload supporting documents like recommendations, marksheets, certificates to attach to your CV export",
        uploadFiles: "Upload Files",
        uploadHelp: "Accepted: PDF, Word, Images • Max 10MB per file",
        contactInformation: "Contact Information",
        professionalSummary: "Professional Summary",
        workExperienceSection: "Work Experience",
        educationSection: "Education",
        skillsSection: "Skills",
        technicalSkillsLabel: "Technical Skills",
        softSkillsLabel: "Soft Skills",
        languagesLabel: "Languages",
        email: "Email",
        phone: "Phone",
        location: "Location",
        
        // Welcome screen
        welcomeTitle: "Welcome to S4CV",
        welcomeSubtitle: "Smart Voice Resume Builder",
        selectAccessibilityMode: "Select your preferred experience",
        normalMode: "Standard Experience",
        normalModeDesc: "Full visual and audio interface",
        deafMode: "Deaf/Hard of Hearing",
        deafModeDesc: "Enhanced visual feedback and text-based interaction",
        blindMode: "Blind/Low Vision",
        blindModeDesc: "Screen reader optimized with audio guidance",
        continueButton: "Continue",
        
        // Authentication
        signIn: "Sign In",
        signUp: "Sign Up",
        signInTitle: "Sign in to your account",
        signUpTitle: "Create your account",
        emailAddress: "Email Address",
        password: "Password",
        confirmPassword: "Confirm Password",
        fullName: "Full Name",
        rememberMe: "Remember me",
        forgotPassword: "Forgot password?",
        dontHaveAccount: "Don't have an account?",
        alreadyHaveAccount: "Already have an account?",
        signUpLink: "Sign up",
        signInLink: "Sign in",
        
        // Template selection
        chooseTemplate: "Choose Your Template",
        templateDescription: "Select a resume template that matches your style",
        modernTemplate: "Modern",
        classicTemplate: "Classic",
        creativeTemplate: "Creative",
        cleanLayout: "Clean layout",
        professionalLook: "Professional look",
        standOut: "Stand out",
        traditionalFormat: "Traditional format",
        industryStandard: "Industry standard",
        timelessDesign: "Timeless design",
        uniqueDesign: "Unique design",
        creativeFlair: "Creative flair",
        memorableImpression: "Memorable impression",
        continueWithTemplate: "Continue with Selected Template",
        
        // Voice input screen
        voiceInputTitle: "Voice Input",
        currentSection: "Current Section",
        speakNaturally: "Speak naturally about your",
        recording: "Recording...",
        stopRecording: "Stop Recording",
        clearTranscription: "Clear",
        confirmSection: "Confirm Section",
        nextSection: "Next Section",
        previousSection: "Previous Section",
        
        // Sections
        contactInformationSection: "Contact Information",
        contactDescription: "Provide your basic contact details",
        professionalSummarySection: "Professional Summary", 
        summaryDescription: "Describe your professional background and goals",
        workExperienceDescription: "Tell us about your work history",
        educationDescription: "Share your educational background",
        skillsDescription: "List your technical and soft skills",
        
        // Export and review
        reviewYourResume: "Review Your Resume",
        reviewDescription: "Review and edit your resume before final export",
        resumePreviewTitle: "Resume Preview",
        editMode: "Edit Mode",
        exportOptions: "Export Options",
        exportAsPDFLong: "Export as PDF",
        exportAsWordLong: "Export as Word",
        additionalDocuments: "Additional Documents",
        uploadDocuments: "Upload Documents",
        uploadDocumentsDesc: "Upload cover letters, certificates, or other supporting documents",
        
        // Settings
        settingsTitle: "Settings",
        appearance: "Appearance",
        themeMode: "Theme Mode",
        lightTheme: "Light",
        darkTheme: "Dark",
        accessibility: "Accessibility",
        accessibilityMode: "Accessibility Mode",
        normalAccessibility: "Normal",
        deafAccessibility: "Deaf/Hard of Hearing",
        blindAccessibility: "Blind/Low Vision",
        highContrastMode: "High Contrast Mode",
        voiceSettings: "Voice Settings",
        voiceLanguage: "Voice Recognition Language (Bhashini ASR)",
        account: "Account",
        signOut: "Sign Out",
        
        // Language modal
        selectLanguageTitle: "Select Language",
        hindi: "Hindi",
        english: "English",
        tamil: "Tamil",
        telugu: "Telugu",
        kannada: "Kannada",
        malayalam: "Malayalam",
        marathi: "Marathi",
        gujarati: "Gujarati",
        bengali: "Bengali",
        punjabi: "Punjabi",
        odia: "Odia",
        assamese: "Assamese",
        urdu: "Urdu",
        
        // Status messages
        processing: "Processing...",
        recordingStarted: "Recording started",
        recordingStopped: "Recording stopped",
        transcribing: "Transcribing...",
        generatingResume: "Generating resume...",
        resumeGenerated: "Resume generated successfully!",
        errorOccurred: "An error occurred",
        pleaseSpeak: "Please speak clearly",
        microphoneAccess: "Microphone access required",
        
        // Instructions and tips
        voiceInputInstructions: "Your speech will appear here in real-time",
        exampleSpeech: "Example of complete CV speech:",
        speakAboutEverything: "Speak about ALL of these in ONE go:",
        aiWillOrganize: "The AI will automatically extract and organize this into proper CV sections!",
        oneRecordingTip: "No need to pause or separate topics - just speak naturally about everything!",
        treatAsIntroduction: "TIP: Treat this like introducing yourself comprehensively to someone",
        
        // Form labels and placeholders
        emailPlaceholder: "Enter your email address",
        passwordPlaceholder: "Enter your password",
        fullNamePlaceholder: "Enter your full name",
        manualTextPlaceholder: "Type or paste your complete CV information here...",
        
        // Application info
        appVersion: "S4CV Version 1.0.0",
        smartVoiceResumeBuilder: "Smart Voice Resume Builder",
        
        // App Language Settings
        appLanguageSettings: "App Language",
        interfaceLanguage: "Interface Language",
        
        // Main content
        voiceResumeBuilder: "Voice Resume Builder",
        selectLanguage: "Select Language",
        autoDetectLanguage: "Auto-detect language",
        startRecording: "Start Recording",
        stopRecording: "Stop Recording",
        clear: "Clear",
        copyText: "Copy Text",
        nextStep: "Next Step",
        
        // Stats
        resumesCreated: "Resumes Created",
        languagesUsed: "Languages Used",
        accuracyRate: "Accuracy Rate",
        timeSaved: "Time Saved",
        
        // Features
        aiFeatures: "AI Features",
        webSocketASR: "WebSocket ASR",
        realtimeTranscription: "Real-time streaming transcription",
        autoLanguageDetection: "Auto Language Detection",
        automaticallyDetects: "Automatically detects spoken language",
        languages: "Languages",
        multilingualSupport: "Full multilingual support",
        smartFormatting: "Smart Formatting",
        aiPoweredFormatting: "AI-powered resume formatting",
        
        // Quick Actions
        quickActions: "Quick Actions",
        viewTemplates: "View Templates",
        analytics: "Analytics",
        savedDrafts: "Saved Drafts",
        exportOptions: "Export Options",
        
        // Recent Resumes
        recentResumes: "Recent Resumes",
        edit: "Edit",
        download: "Download",
        createdIn: "Created in",
        daysAgo: "days ago",
        weekAgo: "week ago",
        
        // Messages
        languageSwitched: "Language switched to",
        autoDetectEnabled: "Auto-detect enabled. Speak in any supported language.",
        autoDetectDisabled: "Auto-detect disabled. Please select a language.",
        failedToStartRecording: "Failed to start recording. Please check microphone permissions.",
        transcriptionCleared: "Transcription cleared",
        noTextToCopy: "No text to copy",
        textCopied: "Text copied to clipboard",
        pleaseRecordContent: "Please record some content first",
        proceedingToNext: "Proceeding to next step...",
        languageDetected: "Language detected",
        confidence: "confidence",
        languageChanged: "Language changed successfully"
    }
};


// Dynamic translations cache (populated via Bhashini API)
const dynamicTranslations = {};

// Translation service instance
let translationService = null;

// Initialize translation service
function initTranslationService() {
    if (!translationService && typeof BhashiniTranslationService !== 'undefined') {
        translationService = new BhashiniTranslationService();
        console.log('✅ Bhashini Translation Service initialized');
    }
    return translationService;
}

// Function to get current language (defaults to English)
function getCurrentLanguage() {
    return localStorage.getItem('appLanguage') || 'en';
}

// Function to get translation for a key
function t(key) {
    const lang = getCurrentLanguage();
    
    // If language is English, return from base translations
    if (lang === 'en') {
        return baseTranslations.en[key] || key;
    }
    
    // Check dynamic translations cache
    if (dynamicTranslations[lang]?.[key]) {
        return dynamicTranslations[lang][key];
    }
    
    // Fallback to English if translation not available
    return baseTranslations.en[key] || key;
}

// Function to update all translatable elements on the page
async function updatePageTranslations() {
    const lang = getCurrentLanguage();
    console.log('Updating translations to:', lang);
    
    // If language is English, just update from base translations
    if (lang === 'en') {
        updateElementsFromCache('en');
        return;
    }
    
    // Initialize translation service
    const service = initTranslationService();
    if (!service) {
        console.warn('Translation service not available, using English');
        updateElementsFromCache('en');
        return;
    }
    
    // Show loading indicator
    showTranslationLoading(true);
    
    try {
        // Collect all unique texts to translate
        const textsToTranslate = new Set();
        const translationKeys = [];
        
        // Get all translation keys from base English translations
        for (const key in baseTranslations.en) {
            textsToTranslate.add(baseTranslations.en[key]);
            translationKeys.push(key);
        }
        
        // Initialize cache for this language if not exists
        if (!dynamicTranslations[lang]) {
            dynamicTranslations[lang] = {};
        }
        
        // Translate all texts that aren't cached
        const textsArray = Array.from(textsToTranslate);
        const translationsNeeded = [];
        const keysNeeded = [];
        
        for (const key of translationKeys) {
            const text = baseTranslations.en[key];
            if (!dynamicTranslations[lang][key]) {
                translationsNeeded.push(text);
                keysNeeded.push(key);
            }
        }
        
        if (translationsNeeded.length > 0) {
            console.log(`Translating ${translationsNeeded.length} texts to ${lang}...`);
            
            // Translate in batches to avoid overwhelming the API
            const batchSize = 10;
            for (let i = 0; i < translationsNeeded.length; i += batchSize) {
                const batch = translationsNeeded.slice(i, i + batchSize);
                const batchKeys = keysNeeded.slice(i, i + batchSize);
                
                const translatedBatch = await service.translateBatch(batch, 'en', lang);
                
                // Cache the translations
                batchKeys.forEach((key, index) => {
                    dynamicTranslations[lang][key] = translatedBatch[index];
                });
                
                // Update UI progressively
                updateElementsFromCache(lang);
            }
            
            console.log(`✅ Translation complete for ${lang}`);
        }
        
        // Update all elements with translated text
        updateElementsFromCache(lang);
        
    } catch (error) {
        console.error('Translation error:', error);
        // Fallback to English on error
        updateElementsFromCache('en');
    } finally {
        showTranslationLoading(false);
    }
}

// Helper function to update elements from cache
function updateElementsFromCache(lang) {
    const translations = lang === 'en' ? baseTranslations.en : dynamicTranslations[lang];
    
    if (!translations) {
        console.warn(`No translations available for ${lang}`);
        return;
    }
    
    // Update all elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[key]) {
            // Handle elements with nested structure (preserve icons)
            const iconElement = element.querySelector('span');
            if (iconElement && element.children.length === 1 && iconElement.textContent.length <= 2) {
                // Keep the icon and update text after it
                element.innerHTML = iconElement.outerHTML + ' ' + translations[key];
            } else if (element.innerHTML.includes('<strong>') || element.innerHTML.includes('<span>')) {
                // Handle complex HTML content - replace only the text parts
                const translation = translations[key];
                if (key === 'speakAboutAll') {
                    element.innerHTML = `<strong>🗣️ ${translation}</strong>`;
                } else if (key === 'aiProcessing') {
                    element.innerHTML = `<strong>${translation}</strong>`;
                } else {
                    element.textContent = translation;
                }
            } else {
                element.textContent = translations[key];
            }
        }
    });
    
    // Update specific elements
    const updates = {
        // Header
        '.logo span:last-child': 'appName',
        '#connectionStatus span:last-child': getConnectionStatusKey(),
        
        // Main content
        '.text-primary.mb-3': 'voiceResumeBuilder',
        '.text-secondary.mb-2': 'selectLanguage',
        '.auto-detect-toggle label': 'autoDetectLanguage',
        '#recordBtn span:last-child': getRecordButtonKey(),
        '#clearBtn': 'clear',
        '#copyBtn': 'copyText',
        '#nextStepBtn': 'nextStep',
        
        // Stats
        '.stat-label': ['resumesCreated', 'languagesUsed', 'accuracyRate', 'timeSaved'],
        
        // Features
        '.card h3.text-primary': ['aiFeatures', 'quickActions', 'recentResumes']
    };
    
    // Apply updates
    for (const [selector, keys] of Object.entries(updates)) {
        if (Array.isArray(keys)) {
            document.querySelectorAll(selector).forEach((el, index) => {
                if (keys[index] && translations[keys[index]]) {
                    el.textContent = translations[keys[index]];
                }
            });
        } else {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (translations[keys]) {
                    el.textContent = translations[keys];
                }
            });
        }
    }
    
    // Update buttons with icons
    updateButtonWithIcon('#clearBtn', '🗑️', t('clear'));
    updateButtonWithIcon('#copyBtn', '📋', t('copyText'));
    updateButtonWithIcon('#nextStepBtn', '➡️', t('nextStep'));
    
    // Update document language attribute
    document.documentElement.lang = lang;
}

// Show/hide translation loading indicator
function showTranslationLoading(show) {
    let indicator = document.getElementById('translationLoadingIndicator');
    
    if (show && !indicator) {
        // Create loading indicator
        indicator = document.createElement('div');
        indicator.id = 'translationLoadingIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(99, 102, 241, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        indicator.textContent = '🌐 Translating...';
        document.body.appendChild(indicator);
    } else if (!show && indicator) {
        indicator.remove();
    }
}

function getConnectionStatusKey() {
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl?.classList.contains('connected')) return 'connected';
    if (statusEl?.classList.contains('disconnected')) return 'disconnected';
    return 'connecting';
}

function getRecordButtonKey() {
    const btn = document.getElementById('recordBtn');
    return btn?.classList.contains('recording') ? 'stopRecording' : 'startRecording';
}

function updateButtonWithIcon(selector, icon, text) {
    const btn = document.querySelector(selector);
    if (btn) {
        btn.innerHTML = `<span>${icon}</span> ${text}`;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        baseTranslations, 
        dynamicTranslations,
        t, 
        updatePageTranslations, 
        getCurrentLanguage,
        initTranslationService
    };
}
