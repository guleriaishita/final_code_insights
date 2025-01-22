
// import React, { useState, useEffect, useCallback } from 'react';
// import { ForceGraph2D } from 'react-force-graph';
// import { Download, ZoomIn, ZoomOut, RotateCw, Send } from 'lucide-react';

// const KnowledgeGraphPage = () => {
//   const [graphData, setGraphData] = useState(null);
//   const [zoomLevel, setZoomLevel] = useState(1);
//   const [highlightNodes, setHighlightNodes] = useState(new Set());
//   const [highlightLinks, setHighlightLinks] = useState(new Set());
//   const [hoverNode, setHoverNode] = useState(null);
//   const [error, setError] = useState(null);
//   const [selectedNode, setSelectedNode] = useState('');
//   const [nodeOptions, setNodeOptions] = useState([]);

//   useEffect(() => {
//     try {
//       const storedData = sessionStorage.getItem('knowledgeGraphData');
//       if (storedData) {
//         const parsedData = JSON.parse(storedData);
//         const processedData = transformDataForGraph(parsedData);
//         setGraphData(processedData);
        
//         // Process nodes for dropdown
//         const options = new Set();
//         parsedData.forEach(item => {
//           // Process node1
//           const node1Type = getNodeType(item.node1);
//           if (node1Type) {
//             options.add(`${item.node1.name} (${node1Type})`);
//           }
          
//           // Process node2
//           const node2Type = getNodeType(item.node2);
//           if (node2Type) {
//             options.add(`${item.node2.name} (${node2Type})`);
//           }
//         });
//         setNodeOptions(Array.from(options).sort());
//       } else {
//         setError('No graph data found');
//       }
//     } catch (err) {
//       setError('Error loading graph data');
//       console.error(err);
//     }
//   }, []);

//   const getNodeType = (node) => {
//     if (node.has_functions !== undefined || node.has_classes !== undefined) return 'file';
//     if (node.total_methods !== undefined) return 'class';
//     if (node.is_property !== undefined) return 'method';
//     if (node.base_package !== undefined) return 'import';
//     if (node.total_files !== undefined) return 'directory';
//     return null;
//   };

//   const handleSubmit = async () => {
//     if (selectedNode) {
//       try {
//         // Store the selected node ID in session storage
//         sessionStorage.setItem('selectedNodeId', selectedNode);
  
//         // Extract the node name and type from the selectedNode
//         const [nodeName, nodeType] = selectedNode.split(' ('); // Assumes format: "nodeName (nodeType)"
//         const cleanedNodeType = nodeType?.replace(')', ''); // Remove the closing parenthesis
//         console.log([nodeName,nodeType]);
//         if (!nodeName || !cleanedNodeType) {
//           console.error('Invalid selected node format');
//           return;
//         }
  
//         // Fetch relationships from the API
//         const response = await fetch(`http://localhost:5000/api/output/node-relationships?nodeName=${nodeName}&nodeType=${cleanedNodeType}`);
  
//         if (!response.ok) {
//           throw new Error(`Error fetching node relationships: ${response.statusText}`);
//         }
  
//         const data = await response.json();
  
//         if (data.success) {
//           console.log('Relationships object:', data.data);
//         } else {
//           console.error('Failed to fetch relationships:', data.message);
//         }
//       } catch (error) {
//         console.error('Error in handleSubmit:', error);
//       }
//     } else {
//       console.warn('No node selected');
//     }
//   };
  
 
//   const transformDataForGraph = (data) => {
//     console.log('Starting transformation with data:', data);
//     if (!data) {
//       console.log('No data provided to transform');
//       return { nodes: [], links: [] };
//     }
  
//     const nodesMap = new Map();
//     const links = [];
  
//     // Process each relationship in the data
//     data.forEach((relationship, index) => {
//       console.log(`Processing relationship ${index}:`, relationship);
      
//       // Process node1
//       if (relationship.node1) {
//         const node1Type = getNodeType(relationship.node1);
//         nodesMap.set(relationship.node1.id, {
//           id: relationship.node1.id,
//           name: relationship.node1.name,
//           val: 15,  // You can adjust this value
//           type: node1Type,
//           ...relationship.node1
//         });
//       }
      
