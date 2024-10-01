const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Initialize express
const app = express();
const port = 3000;

// Middleware to parse JSON payloads
app.use(bodyParser.json());

// Connect to MongoDB (replace 'your-database' with your actual database name)
mongoose.connect('mongodb://localhost:27017/mcu')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a Mongoose schema and model
const sensorSchema = new mongoose.Schema({
    sensorValue: Number,
    timestamp: { type: Date, default: Date.now }
});

const SensorData = mongoose.model('SensorData', sensorSchema);

// Endpoint to receive POST requests from ESP8266
app.post('/endpoint', async (req, res) => {
    try {
        // Log the received data
        console.log('Received data from ESP8266:', req.body);

        // Extract the new sensor value from the request body
        const newSensorValue = req.body.sensor_value;

        // Find the most recent data entry in the database
        const latestData = await SensorData.findOne().sort({ timestamp: -1 });
        console.log('latestData.sensorValue', latestData.sensorValue);
        
        // Check if the latest data exists and compare with the new data
        if (newSensorValue >= latestData.sensorValue ) {
            // If the current data is less than or equal to the latest data, don't save
            return res.status(400).send({ message: 'New data is not greater than the last saved value.' });
        }

        // If the new value is greater, save the new data to the database
        const newData = new SensorData({
            sensorValue: newSensorValue,
        });

        await newData.save();

        // Respond back to the ESP8266
        res.send({ message: 'Data received and saved successfully!' });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).send({ message: 'Error saving data' });
    }
});

// Start the server and listen on all interfaces (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
});
