import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    badge_number: '',
    password: '',
    isAdmin: false,
    secret_code: '',
    rememberMe: true
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate()
  const { login } = useContext(AuthContext);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.badge_number.trim() || formData.badge_number === '') {
      newErrors.badge_number = 'Please enter a valid Investigator ID';
    }

    if (!formData.password.trim() || formData.password === '') {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if ((!formData.secret_code.trim() || formData.secret_code === '') && formData.isAdmin) {
      newErrors.secret_code = 'Admin secret_code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const clear = () => {
    setFormData({
      badge_number: '',
      password: '',
      isAdmin: false,
      secret_code: '',
      rememberMe: true
    })
  }

  const handleLogin = async () => {
    const url = import.meta.env.VITE_API_URL;
    try {
      const res = await axios.post(`${url}/api/login`, { badge_number: formData.badge_number, password: formData.password, secret_code: formData.secret_code });
      login(res.data.access_token);
      const role = res.data.role;
      navigate(role === "admin" ? "/admin" : "/investigator");
    } catch (err) {
      setErrors({ ...errors, secret_code: 'Invalid Credentials.', password: 'Invalid Credentials.', badge_number: 'Invalid Credentials.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    console.log(formData)

    setIsLoading(true);
    handleLogin();
    clear();
    setIsLoading(false);
    
  };

  const handleFocus = (field) => {
    if (field === 'badge_number' && formData.badge_number === '') {
      setFormData({ ...formData, badge_number: '' });
    }
    if (field === 'password' && formData.password === '') {
      setFormData({ ...formData, password: '' });
    }
    if (field === 'secret_code' && formData.secret_code === '') {
      setFormData({ ...formData, secret_code: '' });
    }
  };

  const handleBlur = (field) => {
    if (field === 'badge_number' && !formData.badge_number.trim()) {
      setFormData({ ...formData, badge_number: '' });
    }
    if (field === 'password' && !formData.password.trim()) {
      setFormData({ ...formData, password: '' });
    }
    if (field === 'secret_code' && !formData.secret_code.trim()) {
      setFormData({ ...formData, secret_code: '' });
    }
  };

  return (
    <div
      className="min-h-screen bg-linear-to-br from-deep-ocean-900 to-slate-blue via-deep-ocean flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg">
        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            {/* Logo Icon */}
            <div className="mb-4">
              <img src={'/dist/logo.png'} alt="Criminal Investigation Assistant Logo" width={150} height={150} />
            </div>

            {/* Title */}
            <h1
              className="text-2xl font-serif font-bold mb-2 text-center text-deep-ocean"
            >
              Criminal Investigation Assistant
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-slate-blue text-center">
              A Secure Platform for Criminal Analysis
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Login as Admin */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="isAdmin"
                  type="checkbox"
                  checked={formData.isAdmin}
                  onChange={(e) => handleInputChange('isAdmin', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-forest-teal"
                />
                <label
                  htmlFor="isAdmin"
                  className="ml-2 text-sm text-gray-700 cursor-pointer"
                >
                  Login as Admin
                </label>
              </div>
            </div>

            {/* Investigator ID Field */}
            <div>
              <label
                htmlFor="badge_number"
                className="block text-sm font-medium text-gray-700 mb-2 text-left"
              >
                Investigator ID
              </label>
              <input
                id="badge_number"
                type="text"
                value={formData.badge_number}
                onChange={(e) => handleInputChange('badge_number', e.target.value)}
                onFocus={() => handleFocus('badge_number')}
                onBlur={() => handleBlur('badge_number')}
                className={`w-full px-4 py-3 rounded-md border-2 transition-all duration-200 placeholder:text-gray-300 ${errors.badge_number
                  }`}
                style={{
                  backgroundColor: '#345A76',
                  color: '#ffffff'
                }}
                placeholder="Enter Investigator ID"
                aria-invalid={errors.badge_number ? 'true' : 'false'}
                aria-describedby={errors.badge_number ? 'badge_number-error' : undefined}
                autoComplete="username"
              />
              {errors.badge_number && (
                <p
                  id="badge_number-error"
                  className="mt-1 text-sm text-crimson-red text-left"
                  role="alert"
                >
                  {errors.badge_number}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2 text-left"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onFocus={() => handleFocus('password')}
                  onBlur={() => handleBlur('password')}
                  className={`w-full px-4 py-3 pr-12 rounded-md border-2 transition-all duration-200 placeholder:text-gray-300 ${errors.password
                    }`}
                  style={{
                    backgroundColor: '#345A76',
                    color: '#ffffff'
                  }}
                  placeholder="Enter your password"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  autoComplete="current-password"
                />
                {/* HCI Principle: Visibility - Show/Hide password toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-gray-400 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                <p
                  id="password-error"
                  className="mt-1 text-sm text-crimson-red text-left"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
            </div>

            {/* Admin secret_code Field */}
            <div className={`${formData.isAdmin ? 'block' : 'hidden'}`}>
              <label
                htmlFor="adminSecret"
                className="block text-sm font-medium text-gray-700 mb-2 text-left"
              >
                Admin secret_code
              </label>
              <input
                id="adminSecret"
                type="text"
                value={formData.secret_code || ''}
                onChange={(e) => handleInputChange('secret_code', e.target.value)}
                onFocus={() => handleFocus('secret_code')}
                onBlur={() => handleBlur('secret_code')}
                className={`w-full px-4 py-3 rounded-md border-2 transition-all duration-200 placeholder:text-gray-300 ${errors.badge_number
                  }`}
                style={{
                  backgroundColor: '#345A76',
                  color: '#ffffff'
                }}
                placeholder="Enter Admin secret_code"
                aria-invalid={errors.secret_code ? 'true' : 'false'}
                aria-describedby={errors.secret_code ? 'adminSecret-error' : undefined}
                autoComplete="username"
              />
              {errors.secret_code && (
                <p
                  id="adminSecret-error"
                  className="mt-1 text-sm text-crimson-red text-left"
                  role="alert"
                >
                  {errors.secret_code}
                </p>
              )}
            </div>

            {/* Remember Me and Forget Password */}
            <div className="flex items-center justify-between">
              {/* HCI Principle: Recognition - Clear checkbox label */}
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-forest-teal"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 text-sm text-gray-700 cursor-pointer"
                >
                  Remember Me
                </label>
              </div>

              {/* HCI Principle: User Control - Forgot password link */}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Handle forgot password
                  alert('Forgot password functionality would be implemented here');
                }}
                className="text-sm text-gray-600 hover:text-forest-teal transition-colors focus:outline-none focus:ring-2 focus:ring-forest-teal rounded"
              >
                Forget Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${isLoading
                ? 'opacity-70 cursor-not-allowed'
                : 'hover:opacity-90 active:scale-[0.98]'
                }`}
              style={{ backgroundColor: '#23403D' }}
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

        {/* HCI Principle: Help and Documentation - Additional info */}
        <p className="mt-6 text-center text-white text-sm opacity-80">
          Secure access for authorized personnel only
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