//       // Process node2
//       if (relationship.node2) {
//         const node2Type = getNodeType(relationship.node2);
//         nodesMap.set(relationship.node2.id, {
//           id: relationship.node2.id,
//           name: relationship.node2.name,
//           val: 15,  // You can adjust this value
//           type: node2Type,
//           ...relationship.node2
//         });
//       }
      
//       // Create link between nodes if both exist
//       if (relationship.node1 && relationship.node2) {
//         links.push({
//           id: `${relationship.node1.id}-${relationship.node2.id}`,
//           source: relationship.node1.id,
//           target: relationship.node2.id,
//           type: relationship.relationship_type || 'default'
//         });
//       }
//     });
  
//     const result = {
//       nodes: Array.from(nodesMap.values()),
//       links: links
//     };
    
//     console.log('Transformed result:', result);
//     return result;
//   };

//   const handleNodeHover = useCallback(node => {
//     setHoverNode(node);
//     setHighlightNodes(new Set(node ? [node.id] : []));
//     setHighlightLinks(new Set(graphData.links
//       .filter(link => link.source.id === node?.id || link.target.id === node?.id)
//       .map(link => link.id)
//     ));
//   }, [graphData]);

//   const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 2));
//   const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));

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

//   const paintNode = useCallback((node, ctx, globalScale) => {
//     const label = node.name;
//     const fontSize = 12/globalScale;
//     const nodeR = 5/globalScale;
  
//     // Get node color based on type
//     const getNodeColor = (node) => {
//       switch (node.type) {
//         case 'target': return '#4CAF50';
//         case 'class': return '#2196F3';
//         case 'method': return node.is_abstract ? '#9C27B0' : '#E91E63';
//         case 'file': return '#FF5722';
//         case 'import': return '#795548';
//         default: return '#9E9E9E';
//       }
//     };
  
//     ctx.beginPath();
//     ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
//     ctx.fillStyle = getNodeColor(node);
//     ctx.fill();
  
//     if (highlightNodes.has(node.id)) {
//       ctx.shadowColor = getNodeColor(node);
//       ctx.shadowBlur = 15;
//     }
  
//     // Draw label
//     ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';
//     ctx.fillStyle = highlightNodes.has(node.id) ? '#2c3e50' : '#34495e';
//     ctx.fillText(label, node.x, node.y + nodeR + fontSize);
    
//     // Draw additional info
//     if (node.docstring) {
//       ctx.font = `${fontSize * 0.8}px Inter`;
//       ctx.fillStyle = '#666';
//       ctx.fillText(node.docstring, node.x, node.y + nodeR + fontSize * 2.2);
//     }
  
//     if (node.type === 'method') {
//       if (node.returns) {
//         ctx.font = `${fontSize * 0.7}px Inter`;
//         ctx.fillStyle = '#999';
//         ctx.fillText(`returns: ${node.returns}`, node.x, node.y + nodeR + fontSize * 3.4);
//       }
//       if (node.is_abstract) {
//         ctx.font = `${fontSize * 0.7}px Inter`;
//         ctx.fillStyle = '#9C27B0';
//         ctx.fillText('abstract', node.x, node.y - nodeR - fontSize);
//       }
//     }
    
//     ctx.shadowColor = 'transparent';
//     ctx.shadowBlur = 0;
//   }, [highlightNodes]);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
//       <div className="max-w-full mx-auto">
//         <div className="grid grid-cols-12 gap-6">
//           {/* Left side - Controls and Selection */}
//           <div className="col-span-3 bg-white rounded-xl shadow-xl p-6">
//             <h2 className="text-xl font-semibold mb-4">Node Selection</h2>
//             <select 
//               className="w-full p-2 border rounded-md mb-4 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               value={selectedNode}
//               onChange={(e) => setSelectedNode(e.target.value)}
//             >
//               <option value="">Select a node</option>
//               {nodeOptions.map((option, index) => (
//                 <option key={index} value={option}>
//                   {option}
//                 </option>
//               ))}
//             </select>
//             <button 
//               className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors duration-200"
//               onClick={handleSubmit}
//             >
//               <Send className="h-4 w-4" />
//               Submit
//             </button>
//           </div>

