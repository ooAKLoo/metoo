import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { TitleBar } from "./components/TitleBar";
import { LeftPanel } from "./components/LeftPanel";
import { RightPanel } from "./components/RightPanel";
import { useThemeStore } from "./stores/useThemeStore";

export default function App() {
  const initTheme = useThemeStore((s) => s.init);
  useEffect(() => { initTheme(); }, [initTheme]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        <TitleBar />
        <div className="flex-1 min-h-0 flex">
          <LeftPanel />
          <RightPanel />
        </div>
      </div>
    </MotionConfig>
  );
}
