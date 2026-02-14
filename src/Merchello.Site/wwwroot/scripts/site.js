/**
 * Merchello Store - Alpine.js Components
 */

document.addEventListener('alpine:init', () => {

    // ==========================================================================
    // Global Stores
    // ==========================================================================

    /**
     * Basket Store - Global state for basket count
     * Uses MerchelloApi for centralized API access
     */
    Alpine.store('basket', {
        count: 0,
        total: 0,
        formattedTotal: '',

        async init() {
            await this.fetchCount();
        },

        async fetchCount() {
            const result = await MerchelloApi.basket.getCount();
            if (result.success) {
                this.count = result.data.itemCount;
                this.total = result.data.total;
                this.formattedTotal = result.data.formattedTotal;
            }
        },

        update(count, total, formattedTotal) {
            this.count = count;
            this.total = total;
            this.formattedTotal = formattedTotal;
        }
    });

    /**
     * Country Store - Global shipping country state
     * Uses MerchelloApi for centralized API access
     */
    Alpine.store('country', {
        code: '',
        name: '',
        countries: [],
        isLoading: false,

        async init() {
            await this.fetch();
        },

        async fetch() {
            const result = await MerchelloApi.shipping.getCountries();
            if (result.success) {
                this.countries = result.data.countries;
                this.code = result.data.current.code;
                this.name = result.data.current.name;
            }
        },

        async setCountry(code) {
            this.isLoading = true;
            const result = await MerchelloApi.shipping.setCountry(code);
            if (result.success) {
                this.code = result.data.countryCode;
                this.name = result.data.countryName;
                // Reload page to refresh server-rendered prices in new currency
                window.location.reload();
            }
            this.isLoading = false;
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

    /**
     * Currency Store - Global currency context for price display.
     * Values are populated from server via StorefrontCurrency component (window.merchelloCurrency).
     * These defaults are fallbacks only - actual values come from Merchello settings.
     */
    Alpine.store('currency', {
        // Fallback defaults - overwritten by server values in init()
        code: window.merchelloCurrency?.code || 'GBP',
        symbol: window.merchelloCurrency?.symbol || '£',
        decimals: window.merchelloCurrency?.decimals ?? 2,
        rate: window.merchelloCurrency?.rate ?? 1.0,
        storeCode: window.merchelloCurrency?.storeCode || 'GBP',

        init() {
            // Values already set from window.merchelloCurrency above
            // This init is kept for any additional setup if needed
        },

        // Format a display price (already converted by server - no conversion needed)
        // Use this for server-provided display prices (single source of truth)
        // Per TaxInclusive.md: All prices are pre-calculated server-side with tax and currency conversion
        formatDisplayPrice(displayPrice) {
            return new Intl.NumberFormat(undefined, {
                style: 'currency',
                currency: this.code || 'GBP',
                minimumFractionDigits: this.decimals,
                maximumFractionDigits: this.decimals
            }).format(displayPrice);
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
        addonValidationErrors: {},
        quantity: 1,
        isLoading: false,
        productId: config.productId || null,
        upsellSuggestions: [],
        upsellsLoading: false,

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
        // Tax display info
        includesTax: config.includesTax || false,
        taxRate: config.taxRate || 0,

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

        // Display prices (pre-converted by server - single source of truth)
        get displayPrice() {
            return this.currentVariant?.displayPrice || 0;
        },

        get displayPreviousPrice() {
            return this.currentVariant?.displayPreviousPrice;
        },

        get formattedDisplayPrice() {
            return this.currentVariant?.formattedDisplayPrice || '';
        },

        get formattedDisplayPreviousPrice() {
            return this.currentVariant?.formattedDisplayPreviousPrice;
        },

        get onSale() {
            return this.currentVariant?.onSale || false;
        },

        get inStock() {
            // availableForPurchase is set server-side based on canShipToLocation && hasStock
            // We also explicitly check canShipToLocation here for clarity
            return (this.currentVariant?.availableForPurchase || false) && this.canShipToLocation;
        },

        get trackStock() {
            return this.currentVariant?.trackStock || false;
        },

        get stockCount() {
            return this.currentVariant?.totalStock || 0;
        },

        get showStockLevels() {
            return this.currentVariant?.showStockLevels || false;
        },

        get canShipToLocation() {
            return this.currentVariant?.canShipToLocation ?? true;
        },

        get images() {
            const variantImages = this.currentVariant?.images || [];
            const selectedSwatchImage = this.getSelectedSwatchImage();
            if (!selectedSwatchImage) {
                return variantImages;
            }

            return [selectedSwatchImage, ...variantImages.filter(image => image !== selectedSwatchImage)];
        },

        get sku() {
            return this.currentVariant?.sku || '';
        },

        get totalPrice() {
            const base = this.price;
            const addonsTotal = this.selectedAddons.reduce((sum, a) => sum + a.price, 0);
            return base + addonsTotal;
        },

        // Display total price (uses pre-converted values from server)
        get displayTotalPrice() {
            const base = this.displayPrice;
            const addonsTotal = this.selectedAddons.reduce((sum, a) => sum + (a.displayPrice || 0), 0);
            return base + addonsTotal;
        },

        // Formatted display total price (for UI - uses server values, no frontend conversion)
        get formattedDisplayTotalPrice() {
            // Use currency store for consistent formatting of pre-converted total
            return Alpine.store('currency').formatDisplayPrice(this.displayTotalPrice);
        },

        // UX hint only - backend validates actual stock quantity in basket/add API
        // This prevents users from selecting more than displayed stock, but the true
        // validation happens server-side to account for concurrent purchases and reservations
        get maxQuantity() {
            if (!this.trackStock) return 99;
            return Math.min(this.stockCount, 99);
        },

        // Methods
        init() {
            this.syncSelectedOptionsFromVariant(this.currentVariant);

            // Initialize Swiper instances after DOM is ready
            this.$nextTick(() => {
                this.initGallerySwipers();
                this.initOptionSwipers();
                this.loadProductUpsells();
            });
        },

        getSelectedOptionValue(optionAlias) {
            const option = this.variantOptions.find(opt => opt.alias === optionAlias);
            const selectedValueId = this.selectedOptions[optionAlias];
            return option?.values?.find(value => value.id === selectedValueId) || null;
        },

        getOptionLabel(optionAlias, optionName) {
            const selectedValue = this.getSelectedOptionValue(optionAlias);
            if (!selectedValue?.name) {
                return optionName;
            }

            return `${optionName}: ${selectedValue.name}`;
        },

        getSelectedSwatchImage() {
            for (const option of this.variantOptions) {
                if (option.uiType !== 'image') continue;

                const selectedValueId = this.selectedOptions[option.alias];
                if (!selectedValueId) continue;

                const selectedValue = option.values?.find(value => value.id === selectedValueId);
                if (selectedValue?.mediaUrl) {
                    return selectedValue.mediaUrl;
                }
            }

            return null;
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
            this.selectedOptions = {
                ...this.selectedOptions,
                [optionAlias]: valueId
            };
            this.updateVariant();
        },

        toggleAddon(optionId, valueId, price, displayPrice, isChecked, isMultiSelect = true) {
            const nextAddon = { optionId, valueId, price, displayPrice };
            if (!isMultiSelect) {
                if (isChecked) {
                    // Single-select add-ons replace any existing selection for the same option.
                    this.selectedAddons = [
                        ...this.selectedAddons.filter(a => a.optionId !== optionId),
                        nextAddon
                    ];
                } else {
                    this.selectedAddons = this.selectedAddons.filter(
                        a => !(a.optionId === optionId && a.valueId === valueId)
                    );
                }

                if (this.getSelectedAddonsForOption(optionId).length > 0) {
                    this.clearAddonValidationError(optionId);
                }
                return;
            }

            if (isChecked) {
                if (!this.selectedAddons.find(a => a.optionId === optionId && a.valueId === valueId)) {
                    this.selectedAddons = [...this.selectedAddons, nextAddon];
                }
            } else {
                this.selectedAddons = this.selectedAddons.filter(
                    a => !(a.optionId === optionId && a.valueId === valueId)
                );
            }

            if (this.getSelectedAddonsForOption(optionId).length > 0) {
                this.clearAddonValidationError(optionId);
            }
        },

        selectAddonRadio(optionId, valueId, price, displayPrice) {
            // Remove any existing selection for this option
            const remainingSelections = this.selectedAddons.filter(a => a.optionId !== optionId);
            if (valueId) {
                this.selectedAddons = [...remainingSelections, { optionId, valueId, price, displayPrice }];
            } else {
                this.selectedAddons = remainingSelections;
            }

            if (this.getSelectedAddonsForOption(optionId).length > 0) {
                this.clearAddonValidationError(optionId);
            }
        },

        isAddonSelected(optionId, valueId) {
            return this.selectedAddons.some(a => a.optionId === optionId && a.valueId === valueId);
        },

        getSelectedAddonsForOption(optionId) {
            return this.selectedAddons.filter(a => a.optionId === optionId);
        },

        validateRequiredAddons() {
            const validationErrors = {};
            const requiredOptions = this.addonOptions.filter(option => option.isRequired === true);

            for (const option of requiredOptions) {
                const hasSelection = this.getSelectedAddonsForOption(option.id).length > 0;
                if (!hasSelection) {
                    const optionName = option.name || 'required add-on';
                    validationErrors[option.id] = `Please select at least one value for ${optionName}.`;
                }
            }

            this.addonValidationErrors = validationErrors;
            return Object.keys(validationErrors).length === 0;
        },

        getAddonValidationError(optionId) {
            return this.addonValidationErrors[optionId] || '';
        },

        clearAddonValidationError(optionId) {
            if (!this.addonValidationErrors[optionId]) {
                return;
            }

            const nextErrors = { ...this.addonValidationErrors };
            delete nextErrors[optionId];
            this.addonValidationErrors = nextErrors;
        },

        updateVariant() {
            // Build the variant options key from selected option value IDs
            // The key is built by joining value IDs in option order (comma-separated, matching backend generation)
            const selectedValueIds = this.variantOptions
                .map(opt => this.selectedOptions[opt.alias])
                .filter(id => id);

            if (selectedValueIds.length !== this.variantOptions.length) {
                return;
            }

            const variantKey = selectedValueIds.map(id => id.toLowerCase()).join(',');

            // Find matching variant
            const variant = this.variants.find(v => v.variantOptionsKey === variantKey);

            if (variant) {
                this.selectedVariantId = variant.id;
                this.syncSelectedOptionsFromVariant(variant);

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

        syncSelectedOptionsFromVariant(variant) {
            if (!variant?.variantOptionsKey) return;

            const variantValueIds = new Set(
                variant.variantOptionsKey
                    .split(',')
                    .map(id => id.trim().toLowerCase())
                    .filter(id => id.length > 0)
            );

            const nextSelectedOptions = { ...this.selectedOptions };
            this.variantOptions.forEach(option => {
                const matchingValue = option.values?.find(value => variantValueIds.has(value.id.toLowerCase()));
                if (matchingValue) {
                    nextSelectedOptions[option.alias] = matchingValue.id;
                }
            });

            this.selectedOptions = nextSelectedOptions;
        },

        async addToCart() {
            if (!this.inStock || this.isLoading) return;

            if (!this.validateRequiredAddons()) {
                Alpine.store('toast').show('Please select all required add-ons before adding to basket.', 'danger');
                return;
            }

            this.isLoading = true;

            try {
                // Use centralized MerchelloApi for basket operations
                const result = await MerchelloApi.basket.add({
                    productId: this.selectedVariantId,
                    quantity: this.quantity,
                    addons: this.selectedAddons.map(a => ({
                        optionId: a.optionId,
                        valueId: a.valueId
                    }))
                });

                if (result.success && result.data.success) {
                    // Update basket store
                    Alpine.store('basket').update(
                        result.data.itemCount,
                        result.data.total,
                        result.data.formattedTotal
                    );
                    Alpine.store('toast').show('Added to basket!', 'success');
                } else {
                    Alpine.store('toast').show(
                        result.data?.message || result.error || 'Failed to add to basket',
                        'danger'
                    );
                }
            } catch (error) {
                console.error('Add to cart error:', error);
                Alpine.store('toast').show('An error occurred. Please try again.', 'danger');
            } finally {
                this.isLoading = false;
            }
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
        },

        async loadProductUpsells() {
            if (!this.productId) return;
            this.upsellsLoading = true;
            try {
                const result = await MerchelloApi.upsells.getProductSuggestions(this.productId);
                if (result.success) {
                    this.upsellSuggestions = result.data || [];
                    this.trackProductUpsellImpressions();
                }
            } catch (error) {
                console.error('Failed to load product upsells:', error);
            } finally {
                this.upsellsLoading = false;
            }
        },

        trackProductUpsellImpressions() {
            const events = [];
            for (const suggestion of this.upsellSuggestions) {
                for (const product of suggestion.products) {
                    events.push({
                        upsellRuleId: suggestion.upsellRuleId,
                        eventType: 'Impression',
                        productId: product.productId,
                        displayLocation: 4 // ProductPage
                    });
                }
            }
            if (events.length > 0) {
                MerchelloApi.upsells.recordEvents(events);
            }
        },

        trackProductUpsellClick(upsellRuleId, productId) {
            MerchelloApi.upsells.recordEvents([{
                upsellRuleId,
                eventType: 'Click',
                productId,
                displayLocation: 4 // ProductPage
            }]);
        }
    }));

    /**
     * Basket Page Component
     * Receives initial data from server via config, uses API for updates
     */
    Alpine.data('basketPage', (config) => ({
        // State - initialized from server-provided config
        items: config.items || [],
        subTotal: config.subTotal || 0,
        discount: config.discount || 0,
        tax: config.tax || 0,
        total: config.total || 0,
        formattedSubTotal: config.formattedSubTotal || '',
        formattedDiscount: config.formattedDiscount || '',
        formattedTax: config.formattedTax || '',
        formattedTotal: config.formattedTotal || '',
        formattedDisplaySubTotal: config.formattedDisplaySubTotal || '',
        formattedDisplayDiscount: config.formattedDisplayDiscount || '',
        formattedDisplayTax: config.formattedDisplayTax || '',
        formattedDisplayTotal: config.formattedDisplayTotal || '',
        currencySymbol: config.currencySymbol || '£',
        itemCount: config.itemCount || 0,
        isEmpty: config.isEmpty ?? true,
        updatingItemId: null,
        removingItemId: null,

        // Location-aware availability state (initialized from SSR)
        itemAvailability: config.itemAvailability || {},
        allItemsAvailable: config.allItemsAvailable ?? true,
        regions: [],
        selectedRegion: '',
        isLoadingAvailability: false,

        // Upsell state
        upsellSuggestions: [],
        upsellsLoading: false,

        // Estimated shipping state
        displayTotal: config.displayTotal || 0,
        displayTax: config.displayTax || 0,
        displayEstimatedShipping: 0,
        formattedDisplayEstimatedShipping: '',
        shippingGroupCount: 0,
        isLoadingShipping: false,
        hasShippingEstimate: false,

        // Tax-inclusive display state
        displayPricesIncTax: config.displayPricesIncTax || false,
        taxInclusiveDisplaySubTotal: config.taxInclusiveDisplaySubTotal || 0,
        formattedTaxInclusiveDisplaySubTotal: config.formattedTaxInclusiveDisplaySubTotal || '',
        taxInclusiveDisplayShipping: config.taxInclusiveDisplayShipping || 0,
        formattedTaxInclusiveDisplayShipping: config.formattedTaxInclusiveDisplayShipping || '',
        taxInclusiveDisplayDiscount: config.taxInclusiveDisplayDiscount || 0,
        formattedTaxInclusiveDisplayDiscount: config.formattedTaxInclusiveDisplayDiscount || '',
        taxIncludedMessage: config.taxIncludedMessage || null,

        // Computed
        get productItems() {
            return this.items.filter(item => item.lineItemType === 'Product' || item.lineItemType === 'Custom');
        },

        getAddonsForProduct(productLineItemId, productSku) {
            return this.items.filter(item => {
                if (item.lineItemType !== 'Addon') {
                    return false;
                }

                if (item.parentLineItemId && productLineItemId) {
                    return item.parentLineItemId === productLineItemId;
                }

                return !!productSku && item.dependantLineItemSku === productSku;
            });
        },

        isItemAvailable(lineItemId) {
            const avail = this.itemAvailability[lineItemId];
            return avail ? avail.canShipToCountry && avail.hasStock : true;
        },

        getItemMessage(lineItemId) {
            return this.itemAvailability[lineItemId]?.message || '';
        },

        get estimatedTotal() {
            // Server calculates total (including shipping after fetchEstimatedShipping)
            // Frontend just displays the server-calculated value - single source of truth
            return this.displayTotal;
        },

        get formattedEstimatedTotal() {
            // Use server-formatted total directly
            return this.formattedDisplayTotal;
        },

        // Methods
        init() {
            // Update global basket store with initial data
            Alpine.store('basket').update(this.itemCount, this.total, this.formattedTotal);

            // Refresh basket data when restored from bfcache (browser back/forward)
            window.addEventListener('pageshow', (event) => {
                if (event.persisted) this.refreshBasket();
            });

            // Fetch regions, estimated shipping, and upsells for the user's country
            this.$nextTick(async () => {
                // Wait for country to be fetched (poll until ready or timeout)
                let attempts = 0;
                while (!Alpine.store('country').code && attempts < 20) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                await this.fetchRegions();
                await this.fetchEstimatedShipping();
                await this.loadUpsells();
            });
        },

        async fetchRegions() {
            const countryCode = Alpine.store('country').code;
            if (!countryCode) return;

            // Use centralized MerchelloApi for shipping operations
            const result = await MerchelloApi.shipping.getRegions(countryCode);
            if (result.success) {
                this.regions = result.data;
            }
        },

        async checkBasketAvailability() {
            const countryCode = Alpine.store('country').code;
            if (!countryCode || this.isEmpty) return;

            this.isLoadingAvailability = true;
            try {
                // Use centralized MerchelloApi for basket availability check
                const result = await MerchelloApi.basket.checkAvailability(
                    countryCode,
                    this.selectedRegion
                );

                if (result.success) {
                    this.allItemsAvailable = result.data.allItemsAvailable;
                    this.itemAvailability = {};
                    result.data.items.forEach(item => {
                        this.itemAvailability[item.lineItemId] = item;
                    });
                }
            } catch (error) {
                console.error('Failed to check basket availability:', error);
            } finally {
                this.isLoadingAvailability = false;
            }

            // Also refresh estimated shipping when location changes
            await this.fetchEstimatedShipping();
            // Refresh upsells so region/tax filtered prices stay in sync
            await this.loadUpsells();
        },

        async fetchEstimatedShipping() {
            const countryCode = Alpine.store('country').code;
            if (!countryCode || this.isEmpty) {
                this.hasShippingEstimate = false;
                return;
            }

            this.isLoadingShipping = true;
            try {
                // Use centralized MerchelloApi for estimated shipping
                const result = await MerchelloApi.basket.getEstimatedShipping(
                    countryCode,
                    this.selectedRegion
                );

                if (result.success && result.data.success) {
                    const data = result.data;
                    this.displayEstimatedShipping = data.displayEstimatedShipping || 0;
                    this.formattedDisplayEstimatedShipping = data.formattedDisplayEstimatedShipping || '';
                    this.shippingGroupCount = data.groupCount || 0;
                    this.hasShippingEstimate = true;
                    // Update displayTotal with server-calculated total (includes shipping)
                    // This ensures single source of truth - server calculates, frontend displays
                    if (data.displayTotal) {
                        this.displayTotal = data.displayTotal;
                        this.formattedDisplayTotal = data.formattedDisplayTotal || '';
                    }
                    // Update displayTax with server-calculated tax (includes shipping tax)
                    if (data.displayTax !== undefined) {
                        this.displayTax = data.displayTax;
                        this.formattedDisplayTax = data.formattedDisplayTax || '';
                    }
                    // Update tax-inclusive display values from server
                    if (data.displayPricesIncTax !== undefined) {
                        this.displayPricesIncTax = data.displayPricesIncTax;
                    }
                    if (data.taxInclusiveDisplaySubTotal !== undefined) {
                        this.taxInclusiveDisplaySubTotal = data.taxInclusiveDisplaySubTotal;
                        this.formattedTaxInclusiveDisplaySubTotal = data.formattedTaxInclusiveDisplaySubTotal || '';
                    }
                    if (data.taxInclusiveDisplayShipping !== undefined) {
                        this.taxInclusiveDisplayShipping = data.taxInclusiveDisplayShipping;
                        this.formattedTaxInclusiveDisplayShipping = data.formattedTaxInclusiveDisplayShipping || '';
                    }
                    if (data.taxInclusiveDisplayDiscount !== undefined) {
                        this.taxInclusiveDisplayDiscount = data.taxInclusiveDisplayDiscount;
                        this.formattedTaxInclusiveDisplayDiscount = data.formattedTaxInclusiveDisplayDiscount || '';
                    }
                    if (data.taxIncludedMessage !== undefined) {
                        this.taxIncludedMessage = data.taxIncludedMessage;
                    }
                } else {
                    this.hasShippingEstimate = false;
                }
            } catch (error) {
                console.error('Failed to fetch estimated shipping:', error);
                this.hasShippingEstimate = false;
            } finally {
                this.isLoadingShipping = false;
            }
        },

        async refreshBasket() {
            // Use centralized MerchelloApi for basket operations
            const result = await MerchelloApi.basket.get();
            if (result.success) {
                this.updateFromResponse(result.data);
                // Refresh estimated shipping after basket changes
                await this.fetchEstimatedShipping();
            }
        },

        updateFromResponse(data) {
            this.items = data.items || [];
            this.subTotal = data.subTotal;
            this.discount = data.discount;
            this.tax = data.tax;
            this.total = data.total;
            this.displayTotal = data.displayTotal || 0;
            this.formattedSubTotal = data.formattedSubTotal;
            this.formattedDiscount = data.formattedDiscount;
            this.formattedTax = data.formattedTax;
            this.formattedTotal = data.formattedTotal;
            this.formattedDisplaySubTotal = data.formattedDisplaySubTotal || '';
            this.formattedDisplayDiscount = data.formattedDisplayDiscount || '';
            this.formattedDisplayTax = data.formattedDisplayTax || '';
            this.formattedDisplayTotal = data.formattedDisplayTotal || '';
            this.currencySymbol = data.currencySymbol || this.currencySymbol;
            this.itemCount = data.itemCount;
            this.isEmpty = data.isEmpty;

            // Tax-inclusive display properties
            this.displayPricesIncTax = data.displayPricesIncTax || false;
            this.taxInclusiveDisplaySubTotal = data.taxInclusiveDisplaySubTotal || 0;
            this.formattedTaxInclusiveDisplaySubTotal = data.formattedTaxInclusiveDisplaySubTotal || '';
            this.taxInclusiveDisplayShipping = data.taxInclusiveDisplayShipping || 0;
            this.formattedTaxInclusiveDisplayShipping = data.formattedTaxInclusiveDisplayShipping || '';
            this.taxInclusiveDisplayDiscount = data.taxInclusiveDisplayDiscount || 0;
            this.formattedTaxInclusiveDisplayDiscount = data.formattedTaxInclusiveDisplayDiscount || '';
            this.taxIncludedMessage = data.taxIncludedMessage || null;

            // Update global basket store
            Alpine.store('basket').update(data.itemCount, data.total, data.formattedTotal);
        },

        async updateQuantity(itemId, newQuantity) {
            if (newQuantity < 1) {
                await this.removeItem(itemId);
                return;
            }

            this.updatingItemId = itemId;
            try {
                // Use centralized MerchelloApi for basket operations
                const result = await MerchelloApi.basket.updateQuantity(itemId, newQuantity);

                if (result.success && result.data.success) {
                    await this.refreshBasket();
                    Alpine.store('toast').show('Quantity updated', 'success');
                } else {
                    Alpine.store('toast').show(
                        result.data?.message || result.error || 'Failed to update quantity',
                        'danger'
                    );
                }
            } catch (error) {
                console.error('Update quantity error:', error);
                Alpine.store('toast').show('An error occurred', 'danger');
            } finally {
                this.updatingItemId = null;
            }
        },

        async removeItem(itemId) {
            this.removingItemId = itemId;
            try {
                // Use centralized MerchelloApi for basket operations
                const result = await MerchelloApi.basket.remove(itemId);

                if (result.success && result.data.success) {
                    await this.refreshBasket();
                    Alpine.store('toast').show('Item removed', 'success');
                } else {
                    Alpine.store('toast').show(
                        result.data?.message || result.error || 'Failed to remove item',
                        'danger'
                    );
                }
            } catch (error) {
                console.error('Remove item error:', error);
                Alpine.store('toast').show('An error occurred', 'danger');
            } finally {
                this.removingItemId = null;
            }
        },

        incrementQuantity(item) {
            this.updateQuantity(item.id, item.quantity + 1);
        },

        decrementQuantity(item) {
            this.updateQuantity(item.id, item.quantity - 1);
        },

        async loadUpsells() {
            const countryCode = Alpine.store('country').code;
            if (!countryCode || this.isEmpty) return;
            this.upsellsLoading = true;
            try {
                const result = await MerchelloApi.upsells.getSuggestions('Basket', {
                    countryCode,
                    regionCode: this.selectedRegion || undefined
                });
                if (result.success) {
                    this.upsellSuggestions = result.data || [];
                    this.trackUpsellImpressions();
                }
            } catch (error) {
                console.error('Failed to load upsell suggestions:', error);
            } finally {
                this.upsellsLoading = false;
            }
        },

        trackUpsellImpressions() {
            const events = [];
            for (const suggestion of this.upsellSuggestions) {
                for (const product of suggestion.products) {
                    events.push({
                        upsellRuleId: suggestion.upsellRuleId,
                        eventType: 'Impression',
                        productId: product.productId,
                        displayLocation: 2 // Basket
                    });
                }
            }
            if (events.length > 0) {
                MerchelloApi.upsells.recordEvents(events);
            }
        },

        trackUpsellClick(upsellRuleId, productId) {
            MerchelloApi.upsells.recordEvents([{
                upsellRuleId,
                eventType: 'Click',
                productId,
                displayLocation: 2 // Basket
            }]);
        }
    }));

    // ==========================================================================
    // bfcache Support
    // ==========================================================================

    /**
     * Refresh global basket store when page is restored from bfcache.
     * Fixes stale header badge count on all pages after browser back/forward.
     */
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;
        Alpine.store('basket').fetchCount();
    });

});
