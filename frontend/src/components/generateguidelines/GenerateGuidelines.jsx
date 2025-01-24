import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
const GenerateGuidelines = () => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState("codebase");
  const [codebasePath, setCodebasePath] = useState("");
  const [filePaths, setFilePaths] = useState([]);
  const [modelType, setModelType] = useState("gpt-4o-mini");
  const [provider, setProvider] = useState("openai");
  const [showError, setShowError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const codebaseInputRef = useRef(null);
  const filePathsInputRef = useRef(null);

  const modelTypes = ["gpt-4o-mini", "Gpt3.5", "gpt4", "claude-1"];
  const providers = ["openai", "anthropic"];

  const handleCodebaseClick = () => codebaseInputRef.current?.click();
  const handleFilePathsClick = () => filePathsInputRef.current?.click();

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    const hasFiles = selectedOption === "codebase" 
      ? codebaseInputRef.current?.files?.length 
      : filePathsInputRef.current?.files?.length;
  
    if (!hasFiles) {
      setShowError(true);
      return;
    }
  
    try {
      setProcessing(true);
      setUploadProgress(0);
  
      const formData = new FormData();
      formData.append("selectedOption", selectedOption);
      formData.append("provider", provider);
      formData.append("modelType", modelType);
  
      const files = selectedOption === "codebase"
        ? Array.from(codebaseInputRef.current.files)
        : Array.from(filePathsInputRef.current.files);
  
      files.forEach(file => formData.append("files", file));
  
      const response = await axios.post('http://localhost:5000/api/generate_guidelines', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
  
      console.log('Full Response:', response.data);
  
      if (response.data && response.data.guidelineId) {
        sessionStorage.setItem('fileId', response.data.fileId);
        navigate('/output');
      } else {
        throw new Error('No guideline ID received');
      }
    } catch (error) {
      console.error('Submission Error:', error.response?.data || error.message);
      // Handle error (show message to user, etc.)
    }
  };

  const handleFileChange = (e, isCodebase) => {
    const files = e.target.files;
    if (files?.length) {
      if (isCodebase) {
        const fileList = Array.from(files).map(file => ({
          name: file.name,
          path: file.webkitRelativePath,
        }));
        setCodebasePath(fileList.map(f => f.path).join(", "));
      } else {
        setFilePaths(Array.from(files).map(f => f.name));
      }
      setShowError(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
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

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mt-10">
        <h2 className="text-2xl font-semibold text-center mb-12">Generate Guidelines Document</h2>

        <div className="mb-8">
          <p className="mb-4 font-medium">Select Options:</p>
          <div className="flex gap-6 justify-center">
            {["codebase", "files"].map(option => (
              <label key={option} className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <input
                    type="radio"
                    name="generateOption"
                    value={option}
                    checked={selectedOption === option}
                    onChange={e => setSelectedOption(e.target.value)}
                    className="w-4 h-4 appearance-none border-2 border-purple-500 rounded-full checked:border-purple-500 checked:bg-white relative peer"
                  />
                  <div className="absolute w-2 h-2 bg-purple-500 rounded-full left-1 top-1 transition-transform scale-0 peer-checked:scale-100" />
                </div>
                <span className="bg-purple-500 text-white px-6 py-2 rounded-full">
                  Generate guidelines for {option}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block mb-2">
              {selectedOption === "codebase" ? "Codebase Path" : "File Paths"}:{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={selectedOption === "codebase" ? codebasePath : filePaths.join("; ")}
                placeholder={selectedOption === "codebase" ? "/home/user/project" : "/home/user/file.py"}
                className={`w-full p-2 border rounded focus:ring-purple-500 focus:border-violet-500 cursor-pointer ${
                  showError && !filePaths.length ? "border-red-500" : "border-violet-500"
                }`}
                readOnly
                onClick={selectedOption === "codebase" ? handleCodebaseClick : handleFilePathsClick}
                required
              />
              {showError && !filePaths.length && (
                <p className="text-red-500 text-sm mt-1">This field is required</p>
              )}
              
              <input
                type="file"
                ref={codebaseInputRef}
                className="hidden"
                webkitdirectory="true"
                directory="true"
                onChange={e => handleFileChange(e, true)}
              />

              <input
                type="file"
                ref={filePathsInputRef}
                className="hidden"
                multiple
                accept=".py,.js,.java,.cpp,.c,.html,.css"
                onChange={e => handleFileChange(e, false)}
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
                Run
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GenerateGuidelines;