const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for audio analysis
app.post('/analyze', (req, res) => {
    // This endpoint will be used for server-side audio analysis if needed
    res.json({ message: 'Audio analysis endpoint ready' });
});

app.listen(PORT, () => {
    console.log(`🚀 Essentia.js demo server running on http://localhost:${PORT}`);
    console.log(`📁 Open your browser and navigate to the URL above`);
});
