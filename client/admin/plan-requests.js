/**
 * Admin Plan Requests JavaScript
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Protect admin route
  await protectAdminRoute();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load plan requests
  loadPlanRequests();
});

/**
 * Set up event listeners for the page
 */
function setupEventListeners() {
  // Sidebar toggle
  document.getElementById('sidebarCollapse').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('active');
  });
  
  // Logout link
  document.getElementById('logout-link').addEventListener('click', logout);
  
  // Refresh button
  document.getElementById('refresh-btn').addEventListener('click', () => {
    loadPlanRequests();
  });
  
  // Filter buttons
  document.getElementById('filter-all').addEventListener('click', () => {
    setActiveFilter('all');
    filterPlanRequests('all');
  });
  
  document.getElementById('filter-pending').addEventListener('click', () => {
    setActiveFilter('pending');
    filterPlanRequests('pending');
  });
  
  document.getElementById('filter-approved').addEventListener('click', () => {
    setActiveFilter('approved');
    filterPlanRequests('approved');
  });
  
  document.getElementById('filter-rejected').addEventListener('click', () => {
    setActiveFilter('rejected');
    filterPlanRequests('rejected');
  });
}

/**
 * Set active filter button
 * @param {string} filter - Filter type: all, pending, approved, rejected
 */
function setActiveFilter(filter) {
  const filters = ['all', 'pending', 'approved', 'rejected'];
  
  filters.forEach(f => {
    const button = document.getElementById(`filter-${f}`);
    if (f === filter) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

/**
 * Load plan requests from API
 */
async function loadPlanRequests() {
  try {
    // Show loading indicator
    document.getElementById('loading-indicator').classList.remove('d-none');
    document.getElementById('no-requests-message').classList.add('d-none');
    document.getElementById('plan-requests').innerHTML = '';
    
    // Get plan requests from API
    const planRequests = await apiGet('/api/admin/plan-requests');
    
    // Hide loading indicator
    document.getElementById('loading-indicator').classList.add('d-none');
    
    // Update counters
    updateRequestCounters(planRequests);
    
    // If no requests, show message
    if (!planRequests || planRequests.length === 0) {
      document.getElementById('no-requests-message').classList.remove('d-none');
      return;
    }
    
    // Display plan requests
    displayPlanRequests(planRequests);
    
    // Store requests in global variable for filtering
    window.allPlanRequests = planRequests;
    
    // Apply current filter
    const activeFilter = document.querySelector('.btn-group .active').id.replace('filter-', '');
    filterPlanRequests(activeFilter);
    
  } catch (error) {
    console.error('Error loading plan requests:', error);
    
    // Hide loading indicator
    document.getElementById('loading-indicator').classList.add('d-none');
    
    // Show error toast
    showErrorAlert('Failed to load plan requests. Please try again.');
  }
}

/**
 * Update request counters
 * @param {Array} requests - Array of plan requests
 */
function updateRequestCounters(requests) {
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;
  const totalCount = requests.length;
  
  document.getElementById('pending-count').textContent = pendingCount;
  document.getElementById('approved-count').textContent = approvedCount;
  document.getElementById('rejected-count').textContent = rejectedCount;
  document.getElementById('total-count').textContent = totalCount;
}

/**
 * Filter plan requests
 * @param {string} filter - Filter type: all, pending, approved, rejected
 */
function filterPlanRequests(filter) {
  const allRequests = window.allPlanRequests || [];
  let filteredRequests;
  
  if (filter === 'all') {
    filteredRequests = allRequests;
  } else {
    filteredRequests = allRequests.filter(r => r.status === filter);
  }
  
  // Display filtered requests
  displayPlanRequests(filteredRequests);
  
  // Show/hide no requests message
  if (filteredRequests.length === 0) {
    document.getElementById('no-requests-message').classList.remove('d-none');
    document.querySelector('#no-requests-message h4').textContent = `No ${filter !== 'all' ? filter + ' ' : ''}plan requests found`;
  } else {
    document.getElementById('no-requests-message').classList.add('d-none');
  }
}

/**
 * Display plan requests in the UI
 * @param {Array} requests - Array of plan requests
 */
function displayPlanRequests(requests) {
  const requestsContainer = document.getElementById('plan-requests');
  requestsContainer.innerHTML = '';
  
  // Sort requests by date (newest first) and status (pending first)
  requests.sort((a, b) => {
    // Pending requests first
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (a.status !== 'pending' && b.status === 'pending') return 1;
    
    // Then by date (newest first)
    return new Date(b.requestDate) - new Date(a.requestDate);
  });
  
  // Create a card for each request
  requests.forEach(request => {
    const requestCard = document.createElement('div');
    requestCard.className = 'col-md-4 mb-4';
    
    // Get status badge class
    let statusBadge, statusBgClass;
    if (request.status === 'pending') {
      statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
      statusBgClass = 'border-warning';
    } else if (request.status === 'approved') {
      statusBadge = '<span class="badge bg-success">Approved</span>';
      statusBgClass = 'border-success';
    } else {
      statusBadge = '<span class="badge bg-secondary">Rejected</span>';
      statusBgClass = 'border-secondary';
    }
    
    // Format date
    const requestDate = new Date(request.requestDate);
    const dateString = formatDate(requestDate);
    
    // Format plan names
    const planNames = {
      'free': 'Free Plan',
      'starter': 'Starter Plan',
      'pro': 'Pro Plan',
      'enterprise': 'Enterprise Plan'
    };
    
    requestCard.innerHTML = `
      <div class="card request-card h-100 ${statusBgClass}" data-request-id="${request.id}">
        <div class="card-header d-flex justify-content-between align-items-center">
          <h6 class="mb-0 text-truncate">
            ${request.userName || 'User'}
          </h6>
          ${statusBadge}
        </div>
        <div class="card-body">
          <p class="card-text small text-muted mb-3">${dateString}</p>
          <div class="mb-3">
            <span class="badge bg-secondary">
              ${planNames[request.currentPlan] || request.currentPlan}
            </span>
            <i class="fas fa-arrow-right mx-1"></i>
            <span class="badge plan-badge plan-${request.requestedPlan}">
              ${planNames[request.requestedPlan] || request.requestedPlan}
            </span>
          </div>
          <p class="card-text small text-truncate">${request.message || 'No message provided'}</p>
        </div>
        <div class="card-footer bg-transparent">
          <button class="btn btn-primary btn-sm w-100 view-request">
            <i class="fas fa-eye me-2"></i> View Details
          </button>
        </div>
      </div>
    `;
    
    // Add event listener for view details button
    requestCard.querySelector('.view-request').addEventListener('click', () => {
      viewRequestDetails(request.id);
    });
    
    requestsContainer.appendChild(requestCard);
  });
}

/**
 * View plan request details in a modal
 * @param {string} requestId - Request ID
 */
async function viewRequestDetails(requestId) {
  try {
    // Find request in stored requests
    const request = window.allPlanRequests.find(r => r.id === requestId);
    
    if (!request) {
      showErrorAlert('Request not found');
      return;
    }
    
    // Format dates
    const requestDate = new Date(request.requestDate);
    const dateString = formatDate(requestDate);
    
    // Format plan names
    const planNames = {
      'free': 'Free Plan',
      'starter': 'Starter Plan',
      'pro': 'Pro Plan',
      'enterprise': 'Enterprise Plan'
    };
    
    // Set request details in modal
    document.getElementById('modal-user-name').textContent = request.userName || 'N/A';
    document.getElementById('modal-user-email').textContent = request.userEmail;
    document.getElementById('modal-current-plan').textContent = planNames[request.currentPlan] || request.currentPlan;
    document.getElementById('modal-requested-plan').textContent = planNames[request.requestedPlan] || request.requestedPlan;
    document.getElementById('modal-request-date').textContent = dateString;
    
    // Set status with appropriate badge color
    let statusBadge;
    if (request.status === 'pending') {
      statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
    } else if (request.status === 'approved') {
      statusBadge = '<span class="badge bg-success">Approved</span>';
    } else {
      statusBadge = '<span class="badge bg-secondary">Rejected</span>';
    }
    document.getElementById('modal-status').innerHTML = statusBadge;
    
    // Set user message
    document.getElementById('modal-user-message').textContent = request.message || 'No message provided';
    
    // Show/hide admin message if available
    const adminMessageContainer = document.getElementById('modal-admin-message-container');
    const adminMessage = document.getElementById('modal-admin-message');
    
    if (request.adminMessage) {
      adminMessage.textContent = request.adminMessage;
      adminMessageContainer.classList.remove('d-none');
    } else {
      adminMessageContainer.classList.add('d-none');
    }
    
    // Show/hide response date if available
    const responseDateContainer = document.getElementById('modal-response-date-container');
    const responseDate = document.getElementById('modal-response-date');
    
    if (request.adminResponse && request.adminResponse.respondedAt) {
      const respondedDate = new Date(request.adminResponse.respondedAt);
      responseDate.textContent = formatDate(respondedDate);
      responseDateContainer.classList.remove('d-none');
    } else {
      responseDateContainer.classList.add('d-none');
    }
    
    // Show/hide admin response form and buttons based on status
    const responseFormContainer = document.getElementById('response-form-container');
    const modalActions = document.getElementById('modal-actions');
    
    if (request.status === 'pending') {
      responseFormContainer.classList.remove('d-none');
      document.getElementById('approve-plan-btn').classList.remove('d-none');
      document.getElementById('reject-plan-btn').classList.remove('d-none');
      document.getElementById('admin-message').value = '';
    } else {
      responseFormContainer.classList.add('d-none');
      document.getElementById('approve-plan-btn').classList.add('d-none');
      document.getElementById('reject-plan-btn').classList.add('d-none');
    }
    
    // Set up approve/reject buttons
    document.getElementById('approve-plan-btn').setAttribute('data-request-id', requestId);
    document.getElementById('reject-plan-btn').setAttribute('data-request-id', requestId);
    
    // Set up event listeners for approve/reject buttons
    document.getElementById('approve-plan-btn').onclick = () => respondToPlanRequest(requestId, true);
    document.getElementById('reject-plan-btn').onclick = () => respondToPlanRequest(requestId, false);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('requestModal'));
    modal.show();
    
  } catch (error) {
    console.error('Error viewing request details:', error);
    showErrorAlert('Failed to load request details');
  }
}

/**
 * Respond to a plan request (approve or reject)
 * @param {string} requestId - Request ID
 * @param {boolean} approved - Whether to approve or reject
 */
async function respondToPlanRequest(requestId, approved) {
  try {
    const message = document.getElementById('admin-message').value.trim();
    
    // Show loading state on button
    const buttonId = approved ? 'approve-plan-btn' : 'reject-plan-btn';
    const button = document.getElementById(buttonId);
    const originalButtonHtml = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> ${approved ? 'Approving' : 'Rejecting'}...`;
    
    // Also disable the other button
    const otherButtonId = approved ? 'reject-plan-btn' : 'approve-plan-btn';
    document.getElementById(otherButtonId).disabled = true;
    
    // Send API request
    const response = await apiPost('/api/admin/plan-requests/respond', {
      requestId,
      approved,
      message
    });
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('requestModal'));
    modal.hide();
    
    // Show success message
    showSuccessAlert(`Plan request ${approved ? 'approved' : 'rejected'} successfully`);
    
    // Reload plan requests
    loadPlanRequests();
    
  } catch (error) {
    console.error('Error responding to plan request:', error);
    
    // Reset button states
    document.getElementById('approve-plan-btn').disabled = false;
    document.getElementById('approve-plan-btn').innerHTML = '<i class="fas fa-check-circle me-2"></i> Approve Request';
    
    document.getElementById('reject-plan-btn').disabled = false;
    document.getElementById('reject-plan-btn').innerHTML = '<i class="fas fa-times-circle me-2"></i> Reject Request';
    
    // Show error message
    showErrorAlert('Failed to respond to plan request: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Format date for display
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Show success alert
 * @param {string} message - Alert message
 */
function showSuccessAlert(message) {
  // Check if alert container exists, if not create it
  let alertContainer = document.getElementById('alert-container');
  
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.id = 'alert-container';
    alertContainer.style.position = 'fixed';
    alertContainer.style.top = '20px';
    alertContainer.style.right = '20px';
    alertContainer.style.zIndex = '9999';
    document.body.appendChild(alertContainer);
  }
  
  const alertId = 'alert-' + Date.now();
  const alertHtml = `
    <div id="${alertId}" class="alert alert-success alert-dismissible fade show" role="alert">
      <i class="fas fa-check-circle me-2"></i> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  
  alertContainer.insertAdjacentHTML('beforeend', alertHtml);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }
  }, 5000);
}

/**
 * Show error alert
 * @param {string} message - Alert message
 */
function showErrorAlert(message) {
  // Check if alert container exists, if not create it
  let alertContainer = document.getElementById('alert-container');
  
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.id = 'alert-container';
    alertContainer.style.position = 'fixed';
    alertContainer.style.top = '20px';
    alertContainer.style.right = '20px';
    alertContainer.style.zIndex = '9999';
    document.body.appendChild(alertContainer);
  }
  
  const alertId = 'alert-' + Date.now();
  const alertHtml = `
    <div id="${alertId}" class="alert alert-danger alert-dismissible fade show" role="alert">
      <i class="fas fa-exclamation-circle me-2"></i> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  
  alertContainer.insertAdjacentHTML('beforeend', alertHtml);
  
  // Auto-dismiss after 7 seconds
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }
  }, 7000);
}