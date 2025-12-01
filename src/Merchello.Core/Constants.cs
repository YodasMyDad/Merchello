namespace Merchello.Core;

    public static class Constants
    {
        public const string DefaultPagingVariable = "p";

        /// <summary>
        /// Class to hold the cache keys used around the site
        /// </summary>
        public static class CacheKeys
        {
            public const string RootId = "Site.RootId";
            public const int MemoryCacheInMinutes = 60;
        }

        public static class Cookies
        {
            public const string BasketId = "MerchBasketId";
        }

        public static class Session
        {
            public const string Basket = "MerchBasket";
        }

        public static class ExamineFields
        {
            public const string SearchableBlogCategories = "searchableBlogCategories";
        }

        public static class QueryStrings
        {
            public const string ForgotPassword = "forgotpassword";
            public const string SuggestSiteSent = "suggestsitesent";
            public const string ResetPassword = "resetpassword";
            public const string ReturnUrl = "returnurl";
            public const string ResetPasswordSuccess = "reset";
        }

        public static List<string> UserAgents { get; } = new()
        {
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:94.0) Gecko/20100101 Firefox/94.0",
            "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36 Edg/96.0.1054.29",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36 Edg/94.0.992.31",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15",
            "Mozilla/5.0 (X11; CrOS x86_64 14150.87.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.124 Safari/537.36",
            "Mozilla/5.0 (X11; CrOS armv7l 14150.87.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.124 Safari/537.36"
        };

        public static class Membership
        {
            public const string DefaultMemberTypeAlias = "Member";
            public const string DefaultMemberRoleName = "Standard Member";

            public static class Properties
            {
                public const string ChangePasswordGuid = "changePasswordGuid";
            }
        }
    }
