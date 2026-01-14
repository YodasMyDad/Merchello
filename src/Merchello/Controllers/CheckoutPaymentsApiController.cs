using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

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
    IStorefrontContextService storefrontContextService,
    ICurrencyService currencyService,
    ILogger<CheckoutPaymentsApiController> logger) : ControllerBase
{

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

        // Validate invoice state before allowing payment
        if (invoice.IsCancelled)
        {
            logger.LogWarning("Payment attempt on cancelled invoice: {InvoiceId}", invoiceId);
            return BadRequest("This invoice has been cancelled and cannot be paid.");
        }

        var invoicePaymentStatus = await paymentService.GetInvoicePaymentStatusAsync(invoiceId, cancellationToken);
        if (invoicePaymentStatus == InvoicePaymentStatus.Paid)
        {
            logger.LogWarning("Payment attempt on already-paid invoice: {InvoiceId}", invoiceId);
            return BadRequest("This invoice has already been paid.");
        }

        if (invoicePaymentStatus == InvoicePaymentStatus.Refunded)
        {
            logger.LogWarning("Payment attempt on refunded invoice: {InvoiceId}", invoiceId);
            return BadRequest("This invoice has been refunded and cannot accept new payments.");
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

        // Validate ownership with multiple checks for defense in depth:
        // 1. Session must have the invoice ID that was created from this checkout
        // 2. Billing email must match (fallback for sessions created before InvoiceId tracking)
        var hasValidInvoiceId = session.InvoiceId.HasValue && session.InvoiceId.Value == invoiceId;
        var hasValidEmail = !string.IsNullOrEmpty(session.BillingAddress.Email) &&
            string.Equals(session.BillingAddress.Email, invoice.BillingAddress.Email, StringComparison.OrdinalIgnoreCase);

        if (!hasValidInvoiceId && !hasValidEmail)
        {
            logger.LogWarning(
                "Invoice ownership validation failed: Invoice {InvoiceId} (email: {InvoiceBillingEmail}), Session invoice: {SessionInvoiceId}, Session email: {SessionBillingEmail}",
                invoiceId,
                invoice.BillingAddress.Email,
                session.InvoiceId,
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
            // Use result values if set, otherwise fall back to request values
            ProviderAlias = result.ProviderAlias ?? request.ProviderAlias,
            MethodAlias = result.MethodAlias ?? request.MethodAlias,
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
                // Clear basket on successful payment
                if (existingPayment.PaymentSuccess)
                {
                    ClearBasketCookieAndSession();
                }

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

        // Fallback to basket addresses if session is empty (session expired, different browser, etc.)
        // The basket addresses are persisted to the database, while session is volatile (HTTP session)
        if (string.IsNullOrWhiteSpace(session.BillingAddress.Name) &&
            !string.IsNullOrWhiteSpace(basket.BillingAddress.Name))
        {
            logger.LogWarning(
                "Checkout session addresses empty, falling back to basket addresses for basket {BasketId}",
                basket.Id);
            session.BillingAddress = basket.BillingAddress;
            session.ShippingAddress = basket.ShippingAddress;
        }

        // Validate checkout session has all required address data
        var validation = ValidateCheckoutSession(session);
        if (!validation.IsValid)
        {
            logger.LogWarning(
                "Checkout session validation failed for basket {BasketId}: {Error}",
                basket.Id,
                validation.ErrorMessage);

            return BadRequest(new PaymentSessionResultDto
            {
                Success = false,
                ErrorMessage = validation.ErrorMessage
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

        // Check if this is a DirectForm payment method (e.g., Purchase Order)
        // For DirectForm types, we defer invoice creation until ProcessDirectPayment
        // after form validation passes. This prevents ghost orders when validation fails.
        var methodDefinition = provider.Provider.GetAvailablePaymentMethods()
            .FirstOrDefault(m => m.Alias == (request.MethodAlias ?? request.ProviderAlias));
        var isDirectForm = methodDefinition?.IntegrationType == PaymentIntegrationType.DirectForm;

        // Re-validate stock availability before creating order
        // This catches cases where stock changed while user was completing checkout
        var availability = await storefrontContextService.GetBasketAvailabilityAsync(
            basket.LineItems,
            session.ShippingAddress.CountryCode,
            session.ShippingAddress.CountyState?.RegionCode,
            cancellationToken);

        if (!availability.AllItemsAvailable)
        {
            var unavailableItems = availability.Items
                .Where(i => !i.CanShipToLocation || !i.HasStock)
                .Select(i => i.StatusMessage)
                .ToList();

            logger.LogWarning(
                "Stock validation failed at checkout for basket {BasketId}: {UnavailableItems}",
                basket.Id,
                string.Join(", ", unavailableItems));

            return BadRequest(new PaymentSessionResultDto
            {
                Success = false,
                ErrorMessage = "Some items in your basket are no longer available. Please review your basket and try again.",
                UnavailableItems = unavailableItems
            });
        }

        // Create invoice from basket (skip for DirectForm - will be created in ProcessDirectPayment)
        Invoice? invoice = null;
        if (!isDirectForm)
        {
            invoice = await invoiceService.CreateOrderFromBasketAsync(basket, session, cancellationToken);

            logger.LogInformation(
                "Invoice {InvoiceId} created from basket {BasketId}",
                invoice.Id,
                basket.Id);

            // Store invoice ID in session for ownership validation during payment
            await checkoutSessionService.SetInvoiceIdAsync(basket.Id, invoice.Id, cancellationToken);
        }
        else
        {
            logger.LogInformation(
                "DirectForm payment session for basket {BasketId} - invoice deferred until form validation",
                basket.Id);
        }

        // Create payment session
        var result = await paymentService.CreatePaymentSessionAsync(
            new CreatePaymentSessionParameters
            {
                InvoiceId = invoice?.Id ?? Guid.Empty,
                ProviderAlias = request.ProviderAlias,
                MethodAlias = request.MethodAlias,
                ReturnUrl = request.ReturnUrl,
                CancelUrl = request.CancelUrl
            },
            cancellationToken);

        var response = new PaymentSessionResultDto
        {
            Success = result.Success,
            InvoiceId = invoice?.Id,
            SessionId = result.SessionId,
            IntegrationType = result.IntegrationType,
            RedirectUrl = result.RedirectUrl,
            ClientToken = result.ClientToken,
            ClientSecret = result.ClientSecret,
            JavaScriptSdkUrl = result.JavaScriptSdkUrl,
            SdkConfiguration = result.SdkConfiguration,
            AdapterUrl = result.AdapterUrl,
            // Use result values if set, otherwise fall back to request values
            ProviderAlias = result.ProviderAlias ?? request.ProviderAlias,
            MethodAlias = result.MethodAlias ?? request.MethodAlias,
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
                "Payment session creation failed for {PaymentType} with provider {Provider}: {Error}",
                invoice != null ? $"invoice {invoice.Id}" : "DirectForm (no invoice yet)",
                request.ProviderAlias,
                result.ErrorMessage);
        }
        else
        {
            logger.LogInformation(
                "Payment session created for {PaymentType} with provider {Provider}, SessionId: {SessionId}",
                invoice != null ? $"invoice {invoice.Id}" : "DirectForm (invoice deferred)",
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

        // Validate ownership with multiple checks for defense in depth
        var hasValidInvoiceId = session.InvoiceId.HasValue && session.InvoiceId.Value == request.InvoiceId;
        var hasValidEmail = !string.IsNullOrEmpty(session.BillingAddress.Email) &&
            string.Equals(session.BillingAddress.Email, invoice.BillingAddress.Email, StringComparison.OrdinalIgnoreCase);

        if (!hasValidInvoiceId && !hasValidEmail)
        {
            logger.LogWarning(
                "Invoice ownership validation failed in ProcessPayment: Invoice {InvoiceId} (email: {InvoiceBillingEmail}), Session invoice: {SessionInvoiceId}, Session email: {SessionBillingEmail}",
                request.InvoiceId,
                invoice.BillingAddress.Email,
                session.InvoiceId,
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

        // Set confirmation token to authorize viewing the confirmation page
        SetConfirmationToken(request.InvoiceId);

        // Clear basket after successful payment
        ClearBasketCookieAndSession();

        return Ok(new ProcessPaymentResultDto
        {
            Success = true,
            InvoiceId = request.InvoiceId,
            PaymentId = result.ResultObject.Id,
            TransactionId = result.ResultObject.TransactionId,
            RedirectUrl = $"/checkout/confirmation/{request.InvoiceId}"
        });
    }

    /// <summary>
    /// Process a DirectForm payment (e.g., Purchase Order, Manual Payment).
    /// Used for payment methods that require form data instead of a payment token.
    /// </summary>
    [HttpPost("process-direct-payment")]
    [ProducesResponseType<ProcessPaymentResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ProcessDirectPayment(
        [FromBody] ProcessDirectPaymentDto request,
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

        // Get current basket and session first (needed for invoice lookup/creation)
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

        // Get or create invoice
        // For DirectForm types (Purchase Order), invoice may not exist yet because we defer
        // creation until after form validation passes to prevent ghost orders.
        Invoice? invoice = null;
        var invoiceCreatedInThisRequest = false;

        // Try to get invoice from request
        if (request.InvoiceId.HasValue && request.InvoiceId.Value != Guid.Empty)
        {
            invoice = await invoiceService.GetInvoiceAsync(request.InvoiceId.Value, cancellationToken);
        }
        // Try to get invoice from session
        else if (session.InvoiceId.HasValue)
        {
            invoice = await invoiceService.GetInvoiceAsync(session.InvoiceId.Value, cancellationToken);
        }

        // If no invoice exists, create one now (DirectForm flow - validation passed on frontend)
        if (invoice == null)
        {
            logger.LogInformation(
                "Creating invoice from basket {BasketId} during DirectForm payment submission",
                currentBasket.Id);

            // Validate checkout session has all required address data
            var validation = ValidateCheckoutSession(session);
            if (!validation.IsValid)
            {
                return BadRequest(new ProcessPaymentResultDto
                {
                    Success = false,
                    ErrorMessage = validation.ErrorMessage
                });
            }

            // Re-validate stock before creating invoice
            var availability = await storefrontContextService.GetBasketAvailabilityAsync(
                currentBasket.LineItems,
                session.ShippingAddress.CountryCode,
                session.ShippingAddress.CountyState?.RegionCode,
                cancellationToken);

            if (!availability.AllItemsAvailable)
            {
                return BadRequest(new ProcessPaymentResultDto
                {
                    Success = false,
                    ErrorMessage = "Some items in your basket are no longer available."
                });
            }

            invoice = await invoiceService.CreateOrderFromBasketAsync(currentBasket, session, cancellationToken);
            await checkoutSessionService.SetInvoiceIdAsync(currentBasket.Id, invoice.Id, cancellationToken);
            invoiceCreatedInThisRequest = true;

            logger.LogInformation(
                "Invoice {InvoiceId} created from basket {BasketId} during DirectForm payment",
                invoice.Id,
                currentBasket.Id);
        }

        // Validate ownership with multiple checks for defense in depth
        // Skip this check if we just created the invoice - we know it's valid
        if (!invoiceCreatedInThisRequest)
        {
            var hasValidInvoiceId = session.InvoiceId.HasValue && session.InvoiceId.Value == invoice.Id;
            var hasValidEmail = !string.IsNullOrEmpty(session.BillingAddress.Email) &&
                string.Equals(session.BillingAddress.Email, invoice.BillingAddress.Email, StringComparison.OrdinalIgnoreCase);

            if (!hasValidInvoiceId && !hasValidEmail)
            {
                logger.LogWarning(
                    "Invoice ownership validation failed in ProcessDirectPayment: Invoice {InvoiceId} (email: {InvoiceBillingEmail}), Session invoice: {SessionInvoiceId}, Session email: {SessionBillingEmail}",
                    invoice.Id,
                    invoice.BillingAddress.Email,
                    session.InvoiceId,
                    session.BillingAddress.Email);

                return StatusCode(StatusCodes.Status403Forbidden, new ProcessPaymentResultDto
                {
                    Success = false,
                    ErrorMessage = "You do not have permission to pay this invoice."
                });
            }
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
                ErrorMessage = "Payment provider '" + request.ProviderAlias + "' is not available."
            });
        }

        // Sanitize form data to prevent injection attacks
        var sanitizedFormData = SanitizeFormData(request.FormData);

        // Log form fields being processed (for security monitoring)
        if (sanitizedFormData.Any())
        {
            logger.LogInformation(
                "Processing DirectForm payment for invoice {InvoiceId} with provider {Provider}, fields: {Fields}",
                invoice.Id,
                request.ProviderAlias,
                string.Join(", ", sanitizedFormData.Keys));
        }

        // Build the process payment request for DirectForm
        var processRequest = new ProcessPaymentRequest
        {
            InvoiceId = invoice.Id,
            ProviderAlias = request.ProviderAlias,
            MethodAlias = request.MethodAlias,
            Amount = invoice.Total,
            FormData = sanitizedFormData
        };

        // Process the payment
        var result = await paymentService.ProcessPaymentAsync(processRequest, cancellationToken);

        if (!result.Successful)
        {
            var errorMessage = result.Messages
                .Where(m => m.ResultMessageType == Merchello.Core.Shared.Models.Enums.ResultMessageType.Error)
                .Select(m => m.Message)
                .FirstOrDefault() ?? "Payment processing failed.";

            logger.LogWarning(
                "DirectForm payment processing failed for invoice {InvoiceId} with provider {Provider}: {Error}",
                invoice.Id,
                request.ProviderAlias,
                errorMessage);

            return Ok(new ProcessPaymentResultDto
            {
                Success = false,
                InvoiceId = invoice.Id,
                ErrorMessage = errorMessage
            });
        }

        // Set confirmation token to authorize viewing the confirmation page
        SetConfirmationToken(invoice.Id);

        // Clear basket after successful payment
        ClearBasketCookieAndSession();

        // Check if payment was recorded (may be skipped for Purchase Order)
        if (result.ResultObject == null)
        {
            logger.LogInformation(
                "DirectForm payment accepted for invoice {InvoiceId} with provider {Provider} (no payment recorded - awaiting payment)",
                invoice.Id,
                request.ProviderAlias);

            return Ok(new ProcessPaymentResultDto
            {
                Success = true,
                InvoiceId = invoice.Id,
                PaymentId = null,
                TransactionId = null,
                RedirectUrl = "/checkout/confirmation/" + invoice.Id
            });
        }

        logger.LogInformation(
            "DirectForm payment processed successfully for invoice {InvoiceId} with provider {Provider}, PaymentId: {PaymentId}, TransactionId: {TransactionId}",
            invoice.Id,
            request.ProviderAlias,
            result.ResultObject.Id,
            result.ResultObject.TransactionId);

        return Ok(new ProcessPaymentResultDto
        {
            Success = true,
            InvoiceId = invoice.Id,
            PaymentId = result.ResultObject.Id,
            TransactionId = result.ResultObject.TransactionId,
            RedirectUrl = "/checkout/confirmation/" + invoice.Id
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

            // If no addresses were provided by the payment provider, we can't complete express checkout
            // The user needs to complete the regular checkout flow instead
            if (billingAddress == null)
            {
                return BadRequest(new ExpressCheckoutResponseDto
                {
                    Success = false,
                    ErrorMessage = "No address provided. Please complete the checkout form."
                });
            }

            // Create transient session for validation (NOT persisted yet)
            // This ensures we don't corrupt session state if shipping validation fails
            var sameAsBilling = request.CustomerData.BillingAddress == null;
            var effectiveShippingAddress = sameAsBilling ? billingAddress : (shippingAddress ?? billingAddress);

            var transientSession = new CheckoutSession
            {
                BasketId = basket.Id,
                BillingAddress = billingAddress,
                ShippingAddress = effectiveShippingAddress,
                ShippingSameAsBilling = sameAsBilling,
                AcceptsMarketing = false,
                CurrentStep = CheckoutStep.Shipping
            };

            // Validate shipping BEFORE persisting addresses
            var groupingResult = await checkoutService.GetOrderGroupsAsync(basket, transientSession, cancellationToken);

            if (!groupingResult.Success || groupingResult.Groups.Count == 0)
            {
                logger.LogWarning(
                    "Express checkout: Unable to calculate shipping options for basket {BasketId}. Address not persisted.",
                    basket.Id);

                return BadRequest(new ExpressCheckoutResponseDto
                {
                    Success = false,
                    ErrorMessage = "Unable to calculate shipping for your address. Please try a different address or use standard checkout."
                });
            }

            // Auto-select cheapest shipping option for each group
            var autoSelectedShipping = ShippingAutoSelector.SelectOptions(
                groupingResult.Groups,
                ShippingAutoSelectStrategy.Cheapest);

            if (autoSelectedShipping.Count == 0)
            {
                logger.LogWarning(
                    "Express checkout: No shipping options available for basket {BasketId}. Address not persisted.",
                    basket.Id);

                return BadRequest(new ExpressCheckoutResponseDto
                {
                    Success = false,
                    ErrorMessage = "No shipping methods available for your location."
                });
            }

            // Validation passed - NOW persist addresses to session
            await checkoutSessionService.SaveAddressesAsync(
                basket.Id,
                billingAddress,
                sameAsBilling ? null : shippingAddress,
                sameAsBilling,
                acceptsMarketing: false,
                cancellationToken);

            // Save shipping selections to session
            await checkoutSessionService.SaveShippingSelectionsAsync(
                basket.Id,
                autoSelectedShipping,
                null,
                cancellationToken);

            // Get the persisted session for subsequent operations
            var session = await checkoutSessionService.GetSessionAsync(basket.Id, cancellationToken);

            logger.LogInformation(
                "Express checkout: Auto-selected shipping for {GroupCount} groups, combined total: {Total}",
                autoSelectedShipping.Count,
                ShippingAutoSelector.CalculateCombinedTotal(groupingResult.Groups, autoSelectedShipping));

            // Create invoice from basket with the populated session
            var invoice = await invoiceService.CreateOrderFromBasketAsync(basket, session, cancellationToken);

            logger.LogInformation(
                "Express checkout: Invoice {InvoiceId} created from basket {BasketId} for {Email}",
                invoice.Id,
                basket.Id,
                request.CustomerData.Email);

            // Store invoice ID in session for ownership validation during payment
            await checkoutSessionService.SetInvoiceIdAsync(basket.Id, invoice.Id, cancellationToken);

            // Build express checkout request for the provider
            // Use invoice currency - this is the currency the customer agreed to pay
            var expressRequest = new ExpressCheckoutRequest
            {
                BasketId = basket.Id,
                MethodAlias = request.MethodAlias ?? request.ProviderAlias,
                PaymentToken = request.PaymentToken,
                Amount = invoice.Total,
                Currency = invoice.CurrencyCode,
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

            // Set confirmation token to authorize viewing the confirmation page
            SetConfirmationToken(invoice.Id);

            // Clear basket after successful payment
            ClearBasketCookieAndSession();

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

        // Get the display currency and convert basket totals using extension method
        var currencyContext = await storefrontContextService.GetCurrencyContextAsync(cancellationToken);
        var displayAmounts = basket.GetDisplayAmounts(
            currencyContext.ExchangeRate,
            currencyService,
            currencyContext.CurrencyCode);

        var config = new ExpressCheckoutConfigDto
        {
            Currency = currencyContext.CurrencyCode,
            Amount = displayAmounts.Total,
            SubTotal = displayAmounts.SubTotal,
            Shipping = displayAmounts.Shipping,
            Tax = displayAmounts.Tax,
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
                    config.Amount,
                    config.Currency,
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

        // Get display currency and convert basket total for the payment
        var currencyContext = await storefrontContextService.GetCurrencyContextAsync(cancellationToken);
        var displayAmounts = basket.GetDisplayAmounts(
            currencyContext.ExchangeRate,
            currencyService,
            currencyContext.CurrencyCode);

        // Create payment session which will create the PaymentIntent
        var paymentRequest = new PaymentRequest
        {
            InvoiceId = Guid.Empty, // Will be created after express checkout completes
            Amount = displayAmounts.Total,
            Currency = currencyContext.CurrencyCode,
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
    /// Returns null if the source address is null.
    /// </summary>
    private static Address? MapExpressAddress(
        ExpressCheckoutAddressDto? source,
        string email,
        string? fullName,
        string? phone)
    {
        if (source == null)
        {
            return null;
        }

        return new Address
        {
            Email = email,
            Name = fullName ?? string.Empty,
            AddressOne = source.Line1 ?? string.Empty,
            AddressTwo = source.Line2,
            TownCity = source.City ?? string.Empty,
            PostalCode = source.PostalCode ?? string.Empty,
            CountryCode = source.CountryCode ?? string.Empty,
            Phone = phone,
            CountyState = !string.IsNullOrEmpty(source.Region)
                ? new CountyState { Name = source.Region }
                : new CountyState()
        };
    }

    /// <summary>
    /// Maps an express checkout address DTO to an express checkout address model.
    /// Returns null if the source DTO is null.
    /// </summary>
    private static ExpressCheckoutAddress? MapDtoToExpressAddress(ExpressCheckoutAddressDto? dto)
    {
        if (dto == null)
        {
            return null;
        }

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
    // Widget Payment Flow (Create Order / Capture)
    // =====================================================
    // Supports any provider implementing the widget pattern:
    // PayPal, Klarna, Afterpay, and other BNPL solutions.
    // =====================================================

    /// <summary>
    /// Create a widget order for payment flows that use the create-order/capture pattern.
    /// Called by the provider's button/widget createOrder callback when no pre-created order exists.
    /// </summary>
    /// <remarks>
    /// This endpoint is typically used as a fallback. The standard flow pre-creates the
    /// order during the InitiatePayment call and returns the orderId in sdkConfiguration.
    /// </remarks>
    /// <param name="providerAlias">The payment provider alias (e.g., "paypal", "klarna").</param>
    /// <param name="request">The create order request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    [HttpPost("{providerAlias}/create-order")]
    [ProducesResponseType<CreateWidgetOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateWidgetOrder(
        string providerAlias,
        [FromBody] CreateWidgetOrderDto request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get the provider
            var provider = await providerManager.GetProviderAsync(
                providerAlias,
                requireEnabled: true,
                cancellationToken);

            if (provider == null)
            {
                return Ok(new CreateWidgetOrderResultDto
                {
                    Success = false,
                    ErrorMessage = $"Payment provider '{providerAlias}' is not available."
                });
            }

            // Get the current basket
            var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);

            if (basket == null || basket.LineItems.Count == 0)
            {
                return Ok(new CreateWidgetOrderResultDto
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
                return Ok(new CreateWidgetOrderResultDto
                {
                    Success = false,
                    ErrorMessage = "Please complete the checkout information step first."
                });
            }

            // Create invoice from basket if not already created
            var invoice = await invoiceService.CreateOrderFromBasketAsync(basket, session, cancellationToken);

            logger.LogInformation(
                "Widget create-order ({Provider}): Invoice {InvoiceId} created from basket {BasketId}",
                providerAlias,
                invoice.Id,
                basket.Id);

            // Store invoice ID in session for ownership validation during payment
            await checkoutSessionService.SetInvoiceIdAsync(basket.Id, invoice.Id, cancellationToken);

            // Create payment session to get the provider order ID
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var methodAlias = request.MethodAlias ?? providerAlias;
            var result = await paymentService.CreatePaymentSessionAsync(
                new CreatePaymentSessionParameters
                {
                    InvoiceId = invoice.Id,
                    ProviderAlias = providerAlias,
                    MethodAlias = methodAlias,
                    ReturnUrl = $"{baseUrl}/checkout/confirmation/{invoice.Id}",
                    CancelUrl = $"{baseUrl}/checkout/payment"
                },
                cancellationToken);

            if (!result.Success || result.SdkConfiguration == null)
            {
                logger.LogWarning(
                    "Widget create-order ({Provider}) failed for invoice {InvoiceId}: {Error}",
                    providerAlias,
                    invoice.Id,
                    result.ErrorMessage);

                return Ok(new CreateWidgetOrderResultDto
                {
                    Success = false,
                    ErrorMessage = result.ErrorMessage ?? $"Failed to create {providerAlias} order."
                });
            }

            // Extract orderId from SDK configuration
            var orderId = result.SdkConfiguration.TryGetValue("orderId", out var orderIdObj)
                ? orderIdObj?.ToString()
                : result.SessionId;

            if (string.IsNullOrEmpty(orderId))
            {
                return Ok(new CreateWidgetOrderResultDto
                {
                    Success = false,
                    ErrorMessage = $"Failed to get {providerAlias} order ID."
                });
            }

            logger.LogInformation(
                "Widget order ({Provider}) {OrderId} created for invoice {InvoiceId}",
                providerAlias,
                orderId,
                invoice.Id);

            return Ok(new CreateWidgetOrderResultDto
            {
                Success = true,
                OrderId = orderId
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Widget create-order ({Provider}) failed", providerAlias);

            return Ok(new CreateWidgetOrderResultDto
            {
                Success = false,
                ErrorMessage = $"An error occurred creating the {providerAlias} order."
            });
        }
    }

    /// <summary>
    /// Create a PayPal order for the standard Widget payment flow.
    /// </summary>
    /// <remarks>
    /// This endpoint is deprecated. Use POST /{providerAlias}/create-order instead.
    /// </remarks>
    [Obsolete("Use CreateWidgetOrder with providerAlias parameter instead.")]
    [HttpPost("paypal/create-order")]
    [ProducesResponseType<CreateWidgetOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public Task<IActionResult> CreatePayPalOrder(
        [FromBody] CreateWidgetOrderDto request,
        CancellationToken cancellationToken = default) =>
        CreateWidgetOrder("paypal", request, cancellationToken);

    /// <summary>
    /// Capture an approved widget order.
    /// Called after the user approves payment in the provider's UI (e.g., PayPal popup, Klarna modal).
    /// </summary>
    /// <param name="providerAlias">The payment provider alias (e.g., "paypal", "klarna").</param>
    /// <param name="request">The capture order request.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    [HttpPost("{providerAlias}/capture-order")]
    [ProducesResponseType<CaptureWidgetOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CaptureWidgetOrder(
        string providerAlias,
        [FromBody] CaptureWidgetOrderDto request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.OrderId))
        {
            return Ok(new CaptureWidgetOrderResultDto
            {
                Success = false,
                ErrorMessage = "OrderId is required."
            });
        }

        try
        {
            // Get the provider
            var provider = await providerManager.GetProviderAsync(
                providerAlias,
                requireEnabled: true,
                cancellationToken);

            if (provider == null)
            {
                return Ok(new CaptureWidgetOrderResultDto
                {
                    Success = false,
                    ErrorMessage = $"Payment provider '{providerAlias}' is not available."
                });
            }

            // Get the invoice ID from the request
            if (!request.InvoiceId.HasValue)
            {
                return Ok(new CaptureWidgetOrderResultDto
                {
                    Success = false,
                    ErrorMessage = "InvoiceId is required."
                });
            }

            // Get the invoice
            var invoice = await invoiceService.GetInvoiceAsync(request.InvoiceId.Value, cancellationToken);

            if (invoice == null)
            {
                return Ok(new CaptureWidgetOrderResultDto
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

                // Validate ownership with multiple checks for defense in depth
                var hasValidInvoiceId = session.InvoiceId.HasValue && session.InvoiceId.Value == request.InvoiceId.Value;
                var hasValidEmail = !string.IsNullOrEmpty(session.BillingAddress.Email) &&
                    string.Equals(session.BillingAddress.Email, invoice.BillingAddress.Email, StringComparison.OrdinalIgnoreCase);

                if (!hasValidInvoiceId && !hasValidEmail)
                {
                    logger.LogWarning(
                        "Invoice ownership validation failed in CaptureWidgetOrder ({Provider}): Invoice {InvoiceId} (email: {InvoiceBillingEmail}), Session invoice: {SessionInvoiceId}, Session email: {SessionBillingEmail}",
                        providerAlias,
                        request.InvoiceId.Value,
                        invoice.BillingAddress.Email,
                        session.InvoiceId,
                        session.BillingAddress.Email);

                    return Ok(new CaptureWidgetOrderResultDto
                    {
                        Success = false,
                        ErrorMessage = "You do not have permission to pay this invoice."
                    });
                }
            }

            // Process the payment (capture the order)
            var processRequest = new ProcessPaymentRequest
            {
                InvoiceId = invoice.Id,
                ProviderAlias = providerAlias,
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
                    "Widget capture ({Provider}) failed for order {OrderId}, invoice {InvoiceId}: {Error}",
                    providerAlias,
                    request.OrderId,
                    invoice.Id,
                    errorMessage);

                return Ok(new CaptureWidgetOrderResultDto
                {
                    Success = false,
                    ErrorMessage = errorMessage
                });
            }

            var payment = result.ResultObject;

            logger.LogInformation(
                "Widget order ({Provider}) {OrderId} captured for invoice {InvoiceId}, PaymentId: {PaymentId}, TransactionId: {TransactionId}",
                providerAlias,
                request.OrderId,
                invoice.Id,
                payment.Id,
                payment.TransactionId);

            // Set confirmation token to authorize viewing the confirmation page
            SetConfirmationToken(invoice.Id);

            // Clear basket after successful payment
            ClearBasketCookieAndSession();

            return Ok(new CaptureWidgetOrderResultDto
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
            logger.LogError(ex, "Widget capture-order ({Provider}) failed for order {OrderId}", providerAlias, request.OrderId);

            return Ok(new CaptureWidgetOrderResultDto
            {
                Success = false,
                ErrorMessage = $"An error occurred capturing the {providerAlias} order."
            });
        }
    }

    /// <summary>
    /// Capture an approved PayPal order.
    /// </summary>
    /// <remarks>
    /// This endpoint is deprecated. Use POST /{providerAlias}/capture-order instead.
    /// </remarks>
    [Obsolete("Use CaptureWidgetOrder with providerAlias parameter instead.")]
    [HttpPost("paypal/capture-order")]
    [ProducesResponseType<CaptureWidgetOrderResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ApiExplorerSettings(IgnoreApi = true)]
    public Task<IActionResult> CapturePayPalOrder(
        [FromBody] CaptureWidgetOrderDto request,
        CancellationToken cancellationToken = default) =>
        CaptureWidgetOrder("paypal", request, cancellationToken);

    // =====================================================
    // Helper Methods
    // =====================================================

    /// <summary>
    /// Sanitizes form data values to prevent injection attacks.
    /// Trims whitespace and limits string length for security.
    /// </summary>
    private static Dictionary<string, string> SanitizeFormData(Dictionary<string, string>? formData)
    {
        if (formData == null || formData.Count == 0)
        {
            return new Dictionary<string, string>();
        }

        const int maxValueLength = 10000; // Reasonable limit for form field values

        return formData
            .Where(kvp => !string.IsNullOrEmpty(kvp.Key))
            .ToDictionary(
                kvp => kvp.Key.Trim(),
                kvp => kvp.Value?.Trim().Length > maxValueLength
                    ? kvp.Value.Trim()[..maxValueLength]
                    : kvp.Value?.Trim() ?? string.Empty
            );
    }

    /// <summary>
    /// Validates that the checkout session has all required address data for invoice creation.
    /// </summary>
    private static (bool IsValid, string? ErrorMessage) ValidateCheckoutSession(CheckoutSession session)
    {
        // Validate billing address
        if (string.IsNullOrWhiteSpace(session.BillingAddress.Email))
            return (false, "Email is required. Please complete the checkout information step first.");

        if (string.IsNullOrWhiteSpace(session.BillingAddress.Name))
            return (false, "Billing name is required. Please complete the checkout information step first.");

        if (string.IsNullOrWhiteSpace(session.BillingAddress.AddressOne))
            return (false, "Billing address is required. Please complete the checkout information step first.");

        if (string.IsNullOrWhiteSpace(session.BillingAddress.TownCity))
            return (false, "Billing city is required. Please complete the checkout information step first.");

        if (string.IsNullOrWhiteSpace(session.BillingAddress.CountryCode))
            return (false, "Billing country is required. Please complete the checkout information step first.");

        // Validate shipping address
        if (string.IsNullOrWhiteSpace(session.ShippingAddress.Name))
            return (false, "Shipping name is required. Please complete the checkout information step first.");

        if (string.IsNullOrWhiteSpace(session.ShippingAddress.AddressOne))
            return (false, "Shipping address is required. Please complete the checkout information step first.");

        if (string.IsNullOrWhiteSpace(session.ShippingAddress.TownCity))
            return (false, "Shipping city is required. Please complete the checkout information step first.");

        if (string.IsNullOrWhiteSpace(session.ShippingAddress.CountryCode))
            return (false, "Shipping country is required. Please complete the checkout information step first.");

        return (true, null);
    }

    /// <summary>
    /// Sets a secure confirmation token cookie that authorizes the user to view the order confirmation page.
    /// This prevents unauthorized users from viewing order details by guessing invoice IDs.
    /// </summary>
    private void SetConfirmationToken(Guid invoiceId)
    {
        Response.Cookies.Append(
            Core.Constants.Cookies.ConfirmationToken,
            invoiceId.ToString(),
            new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                // Token expires after 24 hours - enough time to view confirmation but not forever
                Expires = DateTimeOffset.UtcNow.AddHours(24)
            });
    }

    /// <summary>
    /// Clears the basket cookie and session cache after successful payment.
    /// This prevents items from reappearing in the cart after order completion.
    /// </summary>
    private void ClearBasketCookieAndSession()
    {
        Response.Cookies.Delete(Core.Constants.Cookies.BasketId);
        HttpContext.Session.Remove("Basket");
    }
}
