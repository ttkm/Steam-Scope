class ProfileCache {
    constructor() {
        this.CACHE_KEY = 'steamscope_profile_cache_v2';
        this.CACHE_EXPIRY = 24 * 60 * 60 * 1000;
        this.MAX_CACHE_SIZE = 25;
    }

    getAllProfiles() {
        try {
            const cache = localStorage.getItem(this.CACHE_KEY);
            if (!cache) return {};

            const profiles = JSON.parse(cache);
            const now = Date.now();

            const validProfiles = {};
            Object.entries(profiles).forEach(([steamId, data]) => {
                if (now - data.timestamp < this.CACHE_EXPIRY) {
                    validProfiles[steamId] = data;
                }
            });

            if (Object.keys(validProfiles).length !== Object.keys(profiles).length) {
                this._saveProfiles(validProfiles);
            }

            return validProfiles;
        } catch (_) {
            return {};
        }
    }

    getProfile(steamId) {
        const profiles = this.getAllProfiles();
        const profile = profiles[steamId];

        if (profile && Date.now() - profile.timestamp < this.CACHE_EXPIRY) {
            return profile.data;
        }
        return null;
    }

    addProfile(steamId, profileData) {
        try {
            const profiles = this.getAllProfiles();

            profiles[steamId] = {
                data: profileData,
                timestamp: Date.now()
            };

            if (Object.keys(profiles).length > this.MAX_CACHE_SIZE) {
                const oldestKey = Object.entries(profiles)
                    .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
                delete profiles[oldestKey];
            }

            this._saveProfiles(profiles);
            return true;
        } catch (_) {
            return false;
        }
    }

    removeProfile(steamId) {
        try {
            const profiles = this.getAllProfiles();
            if (profiles[steamId]) {
                delete profiles[steamId];
                this._saveProfiles(profiles);
                return true;
            }
            return false;
        } catch (_) {
            return false;
        }
    }

    clearCache() {
        try {
            localStorage.removeItem(this.CACHE_KEY);
            return true;
        } catch (_) {
            return false;
        }
    }

    getStats() {
        const profiles = this.getAllProfiles();
        const now = Date.now();

        return {
            totalProfiles: Object.keys(profiles).length,
            oldestProfile: Math.min(...Object.values(profiles).map(p => p.timestamp)),
            newestProfile: Math.max(...Object.values(profiles).map(p => p.timestamp)),
            cacheSize: new Blob([JSON.stringify(profiles)]).size,
            maxCacheSize: this.MAX_CACHE_SIZE,
            expiryTime: this.CACHE_EXPIRY
        };
    }

    _saveProfiles(profiles) {
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(profiles));
    }
}

const profileCache = new ProfileCache();

window.profileCache = profileCache;