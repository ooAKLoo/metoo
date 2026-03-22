/**
 * Unified dev panel host for poster modules.
 *
 * Usage: drop <PosterDevPanelHost /> anywhere — it reads posterDebug &
 * activePosterModule from the store and renders the matching dev panel.
 *
 * To add a new module's dev panel:
 *   1. Create a self-contained panel component in this folder
 *   2. Add one entry to PANEL_REGISTRY below
 */
import type { ComponentType } from "react";
import { useMapStore } from "../../stores/useMapStore";
import { MujiDevPanel } from "./MujiDevPanel";
import { DiscoverDevPanel } from "./DiscoverDevPanel";

const PANEL_REGISTRY: Record<string, ComponentType> = {
  muji: MujiDevPanel,
  discover: DiscoverDevPanel,
};

export function PosterDevPanelHost() {
  const posterDebug = useMapStore((s) => s.posterDebug);
  const activePosterModule = useMapStore((s) => s.activePosterModule);

  if (!posterDebug || !activePosterModule) return null;

  const Panel = PANEL_REGISTRY[activePosterModule];
  if (!Panel) return null;

  return <Panel />;
}
