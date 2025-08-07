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
        
        // Process each file with progress updates
        for (let i = 0; i < audioFiles.length; i++) {
            const file = audioFiles[i];
            
            // Update progress
            progressText.textContent = `Processing ${i + 1}/${audioFiles.length}: ${file.name}`;
            
            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 10));
            
            try {
                // Read and decode audio file
                const arrayBuffer = await file.arrayBuffer();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
                console.log(`Analyzing: ${file.name}`);
                
                // Perform optimized analysis
                const results = await performOptimizedAnalysis(audioBuffer, file.name, i);
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
        displayAdvancedResults(allResults);
        
        // Hide loading, show results
        loading.style.display = 'none';
        resultsSection.style.display = 'block';
        
    } catch (error) {
        console.error('Error analyzing audio files:', error);
        alert('Error analyzing audio files. Please try again.');
        loading.style.display = 'none';
    }
}

async function performOptimizedAnalysis(audioBuffer, fileName, fileIndex) {
    const results = { fileName, error: false };
    
    try {
        // Get audio data and downsample for faster processing
        const audioData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Downsample audio for faster processing (maintains accuracy)
        const downsampledData = downsampleAudio(audioData, sampleRate, 22050);
        const downsampledSampleRate = 22050;
        
        // Update progress
        progressText.textContent = `Analyzing BPM for ${fileName}...`;
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // 1. Fast BPM Detection
        const bpmAnalysis = await analyzeBPMFast(downsampledData, downsampledSampleRate);
        results.bpm = bpmAnalysis;
        
        // Update progress
        progressText.textContent = `Analyzing danceability for ${fileName}...`;
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // 2. Optimized Danceability Analysis
        const danceabilityAnalysis = analyzeDanceabilityFast(downsampledData, downsampledSampleRate);
        results.danceability = danceabilityAnalysis;
        
        // Update progress
        progressText.textContent = `Analyzing mood for ${fileName}...`;
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // 3. Fast Mood Detection
        const moodAnalysis = analyzeMoodFast(downsampledData, downsampledSampleRate);
        results.mood = moodAnalysis;
        
        console.log('Optimized analysis complete for:', fileName);
        return results;
        
    } catch (error) {
        console.error('Error in audio analysis:', error);
        results.error = true;
        results.message = error.message;
        return results;
    }
}

// Fast BPM Detection using optimized algorithms
async function analyzeBPMFast(audioData, sampleRate) {
    // Use efficient onset detection
    const onsets = detectOnsetsFast(audioData, sampleRate);
    
    // Find peaks efficiently
    const peaks = findPeaksFast(onsets);
    
    // Calculate BPM from peak intervals
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    // Convert to BPM efficiently
    const bpms = intervals.map(interval => {
        const timeInSeconds = interval * 0.01; // 10ms hop size
        return 60 / timeInSeconds;
    });
    
    // Find most common BPM using histogram
    const bpmHistogram = {};
    bpms.forEach(bpm => {
        const roundedBpm = Math.round(bpm);
        if (roundedBpm >= 60 && roundedBpm <= 200) {
            bpmHistogram[roundedBpm] = (bpmHistogram[roundedBpm] || 0) + 1;
        }
    });
    
    let maxCount = 0;
    let detectedBpm = 120;
    
    for (const [bpm, count] of Object.entries(bpmHistogram)) {
        if (count > maxCount) {
            maxCount = count;
            detectedBpm = parseInt(bpm);
        }
    }
    
    return {
        bpm: detectedBpm,
        confidence: Math.min(1, maxCount / bpms.length),
        tempoCategory: getTempoCategory(detectedBpm)
    };
}

// Fast onset detection
function detectOnsetsFast(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate); // 25ms frames
    const hopSize = Math.floor(0.010 * sampleRate); // 10ms hop
    const onsets = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);
        const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        onsets.push(energy);
    }
    
    return onsets;
}

// Fast peak detection
function findPeaksFast(data) {
    const peaks = [];
    const threshold = Math.max(...data) * 0.3; // Lower threshold for more peaks
    
    for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
            peaks.push(i);
        }
    }
    
    return peaks;
}

