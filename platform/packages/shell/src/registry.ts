import type { ModuleManifest } from './types';

const modules = new Map<string, ModuleManifest>();

export function registerModule(manifest: ModuleManifest): void {
  if (modules.has(manifest.id)) {
    console.warn(`Module "${manifest.id}" is already registered. Skipping.`);
    return;
  }
  modules.set(manifest.id, manifest);
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
