import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, validateEvent, verifyEvent } from "nostr-tools/pure";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { hexToBytes, bytesToHex } from "nostr-tools/utils";
import { sha256 } from "@noble/hashes/sha256";
import { NOSTR_RELAYS } from "../constants/projections";

export interface RollRange {
  min: number;
  max: number;
}

export function parseRollCommand(input: string): RollRange | null {
  const match = input.trim().match(/^!roll(?:\s+(\d+)(?:-(\d+))?)?$/i);
  if (!match) return null;

  let min = 1;
  let max = 10;
  if (match[1]) {
    if (match[2]) {
      min = parseInt(match[1], 10);
      max = parseInt(match[2], 10);
    } else {
      min = 0;
      max = parseInt(match[1], 10);
    }
  }
  if (min > max) {
    [min, max] = [max, min];
  }
  return { min, max };
}

export async function sendRollResult(
  channel: string,
  username: string,
  pubkey: string,
  range: RollRange
): Promise<string> {
  const tempPriv = generateSecretKey();
  const tempPub = getPublicKey(tempPriv);
  const hash = sha256(hexToBytes(tempPub));
  const hashHex = bytesToHex(hash);
  const rand = parseInt(hashHex.slice(0, 8), 16);
  const result = (rand % (range.max - range.min + 1)) + range.min;

  const isGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(channel);

  const tags: string[][] = [
    ["n", "!roll"],
    ["client", "bitchat.land"],
  ];

  let kind: number;
  if (isGeohash) {
    kind = 20000;
    tags.push(["g", channel.toLowerCase()]);
  } else {
    kind = 23333;
    tags.push(["d", channel.toLowerCase()]);
    tags.push(["relay", NOSTR_RELAYS[0]]);
  }

  const content = `@${username}#${pubkey.slice(-4)} rolled ${result} point(s) via bitchat.land`;
  const eventTemplate = {
    kind,
    created_at: Math.floor(Date.now() / 1000),
    content,
    tags,
  } as const;

  const signedEvent = finalizeEvent(eventTemplate, tempPriv);
  const valid = validateEvent(signedEvent);
  const verified = verifyEvent(signedEvent);

  if (!valid) throw new Error("Event validation failed");
  if (!verified) throw new Error("Event signature verification failed");

  const pool = new SimplePool();
  try {
    const publishPromises = pool.publish(NOSTR_RELAYS, signedEvent);
    const results = await Promise.allSettled(publishPromises);
    const successful = results.filter(r => r.status === "fulfilled");
    if (successful.length === 0) {
      const errors = results
        .filter(r => r.status === "rejected")
        .map(r => (r as PromiseRejectedResult).reason?.message || "Unknown error");
      throw new Error(`Failed to publish message to any relay: ${errors.join(', ')}`);
    }
  } finally {
    pool.close(NOSTR_RELAYS);
  }
  return content;
}

