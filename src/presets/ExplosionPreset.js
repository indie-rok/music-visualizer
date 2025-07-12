/**
 * Explosion Preset — MilkDrop-Style Plasma Visualizer
 * Abstract, constantly evolving, psychedelic visualization with plasma clouds,
 * geometric patterns, kaleidoscopic symmetry, motion trails, and texture deformations
 */
import { BasePreset } from './BasePreset.js';
import { ColorThemes } from './ColorThemes.js';

export class ExplosionPreset extends BasePreset {
    init() {
        // Performance settings
        this.frameSkip = 0;
        this.targetFPS = 30;
        this.lastFrameTime = 0;
        
        // Use centralized color theme system  
        this.currentTheme = 'cyberpunk';
        this.colors = ColorThemes.getTheme(this.currentTheme);
        
        // Core animation parameters
        this.time = 0;
        this.globalRotation = 0;
        this.zoomCycle = 1.0;
        this.warpPhase = 0;
        
        // Audio-reactive smoothed values
        this.rmsResponse = 0;
        this.bassResponse = 0;
        this.midsResponse = 0;
        this.trebleResponse = 0;
        
        // Visual parameters driven by audio data
        this.visualIntensity = 0.3;      // Controlled by RMS Energy
        this.centralPulse = 0;           // Controlled by Sub Bass & Bass
        this.geometryWarp = 0;           // Controlled by Low Mids & Mids
        this.sparkleIntensity = 0;       // Controlled by Treble
        this.baseHue = 240;              // Controlled by Spectral Centroid (cool tones)
        this.motionSpeed = 1.0;          // Controlled by BPM
        this.beatPunch = 0;              // Controlled by Kick/Snare detection
        this.noiseGrain = 0;             // Controlled by Noisiness
        this.adaptiveGate = 0.545;       // Adaptive threshold for heavy effects
        
        // Plasma generation parameters
        this.plasmaOffsetX = 0;
        this.plasmaOffsetY = 0;
        this.plasmaScale = 1.0;
        
        // Geometry distortion grid
        this.gridSize = 16;
        this.distortionGrid = [];
        this.initializeDistortionGrid();
        
        // Particle systems for sparkles and noise
        this.sparkleParticles = [];
        this.maxSparkles = 30;
        this.initializeSparkles();
        
        // Trail system for motion trails
        this.trailCanvas = document.createElement('canvas');
        this.trailCanvas.width = this.width;
        this.trailCanvas.height = this.height;
        this.trailCtx = this.trailCanvas.getContext('2d');
        
        this.setupCanvas();
    }
    
