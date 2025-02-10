const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files
app.use(express.static('.'));

// Log all incoming requests
app.use((req, res, next) => {
    console.log('Incoming request:', req.method, req.url);
    next();
});

// Forward requests to Ollama
app.post('/api/chat', async (req, res) => {
    try {
        const response = await axios({
            method: 'post',
            url: 'http://127.0.0.1:11434/api/chat',
            data: req.body,
            responseType: 'stream'
        });

        response.data.pipe(res);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Proxy Error',
            message: error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Server Error',
        message: 'An unexpected error occurred.'
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 