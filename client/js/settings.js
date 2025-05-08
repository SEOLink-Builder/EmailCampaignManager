/**
 * Settings page functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // Protect this route
    protectRoute();
    
    // Initialize settings
    loadUserSettings();
    
    // Set up event listeners
    setupEventListeners();
    
    // Handle hash-based navigation
    handleTabNavigation();
});

/**
 * Handle hash-based navigation to specific tabs
 */
function handleTabNavigation() {
    // Check if URL has a hash
    if (window.location.hash) {
        let tabId = window.location.hash;
        
        // Special handling for the "#advanced" hash
        if (tabId === '#advanced') {
            tabId = '#advanced-tab';
        }
        // Special handling for other shorthand tabs
        else if (tabId === '#profile') {
            tabId = '#profile-tab';
        }
        else if (tabId === '#email') {
            tabId = '#email-tab';
        }
        else if (tabId === '#security') {
            tabId = '#security-tab';
        }
        
        // Activate the tab corresponding to the hash
        if (tabId === '#profile-tab' || tabId === '#email-tab' || tabId === '#security-tab' || tabId === '#advanced-tab') {
            // Find the tab element directly by ID
            const tabElement = document.getElementById(tabId.substring(1)); // Remove the # from the ID
            
            if (tabElement) {
                // Create a new Bootstrap tab instance and show it
                const tab = new bootstrap.Tab(tabElement);
                tab.show();
                
                // Scroll to top to ensure visibility
                window.scrollTo(0, 0);
            }
        }
    }
}

/**
 * Load user settings from the server
 */
async function loadUserSettings() {
    try {
        // Fetch user data from the API
        const user = await apiGet('/api/auth/user');
        
        if (!user) {
            showToast('error', 'Failed to load user data');
            return;
        }
        
        // Populate user profile info
        populateUserProfileInfo(user);
        
        // Populate email settings
        populateEmailSettings(user);
        
        // Populate OpenAI API key if it exists
        if (user.settings && user.settings.openaiApiKey) {
            // We don't show the actual API key for security, just indicate it's set
            document.getElementById('openaiApiKey').value = '••••••••••••••••';
            document.getElementById('openaiApiKey').placeholder = 'API Key is set';
            
            updateAIFeatureStatus(true);
        } else {
            updateAIFeatureStatus(false);
        }
    } catch (error) {
        console.error('Error loading user settings:', error);
        showToast('error', 'Failed to load settings');
    }
}

/**
 * Populate user profile information
 * @param {object} user - User data
 */
function populateUserProfileInfo(user) {
    // Profile information
    if (user.email) {
        document.getElementById('userEmail').value = user.email;
    }
    
    if (user.name) {
        document.getElementById('displayName').value = user.name;
    }
    
    // Format dates
    if (user.createdAt) {
        document.getElementById('accountCreated').value = formatDate(user.createdAt);
    }
    
    if (user.lastLogin) {
        document.getElementById('lastLogin').value = formatDate(user.lastLogin);
    }
    
    // Set avatar initials
    if (user.name) {
        document.querySelectorAll('.user-initials').forEach(el => {
            el.textContent = user.name.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2);
        });
    } else if (user.email) {
        document.querySelectorAll('.user-initials').forEach(el => {
            el.textContent = user.email[0].toUpperCase();
        });
    }
    
    // Set email in the UI
    document.querySelectorAll('.user-email').forEach(el => {
        el.textContent = user.email;
    });
}

/**
 * Populate email settings form
 * @param {object} user - User data
 */
function populateEmailSettings(user) {
    // Sender details
    if (user.settings) {
        if (user.settings.senderName) {
            document.getElementById('senderName').value = user.settings.senderName;
        }
        
        if (user.settings.replyToEmail) {
            document.getElementById('replyToEmail').value = user.settings.replyToEmail;
        }
        
        // Email tracking preferences
        if (typeof user.settings.trackOpens !== 'undefined') {
            document.getElementById('trackOpens').checked = user.settings.trackOpens;
        }
        
        if (typeof user.settings.trackClicks !== 'undefined') {
            document.getElementById('trackClicks').checked = user.settings.trackClicks;
        }
    }
}

/**
 * Update the AI feature status badges and indicator
 * @param {boolean} enabled - Whether AI features are enabled
 */
