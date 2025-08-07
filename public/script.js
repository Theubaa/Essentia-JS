// Global variables
let audioFiles = [];
let audioContext;

// Initialize audio context
async function initAudioContext() {
    try {
        console.log('Initializing Audio Context...');
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio Context initialized successfully!');
        return true;
    } catch (error) {
        console.error('Failed to initialize Audio Context:', error);
        alert('Failed to initialize Audio Context. Please refresh the page and try again.');
        return false;
    }
}

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const audioFileInput = document.getElementById('audioFile');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const loading = document.getElementById('loading');
const fileList = document.getElementById('fileList');
const fileItems = document.getElementById('fileItems');
const resultsContainer = document.getElementById('resultsContainer');
const progressText = document.getElementById('progressText');

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Page loaded, initializing...');
    
    // Initialize Audio Context
    const success = await initAudioContext();
    if (!success) return;
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('Setup complete!');
});

function setupEventListeners() {
    // File input change
    audioFileInput.addEventListener('change', handleFileSelect);
    
    // Upload area click
    uploadArea.addEventListener('click', () => audioFileInput.click());
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Analyze button
    analyzeBtn.addEventListener('click', analyzeAllAudio);
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        handleAudioFiles(files);
    }
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length > 0) {
        handleAudioFiles(audioFiles);
    } else {
        alert('Please select audio files only.');
    }
}

function handleAudioFiles(files) {
    // Add new files to the array
    audioFiles = audioFiles.concat(files);
    
    // Update UI
    updateFileList();
    updateUploadArea();
    
    console.log('Audio files selected:', audioFiles.length);
}

