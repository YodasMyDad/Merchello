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

        toggleFilter(filterId) {
            const index = this.selectedFilters.indexOf(filterId);
            if (index > -1) {
                this.selectedFilters.splice(index, 1);
            } else {
                this.selectedFilters.push(filterId);
            }
            this.currentPage = 1;
            this.applyFilters();
        },

        clearFilters() {
            this.selectedFilters = [];
            this.currentPage = 1;
            this.applyFilters();
        },

        onPriceChange() {
            if (this.priceMin > this.priceMax) {
                [this.priceMin, this.priceMax] = [this.priceMax, this.priceMin];
            }
            this.currentPage = 1;
            this.debouncedApply();
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
            this.applyFilters();
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
