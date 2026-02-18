using Merchello.Controllers;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Models;
using Merchello.Core.Fulfilment.Providers.SupplierDirect.Transport;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Suppliers.Models;
using Merchello.Core.Suppliers.Services.Interfaces;
using Merchello.Core.Suppliers.Services.Parameters;
using Merchello.Core.Warehouses.Dtos;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Suppliers;

public class WarehousesApiControllerTests
{
    [Fact]
    public async Task GetSupplier_LegacySupplierDirectProfile_DefaultsSubmissionTriggerToOnPaid()
    {
        var supplierId = Guid.NewGuid();
        var supplierServiceMock = new Mock<ISupplierService>();
        supplierServiceMock
            .Setup(x => x.GetSupplierByIdAsync(supplierId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Supplier
            {
                Id = supplierId,
                Name = "Legacy Supplier",
                ExtendedData =
                {
                    [SupplierDirectExtendedDataKeys.Profile] = "{\"deliveryMethod\":0,\"emailSettings\":{\"recipientEmail\":\"orders@legacy.test\"}}"
                }
            });

        var controller = CreateController(supplierService: supplierServiceMock.Object);

        var result = await controller.GetSupplier(supplierId, CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        var dto = ok.Value.ShouldBeOfType<SupplierDetailDto>();
        dto.SupplierDirectProfile.ShouldNotBeNull();
        dto.SupplierDirectProfile.SubmissionTrigger.ShouldBe("OnPaid");
    }

    [Fact]
    public async Task UpdateSupplier_InvalidSubmissionTrigger_ReturnsBadRequest()
    {
        var supplierId = Guid.NewGuid();
        var supplierServiceMock = new Mock<ISupplierService>();
        supplierServiceMock
            .Setup(x => x.GetSupplierByIdAsync(supplierId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Supplier
            {
                Id = supplierId,
                Name = "Supplier"
            });

        var controller = CreateController(supplierService: supplierServiceMock.Object);
        var dto = new UpdateSupplierDto
        {
            Name = "Supplier",
            SupplierDirectProfile = new SupplierDirectProfileDto
            {
                SubmissionTrigger = "InvalidTrigger",
                DeliveryMethod = "Email"
            }
        };

        var result = await controller.UpdateSupplier(supplierId, dto, CancellationToken.None);

        var badRequest = result.ShouldBeOfType<BadRequestObjectResult>();
        badRequest.Value.ShouldBe("SupplierDirectProfile.submissionTrigger must be one of: OnPaid, ExplicitRelease.");
        supplierServiceMock.Verify(
            x => x.UpdateSupplierAsync(It.IsAny<UpdateSupplierParameters>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateSupplier_ValidSubmissionTrigger_RoundTripsProfileTrigger()
    {
        var supplierId = Guid.NewGuid();
        var existingSupplier = new Supplier
        {
            Id = supplierId,
            Name = "Supplier"
        };

        UpdateSupplierParameters? capturedParameters = null;
        var supplierServiceMock = new Mock<ISupplierService>();
        supplierServiceMock
            .Setup(x => x.GetSupplierByIdAsync(supplierId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingSupplier);
        supplierServiceMock
            .Setup(x => x.UpdateSupplierAsync(It.IsAny<UpdateSupplierParameters>(), It.IsAny<CancellationToken>()))
            .Callback<UpdateSupplierParameters, CancellationToken>((parameters, _) => capturedParameters = parameters)
            .ReturnsAsync((UpdateSupplierParameters parameters, CancellationToken _) =>
            {
                var supplier = new Supplier
                {
                    Id = supplierId,
                    Name = parameters.Name ?? "Supplier",
                    Code = parameters.Code
                };
                foreach (var entry in parameters.ExtendedData ?? [])
                {
                    supplier.ExtendedData[entry.Key] = entry.Value;
                }

                return new CrudResult<Supplier>
                {
                    ResultObject = supplier
                };
            });

        var controller = CreateController(supplierService: supplierServiceMock.Object);
        var dto = new UpdateSupplierDto
        {
            Name = "Supplier",
            SupplierDirectProfile = new SupplierDirectProfileDto
            {
                SubmissionTrigger = "ExplicitRelease",
                DeliveryMethod = "Email",
                EmailSettings = new EmailDeliverySettingsDto
                {
                    RecipientEmail = "orders@supplier.test"
                }
            }
        };

        var result = await controller.UpdateSupplier(supplierId, dto, CancellationToken.None);

        var ok = result.ShouldBeOfType<OkObjectResult>();
        var response = ok.Value.ShouldBeOfType<SupplierDetailDto>();
        response.SupplierDirectProfile.ShouldNotBeNull();
        response.SupplierDirectProfile.SubmissionTrigger.ShouldBe("ExplicitRelease");

        var parameters = capturedParameters.ShouldNotBeNull();
        parameters.ExtendedData.ShouldNotBeNull();
        parameters.ExtendedData.TryGetValue(SupplierDirectExtendedDataKeys.Profile, out var profileJson).ShouldBeTrue();
        var profile = SupplierDirectProfile.FromJson(profileJson?.ToString());
        profile.ShouldNotBeNull();
        profile!.SubmissionTrigger.ShouldBe(SupplierDirectSubmissionTrigger.ExplicitRelease);
    }

    [Fact]
    public async Task TestSupplierFtpConnection_WithValidFtpPayload_ReturnsSuccess()
    {
        var ftpClientMock = new Mock<IFtpClient>();
        ftpClientMock
            .Setup(x => x.TestConnectionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(FtpTestResult.Succeeded());

        var ftpClientFactoryMock = new Mock<IFtpClientFactory>();
        ftpClientFactoryMock
            .Setup(x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClientMock.Object);

        var controller = CreateController(ftpClientFactoryMock.Object);
        var dto = new TestSupplierFtpConnectionDto
        {
            DeliveryMethod = "Ftp",
            FtpSettings = new FtpDeliverySettingsDto
            {
                Host = "ftp.supplier.test",
                Username = "ftp-user",
                Password = "ftp-password"
            }
        };

        var result = await controller.TestSupplierFtpConnection(dto, CancellationToken.None);

        var okResult = result.ShouldBeOfType<OkObjectResult>();
        var payload = okResult.Value.ShouldBeOfType<TestSupplierFtpConnectionResultDto>();
        payload.Success.ShouldBeTrue();
        payload.ErrorMessage.ShouldBeNull();

        ftpClientFactoryMock.Verify(x => x.CreateClientAsync(
            It.Is<FtpConnectionSettings>(settings =>
                settings.Host == "ftp.supplier.test" &&
                settings.Username == "ftp-user" &&
                settings.Password == "ftp-password" &&
                settings.Port == SupplierDirectProviderDefaults.DefaultFtpPort &&
                settings.UseSftp == false &&
                settings.RemotePath == SupplierDirectProviderDefaults.DefaultRemotePath),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task TestSupplierFtpConnection_WithoutPassword_UsesStoredSupplierPassword()
    {
        var supplierId = Guid.NewGuid();
        var storedProfile = new SupplierDirectProfile
        {
            DeliveryMethod = SupplierDirectDeliveryMethod.Sftp,
            FtpSettings = new FtpDeliverySettings
            {
                Host = "sftp.supplier.test",
                Username = "stored-user",
                Password = "stored-password",
                UseSftp = true
            }
        };

        var supplierServiceMock = new Mock<ISupplierService>();
        supplierServiceMock
            .Setup(x => x.GetSupplierByIdAsync(supplierId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Supplier
            {
                Id = supplierId,
                Name = "Supplier One",
                ExtendedData =
                {
                    [SupplierDirectExtendedDataKeys.Profile] = storedProfile.ToJson()
                }
            });

        var ftpClientMock = new Mock<IFtpClient>();
        ftpClientMock
            .Setup(x => x.TestConnectionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(FtpTestResult.Succeeded());

        var ftpClientFactoryMock = new Mock<IFtpClientFactory>();
        ftpClientFactoryMock
            .Setup(x => x.CreateClientAsync(It.IsAny<FtpConnectionSettings>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(ftpClientMock.Object);

        var controller = CreateController(ftpClientFactoryMock.Object, supplierServiceMock.Object);
        var dto = new TestSupplierFtpConnectionDto
        {
            SupplierId = supplierId,
            DeliveryMethod = "Sftp",
            FtpSettings = new FtpDeliverySettingsDto
            {
                Host = "sftp.supplier.test",
                Username = "stored-user"
            }
        };

        var result = await controller.TestSupplierFtpConnection(dto, CancellationToken.None);

        var okResult = result.ShouldBeOfType<OkObjectResult>();
        var payload = okResult.Value.ShouldBeOfType<TestSupplierFtpConnectionResultDto>();
        payload.Success.ShouldBeTrue();

        ftpClientFactoryMock.Verify(x => x.CreateClientAsync(
            It.Is<FtpConnectionSettings>(settings =>
                settings.UseSftp &&
                settings.Password == "stored-password"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task TestSupplierFtpConnection_WithUnsupportedDeliveryMethod_ReturnsBadRequest()
    {
        var controller = CreateController();

        var result = await controller.TestSupplierFtpConnection(
            new TestSupplierFtpConnectionDto
            {
                DeliveryMethod = "Email",
                FtpSettings = new FtpDeliverySettingsDto()
            },
            CancellationToken.None);

        var badRequestResult = result.ShouldBeOfType<BadRequestObjectResult>();
        badRequestResult.Value.ShouldBe("DeliveryMethod must be either 'Ftp' or 'Sftp'.");
    }

    private static WarehousesApiController CreateController(
        IFtpClientFactory? ftpClientFactory = null,
        ISupplierService? supplierService = null)
    {
        return new WarehousesApiController(
            new Mock<IWarehouseService>().Object,
            supplierService ?? new Mock<ISupplierService>().Object,
            new Mock<ILocationsService>().Object,
            new Mock<IShippingService>().Object,
            new Mock<IProductService>().Object,
            ftpClientFactory ?? new Mock<IFtpClientFactory>().Object,
            new AddressFactory());
    }
}
