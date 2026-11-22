/** Runs before first paint: applies saved theme, density and rail state to <html>. */
export const APPEARANCE_KEYS = { theme: "artha-theme", density: "artha-density", rail: "artha-rail" } as const;
const KEYS = APPEARANCE_KEYS;

export const APPEARANCE_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage;var t=s.getItem("${KEYS.theme}")||"light";var m=t==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;d.dataset.theme=m;d.dataset.themePref=t;d.dataset.density=s.getItem("${KEYS.density}")||"comfortable";d.dataset.rail=s.getItem("${KEYS.rail}")||"open";}catch(e){}})();`;
