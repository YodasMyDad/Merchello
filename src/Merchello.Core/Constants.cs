namespace Merchello.Core;

    public static class Constants
    {
        public const string DefaultPagingVariable = "p";
        public const string ApiName = "merchello";

        public static class Cookies
        {
            public const string BasketId = "MerchBasketId";
        }

        public static class ExtendedDataKeys
        {
            public const string DiscountValueType = "DiscountValueType";
            public const string DiscountValue = "DiscountValue";
            public const string Reason = "Reason";
            public const string VisibleToCustomer = "VisibleToCustomer";
            public const string IsPhysicalProduct = "IsPhysicalProduct";

            // Promotional discount keys
            public const string DiscountId = "DiscountId";
            public const string DiscountCode = "DiscountCode";
            public const string DiscountName = "DiscountName";
            public const string DiscountCategory = "DiscountCategory";
            public const string ApplyAfterTax = "ApplyAfterTax";

            // Product metadata for discount matching
            public const string ProductRootId = "ProductRootId";
            public const string ProductTypeId = "ProductTypeId";
            public const string SupplierId = "SupplierId";
            public const string CollectionIds = "CollectionIds";
            public const string FilterIds = "FilterIds";
        }
    }
