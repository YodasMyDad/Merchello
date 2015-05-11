﻿namespace Merchello.Web.Mvc
{
    using System.Web.Mvc;

    /// <summary>
    /// An Umbraco Surface controller (abstract) that can be resolved by packages such as
    /// the Merchello Bazaar to perform various checkout operations - such as capture payments or estimate shipping/taxes
    /// </summary>
    public abstract class CheckoutOperationControllerBase : MerchelloSurfaceController
    {
        /// <summary>
        /// Responsible for rendering the payment method for a payment method in a store.
        /// </summary>
        /// <returns>
        /// The <see cref="ActionResult"/> - Partial View.
        /// </returns>
        [ChildActionOnly]
        public abstract ActionResult RenderForm();
    }
}