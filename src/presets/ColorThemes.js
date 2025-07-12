/**
 * Color Themes for Visualizer Presets
 * Centralized color theme system that can be used by all presets
 */
export class ColorThemes {
    static themes = {
        cyberpunk: {
            name: "Cyberpunk",
            description: "Dark futuristic with pink and cyan",
            primary: [255, 0, 150],     // Hot pink
            secondary: [0, 255, 255],   // Cyan
            accent: [150, 255, 0],      // Electric green
            tertiary: [255, 150, 0],    // Orange
            background: [10, 0, 20],    // Dark purple
            mood: "edgy"
        },
        neon: {
            name: "Neon Dreams",
            description: "Bright electric colors on black",
            primary: [255, 255, 0],     // Bright yellow
            secondary: [255, 0, 255],   // Magenta
            accent: [0, 255, 0],        // Pure green
            tertiary: [255, 127, 0],    // Bright orange
            background: [0, 0, 0],      // Pure black
            mood: "energetic"
        },
        beach: {
            name: "Peaceful Beach",
            description: "Calm ocean blues and sandy tones",
            primary: [70, 130, 180],    // Steel blue
            secondary: [135, 206, 235], // Sky blue
            accent: [144, 238, 144],    // Light green
            tertiary: [255, 218, 185],  // Peach
            background: [25, 25, 112],  // Midnight blue
            mood: "calm"
        },
        sunset: {
            name: "Warm Sunset",
            description: "Fiery oranges and warm reds",
            primary: [255, 69, 0],      // Red orange
            secondary: [255, 140, 0],   // Dark orange
            accent: [255, 215, 0],      // Gold
            tertiary: [220, 20, 60],    // Crimson
            background: [25, 25, 112],  // Midnight blue
            mood: "warm"
        },
        forest: {
            name: "Deep Forest",
            description: "Natural greens and earth tones",
            primary: [34, 139, 34],     // Forest green
            secondary: [107, 142, 35],  // Olive drab
            accent: [154, 205, 50],     // Yellow green
            tertiary: [139, 69, 19],    // Saddle brown
            background: [0, 100, 0],    // Dark green
            mood: "natural"
        }
    };
    
    /**
     * Get a theme by name
     */
    static getTheme(themeName) {
        return this.themes[themeName] || this.themes.cyberpunk;
    }
    
    /**
     * Get all available theme names
     */
    static getThemeNames() {
        return Object.keys(this.themes);
    }
    
    /**
     * Get theme info for UI
     */
    static getThemeList() {
        return Object.entries(this.themes).map(([key, theme]) => ({
            key,
            name: theme.name,
            description: theme.description,
            mood: theme.mood
        }));
    }
    
    /**
     * Get colors as RGB strings for CSS
     */
    static getThemeAsRGB(themeName) {
        const theme = this.getTheme(themeName);
        return {
            primary: `rgb(${theme.primary.join(',')})`,
            secondary: `rgb(${theme.secondary.join(',')})`,
            accent: `rgb(${theme.accent.join(',')})`,
            tertiary: `rgb(${theme.tertiary.join(',')})`,
            background: `rgb(${theme.background.join(',')})`
        };
    }
    
    /**
     * Get colors as HSL values (useful for color variations)
     */
    static rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
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
        
        return [h * 360, s * 100, l * 100];
    }
    
    /**
     * Get theme colors as HSL
     */
    static getThemeAsHSL(themeName) {
        const theme = this.getTheme(themeName);
        return {
            primary: this.rgbToHsl(...theme.primary),
            secondary: this.rgbToHsl(...theme.secondary),
            accent: this.rgbToHsl(...theme.accent),
            tertiary: this.rgbToHsl(...theme.tertiary),
            background: this.rgbToHsl(...theme.background)
        };
    }
}