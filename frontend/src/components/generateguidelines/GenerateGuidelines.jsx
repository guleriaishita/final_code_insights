import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const GenerateStyleGuide = () => {
  const navigate = useNavigate();
  const [filePaths, setFilePaths] = useState([]);
  const [modelType, setModelType] = useState("gpt-4o-mini");
  const [provider, setProvider] = useState("openai");
  const [showError, setShowError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef(null);

  const modelTypes = ["gpt-4o-mini", "gpt3.5", "gpt4", "claude-1"];
  const providers = ["openai", "anthropic"];

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';  // Reset file input
      fileInputRef.current.click();
    }
  };
  
  const handleDashboard = () => {
    navigate("/dashboard");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fileInputRef.current?.files?.length) {
      setShowError(true);
      return;
    }
    
    try {
      setProcessing(true);
      setUploadProgress(0);
    
      const formData = new FormData();
      formData.append("provider", provider);
      formData.append("modelType", modelType);
    
      Array.from(fileInputRef.current.files).forEach(file => 
        formData.append("files", file)
      );
    
      const response = await axios.post('http://localhost:5000/api/generate_guidelines', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    
      if (response.data && response.data.guidelineId) {
        navigate(`/output/generated_guidelines_docs`);
      } else {
        throw new Error('No guideline ID received');
      }
    } catch (error) {
      console.error('Submission Error:', error.response?.data || error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files?.length) {
      const newFiles = Array.from(files).map(f => f.name);
      setFilePaths(prevFiles => [...prevFiles, ...newFiles]);
      setShowError(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
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

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mt-10">
        <h2 className="text-2xl font-semibold text-center mb-12">Generate Codebase Style Guide</h2>

        <div className="space-y-6">
          <div>
            <label className="block mb-2">
              Select Files: <span className="text-red-500">*</span>
            </label>
                          <div className="relative">
              <div 
                onClick={handleFileClick}
                className={`w-full p-2 border rounded focus:ring-purple-500 focus:border-violet-500 cursor-pointer min-h-[40px] max-h-[120px] overflow-y-auto ${
                  showError ? "border-red-500" : "border-violet-500"
                }`}
              >
                {filePaths.length > 0 ? (
                  filePaths.map((path, index) => (
                    <div key={index} className="text-sm mb-1">{path}</div>
                  ))
                ) : (
                  <span className="text-gray-400">Click to select files from directories</span>
                )}
              </div>
              {showError && (
                <p className="text-red-500 text-sm mt-1">Please select at least one file</p>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept=".py,.js,.java,.cpp,.c,.html,.css"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {[
              { label: "Provider", value: provider, options: providers, setter: setProvider },
              { label: "Model Type", value: modelType, options: modelTypes, setter: setModelType }
            ].map(({ label, value, options, setter }) => (
              <div key={label}>
                <label className="block mb-2">{label}:</label>
                <select
                  value={value}
                  onChange={e => setter(e.target.value)}
                  className="w-full p-2 border border-violet-500 rounded focus:ring-purple-500 focus:border-purple-500"
                >
                  {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {processing && uploadProgress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-purple-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

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
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Generate Style Guide
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GenerateStyleGuide;