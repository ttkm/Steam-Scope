// Loading screen and messages management
class LoadingManager {
    constructor() {
        this.loadingMessages = [
            "reading profile data...",
            "entering the mainframe...",
            "bypassing steam guard...",
            "flirting with unsanitized inputs...",
            "offering ' OR 1=1; -- as tribute...",
            "launching steam in safe mode...",
            "accessing secret api endpoints...",
            "su-do you trust me?...",
            "running steam in compatibility mode...",
            "bypassing vac (non existent)",
            "disabling telemetry...",
            "disguising traffic as netflix...",
            "generating rainbow tables...",
            "bribing the firewall with cookies...",
            "installing illegal amounts of ram...",
            "defeating captcha boss fight...",
            "pc: (0) my brother in christ that is the FAKEST statement I've ever heard | pc: (1) holy SHIT",
            "error: error"
        ];
        
        this.specialMessage = "steam://install/480";
        this.currentMessageIndex = 0;
        this.messageInterval = null;
        this.shuffledMessages = [];
    }

    // Single loading screen handler
    handleLoading() {
        const loadingScreen = document.getElementById('loadingScreen');
        const body = document.body;

        loadingScreen.style.display = 'flex';
        body.classList.remove('loaded');

        const randomDelay = Math.floor(Math.random() * 1500) + 1500; // random delay between 1500-3000ms

        setTimeout(() => {
            body.classList.add('loaded');
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
            }, randomDelay);
        }, 500);
    }

    shuffleArray(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    getRandomDelay() {
        return Math.floor(Math.random() * 3000) + 2000; // Random between 2000-5000ms
    }

    getNextMessage() {
        if (Math.random() < 0.05) return this.specialMessage;
        if (this.currentMessageIndex >= this.shuffledMessages.length) {
            this.shuffledMessages = this.shuffleArray([...this.loadingMessages]);
            this.currentMessageIndex = 0;
        }
        return this.shuffledMessages[this.currentMessageIndex++];
    }

    startLoadingMessages() {
        const messageElement = document.getElementById('loading-message');
        this.shuffledMessages = this.shuffleArray([...this.loadingMessages]);
        this.currentMessageIndex = 0;
        
        // Add shimmer effect
        messageElement.classList.add('shimmer-text');
        messageElement.textContent = this.getNextMessage();

        const updateMessage = () => {
            messageElement.textContent = this.getNextMessage();
            this.messageInterval = setTimeout(updateMessage, this.getRandomDelay());
        };

        this.messageInterval = setTimeout(updateMessage, this.getRandomDelay());
    }

    stopLoadingMessages() {
        if (this.messageInterval) {
            clearTimeout(this.messageInterval);
        }
        
        // Remove shimmer effect
        const messageElement = document.getElementById('loading-message');
        if (messageElement) {
            messageElement.classList.remove('shimmer-text');
        }
    }

    showLoading() {
        const loadingElement = document.getElementById('loading');
        const resultsElement = document.getElementById('results');
        const errorElement = document.getElementById('error');

        if (loadingElement) loadingElement.classList.add('active');
        if (resultsElement) resultsElement.classList.add('hidden');
        if (errorElement) errorElement.classList.add('hidden');

        this.startLoadingMessages();
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) loadingElement.classList.remove('active');
        this.stopLoadingMessages();
    }

    // Show clean loading screen for clearing operations
    showClearingScreen(message = 'clearing...') {
        // Create overlay element with smooth fade-in
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #18181b 0%, #1a1a1d 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            backdrop-filter: blur(12px);
            transition: opacity 0.4s cubic-bezier(0.23, 1, 0.32, 1);
        `;

        // Create the same spinner as main loading screen
        const spinner = document.createElement('div');
        spinner.style.cssText = `
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 2rem;
        `;

        const spinnerCircle1 = document.createElement('div');
        spinnerCircle1.style.cssText = `
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 4px solid transparent;
            border-top-color: #71717a;
            animation: spin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        `;

        const spinnerCircle2 = document.createElement('div');
        spinnerCircle2.style.cssText = `
            position: absolute;
            inset: 0;
            border-radius: 50%;
            border: 4px solid transparent;
            border-top-color: #a1a1aa;
            animation: spin 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            animation-delay: -1s;
        `;

        spinner.appendChild(spinnerCircle1);
        spinner.appendChild(spinnerCircle2);
        
        // Create main text
        const mainText = document.createElement('div');
        mainText.style.cssText = `
            color: #e4e4e7;
            font-size: 2.5rem;
            font-weight: 700;
            text-align: center;
            letter-spacing: -0.04em;
            margin-bottom: 0.75rem;
            transform: translateY(20px);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1) 0.2s;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;
        mainText.textContent = 'steamscope';

        // Create message element
        const messageElement = document.createElement('div');
        messageElement.style.cssText = `
            color: #a1a1aa;
            font-size: 1.1rem;
            font-weight: 500;
            text-align: center;
            letter-spacing: 0.01em;
            transform: translateY(20px);
            opacity: 0;
            transition: all 0.5s cubic-bezier(0.23, 1, 0.32, 1) 0.4s;
        `;
        messageElement.textContent = message;
        
        overlay.appendChild(spinner);
        overlay.appendChild(mainText);
        overlay.appendChild(messageElement);
        document.body.appendChild(overlay);
        
        // Trigger smooth fade-in sequence
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            
            setTimeout(() => {
                mainText.style.transform = 'translateY(0)';
                mainText.style.opacity = '1';
            }, 100);
            
            setTimeout(() => {
                messageElement.style.transform = 'translateY(0)';
                messageElement.style.opacity = '1';
            }, 300);
        });
        
        // Reload after smooth delay
        setTimeout(() => {
            location.reload();
        }, 1800);
    }

    // Show success message with loading screen (for regular operations)
    showSuccessMessage(message, duration = 2000) {
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingText = document.querySelector('.loading-text');
        const loadingSubtext = document.querySelector('.loading-subtext');
        const loadingSpinner = document.querySelector('.loading-spinner');
        const body = document.body;

        if (!loadingScreen || !loadingText || !loadingSubtext) {
            setTimeout(() => location.reload(), 500);
            return;
        }

        loadingText.textContent = 'steamscope';
        loadingText.style.animation = 'none';
        loadingSubtext.textContent = message;
        loadingSubtext.classList.remove('shimmer-text');
        loadingSubtext.style.display = 'block';

        if (loadingSpinner) {
            loadingSpinner.style.display = 'none';
        }

        body.classList.remove('loaded');
        body.style.opacity = '0';
        
        loadingScreen.style.display = 'flex';
        loadingScreen.style.visibility = 'visible';
        loadingScreen.style.opacity = '1';
        loadingScreen.style.zIndex = '9999';
        loadingScreen.style.position = 'fixed';
        loadingScreen.style.top = '0';
        loadingScreen.style.left = '0';
        loadingScreen.style.right = '0';
        loadingScreen.style.bottom = '0';
        loadingScreen.style.backgroundColor = '#18181b';
        loadingScreen.classList.remove('hidden', 'fade-out');

        setTimeout(() => {
            body.style.opacity = '1';
            setTimeout(() => {
                location.reload();
            }, duration);
        }, 150);
    }
}

// Create singleton instance
const loadingManager = new LoadingManager();
window.loadingManager = loadingManager; 