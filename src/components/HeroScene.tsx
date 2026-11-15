import { lazy, Suspense, useEffect, useState } from 'react';

// three.js + the scene (~250 KB gzipped) only download when the gate below says yes.
const Scene = lazy(() => import('./HeroScene3D'));

let webgl: boolean | undefined;
const hasWebGL = () => (webgl ??= !!document.createElement('canvas').getContext('webgl2'));

/** 3D only in the Studio look, on tablets and up, with motion allowed. Phones keep the static CSS orbs. */
const wanted = () =>
  document.documentElement.dataset.look === 'studio' &&
  window.matchMedia('(min-width: 768px)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  hasWebGL();

export default function HeroScene() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const check = () => setOn(wanted());
    const idle: (cb: () => void) => void = (window as any).requestIdleCallback ?? ((cb) => setTimeout(cb, 300));
    idle(check); // let the page paint first
    const looks = new MutationObserver(check);
    looks.observe(document.documentElement, { attributes: true, attributeFilter: ['data-look'] });
    const wide = window.matchMedia('(min-width: 768px)');
    wide.addEventListener('change', check);
    return () => { looks.disconnect(); wide.removeEventListener('change', check); };
  }, []);
  if (!on) return null;
  return (
    <Suspense fallback={null}>
      <Scene />
    </Suspense>
  );
}
