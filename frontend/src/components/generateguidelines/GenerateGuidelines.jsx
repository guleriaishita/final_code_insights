import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
//hey need to commit.
const GenerateGuidelines = () => {
  // State for form inputs
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState("codebase");
  const [codebasePath, setCodebasePath] = useState("");
  const [filePaths, setFilePaths] = useState([]);
  const [modelType, setModelType] = useState("gpt-4o-mini");
  const [provider, setProvider] = useState("openai");
  const [showError, setShowError] = useState(false);
  const [processing, setProcessing] = useState(false); // State for processing status


  // Refs for file inputs
  const codebaseInputRef = useRef(null);
  const filePathsInputRef = useRef(null);
  const complianceInputRef = useRef(null);

  // Options for dropdowns
  const modelTypes = ["gpt-4o-mini", "Gpt3.5", "gpt4","claude-1"];
  const providers = ["openai", "anthropic"];

  // Handle folder selection for codebase
  const handleCodebaseClick = () => {
    codebaseInputRef.current?.click();
  };

  // Handle multiple files selection
  const handleFilePathsClick = () => {
    filePathsInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    if (
      (selectedOption === "codebase" && !codebaseInputRef.current.files.length) ||
      (selectedOption === "files" && !filePathsInputRef.current.files.length)
    ) {
      setShowError(true);
      return;
    }
  
    const formData = new FormData();
    formData.append("selectedOption", selectedOption);
    formData.append("provider", provider);
    formData.append("modelType", modelType);
  
    try {
      const files =
        selectedOption === "codebase"
          ? Array.from(codebaseInputRef.current.files)
          : Array.from(filePathsInputRef.current.files);
  
      files.forEach((file) => {
        formData.append("files", file);
      });
  
      setProcessing(true); // Show processing message
  
      const response = await fetch("http://localhost:5000/api/generate_guidelines", {
        method: "POST",
        body: formData,
      });
  
      const data = await response.json();
      console.log(data); // Log the response to inspect its structure
  
      if (response.ok) {
        const guidelineId = data.guidelineId;  // Access 'guidelineId' from the response
        console.log("Guideline ID:", guidelineId);  // Log the ID to ensure it's correct
  
        sessionStorage.setItem('guidelineId', guidelineId);  // Store the ID in sessionStorage
  
        setProcessing(false); // Clear processing state before navigation
        navigate('/output');
      } else {
        console.error("Error response:", data);
        setProcessing(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setProcessing(false);
    }
  };
  

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  
  //   if (
  //     (selectedOption === "codebase" && !codebaseInputRef.current.files.length) ||
  //     (selectedOption === "files" && !filePathsInputRef.current.files.length)
  //   ) {
  //     setShowError(true);
  //     return;
  //   }
  
  //   const formData = new FormData();
  //   formData.append("selectedOption", selectedOption);
  //   formData.append("provider", provider);
  //   formData.append("modelType", modelType);
  
  //   try {
  //     const files =
  //       selectedOption === "codebase"
  //         ? Array.from(codebaseInputRef.current.files)
  //         : Array.from(filePathsInputRef.current.files);
  
  //     files.forEach((file) => {
  //       formData.append("files", file);
  //     });
  
  //     setProcessing(true); // Show processing message
  
  //     const response = await fetch("http://localhost:5000/api/generate_guidelines", {
  //       method: "POST",
  //       body: formData,
  //     });
  
  //     const data = await response.json();
  
  //     if (response.ok) {
  //       setProcessing(false); // Clear processing state before navigation
  //       navigate('/api/output'); // Use navigate instead of res.redirect
  //     } else {
  //       console.error("Error response:", data);
  //       setProcessing(false);
  //     }
  //   } catch (error) {
  //     console.error("Error:", error);
  //     setProcessing(false);
  //   }
  // };

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <nav className="bg-white">
        <div className="container px-8">
          <div className="flex h-16 items-center">
            {/* Logo and text aligned to left */}
            <div className="flex items-center text-xl font-medium">
              <div className="flex items-start">
                <img
                  src="../../../public/Logo.png"
                  alt="CodeInsight Logo"
                  className="h-8 w-8"
                />
                <span className="ml-2">Code Insight</span>
              </div>
            </div>
            {/* Navigation links with more left spacing */}
          </div>
        </div>
      </nav>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto mt-10 ">
        <h2 className="text-2xl font-semibold text-center mb-12">
          Generate Guidelines Document
        </h2>

        {/* Radio Options with Custom Styling */}
        <div className="mb-8">
          <p className="mb-4 font-medium">Select Options:</p>
          <div className="flex gap-6 justify-center">
            <label className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="radio"
                  name="generateOption"
                  value="codebase"
                  checked={selectedOption === "codebase"}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="w-4 h-4 appearance-none border-2 border-purple-500 rounded-full checked:border-purple-500 checked:bg-white relative peer"
                />
                <div className="absolute w-2 h-2 bg-purple-500 rounded-full left-1 top-1 transition-transform scale-0 peer-checked:scale-100"></div>
              </div>
              <span className="bg-purple-500 text-white px-6 py-2 rounded-full">
                Generate guidelines for codebase
              </span>
            </label>
            <label className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="radio"
                  name="generateOption"
                  value="files"
                  checked={selectedOption === "files"}
                  onChange={(e) => setSelectedOption(e.target.value)}
                  className="w-4 h-4 appearance-none border-2 border-purple-500 rounded-full checked:border-purple-500 checked:bg-white relative peer"
                />
                <div className="absolute w-2 h-2 bg-purple-500 rounded-full left-1 top-1 transition-transform scale-0 peer-checked:scale-100"></div>
              </div>
              <span className="bg-purple-500 text-white px-6 py-2 rounded-full">
                Generate guidelines for multiple files
              </span>
            </label>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Conditional Path Input */}
          <div>
            <label className="block mb-2">
              {selectedOption === "codebase" ? "Codebase Path" : "File Paths"}:{" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={
                  selectedOption === "codebase"
                    ? codebasePath
                    : filePaths.join("; ")
                }
                placeholder={
                  selectedOption === "codebase"
                    ? "/home/user/project"
                    : "/home/user/file.py"
                }
                className={`w-full p-2 border rounded focus:ring-purple-500 focus:border-violet-500 cursor-pointer
     ${
       showError &&
       ((selectedOption === "codebase" && !codebasePath) ||
         (selectedOption === "files" && filePaths.length === 0))
         ? "border-red-500"
         : "border-violet-500"
     }`}
                readOnly
                onClick={
                  selectedOption === "codebase"
                    ? handleCodebaseClick
                    : handleFilePathsClick
                }
                required
              />
              {showError &&
                ((selectedOption === "codebase" && !codebasePath) ||
                  (selectedOption === "files" && filePaths.length === 0)) && (
                  <p className="text-red-500 text-sm mt-1">
                    This field is required
                  </p>
                )}
              {/* Hidden file inputs */}
              <input
                type="file"
                ref={codebaseInputRef}
                className="hidden"
                webkitdirectory="true"
                directory="true"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files) {
                    const fileList = Array.from(files).map((file) => ({
                      name: file.name,
                      path: file.webkitRelativePath,
                      file,
                    }));
                    console.log("Uploaded files:", fileList);
                    setCodebasePath(fileList.map((f) => f.path).join(", "));
                    setShowError(false);
                  } else {
                    console.error("No files were uploaded.");
                    setShowError(true);
                  }
                }}
              />

              <input
                type="file"
                ref={filePathsInputRef}
                className="hidden"
                multiple
                accept=".py,.js,.java,.cpp,.c,.html,.css"
                onChange={(e) => {
                  const files = e.target.files;
                  setFilePaths(Array.from(files).map((f) => f.name));
                  setShowError(false);
                }}
              />
            </div>
          </div>

          {/* Rest of the form remains the same */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block mb-2">Provider:</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full p-2 border border-violet-500 rounded focus:ring-purple-500 focus:border-purple-500"
              >
                {providers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2">Model Type:</label>
              <select
                value={modelType}
                onChange={(e) => setModelType(e.target.value)}
                className="w-full p-2 border border-violet-500 rounded focus:ring-purple-500 focus:border-purple-500"
              >
                {modelTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
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
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      Processing...
    </>
  ) : (
    <>
      <svg
        className="w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M5 12h14M12 5l7 7-7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
