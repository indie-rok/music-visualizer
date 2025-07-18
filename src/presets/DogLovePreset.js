/**
 * Dog-Love Preset
 * A happy dog on a walk with their owner - the leash acts as a dynamic wave that dances to the music,
 * while the city scrolls by as they walk together. During exciting musical moments, the dog expresses pure joy.
 */
import { BasePreset } from './BasePreset.js';

export class DogLovePreset extends BasePreset {
    init() {
        // Performance settings
        this.frameSkip = 0;
        this.targetFPS = 60;
        this.lastFrameTime = 0;
        
        // Animation time
        this.time = 0;
        
        // Canvas setup
        this.setupCanvas();
        
        // Ground level
        this.groundLevel = this.height * 0.85; // Ground at 85% down
        
        // Dog configuration (left side) - BIGGER
        this.dog = {
            x: this.width * 0.15,
            y: this.groundLevel - 80,
            baseY: this.groundLevel - 80,
            size: 50,  // Increased from 30
            jumpOffset: 0,
            jumping: false,
            jumpPhase: 0,
            tongueOut: false,
            tongueTimer: 0,
            spinning: false,
            spinPhase: 0,
            breathPhase: 0,
            // Colors (Shiba Inu style)
            bodyColor: '#D2691E',  // Orange/brown
            accentColor: '#FFFAF0', // Cream
            eyeColor: '#000000',
            tongueColor: '#FF69B4'
        };
        
        // Human configuration (right side) - BIGGER
        this.human = {
            x: this.width * 0.75,
            y: this.groundLevel - 100,
            size: 60,  // Increased from 40
            // Colors
            jacketColor: '#4169E1',  // Blue jacket
            pantsColor: '#2F4F4F',   // Dark pants
            skinColor: '#FDBCB4'
        };
        
        // Leash wave configuration - MAIN VISUAL ELEMENT
        this.leash = {
            points: 12,  // Number of control points for smooth curve
            baseAmplitude: 25,  // Much bigger base amplitude
            currentAmplitude: 25,
            frequency: 0.02,  // Start very slow
            baseFrequency: 0.02,
            phase: 0,
            phaseSpeed: 0.02,  // Start slow
            basePhaseSpeed: 0.02,
            color: '#8B4513',  // Brown
            width: 12  // Much thicker - it's the main element!
        };
        
        // City background
        this.city = {
            buildings: [],
            scrollSpeed: 1,
            baseScrollSpeed: 1,
            totalWidth: 0
        };
        
        // Audio reactive thresholds
        this.thresholds = {
            adaptiveThresholdJump: 0.5,  // Changed from kick to adaptive threshold
            snareTongue: 0.25,
            spectralFluxSpin: 0.01
        };
        
        // Animation state tracking
        this.lastSpectralFlux = 0;
        this.lastKickTime = 0;
        this.lastSnareTime = 0;
        this.lastSpinTime = 0;
        
        // Initialize city buildings
        this.initializeCity();
    }
    
