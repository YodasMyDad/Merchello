namespace Merchello.Site.Shared;

    public static class Constants
    {
        //public static Guid InternalApiKey = Guid.Parse("54e64f95-e781-4f9d-b884-f93414c2237d");

        /// <summary>
        /// Class to hold the cache keys used around the site
        /// </summary>
        public static class CacheKeys
        {
            public const string RootId = "Site.RootId";
            public const int MemoryCacheInMinutes = 60;
        }
    }
