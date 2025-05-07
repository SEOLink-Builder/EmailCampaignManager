// Campaigns management functionality

document.addEventListener('DOMContentLoaded', () => {
    // Protect this route
    protectRoute();
    
    // Initialize campaigns page
    initCampaignsPage();
    
    // Event listener for create campaign form
    const createCampaignForm = document.getElementById('createCampaignForm');
    if (createCampaignForm) {
        createCampaignForm.addEventListener('submit', saveCampaign);
    }
    
    // Check if a template ID was passed in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const templateId = urlParams.get('templateId');
    if (templateId) {
        // Pre-select the template in the dropdown
        loadTemplateIntoForm(templateId);
    }
});

/**
 * Initialize campaigns page
 */
async function initCampaignsPage() {
    try {
        // Load email lists for the dropdown
        await loadListsForDropdown();
        
        // Load email templates for the dropdown
        await loadTemplatesForDropdown();
        
        // Load existing campaigns
        await loadCampaigns();
        
        // Initialize date/time pickers if available
        const scheduleDateInput = document.getElementById('scheduleDate');
        if (scheduleDateInput) {
            // Set min date to today
            const today = new Date().toISOString().split('T')[0];
            scheduleDateInput.min = today;
        }
    } catch (error) {
        console.error('Error initializing campaigns page:', error);
        showToast('error', 'Failed to load campaign data');
    }
}

/**
 * Load email lists for the dropdown
 */
