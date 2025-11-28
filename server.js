// Carrega variáveis de ambiente do arquivo .env
require("dotenv").config();

// Dependências
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { Pool } = require("pg");

// Instância do Express
const app = express();

// Porta do servidor
const PORT = process.env.PORT || 3000;

// Pool de conexões com o PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Middleware: permite requisições JSON
app.use(express.json({ limit: "10kb" }));

// Middleware: CORS
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://vacation-planner-sn90.onrender.com",
];
app.use(
  cors({
    origin: (origin, callback) => {
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

// Middleware: Helmet com CSP otimizado
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // necessário para CSS inline de Font Awesome
          "https://cdnjs.cloudflare.com",
          "https://kit.fontawesome.com",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com",
          "https://cdn.jsdelivr.net",
        ],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", "*"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

// Criação da tabela "items" ao iniciar o servidor, se não existir
(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      matricula VARCHAR(50) PRIMARY KEY,
      func_name TEXT,
      setor TEXT,
      inicio TEXT,
      fim TEXT
    );
  `);
})();

// Rotas da API

// GET: Todos os registros
app.get("/items", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM items");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar itens." });
  }
});

// GET: Verifica se tabela está vazia
app.get("/items/empty", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM items");
    const count = parseInt(result.rows[0].count, 10);
    res.json({ empty: count === 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao verificar itens." });
  }
});

// POST: Adiciona novo registro
app.post("/items", async (req, res) => {
  const { matricula, func_name, setor, inicio, fim } = req.body;
  try {
    await pool.query(
      "INSERT INTO items (matricula, func_name, setor, inicio, fim) VALUES ($1, $2, $3, $4, $5)",
      [matricula, func_name, setor, inicio, fim]
    );
    res.status(201).json({ matricula, func_name, setor, inicio, fim });
  } catch (err) {
    if (err.code === "23505") {
      res.status(409).json({ error: "Matrícula já existe." });
    } else {
      console.error(err);
      res
        .status(500)
        .json({ error: "Erro ao salvar item.", detalhe: err.message });
    }
  }
});

// PUT: Atualiza registro existente
app.put("/items/:matricula", async (req, res) => {
  const { matricula } = req.params;
  const { func_name, setor, inicio, fim } = req.body;
  try {
    const result = await pool.query(
      "UPDATE items SET func_name=$1, setor=$2, inicio=$3, fim=$4 WHERE matricula=$5 RETURNING *",
      [func_name, setor, inicio, fim, matricula]
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

// DELETE: Remove um registro
app.delete("/items/:matricula", async (req, res) => {
  const { matricula } = req.params;
  try {
    await pool.query("DELETE FROM items WHERE matricula=$1", [matricula]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar item." });
  }
});

// DELETE múltiplo
app.post("/items/delete", async (req, res) => {
  const { matriculas } = req.body;
  if (!Array.isArray(matriculas) || matriculas.length === 0) {
    return res.status(400).json({ error: "Nenhuma matrícula fornecida." });
  }
  try {
    await pool.query("DELETE FROM items WHERE matricula = ANY($1::text[])", [
      matriculas,
    ]);
    res.status(200).json({ message: "Itens deletados com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar itens." });
  }
});

// Arquivos estáticos (frontend)
app.use(express.static("public"));

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
