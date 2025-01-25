import React, { useState, useEffect } from 'react';
import { FileDown, Loader } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';


const OutputDisplay = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('review');

  useEffect(() => {
    const processId = sessionStorage.getItem('processId');
    if (!processId) return;

    const fetchData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/generated_analyzed_files_docs/${processId}`);
        if (response.data.results) {
          setData(response.data);
          setLoading(false);
        } else {
          setTimeout(fetchData, 2000);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchData();
    return () => clearTimeout();
  }, []);

  const handle_dashboard = async () => {
    navigate('/dashboard');
  }


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader className="animate-spin text-purple-600" size={32} />
        <p>Fetching results...</p>
      </div>
    );
  }

  if (error) return <div className="text-red-500 text-center p-4">Error: {error}</div>;
  if (!data?.results) return <div className="text-gray-600 text-center p-4">No results found</div>;

  console.log(data.resultUrl)
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
        <div className="mb-6">
          <a href={data.resultUrl}
             target="_blank"
             rel="noopener noreferrer"
             className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2">
            <FileDown size={20} />
            Download Results
          </a>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          <button onClick={() => setActiveTab('review')}
                  className={`px-4 py-3 font-medium ${activeTab === 'review' ? 
                    'bg-purple-100 text-purple-600 border-b-2 border-purple-600' : 
                    'text-gray-600 hover:bg-gray-50'}`}>
            Code Review
          </button>
          <button onClick={() => setActiveTab('documentation')}
                  className={`px-4 py-3 font-medium ${activeTab === 'documentation' ? 
                    'bg-purple-100 text-purple-600 border-b-2 border-purple-600' : 
                    'text-gray-600 hover:bg-gray-50'}`}>
            Documentation
          </button>
          <button onClick={() => setActiveTab('comments')}
                  className={`px-4 py-3 font-medium ${activeTab === 'comments' ? 
                    'bg-purple-100 text-purple-600 border-b-2 border-purple-600' : 
                    'text-gray-600 hover:bg-gray-50'}`}>
            Comments
          </button>
        </div>
        
        <div className="p-6 prose max-w-none">
          <div className="whitespace-pre-wrap">
          {activeTab === 'review' 
  ? data.results.review // Render the review content when activeTab is 'review'
  : activeTab === 'comments' 
  ? data.results.comments // Render the comment content when activeTab is 'comment'
  : data.results.documentation // Render the documentation content as the default fallback
}
          </div>
        </div>
      </div>
    </div>
    
      </>
  );
};

export default OutputDisplay;