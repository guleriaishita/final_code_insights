import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ReviewCodebase = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [complianceFile, setComplianceFile] = useState(null);
  const [modelType, setModelType] = useState('gpt-4o-mini');
  const [provider, setProvider] = useState('openai');
  const [processing, setProcessing] = useState(false);
  const [showError, setShowError] = useState(false);
  
  const modelTypes = ["gpt-4o-mini", "gpt3.5", "gpt4", "claude-1"];
  const providers = ["openai", "anthropic"];

  const handleDashboard = () => {
    navigate("/dashboard");
    };

  const handleFolderSelect = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(Array.from(selectedFiles));
      setShowError(false);
    } else {
      setShowError(true);
    }
  };

  const handleComplianceFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      setComplianceFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setShowError(true);
      return;
    }
  
    try {
      setProcessing(true);
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('files', file);
      });
  
      if (complianceFile) {
        formData.append('compliance_file', complianceFile);
      }
  
      formData.append('provider', provider);
      formData.append('modelType', modelType);
  
      const response = await fetch("http://localhost:5000/api/analyzecodebase", {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Server error');
  
      if (data.success) {
        sessionStorage.setItem('fileId_review_codebase', data.fileId);
        sessionStorage.setItem('processId_review_codebase', data.processId);
        navigate('/output');
      }
      
    } catch (error) {
      console.error("Error:", error);
      setShowError(true);
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
              <div onClick={handleDashboard} className="flex items-start">  
                <img src="/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
                <span className="ml-2">Code Insight</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 pt-12 pb-8 mt-10">
        <h2 className="text-2xl font-bold text-center mb-6">Review Your CodeBase</h2>

        <form onSubmit={handleSubmit} className="rounded-lg p-8">
          <div className="space-y-6">
            <div className="relative">
              <label className="block text-sm font-medium mb-1">
                <span className="text-red-500 mr-1">*</span>
                CodeBase Files:
              </label>
              <div className="relative">
                <input
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  onChange={handleFolderSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  required
                />
                <div className="w-full px-3 py-2 border border-purple-400 rounded text-gray-500">
                  {files.length > 0 ? `${files.length} files selected` : 'Select files'}
                </div>
              </div>
              {showError && files.length === 0 && (
                <p className="text-red-500 text-sm mt-1">Please select files to analyze</p>
              )}
            </div>

            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium mb-2">Provider:</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full p-2 border border-purple-400 rounded"
                >
                  {providers.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="w-1/2">
                <label className="block text-sm font-medium mb-2">Model Type:</label>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value)}
                  className="w-full p-2 border border-purple-400 rounded"
                >
                  {modelTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Compliance File:</label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleComplianceFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full px-3 py-2 border border-purple-400 rounded text-gray-500">
                  {complianceFile ? complianceFile.name : 'Select compliance file'}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={processing}
            className={`w-full mt-6 ${
              processing ? 'bg-purple-400' : 'bg-purple-500 hover:bg-purple-600'
            } text-white py-2 rounded-md transition-colors duration-200 flex items-center justify-center gap-2`}
          >
            {processing ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Run
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewCodebase;