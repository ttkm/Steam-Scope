class Utils {
    constructor() {}

    // fade-in observer
    setupFadeIn() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Stop observing once visible
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // observe all fade in elements
        document.querySelectorAll('.fade-in').forEach(element => {
            if (element) {
                observer.observe(element);
            }
        });
    }

    copySteamId(element) {
        const text = element.textContent;
        if (text === '-') return;

        // determine what type of ID is being copied
        let idType = "value";
        if (element.id === "logged-in-steamid") {
            idType = "own Steam64 ID";
        } else if (element.id === "steam32_id") {
            idType = "Steam32 ID";
        } else if (element.id === "steam3_id") {
            idType = "Steam3 ID";
        } else if (element.id === "steam_id64") {
            idType = "SteamID64";
        } else if (element.id === "vanity_id") {
            idType = "vanity URL";
        }
        
        // create notification for copied content
        this.showTempMessage(`copied ${idType}!`, 'success');
        
        // add copied class to element
        element.classList.add('copied');
        // copy to clipboard
        navigator.clipboard.writeText(text);
        
        // remove copied class after 650ms
        setTimeout(() => {
            element.classList.remove('copied');
        }, 650);
    }

    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.querySelector('span').textContent = message;
        errorDiv.classList.remove('hidden');
    }

    openImageModal(src) {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        modal.style.display = "block";
        modalImg.src = src;
    }

    closeImageModal() {
        document.getElementById('imageModal').style.display = "none";
    }

    clearSearch() {
        document.getElementById('steam_id').value = '';
        document.getElementById('clearSearchBtn').classList.add('hidden');
        document.getElementById('steam_id').focus();
        this.hideProfileInformation();
    }

    hideProfileInformation() {
        const resultsElement = document.getElementById('results');
        const loadingElement = document.getElementById('loading');
        const errorElement = document.getElementById('error');

        // hide results container and other elements
        if (resultsElement) resultsElement.classList.add('hidden');
        if (loadingElement) loadingElement.classList.remove('active');
        if (errorElement) errorElement.classList.add('hidden');

        window.loadingManager.stopLoadingMessages();
        window.lastSearchedId = '';
    }

    hideUnicodeDisclaimer() {
        const disclaimer = document.getElementById('unicode_disclaimer');
        if (disclaimer) {
            disclaimer.style.display = 'none';
            // store in localStorage that the disclaimer has been dismissed
            localStorage.setItem('unicode_disclaimer_dismissed', 'true');
        }
    }

    checkUnicodeDisclaimer() {
        const disclaimer = document.getElementById('unicode_disclaimer');
        if (disclaimer) {
            // always show the disclaimer
            disclaimer.style.display = 'block';
        }
    }

    // show temporary message function
    showTempMessage(message, type = 'info') {
        // create notification container if it doesn't exist
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.className = 'fixed top-6 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-3';
            document.body.appendChild(notificationContainer);
        }
        
        // create notification element
        const notification = document.createElement('div');
        notification.className = 'notification transform -translate-y-full opacity-0 transition-all duration-300 ease-out flex items-center gap-3 backdrop-blur-md shadow-lg rounded-lg overflow-hidden';
        
        // set colors based on notification type
        let iconSvg = '';
        if (type === 'success') {
            notification.classList.add('bg-green-800/90', 'border-l-4', 'border-green-500');
            iconSvg = `<svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>`;
        } else if (type === 'error') {
            notification.classList.add('bg-red-800/90', 'border-l-4', 'border-red-500');
            iconSvg = `<svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>`;
        } else {
            notification.classList.add('bg-blue-800/90', 'border-l-4', 'border-blue-500');
            iconSvg = `<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>`;
        }
        
        // format message for copy notifications
        let formattedMessage = message;
        if (message.startsWith('copied') && message.endsWith('!')) {
            // extract the ID type
            const idType = message.substring(7, message.length - 1);
            formattedMessage = `copied <span class="copy-highlight">${idType}</span>!`;
        }
        
        // Create notification content
        notification.innerHTML = `
            <div class="p-3 flex items-center justify-center">
                ${iconSvg}
            </div>
            <div class="py-3 pr-4 flex-1">
                <p class="text-white text-sm font-medium">${formattedMessage}</p>
            </div>
        `;
        
        notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.remove('-translate-y-full', 'opacity-0');
        }, 10);
        
        // auto remove after delay
        const removeTimeout = setTimeout(() => {
            notification.classList.add('-translate-y-full', 'opacity-0');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                
                // remove container if empty
                if (notificationContainer.children.length === 0) {
                    notificationContainer.remove();
                }
            }, 300);
        }, 3000);
    }

    abbreviateMonth(dateStr) {
        const months = {
            'January': 'Jan',
            'February': 'Feb',
            'March': 'Mar',
            'April': 'Apr',
            'May': 'May',
            'June': 'Jun',
            'July': 'Jul',
            'August': 'Aug',
            'September': 'Sep',
            'October': 'Oct',
            'November': 'Nov',
            'December': 'Dec'
        };

        for (const [full, abbr] of Object.entries(months)) {
            dateStr = dateStr.replace(full, abbr);
        }
        return dateStr;
    }
}

const utils = new Utils();
window.utils = utils; 