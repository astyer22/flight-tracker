const express = require('express');
const axios = require('axios');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Function to fetch flights from OpenSky API
async function fetchFlights() {
  try {
      const response = await axios.get('https://opensky-network.org/api/states/all');
      const flights = response.data.states;

      const filteredFlights = flights
          .filter(flight => flight[5] !== null && flight[6] !== null) // Ensure latitude & longitude exist
          .map(flight => ({
              flight_icao: flight[0] || 'UNKNOWN',
              airline_icao: flight[1] ? flight[1].trim() : 'UNKNOWN', // Remove extra spaces
              latitude: flight[6],
              longitude: flight[5],
              speed: flight[9] || 0,
          }));

      for (const flight of filteredFlights) {
          if (flight.airline_icao !== 'UNKNOWN') {
              // Ensure airline exists before inserting flight
              await pool.query(
                  `INSERT INTO airlines (icao, name)
                   VALUES ($1, $1) ON CONFLICT (icao) DO NOTHING`,
                  [flight.airline_icao]
              );
          }

          // Insert or update flight
          await pool.query(
              `INSERT INTO live_flights (flight_icao, airline_icao, latitude, longitude, speed, last_update)
               VALUES ($1, $2, $3, $4, $5, NOW())
               ON CONFLICT (flight_icao) 
               DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, speed = EXCLUDED.speed, last_update = NOW()`,
              [flight.flight_icao, flight.airline_icao, flight.latitude, flight.longitude, flight.speed]
          );
      }

      console.log('Flights updated successfully');
  } catch (error) {
      console.error('Error fetching OpenSky data:', error);
  }
}


// Endpoints

//  Get airlines from the database
app.get('/airlines', async (req, res) => {
  try {
      const { rows } = await pool.query('SELECT * FROM airlines');
      res.json(rows);  // Send the airlines data as JSON
  } catch (error) {
      console.error('Error fetching airlines:', error);
      res.status(500).json({ error: 'Error fetching airlines' });
  }
});

//  Get flights from the database
app.get('/flights', async (req, res) => {
  try {
      const { airline } = req.query;
      let query = 'SELECT * FROM live_flights';
      let params = [];

      if (airline) {
          query += ' WHERE airline_icao = $1';
          params.push(airline);
      }

      const { rows } = await pool.query(query, params);
      res.json(rows);
  } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ error: 'Error fetching flights' });
  }
});

// Fetch flight data every 15 seconds
setInterval(fetchFlights, 15000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
