using System.Text;
using Merchello.Core.Tax.Providers.Interfaces;
using Moq;
using Shouldly;
using Merchello.Tests.TestInfrastructure;
using Xunit;

namespace Merchello.Tests.Tax.Providers;

[Collection("Integration Tests")]
public class TaxProviderManagerSecurityTests : IClassFixture<RealTaxProviderManagerFixture>
{
    private readonly RealTaxProviderManagerFixture _fixture;

    public TaxProviderManagerSecurityTests(RealTaxProviderManagerFixture fixture)
    {
        _fixture = fixture;
        _fixture.Services.ResetDatabase();
        _fixture.Services.ResetMocks();
    }

    [Fact]
    public async Task SaveProviderSettingsAsync_EncryptsAtRest_AndDecryptsOnRead()
    {
        var protectorMock = new Mock<IProviderSettingsProtector>();
        protectorMock
            .Setup(x => x.Protect(It.IsAny<string>()))
            .Returns((string plaintext) => "enc::" + Convert.ToBase64String(Encoding.UTF8.GetBytes(plaintext)));
        protectorMock
            .Setup(x => x.IsProtected(It.IsAny<string>()))
            .Returns((string payload) => payload.StartsWith("enc::", StringComparison.Ordinal));
        protectorMock
            .Setup(x => x.Unprotect(It.IsAny<string>()))
            .Returns((string payload) =>
            {
                var encoded = payload["enc::".Length..];
                return Encoding.UTF8.GetString(Convert.FromBase64String(encoded));
            });

        using var manager = _fixture.CreateTaxProviderManager(protectorMock.Object);

        var secret = "secret-license-key-123";
        var saveResult = await manager.SaveProviderSettingsAsync(
            "deterministic-external",
            new Dictionary<string, string>
            {
                ["licenseKey"] = secret,
                ["accountId"] = "acct-1"
            });
        saveResult.ShouldBeTrue();

        await using var db = _fixture.Services.CreateDbContext();
        var persisted = db.ProviderConfigurations
            .OfType<Merchello.Core.Tax.Models.TaxProviderSetting>()
            .FirstOrDefault(x => x.ProviderKey == "deterministic-external");
        persisted.ShouldNotBeNull();
        persisted.SettingsJson.ShouldStartWith("enc::");
        persisted.SettingsJson.ShouldNotContain(secret);

        var providers = await manager.GetProvidersAsync();
        var deterministic = providers.FirstOrDefault(x =>
            string.Equals(x.Metadata.Alias, "deterministic-external", StringComparison.OrdinalIgnoreCase));
        deterministic.ShouldNotBeNull();
        deterministic.Configuration.ShouldNotBeNull();
        deterministic.Configuration!.GetValue("licenseKey").ShouldBe(secret);
    }

}