// Fast danceability analysis
function analyzeDanceabilityFast(audioData, sampleRate) {
    // Calculate rhythm strength efficiently
    const rhythmStrength = calculateRhythmStrengthFast(audioData, sampleRate);
    
    // Calculate beat consistency efficiently
    const beatConsistency = calculateBeatConsistencyFast(audioData);
    
    // Calculate energy distribution efficiently
    const energyDistribution = calculateEnergyDistributionFast(audioData);
    
    // Calculate tempo influence
    const tempoInfluence = calculateTempoInfluenceFast(audioData, sampleRate);
    
    // Calculate syncopation
    const syncopation = calculateSyncopationFast(audioData);
    
    // Combine factors for danceability score
    const danceabilityScore = (
        rhythmStrength * 0.3 +
        beatConsistency * 0.3 +
        energyDistribution * 0.2 +
        tempoInfluence * 0.1 +
        syncopation * 0.1
    );
    
    // Determine detailed danceability type
    const danceabilityType = determineDanceabilityType(danceabilityScore, rhythmStrength, beatConsistency);
    
    return {
        score: Math.min(100, Math.max(0, danceabilityScore * 100)),
        rhythmStrength: rhythmStrength,
        beatConsistency: beatConsistency,
        energyDistribution: energyDistribution,
        tempoInfluence: tempoInfluence,
        syncopation: syncopation,
        category: getDanceabilityCategory(danceabilityScore),
        type: danceabilityType,
        confidence: (rhythmStrength + beatConsistency + energyDistribution) / 3
    };
}

// Fast rhythm strength calculation
function calculateRhythmStrengthFast(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const energies = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const energy = Math.sqrt(frame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize);
        energies.push(energy);
    }
    
    // Calculate variance efficiently
    const mean = energies.reduce((sum, e) => sum + e, 0) / energies.length;
    const variance = energies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energies.length;
    
    return Math.min(1, variance / (mean * mean));
}

// Fast beat consistency calculation
function calculateBeatConsistencyFast(audioData) {
    let zeroCrossings = 0;
    const step = Math.max(1, Math.floor(audioData.length / 10000)); // Sample every nth sample
    
    for (let i = step; i < audioData.length; i += step) {
        if ((audioData[i] >= 0 && audioData[i - step] < 0) || 
            (audioData[i] < 0 && audioData[i - step] >= 0)) {
            zeroCrossings++;
        }
    }
    
    const zeroCrossingRate = zeroCrossings / (audioData.length / step);
    return Math.min(1, zeroCrossingRate * 500); // Adjusted multiplier
}

// Fast energy distribution calculation
function calculateEnergyDistributionFast(audioData) {
    const frameSize = Math.floor(0.025 * 44100);
    const energies = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        energies.push(energy);
    }
    
    const mean = energies.reduce((sum, e) => sum + e, 0) / energies.length;
    const variance = energies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energies.length;
    
    return Math.max(0, 1 - variance / (mean * mean));
}

// Fast mood detection
function analyzeMoodFast(audioData, sampleRate) {
    // Calculate key features efficiently
    const spectralCentroid = calculateSpectralCentroidFast(audioData, sampleRate);
    const zeroCrossingRate = calculateZeroCrossingRateFast(audioData);
    const energyDistribution = calculateEnergyDistributionFast(audioData);
    const spectralRolloff = calculateSpectralRolloffFast(audioData, sampleRate);
    const tempoInfluence = calculateTempoInfluenceFast(audioData, sampleRate);
    
    // Determine detailed mood analysis
    const mood = determineDetailedMood(spectralCentroid, zeroCrossingRate, energyDistribution, spectralRolloff, tempoInfluence);
    
    return {
        primaryMood: mood.primary,
        secondaryMood: mood.secondary,
        songType: mood.songType,
        emoji: mood.emoji,
        confidence: mood.confidence,
        moodExplanation: mood.explanation,
        detailedAnalysis: mood.detailedAnalysis
    };
}

// Fast spectral centroid calculation
function calculateSpectralCentroidFast(audioData, sampleRate) {
    const frameSize = 512; // Smaller frame size for speed
    let totalCentroid = 0;
    let frameCount = 0;
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        
        let weightedSum = 0;
        let sum = 0;
        
        for (let j = 0; j < frameSize / 2; j++) {
            const frequency = (j * sampleRate) / frameSize;
            const magnitude = Math.abs(frame[j]);
            
            weightedSum += frequency * magnitude;
            sum += magnitude;
        }
        
        if (sum > 0) {
            totalCentroid += weightedSum / sum;
            frameCount++;
        }
    }
    
    return frameCount > 0 ? totalCentroid / frameCount : 0;
}

