// Profile display and management functionality
class ProfileManager {
    constructor() {}

    displayProfileInformation(data) {
        if (!data) return;
        // Display profile information
        if (data.profile) {
            const profileHeader = document.getElementById('profile_header');
            const profileStats = document.getElementById('profile_stats');
            const profileInfo = document.querySelector('.profile-info');
            const mb6Section = document.querySelector('.mb-6');

            [profileHeader, profileStats, profileInfo, mb6Section].forEach(el => {
                if (el) {
                    el.classList.remove('hidden');
                    el.classList.add('fade-in');
                }
            });

            // Set avatar and level
            const avatarElement = document.getElementById('profile_avatar');
            const levelTextElement = document.querySelector('.level-text');

            if (avatarElement && data.profile.avatar) {
                avatarElement.src = data.profile.avatar;
            }
            if (levelTextElement) {
                levelTextElement.textContent = data.profile.level || '-';
            }

            // Set username
            const usernameElement = document.getElementById('profile_username');
            if (usernameElement && data.profile.username) {
                usernameElement.textContent = data.profile.username;
            }

            // Handle location visibility - always show
            const locationContainer = document.getElementById('location_container');
            const locationSeparator = document.getElementById('location_separator');
            const locationElement = document.getElementById('profile_location');

            if (locationContainer && locationSeparator && locationElement) {
                locationElement.innerHTML = data.profile.location ? 
                    `${data.profile.location}<span class="text-sm text-gray-400"> (could be inaccurate)</span>` : 
                    '-';
                locationContainer.classList.remove('hidden');
                locationSeparator.classList.remove('hidden');
            }

            // set stats
            const joinDateElement = document.getElementById('profile_join_date');
            const badgesElement = document.getElementById('profile_badges');

            if (joinDateElement) {
                joinDateElement.textContent = data.profile.join_date || '-';
            }
            if (badgesElement) {
                badgesElement.textContent = data.profile.badges || '-';
            }
        }

        // Update profile information (null-safe)
        const steam64 = data.steam_id64 || '';
        const elements = {
            'steam32_id': data.steam32_id || '0',
            'steam3_id': data.steam3_id || '[U:1:0]',
            'steam_id64': steam64,
            'vanity_id': data.vanity_id || steam64
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value || '-';
        });

        // all profile links (guard against undefined steam_id64)
        const baseUrl = `https://steamcommunity.com/profiles/${steam64}`;
        const links = {
            'profile_url': baseUrl,
            'friends_url': `${baseUrl}/friends`,
            'groups_url': `${baseUrl}/groups`,
            'inventory_url': `${baseUrl}/inventory`,
            'comments_url': `${baseUrl}/allcomments`,
            'reviews_url': `${baseUrl}/recommended`,
            'screenshots_url': `${baseUrl}/screenshots`,
        };

        Object.entries(links).forEach(([id, url]) => {
            const element = document.getElementById(id);
            if (element) element.href = url;
        });
    }

    updateMutualInfo(mutualInfo, data) {
        if (!data) return;
        if (mutualInfo) {
            // Check if this is the user's own profile
            const currentUserSteam64 = window.authManager.getCurrentUserSteam64();
            const isOwnProfile = currentUserSteam64 && data.steam_id64 === currentUserSteam64;
            
            // Get the mutual info container
            const mutualInfoContainer = document.querySelector('.profile-info');
            
            if (isOwnProfile) {
                // It's the user's own profile
                const mutualElements = {
                    'mutual_friends': 'viewing own profile',
                    'mutual_groups': 'viewing own profile',
                    'total_friends': mutualInfo.total_friends === 'WIP' ? 'WIP' : (mutualInfo.total_friends ?? 0),
                    'total_groups': mutualInfo.total_groups ?? 0
                };
                
                // Apply gray text style to mutual elements
                const mutualFriendsEl = document.getElementById('mutual_friends');
                const mutualGroupsEl = document.getElementById('mutual_groups');
                
                if (mutualFriendsEl) mutualFriendsEl.classList.add('text-gray-400');
                if (mutualGroupsEl) mutualGroupsEl.classList.add('text-gray-400');
                
                // Update text content
                Object.entries(mutualElements).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element) element.textContent = value;
                });
            } else {
                // Someone else's profile.
                // total_friends is a number when public, the string 'Private' when hidden,
                // or 'WIP' when the backend couldn't determine it yet.
                const tf = mutualInfo.total_friends;
                const totalFriends = (tf === 'Private' || tf === 'WIP')
                    ? tf
                    : (typeof tf === 'number' ? tf : (tf ?? 'Private'));
                const mutualElements = {
                    'mutual_friends': 'WIP',
                    'mutual_groups': mutualInfo.mutual_groups ?? 0,
                    'total_friends': totalFriends,
                    'total_groups': mutualInfo.total_groups ?? 0
                };
                
                // Remove any gray styling if present
                const mutualFriendsEl = document.getElementById('mutual_friends');
                const mutualGroupsEl = document.getElementById('mutual_groups');
                
                if (mutualFriendsEl) mutualFriendsEl.classList.remove('text-gray-400');
                if (mutualGroupsEl) mutualGroupsEl.classList.remove('text-gray-400');
                
                // Update text content
                Object.entries(mutualElements).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element) element.textContent = value;
                });
            }
        }
    }

    async fetchLocationFromSteamIdIO(steam64Id) {
        try {
            const response = await fetch(`https://steamid.io/lookup/${steam64Id}`);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const locationDiv = doc.querySelector('dd.value a[href*="openstreetmap.org"]');
            return locationDiv ? locationDiv.textContent : null;
        } catch (_) {
            return null;
        }
    }
}

// Create singleton instance
const profileManager = new ProfileManager();
window.profileManager = profileManager; 