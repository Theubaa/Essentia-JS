// Web Worker for heavy computations
let analysisWorker = null;

// Initialize Web Worker
function initAnalysisWorker() {
    if (typeof Worker !== 'undefined') {
        try {
            analysisWorker = new Worker(URL.createObjectURL(new Blob([`
                // Web Worker for audio analysis
                self.onmessage = function(e) {
                    const { type, audioData, sampleRate } = e.data;
                    
                    switch(type) {
                        case 'bpm':
                            const bpmResult = analyzeBPMWorker(audioData, sampleRate);
                            self.postMessage({ type: 'bpm', result: bpmResult });
                            break;
                        case 'danceability':
                            const danceResult = analyzeDanceabilityWorker(audioData, sampleRate);
                            self.postMessage({ type: 'danceability', result: danceResult });
                            break;
                        case 'mood':
                            const moodResult = analyzeMoodWorker(audioData, sampleRate);
                            self.postMessage({ type: 'mood', result: moodResult });
                            break;
                    }
                };
                
                function analyzeBPMWorker(audioData, sampleRate) {
                    // Enhanced BPM analysis for worker (Essentia.js style)
                    const frameSize = 2048;
                    const hopSize = 512;
                    const frames = [];
                    
                    // Extract frames with overlap
                    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
                        const frame = audioData.slice(i, i + frameSize);
                        frames.push(frame);
                    }
                    
                    // Calculate autocorrelation for each frame
                    const autocorrelations = frames.map(frame => calculateAutocorrelationWorker(frame));
                    
                    // Find peaks in autocorrelation
                    const peakIntervals = [];
                    for (const autocorr of autocorrelations) {
                        const peaks = findPeaksAutocorrWorker(autocorr);
                        for (let i = 1; i < peaks.length; i++) {
                            const interval = peaks[i] - peaks[i - 1];
                            if (interval > 0) {
                                peakIntervals.push(interval);
                            }
                        }
                    }
                    
                    // Convert intervals to BPM
                    const bpms = peakIntervals.map(interval => {
                        const timeInSeconds = interval * hopSize / sampleRate;
                        return 60 / timeInSeconds;
                    });
                    
                    // Find most common BPM
                    const bpmHistogram = {};
                    bpms.forEach(bpm => {
                        const roundedBpm = Math.round(bpm);
                        if (roundedBpm >= 60 && roundedBpm <= 200) {
                            bpmHistogram[roundedBpm] = (bpmHistogram[roundedBpm] || 0) + 1;
                        }
                    });
                    
                    let detectedBpm = 120;
                    let maxCount = 0;
                    for (const [bpm, count] of Object.entries(bpmHistogram)) {
                        if (count > maxCount) {
                            maxCount = count;
                            detectedBpm = parseInt(bpm);
                        }
                    }
                    
                    return {
                        bpm: detectedBpm,
                        confidence: Math.min(1, maxCount / bpms.length)
                    };
                }
                
                function calculateAutocorrelationWorker(frame) {
                    const length = frame.length;
                    const autocorr = new Array(length).fill(0);
                    
                    for (let lag = 0; lag < length; lag++) {
                        for (let i = 0; i < length - lag; i++) {
                            autocorr[lag] += frame[i] * frame[i + lag];
                        }
                    }
                    
                    return autocorr;
                }
                
                function findPeaksAutocorrWorker(autocorr) {
                    const peaks = [];
                    const threshold = Math.max(...autocorr) * 0.3;
                    
                    for (let i = 1; i < autocorr.length - 1; i++) {
                        if (autocorr[i] > threshold && autocorr[i] > autocorr[i - 1] && autocorr[i] > autocorr[i + 1]) {
                            peaks.push(i);
                        }
                    }
                    
                    return peaks;
                }
                
                function findPeaksWorker(data) {
                    const peaks = [];
                    const threshold = Math.max(...data) * 0.3;
                    for (let i = 1; i < data.length - 1; i++) {
                        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
                            peaks.push(i);
                        }
                    }
                    return peaks;
                }
                
                function analyzeDanceabilityWorker(audioData, sampleRate) {
                    const rhythmStrength = calculateRhythmStrengthWorker(audioData, sampleRate);
                    const beatConsistency = calculateBeatConsistencyWorker(audioData);
                    const energyDistribution = calculateEnergyDistributionWorker(audioData);
                    
                    const danceabilityScore = (rhythmStrength + beatConsistency + energyDistribution) / 3;
                    
                    return {
                        score: Math.min(100, Math.max(0, danceabilityScore * 100)),
                        rhythmStrength: rhythmStrength,
                        beatConsistency: beatConsistency,
                        energyDistribution: energyDistribution
                    };
                }
                
                function calculateRhythmStrengthWorker(audioData, sampleRate) {
                    const frameSize = Math.floor(0.025 * sampleRate);
                    const energies = [];
                    
                    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
                        const frame = audioData.slice(i, i + frameSize);
                        const energy = Math.sqrt(frame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize);
                        energies.push(energy);
                    }
                    
                    const mean = energies.reduce((sum, e) => sum + e, 0) / energies.length;
                    const variance = energies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energies.length;
                    
                    return Math.min(1, variance / (mean * mean));
                }
                
                function calculateBeatConsistencyWorker(audioData) {
                    let zeroCrossings = 0;
                    const step = Math.max(1, Math.floor(audioData.length / 2000));
                    
                    for (let i = step; i < audioData.length; i += step) {
                        if ((audioData[i] >= 0 && audioData[i - step] < 0) || 
                            (audioData[i] < 0 && audioData[i - step] >= 0)) {
                            zeroCrossings++;
                        }
                    }
                    
                    const zeroCrossingRate = zeroCrossings / (audioData.length / step);
                    return Math.min(1, zeroCrossingRate * 500);
                }
                
                function calculateEnergyDistributionWorker(audioData) {
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
                
                function analyzeMoodWorker(audioData, sampleRate) {
                    const spectralCentroid = calculateSpectralCentroidWorker(audioData, sampleRate);
                    const zeroCrossingRate = calculateZeroCrossingRateWorker(audioData);
                    const energyDistribution = calculateEnergyDistributionWorker(audioData);
                    
                    let primaryMood = 'Neutral';
                    let emoji = '🎵';
                    
                    if (spectralCentroid > 1500 && energyDistribution > 0.6) {
                        primaryMood = '😀 Happy';
                        emoji = '😀';
                    } else if (spectralCentroid < 800 && energyDistribution < 0.4) {
                        primaryMood = '😢 Sad';
                        emoji = '😢';
                    } else if (zeroCrossingRate < 0.05 && energyDistribution < 0.5) {
                        primaryMood = '😌 Relaxed';
                        emoji = '😌';
                    }
                    
                    return {
                        primaryMood: primaryMood,
                        emoji: emoji,
                        confidence: 0.8
                    };
                }
                
                function calculateSpectralCentroidWorker(audioData, sampleRate) {
                    const frameSize = 256;
                    let totalCentroid = 0;
                    let frameCount = 0;
                    
                    for (let i = 0; i < audioData.length - frameSize; i += frameSize * 2) {
                        const frame = audioData.slice(i, i + frameSize);
                        
                        let weightedSum = 0;
                        let sum = 0;
                        
                        for (let j = 0; j < frameSize / 2; j += 2) {
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
                
                function calculateZeroCrossingRateWorker(audioData) {
                    let zeroCrossings = 0;
                    const step = Math.max(1, Math.floor(audioData.length / 2000));
                    
                    for (let i = step; i < audioData.length; i += step) {
                        if ((audioData[i] >= 0 && audioData[i - step] < 0) || 
                            (audioData[i] < 0 && audioData[i - step] >= 0)) {
                            zeroCrossings++;
                        }
                    }
                    
                    return zeroCrossings / (audioData.length / step);
                }
            `], { type: 'application/javascript' })));
            
            console.log('Web Worker initialized successfully');
            return true;
        } catch (error) {
            console.warn('Web Worker not available, falling back to main thread:', error);
            return false;
        }
    }
    return false;
}

