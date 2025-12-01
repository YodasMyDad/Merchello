using Merchello.Core.Shared.Extensions;

namespace Merchello.Tests.ExtensionMethods;

public class EnumerableExtensions
{
    [Fact]
    public void Can_CartesianItems()
    {
        var optionChoices = FakeOptions().Select(option => option.OptionItems);

        var result = optionChoices.CartesianObjects().ToList();

        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Equal(60, result.Count);
    }

    [Fact]
    public void Differences_Returns_Symmetric_Difference()
    {
        var list1 = new List<int> { 1, 2, 3, 4, 5 };
        var list2 = new List<int> { 3, 4, 5, 6, 7 };

        var result = list1.Differences(list2).ToList();

        Assert.NotNull(result);
        Assert.Equal(4, result.Count);
        Assert.Contains(1, result);
        Assert.Contains(2, result);
        Assert.Contains(6, result);
        Assert.Contains(7, result);
        Assert.DoesNotContain(3, result);
        Assert.DoesNotContain(4, result);
        Assert.DoesNotContain(5, result);
    }

    [Fact]
    public void Differences_Returns_All_Items_When_No_Overlap()
    {
        var list1 = new List<string> { "a", "b", "c" };
        var list2 = new List<string> { "x", "y", "z" };

        var result = list1.Differences(list2).ToList();

        Assert.Equal(6, result.Count);
    }

    [Fact]
    public void Differences_Returns_Empty_When_Lists_Are_Identical()
    {
        var list1 = new List<int> { 1, 2, 3 };
        var list2 = new List<int> { 1, 2, 3 };

        var result = list1.Differences(list2).ToList();

        Assert.Empty(result);
    }

    [Fact]
    public void Can_Figure_Out_New_And_Old_Objects()
    {
        var fakeOptions = FakeOptions().ToList();
        var optionChoices = fakeOptions.Select(option => option.OptionItems);
        var originalResults = optionChoices.CartesianObjects().ToList();
        var originalVariantIds = CreateVariantIds(originalResults);

        // Add in amd remove items
        foreach (var option in fakeOptions)
        {
            if (option.Name.Equals("Colours"))
            {
                option.OptionItems.Add(new OptionItem(13,"purple", "Purple"));
                option.OptionItems.Add(new OptionItem(14,"indigo", "Indigo"));
                break;
            }

            if (option.Name.Equals("Sizes"))
            {
                option.OptionItems.RemoveAt(0); // small
            }
        }

        var updateOptionChoices = fakeOptions.Select(option => option.OptionItems);
        var updatedResults = updateOptionChoices.CartesianObjects().ToList();
        var updatedVariantIds = CreateVariantIds(updatedResults);

        // returns all elements in originalVariantIds that are not in optionItemsNew.
        var toBeDeleted = originalVariantIds.Except(updatedVariantIds).ToList();
        Assert.NotNull(toBeDeleted);
        Assert.NotEmpty(toBeDeleted);
        Assert.Equal(15, toBeDeleted.Count);

        // returns all elements in updatedResults that are not in result.
        var toBeAdded = updatedVariantIds.Except(originalVariantIds).ToList();
        Assert.NotNull(toBeAdded);
        Assert.NotEmpty(toBeAdded);
        Assert.Equal(18, toBeAdded.Count);
    }

    private static List<string> CreateVariantIds(List<IEnumerable<OptionItem>> items)
    {
        var variantIds = new List<string>();

        // Loop through main list
        foreach (var optionItemList in items)
        {
            // Order sub list by something consistent
            var orderedList = optionItemList.OrderBy(x => x.Id).Select(x => x.Id);

            // Select the Id's and concat hyphen seperated
            variantIds.Add(string.Join("-", orderedList.Select(n => n.ToString()).ToArray()));
        }

        return variantIds;
    }

    private static IEnumerable<Option> FakeOptions()
    {
        var list = new List<Option>();

        var optSize = new Option("Sizes");
        optSize.OptionItems.Add(new OptionItem(1,"small", "Small"));
        optSize.OptionItems.Add(new OptionItem(2,"medium", "Medium"));
        optSize.OptionItems.Add(new OptionItem(3,"large", "Large"));
        optSize.OptionItems.Add(new OptionItem(4,"extra-large", "Extra Large"));
        list.Add(optSize);

        var optColour = new Option("Colours");
        optColour.OptionItems.Add(new OptionItem(5,"red", "Red"));
        optColour.OptionItems.Add(new OptionItem(6,"green", "Green"));
        optColour.OptionItems.Add(new OptionItem(7,"blue", "Blue"));
        optColour.OptionItems.Add(new OptionItem(8,"brown", "Brown"));
        optColour.OptionItems.Add(new OptionItem(9,"pink", "Pink"));
        list.Add(optColour);

        var optFabric = new Option("Fabrics");
        optFabric.OptionItems.Add(new OptionItem(10,"leather", "Leather"));
        optFabric.OptionItems.Add(new OptionItem(11,"cottom", "Cotton"));
        optFabric.OptionItems.Add(new OptionItem(12,"pvc", "PVC"));
        list.Add(optFabric);

        return list;
    }
}

public class Option : IEquatable<Option>
{
    public Option(string name)
    {
        Name = name;
    }

    public string Name { get; set; }
    public List<OptionItem> OptionItems { get; set; } = new();
    public bool Equals(Option? other)
    {
        if (other is null)
            return false;

        return this.Name == other.Name;
    }
}

public class OptionItem : IEquatable<OptionItem>
{
    public OptionItem(int id, string sku, string name)
    {
        Id = id;
        Name = name;
        Sku = sku;
    }

    public int Id { get; set; }
    public string Name { get; set; }
    public string Sku { get; set; }
    public int SortOrder { get; set; }
    public bool Equals(OptionItem? other)
    {
        if (other is null)
            return false;

        return this.Name.Equals(other.Name) && this.Sku.Equals(other.Sku);
    }
}