    setupCanvas() {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    initializeCity() {
        // Create seamless city silhouette with no gaps
        const buildingCount = 12;
        const buildingWidth = this.width / buildingCount * 2; // More overlap for seamless scrolling
        
        for (let i = 0; i < buildingCount * 2; i++) { // Double for seamless loop
            const building = {
                x: i * buildingWidth * 0.9, // Slight overlap to prevent gaps
                width: buildingWidth * (0.9 + Math.random() * 0.3), // More consistent width
                height: 80 + Math.random() * 180, // Taller buildings
                windows: []
            };
            
            // Add windows to buildings
            const windowRows = Math.floor(building.height / 20);
            const windowCols = Math.floor(building.width / 15);
            
            for (let row = 0; row < windowRows; row++) {
                for (let col = 0; col < windowCols; col++) {
                    if (Math.random() > 0.4) { // More windows
                        building.windows.push({
                            x: col * 15 + 3,
                            y: row * 20 + 8,
                            width: 8,
                            height: 12,
                            lit: Math.random() > 0.4 // More lit windows
                        });
                    }
                }
            }
            
            this.city.buildings.push(building);
        }
        
        this.city.totalWidth = buildingCount * buildingWidth * 0.9;
    }
    
    render() {
        this.time += 1/60; // Assuming 60fps
        
        // Clear canvas
        this.clear();
        
        // Update audio reactive values
        this.updateAudioReactivity();
        
        // Render in layers (back to front)
        this.renderSky();
        this.renderCity();
        this.renderGround();
        this.renderHuman();
        this.renderLeash();
        this.renderDog();
    }
    
    updateAudioReactivity() {
        if (!this.audioData || !this.audioData.isPlaying) return;
        
        const currentTime = this.time;
        
        // Update leash wave - SLOW to FAST dynamics based on music intensity
        const rmsEnergy = this.rmsStats?.current || 0;
        const bassLevel = this.audioData?.bands?.bass || 0;
        const midsLevel = this.audioData?.bands?.mids || 0;
        const trebleLevel = this.audioData?.bands?.treble || 0;
        const overallEnergy = (bassLevel + midsLevel + trebleLevel) / 3;
        
        // Dynamic amplitude - calm to wild
        this.leash.currentAmplitude = this.leash.baseAmplitude + (rmsEnergy * 80) + (overallEnergy / 2);
        
        // Dynamic frequency - slow during quiet parts, fast during beats
        const energyMultiplier = Math.max(0.1, rmsEnergy * 3); // Never completely still
        this.leash.frequency = this.leash.baseFrequency + (energyMultiplier * 0.3) + (bassLevel / 80);
        
        // Dynamic phase speed - slow waves to fast waves
        this.leash.phaseSpeed = this.leash.basePhaseSpeed + (energyMultiplier * 0.4) + (midsLevel / 150);
        this.leash.phase += this.leash.phaseSpeed;
        
        // Keep city scroll speed stable (not music-reactive)
        this.city.scrollSpeed = this.city.baseScrollSpeed;
        
        // Beat detection triggers
        if (this.beatData) {
            // Dog jump on adaptive threshold
            if (this.beatData.adaptiveThreshold > this.thresholds.adaptiveThresholdJump && 
                currentTime - this.lastKickTime > 0.5) {
                this.triggerDogJump();
                this.lastKickTime = currentTime;
            }
            
            // Tongue out on snare
            if (this.beatData.snareEnergy > this.thresholds.snareTongue && 
                currentTime - this.lastSnareTime > 1.0) {
                this.triggerDogTongue();
                this.lastSnareTime = currentTime;
            }
            
            // Dog spin on spectral flux spike (chorus/refrain)
            const spectralFluxDiff = (this.beatData.spectralFlux || 0) - this.lastSpectralFlux;
            if (spectralFluxDiff > this.thresholds.spectralFluxSpin && 
                currentTime - this.lastSpinTime > 1.5) {
                this.triggerDogSpin();
                this.lastSpinTime = currentTime;
            }
            this.lastSpectralFlux = this.beatData.spectralFlux || 0;
        }
        
        // Update animation states
        this.updateDogAnimations();
    }
    
    triggerDogJump() {
        this.dog.jumping = true;
        this.dog.jumpPhase = 0;
    }
    
    triggerDogTongue() {
        this.dog.tongueOut = true;
        this.dog.tongueTimer = 0;
    }
    
    triggerDogSpin() {
        this.dog.spinning = true;
        this.dog.spinPhase = 0;
    }
    
    updateDogAnimations() {
        // Breathing animation (continuous)
        this.dog.breathPhase += 0.05;
        
        // Jump animation
        if (this.dog.jumping) {
            this.dog.jumpPhase += 0.12; // 0.5 second animation
            if (this.dog.jumpPhase >= 1) {
                this.dog.jumping = false;
                this.dog.jumpOffset = 0;
            } else {
                // Parabolic jump arc
                this.dog.jumpOffset = -30 * Math.sin(this.dog.jumpPhase * Math.PI);
            }
        }
        
        // Tongue animation
        if (this.dog.tongueOut) {
            this.dog.tongueTimer += 1/60;
            if (this.dog.tongueTimer >= 1.0) { // 1 second
                this.dog.tongueOut = false;
            }
        }
        
        // Spin animation
        if (this.dog.spinning) {
            this.dog.spinPhase += 0.04; // 1.5 second animation
            if (this.dog.spinPhase >= 1) {
                this.dog.spinning = false;
            }
        }
    }
    
    renderSky() {
        // Simple gradient sky
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height * 0.7);
        gradient.addColorStop(0, '#87CEEB'); // Sky blue
        gradient.addColorStop(1, '#E0F6FF'); // Light blue
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height * 0.7);
    }
    
    renderCity() {
        // Scroll city buildings right to left (dog walking forward) at constant speed
        const scrollOffset = (this.time * this.city.scrollSpeed * 30) % this.city.totalWidth;
        
        this.ctx.fillStyle = '#4682B4'; // Steel blue for buildings
        
        for (const building of this.city.buildings) {
            const x = building.x - scrollOffset; // Buildings move right to left
            
            // Skip if completely off screen
            if (x + building.width < -100 || x > this.width + 100) continue;
            
            const y = this.groundLevel - building.height;
            
            // Draw building silhouette
            this.ctx.fillRect(x, y, building.width, building.height);
            
            // Draw windows
            for (const window of building.windows) {
                if (window.lit) {
                    this.ctx.fillStyle = '#FFFF99'; // Yellow lit windows
                    this.ctx.fillRect(x + window.x, y + window.y, window.width, window.height);
                    this.ctx.fillStyle = '#4682B4'; // Reset building color
                }
            }
        }
    }
    
    renderGround() {
        // Simple ground/sidewalk
        this.ctx.fillStyle = '#696969'; // Dim gray
        this.ctx.fillRect(0, this.groundLevel, this.width, this.height - this.groundLevel);
        
        // Sidewalk line
        this.ctx.strokeStyle = '#DCDCDC';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundLevel);
        this.ctx.lineTo(this.width, this.groundLevel);
        this.ctx.stroke();
    }
    
    renderHuman() {
        const human = this.human;
        
        this.ctx.save();
        this.ctx.translate(human.x, human.y);
        
        // Scale up for bigger human
        const scale = 1.5;
        this.ctx.scale(scale, scale);
        
        // Simple half-body human figure
        // Torso (jacket)
        this.ctx.fillStyle = human.jacketColor;
        this.ctx.fillRect(-15, -30, 30, 40);
        
        // Head
        this.ctx.fillStyle = human.skinColor;
        this.ctx.beginPath();
        this.ctx.arc(0, -45, 12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Arm holding leash
        this.ctx.strokeStyle = human.skinColor;
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(15, -20);
        this.ctx.lineTo(25, -10);
        this.ctx.stroke();
        
        // Legs
        this.ctx.fillStyle = human.pantsColor;
        this.ctx.fillRect(-12, 10, 10, 25);
        this.ctx.fillRect(2, 10, 10, 25);
        
        this.ctx.restore();
    }
    
    renderLeash() {
        const startX = this.human.x + 40;  // Adjusted for bigger human
        const startY = this.human.y - 15;
        const endX = this.dog.x + 25;      // Adjusted for bigger dog
        const endY = this.dog.y - 15;
        
        this.ctx.strokeStyle = this.leash.color;
        this.ctx.lineWidth = this.leash.width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Create natural wave motion like Milkdrop waveform
        const points = 50; // More points for smoother curve
        const totalDistance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        
        for (let i = 1; i < points; i++) {
            const progress = i / points;
            
            // Base position along the line
            const baseX = startX + (endX - startX) * progress;
            const baseY = startY + (endY - startY) * progress;
            
            // Create intense wave motion using multiple sine waves like Milkdrop
            const waveAmplitude = this.leash.currentAmplitude * Math.sin(progress * Math.PI); // Natural droop
            const primaryWave = Math.sin(progress * Math.PI * 2 + this.leash.phase) * waveAmplitude;
            const secondaryWave = Math.sin(progress * Math.PI * 6 + this.leash.phase * 2) * (waveAmplitude * 0.5); // Increased from 0.3
            const tertiaryWave = Math.sin(progress * Math.PI * 12 + this.leash.phase * 4) * (waveAmplitude * 0.3); // Increased from 0.1
            const quarterWave = Math.sin(progress * Math.PI * 20 + this.leash.phase * 6) * (waveAmplitude * 0.2); // Additional wave
            
            // Combine waves for intense motion like Milkdrop
            const totalWave = primaryWave + secondaryWave + tertiaryWave + quarterWave;
            
            // Apply wave perpendicular to the leash direction
            const angle = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
            const waveX = baseX + Math.cos(angle) * totalWave;
            const waveY = baseY + Math.sin(angle) * totalWave;
            
            this.ctx.lineTo(waveX, waveY);
        }
        
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
    }
    
    renderDog() {
        const dog = this.dog;
        const currentY = dog.baseY + dog.jumpOffset;
        
        this.ctx.save();
        this.ctx.translate(dog.x, currentY);
        
        // Flip horizontally to make dog face right
        this.ctx.scale(-1, 1);
        
        // Apply spin rotation if spinning
        if (dog.spinning) {
            const spinAngle = dog.spinPhase * Math.PI * 2;
            this.ctx.rotate(spinAngle);
        }
        
        // Breathing effect (subtle scaling)
        const breathScale = 1 + Math.sin(dog.breathPhase) * 0.02;
        this.ctx.scale(breathScale, breathScale);
        
        // Dog body (Shiba Inu style)
        // Main body
        this.ctx.fillStyle = dog.bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, dog.size * 0.8, dog.size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Head
        this.ctx.beginPath();
        this.ctx.ellipse(-dog.size * 0.6, -dog.size * 0.3, dog.size * 0.5, dog.size * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Ears
        this.ctx.beginPath();
        this.ctx.ellipse(-dog.size * 0.8, -dog.size * 0.6, dog.size * 0.2, dog.size * 0.3, -0.3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.ellipse(-dog.size * 0.4, -dog.size * 0.6, dog.size * 0.2, dog.size * 0.3, 0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Chest/belly accent (cream color)
        this.ctx.fillStyle = dog.accentColor;
        this.ctx.beginPath();
        this.ctx.ellipse(0, dog.size * 0.2, dog.size * 0.5, dog.size * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Face accent
        this.ctx.beginPath();
        this.ctx.ellipse(-dog.size * 0.6, -dog.size * 0.2, dog.size * 0.3, dog.size * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eyes
        this.ctx.fillStyle = dog.eyeColor;
        this.ctx.beginPath();
        this.ctx.arc(-dog.size * 0.7, -dog.size * 0.4, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(-dog.size * 0.5, -dog.size * 0.4, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Nose
        this.ctx.beginPath();
        this.ctx.arc(-dog.size * 0.8, -dog.size * 0.1, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tail
        this.ctx.fillStyle = dog.bodyColor;
        this.ctx.beginPath();
        this.ctx.ellipse(dog.size * 0.6, -dog.size * 0.2, dog.size * 0.3, dog.size * 0.2, 0.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Legs
        const legOffset = dog.jumping ? dog.size * 0.1 : 0; // Slightly bent when jumping
        this.ctx.fillRect(-dog.size * 0.3, dog.size * 0.4 + legOffset, 8, dog.size * 0.4);
        this.ctx.fillRect(dog.size * 0.1, dog.size * 0.4 + legOffset, 8, dog.size * 0.4);
        
        // Tongue (when excited)
        if (dog.tongueOut) {
            this.ctx.fillStyle = dog.tongueColor;
            this.ctx.beginPath();
            this.ctx.ellipse(-dog.size * 0.85, dog.size * 0.05, 4, 8, 0, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    getInfo() {
        return {
            name: 'Dog-Love',
            description: 'A happy dog on a walk with dynamic leash waves and city backdrop',
            version: '1.0.0'
        };
    }
}