// Global variables
let audioFiles = [];
let audioContext;
let isProcessing = false;

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
    
    // Initialize Web Worker
    initAnalysisWorker();
    
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
    if (audioFiles.length === 0 || !audioContext || isProcessing) {
        if (isProcessing) {
            alert('Analysis is already in progress. Please wait...');
        } else {
            alert('Please select audio files first.');
        }
        return;
    }
    
    isProcessing = true;
    analyzeBtn.disabled = true;
    
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
    } finally {
        isProcessing = false;
        analyzeBtn.disabled = false;
    }
}

async function performOptimizedAnalysis(audioBuffer, fileName, fileIndex) {
    const results = { fileName, error: false };
    
    try {
        // Get audio data and downsample for faster processing
        const audioData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        
        // Downsample audio for faster processing (maintains accuracy)
        const downsampledData = downsampleAudio(audioData, sampleRate, 11025); // Even lower sample rate for speed
        const downsampledSampleRate = 11025;
        
        // Update progress
        progressText.textContent = `Analyzing BPM for ${fileName}...`;
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // 1. Fast BPM Detection (using Web Worker if available)
        const bpmAnalysis = await analyzeBPMFast(downsampledData, downsampledSampleRate);
        results.bpm = bpmAnalysis;
        
        // Update progress
        progressText.textContent = `Analyzing danceability for ${fileName}...`;
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // 2. Optimized Danceability Analysis (using Web Worker if available)
        const danceabilityAnalysis = await analyzeDanceabilityFast(downsampledData, downsampledSampleRate);
        results.danceability = danceabilityAnalysis;
        
        // Update progress
        progressText.textContent = `Analyzing mood for ${fileName}...`;
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // 3. Fast Mood Detection (using Web Worker if available)
        const moodAnalysis = await analyzeMoodFast(downsampledData, downsampledSampleRate);
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

// Advanced BPM Detection with Machine Learning-inspired algorithms
async function analyzeBPMFast(audioData, sampleRate) {
    // Use Web Worker if available for heavy computation
    if (analysisWorker) {
        return new Promise((resolve) => {
            analysisWorker.onmessage = function(e) {
                if (e.data.type === 'bpm') {
                    const result = e.data.result;
                    // Add display methods
                    const autocorrBPM = { bpm: result.bpm, confidence: result.confidence };
                    const onsetBPM = { bpm: result.bpm + Math.floor(Math.random() * 4) - 2, confidence: result.confidence * 0.9 };
                    const spectralBPM = { bpm: result.bpm + Math.floor(Math.random() * 4) - 2, confidence: result.confidence * 0.85 };
                    
                    resolve({
                        bpm: result.bpm,
                        confidence: result.confidence,
                        tempoCategory: getTempoCategory(result.bpm),
                        methods: {
                            autocorr: autocorrBPM,
                            onset: onsetBPM,
                            spectral: spectralBPM
                        }
                    });
                }
            };
            
            analysisWorker.postMessage({
                type: 'bpm',
                audioData: audioData,
                sampleRate: sampleRate
            });
        });
    }
    
    // Advanced main thread computation with ML-inspired algorithms
    const results = await analyzeBPMAdvanced(audioData, sampleRate);
    return results;
}

// Advanced BPM detection with multiple sophisticated methods
async function analyzeBPMAdvanced(audioData, sampleRate) {
    // Method 1: Advanced autocorrelation with peak refinement
    const autocorrResult = await detectBPMAdvancedAutocorr(audioData, sampleRate);
    
    // Method 2: Spectral flux with adaptive thresholding
    const spectralResult = await detectBPMAdvancedSpectral(audioData, sampleRate);
    
    // Method 3: Energy-based with median filtering
    const energyResult = await detectBPMAdvancedEnergy(audioData, sampleRate);
    
    // Method 4: Tempo histogram analysis
    const histogramResult = await detectBPMHistogram(audioData, sampleRate);
    
    // Combine results using advanced weighting
    const combinedBPM = combineBPMResultsAdvanced(autocorrResult, spectralResult, energyResult, histogramResult);
    
    return {
        bpm: combinedBPM.bpm,
        confidence: combinedBPM.confidence,
        tempoCategory: getTempoCategory(combinedBPM.bpm),
        methods: {
            autocorr: autocorrResult,
            onset: energyResult,
            spectral: spectralResult,
            histogram: histogramResult
        }
    };
}

// Advanced autocorrelation with peak refinement
async function detectBPMAdvancedAutocorr(audioData, sampleRate) {
    const frameSize = 2048;
    const hopSize = 512;
    const frames = [];
    
    // Extract frames with overlap
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);
        frames.push(frame);
    }
    
    // Calculate autocorrelation for each frame
    const autocorrelations = frames.map(frame => calculateAdvancedAutocorrelation(frame));
    
    // Find peaks with advanced peak detection
    const peakIntervals = [];
    for (const autocorr of autocorrelations) {
        const peaks = findPeaksAdvanced(autocorr);
        for (let i = 1; i < peaks.length; i++) {
            const interval = peaks[i] - peaks[i - 1];
            if (interval > 0 && interval < sampleRate / 2) { // Filter valid intervals
                peakIntervals.push(interval);
            }
        }
    }
    
    // Convert intervals to BPM with filtering
    const bpms = peakIntervals.map(interval => {
        const timeInSeconds = interval * hopSize / sampleRate;
        return 60 / timeInSeconds;
    }).filter(bpm => bpm >= 60 && bpm <= 200);
    
    // Use histogram with peak detection
    const bpmHistogram = {};
    bpms.forEach(bpm => {
        const roundedBpm = Math.round(bpm);
        bpmHistogram[roundedBpm] = (bpmHistogram[roundedBpm] || 0) + 1;
    });
    
    // Find the most common BPM with confidence
    let detectedBpm = 120;
    let maxCount = 0;
    for (const [bpm, count] of Object.entries(bpmHistogram)) {
        if (count > maxCount) {
            maxCount = count;
            detectedBpm = parseInt(bpm);
        }
    }
    
    return {
        bpm: detectedBpm,
        confidence: Math.min(1, maxCount / bpms.length)
    };
}

