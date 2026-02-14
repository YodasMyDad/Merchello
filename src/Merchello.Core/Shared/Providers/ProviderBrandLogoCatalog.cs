using Merchello.Core.Payments.Models;

namespace Merchello.Core.Shared.Providers;

/// <summary>
/// Central catalog for provider and payment-method brand logos.
/// </summary>
public static class ProviderBrandLogoCatalog
{
    public const string Stripe = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#635BFF"/></svg>""";
    public const string Braintree = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.18L18 8v8l-6 3.75L6 16V8l6-3.82z" fill="#003366"/><path d="M12 6l-4 2.5v5L12 16l4-2.5v-5L12 6zm0 1.55l2.5 1.56v3.12L12 13.8l-2.5-1.56V9.1L12 7.55z" fill="#003366"/></svg>""";
    public const string PayPal = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" fill="#003087"/><path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132l-1.41 8.95a.568.568 0 0 0 .562.655h3.94c.578 0 1.069-.42 1.16-.99l.045-.24.92-5.815.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.658-1.377z" fill="#0070E0"/></svg>""";
    public const string WorldPay = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 6l3.5 12h2.5l2-7 2 7h2.5l3.5-12h-2.5l-2.25 8-2.25-8h-2l-2.25 8-2.25-8H2z" fill="#DF1B26"/></svg>""";
    public const string ApplePay = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/></svg>""";
    public const string GooglePay = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>""";
    public const string Venmo = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 1c.87 1.44 1.26 2.92 1.26 4.8 0 5.98-5.1 13.75-9.24 19.2H4.2L1 2.85l6.24-.6 1.86 14.9C11.04 13.5 13.2 8.18 13.2 5.08c0-1.74-.3-2.92-.78-3.9L19.5 1z" fill="#3D95CE"/></svg>""";
    public const string LinkByStripe = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#00D66F"/><path d="M13.5 8.5a3 3 0 0 1 0 4.24l-1.42 1.42a3 3 0 0 1-4.24-4.24l.7-.7" stroke="white" stroke-width="1.5" stroke-linecap="round"/><path d="M10.5 15.5a3 3 0 0 1 0-4.24l1.42-1.42a3 3 0 0 1 4.24 4.24l-.7.7" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>""";
    public const string AmazonPay = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705a.657.657 0 01-.745.074c-1.047-.87-1.235-1.272-1.812-2.101-1.729 1.764-2.953 2.29-5.191 2.29-2.652 0-4.714-1.636-4.714-4.91 0-2.558 1.386-4.297 3.358-5.148 1.71-.752 4.099-.886 5.922-1.094v-.41c0-.752.058-1.643-.383-2.294-.385-.578-1.124-.816-1.774-.816-1.205 0-2.277.618-2.539 1.897-.054.283-.263.562-.551.576l-3.083-.333c-.26-.057-.548-.266-.473-.66C5.89 1.96 8.585.75 11.021.75c1.246 0 2.876.331 3.858 1.275 1.247 1.163 1.127 2.713 1.127 4.404v3.989c0 1.199.498 1.726.966 2.374.164.232.201.51-.009.681-.525.436-1.456 1.249-1.968 1.704l-.15.118z" fill="#FF9900"/><path d="M21.533 18.504c-2.055 1.544-5.034 2.367-7.598 2.367-3.595 0-6.835-1.33-9.282-3.547-.193-.174-.021-.413.21-.277 2.643 1.54 5.913 2.465 9.289 2.465 2.279 0 4.782-.472 7.088-1.452.347-.147.64.229.293.444z" fill="#FF9900"/><path d="M22.375 17.541c-.262-.338-1.74-.159-2.403-.08-.201.024-.232-.152-.051-.28 1.176-.828 3.106-.589 3.332-.312.227.279-.059 2.21-1.162 3.131-.17.142-.332.066-.256-.12.249-.618.805-2.001.54-2.339z" fill="#FF9900"/></svg>""";
    public const string Klarna = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#FFB3C7"/><path d="M6.5 7h1.875c0 1.522-.655 2.916-1.736 3.893L9.5 15H7.25l-2.25-3.25V15H3.5V7h1.5v3.25C5.5 9.25 6.5 8.25 6.5 7zm5.75 0h1.5v8h-1.5V7zm3 6.5a1 1 0 112 0 1 1 0 01-2 0zM17.5 7h1.5v8h-1.5V7z" fill="#0A0B09"/></svg>""";
    public const string Ideal = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#CC0066"/><path d="M12 8v8M8 12h8" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>""";
    public const string Bancontact = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#005498"/><circle cx="9" cy="12" r="4" fill="none" stroke="#FFD800" stroke-width="1.5"/><circle cx="15" cy="12" r="4" fill="none" stroke="#FFD800" stroke-width="1.5"/></svg>""";
    public const string Sepa = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#003399"/><circle cx="12" cy="12" r="5" fill="none" stroke="#FFCC00" stroke-width="1.5"/><path d="M7 12h10" stroke="#FFCC00" stroke-width="1"/></svg>""";
    public const string Eps = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#C8202F"/><path d="M6 16V10l6-4 6 4v6" stroke="white" stroke-width="1.5" fill="none"/><rect x="10" y="12" width="4" height="4" fill="white"/></svg>""";
    public const string P24 = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#D13239"/><path d="M8 8h4a3 3 0 0 1 0 6H8V8zm0 6v4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>""";
    public const string Ups = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C8 2 4 3.5 4 3.5V13c0 5 4 8.5 8 10 4-1.5 8-5 8-10V3.5S16 2 12 2z" fill="#351C15"/><path d="M12 4.5c-3 0-6 1-6 1V13c0 4 3 6.8 6 8 3-1.2 6-4 6-8V5.5s-3-1-6-1z" fill="#FFB500"/><path d="M10 9v6h1.5v-2h1c1.4 0 2.5-.9 2.5-2s-1.1-2-2.5-2H10zm1.5 1.2h1c.6 0 1 .3 1 .8s-.4.8-1 .8h-1V10.2z" fill="#351C15"/></svg>""";
    public const string FedEx = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="6" width="20" height="12" rx="2" fill="#4D148C"/><text x="12" y="14.5" text-anchor="middle" fill="white" font-size="7" font-weight="bold" font-family="Arial, sans-serif">Fe<tspan fill="#FF6600">Ex</tspan></text></svg>""";
    public const string Avalara = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" fill="#66B245"/><path d="M10.5 16l-3-3 1.06-1.06L10.5 13.88l4.94-4.94L16.5 10l-6 6z" fill="white"/></svg>""";
    public const string ShipBob = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M3 17h18l-2-6H5l-2 6z" fill="#5856D6"/><path d="M12 3v8M12 11l-4-3M12 11l4-3" stroke="#5856D6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19c1.5 1 3.5 2 7 2s5.5-1 7-2" stroke="#5856D6" stroke-width="1.5" stroke-linecap="round"/></svg>""";
    public const string ShipMonk = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="6" r="3" fill="#00C853"/><path d="M12 10c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z" fill="#00C853"/><path d="M8 20l4-4 4 4" stroke="#00C853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>""";
    public const string ShipHero = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="#FF6B35"/><path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>""";
    public const string HelmWms = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" fill="none" stroke="#1E3A5F" stroke-width="1.5"/><circle cx="12" cy="12" r="8" fill="none" stroke="#1E3A5F" stroke-width="1.5"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.34 6.34l2.83 2.83M14.83 14.83l2.83 2.83M6.34 17.66l2.83-2.83M14.83 9.17l2.83-2.83" stroke="#1E3A5F" stroke-width="1.5" stroke-linecap="round"/></svg>""";
    public const string Deliverr = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#6366F1"/></svg>""";
    public const string Flexport = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="none" stroke="#0066FF" stroke-width="1.5"/><path d="M3 12h18M12 3c-2.5 3-4 6-4 9s1.5 6 4 9c2.5-3 4-6 4-9s-1.5-6-4-9z" fill="none" stroke="#0066FF" stroke-width="1.5"/></svg>""";
    public const string RedStag = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4c-1 2-2 3-2 5s1 3 2 4c1-1 2-2 2-4s-1-3-2-5zM8 6c-2-1-4-1-5 0 1 2 3 3 5 3M16 6c2-1 4-1 5 0-1 2-3 3-5 3M12 13v8M8 17l4 4 4-4" stroke="#C41E3A" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>""";

