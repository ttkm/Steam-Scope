class IdFinderManager {
    constructor() {
        this.mode = '3char';
        this.isScanning = false;
        this.scannedCount = 0;
        this.unclaimedCount = 0;
        this.results = [];

        this.ids3char = [];
        this.ids4letter = [];
        this.ids4letterPhonetic = { CVCV: [], CVCC: [], VCVC: [] };
        this.vocabAll = [];
        this.vocabClean = [];
        this.pattern4 = 'all'; // 'all' | 'CVCV' | 'CVCC' | 'VCVC'
        this.dropVocabSuffixes = false;
        this.charIndex = 0;
        this.letter4Index = 0;
        this.vocabIndex = 0;

        this.init();
    }

    async init() {
        this.setupControls();
        await this.loadVocabularies();
        this.updateStats();
        this.setReadyState();
        this.bootstrapAccessGates();
    }

    setupControls() {
        const modeButtons = document.querySelectorAll('[data-mode]');
        const pattern4Group = document.getElementById('pattern4Group');
        const vocabOptionGroup = document.getElementById('vocabOptionGroup');
        const updateModeDependentUI = () => {
            if (pattern4Group) pattern4Group.classList.toggle('pattern4-inactive', this.mode !== '4letter');
            if (vocabOptionGroup) vocabOptionGroup.classList.toggle('vocab-option-inactive', this.mode !== 'vocab');
        };
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.mode = btn.getAttribute('data-mode') || '3char';
                updateModeDependentUI();
            });
        });
        updateModeDependentUI();

        const patternButtons = document.querySelectorAll('[data-pattern4]');
        patternButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                patternButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.pattern4 = btn.getAttribute('data-pattern4') || 'all';
            });
        });

        const scanBtn = document.getElementById('scanOnceBtn');
        const clearBtn = document.getElementById('clearResultsBtn');

        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                if (this.isScanning) return;
                if (this.mode === '3char' && typeof openThreeCharConfirmModal === 'function') {
                    openThreeCharConfirmModal();
                } else {
                    this.scanBatch();
                }
            });
        }
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearResults());

        const dropSuffixToggle = document.getElementById('vocabDropSuffixToggle');
        if (dropSuffixToggle) {
            dropSuffixToggle.addEventListener('change', (e) => {
                this.dropVocabSuffixes = e.target.checked;
            });
        }

        const idFiltersBtn = document.getElementById('idFiltersBtn');
        const idFiltersDropdown = document.getElementById('idFiltersDropdown');
        const idFiltersContainer = document.getElementById('idFiltersContainer');
        const idFiltersChevron = document.getElementById('idFiltersChevron');
        if (idFiltersBtn && idFiltersDropdown) {
            let idFiltersOpen = false;
            const openIdFilters = () => {
                idFiltersDropdown.classList.remove('hidden');
                idFiltersBtn.classList.add('active');
                if (idFiltersContainer) idFiltersContainer.classList.add('active');
                if (idFiltersChevron) idFiltersChevron.classList.add('rotated');
                requestAnimationFrame(() => idFiltersDropdown.classList.add('show'));
                idFiltersOpen = true;
            };
            const closeIdFilters = () => {
                idFiltersDropdown.classList.remove('show');
                idFiltersBtn.classList.remove('active');
                if (idFiltersContainer) idFiltersContainer.classList.remove('active');
                if (idFiltersChevron) idFiltersChevron.classList.remove('rotated');
                setTimeout(() => idFiltersDropdown.classList.add('hidden'), 300);
                idFiltersOpen = false;
            };
            idFiltersBtn.addEventListener('click', () => {
                if (idFiltersOpen) closeIdFilters();
                else openIdFilters();
            });
            document.addEventListener('click', (e) => {
                if (idFiltersOpen && idFiltersBtn && !idFiltersBtn.contains(e.target) && idFiltersDropdown && !idFiltersDropdown.contains(e.target)) {
                    closeIdFilters();
                }
            });
        }
    }

    /** Generate all 3-char IDs: letters a-z + digits 0-9 (36^3) */
    generate3CharAlphanumeric() {
        const out = [];
        const total = 36 * 36 * 36;
        for (let n = 0; n < total; n++) {
            let s = '';
            let x = n;
            for (let i = 0; i < 3; i++) {
                const d = x % 36;
                s = (d < 10 ? String.fromCharCode(48 + d) : String.fromCharCode(87 + d)) + s;
                x = Math.floor(x / 36);
            }
            out.push(s);
        }
        return this.shuffleArray(out);
    }

    /** Generate all a-z strings of given length (4 => aaaa..zzzz, letters only) */
    generateLetterIds(len) {
        const out = [];
        const total = Math.pow(26, len);
        for (let n = 0; n < total; n++) {
            let s = '';
            let x = n;
            for (let i = 0; i < len; i++) {
                s = String.fromCharCode(97 + (x % 26)) + s;
                x = Math.floor(x / 26);
            }
            out.push(s);
        }
        return this.shuffleArray(out);
    }

    /** Phonetic 4-letter patterns: CVCV, CVCC, VCVC (pronounceable, often unclaimed) */
    generatePhonetic4Letter(pattern) {
        const V = 'aeiou';
        const C = 'bcdfghjklmnpqrstvwxyz';
        const out = [];
        if (pattern === 'CVCV') {
            for (const c1 of C) for (const v1 of V) for (const c2 of C) for (const v2 of V) out.push(c1 + v1 + c2 + v2);
        } else if (pattern === 'CVCC') {
            for (const c1 of C) for (const v1 of V) for (const c2 of C) for (const c3 of C) out.push(c1 + v1 + c2 + c3);
        } else if (pattern === 'VCVC') {
            for (const v1 of V) for (const c1 of C) for (const v2 of V) for (const c2 of C) out.push(v1 + c1 + v2 + c2);
        }
        return this.shuffleArray(out);
    }

    async loadVocabularies() {
        this.ids3char = this.generate3CharAlphanumeric();
        this.ids4letter = this.generateLetterIds(4);
        this.ids4letterPhonetic.CVCV = this.generatePhonetic4Letter('CVCV');
        this.ids4letterPhonetic.CVCC = this.generatePhonetic4Letter('CVCC');
        this.ids4letterPhonetic.VCVC = this.generatePhonetic4Letter('VCVC');

        const loadTxt = async (path) => {
            try {
                let resp = await fetch(path);
                if (!resp.ok) resp = await fetch('/steam/' + path);
                if (!resp.ok) return [];
                const text = await resp.text();
                return text.split(/\r?\n/).map(x => x.trim().toLowerCase()).filter(Boolean);
            } catch (_) {
                return [];
            }
        };

        let raw = await loadTxt('static/vocab/words.txt');
        raw = raw.filter(w => w.length >= 3 && w.length <= 8);
        this.vocabAll = this.shuffleArray([...raw]);
        const cleanSuffix = /(ing|ed|ly|ness)$/;
        this.vocabClean = this.shuffleArray(raw.filter(w => !cleanSuffix.test(w)));
    }

    shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    setReadyState() {
        const loading = document.getElementById('loading');
        const msg = document.getElementById('loading-message');
        if (loading) {
            loading.classList.remove('hidden');
        }
        if (msg) {
            msg.textContent = 'ready to scan...';
        }
    }

    bootstrapAccessGates() {
        if (!window.authManager) return;

        window.authManager.onReady((user) => {
            const authGate = document.getElementById('authGate');
            const searchContainer = document.getElementById('searchContainer');

            if (!user) {
                if (authGate) authGate.classList.remove('hidden');
                if (searchContainer) searchContainer.classList.add('hidden');
                return;
            }

            if (authGate) authGate.classList.add('hidden');
            if (searchContainer) searchContainer.classList.remove('hidden');
        });
    }

    updateStats() {
        const el = document.getElementById('id_stats');
        if (!el) return;
        el.textContent = `scanned: ${this.scannedCount}${this.unclaimedCount > 0 ? ` • ${this.unclaimedCount} in list` : ''}`;
    }

    clearResults() {
        this.results = [];
        this.scannedCount = 0;
        this.unclaimedCount = 0;
        const resultsEl = document.getElementById('id_results');
        if (resultsEl) resultsEl.innerHTML = '';
        const summaryEl = document.getElementById('id_result_summary');
        if (summaryEl) summaryEl.textContent = '';
        const countEl = document.getElementById('results_count_ids');
        if (countEl) countEl.textContent = '0 ids';
        const resultsContainer = document.getElementById('results');
        if (resultsContainer) resultsContainer.classList.add('hidden');
        const errorEl = document.getElementById('error');
        if (errorEl) errorEl.classList.add('hidden');
        this.updateStats();
    }

    showError(message) {
        const errorEl = document.getElementById('error');
        if (!errorEl) return;
        errorEl.querySelector('span').textContent = message;
        errorEl.classList.remove('hidden');
    }

    getNextCandidates(limit = 100) {
        const out = [];
        if (this.mode === '3char') {
            const src = this.ids3char;
            if (!(Array.isArray(src) && src.length)) return out;
            for (let i = 0; i < limit; i++) {
                out.push(src[this.charIndex % src.length]);
                this.charIndex++;
            }
        } else if (this.mode === '4letter') {
            const src = this.pattern4 === 'all' ? this.ids4letter : (this.ids4letterPhonetic[this.pattern4] || []);
            if (!(Array.isArray(src) && src.length)) return out;
            for (let i = 0; i < limit; i++) {
                out.push(src[this.letter4Index % src.length]);
                this.letter4Index++;
            }
        } else {
            const src = this.dropVocabSuffixes ? this.vocabClean : this.vocabAll;
            if (!src.length) return out;
            for (let i = 0; i < limit; i++) {
                out.push(src[this.vocabIndex % src.length]);
                this.vocabIndex++;
            }
        }
        return out;
    }

        /** Scan up to 500 IDs per batch. Requires login; server enforces rate limits to prevent abuse. */
    async scanBatch() {
        const resultsEl = document.getElementById('results');
        const summaryEl = document.getElementById('id_result_summary');
        const PARALLEL = 10;
        const TARGET_FOUND = 10;
        const BATCH_SIZE = 500;

        const candidates = this.getNextCandidates(BATCH_SIZE);
        if (candidates.length === 0) {
            this.showError(this.mode === 'vocab' ? 'no vocabulary loaded' : 'no ids available for this mode');
            return;
        }

        this.isScanning = true;
        this.showError('');
        const errorEl = document.getElementById('error');
        if (errorEl) errorEl.classList.add('hidden');
        const batchStartScanned = this.scannedCount;

        const scanOnceBtn = document.getElementById('scanOnceBtn');
        if (scanOnceBtn) {
            scanOnceBtn.disabled = true;
            scanOnceBtn.classList.add('cursor-not-allowed');
        }

        if (window.loadingManager) window.loadingManager.showLoading();
        else {
            const loading = document.getElementById('loading');
            const loadingMsg = document.getElementById('loading-message');
            if (loading) loading.classList.remove('hidden');
            if (loadingMsg) loadingMsg.textContent = 'scanning...';
        }

        try {
            const batchStartUnclaimed = this.unclaimedCount;
            for (let i = 0; i < candidates.length; i += PARALLEL) {
                if (this.unclaimedCount - batchStartUnclaimed >= TARGET_FOUND) break;
                const chunk = candidates.slice(i, i + PARALLEL);
                const results = await Promise.all(chunk.map(id => this.checkId(id)));
                for (const res of results) {
                    if (res.available) {
                        this.appendResult(res);
                        if (resultsEl) resultsEl.classList.remove('hidden');
                    }
                }
                this.updateStats();
            }

            const foundThisBatch = this.unclaimedCount - batchStartUnclaimed;
            const batchScanned = this.scannedCount - batchStartScanned;
            if (summaryEl) {
                summaryEl.textContent = foundThisBatch > 0
                    ? `found ${foundThisBatch} this batch after ${batchScanned} check${batchScanned !== 1 ? 's' : ''} • ${this.unclaimedCount} total in list`
                    : `batch ended after ${batchScanned} check${batchScanned !== 1 ? 's' : ''} • ${this.unclaimedCount} total in list`;
            }
            const countEl = document.getElementById('results_count_ids');
            if (countEl) countEl.textContent = `${this.unclaimedCount} unclaimed`;
            this.updateStats();
        } catch (e) {
            this.showError(e.message || 'scan failed');
        } finally {
            this.isScanning = false;
            if (window.loadingManager) window.loadingManager.hideLoading();
            else {
                const loading = document.getElementById('loading');
                if (loading) loading.classList.add('hidden');
            }
            if (scanOnceBtn) {
                scanOnceBtn.disabled = false;
                scanOnceBtn.classList.remove('cursor-not-allowed');
            }
            this.updateStats();
            if (window.authManager && typeof window.authManager.refreshUser === 'function') window.authManager.refreshUser();
        }
    }

    async checkId(id) {
        const body = { id };
        const resp = await fetch('/api/vanity/check', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        let data;
        try {
            data = await resp.json();
        } catch {
            data = { error: `HTTP ${resp.status}` };
        }
        if (resp.status === 429 || data.code === 'RATE_LIMITED') {
            throw new Error('steam rate limit - retry in a minute');
        }
        if (data.code === 'AUTH_REQUIRED') {
            throw new Error('authentication required');
        }
        if (data.error) {
            throw new Error(data.error);
        }
        this.scannedCount++;
        if (data.available) this.unclaimedCount++;
        return data;
    }

    appendResult(res) {
        const container = document.getElementById('id_results');
        if (!container || !res.available) return;
        const line = document.createElement('div');
        line.className = 'flex items-center justify-between gap-3';
        line.innerHTML = `
            <span class="inline-flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700">unclaimed</span>
                <span class="lowercase">${res.id}</span>
            </span>
            <span class="text-xs text-gray-400 lowercase">steamcommunity.com/id/${res.id}</span>
        `;
        container.appendChild(line);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    window.idFinderManager = new IdFinderManager();
});

