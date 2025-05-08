/**
 * Admin System Logs JavaScript
 */

// When document is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Protect admin route and initialize dashboard
  await protectAdminRoute();
  
  // Set default date values (last 7 days)
  setDefaultDateRange();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load logs data
  await loadLogs();
});

/**
 * Set default date range values (last 7 days)
 */
function setDefaultDateRange() {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  
  document.getElementById('date-from').value = formatDateForInput(lastWeek);
  document.getElementById('date-to').value = formatDateForInput(today);
}

/**
 * Format date for input field (YYYY-MM-DD)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Setup event listeners for logs page
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
  
  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', function() {
      const filter = this.dataset.filter;
      filterLogs(filter);
      
      // Update active state
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  // Reset filters
  document.getElementById('reset-filters').addEventListener('click', function() {
    document.getElementById('log-search').value = '';
    setDefaultDateRange();
    
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    document.querySelector('.filter-pill[data-filter="all"]').classList.add('active');
    
    loadLogs(); // Reload all logs
  });
  
  // Search
  document.getElementById('search-button').addEventListener('click', function() {
    const searchTerm = document.getElementById('log-search').value.trim();
    if (searchTerm) {
      searchLogs(searchTerm);
    }
  });
  
  // Search on Enter key
  document.getElementById('log-search').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
      const searchTerm = this.value.trim();
      if (searchTerm) {
        searchLogs(searchTerm);
      }
    }
  });
  
  // Apply date filter
  document.getElementById('apply-date-filter').addEventListener('click', function() {
    loadLogs();
  });
  
  // Refresh logs
  document.getElementById('refresh-logs').addEventListener('click', function() {
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Refreshing...';
    
    loadLogs().then(() => {
      this.disabled = false;
      this.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Refresh Logs';
    });
  });
  
  // Export options
  document.getElementById('export-csv').addEventListener('click', function(e) {
    e.preventDefault();
    exportLogs('csv');
  });
  
  document.getElementById('export-json').addEventListener('click', function(e) {
    e.preventDefault();
    exportLogs('json');
  });
  
  document.getElementById('export-txt').addEventListener('click', function(e) {
    e.preventDefault();
    exportLogs('txt');
  });
}

/**
 * Load logs from API
 */
