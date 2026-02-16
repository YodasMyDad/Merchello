using System.Security.Cryptography;
using System.Text;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.UCP.Models;
using Merchello.Core.Protocols.UCP.Services.Interfaces;
using Merchello.Core.Protocols.Webhooks;
using Merchello.Core.Protocols.Webhooks.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

public class UcpSignatureVerificationTests
{
    [Fact]
    public async Task AuthenticateAsync_WithValidSignatureOverRawBody_Passes()
    {
        using var signingKey = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var (profileKey, signer, profileUri) = CreateSigningMaterial(signingKey, "key-valid");
        const string payload = "{\"session\":\"abc\",\"amount\":1500}";

        var signature = await signer.SignAsync(payload, "key-valid");
        var context = CreateTransactionalContext(profileUri, payload, signature);

        var profileService = new Mock<IUcpAgentProfileService>();
        profileService.Setup(x => x.GetProfileAsync(profileUri, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UcpAgentProfile { SigningKeys = [profileKey] });

        var authenticator = new UcpAgentAuthenticator(
            profileService.Object,
            signer,
            Mock.Of<ILogger<UcpAgentAuthenticator>>());

        var result = await authenticator.AuthenticateAsync(context.Request);

        result.IsAuthenticated.ShouldBeTrue();
        result.Identity.ShouldNotBeNull();
        result.Identity.ProfileUri.ShouldBe(profileUri);
    }

    [Fact]
    public async Task AuthenticateAsync_WithTamperedPayload_FailsVerification()
    {
        using var signingKey = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var (profileKey, signer, profileUri) = CreateSigningMaterial(signingKey, "key-tamper");
        const string originalPayload = "{\"session\":\"abc\",\"amount\":1500}";
        const string tamperedPayload = "{\"session\":\"abc\",\"amount\":2500}";

        var signature = await signer.SignAsync(originalPayload, "key-tamper");
        var context = CreateTransactionalContext(profileUri, tamperedPayload, signature);

        var profileService = new Mock<IUcpAgentProfileService>();
        profileService.Setup(x => x.GetProfileAsync(profileUri, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UcpAgentProfile { SigningKeys = [profileKey] });

        var authenticator = new UcpAgentAuthenticator(
            profileService.Object,
            signer,
            Mock.Of<ILogger<UcpAgentAuthenticator>>());

        var result = await authenticator.AuthenticateAsync(context.Request);

        result.IsAuthenticated.ShouldBeFalse();
        result.ErrorCode.ShouldBe("invalid_request_signature");
    }

    [Fact]
    public async Task AuthenticateAsync_WithUnknownKeyIdInProfile_FailsVerification()
    {
        using var signingKey = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var (_, signer, profileUri) = CreateSigningMaterial(signingKey, "key-signature");
        const string payload = "{\"session\":\"abc\",\"amount\":1500}";

        var signature = await signer.SignAsync(payload, "key-signature");
        var context = CreateTransactionalContext(profileUri, payload, signature);

        // Profile has a different key id than the detached signature header kid
        using var otherKey = ECDsa.Create(ECCurve.NamedCurves.nistP256);
        var otherPublicKey = otherKey.ExportParameters(false);
        var mismatchedProfileKey = new UcpSigningKey
        {
            Kty = "EC",
            Kid = "key-other",
            Crv = "P-256",
            X = Base64UrlEncoder.Encode(otherPublicKey.Q.X!),
            Y = Base64UrlEncoder.Encode(otherPublicKey.Q.Y!)
        };

        var profileService = new Mock<IUcpAgentProfileService>();
        profileService.Setup(x => x.GetProfileAsync(profileUri, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UcpAgentProfile { SigningKeys = [mismatchedProfileKey] });

        var authenticator = new UcpAgentAuthenticator(
            profileService.Object,
            signer,
            Mock.Of<ILogger<UcpAgentAuthenticator>>());

        var result = await authenticator.AuthenticateAsync(context.Request);

        result.IsAuthenticated.ShouldBeFalse();
        result.ErrorCode.ShouldBe("invalid_request_signature");
    }

    private static (UcpSigningKey Key, IWebhookSigner Signer, string ProfileUri) CreateSigningMaterial(
        ECDsa privateKey,
        string keyId)
    {
        var keyStore = new Mock<ISigningKeyStore>();
        keyStore.Setup(x => x.GetEcdsaPrivateKeyAsync(keyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(privateKey);

        var signer = new WebhookSigner(keyStore.Object, Mock.Of<ILogger<WebhookSigner>>());

        var parameters = privateKey.ExportParameters(false);
        var profileKey = new UcpSigningKey
        {
            Kty = "EC",
            Kid = keyId,
            Crv = "P-256",
            X = Base64UrlEncoder.Encode(parameters.Q.X!),
            Y = Base64UrlEncoder.Encode(parameters.Q.Y!)
        };

        return (profileKey, signer, "https://agent.example.com/profile");
    }

    private static DefaultHttpContext CreateTransactionalContext(string profileUri, string payload, string signature)
    {
        var bytes = Encoding.UTF8.GetBytes(payload);
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/checkout-sessions";
        context.Request.Method = HttpMethods.Post;
        context.Request.Body = new MemoryStream(bytes);
        context.Request.ContentLength = bytes.Length;
        context.Request.Headers[ProtocolHeaders.UcpAgent] = $"profile=\"{profileUri}\"";
        context.Request.Headers[ProtocolHeaders.RequestSignature] = signature;
        return context;
    }
}
