// Templates management functionality

let quillEditor; // Global reference to the Quill editor instance

// Global variables
let analysisChart = null;
let selectedSubject = null;

document.addEventListener('DOMContentLoaded', () => {
    // Protect this route
    protectRoute();
    
    // Initialize templates page
    initTemplatesPage();
    
    // Initialize Quill editor if editor container exists
    const editorContainer = document.getElementById('templateEditor');
    if (editorContainer) {
        initQuillEditor();
    }
    
    // Event listener for create template form
    const createTemplateForm = document.getElementById('createTemplateForm');
    if (createTemplateForm) {
        createTemplateForm.addEventListener('submit', saveTemplate);
    }

    // Set up preview modal event listeners
    const customizePreviewBtn = document.getElementById('customizePreviewBtn');
    if (customizePreviewBtn) {
        customizePreviewBtn.addEventListener('click', () => {
            // Hide the preview modal and show the customize modal
            const templatePreviewModal = bootstrap.Modal.getInstance(document.getElementById('templatePreviewModal'));
            templatePreviewModal.hide();
            
            // Show the customize modal
            const customizePreviewModal = new bootstrap.Modal(document.getElementById('customizePreviewModal'));
            customizePreviewModal.show();
        });
    }

    // Set up apply custom preview button
    const applyCustomPreviewBtn = document.getElementById('applyCustomPreviewBtn');
    if (applyCustomPreviewBtn) {
        applyCustomPreviewBtn.addEventListener('click', applyCustomPreview);
    }
    
    // Set up AI Subject Optimizer button
    const aiSubjectBtn = document.getElementById('aiSubjectBtn');
    if (aiSubjectBtn) {
        aiSubjectBtn.addEventListener('click', openAiSubjectOptimizer);
    }
    
    // Set up AI Content Analysis button
    const aiAnalyzeBtn = document.getElementById('aiAnalyzeBtn');
    if (aiAnalyzeBtn) {
        aiAnalyzeBtn.addEventListener('click', openAiContentAnalysis);
    }
    
    // Set up Use Selected Subject button
    const useSelectedSubjectBtn = document.getElementById('useSelectedSubjectBtn');
    if (useSelectedSubjectBtn) {
        useSelectedSubjectBtn.addEventListener('click', applySelectedSubject);
    }
    
    // Set up Apply Analysis Suggestions button
    const applyAnalysisSuggestionsBtn = document.getElementById('applyAnalysisSuggestionsBtn');
    if (applyAnalysisSuggestionsBtn) {
        applyAnalysisSuggestionsBtn.addEventListener('click', applyAnalysisSuggestions);
    }
});

/**
 * Initialize templates page
 */
async function initTemplatesPage() {
    try {
        // Load existing templates
        await loadTemplates();
    } catch (error) {
        console.error('Error initializing templates page:', error);
        showToast('error', 'Failed to load email templates');
    }
}

/**
 * Initialize Quill editor
 */
function initQuillEditor() {
    quillEditor = new Quill('#templateEditor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link', 'image'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['clean'],
                [{ 'script': 'sub' }, { 'script': 'super' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'font': [] }]
            ]
        },
        placeholder: 'Compose your email template...'
    });
    
    // Add personalization dropdown
    addPersonalizationDropdown();
}

/**
 * Add personalization dropdown to the editor
 */
function addPersonalizationDropdown() {
    const toolbar = document.querySelector('.ql-toolbar');
    
    if (!toolbar) return;
    
    const personalizationContainer = document.createElement('span');
    personalizationContainer.className = 'ql-formats';
    
    const personalizationSelect = document.createElement('select');
    personalizationSelect.className = 'ql-personalization';
    personalizationSelect.innerHTML = `
        <option value="" selected disabled>Add Personalization</option>
        <option value="{{firstName}}">First Name</option>
        <option value="{{lastName}}">Last Name</option>
        <option value="{{email}}">Email</option>
        <option value="{{unsubscribe}}">Unsubscribe Link</option>
    `;
    
    personalizationSelect.addEventListener('change', function() {
        const value = this.value;
        if (value) {
            const range = quillEditor.getSelection(true);
            quillEditor.insertText(range.index, value);
            this.selectedIndex = 0; // Reset to default
        }
    });
    
    personalizationContainer.appendChild(personalizationSelect);
    toolbar.appendChild(personalizationContainer);
}

