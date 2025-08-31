// POW Worker for background Proof of Work mining
// This worker handles CPU-intensive POW calculations without blocking the UI

// Import the minePow function from nostr-tools
import { minePow } from 'nostr-tools/nip13';

// Worker state
let isRunning = false;
let currentAbortController = null;

// Listen for messages from main thread
self.onmessage = function(e) {
  const { command, data } = e.data;
  
  switch (command) {
    case 'START_POW':
      startProofOfWork(data);
      break;
    case 'STOP_POW':
      stopProofOfWork();
      break;
    default:
      console.log('Unknown command:', command);
  }
};

function startProofOfWork({ eventTemplate, difficulty }) {
  if (isRunning) {
    console.log('POW already running, ignoring start command');
    return;
  }

  isRunning = true;
  console.log(`⛏️ Starting POW mining with difficulty ${difficulty}`);
  
  // Create abort controller for this mining session
  currentAbortController = new AbortController();
  
  try {
    // Use the minePow function from nostr-tools
    const minedEvent = minePow(eventTemplate, difficulty);
    
    // Success! Send result back
    self.postMessage({
      type: 'POW_COMPLETE',
      data: {
        success: true,
        minedEvent,
        difficulty,
        eventId: minedEvent.id
      }
    });
    
  } catch (error) {
    console.error('POW mining failed:', error);
    
    // Send error back to main thread
    self.postMessage({
      type: 'POW_ERROR',
      data: {
        success: false,
        error: error.message,
        difficulty
      }
    });
  } finally {
    isRunning = false;
    currentAbortController = null;
  }
}

function stopProofOfWork() {
  if (!isRunning) {
    console.log('POW not running, ignoring stop command');
    return;
  }
  
  console.log('⛏️ Stopping POW mining...');
  isRunning = false;
  
  // Abort current mining operation if possible
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  
  self.postMessage({
    type: 'POW_STOPPED',
    data: { message: 'Proof of work stopped by user' }
  });
}

// Handle worker errors
self.onerror = function(error) {
  console.error('Worker error:', error);
  isRunning = false;
  
  self.postMessage({
    type: 'POW_ERROR',
    data: {
      success: false,
      error: 'Worker error: ' + error.message
    }
  });
};
