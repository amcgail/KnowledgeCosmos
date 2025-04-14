import * as THREE from "/libs/three.js/build/three.module.js";

/**
 * Animation utilities for the tour system.
 * Contains reusable animation functions and helpers.
 */
export class TourAnimations {
    constructor() {
        this.activeTimers = [];
        this.activeAnimationFrames = [];
        this.clickAnimationOverlay = null;
    }

    /**
     * Sets the click animation overlay element
     */
    setOverlay(element) {
        this.clickAnimationOverlay = element;
    }

    /**
     * Track a timer ID for cleanup
     */
    trackTimer(timerId) {
        this.activeTimers.push(timerId);
        return timerId;
    }
    
    /**
     * Track an animation frame ID for cleanup
     */
    trackAnimationFrame(animId) {
        this.activeAnimationFrames.push(animId);
        return animId;
    }

    /**
     * Clear all active timers and animation frames
     */
    clearActiveTimers() {
        this.activeTimers.forEach(timerId => {
            clearTimeout(timerId);
        });
        
        this.activeAnimationFrames.forEach(animId => {
            cancelAnimationFrame(animId);
        });
        
        this.activeTimers = [];
        this.activeAnimationFrames = [];
    }

    /**
     * Simulate a mouse click at the specified coordinates
     */
    simulateClick(x, y, callback) {
        if (!this.clickAnimationOverlay) return;
        
        // Create click animation with CSS class
        const hand = document.createElement('div');
        hand.className = 'click-animation';
        
        // Only set positioning dynamically
        hand.style.left = `${x - 25}px`; // Center the animation
        hand.style.top = `${y - 25}px`;  // Center the animation
        
        this.clickAnimationOverlay.appendChild(hand);
        
        // Create flash effect with CSS class
        const flash = document.createElement('div');
        flash.className = 'click-flash';
        
        // Only set positioning dynamically
        flash.style.left = `${x - 15}px`;
        flash.style.top = `${y - 15}px`;
        
        this.clickAnimationOverlay.appendChild(flash);
        
        // Animate flash
        setTimeout(() => {
            flash.style.transform = 'scale(1)';
            setTimeout(() => {
                flash.style.opacity = '0';
            }, 150);
        }, 10);
        
        // Remove elements and trigger callback after animation completes
        this.trackTimer(setTimeout(() => {
            if (hand.parentNode) hand.parentNode.removeChild(hand);
            if (flash.parentNode) flash.parentNode.removeChild(flash);
            if (callback) callback();
        }, 800));
    }

    /**
     * Create a keyboard event
     */
    createKeyEvent(type, key) {
        const keyCode = this.getKeyCode(key);
        
        return new KeyboardEvent(type, {
            key: key,
            code: this.getKeyEventCode(key),
            keyCode: keyCode,
            which: keyCode,
            bubbles: true
        });
    }
    
    /**
     * Get key code for keyboard event
     */
    getKeyCode(key) {
        switch(key.toLowerCase()) {
            case 'arrowleft': return 37;
            case 'arrowright': return 39;
            case 'arrowup': return 38;
            case 'arrowdown': return 40;
            default: return key.charCodeAt(0);
        }
    }
    
    /**
     * Get key event code for keyboard event
     */
    getKeyEventCode(key) {
        switch(key.toLowerCase()) {
            case 'arrowleft': return 'ArrowLeft';
            case 'arrowright': return 'ArrowRight';
            case 'arrowup': return 'ArrowUp';
            case 'arrowdown': return 'ArrowDown';
            default: return key;
        }
    }

    /**
     * Animate cursor movement from one point to another
     */
    animateCursorMovement(cursor, startX, startY, endX, endY, callback) {
        if (!cursor) return;
        
        const startTime = performance.now();
        const duration = 800; // movement duration in ms
        
        const animate = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth movement
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Calculate current position
            const currentX = startX + (endX - startX) * eased;
            const currentY = startY + (endY - startY) * eased;
            
            // Update cursor position
            cursor.style.left = `${currentX}px`;
            cursor.style.top = `${currentY}px`;
            
            if (progress < 1) {
                const animId = requestAnimationFrame(animate);
                this.trackAnimationFrame(animId);
            } else {
                // Movement complete, call callback
                if (callback) callback();
            }
        };
        