/**
 * Load email templates from server
 */
async function loadTemplates() {
    try {
        const templates = await apiGet('/api/template');
        
        const templatesContainer = document.getElementById('emailTemplatesContainer');
        
        if (!templatesContainer) return;
        
        templatesContainer.innerHTML = '';
        
        if (templates.length === 0) {
            templatesContainer.innerHTML = `
                <div class="alert alert-info">
                    You don't have any email templates yet. Create one using the template editor.
                </div>
            `;
            return;
        }
        
        // Create a container for template cards
        const templateGrid = document.createElement('div');
        templateGrid.className = 'row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4';
        
        templates.forEach(template => {
            const templateCard = document.createElement('div');
            templateCard.className = 'col';
            templateCard.innerHTML = `
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0">${template.name}</h5>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" 
                                type="button" id="templateActions${template._id}" 
                                data-bs-toggle="dropdown" aria-expanded="false">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="templateActions${template._id}">
                                <li>
                                    <a class="dropdown-item edit-template-btn" href="#" data-id="${template._id}">
                                        <i class="fas fa-edit me-2"></i> Edit
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item duplicate-template-btn" href="#" data-id="${template._id}">
                                        <i class="fas fa-copy me-2"></i> Duplicate
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item text-danger delete-template-btn" href="#" data-id="${template._id}">
                                        <i class="fas fa-trash me-2"></i> Delete
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="template-preview mb-3" style="max-height: 150px; overflow: hidden;">
                            ${template.content}
                        </div>
                        <p class="card-text text-muted small">
                            Created: ${formatDate(template.createdAt)}
                        </p>
                    </div>
                    <div class="card-footer bg-transparent d-flex justify-content-between">
                        <button class="btn btn-sm btn-outline-secondary preview-template-btn" data-id="${template._id}">
                            <i class="fas fa-eye me-1"></i> Preview
                        </button>
                        <button class="btn btn-sm btn-primary use-template-btn" data-id="${template._id}">
                            Use Template
                        </button>
                    </div>
                </div>
            `;
            
            templateGrid.appendChild(templateCard);
            
            // Add event listeners
            const card = templateCard.querySelector('.card');
            
            card.querySelector('.edit-template-btn').addEventListener('click', (e) => {
                e.preventDefault();
                editTemplate(template._id);
            });
            
            card.querySelector('.duplicate-template-btn').addEventListener('click', (e) => {
                e.preventDefault();
                duplicateTemplate(template._id);
            });
            
            card.querySelector('.delete-template-btn').addEventListener('click', (e) => {
                e.preventDefault();
                confirmDeleteTemplate(template._id, template.name);
            });
            
            card.querySelector('.use-template-btn').addEventListener('click', (e) => {
                e.preventDefault();
                useTemplate(template._id);
            });
            
            card.querySelector('.preview-template-btn').addEventListener('click', (e) => {
                e.preventDefault();
                previewTemplate(template._id);
            });
        });
        
        templatesContainer.appendChild(templateGrid);
    } catch (error) {
        console.error('Error loading templates:', error);
        throw error;
    }
}

/**
 * Save a template (create or update)
 * @param {Event} e - Submit event
 */
