/** Starters in the shadcn registry at /r/, built by scripts/build-registry.mjs. */
export const registryOrigin = 'https://unseenui.com';
export const registryItemNames = ['chat', 'chat-ai-sdk', 'theme'] as const;
export type RegistryItemName = (typeof registryItemNames)[number];

/** Component pages that offer a registry starter, with the items to show. */
export const registryItemsFor: Record<string, readonly RegistryItemName[]> = {
  Chat: ['chat', 'chat-ai-sdk'],
};

export function registryCommand(item: RegistryItemName) {
  return `npx shadcn@latest add ${registryOrigin}/r/${item}.json`;
}
