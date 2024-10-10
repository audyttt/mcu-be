const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');  // Import CORS

// Initialize express
const app = express();
const port = 3000;

// Enable CORS
app.use(cors());  // Allow requests from any origin by default

// Middleware to parse JSON payloads
app.use(bodyParser.json());


const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/animal-feeding';

mongoose.connect(mongoUrl)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


// Define a schema and model for logs
const foodLogSchema = new mongoose.Schema({
    weight: Number,          // Sensor weight reading
    recordedAt: { type: Date, default: Date.now },  // Timestamp of the log
    foodConsumed: { type: Number, default: 0 }  // Amount of food consumed since the last log
});

const FoodLog = mongoose.model('FoodLog', foodLogSchema);

// Endpoint to handle sensor data and log it
app.post('/weight', async (req, res) => {
    try {
        const sensorWeight = req.body.weight;  // Weight from the sensor

        // Get the last logged weight
        const lastLog = await FoodLog.findOne().sort({ recordedAt: -1 });
        let foodConsumed = 0;

        // If the new weight is greater than or equal to the last logged weight, do not save to DB
        if (lastLog && sensorWeight > lastLog.weight) {
            return res.send({ message: 'Cat is eating, weight not logged.' });
        }

        // Calculate the amount of food consumed since the last log
        if (lastLog && lastLog.weight > sensorWeight) {
            foodConsumed = lastLog.weight - sensorWeight;
        }

        const newLog = new FoodLog({
            weight: sensorWeight,
            foodConsumed: foodConsumed
        });

        await newLog.save();

        res.send({ message: `New weight logged: ${sensorWeight}kg. Food consumed: ${foodConsumed}kg.` });
    } catch (error) {
        console.error('Error logging weight:', error);
        res.status(500).send({ message: 'Error logging weight data.' });
    }
});

// Endpoint to retrieve summary for all data, grouped by date and with summary for each day
app.get('/summary-all', async (req, res) => {
    try {
        // Get all logs sorted by date
        const allLogs = await FoodLog.find().sort({ recordedAt: 1 });

        // Create an object to store the data grouped by date
        const groupedData = {};

        // Iterate over the logs and group by date
        allLogs.forEach((log) => {
            const date = log.recordedAt.toISOString().split('T')[0];  // Extract the date part (YYYY-MM-DD)
            
            // If this date isn't in the groupedData yet, initialize it
            if (!groupedData[date]) {
                groupedData[date] = {
                    weightSummary: 0,  // Initialize total weight eaten summary
                    logs: []
                };
            }

            // Add the log entry for this date
            groupedData[date].logs.push({
                weight: log.weight,
                foodConsumed: log.foodConsumed,
                time: log.recordedAt.toISOString() // Record the time part (HH:MM:SS)
            });

            // Add to the weight summary
            groupedData[date].weightSummary += log.foodConsumed;
        });

        // Send the grouped data back as the response
        res.send(groupedData);

    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).send({ message: 'Error retrieving data.' });
    }
});

// Endpoint to retrieve summary for a specific date, default to today
app.get('/summary', async (req, res) => {
    try {
        const dateParam = req.query.date;
        const date = dateParam ? new Date(dateParam) : new Date();
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        // Get logs for the specified date
        const logs = await FoodLog.find({
            recordedAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).sort({ recordedAt: 1 });

        // Create an object to store the data for the specified date
        const groupedData = {
            weightSummary: 0,  // Initialize total weight eaten summary
            logs: []
        };

        // Iterate over the logs and add them to the grouped data
        logs.forEach((log) => {
            groupedData.logs.push({
                weight: log.weight,
                foodConsumed: log.foodConsumed,
                time: log.recordedAt.toISOString() // Record the time part (HH:MM:SS)
            });

            // Add to the weight summary
            groupedData.weightSummary += log.foodConsumed;
        });

        // Send the grouped data back as the response
        res.send(groupedData);

    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).send({ message: 'Error retrieving data.' });
    }
});

// Endpoint to retrieve summary for all days, grouped by day for chart usage
app.get('/summary-chart', async (req, res) => {
    try {
        // Get all logs sorted by date
        const allLogs = await FoodLog.find().sort({ recordedAt: 1 });

        // Create an object to store the data grouped by date
        const groupedData = {};

        // Iterate over the logs and group by date
        allLogs.forEach((log) => {
            const date = log.recordedAt.toISOString().split('T')[0];  // Extract the date part (YYYY-MM-DD)
            
            // If this date isn't in the groupedData yet, initialize it
            if (!groupedData[date]) {
                groupedData[date] = {
                    weightSummary: 0  // Initialize total weight eaten summary
                };
            }

            // Add to the weight summary
            groupedData[date].weightSummary += log.foodConsumed;
        });

        // Convert grouped data to an array for chart usage
        const chartData = Object.keys(groupedData).map(date => ({
            date: date,
            weightSummary: groupedData[date].weightSummary
        }));

        // Send the chart data back as the response
        res.send(chartData);

    } catch (error) {
        console.error('Error retrieving data for chart:', error);
        res.status(500).send({ message: 'Error retrieving data for chart.' });
    }
});

// Endpoint to trigger ESP8266 to read a new current weight
app.post('/trigger-read', async (req, res) => {
    try {
        // Simulate reading weight from ESP8266 (e.g., actual integration might use MQTT or HTTP request)
        const sensorWeight = await getWeightFromESP(); // Replace with actual trigger logic

        // Get the last logged weight
        const lastLog = await FoodLog.findOne().sort({ recordedAt: -1 });
        let foodConsumed = 0;

        // Calculate the amount of food consumed since the last log
        if (lastLog && lastLog.weight > sensorWeight) {
            foodConsumed = lastLog.weight - sensorWeight;
        }

        const newLog = new FoodLog({
            weight: sensorWeight,
            foodConsumed: foodConsumed
        });

        await newLog.save();

        res.send({ message: `New weight logged after trigger: ${sensorWeight}kg. Food consumed: ${foodConsumed}kg.` });
    } catch (error) {
        console.error('Error triggering ESP8266:', error);
        res.status(500).send({ message: 'Error triggering ESP8266 to read weight.' });
    }
});

// Example function to simulate getting weight from ESP8266
async function getWeightFromESP() {
    // Simulate a delay and return a random weight value for demonstration
    return new Promise(resolve => setTimeout(() => resolve(Math.random() * 10), 2000));
}

// Start the server and listen on all interfaces (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
});