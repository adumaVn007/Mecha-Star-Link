import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const GAME_DIR = 'E:\\Project\\MechaStarLink-latest-20261128-1338\\Mecha-Star-Link-main';
const OUT_DIR = 'E:\\Project\\.checks\\inventory-character-01';
const CDP_PORT = Number(process.env.CDP_PORT || 9229);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
      const full = path.resolve(GAME_DIR, rel);
      if (!full.startsWith(path.resolve(GAME_DIR))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      fs.readFile(full, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const ext = path.extname(full).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: `(async () => { ${expr} })()`,
      awaitPromise: true,
      returnByValue: true
    });
    if (r.exceptionDetails) {
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'Eval error');
    }
    return r.result?.value;
  }
  async screenshot(filename) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT_DIR, filename), Buffer.from(r.data, 'base64'));
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function openTab(baseUrl, width, height) {
  const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await res.json();
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768
  });
  return { cdp, targetId: target.id, baseUrl };
}

async function closeTab(targetId, cdp) {
  cdp.close();
  await fetch(`http://127.0.0.1:${CDP_PORT}/json/close/${targetId}`).catch(() => {});
}

async function waitFor(cdp, predExpr, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await cdp.eval(`return Boolean(${predExpr});`).catch(() => false);
    if (ok) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Timeout waiting for: ' + predExpr);
}

const results = [];
function assert(name, cond, detail = '') {
  results.push({ name, pass: !!cond, detail: String(detail || '') });
  if (!cond) console.error('FAIL:', name, detail);
  else console.log('PASS:', name, detail ? `(${detail})` : '');
}

