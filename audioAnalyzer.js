// Server-side audio analyzer module
const fs = require('fs');
const path = require('path');

// Audio analysis functions adapted for server-side processing
async function analyzeAudioBuffer(audioBuffer, fileName) {
    try {
        // Get audio data
        const audioData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate || 44100;
        
        // Downsample audio for faster processing
        const downsampledData = downsampleAudio(audioData, sampleRate, 11025);
        const downsampledSampleRate = 11025;
        
        // Perform analysis
        const bpmAnalysis = await analyzeBPMAdvanced(downsampledData, downsampledSampleRate);
        const danceabilityAnalysis = await analyzeDanceabilityAdvanced(downsampledData, downsampledSampleRate);
        const moodAnalysis = await analyzeMoodAdvanced(downsampledData, downsampledSampleRate);
        
        return {
            bpm: bpmAnalysis,
            danceability: danceabilityAnalysis,
            mood: moodAnalysis
        };
        
    } catch (error) {
        console.error('Error in audio analysis:', error);
        throw error;
    }
}

// Advanced BPM detection
async function analyzeBPMAdvanced(audioData, sampleRate) {
    // Method 1: Advanced autocorrelation
    const autocorrResult = await detectBPMAdvancedAutocorr(audioData, sampleRate);
    
    // Method 2: Spectral flux
    const spectralResult = await detectBPMAdvancedSpectral(audioData, sampleRate);
    
    // Method 3: Energy-based
    const energyResult = await detectBPMAdvancedEnergy(audioData, sampleRate);
    
    // Method 4: Histogram
    const histogramResult = await detectBPMHistogram(audioData, sampleRate);
    
    // Combine results
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

// Advanced autocorrelation
async function detectBPMAdvancedAutocorr(audioData, sampleRate) {
    const frameSize = 2048;
    const hopSize = 512;
    const frames = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);
        frames.push(frame);
    }
    
    const autocorrelations = frames.map(frame => calculateAdvancedAutocorrelation(frame));
    
    const peakIntervals = [];
    for (const autocorr of autocorrelations) {
        const peaks = findPeaksAdvanced(autocorr);
        for (let i = 1; i < peaks.length; i++) {
            const interval = peaks[i] - peaks[i - 1];
            if (interval > 0 && interval < sampleRate / 2) {
                peakIntervals.push(interval);
            }
        }
    }
    
    const bpms = peakIntervals.map(interval => {
        const timeInSeconds = interval * hopSize / sampleRate;
        return 60 / timeInSeconds;
    }).filter(bpm => bpm >= 60 && bpm <= 200);
    
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
        confidence: Math.min(1, maxCount / bpms.length)
    };
}

// Advanced spectral flux
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
    
    const peaks = findPeaksAdvanced(spectralFlux);
    
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

// Advanced energy-based
async function detectBPMAdvancedEnergy(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const hopSize = Math.floor(0.010 * sampleRate);
    const onsets = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);
        const energy = frame.reduce((sum, val) => sum + val * val, 0);
        onsets.push(energy);
    }
    
    const smoothedOnsets = applyMedianFilter(onsets, 5);
    const peaks = findPeaksAdvanced(smoothedOnsets);
    
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    const bpms = intervals.map(interval => {
        const timeInSeconds = interval * hopSize / sampleRate;
        return 60 / timeInSeconds;
    }).filter(bpm => bpm >= 60 && bpm <= 200);
    
    const sortedBpms = bpms.sort((a, b) => a - b);
    const medianBpm = sortedBpms[Math.floor(sortedBpms.length / 2)] || 120;
    
    return {
        bpm: Math.round(medianBpm),
        confidence: sortedBpms.length / intervals.length
    };
}

// Histogram analysis
async function detectBPMHistogram(audioData, sampleRate) {
    const frameSize = Math.floor(0.050 * sampleRate);
    const hopSize = Math.floor(0.025 * sampleRate);
    const tempos = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
        const frame = audioData.slice(i, i + frameSize);
        const spectrum = calculateAdvancedSpectrum(frame);
        
        const rhythmBand = spectrum.slice(0, Math.floor(spectrum.length * 0.1));
        const rhythmEnergy = rhythmBand.reduce((sum, val) => sum + val, 0) / rhythmBand.length;
        tempos.push(rhythmEnergy);
    }
    
    const peaks = findPeaksAdvanced(tempos);
    
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    const bpms = intervals.map(interval => {
        const timeInSeconds = interval * hopSize / sampleRate;
        return 60 / timeInSeconds;
    }).filter(bpm => bpm >= 60 && bpm <= 200);
    
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

