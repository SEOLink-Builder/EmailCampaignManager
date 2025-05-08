// Authentication related functions

/**
 * User login
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<object>} - User data
 */
async function login(email, password) {
    try {
        const response = await apiPost('/api/auth/login', { email, password });
        
        if (response.user) {
            // Store user info in session storage
            sessionStorage.setItem('user', JSON.stringify(response.user));
            return response.user;
        } else {
            throw new Error(response.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
}

/**
 * User registration
 * @param {string} name - User's name
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<object>} - User data
 */
async function register(name, email, password) {
    try {
        const response = await apiPost('/api/auth/register', { name, email, password });
        
        if (response.user) {
            // Store user info in session storage
            sessionStorage.setItem('user', JSON.stringify(response.user));
            return response.user;
        } else {
            throw new Error(response.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
}

/**
 * Delete user account
 * @param {string} password - User's password for confirmation
 * @returns {Promise<void>}
 */
async function deleteAccount(password) {
    try {
        const response = await apiDelete('/api/auth/delete-account', { password });
        
        if (response.success || response.message) {
            // Clear session storage
            sessionStorage.removeItem('user');
            return response;
        } else {
            throw new Error('Account deletion failed');
        }
    } catch (error) {
        console.error('Delete account error:', error);
        throw error;
    }
}

/**
 * User logout
 * @returns {Promise<void>}
 */
async function logout() {
    try {
        await apiPost('/api/auth/logout', {});
        // Clear session storage
        sessionStorage.removeItem('user');
        // Redirect to login page
        window.location.href = '/client/pages/auth.html';
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
function isLoggedIn() {
    return !!sessionStorage.getItem('user');
}

/**
 * Get current user
 * @returns {object|null}
 */
function getCurrentUser() {
    const userStr = sessionStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Protect route - redirect to login if not authenticated
 */
function protectRoute() {
    if (!isLoggedIn()) {
        window.location.href = '/client/pages/auth.html';
    }
}

// Event listener for login form
document.addEventListener('DOMContentLoaded', () => {
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
    
    // Check if we need to show admin login info
    const urlParams = new URLSearchParams(window.location.search);
    const isAdmin = urlParams.get('admin') === 'true';
    const redirectUrl = urlParams.get('redirect');
    
    if (isAdmin) {
        // Add admin login indicator
        const loginCard = document.querySelector('.card-login .card-header');
        if (loginCard) {
            loginCard.innerHTML = '<h4 class="mb-0">Admin Login</h4><span class="badge bg-danger ms-2">Admin Area</span>';
        }
        
        // Change login form title
        const loginTitle = document.querySelector('.card-login .card-title');
        if (loginTitle) {
            loginTitle.textContent = 'Enter your admin credentials';
        }
    }
    
    // Check if we're on the auth page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            const loginStatus = document.getElementById('loginStatus');
            
            try {
                loginStatus.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Logging in...';
                loginStatus.className = 'text-info';
                
                const user = await login(emailInput.value, passwordInput.value);
                
                // If this is an admin login request, verify role
                if (isAdmin && user.role !== 'admin') {
                    throw new Error('You do not have admin privileges');
                }
                
                // Redirect to the appropriate page
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                } else if (isAdmin && user.role === 'admin') {
                    window.location.href = '/client/admin/dashboard.html';
                } else {
                    window.location.href = '/client/pages/dashboard.html';
                }
            } catch (error) {
                loginStatus.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i> ${error.message || 'Login failed.'}`;
                loginStatus.className = 'text-danger';
            }
        });
    }
    
    // Event listener for registration form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const nameInput = document.getElementById('registerName');
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            const passwordConfirmInput = document.getElementById('registerPasswordConfirm');
            const registerStatus = document.getElementById('registerStatus');
            
            // Validate passwords match
            if (passwordInput.value !== passwordConfirmInput.value) {
                registerStatus.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i> Passwords do not match';
                registerStatus.className = 'text-danger';
                return;
            }
            
            try {
                registerStatus.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creating account...';
                registerStatus.className = 'text-info';
                
                await register(nameInput.value, emailInput.value, passwordInput.value);
                window.location.href = '/client/pages/dashboard.html';
            } catch (error) {
                registerStatus.innerHTML = `<i class="fas fa-exclamation-circle me-2"></i> ${error.message || 'Registration failed.'}`;
                registerStatus.className = 'text-danger';
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });
    }
    
    // If on a protected page, verify authentication
    if (window.location.pathname.includes('/pages/') && 
        !window.location.pathname.includes('/pages/auth.html')) {
        protectRoute();
    }
});
