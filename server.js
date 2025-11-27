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
});

// Permite servir arquivos estáticos da pasta "public"
app.use(express.static("public"));

// Permite o carregamento de recursos de origens externas (helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Define as origens permitidas para o CORS
const allowedOrigins = [
  "http://localhost:5500",
  "http://127.0.0.1:5500", // Frontend local
  "https://vacation-planner-dzc6.onrender.com", // Frontend em produção
];

// Configuração do CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Permite requisições sem origin
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

// Interpreta requisições com corpo JSON
app.use(express.json({ limit: "10kb" }));

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
// GET: Retorna os registros da tabela.
app.get("/items", async (req, res) => {
  const result = await pool.query("SELECT * FROM items");
  res.json(result.rows);
});

// GET: Verifica se a tabela "items" está vazia
app.get("/items/empty", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM items");
    const count = parseInt(result.rows[0].count, 10);
    const isEmpty = count === 0;
    res.json({ empty: isEmpty });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao verificar itens." });
  }
});

// POST: Adiciona um novo registro na tabela
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
      // Matrícula duplicada (chave primária)
      res.status(409).json({ error: "Matrícula já existe." });
    } else {
      console.error("Erro detalhado no INSERT:", err);
      res.status(500).json({
        error: "Erro ao salvar item.",
        detalhe: err.message,
      });
    }
  }
});

// PUT: Atualiza um registro existente na tabela.
app.put("/items/:matricula", async (req, res) => {
  const { matricula } = req.params;
  const { func_name, setor, inicio, fim } = req.body;

  try {
    const result = await pool.query(
      "UPDATE items SET func_name = $1, setor = $2, inicio = $3, fim = $4 WHERE matricula = $5 RETURNING *",
      [func_name, setor, inicio, fim, matricula]
    );

    if (result.rowCount === 0) {
      res.status(404).send("Item não encontrado."); //Matrícula não encontrada
    } else {
      res.json(result.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar item." });
  }
});

//DELETE: Remove um registro da tabela
app.delete("/items/:matricula", async (req, res) => {
  const { matricula } = req.params;
  await pool.query("DELETE FROM items WHERE matricula = $1", [matricula]);
  res.sendStatus(204);
});

// DELETE: múltiplo
app.post("/items/delete", async (req, res) => {
  const { matriculas } = req.body; // espera um array de strings

  if (!Array.isArray(matriculas) || matriculas.length === 0) {
    return res.status(400).json({ error: "Nenhuma matrícula fornecida." });
  }
  try {
    // Usando SQL IN para deletar todas de uma vez
    const query = `
      DELETE FROM items
      WHERE matricula = ANY($1::text[])
    `;
    await pool.query(query, [matriculas]);

    res.status(200).json({ message: "Itens deletados com sucesso." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar itens." });
  }
});

// Inicia o servidor
app.listen(PORT, () => {});
