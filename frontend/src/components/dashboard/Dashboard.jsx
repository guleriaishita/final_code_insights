import React from 'react';
import { useNavigate } from 'react-router';
const Dashboard = () => {
  const navigate = useNavigate();
  const handleGenerateGuidelines = () => {
    navigate('/generate_guidelines');
    };
  const handleHome = () =>{
    navigate('/');
  } 
  const handleReviewCodeBase = () =>{
    navigate('/api/analyzecodebase');
  }
  const handleReviewCodefile = () =>{
    navigate('/api/analyzefile');
  }
  
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white">
        <div className="container px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo and text - kept exactly as original */}
            <div className="flex items-center text-xl font-medium">
              <div className="flex items-start">  
                <img src="../../../public/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
                <span className="ml-2">Code Insight</span>
              </div>
            </div>
            {/* Back to Home button - pushed further right */}
            <button className="bg-purple-500 text-white px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all mr-0"onClick={handleHome}>
              Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pt-24 mt-12 mb-8">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">
            Comprehensive Tools for Code Analysis and document generation
          </h1>

          {/* Cards Container */}
          <div className="mt-16 flex justify-center gap-12">
            {/* Generate Guidelines Card */}
            <div className="w-5/12 p-8 border-2 border-purple-300 rounded-2xl hover:shadow-lg transition-all cursor-pointer" onClick={handleGenerateGuidelines}>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6">
                  <img src="../../../public/generateguidelineslogo.png" alt="Document Icon" className="w-16 h-16" />
                </div>
                <h3 className="text-lg font-medium mb-2">Generate Guidelines document</h3>
                <p className="text-purple-500">Create structured Coding Practices</p>
              </div>
            </div>

            {/* Review Code Card */}
            <div className="w-5/12 p-8 border-2 border-purple-300 rounded-2xl hover:shadow-lg transition-all cursor-pointer" onClick={handleReviewCodeBase}>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6">
                  <img src="../../../public/reviewcode.png" alt="Review Icon" className="w-16 h-16" />
                </div>
                <h3 className="text-lg font-medium mb-2">Review your CodeBase</h3>
                <p className="text-purple-500">Create unified Code Insights</p>
              </div>
            </div>
            <div className="w-5/12 p-8 border-2 border-purple-300 rounded-2xl hover:shadow-lg transition-all cursor-pointer" onClick={handleReviewCodefile}>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6">
                  <img src="../../../public/generateguidelineslogo.png" alt="Document Icon" className="w-16 h-16" />
                </div>
                <h3 className="text-lg font-medium mb-2">Review Your Code File </h3>
                <p className="text-purple-500">Create Review of a file</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;