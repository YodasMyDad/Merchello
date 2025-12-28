/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "../Views/Checkout/**/*.cshtml",
    "../wwwroot/js/checkout/**/*.js"
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
