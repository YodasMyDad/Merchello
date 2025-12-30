using System;
using System.Collections.Generic;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Request model for processing a payment after customer interaction.
/// Contains the result from redirect, SDK tokenization, or form submission.
/// </summary>
/// <remarks>
/// <para><b>Which field to use per integration type:</b></para>
/// <list type="table">
///   <listheader>
///     <term>Integration Type</term>
///     <description>Field to Use</description>
///   </listheader>
///   <item>
///     <term>Redirect</term>
///     <description><see cref="RedirectParams"/> - Query string parameters from the provider's return URL</description>
///   </item>
///   <item>
///     <term>HostedFields</term>
///     <description><see cref="PaymentMethodToken"/> - Token/nonce from SDK tokenization (e.g., Stripe PaymentIntent confirmation, Braintree nonce)</description>
///   </item>
///   <item>
///     <term>Widget</term>
///     <description><see cref="AuthorizationToken"/> - Authorization token from widget callback (e.g., Klarna, PayPal order ID)</description>
///   </item>
///   <item>
///     <term>DirectForm</term>
///     <description><see cref="FormData"/> - Key-value pairs matching CheckoutFormField.Key from the session</description>
///   </item>
/// </list>
/// </remarks>
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
    /// The payment method alias (e.g., "cards", "cards-elements", "applepay").
    /// Used by providers that support multiple methods to route to the correct flow.
    /// </summary>
    public string? MethodAlias { get; init; }

    /// <summary>
    /// Session ID from CreatePaymentSessionAsync.
    /// </summary>
    public string? SessionId { get; init; }

    /// <summary>
    /// The amount being paid (for validation).
    /// </summary>
    public decimal? Amount { get; init; }

    // =====================================================
    // Integration Type: Redirect
    // =====================================================

    /// <summary>
    /// Query parameters from the payment provider's return URL.
    /// <para><b>Use for:</b> Redirect integration type (e.g., Stripe Checkout, PayPal redirect).</para>
    /// <para>Contains provider-specific parameters like session_id, payment_intent, token, etc.</para>
    /// </summary>
    public Dictionary<string, string>? RedirectParams { get; init; }

    // =====================================================
    // Integration Type: HostedFields
    // =====================================================

    /// <summary>
    /// Payment method token/nonce from the JavaScript SDK tokenization.
    /// <para><b>Use for:</b> HostedFields integration type (e.g., Stripe Elements, Braintree Hosted Fields).</para>
    /// <para>Examples: Stripe PaymentIntent ID after confirmation, Braintree payment method nonce.</para>
    /// </summary>
    public string? PaymentMethodToken { get; init; }

    // =====================================================
    // Integration Type: Widget
    // =====================================================

    /// <summary>
    /// Authorization token from the provider's embedded widget callback.
    /// <para><b>Use for:</b> Widget integration type (e.g., PayPal button, Klarna widget, Apple Pay).</para>
    /// <para>Examples: PayPal order ID, Klarna authorization token.</para>
    /// </summary>
    public string? AuthorizationToken { get; init; }

    // =====================================================
    // Integration Type: DirectForm
    // =====================================================

    /// <summary>
    /// Form field values submitted by the customer.
    /// <para><b>Use for:</b> DirectForm integration type (e.g., Manual Payment, custom forms).</para>
    /// <para>Keys must match the <c>CheckoutFormField.Key</c> values returned in the session.</para>
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

    /// <summary>
    /// Whether this is a test payment (from backoffice testing).
    /// When true, providers may skip certain validation or features
    /// that require production configuration (e.g., custom fields).
    /// </summary>
    public bool IsTestMode { get; init; }
}
