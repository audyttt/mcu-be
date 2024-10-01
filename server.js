const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Use body-parser to handle JSON payloads
app.use(bodyParser.json());

// Endpoint to receive POST requests from ESP8266
app.post('/endpoint', (req, res) => {
    console.log('Received data from ESP8266:', req.body);

    // Respond back to the ESP8266
    res.send({ message: 'Data received successfully!' });
});

// Start the server and listen on all interfaces (0.0.0.0)
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
});