        const initialAnimId = requestAnimationFrame(animate);
        this.trackAnimationFrame(initialAnimId);
    }

    /**
     * Simulate a key press
     */
    simulateKeyPress(key, duration = 500, targetElement = null) {
        // Get the renderer area element or use provided target
        const renderArea = targetElement || document.getElementById('potree_render_area');
        if (!renderArea) return;
        
        // Create a synthetic event
        const keydownEvent = this.createKeyEvent('keydown', key);
        
        // Dispatch the event to trigger the actual movement
        renderArea.dispatchEvent(keydownEvent);
        
        // For more realistic movement, hold the key down longer
        // and simulate multiple keypresses during that time for smoother movement
        const pressInterval = setInterval(() => {
            renderArea.dispatchEvent(keydownEvent);
        }, 50);
        
        // Store interval ID for cleanup
        this.trackTimer(pressInterval);
        
        // Create and dispatch a keyup event after the specified duration to stop movement
        this.trackTimer(setTimeout(() => {
            clearInterval(pressInterval);
            
            const keyupEvent = this.createKeyEvent('keyup', key);
            renderArea.dispatchEvent(keyupEvent);
            
        }, duration));
    }

    /**
     * Creates a shrinking circle indicator around an element
     */
    createShrinkingCircleIndicator(element) {
        if (!element) return;
        
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Create container for circles if not exists
        let circleContainer = document.querySelector('.tour-circle-indicators');
        if (!circleContainer) {
            circleContainer = document.createElement('div');
            circleContainer.className = 'tour-circle-indicators';
            document.body.appendChild(circleContainer);
        }
        
        // Create and animate 3 circles with different delays
        for (let i = 0; i < 3; i++) {
            const circle = document.createElement('div');
            circle.className = 'shrinking-circle';
            
            // Only set the positioning dynamically - everything else comes from CSS
            circle.style.left = `${centerX}px`;
            circle.style.top = `${centerY}px`;
            
            circleContainer.appendChild(circle);
            
            // Animate with delay
            setTimeout(() => {
                circle.style.opacity = '0.8';
                circle.style.transform = 'translate(-50%, -50%) scale(1)';
                
                // Remove after animation completes
                setTimeout(() => {
                    if (circle.parentNode) {
                        circle.parentNode.removeChild(circle);
                    }
                }, 1200);
            }, i * 400); // Staggered start
        }
        
        return circleContainer;
    }
    
    /**
     * Perform a jumping animation with the camera
     */
    performJumpAnimation(viewer, callback) {
        if (!viewer || !viewer.viewer) {
            if (callback) callback();
            return;
        }
        
        try {
            // Get current camera position
            const camera = viewer.viewer.scene.getActiveCamera();
            if (!camera) {
                if (callback) callback();
                return;
            }
            
            // Get camera's forward direction
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            
            // Calculate target position (jump forward)
            const jumpDistance = 300; // Jump distance in units
            const currentPosition = camera.position.clone();
            const targetPosition = currentPosition.clone().add(forward.multiplyScalar(jumpDistance));
            
            // Store initial position values for animation
            const startPos = {
                x: currentPosition.x,
                y: currentPosition.y,
                z: currentPosition.z
            };
            
            // Add flash effect for the jump
            const flash = document.createElement('div');
            flash.className = 'jump-flash';
            document.body.appendChild(flash);
            
            // Start animation
            let animationStartTime = performance.now();
            const animationDuration = 800; // milliseconds
            
            // Create streaking effect
            const streaks = document.createElement('div');
            streaks.className = 'jump-streaks';
            document.body.appendChild(streaks);
            
            // Add multiple streak lines
            for (let i = 0; i < 15; i++) {
                const streak = document.createElement('div');
                streak.className = 'streak';
                streak.style.left = `${Math.random() * 100}%`;
                streak.style.top = `${Math.random() * 100}%`;
                streak.style.width = `${Math.random() * 150 + 50}px`;
                streak.style.transform = `rotate(${Math.random() * 360}deg)`;
                streak.style.animationDelay = `${Math.random() * 0.3}s`;
                streaks.appendChild(streak);
            }
            
            // Flash effect animation
            this.trackTimer(setTimeout(() => {
                flash.classList.add('active');
                
                this.trackTimer(setTimeout(() => {
                    flash.classList.remove('active');
                    
                    // Remove the flash and streaks elements when animation completes
                    this.trackTimer(setTimeout(() => {
                        if (document.body.contains(flash)) document.body.removeChild(flash);
                        if (document.body.contains(streaks)) document.body.removeChild(streaks);
                    }, 1000));
                }, 500));
            }, 200));
            
            // Animate camera movement
            const moveCamera = () => {
                const elapsed = performance.now() - animationStartTime;
                const progress = Math.min(1, elapsed / animationDuration);
                
                // Easing function for smooth acceleration and deceleration
                const eased = progress < 0.5 
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
                // Calculate current position
                const currentX = startPos.x + (targetPosition.x - startPos.x) * eased;
                const currentY = startPos.y + (targetPosition.y - startPos.y) * eased;
                const currentZ = startPos.z + (targetPosition.z - startPos.z) * eased;
                
                try {
                    // Update camera position - with safety check
                    if (viewer && viewer.viewer && viewer.viewer.scene.view) {
                        viewer.viewer.scene.view.position.set(currentX, currentY, currentZ);
                    }
                } catch (error) {
                    console.error('Error updating camera position:', error);
                    if (callback) callback();
                    return; // Stop animation if error
                }
                
                // Continue animation if not complete
                if (progress < 1) {
                    const animationId = this.trackAnimationFrame(requestAnimationFrame(moveCamera));
                } else {
                    // Animation is complete, call the callback
                    this.trackTimer(setTimeout(() => {
                        if (callback) callback();
                    }, 200)); // Small delay to ensure visual effects finish
                }
            };
            
            // Start the camera movement animation
            this.trackAnimationFrame(requestAnimationFrame(moveCamera));
            
            return { flash, streaks };
        } catch (error) {
            console.error('Error in performJumpAnimation:', error);
            if (callback) callback();
            return null;
        }
    }
    
    /**
     * Rotate the camera around a point
     */
    rotateCamera(viewer, degrees) {
        if (!viewer || !viewer.viewer) return;
        
        // Get the camera
        const camera = viewer.viewer.scene.getActiveCamera();
        const lookAtPoint = viewer.viewer.scene.view.getPivot();
        
        // Calculate new position
        const distance = camera.position.distanceTo(lookAtPoint);
        const angleRad = (degrees * Math.PI) / 180;
        
        // Rotate around y-axis (up vector)
        const startPosition = new THREE.Vector3(
            lookAtPoint.x + distance,
            camera.position.y,
            lookAtPoint.z
        );
        
        const newX = lookAtPoint.x + Math.cos(angleRad) * distance;
        const newZ = lookAtPoint.z + Math.sin(angleRad) * distance;
        
        // Update camera position
        viewer.viewer.scene.view.position.set(newX, camera.position.y, newZ);
        
        // Look at the same point
        viewer.viewer.scene.view.lookAt(lookAtPoint);
    }
} 