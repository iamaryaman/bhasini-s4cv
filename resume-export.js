// Resume Export Module - Handles PDF and Word document generation
class ResumeExporter {
    constructor() {
        this.initialized = false;
        this.loadDependencies();
    }
    
    async loadDependencies() {
        // Load jsPDF and docx libraries dynamically
        if (!window.jspdf && !document.getElementById('jspdf-script')) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf-script');
        }
        
        if (!window.docx && !document.getElementById('docx-script')) {
            await this.loadScript('https://unpkg.com/docx@7.8.0/build/index.js', 'docx-script');
        }
        
        // Load html2canvas for better text rendering
        if (!window.html2canvas && !document.getElementById('html2canvas-script')) {
            await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas-script');
        }
        
        this.initialized = true;
    }
    
    loadScript(src, id) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.id = id;
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    async exportToPDF(resumeData, filename = 'resume.pdf') {
        if (!this.initialized) {
            await this.loadDependencies();
        }
        
        // For better Unicode support, use HTML-to-Canvas-to-PDF approach
        if (this.hasUnicodeText(resumeData)) {
            return await this.exportToPDFWithCanvas(resumeData, filename);
        }
        
        // Fallback to direct jsPDF for English-only content
        if (!window.jspdf) {
            console.error('jsPDF library not loaded');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        let yPos = 20;
        const lineHeight = 7;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        const contentWidth = pageWidth - (2 * margin);
        
        // Helper function to add text with word wrap
        const addWrappedText = (text, fontSize = 12, fontStyle = 'normal', indent = 0) => {
            doc.setFontSize(fontSize);
            doc.setFont(undefined, fontStyle);
            
            const lines = doc.splitTextToSize(text, contentWidth - indent);
            lines.forEach(line => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, margin + indent, yPos);
                yPos += lineHeight;
            });
        };
        
        // CV Title
        addWrappedText('CURRICULUM VITAE', 22, 'bold');
        yPos += 10;
        
        // Name
        if (resumeData.personalInfo?.fullName) {
            addWrappedText(resumeData.personalInfo.fullName, 18, 'bold');
            yPos += 10;
        }
        
        // Contact Information Section
        const hasContact = resumeData.personalInfo?.email || resumeData.personalInfo?.phone || resumeData.personalInfo?.location;
        if (hasContact) {
            addWrappedText('CONTACT INFORMATION', 14, 'bold');
            yPos += 2;
            
            if (resumeData.personalInfo.email) {
                addWrappedText(`Email: ${resumeData.personalInfo.email}`, 11, 'normal', 5);
            }
            if (resumeData.personalInfo.phone) {
                addWrappedText(`Phone: ${resumeData.personalInfo.phone}`, 11, 'normal', 5);
            }
            if (resumeData.personalInfo.location) {
                addWrappedText(`Location: ${resumeData.personalInfo.location}`, 11, 'normal', 5);
            }
            yPos += 5;
        }
        
        // Professional Summary
        if (resumeData.professionalSummary && resumeData.professionalSummary.trim()) {
            addWrappedText('PROFESSIONAL SUMMARY', 14, 'bold');
            yPos += 2;
            addWrappedText(resumeData.professionalSummary, 11, 'normal');
            yPos += 5;
        }
        
        // Work Experience
        if (resumeData.workExperience && resumeData.workExperience.length > 0) {
            addWrappedText('WORK EXPERIENCE', 14, 'bold');
            yPos += 2;
            
            resumeData.workExperience.forEach(exp => {
                addWrappedText(`${exp.jobTitle || ''} at ${exp.company || ''}`, 12, 'bold', 5);
                if (exp.duration) {
                    addWrappedText(exp.duration, 10, 'italic', 5);
                }
                if (exp.description) {
                    addWrappedText(exp.description, 11, 'normal', 5);
                }
                yPos += 3;
            });
            yPos += 2;
        }
        
        // Education
        if (resumeData.education && resumeData.education.length > 0) {
            addWrappedText('EDUCATION', 14, 'bold');
            yPos += 2;
            
            resumeData.education.forEach(edu => {
                addWrappedText(`${edu.degree || ''} - ${edu.institution || ''}`, 12, 'bold', 5);
                if (edu.year) {
                    addWrappedText(edu.year, 10, 'italic', 5);
                }
                if (edu.details) {
                    addWrappedText(edu.details, 11, 'normal', 5);
                }
                yPos += 3;
            });
            yPos += 2;
        }
        
        // Technical Skills
        if (resumeData.skills?.technical && resumeData.skills.technical.length > 0) {
            addWrappedText('TECHNICAL SKILLS', 14, 'bold');
            yPos += 2;
            addWrappedText(resumeData.skills.technical.join(', '), 11, 'normal', 5);
            yPos += 5;
        }
        
        // Languages
        if (resumeData.languages && resumeData.languages.length > 0) {
            addWrappedText('LANGUAGES', 14, 'bold');
            yPos += 2;
            resumeData.languages.forEach(lang => {
                addWrappedText(`${lang.name} - ${lang.proficiency}`, 11, 'normal', 5);
            });
            yPos += 5;
        }
        
        // Save the PDF
        doc.save(filename);
    }
    
    hasUnicodeText(resumeData) {
        // Check if the resume contains Hindi/Unicode characters
        const textToCheck = [
            resumeData.personalInfo?.fullName,
            resumeData.personalInfo?.location,
            resumeData.professionalSummary,
            ...(resumeData.workExperience?.map(w => w.jobTitle + ' ' + w.company) || []),
            ...(resumeData.education?.map(e => e.degree + ' ' + e.institution) || []),
            ...(resumeData.skills?.technical || []),
            ...(resumeData.languages?.map(l => l.name) || [])
        ].filter(Boolean).join(' ');
        
        // Check for Devanagari script (Hindi), Arabic script, or other non-Latin scripts
        const unicodeRegex = /[\u0900-\u097F\u0600-\u06FF\u4E00-\u9FFF\u0370-\u03FF]/;
        return unicodeRegex.test(textToCheck);
    }
    
    async exportToPDFWithCanvas(resumeData, filename = 'resume.pdf') {
        try {
            // Create a temporary HTML element with the resume content
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = `
                position: fixed;
                left: -9999px;
                top: 0;
                width: 800px;
                background: white;
                padding: 40px;
                font-family: 'Noto Sans Devanagari', 'Arial Unicode MS', Arial, sans-serif;
                font-size: 16px;
                line-height: 1.8;
                color: #000000;
                font-weight: 500;
            `;
            
            // Generate HTML content with proper styling
            tempDiv.innerHTML = this.generateStyledHTMLContent(resumeData);
            document.body.appendChild(tempDiv);
            
            // Wait for fonts to load
            await this.loadFonts();
            
            // Convert HTML to canvas with high quality
            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: 800,
                height: tempDiv.scrollHeight,
                scrollX: 0,
                scrollY: 0
            });
            
            // Remove temporary element
            document.body.removeChild(tempDiv);
            
            // Create PDF from canvas
            const { jsPDF } = window.jspdf;
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            
            const doc = new jsPDF('p', 'mm', 'a4');
            let position = 0;
            
            // Add canvas image to PDF
            const imgData = canvas.toDataURL('image/png');
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            
            // Add new pages if content is longer than one page
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            
            // Add uploaded documents as attachments if available
            await this.addDocumentAttachments(doc, resumeData);
            
            doc.save(filename);
            
        } catch (error) {
            console.error('PDF export with canvas failed:', error);
            // Fallback to basic text export
            return this.exportBasicPDF(resumeData, filename);
        }
    }
    
    generateStyledHTMLContent(resumeData) {
        let html = `<div style="max-width: 800px; margin: 0 auto;">`;
        
        // Title
        html += `<h1 style="text-align: center; color: #000000; border-bottom: 3px solid #000000; padding-bottom: 15px; margin-bottom: 30px; font-size: 28px; font-weight: 700;">CURRICULUM VITAE</h1>`;
        
        // Name
        if (resumeData.personalInfo?.fullName) {
            html += `<h2 style="text-align: center; color: #000000; margin-bottom: 25px; font-size: 22px; font-weight: 600;">${this.escapeHtml(resumeData.personalInfo.fullName)}</h2>`;
        }
        
        // Contact Information
        const hasContact = resumeData.personalInfo?.email || resumeData.personalInfo?.phone || resumeData.personalInfo?.location;
        if (hasContact) {
            html += `<div style="margin-bottom: 25px;">`;
            html += `<h3 style="color: #000000; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 15px; font-weight: 700;">संपर्क जानकारी / Contact Information</h3>`;
            
            if (resumeData.personalInfo.email) {
                html += `<p style="margin: 8px 0; color: #000000; font-weight: 500;"><strong style="color: #000000;">Email:</strong> ${this.escapeHtml(resumeData.personalInfo.email)}</p>`;
            }
            if (resumeData.personalInfo.phone) {
                html += `<p style="margin: 8px 0; color: #000000; font-weight: 500;"><strong style="color: #000000;">Phone:</strong> ${this.escapeHtml(resumeData.personalInfo.phone)}</p>`;
            }
            if (resumeData.personalInfo.location) {
                html += `<p style="margin: 8px 0; color: #000000; font-weight: 500;"><strong style="color: #000000;">Location:</strong> ${this.escapeHtml(resumeData.personalInfo.location)}</p>`;
            }
            html += `</div>`;
        }
        
        // Professional Summary
        if (resumeData.professionalSummary && resumeData.professionalSummary.trim()) {
            html += `<div style="margin-bottom: 25px;">`;
            html += `<h3 style="color: #000000; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 15px; font-weight: 700;">व्यावसायिक सारांश / Professional Summary</h3>`;
            html += `<p style="text-align: justify; line-height: 1.8; color: #000000; font-weight: 500;">${this.escapeHtml(resumeData.professionalSummary)}</p>`;
            html += `</div>`;
        }
        
        // Work Experience
        if (resumeData.workExperience && resumeData.workExperience.length > 0) {
            html += `<div style="margin-bottom: 25px;">`;
            html += `<h3 style="color: #000000; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 15px; font-weight: 700;">कार्य अनुभव / Work Experience</h3>`;
            
            resumeData.workExperience.forEach(exp => {
                html += `<div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #000000; background: #f0f0f0;">`;
                html += `<h4 style="margin: 0 0 8px 0; color: #000000; font-size: 16px; font-weight: 700;">${this.escapeHtml(exp.jobTitle || '')}</h4>`;
                if (exp.company) {
                    html += `<p style="margin: 0 0 8px 0; color: #000000; font-weight: 600;">${this.escapeHtml(exp.company)} ${exp.duration ? '• ' + this.escapeHtml(exp.duration) : ''}</p>`;
                }
                if (exp.description) {
                    html += `<p style="margin: 8px 0 0 0; line-height: 1.6; color: #000000; font-weight: 500;">${this.escapeHtml(exp.description)}</p>`;
                }
                html += `</div>`;
            });
            html += `</div>`;
        }
        
        // Education
        if (resumeData.education && resumeData.education.length > 0) {
            html += `<div style="margin-bottom: 25px;">`;
            html += `<h3 style="color: #000000; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 15px; font-weight: 700;">शिक्षा / Education</h3>`;
            
            resumeData.education.forEach(edu => {
                html += `<div style="margin-bottom: 15px; padding: 12px; background: #f0f0f0; border-radius: 8px;">`;
                html += `<h4 style="margin: 0 0 5px 0; color: #000000; font-size: 15px; font-weight: 700;">${this.escapeHtml(edu.degree || '')}</h4>`;
                if (edu.institution) {
                    html += `<p style="margin: 0 0 5px 0; color: #000000; font-weight: 600;">${this.escapeHtml(edu.institution)} ${edu.year ? '• ' + this.escapeHtml(edu.year) : ''}</p>`;
                }
                html += `</div>`;
            });
            html += `</div>`;
        }
        
        // Technical Skills
        if (resumeData.skills?.technical && resumeData.skills.technical.length > 0) {
            html += `<div style="margin-bottom: 25px;">`;
            html += `<h3 style="color: #000000; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 15px; font-weight: 700;">तकनीकी कौशल / Technical Skills</h3>`;
            html += `<div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
            resumeData.skills.technical.forEach(skill => {
                html += `<span style="background: #d0d0d0; color: #000000; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; border: 1px solid #000000;">${this.escapeHtml(skill)}</span>`;
            });
            html += `</div></div>`;
        }
        
        // Languages
        if (resumeData.languages && resumeData.languages.length > 0) {
            html += `<div style="margin-bottom: 25px;">`;
            html += `<h3 style="color: #000000; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 15px; font-weight: 700;">भाषाएं / Languages</h3>`;
            resumeData.languages.forEach(lang => {
                html += `<p style="margin: 8px 0; padding: 8px; background: #f0f0f0; border-radius: 6px; color: #000000; font-weight: 600;"><strong style="color: #000000;">${this.escapeHtml(lang.name)}</strong> - ${this.escapeHtml(lang.proficiency)}</p>`;
            });
            html += `</div>`;
        }
        
        html += `</div>`;
        return html;
    }
    
    async loadFonts() {
        // Load Google Fonts for Devanagari script
        const fontLink = document.createElement('link');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
        
        // Wait for fonts to load
        return new Promise(resolve => {
            setTimeout(resolve, 2000); // Wait 2 seconds for fonts to load
        });
    }
    
    async addDocumentAttachments(doc, resumeData) {
        // Add uploaded documents as additional pages
        if (window.app && window.app.uploadedDocuments && window.app.uploadedDocuments.length > 0) {
            console.log('Adding', window.app.uploadedDocuments.length, 'document attachments');
            
            for (const docFile of window.app.uploadedDocuments) {
                try {
                    if (docFile.type.startsWith('image/')) {
                        // Add images as new pages
                        const reader = new FileReader();
                        const imageData = await new Promise(resolve => {
                            reader.onload = (e) => resolve(e.target.result);
                            reader.readAsDataURL(docFile.file);
                        });
                        
                        doc.addPage();
                        
                        // Add document title
                        doc.setFontSize(14);
                        doc.setFont(undefined, 'bold');
                        doc.text(`Attachment: ${docFile.name}`, 20, 20);
                        
                        // Add image
                        const imgWidth = 170;
                        const imgHeight = 200; // Max height
                        doc.addImage(imageData, 'JPEG', 20, 30, imgWidth, imgHeight);
                    }
                } catch (error) {
                    console.error('Error adding attachment:', docFile.name, error);
                }
            }
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    async exportToWord(resumeData, filename = 'resume.docx') {
        if (!this.initialized) {
            await this.loadDependencies();
        }
        
        // For Word export, we'll create a simplified HTML version and trigger download
        // as full docx library implementation would be complex
        const htmlContent = this.generateHTMLContent(resumeData);
        
        // Create a Blob with proper Word document headers
        const preHtml = `
            <html xmlns:o='urn:schemas-microsoft-com:office:office' 
                  xmlns:w='urn:schemas-microsoft-com:office:word' 
                  xmlns='http://www.w3.org/TR/REC-html40'>
            <head>
                <meta charset='utf-8'>
                <title>Resume</title>
                <style>
                    body {
                        font-family: 'Calibri', 'Arial', sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    h1 { 
                        color: #2c3e50; 
                        border-bottom: 2px solid #3498db; 
                        padding-bottom: 10px;
                        margin-bottom: 20px;
                    }
                    h2 { 
                        color: #34495e; 
                        margin-top: 25px;
                        margin-bottom: 15px;
                        font-size: 18px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    h3 { 
                        color: #555; 
                        margin-top: 15px;
                        margin-bottom: 10px;
                        font-size: 16px;
                    }
                    .contact-info {
                        text-align: center;
                        margin-bottom: 20px;
                        color: #666;
                    }
                    .contact-section {
                        margin-bottom: 25px;
                        padding: 15px;
                        background-color: #f8f9fa;
                        border-radius: 8px;
                        border-left: 4px solid #3498db;
                    }
                    .contact-section p {
                        margin: 5px 0;
                        font-size: 14px;
                    }
                    .experience-item, .education-item {
                        margin-bottom: 20px;
                        padding-left: 20px;
                    }
                    .duration {
                        font-style: italic;
                        color: #666;
                        font-size: 14px;
                    }
                    .skills-section {
                        margin-top: 20px;
                    }
                    .skills-category {
                        margin-bottom: 10px;
                    }
                    .skills-category strong {
                        color: #555;
                    }
                    ul {
                        margin: 10px 0;
                        padding-left: 30px;
                    }
                    li {
                        margin-bottom: 5px;
                    }
                    @page {
                        size: A4;
                        margin: 2cm;
                    }
                </style>
            </head>
            <body>`;
        
        const postHtml = '</body></html>';
        const html = preHtml + htmlContent + postHtml;
        
        const blob = new Blob(['\ufeff', html], {
            type: 'application/msword'
        });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        // Change extension to .doc for better compatibility
        const docFilename = filename.replace(/\.docx?$/, '.doc');
        link.download = docFilename;
        link.click();
        URL.revokeObjectURL(link.href);
    }
    
    generateHTMLContent(resumeData) {
        let html = '';
        
        // CV Title
        html += `<div style="text-align: center; margin-bottom: 30px;">`;
        html += `<h1 style="font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #2c3e50;">CURRICULUM VITAE</h1>`;
        html += `</div>`;
        
        // Name and Contact Information Section
        if (resumeData.personalInfo?.fullName) {
            html += `<h1 style="text-align: center; margin-bottom: 20px;">${this.escapeHtml(resumeData.personalInfo.fullName)}</h1>`;
        }
        
        const hasContact = resumeData.personalInfo?.email || resumeData.personalInfo?.phone || resumeData.personalInfo?.location;
        if (hasContact) {
            html += `<h2>CONTACT INFORMATION</h2>`;
            html += `<div class="contact-section">`;
            if (resumeData.personalInfo.email) html += `<p><strong>Email:</strong> ${this.escapeHtml(resumeData.personalInfo.email)}</p>`;
            if (resumeData.personalInfo.phone) html += `<p><strong>Phone:</strong> ${this.escapeHtml(resumeData.personalInfo.phone)}</p>`;
            if (resumeData.personalInfo.location) html += `<p><strong>Location:</strong> ${this.escapeHtml(resumeData.personalInfo.location)}</p>`;
            html += `</div>`;
        }
        
        // Professional Summary
        if (resumeData.professionalSummary && resumeData.professionalSummary.trim()) {
            html += `<h2>PROFESSIONAL SUMMARY</h2>`;
            html += `<p>${this.escapeHtml(resumeData.professionalSummary)}</p>`;
        }
        
        // Work Experience
        if (resumeData.workExperience && resumeData.workExperience.length > 0) {
            html += `<h2>WORK EXPERIENCE</h2>`;
            resumeData.workExperience.forEach(exp => {
                html += '<div class="experience-item">';
                html += `<h3>${this.escapeHtml(exp.jobTitle || '')} at ${this.escapeHtml(exp.company || '')}</h3>`;
                if (exp.duration) {
                    html += `<div class="duration">${this.escapeHtml(exp.duration)}</div>`;
                }
                if (exp.description) {
                    html += `<p>${this.escapeHtml(exp.description)}</p>`;
                }
                html += '</div>';
            });
        }
        
        // Education
        if (resumeData.education && resumeData.education.length > 0) {
            html += `<h2>Education</h2>`;
            resumeData.education.forEach(edu => {
                html += '<div class="education-item">';
                html += `<h3>${this.escapeHtml(edu.degree || '')} - ${this.escapeHtml(edu.institution || '')}</h3>`;
                if (edu.year) {
                    html += `<div class="duration">${this.escapeHtml(edu.year)}</div>`;
                }
                if (edu.details) {
                    html += `<p>${this.escapeHtml(edu.details)}</p>`;
                }
                html += '</div>';
            });
        }
        
        // Technical Skills
        if (resumeData.skills?.technical && resumeData.skills.technical.length > 0) {
            html += `<h2>TECHNICAL SKILLS</h2>`;
            html += '<div class="skills-section">';
            html += '<div class="skills-category">';
            html += `<p>${resumeData.skills.technical.map(s => this.escapeHtml(s)).join(', ')}</p>`;
            html += '</div>';
            html += '</div>';
        }
        
        // Languages
        if (resumeData.languages && resumeData.languages.length > 0) {
            html += `<h2>LANGUAGES</h2>`;
            html += '<div class="skills-section">';
            resumeData.languages.forEach(lang => {
                html += `<p><strong>${this.escapeHtml(lang.name)}</strong> - ${this.escapeHtml(lang.proficiency)}</p>`;
            });
            html += '</div>';
        }
        
        return html;
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
}

// Create global instance
window.resumeExporter = new ResumeExporter();
