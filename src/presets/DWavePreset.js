/**
 * D-Wave Preset — Simplified Ocean Visualizer
 * "An ocean scene where waves move with the music's energy, and fish jump out of them with the beat.
 * When the beat drops, the whole color scheme shifts into a warm sunset."
 */
import { BasePreset } from './BasePreset.js';
import { ColorThemes } from './ColorThemes.js';

export class DWavePreset extends BasePreset {
    init() {
        // Performance settings
        this.frameSkip = 0;
        this.targetFPS = 30;
        this.lastFrameTime = 0;
        
        // Use centralized color theme system  
        this.currentTheme = 'beach';
        this.colors = ColorThemes.getTheme(this.currentTheme);
        
        // Core animation parameters
        this.time = 0;
        this.wavePhase = 0;
        this.seaLevel = this.height * 0.7; // Sea level at 70% down
        
        // Audio-reactive smoothed values
        this.rmsResponse = 0;
        this.bassResponse = 0;
        this.midsResponse = 0;
        this.lastRmsValue = 0;
        
        // Wave parameters
        this.waveHeight = 20;           // Controlled by Bass + Kick
        this.waveDensity = 1;           // Controlled by Bass + Kick
        this.waveSpeed = 1.0;           // Controlled by BPM + Spectral Flux
        
        // Color state
        this.isSunsetMode = false;
        this.sunsetTransition = 0;      // 0 = blue, 1 = sunset
        this.sunsetFadeSpeed = 0.02;
        this.lastBeatDrop = 0;
        
        
        // Fish system
        this.fish = [];
        this.maxFish = 5;
        this.initializeFish();
        
        // Dolphin system
        this.dolphin = {
            x: this.width + 100,
            y: this.seaLevel,
            baseY: this.seaLevel,
            vx: 0,
            vy: 0,
            jumping: false,
            jumpPhase: 0,
            size: 25,
            lastJump: 0,
            active: false
        };
        
        // Boat system
        this.boat = {
            x: -200,
            y: this.seaLevel - 20,
            vx: 0,
            active: false,
            direction: 1, // 1 for left-to-right, -1 for right-to-left
            lastAppearance: 0
        };
        
        // Energy tracking for boat trigger
        this.energyHistory = [];
        this.lastEnergyIncrease = 0;
        
        // Wave points for smooth wave rendering
        this.wavePoints = 64;
        
        this.setupCanvas();
    }
    
    setupCanvas() {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }
    
