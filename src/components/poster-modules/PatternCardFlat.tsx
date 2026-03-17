import type { PosterModuleProps } from "../../lib/poster-modules";
import { PatternCardPoster } from "./PatternCardPoster";

export default function PatternCardFlat(props: PosterModuleProps) {
  return <PatternCardPoster {...props} cardStyle="flat" />;
}
