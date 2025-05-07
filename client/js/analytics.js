// Analytics functionality

document.addEventListener('DOMContentLoaded', () => {
    // Protect this route
    protectRoute();
    
    // Initialize analytics page
    initAnalyticsPage();
});

/**
 * Initialize analytics page
 */
async function initAnalyticsPage() {
    try {
        // Load analytics data
        await loadAnalyticsData();
        
        // Initialize charts
        initCharts();
        
        // Setup date range pickers
        setupDateRangePickers();
        
        // Load campaign performance table
        await loadCampaignPerformanceTable();
    } catch (error) {
        console.error('Error initializing analytics page:', error);
        showToast('error', 'Failed to load analytics data');
    }
}

/**
 * Load analytics data from server
 */
async function loadAnalyticsData() {
    try {
        const analyticsData = await apiGet('/api/analytics');
        
        // Update summary cards
        updateSummaryCards(analyticsData);
        
        // Store data for charts
        window.analyticsData = analyticsData;
    } catch (error) {
        console.error('Error loading analytics data:', error);
        throw error;
    }
}

/**
 * Update summary cards with analytics data
 * @param {Object} data - Analytics data
 */
function updateSummaryCards(data) {
    document.getElementById('totalSubscribers').textContent = data.summary.totalSubscribers;
    document.getElementById('totalCampaigns').textContent = data.summary.totalCampaigns;
    document.getElementById('totalSent').textContent = data.summary.totalSent;
    document.getElementById('avgOpenRate').textContent = `${data.summary.avgOpenRate}%`;
    document.getElementById('avgClickRate').textContent = `${data.summary.avgClickRate}%`;
    document.getElementById('avgBounceRate').textContent = `${data.summary.avgBounceRate}%`;
}

/**
 * Initialize charts
 */
function initCharts() {
    const data = window.analyticsData;
    
    if (!data) {
        console.error('No analytics data available for charts');
        return;
    }
    
    // Email engagement chart
    const engagementCtx = document.getElementById('emailEngagementChart').getContext('2d');
    new Chart(engagementCtx, {
        type: 'doughnut',
        data: {
            labels: ['Opened', 'Clicked', 'Not Opened', 'Bounced'],
            datasets: [{
                data: [
                    data.engagement.openCount,
                    data.engagement.clickCount,
                    data.engagement.notOpenedCount,
                    data.engagement.bounceCount
                ],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                    'rgba(201, 203, 207, 0.5)',
                    'rgba(255, 99, 132, 0.5)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(201, 203, 207, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Email Engagement'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const value = context.raw;
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Campaign performance over time chart
    const timelineCtx = document.getElementById('campaignTimelineChart').getContext('2d');
    new Chart(timelineCtx, {
        type: 'line',
        data: {
            labels: data.timeline.dates,
            datasets: [
                {
                    label: 'Open Rate',
                    data: data.timeline.openRates,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Click Rate',
                    data: data.timeline.clickRates,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Campaign Performance Over Time'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Percentage (%)'
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
    
    // List growth chart
    const growthCtx = document.getElementById('listGrowthChart').getContext('2d');
    new Chart(growthCtx, {
        type: 'bar',
        data: {
            labels: data.listGrowth.months,
            datasets: [
                {
                    label: 'New Subscribers',
                    data: data.listGrowth.newSubscribers,
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Total Subscribers',
                    data: data.listGrowth.totalSubscribers,
                    type: 'line',
                    fill: false,
                    backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Subscriber Growth by Month'
                }
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
                    beginAtZero: true
                }
            }
        }
    });
    
    // Device usage chart
    const deviceCtx = document.getElementById('deviceUsageChart').getContext('2d');
    new Chart(deviceCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(data.deviceUsage),
            datasets: [{
                data: Object.values(data.deviceUsage),
                backgroundColor: [
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 159, 64, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Email Opens by Device'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const value = context.raw;
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: ${percentage}%`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Setup date range pickers
 */
function setupDateRangePickers() {
    const dateRangeForm = document.getElementById('dateRangeForm');
    
    if (!dateRangeForm) return;
    
    dateRangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            showToast('error', 'Please select both start and end dates');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showToast('error', 'Start date must be before end date');
            return;
        }
        
        try {
            const analyticsData = await apiGet(`/api/analytics?startDate=${startDate}&endDate=${endDate}`);
            
            // Update summary cards
            updateSummaryCards(analyticsData);
            
            // Update window data for charts
            window.analyticsData = analyticsData;
            
            // Reinitialize charts
            initCharts();
            
            showToast('success', 'Analytics data updated for selected date range');
        } catch (error) {
            console.error('Error updating analytics data:', error);
            showToast('error', 'Failed to update analytics data');
        }
    });
}

/**
 * Load campaign performance table
 */
async function loadCampaignPerformanceTable() {
    try {
        const campaigns = await apiGet('/api/analytics/campaigns');
        
        const tableContainer = document.getElementById('campaignPerformanceTable');
        
        if (!tableContainer) return;
        
        if (campaigns.length === 0) {
            tableContainer.innerHTML = `
                <div class="alert alert-info">
                    No campaigns available to display performance data.
                </div>
            `;
            return;
        }
        
        // Create the table
        tableContainer.innerHTML = `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Campaign</th>
                        <th>Sent</th>
                        <th>Open Rate</th>
                        <th>Click Rate</th>
                        <th>Bounce Rate</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        `;
        
        const tbody = tableContainer.querySelector('tbody');
        
        campaigns.forEach(campaign => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <a href="/client/pages/campaigns.html" class="campaign-link" data-id="${campaign.id}">
                        ${campaign.name}
                    </a>
                </td>
                <td>${campaign.sent}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 6px;">
                            <div class="progress-bar bg-success" role="progressbar" 
                                style="width: ${campaign.openRate}%" 
                                aria-valuenow="${campaign.openRate}" 
                                aria-valuemin="0" 
                                aria-valuemax="100"></div>
                        </div>
                        <span>${campaign.openRate}%</span>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 6px;">
                            <div class="progress-bar bg-info" role="progressbar" 
                                style="width: ${campaign.clickRate}%" 
                                aria-valuenow="${campaign.clickRate}" 
                                aria-valuemin="0" 
                                aria-valuemax="100"></div>
                        </div>
                        <span>${campaign.clickRate}%</span>
                    </div>
                </td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress flex-grow-1 me-2" style="height: 6px;">
                            <div class="progress-bar bg-danger" role="progressbar" 
                                style="width: ${campaign.bounceRate}%" 
                                aria-valuenow="${campaign.bounceRate}" 
                                aria-valuemin="0" 
                                aria-valuemax="100"></div>
                        </div>
                        <span>${campaign.bounceRate}%</span>
                    </div>
                </td>
                <td>${formatDate(campaign.date)}</td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Add event listeners to campaign links
        const campaignLinks = tableContainer.querySelectorAll('.campaign-link');
        campaignLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const campaignId = e.currentTarget.getAttribute('data-id');
                window.location.href = `/client/pages/campaigns.html?view=${campaignId}`;
            });
        });
    } catch (error) {
        console.error('Error loading campaign performance table:', error);
        throw error;
    }
}
