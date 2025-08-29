import { finalizeEvent, validateEvent, verifyEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';
import { DEFAULT_RELAYS } from '../constants/projections';
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
    console.log(`🚀 Sending join message for channel: ${channelKey}`);
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Private key length: ${privateKey.length}`);
    console.log(`🌍 Is geohash: ${isGeohash}`);
    
    // Create the system message content
    const messageContent = `* 👋 ${username} joined the channel via bitchat.land *`;
    console.log(`📝 Message content: ${messageContent}`);
    
    // Determine event kind and tags based on channel type
    const tags = [
      ["n", username], // username tag
      ["client", "bitchat.land"] // client tag
    ];
    
    let kind: number;
    if (isGeohash) {
      kind = 20000; // Geohash channels use kind 20000
      tags.push(["g", channelKey.toLowerCase()]);
      console.log(`📍 Added geohash tag: g=${channelKey.toLowerCase()}`);
    } else {
      kind = 23333; // Standard channels use kind 23333
      tags.push(["d", channelKey.toLowerCase()]);
      tags.push(["relay", DEFAULT_RELAYS[0]]);
      console.log(`💬 Added group tag: d=${channelKey.toLowerCase()}`);
    }
    
    // Create event template
    const eventTemplate = {
      kind: kind,
      created_at: Math.floor(Date.now() / 1000),
      content: messageContent,
      tags: tags,
    };
    
    console.log("📄 Join event template:", eventTemplate);
    
    // Sign the event
    const signedEvent = finalizeEvent(eventTemplate, hexToBytes(privateKey));
    console.log("✍️ Signed join event:", signedEvent);
    
    // Validate the event
    const valid = validateEvent(signedEvent);
    const verified = verifyEvent(signedEvent);
    
    if (!valid) {
      throw new Error("Join event validation failed");
    }
    if (!verified) {
      throw new Error("Join event signature verification failed");
    }
    
    console.log("✅ Join event validated successfully");
    
    // Get relays for publishing
    let allRelays = [...DEFAULT_RELAYS];
    console.log(`📡 Starting with ${DEFAULT_RELAYS.length} default relays:`, DEFAULT_RELAYS);
    
    // Add georelay relays if available
    try {
      if (isGeohash) {
        console.log(`🌍 Attempting to get georelay relays for geohash: ${channelKey}`);
        const geoRelays = GeoRelayDirectory.shared.closestRelays(channelKey, 10);
        console.log(`🌍 GeoRelay result:`, geoRelays);
        if (geoRelays && Array.isArray(geoRelays) && geoRelays.length > 0) {
          allRelays = [...new Set([...allRelays, ...geoRelays])];
          console.log(`🌍 Added ${geoRelays.length} georelay relays for geohash ${channelKey}`);
        } else {
          console.log(`🌍 No georelay relays found for geohash ${channelKey}`);
        }
      } else {
        console.log(`🌍 Attempting to get georelay relays for current location`);
        const geoRelays = GeoRelayDirectory.shared.closestRelays("u", 5);
        console.log(`🌍 GeoRelay result:`, geoRelays);
        if (geoRelays && Array.isArray(geoRelays) && geoRelays.length > 0) {
          allRelays = [...new Set([...allRelays, ...geoRelays])];
          console.log(`🌍 Added ${geoRelays.length} georelay relays for current location`);
        } else {
          console.log(`🌍 No georelay relays found for current location`);
        }
      }
    } catch (geoError) {
      console.warn("Could not get georelay relays:", geoError);
      console.log(`🌍 Falling back to default relays only`);
    }
    
    // Remove duplicates and ensure valid relay URLs
    allRelays = [...new Set(allRelays)].filter(relay => 
      relay && relay.startsWith('wss://') && relay.length > 0
    );
    
    console.log(`📡 Total relays for publishing join message: ${allRelays.length}`);
    console.log(`📡 Relay URLs:`, allRelays);
    console.log(`📡 allRelays type:`, typeof allRelays, Array.isArray(allRelays));
    
    // Ensure allRelays is always an array
    if (!Array.isArray(allRelays)) {
      console.error(`❌ allRelays is not an array:`, allRelays);
      allRelays = DEFAULT_RELAYS; // Fallback to default relays
    }
    
    // Create pool and publish
    const pool = new SimplePool();
    
    try {
      console.log("Attempting to publish join event to relays:", allRelays);
      
      // Publish to ALL relays - pool.publish returns an array of promises
      const publishPromises = pool.publish(allRelays, signedEvent);
      const results = await Promise.allSettled(publishPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      if (failed.length > 0) {
        console.warn(`⚠️ Failed to publish join message to ${failed.length} relays:`, failed);
      }
      
      if (successful.length === 0) {
        throw new Error("Failed to publish join message to any relay");
      }
      
      console.log(`✅ Join message published successfully to ${successful.length}/${results.length} relays`);
    } finally {
      pool.close(allRelays);
    }
    
  } catch (error) {
    console.error("❌ Failed to send join message:", error);
    // Don't throw - this is a non-critical feature
  }
}
