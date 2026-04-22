import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export function hashParticipantPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (error, key) => {
        if (error) reject(error);
        else resolve(`${salt}:${(key as Buffer).toString("hex")}`);
      }
    );
  });
}

export function verifyParticipantPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    const [salt, keyHex] = storedHash.split(":");
    if (!salt || !keyHex) {
      resolve(false);
      return;
    }

    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (error, key) => {
        if (error) {
          resolve(false);
          return;
        }

        const stored = Buffer.from(keyHex, "hex");
        const candidate = key as Buffer;
        resolve(stored.length === candidate.length && timingSafeEqual(stored, candidate));
      }
    );
  });
}
