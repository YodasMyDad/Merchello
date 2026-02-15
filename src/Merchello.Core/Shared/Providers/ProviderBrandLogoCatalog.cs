using Merchello.Core.Payments.Models;

namespace Merchello.Core.Shared.Providers;

/// <summary>
/// Central catalog for provider and payment-method brand logos.
/// </summary>
public static class ProviderBrandLogoCatalog
{
    public const string Stripe = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#635BFF"/></svg>""";
    public const string Braintree = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.18L18 8v8l-6 3.75L6 16V8l6-3.82z" fill="#003366"/><path d="M12 6l-4 2.5v5L12 16l4-2.5v-5L12 6zm0 1.55l2.5 1.56v3.12L12 13.8l-2.5-1.56V9.1L12 7.55z" fill="#003366"/></svg>""";
    public const string PayPal = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" fill="#003087"/><path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132l-1.41 8.95a.568.568 0 0 0 .562.655h3.94c.578 0 1.069-.42 1.16-.99l.045-.24.92-5.815.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.658-1.377z" fill="#0070E0"/></svg>""";
    public const string WorldPay = """<svg viewBox="0 22 86 48" xmlns="http://www.w3.org/2000/svg"><path d="M73.8,28.5h-8.2c-0.5,0-1,0.3-1.1,0.8l-7.8,27.5l-7.1-24.5c-0.6-2.3-2.7-3.9-5.1-3.9H42c-2.4,0-4.5,1.6-5.1,3.9l-7.1,24.5l-7.8-27.5c-0.1-0.5-0.6-0.8-1.1-0.8h-8.2c-0.8,0-1.3,0.7-1.1,1.5l11.2,35c0.7,2.2,2.8,3.7,5.1,3.7h3.3c2.4,0,4.5-1.6,5.1-3.8l6.9-23.4l6.9,23.4c0.7,2.3,2.8,3.8,5.1,3.8h3.3c2.3,0,4.4-1.5,5.1-3.7l11.2-35C75.1,29.2,74.5,28.5,73.8,28.5z" fill="#FF1F3E"/></svg>""";
    public const string ApplePay = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/></svg>""";
    public const string GooglePay = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>""";
    public const string Venmo = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 1c.87 1.44 1.26 2.92 1.26 4.8 0 5.98-5.1 13.75-9.24 19.2H4.2L1 2.85l6.24-.6 1.86 14.9C11.04 13.5 13.2 8.18 13.2 5.08c0-1.74-.3-2.92-.78-3.9L19.5 1z" fill="#3D95CE"/></svg>""";
    public const string LinkByStripe = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#00D66F"/><circle cx="10" cy="12" r="3.6" fill="#0A2540"/><circle cx="14" cy="12" r="3.6" fill="#FFFFFF"/><circle cx="10" cy="12" r="1.8" fill="#00D66F"/><circle cx="14" cy="12" r="1.8" fill="#00D66F"/></svg>""";
    public const string AmazonPay = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.958 10.09c0 1.232.029 2.256-.591 3.351-.502.891-1.301 1.438-2.186 1.438-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.685zm3.186 7.705a.657.657 0 01-.745.074c-1.047-.87-1.235-1.272-1.812-2.101-1.729 1.764-2.953 2.29-5.191 2.29-2.652 0-4.714-1.636-4.714-4.91 0-2.558 1.386-4.297 3.358-5.148 1.71-.752 4.099-.886 5.922-1.094v-.41c0-.752.058-1.643-.383-2.294-.385-.578-1.124-.816-1.774-.816-1.205 0-2.277.618-2.539 1.897-.054.283-.263.562-.551.576l-3.083-.333c-.26-.057-.548-.266-.473-.66C5.89 1.96 8.585.75 11.021.75c1.246 0 2.876.331 3.858 1.275 1.247 1.163 1.127 2.713 1.127 4.404v3.989c0 1.199.498 1.726.966 2.374.164.232.201.51-.009.681-.525.436-1.456 1.249-1.968 1.704l-.15.118z" fill="#232F3E"/><path d="M21.533 18.504c-2.055 1.544-5.034 2.367-7.598 2.367-3.595 0-6.835-1.33-9.282-3.547-.193-.174-.021-.413.21-.277 2.643 1.54 5.913 2.465 9.289 2.465 2.279 0 4.782-.472 7.088-1.452.347-.147.64.229.293.444z" fill="#FF9900"/><path d="M22.375 17.541c-.262-.338-1.74-.159-2.403-.08-.201.024-.232-.152-.051-.28 1.176-.828 3.106-.589 3.332-.312.227.279-.059 2.21-1.162 3.131-.17.142-.332.066-.256-.12.249-.618.805-2.001.54-2.339z" fill="#FF9900"/></svg>""";
    public const string Klarna = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#FFB3C7"/><path d="M4.592 2v20H0V2h4.592zm11.46 0c0 4.194-1.583 8.105-4.415 11.068l-.278.283L17.702 22h-5.668l-6.893-9.4 1.779-1.332c2.858-2.14 4.535-5.378 4.637-8.924L11.562 2h4.49zM21.5 17a2.5 2.5 0 110 5 2.5 2.5 0 010-5z" fill="#0A0B09"/></svg>""";
    public const string Ideal = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#CC0066"/><path d="M12 8v8M8 12h8" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>""";
    public const string Bancontact = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#005498"/><circle cx="9" cy="12" r="4" fill="none" stroke="#FFD800" stroke-width="1.5"/><circle cx="15" cy="12" r="4" fill="none" stroke="#FFD800" stroke-width="1.5"/></svg>""";
    public const string Sepa = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#003399"/><circle cx="12" cy="12" r="5" fill="none" stroke="#FFCC00" stroke-width="1.5"/><path d="M7 12h10" stroke="#FFCC00" stroke-width="1"/></svg>""";
    public const string Eps = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#C8202F"/><path d="M6 16V10l6-4 6 4v6" stroke="white" stroke-width="1.5" fill="none"/><rect x="10" y="12" width="4" height="4" fill="white"/></svg>""";
    public const string P24 = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#D13239"/><path d="M8 8h4a3 3 0 0 1 0 6H8V8zm0 6v4" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>""";
    public const string Ups = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.668 14.544l-.028-5.226c.138-.055.387-.111.608-.111.995 0 1.41.774 1.41 2.682 0 1.853-.47 2.765-1.438 2.765-.22 0-.441-.055-.552-.11zM3.124 7.438c4.203-3.843 9.29-4.866 14.018-4.866 1.3 0 2.544.083 3.76.194h-.028v11.253c0 2.184-.774 3.926-2.295 5.171-1.355 1.134-5.447 2.959-6.581 3.456-1.161-.525-5.253-2.378-6.581-3.456-1.493-1.244-2.295-3.014-2.295-5.171V7.438zm12.664 2.599c.028.912.276 1.576 1.687 2.406.747.442 1.051.747 1.051 1.272 0 .581-.387.94-1.023.94-.553 0-1.189-.304-1.631-.691v1.576c.553.304 1.217.525 1.88.525 1.687 0 2.433-1.189 2.461-2.267.028-.995-.249-1.742-1.659-2.571-.608-.387-1.134-.636-1.106-1.244 0-.581.525-.802.995-.802.581 0 1.161.332 1.521.691V8.378c-.304-.221-.94-.581-1.88-.553-1.135.028-2.296.829-2.296 2.212zm-5.834 9.484h1.714l-.028-3.594c.166.028.415.083.774.083 1.908 0 2.986-1.687 2.986-4.175 0-2.461-1.106-4.009-3.152-4.009-.94 0-1.687.221-2.295.608v11.087zm-5.945-6.166c0 1.797.829 2.71 2.516 2.71 1.051 0 1.908-.249 2.571-.691V7.991H7.41v6.387c-.194.138-.47.221-.802.221-.774 0-.885-.719-.885-1.189V7.991H4.009v5.364zM22.12 2.295v11.723c0 2.516-.94 4.645-2.765 6.111-1.549 1.3-6.332 3.429-7.355 3.871-1.023-.442-5.806-2.571-7.355-3.843-1.797-1.465-2.765-3.594-2.765-6.111V2.295C4.756.747 8.074 0 12 0s7.244.747 10.12 2.295zm-.304.221c-2.71-1.465-6-2.184-9.788-2.184s-7.079.746-9.788 2.184v11.502c0 2.433.912 4.452 2.627 5.862 1.576 1.3 6.581 3.484 7.161 3.76.581-.249 5.585-2.433 7.161-3.733 1.714-1.41 2.627-3.429 2.627-5.862V2.516zm-2.433 20.295c0 .47-.387.829-.829.829a.831.831 0 0 1-.829-.829c0-.47.387-.829.829-.829.441 0 .801.359.829.829zm-.166 0a.679.679 0 0 0-.664-.691c-.359 0-.664.332-.664.691 0 .359.304.664.664.664a.673.673 0 0 0 .664-.664zm-.553.055c.028.055.304.442.304.442h-.221s-.276-.387-.276-.415h-.028v.415h-.194v-.995l.304-.028c.249 0 .332.166.332.304s-.083.25-.221.277zm.027-.276c0-.055 0-.138-.166-.138h-.083v.304h.028c.194 0 .221-.083.221-.166z" fill="#351C15"/></svg>""";
    public const string FedEx = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.498 14.298c-.016-.414.345-.751.75-.755a.745.745 0 0 1 .752.755.755.755 0 0 1-.751.745c-.395.002-.759-.346-.751-.745zm.759-.083c.067-.02.164-.042.162-.13.007-.09-.086-.133-.162-.134h-.163v.263c0 .001.165-.002.163.001zm-.163.107v.418h-.14v-.91h.327c.156-.021.294.092.286.253a.218.218 0 0 1-.156.19c.162.083.108.322.173.467h-.156a2.355 2.355 0 0 1-.04-.205c-.018-.093-.047-.229-.17-.213h-.124zm.76-.024a.603.603 0 0 0-.605-.632c-.338-.012-.62.302-.605.632a.619.619 0 0 0 .605.622.61.61 0 0 0 .605-.622zm-5.052-.579l-.878 1.008h-1.306l1.559-1.745-1.56-1.75h1.355l.902.997.878-.998h1.306l-1.543 1.743 1.559 1.753h-1.371l-.901-1.008zm-4.703-.352v-.827h1.904v-1.506l1.724 1.948-1.724 1.941v-1.556h-1.904zm1.56 1.36h-3.2V9.044h3.224v1.024H13.77v1.163h1.888v.958h-1.904v1.522h1.904v1.016zm-5.705-.655c-.54.017-.878-.552-.877-1.04-.01-.507.307-1.123.878-1.105.579-.025.871.6.845 1.103.023.501-.29 1.062-.846 1.042zM4.743 12.41c.076-.358.403-.67.78-.663a.788.788 0 0 1 .803.663H4.743zm15.182.564l1.815-2.047h-2.125l-.74.844-.763-.844h-4.037v-.548h1.912V8.741H10.84v2.58c-.362-.448-.981-.559-1.526-.492-.782.123-1.427.762-1.634 1.514-.254-.958-1.179-1.588-2.157-1.554-.781.009-1.6.365-1.987 1.071v-.818h-1.87v-.9h2.043v-1.4H0v6.287h1.666v-2.644h1.666a7.59 7.59 0 0 0-.082.622c-.013 1.232 1.042 2.27 2.274 2.236a2.204 2.204 0 0 0 2.157-1.432H6.254c-.14.268-.441.38-.73.36-.457.009-.83-.417-.829-.86h2.914c.083 1.027.988 1.966 2.043 1.947a1.53 1.53 0 0 0 1.19-.639v.41h7.215l.754-.86.754.86h2.192l-1.832-2.055z" fill="#4D148C"/></svg>""";
    public const string Avalara = """<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16.0598 24.0195C16.0598 24.0195 14.3928 22.0652 13.4066 21.0094L12.0214 24.1318C14.0171 26.9623 15.3319 29.4108 16.0598 30.5789C17.4685 28.2876 20.92 21.5036 28.0341 15.1463L27.2358 13.3717C22.6105 16.6514 18.666 20.8297 16.0598 24.0195Z" fill="#059BD2"/><path d="M26.4379 31.4999H32.0964L27.1188 20.0883C25.6631 21.5709 24.4187 23.031 23.3152 24.4238L26.4379 31.4999Z" fill="#FF6600"/><path d="M18.525 0.5H18.5016H13.5709H13.5475L0 31.5H5.65847L15.4493 9.39565L15.9189 8.20507H16.1771L16.6467 9.39565L19.5581 15.9551C20.8495 14.7196 22.2582 13.5065 23.7374 12.3609L18.525 0.5Z" fill="#FF6600"/></svg>""";
    public const string ShipBob = """<svg viewBox="0 0 17 20" xmlns="http://www.w3.org/2000/svg"><path d="M2.43039697,9.12487395 L2.43039697,13.7135057 L8.500015,17.3844602 L14.5759924,13.7135057 L14.5759924,7.68268687 L9.39536915,10.8030597 C8.82614373,11.1438375 8.17376628,11.1438375 7.60454086,10.8030597 L0.556416649,6.5486878 C-0.185472216,6.09636717 -0.185472216,4.96224512 0.556416649,4.51656541 L7.60454086,0.255675529 C8.17376628,-0.0852251765 8.82614373,-0.0852251765 9.39536915,0.255675529 L14.5759924,3.38908429 L12.1903812,4.82463044 L8.500015,2.60238089 L6.77314058,3.65127776 L3.65199984,5.54566249 L5.29572223,6.53552894 L8.500015,8.48906707 L15.049227,4.54276016 C15.4202315,4.32643825 15.925503,4.352633 16.2963875,4.54927811 C16.6993088,4.76560002 17,5.1917259 17,5.71623583 L17,14.1134368 C17,14.7689205 16.6801107,15.339179 16.1300834,15.6735617 L9.39536915,19.7443245 C8.83262311,20.0852252 8.17376628,20.0852252 7.60454086,19.7443245 L0.869826599,15.6735617 C0.319799337,15.339179 0.00638938737,14.7754384 0.00638938737,14.1134368 L0.00638938737,12.7826697 L0.00638938737,7.66965098 L2.43039697,9.12487395 Z" fill="#175CFF"/></svg>""";
    public const string ShipMonk = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="6" r="3" fill="#00C853"/><path d="M12 10c-4 0-6 2-6 4v2h12v-2c0-2-2-4-6-4z" fill="#00C853"/><path d="M8 20l4-4 4 4" stroke="#00C853" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>""";
    public const string ShipHero = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" fill="#FF6B35"/><path d="M9 12l2 2 4-4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>""";
    public const string HelmWms = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" fill="none" stroke="#1E3A5F" stroke-width="1.5"/><circle cx="12" cy="12" r="8" fill="none" stroke="#1E3A5F" stroke-width="1.5"/><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.34 6.34l2.83 2.83M14.83 14.83l2.83 2.83M6.34 17.66l2.83-2.83M14.83 9.17l2.83-2.83" stroke="#1E3A5F" stroke-width="1.5" stroke-linecap="round"/></svg>""";
    public const string Deliverr = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#6366F1"/></svg>""";
    public const string Flexport = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" fill="none" stroke="#0066FF" stroke-width="1.5"/><path d="M3 12h18M12 3c-2.5 3-4 6-4 9s1.5 6 4 9c2.5-3 4-6 4-9s-1.5-6-4-9z" fill="none" stroke="#0066FF" stroke-width="1.5"/></svg>""";
    public const string RedStag = """<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 4c-1 2-2 3-2 5s1 3 2 4c1-1 2-2 2-4s-1-3-2-5zM8 6c-2-1-4-1-5 0 1 2 3 3 5 3M16 6c2-1 4-1 5 0-1 2-3 3-5 3M12 13v8M8 17l4 4 4-4" stroke="#C41E3A" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>""";

