// Lists management functionality

document.addEventListener('DOMContentLoaded', () => {
    // Protect this route
    protectRoute();
    
    // Initialize lists page
    initListsPage();
    
    // Event listener for drag and drop
    const dropArea = document.querySelector('.drag-drop-area');
    if (dropArea) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });
        
        // Handle dropped files
        dropArea.addEventListener('drop', handleDrop, false);
        
        // Handle file input change
        const fileInput = document.getElementById('csvFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', handleFiles, false);
        }
        
        // Handle click on drop area to trigger file input
        dropArea.addEventListener('click', () => {
            fileInput.click();
        });
    }
    
    // Event listener for create list form
    const createListForm = document.getElementById('createListForm');
    if (createListForm) {
        createListForm.addEventListener('submit', createList);
    }
});

/**
 * Initialize lists page
 */
async function initListsPage() {
    try {
        // Load existing lists
        await loadLists();
    } catch (error) {
        console.error('Error initializing lists page:', error);
        showToast('error', 'Failed to load email lists');
    }
}

/**
 * Load email lists from server
 */
async function loadLists() {
    try {
        const lists = await apiGet('/api/list');
        
        const listsContainer = document.getElementById('emailListsContainer');
        
        if (!listsContainer) return;
        
        listsContainer.innerHTML = '';
        
        if (lists.length === 0) {
            listsContainer.innerHTML = `
                <div class="alert alert-info">
                    You don't have any email lists yet. Create one by importing a CSV file or adding subscribers manually.
                </div>
            `;
            return;
        }
        
        // Create a table to display the lists
        const table = document.createElement('table');
        table.className = 'table table-hover email-list-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Subscribers</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        lists.forEach(list => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <a href="#" class="list-name fw-bold" data-id="${list._id}">${list.name}</a>
                </td>
                <td>${list.subscriberCount}</td>
                <td>${formatDate(list.createdAt)}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-outline-primary view-list-btn" data-id="${list._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-list-btn" data-id="${list._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
            
            // Add event listeners for action buttons
            row.querySelector('.view-list-btn').addEventListener('click', (e) => {
                e.preventDefault();
                viewList(list._id);
            });
            
            row.querySelector('.delete-list-btn').addEventListener('click', (e) => {
                e.preventDefault();
                confirmDeleteList(list._id, list.name);
            });
            
            row.querySelector('.list-name').addEventListener('click', (e) => {
                e.preventDefault();
                viewList(list._id);
            });
        });
        
        listsContainer.appendChild(table);
    } catch (error) {
        console.error('Error loading lists:', error);
        throw error;
    }
}

/**
 * Create a new list
 * @param {Event} e - Submit event
 */
async function createList(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('listName');
    const name = nameInput.value.trim();
    
    if (!name) {
        showToast('error', 'Please enter a list name');
        return;
    }
    
    try {
        const response = await apiPost('/api/list', { name });
        
        if (response._id) {
            showToast('success', 'List created successfully');
            nameInput.value = '';
            await loadLists();
        } else {
            showToast('error', response.message || 'Failed to create list');
        }
    } catch (error) {
        console.error('Error creating list:', error);
        showToast('error', error.message || 'Failed to create list');
    }
}

/**
 * View list details
 * @param {string} listId - List ID
 */
