import { useState, useCallback } from "react";
import { ImageModalState, ImageModalContext } from "@/types";

export function useImageModalState() {
  const [state, setState] = useState<ImageModalState>("favorites");

  const switchToFavorites = useCallback(() => {
    setState("favorites");
  }, []);

  const switchToDiscover = useCallback(() => {
    setState("discover");
  }, []);

  const context: ImageModalContext = {
    state,
  };

  return {
    context,
    actions: {
      switchToFavorites,
      switchToDiscover,
    },
  };
}
