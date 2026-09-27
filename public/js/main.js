// TIEFER – Einstieg

const params = new URLSearchParams(location.search);

// Prüfwerkzeug (?placecheck): sehr früh setzen, bevor geo.js/app.js/sandbox.js laufen.
if (params.has('placecheck')) {
  globalThis.__placeDebug = true;
  import('./dev/placecheck.js').then(({ placeCheck }) => {
    window.__placeCheck = () => {
      const world = window.__tiefer?.game?.world || window.__sb?.level;
      if (!world) { console.warn('Platzierungsprüfung: keine Welt geladen (Hub/Level fehlt).'); return null; }
      const builder = world._debugBuilder || world.builder;
      const builderBoxes = builder?.debugBoxes || [];
      return placeCheck(world.group, { builderBoxes });
    };
  });
}

if (params.has('viewer')) {
  import('./dev/viewer.js').then(m => m.runViewer(params));
} else if (params.has('sandbox')) {
  import('./dev/sandbox.js').then(m => m.runSandbox());
} else {
  // Schnellstart (?skip) oder „Zum Titel“: Ladebildschirm sofort – noch bevor das Spiel (three.js …) geladen ist
  let quick = params.has('skip');
  try { quick ||= sessionStorage.getItem('tiefer.toTitle') === '1'; } catch { /* privat */ }
  const pre = quick ? import('./ui/loading.js').then(({ loading }) => { loading.show({ kind: 'boot' }); }).catch(e => console.warn('Ladebildschirm fehlt', e)) : Promise.resolve();
  pre.then(() => import('./app.js')).then(m => m.boot()).catch((e) => {
    console.error(e);
    import('./ui/loading.js').then(({ loading }) => loading.hide({ fade: 200 })).catch(() => {});
    document.getElementById('ui').innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e9dcc2;font:20px monospace;text-align:center;padding:40px">Kabine 9 hat eine Störung.<br><br>${String(e && e.message || e)}</div>`;
  });
}
