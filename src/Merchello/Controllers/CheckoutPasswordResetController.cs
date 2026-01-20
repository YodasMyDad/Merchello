using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Models;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Controllers;

/// <summary>
/// MVC controller for the password reset page.
/// Renders the reset password form within the checkout experience.
/// </summary>
[Route("checkout/reset-password")]
public class CheckoutPasswordResetController(
    ICheckoutMemberService checkoutMemberService) : Controller
{
    /// <summary>
    /// Renders the password reset form.
    /// Validates the token on page load and displays appropriate UI.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> Index(
        [FromQuery] string? email,
        [FromQuery] string? token,
        CancellationToken ct)
    {
        var viewModel = new PasswordResetViewModel
        {
            Email = email ?? "",
            Token = token ?? ""
        };

        // Validate token on page load
        if (!string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(token))
        {
            var validation = await checkoutMemberService.ValidateResetTokenAsync(email, token, ct);
            viewModel.TokenValid = validation.IsValid;
            viewModel.ErrorMessage = validation.ErrorMessage;
        }
        else
        {
            viewModel.TokenValid = false;
            viewModel.ErrorMessage = "Invalid reset link. Please request a new password reset.";
        }

        return View("~/Views/Checkout/ResetPassword.cshtml", viewModel);
    }
}
