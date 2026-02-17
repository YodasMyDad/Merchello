using Merchello.Core.Shared.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Settings;

public class MerchelloSettingsDefaultsTests
{
    [Fact]
    public void EnableCheckout_ShouldDefaultToTrue()
    {
        var settings = new MerchelloSettings();
        settings.EnableCheckout.ShouldBeTrue();
    }

    [Fact]
    public void EnableProductRendering_ShouldDefaultToTrue()
    {
        var settings = new MerchelloSettings();
        settings.EnableProductRendering.ShouldBeTrue();
    }
}
