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

// Connect to MongoDB (replace 'your-database' with your actual database name)
mongoose.connect('mongodb://localhost:27017/animal-feeding')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a schema and model for logs
const foodLogSchema = new mongoose.Schema({
    weight: Number,          // Sensor weight reading
    recordedAt: { type: Date, default: Date.now },  // Timestamp of the log
});

const FoodLog = mongoose.model('FoodLog', foodLogSchema);

// Endpoint to handle sensor data and log it
app.post('/weight', async (req, res) => {
    try {
        const sensorWeight = req.body.weight;  // Weight from the sensor

        // Log the new weight with a timestamp
        const newLog = new FoodLog({
            weight: sensorWeight,
        });

        await newLog.save();

        res.send({ message: `New weight logged: ${sensorWeight}kg.` });
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
        allLogs.forEach((log, index) => {
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
                time: log.recordedAt.toISOString() // Record the time part (HH:MM:SS)
            });

            // Calculate the weight summary (difference from previous log)
            if (index > 0 && allLogs[index - 1].recordedAt.toISOString().split('T')[0] === date) {
                const previousWeight = allLogs[index - 1].weight;
                const currentWeight = log.weight;
                const weightDifference = previousWeight - currentWeight;
                
                // Only add to the summary if there is a positive weight difference (indicating food was eaten)
                if (weightDifference > 0) {
                    groupedData[date].weightSummary += weightDifference;
                }
            }
        });

        // Send the grouped data back as the response
        res.send(groupedData);

    } catch (error) {
        console.error('Error retrieving data:', error);
        res.status(500).send({ message: 'Error retrieving data.' });
    }
});

// Start the server and listen on all interfaces (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
});