// Advanced danceability analysis
async function analyzeDanceabilityAdvanced(audioData, sampleRate) {
    const rhythmStrength = await calculateRhythmStrengthAdvanced(audioData, sampleRate);
    const beatConsistency = await calculateBeatConsistencyAdvanced(audioData, sampleRate);
    const energyDistribution = await calculateEnergyDistributionAdvanced(audioData, sampleRate);
    const tempoStability = await calculateTempoStabilityAdvanced(audioData, sampleRate);
    const syncopation = await calculateSyncopationAdvanced(audioData, sampleRate);
    const grooveFactor = await calculateGrooveFactorAdvanced(audioData, sampleRate);
    
    const danceabilityScore = (
        rhythmStrength * 0.25 +
        beatConsistency * 0.25 +
        energyDistribution * 0.20 +
        tempoStability * 0.15 +
        syncopation * 0.10 +
        grooveFactor * 0.05
    );
    
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

// Advanced mood analysis
async function analyzeMoodAdvanced(audioData, sampleRate) {
    const spectralCentroid = await calculateSpectralCentroidAdvanced(audioData, sampleRate);
    const zeroCrossingRate = calculateZeroCrossingRateAdvanced(audioData);
    const energyDistribution = await calculateEnergyDistributionAdvanced(audioData, sampleRate);
    const spectralRolloff = await calculateSpectralRolloffAdvanced(audioData, sampleRate);
    const tempoInfluence = await calculateTempoInfluenceAdvanced(audioData, sampleRate);
    
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

// Helper functions
function calculateAdvancedAutocorrelation(frame) {
    const length = frame.length;
    const autocorr = new Array(length).fill(0);
    
    const windowedFrame = applyHammingWindow(frame);
    
    for (let lag = 0; lag < length; lag++) {
        for (let i = 0; i < length - lag; i++) {
            autocorr[lag] += windowedFrame[i] * windowedFrame[i + lag];
        }
    }
    
    return autocorr;
}

function calculateAdvancedSpectrum(frame) {
    const windowedFrame = applyHammingWindow(frame);
    
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
    
    const threshold = mean + std * 1.2;
    
    for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > threshold && data[i] > data[i - 1] && data[i] > data[i + 1]) {
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
    const weights = {
        autocorr: 0.4,
        spectral: 0.3,
        energy: 0.2,
        histogram: 0.1
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

// Danceability helper functions
async function calculateRhythmStrengthAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const energies = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const energy = Math.sqrt(frame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize);
        energies.push(energy);
    }
    
    const mean = energies.reduce((sum, e) => sum + e, 0) / energies.length;
    const variance = energies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energies.length;
    
    const rhythmFrequency = await analyzeRhythmFrequencyAdvanced(audioData, sampleRate);
    const normalizedVariance = variance / (mean * mean);
    
    return Math.min(1, (normalizedVariance + rhythmFrequency) / 2);
}

async function calculateBeatConsistencyAdvanced(audioData, sampleRate) {
    const zeroCrossingRate = calculateZeroCrossingRateAdvanced(audioData);
    const spectralCentroid = await calculateSpectralCentroidAdvanced(audioData, sampleRate);
    const spectralRolloff = await calculateSpectralRolloffAdvanced(audioData, sampleRate);
    
    const consistency = (
        (1 - zeroCrossingRate) * 0.4 +
        (spectralCentroid / 5000) * 0.3 +
        (spectralRolloff / 8000) * 0.3
    );
    
    return Math.min(1, Math.max(0, consistency));
}

async function calculateEnergyDistributionAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const lowBand = [];
    const midBand = [];
    const highBand = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const spectrum = calculateAdvancedSpectrum(frame);
        
        const lowFreq = spectrum.slice(0, Math.floor(spectrum.length / 3));
        const midFreq = spectrum.slice(Math.floor(spectrum.length / 3), Math.floor(2 * spectrum.length / 3));
        const highFreq = spectrum.slice(Math.floor(2 * spectrum.length / 3));
        
        lowBand.push(lowFreq.reduce((sum, val) => sum + val, 0) / lowFreq.length);
        midBand.push(midFreq.reduce((sum, val) => sum + val, 0) / midFreq.length);
        highBand.push(highFreq.reduce((sum, val) => sum + val, 0) / highFreq.length);
    }
    
    const totalEnergy = lowBand.reduce((sum, e) => sum + e, 0) + 
                       midBand.reduce((sum, e) => sum + e, 0) + 
                       highBand.reduce((sum, e) => sum + e, 0);
    
    const balance = 1 - Math.abs(lowBand.reduce((sum, e) => sum + e, 0) - highBand.reduce((sum, e) => sum + e, 0)) / totalEnergy;
    
    return Math.max(0, Math.min(1, balance));
}

