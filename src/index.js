/**
 * Music Visualizer - Main Entry Point
 * Real-time audio analysis and visualization engine
 */

import { AudioEngine } from './audio/AudioEngine.js';
import { BeatDetection } from './audio/BeatDetection.js';
import { FileDropzone } from './ui/FileDropzone.js';
import { VisualizationController } from './visualization/VisualizationController.js';
import { VideoExporter } from './export/VideoExporter.js';

console.log('🎵 Music Visualizer Loading...');

class MusicVisualizer {
    constructor() {
        this.audioEngine = null;
        this.beatDetection = null;
        this.visualizationController = null;
        this.fileDropzone = null;
        this.videoExporter = null;
        this.isInitialized = false;
        
        // DOM elements
        this.canvas = null;
        this.audioElement = null;
        this.playPauseBtn = null;
        
        // UI state
        this.currentFile = null;
    }
    
    /**
     * Initialize the music visualizer
     */
    async init() {
        try {
            console.log('✅ DOM Ready - Initializing visualizer...');
            
            // Get DOM elements
            this.canvas = document.getElementById('visualizer-canvas');
            this.instagramCanvas = document.getElementById('instagram-canvas');
            this.audioElement = document.getElementById('audio-element');
            this.playPauseBtn = document.getElementById('play-pause-btn');
            
            if (!this.canvas) {
                throw new Error('Canvas element not found');
            }
            
            if (!this.instagramCanvas) {
                throw new Error('Instagram canvas element not found');
            }
            
            // Initialize audio engine
            this.audioEngine = new AudioEngine();
            
            // Initialize beat detection
            this.beatDetection = new BeatDetection(this.audioEngine);
            
            // Initialize visualization controller with Instagram canvas
            this.visualizationController = new VisualizationController(this.canvas, this.audioEngine, this.beatDetection, this.instagramCanvas);
            
            // Initialize video exporter for Instagram canvas
            this.videoExporter = new VideoExporter(this.instagramCanvas);
            
            // Initialize file dropzone
            this.fileDropzone = new FileDropzone(
                document.getElementById('app'),
                this.handleFileLoad.bind(this)
            );
            
            // Set up UI event listeners
            this.setupUIEventListeners();
            
            // Start visualization loop
            this.visualizationController.start();
            
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
        // Energy slider
        const energySlider = document.getElementById('energy-slider');
        const energyValue = document.getElementById('energy-value');
        
        energySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value) / 5; // Convert 1-10 to 0.2-2.0
            energyValue.textContent = e.target.value;
            if (this.visualizationController) {
                this.visualizationController.setSensitivity(value);
            }
        });
        
        // Genre selection
        const genreSelect = document.getElementById('genre-select');
        genreSelect.addEventListener('change', (e) => {
            console.log(`🎵 Genre selected: ${e.target.value}`);
            // TODO: Implement genre-based visualization presets
        });
        
        // Mood selection
        const moodSelect = document.getElementById('mood-select');
        moodSelect.addEventListener('change', (e) => {
            console.log(`😊 Mood selected: ${e.target.value}`);
            // TODO: Implement mood-based visualization adjustments
        });
        
        // Color palette selection
        const colorPalette = document.getElementById('color-palette');
        colorPalette.addEventListener('change', (e) => {
            if (this.visualizationController) {
                this.visualizationController.setColorPalette(e.target.value);
            }
        });
        
        // Visual style selection
        const visualStyle = document.getElementById('visual-style');
        visualStyle.addEventListener('change', (e) => {
            if (this.visualizationController) {
                this.visualizationController.setVisualizationMode(e.target.value);
            }
        });
        
        // Complexity level selection
        const complexityLevel = document.getElementById('complexity-level');
        complexityLevel.addEventListener('change', (e) => {
            if (this.visualizationController) {
                this.visualizationController.setComplexityLevel(e.target.value);
            }
        });
        
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
        
        // Video download controls
        const downloadVideoBtn = document.getElementById('download-video-btn');
        const videoQuality = document.getElementById('video-quality');
        
        downloadVideoBtn.addEventListener('click', () => {
            this.downloadMusicVideo();
        });
        
        videoQuality.addEventListener('change', (e) => {
            this.setVideoQuality(e.target.value);
        });
        
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
            
            // Enable download button when file is loaded
            const downloadBtn = document.getElementById('download-video-btn');
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }
            
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
     * Download music video of the entire song
     */
    async downloadMusicVideo() {
        if (!this.videoExporter || !this.audioEngine || !this.currentFile) {
            this.showError('Cannot create video: No audio file loaded or video exporter not available');
            return;
        }
        
        // Get audio element from audio engine
        const audioElement = this.audioEngine.audioElement;
        if (!audioElement || !audioElement.duration) {
            this.showError('Audio not ready. Please wait for the file to load completely.');
            return;
        }
        
        // Start from beginning if not playing
        const wasPlaying = !audioElement.paused;
        audioElement.currentTime = 0;
        
        try {
            // Update UI
            const downloadBtn = document.getElementById('download-video-btn');
            const progressDiv = document.getElementById('recording-progress');
            const progressFill = document.getElementById('progress-fill');
            const progressText = document.getElementById('progress-text');
            
            downloadBtn.disabled = true;
            downloadBtn.textContent = '🎬 Creating Video...';
            progressDiv.classList.remove('hidden');
            
            // Start playback if not already playing
            if (!wasPlaying) {
                await this.audioEngine.play();
            }
            
            // Start recording with progress updates
            await this.videoExporter.recordFullSong(audioElement, (progress) => {
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `Recording... ${Math.round(progress)}%`;
            });
            
            // Success feedback
            this.showMessage('🎉 Music video created successfully! Download starting...');
            
        } catch (error) {
            console.error('❌ Video creation failed:', error);
            this.showError(`Failed to create video: ${error.message}`);
        } finally {
            // Restore UI
            const downloadBtn = document.getElementById('download-video-btn');
            const progressDiv = document.getElementById('recording-progress');
            
            downloadBtn.disabled = false;
            downloadBtn.textContent = '🎬 Download My Music Video';
            progressDiv.classList.add('hidden');
            
            // Reset audio if it wasn't playing before
            if (!wasPlaying) {
                this.audioEngine.pause();
                audioElement.currentTime = 0;
            }
        }
    }
    
    /**
     * Set video quality
     */
    setVideoQuality(quality) {
        if (!this.videoExporter) return;
        
        const presets = this.videoExporter.getQualityPresets();
        if (presets[quality]) {
            this.videoExporter.setQuality(presets[quality].bitrate);
            console.log(`🎬 Video quality set to: ${presets[quality].name}`);
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
            case 'Digit1':
                this.visualizationController?.setVisualizationMode('spectrum');
                break;
            case 'Digit2':
                this.visualizationController?.setVisualizationMode('circular');
                break;
            case 'Digit3':
                this.visualizationController?.setVisualizationMode('waveform');
                break;
            case 'Digit4':
                this.visualizationController?.setVisualizationMode('particles');
                break;
            case 'KeyD':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.downloadMusicVideo();
                }
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
        if (this.visualizationController) {
            this.visualizationController.stop();
        }
        
        if (this.audioEngine) {
            this.audioEngine.destroy();
        }
        
        if (this.fileDropzone) {
            this.fileDropzone.destroy();
        }
        
        if (this.videoExporter) {
            this.videoExporter.destroy();
        }
        
        console.log('🧹 Music Visualizer destroyed');
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