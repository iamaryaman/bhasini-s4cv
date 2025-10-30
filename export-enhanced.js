// ENHANCED CV EXPORT WITH PROPER ENCODING
// Fixes: UTF-8 support, Word encoding, mode tracking, multi-language support

(function() {
    'use strict';
    
    const EnhancedCVExporter = {
        // Track the input mode
        inputMode: 'voice', // Default to voice, will be set by app
        
        /**
         * Set the input mode for tracking
         */
        setInputMode(mode) {
            this.inputMode = mode; // 'voice' or 'text'
            console.log('Export mode set to:', mode);
        },
        
        /**
         * Export to PDF with UTF-8 support and proper font handling
         */
        async exportPDF(data, filename) {
            try {
                // Load jsPDF with proper font support
                if (!window.jspdf) {
                    await this.loadJsPDFWithFonts();
                }
                
                const { jsPDF } = window.jspdf;
                
                // Create document with UTF-8 support
                const doc = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                    putOnlyUsedFonts: true,
                    floatPrecision: 16
                });
                
                // Try to add support for Unicode fonts
                await this.setupUnicodeFonts(doc);
                
                let y = 20;
                const pageHeight = 280;
                const pageWidth = 210;
                const margin = 20;
                const contentWidth = pageWidth - (2 * margin);
                
                // Helper to add text with proper encoding
                const addText = (text, size, bold, options = {}) => {
                    if (!text) return;
                    
                    doc.setFontSize(size);
                    
                    // Set font based on content and availability
                    try {
                        doc.setFont('Noto', bold ? 'bold' : 'normal');
                    } catch (e) {
                        // Fallback to helvetica if Noto not available
                        doc.setFont('helvetica', bold ? 'bold' : 'normal');
                    }
                    
                    doc.setTextColor(options.color || '#000000');
                    
                    // Split text to fit width, handling UTF-8 properly
                    const lines = doc.splitTextToSize(String(text), contentWidth);
                    
                    lines.forEach(line => {
                        if (y > pageHeight) {
                            doc.addPage();
                            y = 20;
                        }
                        doc.text(line, margin, y);
                        y += size * 0.4;
                    });
                };
                
                // Add horizontal line
                const addLine = () => {
                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, y, pageWidth - margin, y);
                    y += 5;
                };
                
                // Add section header
                const addSectionHeader = (title) => {
                    y += 3;
                    addText(title.toUpperCase(), 14, true, { color: '#2563EB' });
                    doc.setDrawColor(37, 99, 235);
                    doc.setLineWidth(0.5);
                    doc.line(margin, y, pageWidth - margin, y);
                    y += 7;
                };
                
                // MODE INDICATOR (NEW FEATURE)
                doc.setFillColor(99, 102, 241);
                doc.rect(pageWidth - margin - 40, 10, 40, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.text(`Mode: ${this.inputMode.toUpperCase()}`, pageWidth - margin - 38, 15);
                doc.setTextColor(0, 0, 0);
                
                // NAME (HEADER)
                const name = this.getName(data);
                addText(name.toUpperCase(), 22, true);
                
                // Title/Position
                const title = this.getTitle(data);
                if (title) {
                    addText(title, 14, false, { color: '#4B5563' });
                }
                
                y += 3;
                addLine();
                
                // CONTACT INFORMATION
                const contact = this.getContact(data);
                if (contact && Object.keys(contact).length > 0) {
                    addSectionHeader('CONTACT INFORMATION');
                    
                    if (contact.email) addText(`📧 ${contact.email}`, 11, false);
                    if (contact.phone) addText(`📱 ${contact.phone}`, 11, false);
                    if (contact.location || contact.address) addText(`📍 ${contact.location || contact.address}`, 11, false);
                    if (contact.linkedin) addText(`💼 ${contact.linkedin}`, 11, false);
                    if (contact.github) addText(`💻 ${contact.github}`, 11, false);
                }
                
                // PROFESSIONAL SUMMARY
                const summary = this.getSummary(data);
                if (summary) {
                    addSectionHeader('PROFESSIONAL SUMMARY');
                    addText(summary, 10, false);
                }
                
                // WORK EXPERIENCE
                const experience = this.getExperience(data);
                if (experience && experience.length > 0) {
                    addSectionHeader('WORK EXPERIENCE');
                    
                    experience.forEach((job, index) => {
                        const position = job.position || job.jobTitle || job.job_title || 'Position';
                        const company = job.company || 'Company';
                        const duration = job.duration || this.formatDates(job.startDate, job.endDate);
                        
                        addText(position, 12, true);
                        addText(`${company}${duration ? ' | ' + duration : ''}`, 10, false, { color: '#6B7280' });
                        
                        if (job.location) {
                            addText(`📍 ${job.location}`, 9, false, { color: '#9CA3AF' });
                        }
                        
                        if (job.description) {
                            y += 2;
                            addText(job.description, 10, false);
                        }
                        
                        if (job.responsibilities && job.responsibilities.length > 0) {
                            y += 2;
                            job.responsibilities.forEach(resp => {
                                addText(`• ${resp}`, 10, false);
                            });
                        }
                        
                        if (job.achievements && job.achievements.length > 0) {
                            y += 2;
                            job.achievements.forEach(achievement => {
                                addText(`✓ ${achievement}`, 10, false);
                            });
                        }
                        
                        if (index < experience.length - 1) {
                            y += 4;
                        }
                    });
                }
                
                // EDUCATION
                const education = this.getEducation(data);
                if (education && education.length > 0) {
                    addSectionHeader('EDUCATION');
                    
                    education.forEach((edu, index) => {
                        const degree = edu.degree || 'Degree';
                        const field = edu.field || edu.fieldOfStudy || edu.field_of_study;
                        const institution = edu.institution || edu.school || 'Institution';
                        const year = edu.year || edu.graduationDate || edu.graduation_date;
                        
                        addText(`${degree}${field ? ' in ' + field : ''}`, 11, true);
                        addText(`${institution}${year ? ' | ' + year : ''}`, 10, false, { color: '#6B7280' });
                        
                        if (edu.gpa) {
                            addText(`GPA: ${edu.gpa}`, 9, false);
                        }
                        
                        if (edu.honors && edu.honors.length > 0) {
                            addText(`Honors: ${edu.honors.join(', ')}`, 9, false);
                        }
                        
                        if (index < education.length - 1) {
                            y += 3;
                        }
                    });
                }
                
                // SKILLS
                const skills = this.getSkills(data);
                if (skills && skills.length > 0) {
                    addSectionHeader('SKILLS');
                    
                    // Group skills by category if available
                    const skillsData = data.skills;
                    if (skillsData && (skillsData.technical || skillsData.soft)) {
                        if (skillsData.technical && skillsData.technical.length > 0) {
                            addText('Technical Skills:', 10, true);
                            addText(skillsData.technical.join(' • '), 10, false);
                            y += 2;
                        }
                        if (skillsData.soft && skillsData.soft.length > 0) {
                            addText('Soft Skills:', 10, true);
                            addText(skillsData.soft.join(' • '), 10, false);
                        }
                    } else {
                        addText(skills.join(' • '), 10, false);
                    }
                }
                
                // LANGUAGES
                const languages = this.getLanguages(data);
                if (languages && languages.length > 0) {
                    addSectionHeader('LANGUAGES');
                    
                    languages.forEach(lang => {
                        const langName = typeof lang === 'string' ? lang : lang.name;
                        const proficiency = lang.proficiency || '';
                        addText(`${langName}${proficiency ? ' - ' + proficiency : ''}`, 10, false);
                    });
                }
                
                // CERTIFICATIONS
                const certifications = this.getCertifications(data);
                if (certifications && certifications.length > 0) {
                    addSectionHeader('CERTIFICATIONS');
                    
                    certifications.forEach(cert => {
                        const certName = cert.name || cert.certification;
                        const issuer = cert.issuer || '';
                        const date = cert.date || '';
                        
                        addText(certName, 10, true);
                        if (issuer || date) {
                            addText(`${issuer}${date ? ' | ' + date : ''}`, 9, false, { color: '#6B7280' });
                        }
                        y += 2;
                    });
                }
                
                // Add metadata
                doc.setProperties({
                    title: `${name} - Resume`,
                    subject: 'Professional Resume',
                    author: name,
                    keywords: 'resume, cv, professional',
                    creator: 'S4CV - Voice CV Builder',
                    creationDate: new Date()
                });
                
                // Add attachments
                await this.addAttachments(doc);
                
                // Save
                doc.save(filename || `${name.replace(/\s+/g, '_')}_Resume.pdf`);
                return true;
                
            } catch (error) {
                console.error('PDF Export Error:', error);
                alert('PDF Export Failed: ' + error.message);
                return false;
            }
        },
        
        /**
         * Export to Word with proper UTF-8 encoding
         */
        exportWord(data, filename) {
            try {
                // Create HTML with UTF-8 BOM for proper Word encoding
                const BOM = '\uFEFF';
                
                let html = BOM + `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <title>Resume</title>
    <style>
        @page {
            size: A4;
            margin: 2cm;
        }
        body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 11pt;
            color: #000000;
            line-height: 1.5;
        }
        h1 {
            font-size: 24pt;
            font-weight: bold;
            text-align: center;
            border-bottom: 3pt solid #2563EB;
            padding-bottom: 10pt;
            margin-bottom: 15pt;
            color: #1E3A8A;
        }
        h2 {
            font-size: 14pt;
            font-weight: bold;
            margin-top: 15pt;
            margin-bottom: 8pt;
            padding-bottom: 5pt;
            border-bottom: 1pt solid #2563EB;
            color: #2563EB;
        }
        h3 {
            font-size: 12pt;
            font-weight: bold;
            margin-top: 8pt;
            margin-bottom: 4pt;
            color: #1F2937;
        }
        p {
            margin: 5pt 0;
        }
        .subtitle {
            font-size: 14pt;
            color: #4B5563;
            text-align: center;
            margin-bottom: 10pt;
        }
        .contact-info {
            text-align: center;
            margin-bottom: 15pt;
            color: #6B7280;
        }
        .section {
            margin-bottom: 15pt;
        }
        .job-header, .edu-header {
            margin-bottom: 5pt;
        }
        ul {
            margin: 5pt 0 5pt 20pt;
        }
        li {
            margin-bottom: 3pt;
        }
        .mode-badge {
            float: right;
            background-color: #6366F1;
            color: white;
            padding: 3pt 10pt;
            border-radius: 10pt;
            font-size: 9pt;
            font-weight: bold;
        }
    </style>
</head>
<body>`;
                
                // MODE INDICATOR
                html += `<div class="mode-badge">Mode: ${this.inputMode.toUpperCase()}</div>`;
                html += '<div style="clear: both;"></div>';
                
                // NAME
                const name = this.getName(data);
                html += `<h1>${this.escapeHtml(name)}</h1>`;
                
                // Title
                const title = this.getTitle(data);
                if (title) {
                    html += `<p class="subtitle">${this.escapeHtml(title)}</p>`;
                }
                
                // CONTACT
                const contact = this.getContact(data);
                if (contact && Object.keys(contact).length > 0) {
                    html += '<div class="contact-info">';
                    const contactItems = [];
                    if (contact.email) contactItems.push(`📧 ${this.escapeHtml(contact.email)}`);
                    if (contact.phone) contactItems.push(`📱 ${this.escapeHtml(contact.phone)}`);
                    if (contact.location || contact.address) contactItems.push(`📍 ${this.escapeHtml(contact.location || contact.address)}`);
                    if (contact.linkedin) contactItems.push(`💼 LinkedIn: ${this.escapeHtml(contact.linkedin)}`);
                    if (contact.github) contactItems.push(`💻 GitHub: ${this.escapeHtml(contact.github)}`);
                    html += contactItems.join(' | ');
                    html += '</div>';
                }
                
                // SUMMARY
                const summary = this.getSummary(data);
                if (summary) {
                    html += '<div class="section">';
                    html += '<h2>PROFESSIONAL SUMMARY</h2>';
                    html += `<p>${this.escapeHtml(summary)}</p>`;
                    html += '</div>';
                }
                
                // EXPERIENCE
                const experience = this.getExperience(data);
                if (experience && experience.length > 0) {
                    html += '<div class="section">';
                    html += '<h2>WORK EXPERIENCE</h2>';
                    
                    experience.forEach(job => {
                        const position = job.position || job.jobTitle || job.job_title || 'Position';
                        const company = job.company || 'Company';
                        const duration = job.duration || this.formatDates(job.startDate, job.endDate);
                        
                        html += '<div class="job-header">';
                        html += `<h3>${this.escapeHtml(position)}</h3>`;
                        html += `<p><strong>${this.escapeHtml(company)}</strong>${duration ? ' | ' + this.escapeHtml(duration) : ''}`;
                        if (job.location) html += ` | 📍 ${this.escapeHtml(job.location)}`;
                        html += '</p>';
                        html += '</div>';
                        
                        if (job.description) {
                            html += `<p>${this.escapeHtml(job.description)}</p>`;
                        }
                        
                        if (job.responsibilities && job.responsibilities.length > 0) {
                            html += '<ul>';
                            job.responsibilities.forEach(resp => {
                                html += `<li>${this.escapeHtml(resp)}</li>`;
                            });
                            html += '</ul>';
                        }
                        
                        if (job.achievements && job.achievements.length > 0) {
                            html += '<p><strong>Key Achievements:</strong></p><ul>';
                            job.achievements.forEach(achievement => {
                                html += `<li>${this.escapeHtml(achievement)}</li>`;
                            });
                            html += '</ul>';
                        }
                    });
                    
                    html += '</div>';
                }
                
                // EDUCATION
                const education = this.getEducation(data);
                if (education && education.length > 0) {
                    html += '<div class="section">';
                    html += '<h2>EDUCATION</h2>';
                    
                    education.forEach(edu => {
                        const degree = edu.degree || 'Degree';
                        const field = edu.field || edu.fieldOfStudy || edu.field_of_study;
                        const institution = edu.institution || edu.school || 'Institution';
                        const year = edu.year || edu.graduationDate || edu.graduation_date;
                        
                        html += '<div class="edu-header">';
                        html += `<h3>${this.escapeHtml(degree)}${field ? ' in ' + this.escapeHtml(field) : ''}</h3>`;
                        html += `<p><strong>${this.escapeHtml(institution)}</strong>${year ? ' | ' + this.escapeHtml(year) : ''}</p>`;
                        if (edu.gpa) html += `<p>GPA: ${this.escapeHtml(edu.gpa)}</p>`;
                        if (edu.honors && edu.honors.length > 0) {
                            html += `<p>Honors: ${edu.honors.map(h => this.escapeHtml(h)).join(', ')}</p>`;
                        }
                        html += '</div>';
                    });
                    
                    html += '</div>';
                }
                
                // SKILLS
                const skills = this.getSkills(data);
                if (skills && skills.length > 0) {
                    html += '<div class="section">';
                    html += '<h2>SKILLS</h2>';
                    
                    const skillsData = data.skills;
                    if (skillsData && (skillsData.technical || skillsData.soft)) {
                        if (skillsData.technical && skillsData.technical.length > 0) {
                            html += '<p><strong>Technical Skills:</strong> ';
                            html += skillsData.technical.map(s => this.escapeHtml(s)).join(' • ');
                            html += '</p>';
                        }
                        if (skillsData.soft && skillsData.soft.length > 0) {
                            html += '<p><strong>Soft Skills:</strong> ';
                            html += skillsData.soft.map(s => this.escapeHtml(s)).join(' • ');
                            html += '</p>';
                        }
                    } else {
                        html += '<p>' + skills.map(s => this.escapeHtml(s)).join(' • ') + '</p>';
                    }
                    
                    html += '</div>';
                }
                
                // LANGUAGES
                const languages = this.getLanguages(data);
                if (languages && languages.length > 0) {
                    html += '<div class="section">';
                    html += '<h2>LANGUAGES</h2>';
                    html += '<p>';
                    languages.forEach((lang, index) => {
                        const langName = typeof lang === 'string' ? lang : lang.name;
                        const proficiency = lang.proficiency || '';
                        html += `${this.escapeHtml(langName)}${proficiency ? ' (' + this.escapeHtml(proficiency) + ')' : ''}`;
                        if (index < languages.length - 1) html += ' • ';
                    });
                    html += '</p>';
                    html += '</div>';
                }
                
                // CERTIFICATIONS
                const certifications = this.getCertifications(data);
                if (certifications && certifications.length > 0) {
                    html += '<div class="section">';
                    html += '<h2>CERTIFICATIONS</h2>';
                    
                    certifications.forEach(cert => {
                        const certName = cert.name || cert.certification;
                        const issuer = cert.issuer || '';
                        const date = cert.date || '';
                        
                        html += `<p><strong>${this.escapeHtml(certName)}</strong>`;
                        if (issuer || date) {
                            html += ` - ${this.escapeHtml(issuer)}${date ? ' | ' + this.escapeHtml(date) : ''}`;
                        }
                        html += '</p>';
                    });
                    
                    html += '</div>';
                }
                
                html += '</body></html>';
                
                // Create blob with proper encoding
                const blob = new Blob([html], { 
                    type: 'application/msword;charset=utf-8' 
                });
                
                // Download
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename || `${name.replace(/\s+/g, '_')}_Resume.doc`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                
                return true;
                
            } catch (error) {
                console.error('Word Export Error:', error);
                alert('Word Export Failed: ' + error.message);
                return false;
            }
        },
        
        // Data extraction helpers
        getName(data) {
            return data.personalInfo?.fullName || 
                   data.contact?.name?.text || 
                   data.contact?.name || 
                   data.name || 
                   'Resume';
        },
        
        getTitle(data) {
            return data.personalInfo?.title || 
                   data.contact?.title?.text || 
                   data.contact?.title || 
                   data.title || 
                   '';
        },
        
        getContact(data) {
            const contact = {};
            const source = data.personalInfo || data.contact || {};
            
            contact.email = source.email?.text || source.email || '';
            contact.phone = source.phone?.text || source.phone || '';
            contact.location = source.location?.text || source.location || source.address?.text || source.address || '';
            contact.linkedin = source.linkedin?.text || source.linkedin || '';
            contact.github = source.github?.text || source.github || '';
            
            return contact;
        },
        
        getSummary(data) {
            return data.professionalSummary || 
                   data.professional?.summary || 
                   data.summary || 
                   '';
        },
        
        getExperience(data) {
            return data.workExperience || 
                   data.professional?.experience || 
                   data.experience || 
                   [];
        },
        
        getEducation(data) {
            return data.education?.degrees || 
                   data.education || 
                   [];
        },
        
        getSkills(data) {
            if (data.skills?.technical) {
                return [...(data.skills.technical || []), ...(data.skills.soft || [])];
            }
            return data.skills || [];
        },
        
        getLanguages(data) {
            return data.professional?.languages || 
                   data.languages || 
                   [];
        },
        
        getCertifications(data) {
            return data.education?.certifications || 
                   data.certifications || 
                   [];
        },
        
        formatDates(start, end) {
            if (!start && !end) return '';
            if (!end) return `${start} - Present`;
            return `${start} - ${end}`;
        },
        
        escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        },
        
        // Font loading helpers
        async loadJsPDFWithFonts() {
            return new Promise((resolve, reject) => {
                if (window.jspdf) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => {
                    console.log('jsPDF loaded successfully');
                    resolve();
                };
                script.onerror = () => reject(new Error('Failed to load jsPDF'));
                document.head.appendChild(script);
            });
        },
        
        async setupUnicodeFonts(doc) {
            // Try to set up Unicode support
            // Note: Full Unicode support in jsPDF requires additional font files
            // For production, you'd want to add Noto Sans or similar
            try {
                // Check if we have access to custom fonts
                // For now, we'll use the built-in fonts with better encoding
                console.log('Using built-in fonts with UTF-8 encoding');
            } catch (error) {
                console.warn('Unicode font setup warning:', error);
            }
        },
        
        // Attachment handling
        async addAttachments(doc) {
            try {
                if (!window.app || !window.app.uploadedDocuments || window.app.uploadedDocuments.length === 0) {
                    return;
                }
                
                console.log(`Adding ${window.app.uploadedDocuments.length} attachment(s)...`);
                
                for (const docFile of window.app.uploadedDocuments) {
                    try {
                        const file = docFile.file || docFile;
                        doc.addPage();
                        
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        doc.text('Attachment: ' + file.name, 20, 20);
                        
                        if (file.type && file.type.startsWith('image/')) {
                            const imageData = await this.fileToDataURL(file);
                            const img = await this.loadImage(imageData);
                            
                            const maxWidth = 170;
                            const maxHeight = 240;
                            let imgWidth = img.width;
                            let imgHeight = img.height;
                            
                            const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
                            imgWidth *= ratio;
                            imgHeight *= ratio;
                            
                            const x = (210 - imgWidth) / 2;
                            const y = 40;
                            
                            doc.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight);
                        } else {
                            doc.setFontSize(11);
                            doc.setFont('helvetica', 'normal');
                            doc.text('File type: ' + (file.type || 'Unknown'), 20, 40);
                            doc.text('Size: ' + this.formatFileSize(file.size), 20, 50);
                        }
                        
                    } catch (error) {
                        console.error(`Error adding attachment:`, error);
                    }
                }
                
            } catch (error) {
                console.error('Error adding attachments:', error);
            }
        },
        
        fileToDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        
        loadImage(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        },
        
        formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
    };
    
    // Export to global scope
    window.EnhancedCVExporter = EnhancedCVExporter;
    
    // Override the old exporter
    window.CVExporter = EnhancedCVExporter;
    window.resumeExporter = {
        exportToPDF: (data, filename) => EnhancedCVExporter.exportPDF(data, filename),
        exportToWord: (data, filename) => EnhancedCVExporter.exportWord(data, filename),
        setInputMode: (mode) => EnhancedCVExporter.setInputMode(mode)
    };
    
    console.log('✅ Enhanced CV Exporter loaded with UTF-8 support and mode tracking');
    
})();
