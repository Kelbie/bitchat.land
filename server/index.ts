/**
 * Bun Server Entry Point
 * 
 * Serves:
 * - Static files from /dist (production frontend)
 * - REST: GET /api/events for initial event dump
 * - WebSocket: /ws for live event push
 */

import { eventStore } from './eventStore';
import { relayManager } from './relayManager';
import { wsHandler, broadcastEvent } from './wsHandler';
import type { ServerWebSocket } from 'bun';
import { join } from 'path';
import { statSync, existsSync } from 'fs';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const DIST_DIR = join(import.meta.dir, '..', 'dist');

/**
 * Serve static files from dist directory
 */
async function serveStatic(pathname: string): Promise<Response | null> {
  // Remove leading slash and default to index.html
  let filePath = pathname === '/' ? '/index.html' : pathname;
  
  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    return new Response('Forbidden', { status: 403 });
  }
  
  const fullPath = join(DIST_DIR, filePath);
  
  // Check if file exists
  if (!existsSync(fullPath)) {
    // For SPA routing, serve index.html for non-file paths
    if (!filePath.includes('.')) {
      const indexPath = join(DIST_DIR, 'index.html');
      if (existsSync(indexPath)) {
        const file = Bun.file(indexPath);
        return new Response(file, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }
    return null;
  }
  
  // Check if it's a directory
  try {
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      const indexPath = join(fullPath, 'index.html');
      if (existsSync(indexPath)) {
        const file = Bun.file(indexPath);
        return new Response(file, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      return null;
    }
  } catch {
    return null;
  }
  
  // Serve the file
  const file = Bun.file(fullPath);
  
  // Determine content type
  const ext = filePath.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'webp': 'image/webp',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'csv': 'text/csv',
    'xml': 'application/xml',
  };
  
  const contentType = contentTypes[ext || ''] || 'application/octet-stream';
  
  return new Response(file, {
    headers: { 
      'Content-Type': contentType,
      'Cache-Control': ext === 'html' ? 'no-cache' : 'public, max-age=31536000',
    }
  });
}

/**
 * Handle REST API requests
 */
function handleApiRequest(req: Request): Response {
  const url = new URL(req.url);
  
  if (url.pathname === '/api/events') {
    // Get optional 'since' query parameter (timestamp in seconds)
    const sinceParam = url.searchParams.get('since');
    const sinceMs = sinceParam ? parseInt(sinceParam) * 1000 : undefined;
    
    const events = eventStore.getRecent(sinceMs);
    
    return new Response(JSON.stringify({
      events,
      count: events.length,
      serverTime: Date.now(),
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
  
  if (url.pathname === '/api/stats') {
    const stats = eventStore.getStats();
    const relayStats = relayManager.getStats();
    
    return new Response(JSON.stringify({
      events: stats,
      relays: relayStats,
      uptime: process.uptime(),
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
  
  return new Response('Not Found', { status: 404 });
}

// WebSocket client tracking
const wsClients = new Set<ServerWebSocket<unknown>>();

/**
 * Start the server
 */
console.log(`[Server] Starting on port ${PORT}...`);
console.log(`[Server] Serving static files from: ${DIST_DIR}`);

// Initialize relay manager with event callback
relayManager.onEvent((event, geohash, relay) => {
  // Store the event
  const stored = eventStore.add(event, geohash, relay);
  
  // If it's a new event, broadcast to WebSocket clients
  if (stored) {
    broadcastEvent(wsClients, {
      type: 'event',
      data: {
        event,
        geohash,
        relay,
        receivedAt: Date.now(),
      }
    });
  }
});

// Start relay connections
relayManager.start().catch(err => {
  console.error('[Server] Failed to start relay manager:', err);
});

// Start the Bun server
const server = Bun.serve({
  port: PORT,
  
  async fetch(req, server) {
    const url = new URL(req.url);
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }
    
    // WebSocket upgrade
    if (url.pathname === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return undefined;
      }
      return new Response('WebSocket upgrade failed', { status: 400 });
    }
    
    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(req);
    }
    
    // Static files
    const staticResponse = await serveStatic(url.pathname);
    if (staticResponse) {
      return staticResponse;
    }
    
    // 404 fallback
    return new Response('Not Found', { status: 404 });
  },
  
  websocket: {
    open(ws) {
      wsClients.add(ws);
      console.log(`[WebSocket] Client connected (${wsClients.size} total)`);
      
      // Send initial stats
      ws.send(JSON.stringify({
        type: 'connected',
        data: {
          eventCount: eventStore.getStats().totalEvents,
          clientCount: wsClients.size,
        }
      }));
    },
    
    message(ws, message) {
      // Handle ping/pong for keepalive
      if (message === 'ping') {
        ws.send('pong');
      }
    },
    
    close(ws) {
      wsClients.delete(ws);
      console.log(`[WebSocket] Client disconnected (${wsClients.size} total)`);
    },
    
    error(ws, error) {
      console.error('[WebSocket] Error:', error);
      wsClients.delete(ws);
    },
  },
});

console.log(`[Server] Listening on http://localhost:${server.port}`);
console.log(`[Server] WebSocket available at ws://localhost:${server.port}/ws`);
console.log(`[Server] API available at http://localhost:${server.port}/api/events`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  relayManager.stop();
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Server] Shutting down...');
  relayManager.stop();
  server.stop();
  process.exit(0);
});

