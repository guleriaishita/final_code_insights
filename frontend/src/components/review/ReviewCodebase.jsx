
// import React, { useState } from 'react';

// const ReviewCodebase = () => {
//   const [selectedOptions, setSelectedOptions] = useState([]);
//   const [folderPath, setFolderPath] = useState('');
//   const [compliancePath, setCompliancePath] = useState('');
// const [codebasePath, setCodebasePath] = useState('');
//   const [modelType, setModelType] = useState('Gpt4o_mini');
//   const [provider, setProvider] = useState('Gpt');
//   const [processing, setProcessing] = useState(false); // State for processing status
// const [showError, setShowError] = useState(false);
//   const modelTypes = ["gpt-4o-mini", "Gpt3.5", "gpt4","claude-1"];
//   const providers = ["openai", "anthropic"];

//   const handleFolderSelect = (e) => {
//     const files = e.target.files;
//     if (files) {
//       // Create an array of file objects with their name, path, and file object
//       const fileList = Array.from(files).map((file) => ({
//         name: file.name,
//         path: file.webkitRelativePath, // Get the path of the file (including the folder structure)
//         file,
//       }));
//       console.log("Uploaded files:", fileList);
      
//       // Update the state with the folder paths (or the first folder name)
//       const folderPaths = fileList.map((f) => f.path).join(", ");
//       setCodebasePath(folderPaths); // Set the folder paths to the state
      
//       // Optionally, set a user-friendly display name (for example, just the folder name)
//       const folderName = fileList.length > 0 ? fileList[0].path.split("/")[0] : '';
//       setFolderPath(folderName); // Display just the folder name
      
//       setShowError(false); // Hide error state
//     } else {
//       console.error("No files were uploaded.");
//       setShowError(true); // Show error state if no files were selected
//     }
//   };
  

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // Check if folderPath is empty
//     if (!folderPath) {
//         setShowError(true);
//         return;
//     }

//     const formData = new FormData();
//     formData.append("folderPath", folderPath);
//     formData.append("provider", provider);
//     formData.append("modelType", modelType);

//     // Append compliancePath only if it exists
//     if (compliancePath) {
//         formData.append("compliancePath", compliancePath);
//     }

//     try {
//         setProcessing(true); // Show processing message

//         const response = await fetch("http://localhost:5000/api/analyzecodebase", {
//             method: "POST",
//             body: formData,
//         });

//         const data = await response.json();
//         console.log(data); // Log the response to inspect its structure

//         if (response.ok) {
//       const CodebasereviewId = data.data.review._id;  // Access 'reviewId' from the response
//             console.log("CodeBaseReview ID:", CodebasereviewId);  // Log the ID to ensure it's correct

//             sessionStorage.setItem('CodeBasereviewId', CodebasereviewId);  // Store the review ID in sessionStorage

//             setProcessing(false); // Clear processing state before navigation
//             navigate('/output');
//         } else {
//             console.error("Error response:", data);
//             setProcessing(false);
//         }
//     } catch (error) {
//         console.error("Error:", error);
//         setProcessing(false);
//     }
// };

 

//   return (
//     <div className="min-h-screen bg-white">
//       <nav className="bg-white">
//         <div className="container px-8">
//           <div className="flex h-16 items-center">
//             <div className="flex items-center text-xl font-medium">
//               <div className="flex items-start">  
//                 <img src="../../../public/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
//                 <span className="ml-2">Code Insight</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </nav>

//       <div className="max-w-3xl mx-auto px-8 pt-12 pb-8 mt-10">
//         <h2 className="text-2xl font-bold text-center mb-6">Review Your CodeBase</h2>

//         <form onSubmit={handleSubmit}>
//           <div className="rounded-lg p-8">
//             <div className="space-y-6">
//               {/* Folder Input */}
//               <div className="relative">
//                 <label className="block text-me mb-1">
//                   <span className="text-red-500 mr-1">*</span>
//                   CodeBase Folder:
//                 </label>
//                 <div className="relative">
//                   <input
//                     type="file"
//                     webkitdirectory="true"
//                     directory="true"
//                     onChange={handleFolderSelect}
//                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
//                     required
//                   />
//                   <div className="w-full px-3 py-2 border border-purple-400 rounded text-gray-500">
//                     {folderPath || 'Select a folder'}
//                   </div>
//                 </div>
//               </div>

