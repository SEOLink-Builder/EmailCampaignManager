/**
 * Admin User Management JavaScript
 */

// Store all users for filtering and searching
let allUsers = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Protect admin route
  await protectAdminRoute();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load users
  await loadUsers();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Sidebar toggle
  document.getElementById('sidebarCollapse').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('active');
  });
  
  // Logout button
  document.getElementById('logout-link').addEventListener('click', logout);
  
  // Reload users button
  document.getElementById('reload-users-btn').addEventListener('click', loadUsers);
  
  // Search users input
  const searchInput = document.getElementById('userSearch');
  if (searchInput) {
    searchInput.addEventListener('input', filterUsers);
  }
  
  // Clear search button
  const clearSearchBtn = document.getElementById('clearSearch');
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      document.getElementById('userSearch').value = '';
      filterUsers();
    });
  }
  
  // Filter dropdown items
  const filterItems = document.querySelectorAll('.filter-item');
  filterItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all items
      filterItems.forEach(i => i.classList.remove('active'));
      
      // Add active class to clicked item
      item.classList.add('active');
      
      // Apply filter
      const filter = item.getAttribute('data-filter');
      filterUsers(filter);
    });
  });
  
  // Save user button in edit modal
  document.getElementById('saveUserBtn').addEventListener('click', saveUserChanges);
  
  // Confirm delete user button
  document.getElementById('confirmDeleteBtn').addEventListener('click', deleteUser);
  
  // View user edit button
  document.getElementById('viewEditUserBtn').addEventListener('click', () => {
    // Get user ID from the view modal
    const userId = document.getElementById('viewEditUserBtn').getAttribute('data-user-id');
    
    // Hide view modal
    bootstrap.Modal.getInstance(document.getElementById('viewUserModal')).hide();
    
    // Show edit modal for this user
    editUser(userId);
  });
}

/**
 * Load users from API
 */
async function loadUsers() {
  try {
    // Show loading state
    const tableBody = document.querySelector('#user-table tbody');
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2">Loading users...</p>
        </td>
      </tr>
    `;
    
    // Get users from API
    const users = await apiGet('/api/admin/users');
    
    // Store users globally for filtering and searching
    allUsers = users;
    
    // Update summary cards
    updateUserSummary(users);
    
    // Populate table
    populateUserTable(users);
    
  } catch (error) {
    console.error('Error loading users:', error);
    
    const tableBody = document.querySelector('#user-table tbody');
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-danger">
          <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
          <p>Failed to load users. Please try again.</p>
        </td>
      </tr>
    `;
    
    showErrorAlert('Failed to load users: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Update user summary cards
 * @param {Array} users - Array of user objects
 */
function updateUserSummary(users) {
  // Calculate summary counts
  const totalUsers = users.length;
  
  // Count active campaigns (this would come from another API in a real implementation)
  const activeCampaigns = 0; // This is just a placeholder
  
  // Count new users in the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
  const newUsers = users.filter(user => new Date(user.createdAt) >= sevenDaysAgo).length;
  
  // Count paid plans
  const paidPlans = users.filter(user => user.plan !== 'free').length;
  
  // Update the counters
  document.getElementById('total-users-count').textContent = totalUsers;
  document.getElementById('active-campaigns-count').textContent = activeCampaigns;
  document.getElementById('new-users-count').textContent = newUsers;
  document.getElementById('paid-plans-count').textContent = paidPlans;
}

/**
 * Populate user table with data
 * @param {Array} users - Array of user objects
 */
function populateUserTable(users) {
  const tableBody = document.querySelector('#user-table tbody');
  tableBody.innerHTML = '';
  
  if (users.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center">
          <p class="text-muted my-3">No users found</p>
        </td>
      </tr>
    `;
    return;
  }
  
  // Sort users by registration date (newest first)
  users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  users.forEach(user => {
    const row = document.createElement('tr');
    row.setAttribute('data-user-id', user._id);
    
    // Create activity indicator (green if logged in recently, red otherwise)
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    const now = new Date();
    const daysSinceLogin = lastLogin ? Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24)) : null;
    const isRecentlyActive = lastLogin && daysSinceLogin < 7;
    
    // Create plan badge
    let planBadgeClass = '';
    if (user.plan === 'starter') {
      planBadgeClass = 'plan-starter';
    } else if (user.plan === 'pro') {
      planBadgeClass = 'plan-pro';
    } else if (user.plan === 'enterprise') {
      planBadgeClass = 'plan-enterprise';
    } else {
      planBadgeClass = 'plan-free';
    }
    
    // Format dates
    const createdDate = new Date(user.createdAt);
    const lastLoginDate = user.lastLogin ? new Date(user.lastLogin) : null;
    
    // Create the row HTML
    row.innerHTML = `
      <td>
        <span class="activity-indicator ${isRecentlyActive ? 'activity-active' : 'activity-inactive'}"
              title="${isRecentlyActive ? 'Recently active' : 'Inactive'}"></span>
        ${user.role === 'admin' ? '<i class="fas fa-user-shield text-danger" title="Admin"></i>' : ''}
      </td>
      <td>${user.name || '<em>No name</em>'}</td>
      <td>${user.email}</td>
      <td><span class="plan-badge ${planBadgeClass}">${formatPlanName(user.plan)}</span></td>
      <td>${formatDate(createdDate)}</td>
      <td>${lastLoginDate ? formatDate(lastLoginDate) : 'Never'}</td>
      <td>
        <div class="btn-group">
          <button type="button" class="btn btn-sm btn-outline-primary view-user-btn" title="View User Details">
            <i class="fas fa-eye"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary edit-user-btn" title="Edit User">
            <i class="fas fa-edit"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-danger delete-user-btn" title="Delete User">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    // Add event listeners to action buttons
    row.querySelector('.view-user-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      viewUser(user._id);
    });
    
    row.querySelector('.edit-user-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      editUser(user._id);
    });
    
    row.querySelector('.delete-user-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteUserModal(user._id, user.name || user.email);
    });
    
    // Make entire row clickable to view user
    row.addEventListener('click', () => {
      viewUser(user._id);
    });
    
    tableBody.appendChild(row);
  });
}

