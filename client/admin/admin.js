/**
 * Admin Dashboard JavaScript
 */

// Protect admin routes - redirect if not an admin
async function protectAdminRoute() {
  if (!isLoggedIn()) {
    window.location.href = '../pages/auth.html?redirect=' + encodeURIComponent(window.location.href) + '&admin=true';
    return;
  }
  
  try {
    // Refresh user data from server to ensure up-to-date role information
    await refreshUserData();
    
    // Check if user is admin using the helper function
    if (!isAdmin()) {
      // Not an admin user
      alert('You do not have permission to access this area.');
      window.location.href = '../pages/dashboard.html';
      return;
    }
    
    // Get current user from session storage
    const user = getCurrentUser();
    
    // Update admin name in navbar
    document.getElementById('admin-name').textContent = user.name || user.email;
    
  } catch (error) {
    console.error('Error checking admin status:', error);
    alert('Authentication error. Please log in again.');
    logout();
  }
}

// Function to initialize the admin dashboard
async function initAdminDashboard() {
  // Show loading state
  document.querySelectorAll('.loading-spinner').forEach(el => {
    el.style.display = 'flex';
  });
  
  try {
    // First, verify admin permissions asynchronously
    await protectAdminRoute();
    
    // Set up event listeners
    document.getElementById('logout-link').addEventListener('click', logout);
    document.getElementById('sidebarCollapse').addEventListener('click', function() {
      document.getElementById('sidebar').classList.toggle('active');
      
      // Save sidebar state to localStorage
      const sidebarActive = document.getElementById('sidebar').classList.contains('active');
      localStorage.setItem('admin_sidebar_collapsed', sidebarActive ? 'true' : 'false');
    });
    
    // Restore sidebar state from localStorage
    const sidebarCollapsed = localStorage.getItem('admin_sidebar_collapsed') === 'true';
    if (sidebarCollapsed) {
      document.getElementById('sidebar').classList.add('active');
    }
    
    // Implement auto-refresh functionality
    setupAutoRefresh();
    
    // Start loading data
    loadDashboardData();
  } catch (error) {
    console.error('Error initializing admin dashboard:', error);
    showErrorAlert('Failed to initialize dashboard. Please try refreshing the page.');
    
    // Hide all loading spinners
    document.querySelectorAll('.loading-spinner').forEach(el => {
      el.style.display = 'none';
    });
  }
}

// Load dashboard data more efficiently with Promise.all for parallel requests
async function loadDashboardData() {
  try {
    // Fetch stats and plan requests in parallel
    const [statsData, planRequests] = await Promise.all([
      apiGet('/api/admin/stats'),
      apiGet('/api/admin/plan-requests')
    ]);
    
    // Update the UI with the fetched data
    updateDashboardStats(statsData);
    initDashboardCharts(statsData);
    populateRecentUsers(statsData.recentUsers);
    populatePlanRequests(planRequests);
    setupPlanRequestModal();
    
    // Hide loading spinners after data is loaded
    document.querySelectorAll('.loading-spinner').forEach(el => {
      el.style.display = 'none';
    });
    
    // Show page content
    document.querySelectorAll('.dashboard-content').forEach(el => {
      el.style.display = 'block';
    });
    
    // Add smooth fade-in animation to dashboard cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('card-loaded');
      }, 100 * index); // Stagger the animations
    });
    
  } catch (error) {
    console.error('Error loading admin dashboard data:', error);
    showErrorAlert('Failed to load dashboard data. Please try refreshing the page.');
    
    // Hide loading spinners
    document.querySelectorAll('.loading-spinner').forEach(el => {
      el.style.display = 'none';
    });
  }
}

// Set up auto-refresh functionality
function setupAutoRefresh() {
  // Add refresh button click handler
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      // Show loading spinner on the refresh button
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
      refreshBtn.disabled = true;
      
      // Reload data
      loadDashboardData().then(() => {
        // Reset button state after refresh
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshBtn.disabled = false;
        
        // Show success toast
        showSuccessAlert('Dashboard data refreshed successfully');
      }).catch(() => {
        // Reset button state on error
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        refreshBtn.disabled = false;
      });
    });
  }
}

