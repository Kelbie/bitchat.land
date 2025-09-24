export type ImageModalState = 
  | "favorites"
  | "discover";

export interface ImageModalContext {
  state: ImageModalState;
}
