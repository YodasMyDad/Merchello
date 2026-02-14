/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../App_Plugins/Merchello/Views/Checkout/**/*.cshtml",
    "../wwwroot/App_Plugins/Merchello/js/checkout/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        // These are overridden at runtime via CSS custom properties
        primary: 'var(--color-primary, #000000)',
        accent: 'var(--color-accent, #0066FF)',
        error: 'var(--color-error, #DC2626)',
      },
      fontFamily: {
        heading: ['var(--font-heading, system-ui)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body, system-ui)', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
}
