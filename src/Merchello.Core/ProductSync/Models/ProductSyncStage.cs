namespace Merchello.Core.ProductSync.Models;

public enum ProductSyncStage
{
    Validation = 0,
    Queueing = 1,
    Matching = 2,
    Mapping = 3,
    Import = 4,
    Export = 5,
    Images = 6,
    Finalizing = 7,
    System = 8
}