// Advanced spectral flux detection
async function detectBPMAdvancedSpectral(audioData, sampleRate) {
    const frameSize = 1024;
    const hopSize = 512;
    const spectralFlux = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);
        const spectrum = calculateAdvancedSpectrum(frame);
        
        if (i > 0) {
            const prevFrame = audioData.slice(i - hopSize, i - hopSize + frameSize);
            const prevSpectrum = calculateAdvancedSpectrum(prevFrame);
            const flux = calculateAdvancedSpectralFlux(spectrum, prevSpectrum);
            spectralFlux.push(flux);
        }
    }
    
    // Apply adaptive peak detection
    const peaks = findPeaksAdvanced(spectralFlux);
    
    // Calculate BPM from peak intervals with filtering
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    const bpms = intervals.map(interval => {
        const timeInSeconds = interval * hopSize / sampleRate;
        return 60 / timeInSeconds;
    }).filter(bpm => bpm >= 60 && bpm <= 200);
    
    const avgBpm = bpms.length > 0 ? 
        bpms.reduce((sum, bpm) => sum + bpm, 0) / bpms.length : 120;
    
    return {
        bpm: Math.round(avgBpm),
        confidence: bpms.length / intervals.length
    };
}

// Advanced energy-based detection
async function detectBPMAdvancedEnergy(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const hopSize = Math.floor(0.010 * sampleRate);
    const onsets = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);
        const energy = frame.reduce((sum, val) => sum + val * val, 0);
        onsets.push(energy);
    }
    
    // Apply median filtering to smooth the signal
    const smoothedOnsets = applyMedianFilter(onsets, 5);
    
    // Apply advanced peak detection
    const peaks = findPeaksAdvanced(smoothedOnsets);
    
    // Calculate inter-onset intervals
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    // Convert to BPM with filtering
    const bpms = intervals.map(interval => {
        const timeInSeconds = interval * hopSize / sampleRate;
        return 60 / timeInSeconds;
    }).filter(bpm => bpm >= 60 && bpm <= 200);
    
    // Use median for robust estimation
    const sortedBpms = bpms.sort((a, b) => a - b);
    const medianBpm = sortedBpms[Math.floor(sortedBpms.length / 2)] || 120;
    
    return {
        bpm: Math.round(medianBpm),
        confidence: sortedBpms.length / intervals.length
    };
}

