import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import axios from 'axios';

const ReviewFile = () => {
  const navigate = useNavigate();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [files, setFiles] = useState([]);
  const [complianceFile, setComplianceFile] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [modelType, setModelType] = useState('gpt-4o-mini');
  const [provider, setProvider] = useState('openai');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleOptionChange = (option) => {
    setSelectedOptions(prev => 
      prev.includes(option) ? prev.filter(item => item !== option) : [...prev, option]
    );
  };

  const handleFileChange = (e, setter) => {
    const files = Array.from(e.target.files || []);
    setter(files);
    setError('');
  };

  const handleSubmit = async (e) => {
    setProcessing(true);
    
    e.preventDefault();
    if (files.length === 0) {
      setError('Please select at least one file to review');
      return;
    }

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (complianceFile) formData.append('compliance', complianceFile);
    additionalFiles.forEach(file => formData.append('additionalFiles', file));
    formData.append('selectedOptions', JSON.stringify(selectedOptions));
    formData.append('provider', provider);
    formData.append('modelType', modelType);

    try {
      setProcessing(true);
      const { data } = await axios.post("http://localhost:5000/api/analyzefile", formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      console.log(data)

      if (data.reviewId) {
        sessionStorage.setItem('currentReviewId', data.reviewId);
        navigate('/output');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setProcessing(false);
    }
  
  };

  const options = [
    { id: 'review', label: 'Review Code' },
    { id: 'documentation', label: 'Generate Documentation' },
    { id: 'comments', label: 'Create comments' }
  ];

  const modelTypes = ["gpt-4o-mini", "gpt3.5", "gpt4", "claude-1"];
  const providers = ["openai", "anthropic"];

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white">
        <div className="container px-8">
          <div className="flex h-16 items-center">
            <div className="flex items-center text-xl font-medium">
              <img src="/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
              <span className="ml-2">Code Insight</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 pt-12 pb-8">
        <h2 className="text-2xl font-bold text-center mb-12">Review Your Code</h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <p className="mb-5 text-xl font-medium">Select Options:</p>
            <div className="flex justify-center gap-8">
              {options.map(({ id, label }) => (
                <label key={id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(id)}
                    onChange={() => handleOptionChange(id)}
                    className="sr-only"
                  />
                  <span className={`px-4 py-1 rounded-full cursor-pointer ${
                    selectedOptions.includes(id) 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-8 border border-gray-200">
            <div className="space-y-6">
              <FileInput
                label="Main Files"
                onChange={(e) => handleFileChange(e, setFiles)}
                files={files}
                required
              />

              <div className="flex gap-4">
                <SelectInput
                  label="Provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  options={providers}
                />
                <SelectInput
                  label="Model Type"
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  options={modelTypes}
                />
              </div>

              <FileInput
                label="Compliance File"
                onChange={(e) => handleFileChange(e, setComplianceFile)}
                files={complianceFile ? [complianceFile] : []}
              />

              <FileInput
                label="Additional Files"
                onChange={(e) => handleFileChange(e, setAdditionalFiles)}
                files={additionalFiles}
                multiple
              />
            </div>

            {error && <p className="text-red-500 mt-4">{error}</p>}

            <button
              type="submit"
              disabled={processing}
              className="w-full mt-6 bg-purple-500 text-white py-2 rounded-md hover:bg-purple-600 
                       transition-colors duration-200 flex items-center justify-center gap-2 
                       disabled:bg-purple-300"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Run Analysis'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FileInput = ({ label, onChange, files, required, multiple }) => (
  <div>
    <label className="block text-me mb-1">
      {required && <span className="text-red-500 mr-1">*</span>}
      {label}:
    </label>
    <div className="relative">
      <input
        type="file"
        onChange={onChange}
        multiple={multiple}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        required={required}
      />
      <div className="w-full px-3 py-2 border border-purple-400 rounded text-gray-500">
        {files.length > 0 ? files.map(f => f.name).join(', ') : `Select ${label.toLowerCase()}`}
      </div>
    </div>
  </div>
);

const SelectInput = ({ label, value, onChange, options }) => (
  <div className="w-1/2">
    <label className="block text-me mb-1">{label}:</label>
    <select
      value={value}
      onChange={onChange}
      className="w-full p-2 border border-violet-500 rounded focus:ring-purple-500 focus:border-purple-500"
    >
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);

export default ReviewFile;