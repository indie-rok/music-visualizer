/**
 * VideoExporter - Handles video recording and export functionality
 * Supports MediaRecorder API for canvas stream capture
 */

export class VideoExporter {
    constructor(canvas) {
        this.canvas = canvas;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.stream = null;
        
        // Recording options
        this.recordingOptions = {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
        };
        
        // Fallback MIME types
        this.supportedMimeTypes = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4'
        ];
        
        console.log('🎬 VideoExporter initialized');
        this.checkBrowserSupport();
    }
    
    /**
     * Check browser support for MediaRecorder
     */
    checkBrowserSupport() {
        if (!MediaRecorder.isTypeSupported) {
            console.warn('⚠️ MediaRecorder.isTypeSupported not available');
            return false;
        }
        
        // Find the best supported MIME type
        for (const mimeType of this.supportedMimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                this.recordingOptions.mimeType = mimeType;
                console.log(`✅ Using MIME type: ${mimeType}`);
                return true;
            }
        }
        
        console.error('❌ No supported video MIME types found');
        return false;
    }
    
    /**
     * Start recording the canvas
     */
    async startRecording() {
        if (this.isRecording) {
            console.warn('⚠️ Recording already in progress');
            return false;
        }
        
        try {
            // Get canvas stream
            this.stream = this.canvas.captureStream(60); // 60 FPS
            
            if (!this.stream) {
                throw new Error('Failed to capture canvas stream');
            }
            
            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, this.recordingOptions);
            this.recordedChunks = [];
            
            // Set up event handlers
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                console.log('🎬 Recording stopped');
                this.createVideoFile();
            };
            
            this.mediaRecorder.onerror = (event) => {
                console.error('❌ MediaRecorder error:', event.error);
                this.stopRecording();
            };
            
            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            
            console.log('🔴 Recording started');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to start recording:', error);
            this.isRecording = false;
            return false;
        }
    }
    
    /**
     * Stop recording
     */
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) {
            console.warn('⚠️ No recording in progress');
            return;
        }
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        
        // Stop all tracks in the stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
            this.stream = null;
        }
        
        console.log('⏹️ Recording stopped');
    }
    
    /**
     * Create video file from recorded chunks
     */
    createVideoFile() {
        if (this.recordedChunks.length === 0) {
            console.warn('⚠️ No recorded data available');
            return;
        }
        
        const blob = new Blob(this.recordedChunks, {
            type: this.recordingOptions.mimeType
        });
        
        this.downloadVideo(blob);
    }
    
    /**
     * Download the recorded video
     */
    downloadVideo(blob) {
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const extension = this.getFileExtension();
        const filename = `music-visualizer-${timestamp}.${extension}`;
        
        // Create download link
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        console.log(`💾 Video saved as: ${filename}`);
    }
    
    /**
     * Get file extension based on MIME type
     */
    getFileExtension() {
        const mimeType = this.recordingOptions.mimeType;
        if (mimeType.includes('webm')) {
            return 'webm';
        } else if (mimeType.includes('mp4')) {
            return 'mp4';
        } else {
            return 'webm'; // Default fallback
        }
    }
    
    /**
     * Get recording status
     */
    getStatus() {
        return {
            isRecording: this.isRecording,
            isSupported: this.checkBrowserSupport(),
            mimeType: this.recordingOptions.mimeType,
            hasStream: !!this.stream
        };
    }
    
    /**
     * Set recording quality
     */
    setQuality(bitrate) {
        this.recordingOptions.videoBitsPerSecond = bitrate;
        console.log(`🎬 Video bitrate set to: ${bitrate}`);
    }
    
    /**
     * Get available quality presets
     */
    getQualityPresets() {
        return {
            'low': {
                name: 'Low (1 Mbps)',
                bitrate: 1000000
            },
            'medium': {
                name: 'Medium (2.5 Mbps)',
                bitrate: 2500000
            },
            'high': {
                name: 'High (5 Mbps)',
                bitrate: 5000000
            },
            'ultra': {
                name: 'Ultra (10 Mbps)',
                bitrate: 10000000
            }
        };
    }
    
    /**
     * Record the entire song automatically
     */
    async recordFullSong(audioElement, onProgress = null) {
        if (!audioElement) {
            throw new Error('Audio element is required for full song recording');
        }
        
        return new Promise((resolve, reject) => {
            const songDuration = audioElement.duration;
            const startTime = audioElement.currentTime;
            
            if (!songDuration || songDuration === 0) {
                reject(new Error('Audio duration not available'));
                return;
            }
            
            console.log(`🎬 Starting full song recording: ${songDuration.toFixed(1)}s`);
            
            // Start recording
            this.startRecording().then(success => {
                if (!success) {
                    reject(new Error('Failed to start recording'));
                    return;
                }
                
                // Track progress
                const progressInterval = setInterval(() => {
                    const currentTime = audioElement.currentTime;
                    const progress = Math.min((currentTime - startTime) / (songDuration - startTime), 1);
                    
                    if (onProgress) {
                        onProgress(progress * 100);
                    }
                    
                    // Check if song is finished or paused
                    if (audioElement.ended || audioElement.paused || currentTime >= songDuration - 0.5) {
                        clearInterval(progressInterval);
                        this.stopRecording();
                        resolve(true);
                    }
                }, 100); // Update every 100ms
                
                // Safety timeout (song duration + 5 seconds)
                setTimeout(() => {
                    clearInterval(progressInterval);
                    if (this.isRecording) {
                        this.stopRecording();
                        resolve(true);
                    }
                }, (songDuration - startTime + 5) * 1000);
                
            }).catch(reject);
        });
    }
    
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.isRecording) {
            this.stopRecording();
        }
        
        this.recordedChunks = [];
        this.mediaRecorder = null;
        
        console.log('🧹 VideoExporter destroyed');
    }
}