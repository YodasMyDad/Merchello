import { registerStores } from "./stores.js";
import { registerToastContainer } from "./toast-container.js";
import { registerProductPage } from "./product-page.js";
import { registerBasketPage } from "./basket-page.js";
import { registerCategoryPage } from "./category-page.js";

function registerStorefrontComponents() {
    if (window.__merchelloStorefrontRegistered) {
        return;
    }

    if (!window.Alpine) {
        return;
    }

    window.__merchelloStorefrontRegistered = true;

    const { Alpine } = window;
    registerStores(Alpine);
    registerToastContainer(Alpine);
    registerProductPage(Alpine);
    registerBasketPage(Alpine);
    registerCategoryPage(Alpine);
}

document.addEventListener("alpine:init", registerStorefrontComponents);

if (window.Alpine) {
    registerStorefrontComponents();
}

window.addEventListener("pageshow", (event) => {
    if (!event.persisted) {
        return;
    }

    if (window.Alpine?.store && window.Alpine.store("basket")) {
        window.Alpine.store("basket").fetchCount();
    }
});
