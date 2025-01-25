import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileDown, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


const OutputCodebase = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('structure');

  useEffect(() => {
    const fileId = sessionStorage.getItem('fileId_review_codebase');
    if (!fileId) {
      setError('No review ID found');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/generated_analyzed_codebase_docs/${fileId}`);
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handle_dashboard = async () => {
    navigate('/dashboard');
  }


  const handleDownload = async (url, filename = 'analysis_result.json') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader className="animate-spin text-purple-600" size={32} />
        <p>Fetching results...</p>
      </div>
    );
  }

  if (error) return (
    <div className="text-red-500 text-center p-4">Error: {error}</div>
  );

  if (!data) return (
    <div className="text-gray-600 text-center p-4">No results found</div>
  );

  return (
    <>
    <nav className="bg-white">
    <div className="container px-8">
      <div className="flex h-16 items-center justify-between">
        {/* Logo and text */}
        <div className="flex items-center text-xl font-medium">
          <div onClick={handle_dashboard}
          className="flex items-start" >  
            <img src="../../../public/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
            <span className="ml-2" >Code Insight</span>
          </div>
        </div>
      </div>
    </div>
  </nav>
    <div className="max-w-6xl mx-auto p-4">
      {data.resultUrl && (
  <button
    onClick={() => handleDownload(data.resultUrl)}
    className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
  >
    <FileDown size={20} />
    Download Results
  </button>
)}

      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          <button 
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-3 font-medium ${activeTab === 'structure' ? 
              'bg-purple-100 text-purple-600 border-b-2 border-purple-600' : 
              'text-gray-600 hover:bg-gray-50'}`}>
            Codebase Structure
          </button>
          <button 
            onClick={() => setActiveTab('graph')}
            className={`px-4 py-3 font-medium ${activeTab === 'graph' ? 
              'bg-purple-100 text-purple-600 border-b-2 border-purple-600' : 
              'text-gray-600 hover:bg-gray-50'}`}>
            Knowledge Graph
          </button>
        </div>
        
        <div className="p-6 prose max-w-none">
          <div className="whitespace-pre-wrap">
            {activeTab === 'structure' 
              ? data.result.content.codebaseStructure 
              : data.result.content.knowledgeGraph}
          </div>
        </div>
      </div>
    </div>
    </>
  );
  
};

export default OutputCodebase;