//           {/* Right side - Graph */}
//           <div className="col-span-9 bg-white rounded-xl shadow-xl overflow-hidden">
//             <div className="p-6 border-b border-gray-200">
//               <div className="flex justify-between items-center">
//                 <h1 className="text-2xl font-bold text-gray-800">Knowledge Graph Visualization</h1>
//                 <div className="flex gap-3">
//                   <button
//                     onClick={handleZoomIn}
//                     className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors duration-200"
//                   >
//                     <ZoomIn className="h-5 w-5" />
//                   </button>
//                   <button
//                     onClick={handleZoomOut}
//                     className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors duration-200"
//                   >
//                     <ZoomOut className="h-5 w-5" />
//                   </button>
//                   <button
//                     onClick={() => window.location.reload()}
//                     className="p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors duration-200"
//                   >
//                     <RotateCw className="h-5 w-5" />
//                   </button>
//                   <button
//                     onClick={handleExport}
//                     className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
//                   >
//                     <Download className="h-5 w-5" />
//                     Export
//                   </button>
//                 </div>
//               </div>
//             </div>
//             <div className="p-6">
//   {error ? (
//     <div className="text-red-500 text-center py-8 bg-red-50 rounded-lg">{error}</div>
//   ) : !graphData ? (
//     <div className="text-gray-500 text-center py-8">
//       <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
//       Loading graph data...
//     </div>
//   ) : (
//     <div className="h-[600px] w-full bg-gray-50 rounded-lg overflow-hidden relative">
//       {graphData && graphData.nodes && graphData.nodes.length > 0 ? (<ForceGraph2D
//         graphData={graphData}
//         nodeLabel="name"
//         linkLabel="type"
//         nodeRelSize={6}
//         linkWidth={2}
//         linkDirectionalParticles={2}
//         linkDirectionalParticleSpeed={0.005}
//         nodeCanvasObject={paintNode}
//         nodeCanvasObjectMode={() => 'after'}
//         linkColor={link => highlightLinks.has(link.id) ? '#ff6b6b' : '#cbd5e1'}
//         onNodeHover={handleNodeHover}
//         zoom={zoomLevel}
//         width={2000}
//         height={2200}
//         d3AlphaDecay={0.01}
//         d3VelocityDecay={0.08}
//         cooldownTime={3000}
//       /> ) : (
//         <div className="text-gray-500 text-center py-8">
//           No graph data available to display
//         </div>
//       )}
      
     
//     </div>
//   )}
// </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default KnowledgeGraphPage;





import React, { useState, useEffect, useCallback } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { Download, ZoomIn, ZoomOut, RotateCw, Send } from 'lucide-react';