// Fast zero crossing rate calculation
function calculateZeroCrossingRateFast(audioData) {
    let zeroCrossings = 0;
    const step = Math.max(1, Math.floor(audioData.length / 5000)); // Sample every nth sample
    
    for (let i = step; i < audioData.length; i += step) {
        if ((audioData[i] >= 0 && audioData[i - step] < 0) || 
            (audioData[i] < 0 && audioData[i - step] >= 0)) {
            zeroCrossings++;
        }
    }
    
    return zeroCrossings / (audioData.length / step);
}

// Calculate tempo influence for danceability
function calculateTempoInfluenceFast(audioData, sampleRate) {
    const frameSize = Math.floor(0.1 * sampleRate); // 100ms frames
    const tempos = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        tempos.push(energy);
    }
    
    // Calculate tempo stability
    const mean = tempos.reduce((sum, t) => sum + t, 0) / tempos.length;
    const variance = tempos.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / tempos.length;
    
    return Math.max(0, 1 - variance / (mean * mean));
}

// Calculate syncopation for danceability
function calculateSyncopationFast(audioData) {
    const frameSize = Math.floor(0.025 * 44100);
    let syncopationScore = 0;
    
    for (let i = frameSize; i < audioData.length - frameSize; i += frameSize) {
        const currentFrame = audioData.slice(i, i + frameSize);
        const prevFrame = audioData.slice(i - frameSize, i);
        
        const currentEnergy = currentFrame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        const prevEnergy = prevFrame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        
        // Detect unexpected accents (syncopation)
        if (currentEnergy > prevEnergy * 1.5) {
            syncopationScore += 0.1;
        }
    }
    
    return Math.min(1, syncopationScore);
}

// Determine detailed danceability type
function determineDanceabilityType(score, rhythmStrength, beatConsistency) {
    const types = [];
    
    if (score > 0.8) {
        types.push({ type: "🕺 Very Danceable", emoji: "🕺", description: "High energy, strong rhythm" });
    } else if (score > 0.6) {
        types.push({ type: "💃 Danceable", emoji: "💃", description: "Good rhythm and energy" });
    } else if (score > 0.4) {
        types.push({ type: "🕴️ Moderately Danceable", emoji: "🕴️", description: "Some dance elements" });
    } else if (score > 0.2) {
        types.push({ type: "🚶 Slightly Danceable", emoji: "🚶", description: "Limited dance potential" });
    } else {
        types.push({ type: "🧍 Not Danceable", emoji: "🧍", description: "Low dance energy" });
    }
    
    // Add rhythm characteristics
    if (rhythmStrength > 0.7) {
        types.push({ type: "🥁 Strong Rhythm", emoji: "🥁", description: "Clear rhythmic patterns" });
    }
    
    if (beatConsistency > 0.7) {
        types.push({ type: "⏰ Consistent Beat", emoji: "⏰", description: "Steady tempo" });
    }
    
    return types;
}

