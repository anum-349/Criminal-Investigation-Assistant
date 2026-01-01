import { useState } from 'react';

const LoginPage = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    investigatorId: '',
    password: '',
    rememberMe: true
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // HCI Principle: Error Prevention - Input validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.investigatorId.trim() || formData.investigatorId === '') {
      newErrors.investigatorId = 'Please enter a valid Investigator ID';
    }

    if (!formData.password.trim() || formData.password === '') {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // HCI Principle: User Control - Handle input changes
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // HCI Principle: Error Recovery - Clear errors on input
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  // HCI Principle: Feedback - Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      if (onLogin) {
        onLogin(formData);
      }
    }, 1500);
  };

  // HCI Principle: User Control - Handle focus events
  const handleFocus = (field) => {
    if (field === 'investigatorId' && formData.investigatorId === '') {
      setFormData({ ...formData, investigatorId: '' });
    }
    if (field === 'password' && formData.password === '') {
      setFormData({ ...formData, password: '' });
    }
  };

  const handleBlur = (field) => {
    if (field === 'investigatorId' && !formData.investigatorId.trim()) {
      setFormData({ ...formData, investigatorId: '' });
    }
    if (field === 'password' && !formData.password.trim()) {
      setFormData({ ...formData, password: '' });
    }
  };

  return (
    <div 
      className="min-h-screen bg-linear-to-b from-[#1B3C53] via-[#345A76] to-[#456882] flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg">
        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            {/* Logo Icon */}
            <div className="mb-4">
                <img src={'/dist/logo.png'} alt="Criminal Investigation Assistant Logo" width={150} height={150}/>
            </div>

            {/* Title */}
            <h1 
              className="text-2xl font-serif font-bold mb-2 text-center"
              style={{ color: '#23403D' }}
            >
              Criminal Investigation Assistant
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-[#456882] text-center">
              A Secure Platform for Criminal Analysis
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Investigator ID Field */}
            <div>
              <label 
                htmlFor="investigatorId" 
                className="block text-sm font-medium text-gray-700 mb-2 text-left"
              >
                Investigator ID
              </label>
              <input
                id="investigatorId"
                type="text"
                value={formData.investigatorId}
                onChange={(e) => handleInputChange('investigatorId', e.target.value)}
                onFocus={() => handleFocus('investigatorId')}
                onBlur={() => handleBlur('investigatorId')}
                className={`w-full px-4 py-3 rounded-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 placeholder:text-gray-300 ${
                  errors.investigatorId 
                    ?  'focus:ring-red-500' 
                    : 'focus:ring-[#23403D]'
                }`}
                style={{
                  backgroundColor: '#345A76',
                  color: '#ffffff'
                }}
                placeholder="Enter Investigator ID"
                aria-invalid={errors.investigatorId ? 'true' : 'false'}
                aria-describedby={errors.investigatorId ? 'investigatorId-error' : undefined}
                autoComplete="username"
              />
              {errors.investigatorId && (
                <p 
                  id="investigatorId-error" 
                  className="mt-1 text-sm text-red-600 text-left" 
                  role="alert"
                >
                  {errors.investigatorId}
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
                  className={`w-full px-4 py-3 pr-12 rounded-md border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-opacity-50 placeholder:text-gray-300 ${
                    errors.password 
                      ? ' focus:ring-red-500' 
                      : ' focus:ring-[#23403D] '
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
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
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
                  className="mt-1 text-sm text-red-600 text-left" 
                  role="alert"
                >
                  {errors.password}
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
                  className="w-4 h-4 rounded border-gray-300 text-[#23403D] focus:ring-[#23403D] focus:ring-2"
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
                className="text-sm text-gray-600 hover:text-[#23403D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#23403D] rounded"
              >
                Forget Password?
              </a>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isLoading
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