async function viewList(listId) {
    try {
        const list = await apiGet(`/api/list/${listId}`);
        
        // Create a modal to display list details
        const modalContent = `
            <div class="modal fade" id="viewListModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${list.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <div class="d-flex justify-content-between mb-2">
                                    <h6>Subscribers (${list.subscribers.length})</h6>
                                    <button class="btn btn-sm btn-outline-primary" id="addSubscriberBtn">
                                        <i class="fas fa-plus"></i> Add Subscriber
                                    </button>
                                </div>
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>Email</th>
                                                <th>Added On</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody id="subscribersTableBody">
                                            ${list.subscribers.length === 0 ? 
                                                '<tr><td colspan="3" class="text-center">No subscribers yet</td></tr>' : 
                                                list.subscribers.map(sub => `
                                                    <tr>
                                                        <td>${sub.email}</td>
                                                        <td>${formatDate(sub.addedAt)}</td>
                                                        <td>
                                                            <button class="btn btn-sm btn-outline-danger remove-subscriber-btn" 
                                                                data-email="${sub.email}" data-list-id="${listId}">
                                                                <i class="fas fa-times"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                `).join('')
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append modal to body
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // Initialize the modal
        const modal = new bootstrap.Modal(document.getElementById('viewListModal'));
        modal.show();
        
        // Clean up modal when hidden
        document.getElementById('viewListModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
        
        // Add event listener for add subscriber button
        document.getElementById('addSubscriberBtn').addEventListener('click', () => {
            showAddSubscriberForm(listId);
        });
        
        // Add event listeners for remove subscriber buttons
        const removeButtons = document.querySelectorAll('.remove-subscriber-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const email = e.currentTarget.getAttribute('data-email');
                const listId = e.currentTarget.getAttribute('data-list-id');
                
                if (confirm(`Are you sure you want to remove ${email} from this list?`)) {
                    try {
                        await apiDelete(`/api/list/${listId}/subscriber/${encodeURIComponent(email)}`);
                        
                        showToast('success', 'Subscriber removed successfully');
                        
                        // Remove the row from the table
                        e.currentTarget.closest('tr').remove();
                        
                        // Update the subscriber count
                        const modalTitle = document.querySelector('.modal-title');
                        const subscriberCount = document.querySelectorAll('#subscribersTableBody tr').length;
                        document.querySelector('h6').textContent = `Subscribers (${subscriberCount})`;
                        
                        // Reload lists to update counts
                        await loadLists();
                    } catch (error) {
                        console.error('Error removing subscriber:', error);
                        showToast('error', 'Failed to remove subscriber');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error viewing list:', error);
        showToast('error', 'Failed to load list details');
    }
}

/**
 * Show form to add a subscriber
 * @param {string} listId - List ID
 */
function showAddSubscriberForm(listId) {
    const formContent = `
        <div class="modal fade" id="addSubscriberModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Add Subscriber</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="addSubscriberForm">
                            <div class="mb-3">
                                <label for="subscriberEmail" class="form-label">Email Address</label>
                                <input type="email" class="form-control" id="subscriberEmail" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="submitAddSubscriber">Add</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Append modal to body
    document.body.insertAdjacentHTML('beforeend', formContent);
    
    // Initialize the modal
    const modal = new bootstrap.Modal(document.getElementById('addSubscriberModal'));
    modal.show();
    
    // Clean up modal when hidden
    document.getElementById('addSubscriberModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
    
    // Add event listener for form submission
    document.getElementById('submitAddSubscriber').addEventListener('click', async () => {
        const emailInput = document.getElementById('subscriberEmail');
        const email = emailInput.value.trim();
        
        if (!email) {
            showToast('error', 'Please enter an email address');
            return;
        }
        
        try {
            const response = await apiPost(`/api/list/${listId}/subscriber`, { email });
            
            if (response.success) {
                showToast('success', 'Subscriber added successfully');
                modal.hide();
                
                // Refresh the list view
                viewList(listId);
                
                // Reload lists to update counts
                await loadLists();
            } else {
                showToast('error', response.message || 'Failed to add subscriber');
            }
        } catch (error) {
            console.error('Error adding subscriber:', error);
            showToast('error', error.message || 'Failed to add subscriber');
        }
    });
}

/**
 * Confirm and delete a list
 * @param {string} listId - List ID
 * @param {string} listName - List name
 */
function confirmDeleteList(listId, listName) {
    if (confirm(`Are you sure you want to delete the list "${listName}"? This cannot be undone.`)) {
        deleteList(listId);
    }
}

/**
 * Delete a list
 * @param {string} listId - List ID
 */
async function deleteList(listId) {
    try {
        const response = await apiDelete(`/api/list/${listId}`);
        
        if (response.success) {
            showToast('success', 'List deleted successfully');
            await loadLists();
        } else {
            showToast('error', response.message || 'Failed to delete list');
        }
    } catch (error) {
        console.error('Error deleting list:', error);
        showToast('error', error.message || 'Failed to delete list');
    }
}

/**
 * Process CSV file and import subscribers
 * @param {File} file - CSV file
 */
async function processCSV(file) {
    try {
        // Show loading indicator
        const uploadStatus = document.getElementById('uploadStatus');
        uploadStatus.textContent = 'Processing file...';
        uploadStatus.className = 'alert alert-info';
        
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        
        // Get list ID if a list was selected
        const listSelect = document.getElementById('listSelect');
        if (listSelect && listSelect.value) {
            formData.append('listId', listSelect.value);
        }
        
        // Upload the file
        const response = await fetch('/api/list/import', {
            method: 'POST',
            headers: {
                'x-auth-token': getAuthToken()
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            uploadStatus.textContent = `Import successful! ${result.importedCount} emails imported.`;
            uploadStatus.className = 'alert alert-success';
            
            // Reload lists
            await loadLists();
        } else {
            uploadStatus.textContent = result.message || 'Import failed.';
            uploadStatus.className = 'alert alert-danger';
        }
    } catch (error) {
        console.error('Error processing CSV:', error);
        const uploadStatus = document.getElementById('uploadStatus');
        uploadStatus.textContent = error.message || 'Error processing file.';
        uploadStatus.className = 'alert alert-danger';
    }
}

// Drag and drop utilities
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    e.currentTarget.classList.add('active');
}

function unhighlight(e) {
    e.currentTarget.classList.remove('active');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    handleFiles(files);
}

function handleFiles(files) {
    if (files instanceof FileList) {
        if (files[0]) {
            validateAndProcessFile(files[0]);
        }
    } else if (files.target && files.target.files) {
        if (files.target.files[0]) {
            validateAndProcessFile(files.target.files[0]);
        }
    }
}

function validateAndProcessFile(file) {
    // Check if file is CSV
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        showToast('error', 'Please upload a CSV file');
        return;
    }
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showToast('error', 'File size exceeds 2MB limit');
        return;
    }
    
    // Process the file
    processCSV(file);
}
