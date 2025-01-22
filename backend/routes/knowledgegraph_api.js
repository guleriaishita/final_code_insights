// const express = require('express');
// const router = express.Router();

// // Helper function to clean Neo4j records
// const cleanNeo4jRecord = (record) => {
//   const clean = {};
//   for (const [key, value] of record.entries()) {
//     if (value && value.properties) {
//       clean[key] = {
//         ...value.properties,
//         id: value.identity.toString()
//       };
//     } else if (Array.isArray(value)) {
//       clean[key] = value.map(item => ({
//         ...item.properties,
//         id: item.identity.toString()
//       }));
//     } else if (value && value.type) {
//       clean[key] = value.type;
//     } else {
//       clean[key] = value;
//     }
//   }
//   return clean;
// };

// // Get relationships based on node type
// router.get('/node-relationships', async (req, res) => {
//   try {
//     const { nodeName, nodeType } = req.query;

//     if (!nodeName || !nodeType) {
//       return res.status(400).json({
//         success: false,
//         message: 'nodeName and nodeType are required parameters'
//       });
//     }

//     let query;
//     switch (nodeType.toLowerCase()) {
//       case 'class':
//         // Query for class relationships including inheritance, methods, attributes
//         query = `
//           MATCH (c:Class {name: $nodeName})
          
//           // Get parent classes and inheritance relationships
//           OPTIONAL MATCH (c)-[inh:INHERITS_FROM]->(parent:Class)
          
//           // Get child classes
//           OPTIONAL MATCH (c)<-[child_rel:INHERITS_FROM]-(child:Class)
          
//           // Get sibling classes (classes sharing the same parent)
//           OPTIONAL MATCH (c)-[:INHERITS_FROM]->(parent)<-[:INHERITS_FROM]-(sibling:Class)
//           WHERE sibling.name <> c.name
          
//           // Get methods
//           OPTIONAL MATCH (c)-[hm:HAS_METHOD]->(method:Method)
          
//           // Get overridden methods
//           OPTIONAL MATCH (c)-[ov:OVERRIDES]->(parent_method:Method)
          
//           // Get attributes
//           OPTIONAL MATCH (c)-[ha:HAS_ATTRIBUTE]->(attr:ClassAttribute)
          
//           RETURN c as targetClass,
//                  collect(DISTINCT parent) as parents,
//                  collect(DISTINCT child) as children,
//                  collect(DISTINCT sibling) as siblings,
//                  collect(DISTINCT method) as methods,
//                  collect(DISTINCT parent_method) as overriddenMethods,
//                  collect(DISTINCT attr) as attributes
//         `;
//         break;

//       case 'file':
//         // Query for file relationships including classes, imports, etc.
//         query = `
//           MATCH (f:File {name: $nodeName})
          
//           // Get classes defined in the file
//           OPTIONAL MATCH (f)-[dc:DEFINES_CLASS]->(class:Class)
          
//           // Get imported files
//           OPTIONAL MATCH (f)-[imp:IMPORTS]->(imported:File)
          
//           // Get files that import this file
//           OPTIONAL MATCH (f)<-[imp_by:IMPORTS]-(importing:File)
          
//           // Get methods defined in the file
//           OPTIONAL MATCH (f)-[dm:DEFINES_METHOD]->(method:Method)
          
//           RETURN f as targetFile,
//                  collect(DISTINCT class) as definedClasses,
//                  collect(DISTINCT imported) as importedFiles,
//                  collect(DISTINCT importing) as importedByFiles,
//                  collect(DISTINCT method) as definedMethods
//         `;
//         break;

//       case 'method':
//         // Query for method relationships including class ownership, overrides, etc.
//         query = `
//           MATCH (m:Method {name: $nodeName})
          
//           // Get class that owns this method
//           OPTIONAL MATCH (m)<-[hm:HAS_METHOD]-(class:Class)
          
//           // Get methods this one overrides
//           OPTIONAL MATCH (m)<-[ov:OVERRIDES]-(overriding:Method)
          
//           // Get methods overridden by this one
//           OPTIONAL MATCH (m)-[ovr:OVERRIDES]->(overridden:Method)
          
//           RETURN m as targetMethod,
//                  collect(DISTINCT class) as owningClasses,
//                  collect(DISTINCT overriding) as overridingMethods,
//                  collect(DISTINCT overridden) as overriddenMethods
//         `;
//         break;

//       default:
//         return res.status(400).json({
//           success: false,
//           message: 'Unsupported node type'
//         });
//     }

//     const result = await session.run(query, { nodeName });
//     const cleanedRecords = result.records.map(record => cleanNeo4jRecord(record));

//     res.json({
//       success: true,
//       data: cleanedRecords
//     });

//   } catch (err) {
//     console.error('Error executing relationship query:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Error querying relationships',
//       error: err.message
//     });
//   }
// });



// module.exports = router;
const neo4j = require('neo4j-driver');
const express = require('express');
const router = express.Router();

// Helper function to clean Neo4j records
const cleanNeo4jRecord = (record) => {
  const clean = {};
  for (const [key, value] of record.entries()) {
    if (value && value.properties) {
      clean[key] = {
        ...value.properties,
        id: value.identity.toString(),
      };
    } else if (Array.isArray(value)) {
      clean[key] = value.map((item) => ({
        ...item.properties,
        id: item.identity.toString(),
      }));
    } else if (value && value.type) {
      clean[key] = value.type;
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

// Get relationships based on node type
router.get('/node-relationships', async (req, res) => {
  try {
    const { nodeName, nodeType } = req.query;

    if (!nodeName || !nodeType) {
      return res.status(400).json({
        success: false,
        message: 'nodeName and nodeType are required parameters',
      });
    }

    let query;
    switch (nodeType.toLowerCase()) {
      case 'class':
        query = `
          MATCH (c:Class {name: $nodeName})
          OPTIONAL MATCH (c)-[inh:INHERITS_FROM]->(parent:Class)
          OPTIONAL MATCH (c)<-[child_rel:INHERITS_FROM]-(child:Class)
          OPTIONAL MATCH (c)-[:INHERITS_FROM]->(parent)<-[:INHERITS_FROM]-(sibling:Class)
          WHERE sibling.name <> c.name
          OPTIONAL MATCH (c)-[hm:HAS_METHOD]->(method:Method)
          OPTIONAL MATCH (c)-[ov:OVERRIDES]->(parent_method:Method)
          OPTIONAL MATCH (c)-[ha:HAS_ATTRIBUTE]->(attr:ClassAttribute)
          RETURN c as targetClass,
                 collect(DISTINCT parent) as parents,
                 collect(DISTINCT child) as children,
                 collect(DISTINCT sibling) as siblings,
                 collect(DISTINCT method) as methods,
                 collect(DISTINCT parent_method) as overriddenMethods,
                 collect(DISTINCT attr) as attributes
        `;
        break;

      case 'file':
        query = `
          MATCH (f:File {name: $nodeName})
          OPTIONAL MATCH (f)-[dc:DEFINES_CLASS]->(class:Class)
          OPTIONAL MATCH (f)-[imp:IMPORTS]->(imported:File)
          OPTIONAL MATCH (f)<-[imp_by:IMPORTS]-(importing:File)
          OPTIONAL MATCH (f)-[dm:DEFINES_METHOD]->(method:Method)
          RETURN f as targetFile,
                 collect(DISTINCT class) as definedClasses,
                 collect(DISTINCT imported) as importedFiles,
                 collect(DISTINCT importing) as importedByFiles,
                 collect(DISTINCT method) as definedMethods
        `;
        break;

      case 'method':
        query = `
          MATCH (m:Method {name: $nodeName})
          OPTIONAL MATCH (m)<-[hm:HAS_METHOD]-(class:Class)
          OPTIONAL MATCH (m)<-[ov:OVERRIDES]-(overriding:Method)
          OPTIONAL MATCH (m)-[ovr:OVERRIDES]->(overridden:Method)
          RETURN m as targetMethod,
                 collect(DISTINCT class) as owningClasses,
                 collect(DISTINCT overriding) as overridingMethods,
                 collect(DISTINCT overridden) as overriddenMethods
        `;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported node type',
        });
    }
    const username = process.env.NEO4J_USER;
  
    const password = process.env.NEO4J_PASSWORD;
  const driver = neo4j.driver('neo4j://20.193.154.253:7687', neo4j.auth.basic(username, password));
  const session = driver.session();
    const result = await session.run(query, { nodeName });
    session.close();

    const cleanedRecords = result.records.map((record) => cleanNeo4jRecord(record));

    res.json({
      success: true,
      data: cleanedRecords,
    });
  } catch (err) {
    console.error('Error executing relationship query:', err);
    res.status(500).json({
      success: false,
      message: 'Error querying relationships',
      error: err.message,
    });
  }
});

module.exports = router;