// Update dashboard statistics cards
function updateDashboardStats(stats) {
  document.getElementById('user-count').textContent = stats.stats.userCount || 0;
  document.getElementById('campaigns-count').textContent = stats.stats.campaignCount || 0;
  document.getElementById('lists-count').textContent = stats.stats.listCount || 0;
  document.getElementById('templates-count').textContent = stats.stats.templateCount || 0;
}

// Initialize dashboard charts
function initDashboardCharts(data) {
  // Registration Chart
  const regCtx = document.getElementById('registrationsChart').getContext('2d');
  const regChart = new Chart(regCtx, {
    type: 'line',
    data: {
      labels: data.userStats.map(stat => stat.date),
      datasets: [{
        label: 'New Users',
        data: data.userStats.map(stat => stat.count),
        backgroundColor: 'rgba(78, 115, 223, 0.05)',
        borderColor: 'rgba(78, 115, 223, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(78, 115, 223, 1)',
        pointBorderColor: '#fff',
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgb(255, 255, 255)',
          bodyColor: '#858796',
          titleColor: '#6e707e',
          titleMarginBottom: 10,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          borderColor: '#dddfeb',
          borderWidth: 1,
          padding: 15,
          displayColors: false
        }
      }
    }
  });
  
  // Plan Distribution Chart
  const planData = data.planStats;
  const planColors = {
    'free': 'rgba(133, 135, 150, 0.8)',
    'starter': 'rgba(246, 194, 62, 0.8)',
    'pro': 'rgba(28, 200, 138, 0.8)',
    'enterprise': 'rgba(78, 115, 223, 0.8)'
  };
  
  const planCtx = document.getElementById('planDistributionChart').getContext('2d');
  const planChart = new Chart(planCtx, {
    type: 'doughnut',
    data: {
      labels: planData.map(plan => getPlanName(plan.plan)),
      datasets: [{
        data: planData.map(plan => plan.count),
        backgroundColor: planData.map(plan => planColors[plan.plan] || 'rgba(133, 135, 150, 0.8)'),
        hoverBackgroundColor: planData.map(plan => {
          const color = planColors[plan.plan] || 'rgba(133, 135, 150, 0.8)';
          return color.replace('0.8', '1');
        }),
        hoverBorderColor: 'rgba(234, 236, 244, 1)',
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right'
        },
        tooltip: {
          backgroundColor: 'rgb(255, 255, 255)',
          bodyColor: '#858796',
          titleColor: '#6e707e',
          titleMarginBottom: 10,
          titleFont: {
            size: 14,
            weight: 'bold'
          },
          borderColor: '#dddfeb',
          borderWidth: 1,
          padding: 15,
          displayColors: false
        }
      }
    }
  });
}

// Populate recent users table
function populateRecentUsers(users) {
  const tableBody = document.getElementById('recent-users-table').querySelector('tbody');
  tableBody.innerHTML = '';
  
  if (!users || users.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" class="text-center">No users found</td>';
    tableBody.appendChild(row);
    return;
  }
  
  users.forEach(user => {
    const row = document.createElement('tr');
    
    const regDate = new Date(user.createdAt);
    const lastLoginDate = user.lastLogin ? new Date(user.lastLogin) : null;
    
    row.innerHTML = `
      <td>${user.name || '<em>No name</em>'}</td>
      <td>${user.email}</td>
      <td><span class="plan-badge plan-${user.plan}">${getPlanName(user.plan)}</span></td>
      <td>${formatDate(regDate)}</td>
      <td>${lastLoginDate ? formatDate(lastLoginDate) : 'Never'}</td>
    `;
    
    row.addEventListener('click', () => {
      window.location.href = `users.html?id=${user._id}`;
    });
    
    tableBody.appendChild(row);
  });
}

