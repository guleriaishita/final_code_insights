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
            <div className="flex space-x-6 ml-32">
              <a href="#" className="text-gray-600 hover:text-gray-900">Home</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#" className="text-gray-600 hover:text-gray-900">Contact Us</a>
              <a href="#" className="text-gray-600 hover:text-gray-900" onClick={handleDashboard}>Dashboard</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 pt-32">
        <div className="text-center">
          <h1 className="text-4xl font-semibold text-gray-900">
            Transform Your Analysis with Intelligence
            <div className="mt-2">– Welcome to CodeInsight</div>
          </h1>
          <p className="mt-6 text-gray-600 text-lg max-w-2xl mx-auto">
            CodeInsight delivers AI-driven analysis, smart documentation, and interactive knowledge graphs,
            helping you unlock the full potential of your code. Get started today and elevate your coding
            experience.
          </p>
          <div className="mt-24 flex justify-center gap-9">
            {/* Updated button styles with more rounded corners and shadows */}
            <button className="w-32 py-2 px-6 border border-purple-500 text-purple-500 rounded-full shadow-lg hover:bg-purple-50 transition-all">
              Sign In
            </button>
            <button className="w-32 py-2 px-6 bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-600 transition-all">
              Sign Up
            </button>
            
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;