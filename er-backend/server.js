const express = require("express");
const neo4j = require("neo4j-driver");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔴 CHANGE PASSWORD
const driver = neo4j.driver(
  "neo4j://127.0.0.1:7687",
  neo4j.auth.basic("neo4j", "Keerthana@18")
);

// ===============================
// 🔍 Search Customers
// ===============================
app.get("/api/customers", async (req, res) => {
  const session = driver.session();
  const name = (req.query.name || "").toLowerCase();

  try {
    const result = await session.run(
      `MATCH (c:customer)
       WHERE c.name_norm CONTAINS $name
       RETURN elementId(c) AS id, c
       LIMIT 25`,
      { name }
    );

    const data = result.records.map(r => ({
      id: r.get("id"),
      ...r.get("c").properties
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ===============================
// 🔗 Get Possible Duplicates
// ===============================
app.get("/api/duplicates/:id", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (a:customer)-[r:POSSIBLE_DUPLICATE4]->(b:customer)
       WHERE elementId(a) = $id
       RETURN
         elementId(a) AS aId,
         elementId(b) AS bId,
         a, b, r.score
       ORDER BY r.score DESC
       LIMIT 20`,
      { id: req.params.id }
    );

    const data = result.records.map(r => ({
      aId: r.get("aId"),
      bId: r.get("bId"),
      a: r.get("a").properties,
      b: r.get("b").properties,
      score: r.get("r.score")
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

app.listen(5000, () =>
  console.log("✅ Backend running at http://localhost:5000")
);
