import { useMemo } from "react";
import { getFoodDoodleSvg, hasFoodDoodle } from "../lib/food-doodles";

interface FoodDoodleIconProps {
  category: string;
  size?: number;
  color?: string;
  seed?: number;
  className?: string;
}

export function FoodDoodleIcon({
  category,
  size = 14,
  color,
  seed = 42,
  className,
}: FoodDoodleIconProps) {
  const svg = useMemo(() => getFoodDoodleSvg(category, seed), [category, seed]);

  if (!svg) return null;

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ color, overflow: "visible" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export { hasFoodDoodle };
