// Dashboard functionality

document.addEventListener('DOMContentLoaded', () => {
    // Protect this route
    protectRoute();
    
    // Initialize dashboard components
    initDashboard();
});

/**
 * Initialize dashboard components
 */
async function initDashboard() {
    try {
        // Load user info
        displayUserInfo();
        
        // Load dashboard statistics
        await loadDashboardStats();
        
        // Initialize recent activity feed
        await loadRecentActivity();
        
        // Initialize charts
        initCharts();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('error', 'Failed to load dashboard data');
    }
}

/**
 * Display user information
 */
function displayUserInfo() {
    const user = getCurrentUser();
    const userDisplayElements = document.querySelectorAll('.user-email');
    
    userDisplayElements.forEach(element => {
        element.textContent = user.email;
    });
}

/**
 * Load dashboard statistics
 */
async function loadDashboardStats() {
    try {
        const stats = await apiGet('/api/dashboard/stats');
        
        // Update stats in the UI
        document.getElementById('totalSubscribers').textContent = stats.totalSubscribers;
        document.getElementById('totalCampaigns').textContent = stats.totalCampaigns;
        document.getElementById('totalSent').textContent = stats.totalSent;
        document.getElementById('openRate').textContent = `${stats.openRate}%`;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        throw error;
    }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
    try {
        const activities = await apiGet('/api/dashboard/recent-activity');
        
        const activityContainer = document.getElementById('recentActivityList');
        activityContainer.innerHTML = '';
        
        if (activities.length === 0) {
            activityContainer.innerHTML = '<div class="text-muted text-center py-4">No recent activity</div>';
            return;
        }
        
        // Create activity elements
        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item d-flex align-items-center mb-3';
            
            let iconClass = 'fa-envelope';
            if (activity.type === 'list') iconClass = 'fa-list';
            if (activity.type === 'template') iconClass = 'fa-file-alt';
            if (activity.type === 'campaign') iconClass = 'fa-paper-plane';
            
            activityItem.innerHTML = `
                <div class="activity-icon me-3 bg-light rounded-circle p-2">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="activity-content">
                    <div class="fw-bold">${activity.title}</div>
                    <div class="text-muted small">${activity.description}</div>
                    <div class="text-muted smaller">${formatDate(activity.timestamp)}</div>
                </div>
            `;
            
            activityContainer.appendChild(activityItem);
        });
    } catch (error) {
        console.error('Error loading recent activity:', error);
        throw error;
    }
}

/**
 * Initialize charts
 */
function initCharts() {
    // Campaign performance chart
    const performanceChart = new Chart(
        document.getElementById('campaignPerformanceChart'),
        {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [
                    {
                        label: 'Opens',
                        data: [65, 59, 80, 81],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.3
                    },
                    {
                        label: 'Clicks',
                        data: [28, 48, 40, 45],
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Campaign Performance Trends'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Count'
                        },
                        suggestedMin: 0,
                    }
                }
            }
        }
    );
    
    // List growth chart
    const growthChart = new Chart(
        document.getElementById('listGrowthChart'),
        {
            type: 'bar',
            data: {
                labels: ['January', 'February', 'March', 'April'],
                datasets: [
                    {
                        label: 'New Subscribers',
                        data: [12, 19, 3, 5],
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Unsubscribers',
                        data: [2, 3, 1, 2],
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Subscriber Growth'
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Month'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Subscribers'
                        },
                        suggestedMin: 0,
                    }
                }
            }
        }
    );
}