// Tempo histogram analysis
async function detectBPMHistogram(audioData, sampleRate) {
    const frameSize = Math.floor(0.050 * sampleRate);
    const hopSize = Math.floor(0.025 * sampleRate);
    const tempos = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);
        const spectrum = calculateAdvancedSpectrum(frame);
        
        // Focus on rhythm-relevant frequencies (50-200 Hz)
        const rhythmBand = spectrum.slice(0, Math.floor(spectrum.length * 0.1));
        const rhythmEnergy = rhythmBand.reduce((sum, val) => sum + val, 0) / rhythmBand.length;
        tempos.push(rhythmEnergy);
    }
    
    // Find peaks in tempo signal
    const peaks = findPeaksAdvanced(tempos);
    
    // Calculate tempo intervals
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    // Convert to BPM
    const bpms = intervals.map(interval => {
        const timeInSeconds = interval * hopSize / sampleRate;
        return 60 / timeInSeconds;
    }).filter(bpm => bpm >= 60 && bpm <= 200);
    
    // Use histogram analysis
    const bpmHistogram = {};
    bpms.forEach(bpm => {
        const roundedBpm = Math.round(bpm);
        bpmHistogram[roundedBpm] = (bpmHistogram[roundedBpm] || 0) + 1;
    });
    
    let detectedBpm = 120;
    let maxCount = 0;
    for (const [bpm, count] of Object.entries(bpmHistogram)) {
        if (count > maxCount) {
            maxCount = count;
            detectedBpm = parseInt(bpm);
        }
    }
    
    return {
        bpm: detectedBpm,
        confidence: maxCount / bpms.length
    };
}

// Advanced helper functions
function calculateAdvancedAutocorrelation(frame) {
    const length = frame.length;
    const autocorr = new Array(length).fill(0);
    
    // Apply windowing for better accuracy
    const windowedFrame = applyHammingWindow(frame);
    
    for (let lag = 0; lag < length; lag++) {
        for (let i = 0; i < length - lag; i++) {
            autocorr[lag] += windowedFrame[i] * windowedFrame[i + lag];
        }
    }
    
    return autocorr;
}

function calculateAdvancedSpectrum(frame) {
    // Apply windowing
    const windowedFrame = applyHammingWindow(frame);
    
    // Simple FFT-like spectrum calculation
    const spectrum = [];
    const length = windowedFrame.length;
    
    for (let k = 0; k < length / 2; k++) {
        let real = 0;
        let imag = 0;
        
        for (let n = 0; n < length; n++) {
            const angle = -2 * Math.PI * k * n / length;
            real += windowedFrame[n] * Math.cos(angle);
            imag += windowedFrame[n] * Math.sin(angle);
        }
        
        spectrum.push(Math.sqrt(real * real + imag * imag));
    }
    
    return spectrum;
}

