/**
 * Page Translator
 * Automatically translates all text elements on the page using Bhashini Translation Service
 */

class PageTranslator {
    constructor() {
        this.translationService = new BhashiniTranslationService();
        this.originalTexts = new Map(); // Store original English text
        this.currentLanguage = 'en';
        this.isTranslating = false;
        
        // Store original content on first load
        this.captureOriginalContent();
    }

    /**
     * Capture all original text content from the page (English)
     */
    captureOriginalContent() {
        console.log('📸 Capturing original page content...');
        
        // Capture all text nodes
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    // Skip script, style, and empty nodes
                    if (node.parentElement.closest('script, style, noscript')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    const text = node.textContent.trim();
                    if (!text || text.length === 0) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text) {
                this.originalTexts.set(node, text);
            }
        }

        // Capture placeholders
        document.querySelectorAll('[placeholder]').forEach(el => {
            const placeholder = el.getAttribute('placeholder');
            if (placeholder) {
                this.originalTexts.set(el, { 
                    placeholder,
                    type: 'placeholder'
                });
            }
        });

        // Capture titles
        document.querySelectorAll('[title]').forEach(el => {
            const title = el.getAttribute('title');
            if (title) {
                const key = `${el.tagName}-${el.id || ''}-title`;
                this.originalTexts.set(key, {
                    element: el,
                    title,
                    type: 'title'
                });
            }
        });

