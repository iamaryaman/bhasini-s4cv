// Resume Visualization Component - Post-NER Display
// Displays extracted entities in a structured, professional resume format
// Inspired by IBM Portfolio Builder approach

class ResumeVisualization {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }
        
        this.options = {
            theme: 'professional', // professional, modern, minimal
            showConfidenceIndicators: false, // Hide confidence by default for cleaner look
            editable: true,
            showEntityTypes: false, // Show entity type labels
            ...options
        };
        
        this.cvData = null;
        this.entities = [];
        this.callbacks = {
            onEdit: null,
            onComplete: null
        };
        
        this.initializeUI();
    }
    
    /**
     * Initialize the visualization UI
     */
    initializeUI() {
        this.container.innerHTML = `
            <div class="resume-visualization-wrapper">
                <div class="resume-header-section">
                    <h2>Your Resume Preview</h2>
                    <p class="resume-subtitle">Review and edit the extracted information</p>
                </div>
                
                <div class="resume-display-area">
                    <div class="resume-paper">
                        <div class="placeholder-content">
                            <div class="placeholder-icon">📄</div>
                            <p>Complete NER processing to see your resume preview</p>
                        </div>
                    </div>
                </div>
                
                <div class="resume-actions-bar" style="display: none;">
                    <button class="btn-action btn-edit" onclick="resumeViz.toggleEditMode()">
                        <span class="btn-icon">✏️</span> Edit
                    </button>
                    <button class="btn-action btn-download" onclick="resumeViz.downloadResume()">
                        <span class="btn-icon">📥</span> Download
                    </button>
                    <button class="btn-action btn-reset" onclick="resumeViz.resetResume()">
                        <span class="btn-icon">🔄</span> Reset
                    </button>
                </div>
            </div>
        `;
        
        this.addStyles();
    }
    
    /**
     * Display CV data in resume format
     * @param {Object} cvData - Structured CV data from NER
     * @param {Array} entities - Raw entities array
     */
    displayResume(cvData, entities = []) {
        this.cvData = cvData;
        this.entities = entities;
        
        const paperElement = this.container.querySelector('.resume-paper');
        const actionsBar = this.container.querySelector('.resume-actions-bar');
        
        if (!cvData || Object.keys(cvData).length === 0) {
            paperElement.innerHTML = `
                <div class="placeholder-content">
                    <div class="placeholder-icon">⚠️</div>
                    <p>No resume data available</p>
                </div>
            `;
            actionsBar.style.display = 'none';
            return;
        }
        
        // Generate resume HTML
        const resumeHTML = this.generateResumeHTML(cvData);
        paperElement.innerHTML = resumeHTML;
        actionsBar.style.display = 'flex';
        
        // Add edit handlers if editable
        if (this.options.editable) {
            this.attachEditHandlers();
        }
    }
    
    /**
     * Generate structured resume HTML
     * @param {Object} cvData - CV data structure
     * @returns {string} HTML string
     */
    generateResumeHTML(cvData) {
        const { contact, professional, education } = cvData;
        
        let html = `<div class="resume-content ${this.options.theme}">`;
        
        // Header Section - Name and Contact
        html += this.generateHeaderSection(contact);
        
        // Professional Summary
        if (professional.summary) {
            html += this.generateSummarySection(professional.summary);
        }
        
        // Skills Section
        if (professional.skills.technical.length > 0 || professional.skills.soft.length > 0) {
            html += this.generateSkillsSection(professional.skills);
        }
        
        // Experience Section
        if (professional.experience.length > 0) {
            html += this.generateExperienceSection(professional.experience);
        }
        
        // Education Section
        if (education.degrees.length > 0) {
            html += this.generateEducationSection(education.degrees);
        }
        
        // Certifications
        if (education.certifications.length > 0) {
            html += this.generateCertificationsSection(education.certifications);
        }
        
        // Languages
        if (professional.languages && professional.languages.length > 0) {
            html += this.generateLanguagesSection(professional.languages);
        }
        
        html += '</div>';
        
        return html;
    }
    
    /**
     * Generate header section with name and contact info
     */
    generateHeaderSection(contact) {
        const name = contact.name?.text || 'Your Name';
        const email = contact.email?.text || '';
        const phone = contact.phone?.text || '';
        const address = contact.address?.text || '';
        const linkedin = contact.linkedin?.text || '';
        const github = contact.github?.text || '';
        
        let html = `
            <div class="resume-section header-section">
                <h1 class="resume-name" data-field="name">${this.escapeHtml(name)}</h1>
                ${contact.title?.text ? `<p class="resume-title" data-field="title">${this.escapeHtml(contact.title.text)}</p>` : ''}
                
                <div class="contact-info">
        `;
        
        if (email) {
            html += `
                <div class="contact-item">
                    <span class="contact-icon">📧</span>
                    <span data-field="email">${this.escapeHtml(email)}</span>
                </div>
            `;
        }
        
        if (phone) {
            html += `
                <div class="contact-item">
                    <span class="contact-icon">📱</span>
                    <span data-field="phone">${this.escapeHtml(phone)}</span>
                </div>
            `;
        }
        
        if (address) {
            html += `
                <div class="contact-item">
                    <span class="contact-icon">📍</span>
                    <span data-field="address">${this.escapeHtml(address)}</span>
                </div>
            `;
        }
        
        if (linkedin) {
            html += `
                <div class="contact-item">
                    <span class="contact-icon">💼</span>
                    <a href="${this.escapeHtml(linkedin)}" target="_blank" data-field="linkedin">LinkedIn Profile</a>
                </div>
            `;
        }
        
        if (github) {
            html += `
                <div class="contact-item">
                    <span class="contact-icon">💻</span>
                    <a href="${this.escapeHtml(github)}" target="_blank" data-field="github">GitHub Profile</a>
                </div>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Generate professional summary section
     */
    generateSummarySection(summary) {
        return `
            <div class="resume-section">
                <h2 class="section-title">Professional Summary</h2>
                <div class="section-content">
                    <p class="summary-text" data-field="summary">${this.escapeHtml(summary)}</p>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate skills section
     */
    generateSkillsSection(skills) {
        const { technical, soft, languages } = skills;
        const allSkills = [...technical, ...soft];
        
        if (allSkills.length === 0) return '';
        
        let html = `
            <div class="resume-section">
                <h2 class="section-title">Skills</h2>
                <div class="section-content">
                    <div class="skills-grid">
        `;
        
        // Group by category if available
        if (technical.length > 0) {
            html += `
                <div class="skills-category">
                    <h4 class="skills-category-title">Technical Skills</h4>
                    <div class="skills-tags">
                        ${technical.map(skill => `
                            <span class="skill-tag" data-field="skill">${this.escapeHtml(skill)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        if (soft.length > 0) {
            html += `
                <div class="skills-category">
                    <h4 class="skills-category-title">Soft Skills</h4>
                    <div class="skills-tags">
                        ${soft.map(skill => `
                            <span class="skill-tag soft" data-field="skill">${this.escapeHtml(skill)}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Generate experience section
     */
    generateExperienceSection(experiences) {
        if (experiences.length === 0) return '';
        
        let html = `
            <div class="resume-section">
                <h2 class="section-title">Professional Experience</h2>
                <div class="section-content">
        `;
        
        experiences.forEach((exp, index) => {
            html += `
                <div class="experience-item" data-index="${index}">
                    <div class="experience-header">
                        <div class="experience-title-group">
                            <h3 class="experience-position" data-field="position">${this.escapeHtml(exp.position || 'Position')}</h3>
                            <p class="experience-company" data-field="company">
                                ${exp.company ? this.escapeHtml(exp.company) : 'Company Name'}
                                ${exp.location ? ` - ${this.escapeHtml(exp.location)}` : ''}
                            </p>
                        </div>
                        ${exp.startDate || exp.endDate ? `
                            <div class="experience-dates">
                                <span data-field="dates">
                                    ${exp.startDate || 'Start'}
                                    ${exp.endDate ? ` - ${exp.endDate}` : ' - Present'}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    ${exp.description ? `
                        <div class="experience-description">
                            <p data-field="description">${this.escapeHtml(exp.description)}</p>
                        </div>
                    ` : ''}
                    ${exp.achievements && exp.achievements.length > 0 ? `
                        <ul class="experience-achievements">
                            ${exp.achievements.map(achievement => `
                                <li data-field="achievement">${this.escapeHtml(achievement)}</li>
                            `).join('')}
                        </ul>
                    ` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Generate education section
     */
    generateEducationSection(degrees) {
        if (degrees.length === 0) return '';
        
        let html = `
            <div class="resume-section">
                <h2 class="section-title">Education</h2>
                <div class="section-content">
        `;
        
        degrees.forEach((degree, index) => {
            html += `
                <div class="education-item" data-index="${index}">
                    <div class="education-header">
                        <div class="education-title-group">
                            <h3 class="education-degree" data-field="degree">
                                ${this.escapeHtml(degree.degree || 'Degree')}
                                ${degree.field ? ` in ${this.escapeHtml(degree.field)}` : ''}
                            </h3>
                            <p class="education-institution" data-field="institution">
                                ${this.escapeHtml(degree.institution || 'Institution')}
                                ${degree.location ? ` - ${this.escapeHtml(degree.location)}` : ''}
                            </p>
                        </div>
                        ${degree.graduationDate || degree.startDate ? `
                            <div class="education-dates">
                                <span data-field="dates">
                                    ${degree.startDate || ''}
                                    ${degree.graduationDate ? ` - ${degree.graduationDate}` : ''}
                                </span>
                            </div>
                        ` : ''}
                    </div>
                    ${degree.gpa ? `
                        <p class="education-gpa">GPA: <span data-field="gpa">${this.escapeHtml(degree.gpa)}</span></p>
                    ` : ''}
                    ${degree.honors && degree.honors.length > 0 ? `
                        <div class="education-honors">
                            <strong>Honors:</strong> ${degree.honors.map(h => this.escapeHtml(h)).join(', ')}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        return html;
    }
    
    /**
     * Generate certifications section
     */
    generateCertificationsSection(certifications) {
        if (certifications.length === 0) return '';
        
        return `
            <div class="resume-section">
                <h2 class="section-title">Certifications</h2>
                <div class="section-content">
                    <div class="certifications-list">
                        ${certifications.map(cert => `
                            <div class="certification-item">
                                <div class="cert-name" data-field="certification">${this.escapeHtml(cert.name)}</div>
                                ${cert.issuer ? `
                                    <div class="cert-issuer">Issued by: ${this.escapeHtml(cert.issuer)}</div>
                                ` : ''}
                                ${cert.date ? `
                                    <div class="cert-date">${this.escapeHtml(cert.date)}</div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate languages section
     */
    generateLanguagesSection(languages) {
        if (languages.length === 0) return '';
        
        return `
            <div class="resume-section">
                <h2 class="section-title">Languages</h2>
                <div class="section-content">
                    <div class="languages-list">
                        ${languages.map(lang => `
                            <div class="language-item">
                                <span class="language-name">${this.escapeHtml(lang.name || lang)}</span>
                                ${lang.proficiency ? `
                                    <span class="language-proficiency">${this.escapeHtml(lang.proficiency)}</span>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        const paperElement = this.container.querySelector('.resume-paper');
        paperElement.classList.toggle('edit-mode');
        
        const editBtn = this.container.querySelector('.btn-edit');
        if (paperElement.classList.contains('edit-mode')) {
            editBtn.innerHTML = '<span class="btn-icon">💾</span> Save';
            this.makeEditable();
        } else {
            editBtn.innerHTML = '<span class="btn-icon">✏️</span> Edit';
            this.saveEdits();
        }
    }
    
    /**
     * Make resume fields editable
     */
    makeEditable() {
        const editableElements = this.container.querySelectorAll('[data-field]');
        editableElements.forEach(el => {
            el.contentEditable = true;
            el.classList.add('editable-field');
        });
    }
    
    /**
     * Save edits and update CV data
     */
    saveEdits() {
        const editableElements = this.container.querySelectorAll('[data-field]');
        editableElements.forEach(el => {
            el.contentEditable = false;
            el.classList.remove('editable-field');
        });
        
        // Trigger callback if provided
        if (this.callbacks.onEdit) {
            this.callbacks.onEdit(this.cvData);
        }
        
        this.showNotification('Changes saved successfully', 'success');
    }
    
    /**
     * Download resume as HTML
     */
    downloadResume() {
        if (!this.cvData) {
            this.showNotification('No resume data to download', 'error');
            return;
        }
        
        const resumeHTML = this.generateCompleteHTML();
        const blob = new Blob([resumeHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.cvData.contact.name?.text || 'Resume'}_Resume.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        this.showNotification('Resume downloaded successfully', 'success');
    }
    
    /**
     * Generate complete standalone HTML file
     */
    generateCompleteHTML() {
        const resumeContent = this.generateResumeHTML(this.cvData);
        const styles = this.getResumeStyles();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.cvData.contact.name?.text || 'Resume'} - Professional Resume</title>
    <style>${styles}</style>
</head>
<body>
    <div class="resume-paper">
        ${resumeContent}
    </div>
</body>
</html>`;
    }
    
    /**
     * Reset resume
     */
    resetResume() {
        if (confirm('Are you sure you want to reset? This will clear the current resume.')) {
            this.cvData = null;
            this.entities = [];
            this.initializeUI();
            
            if (this.callbacks.onComplete) {
                this.callbacks.onComplete(null);
            }
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `resume-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    /**
     * Helper: Attach edit handlers
     */
    attachEditHandlers() {
        // Future: Add inline editing capabilities
    }
    
    /**
     * Helper: Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * Set callbacks
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * Get resume-specific styles
     */
    getResumeStyles() {
        return `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
            .resume-paper { max-width: 850px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .resume-name { font-size: 2.5rem; color: #1a1a1a; margin-bottom: 0.5rem; }
            .resume-title { font-size: 1.2rem; color: #666; margin-bottom: 1rem; }
            .contact-info { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid #e0e0e0; }
            .contact-item { display: flex; align-items: center; gap: 0.5rem; color: #555; }
            .contact-icon { font-size: 1rem; }
            .section-title { font-size: 1.5rem; color: #2c3e50; margin: 1.5rem 0 1rem 0; padding-bottom: 0.5rem; border-bottom: 2px solid #3498db; }
            .skills-grid { display: flex; flex-direction: column; gap: 1rem; }
            .skills-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
            .skill-tag { background: #3498db; color: white; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; }
            .experience-item, .education-item { margin-bottom: 1.5rem; }
            .experience-header, .education-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
            .experience-position, .education-degree { font-size: 1.2rem; color: #2c3e50; margin-bottom: 0.25rem; }
            .experience-company, .education-institution { color: #666; font-size: 1rem; }
            .experience-dates, .education-dates { color: #888; font-size: 0.9rem; white-space: nowrap; }
            .experience-description { margin: 0.5rem 0; color: #555; }
            .experience-achievements { margin-left: 1.5rem; color: #555; }
            .experience-achievements li { margin-bottom: 0.25rem; }
        `;
    }
    
    /**
     * Add component styles
     */
    addStyles() {
        if (document.getElementById('resume-viz-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'resume-viz-styles';
        style.textContent = `
            .resume-visualization-wrapper {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                background: var(--dark-bg-secondary, #1a1d35);
                border-radius: var(--radius-lg, 12px);
                padding: var(--spacing-lg, 2rem);
            }
            
            .resume-header-section {
                text-align: center;
                margin-bottom: var(--spacing-xl, 3rem);
                padding-bottom: var(--spacing-md, 1.5rem);
                border-bottom: 1px solid rgba(148, 163, 184, 0.1);
            }
            
            .resume-header-section h2 {
                color: var(--text-primary, #f1f5f9);
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }
            
            .resume-subtitle {
                color: var(--text-secondary, #94a3b8);
                font-size: 1rem;
            }
            
            .resume-display-area {
                margin-bottom: var(--spacing-lg, 2rem);
            }
            
            .resume-paper {
                background: white;
                border-radius: 8px;
                padding: 3rem;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                min-height: 600px;
                transition: all 0.3s ease;
            }
            
            .resume-paper.edit-mode {
                border: 2px dashed #6366f1;
            }
            
            .placeholder-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 500px;
                color: #999;
            }
            
            .placeholder-icon {
                font-size: 4rem;
                margin-bottom: 1rem;
                opacity: 0.5;
            }
            
            .placeholder-content p {
                font-size: 1.1rem;
                color: #999;
            }
            
            /* Resume Content Styling */
            .resume-content {
                color: #1a1a1a;
            }
            
            .resume-section {
                margin-bottom: 2rem;
            }
            
            .header-section {
                text-align: center;
                padding-bottom: 2rem;
                border-bottom: 3px solid #e0e0e0;
                margin-bottom: 2rem;
            }
            
            .resume-name {
                font-size: 2.5rem;
                color: #1a1a1a;
                margin-bottom: 0.5rem;
                font-weight: 700;
            }
            
            .resume-title {
                font-size: 1.3rem;
                color: #666;
                margin-bottom: 1rem;
                font-weight: 400;
            }
            
            .contact-info {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 1.5rem;
                margin-top: 1rem;
            }
            
            .contact-item {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: #555;
                font-size: 0.95rem;
            }
            
            .contact-icon {
                font-size: 1.1rem;
            }
            
            .contact-item a {
                color: #3498db;
                text-decoration: none;
            }
            
            .contact-item a:hover {
                text-decoration: underline;
            }
            
            .section-title {
                font-size: 1.6rem;
                color: #2c3e50;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 3px solid #3498db;
                font-weight: 600;
            }
            
            .section-content {
                padding-left: 0.5rem;
            }
            
            .summary-text {
                line-height: 1.8;
                color: #555;
                font-size: 1rem;
            }
            
            /* Skills Section */
            .skills-grid {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
            }
            
            .skills-category {
                margin-bottom: 1rem;
            }
            
            .skills-category-title {
                font-size: 1.1rem;
                color: #34495e;
                margin-bottom: 0.75rem;
                font-weight: 600;
            }
            
            .skills-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.75rem;
            }
            
            .skill-tag {
                background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
                color: white;
                padding: 0.6rem 1.2rem;
                border-radius: 25px;
                font-size: 0.9rem;
                font-weight: 500;
                transition: transform 0.2s ease;
            }
            
            .skill-tag:hover {
                transform: translateY(-2px);
            }
            
            .skill-tag.soft {
                background: linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%);
            }
            
            /* Experience Section */
            .experience-item {
                margin-bottom: 2rem;
                padding-bottom: 1.5rem;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .experience-item:last-child {
                border-bottom: none;
            }
            
            .experience-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 0.75rem;
            }
            
            .experience-title-group {
                flex: 1;
            }
            
            .experience-position {
                font-size: 1.3rem;
                color: #2c3e50;
                font-weight: 600;
                margin-bottom: 0.25rem;
            }
            
            .experience-company {
                color: #7f8c8d;
                font-size: 1rem;
                margin-bottom: 0;
            }
            
            .experience-dates {
                color: #95a5a6;
                font-size: 0.9rem;
                white-space: nowrap;
                margin-left: 1rem;
            }
            
            .experience-description {
                margin: 0.75rem 0;
                color: #555;
                line-height: 1.7;
            }
            
            .experience-achievements {
                margin-left: 1.5rem;
                color: #555;
            }
            
            .experience-achievements li {
                margin-bottom: 0.5rem;
                line-height: 1.6;
            }
            
            /* Education Section */
            .education-item {
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .education-item:last-child {
                border-bottom: none;
            }
            
            .education-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 0.5rem;
            }
            
            .education-title-group {
                flex: 1;
            }
            
            .education-degree {
                font-size: 1.2rem;
                color: #2c3e50;
                font-weight: 600;
                margin-bottom: 0.25rem;
            }
            
            .education-institution {
                color: #7f8c8d;
                font-size: 1rem;
            }
            
            .education-dates {
                color: #95a5a6;
                font-size: 0.9rem;
                white-space: nowrap;
                margin-left: 1rem;
            }
            
            .education-gpa {
                color: #555;
                margin-top: 0.5rem;
            }
            
            .education-honors {
                color: #555;
                margin-top: 0.5rem;
                font-size: 0.95rem;
            }
            
            /* Certifications */
            .certifications-list {
                display: grid;
                gap: 1rem;
            }
            
            .certification-item {
                background: #f8f9fa;
                padding: 1rem;
                border-radius: 6px;
                border-left: 4px solid #3498db;
            }
            
            .cert-name {
                font-weight: 600;
                color: #2c3e50;
                margin-bottom: 0.25rem;
            }
            
            .cert-issuer {
                color: #7f8c8d;
                font-size: 0.9rem;
            }
            
            .cert-date {
                color: #95a5a6;
                font-size: 0.85rem;
                margin-top: 0.25rem;
            }
            
            /* Languages */
            .languages-list {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
            }
            
            .language-item {
                background: #ecf0f1;
                padding: 0.75rem 1.25rem;
                border-radius: 8px;
                display: flex;
                gap: 0.75rem;
                align-items: center;
            }
            
            .language-name {
                font-weight: 600;
                color: #2c3e50;
            }
            
            .language-proficiency {
                color: #7f8c8d;
                font-size: 0.9rem;
            }
            
            /* Editable Fields */
            .editable-field {
                outline: 2px dashed #6366f1;
                outline-offset: 2px;
                padding: 4px;
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            
            .editable-field:focus {
                background: #f0f4ff;
                outline-color: #4f46e5;
            }
            
            /* Actions Bar */
            .resume-actions-bar {
                display: flex;
                justify-content: center;
                gap: 1rem;
                padding-top: var(--spacing-lg, 2rem);
                border-top: 1px solid rgba(148, 163, 184, 0.1);
            }
            
            .btn-action {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .btn-edit {
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
            }
            
            .btn-edit:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
            }
            
            .btn-download {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
            }
            
            .btn-download:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
            }
            
            .btn-reset {
                background: #1e2139;
                color: #f1f5f9;
                border: 1px solid rgba(148, 163, 184, 0.2);
            }
            
            .btn-reset:hover {
                background: #252849;
                border-color: #ef4444;
                color: #ef4444;
            }
            
            .btn-icon {
                font-size: 1.1rem;
            }
            
            /* Notification */
            .resume-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                background: white;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transform: translateX(400px);
                transition: transform 0.3s ease;
                z-index: 10000;
            }
            
            .resume-notification.show {
                transform: translateX(0);
            }
            
            .resume-notification.success {
                border-left: 4px solid #10b981;
                color: #059669;
            }
            
            .resume-notification.error {
                border-left: 4px solid #ef4444;
                color: #dc2626;
            }
            
            /* Responsive Design */
            @media (max-width: 768px) {
                .resume-paper {
                    padding: 1.5rem;
                }
                
                .resume-name {
                    font-size: 2rem;
                }
                
                .contact-info {
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .experience-header,
                .education-header {
                    flex-direction: column;
                }
                
                .experience-dates,
                .education-dates {
                    margin-left: 0;
                    margin-top: 0.5rem;
                }
                
                .resume-actions-bar {
                    flex-direction: column;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.ResumeVisualization = ResumeVisualization;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResumeVisualization;
}
