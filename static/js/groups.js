class GroupsManager {
    constructor() {
        this.groupsData = [];
        this.currentView = 'grid-1';
        this.scrollObserver = null;
        this.initCustomDropdown();
        this.initScrollObserver();
    }

    initCustomDropdown() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupCustomDropdown();
            });
        } else {
            this.setupCustomDropdown();
        }
    }

    setupCustomDropdown() {
        const trigger = document.getElementById('group_filter_trigger');
        const menu = document.getElementById('group_filter_menu');
        const options = document.querySelectorAll('.custom-dropdown-option');
        const hiddenSelect = document.getElementById('group_filter');

        if (!trigger || !menu || !hiddenSelect) return;

        // toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.contains('visible');
            
            if (isOpen) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
        });

        // handle option selection
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const value = option.dataset.value;
                const text = option.querySelector('span').textContent;
                const count = option.querySelector('.option-count').textContent;
                
                // update active state
                options.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                
                // update trigger text
                document.getElementById('group_filter_text').textContent = `${text} ${count}`;
                
                // update hidden select
                hiddenSelect.value = value;
                
                // close dropdown
                this.closeDropdown();
                
                // trigger filter
                this.filterGroups();
            });
        });

        // close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!trigger.contains(e.target) && !menu.contains(e.target)) {
                this.closeDropdown();
            }
        });
    }

    openDropdown() {
        const trigger = document.getElementById('group_filter_trigger');
        const menu = document.getElementById('group_filter_menu');
        
        trigger.classList.add('open');
        menu.classList.remove('hidden');
        setTimeout(() => {
            menu.classList.add('visible');
        }, 10);
    }

    closeDropdown() {
        const trigger = document.getElementById('group_filter_trigger');
        const menu = document.getElementById('group_filter_menu');
        
        trigger.classList.remove('open');
        menu.classList.remove('visible');
        setTimeout(() => {
            menu.classList.add('hidden');
        }, 200);
    }

    setGroupsData(data) {
        this.groupsData = data;
    }

    changeView(view) {
        const container = document.getElementById('groups_container');
        const currentFilter = document.getElementById('group_filter').value;
    
        container.className = 'grid gap-4';
        container.setAttribute('data-view', view);
        
        // apply grid layout
        if (view === 'grid-1') {
            container.classList.add('grid-cols-1');
        } else if (view === 'grid-2') {
            container.classList.add('grid-cols-1', 'md:grid-cols-2');
        } else if (view === 'grid-3') {
            container.classList.add('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
        }

        // update active state of view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            if (btn.getAttribute('data-view') === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        this.currentView = view;

        // re-display groups with current filter
        let filteredGroups = this.groupsData;
        if (currentFilter === 'unicoded') {
            filteredGroups = this.groupsData.filter(group => group.detail);
        } else if (currentFilter === 'non-unicoded') {
            filteredGroups = this.groupsData.filter(group => !group.detail);
        }
        
        this.displayGroups(filteredGroups);
    }

    updateFilterCounts(groups) {
        const allCount = groups.length;
        const unicodedCount = groups.filter(group => group.detail).length;
        const nonUnicodedCount = allCount - unicodedCount;

        // update custom dropdown options with counts
        const allOption = document.querySelector('.custom-dropdown-option[data-value="all"]');
        const nonUnicodedOption = document.querySelector('.custom-dropdown-option[data-value="non-unicoded"]');
        const unicodedOption = document.querySelector('.custom-dropdown-option[data-value="unicoded"]');

        if (allOption) {
            allOption.querySelector('.option-count').textContent = `(${allCount})`;
        }
        if (nonUnicodedOption) {
            nonUnicodedOption.querySelector('.option-count').textContent = `(${nonUnicodedCount})`;
        }
        if (unicodedOption) {
            unicodedOption.querySelector('.option-count').textContent = `(${unicodedCount})`;
        }

        // update the trigger text if current selection is visible
        const currentActive = document.querySelector('.custom-dropdown-option.active');
        if (currentActive) {
            const text = currentActive.querySelector('span').textContent;
            const count = currentActive.querySelector('.option-count').textContent;
            const triggerText = document.getElementById('group_filter_text');
            if (triggerText) {
                triggerText.textContent = `${text} ${count}`;
            }
        }

        // also update the hidden select for compatibility
        const select = document.getElementById('group_filter');
        if (select) {
            select.options[0].text = `all (${allCount})`;
            select.options[1].text = `non-unicoded (${nonUnicodedCount})`;
            select.options[2].text = `unicoded (${unicodedCount})`;
        }
    }

    displayGroups(groups) {
        const container = document.getElementById('groups_container');
        const disclaimer = document.getElementById('unicode_disclaimer');
        if (!container || !disclaimer) return;

        // Ensure groups is an array (profile API may return null/undefined on error)
        const safeGroups = Array.isArray(groups) ? groups : [];
        
        const disclaimerClone = disclaimer.cloneNode(true);
        container.removeChild(disclaimer);
        container.innerHTML = '';
        container.appendChild(disclaimerClone);
        this.updateFilterCounts(this.groupsData);

        // sort groups alphabetically (null-safe for profile groups)
        safeGroups.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const currentView = container.getAttribute('data-view') || 'grid-1';
        const showLinkText = currentView === 'grid-1';
        const isMultiColumn = currentView === 'grid-2' || currentView === 'grid-3';

        // update grid columns based on view
        if (isMultiColumn) {
            container.classList.remove('grid-cols-1');
            container.classList.add(currentView === 'grid-2' ? 'md:grid-cols-2' : 'md:grid-cols-3');
        } else {
            container.classList.remove('md:grid-cols-2', 'md:grid-cols-3');
            container.classList.add('grid-cols-1');
        }

        safeGroups.forEach(group => {
            const card = document.createElement('div');
            card.className = 'group-card';
            if (group.is_unicoded) {
                card.setAttribute('data-unicoded', 'true');
            }

            // check if name or abbreviation has unicode
            const nameHasUnicode = group.detail && group.detail.includes('name:');
            const abbrHasUnicode = group.detail && group.detail.includes('abbr:');

            // parse the date - supports "9 August, 2007", "August 9, 2007", etc.
            let formattedDate = 'unknown';
            if (group.founded && typeof group.founded === 'string') {
                const date = new Date(group.founded);
                if (!isNaN(date.getTime())) {
                    formattedDate = window.utils.abbreviateMonth ? window.utils.abbreviateMonth(date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })) : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                }
            }

            // Profile groups may not have members - use '-' or formatted number
            const membersDisplay = group.members != null
                ? (typeof group.members === 'number' ? group.members.toLocaleString() : String(group.members))
                : '-';

            const safeName = (group.name || 'Unknown').replace(/"/g, '&quot;');
            const safeAvatar = (group.avatar || '').replace(/'/g, "\\'");
            const safeLink = (group.link || '').replace(/"/g, '&quot;');

            const linkElement = `
                <a href="https://steamcommunity.com/groups/${safeLink}" target="_blank" class="group-link ${isMultiColumn ? 'group-link-icon' : ''}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    ${showLinkText ? `<span>${safeLink}</span>` : ''}
                </a>
            `;

            card.innerHTML = `
                <div>
                    <div class="avatar-container" onclick="window.utils.openImageModal('${safeAvatar}')">
                        <img src="${safeAvatar}" alt="${safeName}" class="w-full h-full object-cover">
                        <svg class="view-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </div>
                    <div class="group-info-container">
                        <div class="group-header">
                            <div class="group-title">
                                <h3 class="group-name" ${nameHasUnicode ? 'data-unicoded="true"' : ''}>${safeName}</h3>
                                ${group.abbr ? `<div class="group-abbr" ${abbrHasUnicode ? 'data-unicoded="true"' : ''}>${group.abbr}</div>` : ''}
                            </div>
                            ${isMultiColumn ? linkElement : ''}
                            ${group.is_unicoded ? '<span class="group-badge text-yellow-600">unicoded</span>' : ''}
                        </div>
                        <div class="group-details">
                            <div class="group-detail">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span>${membersDisplay}</span>
                            </div>
                            <div class="group-detail">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span class="founded-date">${formattedDate}</span>
                            </div>
                            ${!isMultiColumn ? linkElement : ''}
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
        
        // setup scroll reveal animations
        setTimeout(() => {
            this.observeGroupCards();
        }, 20);
        
        window.utils.setupFadeIn();
    }

    filterGroups() {
        const filterValue = document.getElementById('group_filter').value;
        const container = document.getElementById('groups_container');
        const disclaimer = document.getElementById('unicode_disclaimer');
        let filteredGroups = this.groupsData;

        const disclaimerClone = disclaimer.cloneNode(true);
        container.removeChild(disclaimer);

        container.innerHTML = '';
        container.appendChild(disclaimerClone);

        if (filterValue === 'unicoded') {
            filteredGroups = this.groupsData.filter(group => group.detail);
        } else if (filterValue === 'non-unicoded') {
            filteredGroups = this.groupsData.filter(group => !group.detail);
        }

        // ALWAYS update filter counts with the original groups data
        this.updateFilterCounts(this.groupsData);
        this.displayGroups(filteredGroups);
        
        // setup scroll reveal animations after filter
        setTimeout(() => {
            this.observeGroupCards();
        }, 20);
    }

    initScrollObserver() {
        // enhanced intersection observer for ultra-smooth scroll reveal
        this.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // add slight delay based on intersection ratio for smoother reveals
                    const delay = (1 - entry.intersectionRatio) * 50;
                    setTimeout(() => {
                        entry.target.classList.add('scroll-reveal');
                        // unobserve immediately for better performance
                        this.scrollObserver.unobserve(entry.target);
                    }, delay);
                }
            });
        }, {
            root: document.getElementById('groups_container'),
            rootMargin: '50px 0px -10px 0px', // increased for earlier trigger
            threshold: [0.05, 0.1, 0.15, 0.2] // multiple thresholds for smoother detection
        });

        // enhanced scroll event handling
        this.setupScrollHandling();
    }

    setupScrollHandling() {
        const container = document.getElementById('groups_container');
        if (!container) return;

        let scrollTimeout;
        let isScrolling = false;
        let lastScrollTime = 0;
        let scrollDirection = 0;
        let lastScrollTop = 0;
        
        // enhanced scroll handler with momentum detection
        const handleScroll = (e) => {
            const currentTime = performance.now();
            const currentScrollTop = container.scrollTop;
            const scrollDelta = currentScrollTop - lastScrollTop;
            
            if (!isScrolling) {
                container.classList.add('scrolling');
                isScrolling = true;
            }
            
            // detect scroll direction and speed
            scrollDirection = scrollDelta > 0 ? 1 : -1;
            const scrollSpeed = Math.abs(scrollDelta) / (currentTime - lastScrollTime);
            
            // apply enhanced scroll momentum based on speed
            if (scrollSpeed > 2) {
                container.style.scrollBehavior = 'auto';
            } else {
                container.style.scrollBehavior = 'smooth';
            }
            
            lastScrollTop = currentScrollTop;
            lastScrollTime = currentTime;
            
            // enhanced scroll end detection
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                container.classList.remove('scrolling');
                container.style.scrollBehavior = 'smooth';
                isScrolling = false;
                
                // trigger additional animations for visible cards
                this.enhanceVisibleCards();
            }, 80); // reduced timeout for faster response
        };
        
        // use passive event listener for better performance
        container.addEventListener('scroll', handleScroll, { 
            passive: true,
            capture: false
        });
        
        // add wheel event for smoother trackpad scrolling
        container.addEventListener('wheel', (e) => {
            if (Math.abs(e.deltaY) > 100) {
                container.style.scrollBehavior = 'auto';
                setTimeout(() => {
                    container.style.scrollBehavior = 'smooth';
                }, 100);
            }
        }, { passive: true });
    }

    // new method to enhance visible cards during scroll
    enhanceVisibleCards() {
        const container = document.getElementById('groups_container');
        const cards = container.querySelectorAll('.group-card.scroll-reveal');
        
        cards.forEach((card, index) => {
            if (this.isElementInViewport(card)) {
                // add subtle spring animation to visible cards
                card.style.transform = 'translateZ(0) translateY(-1px) scale(1.001)';
                card.style.transition = 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                
                setTimeout(() => {
                    card.style.transform = '';
                    card.style.transition = '';
                }, 200 + (index * 10));
            }
        });
    }

    observeGroupCards() {
        // enhanced observation with staggered timing
        const groupCards = document.querySelectorAll('.group-card');
        groupCards.forEach((card, index) => {
            // immediately animate cards that are already visible with enhanced timing
            if (this.isElementInViewport(card)) {
                setTimeout(() => {
                    card.classList.add('scroll-reveal');
                }, index * 15); // reduced timing for smoother flow
            } else {
                this.scrollObserver.observe(card);
            }
        });
    }

    isElementInViewport(element) {
        const container = document.getElementById('groups_container');
        if (!container) return false;
        
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // enhanced viewport detection with buffer
        const buffer = 20;
        return (
            elementRect.top >= (containerRect.top - buffer) &&
            elementRect.bottom <= (containerRect.bottom + buffer) &&
            elementRect.top < containerRect.bottom &&
            elementRect.bottom > containerRect.top
        );
    }
}

const groupsManager = new GroupsManager();
window.groupsManager = groupsManager; 