/**
 * Filter users based on search input and selected filter
 * @param {string} filterType - Optional filter type (all, admin, user, free, starter, pro, enterprise)
 */
function filterUsers(filterType) {
  // Get search text
  const searchText = document.getElementById('userSearch').value.toLowerCase();
  
  // Get current filter if not provided
  if (!filterType) {
    const activeFilter = document.querySelector('.filter-item.active');
    filterType = activeFilter ? activeFilter.getAttribute('data-filter') : 'all';
  }
  
  // Filter users
  let filteredUsers = [...allUsers];
  
  // Apply filter type
  if (filterType !== 'all') {
    if (filterType === 'admin') {
      filteredUsers = filteredUsers.filter(user => user.role === 'admin');
    } else if (filterType === 'user') {
      filteredUsers = filteredUsers.filter(user => user.role === 'user');
    } else if (['free', 'starter', 'pro', 'enterprise'].includes(filterType)) {
      filteredUsers = filteredUsers.filter(user => user.plan === filterType);
    }
  }
  
  // Apply search text
  if (searchText) {
    filteredUsers = filteredUsers.filter(user => 
      (user.name && user.name.toLowerCase().includes(searchText)) || 
      user.email.toLowerCase().includes(searchText)
    );
  }
  
  // Update table
  populateUserTable(filteredUsers);
}

/**
 * View user details
 * @param {string} userId - User ID
 */
