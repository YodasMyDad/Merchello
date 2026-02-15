using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Providers;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shared.Providers;

public class ProviderBrandLogoCatalogTests
{
    [Fact]
    public void GetPaymentProviderIconHtml_ResolvesExactAndPartialAliases()
    {
        ProviderBrandLogoCatalog.GetPaymentProviderIconHtml("stripe")
            .ShouldBe(ProviderBrandLogoCatalog.Stripe);
        ProviderBrandLogoCatalog.GetPaymentProviderIconHtml("braintree")
            .ShouldBe(ProviderBrandLogoCatalog.Braintree);
        ProviderBrandLogoCatalog.GetPaymentProviderIconHtml("worldpay-live")
            .ShouldBe(ProviderBrandLogoCatalog.WorldPay);
        ProviderBrandLogoCatalog.GetPaymentProviderIconHtml("amazon-pay-gateway")
            .ShouldBe(ProviderBrandLogoCatalog.AmazonPay);
    }

    [Fact]
    public void GetPaymentMethodIconHtml_ResolvesByAliasTypeAndProviderFallback()
    {
        ProviderBrandLogoCatalog.GetPaymentMethodIconHtml("paypal", "stripe", PaymentMethodTypes.PayPal)
            .ShouldBe(ProviderBrandLogoCatalog.PayPal);
        ProviderBrandLogoCatalog.GetPaymentMethodIconHtml("link", "stripe", PaymentMethodTypes.Link)
            .ShouldBe(ProviderBrandLogoCatalog.LinkByStripe);
        ProviderBrandLogoCatalog.GetPaymentMethodIconHtml("amazonpay", "stripe", PaymentMethodTypes.AmazonPay)
            .ShouldBe(ProviderBrandLogoCatalog.AmazonPay);
        ProviderBrandLogoCatalog.GetPaymentMethodIconHtml("klarna", "stripe", PaymentMethodTypes.BuyNowPayLater)
            .ShouldBe(ProviderBrandLogoCatalog.Klarna);

        ProviderBrandLogoCatalog.GetPaymentMethodIconHtml("unknown", "stripe", PaymentMethodTypes.GooglePay)
            .ShouldBe(ProviderBrandLogoCatalog.GooglePay);
        ProviderBrandLogoCatalog.GetPaymentMethodIconHtml("unknown", "paypal", null)
            .ShouldBe(ProviderBrandLogoCatalog.PayPal);

        ProviderBrandLogoCatalog.GetPaymentMethodIconHtml("unknown", "unknown", null)
            .ShouldBeNull();
    }

    [Fact]
    public void GetShippingProviderIconSvg_ResolvesKnownKeys()
    {
        ProviderBrandLogoCatalog.GetShippingProviderIconSvg("ups")
            .ShouldBe(ProviderBrandLogoCatalog.Ups);
        ProviderBrandLogoCatalog.GetShippingProviderIconSvg("my-fedex-provider")
            .ShouldBe(ProviderBrandLogoCatalog.FedEx);
        ProviderBrandLogoCatalog.GetShippingProviderIconSvg("custom-shipping")
            .ShouldBeNull();
    }

    [Fact]
    public void GetTaxProviderIconSvg_ResolvesKnownAliases()
    {
        ProviderBrandLogoCatalog.GetTaxProviderIconSvg("avalara")
            .ShouldBe(ProviderBrandLogoCatalog.Avalara);
        ProviderBrandLogoCatalog.GetTaxProviderIconSvg("avalara-live")
            .ShouldBe(ProviderBrandLogoCatalog.Avalara);
        ProviderBrandLogoCatalog.GetTaxProviderIconSvg("manual-tax")
            .ShouldBeNull();
    }

    [Fact]
    public void GetFulfilmentProviderIconSvg_ResolvesKnownKeys()
    {
        ProviderBrandLogoCatalog.GetFulfilmentProviderIconSvg("shipbob")
            .ShouldBe(ProviderBrandLogoCatalog.ShipBob);
        ProviderBrandLogoCatalog.GetFulfilmentProviderIconSvg("my-shipmonk-provider")
            .ShouldBe(ProviderBrandLogoCatalog.ShipMonk);
        ProviderBrandLogoCatalog.GetFulfilmentProviderIconSvg("shiphero-prod")
            .ShouldBe(ProviderBrandLogoCatalog.ShipHero);
        ProviderBrandLogoCatalog.GetFulfilmentProviderIconSvg("helm-v1")
            .ShouldBe(ProviderBrandLogoCatalog.HelmWms);
        ProviderBrandLogoCatalog.GetFulfilmentProviderIconSvg("custom-3pl")
            .ShouldBeNull();
    }
}
