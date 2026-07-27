// Single-page owner dashboard. No build step, no framework — plain HTML + fetch.
// The owner token is entered in the browser and kept in localStorage; it is sent
// as a Bearer header to the /admin/* routes. It is a SEPARATE secret from the
// agent API key: the agent can never approve its own payments.

export const dashboardHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Guardrail Wallet</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@600;700;800&display=swap');
  :root { --ink:#172019; --paper:#f3efdf; --acid:#c9ff45; --ember:#f0643b; --white:#fffdf5; }
  body { font: 13px/1.55 'DM Mono', monospace; margin: 0; background: var(--paper); color: var(--ink); }
  header { margin:14px; padding: 16px 20px; border: 2px solid var(--ink); background:var(--white); box-shadow:6px 6px 0 var(--ink); display: flex; gap: 12px; align-items: center; }
  header h1 { font:800 18px 'Syne',sans-serif; margin: 0; margin-right:auto; }
  .sub { color: #6f746b; font-size: 11px; }
  main { padding: 42px 20px; max-width: 1100px; margin: 0 auto; }
  input { background: var(--paper); border: 1.5px solid var(--ink); color: var(--ink); padding: 9px 11px; font: inherit; }
  button { font:700 12px 'Syne',sans-serif; border: 1.5px solid var(--ink); padding: 9px 14px; cursor: pointer; }
  .approve { background: var(--acid); color: var(--ink); }
  .reject { background: var(--ember); color: #fff; }
  .gear { background: var(--ink); color: #fff; }
  table { width: 100%; border-collapse: collapse; margin-top: 28px; background:var(--white); border:2px solid var(--ink); box-shadow:8px 8px 0 var(--ink); }
  th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid #1c232c; font-size: 14px; vertical-align: top; }
  th { color: var(--ink); font:700 10px 'Syne',sans-serif; text-transform:uppercase; background:#e4dfd0; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; }
  .executed { background: var(--acid); color: var(--ink); }
  .pending_approval { background: #ffe483; color: var(--ink); }
  .rejected, .failed { background: var(--ember); color: white; }
  .new { color: var(--ember); font-size: 12px; }
  .mono { font-family: ui-monospace, monospace; font-size: 12px; color: #9aa6b2; }
  .empty { color: #6f746b; padding: 60px 0; text-align: center; }
  .row-actions { display: flex; gap: 8px; }
</style>
</head>
<body>
<header>
  <h1>GUARDRAIL / PAYMENT CONSOLE</h1>
  <span class="sub" id="status">connecting…</span>
  <span style="flex:1"></span>
  <input id="token" type="password" placeholder="owner token" style="width:180px" />
  <button class="gear" onclick="saveToken()">Save</button>
</header>
<main>
  <div id="list"><div class="empty">Enter the owner token to load the decision ledger.<br>Shared demo token: <b>guardrail-demo-owner</b></div></div>
</main>
<script>
  const $ = (id) => document.getElementById(id);
  let token = localStorage.getItem('gw_token') || '';
  $('token').value = token;

  function saveToken() {
    token = $('token').value.trim();
    localStorage.setItem('gw_token', token);
    load();
  }
  function h(s){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

  async function api(path, opts={}) {
    return fetch(path, { ...opts, headers: { 'authorization': 'Bearer ' + token, 'content-type': 'application/json', ...(opts.headers||{}) } });
  }
  async function decide(id, approve) {
    const r = await api('/admin/payments/' + id + '/' + (approve ? 'approve' : 'reject'), { method: 'POST' });
    if (!r.ok) alert('Action failed: ' + r.status);
    load();
  }

  function render(rows) {
    if (!rows.length) { $('list').innerHTML = '<div class="empty">No payments yet.</div>'; return; }
    const body = rows.map(p => {
      const isNew = p.recipient_known === false;
      const actions = p.status === 'pending_approval'
        ? '<div class="row-actions"><button class="approve" onclick="decide(\\'' + p.payment_id + '\\',true)">Approve</button>'
          + '<button class="reject" onclick="decide(\\'' + p.payment_id + '\\',false)">Reject</button></div>'
        : '';
      const purchaseSummary = p.purchase
        ? '<div class="mono">' + h(p.purchase.order_id || p.purchase.checkout_id || p.purchase.cart_id || '') + '</div>'
          + h(p.purchase.item_count) + ' items'
        : '<span class="sub">—</span>';
      return '<tr>'
        + '<td><b>' + h(p.amount.value) + '</b> ' + h(p.amount.currency) + '</td>'
        + '<td><div class="mono">' + h(p.recipient) + '</div>'
          + (p.category ? h(p.category) : '<span class="sub">—</span>')
          + (isNew ? ' <span class="new">NEW</span>' : '') + '</td>'
        + '<td>' + purchaseSummary + '</td>'
        + '<td><span class="badge ' + p.status + '">' + p.status.replace('_',' ') + '</span></td>'
        + '<td class="sub">' + h(p.reason || '') + '</td>'
        + '<td>' + actions + '</td>'
        + '</tr>';
    }).join('');
    $('list').innerHTML = '<table><thead><tr><th>Amount</th><th>Recipient</th><th>Purchase</th><th>Status</th><th>Reason</th><th></th></tr></thead><tbody>' + body + '</tbody></table>';
  }

  async function load() {
    if (!token) return;
    try {
      const r = await api('/admin/payments');
      if (r.status === 401) { $('status').textContent = 'bad token'; return; }
      const data = await r.json();
      $('status').textContent = 'connected · ' + data.payments.length + ' payments';
      render(data.payments);
    } catch (e) { $('status').textContent = 'offline'; }
  }

  load();
  setInterval(load, 4000); // live-ish refresh so new approvals appear
</script>
</body>
</html>`;
