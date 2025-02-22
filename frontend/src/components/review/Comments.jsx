import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';


const Comments = () => {
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
  const [progress, setProgress] = useState(0);

  

  const handleDashboard = () => {
    navigate("/dashboard");
    };

  const modelTypes = ["gpt-4o-mini", "gpt3.5", "gpt4", "claude-1"];
  const providers = ["openai", "anthropic"];


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
    
    // Validate main files are selected
    if (files.length === 0) {
      alert('Please select at least one main file');
      setShowError(true);
      return;
    }
  
    // Validate file sizes
    const invalidFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`File(s) ${invalidFiles.map(f => f.name).join(', ')} exceed 10MB limit`);
      return;
    }
  
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
  
    // Optional: Add compliance file if selected
    if (complianceFile) formData.append('compliance', complianceFile);
  
    // Add additional files
    additionalFiles.forEach(file => formData.append('additionalFiles', file));
  
    // Add provider and model type
    formData.append('provider', provider);
    formData.append('modelType', modelType);
  
    try {
      setProcessing(true);
      setProgress(0);
      
      const response = await fetch("http://localhost:5000/api/generate_comments", {
        method: "POST",
        body: formData
      });
  
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process files');
      }
  
      // Store process ID and navigate to output page
      const processId = data.processId;
      sessionStorage.setItem('processId_comments', processId);
      navigate('/output/generated_comments_docs');
  
    } catch (error) {
      console.error("Error:", error);
      alert(error.message);
    } finally {
      setProcessing(false);
      setProgress(0);
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


      <div className="max-w-3xl mx-auto px-8 pt-12 pb-8">
        <h2 className="text-2xl font-bold text-center mb-12">Generate Comments/Docstring for you Code</h2>


        <form onSubmit={handleSubmit}>
          


          <div className="rounded-lg p-8">
            <div className="space-y-6">
              {/* File Path */}
              <div className="relative">
                <label className="block text-me mb-1">
                  <span className="text-red-500 mr-1">*</span>
                  Main File:
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
           transition-colors duration-200 flex items-center justify-center gap-2 
           disabled:bg-purple-300"
>
  {processing ? (
    <>
      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Processing...
    </>
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


export default Comments;


