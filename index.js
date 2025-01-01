const express = require("express");
const cors = require("cors");
const pool = require("./db");
const crypto = require("crypto");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Şifreleme Fonksiyonları
const encryptionKey = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPTION_KEY || "default_key") // Eğer ENV değişkeni yoksa varsayılan bir değer kullanılır
  .digest(); // 32 byte (256 bit)

function encrypt(text) {
  const iv = crypto.randomBytes(16); // Rastgele 16 byte IV
  const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"), // IV hex olarak döndürülüyor
  };
}

function decrypt(encryptedData, iv) {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    encryptionKey,
    Buffer.from(iv, "hex") // IV, hex string'den Buffer'a dönüştürülüyor
  );
  try {
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    throw new Error("Şifre çözme işlemi başarısız.");
  }
}

// Routes
app.get("/getRooms", async (req, res) => {
  console.log("Çalıştım");
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
    const result = await pool.query(
      "INSERT INTO rooms VALUES (default, $1) RETURNING room_id",
      [room_name]
    );

    const roomId = result.rows[0].room_id;
    res.json({
      room_id: roomId,
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
      res.status(200).json({
        room_id: result.rows[0].room_id,
        room_name: result.rows[0].room_name,
      });
    } else {
      res.status(404).json({ error: "Room not found" });
    }
  } catch (err) {
    console.error("Error checking room:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/rooms/:roomId/questions", async (req, res) => {
  const { roomId } = req.params;
  const { question } = req.body;

  try {
    const { encryptedData, iv } = encrypt(question);

    await pool.query(
      "INSERT INTO questions_in_rooms (room_id, question, iv) VALUES ($1, $2, $3)",
      [roomId, encryptedData, iv]
    );

    res.status(201).send("Question added securely");
  } catch (err) {
    console.error("Error adding encrypted question:", err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/api/rooms/:roomId/questions", async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await pool.query(
      "SELECT question, iv FROM questions_in_rooms WHERE room_id = $1",
      [roomId]
    );

    if (result.rows.length > 0) {
      const decryptedQuestions = result.rows.map((row) => {
        const decryptedQuestion = decrypt(row.question, row.iv);
        return { question: decryptedQuestion };
      });

      res.status(200).json(decryptedQuestions);
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

    res.json({ count: parseInt(count) });
  } catch (error) {
    console.error("Error fetching question count:", error.message);
    res.status(500).json({ error: "Error fetching question count" });
  }
});

// Express uygulamasını dışa aktar
module.exports = app;
