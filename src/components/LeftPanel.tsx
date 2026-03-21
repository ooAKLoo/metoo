import { CollectionTabs } from "./CollectionTabs";
import { AddPanel } from "./AddPanel";

export function LeftPanel() {
  return (
    <div className="w-1/2 max-w-[480px] min-w-[280px] flex flex-col px-4 pb-3 relative">
      <div className="flex-1 min-h-0 flex flex-col">
        <CollectionTabs />
      </div>
      <AddPanel />
    </div>
  );
}
