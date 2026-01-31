using Amazon.Pay.API;
using Amazon.Pay.API.Types;
using Amazon.Pay.API.WebStore;
using Amazon.Pay.API.WebStore.Charge;
using Amazon.Pay.API.WebStore.CheckoutSession;
using Amazon.Pay.API.WebStore.Types;
using AmazonEnvironment = Amazon.Pay.API.Types.Environment;
using Merchello.Core.Accounting.Services.Interfaces;
using MerchelloAddress = Merchello.Core.Locality.Models.Address;
using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Payments.Providers.AmazonPay;

/// <summary>
/// Amazon Pay payment provider using the Amazon Pay API v2 (Checkout Session).
/// Implements a redirect-based end-of-checkout flow.
/// </summary>
/// <remarks>
/// Configuration required:
/// - publicKeyId: Amazon Pay public key ID
/// - privateKey: Amazon Pay private key (PEM)
/// - storeId: Amazon Pay store ID
/// - region: Region (NA/EU/JP)
/// </remarks>
public class AmazonPayPaymentProvider(
    IInvoiceService invoiceService,
    ILogger<AmazonPayPaymentProvider> logger) : PaymentProviderBase
{
    private readonly IInvoiceService _invoiceService = invoiceService;
    private readonly ILogger<AmazonPayPaymentProvider> _logger = logger;

    private WebStoreClient? _client;
    private string? _publicKeyId;
    private string? _privateKey;
    private string? _storeId;
    private Region _region = Region.UnitedStates;

    private const string ProviderAlias = "amazonpay";
    private const string MethodAlias = "amazonpay";

    /// <summary>
    /// SVG icon for Amazon Pay (Amazon smile logo).
    /// </summary>
    private const string AmazonPayIconSvg = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705a.657.657 0 01-.745.074c-1.047-.87-1.235-1.272-1.812-2.101-1.729 1.764-2.953 2.29-5.191 2.29-2.652 0-4.714-1.636-4.714-4.91 0-2.558 1.386-4.297 3.358-5.148 1.71-.752 4.099-.886 5.922-1.094v-.41c0-.752.058-1.643-.383-2.294-.385-.578-1.124-.816-1.774-.816-1.205 0-2.277.618-2.539 1.897-.054.283-.263.562-.551.576l-3.083-.333c-.26-.057-.548-.266-.473-.66C5.89 1.96 8.585.75 11.021.75c1.246 0 2.876.331 3.858 1.275 1.247 1.163 1.127 2.713 1.127 4.404v3.989c0 1.199.498 1.726.966 2.374.164.232.201.51-.009.681-.525.436-1.456 1.249-1.968 1.704l-.15.118z" fill="#FF9900"/><path d="M21.533 18.504c-2.055 1.544-5.034 2.367-7.598 2.367-3.595 0-6.835-1.33-9.282-3.547-.193-.174-.021-.413.21-.277 2.643 1.54 5.913 2.465 9.289 2.465 2.279 0 4.782-.472 7.088-1.452.347-.147.64.229.293.444z" fill="#FF9900"/><path d="M22.375 17.541c-.262-.338-1.74-.159-2.403-.08-.201.024-.232-.152-.051-.28 1.176-.828 3.106-.589 3.332-.312.227.279-.059 2.21-1.162 3.131-.17.142-.332.066-.256-.12.249-.618.805-2.001.54-2.339z" fill="#FF9900"/></svg>""";

    /// <inheritdoc />
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = ProviderAlias,
        DisplayName = "Amazon Pay",
        Icon = "icon-amazon",
        IconHtml = AmazonPayIconSvg,
        Description = "Accept payments via Amazon Pay using the buyer's Amazon account.",
        SupportsRefunds = false,
        SupportsPartialRefunds = false,
        SupportsAuthAndCapture = false,
        RequiresWebhook = false,
        SupportsPaymentLinks = false,
        SupportsVaultedPayments = false,
        RequiresProviderCustomerId = false,
        SetupInstructions = """
            ## Amazon Pay Setup Instructions

            ### 1. Create an Amazon Pay Merchant Account
            1. Sign up at the Amazon Pay developer portal
            2. Create a new web store in your Amazon Pay account

            ### 2. Generate API Keys
            1. In your Amazon Pay account, generate a **Public Key ID** and **Private Key**
            2. Copy the **Store ID** for your web store

            ### 3. Configure Merchello
            1. Enter your Public Key ID, Private Key (PEM), Store ID, and Region
            2. Enable **Test Mode** for Sandbox credentials
            3. Use Production credentials when ready to go live

            ### 4. Return URL
            Ensure your Amazon Pay web store allows the following return URL:
            ```
            https://your-site.com/checkout/return
            ```
            """
    };

    /// <inheritdoc />
    public override IReadOnlyList<PaymentMethodDefinition> GetAvailablePaymentMethods() =>
    [
        new PaymentMethodDefinition
        {
            Alias = MethodAlias,
            DisplayName = "Amazon Pay",
            Icon = "icon-amazon",
            IconHtml = AmazonPayIconSvg,
            CheckoutIconHtml = """<svg class="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705a.657.657 0 01-.745.074c-1.047-.87-1.235-1.272-1.812-2.101-1.729 1.764-2.953 2.29-5.191 2.29-2.652 0-4.714-1.636-4.714-4.91 0-2.558 1.386-4.297 3.358-5.148 1.71-.752 4.099-.886 5.922-1.094v-.41c0-.752.058-1.643-.383-2.294-.385-.578-1.124-.816-1.774-.816-1.205 0-2.277.618-2.539 1.897-.054.283-.263.562-.551.576l-3.083-.333c-.26-.057-.548-.266-.473-.66C5.89 1.96 8.585.75 11.021.75c1.246 0 2.876.331 3.858 1.275 1.247 1.163 1.127 2.713 1.127 4.404v3.989c0 1.199.498 1.726.966 2.374.164.232.201.51-.009.681-.525.436-1.456 1.249-1.968 1.704l-.15.118z" fill="#FF9900"/><path d="M21.533 18.504c-2.055 1.544-5.034 2.367-7.598 2.367-3.595 0-6.835-1.33-9.282-3.547-.193-.174-.021-.413.21-.277 2.643 1.54 5.913 2.465 9.289 2.465 2.279 0 4.782-.472 7.088-1.452.347-.147.64.229.293.444z" fill="#FF9900"/><path d="M22.375 17.541c-.262-.338-1.74-.159-2.403-.08-.201.024-.232-.152-.051-.28 1.176-.828 3.106-.589 3.332-.312.227.279-.059 2.21-1.162 3.131-.17.142-.332.066-.256-.12.249-.618.805-2.001.54-2.339z" fill="#FF9900"/></svg>""",
            Description = "Pay securely using your Amazon account.",
            IntegrationType = PaymentIntegrationType.Redirect,
            IsExpressCheckout = false,
            DefaultSortOrder = 50,
            MethodType = PaymentMethodTypes.AmazonPay
        }
    ];

    /// <inheritdoc />
    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new()
            {
                Key = "publicKeyId",
                Label = "Public Key ID",
                Description = "Amazon Pay Public Key ID",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "LIVE-...."
            },
            new()
            {
                Key = "privateKey",
                Label = "Private Key (PEM)",
                Description = "Amazon Pay Private Key in PEM format",
                FieldType = ConfigurationFieldType.Textarea,
                IsSensitive = true,
                IsRequired = true,
                Placeholder = "-----BEGIN PRIVATE KEY-----"
            },
            new()
            {
                Key = "storeId",
                Label = "Store ID",
                Description = "Amazon Pay Store ID",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "amzn1.application-oa2-client..."
            },
            new()
            {
                Key = "region",
                Label = "Region",
                Description = "Amazon Pay region for your merchant account",
                FieldType = ConfigurationFieldType.Select,
                IsRequired = true,
                DefaultValue = "NA",
                Options =
                [
                    new SelectOption { Value = "NA", Label = "North America" },
                    new SelectOption { Value = "EU", Label = "Europe" },
                    new SelectOption { Value = "JP", Label = "Japan" }
                ]
            }
        ]);
    }

    /// <inheritdoc />
    public override async ValueTask ConfigureAsync(
        PaymentProviderConfiguration? configuration,
        CancellationToken cancellationToken = default)
    {
        await base.ConfigureAsync(configuration, cancellationToken);

        _publicKeyId = configuration?.GetValue("publicKeyId");
        _privateKey = NormalizePrivateKey(configuration?.GetValue("privateKey"));
        _storeId = configuration?.GetValue("storeId");
        _region = ParseRegion(configuration?.GetValue("region"));

        if (!string.IsNullOrEmpty(_publicKeyId) && !string.IsNullOrEmpty(_privateKey))
        {
            var apiConfig = new ApiConfiguration(
                environment: IsTestMode ? AmazonEnvironment.Sandbox : AmazonEnvironment.Live,
                publicKeyId: _publicKeyId,
                privateKey: _privateKey,
                region: _region,
                algorithm: AmazonSignatureAlgorithm.V2);

            _client = new WebStoreClient(apiConfig);
        }
    }

    /// <summary>
    /// Whether the provider is configured in test mode.
    /// </summary>
    public bool IsTestMode => Configuration?.IsTestMode ?? true;

    // =====================================================
    // Payment Flow
    // =====================================================

    /// <inheritdoc />
    public override async Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null || string.IsNullOrEmpty(_storeId))
        {
            return PaymentSessionResult.Failed("Amazon Pay is not configured. Please add your API credentials.");
        }

        try
        {
            var returnUrl = BuildReturnUrl(request.ReturnUrl, request.InvoiceId, ProviderAlias, MethodAlias);
            var cancelUrl = BuildReturnUrl(request.CancelUrl, request.InvoiceId, ProviderAlias, MethodAlias);

            var createRequest = new CreateCheckoutSessionRequest(returnUrl, _storeId);
            createRequest.WebCheckoutDetails.CheckoutMode = CheckoutMode.ProcessOrder;
            createRequest.WebCheckoutDetails.CheckoutResultReturnUrl = returnUrl;
            createRequest.WebCheckoutDetails.CheckoutCancelUrl = cancelUrl;

            if (!TryParseCurrency(request.Currency, out var currency))
            {
                return PaymentSessionResult.Failed($"Unsupported currency for Amazon Pay: {request.Currency}");
            }

            createRequest.PaymentDetails.PaymentIntent = PaymentIntent.AuthorizeWithCapture;
            createRequest.PaymentDetails.PresentmentCurrency = currency;
            createRequest.PaymentDetails.EstimateOrderTotal = new Price(request.Amount, currency);

            var invoice = await _invoiceService.GetInvoiceAsync(request.InvoiceId, cancellationToken);
            var address = invoice?.ShippingAddress ?? invoice?.BillingAddress;
            if (address != null && IsAddressUsable(address))
            {
                ApplyAddressDetails(createRequest.AddressDetails, address);
            }

            createRequest.MerchantMetadata.MerchantReferenceId = request.InvoiceId.ToString();
            createRequest.MerchantMetadata.NoteToBuyer = request.Description;

            var response = _client.CreateCheckoutSession(createRequest);
            if (!response.Success)
            {
                return PaymentSessionResult.Failed("Failed to create Amazon Pay checkout session.");
            }

            var redirectUrl = response.WebCheckoutDetails?.AmazonPayRedirectUrl;

            // Amazon Pay returns redirect URL after all mandatory parameters are set.
            if (string.IsNullOrWhiteSpace(redirectUrl))
            {
                var updateRequest = new UpdateCheckoutSessionRequest();
                updateRequest.WebCheckoutDetails.CheckoutMode = CheckoutMode.ProcessOrder;
                updateRequest.WebCheckoutDetails.CheckoutResultReturnUrl = returnUrl;
                updateRequest.WebCheckoutDetails.CheckoutCancelUrl = cancelUrl;
                updateRequest.PaymentDetails.PaymentIntent = PaymentIntent.AuthorizeWithCapture;
                updateRequest.PaymentDetails.PresentmentCurrency = currency;
                updateRequest.PaymentDetails.EstimateOrderTotal = new Price(request.Amount, currency);
                updateRequest.MerchantMetadata.MerchantReferenceId = request.InvoiceId.ToString();
                updateRequest.MerchantMetadata.NoteToBuyer = request.Description;

                var updateResponse = _client.UpdateCheckoutSession(
                    response.CheckoutSessionId ?? string.Empty,
                    updateRequest);

                if (!updateResponse.Success)
                {
                    return PaymentSessionResult.Failed("Failed to update Amazon Pay checkout session.");
                }

                redirectUrl = updateResponse.WebCheckoutDetails?.AmazonPayRedirectUrl;
            }

            if (string.IsNullOrWhiteSpace(redirectUrl))
            {
                return PaymentSessionResult.Failed(
                    "Amazon Pay did not return a redirect URL. Check required fields (address, amount, return URL).");
            }

            return PaymentSessionResult.Redirect(redirectUrl, response.CheckoutSessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Amazon Pay payment session creation failed for invoice {InvoiceId}", request.InvoiceId);
            return PaymentSessionResult.Failed($"Amazon Pay error: {ex.Message}");
        }
    }

    /// <inheritdoc />
    public override async Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_client is null)
        {
            return PaymentResult.Failed("Amazon Pay is not configured.");
        }

        var checkoutSessionId = request.SessionId;
        if (string.IsNullOrWhiteSpace(checkoutSessionId))
        {
            checkoutSessionId = request.RedirectParams?.GetValueOrDefault("checkoutSessionId")
                ?? request.RedirectParams?.GetValueOrDefault("amazonCheckoutSessionId");
        }

        if (string.IsNullOrWhiteSpace(checkoutSessionId))
        {
            return PaymentResult.Failed("Amazon Pay checkout session ID is required.");
        }

        if (!TryParseCurrency(request.CurrencyCode, out var currency))
        {
            return PaymentResult.Failed($"Unsupported currency for Amazon Pay: {request.CurrencyCode}");
        }

        var amount = request.Amount ?? 0;
        if (amount <= 0)
        {
            return PaymentResult.Failed("Payment amount is required.");
        }

        try
        {
            var completeRequest = new CompleteCheckoutSessionRequest(amount, currency);
            var completeResponse = _client.CompleteCheckoutSession(checkoutSessionId, completeRequest);

            if (!completeResponse.Success)
            {
                return PaymentResult.Failed("Failed to complete Amazon Pay checkout session.");
            }

            var chargePermissionId = completeResponse.ChargePermissionId;
            if (string.IsNullOrWhiteSpace(chargePermissionId))
            {
                return PaymentResult.Failed("Amazon Pay did not return a charge permission ID.");
            }

            var chargeRequest = new CreateChargeRequest(chargePermissionId, amount, currency)
            {
                CaptureNow = true
            };

            var chargeResponse = _client.CreateCharge(chargeRequest);
            if (!chargeResponse.Success)
            {
                return PaymentResult.Failed("Amazon Pay charge failed.");
            }

            var status = chargeResponse.StatusDetails?.State?.ToLowerInvariant();
            var transactionId = chargeResponse.ChargeId ?? checkoutSessionId;

            return status switch
            {
                "captured" => PaymentResult.Completed(transactionId, amount),
                "authorized" => PaymentResult.Authorized(transactionId, amount),
                "pending" or "authorizationinitiated" => PaymentResult.Pending(transactionId, amount),
                "declined" or "canceled" or "cancelled" => PaymentResult.Failed("Amazon Pay declined the charge."),
                _ => PaymentResult.Pending(transactionId, amount)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Amazon Pay payment processing failed for invoice {InvoiceId}", request.InvoiceId);
            return PaymentResult.Failed($"Amazon Pay error: {ex.Message}");
        }
    }

    // =====================================================
    // Helpers
    // =====================================================

    private static string BuildReturnUrl(string url, Guid invoiceId, string providerAlias, string methodAlias)
    {
        var query = new Dictionary<string, string>
        {
            ["invoiceId"] = invoiceId.ToString(),
            ["provider"] = providerAlias,
            ["methodAlias"] = methodAlias
        };

        return AppendQuery(url, query);
    }

    private static string AppendQuery(string url, IDictionary<string, string> parameters)
    {
        if (string.IsNullOrWhiteSpace(url) || parameters.Count == 0)
        {
            return url;
        }

        var separator = url.Contains('?') ? "&" : "?";
        var query = string.Join("&", parameters
            .Where(kvp => !string.IsNullOrWhiteSpace(kvp.Value))
            .Select(kvp => $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value)}"));

        return url + separator + query;
    }

    private static void ApplyAddressDetails(AddressDetails target, MerchelloAddress address)
    {
        target.Name = address.Name;
        target.AddressLine1 = address.AddressOne;
        target.AddressLine2 = address.AddressTwo;
        target.AddressLine3 = address.Company;
        target.City = address.TownCity;
        target.StateOrRegion = !string.IsNullOrWhiteSpace(address.CountyState?.RegionCode)
            ? address.CountyState.RegionCode
            : address.CountyState?.Name;
        target.PostalCode = address.PostalCode;
        target.CountryCode = address.CountryCode;
        target.PhoneNumber = address.Phone;
    }

    private static bool IsAddressUsable(MerchelloAddress address)
    {
        return !string.IsNullOrWhiteSpace(address.AddressOne) &&
               !string.IsNullOrWhiteSpace(address.TownCity) &&
               !string.IsNullOrWhiteSpace(address.PostalCode) &&
               !string.IsNullOrWhiteSpace(address.CountryCode);
    }

    private static Region ParseRegion(string? value)
    {
        return value?.Trim().ToUpperInvariant() switch
        {
            "EU" or "EUROPE" => Region.Europe,
            "JP" or "JAPAN" => Region.Japan,
            "US" or "USA" or "NA" or "NORTHAMERICA" or "NORTH_AMERICA" => Region.UnitedStates,
            _ => Region.UnitedStates
        };
    }

    private static string? NormalizePrivateKey(string? privateKey)
    {
        if (string.IsNullOrWhiteSpace(privateKey))
        {
            return privateKey;
        }

        // Support keys pasted with literal \n sequences
        if (privateKey.Contains("\\n", StringComparison.Ordinal) && !privateKey.Contains('\n'))
        {
            return privateKey.Replace("\\n", "\n", StringComparison.Ordinal);
        }

        return privateKey;
    }

    private static bool TryParseCurrency(string? currencyCode, out Currency currency)
    {
        if (!string.IsNullOrWhiteSpace(currencyCode) &&
            Enum.TryParse(currencyCode, true, out Currency parsed))
        {
            currency = parsed;
            return true;
        }

        currency = default;
        return false;
    }

}
