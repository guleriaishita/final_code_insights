import React, { useEffect, useState } from 'react';
import axios from 'axios';

const OutputFiles = () => {
  const [filesReview, setFilesReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const filesReviewId = sessionStorage.getItem('FilesreviewId');
    if (!filesReviewId) {
      setError('No review ID found');
      setLoading(false);
      return;
    }

    const fetchReview = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/reviews/${filesReviewId}`);
        setFilesReview(response.data);
      } catch (error) {
        setError(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    };

    const interval = setInterval(fetchReview, 2000);
    return () => clearInterval(interval);
  }, []);

  const renderResults = (results) => {
    if (!results) return null;
    
    return Object.entries(results).map(([type, content]) => (
      <div key={type} className="bg-white p-4 rounded-lg shadow mt-6">
        <h4 className="text-lg font-semibold mb-3 capitalize">{type}</h4>
        <div className="whitespace-pre-wrap prose max-w-none">
          {content}
        </div>
      </div>
    ));
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Files Analysis Results</h2>
        {filesReview ? (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="font-medium">Status</p>
                  <p>{filesReview.status}</p>
                </div>
                <div>
                  <p className="font-medium">Provider</p>
                  <p>{filesReview.provider}</p>
                </div>
                <div>
                  <p className="font-medium">Model Type</p>
                  <p>{filesReview.modelType}</p>
                </div>
                <div>
                  <p className="font-medium">Created At</p>
                  <p>{new Date(filesReview.createdAt).toLocaleString()}</p>
                </div>
              </div>

              {filesReview.status === 'completed' && filesReview.fileUrl && (
                <div className="mb-6">
                  <a 
                    href={filesReview.fileUrl}
                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                    download
                  >
                    Download Report
                  </a>
                </div>
              )}

              {filesReview.status === 'processing' && (
                <div className="flex items-center mt-4 text-purple-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Processing your files...
                </div>
              )}
              
              {renderResults(filesReview.results)}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No files review data available.</p>
        )}
      </div>
    </div>
  );
};

export default OutputFiles;