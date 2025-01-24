import React, { useEffect, useState } from 'react';
import axios from 'axios';

const OutputFiles = () => {
  const [reviewData, setReviewData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
   

    const fetchReview = async () => {
      const currentReviewId = sessionStorage.getItem('currentReviewId');
      if (!currentReviewId) {
        throw new Error('No file ID found');
      }
      try {
        const response = await axios.get(`http://localhost:5000/api/generated_analyzed_files_docs/${currentReviewId}`);
        const { status, results, error: responseError } = response.data;

        if (responseError) {
          throw new Error(responseError);
        }

        setReviewData(response.data);
        
        // Stop polling if we have a final status
        if (status === 'completed' || status === 'failed') {
          return true;
        }
      } catch (error) {
        setError(error.message);
        return true;
      }
      return false;
    };

    const poll = async () => {
      const shouldStop = await fetchReview();
      if (shouldStop) {
        setLoading(false);
      }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  const renderResults = (results) => {
    if (!results) return null;
    
    return Object.entries(results).map(([type, content]) => (
      <div key={type} className="bg-white p-4 rounded-lg shadow mt-6">
        <h4 className="text-lg font-semibold mb-3 capitalize">{type.replace(/_/g, ' ')}</h4>
        <div className="whitespace-pre-wrap prose max-w-none">
          {typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
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
        {reviewData ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div>
                <p className="font-medium">Status</p>
                <p>{reviewData.status}</p>
              </div>
              <div>
                <p className="font-medium">Provider</p>
                <p>{reviewData.provider}</p>
              </div>
              <div>
                <p className="font-medium">Model Type</p>
                <p>{reviewData.modelType}</p>
              </div>
              <div>
                <p className="font-medium">Created At</p>
                <p>{new Date(reviewData.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {reviewData.status === 'processing' && (
              <div className="flex items-center mt-4 text-purple-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Processing your files...
              </div>
            )}
            
            {renderResults(reviewData.results)}
          </div>
        ) : (
          <p className="text-gray-500">No analysis data available.</p>
        )}
      </div>
    </div>
  );
};

export default OutputFiles;