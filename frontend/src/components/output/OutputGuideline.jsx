import React, { useEffect, useState } from 'react';
import axios from 'axios';

const OutputGuideline = () => {
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
        if (response.data?.fileUrl) {
          setFileData(response.data);
          window.open(response.data.fileUrl, '_blank');
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGuidelineStatus();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Generated Guideline</h2>
        {fileData?.fileUrl ? (
          <div className="bg-white shadow rounded-lg p-6">
            <a 
              href={fileData.fileUrl}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Donwload The Document
            </a>
          </div>
        ) : (
          <p className="text-gray-500">No document available.</p>
        )}

      </div>
      <div className='max-w-6xl mx-auto mt-6'>
      {fileData?.content ? (
          <div className="bg-white shadow rounded-lg p-6">
            
            {fileData.content}
          </div>
        ) : (
          <p className="text-gray-500">No document available.</p>
        )}
      </div>
    </div>
  );
};

export default OutputGuideline;