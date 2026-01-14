namespace Merchello.Site.Shared.Components.PriceRangeSlider;

public class PriceRangeSliderViewModel
{
    // Store prices (NET, store currency) - used for filtering
    public decimal RangeMin { get; set; }
    public decimal RangeMax { get; set; }
    public decimal? SelectedMin { get; set; }
    public decimal? SelectedMax { get; set; }

    // Display prices (with tax + currency conversion) - used for UI labels
    public decimal DisplayRangeMin { get; set; }
    public decimal DisplayRangeMax { get; set; }
    public decimal? DisplaySelectedMin { get; set; }
    public decimal? DisplaySelectedMax { get; set; }

    // Conversion factors for calculating display price from any store price
    // Formula: displayPrice = storePrice * DisplayMultiplier
    // Where DisplayMultiplier = taxMultiplier * exchangeRate
    public decimal DisplayMultiplier { get; set; } = 1m;

    // Currency context for formatting
    public string CurrencySymbol { get; set; } = "£";
    public int DecimalPlaces { get; set; } = 2;
}
