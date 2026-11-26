import { uuidv7 } from "@myfinancespace/core/ids";
import { getRandomBytes } from "expo-crypto";

/** An id for a record created on this phone (CONSTITUTION.md, Article 6). */
export function newId(): string {
  return uuidv7(Date.now(), getRandomBytes(10));
}
