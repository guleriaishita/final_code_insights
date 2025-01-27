import React, { useEffect, useState } from 'react';
import { FileDown, Loader, Search, Code, BookOpen, GitBranch, Network, ArrowUpSquare, Users, Share2, Workflow, TreeDeciduous, FileJson } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EnhancedOutputCodebase = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState('');
  const [classOptions, setClassOptions] = useState([]);
  const [showJson, setShowJson] = useState(false);
  const [nodeData, setNodeData] = useState(null);
  const [nodeLoading, setNodeLoading] = useState(false);
  const [nodeError, setNodeError] = useState(null);
  const [showRelationships, setShowRelationships] = useState(false);

  useEffect(() => {
    const fileId = sessionStorage.getItem('processId_review_codebase');
    if (!fileId) {
      setError('No review ID found');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/output/generated_analyzed_codebase_docs/${fileId}`);
        const jsonData = await response.json();
        setData(jsonData);
        fetchClasses();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/output/generated_knowledge_graph');
      const jsonData = await response.json();
      if (jsonData.success) {
        const classes = new Set();
        jsonData.graphData.forEach(item => {
          if (item.node1?.name) classes.add(`${item.node1.name} (${item.node1.type || 'Class'})`);
          if (item.node2?.name) classes.add(`${item.node2.name} (${item.node2.type || 'Class'})`);
        });
        setClassOptions(Array.from(classes).sort());
      }
    } catch (err) {
      setError('Failed to fetch classes');
    }
  };

  const handleSearch = async () => {
    if (!selectedNode) return;
    setNodeLoading(true);
    try {
      const [nodeName] = selectedNode.split(' (');
      const response = await fetch(`http://localhost:5000/api/output/node-relationships?nodeName=${encodeURIComponent(nodeName)}&nodeType=Class`);
      const jsonData = await response.json();
      setNodeData(jsonData.data);
      setNodeError(null);
    } catch (err) {
      setNodeError(err.message);
    }
    setNodeLoading(false);
  };

  const handleDownload = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'analysis_result.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const renderClassCard = (classItem) => (
    <div key={classItem.id} className="bg-purple-50 p-4 rounded-lg mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-purple-600" />
          <h4 className="font-semibold text-purple-900">{classItem.name}</h4>
        </div>
        <div className="text-sm text-purple-600">ID: {classItem.id}</div>
      </div>
      {Object.entries(classItem).map(([key, value]) => 
        key !== 'id' && key !== 'name' && (
          <p key={key} className="text-sm text-purple-600 mt-1">
            {key}: {JSON.stringify(value)}
          </p>
        )
      )}
    </div>
  );

  const renderMethodCard = (method) => (
    <div key={method.id} className="bg-purple-50 p-4 rounded-lg mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-purple-600" />
          <h4 className="font-semibold text-purple-900">{method.name}</h4>
        </div>
        <div className="text-sm text-purple-600">ID: {method.id}</div>
      </div>
      <div className="mt-2 space-y-2 text-sm">
        {Object.entries(method).map(([key, value]) => 
          key !== 'id' && key !== 'name' && (
            <div key={key} className="text-purple-700">
              <span className="font-medium">{key}:</span> 
              <span className="ml-2 whitespace-pre-wrap">{JSON.stringify(value, null, 2)}</span>
            </div>
          )
        )}
      </div>
    </div>
  );

  const renderSection = (title, items, icon, renderFn = renderMethodCard) => {
    if (!items?.length) return null;
    return (
      <div className="bg-white p-6 rounded-xl shadow mb-6 border border-purple-100">
        <div className="flex items-center gap-2 mb-4">
          {React.cloneElement(icon, { className: "w-5 h-5 text-purple-600" })}
          <h3 className="text-lg font-semibold text-purple-900">{title}</h3>
          <span className="text-sm text-purple-500 ml-2">({items.length} items)</span>
        </div>
        <div className="space-y-4">
          {items.map(item => renderFn(item))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader className="animate-spin text-purple-600" size={32} />
        <p>Fetching results...</p>
      </div>
    );
  }

  if (error) return (
    <div className="text-red-500 text-center p-4">Error: {error}</div>
  );

  return (
    <>
      <nav className="bg-white">
        <div className="container px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center text-xl font-medium">
              <div onClick={() => navigate('/dashboard')} className="flex items-start cursor-pointer">
                <img src="../../../public/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
                <span className="ml-2">Code Insight</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-4 mb-6">
          {data?.resultUrl && (
            <button
              onClick={() => handleDownload(data.resultUrl)}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
            >
              <FileDown size={20} />
              Download Results
            </button>
          )}
          <button
            onClick={() => setShowRelationships(!showRelationships)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
          >
            <Network size={20} />
            {showRelationships ? 'Hide' : 'Show'} Class Relationships
          </button>
        </div>

        {/* Analysis Results Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
  <div className="flex items-center gap-2 mb-4">
    <BookOpen className="w-6 h-6 text-purple-600" />
    <h2 className="text-xl font-semibold text-purple-900">Analysis Results</h2>
  </div>
  <div className="bg-purple-50 p-4 rounded-lg text-left">
    <pre className="whitespace-pre-wrap break-words">
      {data?.result?.content?.content?.knowledge_graph ? 
        JSON.stringify(data.result.content.content.knowledge_graph, null, 2)
        : 'No analysis data available'
      }
    </pre>
  </div>
</div>

        {/* Class Relationships Section */}
        {showRelationships && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-purple-900">Class Relationships</h2>
            </div>
            
            <div className="flex gap-4 mb-4">
              <select
                value={selectedNode}
                onChange={(e) => setSelectedNode(e.target.value)}
                className="flex-1 p-2 border border-purple-200 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select a class...</option>
                {classOptions.map((option, index) => (
                  <option key={index} value={option}>{option}</option>
                ))}
              </select>
              <button
                onClick={handleSearch}
                disabled={nodeLoading}
                className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-400"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {nodeLoading && (
              <div className="flex justify-center p-4">
                <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
              </div>
            )}

            {nodeError && (
              <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
                {nodeError}
              </div>
            )}

{nodeData && (
              <div className="space-y-6">
                {renderSection("Parents", nodeData.inheritance?.parents, <ArrowUpSquare />, renderClassCard)}
                {renderSection("Children", nodeData.inheritance?.children, <Share2 />, renderClassCard)}
                {renderSection("Grandchildren", nodeData.inheritance?.grandchildren, <TreeDeciduous />, renderClassCard)}
                {renderSection("Siblings", nodeData.inheritance?.siblings, <Users />, renderClassCard)}
                {renderSection("Descendants", nodeData.inheritance?.descendants, <Workflow />, renderClassCard)}
                {renderSection("Direct Methods", nodeData.methods?.direct, <BookOpen />)}
                {renderSection("Parent Methods", nodeData.methods?.parent, <Network />)}
                {renderSection("Child Methods", nodeData.methods?.child, <Network />)}
                {renderSection("Attributes", nodeData.attributes, <GitBranch />)}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default EnhancedOutputCodebase;