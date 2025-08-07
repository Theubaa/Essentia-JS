const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed!'), false);
        }
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for single audio file analysis
app.post('/api/analyze', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No audio file provided'
            });
        }

        console.log(`Analyzing file: ${req.file.originalname} (${req.file.size} bytes)`);

        // Convert buffer to ArrayBuffer for Web Audio API
        const arrayBuffer = req.file.buffer.buffer.slice(
            req.file.buffer.byteOffset,
            req.file.buffer.byteOffset + req.file.buffer.byteLength
        );

        // Create a virtual AudioContext for analysis
        const { analyzeAudioBuffer } = require('./audioAnalyzer');
        
        // Create a mock AudioBuffer-like object
        const audioBuffer = {
            getChannelData: (channel) => {
                // Convert buffer to Float32Array
                const floatArray = new Float32Array(arrayBuffer);
                return floatArray;
            },
            sampleRate: 44100, // Default sample rate
            length: arrayBuffer.byteLength / 4, // Assuming 32-bit float
            duration: arrayBuffer.byteLength / 4 / 44100
        };

        // Perform analysis
        const results = await analyzeAudioBuffer(audioBuffer, req.file.originalname);

        res.json({
            success: true,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            analysis: results
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Analysis failed'
        });
    }
});

// API endpoint for multiple audio files analysis
app.post('/api/analyze-multiple', upload.array('audio', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No audio files provided'
            });
        }

        console.log(`Analyzing ${req.files.length} files`);

        const { analyzeAudioBuffer } = require('./audioAnalyzer');
        const allResults = [];

        for (const file of req.files) {
            try {
                // Convert buffer to ArrayBuffer
                const arrayBuffer = file.buffer.buffer.slice(
                    file.buffer.byteOffset,
                    file.buffer.byteOffset + file.buffer.byteLength
                );

                // Create a mock AudioBuffer-like object
                const audioBuffer = {
                    getChannelData: (channel) => {
                        const floatArray = new Float32Array(arrayBuffer);
                        return floatArray;
                    },
                    sampleRate: 44100,
                    length: arrayBuffer.byteLength / 4,
                    duration: arrayBuffer.byteLength / 4 / 44100
                };

                // Perform analysis
                const results = await analyzeAudioBuffer(audioBuffer, file.originalname);
                allResults.push({
                    fileName: file.originalname,
                    fileSize: file.size,
                    analysis: results
                });

            } catch (error) {
                console.error(`Error analyzing ${file.originalname}:`, error);
                allResults.push({
                    fileName: file.originalname,
                    fileSize: file.size,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            totalFiles: req.files.length,
            results: allResults
        });

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Analysis failed'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Audio Analysis API is running',
        timestamp: new Date().toISOString()
    });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        message: 'Audio Analysis API Documentation',
        endpoints: {
            'POST /api/analyze': {
                description: 'Analyze a single audio file',
                body: {
                    audio: 'Audio file (multipart/form-data)'
                },
                response: {
                    success: 'boolean',
                    fileName: 'string',
                    fileSize: 'number',
                    analysis: {
                        bpm: 'object',
                        danceability: 'object',
                        mood: 'object'
                    }
                }
            },
            'POST /api/analyze-multiple': {
                description: 'Analyze multiple audio files',
                body: {
                    audio: 'Array of audio files (multipart/form-data)'
                },
                response: {
                    success: 'boolean',
                    totalFiles: 'number',
                    results: 'array'
                }
            },
            'GET /api/health': {
                description: 'Health check endpoint',
                response: {
                    success: 'boolean',
                    message: 'string',
                    timestamp: 'string'
                }
            }
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Audio Analysis API server running on http://localhost:${PORT}`);
    console.log(`📁 Web interface: http://localhost:${PORT}`);
    console.log(`🔗 API endpoints:`);
    console.log(`   - POST /api/analyze (single file)`);
    console.log(`   - POST /api/analyze-multiple (multiple files)`);
    console.log(`   - GET /api/health (health check)`);
    console.log(`   - GET /api/docs (API documentation)`);
});
