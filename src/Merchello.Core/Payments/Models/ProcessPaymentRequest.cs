using System;
using System.Collections.Generic;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Request model for processing a payment after customer interaction.
/// Contains the result from redirect, SDK tokenization, or form submission.
/// </summary>
public class ProcessPaymentRequest
{
    /// <summary>
    /// The invoice ID this payment is for.
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The payment provider alias.
    /// </summary>
    public required string ProviderAlias { get; init; }

    /// <summary>
    /// Session ID from CreatePaymentSessionAsync.
    /// </summary>
    public string? SessionId { get; init; }

    /// <summary>
    /// The amount being paid (for validation).
    /// </summary>
    public decimal? Amount { get; init; }

    // =====================================================
    // For Redirect - query params from return URL
    // =====================================================

    /// <summary>
    /// Query parameters from the payment provider's return URL.
    /// Used by redirect-based providers to validate and complete payment.
    /// </summary>
    public Dictionary<string, string>? RedirectParams { get; init; }

    // =====================================================
    // For HostedFields / Widget - tokens from SDK
    // =====================================================

    /// <summary>
    /// Payment method token/nonce from the JavaScript SDK.
    /// Used by Braintree, Stripe Elements, etc.
    /// </summary>
    public string? PaymentMethodToken { get; init; }

    /// <summary>
    /// Authorization token from the provider's widget.
    /// Used by Klarna and similar providers.
    /// </summary>
    public string? AuthorizationToken { get; init; }

    // =====================================================
    // For DirectForm - form field values
    // =====================================================

    /// <summary>
    /// Form field values submitted by the customer.
    /// Keys match the CheckoutFormField.Key values from the session.
    /// </summary>
    public Dictionary<string, string>? FormData { get; init; }

    // =====================================================
    // Additional context
    // =====================================================

    /// <summary>
    /// Customer email address.
    /// </summary>
    public string? CustomerEmail { get; init; }

    /// <summary>
    /// Customer name.
    /// </summary>
    public string? CustomerName { get; init; }

    /// <summary>
    /// Additional metadata.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; init; }
}