    initializeFish() {
        for (let i = 0; i < this.maxFish; i++) {
            this.fish.push({
                x: Math.random() * this.width,
                y: this.seaLevel,
                baseY: this.seaLevel,
                vx: 0,
                vy: 0,
                jumping: false,
                jumpPhase: 0,
                size: 8 + Math.random() * 6,
                color: 0, // Will be set based on color mode
                lastJump: 0
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
        
        // Render scene layers
        this.renderSkyGradient();
        this.renderWaves();
        this.renderFish();
        this.renderDolphin();
        this.renderBoat();
        
        // Update time-based animations
        this.time += 0.016;
        this.wavePhase += this.waveSpeed * 0.03;
    }
    
    updateAudioReactiveParams() {
        // Normalize frequency values (0-255 range) to 0-1
        const subBass = Math.min((this.audioData.bands.subBass || 0) / 255, 1);
        const bass = Math.min((this.audioData.bands.bass || 0) / 255, 1);
        const lowMids = Math.min((this.audioData.bands.lowMids || 0) / 255, 1);
        const mids = Math.min((this.audioData.bands.mids || 0) / 255, 1);
        const rms = this.rmsStats.current || 0;
        
        // Get beat and tempo data
        const bpm = this.beatData?.bpm || 120;
        const kickDetected = this.beatData?.kickDetected || false;
        const snareDetected = this.beatData?.snareDetected || false;
        const kickEnergy = this.beatData?.kickEnergy || 0;
        const snareEnergy = this.beatData?.snareEnergy || 0;
        const spectralFlux = this.beatData?.spectralFlux || 0;
        const adaptiveThreshold = this.beatData?.adaptiveThreshold || 0.545;
        
        // Smooth responses for natural motion
        this.rmsResponse = this.rmsResponse * 0.85 + rms * 0.15;
        this.bassResponse = this.bassResponse * 0.8 + (subBass + bass) * 0.1;
        this.midsResponse = this.midsResponse * 0.8 + mids * 0.2;
        
        // Calculate fish count based on low mids
        const fishCount = Math.min(this.maxFish, Math.floor(1 + lowMids * 4)); // 1-5 fish based on low mids
        
        // 🌊 Wave height controlled by Bass + Kick
        const kickBoost = kickDetected ? kickEnergy * 2 : 0;
        this.waveHeight = 15 + this.bassResponse * 60 + kickBoost * 30;
        
        // 🌊 Wave density controlled by Bass + Kick
        this.waveDensity = 1 + this.bassResponse * 3 + kickBoost;
        
        // 🌊 Wave speed controlled by BPM + Spectral Flux
        this.waveSpeed = Math.max(0.5, Math.min(2.5, (bpm / 120) + spectralFlux * 2));
        
        // 🌅 Beat Drop Detection for sunset transition
        this.detectBeatDrop(kickDetected, rms, spectralFlux, adaptiveThreshold);
        
        // 🐟 Fish jump on mids detection, using Adaptive Threshold for jump height and frequency
        const jumpCooldown = Math.max(0.15, 0.5 - adaptiveThreshold); // Higher threshold = more frequent jumps
        
        if (this.midsResponse > 0.3 && this.time - this.getAvailableFish()?.lastJump > jumpCooldown) {
            this.triggerFishJump(this.midsResponse, adaptiveThreshold);
        }
        
        // 🐟 Multiple fish during high adaptive threshold (based on low mids for count)
        if (adaptiveThreshold > 0.4 && this.time - this.getLastFishJump() > 0.1) {
            const availableFish = this.getAllAvailableFish();
            const fishToJump = Math.min(availableFish.length, fishCount);
            
            for (let i = 0; i < fishToJump; i++) {
                if (availableFish[i]) {
                    this.triggerSpecificFishJump(availableFish[i], this.midsResponse, adaptiveThreshold);
                }
            }
        }
        
        // 🐬 Dolphin appears during very high adaptive threshold
        if (adaptiveThreshold > 0.5 && !this.dolphin.active && this.time - this.dolphin.lastJump > 3) {
            this.triggerDolphinJump(adaptiveThreshold);
        }
        
        // 🚤 Boat appears during high energy or energy increases
        this.detectEnergyIncrease(rms, bass, mids, adaptiveThreshold);
        const shouldTriggerBoat = (this.lastEnergyIncrease > 0) || (adaptiveThreshold > 0.6 && rms > 0.15);
        if (shouldTriggerBoat && !this.boat.active && this.time - this.boat.lastAppearance > 10) {
            this.triggerBoatAppearance();
        }
        
        // Update color transition
        this.updateColorTransition();
        
        // Update fish
        this.updateFish();
        
        // Update dolphin
        this.updateDolphin();
        
        // Update boat
        this.updateBoat();
    }
    
    detectBeatDrop(kickDetected, rms, spectralFlux, adaptiveThreshold) {
        // Beat drop detection: kick + (RMS spike OR spectral flux spike)
        const rmsSpike = rms > adaptiveThreshold && (rms - this.lastRmsValue) > 0.2;
        const fluxSpike = spectralFlux > 0.8;
        
        if (kickDetected && (rmsSpike || fluxSpike) && this.time - this.lastBeatDrop > 5) {
            this.isSunsetMode = true;
            this.lastBeatDrop = this.time;
            console.log('🌅 Beat drop detected - entering sunset mode');
        }
        
        // Return to blue if energy stays low for a while
        if (this.isSunsetMode && rms < 0.1 && this.time - this.lastBeatDrop > 10) {
            this.isSunsetMode = false;
            console.log('🌊 Returning to ocean mode');
        }
        
        this.lastRmsValue = rms;
    }
    
    
    updateColorTransition() {
        if (this.isSunsetMode && this.sunsetTransition < 1) {
            this.sunsetTransition = Math.min(1, this.sunsetTransition + this.sunsetFadeSpeed);
        } else if (!this.isSunsetMode && this.sunsetTransition > 0) {
            this.sunsetTransition = Math.max(0, this.sunsetTransition - this.sunsetFadeSpeed);
        }
    }
    
    getAvailableFish() {
        return this.fish.find(fish => !fish.jumping);
    }
    
    getAllAvailableFish() {
        return this.fish.filter(fish => !fish.jumping);
    }
    
    getLastFishJump() {
        return Math.max(...this.fish.map(fish => fish.lastJump || 0));
    }
    
    triggerFishJump(midsEnergy, adaptiveThreshold) {
        const fish = this.getAvailableFish();
        if (!fish) return;
        
        this.triggerSpecificFishJump(fish, midsEnergy, adaptiveThreshold);
    }
    
    triggerSpecificFishJump(fish, midsEnergy, adaptiveThreshold) {
        fish.jumping = true;
        fish.jumpPhase = 0;
        fish.x = Math.random() * this.width;
        fish.y = fish.baseY;
        
        // Base jump from mids (reduced to keep fish on screen)
        const baseJump = -3 - midsEnergy * 2;
        
        // Adaptive threshold multiplier (0.5+ is high, scale from 0.2-0.6 range)
        const thresholdMultiplier = 1 + Math.max(0, adaptiveThreshold - 0.2) * 7.5;
        
        // High adaptive threshold creates dramatic jumps
        fish.vy = baseJump * thresholdMultiplier;
        fish.vx = (Math.random() - 0.5) * (2 + adaptiveThreshold * 6);
        
        // Size scales with adaptive threshold
        fish.size = 6 + midsEnergy * 4 + adaptiveThreshold * 20;
        
        // Visual feedback for high threshold (0.45+ is high energy)
        if (adaptiveThreshold > 0.45) {
            console.log(`🐟 HIGH THRESHOLD FISH JUMP! Threshold: ${adaptiveThreshold.toFixed(3)}, Jump velocity: ${fish.vy.toFixed(1)}`);
        }
        
        fish.lastJump = this.time;
    }
    
    triggerDolphinJump(adaptiveThreshold) {
        this.dolphin.active = true;
        this.dolphin.jumping = true;
        this.dolphin.jumpPhase = 0;
        
        // Randomly choose left or right side
        const fromLeft = Math.random() > 0.5;
        this.dolphin.x = fromLeft ? -50 : this.width + 50;
        this.dolphin.y = this.dolphin.baseY;
        
        // Dolphin has dramatic jump and forward motion
        this.dolphin.vy = -12 - adaptiveThreshold * 10; // Higher arc
        this.dolphin.vx = fromLeft ? 4 + adaptiveThreshold * 3 : -(4 + adaptiveThreshold * 3); // Speed direction
        
        // Size scales with threshold
        this.dolphin.size = 25 + adaptiveThreshold * 15;
        
        this.dolphin.lastJump = this.time;
        
        console.log(`🐬 DOLPHIN JUMP from ${fromLeft ? 'LEFT' : 'RIGHT'}! Threshold: ${adaptiveThreshold.toFixed(3)}, Jump velocity: ${this.dolphin.vy.toFixed(1)}`);
    }
    
    updateFish() {
        this.fish.forEach(fish => {
            if (fish.jumping) {
                // Apply physics
                fish.x += fish.vx;
                fish.y += fish.vy;
                fish.vy += 0.4; // Gravity
                
                // Check if fish returns to water
                if (fish.y >= fish.baseY && fish.vy > 0) {
                    fish.jumping = false;
                    fish.y = fish.baseY;
                    fish.vy = 0;
                    fish.vx = 0;
                }
                
                fish.jumpPhase += 0.1;
            }
        });
    }
    
    updateDolphin() {
        if (this.dolphin.active) {
            if (this.dolphin.jumping) {
                // Apply physics
                this.dolphin.x += this.dolphin.vx;
                this.dolphin.y += this.dolphin.vy;
                this.dolphin.vy += 0.4; // Gravity
                
                // Check if dolphin returns to water - make it disappear
                if (this.dolphin.y >= this.dolphin.baseY && this.dolphin.vy > 0) {
                    this.dolphin.active = false;
                    this.dolphin.jumping = false;
                    this.dolphin.x = this.width + 100;
                    this.dolphin.y = this.dolphin.baseY;
                    this.dolphin.vy = 0;
                    this.dolphin.vx = 0;
                    console.log('🐬 Dolphin disappeared back into ocean');
                }
                
                // Deactivate when dolphin exits screen (either side)
                if (this.dolphin.x > this.width + 100 || this.dolphin.x < -100) {
                    this.dolphin.active = false;
                    this.dolphin.jumping = false;
                    this.dolphin.x = this.width + 100;
                    this.dolphin.vx = 0;
                }
            }
        }
    }
    
    detectEnergyIncrease(rms, bass, mids, adaptiveThreshold) {
        // Calculate combined energy score
        const currentEnergy = (rms * 0.4) + (bass * 0.3) + (mids * 0.3);
        
        // Track energy history
        this.energyHistory.push(currentEnergy);
        if (this.energyHistory.length > 60) { // Keep ~2 seconds of history at 30fps
            this.energyHistory.shift();
        }
        
        // Detect significant energy increase
        if (this.energyHistory.length > 20) {
            const recent = this.energyHistory.slice(-10).reduce((a, b) => a + b, 0) / 10;
            const older = this.energyHistory.slice(-30, -20).reduce((a, b) => a + b, 0) / 10;
            const energyIncrease = recent - older;
            
            // Trigger boat on significant energy increase (lowered threshold)
            if (energyIncrease > 0.08 && adaptiveThreshold > 0.3) {
                this.lastEnergyIncrease = this.time;
                console.log(`⚡ Energy increase detected: ${energyIncrease.toFixed(3)}, threshold: ${adaptiveThreshold.toFixed(3)}`);
            }
        }
    }
    
    triggerBoatAppearance() {
        this.boat.active = true;
        this.boat.direction = Math.random() > 0.5 ? 1 : -1; // Random direction
        
        if (this.boat.direction === 1) {
            // Left to right
            this.boat.x = -200;
            this.boat.vx = 2 + Math.random() * 2;
        } else {
            // Right to left
            this.boat.x = this.width + 200;
            this.boat.vx = -(2 + Math.random() * 2);
        }
        
        this.boat.lastAppearance = this.time;
        this.lastEnergyIncrease = 0; // Reset trigger
        
        console.log(`🚤 BOAT appears sailing ${this.boat.direction === 1 ? 'LEFT to RIGHT' : 'RIGHT to LEFT'}`);
    }
    
    updateBoat() {
        if (this.boat.active) {
            this.boat.x += this.boat.vx;
            
            // Deactivate when boat exits screen
            if ((this.boat.direction === 1 && this.boat.x > this.width + 200) ||
                (this.boat.direction === -1 && this.boat.x < -200)) {
                this.boat.active = false;
                console.log('🚤 Boat sailed away');
            }
        }
    }
    
    renderBoat() {
        if (!this.boat.active) return;
        
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Boat color based on sunset mode
        let boatColor, sailColor;
        if (this.sunsetTransition > 0) {
            const t = this.sunsetTransition;
            boatColor = `rgb(${139 + t * 60}, ${69 + t * 40}, ${19 + t * 20})`; // Brown to orange
            sailColor = `rgb(${255 - t * 55}, ${255 - t * 55}, ${255 - t * 100})`; // White to warm
        } else {
            boatColor = 'rgb(139, 69, 19)'; // Saddle brown
            sailColor = 'rgb(255, 255, 255)'; // White
        }
        
        const boatY = this.boat.y;
        const boatX = this.boat.x;
        
        // Boat hull
        this.ctx.fillStyle = boatColor;
        this.ctx.beginPath();
        this.ctx.ellipse(boatX, boatY, 60, 15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Boat cabin
        this.ctx.fillStyle = boatColor;
        this.ctx.beginPath();
        this.ctx.rect(boatX - 30, boatY - 25, 25, 20);
        this.ctx.fill();
        
        // Mast
        this.ctx.strokeStyle = boatColor;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(boatX + 10, boatY - 5);
        this.ctx.lineTo(boatX + 10, boatY - 80);
        this.ctx.stroke();
        
        // Sail
        this.ctx.fillStyle = sailColor;
        this.ctx.beginPath();
        this.ctx.moveTo(boatX + 10, boatY - 75);
        this.ctx.lineTo(boatX + 50, boatY - 60);
        this.ctx.lineTo(boatX + 50, boatY - 20);
        this.ctx.lineTo(boatX + 10, boatY - 10);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Sail outline
        this.ctx.strokeStyle = boatColor;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
    
    renderSkyGradient() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        
        if (this.sunsetTransition > 0) {
            // Blend between ocean and sunset colors
            const t = this.sunsetTransition;
            
            // Ocean colors
            const oceanSky = [135, 206, 235]; // Sky blue
            const oceanHorizon = [70, 130, 180]; // Steel blue
            const oceanWater = [25, 25, 112]; // Midnight blue
            
            // Sunset colors
            const sunsetSky = [255, 154, 77]; // Orange
            const sunsetHorizon = [255, 99, 71]; // Tomato
            const sunsetWater = [255, 140, 0]; // Dark orange
            
            // Interpolate colors
            const skyR = oceanSky[0] + (sunsetSky[0] - oceanSky[0]) * t;
            const skyG = oceanSky[1] + (sunsetSky[1] - oceanSky[1]) * t;
            const skyB = oceanSky[2] + (sunsetSky[2] - oceanSky[2]) * t;
            
            const horizonR = oceanHorizon[0] + (sunsetHorizon[0] - oceanHorizon[0]) * t;
            const horizonG = oceanHorizon[1] + (sunsetHorizon[1] - oceanHorizon[1]) * t;
            const horizonB = oceanHorizon[2] + (sunsetHorizon[2] - oceanHorizon[2]) * t;
            
            const waterR = oceanWater[0] + (sunsetWater[0] - oceanWater[0]) * t;
            const waterG = oceanWater[1] + (sunsetWater[1] - oceanWater[1]) * t;
            const waterB = oceanWater[2] + (sunsetWater[2] - oceanWater[2]) * t;
            
            gradient.addColorStop(0, `rgb(${skyR}, ${skyG}, ${skyB})`);
            gradient.addColorStop(0.6, `rgb(${horizonR}, ${horizonG}, ${horizonB})`);
            gradient.addColorStop(1, `rgb(${waterR}, ${waterG}, ${waterB})`);
        } else {
            // Pure ocean colors
            gradient.addColorStop(0, 'rgb(135, 206, 235)'); // Sky blue
            gradient.addColorStop(0.6, 'rgb(70, 130, 180)'); // Steel blue  
            gradient.addColorStop(1, 'rgb(25, 25, 112)'); // Midnight blue
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
    
    renderWaves() {
        this.ctx.globalCompositeOperation = 'source-over';
        
        // Use sunset-style sea colors for better contrast
        let waveColor1, waveColor2;
        if (this.sunsetTransition > 0) {
            const t = this.sunsetTransition;
            // Blend wave colors from sunset to deeper sunset
            const baseR1 = 255, baseG1 = 140, baseB1 = 0; // Dark orange
            const baseR2 = 220, baseG2 = 20, baseB2 = 60; // Crimson
            
            const sunsetR1 = 255, sunsetG1 = 69, sunsetB1 = 0; // Red orange
            const sunsetR2 = 139, sunsetG2 = 0, sunsetB2 = 139; // Dark magenta
            
            const r1 = baseR1 + (sunsetR1 - baseR1) * t;
            const g1 = baseG1 + (sunsetG1 - baseG1) * t;
            const b1 = baseB1 + (sunsetB1 - baseB1) * t;
            
            const r2 = baseR2 + (sunsetR2 - baseR2) * t;
            const g2 = baseG2 + (sunsetG2 - baseG2) * t;
            const b2 = baseB2 + (sunsetB2 - baseB2) * t;
            
            waveColor1 = `rgba(${r1}, ${g1}, ${b1}, 0.9)`;
            waveColor2 = `rgba(${r2}, ${g2}, ${b2}, 0.95)`;
        } else {
            // Default sunset-style sea colors (warmer, more contrasting)
            waveColor1 = 'rgba(255, 140, 0, 0.9)'; // Dark orange
            waveColor2 = 'rgba(220, 20, 60, 0.95)'; // Crimson
        }
        
        // Create wave gradient
        const waveGradient = this.ctx.createLinearGradient(0, this.seaLevel - 30, 0, this.height);
        waveGradient.addColorStop(0, waveColor1);
        waveGradient.addColorStop(1, waveColor2);
        
        // Draw multiple wave layers for depth
        for (let layer = 0; layer < 3; layer++) {
            this.ctx.globalAlpha = 0.6 + layer * 0.2;
            this.ctx.fillStyle = waveGradient;
            this.ctx.beginPath();
            this.ctx.moveTo(0, this.height);
            
            // Generate wave points
            for (let x = 0; x <= this.width; x += this.width / this.wavePoints) {
                const normalizedX = x / this.width;
                
                // Multiple sine waves for complexity
                let y = this.seaLevel;
                y += Math.sin((normalizedX * this.waveDensity * Math.PI * 2) + this.wavePhase + layer * 0.5) * this.waveHeight;
                y += Math.sin((normalizedX * this.waveDensity * Math.PI * 4) + this.wavePhase * 1.5 + layer) * (this.waveHeight * 0.3);
                y += Math.sin((normalizedX * this.waveDensity * Math.PI * 6) + this.wavePhase * 2 + layer * 1.5) * (this.waveHeight * 0.15);
                
                if (x === 0) {
                    this.ctx.lineTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.lineTo(this.width, this.height);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        this.ctx.globalAlpha = 1;
    }
    
    renderFish() {
        this.ctx.globalCompositeOperation = 'source-over';
        
        this.fish.forEach(fish => {
            if (!fish.jumping) return;
            
            // Fish color based on mode
            let fishColor;
            if (this.sunsetTransition > 0) {
                const t = this.sunsetTransition;
                const oceanR = 255, oceanG = 215, oceanB = 0; // Gold
                const sunsetR = 255, sunsetG = 69, sunsetB = 0; // Orange red
                
                const r = oceanR + (sunsetR - oceanR) * t;
                const g = oceanG + (sunsetG - oceanG) * t;
                const b = oceanB + (sunsetB - oceanB) * t;
                
                fishColor = `rgb(${r}, ${g}, ${b})`;
            } else {
                fishColor = 'rgb(255, 215, 0)'; // Gold
            }
            
            this.ctx.save();
            this.ctx.translate(fish.x, fish.y);
            
            // Rotate fish based on velocity
            if (fish.vx !== 0 || fish.vy !== 0) {
                const angle = Math.atan2(fish.vy, fish.vx);
                this.ctx.rotate(angle);
            }
            
            // Draw simple fish shape
            this.ctx.fillStyle = fishColor;
            
            // Fish body (ellipse)
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, fish.size, fish.size * 0.6, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Fish tail (triangle)
            this.ctx.beginPath();
            this.ctx.moveTo(-fish.size * 0.8, 0);
            this.ctx.lineTo(-fish.size * 1.3, -fish.size * 0.4);
            this.ctx.lineTo(-fish.size * 1.3, fish.size * 0.4);
            this.ctx.closePath();
            this.ctx.fill();
            
            // Fish eye (small white circle)
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(fish.size * 0.3, -fish.size * 0.2, fish.size * 0.15, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    renderDolphin() {
        if (!this.dolphin.active) return;
        
        this.ctx.globalCompositeOperation = 'source-over';
        
        this.ctx.save();
        this.ctx.translate(this.dolphin.x, this.dolphin.y);
        
        // Rotate dolphin based on velocity for realistic arc
        if (this.dolphin.jumping && (this.dolphin.vx !== 0 || this.dolphin.vy !== 0)) {
            const angle = Math.atan2(this.dolphin.vy, this.dolphin.vx);
            this.ctx.rotate(angle);
        }
        
        // Dolphin color based on sunset mode
        let dolphinColor;
        if (this.sunsetTransition > 0) {
            const t = this.sunsetTransition;
            const oceanR = 70, oceanG = 130, oceanB = 180; // Steel blue
            const sunsetR = 255, sunsetG = 140, sunsetB = 0; // Dark orange
            
            const r = oceanR + (sunsetR - oceanR) * t;
            const g = oceanG + (sunsetG - oceanG) * t;
            const b = oceanB + (sunsetB - oceanB) * t;
            
            dolphinColor = `rgb(${r}, ${g}, ${b})`;
        } else {
            dolphinColor = 'rgb(70, 130, 180)'; // Steel blue
        }
        
        // Draw dolphin body (larger and more detailed than fish)
        const gradient = this.ctx.createLinearGradient(-this.dolphin.size, -this.dolphin.size/2, this.dolphin.size, this.dolphin.size/2);
        gradient.addColorStop(0, dolphinColor);
        gradient.addColorStop(0.5, `rgba(255, 255, 255, 0.3)`); // Highlight
        gradient.addColorStop(1, dolphinColor);
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.dolphin.size, this.dolphin.size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Dolphin rostrum (nose/beak)
        this.ctx.fillStyle = dolphinColor;
        this.ctx.beginPath();
        this.ctx.ellipse(this.dolphin.size * 0.8, 0, this.dolphin.size * 0.4, this.dolphin.size * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Dolphin dorsal fin
        this.ctx.beginPath();
        this.ctx.moveTo(-this.dolphin.size * 0.2, -this.dolphin.size * 0.6);
        this.ctx.lineTo(-this.dolphin.size * 0.6, -this.dolphin.size * 1.1);
        this.ctx.lineTo(0, -this.dolphin.size * 0.6);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Dolphin tail fluke
        this.ctx.beginPath();
        this.ctx.moveTo(-this.dolphin.size * 0.9, 0);
        this.ctx.lineTo(-this.dolphin.size * 1.4, -this.dolphin.size * 0.4);
        this.ctx.lineTo(-this.dolphin.size * 1.6, 0);
        this.ctx.lineTo(-this.dolphin.size * 1.4, this.dolphin.size * 0.4);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Dolphin eye
        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(this.dolphin.size * 0.3, -this.dolphin.size * 0.2, this.dolphin.size * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(this.dolphin.size * 0.35, -this.dolphin.size * 0.2, this.dolphin.size * 0.05, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    renderIdle() {
        this.clear();
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const time = this.getTime();
        
        // Simple wave animation when idle
        this.renderSkyGradient();
        
        this.ctx.strokeStyle = 'rgba(100, 149, 237, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        
        for (let x = 0; x < this.width; x += 8) {
            const y = this.seaLevel + Math.sin(x * 0.02 + time) * 15;
            if (x === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        
        // Text
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('D-Wave Ready', centerX, centerY + 100);
    }
    
    /**
     * Set color theme
     */
    setColorTheme(themeName) {
        const theme = ColorThemes.getTheme(themeName);
        if (theme) {
            this.currentTheme = themeName;
            this.colors = theme;
            console.log(`🎨 D-Wave theme changed to: ${theme.name}`);
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
            name: 'D-Wave',
            description: 'Simplified ocean visualizer with waves and jumping fish that transitions to sunset on beat drops',
            version: '1.0.0'
        };
    }
}