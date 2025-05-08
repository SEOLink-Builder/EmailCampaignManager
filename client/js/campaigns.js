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
            
            // Setup send time recommendation feature
            setupSendTimeRecommendation();
        }
    } catch (error) {
        console.error('Error initializing campaigns page:', error);
        showToast('error', 'Failed to load campaign data');
    }
}

/**
 * Setup the send time recommendation feature
 */
function setupSendTimeRecommendation() {
    // Find the schedule row
    const scheduleDateInput = document.getElementById('scheduleDate');
    if (!scheduleDateInput) return;
    
    const scheduleRow = scheduleDateInput.closest('.row');
    if (!scheduleRow) return;
    
    // Create recommendation button and container
    const recommendationRow = document.createElement('div');
    recommendationRow.className = 'row mb-3 mt-1';
    recommendationRow.innerHTML = `
        <div class="col-12">
            <button type="button" id="recommendTimeBtn" class="btn btn-sm btn-outline-primary">
                <i class="fas fa-magic me-1"></i> Recommend Best Send Time
            </button>
            <div id="timeRecommendations" class="card mt-2" style="display: none;">
                <div class="card-body p-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 class="card-title mb-0">Recommended Send Times</h6>
                        <button type="button" class="btn-close btn-sm" id="closeRecommendations"></button>
                    </div>
                    <div id="recommendationsContent">
                        <div class="text-center py-3">
                            <div class="spinner-border spinner-border-sm text-primary" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <span class="ms-2">Analyzing audience engagement data...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Insert after schedule row
    scheduleRow.after(recommendationRow);
    
    // Add event listeners
    document.getElementById('recommendTimeBtn').addEventListener('click', generateSendTimeRecommendations);
    document.getElementById('closeRecommendations').addEventListener('click', () => {
        document.getElementById('timeRecommendations').style.display = 'none';
    });
    
    // Update select list handler
    const listSelect = document.getElementById('emailListId');
    if (listSelect) {
        listSelect.addEventListener('change', () => {
            // Reset recommendations when list changes
            document.getElementById('timeRecommendations').style.display = 'none';
        });
    }
}

/**
 * Generate send time recommendations based on audience engagement data
 */
async function generateSendTimeRecommendations() {
    const recommendationsPanel = document.getElementById('timeRecommendations');
    const contentArea = document.getElementById('recommendationsContent');
    
    // Show the panel
    recommendationsPanel.style.display = 'block';
    
    try {
        // Get selected list ID
        const listId = document.getElementById('emailListId').value;
        if (!listId) {
            contentArea.innerHTML = `
                <div class="alert alert-warning mb-0">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Please select an email list first to get personalized recommendations.
                </div>
            `;
            return;
        }
        
        // Simulate API call to get recommendations (replace with actual API call later)
        // In a real implementation, we would call the server to analyze past campaign data
        // for the selected list and determine optimal send times
        const recommendations = await getRecommendationsForList(listId);
        
        if (recommendations.length === 0) {
            contentArea.innerHTML = `
                <div class="alert alert-info mb-0">
                    <i class="fas fa-info-circle me-2"></i>
                    Not enough data for this list yet. Using general best practices instead.
                </div>
                <div class="recommendation-times mt-3">
                    <p class="small text-muted mb-1">General best practices:</p>
                    <div class="list-group">
                        <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                            onclick="applyRecommendedTime('Tuesday', '10:00')">
                            <span><i class="fas fa-calendar-day me-2"></i> Tuesday, 10:00 AM</span>
                            <span class="badge bg-primary rounded-pill">Most opened</span>
                        </button>
                        <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                            onclick="applyRecommendedTime('Thursday', '14:00')">
                            <span><i class="fas fa-calendar-day me-2"></i> Thursday, 2:00 PM</span>
                            <span class="badge bg-success rounded-pill">Most clicked</span>
                        </button>
                        <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                            onclick="applyRecommendedTime('Wednesday', '08:00')">
                            <span><i class="fas fa-calendar-day me-2"></i> Wednesday, 8:00 AM</span>
                            <span class="badge bg-info rounded-pill">Recommended</span>
                        </button>
                    </div>
                </div>
            `;
        } else {
            // Display recommendations
            let recommendationsHTML = `
                <p class="small text-muted mb-1">Based on your audience engagement:</p>
                <div class="recommendation-times">
                    <div class="list-group">
            `;
            
            recommendations.forEach(rec => {
                recommendationsHTML += `
                    <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" 
                        onclick="applyRecommendedTime('${rec.day}', '${rec.time}')">
                        <span><i class="fas fa-calendar-day me-2"></i> ${rec.day}, ${formatTime(rec.time)}</span>
                        <span class="badge ${rec.badgeClass} rounded-pill">${rec.label}</span>
                    </button>
                `;
            });
            
            recommendationsHTML += `
                    </div>
                </div>
                <div class="recommendation-chart mt-3">
                    <canvas id="engagementChart" height="150"></canvas>
                </div>
                <p class="mt-2 small text-muted">
                    <i class="fas fa-info-circle me-1"></i> 
                    Analysis based on previous campaign performance and subscriber activity.
                </p>
            `;
            
            contentArea.innerHTML = recommendationsHTML;
            
            // Initialize chart if we have recommendations
            setTimeout(() => {
                initEngagementChart(recommendations);
            }, 100);
        }
    } catch (error) {
        console.error('Error generating recommendations:', error);
        contentArea.innerHTML = `
            <div class="alert alert-danger mb-0">
                <i class="fas fa-exclamation-circle me-2"></i>
                Failed to generate recommendations. Please try again.
            </div>
        `;
    }
}

/**
 * Apply a recommended send time to the form
 * @param {string} day - Day of week 
 * @param {string} time - Time in 24-hour format (HH:MM)
 */
function applyRecommendedTime(day, time) {
    // Find the next date that matches the given day of week
    const dayMapping = {
        'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
        'Friday': 5, 'Saturday': 6, 'Sunday': 0
    };
    
    const today = new Date();
    const dayOfWeekNum = dayMapping[day];
    const daysUntilTarget = (dayOfWeekNum + 7 - today.getDay()) % 7;
    
    // If today is the target day and time has passed, schedule for next week
    if (daysUntilTarget === 0) {
        const [hours, minutes] = time.split(':').map(Number);
        if (today.getHours() > hours || (today.getHours() === hours && today.getMinutes() >= minutes)) {
            // Time has passed, schedule for next week
            today.setDate(today.getDate() + 7);
        }
    } else {
        // Set date to next occurrence of the target day
        today.setDate(today.getDate() + daysUntilTarget);
    }
    
    // Format the date and set form values
    const dateStr = today.toISOString().split('T')[0];
    document.getElementById('scheduleDate').value = dateStr;
    document.getElementById('scheduleTime').value = time;
    
    // Hide recommendations
    document.getElementById('timeRecommendations').style.display = 'none';
    
    // Show success toast
    showToast('success', `Schedule set to ${day}, ${formatTime(time)}`);
}

/**
 * Format time from 24-hour to 12-hour format
 * @param {string} time - Time in 24-hour format (HH:MM)
 * @returns {string} - Time in 12-hour format
 */
function formatTime(time) {
    const [hours, minutes] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

/**
 * Get send time recommendations for a specific email list
 * @param {string} listId - Email list ID
 * @returns {Promise<Array>} - Array of recommendations
 */
async function getRecommendationsForList(listId) {
    // In a real implementation, this would call the server API
    // to get actual data-based recommendations
    
    // For now, we'll return some dummy recommendations based on the list ID
    // to simulate different recommendations for different lists
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Get analytics data from local storage (if available)
    // In a real implementation, this would come from the server
    const listData = localStorage.getItem(`list_analytics_${listId}`);
    
    if (listData) {
        // Parse stored data and return actual recommendations
        try {
            return JSON.parse(listData);
        } catch (e) {
            console.error('Error parsing stored recommendations:', e);
        }
    }
    
    // Generate some dynamic recommendations based on list ID
    // to simulate different recommendations for different lists
    const hash = listId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
    const seed = Math.abs(hash) % 100;
    
    if (seed < 30) {
        // First pattern
        return [
            { day: 'Tuesday', time: '09:30', label: 'Highest open rate', badgeClass: 'bg-primary' },
            { day: 'Wednesday', time: '14:15', label: 'Best conversion', badgeClass: 'bg-success' },
            { day: 'Thursday', time: '10:00', label: 'Good balance', badgeClass: 'bg-info' }
        ];
    } else if (seed < 60) {
        // Second pattern
        return [
            { day: 'Monday', time: '08:45', label: 'Start of week', badgeClass: 'bg-primary' },
            { day: 'Wednesday', time: '16:30', label: 'Highest engagement', badgeClass: 'bg-success' },
            { day: 'Friday', time: '11:00', label: 'Weekend prep', badgeClass: 'bg-info' }
        ];
    } else {
        // Third pattern
        return [
            { day: 'Tuesday', time: '11:30', label: 'Most responsive', badgeClass: 'bg-primary' },
            { day: 'Thursday', time: '15:45', label: 'Best for sales', badgeClass: 'bg-success' },
            { day: 'Saturday', time: '10:15', label: 'Weekend readers', badgeClass: 'bg-info' }
        ];
    }
}

/**
 * Initialize engagement chart
 * @param {Array} recommendations - Recommendation data
 */
function initEngagementChart(recommendations) {
    const ctx = document.getElementById('engagementChart');
    if (!ctx) return;
    
    // Generate daily engagement data
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Generate hourly engagement data (9am to 6pm)
    const hours = [];
    for (let i = 9; i <= 18; i++) {
        hours.push(i < 10 ? `0${i}:00` : `${i}:00`);
    }
    
    // Generate heatmap data based on recommendations
    const heatData = [];
    
    days.forEach((day, dayIndex) => {
        const dayRec = recommendations.find(r => r.day === day);
        hours.forEach((hour, hourIndex) => {
            const hourNum = parseInt(hour.split(':')[0]);
            
            // Base value
            let value = 30 + Math.random() * 20;
            
            // If this day/hour is in recommendations, boost its value
            if (dayRec) {
                const recHour = parseInt(dayRec.time.split(':')[0]);
                if (hourNum === recHour) {
                    value = 80 + Math.random() * 20;
                } else if (Math.abs(hourNum - recHour) === 1) {
                    value = 60 + Math.random() * 20;
                }
            }
            
            heatData.push({
                day: dayIndex,
                hour: hourIndex,
                value: Math.round(value)
            });
        });
    });
    
    // Create chart data
    const chartData = {
        datasets: [{
            label: 'Engagement Score',
            data: heatData,
            backgroundColor: (context) => {
                const value = context.raw.value;
                if (value > 70) return 'rgba(52, 152, 219, 0.9)';
                if (value > 50) return 'rgba(52, 152, 219, 0.7)';
                if (value > 40) return 'rgba(52, 152, 219, 0.5)';
                return 'rgba(52, 152, 219, 0.3)';
            },
            borderColor: 'rgba(52, 152, 219, 0.3)',
            borderWidth: 1,
            borderRadius: 3,
            hoverBackgroundColor: 'rgba(52, 152, 219, 1)',
            width: 32,
            height: 20
        }]
    };
    
    // Create chart
    new Chart(ctx, {
        type: 'matrix',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'category',
                    labels: days,
                    offset: true,
                    ticks: {
                        maxRotation: 0,
                        autoSkip: false
                    },
                    grid: {
                        display: false
                    }
                },
                x: {
                    type: 'category',
                    labels: hours,
                    offset: true,
                    ticks: {
                        maxRotation: 0,
                        autoSkip: false
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const item = items[0];
                            const day = days[item.raw.day];
                            const hour = hours[item.raw.hour];
                            return `${day}, ${hour}`;
                        },
                        label: (item) => {
                            return `Engagement: ${item.raw.value}%`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
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
