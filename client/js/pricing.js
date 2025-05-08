/**
 * Pricing page functionality
 */

document.addEventListener('DOMContentLoaded', () => {
    // Protect this route
    protectRoute();
    
    // Initialize the pricing page
    initPricingPage();
});

/**
 * Initialize pricing page with all components
 */
async function initPricingPage() {
    try {
        // Display user information
        await displayUserInfo();
        
        // Highlight current plan
        await highlightCurrentPlan();
        
        // Add animation to pricing cards
        animatePricingCards();
        
        // Set up event handlers
        setupEventHandlers();
    } catch (error) {
        console.error('Error initializing pricing page:', error);
        showToast('error', 'Failed to load pricing information');
    }
}

/**
 * Highlight the user's current plan
 */
async function highlightCurrentPlan() {
    try {
        // Get current plan info
        const planInfo = await apiGet('/api/user/plan');
        const currentPlan = planInfo.plan; // 'free', 'starter', 'pro', 'enterprise'
        
        // Find the corresponding plan card
        const planCards = document.querySelectorAll('.pricing-card');
        planCards.forEach(card => {
            // Reset featured status and button style
            card.classList.remove('featured');
            const button = card.querySelector('.card-footer .btn');
            button.classList.remove('btn-primary');
            button.classList.add('btn-outline-primary');
            
            // Check if this is the current plan
            const cardTitle = card.querySelector('.card-header h5').textContent.toLowerCase();
            if (cardTitle.includes(currentPlan)) {
                // Highlight this plan
                card.classList.add('featured');
                
                // Add "Current Plan" badge if not already present
                if (!card.querySelector('.current-plan-badge')) {
                    const badge = document.createElement('div');
                    badge.className = 'pricing-badge current-plan-badge';
                    badge.textContent = 'Current Plan';
                    card.appendChild(badge);
                }
                
                // Update button text and style
                if (button) {
                    button.textContent = 'Current Plan';
                    button.classList.remove('btn-outline-primary');
                    button.classList.add('btn-primary');
                }
            }
        });
        
        // Also mark current plan in feature comparison table
        const tableRows = document.querySelectorAll('.features-table tr');
        const planIndex = ['free', 'starter', 'pro', 'enterprise'].indexOf(currentPlan) + 1; // +1 because first column is feature name
        
        if (planIndex > 0) {
            tableRows.forEach(row => {
                // Clear any existing highlights
                for (let i = 1; i < row.cells.length; i++) {
                    row.cells[i].classList.remove('bg-light');
                }
                
                // Highlight the current plan column
                if (row.cells[planIndex]) {
                    row.cells[planIndex].classList.add('bg-light');
                }
            });
        }
    } catch (error) {
        console.error('Error highlighting current plan:', error);
        // Continue with the page even if this fails
    }
}

/**
 * Display user information in the sidebar
 */
async function displayUserInfo() {
    const user = getCurrentUser();
    
    if (user) {
        // Set user initials
        const initials = user.name 
            ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            : user.email[0].toUpperCase();
        
        document.querySelectorAll('.user-initials').forEach(el => {
            el.textContent = initials;
        });
        
        // Set user email
        document.querySelectorAll('.user-email').forEach(el => {
            el.textContent = user.email;
        });
        
        // Get and display current plan
        try {
            const planInfo = await apiGet('/api/user/plan');
            
            // Find account type badges in the sidebar
            const accountTypeElement = document.getElementById('accountType');
            if (accountTypeElement) {
                // Set badge color based on plan
                let badgeClass = 'bg-secondary';
                
                if (planInfo.plan === 'starter') {
                    badgeClass = 'bg-info';
                } else if (planInfo.plan === 'pro') {
                    badgeClass = 'bg-primary';
                } else if (planInfo.plan === 'enterprise') {
                    badgeClass = 'bg-success';
                }
                
                accountTypeElement.innerHTML = `
                    <span class="badge ${badgeClass}">${planInfo.planName}</span>
                `;
            }
        } catch (error) {
            console.error('Error fetching plan info:', error);
            // Keep default "Free Plan" if there's an error
        }
    }
}

/**
 * Add animations to pricing cards
 */
function animatePricingCards() {
    // Add hover effects and animations
    const pricingCards = document.querySelectorAll('.pricing-card');
    
    pricingCards.forEach(card => {
        // Add animation class when scrolled into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        card.classList.add('animate__animated', 'animate__fadeInUp');
                    }, 100 * Array.from(pricingCards).indexOf(card));
                    observer.unobserve(card);
                }
            });
        }, { threshold: 0.1 });
        
        observer.observe(card);
    });
}

/**
 * Setup event handlers for the pricing page
 */
function setupEventHandlers() {
    // Handle plan selection buttons
    const planButtons = document.querySelectorAll('.card-footer .btn');
    
    planButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the plan name from the card
            const card = this.closest('.pricing-card');
            const planName = card.querySelector('.card-header h5').textContent;
            
            // Show confirmation modal for selected plan
            showPlanSelectionModal(planName);
        });
    });
    
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
 * Show plan selection modal
 * @param {string} planName - The name of the selected plan
 */
function showPlanSelectionModal(planName) {
    // Create modal for plan selection
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'planSelectionModal';
    modal.setAttribute('tabindex', '-1');
    
    // Format plan name to lowercase for CSS classes and API
    const planNameLower = planName.replace(/\s+/g, '-').toLowerCase();
    const planId = planNameLower.replace('-plan', ''); // Convert "Free Plan" to "free"
    
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title">
                        <i class="fas fa-check-circle me-2"></i>
                        Select ${planName}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p>You've selected the <strong>${planName}</strong>. During this beta period, all plans are available at no cost for testing purposes.</p>
                    <p class="mb-0">In the future, you'll be able to:</p>
                    <ul>
                        <li>Enter payment details</li>
                        <li>Select billing cycle (monthly/annually)</li>
                        <li>Apply promotional codes</li>
                    </ul>
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        Since this is a beta version, no actual charges will be applied.
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="confirmPlanButton">
                        <i class="fas fa-check me-2"></i>
                        Select ${planName}
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show the modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();
    
    // Handle selection confirmation
    const confirmButton = document.getElementById('confirmPlanButton');
    confirmButton.addEventListener('click', async () => {
        // Show loading state
        confirmButton.disabled = true;
        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Processing...';
        
        try {
            // Update the user's plan via API
            await apiPost('/api/user/plan', { plan: planId });
            
            // Success!
            modalInstance.hide();
            showToast('success', `Successfully upgraded to ${planName}!`);
            
            // Update UI to reflect the new plan
            setTimeout(() => {
                // Refresh the page to show updated plan info
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Error updating plan:', error);
            confirmButton.disabled = false;
            confirmButton.innerHTML = `<i class="fas fa-check me-2"></i> Select ${planName}`;
            showToast('error', 'Failed to update plan. Please try again.');
        }
    });
    
    // Clean up the modal when it's hidden
    modal.addEventListener('hidden.bs.modal', () => {
        document.body.removeChild(modal);
    });
}