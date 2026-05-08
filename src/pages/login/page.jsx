import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '@/context/AuthContext';

/**
 * LoginPage — improved error handling.
 *
 * Maps backend errors to specific fields + messages instead of showing
 * "Invalid Credentials" on everything. Recognized cases:
 *   • Wrong username/password           → identifier + password fields
 *   • Account locked                    → form-level banner with countdown
 *   • Account suspended/disabled        → form-level banner
 *   • Admin secret code wrong/missing   → secret_code field, auto-reveals
 *   • Pydantic 422 validation failures  → maps Pydantic loc → field
 *   • Network / server down             → form-level banner
 */
const LoginPage = () => {
    const navigate = useNavigate();
    const { login, isAuth, userRole, loading } = useContext(AuthContext);

    const [formData, setFormData] = useState({
        identifier:  '',
        password:    '',
        secret_code: '',
        rememberMe:  true,
    });

    const [showAdminField, setShowAdminField] = useState(false);
    const [showPassword,   setShowPassword]   = useState(false);
    const [errors,         setErrors]         = useState({});
    const [isLoading,      setIsLoading]      = useState(false);

    // ─── If already logged in, skip the login page ───────────────────────
    useEffect(() => {
        if (!loading && isAuth) {
            navigate(userRole === 'admin' ? '/admin' : '/investigator', { replace: true });
        }
    }, [loading, isAuth, userRole, navigate]);

    // ─── Validation ──────────────────────────────────────────────────────
    const validateForm = () => {
        const newErrors = {};

        if (!formData.identifier.trim()) {
            newErrors.identifier = 'Please enter your username or badge number';
        }
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
        if (errors[field] || errors.form) {
            setErrors({ ...errors, [field]: null, form: null });
        }
    };

    // ─── Backend error → UI mapping ──────────────────────────────────────
    /**
     * Translates a backend error response into a structured `errors` object
     * with one of: { form, identifier, password, secret_code }.
     *
     * Cases handled:
     *  - axios network failure (no response object)         → form
     *  - 422 Pydantic validation                            → field-by-field
     *  - 400 with `detail` string                           → pattern-matched
     *  - 403 (account inactive / locked)                    → form
     *  - 5xx server errors                                  → form
     */
    const mapBackendError = (err) => {
        // No response → network error / server down / CORS still broken
        if (!err.response) {
            return { form: 'Cannot reach server. Check your connection and try again.' };
        }

        const { status, data } = err.response;

        // ── 422: Pydantic validation (empty fields, wrong types) ─────────
        if (status === 422 && Array.isArray(data?.detail)) {
            const fieldErrors = {};
            for (const issue of data.detail) {
                // Pydantic returns loc like ["body", "identifier"]
                const fieldName = issue.loc?.[issue.loc.length - 1];
                if (fieldName === 'identifier' || fieldName === 'password' || fieldName === 'secret_code') {
                    fieldErrors[fieldName] = issue.msg;
                } else {
                    fieldErrors.form = issue.msg;
                }
            }
            return fieldErrors;
        }

        // ── 400/403: backend returns a plain string in `detail` ──────────
        const msg = typeof data?.detail === 'string'
            ? data.detail
            : 'Login failed. Please try again.';

        const lower = msg.toLowerCase();

        // Admin secret code issues
        if (lower.includes('admin') && lower.includes('code')) {
            return { secret_code: msg };
        }

        // Account locked
        if (lower.includes('locked') || lower.includes('too many failed')) {
            return { form: msg };
        }

        // Account inactive / suspended / disabled
        if (lower.includes('account is') || lower.includes('suspended') || lower.includes('disabled') || lower.includes('not active')) {
            return { form: msg };
        }

        // Invalid credentials — light up both identifier and password
        if (lower.includes('credential') || lower.includes('invalid')) {
            return {
                identifier: 'Check your username or badge number',
                password:   'Check your password',
                form:       msg,
            };
        }

        // Server error
        if (status >= 500) {
            return { form: 'Server error. Please try again in a moment.' };
        }

        // Fallback — show whatever the backend said
        return { form: msg };
    };

    // ─── Submit ──────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        setErrors({});

        try {
            const me = await login({
                identifier:  formData.identifier.trim(),
                password:    formData.password,
                secret_code: formData.secret_code.trim() || undefined,
                rememberMe:  formData.rememberMe,
            });
            navigate(me.role === 'admin' ? '/admin' : '/investigator', { replace: true });
        } catch (err) {
            const mapped = mapBackendError(err);
            setErrors(mapped);

            // If the error mentions admin secret code, reveal that field
            if (mapped.secret_code) {
                setShowAdminField(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const isDisabled =
        isLoading ||
        !formData.identifier.trim() ||
        !formData.password;

    return (
        <div className="min-h-screen bg-linear-to-br from-deep-ocean-900 to-slate-blue via-deep-ocean flex items-center justify-center p-4">
            <div className="w-full max-w-lg">
                <div className="bg-white rounded-lg shadow-2xl p-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-4">
                            <img src="/logo.png" alt="Criminal Investigation Assistant" width={150} height={150} />
                        </div>
                        <h1 className="text-2xl font-serif font-bold mb-2 text-center text-deep-ocean">
                            Criminal Investigation Assistant
                        </h1>
                        <p className="text-sm text-slate-blue text-center">
                            A Secure Platform for Criminal Analysis
                        </p>
                    </div>

                    {/* Form-level error banner */}
                    {errors.form && (
                        <div
                            role="alert"
                            className="mb-4 px-4 py-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2"
                        >
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{errors.form}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        {/* Identifier */}
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                Username or Badge Number
                            </label>
                            <input
                                id="identifier"
                                type="text"
                                value={formData.identifier}
                                onChange={(e) => handleInputChange('identifier', e.target.value)}
                                className={`w-full px-4 py-3 rounded-md border-2 transition-all duration-200 placeholder:text-gray-300 ${
                                    errors.identifier ? 'border-crimson-red' : 'border-transparent'
                                }`}
                                style={{ backgroundColor: '#345A76', color: '#ffffff' }}
                                placeholder="e.g. rashid.ali or CIA/INV-2300"
                                aria-invalid={errors.identifier ? 'true' : 'false'}
                                aria-describedby={errors.identifier ? 'identifier-error' : undefined}
                                autoComplete="username"
                                disabled={isLoading}
                            />
                            {errors.identifier && (
                                <p id="identifier-error" className="mt-1 text-sm text-crimson-red text-left" role="alert">
                                    {errors.identifier}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    className={`w-full px-4 py-3 pr-12 rounded-md border-2 transition-all duration-200 placeholder:text-gray-300 ${
                                        errors.password ? 'border-crimson-red' : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: '#345A76', color: '#ffffff' }}
                                    placeholder="Enter your password"
                                    aria-invalid={errors.password ? 'true' : 'false'}
                                    aria-describedby={errors.password ? 'password-error' : undefined}
                                    autoComplete="current-password"
                                    disabled={isLoading}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform cursor-pointer -translate-y-1/2 text-gray-300 hover:text-gray-400 focus:outline-none"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.532 13.532l-3.29-3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p id="password-error" className="mt-1 text-sm text-crimson-red text-left" role="alert">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* Admin secret code — collapsible */}
                        {!showAdminField ? (
                            <div className="text-left">
                                <button
                                    type="button"
                                    onClick={() => setShowAdminField(true)}
                                    className="text-sm text-gray-600 hover:text-forest-teal transition-colors focus:outline-none"
                                >
                                    Admin login? Enter secret code →
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label htmlFor="adminSecret" className="block text-sm font-medium text-gray-700 text-left">
                                        Admin Secret Code
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowAdminField(false);
                                            setFormData({ ...formData, secret_code: '' });
                                            setErrors({ ...errors, secret_code: null });
                                        }}
                                        className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Hide
                                    </button>
                                </div>
                                <input
                                    id="adminSecret"
                                    type="password"
                                    value={formData.secret_code}
                                    onChange={(e) => handleInputChange('secret_code', e.target.value)}
                                    className={`w-full px-4 py-3 rounded-md border-2 transition-all duration-200 placeholder:text-gray-300 ${
                                        errors.secret_code ? 'border-crimson-red' : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: '#345A76', color: '#ffffff' }}
                                    placeholder="Required only for admin accounts"
                                    aria-invalid={errors.secret_code ? 'true' : 'false'}
                                    aria-describedby={errors.secret_code ? 'adminSecret-error' : undefined}
                                    autoComplete="off"
                                    disabled={isLoading}
                                />
                                {errors.secret_code && (
                                    <p id="adminSecret-error" className="mt-1 text-sm text-crimson-red text-left" role="alert">
                                        {errors.secret_code}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Remember Me + Forgot Password */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="rememberMe"
                                    type="checkbox"
                                    checked={formData.rememberMe}
                                    onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-forest-teal"
                                />
                                <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700 cursor-pointer">
                                    Remember Me
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password')}
                                className="text-sm text-gray-600 hover:text-forest-teal transition-colors focus:outline-none"
                            >
                                Forgot Password?
                            </button>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isDisabled}
                            className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-deep-ocean-900 ${
                                isDisabled
                                    ? 'opacity-70 cursor-not-allowed'
                                    : 'hover:opacity-90 active:scale-[0.98] cursor-pointer'
                            }`}
                            aria-busy={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Logging in...
                                </span>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-6 text-center text-white text-sm opacity-80">
                    Secure access for authorized personnel only
                </p>
            </div>
        </div>
    );
};

export default LoginPage;