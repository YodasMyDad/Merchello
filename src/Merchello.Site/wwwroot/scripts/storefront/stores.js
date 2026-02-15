function getApi() {
    return window.MerchelloApi;
}

export function registerStores(Alpine) {
    Alpine.store("basket", {
        count: 0,
        total: 0,
        formattedTotal: "",

        async init() {
            await this.fetchCount();
        },

        async fetchCount() {
            const api = getApi();
            if (!api) return;

            const result = await api.basket.getCount();
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

    Alpine.store("country", {
        code: "",
        name: "",
        countries: [],
        isLoading: false,

        async init() {
            await this.fetch();
        },

        async fetch() {
            const api = getApi();
            if (!api) return;

            const result = await api.shipping.getCountries();
            if (result.success) {
                this.countries = result.data.countries;
                this.code = result.data.current.code;
                this.name = result.data.current.name;
            }
        },

        async setCountry(code) {
            const api = getApi();
            if (!api) return;

            this.isLoading = true;
            const result = await api.shipping.setCountry(code);
            if (result.success) {
                this.code = result.data.countryCode;
                this.name = result.data.countryName;
                window.location.reload();
            }
            this.isLoading = false;
        }
    });

    Alpine.store("toast", {
        show(message, type = "success", duration = 3000) {
            window.dispatchEvent(new CustomEvent("show-toast", {
                detail: { message, type, duration }
            }));
        }
    });

    Alpine.store("currency", {
        code: window.merchelloCurrency?.code || "USD",
        symbol: window.merchelloCurrency?.symbol || "$",
        decimals: window.merchelloCurrency?.decimals ?? 2,
        rate: window.merchelloCurrency?.rate ?? 1.0,
        storeCode: window.merchelloCurrency?.storeCode || "USD",

        init() {
            // Values are seeded from window.merchelloCurrency.
        },

        formatDisplayPrice(displayPrice) {
            return new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: this.code || "USD",
                minimumFractionDigits: this.decimals,
                maximumFractionDigits: this.decimals
            }).format(displayPrice);
        }
    });
}