async function saveTemplate(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('templateName');
    const name = nameInput.value.trim();
    const subjectInput = document.getElementById('templateSubject');
    const subject = subjectInput.value.trim();
    const templateId = document.getElementById('templateId')?.value;
    
    if (!name) {
        showToast('error', 'Please enter a template name');
        return;
    }
    
    if (!subject) {
        showToast('error', 'Please enter an email subject');
        return;
    }
    
    // Get content from Quill editor
    const content = quillEditor.root.innerHTML;
    
    if (quillEditor.getText().trim().length === 0) {
        showToast('error', 'Template content cannot be empty');
        return;
    }
    
    try {
        let response;
        
        if (templateId) {
            // Update existing template
            response = await apiPut(`/api/template/${templateId}`, {
                name,
                subject,
                content
            });
        } else {
            // Create new template
            response = await apiPost('/api/template', {
                name,
                subject,
                content
            });
        }
        
        if (response._id) {
            showToast('success', `Template ${templateId ? 'updated' : 'created'} successfully`);
            
            // Reset form
            nameInput.value = '';
            subjectInput.value = '';
            quillEditor.setContents([]);
            
            if (templateId) {
                // Clear the template ID
                document.getElementById('templateId').value = '';
                // Update button text
                document.querySelector('#createTemplateForm button[type="submit"]').textContent = 'Create Template';
            }
            
            // Reload templates
            await loadTemplates();
        } else {
            showToast('error', response.message || `Failed to ${templateId ? 'update' : 'create'} template`);
        }
    } catch (error) {
        console.error('Error saving template:', error);
        showToast('error', error.message || `Failed to ${templateId ? 'update' : 'create'} template`);
    }
}

/**
 * Edit a template
 * @param {string} templateId - Template ID
 */
async function editTemplate(templateId) {
    try {
        const template = await apiGet(`/api/template/${templateId}`);
        
        // Fill the form
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateSubject').value = template.subject;
        
        // Set the template ID in a hidden field
        let templateIdField = document.getElementById('templateId');
        if (!templateIdField) {
            templateIdField = document.createElement('input');
            templateIdField.type = 'hidden';
            templateIdField.id = 'templateId';
            document.getElementById('createTemplateForm').appendChild(templateIdField);
        }
        templateIdField.value = templateId;
        
        // Set the content in the editor
        quillEditor.root.innerHTML = template.content;
        
        // Update button text
        document.querySelector('#createTemplateForm button[type="submit"]').textContent = 'Update Template';
        
        // Scroll to the form
        document.getElementById('templateFormSection').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error editing template:', error);
        showToast('error', 'Failed to load template for editing');
    }
}

/**
 * Duplicate a template
 * @param {string} templateId - Template ID
 */
async function duplicateTemplate(templateId) {
    try {
        const template = await apiGet(`/api/template/${templateId}`);
        
        // Create a new template with the same content but a different name
        const response = await apiPost('/api/template', {
            name: `${template.name} (Copy)`,
            subject: template.subject,
            content: template.content
        });
        
        if (response._id) {
            showToast('success', 'Template duplicated successfully');
            await loadTemplates();
        } else {
            showToast('error', response.message || 'Failed to duplicate template');
        }
    } catch (error) {
        console.error('Error duplicating template:', error);
        showToast('error', error.message || 'Failed to duplicate template');
    }
}

/**
 * Confirm and delete a template
 * @param {string} templateId - Template ID
 * @param {string} templateName - Template name
 */
function confirmDeleteTemplate(templateId, templateName) {
    if (confirm(`Are you sure you want to delete the template "${templateName}"? This cannot be undone.`)) {
        deleteTemplate(templateId);
    }
}

/**
 * Delete a template
 * @param {string} templateId - Template ID
 */
async function deleteTemplate(templateId) {
    try {
        const response = await apiDelete(`/api/template/${templateId}`);
        
        if (response.success) {
            showToast('success', 'Template deleted successfully');
            await loadTemplates();
        } else {
            showToast('error', response.message || 'Failed to delete template');
        }
    } catch (error) {
        console.error('Error deleting template:', error);
        showToast('error', error.message || 'Failed to delete template');
    }
}

/**
 * Use template for a campaign
 * @param {string} templateId - Template ID
 */
function useTemplate(templateId) {
    // Redirect to campaigns page with template ID
    window.location.href = `/client/pages/campaigns.html?templateId=${templateId}`;
}

/**
 * Preview a template
 * @param {string} templateId - Template ID
 * @param {Object} customData - Optional custom data for preview
 */
