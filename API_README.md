# 🎵 Audio Analysis API

A powerful REST API for analyzing audio files to extract BPM, danceability, and mood characteristics using advanced signal processing algorithms.

## 🚀 Features

- **🎯 Accurate BPM Detection** - Uses 4 advanced methods (autocorrelation, spectral flux, energy-based, histogram)
- **🕺 Danceability Analysis** - 6 detailed metrics (rhythm strength, beat consistency, energy distribution, tempo stability, syncopation, groove factor)
- **😊 Mood Detection** - 7 categories (danceability, happy, sad, relaxed, aggressiveness, engagement, approachability)
- **⚡ Fast Processing** - Optimized algorithms with downsampling
- **📊 Detailed Results** - Confidence scores and breakdowns for each metric

## 🌐 API Endpoints

### 1. Single File Analysis
**POST** `/api/analyze`

Analyze a single audio file and get comprehensive results.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: 
  - `audio`: Audio file (MP3, WAV, etc.)

**Response:**
```json
{
  "success": true,
  "fileName": "song.mp3",
  "fileSize": 2048576,
  "analysis": {
    "bpm": {
      "bpm": 128,
      "confidence": 0.85,
      "tempoCategory": "Allegro",
      "methods": {
        "autocorr": {"bpm": 128, "confidence": 0.9},
        "onset": {"bpm": 126, "confidence": 0.8},
        "spectral": {"bpm": 130, "confidence": 0.75},
        "histogram": {"bpm": 129, "confidence": 0.7}
      }
    },
    "danceability": {
      "score": 78.5,
      "rhythmStrength": 0.8,
      "beatConsistency": 0.75,
      "energyDistribution": 0.7,
      "tempoStability": 0.85,
      "syncopation": 0.6,
      "grooveFactor": 0.7,
      "category": "Danceable",
      "type": [
        {"type": "💃 Danceable", "emoji": "💃", "description": "Good rhythm and energy"},
        {"type": "🥁 Strong Rhythm", "emoji": "🥁", "description": "Clear rhythmic patterns"}
      ],
      "confidence": 0.8
    },
    "mood": {
      "primaryMood": "😀 Happy",
      "secondaryMood": "Balanced",
      "songType": "Upbeat",
      "emoji": "😀",
      "confidence": 0.75,
      "moodExplanation": "High brightness and energy create positive mood",
      "detailedAnalysis": [
        {"type": "🕺 Danceability", "score": "High", "description": "Strong dance potential"},
        {"type": "😀 Happy", "score": "High", "description": "Bright, energetic characteristics"},
        {"type": "👁 Engagement", "score": "High", "description": "Very engaging and captivating"}
      ]
    }
  }
}
```

### 2. Multiple Files Analysis
**POST** `/api/analyze-multiple`

Analyze multiple audio files in a single request (up to 10 files).

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `audio`: Array of audio files

**Response:**
```json
{
  "success": true,
  "totalFiles": 3,
  "results": [
    {
      "fileName": "song1.mp3",
      "fileSize": 2048576,
      "analysis": { /* same structure as single file */ }
    },
    {
      "fileName": "song2.mp3",
      "fileSize": 1536000,
      "analysis": { /* same structure as single file */ }
    }
  ]
}
```

### 3. Health Check
**GET** `/api/health`

Check if the API is running.

**Response:**
```json
{
  "success": true,
  "message": "Audio Analysis API is running",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 4. API Documentation
**GET** `/api/docs`

Get API documentation and endpoint information.

## 📱 Postman Examples

### Single File Analysis
1. Open Postman
2. Create a new request
3. Set method to `POST`
4. Set URL to `https://your-vercel-app.vercel.app/api/analyze`
5. Go to **Body** tab
6. Select **form-data**
7. Add key: `audio` (type: File)
8. Select your audio file
9. Send request

### Multiple Files Analysis
1. Open Postman
2. Create a new request
3. Set method to `POST`
4. Set URL to `https://your-vercel-app.vercel.app/api/analyze-multiple`
5. Go to **Body** tab
6. Select **form-data**
7. Add key: `audio` (type: File)
8. Select multiple audio files
9. Send request

### Health Check
1. Open Postman
2. Create a new request
3. Set method to `GET`
4. Set URL to `https://your-vercel-app.vercel.app/api/health`
5. Send request

## 🚀 Deployment to Vercel

### Prerequisites
- Node.js installed
- Vercel CLI installed (`npm i -g vercel`)

### Steps

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Follow the prompts:**
   - Link to existing project or create new
   - Set project name
   - Deploy

4. **Get your API URL:**
   - Vercel will provide a URL like: `https://your-app.vercel.app`
   - Your API endpoints will be available at:
     - `https://your-app.vercel.app/api/analyze`
     - `https://your-app.vercel.app/api/analyze-multiple`
     - `https://your-app.vercel.app/api/health`

### Environment Variables
No environment variables required for basic functionality.

## 🔧 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Access the API:**
   - Web interface: `http://localhost:3000`
   - API endpoints: `http://localhost:3000/api/*`

## 📊 Analysis Details

### BPM Detection Methods
1. **Autocorrelation** (40% weight) - Most accurate for steady rhythms
2. **Spectral Flux** (30% weight) - Best for complex arrangements
3. **Energy-based** (20% weight) - Good for simple rhythms
4. **Histogram** (10% weight) - Additional validation

### Danceability Metrics
1. **Rhythm Strength** (25%) - How clear the beat is
2. **Beat Consistency** (25%) - How steady the tempo is
3. **Energy Distribution** (20%) - How balanced the frequencies are
4. **Tempo Stability** (15%) - How consistent the speed is
5. **Syncopation** (10%) - How much unexpected rhythm there is
6. **Groove Factor** (5%) - How danceable the patterns are

### Mood Categories
1. **🕺 Danceability** - Dance potential
2. **😀 Happy** - Positive, upbeat characteristics
3. **😢 Sad** - Somber, melancholic characteristics
4. **😌 Relaxed** - Calm, smooth characteristics
5. **✊ Aggressiveness** - Intense, complex characteristics
6. **👁 Engagement** - Captivating characteristics
7. **🧠 Approachability** - Friendly, accessible characteristics

## ⚠️ Limitations

- **File Size**: Maximum 50MB per file
- **File Types**: Audio files only (MP3, WAV, etc.)
- **Processing Time**: Up to 30 seconds for large files
- **Concurrent Requests**: Limited by Vercel's serverless function limits

## 🛠️ Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (no file, invalid file type)
- `500` - Server error (analysis failed)

Error response format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## 📈 Performance

- **Processing Speed**: Optimized with downsampling (11kHz)
- **Accuracy**: Professional-grade algorithms with confidence scoring
- **Scalability**: Serverless deployment on Vercel

## 🔐 Security

- CORS enabled for cross-origin requests
- File type validation
- File size limits
- No persistent storage of uploaded files

## 📞 Support

For issues or questions:
1. Check the health endpoint: `/api/health`
2. Review API documentation: `/api/docs`
3. Test with small audio files first

---

**🎵 Happy Audio Analyzing!** 🎶
