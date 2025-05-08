// Lists management functionality

document.addEventListener('DOMContentLoaded', () => {
    // Protect this route
    protectRoute();
    
    // Initialize lists page
    initListsPage();
    
    // Event listener for segmentation button
    const segmentationBtn = document.getElementById('segmentationBtn');
    if (segmentationBtn) {
        segmentationBtn.addEventListener('click', openSegmentationModal);
    }
    
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
    
    // Event listeners for new UI elements
    const createNewListBtn = document.getElementById('createNewListBtn');
    if (createNewListBtn) {
        createNewListBtn.addEventListener('click', showCreateListForm);
    }
    
    const backToListsBtn = document.getElementById('backToListsBtn');
    if (backToListsBtn) {
        backToListsBtn.addEventListener('click', hideCreateListForm);
    }
    
    const cancelCreateListBtn = document.getElementById('cancelCreateListBtn');
    if (cancelCreateListBtn) {
        cancelCreateListBtn.addEventListener('click', hideCreateListForm);
    }
    
    const toggleDetailsBtn = document.getElementById('toggleDetailsBtn');
    if (toggleDetailsBtn) {
        toggleDetailsBtn.addEventListener('click', toggleListDetails);
    }
    
    const applyActionBtn = document.getElementById('applyActionBtn');
    if (applyActionBtn) {
        applyActionBtn.addEventListener('click', applySelectedAction);
    }
    
    const listSearchInput = document.getElementById('listSearchInput');
    if (listSearchInput) {
        listSearchInput.addEventListener('input', filterLists);
    }
});

/**
 * Initialize lists page
 */
