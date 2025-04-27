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
    'LgaNationalityYear',
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
      ORDER BY ln.count DESC`,
      [lgaCode] // use parameterized query to prevent SQL injection
    );
    res.json(result.rows);  
  } catch (err) { 
    console.error(`Error fetching nationalities for LGA ${lgaCode}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// for bar chart race feature
app.get('/api/lga/nationalities-race/:lgaCode', async (req, res) => {
  const { lgaCode } = req.params;
  try {
    const sql = `
      SELECT lny.year, n.nationality, lny.count
      FROM lga_map."LgaNationalityYear" AS lny
      JOIN lga_map."Nationality" AS n
        ON n.nationality_id = lny.nationality_id
      WHERE lny.lga_code = $1
      ORDER BY lny.year, lny.count DESC;`;

    const { rows } = await pool.query(sql, [lgaCode]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching race data:', err);
    res.status(500).json({ error: err.message });
  }
});

// for stats feature

app.get('/api/lga/statistics-full', async (req, res) => {
  const code = Number(req.query.code); 
  if (!code) {
    return res.status(400).json({ error: 'Missing or invalid ?code= param' });
  }
  try {
    const sql = `
      SELECT *
      FROM   lga_map."LgaStatistics"        
      WHERE  lga_code = $1
      LIMIT  1;
    `;
    const { rows } = await pool.query(sql, [code]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No stats for that LGA code' });
    }
    res.json(rows[0]);               
  } catch (err) {
    console.error('Stats lookup failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// for language proficiency feature
app.get('/api/lga/language-proficiency/:lgaCode', async (req, res) => {
  const lgaCode = Number(req.params.lgaCode);
  if (Number.isNaN(lgaCode)) {
    return res.status(400).json({ error: 'Invalid LGA code' });
  }
  try {
    const sql = `
      SELECT
        lang.language                          AS language,
        llp.english_profiency_level           AS level,
        llp.count                              AS count
      FROM   lga_map."LgaLanguageProficiency" llp
      JOIN   lga_map."Language"             lang
        ON   lang.language_id = llp.language_id
      WHERE  llp.lga_code = $1
      ORDER  BY llp.count DESC;
    `;
    const { rows } = await pool.query(sql, [lgaCode]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No language data for that LGA code' });
    }
    res.json(rows);
  } catch (err) {
    console.error('Language lookup failed:', err);
    res.status(500).json({ error: err.message });
  }
});




// init server 
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
