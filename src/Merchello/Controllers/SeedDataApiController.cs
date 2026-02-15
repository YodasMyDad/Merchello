using Asp.Versioning;
using Merchello.Core.Data;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Settings.Dtos;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// API endpoints for manually installing seed data from the backoffice.
/// </summary>
[ApiVersion("1.0")]
[ApiExplorerSettings(GroupName = "Merchello")]
public class SeedDataApiController(
    IOptions<MerchelloSettings> settings,
    IProductService productService,
    DbSeeder dbSeeder,
    ISeedDataInstallationState seedDataInstallationState,
    ILogger<SeedDataApiController> logger)
    : MerchelloApiControllerBase
{
    /// <summary>
    /// Gets seed-data enablement and install status.
    /// </summary>
    [HttpGet("seed-data/status")]
    [ProducesResponseType<SeedDataStatusDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken)
    {
        var isEnabled = settings.Value.InstallSeedData;
        var isInstalled = isEnabled && await productService.AnyProductsExistAsync(cancellationToken);

        return Ok(new SeedDataStatusDto
        {
            IsEnabled = isEnabled,
            IsInstalled = isInstalled
        });
    }

    /// <summary>
    /// Installs seed data once when enabled.
    /// </summary>
    [HttpPost("seed-data/install")]
    [ProducesResponseType<InstallSeedDataResultDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<InstallSeedDataResultDto>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<InstallSeedDataResultDto>(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Install(CancellationToken cancellationToken)
    {
        if (!settings.Value.InstallSeedData)
        {
            return BadRequest(new InstallSeedDataResultDto
            {
                Success = false,
                IsInstalled = false,
                Message = "Seed data installation is disabled in configuration."
            });
        }

        try
        {
            if (seedDataInstallationState.IsInstalling)
            {
                return StatusCode(StatusCodes.Status409Conflict, new InstallSeedDataResultDto
                {
                    Success = false,
                    IsInstalled = false,
                    Message = "Seed data installation is already in progress."
                });
            }

            if (await productService.AnyProductsExistAsync(cancellationToken))
            {
                return Ok(new InstallSeedDataResultDto
                {
                    Success = true,
                    IsInstalled = true,
                    Message = "Seed data is already installed."
                });
            }

            if (!seedDataInstallationState.TryBeginInstallation())
            {
                return StatusCode(StatusCodes.Status409Conflict, new InstallSeedDataResultDto
                {
                    Success = false,
                    IsInstalled = false,
                    Message = "Seed data installation is already in progress."
                });
            }

            try
            {
                await dbSeeder.SeedAsync(cancellationToken);
                var isInstalled = await productService.AnyProductsExistAsync(cancellationToken);

                if (!isInstalled)
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, new InstallSeedDataResultDto
                    {
                        Success = false,
                        IsInstalled = false,
                        Message = "Seed data installation did not complete. Check logs for details."
                    });
                }

                return Ok(new InstallSeedDataResultDto
                {
                    Success = true,
                    IsInstalled = true,
                    Message = "Seed data installed successfully."
                });
            }
            finally
            {
                seedDataInstallationState.EndInstallation();
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Manual seed data installation failed");
            return StatusCode(StatusCodes.Status500InternalServerError, new InstallSeedDataResultDto
            {
                Success = false,
                IsInstalled = false,
                Message = "Failed to install seed data."
            });
        }
    }
}
