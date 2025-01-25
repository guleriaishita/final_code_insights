import React from 'react';
import { useNavigate } from "react-router-dom";



const Home = () => {
  const navigate = useNavigate();
const handleDashboard = () => {
  navigate("/dashboard");
  };
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white">
        <div className="container px-8">
          <div className="flex h-16 items-center">
            {/* Logo and text aligned to left */}
            <div className="flex items-center text-xl font-medium">
              <div className="flex items-start">  
                <img src="../../../public/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
                <span className="ml-2">Code Insight</span>
              </div>
            </div>
            {/* Navigation links with more left spacing */}
           
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 pt-32">
        <div className="text-center">
          <h1 className="text-5xl font-semibold text-gray-900">
            Transform Your Analysis with Intelligence
            <div className="mt-3 text-purple-600">– Welcome to CodeInsight</div>
          </h1>
          <p className="mt-6 text-gray-900 text-lg max-w-2xl mx-auto">
            CodeInsight delivers AI-driven analysis, smart documentation, and interactive knowledge graphs,
            helping you unlock the full potential of your code. Get started today and elevate your coding
            experience.
          </p>
          <button 
              onClick={handleDashboard}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all mt-10"
            >
              Get Started
            </button>
          
        </div>
      </main>
    </div>
  );
};

export default Home;