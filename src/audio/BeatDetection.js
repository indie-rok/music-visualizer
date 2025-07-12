/**
 * BeatDetection - Advanced audio analysis for beat detection and tempo analysis
 * Implements kick drum detection, snare detection, and BPM estimation
 */

export class BeatDetection {
    constructor(audioEngine) {
        this.audioEngine = audioEngine;
        
        // Kick drum detection parameters
        this.kickFreqRange = { min: 20, max: 200 };
        this.kickThreshold = 0.1; // Very sensitive
        this.kickCooldown = 100; // Reduced cooldown
        this.lastKickTime = 0;
        
        // Snare drum detection parameters
        this.snareFreqRange = { min: 200, max: 5000 };
        this.snareThreshold = 0.15;
        this.snareCooldown = 120; // ms
        this.lastSnareTime = 0;
        
        // Onset detection parameters
        this.spectralFluxHistory = [];
        this.spectralFluxWindowSize = 10;
        this.onsetThreshold = 0.05; // Very sensitive
        
        // Adaptive thresholding
        this.energyHistory = [];
        this.energyWindowSize = 20;
        this.adaptiveMultiplier = 1.2; // Reduced from 1.5 to be less strict
        
        // Previous frame data for spectral flux calculation
        this.previousFrequencyData = null;
        
        // Beat detection results
        this.detectedBeats = [];
        this.kickDetections = [];
        this.snareDetections = [];
        
        // BPM estimation
        this.bpm = 0;
        this.bpmHistory = [];
        this.bpmWindowSize = 8; // Number of intervals to analyze
        this.lastBpmUpdate = 0;
        this.bpmUpdateInterval = 1000; // Update BPM every 1 second
        
        // RMS Energy calculation
        this.rmsWindowSize = 1024; // Default window size for RMS
        this.rmsOverlap = 0.5; // 50% overlap between windows
        this.rmsHistory = [];
        this.rmsHistorySize = 30; // Keep 30 RMS measurements for averaging
        
        // Zero Crossing Rate calculation
        this.zcrWindowSize = 1024; // Default window size for ZCR
        this.zcrHistory = [];
        this.zcrHistorySize = 30; // Keep 30 ZCR measurements for averaging
        
        // Beat confidence scoring
        this.confidenceHistory = [];
        this.confidenceHistorySize = 20; // Keep 20 confidence measurements
        this.beatConfidence = 0;
        this.kickConfidence = 0;
        this.snareConfidence = 0;
        this.tempoConfidence = 0;
        
        console.log('🥁 BeatDetection initialized');
    }
    
    /**
     * Analyze current audio frame for beat detection
     */
    analyzeFrame() {
        const analysisData = this.audioEngine.getAnalysisData();
        if (!analysisData || !analysisData.frequencyData) {
            return null;
        }
        
        const currentTime = performance.now();
        const frequencyData = analysisData.frequencyData;
        
        // Calculate kick drum energy in low frequency range
        const kickEnergy = this.calculateKickEnergy(frequencyData);
        
        // Calculate snare drum energy in mid frequency range
        const snareEnergy = this.calculateSnareEnergy(frequencyData);
        
        // Calculate spectral flux for onset detection
        const spectralFlux = this.calculateSpectralFlux(frequencyData);
        
        // Calculate spectral centroid for brightness analysis
        const spectralCentroid = this.calculateSpectralCentroid(frequencyData);
        
        // Calculate RMS energy from time domain data
        const rmsEnergy = this.calculateRMSEnergy(analysisData.timeData);
        
        // Calculate Zero Crossing Rate from time domain data
        const zeroCrossingRate = this.calculateZeroCrossingRate(analysisData.timeData);
        
        // Update energy history for adaptive thresholding
        this.updateEnergyHistory(kickEnergy);
        
        // Detect kick drum with adaptive threshold
        const kickDetected = this.detectKick(kickEnergy, spectralFlux, currentTime);
        
        // Detect snare drum using energy and transient analysis
        const snareDetected = this.detectSnare(snareEnergy, spectralFlux, spectralCentroid, currentTime);
        
        // Store previous frame for next spectral flux calculation
        this.previousFrequencyData = new Uint8Array(frequencyData);
        
        // Update BPM estimation periodically
        if (currentTime - this.lastBpmUpdate > this.bpmUpdateInterval) {
            this.updateBPM();
            this.lastBpmUpdate = currentTime;
        }
        
        // Calculate beat confidence scores
        this.updateBeatConfidence();
        
        return {
            kickEnergy,
            snareEnergy,
            spectralFlux,
            spectralCentroid,
            rmsEnergy,
            zeroCrossingRate,
            kickDetected,
            snareDetected,
            currentTime,
            adaptiveThreshold: this.getAdaptiveThreshold(),
            bpm: this.bpm,
            beatConfidence: this.beatConfidence,
            kickConfidence: this.kickConfidence,
            snareConfidence: this.snareConfidence,
            tempoConfidence: this.tempoConfidence
        };
    }
    