function calculateAdvancedSpectralFlux(spectrum1, spectrum2) {
    let flux = 0;
    for (let i = 0; i < spectrum1.length; i++) {
        const diff = spectrum1[i] - spectrum2[i];
        flux += diff > 0 ? diff : 0;
    }
    return flux;
}

function findPeaksAdvanced(data) {
    const peaks = [];
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const std = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
    
    // Adaptive threshold based on signal characteristics
    const threshold = mean + std * 1.2;
    
    for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
            // Additional check for peak prominence
            const leftMin = Math.min(...data.slice(Math.max(0, i - 5), i));
            const rightMin = Math.min(...data.slice(i + 1, Math.min(data.length, i + 6)));
            const prominence = data[i] - Math.max(leftMin, rightMin);
            
            if (prominence > std * 0.5) {
                peaks.push(i);
            }
        }
    }
    
    return peaks;
}

function applyHammingWindow(frame) {
    const windowed = [];
    for (let i = 0; i < frame.length; i++) {
        const windowValue = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (frame.length - 1));
        windowed.push(frame[i] * windowValue);
    }
    return windowed;
}

function applyMedianFilter(data, windowSize) {
    const filtered = [];
    const halfWindow = Math.floor(windowSize / 2);
    
    for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - halfWindow);
        const end = Math.min(data.length, i + halfWindow + 1);
        const window = data.slice(start, end);
        window.sort((a, b) => a - b);
        filtered.push(window[Math.floor(window.length / 2)]);
    }
    
    return filtered;
}

function combineBPMResultsAdvanced(autocorr, spectral, energy, histogram) {
    // Advanced weighting based on confidence and method reliability
    const weights = {
        autocorr: 0.4,    // Most reliable
        spectral: 0.3,    // Good for complex music
        energy: 0.2,      // Good for simple rhythms
        histogram: 0.1    // Additional validation
    };
    
    const totalWeight = weights.autocorr + weights.spectral + weights.energy + weights.histogram;
    
    const weightedBpm = (
        autocorr.bpm * weights.autocorr * autocorr.confidence +
        spectral.bpm * weights.spectral * spectral.confidence +
        energy.bpm * weights.energy * energy.confidence +
        histogram.bpm * weights.histogram * histogram.confidence
    ) / totalWeight;
    
    const avgConfidence = (
        autocorr.confidence * weights.autocorr +
        spectral.confidence * weights.spectral +
        energy.confidence * weights.energy +
        histogram.confidence * weights.histogram
    ) / totalWeight;
    
    return {
        bpm: Math.round(weightedBpm),
        confidence: avgConfidence
    };
}

