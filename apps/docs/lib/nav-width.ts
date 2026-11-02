/** Width limits for the pinned left navigation, shared by the component pages and the docs pages. */
export const navWidth = { min: 220, max: 420, initial: 264, step: 16 } as const;
export const navWidthStorageKey = 'unseen-ui-nav-width';

/** Runs before first paint, so a remembered width never makes the page jump. */
export const navWidthScript = `(function(){try{if(/[?&]frame=1(&|$)/.test(location.search))document.documentElement.setAttribute('data-frame','')}catch(e){}try{var w=+localStorage.getItem(${JSON.stringify(navWidthStorageKey)});if(w>=${navWidth.min}&&w<=${navWidth.max})document.documentElement.style.setProperty('--docs-nav-width',w+'px')}catch(e){}})();`;
