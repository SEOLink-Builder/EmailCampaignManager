// Templates management functionality

let quillEditor; // Global reference to the Quill editor instance

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
                    <div class="card-footer bg-transparent">
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
