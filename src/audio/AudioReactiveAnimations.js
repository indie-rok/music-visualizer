/**
 * AudioReactiveAnimations - Advanced audio-reactive animation system
 * Maps audio analysis data to visual properties with smooth interpolation
 */

export class AudioReactiveAnimations {
    constructor() {
        // Animation state management
        this.previousValues = {};
        this.targetValues = {};
        this.currentValues = {};
        
        // Interpolation settings - even slower for extremely gentle animations
        this.interpolationSpeed = 0.02; // Extremely slow value changes
        this.smoothingFactor = 0.95; // Maximum smoothing for rapid changes
        
        // BPM synchronization
        this.bpmPhase = 0; // Current phase in beat cycle (0-1)
        this.lastBeatTime = 0;
        this.beatInterval = 500; // Default 120 BPM
        
        // Color analysis
        this.dominantFrequency = 0;
        this.spectralCentroid = 0;
        this.energyHistory = [];
        this.energyHistorySize = 10;
        
        // Animation parameters
        this.baseSize = 1.0;
        this.sizeMultiplier = 1.0;
        this.rotationSpeed = 0;
        this.opacity = 1.0;
        this.hueShift = 0;
        
        console.log('🎬 AudioReactiveAnimations initialized');
    }
    
    /**
     * Update animation system with current audio data
     */
    update(audioData, beatData) {
        if (!audioData || !beatData) return;
        
        // Update BPM synchronization
        this.updateBPMSync(beatData);
        
        // Calculate dominant frequency and spectral characteristics
        this.analyzeSpectralContent(audioData);
        
        // Update energy history for smooth transitions
        this.updateEnergyHistory(audioData);
        
        // Calculate new target values
        this.calculateTargetValues(audioData, beatData);
        
        // Smooth interpolate to target values
        this.interpolateValues();
        
        return this.getAnimationState();
    }
    
    /**
     * Update BPM synchronization for tempo-based animations
     */
    updateBPMSync(beatData) {
        const currentTime = performance.now();
        
        // Update beat interval when BPM is detected
        if (beatData.bpm > 0) {
            this.beatInterval = 60000 / beatData.bpm; // Convert BPM to milliseconds
        }
        
        // Update phase when beat is detected
        if (beatData.kickDetected) {
            this.lastBeatTime = currentTime;
            this.bpmPhase = 0; // Reset phase on beat
        } else {
            // Calculate current phase based on time since last beat
            const timeSinceBeat = currentTime - this.lastBeatTime;
            this.bpmPhase = (timeSinceBeat / this.beatInterval) % 1;
        }
    }
    
    /**
     * Analyze spectral content for color and animation mapping
     */
    analyzeSpectralContent(audioData) {
        const frequencyData = audioData.frequencyData;
        let maxAmplitude = 0;
        let maxIndex = 0;
        
        // Find dominant frequency
        for (let i = 0; i < frequencyData.length; i++) {
            if (frequencyData[i] > maxAmplitude) {
                maxAmplitude = frequencyData[i];
                maxIndex = i;
            }
        }
        
        // Convert bin index to frequency (assuming 44.1kHz sample rate)
        this.dominantFrequency = (maxIndex * 22050) / frequencyData.length;
        
        // Calculate spectral centroid (brightness)
        let weightedSum = 0;
        let magnitudeSum = 0;
        
        for (let i = 0; i < frequencyData.length; i++) {
            const frequency = (i * 22050) / frequencyData.length;
            const magnitude = frequencyData[i];
            weightedSum += frequency * magnitude;
            magnitudeSum += magnitude;
        }
        
        this.spectralCentroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
    }
    
    /**
     * Update energy history for smooth energy-based animations
     */
    updateEnergyHistory(audioData) {
        // Calculate overall energy
        const energy = audioData.bands.bass + audioData.bands.mids + audioData.bands.treble;
        
        this.energyHistory.push(energy);
        if (this.energyHistory.length > this.energyHistorySize) {
            this.energyHistory.shift();
        }
    }
    
