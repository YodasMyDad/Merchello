// @ts-check
/**
 * Merchello Checkout - Contact Section Component
 *
 * Handles email input, account checking, sign-in, and account creation.
 */

import { checkoutApi } from '../services/api.js';
import { validateEmail } from '../services/validation.js';
import { debounce } from '../utils/debounce.js';

/**
 * Initialize the contact section Alpine.data component
 */
export function initContactSection() {
    // @ts-ignore - Alpine is global
    Alpine.data('contactSection', (initialEmail = '') => ({
        // State
        email: initialEmail,
        password: '',
        acceptsMarketing: false,

        // Account UI state
        showAccountSection: false,
        hasExistingAccount: false,
        checkingEmail: false,

        // Password validation
        passwordValid: false,
        passwordErrors: [],
        validatingPassword: false,

        // Sign-in state
        signInError: '',
        showForgotPassword: false,
        signingIn: false,
        isSignedIn: false,

        // Validation
        emailError: '',
        _emailCaptured: '',

        // Debounced password validation
        _debouncedValidatePassword: null,

        /**
         * Initialize the component
         */
        init() {
            // Create debounced password validator
            this._debouncedValidatePassword = debounce(() => {
                if (!this.hasExistingAccount) {
                    this.validatePassword();
                }
            }, 500);

            // Sync email to store on changes
            this.$watch('email', (value) => {
                // @ts-ignore - Alpine store
                this.$store.checkout.setEmail(value);
            });

            // Set initial email in store
            if (this.email) {
                // @ts-ignore - Alpine store
                this.$store.checkout.setEmail(this.email);
            }
        },

        /**
         * Validate email field
         * @returns {Promise<boolean>}
         */
        async validateEmailField() {
            const result = validateEmail(this.email);
            this.emailError = result.error || '';

            if (result.isValid) {
                // Capture email to session
                await this.captureEmail();

                // Track analytics
                if (window.MerchelloSinglePageAnalytics) {
                    window.MerchelloSinglePageAnalytics.trackContactInfo(this.email);
                }

                // Notify parent that email is valid (for payment initialization)
                this.$dispatch('email-validated', { email: this.email });
            }

            return result.isValid;
        },

        /**
         * Capture email to session for abandoned checkout
         */
        async captureEmail() {
            if (!this.email || this._emailCaptured === this.email) return;

            try {
                const response = await checkoutApi.captureEmail(this.email);
                if (response.success !== false) {
                    this._emailCaptured = this.email;
                }
            } catch (error) {
                console.error('Failed to capture email:', error);
            }
        },

        /**
         * Show account section and check for existing account
         */
        async showAccount() {
            this.showAccountSection = true;
            await this.checkEmailForAccount();
        },

        /**
         * Check if email has an existing account
         */
        async checkEmailForAccount() {
            if (!this.email) return;

            this.checkingEmail = true;
            try {
                const data = await checkoutApi.checkEmail(this.email);
                this.hasExistingAccount = data.hasExistingAccount;
            } catch {
                this.hasExistingAccount = false;
            } finally {
                this.checkingEmail = false;
            }
        },

        /**
         * Handle password input (debounced validation)
         */
        onPasswordInput() {
            if (this._debouncedValidatePassword) {
                this._debouncedValidatePassword();
            }
        },

        /**
         * Validate password against requirements
         */
        async validatePassword() {
            if (!this.password) {
                this.passwordErrors = [];
                this.passwordValid = false;
                return;
            }

            this.validatingPassword = true;
            try {
                const data = await checkoutApi.validatePassword(this.password);
                this.passwordErrors = data.errors || [];
                this.passwordValid = data.isValid;
            } catch {
                this.passwordErrors = ['Unable to validate password'];
                this.passwordValid = false;
            } finally {
                this.validatingPassword = false;
            }
        },

        /**
         * Attempt to sign in with existing account
         */
        async attemptSignIn() {
            this.signingIn = true;
            this.signInError = '';

            try {
                const data = await checkoutApi.signIn(this.email, this.password);

                if (data.success) {
                    this.isSignedIn = true;
                    this.signInError = '';
                    this.showForgotPassword = false;
                    this.$dispatch('signed-in', { email: this.email });
                } else {
                    this.signInError = data.errorMessage || 'Sign in failed';
                    this.showForgotPassword = data.showForgotPassword || false;
                }
            } catch {
                this.signInError = 'Unable to sign in. Please try again.';
            } finally {
                this.signingIn = false;
            }
        },

        /**
         * Cancel account section
         */
        cancelAccountSection() {
            this.showAccountSection = false;
            this.password = '';
            this.passwordErrors = [];
            this.passwordValid = false;
            this.signInError = '';
            this.showForgotPassword = false;
            this.isSignedIn = false;
            this.hasExistingAccount = false;
        },

        /**
         * Open forgot password page
         */
        openForgotPassword() {
            window.open('/forgot-password?email=' + encodeURIComponent(this.email), '_blank');
        },

        /**
         * Check if password should be sent with order
         * @returns {string|null}
         */
        getPasswordForOrder() {
            // Only return password for new account creation
            if (this.showAccountSection && !this.hasExistingAccount && this.password && this.passwordValid) {
                return this.password;
            }
            return null;
        }
    }));
}

export default { initContactSection };
