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
app.get("/api/duplicates", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      // WHERE elementId(a) = $id
      `MATCH (a:customer)-[r:POSSIBLE_DUPLICATE4]->(b:customer)
       WHERE a.name_norm contains "ravi"
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


// ===============================
// 📊 Get Canonical Groups
// ===============================
app.get("/api/canonical-groups", async (req, res) => {
  const session = driver.session({ database: "neo4j" });

  try {
    const result = await session.run(
      `MATCH (canon:CanonicalCustomer12)<-[:RESOLVED_TO12]-(c:customer)
       RETURN 
         canon.id AS CanonicalID,
         count(c) AS Members,
         collect(DISTINCT c.Customer_Name)[0..10] AS Names,
         collect(DISTINCT c.email_norm)[0..5] AS Emails,
         collect(DISTINCT c.phone_norm)[0..5] AS Phones
       ORDER BY Members DESC`
    );

    const data = result.records.map(r => ({
      CanonicalID: r.get("CanonicalID"),
      Members: r.get("Members").toNumber?.() ?? r.get("Members"),
      Names: r.get("Names"),
      Emails: r.get("Emails"),
      Phones: r.get("Phones")
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
