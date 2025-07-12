/**
 * Base Preset Class
 * Abstract base class for all visualizer presets
 */
export class BasePreset {
    constructor(canvas, audioEngine, beatDetection) {
        if (this.constructor === BasePreset) {
            throw new Error('BasePreset is abstract and cannot be instantiated directly');
        }
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioEngine = audioEngine;
        this.beatDetection = beatDetection;
        
        // Canvas dimensions
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Animation state
        this.isRunning = false;
        this.animationId = null;
        this.frameCount = 0;
        this.startTime = Date.now();
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        
        // Audio data cache
        this.audioData = null;
        this.beatData = null;
        this.rmsStats = null;
        this.zcrStats = null;
        this.beatStats = null;
        this.confidenceStats = null;
        
        this.init();
    }
    
    /**
     * Initialize the preset - override in subclasses
     */
    init() {
        // Override in subclasses
    }
    
    /**
     * Start the animation loop
     */
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.animate();
    }
    
    /**
     * Stop the animation loop
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Animation loop with frame rate limiting
     */
    animate() {
        if (!this.isRunning) return;
        
        const now = Date.now();
        const targetFrameTime = 1000 / (this.targetFPS || 60);
        
        if (now - this.lastFrameTime >= targetFrameTime) {
            this.updateAudioData();
            this.render();
            this.frameCount++;
            this.lastFrameTime = now;
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    /**
     * Update audio analysis data
     */
    updateAudioData() {
        if (!this.audioEngine || !this.beatDetection) return;
        
        try {
            this.audioData = this.audioEngine.getAnalysisData();
            if (this.audioData && this.audioData.isPlaying) {
                this.beatData = this.beatDetection.analyzeFrame();
                this.rmsStats = this.beatDetection.getRMSStats();
                this.zcrStats = this.beatDetection.getZCRStats();
                this.beatStats = this.beatDetection.getBeatStats();
                this.confidenceStats = this.beatDetection.getConfidenceStats();
            }
        } catch (error) {
            console.warn('Error updating audio data in preset:', error);
        }
    }
    
    /**
     * Render the visualization - must be implemented in subclasses
     */
    render() {
        throw new Error('render() method must be implemented in subclass');
    }
    
    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    /**
     * Fill the canvas with a color
     */
    fill(color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    /**
     * Get normalized time (0-1) based on elapsed time
     */
    getTime() {
        return (Date.now() - this.startTime) / 1000;
    }
    
    /**
     * Get preset information - override in subclasses
     */
    getInfo() {
        return {
            name: 'Base Preset',
            description: 'Abstract base preset',
            version: '1.0.0'
        };
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.stop();
        this.canvas = null;
        this.ctx = null;
        this.audioEngine = null;
        this.beatDetection = null;
    }
}