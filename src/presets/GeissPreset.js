/**
 * Geiss v2 Preset — Data-Driven Visual Description
 * A swirling, symmetrical liquid visual field with organic waves and radial pulsations
 * Feels alive — like watching an energy field dancing with the music
 */
import { BasePreset } from './BasePreset.js';
import { ColorThemes } from './ColorThemes.js';

export class GeissPreset extends BasePreset {
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
        this.pulsePhase = 0;
        this.wavePhase = 0;
        this.zoomLevel = 1.0;
        
        // Audio-reactive values (smoothed)
        this.bassResponse = 0;
        this.midsResponse = 0;
        this.trebleResponse = 0;
        this.rmsResponse = 0;
        this.bpmPulse = 0;
        
        // Visual parameters driven by audio data
        this.rippleRate = 1.0;        // Controlled by BPM
        this.morphIntensity = 0.5;    // Controlled by Low Mids & Mids
        this.trailLength = 0.1;       // Controlled by RMS Energy & Bass
        this.baseHue = 240;           // Controlled by Spectral Centroid (blue/purple)
        this.brightness = 0.3;        // Controlled by RMS Energy
        this.pulseZoom = 0;           // Controlled by Beat Confidence & BPM
        this.noiseGrain = 0;          // Controlled by Noisiness
        
        // Ripple system for concentric waves
        this.ripples = [];
        this.maxRipples = 8;
        
        // Edge noise particles for noisiness
        this.noiseParticles = [];
        this.maxNoiseParticles = 50;
        
