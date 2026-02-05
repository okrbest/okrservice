import React from "react";

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = React.useState(
    () =>
      (typeof window !== "undefined" && window.matchMedia(query).matches) ||
      false
  );

  React.useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [query]);

  return matches;
};

export const useIsMobile = (): boolean =>
  useMediaQuery("(max-width: 768px)");
