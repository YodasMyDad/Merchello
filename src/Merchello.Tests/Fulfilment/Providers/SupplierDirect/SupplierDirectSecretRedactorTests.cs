using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.SupplierDirect;

public class SupplierDirectSecretRedactorTests
{
    [Fact]
    public void RedactSecrets_RedactsPasswordInFtpUrl()
    {
        var input = "ftp://supplier-user:super-secret-password@supplier.example.com/orders";

        var redacted = SupplierDirectSecretRedactor.RedactSecrets(input);

        redacted.ShouldContain("[REDACTED]");
        redacted.ShouldNotContain("super-secret-password");
    }

    [Fact]
    public void RedactSecrets_RedactsPasswordParameters()
    {
        var input = "upload failed; password=super-secret; host=supplier.example.com";

        var redacted = SupplierDirectSecretRedactor.RedactSecrets(input);

        redacted.ShouldContain("password=[REDACTED]");
        redacted.ShouldNotContain("super-secret");
    }

    [Fact]
    public void RedactSecrets_RedactsLabeledAndRawFingerprints()
    {
        const string rawFingerprint = "aa:bb:cc:dd:ee:ff:11:22:33:44:55:66";
        var input = $"fingerprint={rawFingerprint}; presented={rawFingerprint}";

        var redacted = SupplierDirectSecretRedactor.RedactSecrets(input);

        redacted.ShouldContain("[REDACTED]");
        redacted.ShouldNotContain(rawFingerprint);
    }

    [Fact]
    public void RedactSecrets_NullInput_ReturnsEmptyString()
    {
        SupplierDirectSecretRedactor.RedactSecrets(null).ShouldBe(string.Empty);
    }
}
