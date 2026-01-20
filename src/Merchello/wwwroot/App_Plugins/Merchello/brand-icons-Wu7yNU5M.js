const l = {
  // Credit card icon
  card: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 9h20" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="13" width="5" height="2" rx="0.5" fill="currentColor" opacity="0.5"/></svg>',
  // PayPal "PP" logo
  paypal: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106z" fill="#003087"/><path d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132l-1.41 8.95a.568.568 0 0 0 .562.655h3.94c.578 0 1.069-.42 1.16-.99l.045-.24.92-5.815.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.658-1.377z" fill="#0070E0"/></svg>',
  // Apple logo
  apple: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="currentColor"/></svg>',
  // Google "G" logo (colored)
  google: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>',
  // Venmo "V" logo
  venmo: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.5 1c.87 1.44 1.26 2.92 1.26 4.8 0 5.98-5.1 13.75-9.24 19.2H4.2L1 2.85l6.24-.6 1.86 14.9C11.04 13.5 13.2 8.18 13.2 5.08c0-1.74-.3-2.92-.78-3.9L19.5 1z" fill="#3D95CE"/></svg>',
  // Link (Stripe) icon
  link: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="4" fill="#00D66F"/><path d="M6 7h1.5v10H6V7zm3 2.5c0-1.5 1.1-2.5 2.5-2.5.9 0 1.6.4 2 1V7.5h1.2V17H13.5v-1c-.4.6-1.1 1-2 1-1.4 0-2.5-1.1-2.5-2.5v-3zm3.7.2c0-.9-.7-1.5-1.5-1.5s-1.5.7-1.5 1.5v2.6c0 .9.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V9.7zM16 7h1.2v10H16V7z" fill="white"/></svg>',
  // Manual/wallet icon
  manual: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 7h-1V6a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-8a3 3 0 0 0-3-3zM5 5h10a1 1 0 0 1 1 1v1H5a1 1 0 0 1 0-2zm15 10h-2a1 1 0 0 1 0-2h2v2z" fill="currentColor"/></svg>',
  // Stripe "S" logo
  stripe: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" fill="#635BFF"/></svg>',
  // Braintree logo (simplified tree icon)
  braintree: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.18L18 8v8l-6 3.75L6 16V8l6-3.82z" fill="#003366"/><path d="M12 6l-4 2.5v5L12 16l4-2.5v-5L12 6zm0 1.55l2.5 1.56v3.12L12 13.8l-2.5-1.56V9.1L12 7.55z" fill="#003366"/></svg>',
  // WorldPay "W" logo
  worldpay: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 6l3.5 12h2.5l2-7 2 7h2.5l3.5-12h-2.5l-2.25 8-2.25-8h-2l-2.25 8-2.25-8H2z" fill="#DF1B26"/></svg>',
  // iDEAL (Netherlands)
  ideal: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#CC0066"/><text x="12" y="14" text-anchor="middle" fill="white" font-size="8" font-weight="bold" font-family="Arial, sans-serif">iDEAL</text></svg>',
  // Bancontact (Belgium)
  bancontact: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#005498"/><circle cx="9" cy="12" r="4" fill="#FFD800"/><circle cx="15" cy="12" r="4" fill="#FFD800"/></svg>',
  // SEPA (EU-wide)
  sepa: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#003399"/><circle cx="12" cy="12" r="5" fill="none" stroke="#FFCC00" stroke-width="1.5"/><path d="M7 12h10" stroke="#FFCC00" stroke-width="1"/></svg>',
  // EPS (Austria)
  eps: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#C8202F"/><text x="12" y="14" text-anchor="middle" fill="white" font-size="8" font-weight="bold" font-family="Arial, sans-serif">eps</text></svg>',
  // Przelewy24 (Poland)
  p24: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="4" width="20" height="16" rx="2" fill="#D13239"/><text x="12" y="14" text-anchor="middle" fill="white" font-size="7" font-weight="bold" font-family="Arial, sans-serif">P24</text></svg>'
};
function i(e) {
  const t = e.toLowerCase();
  return t.includes("card") ? l.card : t.includes("paypal") ? l.paypal : t.includes("apple") ? l.apple : t.includes("google") ? l.google : t.includes("venmo") ? l.venmo : t.includes("link") ? l.link : t.includes("manual") ? l.manual : t.includes("stripe") ? l.stripe : t.includes("braintree") ? l.braintree : t === "ideal" ? l.ideal : t === "bancontact" ? l.bancontact : t === "sepa" ? l.sepa : t === "eps" ? l.eps : t === "p24" ? l.p24 : null;
}
function r(e) {
  const t = e.toLowerCase();
  return t === "stripe" ? l.stripe : t === "braintree" ? l.braintree : t === "paypal" ? l.paypal : t === "worldpay" ? l.worldpay : t === "manual" ? l.manual : null;
}
export {
  r as a,
  i as g
};
//# sourceMappingURL=brand-icons-Wu7yNU5M.js.map
