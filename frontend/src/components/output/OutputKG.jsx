import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Code,
  BookOpen,
  GitBranch,
  Network,
  ArrowUpSquare,
  Users,
  Share2,
  Workflow,
  TreeDeciduous,
  FileJson
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';



const OutputKG = () => {
    const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState('');
  const [nodeType, setNodeType] = useState('Class');
  const [classOptions, setClassOptions] = useState([]);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    fetchClasses();
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
  const handle_dashboard = async () => {
    navigate('/dashboard');
  }


  const handleSearch = async () => {
    if (!selectedNode) return;
    setLoading(true);
    try {
      const [nodeName] = selectedNode.split(' (');
      const response = await fetch(`http://localhost:5000/api/output/node-relationships?nodeName=${encodeURIComponent(nodeName)}&nodeType=${nodeType}`);
      const jsonData = await response.json();
      setData(jsonData.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
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

  return (
    <>
    <nav className="bg-white">
    <div className="container px-8">
      <div className="flex h-16 items-center justify-between">
        {/* Logo and text */}
        <div className="flex items-center text-xl font-medium">
          <div onClick={handle_dashboard}
          className="flex items-start" >  
            <img src="../../../public/Logo.png" alt="CodeInsight Logo" className="h-8 w-8" />
            <span className="ml-2" >Code Insight</span>
          </div>
        </div>
      </div>
    </div>
  </nav>
    <div className="min-h-screen bg-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-xl shadow mb-6 border border-purple-100">
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
              disabled={loading}
              className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-400"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {data && (
            <button
              onClick={() => setShowJson(!showJson)}
              className="flex items-center gap-2 p-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              <FileJson className="w-4 h-4" />
              {showJson ? 'Hide' : 'Show'} Raw JSON
            </button>
          )}

          {loading && (
            <div className="flex justify-center p-4">
              <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {showJson && data && (
            <pre className="mt-4 p-4 bg-gray-50 rounded-lg overflow-auto max-h-96 text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>

        {data && (
          <div className="space-y-6">
            {renderSection("Parents", data.inheritance?.parents, <ArrowUpSquare />, renderClassCard)}
            {renderSection("Children", data.inheritance?.children, <Share2 />, renderClassCard)}
            {renderSection("Grandchildren", data.inheritance?.grandchildren, <TreeDeciduous />, renderClassCard)}
            {renderSection("Siblings", data.inheritance?.siblings, <Users />, renderClassCard)}
            {renderSection("Descendants", data.inheritance?.descendants, <Workflow />, renderClassCard)}
            {renderSection("Direct Methods", data.methods?.direct, <BookOpen />)}
            {renderSection("Parent Methods", data.methods?.parent, <Network />)}
            {renderSection("Child Methods", data.methods?.child, <Network />)}
            {renderSection("Attributes", data.attributes, <GitBranch />)}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default OutputKG;