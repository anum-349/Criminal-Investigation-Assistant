import { useState, useRef, useEffect } from 'react';
import AddSuspectModal from '../add-suspect/page';

const FIRUploadModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    firId: '',
    caseId: '',
    title: '',
    description: '',
    dateReported: '',
    location: '',
    caseStatus: '',
    confidenceScore: 0,
    completenessStatus: '',
    firType: '',
    languageDetected: '',
    uploadedFile: null,
    fileName: ''
  });

  const [extractedEntities, setExtractedEntities] = useState({
    persons: 3,
    locations: 1,
    weapons: 1
  });

  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddSuspectModalOpen, setIsAddSuspectModalOpen] = useState(false);
  const [submittedCaseData, setSubmittedCaseData] = useState(null);
  const fileInputRef = useRef(null);

  // HCI Principle: Error Prevention - Input validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.dateReported) {
      newErrors.dateReported = 'Date reported is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // HCI Principle: User Control - File upload handling
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // HCI Principle: Feedback - Show processing state
      setIsUploading(true);

      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setErrors({ ...errors, file: 'Please upload a PDF or Image file' });
        setIsUploading(false);
        return;
      }

      // Simulate AI processing
      setTimeout(() => {
        setFormData({
          ...formData,
          uploadedFile: file,
          fileName: file.name
        });
        setIsUploading(false);
        setIsProcessing(true);
        setFormData({
          firId: 'FIR-102',
          caseId: 'Case-102',
          title: 'Bank Robbery in Downtown',
          description: 'Armed robbery at Main Street Bank, three suspects, shots fired, large amount of cash stolen and fled.',
          dateReported: '2024-05-12',
          location: 'Main Street Bank',
          caseStatus: 'Open',
          confidenceScore: 8.8,
          completenessStatus: 'In Progress',
          firType: 'FIR',
          languageDetected: 'English',
          uploadedFile: null,
          fileName: ''
        })
        setErrors({})

        // Simulate AI extraction after a delay
        setTimeout(() => {
          setIsProcessing(false);
          // HCI Principle: Feedback - Show success state
        }, 2000);
      }, 1000);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // HCI Principle: Error Recovery - Clear errors on input
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // HCI Principle: Feedback - Show loading state
      setIsProcessing(true);

      // Simulate submission
      setTimeout(() => {
        // Store the submitted case data
        setSubmittedCaseData(formData);
        setIsProcessing(false);
        // Close FIR modal and open Add Suspect modal
        onClose();
        setIsAddSuspectModalOpen(true);
        // Also call the original onSubmit callback if provided
        if (onSubmit) {
          onSubmit(formData);
        }
      }, 1000);
    }
  };

  const handleCancel = () => {
    // HCI Principle: User Control - Allow cancellation
    if (window.confirm('Are you sure you want to cancel? Unsaved changes will be lost.')) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-50 bg-[#14374E] border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 id="modal-title" className="text-2xl font-semibold text-white">
                Upload FIR/ Add FIR detail
              </h2>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-300 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4">
              {/* Upload FIR Section */}
              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Upload FIR to automatically extract case details using AI
                </h3>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                        aria-label="Upload FIR file"
                      />
                      <label
                        htmlFor="file-upload"
                        className="block w-full px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-gray-600">
                          {formData.fileName || 'Upload FIR File (PDF/ Image)'}
                        </span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="px-6 py-2 bg-[#14374E] text-white rounded-md cursor-pointer hover:bg-deep-ocean-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading...
                        </>
                      ) : (
                        <>
                          Upload FIR
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>

                  {/* HCI Principle: Visibility - Show auto-detected fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        FIR Type: FIR
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value="FIR"
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-400" aria-label="Locked field">
                          🔒
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Language Detected
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.languageDetected}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                        />
                        <span className="absolute right-3 top-2.5 text-gray-400" aria-label="Locked field">
                          🔒
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* FIR Detail Section */}
              <section className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">FIR Detail</h3>

                <div className="space-y-4">
                  {/* FIR ID and Case ID */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        FIR ID
                      </label>
                      <input
                        type="text"
                        value={formData.firId}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        Case Id
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.caseId}
                          readOnly
                          className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 pr-10"
                        />

                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left items-center gap-2">
                      Title
                      <button
                        type="button"
                        className="text-gray-400 cursor-pointer hover:text-gray-600"
                        title="Enter a brief title describing the case"
                        aria-label="Help: Enter a brief title describing the case"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.829V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.title ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter case title"
                      aria-invalid={errors.title ? 'true' : 'false'}
                      aria-describedby={errors.title ? 'title-error' : undefined}
                    />
                    {errors.title && (
                      <p id="title-error" className="mt-1 text-sm text-red-600 text-left" role="alert">
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y ${errors.description ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder="Enter detailed description of the case"
                      aria-invalid={errors.description ? 'true' : 'false'}
                      aria-describedby={errors.description ? 'description-error' : undefined}
                    />
                    {errors.description && (
                      <p id="description-error" className="mt-1 text-sm text-red-600 text-left" role="alert">
                        {errors.description}
                      </p>
                    )}
                  </div>

                  {/* Date Reported and Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                        Date Reported
                      </label>
                      <input
                        type="date"
                        value={formData.dateReported}
                        onChange={(e) => handleInputChange('dateReported', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.dateReported ? 'border-red-500' : 'border-gray-300'
                          }`}
                        aria-invalid={errors.dateReported ? 'true' : 'false'}
                        aria-describedby={errors.dateReported ? 'date-error' : undefined}
                      />
                      {errors.dateReported && (
                        <p id="date-error" className="mt-1 text-sm text-red-600 text-left" role="alert">
                          {errors.dateReported}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1 text-left">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.location ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter location"
                        aria-invalid={errors.location ? 'true' : 'false'}
                        aria-describedby={errors.location ? 'location-error' : undefined}
                      />
                      {errors.location && (
                        <p id="location-error" className="mt-1 text-sm text-red-600 text-left" role="alert">
                          {errors.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Case Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                      Case Status
                    </label>
                    <select
                      value={formData.caseStatus}
                      onChange={(e) => handleInputChange('caseStatus', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Open">Open</option>
                      <option value="Under Investigation">Under Investigation</option>
                      <option value="Closed">Closed</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  {/* Confidence Score */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                      Confidence Score
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{formData.confidenceScore}%</span>
                        <span className="text-xs text-gray-500">Linked automatically to uploaded FIR</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-300 ${formData.confidenceScore >= 70 ? 'bg-green-500' :
                            formData.confidenceScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                          style={{ width: `${formData.confidenceScore}%` }}
                          role="progressbar"
                          aria-valuenow={formData.confidenceScore}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Completeness Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 text-left items-center gap-2 ">
                      Completeness Status
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${formData.completenessStatus === 'Complete' ? 'bg-green-100 text-green-800' :
                        formData.completenessStatus === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {formData.completenessStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Extracted Entities Preview */}
              <section className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Extracted Entities Preview</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-md">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Persons</p>
                      <p className="text-xl font-semibold text-gray-800">{extractedEntities.persons}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-md">
                    <div className="p-2 bg-green-100 rounded-full">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Locations</p>
                      <p className="text-xl font-semibold text-gray-800">{extractedEntities.locations}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-md">
                    <div className="p-2 bg-red-100 rounded-full">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Weapons</p>
                      <p className="text-xl font-semibold text-gray-800">{extractedEntities.weapons}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 border border-[#14374E] cursor-pointer rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2 bg-[#14374E] text-white rounded-md hover:bg-deep-ocean-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Confirm & Create Case'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Suspect Modal - Rendered independently so it can show even when FIR modal is closed */}
      <AddSuspectModal
        isOpen={isAddSuspectModalOpen}
        onClose={() => setIsAddSuspectModalOpen(false)}
        onSubmit={(suspectData) => {
          console.log('Suspect Data Submitted:', suspectData);
          alert('Suspect added successfully!');
        }}
        caseData={submittedCaseData}
      />
    </>
  );
};

export default FIRUploadModal;

