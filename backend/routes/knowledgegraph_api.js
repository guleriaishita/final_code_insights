




const neo4j = require("neo4j-driver");
const express = require("express");
const router = express.Router();

require('dotenv').config();

const uri = process.env.NEO4J_URI;
const user = process.env.NEO4J_USER;
const password = process.env.NEO4J_PASSWORD;

if (!uri || !user || !password) {
  throw new Error('Missing Neo4j connection details');
}

const driver = neo4j.driver(
  uri, 
  neo4j.auth.basic(user, password),
  {
    maxConnectionLifetime: 3 * 60 * 60 * 1000,
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 2 * 60 * 1000,
    disableLosslessIntegers: true
  }
);

const verifyConnection = async () => {
  const session = driver.session();
  try {
    await session.run('RETURN 1');
    console.log('Connected to Neo4j');
  } catch (error) {
    console.error('Neo4j connection failed:', error);
    throw error;
  } finally {
    await session.close();
  }
};

verifyConnection();

// cleanNeo4jRecord function remains unchanged
const cleanNeo4jRecord = (record) => {
  if (!record) {
    return {
      targetClass: null,
      inheritance: {
        parents: [],
        children: [],
        grandchildren: [],
        descendants: [],
        siblings: []
      },
      methods: {
        direct: [],
        parent: [],
        child: [],
        grandchild: [],
        descendant: [],
        sibling: [],
        overridden: []
      },
      attributes: []
    };
  }

  const relationships = {};
  const keys = record.keys;

  for (const key of keys) {
    const value = record.get(key);
    if (!value) continue;

    if (value.properties) {
      relationships[key] = {
        id: value.identity.toString(),
        ...value.properties
      };
      continue;
    }

    if (Array.isArray(value)) {
      const cleanedValues = value
        .filter(item => item && item.properties)
        .map(item => ({
          id: item.identity.toString(),
          ...item.properties,
          type: item.labels ? item.labels[0] : undefined
        }));

      if (cleanedValues.length > 0) {
        relationships[key] = cleanedValues;
      }
    }
  }

  return {
    targetClass: relationships.targetClass,
    inheritance: {
      parents: relationships.parents || [],
      children: relationships.children || [],
      grandchildren: relationships.grandchildren || [],
      descendants: relationships.descendants || [],
      siblings: relationships.siblings || []
    },
    methods: {
      direct: relationships.methods || [],
      parent: relationships.parentMethods || [],
      child: relationships.childMethods || [],
      grandchild: relationships.grandchildMethods || [],
      descendant: relationships.descendantMethods || [],
      sibling: relationships.siblingMethods || [],
      overridden: relationships.overriddenMethods || []
    },
    attributes: relationships.attributes || []
  };
};

router.get('/generated_knowledge_graph', async(req, res) => {
  const session = driver.session();
  try {
    const graphData = await session.run('MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 1000');
    
    const graph = graphData.records.map(record => ({
      node1: {
        id: record.get('n').identity.toString(),
        ...record.get('n').properties
      },
      relationship: record.get('r').type,
      node2: {
        id: record.get('m').identity.toString(),
        ...record.get('m').properties
      }
    }));

    res.json({ success: true, graphData: graph });
  } catch (err) {
    console.error('Error fetching graph data:', err);
    res.status(500).json({ success: false, message: 'Error fetching data from Neo4j' });
  } finally {
    await session.close();
  }
});

router.get("/node-relationships", async (req, res) => {
  const session = driver.session();
  try {
    const { nodeName, nodeType } = req.query;

    if (!nodeName || !nodeType) {
      return res.status(400).json({
        success: false,
        message: "nodeName and nodeType are required"
      });
    }

    const result = await session.run(
      // Query remains unchanged
      `MATCH (c:Class {name: $nodeName})
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
          collect(DISTINCT overridden_method) as overriddenMethods`,
      { nodeName }
    );

    const cleanedData = cleanNeo4jRecord(result.records[0]);
    res.json({ success: true, data: cleanedData });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      message: "Error querying relationships",
      error: err.message
    });
  } finally {
    await session.close();
  }
});

module.exports = router;