async function previewTemplate(templateId, customData = null) {
    try {
        // Show the preview modal with loading state
        const previewModal = new bootstrap.Modal(document.getElementById('templatePreviewModal'));
        previewModal.show();
        
        document.getElementById('templatePreviewLoading').style.display = 'block';
        document.getElementById('templatePreviewContent').style.display = 'none';
        
        // Store the template ID for customize feature
        document.getElementById('previewTemplateId').value = templateId;
        
        // Fetch the preview
        const response = await apiPost(`/api/template/${templateId}/preview`, customData);
        
        if (response.preview) {
            // Update the modal content
            document.getElementById('templatePreviewContent').innerHTML = response.preview;
            document.getElementById('templatePreviewLoading').style.display = 'none';
            document.getElementById('templatePreviewContent').style.display = 'block';
        } else {
            throw new Error('Failed to generate preview');
        }
    } catch (error) {
        console.error('Error previewing template:', error);
        showToast('error', 'Failed to generate template preview');
        
        // Close the modal
        const previewModal = bootstrap.Modal.getInstance(document.getElementById('templatePreviewModal'));
        if (previewModal) {
            previewModal.hide();
        }
    }
}

/**
 * Apply custom preview data and regenerate preview
 */
function applyCustomPreview() {
    const templateId = document.getElementById('previewTemplateId').value;
    
    if (!templateId) {
        showToast('error', 'Template ID not found');
        return;
    }
    
    // Get custom data from the form
    const customData = {
        firstName: document.getElementById('previewFirstName').value.trim(),
        lastName: document.getElementById('previewLastName').value.trim(),
        email: document.getElementById('previewEmail').value.trim()
    };
    
    // Hide customize modal
    const customizeModal = bootstrap.Modal.getInstance(document.getElementById('customizePreviewModal'));
    customizeModal.hide();
    
    // Show the preview with custom data
    previewTemplate(templateId, customData);
}

/**
 * Open the AI Subject Optimizer modal
 */
async function openAiSubjectOptimizer() {
    try {
        // Get current template data
        const templateId = document.getElementById('templateId')?.value;
        const subject = document.getElementById('templateSubject')?.value?.trim();
        const content = quillEditor?.root?.innerHTML;
        
        if (!templateId && (!subject || !content)) {
            showToast('error', 'Please save your template first or select an existing template');
            return;
        }
        
        // Reset the modal state
        document.getElementById('aiSubjectLoading').style.display = 'block';
        document.getElementById('aiSubjectContent').style.display = 'none';
        document.getElementById('aiSubjectError').style.display = 'none';
        document.getElementById('optimizedSubjectsList').innerHTML = '';
        document.getElementById('useSelectedSubjectBtn').disabled = true;
        selectedSubject = null;
        
        // Show the modal
        const aiSubjectModal = new bootstrap.Modal(document.getElementById('aiSubjectOptimizerModal'));
        aiSubjectModal.show();
        
        // If we have a template ID, use the API. Otherwise, use temporary data
        if (templateId) {
            // Call the API to generate optimized subject lines
            const result = await apiPost(`/api/template/${templateId}/optimize-subject`, {
                category: 'other'  // Default category
            });
            
            // Check if API key is required
            if (result.needsApiKey || result.code === 'OPENAI_API_KEY_MISSING') {
                showAiKeyRequiredError('subject lines');
                return;
            }
            
            if (result.optimizedSubjects && result.optimizedSubjects.length > 0) {
                // Display original and optimized subjects
                document.getElementById('originalSubjectText').textContent = result.originalSubject;
                displayOptimizedSubjects(result.optimizedSubjects);
            } else {
                throw new Error('No optimized subjects were generated');
            }
        } else {
            // Save the template first, then optimize
            showToast('info', 'Saving template before optimization...');
            const saveResponse = await saveTemplateSilently();
            
            if (saveResponse && saveResponse._id) {
                // Now optimize the newly saved template
                const result = await apiPost(`/api/template/${saveResponse._id}/optimize-subject`, {
                    category: 'other'  // Default category
                });
                
                // Check if API key is required
                if (result.needsApiKey || result.code === 'OPENAI_API_KEY_MISSING') {
                    showAiKeyRequiredError('subject lines');
                    
                    // Still update the template ID since we saved it
                    document.getElementById('templateId').value = saveResponse._id;
                    return;
                }
                
                if (result.optimizedSubjects && result.optimizedSubjects.length > 0) {
                    // Display original and optimized subjects
                    document.getElementById('originalSubjectText').textContent = result.originalSubject;
                    displayOptimizedSubjects(result.optimizedSubjects);
                    
                    // Update the template ID
                    document.getElementById('templateId').value = saveResponse._id;
                } else {
                    throw new Error('No optimized subjects were generated');
                }
            } else {
                throw new Error('Failed to save template');
            }
        }
    } catch (error) {
        console.error('Error optimizing subject:', error);
        document.getElementById('aiSubjectLoading').style.display = 'none';
        document.getElementById('aiSubjectError').style.display = 'block';
        document.getElementById('aiSubjectErrorText').textContent = error.message || 'Failed to generate optimized subject lines. Please try again later.';
    }
}

