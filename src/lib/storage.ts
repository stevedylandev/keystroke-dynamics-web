import type { Profile } from './types';

const STORAGE_KEY = 'kd_profiles';

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p: any) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        Array.isArray(p.aggregations),
    );
  } catch {
    return [];
  }
}

export function saveProfile(profile: Profile): void {
  const profiles = loadProfiles();
  profiles.push(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function deleteProfile(id: string): void {
  const profiles = loadProfiles().filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function exportProfile(profile: Profile): void {
  const json = JSON.stringify(profile, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${profile.name.replace(/[^a-z0-9_-]/gi, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProfile(file: File): Promise<Profile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const profile = JSON.parse(reader.result as string);
        if (
          !profile ||
          typeof profile.name !== 'string' ||
          !Array.isArray(profile.aggregations)
        ) {
          reject(new Error('Invalid profile format'));
          return;
        }
        // Assign a new ID to avoid collisions
        profile.id = crypto.randomUUID();
        resolve(profile as Profile);
      } catch {
        reject(new Error('Failed to parse profile JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
