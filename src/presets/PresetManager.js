/**
 * Preset Manager
 * Manages loading, switching, and controlling visualization presets
 */
import { MilkdropPreset } from './MilkdropPreset.js';
import { GeissPreset } from './GeissPreset.js';
import { ExplosionPreset } from './ExplosionPreset.js';
import { DWavePreset } from './DWavePreset.js';

export class PresetManager {
    constructor(canvas, audioEngine, beatDetection) {
        this.canvas = canvas;
        this.audioEngine = audioEngine;
        this.beatDetection = beatDetection;
        
        // Current active preset
        this.currentPreset = null;
        this.currentPresetName = null;
        
        // Registry of available presets
        this.presets = new Map();
        
        // Initialize available presets
        this.registerPresets();
    }
    
    /**
     * Register all available presets
     */
    registerPresets() {
        this.presets.set('milkdrop', {
            name: 'Milkdrop',
            description: 'Classic Winamp Milkdrop-style visualization',
            class: MilkdropPreset
        });
        
        this.presets.set('geiss', {
            name: 'Geiss v2',
            description: 'Field effect visualization with particle trails',
            class: GeissPreset
        });
        
        this.presets.set('explosion', {
            name: 'Explosion',
            description: 'MilkDrop-style plasma visualizer with psychedelic effects',
            class: ExplosionPreset
        });
        
        this.presets.set('dwave', {
            name: 'D-Wave',
            description: 'Simplified ocean visualizer with waves and jumping fish',
            class: DWavePreset
        });
        
        // Future presets can be added here:
        // this.presets.set('spectrum', { ... });
        // this.presets.set('particles', { ... });
    }
    
    /**
     * Get list of available preset names
     */
    getAvailablePresets() {
        return Array.from(this.presets.keys());
    }
    
    /**
     * Get preset information by name
     */
    getPresetInfo(presetName) {
        const preset = this.presets.get(presetName);
        return preset ? {
            name: preset.name,
            description: preset.description
        } : null;
    }
    
    /**
     * Load and activate a preset by name
     */
    async loadPreset(presetName) {
        if (!this.presets.has(presetName)) {
            throw new Error(`Preset '${presetName}' not found`);
        }
        
        // Stop current preset if active
        if (this.currentPreset) {
            this.currentPreset.stop();
            this.currentPreset.destroy();
        }
        
        // Create new preset instance
        const presetConfig = this.presets.get(presetName);
        this.currentPreset = new presetConfig.class(
            this.canvas,
            this.audioEngine,
            this.beatDetection
        );
        
        this.currentPresetName = presetName;
        
        console.log(`🎨 Loaded preset: ${presetConfig.name}`);
        
        return this.currentPreset;
    }
    
    /**
     * Start the current preset
     */
    start() {
        if (this.currentPreset) {
            this.currentPreset.start();
        }
    }
    
    /**
     * Stop the current preset
     */
    stop() {
        if (this.currentPreset) {
            this.currentPreset.stop();
        }
    }
    
    /**
     * Get the currently active preset
     */
    getCurrentPreset() {
        return this.currentPreset;
    }
    
    /**
     * Get the currently active preset name
     */
    getCurrentPresetName() {
        return this.currentPresetName;
    }
    
    /**
     * Check if a preset is currently loaded and running
     */
    isRunning() {
        return this.currentPreset && this.currentPreset.isRunning;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this.currentPreset) {
            this.currentPreset.stop();
            this.currentPreset.destroy();
        }
        
        this.currentPreset = null;
        this.currentPresetName = null;
        this.presets.clear();
        
        console.log('🧹 PresetManager destroyed');
    }
}