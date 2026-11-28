/* ============================================================
 * bars.js — thanh máu / năng lượng dựng từ sheet pixel (assets/ui/bars)
 *
 * Mỗi thanh = 3 lớp chồng nhau:
 *   under : khung + nền rỗng      (xxx_empty.png)
 *   lag   : bản "đầy" làm trắng   → thanh trễ, tụt chậm sau khi trúng đòn
 *   fill  : bản "đầy"            → ruột, cắt theo %
 * Ruột được CẮT (clip), không bị co dãn → đốt/vạch chia không méo.
 * Thanh xéo cắt theo đúng góc xéo, từng bậc 1px nên giữ nguyên nét pixel.
 *
 * Bề rộng tuỳ ý: ảnh được kéo giãn kiểu 3-slice (giữ nguyên 2 đầu).
 * Godot: đổi sang TextureProgressBar (under / progress / over) — cùng file ảnh.
 * ============================================================ */
(function (global) {
  'use strict';

  const BASE = 'assets/ui/bars/';
  const KINDS = {
    slant:   { w: 42, h: 7, skew: 6, slice: 8, file: 'slant/slant_{c}_{s}.png' },
    pill_lg: { w: 27, h: 8, skew: 0, slice: 4, file: 'pill/pill_{c}_lg_{s}.png' },
    pill_sm: { w: 18, h: 6, skew: 0, slice: 3, file: 'pill/pill_{c}_sm_{s}.png' }
  };
  const src = (kind, color, state) =>
    'url(' + BASE + KINDS[kind].file.replace('{c}', color).replace('{s}', state) + ')';

  function layer(cls, kind, color, state, w) {
    const k = KINDS[kind], i = document.createElement('i');
    i.className = 'bl bl-' + cls;
    const s = i.style;
    s.borderStyle = 'solid';
    s.borderWidth = '0 ' + k.slice + 'px';
    s.borderImageSource = src(kind, color, state);
    s.borderImageSlice = '0 ' + k.slice + ' fill';
    s.borderImageWidth = '0 ' + k.slice + 'px';
    s.borderImageRepeat = 'stretch';
    return i;
  }

  /* polygon cắt thanh xéo: p = 0..1, từng bậc 1px theo đúng độ xéo */
  function slantClip(w, h, skew, p) {
    if (p <= 0) return 'inset(0 100% 0 0)';
    if (p >= 1) return 'none';
    const run = w - skew + 1;
    const xb = Math.round(run * p);
    const pts = ['0px 0px'];
    for (let r = 0; r < h; r++) {
      const cx = xb + (h - 1 - r);
      pts.push(cx + 'px ' + r + 'px', cx + 'px ' + (r + 1) + 'px');
    }
    pts.push('0px ' + h + 'px');
    return 'polygon(' + pts.join(',') + ')';
  }

  const all = new Set();
  let last = 0, running = false;
  function loop(t) {
    const dt = Math.min(0.1, (t - last) / 1000 || 0);
    last = t;
    all.forEach(b => b._tick(dt));
    requestAnimationFrame(loop);
  }

  class Bar {
    /**
     * @param {object} o
     *  kind   'slant' | 'pill_lg' | 'pill_sm'
     *  color  slant: cyan green steel red purple maroon · pill: orange green yellow silver
     *  width  px trong khung 640x360 (mặc định = cỡ gốc của sprite)
     *  lag    bật thanh trễ (mặc định true)
     *  clipDiv  true → ruột là 1 div có style.width (dùng cho ATB, tương thích kiểu #pa/#ea cũ)
     *  fillId   id gắn lên div ruột khi clipDiv
     */
    constructor(o) {
      this.kind = o.kind || 'slant';
      this.k = KINDS[this.kind];
      this.color = o.color || 'green';
      this.w = o.width || this.k.w;
      this.h = this.k.h;
      this.lagOn = o.lag !== false && !o.clipDiv;
      this.clipDiv = !!o.clipDiv;
      this.p = 1; this.shown = 1; this.lagP = 1; this.hold = 0;
      this._cut = '';

      const el = this.el = document.createElement('div');
      el.className = 'bar bar-' + this.kind;
      el.style.width = this.w + 'px';
      el.style.height = this.h + 'px';

      this.under = layer('under', this.kind, this.color, 'empty');
      el.appendChild(this.under);
      if (this.lagOn) { this.lagEl = layer('lag', this.kind, this.color, 'full'); el.appendChild(this.lagEl); }

      if (this.clipDiv) {
        const wrap = this.wrap = document.createElement('div');
        wrap.className = 'bar-clip';
        if (o.fillId) wrap.id = o.fillId;
        const inner = layer('fill', this.kind, this.color, 'full');
        inner.style.width = this.w + 'px';
        wrap.appendChild(inner);
        el.appendChild(wrap);
        this.fillEl = wrap;
      } else {
        this.fillEl = layer('fill', this.kind, this.color, 'full');
        el.appendChild(this.fillEl);
      }
      all.add(this);
      if (!running) { running = true; requestAnimationFrame(loop); }
      this._paint(true);
    }

    /** đặt giá trị; instant=true bỏ qua hoạt ảnh */
    set(value, max, instant) {
      const p = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
      if (p < this.p) this.hold = 0.35;          // trúng đòn: giữ thanh trễ một nhịp rồi mới tụt
      this.p = p;
      if (instant) { this.shown = p; this.lagP = p; }
      this._paint();
      return this;
    }
    show(on) { this.el.style.display = on ? '' : 'none'; return this; }
    destroy() { all.delete(this); this.el.remove(); }

    _tick(dt) {
      let ch = false;
      if (this.shown !== this.p) {
        const d = this.p - this.shown, st = 3.2 * dt;
        this.shown = Math.abs(d) <= st ? this.p : this.shown + Math.sign(d) * st;
        ch = true;
      }
      if (this.lagOn) {
        if (this.lagP < this.shown) { this.lagP = this.shown; ch = true; }
        else if (this.lagP > this.shown) {
          if (this.hold > 0) this.hold -= dt;
          else { this.lagP = Math.max(this.shown, this.lagP - 0.55 * dt); ch = true; }
        }
      }
      if (ch) this._paint();
    }

    _paint(force) {
      const f = this._clip(this.shown);
      const l = this.lagOn ? this._clip(this.lagP) : '';
      const key = f + '|' + l;
      if (!force && key === this._cut) return;
      this._cut = key;
      if (this.clipDiv) this.wrap.style.width = Math.round(this.w * this.shown) + 'px';
      else this.fillEl.style.clipPath = f;
      if (this.lagOn) this.lagEl.style.clipPath = l;
    }

    _clip(p) {
      if (this.clipDiv) return String(Math.round(this.w * p));
      if (this.kind === 'slant') return slantClip(this.w, this.h, this.k.skew, p);
      if (p >= 1) return 'none';
      return 'inset(0 ' + (this.w - Math.round(this.w * p)) + 'px 0 0)';
    }
  }

  global.Bar = Bar;
})(window);
