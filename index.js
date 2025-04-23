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


// app.get('/db', async (req, res) => {
//     try {
//       const result = await pool.query('SELECT NOW()');
//       res.json(result.rows[0]);
//     } catch (err) {
//       console.error('Postgres error:', err);
//       res.status(500).json({ error: err.message });
//     }
//   });
  
app.get('/db', async (req, res) => {
  try{
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'lga_map'
      AND table_type = 'BASE TABLE';
      `);
      res.json(result.rows);
  } catch (err) {
    console.error('Postgres error:', err);
    res.status(500).json({ error: err.message });
  }
});
// get all tables in lga_map schema
app.get('/preview/:table', async (req, res) => {
  const { table } = req.params;

  // 
  const allowedTables = [
    'Lga',
    'LgaStatistics',
    'Nationality',
    'Language',
    'LgaLanguageProficiency',
    'LgaNationality',
    'CouncilInfo',
    'Postcode'
  ];
  if (!allowedTables.includes(table)) {
    return res.status(400).json({ error: 'Table not allowed' });
  }

  try {
    const result = await pool.query(`SELECT * FROM lga_map."${table}" LIMIT 5`);
    res.json(result.rows);
  } catch (err) {
    console.error(`Error previewing lga_map.${table}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// for visulisaton the top 10 nationalities in each lga. Need the 'LGANationality" table,  and join with the 'Nationality' table to get the name of 
// the nationalities using nationality_id.
app.get(`/api/lga/nationalities/:lgaCode`, async (req, res) => {    
  const { lgaCode } = req.params; // get the lgaCode from the request params
  try {
    const result = await pool.query(    
      `SELECT n.nationality, ln.count
      FROM lga_map."LgaNationality" ln
      JOIN lga_map."Nationality" n ON ln.nationality_id = n.nationality_id
      WHERE ln.lga_code = $1
      AND n.nationality NOT IN ('Australia', 'New Zealand', 'England') -- exclude Australian and New Zealander nationalities as not needed. 
      ORDER BY ln.count DESC
      LIMIT 10`, 
      [lgaCode] // use parameterized query to prevent SQL injection
    );
    res.json(result.rows);  
  } catch (err) { 
    console.error(`Error fetching nationalities for LGA ${lgaCode}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// init server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
