using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Services.Parameters;

namespace Merchello.Core.Checkout.Services.Interfaces;

/// <summary>
/// Service for managing member accounts during checkout.
/// Handles account creation, sign-in, and password validation.
/// </summary>
public interface ICheckoutMemberService
{
    /// <summary>
    /// Checks if an email address has an existing member account.
    /// </summary>
    /// <param name="email">The email address to check.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Result indicating whether an account exists.</returns>
    Task<CheckEmailResultDto> CheckEmailAsync(string email, CancellationToken ct = default);

    /// <summary>
    /// Validates a password against Umbraco's configured password requirements.
    /// </summary>
    /// <param name="password">The password to validate.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Result with validation status and any errors.</returns>
    Task<ValidatePasswordResultDto> ValidatePasswordAsync(string password, CancellationToken ct = default);

    /// <summary>
    /// Attempts to sign in with an existing member account.
    /// </summary>
    /// <param name="email">The member's email address.</param>
    /// <param name="password">The member's password.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Result with sign-in status and any errors.</returns>
    Task<SignInResultDto> SignInAsync(string email, string password, CancellationToken ct = default);

    /// <summary>
    /// Creates a new Umbraco member account and signs them in.
    /// </summary>
    /// <param name="parameters">Parameters for member creation.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The member's Key (GUID) if successful, null otherwise.</returns>
    Task<Guid?> CreateMemberAsync(CreateCheckoutMemberParameters parameters, CancellationToken ct = default);

    /// <summary>
    /// Gets or creates the default member group for checkout customers.
    /// </summary>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The member group's Key (GUID) if successful.</returns>
    Task<Guid?> GetOrEnsureMemberGroupAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets the member key for a signed-in member by email.
    /// </summary>
    /// <param name="email">The member's email address.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The member's Key (GUID) if found, null otherwise.</returns>
    Task<Guid?> GetMemberKeyByEmailAsync(string email, CancellationToken ct = default);

    /// <summary>
    /// Initiates a password reset for a member account.
    /// Always returns success to prevent email enumeration attacks.
    /// </summary>
    /// <param name="email">The member's email address.</param>
    /// <param name="resetBaseUrl">Optional base URL for the reset link. If not provided, uses settings.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Result (always success to prevent enumeration).</returns>
    Task<ForgotPasswordResultDto> InitiatePasswordResetAsync(string email, string? resetBaseUrl = null, CancellationToken ct = default);

    /// <summary>
    /// Validates a password reset token.
    /// </summary>
    /// <param name="email">The member's email address.</param>
    /// <param name="token">The reset token from the email link.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>Result indicating whether the token is valid.</returns>
    Task<ValidateResetTokenResultDto> ValidateResetTokenAsync(string email, string token, CancellationToken ct = default);

    /// <summary>
    /// Completes a password reset using a valid token.
    /// </summary>
    Task<ResetPasswordResultDto> ResetPasswordAsync(ResetPasswordParameters parameters, CancellationToken ct = default);
}