// --------------- 3-char confirmation modal helpers ---------------
function openThreeCharConfirmModal() {
    var modal = document.getElementById('threeCharConfirmModal');
    if (!modal) return;
    modal.classList.remove('hidden', 'subscription-modal-closing');
    modal.classList.remove('subscription-modal-visible');
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            modal.classList.add('subscription-modal-visible');
        });
    });
}

function closeThreeCharConfirmModal() {
    var modal = document.getElementById('threeCharConfirmModal');
    if (!modal || modal.classList.contains('subscription-modal-closing')) return;
    modal.classList.add('subscription-modal-closing');
    modal.classList.remove('subscription-modal-visible');
    var onEnd = function () {
        modal.removeEventListener('transitionend', onEnd);
        modal.classList.add('hidden');
        modal.classList.remove('subscription-modal-closing');
    };
    modal.addEventListener('transitionend', onEnd);
    setTimeout(function () {
        if (modal.classList.contains('subscription-modal-closing')) {
            modal.classList.add('hidden');
            modal.classList.remove('subscription-modal-closing');
        }
    }, 350);
}

function confirmThreeCharScan() {
    closeThreeCharConfirmModal();
    if (window.idFinderManager && typeof window.idFinderManager.scanBatch === 'function') {
        window.idFinderManager.scanBatch();
    }
}

