// API utilities for making requests to the server

/**
 * Base URL for API requests
 */
const API_BASE_URL = '';

/**
 * Get authentication token from session storage
 * @returns {string|null} Auth token
 */
function getAuthToken() {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user).token : null;
}

/**
 * Make a GET request to the API
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} Response data
 */
async function apiGet(endpoint) {
    try {
        const token = getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`GET ${endpoint} failed:`, error);
        throw error;
    }
}

/**
 * Make a POST request to the API
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request data
 * @returns {Promise<any>} Response data
 */
async function apiPost(endpoint, data) {
    try {
        const token = getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`POST ${endpoint} failed:`, error);
        throw error;
    }
}

/**
 * Make a PUT request to the API
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request data
 * @returns {Promise<any>} Response data
 */
async function apiPut(endpoint, data) {
    try {
        const token = getAuthToken();
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`PUT ${endpoint} failed:`, error);
        throw error;
    }
}

/**
 * Make a DELETE request to the API
 * @param {string} endpoint - API endpoint
 * @param {object} data - Optional request data
 * @returns {Promise<any>} Response data
 */
async function apiDelete(endpoint, data = null) {
    try {
        const token = getAuthToken();
        
        const options = {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            }
        };
        
        // Add body if data is provided
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `Request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`DELETE ${endpoint} failed:`, error);
        throw error;
    }
}
