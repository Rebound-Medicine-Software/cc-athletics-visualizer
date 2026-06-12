import type { MovementModule } from './types';

const registry = new Map<string, MovementModule<any, any, any, any>>();

export function registerModule(mod: MovementModule<any, any, any, any>) {
  registry.set(mod.id, mod);
}

export function getModule(id: string): MovementModule<any, any, any, any> | undefined {
  return registry.get(id);
}

export function listModules(): MovementModule<any, any, any, any>[] {
  return Array.from(registry.values());
}
