using FluentValidation;
using Merchello.Core.Accounting.Dtos;

namespace Merchello.Core.Accounting.Validators;

/// <summary>
/// Validates required fields for creating a draft order.
/// </summary>
public class CreateDraftOrderDtoValidator : AbstractValidator<CreateDraftOrderDto>
{
    public CreateDraftOrderDtoValidator()
    {
        RuleFor(x => x.BillingAddress.Name)
            .NotEmpty().WithMessage("Billing address name is required");

        RuleFor(x => x.BillingAddress.Email)
            .NotEmpty().WithMessage("Billing address email is required");

        RuleFor(x => x.BillingAddress.AddressOne)
            .NotEmpty().WithMessage("Billing address line 1 is required");

        RuleFor(x => x.BillingAddress.TownCity)
            .NotEmpty().WithMessage("Billing address town/city is required");

        RuleFor(x => x.BillingAddress.PostalCode)
            .NotEmpty().WithMessage("Billing address postal code is required");

        RuleFor(x => x.BillingAddress.CountryCode)
            .NotEmpty().WithMessage("Billing address country is required");
    }
}