/**
 * Show an error message about missing OpenAI API key
 * @param {string} feature - The feature that requires the API key
 */
function showAiKeyRequiredError(feature) {
    document.getElementById('aiSubjectLoading').style.display = 'none';
    document.getElementById('aiSubjectError').style.display = 'block';
    document.getElementById('aiSubjectErrorText').innerHTML = `
        <div class="text-center mb-3">
            <i class="fas fa-robot text-primary fa-3x mb-3"></i>
            <h5>OpenAI API Key Required</h5>
            <p>To generate AI-optimized ${feature}, you need to add your OpenAI API key.</p>
            <a href="settings.html#advanced" class="btn btn-primary mt-2">
                <i class="fas fa-cog me-2"></i>Configure API Key
            </a>
        </div>
        <div class="alert alert-info">
            <small>
                <i class="fas fa-info-circle me-1"></i>
                Don't have an API key? <a href="https://platform.openai.com/api-keys" target="_blank">Get one from OpenAI</a> 
                and add it in Settings → Advanced → AI Integration.
            </small>
        </div>
    `;
}

/**
 * Display optimized subject lines in the modal
 * @param {string[]} subjects - Array of optimized subject lines
 */
function displayOptimizedSubjects(subjects) {
    const container = document.getElementById('optimizedSubjectsList');
    container.innerHTML = '';
    
    subjects.forEach((subject, index) => {
        const subjectCard = document.createElement('div');
        subjectCard.className = 'card mb-2';
        subjectCard.innerHTML = `
            <div class="card-body">
                <div class="form-check">
                    <input class="form-check-input subject-option" type="radio" name="subjectOption" 
                           id="subjectOption${index}" value="${subject}" data-index="${index}">
                    <label class="form-check-label w-100" for="subjectOption${index}">
                        <div class="d-flex justify-content-between align-items-center">
                            <span>${subject}</span>
                        </div>
                    </label>
                </div>
            </div>
        `;
        
        container.appendChild(subjectCard);
    });
    
    // Add event listeners to radio buttons
    const radioButtons = document.querySelectorAll('.subject-option');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                selectedSubject = this.value;
                document.getElementById('useSelectedSubjectBtn').disabled = false;
            }
        });
    });
    
    // Hide loading, show content
    document.getElementById('aiSubjectLoading').style.display = 'none';
    document.getElementById('aiSubjectContent').style.display = 'block';
}

/**
 * Apply the selected AI-optimized subject
 */
async function applySelectedSubject() {
    if (!selectedSubject) {
        showToast('error', 'Please select a subject first');
        return;
    }
    
    try {
        const templateId = document.getElementById('templateId').value;
        
        if (!templateId) {
            showToast('error', 'Template ID not found');
            return;
        }
        
        // Call the API to select the subject
        const result = await apiPost(`/api/template/${templateId}/select-subject`, {
            selectedSubject
        });
        
        if (result.success) {
            // Update the subject in the form
            document.getElementById('templateSubject').value = selectedSubject;
            
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById('aiSubjectOptimizerModal')).hide();
            
            showToast('success', 'AI-optimized subject applied successfully');
        } else {
            throw new Error('Failed to apply selected subject');
        }
    } catch (error) {
        console.error('Error applying selected subject:', error);
        showToast('error', error.message || 'Failed to apply selected subject');
    }
}