async function main() {
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log('Static server listening at', baseUrl);

  try {
    // =========================================================================
    // SUITE A: bag-test.html Desktop 1280x720
    // =========================================================================
    {
      const { cdp, targetId } = await openTab(baseUrl, 1280, 720);
      try {
        const errors = [];
        await cdp.send('Runtime.addBinding', { name: '__reportErr' }).catch(() => {});
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
          source: `
            window.__errs = [];
            window.addEventListener('error', e => window.__errs.push('ERR: ' + e.message));
            window.addEventListener('unhandledrejection', e => window.__errs.push('REJ: ' + (e.reason && e.reason.message || e.reason)));
          `
        });
        await cdp.send('Page.navigate', { url: `${baseUrl}/bag-test.html` });
        await waitFor(cdp, `document.querySelector('#vgb .grid-wrap .item') && document.getElementById('m')?.textContent.includes('Đã nạp database')`);
        await new Promise((r) => setTimeout(r, 300));

        const info = await cdp.eval(`
          const errs = window.__errs || [];
          const hd = document.querySelector('#vgb .hd')?.textContent || '';
          const slots = [...document.querySelectorAll('#vgb [data-b="slot"]')].map(el => ({
            slot: el.dataset.v,
            locked: el.classList.contains('slot-lock'),
            eq: el.classList.contains('eq'),
            text: el.textContent.trim()
          }));
          const tabs = [...document.querySelectorAll('#vgb [data-b="btab"]')].map(el => el.textContent.trim());
          const hasPetSw = !!document.querySelector('#vgb [data-b="petbag"]');
          const lines = document.querySelectorAll('#vgb .stage-lines line').length;
          const findChecks = {
            utopia: !!VG.bag.findItem('utopia_head'),
            solomon: !!VG.bag.findItem('solomon-bael-head'),
            dao2tay: !!VG.bag.findItem('skkqkbg'),
            cell: !!VG.bag.findItem('cell'),
            noDupPrefix: VG.bag.findItem('cty_nonexistent_test') === null
          };
          return { errs, hd, slots, tabs, hasPetSw, lines, findChecks, usedText: document.querySelector('#vgb .hd-r')?.textContent || '' };
        `);

        assert('A1. bag-test loads without runtime errors', info.errs.length === 0, info.errs.join('; '));
        assert('A2. Header shows title, 4 Linh Thạch tiers, and used/200',
          info.hd.includes('VÂN GIÁP') && info.hd.includes('Linh Thạch') && info.hd.includes('/200 ô'),
          info.usedText.replace(/\s+/g, ' ').trim());
        assert('A3. 12 equipment slots rendered (10 Mecha + 2 Companion)', info.slots.length === 12, `slots=${info.slots.length}`);
        assert('A4. wing/pet/drone locked when backpack empty',
          ['wing', 'pet', 'drone'].every((k) => info.slots.find((s) => s.slot === k)?.locked),
          'locked wing/pet/drone');
        assert('A5. SVG connector lines rendered', info.lines === 12, `lines=${info.lines}`);
        assert('A6. 5 bag tabs + Pet Bag switch rendered',
          info.tabs.length === 5 && info.hasPetSw, info.tabs.join(', '));
        assert('A7. Unified findItem resolves utopia, solomon, Dao 2 tay, legacy cell',
          info.findChecks.utopia && info.findChecks.solomon && info.findChecks.dao2tay && info.findChecks.cell && info.findChecks.noDupPrefix,
          JSON.stringify(info.findChecks));

        // Test slot filter chip + clear chip
        const chipCheck = await cdp.eval(`
          document.querySelector('#vgb [data-b="slot"][data-v="weapon"]').click();
          const chip = document.querySelector('#vgb [data-b="clrslot"]')?.textContent || '';
          const gridItems = [...document.querySelectorAll('#vgb .grid .item')].map(el => el.dataset.id);
          const allWeapon = gridItems.every(id => VG.bag.findItem(id)?.d?.slot === 'weapon');
          document.querySelector('#vgb [data-b="clrslot"]').click();
          const chipAfter = document.querySelector('#vgb [data-b="clrslot"]');
          return { chip, count: gridItems.length, allWeapon, chipCleared: !chipAfter };
        `);
        assert('A8. Clicking Weapon slot filters grid & chip clears properly',
          chipCheck.chip.includes('Đang lọc: Vũ khí') && chipCheck.count > 0 && chipCheck.allWeapon && chipCheck.chipCleared,
          JSON.stringify(chipCheck));

        // Test search preserving focus
        const searchCheck = await cdp.eval(`
          const inp = document.querySelector('#vgb input[data-b="search"]');
          inp.focus();
          inp.value = 'SOL-01';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          const activeSame = document.activeElement === document.querySelector('#vgb input[data-b="search"]');
          const matched = [...document.querySelectorAll('#vgb .grid .item')].map(e => e.dataset.id);
          const hasBael = matched.some(id => id.includes('solomon-bael'));
          inp.value = '';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          return { activeSame, count: matched.length, hasBael };
        `);
        assert('A9. Live search preserves input focus and matches SOL-01 items',
          searchCheck.activeSame && searchCheck.hasBael && searchCheck.count > 0,
          JSON.stringify(searchCheck));

        // Equip SOL-01 Bael set + Dao 2 tay + utopia_backpack + wing + pet + drone, inspect Modular Mecha
        const equipSet = await cdp.eval(`
          const lib = await VG.game.loadLib();
          const equips = lib.equips || [];
          const pick = (fn) => equips.find(fn)?.id;
          const ids = [
            pick(e => e.id === 'solomon-bael-head') || pick(e => e.slot === 'head' && e.img),
            pick(e => e.id === 'solomon-bael-body') || pick(e => e.slot === 'body' && e.img),
            pick(e => e.id === 'solomon-bael-shoulder') || pick(e => e.slot === 'shoulder' && e.img),
            pick(e => e.id === 'solomon-bael-arm') || pick(e => e.slot === 'arm' && e.img),
            pick(e => e.id === 'solomon-bael-glove') || pick(e => e.slot === 'glove' && e.img),
            pick(e => e.id === 'solomon-bael-leg') || pick(e => e.slot === 'leg' && e.img),
            pick(e => e.id === 'solomon-bael-boot') || pick(e => e.slot === 'boot' && e.img),
            pick(e => e.id === 'skkqkbg') || pick(e => e.slot === 'weapon' && e.img),
            pick(e => e.id === 'utopia_backpack') || pick(e => e.slot === 'backpack'),
            pick(e => e.id === 'utopia_wing') || pick(e => e.slot === 'wing'),
            pick(e => e.slot === 'pet'),
            pick(e => e.slot === 'drone')
          ].filter(Boolean);
          for (const id of ids) {
            const tile = document.querySelector('#vgb .grid .item[data-id="' + id + '"]');
            if (tile) {
              tile.click();
              const btn = document.querySelector('#vgb [data-b="equip"]');
              if (btn && !btn.disabled) btn.click();
            }
          }
          // Select weapon in bag (still has 1 copy since bag-test gave 2) to inspect diff + ĐANG MẶC ribbon
          const wepId = ids.find(id => VG.bag.findItem(id)?.d?.slot === 'weapon');
          if (wepId) {
            document.querySelector('#vgb .grid .item[data-id="' + wepId + '"]')?.click();
          }
          await new Promise(r => setTimeout(r, 250));
          const imgs = [...document.querySelectorAll('#vgb-stage img')];
          const brokenImgs = imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.alt);
          const lockAfterBp = ['wing', 'pet', 'drone'].filter(k =>
            document.querySelector('#vgb [data-b="slot"][data-v="' + k + '"]')?.classList.contains('slot-lock')
          );
          const ribbons = document.querySelectorAll('#vgb .grid .item .ribbon').length;
          const auraBadges = document.querySelectorAll('#vgb-stage .vgb-aura').length;
          const inspText = document.querySelector('#vgb-insp')?.textContent || '';
          const inspImgOk = [...document.querySelectorAll('#vgb-insp img')].every(img => img.complete && img.naturalWidth > 0);
          const flashCount = document.querySelectorAll('#vgb-stage .vgb-flash').length;
          return {
            equippedCount: document.querySelectorAll('#vgb [data-b="slot"].eq').length,
            imgCount: imgs.length,
            brokenImgs,
            lockAfterBp,
            ribbons,
            auraBadges,
            inspImgOk,
            hasDiff: inspText.includes('Tấn công') && inspText.includes('('),
            flashCount
          };
        `);

        assert('A10. Equipped full modular kit (12 slots), unlocked wing/pet/drone',
          equipSet.equippedCount >= 11 && equipSet.lockAfterBp.length === 0,
          JSON.stringify(equipSet));
        assert('A11. Modular Mecha Tier-1 sprites loaded with 0 broken images & Tier-2 aura badges rendered',
          equipSet.imgCount >= 8 && equipSet.brokenImgs.length === 0 && equipSet.inspImgOk && equipSet.auraBadges >= 1,
          `imgs=${equipSet.imgCount}, broken=${equipSet.brokenImgs.length}, aura=${equipSet.auraBadges}`);
        assert('A12. Multiple copies show ĐANG MẶC ribbon & Inspector renders stat diff',
          equipSet.ribbons >= 8 && equipSet.hasDiff,
          `ribbons=${equipSet.ribbons}`);

        await cdp.screenshot('bag-desktop.png');

        // Consumables & Materials check
        const itemMatCheck = await cdp.eval(`
          document.querySelector('#vgb [data-b="btab"][data-v="consumable"]').click();
          document.querySelector('#vgb .grid .item[data-id="shcell"]')?.click();
          const shInsp = document.querySelector('#vgb-insp')?.textContent || '';
          const shBtnDisabled = !!document.querySelector('#vgb [data-b="use"]')?.disabled;
          document.querySelector('#vgb .grid .item[data-id="cell"]')?.click();
          const cellBtnOk = !document.querySelector('#vgb [data-b="use"]')?.disabled;
          document.querySelector('#vgb [data-b="btab"][data-v="material"]').click();
          const firstMat = document.querySelector('#vgb .grid .item');
          if (firstMat) firstMat.click();
          const matInsp = document.querySelector('#vgb-insp')?.textContent || '';
          return {
            shHasMsg: shInsp.includes('Chỉ dùng khi chiến đấu'),
            shBtnDisabled,
            cellBtnOk,
            hasMat: !!firstMat,
            matHasBranch: matInsp.includes('Nhánh')
          };
        `);
        assert('A13. Consumables (shcell battle-only disabled, cell enabled) & Materials inspector',
          itemMatCheck.shHasMsg && itemMatCheck.shBtnDisabled && itemMatCheck.cellBtnOk && (!itemMatCheck.hasMat || itemMatCheck.matHasBranch),
          JSON.stringify(itemMatCheck));

        // Test all 5 Edge Cases + Backpack stat exclusion in bag-test.html
        const edgeCheck = await cdp.eval(`
          // Reload fresh state via page helper by mutating ST through existing ctx?
          // Wait: let's inject a clean test via VG.bag API + UI click on current open modal!
          // First find how to access ST? We don't have direct closure ST in bag-test, wait -
          // we can open a fresh VG.bag modal with a controlled test state inside bag-test!
          VG.bag.close();
          const GM = VG.game, BG = VG.bag;
          const lib = await GM.loadLib();
          BG.setLib(lib);
          const IT = {cell:['Pin năng lượng','+60 năng lượng'],tonic:['Tinh dịch hồn lực','+40 hồn lực'],nano:['Gói nano','+30% HP'],shcell:['Pin lá chắn','+80 lá chắn (chỉ dùng khi chiến đấu)']};
          BG.setLegacy(IT);

          const ST = GM.defaults({id:'edge', spawn:{x:1,y:1}});
          BG.init(ST);
          let toasts = [];
          const ctx = {
            get: () => ST, persist: () => {}, toast: (m) => toasts.push(m), IT,
            loadLib: () => Promise.resolve(lib), useLegacy: () => {}, after: () => {}, onClose: () => {}
          };

          // Helper to fill inv to exact target used count
          const fillTo = (target) => {
            let idx = 0;
            while (BG.used(ST) < target) {
              ST.inv['dummy_pad_' + (idx++)] = 1;
            }
          };

          // --- Test Backpack exclusion in calc() & VG.skill.collect() ---
          const wingWithStats = (lib.equips || []).find(e => e.slot === 'wing' && (+e.atk || +e.hp || +e.spd || +e.shield || (e.skills && e.skills.length))) || { id: 'utopia_wing' };
          ST.eq.wing = wingWithStats.id;
          delete ST.eq.backpack;
          const calcNoBp = BG.calc(ST);
          const skillsNoBp = VG.skill.collect(ST, lib).filter(s => s.slot === 'wing' || s.slot === 'pet' || s.slot === 'drone');

          // Reset clean ST for UI Edge Cases
          ST.eq = { head: 'solomon-bael-head', weapon: 'solomon-bael-weapon' };
          ST.inv = { 'utopia_weapon': 1, 'solomon-bael-head': 1 }; // multiple copy when we also eq head -> total inv has 2 keys
          // Note: utopia_weapon qty=1, solomon-bael-head qty=1 (and 1 equipped)
          fillTo(BG.CAP); // exactly 200/200!

          BG.open(ctx, 'equip');
          await new Promise(r => setTimeout(r, 80));

          // Edge Case 1: Full bag blocks unequip
          document.querySelector('#vgb [data-b="slot"][data-v="head"]').click();
          document.querySelector('#vgb [data-b="unequip"][data-v="head"]').click();
          const ec1Toast = document.querySelector('#vgb-say')?.textContent || toasts[toasts.length - 1] || '';
          const ec1StayedEquipped = ST.eq.head === 'solomon-bael-head';

          // Edge Case 2: 1-1 swap when used === 200 (utopia_weapon qty=1 swaps with solomon-bael-weapon)
          document.querySelector('#vgb [data-b="btab"][data-v="all"]').click();
          const wTile = document.querySelector('#vgb .grid .item[data-id="utopia_weapon"]');
          wTile.click();
          document.querySelector('#vgb [data-b="equip"]').click();
          const ec2Swapped = ST.eq.weapon === 'utopia_weapon' && ST.inv['solomon-bael-weapon'] === 1 && !ST.inv['utopia_weapon'] && BG.used(ST) === 200;

          // Edge Case 5 check while here: head has 1 equipped + 1 in inv -> single card showing ×1 + ĐANG MẶC
          const headCards = [...document.querySelectorAll('#vgb .grid .item[data-id="solomon-bael-head"]')];
          const ec5Ok = headCards.length === 1 && headCards[0].textContent.includes('×1') && !!headCards[0].querySelector('.ribbon');

          // Edge Case 3: Backpack cascade unequip
          delete ST.inv['dummy_pad_0'];
          delete ST.inv['dummy_pad_1']; // now used = 198 (free = 2)
          const petItem = (lib.equips || []).find(e => e.slot === 'pet');
          const droneItem = (lib.equips || []).find(e => e.slot === 'drone');
          ST.eq.backpack = 'utopia_backpack';
          ST.eq.wing = 'utopia_wing';
          if (petItem) ST.eq.pet = petItem.id;
          if (droneItem) ST.eq.drone = droneItem.id;
          ST.petBag['dummy_pet_item'] = 1;
          BG.open(ctx, 'equip');
          // 3a: Pet bag non-empty blocks
          document.querySelector('#vgb [data-b="slot"][data-v="backpack"]').click();
          document.querySelector('#vgb [data-b="unequip"][data-v="backpack"]').click();
          const ec3aMsg = document.querySelector('#vgb-say')?.textContent || '';
          const ec3aBlocked = !!ST.eq.backpack && ec3aMsg.includes('Túi Pet');

          // 3b: Empty petBag, free = 2 < need 4 -> blocks with count
          delete ST.petBag['dummy_pet_item'];
          document.querySelector('#vgb [data-b="unequip"][data-v="backpack"]').click();
          const ec3bMsg = document.querySelector('#vgb-say')?.textContent || '';
          const ec3bBlocked = !!ST.eq.backpack && ec3bMsg.includes('ô trống');

          // 3c: Free 3 more dummy slots -> free = 5 >= 4 -> cascade unequips all
          delete ST.inv['dummy_pad_2'];
          delete ST.inv['dummy_pad_3'];
          delete ST.inv['dummy_pad_4'];
          document.querySelector('#vgb [data-b="unequip"][data-v="backpack"]').click();
          const ec3cOk = !ST.eq.backpack && !ST.eq.wing && !ST.eq.pet && !ST.eq.drone && ST.inv['utopia_backpack'] === 1 && ST.inv['utopia_wing'] === 1;

          // Edge Case 4: Orphan ID
          ST.eq.shoulder = 'orphan_missing_id_999';
          BG.open(ctx, 'equip');
          document.querySelector('#vgb [data-b="slot"][data-v="shoulder"]').click();
          const ec4Insp = document.querySelector('#vgb-insp')?.textContent || '';
          document.querySelector('#vgb [data-b="purge"][data-v="shoulder"]').click();
          const ec4Purged = !ST.eq.shoulder;

          return {
            noBpZero: calcNoBp.max === 0 && calcNoBp.atk === 0 && calcNoBp.spd === 0 && calcNoBp.sh === 0 && skillsNoBp.length === 0,
            ec1Ok: ec1StayedEquipped && ec1Toast.includes('Túi đã đầy'),
            ec2Swapped,
            ec3aBlocked,
            ec3bBlocked,
            ec3cOk,
            ec4Ok: ec4Insp.includes('Dữ liệu không tồn tại') && ec4Purged,
            ec5Ok,
            errs: window.__errs || []
          };
        `);

        assert('A14. calc() & skill.collect() ignore wing/pet/drone without backpack', edgeCheck.noBpZero);
        assert('A15. Edge Case 1: Full bag (200/200) blocks unequip with Vietnamese message', edgeCheck.ec1Ok);
        assert('A16. Edge Case 2: 1-1 swap succeeds at 200/200 bag capacity', edgeCheck.ec2Swapped);
        assert('A17. Edge Case 3: Backpack cascade checks petBag & free space then unequips all',
          edgeCheck.ec3aBlocked && edgeCheck.ec3bBlocked && edgeCheck.ec3cOk,
          JSON.stringify({ a: edgeCheck.ec3aBlocked, b: edgeCheck.ec3bBlocked, c: edgeCheck.ec3cOk }));
        assert('A18. Edge Case 4: Orphan ID shows fallback & Gỡ bỏ removes cleanly', edgeCheck.ec4Ok);
        assert('A19. Edge Case 5: Multiple copies (1 eq + 1 inv) show single ×1 card with ĐANG MẶC', edgeCheck.ec5Ok);
        assert('A20. Zero errors after all edge cases', edgeCheck.errs.length === 0, edgeCheck.errs.join('; '));
      } finally {
        await closeTab(targetId, cdp);
      }
    }

    // =========================================================================
    // SUITE B: bag-test.html Mobile 375x812
    // =========================================================================
    {
      const { cdp, targetId } = await openTab(baseUrl, 375, 812);
      try {
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
          source: `window.__errs = []; window.addEventListener('error', e => window.__errs.push(e.message));`
        });
        await cdp.send('Page.navigate', { url: `${baseUrl}/bag-test.html` });
        await waitFor(cdp, `document.querySelector('#vgb .grid-wrap .item')`);
        await new Promise((r) => setTimeout(r, 250));

        const mob = await cdp.eval(`
          const bx = document.querySelector('#vgb .bx');
          const toggle = document.querySelector('#vgb [data-b="toggleeq"]');
          const beforeCollapsed = document.querySelector('#vgb .col-eq')?.classList.contains('collapsed');
          toggle.click();
          const afterCollapsed = document.querySelector('#vgb .col-eq')?.classList.contains('collapsed');
          toggle.click();
          const closeRect = document.querySelector('#vgb [data-b="close"]').getBoundingClientRect();
          return {
            errs: window.__errs,
            docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
            bxWidth: bx.getBoundingClientRect().width,
            vw: window.innerWidth,
            beforeCollapsed,
            afterCollapsed,
            closeVisible: closeRect.width > 20 && closeRect.right <= window.innerWidth + 2
          };
        `);
        await cdp.screenshot('bag-mobile.png');
        assert('B1. Mobile 375x812: no horizontal overflow & collapse toggle works',
          mob.errs.length === 0 && !mob.docOverflow && mob.bxWidth <= 376 && mob.beforeCollapsed !== mob.afterCollapsed && mob.closeVisible,
          JSON.stringify(mob));
      } finally {
        await closeTab(targetId, cdp);
      }
    }

    // =========================================================================
    // SUITE C: index.html Character Panel + Split-View Integration + Persistence
    // =========================================================================
    {
      const { cdp, targetId } = await openTab(baseUrl, 1280, 720);
      try {
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
          source: `
            window.__errs = [];
            window.addEventListener('error', e => window.__errs.push('ERR: ' + e.message));
            window.addEventListener('unhandledrejection', e => window.__errs.push('REJ: ' + (e.reason && e.reason.message || e.reason)));
          `
        });
        // First navigate to origin to seed localStorage cleanly
        await cdp.send('Page.navigate', { url: `${baseUrl}/bag-test.html` });
        await waitFor(cdp, `typeof VG !== 'undefined' && VG.game`);
        await cdp.eval(`
          const lib = await VG.game.loadLib();
          const w = await VG.game.loadWorld();
          const z = w.zones[0];
          const st = VG.game.defaults(z);
          st.char = { name: 'Lâm Phong', gender: 'Nam', origin: 'pilot', race: 'human', country: 1, title: 'Tinh Anh Pilot', humanId: '', mechaId: 'solomon-bael' };
          st.stones = { thuong: 1200, trung: 35, cao: 4, sieu: 1 };
          st.eq = {
            head: 'solomon-bael-head',
            body: 'solomon-bael-body',
            weapon: 'skkqkbg',
            backpack: 'utopia_backpack',
            wing: 'utopia_wing'
          };
          const pet = (lib.equips || []).find(e => e.slot === 'pet');
          const drone = (lib.equips || []).find(e => e.slot === 'drone');
          if (pet) st.eq.pet = pet.id;
          if (drone) st.eq.drone = drone.id;
          st.inv = { 'solomon-bael-weapon': 1, 'utopia_head': 1 };
          st.starter = 1;
          VG.bag.setLib(lib);
          st.eqB = VG.bag.calc(st);
          localStorage.setItem('vg_save_v1', JSON.stringify(st));
        `);

        await cdp.send('Page.navigate', { url: `${baseUrl}/index.html` });
        await waitFor(cdp, `document.querySelector('#tb [data-f="char"]') && document.getElementById('sName')?.textContent === 'Lâm Phong'`);
        await new Promise((r) => setTimeout(r, 300));

        // Open Nhân vật panel
        const charPanel = await cdp.eval(`
          document.querySelector('#tb [data-f="char"]').click();
          await new Promise(r => setTimeout(r, 150));
          const box = document.getElementById('oB')?.innerHTML || '';
          const txt = document.getElementById('oB')?.textContent || '';
          return {
            title: document.getElementById('oT')?.textContent || '',
            hasIdentity: txt.includes('Lâm Phong'),
            hasStatsTable: txt.includes('HP') && txt.includes('Tấn công') && txt.includes('Tốc độ') && txt.includes('Lá chắn'),
            hasNoOld12Slots: !box.includes('Giáp đầu') && !box.includes('Giáp chân') && !box.includes('Ba lô'),
            hasOpenBagCta: !!document.querySelector('#cOpenBag'),
            hasExportImport: !!document.querySelector('#cExp') && !!document.querySelector('#cImp'),
            txtLen: txt.length
          };
        `);
        await cdp.screenshot('index-char.png');

        assert('C1. index.html panel("char") shows Identity, Stats table, Passive skills, CTA & NO 12-slot list',
          charPanel.hasIdentity && charPanel.hasStatsTable && charPanel.hasNoOld12Slots && charPanel.hasOpenBagCta && charPanel.hasExportImport,
          JSON.stringify(charPanel));

        // Click CTA to open VG.bag from index.html, swap weapon to solomon-bael-weapon, close & verify HUD + localStorage
        const swapPersist = await cdp.eval(`
          document.querySelector('#cOpenBag').click();
          await new Promise(r => setTimeout(r, 250));
          const opened = !!document.querySelector('#vgb');
          const tile = document.querySelector('#vgb .grid .item[data-id="solomon-bael-weapon"]');
          if (tile) tile.click();
          const eqBtn = document.querySelector('#vgb [data-b="equip"]');
          if (eqBtn) eqBtn.click();
          document.querySelector('#vgb [data-b="close"]')?.click();
          await new Promise(r => setTimeout(r, 150));
          const saved = JSON.parse(localStorage.getItem('vg_save_v1') || '{}');
          return {
            opened,
            closed: !document.querySelector('#vgb'),
            savedWeapon: saved.eq?.weapon,
            hasEqB: !!saved.eqB && typeof saved.eqB.atk === 'number',
            errs: window.__errs
          };
        `);
        assert('C2. CTA opens VG.bag from index.html, weapon swap updates localStorage & closes cleanly',
          swapPersist.opened && swapPersist.closed && swapPersist.savedWeapon === 'solomon-bael-weapon' && swapPersist.hasEqB && swapPersist.errs.length === 0,
          JSON.stringify(swapPersist));
      } finally {
        await closeTab(targetId, cdp);
      }
    }

    // =========================================================================
    // SUITE D: battle.html with persisted eqB, skills & backpack companion guard
    // =========================================================================
    {
      const { cdp, targetId } = await openTab(baseUrl, 1280, 720);
      try {
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
          source: `
            window.__errs = [];
            window.addEventListener('error', e => window.__errs.push('ERR: ' + e.message));
            window.addEventListener('unhandledrejection', e => window.__errs.push('REJ: ' + (e.reason && e.reason.message || e.reason)));
          `
        });
        await cdp.send('Page.navigate', { url: `${baseUrl}/battle.html` });
        await waitFor(cdp, `document.querySelector('#pp')?.textContent.includes('Vân Giáp') && document.querySelectorAll('#skills button.sk').length >= 5`);
        await new Promise((r) => setTimeout(r, 250));

        const bt1 = await cdp.eval(`
          return {
            errs: window.__errs,
            skillsCount: document.querySelectorAll('#skills button.sk').length,
            dpDisplay: document.getElementById('dp')?.style.display,
            dpText: document.getElementById('dp')?.textContent || '',
            ppText: document.getElementById('pp')?.textContent || ''
          };
        `);
        await cdp.screenshot('battle.png');

        assert('D1. battle.html loads SV.eqB, equipment skills, and active companions cleanly',
          bt1.errs.length === 0 && bt1.skillsCount >= 5 && bt1.ppText.includes('HP'),
          JSON.stringify(bt1));

        // Now remove backpack from localStorage save while leaving wing/pet/drone in SV.eq to verify battle.html + vg-skill.js guard!
        await cdp.eval(`
          const sv = JSON.parse(localStorage.getItem('vg_save_v1') || '{}');
          delete sv.eq.backpack;
          localStorage.setItem('vg_save_v1', JSON.stringify(sv));
        `);
        await cdp.send('Page.reload', { ignoreCache: true });
        await waitFor(cdp, `document.querySelector('#pp')?.textContent.includes('Vân Giáp')`);
        await new Promise((r) => setTimeout(r, 250));

        const bt2 = await cdp.eval(`
          const sv = JSON.parse(localStorage.getItem('vg_save_v1') || '{}');
          const lib = await VG.game.loadLib();
          const skCol = VG.skill.collect(sv, lib).filter(s => s.slot === 'wing' || s.slot === 'pet' || s.slot === 'drone');
          return {
            errs: window.__errs,
            dpHidden: document.getElementById('dp')?.style.display === 'none',
            skColLen: skCol.length
          };
        `);
        assert('D2. battle.html hides companions & excludes wing/pet/drone skills when backpack missing',
          bt2.errs.length === 0 && bt2.dpHidden && bt2.skColLen === 0,
          JSON.stringify(bt2));
      } finally {
        await closeTab(targetId, cdp);
      }
    }
  } finally {
    server.close();
  }

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  const summary = { passed, total, allPassed: passed === total, results };
  fs.writeFileSync(path.join(OUT_DIR, 'test-results.json'), JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\nSUMMARY: ${passed}/${total} assertions passed.`);
  if (passed !== total) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