    /**
     * Calculate kick drum energy in low frequency range (20-200Hz)
     */
    calculateKickEnergy(frequencyData) {
        const sampleRate = this.audioEngine.audioContext.sampleRate;
        const fftSize = this.audioEngine.fftSize;
        const nyquist = sampleRate / 2;
        const binSize = nyquist / (fftSize / 2);
        
        const startBin = Math.floor(this.kickFreqRange.min / binSize);
        const endBin = Math.floor(this.kickFreqRange.max / binSize);
        
        let energy = 0;
        let count = 0;
        
        for (let i = startBin; i <= endBin && i < frequencyData.length; i++) {
            energy += frequencyData[i] * frequencyData[i]; // Square for energy
            count++;
        }
        
        // Normalize energy
        return count > 0 ? Math.sqrt(energy / count) / 255 : 0;
    }
    
    /**
     * Calculate snare drum energy in mid frequency range (200-5000Hz)
     */
    calculateSnareEnergy(frequencyData) {
        const sampleRate = this.audioEngine.audioContext.sampleRate;
        const fftSize = this.audioEngine.fftSize;
        const nyquist = sampleRate / 2;
        const binSize = nyquist / (fftSize / 2);
        
        const startBin = Math.floor(this.snareFreqRange.min / binSize);
        const endBin = Math.floor(this.snareFreqRange.max / binSize);
        
        let energy = 0;
        let count = 0;
        
        // Weight higher frequencies more for snare detection
        for (let i = startBin; i <= endBin && i < frequencyData.length; i++) {
            const frequency = i * binSize;
            const weight = frequency > 1000 ? 1.5 : 1.0; // Boost 1kHz+ for snare brightness
            energy += frequencyData[i] * frequencyData[i] * weight;
            count++;
        }
        
        // Normalize energy
        return count > 0 ? Math.sqrt(energy / count) / 255 : 0;
    }
    
    /**
     * Calculate spectral centroid for brightness analysis
     */
    calculateSpectralCentroid(frequencyData) {
        const sampleRate = this.audioEngine.audioContext.sampleRate;
        const fftSize = this.audioEngine.fftSize;
        const nyquist = sampleRate / 2;
        const binSize = nyquist / (fftSize / 2);
        
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            const frequency = i * binSize;
            const magnitude = frequencyData[i];
            
            weightedSum += frequency * magnitude;
            magnitudeSum += magnitude;
        }
        