// Populate plan requests table
function populatePlanRequests(requests) {
  const tableBody = document.getElementById('plan-requests-table').querySelector('tbody');
  tableBody.innerHTML = '';
  
  // Filter pending requests
  const pendingRequests = requests.filter(req => req.status === 'pending');
  
  if (!pendingRequests || pendingRequests.length === 0) {
    document.getElementById('no-plan-requests').classList.remove('d-none');
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">No pending plan requests</td></tr>';
    return;
  }
  
  document.getElementById('no-plan-requests').classList.add('d-none');
  
  pendingRequests.forEach(request => {
    const row = document.createElement('tr');
    const isDeletedUser = request.userId === null;
    
    // Add data attributes for reference in event handlers
    row.setAttribute('data-request-id', request.id);
    row.setAttribute('data-user-deleted', isDeletedUser.toString());
    
    const requestDate = new Date(request.requestDate);
    
    // Add warning class if user is deleted
    if (isDeletedUser) {
      row.classList.add('table-warning');
    }
    
    row.innerHTML = `
      <td>
        ${isDeletedUser ? 
          '<span class="text-muted"><i class="fas fa-exclamation-triangle text-warning me-1"></i> ' + request.userName + '</span>' :
          request.userName || request.userEmail
        }
      </td>
      <td><span class="plan-badge plan-${request.currentPlan}">${getPlanName(request.currentPlan)}</span></td>
      <td><span class="plan-badge plan-${request.requestedPlan}">${getPlanName(request.requestedPlan)}</span></td>
      <td>${formatDate(requestDate)}</td>
      <td><span class="status-badge status-${request.status}">${getStatusName(request.status)}</span></td>
      <td>
        <button type="button" class="btn btn-sm btn-primary view-request" data-request-id="${request.id}" data-user-deleted="${isDeletedUser}">
          <i class="fas fa-eye"></i> View
        </button>
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event listeners to view buttons
  document.querySelectorAll('.view-request').forEach(button => {
    button.addEventListener('click', () => {
      const requestId = button.getAttribute('data-request-id');
      openPlanRequestModal(requestId, requests);
    });
  });
}

// Set up plan request modal
function setupPlanRequestModal() {
  const approveBtn = document.getElementById('approve-plan-btn');
  const rejectBtn = document.getElementById('reject-plan-btn');
  
  approveBtn.addEventListener('click', async () => {
    const requestId = approveBtn.getAttribute('data-request-id');
    const message = document.getElementById('admin-message').value.trim();
    
    await respondToPlanRequest(requestId, true, message);
  });
  
  rejectBtn.addEventListener('click', async () => {
    const requestId = rejectBtn.getAttribute('data-request-id');
    const message = document.getElementById('admin-message').value.trim();
    
    await respondToPlanRequest(requestId, false, message);
  });
}

// Open the plan request modal with request details
function openPlanRequestModal(requestId, requests) {
  const request = requests.find(req => req.id === requestId);
  
  if (!request) {
    showErrorAlert('Request not found');
    return;
  }
  
  const isDeletedUser = request.userId === null;
  
  // Set request details in modal
  document.getElementById('modal-user-name').textContent = request.userName || 'N/A';
  document.getElementById('modal-user-email').textContent = request.userEmail;
  document.getElementById('modal-current-plan').textContent = getPlanName(request.currentPlan);
  document.getElementById('modal-requested-plan').textContent = getPlanName(request.requestedPlan);
  document.getElementById('modal-request-date').textContent = formatDate(new Date(request.requestDate));
  document.getElementById('modal-status').textContent = getStatusName(request.status);
  document.getElementById('modal-user-message').textContent = request.message || 'No message provided';
  
  // Show/hide deleted user warning
  const deletedUserWarning = document.getElementById('deleted-user-warning');
  if (deletedUserWarning) {
    deletedUserWarning.style.display = isDeletedUser ? 'block' : 'none';
  } else if (isDeletedUser) {
    // Create warning if it doesn't exist
    const warningHtml = `
      <div id="deleted-user-warning" class="alert alert-warning mb-3">
        <i class="fas fa-exclamation-triangle me-2"></i>
        <strong>Warning:</strong> This user has been deleted. If approved, the plan cannot be updated, but the request will still be marked as processed.
      </div>
    `;
    document.querySelector('.modal-body').insertAdjacentHTML('afterbegin', warningHtml);
  }
  
  // Set request ID and deleted user status on buttons
  document.getElementById('approve-plan-btn').setAttribute('data-request-id', requestId);
  document.getElementById('approve-plan-btn').setAttribute('data-user-deleted', isDeletedUser.toString());
  document.getElementById('reject-plan-btn').setAttribute('data-request-id', requestId);
  document.getElementById('reject-plan-btn').setAttribute('data-user-deleted', isDeletedUser.toString());
  
  // Clear admin message field
  document.getElementById('admin-message').value = '';
  
  // Show/hide admin response section based on status
  if (request.status !== 'pending') {
    document.getElementById('admin-response-section').style.display = 'none';
    document.getElementById('approve-plan-btn').style.display = 'none';
    document.getElementById('reject-plan-btn').style.display = 'none';
  } else {
    document.getElementById('admin-response-section').style.display = 'block';
    document.getElementById('approve-plan-btn').style.display = 'inline-block';
    document.getElementById('reject-plan-btn').style.display = 'inline-block';
  }
  
  // Show the modal
  const modal = new bootstrap.Modal(document.getElementById('planRequestModal'));
  modal.show();
}

// Respond to a plan request (approve or reject)
async function respondToPlanRequest(requestId, approved, message) {
  try {
    const approveBtn = document.getElementById('approve-plan-btn');
    const rejectBtn = document.getElementById('reject-plan-btn');
    const isUserDeleted = approveBtn.getAttribute('data-user-deleted') === 'true';
    
    // Confirm if approving for deleted user
    if (isUserDeleted && approved) {
      const confirmed = confirm("This user account has been deleted. The plan cannot be updated, but the request will still be marked as processed. Do you want to continue?");
      if (!confirmed) {
        return; // User cancelled the action
      }
    }
    
    const loadingBtn = approved ? 'approve-plan-btn' : 'reject-plan-btn';
    const btnText = approved ? 'Approve Request' : 'Reject Request';
    
    // Show loading state
    document.getElementById(loadingBtn).innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    document.getElementById(loadingBtn).disabled = true;
    document.getElementById(approved ? 'reject-plan-btn' : 'approve-plan-btn').disabled = true;
    
    const response = await apiPost('/api/admin/plan-requests/respond', {
      requestId,
      approved,
      message
    });
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('planRequestModal'));
    modal.hide();
    
    // Show success message
    let successMessage = `Plan request ${approved ? 'approved' : 'rejected'} successfully.`;
    if (isUserDeleted && approved) {
      successMessage += ' (Note: User account no longer exists, so plan was not actually updated)';
    }
    showSuccessAlert(successMessage);
    
    // Reload dashboard data after a short delay
    setTimeout(() => {
      initAdminDashboard();
    }, 1000);
    
  } catch (error) {
    console.error('Error responding to plan request:', error);
    
    // Reset button state
    document.getElementById(approved ? 'approve-plan-btn' : 'reject-plan-btn').innerHTML = 
      approved ? 'Approve Request' : 'Reject Request';
    document.getElementById(approved ? 'approve-plan-btn' : 'reject-plan-btn').disabled = false;
    document.getElementById(approved ? 'reject-plan-btn' : 'approve-plan-btn').disabled = false;
    
    showErrorAlert(`Failed to ${approved ? 'approve' : 'reject'} plan request. ${error.message || 'Please try again.'}`);
  }
}

// Helper function to get plan name from code
function getPlanName(planCode) {
  const planNames = {
    'free': 'Free Plan',
    'starter': 'Starter Plan',
    'pro': 'Pro Plan',
    'enterprise': 'Enterprise Plan'
  };
  
  return planNames[planCode] || planCode;
}

// Helper function to get status name from code
function getStatusName(statusCode) {
  const statusNames = {
    'pending': 'Pending',
    'approved': 'Approved',
    'rejected': 'Rejected'
  };
  
  return statusNames[statusCode] || statusCode;
}

// Format date to a readable string
function formatDate(date) {
  if (!date) return 'N/A';
  
  // Format: Feb 20, 2023 (14:30)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

// Show success alert
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

// Show error alert
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

// Initialize admin dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdminDashboard);