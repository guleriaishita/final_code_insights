
const neo4j = require("neo4j-driver");
const express = require("express");
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
router.get("/node-relationships", async (req, res) => {
  try {
    const { nodeName, nodeType } = req.query;

    if (!nodeName || !nodeType) {
      return res.status(400).json({
        success: false,
        message: "nodeName and nodeType are required parameters",
      });
    }

    let query;
    switch (nodeType.toLowerCase()) {
      case "class":
        // query = `
        //   MATCH (c:Class {name: $nodeName})
        //   OPTIONAL MATCH (c)-[inh:INHERITS_FROM]->(parent:Class)
        //   OPTIONAL MATCH (c)<-[child_rel:INHERITS_FROM]-(child:Class)
        //   OPTIONAL MATCH (c)-[:INHERITS_FROM]->(parent)<-[:INHERITS_FROM]-(sibling:Class)

        //   OPTIONAL MATCH (c)-[hm:HAS_METHOD]->(method:Method)
        //   OPTIONAL MATCH (c)-[ov:OVERRIDES]->(parent_method:Method)
        //   OPTIONAL MATCH (c)-[ha:HAS_ATTRIBUTE]->(attr:ClassAttribute)
        //   RETURN c as targetClass,
        //          collect(DISTINCT parent) as parents,
        //          collect(DISTINCT child) as children,
        //          collect(DISTINCT sibling) as siblings,
        //          collect(DISTINCT method) as methods,
        //          collect(DISTINCT parent_method) as overriddenMethods,
        //          collect(DISTINCT attr) as attributes
        // `;
        query = `MATCH (c:Class {name: $nodeName})


OPTIONAL MATCH (c)-[inh:INHERITS_FROM]->(parent:Class)
OPTIONAL MATCH (parent)-[parent_hm:HAS_METHOD]->(parent_method:Method)


OPTIONAL MATCH (c)<-[:INHERITS_FROM*1..]->(descendant:Class)
OPTIONAL MATCH (c)<-[:INHERITS_FROM]-(child:Class)
OPTIONAL MATCH (child)<-[:INHERITS_FROM]-(grandchild:Class)
OPTIONAL MATCH (descendant)-[desc_hm:HAS_METHOD]->(descendant_method:Method)
OPTIONAL MATCH (child)-[child_hm:HAS_METHOD]->(child_method:Method)
OPTIONAL MATCH (grandchild)-[gc_hm:HAS_METHOD]->(grandchild_method:Method)


OPTIONAL MATCH (c)-[:INHERITS_FROM]->(parent)<-[:INHERITS_FROM]-(sibling:Class)
OPTIONAL MATCH (sibling)-[sib_hm:HAS_METHOD]->(sibling_method:Method)


OPTIONAL MATCH (c)-[hm:HAS_METHOD]->(method:Method)
OPTIONAL MATCH (c)-[ha:HAS_ATTRIBUTE]->(attr:ClassAttribute)


OPTIONAL MATCH (c)-[ov:OVERRIDES]->(overridden_method:Method)
OPTIONAL MATCH (descendant)-[desc_ov:OVERRIDES]->(desc_overridden_method:Method)


RETURN 
    c as targetClass,
    collect(DISTINCT parent) as parents,
    collect(DISTINCT child) as children,
    collect(DISTINCT grandchild) as grandchildren,
    collect(DISTINCT descendant) as descendants,
    collect(DISTINCT sibling) as siblings,
    collect(DISTINCT method) as methods,
    collect(DISTINCT parent_method) as parentMethods,
    collect(DISTINCT child_method) as childMethods,
    collect(DISTINCT grandchild_method) as grandchildMethods,
    collect(DISTINCT descendant_method) as descendantMethods,
    collect(DISTINCT sibling_method) as siblingMethods,
    collect(DISTINCT attr) as attributes,
    collect(DISTINCT overridden_method) as overriddenMethods,
    collect(DISTINCT desc_overridden_method) as descendantOverriddenMethods,
    collect(DISTINCT ov) as overrideRelationships,
    collect(DISTINCT desc_ov) as descendantOverrideRelationships



    `;
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Unsupported node type",
        });
    }
    const username = process.env.NEO4J_USER;

    const password = process.env.NEO4J_PASSWORD;
    const driver = neo4j.driver(
      "neo4j://20.193.154.253:7687",
      neo4j.auth.basic(username, password)
    );
    const session = driver.session();
    const result = await session.run(query, { nodeName });
    session.close();

    const cleanedRecords = result.records.map((record) =>
      cleanNeo4jRecord(record)
    );

    res.json({
      success: true,
      data: cleanedRecords,
    });
  } catch (err) {
    console.error("Error executing relationship query:", err);
    res.status(500).json({
      success: false,
      message: "Error querying relationships",
      error: err.message,
    });
  }
});

module.exports = router;



// const neo4j = require("neo4j-driver");
// const express = require("express");
// const router = express.Router();

// // Helper function to clean Neo4j records with improved handling
// const cleanNeo4jRecord = (record) => {
//   const clean = {};
//   for (const [key, value] of record.entries()) {
//     if (value === null) {
//       clean[key] = [];
//     } else if (Array.isArray(value)) {
//       clean[key] = value.map(item => {
//         if (item && item.properties) {
//           return {
//             ...item.properties,
//             identity: item.identity.toString(),
//             labels: item.labels || []
//           };
//         }
//         return item;
//       });
//     } else if (value && value.properties) {
//       clean[key] = {
//         ...value.properties,
//         identity: value.identity.toString(),
//         labels: value.labels || []
//       };
//     } else {
//       clean[key] = value;
//     }
//   }
//   return clean;
// };

// // Improved graph relationship query
// router.get("/node-relationships", async (req, res) => {
//   try {
//     const { nodeName, nodeType } = req.query;

//     if (!nodeName || !nodeType) {
//       return res.status(400).json({
//         success: false,
//         message: "nodeName and nodeType are required parameters",
//       });
//     }

//     const query = `
//       MATCH (c:Class {name: $nodeName})
      
//       // Direct Inheritance Relationships
//       OPTIONAL MATCH (c)-[inh:INHERITS_FROM]->(parent:Class)
//       OPTIONAL MATCH (child:Class)-[child_inh:INHERITS_FROM]->(c)
      
//       // Indirect Relationships
//       OPTIONAL MATCH (c)<-[:INHERITS_FROM*1..2]-(descendant:Class)
//       OPTIONAL MATCH (c)<-[:INHERITS_FROM]-(grandchild:Class)
//       OPTIONAL MATCH (sibling:Class)-[sib_inh:INHERITS_FROM]->(parent)
      
//       // Methods and Overrides
//       OPTIONAL MATCH (c)-[hm:HAS_METHOD]->(method:Method)
//       OPTIONAL MATCH (c)-[ov:OVERRIDES]->(overridden_method:Method)
      
//       // Descendant Methods and Overrides
//       OPTIONAL MATCH (descendant)-[desc_hm:HAS_METHOD]->(descendant_method:Method)
//       OPTIONAL MATCH (descendant)-[desc_ov:OVERRIDES]->(desc_overridden_method:Method)
      
//       // Attributes
//       OPTIONAL MATCH (c)-[ha:HAS_ATTRIBUTE]->(attr:ClassAttribute)
      
//       RETURN 
//         c as targetClass,
//         collect(DISTINCT parent) as parents,
//         collect(DISTINCT child) as children,
//         collect(DISTINCT grandchild) as grandchildren,
//         collect(DISTINCT descendant) as descendants,
//         collect(DISTINCT sibling) as siblings,
//         collect(DISTINCT method) as methods,
//         collect(DISTINCT overridden_method) as overriddenMethods,
//         collect(DISTINCT descendant_method) as descendantMethods,
//         collect(DISTINCT desc_overridden_method) as descendantOverriddenMethods,
//         collect(DISTINCT attr) as attributes
//     `;

//     const driver = neo4j.driver(
//       "neo4j://20.193.154.253:7687",
//       neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
//     );
    
//     const session = driver.session();
//     const result = await session.run(query, { nodeName });
//     await session.close();
//     await driver.close();

//     const cleanNeo4jRecord = (record) => {
//       const clean = {};
//       for (const [key, value] of record.entries()) {
//         if (Array.isArray(value)) {
//           clean[key] = value.map(item => ({
//             ...item.properties,
//             identity: item.identity.toString(),
//             labels: item.labels || []
//           }));
//         } else if (value && value.properties) {
//           clean[key] = {
//             ...value.properties,
//             identity: value.identity.toString(),
//             labels: value.labels || []
//           };
//         } else {
//           clean[key] = value;
//         }
//       }
//       return clean;
//     };

//     const cleanedRecords = result.records.map(cleanNeo4jRecord);

//     res.json({
//       success: true,
//       data: cleanedRecords
//     });

//   } catch (err) {
//     console.error("Error executing relationship query:", err);
//     res.status(500).json({
//       success: false,
//       message: "Error querying relationships",
//       error: err.message,
//     });
//   }
// });

// module.exports = router;