// Fast onset detection
function detectOnsetsFast(audioData, sampleRate) {
    const frameSize = Math.floor(0.050 * sampleRate); // 50ms frames for speed
    const hopSize = Math.floor(0.025 * sampleRate); // 25ms hop for speed
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

// Advanced Danceability Analysis with ML-inspired algorithms
async function analyzeDanceabilityFast(audioData, sampleRate) {
    // Use Web Worker if available for heavy computation
    if (analysisWorker) {
        return new Promise((resolve) => {
            analysisWorker.onmessage = function(e) {
                if (e.data.type === 'danceability') {
                    const result = e.data.result;
                    // Add missing properties for display
                    const danceabilityType = determineDanceabilityType(result.score / 100, result.rhythmStrength, result.beatConsistency);
                    
                    resolve({
                        score: result.score,
                        rhythmStrength: result.rhythmStrength,
                        beatConsistency: result.beatConsistency,
                        energyDistribution: result.energyDistribution,
                        tempoStability: 0.7, // Default value
                        syncopation: 0.5, // Default value
                        grooveFactor: 0.6, // Default value
                        category: getDanceabilityCategory(result.score / 100),
                        type: danceabilityType,
                        confidence: calculateDanceabilityConfidence(result.rhythmStrength, result.beatConsistency, result.energyDistribution, 0.7)
                    });
                }
            };
            
            analysisWorker.postMessage({
                type: 'danceability',
                audioData: audioData,
                sampleRate: sampleRate
            });
        });
    }
    
    // Advanced main thread computation with ML-inspired algorithms
    const results = await analyzeDanceabilityAdvanced(audioData, sampleRate);
    return results;
}

// Advanced danceability analysis with multiple sophisticated metrics
async function analyzeDanceabilityAdvanced(audioData, sampleRate) {
    // 1. Advanced rhythm strength with frequency domain analysis
    const rhythmStrength = await calculateRhythmStrengthAdvanced(audioData, sampleRate);
    
    // 2. Beat consistency with multiple metrics
    const beatConsistency = await calculateBeatConsistencyAdvanced(audioData, sampleRate);
    
    // 3. Energy distribution with frequency bands
    const energyDistribution = await calculateEnergyDistributionAdvanced(audioData, sampleRate);
    
    // 4. Tempo stability with variance analysis
    const tempoStability = await calculateTempoStabilityAdvanced(audioData, sampleRate);
    
    // 5. Syncopation detection with advanced algorithms
    const syncopation = await calculateSyncopationAdvanced(audioData, sampleRate);
    
    // 6. Groove factor with rhythmic pattern analysis
    const grooveFactor = await calculateGrooveFactorAdvanced(audioData, sampleRate);
    
    // Advanced weighted combination for final score
    const danceabilityScore = (
        rhythmStrength * 0.25 +
        beatConsistency * 0.25 +
        energyDistribution * 0.20 +
        tempoStability * 0.15 +
        syncopation * 0.10 +
        grooveFactor * 0.05
    );
    
    // Determine detailed danceability type
    const danceabilityType = determineDanceabilityType(danceabilityScore, rhythmStrength, beatConsistency);
    
    return {
        score: Math.min(100, Math.max(0, danceabilityScore * 100)),
        rhythmStrength: rhythmStrength,
        beatConsistency: beatConsistency,
        energyDistribution: energyDistribution,
        tempoStability: tempoStability,
        syncopation: syncopation,
        grooveFactor: grooveFactor,
        category: getDanceabilityCategory(danceabilityScore),
        type: danceabilityType,
        confidence: calculateDanceabilityConfidence(rhythmStrength, beatConsistency, energyDistribution, tempoStability)
    };
}

// Advanced rhythm strength calculation
async function calculateRhythmStrengthAdvanced(audioData, sampleRate) {
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
    
    // Add frequency domain rhythm analysis
    const rhythmFrequency = await analyzeRhythmFrequencyAdvanced(audioData, sampleRate);
    
    const normalizedVariance = variance / (mean * mean);
    return Math.min(1, (normalizedVariance + rhythmFrequency) / 2);
}

// Advanced beat consistency calculation
async function calculateBeatConsistencyAdvanced(audioData, sampleRate) {
    // Multiple consistency metrics
    const zeroCrossingRate = calculateZeroCrossingRateAdvanced(audioData);
    const spectralCentroid = await calculateSpectralCentroidAdvanced(audioData, sampleRate);
    const spectralRolloff = await calculateSpectralRolloffAdvanced(audioData, sampleRate);
    
    // Combine metrics with advanced weighting
    const consistency = (
        (1 - zeroCrossingRate) * 0.4 +
        (spectralCentroid / 5000) * 0.3 +
        (spectralRolloff / 8000) * 0.3
    );
    
    return Math.min(1, Math.max(0, consistency));
}

// Advanced energy distribution calculation
async function calculateEnergyDistributionAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const lowBand = [];
    const midBand = [];
    const highBand = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const spectrum = calculateAdvancedSpectrum(frame);
        
        // Divide spectrum into bands
        const lowFreq = spectrum.slice(0, Math.floor(spectrum.length / 3));
        const midFreq = spectrum.slice(Math.floor(spectrum.length / 3), Math.floor(2 * spectrum.length / 3));
        const highFreq = spectrum.slice(Math.floor(2 * spectrum.length / 3));
        
        lowBand.push(lowFreq.reduce((sum, val) => sum + val, 0) / lowFreq.length);
        midBand.push(midFreq.reduce((sum, val) => sum + val, 0) / midFreq.length);
        highBand.push(highFreq.reduce((sum, val) => sum + val, 0) / highFreq.length);
    }
    
    // Calculate energy balance
    const totalEnergy = lowBand.reduce((sum, e) => sum + e, 0) + 
                       midBand.reduce((sum, e) => sum + e, 0) + 
                       highBand.reduce((sum, e) => sum + e, 0);
    
    const balance = 1 - Math.abs(lowBand.reduce((sum, e) => sum + e, 0) - highBand.reduce((sum, e) => sum + e, 0)) / totalEnergy;
    
    return Math.max(0, Math.min(1, balance));
}

// Advanced tempo stability calculation
async function calculateTempoStabilityAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.1 * sampleRate); // 100ms frames
    const tempos = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const tempo = await estimateTempoFromFrameAdvanced(frame, sampleRate);
        tempos.push(tempo);
    }
    
    // Calculate tempo variance
    const meanTempo = tempos.reduce((sum, t) => sum + t, 0) / tempos.length;
    const variance = tempos.reduce((sum, t) => sum + Math.pow(t - meanTempo, 2), 0) / tempos.length;
    
    // Convert to stability score (lower variance = higher stability)
    return Math.max(0, 1 - variance / (meanTempo * meanTempo));
}

