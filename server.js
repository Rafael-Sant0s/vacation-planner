require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necessário no Render
  },
});

app.use(express.static("public"));

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

const allowedOrigins = [
  "http://127.0.0.1:5500", // Frontend local (VS Code Live Server, por exemplo)
  "http://localhost:5500", // Outro possível localhost
  "https://deft-nougat-3896c2.netlify.app", // Frontend em produção
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requisições sem origin (como ferramentas internas ou curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json({ limit: "10kb" }));

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      matricula VARCHAR(50) PRIMARY KEY,
      nome TEXT,
      email TEXT
    )
  `);
})();

app.get("/items", async (req, res) => {
  const result = await pool.query("SELECT * FROM items");
  res.json(result.rows);
});

app.post("/items", async (req, res) => {
  const { matricula, nome, email } = req.body;

  try {
    await pool.query(
      "INSERT INTO items (matricula, nome, email) VALUES ($1, $2, $3)",
      [matricula, nome, email]
    );
    res.status(201).json({ matricula, nome, email });
  } catch (err) {
    if (err.code === "23505") {
      // Duplicado
      res.status(409).json({ error: "Matrícula já existe." });
    } else {
      res.status(500).json({ error: "Erro ao salvar item." });
    }
  }
});

app.put("/items/:matricula", async (req, res) => {
  const { matricula } = req.params;
  const { nome, email } = req.body;

  const result = await pool.query(
    "UPDATE items SET nome = $1, email = $2 WHERE matricula = $3 RETURNING *",
    [nome, email, matricula]
  );

  if (result.rowCount === 0) {
    res.status(404).send("Item não encontrado.");
  } else {
    res.json(result.rows[0]);
  }
});

app.delete("/items/:matricula", async (req, res) => {
  const { matricula } = req.params;
  await pool.query("DELETE FROM items WHERE matricula = $1", [matricula]);
  res.sendStatus(204);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
