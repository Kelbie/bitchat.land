export interface ParsedSearch {
  text: string;
  geohashes: string[]; // Note: "geohashes" name kept for backward compatibility, but can contain any location strings
  users: string[];
  clients: string[]; // New field for client filters
}

/**
 * Parses search query with syntax like:
 * "hello world in:21m from:@jack client:bitchat.land"
 * "test in:#nyc in:london from:@alice#1234 client:amethyst"
 * in: can accept any string, not just geohashes
 */
export function parseSearchQuery(query: string): ParsedSearch {
  if (!query.trim()) {
    return { text: "", geohashes: [], users: [], clients: [] };
  }

  const geohashes: string[] = [];
  const users: string[] = [];
  const clients: string[] = [];
  let text = query;

  // Extract "in:" terms (any string)
  const inPattern = /\s*in:(#?)(\S+)\s*/gi;
  let match;
  while ((match = inPattern.exec(query)) !== null) {
    const locationFilter = match[2].toLowerCase();
    if (!geohashes.includes(locationFilter)) {
      geohashes.push(locationFilter);
    }
    // Remove the matched "in:" term from text
    text = text.replace(match[0], ' ');
  }

  // Extract "from:" terms (users)
  const fromPattern = /\s*from:(@?)([^#\s]+)(#([0-9a-f]+))?\s*/gi;
  while ((match = fromPattern.exec(query)) !== null) {
    const username = match[2];
    const pubkeyHash = match[4];
    
    // Create user identifier - use pubkey hash if provided, otherwise just username
    const userIdentifier = pubkeyHash ? `${username}#${pubkeyHash}` : username;
    if (!users.includes(userIdentifier)) {
      users.push(userIdentifier);
    }
    // Remove the matched "from:" term from text
    text = text.replace(match[0], ' ');
  }

  // Extract "client:" terms (clients)
  const clientPattern = /\s*client:(\S+)\s*/gi;
  while ((match = clientPattern.exec(query)) !== null) {
    const clientFilter = match[1].toLowerCase();
    if (!clients.includes(clientFilter)) {
      clients.push(clientFilter);
    }
    // Remove the matched "client:" term from text
    text = text.replace(match[0], ' ');
  }

  // Clean up the remaining text
  text = text.replace(/\s+/g, ' ').trim();

  return { text, geohashes, users, clients };
}

/**
 * Builds a search query string from parsed components
 */
export function buildSearchQuery(parsed: ParsedSearch): string {
  let query = parsed.text;
  
  // Add geohash terms
  for (const geohash of parsed.geohashes) {
    query += ` in:${geohash}`;
  }
  
  // Add user terms
  for (const user of parsed.users) {
    query += ` from:${user}`;
  }
  
  // Add client terms
  for (const client of parsed.clients) {
    query += ` client:${client}`;
  }
  
  return query.trim();
}

/**
 * Adds a geohash to an existing search query with smart extension logic
 * - If no existing geohash, adds the new one
 * - If clicking within an existing geohash area (new geohash starts with existing), extends that geohash
 * - If clicking outside existing areas, replaces the primary geohash with the new one
 */
export function addGeohashToSearch(currentQuery: string, geohash: string): string {
  const parsed = parseSearchQuery(currentQuery);
  const newGeohash = geohash.toLowerCase();
  
  // Don't add if exactly the same geohash already exists
  if (parsed.geohashes.includes(newGeohash)) {
    return currentQuery;
  }
  
  // If no existing geohashes, just add the new one
  if (parsed.geohashes.length === 0) {
    parsed.geohashes.push(newGeohash);
    return buildSearchQuery(parsed);
  }
  
  // Check if the new geohash extends any existing geohash (drilling down)
  let foundExtension = false;
  
  for (let i = 0; i < parsed.geohashes.length; i++) {
    const existingGeohash = parsed.geohashes[i];
    
    // Case 1: New geohash extends an existing one (e.g., existing "a", clicking on "ab")
    // This is the main use case: drilling down into a region
    if (newGeohash.startsWith(existingGeohash) && newGeohash.length > existingGeohash.length) {
      parsed.geohashes[i] = newGeohash;
      foundExtension = true;
      break;
    }
    
    // Case 2: Existing geohash extends the new one (e.g., existing "ab", clicking on "a")
    // This means we're zooming out, so keep the existing more specific geohash
    if (existingGeohash.startsWith(newGeohash) && existingGeohash.length > newGeohash.length) {
      // Don't change anything - keep the more specific existing geohash
      foundExtension = true;
      break;
    }
  }
  
  // If no extension was found, replace the primary (first) geohash with the new one
  // This handles jumping to a completely different area
  if (!foundExtension) {
    if (parsed.geohashes.length > 0) {
      parsed.geohashes[0] = newGeohash;
    } else {
      parsed.geohashes.push(newGeohash);
    }
  }
  
  return buildSearchQuery(parsed);
}

/**
 * Removes a geohash from an existing search query
 */
export function removeGeohashFromSearch(currentQuery: string, geohash: string): string {
  const parsed = parseSearchQuery(currentQuery);
  parsed.geohashes = parsed.geohashes.filter(g => g !== geohash.toLowerCase());
  return buildSearchQuery(parsed);
}

/**
 * Adds a user to an existing search query
 */
export function addUserToSearch(currentQuery: string, username: string, pubkeyHash?: string): string {
  const parsed = parseSearchQuery(currentQuery);
  
  // Create user identifier
  const userIdentifier = pubkeyHash ? `${username}#${pubkeyHash}` : username;
  
  // Don't add if already present
  if (parsed.users.includes(userIdentifier)) {
    return currentQuery;
  }
  
  parsed.users.push(userIdentifier);
  return buildSearchQuery(parsed);
}

/**
 * Adds a client to an existing search query
 */
export function addClientToSearch(currentQuery: string, clientName: string): string {
  const parsed = parseSearchQuery(currentQuery);
  
  // Don't add if already present
  if (parsed.clients.includes(clientName.toLowerCase())) {
    return currentQuery;
  }
  
  parsed.clients.push(clientName.toLowerCase());
  return buildSearchQuery(parsed);
}
