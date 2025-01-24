import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ReviewFile = () => {
  const navigate = useNavigate();
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [files, setFiles] = useState([]); // Main files
  const [complianceFile, setComplianceFile] = useState(null);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [modelType, setModelType] = useState('gpt-4o-mini');
  const [provider, setProvider] = useState('openai');
  const [processing, setProcessing] = useState(false);
  const [showError, setShowError] = useState(false);
  const [placeholder, setPlaceholder] = useState("No file selected");

  const handleOptionChange = (option) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter(item => item !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
  };

  const modelTypes = ["gpt-4o-mini", "gpt3.5", "gpt4", "claude-1"];
  const providers = ["openai", "anthropic"];

  // const handleMainFileChange = (e) => {
  //   const selectedFiles = Array.from(e.target.files || []);
  //   setFiles(selectedFiles);
  //   setShowError(false);
  // };
  const handleMainFileChange = (e) => {
    try {
      if (!e.target.files || e.target.files.length === 0) {
        setShowError(true);
        setPlaceholder("No file selected");
        console.error("No files selected");
        return;
      }

      const selectedFiles = Array.from(e.target.files);

      // Optional: Validate files (e.g., file type, size, etc.)
      if (selectedFiles.some(file => !file || !file.name)) {
        console.error("Invalid file detected");
        setShowError(true);
        setPlaceholder("Invalid file(s) selected");
        return;
      }

      setFiles(selectedFiles);
      setShowError(false);

      // Update placeholder with selected file names
      if (selectedFiles.length === 1) {
        setPlaceholder(selectedFiles[0].name); // Single file selected
      } else {
        setPlaceholder(`${selectedFiles.length} files selected`); // Multiple files selected
      }
    } catch (error) {
      console.error("Error handling file change:", error.message);
      setShowError(true);
      setPlaceholder("Error selecting files");
    }
  };

  const handleComplianceFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setComplianceFile(file);
  };

  const handleAdditionalFiles = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setAdditionalFiles(newFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (files.length === 0) {
      setShowError(true);
      return;
    }
  
    const validFiles = files.every(file => file.size <= 10 * 1024 * 1024);
    if (!validFiles) {
      console.error("Invalid file size or type");
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
      const response = await fetch("http://localhost:5000/api/analyzefile", {
        method: "POST",
        headers: { 'Accept': 'application/json' },
        body: formData
      });
  
      const textResponse = await response.text();
      if (textResponse.trim().startsWith('<!DOCTYPE')) {
        throw new Error('Received HTML instead of JSON');
      }
  
      const data = JSON.parse(textResponse);
  
      if (response.ok && data.FilesreviewId) {
        sessionStorage.setItem('FilesreviewId', data.FilesreviewId);
        navigate('/output');
      } else {
        throw new Error(data.error || 'Failed to process files');
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setProcessing(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white">
        <div className="container px-8">
          <div className="flex h-16 items-center">
            <div className="flex items-center text-xl font-medium">
              <div className="flex items-start">  
                <img src="/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
                <span className="ml-2">Code Insight</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 pt-12 pb-8">
        <h2 className="text-2xl font-bold text-center mb-12">Review Your Code</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-12">
            <p className="mb-5 text-xl font-medium">Select Options :</p>
            <div className="flex justify-center gap-8">
              {[
                { id: 'review', label: 'Review Code' },
                { id: 'documentation', label: 'Generate Documentation' },
                { id: 'comments', label: 'Create comments' }
              ].map((option) => (
                <label key={option.id} className="flex items-center group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedOptions.includes(option.id)}
                      onChange={() => handleOptionChange(option.id)}
                      className="appearance-none w-4 h-4 rounded-full border-2 border-purple-500 
                               checked:bg-white cursor-pointer"
                    />
                    {selectedOptions.includes(option.id) && (
                      <div className="absolute left-1 top-1 w-2 h-2 bg-purple-500 rounded-full" />
                    )}
                  </div>
                  <span className="ml-2 bg-purple-500 text-white px-4 py-1 rounded-full text-me">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
            {showError && <p className="text-red-500 text-sm mt-2">Please select at least one file to review</p>}
          </div>

          <div className="rounded-lg p-8">
            <div className="space-y-6">
              {/* File Path */}
              <div className="relative">
                <label className="block text-me mb-1">
                  <span className="text-red-500 mr-1">*</span>
                  Main Files:
                </label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleMainFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                  />
                  <div className="w-full px-3 py-2 border border-purple-400 rounded text-gray-500">
                    {files.length > 0 ? files.map(f => f.name).join(', ') : 'Select main files to review'}
                  </div>
                </div>
              </div>

              {/* Model Type and Provider */}
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-me mb-1">Provider:</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full p-2 border border-violet-500 rounded focus:ring-purple-500 focus:border-purple-500"
                  >
                    {providers.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-me mb-1">Model Type:</label>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    className="w-full p-2 border border-violet-500 rounded focus:ring-purple-500 focus:border-purple-500"
                  >
                    {modelTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Compliance File */}
              <div>
                <label className="block text-me mb-1">Compliance File:</label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleComplianceFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-3 py-2 border border-purple-400 rounded text-gray-500">
                    {complianceFile ? complianceFile.name : 'Select compliance file'}
                  </div>
                </div>
              </div>

              {/* Additional Files */}
              <div>
                <label className="block text-me mb-1">Additional Files:</label>
                <div className="relative">
                  <input
                    type="file"
                    multiple
                    onChange={handleAdditionalFiles}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-full px-3 py-2 border border-purple-400 rounded text-gray-500">
                    {additionalFiles.length > 0 ? additionalFiles.map(f => f.name).join(', ') : 'Select additional files'}
                  </div>
                </div>
              </div>
            </div>

            {/* Run Button */}
            <button
              type="submit"
              disabled={processing}
              className="w-full mt-6 bg-purple-500 text-white py-2 rounded-md hover:bg-purple-600 
                       transition-colors duration-200 flex items-center justify-center gap-2 disabled:bg-purple-300"
            >
              {processing ? (
                'Processing...'
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Run
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewFile;