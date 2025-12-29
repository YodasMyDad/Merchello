using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// Public API controller for frontend checkout payment operations
/// </summary>
[ApiController]
[Route("api/merchello/checkout")]
[AllowAnonymous]
public class CheckoutPaymentsApiController(
    IPaymentProviderManager providerManager,
    IPaymentService paymentService,
    IInvoiceService invoiceService,
    ICheckoutService checkoutService,
    ICheckoutSessionService checkoutSessionService,
    IOptions<MerchelloSettings> merchelloSettings,
    ILogger<CheckoutPaymentsApiController> logger) : ControllerBase
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;

    /// <summary>
    /// Get available payment methods for checkout.
    /// Only returns methods where ShowInCheckout is true (excludes backoffice-only methods like Manual Payment).
    /// </summary>
    [HttpGet("payment-methods")]
    [ProducesResponseType<IReadOnlyCollection<PaymentMethodDto>>(StatusCodes.Status200OK)]
    public async Task<IReadOnlyCollection<PaymentMethodDto>> GetPaymentMethods(CancellationToken cancellationToken = default)
    {
        return await providerManager.GetCheckoutPaymentMethodsAsync(cancellationToken);
    }

    /// <summary>
    /// Create a payment session for an invoice
    /// </summary>
    [HttpPost("{invoiceId:guid}/pay")]
    [ProducesResponseType<PaymentSessionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreatePaymentSession(
        Guid invoiceId,
        [FromBody] InitiatePaymentDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderAlias))
        {
            return BadRequest("ProviderAlias is required.");
        }

        if (string.IsNullOrWhiteSpace(request.ReturnUrl))
        {
            return BadRequest("ReturnUrl is required.");
        }

        if (string.IsNullOrWhiteSpace(request.CancelUrl))
        {
            return BadRequest("CancelUrl is required.");
        }

        // Fetch invoice and validate ownership
        var invoice = await invoiceService.GetInvoiceAsync(invoiceId, cancellationToken);

        if (invoice == null)
        {
            return NotFound("Invoice not found.");
        }

        // Validate that the current checkout session owns this invoice
        // This prevents users from paying invoices that don't belong to them
        var currentBasket = await checkoutService.GetBasket(
            new GetBasketParameters(),
            cancellationToken);

        if (currentBasket == null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "No active checkout session.");
        }

        var session = await checkoutSessionService.GetSessionAsync(currentBasket.Id, cancellationToken);

        // Validate ownership by comparing billing email
        // The invoice was created with the billing email from checkout, so they must match
        if (string.IsNullOrEmpty(session.BillingAddress.Email) ||
            !string.Equals(session.BillingAddress.Email, invoice.BillingAddress.Email, StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(
                "Invoice ownership validation failed: Invoice {InvoiceId} has billing email {InvoiceBillingEmail}, but session has {SessionBillingEmail}",
                invoiceId,
                invoice.BillingAddress.Email,
                session.BillingAddress.Email);

            return StatusCode(StatusCodes.Status403Forbidden, "You do not have permission to pay this invoice.");
        }

        // Verify provider is enabled
        var provider = await providerManager.GetProviderAsync(
            request.ProviderAlias,
            requireEnabled: true,
            cancellationToken);

        if (provider == null)
        {
            return BadRequest($"Payment provider '{request.ProviderAlias}' is not available.");
        }

        // Create payment session
        var result = await paymentService.CreatePaymentSessionAsync(
            new CreatePaymentSessionParameters
            {
                InvoiceId = invoiceId,
                ProviderAlias = request.ProviderAlias,
                MethodAlias = request.MethodAlias,
                ReturnUrl = request.ReturnUrl,
                CancelUrl = request.CancelUrl
            },
            cancellationToken);

        var response = new PaymentSessionResultDto
        {
            Success = result.Success,
            InvoiceId = invoiceId,
            SessionId = result.SessionId,
            IntegrationType = result.IntegrationType,
            RedirectUrl = result.RedirectUrl,
            ClientToken = result.ClientToken,
            ClientSecret = result.ClientSecret,
            JavaScriptSdkUrl = result.JavaScriptSdkUrl,
            SdkConfiguration = result.SdkConfiguration,
            AdapterUrl = result.AdapterUrl,
            ProviderAlias = result.ProviderAlias,
            MethodAlias = result.MethodAlias,
            FormFields = result.FormFields?.Select(f => new CheckoutFormFieldDto
            {
                Key = f.Key,
                Label = f.Label,
                Description = f.Description,
                FieldType = f.FieldType.ToString(),
                IsRequired = f.IsRequired,
                DefaultValue = f.DefaultValue,
                Placeholder = f.Placeholder,
                ValidationPattern = f.ValidationPattern,
                ValidationMessage = f.ValidationMessage,
                Options = f.Options?.Select(o => new SelectOptionDto
                {
                    Value = o.Value,
                    Label = o.Label
                }).ToList()
            }).ToList(),
            ErrorMessage = result.ErrorMessage
        };

        if (!result.Success)
        {
            logger.LogWarning(
                "Payment session creation failed for invoice {InvoiceId} with provider {Provider}: {Error}",
                invoiceId,
                request.ProviderAlias,
                result.ErrorMessage);
        }
        else
        {
            logger.LogInformation(
                "Payment session created for invoice {InvoiceId} with provider {Provider}, SessionId: {SessionId}",
                invoiceId,
                request.ProviderAlias,
                result.SessionId);
        }

        return Ok(response);
    }

    /// <summary>
    /// Handle return from payment gateway after successful payment
    /// </summary>
    [HttpGet("return")]
    [ProducesResponseType<PaymentReturnResultDto>(StatusCodes.Status200OK)]
    public async Task<PaymentReturnResultDto> HandleReturn(
        [FromQuery] PaymentReturnQueryDto query,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Payment return received: InvoiceId={InvoiceId}, TransactionId={TransactionId}, Provider={Provider}",
            query.InvoiceId,
            query.TransactionId,
            query.Provider);

        // If we have a transaction ID, check if payment was already recorded (via webhook)
        if (!string.IsNullOrEmpty(query.TransactionId))
        {
            var existingPayment = await paymentService.GetPaymentByTransactionIdAsync(
                query.TransactionId,
                cancellationToken);

            if (existingPayment != null)
            {
                return new PaymentReturnResultDto
                {
                    Success = existingPayment.PaymentSuccess,
                    Message = existingPayment.PaymentSuccess
                        ? "Payment completed successfully."
                        : "Payment was not successful.",
                    InvoiceId = existingPayment.InvoiceId,
                    PaymentId = existingPayment.Id
                };
            }
        }

        // Payment not yet recorded - it may be processed via webhook shortly
        // Return a pending status
        return new PaymentReturnResultDto
        {
            Success = true,
            Message = "Payment is being processed. Please wait for confirmation.",
            InvoiceId = query.InvoiceId
        };
    }

    /// <summary>
    /// Handle cancel from payment gateway
    /// </summary>
    [HttpGet("cancel")]
    [ProducesResponseType<PaymentReturnResultDto>(StatusCodes.Status200OK)]
    public Task<PaymentReturnResultDto> HandleCancel(
        [FromQuery] PaymentReturnQueryDto query,
        CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Payment cancelled: InvoiceId={InvoiceId}, TransactionId={TransactionId}, Provider={Provider}",
            query.InvoiceId,
            query.TransactionId,
            query.Provider);

        return Task.FromResult(new PaymentReturnResultDto
        {
            Success = false,
            Message = "Payment was cancelled.",
            InvoiceId = query.InvoiceId
        });
    }

    /// <summary>
    /// Initiate payment from checkout.
    /// Creates an invoice from the current basket, then creates a payment session.
    /// </summary>
    [HttpPost("pay")]
    [ProducesResponseType<PaymentSessionResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> InitiatePayment(
        [FromBody] InitiatePaymentDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderAlias))
        {
            return BadRequest(new PaymentSessionResultDto
            {
                Success = false,
                ErrorMessage = "ProviderAlias is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.ReturnUrl))
        {
            return BadRequest(new PaymentSessionResultDto
            {
                Success = false,
                ErrorMessage = "ReturnUrl is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.CancelUrl))
        {
            return BadRequest(new PaymentSessionResultDto
            {
                Success = false,
                ErrorMessage = "CancelUrl is required."
            });
        }

        // Get the current basket
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);

        if (basket == null || basket.LineItems.Count == 0)
        {
            return BadRequest(new PaymentSessionResultDto
            {
                Success = false,
                ErrorMessage = "No items in basket."
            });
        }

        // Get checkout session
        var session = await checkoutSessionService.GetSessionAsync(basket.Id, cancellationToken);

        // Validate checkout session has required data
        if (string.IsNullOrWhiteSpace(session.BillingAddress.Email))
        {
            return BadRequest(new PaymentSessionResultDto
            {
                Success = false,
                ErrorMessage = "Please complete the checkout information step first."
            });
        }

        // Verify provider is enabled
        var provider = await providerManager.GetProviderAsync(
            request.ProviderAlias,
            requireEnabled: true,
            cancellationToken);

        if (provider == null)
        {
            return BadRequest(new PaymentSessionResultDto
            {
                Success = false,
                ErrorMessage = $"Payment provider '{request.ProviderAlias}' is not available."
            });
        }

        // Create invoice from basket
        var invoice = await invoiceService.CreateOrderFromBasketAsync(basket, session, cancellationToken);

        logger.LogInformation(
            "Invoice {InvoiceId} created from basket {BasketId}",
            invoice.Id,
            basket.Id);

        // Create payment session
        var result = await paymentService.CreatePaymentSessionAsync(
            new CreatePaymentSessionParameters
            {
                InvoiceId = invoice.Id,
                ProviderAlias = request.ProviderAlias,
                MethodAlias = request.MethodAlias,
                ReturnUrl = request.ReturnUrl,
                CancelUrl = request.CancelUrl
            },
            cancellationToken);

        var response = new PaymentSessionResultDto
        {
            Success = result.Success,
            InvoiceId = invoice.Id,
            SessionId = result.SessionId,
            IntegrationType = result.IntegrationType,
            RedirectUrl = result.RedirectUrl,
            ClientToken = result.ClientToken,
            ClientSecret = result.ClientSecret,
            JavaScriptSdkUrl = result.JavaScriptSdkUrl,
            SdkConfiguration = result.SdkConfiguration,
            AdapterUrl = result.AdapterUrl,
            ProviderAlias = result.ProviderAlias,
            MethodAlias = result.MethodAlias,
            FormFields = result.FormFields?.Select(f => new CheckoutFormFieldDto
            {
                Key = f.Key,
                Label = f.Label,
                Description = f.Description,
                FieldType = f.FieldType.ToString(),
                IsRequired = f.IsRequired,
                DefaultValue = f.DefaultValue,
                Placeholder = f.Placeholder,
                ValidationPattern = f.ValidationPattern,
                ValidationMessage = f.ValidationMessage,
                Options = f.Options?.Select(o => new SelectOptionDto
                {
                    Value = o.Value,
                    Label = o.Label
                }).ToList()
            }).ToList(),
            ErrorMessage = result.ErrorMessage
        };

        if (!result.Success)
        {
            logger.LogWarning(
                "Payment session creation failed for invoice {InvoiceId} with provider {Provider}: {Error}",
                invoice.Id,
                request.ProviderAlias,
                result.ErrorMessage);
        }
        else
        {
            logger.LogInformation(
                "Payment session created for invoice {InvoiceId} with provider {Provider}, SessionId: {SessionId}",
                invoice.Id,
                request.ProviderAlias,
                result.SessionId);
        }

        return Ok(response);
    }

    /// <summary>
    /// Process a payment after client-side tokenization (e.g., Braintree Drop-in, Stripe Elements).
    /// Used for HostedFields integration type where the client obtains a payment method token/nonce.
    /// </summary>
    [HttpPost("process-payment")]
    [ProducesResponseType<ProcessPaymentResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ProcessPayment(
        [FromBody] ProcessPaymentDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ProviderAlias))
        {
            return BadRequest(new ProcessPaymentResultDto
            {
                Success = false,
                ErrorMessage = "ProviderAlias is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.PaymentMethodToken))
        {
            return BadRequest(new ProcessPaymentResultDto
            {
                Success = false,
                ErrorMessage = "PaymentMethodToken is required."
            });
        }

        // Get the invoice
        var invoice = await invoiceService.GetInvoiceAsync(request.InvoiceId, cancellationToken);

        if (invoice == null)
        {
            return NotFound(new ProcessPaymentResultDto
            {
                Success = false,
                ErrorMessage = "Invoice not found."
            });
        }

        // Validate that the current checkout session owns this invoice
        var currentBasket = await checkoutService.GetBasket(
            new GetBasketParameters(),
            cancellationToken);

        if (currentBasket == null)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new ProcessPaymentResultDto
            {
                Success = false,
                ErrorMessage = "No active checkout session."
            });
        }

        var session = await checkoutSessionService.GetSessionAsync(currentBasket.Id, cancellationToken);

        // Validate ownership by comparing billing email
        if (string.IsNullOrEmpty(session.BillingAddress.Email) ||
            !string.Equals(session.BillingAddress.Email, invoice.BillingAddress.Email, StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(
                "Invoice ownership validation failed in ProcessPayment: Invoice {InvoiceId} has billing email {InvoiceBillingEmail}, but session has {SessionBillingEmail}",
                request.InvoiceId,
                invoice.BillingAddress.Email,
                session.BillingAddress.Email);

            return StatusCode(StatusCodes.Status403Forbidden, new ProcessPaymentResultDto
            {
                Success = false,
                ErrorMessage = "You do not have permission to pay this invoice."
            });
        }

        // Verify provider is enabled
        var provider = await providerManager.GetProviderAsync(
            request.ProviderAlias,
            requireEnabled: true,
            cancellationToken);

        if (provider == null)
        {
            return BadRequest(new ProcessPaymentResultDto
            {
                Success = false,
                ErrorMessage = $"Payment provider '{request.ProviderAlias}' is not available."
            });
        }

        // Build the process payment request
        var processRequest = new ProcessPaymentRequest
        {
            InvoiceId = request.InvoiceId,
            ProviderAlias = request.ProviderAlias,
            PaymentMethodToken = request.PaymentMethodToken,
            Amount = invoice.Total,
            FormData = request.FormData
        };

        // Process the payment
        var result = await paymentService.ProcessPaymentAsync(processRequest, cancellationToken);

        if (!result.Successful || result.ResultObject == null)
        {
            var errorMessage = result.Messages
                .Where(m => m.ResultMessageType == Merchello.Core.Shared.Models.Enums.ResultMessageType.Error)
                .Select(m => m.Message)
                .FirstOrDefault() ?? "Payment processing failed.";

            logger.LogWarning(
                "Payment processing failed for invoice {InvoiceId} with provider {Provider}: {Error}",
                request.InvoiceId,
                request.ProviderAlias,
                errorMessage);

            return Ok(new ProcessPaymentResultDto
            {
                Success = false,
                InvoiceId = request.InvoiceId,
                ErrorMessage = errorMessage
            });
        }

        logger.LogInformation(
            "Payment processed successfully for invoice {InvoiceId} with provider {Provider}, PaymentId: {PaymentId}, TransactionId: {TransactionId}",
            request.InvoiceId,
            request.ProviderAlias,
            result.ResultObject.Id,
            result.ResultObject.TransactionId);

        return Ok(new ProcessPaymentResultDto
        {
            Success = true,
            InvoiceId = request.InvoiceId,
            PaymentId = result.ResultObject.Id,
            TransactionId = result.ResultObject.TransactionId,
            RedirectUrl = $"/checkout/confirmation/{request.InvoiceId}"
        });
    }

    // =====================================================
    // Express Checkout
    // =====================================================

    /// <summary>
    /// Get available express checkout methods (Apple Pay, Google Pay, PayPal, etc.).
    /// These methods appear at the start of checkout and collect customer data from the provider.
    /// </summary>
    [HttpGet("express-methods")]
    [ProducesResponseType<IReadOnlyCollection<ExpressCheckoutMethodDto>>(StatusCodes.Status200OK)]
    public async Task<IReadOnlyCollection<ExpressCheckoutMethodDto>> GetExpressCheckoutMethods(
        CancellationToken cancellationToken = default)
    {
        var methods = await providerManager.GetExpressCheckoutMethodsAsync(cancellationToken);

        return methods.Select(m => new ExpressCheckoutMethodDto
        {
            ProviderAlias = m.ProviderAlias,
            MethodAlias = m.MethodAlias,
            DisplayName = m.DisplayName,
            Icon = m.Icon,
            MethodType = m.MethodType,
            SortOrder = m.SortOrder
        }).ToList();
    }

    /// <summary>
    /// Process an express checkout payment.
    /// Creates an invoice from the basket, processes payment, and returns the result.
    /// </summary>
    [HttpPost("express")]
    [ProducesResponseType<ExpressCheckoutResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ProcessExpressCheckout(
        [FromBody] ExpressCheckoutRequestDto request,
        CancellationToken cancellationToken = default)
    {
        // Validate request
        if (string.IsNullOrWhiteSpace(request.ProviderAlias))
        {
            return BadRequest(new ExpressCheckoutResponseDto
            {
                Success = false,
                ErrorMessage = "ProviderAlias is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.PaymentToken))
        {
            return BadRequest(new ExpressCheckoutResponseDto
            {
                Success = false,
                ErrorMessage = "PaymentToken is required."
            });
        }

        if (request.CustomerData == null)
        {
            return BadRequest(new ExpressCheckoutResponseDto
            {
                Success = false,
                ErrorMessage = "CustomerData is required."
            });
        }

        // Get the current basket
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);

        if (basket == null || basket.LineItems.Count == 0)
        {
            return BadRequest(new ExpressCheckoutResponseDto
            {
                Success = false,
                ErrorMessage = "No items in basket."
            });
        }

        // Verify provider is enabled
        var provider = await providerManager.GetProviderAsync(
            request.ProviderAlias,
            requireEnabled: true,
            cancellationToken);

        if (provider == null)
        {
            return BadRequest(new ExpressCheckoutResponseDto
            {
                Success = false,
                ErrorMessage = $"Payment provider '{request.ProviderAlias}' is not available."
            });
        }

        try
        {
            // Convert express checkout customer data to checkout session addresses
            var billingAddress = MapExpressAddress(
                request.CustomerData.BillingAddress ?? request.CustomerData.ShippingAddress,
                request.CustomerData.Email,
                request.CustomerData.FullName,
                request.CustomerData.Phone);

            var shippingAddress = MapExpressAddress(
                request.CustomerData.ShippingAddress,
                request.CustomerData.Email,
                request.CustomerData.FullName,
                request.CustomerData.Phone);

            // Save addresses to checkout session
            var sameAsBilling = request.CustomerData.BillingAddress == null;
            await checkoutSessionService.SaveAddressesAsync(
                basket.Id,
                billingAddress,
                sameAsBilling ? null : shippingAddress,
                sameAsBilling,
                cancellationToken);

            // Get the updated session
            var session = await checkoutSessionService.GetSessionAsync(basket.Id, cancellationToken);

            // Create invoice from basket with the populated session
            var invoice = await invoiceService.CreateOrderFromBasketAsync(basket, session, cancellationToken);

            logger.LogInformation(
                "Express checkout: Invoice {InvoiceId} created from basket {BasketId} for {Email}",
                invoice.Id,
                basket.Id,
                request.CustomerData.Email);

            // Build express checkout request for the provider
            var expressRequest = new ExpressCheckoutRequest
            {
                BasketId = basket.Id,
                MethodAlias = request.MethodAlias ?? request.ProviderAlias,
                PaymentToken = request.PaymentToken,
                Amount = invoice.Total,
                Currency = basket.Currency ?? _settings.StoreCurrencyCode,
                CustomerData = new ExpressCheckoutCustomerData
                {
                    Email = request.CustomerData.Email,
                    Phone = request.CustomerData.Phone,
                    FullName = request.CustomerData.FullName,
                    ShippingAddress = MapDtoToExpressAddress(request.CustomerData.ShippingAddress),
                    BillingAddress = request.CustomerData.BillingAddress != null
                        ? MapDtoToExpressAddress(request.CustomerData.BillingAddress)
                        : null
                },
                ProviderData = request.ProviderData
            };

            // Process the express checkout payment
            var result = await provider.Provider.ProcessExpressCheckoutAsync(expressRequest, cancellationToken);

            if (!result.Success)
            {
                logger.LogWarning(
                    "Express checkout payment failed for invoice {InvoiceId}: {Error}",
                    invoice.Id,
                    result.ErrorMessage);

                return Ok(new ExpressCheckoutResponseDto
                {
                    Success = false,
                    ErrorMessage = result.ErrorMessage,
                    ErrorCode = result.ErrorCode
                });
            }

            // Record the payment (RecordPaymentAsync is for successful payments)
            // If provider doesn't return a TransactionId, generate a deterministic one
            // based on invoice, provider, and payment token to ensure idempotency
            var transactionId = result.TransactionId;
            if (string.IsNullOrEmpty(transactionId))
            {
                // Create deterministic ID from invoice + provider + payment token
                // This ensures the same express checkout attempt produces the same transaction ID
                var idempotencyKey = invoice.Id + ":" + request.ProviderAlias + ":" +
                    (request.MethodAlias ?? "") + ":" + request.PaymentToken;
                var hashBytes = System.Security.Cryptography.SHA256.HashData(
                    System.Text.Encoding.UTF8.GetBytes(idempotencyKey));
                transactionId = "express_" + Convert.ToHexString(hashBytes)[..16].ToLowerInvariant();
            }
            var paymentResult = await paymentService.RecordPaymentAsync(
                new RecordPaymentParameters
                {
                    InvoiceId = invoice.Id,
                    ProviderAlias = request.ProviderAlias,
                    Amount = result.Amount,
                    TransactionId = transactionId
                },
                cancellationToken);

            if (!paymentResult.Successful || paymentResult.ResultObject == null)
            {
                logger.LogError(
                    "Failed to record payment for invoice {InvoiceId}: {Error}",
                    invoice.Id,
                    paymentResult.Messages.FirstOrDefault()?.Message ?? "Unknown error");

                return Ok(new ExpressCheckoutResponseDto
                {
                    Success = false,
                    ErrorMessage = "Payment was processed but failed to record. Please contact support."
                });
            }

            var payment = paymentResult.ResultObject;

            logger.LogInformation(
                "Express checkout completed for invoice {InvoiceId}, PaymentId: {PaymentId}, TransactionId: {TransactionId}",
                invoice.Id,
                payment.Id,
                transactionId);

            return Ok(new ExpressCheckoutResponseDto
            {
                Success = true,
                InvoiceId = invoice.Id,
                PaymentId = payment.Id,
                TransactionId = result.TransactionId,
                RedirectUrl = $"/checkout/confirmation/{invoice.Id}",
                Status = result.Status switch
                {
                    PaymentResultStatus.Completed => "completed",
                    PaymentResultStatus.Pending => "pending",
                    _ => "unknown"
                }
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Express checkout failed for basket {BasketId}", basket.Id);

            return Ok(new ExpressCheckoutResponseDto
            {
                Success = false,
                ErrorMessage = "An error occurred processing your payment. Please try again."
            });
        }
    }

    /// <summary>
    /// Get SDK configuration for initializing express checkout buttons.
    /// Returns provider-specific configuration needed to render express checkout buttons.
    /// Each provider dynamically returns its own SDK configuration.
    /// </summary>
    [HttpGet("express-config")]
    [ProducesResponseType<ExpressCheckoutConfigDto>(StatusCodes.Status200OK)]
    public async Task<ExpressCheckoutConfigDto> GetExpressCheckoutConfig(
        CancellationToken cancellationToken = default)
    {
        var methods = await providerManager.GetExpressCheckoutMethodsAsync(cancellationToken);
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);

        var currency = basket?.Currency ?? _settings.StoreCurrencyCode;
        var amount = basket?.Total ?? 0;

        var config = new ExpressCheckoutConfigDto
        {
            Currency = currency,
            Amount = amount,
            Methods = []
        };

        // Group methods by provider to minimize provider lookups
        var methodsByProvider = methods.GroupBy(m => m.ProviderAlias);

        foreach (var providerGroup in methodsByProvider)
        {
            var provider = await providerManager.GetProviderAsync(
                providerGroup.Key,
                requireEnabled: true,
                cancellationToken);

            if (provider == null)
            {
                continue;
            }

            // Get SDK config from each provider for each of its express methods
            foreach (var method in providerGroup)
            {
                var clientConfig = await provider.Provider.GetExpressCheckoutClientConfigAsync(
                    method.MethodAlias,
                    amount,
                    currency,
                    cancellationToken);

                // If provider returns config, use it; otherwise use basic info
                if (clientConfig != null)
                {
                    // Skip unavailable methods (e.g., Apple Pay not supported on this device/browser)
                    if (!clientConfig.IsAvailable)
                    {
                        continue;
                    }

                    config.Methods.Add(new ExpressMethodConfigDto
                    {
                        ProviderAlias = method.ProviderAlias,
                        MethodAlias = method.MethodAlias,
                        DisplayName = method.DisplayName,
                        MethodType = clientConfig.MethodType ?? method.MethodType,
                        SdkUrl = clientConfig.SdkUrl,
                        AdapterUrl = clientConfig.CustomAdapterUrl,
                        SdkConfig = clientConfig.SdkConfig
                    });
                }
                else
                {
                    // Provider doesn't have SDK config - add basic info for custom handling
                    config.Methods.Add(new ExpressMethodConfigDto
                    {
                        ProviderAlias = method.ProviderAlias,
                        MethodAlias = method.MethodAlias,
                        DisplayName = method.DisplayName,
                        MethodType = method.MethodType
                    });
                }
            }
        }

        return config;
    }

    /// <summary>
    /// Create a PaymentIntent for express checkout.
    /// Called by the frontend after the express checkout element collects payment details.
    /// Returns the client secret needed to confirm the payment.
    /// </summary>
    [HttpPost("express-payment-intent")]
    [ProducesResponseType<ExpressPaymentIntentResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateExpressPaymentIntent(
        [FromBody] ExpressPaymentIntentRequestDto request,
        CancellationToken cancellationToken = default)
    {
        // Get the current basket
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);

        if (basket == null || basket.LineItems.Count == 0)
        {
            return BadRequest(new ExpressPaymentIntentResponseDto
            {
                Success = false,
                ErrorMessage = "No items in basket."
            });
        }

        // Verify provider is enabled
        var provider = await providerManager.GetProviderAsync(
            request.ProviderAlias,
            requireEnabled: true,
            cancellationToken);

        if (provider == null)
        {
            return BadRequest(new ExpressPaymentIntentResponseDto
            {
                Success = false,
                ErrorMessage = $"Payment provider '{request.ProviderAlias}' is not available."
            });
        }

        // Create payment session which will create the PaymentIntent
        var paymentRequest = new PaymentRequest
        {
            InvoiceId = Guid.Empty, // Will be created after express checkout completes
            Amount = basket.Total,
            Currency = basket.Currency ?? _settings.StoreCurrencyCode,
            MethodAlias = request.MethodAlias,
            ReturnUrl = $"{Request.Scheme}://{Request.Host}/checkout/confirmation",
            CancelUrl = $"{Request.Scheme}://{Request.Host}/checkout"
        };

        var sessionResult = await provider.Provider.CreatePaymentSessionAsync(paymentRequest, cancellationToken);

        if (!sessionResult.Success)
        {
            return BadRequest(new ExpressPaymentIntentResponseDto
            {
                Success = false,
                ErrorMessage = sessionResult.ErrorMessage ?? "Failed to create payment session."
            });
        }

        return Ok(new ExpressPaymentIntentResponseDto
        {
            Success = true,
            ClientSecret = sessionResult.ClientToken ?? sessionResult.ClientSecret,
            PaymentIntentId = sessionResult.SessionId
        });
    }

    /// <summary>
    /// Maps an express checkout address DTO to a checkout session address.
    /// </summary>
    private static Address MapExpressAddress(
        ExpressCheckoutAddressDto source,
        string email,
        string? fullName,
        string? phone)
    {
        return new Address
        {
            Email = email,
            Name = fullName ?? string.Empty,
            AddressOne = source.Line1,
            AddressTwo = source.Line2,
            TownCity = source.City,
            PostalCode = source.PostalCode,
            CountryCode = source.CountryCode,
            Phone = phone,
            CountyState = !string.IsNullOrEmpty(source.Region)
                ? new CountyState { Name = source.Region }
                : new CountyState()
        };
    }

    /// <summary>
    /// Maps an express checkout address DTO to an express checkout address model.
    /// </summary>
    private static ExpressCheckoutAddress MapDtoToExpressAddress(ExpressCheckoutAddressDto dto)
    {
        return new ExpressCheckoutAddress
        {
            Line1 = dto.Line1,
            Line2 = dto.Line2,
            City = dto.City,
            Region = dto.Region,
            PostalCode = dto.PostalCode,
            CountryCode = dto.CountryCode
        };
    }

    // =====================================================
    // PayPal Widget Checkout
    // =====================================================

    /// <summary>
    /// Create a PayPal order for the standard Widget payment flow.
    /// Called by the PayPal button's createOrder callback when no pre-created order exists.
    /// </summary>
    /// <remarks>
    /// This endpoint is typically used as a fallback. The standard flow pre-creates the
    /// PayPal order during the InitiatePayment call and returns the orderId in sdkConfiguration.
    /// </remarks>
    [HttpPost("paypal/create-order")]
    [ProducesResponseType<CreatePayPalOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePayPalOrder(
        [FromBody] CreatePayPalOrderDto request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get the PayPal provider
            var provider = await providerManager.GetProviderAsync(
                "paypal",
                requireEnabled: true,
                cancellationToken);

            if (provider == null)
            {
                return Ok(new CreatePayPalOrderResultDto
                {
                    Success = false,
                    ErrorMessage = "PayPal is not available."
                });
            }

            // Get the current basket
            var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);

            if (basket == null || basket.LineItems.Count == 0)
            {
                return Ok(new CreatePayPalOrderResultDto
                {
                    Success = false,
                    ErrorMessage = "No items in basket."
                });
            }

            // Get checkout session
            var session = await checkoutSessionService.GetSessionAsync(basket.Id, cancellationToken);

            // Validate checkout session has required data
            if (string.IsNullOrWhiteSpace(session.BillingAddress.Email))
            {
                return Ok(new CreatePayPalOrderResultDto
                {
                    Success = false,
                    ErrorMessage = "Please complete the checkout information step first."
                });
            }

            // Create invoice from basket if not already created
            var invoice = await invoiceService.CreateOrderFromBasketAsync(basket, session, cancellationToken);

            logger.LogInformation(
                "PayPal create-order: Invoice {InvoiceId} created from basket {BasketId}",
                invoice.Id,
                basket.Id);

            // Create payment session to get the PayPal order ID
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await paymentService.CreatePaymentSessionAsync(
                new CreatePaymentSessionParameters
                {
                    InvoiceId = invoice.Id,
                    ProviderAlias = "paypal",
                    MethodAlias = "paypal",
                    ReturnUrl = $"{baseUrl}/checkout/confirmation/{invoice.Id}",
                    CancelUrl = $"{baseUrl}/checkout/payment"
                },
                cancellationToken);

            if (!result.Success || result.SdkConfiguration == null)
            {
                logger.LogWarning(
                    "PayPal create-order failed for invoice {InvoiceId}: {Error}",
                    invoice.Id,
                    result.ErrorMessage);

                return Ok(new CreatePayPalOrderResultDto
                {
                    Success = false,
                    ErrorMessage = result.ErrorMessage ?? "Failed to create PayPal order."
                });
            }

            // Extract orderId from SDK configuration
            var orderId = result.SdkConfiguration.TryGetValue("orderId", out var orderIdObj)
                ? orderIdObj?.ToString()
                : result.SessionId;

            if (string.IsNullOrEmpty(orderId))
            {
                return Ok(new CreatePayPalOrderResultDto
                {
                    Success = false,
                    ErrorMessage = "Failed to get PayPal order ID."
                });
            }

            logger.LogInformation(
                "PayPal order {OrderId} created for invoice {InvoiceId}",
                orderId,
                invoice.Id);

            return Ok(new CreatePayPalOrderResultDto
            {
                Success = true,
                OrderId = orderId
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PayPal create-order failed");

            return Ok(new CreatePayPalOrderResultDto
            {
                Success = false,
                ErrorMessage = "An error occurred creating the PayPal order."
            });
        }
    }

    /// <summary>
    /// Capture an approved PayPal order.
    /// Called after the user approves payment in the PayPal popup.
    /// </summary>
    [HttpPost("paypal/capture-order")]
    [ProducesResponseType<CapturePayPalOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CapturePayPalOrder(
        [FromBody] CapturePayPalOrderDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.OrderId))
        {
            return Ok(new CapturePayPalOrderResultDto
            {
                Success = false,
                ErrorMessage = "OrderId is required."
            });
        }

        try
        {
            // Get the PayPal provider
            var provider = await providerManager.GetProviderAsync(
                "paypal",
                requireEnabled: true,
                cancellationToken);

            if (provider == null)
            {
                return Ok(new CapturePayPalOrderResultDto
                {
                    Success = false,
                    ErrorMessage = "PayPal is not available."
                });
            }

            // Get the invoice ID from the request
            if (!request.InvoiceId.HasValue)
            {
                return Ok(new CapturePayPalOrderResultDto
                {
                    Success = false,
                    ErrorMessage = "InvoiceId is required."
                });
            }

            // Get the invoice
            var invoice = await invoiceService.GetInvoiceAsync(request.InvoiceId.Value, cancellationToken);

            if (invoice == null)
            {
                return Ok(new CapturePayPalOrderResultDto
                {
                    Success = false,
                    ErrorMessage = "Invoice not found."
                });
            }

            // Validate that the current checkout session owns this invoice
            var currentBasket = await checkoutService.GetBasket(
                new GetBasketParameters(),
                cancellationToken);

            if (currentBasket != null)
            {
                var session = await checkoutSessionService.GetSessionAsync(currentBasket.Id, cancellationToken);

                // Validate ownership by comparing billing email
                if (!string.IsNullOrEmpty(session.BillingAddress.Email) &&
                    !string.Equals(session.BillingAddress.Email, invoice.BillingAddress.Email, StringComparison.OrdinalIgnoreCase))
                {
                    logger.LogWarning(
                        "Invoice ownership validation failed in CapturePayPalOrder: Invoice {InvoiceId} has billing email {InvoiceBillingEmail}, but session has {SessionBillingEmail}",
                        request.InvoiceId.Value,
                        invoice.BillingAddress.Email,
                        session.BillingAddress.Email);

                    return Ok(new CapturePayPalOrderResultDto
                    {
                        Success = false,
                        ErrorMessage = "You do not have permission to pay this invoice."
                    });
                }
            }

            // Process the payment (capture the PayPal order)
            var processRequest = new ProcessPaymentRequest
            {
                InvoiceId = invoice.Id,
                ProviderAlias = "paypal",
                SessionId = request.OrderId,
                Amount = invoice.Total
            };

            var result = await paymentService.ProcessPaymentAsync(processRequest, cancellationToken);

            if (!result.Successful || result.ResultObject == null)
            {
                var errorMessage = result.Messages
                    .Where(m => m.ResultMessageType == Core.Shared.Models.Enums.ResultMessageType.Error)
                    .Select(m => m.Message)
                    .FirstOrDefault() ?? "Payment capture failed.";

                logger.LogWarning(
                    "PayPal capture failed for order {OrderId}, invoice {InvoiceId}: {Error}",
                    request.OrderId,
                    invoice.Id,
                    errorMessage);

                return Ok(new CapturePayPalOrderResultDto
                {
                    Success = false,
                    ErrorMessage = errorMessage
                });
            }

            var payment = result.ResultObject;

            logger.LogInformation(
                "PayPal order {OrderId} captured for invoice {InvoiceId}, PaymentId: {PaymentId}, TransactionId: {TransactionId}",
                request.OrderId,
                invoice.Id,
                payment.Id,
                payment.TransactionId);

            return Ok(new CapturePayPalOrderResultDto
            {
                Success = true,
                InvoiceId = invoice.Id,
                PaymentId = payment.Id,
                TransactionId = payment.TransactionId,
                RedirectUrl = $"/checkout/confirmation/{invoice.Id}"
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "PayPal capture-order failed for order {OrderId}", request.OrderId);

            return Ok(new CapturePayPalOrderResultDto
            {
                Success = false,
                ErrorMessage = "An error occurred capturing the PayPal order."
            });
        }
    }
}
