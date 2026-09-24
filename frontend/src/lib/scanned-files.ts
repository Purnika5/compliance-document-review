/**
 * DOCU: Utilities for tracking and querying files that have undergone AI compliance scanning.
 * Synchronizes scanned status across Chatbot, Upload Modals, and Document Tables.
 * Last Updated Date: September 25, 2026
 * @author Keith
 */

const STORAGE_KEY = "springer_scanned_files";
const EVENT_NAME = "compliance-file-scanned";

export interface IScannedFileRecord {
  name: string;
  size?: number;
  timestamp: number;
}

/**
 * Normalizes a file or document name for comparison.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\.[^/.]+$/, "") // Remove extension
    .replace(/[_\-\s]+/g, " "); // Normalize separators
}

/**
 * Records a file as scanned by the Neural Copilot.
 */
export function markFileAsScanned(name: string, size?: number): void {
  if (typeof window === "undefined" || !name) return;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const records: IScannedFileRecord[] = raw ? JSON.parse(raw) : [];

    const existingIdx = records.findIndex(
      (r) => r.name.toLowerCase() === name.toLowerCase() || normalizeName(r.name) === normalizeName(name)
    );

    const updatedRecord: IScannedFileRecord = {
      name,
      size,
      timestamp: Date.now(),
    };

    if (existingIdx >= 0) {
      records[existingIdx] = updatedRecord;
    } else {
      records.unshift(updatedRecord);
    }

    // Keep last 100 scanned files
    if (records.length > 100) {
      records.length = 100;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { name, size } }));
  } catch (err) {
    console.warn("[ScannedFiles] Failed to write scanned file record:", err);
  }
}

/**
 * Checks if a file or document has already been scanned in the chatbot.
 */
export function isScannedFile(name?: string | null): boolean {
  if (typeof window === "undefined" || !name) return false;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    const records: IScannedFileRecord[] = JSON.parse(raw);
    const targetNorm = normalizeName(name);
    const targetLower = name.toLowerCase().trim();

    return records.some(
      (r) => r.name.toLowerCase().trim() === targetLower || normalizeName(r.name) === targetNorm
    );
  } catch {
    return false;
  }
}

/**
 * Retrieves all files recorded as scanned.
 */
export function getScannedFiles(): IScannedFileRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