async function initListsPage() {
    try {
        // Load existing lists
        await loadLists();
        
        // Set up manual email import form
        const manualImportForm = document.getElementById('manualImportForm');
        if (manualImportForm) {
            manualImportForm.addEventListener('submit', handleManualImport);
        }
        
        // Set up segmentation modal events
        const addRuleBtn = document.getElementById('addRuleBtn');
        if (addRuleBtn) {
            addRuleBtn.addEventListener('click', addSegmentationRule);
        }
        
        // Add event listener for the create segment button
        const createSegmentBtn = document.getElementById('createSegmentBtn');
        if (createSegmentBtn) {
            createSegmentBtn.addEventListener('click', createSegment);
        }
        
        // Add event listener for source list selection
        const sourceListSelect = document.getElementById('sourceListSelect');
        if (sourceListSelect) {
            sourceListSelect.addEventListener('change', updateSourceListStats);
        }
        
        // Set up initial remove rule event listeners
        setupRemoveRuleBtns();
        
        // Add event listener for rule field changes
        document.addEventListener('change', handleSegmentationFieldChange);
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
        
        // Update the lists dropdown for import
        const listSelect = document.getElementById('listSelect');
        if (listSelect) {
            // Clear all options except the first one
            while (listSelect.options.length > 1) {
                listSelect.remove(1);
            }
            
            // Add new options
            lists.forEach(list => {
                const option = document.createElement('option');
                option.value = list._id;
                option.textContent = list.name;
                listSelect.appendChild(option);
            });
        }
        
        // Update source list dropdown for segmentation
        const sourceListSelect = document.getElementById('sourceListSelect');
        if (sourceListSelect) {
            // Clear all options except the first one
            while (sourceListSelect.options.length > 1) {
                sourceListSelect.remove(1);
            }
            
            // Add new options
            lists.forEach(list => {
                const option = document.createElement('option');
                option.value = list._id;
                option.textContent = list.name;
                sourceListSelect.appendChild(option);
            });
        }
        
        const listsContainer = document.getElementById('emailListsContainer');
        
        if (!listsContainer) return;
        
        listsContainer.innerHTML = '';
        
        if (lists.length === 0) {
            listsContainer.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    You don't have any email lists yet. Click the "Create New List" button to get started.
                </div>
                <div class="text-center py-4">
                    <img src="https://cdn.jsdelivr.net/npm/@tabler/icons@2.0.0/icons/mail-forward.svg" 
                         alt="Empty state" class="mb-3" style="width: 80px; height: 80px; opacity: 0.5;">
                    <p class="text-muted">Your lists will appear here once created</p>
                    <button id="emptyStateCreateBtn" class="btn btn-primary mt-2">
                        <i class="fas fa-plus me-2"></i> Create Your First List
                    </button>
                </div>
            `;
            
            // Add event listener for the empty state create button
            const emptyStateCreateBtn = document.getElementById('emptyStateCreateBtn');
            if (emptyStateCreateBtn) {
                emptyStateCreateBtn.addEventListener('click', showCreateListForm);
            }
            
            return;
        }
        
        // Create a table to display the lists
        const table = document.createElement('table');
        table.className = 'table table-hover email-list-table';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th width="40">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="selectAllLists">
                        </div>
                    </th>
                    <th>Name</th>
                    <th width="100">Subscribers</th>
                    <th width="120">Created</th>
                    <th width="120">Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        lists.forEach(list => {
            const row = document.createElement('tr');
            row.setAttribute('data-list-id', list._id);
            
            row.innerHTML = `
                <td>
                    <div class="form-check">
                        <input class="form-check-input list-checkbox" type="checkbox" data-id="${list._id}">
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <a href="#" class="list-name fw-bold" data-id="${list._id}">${list.name}</a>
                        ${list.subtitle ? `<span class="badge bg-light text-dark ms-2">${list.subtitle}</span>` : ''}
                    </div>
                    ${list.description ? `<div class="small text-muted list-description">${truncateString(list.description, 60)}</div>` : ''}
                </td>
                <td>
                    <span class="badge bg-primary rounded-pill">${list.subscriberCount || 0}</span>
                </td>
                <td>${formatDate(list.createdAt)}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-outline-primary view-list-btn" data-id="${list._id}" title="View List Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success edit-list-btn" data-id="${list._id}" title="Edit List">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-list-btn" data-id="${list._id}" title="Delete List">
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
            
            row.querySelector('.edit-list-btn').addEventListener('click', (e) => {
                e.preventDefault();
                editList(list._id);
            });
            
            row.querySelector('.delete-list-btn').addEventListener('click', (e) => {
                e.preventDefault();
                confirmDeleteList(list._id, list.name);
            });
            
            row.querySelector('.list-name').addEventListener('click', (e) => {
                e.preventDefault();
                viewList(list._id);
            });
            
            // Add event listener for checkbox
            const checkbox = row.querySelector('.list-checkbox');
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    row.classList.add('selected');
                    updateSelectedListInfo();
                } else {
                    row.classList.remove('selected');
                    updateSelectedListInfo();
                }
            });
            
            // Add event listener for clicking on row to select
            row.addEventListener('click', (e) => {
                // Only toggle if not clicking on a button or link
                if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.form-check')) {
                    const checkbox = row.querySelector('.list-checkbox');
                    checkbox.checked = !checkbox.checked;
                    
                    if (checkbox.checked) {
                        row.classList.add('selected');
                    } else {
                        row.classList.remove('selected');
                    }
                    
                    updateSelectedListInfo();
                }
            });
        });
        
        listsContainer.appendChild(table);
        
        // Add event listener for select all checkbox
        const selectAllCheckbox = document.getElementById('selectAllLists');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll('.list-checkbox');
                const rows = document.querySelectorAll('.email-list-table tbody tr');
                
                checkboxes.forEach((checkbox, index) => {
                    checkbox.checked = selectAllCheckbox.checked;
                    
                    if (selectAllCheckbox.checked) {
                        rows[index].classList.add('selected');
                    } else {
                        rows[index].classList.remove('selected');
                    }
                });
                
                updateSelectedListInfo();
            });
        }
        
    } catch (error) {
        console.error('Error loading lists:', error);
        throw error;
    }
}

/**
 * Update selected list info display
 */
function updateSelectedListInfo() {
    const selectedRows = document.querySelectorAll('.email-list-table tbody tr.selected');
    const selectedListInfo = document.getElementById('selectedListInfo');
    
    if (selectedRows.length > 0) {
        selectedListInfo.classList.remove('d-none');
        
        if (selectedRows.length === 1) {
            const listName = selectedRows[0].querySelector('.list-name').textContent;
            selectedListInfo.querySelector('.selected-list-name').textContent = listName;
        } else {
            selectedListInfo.querySelector('.selected-list-name').textContent = `${selectedRows.length} lists selected`;
        }
    } else {
        selectedListInfo.classList.add('d-none');
    }
}

/**
 * Edit a list
 * @param {string} listId - List ID to edit
 */
