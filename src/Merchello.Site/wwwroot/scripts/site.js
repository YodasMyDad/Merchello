/**
 * Merchello Store - Alpine.js Components
 */

document.addEventListener('alpine:init', () => {

    // ==========================================================================
    // Global Stores
    // ==========================================================================

    /**
     * Basket Store - Global state for basket count
     */
    Alpine.store('basket', {
        count: 0,
        total: 0,
        formattedTotal: '',

        async init() {
            await this.fetchCount();
        },

        async fetchCount() {
            try {
                const response = await fetch('/api/storefront/basket/count');
                if (response.ok) {
                    const data = await response.json();
                    this.count = data.itemCount;
                    this.total = data.total;
                    this.formattedTotal = data.formattedTotal;
                }
            } catch (error) {
                console.error('Failed to fetch basket count:', error);
            }
        },

        update(count, total, formattedTotal) {
            this.count = count;
            this.total = total;
            this.formattedTotal = formattedTotal;
        }
    });

    /**
     * Toast Store - Global toast notification system
     */
    Alpine.store('toast', {
        show(message, type = 'success', duration = 3000) {
            const event = new CustomEvent('show-toast', {
                detail: { message, type, duration }
            });
            window.dispatchEvent(event);
        }
    });

    // ==========================================================================
    // Components
    // ==========================================================================

    /**
     * Toast Container Component
     */
    Alpine.data('toastContainer', () => ({
        toasts: [],
        nextId: 0,

        init() {
            window.addEventListener('show-toast', (e) => {
                this.addToast(e.detail.message, e.detail.type, e.detail.duration);
            });
        },

        addToast(message, type = 'success', duration = 3000) {
            const id = this.nextId++;
            this.toasts.push({ id, message, type });

            if (duration > 0) {
                setTimeout(() => {
                    this.removeToast(id);
                }, duration);
            }
        },

        removeToast(id) {
            this.toasts = this.toasts.filter(t => t.id !== id);
        }
    }));

    /**
     * Product Page Component
     */
    Alpine.data('productPage', (config) => ({
        // State
        selectedVariantId: config.selectedVariantId,
        selectedOptions: config.selectedOptions || {},
        selectedAddons: [],
        quantity: 1,
        isLoading: false,

        // Swiper instances
        mainSwiper: null,
        thumbsSwiper: null,

        // Config data
        variants: config.variants || [],
        variantOptions: config.variantOptions || [],
        addonOptions: config.addonOptions || [],
        productUrl: config.productUrl,
        currencySymbol: config.currencySymbol || '£',
        lowStockThreshold: config.lowStockThreshold || 10,

        // Current variant (computed)
        get currentVariant() {
            return this.variants.find(v => v.id === this.selectedVariantId) || this.variants[0];
        },

        get price() {
            return this.currentVariant?.price || 0;
        },

        get previousPrice() {
            return this.currentVariant?.previousPrice;
        },

        get onSale() {
            return this.currentVariant?.onSale || false;
        },

        get inStock() {
            return this.currentVariant?.availableForPurchase || false;
        },

        get trackStock() {
            return this.currentVariant?.trackStock || false;
        },

        get stockCount() {
            return this.currentVariant?.totalStock || 0;
        },

        get images() {
            return this.currentVariant?.images || [];
        },

        get sku() {
            return this.currentVariant?.sku || '';
        },

        get totalPrice() {
            const base = this.price;
            const addonsTotal = this.selectedAddons.reduce((sum, a) => sum + a.price, 0);
            return base + addonsTotal;
        },

        get maxQuantity() {
            if (!this.trackStock) return 99;
            return Math.min(this.stockCount, 99);
        },

        // Methods
        init() {
            // Initialize Swiper instances after DOM is ready
            this.$nextTick(() => {
                this.initGallerySwipers();
                this.initOptionSwipers();
            });
        },

        destroyGallerySwipers() {
            if (this.mainSwiper) {
                this.mainSwiper.destroy(true, true);
                this.mainSwiper = null;
            }
            if (this.thumbsSwiper) {
                this.thumbsSwiper.destroy(true, true);
                this.thumbsSwiper = null;
            }
        },

        initGallerySwipers() {
            // Destroy existing instances first
            this.destroyGallerySwipers();

            const thumbsEl = this.$refs.galleryThumbs;
            const mainEl = this.$refs.galleryMain;

            if (mainEl) {
                // Initialize thumbs swiper first if it exists
                if (thumbsEl) {
                    this.thumbsSwiper = new Swiper(thumbsEl, {
                        spaceBetween: 10,
                        slidesPerView: 4,
                        freeMode: true,
                        watchSlidesProgress: true,
                    });
                }

                // Initialize main swiper with optional thumbs
                this.mainSwiper = new Swiper(mainEl, {
                    spaceBetween: 10,
                    navigation: {
                        nextEl: mainEl.querySelector('.swiper-button-next'),
                        prevEl: mainEl.querySelector('.swiper-button-prev'),
                    },
                    thumbs: this.thumbsSwiper ? { swiper: this.thumbsSwiper } : undefined,
                });
            }
        },

        initOptionSwipers() {
            // Option swipers (for color/image swatches with many values)
            this.$el.querySelectorAll('.option-swiper').forEach((el) => {
                // Skip if already initialized
                if (el.swiper) return;

                new Swiper(el, {
                    slidesPerView: 'auto',
                    spaceBetween: 8,
                    freeMode: true,
                    navigation: {
                        nextEl: el.querySelector('.swiper-button-next'),
                        prevEl: el.querySelector('.swiper-button-prev'),
                    },
                });
            });
        },

        selectOption(optionAlias, valueId) {
            this.selectedOptions[optionAlias] = valueId;
            this.updateVariant();
        },

        toggleAddon(optionId, valueId, price, isChecked) {
            if (isChecked) {
                // Add addon
                if (!this.selectedAddons.find(a => a.optionId === optionId && a.valueId === valueId)) {
                    this.selectedAddons.push({ optionId, valueId, price });
                }
            } else {
                // Remove addon
                this.selectedAddons = this.selectedAddons.filter(
                    a => !(a.optionId === optionId && a.valueId === valueId)
                );
            }
        },

        selectAddonRadio(optionId, valueId, price) {
            // Remove any existing selection for this option
            this.selectedAddons = this.selectedAddons.filter(a => a.optionId !== optionId);
            // Add new selection if value is provided
            if (valueId) {
                this.selectedAddons.push({ optionId, valueId, price });
            }
        },

        isAddonSelected(optionId, valueId) {
            return this.selectedAddons.some(a => a.optionId === optionId && a.valueId === valueId);
        },

        updateVariant() {
            // Build the variant options key from selected option value IDs
            // The key is built by joining value IDs sorted alphabetically (matching C# OrderBy(x => x.Id))
            const selectedValueIds = this.variantOptions
                .map(opt => this.selectedOptions[opt.alias])
                .filter(id => id);

            // Sort IDs alphabetically to match C# GUID ordering
            const variantKey = selectedValueIds.sort().join('-');

            // Find matching variant
            const variant = this.variants.find(v => v.variantOptionsKey === variantKey);

            if (variant) {
                this.selectedVariantId = variant.id;

                // Update URL
                const newUrl = variant.url || this.productUrl;
                if (window.location.pathname !== newUrl) {
                    window.history.pushState({}, '', newUrl);
                }

                // Reinitialize gallery swipers after Alpine re-renders the images
                // Use small delay to ensure Alpine has fully rendered the DOM
                this.$nextTick(() => {
                    setTimeout(() => {
                        this.initGallerySwipers();
                    }, 50);
                });
            }
        },

        async addToCart() {
            if (!this.inStock || this.isLoading) return;

            this.isLoading = true;

            try {
                const response = await fetch('/api/storefront/basket/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        productId: this.selectedVariantId,
                        quantity: this.quantity,
                        addons: this.selectedAddons.map(a => ({
                            optionId: a.optionId,
                            valueId: a.valueId
                        }))
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    // Update basket store
                    Alpine.store('basket').update(data.itemCount, data.total, data.formattedTotal);

                    // Show success toast
                    Alpine.store('toast').show('Added to basket!', 'success');
                } else {
                    // Show error toast
                    Alpine.store('toast').show(data.message || 'Failed to add to basket', 'danger');
                }
            } catch (error) {
                console.error('Add to cart error:', error);
                Alpine.store('toast').show('An error occurred. Please try again.', 'danger');
            } finally {
                this.isLoading = false;
            }
        },

        formatPrice(value) {
            return this.currencySymbol + value.toFixed(2);
        },

        incrementQuantity() {
            if (this.quantity < this.maxQuantity) {
                this.quantity++;
            }
        },

        decrementQuantity() {
            if (this.quantity > 1) {
                this.quantity--;
            }
        }
    }));

});
