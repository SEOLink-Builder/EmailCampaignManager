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
    
    // Set up send test email button in preview modal
    const sendTestEmailBtn = document.getElementById('sendTestEmailBtn');
    if (sendTestEmailBtn) {
        sendTestEmailBtn.addEventListener('click', showSendTestEmailModal);
    }
    
    // Set up send test email submit button in test email modal
    const sendTestEmailSubmitBtn = document.getElementById('sendTestEmailSubmitBtn');
    if (sendTestEmailSubmitBtn) {
        sendTestEmailSubmitBtn.addEventListener('click', sendTestEmail);
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
 * Initialize Quill editor with enhanced micro-interactions
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
    
    // Add custom color palette
    addInteractiveColorPalette();
    
    // Add micro-interactions
    setupEditorMicroInteractions();
    
    // Add autosave functionality
    setupAutosave();
    
    // Add undo/redo toast notifications
    setupUndoRedoNotifications();
}

/**
 * Setup micro-interactions for the editor
 */
function setupEditorMicroInteractions() {
    const editorContainer = document.querySelector('.ql-editor');
    if (!editorContainer) return;
    
    // Visual feedback on focus
    editorContainer.addEventListener('focus', () => {
        editorContainer.style.transition = 'box-shadow 0.3s ease-in-out';
        editorContainer.style.boxShadow = '0 0 0 3px rgba(66, 153, 225, 0.2)';
    });
    
    editorContainer.addEventListener('blur', () => {
        editorContainer.style.boxShadow = 'none';
    });
    
    // Add subtle animation when typing
    editorContainer.addEventListener('keydown', (e) => {
        // Skip for navigation keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
            return;
        }
        
        // Create a ripple effect at cursor position
        const cursorPosition = document.getSelection().getRangeAt(0).getBoundingClientRect();
        if (!cursorPosition.x && !cursorPosition.y) return;
        
        const ripple = document.createElement('div');
        ripple.className = 'typing-ripple';
        ripple.style.cssText = `
            position: absolute;
            width: 5px;
            height: 5px;
            background: rgba(66, 153, 225, 0.4);
            border-radius: 50%;
            transform: scale(0);
            opacity: 1;
            z-index: 1000;
            pointer-events: none;
            animation: typing-ripple 0.6s ease-out forwards;
        `;
        
        const rect = editorContainer.getBoundingClientRect();
        ripple.style.left = (cursorPosition.x - rect.left) + 'px';
        ripple.style.top = (cursorPosition.y - rect.top) + 'px';
        
        editorContainer.appendChild(ripple);
        
        // Remove ripple after animation
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
    
    // Add styles for the animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes typing-ripple {
            0% {
                transform: scale(0);
                opacity: 1;
            }
            100% {
                transform: scale(2);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Add satisfying click effect for toolbar buttons
    const toolbarButtons = document.querySelectorAll('.ql-toolbar button, .ql-toolbar .ql-picker');
    toolbarButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.style.transform = 'scale(0.95)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 100);
        });
    });
}

/**
 * Setup autosave functionality
 */