async function loadListsForDropdown() {
    try {
        const lists = await apiGet('/api/list');
        
        const listSelect = document.getElementById('campaignList');
        
        if (!listSelect) return;
        
        // Clear existing options
        listSelect.innerHTML = '<option value="" disabled selected>Select a list</option>';
        
        if (lists.length === 0) {
            listSelect.innerHTML += '<option value="" disabled>No lists available</option>';
            return;
        }
        
        // Add options for each list
        lists.forEach(list => {
            const option = document.createElement('option');
            option.value = list._id;
            option.textContent = `${list.name} (${list.subscriberCount} subscribers)`;
            listSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading lists for dropdown:', error);
        throw error;
    }
}

/**
 * Load email templates for the dropdown
 */
async function loadTemplatesForDropdown() {
    try {
        const templates = await apiGet('/api/template');
        
        const templateSelect = document.getElementById('campaignTemplate');
        
        if (!templateSelect) return;
        
        // Clear existing options
        templateSelect.innerHTML = '<option value="" disabled selected>Select a template</option>';
        
        if (templates.length === 0) {
            templateSelect.innerHTML += '<option value="" disabled>No templates available</option>';
            return;
        }
        
        // Add options for each template
        templates.forEach(template => {
            const option = document.createElement('option');
            option.value = template._id;
            option.textContent = template.name;
            templateSelect.appendChild(option);
        });
        
        // Add event listener for template selection
        templateSelect.addEventListener('change', async () => {
            const selectedId = templateSelect.value;
            if (selectedId) {
                await loadTemplatePreview(selectedId);
            } else {
                document.getElementById('templatePreview').innerHTML = '';
            }
        });
    } catch (error) {
        console.error('Error loading templates for dropdown:', error);
        throw error;
    }
}

/**
 * Load a template preview
 * @param {string} templateId - Template ID
 */
async function loadTemplatePreview(templateId) {
    try {
        const template = await apiGet(`/api/template/${templateId}`);
        
        const previewContainer = document.getElementById('templatePreview');
        
        if (!previewContainer) return;
        
        // Create a frame for the preview
        previewContainer.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">Template Preview</h6>
                </div>
                <div class="card-body">
                    <div class="mb-2">
                        <strong>Subject:</strong> ${template.subject}
                    </div>
                    <div class="template-content border rounded p-3">
                        ${template.content}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading template preview:', error);
        document.getElementById('templatePreview').innerHTML = `
            <div class="alert alert-danger">
                Failed to load template preview
            </div>
        `;
    }
}

/**
 * Load a template into the form
 * @param {string} templateId - Template ID
 */
async function loadTemplateIntoForm(templateId) {
    try {
        const templateSelect = document.getElementById('campaignTemplate');
        
        if (!templateSelect) return;
        
        // Wait for the templates to load
        if (templateSelect.options.length <= 1) {
            // Templates haven't loaded yet, wait a bit and try again
            setTimeout(() => loadTemplateIntoForm(templateId), 500);
            return;
        }
        
        // Select the template
        templateSelect.value = templateId;
        
        // Trigger the change event to load the preview
        templateSelect.dispatchEvent(new Event('change'));
    } catch (error) {
        console.error('Error loading template into form:', error);
    }
}

/**
 * Load campaigns from server
 */
async function loadCampaigns() {
    try {
        const campaigns = await apiGet('/api/campaign');
        
        const campaignsContainer = document.getElementById('campaignsContainer');
        
        if (!campaignsContainer) return;
        
        campaignsContainer.innerHTML = '';
        
        if (campaigns.length === 0) {
            campaignsContainer.innerHTML = `
                <div class="alert alert-info">
                    You don't have any campaigns yet. Create one using the form above.
                </div>
            `;
            return;
        }
        
        // Create a table to display the campaigns
        const table = document.createElement('table');
        table.className = 'table table-hover';
        
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>List</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th>Sent</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        campaigns.forEach(campaign => {
            const row = document.createElement('tr');
            
            // Determine status label class
            let statusClass = 'bg-secondary';
            if (campaign.status === 'sent') statusClass = 'bg-success';
            if (campaign.status === 'scheduled') statusClass = 'bg-primary';
            if (campaign.status === 'draft') statusClass = 'bg-warning';
            if (campaign.status === 'failed') statusClass = 'bg-danger';
            
            row.innerHTML = `
                <td>
                    <a href="#" class="campaign-name fw-bold" data-id="${campaign._id}">
                        ${campaign.name}
                    </a>
                </td>
                <td>${campaign.list ? campaign.list.name : 'N/A'}</td>
                <td>
                    <span class="badge ${statusClass}">
                        ${campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </span>
                </td>
                <td>${campaign.scheduleDate ? formatDate(campaign.scheduleDate) : 'N/A'}</td>
                <td>${campaign.sentCount || 0}/${campaign.totalRecipients || 0}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-outline-primary view-campaign-btn" data-id="${campaign._id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${campaign.status === 'draft' || campaign.status === 'scheduled' ? `
                        <button class="btn btn-sm btn-outline-danger cancel-campaign-btn" data-id="${campaign._id}">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            
            tbody.appendChild(row);
            
            // Add event listeners for action buttons
            row.querySelector('.view-campaign-btn').addEventListener('click', (e) => {
                e.preventDefault();
                viewCampaign(campaign._id);
            });
            
            row.querySelector('.campaign-name').addEventListener('click', (e) => {
                e.preventDefault();
                viewCampaign(campaign._id);
            });
            
            const cancelBtn = row.querySelector('.cancel-campaign-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    confirmCancelCampaign(campaign._id, campaign.name);
                });
            }
        });
        
        campaignsContainer.appendChild(table);
    } catch (error) {
        console.error('Error loading campaigns:', error);
        throw error;
    }
}

/**
 * Save a campaign
 * @param {Event} e - Submit event
 */
