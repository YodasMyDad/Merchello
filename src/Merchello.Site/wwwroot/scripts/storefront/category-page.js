export function registerCategoryPage(Alpine) {
    Alpine.data("categoryPage", (config) => ({
        selectedFilters: config.selectedFilters || [],
        priceMin: config.priceMin,
        priceMax: config.priceMax,
        sortBy: config.sortBy,
        currentPage: config.currentPage,
        rangeMin: config.rangeMin,
        rangeMax: config.rangeMax,
        debounceTimer: null,
        deferApply: false,
        pendingChanges: false,
        _filterSnapshot: null,

        init() {
            const panel = document.getElementById('filterPanel');
            if (panel) {
                panel.addEventListener('show.bs.offcanvas', () => {
                    this.deferApply = true;
                    this.pendingChanges = false;
                    this._filterSnapshot = {
                        selectedFilters: [...this.selectedFilters],
                        priceMin: this.priceMin,
                        priceMax: this.priceMax
                    };
                });
                panel.addEventListener('hidden.bs.offcanvas', () => {
                    if (this.pendingChanges && this._filterSnapshot) {
                        this.selectedFilters = this._filterSnapshot.selectedFilters;
                        this.priceMin = this._filterSnapshot.priceMin;
                        this.priceMax = this._filterSnapshot.priceMax;
                    }
                    this.deferApply = false;
                    this.pendingChanges = false;
                    this._filterSnapshot = null;
                });
            }
        },

        toggleFilter(filterId) {
            const index = this.selectedFilters.indexOf(filterId);
            if (index > -1) {
                this.selectedFilters.splice(index, 1);
            } else {
                this.selectedFilters.push(filterId);
            }
            this.currentPage = 1;
            if (this.deferApply) {
                this.pendingChanges = true;
            } else {
                this.applyFilters();
            }
        },

        clearFilters() {
            this.selectedFilters = [];
            this.currentPage = 1;
            if (this.deferApply) {
                this.pendingChanges = true;
            } else {
                this.applyFilters();
            }
        },

        onPriceChange() {
            if (this.priceMin > this.priceMax) {
                [this.priceMin, this.priceMax] = [this.priceMax, this.priceMin];
            }
            this.currentPage = 1;
            if (this.deferApply) {
                this.pendingChanges = true;
            } else {
                this.debouncedApply();
            }
        },

        debouncedApply() {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.applyFilters();
            }, 500);
        },

        goToPage(page) {
            this.currentPage = page;
            this.applyFilters();
        },

        clearAllFilters() {
            this.selectedFilters = [];
            this.priceMin = this.rangeMin;
            this.priceMax = this.rangeMax;
            this.sortBy = 0;
            this.currentPage = 1;
            if (this.deferApply) {
                this.pendingChanges = true;
            } else {
                this.applyFilters();
            }
        },

        applyAndClose() {
            const panel = document.getElementById('filterPanel');
            const offcanvas = bootstrap.Offcanvas.getInstance(panel);
            this.pendingChanges = false;
            this._filterSnapshot = null;
            this.deferApply = false;
            if (offcanvas) {
                offcanvas.hide();
            }
            this.applyFilters();
        },

        activeFilterCount() {
            let count = this.selectedFilters.length;
            if (this.priceMin > this.rangeMin || this.priceMax < this.rangeMax) {
                count++;
            }
            return count;
        },

        applyFilters() {
            const params = new URLSearchParams();

            this.selectedFilters.forEach((id) => {
                params.append("filterKeys", id);
            });

            if (this.priceMin > this.rangeMin) {
                params.set("minPrice", this.priceMin);
            }
            if (this.priceMax < this.rangeMax) {
                params.set("maxPrice", this.priceMax);
            }
            if (this.sortBy !== 0) {
                params.set("orderBy", this.sortBy);
            }
            if (this.currentPage > 1) {
                params.set("page", this.currentPage);
            }

            const queryString = params.toString();
            const newUrl = window.location.pathname + (queryString ? `?${queryString}` : "");
            window.location.href = newUrl;
        }
    }));
}
