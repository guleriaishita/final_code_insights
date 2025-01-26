import React, { useState, useEffect } from 'react';
import { FileDown, Loader } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const OutputReview = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);

  useEffect(() => {
    const processId = sessionStorage.getItem('processId_review');
    if (!processId) {
      setError('No process ID found');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/output/generated_analyzed_files_docs/${processId}`,
          { withCredentials: true }
        );
        
        if (response.data.status === 'completed' && response.data.results) {
          const firstFileName = Object.keys(response.data.results)[0];
          setData({
            results: response.data.results[firstFileName].review,
            resultUrl: response.data.resultUrl
          });
          setResultUrl(response.data.resultUrl);
        }
        setLoading(false);
      } catch (err) {
        console.error('API Error:', err);
        setError(err.response?.data?.error || err.message);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDownload = () => {
    if (data?.resultUrl) {
      window.open(data.resultUrl, '_blank');
    }
  };

  if (loading) return (
    <div className="flex items-start gap-2 p-4">
      <Loader className="animate-spin text-purple-600" size={24} />
      <p>Processing...</p>
    </div>
  );

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;
  if (!data?.results) return <div className="text-gray-600 p-4">No results found</div>;

  return (
    <div className="min-h-screen ">
      <nav className="bg-white shadow-sm">
        <div className="px-4">
          <div className="flex h-14 items-center">
            <div onClick={() => navigate('/dashboard')} className="flex items-center text-lg font-medium cursor-pointer">
              <img src="/Logo.png" alt="Logo" className="h-6 w-6" />
              <span className="ml-2">Code Insight</span>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">Code Review Analysis</h1>
          <button 
            onClick={handleDownload}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded"
          >
            <FileDown size={16} />
            Download Results
          </button>
        </div>

        <div className="bg-white shadow rounded p-4">
          <ReactMarkdown 
            className="prose max-w-none text-left space-y-2"
            components={{
              h1: props => <h1 className="text-xl font-bold mb-3" {...props} />,
              h2: props => <h2 className="text-lg font-semibold mt-4 mb-2" {...props} />,
              h3: props => <h3 className="text-base font-medium mt-3 mb-2" {...props} />,
              p: props => <p className="mb-3 leading-normal" {...props} />,
              ul: props => <ul className="list-disc pl-4 mb-3 space-y-1" {...props} />,
              ol: props => <ol className="list-decimal pl-4 mb-3 space-y-1" {...props} />,
              li: props => <li className="mb-1" {...props} />,
              pre: props => <pre className="bg-gray-50 p-3 rounded overflow-x-auto mb-3" {...props} />,
              code: props => <code className="bg-gray-50 px-1 rounded" {...props} />
            }}
          >
            {typeof data.results === 'string' ? data.results : JSON.stringify(data.results, null, 2)}
          </ReactMarkdown>
        </div>
      </main>
    </div>
  );
};

export default OutputReview;