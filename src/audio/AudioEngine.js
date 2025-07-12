/**
 * AudioEngine - Core audio analysis system using Web Audio API
 * Handles AudioContext initialization, AnalyserNode configuration, and real-time FFT analysis
 */

export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyserNode = null;
        this.sourceNode = null;
        this.audioElement = null;
        this.isInitialized = false;
        this.isPlaying = false;
        this.fileURL = null;
        
        // FFT configuration
        this.fftSize = 2048;
        this.frequencyBinCount = this.fftSize / 2;
        this.sampleRate = 44100;
        
        // Audio data arrays
        this.frequencyData = null;
        this.timeData = null;
        
        // Frequency bands (Hz)
        this.frequencyBands = {
            subBass: { min: 20, max: 60 },
            bass: { min: 60, max: 250 },
            lowMids: { min: 250, max: 500 },
            mids: { min: 500, max: 2000 },
            highMids: { min: 2000, max: 4000 },
            treble: { min: 4000, max: 20000 }
        };
        
        // Band data storage
        this.bandData = {
            subBass: 0,
            bass: 0,
            lowMids: 0,
            mids: 0,
            highMids: 0,
            treble: 0
        };
        
        // Performance monitoring
        this.lastUpdateTime = 0;
        this.frameRate = 0;
        this.frameCount = 0;
        
        this.initializeAudioContext();
    }
    
    /**
     * Initialize AudioContext with browser compatibility
     */
    initializeAudioContext() {
        try {
            // Handle browser prefixes
            const AudioContextClass = window.AudioContext || 
                                    window.webkitAudioContext || 
                                    window.mozAudioContext || 
                                    window.msAudioContext;
            
            if (!AudioContextClass) {
                throw new Error('Web Audio API not supported in this browser');
            }
            
            this.audioContext = new AudioContextClass({
                sampleRate: this.sampleRate,
                latencyHint: 'interactive'
            });
            
            // Handle context state
            if (this.audioContext.state === 'suspended') {
                console.warn('AudioContext is suspended. User interaction required to resume.');
            }
            
            this.setupAnalyserNode();
            this.initializeDataArrays();
            
            this.isInitialized = true;
            console.log('✅ AudioEngine initialized successfully');
            console.log(`📊 Sample Rate: ${this.audioContext.sampleRate}Hz`);
            console.log(`🔊 FFT Size: ${this.fftSize} bins`);
            
        } catch (error) {
            console.error('❌ Failed to initialize AudioContext:', error);
            this.handleAudioContextError(error);
        }
    }
    
    /**
     * Set up AnalyserNode with optimal configuration
     */
    setupAnalyserNode() {
        if (!this.audioContext) {
            throw new Error('AudioContext not initialized');
        }
        
        this.analyserNode = this.audioContext.createAnalyser();
        
        // Configure AnalyserNode parameters
        this.analyserNode.fftSize = this.fftSize;
        this.analyserNode.smoothingTimeConstant = 0.8;
        this.analyserNode.minDecibels = -90;
        this.analyserNode.maxDecibels = -10;
        
        // Update frequency bin count based on actual fftSize
        this.frequencyBinCount = this.analyserNode.frequencyBinCount;
        
        console.log(`🎛️ AnalyserNode configured: ${this.frequencyBinCount} frequency bins`);
    }
    
    /**
     * Initialize typed arrays for audio data
     */
    initializeDataArrays() {
        this.frequencyData = new Uint8Array(this.frequencyBinCount);
        this.timeData = new Uint8Array(this.frequencyBinCount);
        
        console.log('📈 Audio data arrays initialized');
    }
    
    /**
     * Resume AudioContext if suspended (requires user interaction)
     */
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('🔊 AudioContext resumed');
                return true;
            } catch (error) {
                console.error('❌ Failed to resume AudioContext:', error);
                return false;
            }
        }
        return true;
    }
    
    /**
     * Load and decode audio file
     */
    async loadAudioFile(file) {
        if (!this.isInitialized) {
            throw new Error('AudioEngine not initialized');
        }
        
        try {
            // Validate file
            this.validateAudioFile(file);
            
            // Create audio element
            this.audioElement = document.getElementById('audio-element') || document.createElement('audio');
            this.audioElement.crossOrigin = 'anonymous';
            
            // Clean up previous file URL if exists
            if (this.fileURL) {
                URL.revokeObjectURL(this.fileURL);
            }
            
            // Load file
            this.fileURL = URL.createObjectURL(file);
            this.audioElement.src = this.fileURL;
            
            // Wait for metadata to load
            await new Promise((resolve, reject) => {
                this.audioElement.addEventListener('loadedmetadata', resolve, { once: true });
                this.audioElement.addEventListener('error', reject, { once: true });
                this.audioElement.load();
            });
            
            // Create source node
            if (this.sourceNode) {
                this.sourceNode.disconnect();
            }
            
            this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
            
            // Connect audio graph: source -> analyser -> destination
            this.sourceNode.connect(this.analyserNode);
            this.analyserNode.connect(this.audioContext.destination);
            
            console.log(`🎵 Audio file loaded: ${file.name}`);
            console.log(`⏱️ Duration: ${this.audioElement.duration.toFixed(2)}s`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to load audio file:', error);
            throw error;
        }
    }
    
    /**
     * Validate audio file format and size
     */
    validateAudioFile(file) {
        const allowedTypes = [
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/webm',
            'audio/mp4',
            'audio/aac'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`Unsupported audio format: ${file.type}`);
        }
        
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB (max: 100MB)`);
        }
        
        console.log(`✅ Audio file validated: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    }
    
    /**
     * Start audio playback
     */
    async play() {
        if (!this.audioElement) {
            throw new Error('No audio file loaded');
        }
        
        try {
            await this.resumeAudioContext();
            await this.audioElement.play();
            this.isPlaying = true;
            console.log('▶️ Audio playback started');
        } catch (error) {
            console.error('❌ Failed to start playback:', error);
            throw error;
        }
    }
    
    /**
     * Pause audio playback
     */
    pause() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.isPlaying = false;
            console.log('⏸️ Audio playback paused');
        }
    }
    
    /**
     * Stop audio playback
     */
    stop() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.isPlaying = false;
            console.log('⏹️ Audio playback stopped');
        }
    }
    
    /**
     * Get current audio analysis data
     */
    getAnalysisData() {
        if (!this.analyserNode || !this.frequencyData) {
            return null;
        }
        
        // Get frequency and time domain data
        this.analyserNode.getByteFrequencyData(this.frequencyData);
        this.analyserNode.getByteTimeDomainData(this.timeData);
        
        // Calculate frequency bands
        this.calculateFrequencyBands();
        
        // Update performance metrics
        this.updatePerformanceMetrics();
        
        return {
            frequencyData: this.frequencyData,
            timeData: this.timeData,
            bands: { ...this.bandData },
            sampleRate: this.audioContext.sampleRate,
            frameRate: this.frameRate,
            isPlaying: this.isPlaying,
            currentTime: this.audioElement ? this.audioElement.currentTime : 0,
            duration: this.audioElement ? this.audioElement.duration : 0
        };
    }
    
    /**
     * Calculate frequency band data from FFT
     */
    calculateFrequencyBands() {
        const nyquist = this.audioContext.sampleRate / 2;
        const binSize = nyquist / this.frequencyBinCount;
        
        // Reset band data
        Object.keys(this.bandData).forEach(band => {
            this.bandData[band] = 0;
        });
        
        // Calculate average amplitude for each frequency band
        Object.entries(this.frequencyBands).forEach(([bandName, range]) => {
            const startBin = Math.floor(range.min / binSize);
            const endBin = Math.floor(range.max / binSize);
            
            let sum = 0;
            let count = 0;
            
            for (let i = startBin; i <= endBin && i < this.frequencyBinCount; i++) {
                sum += this.frequencyData[i];
                count++;
            }
            
            this.bandData[bandName] = count > 0 ? sum / count : 0;
        });
    }
    
    /**
     * Update performance monitoring metrics
     */
    updatePerformanceMetrics() {
        const now = performance.now();
        
        if (this.lastUpdateTime > 0) {
            const deltaTime = now - this.lastUpdateTime;
            this.frameRate = 1000 / deltaTime;
        }
        
        this.lastUpdateTime = now;
        this.frameCount++;
    }
    
    /**
     * Handle AudioContext errors
     */
    handleAudioContextError(error) {
        console.error('AudioContext Error:', error);
        
        // Provide user-friendly error messages
        if (error.message.includes('not supported')) {
            console.warn('💡 Suggestion: Try using a modern browser with Web Audio API support');
        }
        
        this.isInitialized = false;
    }
    
    /**
     * Get frequency range for a specific bin
     */
    getFrequencyForBin(bin) {
        const nyquist = this.audioContext.sampleRate / 2;
        return (bin * nyquist) / this.frequencyBinCount;
    }
    
    /**
     * Get bin index for a specific frequency
     */
    getBinForFrequency(frequency) {
        const nyquist = this.audioContext.sampleRate / 2;
        return Math.floor((frequency * this.frequencyBinCount) / nyquist);
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.sourceNode) {
            this.sourceNode.disconnect();
        }
        
        if (this.analyserNode) {
            this.analyserNode.disconnect();
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        if (this.fileURL) {
            URL.revokeObjectURL(this.fileURL);
            this.fileURL = null;
        }
        
        this.isInitialized = false;
        console.log('🧹 AudioEngine destroyed');
    }
}