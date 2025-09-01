// Profile Generation Worker for background key generation
// This worker handles CPU-intensive key generation without blocking the UI

// Import the necessary functions from nostr-tools
import { generateSecretKey, getPublicKey } from 'nostr-tools';

// Worker state
let isRunning = false;
let currentAbortController = null;

// Listen for messages from main thread
self.onmessage = function(e) {
  const { command, data } = e.data;
  
  switch (command) {
    case 'START_GENERATION':
      startProfileGeneration(data);
      break;
    case 'STOP_GENERATION':
      stopProfileGeneration();
      break;
    default:
      console.log('Unknown command:', command);
  }
};

function startProfileGeneration({ username, targetSuffix, maxProfiles = 64 }) {
  if (isRunning) {
    return;
  }

  isRunning = true;
  
  // Create abort controller for this generation session
  currentAbortController = new AbortController();
  
  try {
    const profiles = [];
    let attempts = 0;
    const startTime = Date.now();
    
                  // Generate profiles until we have enough or are cancelled
        while (profiles.length < maxProfiles && !currentAbortController.signal.aborted) {
          const privateKey = generateSecretKey();
      const publicKey = getPublicKey(privateKey);
      
      // Check if this public key matches our target suffix
      if (!targetSuffix || publicKey.endsWith(targetSuffix)) {
        // Convert private key to hex string
        const privateKeyHex = Array.from(privateKey, (byte) =>
          byte.toString(16).padStart(2, "0")
        ).join("");
        
        // Create profile object (without color/hue logic - that's handled in main thread)
        const profile = {
          username,
          privateKeyHex,
          publicKeyHex: publicKey,
          attempts: attempts + 1,
          generationTime: Date.now() - startTime
        };
        
        profiles.push(profile);
        
        // Send progress update
        self.postMessage({
          type: 'PROFILE_GENERATED',
          data: {
            profile,
            totalFound: profiles.length,
            targetCount: maxProfiles,
            progress: (profiles.length / maxProfiles) * 100,
            attempts
          }
        });
      }
      
      attempts++;
      
      // Yield control every 1000 attempts to prevent blocking
      if (attempts % 1000 === 0) {
        // Check if we should abort
        if (currentAbortController.signal.aborted) {
          break;
        }
        
        // Send progress update
        self.postMessage({
          type: 'GENERATION_PROGRESS',
          data: {
            attempts,
            found: profiles.length,
            target: maxProfiles
          }
        });
        
        // Small delay to allow other operations
        setTimeout(() => {}, 1);
      }
    }
    
    // Send completion message
    if (currentAbortController.signal.aborted) {
      self.postMessage({
        type: 'GENERATION_CANCELLED',
        data: {
          profiles: profiles,
          totalAttempts: attempts,
          generationTime: Date.now() - startTime
        }
      });
    } else {
      self.postMessage({
        type: 'GENERATION_COMPLETE',
        data: {
          success: true,
          profiles: profiles,
          totalAttempts: attempts,
          generationTime: Date.now() - startTime,
          targetSuffix
        }
      });
    }
    
  } catch (error) {
    console.error('Profile generation failed:', error);
    
    // Send error back to main thread
    self.postMessage({
      type: 'GENERATION_ERROR',
      data: {
        success: false,
        error: error.message
      }
    });
  } finally {
    isRunning = false;
    currentAbortController = null;
  }
}

function stopProfileGeneration() {
  if (!isRunning) {
    return;
  }
  
  isRunning = false;
  
  // Abort current generation operation if possible
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  
  self.postMessage({
    type: 'GENERATION_STOPPED',
    data: { message: 'Profile generation stopped by user' }
  });
}

// Handle worker errors
self.onerror = function(error) {
  console.error('Worker error:', error);
  isRunning = false;
  
  self.postMessage({
    type: 'GENERATION_ERROR',
    data: {
      success: false,
      error: 'Worker error: ' + error.message
    }
  });
};
