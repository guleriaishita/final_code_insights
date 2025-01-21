// import React, { useEffect, useState } from 'react';
// import axios from 'axios';

// const OutputFiles = () => {
//   const [filesReview, setFilesReview] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchFilesReview = async () => {
//       const filesReviewId = sessionStorage.getItem('FilesreviewId');

//       if (!filesReviewId) {
//         setError('No review ID found. Please generate a files review first.');
//         setLoading(false);
//         return;
//       }

//       try {
//         const response = await axios.get('http://localhost:5000/api/output/generated_analyzed_files_docs', {
//           params: { FilesreviewId: filesReviewId }
//         });
        
//         if (response.data) {
//           setFilesReview(response.data);
//         } else {
//           throw new Error('No files review data received');
//         }
//       } catch (error) {
//         const errorMessage = error.response?.data?.message || error.message;
//         setError(`Failed to fetch files review: ${errorMessage}`);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchFilesReview();
//   }, []);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
//           {error}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-white p-8">
//       <div className="max-w-4xl mx-auto">
//         <h2 className="text-2xl font-bold mb-6">Files Analysis Results</h2>
//         {filesReview ? (
//           <div className="bg-white shadow rounded-lg p-6">
//             <div className="prose max-w-none">
//               <h3 className="text-xl font-semibold mb-4">Analysis Results</h3>
//               <div className="whitespace-pre-wrap">{filesReview.result}</div>
              
//               <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
//                 <div>
//                   <p className="font-medium">Status</p>
//                   <p>{filesReview.status}</p>
//                 </div>
//                 <div>
//                   <p className="font-medium">Provider</p>
//                   <p>{filesReview.provider}</p>
//                 </div>
//                 <div>
//                   <p className="font-medium">Model Type</p>
//                   <p>{filesReview.modelType}</p>
//                 </div>
//                 <div>
//                   <p className="font-medium">Created At</p>
//                   <p>{new Date(filesReview.createdAt).toLocaleString()}</p>
//                 </div>
//               </div>
//             </div>
//           </div>
//         ) : (
//           <p className="text-gray-500">No files review data available.</p>
//         )}
//       </div>
//     </div>
//   );
// };

// export default OutputFiles;
// Frontend: OutputFiles.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const OutputFiles = () => {
  const [filesReview, setFilesReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFilesReview = async () => {
      const filesReviewId = sessionStorage.getItem('FilesreviewId');

      if (!filesReviewId) {
        setError('No review ID found. Please generate a files review first.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/api/output/generated_analyzed_files_docs', {
          params: { FilesreviewId: filesReviewId }
        });
        
        if (response.data) {
          setFilesReview(response.data);
        } else {
          throw new Error('No files review data received');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        setError(`Failed to fetch files review: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchFilesReview();
  }, []);

  const renderResults = (results) => {
    if (!results) return null;
    
    return (
      <div className="space-y-6">
        {results.review && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="text-lg font-semibold mb-3">Code Review</h4>
            <div className="whitespace-pre-wrap prose max-w-none">
              {results.review}
            </div>
          </div>
        )}
        
        {results.documentation && (
          <div className="bg-white p-4 rounded-lg shadow mt-6">
            <h4 className="text-lg font-semibold mb-3">Documentation</h4>
            <div className="whitespace-pre-wrap prose max-w-none">
              {results.documentation}
            </div>
          </div>
        )}

        {results.comments && (
          <div className="bg-white p-4 rounded-lg shadow mt-6">
            <h4 className="text-lg font-semibold mb-3">Comments</h4>
            <div className="whitespace-pre-wrap prose max-w-none">
              {results.comments}
            </div>
          </div>
        )}
      </div>
    );
  };

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Files Analysis Results</h2>
        {filesReview ? (
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <p className="font-medium">Status</p>
                  <p>{filesReview.status || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium">Provider</p>
                  <p>{filesReview.provider || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium">Model Type</p>
                  <p>{filesReview.modelType || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-medium">Created At</p>
                  <p>{filesReview.createdAt ? new Date(filesReview.createdAt).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
              
              {renderResults(filesReview.result)}
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
