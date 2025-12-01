using System.Text;
using Xunit.Abstractions;

namespace Merchello.Tests;

public class XUnitOutputAdapter : TextWriter
{
    private readonly ITestOutputHelper _output;
    public XUnitOutputAdapter(ITestOutputHelper output) => _output = output;
    public override void WriteLine(string? value) => _output.WriteLine(value);
    public override Encoding Encoding { get; } = null!;
}