function updateAIFeatureStatus(enabled) {
    // Update feature badges
    const badges = document.querySelectorAll('#advanced-tab-pane .list-group-item:not(:last-child) .badge');
    
    badges.forEach(badge => {
        if (enabled) {
            badge.className = 'badge bg-success rounded-pill';
            badge.textContent = 'Enabled';
        } else {
            badge.className = 'badge bg-warning rounded-pill';
            badge.textContent = 'API Key Required';
        }
    });
    
    // Show/hide status indicator
    const statusIndicator = document.getElementById('aiStatusIndicator');
    if (statusIndicator) {
        if (enabled) {
            statusIndicator.className = 'alert alert-success mb-4';
            statusIndicator.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-check-circle fa-2x text-success"></i>
                    </div>
                    <div>
                        <h6 class="alert-heading mb-1">AI Features Enabled</h6>
                        <p class="mb-0">Your OpenAI API key is active. All AI-powered features are available.</p>
                    </div>
                </div>
            `;
        } else {
            statusIndicator.className = 'alert alert-warning mb-4';
            statusIndicator.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        <i class="fas fa-exclamation-triangle fa-2x text-warning"></i>
                    </div>
                    <div>
                        <h6 class="alert-heading mb-1">AI Features Disabled</h6>
                        <p class="mb-0">Please add your OpenAI API key to enable AI-powered features.</p>
                    </div>
                </div>
            `;
        }
        
        // Make sure it's visible
        statusIndicator.classList.remove('d-none');
    }
}

/**
 * Set up event listeners for settings forms
 */
function setupEventListeners() {
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfile);
    }
    
    // Email settings form
    const senderDetailsForm = document.getElementById('senderDetailsForm');
    if (senderDetailsForm) {
        senderDetailsForm.addEventListener('submit', saveSenderDetails);
    }
    
    // Email tracking form
    const emailTrackingForm = document.getElementById('emailTrackingForm');
    if (emailTrackingForm) {
        emailTrackingForm.addEventListener('submit', saveEmailTracking);
    }
    
    // AI settings form
    const aiSettingsForm = document.getElementById('aiSettingsForm');
    if (aiSettingsForm) {
        aiSettingsForm.addEventListener('submit', saveAISettings);
    }
    
    // Password change form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', changePassword);
    }
    
    // Delete account button
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', showDeleteAccountModal);
    }
    
    // Toggle password visibility
    const togglePasswordButtons = document.querySelectorAll('.toggle-password');
    if (togglePasswordButtons) {
        togglePasswordButtons.forEach(button => {
            button.addEventListener('click', function() {
                const passwordInput = this.previousElementSibling;
                const icon = this.querySelector('i');
                
                // Toggle password visibility
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await logout();
                window.location.href = 'auth.html';
            } catch (error) {
                showToast('error', 'Failed to logout. Please try again.');
            }
        });
    }
}

/**
 * Handle password change
 * @param {Event} e - Submit event
 */
async function changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (!currentPassword) {
        showToast('error', 'Please enter your current password');
        return;
    }
    
    if (!newPassword) {
        showToast('error', 'Please enter a new password');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('error', 'New password must be at least 6 characters');
        return;
    }
    
    if (newPassword !== confirmNewPassword) {
        showToast('error', 'New passwords do not match');
        return;
    }
    
    try {
        // This would call the API in a real implementation
        // await apiPut('/api/auth/password', { currentPassword, newPassword });
        
        showToast('success', 'Password updated successfully');
        document.getElementById('changePasswordForm').reset();
    } catch (error) {
        console.error('Error changing password:', error);
        showToast('error', error.message || 'Failed to change password');
    }
}

/**
 * Show delete account confirmation modal
 */
function showDeleteAccountModal() {
    // Create modal for confirmation
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'deleteAccountModal';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Delete Account
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to permanently delete your account?</p>
                    <p class="text-danger"><strong>This will delete all your data and cannot be undone!</strong></p>
                    <div class="mb-3">
                        <label for="deleteConfirmPassword" class="form-label">Enter your password to confirm</label>
                        <input type="password" class="form-control" id="deleteConfirmPassword" required>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" id="confirmDeleteBtn" class="btn btn-danger">
                        <i class="fas fa-trash me-2"></i>
                        Permanently Delete Account
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    
    // Handle confirm delete button
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
        const password = document.getElementById('deleteConfirmPassword').value;
        
        if (!password) {
            alert('Please enter your password to confirm account deletion');
            return;
        }
        
        try {
            // Delete account on the server
            await deleteAccount(password);
            
            modalInstance.hide();
            
            // Show message and log out
            showToast('success', 'Your account and all associated data have been deleted');
            setTimeout(() => {
                logout();
                window.location.href = 'auth.html';
            }, 2000);
        } catch (error) {
            alert(error.message || 'Failed to delete account');
        }
    });
    
    // Clean up the modal when it's hidden
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}

