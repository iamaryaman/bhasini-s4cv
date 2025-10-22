// NER UI Components for Entity Visualization and Validation
// Provides interactive components for displaying, editing, and validating extracted entities

class NERVisualizationUI {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container element with ID '${containerId}' not found`);
        }
        
        this.options = {
            showConfidence: true,
            enableEditing: true,
            enableValidation: true,
            showEntityCounts: true,
            colorScheme: 'default',
            ...options
        };
        
        this.entities = [];
        this.originalText = '';
        this.validatedEntities = [];
        this.rejectedEntities = [];
        
        // Event callbacks
        this.callbacks = {
            onEntityValidated: null,
            onEntityRejected: null,
            onEntityEdited: null,
            onValidationComplete: null
        };
        
        // Entity type colors
        this.entityColors = {
            PERSON: { bg: '#3B82F6', text: '#ffffff', border: '#2563EB' },
            LOCATION: { bg: '#10B981', text: '#ffffff', border: '#059669' },
            ORGANIZATION: { bg: '#F59E0B', text: '#ffffff', border: '#D97706' },
            SKILL: { bg: '#8B5CF6', text: '#ffffff', border: '#7C3AED' },
            EDUCATION: { bg: '#EF4444', text: '#ffffff', border: '#DC2626' },
            DATE: { bg: '#EC4899', text: '#ffffff', border: '#DB2777' },
            CONTACT: { bg: '#06B6D4', text: '#ffffff', border: '#0891B2' }
        };
        
        this.initializeUI();
    }
    
    /**
     * Initialize the UI components
     */
    initializeUI() {
        this.container.innerHTML = `
            <div class="ner-visualization">
                <div class="ner-header">
                    <h3>Extracted Entities</h3>
                    <div class="ner-stats" id="nerStats">
                        <span class="stat-item">Total: <span id="totalEntities">0</span></span>
                        <span class="stat-item">Validated: <span id="validatedCount">0</span></span>
                        <span class="stat-item">Confidence: <span id="avgConfidence">0%</span></span>
                    </div>
                </div>
                
                <div class="ner-controls">
                    <button class="btn btn-primary" id="validateAllBtn" onclick="this.validateAll()">
                        ✓ Validate All
                    </button>
                    <button class="btn btn-secondary" id="rejectAllBtn" onclick="this.rejectAll()">
                        ✗ Reject All
                    </button>
                    <button class="btn btn-ghost" id="toggleConfidenceBtn" onclick="this.toggleConfidenceDisplay()">
                        📊 Toggle Confidence
                    </button>
                    <button class="btn btn-ghost" id="exportBtn" onclick="this.exportValidatedEntities()">
                        💾 Export
                    </button>
                </div>
                
                <div class="ner-legend">
                    <div class="legend-title">Entity Types:</div>
                    <div class="legend-items" id="legendItems"></div>
                </div>
                
                <div class="ner-content">
                    <div class="text-display" id="textDisplay">
                        <div class="original-text" id="originalText"></div>
                    </div>
                    
                    <div class="entities-panel">
                        <div class="entities-list" id="entitiesList"></div>
                    </div>
                </div>
                
