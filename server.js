const express = require("express");
const cors = require("cors");
const client = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Routes
app.get("/getRooms", async (req, res) => {
  console.log("calıstım");
  try {
    const allRooms = await client.query("SELECT * FROM rooms");
    res.json(allRooms.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
