import { CanonicalCaseData } from './types';

let cachedCaseData: CanonicalCaseData | null = null;

export async function fetchCanonicalCaseData(): Promise<CanonicalCaseData> {
  if (cachedCaseData) {
    return cachedCaseData;
  }

  try {
    const res = await fetch('/data/canonical_case.json');
    if (res.ok) {
      const data: CanonicalCaseData = await res.json();
      cachedCaseData = data;
      return data;
    }
  } catch {
    // Continue to fallback endpoints
  }

  try {
    const apiRes = await fetch('/api/case');
    if (apiRes.ok) {
      const data: CanonicalCaseData = await apiRes.json();
      cachedCaseData = data;
      return data;
    }
  } catch {
    // Continue to relative fallback
  }

  try {
    const retryRes = await fetch('./data/canonical_case.json');
    if (retryRes.ok) {
      const data: CanonicalCaseData = await retryRes.json();
      cachedCaseData = data;
      return data;
    }
    throw new Error(`HTTP ${retryRes.status}: ${retryRes.statusText}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw new Error(`Failed to load case data: ${message}`);
  }
}