    /**
     * Calculate target animation values based on audio analysis
     */
    calculateTargetValues(audioData, beatData) {
        // Size scaling based on amplitude with frequency weighting
        const bassEnergy = audioData.bands.bass / 255;
        const midEnergy = audioData.bands.mids / 255;
        const trebleEnergy = audioData.bands.treble / 255;
        
        // Weighted energy calculation (bass has more impact on size)
        const weightedEnergy = (bassEnergy * 0.5 + midEnergy * 0.3 + trebleEnergy * 0.2);
        
        // Beat enhancement - extremely reduced for very gentle effect
        const beatBoost = beatData.kickDetected ? 0.05 : 0; // Very small beat boost
        this.targetValues.sizeMultiplier = 1.0 + (weightedEnergy + beatBoost) * 0.5; // Much smaller size multiplier
        
        // Rotation speed based on energy and BPM - much slower
        const energyChange = this.getEnergyChange();
        this.targetValues.rotationSpeed = energyChange * 0.3 + (beatData.bpm > 0 ? beatData.bpm / 600 : 0.1); // Much slower rotation
        
        // Opacity pulsing based on beats
        if (beatData.kickDetected || beatData.snareDetected) {
            this.targetValues.opacity = 1.0;
        } else {
            // Fade based on time since last beat
            const timeSinceBeat = performance.now() - Math.max(beatData.currentTime - (beatData.timeSinceLastKick || 0), 
                                                               beatData.currentTime - (beatData.timeSinceLastSnare || 0));
            this.targetValues.opacity = Math.max(0.6, 1.0 - (timeSinceBeat / 1000));
        }
        
        // Hue shift based on dominant frequency and spectral centroid - more dramatic
        const frequencyHue = (this.dominantFrequency / 3000) * 360; // Map 0-3kHz to 0-360° for faster color changes
        const brightnessHue = (this.spectralCentroid / 5000) * 360; // More responsive brightness mapping
        const energyHue = (beatData.kickDetected ? 60 : 0) + (beatData.snareDetected ? 120 : 0); // Beat-based color shifts
        this.targetValues.hueShift = (frequencyHue + brightnessHue + energyHue) % 360;
    }
    
    /**
     * Get rate of energy change for dynamic animations
     */
    getEnergyChange() {
        if (this.energyHistory.length < 2) return 0;
        
        const current = this.energyHistory[this.energyHistory.length - 1];
        const previous = this.energyHistory[this.energyHistory.length - 2];
        
        return Math.abs(current - previous) / 255; // Normalized change rate
    }
    
    /**
     * Smooth interpolation between current and target values
     */
    interpolateValues() {
        // Initialize current values if not set
        if (Object.keys(this.currentValues).length === 0) {
            this.currentValues = { ...this.targetValues };
            return;
        }
        
        // Interpolate each value
        for (const key in this.targetValues) {
            if (this.currentValues[key] === undefined) {
                this.currentValues[key] = this.targetValues[key];
            } else {
                const difference = this.targetValues[key] - this.currentValues[key];
                this.currentValues[key] += difference * this.interpolationSpeed;
            }
        }
        
        // Update main animation properties
        this.sizeMultiplier = this.currentValues.sizeMultiplier || 1.0;
        this.rotationSpeed = this.currentValues.rotationSpeed || 0;
        this.opacity = this.currentValues.opacity || 1.0;
        this.hueShift = this.currentValues.hueShift || 0;
    }
    
    /**
     * Get current animation state for rendering
     */
    getAnimationState() {
        return {
            // Size and scaling
            sizeMultiplier: this.sizeMultiplier,
            beatSizeBoost: this.bpmPhase < 0.1 ? 1.2 : 1.0, // Quick boost at beat start
            
            // Rotation and movement
            rotationSpeed: this.rotationSpeed,
            bpmPhase: this.bpmPhase,
            
            // Visual effects
            opacity: this.opacity,
            hueShift: this.hueShift,
            
            // Color mapping
            dominantFrequency: this.dominantFrequency,
            spectralCentroid: this.spectralCentroid,
            
            // Energy information
            energyLevel: this.energyHistory.length > 0 ? 
                this.energyHistory[this.energyHistory.length - 1] / 255 : 0,
            energyChange: this.getEnergyChange()
        };
    }
    
    /**
     * Get enhanced color based on spectral analysis
     */
    getSpectralColor(baseColor, intensity = 1.0) {
        // Convert hex color to HSL for manipulation
        const hsl = this.hexToHSL(baseColor);
        
        // Apply hue shift based on dominant frequency - more dramatic
        hsl.h = (hsl.h + this.hueShift * intensity) % 360;
        
        // Adjust saturation based on spectral centroid (brightness) - more intense
        const brightnessEffect = Math.min(1.0, this.spectralCentroid / 3000);
        hsl.s = Math.min(100, hsl.s * (1 + brightnessEffect * 1.5)); // Increased saturation boost
        
        // Adjust lightness based on energy - more dynamic
        const energyLevel = this.energyHistory.length > 0 ? 
            this.energyHistory[this.energyHistory.length - 1] / 255 : 0.5;
        hsl.l = Math.max(30, Math.min(90, hsl.l * (0.5 + energyLevel * 1.0))); // More dynamic lightness
        
        return this.HSLToHex(hsl);
    }
    
    /**
     * Convert hex color to HSL
     */
    hexToHSL(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Convert to RGB
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0; // achromatic
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return { h: h * 360, s: s * 100, l: l * 100 };
    }
    
    /**
     * Convert HSL to hex color
     */
    HSLToHex(hsl) {
        const h = hsl.h / 360;
        const s = hsl.s / 100;
        const l = hsl.l / 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        if (s === 0) {
            r = g = b = l; // achromatic
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
    
    /**
     * Reset animation state
     */
    reset() {
        this.previousValues = {};
        this.targetValues = {};
        this.currentValues = {};
        this.bpmPhase = 0;
        this.lastBeatTime = 0;
        this.energyHistory = [];
        
        console.log('🔄 AudioReactiveAnimations reset');
    }
}