        // Return normalized spectral centroid (0-1)
        return magnitudeSum > 0 ? (weightedSum / magnitudeSum) / nyquist : 0;
    }
    
    /**
     * Calculate RMS energy from time domain data
     */
    calculateRMSEnergy(timeData) {
        let sumOfSquares = 0;
        const length = timeData.length;
        
        // Convert from uint8 to float and calculate sum of squares
        for (let i = 0; i < length; i++) {
            // Convert from 0-255 to -1 to 1
            const sample = (timeData[i] - 128) / 128;
            sumOfSquares += sample * sample;
        }
        
        // Calculate RMS
        const rms = Math.sqrt(sumOfSquares / length);
        
        // Update RMS history for smoothing
        this.updateRMSHistory(rms);
        
        return rms;
    }
    
    /**
     * Calculate RMS energy with windowing support
     */
    calculateWindowedRMSEnergy(timeData, windowSize = null, overlap = null) {
        windowSize = windowSize || this.rmsWindowSize;
        overlap = overlap || this.rmsOverlap;
        
        const hopSize = Math.floor(windowSize * (1 - overlap));
        const windows = [];
        
        // Extract overlapping windows
        for (let i = 0; i <= timeData.length - windowSize; i += hopSize) {
            const window = timeData.slice(i, i + windowSize);
            const rms = this.calculateRMSFromWindow(window);
            windows.push(rms);
        }
        
        // Return average RMS across all windows
        return windows.length > 0 
            ? windows.reduce((sum, rms) => sum + rms, 0) / windows.length 
            : 0;
    }
    
    /**
     * Calculate RMS for a single window
     */
    calculateRMSFromWindow(window) {
        let sumOfSquares = 0;
        
        for (let i = 0; i < window.length; i++) {
            // Convert from 0-255 to -1 to 1
            const sample = (window[i] - 128) / 128;
            sumOfSquares += sample * sample;
        }
        
        return Math.sqrt(sumOfSquares / window.length);
    }
    
    /**
     * Update RMS history for smoothing and analysis
     */
    updateRMSHistory(rms) {
        this.rmsHistory.push(rms);
        
        // Keep only the most recent values
        if (this.rmsHistory.length > this.rmsHistorySize) {
            this.rmsHistory.shift();
        }
    }
    
    /**
     * Get smoothed RMS energy
     */
    getSmoothedRMSEnergy() {
        if (this.rmsHistory.length === 0) {
            return 0;
        }
        
        // Simple moving average
        return this.rmsHistory.reduce((sum, rms) => sum + rms, 0) / this.rmsHistory.length;
    }
    
    /**
     * Get RMS energy statistics
     */
    getRMSStats() {
        if (this.rmsHistory.length === 0) {
            return {
                current: 0,
                average: 0,
                min: 0,
                max: 0,
                variance: 0
            };
        }
        
        const current = this.rmsHistory[this.rmsHistory.length - 1];
        const average = this.getSmoothedRMSEnergy();
        const min = Math.min(...this.rmsHistory);
        const max = Math.max(...this.rmsHistory);
        
        // Calculate variance
        const variance = this.rmsHistory.reduce((sum, rms) => {
            return sum + Math.pow(rms - average, 2);
        }, 0) / this.rmsHistory.length;
        
        return {
            current,
            average,
            min,
            max,
            variance,
            stdDev: Math.sqrt(variance)
        };
    }
    
    /**
     * Calculate Zero Crossing Rate from time domain data
     */
    calculateZeroCrossingRate(timeData) {
        let crossings = 0;
        const length = timeData.length;
        
        // Convert first sample
        let previousSample = (timeData[0] - 128) / 128;
        
        // Count zero crossings
        for (let i = 1; i < length; i++) {
            // Convert from 0-255 to -1 to 1
            const currentSample = (timeData[i] - 128) / 128;
            
            // Check for sign change (zero crossing)
            if ((previousSample >= 0 && currentSample < 0) || 
                (previousSample < 0 && currentSample >= 0)) {
                crossings++;
            }
            
            previousSample = currentSample;
        }
        
        // Normalize by number of samples and update history
        const zcr = crossings / (length - 1);
        this.updateZCRHistory(zcr);
        
        return zcr;
    }
    
    /**
     * Calculate ZCR with windowing support
     */
    calculateWindowedZCR(timeData, windowSize = null) {
        windowSize = windowSize || this.zcrWindowSize;
        
        const windows = [];
        
        // Extract windows
        for (let i = 0; i <= timeData.length - windowSize; i += Math.floor(windowSize / 2)) {
            const window = timeData.slice(i, i + windowSize);
            const zcr = this.calculateZCRFromWindow(window);
            windows.push(zcr);
        }
        
        // Return average ZCR across all windows
        return windows.length > 0 
            ? windows.reduce((sum, zcr) => sum + zcr, 0) / windows.length 
            : 0;
    }
    
    /**
     * Calculate ZCR for a single window
     */
    calculateZCRFromWindow(window) {
        let crossings = 0;
        let previousSample = (window[0] - 128) / 128;
        
        for (let i = 1; i < window.length; i++) {
            const currentSample = (window[i] - 128) / 128;
            
            if ((previousSample >= 0 && currentSample < 0) || 
                (previousSample < 0 && currentSample >= 0)) {
                crossings++;
            }
            
            previousSample = currentSample;
        }
        
        return crossings / (window.length - 1);
    }
    
    /**
     * Update ZCR history for smoothing and analysis
     */
    updateZCRHistory(zcr) {
        this.zcrHistory.push(zcr);
        
        // Keep only the most recent values
        if (this.zcrHistory.length > this.zcrHistorySize) {
            this.zcrHistory.shift();
        }
    }
    
    /**
     * Get smoothed ZCR
     */
    getSmoothedZCR() {
        if (this.zcrHistory.length === 0) {
            return 0;
        }
        
        // Simple moving average
        return this.zcrHistory.reduce((sum, zcr) => sum + zcr, 0) / this.zcrHistory.length;
    }
    
    /**
     * Get ZCR statistics
     */
    getZCRStats() {
        if (this.zcrHistory.length === 0) {
            return {
                current: 0,
                average: 0,
                min: 0,
                max: 0,
                variance: 0,
                noisiness: 'unknown'
            };
        }
        
        const current = this.zcrHistory[this.zcrHistory.length - 1];
        const average = this.getSmoothedZCR();
        const min = Math.min(...this.zcrHistory);
        const max = Math.max(...this.zcrHistory);
        
        // Calculate variance
        const variance = this.zcrHistory.reduce((sum, zcr) => {
            return sum + Math.pow(zcr - average, 2);
        }, 0) / this.zcrHistory.length;
        
        // Classify noisiness based on ZCR
        let noisiness;
        if (current < 0.02) {
            noisiness = 'tonal'; // Low ZCR = tonal/musical content
        } else if (current < 0.05) {
            noisiness = 'mixed'; // Medium ZCR = mixed content
        } else {
            noisiness = 'noisy'; // High ZCR = noisy/percussive content
        }
        
        return {
            current,
            average,
            min,
            max,
            variance,
            stdDev: Math.sqrt(variance),
            noisiness
        };
    }
    
    /**
     * Update beat confidence scores based on detection patterns
     */
    updateBeatConfidence() {
        const currentTime = performance.now();
        
        // Calculate individual confidence scores
        this.kickConfidence = this.calculateKickConfidence(currentTime);
        this.snareConfidence = this.calculateSnareConfidence(currentTime);
        this.tempoConfidence = this.calculateTempoConfidence();
        
        // Overall beat confidence is weighted average
        this.beatConfidence = (
            this.kickConfidence * 0.4 +      // 40% weight on kick consistency
            this.snareConfidence * 0.3 +     // 30% weight on snare consistency  
            this.tempoConfidence * 0.3       // 30% weight on tempo stability
        );
        
        // Store confidence history for smoothing
        this.confidenceHistory.push(this.beatConfidence);
        if (this.confidenceHistory.length > this.confidenceHistorySize) {
            this.confidenceHistory.shift();
        }
    }
    
    /**
     * Calculate kick detection confidence based on pattern consistency
     */
    calculateKickConfidence(currentTime) {
        if (this.kickDetections.length < 3) {
            return 0;
        }
        
        // Get recent kicks (last 8 seconds)
        const recentKicks = this.kickDetections.filter(kick => 
            currentTime - kick.time < 8000
        ).sort((a, b) => a.time - b.time);
        
        if (recentKicks.length < 3) {
            return 0;
        }
        
        // Calculate intervals between kicks
        const intervals = [];
        for (let i = 1; i < recentKicks.length; i++) {
            intervals.push(recentKicks[i].time - recentKicks[i - 1].time);
        }
        
        // Measure consistency of intervals
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        
        // Calculate variance (lower variance = more consistent = higher confidence)
        const variance = intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - avgInterval, 2);
        }, 0) / intervals.length;
        
        const stdDev = Math.sqrt(variance);
        const coefficientOfVariation = stdDev / avgInterval;
        
        // Convert to confidence score (0-1, lower CV = higher confidence)
        const consistencyScore = Math.max(0, 1 - (coefficientOfVariation * 2));
        
        // Energy consistency score
        const energies = recentKicks.map(kick => kick.energy);
        const avgEnergy = energies.reduce((sum, energy) => sum + energy, 0) / energies.length;
        const energyVariance = energies.reduce((sum, energy) => {
            return sum + Math.pow(energy - avgEnergy, 2);
        }, 0) / energies.length;
        const energyCV = Math.sqrt(energyVariance) / avgEnergy;
        const energyScore = Math.max(0, 1 - energyCV);
        
        // Combine scores
        return (consistencyScore * 0.7 + energyScore * 0.3);
    }
    
    /**
     * Calculate snare detection confidence
     */
    calculateSnareConfidence(currentTime) {
        if (this.snareDetections.length < 2) {
            return 0;
        }
        
        // Get recent snares (last 8 seconds)
        const recentSnares = this.snareDetections.filter(snare => 
            currentTime - snare.time < 8000
        ).sort((a, b) => a.time - b.time);
        
        if (recentSnares.length < 2) {
            return 0;
        }
        
        // Similar logic to kick confidence but for snares
        const intervals = [];
        for (let i = 1; i < recentSnares.length; i++) {
            intervals.push(recentSnares[i].time - recentSnares[i - 1].time);
        }
        
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - avgInterval, 2);
        }, 0) / intervals.length;
        
        const coefficientOfVariation = Math.sqrt(variance) / avgInterval;
        
        // Snares typically have longer intervals than kicks, so adjust scoring
        const consistencyScore = Math.max(0, 1 - (coefficientOfVariation * 1.5));
        
        // Brightness consistency (snares should maintain spectral centroid)
        const centroids = recentSnares.map(snare => snare.spectralCentroid);
        const avgCentroid = centroids.reduce((sum, c) => sum + c, 0) / centroids.length;
        const centroidVariance = centroids.reduce((sum, c) => {
            return sum + Math.pow(c - avgCentroid, 2);
        }, 0) / centroids.length;
        const brightnessScore = Math.max(0, 1 - Math.sqrt(centroidVariance));
        
        return (consistencyScore * 0.6 + brightnessScore * 0.4);
    }
    
    /**
     * Calculate tempo confidence based on BPM stability
     */
    calculateTempoConfidence() {
        if (this.bpm === 0 || this.kickDetections.length < 4) {
            return 0;
        }
        
        // BPM should be in reasonable range for music
        if (this.bpm < 60 || this.bpm > 200) {
            return 0.2; // Low confidence for extreme tempos
        }
        
        // Check if BPM is stable by looking at recent kick patterns
        const currentTime = performance.now();
        const recentKicks = this.kickDetections.filter(kick => 
            currentTime - kick.time < 6000
        ).sort((a, b) => a.time - b.time);
        
        if (recentKicks.length < 4) {
            return 0.3;
        }
        
        // Calculate expected interval based on current BPM
        const expectedInterval = 60000 / this.bpm; // ms per beat
        
        // Check how well recent kicks match expected tempo
        const intervals = [];
        for (let i = 1; i < recentKicks.length; i++) {
            intervals.push(recentKicks[i].time - recentKicks[i - 1].time);
        }
        
        // Calculate how close intervals are to expected (or multiples of expected)
        let matchingIntervals = 0;
        intervals.forEach(interval => {
            // Check if interval matches expected tempo (within 15% tolerance)
            const tolerance = 0.15;
            const ratios = [0.25, 0.5, 1, 2, 4]; // Common beat subdivisions
            
            for (const ratio of ratios) {
                const targetInterval = expectedInterval * ratio;
                if (Math.abs(interval - targetInterval) < targetInterval * tolerance) {
                    matchingIntervals++;
                    break;
                }
            }
        });
        
        const matchRatio = matchingIntervals / intervals.length;
        
        // Higher match ratio = higher confidence
        return Math.min(1, matchRatio * 1.2);
    }
    
    /**
     * Get smoothed confidence scores
     */
    getConfidenceStats() {
        const smoothedOverall = this.confidenceHistory.length > 0
            ? this.confidenceHistory.reduce((sum, conf) => sum + conf, 0) / this.confidenceHistory.length
            : 0;
        
        return {
            overall: this.beatConfidence,
            smoothed: smoothedOverall,
            kick: this.kickConfidence,
            snare: this.snareConfidence,
            tempo: this.tempoConfidence,
            reliability: this.getReliabilityLabel(smoothedOverall)
        };
    }
    
    /**
     * Get reliability label based on confidence score
     */
    getReliabilityLabel(confidence) {
        if (confidence >= 0.8) return 'excellent';
        if (confidence >= 0.6) return 'good';
        if (confidence >= 0.4) return 'fair';
        if (confidence >= 0.2) return 'poor';
        return 'unreliable';
    }
    
    /**
     * Calculate spectral flux for onset detection
     * Measures the change in spectral content between frames
     */
    calculateSpectralFlux(currentFrequencyData) {
        if (!this.previousFrequencyData) {
            this.previousFrequencyData = new Uint8Array(currentFrequencyData.length);
            return 0;
        }
        
        let spectralFlux = 0;
        const length = Math.min(currentFrequencyData.length, this.previousFrequencyData.length);
        
        // Focus on low-frequency range for kick detection
        const sampleRate = this.audioEngine.audioContext.sampleRate;
        const fftSize = this.audioEngine.fftSize;
        const nyquist = sampleRate / 2;
        const binSize = nyquist / (fftSize / 2);
        
        const startBin = Math.floor(this.kickFreqRange.min / binSize);
        const endBin = Math.floor(this.kickFreqRange.max / binSize);
        
        for (let i = startBin; i <= endBin && i < length; i++) {
            const diff = currentFrequencyData[i] - this.previousFrequencyData[i];
            // Only positive changes (increases in energy) indicate onsets
            if (diff > 0) {
                spectralFlux += diff;
            }
        }
        
        // Normalize spectral flux
        const binCount = endBin - startBin + 1;
        return binCount > 0 ? spectralFlux / (binCount * 255) : 0;
    }
    
    /**
     * Update energy history for adaptive thresholding
     */
    updateEnergyHistory(energy) {
        this.energyHistory.push(energy);
        
        // Keep only the most recent values
        if (this.energyHistory.length > this.energyWindowSize) {
            this.energyHistory.shift();
        }
    }
    
    /**
     * Calculate adaptive threshold based on recent energy history
     */
    getAdaptiveThreshold() {
        if (this.energyHistory.length === 0) {
            return this.kickThreshold;
        }
        
        // Calculate mean energy over recent history
        const meanEnergy = this.energyHistory.reduce((sum, energy) => sum + energy, 0) / this.energyHistory.length;
        
        // Calculate standard deviation
        const variance = this.energyHistory.reduce((sum, energy) => sum + Math.pow(energy - meanEnergy, 2), 0) / this.energyHistory.length;
        const stdDev = Math.sqrt(variance);
        
        // Adaptive threshold: mean + (multiplier * standard deviation)
        return Math.max(meanEnergy + (this.adaptiveMultiplier * stdDev), this.kickThreshold);
    }
    
    /**
     * Detect kick drum using energy and spectral flux analysis
     */
    detectKick(kickEnergy, spectralFlux, currentTime) {
        // Check cooldown period to avoid double detection
        if (currentTime - this.lastKickTime < this.kickCooldown) {
            return false;
        }
        
        const adaptiveThreshold = this.getAdaptiveThreshold();
        
        // Kick detection criteria:
        // 1. Energy exceeds adaptive threshold
        // 2. Spectral flux indicates onset
        // 3. Sufficient time has passed since last kick
        const energyThresholdMet = kickEnergy > adaptiveThreshold;
        const onsetDetected = spectralFlux > this.onsetThreshold;
        
        // Debug logging every 30 frames to see what's happening
        if (Math.random() < 0.03) { // ~2% chance each frame
            console.log(`🔍 Debug - Energy: ${kickEnergy.toFixed(3)}, Threshold: ${adaptiveThreshold.toFixed(3)}, Flux: ${spectralFlux.toFixed(3)}, EnergyOK: ${energyThresholdMet}, OnsetOK: ${onsetDetected}`);
        }
        
        if (energyThresholdMet && onsetDetected) {
            this.lastKickTime = currentTime;
            
            // Store kick detection data
            this.kickDetections.push({
                time: currentTime,
                energy: kickEnergy,
                spectralFlux: spectralFlux,
                threshold: adaptiveThreshold
            });
            
            // Keep only recent detections (last 10 seconds)
            const tenSecondsAgo = currentTime - 10000;
            this.kickDetections = this.kickDetections.filter(kick => kick.time > tenSecondsAgo);
            
            console.log(`🥁 Kick detected - Energy: ${kickEnergy.toFixed(3)}, Flux: ${spectralFlux.toFixed(3)}, Threshold: ${adaptiveThreshold.toFixed(3)}`);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Detect snare drum using energy, spectral flux, and brightness analysis
     */
    detectSnare(snareEnergy, spectralFlux, spectralCentroid, currentTime) {
        // Check cooldown period to avoid double detection
        if (currentTime - this.lastSnareTime < this.snareCooldown) {
            return false;
        }
        
        // Snare detection criteria:
        // 1. Mid-frequency energy exceeds threshold
        // 2. Spectral flux indicates onset (transient)
        // 3. High spectral centroid (brightness)
        // 4. Sufficient time has passed since last snare
        
        const energyThresholdMet = snareEnergy > this.snareThreshold;
        const onsetDetected = spectralFlux > this.onsetThreshold * 1.2; // Slightly higher threshold for snares
        const brightnessDetected = spectralCentroid > 0.3; // Snares should be bright
        
        if (energyThresholdMet && onsetDetected && brightnessDetected) {
            this.lastSnareTime = currentTime;
            
            // Store snare detection data
            this.snareDetections.push({
                time: currentTime,
                energy: snareEnergy,
                spectralFlux: spectralFlux,
                spectralCentroid: spectralCentroid
            });
            
            // Keep only recent detections (last 10 seconds)
            const tenSecondsAgo = currentTime - 10000;
            this.snareDetections = this.snareDetections.filter(snare => snare.time > tenSecondsAgo);
            
            console.log(`🥁 Snare detected - Energy: ${snareEnergy.toFixed(3)}, Flux: ${spectralFlux.toFixed(3)}, Brightness: ${spectralCentroid.toFixed(3)}`);
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Update BPM estimation based on recent kick detections
     */
    updateBPM() {
        console.log(`🔍 BPM Update: ${this.kickDetections.length} total kicks detected`);
        
        if (this.kickDetections.length < 2) {
            console.log('❌ Not enough kicks for BPM calculation');
            return;
        }
        
        // Calculate intervals between recent kicks (last 10 seconds)
        const currentTime = performance.now();
        const recentKicks = this.kickDetections.filter(kick => 
            currentTime - kick.time < 10000
        ).sort((a, b) => a.time - b.time);
        
        if (recentKicks.length < 2) {
            console.log(`❌ Not enough recent kicks: ${recentKicks.length}`);
            return;
        }
        
        console.log(`✅ Analyzing ${recentKicks.length} recent kicks`);
        
        // Calculate intervals between consecutive kicks
        const intervals = [];
        for (let i = 1; i < recentKicks.length; i++) {
            const interval = recentKicks[i].time - recentKicks[i - 1].time;
            // Filter out intervals that are too short (< 200ms) or too long (> 2000ms)
            if (interval >= 200 && interval <= 2000) {
                intervals.push(interval);
            }
        }
        
        if (intervals.length === 0) {
            console.log('❌ No valid intervals found');
            return;
        }
        
        console.log(`📊 Found ${intervals.length} valid intervals:`, intervals.map(i => Math.round(i)));
        
        // Find the most common interval (mode) using histogram approach
        const bpmEstimates = intervals.map(interval => 60000 / interval); // Convert to BPM
        
        // Group BPM estimates into bins (tolerance of ±5 BPM)
        const bpmBins = {};
        const tolerance = 5;
        
        bpmEstimates.forEach(bpm => {
            const binKey = Math.round(bpm / tolerance) * tolerance;
            if (!bpmBins[binKey]) {
                bpmBins[binKey] = [];
            }
            bpmBins[binKey].push(bpm);
        });
        
        // Find the bin with the most estimates
        let mostCommonBpm = 0;
        let maxCount = 0;
        
        Object.entries(bpmBins).forEach(([binKey, estimates]) => {
            if (estimates.length > maxCount) {
                maxCount = estimates.length;
                // Average the estimates in this bin
                mostCommonBpm = estimates.reduce((sum, bpm) => sum + bpm, 0) / estimates.length;
            }
        });
        
        // Update BPM with smoothing
        if (mostCommonBpm > 0 && maxCount >= 2) {
            // Apply smoothing filter
            const smoothingFactor = 0.3;
            this.bpm = this.bpm === 0 
                ? mostCommonBpm 
                : this.bpm * (1 - smoothingFactor) + mostCommonBpm * smoothingFactor;
                
            // Round to nearest integer
            this.bpm = Math.round(this.bpm);
            
            console.log(`🎵 BPM estimated: ${this.bpm} (from ${maxCount} consistent intervals)`);
        }
    }
    
    /**
     * Get beat detection statistics
     */
    getBeatStats() {
        const currentTime = performance.now();
        const recentKicks = this.kickDetections.filter(kick => 
            currentTime - kick.time < 5000 // Last 5 seconds
        );
        const recentSnares = this.snareDetections.filter(snare => 
            currentTime - snare.time < 5000 // Last 5 seconds
        );
        
        return {
            totalKicks: this.kickDetections.length,
            recentKicks: recentKicks.length,
            averageKickEnergy: recentKicks.length > 0 
                ? recentKicks.reduce((sum, kick) => sum + kick.energy, 0) / recentKicks.length 
                : 0,
            lastKickTime: this.lastKickTime,
            timeSinceLastKick: currentTime - this.lastKickTime,
            totalSnares: this.snareDetections.length,
            recentSnares: recentSnares.length,
            averageSnareEnergy: recentSnares.length > 0 
                ? recentSnares.reduce((sum, snare) => sum + snare.energy, 0) / recentSnares.length 
                : 0,
            lastSnareTime: this.lastSnareTime,
            timeSinceLastSnare: currentTime - this.lastSnareTime,
            bpm: this.bpm
        };
    }
    
    /**
     * Get kick detection statistics (legacy method for backward compatibility)
     */
    getKickStats() {
        return this.getBeatStats();
    }
    
    /**
     * Reset detection state
     */
    reset() {
        this.spectralFluxHistory = [];
        this.energyHistory = [];
        this.rmsHistory = [];
        this.zcrHistory = [];
        this.confidenceHistory = [];
        this.previousFrequencyData = null;
        this.detectedBeats = [];
        this.kickDetections = [];
        this.snareDetections = [];
        this.lastKickTime = 0;
        this.lastSnareTime = 0;
        this.bpm = 0;
        this.bpmHistory = [];
        this.lastBpmUpdate = 0;
        this.beatConfidence = 0;
        this.kickConfidence = 0;
        this.snareConfidence = 0;
        this.tempoConfidence = 0;
        
        console.log('🔄 BeatDetection reset');
    }
    
    /**
     * Get current detection configuration
     */
    getConfig() {
        return {
            kickFreqRange: this.kickFreqRange,
            kickThreshold: this.kickThreshold,
            kickCooldown: this.kickCooldown,
            onsetThreshold: this.onsetThreshold,
            adaptiveMultiplier: this.adaptiveMultiplier,
            energyWindowSize: this.energyWindowSize
        };
    }
    
    /**
     * Update detection parameters
     */
    updateConfig(config) {
        if (config.kickFreqRange) this.kickFreqRange = { ...config.kickFreqRange };
        if (config.kickThreshold !== undefined) this.kickThreshold = config.kickThreshold;
        if (config.kickCooldown !== undefined) this.kickCooldown = config.kickCooldown;
        if (config.onsetThreshold !== undefined) this.onsetThreshold = config.onsetThreshold;
        if (config.adaptiveMultiplier !== undefined) this.adaptiveMultiplier = config.adaptiveMultiplier;
        if (config.energyWindowSize !== undefined) this.energyWindowSize = config.energyWindowSize;
        
        console.log('⚙️ BeatDetection config updated', this.getConfig());
    }
}