const KnowledgeGraphPage = () => {
  const [graphData, setGraphData] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState('');
  const [nodeOptions, setNodeOptions] = useState([]);

  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('knowledgeGraphData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        const processedData = transformDataForGraph(parsedData);
        setGraphData(processedData);
        
        // Process nodes for dropdown
        const options = new Set();
        parsedData.forEach(item => {
          if (item.node1?.name) {
            options.add(`${item.node1.name} (${getNodeType(item.node1)})`);
          }
          if (item.node2?.name) {
            options.add(`${item.node2.name} (${getNodeType(item.node2)})`);
          }
        });
        setNodeOptions(Array.from(options).sort());
      } else {
        setError('No graph data found');
      }
    } catch (err) {
      setError('Error loading graph data');
      console.error(err);
    }
  }, []);

  const getNodeType = (node) => {
    if (!node) return 'unknown';
    if (node.has_functions !== undefined || node.has_classes !== undefined) return 'file';
    if (node.total_methods !== undefined) return 'class';
    if (node.is_property !== undefined) return 'method';
    if (node.base_package !== undefined) return 'import';
    if (node.total_files !== undefined) return 'directory';
    return 'unknown';
  };

  const transformDataForGraph = (data) => {
    console.log('Starting transformation with data:', data);
    
    // Handle case where data is empty or invalid
    if (!Array.isArray(data) || data.length === 0) {
      console.log('Invalid data provided to transform');
      return { nodes: [], links: [] };
    }

    const nodesMap = new Map();
    const links = [];

    // Process each relationship object in the array
    data.forEach(relationshipData => {
      // Add target class as a node
      if (relationshipData.targetClass) {
        const targetNode = {
          id: relationshipData.targetClass.id,
          name: relationshipData.targetClass.name,
          docstring: relationshipData.targetClass.docstring,
          val: 20,
          type: 'class',
          is_abstract: relationshipData.targetClass.is_abstract,
          ...relationshipData.targetClass
        };
        nodesMap.set(targetNode.id, targetNode);

        // Add children nodes and links
        if (relationshipData.children && Array.isArray(relationshipData.children)) {
          relationshipData.children.forEach(child => {
            nodesMap.set(child.id, {
              id: child.id,
              name: child.name,
              docstring: child.docstring,
              val: 15,
              type: 'class',
              is_abstract: child.is_abstract,
              ...child
            });
            
            links.push({
              id: `${targetNode.id}-${child.id}`,
              source: targetNode.id,
              target: child.id,
              type: 'parent_of'
            });
          });
        }

        // Add parent nodes and links
        if (relationshipData.parents && Array.isArray(relationshipData.parents)) {
          relationshipData.parents.forEach(parent => {
            nodesMap.set(parent.id, {
              id: parent.id,
              name: parent.name,
              docstring: parent.docstring,
              val: 15,
              type: 'class',
              is_abstract: parent.is_abstract,
              ...parent
            });
            
            links.push({
              id: `${parent.id}-${targetNode.id}`,
              source: parent.id,
              target: targetNode.id,
              type: 'parent_of'
            });
          });
        }

        // Add methods as nodes
        if (relationshipData.methods && Array.isArray(relationshipData.methods)) {
          relationshipData.methods.forEach(method => {
            nodesMap.set(method.id, {
              id: method.id,
              name: method.name,
              val: 10,
              type: 'method',
              is_abstract: method.is_abstract,
              returns: method.returns,
              ...method
            });
            
            links.push({
              id: `${targetNode.id}-${method.id}`,
              source: targetNode.id,
              target: method.id,
              type: 'has_method'
            });
          });
        }
      }
    });

    const result = {
      nodes: Array.from(nodesMap.values()),
      links: links
    };
    
    console.log('Transformed result:', result);
    return result;
  };

  const handleSubmit = async () => {
    if (selectedNode) {
      try {
        const [nodeName, nodeType] = selectedNode.split(' (');
        const cleanedNodeType = nodeType?.replace(')', '');
        
        console.log('Fetching data for:', { nodeName, nodeType: cleanedNodeType });
        
        const response = await fetch(
          `http://localhost:5000/api/output/node-relationships?nodeName=${encodeURIComponent(nodeName)}&nodeType=${encodeURIComponent(cleanedNodeType)}`
        );
        
        if (!response.ok) {
          throw new Error(`Error fetching node relationships: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (data.success) {
          // Pass the relationships array directly to transform
          const relationships = data.data;
          const processedData = transformDataForGraph(relationships);
          console.log('Processed graph data:', processedData);
          
          if (!processedData || processedData.nodes.length === 0) {
            setError('No relationships found for this node');
          } else {
            setGraphData(processedData);
            setError(null);
          }
        } else {
          setError('Failed to fetch relationships: ' + data.message);
        }
      } catch (error) {
        setError('Error in handleSubmit: ' + error.message);
        console.error('Error in handleSubmit:', error);
      }
    }
  };
 

  const handleNodeHover = useCallback(node => {
    if (!node || !graphData) return;
    
    setHoverNode(node);
    setHighlightNodes(new Set([node.id]));
    
    const relatedLinks = new Set(
      graphData.links
        .filter(link => link.source.id === node.id || link.target.id === node.id)
        .map(link => link.id)
    );
    setHighlightLinks(relatedLinks);
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
    const fontSize = 18/globalScale;
    const nodeR = 1/globalScale;
  
    const getNodeColor = (node) => {
      switch (node.type) {
        case 'target': return '#4CAF50';
        case 'class': return '#2196F3';
        case 'method': return node.is_abstract ? '#9C27B0' : '#E91E63';
        case 'file': return '#FF5722';
        case 'import': return '#795548';
        default: return '#9E9E9E';
      }
    };
  
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();
  
    if (highlightNodes.has(node.id)) {
      ctx.shadowColor = getNodeColor(node);
      ctx.shadowBlur = 15;
    }
  
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = highlightNodes.has(node.id) ? '#2c3e50' : '#34495e';
    ctx.fillText(label, node.x, node.y + nodeR + fontSize);
    
    if (node.docstring) {
      ctx.font = `${fontSize * 0.8}px Inter`;
      ctx.fillStyle = '#666';
      ctx.fillText(node.docstring, node.x, node.y + nodeR + fontSize * 2.2);
    }
  
    if (node.type === 'method') {
      if (node.returns) {
        ctx.font = `${fontSize * 0.7}px Inter`;
        ctx.fillStyle = '#999';
        ctx.fillText(`returns: ${node.returns}`, node.x, node.y + nodeR + fontSize * 3.4);
      }
      if (node.is_abstract) {
        ctx.font = `${fontSize * 0.7}px Inter`;
        ctx.fillStyle = '#9C27B0';
        ctx.fillText('abstract', node.x, node.y - nodeR - fontSize);
      }
    }
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }, [highlightNodes]);

  // const paintNode = useCallback((node, ctx, globalScale) => {
  //   // Significantly increase base sizes for better visibility
  //   const label = node.name;
  //   const fontSize = Math.max(16/globalScale);  // Increased minimum font size
  //   const nodeR = Math.max(8/globalScale);  // Increased minimum node radius
    
  //   // Get node color based on type with increased opacity
  //   const getNodeColor = (node) => {
  //     const baseColors = {
  //       'target': '#4CAF50',
  //       'class': node.is_abstract ? '#9C27B0' : '#2196F3',
  //       'method': node.is_abstract ? '#9C27B0' : '#E91E63',
  //       'file': '#FF5722',
  //       'import': '#795548',
  //       'default': '#9E9E9E'
  //     };
  //     return baseColors[node.type] || baseColors.default;
  //   };
  
  //   // Draw node circle with larger stroke width
  //   ctx.beginPath();
  //   ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
  //   ctx.fillStyle = getNodeColor(node);
  //   ctx.fill();
  
  //   // Increase border width for better visibility
  //   ctx.strokeStyle = highlightNodes.has(node.id) ? '#fff' : 'rgba(0,0,0,0.3)';
  //   ctx.lineWidth = highlightNodes.has(node.id) ? 3 : 2;
  //   ctx.stroke();
  
  //   // Enhanced glow effect for highlighted nodes
  //   if (highlightNodes.has(node.id)) {
  //     ctx.shadowColor = getNodeColor(node);
  //     ctx.shadowBlur = 2;  // Increased blur
  //     ctx.stroke();
  //   }
  
  //   // Draw name label with increased spacing
  //   ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
  //   ctx.textAlign = 'center';
  //   ctx.textBaseline = 'middle';
  //   ctx.fillStyle = highlightNodes.has(node.id) ? '#000' : '#34495e';
    
  //   // Larger text background padding
  //   const textWidth = ctx.measureText(label).width;
  //   ctx.fillStyle = 'rgba(255,255,255,0.9)';  // Increased background opacity
  //   ctx.fillRect(
  //     node.x - textWidth/2 - 4,  // Increased padding
  //     node.y + nodeR + fontSize/2 - fontSize/2 - 4,
  //     textWidth + 8,  // Increased padding
  //     fontSize + 8    // Increased padding
  //   );
    
  //   // Draw text
  //   ctx.fillStyle = highlightNodes.has(node.id) ? '#000' : '#34495e';
  //   ctx.fillText(label, node.x, node.y + nodeR + fontSize/2);
  
  //   // Draw additional information if available with increased spacing
  //   if (node.docstring) {
  //     const smallerFont = fontSize * 0.75;  // Slightly larger relative size
  //     ctx.font = `${smallerFont}px Inter`;
  //     ctx.fillStyle = '#666';
      
  //     // Wrap docstring text with increased width
  //     const maxWidth = 250;  // Increased max width
  //     let words = node.docstring.split(' ');
  //     let line = '';
  //     let yOffset = node.y + nodeR + fontSize + smallerFont * 1.2;  // Increased spacing
      
  //     words.forEach(word => {
  //       const testLine = line + word + ' ';
  //       const metrics = ctx.measureText(testLine);
  //       if (metrics.width > maxWidth && line !== '') {
  //         // Add background with increased padding
  //         ctx.fillStyle = 'rgba(255,255,255,0.9)';
  //         ctx.fillRect(
  //           node.x - ctx.measureText(line).width/2 - 4,
  //           yOffset - smallerFont/2 - 4,
  //           ctx.measureText(line).width + 8,
  //           smallerFont + 8
  //         );
  //         // Draw text
  //         ctx.fillStyle = '#666';
  //         ctx.fillText(line, node.x, yOffset);
  //         line = word + ' ';
  //         yOffset += smallerFont * 1.4;  // Increased line spacing
  //       } else {
  //         line = testLine;
  //       }
  //     });
  //     if (line.length > 0) {
  //       // Add background to last line with increased padding
  //       ctx.fillStyle = 'rgba(255,255,255,0.9)';
  //       ctx.fillRect(
  //         node.x - ctx.measureText(line).width/2 - 4,
  //         yOffset - smallerFont/2 - 4,
  //         ctx.measureText(line).width + 8,
  //         smallerFont + 8
  //       );
  //       // Draw text
  //       ctx.fillStyle = '#666';
  //       ctx.fillText(line, node.x, yOffset);
  //     }
  //   }
  
  //   // Draw method-specific information with increased spacing
  //   if (node.type === 'method') {
  //     const methodFont = fontSize * 0.75;  // Slightly larger relative size
  //     ctx.font = `${methodFont}px Inter`;
      
  //     if (node.returns) {
  //       const returnText = `returns: ${node.returns}`;
  //       // Add background with increased padding
  //       ctx.fillStyle = 'rgba(255,255,255,0.9)';
  //       const returnMetrics = ctx.measureText(returnText);
  //       ctx.fillRect(
  //         node.x - returnMetrics.width/2 - 4,
  //         node.y - nodeR - methodFont * 2.2 - 4,  // Increased spacing
  //         returnMetrics.width + 8,
  //         methodFont + 8
  //       );
  //       // Draw text
  //       ctx.fillStyle = '#666';
  //       ctx.fillText(returnText, node.x, node.y - nodeR - methodFont * 2);
  //     }
      
  //     if (node.is_abstract) {
  //       const abstractText = 'abstract';
  //       // Add background with increased padding
  //       ctx.fillStyle = 'rgba(255,255,255,0.9)';
  //       const abstractMetrics = ctx.measureText(abstractText);
  //       ctx.fillRect(
  //         node.x - abstractMetrics.width/2 - 4,
  //         node.y - nodeR - methodFont * 3.7 - 4,  // Increased spacing
  //         abstractMetrics.width + 8,
  //         methodFont + 8
  //       );
  //       // Draw text
  //       ctx.fillStyle = '#9C27B0';
  //       ctx.fillText(abstractText, node.x, node.y - nodeR - methodFont * 3.5);
  //     }
  //   }
  
  //   // Reset shadow
  //   ctx.shadowColor = 'transparent';
  //   ctx.shadowBlur = 0;
  // }, [highlightNodes]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-full mx-auto">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 bg-white rounded-xl shadow-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Node Selection</h2>
            <select 
              className="w-full p-2 border rounded-md mb-4 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedNode}
              onChange={(e) => setSelectedNode(e.target.value)}
            >
              <option value="">Select a node</option>
              {nodeOptions.map((option, index) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
            <button 
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors duration-200"
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4" />
              Submit
            </button>
          </div>

          <div className="col-span-9 bg-white rounded-xl shadow-xl overflow-hidden">
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
                <div className="h-[600px] w-full bg-gray-50 rounded-lg overflow-hidden relative">
                  {graphData && graphData.nodes && graphData.nodes.length > 0 ? (
                  
                  <ForceGraph2D
                                        graphData={graphData}
                                        nodeLabel="name"
                                        linkLabel="type"
                                        nodeRelSize={2}
                                        linkWidth={5}
                                        linkHeight={30}
                                        linkDirectionalParticles={2}
                                        linkDirectionalParticleSpeed={0.005}
                                        nodeCanvasObject={paintNode}
                                        nodeCanvasObjectMode={() => 'after'}
                                        linkColor={link => highlightLinks.has(link.id) ? '#ff6b6b' : '#cbd5e1'}
                                        onNodeHover={handleNodeHover}
                                        zoom={zoomLevel}
                                        width={800}
                                        height={600}
                                        d3AlphaDecay={0.01}
                                        d3VelocityDecay={0.08}
                                        cooldownTime={3000}
                                      />
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      No graph data available to display
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraphPage;