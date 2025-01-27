import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';

const DASHBOARD_CARDS = [
  {
    id: 'guidelines',
    title: 'Generate Codebase Style Guide',
    description: 'Create Structured Coding Practices',
    iconName: 'FileText',
    route: '/generate_guidelines'
  },
  
  {
    id: 'file',
    title: 'Review Code File',
    description: 'Create Review of a File',
    iconName: 'File',
    route: '/api/analyzefile'
  },
  {
    id: 'documentation',
    title: 'Generate Documentation',
    description: 'Create Structured Documentation',
    iconName: 'BookOpen',
    route: '/api/generate_documentation'
  },
  {
    id: 'comments',
    title: 'Generate Commented Code',
    description: 'Create Comments/Docstring',
    iconName: 'MessageSquareText',
    route: '/api/generate_comments'
  },
  {
    id: 'codebase',
    title: 'Review CodeBase',
    description: 'Create Unified Code Insights',
    iconName: 'Code2',
    route: '/api/analyzecodebase'
  },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen ">
      <nav className="bg-white fixed w-full left-0 top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <LucideIcons.Code className="h-8 w-8 text-purple-600" />
              <span className="ml-2 text-xl font-medium text-gray-900">
                Code Insight
              </span>
            </div>
            
            <button
              onClick={() => navigate('/')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full 
                       shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-2
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              <LucideIcons.Home className="h-4 w-4" />
              Back to Home
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="mt-8">
          <h1 className="text-4xl font-bold text-gray-900 text-center mb-12">
            Comprehensive Tools for Code Analysis and Documentation
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {DASHBOARD_CARDS.map((card) => {
              const Icon = LucideIcons[card.iconName];
              return (
                <button
                  key={card.id}
                  onClick={() => navigate(card.route)}
                  className="p-6 bg-white border-2 border-purple-200 rounded-xl hover:shadow-lg 
                           transition-all duration-200 transform hover:-translate-y-1 
                           focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <Icon className="w-12 h-12 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {card.title}
                    </h3>
                    <p className="text-purple-600">
                      {card.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;