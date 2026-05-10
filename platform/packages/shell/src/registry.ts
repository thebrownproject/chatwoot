import type { ModuleManifest } from './types';

/**
 * In-memory module registry (singleton). Populated once at startup.
 * Safe for multi-process: each process registers the same static set of modules.
 * No Redis replacement needed -- this is configuration, not mutable runtime state.
 */
const modules = new Map<string, ModuleManifest>();

export function registerModule(manifest: ModuleManifest): void {
  const key = manifest.id ?? manifest.name;
  if (modules.has(key)) {
    console.warn(`Module "${key}" is already registered. Skipping.`);
    return;
  }
  modules.set(key, manifest);
}

export function getModule(id: string): ModuleManifest | undefined {
  return modules.get(id);
}

export function getAllModules(): ModuleManifest[] {
  return Array.from(modules.values());
}

export function getNavItems() {
  return getAllModules().flatMap((m) => m.navItems);
}

/** Reset the module registry. For testing only. */
export function clearModules(): void {
  modules.clear();
}