async function saveCampaign(e) {
    e.preventDefault();
    
    const nameInput = document.getElementById('campaignName');
    const name = nameInput.value.trim();
    
    const listSelect = document.getElementById('campaignList');
    const listId = listSelect.value;
    
    const templateSelect = document.getElementById('campaignTemplate');
    const templateId = templateSelect.value;
    
    const scheduleDateInput = document.getElementById('scheduleDate');
    const scheduleDate = scheduleDateInput.value;
    
    const scheduleTimeInput = document.getElementById('scheduleTime');
    const scheduleTime = scheduleTimeInput.value;
    
    const sendLimitInput = document.getElementById('sendLimit');
    const sendLimit = sendLimitInput.value;
    
    if (!name) {
        showToast('error', 'Please enter a campaign name');
        return;
    }
    
    if (!listId) {
        showToast('error', 'Please select an email list');
        return;
    }
    
    if (!templateId) {
        showToast('error', 'Please select an email template');
        return;
    }
    
    if (!scheduleDate) {
        showToast('error', 'Please select a schedule date');
        return;
    }
    
    if (!scheduleTime) {
        showToast('error', 'Please select a schedule time');
        return;
    }
    
    // Combine date and time
    const scheduleDateTimeStr = `${scheduleDate}T${scheduleTime}:00`;
    const scheduleDateTime = new Date(scheduleDateTimeStr);
    
    // Check if the scheduled time is in the past
    if (scheduleDateTime <= new Date()) {
        showToast('error', 'Schedule time must be in the future');
        return;
    }
    
    try {
        const response = await apiPost('/api/campaign', {
            name,
            listId,
            templateId,
            scheduleDate: scheduleDateTime.toISOString(),
            sendLimit: sendLimit || 50 // Default to 50 if not specified
        });
        
        if (response._id) {
            showToast('success', 'Campaign created and scheduled successfully');
            
            // Reset form
            nameInput.value = '';
            listSelect.selectedIndex = 0;
            templateSelect.selectedIndex = 0;
            scheduleDateInput.value = '';
            scheduleTimeInput.value = '';
            sendLimitInput.value = '50';
            
            // Clear template preview
            document.getElementById('templatePreview').innerHTML = '';
            
            // Reload campaigns
            await loadCampaigns();
        } else {
            showToast('error', response.message || 'Failed to create campaign');
        }
    } catch (error) {
        console.error('Error saving campaign:', error);
        showToast('error', error.message || 'Failed to create campaign');
    }
}

/**
 * View campaign details
 * @param {string} campaignId - Campaign ID
 */
async function viewCampaign(campaignId) {
    try {
        const campaign = await apiGet(`/api/campaign/${campaignId}`);
        
        // Create a modal to display campaign details
        const modalContent = `
            <div class="modal fade" id="viewCampaignModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${campaign.name}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6>Campaign Details</h6>
                                    <dl class="row">
                                        <dt class="col-sm-4">Status</dt>
                                        <dd class="col-sm-8">
                                            <span class="badge ${getStatusClass(campaign.status)}">
                                                ${campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                                            </span>
                                        </dd>
                                        
                                        <dt class="col-sm-4">Email List</dt>
                                        <dd class="col-sm-8">${campaign.list ? campaign.list.name : 'N/A'}</dd>
                                        
                                        <dt class="col-sm-4">Template</dt>
                                        <dd class="col-sm-8">${campaign.template ? campaign.template.name : 'N/A'}</dd>
                                        
                                        <dt class="col-sm-4">Scheduled</dt>
                                        <dd class="col-sm-8">${formatDate(campaign.scheduleDate)}</dd>
                                        
                                        <dt class="col-sm-4">Hourly Limit</dt>
                                        <dd class="col-sm-8">${campaign.sendLimit} emails/hour</dd>
                                    </dl>
                                </div>
                                <div class="col-md-6">
                                    <h6>Campaign Statistics</h6>
                                    <dl class="row">
                                        <dt class="col-sm-4">Recipients</dt>
                                        <dd class="col-sm-8">${campaign.totalRecipients || 0}</dd>
                                        
                                        <dt class="col-sm-4">Sent</dt>
                                        <dd class="col-sm-8">${campaign.sentCount || 0}</dd>
                                        
                                        <dt class="col-sm-4">Opens</dt>
                                        <dd class="col-sm-8">${campaign.openCount || 0}</dd>
                                        
                                        <dt class="col-sm-4">Clicks</dt>
                                        <dd class="col-sm-8">${campaign.clickCount || 0}</dd>
                                        
                                        <dt class="col-sm-4">Bounces</dt>
                                        <dd class="col-sm-8">${campaign.bounceCount || 0}</dd>
                                        
                                        <dt class="col-sm-4">Completion</dt>
                                        <dd class="col-sm-8">
                                            <div class="progress">
                                                <div class="progress-bar" role="progressbar" 
                                                    style="width: ${calculateCompletionPercentage(campaign)}%" 
                                                    aria-valuenow="${calculateCompletionPercentage(campaign)}" 
                                                    aria-valuemin="0" 
                                                    aria-valuemax="100">
                                                    ${calculateCompletionPercentage(campaign)}%
                                                </div>
                                            </div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                            
                            ${campaign.template ? `
                                <div class="mb-3">
                                    <h6>Email Preview</h6>
                                    <div class="card">
                                        <div class="card-header">
                                            <strong>Subject:</strong> ${campaign.template.subject}
                                        </div>
                                        <div class="card-body">
                                            <div class="template-content border rounded p-3">
                                                ${campaign.template.content}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${campaign.status === 'sent' ? `
                                <div>
                                    <h6>Performance Chart</h6>
                                    <canvas id="campaignStatsChart" width="400" height="200"></canvas>
                                </div>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            ${campaign.status === 'draft' || campaign.status === 'scheduled' ? `
                                <button type="button" class="btn btn-danger" id="cancelCampaignBtn">
                                    Cancel Campaign
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Append modal to body
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        // Initialize the modal
        const modal = new bootstrap.Modal(document.getElementById('viewCampaignModal'));
        modal.show();
        
        // Clean up modal when hidden
        document.getElementById('viewCampaignModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
        
        // Add event listener for cancel campaign button
        const cancelBtn = document.getElementById('cancelCampaignBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.hide();
                confirmCancelCampaign(campaignId, campaign.name);
            });
        }
        
        // Create chart for sent campaigns
        if (campaign.status === 'sent') {
            createCampaignStatsChart(campaign);
        }
    } catch (error) {
        console.error('Error viewing campaign:', error);
        showToast('error', 'Failed to load campaign details');
    }
}

