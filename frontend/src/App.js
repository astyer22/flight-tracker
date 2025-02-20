import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

function App() {
  const [flights, setFlights] = useState([]);
  const [airlines, setAirlines] = useState([]);
  const [selectedAirline, setSelectedAirline] = useState('');

  // Fetch the list of airlines when the component mounts
  useEffect(() => {
    fetch('http://localhost:5000/airlines')
      .then((response) => response.json())
      .then((data) => {
        setAirlines(data);  // Set the airlines state with the fetched data
      })
      .catch((error) => {
        console.error('Error fetching airlines:', error);
      });
  }, []);

  // Fetch flight data based on selected airline
  useEffect(() => {
    if (selectedAirline) {
      fetch(`http://localhost:5000/flights?airline=${selectedAirline}`)
        .then((response) => response.json())
        .then((data) => {
          setFlights(data);  // Set the flights state with the fetched flight data
        })
        .catch((error) => {
          console.error('Error fetching flights:', error);
        });
    }
  }, [selectedAirline]);

  return (
    <div>
      <h1>Flight Tracker</h1>

      {/* Dropdown for selecting an airline */}
      <select onChange={(e) => setSelectedAirline(e.target.value)} value={selectedAirline}>
        <option value="">Select an airline</option>
        {airlines.map((airline) => (
          <option key={airline.icao} value={airline.icao}>
            {airline.name}
          </option>
        ))}
      </select>

      {/* Displaying flight data on the map */}
      <MapContainer center={[51.505, -0.09]} zoom={2} style={{ width: '100%', height: '600px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {flights.map((flight) => (
          <Marker key={flight.flight_icao} position={[flight.latitude, flight.longitude]}>
            <Popup>
              Flight: {flight.flight_icao} <br /> Speed: {flight.speed} km/h
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