async function calculateTempoStabilityAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.1 * sampleRate);
    const tempos = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const tempo = await estimateTempoFromFrameAdvanced(frame, sampleRate);
        tempos.push(tempo);
    }
    
    const meanTempo = tempos.reduce((sum, t) => sum + t, 0) / tempos.length;
    const variance = tempos.reduce((sum, t) => sum + Math.pow(t - meanTempo, 2), 0) / tempos.length;
    
    return Math.max(0, 1 - variance / (meanTempo * meanTempo));
}

async function calculateSyncopationAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    let syncopationScore = 0;
    let frameCount = 0;
    
    for (let i = frameSize; i < audioData.length - frameSize; i += frameSize) {
        const currentFrame = audioData.slice(i, i + frameSize);
        const prevFrame = audioData.slice(i - frameSize, i);
        
        const currentEnergy = currentFrame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        const prevEnergy = prevFrame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        
        if (currentEnergy > prevEnergy * 1.5) {
            syncopationScore += 0.1;
        }
        
        frameCount++;
    }
    
    return Math.min(1, syncopationScore / frameCount);
}

async function calculateGrooveFactorAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const grooveScores = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const rhythmPattern = await analyzeRhythmPatternAdvanced(frame);
        grooveScores.push(rhythmPattern);
    }
    
    return grooveScores.reduce((sum, score) => sum + score, 0) / grooveScores.length;
}

// Mood helper functions
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

function calculateZeroCrossingRateAdvanced(audioData) {
    let zeroCrossings = 0;
    const step = Math.max(1, Math.floor(audioData.length / 5000));
    
    for (let i = step; i < audioData.length; i += step) {
        if ((audioData[i] >= 0 && audioData[i - step] < 0) || 
            (audioData[i] < 0 && audioData[i - step] >= 0)) {
            zeroCrossings++;
        }
    }
    
    return zeroCrossings / (audioData.length / step);
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

async function calculateTempoInfluenceAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.1 * sampleRate);
    const tempos = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frameSize;
        tempos.push(energy);
    }
    
    const mean = tempos.reduce((sum, t) => sum + t, 0) / tempos.length;
    const variance = tempos.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / tempos.length;
    
    return Math.max(0, 1 - variance / (mean * mean));
}

// Additional helper functions
async function analyzeRhythmFrequencyAdvanced(audioData, sampleRate) {
    const frameSize = Math.floor(0.025 * sampleRate);
    const rhythmScores = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += frameSize) {
        const frame = audioData.slice(i, i + frameSize);
        const spectrum = calculateAdvancedSpectrum(frame);
        
        const rhythmBand = spectrum.slice(0, Math.floor(spectrum.length * 0.1));
        const rhythmEnergy = rhythmBand.reduce((sum, val) => sum + val, 0) / rhythmBand.length;
        
        rhythmScores.push(rhythmEnergy);
    }
    
    return rhythmScores.reduce((sum, score) => sum + score, 0) / rhythmScores.length;
}

async function estimateTempoFromFrameAdvanced(frame, sampleRate) {
    const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length;
    return energy * 100;
}

async function analyzeRhythmPatternAdvanced(frame) {
    const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length;
    return Math.min(1, energy * 10);
}

function downsampleAudio(audioData, originalSampleRate, targetSampleRate) {
    const ratio = originalSampleRate / targetSampleRate;
    const downsampledData = [];
    
    for (let i = 0; i < audioData.length; i += ratio) {
        downsampledData.push(audioData[Math.floor(i)]);
    }
    
    return downsampledData;
}

// Utility functions
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
    
    if (rhythmStrength > 0.7) {
        types.push({ type: "🥁 Strong Rhythm", emoji: "🥁", description: "Clear rhythmic patterns" });
    }
    
    if (beatConsistency > 0.7) {
        types.push({ type: "⏰ Consistent Beat", emoji: "⏰", description: "Steady tempo" });
    }
    
    return types;
}

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

module.exports = {
    analyzeAudioBuffer
};