function updateFileList() {
    if (audioFiles.length === 0) {
        fileList.style.display = 'none';
        return;
    }
    
    fileList.style.display = 'block';
    fileItems.innerHTML = '';
    
    audioFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">🎵</div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <p>${formatFileSize(file.size)}</p>
                </div>
            </div>
            <button class="remove-file" onclick="removeFile(${index})">Remove</button>
        `;
        fileItems.appendChild(fileItem);
    });
}

function removeFile(index) {
    audioFiles.splice(index, 1);
    updateFileList();
    updateUploadArea();
}

function updateUploadArea() {
    const uploadContent = uploadArea.querySelector('.upload-content');
    
    if (audioFiles.length === 0) {
        uploadContent.innerHTML = `
            <div class="upload-icon">📁</div>
            <h3>Drop your audio files here</h3>
            <p>or click to browse (supports multiple files)</p>
        `;
        analyzeBtn.disabled = true;
    } else {
        uploadContent.innerHTML = `
            <div class="upload-icon">🎵</div>
            <h3>${audioFiles.length} file(s) selected</h3>
            <p>Click to add more files or analyze current selection</p>
        `;
        analyzeBtn.disabled = false;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function analyzeAllAudio() {
    if (audioFiles.length === 0 || !audioContext) {
        alert('Please select audio files first.');
        return;
    }
    
    try {
        // Show loading
        loading.style.display = 'block';
        resultsSection.style.display = 'none';
        
        const allResults = [];
        
        // Process each file
        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i];
            
            // Update progress
            progressText.textContent = `Processing ${i + 1}/${audioFiles.length}: ${file.name}`;
            
            try {
                // Read and decode audio file
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                console.log(`Analyzing: ${file.name}`);
                
                // Perform analysis
                const results = await performAudioAnalysis(audioBuffer, file.name);
                allResults.push(results);
                
            } catch (error) {
                console.error(`Error analyzing ${file.name}:`, error);
                allResults.push({
                    fileName: file.name,
                    error: true,
                    message: 'Failed to analyze this file'
                });
            }
        }
        
        // Display all results
        displayAllResults(allResults);
        
        // Hide loading, show results
        loading.style.display = 'none';
        resultsSection.style.display = 'block';
        
    } catch (error) {
        console.error('Error analyzing audio files:', error);
        alert('Error analyzing audio files. Please try again.');
        loading.style.display = 'none';
    }
}

async function performAudioAnalysis(audioBuffer, fileName) {
    const results = { fileName, error: false };
    
    try {
        // Get audio data
        const audioData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;
        
        // 1. Basic audio statistics
        console.log('Analyzing basic audio features...');
        const basicStats = calculateBasicStats(audioData);
        results.basicStats = basicStats;
        
        // 2. Frequency analysis
        console.log('Analyzing frequency spectrum...');
        const frequencyAnalysis = await analyzeFrequencySpectrum(audioData, sampleRate);
        results.frequencyAnalysis = frequencyAnalysis;
        
        // 3. Rhythm analysis
        console.log('Analyzing rhythm...');
        const rhythmAnalysis = analyzeRhythm(audioData, sampleRate);
        results.rhythmAnalysis = rhythmAnalysis;
        
        // 4. Spectral analysis
        console.log('Analyzing spectral features...');
        const spectralAnalysis = analyzeSpectralFeatures(audioData, sampleRate);
        results.spectralAnalysis = spectralAnalysis;
        
        console.log('Analysis complete for:', fileName);
        return results;
        
    } catch (error) {
        console.error('Error in audio analysis:', error);
        results.error = true;
        results.message = error.message;
        return results;
    }
}

function calculateBasicStats(audioData) {
    let sum = 0;
    let sumSquares = 0;
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i < audioData.length; i++) {
        const sample = audioData[i];
        sum += sample;
        sumSquares += sample * sample;
        min = Math.min(min, sample);
        max = Math.max(max, sample);
    }
    
    const mean = sum / audioData.length;
    const variance = (sumSquares / audioData.length) - (mean * mean);
    const rms = Math.sqrt(sumSquares / audioData.length);
    const dynamicRange = max - min;
    
    return {
        mean: mean,
        rms: rms,
        dynamicRange: dynamicRange,
        peak: max,
        valley: min
    };
}

async function analyzeFrequencySpectrum(audioData, sampleRate) {
    // Use Web Audio API's AnalyserNode for frequency analysis
    const analyser = audioContext.createAnalyser();
    const bufferSource = audioContext.createBufferSource();
    
    // Create a temporary buffer for analysis
    const tempBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
    tempBuffer.getChannelData(0).set(audioData);
    bufferSource.buffer = tempBuffer;
    bufferSource.connect(analyser);
    
    // Configure analyser
    analyser.fftSize = 2048;
    const frequencyBinCount = analyser.frequencyBinCount;
    const frequencyData = new Float32Array(frequencyBinCount);
    
    // Get frequency data
    analyser.getFloatFrequencyData(frequencyData);
    
    // Calculate dominant frequency
    let maxIndex = 0;
    let maxValue = -Infinity;
    
    for (let i = 0; i < frequencyBinCount; i++) {
        if (frequencyData[i] > maxValue) {
            maxValue = frequencyData[i];
            maxIndex = i;
        }
    }
    
    const dominantFrequency = (maxIndex * sampleRate) / (2 * frequencyBinCount);
    
    return {
        dominantFrequency: dominantFrequency,
        frequencyData: frequencyData
    };
}

function analyzeRhythm(audioData, sampleRate) {
    // Simple rhythm analysis using zero-crossing rate
    let zeroCrossings = 0;
    
    for (let i = 1; i < audioData.length; i++) {
        if ((audioData[i] >= 0 && audioData[i - 1] < 0) || 
            (audioData[i] < 0 && audioData[i - 1] >= 0)) {
            zeroCrossings++;
        }
    }
    
    const zeroCrossingRate = zeroCrossings / audioData.length;
    
    // Estimate tempo (very basic)
    const estimatedTempo = Math.round(zeroCrossingRate * sampleRate * 60 / 2);
    
    return {
        zeroCrossingRate: zeroCrossingRate,
        estimatedTempo: estimatedTempo
    };
}

function analyzeSpectralFeatures(audioData, sampleRate) {
    // Calculate spectral centroid (center of mass of the spectrum)
    let weightedSum = 0;
    let sum = 0;
    
    // Simple spectral analysis using FFT
    const fftSize = 1024;
    const hopSize = fftSize / 4;
    
    for (let i = 0; i < audioData.length - fftSize; i += hopSize) {
        const frame = audioData.slice(i, i + fftSize);
        
        // Apply window function (Hanning)
        for (let j = 0; j < fftSize; j++) {
            frame[j] *= 0.5 * (1 - Math.cos(2 * Math.PI * j / (fftSize - 1)));
        }
        
        // Simple magnitude spectrum
        for (let j = 0; j < fftSize / 2; j++) {
            const frequency = (j * sampleRate) / fftSize;
            const magnitude = Math.abs(frame[j]);
            
            weightedSum += frequency * magnitude;
            sum += magnitude;
        }
    }
    
    const spectralCentroid = sum > 0 ? weightedSum / sum : 0;
    
    return {
        spectralCentroid: spectralCentroid
    };
}

function displayAllResults(allResults) {
    resultsContainer.innerHTML = '';
    
    allResults.forEach(result => {
        const fileResult = document.createElement('div');
        fileResult.className = 'file-result';
        
        if (result.error) {
            fileResult.innerHTML = `
                <h3>❌ ${result.fileName}</h3>
                <p style="color: #ff4757; text-align: center; padding: 20px;">
                    ${result.message || 'Analysis failed'}
                </p>
            `;
        } else {
            fileResult.innerHTML = `
                <h3>🎵 ${result.fileName}</h3>
                <div class="results-grid">
                    <div class="result-card">
                        <h4>📊 RMS Level</h4>
                        <div class="result-value">${formatRMS(result.basicStats.rms)}</div>
                    </div>
                    <div class="result-card">
                        <h4>🎚️ Dynamic Range</h4>
                        <div class="result-value">${formatDynamicRange(result.basicStats.dynamicRange)}</div>
                    </div>
                    <div class="result-card">
                        <h4>🎵 Dominant Frequency</h4>
                        <div class="result-value">${formatFrequency(result.frequencyAnalysis.dominantFrequency)}</div>
                    </div>
                    <div class="result-card">
                        <h4>🎶 Estimated Tempo</h4>
                        <div class="result-value">${formatTempo(result.rhythmAnalysis.estimatedTempo)}</div>
                    </div>
                    <div class="result-card">
                        <h4>🎚️ Spectral Centroid</h4>
                        <div class="result-value">${formatFrequency(result.spectralAnalysis.spectralCentroid)}</div>
                    </div>
                    <div class="result-card">
                        <h4>📈 Zero Crossing Rate</h4>
                        <div class="result-value">${formatRate(result.rhythmAnalysis.zeroCrossingRate)}</div>
                    </div>
                </div>
            `;
        }
        
        resultsContainer.appendChild(fileResult);
    });
}

function formatRMS(rms) {
    return rms ? `${(rms * 100).toFixed(2)}%` : 'N/A';
}

function formatDynamicRange(range) {
    return range ? `${(range * 100).toFixed(2)}%` : 'N/A';
}

function formatFrequency(freq) {
    return freq ? `${freq.toFixed(1)} Hz` : 'N/A';
}

function formatTempo(tempo) {
    return tempo ? `${tempo} BPM` : 'N/A';
}

function formatRate(rate) {
    return rate ? `${(rate * 1000).toFixed(2)}` : 'N/A';
}
