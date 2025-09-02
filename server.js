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

pool
  .connect()
  .then(() => console.log("✅ Conectado ao banco PostgreSQL!"))
  .catch((err) => console.error("❌ Erro na conexão com o banco:", err));

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
  funcName TEXT,
  setor TEXT,
  inicio TEXT,
  fim TEXT
);
  `);
})();

app.get("/items", async (req, res) => {
  const result = await pool.query("SELECT * FROM items");
  res.json(result.rows);
});

app.post("/items", async (req, res) => {
  const { matricula, funcName, setor, inicio, fim } = req.body;

  try {
    await pool.query(
      "INSERT INTO items (matricula, funcName, setor, inicio, fim) VALUES ($1, $2, $3, $4, $5)",
      [matricula, funcName, setor, inicio, fim]
    );
    res.status(201).json({ matricula, funcName, setor, inicio, fim });
  } catch (err) {
    if (err.code === "23505") {
      // Duplicado
      res.status(409).json({ error: "Matrícula já existe." });
    } else {
      console.error(err);
      res.status(500).json({ error: "Erro ao salvar item." });
    }
  }
});

app.put("/items/:matricula", async (req, res) => {
  const { matricula } = req.params;
  const { funcName, setor, inicio, fim } = req.body;

  try {
    const result = await pool.query(
      "UPDATE items SET funcName = $1, setor = $2, inicio = $3, fim = $4 WHERE matricula = $5 RETURNING *",
      [funcName, setor, inicio, fim, matricula]
    );

    if (result.rowCount === 0) {
      res.status(404).send("Item não encontrado.");
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar item." });
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
