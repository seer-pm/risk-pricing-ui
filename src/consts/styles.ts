/**
 * Keyboard focus treatment for the hand-rolled buttons (legend chips, category
 * filters, view toggles, tabs). The UA default outline is effectively invisible
 * against chips that set their own background colour inline, so every custom
 * control opts into this instead.
 */
export const FOCUS_RING = [
  "focus-visible:outline-none",
  "focus-visible:ring-2 focus-visible:ring-klerosUIComponentsPrimaryBlue",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-klerosUIComponentsLightBackground",
].join(" ");
