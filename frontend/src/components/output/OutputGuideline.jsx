import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const OutputGuideline = () => {
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGuidelineStatus = async () => {
      try {
        const fileId = sessionStorage.getItem('generatedFileId');
        if (!fileId) throw new Error('No file ID found');
        const response = await axios.get(`http://localhost:5000/api/generated_guidelines_docs/${fileId}`);
        setFileData(response.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGuidelineStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white mb-6">
        <div className="container px-8">
          <div className="flex h-16 items-center">
            <div 
              className="flex items-center text-xl font-medium cursor-pointer" 
              onClick={() => navigate('/dashboard')}
            >
              <img src="/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
              <span className="ml-2">Code Insight</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Generated Guideline</h2>
        
        {fileData?.fileUrl && (
          <div className="mb-6">
            <button 
              onClick={() => window.open(fileData.fileUrl, '_blank')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition-colors"
            >
              Download Document
            </button>
          </div>
        )}

        {fileData?.content ? (
          <div className="bg-white shadow rounded-lg p-6">
            <ReactMarkdown 
              className="prose max-w-none text-left [&>*]:text-left [&>h1]:text-left [&>h2]:text-left [&>h3]:text-left [&>p]:text-left [&>ul]:text-left [&>ol]:text-left prose-headings:text-purple-600 prose-a:text-blue-600 prose-strong:text-gray-800"
            >
              {fileData.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-gray-500">No content available.</p>
        )}
      </div>
    </div>
  );
};

export default OutputGuideline;