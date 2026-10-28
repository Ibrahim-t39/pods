// The one event that opens the Director. Fired by the mark's 700 ms hold (MarkButton); the panel also opens on
// ?director=1 and Ctrl/Cmd + . (director-panel.tsx). Nothing in the UI hints that it exists.
export const DIRECTOR_EVENT = "pods:director";
