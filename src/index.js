/**
 * Music Visualizer - Main Entry Point
 * Real-time audio analysis and visualization engine
 */

import { AudioEngine } from './audio/AudioEngine.js';
import { BeatDetection } from './audio/BeatDetection.js';
import { FileDropzone } from './ui/FileDropzone.js';

console.log('🎵 Music Visualizer Loading...');

class MusicVisualizer {
    constructor() {
        this.audioEngine = null;
        this.beatDetection = null;
        this.fileDropzone = null;
        this.isInitialized = false;
        
        // DOM elements
        this.audioElement = null;
        this.playPauseBtn = null;
        
        // UI state
        this.currentFile = null;
        this.analysisLoopId = null;
    }
    
    /**
     * Initialize the music visualizer
     */
    async init() {
        try {
            console.log('✅ DOM Ready - Initializing visualizer...');
            
            // Get DOM elements
            this.audioElement = document.getElementById('audio-element');
            this.playPauseBtn = document.getElementById('play-pause-btn');
            
            // Initialize audio engine
            this.audioEngine = new AudioEngine();
            
            // Initialize beat detection
            this.beatDetection = new BeatDetection(this.audioEngine);
            
            // Start audio analysis loop
            this.startAnalysisLoop();
            
            
            // Initialize file dropzone
            this.fileDropzone = new FileDropzone(
                document.getElementById('app'),
                this.handleFileLoad.bind(this)
            );
            
            // Set up UI event listeners
            this.setupUIEventListeners();
            
            
            this.isInitialized = true;
            console.log('🚀 Music Visualizer initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize Music Visualizer:', error);
            this.showError(`Initialization failed: ${error.message}`);
        }
    }
    