function setupAutosave() {
    if (!quillEditor) return;
    
    let saveTimeout;
    const autoSaveInterval = 5000; // 5 seconds
    
    quillEditor.on('text-change', () => {
        // Clear previous timeout
        if (saveTimeout) clearTimeout(saveTimeout);
        
        // Show saving indicator
        const statusIndicator = document.getElementById('editorStatusIndicator') || createStatusIndicator();
        statusIndicator.textContent = 'Saving...';
        statusIndicator.className = 'editor-status-indicator saving';
        
        // Set new timeout
        saveTimeout = setTimeout(async () => {
            try {
                // Only save if we have a template ID and content has changed
                const templateId = document.getElementById('templateId')?.value;
                if (templateId && document.getElementById('templateName')?.value) {
                    await saveTemplateSilently();
                    
                    // Show saved indicator
                    statusIndicator.textContent = 'Saved';
                    statusIndicator.className = 'editor-status-indicator saved';
                    
                    // Hide after 2 seconds
                    setTimeout(() => {
                        statusIndicator.className = 'editor-status-indicator saved fade-out';
                    }, 2000);
                }
            } catch (error) {
                // Show error indicator
                statusIndicator.textContent = 'Error saving';
                statusIndicator.className = 'editor-status-indicator error';
                console.error('Autosave error:', error);
            }
        }, autoSaveInterval);
    });
    
    // Create status indicator element if it doesn't exist
    function createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'editorStatusIndicator';
        indicator.className = 'editor-status-indicator';
        indicator.style.cssText = `
            position: absolute;
            bottom: 10px;
            right: 10px;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            transition: opacity 0.3s ease-in-out;
            z-index: 100;
        `;
        
        // Add styles for the indicator
        const style = document.createElement('style');
        style.textContent = `
            .editor-status-indicator.saving {
                background-color: #EDF2F7;
                color: #4A5568;
            }
            .editor-status-indicator.saved {
                background-color: #C6F6D5;
                color: #2F855A;
            }
            .editor-status-indicator.error {
                background-color: #FED7D7;
                color: #C53030;
            }
            .editor-status-indicator.fade-out {
                opacity: 0;
            }
        `;
        document.head.appendChild(style);
        
        // Find the editor container and append the indicator
        const editorContainer = document.querySelector('.ql-container');
        if (editorContainer) {
            editorContainer.style.position = 'relative';
            editorContainer.appendChild(indicator);
        }
        
        return indicator;
    }
}

/**
 * Setup undo/redo notifications
 */
function setupUndoRedoNotifications() {
    document.addEventListener('keydown', (e) => {
        // Check for Ctrl+Z or Command+Z (Undo)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            showMicroToast('Undo');
        }
        
        // Check for Ctrl+Shift+Z or Command+Shift+Z or Ctrl+Y (Redo)
        if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
            showMicroToast('Redo');
        }
    });
    
    // Show a small toast notification near the cursor
    function showMicroToast(action) {
        // Get cursor position
        const selection = document.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'micro-toast';
        toast.textContent = action;
        toast.style.cssText = `
            position: fixed;
            z-index: 9999;
            padding: 4px 8px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            animation: toast-fade 1s ease-out forwards;
        `;
        
        // Position the toast near the cursor
        toast.style.left = (rect.left + window.scrollX) + 'px';
        toast.style.top = (rect.top + window.scrollY - 30) + 'px';
        
        // Add animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes toast-fade {
                0% { opacity: 0; transform: translateY(10px); }
                10% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; }
                100% { opacity: 0; transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
        
        // Add to document and remove after animation
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 1000);
    }
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
 * Add interactive color palette to editor
 */