async function viewUser(userId) {
  try {
    // Find user in our local data
    const user = allUsers.find(u => u._id === userId);
    
    if (!user) {
      showErrorAlert('User not found');
      return;
    }
    
    // Populate user details
    document.getElementById('view-name').textContent = user.name || 'No Name';
    document.getElementById('view-email').textContent = user.email;
    
    // Set user initials
    const initials = user.name 
      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
      : user.email[0].toUpperCase();
    document.getElementById('view-initials').textContent = initials;
    
    // Set role badge
    const roleBadge = document.getElementById('view-role-badge');
    if (user.role === 'admin') {
      roleBadge.textContent = 'Admin';
      roleBadge.className = 'badge bg-danger';
    } else {
      roleBadge.textContent = 'User';
      roleBadge.className = 'badge bg-secondary';
    }
    
    // Set plan badge
    const planBadge = document.getElementById('view-plan-badge');
    planBadge.textContent = formatPlanName(user.plan);
    
    if (user.plan === 'starter') {
      planBadge.className = 'badge bg-warning text-dark';
    } else if (user.plan === 'pro') {
      planBadge.className = 'badge bg-success';
    } else if (user.plan === 'enterprise') {
      planBadge.className = 'badge bg-primary';
    } else {
      planBadge.className = 'badge bg-secondary';
    }
    
    // Set created and last login dates
    document.getElementById('view-created').textContent = formatDate(new Date(user.createdAt));
    document.getElementById('view-last-login').textContent = user.lastLogin ? formatDate(new Date(user.lastLogin)) : 'Never';
    
    // Set subscription status
    if (user.planDetails && user.planDetails.subscriptionEndDate && user.plan !== 'free') {
      const endDate = new Date(user.planDetails.subscriptionEndDate);
      const now = new Date();
      const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      
      document.getElementById('view-subscription').textContent = `${formatPlanName(user.plan)} (${daysRemaining} days left)`;
    } else {
      document.getElementById('view-subscription').textContent = 'Free Plan (No expiration)';
    }
    
    // Set SMTP status
    const smtpStatus = document.getElementById('view-smtp-status');
    if (user.settings && user.settings.smtp && user.settings.smtp.enabled) {
      smtpStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Configured';
    } else {
      smtpStatus.innerHTML = '<i class="fas fa-times-circle text-danger"></i> Not configured';
    }
    
    // Set AI status
    const aiStatus = document.getElementById('view-ai-status');
    if (user.settings && user.settings.openaiApiKey) {
      aiStatus.innerHTML = '<i class="fas fa-check-circle text-success"></i> Enabled';
    } else {
      aiStatus.innerHTML = '<i class="fas fa-times-circle text-danger"></i> Not enabled';
    }
    
    // Set usage stats (these would come from real data in a production implementation)
    document.getElementById('view-lists-count').textContent = '0';
    document.getElementById('view-templates-count').textContent = '0';
    document.getElementById('view-subscribers-count').textContent = '0';
    document.getElementById('view-emails-count').textContent = '0';
    
    // Update progress bars
    document.getElementById('view-lists-progress').style.width = '0%';
    document.getElementById('view-templates-progress').style.width = '0%';
    document.getElementById('view-subscribers-progress').style.width = '0%';
    document.getElementById('view-emails-progress').style.width = '0%';
    
    // Set limits based on plan
    const planLimits = {
      free: {
        lists: 5,
        templates: 10,
        subscribers: 500,
        emails: 5000
      },
      starter: {
        lists: 10,
        templates: 20,
        subscribers: 2000,
        emails: 10000
      },
      pro: {
        lists: 25,
        templates: 50,
        subscribers: 10000,
        emails: 25000
      },
      enterprise: {
        lists: 50,
        templates: 100,
        subscribers: 50000,
        emails: 50000
      }
    };
    
    const limits = planLimits[user.plan] || planLimits.free;
    
    document.getElementById('view-lists-limit').textContent = `0 of ${limits.lists} lists`;
    document.getElementById('view-templates-limit').textContent = `0 of ${limits.templates} templates`;
    document.getElementById('view-subscribers-limit').textContent = `0 of ${limits.subscribers} subscribers`;
    document.getElementById('view-emails-limit').textContent = `0 of ${limits.emails} emails/month`;
    
    // Set plan requests count
    document.getElementById('view-plan-requests-count').textContent = '0';
    
    // Show no plan requests message
    document.getElementById('no-plan-requests').classList.remove('d-none');
    document.getElementById('plan-requests-list').innerHTML = '';
    
    // Set user activity (this would come from real data in a production implementation)
    document.getElementById('user-activity').innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-4">
          <p class="text-muted mb-0">No recent activity found.</p>
        </td>
      </tr>
    `;
    
    // Set edit button user ID
    document.getElementById('viewEditUserBtn').setAttribute('data-user-id', userId);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
    modal.show();
    
  } catch (error) {
    console.error('Error viewing user:', error);
    showErrorAlert('Failed to load user details: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Show edit user modal
 * @param {string} userId - User ID
 */
function editUser(userId) {
  try {
    // Find user in our local data
    const user = allUsers.find(u => u._id === userId);
    
    if (!user) {
      showErrorAlert('User not found');
      return;
    }
    
    // Populate edit form
    document.getElementById('edit-user-id').value = userId;
    document.getElementById('edit-name').value = user.name || '';
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-role').value = user.role;
    document.getElementById('edit-plan').value = user.plan;
    document.getElementById('edit-created').textContent = formatDate(new Date(user.createdAt));
    document.getElementById('edit-last-login').textContent = user.lastLogin ? formatDate(new Date(user.lastLogin)) : 'Never';
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('userEditModal'));
    modal.show();
    
  } catch (error) {
    console.error('Error loading user for edit:', error);
    showErrorAlert('Failed to load user details for editing');
  }
}

/**
 * Save user changes
 */
async function saveUserChanges() {
  try {
    // Get form values
    const userId = document.getElementById('edit-user-id').value;
    const name = document.getElementById('edit-name').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const role = document.getElementById('edit-role').value;
    const plan = document.getElementById('edit-plan').value;
    
    // Validate
    if (!email) {
      showErrorAlert('Email is required');
      return;
    }
    
    // Show loading state
    const saveButton = document.getElementById('saveUserBtn');
    const originalButtonHtml = saveButton.innerHTML;
    saveButton.disabled = true;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';
    
    // Send API request to update user
    const response = await apiPut(`/api/admin/users/${userId}`, {
      name,
      email,
      role,
      plan
    });
    
    // Update the user in our local data
    const userIndex = allUsers.findIndex(u => u._id === userId);
    if (userIndex !== -1) {
      allUsers[userIndex] = response;
    }
    
    // Hide modal
    bootstrap.Modal.getInstance(document.getElementById('userEditModal')).hide();
    
    // Update table
    populateUserTable(allUsers);
    
    // Show success message
    showSuccessAlert('User updated successfully');
    
  } catch (error) {
    console.error('Error saving user:', error);
    showErrorAlert('Failed to save user: ' + (error.message || 'Unknown error'));
    
    // Reset button state
    const saveButton = document.getElementById('saveUserBtn');
    saveButton.disabled = false;
    saveButton.innerHTML = '<i class="fas fa-save me-2"></i> Save Changes';
  }
}

/**
 * Show delete user confirmation modal
 * @param {string} userId - User ID
 * @param {string} userName - User name or email
 */
function showDeleteUserModal(userId, userName) {
  document.getElementById('delete-user-id').value = userId;
  document.getElementById('delete-user-name').textContent = userName;
  
  const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
  modal.show();
}

/**
 * Delete user
 */
async function deleteUser() {
  try {
    const userId = document.getElementById('delete-user-id').value;
    
    // Show loading state
    const deleteButton = document.getElementById('confirmDeleteBtn');
    const originalButtonHtml = deleteButton.innerHTML;
    deleteButton.disabled = true;
    deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Deleting...';
    
    // Send API request to delete user
    await apiDelete(`/api/admin/users/${userId}`);
    
    // Remove the user from our local data
    allUsers = allUsers.filter(u => u._id !== userId);
    
    // Hide modal
    bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
    
    // Update table
    populateUserTable(allUsers);
    
    // Update summary cards
    updateUserSummary(allUsers);
    
    // Show success message
    showSuccessAlert('User deleted successfully');
    
  } catch (error) {
    console.error('Error deleting user:', error);
    showErrorAlert('Failed to delete user: ' + (error.message || 'Unknown error'));
    
    // Reset button state
    const deleteButton = document.getElementById('confirmDeleteBtn');
    deleteButton.disabled = false;
    deleteButton.innerHTML = '<i class="fas fa-trash me-2"></i> Delete User';
  }
}

/**
 * Format plan name for display
 * @param {string} plan - Plan ID (free, starter, pro, enterprise)
 * @returns {string} Formatted plan name
 */
function formatPlanName(plan) {
  if (plan === 'free') return 'Free Plan';
  if (plan === 'starter') return 'Starter Plan';
  if (plan === 'pro') return 'Pro Plan';
  if (plan === 'enterprise') return 'Enterprise Plan';
  return plan;
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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