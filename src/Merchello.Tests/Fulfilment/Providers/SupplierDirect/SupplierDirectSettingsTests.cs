using Merchello.Core.Fulfilment.Providers.SupplierDirect;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.SupplierDirect;

public class SupplierDirectSettingsTests
{
    [Fact]
    public void FromJson_ParsesStringlyTypedValues()
    {
        var json = """
            {
              "defaultDeliveryMethod": "Sftp",
              "defaultSupplierEmail": "fallback@supplier.test",
              "sendCopyToStore": "false",
              "ftpHost": "sftp.supplier.test",
              "ftpPort": "21",
              "sftpPort": "2222",
              "ftpUsername": "demo-user",
              "ftpPassword": "demo-pass",
              "ftpRemotePath": "/drop/orders",
              "useSftp": "true",
              "ftpPassiveMode": "0",
              "allowInsecureFtp": "true",
              "ftpUseTls": "true",
              "timeoutSeconds": "45",
              "ftpOverwriteExistingFiles": "1",
              "fileNamePattern": "{OrderNumber}.csv"
            }
            """;

        var settings = SupplierDirectSettings.FromJson(json);

        settings.ShouldNotBeNull();
        settings.DefaultDeliveryMethod.ShouldBe(SupplierDirectDeliveryMethod.Sftp);
        settings.DefaultSupplierEmail.ShouldBe("fallback@supplier.test");
        settings.SendCopyToStore.ShouldBeFalse();
        settings.FtpHost.ShouldBe("sftp.supplier.test");
        settings.FtpPort.ShouldBe(21);
        settings.SftpPort.ShouldBe(2222);
        settings.FtpUsername.ShouldBe("demo-user");
        settings.FtpPassword.ShouldBe("demo-pass");
        settings.FtpRemotePath.ShouldBe("/drop/orders");
        settings.UseSftp.ShouldBeTrue();
        settings.FtpPassiveMode.ShouldBeFalse();
        settings.AllowInsecureFtp.ShouldBeTrue();
        settings.FtpUseTls.ShouldBeTrue();
        settings.TimeoutSeconds.ShouldBe(45);
        settings.FtpOverwriteExistingFiles.ShouldBeTrue();
        settings.FileNamePattern.ShouldBe("{OrderNumber}.csv");
    }

    [Fact]
    public void GetValidationErrors_ForFileTransfer_RequiresHostUserAndPassword()
    {
        var settings = new SupplierDirectSettings
        {
            DefaultDeliveryMethod = SupplierDirectDeliveryMethod.Ftp,
            FtpHost = "",
            FtpUsername = null,
            FtpPassword = null,
            FtpUseTls = false
        };

        var errors = settings.GetValidationErrors().ToList();

        errors.ShouldContain("FTP/SFTP host is required");
        errors.ShouldContain("FTP/SFTP username is required");
        errors.ShouldContain("FTP/SFTP password is required");
        errors.ShouldContain("Plain FTP (without TLS) requires explicit opt-in (AllowInsecureFtp = true)");
    }
}
