namespace Merchello.Core.Shared.Extensions;

public class SlugHelperConfig
{
    public Dictionary<string, string> CharacterReplacements { get; set; } = new() { { " ", "-" } };
    public bool ForceLowerCase { get; set; } = true;
    public bool CollapseWhiteSpace { get; set; } = true;
    public string DeniedCharactersRegex { get; set; } = @"[^a-zA-Z0-9\-\._]";
}
