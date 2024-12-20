const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Routes
app.get("/getRooms", async (req, res) => {
  console.log("calıstım");
  try {
    const allRooms = await pool.query("SELECT * FROM rooms");
    res.json(allRooms.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/createRoom", async (req, res) => {
  const { room_name } = req.body;

  try {
    // Insert new room into database and get the generated room_id
    const result = await pool.query(
      "INSERT INTO rooms VALUES (default, $1) RETURNING room_id",
      [room_name]
    );

    const roomId = result.rows[0].room_id; // Get generated room_id

    res.json({
      room_id: roomId, // Send the generated room_id back to the client
      room_name: room_name,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/rooms/:roomId", async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await pool.query(
      "SELECT room_id, room_name FROM rooms WHERE room_id = $1",
      [roomId]
    );

    if (result.rows.length > 0) {
      // Room found, send the room data (room_id and room_text)
      res.status(200).json({
        room_id: result.rows[0].room_id, // Accessing the first row (result.rows[0])
        room_name: result.rows[0].room_name, // Accessing the room_name (renamed as room_text)
      });
    } else {
      // Room not found, send a 404 with an error message
      res.status(404).json({ error: "Room not found" });
    }
  } catch (err) {
    console.error("Error checking room:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Odaya soru ekleme
app.post("/api/rooms/:roomId/questions", async (req, res) => {
  const { roomId } = req.params;
  const { question } = req.body;
  try {
    await pool.query(
      "INSERT INTO questions_in_rooms (room_id, question) VALUES ($1, $2)",
      [roomId, question]
    );
    res.status(201).send("Question added");
  } catch (err) {
    console.error("Error adding question:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/rooms/:roomId/questions", async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await pool.query(
      "SELECT question FROM questions_in_rooms WHERE room_id = $1",
      [roomId]
    );
    console.log(result);
    if (result.rows.length > 0) {
      // Send questions as an array of objects
      res.status(200).json(result.rows);
    } else {
      res.status(404).json({ error: "No questions found for this room" });
    }
  } catch (err) {
    console.error("Error fetching questions:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/getQuestionsCount/:roomId", async (req, res) => {
  const { roomId } = req.params;

  if (!roomId) {
    return res.status(400).json({ error: "Room ID is required" });
  }

  try {
    const query = `
      SELECT COUNT(*) AS count
      FROM questions_in_rooms
      WHERE room_id = $1
    `;
    const values = [roomId];

    const { rows } = await pool.query(query, values);
    const count = rows[0]?.count || 0;

    res.json({ count: parseInt(count) }); // String sayıyı tam sayıya çevir
  } catch (error) {
    console.error("Error fetching question count:", error.message);
    res.status(500).json({ error: "Error fetching question count" });
  }
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
