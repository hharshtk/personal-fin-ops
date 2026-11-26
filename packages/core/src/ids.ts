const hex = (byte: number) => byte.toString(16).padStart(2, "0");

/**
 * A UUIDv7 for a new record (CONSTITUTION.md, Article 6). The client supplies
 * the time in Unix milliseconds and ten random bytes, because the core reads
 * neither the clock nor a random source.
 */
export function uuidv7(unixMs: number, random: Uint8Array): string {
  if (random.length < 10) throw new Error("uuidv7 needs 10 random bytes");
  const time = Math.floor(unixMs).toString(16).padStart(12, "0");
  const bytes = Array.from(random.slice(0, 10));
  bytes[0] = (bytes[0] & 0x0f) | 0x70; // version 7
  bytes[2] = (bytes[2] & 0x3f) | 0x80; // RFC 9562 variant
  const tail = bytes.map(hex).join("");
  return `${time.slice(0, 8)}-${time.slice(8)}-${tail.slice(0, 4)}-${tail.slice(4, 8)}-${tail.slice(8)}`;
}
