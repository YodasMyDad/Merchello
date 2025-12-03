# Payment Provider System - Architecture

## Overview

Pluggable payment provider system allowing third-party providers (Stripe, PayPal, Braintree, etc.) as NuGet packages, auto-discovered and configurable via backoffice.

## Architecture

| Layer | Components |
|-------|------------|
| **Providers** | `IPaymentProvider` implementations (NuGet packages) |
| **Manager** | `PaymentProviderManager` - discovery via `ExtensionManager`, config loading, lifecycle |
| **Service** | `PaymentService` - orchestrates payments, refunds, status |
| **Storage** | `merchelloPaymentProviders` (config), `merchelloPayments` (transactions) |

## Key Interfaces

| Interface/Class | Location |
|-----------------|----------|
| `IPaymentProvider` | [IPaymentProvider.cs](../src/Merchello.Core/Payments/Providers/IPaymentProvider.cs) |
| `PaymentProviderBase` | [PaymentProviderBase.cs](../src/Merchello.Core/Payments/Providers/PaymentProviderBase.cs) |
| `PaymentProviderMetadata` | [PaymentProviderMetadata.cs](../src/Merchello.Core/Payments/Providers/PaymentProviderMetadata.cs) |
| `IPaymentService` | [IPaymentService.cs](../src/Merchello.Core/Payments/Services/IPaymentService.cs) |
| `PaymentService` | [PaymentService.cs](../src/Merchello.Core/Payments/Services/PaymentService.cs) |

## Key Models

| Model | Location |
|-------|----------|
| `PaymentSessionResult` | [PaymentSessionResult.cs](../src/Merchello.Core/Payments/Models/PaymentSessionResult.cs) |
| `ProcessPaymentRequest` | [ProcessPaymentRequest.cs](../src/Merchello.Core/Payments/Models/ProcessPaymentRequest.cs) |
| `PaymentResult` | [PaymentResult.cs](../src/Merchello.Core/Payments/Models/PaymentResult.cs) |
| `CheckoutFormField` | [CheckoutFormField.cs](../src/Merchello.Core/Payments/Models/CheckoutFormField.cs) |
| `PaymentIntegrationType` | [PaymentIntegrationType.cs](../src/Merchello.Core/Payments/Models/PaymentIntegrationType.cs) |

## Design Decisions

### Provider Discovery
- Uses `ExtensionManager` for assembly scanning (same as `IShippingProvider`)
- Providers define immutable `Alias` on class
- Auto-discovered - no manual DI registration

### Configuration Storage
- Settings (API keys, secrets) stored as JSON in `Configuration` column
- Each provider defines fields via `GetConfigurationFieldsAsync()`

### Refunds
- Stored as `Payment` records with negative `Amount`
- `PaymentType` enum: `Payment`, `Refund`, `PartialRefund`
- `ParentPaymentId` links refund to original

### Webhooks
- Custom `PaymentWebhookController` at `/umbraco/merchello/webhooks/payments/{alias}`
- Each provider validates own signatures
- Idempotency via `TransactionId` uniqueness

### Invoice Status
- `InvoicePaymentStatus`: `Unpaid`, `AwaitingPayment`, `PartiallyPaid`, `Paid`, `Refunded`, `PartiallyRefunded`
- Calculated from Payment records

## Integration Types

| Type | Value | Examples | Flow |
|------|-------|----------|------|
| `Redirect` | 0 | Stripe Checkout, PayPal | Customer → external page |
| `HostedFields` | 10 | Braintree, Stripe Elements | iframes on checkout |
| `Widget` | 20 | Klarna, PayPal Buttons | Embedded provider UI |
| `DirectForm` | 30 | PO, Manual Payment | Custom form fields |

## Session Flow

```
1. CreatePaymentSessionAsync() → Returns RedirectUrl/ClientToken/FormFields
2. Customer interaction (based on IntegrationType)
3. ProcessPaymentAsync() → Process result
4. (Optional) Webhook confirms async payments
```

## Database Schema

**merchelloPaymentProviders**
- `Id` (Guid), `ProviderAlias`, `DisplayName`, `IsEnabled`, `Configuration` (JSON), `SortOrder`, timestamps

**merchelloPayments** (additions)
- `PaymentProviderAlias`, `PaymentType` (enum), `RefundReason`, `ParentPaymentId` (Guid?)

## File Structure

```
src/Merchello.Core/Payments/
├── Providers/
│   ├── IPaymentProvider.cs
│   ├── PaymentProviderBase.cs
│   ├── PaymentProviderMetadata.cs
│   ├── PaymentProviderConfigurationField.cs
│   ├── PaymentProviderConfiguration.cs
│   ├── IPaymentProviderManager.cs
│   ├── PaymentProviderManager.cs
│   └── ManualPaymentProvider.cs
├── Models/
│   ├── PaymentType.cs
│   ├── PaymentIntegrationType.cs
│   ├── InvoicePaymentStatus.cs
│   ├── PaymentProviderSetting.cs
│   ├── PaymentRequest.cs
│   ├── PaymentSessionResult.cs
│   ├── ProcessPaymentRequest.cs
│   ├── PaymentResult.cs
│   ├── CheckoutFormField.cs
│   ├── RefundRequest.cs
│   ├── RefundResult.cs
│   └── WebhookProcessingResult.cs
├── Services/
│   ├── IPaymentService.cs
│   └── PaymentService.cs
└── Mapping/
    └── PaymentProviderSettingDbMapping.cs

src/Merchello/Controllers/
├── PaymentProvidersApiController.cs
├── PaymentsApiController.cs
├── PaymentWebhookController.cs
├── CheckoutPaymentsApiController.cs
└── Dtos/
    ├── PaymentProviderDtos.cs
    └── PaymentDtos.cs
```

## Testing Checklist

- [x] Provider discovery finds all `IPaymentProvider` implementations
- [x] Provider configuration saves/loads correctly
- [x] Payment session creation returns correct data per integration type
- [x] Redirect flow works end-to-end
- [ ] Webhook signature validation
- [ ] Webhook processing updates status
- [x] Refunds create negative payment records
- [x] Partial refunds calculate correctly
- [x] Invoice payment status calculates correctly
- [x] Manual payment recording works
- [x] Provider enable/disable/ordering works
