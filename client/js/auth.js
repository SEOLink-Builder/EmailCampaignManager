// Authentication related functions

/**
 * User login
 * @param {string} email - User's email
 * @returns {Promise<object>} - User data
 */
async function login(email) {
    try {
        const response = await apiPost('/api/auth/login', { email });
        
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
 * @param {string} email - User's email
 * @returns {Promise<object>} - User data
 */
async function register(email) {
    try {
        const response = await apiPost('/api/auth/register', { email });
        
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
    // Check if we're on the auth page
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('loginEmail');
            const loginStatus = document.getElementById('loginStatus');
            
            try {
                loginStatus.textContent = 'Logging in...';
                loginStatus.className = 'text-info';
                
                await login(emailInput.value);
                window.location.href = '/client/pages/dashboard.html';
            } catch (error) {
                loginStatus.textContent = error.message || 'Login failed.';
                loginStatus.className = 'text-danger';
            }
        });
    }
    
    // Event listener for registration form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('registerEmail');
            const registerStatus = document.getElementById('registerStatus');
            
            try {
                registerStatus.textContent = 'Creating account...';
                registerStatus.className = 'text-info';
                
                await register(emailInput.value);
                window.location.href = '/client/pages/dashboard.html';
            } catch (error) {
                registerStatus.textContent = error.message || 'Registration failed.';
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