    /**
     * Set up UI event listeners
     */
    setupUIEventListeners() {
        // File upload
        const audioUpload = document.getElementById('audio-upload');
        audioUpload.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileLoad(e.target.files[0]);
            }
        });
        
        // Play/Pause button
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => {
                this.togglePlayback();
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }
    
    /**
     * Handle file loading
     */
    async handleFileLoad(file) {
        try {
            console.log(`📂 Loading file: ${file.name}`);
            
            await this.audioEngine.loadAudioFile(file);
            this.currentFile = file;
            
            // Update UI
            this.playPauseBtn.textContent = 'Play';
            this.playPauseBtn.disabled = false;
            
            console.log(`✅ File loaded successfully: ${file.name}`);
            
        } catch (error) {
            console.error('❌ Failed to load file:', error);
            this.showError(`Failed to load audio file: ${error.message}`);
        }
    }
    
    /**
     * Toggle audio playback
     */
    async togglePlayback() {
        if (!this.audioEngine || !this.currentFile) {
            this.showError('No audio file loaded');
            return;
        }
        
        try {
            if (this.audioEngine.isPlaying) {
                this.audioEngine.pause();
                this.playPauseBtn.textContent = 'Play';
            } else {
                await this.audioEngine.play();
                this.playPauseBtn.textContent = 'Pause';
            }
        } catch (error) {
            console.error('❌ Playback error:', error);
            this.showError(`Playback failed: ${error.message}`);
        }
    }
    
    
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayback();
                break;
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error(message);
        // TODO: Implement toast notification system
        alert(`Error: ${message}`);
    }
    
    /**
     * Show info message
     */
    showMessage(message) {
        console.log(message);
        // TODO: Implement toast notification system
        alert(message);
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        
        if (this.audioEngine) {
            this.audioEngine.destroy();
        }
        
        if (this.fileDropzone) {
            this.fileDropzone.destroy();
        }
        
        
        this.stopAnalysisLoop();
        
        console.log('🧹 Music Visualizer destroyed');
    }
    
    /**
     * Start the audio analysis loop
     */
    startAnalysisLoop() {
        const updateStats = () => {
            if (this.audioEngine && this.audioEngine.isPlaying) {
                this.updateAudioStats();
            }
            this.analysisLoopId = requestAnimationFrame(updateStats);
        };
        updateStats();
    }
    
    /**
     * Stop the audio analysis loop
     */
    stopAnalysisLoop() {
        if (this.analysisLoopId) {
            cancelAnimationFrame(this.analysisLoopId);
            this.analysisLoopId = null;
        }
    }
    
    /**
     * Update audio statistics display
     */
    updateAudioStats() {
        if (!this.audioEngine || !this.beatDetection) return;
        
        try {
            // Get current audio analysis data
            const analysisData = this.audioEngine.getAnalysisData();
            if (!analysisData || !analysisData.isPlaying) return;
            
            // Get beat detection data
            const beatData = this.beatDetection.analyzeFrame();
            const rmsStats = this.beatDetection.getRMSStats();
            const zcrStats = this.beatDetection.getZCRStats();
            const confidenceStats = this.beatDetection.getConfidenceStats();
            const beatStats = this.beatDetection.getBeatStats();
            
            // Update Audio Analysis Column
            this.updateStatValue('bpm-value', Math.round(beatData.bpm || beatStats.bpm || 0));
            this.updateStatValue('rms-value', (rmsStats.current || 0).toFixed(3));
            this.updateStatValue('zcr-value', (zcrStats.current || 0).toFixed(3));
            this.updateStatValue('confidence-value', ((confidenceStats.overall || 0) * 100).toFixed(1) + '%');
            this.updateStatValue('kick-count', beatStats.totalKicks || 0);
            this.updateStatValue('snare-count', beatStats.totalSnares || 0);
            this.updateStatValue('subbass-value', (analysisData.bands.subBass || 0).toFixed(2));
            this.updateStatValue('bass-value', (analysisData.bands.bass || 0).toFixed(2));
            this.updateStatValue('lowmids-value', (analysisData.bands.lowMids || 0).toFixed(2));
            this.updateStatValue('mids-value', (analysisData.bands.mids || 0).toFixed(2));
            this.updateStatValue('highmids-value', (analysisData.bands.highMids || 0).toFixed(2));
            this.updateStatValue('treble-value', (analysisData.bands.treble || 0).toFixed(2));
            
            // Update Beat Detection Column
            this.updateStatValue('spectral-flux-value', (beatData.spectralFlux || 0).toFixed(3));
            this.updateStatValue('spectral-centroid-value', (beatData.spectralCentroid || 0).toFixed(3));
            this.updateStatValue('kick-detected-value', beatData.kickDetected ? 'YES' : 'NO');
            this.updateStatValue('snare-detected-value', beatData.snareDetected ? 'YES' : 'NO');
            this.updateStatValue('kick-energy-value', (beatData.kickEnergy || 0).toFixed(2));
            this.updateStatValue('snare-energy-value', (beatData.snareEnergy || 0).toFixed(2));
            this.updateStatValue('beat-confidence-value', ((beatData.beatConfidence || 0) * 100).toFixed(1) + '%');
            this.updateStatValue('kick-confidence-value', ((beatData.kickConfidence || 0) * 100).toFixed(1) + '%');
            this.updateStatValue('snare-confidence-value', ((beatData.snareConfidence || 0) * 100).toFixed(1) + '%');
            this.updateStatValue('tempo-confidence-value', ((beatData.tempoConfidence || 0) * 100).toFixed(1) + '%');
            this.updateStatValue('adaptive-threshold-value', (beatData.adaptiveThreshold || 0).toFixed(3));
            this.updateStatValue('noisiness-value', zcrStats.noisiness || 'unknown');
            
            // Update confidence color
            const confidenceElement = document.getElementById('confidence-value');
            if (confidenceElement) {
                const confidence = confidenceStats.overall || 0;
                if (confidence > 0.8) {
                    confidenceElement.className = 'stat-value excellent';
                } else if (confidence > 0.6) {
                    confidenceElement.className = 'stat-value good';
                } else if (confidence > 0.4) {
                    confidenceElement.className = 'stat-value fair';
                } else if (confidence > 0.2) {
                    confidenceElement.className = 'stat-value poor';
                } else {
                    confidenceElement.className = 'stat-value unreliable';
                }
            }
            
            // Update kick/snare detection colors
            const kickDetectedElement = document.getElementById('kick-detected-value');
            if (kickDetectedElement) {
                kickDetectedElement.className = beatData.kickDetected ? 'stat-value excellent' : 'stat-value';
            }
            
            const snareDetectedElement = document.getElementById('snare-detected-value');
            if (snareDetectedElement) {
                snareDetectedElement.className = beatData.snareDetected ? 'stat-value excellent' : 'stat-value';
            }
            
            // Update noisiness color
            const noisinessElement = document.getElementById('noisiness-value');
            if (noisinessElement) {
                const noisiness = zcrStats.noisiness || 'unknown';
                if (noisiness === 'tonal') {
                    noisinessElement.className = 'stat-value tonal';
                } else if (noisiness === 'mixed') {
                    noisinessElement.className = 'stat-value mixed';
                } else if (noisiness === 'noisy') {
                    noisinessElement.className = 'stat-value noisy';
                } else {
                    noisinessElement.className = 'stat-value';
                }
            }
            
        } catch (error) {
            console.warn('Error updating audio stats:', error);
        }
    }
    
    /**
     * Update a stat value in the UI
     */
    updateStatValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const visualizer = new MusicVisualizer();
    visualizer.init();
    
    // Make visualizer available globally for debugging
    window.musicVisualizer = visualizer;
});

export default MusicVisualizer;