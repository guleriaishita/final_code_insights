
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const OutputCodebase = () => {
  const [codebaseReview, setCodebaseReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCodebaseReview = async () => {
      const codebaseId = sessionStorage.getItem('CodeBasereviewId');

      if (!codebaseId) {
        setError('No review ID found. Please generate a codebase review first.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/api/output/generated_analyzed_codebase_docs', {
          params: { CodeBasereviewId: codebaseId }
        });
        
        if (response.data) {
          setCodebaseReview(response.data);
          console.log(response.data)
        } else {
          throw new Error('No codebase review data received');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        setError(`Failed to fetch codebase review: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCodebaseReview();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          <p className="text-gray-600">Loading codebase review...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md">
          {error}
        </div>
      </div>
    );
  }

  if (!codebaseReview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg max-w-md">
          No codebase review data available.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-800">Codebase Review Results</h2>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <div className="space-y-6">
            <div className="px-6 py-4">
            <div className="space-y-6">
              {/* Codebase Structure Section */}
              {codebaseReview.result.content.codebaseStructure && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h3 className="text-xl font-semibold mb-4">Codebase Structure</h3>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {codebaseReview.result.content.codebaseStructure}
                    </pre>
                  </div>
                </div>
              )}

              {/* Knowledge Graph Section */}
              {codebaseReview.result.content.knowledgeGraph && (
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h3 className="text-xl font-semibold mb-4">Knowledge Graph</h3>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                      {codebaseReview.result.content.knowledgeGraph}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
                  

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-700">Status</p>
                  <p className="mt-1">{codebaseReview.status}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-700">Provider</p>
                  <p className="mt-1">{codebaseReview.provider}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-700">Model Type</p>
                  <p className="mt-1">{codebaseReview.modelType}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-700">Created At</p>
                  <p className="mt-1">
                    {new Date(codebaseReview.createdAt).toLocaleString()}
                  </p>
                </div>

                {codebaseReview.docPath && (
                  <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                    <p className="font-medium text-gray-700">Document Path</p>
                    <p className="mt-1 break-all">{codebaseReview.docPath}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutputCodebase;