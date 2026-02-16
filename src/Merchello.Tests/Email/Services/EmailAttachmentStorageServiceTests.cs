using Merchello.Core.Email;
using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Email.Services;

/// <summary>
/// Unit tests for EmailAttachmentStorageService.
/// Tests file-based storage for email attachments (temp files instead of base64 in database).
/// </summary>
public class EmailAttachmentStorageServiceTests : IDisposable
{
    private readonly string _testBasePath;
    private readonly Mock<IHostEnvironment> _hostEnvironmentMock;
    private readonly IOptions<EmailSettings> _emailSettings;
    private readonly EmailAttachmentStorageService _service;

    public EmailAttachmentStorageServiceTests()
    {
        // Create unique temp folder for each test run
        _testBasePath = Path.Combine(Path.GetTempPath(), $"MerchelloTests_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_testBasePath);

        _hostEnvironmentMock = new Mock<IHostEnvironment>();
        _hostEnvironmentMock.Setup(x => x.ContentRootPath).Returns(_testBasePath);

        _emailSettings = Options.Create(new EmailSettings
        {
            AttachmentStoragePath = "Email_Attachments",
            AttachmentRetentionHours = 72
        });

        _service = new EmailAttachmentStorageService(
            _hostEnvironmentMock.Object,
            _emailSettings,
            NullLogger<EmailAttachmentStorageService>.Instance);
    }

    public void Dispose()
    {
        // Clean up test folder
        if (Directory.Exists(_testBasePath))
        {
            try
            {
                Directory.Delete(_testBasePath, recursive: true);
            }
            catch
            {
                // Ignore cleanup errors in tests
            }
        }
    }

    #region SaveAttachmentAsync

    [Fact]
    public async Task SaveAttachmentAsync_CreatesFileInCorrectLocation()
    {
        // Arrange
        var deliveryId = Guid.NewGuid();
        var content = "PDF content here"u8.ToArray();
        var attachment = new EmailAttachmentResult
        {
            Content = content,
            FileName = "Invoice-001.pdf",
            ContentType = "application/pdf"
        };

        // Act
        var result = await _service.SaveAttachmentAsync(deliveryId, attachment);

        // Assert
        result.ShouldNotBeNull();
        result.StoragePath.ShouldBe($"{deliveryId}/Invoice-001.pdf");
        result.FileName.ShouldBe("Invoice-001.pdf");
        result.ContentType.ShouldBe("application/pdf");
        result.FileSizeBytes.ShouldBe(content.Length);

        // Verify file exists on disk
        var expectedPath = Path.Combine(_testBasePath, "Email_Attachments", deliveryId.ToString(), "Invoice-001.pdf");
        File.Exists(expectedPath).ShouldBeTrue();
        (await File.ReadAllBytesAsync(expectedPath)).ShouldBe(content);
    }

    [Fact]
    public async Task SaveAttachmentAsync_SanitizesFileName()
    {
        // Arrange
        var deliveryId = Guid.NewGuid();
        var attachment = new EmailAttachmentResult
        {
            Content = [1, 2, 3],
            FileName = "Invoice<>:001.pdf", // Contains invalid chars
            ContentType = "application/pdf"
        };

        // Act
        var result = await _service.SaveAttachmentAsync(deliveryId, attachment);

        // Assert
        result.StoragePath.ShouldNotContain("<");
        result.StoragePath.ShouldNotContain(">");
        result.StoragePath.ShouldNotContain(":");
    }

    [Fact]
    public async Task SaveAttachmentAsync_HandlesEmptyFileName()
    {
        // Arrange
        var deliveryId = Guid.NewGuid();
        var attachment = new EmailAttachmentResult
        {
            Content = [1, 2, 3],
            FileName = "", // Empty filename
            ContentType = "application/pdf"
        };

        // Act
        var result = await _service.SaveAttachmentAsync(deliveryId, attachment);

        // Assert
        result.FileName.ShouldBe(""); // Original preserved
        result.StoragePath.ShouldContain("attachment"); // Sanitized version used in path
    }

    [Fact]
    public async Task SaveAttachmentAsync_TruncatesLongFileName()
    {
        // Arrange
        var deliveryId = Guid.NewGuid();
        var longFileName = new string('a', 250) + ".pdf"; // Over 200 char limit
        var attachment = new EmailAttachmentResult
        {
            Content = [1, 2, 3],
            FileName = longFileName,
            ContentType = "application/pdf"
        };

        // Act
        var result = await _service.SaveAttachmentAsync(deliveryId, attachment);

        // Assert
        var parts = result.StoragePath.Split('/');
        parts[1].Length.ShouldBeLessThanOrEqualTo(200);
    }

    #endregion

    #region LoadAttachmentAsync

    [Fact]
    public async Task LoadAttachmentAsync_ReturnsFileContent()
    {
        // Arrange
        var deliveryId = Guid.NewGuid();
        var content = "Test content"u8.ToArray();
        var attachment = new EmailAttachmentResult
        {
            Content = content,
            FileName = "test.txt",
            ContentType = "text/plain"
        };
        var reference = await _service.SaveAttachmentAsync(deliveryId, attachment);

        // Act
        var loaded = await _service.LoadAttachmentAsync(reference.StoragePath);

        // Assert
        loaded.ShouldNotBeNull();
        loaded.ShouldBe(content);
    }

    [Fact]
    public async Task LoadAttachmentAsync_ReturnsNullForMissingFile()
    {
        // Arrange
        var storagePath = $"{Guid.NewGuid()}/nonexistent.pdf";

        // Act
        var result = await _service.LoadAttachmentAsync(storagePath);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task LoadAttachmentAsync_ThrowsOnPathTraversal()
    {
        // Arrange
        var maliciousPath = "../../../etc/passwd";

        // Act & Assert
        await Should.ThrowAsync<InvalidOperationException>(
            () => _service.LoadAttachmentAsync(maliciousPath));
    }

    #endregion

    #region DeleteDeliveryAttachments

    [Fact]
    public async Task DeleteDeliveryAttachments_RemovesFolder()
    {
        // Arrange
        var deliveryId = Guid.NewGuid();
        var attachment = new EmailAttachmentResult
        {
            Content = [1, 2, 3],
            FileName = "test.pdf",
            ContentType = "application/pdf"
        };
        await _service.SaveAttachmentAsync(deliveryId, attachment);

        var folderPath = Path.Combine(_testBasePath, "Email_Attachments", deliveryId.ToString());
        Directory.Exists(folderPath).ShouldBeTrue();

        // Act
        _service.DeleteDeliveryAttachments(deliveryId);

        // Assert
        Directory.Exists(folderPath).ShouldBeFalse();
    }

    [Fact]
    public void DeleteDeliveryAttachments_DoesNotThrowForMissingFolder()
    {
        // Arrange
        var deliveryId = Guid.NewGuid();

        // Act & Assert - should not throw
        Should.NotThrow(() => _service.DeleteDeliveryAttachments(deliveryId));
    }

    #endregion

    #region FileExists

    [Fact]
    public async Task FileExists_ReturnsTrueWhenFileExists()
    {
        // Arrange
        var deliveryId = Guid.NewGuid();
        var attachment = new EmailAttachmentResult
        {
            Content = [1, 2, 3],
            FileName = "test.pdf",
            ContentType = "application/pdf"
        };
        var reference = await _service.SaveAttachmentAsync(deliveryId, attachment);

        // Act
        var exists = _service.FileExists(reference.StoragePath);

        // Assert
        exists.ShouldBeTrue();
    }

    [Fact]
    public void FileExists_ReturnsFalseWhenFileMissing()
    {
        // Arrange
        var storagePath = $"{Guid.NewGuid()}/missing.pdf";

        // Act
        var exists = _service.FileExists(storagePath);

        // Assert
        exists.ShouldBeFalse();
    }

    [Fact]
    public void FileExists_ReturnsFalseForPathTraversalAttempt()
    {
        // Arrange
        var maliciousPath = "../../../etc/passwd";

        // Act
        var exists = _service.FileExists(maliciousPath);

        // Assert
        exists.ShouldBeFalse();
    }

    #endregion

    #region GetExpiredDeliveryFolders

    [Fact]
    public void GetExpiredDeliveryFolders_ReturnsEmptyWhenNoFolders()
    {
        // Arrange - storage path doesn't exist yet

        // Act
        var expired = _service.GetExpiredDeliveryFolders(24).ToList();

        // Assert
        expired.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetExpiredDeliveryFolders_ReturnsOldFolders()
    {
        // Arrange - create folder and make it appear old
        var deliveryId = Guid.NewGuid();
        var attachment = new EmailAttachmentResult
        {
            Content = [1, 2, 3],
            FileName = "test.pdf",
            ContentType = "application/pdf"
        };
        await _service.SaveAttachmentAsync(deliveryId, attachment);

        var folderPath = Path.Combine(_testBasePath, "Email_Attachments", deliveryId.ToString());
        var dirInfo = new DirectoryInfo(folderPath);
        dirInfo.CreationTimeUtc = DateTime.UtcNow.AddHours(-48); // Make it 48 hours old

        // Act
        var expired = _service.GetExpiredDeliveryFolders(24).ToList(); // 24 hour retention

        // Assert
        expired.ShouldContain(deliveryId.ToString());
    }

    [Fact]
    public async Task GetExpiredDeliveryFolders_ExcludesRecentFolders()
    {
        // Arrange
        var deliveryId = Guid.NewGuid();
        var attachment = new EmailAttachmentResult
        {
            Content = [1, 2, 3],
            FileName = "test.pdf",
            ContentType = "application/pdf"
        };
        await _service.SaveAttachmentAsync(deliveryId, attachment);

        // Folder was just created, so it's recent

        // Act
        var expired = _service.GetExpiredDeliveryFolders(24).ToList();

        // Assert
        expired.ShouldNotContain(deliveryId.ToString());
    }

    #endregion

    #region Path Security

    [Theory]
    [InlineData("../secret.txt")]
    [InlineData("..\\secret.txt")]
    [InlineData("folder/../../../etc/passwd")]
    [InlineData("folder\\..\\..\\..\\windows\\system32")]
    public async Task PathSecurity_BlocksTraversalAttempts(string maliciousPath)
    {
        // Act & Assert
        await Should.ThrowAsync<InvalidOperationException>(
            () => _service.LoadAttachmentAsync(maliciousPath));
    }

    [Fact]
    public async Task PathSecurity_BlocksBasePathPrefixCollision()
    {
        // Arrange
        var siblingPath = Path.Combine(_testBasePath, "Email_Attachments_Evil");
        Directory.CreateDirectory(siblingPath);
        await File.WriteAllTextAsync(Path.Combine(siblingPath, "stolen.txt"), "not allowed");
        var maliciousPath = $"..{Path.DirectorySeparatorChar}Email_Attachments_Evil{Path.DirectorySeparatorChar}stolen.txt";

        // Act & Assert
        await Should.ThrowAsync<InvalidOperationException>(
            () => _service.LoadAttachmentAsync(maliciousPath));
    }

    #endregion
}