async function editList(listId) {
    try {
        const list = await apiGet(`/api/list/${listId}`);
        
        // Show the create list form (reusing it for edit)
        showCreateListForm();
        
        // Update form title
        const formTitle = document.querySelector('#createListFormView .card-header h5');
        formTitle.textContent = 'Edit List';
        
        // Populate form fields
        document.getElementById('listName').value = list.name || '';
        document.getElementById('listSubtitle').value = list.subtitle || '';
        document.getElementById('listDescription').value = list.description || '';
        
        if (list.senderInfo) {
            document.getElementById('senderName').value = list.senderInfo.name || '';
            document.getElementById('senderEmail').value = list.senderInfo.email || '';
            document.getElementById('replyToEmail').value = list.senderInfo.replyTo || '';
        }
        
        if (list.companyInfo) {
            document.getElementById('companyName').value = list.companyInfo.name || '';
            document.getElementById('companyPhone').value = list.companyInfo.phone || '';
            document.getElementById('companyAddress').value = list.companyInfo.address || '';
        }
        
        // Update form submit behavior
        const form = document.getElementById('createListForm');
        
        // Remove existing submit handler
        const oldHandler = form.onsubmit;
        form.onsubmit = null;
        
        // Add new submit handler for update
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameInput = document.getElementById('listName');
            const name = nameInput.value.trim();
            
            if (!name) {
                showToast('error', 'Please enter a list name');
                return;
            }
            
            // Gather all form data
            const listData = {
                name: name,
                subtitle: document.getElementById('listSubtitle').value.trim(),
                description: document.getElementById('listDescription').value.trim(),
                senderInfo: {
                    name: document.getElementById('senderName').value.trim(),
                    email: document.getElementById('senderEmail').value.trim(),
                    replyTo: document.getElementById('replyToEmail').value.trim()
                },
                companyInfo: {
                    name: document.getElementById('companyName').value.trim(),
                    phone: document.getElementById('companyPhone').value.trim(),
                    address: document.getElementById('companyAddress').value.trim()
                }
            };
            
            try {
                const response = await apiPut(`/api/list/${listId}`, listData);
                
                if (response.success) {
                    showToast('success', 'List updated successfully');
                    
                    // Reset form and go back to list view
                    document.getElementById('createListForm').reset();
                    hideCreateListForm();
                    
                    // Reload the lists
                    await loadLists();
                    
                    // Restore original form behavior
                    form.onsubmit = oldHandler;
                } else {
                    showToast('error', response.message || 'Failed to update list');
                }
            } catch (error) {
                console.error('Error updating list:', error);
                showToast('error', error.message || 'Failed to update list');
            }
        }, { once: true });
        
    } catch (error) {
        console.error('Error editing list:', error);
        showToast('error', 'Failed to load list details for editing');
    }
}

/**
 * Show the create list form
 */
function showCreateListForm() {
    // Hide the main view and show the form view
    document.getElementById('listsMainView').classList.add('d-none');
    document.getElementById('createListFormView').classList.remove('d-none');
    
    // Clear form fields
    document.getElementById('createListForm').reset();
    
    // Focus on the list name field
    document.getElementById('listName').focus();
}

/**
 * Hide the create list form
 */
function hideCreateListForm() {
    // Show the main view and hide the form view
    document.getElementById('listsMainView').classList.remove('d-none');
    document.getElementById('createListFormView').classList.add('d-none');
}

/**
 * Toggle list details in the table
 */
function toggleListDetails() {
    const table = document.querySelector('.email-list-table');
    
    if (table) {
        table.classList.toggle('show-details');
        
        // Update button text
        const button = document.getElementById('toggleDetailsBtn');
        if (table.classList.contains('show-details')) {
            button.innerHTML = '<i class="fas fa-eye-slash me-2"></i> Hide Details';
            
            // Add additional data cells if they don't exist
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                if (!row.querySelector('.details-row')) {
                    const listId = row.querySelector('[data-id]').getAttribute('data-id');
                    const detailsCell = document.createElement('tr');
                    detailsCell.className = 'details-row';
                    detailsCell.innerHTML = `
                        <td colspan="4">
                            <div class="list-details-container p-3">
                                <div class="spinner-border spinner-border-sm text-primary" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <span class="ms-2">Loading list details...</span>
                            </div>
                        </td>
                    `;
                    
                    // Insert after the current row
                    row.parentNode.insertBefore(detailsCell, row.nextSibling);
                    
                    // Load details asynchronously
                    loadListDetails(listId, detailsCell);
                }
            });
        } else {
            button.innerHTML = '<i class="fas fa-eye me-2"></i> Show Details';
        }
    }
}

