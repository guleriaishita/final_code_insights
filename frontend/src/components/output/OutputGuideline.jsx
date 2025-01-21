import React, { useEffect, useState } from 'react';
import axios from 'axios';

const OutputGuideline = () => {
  const [guideline, setGuideline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const guidelineId = sessionStorage.getItem('guidelineId');

    if (!guidelineId) {
      setError('No guideline ID found. Please generate a guideline first.');
      setLoading(false);
      return;
    }

    const fetchGuideline = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/output/generated_guidelines_docs`, {
          params: { guidelineId }
        });
        
        if (response.data) {
          setGuideline(response.data);
        } else {
          throw new Error('No guideline data received');
        }
      } catch (error) {
        setError(`Failed to fetch guideline: ${error.response?.data?.message || error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchGuideline();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Generated Guideline</h2>
        {guideline ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="prose max-w-none">
              <h3 className="text-xl font-semibold mb-4">Results</h3>
              <div className="whitespace-pre-wrap">{guideline.result}</div>
              
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Status</p>
                  <p>{guideline.status}</p>
                </div>
                <div>
                  <p className="font-medium">Provider</p>
                  <p>{guideline.provider}</p>
                </div>
                <div>
                  <p className="font-medium">Model Type</p>
                  <p>{guideline.modelType}</p>
                </div>
                <div>
                  <p className="font-medium">Created At</p>
                  <p>{new Date(guideline.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No guideline data available.</p>
        )}
      </div>
    </div>
  );
};

export default OutputGuideline;