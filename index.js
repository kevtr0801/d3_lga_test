// index.js

// lad env variable 
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log('Loaded DATABASE_URL =', process.env.DATABASE_URL);

const express = require('express');
const { Pool } = require('pg');

// create express app and postgres pool
const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// serve anything in “public/” at the root URL
app.use(express.static(path.join(__dirname, 'public')));

// health-check
app.get('/', (req, res) => {
  res.send('Server is up and running!');
});


app.get('/db', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW()');
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Postgres error:', err);
      res.status(500).json({ error: err.message });
    }
  });
  

// init server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