    private static readonly IReadOnlyDictionary<string, string> PaymentProviderIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["stripe"] = Stripe,
            ["braintree"] = Braintree,
            ["paypal"] = PayPal,
            ["worldpay"] = WorldPay,
            ["amazonpay"] = AmazonPay
        };

    private static readonly IReadOnlyDictionary<string, string> PaymentMethodIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["paypal"] = PayPal,
            ["paypal-express"] = PayPal,
            ["applepay"] = ApplePay,
            ["googlepay"] = GooglePay,
            ["google-pay"] = GooglePay,
            ["venmo"] = Venmo,
            ["link"] = LinkByStripe,
            ["amazonpay"] = AmazonPay,
            ["klarna"] = Klarna,
            ["ideal"] = Ideal,
            ["bancontact"] = Bancontact,
            ["sepa"] = Sepa,
            ["eps"] = Eps,
            ["p24"] = P24
        };

    private static readonly IReadOnlyDictionary<string, string> PaymentMethodTypeIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            [PaymentMethodTypes.ApplePay] = ApplePay,
            [PaymentMethodTypes.GooglePay] = GooglePay,
            [PaymentMethodTypes.AmazonPay] = AmazonPay,
            [PaymentMethodTypes.PayPal] = PayPal,
            [PaymentMethodTypes.Link] = LinkByStripe,
            [PaymentMethodTypes.Venmo] = Venmo
        };

    private static readonly IReadOnlyDictionary<string, string> ShippingProviderIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["ups"] = Ups,
            ["fedex"] = FedEx
        };

    private static readonly IReadOnlyDictionary<string, string> TaxProviderIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["avalara"] = Avalara
        };

    private static readonly IReadOnlyDictionary<string, string> FulfilmentProviderIcons =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["shipbob"] = ShipBob,
            ["shipmonk"] = ShipMonk,
            ["shiphero"] = ShipHero,
            ["helm-wms"] = HelmWms,
            ["deliverr"] = Deliverr,
            ["flexport"] = Flexport,
            ["red-stag"] = RedStag
        };

    /// <summary>
    /// Gets a branded icon for payment provider metadata.
    /// </summary>
    public static string? GetPaymentProviderIconHtml(string? alias)
    {
        var normalized = Normalize(alias);
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        if (PaymentProviderIcons.TryGetValue(normalized, out var exact))
        {
            return exact;
        }

        if (Contains(normalized, "stripe"))
        {
            return Stripe;
        }

        if (Contains(normalized, "braintree"))
        {
            return Braintree;
        }

        if (Contains(normalized, "paypal"))
        {
            return PayPal;
        }

        if (Contains(normalized, "worldpay"))
        {
            return WorldPay;
        }

        if (Contains(normalized, "amazon"))
        {
            return AmazonPay;
        }

        return null;
    }

    /// <summary>
    /// Gets a branded icon for payment methods.
    /// </summary>
    public static string? GetPaymentMethodIconHtml(string? methodAlias, string? providerAlias = null, string? methodType = null)
    {
        var normalizedMethodAlias = Normalize(methodAlias);
        if (!string.IsNullOrEmpty(normalizedMethodAlias) &&
            PaymentMethodIcons.TryGetValue(normalizedMethodAlias, out var exactMethod))
        {
            return exactMethod;
        }

        if (!string.IsNullOrWhiteSpace(methodType) &&
            PaymentMethodTypeIcons.TryGetValue(methodType, out var typeIcon))
        {
            return typeIcon;
        }

        if (!string.IsNullOrEmpty(normalizedMethodAlias))
        {
            if (Contains(normalizedMethodAlias, "paypal")) return PayPal;
            if (Contains(normalizedMethodAlias, "apple")) return ApplePay;
            if (Contains(normalizedMethodAlias, "google")) return GooglePay;
            if (Contains(normalizedMethodAlias, "venmo")) return Venmo;
            if (Contains(normalizedMethodAlias, "link")) return LinkByStripe;
            if (Contains(normalizedMethodAlias, "amazon")) return AmazonPay;
            if (Contains(normalizedMethodAlias, "klarna")) return Klarna;
            if (Contains(normalizedMethodAlias, "ideal")) return Ideal;
            if (Contains(normalizedMethodAlias, "bancontact")) return Bancontact;
            if (Contains(normalizedMethodAlias, "sepa")) return Sepa;
            if (Contains(normalizedMethodAlias, "eps")) return Eps;
            if (Contains(normalizedMethodAlias, "p24")) return P24;
        }

        return GetPaymentProviderIconHtml(providerAlias);
    }

    /// <summary>
    /// Gets a branded icon for shipping provider metadata.
    /// </summary>
    public static string? GetShippingProviderIconSvg(string? providerKey)
    {
        var normalized = Normalize(providerKey);
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        if (ShippingProviderIcons.TryGetValue(normalized, out var exact))
        {
            return exact;
        }

        if (Contains(normalized, "ups"))
        {
            return Ups;
        }

        if (Contains(normalized, "fedex"))
        {
            return FedEx;
        }

        return null;
    }

    /// <summary>
    /// Gets a branded icon for tax provider metadata.
    /// </summary>
    public static string? GetTaxProviderIconSvg(string? providerAlias)
    {
        var normalized = Normalize(providerAlias);
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        if (TaxProviderIcons.TryGetValue(normalized, out var exact))
        {
            return exact;
        }

        return Contains(normalized, "avalara") ? Avalara : null;
    }

    /// <summary>
    /// Gets a branded icon for fulfilment provider metadata.
    /// </summary>
    public static string? GetFulfilmentProviderIconSvg(string? providerKey)
    {
        var normalized = Normalize(providerKey);
        if (string.IsNullOrEmpty(normalized))
        {
            return null;
        }

        if (FulfilmentProviderIcons.TryGetValue(normalized, out var exact))
        {
            return exact;
        }

        if (Contains(normalized, "shipbob")) return ShipBob;
        if (Contains(normalized, "shipmonk")) return ShipMonk;
        if (Contains(normalized, "shiphero")) return ShipHero;
        if (Contains(normalized, "helm")) return HelmWms;
        if (Contains(normalized, "deliverr")) return Deliverr;
        if (Contains(normalized, "flexport")) return Flexport;
        if (Contains(normalized, "stag")) return RedStag;

        return null;
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();
    }

    private static bool Contains(string value, string token)
    {
        return value.Contains(token, StringComparison.OrdinalIgnoreCase);
    }
}
