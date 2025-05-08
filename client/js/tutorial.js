/**
 * Tutorial system for guiding new users through the application
 */

class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.tutorials = {
            'dashboard': this.getDashboardTutorial(),
            'templates': this.getTemplatesTutorial(),
            'campaigns': this.getCampaignsTutorial(),
            'lists': this.getListsTutorial(),
            'analytics': this.getAnalyticsTutorial()
        };
        this.activeTutorial = null;
        this.overlay = null;
        this.tooltipElement = null;
        this.isActive = false;
        
        // Check if the user has seen the tutorial before
        this.tutorialSeen = JSON.parse(localStorage.getItem('tutorialSeen') || '{}');
    }
    
    /**
     * Initialize the tutorial system
     * @param {string} page - The current page
     */
    init(page) {
        // Only show tutorials for new users or when explicitly requested
        if (this.tutorialSeen[page] && !this.isForceEnabled()) {
            return;
        }
        
        if (this.tutorials[page]) {
            // Create tutorial elements
            this.createTutorialElements();
            
            // Set active tutorial
            this.activeTutorial = this.tutorials[page];
            this.currentStep = 0;
            
            // Ask user if they want to see the tutorial
            this.showTutorialPrompt(page);
        }
    }
    
    /**
     * Check if tutorial is force enabled via URL parameter
     */
    isForceEnabled() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.has('tutorial');
    }
    
    /**
     * Show a prompt asking the user if they want to see the tutorial
     * @param {string} page - The current page
     */
    showTutorialPrompt(page) {
        // Skip prompt if tutorial is force enabled
        if (this.isForceEnabled()) {
            this.startTutorial();
            return;
        }
        
        const prompt = document.createElement('div');
        prompt.className = 'tutorial-prompt';
        prompt.innerHTML = `
            <div class="tutorial-prompt-content">
                <h5>
                    <i class="fas fa-info-circle me-2"></i>
                    Welcome to the ${this.getPageName(page)} page!
                </h5>
                <p>Would you like to take a quick tour to learn how to use this feature?</p>
                <div class="tutorial-prompt-actions">
                    <button class="btn btn-primary" id="tutorialYesBtn">Yes, show me around</button>
                    <button class="btn btn-outline-secondary" id="tutorialNoBtn">No, I'll explore on my own</button>
                    <div class="form-check mt-2">
                        <input class="form-check-input" type="checkbox" id="dontShowAgainCheck">
                        <label class="form-check-label" for="dontShowAgainCheck">
                            Don't show this again
                        </label>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles for the prompt
        prompt.style.cssText = `
            position: fixed;
            z-index: 9999;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(prompt);
        
        // Add styles for the prompt content
        const promptContent = prompt.querySelector('.tutorial-prompt-content');
        promptContent.style.cssText = `
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 500px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            transform: translateY(20px);
            transition: transform 0.3s ease;
        `;
        
        // Add animation
        setTimeout(() => {
            prompt.style.opacity = '1';
            promptContent.style.transform = 'translateY(0)';
        }, 10);
        
        // Event listeners for buttons
        document.getElementById('tutorialYesBtn').addEventListener('click', () => {
            const dontShowAgain = document.getElementById('dontShowAgainCheck').checked;
            if (dontShowAgain) {
                // All tutorials have been "seen" if they don't want to see them again
                Object.keys(this.tutorials).forEach(p => {
                    this.tutorialSeen[p] = true;
                });
            } else {
                // Mark this tutorial as seen
                this.tutorialSeen[page] = true;
            }
            localStorage.setItem('tutorialSeen', JSON.stringify(this.tutorialSeen));
            
            document.body.removeChild(prompt);
            this.startTutorial();
        });
        
        document.getElementById('tutorialNoBtn').addEventListener('click', () => {
            const dontShowAgain = document.getElementById('dontShowAgainCheck').checked;
            if (dontShowAgain) {
                // All tutorials have been "seen" if they don't want to see them again
                Object.keys(this.tutorials).forEach(p => {
                    this.tutorialSeen[p] = true;
                });
            } else {
                // Mark this tutorial as seen
                this.tutorialSeen[page] = true;
            }
            localStorage.setItem('tutorialSeen', JSON.stringify(this.tutorialSeen));
            
            document.body.removeChild(prompt);
        });
    }
    
    /**
     * Create the tutorial overlay and tooltip elements
     */
    createTutorialElements() {
        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            z-index: 9990;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.7);
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        // Create tooltip
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'tutorial-tooltip';
        this.tooltipElement.style.cssText = `
            position: fixed;
            z-index: 9995;
            background-color: white;
            border-radius: 8px;
            padding: 15px;
            max-width: 300px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: auto;
        `;
        
        // Add navigation buttons to tooltip
        this.tooltipElement.innerHTML = `
            <div class="tutorial-tooltip-content"></div>
            <div class="tutorial-tooltip-actions mt-3 d-flex justify-content-between">
                <button class="btn btn-sm btn-outline-secondary" id="tutorialPrevBtn">Previous</button>
                <button class="btn btn-sm btn-outline-danger" id="tutorialSkipBtn">Skip Tutorial</button>
                <button class="btn btn-sm btn-primary" id="tutorialNextBtn">Next</button>
            </div>
        `;
        
        // Append elements to the body
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.tooltipElement);
        
        // Add event listeners
        document.getElementById('tutorialPrevBtn').addEventListener('click', () => this.prevStep());
        document.getElementById('tutorialNextBtn').addEventListener('click', () => this.nextStep());
        document.getElementById('tutorialSkipBtn').addEventListener('click', () => this.endTutorial());
    }
    
    /**
     * Start the tutorial
     */
    startTutorial() {
        if (!this.activeTutorial || this.activeTutorial.steps.length === 0) {
            return;
        }
        
        this.isActive = true;
        this.currentStep = 0;
        this.showStep(this.currentStep);
        
        // Show overlay with animation
        this.overlay.style.opacity = '1';
    }
    
    /**
     * Show a specific tutorial step
     * @param {number} stepIndex - The index of the step to show
     */
    showStep(stepIndex) {
        if (!this.activeTutorial || stepIndex < 0 || stepIndex >= this.activeTutorial.steps.length) {
            return;
        }
        
        const step = this.activeTutorial.steps[stepIndex];
        
        // Find the target element
        const targetElement = document.querySelector(step.selector);
        if (!targetElement) {
            console.error(`Tutorial target element not found: ${step.selector}`);
            this.nextStep(); // Skip this step
            return;
        }
        
        // Update tooltip content
        const tooltipContent = this.tooltipElement.querySelector('.tutorial-tooltip-content');
        tooltipContent.innerHTML = `
            <div class="d-flex align-items-start mb-2">
                <div class="bg-primary rounded-circle p-2 me-3 text-white">
                    <i class="${step.icon || 'fas fa-info'}"></i>
                </div>
                <div>
                    <h6 class="mb-1">${step.title}</h6>
                    <p class="mb-0 text-muted">${step.content}</p>
                </div>
            </div>
        `;
        
        // Update navigation buttons
        const prevBtn = document.getElementById('tutorialPrevBtn');
        const nextBtn = document.getElementById('tutorialNextBtn');
        
        prevBtn.style.visibility = stepIndex > 0 ? 'visible' : 'hidden';
        nextBtn.textContent = stepIndex < this.activeTutorial.steps.length - 1 ? 'Next' : 'Finish';
        
        // Position the tooltip near the target element
        this.positionTooltip(targetElement, step.position || 'bottom');
        
        // Highlight the target element
        this.highlightElement(targetElement);
    }
    
    /**
     * Position the tooltip relative to the target element
     * @param {HTMLElement} targetElement - The element to position near
     * @param {string} position - The position (top, right, bottom, left)
     */
    positionTooltip(targetElement, position) {
        const targetRect = targetElement.getBoundingClientRect();
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        
        // Default position is bottom
        let top, left;
        
        // Calculate position
        switch (position) {
            case 'top':
                top = targetRect.top - tooltipRect.height - 10;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
            case 'right':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.right + 10;
                break;
            case 'left':
                top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
                left = targetRect.left - tooltipRect.width - 10;
                break;
            case 'bottom':
            default:
                top = targetRect.bottom + 10;
                left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
                break;
        }
        
        // Ensure tooltip stays within viewport
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        
        if (top < 10) top = 10;
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = window.innerHeight - tooltipRect.height - 10;
        }
        
        // Set position with animation
        this.tooltipElement.style.opacity = '0';
        this.tooltipElement.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            this.tooltipElement.style.top = `${top}px`;
            this.tooltipElement.style.left = `${left}px`;
            this.tooltipElement.style.opacity = '1';
            this.tooltipElement.style.transform = 'scale(1)';
        }, 10);
    }
    
    /**
     * Highlight a target element by creating a cutout in the overlay
     * @param {HTMLElement} targetElement - The element to highlight
     */
    highlightElement(targetElement) {
        const rect = targetElement.getBoundingClientRect();
        
        // Create cutout by using multiple background gradients
        this.overlay.style.background = `
            radial-gradient(
                ellipse at ${rect.left + rect.width/2}px ${rect.top + rect.height/2}px,
                transparent ${Math.max(rect.width, rect.height)/2 + 5}px,
                rgba(0, 0, 0, 0.7) ${Math.max(rect.width, rect.height)/2 + 6}px
            )
        `;
        
        // Add pulsing effect to highlighted element
        targetElement.style.position = 'relative';
        targetElement.style.zIndex = '9991';
        
        // Remove any existing pulse effect
        const existingPulse = document.querySelector('.tutorial-pulse');
        if (existingPulse) {
            existingPulse.remove();
        }
        
        // Add pulse effect
        const pulse = document.createElement('div');
        pulse.className = 'tutorial-pulse';
        pulse.style.cssText = `
            position: absolute;
            z-index: -1;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border-radius: 5px;
            box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
            animation: tutorial-pulse 1.5s infinite;
            pointer-events: none;
        `;
        
        // Add animation styles if not already added
        if (!document.getElementById('tutorial-styles')) {
            const style = document.createElement('style');
            style.id = 'tutorial-styles';
            style.textContent = `
                @keyframes tutorial-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.5); }
                    70% { box-shadow: 0 0 0 10px rgba(66, 153, 225, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(66, 153, 225, 0); }
                }
            `;
            document.head.appendChild(style);
        }
        
        targetElement.appendChild(pulse);
    }
    
    /**
     * Go to the next step
     */
    nextStep() {
        if (!this.activeTutorial) return;
        
        if (this.currentStep < this.activeTutorial.steps.length - 1) {
            // Go to next step
            this.currentStep++;
            this.showStep(this.currentStep);
        } else {
            // End tutorial
            this.endTutorial();
        }
    }
    
    /**
     * Go to the previous step
     */
    prevStep() {
        if (!this.activeTutorial || this.currentStep <= 0) return;
        
        this.currentStep--;
        this.showStep(this.currentStep);
    }
    
    /**
     * End the tutorial and clean up
     */
    endTutorial() {
        this.isActive = false;
        
        // Hide elements with animation
        this.overlay.style.opacity = '0';
        this.tooltipElement.style.opacity = '0';
        
        // Remove pulse effect from any element
        const pulse = document.querySelector('.tutorial-pulse');
        if (pulse) {
            pulse.remove();
        }
        
        // Reset z-index of any highlighted element
        const highlightedElements = document.querySelectorAll('[style*="z-index: 9991"]');
        highlightedElements.forEach(el => {
            el.style.zIndex = '';
        });
        
        // Remove elements after animation
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                document.body.removeChild(this.overlay);
            }
            if (this.tooltipElement && this.tooltipElement.parentNode) {
                document.body.removeChild(this.tooltipElement);
            }
            this.overlay = null;
            this.tooltipElement = null;
        }, 300);
        
        // Show a completion message
        if (this.activeTutorial) {
            this.showCompletionMessage(this.activeTutorial.page);
        }
    }
    
    /**
     * Show a completion message
     * @param {string} page - The current page
     */
    showCompletionMessage(page) {
        const toast = document.createElement('div');
        toast.className = 'tutorial-completion-toast';
        toast.innerHTML = `
            <div class="tutorial-toast-content">
                <div class="d-flex align-items-center">
                    <div class="bg-success rounded-circle p-2 me-3 text-white">
                        <i class="fas fa-check"></i>
                    </div>
                    <div>
                        <h6 class="mb-1">Tutorial completed!</h6>
                        <p class="mb-0 text-muted">You've learned the basics of the ${this.getPageName(page)}.</p>
                    </div>
                </div>
            </div>
        `;
        
        // Style the toast
        toast.style.cssText = `
            position: fixed;
            z-index: 9999;
            bottom: 20px;
            right: 20px;
            background-color: white;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            opacity: 0;
            transform: translateX(20px);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Show the toast with animation
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Hide and remove after a delay
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 5000);
    }
    
    /**
     * Get a friendly name for a page
     * @param {string} page - The page identifier
     * @returns {string} - The friendly name
     */
    getPageName(page) {
        const names = {
            'dashboard': 'Dashboard',
            'templates': 'Email Templates',
            'campaigns': 'Email Campaigns',
            'lists': 'Email Lists',
            'analytics': 'Analytics'
        };
        
        return names[page] || page;
    }
    
    /**
     * Get the dashboard tutorial steps
     * @returns {Object} - The tutorial configuration
     */
    getDashboardTutorial() {
        return {
            page: 'dashboard',
            steps: [
                {
                    selector: '.main-content h2',
                    title: 'Welcome to the Dashboard',
                    content: 'This is the main dashboard where you can see an overview of your email campaigns and performance.',
                    icon: 'fas fa-tachometer-alt',
                    position: 'bottom'
                },
                {
                    selector: '.summary-cards',
                    title: 'Performance Overview',
                    content: 'These cards show a summary of your key performance metrics.',
                    icon: 'fas fa-chart-line',
                    position: 'bottom'
                },
                {
                    selector: '.recent-campaigns',
                    title: 'Recent Campaigns',
                    content: 'Here you can see your most recent email campaigns and their performance.',
                    icon: 'fas fa-paper-plane',
                    position: 'top'
                },
                {
                    selector: '.sidebar .nav-link[href*="campaigns"]',
                    title: 'Create New Campaigns',
                    content: 'Click here to create and manage your email campaigns.',
                    icon: 'fas fa-plus-circle',
                    position: 'right'
                }
            ]
        };
    }
    
    /**
     * Get the templates tutorial steps
     * @returns {Object} - The tutorial configuration
     */
    getTemplatesTutorial() {
        return {
            page: 'templates',
            steps: [
                {
                    selector: '.card-header h5:contains("Create Template")',
                    title: 'Create Email Templates',
                    content: 'This is where you can create new email templates with a rich text editor.',
                    icon: 'fas fa-edit',
                    position: 'bottom'
                },
                {
                    selector: '#templateEditor',
                    title: 'Rich Text Editor',
                    content: 'Use this editor to design beautiful emails with formatting, images, and more.',
                    icon: 'fas fa-paint-brush',
                    position: 'right'
                },
                {
                    selector: '#aiSubjectBtn',
                    title: 'AI Subject Optimizer',
                    content: 'Get AI-generated subject lines that can help improve your open rates.',
                    icon: 'fas fa-magic',
                    position: 'top'
                },
                {
                    selector: '#aiAnalyzeBtn',
                    title: 'AI Content Analysis',
                    content: 'Analyze your email content for effectiveness and get improvement suggestions.',
                    icon: 'fas fa-chart-bar',
                    position: 'top'
                },
                {
                    selector: '.card-header h5:contains("Your Templates")',
                    title: 'Your Templates',
                    content: 'Here you can see all your saved templates that you can edit, preview, or use in campaigns.',
                    icon: 'fas fa-list',
                    position: 'bottom'
                }
            ]
        };
    }
    
    /**
     * Get the campaigns tutorial steps
     * @returns {Object} - The tutorial configuration
     */
    getCampaignsTutorial() {
        return {
            page: 'campaigns',
            steps: [
                {
                    selector: '.card-header h5:contains("Create Campaign")',
                    title: 'Create Email Campaigns',
                    content: 'Here you can create new email campaigns to send to your subscribers.',
                    icon: 'fas fa-paper-plane',
                    position: 'bottom'
                },
                {
                    selector: '#listId',
                    title: 'Select Email List',
                    content: 'Choose which list of subscribers to send your campaign to.',
                    icon: 'fas fa-users',
                    position: 'right'
                },
                {
                    selector: '#templateId',
                    title: 'Select Email Template',
                    content: 'Choose which email template to use for your campaign.',
                    icon: 'fas fa-file-alt',
                    position: 'right'
                },
                {
                    selector: '.send-time-recommendation',
                    title: 'Send Time Recommendations',
                    content: 'Get suggestions for the best time to send your campaign based on subscriber engagement.',
                    icon: 'fas fa-clock',
                    position: 'top'
                },
                {
                    selector: '.card-header h5:contains("Your Campaigns")',
                    title: 'Your Campaigns',
                    content: 'Here you can see all your campaigns and their statuses.',
                    icon: 'fas fa-list',
                    position: 'bottom'
                }
            ]
        };
    }
    
    /**
     * Get the lists tutorial steps
     * @returns {Object} - The tutorial configuration
     */
    getListsTutorial() {
        return {
            page: 'lists',
            steps: [
                {
                    selector: '.card-header h5:contains("Email Lists")',
                    title: 'Email Lists Management',
                    content: 'Here you can create and manage your subscriber lists for different audiences.',
                    icon: 'fas fa-users',
                    position: 'bottom'
                },
                {
                    selector: '#createListBtn',
                    title: 'Create New Lists',
                    content: 'Click here to create a new email list or group of subscribers.',
                    icon: 'fas fa-plus-circle',
                    position: 'bottom'
                },
                {
                    selector: '.import-options',
                    title: 'Import Subscribers',
                    content: 'Import subscribers from a CSV file or manually enter their information.',
                    icon: 'fas fa-file-import',
                    position: 'left'
                },
                {
                    selector: '#createSegmentBtn',
                    title: 'Advanced Segmentation',
                    content: 'Create segments of your lists based on subscriber attributes or behavior.',
                    icon: 'fas fa-filter',
                    position: 'left'
                },
                {
                    selector: '#emailListsTable',
                    title: 'Your Email Lists',
                    content: 'Here you can see all your lists, their sizes, and manage their subscribers.',
                    icon: 'fas fa-table',
                    position: 'top'
                }
            ]
        };
    }
    
    /**
     * Get the analytics tutorial steps
     * @returns {Object} - The tutorial configuration
     */
    getAnalyticsTutorial() {
        return {
            page: 'analytics',
            steps: [
                {
                    selector: '.main-content h2',
                    title: 'Email Analytics',
                    content: 'This is where you can view detailed performance data for your email campaigns.',
                    icon: 'fas fa-chart-bar',
                    position: 'bottom'
                },
                {
                    selector: '.summary-cards',
                    title: 'Performance Summary',
                    content: 'These cards show your key performance metrics like opens, clicks, and conversions.',
                    icon: 'fas fa-chart-line',
                    position: 'bottom'
                },
                {
                    selector: '#dateRangeFilter',
                    title: 'Date Range Filter',
                    content: 'Filter your analytics data by specific date ranges to see performance over time.',
                    icon: 'fas fa-calendar-alt',
                    position: 'bottom'
                },
                {
                    selector: '#openRateChart',
                    title: 'Open Rate Trends',
                    content: 'This chart shows your email open rates over time so you can spot trends.',
                    icon: 'fas fa-envelope-open',
                    position: 'right'
                },
                {
                    selector: '#campaignPerformanceTable',
                    title: 'Campaign Performance',
                    content: 'Compare the performance of individual campaigns to see what works best.',
                    icon: 'fas fa-table',
                    position: 'top'
                }
            ]
        };
    }
}

// Initialize the tutorial manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create tutorial manager instance
    window.tutorialManager = new TutorialManager();
    
    // Determine current page
    const path = window.location.pathname;
    let currentPage = 'dashboard'; // Default
    
    if (path.includes('templates.html')) {
        currentPage = 'templates';
    } else if (path.includes('campaigns.html')) {
        currentPage = 'campaigns';
    } else if (path.includes('lists.html')) {
        currentPage = 'lists';
    } else if (path.includes('analytics.html')) {
        currentPage = 'analytics';
    }
    
    // Initialize tutorial for current page
    window.tutorialManager.init(currentPage);
    
    // Add tutorial button to the navbar if it doesn't exist
    const navbar = document.querySelector('.navbar-nav');
    if (navbar && !document.getElementById('tutorialBtn')) {
        const tutorialLi = document.createElement('li');
        tutorialLi.className = 'nav-item';
        tutorialLi.innerHTML = `
            <a class="nav-link" href="#" id="tutorialBtn">
                <i class="fas fa-question-circle"></i>
                <span>Tutorial</span>
            </a>
        `;
        navbar.appendChild(tutorialLi);
        
        // Add event listener
        document.getElementById('tutorialBtn').addEventListener('click', (e) => {
            e.preventDefault();
            
            // Create tutorial elements if they don't exist
            if (!window.tutorialManager.tooltipElement) {
                window.tutorialManager.createTutorialElements();
            }
            
            // Start tutorial
            window.tutorialManager.startTutorial();
        });
    }
});