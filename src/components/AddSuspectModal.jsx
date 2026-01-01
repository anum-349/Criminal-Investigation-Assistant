import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AddSuspectModal = ({ isOpen, onClose, onSubmit, caseData }) => {
  const [formData, setFormData] = useState({
    caseUuid: caseData?.caseId || 'CASE - 12345',
    relatedCase: caseData?.title || 'Bank robbery at downtown',
    firId: caseData?.firId || 'FIR - 6870',
    suspectName: 'Michael',
    lastName: '',
    gender: 'Male',
    dateOfBirth: '2024-11-12',
    physicalDescription: 'African American Male, 6\'1, 200 lbs',
    knownAffiliations: 'Crips',
    notes: '',
    picture: null,
    pictureName: '',
    picturePreview: null
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const [formCompletion, setFormCompletion] = useState(0);
  const fileInputRef = useRef(null);

  const navigate = useNavigate();

  // HCI Principle: Visibility - Calculate form completion percentage
  useEffect(() => {
    const requiredFields = ['caseUuid', 'relatedCase', 'suspectName', 'gender', 'dateOfBirth', 'knownAffiliations'];
    const filledFields = requiredFields.filter(field => {
      const value = formData[field];
      return value && value.toString().trim() !== '';
    });
    const completion = Math.round((filledFields.length / requiredFields.length) * 100);
    setFormCompletion(completion);
  }, [formData]);

  // Mock data for dropdowns
  const caseOptions = [
    { value: 'CASE - 12345', label: 'CASE - 12345' },
    { value: 'CASE - 12346', label: 'CASE - 12346' },
    { value: 'CASE - 12347', label: 'CASE - 12347' }
  ];

  const relatedCaseOptions = [
    { value: 'Bank robbery at downtown', label: 'Bank robbery at downtown' },
    { value: 'Armed robbery at Main Street', label: 'Armed robbery at Main Street' },
    { value: 'Theft at Shopping Mall', label: 'Theft at Shopping Mall' }
  ];

  const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'];

  // HCI Principle: Error Prevention - Enhanced input validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.caseUuid.trim()) {
      newErrors.caseUuid = 'Case UUID is required';
    }

    if (!formData.relatedCase.trim()) {
      newErrors.relatedCase = 'Related Case is required';
    }

    if (!formData.suspectName.trim()) {
      newErrors.suspectName = 'Suspect Name is required';
    } else if (formData.suspectName.trim().length < 2) {
      newErrors.suspectName = 'Suspect Name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.suspectName.trim())) {
      newErrors.suspectName = 'Suspect Name can only contain letters, spaces, hyphens, and apostrophes';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of Birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (birthDate > today) {
        newErrors.dateOfBirth = 'Date of Birth cannot be in the future';
      } else if (age > 120) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth';
      } else if (age < 0 || (age === 0 && monthDiff < 0)) {
        newErrors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }

    if (!formData.knownAffiliations.trim()) {
      newErrors.knownAffiliations = 'Known Affiliations is required';
    }

    // HCI Principle: Error Prevention - Validate physical description length
    if (formData.physicalDescription && formData.physicalDescription.length > 500) {
      newErrors.physicalDescription = 'Physical description must be less than 500 characters';
    }

    // HCI Principle: Error Prevention - Validate notes length
    if (formData.notes && formData.notes.length > 2000) {
      newErrors.notes = 'Notes must be less than 2000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // HCI Principle: User Control - Handle input changes with field tracking
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // HCI Principle: Error Recovery - Clear errors on input
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
    // HCI Principle: Visibility - Track touched fields for better UX
    if (!touchedFields[field]) {
      setTouchedFields({ ...touchedFields, [field]: true });
    }
  };

  // HCI Principle: Feedback - Handle field blur for validation
  const handleBlur = (field) => {
    setTouchedFields({ ...touchedFields, [field]: true });
    // Validate individual field on blur
    if (field === 'suspectName' && formData.suspectName.trim()) {
      if (formData.suspectName.trim().length < 2) {
        setErrors({ ...errors, suspectName: 'Suspect Name must be at least 2 characters' });
      } else if (!/^[a-zA-Z\s'-]+$/.test(formData.suspectName.trim())) {
        setErrors({ ...errors, suspectName: 'Suspect Name can only contain letters, spaces, hyphens, and apostrophes' });
      }
    }
  };

  // HCI Principle: User Control - Clear field functionality
  const handleClearField = (field) => {
    if (field === 'physicalDescription') {
      setFormData({ ...formData, physicalDescription: '' });
    } else if (field === 'knownAffiliations') {
      setFormData({ ...formData, knownAffiliations: '' });
    } else if (field === 'picture') {
      setFormData({ ...formData, picture: null, pictureName: '', picturePreview: null });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    // Clear errors when clearing field
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  // HCI Principle: User Control - Enhanced file upload handling with preview
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrors({ ...errors, picture: 'Please upload a valid image file (JPEG, PNG, GIF, WebP)' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, picture: 'File size must be less than 5MB' });
        return;
      }

      // HCI Principle: Visibility - Create preview for uploaded image
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          picture: file,
          pictureName: file.name,
          picturePreview: reader.result
        });
      };
      reader.readAsDataURL(file);

      if (errors.picture) {
        setErrors({ ...errors, picture: null });
      }
    }
  };

  // HCI Principle: Feedback - Enhanced form submission with validation feedback
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all fields as touched for comprehensive error display
    const allFields = Object.keys(formData);
    const touched = {};
    allFields.forEach(field => {
      touched[field] = true;
    });
    setTouchedFields(touched);

    if (!validateForm()) {
      // HCI Principle: Feedback - Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const errorElement = document.getElementById(firstErrorField);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          errorElement.focus();
        }
      }
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      if (onSubmit) {
        onSubmit(formData);
      }
      onClose();
    }, 1500);
  };

  // HCI Principle: User Control - Handle cancel
  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? Unsaved changes will be lost.')) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="suspect-modal-title"
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#14374E] border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex justify-between items-center mb-2">
            <h2 id="suspect-modal-title" className="text-2xl font-semibold text-white">
              Add Suspect
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white rounded"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* HCI Principle: Visibility - Form completion indicator */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white opacity-80">Form Completion</span>
              <span className="text-xs text-white font-medium">{formCompletion}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  formCompletion === 100 ? 'bg-green-400' :
                  formCompletion >= 70 ? 'bg-yellow-400' : 'bg-blue-400'
                }`}
                style={{ width: `${formCompletion}%` }}
                role="progressbar"
                aria-valuenow={formCompletion}
                aria-valuemin="0"
                aria-valuemax="100"
              ></div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {/* Case UUID */}
          <div className="mb-4">
            <label 
              htmlFor="caseUuid" 
              className="block text-sm font-medium text-gray-700 mb-1 text-left"
            >
              Case UUID
            </label>
            <select
              id="caseUuid"
              value={formData.caseUuid}
              onChange={(e) => handleInputChange('caseUuid', e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14374E] ${
                errors.caseUuid ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-invalid={errors.caseUuid ? 'true' : 'false'}
              aria-describedby={errors.caseUuid ? 'caseUuid-error' : undefined}
            >
              {caseOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.caseUuid && (
              <p id="caseUuid-error" className="mt-1 text-sm text-red-600 text-left" role="alert">
                {errors.caseUuid}
              </p>
            )}
          </div>

          {/* Related Case */}
          <div className="mb-4">
            <label 
              htmlFor="relatedCase" 
              className="block text-sm font-medium text-gray-700 mb-1 text-left"
            >
              Related Case
            </label>
            <select
              id="relatedCase"
              value={formData.relatedCase}
              onChange={(e) => handleInputChange('relatedCase', e.target.value)}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14374E] ${
                errors.relatedCase ? 'border-red-500' : 'border-gray-300'
              }`}
              aria-invalid={errors.relatedCase ? 'true' : 'false'}
              aria-describedby={errors.relatedCase ? 'relatedCase-error' : undefined}
            >
              {relatedCaseOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {/* HCI Principle: Visibility - Show linked FIR ID */}
            <p className="mt-1 text-sm text-gray-600 text-left">
              {formData.firId}
            </p>
            {errors.relatedCase && (
              <p id="relatedCase-error" className="mt-1 text-sm text-red-600 text-left" role="alert">
                {errors.relatedCase}
              </p>
            )}
          </div>

          {/* Suspect Name */}
          <div className="mb-4">
            <label 
              htmlFor="suspectName" 
              className="block text-sm font-medium text-gray-700 mb-1 text-left"
            >
              Suspect Name
              <span className="text-red-500 ml-1" aria-label="Required field">*</span>
            </label>
            <input
              id="suspectName"
              type="text"
              value={formData.suspectName}
              onChange={(e) => handleInputChange('suspectName', e.target.value)}
              onBlur={() => handleBlur('suspectName')}
              maxLength={50}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14374E] transition-colors ${
                errors.suspectName && touchedFields.suspectName
                  ? 'border-red-500 bg-red-50' 
                  : touchedFields.suspectName && !errors.suspectName
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300'
              }`}
              placeholder="Enter suspect Name (e.g., John)"
              aria-invalid={errors.suspectName && touchedFields.suspectName ? 'true' : 'false'}
              aria-describedby={errors.suspectName && touchedFields.suspectName ? 'suspectName-error suspectName-help' : 'suspectName-help'}
              aria-required="true"
            />
            {errors.suspectName && touchedFields.suspectName && (
              <p id="suspectName-error" className="mt-1 text-sm text-red-600 text-left flex items-center gap-1" role="alert">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.suspectName}
              </p>
            )}
            <p id="suspectName-help" className="mt-1 text-xs text-gray-500 text-left">
              {formData.suspectName.length}/50 characters
            </p>
          </div>

          {/* Gender and Date of Birth - Side by Side */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label 
                htmlFor="gender" 
                className="block text-sm font-medium text-gray-700 mb-1 text-left"
              >
                Gender
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14374E] ${
                  errors.gender ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-invalid={errors.gender ? 'true' : 'false'}
                aria-describedby={errors.gender ? 'gender-error' : undefined}
              >
                {genderOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.gender && (
                <p id="gender-error" className="mt-1 text-sm text-red-600 text-left" role="alert">
                  {errors.gender}
                </p>
              )}
            </div>
            <div>
              <label 
                htmlFor="dateOfBirth" 
                className="block text-sm font-medium text-gray-700 mb-1 text-left"
              >
                Date of Birth
              </label>
              <div className="relative">
                <input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14374E] pr-10 ${
                    errors.dateOfBirth && touchedFields.dateOfBirth
                      ? 'border-red-500 bg-red-50' 
                      : touchedFields.dateOfBirth && !errors.dateOfBirth
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300'
                  }`}
                  aria-invalid={errors.dateOfBirth && touchedFields.dateOfBirth ? 'true' : 'false'}
                  aria-describedby={errors.dateOfBirth && touchedFields.dateOfBirth ? 'dateOfBirth-error dateOfBirth-help' : 'dateOfBirth-help'}
                  aria-required="true"
                />
              </div>
              {errors.dateOfBirth && touchedFields.dateOfBirth && (
                <p id="dateOfBirth-error" className="mt-1 text-sm text-red-600 text-left flex items-center gap-1" role="alert">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.dateOfBirth}
                </p>
              )}
              <p id="dateOfBirth-help" className="mt-1 text-xs text-gray-500 text-left">
                {formData.dateOfBirth && (() => {
                  const age = Math.floor((new Date() - new Date(formData.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000));
                  return age >= 8 ? `Age: ${age} years` : 'Invalid date';
                })()}
              </p>
            </div>
          </div>

          {/* Physical Description */}
          <div className="mb-4">
            <label 
              htmlFor="physicalDescription" 
              className="block text-sm font-medium text-gray-700 mb-1 text-left"
            >
              Physical Description
              <button
                type="button"
                className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                title="Enter physical characteristics like height, weight, build, hair color, eye color, etc."
                aria-label="Help: Enter physical characteristics"
              >
                <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.829V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            </label>
            <div className="relative">
              <textarea
                id="physicalDescription"
                value={formData.physicalDescription}
                onChange={(e) => handleInputChange('physicalDescription', e.target.value)}
                maxLength={500}
                rows={2}
                className={`w-full px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14374E] resize-y ${
                  errors.physicalDescription ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., African American Male, 6'1, 200 lbs, brown eyes, black hair"
                aria-invalid={errors.physicalDescription ? 'true' : 'false'}
                aria-describedby={errors.physicalDescription ? 'physicalDescription-error physicalDescription-help' : 'physicalDescription-help'}
              />
              {formData.physicalDescription && (
                <button
                  type="button"
                  onClick={() => handleClearField('physicalDescription')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#14374E] rounded"
                  aria-label="Clear physical description"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {errors.physicalDescription && (
              <p id="physicalDescription-error" className="mt-1 text-sm text-red-600 text-left" role="alert">
                {errors.physicalDescription}
              </p>
            )}
            <p id="physicalDescription-help" className="mt-1 text-xs text-gray-500 text-left">
              {formData.physicalDescription.length}/500 characters
            </p>
          </div>

          {/* Known Affiliations */}
          <div className="mb-4">
            <label 
              htmlFor="knownAffiliations" 
              className="block text-sm font-medium text-gray-700 mb-1 text-left"
            >
              Known Affiliations
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="knownAffiliations"
                type="text"
                value={formData.knownAffiliations}
                onChange={(e) => handleInputChange('knownAffiliations', e.target.value)}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#14374E]"
                placeholder="Enter known affiliations"
              />
              {formData.knownAffiliations && (
                <button
                  type="button"
                  onClick={() => handleClearField('knownAffiliations')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear known affiliations"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-4">
            <label 
              htmlFor="notes" 
              className="block text-sm font-medium text-gray-700 mb-1 text-left"
            >
              Notes
              <span className="text-gray-400 text-xs ml-2">(Optional)</span>
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              maxLength={2000}
              rows={3}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#14374E] resize-y ${
                errors.notes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter additional notes, observations, or relevant information about the suspect"
              aria-invalid={errors.notes ? 'true' : 'false'}
              aria-describedby={errors.notes ? 'notes-error notes-help' : 'notes-help'}
            />
            {errors.notes && (
              <p id="notes-error" className="mt-1 text-sm text-red-600 text-left" role="alert">
                {errors.notes}
              </p>
            )}
            <p id="notes-help" className="mt-1 text-xs text-gray-500 text-left">
              {formData.notes.length}/2000 characters
            </p>
          </div>

          {/* Picture Upload */}
          <div className="mb-6">
            <label 
              htmlFor="pictureUpload" 
              className="block text-sm font-medium text-gray-700 mb-1 text-left"
            >
              Picture Upload
              <span className="text-gray-400 text-xs ml-2">(Optional, Max 5MB)</span>
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pictureUpload"
                  aria-label="Upload suspect photo"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#14374E]"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-gray-700">
                    {formData.pictureName || 'Upload Suspect Photo'}
                  </span>
                </button>
                {formData.pictureName && (
                  <button
                    type="button"
                    onClick={() => handleClearField('picture')}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
                    aria-label="Remove uploaded photo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {/* HCI Principle: Visibility - Image preview */}
              {formData.picturePreview && (
                <div className="relative inline-block">
                  <img
                    src={formData.picturePreview}
                    alt="Suspect photo preview"
                    className="max-w-xs max-h-48 rounded-md border border-gray-300 shadow-sm"
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    Preview
                  </div>
                </div>
              )}
            </div>
            {errors.picture && (
              <p className="mt-1 text-sm text-red-600 text-left flex items-center gap-1" role="alert">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.picture}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#14374E] text-white rounded-md hover:bg-[#021624] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              onClick={()=> navigate('/dashboard') }
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                'Add Suspect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSuspectModal;

