import { finalizeEvent, validateEvent, verifyEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';

import { GeoRelayDirectory } from './geoRelayDirectory';

// Helper function to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export interface SystemMessageOptions {
  channelKey: string;
  username: string;
  privateKey: string;
  isGeohash: boolean;
}

/**
 * Send a system message when a user joins a channel
 */
export async function sendJoinMessage({
  channelKey,
  username,
  privateKey,
  isGeohash
}: SystemMessageOptions): Promise<void> {
  try {
    // Create the system message content
    const messageContent = `* 👋 ${username} joined the channel via bitchat.land *`;
    
    // Determine event kind and tags based on channel type
    const tags = [
      ["n", username], // username tag
      ["client", "bitchat.land"] // client tag
    ];
    
    let kind: number;
    if (isGeohash) {
      kind = 20000; // Geohash channels use kind 20000
      tags.push(["g", channelKey.toLowerCase()]);
    } else {
      kind = 23333; // Standard channels use kind 23333
      tags.push(["d", channelKey.toLowerCase()]);
      tags.push(["relay", "wss://relay.damus.io"]);
    }
    
    // Create event template
    const eventTemplate = {
      kind: kind,
      created_at: Math.floor(Date.now() / 1000),
      content: messageContent,
      tags: tags,
    };
    
    // Sign the event
    const signedEvent = finalizeEvent(eventTemplate, hexToBytes(privateKey));
    
    // Validate the event
    const valid = validateEvent(signedEvent);
    const verified = verifyEvent(signedEvent);
    
    if (!valid) {
      throw new Error("Join event validation failed");
    }
    if (!verified) {
      throw new Error("Join event signature verification failed");
    }
    
    // Get relays for publishing
    let allRelays = ["wss://relay.damus.io"];
    
    // Add georelay relays if available
    try {
      if (isGeohash) {
        const geoRelays = GeoRelayDirectory.shared.closestRelays(channelKey, 10);
        if (geoRelays && Array.isArray(geoRelays) && geoRelays.length > 0) {
          allRelays = [...new Set([...allRelays, ...geoRelays])];
        }
      } else {
        const geoRelays = GeoRelayDirectory.shared.closestRelays("u", 5);
        if (geoRelays && Array.isArray(geoRelays) && geoRelays.length > 0) {
          allRelays = [...new Set([...allRelays, ...geoRelays])];
        }
      }
    } catch (geoError) {
      console.warn("Could not get georelay relays:", geoError);
    }
    
    // Remove duplicates and ensure valid relay URLs
    allRelays = [...new Set(allRelays)].filter(relay => 
      relay && relay.startsWith('wss://') && relay.length > 0
    );
    
    // Ensure allRelays is always an array
    if (!Array.isArray(allRelays)) {
      console.error(`❌ allRelays is not an array:`, allRelays);
      allRelays = ["wss://relay.damus.io"]; // Fallback to single relay
    }
    
    // Create pool and publish
    const pool = new SimplePool();
    
    try {
      // Publish to ALL relays - pool.publish returns an array of promises
      const publishPromises = pool.publish(allRelays, signedEvent);
      const results = await Promise.allSettled(publishPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      if (failed.length > 0) {
        console.warn(
          `Warning: Failed to publish join message to ${failed.length} relays:`,
          failed
        );
      }
      
      if (successful.length === 0) {
        throw new Error("Failed to publish join message to any relay");
      }
      
    } finally {
      pool.close(allRelays);
    }
    
  } catch (error) {
    console.error("Failed to send join message:", error);
    // Don't throw - this is a non-critical feature
  }
}
