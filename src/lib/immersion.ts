export function setImmersive(active: boolean) {
  const root = document.documentElement;
  if ((root.dataset.immersive === 'true') === active) return;
  root.dataset.immersive = String(active);
  document.dispatchEvent(new Event('folio:immersion'));
}
