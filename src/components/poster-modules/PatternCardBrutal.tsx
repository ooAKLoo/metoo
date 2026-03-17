import type { PosterModuleProps } from "../../lib/poster-modules";
import { PatternCardPoster } from "./PatternCardPoster";

export default function PatternCardBrutal(props: PosterModuleProps) {
  return <PatternCardPoster {...props} cardStyle="brutalism" />;
}
