using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Fulfilment.Handlers;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Notifications;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Handlers;

public class FulfilmentTimelineHandlerTests
{
    [Fact]
    public async Task HandleAsync_SubmittedEmailReference_WritesExpectedTimelineNote()
    {
        var invoiceServiceMock = new Mock<IInvoiceService>();
        AddInvoiceNoteParameters? capturedParameters = null;

        invoiceServiceMock
            .Setup(x => x.AddNoteAsync(It.IsAny<AddInvoiceNoteParameters>(), It.IsAny<CancellationToken>()))
            .Callback<AddInvoiceNoteParameters, CancellationToken>((parameters, _) => capturedParameters = parameters)
            .ReturnsAsync(new Merchello.Core.Shared.Models.CrudResult<InvoiceNote> { ResultObject = new InvoiceNote() });

        var handler = new FulfilmentTimelineHandler(
            invoiceServiceMock.Object,
            NullLogger<FulfilmentTimelineHandler>.Instance);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            InvoiceId = Guid.NewGuid(),
            FulfilmentProviderReference = "email:8d0eeff4-ae7b-41b5-93d1-89fce3a0a047"
        };
        var providerConfig = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "supplier-direct",
            IsEnabled = true
        };

        await handler.HandleAsync(new FulfilmentSubmittedNotification(order, providerConfig), CancellationToken.None);

        capturedParameters.ShouldNotBeNull();
        capturedParameters!.InvoiceId.ShouldBe(order.InvoiceId);
        capturedParameters.AuthorName.ShouldBe("System");
        capturedParameters.VisibleToCustomer.ShouldBeFalse();
        capturedParameters.Text.ShouldContain("Supplier order queued via email");
        capturedParameters.Text.ShouldContain("8d0eeff4-ae7b-41b5-93d1-89fce3a0a047");
    }

    [Fact]
    public async Task HandleAsync_AttemptFailed_RedactsSecretsInTimelineNote()
    {
        var invoiceServiceMock = new Mock<IInvoiceService>();
        AddInvoiceNoteParameters? capturedParameters = null;

        invoiceServiceMock
            .Setup(x => x.AddNoteAsync(It.IsAny<AddInvoiceNoteParameters>(), It.IsAny<CancellationToken>()))
            .Callback<AddInvoiceNoteParameters, CancellationToken>((parameters, _) => capturedParameters = parameters)
            .ReturnsAsync(new Merchello.Core.Shared.Models.CrudResult<InvoiceNote> { ResultObject = new InvoiceNote() });

        var handler = new FulfilmentTimelineHandler(
            invoiceServiceMock.Object,
            NullLogger<FulfilmentTimelineHandler>.Instance);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            InvoiceId = Guid.NewGuid(),
            FulfilmentRetryCount = 2
        };
        var providerConfig = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "supplier-direct",
            IsEnabled = true
        };
        var errorMessage = "Upload failed for ftp://user:super-secret-password@supplier.example.com; password=hunter2";

        await handler.HandleAsync(
            new FulfilmentSubmissionAttemptFailedNotification(order, providerConfig, errorMessage, 2, 5),
            CancellationToken.None);

        capturedParameters.ShouldNotBeNull();
        capturedParameters!.Text.ShouldContain("attempt 2/5");
        capturedParameters.Text.ShouldContain("[REDACTED]");
        capturedParameters.Text.ShouldNotContain("super-secret-password");
        capturedParameters.Text.ShouldNotContain("hunter2");
    }
}
