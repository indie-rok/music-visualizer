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
        
        // Recording options - High quality settings
        this.recordingOptions = {
            mimeType: 'video/mp4',
            videoBitsPerSecond: 8000000, // 8 Mbps for high quality
            audioBitsPerSecond: 128000   // 128 kbps for audio
        };
        
        // Fallback MIME types (prioritize MP4)
        this.supportedMimeTypes = [
            'video/mp4;codecs=h264',
            'video/mp4;codecs=avc1.42E01E',
            'video/mp4;codecs=avc1.4D401E',
            'video/mp4;codecs=avc1',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        
        console.log('🎬 VideoExporter initialized');
        this.checkBrowserSupport();
        
        // Set high quality by default
        this.setQuality(8000000); // 8 Mbps high quality
    }
    
    /**
     * Check browser support for MediaRecorder
     */
    checkBrowserSupport() {
        if (!MediaRecorder.isTypeSupported) {
            console.warn('⚠️ MediaRecorder.isTypeSupported not available');
            return false;
        }
        
        // Log support for all MIME types
        console.log('🔍 Checking video format support:');
        for (const mimeType of this.supportedMimeTypes) {
            const supported = MediaRecorder.isTypeSupported(mimeType);
            console.log(`  ${mimeType}: ${supported ? '✅' : '❌'}`);
        }
        
        // Find the best supported MIME type
        for (const mimeType of this.supportedMimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
                this.recordingOptions.mimeType = mimeType;
                console.log(`✅ Selected MIME type: ${mimeType}`);
                return true;
            }
        }
        
        console.error('❌ No supported video MIME types found');
        return false;
    }
    
    /**
     * Optimize canvas for high-quality recording
     */
    optimizeCanvasForRecording() {
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
            // Disable image smoothing for crisp pixels
            ctx.imageSmoothingEnabled = false;
            ctx.imageSmoothingQuality = 'high';
            
            // Ensure canvas is using maximum pixel density
            const dpr = window.devicePixelRatio || 1;
            const rect = this.canvas.getBoundingClientRect();
            
            // Only adjust if canvas isn't already optimized
            if (this.canvas.width !== rect.width * dpr || this.canvas.height !== rect.height * dpr) {
                console.log(`🎬 Optimizing canvas for recording: ${rect.width * dpr}x${rect.height * dpr}`);
                // Note: This would require re-rendering, so we'll just log for now
            }
        }
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
            // Ensure canvas is at maximum quality
            this.optimizeCanvasForRecording();
            
            // Get canvas stream with high frame rate
            this.stream = this.canvas.captureStream(60); // 60 FPS for smooth playback
            
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
            
            // Start recording with smaller chunks for better quality
            this.mediaRecorder.start(250); // Collect data every 250ms for better quality
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
        
        // Show user message about format
        if (extension === 'webm') {
            console.log('ℹ️ Video saved as WebM. You can convert to MP4 using online converters or video editing software.');
        }
    }
    
    /**
     * Get file extension based on MIME type
     */
    getFileExtension() {
        const mimeType = this.recordingOptions.mimeType;
        if (mimeType.includes('mp4')) {
            return 'mp4';
        } else if (mimeType.includes('webm')) {
            return 'webm';
        } else {
            return 'mp4'; // Default fallback to MP4
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
        // Also set audio bitrate proportionally
        this.recordingOptions.audioBitsPerSecond = Math.min(bitrate / 40, 256000);
        console.log(`🎬 Video bitrate set to: ${bitrate}, Audio bitrate: ${this.recordingOptions.audioBitsPerSecond}`);
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
                name: 'Medium (4 Mbps)',
                bitrate: 4000000
            },
            'high': {
                name: 'High (8 Mbps)',
                bitrate: 8000000
            },
            'ultra': {
                name: 'Ultra (15 Mbps)',
                bitrate: 15000000
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