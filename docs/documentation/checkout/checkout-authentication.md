# Checkout Authentication

Customer authentication during checkout -- how Merchello handles email checks, sign-in, sign-up, guest checkout, password validation, and password resets.

**What it is:** A thin layer over Umbraco's member system scoped to the checkout flow. It creates/authenticates members, links them to the basket, and manages password-reset tokens — without forcing customers to leave the checkout page.

**Why it exists:** Standard ecommerce flows need all three of guest / sign-in / sign-up from one screen, plus a password-reset path that doesn't dump users back to a generic Umbraco login page. Merchello keeps these inside the checkout UI so conversion isn't broken by authentication detours.

Source: [ICheckoutMemberService.cs](../../../src/Merchello.Core/Checkout/Services/Interfaces/ICheckoutMemberService.cs), [CheckoutApiController.cs](../../../src/Merchello/Controllers/CheckoutApiController.cs), [CheckoutPasswordResetController.cs](../../../src/Merchello/Controllers/CheckoutPasswordResetController.cs).

## Overview

Merchello's checkout supports three customer states:

1. **Guest checkout** -- the customer provides an email but does not create an account.
2. **Sign in** -- the customer has an existing Umbraco member account and signs in during checkout.
3. **Sign up** -- the customer creates a new account during checkout.

All authentication operations are handled by `ICheckoutMemberService` and exposed through the checkout API.

> **Digital products always require an account.** If the basket contains digital products, guest checkout is disabled (`CheckoutViewModel.HasDigitalProducts = true`) and the customer must sign in or create an account. This is enforced server-side in `CheckoutService.BasketHasDigitalProductsAsync()` — do not rely on UI checks alone.

---

## How It Works

### Email Check

When a customer enters their email address at checkout, the frontend calls the check-email endpoint. For security, this endpoint **always returns `false`** for `hasExistingAccount` to prevent email enumeration attacks. The UI shows both sign-in and create-account options regardless.

```
POST /api/merchello/checkout/check-email
```

```json
{
  "email": "customer@example.com"
}
```

```json
{
  "hasExistingAccount": false
}
```

> **Tip:** Even though the API doesn't reveal whether an account exists, the sign-in form will surface errors if the credentials are wrong. This is the standard approach to prevent attackers from discovering which emails have accounts.

### Sign In

Customers with an existing Umbraco member account can sign in during checkout:

```
POST /api/merchello/checkout/sign-in
```

```json
{
  "email": "customer@example.com",
  "password": "their-password"
}
```

The service calls `ICheckoutMemberService.SignInAsync()` which authenticates against Umbraco's member system. On success, the customer's member key is associated with the basket.

### Sign Up (Create Account)

New customers can create an account during checkout. The account is created as an Umbraco member and the customer is automatically signed in:

```
POST /api/merchello/checkout/addresses
```

When the address save request includes a `password` field, the service:

1. Validates the password against Umbraco's configured password requirements
2. Creates a new Umbraco member via `ICheckoutMemberService.CreateMemberAsync()`
3. Assigns the member to the default checkout customer group
4. Signs in the new member automatically

### Guest Checkout

If the customer does not provide a password, they proceed as a guest. The email is saved with the basket for order communication, but no member account is created.

> **Warning:** Guest checkout is automatically disabled when the basket contains digital products. The UI should check `hasDigitalProducts` on the `CheckoutViewModel` and enforce account creation.

---

## Password Validation

Before creating an account, you can validate the password against Umbraco's rules:

```
POST /api/merchello/checkout/validate-password
```

```json
{
  "password": "proposed-password"
}
```

The response includes whether the password is valid and any specific errors (too short, missing special characters, etc.). This lets you give real-time feedback as the customer types.

---

## Password Reset

Merchello includes a complete password reset flow for customers who forget their password during checkout.

### Step 1: Request a Reset

```
POST /api/merchello/checkout/forgot-password
```

```json
{
  "email": "customer@example.com"
}
```

This calls `ICheckoutMemberService.InitiatePasswordResetAsync()`. The endpoint **always returns success** to prevent email enumeration -- even if the email doesn't exist, no error is shown.

If the email matches a member account, a reset token is generated and a notification is published (which triggers a reset email via your configured email handler).

### Step 2: Validate the Token

When the customer clicks the reset link, they land on `/checkout/reset-password?email=...&token=...`. The `CheckoutPasswordResetController` validates the token on page load:

```csharp
// The controller validates automatically on GET
var validation = await checkoutMemberService.ValidateResetTokenAsync(email, token, ct);
viewModel.TokenValid = validation.IsValid;
```

The reset page renders at `~/App_Plugins/Merchello/Views/Checkout/ResetPassword.cshtml`.

### Step 3: Submit New Password

```
POST /api/merchello/checkout/reset-password
```

```json
{
  "email": "customer@example.com",
  "token": "the-reset-token",
  "newPassword": "new-secure-password"
}
```

On success, the password is updated and the customer can sign in with their new credentials.

---

## Logged-In Member Detection

When the checkout page loads, `MerchelloCheckoutController` checks if the customer is already logged in:

```csharp
var currentMember = await memberManager.GetCurrentMemberAsync();
var isLoggedIn = currentMember != null;
```

The `CheckoutViewModel` exposes:

- `IsLoggedIn` -- `true` if the customer is already authenticated
- `MemberEmail` -- the logged-in member's email (auto-populates the email field)

If the customer is logged in, the UI should hide the "Create an account" and "Sign in" options since they're already authenticated.

---

## ICheckoutMemberService Reference

The service interface provides all authentication operations:

| Method | Purpose |
|--------|---------|
| `CheckEmailAsync(email)` | Check if an email has an existing account |
| `ValidatePasswordAsync(password)` | Validate password against Umbraco rules |
| `SignInAsync(email, password)` | Sign in with existing account |
| `CreateMemberAsync(parameters)` | Create a new member and sign in |
| `GetOrEnsureMemberGroupAsync()` | Get/create the default customer member group |
| `GetMemberKeyByEmailAsync(email)` | Look up a member by email |
| `InitiatePasswordResetAsync(email)` | Start password reset flow |
| `ValidateResetTokenAsync(email, token)` | Validate a reset token |
| `ResetPasswordAsync(parameters)` | Complete password reset |
| `SignOutAsync()` | Sign out the current member |

---

## Rate Limiting

Authentication endpoints are rate-limited to prevent abuse:

- **Check email:** 10 requests per minute per IP
- **Password reset:** 10 requests per minute per IP

If the limit is exceeded, the API returns `429 Too Many Requests`.
