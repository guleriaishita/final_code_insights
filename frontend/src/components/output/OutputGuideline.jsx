import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const OutputGuideline = () => {
  const navigate = useNavigate();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGuidelineStatus = async () => {
      try {
        const fileId = sessionStorage.getItem('fileId');
        if (!fileId) {
          throw new Error('No file ID found');
        }

        const response = await axios.get(`http://localhost:5000/api/generated_guidelines_docs/${fileId}`);
        if (response.data) {
          setFileData(response.data);
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGuidelineStatus();
  }, []);

  const handleDashboard = () => {
    navigate('/dashboard');
  };

  const handleDownload = () => {
    if (fileData?.fileUrl) {
      window.open(fileData.fileUrl, '_blank');
    }
  };

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
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <nav className="bg-white shadow">
        <div className="container px-8">
          <div className="flex h-16 items-center justify-between">
            <div 
              className="flex items-center text-xl font-medium cursor-pointer" 
              onClick={handleDashboard}
            >
              <img 
                src="../../../public/Logo.png" 
                alt="CodeInsight Logo" 
                className="h-8 w-8" 
              />
              <span className="ml-2">Code Insight</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Generated Guideline</h2>
          
          {fileData?.fileUrl ? (
            <div className="bg-white shadow rounded-lg p-6">
              <button 
                onClick={handleDownload}
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
              >
                Download The Document
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No document available.</p>
          )}
        </div>

        <div className="max-w-6xl mx-auto mt-6">
          {fileData?.content ? (
            <div className="bg-white shadow rounded-lg p-6 prose max-w-none">
              <ReactMarkdown 
                className="prose prose-headings:text-purple-600 prose-a:text-blue-600 prose-strong:text-gray-800"
              >
                {fileData.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-500">No content available.</p>
          )}
        </div>
      </div>
    </>
  );
};

export default OutputGuideline;