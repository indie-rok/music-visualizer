/**
 * Music Visualizer - Main Entry Point
 * Real-time audio analysis and visualization engine
 */

console.log('🎵 Music Visualizer Loading...');

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM Ready - Initializing visualizer...');
    
    // Basic canvas setup
    const canvas = document.getElementById('visualizer-canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Basic animation loop for testing
    function animate() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Simple gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some animated elements for testing
        const time = Date.now() * 0.002;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        for (let i = 0; i < 50; i++) {
            const angle = (i / 50) * Math.PI * 2 + time;
            const radius = 100 + Math.sin(time + i) * 50;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.fillStyle = `hsl(${(i * 10 + time * 50) % 360}, 70%, 60%)`;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        requestAnimationFrame(animate);
    }
    
    animate();
    
    // UI Event listeners
    const energySlider = document.getElementById('energy-slider');
    const energyValue = document.getElementById('energy-value');
    
    energySlider.addEventListener('input', (e) => {
        energyValue.textContent = e.target.value;
    });
    
    console.log('🚀 Visualizer initialized successfully!');
});

export default {};