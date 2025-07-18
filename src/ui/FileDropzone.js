/**
 * FileDropzone - Drag-and-drop interface for audio file uploads
 * Provides visual feedback and file validation
 */

export class FileDropzone {
    constructor(targetElement, onFileLoad) {
        this.targetElement = targetElement;
        this.onFileLoad = onFileLoad;
        this.isDragOver = false;
        
        this.acceptedTypes = [
            'audio/mpeg',
            'audio/wav', 
            'audio/ogg',
            'audio/webm',
            'audio/mp4',
            'audio/aac'
        ];
        
        this.setupDropzone();
        this.createDropIndicator();
    }
    
    /**
     * Set up drag-and-drop event listeners
     */
    setupDropzone() {
        // Prevent default drag behaviors on the entire window
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // Highlight drop target when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            this.targetElement.addEventListener(eventName, this.handleDragEnter.bind(this), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.targetElement.addEventListener(eventName, this.handleDragLeave.bind(this), false);
        });
        
        // Handle dropped files
        this.targetElement.addEventListener('drop', this.handleDrop.bind(this), false);
        
        console.log('📂 File dropzone initialized');
    }
    
    /**
     * Create visual drop indicator
     */
    createDropIndicator() {
        this.dropIndicator = document.createElement('div');
        this.dropIndicator.className = 'drop-indicator';
        this.dropIndicator.innerHTML = `
            <div class="drop-content">
                <div class="drop-icon">🎵</div>
                <div class="drop-text">Drop audio file here</div>
                <div class="drop-formats">Supports MP3, WAV, OGG, WebM, MP4, AAC</div>
            </div>
        `;
        
        // Add styles
        this.dropIndicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            backdrop-filter: blur(10px);
            border: 3px dashed #4CAF50;
            border-radius: 10px;
        `;
        
        const dropContent = this.dropIndicator.querySelector('.drop-content');
        dropContent.style.cssText = `
            text-align: center;
            color: white;
            font-family: Arial, sans-serif;
        `;
        
        const dropIcon = this.dropIndicator.querySelector('.drop-icon');
        dropIcon.style.cssText = `
            font-size: 48px;
            margin-bottom: 16px;
        `;
        
        const dropText = this.dropIndicator.querySelector('.drop-text');
        dropText.style.cssText = `
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        `;
        
        const dropFormats = this.dropIndicator.querySelector('.drop-formats');
        dropFormats.style.cssText = `
            font-size: 14px;
            opacity: 0.8;
        `;
        
        this.targetElement.appendChild(this.dropIndicator);
    }
    
    /**
     * Prevent default drag behaviors
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    /**
     * Handle drag enter/over events
     */
    handleDragEnter(e) {
        this.preventDefaults(e);
        
        if (!this.isDragOver) {
            this.isDragOver = true;
            this.showDropIndicator();
        }
    }
    
    /**
     * Handle drag leave/drop events
     */
    handleDragLeave(e) {
        this.preventDefaults(e);
        
        // Only hide if leaving the target element, not child elements
        if (!this.targetElement.contains(e.relatedTarget)) {
            this.isDragOver = false;
            this.hideDropIndicator();
        }
    }
    
    /**
     * Handle file drop
     */
    async handleDrop(e) {
        this.preventDefaults(e);
        
        this.isDragOver = false;
        this.hideDropIndicator();
        
        const files = Array.from(e.dataTransfer.files);
        const audioFiles = files.filter(file => this.isAudioFile(file));
        
        if (audioFiles.length === 0) {
            this.showError('No valid audio files found. Please drop an audio file.');
            return;
        }
        
        if (audioFiles.length > 1) {
            this.showError('Please drop only one audio file at a time.');
            return;
        }
        
        const file = audioFiles[0];
        
        try {
            this.showLoading(true);
            await this.onFileLoad(file);
            this.showSuccess(`Loaded: ${file.name}`);
        } catch (error) {
            this.showError(`Failed to load audio: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }
    
    /**
     * Check if file is a supported audio format
     */
    isAudioFile(file) {
        return this.acceptedTypes.includes(file.type) || 
               file.name.match(/\\.(mp3|wav|ogg|webm|mp4|aac)$/i);
    }
    
    /**
     * Show drop indicator
     */
    showDropIndicator() {
        this.dropIndicator.style.display = 'flex';
        this.targetElement.style.filter = 'brightness(0.7)';
    }
    
    /**
     * Hide drop indicator
     */
    hideDropIndicator() {
        this.dropIndicator.style.display = 'none';
        this.targetElement.style.filter = 'none';
    }
    
    /**
     * Show loading state
     */
    showLoading(isLoading) {
        if (isLoading) {
            this.dropIndicator.querySelector('.drop-content').innerHTML = `
                <div class="drop-icon">⏳</div>
                <div class="drop-text">Loading audio...</div>
            `;
            this.dropIndicator.style.display = 'flex';
        } else {
            this.hideDropIndicator();
        }
    }
    
    /**
     * Show success message
     */
    showSuccess(message) {
        this.showMessage(message, '#4CAF50', '✅');
    }
    
    /**
     * Show error message
     */
    showError(message) {
        this.showMessage(message, '#f44336', '❌');
    }
    
    /**
     * Show temporary message
     */
    showMessage(message, color, icon) {
        this.dropIndicator.querySelector('.drop-content').innerHTML = `
            <div class="drop-icon">${icon}</div>
            <div class="drop-text">${message}</div>
        `;
        
        this.dropIndicator.style.borderColor = color;
        this.dropIndicator.style.display = 'flex';
        
        // Hide after 3 seconds
        setTimeout(() => {
            this.hideDropIndicator();
            this.resetDropIndicator();
        }, 3000);
    }
    
    /**
     * Reset drop indicator to default state
     */
    resetDropIndicator() {
        this.dropIndicator.querySelector('.drop-content').innerHTML = `
            <div class="drop-icon">🎵</div>
            <div class="drop-text">Drop audio file here</div>
            <div class="drop-formats">Supports MP3, WAV, OGG, WebM, MP4, AAC</div>
        `;
        
        this.dropIndicator.style.borderColor = '#4CAF50';
    }
    
    /**
     * Destroy dropzone and clean up event listeners
     */
    destroy() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.removeEventListener(eventName, this.preventDefaults, false);
            this.targetElement.removeEventListener(eventName, this.handleDragEnter, false);
            this.targetElement.removeEventListener(eventName, this.handleDragLeave, false);
        });
        
        this.targetElement.removeEventListener('drop', this.handleDrop, false);
        
        if (this.dropIndicator && this.dropIndicator.parentNode) {
            this.dropIndicator.parentNode.removeChild(this.dropIndicator);
        }
        
        console.log('🧹 File dropzone destroyed');
    }
}