# Vaulted Payments Architecture

A system for securely storing customer payment methods at payment providers (Stripe, Braintree, PayPal) and enabling off-session charges without CVV re-entry. This enables post-purchase upsells, repeat purchases, and subscription-like functionality.

---

## Table of Contents

1. [Overview](#overview)
2. [Provider Capabilities](#provider-capabilities)
3. [Architecture](#architecture)
4. [Implementation Phases](#implementation-phases)
   - [Phase 1: Core Models & Database](#phase-1-core-models--database)
   - [Phase 2: Provider Interface Extensions](#phase-2-provider-interface-extensions)
   - [Phase 3: Service Layer](#phase-3-service-layer)
   - [Phase 4: Provider Implementations](#phase-4-provider-implementations)
   - [Phase 5: API Endpoints](#phase-5-api-endpoints)
   - [Phase 6: Checkout Integration](#phase-6-checkout-integration)
   - [Phase 7: Documentation Updates](#phase-7-documentation-updates)
   - [Phase 8: Unit Tests](#phase-8-unit-tests)
   - [Phase 9: Test UI Updates](#phase-9-test-ui-updates)
5. [File Structure Summary](#file-structure-summary)
6. [Post-Purchase Upsells Integration](#post-purchase-upsells-integration)

---

## Implementation Status

| Phase | Description | Status |
| ----- | ----------- | ------ |
| **Phase 1** | Core Models & Database | Complete |
| **Phase 2** | Provider Interface Extensions | Complete |
| **Phase 3** | Service Layer | Complete |
| **Phase 4** | Provider Implementations | Complete |
| **Phase 5** | API Endpoints | Complete |
| **Phase 6** | Checkout Integration | Complete |
| **Phase 7** | Documentation Updates | Ongoing |
| **Phase 8** | Unit Tests | Ongoing hardening |
| **Phase 9** | Test UI Updates | Complete |

Core vaulted-payment architecture is implemented. This document also tracks runtime hardening updates.

**Latest hardening update (February 12, 2026):**

- `CheckoutPaymentsOrchestrationService.ProcessSavedPaymentAsync()` now always records successful saved-method charges via `RecordPaymentAsync()` and returns the recorded transaction ID.
- Deterministic fallback transaction IDs are used when providers omit IDs:
  - `saved_{hash}` for saved-method charges
  - `express_{hash}` for express checkout charges
- `SavedPaymentMethodService.ChargeAsync()` now applies shared idempotency guards for off-session vaulted charges (`IPaymentIdempotencyService`).
- `PostPurchaseUpsellService.AddToOrderAsync()` now fails closed if payment capture succeeds but payment recording fails, and releases fulfillment hold.
- `PostPurchaseUpsellController` now enforces confirmation-token cookie checks on all post-purchase endpoints.
- Coverage added for these paths in:
  - `src/Merchello.Tests/Checkout/CheckoutPaymentsOrchestrationGhostOrderTests.cs`
  - `src/Merchello.Tests/Upsells/PostPurchaseUpsellServiceTests.cs`

Original implementation files include:

- Phase 6: `checkout.store.js`, `components/checkout-payment.js`, `components/single-page-checkout.js` updated with saved methods support
- Phase 8: `SavedPaymentMethodServiceTests.cs`, `StripeVaultTests.cs`, `BraintreeVaultTests.cs`, `PayPalVaultTests.cs`
- Phase 9: Vault tab added to `test-provider-modal.element.ts`, API methods added to `merchello-api.ts`

---

## Overview

Vaulted payments allow customers to save payment methods (cards, PayPal, bank accounts) for future use. The actual payment credentials are stored securely at the payment provider - Merchello only stores references (tokens) and display metadata (last 4 digits, expiry, brand).

**Key Concepts:**
- **Vault Setup** - Collecting and saving payment details without charging (SetupIntent in Stripe)
- **Vault Confirmation** - Exchanging temporary tokens for permanent payment method references
- **Off-Session Charge** - Charging a saved method later without customer interaction (no CVV)
- **Provider Customer ID** - Some providers (Stripe, Braintree) require a customer object; others (PayPal) use standalone tokens

**Primary Use Cases:**
- Post-purchase upsells (Phase 8 of Upsells feature)
- One-click repeat purchases
- Future: Subscriptions

---

## Provider Capabilities

| Provider | Vaulting Support | CVV Required | Customer Object | Implementation |
|----------|-----------------|--------------|-----------------|----------------|
| **Stripe** | Yes | No (MIT) | Required | SetupIntent + PaymentMethod attached to Customer |
| **Braintree** | Yes | No | Required* | Vault tokens, PaymentMethod.Create |
| **PayPal** | Yes | N/A | Optional | Payment Method Tokens API (setup token -> payment token) |

### Stripe
- **SetupIntent** to collect and save payment details without charging
- **PaymentMethod** objects attached to **Customer** objects
- **Off-session payments** with `off_session: true` - Merchant-Initiated Transaction (MIT)
- Must collect customer consent upfront
- No CVV required for subsequent charges

### Braintree
- **Vault** stores payment methods with unique tokens
- CVV not stored (PCI compliance), not required for subsequent charges
- AVS/CVV rules only apply to first-time transactions by default
- Can re-verify 3D Secure by generating nonce from vaulted token
- *\*CustomerId required in `PaymentMethodRequest` to vault - payment methods belong to customers*

### PayPal
- **Billing Agreements** - buyer authorizes once, no re-login for subsequent charges
- **Payment Method Tokens API** (modern REST) - setup token -> permanent payment token
- Setup tokens expire after **3 days** - handle expiry gracefully
- Reference Transaction IDs valid for 730 days
- Best for high-frequency, low-AOV services
- **API Endpoints**: `POST /v3/vault/setup-tokens`, `POST /v3/vault/payment-tokens`

> ✅ **PayPal Implementation Note:** The current implementation uses direct REST calls via `HttpClient` against PayPal's Vault API (`/v3/vault/setup-tokens`, `/v3/vault/payment-tokens`, and delete). No SDK method verification is required.

---

## Architecture

```
+-----------------------------------------------------------------------------+
|  Checkout / Account Management                                               |
|  (Save payment method checkbox, My Saved Cards page)                        |
+-----------------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------+
|  ISavedPaymentMethodService                                                  |
|    - CreateSetupSessionAsync()     -> Create vault setup with provider       |
|    - ConfirmSetupAsync()           -> Exchange token, save to DB             |
|    - SaveFromCheckoutAsync()       -> Save during payment flow               |
|    - ChargeAsync()                 -> Charge saved method (off-session)      |
|    - DeleteAsync()                 -> Remove from provider + DB              |
|    - GetCustomerPaymentMethodsAsync()                                        |
+-----------------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------+
|  IPaymentProvider (extended)                                                 |
|    - CreateVaultSetupSessionAsync()   -> Provider-specific setup             |
|    - ConfirmVaultSetupAsync()         -> Exchange tokens                     |
|    - ChargeVaultedMethodAsync()       -> Off-session charge                  |
|    - DeleteVaultedMethodAsync()       -> Remove from provider vault          |
+-----------------------------------------------------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------------+
|  Provider APIs                                                               |
|  Stripe: SetupIntent -> PaymentMethod -> PaymentIntent (off_session)        |
|  Braintree: ClientToken -> Nonce -> PaymentMethod.Create -> Transaction.Sale|
|  PayPal: SetupToken -> PaymentToken -> Orders.Create with vault token       |
+-----------------------------------------------------------------------------+
```

---

## Implementation Phases

---

### Phase 1: Core Models & Database

**Goal:** Create the SavedPaymentMethod model, database mapping, and supporting types.

#### 1.1 Enums

**SavedPaymentMethodType** - `Payments/Models/SavedPaymentMethodType.cs`

```csharp
public enum SavedPaymentMethodType
{
    Card,
    PayPal,
    BankAccount,
    Other
}
```

#### 1.2 SavedPaymentMethod Model

**SavedPaymentMethod** - `Payments/Models/SavedPaymentMethod.cs`

```csharp
public class SavedPaymentMethod
{
    public Guid Id { get; set; }

    // Customer ownership
    public Guid CustomerId { get; set; }
    public virtual Customer? Customer { get; set; }

    // Provider identifiers
    public string ProviderAlias { get; set; } = string.Empty;      // "stripe", "braintree", "paypal"
    public string ProviderMethodId { get; set; } = string.Empty;   // pm_xxx, vault token, etc.
    public string? ProviderCustomerId { get; set; }                 // Stripe cus_xxx (required for Stripe)

    // Display metadata (never sensitive data)
    public SavedPaymentMethodType MethodType { get; set; } = SavedPaymentMethodType.Card;
    public string? CardBrand { get; set; }                          // visa, mastercard, amex
    public string? Last4 { get; set; }                              // 4242
    public int? ExpiryMonth { get; set; }                           // 1-12
    public int? ExpiryYear { get; set; }                            // 2026
    public string? BillingName { get; set; }
    public string? BillingEmail { get; set; }
    public string DisplayLabel { get; set; } = string.Empty;        // "Visa ending in 4242"

    // State
    public bool IsDefault { get; set; }
    public bool IsVerified { get; set; }

    // Consent tracking (compliance)
    public DateTime? ConsentDateUtc { get; set; }
    public string? ConsentIpAddress { get; set; }

    // Timestamps
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
    public DateTime? DateLastUsed { get; set; }

    // Provider-specific data
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}
```

#### 1.3 Database Mapping

**SavedPaymentMethodDbMapping** - `Payments/Mapping/SavedPaymentMethodDbMapping.cs`

```csharp
public class SavedPaymentMethodDbMapping : IEntityTypeConfiguration<SavedPaymentMethod>
{
    public void Configure(EntityTypeBuilder<SavedPaymentMethod> builder)
    {
        builder.ToTable("merchelloSavedPaymentMethods");
        builder.HasKey(x => x.Id);

        // Customer FK with cascade delete
        builder.HasOne(x => x.Customer)
            .WithMany(c => c.SavedPaymentMethods)
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(x => x.CustomerId);

        // Unique: one provider method per customer
        builder.HasIndex(x => new { x.CustomerId, x.ProviderAlias, x.ProviderMethodId }).IsUnique();

        // Field constraints
        builder.Property(x => x.ProviderAlias).IsRequired().HasMaxLength(100);
        builder.Property(x => x.ProviderMethodId).IsRequired().HasMaxLength(255);
        builder.Property(x => x.ProviderCustomerId).HasMaxLength(255);
        builder.Property(x => x.MethodType).HasConversion<string>().HasMaxLength(50);
        builder.Property(x => x.CardBrand).HasMaxLength(50);
        builder.Property(x => x.Last4).HasMaxLength(4);
        builder.Property(x => x.BillingName).HasMaxLength(200);
        builder.Property(x => x.BillingEmail).HasMaxLength(254);
        builder.Property(x => x.DisplayLabel).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ConsentIpAddress).HasMaxLength(45);

        // JSON column for extended data
        builder.Property(x => x.ExtendedData)
            .ToJsonConversion(3000);
    }
}
```

#### 1.4 Customer Model Update

Add navigation property to `Customer.cs`:

```csharp
public virtual ICollection<SavedPaymentMethod>? SavedPaymentMethods { get; set; }
```

#### Phase 1 Verification

- [x] SavedPaymentMethod model created
- [x] SavedPaymentMethodType enum created
- [x] SavedPaymentMethodDbMapping created
- [x] Customer.SavedPaymentMethods navigation property added
- [x] DbContext.SavedPaymentMethods DbSet registered

---

### Phase 2: Provider Interface Extensions

**Goal:** Extend IPaymentProvider with vault methods and add capability flags.

#### 2.1 PaymentProviderMetadata Additions

Add to `PaymentProviderMetadata.cs`:

```csharp
/// <summary>
/// Whether this provider supports vaulting payment methods for later use.
/// </summary>
public bool SupportsVaultedPayments { get; init; } = false;

/// <summary>
/// Whether this provider requires a provider-side customer ID for vaulting.
/// True for Stripe and Braintree (require Customer object/CustomerId), false for PayPal (standalone tokens).
/// </summary>
public bool RequiresProviderCustomerId { get; init; } = false;
```

#### 2.2 PaymentProviderSetting Additions

Add to `PaymentProviderSetting.cs`:

```csharp
/// <summary>
/// Whether vaulting is enabled for this provider. Only applies if provider supports vaulting.
/// Controlled via backoffice provider configuration.
/// </summary>
public bool IsVaultingEnabled { get; set; } = false;
```

**Behavior:**
- When `SupportsVaultedPayments = true` AND `IsVaultingEnabled = true`:
  - "Save payment method" checkbox appears in checkout for HostedFields and Widget methods
  - Customers can manage saved payment methods
  - Off-session charges are available
- When `IsVaultingEnabled = false`:
  - No save checkbox in checkout
  - Saved methods UI hidden
  - Existing saved methods remain but cannot be used until re-enabled

**Backoffice UI:**
- Toggle appears in provider configuration only if `SupportsVaultedPayments = true`
- Default: disabled (opt-in)
- Label: "Enable Payment Method Vaulting"
- Help text: "Allow customers to save payment methods for future purchases"

#### 2.3 Vault Request/Result Models

**VaultSetupRequest** - `Payments/Models/VaultSetupRequest.cs`

```csharp
public class VaultSetupRequest
{
    public required Guid CustomerId { get; init; }
    public required string CustomerEmail { get; init; }
    public string? CustomerName { get; init; }
    public string? MethodAlias { get; init; }
    public string? ReturnUrl { get; init; }
    public string? CancelUrl { get; init; }
    public string? IpAddress { get; init; }
    public Dictionary<string, string>? Metadata { get; init; }
}
```

**VaultSetupResult** - `Payments/Models/VaultSetupResult.cs`

```csharp
public class VaultSetupResult
{
    public required bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public string? SetupSessionId { get; init; }        // SetupIntent ID, local tracking ID
    public string? ClientSecret { get; init; }          // For frontend SDK
    public string? RedirectUrl { get; init; }           // For redirect flows
    public string? ProviderCustomerId { get; init; }    // Created/used provider customer
    public Dictionary<string, object>? SdkConfig { get; init; }

    public static VaultSetupResult Failed(string message) => new() { Success = false, ErrorMessage = message };
    public static VaultSetupResult Succeeded(string sessionId, string? clientSecret = null) =>
        new() { Success = true, SetupSessionId = sessionId, ClientSecret = clientSecret };
}
```

**VaultConfirmRequest** - `Payments/Models/VaultConfirmRequest.cs`

```csharp
public class VaultConfirmRequest
{
    public required Guid CustomerId { get; init; }
    public required string SetupSessionId { get; init; }
    public string? PaymentMethodToken { get; init; }    // From frontend SDK
    public string? ProviderCustomerId { get; init; }    // For providers requiring customer (Braintree)
    public Dictionary<string, string>? RedirectParams { get; init; }
    public bool ConsentGiven { get; init; } = true;
    public bool SetAsDefault { get; init; }
}
```

**VaultConfirmResult** - `Payments/Models/VaultConfirmResult.cs`

```csharp
public class VaultConfirmResult
{
    public required bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public string? ProviderMethodId { get; init; }
    public string? ProviderCustomerId { get; init; }
    public SavedPaymentMethodType MethodType { get; init; }
    public string? CardBrand { get; init; }
    public string? Last4 { get; init; }
    public int? ExpiryMonth { get; init; }
    public int? ExpiryYear { get; init; }
    public string? DisplayLabel { get; init; }
    public Dictionary<string, object>? ExtendedData { get; init; }

    public static VaultConfirmResult Failed(string message) => new() { Success = false, ErrorMessage = message };
}
```

**ChargeVaultedMethodRequest** - `Payments/Models/ChargeVaultedMethodRequest.cs`

```csharp
public class ChargeVaultedMethodRequest
{
    public required Guid InvoiceId { get; init; }
    public required Guid CustomerId { get; init; }
    public required string ProviderMethodId { get; init; }
    public string? ProviderCustomerId { get; init; }
    public required decimal Amount { get; init; }
    public required string CurrencyCode { get; init; }
    public string? Description { get; init; }
    public string? IdempotencyKey { get; init; }
    public Dictionary<string, string>? Metadata { get; init; }
}
```

#### 2.4 IPaymentProvider Extensions

Add to `IPaymentProvider.cs`:

```csharp
// =====================================================
// Vaulted Payments
// =====================================================

/// <summary>
/// Create a setup session for saving a payment method without charging.
/// </summary>
Task<VaultSetupResult> CreateVaultSetupSessionAsync(
    VaultSetupRequest request,
    CancellationToken cancellationToken = default);

/// <summary>
/// Confirm and save a payment method after customer interaction.
/// </summary>
Task<VaultConfirmResult> ConfirmVaultSetupAsync(
    VaultConfirmRequest request,
    CancellationToken cancellationToken = default);

/// <summary>
/// Charge a vaulted payment method (off-session, no CVV).
/// </summary>
Task<PaymentResult> ChargeVaultedMethodAsync(
    ChargeVaultedMethodRequest request,
    CancellationToken cancellationToken = default);

/// <summary>
/// Delete a vaulted payment method from the provider.
/// </summary>
Task<bool> DeleteVaultedMethodAsync(
    string providerMethodId,
    string? providerCustomerId = null,
    CancellationToken cancellationToken = default);
```

#### 2.5 PaymentProviderBase Defaults

Add default implementations to `PaymentProviderBase.cs`:

```csharp
public virtual Task<VaultSetupResult> CreateVaultSetupSessionAsync(
    VaultSetupRequest request, CancellationToken ct = default)
    => Task.FromResult(VaultSetupResult.Failed("This provider does not support vaulted payments."));

public virtual Task<VaultConfirmResult> ConfirmVaultSetupAsync(
    VaultConfirmRequest request, CancellationToken ct = default)
    => Task.FromResult(VaultConfirmResult.Failed("This provider does not support vaulted payments."));

public virtual Task<PaymentResult> ChargeVaultedMethodAsync(
    ChargeVaultedMethodRequest request, CancellationToken ct = default)
    => Task.FromResult(PaymentResult.Failed("This provider does not support vaulted payments."));

public virtual Task<bool> DeleteVaultedMethodAsync(
    string providerMethodId, string? providerCustomerId = null, CancellationToken ct = default)
    => Task.FromResult(false);
```

#### Phase 2 Verification

- [x] IPaymentProvider interface compiles with new methods
- [x] PaymentProviderBase provides default implementations
- [x] PaymentProviderMetadata has SupportsVaultedPayments and RequiresProviderCustomerId
- [x] PaymentProviderSetting has IsVaultingEnabled
- [x] Existing providers (Manual) still work unchanged

---

### Phase 3: Service Layer

**Goal:** Implement ISavedPaymentMethodService and factory.

#### 3.1 Service Parameters

**CreateVaultSetupParameters** - `Payments/Services/Parameters/CreateVaultSetupParameters.cs`

```csharp
public class CreateVaultSetupParameters
{
    public required Guid CustomerId { get; init; }
    public required string ProviderAlias { get; init; }
    public string? MethodAlias { get; init; }
    public string? ReturnUrl { get; init; }
    public string? CancelUrl { get; init; }
    public string? IpAddress { get; init; }
}
```

**ConfirmVaultSetupParameters** - `Payments/Services/Parameters/ConfirmVaultSetupParameters.cs`

```csharp
public class ConfirmVaultSetupParameters
{
    public required Guid CustomerId { get; init; }
    public required string ProviderAlias { get; init; }
    public required string SetupSessionId { get; init; }
    public string? PaymentMethodToken { get; init; }
    public Dictionary<string, string>? RedirectParams { get; init; }
    public bool SetAsDefault { get; init; }
    public string? IpAddress { get; init; }
}
```

**SavePaymentMethodFromCheckoutParameters** - `Payments/Services/Parameters/SavePaymentMethodFromCheckoutParameters.cs`

```csharp
public class SavePaymentMethodFromCheckoutParameters
{
    public required Guid CustomerId { get; init; }
    public required string ProviderAlias { get; init; }
    public required string ProviderMethodId { get; init; }
    public string? ProviderCustomerId { get; init; }
    public SavedPaymentMethodType MethodType { get; init; }
    public string? CardBrand { get; init; }
    public string? Last4 { get; init; }
    public int? ExpiryMonth { get; init; }
    public int? ExpiryYear { get; init; }
    public string? BillingName { get; init; }
    public string? BillingEmail { get; init; }
    public bool SetAsDefault { get; init; }
    public string? IpAddress { get; init; }
    public Dictionary<string, object>? ExtendedData { get; init; }
}
```

**ChargeSavedMethodParameters** - `Payments/Services/Parameters/ChargeSavedMethodParameters.cs`

```csharp
public class ChargeSavedMethodParameters
{
    public required Guid InvoiceId { get; init; }
    public required Guid SavedPaymentMethodId { get; init; }
    public decimal? Amount { get; init; }           // null = use invoice total
    public string? Description { get; init; }
    public string? IdempotencyKey { get; init; }
}
```

#### 3.2 ISavedPaymentMethodService Interface

**ISavedPaymentMethodService** - `Payments/Services/Interfaces/ISavedPaymentMethodService.cs`

```csharp
public interface ISavedPaymentMethodService
{
    // Query
    Task<IEnumerable<SavedPaymentMethod>> GetCustomerPaymentMethodsAsync(
        Guid customerId, CancellationToken ct = default);
    Task<SavedPaymentMethod?> GetPaymentMethodAsync(Guid id, CancellationToken ct = default);
    Task<SavedPaymentMethod?> GetDefaultPaymentMethodAsync(Guid customerId, CancellationToken ct = default);

    // Vault setup flow
    Task<CrudResult<VaultSetupResult>> CreateSetupSessionAsync(
        CreateVaultSetupParameters parameters, CancellationToken ct = default);
    Task<CrudResult<SavedPaymentMethod>> ConfirmSetupAsync(
        ConfirmVaultSetupParameters parameters, CancellationToken ct = default);

    // Save during checkout
    Task<CrudResult<SavedPaymentMethod>> SaveFromCheckoutAsync(
        SavePaymentMethodFromCheckoutParameters parameters, CancellationToken ct = default);

    // Manage
    Task<CrudResult<SavedPaymentMethod>> SetDefaultAsync(Guid id, CancellationToken ct = default);
    Task<CrudResult<bool>> DeleteAsync(Guid id, CancellationToken ct = default);

    // Charge
    Task<CrudResult<PaymentResult>> ChargeAsync(
        ChargeSavedMethodParameters parameters, CancellationToken ct = default);

    // Provider customer management
    Task<string?> GetOrCreateProviderCustomerIdAsync(
        Guid customerId, string providerAlias, CancellationToken ct = default);
}
```

#### 3.3 SavedPaymentMethodFactory

**SavedPaymentMethodFactory** - `Payments/Factories/SavedPaymentMethodFactory.cs`

```csharp
public class SavedPaymentMethodFactory
{
    public SavedPaymentMethod CreateFromVaultConfirmation(
        Guid customerId,
        string providerAlias,
        VaultConfirmResult result,
        string? ipAddress = null,
        bool setAsDefault = false)
    {
        var now = DateTime.UtcNow;
        return new SavedPaymentMethod
        {
            Id = GuidExtensions.NewSequentialGuid,
            CustomerId = customerId,
            ProviderAlias = providerAlias,
            ProviderMethodId = result.ProviderMethodId!,
            ProviderCustomerId = result.ProviderCustomerId,
            MethodType = result.MethodType,
            CardBrand = result.CardBrand,
            Last4 = result.Last4,
            ExpiryMonth = result.ExpiryMonth,
            ExpiryYear = result.ExpiryYear,
            DisplayLabel = result.DisplayLabel ?? GenerateDisplayLabel(result),
            IsDefault = setAsDefault,
            IsVerified = true,
            ConsentDateUtc = now,
            ConsentIpAddress = ipAddress,
            DateCreated = now,
            DateUpdated = now,
            ExtendedData = result.ExtendedData ?? []
        };
    }

    public SavedPaymentMethod CreateFromCheckout(SavePaymentMethodFromCheckoutParameters p)
    {
        var now = DateTime.UtcNow;
        return new SavedPaymentMethod
        {
            Id = GuidExtensions.NewSequentialGuid,
            CustomerId = p.CustomerId,
            ProviderAlias = p.ProviderAlias,
            ProviderMethodId = p.ProviderMethodId,
            ProviderCustomerId = p.ProviderCustomerId,
            MethodType = p.MethodType,
            CardBrand = p.CardBrand,
            Last4 = p.Last4,
            ExpiryMonth = p.ExpiryMonth,
            ExpiryYear = p.ExpiryYear,
            BillingName = p.BillingName,
            BillingEmail = p.BillingEmail,
            DisplayLabel = GenerateDisplayLabel(p.MethodType, p.CardBrand, p.Last4, p.BillingEmail),
            IsDefault = p.SetAsDefault,
            IsVerified = true,
            ConsentDateUtc = now,
            ConsentIpAddress = p.IpAddress,
            DateCreated = now,
            DateUpdated = now,
            ExtendedData = p.ExtendedData ?? []
        };
    }

    private static string GenerateDisplayLabel(VaultConfirmResult r) =>
        GenerateDisplayLabel(r.MethodType, r.CardBrand, r.Last4, null);

    private static string GenerateDisplayLabel(
        SavedPaymentMethodType type, string? brand, string? last4, string? email) => type switch
    {
        SavedPaymentMethodType.Card => $"{FormatCardBrand(brand)} ending in {last4}",
        SavedPaymentMethodType.PayPal => $"PayPal - {email ?? "account"}",
        SavedPaymentMethodType.BankAccount => $"Bank account ending in {last4}",
        _ => $"Payment method ending in {last4}"
    };

    private static string FormatCardBrand(string? brand) => brand?.ToLowerInvariant() switch
    {
        "visa" => "Visa",
        "mastercard" => "Mastercard",
        "amex" or "american_express" => "American Express",
        "discover" => "Discover",
        _ => brand ?? "Card"
    };
}
```

#### 3.4 Notifications

**SavedPaymentMethod Notifications** - `Notifications/SavedPaymentMethod/`

```csharp
public class SavedPaymentMethodCreatingNotification(SavedPaymentMethod method)
    : MerchelloCancelableNotification<SavedPaymentMethod>(method);

public class SavedPaymentMethodCreatedNotification(SavedPaymentMethod method) : MerchelloNotification
{
    public SavedPaymentMethod SavedPaymentMethod { get; } = method;
}

public class SavedPaymentMethodDeletingNotification(SavedPaymentMethod method)
    : MerchelloCancelableNotification<SavedPaymentMethod>(method);

public class SavedPaymentMethodDeletedNotification(SavedPaymentMethod method) : MerchelloNotification
{
    public SavedPaymentMethod SavedPaymentMethod { get; } = method;
}
```

#### Phase 3 Verification

- [x] ISavedPaymentMethodService interface defined
- [x] SavedPaymentMethodService fully implemented
- [x] SavedPaymentMethodFactory implemented with CreateFromVaultConfirmation and CreateFromCheckout
- [x] Service parameters created (CreateVaultSetupParameters, ConfirmVaultSetupParameters, etc.)
- [x] Notifications implemented (Creating, Created, Deleting, Deleted)

---

### Phase 4: Provider Implementations

**Goal:** Implement vault methods in Stripe, Braintree, and PayPal providers, including save-during-checkout integration.

#### 4.0 ProcessPaymentRequest & PaymentResult Enhancements

Before implementing provider vault methods, update existing payment models to support vaulting.

**ProcessPaymentRequest.cs** - Add these new properties:

```csharp
public class ProcessPaymentRequest
{
    // ... existing properties ...

    // =====================================================
    // Customer Context (NEW - required for vaulting)
    // =====================================================

    /// <summary>
    /// The customer ID for this payment. Required for vaulting operations.
    /// </summary>
    public Guid? CustomerId { get; init; }

    /// <summary>
    /// The currency code for this payment (e.g., "GBP", "USD").
    /// Required for vaulted method charges.
    /// </summary>
    public string? CurrencyCode { get; init; }

    /// <summary>
    /// Return URL for redirect-based payment flows.
    /// </summary>
    public string? ReturnUrl { get; init; }

    /// <summary>
    /// Cancel URL for redirect-based payment flows.
    /// </summary>
    public string? CancelUrl { get; init; }

    /// <summary>
    /// Description for the payment (shown on provider dashboard/receipts).
    /// </summary>
    public string? Description { get; init; }

    // =====================================================
    // Vaulted Payments (NEW)
    // =====================================================

    /// <summary>
    /// Whether to save this payment method for future use.
    /// Only applies when provider supports vaulting and vaulting is enabled.
    /// </summary>
    public bool SavePaymentMethod { get; init; }

    /// <summary>
    /// Make this the default saved method if saving.
    /// </summary>
    public bool SetAsDefaultMethod { get; init; }

    /// <summary>
    /// ID of a saved payment method to use instead of new payment details.
    /// When set, PaymentMethodToken/Nonce is ignored.
    /// </summary>
    public Guid? SavedPaymentMethodId { get; init; }
}
```

**PaymentResult.cs** - Add vault details property:

```csharp
public class PaymentResult
{
    // ... existing properties ...

    // =====================================================
    // Vaulted Payments (NEW)
    // =====================================================

    /// <summary>
    /// Details of the vaulted payment method if SavePaymentMethod was true and successful.
    /// The checkout controller uses this to create the SavedPaymentMethod record.
    /// </summary>
    public VaultConfirmResult? VaultedMethodDetails { get; init; }
}
```

> **Note:** The `CustomerId`, `CurrencyCode`, `ReturnUrl`, `CancelUrl`, and `Description` properties may already exist in `PaymentRequest` (used for session creation). Adding them to `ProcessPaymentRequest` ensures they're available during payment processing for vaulting operations.

#### 4.1 Stripe Implementation

Update `StripePaymentProvider.cs`.

**Constructor Update** - No change required. Saving is handled in checkout using `PaymentResult.VaultedMethodDetails`.

**Helper Method** - Get or create Stripe Customer:

```csharp
/// <summary>
/// Gets or creates a Stripe Customer for the Merchello customer.
/// </summary>
private async Task<string> GetOrCreateStripeCustomerAsync(
    Guid merchelloCustomerId,
    string email,
    string? name,
    CancellationToken ct)
{
    var customerService = new CustomerService(_client);

    // Search by Merchello customer ID first
    var searchResults = await customerService.SearchAsync(new CustomerSearchOptions
    {
        Query = $"metadata['merchelloCustomerId']:'{merchelloCustomerId}'"
    }, cancellationToken: ct);

    if (searchResults.Data.Count > 0)
        return searchResults.Data[0].Id;

    // Fallback to email search
    var emailSearch = await customerService.SearchAsync(new CustomerSearchOptions
    {
        Query = $"email:'{email}'"
    }, cancellationToken: ct);

    if (emailSearch.Data.Count > 0)
    {
        var existingCustomer = emailSearch.Data[0];
        await customerService.UpdateAsync(existingCustomer.Id, new CustomerUpdateOptions
        {
            Metadata = new Dictionary<string, string>
            {
                ["merchelloCustomerId"] = merchelloCustomerId.ToString()
            }
        }, cancellationToken: ct);
        return existingCustomer.Id;
    }

    // Create new customer
    var newCustomer = await customerService.CreateAsync(new CustomerCreateOptions
    {
        Email = email,
        Name = name,
        Metadata = new Dictionary<string, string>
        {
            ["merchelloCustomerId"] = merchelloCustomerId.ToString(),
            ["source"] = "merchello"
        }
    }, cancellationToken: ct);

    return newCustomer.Id;
}
```

**ProcessPaymentAsync (checkout save flow)** - Stripe confirms client-side, then the server fetches the PaymentIntent and (optionally) attaches the PaymentMethod to a customer for vaulting:

```csharp
public override async Task<PaymentResult> ProcessPaymentAsync(
    ProcessPaymentRequest request, CancellationToken ct = default)
{
    var paymentIntentId = request.PaymentMethodToken ?? request.SessionId;
    var paymentIntent = await _paymentIntentService.GetAsync(
        paymentIntentId,
        new PaymentIntentGetOptions { Expand = ["payment_method"] },
        ct);

    VaultConfirmResult? vaultDetails = null;
    if (request.SavePaymentMethod && request.CustomerId.HasValue)
    {
        var stripeCustomerId = await GetOrCreateStripeCustomerAsync(
            request.CustomerId.Value, request.CustomerEmail, request.CustomerName, ct);

        // Attach payment method if needed and map card details.
        // (See StripePaymentProvider.ProcessPaymentAsync implementation.)
    }

    return new PaymentResult
    {
        Success = true,
        Status = PaymentResultStatus.Pending, // webhook finalizes
        TransactionId = paymentIntent.Id,
        Amount = request.Amount,
        VaultedMethodDetails = vaultDetails
    };
}
```

**Standalone Vault Methods** - For saving without payment:

```csharp
public override PaymentProviderMetadata Metadata => new()
{
    Alias = "stripe",
    DisplayName = "Stripe",
    SupportsRefunds = true,
    SupportsPartialRefunds = true,
    SupportsAuthAndCapture = true,
    SupportsPaymentLinks = true,
    SupportsVaultedPayments = true,         // NEW
    RequiresProviderCustomerId = true,       // Stripe needs Customer object
    RequiresWebhook = true
};

public override async Task<VaultSetupResult> CreateVaultSetupSessionAsync(
    VaultSetupRequest request, CancellationToken ct = default)
{
    // 1. Get or create Stripe Customer
    var stripeCustomerId = await GetOrCreateStripeCustomerAsync(
        request.CustomerId, request.CustomerEmail, request.CustomerName, ct);

    // 2. Create SetupIntent for off-session usage
    var options = new SetupIntentCreateOptions
    {
        Customer = stripeCustomerId,
        PaymentMethodTypes = ["card"],
        Usage = "off_session",
        Metadata = new Dictionary<string, string>
        {
            ["merchello_customer_id"] = request.CustomerId.ToString()
        }
    };

    var setupIntent = await _setupIntentService.CreateAsync(options, cancellationToken: ct);

    return new VaultSetupResult
    {
        Success = true,
        SetupSessionId = setupIntent.Id,
        ClientSecret = setupIntent.ClientSecret,
        ProviderCustomerId = stripeCustomerId
    };
}

public override async Task<VaultConfirmResult> ConfirmVaultSetupAsync(
    VaultConfirmRequest request, CancellationToken ct = default)
{
    var setupIntent = await _setupIntentService.GetAsync(request.SetupSessionId,
        new SetupIntentGetOptions { Expand = ["payment_method"] }, cancellationToken: ct);

    if (setupIntent.Status != "succeeded")
        return VaultConfirmResult.Failed($"Setup not complete: {setupIntent.Status}");

    var pm = setupIntent.PaymentMethod;
    var card = pm.Card;

    return new VaultConfirmResult
    {
        Success = true,
        ProviderMethodId = pm.Id,
        ProviderCustomerId = setupIntent.Customer?.ToString(),
        MethodType = SavedPaymentMethodType.Card,
        CardBrand = card.Brand,
        Last4 = card.Last4,
        ExpiryMonth = (int)card.ExpMonth,
        ExpiryYear = (int)card.ExpYear,
        DisplayLabel = $"{card.Brand} ending in {card.Last4}",
        ExtendedData = new Dictionary<string, object>
        {
            ["fingerprint"] = card.Fingerprint,
            ["funding"] = card.Funding
        }
    };
}

public override async Task<PaymentResult> ChargeVaultedMethodAsync(
    ChargeVaultedMethodRequest request, CancellationToken ct = default)
{
    var options = new PaymentIntentCreateOptions
    {
        Amount = ConvertToStripeAmount(request.Amount, request.CurrencyCode),
        Currency = request.CurrencyCode.ToLowerInvariant(),
        Customer = request.ProviderCustomerId,
        PaymentMethod = request.ProviderMethodId,
        OffSession = true,
        Confirm = true,
        Description = request.Description,
        Metadata = new Dictionary<string, string>
        {
            ["invoice_id"] = request.InvoiceId.ToString()
        }
    };

    if (!string.IsNullOrEmpty(request.IdempotencyKey))
        options.IdempotencyKey = request.IdempotencyKey;

    try
    {
        var pi = await _paymentIntentService.CreateAsync(options, cancellationToken: ct);
        return pi.Status == "succeeded"
            ? PaymentResult.Completed(pi.Id, request.Amount)
            : PaymentResult.Failed($"Payment failed: {pi.Status}");
    }
    catch (StripeException ex) when (ex.StripeError?.Code == "authentication_required")
    {
        return PaymentResult.Failed("Card requires authentication and cannot be charged automatically.");
    }
}

public override async Task<bool> DeleteVaultedMethodAsync(
    string providerMethodId, string? providerCustomerId = null, CancellationToken ct = default)
{
    try
    {
        await _paymentMethodService.DetachAsync(providerMethodId, cancellationToken: ct);
        return true;
    }
    catch { return false; }
}
```

#### 4.2 Braintree Implementation

Update `BraintreePaymentProvider.cs`.

**Constructor Update** - No change required. Saving is handled in checkout using `PaymentResult.VaultedMethodDetails`.

**Helper Method** - Get or create Braintree Customer:

```csharp
/// <summary>
/// Gets or creates a Braintree Customer for the Merchello customer.
/// </summary>
private async Task<string> GetOrCreateBraintreeCustomerAsync(
    Guid merchelloCustomerId,
    string email,
    string? name,
    CancellationToken ct)
{
    // Use Merchello customer ID as the Braintree customer ID for easy correlation
    var braintreeCustomerId = $"merch_{merchelloCustomerId:N}"[..32];

    try
    {
        var existingCustomer = await _gateway!.Customer.FindAsync(braintreeCustomerId);
        return existingCustomer.Id;
    }
    catch (NotFoundException)
    {
        var request = new CustomerRequest
        {
            Id = braintreeCustomerId,
            Email = email,
            FirstName = name?.Split(' ').FirstOrDefault(),
            LastName = name?.Split(' ').Skip(1).FirstOrDefault(),
            CustomFields = new Dictionary<string, string>
            {
                ["merchello_customer_id"] = merchelloCustomerId.ToString()
            }
        };

        var result = await _gateway.Customer.CreateAsync(request);
        if (result.IsSuccess())
        {
            return result.Target.Id;
        }

        throw new InvalidOperationException($"Failed to create Braintree customer: {result.Message}");
    }
}
```

**ProcessPaymentAsync (checkout save flow)** - store in vault on success and map the returned token:

```csharp
public override async Task<PaymentResult> ProcessPaymentAsync(
    ProcessPaymentRequest request, CancellationToken ct = default)
{
    string? braintreeCustomerId = null;
    if (request.SavePaymentMethod && request.CustomerId.HasValue)
    {
        braintreeCustomerId = await GetOrCreateBraintreeCustomerAsync(
            request.CustomerId.Value, request.CustomerEmail, request.CustomerName, ct);
    }

    var transactionRequest = new TransactionRequest
    {
        Amount = request.Amount,
        PaymentMethodNonce = request.PaymentMethodToken,
        CustomerId = braintreeCustomerId,
        Options = new TransactionOptionsRequest
        {
            SubmitForSettlement = true,
            StoreInVaultOnSuccess = !string.IsNullOrEmpty(braintreeCustomerId)
        }
    };

    var result = await _gateway.Transaction.SaleAsync(transactionRequest);
    if (!result.IsSuccess())
        return PaymentResult.Failed(result.Message);

    VaultConfirmResult? vaultDetails = null;
    if (request.SavePaymentMethod && result.Target.CreditCard?.Token != null)
    {
        var card = result.Target.CreditCard;
        vaultDetails = new VaultConfirmResult
        {
            Success = true,
            ProviderMethodId = card.Token,
            ProviderCustomerId = braintreeCustomerId,
            MethodType = SavedPaymentMethodType.Card,
            CardBrand = card.CardType.ToString(),
            Last4 = card.LastFour,
            ExpiryMonth = int.TryParse(card.ExpirationMonth, out var m) ? m : null,
            ExpiryYear = int.TryParse(card.ExpirationYear, out var y) ? y : null,
            DisplayLabel = $"{card.CardType} ending in {card.LastFour}"
        };
    }

    return new PaymentResult
    {
        Status = PaymentResultStatus.Completed,
        TransactionId = result.Target.Id,
        Amount = request.Amount,
        VaultedMethodDetails = vaultDetails
    };
}
```

**Standalone Vault Methods** - For saving without payment:

```csharp
public override PaymentProviderMetadata Metadata => new()
{
    Alias = "braintree",
    DisplayName = "Braintree",
    SupportsRefunds = true,
    SupportsPartialRefunds = true,
    SupportsAuthAndCapture = true,
    SupportsVaultedPayments = true,         // NEW
    RequiresProviderCustomerId = true,       // Braintree requires CustomerId for vaulting
    RequiresWebhook = true
};

public override async Task<VaultSetupResult> CreateVaultSetupSessionAsync(
    VaultSetupRequest request, CancellationToken ct = default)
{
    // Get or create Braintree customer (required for vaulting)
    var braintreeCustomerId = await GetOrCreateBraintreeCustomerAsync(
        request.CustomerId, request.CustomerEmail, request.CustomerName, ct);

    var clientToken = await _gateway.ClientToken.GenerateAsync(new ClientTokenRequest
    {
        CustomerId = braintreeCustomerId
    });

    return new VaultSetupResult
    {
        Success = true,
        SetupSessionId = Guid.NewGuid().ToString(),
        ClientSecret = clientToken,
        ProviderCustomerId = braintreeCustomerId,
        SdkConfig = new Dictionary<string, object> { ["authorization"] = clientToken }
    };
}

public override async Task<VaultConfirmResult> ConfirmVaultSetupAsync(
    VaultConfirmRequest request, CancellationToken ct = default)
{
    // Note: ProviderCustomerId should be passed from the setup session
    var result = await _gateway.PaymentMethod.CreateAsync(new PaymentMethodRequest
    {
        CustomerId = request.ProviderCustomerId, // Required for Braintree vault
        PaymentMethodNonce = request.PaymentMethodToken,
        Options = new PaymentMethodOptionsRequest
        {
            VerifyCard = true,
            MakeDefault = request.SetAsDefault,
            FailOnDuplicatePaymentMethod = true
        }
    });

    if (!result.IsSuccess())
        return VaultConfirmResult.Failed(result.Message);

    if (result.Target is CreditCard card)
    {
        return new VaultConfirmResult
        {
            Success = true,
            ProviderMethodId = card.Token,
            MethodType = SavedPaymentMethodType.Card,
            CardBrand = card.CardType.ToString(),
            Last4 = card.LastFour,
            ExpiryMonth = int.Parse(card.ExpirationMonth),
            ExpiryYear = int.Parse(card.ExpirationYear),
            DisplayLabel = $"{card.CardType} ending in {card.LastFour}"
        };
    }

    return VaultConfirmResult.Failed("Unsupported payment method type");
}

public override async Task<PaymentResult> ChargeVaultedMethodAsync(
    ChargeVaultedMethodRequest request, CancellationToken ct = default)
{
    var result = await _gateway.Transaction.SaleAsync(new TransactionRequest
    {
        Amount = request.Amount,
        PaymentMethodToken = request.ProviderMethodId,
        Options = new TransactionOptionsRequest { SubmitForSettlement = true }
    });

    return result.IsSuccess()
        ? PaymentResult.Completed(result.Target.Id, request.Amount)
        : PaymentResult.Failed(result.Message);
}

public override async Task<bool> DeleteVaultedMethodAsync(
    string providerMethodId, string? providerCustomerId = null, CancellationToken ct = default)
{
    try
    {
        await _gateway.PaymentMethod.DeleteAsync(providerMethodId);
        return true;
    }
    catch { return false; }
}
```

#### 4.3 PayPal Implementation

Update `PayPalPaymentProvider.cs`.

**Constructor Update** - No change required. Saving is handled in checkout using `PaymentResult.VaultedMethodDetails`.

> **Note:** PayPal does not require a provider-side Customer object for vaulting. The `RequiresProviderCustomerId` is `false` for PayPal.

**ProcessPaymentAsync (checkout save flow)** - PayPal captures the order and, if the response contains vault details, maps them into `VaultedMethodDetails`:

```csharp
if (order.Status == OrderStatus.Completed)
{
    VaultConfirmResult? vaultDetails = null;
    if (request.SavePaymentMethod)
    {
        var vault = order.PaymentSource?.Paypal?.Attributes?.Vault;
        if (!string.IsNullOrEmpty(vault?.Id))
        {
            var email = order.PaymentSource?.Paypal?.EmailAddress ?? vault.Customer?.EmailAddress;
            vaultDetails = new VaultConfirmResult
            {
                Success = true,
                ProviderMethodId = vault.Id,
                ProviderCustomerId = vault.Customer?.Id,
                MethodType = SavedPaymentMethodType.PayPal,
                DisplayLabel = $"PayPal - {email ?? "account"}",
                ExtendedData = new Dictionary<string, object>
                {
                    ["email"] = email ?? string.Empty
                }
            };
        }
    }

    return new PaymentResult
    {
        Success = true,
        Status = PaymentResultStatus.Completed,
        TransactionId = order.Id,
        Amount = request.Amount,
        VaultedMethodDetails = vaultDetails
    };
}
```

> **Note:** PayPal only returns a vault token when the order is created with vault instructions (`PaypalWalletAttributes.Vault`). The checkout flow now adds these instructions when `SavePaymentMethod` is requested for widget flows, so vault details are returned on capture.

**Standalone Vault Methods** - For saving without payment:

```csharp
public override PaymentProviderMetadata Metadata => new()
{
    Alias = "paypal",
    DisplayName = "PayPal",
    SupportsRefunds = true,
    SupportsPartialRefunds = true,
    SupportsAuthAndCapture = true,
    SupportsPaymentLinks = true,
    SupportsVaultedPayments = true,         // NEW
    RequiresProviderCustomerId = false,
    RequiresWebhook = true
};

public override async Task<VaultSetupResult> CreateVaultSetupSessionAsync(
    VaultSetupRequest request, CancellationToken ct = default)
{
    var setupToken = await _client.CreateSetupTokenAsync(new SetupTokenRequest
    {
        PaymentSource = new PaymentSource
        {
            PayPal = new PayPalWallet
            {
                UsageType = "MERCHANT",
                ExperienceContext = new ExperienceContext
                {
                    ReturnUrl = request.ReturnUrl,
                    CancelUrl = request.CancelUrl
                }
            }
        }
    });

    return new VaultSetupResult
    {
        Success = true,
        SetupSessionId = setupToken.Id,
        RedirectUrl = setupToken.Links.First(l => l.Rel == "approve").Href
    };
}

public override async Task<VaultConfirmResult> ConfirmVaultSetupAsync(
    VaultConfirmRequest request, CancellationToken ct = default)
{
    var paymentToken = await _client.CreatePaymentTokenAsync(new PaymentTokenRequest
    {
        PaymentSource = new PaymentSource
        {
            Token = new TokenSource { Id = request.SetupSessionId, Type = "SETUP_TOKEN" }
        }
    });

    return new VaultConfirmResult
    {
        Success = true,
        ProviderMethodId = paymentToken.Id,
        MethodType = SavedPaymentMethodType.PayPal,
        DisplayLabel = $"PayPal - {paymentToken.PaymentSource.PayPal.Email}",
        ExtendedData = new Dictionary<string, object>
        {
            ["email"] = paymentToken.PaymentSource.PayPal.Email
        }
    };
}

public override async Task<PaymentResult> ChargeVaultedMethodAsync(
    ChargeVaultedMethodRequest request, CancellationToken ct = default)
{
    var order = await _client.OrdersCreateAsync(new OrderRequest
    {
        Intent = "CAPTURE",
        PaymentSource = new PaymentSource
        {
            Token = new TokenSource { Id = request.ProviderMethodId, Type = "PAYMENT_METHOD_TOKEN" }
        },
        PurchaseUnits = [new PurchaseUnit
        {
            Amount = new Amount { CurrencyCode = request.CurrencyCode, Value = request.Amount.ToString("F2") },
            Description = request.Description
        }]
    });

    if (order.Status == "COMPLETED")
        return PaymentResult.Completed(order.Id, request.Amount);

    return PaymentResult.Failed($"Payment failed: {order.Status}");
}
```

#### Phase 4 Verification

**Provider Implementations:**

- [x] Stripe: CreateVaultSetupSessionAsync, ConfirmVaultSetupAsync, ChargeVaultedMethodAsync implemented
- [x] Stripe: SupportsVaultedPayments = true, RequiresProviderCustomerId = true
- [x] Braintree: CreateVaultSetupSessionAsync, ConfirmVaultSetupAsync, ChargeVaultedMethodAsync implemented
- [x] Braintree: SupportsVaultedPayments = true, RequiresProviderCustomerId = true
- [x] PayPal: CreateVaultSetupSessionAsync, ConfirmVaultSetupAsync, ChargeVaultedMethodAsync implemented
- [x] PayPal: SupportsVaultedPayments = true, RequiresProviderCustomerId = false
- [x] All providers have DeleteVaultedMethodAsync implemented

**Runtime Verification (manual testing required):**

- [ ] Stripe vault setup creates SetupIntent with correct `usage: off_session`
- [ ] Stripe off-session charge works with saved PaymentMethod
- [ ] Braintree vault creates payment method token
- [ ] Braintree charge via vault token works
- [ ] PayPal setup token flow works with redirect
- [ ] Save during checkout works for all providers
- [ ] Off-session charge succeeds without CVV

---

### Phase 5: API Endpoints

**Goal:** Create admin and storefront API endpoints.

#### 5.1 DTOs

**Admin DTOs** - `Payments/Dtos/`

```csharp
// SavedPaymentMethodDetailDto.cs - Full details for admin views
public class SavedPaymentMethodDetailDto
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public string ProviderAlias { get; set; } = string.Empty;
    public string? ProviderDisplayName { get; set; }
    public SavedPaymentMethodType MethodType { get; set; }
    public string? CardBrand { get; set; }
    public string? Last4 { get; set; }
    public int? ExpiryMonth { get; set; }
    public int? ExpiryYear { get; set; }
    public string? ExpiryFormatted { get; set; }
    public bool IsExpired { get; set; }
    public string? BillingName { get; set; }
    public string? BillingEmail { get; set; }
    public string DisplayLabel { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool IsVerified { get; set; }
    public DateTime? ConsentDateUtc { get; set; }
    public string? ConsentIpAddress { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
    public DateTime? DateLastUsed { get; set; }
}

// SavedPaymentMethodListItemDto.cs - Lightweight for list views
public class SavedPaymentMethodListItemDto
{
    public Guid Id { get; set; }
    public string ProviderAlias { get; set; } = string.Empty;
    public SavedPaymentMethodType MethodType { get; set; }
    public string? CardBrand { get; set; }
    public string? Last4 { get; set; }
    public string? ExpiryFormatted { get; set; }
    public bool IsExpired { get; set; }
    public string DisplayLabel { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime? DateLastUsed { get; set; }
}
```

**Storefront DTOs** - `Payments/Dtos/`

```csharp
// StorefrontSavedMethodDto.cs - Customer-facing display
public class StorefrontSavedMethodDto
{
    public Guid Id { get; set; }
    public string ProviderAlias { get; set; } = string.Empty;
    public SavedPaymentMethodType MethodType { get; set; }
    public string? CardBrand { get; set; }
    public string? Last4 { get; set; }
    public string? ExpiryFormatted { get; set; }
    public bool IsExpired { get; set; }
    public string DisplayLabel { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public string? IconHtml { get; set; }
}

// VaultSetupRequestDto.cs
public class VaultSetupRequestDto
{
    public required string ProviderAlias { get; set; }
    public string? MethodAlias { get; set; }
    public string? ReturnUrl { get; set; }
    public string? CancelUrl { get; set; }
}

// VaultConfirmRequestDto.cs
public class VaultConfirmRequestDto
{
    public required string ProviderAlias { get; set; }
    public required string SetupSessionId { get; set; }
    public string? PaymentMethodToken { get; set; }
    public string? ProviderCustomerId { get; set; }
    public bool SetAsDefault { get; set; }
}

// VaultSetupResponseDto.cs
public class VaultSetupResponseDto
{
    public required bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public string? SetupSessionId { get; init; }
    public string? ClientSecret { get; init; }
    public string? RedirectUrl { get; init; }
    public string? ProviderCustomerId { get; init; }
    public Dictionary<string, object>? SdkConfig { get; init; }
}

// ProcessSavedPaymentMethodDto.cs
public class ProcessSavedPaymentMethodDto
{
    public required Guid InvoiceId { get; set; }
    public required Guid SavedPaymentMethodId { get; set; }
    public string? IdempotencyKey { get; set; }
}
```

**Checkout DTOs** - `Checkout/Dtos/`

```csharp
// CheckoutPaymentOptionsDto.cs - Payment options available during checkout
public class CheckoutPaymentOptionsDto
{
    public List<PaymentMethodDto> Providers { get; set; } = [];
    public List<StorefrontSavedMethodDto> SavedPaymentMethods { get; set; } = [];
    public bool HasSavedPaymentMethods => SavedPaymentMethods.Count > 0;
    public bool CanSavePaymentMethods { get; set; }
}

// PaymentMethodDto.cs - payment method details with vault support flag
public class PaymentMethodDto
{
    // ... standard payment method fields ...
    public bool SupportsVaulting { get; set; } // HostedFields methods only
}
```

#### 5.2 Admin API Controller

**SavedPaymentMethodsApiController** - `Controllers/SavedPaymentMethodsApiController.cs`

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/v1/customers/{customerId}/saved-payment-methods` | Get customer's saved methods |
| `GET` | `/api/v1/saved-payment-methods/{id}` | Get specific method |
| `DELETE` | `/api/v1/saved-payment-methods/{id}` | Delete method |
| `POST` | `/api/v1/saved-payment-methods/{id}/set-default` | Set as default |

#### 5.3 Storefront API Controller

**StorefrontSavedPaymentMethodsController** - `Controllers/StorefrontSavedPaymentMethodsController.cs`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/merchello/storefront/payment-methods` | Required | Get my saved methods |
| `POST` | `/api/merchello/storefront/payment-methods/setup` | Required | Create setup session |
| `POST` | `/api/merchello/storefront/payment-methods/confirm` | Required | Confirm and save |
| `POST` | `/api/merchello/storefront/payment-methods/{id}/set-default` | Required | Set as default |
| `DELETE` | `/api/merchello/storefront/payment-methods/{id}` | Required | Delete method |
| `GET` | `/api/merchello/storefront/payment-methods/providers` | Required | Get vault-enabled providers |

#### Phase 5 Verification

**Implementation:**

- [x] SavedPaymentMethodsApiController created with all endpoints
- [x] StorefrontSavedPaymentMethodsController created with all endpoints
- [x] All DTOs created (SavedPaymentMethodDetailDto, SavedPaymentMethodListItemDto, StorefrontSavedMethodDto, etc.)
- [x] VaultSetupRequestDto, VaultSetupResponseDto, VaultConfirmRequestDto created
- [x] ProcessSavedPaymentMethodDto created

**Runtime Verification (manual testing required):**

- [ ] Admin can view customer saved methods
- [ ] Admin can delete saved methods
- [ ] Customer can list their saved methods
- [ ] Customer can add new payment method (setup + confirm)
- [ ] Customer can delete their payment method
- [ ] Ownership validation prevents cross-customer access

---

### Phase 6: Checkout Integration

**Goal:** Allow customers to save payment methods during checkout and use saved methods for payment.

> **Note:** The `ProcessPaymentRequest` and `PaymentResult` enhancements are already defined in Phase 4.0. This phase focuses on the controller and frontend integration.
>
> **Note:** Save-during-checkout is supported for HostedFields and Widget methods where the provider supports vaulting and vaulting is enabled. For widget flows (e.g., PayPal buttons), the order is created with provider-specific vault instructions when saving is requested, so vault details are returned on capture.

#### 6.1 Storefront Checkout DTO Enhancement

The `StorefrontProcessPaymentDto` and `StorefrontProcessPaymentResultDto` are defined in Phase 5.1 under "Checkout DTOs". These DTOs include the vault-related fields needed for checkout integration:

- `SavePaymentMethod` - Whether to save the payment method
- `SetAsDefaultMethod` - Whether to set as default
- `SavedPaymentMethodId` - Use an existing saved method instead of new payment details
- `PaymentMethodSaved` (result) - Whether a method was saved during payment

#### 6.2 Checkout Controller Integration

Update `MerchelloCheckoutController.cs` - add dependencies and ProcessPayment method.

**Controller Dependencies** - Add to constructor:

```csharp
public class MerchelloCheckoutController(
    // ... existing dependencies ...
    IMemberManager memberManager,
    ICustomerService customerService,
    IPaymentProviderService paymentProviderService,
    IPaymentService paymentService,
    ISavedPaymentMethodService savedPaymentMethodService,
    IInvoiceService invoiceService,
    ILogger<MerchelloCheckoutController> logger) : Controller
{
    // Helper method to get current customer ID from logged-in member
    private async Task<Guid?> GetCurrentCustomerIdAsync(CancellationToken ct)
    {
        var member = await memberManager.GetCurrentMemberAsync();
        if (member == null) return null;

        var customer = await customerService.GetByMemberKeyAsync(member.Key, ct);
        return customer?.Id;
    }
}
```

**ProcessPayment Endpoint:**

```csharp
[HttpPost("process-payment")]
[Authorize]
public async Task<IActionResult> ProcessPayment(
    [FromBody] StorefrontProcessPaymentDto request,
    CancellationToken ct)
{
    var customerId = await GetCurrentCustomerIdAsync(ct);
    if (customerId == null)
        return Unauthorized();

    var invoice = await _invoiceService.GetAsync(request.InvoiceId, ct);
    if (invoice == null)
        return NotFound("Invoice not found.");
    if (invoice.CustomerId != customerId)
        return Forbid();

    // Get provider to check vault support
    var provider = _paymentProviderService.GetProvider(request.ProviderAlias);
    if (provider == null)
        return BadRequest("Payment provider not found.");

    var providerSetting = await _paymentProviderService.GetSettingAsync(request.ProviderAlias, ct);
    var vaultingEnabled = provider.Metadata.SupportsVaultedPayments
        && providerSetting?.IsVaultingEnabled == true;

    // Validate vault request
    if (request.SavePaymentMethod && !vaultingEnabled)
        return BadRequest("Payment method saving is not available for this provider.");

    if (request.SavedPaymentMethodId.HasValue && !vaultingEnabled)
        return BadRequest("Saved payment methods are not available for this provider.");

    // Build payment request
    var paymentRequest = new ProcessPaymentRequest
    {
        InvoiceId = invoice.Id,
        CustomerId = customerId.Value,
        ProviderAlias = request.ProviderAlias,
        Amount = invoice.BalanceDue,
        CurrencyCode = invoice.CurrencyCode,
        PaymentMethodToken = request.PaymentMethodToken,
        CustomerEmail = invoice.CustomerEmail,
        CustomerName = invoice.BillingAddress?.Name,
        ReturnUrl = request.ReturnUrl,
        CancelUrl = request.CancelUrl,
        IdempotencyKey = request.IdempotencyKey,

        // Vault fields
        SavePaymentMethod = request.SavePaymentMethod && vaultingEnabled,
        SetAsDefaultMethod = request.SetAsDefaultMethod,
        SavedPaymentMethodId = request.SavedPaymentMethodId
    };

    // Process payment (provider handles saved method charging internally)
    var result = await _paymentService.ProcessPaymentAsync(paymentRequest, ct);

    if (!result.Successful)
        return BadRequest(new { error = result.Messages.FirstOrDefault()?.Message });

    // If payment succeeded and vault details returned, save to database
    if (result.ResultObject?.VaultedMethodDetails is { Success: true } vaultDetails)
    {
        var saveResult = await _savedPaymentMethodService.SaveFromCheckoutAsync(
            new SavePaymentMethodFromCheckoutParameters
            {
                CustomerId = customerId.Value,
                ProviderAlias = request.ProviderAlias,
                ProviderMethodId = vaultDetails.ProviderMethodId!,
                ProviderCustomerId = vaultDetails.ProviderCustomerId,
                MethodType = vaultDetails.MethodType,
                CardBrand = vaultDetails.CardBrand,
                Last4 = vaultDetails.Last4,
                ExpiryMonth = vaultDetails.ExpiryMonth,
                ExpiryYear = vaultDetails.ExpiryYear,
                BillingName = invoice.BillingAddress?.Name,
                BillingEmail = invoice.CustomerEmail,
                SetAsDefault = request.SetAsDefaultMethod,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                ExtendedData = vaultDetails.ExtendedData
            }, ct);

        // Log but don't fail payment if vault save fails
        if (!saveResult.Successful)
        {
            _logger.LogWarning("Failed to save payment method after checkout: {Error}",
                saveResult.Messages.FirstOrDefault()?.Message);
        }
    }

    return Ok(new StorefrontProcessPaymentResultDto
    {
        Success = true,
        TransactionId = result.ResultObject?.TransactionId,
        Status = result.ResultObject?.Status.ToString(),
        RedirectUrl = result.ResultObject?.RedirectUrl,
        PaymentMethodSaved = result.ResultObject?.VaultedMethodDetails?.Success == true
    });
}
```

#### 6.3 Checkout Payment Options Endpoint

Add endpoint to get available payment options including saved methods:

```csharp
[HttpGet("payment-options")]
[Authorize]
public async Task<IActionResult> GetPaymentOptions(CancellationToken ct)
{
    var result = new CheckoutPaymentOptionsDto();

    // Checkout methods (include SupportsVaulting per method)
    var methods = await providerManager.GetCheckoutPaymentMethodsAsync(ct);
    foreach (var method in methods.Where(m => m.IconMediaKey.HasValue))
    {
        method.IconMediaUrl = ResolveMediaUrl(method.IconMediaKey!.Value);
    }
    result.Providers = methods.ToList();
    result.CanSavePaymentMethods = methods.Any(m => m.SupportsVaulting);

    // Saved methods (only when logged in)
    var member = await memberManager.GetCurrentMemberAsync();
    if (member != null)
    {
        var customer = await customerService.GetByMemberKeyAsync(member.Key, ct);
        if (customer != null)
        {
            var savedMethods = await savedPaymentMethodService
                .GetCustomerPaymentMethodsAsync(customer.Id, ct);

            result.SavedPaymentMethods = savedMethods
                .Select(m => new StorefrontSavedMethodDto
                {
                    Id = m.Id,
                    ProviderAlias = m.ProviderAlias,
                    MethodType = m.MethodType,
                    CardBrand = m.CardBrand,
                    Last4 = m.Last4,
                    ExpiryFormatted = FormatExpiry(m.ExpiryMonth, m.ExpiryYear),
                    IsExpired = IsExpired(m.ExpiryMonth, m.ExpiryYear),
                    DisplayLabel = m.DisplayLabel,
                    IsDefault = m.IsDefault
                })
                .ToList();
        }
    }

    return Ok(result);
}
```

#### 6.4 Payment Options DTOs

> **Note:** The checkout payment options DTOs are defined in Phase 5.1 under "Checkout DTOs". They use `CheckoutPaymentOptionsDto` and `PaymentMethodDto` for checkout methods, and `StorefrontSavedMethodDto` for saved methods. See Phase 5.1 for the full DTO definitions.

The key DTOs for checkout integration are:

- `CheckoutPaymentOptionsDto` - Contains `Providers` list, `SavedPaymentMethods` list, and `CanSavePaymentMethods` flag
- `PaymentMethodDto` - Checkout payment method info with `SupportsVaulting`
- `StorefrontSavedMethodDto` - Saved method info with `Id`, `DisplayLabel`, `CardBrand`, `Last4`, `ExpiryFormatted`, `IsExpired`, `IsDefault`, `IconHtml`

#### 6.5 Frontend Checkout Integration

**checkout-payment.js (Alpine)** - Payment component logic:

```typescript
interface CheckoutPaymentOptionsResponse {
  providers: PaymentMethodOption[];
  savedPaymentMethods: SavedMethodOption[];
  canSavePaymentMethods: boolean;
}

interface PaymentMethodOption {
  providerAlias: string;
  methodAlias: string;
  displayName: string;
  integrationType: number;
  supportsVaulting: boolean;
}

interface SavedMethodOption {
  id: string;
  displayLabel: string;
  cardBrand?: string;
  last4?: string;
  expiryDisplay?: string;
  isDefault: boolean;
  isExpired: boolean;
}

// Fetch payment options on load
async function loadPaymentOptions(): Promise<CheckoutPaymentOptionsResponse> {
  const response = await fetch('/api/merchello/checkout/payment-options');
  return response.json();
}

// Process payment with save option (new payment method)
async function processPayment(params: {
  invoiceId: string;
  providerAlias: string;
  paymentMethodToken?: string;
  savePaymentMethod: boolean;
  setAsDefault: boolean;
}) {
  const response = await fetch('/api/merchello/checkout/process-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceId: params.invoiceId,
      providerAlias: params.providerAlias,
      paymentMethodToken: params.paymentMethodToken,
      savePaymentMethod: params.savePaymentMethod,
      setAsDefaultMethod: params.setAsDefault
    })
  });
  return response.json();
}

// Process payment with a saved payment method
async function processSavedPayment(params: {
  invoiceId: string;
  savedPaymentMethodId: string;
  idempotencyKey?: string;
}) {
  const response = await fetch('/api/merchello/checkout/process-saved-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoiceId: params.invoiceId,
      savedPaymentMethodId: params.savedPaymentMethodId,
      idempotencyKey: params.idempotencyKey
    })
  });
  return response.json();
}
```

**Checkout UI (Alpine.js)** - Implemented in:

- `wwwroot/js/checkout/components/checkout-payment.js` (payment selection + save/default toggles)
- `wwwroot/js/checkout/components/single-page-checkout.js` (submit flow incl. saved method payments)
- `wwwroot/js/checkout/stores/checkout.store.js` (saved methods + vault flags state)

The checkout calls `GET /api/merchello/checkout/payment-options` to populate:
- `paymentMethods` (with `supportsVaulting`)
- `savedPaymentMethods`
- `canSavePaymentMethods`

#### 6.6 CSS Styles Reference

```css
.saved-methods-section {
  margin: 1rem 0;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.saved-method {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.saved-method:hover {
  background: #f5f5f5;
}

.saved-method.expired {
  opacity: 0.6;
  cursor: not-allowed;
}

.saved-method input[type="radio"] {
  margin-right: 0.75rem;
}

.method-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.brand {
  font-weight: 600;
}

.expiry {
  color: #666;
  font-size: 0.875rem;
}

.default-badge {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.expired-badge {
  background: #ffebee;
  color: #c62828;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.save-method-checkbox,
.default-checkbox {
  display: flex;
  align-items: center;
  margin-top: 1rem;
  cursor: pointer;
}

.save-method-checkbox input,
.default-checkbox input {
  margin-right: 0.5rem;
}

.saved-badge {
  background: #4caf50;
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.7rem;
  margin-left: 0.5rem;
}
```

#### Phase 6 Verification

**Implementation:**

- [x] CheckoutPaymentOptionsDto created with Providers and SavedPaymentMethods lists
- [x] PaymentMethodDto includes SupportsVaulting flag
- [x] ProcessPaymentRequest has SavePaymentMethod, SetAsDefaultMethod, SavedPaymentMethodId properties
- [x] PaymentResult has VaultedMethodDetails property for returning saved method info

**Runtime Verification (manual testing required):**

- [x] `GET /payment-options` returns providers with vaulting status
- [x] `GET /payment-options` returns customer's saved methods per provider
- [x] Expired methods marked correctly in response
- [x] `SavePaymentMethod=true` ignored when provider doesn't support vaulting (logged, not fatal)
- [x] `SavePaymentMethod=true` ignored when vaulting is disabled for provider (logged, not fatal)
- [x] `SavePaymentMethod=true` ignored for non-HostedFields methods (redirect/widget)
- [x] `VaultedMethodDetails` saved to database after successful payment
- [x] Vault save failure doesn't fail the payment (logged, not thrown)
- [x] Saved payment method checkout uses `/process-saved-payment` endpoint
- [x] Saved payment method validates ownership (customer can only use own methods)
- [x] `process-saved-payment` records successful charges into payments ledger via `RecordPaymentAsync`
- [x] Saved-payment deterministic fallback transaction IDs (`saved_{hash}`) are used when provider omits transaction ID
- [x] Express deterministic fallback transaction IDs (`express_{hash}`) are used when provider omits transaction ID
- [x] Idempotency key prevents duplicate vaulted charges (`SavedPaymentMethodService.ChargeAsync`)

**Frontend:**

- [x] Payment options load on checkout mount
- [x] Saved methods displayed per provider with brand/last4/expiry
- [x] Expired methods shown as disabled
- [x] Default method pre-selected (or most recent if no default)
- [x] "Use new payment method" option always available
- [x] "Save payment method" checkbox shows only when:
  - Provider supports vaulting
  - Vaulting is enabled for provider
  - User is NOT using a saved method
- [x] "Set as default" checkbox shows only when save is checked
- [x] Payment processes successfully with saved method
- [x] Payment processes successfully with new method + save
- [x] Success message indicates when method was saved

---

### Phase 7: Documentation Updates

**Goal:** Update existing payment provider documentation to include vaulted payments.

#### 7.1 PaymentProviders-Architecture.md Updates

Add to **Key Interfaces** table:
- `ISavedPaymentMethodService` - Vault setup, confirmation, charging, deletion

Add to **PaymentProviderMetadata** section:
```csharp
public bool SupportsVaultedPayments { get; init; } = false;
public bool RequiresProviderCustomerId { get; init; } = false;
```

Add to **IPaymentProvider Interface** section:
- `CreateVaultSetupSessionAsync()` - Create setup session without charging
- `ConfirmVaultSetupAsync()` - Exchange tokens for permanent payment method
- `ChargeVaultedMethodAsync()` - Off-session charge
- `DeleteVaultedMethodAsync()` - Remove from provider vault

Add to **Database Schema** section:

**merchelloSavedPaymentMethods**
- `Id` (Guid), `CustomerId` (FK), `ProviderAlias`, `ProviderMethodId`, `ProviderCustomerId`
- `MethodType`, `CardBrand`, `Last4`, `ExpiryMonth`, `ExpiryYear`
- `DisplayLabel`, `IsDefault`, `IsVerified`, `ConsentDateUtc`, `ConsentIpAddress`
- `DateCreated`, `DateUpdated`, `DateLastUsed`, `ExtendedData` (JSON)

Add to **API Endpoints** section:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/customers/{customerId}/saved-payment-methods` | Get customer's saved methods |
| GET | `/api/v1/saved-payment-methods/{id}` | Get saved method details |
| POST | `/api/v1/saved-payment-methods/{id}/set-default` | Set default saved method |
| DELETE | `/api/v1/saved-payment-methods/{id}` | Delete saved method |
| POST | `/api/merchello/storefront/payment-methods/setup` | Create vault setup session |
| POST | `/api/merchello/storefront/payment-methods/confirm` | Confirm and save method |

#### 7.2 PaymentProviders-DevGuide.md Updates

Add new section **"Implementing Vaulted Payments"** with:

1. **Capability Declaration**
```csharp
public override PaymentProviderMetadata Metadata => new()
{
    // ... existing properties
    SupportsVaultedPayments = true,
    RequiresProviderCustomerId = true  // Set based on provider requirements
};
```

2. **Required Method Implementations**
- `CreateVaultSetupSessionAsync()` - Return client secret/token for frontend SDK
- `ConfirmVaultSetupAsync()` - Exchange temporary token for permanent reference
- `ChargeVaultedMethodAsync()` - Process off-session payment
- `DeleteVaultedMethodAsync()` - Clean up at provider

3. **Provider Customer Management**
- When to create provider-side customers
- Mapping Merchello customers to provider customers
- Storage patterns for provider customer IDs

4. **Error Handling**
- Authentication required errors (Stripe SCA)
- Expired setup tokens
- Invalid/revoked payment methods

#### Phase 7 Verification

- [x] PaymentProviders-Architecture.md updated with vault content (section exists)
- [x] PaymentProviders-DevGuide.md includes vault implementation guide
- [x] IPaymentProvider vault methods documented
- [x] SavedPaymentMethod database schema documented
- [x] API endpoints documented

---

### Phase 8: Unit Tests

**Goal:** Create comprehensive unit tests following existing patterns (xUnit, Moq, Shouldly).

#### 8.1 Service Tests

**SavedPaymentMethodServiceTests.cs** - `Merchello.Tests/Payments/Services/`

```csharp
public class SavedPaymentMethodServiceTests : IClassFixture<ServiceTestFixture>
{
    [Fact]
    public async Task GetCustomerPaymentMethodsAsync_ReturnsEmptyList_WhenNoMethods()

    [Fact]
    public async Task CreateSetupSessionAsync_ReturnsError_WhenProviderNotFound()

    [Fact]
    public async Task CreateSetupSessionAsync_ReturnsError_WhenProviderDoesNotSupportVault()

    [Fact]
    public async Task ConfirmSetupAsync_SavesPaymentMethod_WhenSuccessful()

    [Fact]
    public async Task ConfirmSetupAsync_SetsDefault_WhenRequested()

    [Fact]
    public async Task ChargeAsync_ReturnsError_WhenMethodNotFound()

    [Fact]
    public async Task ChargeAsync_UpdatesDateLastUsed_WhenSuccessful()

    [Fact]
    public async Task DeleteAsync_RemovesFromProviderAndDatabase()

    [Fact]
    public async Task DeleteAsync_ClearsDefault_WhenDeletingDefaultMethod()

    [Fact]
    public async Task SetDefaultAsync_ClearsPreviousDefault()
}
```

#### 8.2 Factory Tests

**SavedPaymentMethodFactoryTests.cs** - `Merchello.Tests/Payments/Factories/`

```csharp
public class SavedPaymentMethodFactoryTests
{
    [Fact]
    public void CreateFromVaultConfirmation_SetsAllProperties()

    [Fact]
    public void CreateFromVaultConfirmation_GeneratesDisplayLabel_WhenNotProvided()

    [Fact]
    public void CreateFromCheckout_SetsConsentTracking()

    [Theory]
    [InlineData("visa", "Visa")]
    [InlineData("mastercard", "Mastercard")]
    [InlineData("amex", "American Express")]
    public void GenerateDisplayLabel_FormatsCardBrand(string input, string expected)
}
```

#### 8.3 Provider Vault Tests

**StripeVaultTests.cs** - `Merchello.Tests/Payments/Providers/`

```csharp
public class StripeVaultTests
{
    [Fact]
    public void Metadata_SupportsVaultedPayments_IsTrue()

    [Fact]
    public void Metadata_RequiresProviderCustomerId_IsTrue()

    [Fact]
    public async Task CreateVaultSetupSessionAsync_ReturnsError_WhenNotConfigured()

    [Fact]
    public async Task ChargeVaultedMethodAsync_ReturnsError_WhenNotConfigured()
}
```

**BraintreeVaultTests.cs** - `Merchello.Tests/Payments/Providers/`

```csharp
public class BraintreeVaultTests
{
    [Fact]
    public void Metadata_SupportsVaultedPayments_IsTrue()

    [Fact]
    public void Metadata_RequiresProviderCustomerId_IsTrue()

    [Fact]
    public async Task CreateVaultSetupSessionAsync_ReturnsError_WhenNotConfigured()

    [Fact]
    public async Task ConfirmVaultSetupAsync_ReturnsError_WhenNonceInvalid()
}
```

**PayPalVaultTests.cs** - `Merchello.Tests/Payments/Providers/`

```csharp
public class PayPalVaultTests
{
    [Fact]
    public void Metadata_SupportsVaultedPayments_IsTrue()

    [Fact]
    public async Task CreateVaultSetupSessionAsync_ReturnsRedirectUrl()

    [Fact]
    public async Task ConfirmVaultSetupAsync_ReturnsPayPalEmail_InExtendedData()
}
```

#### Phase 8 Verification

- [x] SavedPaymentMethodServiceTests created
- [x] SavedPaymentMethodFactoryTests created and passing
- [x] StripeVaultTests created
- [x] BraintreeVaultTests created
- [x] PayPalVaultTests created
- [x] Factory tests follow existing patterns (Shouldly assertions)

---

### Phase 9: Test UI Updates

**Goal:** Add Vault testing tab to the backoffice payment provider test modal.

#### 9.1 API Endpoints

Add to **PaymentProvidersApiController.cs**:

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/payment-providers/{id}/test/vault-setup` | Create test vault setup session |
| `POST` | `/payment-providers/{id}/test/vault-confirm` | Confirm test vault setup |
| `POST` | `/payment-providers/{id}/test/vault-charge` | Test charging a vaulted method |
| `DELETE` | `/payment-providers/{id}/test/vault/{providerMethodId}` | Test deleting vaulted method |

#### 9.2 DTOs

**TestVaultConfirmRequestDto.cs**
```csharp
public class TestVaultConfirmRequestDto
{
    public required string SetupSessionId { get; init; }
    public string? PaymentMethodToken { get; init; }
    public string? ProviderCustomerId { get; init; }
}
```

**TestVaultChargeRequestDto.cs**
```csharp
public class TestVaultChargeRequestDto
{
    public required string ProviderMethodId { get; init; }
    public string? ProviderCustomerId { get; init; }
    public decimal Amount { get; init; } = 1.00m;
    public string CurrencyCode { get; init; } = "USD";
}
```
> **Note:** `vault-setup` does not require a request body (empty object is fine). Responses are lightweight anonymous objects.

#### 9.3 Frontend - merchello-api.ts

Add to `MerchelloApi`:

```typescript
// Vault testing
testVaultSetup(settingId: string, request: Record<string, unknown>): Promise<{ success: boolean; setupSessionId?: string; clientSecret?: string; redirectUrl?: string; providerCustomerId?: string; errorMessage?: string }>
testVaultConfirm(settingId: string, request: TestVaultConfirmRequestDto): Promise<{ success: boolean; providerMethodId?: string; providerCustomerId?: string; displayLabel?: string; cardBrand?: string; last4?: string; expiryMonth?: number; expiryYear?: number; errorMessage?: string }>
testVaultCharge(settingId: string, request: TestVaultChargeRequestDto): Promise<{ success: boolean; transactionId?: string; errorMessage?: string }>
testVaultDelete(settingId: string, providerMethodId: string): Promise<{ success: boolean }>
```

#### 9.4 Frontend - test-provider-modal.element.ts

Add **6th tab: "Vault"** with:

1. **Setup Section**
   - "Create Vault Setup" button
   - Display client secret/redirect URL
   - Method alias selector (if provider has multiple methods)

2. **Confirm Section**
   - Token/nonce input (prefilled with provider test token)
   - Approval URL shown for redirect flows (e.g., PayPal)
   - "Confirm Setup" button to finalize vaulting

3. **Charge Section**
   - Display saved method details after confirmation
   - Amount input field
   - "Test Charge" button
   - Display charge result

4. **Cleanup Section**
   - "Delete Vaulted Method" button
   - Confirmation dialog

**Tab Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [Session] [Payment] [Express] [Webhooks] [Links] [Vault] │
├─────────────────────────────────────────────────────────┤
│  Vault Testing                                           │
│                                                          │
│  1. Setup                                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ [Create Vault Setup Session]                        │ │
│  │                                                     │ │
│  │ Session ID: seti_xxx                               │ │
│  │ Client Secret: seti_xxx_secret_xxx                 │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  2. Confirm (Card Entry)                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ┌──────────────────────────────────────────────┐   │ │
│  │ │  [Card Number]  [MM/YY]  [CVC]               │   │ │
│  │ └──────────────────────────────────────────────┘   │ │
│  │ [Confirm & Save Payment Method]                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  3. Saved Method                                        │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ✓ Visa ending in 4242 (exp 12/26)                  │ │
│  │ Token: pm_xxx                                      │ │
│  │                                                     │ │
│  │ Amount: [10.00] USD                                │ │
│  │ [Test Charge]  [Delete Method]                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  4. Charge Result                                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ✓ Payment successful                               │ │
│  │ Transaction ID: pi_xxx                             │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

#### Phase 9 Verification

> **Status: COMPLETE** - Backend endpoints and frontend Vault tab fully implemented.

- [x] Vault tab added to test-provider-modal.element.ts
- [x] Vault tab appears when provider supports vaulted payments
- [x] Setup session creates successfully
- [x] Token/nonce input supported (approval URL shown for redirect flows)
- [x] Confirm saves payment method
- [x] Test charge processes successfully
- [x] Delete removes method from provider
- [x] Error states display correctly
- [x] Tab hidden for providers without vault support

---

## File Structure Summary

```
src/Merchello.Core/Payments/
|-- Models/
|   |-- SavedPaymentMethod.cs
|   |-- SavedPaymentMethodType.cs
|   |-- VaultSetupRequest.cs
|   |-- VaultSetupResult.cs
|   |-- VaultConfirmRequest.cs
|   |-- VaultConfirmResult.cs
|   +-- ChargeVaultedMethodRequest.cs
|-- Dtos/
|   |-- SavedPaymentMethodDetailDto.cs
|   +-- SavedPaymentMethodListItemDto.cs
|-- Factories/
|   +-- SavedPaymentMethodFactory.cs
|-- Services/
|   |-- Interfaces/
|   |   +-- ISavedPaymentMethodService.cs
|   |-- Parameters/
|   |   |-- CreateVaultSetupParameters.cs
|   |   |-- ConfirmVaultSetupParameters.cs
|   |   |-- SavePaymentMethodFromCheckoutParameters.cs
|   |   +-- ChargeSavedMethodParameters.cs
|   +-- SavedPaymentMethodService.cs
|-- Mapping/
|   +-- SavedPaymentMethodDbMapping.cs
+-- Providers/
    |-- Interfaces/
    |   +-- IPaymentProvider.cs          # Extended with vault methods
    |-- PaymentProviderBase.cs           # Default implementations
    |-- PaymentProviderMetadata.cs       # New capability flags
    |-- Stripe/
    |   +-- StripePaymentProvider.cs     # Vault implementation
    |-- Braintree/
    |   +-- BraintreePaymentProvider.cs  # Vault implementation
    +-- PayPal/
        +-- PayPalPaymentProvider.cs     # Vault implementation

src/Merchello.Core/Payments/Dtos/
|-- SavedPaymentMethodDetailDto.cs
|-- SavedPaymentMethodListItemDto.cs
|-- StorefrontSavedMethodDto.cs
|-- VaultSetupRequestDto.cs
|-- VaultSetupResponseDto.cs
|-- VaultConfirmRequestDto.cs
+-- ProcessSavedPaymentMethodDto.cs

src/Merchello.Core/Checkout/Dtos/
+-- CheckoutPaymentOptionsDto.cs

src/Merchello.Core/Notifications/SavedPaymentMethodNotifications/
|-- SavedPaymentMethodCreatingNotification.cs
|-- SavedPaymentMethodCreatedNotification.cs
|-- SavedPaymentMethodDeletingNotification.cs
+-- SavedPaymentMethodDeletedNotification.cs

src/Merchello/Controllers/
|-- SavedPaymentMethodsApiController.cs           # Admin API
+-- StorefrontSavedPaymentMethodsController.cs    # Storefront API
```

---

## Post-Purchase Upsells Integration

This architecture directly powers the current post-purchase flow:

- API routes:
  - `GET /api/merchello/checkout/post-purchase/{invoiceId}`
  - `POST /api/merchello/checkout/post-purchase/{invoiceId}/preview`
  - `POST /api/merchello/checkout/post-purchase/{invoiceId}/add`
  - `POST /api/merchello/checkout/post-purchase/{invoiceId}/skip`
- All routes require a valid confirmation-token cookie matching the invoice ID.

**Current Add-to-Order flow (`PostPurchaseUpsellService.AddToOrderAsync`):**
1. Validate post-purchase window and saved-method ownership.
2. Build invoice edit request and preview delta amount.
3. Charge saved method (`ISavedPaymentMethodService.ChargeAsync`).
4. Record payment (`IPaymentService.RecordPaymentAsync`) before applying invoice edits.
5. If recording fails, fail closed and release fulfillment hold.
6. If recording succeeds, apply invoice edits and release hold.
7. Emit upsell conversion analytics.

This sequence guarantees ledger correctness first, then order mutation.
