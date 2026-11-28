/* vg-github.js — hàm liên kết GitHub cho Vân Giáp.
   - Đọc: tải JSON công khai từ raw.githubusercontent.com (không cần token).
   - Ghi: GitHub Contents API, cần token do người dùng tự nhập (chỉ lưu sessionStorage, KHÔNG ghi vào code/repo).
   - Chỉ ghi được các đường dẫn trong VG.cfg.writable (mặc định KHÔNG gồm mecha-studio.json để không ghi đè dữ liệu gốc). */
(function (g) {
  var VG = g.VG = g.VG || {};
  VG.cfg = {
    owner: 'adumavn007', repo: 'Mecha-Star-Link', branch: 'main',
    paths: { db: 'database/mecha-studio.json', formula: 'database/stat-formula.json', jobs: 'database/jobs.json', monsters: 'database/monsters.json', quests: 'database/quests.json', npc: 'database/npc.json', blueprints: 'database/blueprints.json', combat: 'database/combat-ui.json', skills: 'database/skills.json', elements: 'database/elements.json', equipElem: 'database/equip-elements.json' },
    writable: ['database/stat-formula.json', 'database/jobs.json', 'database/monsters.json', 'database/quests.json', 'database/npc.json', 'database/blueprints.json', 'database/combat-ui.json', 'database/skills.json', 'database/elements.json', 'database/equip-elements.json']
  };
  VG.rawUrl = function (p) { var c = VG.cfg; return 'https://raw.githubusercontent.com/' + c.owner + '/' + c.repo + '/' + c.branch + '/' + p; };
  VG.fetchJSON = function (path, ms) {
    var ac = typeof AbortController != 'undefined' ? new AbortController() : null;
    var t = ac && setTimeout(function () { ac.abort(); }, ms || 8000);
    return fetch(VG.rawUrl(path) + '?t=' + Date.now(), ac ? { signal: ac.signal } : {}).then(function (r) {
      if (r.status == 404) return null;
      if (!r.ok) throw new Error('GitHub trả về ' + r.status);
      return r.json();
    }).finally(function () { if (t) clearTimeout(t); });
  };
  VG.loadDB = function () { return VG.fetchJSON(VG.cfg.paths.db); };
  VG.loadFormula = function () { return VG.fetchJSON(VG.cfg.paths.formula); };
  VG.getToken = function () { try { return sessionStorage.getItem('vg_gh_token') || ''; } catch (e) { return ''; } };
  VG.setToken = function (t) { try { sessionStorage.setItem('vg_gh_token', t); } catch (e) {} };
  VG.clearToken = function () { try { sessionStorage.removeItem('vg_gh_token'); } catch (e) {} };
  VG.b64 = function (s) { return btoa(unescape(encodeURIComponent(s))); };
  VG.save = function (path, obj, message) {
    if (VG.cfg.writable.indexOf(path) < 0) return Promise.reject(new Error('Đường dẫn không nằm trong danh sách được phép ghi: ' + path));
    var tk = VG.getToken();
    if (!tk) return Promise.reject(new Error('Chưa có token GitHub'));
    var c = VG.cfg, api = 'https://api.github.com/repos/' + c.owner + '/' + c.repo + '/contents/' + path;
    var h = { Authorization: 'Bearer ' + tk, Accept: 'application/vnd.github+json' };
    return fetch(api + '?ref=' + encodeURIComponent(c.branch), { headers: h }).then(function (r) {
      if (r.status == 404) return null;
      if (!r.ok) throw new Error('Đọc sha lỗi ' + r.status);
      return r.json();
    }).then(function (cur) {
      var body = { message: message || ('Cập nhật ' + path), content: VG.b64(JSON.stringify(obj, null, 1)), branch: c.branch };
      if (cur && cur.sha) body.sha = cur.sha;
      return fetch(api, { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, h), body: JSON.stringify(body) });
    }).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error((j && j.message) || ('Ghi lỗi ' + r.status)); return j; });
    });
  };
})(typeof window != 'undefined' ? window : globalThis);