async function loadLogs() {
  const logsContainer = document.getElementById('logs-container');
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;
  
  // Show loading spinner
  logsContainer.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="spinner-text">Loading system logs...</div>
    </div>
  `;
  
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (dateFrom) params.append('startDate', dateFrom);
    if (dateTo) params.append('endDate', dateTo);
    
    const response = await apiGet(`/api/admin/logs?${params.toString()}`);
    
    // Update page with logs data
    if (response.success && response.logs) {
      displayLogs(response.logs, logsContainer);
      updatePagination(response.totalLogs || response.logs.length, response.page || 1, response.pages || 1);
    } else {
      // No logs or error
      logsContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i> No logs found for the selected period.
        </div>
      `;
      document.getElementById('log-count-info').textContent = 'No logs found';
    }
  } catch (error) {
    console.error('Error loading logs:', error);
    logsContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i> Error loading logs: ${error.message}
      </div>
    `;
  }
}

/**
 * Display logs in the container
 * @param {Array} logs - Array of log entries
 * @param {HTMLElement} container - Container element
 */
function displayLogs(logs, container) {
  if (!logs || logs.length === 0) {
    container.innerHTML = `
      <div class="alert alert-info">
        <i class="fas fa-info-circle me-2"></i> No logs found for the selected period.
      </div>
    `;
    document.getElementById('log-count-info').textContent = 'No logs found';
    return;
  }
  
  let html = '';
  
  logs.forEach((log, index) => {
    const logType = log.level.toLowerCase();
    const timestamp = new Date(log.timestamp).toLocaleString();
    
    html += `
      <div class="log-entry log-entry-${logType}" data-log-id="${index}" data-log-type="${logType}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <span class="log-level log-level-${logType}">${log.level}</span>
            <span class="log-source ms-2">${log.source}</span>
          </div>
          <span class="log-timestamp">${timestamp}</span>
        </div>
        <div class="log-message">${log.message}</div>
        ${log.data ? '<div class="mt-1"><a href="#" class="view-details small text-decoration-none"><i class="fas fa-info-circle me-1"></i>View Details</a></div>' : ''}
      </div>
    `;
  });
  
  container.innerHTML = html;
  document.getElementById('log-count-info').textContent = `Showing ${logs.length} logs`;
  
  // Add event listeners to "View Details" links
  document.querySelectorAll('.view-details').forEach((link, index) => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      openLogDetailModal(logs[index]);
    });
  });
  
  // Also make the whole log entry clickable
  document.querySelectorAll('.log-entry').forEach((entry, index) => {
    entry.addEventListener('click', function(e) {
      // Only open modal if not clicking on a link
      if (e.target.closest('.view-details')) return;
      openLogDetailModal(logs[index]);
    });
  });
}

/**
 * Open log detail modal
 * @param {Object} log - Log entry
 */
function openLogDetailModal(log) {
  const modal = new bootstrap.Modal(document.getElementById('logDetailModal'));
  
  // Set modal content
  document.getElementById('detail-log-level').textContent = log.level;
  document.getElementById('detail-log-level').className = `badge log-level log-level-${log.level.toLowerCase()}`;
  
  document.getElementById('detail-timestamp').textContent = new Date(log.timestamp).toLocaleString();
  document.getElementById('detail-source').textContent = log.source;
  document.getElementById('detail-message').textContent = log.message;
  
  // Format additional data if available
  if (log.data) {
    let formattedData;
    try {
      if (typeof log.data === 'string') {
        formattedData = log.data;
      } else {
        formattedData = JSON.stringify(log.data, null, 2);
      }
    } catch (e) {
      formattedData = String(log.data);
    }
    
    document.getElementById('detail-data').textContent = formattedData;
    document.getElementById('detail-data').parentElement.style.display = 'block';
  } else {
    document.getElementById('detail-data').parentElement.style.display = 'none';
  }
  
  modal.show();
}

/**
 * Filter logs by level
 * @param {string} filter - Log level filter
 */
function filterLogs(filter) {
  const entries = document.querySelectorAll('.log-entry');
  
  if (filter === 'all') {
    entries.forEach(entry => {
      entry.style.display = 'block';
    });
  } else {
    entries.forEach(entry => {
      if (entry.dataset.logType === filter) {
        entry.style.display = 'block';
      } else {
        entry.style.display = 'none';
      }
    });
  }
  
  // Update count info
  const visibleCount = document.querySelectorAll('.log-entry[style="display: block"]').length;
  document.getElementById('log-count-info').textContent = `Showing ${visibleCount} logs`;
}

/**
 * Search logs by term
 * @param {string} term - Search term
 */
function searchLogs(term) {
  const entries = document.querySelectorAll('.log-entry');
  const lowercaseTerm = term.toLowerCase();
  
  let matchCount = 0;
  
  entries.forEach(entry => {
    const text = entry.textContent.toLowerCase();
    if (text.includes(lowercaseTerm)) {
      entry.style.display = 'block';
      matchCount++;
    } else {
      entry.style.display = 'none';
    }
  });
  
  // Update count info
  document.getElementById('log-count-info').textContent = `Showing ${matchCount} logs matching "${term}"`;
}

/**
 * Update pagination controls
 * @param {number} totalItems - Total number of logs
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 */
function updatePagination(totalItems, currentPage, totalPages) {
  const pagination = document.getElementById('logs-pagination');
  
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  
  let html = `
    <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage - 1}" tabindex="-1" aria-disabled="${currentPage === 1}">Previous</a>
    </li>
  `;
  
  // Generate page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // Adjust if we're near the end
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // First page
  if (startPage > 1) {
    html += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="1">1</a>
      </li>
    `;
    
    if (startPage > 2) {
      html += `
        <li class="page-item disabled">
          <a class="page-link" href="#">...</a>
        </li>
      `;
    }
  }
  
  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    html += `
      <li class="page-item ${i === currentPage ? 'active' : ''}" ${i === currentPage ? 'aria-current="page"' : ''}>
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `;
  }
  
  // Last page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `
        <li class="page-item disabled">
          <a class="page-link" href="#">...</a>
        </li>
      `;
    }
    
    html += `
      <li class="page-item">
        <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
      </li>
    `;
  }
  
  html += `
    <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
      <a class="page-link" href="#" data-page="${currentPage + 1}" aria-disabled="${currentPage === totalPages}">Next</a>
    </li>
  `;
  
  pagination.innerHTML = html;
  
  // Add event listeners to pagination links
  document.querySelectorAll('.page-link[data-page]').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const page = parseInt(this.dataset.page);
      
      if (isNaN(page) || page < 1 || page > totalPages || page === currentPage) {
        return;
      }
      
      loadLogsPage(page);
    });
  });
}

/**
 * Load specific page of logs
 * @param {number} page - Page number to load
 */
async function loadLogsPage(page) {
  const logsContainer = document.getElementById('logs-container');
  const dateFrom = document.getElementById('date-from').value;
  const dateTo = document.getElementById('date-to').value;
  
  // Show loading spinner
  logsContainer.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="spinner-text">Loading system logs...</div>
    </div>
  `;
  
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (dateFrom) params.append('startDate', dateFrom);
    if (dateTo) params.append('endDate', dateTo);
    params.append('page', page);
    
    const response = await apiGet(`/api/admin/logs?${params.toString()}`);
    
    // Update page with logs data
    if (response.success && response.logs) {
      displayLogs(response.logs, logsContainer);
      updatePagination(response.totalLogs || response.logs.length, response.page || page, response.pages || 1);
    } else {
      // No logs or error
      logsContainer.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i> No logs found for the selected page.
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading logs page:', error);
    logsContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-circle me-2"></i> Error loading logs: ${error.message}
      </div>
    `;
  }
}

/**
 * Export logs to different formats
 * @param {string} format - Export format (csv, json, txt)
 */
function exportLogs(format) {
  // Get current visible logs
  const entries = Array.from(document.querySelectorAll('.log-entry')).filter(el => 
    window.getComputedStyle(el).display !== 'none'
  );
  
  if (entries.length === 0) {
    showErrorAlert('No logs available to export');
    return;
  }
  
  // Collect log data
  const logs = [];
  entries.forEach(entry => {
    const level = entry.dataset.logType;
    const timestamp = entry.querySelector('.log-timestamp').textContent;
    const source = entry.querySelector('.log-source').textContent;
    const message = entry.querySelector('.log-message').textContent;
    
    logs.push({
      timestamp,
      level,
      source,
      message
    });
  });
  
  // Export based on format
  switch (format) {
    case 'csv':
      exportCsv(logs);
      break;
    case 'json':
      exportJson(logs);
      break;
    case 'txt':
      exportTxt(logs);
      break;
    default:
      showErrorAlert('Invalid export format');
  }
}

/**
 * Export logs as CSV
 * @param {Array} logs - Array of log objects
 */
function exportCsv(logs) {
  const headers = ['Timestamp', 'Level', 'Source', 'Message'];
  let csvContent = headers.join(',') + '\n';
  
  logs.forEach(log => {
    const row = [
      `"${log.timestamp}"`,
      `"${log.level}"`,
      `"${log.source.replace(/"/g, '""')}"`,
      `"${log.message.replace(/"/g, '""')}"`
    ];
    csvContent += row.join(',') + '\n';
  });
  
  downloadFile(csvContent, 'system-logs.csv', 'text/csv');
}

/**
 * Export logs as JSON
 * @param {Array} logs - Array of log objects
 */
function exportJson(logs) {
  const jsonContent = JSON.stringify(logs, null, 2);
  downloadFile(jsonContent, 'system-logs.json', 'application/json');
}

/**
 * Export logs as plain text
 * @param {Array} logs - Array of log objects
 */
function exportTxt(logs) {
  let txtContent = '';
  
  logs.forEach(log => {
    txtContent += `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}\n\n`;
  });
  
  downloadFile(txtContent, 'system-logs.txt', 'text/plain');
}

/**
 * Download file
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} contentType - Content type
 */
function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
  
  showSuccessAlert(`Logs exported as ${filename}`);
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