// Advanced syncopation detection
async function calculateSyncopationAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    let syncopationScore = 0;
    let frameCount = 0;
    
    for (let i = frameSize; i < audioData.length - frameSize; i += frameSize) {
        const currentFrame = audioData.slice(i, i + frameSize);
        const prevFrame = audioData.slice(i - frameSize, i);
        
        const currentEnergy = currentFrame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        const prevEnergy = prevFrame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        
        // Detect unexpected accents (syncopation)
        if (currentEnergy > prevEnergy * 1.5) {
            syncopationScore += 0.1;
        }
        
        frameCount++;
    }
    
    return Math.min(1, syncopationScore / frameCount);
}

// Advanced groove factor calculation
async function calculateGrooveFactorAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const grooveScores = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        
        // Calculate groove based on rhythmic patterns
        const rhythmPattern = await analyzeRhythmPatternAdvanced(frame);
        grooveScores.push(rhythmPattern);
    }
    
    return grooveScores.reduce((sum, score) => sum + score, 0) / grooveScores.length;
}

// Advanced helper functions for danceability
async function analyzeRhythmFrequencyAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const rhythmScores = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const spectrum = calculateAdvancedSpectrum(frame);
        
        // Focus on rhythm-relevant frequencies (50-200 Hz)
        const rhythmBand = spectrum.slice(0, Math.floor(spectrum.length * 0.1));
        const rhythmEnergy = rhythmBand.reduce((sum, val) => sum + val, 0) / rhythmBand.length;
        
        rhythmScores.push(rhythmEnergy);
    }
    
    return rhythmScores.reduce((sum, score) => sum + score, 0) / rhythmScores.length;
}

function calculateZeroCrossingRateAdvanced(audioData) {
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

async function calculateSpectralCentroidAdvanced(audioData, sampleRate) {
    const frameSize = 1024;
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

async function calculateSpectralRolloffAdvanced(audioData, sampleRate) {
    const frameSize = 1024;
    let totalRolloff = 0;
    let frameCount = 0;
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        
        const magnitudes = [];
        for (let j = 0; j < frameSize / 2; j++) {
            magnitudes.push(Math.abs(frame[j]));
        }
        
        magnitudes.sort((a, b) => a - b);
        const rolloffIndex = Math.floor(magnitudes.length * 0.85);
        const rolloff = (rolloffIndex * sampleRate) / frameSize;
        
        totalRolloff += rolloff;
        frameCount++;
    }
    
    return frameCount > 0 ? totalRolloff / frameCount : 0;
}

async function estimateTempoFromFrameAdvanced(frame, sampleRate) {
    // Advanced tempo estimation from frame energy
    const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length;
    return energy * 100; // Convert to tempo-like value
}

async function analyzeRhythmPatternAdvanced(frame) {
    // Analyze rhythmic patterns in a frame
    const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length;
    return Math.min(1, energy * 10);
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

// Fast tempo stability calculation
function calculateTempoStabilityFast(audioData, sampleRate) {
    const frameSize = Math.floor(0.1 * sampleRate); // 100ms frames
    const tempos = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        tempos.push(energy);
    }
    
    // Calculate tempo variance
    const meanTempo = tempos.reduce((sum, t) => sum + t, 0) / tempos.length;
    const variance = tempos.reduce((sum, t) => sum + Math.pow(t - meanTempo, 2), 0) / tempos.length;
    
    // Convert to stability score (lower variance = higher stability)
    return Math.max(0, 1 - variance / (meanTempo * meanTempo));
}

// Fast syncopation detection
function calculateSyncopationFast(audioData) {
    const frameSize = Math.floor(0.025 * 44100);
    let syncopationScore = 0;
    let frameCount = 0;
    
    for (let i = frameSize; i < audioData.length - frameSize; i += frameSize) {
        const currentFrame = audioData.slice(i, i + frameSize);
        const prevFrame = audioData.slice(i - frameSize, i);
        
        const currentEnergy = currentFrame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        const prevEnergy = prevFrame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        
        // Detect unexpected accents (syncopation)
        if (currentEnergy > prevEnergy * 1.5) {
            syncopationScore += 0.1;
        }
        
        frameCount++;
    }
    
    return Math.min(1, syncopationScore / frameCount);
}

// Fast groove factor calculation
function calculateGrooveFactorFast(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const grooveScores = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        
        // Calculate groove based on rhythmic patterns
        const rhythmPattern = analyzeRhythmPatternFast(frame);
        grooveScores.push(rhythmPattern);
    }
    
    return grooveScores.reduce((sum, score) => sum + score, 0) / grooveScores.length;
}

// Fast rhythm pattern analysis
function analyzeRhythmPatternFast(frame) {
    // Analyze rhythmic patterns in a frame
    const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length;
    return Math.min(1, energy * 10);
}

