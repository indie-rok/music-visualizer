/**
 * VisualizationController - Manages real-time audio visualization loop
 * Coordinates audio analysis and visual rendering at 60fps
 */

export class VisualizationController {
    constructor(canvas, audioEngine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioEngine = audioEngine;
        
        this.isRunning = false;
        this.animationId = null;
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.fps = 0;
        this.fpsHistory = [];
        
        // Visualization parameters
        this.visualizationMode = 'spectrum';
        this.colorPalette = 'sunset-ocean';
        this.sensitivity = 1.0;
        
        // Color palettes
        this.colorPalettes = {
            'sunset-ocean': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
            'neon': ['#FF1744', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5'],
            'monochrome': ['#FFFFFF', '#CCCCCC', '#999999', '#666666', '#333333'],
            'vibrant': ['#FF5722', '#FF9800', '#FFC107', '#8BC34A', '#4CAF50'],
            'muted': ['#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8', '#EFEBE9']
        };
        
        this.resizeCanvas();
        this.setupEventListeners();
        
        console.log('🎨 VisualizationController initialized');
    }
    
    /**
     * Resize canvas to match window size
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
    
    /**
     * Start the visualization loop
     */
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastFrameTime = performance.now();
            this.animate();
            console.log('▶️ Visualization started');
        }
    }
    
    /**
     * Stop the visualization loop
     */
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            console.log('⏹️ Visualization stopped');
        }
    }
    
    /**
     * Main animation loop
     */
    animate() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        this.updateFPS(currentTime);
        
        // Clear canvas
        this.clearCanvas();
        
        // Get audio analysis data
        const audioData = this.audioEngine.getAnalysisData();
        
        if (audioData) {
            // Render visualization based on current mode
            this.renderVisualization(audioData);
        } else {
            // Render default state when no audio
            this.renderDefaultState();
        }
        
        // Render UI overlay
        this.renderUI();
        
        // Schedule next frame
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    /**
     * Update FPS calculation
     */
    updateFPS(currentTime) {
        const deltaTime = currentTime - this.lastFrameTime;
        this.fps = 1000 / deltaTime;
        
        this.fpsHistory.push(this.fps);
        if (this.fpsHistory.length > 60) {
            this.fpsHistory.shift();
        }
        
        this.lastFrameTime = currentTime;
        this.frameCount++;
    }
    
    /**
     * Clear canvas with background
     */
    clearCanvas() {
        // Create gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        
        switch (this.colorPalette) {
            case 'sunset-ocean':
                gradient.addColorStop(0, '#1a1a2e');
                gradient.addColorStop(0.5, '#16213e');
                gradient.addColorStop(1, '#0f1419');
                break;
            case 'neon':
                gradient.addColorStop(0, '#0a0a0a');
                gradient.addColorStop(1, '#1a0a1a');
                break;
            case 'monochrome':
                gradient.addColorStop(0, '#000000');
                gradient.addColorStop(1, '#1a1a1a');
                break;
            default:
                gradient.addColorStop(0, '#1a1a2e');
                gradient.addColorStop(1, '#16213e');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Render visualization based on audio data
     */
    renderVisualization(audioData) {
        switch (this.visualizationMode) {
            case 'spectrum':
                this.renderSpectrumBars(audioData);
                break;
            case 'circular':
                this.renderCircularSpectrum(audioData);
                break;
            case 'waveform':
                this.renderWaveform(audioData);
                break;
            case 'particles':
                this.renderParticles(audioData);
                break;
            default:
                this.renderSpectrumBars(audioData);
        }
        
        // Render frequency bands visualization
        this.renderFrequencyBands(audioData.bands);
    }
    
    /**
     * Render spectrum bars visualization
     */
    renderSpectrumBars(audioData) {
        const barWidth = this.canvas.width / audioData.frequencyData.length;
        const colors = this.colorPalettes[this.colorPalette];
        
        for (let i = 0; i < audioData.frequencyData.length; i++) {
            const barHeight = (audioData.frequencyData[i] / 255) * this.canvas.height * 0.8 * this.sensitivity;
            
            // Color based on frequency
            const colorIndex = Math.floor((i / audioData.frequencyData.length) * colors.length);
            this.ctx.fillStyle = colors[colorIndex] || colors[0];
            
            // Add transparency based on amplitude
            const alpha = Math.max(0.3, audioData.frequencyData[i] / 255);
            this.ctx.globalAlpha = alpha;
            
            const x = i * barWidth;
            const y = this.canvas.height - barHeight;
            
            this.ctx.fillRect(x, y, barWidth - 1, barHeight);
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render circular spectrum visualization
     */
    renderCircularSpectrum(audioData) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.8;
        const colors = this.colorPalettes[this.colorPalette];
        
        const angleStep = (Math.PI * 2) / audioData.frequencyData.length;
        
        for (let i = 0; i < audioData.frequencyData.length; i++) {
            const amplitude = audioData.frequencyData[i] / 255;
            const radius = maxRadius * amplitude * this.sensitivity;
            
            const angle = i * angleStep;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Color based on frequency
            const colorIndex = Math.floor((i / audioData.frequencyData.length) * colors.length);
            this.ctx.fillStyle = colors[colorIndex] || colors[0];
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 2 + amplitude * 4, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Render waveform visualization
     */
    renderWaveform(audioData) {
        const sliceWidth = this.canvas.width / audioData.timeData.length;
        let x = 0;
        
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.colorPalettes[this.colorPalette][0];
        this.ctx.beginPath();
        
        for (let i = 0; i < audioData.timeData.length; i++) {
            const v = audioData.timeData[i] / 128.0;
            const y = v * this.canvas.height / 2;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
    }
    
    /**
     * Render particle visualization
     */
    renderParticles(audioData) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const colors = this.colorPalettes[this.colorPalette];
        
        // Create particles based on frequency data
        for (let i = 0; i < audioData.frequencyData.length; i += 4) {
            const amplitude = audioData.frequencyData[i] / 255;
            
            if (amplitude > 0.1) {
                const angle = (i / audioData.frequencyData.length) * Math.PI * 2;
                const distance = amplitude * 200 * this.sensitivity;
                
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                
                const colorIndex = Math.floor((i / audioData.frequencyData.length) * colors.length);
                this.ctx.fillStyle = colors[colorIndex] || colors[0];
                this.ctx.globalAlpha = amplitude;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2 + amplitude * 6, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render frequency bands visualization
     */
    renderFrequencyBands(bands) {
        const barWidth = 60;
        const barHeight = 20;
        const startX = 20;
        const startY = this.canvas.height - 200;
        
        const bandNames = Object.keys(bands);
        const colors = this.colorPalettes[this.colorPalette];
        
        bandNames.forEach((bandName, index) => {
            const value = bands[bandName] / 255;
            const width = value * barWidth * this.sensitivity;
            
            const x = startX;
            const y = startY + index * (barHeight + 5);
            
            // Background bar
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            // Value bar
            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.fillRect(x, y, width, barHeight);
            
            // Label
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.fillText(bandName.toUpperCase(), x + barWidth + 10, y + 15);
        });
    }
    
    /**
     * Render default state when no audio
     */
    renderDefaultState() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const time = performance.now() * 0.002;
        const colors = this.colorPalettes[this.colorPalette];
        
        // Animated placeholder visualization
        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2 + time;
            const radius = 100 + Math.sin(time + i) * 50;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            this.ctx.fillStyle = colors[i % colors.length];
            this.ctx.globalAlpha = 0.7;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1.0;
        
        // Instructions text
        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Drop an audio file to start visualizing', centerX, centerY + 150);
        this.ctx.textAlign = 'start';
    }
    
    /**
     * Render UI overlay
     */
    renderUI() {
        // FPS counter
        const avgFPS = this.fpsHistory.length > 0 
            ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length 
            : 0;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(this.canvas.width - 150, 10, 140, 60);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`FPS: ${avgFPS.toFixed(1)}`, this.canvas.width - 140, 30);
        this.ctx.fillText(`Frames: ${this.frameCount}`, this.canvas.width - 140, 45);
        this.ctx.fillText(`Mode: ${this.visualizationMode}`, this.canvas.width - 140, 60);
    }
    
    /**
     * Set visualization mode
     */
    setVisualizationMode(mode) {
        this.visualizationMode = mode;
        console.log(`🎨 Visualization mode: ${mode}`);
    }
    
    /**
     * Set color palette
     */
    setColorPalette(palette) {
        if (this.colorPalettes[palette]) {
            this.colorPalette = palette;
            console.log(`🎨 Color palette: ${palette}`);
        }
    }
    
    /**
     * Set sensitivity
     */
    setSensitivity(sensitivity) {
        this.sensitivity = Math.max(0.1, Math.min(3.0, sensitivity));
        console.log(`🎨 Sensitivity: ${this.sensitivity}`);
    }
}