        // Capture aria-labels
        document.querySelectorAll('[aria-label]').forEach(el => {
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel) {
                const key = `${el.tagName}-${el.id || ''}-aria`;
                this.originalTexts.set(key, {
                    element: el,
                    ariaLabel,
                    type: 'aria-label'
                });
            }
        });

        console.log(`✅ Captured ${this.originalTexts.size} original text elements`);
    }

    /**
     * Translate entire page to target language
     */
    async translatePage(targetLanguage) {
        if (this.isTranslating) {
            console.log('⏳ Translation already in progress');
            return;
        }

        if (this.currentLanguage === targetLanguage) {
            console.log(`Already in ${targetLanguage}`);
            return;
        }

        this.isTranslating = true;
        const sourceLanguage = 'en'; // Always translate from English

        try {
            console.log(`🌍 Translating page from ${sourceLanguage} to ${targetLanguage}...`);
            
            // Show progress indicator
            this.showProgress(true);

            // Collect all unique texts to translate
            const textsToTranslate = new Set();
            this.originalTexts.forEach((value) => {
                if (typeof value === 'string') {
                    textsToTranslate.add(value);
                } else if (value.placeholder) {
                    textsToTranslate.add(value.placeholder);
                } else if (value.title) {
                    textsToTranslate.add(value.title);
                } else if (value.ariaLabel) {
                    textsToTranslate.add(value.ariaLabel);
                }
            });

            const uniqueTexts = Array.from(textsToTranslate);
            console.log(`📝 Found ${uniqueTexts.length} unique texts to translate`);

            // Translate all texts in batches
            const translations = await this.translateInBatches(
                uniqueTexts,
                sourceLanguage,
                targetLanguage
            );

            // Create translation map
            const translationMap = new Map();
            uniqueTexts.forEach((text, index) => {
                translationMap.set(text, translations[index]);
            });

            // Apply translations to DOM
            this.applyTranslations(translationMap);

            this.currentLanguage = targetLanguage;
            console.log(`✅ Page translation completed to ${targetLanguage}`);

            // Dispatch event
            window.dispatchEvent(new CustomEvent('pageTranslated', {
                detail: { language: targetLanguage }
            }));

        } catch (error) {
            console.error('❌ Page translation failed:', error);
            alert(`Translation failed: ${error.message}`);
        } finally {
            this.isTranslating = false;
            this.showProgress(false);
        }
    }

    /**
     * Translate texts in batches to avoid rate limiting
     */
    async translateInBatches(texts, sourceLanguage, targetLanguage) {
        const batchSize = 5; // Translate 5 at a time to avoid rate limiting
        const results = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            console.log(`Translating batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}...`);
            
            const batchPromises = batch.map(text => 
                this.translationService.translate(text, sourceLanguage, targetLanguage)
            );
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Small delay between batches to be nice to the API
            if (i + batchSize < texts.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Update progress
            const progress = Math.round(((i + batch.length) / texts.length) * 100);
            this.updateProgress(progress);
        }

        return results;
    }

    /**
     * Apply translations to DOM elements
     */
    applyTranslations(translationMap) {
        console.log('📝 Applying translations to DOM...');
        let appliedCount = 0;

        this.originalTexts.forEach((value, key) => {
            if (typeof value === 'string') {
                // It's a text node
                const translated = translationMap.get(value);
                if (translated && key.nodeType === Node.TEXT_NODE) {
                    key.textContent = translated;
                    appliedCount++;
                }
            } else if (value.type === 'placeholder') {
                const translated = translationMap.get(value.placeholder);
                if (translated) {
                    key.setAttribute('placeholder', translated);
                    appliedCount++;
                }
            } else if (value.type === 'title') {
                const translated = translationMap.get(value.title);
                if (translated && value.element) {
                    value.element.setAttribute('title', translated);
                    appliedCount++;
                }
            } else if (value.type === 'aria-label') {
                const translated = translationMap.get(value.ariaLabel);
                if (translated && value.element) {
                    value.element.setAttribute('aria-label', translated);
                    appliedCount++;
                }
            }
        });

        console.log(`✅ Applied ${appliedCount} translations to DOM`);
    }

    /**
     * Reset page to original language (English)
     */
    resetToOriginal() {
        console.log('🔄 Resetting to original language...');
        
        this.originalTexts.forEach((value, key) => {
            if (typeof value === 'string' && key.nodeType === Node.TEXT_NODE) {
                key.textContent = value;
            } else if (value.type === 'placeholder') {
                key.setAttribute('placeholder', value.placeholder);
            } else if (value.type === 'title' && value.element) {
                value.element.setAttribute('title', value.title);
            } else if (value.type === 'aria-label' && value.element) {
                value.element.setAttribute('aria-label', value.ariaLabel);
            }
        });

        this.currentLanguage = 'en';
        console.log('✅ Reset to English');
    }

    /**
     * Translate newly added content (for dynamic pages)
     */
    async translateNewContent(element, targetLanguage) {
        if (targetLanguage === 'en') return;

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (node.parentElement.closest('script, style')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                }
            }
        );

        const textsToTranslate = [];
        const nodes = [];
        
        let node;
        while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (text) {
                textsToTranslate.push(text);
                nodes.push(node);
                this.originalTexts.set(node, text);
            }
        }

        if (textsToTranslate.length > 0) {
            const translations = await this.translateInBatches(textsToTranslate, 'en', targetLanguage);
            nodes.forEach((node, index) => {
                if (translations[index]) {
                    node.textContent = translations[index];
                }
            });
        }
    }

    /**
     * Show/hide progress indicator
     */
    showProgress(show) {
        let indicator = document.getElementById('translationProgress');
        
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'translationProgress';
                indicator.style.cssText = `
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%);
                    color: white;
                    padding: 16px 24px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 500;
                    z-index: 10001;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    min-width: 220px;
                `;
                indicator.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="spinner" style="
                            width: 18px;
                            height: 18px;
                            border: 2px solid rgba(255, 255, 255, 0.3);
                            border-top-color: white;
                            border-radius: 50%;
                            animation: spin 0.8s linear infinite;
                        "></div>
                        <span>🌍 Translating page...</span>
                    </div>
                    <div style="background: rgba(255, 255, 255, 0.2); height: 4px; border-radius: 2px; overflow: hidden;">
                        <div id="translationProgressBar" style="background: white; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                    </div>
                `;
                document.body.appendChild(indicator);
                
                // Add spin animation if not exists
                if (!document.getElementById('translationSpinAnimation')) {
                    const style = document.createElement('style');
                    style.id = 'translationSpinAnimation';
                    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
                    document.head.appendChild(style);
                }
            }
        } else {
            if (indicator) {
                setTimeout(() => indicator.remove(), 500);
            }
        }
    }

    /**
     * Update progress bar
     */
    updateProgress(percent) {
        const progressBar = document.getElementById('translationProgressBar');
        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.translationService.clearCache();
    }
}

// Initialize globally
window.pageTranslator = null;

// DO NOT auto-initialize - only initialize when user first changes language
// This ensures we capture the original HTML content, not already-translated content
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌍 Page Translator ready to initialize on first language change');
});

// Export for use in other files
if (typeof window !== 'undefined') {
    window.PageTranslator = PageTranslator;
}
