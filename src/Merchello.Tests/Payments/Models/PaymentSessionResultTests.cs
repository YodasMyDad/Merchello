using Merchello.Core.Payments.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Models;

public class PaymentSessionResultTests
{
    [Fact]
    public void Redirect_SetsIntegrationTypeAndRedirectUrl()
    {
        // Arrange
        var redirectUrl = "https://payment.provider.com/checkout/abc123";
        var sessionId = "session-123";

        // Act
        var result = PaymentSessionResult.Redirect(redirectUrl, sessionId);

        // Assert
        result.Success.ShouldBeTrue();
        result.IntegrationType.ShouldBe(PaymentIntegrationType.Redirect);
        result.RedirectUrl.ShouldBe(redirectUrl);
        result.SessionId.ShouldBe(sessionId);
        result.ErrorMessage.ShouldBeNull();
        result.FormFields.ShouldBeNull();
        result.ClientToken.ShouldBeNull();
    }

    [Fact]
    public void DirectForm_SetsIntegrationTypeAndFormFields()
    {
        // Arrange
        List<CheckoutFormField> formFields =
        [
            new() { Key = "poNumber", Label = "PO Number", FieldType = CheckoutFieldType.Text, IsRequired = true },
            new() { Key = "notes", Label = "Notes", FieldType = CheckoutFieldType.Textarea, IsRequired = false }
        ];
        var sessionId = "session-456";

        // Act
        var result = PaymentSessionResult.DirectForm(formFields, sessionId);

        // Assert
        result.Success.ShouldBeTrue();
        result.IntegrationType.ShouldBe(PaymentIntegrationType.DirectForm);
        result.FormFields.ShouldNotBeNull();
        result.FormFields!.Count().ShouldBe(2);
        result.SessionId.ShouldBe(sessionId);
        result.RedirectUrl.ShouldBeNull();
        result.ClientToken.ShouldBeNull();
    }
}
