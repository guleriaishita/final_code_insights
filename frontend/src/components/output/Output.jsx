import React,{ useState }from 'react';
import { useNavigate } from 'react-router';
import axios from 'axios';
const Output = () => {
  const navigate = useNavigate();
  const [loadingguide, setLoadingguide] = useState(false);
  const [loadingcodebase, setLoadingcodebase] = useState(false);
  const [loadingfiles, setLoadingfiles] = useState(false);
  const [loadingKG, setLoadingKG] = useState(false);
  const [error,setError] = useState(null);
 const handleGenerated_guide = async () => {
 
    

    // Navigate to the output page
    navigate('/output/generated_guidelines_docs');
 
};
  const handleGenerated_codebase = async () => {
   navigate('/output/generated_analyzed_codebase_docs');
  };
  
  
  const handleGenerated_files = async () => {
   
        navigate('/output/generated_analyzed_files_docs');
      
  };

  const handleGenerated_KG = async () => {
   navigate('/output/generated_knowledge_graph');
  };
  
  const handle_dashboard = async () => {
    navigate('/dashboard');
  }


  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white">
        <div className="container px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and text */}
            <div className="flex items-center text-xl font-medium">
              <div 
              onClick={handle_dashboard}
              className="flex items-start" >  
                <img src="../../../public/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
                <span className="ml-2" >Code Insight</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Added more top padding */}
      <div className="container mx-auto px-4 py-40">
        {/* Grid container for first row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-4xl mx-auto mb-10">
          {/* Generated Guideline Documents */}
          <div 
            onClick={handleGenerated_guide}
            className="border rounded-lg p-8 flex flex-col items-center justify-center space-y-4 hover:border-purple-400 transition-colors cursor-pointer"
          >
            <img 
              src="../../../public/generatedguidelinesdocs.png" 
              alt="Download Icon" 
              className="w-12 h-12"
            />
            <h3 className="text-center font-medium">Generated Guideline Documents</h3>
            <button 
              onClick={(e) => e.stopPropagation()} 
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              Download Your Generated Documents
            </button>
          </div>

          {/* Generate Knowledge Graph */}
          <div 
            onClick={handleGenerated_KG}
            className="border rounded-lg p-8 flex flex-col items-center justify-center space-y-4 hover:border-purple-400 transition-colors cursor-pointer"
          >
            <img 
              src="../../../public/generateknowledgegraph.png" 
              alt="Knowledge Graph Icon" 
              className="w-12 h-12"
            />
            <h3 className="text-center font-medium">Generate Knowledge Graph for codebase</h3>
            <button 
              onClick={(e) => e.stopPropagation()} 
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              Explore and Download Knowledge Graph
            </button>
          </div>
        </div>

        {/* Centered third box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 max-w-4xl mx-auto mb-10">

        
          <div 
            onClick={handleGenerated_files}
            className="border rounded-lg p-8 flex flex-col items-center justify-center space-y-4 hover:border-purple-400 transition-colors cursor-pointer"
          >
            <img 
              src="../../../public/generateanalyzedfile.png" 
              alt="Folder Icon" 
              className="w-12 h-12"
            />
            <h3 className="text-center font-medium">Generated Analyzed Files</h3>
            <button 
              onClick={(e) => e.stopPropagation()} 
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              Download Your Generated Files
            </button>
          </div>
        
       
          <div 
            onClick={handleGenerated_codebase}
            className="border rounded-lg p-8 flex flex-col items-center justify-center space-y-4 hover:border-purple-400 transition-colors cursor-pointer"
          >
            <img 
              src="../../../public/generateanalyzedfile.png" 
              alt="Folder Icon" 
              className="w-12 h-12"
            />
            <h3 className="text-center font-medium">Generated Analyzed CodeBase</h3>
            <button 
              onClick={(e) => e.stopPropagation()} 
              className="text-purple-600 hover:text-purple-700 transition-colors"
            >
              Download Your Generated Files
            </button>
          </div>
       

      </div>

      </div>
    </div>
  );
};

export default Output;