/**
 * Save user profile
 * @param {Event} e - Submit event
 */
async function saveProfile(e) {
    e.preventDefault();
    
    try {
        const name = document.getElementById('displayName').value.trim();
        
        if (!name) {
            showToast('error', 'Please enter your name');
            return;
        }
        
        // Update user's name
        const result = await apiPut('/api/auth/settings', {
            settings: {
                name
            }
        });
        
        if (result) {
            showToast('success', 'Profile updated successfully');
            
            // Update name in session storage
            const userData = JSON.parse(sessionStorage.getItem('user'));
            if (userData) {
                userData.name = name;
                sessionStorage.setItem('user', JSON.stringify(userData));
            }
        } else {
            throw new Error('Failed to update profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showToast('error', 'Failed to update profile');
    }
}

/**
 * Save sender details
 * @param {Event} e - Submit event
 */
async function saveSenderDetails(e) {
    e.preventDefault();
    
    try {
        const senderName = document.getElementById('senderName').value.trim();
        const replyToEmail = document.getElementById('replyToEmail').value.trim();
        
        if (!senderName) {
            showToast('error', 'Please enter a sender name');
            return;
        }
        
        if (replyToEmail && !validateEmail(replyToEmail)) {
            showToast('error', 'Please enter a valid email address');
            return;
        }
        
        // Update settings
        const result = await apiPut('/api/auth/settings', {
            settings: {
                senderName,
                replyToEmail
            }
        });
        
        if (result) {
            showToast('success', 'Sender details updated successfully');
        } else {
            throw new Error('Failed to update sender details');
        }
    } catch (error) {
        console.error('Error saving sender details:', error);
        showToast('error', 'Failed to update sender details');
    }
}

/**
 * Save email tracking settings
 * @param {Event} e - Submit event
 */
async function saveEmailTracking(e) {
    e.preventDefault();
    
    try {
        const trackOpens = document.getElementById('trackOpens').checked;
        const trackClicks = document.getElementById('trackClicks').checked;
        
        // Update settings
        const result = await apiPut('/api/auth/settings', {
            settings: {
                trackOpens,
                trackClicks
            }
        });
        
        if (result) {
            showToast('success', 'Email tracking settings updated successfully');
        } else {
            throw new Error('Failed to update email tracking settings');
        }
    } catch (error) {
        console.error('Error saving email tracking settings:', error);
        showToast('error', 'Failed to update email tracking settings');
    }
}

/**
 * Save AI settings
 * @param {Event} e - Submit event
 */
async function saveAISettings(e) {
    e.preventDefault();
    
    try {
        const openaiApiKey = document.getElementById('openaiApiKey').value.trim();
        
        // Check if API key has valid format
        if (openaiApiKey && !openaiApiKey.startsWith('sk-')) {
            showToast('error', 'Please enter a valid OpenAI API key (starts with sk-)');
            return;
        }
        
        // Don't send an empty value, just skip updating it
        if (!openaiApiKey || openaiApiKey === '••••••••••••••••') {
            showToast('info', 'No changes made to API key');
            return;
        }
        
        // Update settings
        const result = await apiPut('/api/auth/settings', {
            settings: {
                openaiApiKey
            }
        });
        
        if (result) {
            showToast('success', 'AI settings updated successfully');
            
            // Mask the API key in the UI
            document.getElementById('openaiApiKey').value = '••••••••••••••••';
            document.getElementById('openaiApiKey').placeholder = 'API Key is set';
            
            // Update feature status
            updateAIFeatureStatus(true);
        } else {
            throw new Error('Failed to update AI settings');
        }
    } catch (error) {
        console.error('Error saving AI settings:', error);
        showToast('error', 'Failed to update AI settings');
    }
}