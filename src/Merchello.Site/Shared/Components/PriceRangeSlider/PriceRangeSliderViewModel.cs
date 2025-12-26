namespace Merchello.Site.Shared.Components.PriceRangeSlider;

public class PriceRangeSliderViewModel
{
    public decimal RangeMin { get; set; }
    public decimal RangeMax { get; set; }
    public decimal? SelectedMin { get; set; }
    public decimal? SelectedMax { get; set; }
}
