using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Customers.Factories;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Notifications.CustomerNotifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Security;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.Common.Security;

namespace Merchello.Services;

/// <summary>
/// Service for managing member accounts during checkout.
/// </summary>
public class CheckoutMemberService(
    IMemberManager memberManager,
    IMemberSignInManager memberSignInManager,
    IMemberGroupService memberGroupService,
    ICustomerService customerService,
    CustomerFactory customerFactory,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<MerchelloSettings> settings,
    IOptions<IdentityOptions> identityOptions,
    IHttpContextAccessor httpContextAccessor,
    ILogger<CheckoutMemberService> logger,
    IMerchelloStoreSettingsService? storeSettingsService = null) : ICheckoutMemberService
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly IdentityOptions _identityOptions = identityOptions.Value;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;

    /// <summary>
    /// Number of failed login attempts before showing forgot password link.
    /// </summary>
    private const int MaxFailedAttemptsBeforeForgotPassword = 3;

    /// <inheritdoc />
    public async Task<CheckEmailResultDto> CheckEmailAsync(string email, CancellationToken ct = default)
    {
        var existingMember = await memberManager.FindByEmailAsync(email);
        return new CheckEmailResultDto { HasExistingAccount = existingMember != null };
    }

    /// <inheritdoc />
    public async Task<ValidatePasswordResultDto> ValidatePasswordAsync(string password, CancellationToken ct = default)
    {
        var result = await memberManager.ValidatePasswordAsync(password);
        return new ValidatePasswordResultDto
        {
            IsValid = result.Succeeded,
            Errors = result.Errors.Select(e => e.Description).ToList()
        };
    }

    /// <inheritdoc />
    public async Task<SignInResultDto> SignInAsync(string email, string password, CancellationToken ct = default)
    {
        var member = await memberManager.FindByEmailAsync(email);
        if (member == null)
        {
            return new SignInResultDto { Success = false, ErrorMessage = "Account not found" };
        }

        var signInResult = await memberSignInManager.PasswordSignInAsync(
            member.UserName!, password, isPersistent: false, lockoutOnFailure: true);

        if (signInResult.Succeeded)
        {
            ClearFailedAttempts(email);
            await EnsureMemberInGroupAsync(member);
            return new SignInResultDto { Success = true, MemberKey = member.Key };
        }

        var failedAttempts = IncrementFailedAttempts(email);
        return new SignInResultDto
        {
            Success = false,
            FailedAttempts = failedAttempts,
            ShowForgotPassword = failedAttempts >= MaxFailedAttemptsBeforeForgotPassword,
            ErrorMessage = signInResult.IsLockedOut
                ? "Account locked. Please try again later or reset your password."
                : "Invalid password"
        };
    }

    /// <inheritdoc />
    public async Task<Guid?> CreateMemberAsync(CreateCheckoutMemberParameters parameters, CancellationToken ct = default)
    {
        // 1. Ensure member group exists
        await GetOrEnsureMemberGroupAsync(ct);

        // 2. Check if member already exists
        var existingMember = await memberManager.FindByEmailAsync(parameters.Email);
        if (existingMember != null)
        {
            // Validate password before linking — prevents account hijacking
            var passwordValid = await memberManager.CheckPasswordAsync(existingMember, parameters.Password);
            if (!passwordValid) return null;

            await EnsureMemberInGroupAsync(existingMember);
            await memberSignInManager.SignInAsync(existingMember, isPersistent: false);
            return existingMember.Key;
        }

        // 3. Create member
        var identityUser = MemberIdentityUser.CreateNew(
            username: parameters.Email,
            email: parameters.Email,
            memberTypeAlias: _settings.DefaultMemberTypeAlias,
            isApproved: true,
            name: parameters.Name
        );

        var result = await memberManager.CreateAsync(identityUser, parameters.Password);
        if (!result.Succeeded) return null;

        // 4. Add member to group
        await EnsureMemberInGroupAsync(identityUser);

        // 5. Auto-login
        await memberSignInManager.SignInAsync(identityUser, isPersistent: false);

        return identityUser.Key;
    }

    /// <inheritdoc />
    public async Task<Guid?> GetOrEnsureMemberGroupAsync(CancellationToken ct = default)
    {
        var group = await memberGroupService.GetByNameAsync(_settings.DefaultMemberGroup);
        if (group != null) return group.Key;

        // Create the group
        var newGroup = new MemberGroup { Name = _settings.DefaultMemberGroup };
        var createResult = await memberGroupService.CreateAsync(newGroup);
        return createResult.Success ? createResult.Result?.Key : null;
    }

    /// <inheritdoc />
    public async Task<Guid?> GetMemberKeyByEmailAsync(string email, CancellationToken ct = default)
    {
        var member = await memberManager.FindByEmailAsync(email);
        return member?.Key;
    }

    /// <summary>
    /// Ensures a member is in the default MerchelloCustomer group.
    /// </summary>
    private async Task EnsureMemberInGroupAsync(MemberIdentityUser member)
    {
        var group = await memberGroupService.GetByNameAsync(_settings.DefaultMemberGroup);
        if (group == null) return;

        var roles = await memberManager.GetRolesAsync(member);
        if (roles.Contains(group.Name!)) return;

        await memberManager.AddToRolesAsync(member, [group.Name!]);
    }

    /// <summary>
    /// Increments failed login attempt counter in session.
    /// </summary>
    private int IncrementFailedAttempts(string email)
    {
        var session = httpContextAccessor.HttpContext?.Session;
        var key = $"checkout_login_attempts_{email.ToLowerInvariant()}";
        var attempts = session?.GetInt32(key) ?? 0;
        attempts++;
        session?.SetInt32(key, attempts);
        return attempts;
    }

    /// <summary>
    /// Clears failed login attempt counter in session.
    /// </summary>
    private void ClearFailedAttempts(string email)
    {
        var session = httpContextAccessor.HttpContext?.Session;
        var key = $"checkout_login_attempts_{email.ToLowerInvariant()}";
        session?.Remove(key);
    }

    /// <inheritdoc />
    public async Task<ForgotPasswordResultDto> InitiatePasswordResetAsync(
        string email,
        string? resetBaseUrl = null,
        CancellationToken ct = default)
    {
        // Always return success to prevent email enumeration
        var result = new ForgotPasswordResultDto();

        // Find member by email
        var member = await memberManager.FindByEmailAsync(email);
        if (member == null)
        {
            logger.LogDebug("Password reset requested for non-existent email: {Email}", email);
            return result;
        }

        // Find or create customer for the notification
        var customer = await customerService.GetByEmailAsync(email, ct);
        customer ??= customerFactory.CreateFromEmail(email);

        // Generate reset token via Umbraco Identity
        var token = await memberManager.GeneratePasswordResetTokenAsync(member);

        // Build reset URL
        var baseUrl = BuildSafePasswordResetBaseUrl(resetBaseUrl);
        var resetUrl = QueryHelpers.AddQueryString(baseUrl, new Dictionary<string, string?>
        {
            ["email"] = email,
            ["token"] = token
        });

        // Token expiry (display purposes - actual expiry managed by Umbraco Identity)
        var expiresUtc = DateTime.UtcNow.AddHours(1);

        // Publish notification for email handler
        await notificationPublisher.PublishAsync(
            new CustomerPasswordResetRequestedNotification(customer, token, resetUrl, expiresUtc),
            ct);

        logger.LogInformation("Password reset initiated for member: {Email}", email);

        return result;
    }

    /// <summary>
    /// Builds a safe password reset URL base and rejects external hosts to prevent token leakage.
    /// </summary>
    private string BuildSafePasswordResetBaseUrl(string? requestedBaseUrl)
    {
        var websiteUrl = _storeSettingsService?.GetRuntimeSettings().Merchello.Store.WebsiteUrl ??
                         _settings.Store.WebsiteUrl ??
                         string.Empty;
        var defaultBaseUrl = $"{websiteUrl.TrimEnd('/')}/checkout/reset-password";

        if (string.IsNullOrWhiteSpace(requestedBaseUrl))
        {
            return defaultBaseUrl;
        }

        if (!Uri.TryCreate(defaultBaseUrl, UriKind.Absolute, out var defaultUri))
        {
            logger.LogWarning(
                "Invalid configured WebsiteUrl for password reset. Falling back to default reset path.");
            return defaultBaseUrl;
        }

        if (!Uri.TryCreate(requestedBaseUrl, UriKind.Absolute, out var requestedUri))
        {
            logger.LogWarning(
                "Rejected password reset base URL {ResetBaseUrl}: must be an absolute URL.",
                requestedBaseUrl);
            return defaultBaseUrl;
        }

        var isHttpScheme =
            string.Equals(requestedUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(requestedUri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase);

        if (!isHttpScheme)
        {
            logger.LogWarning(
                "Rejected password reset base URL {ResetBaseUrl}: unsupported URI scheme.",
                requestedBaseUrl);
            return defaultBaseUrl;
        }

        if (!string.Equals(requestedUri.Scheme, defaultUri.Scheme, StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(
                "Rejected password reset base URL {ResetBaseUrl}: scheme does not match configured website URL.",
                requestedBaseUrl);
            return defaultBaseUrl;
        }

        if (!string.Equals(requestedUri.Host, defaultUri.Host, StringComparison.OrdinalIgnoreCase) ||
            requestedUri.Port != defaultUri.Port)
        {
            logger.LogWarning(
                "Rejected password reset base URL {ResetBaseUrl}: host does not match configured website URL.",
                requestedBaseUrl);
            return defaultBaseUrl;
        }

        return requestedUri.GetLeftPart(UriPartial.Path).TrimEnd('/');
    }

    /// <inheritdoc />
    public async Task<ValidateResetTokenResultDto> ValidateResetTokenAsync(
        string email,
        string token,
        CancellationToken ct = default)
    {
        var member = await memberManager.FindByEmailAsync(email);
        if (member == null)
        {
            return new ValidateResetTokenResultDto
            {
                IsValid = false,
                ErrorMessage = "Invalid or expired reset link."
            };
        }

        // Verify token using the configured password reset token provider
        var tokenProvider = _identityOptions.Tokens.PasswordResetTokenProvider;
        var isValid = await memberManager.VerifyUserTokenAsync(member, tokenProvider, "ResetPassword", token);

        if (!isValid)
        {
            return new ValidateResetTokenResultDto
            {
                IsValid = false,
                ErrorMessage = "This reset link has expired or is invalid. Please request a new one."
            };
        }

        return new ValidateResetTokenResultDto
        {
            IsValid = true,
            Email = email
        };
    }

    /// <inheritdoc />
    public async Task<ResetPasswordResultDto> ResetPasswordAsync(
        ResetPasswordParameters parameters,
        CancellationToken ct = default)
    {
        var member = await memberManager.FindByEmailAsync(parameters.Email);
        if (member == null)
        {
            return new ResetPasswordResultDto
            {
                Success = false,
                ErrorMessage = "Invalid or expired reset link."
            };
        }

        // Validate new password against requirements
        var passwordValidation = await memberManager.ValidatePasswordAsync(parameters.NewPassword);
        if (!passwordValidation.Succeeded)
        {
            return new ResetPasswordResultDto
            {
                Success = false,
                ErrorMessage = "Password does not meet requirements.",
                ValidationErrors = passwordValidation.Errors.Select(e => e.Description).ToList()
            };
        }

        // Reset the password
        var resetResult = await memberManager.ResetPasswordAsync(member, parameters.Token, parameters.NewPassword);

        if (!resetResult.Succeeded)
        {
            var errorMessage = resetResult.Errors.FirstOrDefault()?.Description
                ?? "Unable to reset password. The link may have expired.";

            return new ResetPasswordResultDto
            {
                Success = false,
                ErrorMessage = errorMessage
            };
        }

        logger.LogInformation("Password reset completed for member: {Email}", parameters.Email);

        return new ResetPasswordResultDto { Success = true };
    }
}
