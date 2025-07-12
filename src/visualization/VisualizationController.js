/**
 * VisualizationController - Manages real-time audio visualization loop
 * Coordinates audio analysis and visual rendering at 60fps
 */

import { AudioReactiveAnimations } from '../audio/AudioReactiveAnimations.js';

export class VisualizationController {
    constructor(canvas, audioEngine, beatDetection = null, instagramCanvas = null) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioEngine = audioEngine;
        this.beatDetection = beatDetection;
        
        // Instagram canvas for export
        this.instagramCanvas = instagramCanvas;
        this.instagramCtx = instagramCanvas ? instagramCanvas.getContext('2d') : null;
        
        // Initialize audio-reactive animation system
        this.audioAnimations = new AudioReactiveAnimations();
        
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
        this.complexityLevel = 'moderate';
        
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
        this.setupInstagramCanvas();
        
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
     * Setup Instagram canvas with proper phone screen dimensions (9:16 aspect ratio)
     */
    setupInstagramCanvas() {
        if (this.instagramCanvas) {
            // Phone screen dimensions for Instagram Stories/Reels (9:16 aspect ratio)
            const width = 300; // Reasonable size for display
            const height = Math.round(width * (16/9)); // 533px for 9:16 ratio
            
            this.instagramCanvas.width = width;
            this.instagramCanvas.height = height;
            this.instagramCanvas.style.width = width + 'px';
            this.instagramCanvas.style.height = height + 'px';
            
            console.log(`📱 Instagram canvas setup: ${width}x${height} (9:16 ratio)`);
        }
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
        
        // Clear main canvas (for UI overlay)
        this.clearCanvas();
        
        // Get audio analysis data
        const audioData = this.audioEngine.getAnalysisData();
        
        // Get beat detection data if available
        let beatData = null;
        if (this.beatDetection && audioData) {
            beatData = this.beatDetection.analyzeFrame();
        }
        
        if (audioData) {
            // Update audio-reactive animation system
            const animationState = this.audioAnimations.update(audioData, beatData);
            
            // Only render to Instagram canvas
            this.renderInstagramVisualization(audioData, beatData, animationState);
            
            // Update HTML stats with audio data
            if (this.beatDetection) {
                const stats = this.beatDetection.getKickStats();
                this.updateAudioStatsHTML(stats, audioData.bands);
            }
        } else {
            // Render default state only on Instagram canvas
            this.renderInstagramDefaultState();
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
     * Clear main canvas (minimal background)
     */
    clearCanvas() {
        // Simple dark background since no visualizations on main canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    
    /**
     * Render spectrum bars visualization
     */
    renderSpectrumBars(audioData, beatData = null, animationState = null) {
        const barWidth = this.canvas.width / audioData.frequencyData.length;
        const colors = this.colorPalettes[this.colorPalette];
        
        // Animation enhancement factors
        const sizeMultiplier = animationState ? animationState.sizeMultiplier * animationState.beatSizeBoost : 1.0;
        const rotationAngle = animationState ? animationState.rotationSpeed * 0.1 : 0;
        const globalOpacity = animationState ? animationState.opacity : 1.0;
        
        for (let i = 0; i < audioData.frequencyData.length; i++) {
            const barHeight = (audioData.frequencyData[i] / 255) * this.canvas.height * 0.8 * this.sensitivity * sizeMultiplier;
            
            // Color based on frequency with spectral enhancement
            const colorIndex = Math.floor((i / audioData.frequencyData.length) * colors.length);
            let fillColor = colors[colorIndex] || colors[0];
            
            // Apply spectral color mapping from animation system
            if (animationState && this.audioAnimations) {
                fillColor = this.audioAnimations.getSpectralColor(fillColor, 1.5); // Increased intensity for better visibility
            }
            
            // Enhance color on kick detection
            if (beatData && beatData.kickDetected && i < audioData.frequencyData.length * 0.2) {
                fillColor = '#FFFFFF'; // White flash for kick in low frequencies
            }
            
            this.ctx.fillStyle = fillColor;
            
            // Add transparency based on amplitude and animation state
            const baseAlpha = Math.max(0.3, audioData.frequencyData[i] / 255);
            this.ctx.globalAlpha = baseAlpha * globalOpacity;
            
            const x = i * barWidth;
            const y = this.canvas.height - barHeight;
            
            // Apply subtle rotation effect for dynamic bars
            if (rotationAngle !== 0 && barHeight > 20) {
                this.ctx.save();
                this.ctx.translate(x + barWidth/2, y + barHeight/2);
                this.ctx.rotate(rotationAngle * 0.01);
                this.ctx.fillRect(-barWidth/2, -barHeight/2, barWidth - 1, barHeight);
                this.ctx.restore();
            } else {
                this.ctx.fillRect(x, y, barWidth - 1, barHeight);
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render circular spectrum visualization
     */
    renderCircularSpectrum(audioData, beatData = null, animationState = null) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.8;
        const colors = this.colorPalettes[this.colorPalette];
        
        // Animation enhancement factors - reduced rotation for circular mode
        const sizeMultiplier = animationState ? animationState.sizeMultiplier * animationState.beatSizeBoost : 1.0;
        const rotationOffset = animationState ? animationState.bpmPhase * Math.PI * 0.1 : 0; // Much slower rotation
        const globalOpacity = animationState ? animationState.opacity : 1.0;
        
        const angleStep = (Math.PI * 2) / audioData.frequencyData.length;
        
        this.ctx.globalAlpha = globalOpacity;
        
        for (let i = 0; i < audioData.frequencyData.length; i++) {
            const amplitude = audioData.frequencyData[i] / 255;
            const radius = maxRadius * amplitude * this.sensitivity * sizeMultiplier;
            
            const angle = i * angleStep + rotationOffset;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Color based on frequency with spectral enhancement
            const colorIndex = Math.floor((i / audioData.frequencyData.length) * colors.length);
            let fillColor = colors[colorIndex] || colors[0];
            
            // Apply spectral color mapping from animation system
            if (animationState && this.audioAnimations) {
                fillColor = this.audioAnimations.getSpectralColor(fillColor, 1.5); // Increased intensity for better visibility
            }
            
            this.ctx.fillStyle = fillColor;
            
            const particleRadius = (2 + amplitude * 4) * (sizeMultiplier * 0.5 + 0.5);
            this.ctx.beginPath();
            this.ctx.arc(x, y, particleRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render waveform visualization
     */
    renderWaveform(audioData, beatData = null, animationState = null) {
        const sliceWidth = this.canvas.width / audioData.timeData.length;
        let x = 0;
        
        // Animation enhancement factors - very gentle for waveform
        const sizeMultiplier = animationState ? (animationState.sizeMultiplier * 0.3 + 0.7) : 1.0; // Much reduced size changes
        const globalOpacity = animationState ? animationState.opacity : 1.0;
        
        this.ctx.lineWidth = 2 * Math.min(sizeMultiplier, 1.2); // Cap the line width growth
        this.ctx.globalAlpha = globalOpacity;
        
        // Apply spectral color mapping with higher intensity
        let strokeColor = this.colorPalettes[this.colorPalette][0];
        if (animationState && this.audioAnimations) {
            strokeColor = this.audioAnimations.getSpectralColor(strokeColor, 2.0); // Increased intensity for more visible color changes
        }
        this.ctx.strokeStyle = strokeColor;
        
        this.ctx.beginPath();
        
        for (let i = 0; i < audioData.timeData.length; i++) {
            const v = (audioData.timeData[i] - 128) / 128.0; // Center the waveform properly
            const y = (this.canvas.height / 2) + (v * this.canvas.height / 8 * sizeMultiplier); // Much smaller amplitude changes
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render particle visualization
     */
    renderParticles(audioData, beatData = null, animationState = null) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const colors = this.colorPalettes[this.colorPalette];
        
        // Complexity affects particle count and behavior
        let step = 4;
        let maxRadius = 6;
        let trailEffect = false;
        
        switch (this.complexityLevel) {
            case 'simple':
                step = 8;
                maxRadius = 4;
                break;
            case 'moderate':
                step = 4;
                maxRadius = 6;
                break;
            case 'complex':
                step = 4; // Reduced from 2 to 4 - fewer particles
                maxRadius = 6; // Reduced from 8 to 6 - smaller particles
                trailEffect = false; // Disabled trails to reduce visual complexity
                break;
        }
        
        // Animation enhancement factors - reduced rotation for particles mode
        const sizeMultiplier = animationState ? animationState.sizeMultiplier * animationState.beatSizeBoost : 1.0;
        const rotationOffset = animationState ? animationState.bpmPhase * Math.PI * 0.05 : 0; // Very slow rotation
        const globalOpacity = animationState ? animationState.opacity : 1.0;
        
        // Create particles based on frequency data
        for (let i = 0; i < audioData.frequencyData.length; i += step) {
            const amplitude = audioData.frequencyData[i] / 255;
            
            if (amplitude > 0.1) {
                const angle = (i / audioData.frequencyData.length) * Math.PI * 2 + rotationOffset;
                const distance = amplitude * 200 * this.sensitivity * sizeMultiplier;
                
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                
                // Color based on frequency with spectral enhancement
                const colorIndex = Math.floor((i / audioData.frequencyData.length) * colors.length);
                let fillColor = colors[colorIndex] || colors[0];
                
                // Apply spectral color mapping from animation system
                if (animationState && this.audioAnimations) {
                    fillColor = this.audioAnimations.getSpectralColor(fillColor, 1.5); // Increased intensity for better visibility
                }
                
                this.ctx.fillStyle = fillColor;
                this.ctx.globalAlpha = amplitude * globalOpacity * (trailEffect ? 0.7 : 1.0);
                
                const radius = (2 + amplitude * maxRadius) * (sizeMultiplier * 0.3 + 0.7);
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Complex mode adds trailing effect - reduced trail movement
                if (trailEffect && amplitude > 0.3) {
                    for (let j = 1; j <= 3; j++) {
                        const trailDistance = distance * (1 - j * 0.1); // Reduced trail spacing
                        const trailAngle = angle - (j * 0.02 * Math.PI); // Much less trail rotation
                        const trailX = centerX + Math.cos(trailAngle) * trailDistance;
                        const trailY = centerY + Math.sin(trailAngle) * trailDistance;
                        this.ctx.globalAlpha = amplitude * globalOpacity * 0.3 / j;
                        this.ctx.beginPath();
                        this.ctx.arc(trailX, trailY, radius * (1 - j * 0.3), 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                }
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render geometric visualization
     */
    renderGeometric(audioData, beatData = null, animationState = null) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const colors = this.colorPalettes[this.colorPalette];
        const time = performance.now() * 0.001;
        
        // Complexity multiplier based on level - reduced for complex mode
        let complexityMultiplier = 1;
        switch (this.complexityLevel) {
            case 'simple': complexityMultiplier = 0.5; break;
            case 'moderate': complexityMultiplier = 1; break;
            case 'complex': complexityMultiplier = 1.2; break; // Reduced from 2 to 1.2
        }
        
        // Animation enhancement factors - much gentler for complex mode
        const sizeMultiplier = animationState ? animationState.sizeMultiplier * animationState.beatSizeBoost : 1.0;
        const rotationSpeed = animationState ? animationState.rotationSpeed * 0.05 : 0.05; // Even slower rotation
        const globalOpacity = animationState ? animationState.opacity : 1.0;
        const bpmSync = animationState ? animationState.bpmPhase * 0.1 : 0; // Much less BPM sync intensity
        
        // Set global opacity for all shapes
        this.ctx.globalAlpha = globalOpacity;
        
        // Create geometric shapes based on frequency data
        const numShapes = Math.floor(8 * complexityMultiplier);
        for (let i = 0; i < numShapes; i++) {
            const freqIndex = Math.floor((i / numShapes) * audioData.frequencyData.length);
            const amplitude = audioData.frequencyData[freqIndex] / 255;
            
            if (amplitude > 0.1) {
                const angle = (i / numShapes) * Math.PI * 2 + time * 0.02 * rotationSpeed + bpmSync * Math.PI; // Much slower base rotation
                const distance = amplitude * 80 * this.sensitivity * sizeMultiplier; // Much less movement distance
                
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                
                // Color based on frequency with spectral enhancement
                const colorIndex = Math.floor((i / numShapes) * colors.length);
                let fillColor = colors[colorIndex] || colors[0];
                
                // Apply spectral color mapping from animation system
                if (animationState && this.audioAnimations) {
                    fillColor = this.audioAnimations.getSpectralColor(fillColor, 1.5); // Increased intensity for better visibility
                }
                
                this.ctx.fillStyle = fillColor;
                this.ctx.globalAlpha = amplitude * globalOpacity * 0.8;
                
                // Draw different shapes based on complexity with animation enhancement
                if (this.complexityLevel === 'simple') {
                    // Simple circles with size animation
                    const radius = (5 + amplitude * 10) * sizeMultiplier;
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (this.complexityLevel === 'moderate') {
                    // Squares with gentle rotation animation
                    const size = (10 + amplitude * 20) * sizeMultiplier;
                    this.ctx.save();
                    this.ctx.translate(x, y);
                    this.ctx.rotate(bpmSync * Math.PI * 0.2 + time * rotationSpeed * 0.02); // Even slower rotation
                    this.ctx.fillRect(-size/2, -size/2, size, size);
                    this.ctx.restore();
                } else {
                    // Complex polygons with very gentle rotation
                    const sides = 6;
                    const radius = (8 + amplitude * 15) * sizeMultiplier;
                    this.ctx.save();
                    this.ctx.translate(x, y);
                    this.ctx.rotate(bpmSync * Math.PI * 0.1 + time * rotationSpeed * 0.01); // Extremely slow rotation
                    this.ctx.beginPath();
                    for (let j = 0; j < sides; j++) {
                        const vertexAngle = (j / sides) * Math.PI * 2;
                        const vx = Math.cos(vertexAngle) * radius;
                        const vy = Math.sin(vertexAngle) * radius;
                        if (j === 0) this.ctx.moveTo(vx, vy);
                        else this.ctx.lineTo(vx, vy);
                    }
                    this.ctx.closePath();
                    this.ctx.fill();
                    this.ctx.restore();
                }
            }
        }
        
        // Add rotating geometric pattern in center with animation enhancement
        this.ctx.globalAlpha = 0.6 * globalOpacity;
        
        // Apply spectral color to center pattern
        let strokeColor = colors[0];
        if (animationState && this.audioAnimations) {
            strokeColor = this.audioAnimations.getSpectralColor(strokeColor, 1.5); // Increased intensity for better visibility
        }
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 2 * sizeMultiplier;
        
        const centerShapes = Math.floor(2 * complexityMultiplier); // Fewer center shapes
        for (let i = 0; i < centerShapes; i++) {
            const radius = (50 + i * 30) * sizeMultiplier;
            const rotation = time * (0.02 + i * 0.01) * rotationSpeed + bpmSync * Math.PI * 0.05; // Extremely slow center rotation
            
            this.ctx.beginPath();
            const sides = 3 + i;
            for (let j = 0; j <= sides; j++) {
                const angle = (j / sides) * Math.PI * 2 + rotation;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                if (j === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.stroke();
        }
        
        this.ctx.globalAlpha = 1.0;
    }
    
    /**
     * Render visualization to Instagram canvas
     */
    renderInstagramVisualization(audioData, beatData = null, animationState = null) {
        if (!this.instagramCtx) return;
        
        // Clear Instagram canvas with background
        this.clearInstagramCanvas();
        
        
        // Render the same visualization but scaled for Instagram canvas
        const originalCanvas = this.canvas;
        const originalCtx = this.ctx;
        
        // Temporarily switch to Instagram canvas
        this.canvas = this.instagramCanvas;
        this.ctx = this.instagramCtx;
        
        // Render visualization based on current mode
        switch (this.visualizationMode) {
            case 'spectrum':
                this.renderSpectrumBars(audioData, beatData, animationState);
                break;
            case 'circular':
                this.renderCircularSpectrum(audioData, beatData, animationState);
                break;
            case 'waveform':
                this.renderWaveform(audioData, beatData, animationState);
                break;
            case 'particles':
                this.renderParticles(audioData, beatData, animationState);
                break;
            case 'geometric':
                this.renderGeometric(audioData, beatData, animationState);
                break;
            default:
                this.renderSpectrumBars(audioData, beatData, animationState);
        }
        
        // Restore original canvas
        this.canvas = originalCanvas;
        this.ctx = originalCtx;
    }
    
    /**
     * Clear Instagram canvas with background
     */
    clearInstagramCanvas() {
        if (!this.instagramCtx) return;
        
        // Create gradient background
        const gradient = this.instagramCtx.createLinearGradient(0, 0, this.instagramCanvas.width, this.instagramCanvas.height);
        
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
        
        this.instagramCtx.fillStyle = gradient;
        this.instagramCtx.fillRect(0, 0, this.instagramCanvas.width, this.instagramCanvas.height);
    }
    
    /**
     * Render default state to Instagram canvas
     */
    renderInstagramDefaultState() {
        if (!this.instagramCtx) return;
        
        this.clearInstagramCanvas();
        
        const centerX = this.instagramCanvas.width / 2;
        const centerY = this.instagramCanvas.height / 2;
        const time = performance.now() * 0.002;
        const colors = this.colorPalettes[this.colorPalette];
        
        // Animated placeholder visualization
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2 + time;
            const radius = 50 + Math.sin(time + i) * 25;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            this.instagramCtx.fillStyle = colors[i % colors.length];
            this.instagramCtx.globalAlpha = 0.7;
            this.instagramCtx.beginPath();
            this.instagramCtx.arc(x, y, 2, 0, Math.PI * 2);
            this.instagramCtx.fill();
        }
        
        this.instagramCtx.globalAlpha = 1.0;
        
        // Instructions text
        this.instagramCtx.fillStyle = 'white';
        this.instagramCtx.font = '14px Arial';
        this.instagramCtx.textAlign = 'center';
        this.instagramCtx.fillText('Drop an audio file', centerX, centerY + 80);
        this.instagramCtx.fillText('to start visualizing', centerX, centerY + 100);
        this.instagramCtx.textAlign = 'start';
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
    
    /**
     * Set complexity level
     */
    setComplexityLevel(level) {
        if (['simple', 'moderate', 'complex'].includes(level)) {
            this.complexityLevel = level;
            console.log(`🎨 Complexity level: ${level}`);
        }
    }
    
    /**
     * Update HTML audio stats panel
     */
    updateAudioStatsHTML(stats, frequencyBands = null) {
        if (!this.beatDetection) return;
        
        // Get all the audio analysis data
        const rmsStats = this.beatDetection.getRMSStats();
        const zcrStats = this.beatDetection.getZCRStats();
        const confidenceStats = this.beatDetection.getConfidenceStats();
        
        // Update BPM
        const bpmElement = document.getElementById('bpm-value');
        if (bpmElement) {
            bpmElement.textContent = stats.bpm > 0 ? stats.bpm.toString() : 'Detecting...';
            bpmElement.className = 'stat-value' + (stats.bpm > 0 ? ' good' : '');
        }
        
        // Update RMS Energy
        const rmsElement = document.getElementById('rms-value');
        if (rmsElement) {
            rmsElement.textContent = `${(rmsStats.current * 100).toFixed(1)}%`;
            rmsElement.className = 'stat-value';
        }
        
        // Update Zero Crossing Rate
        const zcrElement = document.getElementById('zcr-value');
        if (zcrElement) {
            zcrElement.textContent = `${(zcrStats.current * 100).toFixed(1)}% (${zcrStats.noisiness})`;
            zcrElement.className = `stat-value ${zcrStats.noisiness}`;
        }
        
        // Update Confidence
        const confidenceElement = document.getElementById('confidence-value');
        if (confidenceElement) {
            confidenceElement.textContent = `${(confidenceStats.smoothed * 100).toFixed(0)}% (${confidenceStats.reliability})`;
            confidenceElement.className = `stat-value ${confidenceStats.reliability}`;
        }
        
        // Update Kick Count
        const kickElement = document.getElementById('kick-count');
        if (kickElement) {
            kickElement.textContent = stats.totalKicks.toString();
            kickElement.className = 'stat-value';
        }
        
        // Update Snare Count
        const snareElement = document.getElementById('snare-count');
        if (snareElement) {
            snareElement.textContent = stats.totalSnares.toString();
            snareElement.className = 'stat-value';
        }
        
        // Update EQ Data (Frequency Bands)
        if (frequencyBands) {
            const bassElement = document.getElementById('bass-value');
            if (bassElement) {
                bassElement.textContent = `${(frequencyBands.bass / 255 * 100).toFixed(0)}%`;
                bassElement.className = 'stat-value';
            }
            
            const midsElement = document.getElementById('mids-value');
            if (midsElement) {
                midsElement.textContent = `${(frequencyBands.mids / 255 * 100).toFixed(0)}%`;
                midsElement.className = 'stat-value';
            }
            
            const trebleElement = document.getElementById('treble-value');
            if (trebleElement) {
                trebleElement.textContent = `${(frequencyBands.treble / 255 * 100).toFixed(0)}%`;
                trebleElement.className = 'stat-value';
            }
        }
    }
    
}