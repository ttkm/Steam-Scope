class SettingsManager {
    constructor() {
        this.isSettingsMenuOpen = false;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', (event) => {
            const settingsMenu = document.querySelector('.settings-menu');
            if (settingsMenu && !settingsMenu.contains(event.target)) {
                this.closeSettingsMenu();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isSettingsMenuOpen) {
                this.closeSettingsMenu();
            }
        });
    }

    toggleSettingsMenu() {
        if (this.isSettingsMenuOpen) {
            this.closeSettingsMenu();
        } else {
            this.openSettingsMenu();
        }
    }

    openSettingsMenu() {
        const trigger = document.getElementById('settingsToggle');
        const dropdown = document.getElementById('settingsDropdown');
        
        trigger.classList.add('open');
        dropdown.classList.remove('hidden');
        setTimeout(() => {
            dropdown.classList.add('visible');
        }, 10);
        this.isSettingsMenuOpen = true;
    }

    closeSettingsMenu() {
        const trigger = document.getElementById('settingsToggle');
        const dropdown = document.getElementById('settingsDropdown');
        
        trigger.classList.remove('open');
        dropdown.classList.remove('visible');
        setTimeout(() => {
            dropdown.classList.add('hidden');
        }, 200);
        this.isSettingsMenuOpen = false;
    }

    clearCache() {
        this.closeSettingsMenu();
        window.profileCache?.clearCache();
        localStorage.removeItem('hide_unicode_disclaimer');
        localStorage.removeItem('hide_groups_unicode_disclaimer');
        window.loadingManager.showClearingScreen('clearing cache...');
    }

    doLogout() {
        this.closeSettingsMenu();
        window.authManager.logout();
    }

    clearAll() {
        this.closeSettingsMenu();
        window.profileCache?.clearCache();
        localStorage.clear();
        window.authManager.logout();
    }
}

const settingsManager = new SettingsManager();
window.settingsManager = settingsManager;

function toggleSettingsMenu() {
    window.settingsManager.toggleSettingsMenu();
}

function clearCache() {
    window.settingsManager.clearCache();
}

function doLogout() {
    window.settingsManager.doLogout();
}

function clearAll() {
    window.settingsManager.clearAll();
}
