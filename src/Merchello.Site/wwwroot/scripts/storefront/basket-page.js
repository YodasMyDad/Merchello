function getApi() {
    return window.MerchelloApi;
}

export function registerBasketPage(Alpine) {
    Alpine.data("basketPage", (config) => ({
        items: config.items || [],
        subTotal: config.subTotal || 0,
        discount: config.discount || 0,
        tax: config.tax || 0,
        total: config.total || 0,
        formattedSubTotal: config.formattedSubTotal || "",
        formattedDiscount: config.formattedDiscount || "",
        formattedTax: config.formattedTax || "",
        formattedTotal: config.formattedTotal || "",
        formattedDisplaySubTotal: config.formattedDisplaySubTotal || "",
        formattedDisplayDiscount: config.formattedDisplayDiscount || "",
        formattedDisplayTax: config.formattedDisplayTax || "",
        formattedDisplayTotal: config.formattedDisplayTotal || "",
        currencySymbol: config.currencySymbol || "$",
        itemCount: config.itemCount || 0,
        isEmpty: config.isEmpty ?? true,
        updatingItemId: null,
        removingItemId: null,

        itemAvailability: config.itemAvailability || {},
        allItemsAvailable: config.allItemsAvailable ?? true,
        regions: [],
        selectedRegion: "",
        isLoadingAvailability: false,

        upsellSuggestions: [],
        upsellsLoading: false,

        displayTotal: config.displayTotal || 0,
        displayTax: config.displayTax || 0,
        displayEstimatedShipping: 0,
        formattedDisplayEstimatedShipping: "",
        shippingGroupCount: 0,
        isLoadingShipping: false,
        hasShippingEstimate: false,

        displayPricesIncTax: config.displayPricesIncTax || false,
        taxInclusiveDisplaySubTotal: config.taxInclusiveDisplaySubTotal || 0,
        formattedTaxInclusiveDisplaySubTotal: config.formattedTaxInclusiveDisplaySubTotal || "",
        taxInclusiveDisplayShipping: config.taxInclusiveDisplayShipping || 0,
        formattedTaxInclusiveDisplayShipping: config.formattedTaxInclusiveDisplayShipping || "",
        taxInclusiveDisplayDiscount: config.taxInclusiveDisplayDiscount || 0,
        formattedTaxInclusiveDisplayDiscount: config.formattedTaxInclusiveDisplayDiscount || "",
        taxIncludedMessage: config.taxIncludedMessage || null,

        get productItems() {
            return this.items.filter((item) => item.lineItemType === "Product" || item.lineItemType === "Custom");
        },

        getAddonsForProduct(productLineItemId, productSku) {
            return this.items.filter((item) => {
                if (item.lineItemType !== "Addon") return false;

                if (item.parentLineItemId && productLineItemId) {
                    return item.parentLineItemId === productLineItemId;
                }

                return !!productSku && item.dependentLineItemSku === productSku;
            });
        },

        isItemAvailable(lineItemId) {
            const availability = this.itemAvailability[lineItemId];
            return availability ? availability.canShipToLocation && availability.hasStock : true;
        },

        getItemMessage(lineItemId) {
            return this.itemAvailability[lineItemId]?.message || "";
        },

        get estimatedTotal() {
            return this.displayTotal;
        },

        get formattedEstimatedTotal() {
            return this.formattedDisplayTotal;
        },

        init() {
            Alpine.store("basket").update(this.itemCount, this.total, this.formattedTotal);

            window.addEventListener("pageshow", (event) => {
                if (event.persisted) {
                    this.refreshBasket();
                }
            });

            this.$nextTick(async () => {
                let attempts = 0;
                while (!Alpine.store("country").code && attempts < 20) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                    attempts += 1;
                }

                await this.fetchRegions();
                await this.fetchEstimatedShipping();
                await this.loadUpsells();
            });
        },

        async fetchRegions() {
            const api = getApi();
            if (!api) return;

            const countryCode = Alpine.store("country").code;
            if (!countryCode) return;

            const result = await api.shipping.getRegions(countryCode);
            if (result.success) {
                this.regions = result.data;
            }
        },

        async checkBasketAvailability() {
            const api = getApi();
            if (!api) return;

            const countryCode = Alpine.store("country").code;
            if (!countryCode || this.isEmpty) return;

            this.isLoadingAvailability = true;
            try {
                const result = await api.basket.checkAvailability(countryCode, this.selectedRegion);
                if (result.success) {
                    this.allItemsAvailable = result.data.allItemsAvailable;
                    this.itemAvailability = {};
                    result.data.items.forEach((item) => {
                        this.itemAvailability[item.lineItemId] = item;
                    });
                }
            } catch (error) {
                console.error("Failed to check basket availability:", error);
            } finally {
                this.isLoadingAvailability = false;
            }

            await this.fetchEstimatedShipping();
            await this.loadUpsells();
        },

        async fetchEstimatedShipping() {
            const api = getApi();
            if (!api) return;

            const countryCode = Alpine.store("country").code;
            if (!countryCode || this.isEmpty) {
                this.hasShippingEstimate = false;
                return;
            }

            this.isLoadingShipping = true;
            try {
                const result = await api.basket.getEstimatedShipping(countryCode, this.selectedRegion);
                if (result.success && result.data.success) {
                    const data = result.data;
                    this.displayEstimatedShipping = data.displayEstimatedShipping || 0;
                    this.formattedDisplayEstimatedShipping = data.formattedDisplayEstimatedShipping || "";
                    this.shippingGroupCount = data.groupCount || 0;
                    this.hasShippingEstimate = true;

                    if (data.displayTotal) {
                        this.displayTotal = data.displayTotal;
                        this.formattedDisplayTotal = data.formattedDisplayTotal || "";
                    }

                    if (data.displayTax !== undefined) {
                        this.displayTax = data.displayTax;
                        this.formattedDisplayTax = data.formattedDisplayTax || "";
                    }

                    if (data.displayPricesIncTax !== undefined) {
                        this.displayPricesIncTax = data.displayPricesIncTax;
                    }
                    if (data.taxInclusiveDisplaySubTotal !== undefined) {
                        this.taxInclusiveDisplaySubTotal = data.taxInclusiveDisplaySubTotal;
                        this.formattedTaxInclusiveDisplaySubTotal = data.formattedTaxInclusiveDisplaySubTotal || "";
                    }
                    if (data.taxInclusiveDisplayShipping !== undefined) {
                        this.taxInclusiveDisplayShipping = data.taxInclusiveDisplayShipping;
                        this.formattedTaxInclusiveDisplayShipping = data.formattedTaxInclusiveDisplayShipping || "";
                    }
                    if (data.taxInclusiveDisplayDiscount !== undefined) {
                        this.taxInclusiveDisplayDiscount = data.taxInclusiveDisplayDiscount;
                        this.formattedTaxInclusiveDisplayDiscount = data.formattedTaxInclusiveDisplayDiscount || "";
                    }
                    if (data.taxIncludedMessage !== undefined) {
                        this.taxIncludedMessage = data.taxIncludedMessage;
                    }
                } else {
                    this.hasShippingEstimate = false;
                }
            } catch (error) {
                console.error("Failed to fetch estimated shipping:", error);
                this.hasShippingEstimate = false;
            } finally {
                this.isLoadingShipping = false;
            }
        },

        async refreshBasket() {
            const api = getApi();
            if (!api) return;

            const result = await api.basket.get();
            if (result.success) {
                this.updateFromResponse(result.data);
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
            this.formattedDisplaySubTotal = data.formattedDisplaySubTotal || "";
            this.formattedDisplayDiscount = data.formattedDisplayDiscount || "";
            this.formattedDisplayTax = data.formattedDisplayTax || "";
            this.formattedDisplayTotal = data.formattedDisplayTotal || "";
            this.currencySymbol = data.currencySymbol || this.currencySymbol;
            this.itemCount = data.itemCount;
            this.isEmpty = data.isEmpty;

            this.displayPricesIncTax = data.displayPricesIncTax || false;
            this.taxInclusiveDisplaySubTotal = data.taxInclusiveDisplaySubTotal || 0;
            this.formattedTaxInclusiveDisplaySubTotal = data.formattedTaxInclusiveDisplaySubTotal || "";
            this.taxInclusiveDisplayShipping = data.taxInclusiveDisplayShipping || 0;
            this.formattedTaxInclusiveDisplayShipping = data.formattedTaxInclusiveDisplayShipping || "";
            this.taxInclusiveDisplayDiscount = data.taxInclusiveDisplayDiscount || 0;
            this.formattedTaxInclusiveDisplayDiscount = data.formattedTaxInclusiveDisplayDiscount || "";
            this.taxIncludedMessage = data.taxIncludedMessage || null;

            Alpine.store("basket").update(data.itemCount, data.total, data.formattedTotal);
        },

        async updateQuantity(itemId, newQuantity) {
            const api = getApi();
            if (!api) return;

            if (newQuantity < 1) {
                await this.removeItem(itemId);
                return;
            }

            this.updatingItemId = itemId;
            try {
                const result = await api.basket.updateQuantity(itemId, newQuantity);

                if (result.success && result.data.success) {
                    await this.refreshBasket();
                    Alpine.store("toast").show("Quantity updated", "success");
                } else {
                    Alpine.store("toast").show(
                        result.data?.message || result.error || "Failed to update quantity",
                        "danger"
                    );
                }
            } catch (error) {
                console.error("Update quantity error:", error);
                Alpine.store("toast").show("An error occurred", "danger");
            } finally {
                this.updatingItemId = null;
            }
        },

        async removeItem(itemId) {
            const api = getApi();
            if (!api) return;

            this.removingItemId = itemId;
            try {
                const result = await api.basket.remove(itemId);

                if (result.success && result.data.success) {
                    await this.refreshBasket();
                    Alpine.store("toast").show("Item removed", "success");
                } else {
                    Alpine.store("toast").show(
                        result.data?.message || result.error || "Failed to remove item",
                        "danger"
                    );
                }
            } catch (error) {
                console.error("Remove item error:", error);
                Alpine.store("toast").show("An error occurred", "danger");
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
            const api = getApi();
            if (!api) return;

            const countryCode = Alpine.store("country").code;
            if (!countryCode || this.isEmpty) return;

            this.upsellsLoading = true;
            try {
                const result = await api.upsells.getSuggestions("Basket", {
                    countryCode,
                    regionCode: this.selectedRegion || undefined
                });
                if (result.success) {
                    this.upsellSuggestions = result.data || [];
                    this.trackUpsellImpressions();
                }
            } catch (error) {
                console.error("Failed to load upsell suggestions:", error);
            } finally {
                this.upsellsLoading = false;
            }
        },

        trackUpsellImpressions() {
            const api = getApi();
            if (!api) return;

            const events = [];
            for (const suggestion of this.upsellSuggestions) {
                for (const product of suggestion.products) {
                    events.push({
                        upsellRuleId: suggestion.upsellRuleId,
                        eventType: "Impression",
                        productId: product.productId,
                        displayLocation: 2
                    });
                }
            }

            if (events.length > 0) {
                api.upsells.recordEvents(events);
            }
        },

        trackUpsellClick(upsellRuleId, productId) {
            const api = getApi();
            if (!api) return;

            api.upsells.recordEvents([{
                upsellRuleId,
                eventType: "Click",
                productId,
                displayLocation: 2
            }]);
        }
    }));
}