function addInteractiveColorPalette() {
    // Check if toolbar exists
    const toolbar = document.querySelector('.ql-toolbar');
    if (!toolbar) return;
    
    // Add button to open color palette modal
    const colorPickerButton = document.createElement('button');
    colorPickerButton.className = 'ql-color-palette';
    colorPickerButton.type = 'button';
    colorPickerButton.innerHTML = '<i class="fas fa-palette"></i>';
    colorPickerButton.title = 'Advanced Color Palette';
    colorPickerButton.style.cssText = `
        display: inline-block;
        margin-right: 5px;
        height: 24px;
        width: 28px;
        padding: 3px 5px;
        border: none;
        background: none;
        cursor: pointer;
        transition: all 0.2s ease;
    `;
    
    // Add to toolbar
    const formatGroup = document.createElement('span');
    formatGroup.className = 'ql-formats';
    formatGroup.appendChild(colorPickerButton);
    toolbar.appendChild(formatGroup);
    
    // Create color palette modal
    const modal = document.createElement('div');
    modal.className = 'color-palette-modal';
    modal.style.cssText = `
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 9999;
        background: white;
        border-radius: 6px;
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
        padding: 15px;
        width: 320px;
        animation: fadeIn 0.2s ease-in-out;
    `;
    
    // Add modal content
    modal.innerHTML = `
        <div class="color-palette-header">
            <h6 class="m-0">Color Palette</h6>
            <div class="color-palette-tabs">
                <button class="active" data-tab="text">Text</button>
                <button data-tab="background">Background</button>
                <button data-tab="palette">Palette</button>
            </div>
        </div>
        
        <div class="color-palette-content">
            <div class="tab-content active" data-tab="text">
                <div class="color-picker-container my-2">
                    <input type="color" id="textColorPicker" value="#000000">
                    <div class="color-preview" id="textColorPreview">#000000</div>
                </div>
                
                <div class="color-presets">
                    <button class="color-preset" style="background-color: #000000;" data-color="#000000"></button>
                    <button class="color-preset" style="background-color: #2C3E50;" data-color="#2C3E50"></button>
                    <button class="color-preset" style="background-color: #E74C3C;" data-color="#E74C3C"></button>
                    <button class="color-preset" style="background-color: #3498DB;" data-color="#3498DB"></button>
                    <button class="color-preset" style="background-color: #27AE60;" data-color="#27AE60"></button>
                    <button class="color-preset" style="background-color: #F39C12;" data-color="#F39C12"></button>
                    <button class="color-preset" style="background-color: #9B59B6;" data-color="#9B59B6"></button>
                    <button class="color-preset" style="background-color: #1ABC9C;" data-color="#1ABC9C"></button>
                </div>
                
                <button class="btn btn-sm btn-primary mt-2 apply-color" data-type="text">Apply Text Color</button>
            </div>
            
            <div class="tab-content" data-tab="background">
                <div class="color-picker-container my-2">
                    <input type="color" id="bgColorPicker" value="#ffffff">
                    <div class="color-preview" id="bgColorPreview">#ffffff</div>
                </div>
                
                <div class="color-presets">
                    <button class="color-preset" style="background-color: #FFFFFF; border: 1px solid #E0E0E0;" data-color="#FFFFFF"></button>
                    <button class="color-preset" style="background-color: #F8F9FA;" data-color="#F8F9FA"></button>
                    <button class="color-preset" style="background-color: #FFEAA7;" data-color="#FFEAA7"></button>
                    <button class="color-preset" style="background-color: #E0F7FA;" data-color="#E0F7FA"></button>
                    <button class="color-preset" style="background-color: #E8F5E9;" data-color="#E8F5E9"></button>
                    <button class="color-preset" style="background-color: #FFF3E0;" data-color="#FFF3E0"></button>
                    <button class="color-preset" style="background-color: #F3E5F5;" data-color="#F3E5F5"></button>
                    <button class="color-preset" style="background-color: #E8EAF6;" data-color="#E8EAF6"></button>
                </div>
                
                <button class="btn btn-sm btn-primary mt-2 apply-color" data-type="background">Apply Background</button>
            </div>
            
            <div class="tab-content" data-tab="palette">
                <h6 class="mb-2">Color Schemes</h6>
                <div class="color-schemes">
                    <div class="color-scheme" data-scheme="minimal">
                        <div class="scheme-colors">
                            <span style="background-color: #000000;"></span>
                            <span style="background-color: #FFFFFF;"></span>
                            <span style="background-color: #F8F9FA;"></span>
                            <span style="background-color: #DEE2E6;"></span>
                        </div>
                        <div class="scheme-name">Minimal</div>
                    </div>
                    <div class="color-scheme" data-scheme="professional">
                        <div class="scheme-colors">
                            <span style="background-color: #1E3A8A;"></span>
                            <span style="background-color: #3B82F6;"></span>
                            <span style="background-color: #FFFFFF;"></span>
                            <span style="background-color: #F3F4F6;"></span>
                        </div>
                        <div class="scheme-name">Professional</div>
                    </div>
                    <div class="color-scheme" data-scheme="vibrant">
                        <div class="scheme-colors">
                            <span style="background-color: #7C3AED;"></span>
                            <span style="background-color: #EC4899;"></span>
                            <span style="background-color: #FFFBEB;"></span>
                            <span style="background-color: #F9FAFB;"></span>
                        </div>
                        <div class="scheme-name">Vibrant</div>
                    </div>
                    <div class="color-scheme" data-scheme="calm">
                        <div class="scheme-colors">
                            <span style="background-color: #065F46;"></span>
                            <span style="background-color: #10B981;"></span>
                            <span style="background-color: #ECFDF5;"></span>
                            <span style="background-color: #FFFFFF;"></span>
                        </div>
                        <div class="scheme-name">Calm</div>
                    </div>
                </div>
                <button class="btn btn-sm btn-primary mt-3 apply-scheme">Apply Scheme</button>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .color-palette-header {
            display: flex;
            flex-direction: column;
            margin-bottom: 10px;
        }
        
        .color-palette-tabs {
            display: flex;
            margin-top: 10px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .color-palette-tabs button {
            background: none;
            border: none;
            padding: 5px 10px;
            cursor: pointer;
            opacity: 0.7;
            transition: all 0.2s;
            font-size: 0.9rem;
        }
        
        .color-palette-tabs button.active {
            opacity: 1;
            border-bottom: 2px solid #3B82F6;
        }
        
        .tab-content {
            display: none;
            padding: 10px 0;
        }
        
        .tab-content.active {
            display: block;
            animation: fadeIn 0.2s ease-in-out;
        }
        
        .color-picker-container {
            display: flex;
            align-items: center;
        }
        
        .color-picker-container input[type="color"] {
            height: 36px;
            width: 36px;
            padding: 0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .color-preview {
            margin-left: 10px;
            font-size: 14px;
            font-family: monospace;
        }
        
        .color-presets {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin: 10px 0;
        }
        
        .color-preset {
            width: 100%;
            height: 30px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .color-preset:hover {
            transform: scale(1.05);
        }
        
        .color-schemes {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .color-scheme {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .color-scheme:hover {
            transform: translateY(-3px);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
        }
        
        .scheme-colors {
            display: flex;
            margin-bottom: 5px;
        }
        
        .scheme-colors span {
            flex: 1;
            height: 15px;
            margin-right: 2px;
        }
        
        .scheme-colors span:last-child {
            margin-right: 0;
        }
        
        .scheme-name {
            font-size: 12px;
            text-align: center;
        }
        
        .apply-color, .apply-scheme {
            width: 100%;
        }
    `;
    document.head.appendChild(style);
    
    // Append modal to toolbar container
    formatGroup.appendChild(modal);
    
    // Add event listeners
    colorPickerButton.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Toggle modal
        if (modal.style.display === 'none' || modal.style.display === '') {
            modal.style.display = 'block';
            
            // Position modal relative to the button
            const buttonRect = colorPickerButton.getBoundingClientRect();
            const toolbarRect = toolbar.getBoundingClientRect();
            
            // Calculate if modal would go off-screen to the right
            if (buttonRect.left + modal.offsetWidth > window.innerWidth) {
                modal.style.left = 'auto';
                modal.style.right = '0';
            } else {
                modal.style.left = `${buttonRect.left - toolbarRect.left}px`;
                modal.style.right = 'auto';
            }
            
            // Close when clicking outside
            document.addEventListener('click', closeModalOnClickOutside);
        } else {
            modal.style.display = 'none';
            document.removeEventListener('click', closeModalOnClickOutside);
        }
    });
    
    // Function to close modal when clicking outside
    function closeModalOnClickOutside(e) {
        if (!modal.contains(e.target) && e.target !== colorPickerButton) {
            modal.style.display = 'none';
            document.removeEventListener('click', closeModalOnClickOutside);
        }
    }
    
    // Tab switching
    const tabs = modal.querySelectorAll('.color-palette-tabs button');
    const contents = modal.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding content
            const tabName = tab.dataset.tab;
            contents.forEach(content => {
                if (content.dataset.tab === tabName) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
    
    // Color pickers
    const textColorPicker = modal.querySelector('#textColorPicker');
    const bgColorPicker = modal.querySelector('#bgColorPicker');
    const textColorPreview = modal.querySelector('#textColorPreview');
    const bgColorPreview = modal.querySelector('#bgColorPreview');
    
    textColorPicker.addEventListener('input', (e) => {
        textColorPreview.textContent = e.target.value;
    });
    
    bgColorPicker.addEventListener('input', (e) => {
        bgColorPreview.textContent = e.target.value;
    });
    
    // Color presets
    const colorPresets = modal.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const color = preset.dataset.color;
            const tab = preset.closest('.tab-content').dataset.tab;
            
            if (tab === 'text') {
                textColorPicker.value = color;
                textColorPreview.textContent = color;
            } else if (tab === 'background') {
                bgColorPicker.value = color;
                bgColorPreview.textContent = color;
            }
            
            // Add subtle animation
            preset.style.transform = 'scale(0.9)';
            setTimeout(() => {
                preset.style.transform = 'scale(1)';
            }, 150);
        });
    });
    
    // Apply color buttons
    const applyColorButtons = modal.querySelectorAll('.apply-color');
    applyColorButtons.forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type;
            const format = type === 'text' ? 'color' : 'background';
            const value = type === 'text' ? textColorPicker.value : bgColorPicker.value;
            
            // Apply color to selected text
            const range = quillEditor.getSelection();
            if (range) {
                // If text is selected, apply to selection
                if (range.length > 0) {
                    quillEditor.format(format, value);
                } else {
                    // Apply to future input
                    quillEditor.format(format, value);
                }
                
                // Show micro toast
                const toast = document.createElement('div');
                toast.className = 'color-toast';
                toast.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} color applied`;
                toast.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background-color: #323232;
                    color: white;
                    padding: 10px 15px;
                    border-radius: 4px;
                    font-size: 14px;
                    z-index: 9999;
                    animation: slideUp 0.3s ease-out forwards;
                `;
                
                // Add animation style
                const toastStyle = document.createElement('style');
                toastStyle.textContent = `
                    @keyframes slideUp {
                        0% { transform: translateY(20px); opacity: 0; }
                        100% { transform: translateY(0); opacity: 1; }
                    }
                `;
                document.head.appendChild(toastStyle);
                
                document.body.appendChild(toast);
                setTimeout(() => {
                    toast.remove();
                    toastStyle.remove();
                }, 2000);
            }
            
            // Close the modal
            modal.style.display = 'none';
        });
    });
    
    // Color schemes
    const colorSchemes = modal.querySelectorAll('.color-scheme');
    let selectedScheme = null;
    
    colorSchemes.forEach(scheme => {
        scheme.addEventListener('click', () => {
            // Update selection
            colorSchemes.forEach(s => s.style.border = '1px solid #e5e7eb');
            scheme.style.border = '2px solid #3B82F6';
            selectedScheme = scheme.dataset.scheme;
        });
    });
    
    // Apply scheme button
    const applySchemeButton = modal.querySelector('.apply-scheme');
    applySchemeButton.addEventListener('click', () => {
        if (!selectedScheme) {
            // Show error toast
            showToast('info', 'Please select a color scheme first');
            return;
        }
        
        // Get scheme colors based on selection
        let colors = {
            textColor: '#000000',
            backgroundColor: '#FFFFFF',
            accentColor: '#3B82F6',
            secondaryColor: '#F3F4F6'
        };
        
        switch (selectedScheme) {
            case 'minimal':
                colors = {
                    textColor: '#000000',
                    backgroundColor: '#FFFFFF',
                    accentColor: '#DEE2E6',
                    secondaryColor: '#F8F9FA'
                };
                break;
            case 'professional':
                colors = {
                    textColor: '#1E3A8A',
                    backgroundColor: '#FFFFFF',
                    accentColor: '#3B82F6',
                    secondaryColor: '#F3F4F6'
                };
                break;
            case 'vibrant':
                colors = {
                    textColor: '#7C3AED',
                    backgroundColor: '#FFFBEB',
                    accentColor: '#EC4899',
                    secondaryColor: '#F9FAFB'
                };
                break;
            case 'calm':
                colors = {
                    textColor: '#065F46',
                    backgroundColor: '#FFFFFF',
                    accentColor: '#10B981',
                    secondaryColor: '#ECFDF5'
                };
                break;
        }
        
        // Apply scheme to template (need selected elements)
        const range = quillEditor.getSelection();
        if (range) {
            // If no text is selected, apply to the whole document
            if (range.length === 0) {
                // Wrap content in a div with background color
                const content = quillEditor.root.innerHTML;
                quillEditor.root.innerHTML = `
                    <div style="background-color: ${colors.backgroundColor}; color: ${colors.textColor}; padding: 15px;">
                        ${content}
                    </div>
                `;
                
                // Add a styled heading at the top as an example
                quillEditor.insertText(0, 'Email with ' + selectedScheme + ' Style', {
                    'color': colors.accentColor,
                    'size': 'large',
                    'bold': true
                });
                
                // Add a footer div with accent color
                quillEditor.insertEmbed(quillEditor.getLength(), 'divider', true);
                quillEditor.insertText(quillEditor.getLength(), '\n\n', { 'background': colors.secondaryColor });
                quillEditor.insertText(quillEditor.getLength(), 'This email was styled with the ' + selectedScheme + ' color scheme', {
                    'color': colors.textColor,
                    'italic': true,
                    'background': colors.secondaryColor
                });
            }
            
            // Show success toast
            showToast('success', `Applied "${selectedScheme}" color scheme`);
        }
        
        // Close the modal
        modal.style.display = 'none';
    });
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
        
        // Store the template ID for customize feature and test email feature
        document.getElementById('previewTemplateId').value = templateId;
        document.getElementById('testEmailTemplateId').value = templateId;
        
        // Fetch the preview - ensure we're sending an empty object instead of null
        const previewData = customData || {}; 
        const response = await apiPost(`/api/template/${templateId}/preview`, previewData);
        
        if (response.preview) {
            // Setup device mockup preview
            setupDeviceMockupPreview(response);
            
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
 * Show the send test email modal
 */
function showSendTestEmailModal() {
    // Hide any previous success/error messages
    document.getElementById('testEmailLoading').style.display = 'none';
    document.getElementById('testEmailSuccess').style.display = 'none';
    document.getElementById('testEmailError').style.display = 'none';
    
    // Reset the form
    document.getElementById('sendTestEmailForm').reset();
    
    // Get the current user's email
    const user = getCurrentUser();
    if (user && user.email) {
        document.getElementById('testEmailRecipient').value = user.email;
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('sendTestEmailModal'));
    modal.show();
}

/**
 * Send a test email
 */
async function sendTestEmail() {
    try {
        // Get form data
        const templateId = document.getElementById('testEmailTemplateId').value;
        const recipientEmail = document.getElementById('testEmailRecipient').value;
        
        // Validate
        if (!templateId) {
            throw new Error('Template ID is missing');
        }
        
        if (!recipientEmail || !validateEmail(recipientEmail)) {
            throw new Error('Please enter a valid email address');
        }
        
        // Show loading
        document.getElementById('testEmailLoading').style.display = 'block';
        document.getElementById('testEmailSuccess').style.display = 'none';
        document.getElementById('testEmailError').style.display = 'none';
        
        // Disable submit button
        const submitBtn = document.getElementById('sendTestEmailSubmitBtn');
        submitBtn.disabled = true;
        
        // Send the request
        const response = await apiPost(`/api/template/${templateId}/send-test`, {
            recipientEmail: recipientEmail
        });
        
        // Show success or error
        if (response.success) {
            // Create success message with provider info
            let successMessage = response.message || 'Test email sent successfully!';
            
            // Add provider badge if available
            const providerBadge = response.provider ? 
                `<span class="badge ${response.provider === 'sendgrid' ? 'bg-success' : 'bg-primary'} ms-2">
                    ${response.provider === 'sendgrid' ? 'SendGrid' : 'Ethereal'}
                </span>` : '';
            
            document.getElementById('testEmailSuccessMessage').innerHTML = successMessage + providerBadge;
            
            // Set preview link if available
            if (response.previewUrl) {
                const previewLink = document.getElementById('testEmailPreviewLink');
                previewLink.href = response.previewUrl;
                previewLink.parentElement.style.display = 'block';
            } else {
                document.getElementById('testEmailPreviewLink').parentElement.style.display = 'none';
            }
            
            document.getElementById('testEmailSuccess').style.display = 'block';
            showToast('success', 'Test email sent successfully');
        } else {
            throw new Error(response.message || 'Failed to send test email');
        }
    } catch (error) {
        console.error('Error sending test email:', error);
        document.getElementById('testEmailErrorMessage').textContent = error.message || 'Failed to send test email';
        document.getElementById('testEmailError').style.display = 'block';
        showToast('error', 'Failed to send test email');
    } finally {
        // Hide loading
        document.getElementById('testEmailLoading').style.display = 'none';
        
        // Re-enable submit button
        document.getElementById('sendTestEmailSubmitBtn').disabled = false;
    }
}

/**
 * Setup device mockup preview with animations
 * @param {Object} previewData - Template preview data
 */
function setupDeviceMockupPreview(previewData) {
    const previewContainer = document.getElementById('templatePreviewContent');
    
    // Clear previous content
    previewContainer.innerHTML = '';
    
    // Create device mockup container
    const deviceMockupContainer = document.createElement('div');
    deviceMockupContainer.className = 'device-mockup-container';
    deviceMockupContainer.innerHTML = `
        <div class="device-selection mb-3">
            <div class="btn-group" role="group">
                <button type="button" class="btn btn-outline-primary active" data-device="mobile">
                    <i class="fas fa-mobile-alt me-1"></i> Mobile
                </button>
                <button type="button" class="btn btn-outline-primary" data-device="tablet">
                    <i class="fas fa-tablet-alt me-1"></i> Tablet
                </button>
                <button type="button" class="btn btn-outline-primary" data-device="desktop">
                    <i class="fas fa-desktop me-1"></i> Desktop
                </button>
            </div>
        </div>
        
        <div class="mockup-wrapper">
            <!-- Mobile Device Mockup -->
            <div class="device-mockup mobile active">
                <div class="device-frame">
                    <div class="device-screen">
                        ${previewData.preview}
                    </div>
                </div>
                <div class="device-stripe"></div>
                <div class="device-header"></div>
                <div class="device-sensors"></div>
                <div class="device-btns"></div>
                <div class="device-power"></div>
            </div>
            
            <!-- Tablet Device Mockup -->
            <div class="device-mockup tablet">
                <div class="device-frame">
                    <div class="device-screen">
                        ${previewData.preview}
                    </div>
                </div>
                <div class="device-stripe"></div>
                <div class="device-header"></div>
                <div class="device-sensors"></div>
                <div class="device-btns"></div>
                <div class="device-power"></div>
            </div>
            
            <!-- Desktop Device Mockup -->
            <div class="device-mockup desktop">
                <div class="device-frame">
                    <div class="device-screen">
                        ${previewData.preview}
                    </div>
                </div>
                <div class="device-stripe"></div>
                <div class="device-header"></div>
                <div class="device-sensors"></div>
                <div class="device-btns"></div>
                <div class="device-power"></div>
            </div>
        </div>
    `;
    
    previewContainer.appendChild(deviceMockupContainer);
    
    // Add styles for device mockups
    const styleId = 'device-mockup-styles';
    if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .device-mockup-container {
                text-align: center;
            }
            
            .mockup-wrapper {
                position: relative;
                margin: 0 auto;
                max-width: 100%;
                transition: all 0.5s ease;
            }
            
            .device-mockup {
                position: relative;
                width: 100%;
                display: none;
                margin: 0 auto;
                transition: transform 0.5s ease;
                transform-origin: center center;
                animation: device-appear 0.5s ease-out forwards;
            }
            
            .device-mockup.active {
                display: block;
            }
            
            @keyframes device-appear {
                0% { opacity: 0; transform: translateY(20px) scale(0.95); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            
            .device-frame {
                position: relative;
                background: #111;
                border-radius: 32px;
                box-shadow: 0 0 0 2px #dedede;
                padding: 10px 6px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            }
            
            .device-screen {
                overflow-y: auto;
                max-height: 600px;
                border-radius: 18px;
                background: white;
                padding: 5px;
            }
            
            /* Mobile specific styles */
            .device-mockup.mobile {
                max-width: 360px;
            }
            
            .device-mockup.mobile .device-frame {
                padding: 10px 8px;
            }
            
            .device-mockup.mobile .device-sensors {
                position: absolute;
                top: 18px;
                left: 50%;
                transform: translateX(-50%);
                width: 50px;
                height: 5px;
                background: #333;
                border-radius: 5px;
            }
            
            /* Tablet specific styles */
            .device-mockup.tablet {
                max-width: 580px;
            }
            
            .device-mockup.tablet .device-frame {
                padding: 20px 15px;
            }
            
            .device-mockup.tablet .device-sensors {
                position: absolute;
                top: 30px;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 6px;
                background: #333;
                border-radius: 6px;
            }
            
            /* Desktop specific styles */
            .device-mockup.desktop {
                max-width: 800px;
            }
            
            .device-mockup.desktop .device-frame {
                border-radius: 10px 10px 0 0;
                padding: 20px 20px 0 20px;
            }
            
            .device-mockup.desktop .device-sensors {
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 10px;
                height: 10px;
                background: #555;
                border-radius: 50%;
            }
            
            .device-mockup.desktop:after {
                content: '';
                position: absolute;
                bottom: -20px;
                left: 50%;
                transform: translateX(-50%);
                width: 200px;
                height: 20px;
                background: linear-gradient(to bottom, #aaa, #888);
                border-radius: 0 0 10px 10px;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Add event listeners for device selection
    const deviceButtons = document.querySelectorAll('.device-selection .btn');
    deviceButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            deviceButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update active device with animation
            const deviceType = button.dataset.device;
            const devices = document.querySelectorAll('.device-mockup');
            
            devices.forEach(device => {
                if (device.classList.contains(deviceType)) {
                    device.style.animation = 'device-appear 0.5s ease-out forwards';
                    device.classList.add('active');
                } else {
                    device.classList.remove('active');
                }
            });
        });
    });
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
            
            // Check if quota is exceeded
            if (result.code === 'OPENAI_QUOTA_EXCEEDED') {
                showAiQuotaExceededError('subject line optimization');
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
                
                // Check if quota is exceeded
                if (result.code === 'OPENAI_QUOTA_EXCEEDED') {
                    showAiQuotaExceededError('subject line optimization');
                    
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
            
            // Check if quota is exceeded
            if (analysis.code === 'OPENAI_QUOTA_EXCEEDED') {
                showAiQuotaExceededError('content analysis');
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
                
                // Check if quota is exceeded
                if (analysis.code === 'OPENAI_QUOTA_EXCEEDED') {
                    showAiQuotaExceededError('content analysis');
                    
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
 * Show an error message about OpenAI API quota being exceeded
 * @param {string} feature - The feature that requires the API
 */
function showAiQuotaExceededError(feature) {
    document.getElementById('aiAnalysisLoading').style.display = 'none';
    document.getElementById('aiAnalysisError').style.display = 'block';
    document.getElementById('aiAnalysisErrorText').innerHTML = `
        <div class="text-center mb-3">
            <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
            <h5>OpenAI API Quota Exceeded</h5>
            <p>You've reached the rate limit for your OpenAI API key. This is common with free tier accounts.</p>
        </div>
        <div class="alert alert-warning">
            <small>
                <i class="fas fa-info-circle me-1"></i>
                To resolve this issue:
                <ul class="mt-2">
                    <li>Wait a few minutes and try again</li>
                    <li>Check your <a href="https://platform.openai.com/account/usage" target="_blank">OpenAI usage limits</a></li>
                    <li>Consider upgrading your OpenAI plan for higher quota limits</li>
                </ul>
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