        this.initializeRipples();
        this.initializeNoiseParticles();
        this.setupCanvas();
    }
    
    setupCanvas() {
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    initializeRipples() {
        for (let i = 0; i < this.maxRipples; i++) {
            this.ripples.push({
                radius: i * 50 + 30,
                baseRadius: i * 50 + 30,
                phase: (i / this.maxRipples) * Math.PI * 2,
                life: 1,
                intensity: 1 - (i / this.maxRipples) * 0.7
            });
        }
    }
    
    initializeNoiseParticles() {
        for (let i = 0; i < this.maxNoiseParticles; i++) {
            this.noiseParticles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: Math.random(),
                size: Math.random() * 1 + 0.5,
                isEdgeParticle: Math.random() > 0.5
            });
        }
    }
    
    render() {
        if (!this.audioData || !this.audioData.isPlaying) {
            this.renderIdle();
            return;
        }
        
        // Apply trail fade based on RMS Energy & Bass (fractal echoes/trails)
        this.ctx.globalCompositeOperation = 'source-over';
        const fadeAlpha = Math.max(0.05, this.trailLength);
        this.ctx.fillStyle = `rgba(${this.colors.background[0]}, ${this.colors.background[1]}, ${this.colors.background[2]}, ${fadeAlpha})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Update all audio-reactive parameters
        this.updateAudioReactiveParams();
        
        // Render the swirling liquid visual field
        this.renderLiquidCore();
        this.renderRadialWaves();
        this.renderMorphingDistortions();
        this.renderBeatBursts();
        this.renderEdgeNoise();
        
        // Update time-based animations
        this.time += 0.016; // ~60fps time progression
        this.pulsePhase += this.rippleRate * 0.02;
        this.wavePhase += 0.01;
    }
    
    updateAudioReactiveParams() {
        // Normalize frequency values (0-255 range) to 0-1
        const bass = Math.min((this.audioData.bands.bass || 0) / 255, 1);
        const subBass = Math.min((this.audioData.bands.subBass || 0) / 255, 1);
        const lowMids = Math.min((this.audioData.bands.lowMids || 0) / 255, 1);
        const mids = Math.min((this.audioData.bands.mids || 0) / 255, 1);
        const treble = Math.min((this.audioData.bands.treble || 0) / 255, 1);
        const rms = this.rmsStats.current || 0;
        
        // Get beat data
        const bpm = this.beatData?.bpm || 120;
        const beatConfidence = this.confidenceStats?.overall || 0;
        const spectralCentroid = this.beatData?.spectralCentroid || 0.3;
        const spectralFlux = this.beatData?.spectralFlux || 0;
        const kickDetected = this.beatData?.kickDetected || false;
        const snareDetected = this.beatData?.snareDetected || false;
        const kickEnergy = this.beatData?.kickEnergy || 0;
        const snareEnergy = this.beatData?.snareEnergy || 0;
        const noisiness = this.zcrStats?.noisiness || 'mixed';
        
        // Smooth responses
        this.bassResponse = this.bassResponse * 0.85 + bass * 0.15;
        this.midsResponse = this.midsResponse * 0.85 + (lowMids + mids) * 0.075;
        this.trebleResponse = this.trebleResponse * 0.85 + treble * 0.15;
        this.rmsResponse = this.rmsResponse * 0.9 + rms * 0.1;
        
        // 🌀 RIPPLE RATE: Controlled by BPM → moderate ripple rate
        this.rippleRate = Math.max(0.3, Math.min(2.0, bpm / 120));
        
        // 🌀 MORPHING BEHAVIOR: Shapes twist/swirl based on Low Mids & Mids
        this.morphIntensity = (lowMids + mids) * 0.5;
        
        // 🌀 FRACTAL TRAILS: Long echoing trails when energy is high (RMS & Bass)
        this.trailLength = Math.max(0.05, Math.min(0.4, (this.rmsResponse + this.bassResponse) * 0.3));
        
        // 🌈 BASE HUE: Spectral Centroid controls hue (low = blue/purple, high = yellow/white)
        this.baseHue = 240 - (spectralCentroid * 180); // 240° (blue) to 60° (yellow)
        
        // 🌈 BRIGHTNESS: RMS Energy controls overall brightness
        this.brightness = Math.max(0.1, Math.min(0.8, this.rmsResponse * 2));
        
        // 🔊 PULSE ZOOM: Beat confidence & BPM control zoom pulsing
        if (beatConfidence > 0.3) {
            this.pulseZoom = Math.sin(this.pulsePhase * this.rippleRate) * beatConfidence * 0.1;
        } else {
            this.pulseZoom *= 0.95; // Fade out if confidence is low
        }
        
        // 🔊 NOISE GRAIN: Noisiness adds edge sparkles
        this.noiseGrain = noisiness === 'noisy' ? 0.8 : (noisiness === 'mixed' ? 0.4 : 0.1);
        
        // Apply zoom level with pulse
        this.zoomLevel = 1.0 + this.pulseZoom;
        
        // Update ripples
        this.updateRipples(subBass, bass, kickDetected, kickEnergy);
        
        // Update noise particles
        this.updateNoiseParticles();
    }
    
    renderLiquidCore() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Glowing core that pulses to the beat - uses theme colors with dynamic hue
        const coreRadius = 60 * this.zoomLevel;
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, coreRadius * 2
        );
        
        // Color shifts dynamically like oil on water (spectral centroid)
        const hue = this.baseHue;
        const coreBrightness = this.brightness;
        
        gradient.addColorStop(0, `hsla(${hue}, 80%, ${50 + coreBrightness * 30}%, ${coreBrightness * 0.8})`);
        gradient.addColorStop(0.5, `hsla(${hue + 30}, 70%, ${30 + coreBrightness * 20}%, ${coreBrightness * 0.4})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    renderRadialWaves() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Create radial waves based on Low Mids & Mids (morphing shapes)
        const numWaves = 6;
        for (let i = 0; i < numWaves; i++) {
            const radius = 60 + i * 40;
            const distortion = this.morphIntensity * 30;
            
            this.ctx.strokeStyle = `hsla(${this.baseHue + i * 20}, 70%, ${30 + this.brightness * 40}%, ${0.4 - i * 0.05})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            
            // Create organic, twisting waves
            const points = 32;
            for (let j = 0; j <= points; j++) {
                const angle = (j / points) * Math.PI * 2;
                const waveOffset = Math.sin(angle * 3 + this.time * 2 + i) * distortion;
                const finalRadius = (radius + waveOffset) * this.zoomLevel;
                
                const x = centerX + Math.cos(angle) * finalRadius;
                const y = centerY + Math.sin(angle) * finalRadius;
                
                if (j === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.closePath();
            this.ctx.stroke();
        }
    }
    
    renderMorphingDistortions() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Create flowing, morphing distortions that twist and swirl
        const numDistortions = 8;
        for (let i = 0; i < numDistortions; i++) {
            const angle = (i / numDistortions) * Math.PI * 2;
            const baseRadius = 120 + i * 20;
            
            // Apply morphing intensity from Low Mids & Mids
            const morphPhase = this.time * 1.5 + i * 0.5;
            const distortion = this.morphIntensity * 50;
            
            const points = 16;
            this.ctx.strokeStyle = `hsla(${this.baseHue + angle * 30}, 60%, ${25 + this.brightness * 25}%, 0.3)`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            
            for (let j = 0; j < points; j++) {
                const t = j / points;
                const spiralAngle = angle + t * Math.PI * 4 + morphPhase;
                const radius = baseRadius + Math.sin(spiralAngle * 2) * distortion;
                
                const x = centerX + Math.cos(spiralAngle) * radius * this.zoomLevel;
                const y = centerY + Math.sin(spiralAngle) * radius * this.zoomLevel;
                
                if (j === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
    }
    
    renderBeatBursts() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Render active ripples (beat bursts)
        this.ripples.forEach(ripple => {
            if (ripple.life <= 0) return;
            
            const alpha = ripple.life * ripple.intensity * this.brightness;
            const strokeWidth = 1 + this.bassResponse * 2;
            
            this.ctx.strokeStyle = `hsla(${this.baseHue}, 80%, ${50 + this.brightness * 30}%, ${alpha})`;
            this.ctx.lineWidth = strokeWidth;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, ripple.radius * this.zoomLevel, 0, Math.PI * 2);
            this.ctx.stroke();
        });
    }
    
    renderEdgeNoise() {
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Render noise particles at edges based on noisiness
        this.noiseParticles.forEach(particle => {
            if (this.noiseGrain < 0.1) return; // Skip if low noise
            
            const alpha = particle.life * this.noiseGrain * 0.5;
            if (alpha < 0.01) return;
            
            // Edge particles sparkle more intensely
            const edgeIntensity = particle.isEdgeParticle ? 1.5 : 1.0;
            const finalAlpha = alpha * edgeIntensity;
            
            this.ctx.fillStyle = `hsla(${this.baseHue + 60}, 90%, 70%, ${finalAlpha})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    updateRipples(subBass, bass, kickDetected, kickEnergy) {
        // Update existing ripples
        this.ripples.forEach(ripple => {
            // Expand ripples based on BPM rate
            ripple.radius += this.rippleRate * 2;
            
            // Modulate with Sub Bass and Bass for deep pulsing
            const bassModulation = (subBass + bass) * 20;
            ripple.radius = ripple.baseRadius + bassModulation + (ripple.radius - ripple.baseRadius);
            
            // Fade out over time
            ripple.life *= 0.98;
            
            // Reset if too faded or too large
            if (ripple.life < 0.1 || ripple.radius > Math.max(this.width, this.height)) {
                ripple.radius = ripple.baseRadius;
                ripple.life = 1;
            }
        });
        
        // Create new ripple burst on kick detection
        if (kickDetected && kickEnergy > 0.3) {
            // Find a ripple to reset for the burst
            const burstRipple = this.ripples.find(r => r.life < 0.3);
            if (burstRipple) {
                burstRipple.radius = 20;
                burstRipple.life = 1;
                burstRipple.intensity = 1 + kickEnergy;
            }
        }
    }
    
    updateNoiseParticles() {
        this.noiseParticles.forEach(particle => {
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Add slight random movement for noise effect
            particle.vx += (Math.random() - 0.5) * 0.1;
            particle.vy += (Math.random() - 0.5) * 0.1;
            
            // Apply damping
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            // Update life
            particle.life += (Math.random() - 0.5) * 0.02; // Flicker
            particle.life = Math.max(0, Math.min(1, particle.life));
            
            // Keep particles near edges if they're edge particles
            if (particle.isEdgeParticle) {
                const margin = 50;
                const isNearEdge = particle.x < margin || particle.x > this.width - margin || 
                                 particle.y < margin || particle.y > this.height - margin;
                
                if (!isNearEdge) {
                    // Drift towards an edge
                    const centerX = this.width / 2;
                    const centerY = this.height / 2;
                    const dx = particle.x - centerX;
                    const dy = particle.y - centerY;
                    
                    particle.vx += dx > 0 ? 0.1 : -0.1;
                    particle.vy += dy > 0 ? 0.1 : -0.1;
                }
            }
            
            // Wrap around edges
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
        });
    }
    
    renderIdle() {
        // Render a gentle idle animation when no audio is playing
        this.clear();
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const time = this.getTime();
        
        // Gentle field animation
        for (let i = 0; i < 3; i++) {
            const radius = 50 + i * 40 + Math.sin(time + i) * 20;
            const alpha = 0.2 + Math.sin(time * 2 + i) * 0.1;
            
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.strokeStyle = `rgba(100, 150, 255, ${alpha})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Text
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Geiss v2 Ready', centerX, centerY + 150);
    }
    
    /**
     * Set color theme
     */
    setColorTheme(themeName) {
        const theme = ColorThemes.getTheme(themeName);
        if (theme) {
            this.currentTheme = themeName;
            this.colors = theme;
            console.log(`🎨 Geiss theme changed to: ${theme.name}`);
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
            name: 'Geiss v2',
            description: 'Classic field effect visualization with particle trails and interference patterns',
            version: '2.0.0'
        };
    }
}