/**
 * Open the AI Content Analysis modal
 */
async function openAiContentAnalysis() {
    try {
        // Get current template data
        const templateId = document.getElementById('templateId')?.value;
        const content = quillEditor?.root?.innerHTML;
        
        if (!templateId && !content) {
            showToast('error', 'Please save your template first or select an existing template');
            return;
        }
        
        // Reset the modal state
        document.getElementById('aiAnalysisLoading').style.display = 'block';
        document.getElementById('aiAnalysisContent').style.display = 'none';
        document.getElementById('aiAnalysisError').style.display = 'none';
        
        // Show the modal
        const aiAnalysisModal = new bootstrap.Modal(document.getElementById('aiContentAnalysisModal'));
        aiAnalysisModal.show();
        
        // If we have a template ID, use the API
        if (templateId) {
            // Call the API to analyze the content
            const analysis = await apiPost(`/api/template/${templateId}/analyze-content`);
            
            // Check if API key is required
            if (analysis.needsApiKey || analysis.code === 'OPENAI_API_KEY_MISSING') {
                showAiContentAnalysisKeyRequiredError();
                return;
            }
            
            if (analysis) {
                displayContentAnalysis(analysis);
            } else {
                throw new Error('Failed to analyze content');
            }
        } else {
            // Save the template first, then analyze
            showToast('info', 'Saving template before analysis...');
            const saveResponse = await saveTemplateSilently();
            
            if (saveResponse && saveResponse._id) {
                // Now analyze the newly saved template
                const analysis = await apiPost(`/api/template/${saveResponse._id}/analyze-content`);
                
                // Check if API key is required
                if (analysis.needsApiKey || analysis.code === 'OPENAI_API_KEY_MISSING') {
                    showAiContentAnalysisKeyRequiredError();
                    
                    // Still update the template ID since we saved it
                    document.getElementById('templateId').value = saveResponse._id;
                    return;
                }
                
                if (analysis) {
                    displayContentAnalysis(analysis);
                    
                    // Update the template ID
                    document.getElementById('templateId').value = saveResponse._id;
                } else {
                    throw new Error('Failed to analyze content');
                }
            } else {
                throw new Error('Failed to save template');
            }
        }
    } catch (error) {
        console.error('Error analyzing content:', error);
        document.getElementById('aiAnalysisLoading').style.display = 'none';
        document.getElementById('aiAnalysisError').style.display = 'block';
        document.getElementById('aiAnalysisErrorText').textContent = error.message || 'Failed to analyze content. Please try again later.';
    }
}

/**
 * Show an error message about missing OpenAI API key for content analysis
 */
function showAiContentAnalysisKeyRequiredError() {
    document.getElementById('aiAnalysisLoading').style.display = 'none';
    document.getElementById('aiAnalysisError').style.display = 'block';
    document.getElementById('aiAnalysisErrorText').innerHTML = `
        <div class="text-center mb-3">
            <i class="fas fa-robot text-primary fa-3x mb-3"></i>
            <h5>OpenAI API Key Required</h5>
            <p>To analyze your email content with AI, you need to add your OpenAI API key.</p>
            <a href="settings.html#advanced" class="btn btn-primary mt-2">
                <i class="fas fa-cog me-2"></i>Configure API Key
            </a>
        </div>
        <div class="alert alert-info">
            <small>
                <i class="fas fa-info-circle me-1"></i>
                Don't have an API key? <a href="https://platform.openai.com/api-keys" target="_blank">Get one from OpenAI</a> 
                and add it in Settings → Advanced → AI Integration.
            </small>
        </div>
    `;
}

/**
 * Display content analysis results in the modal
 * @param {Object} analysis - Content analysis data
 */
