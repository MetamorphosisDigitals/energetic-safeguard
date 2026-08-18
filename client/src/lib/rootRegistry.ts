import type { Root } from "react-dom/client";

type RootHost = Window & { __energeticSafeguardRoot?: Root };

/**
 * Retains one React root across development hot-module reloads. The root remains
 * attached to the same #root container; later module evaluations call render on it.
 */
export function getManagedRoot(host: RootHost, create: () => Root) {
  if (!host.__energeticSafeguardRoot) host.__energeticSafeguardRoot = create();
  return host.__energeticSafeguardRoot;
}
