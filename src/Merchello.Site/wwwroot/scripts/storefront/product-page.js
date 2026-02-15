function getApi() {
    return window.MerchelloApi;
}

export function registerProductPage(Alpine) {
    Alpine.data("productPage", (config) => ({
        selectedVariantId: config.selectedVariantId,
        selectedOptions: config.selectedOptions || {},
        selectedAddons: [],
        addonValidationErrors: {},
        quantity: 1,
        isLoading: false,
        productId: config.productId || null,
        upsellSuggestions: [],
        upsellsLoading: false,

        mainSwiper: null,
        thumbsSwiper: null,

        variants: config.variants || [],
        variantOptions: config.variantOptions || [],
        addonOptions: config.addonOptions || [],
        productUrl: config.productUrl,
        lowStockThreshold: config.lowStockThreshold || 10,
        includesTax: config.includesTax || false,
        taxRate: config.taxRate || 0,

        get currentVariant() {
            return this.variants.find((variant) => variant.id === this.selectedVariantId) || this.variants[0];
        },

        get price() {
            return this.currentVariant?.price || 0;
        },

        get previousPrice() {
            return this.currentVariant?.previousPrice;
        },

        get displayPrice() {
            return this.currentVariant?.displayPrice || 0;
        },

        get displayPreviousPrice() {
            return this.currentVariant?.displayPreviousPrice;
        },

        get formattedDisplayPrice() {
            return this.currentVariant?.formattedDisplayPrice || "";
        },

        get formattedDisplayPreviousPrice() {
            return this.currentVariant?.formattedDisplayPreviousPrice;
        },

        get onSale() {
            return this.currentVariant?.onSale || false;
        },

        get inStock() {
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
            if (!selectedSwatchImage) return variantImages;

            return [
                selectedSwatchImage,
                ...variantImages.filter((image) => image !== selectedSwatchImage)
            ];
        },

        get sku() {
            return this.currentVariant?.sku || "";
        },

        get totalPrice() {
            const base = this.price;
            const addonsTotal = this.selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
            return base + addonsTotal;
        },

        get displayTotalPrice() {
            const base = this.displayPrice;
            const addonsTotal = this.selectedAddons.reduce((sum, addon) => sum + (addon.displayPrice || 0), 0);
            return base + addonsTotal;
        },

        get formattedDisplayTotalPrice() {
            return Alpine.store("currency").formatDisplayPrice(this.displayTotalPrice);
        },

        get maxQuantity() {
            if (!this.trackStock) return 99;
            return Math.min(this.stockCount, 99);
        },

        init() {
            this.syncSelectedOptionsFromVariant(this.currentVariant);

            this.$nextTick(() => {
                this.initGallerySwipers();
                this.initOptionSwipers();
                this.loadProductUpsells();
            });
        },

        getSelectedOptionValue(optionAlias) {
            const option = this.variantOptions.find((item) => item.alias === optionAlias);
            const selectedValueId = this.selectedOptions[optionAlias];
            return option?.values?.find((value) => value.id === selectedValueId) || null;
        },

        getOptionLabel(optionAlias, optionName) {
            const selectedValue = this.getSelectedOptionValue(optionAlias);
            if (!selectedValue?.name) return optionName;

            return `${optionName}: ${selectedValue.name}`;
        },

        getSelectedSwatchImage() {
            for (const option of this.variantOptions) {
                if (option.uiType !== "image") continue;

                const selectedValueId = this.selectedOptions[option.alias];
                if (!selectedValueId) continue;

                const selectedValue = option.values?.find((value) => value.id === selectedValueId);
                if (selectedValue?.mediaUrl) return selectedValue.mediaUrl;
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
            this.destroyGallerySwipers();

            const thumbsEl = this.$refs.galleryThumbs;
            const mainEl = this.$refs.galleryMain;

            if (mainEl) {
                if (thumbsEl) {
                    this.thumbsSwiper = new Swiper(thumbsEl, {
                        spaceBetween: 10,
                        slidesPerView: 4,
                        freeMode: true,
                        watchSlidesProgress: true
                    });
                }

                this.mainSwiper = new Swiper(mainEl, {
                    spaceBetween: 10,
                    navigation: {
                        nextEl: mainEl.querySelector(".swiper-button-next"),
                        prevEl: mainEl.querySelector(".swiper-button-prev")
                    },
                    thumbs: this.thumbsSwiper ? { swiper: this.thumbsSwiper } : undefined
                });
            }
        },

        initOptionSwipers() {
            this.$el.querySelectorAll(".option-swiper").forEach((element) => {
                if (element.swiper) return;

                new Swiper(element, {
                    slidesPerView: "auto",
                    spaceBetween: 8,
                    freeMode: true,
                    navigation: {
                        nextEl: element.querySelector(".swiper-button-next"),
                        prevEl: element.querySelector(".swiper-button-prev")
                    }
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
                    this.selectedAddons = [
                        ...this.selectedAddons.filter((addon) => addon.optionId !== optionId),
                        nextAddon
                    ];
                } else {
                    this.selectedAddons = this.selectedAddons.filter(
                        (addon) => !(addon.optionId === optionId && addon.valueId === valueId)
                    );
                }

                if (this.getSelectedAddonsForOption(optionId).length > 0) {
                    this.clearAddonValidationError(optionId);
                }
                return;
            }

            if (isChecked) {
                if (!this.selectedAddons.find((addon) => addon.optionId === optionId && addon.valueId === valueId)) {
                    this.selectedAddons = [...this.selectedAddons, nextAddon];
                }
            } else {
                this.selectedAddons = this.selectedAddons.filter(
                    (addon) => !(addon.optionId === optionId && addon.valueId === valueId)
                );
            }

            if (this.getSelectedAddonsForOption(optionId).length > 0) {
                this.clearAddonValidationError(optionId);
            }
        },

        selectAddonRadio(optionId, valueId, price, displayPrice) {
            const remainingSelections = this.selectedAddons.filter((addon) => addon.optionId !== optionId);
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
            return this.selectedAddons.some((addon) => addon.optionId === optionId && addon.valueId === valueId);
        },

        getSelectedAddonsForOption(optionId) {
            return this.selectedAddons.filter((addon) => addon.optionId === optionId);
        },

        validateRequiredAddons() {
            const validationErrors = {};
            const requiredOptions = this.addonOptions.filter((option) => option.isRequired === true);

            for (const option of requiredOptions) {
                const hasSelection = this.getSelectedAddonsForOption(option.id).length > 0;
                if (!hasSelection) {
                    const optionName = option.name || "required add-on";
                    validationErrors[option.id] = `Please select at least one value for ${optionName}.`;
                }
            }

            this.addonValidationErrors = validationErrors;
            return Object.keys(validationErrors).length === 0;
        },

        getAddonValidationError(optionId) {
            return this.addonValidationErrors[optionId] || "";
        },

        clearAddonValidationError(optionId) {
            if (!this.addonValidationErrors[optionId]) return;

            const nextErrors = { ...this.addonValidationErrors };
            delete nextErrors[optionId];
            this.addonValidationErrors = nextErrors;
        },

        updateVariant() {
            const selectedValueIds = this.variantOptions
                .map((option) => this.selectedOptions[option.alias])
                .filter((id) => id);

            if (selectedValueIds.length !== this.variantOptions.length) return;

            const variantKey = selectedValueIds.map((id) => id.toLowerCase()).join(",");
            const variant = this.variants.find((item) => item.variantOptionsKey === variantKey);

            if (variant) {
                this.selectedVariantId = variant.id;
                this.syncSelectedOptionsFromVariant(variant);

                const newUrl = variant.url || this.productUrl;
                if (window.location.pathname !== newUrl) {
                    window.history.pushState({}, "", newUrl);
                }

                this.$nextTick(() => {
                    setTimeout(() => this.initGallerySwipers(), 50);
                });
            }
        },

        syncSelectedOptionsFromVariant(variant) {
            if (!variant?.variantOptionsKey) return;

            const variantValueIds = new Set(
                variant.variantOptionsKey
                    .split(",")
                    .map((id) => id.trim().toLowerCase())
                    .filter((id) => id.length > 0)
            );

            const nextSelectedOptions = { ...this.selectedOptions };
            this.variantOptions.forEach((option) => {
                const matchingValue = option.values?.find((value) => variantValueIds.has(value.id.toLowerCase()));
                if (matchingValue) {
                    nextSelectedOptions[option.alias] = matchingValue.id;
                }
            });

            this.selectedOptions = nextSelectedOptions;
        },

        async addToCart() {
            if (!this.inStock || this.isLoading) return;

            if (!this.validateRequiredAddons()) {
                Alpine.store("toast").show("Please select all required add-ons before adding to basket.", "danger");
                return;
            }

            const api = getApi();
            if (!api) return;

            this.isLoading = true;

            try {
                const result = await api.basket.add({
                    productId: this.selectedVariantId,
                    quantity: this.quantity,
                    addons: this.selectedAddons.map((addon) => ({
                        optionId: addon.optionId,
                        valueId: addon.valueId
                    }))
                });

                if (result.success && result.data.success) {
                    Alpine.store("basket").update(
                        result.data.itemCount,
                        result.data.total,
                        result.data.formattedTotal
                    );
                    Alpine.store("toast").show("Added to basket!", "success");
                } else {
                    Alpine.store("toast").show(
                        result.data?.message || result.error || "Failed to add to basket",
                        "danger"
                    );
                }
            } catch (error) {
                console.error("Add to cart error:", error);
                Alpine.store("toast").show("An error occurred. Please try again.", "danger");
            } finally {
                this.isLoading = false;
            }
        },

        incrementQuantity() {
            if (this.quantity < this.maxQuantity) {
                this.quantity += 1;
            }
        },

        decrementQuantity() {
            if (this.quantity > 1) {
                this.quantity -= 1;
            }
        },

        async loadProductUpsells() {
            if (!this.productId) return;

            const api = getApi();
            if (!api) return;

            this.upsellsLoading = true;
            try {
                const result = await api.upsells.getProductSuggestions(this.productId);
                if (result.success) {
                    this.upsellSuggestions = result.data || [];
                    this.trackProductUpsellImpressions();
                }
            } catch (error) {
                console.error("Failed to load product upsells:", error);
            } finally {
                this.upsellsLoading = false;
            }
        },

        trackProductUpsellImpressions() {
            const api = getApi();
            if (!api) return;

            const events = [];
            for (const suggestion of this.upsellSuggestions) {
                for (const product of suggestion.products) {
                    events.push({
                        upsellRuleId: suggestion.upsellRuleId,
                        eventType: "Impression",
                        productId: product.productId,
                        displayLocation: 4
                    });
                }
            }

            if (events.length > 0) {
                api.upsells.recordEvents(events);
            }
        },

        trackProductUpsellClick(upsellRuleId, productId) {
            const api = getApi();
            if (!api) return;

            api.upsells.recordEvents([{
                upsellRuleId,
                eventType: "Click",
                productId,
                displayLocation: 4
            }]);
        }
    }));
}
