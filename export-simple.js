// SIMPLE CV EXPORT - Starting Fresh
// This is a completely new, simple implementation

(function() {
    'use strict';
    
    // Create the exporter object
    const CVExporter = {
        // Export to PDF
        async exportPDF(data, filename) {
            try {
                // Check if data contains non-Latin text
                const dataStr = JSON.stringify(data);
                const hasUnicode = /[^\u0000-\u007F]/.test(dataStr);
                
                if (hasUnicode) {
                    // For Unicode content, use HTML-to-Canvas-to-PDF method
                    console.log('🌏 Unicode content detected - using HTML canvas method for PDF export');
                    return await this.exportPDFViaCanvas(data, filename);
                }
                
                // Load jsPDF if needed
                if (!window.jspdf) {
                    await this.loadJsPDF();
                }
                
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({
                    compress: true,
                    unit: 'mm',
                    format: 'a4'
                });
                
                let y = 20;
                const pageHeight = 280;
                
                // Helper to detect if text contains non-Latin characters
                const hasNonLatin = (text) => {
                    if (!text) return false;
                    // Check for Unicode characters beyond basic Latin
                    return /[^\u0000-\u007F]/.test(text);
                };
                
                // Helper to add text with Unicode support
                const addText = (text, size, bold) => {
                    if (!text) return;
                    
                    doc.setFontSize(size);
                    doc.setTextColor(0, 0, 0);
                    
                    // For Unicode text, we need to use a different approach
                    // jsPDF doesn't support Unicode well, so we'll transliterate or warn
                    if (hasNonLatin(text)) {
                        // Try to render as-is, but it might show as boxes/garbage
                        // The best solution is to use the built-in fonts with encoding
                        try {
                            doc.setFont('helvetica', bold ? 'bold' : 'normal');
                            const lines = doc.splitTextToSize(text, 170);
                            lines.forEach(line => {
                                if (y > pageHeight) {
                                    doc.addPage();
                                    y = 20;
                                }
                                // Use text with UTF-8 encoding option
                                doc.text(line, 20, y, { encoding: 'UTF-8' });
                                y += size * 0.4;
                            });
                        } catch (err) {
                            // Fallback: show transliteration note
                            console.warn('Unicode text may not render correctly in PDF:', text);
                            doc.setFont('helvetica', bold ? 'bold' : 'normal');
                            const fallbackText = '[Unicode text - see Word export for proper formatting]';
                            doc.text(fallbackText, 20, y);
                            y += size * 0.4;
                        }
                    } else {
                        // Standard Latin text - works fine
                        doc.setFont('helvetica', bold ? 'bold' : 'normal');
                        const lines = doc.splitTextToSize(text, 170);
                        lines.forEach(line => {
                            if (y > pageHeight) {
                                doc.addPage();
                                y = 20;
                            }
                            doc.text(line, 20, y);
                            y += size * 0.4;
                        });
                    }
                };
                
                // NAME
                const name = data.personalInfo?.fullName || data.contact?.name || 'Resume';
                addText(name.toUpperCase(), 20, true);
                y += 5;
                doc.line(20, y, 190, y);
                y += 10;
                
                // CONTACT
                const contact = data.personalInfo || data.contact;
                if (contact) {
                    addText('CONTACT', 14, true);
                    y += 2;
                    if (contact.email) addText('Email: ' + contact.email, 11, false);
                    if (contact.phone) addText('Phone: ' + contact.phone, 11, false);
                    if (contact.location) addText('Location: ' + contact.location, 11, false);
                    y += 5;
                }
                
                // SUMMARY
                if (data.professionalSummary || data.summary) {
                    addText('PROFESSIONAL SUMMARY', 14, true);
                    y += 2;
                    addText(data.professionalSummary || data.summary, 10, false);
                    y += 5;
                }
                
                // WORK EXPERIENCE
                const exp = data.workExperience || data.experience || [];
                if (exp.length > 0) {
                    addText('WORK EXPERIENCE', 14, true);
                    y += 2;
                    exp.forEach(job => {
                        if (job.jobTitle || job.job_title || job.position) {
                            addText(job.jobTitle || job.job_title || job.position, 12, true);
                        }
                        if (job.company) {
                            let line = job.company;
                            if (job.duration) line += ' | ' + job.duration;
                            addText(line, 10, false);
                        }
                        if (job.description) {
                            addText(job.description, 10, false);
                        }
                        if (job.responsibilities && job.responsibilities.length > 0) {
                            job.responsibilities.forEach(r => {
                                addText('• ' + r, 10, false);
                            });
                        }
                        y += 3;
                    });
                    y += 2;
                }
                
                // EDUCATION
                const edu = data.education || [];
                if (edu.length > 0) {
                    addText('EDUCATION', 14, true);
                    y += 2;
                    edu.forEach(e => {
                        let degreeText = e.degree || '';
                        if (e.fieldOfStudy || e.field_of_study || e.field) {
                            degreeText += ' in ' + (e.fieldOfStudy || e.field_of_study || e.field);
                        }
                        if (degreeText) addText(degreeText, 11, true);
                        if (e.institution) {
                            let instText = e.institution;
                            if (e.year) instText += ' | ' + e.year;
                            addText(instText, 10, false);
                        }
                        y += 3;
                    });
                    y += 2;
                }
                
                // SKILLS
                const skills = data.skills?.technical || data.skills || [];
                if (skills.length > 0) {
                    addText('SKILLS', 14, true);
                    y += 2;
                    addText(skills.join(', '), 10, false);
                    y += 5;
                }
                
                // LANGUAGES
                if (data.languages && data.languages.length > 0) {
                    addText('LANGUAGES', 14, true);
                    y += 2;
                    data.languages.forEach(lang => {
                        addText(lang.name + ' - ' + lang.proficiency, 10, false);
                    });
                }
                
                // Add uploaded documents as separate pages
                await this.addAttachments(doc);
                
                // Save
                doc.save(filename || 'resume.pdf');
                return true;
                
            } catch (error) {
                console.error('PDF Export Error:', error);
                alert('PDF Export Failed: ' + error.message);
                return false;
            }
        },
        
        // Export to Word
        exportWord(data, filename) {
            try {
                let html = '<html><head><meta charset="utf-8"><title>Resume</title>';
                html += '<style>body{font-family:Arial;color:black;} h1{font-size:24pt;text-align:center;border-bottom:2pt solid black;} h2{font-size:14pt;margin-top:15pt;border-bottom:1pt solid black;} h3{font-size:12pt;} p{margin:5pt 0;}</style>';
                html += '</head><body>';
                
                // NAME
                const name = data.personalInfo?.fullName || data.contact?.name || 'Resume';
                html += '<h1>' + this.escape(name.toUpperCase()) + '</h1>';
                
                // CONTACT
                const contact = data.personalInfo || data.contact;
                if (contact) {
                    html += '<h2>CONTACT</h2>';
                    if (contact.email) html += '<p>Email: ' + this.escape(contact.email) + '</p>';
                    if (contact.phone) html += '<p>Phone: ' + this.escape(contact.phone) + '</p>';
                    if (contact.location) html += '<p>Location: ' + this.escape(contact.location) + '</p>';
                }
                
                // SUMMARY
                if (data.professionalSummary || data.summary) {
                    html += '<h2>PROFESSIONAL SUMMARY</h2>';
                    html += '<p>' + this.escape(data.professionalSummary || data.summary) + '</p>';
                }
                
                // WORK EXPERIENCE
                const exp = data.workExperience || data.experience || [];
                if (exp.length > 0) {
                    html += '<h2>WORK EXPERIENCE</h2>';
                    exp.forEach(job => {
                        if (job.jobTitle || job.job_title || job.position) {
                            html += '<h3>' + this.escape(job.jobTitle || job.job_title || job.position) + '</h3>';
                        }
                        if (job.company) {
                            let line = job.company;
                            if (job.duration) line += ' | ' + job.duration;
                            html += '<p><strong>' + this.escape(line) + '</strong></p>';
                        }
                        if (job.description) {
                            html += '<p>' + this.escape(job.description) + '</p>';
                        }
                        if (job.responsibilities && job.responsibilities.length > 0) {
                            html += '<ul>';
                            job.responsibilities.forEach(r => {
                                html += '<li>' + this.escape(r) + '</li>';
                            });
                            html += '</ul>';
                        }
                    });
                }
                
                // EDUCATION
                const edu = data.education || [];
                if (edu.length > 0) {
                    html += '<h2>EDUCATION</h2>';
                    edu.forEach(e => {
                        let degreeText = e.degree || '';
                        if (e.fieldOfStudy || e.field_of_study || e.field) {
                            degreeText += ' in ' + (e.fieldOfStudy || e.field_of_study || e.field);
                        }
                        if (degreeText) html += '<h3>' + this.escape(degreeText) + '</h3>';
                        if (e.institution) {
                            let instText = e.institution;
                            if (e.year) instText += ' | ' + e.year;
                            html += '<p><strong>' + this.escape(instText) + '</strong></p>';
                        }
                    });
                }
                
                // SKILLS
                const skills = data.skills?.technical || data.skills || [];
                if (skills.length > 0) {
                    html += '<h2>SKILLS</h2>';
                    html += '<p>' + skills.map(s => this.escape(s)).join(', ') + '</p>';
                }
                
                // LANGUAGES
                if (data.languages && data.languages.length > 0) {
                    html += '<h2>LANGUAGES</h2>';
                    data.languages.forEach(lang => {
                        html += '<p>' + this.escape(lang.name) + ' - ' + this.escape(lang.proficiency) + '</p>';
                    });
                }
                
                html += '</body></html>';
                
                // Download
                const blob = new Blob([html], { type: 'application/msword' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = filename || 'resume.doc';
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
        
        // Helper to load jsPDF
        loadJsPDF() {
            return new Promise((resolve, reject) => {
                if (window.jspdf) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load jsPDF'));
                document.head.appendChild(script);
            });
        },
        
        // Helper to escape HTML
        escape(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        // Add uploaded documents to PDF
        async addAttachments(doc) {
            try {
                // Check if app has uploaded documents
                if (!window.app || !window.app.uploadedDocuments || window.app.uploadedDocuments.length === 0) {
                    console.log('No attachments to add');
                    return;
                }
                
                console.log(`Adding ${window.app.uploadedDocuments.length} attachment(s)...`);
                
                for (const docFile of window.app.uploadedDocuments) {
                    try {
                        const file = docFile.file || docFile;
                        
                        // Add new page for attachment
                        doc.addPage();
                        
                        // Add title
                        doc.setFontSize(14);
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(0, 0, 0);
                        doc.text('Attachment: ' + file.name, 20, 20);
                        
                        // Handle images
                        if (file.type && file.type.startsWith('image/')) {
                            const imageData = await this.fileToDataURL(file);
                            const img = await this.loadImage(imageData);
                            
                            // Calculate dimensions to fit page
                            const maxWidth = 170;
                            const maxHeight = 240;
                            let imgWidth = img.width;
                            let imgHeight = img.height;
                            
                            const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);
                            imgWidth *= ratio;
                            imgHeight *= ratio;
                            
                            // Center image
                            const x = (210 - imgWidth) / 2;
                            const y = 40;
                            
                            doc.addImage(imageData, 'JPEG', x, y, imgWidth, imgHeight);
                            console.log(`✅ Added image: ${file.name}`);
                            
                        } else {
                            // For non-image files, just show a note
                            doc.setFontSize(11);
                            doc.setFont('helvetica', 'normal');
                            doc.text('File type: ' + (file.type || 'Unknown'), 20, 40);
                            doc.text('Size: ' + this.formatFileSize(file.size), 20, 50);
                            doc.text('(Non-image files cannot be embedded - please attach separately)', 20, 70);
                        }
                        
                    } catch (error) {
                        console.error(`Error adding attachment ${docFile.name}:`, error);
                        // Continue with other attachments even if one fails
                    }
                }
                
                console.log('✅ All attachments processed');
                
            } catch (error) {
                console.error('Error adding attachments:', error);
                // Don't fail the whole export if attachments fail
            }
        },
        
        // Convert file to data URL
        fileToDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        
        // Load image from URL
        loadImage(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        },
        
        // Format file size
        formatFileSize(bytes) {
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        },
        
        // Export PDF via HTML Canvas (supports Unicode perfectly)
        async exportPDFViaCanvas(data, filename) {
            try {
                // Load required libraries
                await this.loadJsPDF();
                await this.loadHtml2Canvas();
                
                const { jsPDF } = window.jspdf;
                const html2canvas = window.html2canvas;
                
                // Create a temporary container for the HTML
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.width = '794px'; // A4 width in pixels at 96 DPI
                container.style.padding = '40px';
                container.style.background = 'white';
                container.style.fontFamily = 'Arial, sans-serif';
                container.style.fontSize = '14px';
                container.style.lineHeight = '1.6';
                container.style.color = 'black';
                document.body.appendChild(container);
                
                // Build HTML content
                let html = '';
                
                // NAME
                const name = data.personalInfo?.fullName || data.contact?.name || 'Resume';
                html += `<h1 style="font-size: 28px; text-align: center; border-bottom: 3px solid black; padding-bottom: 10px; margin-bottom: 20px;">${this.escape(name.toUpperCase())}</h1>`;
                
                // CONTACT
                const contact = data.personalInfo || data.contact;
                if (contact) {
                    html += '<h2 style="font-size: 18px; border-bottom: 2px solid black; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">CONTACT</h2>';
                    if (contact.email) html += '<p style="margin: 5px 0;">Email: ' + this.escape(contact.email) + '</p>';
                    if (contact.phone) html += '<p style="margin: 5px 0;">Phone: ' + this.escape(contact.phone) + '</p>';
                    if (contact.location) html += '<p style="margin: 5px 0;">Location: ' + this.escape(contact.location) + '</p>';
                }
                
                // SUMMARY
                if (data.professionalSummary || data.summary) {
                    html += '<h2 style="font-size: 18px; border-bottom: 2px solid black; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">PROFESSIONAL SUMMARY</h2>';
                    html += '<p style="margin: 5px 0;">' + this.escape(data.professionalSummary || data.summary) + '</p>';
                }
                
                // WORK EXPERIENCE
                const exp = data.workExperience || data.experience || [];
                if (exp.length > 0) {
                    html += '<h2 style="font-size: 18px; border-bottom: 2px solid black; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">WORK EXPERIENCE</h2>';
                    exp.forEach(job => {
                        if (job.jobTitle || job.job_title || job.position) {
                            html += '<h3 style="font-size: 16px; margin: 10px 0 5px 0;">' + this.escape(job.jobTitle || job.job_title || job.position) + '</h3>';
                        }
                        if (job.company) {
                            let line = job.company;
                            if (job.duration) line += ' | ' + job.duration;
                            html += '<p style="margin: 3px 0; font-weight: bold;">' + this.escape(line) + '</p>';
                        }
                        if (job.description) {
                            html += '<p style="margin: 5px 0;">' + this.escape(job.description) + '</p>';
                        }
                        if (job.responsibilities && job.responsibilities.length > 0) {
                            html += '<ul style="margin: 5px 0; padding-left: 20px;">';
                            job.responsibilities.forEach(r => {
                                html += '<li style="margin: 3px 0;">' + this.escape(r) + '</li>';
                            });
                            html += '</ul>';
                        }
                    });
                }
                
                // EDUCATION
                const edu = data.education || [];
                if (edu.length > 0) {
                    html += '<h2 style="font-size: 18px; border-bottom: 2px solid black; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">EDUCATION</h2>';
                    edu.forEach(e => {
                        let degreeText = e.degree || '';
                        if (e.fieldOfStudy || e.field_of_study || e.field) {
                            degreeText += ' in ' + (e.fieldOfStudy || e.field_of_study || e.field);
                        }
                        if (degreeText) html += '<h3 style="font-size: 16px; margin: 10px 0 5px 0;">' + this.escape(degreeText) + '</h3>';
                        if (e.institution) {
                            let instText = e.institution;
                            if (e.year) instText += ' | ' + e.year;
                            html += '<p style="margin: 3px 0; font-weight: bold;">' + this.escape(instText) + '</p>';
                        }
                    });
                }
                
                // SKILLS
                const skills = data.skills?.technical || data.skills || [];
                if (skills.length > 0) {
                    html += '<h2 style="font-size: 18px; border-bottom: 2px solid black; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">SKILLS</h2>';
                    html += '<p style="margin: 5px 0;">' + skills.map(s => this.escape(s)).join(', ') + '</p>';
                }
                
                // LANGUAGES
                if (data.languages && data.languages.length > 0) {
                    html += '<h2 style="font-size: 18px; border-bottom: 2px solid black; padding-bottom: 5px; margin-top: 20px; margin-bottom: 10px;">LANGUAGES</h2>';
                    data.languages.forEach(lang => {
                        html += '<p style="margin: 5px 0;">' + this.escape(lang.name) + ' - ' + this.escape(lang.proficiency) + '</p>';
                    });
                }
                
                container.innerHTML = html;
                
                // Convert HTML to canvas
                console.log('📷 Converting HTML to canvas...');
                const canvas = await html2canvas(container, {
                    scale: 2, // Higher quality
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                
                // Remove temporary container
                document.body.removeChild(container);
                
                // Convert canvas to PDF
                console.log('📝 Converting canvas to PDF...');
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });
                
                // Calculate dimensions
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                const imgX = 0;
                const imgY = 0;
                const imgScaledWidth = imgWidth * ratio;
                const imgScaledHeight = imgHeight * ratio;
                
                // Add image to PDF
                pdf.addImage(imgData, 'PNG', imgX, imgY, imgScaledWidth, imgScaledHeight);
                
                // Add additional pages if content is long
                if (imgScaledHeight > pdfHeight) {
                    let heightLeft = imgScaledHeight - pdfHeight;
                    let position = -pdfHeight;
                    
                    while (heightLeft > 0) {
                        pdf.addPage();
                        pdf.addImage(imgData, 'PNG', imgX, position, imgScaledWidth, imgScaledHeight);
                        heightLeft -= pdfHeight;
                        position -= pdfHeight;
                    }
                }
                
                // Save PDF
                pdf.save(filename || 'resume.pdf');
                console.log('✅ PDF export completed successfully with Unicode support');
                return true;
                
            } catch (error) {
                console.error('Canvas PDF Export Error:', error);
                alert('PDF Export Failed: ' + error.message + '\n\nTry using Word export instead.');
                return false;
            }
        },
        
        // Load html2canvas library
        loadHtml2Canvas() {
            return new Promise((resolve, reject) => {
                if (window.html2canvas) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Failed to load html2canvas'));
                document.head.appendChild(script);
            });
        }
    };
    
    // Export to global scope
    window.CVExporter = CVExporter;
    window.resumeExporter = {
        exportToPDF: (data, filename) => CVExporter.exportPDF(data, filename),
        exportToWord: (data, filename) => CVExporter.exportWord(data, filename)
    };
    
    console.log('✅ Simple CV Exporter loaded successfully');
    
})();
