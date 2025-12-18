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
        }
    }