    private static readonly IReadOnlyDictionary<string, string> PaymentProviderIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["stripe"] = Stripe,
            ["braintree"] = Braintree,
            ["paypal"] = PayPal,
            ["worldpay"] = WorldPay,
            ["amazonpay"] = AmazonPay
        };

    private static readonly IReadOnlyDictionary<string, string> PaymentMethodIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["paypal"] = PayPal,
            ["paypal-express"] = PayPal,
            ["applepay"] = ApplePay,
            ["googlepay"] = GooglePay,
            ["google-pay"] = GooglePay,
            ["venmo"] = Venmo,
            ["link"] = LinkByStripe,
            ["amazonpay"] = AmazonPay,
            ["klarna"] = Klarna,
            ["ideal"] = Ideal,
            ["bancontact"] = Bancontact,
            ["sepa"] = Sepa,
            ["eps"] = Eps,
            ["p24"] = P24
        };

    private static readonly IReadOnlyDictionary<string, string> PaymentMethodTypeIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [PaymentMethodTypes.ApplePay] = ApplePay,
            [PaymentMethodTypes.GooglePay] = GooglePay,
            [PaymentMethodTypes.AmazonPay] = AmazonPay,
            [PaymentMethodTypes.PayPal] = PayPal,
            [PaymentMethodTypes.Link] = LinkByStripe,
            [PaymentMethodTypes.Venmo] = Venmo
        };

    private static readonly IReadOnlyDictionary<string, string> ShippingProviderIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["ups"] = Ups,
            ["fedex"] = FedEx
        };

    private static readonly IReadOnlyDictionary<string, string> TaxProviderIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["avalara"] = Avalara
        };

    private static readonly IReadOnlyDictionary<string, string> FulfilmentProviderIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["shipbob"] = ShipBob,
            ["shipmonk"] = ShipMonk,
            ["shiphero"] = ShipHero,
            ["helm-wms"] = HelmWms,
            ["deliverr"] = Deliverr,
            ["flexport"] = Flexport,
            ["red-stag"] = RedStag
        };

    /// <summary>
    /// Gets a branded icon for payment provider metadata.
    /// </summary>
    public static string? GetPaymentProviderIconHtml(string? alias)
    {
        var normalized = Normalize(alias);
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        if (PaymentProviderIcons.TryGetValue(normalized, out var exact))
        {
            return exact;
        }

        if (Contains(normalized, "stripe"))
        {
            return Stripe;
        }

        if (Contains(normalized, "braintree"))
        {
            return Braintree;
        }

        if (Contains(normalized, "paypal"))
        {
            return PayPal;
        }

        if (Contains(normalized, "worldpay"))
        {
            return WorldPay;
        }

        if (Contains(normalized, "amazon"))
        {
            return AmazonPay;
        }

        return null;
    }

    /// <summary>
    /// Gets a branded icon for payment methods.
    /// </summary>
    public static string? GetPaymentMethodIconHtml(string? methodAlias, string? providerAlias = null, string? methodType = null)
    {
        var normalizedMethodAlias = Normalize(methodAlias);
        if (!string.IsNullOrEmpty(normalizedMethodAlias) &&
            PaymentMethodIcons.TryGetValue(normalizedMethodAlias, out var exactMethod))
        {
            return exactMethod;
        }

        if (!string.IsNullOrWhiteSpace(methodType) &&
            PaymentMethodTypeIcons.TryGetValue(methodType, out var typeIcon))
        {
            return typeIcon;
        }

        if (!string.IsNullOrEmpty(normalizedMethodAlias))
        {
            if (Contains(normalizedMethodAlias, "paypal")) return PayPal;
            if (Contains(normalizedMethodAlias, "apple")) return ApplePay;
            if (Contains(normalizedMethodAlias, "google")) return GooglePay;
            if (Contains(normalizedMethodAlias, "venmo")) return Venmo;
            if (Contains(normalizedMethodAlias, "link")) return LinkByStripe;
            if (Contains(normalizedMethodAlias, "amazon")) return AmazonPay;
            if (Contains(normalizedMethodAlias, "klarna")) return Klarna;
            if (Contains(normalizedMethodAlias, "ideal")) return Ideal;
            if (Contains(normalizedMethodAlias, "bancontact")) return Bancontact;
            if (Contains(normalizedMethodAlias, "sepa")) return Sepa;
            if (Contains(normalizedMethodAlias, "eps")) return Eps;
            if (Contains(normalizedMethodAlias, "p24")) return P24;
        }

        return GetPaymentProviderIconHtml(providerAlias);
    }

    /// <summary>
    /// Gets a branded icon for shipping provider metadata.
    /// </summary>
    public static string? GetShippingProviderIconSvg(string? providerKey)
    {
        var normalized = Normalize(providerKey);
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        if (ShippingProviderIcons.TryGetValue(normalized, out var exact))
        {
            return exact;
        }

        if (Contains(normalized, "ups"))
        {
            return Ups;
        }

        if (Contains(normalized, "fedex"))
        {
            return FedEx;
        }

        return null;
    }

    /// <summary>
    /// Gets a branded icon for tax provider metadata.
    /// </summary>
    public static string? GetTaxProviderIconSvg(string? providerAlias)
    {
        var normalized = Normalize(providerAlias);
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        if (TaxProviderIcons.TryGetValue(normalized, out var exact))
        {
            return exact;
        }

        return Contains(normalized, "avalara") ? Avalara : null;
    }

    /// <summary>
    /// Gets a branded icon for fulfilment provider metadata.
    /// </summary>
    public static string? GetFulfilmentProviderIconSvg(string? providerKey)
    {
        var normalized = Normalize(providerKey);
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        if (FulfilmentProviderIcons.TryGetValue(normalized, out var exact))
        {
            return exact;
        }

        if (Contains(normalized, "shipbob")) return ShipBob;
        if (Contains(normalized, "shipmonk")) return ShipMonk;
        if (Contains(normalized, "shiphero")) return ShipHero;
        if (Contains(normalized, "helm")) return HelmWms;
        if (Contains(normalized, "deliverr")) return Deliverr;
        if (Contains(normalized, "flexport")) return Flexport;
        if (Contains(normalized, "stag")) return RedStag;

        return null;
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();
    }

    private static bool Contains(string value, string token)
    {
        return value.Contains(token, StringComparison.OrdinalIgnoreCase);
    }
}
