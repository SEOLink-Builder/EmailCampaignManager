/**
 * Admin System Statistics JavaScript
 */

// When document is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Protect admin route and initialize dashboard
  await protectAdminRoute();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load system statistics
  await loadSystemStatistics();
  
  // Initialize charts
  initCharts();
  
  // Load database statistics
  await loadDatabaseStatistics();
});

/**
 * Setup event listeners for statistics page
 */
function setupEventListeners() {
  // Sidebar toggle
  document.getElementById('sidebarCollapse').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('content').classList.toggle('active');
  });
  
  // Logout links
  document.getElementById('logout-link').addEventListener('click', logout);
  document.getElementById('logout-link-dropdown').addEventListener('click', logout);
  
  // Time range buttons for performance chart
  document.querySelectorAll('.time-range').forEach(button => {
    button.addEventListener('click', function() {
      document.querySelectorAll('.time-range').forEach(btn => btn.classList.remove('active'));
      this.classList.add('active');
      
      const range = this.dataset.range;
      updatePerformanceChart(range);
    });
  });
  
  // Refresh database stats button
  document.getElementById('refreshDbStats').addEventListener('click', async function() {
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Refreshing...';
    
    await loadDatabaseStatistics();
    
    this.disabled = false;
    this.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh';
  });
}

/**
 * Load system statistics
 */
async function loadSystemStatistics() {
  try {
    const response = await apiGet('/api/admin/system-stats');
    
    if (response.success) {
      updateSystemStatsCards(response.data);
    } else {
      showErrorAlert('Failed to load system statistics');
    }
  } catch (error) {
    console.error('Error loading system statistics:', error);
    showErrorAlert('Error loading system statistics');
  }
}

/**
 * Update system statistics cards with real data
 * @param {Object} data - System statistics data
 */
function updateSystemStatsCards(data) {
  // Server uptime
  const uptime = data.uptime || { days: 0, hours: 0, minutes: 0 };
  document.getElementById('server-uptime').textContent = 
    `${uptime.days}d ${uptime.hours}h ${uptime.minutes}m`;
  
  // Memory usage
  const memory = data.memory || { used: 0, total: 0, percentage: 0 };
  document.getElementById('memory-usage').textContent = 
    `${formatSize(memory.used)} / ${formatSize(memory.total)}`;
  document.getElementById('memory-progress').style.width = `${memory.percentage}%`;
  
  // CPU load
  const cpu = data.cpu || { load: 0, cores: 0 };
  document.getElementById('cpu-load').textContent = 
    `${cpu.load.toFixed(1)}% / ${cpu.cores} cores`;
  document.getElementById('cpu-progress').style.width = `${cpu.load}%`;
  
  // Active connections
  const connections = data.connections || { total: 0, active: 0 };
  document.getElementById('active-connections').textContent = connections.total;
  document.getElementById('active-users').textContent = connections.active;
  
  // Remove loading spinners
  document.querySelectorAll('.loading-spinner').forEach(spinner => {
    spinner.style.display = 'none';
  });
  
  // Show dashboard content
  document.querySelector('.dashboard-content').style.display = 'block';
}

/**
 * Initialize charts
 */
function initCharts() {
  // System Performance Chart
  const performanceCtx = document.getElementById('systemPerformanceChart').getContext('2d');
  window.performanceChart = new Chart(performanceCtx, {
    type: 'line',
    data: {
      labels: generateTimeLabels(24),
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: generateRandomData(24, 10, 60),
          borderColor: '#4e73df',
          backgroundColor: 'rgba(78, 115, 223, 0.05)',
          pointBackgroundColor: '#4e73df',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Memory Usage (%)',
          data: generateRandomData(24, 30, 80),
          borderColor: '#1cc88a',
          backgroundColor: 'rgba(28, 200, 138, 0.05)',
          pointBackgroundColor: '#1cc88a',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Disk I/O (MB/s)',
          data: generateRandomData(24, 5, 40),
          borderColor: '#f6c23e',
          backgroundColor: 'rgba(246, 194, 62, 0.05)',
          pointBackgroundColor: '#f6c23e',
          tension: 0.3,
          fill: true
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            callback: function(value) {
              return value + '%';
            }
          }
        }
      }
    }
  });
  
  // Resource Distribution Chart
  const resourceCtx = document.getElementById('resourceDistributionChart').getContext('2d');
  window.resourceChart = new Chart(resourceCtx, {
    type: 'doughnut',
    data: {
      labels: ['Email Processing', 'Database Operations', 'Authentication', 'API Requests', 'Other'],
      datasets: [{
        data: [35, 25, 15, 15, 10],
        backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'],
        hoverBackgroundColor: ['#3a5ccc', '#17a673', '#2c9faf', '#dda20a', '#d52a1a'],
        hoverBorderColor: "rgba(234, 236, 244, 1)",
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      cutout: '70%'
    }
  });
  
  // Email Traffic Chart
  const emailTrafficCtx = document.getElementById('emailTrafficChart').getContext('2d');
  window.emailTrafficChart = new Chart(emailTrafficCtx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Sent',
          data: generateRandomData(7, 500, 2000),
          backgroundColor: 'rgba(78, 115, 223, 0.8)',
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: 'Delivered',
          data: generateRandomData(7, 450, 1900),
          backgroundColor: 'rgba(28, 200, 138, 0.8)',
          barPercentage: 0.6,
          categoryPercentage: 0.7
        },
        {
          label: 'Opened',
          data: generateRandomData(7, 200, 1000),
          backgroundColor: 'rgba(246, 194, 62, 0.8)',
          barPercentage: 0.6,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  });
  
  // Hide loading spinners
  document.querySelectorAll('.chart-container .loading-spinner').forEach(spinner => {
    spinner.style.display = 'none';
  });
}

