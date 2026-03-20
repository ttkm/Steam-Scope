class AuthManager {
    constructor() {
        this.user = null;
        this.loaded = false;
        this._readyCallbacks = [];
    }

    async init() {
        const params = new URLSearchParams(window.location.search);
        const authError = params.get('auth_error');
        if (authError === 'db_not_configured') {
            if (typeof document !== 'undefined' && document.body) {
                const banner = document.createElement('div');
                banner.className = 'bg-red-600 text-white text-center py-2 px-4 text-sm';
                banner.textContent = 'Login failed: database not configured. Site admin: add D1 binding in Cloudflare Pages settings.';
                document.body.insertBefore(banner, document.body.firstChild);
            }
        } else if (authError === 'db_error') {
            let detail = 'Database error during login.';
            try {
                const msg = params.get('msg');
                if (msg) detail = decodeURIComponent(msg);
            } catch (_) {}
            if (typeof document !== 'undefined' && document.body) {
                const banner = document.createElement('div');
                banner.className = 'bg-amber-600 text-white text-center py-2 px-4 text-sm';
                banner.textContent = 'Login failed: ' + detail;
                document.body.insertBefore(banner, document.body.firstChild);
            }
        }
        try {
            const resp = await fetch('/api/auth/me', { credentials: 'include' });
            if (resp.ok) {
                const data = await resp.json();
                if (!data.guest && data.user) {
                    this.user = data.user;
                }
            }
        } catch (_) {}
        this.loaded = true;
        this.updateUI();
        this._readyCallbacks.forEach(cb => cb(this.user));
        this._readyCallbacks = [];
    }

    onReady(cb) {
        if (this.loaded) { cb(this.user); return; }
        this._readyCallbacks.push(cb);
    }

    isLoggedIn() {
        return !!this.user;
    }

    getCurrentUserSteam64() {
        return this.user?.steam_id || null;
    }

    login(returnTo) {
        const path = returnTo || window.location.pathname;
        window.location.href = `/api/auth/login?return_to=${encodeURIComponent(path)}`;
    }

    logout() {
        window.location.href = '/api/auth/logout';
    }

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const userAvatarWrap = document.getElementById('userAvatarWrap');
        const userAvatar = document.getElementById('userAvatar');
        const settingsMenu = document.querySelector('.settings-menu');
        const loadingScreen = document.getElementById('loadingScreen');

        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            document.body.classList.add('loaded');
        }

        if (this.user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (userInfo) userInfo.classList.remove('hidden');
            if (userAvatarWrap && userAvatar) {
                if (this.user.avatar) {
                    userAvatar.src = this.user.avatar;
                    userAvatarWrap.classList.remove('hidden');
                } else {
                    userAvatarWrap.classList.add('hidden');
                }
            }
            if (settingsMenu) settingsMenu.classList.remove('hidden');
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (userInfo) userInfo.classList.add('hidden');
            if (settingsMenu) settingsMenu.classList.add('hidden');
            if (userAvatarWrap) userAvatarWrap.classList.add('hidden');
        }
    }

    /** Refetch user and update header. Call after actions if needed. */
    async refreshUser() {
        try {
            const resp = await fetch('/api/auth/me', { credentials: 'include' });
            if (resp.ok) {
                const data = await resp.json();
                if (!data.guest && data.user) {
                    this.user = data.user;
                    this.updateUI();
                }
            }
        } catch (_) {}
    }
}

const authManager = new AuthManager();
window.authManager = authManager;

// Ensure auth state is initialized on every page that includes auth.js.
// Some pages don't load main.js, so without this the auth gate never opens.
try {
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => window.authManager.init());
        } else {
            window.authManager.init();
        }
    }
} catch (_) {}