// Enhanced mood determination with detailed analysis
function determineDetailedMood(spectralCentroid, zeroCrossingRate, energyDistribution, spectralRolloff, tempoInfluence) {
    let moods = [];
    let songTypes = [];
    let emojis = [];
    let confidence = 0;
    let explanation = [];
    let detailedAnalysis = [];
    
    // 🕺 Danceability Analysis
    const danceabilityScore = (energyDistribution + tempoInfluence) / 2;
    if (danceabilityScore > 0.7) {
        detailedAnalysis.push({ type: "🕺 Danceability", score: "High", description: "Strong dance potential" });
    } else if (danceabilityScore > 0.4) {
        detailedAnalysis.push({ type: "🕺 Danceability", score: "Medium", description: "Moderate dance potential" });
    } else {
        detailedAnalysis.push({ type: "🕺 Danceability", score: "Low", description: "Limited dance potential" });
    }
    
    // 😀 Happy Analysis
    if (spectralCentroid > 1500 && energyDistribution > 0.6) {
        moods.push('😀 Happy');
        songTypes.push('Upbeat');
        emojis.push('😀');
        confidence += 0.25;
        explanation.push('High brightness and energy create positive mood');
        detailedAnalysis.push({ type: "😀 Happy", score: "High", description: "Bright, energetic characteristics" });
    } else if (spectralCentroid > 1200) {
        detailedAnalysis.push({ type: "😀 Happy", score: "Medium", description: "Moderately bright sound" });
    } else {
        detailedAnalysis.push({ type: "😀 Happy", score: "Low", description: "Darker, less bright sound" });
    }
    
    // 😢 Sad Analysis
    if (spectralCentroid < 800 && energyDistribution < 0.4) {
        moods.push('😢 Sad');
        songTypes.push('Melancholic');
        emojis.push('😢');
        confidence += 0.25;
        explanation.push('Low brightness and energy indicate somber mood');
        detailedAnalysis.push({ type: "😢 Sad", score: "High", description: "Dark, low energy characteristics" });
    } else if (spectralCentroid < 1000) {
        detailedAnalysis.push({ type: "😢 Sad", score: "Medium", description: "Moderately dark sound" });
    } else {
        detailedAnalysis.push({ type: "😢 Sad", score: "Low", description: "Brighter, less somber sound" });
    }
    
    // 😌 Relaxed Analysis
    if (zeroCrossingRate < 0.05 && energyDistribution < 0.5) {
        moods.push('😌 Relaxed');
        songTypes.push('Chill');
        emojis.push('😌');
        confidence += 0.2;
        explanation.push('Low complexity and energy create calm feeling');
        detailedAnalysis.push({ type: "😌 Relaxed", score: "High", description: "Smooth, calm characteristics" });
    } else if (zeroCrossingRate < 0.08) {
        detailedAnalysis.push({ type: "😌 Relaxed", score: "Medium", description: "Moderately smooth sound" });
    } else {
        detailedAnalysis.push({ type: "😌 Relaxed", score: "Low", description: "More complex, less calm sound" });
    }
    
    // ✊ Aggressiveness Analysis
    if (zeroCrossingRate > 0.1 && spectralRolloff > 3000) {
        moods.push('✊ Aggressive');
        songTypes.push('Intense');
        emojis.push('✊');
        confidence += 0.2;
        explanation.push('High complexity and high frequencies suggest aggression');
        detailedAnalysis.push({ type: "✊ Aggressiveness", score: "High", description: "Complex, high-frequency characteristics" });
    } else if (zeroCrossingRate > 0.08) {
        detailedAnalysis.push({ type: "✊ Aggressiveness", score: "Medium", description: "Moderately complex sound" });
    } else {
        detailedAnalysis.push({ type: "✊ Aggressiveness", score: "Low", description: "Smoother, less aggressive sound" });
    }
    
    // 👁 Engagement Analysis
    const engagementScore = (spectralCentroid / 2000 + energyDistribution + tempoInfluence) / 3;
    if (engagementScore > 0.7) {
        detailedAnalysis.push({ type: "👁 Engagement", score: "High", description: "Very engaging and captivating" });
    } else if (engagementScore > 0.4) {
        detailedAnalysis.push({ type: "👁 Engagement", score: "Medium", description: "Moderately engaging" });
    } else {
        detailedAnalysis.push({ type: "👁 Engagement", score: "Low", description: "Less engaging" });
    }
    
    // 🧠 Approachability Analysis
    const approachabilityScore = (1 - zeroCrossingRate + energyDistribution) / 2;
    if (approachabilityScore > 0.7) {
        detailedAnalysis.push({ type: "🧠 Approachability", score: "High", description: "Very approachable and friendly" });
    } else if (approachabilityScore > 0.4) {
        detailedAnalysis.push({ type: "🧠 Approachability", score: "Medium", description: "Moderately approachable" });
    } else {
        detailedAnalysis.push({ type: "🧠 Approachability", score: "Low", description: "Less approachable" });
    }
    
    // Determine primary and secondary moods
    const primaryMood = moods[0] || 'Neutral';
    const secondaryMood = moods[1] || 'Balanced';
    const songType = songTypes[0] || 'Mixed';
    const emoji = emojis[0] || '🎵';
    
    return {
        primary: primaryMood,
        secondary: secondaryMood,
        songType: songType,
        emoji: emoji,
        confidence: Math.min(1, confidence),
        explanation: explanation.join(' • '),
        detailedAnalysis: detailedAnalysis
    };
}