    setupCanvas() {
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    initializeDistortionGrid() {
        for (let x = 0; x <= this.gridSize; x++) {
            this.distortionGrid[x] = [];
            for (let y = 0; y <= this.gridSize; y++) {
                this.distortionGrid[x][y] = {
                    offsetX: 0,
                    offsetY: 0,
                    intensity: 0
                };
            }
        }
    }
    
    initializeSparkles() {
        for (let i = 0; i < this.maxSparkles; i++) {
            this.sparkleParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: Math.random(),
                intensity: Math.random(),
                frequency: Math.random() * 0.1 + 0.05,
                isEdgeParticle: Math.random() > 0.7
            });
        }
    }
    
    render() {
        if (!this.audioData || !this.audioData.isPlaying) {
            this.renderIdle();
            return;
        }
        
        // Update all audio-reactive parameters
        this.updateAudioReactiveParams();
        
        // Apply trail fade for motion trails
        this.ctx.globalCompositeOperation = 'source-over';
        const fadeAlpha = Math.max(0.03, 0.1 - this.visualIntensity * 0.05);
        this.ctx.fillStyle = `rgba(${this.colors.background[0]}, ${this.colors.background[1]}, ${this.colors.background[2]}, ${fadeAlpha})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Render the plasma-based visual elements
        this.renderPlasmaCore();
        this.renderKaleidoscopicGeometry();
        this.renderMorphingPatterns();
        this.renderSparkleSystem();
        this.renderBeatReactiveEffects();
        
        // Update time-based animations
        this.time += 0.016 * this.motionSpeed;
        this.globalRotation += 0.01 * this.motionSpeed;
        this.warpPhase += 0.02 * this.motionSpeed;
        this.plasmaOffsetX += 0.5 * this.motionSpeed;
        this.plasmaOffsetY += 0.3 * this.motionSpeed;
    }
    
    updateAudioReactiveParams() {
        // Normalize frequency values (0-255 range) to 0-1
        const subBass = Math.min((this.audioData.bands.subBass || 0) / 255, 1);
        const bass = Math.min((this.audioData.bands.bass || 0) / 255, 1);
        const lowMids = Math.min((this.audioData.bands.lowMids || 0) / 255, 1);
        const mids = Math.min((this.audioData.bands.mids || 0) / 255, 1);
        const highMids = Math.min((this.audioData.bands.highMids || 0) / 255, 1);
        const treble = Math.min((this.audioData.bands.treble || 0) / 255, 1);
        const rms = this.rmsStats.current || 0;
        
        // Get beat and tempo data
        const bpm = this.beatData?.bpm || 124;
        const beatConfidence = this.confidenceStats?.overall || 0;
        const spectralCentroid = this.beatData?.spectralCentroid || 0.311;
        const kickDetected = this.beatData?.kickDetected || false;
        const snareDetected = this.beatData?.snareDetected || false;
        const kickEnergy = this.beatData?.kickEnergy || 0;
        const snareEnergy = this.beatData?.snareEnergy || 0;
        const noisiness = this.zcrStats?.noisiness || 'mixed';
        const adaptiveThreshold = this.beatData?.adaptiveThreshold || 0.545;
        
        // Smooth responses for fluid motion
        this.rmsResponse = this.rmsResponse * 0.85 + rms * 0.15;
        this.bassResponse = this.bassResponse * 0.8 + (subBass + bass) * 0.1;
        this.midsResponse = this.midsResponse * 0.8 + (lowMids + mids) * 0.1;
        this.trebleResponse = this.trebleResponse * 0.85 + treble * 0.15;
        
        // 📈 RMS Energy → Visual Intensity, Motion Speed, Glow Strength
        this.visualIntensity = Math.max(0.1, Math.min(1.0, this.rmsResponse * 3));
        
        // 🔉 Sub Bass & Bass → Central Pulsations, Zoom, Scale Deformations
        this.centralPulse = this.bassResponse;
        this.zoomCycle = 1.0 + Math.sin(this.time * 2) * this.bassResponse * 0.3;
        
        // 🎸 Low Mids & Mids → Geometry Warping, Grid Movement, Wave Distortion
        this.geometryWarp = this.midsResponse;
        this.updateDistortionGrid();
        
        // 🔊 Treble → Particle Sparkles, Fast Flickers, Edge Motion
        this.sparkleIntensity = this.trebleResponse;
        
        // 📍 Spectral Centroid → Color Palette (cool to warm)
        this.baseHue = 240 - (spectralCentroid * 180); // 240° (blue) to 60° (yellow)
        
        // 🎼 BPM → Global Tempo of Animations
        this.motionSpeed = Math.max(0.5, Math.min(2.0, bpm / 124));
        
        // 💥 Beat Detection → Camera Shake, Zoom, Texture Flash
        if ((kickDetected && kickEnergy > adaptiveThreshold) || 
            (snareDetected && snareEnergy > adaptiveThreshold)) {
            this.beatPunch = Math.max(kickEnergy, snareEnergy);
        } else {
            this.beatPunch *= 0.9; // Fade out
        }
        
        // 🌪️ Noisiness → High-frequency Motion, Flickering Textures
        this.noiseGrain = noisiness === 'noisy' ? 0.8 : (noisiness === 'mixed' ? 0.4 : 0.1);
        
        // Update sparkle particles
        this.updateSparkleParticles();
    }
    
    renderPlasmaCore() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Create plasma-like radial gradients that shift and morph
        const numLayers = 4;
        for (let layer = 0; layer < numLayers; layer++) {
            const layerPhase = this.time * (0.5 + layer * 0.3) + layer * Math.PI / 2;
            const layerRadius = (80 + layer * 40) * this.zoomCycle;
            const layerIntensity = this.visualIntensity * (1 - layer * 0.2);
            
            // Apply central pulse from bass
            const pulseRadius = layerRadius * (1 + this.centralPulse * 0.5);
            
            // Create shifting gradient
            const gradient = this.ctx.createRadialGradient(
                centerX + Math.sin(layerPhase) * 20,
                centerY + Math.cos(layerPhase * 1.3) * 20,
                0,
                centerX, centerY, pulseRadius
            );
            
            // Dynamic color shifting based on spectral centroid
            const hue1 = this.baseHue + layer * 30 + Math.sin(this.time + layer) * 20;
            const hue2 = this.baseHue + layer * 60 + Math.cos(this.time * 1.5 + layer) * 30;
            
            gradient.addColorStop(0, `hsla(${hue1}, 90%, ${40 + layerIntensity * 30}%, ${layerIntensity * 0.8})`);
            gradient.addColorStop(0.4, `hsla(${hue2}, 80%, ${30 + layerIntensity * 20}%, ${layerIntensity * 0.5})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
    
    renderKaleidoscopicGeometry() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Create symmetrical, kaleidoscopic patterns
        const symmetryCount = 6;
        const angleStep = (Math.PI * 2) / symmetryCount;
        
        for (let sym = 0; sym < symmetryCount; sym++) {
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(sym * angleStep + this.globalRotation);
            this.ctx.scale(this.zoomCycle, this.zoomCycle);
            
            // Render geometric pattern
            this.renderGeometricPattern(sym);
            
            this.ctx.restore();
        }
    }
    
    renderGeometricPattern(symmetryIndex) {
        const numElements = 8;
        const baseRadius = 60;
        
        for (let i = 0; i < numElements; i++) {
            const angle = (i / numElements) * Math.PI * 2 + this.time * 0.5;
            const radius = baseRadius + i * 15;
            
            // Apply geometry warping from mids
            const warpX = Math.sin(angle * 3 + this.warpPhase) * this.geometryWarp * 30;
            const warpY = Math.cos(angle * 2 + this.warpPhase * 1.5) * this.geometryWarp * 20;
            
            const x = Math.cos(angle) * radius + warpX;
            const y = Math.sin(angle) * radius + warpY;
            
            // Dynamic coloring
            const hue = this.baseHue + i * 20 + symmetryIndex * 10 + this.time * 30;
            const alpha = this.visualIntensity * (0.4 - i * 0.03);
            
            this.ctx.fillStyle = `hsla(${hue}, 85%, 60%, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 3 + this.centralPulse * 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Connect with lines for geometric structure
            if (i > 0) {
                const prevAngle = ((i - 1) / numElements) * Math.PI * 2 + this.time * 0.5;
                const prevX = Math.cos(prevAngle) * (baseRadius + (i - 1) * 15) + 
                            Math.sin(prevAngle * 3 + this.warpPhase) * this.geometryWarp * 30;
                const prevY = Math.sin(prevAngle) * (baseRadius + (i - 1) * 15) + 
                            Math.cos(prevAngle * 2 + this.warpPhase * 1.5) * this.geometryWarp * 20;
                
                this.ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${alpha * 0.5})`;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(prevX, prevY);
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            }
        }
    }
    
    renderMorphingPatterns() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Create morphing wave patterns across the canvas
        const waveCount = 3;
        for (let wave = 0; wave < waveCount; wave++) {
            const wavePhase = this.time * (1 + wave * 0.3) + wave * Math.PI;
            const waveAmplitude = 50 + this.geometryWarp * 80;
            
            this.ctx.strokeStyle = `hsla(${this.baseHue + wave * 60}, 75%, 55%, ${this.visualIntensity * 0.3})`;
            this.ctx.lineWidth = 1 + this.centralPulse;
            this.ctx.beginPath();
            
            // Create flowing wave patterns
            for (let x = 0; x < this.width; x += 8) {
                const normalizedX = (x - centerX) / centerX;
                const y1 = centerY + Math.sin(normalizedX * 2 + wavePhase) * waveAmplitude;
                const y2 = centerY + Math.cos(normalizedX * 3 + wavePhase * 1.5) * waveAmplitude * 0.7;
                
                const finalY = (y1 + y2) / 2;
                
                if (x === 0) {
                    this.ctx.moveTo(x, finalY);
                } else {
                    this.ctx.lineTo(x, finalY);
                }
            }
            this.ctx.stroke();
        }
    }
    
    renderSparkleSystem() {
        this.ctx.globalCompositeOperation = 'lighter';
        
        this.sparkleParticles.forEach(particle => {
            if (this.sparkleIntensity < 0.1) return;
            
            // Flickering effect based on treble
            const flicker = Math.sin(this.time * 30 + particle.frequency * 100) * 0.5 + 0.5;
            const alpha = particle.life * this.sparkleIntensity * flicker * 0.8;
            
            if (alpha < 0.01) return;
            
            // Edge particles sparkle more intensely
            const edgeBoost = particle.isEdgeParticle ? 1.5 : 1.0;
            const finalAlpha = alpha * edgeBoost;
            
            // Add noise grain effect
            const noiseFlicker = 1 + (Math.random() - 0.5) * this.noiseGrain * 0.3;
            const size = (2 + particle.intensity * 2) * noiseFlicker;
            
            this.ctx.fillStyle = `hsla(${this.baseHue + 120}, 90%, 80%, ${finalAlpha})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderBeatReactiveEffects() {
        if (this.beatPunch < 0.1) return;
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Beat punch creates screen-wide flash/distortion
        const flashRadius = Math.max(this.width, this.height) * 0.8;
        const flashAlpha = this.beatPunch * 0.3;
        
        // Create beat flash
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, flashRadius
        );
        
        gradient.addColorStop(0, `hsla(${this.baseHue}, 100%, 90%, ${flashAlpha})`);
        gradient.addColorStop(0.3, `hsla(${this.baseHue + 60}, 80%, 70%, ${flashAlpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Beat punch creates radial distortion lines
        const numLines = 12;
        const angleStep = (Math.PI * 2) / numLines;
        
        for (let i = 0; i < numLines; i++) {
            const angle = i * angleStep + this.time;
            const length = 100 + this.beatPunch * 200;
            
            this.ctx.strokeStyle = `hsla(${this.baseHue + i * 20}, 90%, 70%, ${this.beatPunch * 0.6})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(
                centerX + Math.cos(angle) * length,
                centerY + Math.sin(angle) * length
            );
            this.ctx.stroke();
        }
    }
    
    updateDistortionGrid() {
        for (let x = 0; x <= this.gridSize; x++) {
            for (let y = 0; y <= this.gridSize; y++) {
                const gridPoint = this.distortionGrid[x][y];
                
                // Create wave-based distortion influenced by mids
                const waveX = Math.sin(x * 0.5 + this.time * 2) * this.geometryWarp * 10;
                const waveY = Math.cos(y * 0.5 + this.time * 1.5) * this.geometryWarp * 8;
                
                gridPoint.offsetX = waveX;
                gridPoint.offsetY = waveY;
                gridPoint.intensity = this.geometryWarp;
            }
        }
    }
    
    updateSparkleParticles() {
        this.sparkleParticles.forEach(particle => {
            // Update position with treble-influenced motion
            particle.x += particle.vx * (1 + this.trebleResponse);
            particle.y += particle.vy * (1 + this.trebleResponse);
            
            // Add noise-based random movement
            if (this.noiseGrain > 0.3) {
                particle.vx += (Math.random() - 0.5) * this.noiseGrain * 0.5;
                particle.vy += (Math.random() - 0.5) * this.noiseGrain * 0.5;
            }
            
            // Apply damping
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            // Update life with flickering
            particle.life += (Math.random() - 0.5) * 0.03;
            particle.life = Math.max(0.1, Math.min(1, particle.life));
            
            // Wrap around edges
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
        });
    }
    
    renderIdle() {
        this.clear();
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const time = this.getTime();
        
        // Gentle plasma animation when idle
        for (let i = 0; i < 3; i++) {
            const radius = 40 + i * 30 + Math.sin(time + i) * 15;
            const alpha = 0.3 + Math.sin(time * 2 + i * 2) * 0.1;
            
            const gradient = this.ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, radius
            );
            
            gradient.addColorStop(0, `hsla(${240 + i * 60}, 80%, 50%, ${alpha})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
        
        // Text
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Explosion Ready', centerX, centerY + 120);
    }
    
    /**
     * Set color theme
     */
    setColorTheme(themeName) {
        const theme = ColorThemes.getTheme(themeName);
        if (theme) {
            this.currentTheme = themeName;
            this.colors = theme;
            console.log(`🎨 Explosion theme changed to: ${theme.name}`);
        }
    }
    
    /**
     * Get available color themes
     */
    getAvailableThemes() {
        return ColorThemes.getThemeNames();
    }
    
    getInfo() {
        return {
            name: 'Explosion',
            description: 'MilkDrop-style plasma visualizer with morphing geometry and psychedelic effects',
            version: '1.0.0'
        };
    }
}