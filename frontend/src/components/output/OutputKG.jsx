// import React, { useState, useEffect, useCallback } from 'react';
// import { ForceGraph2D } from 'react-force-graph';
// import { Download, ZoomIn, ZoomOut, RotateCw, Send } from 'lucide-react';

// const OutputKG = () => {
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
//           if (item.node1?.name) {
//             options.add(`${item.node1.name} (${getNodeType(item.node1)})`);
//           }
//           if (item.node2?.name) {
//             options.add(`${item.node2.name} (${getNodeType(item.node2)})`);
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
//     if (!node) return 'unknown';
//     if (node.has_functions !== undefined || node.has_classes !== undefined) return 'file';
//     if (node.total_methods !== undefined) return 'class';
//     if (node.is_property !== undefined) return 'method';
//     if (node.base_package !== undefined) return 'import';
//     if (node.total_files !== undefined) return 'directory';
//     return 'unknown';
//   };

//   // const transformDataForGraph = (data) => {
//   //   console.log('Starting transformation with data:', data);
    
//   //   // Handle case where data is empty or invalid
//   //   if (!Array.isArray(data) || data.length === 0) {
//   //     console.log('Invalid data provided to transform');
//   //     return { nodes: [], links: [] };
//   //   }

//   //   const nodesMap = new Map();
//   //   const links = [];

//   //   // Process each relationship object in the array
//   //   data.forEach(relationshipData => {
//   //     // Add target class as a node
//   //     if (relationshipData.targetClass) {
//   //       const targetNode = {
//   //         id: relationshipData.targetClass.id,
//   //         name: relationshipData.targetClass.name,
//   //         docstring: relationshipData.targetClass.docstring,
//   //         val: 20,
//   //         type: 'class',
//   //         is_abstract: relationshipData.targetClass.is_abstract,
//   //         ...relationshipData.targetClass
//   //       };
//   //       nodesMap.set(targetNode.id, targetNode);

//   //       // Add children nodes and links
//   //       if (relationshipData.children && Array.isArray(relationshipData.children)) {
//   //         relationshipData.children.forEach(child => {
//   //           nodesMap.set(child.id, {
//   //             id: child.id,
//   //             name: child.name,
//   //             docstring: child.docstring,
//   //             val: 15,
//   //             type: 'class',
//   //             is_abstract: child.is_abstract,
//   //             ...child
//   //           });
            
//   //           links.push({
//   //             id: `${targetNode.id}-${child.id}`,
//   //             source: targetNode.id,
//   //             target: child.id,
//   //             type: 'parent_of'
//   //           });
//   //         });
//   //       }

//   //       // Add parent nodes and links
//   //       if (relationshipData.parents && Array.isArray(relationshipData.parents)) {
//   //         relationshipData.parents.forEach(parent => {
//   //           nodesMap.set(parent.id, {
//   //             id: parent.id,
//   //             name: parent.name,
//   //             docstring: parent.docstring,
//   //             val: 15,
//   //             type: 'class',
//   //             is_abstract: parent.is_abstract,
//   //             ...parent
//   //           });
            
//   //           links.push({
//   //             id: `${parent.id}-${targetNode.id}`,
//   //             source: parent.id,
//   //             target: targetNode.id,
//   //             type: 'parent_of'
//   //           });
//   //         });
//   //       }

//   //       // Add methods as nodes
//   //       if (relationshipData.methods && Array.isArray(relationshipData.methods)) {
//   //         relationshipData.methods.forEach(method => {
//   //           nodesMap.set(method.id, {
//   //             id: method.id,
//   //             name: method.name,
//   //             val: 10,
//   //             type: 'method',
//   //             is_abstract: method.is_abstract,
//   //             returns: method.returns,
//   //             ...method
//   //           });
            
//   //           links.push({
//   //             id: `${targetNode.id}-${method.id}`,
//   //             source: targetNode.id,
//   //             target: method.id,
//   //             type: 'has_method'
//   //           });
//   //         });
//   //       }
//   //     }
//   //   });

//   //   const result = {
//   //     nodes: Array.from(nodesMap.values()),
//   //     links: links
//   //   };
    
//   //   console.log('Transformed result:', result);
//   //   return result;
//   // };
//   const transformDataForGraph = (data) => {
//     console.log('Starting transformation with data:', data);
    
//     if (!Array.isArray(data) || data.length === 0) {
//       console.log('Invalid data provided to transform');
//       return { nodes: [], links: [] };
//     }
  
//     const nodesMap = new Map();
//     const links = new Set();
//     const processedLinks = new Set(); // To prevent circular dependencies
  
//     // Helper function to add a node to the map with relationship type
//     const addNode = (node, nodeType, relationshipType = null) => {
//       if (!node || !node.id) return;
      
//       // If node already exists, update its properties if needed
//       if (nodesMap.has(node.id)) {
//         const existingNode = nodesMap.get(node.id);
//         if (relationshipType) {
//           if (!existingNode.relationshipTypes) {
//             existingNode.relationshipTypes = new Set([relationshipType]);
//           } else {
//             existingNode.relationshipTypes.add(relationshipType);
//           }
//         }
//         return;
//       }
  
//       // Create new node
//       nodesMap.set(node.id, {
//         ...node,
//         val: nodeType === 'method' ? 10 : 20,
//         type: nodeType,
//         relationshipTypes: relationshipType ? new Set([relationshipType]) : new Set()
//       });
//     };
  
//     // Helper function to add a link with specific relationship type
//     const addLink = (sourceId, targetId, type, subType = null) => {
//       if (!sourceId || !targetId) return;
      
//       const linkId = `${sourceId}-${targetId}-${type}${subType ? '-' + subType : ''}`;
//       const reverseLinkId = `${targetId}-${sourceId}-${type}${subType ? '-' + subType : ''}`;
      
//       // Check for circular dependencies
//       if (!processedLinks.has(linkId) && !processedLinks.has(reverseLinkId)) {
//         processedLinks.add(linkId);
//         links.add({
//           id: linkId,
//           source: sourceId,
//           target: targetId,
//           type: type,
//           subType: subType
//         });
//       }
//     };
  
//     // Process each relationship object in the data
//     data.forEach(item => {
//       const { targetClass } = item;
      
//       if (!targetClass) return;
      
//       // Add target class node
//       addNode(targetClass, 'target');
  
//       // Process each key in the response
//       Object.entries(item).forEach(([key, value]) => {
//         if (!Array.isArray(value)) return;
  
//         switch (key) {
//           case 'methods':
//             value.forEach(method => {
//               addNode(method, 'method', 'direct');
//               addLink(targetClass.id, method.id, 'has_method', 'direct');
//             });
//             break;
  
         
  
//           case 'grandchildMethods':
//             value.forEach(method => {
//               addNode(method, 'method', 'method');
//               addLink(targetClass.id, method.id, 'has_method', 'grandchild');
//             });
//             break;
  
//           case 'parents':
//             value.forEach(parent => {
//               addNode(parent, 'class', 'parent');
//               addLink(parent.id, targetClass.id, 'parent_of');
//             });
//             break;
  
//           case 'children':
//             value.forEach(child => {
//               addNode(child, 'class', 'child');
//               addLink(targetClass.id, child.id, 'parent_of');
//             });
//             break;
  
//           case 'grandchildren':
//             value.forEach(grandchild => {
//               addNode(grandchild, 'class', 'grandchild');
//               addLink(targetClass.id, grandchild.id, 'ancestor_of');
//             });
//             break;
  
//           case 'descendants':
//             value.forEach(descendant => {
//               addNode(descendant, 'class', 'descendant');
//               addLink(targetClass.id, descendant.id, 'ancestor_of');
//             });
//             break;
  
//           case 'siblings':
//             value.forEach(sibling => {
//               addNode(sibling, 'class', 'sibling');
//               if (item.parents && item.parents.length > 0) {
//                 item.parents.forEach(parent => {
//                   addLink(parent.id, sibling.id, 'parent_of');
//                 });
//               }
//             });
//             break;
  
//           case 'attributes':
//             value.forEach(attr => {
//               addNode(attr, 'attribute');
//               addLink(targetClass.id, attr.id, 'has_attribute');
//             });
//             break;
//         }
//       });
//     });
  
//     // Convert nodes map to array and convert Sets to Arrays
//     const nodes = Array.from(nodesMap.values()).map(node => ({
//       ...node,
//       relationshipTypes: Array.from(node.relationshipTypes)
//     }));
  
//     return {
//       nodes,
//       links: Array.from(links)
//     };
//   };
  
//   const paintNode = (node, ctx, globalScale) => {
//     const label = node.name;
//     const fontSize = 18/globalScale;
//     const nodeR = 1/globalScale;
  
//     const getNodeColor = (node) => {
//       // First check the main type
//       switch (node.type) {
//         case 'target':
//           return '#4CAF50';
//         case 'class':
//           // Enhanced class relationship colors
//           if (node.relationshipTypes?.includes('parent')) return '#2196F3';
//           if (node.relationshipTypes?.includes('child')) return '#03A9F4';
//           if (node.relationshipTypes?.includes('grandchild')) return '#00BCD4';
//           if (node.relationshipTypes?.includes('descendant')) return '#26C6DA';
//           if (node.relationshipTypes?.includes('sibling')) return '#80DEEA';
//           return '#1976D2';
//         case 'method':
//           // Enhanced method relationship colors
//           if (node.relationshipTypes?.includes('parent')) return '#9C27B0';
//           if (node.relationshipTypes?.includes('child')) return '#E91E63';
//           if (node.relationshipTypes?.includes('grandchild')) return '#FF4081';
//           if (node.relationshipTypes?.includes('descendant')) return '#F50057';
//           if (node.relationshipTypes?.includes('sibling')) return '#FF80AB';
//           return node.is_abstract ? '#673AB7' : '#3F51B5';
//         case 'attribute':
//           return '#FF5722';
//         default:
//           return '#9E9E9E';
//       }
//     };
  
//     // Draw node
//     ctx.beginPath();
//     ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
//     ctx.fillStyle = getNodeColor(node);
//     ctx.fill();
  
//     // Add highlight effect for selected nodes
//     if (highlightNodes?.has(node.id)) {
//       ctx.shadowColor = getNodeColor(node);
//       ctx.shadowBlur = 15;
//     }
  
//     // Draw label
//     ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';
//     ctx.fillStyle = highlightNodes?.has(node.id) ? '#2c3e50' : '#34495e';
//     ctx.fillText(label, node.x, node.y + nodeR + fontSize);
  
//     // Draw relationship type if exists
//     if (node.relationshipTypes && node.relationshipTypes.length > 0) {
//       ctx.font = `${fontSize * 0.7}px Inter`;
//       ctx.fillStyle = '#666';
//       ctx.fillText(node.relationshipTypes[0], node.x, node.y + nodeR + fontSize * 2.2);
//     }
  
//     // Draw additional method information
//     if (node.type === 'method') {
//       if (node.returns) {
//         ctx.font = `${fontSize * 0.7}px Inter`;
//         ctx.fillStyle = '#999';
//         ctx.fillText(`returns: ${node.returns}`, node.x, node.y + nodeR + fontSize * 3.4);
//       }
//       if (node.is_abstract) {
//         ctx.font = `${fontSize * 0.7}px Inter`;
//         ctx.fillStyle = '#673AB7';
//         ctx.fillText('abstract', node.x, node.y - nodeR - fontSize);
//       }
//     }
  
//     ctx.shadowColor = 'transparent';
//     ctx.shadowBlur = 0;
//   };
  
//   const handleSubmit = async () => {
//     if (selectedNode) {
//       try {
//         const [nodeName, nodeType] = selectedNode.split(' (');
//         const cleanedNodeType = nodeType?.replace(')', '');
        
//         console.log('Fetching data for:', { nodeName, nodeType: cleanedNodeType });
        
//         const response = await fetch(
//           `http://localhost:5000/api/output/node-relationships?nodeName=${encodeURIComponent(nodeName)}&nodeType=${encodeURIComponent(cleanedNodeType)}`
//         );
        
//         if (!response.ok) {
//           throw new Error(`Error fetching node relationships: ${response.statusText}`);
//         }
        
//         const data = await response.json();
//         console.log('API Response:', data);
        
//         if (data.success) {
//           // Pass the relationships array directly to transform
//           const relationships = data.data;
//           const processedData = transformDataForGraph(relationships);
//           console.log('Processed graph data:', processedData);
          
//           if (!processedData || processedData.nodes.length === 0) {
//             setError('No relationships found for this node');
//           } else {
//             setGraphData(processedData);
//             setError(null);
//           }
//         } else {
//           setError('Failed to fetch relationships: ' + data.message);
//         }
//       } catch (error) {
//         setError('Error in handleSubmit: ' + error.message);
//         console.error('Error in handleSubmit:', error);
//       }
//     }
//   };
 

//   const handleNodeHover = useCallback(node => {
//     if (!node || !graphData) return;
    
//     setHoverNode(node);
//     setHighlightNodes(new Set([node.id]));
    
//     const relatedLinks = new Set(
//       graphData.links
//         .filter(link => link.source.id === node.id || link.target.id === node.id)
//         .map(link => link.id)
//     );
//     setHighlightLinks(relatedLinks);
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

//   // const paintNode = useCallback((node, ctx, globalScale) => {
//   //   const label = node.name;
//   //   const fontSize = 18/globalScale;
//   //   const nodeR = 1/globalScale;
  
//   //   const getNodeColor = (node) => {
//   //     switch (node.type) {
//   //       case 'target': return '#4CAF50';
//   //       case 'class': return '#2196F3';
//   //       case 'method': return node.is_abstract ? '#9C27B0' : '#E91E63';
//   //       case 'file': return '#FF5722';
//   //       case 'import': return '#795548';
//   //       default: return '#9E9E9E';
//   //     }
//   //   };
  
//   //   ctx.beginPath();
//   //   ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
//   //   ctx.fillStyle = getNodeColor(node);
//   //   ctx.fill();
  
//   //   if (highlightNodes.has(node.id)) {
//   //     ctx.shadowColor = getNodeColor(node);
//   //     ctx.shadowBlur = 15;
//   //   }
  
//   //   ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
//   //   ctx.textAlign = 'center';
//   //   ctx.textBaseline = 'middle';
//   //   ctx.fillStyle = highlightNodes.has(node.id) ? '#2c3e50' : '#34495e';
//   //   ctx.fillText(label, node.x, node.y + nodeR + fontSize);
    
//   //   if (node.docstring) {
//   //     ctx.font = `${fontSize * 0.8}px Inter`;
//   //     ctx.fillStyle = '#666';
//   //     ctx.fillText(node.docstring, node.x, node.y + nodeR + fontSize * 2.2);
//   //   }
  
//   //   if (node.type === 'method') {
//   //     if (node.returns) {
//   //       ctx.font = `${fontSize * 0.7}px Inter`;
//   //       ctx.fillStyle = '#999';
//   //       ctx.fillText(`returns: ${node.returns}`, node.x, node.y + nodeR + fontSize * 3.4);
//   //     }
//   //     if (node.is_abstract) {
//   //       ctx.font = `${fontSize * 0.7}px Inter`;
//   //       ctx.fillStyle = '#9C27B0';
//   //       ctx.fillText('abstract', node.x, node.y - nodeR - fontSize);
//   //     }
//   //   }
    
//   //   ctx.shadowColor = 'transparent';
//   //   ctx.shadowBlur = 0;
//   // }, [highlightNodes]);


//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
//       <div className="max-w-full mx-auto">
//         <div className="grid grid-cols-12 gap-6">
//           <div className="col-span-3 bg-white rounded-xl shadow-xl p-6">
//             <h2 className="text-xl font-semibold mb-4">Node Selection</h2>
//             <select 
//               className="w-full p-2 border rounded-md mb-4 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//               value={selectedNode}
//               onChange={(e) => setSelectedNode(e.target.value)}
//             >
//               <option value="">Select a node</option>
//               {nodeOptions.map((option, index) => (
//                 <option key={index} value={option}>{option}</option>
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
//               {error ? (
//                 <div className="text-red-500 text-center py-8 bg-red-50 rounded-lg">{error}</div>
//               ) : !graphData ? (
//                 <div className="text-gray-500 text-center py-8">
//                   <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
//                   Loading graph data...
//                 </div>
//               ) : (
//                 <div className="h-[600px] w-full bg-gray-50 rounded-lg overflow-hidden relative">
//                   {graphData && graphData.nodes && graphData.nodes.length > 0 ? (
                  
//                   <ForceGraph2D
//                                         graphData={graphData}
//                                         nodeLabel="name"
//                                         linkLabel="type"
//                                         nodeRelSize={2}
//                                         linkWidth={5}
//                                         linkHeight={30}
//                                         linkDirectionalParticles={2}
//                                         linkDirectionalParticleSpeed={0.005}
//                                         nodeCanvasObject={paintNode}
//                                         nodeCanvasObjectMode={() => 'after'}
//                                         linkColor={link => highlightLinks.has(link.id) ? '#ff6b6b' : '#cbd5e1'}
//                                         onNodeHover={handleNodeHover}
//                                         zoom={zoomLevel}
//                                         width={800}
//                                         height={600}
//                                         d3AlphaDecay={0.01}
//                                         d3VelocityDecay={0.08}
//                                         cooldownTime={3000}
//                                       />
//                   ) : (
//                     <div className="text-gray-500 text-center py-8">
//                       No graph data available to display
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OutputKG;

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

  // const transformDataForGraph = (data) => {
  //   console.log('Starting transformation with data:', data);
    
  //   // Handle case where data is empty or invalid
  //   if (!Array.isArray(data) || data.length === 0) {
  //     console.log('Invalid data provided to transform');
  //     return { nodes: [], links: [] };
  //   }

  //   const nodesMap = new Map();
  //   const links = [];

  //   // Process each relationship object in the array
  //   data.forEach(relationshipData => {
  //     // Add target class as a node
  //     if (relationshipData.targetClass) {
  //       const targetNode = {
  //         id: relationshipData.targetClass.id,
  //         name: relationshipData.targetClass.name,
  //         docstring: relationshipData.targetClass.docstring,
  //         val: 20,
  //         type: 'class',
  //         is_abstract: relationshipData.targetClass.is_abstract,
  //         ...relationshipData.targetClass
  //       };
  //       nodesMap.set(targetNode.id, targetNode);

  //       // Add children nodes and links
  //       if (relationshipData.children && Array.isArray(relationshipData.children)) {
  //         relationshipData.children.forEach(child => {
  //           nodesMap.set(child.id, {
  //             id: child.id,
  //             name: child.name,
  //             docstring: child.docstring,
  //             val: 15,
  //             type: 'class',
  //             is_abstract: child.is_abstract,
  //             ...child
  //           });
            
  //           links.push({
  //             id: `${targetNode.id}-${child.id}`,
  //             source: targetNode.id,
  //             target: child.id,
  //             type: 'parent_of'
  //           });
  //         });
  //       }

  //       // Add parent nodes and links
  //       if (relationshipData.parents && Array.isArray(relationshipData.parents)) {
  //         relationshipData.parents.forEach(parent => {
  //           nodesMap.set(parent.id, {
  //             id: parent.id,
  //             name: parent.name,
  //             docstring: parent.docstring,
  //             val: 15,
  //             type: 'class',
  //             is_abstract: parent.is_abstract,
  //             ...parent
  //           });
            
  //           links.push({
  //             id: `${parent.id}-${targetNode.id}`,
  //             source: parent.id,
  //             target: targetNode.id,
  //             type: 'parent_of'
  //           });
  //         });
  //       }

  //       // Add methods as nodes
  //       if (relationshipData.methods && Array.isArray(relationshipData.methods)) {
  //         relationshipData.methods.forEach(method => {
  //           nodesMap.set(method.id, {
  //             id: method.id,
  //             name: method.name,
  //             val: 10,
  //             type: 'method',
  //             is_abstract: method.is_abstract,
  //             returns: method.returns,
  //             ...method
  //           });
            
  //           links.push({
  //             id: `${targetNode.id}-${method.id}`,
  //             source: targetNode.id,
  //             target: method.id,
  //             type: 'has_method'
  //           });
  //         });
  //       }
  //     }
  //   });

  //   const result = {
  //     nodes: Array.from(nodesMap.values()),
  //     links: links
  //   };
    
  //   console.log('Transformed result:', result);
  //   return result;
  // };
  const transformDataForGraph = (data) => {
    console.log('Starting transformation with data:', data);
    
    if (!Array.isArray(data) || data.length === 0) {
      console.log('Invalid data provided to transform');
      return { nodes: [], links: [] };
    }
  
    const nodesMap = new Map();
    const links = new Set();
    const processedLinks = new Set(); // To prevent circular dependencies
  
    // Helper function to add a node to the map with relationship type
    const addNode = (node, nodeType, relationshipType = null) => {
      if (!node || !node.id) return;
      
      // If node already exists, update its properties if needed
      if (nodesMap.has(node.id)) {
        const existingNode = nodesMap.get(node.id);
        if (relationshipType) {
          if (!existingNode.relationshipTypes) {
            existingNode.relationshipTypes = new Set([relationshipType]);
          } else {
            existingNode.relationshipTypes.add(relationshipType);
          }
        }
        return;
      }
  
      // Create new node
      nodesMap.set(node.id, {
        ...node,
        val: nodeType === 'method' ? 10 : 20,
        type: nodeType,
        relationshipTypes: relationshipType ? new Set([relationshipType]) : new Set()
      });
    };
  
    // Helper function to add a link with specific relationship type
    const addLink = (sourceId, targetId, type, subType = null) => {
      if (!sourceId || !targetId) return;
      
      const linkId = `${sourceId}-${targetId}-${type}${subType ? '-' + subType : ''}`;
      const reverseLinkId = `${targetId}-${sourceId}-${type}${subType ? '-' + subType : ''}`;
      
      // Check for circular dependencies
      if (!processedLinks.has(linkId) && !processedLinks.has(reverseLinkId)) {
        processedLinks.add(linkId);
        links.add({
          id: linkId,
          source: sourceId,
          target: targetId,
          type: type,
          subType: subType
        });
      }
    };
  
    // Process each relationship object in the data
    data.forEach(item => {
      const { targetClass } = item;
      
      if (!targetClass) return;
      
      // Add target class node
      addNode(targetClass, 'target');
  
      // Process each key in the response
      Object.entries(item).forEach(([key, value]) => {
        if (!Array.isArray(value)) return;
  
        switch (key) {
          case 'methods':
            value.forEach(method => {
              addNode(method, 'method', 'direct');
              addLink(targetClass.id, method.id, 'has_method', 'direct');
            });
            break;
  
         
  
          case 'grandchildMethods':
            value.forEach(method => {
              addNode(method, 'method', 'method');
              addLink(targetClass.id, method.id, 'has_method', 'grandchild');
            });
            break;
  
          case 'parents':
            value.forEach(parent => {
              addNode(parent, 'class', 'parent');
              addLink(parent.id, targetClass.id, 'parent_of');
            });
            break;
  
          case 'children':
            value.forEach(child => {
              addNode(child, 'class', 'child');
              addLink(targetClass.id, child.id, 'parent_of');
            });
            break;
  
          case 'grandchildren':
            value.forEach(grandchild => {
              addNode(grandchild, 'class', 'grandchild');
              addLink(targetClass.id, grandchild.id, 'ancestor_of');
            });
            break;
  
          case 'descendants':
            value.forEach(descendant => {
              addNode(descendant, 'class', 'descendant');
              addLink(targetClass.id, descendant.id, 'ancestor_of');
            });
            break;
  
          case 'siblings':
            value.forEach(sibling => {
              addNode(sibling, 'class', 'sibling');
              if (item.parents && item.parents.length > 0) {
                item.parents.forEach(parent => {
                  addLink(parent.id, sibling.id, 'parent_of');
                });
              }
            });
            break;
  
          case 'attributes':
            value.forEach(attr => {
              addNode(attr, 'attribute');
              addLink(targetClass.id, attr.id, 'has_attribute');
            });
            break;
        }
      });
    });
  
    // Convert nodes map to array and convert Sets to Arrays
    const nodes = Array.from(nodesMap.values()).map(node => ({
      ...node,
      relationshipTypes: Array.from(node.relationshipTypes)
    }));
  
    return {
      nodes,
      links: Array.from(links)
    };
  };
  
  const paintNode = (node, ctx, globalScale) => {
    const label = node.name;
    const fontSize = 18/globalScale;
    const nodeR = 1/globalScale;
  
    const getNodeColor = (node) => {
      // First check the main type
      switch (node.type) {
        case 'target':
          return '#4CAF50';
        case 'class':
          // Enhanced class relationship colors
          if (node.relationshipTypes?.includes('parent')) return '#2196F3';
          if (node.relationshipTypes?.includes('child')) return '#03A9F4';
          if (node.relationshipTypes?.includes('grandchild')) return '#00BCD4';
          if (node.relationshipTypes?.includes('descendant')) return '#26C6DA';
          if (node.relationshipTypes?.includes('sibling')) return '#80DEEA';
          return '#1976D2';
        case 'method':
          // Enhanced method relationship colors
          if (node.relationshipTypes?.includes('parent')) return '#9C27B0';
          if (node.relationshipTypes?.includes('child')) return '#E91E63';
          if (node.relationshipTypes?.includes('grandchild')) return '#FF4081';
          if (node.relationshipTypes?.includes('descendant')) return '#F50057';
          if (node.relationshipTypes?.includes('sibling')) return '#FF80AB';
          return node.is_abstract ? '#673AB7' : '#3F51B5';
        case 'attribute':
          return '#FF5722';
        default:
          return '#9E9E9E';
      }
    };
  
    // Draw node
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();
  
    // Add highlight effect for selected nodes
    if (highlightNodes?.has(node.id)) {
      ctx.shadowColor = getNodeColor(node);
      ctx.shadowBlur = 15;
    }
  
    // Draw label
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = highlightNodes?.has(node.id) ? '#2c3e50' : '#34495e';
    ctx.fillText(label, node.x, node.y + nodeR + fontSize);
  
    // Draw relationship type if exists
    if (node.relationshipTypes && node.relationshipTypes.length > 0) {
      ctx.font = `${fontSize * 0.7}px Inter`;
      ctx.fillStyle = '#666';
      ctx.fillText(node.relationshipTypes[0], node.x, node.y + nodeR + fontSize * 2.2);
    }
  
    // Draw additional method information
    if (node.type === 'method') {
      if (node.returns) {
        ctx.font = `${fontSize * 0.7}px Inter`;
        ctx.fillStyle = '#999';
        ctx.fillText(`returns: ${node.returns}`, node.x, node.y + nodeR + fontSize * 3.4);
      }
      if (node.is_abstract) {
        ctx.font = `${fontSize * 0.7}px Inter`;
        ctx.fillStyle = '#673AB7';
        ctx.fillText('abstract', node.x, node.y - nodeR - fontSize);
      }
    }
  
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
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

  // const paintNode = useCallback((node, ctx, globalScale) => {
  //   const label = node.name;
  //   const fontSize = 18/globalScale;
  //   const nodeR = 1/globalScale;
  
  //   const getNodeColor = (node) => {
  //     switch (node.type) {
  //       case 'target': return '#4CAF50';
  //       case 'class': return '#2196F3';
  //       case 'method': return node.is_abstract ? '#9C27B0' : '#E91E63';
  //       case 'file': return '#FF5722';
  //       case 'import': return '#795548';
  //       default: return '#9E9E9E';
  //     }
  //   };
  
  //   ctx.beginPath();
  //   ctx.arc(node.x, node.y, nodeR, 0, 2 * Math.PI);
  //   ctx.fillStyle = getNodeColor(node);
  //   ctx.fill();
  
  //   if (highlightNodes.has(node.id)) {
  //     ctx.shadowColor = getNodeColor(node);
  //     ctx.shadowBlur = 15;
  //   }
  
  //   ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
  //   ctx.textAlign = 'center';
  //   ctx.textBaseline = 'middle';
  //   ctx.fillStyle = highlightNodes.has(node.id) ? '#2c3e50' : '#34495e';
  //   ctx.fillText(label, node.x, node.y + nodeR + fontSize);
    
  //   if (node.docstring) {
  //     ctx.font = `${fontSize * 0.8}px Inter`;
  //     ctx.fillStyle = '#666';
  //     ctx.fillText(node.docstring, node.x, node.y + nodeR + fontSize * 2.2);
  //   }
  
  //   if (node.type === 'method') {
  //     if (node.returns) {
  //       ctx.font = `${fontSize * 0.7}px Inter`;
  //       ctx.fillStyle = '#999';
  //       ctx.fillText(`returns: ${node.returns}`, node.x, node.y + nodeR + fontSize * 3.4);
  //     }
  //     if (node.is_abstract) {
  //       ctx.font = `${fontSize * 0.7}px Inter`;
  //       ctx.fillStyle = '#9C27B0';
  //       ctx.fillText('abstract', node.x, node.y - nodeR - fontSize);
  //     }
  //   }
    
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