// Fast spectral rolloff calculation
function calculateSpectralRolloffFast(audioData, sampleRate) {
    const frameSize = 512;
    let totalRolloff = 0;
    let frameCount = 0;
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        
        // Simple magnitude calculation
        const magnitudes = [];
        for (let j = 0; j < frameSize / 2; j++) {
            magnitudes.push(Math.abs(frame[j]));
        }
        
        // Calculate rolloff (85th percentile)
        magnitudes.sort((a, b) => a - b);
        const rolloffIndex = Math.floor(magnitudes.length * 0.85);
        const rolloff = (rolloffIndex * sampleRate) / frameSize;
        
        totalRolloff += rolloff;
        frameCount++;
    }
    
    return frameCount > 0 ? totalRolloff / frameCount : 0;
}

// Audio downsampling for faster processing
function downsampleAudio(audioData, originalSampleRate, targetSampleRate) {
    const ratio = originalSampleRate / targetSampleRate;
    const downsampledData = [];
    
    for (let i = 0; i < audioData.length; i += ratio) {
        downsampledData.push(audioData[Math.floor(i)]);
    }
    
    return downsampledData;
}

// Helper functions
function getTempoCategory(bpm) {
    if (bpm < 60) return 'Larghissimo';
    if (bpm < 66) return 'Largo';
    if (bpm < 76) return 'Adagio';
    if (bpm < 108) return 'Andante';
    if (bpm < 120) return 'Moderato';
    if (bpm < 168) return 'Allegro';
    if (bpm < 200) return 'Presto';
    return 'Prestissimo';
}

function getDanceabilityCategory(score) {
    if (score > 0.8) return 'Very Danceable';
    if (score > 0.6) return 'Danceable';
    if (score > 0.4) return 'Moderately Danceable';
    if (score > 0.2) return 'Slightly Danceable';
    return 'Not Danceable';
}

function displayAdvancedResults(allResults) {
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
            // Create detailed analysis section
            const detailedAnalysisHTML = result.mood.detailedAnalysis.map(analysis => `
                <div class="analysis-item">
                    <span class="analysis-type">${analysis.type}</span>
                    <span class="analysis-score ${analysis.score.toLowerCase()}">${analysis.score}</span>
                    <span class="analysis-description">${analysis.description}</span>
                </div>
            `).join('');
            
            // Create danceability types section
            const danceabilityTypesHTML = result.danceability.type.map(type => `
                <div class="danceability-type">
                    <span class="type-emoji">${type.emoji}</span>
                    <span class="type-name">${type.type}</span>
                    <span class="type-description">${type.description}</span>
                </div>
            `).join('');
            
            fileResult.innerHTML = `
                <h3>🎵 ${result.fileName}</h3>
                <div class="results-grid">
                    <div class="result-card">
                        <h4>🎶 Fast BPM Detection</h4>
                        <div class="result-value">${result.bpm.bpm} BPM</div>
                        <div class="result-subtitle">${result.bpm.tempoCategory} (${(result.bpm.confidence * 100).toFixed(1)}% confidence)</div>
                    </div>
                    <div class="result-card">
                        <h4>🕺 Enhanced Danceability</h4>
                        <div class="result-value">${result.danceability.score.toFixed(1)}%</div>
                        <div class="result-subtitle">${result.danceability.category} (${(result.danceability.confidence * 100).toFixed(1)}% confidence)</div>
                        <div class="danceability-types">
                            ${danceabilityTypesHTML}
                        </div>
                    </div>
                    <div class="result-card">
                        <h4>😊 Advanced Mood Analysis</h4>
                        <div class="result-value">${result.mood.emoji} ${result.mood.primaryMood}</div>
                        <div class="result-subtitle">${result.mood.songType} • ${result.mood.secondaryMood}</div>
                        <div class="mood-explanation">${result.mood.moodExplanation}</div>
                    </div>
                </div>
                <div class="detailed-analysis">
                    <h4>📊 Detailed Song Analysis</h4>
                    <div class="analysis-grid">
                        ${detailedAnalysisHTML}
                    </div>
                </div>
            `;
        }
        
        resultsContainer.appendChild(fileResult);
    });
}
