

// KnowledgeGraphPage.js
// import React, { useState, useEffect } from 'react';
// import { ForceGraph2D } from 'react-force-graph';
// import { useNavigate } from 'react-router-dom';
// import { Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

// const KnowledgeGraphPage = () => {
//   const navigate = useNavigate();
//   const [graphData, setGraphData] = useState(null);
//   const [zoomLevel, setZoomLevel] = useState(1);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     try {
//       const storedData = sessionStorage.getItem('knowledgeGraphData');
//       if (storedData) {
//         const parsedData = JSON.parse(storedData);
//         const processedData = transformDataForGraph(parsedData);
//         setGraphData(processedData);
//       } else {
//         setError('No graph data found');
//       }
//     } catch (err) {
//       setError('Error loading graph data');
//       console.error(err);
//     }
//   }, []);

//   const transformDataForGraph = (data) => {
//     if (!data) return { nodes: [], links: [] };

//     const nodesMap = new Map();
//     const links = [];

//     // Create nodes
//     data.forEach(item => {
//       if (!nodesMap.has(item.node1.id)) {
//         nodesMap.set(item.node1.id, {
//           id: item.node1.id,
//           name: item.node1.name || 'Unnamed Node',
//           ...item.node1
//         });
//       }
//       if (!nodesMap.has(item.node2.id)) {
//         nodesMap.set(item.node2.id, {
//           id: item.node2.id,
//           name: item.node2.name || 'Unnamed Node',
//           ...item.node2
//         });
//       }

//       // Create links
//       links.push({
//         source: item.node1.id,
//         target: item.node2.id,
//         type: item.relationship
//       });
//     });

//     return {
//       nodes: Array.from(nodesMap.values()),
//       links: links
//     };
//   };

//   const handleZoomIn = () => {
//     setZoomLevel(prev => Math.min(prev + 0.2, 2));
//   };

//   const handleZoomOut = () => {
//     setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
//   };

//   const handleExport = () => {
//     if (graphData) {
//       const dataStr = JSON.stringify(graphData, null, 2);
//       const dataBlob = new Blob([dataStr], { type: 'application/json' });
//       const url = URL.createObjectURL(dataBlob);
//       const link = document.createElement('a');
//       link.href = url;
//       link.download = 'knowledge-graph.json';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(url);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg">
//         <div className="p-4 border-b">
//           <div className="flex justify-between items-center">
//             <h1 className="text-xl font-bold">Knowledge Graph Visualization</h1>
//             <div className="flex gap-2">
//               <button 
//                 onClick={handleZoomIn}
//                 className="p-2 hover:bg-gray-100 rounded-lg"
//               >
//                 <ZoomIn className="h-5 w-5" />
//               </button>
//               <button 
//                 onClick={handleZoomOut}
//                 className="p-2 hover:bg-gray-100 rounded-lg"
//               >
//                 <ZoomOut className="h-5 w-5" />
//               </button>
//               <button 
//                 onClick={() => window.location.reload()}
//                 className="p-2 hover:bg-gray-100 rounded-lg"
//               >
//                 <RotateCw className="h-5 w-5" />
//               </button>
//               <button 
//                 onClick={handleExport}
//                 className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg"
//               >
//                 <Download className="h-5 w-5" />
//                 Export
//               </button>
//             </div>
//           </div>
//         </div>
//         <div className="p-4">
//           {error ? (
//             <div className="text-red-500 text-center py-8">{error}</div>
//           ) : !graphData ? (
//             <div className="text-gray-500 text-center py-8">Loading graph data...</div>
//           ) : (
//             <div className="h-[600px] w-full">
//               <ForceGraph2D
//                 graphData={graphData}
//                 nodeLabel="name"
//                 linkLabel="type"
//                 nodeColor={() => "#E1E5F2"}
//                 linkColor={() => "#2B4570"}
//                 nodeCanvasObject={(node, ctx, globalScale) => {
//                   const label = node.name;
//                   const fontSize = 12/globalScale;
//                   ctx.font = `${fontSize}px Sans-Serif`;
//                   ctx.textAlign = 'center';
//                   ctx.textBaseline = 'middle';
//                   ctx.fillStyle = '#2B4570';
//                   ctx.fillText(label, node.x, node.y);
//                 }}
//                 zoom={zoomLevel}
//                 width={800}
//                 height={600}
//               />
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default KnowledgeGraphPage;

import React, { useState, useEffect, useCallback } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

const KnowledgeGraphPage = () => {
  const [graphData, setGraphData] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('knowledgeGraphData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const processedData = transformDataForGraph(parsedData);
        setGraphData(processedData);
      } else {
        setError('No graph data found');
      }
    } catch (err) {
      setError('Error loading graph data');
      console.error(err);
    }
  }, []);

  const transformDataForGraph = (data) => {
    if (!data) return { nodes: [], links: [] };

    const nodesMap = new Map();
    const links = [];

    data.forEach(item => {
      if (!nodesMap.has(item.node1.id)) {
        nodesMap.set(item.node1.id, {
          id: item.node1.id,
          name: item.node1.name || 'Unnamed Node',
          val: 1, // Node size
          ...item.node1
        });
      }
      if (!nodesMap.has(item.node2.id)) {
        nodesMap.set(item.node2.id, {
          id: item.node2.id,
          name: item.node2.name || 'Unnamed Node',
          val: 1,
          ...item.node2
        });
      }

      links.push({
        source: item.node1.id,
        target: item.node2.id,
        type: item.relationship,
        curvature: 0.2
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      links: links
    };
  };

  const handleNodeHover = useCallback(node => {
    setHoverNode(node);
    setHighlightNodes(new Set(node ? [node.id] : []));
    setHighlightLinks(new Set(graphData.links
      .filter(link => link.source.id === node?.id || link.target.id === node?.id)
      .map(link => link.id)
    ));
  }, [graphData]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));

  const handleExport = () => {
    if (graphData) {
      const dataStr = JSON.stringify(graphData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'knowledge-graph.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const paintNode = useCallback((node, ctx, globalScale) => {
    const label = node.name;
    const fontSize = 12/globalScale;
    const nodeR = 5/globalScale;

    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
    ctx.fillStyle = highlightNodes.has(node.id) ? '#ff6b6b' : '#4a90e2';
    ctx.fill();

    // Add glow effect for hovered nodes
    if (highlightNodes.has(node.id)) {
      ctx.shadowColor = '#ff6b6b';
      ctx.shadowBlur = 15;
    }

    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = highlightNodes.has(node.id) ? '#2c3e50' : '#34495e';
    ctx.fillText(label, node.x, node.y + nodeR + fontSize);
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }, [highlightNodes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Knowledge Graph Visualization</h1>
            <div className="flex gap-3">
              <button 
                onClick={handleZoomIn}
                className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors duration-200"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button 
                onClick={handleZoomOut}
                className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors duration-200"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors duration-200"
              >
                <RotateCw className="h-5 w-5" />
              </button>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
              >
                <Download className="h-5 w-5" />
                Export
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          {error ? (
            <div className="text-red-500 text-center py-8 bg-red-50 rounded-lg">{error}</div>
          ) : !graphData ? (
            <div className="text-gray-500 text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Loading graph data...
            </div>
          ) : (
            <div className="h-[600px] w-full bg-gray-50 rounded-lg overflow-hidden">
              <ForceGraph2D
                graphData={graphData}
                nodeLabel="name"
                linkLabel="type"
                nodeRelSize={6}
                linkWidth={2}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.005}
                nodeCanvasObject={paintNode}
                nodeCanvasObjectMode={() => 'after'}
                linkColor={link => highlightLinks.has(link.id) ? '#ff6b6b' : '#cbd5e1'}
                onNodeHover={handleNodeHover}
                zoom={zoomLevel}
                width={2000}
                height={2200}
                d3AlphaDecay={0.01}
                d3VelocityDecay={0.08}
                cooldownTime={3000}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;