                <div class="validation-summary" id="validationSummary" style="display: none;">
                    <h4>Validation Summary</h4>
                    <div class="summary-content" id="summaryContent"></div>
                </div>
            </div>
        `;
        
        this.createLegend();
        this.bindEvents();
        this.addStyles();
    }
    
    /**
     * Create entity type legend
     */
    createLegend() {
        const legendContainer = document.getElementById('legendItems');
        
        Object.entries(this.entityColors).forEach(([type, colors]) => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <span class="legend-color" style="background-color: ${colors.bg};"></span>
                <span class="legend-label">${this.getEntityDisplayName(type)}</span>
            `;
            legendContainer.appendChild(legendItem);
        });
    }
    
    /**
     * Display entities in the UI
     * @param {Array} entities - Array of extracted entities
     * @param {string} originalText - Original text
     */
    displayEntities(entities, originalText) {
        this.entities = entities;
        this.originalText = originalText;
        this.validatedEntities = [];
        this.rejectedEntities = [];
        
        this.renderHighlightedText();
        this.renderEntitiesList();
        this.updateStats();
        
        // Show the UI
        this.container.style.display = 'block';
    }
    
    /**
     * Render text with highlighted entities
     */
    renderHighlightedText() {
        const textContainer = document.getElementById('originalText');
        
        if (!this.originalText || this.entities.length === 0) {
            textContainer.innerHTML = this.originalText || 'No text available';
            return;
        }
        
        // Sort entities by start position
        const sortedEntities = [...this.entities].sort((a, b) => a.startPos - b.startPos);
        
        let highlightedText = '';
        let lastPos = 0;
        
        sortedEntities.forEach((entity, index) => {
            // Add text before entity
            highlightedText += this.escapeHtml(this.originalText.slice(lastPos, entity.startPos));
            
            // Add highlighted entity
            const colors = this.entityColors[entity.type] || this.entityColors.PERSON;
            const confidenceClass = this.getConfidenceClass(entity.confidence);
            
            highlightedText += `
                <span class="entity-highlight ${confidenceClass}" 
                      data-entity-id="${index}"
                      style="background-color: ${colors.bg}; color: ${colors.text}; border-bottom: 2px solid ${colors.border};"
                      onclick="nerUI.selectEntity(${index})"
                      title="${entity.type}: ${entity.text} (${Math.round(entity.confidence * 100)}% confidence)">
                    ${this.escapeHtml(entity.text)}
                    ${this.options.showConfidence ? `<sup class="confidence-badge">${Math.round(entity.confidence * 100)}%</sup>` : ''}
                </span>
            `;
            
            lastPos = entity.endPos;
        });
        
        // Add remaining text
        highlightedText += this.escapeHtml(this.originalText.slice(lastPos));
        
        textContainer.innerHTML = highlightedText;
    }
    
    /**
     * Render entities list panel
     */
    renderEntitiesList() {
        const listContainer = document.getElementById('entitiesList');
        
        if (this.entities.length === 0) {
            listContainer.innerHTML = '<div class="no-entities">No entities found</div>';
            return;
        }
        
        // Group entities by type
        const groupedEntities = this.groupEntitiesByType();
        
        let listHTML = '';
        
        Object.entries(groupedEntities).forEach(([type, entityList]) => {
            const colors = this.entityColors[type] || this.entityColors.PERSON;
            
            listHTML += `
                <div class="entity-group">
                    <div class="entity-group-header" style="border-left-color: ${colors.bg};">
                        <span class="group-title">${this.getEntityDisplayName(type)}</span>
                        <span class="group-count">${entityList.length}</span>
                    </div>
                    <div class="entity-group-items">
            `;
            
            entityList.forEach((entity, index) => {
                const globalIndex = this.entities.indexOf(entity);
                const validationStatus = this.getValidationStatus(entity);
                
                listHTML += `
                    <div class="entity-item ${validationStatus}" data-entity-id="${globalIndex}">
                        <div class="entity-content" onclick="nerUI.selectEntity(${globalIndex})">
                            <div class="entity-text">${this.escapeHtml(entity.text)}</div>
                            <div class="entity-meta">
                                <span class="confidence-score ${this.getConfidenceClass(entity.confidence)}">
                                    ${Math.round(entity.confidence * 100)}%
                                </span>
                                <span class="entity-position">[${entity.startPos}-${entity.endPos}]</span>
                            </div>
                        </div>
                        <div class="entity-actions">
                            <button class="action-btn validate-btn" onclick="nerUI.validateEntity(${globalIndex})" 
                                    title="Validate entity">✓</button>
                            <button class="action-btn reject-btn" onclick="nerUI.rejectEntity(${globalIndex})" 
                                    title="Reject entity">✗</button>
                            <button class="action-btn edit-btn" onclick="nerUI.editEntity(${globalIndex})" 
                                    title="Edit entity">✎</button>
                        </div>
                    </div>
                `;
            });
            
            listHTML += '</div></div>';
        });
        
        listContainer.innerHTML = listHTML;
    }
    
    /**
     * Select an entity for detailed view
     * @param {number} entityIndex - Index of the entity to select
     */
    selectEntity(entityIndex) {
        const entity = this.entities[entityIndex];
        if (!entity) return;
        
        // Remove previous selection
        document.querySelectorAll('.entity-selected').forEach(el => {
            el.classList.remove('entity-selected');
        });
        
        // Add selection to text highlight
        document.querySelector(`[data-entity-id="${entityIndex}"]`).classList.add('entity-selected');
        
        // Add selection to list item
        document.querySelector(`[data-entity-id="${entityIndex}"].entity-item`).classList.add('entity-selected');
        
        // Show detailed entity info
        this.showEntityDetails(entity, entityIndex);
    }
    
    /**
     * Show detailed information about an entity
     * @param {Object} entity - Entity object
     * @param {number} index - Entity index
     */
    showEntityDetails(entity, index) {
        // Create or update entity details modal/panel
        let detailsPanel = document.getElementById('entityDetails');
        
        if (!detailsPanel) {
            detailsPanel = document.createElement('div');
            detailsPanel.id = 'entityDetails';
            detailsPanel.className = 'entity-details-panel';
            this.container.appendChild(detailsPanel);
        }
        
        detailsPanel.innerHTML = `
            <div class="details-header">
                <h4>Entity Details</h4>
                <button class="close-btn" onclick="nerUI.closeEntityDetails()">×</button>
            </div>
            <div class="details-content">
                <div class="detail-row">
                    <label>Text:</label>
                    <input type="text" id="entityTextEdit" value="${entity.text}" 
                           onchange="nerUI.updateEntityText(${index}, this.value)">
                </div>
                <div class="detail-row">
                    <label>Type:</label>
                    <select id="entityTypeEdit" onchange="nerUI.updateEntityType(${index}, this.value)">
                        ${Object.keys(this.entityColors).map(type => 
                            `<option value="${type}" ${type === entity.type ? 'selected' : ''}>
                                ${this.getEntityDisplayName(type)}
                            </option>`
                        ).join('')}
                    </select>
                </div>
                <div class="detail-row">
                    <label>Confidence:</label>
                    <span class="confidence-display ${this.getConfidenceClass(entity.confidence)}">
                        ${Math.round(entity.confidence * 100)}%
                    </span>
                </div>
                <div class="detail-row">
                    <label>Position:</label>
                    <span>${entity.startPos} - ${entity.endPos}</span>
                </div>
                <div class="detail-row">
                    <label>Language:</label>
                    <span>${entity.language || 'Unknown'}</span>
                </div>
            </div>
            <div class="details-actions">
                <button class="btn btn-primary" onclick="nerUI.validateEntity(${index})">
                    ✓ Validate
                </button>
                <button class="btn btn-secondary" onclick="nerUI.rejectEntity(${index})">
                    ✗ Reject
                </button>
                <button class="btn btn-ghost" onclick="nerUI.closeEntityDetails()">
                    Cancel
                </button>
            </div>
        `;
        
        detailsPanel.style.display = 'block';
    }
    
    /**
     * Close entity details panel
     */
    closeEntityDetails() {
        const detailsPanel = document.getElementById('entityDetails');
        if (detailsPanel) {
            detailsPanel.style.display = 'none';
        }
        
        // Remove selections
        document.querySelectorAll('.entity-selected').forEach(el => {
            el.classList.remove('entity-selected');
        });
    }
    
    /**
     * Validate an entity
     * @param {number} entityIndex - Index of entity to validate
     */
    validateEntity(entityIndex) {
        const entity = this.entities[entityIndex];
        if (!entity) return;
        
        // Add to validated list if not already there
        if (!this.validatedEntities.find(e => e === entity)) {
            this.validatedEntities.push(entity);
        }
        
        // Remove from rejected list if present
        this.rejectedEntities = this.rejectedEntities.filter(e => e !== entity);
        
        // Update UI
        this.updateEntityStatus(entityIndex, 'validated');
        this.updateStats();
        
        // Callback
        if (this.callbacks.onEntityValidated) {
            this.callbacks.onEntityValidated(entity, entityIndex);
        }
    }
    
    /**
     * Reject an entity
     * @param {number} entityIndex - Index of entity to reject
     */
    rejectEntity(entityIndex) {
        const entity = this.entities[entityIndex];
        if (!entity) return;
        
        // Add to rejected list if not already there
        if (!this.rejectedEntities.find(e => e === entity)) {
            this.rejectedEntities.push(entity);
        }
        
        // Remove from validated list if present
        this.validatedEntities = this.validatedEntities.filter(e => e !== entity);
        
        // Update UI
        this.updateEntityStatus(entityIndex, 'rejected');
        this.updateStats();
        
        // Callback
        if (this.callbacks.onEntityRejected) {
            this.callbacks.onEntityRejected(entity, entityIndex);
        }
    }
    
    /**
     * Edit entity text
     * @param {number} entityIndex - Index of entity to edit
     * @param {string} newText - New text value
     */
    updateEntityText(entityIndex, newText) {
        const entity = this.entities[entityIndex];
        if (!entity || newText === entity.text) return;
        
        const oldText = entity.text;
        entity.text = newText;
        
        // Update displays
        this.renderHighlightedText();
        this.renderEntitiesList();
        
        // Callback
        if (this.callbacks.onEntityEdited) {
            this.callbacks.onEntityEdited(entity, entityIndex, { oldText, newText });
        }
    }
    
    /**
     * Update entity type
     * @param {number} entityIndex - Index of entity to update
     * @param {string} newType - New entity type
     */
    updateEntityType(entityIndex, newType) {
        const entity = this.entities[entityIndex];
        if (!entity || newType === entity.type) return;
        
        const oldType = entity.type;
        entity.type = newType;
        
        // Update displays
        this.renderHighlightedText();
        this.renderEntitiesList();
        
        // Callback
        if (this.callbacks.onEntityEdited) {
            this.callbacks.onEntityEdited(entity, entityIndex, { oldType, newType });
        }
    }
    
    /**
     * Validate all entities
     */
    validateAll() {
        this.entities.forEach((entity, index) => {
            if (!this.validatedEntities.includes(entity)) {
                this.validateEntity(index);
            }
        });
        
        this.showValidationSummary();
    }
    
    /**
     * Reject all entities
     */
    rejectAll() {
        this.entities.forEach((entity, index) => {
            if (!this.rejectedEntities.includes(entity)) {
                this.rejectEntity(index);
            }
        });
    }
    
    /**
     * Toggle confidence display
     */
    toggleConfidenceDisplay() {
        this.options.showConfidence = !this.options.showConfidence;
        this.renderHighlightedText();
        
        const button = document.getElementById('toggleConfidenceBtn');
        button.textContent = this.options.showConfidence ? '📊 Hide Confidence' : '📊 Show Confidence';
    }
    
    /**
     * Export validated entities
     */
    exportValidatedEntities() {
        const exportData = {
            validatedEntities: this.validatedEntities,
            rejectedEntities: this.rejectedEntities,
            originalText: this.originalText,
            exportDate: new Date().toISOString(),
            stats: {
                total: this.entities.length,
                validated: this.validatedEntities.length,
                rejected: this.rejectedEntities.length,
                pending: this.entities.length - this.validatedEntities.length - this.rejectedEntities.length
            }
        };
        
        // Create download
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `validated-entities-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * Show validation summary
     */
    showValidationSummary() {
        const summaryContainer = document.getElementById('validationSummary');
        const summaryContent = document.getElementById('summaryContent');
        
        const stats = {
            total: this.entities.length,
            validated: this.validatedEntities.length,
            rejected: this.rejectedEntities.length
        };
        stats.pending = stats.total - stats.validated - stats.rejected;
        
        summaryContent.innerHTML = `
            <div class="summary-stats">
                <div class="stat-card validated">
                    <div class="stat-value">${stats.validated}</div>
                    <div class="stat-label">Validated</div>
                </div>
                <div class="stat-card rejected">
                    <div class="stat-value">${stats.rejected}</div>
                    <div class="stat-label">Rejected</div>
                </div>
                <div class="stat-card pending">
                    <div class="stat-value">${stats.pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
            </div>
            
            ${stats.pending === 0 ? `
                <div class="completion-message">
                    <h4>🎉 Validation Complete!</h4>
                    <p>All entities have been reviewed. You can now export the results or continue with CV generation.</p>
                    <div class="completion-actions">
                        <button class="btn btn-primary" onclick="nerUI.finalizeValidation()">
                            Generate CV
                        </button>
                        <button class="btn btn-secondary" onclick="nerUI.exportValidatedEntities()">
                            Export Results
                        </button>
                    </div>
                </div>
            ` : ''}
        `;
        
        summaryContainer.style.display = 'block';
        
        if (stats.pending === 0 && this.callbacks.onValidationComplete) {
            this.callbacks.onValidationComplete({
                validated: this.validatedEntities,
                rejected: this.rejectedEntities,
                stats
            });
        }
    }
    
    /**
     * Finalize validation and trigger CV generation
     */
    finalizeValidation() {
        if (this.callbacks.onValidationComplete) {
            this.callbacks.onValidationComplete({
                validated: this.validatedEntities,
                rejected: this.rejectedEntities,
                finalText: this.originalText
            });
        }
    }
    
    /**
     * Helper methods
     */
    
    groupEntitiesByType() {
        return this.entities.reduce((groups, entity) => {
            if (!groups[entity.type]) {
                groups[entity.type] = [];
            }
            groups[entity.type].push(entity);
            return groups;
        }, {});
    }
    
    getEntityDisplayName(type) {
        const names = {
            PERSON: 'Person',
            LOCATION: 'Location',
            ORGANIZATION: 'Organization',
            SKILL: 'Skill',
            EDUCATION: 'Education',
            DATE: 'Date',
            CONTACT: 'Contact'
        };
        return names[type] || type;
    }
    
    getConfidenceClass(confidence) {
        if (confidence >= 0.8) return 'high-confidence';
        if (confidence >= 0.6) return 'medium-confidence';
        return 'low-confidence';
    }
    
    getValidationStatus(entity) {
        if (this.validatedEntities.includes(entity)) return 'validated';
        if (this.rejectedEntities.includes(entity)) return 'rejected';
        return 'pending';
    }
    
    updateEntityStatus(entityIndex, status) {
        const entityElements = document.querySelectorAll(`[data-entity-id="${entityIndex}"]`);
        entityElements.forEach(element => {
            element.classList.remove('validated', 'rejected', 'pending');
            element.classList.add(status);
        });
    }
    
    updateStats() {
        document.getElementById('totalEntities').textContent = this.entities.length;
        document.getElementById('validatedCount').textContent = this.validatedEntities.length;
        
        const avgConfidence = this.entities.length > 0 
            ? (this.entities.reduce((sum, e) => sum + e.confidence, 0) / this.entities.length * 100).toFixed(1)
            : 0;
        document.getElementById('avgConfidence').textContent = `${avgConfidence}%`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    bindEvents() {
        // Bind methods to window for onclick handlers
        window.nerUI = this;
    }
    
    /**
     * Set event callbacks
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('ner-ui-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'ner-ui-styles';
        style.textContent = `
            .ner-visualization {
                background: var(--dark-bg-secondary);
                border-radius: var(--radius-lg);
                padding: var(--spacing-lg);
                margin: var(--spacing-md) 0;
            }
            
            .ner-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-md);
                padding-bottom: var(--spacing-sm);
                border-bottom: 1px solid var(--border-primary);
            }
            
            .ner-stats {
                display: flex;
                gap: var(--spacing-md);
            }
            
            .stat-item {
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            
            .ner-controls {
                display: flex;
                gap: var(--spacing-sm);
                margin-bottom: var(--spacing-md);
                flex-wrap: wrap;
            }
            
            .ner-legend {
                margin-bottom: var(--spacing-md);
            }
            
            .legend-title {
                color: var(--text-secondary);
                font-size: 0.875rem;
                margin-bottom: var(--spacing-xs);
            }
            
            .legend-items {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-sm);
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
                font-size: 0.813rem;
                color: var(--text-secondary);
            }
            
            .legend-color {
                width: 16px;
                height: 16px;
                border-radius: 3px;
            }
            
            .ner-content {
                display: grid;
                grid-template-columns: 1fr 350px;
                gap: var(--spacing-lg);
                margin-bottom: var(--spacing-lg);
            }
            
            .text-display {
                background: var(--dark-bg-tertiary);
                border-radius: var(--radius-md);
                padding: var(--spacing-lg);
                min-height: 200px;
            }
            
            .original-text {
                line-height: 1.8;
                font-size: 1rem;
                word-wrap: break-word;
            }
            
            .entity-highlight {
                padding: 2px 4px;
                margin: 0 1px;
                border-radius: 4px;
                cursor: pointer;
                position: relative;
                transition: all 0.2s ease;
            }
            
            .entity-highlight:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            
            .entity-highlight.entity-selected {
                outline: 2px solid var(--accent-primary);
                outline-offset: 2px;
            }
            
            .confidence-badge {
                font-size: 0.7rem;
                opacity: 0.8;
                font-weight: bold;
            }
            
            .entities-panel {
                background: var(--dark-bg-tertiary);
                border-radius: var(--radius-md);
                padding: var(--spacing-md);
                max-height: 500px;
                overflow-y: auto;
            }
            
            .entity-group {
                margin-bottom: var(--spacing-md);
            }
            
            .entity-group-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: var(--spacing-sm);
                border-left: 4px solid;
                background: rgba(255,255,255,0.05);
                margin-bottom: var(--spacing-xs);
            }
            
            .group-title {
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .group-count {
                background: rgba(255,255,255,0.1);
                color: var(--text-secondary);
                padding: 2px 6px;
                border-radius: var(--radius-sm);
                font-size: 0.75rem;
            }
            
            .entity-item {
                display: flex;
                align-items: center;
                padding: var(--spacing-sm);
                border-radius: var(--radius-sm);
                margin-bottom: var(--spacing-xs);
                transition: all 0.2s ease;
                border-left: 3px solid transparent;
            }
            
            .entity-item:hover {
                background: rgba(255,255,255,0.05);
            }
            
            .entity-item.entity-selected {
                background: rgba(59, 130, 246, 0.1);
                border-left-color: var(--accent-primary);
            }
            
            .entity-item.validated {
                border-left-color: var(--accent-success);
                background: rgba(16, 185, 129, 0.1);
            }
            
            .entity-item.rejected {
                border-left-color: var(--accent-error);
                background: rgba(239, 68, 68, 0.1);
                opacity: 0.6;
            }
            
            .entity-content {
                flex: 1;
                cursor: pointer;
            }
            
            .entity-text {
                font-weight: 500;
                color: var(--text-primary);
                margin-bottom: 2px;
            }
            
            .entity-meta {
                display: flex;
                gap: var(--spacing-sm);
                font-size: 0.75rem;
                color: var(--text-secondary);
            }
            
            .confidence-score {
                padding: 1px 4px;
                border-radius: var(--radius-xs);
                font-weight: 600;
            }
            
            .high-confidence {
                background: rgba(16, 185, 129, 0.2);
                color: var(--accent-success);
            }
            
            .medium-confidence {
                background: rgba(245, 158, 11, 0.2);
                color: var(--accent-warning);
            }
            
            .low-confidence {
                background: rgba(239, 68, 68, 0.2);
                color: var(--accent-error);
            }
            
            .entity-actions {
                display: flex;
                gap: 4px;
                opacity: 0.6;
                transition: opacity 0.2s ease;
            }
            
            .entity-item:hover .entity-actions {
                opacity: 1;
            }
            
            .action-btn {
                width: 24px;
                height: 24px;
                border: none;
                border-radius: var(--radius-xs);
                cursor: pointer;
                font-size: 0.75rem;
                transition: all 0.2s ease;
            }
            
            .validate-btn {
                background: var(--accent-success);
                color: white;
            }
            
            .reject-btn {
                background: var(--accent-error);
                color: white;
            }
            
            .edit-btn {
                background: var(--accent-warning);
                color: white;
            }
            
            .action-btn:hover {
                transform: scale(1.1);
            }
            
            .entity-details-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--dark-bg-secondary);
                border: 1px solid var(--border-primary);
                border-radius: var(--radius-lg);
                padding: var(--spacing-lg);
                min-width: 400px;
                z-index: 1000;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            
            .details-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: var(--spacing-lg);
                padding-bottom: var(--spacing-sm);
                border-bottom: 1px solid var(--border-primary);
            }
            
            .close-btn {
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
            }
            
            .detail-row {
                display: flex;
                align-items: center;
                margin-bottom: var(--spacing-md);
                gap: var(--spacing-md);
            }
            
            .detail-row label {
                min-width: 80px;
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            
            .detail-row input, .detail-row select {
                flex: 1;
                padding: var(--spacing-xs) var(--spacing-sm);
                background: var(--dark-bg-tertiary);
                border: 1px solid var(--border-primary);
                border-radius: var(--radius-md);
                color: var(--text-primary);
            }
            
            .confidence-display {
                padding: 2px 6px;
                border-radius: var(--radius-xs);
                font-weight: 600;
                font-size: 0.875rem;
            }
            
            .details-actions {
                display: flex;
                gap: var(--spacing-sm);
                justify-content: flex-end;
                margin-top: var(--spacing-lg);
                padding-top: var(--spacing-sm);
                border-top: 1px solid var(--border-primary);
            }
            
            .validation-summary {
                background: var(--dark-bg-tertiary);
                border-radius: var(--radius-lg);
                padding: var(--spacing-lg);
                margin-top: var(--spacing-lg);
            }
            
            .summary-stats {
                display: flex;
                gap: var(--spacing-lg);
                margin-bottom: var(--spacing-lg);
            }
            
            .stat-card {
                flex: 1;
                text-align: center;
                padding: var(--spacing-md);
                border-radius: var(--radius-md);
                border: 1px solid var(--border-primary);
            }
            
            .stat-card.validated {
                border-color: var(--accent-success);
                background: rgba(16, 185, 129, 0.1);
            }
            
            .stat-card.rejected {
                border-color: var(--accent-error);
                background: rgba(239, 68, 68, 0.1);
            }
            
            .stat-card.pending {
                border-color: var(--accent-warning);
                background: rgba(245, 158, 11, 0.1);
            }
            
            .stat-value {
                font-size: 2rem;
                font-weight: bold;
                color: var(--text-primary);
            }
            
            .stat-label {
                color: var(--text-secondary);
                font-size: 0.875rem;
            }
            
            .completion-message {
                text-align: center;
                padding: var(--spacing-lg);
                background: rgba(16, 185, 129, 0.1);
                border-radius: var(--radius-md);
                border: 1px solid var(--accent-success);
            }
            
            .completion-actions {
                display: flex;
                gap: var(--spacing-sm);
                justify-content: center;
                margin-top: var(--spacing-md);
            }
            
            .no-entities {
                text-align: center;
                color: var(--text-secondary);
                padding: var(--spacing-lg);
                font-style: italic;
            }
            
            @media (max-width: 768px) {
                .ner-content {
                    grid-template-columns: 1fr;
                }
                
                .entity-details-panel {
                    min-width: 90vw;
                    max-width: 90vw;
                }
                
                .ner-controls {
                    flex-direction: column;
                }
                
                .legend-items {
                    flex-direction: column;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Clear the UI
     */
    clear() {
        this.entities = [];
        this.originalText = '';
        this.validatedEntities = [];
        this.rejectedEntities = [];
        
        document.getElementById('originalText').innerHTML = '';
        document.getElementById('entitiesList').innerHTML = '<div class="no-entities">No entities found</div>';
        document.getElementById('validationSummary').style.display = 'none';
        
        this.updateStats();
        this.closeEntityDetails();
    }
    
    /**
     * Destroy the UI and cleanup
     */
    destroy() {
        this.clear();
        this.container.innerHTML = '';
        
        const styles = document.getElementById('ner-ui-styles');
        if (styles) {
            styles.remove();
        }
        
        // Remove global reference
        if (window.nerUI === this) {
            delete window.nerUI;
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.NERVisualizationUI = NERVisualizationUI;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NERVisualizationUI;
}
