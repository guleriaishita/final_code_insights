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
    navigate('/output/generated_guidelines_docs');
  };

  const handleGenerated_codebase = async () => {
    try {
      setLoadingcodebase(true); // Assuming setLoading is a state handler
      setError(null);   // Assuming setError is a state handler
  
      // Fetch the latest generated codebase data
      const response = await axios.get('http://localhost:5000/api/output/reviewcodebase');
  
      if (response.data.success && response.data.codebaseId) {
        // Store the codebase ID in sessionStorage
        sessionStorage.setItem('CodeBasereviewId', response.data.codebaseId);
  
        // Navigate to the output page
        navigate('/output/generated_analyzed_codebase_docs');
      } else {
        throw new Error('No codebase ID received');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || 'Failed to fetch codebase');
    } finally {
      setLoadingcodebase(false);
    }
  };
  
  
  const handleGenerated_files = async () => {
    try {
      setLoadingfiles(true);
      setError(null);
      
      const response = await axios.get('http://localhost:5000/api/output/reviewfiles');
      
      if (response.data.success && response.data.fileId) {
        sessionStorage.setItem('FilesreviewId', response.data.fileId);
        navigate('/output/generated_analyzed_files_docs');
      } else {
        throw new Error(response.data.message || 'No file review ID received');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.response?.data?.message || 'Failed to fetch file review');
    } finally {
      setLoadingfiles(false);
    }
  };

  const handleGenerated_KG = async () => {
    try {
      setLoadingKG(true);
      setError(null);
      
      const response = await axios.get('http://localhost:5000/api/output/generated_knowledge_graph');
      
      if (response.data.success && response.data.graphData) {
        // Store the graph data in sessionStorage if needed
        sessionStorage.setItem('knowledgeGraphData', JSON.stringify(response.data.graphData));
        navigate('/output/generated_knowledge_graph');
      } else {
        throw new Error(response.data.message || 'No knowledge graph data received');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || 'Failed to fetch knowledge graph');
    } finally {
      setLoadingKG(false);
    }
  };
  


  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="bg-white">
        <div className="container px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and text */}
            <div className="flex items-center text-xl font-medium">
              <div className="flex items-start">  
                <img src="../../../public/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
                <span className="ml-2">Code Insight</span>
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