//               {/* Model Type and Provider */}
//               <div className="flex gap-4 justify-center w:full">
//               <div className='w-1/2'>
//               <label className="block mb-2">Provider:</label>
//               <select
//                 value={provider}
//                 onChange={(e) => setProvider(e.target.value)}
//                 className="w-full p-2 border border-violet-500 rounded focus:ring-purple-500 focus:border-purple-500"
//               >
//                 {providers.map((p) => (
//                   <option key={p} value={p}>
//                     {p}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className='w-1/2'>
//               <label className="block mb-2">Model Type:</label>
//               <select
//                 value={modelType}
//                 onChange={(e) => setModelType(e.target.value)}
//                 className="w-full p-2 border border-violet-500 rounded focus:ring-purple-500 focus:border-purple-500"
//               >
//                 {modelTypes.map((type) => (
//                   <option key={type} value={type}>
//                     {type}
//                   </option>
//                 ))}
//               </select>
//             </div>
//               </div>

//               {/* Compliance File Path */}
//               <div>
//                 <label className="block text-me mb-1">Compliance File Path:</label>
//                 <div className="relative">
//                   <input
//                     type="file"
//                     onChange={(e) => setCompliancePath(e.target.files[0]?.name || '')}
//                     className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
//                   />
//                   <div className="w-full px-3 py-2 border border-purple-400 rounded text-gray-500">
//                     {compliancePath || '/home/pidm/compliance.txt'}
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Run Button */}
          
//             <button
//   type="submit"
//   disabled={processing}
//   className={`w-full mt-6 ${
//     processing ? 'bg-purple-400' : 'bg-purple-500 hover:bg-purple-600'
//   } text-white py-2 rounded-md transition-colors duration-200 flex items-center justify-center gap-2`}
// >
//   {processing ? (
//     <>
//       <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
//         <circle
//           className="opacity-25"
//           cx="12"
//           cy="12"
//           r="10"
//           stroke="currentColor"
//           strokeWidth="4"
//           fill="none"
//         />
//         <path
//           className="opacity-75"
//           fill="currentColor"
//           d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
//         />
//       </svg>
//       Processing...
//     </>
//   ) : (
//     <>
//       <svg
//         className="w-4 h-4"
//         viewBox="0 0 24 24"
//         fill="none"
//         xmlns="http://www.w3.org/2000/svg"
//       >
//         <path
//           d="M5 12h14M12 5l7 7-7 7"
//           stroke="currentColor"
//           strokeWidth="2"
//           strokeLinecap="round"
//           strokeLinejoin="round"
//         />
//       </svg>
//       Run
//     </>
//   )}
// </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default ReviewCodebase;
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
  
  const modelTypes = ["gpt-4o-mini", "Gpt3.5", "gpt4", "claude-1"];
  const providers = ["openai", "anthropic"];

  const handleFolderSelect = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(Array.from(selectedFiles));
      setShowError(false);
    } else {
      console.error("No files were uploaded.");
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
  
    const formData = new FormData();
    
    // Add main files
    files.forEach(file => {
      formData.append('files', file);
    });
  
    // Add compliance file if exists
    if (complianceFile) {
      formData.append('compliance', complianceFile);
    }
  
    // Add provider and model type
    formData.append('provider', provider);
    formData.append('modelType', modelType);
  
    try {
      setProcessing(true);
      const response = await fetch("http://localhost:5000/api/analyzecodebase", {
        method: "POST",
        body: formData
      });
  
      const data = await response.json();
      
      if (response.ok) {
        sessionStorage.setItem('CodeFilereviewId', data.reviewId);
        navigate('/output');
      } else {
        setShowError(true);
        console.error("Error response:", data);
      }
    } catch (error) {
      setShowError(true);
      console.error("Error:", error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white">
        <div className="container px-8">
          <div className="flex h-16 items-center">
            <div className="flex items-center text-xl font-medium">
              <div className="flex items-start">  
                <img src="../../../public/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
                <span className="ml-2">Code Insight</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Form */}
      <div className="max-w-3xl mx-auto px-8 pt-12 pb-8 mt-10">
        <h2 className="text-2xl font-bold text-center mb-6">Review Your CodeBase</h2>

        <form onSubmit={handleSubmit}>
          <div className="rounded-lg p-8">
            <div className="space-y-6">
              {/* Codebase Files Input */}
              <div className="relative">
                <label className="block text-me mb-1">
                  <span className="text-red-500 mr-1">*</span>
                  CodeBase Files:
                </label>
                <div className="relative">
                  <input
                    type="file"
                    webkitdirectory="true"
                    directory="true"
                    onChange={handleFolderSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                  />
                  <div className="w-full px-3 py-2 border border-purple-400 rounded text-gray-500">
                    {files.length > 0 ? `${files.length} files selected` : 'Select files'}
                  </div>
                </div>
              </div>

              {/* Model Type and Provider */}
              <div className="flex gap-4 justify-center w-full">
                <div className="w-1/2">
                  <label className="block mb-2">Provider:</label>
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
                  <label className="block mb-2">Model Type:</label>
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

              {/* Compliance File Input */}
              <div>
                <label className="block text-me mb-1">Compliance File:</label>
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

            {/* Submit Button */}
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
    </div>
  );
};

export default ReviewCodebase;