/**
 * Load list details for the expanded view
 * @param {string} listId - List ID
 * @param {HTMLElement} detailsRow - The details row element
 */
async function loadListDetails(listId, detailsRow) {
    try {
        const list = await apiGet(`/api/list/${listId}`);
        
        const detailsContainer = detailsRow.querySelector('.list-details-container');
        
        detailsContainer.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="mb-2">List Information</h6>
                    <div class="mb-1"><strong>Created:</strong> ${formatDate(list.createdAt)}</div>
                    <div class="mb-1"><strong>Last Updated:</strong> ${formatDate(list.updatedAt || list.createdAt)}</div>
                    <div class="mb-1"><strong>Subscribers:</strong> ${list.subscriberCount}</div>
                </div>
                <div class="col-md-6">
                    <h6 class="mb-2">Recent Subscribers</h6>
                    <div class="recent-subscribers">
                        ${list.subscribers.length === 0 ? 
                            '<div class="text-muted">No subscribers yet</div>' : 
                            list.subscribers.slice(0, 3).map(sub => `
                                <div class="mb-1">
                                    ${sub.email} <small class="text-muted">(${formatDate(sub.addedAt)})</small>
                                </div>
                            `).join('')
                        }
                        ${list.subscribers.length > 3 ? 
                            `<div class="text-muted small">And ${list.subscribers.length - 3} more...</div>` : ''
                        }
                    </div>
                </div>
            </div>
            <div class="mt-2">
                <button class="btn btn-sm btn-outline-primary view-details-btn" data-id="${listId}">
                    <i class="fas fa-eye me-1"></i> View Full Details
                </button>
            </div>
        `;
        
        // Add event listener for view details button
        detailsContainer.querySelector('.view-details-btn').addEventListener('click', (e) => {
            e.preventDefault();
            viewList(listId);
        });
        
    } catch (error) {
        console.error('Error loading list details:', error);
        
        const detailsContainer = detailsRow.querySelector('.list-details-container');
        detailsContainer.innerHTML = `
            <div class="text-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Failed to load list details
            </div>
        `;
    }
}

/**
 * Apply the selected action to the lists
 */
function applySelectedAction() {
    const actionSelect = document.getElementById('actionSelect');
    const action = actionSelect.value;
    
    if (!action) {
        showToast('error', 'Please select an action');
        return;
    }
    
    const selectedRows = document.querySelectorAll('.email-list-table tbody tr.selected');
    if (selectedRows.length === 0) {
        showToast('error', 'Please select at least one list');
        return;
    }
    
    if (action === 'delete') {
        // Confirm deletion of multiple lists
        if (confirm(`Are you sure you want to delete ${selectedRows.length} list(s)? This cannot be undone.`)) {
            selectedRows.forEach(row => {
                const listId = row.querySelector('[data-id]').getAttribute('data-id');
                deleteList(listId);
            });
        }
    } else if (action === 'view') {
        // View the first selected list
        const listId = selectedRows[0].querySelector('[data-id]').getAttribute('data-id');
        viewList(listId);
    }
}

/**
 * Filter lists based on search input
 */
function filterLists() {
    const searchInput = document.getElementById('listSearchInput');
    const searchTerm = searchInput.value.toLowerCase();
    
    const rows = document.querySelectorAll('.email-list-table tbody tr:not(.details-row)');
    
    rows.forEach(row => {
        const listName = row.querySelector('.list-name').textContent.toLowerCase();
        
        if (listName.includes(searchTerm)) {
            row.style.display = '';
            // If the row has a details row, also show it
            if (row.nextElementSibling && row.nextElementSibling.classList.contains('details-row')) {
                row.nextElementSibling.style.display = row.nextElementSibling.style.display;
            }
        } else {
            row.style.display = 'none';
            // If the row has a details row, also hide it
            if (row.nextElementSibling && row.nextElementSibling.classList.contains('details-row')) {
                row.nextElementSibling.style.display = 'none';
            }
        }
    });
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
    
    // Gather all form data
    const listData = {
        name: name,
        subtitle: document.getElementById('listSubtitle').value.trim(),
        description: document.getElementById('listDescription').value.trim(),
        senderInfo: {
            name: document.getElementById('senderName').value.trim(),
            email: document.getElementById('senderEmail').value.trim(),
            replyTo: document.getElementById('replyToEmail').value.trim()
        },
        companyInfo: {
            name: document.getElementById('companyName').value.trim(),
            phone: document.getElementById('companyPhone').value.trim(),
            address: document.getElementById('companyAddress').value.trim()
        }
    };
    
    try {
        const response = await apiPost('/api/list', listData);
        
        if (response._id) {
            showToast('success', 'List created successfully');
            
            // Reset form and go back to list view
            document.getElementById('createListForm').reset();
            hideCreateListForm();
            
            // Reload the lists
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

/**
 * Handle manual email import
 * @param {Event} e - Form submit event
 */
async function handleManualImport(e) {
    e.preventDefault();
    
    try {
        // Get list ID and manual emails
        const listSelect = document.getElementById('listSelect');
        const manualEmails = document.getElementById('manualEmails');
        const uploadStatus = document.getElementById('uploadStatus');
        
        if (!listSelect || !listSelect.value) {
            uploadStatus.innerHTML = '<div class="alert alert-danger">Please select a list first.</div>';
            return;
        }
        
        const emailText = manualEmails.value.trim();
        if (!emailText) {
            uploadStatus.innerHTML = '<div class="alert alert-danger">Please enter at least one email address.</div>';
            return;
        }
        
        // Parse email addresses (one per line)
        const emails = emailText.split('\n')
            .map(email => email.trim())
            .filter(email => email && validateEmail(email));
        
        if (emails.length === 0) {
            uploadStatus.innerHTML = '<div class="alert alert-danger">No valid email addresses found.</div>';
            return;
        }
        
        // Show loading indicator
        uploadStatus.innerHTML = `
            <div class="progress">
                <div class="progress-bar progress-bar-striped progress-bar-animated" 
                    role="progressbar" aria-valuenow="100" aria-valuemin="0" 
                    aria-valuemax="100" style="width: 100%"></div>
            </div>
            <p class="text-center mt-2">Processing emails...</p>
        `;
        
        // Send data to server
        const response = await apiPost('/api/list/import-manual', {
            listId: listSelect.value,
            emails: emails
        });
        
        uploadStatus.innerHTML = `<div class="alert alert-success">
            Successfully imported ${response.importedCount} email(s).
        </div>`;
        
        // Clear the textarea
        manualEmails.value = '';
        
        // Reload lists to update counts
        await loadLists();
        
    } catch (error) {
        console.error('Error importing emails manually:', error);
        const uploadStatus = document.getElementById('uploadStatus');
        uploadStatus.innerHTML = `<div class="alert alert-danger">
            ${error.message || 'Error importing emails.'}
        </div>`;
    }
}

/**
 * Open the advanced segmentation modal
 */
function openSegmentationModal() {
    // Reset form fields
    document.getElementById('newSegmentName').value = '';
    document.getElementById('sourceListSelect').selectedIndex = 0;
    document.getElementById('matchAllRules').checked = true;
    
    // Reset source list stats
    document.getElementById('sourceListStats').innerHTML = `
        <p class="text-muted">Select a source list to view statistics</p>
    `;
    
    // Reset segmentation preview
    document.getElementById('segmentationPreview').innerHTML = `
        <p class="text-muted">Configure segmentation rules to see a preview</p>
    `;
    
    // Reset segmentation rules
    resetSegmentationRules();
    
    // Show the modal
    const segmentationModal = new bootstrap.Modal(document.getElementById('segmentationModal'));
    segmentationModal.show();
}

/**
 * Reset segmentation rules to initial state
 */
function resetSegmentationRules() {
    const rulesContainer = document.getElementById('segmentationRules');
    
    // Keep only the first rule and reset its values
    const rules = rulesContainer.querySelectorAll('.segmentation-rule');
    
    // Remove all rules except the first one
    for (let i = 1; i < rules.length; i++) {
        rules[i].remove();
    }
    
    // Reset the first rule's values
    if (rules.length > 0) {
        const firstRule = rules[0];
        firstRule.querySelector('.segmentation-field').selectedIndex = 0;
        firstRule.querySelector('.segmentation-operator').selectedIndex = 0;
        firstRule.querySelector('.segmentation-value').value = '';
    }
}

/**
 * Set up event listeners for remove rule buttons
 */
function setupRemoveRuleBtns() {
    document.querySelectorAll('.remove-rule').forEach(btn => {
        btn.addEventListener('click', function() {
            // Don't remove if it's the only rule
            const rules = document.querySelectorAll('.segmentation-rule');
            if (rules.length > 1) {
                this.closest('.segmentation-rule').remove();
                updateSegmentationPreview();
            } else {
                // If it's the last rule, just reset it
                const rule = this.closest('.segmentation-rule');
                rule.querySelector('.segmentation-field').selectedIndex = 0;
                rule.querySelector('.segmentation-operator').selectedIndex = 0;
                rule.querySelector('.segmentation-value').value = '';
                updateSegmentationPreview();
            }
        });
    });
}

/**
 * Add a new segmentation rule
 */
function addSegmentationRule() {
    const rulesContainer = document.getElementById('segmentationRules');
    
    const newRule = document.createElement('div');
    newRule.className = 'segmentation-rule card mb-3';
    
    newRule.innerHTML = `
        <div class="card-body">
            <div class="row align-items-center">
                <div class="col-md-4">
                    <select class="form-select segmentation-field">
                        <option value="" selected disabled>Select field</option>
                        <option value="engagement_score">Engagement Score</option>
                        <option value="open_rate">Open Rate</option>
                        <option value="click_rate">Click Rate</option>
                        <option value="last_opened">Last Opened</option>
                        <option value="subscription_date">Subscription Date</option>
                        <option value="email_domain">Email Domain</option>
                        <option value="custom_field">Custom Field</option>
                    </select>
                </div>
                
                <div class="col-md-3">
                    <select class="form-select segmentation-operator">
                        <option value="" selected disabled>Select operator</option>
                        <option value="equals">Equals</option>
                        <option value="not_equals">Does not equal</option>
                        <option value="greater_than">Greater than</option>
                        <option value="less_than">Less than</option>
                        <option value="contains">Contains</option>
                        <option value="does_not_contain">Does not contain</option>
                        <option value="before">Before</option>
                        <option value="after">After</option>
                    </select>
                </div>
                
                <div class="col-md-4">
                    <input type="text" class="form-control segmentation-value" placeholder="Value">
                </div>
                
                <div class="col-md-1">
                    <button type="button" class="btn btn-outline-danger btn-sm remove-rule">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    rulesContainer.appendChild(newRule);
    
    // Add event listener for the remove button
    newRule.querySelector('.remove-rule').addEventListener('click', function() {
        newRule.remove();
        updateSegmentationPreview();
    });
    
    // Add event listeners for field changes
    newRule.querySelectorAll('select, input').forEach(el => {
        el.addEventListener('change', updateSegmentationPreview);
    });
}

/**
 * Handle field changes in segmentation rules
 * @param {Event} e - Change event
 */
function handleSegmentationFieldChange(e) {
    // Check if the event target is inside a segmentation rule
    const rule = e.target.closest('.segmentation-rule');
    if (rule && (e.target.classList.contains('segmentation-field') || 
                 e.target.classList.contains('segmentation-operator') ||
                 e.target.classList.contains('segmentation-value'))) {
        updateSegmentationPreview();
    }
    
    // Check if the match all checkbox was changed
    if (e.target.id === 'matchAllRules') {
        updateSegmentationPreview();
    }
    
    // Special handling for date fields
    if (rule && e.target.classList.contains('segmentation-field')) {
        const field = e.target.value;
        const valueInput = rule.querySelector('.segmentation-value');
        
        if (field === 'last_opened' || field === 'subscription_date') {
            // Convert to date input
            valueInput.type = 'date';
        } else {
            // Revert to text input
            valueInput.type = 'text';
        }
    }
}

/**
 * Update source list statistics
 */
async function updateSourceListStats() {
    const sourceListSelect = document.getElementById('sourceListSelect');
    const statsContainer = document.getElementById('sourceListStats');
    
    if (!sourceListSelect.value) {
        statsContainer.innerHTML = `
            <p class="text-muted">Select a source list to view statistics</p>
        `;
        return;
    }
    
    statsContainer.innerHTML = `
        <div class="d-flex justify-content-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `;
    
    try {
        const listId = sourceListSelect.value;
        const list = await apiGet(`/api/list/${listId}`);
        
        // Calculate additional stats
        const subscriberCount = list.subscriberCount || 0;
        const activeSubscribers = Math.floor(subscriberCount * 0.85); // Approximate for demo
        const segmentPotential = Math.floor(subscriberCount * 0.62); // Approximate for demo
        
        statsContainer.innerHTML = `
            <div class="list-stats">
                <div class="row text-center">
                    <div class="col-md-4 mb-2">
                        <h3 class="mb-0">${subscriberCount}</h3>
                        <small class="text-muted">Subscribers</small>
                    </div>
                    <div class="col-md-4 mb-2">
                        <h3 class="mb-0">${activeSubscribers}</h3>
                        <small class="text-muted">Active</small>
                    </div>
                    <div class="col-md-4 mb-2">
                        <h3 class="mb-0">${segmentPotential}</h3>
                        <small class="text-muted">Potential</small>
                    </div>
                </div>
                
                <div class="mt-3">
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-success" 
                             role="progressbar" 
                             style="width: ${(segmentPotential/subscriberCount)*100}%"></div>
                    </div>
                    <div class="d-flex justify-content-between mt-1">
                        <small class="text-muted">Segment Potential</small>
                        <small>${Math.round((segmentPotential/subscriberCount)*100)}%</small>
                    </div>
                </div>
            </div>
        `;
        
        // Update segmentation preview as well
        updateSegmentationPreview();
        
    } catch (error) {
        console.error('Error loading list stats:', error);
        statsContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Failed to load list statistics
            </div>
        `;
    }
}

/**
 * Update segmentation preview
 */
function updateSegmentationPreview() {
    const previewContainer = document.getElementById('segmentationPreview');
    const sourceListSelect = document.getElementById('sourceListSelect');
    
    // Check if source list is selected
    if (!sourceListSelect.value) {
        previewContainer.innerHTML = `
            <p class="text-muted">Select a source list to see a preview</p>
        `;
        return;
    }
    
    // Get all rules
    const rules = document.querySelectorAll('.segmentation-rule');
    const validRules = [];
    
    // Validate rules
    rules.forEach(rule => {
        const field = rule.querySelector('.segmentation-field').value;
        const operator = rule.querySelector('.segmentation-operator').value;
        const value = rule.querySelector('.segmentation-value').value;
        
        if (field && operator && value) {
            validRules.push({ field, operator, value });
        }
    });
    
    if (validRules.length === 0) {
        previewContainer.innerHTML = `
            <p class="text-muted">Configure at least one complete rule to see a preview</p>
        `;
        return;
    }
    
    // Get the list info
    const listId = sourceListSelect.value;
    const listName = sourceListSelect.options[sourceListSelect.selectedIndex].text;
    
    // Get the AND/OR condition
    const matchAll = document.getElementById('matchAllRules').checked;
    const condition = matchAll ? 'AND' : 'OR';
    
    // Format rules for display
    const formattedRules = validRules.map(rule => {
        const fieldName = rule.field.replace(/_/g, ' ');
        let operatorText = '';
        
        switch (rule.operator) {
            case 'equals': operatorText = 'equals'; break;
            case 'not_equals': operatorText = 'does not equal'; break;
            case 'greater_than': operatorText = 'is greater than'; break;
            case 'less_than': operatorText = 'is less than'; break;
            case 'contains': operatorText = 'contains'; break;
            case 'does_not_contain': operatorText = 'does not contain'; break;
            case 'before': operatorText = 'is before'; break;
            case 'after': operatorText = 'is after'; break;
            default: operatorText = rule.operator;
        }
        
        return `<li><strong>${capitalize(fieldName)}</strong> ${operatorText} <strong>${rule.value}</strong></li>`;
    }).join('');
    
    // Simulate segment data
    const selectedOption = sourceListSelect.options[sourceListSelect.selectedIndex];
    // Use real data if available, or fallback
    const subscriberCount = (selectedOption && selectedOption.dataset && selectedOption.dataset.subscribers) ? 
        parseInt(selectedOption.dataset.subscribers) : 50;
    
    // Estimate segment size based on rules
    let potentialSubscribers = Math.floor(subscriberCount * 0.5); // Start with 50%
    
    // Adjust based on rule types (simple approximation)
    if (validRules.some(r => r.field === 'engagement_score' && r.operator === 'greater_than' && parseInt(r.value) > 7)) {
        potentialSubscribers = Math.floor(potentialSubscribers * 0.7); // Reduce by 30% for high engagement scores
    }
    
    if (validRules.some(r => r.field === 'last_opened' && r.operator === 'after')) {
        potentialSubscribers = Math.floor(potentialSubscribers * 0.8); // Reduce by 20% for recent opens
    }
    
    // Ensure at least 1 subscriber
    potentialSubscribers = Math.max(1, potentialSubscribers);
    
    previewContainer.innerHTML = `
        <div class="text-start">
            <div class="mb-3">
                <h6>Segment Definition</h6>
                <p>Subscribers from <strong>${listName}</strong> where:</p>
                <ul class="mb-3">
                    ${formattedRules}
                </ul>
                <div class="text-muted small">Match type: ${matchAll ? 'All conditions' : 'Any condition'} (${condition})</div>
            </div>
            
            <div class="segment-stats mt-3">
                <div class="d-flex justify-content-between mb-2">
                    <span>Estimated segment size:</span>
                    <span><strong>${potentialSubscribers}</strong> subscribers</span>
                </div>
                <div class="progress" style="height: 6px;">
                    <div class="progress-bar bg-success" 
                         role="progressbar" 
                         style="width: ${(potentialSubscribers/subscriberCount)*100}%"></div>
                </div>
                <small class="text-muted">${Math.round((potentialSubscribers/subscriberCount)*100)}% of subscribers match criteria</small>
            </div>
        </div>
    `;
}

/**
 * Create a new segment from the configured rules
 */
async function createSegment() {
    const sourceListSelect = document.getElementById('sourceListSelect');
    const newSegmentName = document.getElementById('newSegmentName');
    
    // Validate inputs
    if (!sourceListSelect.value) {
        showToast('error', 'Please select a source list');
        return;
    }
    
    if (!newSegmentName.value.trim()) {
        showToast('error', 'Please enter a name for your segment');
        return;
    }
    
    // Get all rules
    const rules = document.querySelectorAll('.segmentation-rule');
    const validRules = [];
    
    // Validate rules
    rules.forEach(rule => {
        const field = rule.querySelector('.segmentation-field').value;
        const operator = rule.querySelector('.segmentation-operator').value;
        const value = rule.querySelector('.segmentation-value').value;
        
        if (field && operator && value) {
            validRules.push({ field, operator, value });
        }
    });
    
    if (validRules.length === 0) {
        showToast('error', 'Please configure at least one segmentation rule');
        return;
    }
    
    const matchAll = document.getElementById('matchAllRules').checked;
    
    // Create segment data
    const segmentData = {
        name: newSegmentName.value.trim(),
        subtitle: 'Segment',
        description: `Generated from advanced segmentation of list "${sourceListSelect.options[sourceListSelect.selectedIndex].text}"`,
        sourceListId: sourceListSelect.value,
        segmentation: {
            rules: validRules,
            matchAll: matchAll
        }
    };
    
    try {
        // Show loading state on the button
        const createBtn = document.getElementById('createSegmentBtn');
        const originalBtnText = createBtn.innerHTML;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creating...';
        createBtn.disabled = true;
        
        // Call API to create segment
        const response = await apiPost('/api/list/segment', segmentData);
        
        // Hide modal
        const segmentationModal = bootstrap.Modal.getInstance(document.getElementById('segmentationModal'));
        segmentationModal.hide();
        
        // Reset create button
        createBtn.innerHTML = originalBtnText;
        createBtn.disabled = false;
        
        // Show success message
        showToast('success', `Segment "${segmentData.name}" created successfully with ${response.subscriberCount} subscribers`);
        
        // Refresh lists
        await loadLists();
        
    } catch (error) {
        console.error('Error creating segment:', error);
        
        // Reset create button
        const createBtn = document.getElementById('createSegmentBtn');
        createBtn.innerHTML = '<i class="fas fa-filter me-2"></i> Create Segment';
        createBtn.disabled = false;
        
        showToast('error', `Failed to create segment: ${error.message}`);
    }
}