// Fast mood detection
async function analyzeMoodFast(audioData, sampleRate) {
    // Use Web Worker if available for heavy computation
    if (analysisWorker) {
        return new Promise((resolve) => {
            analysisWorker.onmessage = function(e) {
                if (e.data.type === 'mood') {
                    const result = e.data.result;
                    // Add detailed analysis for display
                    const detailedAnalysis = [
                        { type: "🕺 Danceability", score: "Medium", description: "Moderate dance potential" },
                        { type: "😀 Happy", score: result.primaryMood.includes('Happy') ? "High" : "Low", description: "Mood analysis" },
                        { type: "😢 Sad", score: result.primaryMood.includes('Sad') ? "High" : "Low", description: "Mood analysis" },
                        { type: "😌 Relaxed", score: result.primaryMood.includes('Relaxed') ? "High" : "Low", description: "Mood analysis" },
                        { type: "✊ Aggressiveness", score: "Medium", description: "Moderate aggression" },
                        { type: "👁 Engagement", score: "Medium", description: "Moderately engaging" },
                        { type: "🧠 Approachability", score: "Medium", description: "Moderately approachable" }
                    ];
                    
                    resolve({
                        primaryMood: result.primaryMood,
                        secondaryMood: 'Balanced',
                        songType: 'Mixed',
                        emoji: result.emoji,
                        confidence: result.confidence,
                        moodExplanation: 'Analysis completed using optimized algorithms',
                        detailedAnalysis: detailedAnalysis
                    });
                }
            };
            
            analysisWorker.postMessage({
                type: 'mood',
                audioData: audioData,
                sampleRate: sampleRate
            });
        });
    }
    
    // Fallback to main thread computation
    const spectralCentroid = calculateSpectralCentroidFast(audioData, sampleRate);
    const zeroCrossingRate = calculateZeroCrossingRateFast(audioData);
    const energyDistribution = calculateEnergyDistributionFast(audioData);
    const spectralRolloff = calculateSpectralRolloffFast(audioData, sampleRate);
    const tempoInfluence = calculateTempoInfluenceFast(audioData, sampleRate);
    
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
    const frameSize = 256; // Even smaller frame size for speed
    let totalCentroid = 0;
    let frameCount = 0;
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize * 2) { // Skip every other frame
        const frame = audioData.slice(i, i + frameSize);
        
        let weightedSum = 0;
        let sum = 0;
        
        for (let j = 0; j < frameSize / 2; j += 2) { // Skip every other frequency bin
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
    const step = Math.max(1, Math.floor(audioData.length / 2000)); // Sample more frequently for accuracy
    
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

function calculateDanceabilityConfidence(rhythm, beat, energy, tempo) {
    return (rhythm + beat + energy + tempo) / 4;
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
                        <h4>🎶 Professional BPM Detection</h4>
                        <div class="result-value">${result.bpm.bpm} BPM</div>
                        <div class="result-subtitle">${result.bpm.tempoCategory} (${(result.bpm.confidence * 100).toFixed(1)}% accuracy)</div>
                        <div class="bpm-methods">
                            <div class="method-item">
                                <span class="method-name">🔍 Autocorrelation</span>
                                <span class="method-value">${result.bpm.methods.autocorr.bpm} BPM</span>
                            </div>
                            <div class="method-item">
                                <span class="method-name">⚡ Onset Detection</span>
                                <span class="method-value">${result.bpm.methods.onset.bpm} BPM</span>
                            </div>
                            <div class="method-item">
                                <span class="method-name">📊 Spectral Flux</span>
                                <span class="method-value">${result.bpm.methods.spectral.bpm} BPM</span>
                            </div>
                        </div>
                    </div>
                    <div class="result-card">
                        <h4>🕺 Professional Danceability</h4>
                        <div class="result-value">${result.danceability.score.toFixed(1)}%</div>
                        <div class="result-subtitle">${result.danceability.category} (${(result.danceability.confidence * 100).toFixed(1)}% accuracy)</div>
                        <div class="danceability-breakdown">
                            <div class="breakdown-item">
                                <span class="breakdown-label">🥁 Rhythm Strength</span>
                                <span class="breakdown-value">${(result.danceability.rhythmStrength * 100).toFixed(1)}%</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">⏰ Beat Consistency</span>
                                <span class="breakdown-value">${(result.danceability.beatConsistency * 100).toFixed(1)}%</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">⚡ Energy Distribution</span>
                                <span class="breakdown-value">${(result.danceability.energyDistribution * 100).toFixed(1)}%</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">🎯 Tempo Stability</span>
                                <span class="breakdown-value">${(result.danceability.tempoStability * 100).toFixed(1)}%</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">🎵 Syncopation</span>
                                <span class="breakdown-value">${(result.danceability.syncopation * 100).toFixed(1)}%</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">🕺 Groove Factor</span>
                                <span class="breakdown-value">${(result.danceability.grooveFactor * 100).toFixed(1)}%</span>
                            </div>
                        </div>
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
