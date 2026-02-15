// Post-purchase upsell flow for integrated checkout
(() => {
    const root = document.querySelector('[data-post-purchase]');
    if (!root) return;

    const invoiceId = root.dataset.invoiceId;
    const confirmationUrl = root.dataset.confirmationUrl || `/checkout/confirmation/${invoiceId}`;

    const contentEl = root.querySelector('[data-post-purchase-content]');
    const cardEl = root.querySelector('[data-post-purchase-card]');
    const timerEl = root.querySelector('[data-post-purchase-timer]');
    const skipButton = root.querySelector('[data-post-purchase-skip]');

    if (!invoiceId || !contentEl || !skipButton) return;

    const analytics = window.MerchelloCheckout;
    let savedMethod = null;
    let timeRemainingSeconds = 0;
    let timerId = null;
    let isSkipping = false;

    skipButton.addEventListener('click', () => skipAndRedirect('skip'));

    void loadUpsells();

    function getSuggestionSurfaceStyle(suggestion) {
        const styles = suggestion?.displayStyles;
        if (!styles || typeof styles !== 'object') {
            return null;
        }

        return styles.postPurchase || styles.confirmation || null;
    }

    function getElementStyle(surfaceStyle, elementKey) {
        if (!surfaceStyle || typeof surfaceStyle !== 'object' || !elementKey) {
            return null;
        }

        const elementStyle = surfaceStyle[elementKey];
        return elementStyle && typeof elementStyle === 'object' ? elementStyle : null;
    }

    function applyElementStyle(element, elementStyle) {
        if (!element || !elementStyle || typeof elementStyle !== 'object') {
            return;
        }

        const hasTextColor = typeof elementStyle.textColor === 'string' && elementStyle.textColor.length > 0;
        const hasBackgroundColor = typeof elementStyle.backgroundColor === 'string' && elementStyle.backgroundColor.length > 0;
        const hasBorderColor = typeof elementStyle.borderColor === 'string' && elementStyle.borderColor.length > 0;
        const hasBorderStyle = typeof elementStyle.borderStyle === 'string' && elementStyle.borderStyle.length > 0;
        const hasBorderWidth = Number.isFinite(elementStyle.borderWidth);
        const hasBorderRadius = Number.isFinite(elementStyle.borderRadius);

        if (hasTextColor) {
            element.style.color = elementStyle.textColor;
        }

        if (hasBackgroundColor) {
            element.style.backgroundColor = elementStyle.backgroundColor;
        }

        if (hasBorderColor) {
            element.style.borderColor = elementStyle.borderColor;
        }

        if (hasBorderStyle) {
            element.style.borderStyle = elementStyle.borderStyle;
        } else if (hasBorderColor || hasBorderWidth) {
            element.style.borderStyle = 'solid';
        }

        if (hasBorderWidth) {
            element.style.borderWidth = `${Math.max(0, Number(elementStyle.borderWidth))}px`;
        }

        if (hasBorderRadius) {
            element.style.borderRadius = `${Math.max(0, Number(elementStyle.borderRadius))}px`;
        }
    }

    async function loadUpsells() {
        const response = await fetch(`/api/merchello/checkout/post-purchase/${invoiceId}`);

        if (!response.ok) {
            showMessageOnly(
                'No post-purchase offers available.',
                'We will take you to your order confirmation.');
            emitEvent('checkout:post_purchase_error', {
                invoice_id: invoiceId,
                error_type: 'not_found'
            });
            await skipAndRedirect('not-found');
            return;
        }

        const data = await safeReadJson(response);
        if (!data) {
            showMessageOnly(
                'Unable to load offers.',
                'We will take you to your order confirmation.');
            emitEvent('checkout:post_purchase_error', {
                invoice_id: invoiceId,
                error_type: 'invalid_response'
            });
            await skipAndRedirect('invalid-response');
            return;
        }

        if (data.windowExpired) {
            showMessageOnly(
                'Your post-purchase window has expired.',
                'We will take you to your order confirmation.');
            await skipAndRedirect('expired');
            return;
        }

        savedMethod = data.savedPaymentMethod || null;
        timeRemainingSeconds = Math.max(0, data.timeRemainingSeconds || 0);

        updateSavedMethodText();
        startTimer(timeRemainingSeconds);
        const suggestions = data.suggestions || [];
        if (suggestions.length > 0) {
            const firstSurfaceStyle = getSuggestionSurfaceStyle(suggestions[0]);
            applyElementStyle(skipButton, getElementStyle(firstSurfaceStyle, 'secondaryButton'));
        }
        renderSuggestions(suggestions);

        emitEvent('checkout:post_purchase_view', {
            invoice_id: invoiceId,
            suggestion_count: suggestions.length,
            product_count: suggestions.reduce((sum, s) => sum + ((s.products || []).length), 0),
            time_remaining_seconds: timeRemainingSeconds
        });
    }

    function updateSavedMethodText() {
        if (!cardEl) return;

        if (!savedMethod) {
            cardEl.textContent = 'Saved payment method not available.';
            return;
        }

        const brand = savedMethod.cardBrand || 'Card';
        const last4 = savedMethod.last4 ? `ending ${savedMethod.last4}` : '';
        const expiry = savedMethod.expiryFormatted ? `exp ${savedMethod.expiryFormatted}` : '';
        const label = savedMethod.displayLabel || [brand, last4].filter(Boolean).join(' ');
        const details = [label, expiry].filter(Boolean).join(' ');

        if (savedMethod.isExpired) {
            cardEl.textContent = `Saved payment method ${details} is expired.`;
        } else {
            cardEl.textContent = `We will charge ${details}.`;
        }
    }

    function startTimer(seconds) {
        if (!timerEl) return;

        if (timerId) {
            clearInterval(timerId);
        }

        let remaining = seconds;
        updateTimerText(remaining);

        if (remaining <= 0) return;

        timerId = setInterval(() => {
            remaining -= 1;
            updateTimerText(remaining);

            if (remaining <= 0) {
                clearInterval(timerId);
                void skipAndRedirect('timer');
            }
        }, 1000);
    }

    function updateTimerText(seconds) {
        if (!timerEl) return;

        if (seconds <= 0) {
            timerEl.textContent = 'Redirecting to confirmation...';
            return;
        }

        const minutes = Math.floor(seconds / 60);
        const remainder = seconds % 60;
        const formatted = `${minutes}:${remainder.toString().padStart(2, '0')}`;
        timerEl.textContent = `Auto-redirects in ${formatted}`;
    }

    function renderSuggestions(suggestions) {
        if (!contentEl) return;

        contentEl.innerHTML = '';

        if (suggestions.length === 0) {
            showMessageOnly(
                'No post-purchase offers available.',
                'We will take you to your order confirmation.');
            void skipAndRedirect('empty');
            return;
        }

        suggestions.forEach((suggestion) => {
            const surfaceStyle = getSuggestionSurfaceStyle(suggestion);
            const groupEl = document.createElement('section');
            groupEl.className = 'space-y-3';
            applyElementStyle(groupEl, getElementStyle(surfaceStyle, 'container'));

            const heading = document.createElement('h2');
            heading.className = 'font-heading text-xl font-semibold text-gray-900';
            heading.textContent = suggestion.heading || 'Recommended';
            applyElementStyle(heading, getElementStyle(surfaceStyle, 'heading'));
            groupEl.appendChild(heading);

            if (suggestion.message) {
                const message = document.createElement('p');
                message.className = 'text-gray-600';
                message.textContent = suggestion.message;
                applyElementStyle(message, getElementStyle(surfaceStyle, 'message'));
                groupEl.appendChild(message);
            }

            if (!suggestion.products || suggestion.products.length === 0) {
                const info = document.createElement('div');
                info.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800';
                info.textContent = 'This offer does not include specific products.';
                applyElementStyle(info, getElementStyle(surfaceStyle, 'productCard'));
                groupEl.appendChild(info);
                contentEl.appendChild(groupEl);
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4';

            suggestion.products.forEach((product) => {
                const card = createProductCard(product, suggestion.upsellRuleId, surfaceStyle);
                grid.appendChild(card);
            });

            groupEl.appendChild(grid);
            contentEl.appendChild(groupEl);
        });
    }

    function createProductCard(product, upsellRuleId, surfaceStyle) {
        const card = document.createElement('div');
        card.className = 'border border-gray-200 rounded-lg p-4 bg-white flex flex-col gap-3 transition-all hover:bg-gray-50';
        applyElementStyle(card, getElementStyle(surfaceStyle, 'productCard'));

        const image = document.createElement('div');
        image.className = 'w-full h-32 bg-gray-100 rounded-md overflow-hidden';
        if (product.imageUrl) {
            const img = document.createElement('img');
            img.src = product.imageUrl;
            img.alt = product.name || 'Product';
            img.className = 'w-full h-full object-cover';
            image.appendChild(img);
        }
        card.appendChild(image);

        const title = document.createElement('h3');
        title.className = 'font-medium text-gray-900';
        title.textContent = product.name || 'Product';
        applyElementStyle(title, getElementStyle(surfaceStyle, 'productName'));
        card.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'flex flex-wrap gap-2 text-xs';

        if (product.productTypeName) {
            meta.appendChild(createPill(product.productTypeName, 'bg-gray-100 text-gray-700', surfaceStyle));
        }

        if (product.onSale) {
            meta.appendChild(createPill('On sale', 'bg-amber-100 text-amber-700', surfaceStyle));
        }

        if (product.priceIncludesTax) {
            meta.appendChild(createPill('Tax included', 'bg-green-100 text-green-700', surfaceStyle));
        }

        if (meta.children.length > 0) {
            card.appendChild(meta);
        }

        if (product.description) {
            const desc = document.createElement('p');
            desc.className = 'text-sm text-gray-600 leading-relaxed';
            desc.textContent = product.description;
            applyElementStyle(desc, getElementStyle(surfaceStyle, 'productDescription'));
            card.appendChild(desc);
        }

        const price = document.createElement('div');
        price.className = 'flex items-baseline gap-2';
        const priceText = document.createElement('span');
        priceText.className = 'text-lg font-semibold text-gray-900';
        priceText.textContent = product.formattedPrice || '';
        applyElementStyle(priceText, getElementStyle(surfaceStyle, 'productPrice'));
        price.appendChild(priceText);

        if (product.formattedPreviousPrice) {
            const previous = document.createElement('span');
            previous.className = 'text-sm text-gray-500 line-through';
            previous.textContent = product.formattedPreviousPrice;
            price.appendChild(previous);
        }

        card.appendChild(price);

        const taxNote = document.createElement('p');
        taxNote.className = 'text-xs text-gray-500';
        if (product.priceIncludesTax && product.formattedTaxAmount) {
            taxNote.textContent = `Includes ${product.formattedTaxAmount} tax`;
        } else if (!product.priceIncludesTax && product.formattedTaxAmount) {
            taxNote.textContent = `Plus ${product.formattedTaxAmount} tax`;
        }
        if (taxNote.textContent) {
            card.appendChild(taxNote);
        }

        let selectedVariantId = null;
        if (product.hasVariants && Array.isArray(product.variants) && product.variants.length > 0) {
            const select = document.createElement('select');
            select.className = 'checkout-input-compact';
            applyElementStyle(select, getElementStyle(surfaceStyle, 'variantSelector'));
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select option';
            select.appendChild(placeholder);

            product.variants.forEach((variant) => {
                const option = document.createElement('option');
                option.value = variant.productId;
                option.textContent = variant.formattedPrice
                    ? `${variant.name} - ${variant.formattedPrice}`
                    : variant.name;
                select.appendChild(option);
            });

            select.addEventListener('change', () => {
                selectedVariantId = select.value || null;
                toggleButtonState(button, product, selectedVariantId);
            });

            card.appendChild(select);
        }

        const status = document.createElement('div');
        status.className = 'text-sm text-gray-600';
        const statusStyle = getElementStyle(surfaceStyle, 'statusText');
        applyElementStyle(status, statusStyle);
        card.appendChild(status);

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'checkout-button-primary w-full';
        button.textContent = product.availableForPurchase ? 'Add to order' : 'Unavailable';
        button.disabled = !product.availableForPurchase;
        applyElementStyle(button, getElementStyle(surfaceStyle, 'button'));
        button.addEventListener('click', () => {
            void handleAdd(product, upsellRuleId, selectedVariantId, button, status, statusStyle);
        });
        card.appendChild(button);

        toggleButtonState(button, product, selectedVariantId);

        return card;
    }

    function toggleButtonState(button, product, selectedVariantId) {
        if (!button) return;

        if (!product.availableForPurchase) {
            button.disabled = true;
            button.textContent = 'Unavailable';
            return;
        }

        if (product.hasVariants && !selectedVariantId) {
            button.disabled = true;
            button.textContent = 'Select option';
            return;
        }

        button.disabled = false;
        button.textContent = 'Add to order';
    }

    async function handleAdd(product, upsellRuleId, selectedVariantId, button, statusEl, statusStyle) {
        if (!savedMethod || savedMethod.isExpired) {
            setStatus(statusEl, 'Saved payment method unavailable.', 'error', statusStyle);
            emitEvent('checkout:post_purchase_error', {
                invoice_id: invoiceId,
                error_type: 'saved_method_unavailable'
            });
            return;
        }

        const productId = selectedVariantId || product.productId;
        if (!productId) {
            setStatus(statusEl, 'Select an option to continue.', 'error', statusStyle);
            emitEvent('checkout:post_purchase_error', {
                invoice_id: invoiceId,
                error_type: 'variant_required',
                product_id: product.productId
            });
            return;
        }

        button.disabled = true;
        button.textContent = 'Adding...';
        setStatus(statusEl, 'Calculating total...', 'info', statusStyle);

        const preview = await postJson(
            `/api/merchello/checkout/post-purchase/${invoiceId}/preview`,
            { productId, quantity: 1 });

        if (!preview.ok || !preview.data || !preview.data.isAvailable) {
            const reason = preview.data?.unavailableReason || preview.error || 'Unable to add item.';
            setStatus(statusEl, reason, 'error', statusStyle);
            emitEvent('checkout:post_purchase_error', {
                invoice_id: invoiceId,
                error_type: 'preview_failed',
                product_id: productId,
                message: reason
            });
            toggleButtonState(button, product, selectedVariantId);
            return;
        }

        const previewData = preview.data;
        const amountLabel = previewData.formattedTotal || previewData.formattedSubTotal || '';
        setStatus(statusEl, amountLabel ? `Charging ${amountLabel}...` : 'Charging...', 'info', statusStyle);

        const idempotencyKey = createIdempotencyKey();
        const addResult = await postJson(
            `/api/merchello/checkout/post-purchase/${invoiceId}/add`,
            {
                productId,
                quantity: 1,
                upsellRuleId,
                savedPaymentMethodId: savedMethod.id,
                idempotencyKey
            });

        if (!addResult.ok || !addResult.data) {
            const message = addResult.error || 'Payment failed.';
            setStatus(statusEl, message, 'error', statusStyle);
            emitEvent('checkout:post_purchase_error', {
                invoice_id: invoiceId,
                error_type: 'payment_failed',
                product_id: productId,
                message
            });
            toggleButtonState(button, product, selectedVariantId);
            return;
        }

        const charged = addResult.data.formattedAmountCharged || amountLabel || 'added';
        setStatus(statusEl, `Added. Charged ${charged}.`, 'success', statusStyle);
        button.textContent = 'Added';
        button.disabled = true;

        emitEvent('checkout:post_purchase_add', {
            invoice_id: invoiceId,
            upsell_rule_id: upsellRuleId,
            product_id: productId,
            transaction_id: addResult.data.paymentTransactionId,
            currency: previewData.currencyCode,
            value: addResult.data.amountCharged ?? previewData.total,
            tax: previewData.taxAmount,
            shipping: previewData.shippingDelta,
            items: [
                {
                    item_id: product.sku || productId,
                    item_name: product.name,
                    item_variant: selectedVariantId ? resolveVariantName(product, selectedVariantId) : null,
                    price: previewData.unitPrice,
                    quantity: 1
                }
            ]
        });
    }

    async function skipAndRedirect(reason) {
        if (isSkipping) return;
        isSkipping = true;
        skipButton.disabled = true;

        emitEvent('checkout:post_purchase_skip', {
            invoice_id: invoiceId,
            reason,
            time_remaining_seconds: timeRemainingSeconds
        });

        try {
            await fetch(`/api/merchello/checkout/post-purchase/${invoiceId}/skip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (error) {
            console.warn('Skip request failed:', error);
        } finally {
            window.location.href = confirmationUrl;
        }
    }

    function showMessageOnly(title, message) {
        if (!contentEl) return;
        contentEl.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'bg-blue-50 border border-blue-200 rounded-lg p-4';

        const heading = document.createElement('h2');
        heading.className = 'font-medium text-blue-800';
        heading.textContent = title;

        const body = document.createElement('p');
        body.className = 'text-sm text-blue-700 mt-1';
        body.textContent = message;

        wrapper.appendChild(heading);
        wrapper.appendChild(body);
        contentEl.appendChild(wrapper);
    }

    function setStatus(el, message, type, elementStyle) {
        if (!el) return;
        el.textContent = message || '';
        el.className = 'text-sm';

        switch (type) {
            case 'error':
                el.className += ' text-red-600';
                break;
            case 'success':
                el.className += ' text-green-600';
                break;
            default:
                el.className += ' text-gray-600';
                break;
        }

        applyElementStyle(el, elementStyle);
    }

    function createPill(text, classes, surfaceStyle) {
        const pill = document.createElement('span');
        pill.className = `inline-flex items-center rounded-full px-2 py-0.5 ${classes}`;
        pill.textContent = text;
        applyElementStyle(pill, getElementStyle(surfaceStyle, 'badge'));
        return pill;
    }

    function resolveVariantName(product, variantId) {
        if (!product || !Array.isArray(product.variants)) return null;
        const targetId = String(variantId);
        const variant = product.variants.find(v => String(v.productId) === targetId);
        return variant ? variant.name : null;
    }

    function emitEvent(eventName, payload) {
        if (!analytics || typeof analytics.emit !== 'function') return;
        analytics.emit(eventName, payload);
    }

    function createIdempotencyKey() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return `pp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    async function postJson(url, body) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.status === 204) {
                return { ok: true, data: null };
            }

            const data = await safeReadJson(response);
            if (!response.ok) {
                const errorMessage = typeof data === 'string'
                    ? data
                    : data?.message || data?.error || 'Request failed.';
                return { ok: false, error: errorMessage, data };
            }

            return { ok: true, data };
        } catch (error) {
            return { ok: false, error: error?.message || 'Request failed.' };
        }
    }

    async function safeReadJson(response) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const text = await response.text();
            return text || null;
        }

        try {
            return await response.json();
        } catch {
            return null;
        }
    }
})();
