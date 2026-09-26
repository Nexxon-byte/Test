// TIEFER – Einstieg

const params = new URLSearchParams(location.search);

if (params.has('sandbox')) {
  import('./dev/sandbox.js').then(m => m.runSandbox());
} else {
  import('./app.js').then(m => m.boot()).catch((e) => {
    console.error(e);
    document.getElementById('ui').innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e9dcc2;font:20px monospace;text-align:center;padding:40px">Kabine 9 hat eine Störung.<br><br>${String(e && e.message || e)}</div>`;
  });
}
