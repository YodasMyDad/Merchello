using PdfSharp.Drawing;

namespace Merchello.Core.Shared.Services.Models;

/// <summary>
/// Standard fonts for PDF documents.
/// </summary>
public class PdfFonts
{
    public required XFont Title { get; init; }
    public required XFont Subtitle { get; init; }
    public required XFont Body { get; init; }
    public required XFont BodyBold { get; init; }
    public required XFont Small { get; init; }
    public required XFont TableHeader { get; init; }
    public required XFont TableBody { get; init; }
}