function displayContentAnalysis(analysis) {
    // Update score
    const scoreValue = document.getElementById('analysisScoreValue');
    scoreValue.textContent = analysis.score || 0;
    
    // Create the chart
    if (analysisChart) {
        analysisChart.destroy();
    }
    
    const ctx = document.getElementById('analysisScoreChart').getContext('2d');
    analysisChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [analysis.score || 0, 100 - (analysis.score || 0)],
                backgroundColor: [
                    getScoreColor(analysis.score || 0),
                    '#f1f1f1'
                ],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '80%',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });
    
    // Update summary
    let summaryHtml = '';
    if (analysis.score >= 80) {
        summaryHtml = `<div class="alert alert-success mt-3">This email scores excellent! It's well-crafted and likely to perform very well.</div>`;
    } else if (analysis.score >= 60) {
        summaryHtml = `<div class="alert alert-info mt-3">Good email! With a few improvements, it could perform even better.</div>`;
    } else if (analysis.score >= 40) {
        summaryHtml = `<div class="alert alert-warning mt-3">This email needs some work. Consider implementing the suggestions.</div>`;
    } else {
        summaryHtml = `<div class="alert alert-danger mt-3">This email needs significant improvements. Follow the suggestions carefully.</div>`;
    }
    
    document.getElementById('analysisSummary').innerHTML = summaryHtml;
    
    // Update strengths
    const strengthsList = document.getElementById('analysisStrengths');
    strengthsList.innerHTML = '';
    
    if (analysis.strengths && analysis.strengths.length > 0) {
        analysis.strengths.forEach(strength => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.textContent = strength;
            strengthsList.appendChild(li);
        });
    } else {
        strengthsList.innerHTML = '<li class="text-muted">No specific strengths identified</li>';
    }
    
    // Update suggestions
    const suggestionsList = document.getElementById('analysisSuggestions');
    suggestionsList.innerHTML = '';
    
    if (analysis.suggestions && analysis.suggestions.length > 0) {
        analysis.suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.className = 'mb-2';
            li.textContent = suggestion;
            suggestionsList.appendChild(li);
        });
    } else {
        suggestionsList.innerHTML = '<li class="text-muted">No specific suggestions available</li>';
    }
    
    // Hide loading, show content
    document.getElementById('aiAnalysisLoading').style.display = 'none';
    document.getElementById('aiAnalysisContent').style.display = 'block';
}

/**
 * Get color based on score
 * @param {number} score - Score value
 * @returns {string} - Color code
 */
function getScoreColor(score) {
    if (score >= 80) return '#28a745';  // Green (success)
    if (score >= 60) return '#17a2b8';  // Blue (info)
    if (score >= 40) return '#ffc107';  // Yellow (warning)
    return '#dc3545';  // Red (danger)
}

/**
 * Apply AI analysis suggestions to the template
 */
function applyAnalysisSuggestions() {
    // This is a placeholder - in a real implementation, we would use an AI
    // to directly improve the content based on suggestions
    showToast('info', 'This feature will automatically improve your email content based on AI analysis');
    
    // Close the modal
    bootstrap.Modal.getInstance(document.getElementById('aiContentAnalysisModal')).hide();
}

/**
 * Save template silently without showing toasts or resetting the form
 * Used by AI functions that need to save the template first
 * @returns {Promise<Object>} - Saved template data
 */
async function saveTemplateSilently() {
    const name = document.getElementById('templateName').value.trim() || 'Untitled Template';
    const subject = document.getElementById('templateSubject').value.trim() || 'Untitled';
    const content = quillEditor.root.innerHTML;
    
    if (quillEditor.getText().trim().length === 0) {
        throw new Error('Template content cannot be empty');
    }
    
    try {
        const templateId = document.getElementById('templateId')?.value;
        let response;
        
        if (templateId) {
            // Update existing template
            response = await apiPut(`/api/template/${templateId}`, {
                name,
                subject,
                content
            });
        } else {
            // Create new template
            response = await apiPost('/api/template', {
                name,
                subject,
                content
            });
        }
        
        return response;
    } catch (error) {
        console.error('Error saving template silently:', error);
        throw error;
    }
}
