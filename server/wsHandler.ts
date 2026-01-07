/**
 * WebSocket Handler
 * 
 * Handles WebSocket connections and broadcasts events to all connected clients
 */

import type { ServerWebSocket } from 'bun';

export interface WsMessage {
  type: 'event' | 'connected' | 'stats' | 'error';
  data: unknown;
}

/**
 * Broadcast a message to all connected WebSocket clients
 */
export function broadcastEvent(
  clients: Set<ServerWebSocket<unknown>>,
  message: WsMessage
): void {
  if (clients.size === 0) return;

  const payload = JSON.stringify(message);
  let sent = 0;
  let failed = 0;

  for (const client of clients) {
    try {
      client.send(payload);
      sent++;
    } catch (err) {
      // Client might have disconnected
      failed++;
      clients.delete(client);
    }
  }

  // Only log if we had failures
  if (failed > 0) {
    console.log(`[WebSocket] Broadcast: ${sent} sent, ${failed} failed`);
  }
}

/**
 * Send a message to a specific client
 */
export function sendToClient(
  client: ServerWebSocket<unknown>,
  message: WsMessage
): boolean {
  try {
    client.send(JSON.stringify(message));
    return true;
  } catch {
    return false;
  }
}

/**
 * WebSocket handler configuration for Bun.serve
 * Note: This is used as a reference, actual handlers are in index.ts
 */
export const wsHandler = {
  open(ws: ServerWebSocket<unknown>) {
    console.log('[WebSocket] Client connected');
  },
  
  message(ws: ServerWebSocket<unknown>, message: string | Buffer) {
    // Handle ping/pong for keepalive
    if (message === 'ping') {
      ws.send('pong');
    }
  },
  
  close(ws: ServerWebSocket<unknown>) {
    console.log('[WebSocket] Client disconnected');
  },
  
  error(ws: ServerWebSocket<unknown>, error: Error) {
    console.error('[WebSocket] Error:', error);
  },
};

export default wsHandler;

