# Checkout Manual Testing Guide

This document provides comprehensive test cases for the Merchello checkout flow. All tests should be performed manually across the supported browser/device matrix.

---

## Browser & Device Matrix

### Desktop Browsers
| Browser | Minimum Version | Priority |
|---------|-----------------|----------|
| Chrome | 90+ | High |
| Firefox | 90+ | High |
| Safari | 14+ | High |
| Edge | 90+ | Medium |

### Mobile Browsers
| Browser | Platform | Minimum Version | Priority |
|---------|----------|-----------------|----------|
| Safari | iOS | 14+ | High |
| Chrome | Android | 90+ | High |
| Samsung Internet | Android | 14+ | Medium |

### Device Types
- Desktop (1920x1080, 1440x900)
- Tablet (iPad portrait/landscape)
- Mobile (iPhone SE, iPhone 14, Pixel 6)

---

## Test Case Categories

### 1. Checkout Flow - Happy Path

#### TC-1.1: Complete checkout with card payment
**Preconditions:** Cart has items, user is not logged in
**Steps:**
1. Navigate to /checkout/information
2. Fill in email address
3. Fill in billing address (all required fields)
4. Check "Same as billing address" for shipping
5. Click "Continue to Shipping"
6. Verify redirect to /checkout/shipping
7. Select a shipping method for each shipping group
8. Click "Continue to Payment"
9. Verify redirect to /checkout/payment
10. Select card payment method
11. Enter valid test card details
12. Click "Pay Now"
13. Verify redirect to /checkout/confirmation

**Expected:** Order confirmation page displays with order number

#### TC-1.2: Complete checkout with separate shipping address
**Preconditions:** Cart has items
**Steps:**
1. Navigate to /checkout/information
2. Fill in billing address
3. Uncheck "Same as billing address"
4. Fill in different shipping address
5. Complete checkout flow

**Expected:** Order uses different shipping address

#### TC-1.3: Complete checkout with discount code
**Preconditions:** Valid discount code exists
**Steps:**
1. Start checkout process
2. Enter discount code in Order Summary
3. Click "Apply"
4. Verify discount appears in totals
5. Complete checkout

**Expected:** Discount applied to final order

---

### 2. Form Validation

#### TC-2.1: Email validation
**Steps:**
1. Leave email empty, try to continue
2. Enter invalid email format (e.g., "notanemail")
3. Enter valid email

**Expected:**
- Empty: "Email is required" error
- Invalid: "Please enter a valid email address" error
- Valid: No error, can proceed

#### TC-2.2: Required field validation
**Steps:**
1. Leave each required field empty and try to continue:
   - Name
   - Address
   - City
   - Country
   - Postal code

**Expected:** Each shows appropriate "X is required" error

#### TC-2.3: Screen reader announcements
**Preconditions:** Screen reader enabled
**Steps:**
1. Submit form with errors
2. Listen for announcement

**Expected:** Screen reader announces "Form has X errors. Please correct and try again."

---

### 3. Mobile UX

#### TC-3.1: Sticky action bar
**Device:** Mobile
**Steps:**
1. Navigate to each checkout step
2. Scroll down the page
3. Verify action button remains visible at bottom

**Expected:** Primary action button stays fixed at bottom with safe-area padding

#### TC-3.2: Order summary collapse
**Device:** Mobile
**Steps:**
1. On any checkout step, tap Order Summary header
2. Verify summary expands
3. Tap again to collapse

**Expected:** Order summary toggles between collapsed (shows total only) and expanded views

#### TC-3.3: Touch targets
**Device:** Mobile
**Steps:**
1. Attempt to tap all interactive elements:
   - Checkboxes
   - Radio buttons
   - Buttons
   - Links

**Expected:** All touch targets are at least 44x44px and easy to tap

#### TC-3.4: iOS safe area
**Device:** iPhone with notch/Dynamic Island
**Steps:**
1. Navigate through checkout
2. Verify bottom sticky bar doesn't overlap home indicator

**Expected:** Content respects safe-area-inset-bottom

---

### 4. Accessibility (WCAG 2.1 AA)

#### TC-4.1: Keyboard navigation
**Steps:**
1. Navigate entire checkout using only Tab, Shift+Tab, Enter, Space
2. Verify focus order is logical
3. Verify all interactive elements are focusable

**Expected:** Complete checkout possible without mouse

#### TC-4.2: Focus indicators
**Steps:**
1. Tab through form fields and buttons
2. Verify visible focus ring on each element

**Expected:** Clear visible focus indicator (ring) on all focusable elements

#### TC-4.3: Form field error association
**Steps:**
1. Trigger form validation error
2. Inspect error field with browser DevTools

**Expected:**
- Field has `aria-invalid="true"`
- Field has `aria-describedby` pointing to error message
- Error message has matching `id`

#### TC-4.4: Loading state announcements
**Steps:**
1. Enable screen reader
2. Click submit button on any step
3. Listen for loading announcement

**Expected:** Screen reader announces "Saving..." or "Processing..." during loading

---

### 5. Payment Methods

#### TC-5.1: Stripe card payment
**Test cards:**
- Success: 4242424242424242
- Decline: 4000000000000002
- 3DS Required: 4000000000003220

