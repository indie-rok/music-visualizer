/**
 * Milkdrop Preset
 * Classic Winamp Milkdrop-style visualization with fluid, organic shapes
 */
import { BasePreset } from './BasePreset.js';
import { ColorThemes } from './ColorThemes.js';

export class MilkdropPreset extends BasePreset {
    init() {
        // Milkdrop-specific properties
        this.particles = [];
        this.maxParticles = 50; // Reduced from 150
        this.waveform = [];
        this.spectrum = [];
        
        // Performance settings
        this.frameSkip = 0;
        this.targetFPS = 30; // Limit to 30fps
        this.lastFrameTime = 0;
        
        // Use centralized color theme system
        this.currentTheme = 'cyberpunk';
        this.colors = ColorThemes.getTheme(this.currentTheme);
        
        // Animation parameters
        this.rotation = 0;
        this.pulse = 0;
        this.spiralPhase = 0;
        this.wavePhase = 0;
        
        // Initialize particles
        this.initializeParticles();
        
        // Set up canvas for fluid effects
        this.setupCanvas();
    }
    
    setupCanvas() {
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    initializeParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: Math.random(),
                maxLife: 1,
                size: Math.random() * 3 + 1,
                hue: Math.random() * 360,
                brightness: Math.random() * 0.5 + 0.5
            });
        }
    }
    
    render() {
        if (!this.audioData || !this.audioData.isPlaying) {
            this.renderIdle();
            return;
        }
        
        // Apply moderate fade effect for trails
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = `rgba(${this.colors.background[0]}, ${this.colors.background[1]}, ${this.colors.background[2]}, 0.4)`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Update animation parameters based on audio
        this.updateAnimationParams();
        
        // Render different elements
        this.renderBackground();
        this.renderSpectrum();
        this.renderWaveform();
        this.renderParticles();
        this.renderCenterSpiral();
        this.renderBeatReactive();
        
        this.rotation += 0.01;
        this.spiralPhase += 0.02;
        this.wavePhase += 0.03;
    }
    
    updateAnimationParams() {
        // Normalize the frequency values (0-255 range) to 0-1
        const bass = Math.min((this.audioData.bands.bass || 0) / 255, 1);
        const mids = Math.min((this.audioData.bands.mids || 0) / 255, 1);
        const treble = Math.min((this.audioData.bands.treble || 0) / 255, 1);
        const rms = this.rmsStats.current || 0;
        
        this.pulse = Math.sin(this.getTime() * 2) * 0.5 + 0.5;
        this.pulse *= (1 + bass * 0.5); // Reduced multiplier
        
        // Update particles based on audio
        this.updateParticles(bass, mids, treble, rms);
    }
    
    renderBackground() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.max(this.width, this.height) * 0.8;
        
        // Create radial gradient that reacts to bass - normalized
        const bassLevel = Math.min((this.audioData.bands.bass || 0) / 255, 1);
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        
        gradient.addColorStop(0, `rgba(${this.colors.primary[0]}, ${this.colors.primary[1]}, ${this.colors.primary[2]}, ${bassLevel * 0.2})`);
        gradient.addColorStop(0.5, `rgba(${this.colors.secondary[0]}, ${this.colors.secondary[1]}, ${this.colors.secondary[2]}, ${bassLevel * 0.15})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    renderSpectrum() {
        if (!this.audioData.frequencyData) return;
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const data = this.audioData.frequencyData;
        const slices = 32; // Reduced from 64
        const angleStep = (Math.PI * 2) / slices;
        
        this.ctx.globalCompositeOperation = 'lighter';
        
        for (let i = 0; i < slices; i++) {
            const dataIndex = Math.floor((i / slices) * data.length);
            const value = data[dataIndex] / 255;
            const angle = i * angleStep + this.rotation;
            
            const innerRadius = 80;
            const outerRadius = innerRadius + value * 150;
            
            const x1 = centerX + Math.cos(angle) * innerRadius;
            const y1 = centerY + Math.sin(angle) * innerRadius;
            const x2 = centerX + Math.cos(angle) * outerRadius;
            const y2 = centerY + Math.sin(angle) * outerRadius;
            
            // Color based on frequency position - slightly brighter
            const hue = (i / slices) * 360;
            const saturation = 85;
            const lightness = 35 + value * 30; // Slightly more lightness
            
            this.ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }
    }
    
    renderWaveform() {
        if (!this.audioData.timeData) return;
        
        const data = this.audioData.timeData;
        const centerY = this.height / 2;
        const amplitude = 100;
        
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.strokeStyle = `rgba(${this.colors.accent[0]}, ${this.colors.accent[1]}, ${this.colors.accent[2]}, 0.7)`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let i = 0; i < data.length; i++) {
            const x = (i / data.length) * this.width;
            const y = centerY + ((data[i] - 128) / 128) * amplitude * this.pulse;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        
        this.ctx.stroke();
    }
    
    updateParticles(bass, mids, treble, rms) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        this.particles.forEach(particle => {
            // Update position
            particle.x += particle.vx * (1 + treble);
            particle.y += particle.vy * (1 + treble);
            
            // Gravity towards center with bass influence
            const dx = centerX - particle.x;
            const dy = centerY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const force = bass * 0.1;
                particle.vx += (dx / distance) * force;
                particle.vy += (dy / distance) * force;
            }
            
            // Apply velocity damping
            particle.vx *= 0.99;
            particle.vy *= 0.99;
            
            // Update life
            particle.life -= 0.01;
            if (particle.life <= 0) {
                // Respawn particle
                particle.x = Math.random() * this.width;
                particle.y = Math.random() * this.height;
                particle.vx = (Math.random() - 0.5) * 2;
                particle.vy = (Math.random() - 0.5) * 2;
                particle.life = 1;
                particle.hue = Math.random() * 360;
            }
            
            // Wrap around edges
            if (particle.x < 0) particle.x = this.width;
            if (particle.x > this.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.height;
            if (particle.y > this.height) particle.y = 0;
        });
    }
    
    renderParticles() {
        this.ctx.globalCompositeOperation = 'lighter';
        
        // Remove shadows for better performance
        this.particles.forEach(particle => {
            const alpha = particle.life * particle.brightness * 0.7; // Reduced alpha
            const size = particle.size * (1 + this.pulse * 0.5);
            
            // Use balanced, saturated colors - slightly brighter
            this.ctx.fillStyle = `hsla(${particle.hue}, 90%, 55%, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    renderCenterSpiral() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const mids = Math.min((this.audioData.bands.mids || 0) / 255, 1);
        
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.strokeStyle = `rgba(${this.colors.secondary[0]}, ${this.colors.secondary[1]}, ${this.colors.secondary[2]}, ${mids * 0.6})`;
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        for (let i = 0; i < 200; i++) {
            const angle = (i * 0.1) + this.spiralPhase;
            const radius = i * 0.5 * (1 + mids);
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
    }
    
    renderBeatReactive() {
        if (!this.beatData) return;
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        // Kick reaction - large circle flash
        if (this.beatData.kickDetected) {
            const radius = 100 + this.beatData.kickEnergy * 200;
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.strokeStyle = `rgba(${this.colors.primary[0]}, ${this.colors.primary[1]}, ${this.colors.primary[2]}, 0.4)`;
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        
        // Snare reaction - sharp lines
        if (this.beatData.snareDetected) {
            const lines = 8;
            const angleStep = (Math.PI * 2) / lines;
            
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.strokeStyle = `rgba(${this.colors.tertiary[0]}, ${this.colors.tertiary[1]}, ${this.colors.tertiary[2]}, 0.5)`;
            this.ctx.lineWidth = 3;
            
            for (let i = 0; i < lines; i++) {
                const angle = i * angleStep;
                const length = 50 + this.beatData.snareEnergy * 100;
                
                const x1 = centerX + Math.cos(angle) * 20;
                const y1 = centerY + Math.sin(angle) * 20;
                const x2 = centerX + Math.cos(angle) * length;
                const y2 = centerY + Math.sin(angle) * length;
                
                this.ctx.beginPath();
                this.ctx.moveTo(x1, y1);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
            }
        }
    }
    
    renderIdle() {
        // Render a gentle idle animation when no audio is playing
        this.clear();
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const time = this.getTime();
        
        // Gentle pulsing circle
        const radius = 50 + Math.sin(time) * 20;
        const alpha = 0.3 + Math.sin(time * 2) * 0.2;
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.strokeStyle = `rgba(100, 150, 255, ${alpha})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Text
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Milkdrop Ready', centerX, centerY + 100);
    }
    
    /**
     * Set color theme
     */
    setColorTheme(themeName) {
        const theme = ColorThemes.getTheme(themeName);
        if (theme) {
            this.currentTheme = themeName;
            this.colors = theme;
            console.log(`🎨 Color theme changed to: ${theme.name}`);
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
            name: 'Milkdrop',
            description: 'Classic Winamp Milkdrop-style visualization with fluid, organic shapes and particles',
            version: '1.0.0'
        };
    }
}