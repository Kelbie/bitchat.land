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

import { SimplePool } from "nostr-tools/pool";
import { finalizeEvent, validateEvent, verifyEvent } from "nostr-tools/pure";
import { NOSTR_RELAYS } from "../constants/projections";
import { hexToBytes, bytesToHex } from "nostr-tools/utils";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { sha256 } from "@noble/hashes/sha256";

export async function publishRoll(
  { min, max }: RollRange,
  channel: string,
  isGeohash: boolean,
  username: string,
  pubkey: string
): Promise<string> {
  const tempPriv = generateSecretKey();
  const tempPub = getPublicKey(tempPriv);
  const hash = sha256(hexToBytes(tempPub));
  const hashHex = bytesToHex(hash);
  const rand = parseInt(hashHex.slice(0, 8), 16);
  const result = (rand % (max - min + 1)) + min;

  const tags: string[][] = [
    ["n", "!roll"],
    ["client", "bitchat.land"],
  ];

  let kind;
  if (isGeohash) {
    kind = 20000;
    tags.push(["g", channel.toLowerCase()]);
  } else {
    kind = 23333;
    tags.push(["d", channel.toLowerCase()]);
    tags.push(["relay", NOSTR_RELAYS[0]]);
  }

  const eventTemplate = {
    kind,
    created_at: Math.floor(Date.now() / 1000),
    content: `@${username}#${pubkey.slice(-4)} rolled ${result} point(s) via bitchat.land`,
    tags,
  };

  const signedEvent = finalizeEvent(eventTemplate, tempPriv);
  const valid = validateEvent(signedEvent);
  const verified = verifyEvent(signedEvent);

  if (!valid) throw new Error("Event validation failed");
  if (!verified) throw new Error("Event signature verification failed");

  const pool = new SimplePool();
  try {
    const publishPromises = pool.publish(NOSTR_RELAYS, signedEvent);
    const results = await Promise.allSettled(publishPromises);
    const successful = results.filter(
      (r): r is PromiseFulfilledResult<void> => r.status === "fulfilled"
    );
    if (successful.length === 0) {
      const errors = results
        .filter(
          (r): r is PromiseRejectedResult => r.status === "rejected"
        )
        .map((r) => (r.reason as Error)?.message || "Unknown error");
      throw new Error(`Failed to publish to any relay: ${errors.join(', ')}`);
    }
  } finally {
    pool.close(NOSTR_RELAYS);
  }

  return eventTemplate.content;
}