**Steps:**
1. Select Stripe card payment
2. Verify Payment Element renders
3. Enter test card number
4. Complete payment

**Expected:**
- Success card: Payment completes, redirect to confirmation
- Decline card: Error message displayed
- 3DS card: 3D Secure modal appears

#### TC-5.2: Braintree Drop-in
**Steps:**
1. Select Braintree payment (if configured)
2. Verify Drop-in UI renders
3. Enter card details
4. Complete payment

**Expected:** Payment completes successfully

#### TC-5.3: PayPal button
**Steps:**
1. Select PayPal payment (if configured)
2. Verify PayPal button renders
3. Click PayPal button
4. Complete PayPal popup flow

**Expected:** Redirect to confirmation after PayPal approval

#### TC-5.4: Payment method loading skeleton
**Steps:**
1. Navigate to /checkout/payment
2. Observe loading state before methods appear

**Expected:** Skeleton placeholders shown while loading

---

### 6. Express Checkout

#### TC-6.1: Apple Pay availability
**Device:** Safari on iOS/macOS with Apple Pay configured
**Steps:**
1. Navigate to /checkout/information
2. Verify Apple Pay button appears in express checkout section

**Expected:** Apple Pay button visible and functional

#### TC-6.2: Google Pay availability
**Device:** Chrome on Android/Desktop with Google Pay configured
**Steps:**
1. Navigate to /checkout/information
2. Verify Google Pay button appears

**Expected:** Google Pay button visible when available

#### TC-6.3: Express checkout flow
**Steps:**
1. Click express checkout button (Apple/Google Pay)
2. Complete wallet payment
3. Verify address/email populated from wallet

**Expected:** Order created with wallet-provided details

---

### 7. Shipping

#### TC-7.1: Shipping group display
**Preconditions:** Cart has items from multiple shipping groups
**Steps:**
1. Navigate to /checkout/shipping
2. Verify each group displays separately
3. Expand/collapse group items

**Expected:** Groups show items and shipping options independently

#### TC-7.2: Shipping option selection
**Steps:**
1. Select different shipping option for a group
2. Verify order summary updates with new shipping cost

**Expected:** Total reflects selected shipping costs

#### TC-7.3: No shipping options
**Preconditions:** Address where no shipping is available
**Steps:**
1. Enter address with no shipping coverage

**Expected:** Message "No shipping options available for these items to your address"

---

### 8. Discount Codes

#### TC-8.1: Apply valid discount
**Steps:**
1. Enter valid discount code
2. Click Apply
3. Verify discount appears in Order Summary

**Expected:** Discount amount shown, totals updated

#### TC-8.2: Apply invalid discount
**Steps:**
1. Enter invalid/expired discount code
2. Click Apply

**Expected:** Error message displayed: "Invalid discount code"

#### TC-8.3: Remove discount
**Steps:**
1. Apply a valid discount
2. Click X button next to discount

**Expected:** Discount removed, totals updated

---

### 9. Error Handling

#### TC-9.1: Network timeout
**Steps:**
1. Open DevTools Network tab
2. Set network to Slow 3G or offline
3. Try to submit a form

**Expected:** User-friendly error message: "Request timed out. Please check your connection and try again."

#### TC-9.2: Server error
**Steps:**
1. Simulate 500 error from API

**Expected:** Generic error message displayed, no technical details exposed

#### TC-9.3: Session expiry
**Steps:**
1. Start checkout
2. Wait for session to expire (or clear cookies)
3. Try to continue

**Expected:** Redirect to cart or friendly error message

---

### 10. Cross-Browser Compatibility

#### TC-10.1: Alpine.js Collapse
**Browsers:** All supported
**Steps:**
1. On Shipping page, click group header to collapse
2. Verify smooth animation

**Expected:** x-collapse works without JavaScript errors

#### TC-10.2: CSS Grid layout
**Browsers:** All supported
**Steps:**
1. View checkout on desktop
2. Verify two-column layout (form + order summary)

**Expected:** Proper grid layout, no overlap

#### TC-10.3: Tailwind utilities
**Browsers:** All supported
**Steps:**
1. Inspect responsive classes (lg:hidden, lg:block)
2. Resize browser window

**Expected:** Responsive utilities work correctly

---

## Performance Checklist

| Metric | Target | How to Test |
|--------|--------|-------------|
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse |
| FID (First Input Delay) | < 100ms | Lighthouse |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| JS Bundle Size | < 100KB gzipped | DevTools Network |

---

## Regression Test Checklist

Before each release, verify:

- [ ] Checkout flow completes successfully
- [ ] All payment methods work
- [ ] Express checkout buttons appear (where supported)
- [ ] Mobile layout displays correctly
- [ ] Discount codes apply/remove correctly
- [ ] Form validation shows errors
- [ ] Screen reader announcements work
- [ ] Keyboard navigation works
- [ ] No console errors
- [ ] No network errors (check for 4xx/5xx)

---

## Bug Report Template

When reporting checkout bugs, include:

```
**Environment:**
- Browser: [e.g., Chrome 120]
- OS: [e.g., iOS 17.2]
- Device: [e.g., iPhone 15 Pro]

**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**

**Actual Behavior:**

**Console Errors:** (if any)

**Screenshots/Video:** (if applicable)
```