/**
 * Update performance chart based on selected time range
 * @param {string} range - Time range (24h, 7d, 30d)
 */
function updatePerformanceChart(range) {
  let dataPoints = 24;
  let labels = [];
  
  switch (range) {
    case '7d':
      dataPoints = 7;
      labels = generateDayLabels(7);
      break;
    case '30d':
      dataPoints = 30;
      labels = generateDayLabels(30);
      break;
    default: // 24h
      dataPoints = 24;
      labels = generateTimeLabels(24);
      break;
  }
  
  // Update chart data
  window.performanceChart.data.labels = labels;
  window.performanceChart.data.datasets.forEach((dataset, index) => {
    let min = 10, max = 60;
    if (index === 1) { // Memory usage
      min = 30;
      max = 80;
    } else if (index === 2) { // Disk I/O
      min = 5;
      max = 40;
    }
    dataset.data = generateRandomData(dataPoints, min, max);
  });
  
  window.performanceChart.update();
}

/**
 * Load database statistics
 */
async function loadDatabaseStatistics() {
  try {
    const response = await apiGet('/api/admin/db-stats');
    
    if (response.success) {
      updateDatabaseStatsTable(response.data);
    } else {
      showErrorAlert('Failed to load database statistics');
    }
  } catch (error) {
    console.error('Error loading database statistics:', error);
    showErrorAlert('Error loading database statistics');
  }
}

/**
 * Update database statistics table
 * @param {Array} collections - Array of collection statistics
 */
function updateDatabaseStatsTable(collections) {
  const tableBody = document.getElementById('db-stats-table');
  
  if (!collections || collections.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4">
          <div class="alert alert-info mb-0">
            No database statistics available
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  
  collections.forEach(collection => {
    const statusClass = getStatusClass(collection.status);
    
    html += `
      <tr>
        <td class="align-middle">
          <strong>${collection.name}</strong>
        </td>
        <td class="align-middle">
          ${formatNumber(collection.count)}
        </td>
        <td class="align-middle">
          ${formatSize(collection.size)}
        </td>
        <td class="align-middle">
          <span class="badge ${statusClass}">${collection.status}</span>
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

/**
 * Generate time labels for chart
 * @param {number} count - Number of labels to generate
 * @returns {Array} Array of time labels
 */
function generateTimeLabels(count) {
  const labels = [];
  const now = new Date();
  const hours = now.getHours();
  
  for (let i = count; i >= 0; i--) {
    let hour = (hours - i + 24) % 24;
    labels.push(`${hour}:00`);
  }
  
  return labels.slice(0, count);
}

/**
 * Generate day labels for chart
 * @param {number} count - Number of days to generate
 * @returns {Array} Array of day labels
 */
function generateDayLabels(count) {
  const labels = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    labels.push(`${dayName} ${dayNum}`);
  }
  
  return labels;
}

/**
 * Generate random data for charts
 * @param {number} count - Number of data points
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {Array} Array of random data points
 */
function generateRandomData(count, min, max) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push(Math.floor(Math.random() * (max - min + 1)) + min);
  }
  return data;
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format file size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get status class for badge
 * @param {string} status - Status string
 * @returns {string} CSS class
 */
function getStatusClass(status) {
  switch (status.toLowerCase()) {
    case 'healthy':
      return 'bg-success';
    case 'warning':
      return 'bg-warning text-dark';
    case 'critical':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

/**
 * Show success alert
 * @param {string} message - Alert message
 */
function showSuccessAlert(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed bottom-0 end-0 m-3';
  alertDiv.innerHTML = `
    <strong>Success!</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  document.body.appendChild(alertDiv);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

/**
 * Show error alert
 * @param {string} message - Alert message
 */
function showErrorAlert(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed bottom-0 end-0 m-3';
  alertDiv.innerHTML = `
    <strong>Error!</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  document.body.appendChild(alertDiv);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}