/**
 * Create campaign statistics chart
 * @param {Object} campaign - Campaign data
 */
function createCampaignStatsChart(campaign) {
    const ctx = document.getElementById('campaignStatsChart').getContext('2d');
    
    // Use mock data for demo purposes
    const sentCount = campaign.sentCount || campaign.totalRecipients || 100;
    const openCount = campaign.openCount || Math.floor(sentCount * 0.4);
    const clickCount = campaign.clickCount || Math.floor(openCount * 0.3);
    const bounceCount = campaign.bounceCount || Math.floor(sentCount * 0.05);
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sent', 'Opens', 'Clicks', 'Bounces'],
            datasets: [{
                label: 'Campaign Statistics',
                data: [sentCount, openCount, clickCount, bounceCount],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                    'rgba(255, 99, 132, 0.5)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const index = context.dataIndex;
                            if (index === 1) { // Opens
                                return `Open rate: ${Math.round(openCount / sentCount * 100)}%`;
                            } else if (index === 2) { // Clicks
                                return `Click rate: ${Math.round(clickCount / sentCount * 100)}%`;
                            } else if (index === 3) { // Bounces
                                return `Bounce rate: ${Math.round(bounceCount / sentCount * 100)}%`;
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Confirm and cancel a campaign
 * @param {string} campaignId - Campaign ID
 * @param {string} campaignName - Campaign name
 */
function confirmCancelCampaign(campaignId, campaignName) {
    if (confirm(`Are you sure you want to cancel the campaign "${campaignName}"? This cannot be undone.`)) {
        cancelCampaign(campaignId);
    }
}

/**
 * Cancel a campaign
 * @param {string} campaignId - Campaign ID
 */
async function cancelCampaign(campaignId) {
    try {
        const response = await apiPut(`/api/campaign/${campaignId}/cancel`, {});
        
        if (response.success) {
            showToast('success', 'Campaign canceled successfully');
            await loadCampaigns();
        } else {
            showToast('error', response.message || 'Failed to cancel campaign');
        }
    } catch (error) {
        console.error('Error canceling campaign:', error);
        showToast('error', error.message || 'Failed to cancel campaign');
    }
}

/**
 * Calculate the completion percentage of a campaign
 * @param {Object} campaign - Campaign data
 * @returns {number} - Percentage of completion
 */
function calculateCompletionPercentage(campaign) {
    if (!campaign.totalRecipients || campaign.totalRecipients === 0) {
        return 0;
    }
    
    const percentage = (campaign.sentCount / campaign.totalRecipients) * 100;
    return Math.round(percentage);
}

/**
 * Get the CSS class for a campaign status badge
 * @param {string} status - Campaign status
 * @returns {string} - CSS class
 */
function getStatusClass(status) {
    switch (status) {
        case 'sent':
            return 'bg-success';
        case 'scheduled':
            return 'bg-primary';
        case 'draft':
            return 'bg-warning';
        case 'failed':
            return 'bg-danger';
        case 'canceled':
            return 'bg-secondary';
        default:
            return 'bg-secondary';
    }
}
