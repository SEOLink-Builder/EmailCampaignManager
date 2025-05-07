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
        
        // Initialize action history log
        await loadActionHistory();
        
        // Initialize charts (now async with data loading)
        await initCharts();
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
async function initCharts() {
    try {
        // Get campaign stats for chart 
        const stats = await apiGet('/api/analytics');
        
        // Check if we have data for the charts
        const hasCampaignData = stats && stats.timeline && stats.timeline.dates && stats.timeline.dates.length > 0;
        const hasSubscriberData = stats && stats.listGrowth && stats.listGrowth.months && stats.listGrowth.months.length > 0;
        
        // Campaign performance chart
        if (hasCampaignData) {
            const performanceChart = new Chart(
                document.getElementById('campaignPerformanceChart'),
                {
                    type: 'line',
                    data: {
                        labels: stats.timeline.dates,
                        datasets: [
                            {
                                label: 'Opens',
                                data: stats.timeline.openRates,
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                                tension: 0.3
                            },
                            {
                                label: 'Clicks',
                                data: stats.timeline.clickRates,
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
                                    text: 'Rate (%)'
                                },
                                suggestedMin: 0,
                                suggestedMax: 100
                            }
                        }
                    }
                }
            );
        } else {
            // Display a message if no data
            const chartContainer = document.getElementById('campaignPerformanceChart').parentNode;
            chartContainer.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-chart-line fa-3x mb-3"></i>
                    <p>No campaign data available yet</p>
                    <a href="/client/pages/campaigns.html" class="btn btn-sm btn-primary mt-2">
                        <i class="fas fa-plus me-2"></i> Create Your First Campaign
                    </a>
                </div>
            `;
        }
        
        // List growth chart
        if (hasSubscriberData) {
            const growthChart = new Chart(
                document.getElementById('listGrowthChart'),
                {
                    type: 'bar',
                    data: {
                        labels: stats.listGrowth.months,
                        datasets: [
                            {
                                label: 'New Subscribers',
                                data: stats.listGrowth.newSubscribers,
                                backgroundColor: 'rgba(153, 102, 255, 0.2)',
                                borderColor: 'rgba(153, 102, 255, 1)',
                                borderWidth: 1
                            },
                            {
                                label: 'Total Subscribers',
                                data: stats.listGrowth.totalSubscribers,
                                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                borderColor: 'rgba(54, 162, 235, 1)',
                                borderWidth: 1,
                                type: 'line'
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
        } else {
            // Display a message if no data
            const chartContainer = document.getElementById('listGrowthChart').parentNode;
            chartContainer.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-users fa-3x mb-3"></i>
                    <p>No subscriber data available yet</p>
                    <a href="/client/pages/lists.html" class="btn btn-sm btn-primary mt-2">
                        <i class="fas fa-plus me-2"></i> Create Your First List
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error initializing charts:', error);
        
        // Show error message for both charts
        ['campaignPerformanceChart', 'listGrowthChart'].forEach(chartId => {
            const chartContainer = document.getElementById(chartId).parentNode;
            chartContainer.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                    <p>Could not load chart data</p>
                </div>
            `;
        });
    }
}

/**
 * Load and display action history
 */
async function loadActionHistory() {
    try {
        // We'll use the same API endpoint as recent activity but process the data differently
        const activities = await apiGet('/api/dashboard/recent-activity');
        
        const historyContainer = document.getElementById('actionHistoryList');
        const emptyMessage = document.getElementById('emptyHistoryMessage');
        
        // Clear previous content except the empty message
        Array.from(historyContainer.children).forEach(child => {
            if (child !== emptyMessage) {
                child.remove();
            }
        });
        
        if (activities.length === 0) {
            emptyMessage.style.display = 'block';
            return;
        }
        
        // Hide empty message since we have data
        emptyMessage.style.display = 'none';
        
        // Create history elements
        activities.forEach(activity => {
            const timestamp = new Date(activity.timestamp);
            const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateString = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
            
            const actionItem = document.createElement('div');
            actionItem.className = `history-item d-flex py-2 border-bottom ${activity.type}-action`;
            actionItem.dataset.actionType = activity.type;
            
            let iconClass = 'fa-envelope';
            let actionTypeLabel = 'Email';
            
            if (activity.type === 'list') {
                iconClass = 'fa-list';
                actionTypeLabel = 'List';
            } else if (activity.type === 'template') {
                iconClass = 'fa-file-alt';
                actionTypeLabel = 'Template';
            } else if (activity.type === 'campaign') {
                iconClass = 'fa-paper-plane';
                actionTypeLabel = 'Campaign';
            }
            
            actionItem.innerHTML = `
                <div class="time-col text-muted small me-3 text-nowrap">
                    <div>${timeString}</div>
                    <div>${dateString}</div>
                </div>
                <div class="icon-col me-3">
                    <i class="fas ${iconClass} text-primary"></i>
                </div>
                <div class="content-col">
                    <div class="d-flex align-items-center">
                        <span class="badge bg-light text-dark me-2">${actionTypeLabel}</span>
                        <strong>${activity.title.replace(/^(Campaign|List|Template): /, '')}</strong>
                    </div>
                    <div class="small text-muted">${activity.description}</div>
                </div>
            `;
            
            historyContainer.appendChild(actionItem);
        });
        
        // Set up filter functionality
        const filterLinks = document.querySelectorAll('[data-filter]');
        filterLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Update active state
                filterLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                const filter = link.dataset.filter;
                const historyItems = document.querySelectorAll('.history-item');
                
                historyItems.forEach(item => {
                    if (filter === 'all' || item.dataset.actionType === filter) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
        
    } catch (error) {
        console.error('Error loading action history:', error);
        const historyContainer = document.getElementById('actionHistoryList');
        historyContainer.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-exclamation-circle mb-3"></i>
                <p>Could not load action history</p>
            </div>
        `;
    }
}
