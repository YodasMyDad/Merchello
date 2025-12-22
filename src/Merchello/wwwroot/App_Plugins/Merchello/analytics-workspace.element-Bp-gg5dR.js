import { LitElement as Pe, html as z, css as Ae, property as J, state as st, customElement as Oe, svg as Ao, query as Oo } from "@umbraco-cms/backoffice/external/lit";
import { UmbElementMixin as Le } from "@umbraco-cms/backoffice/element-api";
import { M as ae } from "./merchello-api-B1skiL_A.js";
import { c as me } from "./formatting-BB_-NCdW.js";
var Lo = Object.defineProperty, To = Object.getOwnPropertyDescriptor, se = (i, t, e, s) => {
  for (var n = s > 1 ? void 0 : s ? To(t, e) : t, o = i.length - 1, a; o >= 0; o--)
    (a = i[o]) && (n = (s ? a(t, e, n) : a(n)) || n);
  return s && n && Lo(t, e, n), n;
};
let Pt = class extends Le(Pe) {
  constructor() {
    super(...arguments), this.dateRange = this._getDefaultDateRange(), this._activePreset = "last30days", this._showCustomPicker = !1, this._customStartDate = "", this._customEndDate = "";
  }
  _getDefaultDateRange() {
    const i = /* @__PURE__ */ new Date(), t = /* @__PURE__ */ new Date();
    return t.setDate(t.getDate() - 30), { startDate: t, endDate: i };
  }
  _formatDateRange() {
    const i = {
      month: "short",
      day: "numeric",
      year: "numeric"
    }, t = this.dateRange.startDate.toLocaleDateString(void 0, i), e = this.dateRange.endDate.toLocaleDateString(void 0, i);
    return this._isSameDay(this.dateRange.startDate, this.dateRange.endDate) ? t : `${t} – ${e}`;
  }
  _isSameDay(i, t) {
    return i.getFullYear() === t.getFullYear() && i.getMonth() === t.getMonth() && i.getDate() === t.getDate();
  }
  _handlePresetClick(i) {
    if (this._activePreset = i, this._showCustomPicker = i === "custom", i !== "custom") {
      const { startDate: t, endDate: e } = this._getPresetDateRange(i);
      this._emitDateRangeChange(t, e, i);
    }
  }
  _getPresetDateRange(i) {
    const t = /* @__PURE__ */ new Date(), e = /* @__PURE__ */ new Date();
    switch (i) {
      case "today":
        break;
      case "last7days":
        e.setDate(e.getDate() - 7);
        break;
      case "last30days":
        e.setDate(e.getDate() - 30);
        break;
      case "thisMonth":
        e.setDate(1);
        break;
      case "lastMonth": {
        e.setMonth(e.getMonth() - 1), e.setDate(1);
        const s = new Date(t.getFullYear(), t.getMonth(), 0);
        return { startDate: e, endDate: s };
      }
      default:
        e.setDate(e.getDate() - 30);
    }
    return { startDate: e, endDate: t };
  }
  _handleCustomStartChange(i) {
    const t = i.target;
    this._customStartDate = t.value, this._tryApplyCustomRange();
  }
  _handleCustomEndChange(i) {
    const t = i.target;
    this._customEndDate = t.value, this._tryApplyCustomRange();
  }
  _tryApplyCustomRange() {
    if (this._customStartDate && this._customEndDate) {
      const i = new Date(this._customStartDate), t = new Date(this._customEndDate);
      i <= t && this._emitDateRangeChange(i, t, "custom");
    }
  }
  _emitDateRangeChange(i, t, e) {
    this.dispatchEvent(
      new CustomEvent("date-range-change", {
        detail: { startDate: i, endDate: t, preset: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _formatDateForInput(i) {
    return i.toISOString().split("T")[0];
  }
  render() {
    return z`
      <div class="header">
        <div class="controls">
          <div class="preset-buttons">
            <uui-button
              look=${this._activePreset === "today" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("today")}
              label="Today">
              Today
            </uui-button>
            <uui-button
              look=${this._activePreset === "last7days" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("last7days")}
              label="Last 7 days">
              Last 7 days
            </uui-button>
            <uui-button
              look=${this._activePreset === "last30days" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("last30days")}
              label="Last 30 days">
              Last 30 days
            </uui-button>
            <uui-button
              look=${this._activePreset === "thisMonth" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("thisMonth")}
              label="This month">
              This month
            </uui-button>
            <uui-button
              look=${this._activePreset === "custom" ? "primary" : "secondary"}
              compact
              @click=${() => this._handlePresetClick("custom")}
              label="Custom">
              Custom
            </uui-button>
          </div>

          ${this._showCustomPicker ? z`
                <div class="custom-picker">
                  <uui-input
                    type="date"
                    .value=${this._customStartDate || this._formatDateForInput(this.dateRange.startDate)}
                    @change=${this._handleCustomStartChange}
                    label="Start date">
                  </uui-input>
                  <span class="date-separator">to</span>
                  <uui-input
                    type="date"
                    .value=${this._customEndDate || this._formatDateForInput(this.dateRange.endDate)}
                    @change=${this._handleCustomEndChange}
                    label="End date">
                  </uui-input>
                </div>
              ` : z`
                <div class="date-display">
                  <uui-icon name="icon-calendar"></uui-icon>
                  <span>${this._formatDateRange()}</span>
                </div>
              `}
        </div>
      </div>
    `;
  }
};
Pt.styles = Ae`
    :host {
      display: block;
    }

    .header {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-5);
    }

    .controls {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-4);
      flex-wrap: wrap;
    }

    .preset-buttons {
      display: flex;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .custom-picker {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .date-separator {
      color: var(--uui-color-text-alt);
      font-size: var(--uui-type-small-size);
    }

    .date-display {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text);
    }

    .date-display uui-icon {
      color: var(--uui-color-text-alt);
    }

    uui-input[type="date"] {
      width: 150px;
    }
  `;
se([
  J({ type: Object })
], Pt.prototype, "dateRange", 2);
se([
  st()
], Pt.prototype, "_activePreset", 2);
se([
  st()
], Pt.prototype, "_showCustomPicker", 2);
se([
  st()
], Pt.prototype, "_customStartDate", 2);
se([
  st()
], Pt.prototype, "_customEndDate", 2);
Pt = se([
  Oe("merchello-analytics-header")
], Pt);
var Ro = Object.defineProperty, Eo = Object.getOwnPropertyDescriptor, Xt = (i, t, e, s) => {
  for (var n = s > 1 ? void 0 : s ? Eo(t, e) : t, o = i.length - 1, a; o >= 0; o--)
    (a = i[o]) && (n = (s ? a(t, e, n) : a(n)) || n);
  return s && n && Ro(t, e, n), n;
};
let xt = class extends Le(Pe) {
  constructor() {
    super(...arguments), this.label = "", this.value = "", this.change = 0, this.sparklineData = [], this.isLoading = !1, this.showChange = !0;
  }
  _renderSparkline() {
    if (!this.sparklineData || this.sparklineData.length < 2)
      return z`<div class="sparkline-empty"></div>`;
    const i = 80, t = 32, e = 2, s = this.sparklineData, n = Math.max(...s, 1), o = Math.min(...s, 0), a = n - o || 1, l = `M ${s.map((d, u) => {
      const f = e + u / (s.length - 1) * (i - e * 2), g = t - e - (d - o) / a * (t - e * 2);
      return `${f},${g}`;
    }).join(" L ")}`, h = this.change >= 0 ? "#3b82f6" : "#94a3b8";
    return Ao`
      <svg
        class="sparkline"
        viewBox="0 0 ${i} ${t}"
        preserveAspectRatio="none">
        <path
          d="${l}"
          fill="none"
          stroke="${h}"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  }
  _renderChangeIndicator() {
    if (!this.showChange) return "";
    const i = this.change > 0;
    return this.change === 0 ? z`<span class="change neutral">—</span>` : z`
      <span class="change ${i ? "positive" : "negative"}">
        ${i ? "↑" : "↓"} ${Math.abs(this.change)}%
      </span>
    `;
  }
  render() {
    return z`
      <uui-box>
        ${this.isLoading ? z`
              <div class="loading">
                <uui-loader-bar></uui-loader-bar>
              </div>
            ` : z`
              <div class="card-content">
                <div class="info">
                  <div class="label">${this.label}</div>
                  <div class="value-row">
                    <span class="value">${this.value}</span>
                    ${this._renderChangeIndicator()}
                  </div>
                </div>
                <div class="sparkline-container">
                  ${this._renderSparkline()}
                </div>
              </div>
            `}
      </uui-box>
    `;
  }
};
xt.styles = Ae`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-4);
      height: 100%;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60px;
    }

    .card-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--uui-size-space-3);
    }

    .info {
      flex: 1;
      min-width: 0;
    }

    .label {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .value-row {
      display: flex;
      align-items: baseline;
      gap: var(--uui-size-space-2);
      flex-wrap: wrap;
    }

    .value {
      font-size: var(--uui-type-h4-size);
      font-weight: 700;
      line-height: 1.2;
    }

    .change {
      font-size: var(--uui-type-small-size);
      font-weight: 500;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
    }

    .change.positive {
      color: #16a34a;
      background: rgba(22, 163, 74, 0.1);
    }

    .change.negative {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }

    .change.neutral {
      color: var(--uui-color-text-alt);
    }

    .sparkline-container {
      flex-shrink: 0;
      width: 80px;
      height: 32px;
    }

    .sparkline {
      width: 100%;
      height: 100%;
    }

    .sparkline-empty {
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        var(--uui-color-border) 0%,
        var(--uui-color-border) 50%,
        transparent 50%,
        transparent 100%
      );
      background-size: 8px 2px;
      background-position: bottom;
      background-repeat: repeat-x;
    }
  `;
Xt([
  J({ type: String })
], xt.prototype, "label", 2);
Xt([
  J({ type: String })
], xt.prototype, "value", 2);
Xt([
  J({ type: Number })
], xt.prototype, "change", 2);
Xt([
  J({ type: Array })
], xt.prototype, "sparklineData", 2);
Xt([
  J({ type: Boolean })
], xt.prototype, "isLoading", 2);
Xt([
  J({ type: Boolean })
], xt.prototype, "showChange", 2);
xt = Xt([
  Oe("merchello-analytics-kpi-card")
], xt);
function Te(i) {
  return i + 0.5 | 0;
}
const Mt = (i, t, e) => Math.max(Math.min(i, e), t);
function ue(i) {
  return Mt(Te(i * 2.55), 0, 255);
}
function Ct(i) {
  return Mt(Te(i * 255), 0, 255);
}
function pt(i) {
  return Mt(Te(i / 2.55) / 100, 0, 1);
}
function ss(i) {
  return Mt(Te(i * 100), 0, 100);
}
const nt = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, a: 10, b: 11, c: 12, d: 13, e: 14, f: 15 }, Pi = [..."0123456789ABCDEF"], Fo = (i) => Pi[i & 15], zo = (i) => Pi[(i & 240) >> 4] + Pi[i & 15], Fe = (i) => (i & 240) >> 4 === (i & 15), Io = (i) => Fe(i.r) && Fe(i.g) && Fe(i.b) && Fe(i.a);
function Bo(i) {
  var t = i.length, e;
  return i[0] === "#" && (t === 4 || t === 5 ? e = {
    r: 255 & nt[i[1]] * 17,
    g: 255 & nt[i[2]] * 17,
    b: 255 & nt[i[3]] * 17,
    a: t === 5 ? nt[i[4]] * 17 : 255
  } : (t === 7 || t === 9) && (e = {
    r: nt[i[1]] << 4 | nt[i[2]],
    g: nt[i[3]] << 4 | nt[i[4]],
    b: nt[i[5]] << 4 | nt[i[6]],
    a: t === 9 ? nt[i[7]] << 4 | nt[i[8]] : 255
  })), e;
}
const Vo = (i, t) => i < 255 ? t(i) : "";
function No(i) {
  var t = Io(i) ? Fo : zo;
  return i ? "#" + t(i.r) + t(i.g) + t(i.b) + Vo(i.a, t) : void 0;
}
const Wo = /^(hsla?|hwb|hsv)\(\s*([-+.e\d]+)(?:deg)?[\s,]+([-+.e\d]+)%[\s,]+([-+.e\d]+)%(?:[\s,]+([-+.e\d]+)(%)?)?\s*\)$/;
function Pn(i, t, e) {
  const s = t * Math.min(e, 1 - e), n = (o, a = (o + i / 30) % 12) => e - s * Math.max(Math.min(a - 3, 9 - a, 1), -1);
  return [n(0), n(8), n(4)];
}
function $o(i, t, e) {
  const s = (n, o = (n + i / 60) % 6) => e - e * t * Math.max(Math.min(o, 4 - o, 1), 0);
  return [s(5), s(3), s(1)];
}
function Ho(i, t, e) {
  const s = Pn(i, 1, 0.5);
  let n;
  for (t + e > 1 && (n = 1 / (t + e), t *= n, e *= n), n = 0; n < 3; n++)
    s[n] *= 1 - t - e, s[n] += t;
  return s;
}
function jo(i, t, e, s, n) {
  return i === n ? (t - e) / s + (t < e ? 6 : 0) : t === n ? (e - i) / s + 2 : (i - t) / s + 4;
}
function Vi(i) {
  const e = i.r / 255, s = i.g / 255, n = i.b / 255, o = Math.max(e, s, n), a = Math.min(e, s, n), r = (o + a) / 2;
  let l, c, h;
  return o !== a && (h = o - a, c = r > 0.5 ? h / (2 - o - a) : h / (o + a), l = jo(e, s, n, h, o), l = l * 60 + 0.5), [l | 0, c || 0, r];
}
function Ni(i, t, e, s) {
  return (Array.isArray(t) ? i(t[0], t[1], t[2]) : i(t, e, s)).map(Ct);
}
function Wi(i, t, e) {
  return Ni(Pn, i, t, e);
}
function Yo(i, t, e) {
  return Ni(Ho, i, t, e);
}
function Xo(i, t, e) {
  return Ni($o, i, t, e);
}
function An(i) {
  return (i % 360 + 360) % 360;
}
function Uo(i) {
  const t = Wo.exec(i);
  let e = 255, s;
  if (!t)
    return;
  t[5] !== s && (e = t[6] ? ue(+t[5]) : Ct(+t[5]));
  const n = An(+t[2]), o = +t[3] / 100, a = +t[4] / 100;
  return t[1] === "hwb" ? s = Yo(n, o, a) : t[1] === "hsv" ? s = Xo(n, o, a) : s = Wi(n, o, a), {
    r: s[0],
    g: s[1],
    b: s[2],
    a: e
  };
}
function Ko(i, t) {
  var e = Vi(i);
  e[0] = An(e[0] + t), e = Wi(e), i.r = e[0], i.g = e[1], i.b = e[2];
}
function Go(i) {
  if (!i)
    return;
  const t = Vi(i), e = t[0], s = ss(t[1]), n = ss(t[2]);
  return i.a < 255 ? `hsla(${e}, ${s}%, ${n}%, ${pt(i.a)})` : `hsl(${e}, ${s}%, ${n}%)`;
}
const ns = {
  x: "dark",
  Z: "light",
  Y: "re",
  X: "blu",
  W: "gr",
  V: "medium",
  U: "slate",
  A: "ee",
  T: "ol",
  S: "or",
  B: "ra",
  C: "lateg",
  D: "ights",
  R: "in",
  Q: "turquois",
  E: "hi",
  P: "ro",
  O: "al",
  N: "le",
  M: "de",
  L: "yello",
  F: "en",
  K: "ch",
  G: "arks",
  H: "ea",
  I: "ightg",
  J: "wh"
}, os = {
  OiceXe: "f0f8ff",
  antiquewEte: "faebd7",
  aqua: "ffff",
  aquamarRe: "7fffd4",
  azuY: "f0ffff",
  beige: "f5f5dc",
  bisque: "ffe4c4",
  black: "0",
  blanKedOmond: "ffebcd",
  Xe: "ff",
  XeviTet: "8a2be2",
  bPwn: "a52a2a",
  burlywood: "deb887",
  caMtXe: "5f9ea0",
  KartYuse: "7fff00",
  KocTate: "d2691e",
  cSO: "ff7f50",
  cSnflowerXe: "6495ed",
  cSnsilk: "fff8dc",
  crimson: "dc143c",
  cyan: "ffff",
  xXe: "8b",
  xcyan: "8b8b",
  xgTMnPd: "b8860b",
  xWay: "a9a9a9",
  xgYF: "6400",
  xgYy: "a9a9a9",
  xkhaki: "bdb76b",
  xmagFta: "8b008b",
  xTivegYF: "556b2f",
  xSange: "ff8c00",
  xScEd: "9932cc",
  xYd: "8b0000",
  xsOmon: "e9967a",
  xsHgYF: "8fbc8f",
  xUXe: "483d8b",
  xUWay: "2f4f4f",
  xUgYy: "2f4f4f",
  xQe: "ced1",
  xviTet: "9400d3",
  dAppRk: "ff1493",
  dApskyXe: "bfff",
  dimWay: "696969",
  dimgYy: "696969",
  dodgerXe: "1e90ff",
  fiYbrick: "b22222",
  flSOwEte: "fffaf0",
  foYstWAn: "228b22",
  fuKsia: "ff00ff",
  gaRsbSo: "dcdcdc",
  ghostwEte: "f8f8ff",
  gTd: "ffd700",
  gTMnPd: "daa520",
  Way: "808080",
  gYF: "8000",
  gYFLw: "adff2f",
  gYy: "808080",
  honeyMw: "f0fff0",
  hotpRk: "ff69b4",
  RdianYd: "cd5c5c",
  Rdigo: "4b0082",
  ivSy: "fffff0",
  khaki: "f0e68c",
  lavFMr: "e6e6fa",
  lavFMrXsh: "fff0f5",
  lawngYF: "7cfc00",
  NmoncEffon: "fffacd",
  ZXe: "add8e6",
  ZcSO: "f08080",
  Zcyan: "e0ffff",
  ZgTMnPdLw: "fafad2",
  ZWay: "d3d3d3",
  ZgYF: "90ee90",
  ZgYy: "d3d3d3",
  ZpRk: "ffb6c1",
  ZsOmon: "ffa07a",
  ZsHgYF: "20b2aa",
  ZskyXe: "87cefa",
  ZUWay: "778899",
  ZUgYy: "778899",
  ZstAlXe: "b0c4de",
  ZLw: "ffffe0",
  lime: "ff00",
  limegYF: "32cd32",
  lRF: "faf0e6",
  magFta: "ff00ff",
  maPon: "800000",
  VaquamarRe: "66cdaa",
  VXe: "cd",
  VScEd: "ba55d3",
  VpurpN: "9370db",
  VsHgYF: "3cb371",
  VUXe: "7b68ee",
  VsprRggYF: "fa9a",
  VQe: "48d1cc",
  VviTetYd: "c71585",
  midnightXe: "191970",
  mRtcYam: "f5fffa",
  mistyPse: "ffe4e1",
  moccasR: "ffe4b5",
  navajowEte: "ffdead",
  navy: "80",
  Tdlace: "fdf5e6",
  Tive: "808000",
  TivedBb: "6b8e23",
  Sange: "ffa500",
  SangeYd: "ff4500",
  ScEd: "da70d6",
  pOegTMnPd: "eee8aa",
  pOegYF: "98fb98",
  pOeQe: "afeeee",
  pOeviTetYd: "db7093",
  papayawEp: "ffefd5",
  pHKpuff: "ffdab9",
  peru: "cd853f",
  pRk: "ffc0cb",
  plum: "dda0dd",
  powMrXe: "b0e0e6",
  purpN: "800080",
  YbeccapurpN: "663399",
  Yd: "ff0000",
  Psybrown: "bc8f8f",
  PyOXe: "4169e1",
  saddNbPwn: "8b4513",
  sOmon: "fa8072",
  sandybPwn: "f4a460",
  sHgYF: "2e8b57",
  sHshell: "fff5ee",
  siFna: "a0522d",
  silver: "c0c0c0",
  skyXe: "87ceeb",
  UXe: "6a5acd",
  UWay: "708090",
  UgYy: "708090",
  snow: "fffafa",
  sprRggYF: "ff7f",
  stAlXe: "4682b4",
  tan: "d2b48c",
  teO: "8080",
  tEstN: "d8bfd8",
  tomato: "ff6347",
  Qe: "40e0d0",
  viTet: "ee82ee",
  JHt: "f5deb3",
  wEte: "ffffff",
  wEtesmoke: "f5f5f5",
  Lw: "ffff00",
  LwgYF: "9acd32"
};
function qo() {
  const i = {}, t = Object.keys(os), e = Object.keys(ns);
  let s, n, o, a, r;
  for (s = 0; s < t.length; s++) {
    for (a = r = t[s], n = 0; n < e.length; n++)
      o = e[n], r = r.replace(o, ns[o]);
    o = parseInt(os[a], 16), i[r] = [o >> 16 & 255, o >> 8 & 255, o & 255];
  }
  return i;
}
let ze;
function Zo(i) {
  ze || (ze = qo(), ze.transparent = [0, 0, 0, 0]);
  const t = ze[i.toLowerCase()];
  return t && {
    r: t[0],
    g: t[1],
    b: t[2],
    a: t.length === 4 ? t[3] : 255
  };
}
const Jo = /^rgba?\(\s*([-+.\d]+)(%)?[\s,]+([-+.e\d]+)(%)?[\s,]+([-+.e\d]+)(%)?(?:[\s,/]+([-+.e\d]+)(%)?)?\s*\)$/;
function Qo(i) {
  const t = Jo.exec(i);
  let e = 255, s, n, o;
  if (t) {
    if (t[7] !== s) {
      const a = +t[7];
      e = t[8] ? ue(a) : Mt(a * 255, 0, 255);
    }
    return s = +t[1], n = +t[3], o = +t[5], s = 255 & (t[2] ? ue(s) : Mt(s, 0, 255)), n = 255 & (t[4] ? ue(n) : Mt(n, 0, 255)), o = 255 & (t[6] ? ue(o) : Mt(o, 0, 255)), {
      r: s,
      g: n,
      b: o,
      a: e
    };
  }
}
function ta(i) {
  return i && (i.a < 255 ? `rgba(${i.r}, ${i.g}, ${i.b}, ${pt(i.a)})` : `rgb(${i.r}, ${i.g}, ${i.b})`);
}
const gi = (i) => i <= 31308e-7 ? i * 12.92 : Math.pow(i, 1 / 2.4) * 1.055 - 0.055, qt = (i) => i <= 0.04045 ? i / 12.92 : Math.pow((i + 0.055) / 1.055, 2.4);
function ea(i, t, e) {
  const s = qt(pt(i.r)), n = qt(pt(i.g)), o = qt(pt(i.b));
  return {
    r: Ct(gi(s + e * (qt(pt(t.r)) - s))),
    g: Ct(gi(n + e * (qt(pt(t.g)) - n))),
    b: Ct(gi(o + e * (qt(pt(t.b)) - o))),
    a: i.a + e * (t.a - i.a)
  };
}
function Ie(i, t, e) {
  if (i) {
    let s = Vi(i);
    s[t] = Math.max(0, Math.min(s[t] + s[t] * e, t === 0 ? 360 : 1)), s = Wi(s), i.r = s[0], i.g = s[1], i.b = s[2];
  }
}
function On(i, t) {
  return i && Object.assign(t || {}, i);
}
function as(i) {
  var t = { r: 0, g: 0, b: 0, a: 255 };
  return Array.isArray(i) ? i.length >= 3 && (t = { r: i[0], g: i[1], b: i[2], a: 255 }, i.length > 3 && (t.a = Ct(i[3]))) : (t = On(i, { r: 0, g: 0, b: 0, a: 1 }), t.a = Ct(t.a)), t;
}
function ia(i) {
  return i.charAt(0) === "r" ? Qo(i) : Uo(i);
}
class ve {
  constructor(t) {
    if (t instanceof ve)
      return t;
    const e = typeof t;
    let s;
    e === "object" ? s = as(t) : e === "string" && (s = Bo(t) || Zo(t) || ia(t)), this._rgb = s, this._valid = !!s;
  }
  get valid() {
    return this._valid;
  }
  get rgb() {
    var t = On(this._rgb);
    return t && (t.a = pt(t.a)), t;
  }
  set rgb(t) {
    this._rgb = as(t);
  }
  rgbString() {
    return this._valid ? ta(this._rgb) : void 0;
  }
  hexString() {
    return this._valid ? No(this._rgb) : void 0;
  }
  hslString() {
    return this._valid ? Go(this._rgb) : void 0;
  }
  mix(t, e) {
    if (t) {
      const s = this.rgb, n = t.rgb;
      let o;
      const a = e === o ? 0.5 : e, r = 2 * a - 1, l = s.a - n.a, c = ((r * l === -1 ? r : (r + l) / (1 + r * l)) + 1) / 2;
      o = 1 - c, s.r = 255 & c * s.r + o * n.r + 0.5, s.g = 255 & c * s.g + o * n.g + 0.5, s.b = 255 & c * s.b + o * n.b + 0.5, s.a = a * s.a + (1 - a) * n.a, this.rgb = s;
    }
    return this;
  }
  interpolate(t, e) {
    return t && (this._rgb = ea(this._rgb, t._rgb, e)), this;
  }
  clone() {
    return new ve(this.rgb);
  }
  alpha(t) {
    return this._rgb.a = Ct(t), this;
  }
  clearer(t) {
    const e = this._rgb;
    return e.a *= 1 - t, this;
  }
  greyscale() {
    const t = this._rgb, e = Te(t.r * 0.3 + t.g * 0.59 + t.b * 0.11);
    return t.r = t.g = t.b = e, this;
  }
  opaquer(t) {
    const e = this._rgb;
    return e.a *= 1 + t, this;
  }
  negate() {
    const t = this._rgb;
    return t.r = 255 - t.r, t.g = 255 - t.g, t.b = 255 - t.b, this;
  }
  lighten(t) {
    return Ie(this._rgb, 2, t), this;
  }
  darken(t) {
    return Ie(this._rgb, 2, -t), this;
  }
  saturate(t) {
    return Ie(this._rgb, 1, t), this;
  }
  desaturate(t) {
    return Ie(this._rgb, 1, -t), this;
  }
  rotate(t) {
    return Ko(this._rgb, t), this;
  }
}
function ut() {
}
const sa = /* @__PURE__ */ (() => {
  let i = 0;
  return () => i++;
})();
function A(i) {
  return i == null;
}
function V(i) {
  if (Array.isArray && Array.isArray(i))
    return !0;
  const t = Object.prototype.toString.call(i);
  return t.slice(0, 7) === "[object" && t.slice(-6) === "Array]";
}
function O(i) {
  return i !== null && Object.prototype.toString.call(i) === "[object Object]";
}
function W(i) {
  return (typeof i == "number" || i instanceof Number) && isFinite(+i);
}
function it(i, t) {
  return W(i) ? i : t;
}
function D(i, t) {
  return typeof i > "u" ? t : i;
}
const na = (i, t) => typeof i == "string" && i.endsWith("%") ? parseFloat(i) / 100 : +i / t, Ln = (i, t) => typeof i == "string" && i.endsWith("%") ? parseFloat(i) / 100 * t : +i;
function F(i, t, e) {
  if (i && typeof i.call == "function")
    return i.apply(e, t);
}
function R(i, t, e, s) {
  let n, o, a;
  if (V(i))
    for (o = i.length, n = 0; n < o; n++)
      t.call(e, i[n], n);
  else if (O(i))
    for (a = Object.keys(i), o = a.length, n = 0; n < o; n++)
      t.call(e, i[a[n]], a[n]);
}
function Ze(i, t) {
  let e, s, n, o;
  if (!i || !t || i.length !== t.length)
    return !1;
  for (e = 0, s = i.length; e < s; ++e)
    if (n = i[e], o = t[e], n.datasetIndex !== o.datasetIndex || n.index !== o.index)
      return !1;
  return !0;
}
function Je(i) {
  if (V(i))
    return i.map(Je);
  if (O(i)) {
    const t = /* @__PURE__ */ Object.create(null), e = Object.keys(i), s = e.length;
    let n = 0;
    for (; n < s; ++n)
      t[e[n]] = Je(i[e[n]]);
    return t;
  }
  return i;
}
function Tn(i) {
  return [
    "__proto__",
    "prototype",
    "constructor"
  ].indexOf(i) === -1;
}
function oa(i, t, e, s) {
  if (!Tn(i))
    return;
  const n = t[i], o = e[i];
  O(n) && O(o) ? ke(n, o, s) : t[i] = Je(o);
}
function ke(i, t, e) {
  const s = V(t) ? t : [
    t
  ], n = s.length;
  if (!O(i))
    return i;
  e = e || {};
  const o = e.merger || oa;
  let a;
  for (let r = 0; r < n; ++r) {
    if (a = s[r], !O(a))
      continue;
    const l = Object.keys(a);
    for (let c = 0, h = l.length; c < h; ++c)
      o(l[c], i, a, e);
  }
  return i;
}
function be(i, t) {
  return ke(i, t, {
    merger: aa
  });
}
function aa(i, t, e) {
  if (!Tn(i))
    return;
  const s = t[i], n = e[i];
  O(s) && O(n) ? be(s, n) : Object.prototype.hasOwnProperty.call(t, i) || (t[i] = Je(n));
}
const rs = {
  // Chart.helpers.core resolveObjectKey should resolve empty key to root object
  "": (i) => i,
  // default resolvers
  x: (i) => i.x,
  y: (i) => i.y
};
function ra(i) {
  const t = i.split("."), e = [];
  let s = "";
  for (const n of t)
    s += n, s.endsWith("\\") ? s = s.slice(0, -1) + "." : (e.push(s), s = "");
  return e;
}
function la(i) {
  const t = ra(i);
  return (e) => {
    for (const s of t) {
      if (s === "")
        break;
      e = e && e[s];
    }
    return e;
  };
}
function At(i, t) {
  return (rs[t] || (rs[t] = la(t)))(i);
}
function $i(i) {
  return i.charAt(0).toUpperCase() + i.slice(1);
}
const Me = (i) => typeof i < "u", Ot = (i) => typeof i == "function", ls = (i, t) => {
  if (i.size !== t.size)
    return !1;
  for (const e of i)
    if (!t.has(e))
      return !1;
  return !0;
};
function ca(i) {
  return i.type === "mouseup" || i.type === "click" || i.type === "contextmenu";
}
const T = Math.PI, I = 2 * T, ha = I + T, Qe = Number.POSITIVE_INFINITY, da = T / 180, H = T / 2, zt = T / 4, cs = T * 2 / 3, St = Math.log10, ht = Math.sign;
function _e(i, t, e) {
  return Math.abs(i - t) < e;
}
function hs(i) {
  const t = Math.round(i);
  i = _e(i, t, i / 1e3) ? t : i;
  const e = Math.pow(10, Math.floor(St(i))), s = i / e;
  return (s <= 1 ? 1 : s <= 2 ? 2 : s <= 5 ? 5 : 10) * e;
}
function ua(i) {
  const t = [], e = Math.sqrt(i);
  let s;
  for (s = 1; s < e; s++)
    i % s === 0 && (t.push(s), t.push(i / s));
  return e === (e | 0) && t.push(e), t.sort((n, o) => n - o).pop(), t;
}
function fa(i) {
  return typeof i == "symbol" || typeof i == "object" && i !== null && !(Symbol.toPrimitive in i || "toString" in i || "valueOf" in i);
}
function Qt(i) {
  return !fa(i) && !isNaN(parseFloat(i)) && isFinite(i);
}
function ga(i, t) {
  const e = Math.round(i);
  return e - t <= i && e + t >= i;
}
function Rn(i, t, e) {
  let s, n, o;
  for (s = 0, n = i.length; s < n; s++)
    o = i[s][e], isNaN(o) || (t.min = Math.min(t.min, o), t.max = Math.max(t.max, o));
}
function rt(i) {
  return i * (T / 180);
}
function Hi(i) {
  return i * (180 / T);
}
function ds(i) {
  if (!W(i))
    return;
  let t = 1, e = 0;
  for (; Math.round(i * t) / t !== i; )
    t *= 10, e++;
  return e;
}
function En(i, t) {
  const e = t.x - i.x, s = t.y - i.y, n = Math.sqrt(e * e + s * s);
  let o = Math.atan2(s, e);
  return o < -0.5 * T && (o += I), {
    angle: o,
    distance: n
  };
}
function Ai(i, t) {
  return Math.sqrt(Math.pow(t.x - i.x, 2) + Math.pow(t.y - i.y, 2));
}
function pa(i, t) {
  return (i - t + ha) % I - T;
}
function G(i) {
  return (i % I + I) % I;
}
function Se(i, t, e, s) {
  const n = G(i), o = G(t), a = G(e), r = G(o - n), l = G(a - n), c = G(n - o), h = G(n - a);
  return n === o || n === a || s && o === a || r > l && c < h;
}
function Y(i, t, e) {
  return Math.max(t, Math.min(e, i));
}
function ma(i) {
  return Y(i, -32768, 32767);
}
function mt(i, t, e, s = 1e-6) {
  return i >= Math.min(t, e) - s && i <= Math.max(t, e) + s;
}
function ji(i, t, e) {
  e = e || ((a) => i[a] < t);
  let s = i.length - 1, n = 0, o;
  for (; s - n > 1; )
    o = n + s >> 1, e(o) ? n = o : s = o;
  return {
    lo: n,
    hi: s
  };
}
const bt = (i, t, e, s) => ji(i, e, s ? (n) => {
  const o = i[n][t];
  return o < e || o === e && i[n + 1][t] === e;
} : (n) => i[n][t] < e), ba = (i, t, e) => ji(i, e, (s) => i[s][t] >= e);
function _a(i, t, e) {
  let s = 0, n = i.length;
  for (; s < n && i[s] < t; )
    s++;
  for (; n > s && i[n - 1] > e; )
    n--;
  return s > 0 || n < i.length ? i.slice(s, n) : i;
}
const Fn = [
  "push",
  "pop",
  "shift",
  "splice",
  "unshift"
];
function xa(i, t) {
  if (i._chartjs) {
    i._chartjs.listeners.push(t);
    return;
  }
  Object.defineProperty(i, "_chartjs", {
    configurable: !0,
    enumerable: !1,
    value: {
      listeners: [
        t
      ]
    }
  }), Fn.forEach((e) => {
    const s = "_onData" + $i(e), n = i[e];
    Object.defineProperty(i, e, {
      configurable: !0,
      enumerable: !1,
      value(...o) {
        const a = n.apply(this, o);
        return i._chartjs.listeners.forEach((r) => {
          typeof r[s] == "function" && r[s](...o);
        }), a;
      }
    });
  });
}
function us(i, t) {
  const e = i._chartjs;
  if (!e)
    return;
  const s = e.listeners, n = s.indexOf(t);
  n !== -1 && s.splice(n, 1), !(s.length > 0) && (Fn.forEach((o) => {
    delete i[o];
  }), delete i._chartjs);
}
function zn(i) {
  const t = new Set(i);
  return t.size === i.length ? i : Array.from(t);
}
const In = (function() {
  return typeof window > "u" ? function(i) {
    return i();
  } : window.requestAnimationFrame;
})();
function Bn(i, t) {
  let e = [], s = !1;
  return function(...n) {
    e = n, s || (s = !0, In.call(window, () => {
      s = !1, i.apply(t, e);
    }));
  };
}
function ya(i, t) {
  let e;
  return function(...s) {
    return t ? (clearTimeout(e), e = setTimeout(i, t, s)) : i.apply(this, s), t;
  };
}
const Yi = (i) => i === "start" ? "left" : i === "end" ? "right" : "center", K = (i, t, e) => i === "start" ? t : i === "end" ? e : (t + e) / 2, va = (i, t, e, s) => i === (s ? "left" : "right") ? e : i === "center" ? (t + e) / 2 : t;
function Vn(i, t, e) {
  const s = t.length;
  let n = 0, o = s;
  if (i._sorted) {
    const { iScale: a, vScale: r, _parsed: l } = i, c = i.dataset && i.dataset.options ? i.dataset.options.spanGaps : null, h = a.axis, { min: d, max: u, minDefined: f, maxDefined: g } = a.getUserBounds();
    if (f) {
      if (n = Math.min(
        // @ts-expect-error Need to type _parsed
        bt(l, h, d).lo,
        // @ts-expect-error Need to fix types on _lookupByKey
        e ? s : bt(t, h, a.getPixelForValue(d)).lo
      ), c) {
        const p = l.slice(0, n + 1).reverse().findIndex((m) => !A(m[r.axis]));
        n -= Math.max(0, p);
      }
      n = Y(n, 0, s - 1);
    }
    if (g) {
      let p = Math.max(
        // @ts-expect-error Need to type _parsed
        bt(l, a.axis, u, !0).hi + 1,
        // @ts-expect-error Need to fix types on _lookupByKey
        e ? 0 : bt(t, h, a.getPixelForValue(u), !0).hi + 1
      );
      if (c) {
        const m = l.slice(p - 1).findIndex((b) => !A(b[r.axis]));
        p += Math.max(0, m);
      }
      o = Y(p, n, s) - n;
    } else
      o = s - n;
  }
  return {
    start: n,
    count: o
  };
}
function Nn(i) {
  const { xScale: t, yScale: e, _scaleRanges: s } = i, n = {
    xmin: t.min,
    xmax: t.max,
    ymin: e.min,
    ymax: e.max
  };
  if (!s)
    return i._scaleRanges = n, !0;
  const o = s.xmin !== t.min || s.xmax !== t.max || s.ymin !== e.min || s.ymax !== e.max;
  return Object.assign(s, n), o;
}
const Be = (i) => i === 0 || i === 1, fs = (i, t, e) => -(Math.pow(2, 10 * (i -= 1)) * Math.sin((i - t) * I / e)), gs = (i, t, e) => Math.pow(2, -10 * i) * Math.sin((i - t) * I / e) + 1, xe = {
  linear: (i) => i,
  easeInQuad: (i) => i * i,
  easeOutQuad: (i) => -i * (i - 2),
  easeInOutQuad: (i) => (i /= 0.5) < 1 ? 0.5 * i * i : -0.5 * (--i * (i - 2) - 1),
  easeInCubic: (i) => i * i * i,
  easeOutCubic: (i) => (i -= 1) * i * i + 1,
  easeInOutCubic: (i) => (i /= 0.5) < 1 ? 0.5 * i * i * i : 0.5 * ((i -= 2) * i * i + 2),
  easeInQuart: (i) => i * i * i * i,
  easeOutQuart: (i) => -((i -= 1) * i * i * i - 1),
  easeInOutQuart: (i) => (i /= 0.5) < 1 ? 0.5 * i * i * i * i : -0.5 * ((i -= 2) * i * i * i - 2),
  easeInQuint: (i) => i * i * i * i * i,
  easeOutQuint: (i) => (i -= 1) * i * i * i * i + 1,
  easeInOutQuint: (i) => (i /= 0.5) < 1 ? 0.5 * i * i * i * i * i : 0.5 * ((i -= 2) * i * i * i * i + 2),
  easeInSine: (i) => -Math.cos(i * H) + 1,
  easeOutSine: (i) => Math.sin(i * H),
  easeInOutSine: (i) => -0.5 * (Math.cos(T * i) - 1),
  easeInExpo: (i) => i === 0 ? 0 : Math.pow(2, 10 * (i - 1)),
  easeOutExpo: (i) => i === 1 ? 1 : -Math.pow(2, -10 * i) + 1,
  easeInOutExpo: (i) => Be(i) ? i : i < 0.5 ? 0.5 * Math.pow(2, 10 * (i * 2 - 1)) : 0.5 * (-Math.pow(2, -10 * (i * 2 - 1)) + 2),
  easeInCirc: (i) => i >= 1 ? i : -(Math.sqrt(1 - i * i) - 1),
  easeOutCirc: (i) => Math.sqrt(1 - (i -= 1) * i),
  easeInOutCirc: (i) => (i /= 0.5) < 1 ? -0.5 * (Math.sqrt(1 - i * i) - 1) : 0.5 * (Math.sqrt(1 - (i -= 2) * i) + 1),
  easeInElastic: (i) => Be(i) ? i : fs(i, 0.075, 0.3),
  easeOutElastic: (i) => Be(i) ? i : gs(i, 0.075, 0.3),
  easeInOutElastic(i) {
    return Be(i) ? i : i < 0.5 ? 0.5 * fs(i * 2, 0.1125, 0.45) : 0.5 + 0.5 * gs(i * 2 - 1, 0.1125, 0.45);
  },
  easeInBack(i) {
    return i * i * ((1.70158 + 1) * i - 1.70158);
  },
  easeOutBack(i) {
    return (i -= 1) * i * ((1.70158 + 1) * i + 1.70158) + 1;
  },
  easeInOutBack(i) {
    let t = 1.70158;
    return (i /= 0.5) < 1 ? 0.5 * (i * i * (((t *= 1.525) + 1) * i - t)) : 0.5 * ((i -= 2) * i * (((t *= 1.525) + 1) * i + t) + 2);
  },
  easeInBounce: (i) => 1 - xe.easeOutBounce(1 - i),
  easeOutBounce(i) {
    return i < 1 / 2.75 ? 7.5625 * i * i : i < 2 / 2.75 ? 7.5625 * (i -= 1.5 / 2.75) * i + 0.75 : i < 2.5 / 2.75 ? 7.5625 * (i -= 2.25 / 2.75) * i + 0.9375 : 7.5625 * (i -= 2.625 / 2.75) * i + 0.984375;
  },
  easeInOutBounce: (i) => i < 0.5 ? xe.easeInBounce(i * 2) * 0.5 : xe.easeOutBounce(i * 2 - 1) * 0.5 + 0.5
};
function Xi(i) {
  if (i && typeof i == "object") {
    const t = i.toString();
    return t === "[object CanvasPattern]" || t === "[object CanvasGradient]";
  }
  return !1;
}
function ps(i) {
  return Xi(i) ? i : new ve(i);
}
function pi(i) {
  return Xi(i) ? i : new ve(i).saturate(0.5).darken(0.1).hexString();
}
const ka = [
  "x",
  "y",
  "borderWidth",
  "radius",
  "tension"
], Ma = [
  "color",
  "borderColor",
  "backgroundColor"
];
function Sa(i) {
  i.set("animation", {
    delay: void 0,
    duration: 1e3,
    easing: "easeOutQuart",
    fn: void 0,
    from: void 0,
    loop: void 0,
    to: void 0,
    type: void 0
  }), i.describe("animation", {
    _fallback: !1,
    _indexable: !1,
    _scriptable: (t) => t !== "onProgress" && t !== "onComplete" && t !== "fn"
  }), i.set("animations", {
    colors: {
      type: "color",
      properties: Ma
    },
    numbers: {
      type: "number",
      properties: ka
    }
  }), i.describe("animations", {
    _fallback: "animation"
  }), i.set("transitions", {
    active: {
      animation: {
        duration: 400
      }
    },
    resize: {
      animation: {
        duration: 0
      }
    },
    show: {
      animations: {
        colors: {
          from: "transparent"
        },
        visible: {
          type: "boolean",
          duration: 0
        }
      }
    },
    hide: {
      animations: {
        colors: {
          to: "transparent"
        },
        visible: {
          type: "boolean",
          easing: "linear",
          fn: (t) => t | 0
        }
      }
    }
  });
}
function wa(i) {
  i.set("layout", {
    autoPadding: !0,
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  });
}
const ms = /* @__PURE__ */ new Map();
function Da(i, t) {
  t = t || {};
  const e = i + JSON.stringify(t);
  let s = ms.get(e);
  return s || (s = new Intl.NumberFormat(i, t), ms.set(e, s)), s;
}
function Re(i, t, e) {
  return Da(t, e).format(i);
}
const Wn = {
  values(i) {
    return V(i) ? i : "" + i;
  },
  numeric(i, t, e) {
    if (i === 0)
      return "0";
    const s = this.chart.options.locale;
    let n, o = i;
    if (e.length > 1) {
      const c = Math.max(Math.abs(e[0].value), Math.abs(e[e.length - 1].value));
      (c < 1e-4 || c > 1e15) && (n = "scientific"), o = Ca(i, e);
    }
    const a = St(Math.abs(o)), r = isNaN(a) ? 1 : Math.max(Math.min(-1 * Math.floor(a), 20), 0), l = {
      notation: n,
      minimumFractionDigits: r,
      maximumFractionDigits: r
    };
    return Object.assign(l, this.options.ticks.format), Re(i, s, l);
  },
  logarithmic(i, t, e) {
    if (i === 0)
      return "0";
    const s = e[t].significand || i / Math.pow(10, Math.floor(St(i)));
    return [
      1,
      2,
      3,
      5,
      10,
      15
    ].includes(s) || t > 0.8 * e.length ? Wn.numeric.call(this, i, t, e) : "";
  }
};
function Ca(i, t) {
  let e = t.length > 3 ? t[2].value - t[1].value : t[1].value - t[0].value;
  return Math.abs(e) >= 1 && i !== Math.floor(i) && (e = i - Math.floor(i)), e;
}
var oi = {
  formatters: Wn
};
function Pa(i) {
  i.set("scale", {
    display: !0,
    offset: !1,
    reverse: !1,
    beginAtZero: !1,
    bounds: "ticks",
    clip: !0,
    grace: 0,
    grid: {
      display: !0,
      lineWidth: 1,
      drawOnChartArea: !0,
      drawTicks: !0,
      tickLength: 8,
      tickWidth: (t, e) => e.lineWidth,
      tickColor: (t, e) => e.color,
      offset: !1
    },
    border: {
      display: !0,
      dash: [],
      dashOffset: 0,
      width: 1
    },
    title: {
      display: !1,
      text: "",
      padding: {
        top: 4,
        bottom: 4
      }
    },
    ticks: {
      minRotation: 0,
      maxRotation: 50,
      mirror: !1,
      textStrokeWidth: 0,
      textStrokeColor: "",
      padding: 3,
      display: !0,
      autoSkip: !0,
      autoSkipPadding: 3,
      labelOffset: 0,
      callback: oi.formatters.values,
      minor: {},
      major: {},
      align: "center",
      crossAlign: "near",
      showLabelBackdrop: !1,
      backdropColor: "rgba(255, 255, 255, 0.75)",
      backdropPadding: 2
    }
  }), i.route("scale.ticks", "color", "", "color"), i.route("scale.grid", "color", "", "borderColor"), i.route("scale.border", "color", "", "borderColor"), i.route("scale.title", "color", "", "color"), i.describe("scale", {
    _fallback: !1,
    _scriptable: (t) => !t.startsWith("before") && !t.startsWith("after") && t !== "callback" && t !== "parser",
    _indexable: (t) => t !== "borderDash" && t !== "tickBorderDash" && t !== "dash"
  }), i.describe("scales", {
    _fallback: "scale"
  }), i.describe("scale.ticks", {
    _scriptable: (t) => t !== "backdropPadding" && t !== "callback",
    _indexable: (t) => t !== "backdropPadding"
  });
}
const jt = /* @__PURE__ */ Object.create(null), Oi = /* @__PURE__ */ Object.create(null);
function ye(i, t) {
  if (!t)
    return i;
  const e = t.split(".");
  for (let s = 0, n = e.length; s < n; ++s) {
    const o = e[s];
    i = i[o] || (i[o] = /* @__PURE__ */ Object.create(null));
  }
  return i;
}
function mi(i, t, e) {
  return typeof t == "string" ? ke(ye(i, t), e) : ke(ye(i, ""), t);
}
class Aa {
  constructor(t, e) {
    this.animation = void 0, this.backgroundColor = "rgba(0,0,0,0.1)", this.borderColor = "rgba(0,0,0,0.1)", this.color = "#666", this.datasets = {}, this.devicePixelRatio = (s) => s.chart.platform.getDevicePixelRatio(), this.elements = {}, this.events = [
      "mousemove",
      "mouseout",
      "click",
      "touchstart",
      "touchmove"
    ], this.font = {
      family: "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif",
      size: 12,
      style: "normal",
      lineHeight: 1.2,
      weight: null
    }, this.hover = {}, this.hoverBackgroundColor = (s, n) => pi(n.backgroundColor), this.hoverBorderColor = (s, n) => pi(n.borderColor), this.hoverColor = (s, n) => pi(n.color), this.indexAxis = "x", this.interaction = {
      mode: "nearest",
      intersect: !0,
      includeInvisible: !1
    }, this.maintainAspectRatio = !0, this.onHover = null, this.onClick = null, this.parsing = !0, this.plugins = {}, this.responsive = !0, this.scale = void 0, this.scales = {}, this.showLine = !0, this.drawActiveElementsOnTop = !0, this.describe(t), this.apply(e);
  }
  set(t, e) {
    return mi(this, t, e);
  }
  get(t) {
    return ye(this, t);
  }
  describe(t, e) {
    return mi(Oi, t, e);
  }
  override(t, e) {
    return mi(jt, t, e);
  }
  route(t, e, s, n) {
    const o = ye(this, t), a = ye(this, s), r = "_" + e;
    Object.defineProperties(o, {
      [r]: {
        value: o[e],
        writable: !0
      },
      [e]: {
        enumerable: !0,
        get() {
          const l = this[r], c = a[n];
          return O(l) ? Object.assign({}, c, l) : D(l, c);
        },
        set(l) {
          this[r] = l;
        }
      }
    });
  }
  apply(t) {
    t.forEach((e) => e(this));
  }
}
var N = /* @__PURE__ */ new Aa({
  _scriptable: (i) => !i.startsWith("on"),
  _indexable: (i) => i !== "events",
  hover: {
    _fallback: "interaction"
  },
  interaction: {
    _scriptable: !1,
    _indexable: !1
  }
}, [
  Sa,
  wa,
  Pa
]);
function Oa(i) {
  return !i || A(i.size) || A(i.family) ? null : (i.style ? i.style + " " : "") + (i.weight ? i.weight + " " : "") + i.size + "px " + i.family;
}
function ti(i, t, e, s, n) {
  let o = t[n];
  return o || (o = t[n] = i.measureText(n).width, e.push(n)), o > s && (s = o), s;
}
function La(i, t, e, s) {
  s = s || {};
  let n = s.data = s.data || {}, o = s.garbageCollect = s.garbageCollect || [];
  s.font !== t && (n = s.data = {}, o = s.garbageCollect = [], s.font = t), i.save(), i.font = t;
  let a = 0;
  const r = e.length;
  let l, c, h, d, u;
  for (l = 0; l < r; l++)
    if (d = e[l], d != null && !V(d))
      a = ti(i, n, o, a, d);
    else if (V(d))
      for (c = 0, h = d.length; c < h; c++)
        u = d[c], u != null && !V(u) && (a = ti(i, n, o, a, u));
  i.restore();
  const f = o.length / 2;
  if (f > e.length) {
    for (l = 0; l < f; l++)
      delete n[o[l]];
    o.splice(0, f);
  }
  return a;
}
function It(i, t, e) {
  const s = i.currentDevicePixelRatio, n = e !== 0 ? Math.max(e / 2, 0.5) : 0;
  return Math.round((t - n) * s) / s + n;
}
function bs(i, t) {
  !t && !i || (t = t || i.getContext("2d"), t.save(), t.resetTransform(), t.clearRect(0, 0, i.width, i.height), t.restore());
}
function Li(i, t, e, s) {
  $n(i, t, e, s, null);
}
function $n(i, t, e, s, n) {
  let o, a, r, l, c, h, d, u;
  const f = t.pointStyle, g = t.rotation, p = t.radius;
  let m = (g || 0) * da;
  if (f && typeof f == "object" && (o = f.toString(), o === "[object HTMLImageElement]" || o === "[object HTMLCanvasElement]")) {
    i.save(), i.translate(e, s), i.rotate(m), i.drawImage(f, -f.width / 2, -f.height / 2, f.width, f.height), i.restore();
    return;
  }
  if (!(isNaN(p) || p <= 0)) {
    switch (i.beginPath(), f) {
      // Default includes circle
      default:
        n ? i.ellipse(e, s, n / 2, p, 0, 0, I) : i.arc(e, s, p, 0, I), i.closePath();
        break;
      case "triangle":
        h = n ? n / 2 : p, i.moveTo(e + Math.sin(m) * h, s - Math.cos(m) * p), m += cs, i.lineTo(e + Math.sin(m) * h, s - Math.cos(m) * p), m += cs, i.lineTo(e + Math.sin(m) * h, s - Math.cos(m) * p), i.closePath();
        break;
      case "rectRounded":
        c = p * 0.516, l = p - c, a = Math.cos(m + zt) * l, d = Math.cos(m + zt) * (n ? n / 2 - c : l), r = Math.sin(m + zt) * l, u = Math.sin(m + zt) * (n ? n / 2 - c : l), i.arc(e - d, s - r, c, m - T, m - H), i.arc(e + u, s - a, c, m - H, m), i.arc(e + d, s + r, c, m, m + H), i.arc(e - u, s + a, c, m + H, m + T), i.closePath();
        break;
      case "rect":
        if (!g) {
          l = Math.SQRT1_2 * p, h = n ? n / 2 : l, i.rect(e - h, s - l, 2 * h, 2 * l);
          break;
        }
        m += zt;
      /* falls through */
      case "rectRot":
        d = Math.cos(m) * (n ? n / 2 : p), a = Math.cos(m) * p, r = Math.sin(m) * p, u = Math.sin(m) * (n ? n / 2 : p), i.moveTo(e - d, s - r), i.lineTo(e + u, s - a), i.lineTo(e + d, s + r), i.lineTo(e - u, s + a), i.closePath();
        break;
      case "crossRot":
        m += zt;
      /* falls through */
      case "cross":
        d = Math.cos(m) * (n ? n / 2 : p), a = Math.cos(m) * p, r = Math.sin(m) * p, u = Math.sin(m) * (n ? n / 2 : p), i.moveTo(e - d, s - r), i.lineTo(e + d, s + r), i.moveTo(e + u, s - a), i.lineTo(e - u, s + a);
        break;
      case "star":
        d = Math.cos(m) * (n ? n / 2 : p), a = Math.cos(m) * p, r = Math.sin(m) * p, u = Math.sin(m) * (n ? n / 2 : p), i.moveTo(e - d, s - r), i.lineTo(e + d, s + r), i.moveTo(e + u, s - a), i.lineTo(e - u, s + a), m += zt, d = Math.cos(m) * (n ? n / 2 : p), a = Math.cos(m) * p, r = Math.sin(m) * p, u = Math.sin(m) * (n ? n / 2 : p), i.moveTo(e - d, s - r), i.lineTo(e + d, s + r), i.moveTo(e + u, s - a), i.lineTo(e - u, s + a);
        break;
      case "line":
        a = n ? n / 2 : Math.cos(m) * p, r = Math.sin(m) * p, i.moveTo(e - a, s - r), i.lineTo(e + a, s + r);
        break;
      case "dash":
        i.moveTo(e, s), i.lineTo(e + Math.cos(m) * (n ? n / 2 : p), s + Math.sin(m) * p);
        break;
      case !1:
        i.closePath();
        break;
    }
    i.fill(), t.borderWidth > 0 && i.stroke();
  }
}
function _t(i, t, e) {
  return e = e || 0.5, !t || i && i.x > t.left - e && i.x < t.right + e && i.y > t.top - e && i.y < t.bottom + e;
}
function ai(i, t) {
  i.save(), i.beginPath(), i.rect(t.left, t.top, t.right - t.left, t.bottom - t.top), i.clip();
}
function ri(i) {
  i.restore();
}
function Ta(i, t, e, s, n) {
  if (!t)
    return i.lineTo(e.x, e.y);
  if (n === "middle") {
    const o = (t.x + e.x) / 2;
    i.lineTo(o, t.y), i.lineTo(o, e.y);
  } else n === "after" != !!s ? i.lineTo(t.x, e.y) : i.lineTo(e.x, t.y);
  i.lineTo(e.x, e.y);
}
function Ra(i, t, e, s) {
  if (!t)
    return i.lineTo(e.x, e.y);
  i.bezierCurveTo(s ? t.cp1x : t.cp2x, s ? t.cp1y : t.cp2y, s ? e.cp2x : e.cp1x, s ? e.cp2y : e.cp1y, e.x, e.y);
}
function Ea(i, t) {
  t.translation && i.translate(t.translation[0], t.translation[1]), A(t.rotation) || i.rotate(t.rotation), t.color && (i.fillStyle = t.color), t.textAlign && (i.textAlign = t.textAlign), t.textBaseline && (i.textBaseline = t.textBaseline);
}
function Fa(i, t, e, s, n) {
  if (n.strikethrough || n.underline) {
    const o = i.measureText(s), a = t - o.actualBoundingBoxLeft, r = t + o.actualBoundingBoxRight, l = e - o.actualBoundingBoxAscent, c = e + o.actualBoundingBoxDescent, h = n.strikethrough ? (l + c) / 2 : c;
    i.strokeStyle = i.fillStyle, i.beginPath(), i.lineWidth = n.decorationWidth || 2, i.moveTo(a, h), i.lineTo(r, h), i.stroke();
  }
}
function za(i, t) {
  const e = i.fillStyle;
  i.fillStyle = t.color, i.fillRect(t.left, t.top, t.width, t.height), i.fillStyle = e;
}
function Yt(i, t, e, s, n, o = {}) {
  const a = V(t) ? t : [
    t
  ], r = o.strokeWidth > 0 && o.strokeColor !== "";
  let l, c;
  for (i.save(), i.font = n.string, Ea(i, o), l = 0; l < a.length; ++l)
    c = a[l], o.backdrop && za(i, o.backdrop), r && (o.strokeColor && (i.strokeStyle = o.strokeColor), A(o.strokeWidth) || (i.lineWidth = o.strokeWidth), i.strokeText(c, e, s, o.maxWidth)), i.fillText(c, e, s, o.maxWidth), Fa(i, e, s, c, o), s += Number(n.lineHeight);
  i.restore();
}
function we(i, t) {
  const { x: e, y: s, w: n, h: o, radius: a } = t;
  i.arc(e + a.topLeft, s + a.topLeft, a.topLeft, 1.5 * T, T, !0), i.lineTo(e, s + o - a.bottomLeft), i.arc(e + a.bottomLeft, s + o - a.bottomLeft, a.bottomLeft, T, H, !0), i.lineTo(e + n - a.bottomRight, s + o), i.arc(e + n - a.bottomRight, s + o - a.bottomRight, a.bottomRight, H, 0, !0), i.lineTo(e + n, s + a.topRight), i.arc(e + n - a.topRight, s + a.topRight, a.topRight, 0, -H, !0), i.lineTo(e + a.topLeft, s);
}
const Ia = /^(normal|(\d+(?:\.\d+)?)(px|em|%)?)$/, Ba = /^(normal|italic|initial|inherit|unset|(oblique( -?[0-9]?[0-9]deg)?))$/;
function Va(i, t) {
  const e = ("" + i).match(Ia);
  if (!e || e[1] === "normal")
    return t * 1.2;
  switch (i = +e[2], e[3]) {
    case "px":
      return i;
    case "%":
      i /= 100;
      break;
  }
  return t * i;
}
const Na = (i) => +i || 0;
function Ui(i, t) {
  const e = {}, s = O(t), n = s ? Object.keys(t) : t, o = O(i) ? s ? (a) => D(i[a], i[t[a]]) : (a) => i[a] : () => i;
  for (const a of n)
    e[a] = Na(o(a));
  return e;
}
function Hn(i) {
  return Ui(i, {
    top: "y",
    right: "x",
    bottom: "y",
    left: "x"
  });
}
function $t(i) {
  return Ui(i, [
    "topLeft",
    "topRight",
    "bottomLeft",
    "bottomRight"
  ]);
}
function Z(i) {
  const t = Hn(i);
  return t.width = t.left + t.right, t.height = t.top + t.bottom, t;
}
function j(i, t) {
  i = i || {}, t = t || N.font;
  let e = D(i.size, t.size);
  typeof e == "string" && (e = parseInt(e, 10));
  let s = D(i.style, t.style);
  s && !("" + s).match(Ba) && (console.warn('Invalid font style specified: "' + s + '"'), s = void 0);
  const n = {
    family: D(i.family, t.family),
    lineHeight: Va(D(i.lineHeight, t.lineHeight), e),
    size: e,
    style: s,
    weight: D(i.weight, t.weight),
    string: ""
  };
  return n.string = Oa(n), n;
}
function fe(i, t, e, s) {
  let n, o, a;
  for (n = 0, o = i.length; n < o; ++n)
    if (a = i[n], a !== void 0 && a !== void 0)
      return a;
}
function Wa(i, t, e) {
  const { min: s, max: n } = i, o = Ln(t, (n - s) / 2), a = (r, l) => e && r === 0 ? 0 : r + l;
  return {
    min: a(s, -Math.abs(o)),
    max: a(n, o)
  };
}
function Lt(i, t) {
  return Object.assign(Object.create(i), t);
}
function Ki(i, t = [
  ""
], e, s, n = () => i[0]) {
  const o = e || i;
  typeof s > "u" && (s = Un("_fallback", i));
  const a = {
    [Symbol.toStringTag]: "Object",
    _cacheable: !0,
    _scopes: i,
    _rootScopes: o,
    _fallback: s,
    _getTarget: n,
    override: (r) => Ki([
      r,
      ...i
    ], t, o, s)
  };
  return new Proxy(a, {
    /**
    * A trap for the delete operator.
    */
    deleteProperty(r, l) {
      return delete r[l], delete r._keys, delete i[0][l], !0;
    },
    /**
    * A trap for getting property values.
    */
    get(r, l) {
      return Yn(r, l, () => Ga(l, t, i, r));
    },
    /**
    * A trap for Object.getOwnPropertyDescriptor.
    * Also used by Object.hasOwnProperty.
    */
    getOwnPropertyDescriptor(r, l) {
      return Reflect.getOwnPropertyDescriptor(r._scopes[0], l);
    },
    /**
    * A trap for Object.getPrototypeOf.
    */
    getPrototypeOf() {
      return Reflect.getPrototypeOf(i[0]);
    },
    /**
    * A trap for the in operator.
    */
    has(r, l) {
      return xs(r).includes(l);
    },
    /**
    * A trap for Object.getOwnPropertyNames and Object.getOwnPropertySymbols.
    */
    ownKeys(r) {
      return xs(r);
    },
    /**
    * A trap for setting property values.
    */
    set(r, l, c) {
      const h = r._storage || (r._storage = n());
      return r[l] = h[l] = c, delete r._keys, !0;
    }
  });
}
function te(i, t, e, s) {
  const n = {
    _cacheable: !1,
    _proxy: i,
    _context: t,
    _subProxy: e,
    _stack: /* @__PURE__ */ new Set(),
    _descriptors: jn(i, s),
    setContext: (o) => te(i, o, e, s),
    override: (o) => te(i.override(o), t, e, s)
  };
  return new Proxy(n, {
    /**
    * A trap for the delete operator.
    */
    deleteProperty(o, a) {
      return delete o[a], delete i[a], !0;
    },
    /**
    * A trap for getting property values.
    */
    get(o, a, r) {
      return Yn(o, a, () => Ha(o, a, r));
    },
    /**
    * A trap for Object.getOwnPropertyDescriptor.
    * Also used by Object.hasOwnProperty.
    */
    getOwnPropertyDescriptor(o, a) {
      return o._descriptors.allKeys ? Reflect.has(i, a) ? {
        enumerable: !0,
        configurable: !0
      } : void 0 : Reflect.getOwnPropertyDescriptor(i, a);
    },
    /**
    * A trap for Object.getPrototypeOf.
    */
    getPrototypeOf() {
      return Reflect.getPrototypeOf(i);
    },
    /**
    * A trap for the in operator.
    */
    has(o, a) {
      return Reflect.has(i, a);
    },
    /**
    * A trap for Object.getOwnPropertyNames and Object.getOwnPropertySymbols.
    */
    ownKeys() {
      return Reflect.ownKeys(i);
    },
    /**
    * A trap for setting property values.
    */
    set(o, a, r) {
      return i[a] = r, delete o[a], !0;
    }
  });
}
function jn(i, t = {
  scriptable: !0,
  indexable: !0
}) {
  const { _scriptable: e = t.scriptable, _indexable: s = t.indexable, _allKeys: n = t.allKeys } = i;
  return {
    allKeys: n,
    scriptable: e,
    indexable: s,
    isScriptable: Ot(e) ? e : () => e,
    isIndexable: Ot(s) ? s : () => s
  };
}
const $a = (i, t) => i ? i + $i(t) : t, Gi = (i, t) => O(t) && i !== "adapters" && (Object.getPrototypeOf(t) === null || t.constructor === Object);
function Yn(i, t, e) {
  if (Object.prototype.hasOwnProperty.call(i, t) || t === "constructor")
    return i[t];
  const s = e();
  return i[t] = s, s;
}
function Ha(i, t, e) {
  const { _proxy: s, _context: n, _subProxy: o, _descriptors: a } = i;
  let r = s[t];
  return Ot(r) && a.isScriptable(t) && (r = ja(t, r, i, e)), V(r) && r.length && (r = Ya(t, r, i, a.isIndexable)), Gi(t, r) && (r = te(r, n, o && o[t], a)), r;
}
function ja(i, t, e, s) {
  const { _proxy: n, _context: o, _subProxy: a, _stack: r } = e;
  if (r.has(i))
    throw new Error("Recursion detected: " + Array.from(r).join("->") + "->" + i);
  r.add(i);
  let l = t(o, a || s);
  return r.delete(i), Gi(i, l) && (l = qi(n._scopes, n, i, l)), l;
}
function Ya(i, t, e, s) {
  const { _proxy: n, _context: o, _subProxy: a, _descriptors: r } = e;
  if (typeof o.index < "u" && s(i))
    return t[o.index % t.length];
  if (O(t[0])) {
    const l = t, c = n._scopes.filter((h) => h !== l);
    t = [];
    for (const h of l) {
      const d = qi(c, n, i, h);
      t.push(te(d, o, a && a[i], r));
    }
  }
  return t;
}
function Xn(i, t, e) {
  return Ot(i) ? i(t, e) : i;
}
const Xa = (i, t) => i === !0 ? t : typeof i == "string" ? At(t, i) : void 0;
function Ua(i, t, e, s, n) {
  for (const o of t) {
    const a = Xa(e, o);
    if (a) {
      i.add(a);
      const r = Xn(a._fallback, e, n);
      if (typeof r < "u" && r !== e && r !== s)
        return r;
    } else if (a === !1 && typeof s < "u" && e !== s)
      return null;
  }
  return !1;
}
function qi(i, t, e, s) {
  const n = t._rootScopes, o = Xn(t._fallback, e, s), a = [
    ...i,
    ...n
  ], r = /* @__PURE__ */ new Set();
  r.add(s);
  let l = _s(r, a, e, o || e, s);
  return l === null || typeof o < "u" && o !== e && (l = _s(r, a, o, l, s), l === null) ? !1 : Ki(Array.from(r), [
    ""
  ], n, o, () => Ka(t, e, s));
}
function _s(i, t, e, s, n) {
  for (; e; )
    e = Ua(i, t, e, s, n);
  return e;
}
function Ka(i, t, e) {
  const s = i._getTarget();
  t in s || (s[t] = {});
  const n = s[t];
  return V(n) && O(e) ? e : n || {};
}
function Ga(i, t, e, s) {
  let n;
  for (const o of t)
    if (n = Un($a(o, i), e), typeof n < "u")
      return Gi(i, n) ? qi(e, s, i, n) : n;
}
function Un(i, t) {
  for (const e of t) {
    if (!e)
      continue;
    const s = e[i];
    if (typeof s < "u")
      return s;
  }
}
function xs(i) {
  let t = i._keys;
  return t || (t = i._keys = qa(i._scopes)), t;
}
function qa(i) {
  const t = /* @__PURE__ */ new Set();
  for (const e of i)
    for (const s of Object.keys(e).filter((n) => !n.startsWith("_")))
      t.add(s);
  return Array.from(t);
}
function Kn(i, t, e, s) {
  const { iScale: n } = i, { key: o = "r" } = this._parsing, a = new Array(s);
  let r, l, c, h;
  for (r = 0, l = s; r < l; ++r)
    c = r + e, h = t[c], a[r] = {
      r: n.parse(At(h, o), c)
    };
  return a;
}
const Za = Number.EPSILON || 1e-14, ee = (i, t) => t < i.length && !i[t].skip && i[t], Gn = (i) => i === "x" ? "y" : "x";
function Ja(i, t, e, s) {
  const n = i.skip ? t : i, o = t, a = e.skip ? t : e, r = Ai(o, n), l = Ai(a, o);
  let c = r / (r + l), h = l / (r + l);
  c = isNaN(c) ? 0 : c, h = isNaN(h) ? 0 : h;
  const d = s * c, u = s * h;
  return {
    previous: {
      x: o.x - d * (a.x - n.x),
      y: o.y - d * (a.y - n.y)
    },
    next: {
      x: o.x + u * (a.x - n.x),
      y: o.y + u * (a.y - n.y)
    }
  };
}
function Qa(i, t, e) {
  const s = i.length;
  let n, o, a, r, l, c = ee(i, 0);
  for (let h = 0; h < s - 1; ++h)
    if (l = c, c = ee(i, h + 1), !(!l || !c)) {
      if (_e(t[h], 0, Za)) {
        e[h] = e[h + 1] = 0;
        continue;
      }
      n = e[h] / t[h], o = e[h + 1] / t[h], r = Math.pow(n, 2) + Math.pow(o, 2), !(r <= 9) && (a = 3 / Math.sqrt(r), e[h] = n * a * t[h], e[h + 1] = o * a * t[h]);
    }
}
function tr(i, t, e = "x") {
  const s = Gn(e), n = i.length;
  let o, a, r, l = ee(i, 0);
  for (let c = 0; c < n; ++c) {
    if (a = r, r = l, l = ee(i, c + 1), !r)
      continue;
    const h = r[e], d = r[s];
    a && (o = (h - a[e]) / 3, r[`cp1${e}`] = h - o, r[`cp1${s}`] = d - o * t[c]), l && (o = (l[e] - h) / 3, r[`cp2${e}`] = h + o, r[`cp2${s}`] = d + o * t[c]);
  }
}
function er(i, t = "x") {
  const e = Gn(t), s = i.length, n = Array(s).fill(0), o = Array(s);
  let a, r, l, c = ee(i, 0);
  for (a = 0; a < s; ++a)
    if (r = l, l = c, c = ee(i, a + 1), !!l) {
      if (c) {
        const h = c[t] - l[t];
        n[a] = h !== 0 ? (c[e] - l[e]) / h : 0;
      }
      o[a] = r ? c ? ht(n[a - 1]) !== ht(n[a]) ? 0 : (n[a - 1] + n[a]) / 2 : n[a - 1] : n[a];
    }
  Qa(i, n, o), tr(i, o, t);
}
function Ve(i, t, e) {
  return Math.max(Math.min(i, e), t);
}
function ir(i, t) {
  let e, s, n, o, a, r = _t(i[0], t);
  for (e = 0, s = i.length; e < s; ++e)
    a = o, o = r, r = e < s - 1 && _t(i[e + 1], t), o && (n = i[e], a && (n.cp1x = Ve(n.cp1x, t.left, t.right), n.cp1y = Ve(n.cp1y, t.top, t.bottom)), r && (n.cp2x = Ve(n.cp2x, t.left, t.right), n.cp2y = Ve(n.cp2y, t.top, t.bottom)));
}
function sr(i, t, e, s, n) {
  let o, a, r, l;
  if (t.spanGaps && (i = i.filter((c) => !c.skip)), t.cubicInterpolationMode === "monotone")
    er(i, n);
  else {
    let c = s ? i[i.length - 1] : i[0];
    for (o = 0, a = i.length; o < a; ++o)
      r = i[o], l = Ja(c, r, i[Math.min(o + 1, a - (s ? 0 : 1)) % a], t.tension), r.cp1x = l.previous.x, r.cp1y = l.previous.y, r.cp2x = l.next.x, r.cp2y = l.next.y, c = r;
  }
  t.capBezierPoints && ir(i, e);
}
function Zi() {
  return typeof window < "u" && typeof document < "u";
}
function Ji(i) {
  let t = i.parentNode;
  return t && t.toString() === "[object ShadowRoot]" && (t = t.host), t;
}
function ei(i, t, e) {
  let s;
  return typeof i == "string" ? (s = parseInt(i, 10), i.indexOf("%") !== -1 && (s = s / 100 * t.parentNode[e])) : s = i, s;
}
const li = (i) => i.ownerDocument.defaultView.getComputedStyle(i, null);
function nr(i, t) {
  return li(i).getPropertyValue(t);
}
const or = [
  "top",
  "right",
  "bottom",
  "left"
];
function Ht(i, t, e) {
  const s = {};
  e = e ? "-" + e : "";
  for (let n = 0; n < 4; n++) {
    const o = or[n];
    s[o] = parseFloat(i[t + "-" + o + e]) || 0;
  }
  return s.width = s.left + s.right, s.height = s.top + s.bottom, s;
}
const ar = (i, t, e) => (i > 0 || t > 0) && (!e || !e.shadowRoot);
function rr(i, t) {
  const e = i.touches, s = e && e.length ? e[0] : i, { offsetX: n, offsetY: o } = s;
  let a = !1, r, l;
  if (ar(n, o, i.target))
    r = n, l = o;
  else {
    const c = t.getBoundingClientRect();
    r = s.clientX - c.left, l = s.clientY - c.top, a = !0;
  }
  return {
    x: r,
    y: l,
    box: a
  };
}
function Nt(i, t) {
  if ("native" in i)
    return i;
  const { canvas: e, currentDevicePixelRatio: s } = t, n = li(e), o = n.boxSizing === "border-box", a = Ht(n, "padding"), r = Ht(n, "border", "width"), { x: l, y: c, box: h } = rr(i, e), d = a.left + (h && r.left), u = a.top + (h && r.top);
  let { width: f, height: g } = t;
  return o && (f -= a.width + r.width, g -= a.height + r.height), {
    x: Math.round((l - d) / f * e.width / s),
    y: Math.round((c - u) / g * e.height / s)
  };
}
function lr(i, t, e) {
  let s, n;
  if (t === void 0 || e === void 0) {
    const o = i && Ji(i);
    if (!o)
      t = i.clientWidth, e = i.clientHeight;
    else {
      const a = o.getBoundingClientRect(), r = li(o), l = Ht(r, "border", "width"), c = Ht(r, "padding");
      t = a.width - c.width - l.width, e = a.height - c.height - l.height, s = ei(r.maxWidth, o, "clientWidth"), n = ei(r.maxHeight, o, "clientHeight");
    }
  }
  return {
    width: t,
    height: e,
    maxWidth: s || Qe,
    maxHeight: n || Qe
  };
}
const wt = (i) => Math.round(i * 10) / 10;
function cr(i, t, e, s) {
  const n = li(i), o = Ht(n, "margin"), a = ei(n.maxWidth, i, "clientWidth") || Qe, r = ei(n.maxHeight, i, "clientHeight") || Qe, l = lr(i, t, e);
  let { width: c, height: h } = l;
  if (n.boxSizing === "content-box") {
    const u = Ht(n, "border", "width"), f = Ht(n, "padding");
    c -= f.width + u.width, h -= f.height + u.height;
  }
  return c = Math.max(0, c - o.width), h = Math.max(0, s ? c / s : h - o.height), c = wt(Math.min(c, a, l.maxWidth)), h = wt(Math.min(h, r, l.maxHeight)), c && !h && (h = wt(c / 2)), (t !== void 0 || e !== void 0) && s && l.height && h > l.height && (h = l.height, c = wt(Math.floor(h * s))), {
    width: c,
    height: h
  };
}
function ys(i, t, e) {
  const s = t || 1, n = wt(i.height * s), o = wt(i.width * s);
  i.height = wt(i.height), i.width = wt(i.width);
  const a = i.canvas;
  return a.style && (e || !a.style.height && !a.style.width) && (a.style.height = `${i.height}px`, a.style.width = `${i.width}px`), i.currentDevicePixelRatio !== s || a.height !== n || a.width !== o ? (i.currentDevicePixelRatio = s, a.height = n, a.width = o, i.ctx.setTransform(s, 0, 0, s, 0, 0), !0) : !1;
}
const hr = (function() {
  let i = !1;
  try {
    const t = {
      get passive() {
        return i = !0, !1;
      }
    };
    Zi() && (window.addEventListener("test", null, t), window.removeEventListener("test", null, t));
  } catch {
  }
  return i;
})();
function vs(i, t) {
  const e = nr(i, t), s = e && e.match(/^(\d+)(\.\d+)?px$/);
  return s ? +s[1] : void 0;
}
function Wt(i, t, e, s) {
  return {
    x: i.x + e * (t.x - i.x),
    y: i.y + e * (t.y - i.y)
  };
}
function dr(i, t, e, s) {
  return {
    x: i.x + e * (t.x - i.x),
    y: s === "middle" ? e < 0.5 ? i.y : t.y : s === "after" ? e < 1 ? i.y : t.y : e > 0 ? t.y : i.y
  };
}
function ur(i, t, e, s) {
  const n = {
    x: i.cp2x,
    y: i.cp2y
  }, o = {
    x: t.cp1x,
    y: t.cp1y
  }, a = Wt(i, n, e), r = Wt(n, o, e), l = Wt(o, t, e), c = Wt(a, r, e), h = Wt(r, l, e);
  return Wt(c, h, e);
}
const fr = function(i, t) {
  return {
    x(e) {
      return i + i + t - e;
    },
    setWidth(e) {
      t = e;
    },
    textAlign(e) {
      return e === "center" ? e : e === "right" ? "left" : "right";
    },
    xPlus(e, s) {
      return e - s;
    },
    leftForLtr(e, s) {
      return e - s;
    }
  };
}, gr = function() {
  return {
    x(i) {
      return i;
    },
    setWidth(i) {
    },
    textAlign(i) {
      return i;
    },
    xPlus(i, t) {
      return i + t;
    },
    leftForLtr(i, t) {
      return i;
    }
  };
};
function Jt(i, t, e) {
  return i ? fr(t, e) : gr();
}
function qn(i, t) {
  let e, s;
  (t === "ltr" || t === "rtl") && (e = i.canvas.style, s = [
    e.getPropertyValue("direction"),
    e.getPropertyPriority("direction")
  ], e.setProperty("direction", t, "important"), i.prevTextDirection = s);
}
function Zn(i, t) {
  t !== void 0 && (delete i.prevTextDirection, i.canvas.style.setProperty("direction", t[0], t[1]));
}
function Jn(i) {
  return i === "angle" ? {
    between: Se,
    compare: pa,
    normalize: G
  } : {
    between: mt,
    compare: (t, e) => t - e,
    normalize: (t) => t
  };
}
function ks({ start: i, end: t, count: e, loop: s, style: n }) {
  return {
    start: i % e,
    end: t % e,
    loop: s && (t - i + 1) % e === 0,
    style: n
  };
}
function pr(i, t, e) {
  const { property: s, start: n, end: o } = e, { between: a, normalize: r } = Jn(s), l = t.length;
  let { start: c, end: h, loop: d } = i, u, f;
  if (d) {
    for (c += l, h += l, u = 0, f = l; u < f && a(r(t[c % l][s]), n, o); ++u)
      c--, h--;
    c %= l, h %= l;
  }
  return h < c && (h += l), {
    start: c,
    end: h,
    loop: d,
    style: i.style
  };
}
function Qn(i, t, e) {
  if (!e)
    return [
      i
    ];
  const { property: s, start: n, end: o } = e, a = t.length, { compare: r, between: l, normalize: c } = Jn(s), { start: h, end: d, loop: u, style: f } = pr(i, t, e), g = [];
  let p = !1, m = null, b, _, v;
  const y = () => l(n, v, b) && r(n, v) !== 0, x = () => r(o, b) === 0 || l(o, v, b), k = () => p || y(), M = () => !p || x();
  for (let S = h, w = h; S <= d; ++S)
    _ = t[S % a], !_.skip && (b = c(_[s]), b !== v && (p = l(b, n, o), m === null && k() && (m = r(b, n) === 0 ? S : w), m !== null && M() && (g.push(ks({
      start: m,
      end: S,
      loop: u,
      count: a,
      style: f
    })), m = null), w = S, v = b));
  return m !== null && g.push(ks({
    start: m,
    end: d,
    loop: u,
    count: a,
    style: f
  })), g;
}
function to(i, t) {
  const e = [], s = i.segments;
  for (let n = 0; n < s.length; n++) {
    const o = Qn(s[n], i.points, t);
    o.length && e.push(...o);
  }
  return e;
}
function mr(i, t, e, s) {
  let n = 0, o = t - 1;
  if (e && !s)
    for (; n < t && !i[n].skip; )
      n++;
  for (; n < t && i[n].skip; )
    n++;
  for (n %= t, e && (o += n); o > n && i[o % t].skip; )
    o--;
  return o %= t, {
    start: n,
    end: o
  };
}
function br(i, t, e, s) {
  const n = i.length, o = [];
  let a = t, r = i[t], l;
  for (l = t + 1; l <= e; ++l) {
    const c = i[l % n];
    c.skip || c.stop ? r.skip || (s = !1, o.push({
      start: t % n,
      end: (l - 1) % n,
      loop: s
    }), t = a = c.stop ? l : null) : (a = l, r.skip && (t = l)), r = c;
  }
  return a !== null && o.push({
    start: t % n,
    end: a % n,
    loop: s
  }), o;
}
function _r(i, t) {
  const e = i.points, s = i.options.spanGaps, n = e.length;
  if (!n)
    return [];
  const o = !!i._loop, { start: a, end: r } = mr(e, n, o, s);
  if (s === !0)
    return Ms(i, [
      {
        start: a,
        end: r,
        loop: o
      }
    ], e, t);
  const l = r < a ? r + n : r, c = !!i._fullLoop && a === 0 && r === n - 1;
  return Ms(i, br(e, a, l, c), e, t);
}
function Ms(i, t, e, s) {
  return !s || !s.setContext || !e ? t : xr(i, t, e, s);
}
function xr(i, t, e, s) {
  const n = i._chart.getContext(), o = Ss(i.options), { _datasetIndex: a, options: { spanGaps: r } } = i, l = e.length, c = [];
  let h = o, d = t[0].start, u = d;
  function f(g, p, m, b) {
    const _ = r ? -1 : 1;
    if (g !== p) {
      for (g += l; e[g % l].skip; )
        g -= _;
      for (; e[p % l].skip; )
        p += _;
      g % l !== p % l && (c.push({
        start: g % l,
        end: p % l,
        loop: m,
        style: b
      }), h = b, d = p % l);
    }
  }
  for (const g of t) {
    d = r ? d : g.start;
    let p = e[d % l], m;
    for (u = d + 1; u <= g.end; u++) {
      const b = e[u % l];
      m = Ss(s.setContext(Lt(n, {
        type: "segment",
        p0: p,
        p1: b,
        p0DataIndex: (u - 1) % l,
        p1DataIndex: u % l,
        datasetIndex: a
      }))), yr(m, h) && f(d, u - 1, g.loop, h), p = b, h = m;
    }
    d < u - 1 && f(d, u - 1, g.loop, h);
  }
  return c;
}
function Ss(i) {
  return {
    backgroundColor: i.backgroundColor,
    borderCapStyle: i.borderCapStyle,
    borderDash: i.borderDash,
    borderDashOffset: i.borderDashOffset,
    borderJoinStyle: i.borderJoinStyle,
    borderWidth: i.borderWidth,
    borderColor: i.borderColor
  };
}
function yr(i, t) {
  if (!t)
    return !1;
  const e = [], s = function(n, o) {
    return Xi(o) ? (e.includes(o) || e.push(o), e.indexOf(o)) : o;
  };
  return JSON.stringify(i, s) !== JSON.stringify(t, s);
}
function Ne(i, t, e) {
  return i.options.clip ? i[e] : t[e];
}
function vr(i, t) {
  const { xScale: e, yScale: s } = i;
  return e && s ? {
    left: Ne(e, t, "left"),
    right: Ne(e, t, "right"),
    top: Ne(s, t, "top"),
    bottom: Ne(s, t, "bottom")
  } : t;
}
function eo(i, t) {
  const e = t._clip;
  if (e.disabled)
    return !1;
  const s = vr(t, i.chartArea);
  return {
    left: e.left === !1 ? 0 : s.left - (e.left === !0 ? 0 : e.left),
    right: e.right === !1 ? i.width : s.right + (e.right === !0 ? 0 : e.right),
    top: e.top === !1 ? 0 : s.top - (e.top === !0 ? 0 : e.top),
    bottom: e.bottom === !1 ? i.height : s.bottom + (e.bottom === !0 ? 0 : e.bottom)
  };
}
class kr {
  constructor() {
    this._request = null, this._charts = /* @__PURE__ */ new Map(), this._running = !1, this._lastDate = void 0;
  }
  _notify(t, e, s, n) {
    const o = e.listeners[n], a = e.duration;
    o.forEach((r) => r({
      chart: t,
      initial: e.initial,
      numSteps: a,
      currentStep: Math.min(s - e.start, a)
    }));
  }
  _refresh() {
    this._request || (this._running = !0, this._request = In.call(window, () => {
      this._update(), this._request = null, this._running && this._refresh();
    }));
  }
  _update(t = Date.now()) {
    let e = 0;
    this._charts.forEach((s, n) => {
      if (!s.running || !s.items.length)
        return;
      const o = s.items;
      let a = o.length - 1, r = !1, l;
      for (; a >= 0; --a)
        l = o[a], l._active ? (l._total > s.duration && (s.duration = l._total), l.tick(t), r = !0) : (o[a] = o[o.length - 1], o.pop());
      r && (n.draw(), this._notify(n, s, t, "progress")), o.length || (s.running = !1, this._notify(n, s, t, "complete"), s.initial = !1), e += o.length;
    }), this._lastDate = t, e === 0 && (this._running = !1);
  }
  _getAnims(t) {
    const e = this._charts;
    let s = e.get(t);
    return s || (s = {
      running: !1,
      initial: !0,
      items: [],
      listeners: {
        complete: [],
        progress: []
      }
    }, e.set(t, s)), s;
  }
  listen(t, e, s) {
    this._getAnims(t).listeners[e].push(s);
  }
  add(t, e) {
    !e || !e.length || this._getAnims(t).items.push(...e);
  }
  has(t) {
    return this._getAnims(t).items.length > 0;
  }
  start(t) {
    const e = this._charts.get(t);
    e && (e.running = !0, e.start = Date.now(), e.duration = e.items.reduce((s, n) => Math.max(s, n._duration), 0), this._refresh());
  }
  running(t) {
    if (!this._running)
      return !1;
    const e = this._charts.get(t);
    return !(!e || !e.running || !e.items.length);
  }
  stop(t) {
    const e = this._charts.get(t);
    if (!e || !e.items.length)
      return;
    const s = e.items;
    let n = s.length - 1;
    for (; n >= 0; --n)
      s[n].cancel();
    e.items = [], this._notify(t, e, Date.now(), "complete");
  }
  remove(t) {
    return this._charts.delete(t);
  }
}
var ft = /* @__PURE__ */ new kr();
const ws = "transparent", Mr = {
  boolean(i, t, e) {
    return e > 0.5 ? t : i;
  },
  color(i, t, e) {
    const s = ps(i || ws), n = s.valid && ps(t || ws);
    return n && n.valid ? n.mix(s, e).hexString() : t;
  },
  number(i, t, e) {
    return i + (t - i) * e;
  }
};
class Sr {
  constructor(t, e, s, n) {
    const o = e[s];
    n = fe([
      t.to,
      n,
      o,
      t.from
    ]);
    const a = fe([
      t.from,
      o,
      n
    ]);
    this._active = !0, this._fn = t.fn || Mr[t.type || typeof a], this._easing = xe[t.easing] || xe.linear, this._start = Math.floor(Date.now() + (t.delay || 0)), this._duration = this._total = Math.floor(t.duration), this._loop = !!t.loop, this._target = e, this._prop = s, this._from = a, this._to = n, this._promises = void 0;
  }
  active() {
    return this._active;
  }
  update(t, e, s) {
    if (this._active) {
      this._notify(!1);
      const n = this._target[this._prop], o = s - this._start, a = this._duration - o;
      this._start = s, this._duration = Math.floor(Math.max(a, t.duration)), this._total += o, this._loop = !!t.loop, this._to = fe([
        t.to,
        e,
        n,
        t.from
      ]), this._from = fe([
        t.from,
        n,
        e
      ]);
    }
  }
  cancel() {
    this._active && (this.tick(Date.now()), this._active = !1, this._notify(!1));
  }
  tick(t) {
    const e = t - this._start, s = this._duration, n = this._prop, o = this._from, a = this._loop, r = this._to;
    let l;
    if (this._active = o !== r && (a || e < s), !this._active) {
      this._target[n] = r, this._notify(!0);
      return;
    }
    if (e < 0) {
      this._target[n] = o;
      return;
    }
    l = e / s % 2, l = a && l > 1 ? 2 - l : l, l = this._easing(Math.min(1, Math.max(0, l))), this._target[n] = this._fn(o, r, l);
  }
  wait() {
    const t = this._promises || (this._promises = []);
    return new Promise((e, s) => {
      t.push({
        res: e,
        rej: s
      });
    });
  }
  _notify(t) {
    const e = t ? "res" : "rej", s = this._promises || [];
    for (let n = 0; n < s.length; n++)
      s[n][e]();
  }
}
class io {
  constructor(t, e) {
    this._chart = t, this._properties = /* @__PURE__ */ new Map(), this.configure(e);
  }
  configure(t) {
    if (!O(t))
      return;
    const e = Object.keys(N.animation), s = this._properties;
    Object.getOwnPropertyNames(t).forEach((n) => {
      const o = t[n];
      if (!O(o))
        return;
      const a = {};
      for (const r of e)
        a[r] = o[r];
      (V(o.properties) && o.properties || [
        n
      ]).forEach((r) => {
        (r === n || !s.has(r)) && s.set(r, a);
      });
    });
  }
  _animateOptions(t, e) {
    const s = e.options, n = Dr(t, s);
    if (!n)
      return [];
    const o = this._createAnimations(n, s);
    return s.$shared && wr(t.options.$animations, s).then(() => {
      t.options = s;
    }, () => {
    }), o;
  }
  _createAnimations(t, e) {
    const s = this._properties, n = [], o = t.$animations || (t.$animations = {}), a = Object.keys(e), r = Date.now();
    let l;
    for (l = a.length - 1; l >= 0; --l) {
      const c = a[l];
      if (c.charAt(0) === "$")
        continue;
      if (c === "options") {
        n.push(...this._animateOptions(t, e));
        continue;
      }
      const h = e[c];
      let d = o[c];
      const u = s.get(c);
      if (d)
        if (u && d.active()) {
          d.update(u, h, r);
          continue;
        } else
          d.cancel();
      if (!u || !u.duration) {
        t[c] = h;
        continue;
      }
      o[c] = d = new Sr(u, t, c, h), n.push(d);
    }
    return n;
  }
  update(t, e) {
    if (this._properties.size === 0) {
      Object.assign(t, e);
      return;
    }
    const s = this._createAnimations(t, e);
    if (s.length)
      return ft.add(this._chart, s), !0;
  }
}
function wr(i, t) {
  const e = [], s = Object.keys(t);
  for (let n = 0; n < s.length; n++) {
    const o = i[s[n]];
    o && o.active() && e.push(o.wait());
  }
  return Promise.all(e);
}
function Dr(i, t) {
  if (!t)
    return;
  let e = i.options;
  if (!e) {
    i.options = t;
    return;
  }
  return e.$shared && (i.options = e = Object.assign({}, e, {
    $shared: !1,
    $animations: {}
  })), e;
}
function Ds(i, t) {
  const e = i && i.options || {}, s = e.reverse, n = e.min === void 0 ? t : 0, o = e.max === void 0 ? t : 0;
  return {
    start: s ? o : n,
    end: s ? n : o
  };
}
function Cr(i, t, e) {
  if (e === !1)
    return !1;
  const s = Ds(i, e), n = Ds(t, e);
  return {
    top: n.end,
    right: s.end,
    bottom: n.start,
    left: s.start
  };
}
function Pr(i) {
  let t, e, s, n;
  return O(i) ? (t = i.top, e = i.right, s = i.bottom, n = i.left) : t = e = s = n = i, {
    top: t,
    right: e,
    bottom: s,
    left: n,
    disabled: i === !1
  };
}
function so(i, t) {
  const e = [], s = i._getSortedDatasetMetas(t);
  let n, o;
  for (n = 0, o = s.length; n < o; ++n)
    e.push(s[n].index);
  return e;
}
function Cs(i, t, e, s = {}) {
  const n = i.keys, o = s.mode === "single";
  let a, r, l, c;
  if (t === null)
    return;
  let h = !1;
  for (a = 0, r = n.length; a < r; ++a) {
    if (l = +n[a], l === e) {
      if (h = !0, s.all)
        continue;
      break;
    }
    c = i.values[l], W(c) && (o || t === 0 || ht(t) === ht(c)) && (t += c);
  }
  return !h && !s.all ? 0 : t;
}
function Ar(i, t) {
  const { iScale: e, vScale: s } = t, n = e.axis === "x" ? "x" : "y", o = s.axis === "x" ? "x" : "y", a = Object.keys(i), r = new Array(a.length);
  let l, c, h;
  for (l = 0, c = a.length; l < c; ++l)
    h = a[l], r[l] = {
      [n]: h,
      [o]: i[h]
    };
  return r;
}
function bi(i, t) {
  const e = i && i.options.stacked;
  return e || e === void 0 && t.stack !== void 0;
}
function Or(i, t, e) {
  return `${i.id}.${t.id}.${e.stack || e.type}`;
}
function Lr(i) {
  const { min: t, max: e, minDefined: s, maxDefined: n } = i.getUserBounds();
  return {
    min: s ? t : Number.NEGATIVE_INFINITY,
    max: n ? e : Number.POSITIVE_INFINITY
  };
}
function Tr(i, t, e) {
  const s = i[t] || (i[t] = {});
  return s[e] || (s[e] = {});
}
function Ps(i, t, e, s) {
  for (const n of t.getMatchingVisibleMetas(s).reverse()) {
    const o = i[n.index];
    if (e && o > 0 || !e && o < 0)
      return n.index;
  }
  return null;
}
function As(i, t) {
  const { chart: e, _cachedMeta: s } = i, n = e._stacks || (e._stacks = {}), { iScale: o, vScale: a, index: r } = s, l = o.axis, c = a.axis, h = Or(o, a, s), d = t.length;
  let u;
  for (let f = 0; f < d; ++f) {
    const g = t[f], { [l]: p, [c]: m } = g, b = g._stacks || (g._stacks = {});
    u = b[c] = Tr(n, h, p), u[r] = m, u._top = Ps(u, a, !0, s.type), u._bottom = Ps(u, a, !1, s.type);
    const _ = u._visualValues || (u._visualValues = {});
    _[r] = m;
  }
}
function _i(i, t) {
  const e = i.scales;
  return Object.keys(e).filter((s) => e[s].axis === t).shift();
}
function Rr(i, t) {
  return Lt(i, {
    active: !1,
    dataset: void 0,
    datasetIndex: t,
    index: t,
    mode: "default",
    type: "dataset"
  });
}
function Er(i, t, e) {
  return Lt(i, {
    active: !1,
    dataIndex: t,
    parsed: void 0,
    raw: void 0,
    element: e,
    index: t,
    mode: "default",
    type: "data"
  });
}
function re(i, t) {
  const e = i.controller.index, s = i.vScale && i.vScale.axis;
  if (s) {
    t = t || i._parsed;
    for (const n of t) {
      const o = n._stacks;
      if (!o || o[s] === void 0 || o[s][e] === void 0)
        return;
      delete o[s][e], o[s]._visualValues !== void 0 && o[s]._visualValues[e] !== void 0 && delete o[s]._visualValues[e];
    }
  }
}
const xi = (i) => i === "reset" || i === "none", Os = (i, t) => t ? i : Object.assign({}, i), Fr = (i, t, e) => i && !t.hidden && t._stacked && {
  keys: so(e, !0),
  values: null
};
class Tt {
  static defaults = {};
  static datasetElementType = null;
  static dataElementType = null;
  constructor(t, e) {
    this.chart = t, this._ctx = t.ctx, this.index = e, this._cachedDataOpts = {}, this._cachedMeta = this.getMeta(), this._type = this._cachedMeta.type, this.options = void 0, this._parsing = !1, this._data = void 0, this._objectData = void 0, this._sharedOptions = void 0, this._drawStart = void 0, this._drawCount = void 0, this.enableOptionSharing = !1, this.supportsDecimation = !1, this.$context = void 0, this._syncList = [], this.datasetElementType = new.target.datasetElementType, this.dataElementType = new.target.dataElementType, this.initialize();
  }
  initialize() {
    const t = this._cachedMeta;
    this.configure(), this.linkScales(), t._stacked = bi(t.vScale, t), this.addElements(), this.options.fill && !this.chart.isPluginEnabled("filler") && console.warn("Tried to use the 'fill' option without the 'Filler' plugin enabled. Please import and register the 'Filler' plugin and make sure it is not disabled in the options");
  }
  updateIndex(t) {
    this.index !== t && re(this._cachedMeta), this.index = t;
  }
  linkScales() {
    const t = this.chart, e = this._cachedMeta, s = this.getDataset(), n = (d, u, f, g) => d === "x" ? u : d === "r" ? g : f, o = e.xAxisID = D(s.xAxisID, _i(t, "x")), a = e.yAxisID = D(s.yAxisID, _i(t, "y")), r = e.rAxisID = D(s.rAxisID, _i(t, "r")), l = e.indexAxis, c = e.iAxisID = n(l, o, a, r), h = e.vAxisID = n(l, a, o, r);
    e.xScale = this.getScaleForId(o), e.yScale = this.getScaleForId(a), e.rScale = this.getScaleForId(r), e.iScale = this.getScaleForId(c), e.vScale = this.getScaleForId(h);
  }
  getDataset() {
    return this.chart.data.datasets[this.index];
  }
  getMeta() {
    return this.chart.getDatasetMeta(this.index);
  }
  getScaleForId(t) {
    return this.chart.scales[t];
  }
  _getOtherScale(t) {
    const e = this._cachedMeta;
    return t === e.iScale ? e.vScale : e.iScale;
  }
  reset() {
    this._update("reset");
  }
  _destroy() {
    const t = this._cachedMeta;
    this._data && us(this._data, this), t._stacked && re(t);
  }
  _dataCheck() {
    const t = this.getDataset(), e = t.data || (t.data = []), s = this._data;
    if (O(e)) {
      const n = this._cachedMeta;
      this._data = Ar(e, n);
    } else if (s !== e) {
      if (s) {
        us(s, this);
        const n = this._cachedMeta;
        re(n), n._parsed = [];
      }
      e && Object.isExtensible(e) && xa(e, this), this._syncList = [], this._data = e;
    }
  }
  addElements() {
    const t = this._cachedMeta;
    this._dataCheck(), this.datasetElementType && (t.dataset = new this.datasetElementType());
  }
  buildOrUpdateElements(t) {
    const e = this._cachedMeta, s = this.getDataset();
    let n = !1;
    this._dataCheck();
    const o = e._stacked;
    e._stacked = bi(e.vScale, e), e.stack !== s.stack && (n = !0, re(e), e.stack = s.stack), this._resyncElements(t), (n || o !== e._stacked) && (As(this, e._parsed), e._stacked = bi(e.vScale, e));
  }
  configure() {
    const t = this.chart.config, e = t.datasetScopeKeys(this._type), s = t.getOptionScopes(this.getDataset(), e, !0);
    this.options = t.createResolver(s, this.getContext()), this._parsing = this.options.parsing, this._cachedDataOpts = {};
  }
  parse(t, e) {
    const { _cachedMeta: s, _data: n } = this, { iScale: o, _stacked: a } = s, r = o.axis;
    let l = t === 0 && e === n.length ? !0 : s._sorted, c = t > 0 && s._parsed[t - 1], h, d, u;
    if (this._parsing === !1)
      s._parsed = n, s._sorted = !0, u = n;
    else {
      V(n[t]) ? u = this.parseArrayData(s, n, t, e) : O(n[t]) ? u = this.parseObjectData(s, n, t, e) : u = this.parsePrimitiveData(s, n, t, e);
      const f = () => d[r] === null || c && d[r] < c[r];
      for (h = 0; h < e; ++h)
        s._parsed[h + t] = d = u[h], l && (f() && (l = !1), c = d);
      s._sorted = l;
    }
    a && As(this, u);
  }
  parsePrimitiveData(t, e, s, n) {
    const { iScale: o, vScale: a } = t, r = o.axis, l = a.axis, c = o.getLabels(), h = o === a, d = new Array(n);
    let u, f, g;
    for (u = 0, f = n; u < f; ++u)
      g = u + s, d[u] = {
        [r]: h || o.parse(c[g], g),
        [l]: a.parse(e[g], g)
      };
    return d;
  }
  parseArrayData(t, e, s, n) {
    const { xScale: o, yScale: a } = t, r = new Array(n);
    let l, c, h, d;
    for (l = 0, c = n; l < c; ++l)
      h = l + s, d = e[h], r[l] = {
        x: o.parse(d[0], h),
        y: a.parse(d[1], h)
      };
    return r;
  }
  parseObjectData(t, e, s, n) {
    const { xScale: o, yScale: a } = t, { xAxisKey: r = "x", yAxisKey: l = "y" } = this._parsing, c = new Array(n);
    let h, d, u, f;
    for (h = 0, d = n; h < d; ++h)
      u = h + s, f = e[u], c[h] = {
        x: o.parse(At(f, r), u),
        y: a.parse(At(f, l), u)
      };
    return c;
  }
  getParsed(t) {
    return this._cachedMeta._parsed[t];
  }
  getDataElement(t) {
    return this._cachedMeta.data[t];
  }
  applyStack(t, e, s) {
    const n = this.chart, o = this._cachedMeta, a = e[t.axis], r = {
      keys: so(n, !0),
      values: e._stacks[t.axis]._visualValues
    };
    return Cs(r, a, o.index, {
      mode: s
    });
  }
  updateRangeFromParsed(t, e, s, n) {
    const o = s[e.axis];
    let a = o === null ? NaN : o;
    const r = n && s._stacks[e.axis];
    n && r && (n.values = r, a = Cs(n, o, this._cachedMeta.index)), t.min = Math.min(t.min, a), t.max = Math.max(t.max, a);
  }
  getMinMax(t, e) {
    const s = this._cachedMeta, n = s._parsed, o = s._sorted && t === s.iScale, a = n.length, r = this._getOtherScale(t), l = Fr(e, s, this.chart), c = {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY
    }, { min: h, max: d } = Lr(r);
    let u, f;
    function g() {
      f = n[u];
      const p = f[r.axis];
      return !W(f[t.axis]) || h > p || d < p;
    }
    for (u = 0; u < a && !(!g() && (this.updateRangeFromParsed(c, t, f, l), o)); ++u)
      ;
    if (o) {
      for (u = a - 1; u >= 0; --u)
        if (!g()) {
          this.updateRangeFromParsed(c, t, f, l);
          break;
        }
    }
    return c;
  }
  getAllParsedValues(t) {
    const e = this._cachedMeta._parsed, s = [];
    let n, o, a;
    for (n = 0, o = e.length; n < o; ++n)
      a = e[n][t.axis], W(a) && s.push(a);
    return s;
  }
  getMaxOverflow() {
    return !1;
  }
  getLabelAndValue(t) {
    const e = this._cachedMeta, s = e.iScale, n = e.vScale, o = this.getParsed(t);
    return {
      label: s ? "" + s.getLabelForValue(o[s.axis]) : "",
      value: n ? "" + n.getLabelForValue(o[n.axis]) : ""
    };
  }
  _update(t) {
    const e = this._cachedMeta;
    this.update(t || "default"), e._clip = Pr(D(this.options.clip, Cr(e.xScale, e.yScale, this.getMaxOverflow())));
  }
  update(t) {
  }
  draw() {
    const t = this._ctx, e = this.chart, s = this._cachedMeta, n = s.data || [], o = e.chartArea, a = [], r = this._drawStart || 0, l = this._drawCount || n.length - r, c = this.options.drawActiveElementsOnTop;
    let h;
    for (s.dataset && s.dataset.draw(t, o, r, l), h = r; h < r + l; ++h) {
      const d = n[h];
      d.hidden || (d.active && c ? a.push(d) : d.draw(t, o));
    }
    for (h = 0; h < a.length; ++h)
      a[h].draw(t, o);
  }
  getStyle(t, e) {
    const s = e ? "active" : "default";
    return t === void 0 && this._cachedMeta.dataset ? this.resolveDatasetElementOptions(s) : this.resolveDataElementOptions(t || 0, s);
  }
  getContext(t, e, s) {
    const n = this.getDataset();
    let o;
    if (t >= 0 && t < this._cachedMeta.data.length) {
      const a = this._cachedMeta.data[t];
      o = a.$context || (a.$context = Er(this.getContext(), t, a)), o.parsed = this.getParsed(t), o.raw = n.data[t], o.index = o.dataIndex = t;
    } else
      o = this.$context || (this.$context = Rr(this.chart.getContext(), this.index)), o.dataset = n, o.index = o.datasetIndex = this.index;
    return o.active = !!e, o.mode = s, o;
  }
  resolveDatasetElementOptions(t) {
    return this._resolveElementOptions(this.datasetElementType.id, t);
  }
  resolveDataElementOptions(t, e) {
    return this._resolveElementOptions(this.dataElementType.id, e, t);
  }
  _resolveElementOptions(t, e = "default", s) {
    const n = e === "active", o = this._cachedDataOpts, a = t + "-" + e, r = o[a], l = this.enableOptionSharing && Me(s);
    if (r)
      return Os(r, l);
    const c = this.chart.config, h = c.datasetElementScopeKeys(this._type, t), d = n ? [
      `${t}Hover`,
      "hover",
      t,
      ""
    ] : [
      t,
      ""
    ], u = c.getOptionScopes(this.getDataset(), h), f = Object.keys(N.elements[t]), g = () => this.getContext(s, n, e), p = c.resolveNamedOptions(u, f, g, d);
    return p.$shared && (p.$shared = l, o[a] = Object.freeze(Os(p, l))), p;
  }
  _resolveAnimations(t, e, s) {
    const n = this.chart, o = this._cachedDataOpts, a = `animation-${e}`, r = o[a];
    if (r)
      return r;
    let l;
    if (n.options.animation !== !1) {
      const h = this.chart.config, d = h.datasetAnimationScopeKeys(this._type, e), u = h.getOptionScopes(this.getDataset(), d);
      l = h.createResolver(u, this.getContext(t, s, e));
    }
    const c = new io(n, l && l.animations);
    return l && l._cacheable && (o[a] = Object.freeze(c)), c;
  }
  getSharedOptions(t) {
    if (t.$shared)
      return this._sharedOptions || (this._sharedOptions = Object.assign({}, t));
  }
  includeOptions(t, e) {
    return !e || xi(t) || this.chart._animationsDisabled;
  }
  _getSharedOptions(t, e) {
    const s = this.resolveDataElementOptions(t, e), n = this._sharedOptions, o = this.getSharedOptions(s), a = this.includeOptions(e, o) || o !== n;
    return this.updateSharedOptions(o, e, s), {
      sharedOptions: o,
      includeOptions: a
    };
  }
  updateElement(t, e, s, n) {
    xi(n) ? Object.assign(t, s) : this._resolveAnimations(e, n).update(t, s);
  }
  updateSharedOptions(t, e, s) {
    t && !xi(e) && this._resolveAnimations(void 0, e).update(t, s);
  }
  _setStyle(t, e, s, n) {
    t.active = n;
    const o = this.getStyle(e, n);
    this._resolveAnimations(e, s, n).update(t, {
      options: !n && this.getSharedOptions(o) || o
    });
  }
  removeHoverStyle(t, e, s) {
    this._setStyle(t, s, "active", !1);
  }
  setHoverStyle(t, e, s) {
    this._setStyle(t, s, "active", !0);
  }
  _removeDatasetHoverStyle() {
    const t = this._cachedMeta.dataset;
    t && this._setStyle(t, void 0, "active", !1);
  }
  _setDatasetHoverStyle() {
    const t = this._cachedMeta.dataset;
    t && this._setStyle(t, void 0, "active", !0);
  }
  _resyncElements(t) {
    const e = this._data, s = this._cachedMeta.data;
    for (const [r, l, c] of this._syncList)
      this[r](l, c);
    this._syncList = [];
    const n = s.length, o = e.length, a = Math.min(o, n);
    a && this.parse(0, a), o > n ? this._insertElements(n, o - n, t) : o < n && this._removeElements(o, n - o);
  }
  _insertElements(t, e, s = !0) {
    const n = this._cachedMeta, o = n.data, a = t + e;
    let r;
    const l = (c) => {
      for (c.length += e, r = c.length - 1; r >= a; r--)
        c[r] = c[r - e];
    };
    for (l(o), r = t; r < a; ++r)
      o[r] = new this.dataElementType();
    this._parsing && l(n._parsed), this.parse(t, e), s && this.updateElements(o, t, e, "reset");
  }
  updateElements(t, e, s, n) {
  }
  _removeElements(t, e) {
    const s = this._cachedMeta;
    if (this._parsing) {
      const n = s._parsed.splice(t, e);
      s._stacked && re(s, n);
    }
    s.data.splice(t, e);
  }
  _sync(t) {
    if (this._parsing)
      this._syncList.push(t);
    else {
      const [e, s, n] = t;
      this[e](s, n);
    }
    this.chart._dataChanges.push([
      this.index,
      ...t
    ]);
  }
  _onDataPush() {
    const t = arguments.length;
    this._sync([
      "_insertElements",
      this.getDataset().data.length - t,
      t
    ]);
  }
  _onDataPop() {
    this._sync([
      "_removeElements",
      this._cachedMeta.data.length - 1,
      1
    ]);
  }
  _onDataShift() {
    this._sync([
      "_removeElements",
      0,
      1
    ]);
  }
  _onDataSplice(t, e) {
    e && this._sync([
      "_removeElements",
      t,
      e
    ]);
    const s = arguments.length - 2;
    s && this._sync([
      "_insertElements",
      t,
      s
    ]);
  }
  _onDataUnshift() {
    this._sync([
      "_insertElements",
      0,
      arguments.length
    ]);
  }
}
function zr(i, t) {
  if (!i._cache.$bar) {
    const e = i.getMatchingVisibleMetas(t);
    let s = [];
    for (let n = 0, o = e.length; n < o; n++)
      s = s.concat(e[n].controller.getAllParsedValues(i));
    i._cache.$bar = zn(s.sort((n, o) => n - o));
  }
  return i._cache.$bar;
}
function Ir(i) {
  const t = i.iScale, e = zr(t, i.type);
  let s = t._length, n, o, a, r;
  const l = () => {
    a === 32767 || a === -32768 || (Me(r) && (s = Math.min(s, Math.abs(a - r) || s)), r = a);
  };
  for (n = 0, o = e.length; n < o; ++n)
    a = t.getPixelForValue(e[n]), l();
  for (r = void 0, n = 0, o = t.ticks.length; n < o; ++n)
    a = t.getPixelForTick(n), l();
  return s;
}
function Br(i, t, e, s) {
  const n = e.barThickness;
  let o, a;
  return A(n) ? (o = t.min * e.categoryPercentage, a = e.barPercentage) : (o = n * s, a = 1), {
    chunk: o / s,
    ratio: a,
    start: t.pixels[i] - o / 2
  };
}
function Vr(i, t, e, s) {
  const n = t.pixels, o = n[i];
  let a = i > 0 ? n[i - 1] : null, r = i < n.length - 1 ? n[i + 1] : null;
  const l = e.categoryPercentage;
  a === null && (a = o - (r === null ? t.end - t.start : r - o)), r === null && (r = o + o - a);
  const c = o - (o - Math.min(a, r)) / 2 * l;
  return {
    chunk: Math.abs(r - a) / 2 * l / s,
    ratio: e.barPercentage,
    start: c
  };
}
function Nr(i, t, e, s) {
  const n = e.parse(i[0], s), o = e.parse(i[1], s), a = Math.min(n, o), r = Math.max(n, o);
  let l = a, c = r;
  Math.abs(a) > Math.abs(r) && (l = r, c = a), t[e.axis] = c, t._custom = {
    barStart: l,
    barEnd: c,
    start: n,
    end: o,
    min: a,
    max: r
  };
}
function no(i, t, e, s) {
  return V(i) ? Nr(i, t, e, s) : t[e.axis] = e.parse(i, s), t;
}
function Ls(i, t, e, s) {
  const n = i.iScale, o = i.vScale, a = n.getLabels(), r = n === o, l = [];
  let c, h, d, u;
  for (c = e, h = e + s; c < h; ++c)
    u = t[c], d = {}, d[n.axis] = r || n.parse(a[c], c), l.push(no(u, d, o, c));
  return l;
}
function yi(i) {
  return i && i.barStart !== void 0 && i.barEnd !== void 0;
}
function Wr(i, t, e) {
  return i !== 0 ? ht(i) : (t.isHorizontal() ? 1 : -1) * (t.min >= e ? 1 : -1);
}
function $r(i) {
  let t, e, s, n, o;
  return i.horizontal ? (t = i.base > i.x, e = "left", s = "right") : (t = i.base < i.y, e = "bottom", s = "top"), t ? (n = "end", o = "start") : (n = "start", o = "end"), {
    start: e,
    end: s,
    reverse: t,
    top: n,
    bottom: o
  };
}
function Hr(i, t, e, s) {
  let n = t.borderSkipped;
  const o = {};
  if (!n) {
    i.borderSkipped = o;
    return;
  }
  if (n === !0) {
    i.borderSkipped = {
      top: !0,
      right: !0,
      bottom: !0,
      left: !0
    };
    return;
  }
  const { start: a, end: r, reverse: l, top: c, bottom: h } = $r(i);
  n === "middle" && e && (i.enableBorderRadius = !0, (e._top || 0) === s ? n = c : (e._bottom || 0) === s ? n = h : (o[Ts(h, a, r, l)] = !0, n = c)), o[Ts(n, a, r, l)] = !0, i.borderSkipped = o;
}
function Ts(i, t, e, s) {
  return s ? (i = jr(i, t, e), i = Rs(i, e, t)) : i = Rs(i, t, e), i;
}
function jr(i, t, e) {
  return i === t ? e : i === e ? t : i;
}
function Rs(i, t, e) {
  return i === "start" ? t : i === "end" ? e : i;
}
function Yr(i, { inflateAmount: t }, e) {
  i.inflateAmount = t === "auto" ? e === 1 ? 0.33 : 0 : t;
}
class Xr extends Tt {
  static id = "bar";
  static defaults = {
    datasetElementType: !1,
    dataElementType: "bar",
    categoryPercentage: 0.8,
    barPercentage: 0.9,
    grouped: !0,
    animations: {
      numbers: {
        type: "number",
        properties: [
          "x",
          "y",
          "base",
          "width",
          "height"
        ]
      }
    }
  };
  static overrides = {
    scales: {
      _index_: {
        type: "category",
        offset: !0,
        grid: {
          offset: !0
        }
      },
      _value_: {
        type: "linear",
        beginAtZero: !0
      }
    }
  };
  parsePrimitiveData(t, e, s, n) {
    return Ls(t, e, s, n);
  }
  parseArrayData(t, e, s, n) {
    return Ls(t, e, s, n);
  }
  parseObjectData(t, e, s, n) {
    const { iScale: o, vScale: a } = t, { xAxisKey: r = "x", yAxisKey: l = "y" } = this._parsing, c = o.axis === "x" ? r : l, h = a.axis === "x" ? r : l, d = [];
    let u, f, g, p;
    for (u = s, f = s + n; u < f; ++u)
      p = e[u], g = {}, g[o.axis] = o.parse(At(p, c), u), d.push(no(At(p, h), g, a, u));
    return d;
  }
  updateRangeFromParsed(t, e, s, n) {
    super.updateRangeFromParsed(t, e, s, n);
    const o = s._custom;
    o && e === this._cachedMeta.vScale && (t.min = Math.min(t.min, o.min), t.max = Math.max(t.max, o.max));
  }
  getMaxOverflow() {
    return 0;
  }
  getLabelAndValue(t) {
    const e = this._cachedMeta, { iScale: s, vScale: n } = e, o = this.getParsed(t), a = o._custom, r = yi(a) ? "[" + a.start + ", " + a.end + "]" : "" + n.getLabelForValue(o[n.axis]);
    return {
      label: "" + s.getLabelForValue(o[s.axis]),
      value: r
    };
  }
  initialize() {
    this.enableOptionSharing = !0, super.initialize();
    const t = this._cachedMeta;
    t.stack = this.getDataset().stack;
  }
  update(t) {
    const e = this._cachedMeta;
    this.updateElements(e.data, 0, e.data.length, t);
  }
  updateElements(t, e, s, n) {
    const o = n === "reset", { index: a, _cachedMeta: { vScale: r } } = this, l = r.getBasePixel(), c = r.isHorizontal(), h = this._getRuler(), { sharedOptions: d, includeOptions: u } = this._getSharedOptions(e, n);
    for (let f = e; f < e + s; f++) {
      const g = this.getParsed(f), p = o || A(g[r.axis]) ? {
        base: l,
        head: l
      } : this._calculateBarValuePixels(f), m = this._calculateBarIndexPixels(f, h), b = (g._stacks || {})[r.axis], _ = {
        horizontal: c,
        base: p.base,
        enableBorderRadius: !b || yi(g._custom) || a === b._top || a === b._bottom,
        x: c ? p.head : m.center,
        y: c ? m.center : p.head,
        height: c ? m.size : Math.abs(p.size),
        width: c ? Math.abs(p.size) : m.size
      };
      u && (_.options = d || this.resolveDataElementOptions(f, t[f].active ? "active" : n));
      const v = _.options || t[f].options;
      Hr(_, v, b, a), Yr(_, v, h.ratio), this.updateElement(t[f], f, _, n);
    }
  }
  _getStacks(t, e) {
    const { iScale: s } = this._cachedMeta, n = s.getMatchingVisibleMetas(this._type).filter((h) => h.controller.options.grouped), o = s.options.stacked, a = [], r = this._cachedMeta.controller.getParsed(e), l = r && r[s.axis], c = (h) => {
      const d = h._parsed.find((f) => f[s.axis] === l), u = d && d[h.vScale.axis];
      if (A(u) || isNaN(u))
        return !0;
    };
    for (const h of n)
      if (!(e !== void 0 && c(h)) && ((o === !1 || a.indexOf(h.stack) === -1 || o === void 0 && h.stack === void 0) && a.push(h.stack), h.index === t))
        break;
    return a.length || a.push(void 0), a;
  }
  _getStackCount(t) {
    return this._getStacks(void 0, t).length;
  }
  _getAxisCount() {
    return this._getAxis().length;
  }
  getFirstScaleIdForIndexAxis() {
    const t = this.chart.scales, e = this.chart.options.indexAxis;
    return Object.keys(t).filter((s) => t[s].axis === e).shift();
  }
  _getAxis() {
    const t = {}, e = this.getFirstScaleIdForIndexAxis();
    for (const s of this.chart.data.datasets)
      t[D(this.chart.options.indexAxis === "x" ? s.xAxisID : s.yAxisID, e)] = !0;
    return Object.keys(t);
  }
  _getStackIndex(t, e, s) {
    const n = this._getStacks(t, s), o = e !== void 0 ? n.indexOf(e) : -1;
    return o === -1 ? n.length - 1 : o;
  }
  _getRuler() {
    const t = this.options, e = this._cachedMeta, s = e.iScale, n = [];
    let o, a;
    for (o = 0, a = e.data.length; o < a; ++o)
      n.push(s.getPixelForValue(this.getParsed(o)[s.axis], o));
    const r = t.barThickness;
    return {
      min: r || Ir(e),
      pixels: n,
      start: s._startPixel,
      end: s._endPixel,
      stackCount: this._getStackCount(),
      scale: s,
      grouped: t.grouped,
      ratio: r ? 1 : t.categoryPercentage * t.barPercentage
    };
  }
  _calculateBarValuePixels(t) {
    const { _cachedMeta: { vScale: e, _stacked: s, index: n }, options: { base: o, minBarLength: a } } = this, r = o || 0, l = this.getParsed(t), c = l._custom, h = yi(c);
    let d = l[e.axis], u = 0, f = s ? this.applyStack(e, l, s) : d, g, p;
    f !== d && (u = f - d, f = d), h && (d = c.barStart, f = c.barEnd - c.barStart, d !== 0 && ht(d) !== ht(c.barEnd) && (u = 0), u += d);
    const m = !A(o) && !h ? o : u;
    let b = e.getPixelForValue(m);
    if (this.chart.getDataVisibility(t) ? g = e.getPixelForValue(u + f) : g = b, p = g - b, Math.abs(p) < a) {
      p = Wr(p, e, r) * a, d === r && (b -= p / 2);
      const _ = e.getPixelForDecimal(0), v = e.getPixelForDecimal(1), y = Math.min(_, v), x = Math.max(_, v);
      b = Math.max(Math.min(b, x), y), g = b + p, s && !h && (l._stacks[e.axis]._visualValues[n] = e.getValueForPixel(g) - e.getValueForPixel(b));
    }
    if (b === e.getPixelForValue(r)) {
      const _ = ht(p) * e.getLineWidthForValue(r) / 2;
      b += _, p -= _;
    }
    return {
      size: p,
      base: b,
      head: g,
      center: g + p / 2
    };
  }
  _calculateBarIndexPixels(t, e) {
    const s = e.scale, n = this.options, o = n.skipNull, a = D(n.maxBarThickness, 1 / 0);
    let r, l;
    const c = this._getAxisCount();
    if (e.grouped) {
      const h = o ? this._getStackCount(t) : e.stackCount, d = n.barThickness === "flex" ? Vr(t, e, n, h * c) : Br(t, e, n, h * c), u = this.chart.options.indexAxis === "x" ? this.getDataset().xAxisID : this.getDataset().yAxisID, f = this._getAxis().indexOf(D(u, this.getFirstScaleIdForIndexAxis())), g = this._getStackIndex(this.index, this._cachedMeta.stack, o ? t : void 0) + f;
      r = d.start + d.chunk * g + d.chunk / 2, l = Math.min(a, d.chunk * d.ratio);
    } else
      r = s.getPixelForValue(this.getParsed(t)[s.axis], t), l = Math.min(a, e.min * e.ratio);
    return {
      base: r - l / 2,
      head: r + l / 2,
      center: r,
      size: l
    };
  }
  draw() {
    const t = this._cachedMeta, e = t.vScale, s = t.data, n = s.length;
    let o = 0;
    for (; o < n; ++o)
      this.getParsed(o)[e.axis] !== null && !s[o].hidden && s[o].draw(this._ctx);
  }
}
class Ur extends Tt {
  static id = "bubble";
  static defaults = {
    datasetElementType: !1,
    dataElementType: "point",
    animations: {
      numbers: {
        type: "number",
        properties: [
          "x",
          "y",
          "borderWidth",
          "radius"
        ]
      }
    }
  };
  static overrides = {
    scales: {
      x: {
        type: "linear"
      },
      y: {
        type: "linear"
      }
    }
  };
  initialize() {
    this.enableOptionSharing = !0, super.initialize();
  }
  parsePrimitiveData(t, e, s, n) {
    const o = super.parsePrimitiveData(t, e, s, n);
    for (let a = 0; a < o.length; a++)
      o[a]._custom = this.resolveDataElementOptions(a + s).radius;
    return o;
  }
  parseArrayData(t, e, s, n) {
    const o = super.parseArrayData(t, e, s, n);
    for (let a = 0; a < o.length; a++) {
      const r = e[s + a];
      o[a]._custom = D(r[2], this.resolveDataElementOptions(a + s).radius);
    }
    return o;
  }
  parseObjectData(t, e, s, n) {
    const o = super.parseObjectData(t, e, s, n);
    for (let a = 0; a < o.length; a++) {
      const r = e[s + a];
      o[a]._custom = D(r && r.r && +r.r, this.resolveDataElementOptions(a + s).radius);
    }
    return o;
  }
  getMaxOverflow() {
    const t = this._cachedMeta.data;
    let e = 0;
    for (let s = t.length - 1; s >= 0; --s)
      e = Math.max(e, t[s].size(this.resolveDataElementOptions(s)) / 2);
    return e > 0 && e;
  }
  getLabelAndValue(t) {
    const e = this._cachedMeta, s = this.chart.data.labels || [], { xScale: n, yScale: o } = e, a = this.getParsed(t), r = n.getLabelForValue(a.x), l = o.getLabelForValue(a.y), c = a._custom;
    return {
      label: s[t] || "",
      value: "(" + r + ", " + l + (c ? ", " + c : "") + ")"
    };
  }
  update(t) {
    const e = this._cachedMeta.data;
    this.updateElements(e, 0, e.length, t);
  }
  updateElements(t, e, s, n) {
    const o = n === "reset", { iScale: a, vScale: r } = this._cachedMeta, { sharedOptions: l, includeOptions: c } = this._getSharedOptions(e, n), h = a.axis, d = r.axis;
    for (let u = e; u < e + s; u++) {
      const f = t[u], g = !o && this.getParsed(u), p = {}, m = p[h] = o ? a.getPixelForDecimal(0.5) : a.getPixelForValue(g[h]), b = p[d] = o ? r.getBasePixel() : r.getPixelForValue(g[d]);
      p.skip = isNaN(m) || isNaN(b), c && (p.options = l || this.resolveDataElementOptions(u, f.active ? "active" : n), o && (p.options.radius = 0)), this.updateElement(f, u, p, n);
    }
  }
  resolveDataElementOptions(t, e) {
    const s = this.getParsed(t);
    let n = super.resolveDataElementOptions(t, e);
    n.$shared && (n = Object.assign({}, n, {
      $shared: !1
    }));
    const o = n.radius;
    return e !== "active" && (n.radius = 0), n.radius += D(s && s._custom, o), n;
  }
}
function Kr(i, t, e) {
  let s = 1, n = 1, o = 0, a = 0;
  if (t < I) {
    const r = i, l = r + t, c = Math.cos(r), h = Math.sin(r), d = Math.cos(l), u = Math.sin(l), f = (v, y, x) => Se(v, r, l, !0) ? 1 : Math.max(y, y * e, x, x * e), g = (v, y, x) => Se(v, r, l, !0) ? -1 : Math.min(y, y * e, x, x * e), p = f(0, c, d), m = f(H, h, u), b = g(T, c, d), _ = g(T + H, h, u);
    s = (p - b) / 2, n = (m - _) / 2, o = -(p + b) / 2, a = -(m + _) / 2;
  }
  return {
    ratioX: s,
    ratioY: n,
    offsetX: o,
    offsetY: a
  };
}
class Qi extends Tt {
  static id = "doughnut";
  static defaults = {
    datasetElementType: !1,
    dataElementType: "arc",
    animation: {
      animateRotate: !0,
      animateScale: !1
    },
    animations: {
      numbers: {
        type: "number",
        properties: [
          "circumference",
          "endAngle",
          "innerRadius",
          "outerRadius",
          "startAngle",
          "x",
          "y",
          "offset",
          "borderWidth",
          "spacing"
        ]
      }
    },
    cutout: "50%",
    rotation: 0,
    circumference: 360,
    radius: "100%",
    spacing: 0,
    indexAxis: "r"
  };
  static descriptors = {
    _scriptable: (t) => t !== "spacing",
    _indexable: (t) => t !== "spacing" && !t.startsWith("borderDash") && !t.startsWith("hoverBorderDash")
  };
  static overrides = {
    aspectRatio: 1,
    plugins: {
      legend: {
        labels: {
          generateLabels(t) {
            const e = t.data, { labels: { pointStyle: s, textAlign: n, color: o, useBorderRadius: a, borderRadius: r } } = t.legend.options;
            return e.labels.length && e.datasets.length ? e.labels.map((l, c) => {
              const d = t.getDatasetMeta(0).controller.getStyle(c);
              return {
                text: l,
                fillStyle: d.backgroundColor,
                fontColor: o,
                hidden: !t.getDataVisibility(c),
                lineDash: d.borderDash,
                lineDashOffset: d.borderDashOffset,
                lineJoin: d.borderJoinStyle,
                lineWidth: d.borderWidth,
                strokeStyle: d.borderColor,
                textAlign: n,
                pointStyle: s,
                borderRadius: a && (r || d.borderRadius),
                index: c
              };
            }) : [];
          }
        },
        onClick(t, e, s) {
          s.chart.toggleDataVisibility(e.index), s.chart.update();
        }
      }
    }
  };
  constructor(t, e) {
    super(t, e), this.enableOptionSharing = !0, this.innerRadius = void 0, this.outerRadius = void 0, this.offsetX = void 0, this.offsetY = void 0;
  }
  linkScales() {
  }
  parse(t, e) {
    const s = this.getDataset().data, n = this._cachedMeta;
    if (this._parsing === !1)
      n._parsed = s;
    else {
      let o = (l) => +s[l];
      if (O(s[t])) {
        const { key: l = "value" } = this._parsing;
        o = (c) => +At(s[c], l);
      }
      let a, r;
      for (a = t, r = t + e; a < r; ++a)
        n._parsed[a] = o(a);
    }
  }
  _getRotation() {
    return rt(this.options.rotation - 90);
  }
  _getCircumference() {
    return rt(this.options.circumference);
  }
  _getRotationExtents() {
    let t = I, e = -I;
    for (let s = 0; s < this.chart.data.datasets.length; ++s)
      if (this.chart.isDatasetVisible(s) && this.chart.getDatasetMeta(s).type === this._type) {
        const n = this.chart.getDatasetMeta(s).controller, o = n._getRotation(), a = n._getCircumference();
        t = Math.min(t, o), e = Math.max(e, o + a);
      }
    return {
      rotation: t,
      circumference: e - t
    };
  }
  update(t) {
    const e = this.chart, { chartArea: s } = e, n = this._cachedMeta, o = n.data, a = this.getMaxBorderWidth() + this.getMaxOffset(o) + this.options.spacing, r = Math.max((Math.min(s.width, s.height) - a) / 2, 0), l = Math.min(na(this.options.cutout, r), 1), c = this._getRingWeight(this.index), { circumference: h, rotation: d } = this._getRotationExtents(), { ratioX: u, ratioY: f, offsetX: g, offsetY: p } = Kr(d, h, l), m = (s.width - a) / u, b = (s.height - a) / f, _ = Math.max(Math.min(m, b) / 2, 0), v = Ln(this.options.radius, _), y = Math.max(v * l, 0), x = (v - y) / this._getVisibleDatasetWeightTotal();
    this.offsetX = g * v, this.offsetY = p * v, n.total = this.calculateTotal(), this.outerRadius = v - x * this._getRingWeightOffset(this.index), this.innerRadius = Math.max(this.outerRadius - x * c, 0), this.updateElements(o, 0, o.length, t);
  }
  _circumference(t, e) {
    const s = this.options, n = this._cachedMeta, o = this._getCircumference();
    return e && s.animation.animateRotate || !this.chart.getDataVisibility(t) || n._parsed[t] === null || n.data[t].hidden ? 0 : this.calculateCircumference(n._parsed[t] * o / I);
  }
  updateElements(t, e, s, n) {
    const o = n === "reset", a = this.chart, r = a.chartArea, c = a.options.animation, h = (r.left + r.right) / 2, d = (r.top + r.bottom) / 2, u = o && c.animateScale, f = u ? 0 : this.innerRadius, g = u ? 0 : this.outerRadius, { sharedOptions: p, includeOptions: m } = this._getSharedOptions(e, n);
    let b = this._getRotation(), _;
    for (_ = 0; _ < e; ++_)
      b += this._circumference(_, o);
    for (_ = e; _ < e + s; ++_) {
      const v = this._circumference(_, o), y = t[_], x = {
        x: h + this.offsetX,
        y: d + this.offsetY,
        startAngle: b,
        endAngle: b + v,
        circumference: v,
        outerRadius: g,
        innerRadius: f
      };
      m && (x.options = p || this.resolveDataElementOptions(_, y.active ? "active" : n)), b += v, this.updateElement(y, _, x, n);
    }
  }
  calculateTotal() {
    const t = this._cachedMeta, e = t.data;
    let s = 0, n;
    for (n = 0; n < e.length; n++) {
      const o = t._parsed[n];
      o !== null && !isNaN(o) && this.chart.getDataVisibility(n) && !e[n].hidden && (s += Math.abs(o));
    }
    return s;
  }
  calculateCircumference(t) {
    const e = this._cachedMeta.total;
    return e > 0 && !isNaN(t) ? I * (Math.abs(t) / e) : 0;
  }
  getLabelAndValue(t) {
    const e = this._cachedMeta, s = this.chart, n = s.data.labels || [], o = Re(e._parsed[t], s.options.locale);
    return {
      label: n[t] || "",
      value: o
    };
  }
  getMaxBorderWidth(t) {
    let e = 0;
    const s = this.chart;
    let n, o, a, r, l;
    if (!t) {
      for (n = 0, o = s.data.datasets.length; n < o; ++n)
        if (s.isDatasetVisible(n)) {
          a = s.getDatasetMeta(n), t = a.data, r = a.controller;
          break;
        }
    }
    if (!t)
      return 0;
    for (n = 0, o = t.length; n < o; ++n)
      l = r.resolveDataElementOptions(n), l.borderAlign !== "inner" && (e = Math.max(e, l.borderWidth || 0, l.hoverBorderWidth || 0));
    return e;
  }
  getMaxOffset(t) {
    let e = 0;
    for (let s = 0, n = t.length; s < n; ++s) {
      const o = this.resolveDataElementOptions(s);
      e = Math.max(e, o.offset || 0, o.hoverOffset || 0);
    }
    return e;
  }
  _getRingWeightOffset(t) {
    let e = 0;
    for (let s = 0; s < t; ++s)
      this.chart.isDatasetVisible(s) && (e += this._getRingWeight(s));
    return e;
  }
  _getRingWeight(t) {
    return Math.max(D(this.chart.data.datasets[t].weight, 1), 0);
  }
  _getVisibleDatasetWeightTotal() {
    return this._getRingWeightOffset(this.chart.data.datasets.length) || 1;
  }
}
class Gr extends Tt {
  static id = "line";
  static defaults = {
    datasetElementType: "line",
    dataElementType: "point",
    showLine: !0,
    spanGaps: !1
  };
  static overrides = {
    scales: {
      _index_: {
        type: "category"
      },
      _value_: {
        type: "linear"
      }
    }
  };
  initialize() {
    this.enableOptionSharing = !0, this.supportsDecimation = !0, super.initialize();
  }
  update(t) {
    const e = this._cachedMeta, { dataset: s, data: n = [], _dataset: o } = e, a = this.chart._animationsDisabled;
    let { start: r, count: l } = Vn(e, n, a);
    this._drawStart = r, this._drawCount = l, Nn(e) && (r = 0, l = n.length), s._chart = this.chart, s._datasetIndex = this.index, s._decimated = !!o._decimated, s.points = n;
    const c = this.resolveDatasetElementOptions(t);
    this.options.showLine || (c.borderWidth = 0), c.segment = this.options.segment, this.updateElement(s, void 0, {
      animated: !a,
      options: c
    }, t), this.updateElements(n, r, l, t);
  }
  updateElements(t, e, s, n) {
    const o = n === "reset", { iScale: a, vScale: r, _stacked: l, _dataset: c } = this._cachedMeta, { sharedOptions: h, includeOptions: d } = this._getSharedOptions(e, n), u = a.axis, f = r.axis, { spanGaps: g, segment: p } = this.options, m = Qt(g) ? g : Number.POSITIVE_INFINITY, b = this.chart._animationsDisabled || o || n === "none", _ = e + s, v = t.length;
    let y = e > 0 && this.getParsed(e - 1);
    for (let x = 0; x < v; ++x) {
      const k = t[x], M = b ? k : {};
      if (x < e || x >= _) {
        M.skip = !0;
        continue;
      }
      const S = this.getParsed(x), w = A(S[f]), C = M[u] = a.getPixelForValue(S[u], x), P = M[f] = o || w ? r.getBasePixel() : r.getPixelForValue(l ? this.applyStack(r, S, l) : S[f], x);
      M.skip = isNaN(C) || isNaN(P) || w, M.stop = x > 0 && Math.abs(S[u] - y[u]) > m, p && (M.parsed = S, M.raw = c.data[x]), d && (M.options = h || this.resolveDataElementOptions(x, k.active ? "active" : n)), b || this.updateElement(k, x, M, n), y = S;
    }
  }
  getMaxOverflow() {
    const t = this._cachedMeta, e = t.dataset, s = e.options && e.options.borderWidth || 0, n = t.data || [];
    if (!n.length)
      return s;
    const o = n[0].size(this.resolveDataElementOptions(0)), a = n[n.length - 1].size(this.resolveDataElementOptions(n.length - 1));
    return Math.max(s, o, a) / 2;
  }
  draw() {
    const t = this._cachedMeta;
    t.dataset.updateControlPoints(this.chart.chartArea, t.iScale.axis), super.draw();
  }
}
class oo extends Tt {
  static id = "polarArea";
  static defaults = {
    dataElementType: "arc",
    animation: {
      animateRotate: !0,
      animateScale: !0
    },
    animations: {
      numbers: {
        type: "number",
        properties: [
          "x",
          "y",
          "startAngle",
          "endAngle",
          "innerRadius",
          "outerRadius"
        ]
      }
    },
    indexAxis: "r",
    startAngle: 0
  };
  static overrides = {
    aspectRatio: 1,
    plugins: {
      legend: {
        labels: {
          generateLabels(t) {
            const e = t.data;
            if (e.labels.length && e.datasets.length) {
              const { labels: { pointStyle: s, color: n } } = t.legend.options;
              return e.labels.map((o, a) => {
                const l = t.getDatasetMeta(0).controller.getStyle(a);
                return {
                  text: o,
                  fillStyle: l.backgroundColor,
                  strokeStyle: l.borderColor,
                  fontColor: n,
                  lineWidth: l.borderWidth,
                  pointStyle: s,
                  hidden: !t.getDataVisibility(a),
                  index: a
                };
              });
            }
            return [];
          }
        },
        onClick(t, e, s) {
          s.chart.toggleDataVisibility(e.index), s.chart.update();
        }
      }
    },
    scales: {
      r: {
        type: "radialLinear",
        angleLines: {
          display: !1
        },
        beginAtZero: !0,
        grid: {
          circular: !0
        },
        pointLabels: {
          display: !1
        },
        startAngle: 0
      }
    }
  };
  constructor(t, e) {
    super(t, e), this.innerRadius = void 0, this.outerRadius = void 0;
  }
  getLabelAndValue(t) {
    const e = this._cachedMeta, s = this.chart, n = s.data.labels || [], o = Re(e._parsed[t].r, s.options.locale);
    return {
      label: n[t] || "",
      value: o
    };
  }
  parseObjectData(t, e, s, n) {
    return Kn.bind(this)(t, e, s, n);
  }
  update(t) {
    const e = this._cachedMeta.data;
    this._updateRadius(), this.updateElements(e, 0, e.length, t);
  }
  getMinMax() {
    const t = this._cachedMeta, e = {
      min: Number.POSITIVE_INFINITY,
      max: Number.NEGATIVE_INFINITY
    };
    return t.data.forEach((s, n) => {
      const o = this.getParsed(n).r;
      !isNaN(o) && this.chart.getDataVisibility(n) && (o < e.min && (e.min = o), o > e.max && (e.max = o));
    }), e;
  }
  _updateRadius() {
    const t = this.chart, e = t.chartArea, s = t.options, n = Math.min(e.right - e.left, e.bottom - e.top), o = Math.max(n / 2, 0), a = Math.max(s.cutoutPercentage ? o / 100 * s.cutoutPercentage : 1, 0), r = (o - a) / t.getVisibleDatasetCount();
    this.outerRadius = o - r * this.index, this.innerRadius = this.outerRadius - r;
  }
  updateElements(t, e, s, n) {
    const o = n === "reset", a = this.chart, l = a.options.animation, c = this._cachedMeta.rScale, h = c.xCenter, d = c.yCenter, u = c.getIndexAngle(0) - 0.5 * T;
    let f = u, g;
    const p = 360 / this.countVisibleElements();
    for (g = 0; g < e; ++g)
      f += this._computeAngle(g, n, p);
    for (g = e; g < e + s; g++) {
      const m = t[g];
      let b = f, _ = f + this._computeAngle(g, n, p), v = a.getDataVisibility(g) ? c.getDistanceFromCenterForValue(this.getParsed(g).r) : 0;
      f = _, o && (l.animateScale && (v = 0), l.animateRotate && (b = _ = u));
      const y = {
        x: h,
        y: d,
        innerRadius: 0,
        outerRadius: v,
        startAngle: b,
        endAngle: _,
        options: this.resolveDataElementOptions(g, m.active ? "active" : n)
      };
      this.updateElement(m, g, y, n);
    }
  }
  countVisibleElements() {
    const t = this._cachedMeta;
    let e = 0;
    return t.data.forEach((s, n) => {
      !isNaN(this.getParsed(n).r) && this.chart.getDataVisibility(n) && e++;
    }), e;
  }
  _computeAngle(t, e, s) {
    return this.chart.getDataVisibility(t) ? rt(this.resolveDataElementOptions(t, e).angle || s) : 0;
  }
}
class qr extends Qi {
  static id = "pie";
  static defaults = {
    cutout: 0,
    rotation: 0,
    circumference: 360,
    radius: "100%"
  };
}
class Zr extends Tt {
  static id = "radar";
  static defaults = {
    datasetElementType: "line",
    dataElementType: "point",
    indexAxis: "r",
    showLine: !0,
    elements: {
      line: {
        fill: "start"
      }
    }
  };
  static overrides = {
    aspectRatio: 1,
    scales: {
      r: {
        type: "radialLinear"
      }
    }
  };
  getLabelAndValue(t) {
    const e = this._cachedMeta.vScale, s = this.getParsed(t);
    return {
      label: e.getLabels()[t],
      value: "" + e.getLabelForValue(s[e.axis])
    };
  }
  parseObjectData(t, e, s, n) {
    return Kn.bind(this)(t, e, s, n);
  }
  update(t) {
    const e = this._cachedMeta, s = e.dataset, n = e.data || [], o = e.iScale.getLabels();
    if (s.points = n, t !== "resize") {
      const a = this.resolveDatasetElementOptions(t);
      this.options.showLine || (a.borderWidth = 0);
      const r = {
        _loop: !0,
        _fullLoop: o.length === n.length,
        options: a
      };
      this.updateElement(s, void 0, r, t);
    }
    this.updateElements(n, 0, n.length, t);
  }
  updateElements(t, e, s, n) {
    const o = this._cachedMeta.rScale, a = n === "reset";
    for (let r = e; r < e + s; r++) {
      const l = t[r], c = this.resolveDataElementOptions(r, l.active ? "active" : n), h = o.getPointPositionForValue(r, this.getParsed(r).r), d = a ? o.xCenter : h.x, u = a ? o.yCenter : h.y, f = {
        x: d,
        y: u,
        angle: h.angle,
        skip: isNaN(d) || isNaN(u),
        options: c
      };
      this.updateElement(l, r, f, n);
    }
  }
}
class Jr extends Tt {
  static id = "scatter";
  static defaults = {
    datasetElementType: !1,
    dataElementType: "point",
    showLine: !1,
    fill: !1
  };
  static overrides = {
    interaction: {
      mode: "point"
    },
    scales: {
      x: {
        type: "linear"
      },
      y: {
        type: "linear"
      }
    }
  };
  getLabelAndValue(t) {
    const e = this._cachedMeta, s = this.chart.data.labels || [], { xScale: n, yScale: o } = e, a = this.getParsed(t), r = n.getLabelForValue(a.x), l = o.getLabelForValue(a.y);
    return {
      label: s[t] || "",
      value: "(" + r + ", " + l + ")"
    };
  }
  update(t) {
    const e = this._cachedMeta, { data: s = [] } = e, n = this.chart._animationsDisabled;
    let { start: o, count: a } = Vn(e, s, n);
    if (this._drawStart = o, this._drawCount = a, Nn(e) && (o = 0, a = s.length), this.options.showLine) {
      this.datasetElementType || this.addElements();
      const { dataset: r, _dataset: l } = e;
      r._chart = this.chart, r._datasetIndex = this.index, r._decimated = !!l._decimated, r.points = s;
      const c = this.resolveDatasetElementOptions(t);
      c.segment = this.options.segment, this.updateElement(r, void 0, {
        animated: !n,
        options: c
      }, t);
    } else this.datasetElementType && (delete e.dataset, this.datasetElementType = !1);
    this.updateElements(s, o, a, t);
  }
  addElements() {
    const { showLine: t } = this.options;
    !this.datasetElementType && t && (this.datasetElementType = this.chart.registry.getElement("line")), super.addElements();
  }
  updateElements(t, e, s, n) {
    const o = n === "reset", { iScale: a, vScale: r, _stacked: l, _dataset: c } = this._cachedMeta, h = this.resolveDataElementOptions(e, n), d = this.getSharedOptions(h), u = this.includeOptions(n, d), f = a.axis, g = r.axis, { spanGaps: p, segment: m } = this.options, b = Qt(p) ? p : Number.POSITIVE_INFINITY, _ = this.chart._animationsDisabled || o || n === "none";
    let v = e > 0 && this.getParsed(e - 1);
    for (let y = e; y < e + s; ++y) {
      const x = t[y], k = this.getParsed(y), M = _ ? x : {}, S = A(k[g]), w = M[f] = a.getPixelForValue(k[f], y), C = M[g] = o || S ? r.getBasePixel() : r.getPixelForValue(l ? this.applyStack(r, k, l) : k[g], y);
      M.skip = isNaN(w) || isNaN(C) || S, M.stop = y > 0 && Math.abs(k[f] - v[f]) > b, m && (M.parsed = k, M.raw = c.data[y]), u && (M.options = d || this.resolveDataElementOptions(y, x.active ? "active" : n)), _ || this.updateElement(x, y, M, n), v = k;
    }
    this.updateSharedOptions(d, n, h);
  }
  getMaxOverflow() {
    const t = this._cachedMeta, e = t.data || [];
    if (!this.options.showLine) {
      let r = 0;
      for (let l = e.length - 1; l >= 0; --l)
        r = Math.max(r, e[l].size(this.resolveDataElementOptions(l)) / 2);
      return r > 0 && r;
    }
    const s = t.dataset, n = s.options && s.options.borderWidth || 0;
    if (!e.length)
      return n;
    const o = e[0].size(this.resolveDataElementOptions(0)), a = e[e.length - 1].size(this.resolveDataElementOptions(e.length - 1));
    return Math.max(n, o, a) / 2;
  }
}
var Qr = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  BarController: Xr,
  BubbleController: Ur,
  DoughnutController: Qi,
  LineController: Gr,
  PieController: qr,
  PolarAreaController: oo,
  RadarController: Zr,
  ScatterController: Jr
});
function Bt() {
  throw new Error("This method is not implemented: Check that a complete date adapter is provided.");
}
class ts {
  /**
  * Override default date adapter methods.
  * Accepts type parameter to define options type.
  * @example
  * Chart._adapters._date.override<{myAdapterOption: string}>({
  *   init() {
  *     console.log(this.options.myAdapterOption);
  *   }
  * })
  */
  static override(t) {
    Object.assign(ts.prototype, t);
  }
  options;
  constructor(t) {
    this.options = t || {};
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  init() {
  }
  formats() {
    return Bt();
  }
  parse() {
    return Bt();
  }
  format() {
    return Bt();
  }
  add() {
    return Bt();
  }
  diff() {
    return Bt();
  }
  startOf() {
    return Bt();
  }
  endOf() {
    return Bt();
  }
}
var tl = {
  _date: ts
};
function el(i, t, e, s) {
  const { controller: n, data: o, _sorted: a } = i, r = n._cachedMeta.iScale, l = i.dataset && i.dataset.options ? i.dataset.options.spanGaps : null;
  if (r && t === r.axis && t !== "r" && a && o.length) {
    const c = r._reversePixels ? ba : bt;
    if (s) {
      if (n._sharedOptions) {
        const h = o[0], d = typeof h.getRange == "function" && h.getRange(t);
        if (d) {
          const u = c(o, t, e - d), f = c(o, t, e + d);
          return {
            lo: u.lo,
            hi: f.hi
          };
        }
      }
    } else {
      const h = c(o, t, e);
      if (l) {
        const { vScale: d } = n._cachedMeta, { _parsed: u } = i, f = u.slice(0, h.lo + 1).reverse().findIndex((p) => !A(p[d.axis]));
        h.lo -= Math.max(0, f);
        const g = u.slice(h.hi).findIndex((p) => !A(p[d.axis]));
        h.hi += Math.max(0, g);
      }
      return h;
    }
  }
  return {
    lo: 0,
    hi: o.length - 1
  };
}
function ci(i, t, e, s, n) {
  const o = i.getSortedVisibleDatasetMetas(), a = e[t];
  for (let r = 0, l = o.length; r < l; ++r) {
    const { index: c, data: h } = o[r], { lo: d, hi: u } = el(o[r], t, a, n);
    for (let f = d; f <= u; ++f) {
      const g = h[f];
      g.skip || s(g, c, f);
    }
  }
}
function il(i) {
  const t = i.indexOf("x") !== -1, e = i.indexOf("y") !== -1;
  return function(s, n) {
    const o = t ? Math.abs(s.x - n.x) : 0, a = e ? Math.abs(s.y - n.y) : 0;
    return Math.sqrt(Math.pow(o, 2) + Math.pow(a, 2));
  };
}
function vi(i, t, e, s, n) {
  const o = [];
  return !n && !i.isPointInArea(t) || ci(i, e, t, function(r, l, c) {
    !n && !_t(r, i.chartArea, 0) || r.inRange(t.x, t.y, s) && o.push({
      element: r,
      datasetIndex: l,
      index: c
    });
  }, !0), o;
}
function sl(i, t, e, s) {
  let n = [];
  function o(a, r, l) {
    const { startAngle: c, endAngle: h } = a.getProps([
      "startAngle",
      "endAngle"
    ], s), { angle: d } = En(a, {
      x: t.x,
      y: t.y
    });
    Se(d, c, h) && n.push({
      element: a,
      datasetIndex: r,
      index: l
    });
  }
  return ci(i, e, t, o), n;
}
function nl(i, t, e, s, n, o) {
  let a = [];
  const r = il(e);
  let l = Number.POSITIVE_INFINITY;
  function c(h, d, u) {
    const f = h.inRange(t.x, t.y, n);
    if (s && !f)
      return;
    const g = h.getCenterPoint(n);
    if (!(!!o || i.isPointInArea(g)) && !f)
      return;
    const m = r(t, g);
    m < l ? (a = [
      {
        element: h,
        datasetIndex: d,
        index: u
      }
    ], l = m) : m === l && a.push({
      element: h,
      datasetIndex: d,
      index: u
    });
  }
  return ci(i, e, t, c), a;
}
function ki(i, t, e, s, n, o) {
  return !o && !i.isPointInArea(t) ? [] : e === "r" && !s ? sl(i, t, e, n) : nl(i, t, e, s, n, o);
}
function Es(i, t, e, s, n) {
  const o = [], a = e === "x" ? "inXRange" : "inYRange";
  let r = !1;
  return ci(i, e, t, (l, c, h) => {
    l[a] && l[a](t[e], n) && (o.push({
      element: l,
      datasetIndex: c,
      index: h
    }), r = r || l.inRange(t.x, t.y, n));
  }), s && !r ? [] : o;
}
var ol = {
  modes: {
    index(i, t, e, s) {
      const n = Nt(t, i), o = e.axis || "x", a = e.includeInvisible || !1, r = e.intersect ? vi(i, n, o, s, a) : ki(i, n, o, !1, s, a), l = [];
      return r.length ? (i.getSortedVisibleDatasetMetas().forEach((c) => {
        const h = r[0].index, d = c.data[h];
        d && !d.skip && l.push({
          element: d,
          datasetIndex: c.index,
          index: h
        });
      }), l) : [];
    },
    dataset(i, t, e, s) {
      const n = Nt(t, i), o = e.axis || "xy", a = e.includeInvisible || !1;
      let r = e.intersect ? vi(i, n, o, s, a) : ki(i, n, o, !1, s, a);
      if (r.length > 0) {
        const l = r[0].datasetIndex, c = i.getDatasetMeta(l).data;
        r = [];
        for (let h = 0; h < c.length; ++h)
          r.push({
            element: c[h],
            datasetIndex: l,
            index: h
          });
      }
      return r;
    },
    point(i, t, e, s) {
      const n = Nt(t, i), o = e.axis || "xy", a = e.includeInvisible || !1;
      return vi(i, n, o, s, a);
    },
    nearest(i, t, e, s) {
      const n = Nt(t, i), o = e.axis || "xy", a = e.includeInvisible || !1;
      return ki(i, n, o, e.intersect, s, a);
    },
    x(i, t, e, s) {
      const n = Nt(t, i);
      return Es(i, n, "x", e.intersect, s);
    },
    y(i, t, e, s) {
      const n = Nt(t, i);
      return Es(i, n, "y", e.intersect, s);
    }
  }
};
const ao = [
  "left",
  "top",
  "right",
  "bottom"
];
function le(i, t) {
  return i.filter((e) => e.pos === t);
}
function Fs(i, t) {
  return i.filter((e) => ao.indexOf(e.pos) === -1 && e.box.axis === t);
}
function ce(i, t) {
  return i.sort((e, s) => {
    const n = t ? s : e, o = t ? e : s;
    return n.weight === o.weight ? n.index - o.index : n.weight - o.weight;
  });
}
function al(i) {
  const t = [];
  let e, s, n, o, a, r;
  for (e = 0, s = (i || []).length; e < s; ++e)
    n = i[e], { position: o, options: { stack: a, stackWeight: r = 1 } } = n, t.push({
      index: e,
      box: n,
      pos: o,
      horizontal: n.isHorizontal(),
      weight: n.weight,
      stack: a && o + a,
      stackWeight: r
    });
  return t;
}
function rl(i) {
  const t = {};
  for (const e of i) {
    const { stack: s, pos: n, stackWeight: o } = e;
    if (!s || !ao.includes(n))
      continue;
    const a = t[s] || (t[s] = {
      count: 0,
      placed: 0,
      weight: 0,
      size: 0
    });
    a.count++, a.weight += o;
  }
  return t;
}
function ll(i, t) {
  const e = rl(i), { vBoxMaxWidth: s, hBoxMaxHeight: n } = t;
  let o, a, r;
  for (o = 0, a = i.length; o < a; ++o) {
    r = i[o];
    const { fullSize: l } = r.box, c = e[r.stack], h = c && r.stackWeight / c.weight;
    r.horizontal ? (r.width = h ? h * s : l && t.availableWidth, r.height = n) : (r.width = s, r.height = h ? h * n : l && t.availableHeight);
  }
  return e;
}
function cl(i) {
  const t = al(i), e = ce(t.filter((c) => c.box.fullSize), !0), s = ce(le(t, "left"), !0), n = ce(le(t, "right")), o = ce(le(t, "top"), !0), a = ce(le(t, "bottom")), r = Fs(t, "x"), l = Fs(t, "y");
  return {
    fullSize: e,
    leftAndTop: s.concat(o),
    rightAndBottom: n.concat(l).concat(a).concat(r),
    chartArea: le(t, "chartArea"),
    vertical: s.concat(n).concat(l),
    horizontal: o.concat(a).concat(r)
  };
}
function zs(i, t, e, s) {
  return Math.max(i[e], t[e]) + Math.max(i[s], t[s]);
}
function ro(i, t) {
  i.top = Math.max(i.top, t.top), i.left = Math.max(i.left, t.left), i.bottom = Math.max(i.bottom, t.bottom), i.right = Math.max(i.right, t.right);
}
function hl(i, t, e, s) {
  const { pos: n, box: o } = e, a = i.maxPadding;
  if (!O(n)) {
    e.size && (i[n] -= e.size);
    const d = s[e.stack] || {
      size: 0,
      count: 1
    };
    d.size = Math.max(d.size, e.horizontal ? o.height : o.width), e.size = d.size / d.count, i[n] += e.size;
  }
  o.getPadding && ro(a, o.getPadding());
  const r = Math.max(0, t.outerWidth - zs(a, i, "left", "right")), l = Math.max(0, t.outerHeight - zs(a, i, "top", "bottom")), c = r !== i.w, h = l !== i.h;
  return i.w = r, i.h = l, e.horizontal ? {
    same: c,
    other: h
  } : {
    same: h,
    other: c
  };
}
function dl(i) {
  const t = i.maxPadding;
  function e(s) {
    const n = Math.max(t[s] - i[s], 0);
    return i[s] += n, n;
  }
  i.y += e("top"), i.x += e("left"), e("right"), e("bottom");
}
function ul(i, t) {
  const e = t.maxPadding;
  function s(n) {
    const o = {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    };
    return n.forEach((a) => {
      o[a] = Math.max(t[a], e[a]);
    }), o;
  }
  return s(i ? [
    "left",
    "right"
  ] : [
    "top",
    "bottom"
  ]);
}
function ge(i, t, e, s) {
  const n = [];
  let o, a, r, l, c, h;
  for (o = 0, a = i.length, c = 0; o < a; ++o) {
    r = i[o], l = r.box, l.update(r.width || t.w, r.height || t.h, ul(r.horizontal, t));
    const { same: d, other: u } = hl(t, e, r, s);
    c |= d && n.length, h = h || u, l.fullSize || n.push(r);
  }
  return c && ge(n, t, e, s) || h;
}
function We(i, t, e, s, n) {
  i.top = e, i.left = t, i.right = t + s, i.bottom = e + n, i.width = s, i.height = n;
}
function Is(i, t, e, s) {
  const n = e.padding;
  let { x: o, y: a } = t;
  for (const r of i) {
    const l = r.box, c = s[r.stack] || {
      placed: 0,
      weight: 1
    }, h = r.stackWeight / c.weight || 1;
    if (r.horizontal) {
      const d = t.w * h, u = c.size || l.height;
      Me(c.start) && (a = c.start), l.fullSize ? We(l, n.left, a, e.outerWidth - n.right - n.left, u) : We(l, t.left + c.placed, a, d, u), c.start = a, c.placed += d, a = l.bottom;
    } else {
      const d = t.h * h, u = c.size || l.width;
      Me(c.start) && (o = c.start), l.fullSize ? We(l, o, n.top, u, e.outerHeight - n.bottom - n.top) : We(l, o, t.top + c.placed, u, d), c.start = o, c.placed += d, o = l.right;
    }
  }
  t.x = o, t.y = a;
}
var q = {
  addBox(i, t) {
    i.boxes || (i.boxes = []), t.fullSize = t.fullSize || !1, t.position = t.position || "top", t.weight = t.weight || 0, t._layers = t._layers || function() {
      return [
        {
          z: 0,
          draw(e) {
            t.draw(e);
          }
        }
      ];
    }, i.boxes.push(t);
  },
  removeBox(i, t) {
    const e = i.boxes ? i.boxes.indexOf(t) : -1;
    e !== -1 && i.boxes.splice(e, 1);
  },
  configure(i, t, e) {
    t.fullSize = e.fullSize, t.position = e.position, t.weight = e.weight;
  },
  update(i, t, e, s) {
    if (!i)
      return;
    const n = Z(i.options.layout.padding), o = Math.max(t - n.width, 0), a = Math.max(e - n.height, 0), r = cl(i.boxes), l = r.vertical, c = r.horizontal;
    R(i.boxes, (p) => {
      typeof p.beforeLayout == "function" && p.beforeLayout();
    });
    const h = l.reduce((p, m) => m.box.options && m.box.options.display === !1 ? p : p + 1, 0) || 1, d = Object.freeze({
      outerWidth: t,
      outerHeight: e,
      padding: n,
      availableWidth: o,
      availableHeight: a,
      vBoxMaxWidth: o / 2 / h,
      hBoxMaxHeight: a / 2
    }), u = Object.assign({}, n);
    ro(u, Z(s));
    const f = Object.assign({
      maxPadding: u,
      w: o,
      h: a,
      x: n.left,
      y: n.top
    }, n), g = ll(l.concat(c), d);
    ge(r.fullSize, f, d, g), ge(l, f, d, g), ge(c, f, d, g) && ge(l, f, d, g), dl(f), Is(r.leftAndTop, f, d, g), f.x += f.w, f.y += f.h, Is(r.rightAndBottom, f, d, g), i.chartArea = {
      left: f.left,
      top: f.top,
      right: f.left + f.w,
      bottom: f.top + f.h,
      height: f.h,
      width: f.w
    }, R(r.chartArea, (p) => {
      const m = p.box;
      Object.assign(m, i.chartArea), m.update(f.w, f.h, {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      });
    });
  }
};
class lo {
  acquireContext(t, e) {
  }
  releaseContext(t) {
    return !1;
  }
  addEventListener(t, e, s) {
  }
  removeEventListener(t, e, s) {
  }
  getDevicePixelRatio() {
    return 1;
  }
  getMaximumSize(t, e, s, n) {
    return e = Math.max(0, e || t.width), s = s || t.height, {
      width: e,
      height: Math.max(0, n ? Math.floor(e / n) : s)
    };
  }
  isAttached(t) {
    return !0;
  }
  updateConfig(t) {
  }
}
class fl extends lo {
  acquireContext(t) {
    return t && t.getContext && t.getContext("2d") || null;
  }
  updateConfig(t) {
    t.options.animation = !1;
  }
}
const Ge = "$chartjs", gl = {
  touchstart: "mousedown",
  touchmove: "mousemove",
  touchend: "mouseup",
  pointerenter: "mouseenter",
  pointerdown: "mousedown",
  pointermove: "mousemove",
  pointerup: "mouseup",
  pointerleave: "mouseout",
  pointerout: "mouseout"
}, Bs = (i) => i === null || i === "";
function pl(i, t) {
  const e = i.style, s = i.getAttribute("height"), n = i.getAttribute("width");
  if (i[Ge] = {
    initial: {
      height: s,
      width: n,
      style: {
        display: e.display,
        height: e.height,
        width: e.width
      }
    }
  }, e.display = e.display || "block", e.boxSizing = e.boxSizing || "border-box", Bs(n)) {
    const o = vs(i, "width");
    o !== void 0 && (i.width = o);
  }
  if (Bs(s))
    if (i.style.height === "")
      i.height = i.width / (t || 2);
    else {
      const o = vs(i, "height");
      o !== void 0 && (i.height = o);
    }
  return i;
}
const co = hr ? {
  passive: !0
} : !1;
function ml(i, t, e) {
  i && i.addEventListener(t, e, co);
}
function bl(i, t, e) {
  i && i.canvas && i.canvas.removeEventListener(t, e, co);
}
function _l(i, t) {
  const e = gl[i.type] || i.type, { x: s, y: n } = Nt(i, t);
  return {
    type: e,
    chart: t,
    native: i,
    x: s !== void 0 ? s : null,
    y: n !== void 0 ? n : null
  };
}
function ii(i, t) {
  for (const e of i)
    if (e === t || e.contains(t))
      return !0;
}
function xl(i, t, e) {
  const s = i.canvas, n = new MutationObserver((o) => {
    let a = !1;
    for (const r of o)
      a = a || ii(r.addedNodes, s), a = a && !ii(r.removedNodes, s);
    a && e();
  });
  return n.observe(document, {
    childList: !0,
    subtree: !0
  }), n;
}
function yl(i, t, e) {
  const s = i.canvas, n = new MutationObserver((o) => {
    let a = !1;
    for (const r of o)
      a = a || ii(r.removedNodes, s), a = a && !ii(r.addedNodes, s);
    a && e();
  });
  return n.observe(document, {
    childList: !0,
    subtree: !0
  }), n;
}
const De = /* @__PURE__ */ new Map();
let Vs = 0;
function ho() {
  const i = window.devicePixelRatio;
  i !== Vs && (Vs = i, De.forEach((t, e) => {
    e.currentDevicePixelRatio !== i && t();
  }));
}
function vl(i, t) {
  De.size || window.addEventListener("resize", ho), De.set(i, t);
}
function kl(i) {
  De.delete(i), De.size || window.removeEventListener("resize", ho);
}
function Ml(i, t, e) {
  const s = i.canvas, n = s && Ji(s);
  if (!n)
    return;
  const o = Bn((r, l) => {
    const c = n.clientWidth;
    e(r, l), c < n.clientWidth && e();
  }, window), a = new ResizeObserver((r) => {
    const l = r[0], c = l.contentRect.width, h = l.contentRect.height;
    c === 0 && h === 0 || o(c, h);
  });
  return a.observe(n), vl(i, o), a;
}
function Mi(i, t, e) {
  e && e.disconnect(), t === "resize" && kl(i);
}
function Sl(i, t, e) {
  const s = i.canvas, n = Bn((o) => {
    i.ctx !== null && e(_l(o, i));
  }, i);
  return ml(s, t, n), n;
}
class wl extends lo {
  acquireContext(t, e) {
    const s = t && t.getContext && t.getContext("2d");
    return s && s.canvas === t ? (pl(t, e), s) : null;
  }
  releaseContext(t) {
    const e = t.canvas;
    if (!e[Ge])
      return !1;
    const s = e[Ge].initial;
    [
      "height",
      "width"
    ].forEach((o) => {
      const a = s[o];
      A(a) ? e.removeAttribute(o) : e.setAttribute(o, a);
    });
    const n = s.style || {};
    return Object.keys(n).forEach((o) => {
      e.style[o] = n[o];
    }), e.width = e.width, delete e[Ge], !0;
  }
  addEventListener(t, e, s) {
    this.removeEventListener(t, e);
    const n = t.$proxies || (t.$proxies = {}), a = {
      attach: xl,
      detach: yl,
      resize: Ml
    }[e] || Sl;
    n[e] = a(t, e, s);
  }
  removeEventListener(t, e) {
    const s = t.$proxies || (t.$proxies = {}), n = s[e];
    if (!n)
      return;
    ({
      attach: Mi,
      detach: Mi,
      resize: Mi
    }[e] || bl)(t, e, n), s[e] = void 0;
  }
  getDevicePixelRatio() {
    return window.devicePixelRatio;
  }
  getMaximumSize(t, e, s, n) {
    return cr(t, e, s, n);
  }
  isAttached(t) {
    const e = t && Ji(t);
    return !!(e && e.isConnected);
  }
}
function Dl(i) {
  return !Zi() || typeof OffscreenCanvas < "u" && i instanceof OffscreenCanvas ? fl : wl;
}
class yt {
  static defaults = {};
  static defaultRoutes = void 0;
  x;
  y;
  active = !1;
  options;
  $animations;
  tooltipPosition(t) {
    const { x: e, y: s } = this.getProps([
      "x",
      "y"
    ], t);
    return {
      x: e,
      y: s
    };
  }
  hasValue() {
    return Qt(this.x) && Qt(this.y);
  }
  getProps(t, e) {
    const s = this.$animations;
    if (!e || !s)
      return this;
    const n = {};
    return t.forEach((o) => {
      n[o] = s[o] && s[o].active() ? s[o]._to : this[o];
    }), n;
  }
}
function Cl(i, t) {
  const e = i.options.ticks, s = Pl(i), n = Math.min(e.maxTicksLimit || s, s), o = e.major.enabled ? Ol(t) : [], a = o.length, r = o[0], l = o[a - 1], c = [];
  if (a > n)
    return Ll(t, c, o, a / n), c;
  const h = Al(o, t, n);
  if (a > 0) {
    let d, u;
    const f = a > 1 ? Math.round((l - r) / (a - 1)) : null;
    for ($e(t, c, h, A(f) ? 0 : r - f, r), d = 0, u = a - 1; d < u; d++)
      $e(t, c, h, o[d], o[d + 1]);
    return $e(t, c, h, l, A(f) ? t.length : l + f), c;
  }
  return $e(t, c, h), c;
}
function Pl(i) {
  const t = i.options.offset, e = i._tickSize(), s = i._length / e + (t ? 0 : 1), n = i._maxLength / e;
  return Math.floor(Math.min(s, n));
}
function Al(i, t, e) {
  const s = Tl(i), n = t.length / e;
  if (!s)
    return Math.max(n, 1);
  const o = ua(s);
  for (let a = 0, r = o.length - 1; a < r; a++) {
    const l = o[a];
    if (l > n)
      return l;
  }
  return Math.max(n, 1);
}
function Ol(i) {
  const t = [];
  let e, s;
  for (e = 0, s = i.length; e < s; e++)
    i[e].major && t.push(e);
  return t;
}
function Ll(i, t, e, s) {
  let n = 0, o = e[0], a;
  for (s = Math.ceil(s), a = 0; a < i.length; a++)
    a === o && (t.push(i[a]), n++, o = e[n * s]);
}
function $e(i, t, e, s, n) {
  const o = D(s, 0), a = Math.min(D(n, i.length), i.length);
  let r = 0, l, c, h;
  for (e = Math.ceil(e), n && (l = n - s, e = l / Math.floor(l / e)), h = o; h < 0; )
    r++, h = Math.round(o + r * e);
  for (c = Math.max(o, 0); c < a; c++)
    c === h && (t.push(i[c]), r++, h = Math.round(o + r * e));
}
function Tl(i) {
  const t = i.length;
  let e, s;
  if (t < 2)
    return !1;
  for (s = i[0], e = 1; e < t; ++e)
    if (i[e] - i[e - 1] !== s)
      return !1;
  return s;
}
const Rl = (i) => i === "left" ? "right" : i === "right" ? "left" : i, Ns = (i, t, e) => t === "top" || t === "left" ? i[t] + e : i[t] - e, Ws = (i, t) => Math.min(t || i, i);
function $s(i, t) {
  const e = [], s = i.length / t, n = i.length;
  let o = 0;
  for (; o < n; o += s)
    e.push(i[Math.floor(o)]);
  return e;
}
function El(i, t, e) {
  const s = i.ticks.length, n = Math.min(t, s - 1), o = i._startPixel, a = i._endPixel, r = 1e-6;
  let l = i.getPixelForTick(n), c;
  if (!(e && (s === 1 ? c = Math.max(l - o, a - l) : t === 0 ? c = (i.getPixelForTick(1) - l) / 2 : c = (l - i.getPixelForTick(n - 1)) / 2, l += n < t ? c : -c, l < o - r || l > a + r)))
    return l;
}
function Fl(i, t) {
  R(i, (e) => {
    const s = e.gc, n = s.length / 2;
    let o;
    if (n > t) {
      for (o = 0; o < n; ++o)
        delete e.data[s[o]];
      s.splice(0, n);
    }
  });
}
function he(i) {
  return i.drawTicks ? i.tickLength : 0;
}
function Hs(i, t) {
  if (!i.display)
    return 0;
  const e = j(i.font, t), s = Z(i.padding);
  return (V(i.text) ? i.text.length : 1) * e.lineHeight + s.height;
}
function zl(i, t) {
  return Lt(i, {
    scale: t,
    type: "scale"
  });
}
function Il(i, t, e) {
  return Lt(i, {
    tick: e,
    index: t,
    type: "tick"
  });
}
function Bl(i, t, e) {
  let s = Yi(i);
  return (e && t !== "right" || !e && t === "right") && (s = Rl(s)), s;
}
function Vl(i, t, e, s) {
  const { top: n, left: o, bottom: a, right: r, chart: l } = i, { chartArea: c, scales: h } = l;
  let d = 0, u, f, g;
  const p = a - n, m = r - o;
  if (i.isHorizontal()) {
    if (f = K(s, o, r), O(e)) {
      const b = Object.keys(e)[0], _ = e[b];
      g = h[b].getPixelForValue(_) + p - t;
    } else e === "center" ? g = (c.bottom + c.top) / 2 + p - t : g = Ns(i, e, t);
    u = r - o;
  } else {
    if (O(e)) {
      const b = Object.keys(e)[0], _ = e[b];
      f = h[b].getPixelForValue(_) - m + t;
    } else e === "center" ? f = (c.left + c.right) / 2 - m + t : f = Ns(i, e, t);
    g = K(s, a, n), d = e === "left" ? -H : H;
  }
  return {
    titleX: f,
    titleY: g,
    maxWidth: u,
    rotation: d
  };
}
class Ut extends yt {
  constructor(t) {
    super(), this.id = t.id, this.type = t.type, this.options = void 0, this.ctx = t.ctx, this.chart = t.chart, this.top = void 0, this.bottom = void 0, this.left = void 0, this.right = void 0, this.width = void 0, this.height = void 0, this._margins = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }, this.maxWidth = void 0, this.maxHeight = void 0, this.paddingTop = void 0, this.paddingBottom = void 0, this.paddingLeft = void 0, this.paddingRight = void 0, this.axis = void 0, this.labelRotation = void 0, this.min = void 0, this.max = void 0, this._range = void 0, this.ticks = [], this._gridLineItems = null, this._labelItems = null, this._labelSizes = null, this._length = 0, this._maxLength = 0, this._longestTextCache = {}, this._startPixel = void 0, this._endPixel = void 0, this._reversePixels = !1, this._userMax = void 0, this._userMin = void 0, this._suggestedMax = void 0, this._suggestedMin = void 0, this._ticksLength = 0, this._borderValue = 0, this._cache = {}, this._dataLimitsCached = !1, this.$context = void 0;
  }
  init(t) {
    this.options = t.setContext(this.getContext()), this.axis = t.axis, this._userMin = this.parse(t.min), this._userMax = this.parse(t.max), this._suggestedMin = this.parse(t.suggestedMin), this._suggestedMax = this.parse(t.suggestedMax);
  }
  parse(t, e) {
    return t;
  }
  getUserBounds() {
    let { _userMin: t, _userMax: e, _suggestedMin: s, _suggestedMax: n } = this;
    return t = it(t, Number.POSITIVE_INFINITY), e = it(e, Number.NEGATIVE_INFINITY), s = it(s, Number.POSITIVE_INFINITY), n = it(n, Number.NEGATIVE_INFINITY), {
      min: it(t, s),
      max: it(e, n),
      minDefined: W(t),
      maxDefined: W(e)
    };
  }
  getMinMax(t) {
    let { min: e, max: s, minDefined: n, maxDefined: o } = this.getUserBounds(), a;
    if (n && o)
      return {
        min: e,
        max: s
      };
    const r = this.getMatchingVisibleMetas();
    for (let l = 0, c = r.length; l < c; ++l)
      a = r[l].controller.getMinMax(this, t), n || (e = Math.min(e, a.min)), o || (s = Math.max(s, a.max));
    return e = o && e > s ? s : e, s = n && e > s ? e : s, {
      min: it(e, it(s, e)),
      max: it(s, it(e, s))
    };
  }
  getPadding() {
    return {
      left: this.paddingLeft || 0,
      top: this.paddingTop || 0,
      right: this.paddingRight || 0,
      bottom: this.paddingBottom || 0
    };
  }
  getTicks() {
    return this.ticks;
  }
  getLabels() {
    const t = this.chart.data;
    return this.options.labels || (this.isHorizontal() ? t.xLabels : t.yLabels) || t.labels || [];
  }
  getLabelItems(t = this.chart.chartArea) {
    return this._labelItems || (this._labelItems = this._computeLabelItems(t));
  }
  beforeLayout() {
    this._cache = {}, this._dataLimitsCached = !1;
  }
  beforeUpdate() {
    F(this.options.beforeUpdate, [
      this
    ]);
  }
  update(t, e, s) {
    const { beginAtZero: n, grace: o, ticks: a } = this.options, r = a.sampleSize;
    this.beforeUpdate(), this.maxWidth = t, this.maxHeight = e, this._margins = s = Object.assign({
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }, s), this.ticks = null, this._labelSizes = null, this._gridLineItems = null, this._labelItems = null, this.beforeSetDimensions(), this.setDimensions(), this.afterSetDimensions(), this._maxLength = this.isHorizontal() ? this.width + s.left + s.right : this.height + s.top + s.bottom, this._dataLimitsCached || (this.beforeDataLimits(), this.determineDataLimits(), this.afterDataLimits(), this._range = Wa(this, o, n), this._dataLimitsCached = !0), this.beforeBuildTicks(), this.ticks = this.buildTicks() || [], this.afterBuildTicks();
    const l = r < this.ticks.length;
    this._convertTicksToLabels(l ? $s(this.ticks, r) : this.ticks), this.configure(), this.beforeCalculateLabelRotation(), this.calculateLabelRotation(), this.afterCalculateLabelRotation(), a.display && (a.autoSkip || a.source === "auto") && (this.ticks = Cl(this, this.ticks), this._labelSizes = null, this.afterAutoSkip()), l && this._convertTicksToLabels(this.ticks), this.beforeFit(), this.fit(), this.afterFit(), this.afterUpdate();
  }
  configure() {
    let t = this.options.reverse, e, s;
    this.isHorizontal() ? (e = this.left, s = this.right) : (e = this.top, s = this.bottom, t = !t), this._startPixel = e, this._endPixel = s, this._reversePixels = t, this._length = s - e, this._alignToPixels = this.options.alignToPixels;
  }
  afterUpdate() {
    F(this.options.afterUpdate, [
      this
    ]);
  }
  beforeSetDimensions() {
    F(this.options.beforeSetDimensions, [
      this
    ]);
  }
  setDimensions() {
    this.isHorizontal() ? (this.width = this.maxWidth, this.left = 0, this.right = this.width) : (this.height = this.maxHeight, this.top = 0, this.bottom = this.height), this.paddingLeft = 0, this.paddingTop = 0, this.paddingRight = 0, this.paddingBottom = 0;
  }
  afterSetDimensions() {
    F(this.options.afterSetDimensions, [
      this
    ]);
  }
  _callHooks(t) {
    this.chart.notifyPlugins(t, this.getContext()), F(this.options[t], [
      this
    ]);
  }
  beforeDataLimits() {
    this._callHooks("beforeDataLimits");
  }
  determineDataLimits() {
  }
  afterDataLimits() {
    this._callHooks("afterDataLimits");
  }
  beforeBuildTicks() {
    this._callHooks("beforeBuildTicks");
  }
  buildTicks() {
    return [];
  }
  afterBuildTicks() {
    this._callHooks("afterBuildTicks");
  }
  beforeTickToLabelConversion() {
    F(this.options.beforeTickToLabelConversion, [
      this
    ]);
  }
  generateTickLabels(t) {
    const e = this.options.ticks;
    let s, n, o;
    for (s = 0, n = t.length; s < n; s++)
      o = t[s], o.label = F(e.callback, [
        o.value,
        s,
        t
      ], this);
  }
  afterTickToLabelConversion() {
    F(this.options.afterTickToLabelConversion, [
      this
    ]);
  }
  beforeCalculateLabelRotation() {
    F(this.options.beforeCalculateLabelRotation, [
      this
    ]);
  }
  calculateLabelRotation() {
    const t = this.options, e = t.ticks, s = Ws(this.ticks.length, t.ticks.maxTicksLimit), n = e.minRotation || 0, o = e.maxRotation;
    let a = n, r, l, c;
    if (!this._isVisible() || !e.display || n >= o || s <= 1 || !this.isHorizontal()) {
      this.labelRotation = n;
      return;
    }
    const h = this._getLabelSizes(), d = h.widest.width, u = h.highest.height, f = Y(this.chart.width - d, 0, this.maxWidth);
    r = t.offset ? this.maxWidth / s : f / (s - 1), d + 6 > r && (r = f / (s - (t.offset ? 0.5 : 1)), l = this.maxHeight - he(t.grid) - e.padding - Hs(t.title, this.chart.options.font), c = Math.sqrt(d * d + u * u), a = Hi(Math.min(Math.asin(Y((h.highest.height + 6) / r, -1, 1)), Math.asin(Y(l / c, -1, 1)) - Math.asin(Y(u / c, -1, 1)))), a = Math.max(n, Math.min(o, a))), this.labelRotation = a;
  }
  afterCalculateLabelRotation() {
    F(this.options.afterCalculateLabelRotation, [
      this
    ]);
  }
  afterAutoSkip() {
  }
  beforeFit() {
    F(this.options.beforeFit, [
      this
    ]);
  }
  fit() {
    const t = {
      width: 0,
      height: 0
    }, { chart: e, options: { ticks: s, title: n, grid: o } } = this, a = this._isVisible(), r = this.isHorizontal();
    if (a) {
      const l = Hs(n, e.options.font);
      if (r ? (t.width = this.maxWidth, t.height = he(o) + l) : (t.height = this.maxHeight, t.width = he(o) + l), s.display && this.ticks.length) {
        const { first: c, last: h, widest: d, highest: u } = this._getLabelSizes(), f = s.padding * 2, g = rt(this.labelRotation), p = Math.cos(g), m = Math.sin(g);
        if (r) {
          const b = s.mirror ? 0 : m * d.width + p * u.height;
          t.height = Math.min(this.maxHeight, t.height + b + f);
        } else {
          const b = s.mirror ? 0 : p * d.width + m * u.height;
          t.width = Math.min(this.maxWidth, t.width + b + f);
        }
        this._calculatePadding(c, h, m, p);
      }
    }
    this._handleMargins(), r ? (this.width = this._length = e.width - this._margins.left - this._margins.right, this.height = t.height) : (this.width = t.width, this.height = this._length = e.height - this._margins.top - this._margins.bottom);
  }
  _calculatePadding(t, e, s, n) {
    const { ticks: { align: o, padding: a }, position: r } = this.options, l = this.labelRotation !== 0, c = r !== "top" && this.axis === "x";
    if (this.isHorizontal()) {
      const h = this.getPixelForTick(0) - this.left, d = this.right - this.getPixelForTick(this.ticks.length - 1);
      let u = 0, f = 0;
      l ? c ? (u = n * t.width, f = s * e.height) : (u = s * t.height, f = n * e.width) : o === "start" ? f = e.width : o === "end" ? u = t.width : o !== "inner" && (u = t.width / 2, f = e.width / 2), this.paddingLeft = Math.max((u - h + a) * this.width / (this.width - h), 0), this.paddingRight = Math.max((f - d + a) * this.width / (this.width - d), 0);
    } else {
      let h = e.height / 2, d = t.height / 2;
      o === "start" ? (h = 0, d = t.height) : o === "end" && (h = e.height, d = 0), this.paddingTop = h + a, this.paddingBottom = d + a;
    }
  }
  _handleMargins() {
    this._margins && (this._margins.left = Math.max(this.paddingLeft, this._margins.left), this._margins.top = Math.max(this.paddingTop, this._margins.top), this._margins.right = Math.max(this.paddingRight, this._margins.right), this._margins.bottom = Math.max(this.paddingBottom, this._margins.bottom));
  }
  afterFit() {
    F(this.options.afterFit, [
      this
    ]);
  }
  isHorizontal() {
    const { axis: t, position: e } = this.options;
    return e === "top" || e === "bottom" || t === "x";
  }
  isFullSize() {
    return this.options.fullSize;
  }
  _convertTicksToLabels(t) {
    this.beforeTickToLabelConversion(), this.generateTickLabels(t);
    let e, s;
    for (e = 0, s = t.length; e < s; e++)
      A(t[e].label) && (t.splice(e, 1), s--, e--);
    this.afterTickToLabelConversion();
  }
  _getLabelSizes() {
    let t = this._labelSizes;
    if (!t) {
      const e = this.options.ticks.sampleSize;
      let s = this.ticks;
      e < s.length && (s = $s(s, e)), this._labelSizes = t = this._computeLabelSizes(s, s.length, this.options.ticks.maxTicksLimit);
    }
    return t;
  }
  _computeLabelSizes(t, e, s) {
    const { ctx: n, _longestTextCache: o } = this, a = [], r = [], l = Math.floor(e / Ws(e, s));
    let c = 0, h = 0, d, u, f, g, p, m, b, _, v, y, x;
    for (d = 0; d < e; d += l) {
      if (g = t[d].label, p = this._resolveTickFontOptions(d), n.font = m = p.string, b = o[m] = o[m] || {
        data: {},
        gc: []
      }, _ = p.lineHeight, v = y = 0, !A(g) && !V(g))
        v = ti(n, b.data, b.gc, v, g), y = _;
      else if (V(g))
        for (u = 0, f = g.length; u < f; ++u)
          x = g[u], !A(x) && !V(x) && (v = ti(n, b.data, b.gc, v, x), y += _);
      a.push(v), r.push(y), c = Math.max(v, c), h = Math.max(y, h);
    }
    Fl(o, e);
    const k = a.indexOf(c), M = r.indexOf(h), S = (w) => ({
      width: a[w] || 0,
      height: r[w] || 0
    });
    return {
      first: S(0),
      last: S(e - 1),
      widest: S(k),
      highest: S(M),
      widths: a,
      heights: r
    };
  }
  getLabelForValue(t) {
    return t;
  }
  getPixelForValue(t, e) {
    return NaN;
  }
  getValueForPixel(t) {
  }
  getPixelForTick(t) {
    const e = this.ticks;
    return t < 0 || t > e.length - 1 ? null : this.getPixelForValue(e[t].value);
  }
  getPixelForDecimal(t) {
    this._reversePixels && (t = 1 - t);
    const e = this._startPixel + t * this._length;
    return ma(this._alignToPixels ? It(this.chart, e, 0) : e);
  }
  getDecimalForPixel(t) {
    const e = (t - this._startPixel) / this._length;
    return this._reversePixels ? 1 - e : e;
  }
  getBasePixel() {
    return this.getPixelForValue(this.getBaseValue());
  }
  getBaseValue() {
    const { min: t, max: e } = this;
    return t < 0 && e < 0 ? e : t > 0 && e > 0 ? t : 0;
  }
  getContext(t) {
    const e = this.ticks || [];
    if (t >= 0 && t < e.length) {
      const s = e[t];
      return s.$context || (s.$context = Il(this.getContext(), t, s));
    }
    return this.$context || (this.$context = zl(this.chart.getContext(), this));
  }
  _tickSize() {
    const t = this.options.ticks, e = rt(this.labelRotation), s = Math.abs(Math.cos(e)), n = Math.abs(Math.sin(e)), o = this._getLabelSizes(), a = t.autoSkipPadding || 0, r = o ? o.widest.width + a : 0, l = o ? o.highest.height + a : 0;
    return this.isHorizontal() ? l * s > r * n ? r / s : l / n : l * n < r * s ? l / s : r / n;
  }
  _isVisible() {
    const t = this.options.display;
    return t !== "auto" ? !!t : this.getMatchingVisibleMetas().length > 0;
  }
  _computeGridLineItems(t) {
    const e = this.axis, s = this.chart, n = this.options, { grid: o, position: a, border: r } = n, l = o.offset, c = this.isHorizontal(), d = this.ticks.length + (l ? 1 : 0), u = he(o), f = [], g = r.setContext(this.getContext()), p = g.display ? g.width : 0, m = p / 2, b = function(B) {
      return It(s, B, p);
    };
    let _, v, y, x, k, M, S, w, C, P, L, X;
    if (a === "top")
      _ = b(this.bottom), M = this.bottom - u, w = _ - m, P = b(t.top) + m, X = t.bottom;
    else if (a === "bottom")
      _ = b(this.top), P = t.top, X = b(t.bottom) - m, M = _ + m, w = this.top + u;
    else if (a === "left")
      _ = b(this.right), k = this.right - u, S = _ - m, C = b(t.left) + m, L = t.right;
    else if (a === "right")
      _ = b(this.left), C = t.left, L = b(t.right) - m, k = _ + m, S = this.left + u;
    else if (e === "x") {
      if (a === "center")
        _ = b((t.top + t.bottom) / 2 + 0.5);
      else if (O(a)) {
        const B = Object.keys(a)[0], $ = a[B];
        _ = b(this.chart.scales[B].getPixelForValue($));
      }
      P = t.top, X = t.bottom, M = _ + m, w = M + u;
    } else if (e === "y") {
      if (a === "center")
        _ = b((t.left + t.right) / 2);
      else if (O(a)) {
        const B = Object.keys(a)[0], $ = a[B];
        _ = b(this.chart.scales[B].getPixelForValue($));
      }
      k = _ - m, S = k - u, C = t.left, L = t.right;
    }
    const et = D(n.ticks.maxTicksLimit, d), E = Math.max(1, Math.ceil(d / et));
    for (v = 0; v < d; v += E) {
      const B = this.getContext(v), $ = o.setContext(B), at = r.setContext(B), U = $.lineWidth, Kt = $.color, Ee = at.dash || [], Gt = at.dashOffset, ne = $.tickWidth, Et = $.tickColor, oe = $.tickBorderDash || [], Ft = $.tickBorderDashOffset;
      y = El(this, v, l), y !== void 0 && (x = It(s, y, U), c ? k = S = C = L = x : M = w = P = X = x, f.push({
        tx1: k,
        ty1: M,
        tx2: S,
        ty2: w,
        x1: C,
        y1: P,
        x2: L,
        y2: X,
        width: U,
        color: Kt,
        borderDash: Ee,
        borderDashOffset: Gt,
        tickWidth: ne,
        tickColor: Et,
        tickBorderDash: oe,
        tickBorderDashOffset: Ft
      }));
    }
    return this._ticksLength = d, this._borderValue = _, f;
  }
  _computeLabelItems(t) {
    const e = this.axis, s = this.options, { position: n, ticks: o } = s, a = this.isHorizontal(), r = this.ticks, { align: l, crossAlign: c, padding: h, mirror: d } = o, u = he(s.grid), f = u + h, g = d ? -h : f, p = -rt(this.labelRotation), m = [];
    let b, _, v, y, x, k, M, S, w, C, P, L, X = "middle";
    if (n === "top")
      k = this.bottom - g, M = this._getXAxisLabelAlignment();
    else if (n === "bottom")
      k = this.top + g, M = this._getXAxisLabelAlignment();
    else if (n === "left") {
      const E = this._getYAxisLabelAlignment(u);
      M = E.textAlign, x = E.x;
    } else if (n === "right") {
      const E = this._getYAxisLabelAlignment(u);
      M = E.textAlign, x = E.x;
    } else if (e === "x") {
      if (n === "center")
        k = (t.top + t.bottom) / 2 + f;
      else if (O(n)) {
        const E = Object.keys(n)[0], B = n[E];
        k = this.chart.scales[E].getPixelForValue(B) + f;
      }
      M = this._getXAxisLabelAlignment();
    } else if (e === "y") {
      if (n === "center")
        x = (t.left + t.right) / 2 - f;
      else if (O(n)) {
        const E = Object.keys(n)[0], B = n[E];
        x = this.chart.scales[E].getPixelForValue(B);
      }
      M = this._getYAxisLabelAlignment(u).textAlign;
    }
    e === "y" && (l === "start" ? X = "top" : l === "end" && (X = "bottom"));
    const et = this._getLabelSizes();
    for (b = 0, _ = r.length; b < _; ++b) {
      v = r[b], y = v.label;
      const E = o.setContext(this.getContext(b));
      S = this.getPixelForTick(b) + o.labelOffset, w = this._resolveTickFontOptions(b), C = w.lineHeight, P = V(y) ? y.length : 1;
      const B = P / 2, $ = E.color, at = E.textStrokeColor, U = E.textStrokeWidth;
      let Kt = M;
      a ? (x = S, M === "inner" && (b === _ - 1 ? Kt = this.options.reverse ? "left" : "right" : b === 0 ? Kt = this.options.reverse ? "right" : "left" : Kt = "center"), n === "top" ? c === "near" || p !== 0 ? L = -P * C + C / 2 : c === "center" ? L = -et.highest.height / 2 - B * C + C : L = -et.highest.height + C / 2 : c === "near" || p !== 0 ? L = C / 2 : c === "center" ? L = et.highest.height / 2 - B * C : L = et.highest.height - P * C, d && (L *= -1), p !== 0 && !E.showLabelBackdrop && (x += C / 2 * Math.sin(p))) : (k = S, L = (1 - P) * C / 2);
      let Ee;
      if (E.showLabelBackdrop) {
        const Gt = Z(E.backdropPadding), ne = et.heights[b], Et = et.widths[b];
        let oe = L - Gt.top, Ft = 0 - Gt.left;
        switch (X) {
          case "middle":
            oe -= ne / 2;
            break;
          case "bottom":
            oe -= ne;
            break;
        }
        switch (M) {
          case "center":
            Ft -= Et / 2;
            break;
          case "right":
            Ft -= Et;
            break;
          case "inner":
            b === _ - 1 ? Ft -= Et : b > 0 && (Ft -= Et / 2);
            break;
        }
        Ee = {
          left: Ft,
          top: oe,
          width: Et + Gt.width,
          height: ne + Gt.height,
          color: E.backdropColor
        };
      }
      m.push({
        label: y,
        font: w,
        textOffset: L,
        options: {
          rotation: p,
          color: $,
          strokeColor: at,
          strokeWidth: U,
          textAlign: Kt,
          textBaseline: X,
          translation: [
            x,
            k
          ],
          backdrop: Ee
        }
      });
    }
    return m;
  }
  _getXAxisLabelAlignment() {
    const { position: t, ticks: e } = this.options;
    if (-rt(this.labelRotation))
      return t === "top" ? "left" : "right";
    let n = "center";
    return e.align === "start" ? n = "left" : e.align === "end" ? n = "right" : e.align === "inner" && (n = "inner"), n;
  }
  _getYAxisLabelAlignment(t) {
    const { position: e, ticks: { crossAlign: s, mirror: n, padding: o } } = this.options, a = this._getLabelSizes(), r = t + o, l = a.widest.width;
    let c, h;
    return e === "left" ? n ? (h = this.right + o, s === "near" ? c = "left" : s === "center" ? (c = "center", h += l / 2) : (c = "right", h += l)) : (h = this.right - r, s === "near" ? c = "right" : s === "center" ? (c = "center", h -= l / 2) : (c = "left", h = this.left)) : e === "right" ? n ? (h = this.left + o, s === "near" ? c = "right" : s === "center" ? (c = "center", h -= l / 2) : (c = "left", h -= l)) : (h = this.left + r, s === "near" ? c = "left" : s === "center" ? (c = "center", h += l / 2) : (c = "right", h = this.right)) : c = "right", {
      textAlign: c,
      x: h
    };
  }
  _computeLabelArea() {
    if (this.options.ticks.mirror)
      return;
    const t = this.chart, e = this.options.position;
    if (e === "left" || e === "right")
      return {
        top: 0,
        left: this.left,
        bottom: t.height,
        right: this.right
      };
    if (e === "top" || e === "bottom")
      return {
        top: this.top,
        left: 0,
        bottom: this.bottom,
        right: t.width
      };
  }
  drawBackground() {
    const { ctx: t, options: { backgroundColor: e }, left: s, top: n, width: o, height: a } = this;
    e && (t.save(), t.fillStyle = e, t.fillRect(s, n, o, a), t.restore());
  }
  getLineWidthForValue(t) {
    const e = this.options.grid;
    if (!this._isVisible() || !e.display)
      return 0;
    const n = this.ticks.findIndex((o) => o.value === t);
    return n >= 0 ? e.setContext(this.getContext(n)).lineWidth : 0;
  }
  drawGrid(t) {
    const e = this.options.grid, s = this.ctx, n = this._gridLineItems || (this._gridLineItems = this._computeGridLineItems(t));
    let o, a;
    const r = (l, c, h) => {
      !h.width || !h.color || (s.save(), s.lineWidth = h.width, s.strokeStyle = h.color, s.setLineDash(h.borderDash || []), s.lineDashOffset = h.borderDashOffset, s.beginPath(), s.moveTo(l.x, l.y), s.lineTo(c.x, c.y), s.stroke(), s.restore());
    };
    if (e.display)
      for (o = 0, a = n.length; o < a; ++o) {
        const l = n[o];
        e.drawOnChartArea && r({
          x: l.x1,
          y: l.y1
        }, {
          x: l.x2,
          y: l.y2
        }, l), e.drawTicks && r({
          x: l.tx1,
          y: l.ty1
        }, {
          x: l.tx2,
          y: l.ty2
        }, {
          color: l.tickColor,
          width: l.tickWidth,
          borderDash: l.tickBorderDash,
          borderDashOffset: l.tickBorderDashOffset
        });
      }
  }
  drawBorder() {
    const { chart: t, ctx: e, options: { border: s, grid: n } } = this, o = s.setContext(this.getContext()), a = s.display ? o.width : 0;
    if (!a)
      return;
    const r = n.setContext(this.getContext(0)).lineWidth, l = this._borderValue;
    let c, h, d, u;
    this.isHorizontal() ? (c = It(t, this.left, a) - a / 2, h = It(t, this.right, r) + r / 2, d = u = l) : (d = It(t, this.top, a) - a / 2, u = It(t, this.bottom, r) + r / 2, c = h = l), e.save(), e.lineWidth = o.width, e.strokeStyle = o.color, e.beginPath(), e.moveTo(c, d), e.lineTo(h, u), e.stroke(), e.restore();
  }
  drawLabels(t) {
    if (!this.options.ticks.display)
      return;
    const s = this.ctx, n = this._computeLabelArea();
    n && ai(s, n);
    const o = this.getLabelItems(t);
    for (const a of o) {
      const r = a.options, l = a.font, c = a.label, h = a.textOffset;
      Yt(s, c, 0, h, l, r);
    }
    n && ri(s);
  }
  drawTitle() {
    const { ctx: t, options: { position: e, title: s, reverse: n } } = this;
    if (!s.display)
      return;
    const o = j(s.font), a = Z(s.padding), r = s.align;
    let l = o.lineHeight / 2;
    e === "bottom" || e === "center" || O(e) ? (l += a.bottom, V(s.text) && (l += o.lineHeight * (s.text.length - 1))) : l += a.top;
    const { titleX: c, titleY: h, maxWidth: d, rotation: u } = Vl(this, l, e, r);
    Yt(t, s.text, 0, 0, o, {
      color: s.color,
      maxWidth: d,
      rotation: u,
      textAlign: Bl(r, e, n),
      textBaseline: "middle",
      translation: [
        c,
        h
      ]
    });
  }
  draw(t) {
    this._isVisible() && (this.drawBackground(), this.drawGrid(t), this.drawBorder(), this.drawTitle(), this.drawLabels(t));
  }
  _layers() {
    const t = this.options, e = t.ticks && t.ticks.z || 0, s = D(t.grid && t.grid.z, -1), n = D(t.border && t.border.z, 0);
    return !this._isVisible() || this.draw !== Ut.prototype.draw ? [
      {
        z: e,
        draw: (o) => {
          this.draw(o);
        }
      }
    ] : [
      {
        z: s,
        draw: (o) => {
          this.drawBackground(), this.drawGrid(o), this.drawTitle();
        }
      },
      {
        z: n,
        draw: () => {
          this.drawBorder();
        }
      },
      {
        z: e,
        draw: (o) => {
          this.drawLabels(o);
        }
      }
    ];
  }
  getMatchingVisibleMetas(t) {
    const e = this.chart.getSortedVisibleDatasetMetas(), s = this.axis + "AxisID", n = [];
    let o, a;
    for (o = 0, a = e.length; o < a; ++o) {
      const r = e[o];
      r[s] === this.id && (!t || r.type === t) && n.push(r);
    }
    return n;
  }
  _resolveTickFontOptions(t) {
    const e = this.options.ticks.setContext(this.getContext(t));
    return j(e.font);
  }
  _maxDigits() {
    const t = this._resolveTickFontOptions(0).lineHeight;
    return (this.isHorizontal() ? this.width : this.height) / t;
  }
}
class He {
  constructor(t, e, s) {
    this.type = t, this.scope = e, this.override = s, this.items = /* @__PURE__ */ Object.create(null);
  }
  isForType(t) {
    return Object.prototype.isPrototypeOf.call(this.type.prototype, t.prototype);
  }
  register(t) {
    const e = Object.getPrototypeOf(t);
    let s;
    $l(e) && (s = this.register(e));
    const n = this.items, o = t.id, a = this.scope + "." + o;
    if (!o)
      throw new Error("class does not have id: " + t);
    return o in n || (n[o] = t, Nl(t, a, s), this.override && N.override(t.id, t.overrides)), a;
  }
  get(t) {
    return this.items[t];
  }
  unregister(t) {
    const e = this.items, s = t.id, n = this.scope;
    s in e && delete e[s], n && s in N[n] && (delete N[n][s], this.override && delete jt[s]);
  }
}
function Nl(i, t, e) {
  const s = ke(/* @__PURE__ */ Object.create(null), [
    e ? N.get(e) : {},
    N.get(t),
    i.defaults
  ]);
  N.set(t, s), i.defaultRoutes && Wl(t, i.defaultRoutes), i.descriptors && N.describe(t, i.descriptors);
}
function Wl(i, t) {
  Object.keys(t).forEach((e) => {
    const s = e.split("."), n = s.pop(), o = [
      i
    ].concat(s).join("."), a = t[e].split("."), r = a.pop(), l = a.join(".");
    N.route(o, n, l, r);
  });
}
function $l(i) {
  return "id" in i && "defaults" in i;
}
class Hl {
  constructor() {
    this.controllers = new He(Tt, "datasets", !0), this.elements = new He(yt, "elements"), this.plugins = new He(Object, "plugins"), this.scales = new He(Ut, "scales"), this._typedRegistries = [
      this.controllers,
      this.scales,
      this.elements
    ];
  }
  add(...t) {
    this._each("register", t);
  }
  remove(...t) {
    this._each("unregister", t);
  }
  addControllers(...t) {
    this._each("register", t, this.controllers);
  }
  addElements(...t) {
    this._each("register", t, this.elements);
  }
  addPlugins(...t) {
    this._each("register", t, this.plugins);
  }
  addScales(...t) {
    this._each("register", t, this.scales);
  }
  getController(t) {
    return this._get(t, this.controllers, "controller");
  }
  getElement(t) {
    return this._get(t, this.elements, "element");
  }
  getPlugin(t) {
    return this._get(t, this.plugins, "plugin");
  }
  getScale(t) {
    return this._get(t, this.scales, "scale");
  }
  removeControllers(...t) {
    this._each("unregister", t, this.controllers);
  }
  removeElements(...t) {
    this._each("unregister", t, this.elements);
  }
  removePlugins(...t) {
    this._each("unregister", t, this.plugins);
  }
  removeScales(...t) {
    this._each("unregister", t, this.scales);
  }
  _each(t, e, s) {
    [
      ...e
    ].forEach((n) => {
      const o = s || this._getRegistryForType(n);
      s || o.isForType(n) || o === this.plugins && n.id ? this._exec(t, o, n) : R(n, (a) => {
        const r = s || this._getRegistryForType(a);
        this._exec(t, r, a);
      });
    });
  }
  _exec(t, e, s) {
    const n = $i(t);
    F(s["before" + n], [], s), e[t](s), F(s["after" + n], [], s);
  }
  _getRegistryForType(t) {
    for (let e = 0; e < this._typedRegistries.length; e++) {
      const s = this._typedRegistries[e];
      if (s.isForType(t))
        return s;
    }
    return this.plugins;
  }
  _get(t, e, s) {
    const n = e.get(t);
    if (n === void 0)
      throw new Error('"' + t + '" is not a registered ' + s + ".");
    return n;
  }
}
var ct = /* @__PURE__ */ new Hl();
class jl {
  constructor() {
    this._init = void 0;
  }
  notify(t, e, s, n) {
    if (e === "beforeInit" && (this._init = this._createDescriptors(t, !0), this._notify(this._init, t, "install")), this._init === void 0)
      return;
    const o = n ? this._descriptors(t).filter(n) : this._descriptors(t), a = this._notify(o, t, e, s);
    return e === "afterDestroy" && (this._notify(o, t, "stop"), this._notify(this._init, t, "uninstall"), this._init = void 0), a;
  }
  _notify(t, e, s, n) {
    n = n || {};
    for (const o of t) {
      const a = o.plugin, r = a[s], l = [
        e,
        n,
        o.options
      ];
      if (F(r, l, a) === !1 && n.cancelable)
        return !1;
    }
    return !0;
  }
  invalidate() {
    A(this._cache) || (this._oldCache = this._cache, this._cache = void 0);
  }
  _descriptors(t) {
    if (this._cache)
      return this._cache;
    const e = this._cache = this._createDescriptors(t);
    return this._notifyStateChanges(t), e;
  }
  _createDescriptors(t, e) {
    const s = t && t.config, n = D(s.options && s.options.plugins, {}), o = Yl(s);
    return n === !1 && !e ? [] : Ul(t, o, n, e);
  }
  _notifyStateChanges(t) {
    const e = this._oldCache || [], s = this._cache, n = (o, a) => o.filter((r) => !a.some((l) => r.plugin.id === l.plugin.id));
    this._notify(n(e, s), t, "stop"), this._notify(n(s, e), t, "start");
  }
}
function Yl(i) {
  const t = {}, e = [], s = Object.keys(ct.plugins.items);
  for (let o = 0; o < s.length; o++)
    e.push(ct.getPlugin(s[o]));
  const n = i.plugins || [];
  for (let o = 0; o < n.length; o++) {
    const a = n[o];
    e.indexOf(a) === -1 && (e.push(a), t[a.id] = !0);
  }
  return {
    plugins: e,
    localIds: t
  };
}
function Xl(i, t) {
  return !t && i === !1 ? null : i === !0 ? {} : i;
}
function Ul(i, { plugins: t, localIds: e }, s, n) {
  const o = [], a = i.getContext();
  for (const r of t) {
    const l = r.id, c = Xl(s[l], n);
    c !== null && o.push({
      plugin: r,
      options: Kl(i.config, {
        plugin: r,
        local: e[l]
      }, c, a)
    });
  }
  return o;
}
function Kl(i, { plugin: t, local: e }, s, n) {
  const o = i.pluginScopeKeys(t), a = i.getOptionScopes(s, o);
  return e && t.defaults && a.push(t.defaults), i.createResolver(a, n, [
    ""
  ], {
    scriptable: !1,
    indexable: !1,
    allKeys: !0
  });
}
function Ti(i, t) {
  const e = N.datasets[i] || {};
  return ((t.datasets || {})[i] || {}).indexAxis || t.indexAxis || e.indexAxis || "x";
}
function Gl(i, t) {
  let e = i;
  return i === "_index_" ? e = t : i === "_value_" && (e = t === "x" ? "y" : "x"), e;
}
function ql(i, t) {
  return i === t ? "_index_" : "_value_";
}
function js(i) {
  if (i === "x" || i === "y" || i === "r")
    return i;
}
function Zl(i) {
  if (i === "top" || i === "bottom")
    return "x";
  if (i === "left" || i === "right")
    return "y";
}
function Ri(i, ...t) {
  if (js(i))
    return i;
  for (const e of t) {
    const s = e.axis || Zl(e.position) || i.length > 1 && js(i[0].toLowerCase());
    if (s)
      return s;
  }
  throw new Error(`Cannot determine type of '${i}' axis. Please provide 'axis' or 'position' option.`);
}
function Ys(i, t, e) {
  if (e[t + "AxisID"] === i)
    return {
      axis: t
    };
}
function Jl(i, t) {
  if (t.data && t.data.datasets) {
    const e = t.data.datasets.filter((s) => s.xAxisID === i || s.yAxisID === i);
    if (e.length)
      return Ys(i, "x", e[0]) || Ys(i, "y", e[0]);
  }
  return {};
}
function Ql(i, t) {
  const e = jt[i.type] || {
    scales: {}
  }, s = t.scales || {}, n = Ti(i.type, t), o = /* @__PURE__ */ Object.create(null);
  return Object.keys(s).forEach((a) => {
    const r = s[a];
    if (!O(r))
      return console.error(`Invalid scale configuration for scale: ${a}`);
    if (r._proxy)
      return console.warn(`Ignoring resolver passed as options for scale: ${a}`);
    const l = Ri(a, r, Jl(a, i), N.scales[r.type]), c = ql(l, n), h = e.scales || {};
    o[a] = be(/* @__PURE__ */ Object.create(null), [
      {
        axis: l
      },
      r,
      h[l],
      h[c]
    ]);
  }), i.data.datasets.forEach((a) => {
    const r = a.type || i.type, l = a.indexAxis || Ti(r, t), h = (jt[r] || {}).scales || {};
    Object.keys(h).forEach((d) => {
      const u = Gl(d, l), f = a[u + "AxisID"] || u;
      o[f] = o[f] || /* @__PURE__ */ Object.create(null), be(o[f], [
        {
          axis: u
        },
        s[f],
        h[d]
      ]);
    });
  }), Object.keys(o).forEach((a) => {
    const r = o[a];
    be(r, [
      N.scales[r.type],
      N.scale
    ]);
  }), o;
}
function uo(i) {
  const t = i.options || (i.options = {});
  t.plugins = D(t.plugins, {}), t.scales = Ql(i, t);
}
function fo(i) {
  return i = i || {}, i.datasets = i.datasets || [], i.labels = i.labels || [], i;
}
function tc(i) {
  return i = i || {}, i.data = fo(i.data), uo(i), i;
}
const Xs = /* @__PURE__ */ new Map(), go = /* @__PURE__ */ new Set();
function je(i, t) {
  let e = Xs.get(i);
  return e || (e = t(), Xs.set(i, e), go.add(e)), e;
}
const de = (i, t, e) => {
  const s = At(t, e);
  s !== void 0 && i.add(s);
};
class ec {
  constructor(t) {
    this._config = tc(t), this._scopeCache = /* @__PURE__ */ new Map(), this._resolverCache = /* @__PURE__ */ new Map();
  }
  get platform() {
    return this._config.platform;
  }
  get type() {
    return this._config.type;
  }
  set type(t) {
    this._config.type = t;
  }
  get data() {
    return this._config.data;
  }
  set data(t) {
    this._config.data = fo(t);
  }
  get options() {
    return this._config.options;
  }
  set options(t) {
    this._config.options = t;
  }
  get plugins() {
    return this._config.plugins;
  }
  update() {
    const t = this._config;
    this.clearCache(), uo(t);
  }
  clearCache() {
    this._scopeCache.clear(), this._resolverCache.clear();
  }
  datasetScopeKeys(t) {
    return je(t, () => [
      [
        `datasets.${t}`,
        ""
      ]
    ]);
  }
  datasetAnimationScopeKeys(t, e) {
    return je(`${t}.transition.${e}`, () => [
      [
        `datasets.${t}.transitions.${e}`,
        `transitions.${e}`
      ],
      [
        `datasets.${t}`,
        ""
      ]
    ]);
  }
  datasetElementScopeKeys(t, e) {
    return je(`${t}-${e}`, () => [
      [
        `datasets.${t}.elements.${e}`,
        `datasets.${t}`,
        `elements.${e}`,
        ""
      ]
    ]);
  }
  pluginScopeKeys(t) {
    const e = t.id, s = this.type;
    return je(`${s}-plugin-${e}`, () => [
      [
        `plugins.${e}`,
        ...t.additionalOptionScopes || []
      ]
    ]);
  }
  _cachedScopes(t, e) {
    const s = this._scopeCache;
    let n = s.get(t);
    return (!n || e) && (n = /* @__PURE__ */ new Map(), s.set(t, n)), n;
  }
  getOptionScopes(t, e, s) {
    const { options: n, type: o } = this, a = this._cachedScopes(t, s), r = a.get(e);
    if (r)
      return r;
    const l = /* @__PURE__ */ new Set();
    e.forEach((h) => {
      t && (l.add(t), h.forEach((d) => de(l, t, d))), h.forEach((d) => de(l, n, d)), h.forEach((d) => de(l, jt[o] || {}, d)), h.forEach((d) => de(l, N, d)), h.forEach((d) => de(l, Oi, d));
    });
    const c = Array.from(l);
    return c.length === 0 && c.push(/* @__PURE__ */ Object.create(null)), go.has(e) && a.set(e, c), c;
  }
  chartOptionScopes() {
    const { options: t, type: e } = this;
    return [
      t,
      jt[e] || {},
      N.datasets[e] || {},
      {
        type: e
      },
      N,
      Oi
    ];
  }
  resolveNamedOptions(t, e, s, n = [
    ""
  ]) {
    const o = {
      $shared: !0
    }, { resolver: a, subPrefixes: r } = Us(this._resolverCache, t, n);
    let l = a;
    if (sc(a, e)) {
      o.$shared = !1, s = Ot(s) ? s() : s;
      const c = this.createResolver(t, s, r);
      l = te(a, s, c);
    }
    for (const c of e)
      o[c] = l[c];
    return o;
  }
  createResolver(t, e, s = [
    ""
  ], n) {
    const { resolver: o } = Us(this._resolverCache, t, s);
    return O(e) ? te(o, e, void 0, n) : o;
  }
}
function Us(i, t, e) {
  let s = i.get(t);
  s || (s = /* @__PURE__ */ new Map(), i.set(t, s));
  const n = e.join();
  let o = s.get(n);
  return o || (o = {
    resolver: Ki(t, e),
    subPrefixes: e.filter((r) => !r.toLowerCase().includes("hover"))
  }, s.set(n, o)), o;
}
const ic = (i) => O(i) && Object.getOwnPropertyNames(i).some((t) => Ot(i[t]));
function sc(i, t) {
  const { isScriptable: e, isIndexable: s } = jn(i);
  for (const n of t) {
    const o = e(n), a = s(n), r = (a || o) && i[n];
    if (o && (Ot(r) || ic(r)) || a && V(r))
      return !0;
  }
  return !1;
}
var nc = "4.5.1";
const oc = [
  "top",
  "bottom",
  "left",
  "right",
  "chartArea"
];
function Ks(i, t) {
  return i === "top" || i === "bottom" || oc.indexOf(i) === -1 && t === "x";
}
function Gs(i, t) {
  return function(e, s) {
    return e[i] === s[i] ? e[t] - s[t] : e[i] - s[i];
  };
}
function qs(i) {
  const t = i.chart, e = t.options.animation;
  t.notifyPlugins("afterRender"), F(e && e.onComplete, [
    i
  ], t);
}
function ac(i) {
  const t = i.chart, e = t.options.animation;
  F(e && e.onProgress, [
    i
  ], t);
}
function po(i) {
  return Zi() && typeof i == "string" ? i = document.getElementById(i) : i && i.length && (i = i[0]), i && i.canvas && (i = i.canvas), i;
}
const qe = {}, Zs = (i) => {
  const t = po(i);
  return Object.values(qe).filter((e) => e.canvas === t).pop();
};
function rc(i, t, e) {
  const s = Object.keys(i);
  for (const n of s) {
    const o = +n;
    if (o >= t) {
      const a = i[n];
      delete i[n], (e > 0 || o > t) && (i[o + e] = a);
    }
  }
}
function lc(i, t, e, s) {
  return !e || i.type === "mouseout" ? null : s ? t : i;
}
class es {
  static defaults = N;
  static instances = qe;
  static overrides = jt;
  static registry = ct;
  static version = nc;
  static getChart = Zs;
  static register(...t) {
    ct.add(...t), Js();
  }
  static unregister(...t) {
    ct.remove(...t), Js();
  }
  constructor(t, e) {
    const s = this.config = new ec(e), n = po(t), o = Zs(n);
    if (o)
      throw new Error("Canvas is already in use. Chart with ID '" + o.id + "' must be destroyed before the canvas with ID '" + o.canvas.id + "' can be reused.");
    const a = s.createResolver(s.chartOptionScopes(), this.getContext());
    this.platform = new (s.platform || Dl(n))(), this.platform.updateConfig(s);
    const r = this.platform.acquireContext(n, a.aspectRatio), l = r && r.canvas, c = l && l.height, h = l && l.width;
    if (this.id = sa(), this.ctx = r, this.canvas = l, this.width = h, this.height = c, this._options = a, this._aspectRatio = this.aspectRatio, this._layers = [], this._metasets = [], this._stacks = void 0, this.boxes = [], this.currentDevicePixelRatio = void 0, this.chartArea = void 0, this._active = [], this._lastEvent = void 0, this._listeners = {}, this._responsiveListeners = void 0, this._sortedMetasets = [], this.scales = {}, this._plugins = new jl(), this.$proxies = {}, this._hiddenIndices = {}, this.attached = !1, this._animationsDisabled = void 0, this.$context = void 0, this._doResize = ya((d) => this.update(d), a.resizeDelay || 0), this._dataChanges = [], qe[this.id] = this, !r || !l) {
      console.error("Failed to create chart: can't acquire context from the given item");
      return;
    }
    ft.listen(this, "complete", qs), ft.listen(this, "progress", ac), this._initialize(), this.attached && this.update();
  }
  get aspectRatio() {
    const { options: { aspectRatio: t, maintainAspectRatio: e }, width: s, height: n, _aspectRatio: o } = this;
    return A(t) ? e && o ? o : n ? s / n : null : t;
  }
  get data() {
    return this.config.data;
  }
  set data(t) {
    this.config.data = t;
  }
  get options() {
    return this._options;
  }
  set options(t) {
    this.config.options = t;
  }
  get registry() {
    return ct;
  }
  _initialize() {
    return this.notifyPlugins("beforeInit"), this.options.responsive ? this.resize() : ys(this, this.options.devicePixelRatio), this.bindEvents(), this.notifyPlugins("afterInit"), this;
  }
  clear() {
    return bs(this.canvas, this.ctx), this;
  }
  stop() {
    return ft.stop(this), this;
  }
  resize(t, e) {
    ft.running(this) ? this._resizeBeforeDraw = {
      width: t,
      height: e
    } : this._resize(t, e);
  }
  _resize(t, e) {
    const s = this.options, n = this.canvas, o = s.maintainAspectRatio && this.aspectRatio, a = this.platform.getMaximumSize(n, t, e, o), r = s.devicePixelRatio || this.platform.getDevicePixelRatio(), l = this.width ? "resize" : "attach";
    this.width = a.width, this.height = a.height, this._aspectRatio = this.aspectRatio, ys(this, r, !0) && (this.notifyPlugins("resize", {
      size: a
    }), F(s.onResize, [
      this,
      a
    ], this), this.attached && this._doResize(l) && this.render());
  }
  ensureScalesHaveIDs() {
    const e = this.options.scales || {};
    R(e, (s, n) => {
      s.id = n;
    });
  }
  buildOrUpdateScales() {
    const t = this.options, e = t.scales, s = this.scales, n = Object.keys(s).reduce((a, r) => (a[r] = !1, a), {});
    let o = [];
    e && (o = o.concat(Object.keys(e).map((a) => {
      const r = e[a], l = Ri(a, r), c = l === "r", h = l === "x";
      return {
        options: r,
        dposition: c ? "chartArea" : h ? "bottom" : "left",
        dtype: c ? "radialLinear" : h ? "category" : "linear"
      };
    }))), R(o, (a) => {
      const r = a.options, l = r.id, c = Ri(l, r), h = D(r.type, a.dtype);
      (r.position === void 0 || Ks(r.position, c) !== Ks(a.dposition)) && (r.position = a.dposition), n[l] = !0;
      let d = null;
      if (l in s && s[l].type === h)
        d = s[l];
      else {
        const u = ct.getScale(h);
        d = new u({
          id: l,
          type: h,
          ctx: this.ctx,
          chart: this
        }), s[d.id] = d;
      }
      d.init(r, t);
    }), R(n, (a, r) => {
      a || delete s[r];
    }), R(s, (a) => {
      q.configure(this, a, a.options), q.addBox(this, a);
    });
  }
  _updateMetasets() {
    const t = this._metasets, e = this.data.datasets.length, s = t.length;
    if (t.sort((n, o) => n.index - o.index), s > e) {
      for (let n = e; n < s; ++n)
        this._destroyDatasetMeta(n);
      t.splice(e, s - e);
    }
    this._sortedMetasets = t.slice(0).sort(Gs("order", "index"));
  }
  _removeUnreferencedMetasets() {
    const { _metasets: t, data: { datasets: e } } = this;
    t.length > e.length && delete this._stacks, t.forEach((s, n) => {
      e.filter((o) => o === s._dataset).length === 0 && this._destroyDatasetMeta(n);
    });
  }
  buildOrUpdateControllers() {
    const t = [], e = this.data.datasets;
    let s, n;
    for (this._removeUnreferencedMetasets(), s = 0, n = e.length; s < n; s++) {
      const o = e[s];
      let a = this.getDatasetMeta(s);
      const r = o.type || this.config.type;
      if (a.type && a.type !== r && (this._destroyDatasetMeta(s), a = this.getDatasetMeta(s)), a.type = r, a.indexAxis = o.indexAxis || Ti(r, this.options), a.order = o.order || 0, a.index = s, a.label = "" + o.label, a.visible = this.isDatasetVisible(s), a.controller)
        a.controller.updateIndex(s), a.controller.linkScales();
      else {
        const l = ct.getController(r), { datasetElementType: c, dataElementType: h } = N.datasets[r];
        Object.assign(l, {
          dataElementType: ct.getElement(h),
          datasetElementType: c && ct.getElement(c)
        }), a.controller = new l(this, s), t.push(a.controller);
      }
    }
    return this._updateMetasets(), t;
  }
  _resetElements() {
    R(this.data.datasets, (t, e) => {
      this.getDatasetMeta(e).controller.reset();
    }, this);
  }
  reset() {
    this._resetElements(), this.notifyPlugins("reset");
  }
  update(t) {
    const e = this.config;
    e.update();
    const s = this._options = e.createResolver(e.chartOptionScopes(), this.getContext()), n = this._animationsDisabled = !s.animation;
    if (this._updateScales(), this._checkEventBindings(), this._updateHiddenIndices(), this._plugins.invalidate(), this.notifyPlugins("beforeUpdate", {
      mode: t,
      cancelable: !0
    }) === !1)
      return;
    const o = this.buildOrUpdateControllers();
    this.notifyPlugins("beforeElementsUpdate");
    let a = 0;
    for (let c = 0, h = this.data.datasets.length; c < h; c++) {
      const { controller: d } = this.getDatasetMeta(c), u = !n && o.indexOf(d) === -1;
      d.buildOrUpdateElements(u), a = Math.max(+d.getMaxOverflow(), a);
    }
    a = this._minPadding = s.layout.autoPadding ? a : 0, this._updateLayout(a), n || R(o, (c) => {
      c.reset();
    }), this._updateDatasets(t), this.notifyPlugins("afterUpdate", {
      mode: t
    }), this._layers.sort(Gs("z", "_idx"));
    const { _active: r, _lastEvent: l } = this;
    l ? this._eventHandler(l, !0) : r.length && this._updateHoverStyles(r, r, !0), this.render();
  }
  _updateScales() {
    R(this.scales, (t) => {
      q.removeBox(this, t);
    }), this.ensureScalesHaveIDs(), this.buildOrUpdateScales();
  }
  _checkEventBindings() {
    const t = this.options, e = new Set(Object.keys(this._listeners)), s = new Set(t.events);
    (!ls(e, s) || !!this._responsiveListeners !== t.responsive) && (this.unbindEvents(), this.bindEvents());
  }
  _updateHiddenIndices() {
    const { _hiddenIndices: t } = this, e = this._getUniformDataChanges() || [];
    for (const { method: s, start: n, count: o } of e) {
      const a = s === "_removeElements" ? -o : o;
      rc(t, n, a);
    }
  }
  _getUniformDataChanges() {
    const t = this._dataChanges;
    if (!t || !t.length)
      return;
    this._dataChanges = [];
    const e = this.data.datasets.length, s = (o) => new Set(t.filter((a) => a[0] === o).map((a, r) => r + "," + a.splice(1).join(","))), n = s(0);
    for (let o = 1; o < e; o++)
      if (!ls(n, s(o)))
        return;
    return Array.from(n).map((o) => o.split(",")).map((o) => ({
      method: o[1],
      start: +o[2],
      count: +o[3]
    }));
  }
  _updateLayout(t) {
    if (this.notifyPlugins("beforeLayout", {
      cancelable: !0
    }) === !1)
      return;
    q.update(this, this.width, this.height, t);
    const e = this.chartArea, s = e.width <= 0 || e.height <= 0;
    this._layers = [], R(this.boxes, (n) => {
      s && n.position === "chartArea" || (n.configure && n.configure(), this._layers.push(...n._layers()));
    }, this), this._layers.forEach((n, o) => {
      n._idx = o;
    }), this.notifyPlugins("afterLayout");
  }
  _updateDatasets(t) {
    if (this.notifyPlugins("beforeDatasetsUpdate", {
      mode: t,
      cancelable: !0
    }) !== !1) {
      for (let e = 0, s = this.data.datasets.length; e < s; ++e)
        this.getDatasetMeta(e).controller.configure();
      for (let e = 0, s = this.data.datasets.length; e < s; ++e)
        this._updateDataset(e, Ot(t) ? t({
          datasetIndex: e
        }) : t);
      this.notifyPlugins("afterDatasetsUpdate", {
        mode: t
      });
    }
  }
  _updateDataset(t, e) {
    const s = this.getDatasetMeta(t), n = {
      meta: s,
      index: t,
      mode: e,
      cancelable: !0
    };
    this.notifyPlugins("beforeDatasetUpdate", n) !== !1 && (s.controller._update(e), n.cancelable = !1, this.notifyPlugins("afterDatasetUpdate", n));
  }
  render() {
    this.notifyPlugins("beforeRender", {
      cancelable: !0
    }) !== !1 && (ft.has(this) ? this.attached && !ft.running(this) && ft.start(this) : (this.draw(), qs({
      chart: this
    })));
  }
  draw() {
    let t;
    if (this._resizeBeforeDraw) {
      const { width: s, height: n } = this._resizeBeforeDraw;
      this._resizeBeforeDraw = null, this._resize(s, n);
    }
    if (this.clear(), this.width <= 0 || this.height <= 0 || this.notifyPlugins("beforeDraw", {
      cancelable: !0
    }) === !1)
      return;
    const e = this._layers;
    for (t = 0; t < e.length && e[t].z <= 0; ++t)
      e[t].draw(this.chartArea);
    for (this._drawDatasets(); t < e.length; ++t)
      e[t].draw(this.chartArea);
    this.notifyPlugins("afterDraw");
  }
  _getSortedDatasetMetas(t) {
    const e = this._sortedMetasets, s = [];
    let n, o;
    for (n = 0, o = e.length; n < o; ++n) {
      const a = e[n];
      (!t || a.visible) && s.push(a);
    }
    return s;
  }
  getSortedVisibleDatasetMetas() {
    return this._getSortedDatasetMetas(!0);
  }
  _drawDatasets() {
    if (this.notifyPlugins("beforeDatasetsDraw", {
      cancelable: !0
    }) === !1)
      return;
    const t = this.getSortedVisibleDatasetMetas();
    for (let e = t.length - 1; e >= 0; --e)
      this._drawDataset(t[e]);
    this.notifyPlugins("afterDatasetsDraw");
  }
  _drawDataset(t) {
    const e = this.ctx, s = {
      meta: t,
      index: t.index,
      cancelable: !0
    }, n = eo(this, t);
    this.notifyPlugins("beforeDatasetDraw", s) !== !1 && (n && ai(e, n), t.controller.draw(), n && ri(e), s.cancelable = !1, this.notifyPlugins("afterDatasetDraw", s));
  }
  isPointInArea(t) {
    return _t(t, this.chartArea, this._minPadding);
  }
  getElementsAtEventForMode(t, e, s, n) {
    const o = ol.modes[e];
    return typeof o == "function" ? o(this, t, s, n) : [];
  }
  getDatasetMeta(t) {
    const e = this.data.datasets[t], s = this._metasets;
    let n = s.filter((o) => o && o._dataset === e).pop();
    return n || (n = {
      type: null,
      data: [],
      dataset: null,
      controller: null,
      hidden: null,
      xAxisID: null,
      yAxisID: null,
      order: e && e.order || 0,
      index: t,
      _dataset: e,
      _parsed: [],
      _sorted: !1
    }, s.push(n)), n;
  }
  getContext() {
    return this.$context || (this.$context = Lt(null, {
      chart: this,
      type: "chart"
    }));
  }
  getVisibleDatasetCount() {
    return this.getSortedVisibleDatasetMetas().length;
  }
  isDatasetVisible(t) {
    const e = this.data.datasets[t];
    if (!e)
      return !1;
    const s = this.getDatasetMeta(t);
    return typeof s.hidden == "boolean" ? !s.hidden : !e.hidden;
  }
  setDatasetVisibility(t, e) {
    const s = this.getDatasetMeta(t);
    s.hidden = !e;
  }
  toggleDataVisibility(t) {
    this._hiddenIndices[t] = !this._hiddenIndices[t];
  }
  getDataVisibility(t) {
    return !this._hiddenIndices[t];
  }
  _updateVisibility(t, e, s) {
    const n = s ? "show" : "hide", o = this.getDatasetMeta(t), a = o.controller._resolveAnimations(void 0, n);
    Me(e) ? (o.data[e].hidden = !s, this.update()) : (this.setDatasetVisibility(t, s), a.update(o, {
      visible: s
    }), this.update((r) => r.datasetIndex === t ? n : void 0));
  }
  hide(t, e) {
    this._updateVisibility(t, e, !1);
  }
  show(t, e) {
    this._updateVisibility(t, e, !0);
  }
  _destroyDatasetMeta(t) {
    const e = this._metasets[t];
    e && e.controller && e.controller._destroy(), delete this._metasets[t];
  }
  _stop() {
    let t, e;
    for (this.stop(), ft.remove(this), t = 0, e = this.data.datasets.length; t < e; ++t)
      this._destroyDatasetMeta(t);
  }
  destroy() {
    this.notifyPlugins("beforeDestroy");
    const { canvas: t, ctx: e } = this;
    this._stop(), this.config.clearCache(), t && (this.unbindEvents(), bs(t, e), this.platform.releaseContext(e), this.canvas = null, this.ctx = null), delete qe[this.id], this.notifyPlugins("afterDestroy");
  }
  toBase64Image(...t) {
    return this.canvas.toDataURL(...t);
  }
  bindEvents() {
    this.bindUserEvents(), this.options.responsive ? this.bindResponsiveEvents() : this.attached = !0;
  }
  bindUserEvents() {
    const t = this._listeners, e = this.platform, s = (o, a) => {
      e.addEventListener(this, o, a), t[o] = a;
    }, n = (o, a, r) => {
      o.offsetX = a, o.offsetY = r, this._eventHandler(o);
    };
    R(this.options.events, (o) => s(o, n));
  }
  bindResponsiveEvents() {
    this._responsiveListeners || (this._responsiveListeners = {});
    const t = this._responsiveListeners, e = this.platform, s = (l, c) => {
      e.addEventListener(this, l, c), t[l] = c;
    }, n = (l, c) => {
      t[l] && (e.removeEventListener(this, l, c), delete t[l]);
    }, o = (l, c) => {
      this.canvas && this.resize(l, c);
    };
    let a;
    const r = () => {
      n("attach", r), this.attached = !0, this.resize(), s("resize", o), s("detach", a);
    };
    a = () => {
      this.attached = !1, n("resize", o), this._stop(), this._resize(0, 0), s("attach", r);
    }, e.isAttached(this.canvas) ? r() : a();
  }
  unbindEvents() {
    R(this._listeners, (t, e) => {
      this.platform.removeEventListener(this, e, t);
    }), this._listeners = {}, R(this._responsiveListeners, (t, e) => {
      this.platform.removeEventListener(this, e, t);
    }), this._responsiveListeners = void 0;
  }
  updateHoverStyle(t, e, s) {
    const n = s ? "set" : "remove";
    let o, a, r, l;
    for (e === "dataset" && (o = this.getDatasetMeta(t[0].datasetIndex), o.controller["_" + n + "DatasetHoverStyle"]()), r = 0, l = t.length; r < l; ++r) {
      a = t[r];
      const c = a && this.getDatasetMeta(a.datasetIndex).controller;
      c && c[n + "HoverStyle"](a.element, a.datasetIndex, a.index);
    }
  }
  getActiveElements() {
    return this._active || [];
  }
  setActiveElements(t) {
    const e = this._active || [], s = t.map(({ datasetIndex: o, index: a }) => {
      const r = this.getDatasetMeta(o);
      if (!r)
        throw new Error("No dataset found at index " + o);
      return {
        datasetIndex: o,
        element: r.data[a],
        index: a
      };
    });
    !Ze(s, e) && (this._active = s, this._lastEvent = null, this._updateHoverStyles(s, e));
  }
  notifyPlugins(t, e, s) {
    return this._plugins.notify(this, t, e, s);
  }
  isPluginEnabled(t) {
    return this._plugins._cache.filter((e) => e.plugin.id === t).length === 1;
  }
  _updateHoverStyles(t, e, s) {
    const n = this.options.hover, o = (l, c) => l.filter((h) => !c.some((d) => h.datasetIndex === d.datasetIndex && h.index === d.index)), a = o(e, t), r = s ? t : o(t, e);
    a.length && this.updateHoverStyle(a, n.mode, !1), r.length && n.mode && this.updateHoverStyle(r, n.mode, !0);
  }
  _eventHandler(t, e) {
    const s = {
      event: t,
      replay: e,
      cancelable: !0,
      inChartArea: this.isPointInArea(t)
    }, n = (a) => (a.options.events || this.options.events).includes(t.native.type);
    if (this.notifyPlugins("beforeEvent", s, n) === !1)
      return;
    const o = this._handleEvent(t, e, s.inChartArea);
    return s.cancelable = !1, this.notifyPlugins("afterEvent", s, n), (o || s.changed) && this.render(), this;
  }
  _handleEvent(t, e, s) {
    const { _active: n = [], options: o } = this, a = e, r = this._getActiveElements(t, n, s, a), l = ca(t), c = lc(t, this._lastEvent, s, l);
    s && (this._lastEvent = null, F(o.onHover, [
      t,
      r,
      this
    ], this), l && F(o.onClick, [
      t,
      r,
      this
    ], this));
    const h = !Ze(r, n);
    return (h || e) && (this._active = r, this._updateHoverStyles(r, n, e)), this._lastEvent = c, h;
  }
  _getActiveElements(t, e, s, n) {
    if (t.type === "mouseout")
      return [];
    if (!s)
      return e;
    const o = this.options.hover;
    return this.getElementsAtEventForMode(t, o.mode, o, n);
  }
}
function Js() {
  return R(es.instances, (i) => i._plugins.invalidate());
}
function cc(i, t, e) {
  const { startAngle: s, x: n, y: o, outerRadius: a, innerRadius: r, options: l } = t, { borderWidth: c, borderJoinStyle: h } = l, d = Math.min(c / a, G(s - e));
  if (i.beginPath(), i.arc(n, o, a - c / 2, s + d / 2, e - d / 2), r > 0) {
    const u = Math.min(c / r, G(s - e));
    i.arc(n, o, r + c / 2, e - u / 2, s + u / 2, !0);
  } else {
    const u = Math.min(c / 2, a * G(s - e));
    if (h === "round")
      i.arc(n, o, u, e - T / 2, s + T / 2, !0);
    else if (h === "bevel") {
      const f = 2 * u * u, g = -f * Math.cos(e + T / 2) + n, p = -f * Math.sin(e + T / 2) + o, m = f * Math.cos(s + T / 2) + n, b = f * Math.sin(s + T / 2) + o;
      i.lineTo(g, p), i.lineTo(m, b);
    }
  }
  i.closePath(), i.moveTo(0, 0), i.rect(0, 0, i.canvas.width, i.canvas.height), i.clip("evenodd");
}
function hc(i, t, e) {
  const { startAngle: s, pixelMargin: n, x: o, y: a, outerRadius: r, innerRadius: l } = t;
  let c = n / r;
  i.beginPath(), i.arc(o, a, r, s - c, e + c), l > n ? (c = n / l, i.arc(o, a, l, e + c, s - c, !0)) : i.arc(o, a, n, e + H, s - H), i.closePath(), i.clip();
}
function dc(i) {
  return Ui(i, [
    "outerStart",
    "outerEnd",
    "innerStart",
    "innerEnd"
  ]);
}
function uc(i, t, e, s) {
  const n = dc(i.options.borderRadius), o = (e - t) / 2, a = Math.min(o, s * t / 2), r = (l) => {
    const c = (e - Math.min(o, l)) * s / 2;
    return Y(l, 0, Math.min(o, c));
  };
  return {
    outerStart: r(n.outerStart),
    outerEnd: r(n.outerEnd),
    innerStart: Y(n.innerStart, 0, a),
    innerEnd: Y(n.innerEnd, 0, a)
  };
}
function Zt(i, t, e, s) {
  return {
    x: e + i * Math.cos(t),
    y: s + i * Math.sin(t)
  };
}
function si(i, t, e, s, n, o) {
  const { x: a, y: r, startAngle: l, pixelMargin: c, innerRadius: h } = t, d = Math.max(t.outerRadius + s + e - c, 0), u = h > 0 ? h + s + e + c : 0;
  let f = 0;
  const g = n - l;
  if (s) {
    const E = h > 0 ? h - s : 0, B = d > 0 ? d - s : 0, $ = (E + B) / 2, at = $ !== 0 ? g * $ / ($ + s) : g;
    f = (g - at) / 2;
  }
  const p = Math.max(1e-3, g * d - e / T) / d, m = (g - p) / 2, b = l + m + f, _ = n - m - f, { outerStart: v, outerEnd: y, innerStart: x, innerEnd: k } = uc(t, u, d, _ - b), M = d - v, S = d - y, w = b + v / M, C = _ - y / S, P = u + x, L = u + k, X = b + x / P, et = _ - k / L;
  if (i.beginPath(), o) {
    const E = (w + C) / 2;
    if (i.arc(a, r, d, w, E), i.arc(a, r, d, E, C), y > 0) {
      const U = Zt(S, C, a, r);
      i.arc(U.x, U.y, y, C, _ + H);
    }
    const B = Zt(L, _, a, r);
    if (i.lineTo(B.x, B.y), k > 0) {
      const U = Zt(L, et, a, r);
      i.arc(U.x, U.y, k, _ + H, et + Math.PI);
    }
    const $ = (_ - k / u + (b + x / u)) / 2;
    if (i.arc(a, r, u, _ - k / u, $, !0), i.arc(a, r, u, $, b + x / u, !0), x > 0) {
      const U = Zt(P, X, a, r);
      i.arc(U.x, U.y, x, X + Math.PI, b - H);
    }
    const at = Zt(M, b, a, r);
    if (i.lineTo(at.x, at.y), v > 0) {
      const U = Zt(M, w, a, r);
      i.arc(U.x, U.y, v, b - H, w);
    }
  } else {
    i.moveTo(a, r);
    const E = Math.cos(w) * d + a, B = Math.sin(w) * d + r;
    i.lineTo(E, B);
    const $ = Math.cos(C) * d + a, at = Math.sin(C) * d + r;
    i.lineTo($, at);
  }
  i.closePath();
}
function fc(i, t, e, s, n) {
  const { fullCircles: o, startAngle: a, circumference: r } = t;
  let l = t.endAngle;
  if (o) {
    si(i, t, e, s, l, n);
    for (let c = 0; c < o; ++c)
      i.fill();
    isNaN(r) || (l = a + (r % I || I));
  }
  return si(i, t, e, s, l, n), i.fill(), l;
}
function gc(i, t, e, s, n) {
  const { fullCircles: o, startAngle: a, circumference: r, options: l } = t, { borderWidth: c, borderJoinStyle: h, borderDash: d, borderDashOffset: u, borderRadius: f } = l, g = l.borderAlign === "inner";
  if (!c)
    return;
  i.setLineDash(d || []), i.lineDashOffset = u, g ? (i.lineWidth = c * 2, i.lineJoin = h || "round") : (i.lineWidth = c, i.lineJoin = h || "bevel");
  let p = t.endAngle;
  if (o) {
    si(i, t, e, s, p, n);
    for (let m = 0; m < o; ++m)
      i.stroke();
    isNaN(r) || (p = a + (r % I || I));
  }
  g && hc(i, t, p), l.selfJoin && p - a >= T && f === 0 && h !== "miter" && cc(i, t, p), o || (si(i, t, e, s, p, n), i.stroke());
}
class pc extends yt {
  static id = "arc";
  static defaults = {
    borderAlign: "center",
    borderColor: "#fff",
    borderDash: [],
    borderDashOffset: 0,
    borderJoinStyle: void 0,
    borderRadius: 0,
    borderWidth: 2,
    offset: 0,
    spacing: 0,
    angle: void 0,
    circular: !0,
    selfJoin: !1
  };
  static defaultRoutes = {
    backgroundColor: "backgroundColor"
  };
  static descriptors = {
    _scriptable: !0,
    _indexable: (t) => t !== "borderDash"
  };
  circumference;
  endAngle;
  fullCircles;
  innerRadius;
  outerRadius;
  pixelMargin;
  startAngle;
  constructor(t) {
    super(), this.options = void 0, this.circumference = void 0, this.startAngle = void 0, this.endAngle = void 0, this.innerRadius = void 0, this.outerRadius = void 0, this.pixelMargin = 0, this.fullCircles = 0, t && Object.assign(this, t);
  }
  inRange(t, e, s) {
    const n = this.getProps([
      "x",
      "y"
    ], s), { angle: o, distance: a } = En(n, {
      x: t,
      y: e
    }), { startAngle: r, endAngle: l, innerRadius: c, outerRadius: h, circumference: d } = this.getProps([
      "startAngle",
      "endAngle",
      "innerRadius",
      "outerRadius",
      "circumference"
    ], s), u = (this.options.spacing + this.options.borderWidth) / 2, f = D(d, l - r), g = Se(o, r, l) && r !== l, p = f >= I || g, m = mt(a, c + u, h + u);
    return p && m;
  }
  getCenterPoint(t) {
    const { x: e, y: s, startAngle: n, endAngle: o, innerRadius: a, outerRadius: r } = this.getProps([
      "x",
      "y",
      "startAngle",
      "endAngle",
      "innerRadius",
      "outerRadius"
    ], t), { offset: l, spacing: c } = this.options, h = (n + o) / 2, d = (a + r + c + l) / 2;
    return {
      x: e + Math.cos(h) * d,
      y: s + Math.sin(h) * d
    };
  }
  tooltipPosition(t) {
    return this.getCenterPoint(t);
  }
  draw(t) {
    const { options: e, circumference: s } = this, n = (e.offset || 0) / 4, o = (e.spacing || 0) / 2, a = e.circular;
    if (this.pixelMargin = e.borderAlign === "inner" ? 0.33 : 0, this.fullCircles = s > I ? Math.floor(s / I) : 0, s === 0 || this.innerRadius < 0 || this.outerRadius < 0)
      return;
    t.save();
    const r = (this.startAngle + this.endAngle) / 2;
    t.translate(Math.cos(r) * n, Math.sin(r) * n);
    const l = 1 - Math.sin(Math.min(T, s || 0)), c = n * l;
    t.fillStyle = e.backgroundColor, t.strokeStyle = e.borderColor, fc(t, this, c, o, a), gc(t, this, c, o, a), t.restore();
  }
}
function mo(i, t, e = t) {
  i.lineCap = D(e.borderCapStyle, t.borderCapStyle), i.setLineDash(D(e.borderDash, t.borderDash)), i.lineDashOffset = D(e.borderDashOffset, t.borderDashOffset), i.lineJoin = D(e.borderJoinStyle, t.borderJoinStyle), i.lineWidth = D(e.borderWidth, t.borderWidth), i.strokeStyle = D(e.borderColor, t.borderColor);
}
function mc(i, t, e) {
  i.lineTo(e.x, e.y);
}
function bc(i) {
  return i.stepped ? Ta : i.tension || i.cubicInterpolationMode === "monotone" ? Ra : mc;
}
function bo(i, t, e = {}) {
  const s = i.length, { start: n = 0, end: o = s - 1 } = e, { start: a, end: r } = t, l = Math.max(n, a), c = Math.min(o, r), h = n < a && o < a || n > r && o > r;
  return {
    count: s,
    start: l,
    loop: t.loop,
    ilen: c < l && !h ? s + c - l : c - l
  };
}
function _c(i, t, e, s) {
  const { points: n, options: o } = t, { count: a, start: r, loop: l, ilen: c } = bo(n, e, s), h = bc(o);
  let { move: d = !0, reverse: u } = s || {}, f, g, p;
  for (f = 0; f <= c; ++f)
    g = n[(r + (u ? c - f : f)) % a], !g.skip && (d ? (i.moveTo(g.x, g.y), d = !1) : h(i, p, g, u, o.stepped), p = g);
  return l && (g = n[(r + (u ? c : 0)) % a], h(i, p, g, u, o.stepped)), !!l;
}
function xc(i, t, e, s) {
  const n = t.points, { count: o, start: a, ilen: r } = bo(n, e, s), { move: l = !0, reverse: c } = s || {};
  let h = 0, d = 0, u, f, g, p, m, b;
  const _ = (y) => (a + (c ? r - y : y)) % o, v = () => {
    p !== m && (i.lineTo(h, m), i.lineTo(h, p), i.lineTo(h, b));
  };
  for (l && (f = n[_(0)], i.moveTo(f.x, f.y)), u = 0; u <= r; ++u) {
    if (f = n[_(u)], f.skip)
      continue;
    const y = f.x, x = f.y, k = y | 0;
    k === g ? (x < p ? p = x : x > m && (m = x), h = (d * h + y) / ++d) : (v(), i.lineTo(y, x), g = k, d = 0, p = m = x), b = x;
  }
  v();
}
function Ei(i) {
  const t = i.options, e = t.borderDash && t.borderDash.length;
  return !i._decimated && !i._loop && !t.tension && t.cubicInterpolationMode !== "monotone" && !t.stepped && !e ? xc : _c;
}
function yc(i) {
  return i.stepped ? dr : i.tension || i.cubicInterpolationMode === "monotone" ? ur : Wt;
}
function vc(i, t, e, s) {
  let n = t._path;
  n || (n = t._path = new Path2D(), t.path(n, e, s) && n.closePath()), mo(i, t.options), i.stroke(n);
}
function kc(i, t, e, s) {
  const { segments: n, options: o } = t, a = Ei(t);
  for (const r of n)
    mo(i, o, r.style), i.beginPath(), a(i, t, r, {
      start: e,
      end: e + s - 1
    }) && i.closePath(), i.stroke();
}
const Mc = typeof Path2D == "function";
function Sc(i, t, e, s) {
  Mc && !t.options.segment ? vc(i, t, e, s) : kc(i, t, e, s);
}
class hi extends yt {
  static id = "line";
  static defaults = {
    borderCapStyle: "butt",
    borderDash: [],
    borderDashOffset: 0,
    borderJoinStyle: "miter",
    borderWidth: 3,
    capBezierPoints: !0,
    cubicInterpolationMode: "default",
    fill: !1,
    spanGaps: !1,
    stepped: !1,
    tension: 0
  };
  static defaultRoutes = {
    backgroundColor: "backgroundColor",
    borderColor: "borderColor"
  };
  static descriptors = {
    _scriptable: !0,
    _indexable: (t) => t !== "borderDash" && t !== "fill"
  };
  constructor(t) {
    super(), this.animated = !0, this.options = void 0, this._chart = void 0, this._loop = void 0, this._fullLoop = void 0, this._path = void 0, this._points = void 0, this._segments = void 0, this._decimated = !1, this._pointsUpdated = !1, this._datasetIndex = void 0, t && Object.assign(this, t);
  }
  updateControlPoints(t, e) {
    const s = this.options;
    if ((s.tension || s.cubicInterpolationMode === "monotone") && !s.stepped && !this._pointsUpdated) {
      const n = s.spanGaps ? this._loop : this._fullLoop;
      sr(this._points, s, t, n, e), this._pointsUpdated = !0;
    }
  }
  set points(t) {
    this._points = t, delete this._segments, delete this._path, this._pointsUpdated = !1;
  }
  get points() {
    return this._points;
  }
  get segments() {
    return this._segments || (this._segments = _r(this, this.options.segment));
  }
  first() {
    const t = this.segments, e = this.points;
    return t.length && e[t[0].start];
  }
  last() {
    const t = this.segments, e = this.points, s = t.length;
    return s && e[t[s - 1].end];
  }
  interpolate(t, e) {
    const s = this.options, n = t[e], o = this.points, a = to(this, {
      property: e,
      start: n,
      end: n
    });
    if (!a.length)
      return;
    const r = [], l = yc(s);
    let c, h;
    for (c = 0, h = a.length; c < h; ++c) {
      const { start: d, end: u } = a[c], f = o[d], g = o[u];
      if (f === g) {
        r.push(f);
        continue;
      }
      const p = Math.abs((n - f[e]) / (g[e] - f[e])), m = l(f, g, p, s.stepped);
      m[e] = t[e], r.push(m);
    }
    return r.length === 1 ? r[0] : r;
  }
  pathSegment(t, e, s) {
    return Ei(this)(t, this, e, s);
  }
  path(t, e, s) {
    const n = this.segments, o = Ei(this);
    let a = this._loop;
    e = e || 0, s = s || this.points.length - e;
    for (const r of n)
      a &= o(t, this, r, {
        start: e,
        end: e + s - 1
      });
    return !!a;
  }
  draw(t, e, s, n) {
    const o = this.options || {};
    (this.points || []).length && o.borderWidth && (t.save(), Sc(t, this, s, n), t.restore()), this.animated && (this._pointsUpdated = !1, this._path = void 0);
  }
}
function Qs(i, t, e, s) {
  const n = i.options, { [e]: o } = i.getProps([
    e
  ], s);
  return Math.abs(t - o) < n.radius + n.hitRadius;
}
class wc extends yt {
  static id = "point";
  parsed;
  skip;
  stop;
  /**
  * @type {any}
  */
  static defaults = {
    borderWidth: 1,
    hitRadius: 1,
    hoverBorderWidth: 1,
    hoverRadius: 4,
    pointStyle: "circle",
    radius: 3,
    rotation: 0
  };
  /**
  * @type {any}
  */
  static defaultRoutes = {
    backgroundColor: "backgroundColor",
    borderColor: "borderColor"
  };
  constructor(t) {
    super(), this.options = void 0, this.parsed = void 0, this.skip = void 0, this.stop = void 0, t && Object.assign(this, t);
  }
  inRange(t, e, s) {
    const n = this.options, { x: o, y: a } = this.getProps([
      "x",
      "y"
    ], s);
    return Math.pow(t - o, 2) + Math.pow(e - a, 2) < Math.pow(n.hitRadius + n.radius, 2);
  }
  inXRange(t, e) {
    return Qs(this, t, "x", e);
  }
  inYRange(t, e) {
    return Qs(this, t, "y", e);
  }
  getCenterPoint(t) {
    const { x: e, y: s } = this.getProps([
      "x",
      "y"
    ], t);
    return {
      x: e,
      y: s
    };
  }
  size(t) {
    t = t || this.options || {};
    let e = t.radius || 0;
    e = Math.max(e, e && t.hoverRadius || 0);
    const s = e && t.borderWidth || 0;
    return (e + s) * 2;
  }
  draw(t, e) {
    const s = this.options;
    this.skip || s.radius < 0.1 || !_t(this, e, this.size(s) / 2) || (t.strokeStyle = s.borderColor, t.lineWidth = s.borderWidth, t.fillStyle = s.backgroundColor, Li(t, s, this.x, this.y));
  }
  getRange() {
    const t = this.options || {};
    return t.radius + t.hitRadius;
  }
}
function _o(i, t) {
  const { x: e, y: s, base: n, width: o, height: a } = i.getProps([
    "x",
    "y",
    "base",
    "width",
    "height"
  ], t);
  let r, l, c, h, d;
  return i.horizontal ? (d = a / 2, r = Math.min(e, n), l = Math.max(e, n), c = s - d, h = s + d) : (d = o / 2, r = e - d, l = e + d, c = Math.min(s, n), h = Math.max(s, n)), {
    left: r,
    top: c,
    right: l,
    bottom: h
  };
}
function Dt(i, t, e, s) {
  return i ? 0 : Y(t, e, s);
}
function Dc(i, t, e) {
  const s = i.options.borderWidth, n = i.borderSkipped, o = Hn(s);
  return {
    t: Dt(n.top, o.top, 0, e),
    r: Dt(n.right, o.right, 0, t),
    b: Dt(n.bottom, o.bottom, 0, e),
    l: Dt(n.left, o.left, 0, t)
  };
}
function Cc(i, t, e) {
  const { enableBorderRadius: s } = i.getProps([
    "enableBorderRadius"
  ]), n = i.options.borderRadius, o = $t(n), a = Math.min(t, e), r = i.borderSkipped, l = s || O(n);
  return {
    topLeft: Dt(!l || r.top || r.left, o.topLeft, 0, a),
    topRight: Dt(!l || r.top || r.right, o.topRight, 0, a),
    bottomLeft: Dt(!l || r.bottom || r.left, o.bottomLeft, 0, a),
    bottomRight: Dt(!l || r.bottom || r.right, o.bottomRight, 0, a)
  };
}
function Pc(i) {
  const t = _o(i), e = t.right - t.left, s = t.bottom - t.top, n = Dc(i, e / 2, s / 2), o = Cc(i, e / 2, s / 2);
  return {
    outer: {
      x: t.left,
      y: t.top,
      w: e,
      h: s,
      radius: o
    },
    inner: {
      x: t.left + n.l,
      y: t.top + n.t,
      w: e - n.l - n.r,
      h: s - n.t - n.b,
      radius: {
        topLeft: Math.max(0, o.topLeft - Math.max(n.t, n.l)),
        topRight: Math.max(0, o.topRight - Math.max(n.t, n.r)),
        bottomLeft: Math.max(0, o.bottomLeft - Math.max(n.b, n.l)),
        bottomRight: Math.max(0, o.bottomRight - Math.max(n.b, n.r))
      }
    }
  };
}
function Si(i, t, e, s) {
  const n = t === null, o = e === null, r = i && !(n && o) && _o(i, s);
  return r && (n || mt(t, r.left, r.right)) && (o || mt(e, r.top, r.bottom));
}
function Ac(i) {
  return i.topLeft || i.topRight || i.bottomLeft || i.bottomRight;
}
function Oc(i, t) {
  i.rect(t.x, t.y, t.w, t.h);
}
function wi(i, t, e = {}) {
  const s = i.x !== e.x ? -t : 0, n = i.y !== e.y ? -t : 0, o = (i.x + i.w !== e.x + e.w ? t : 0) - s, a = (i.y + i.h !== e.y + e.h ? t : 0) - n;
  return {
    x: i.x + s,
    y: i.y + n,
    w: i.w + o,
    h: i.h + a,
    radius: i.radius
  };
}
class Lc extends yt {
  static id = "bar";
  static defaults = {
    borderSkipped: "start",
    borderWidth: 0,
    borderRadius: 0,
    inflateAmount: "auto",
    pointStyle: void 0
  };
  static defaultRoutes = {
    backgroundColor: "backgroundColor",
    borderColor: "borderColor"
  };
  constructor(t) {
    super(), this.options = void 0, this.horizontal = void 0, this.base = void 0, this.width = void 0, this.height = void 0, this.inflateAmount = void 0, t && Object.assign(this, t);
  }
  draw(t) {
    const { inflateAmount: e, options: { borderColor: s, backgroundColor: n } } = this, { inner: o, outer: a } = Pc(this), r = Ac(a.radius) ? we : Oc;
    t.save(), (a.w !== o.w || a.h !== o.h) && (t.beginPath(), r(t, wi(a, e, o)), t.clip(), r(t, wi(o, -e, a)), t.fillStyle = s, t.fill("evenodd")), t.beginPath(), r(t, wi(o, e)), t.fillStyle = n, t.fill(), t.restore();
  }
  inRange(t, e, s) {
    return Si(this, t, e, s);
  }
  inXRange(t, e) {
    return Si(this, t, null, e);
  }
  inYRange(t, e) {
    return Si(this, null, t, e);
  }
  getCenterPoint(t) {
    const { x: e, y: s, base: n, horizontal: o } = this.getProps([
      "x",
      "y",
      "base",
      "horizontal"
    ], t);
    return {
      x: o ? (e + n) / 2 : e,
      y: o ? s : (s + n) / 2
    };
  }
  getRange(t) {
    return t === "x" ? this.width / 2 : this.height / 2;
  }
}
var Tc = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ArcElement: pc,
  BarElement: Lc,
  LineElement: hi,
  PointElement: wc
});
const Fi = [
  "rgb(54, 162, 235)",
  "rgb(255, 99, 132)",
  "rgb(255, 159, 64)",
  "rgb(255, 205, 86)",
  "rgb(75, 192, 192)",
  "rgb(153, 102, 255)",
  "rgb(201, 203, 207)"
  // grey
], tn = /* @__PURE__ */ Fi.map((i) => i.replace("rgb(", "rgba(").replace(")", ", 0.5)"));
function xo(i) {
  return Fi[i % Fi.length];
}
function yo(i) {
  return tn[i % tn.length];
}
function Rc(i, t) {
  return i.borderColor = xo(t), i.backgroundColor = yo(t), ++t;
}
function Ec(i, t) {
  return i.backgroundColor = i.data.map(() => xo(t++)), t;
}
function Fc(i, t) {
  return i.backgroundColor = i.data.map(() => yo(t++)), t;
}
function zc(i) {
  let t = 0;
  return (e, s) => {
    const n = i.getDatasetMeta(s).controller;
    n instanceof Qi ? t = Ec(e, t) : n instanceof oo ? t = Fc(e, t) : n && (t = Rc(e, t));
  };
}
function en(i) {
  let t;
  for (t in i)
    if (i[t].borderColor || i[t].backgroundColor)
      return !0;
  return !1;
}
function Ic(i) {
  return i && (i.borderColor || i.backgroundColor);
}
function Bc() {
  return N.borderColor !== "rgba(0,0,0,0.1)" || N.backgroundColor !== "rgba(0,0,0,0.1)";
}
var Vc = {
  id: "colors",
  defaults: {
    enabled: !0,
    forceOverride: !1
  },
  beforeLayout(i, t, e) {
    if (!e.enabled)
      return;
    const { data: { datasets: s }, options: n } = i.config, { elements: o } = n, a = en(s) || Ic(n) || o && en(o) || Bc();
    if (!e.forceOverride && a)
      return;
    const r = zc(i);
    s.forEach(r);
  }
};
function Nc(i, t, e, s, n) {
  const o = n.samples || s;
  if (o >= e)
    return i.slice(t, t + e);
  const a = [], r = (e - 2) / (o - 2);
  let l = 0;
  const c = t + e - 1;
  let h = t, d, u, f, g, p;
  for (a[l++] = i[h], d = 0; d < o - 2; d++) {
    let m = 0, b = 0, _;
    const v = Math.floor((d + 1) * r) + 1 + t, y = Math.min(Math.floor((d + 2) * r) + 1, e) + t, x = y - v;
    for (_ = v; _ < y; _++)
      m += i[_].x, b += i[_].y;
    m /= x, b /= x;
    const k = Math.floor(d * r) + 1 + t, M = Math.min(Math.floor((d + 1) * r) + 1, e) + t, { x: S, y: w } = i[h];
    for (f = g = -1, _ = k; _ < M; _++)
      g = 0.5 * Math.abs((S - m) * (i[_].y - w) - (S - i[_].x) * (b - w)), g > f && (f = g, u = i[_], p = _);
    a[l++] = u, h = p;
  }
  return a[l++] = i[c], a;
}
function Wc(i, t, e, s) {
  let n = 0, o = 0, a, r, l, c, h, d, u, f, g, p;
  const m = [], b = t + e - 1, _ = i[t].x, y = i[b].x - _;
  for (a = t; a < t + e; ++a) {
    r = i[a], l = (r.x - _) / y * s, c = r.y;
    const x = l | 0;
    if (x === h)
      c < g ? (g = c, d = a) : c > p && (p = c, u = a), n = (o * n + r.x) / ++o;
    else {
      const k = a - 1;
      if (!A(d) && !A(u)) {
        const M = Math.min(d, u), S = Math.max(d, u);
        M !== f && M !== k && m.push({
          ...i[M],
          x: n
        }), S !== f && S !== k && m.push({
          ...i[S],
          x: n
        });
      }
      a > 0 && k !== f && m.push(i[k]), m.push(r), h = x, o = 0, g = p = c, d = u = f = a;
    }
  }
  return m;
}
function vo(i) {
  if (i._decimated) {
    const t = i._data;
    delete i._decimated, delete i._data, Object.defineProperty(i, "data", {
      configurable: !0,
      enumerable: !0,
      writable: !0,
      value: t
    });
  }
}
function sn(i) {
  i.data.datasets.forEach((t) => {
    vo(t);
  });
}
function $c(i, t) {
  const e = t.length;
  let s = 0, n;
  const { iScale: o } = i, { min: a, max: r, minDefined: l, maxDefined: c } = o.getUserBounds();
  return l && (s = Y(bt(t, o.axis, a).lo, 0, e - 1)), c ? n = Y(bt(t, o.axis, r).hi + 1, s, e) - s : n = e - s, {
    start: s,
    count: n
  };
}
var Hc = {
  id: "decimation",
  defaults: {
    algorithm: "min-max",
    enabled: !1
  },
  beforeElementsUpdate: (i, t, e) => {
    if (!e.enabled) {
      sn(i);
      return;
    }
    const s = i.width;
    i.data.datasets.forEach((n, o) => {
      const { _data: a, indexAxis: r } = n, l = i.getDatasetMeta(o), c = a || n.data;
      if (fe([
        r,
        i.options.indexAxis
      ]) === "y" || !l.controller.supportsDecimation)
        return;
      const h = i.scales[l.xAxisID];
      if (h.type !== "linear" && h.type !== "time" || i.options.parsing)
        return;
      let { start: d, count: u } = $c(l, c);
      const f = e.threshold || 4 * s;
      if (u <= f) {
        vo(n);
        return;
      }
      A(a) && (n._data = c, delete n.data, Object.defineProperty(n, "data", {
        configurable: !0,
        enumerable: !0,
        get: function() {
          return this._decimated;
        },
        set: function(p) {
          this._data = p;
        }
      }));
      let g;
      switch (e.algorithm) {
        case "lttb":
          g = Nc(c, d, u, s, e);
          break;
        case "min-max":
          g = Wc(c, d, u, s);
          break;
        default:
          throw new Error(`Unsupported decimation algorithm '${e.algorithm}'`);
      }
      n._decimated = g;
    });
  },
  destroy(i) {
    sn(i);
  }
};
function jc(i, t, e) {
  const s = i.segments, n = i.points, o = t.points, a = [];
  for (const r of s) {
    let { start: l, end: c } = r;
    c = di(l, c, n);
    const h = zi(e, n[l], n[c], r.loop);
    if (!t.segments) {
      a.push({
        source: r,
        target: h,
        start: n[l],
        end: n[c]
      });
      continue;
    }
    const d = to(t, h);
    for (const u of d) {
      const f = zi(e, o[u.start], o[u.end], u.loop), g = Qn(r, n, f);
      for (const p of g)
        a.push({
          source: p,
          target: u,
          start: {
            [e]: nn(h, f, "start", Math.max)
          },
          end: {
            [e]: nn(h, f, "end", Math.min)
          }
        });
    }
  }
  return a;
}
function zi(i, t, e, s) {
  if (s)
    return;
  let n = t[i], o = e[i];
  return i === "angle" && (n = G(n), o = G(o)), {
    property: i,
    start: n,
    end: o
  };
}
function Yc(i, t) {
  const { x: e = null, y: s = null } = i || {}, n = t.points, o = [];
  return t.segments.forEach(({ start: a, end: r }) => {
    r = di(a, r, n);
    const l = n[a], c = n[r];
    s !== null ? (o.push({
      x: l.x,
      y: s
    }), o.push({
      x: c.x,
      y: s
    })) : e !== null && (o.push({
      x: e,
      y: l.y
    }), o.push({
      x: e,
      y: c.y
    }));
  }), o;
}
function di(i, t, e) {
  for (; t > i; t--) {
    const s = e[t];
    if (!isNaN(s.x) && !isNaN(s.y))
      break;
  }
  return t;
}
function nn(i, t, e, s) {
  return i && t ? s(i[e], t[e]) : i ? i[e] : t ? t[e] : 0;
}
function ko(i, t) {
  let e = [], s = !1;
  return V(i) ? (s = !0, e = i) : e = Yc(i, t), e.length ? new hi({
    points: e,
    options: {
      tension: 0
    },
    _loop: s,
    _fullLoop: s
  }) : null;
}
function on(i) {
  return i && i.fill !== !1;
}
function Xc(i, t, e) {
  let n = i[t].fill;
  const o = [
    t
  ];
  let a;
  if (!e)
    return n;
  for (; n !== !1 && o.indexOf(n) === -1; ) {
    if (!W(n))
      return n;
    if (a = i[n], !a)
      return !1;
    if (a.visible)
      return n;
    o.push(n), n = a.fill;
  }
  return !1;
}
function Uc(i, t, e) {
  const s = Zc(i);
  if (O(s))
    return isNaN(s.value) ? !1 : s;
  let n = parseFloat(s);
  return W(n) && Math.floor(n) === n ? Kc(s[0], t, n, e) : [
    "origin",
    "start",
    "end",
    "stack",
    "shape"
  ].indexOf(s) >= 0 && s;
}
function Kc(i, t, e, s) {
  return (i === "-" || i === "+") && (e = t + e), e === t || e < 0 || e >= s ? !1 : e;
}
function Gc(i, t) {
  let e = null;
  return i === "start" ? e = t.bottom : i === "end" ? e = t.top : O(i) ? e = t.getPixelForValue(i.value) : t.getBasePixel && (e = t.getBasePixel()), e;
}
function qc(i, t, e) {
  let s;
  return i === "start" ? s = e : i === "end" ? s = t.options.reverse ? t.min : t.max : O(i) ? s = i.value : s = t.getBaseValue(), s;
}
function Zc(i) {
  const t = i.options, e = t.fill;
  let s = D(e && e.target, e);
  return s === void 0 && (s = !!t.backgroundColor), s === !1 || s === null ? !1 : s === !0 ? "origin" : s;
}
function Jc(i) {
  const { scale: t, index: e, line: s } = i, n = [], o = s.segments, a = s.points, r = Qc(t, e);
  r.push(ko({
    x: null,
    y: t.bottom
  }, s));
  for (let l = 0; l < o.length; l++) {
    const c = o[l];
    for (let h = c.start; h <= c.end; h++)
      th(n, a[h], r);
  }
  return new hi({
    points: n,
    options: {}
  });
}
function Qc(i, t) {
  const e = [], s = i.getMatchingVisibleMetas("line");
  for (let n = 0; n < s.length; n++) {
    const o = s[n];
    if (o.index === t)
      break;
    o.hidden || e.unshift(o.dataset);
  }
  return e;
}
function th(i, t, e) {
  const s = [];
  for (let n = 0; n < e.length; n++) {
    const o = e[n], { first: a, last: r, point: l } = eh(o, t, "x");
    if (!(!l || a && r)) {
      if (a)
        s.unshift(l);
      else if (i.push(l), !r)
        break;
    }
  }
  i.push(...s);
}
function eh(i, t, e) {
  const s = i.interpolate(t, e);
  if (!s)
    return {};
  const n = s[e], o = i.segments, a = i.points;
  let r = !1, l = !1;
  for (let c = 0; c < o.length; c++) {
    const h = o[c], d = a[h.start][e], u = a[h.end][e];
    if (mt(n, d, u)) {
      r = n === d, l = n === u;
      break;
    }
  }
  return {
    first: r,
    last: l,
    point: s
  };
}
class Mo {
  constructor(t) {
    this.x = t.x, this.y = t.y, this.radius = t.radius;
  }
  pathSegment(t, e, s) {
    const { x: n, y: o, radius: a } = this;
    return e = e || {
      start: 0,
      end: I
    }, t.arc(n, o, a, e.end, e.start, !0), !s.bounds;
  }
  interpolate(t) {
    const { x: e, y: s, radius: n } = this, o = t.angle;
    return {
      x: e + Math.cos(o) * n,
      y: s + Math.sin(o) * n,
      angle: o
    };
  }
}
function ih(i) {
  const { chart: t, fill: e, line: s } = i;
  if (W(e))
    return sh(t, e);
  if (e === "stack")
    return Jc(i);
  if (e === "shape")
    return !0;
  const n = nh(i);
  return n instanceof Mo ? n : ko(n, s);
}
function sh(i, t) {
  const e = i.getDatasetMeta(t);
  return e && i.isDatasetVisible(t) ? e.dataset : null;
}
function nh(i) {
  return (i.scale || {}).getPointPositionForValue ? ah(i) : oh(i);
}
function oh(i) {
  const { scale: t = {}, fill: e } = i, s = Gc(e, t);
  if (W(s)) {
    const n = t.isHorizontal();
    return {
      x: n ? s : null,
      y: n ? null : s
    };
  }
  return null;
}
function ah(i) {
  const { scale: t, fill: e } = i, s = t.options, n = t.getLabels().length, o = s.reverse ? t.max : t.min, a = qc(e, t, o), r = [];
  if (s.grid.circular) {
    const l = t.getPointPositionForValue(0, o);
    return new Mo({
      x: l.x,
      y: l.y,
      radius: t.getDistanceFromCenterForValue(a)
    });
  }
  for (let l = 0; l < n; ++l)
    r.push(t.getPointPositionForValue(l, a));
  return r;
}
function Di(i, t, e) {
  const s = ih(t), { chart: n, index: o, line: a, scale: r, axis: l } = t, c = a.options, h = c.fill, d = c.backgroundColor, { above: u = d, below: f = d } = h || {}, g = n.getDatasetMeta(o), p = eo(n, g);
  s && a.points.length && (ai(i, e), rh(i, {
    line: a,
    target: s,
    above: u,
    below: f,
    area: e,
    scale: r,
    axis: l,
    clip: p
  }), ri(i));
}
function rh(i, t) {
  const { line: e, target: s, above: n, below: o, area: a, scale: r, clip: l } = t, c = e._loop ? "angle" : t.axis;
  i.save();
  let h = o;
  o !== n && (c === "x" ? (an(i, s, a.top), Ci(i, {
    line: e,
    target: s,
    color: n,
    scale: r,
    property: c,
    clip: l
  }), i.restore(), i.save(), an(i, s, a.bottom)) : c === "y" && (rn(i, s, a.left), Ci(i, {
    line: e,
    target: s,
    color: o,
    scale: r,
    property: c,
    clip: l
  }), i.restore(), i.save(), rn(i, s, a.right), h = n)), Ci(i, {
    line: e,
    target: s,
    color: h,
    scale: r,
    property: c,
    clip: l
  }), i.restore();
}
function an(i, t, e) {
  const { segments: s, points: n } = t;
  let o = !0, a = !1;
  i.beginPath();
  for (const r of s) {
    const { start: l, end: c } = r, h = n[l], d = n[di(l, c, n)];
    o ? (i.moveTo(h.x, h.y), o = !1) : (i.lineTo(h.x, e), i.lineTo(h.x, h.y)), a = !!t.pathSegment(i, r, {
      move: a
    }), a ? i.closePath() : i.lineTo(d.x, e);
  }
  i.lineTo(t.first().x, e), i.closePath(), i.clip();
}
function rn(i, t, e) {
  const { segments: s, points: n } = t;
  let o = !0, a = !1;
  i.beginPath();
  for (const r of s) {
    const { start: l, end: c } = r, h = n[l], d = n[di(l, c, n)];
    o ? (i.moveTo(h.x, h.y), o = !1) : (i.lineTo(e, h.y), i.lineTo(h.x, h.y)), a = !!t.pathSegment(i, r, {
      move: a
    }), a ? i.closePath() : i.lineTo(e, d.y);
  }
  i.lineTo(e, t.first().y), i.closePath(), i.clip();
}
function Ci(i, t) {
  const { line: e, target: s, property: n, color: o, scale: a, clip: r } = t, l = jc(e, s, n);
  for (const { source: c, target: h, start: d, end: u } of l) {
    const { style: { backgroundColor: f = o } = {} } = c, g = s !== !0;
    i.save(), i.fillStyle = f, lh(i, a, r, g && zi(n, d, u)), i.beginPath();
    const p = !!e.pathSegment(i, c);
    let m;
    if (g) {
      p ? i.closePath() : ln(i, s, u, n);
      const b = !!s.pathSegment(i, h, {
        move: p,
        reverse: !0
      });
      m = p && b, m || ln(i, s, d, n);
    }
    i.closePath(), i.fill(m ? "evenodd" : "nonzero"), i.restore();
  }
}
function lh(i, t, e, s) {
  const n = t.chart.chartArea, { property: o, start: a, end: r } = s || {};
  if (o === "x" || o === "y") {
    let l, c, h, d;
    o === "x" ? (l = a, c = n.top, h = r, d = n.bottom) : (l = n.left, c = a, h = n.right, d = r), i.beginPath(), e && (l = Math.max(l, e.left), h = Math.min(h, e.right), c = Math.max(c, e.top), d = Math.min(d, e.bottom)), i.rect(l, c, h - l, d - c), i.clip();
  }
}
function ln(i, t, e, s) {
  const n = t.interpolate(e, s);
  n && i.lineTo(n.x, n.y);
}
var ch = {
  id: "filler",
  afterDatasetsUpdate(i, t, e) {
    const s = (i.data.datasets || []).length, n = [];
    let o, a, r, l;
    for (a = 0; a < s; ++a)
      o = i.getDatasetMeta(a), r = o.dataset, l = null, r && r.options && r instanceof hi && (l = {
        visible: i.isDatasetVisible(a),
        index: a,
        fill: Uc(r, a, s),
        chart: i,
        axis: o.controller.options.indexAxis,
        scale: o.vScale,
        line: r
      }), o.$filler = l, n.push(l);
    for (a = 0; a < s; ++a)
      l = n[a], !(!l || l.fill === !1) && (l.fill = Xc(n, a, e.propagate));
  },
  beforeDraw(i, t, e) {
    const s = e.drawTime === "beforeDraw", n = i.getSortedVisibleDatasetMetas(), o = i.chartArea;
    for (let a = n.length - 1; a >= 0; --a) {
      const r = n[a].$filler;
      r && (r.line.updateControlPoints(o, r.axis), s && r.fill && Di(i.ctx, r, o));
    }
  },
  beforeDatasetsDraw(i, t, e) {
    if (e.drawTime !== "beforeDatasetsDraw")
      return;
    const s = i.getSortedVisibleDatasetMetas();
    for (let n = s.length - 1; n >= 0; --n) {
      const o = s[n].$filler;
      on(o) && Di(i.ctx, o, i.chartArea);
    }
  },
  beforeDatasetDraw(i, t, e) {
    const s = t.meta.$filler;
    !on(s) || e.drawTime !== "beforeDatasetDraw" || Di(i.ctx, s, i.chartArea);
  },
  defaults: {
    propagate: !0,
    drawTime: "beforeDatasetDraw"
  }
};
const cn = (i, t) => {
  let { boxHeight: e = t, boxWidth: s = t } = i;
  return i.usePointStyle && (e = Math.min(e, t), s = i.pointStyleWidth || Math.min(s, t)), {
    boxWidth: s,
    boxHeight: e,
    itemHeight: Math.max(t, e)
  };
}, hh = (i, t) => i !== null && t !== null && i.datasetIndex === t.datasetIndex && i.index === t.index;
class hn extends yt {
  constructor(t) {
    super(), this._added = !1, this.legendHitBoxes = [], this._hoveredItem = null, this.doughnutMode = !1, this.chart = t.chart, this.options = t.options, this.ctx = t.ctx, this.legendItems = void 0, this.columnSizes = void 0, this.lineWidths = void 0, this.maxHeight = void 0, this.maxWidth = void 0, this.top = void 0, this.bottom = void 0, this.left = void 0, this.right = void 0, this.height = void 0, this.width = void 0, this._margins = void 0, this.position = void 0, this.weight = void 0, this.fullSize = void 0;
  }
  update(t, e, s) {
    this.maxWidth = t, this.maxHeight = e, this._margins = s, this.setDimensions(), this.buildLabels(), this.fit();
  }
  setDimensions() {
    this.isHorizontal() ? (this.width = this.maxWidth, this.left = this._margins.left, this.right = this.width) : (this.height = this.maxHeight, this.top = this._margins.top, this.bottom = this.height);
  }
  buildLabels() {
    const t = this.options.labels || {};
    let e = F(t.generateLabels, [
      this.chart
    ], this) || [];
    t.filter && (e = e.filter((s) => t.filter(s, this.chart.data))), t.sort && (e = e.sort((s, n) => t.sort(s, n, this.chart.data))), this.options.reverse && e.reverse(), this.legendItems = e;
  }
  fit() {
    const { options: t, ctx: e } = this;
    if (!t.display) {
      this.width = this.height = 0;
      return;
    }
    const s = t.labels, n = j(s.font), o = n.size, a = this._computeTitleHeight(), { boxWidth: r, itemHeight: l } = cn(s, o);
    let c, h;
    e.font = n.string, this.isHorizontal() ? (c = this.maxWidth, h = this._fitRows(a, o, r, l) + 10) : (h = this.maxHeight, c = this._fitCols(a, n, r, l) + 10), this.width = Math.min(c, t.maxWidth || this.maxWidth), this.height = Math.min(h, t.maxHeight || this.maxHeight);
  }
  _fitRows(t, e, s, n) {
    const { ctx: o, maxWidth: a, options: { labels: { padding: r } } } = this, l = this.legendHitBoxes = [], c = this.lineWidths = [
      0
    ], h = n + r;
    let d = t;
    o.textAlign = "left", o.textBaseline = "middle";
    let u = -1, f = -h;
    return this.legendItems.forEach((g, p) => {
      const m = s + e / 2 + o.measureText(g.text).width;
      (p === 0 || c[c.length - 1] + m + 2 * r > a) && (d += h, c[c.length - (p > 0 ? 0 : 1)] = 0, f += h, u++), l[p] = {
        left: 0,
        top: f,
        row: u,
        width: m,
        height: n
      }, c[c.length - 1] += m + r;
    }), d;
  }
  _fitCols(t, e, s, n) {
    const { ctx: o, maxHeight: a, options: { labels: { padding: r } } } = this, l = this.legendHitBoxes = [], c = this.columnSizes = [], h = a - t;
    let d = r, u = 0, f = 0, g = 0, p = 0;
    return this.legendItems.forEach((m, b) => {
      const { itemWidth: _, itemHeight: v } = dh(s, e, o, m, n);
      b > 0 && f + v + 2 * r > h && (d += u + r, c.push({
        width: u,
        height: f
      }), g += u + r, p++, u = f = 0), l[b] = {
        left: g,
        top: f,
        col: p,
        width: _,
        height: v
      }, u = Math.max(u, _), f += v + r;
    }), d += u, c.push({
      width: u,
      height: f
    }), d;
  }
  adjustHitBoxes() {
    if (!this.options.display)
      return;
    const t = this._computeTitleHeight(), { legendHitBoxes: e, options: { align: s, labels: { padding: n }, rtl: o } } = this, a = Jt(o, this.left, this.width);
    if (this.isHorizontal()) {
      let r = 0, l = K(s, this.left + n, this.right - this.lineWidths[r]);
      for (const c of e)
        r !== c.row && (r = c.row, l = K(s, this.left + n, this.right - this.lineWidths[r])), c.top += this.top + t + n, c.left = a.leftForLtr(a.x(l), c.width), l += c.width + n;
    } else {
      let r = 0, l = K(s, this.top + t + n, this.bottom - this.columnSizes[r].height);
      for (const c of e)
        c.col !== r && (r = c.col, l = K(s, this.top + t + n, this.bottom - this.columnSizes[r].height)), c.top = l, c.left += this.left + n, c.left = a.leftForLtr(a.x(c.left), c.width), l += c.height + n;
    }
  }
  isHorizontal() {
    return this.options.position === "top" || this.options.position === "bottom";
  }
  draw() {
    if (this.options.display) {
      const t = this.ctx;
      ai(t, this), this._draw(), ri(t);
    }
  }
  _draw() {
    const { options: t, columnSizes: e, lineWidths: s, ctx: n } = this, { align: o, labels: a } = t, r = N.color, l = Jt(t.rtl, this.left, this.width), c = j(a.font), { padding: h } = a, d = c.size, u = d / 2;
    let f;
    this.drawTitle(), n.textAlign = l.textAlign("left"), n.textBaseline = "middle", n.lineWidth = 0.5, n.font = c.string;
    const { boxWidth: g, boxHeight: p, itemHeight: m } = cn(a, d), b = function(k, M, S) {
      if (isNaN(g) || g <= 0 || isNaN(p) || p < 0)
        return;
      n.save();
      const w = D(S.lineWidth, 1);
      if (n.fillStyle = D(S.fillStyle, r), n.lineCap = D(S.lineCap, "butt"), n.lineDashOffset = D(S.lineDashOffset, 0), n.lineJoin = D(S.lineJoin, "miter"), n.lineWidth = w, n.strokeStyle = D(S.strokeStyle, r), n.setLineDash(D(S.lineDash, [])), a.usePointStyle) {
        const C = {
          radius: p * Math.SQRT2 / 2,
          pointStyle: S.pointStyle,
          rotation: S.rotation,
          borderWidth: w
        }, P = l.xPlus(k, g / 2), L = M + u;
        $n(n, C, P, L, a.pointStyleWidth && g);
      } else {
        const C = M + Math.max((d - p) / 2, 0), P = l.leftForLtr(k, g), L = $t(S.borderRadius);
        n.beginPath(), Object.values(L).some((X) => X !== 0) ? we(n, {
          x: P,
          y: C,
          w: g,
          h: p,
          radius: L
        }) : n.rect(P, C, g, p), n.fill(), w !== 0 && n.stroke();
      }
      n.restore();
    }, _ = function(k, M, S) {
      Yt(n, S.text, k, M + m / 2, c, {
        strikethrough: S.hidden,
        textAlign: l.textAlign(S.textAlign)
      });
    }, v = this.isHorizontal(), y = this._computeTitleHeight();
    v ? f = {
      x: K(o, this.left + h, this.right - s[0]),
      y: this.top + h + y,
      line: 0
    } : f = {
      x: this.left + h,
      y: K(o, this.top + y + h, this.bottom - e[0].height),
      line: 0
    }, qn(this.ctx, t.textDirection);
    const x = m + h;
    this.legendItems.forEach((k, M) => {
      n.strokeStyle = k.fontColor, n.fillStyle = k.fontColor;
      const S = n.measureText(k.text).width, w = l.textAlign(k.textAlign || (k.textAlign = a.textAlign)), C = g + u + S;
      let P = f.x, L = f.y;
      l.setWidth(this.width), v ? M > 0 && P + C + h > this.right && (L = f.y += x, f.line++, P = f.x = K(o, this.left + h, this.right - s[f.line])) : M > 0 && L + x > this.bottom && (P = f.x = P + e[f.line].width + h, f.line++, L = f.y = K(o, this.top + y + h, this.bottom - e[f.line].height));
      const X = l.x(P);
      if (b(X, L, k), P = va(w, P + g + u, v ? P + C : this.right, t.rtl), _(l.x(P), L, k), v)
        f.x += C + h;
      else if (typeof k.text != "string") {
        const et = c.lineHeight;
        f.y += So(k, et) + h;
      } else
        f.y += x;
    }), Zn(this.ctx, t.textDirection);
  }
  drawTitle() {
    const t = this.options, e = t.title, s = j(e.font), n = Z(e.padding);
    if (!e.display)
      return;
    const o = Jt(t.rtl, this.left, this.width), a = this.ctx, r = e.position, l = s.size / 2, c = n.top + l;
    let h, d = this.left, u = this.width;
    if (this.isHorizontal())
      u = Math.max(...this.lineWidths), h = this.top + c, d = K(t.align, d, this.right - u);
    else {
      const g = this.columnSizes.reduce((p, m) => Math.max(p, m.height), 0);
      h = c + K(t.align, this.top, this.bottom - g - t.labels.padding - this._computeTitleHeight());
    }
    const f = K(r, d, d + u);
    a.textAlign = o.textAlign(Yi(r)), a.textBaseline = "middle", a.strokeStyle = e.color, a.fillStyle = e.color, a.font = s.string, Yt(a, e.text, f, h, s);
  }
  _computeTitleHeight() {
    const t = this.options.title, e = j(t.font), s = Z(t.padding);
    return t.display ? e.lineHeight + s.height : 0;
  }
  _getLegendItemAt(t, e) {
    let s, n, o;
    if (mt(t, this.left, this.right) && mt(e, this.top, this.bottom)) {
      for (o = this.legendHitBoxes, s = 0; s < o.length; ++s)
        if (n = o[s], mt(t, n.left, n.left + n.width) && mt(e, n.top, n.top + n.height))
          return this.legendItems[s];
    }
    return null;
  }
  handleEvent(t) {
    const e = this.options;
    if (!gh(t.type, e))
      return;
    const s = this._getLegendItemAt(t.x, t.y);
    if (t.type === "mousemove" || t.type === "mouseout") {
      const n = this._hoveredItem, o = hh(n, s);
      n && !o && F(e.onLeave, [
        t,
        n,
        this
      ], this), this._hoveredItem = s, s && !o && F(e.onHover, [
        t,
        s,
        this
      ], this);
    } else s && F(e.onClick, [
      t,
      s,
      this
    ], this);
  }
}
function dh(i, t, e, s, n) {
  const o = uh(s, i, t, e), a = fh(n, s, t.lineHeight);
  return {
    itemWidth: o,
    itemHeight: a
  };
}
function uh(i, t, e, s) {
  let n = i.text;
  return n && typeof n != "string" && (n = n.reduce((o, a) => o.length > a.length ? o : a)), t + e.size / 2 + s.measureText(n).width;
}
function fh(i, t, e) {
  let s = i;
  return typeof t.text != "string" && (s = So(t, e)), s;
}
function So(i, t) {
  const e = i.text ? i.text.length : 0;
  return t * e;
}
function gh(i, t) {
  return !!((i === "mousemove" || i === "mouseout") && (t.onHover || t.onLeave) || t.onClick && (i === "click" || i === "mouseup"));
}
var ph = {
  id: "legend",
  _element: hn,
  start(i, t, e) {
    const s = i.legend = new hn({
      ctx: i.ctx,
      options: e,
      chart: i
    });
    q.configure(i, s, e), q.addBox(i, s);
  },
  stop(i) {
    q.removeBox(i, i.legend), delete i.legend;
  },
  beforeUpdate(i, t, e) {
    const s = i.legend;
    q.configure(i, s, e), s.options = e;
  },
  afterUpdate(i) {
    const t = i.legend;
    t.buildLabels(), t.adjustHitBoxes();
  },
  afterEvent(i, t) {
    t.replay || i.legend.handleEvent(t.event);
  },
  defaults: {
    display: !0,
    position: "top",
    align: "center",
    fullSize: !0,
    reverse: !1,
    weight: 1e3,
    onClick(i, t, e) {
      const s = t.datasetIndex, n = e.chart;
      n.isDatasetVisible(s) ? (n.hide(s), t.hidden = !0) : (n.show(s), t.hidden = !1);
    },
    onHover: null,
    onLeave: null,
    labels: {
      color: (i) => i.chart.options.color,
      boxWidth: 40,
      padding: 10,
      generateLabels(i) {
        const t = i.data.datasets, { labels: { usePointStyle: e, pointStyle: s, textAlign: n, color: o, useBorderRadius: a, borderRadius: r } } = i.legend.options;
        return i._getSortedDatasetMetas().map((l) => {
          const c = l.controller.getStyle(e ? 0 : void 0), h = Z(c.borderWidth);
          return {
            text: t[l.index].label,
            fillStyle: c.backgroundColor,
            fontColor: o,
            hidden: !l.visible,
            lineCap: c.borderCapStyle,
            lineDash: c.borderDash,
            lineDashOffset: c.borderDashOffset,
            lineJoin: c.borderJoinStyle,
            lineWidth: (h.width + h.height) / 4,
            strokeStyle: c.borderColor,
            pointStyle: s || c.pointStyle,
            rotation: c.rotation,
            textAlign: n || c.textAlign,
            borderRadius: a && (r || c.borderRadius),
            datasetIndex: l.index
          };
        }, this);
      }
    },
    title: {
      color: (i) => i.chart.options.color,
      display: !1,
      position: "center",
      text: ""
    }
  },
  descriptors: {
    _scriptable: (i) => !i.startsWith("on"),
    labels: {
      _scriptable: (i) => ![
        "generateLabels",
        "filter",
        "sort"
      ].includes(i)
    }
  }
};
class is extends yt {
  constructor(t) {
    super(), this.chart = t.chart, this.options = t.options, this.ctx = t.ctx, this._padding = void 0, this.top = void 0, this.bottom = void 0, this.left = void 0, this.right = void 0, this.width = void 0, this.height = void 0, this.position = void 0, this.weight = void 0, this.fullSize = void 0;
  }
  update(t, e) {
    const s = this.options;
    if (this.left = 0, this.top = 0, !s.display) {
      this.width = this.height = this.right = this.bottom = 0;
      return;
    }
    this.width = this.right = t, this.height = this.bottom = e;
    const n = V(s.text) ? s.text.length : 1;
    this._padding = Z(s.padding);
    const o = n * j(s.font).lineHeight + this._padding.height;
    this.isHorizontal() ? this.height = o : this.width = o;
  }
  isHorizontal() {
    const t = this.options.position;
    return t === "top" || t === "bottom";
  }
  _drawArgs(t) {
    const { top: e, left: s, bottom: n, right: o, options: a } = this, r = a.align;
    let l = 0, c, h, d;
    return this.isHorizontal() ? (h = K(r, s, o), d = e + t, c = o - s) : (a.position === "left" ? (h = s + t, d = K(r, n, e), l = T * -0.5) : (h = o - t, d = K(r, e, n), l = T * 0.5), c = n - e), {
      titleX: h,
      titleY: d,
      maxWidth: c,
      rotation: l
    };
  }
  draw() {
    const t = this.ctx, e = this.options;
    if (!e.display)
      return;
    const s = j(e.font), o = s.lineHeight / 2 + this._padding.top, { titleX: a, titleY: r, maxWidth: l, rotation: c } = this._drawArgs(o);
    Yt(t, e.text, 0, 0, s, {
      color: e.color,
      maxWidth: l,
      rotation: c,
      textAlign: Yi(e.align),
      textBaseline: "middle",
      translation: [
        a,
        r
      ]
    });
  }
}
function mh(i, t) {
  const e = new is({
    ctx: i.ctx,
    options: t,
    chart: i
  });
  q.configure(i, e, t), q.addBox(i, e), i.titleBlock = e;
}
var bh = {
  id: "title",
  _element: is,
  start(i, t, e) {
    mh(i, e);
  },
  stop(i) {
    const t = i.titleBlock;
    q.removeBox(i, t), delete i.titleBlock;
  },
  beforeUpdate(i, t, e) {
    const s = i.titleBlock;
    q.configure(i, s, e), s.options = e;
  },
  defaults: {
    align: "center",
    display: !1,
    font: {
      weight: "bold"
    },
    fullSize: !0,
    padding: 10,
    position: "top",
    text: "",
    weight: 2e3
  },
  defaultRoutes: {
    color: "color"
  },
  descriptors: {
    _scriptable: !0,
    _indexable: !1
  }
};
const Ye = /* @__PURE__ */ new WeakMap();
var _h = {
  id: "subtitle",
  start(i, t, e) {
    const s = new is({
      ctx: i.ctx,
      options: e,
      chart: i
    });
    q.configure(i, s, e), q.addBox(i, s), Ye.set(i, s);
  },
  stop(i) {
    q.removeBox(i, Ye.get(i)), Ye.delete(i);
  },
  beforeUpdate(i, t, e) {
    const s = Ye.get(i);
    q.configure(i, s, e), s.options = e;
  },
  defaults: {
    align: "center",
    display: !1,
    font: {
      weight: "normal"
    },
    fullSize: !0,
    padding: 0,
    position: "top",
    text: "",
    weight: 1500
  },
  defaultRoutes: {
    color: "color"
  },
  descriptors: {
    _scriptable: !0,
    _indexable: !1
  }
};
const pe = {
  average(i) {
    if (!i.length)
      return !1;
    let t, e, s = /* @__PURE__ */ new Set(), n = 0, o = 0;
    for (t = 0, e = i.length; t < e; ++t) {
      const r = i[t].element;
      if (r && r.hasValue()) {
        const l = r.tooltipPosition();
        s.add(l.x), n += l.y, ++o;
      }
    }
    return o === 0 || s.size === 0 ? !1 : {
      x: [
        ...s
      ].reduce((r, l) => r + l) / s.size,
      y: n / o
    };
  },
  nearest(i, t) {
    if (!i.length)
      return !1;
    let e = t.x, s = t.y, n = Number.POSITIVE_INFINITY, o, a, r;
    for (o = 0, a = i.length; o < a; ++o) {
      const l = i[o].element;
      if (l && l.hasValue()) {
        const c = l.getCenterPoint(), h = Ai(t, c);
        h < n && (n = h, r = l);
      }
    }
    if (r) {
      const l = r.tooltipPosition();
      e = l.x, s = l.y;
    }
    return {
      x: e,
      y: s
    };
  }
};
function lt(i, t) {
  return t && (V(t) ? Array.prototype.push.apply(i, t) : i.push(t)), i;
}
function gt(i) {
  return (typeof i == "string" || i instanceof String) && i.indexOf(`
`) > -1 ? i.split(`
`) : i;
}
function xh(i, t) {
  const { element: e, datasetIndex: s, index: n } = t, o = i.getDatasetMeta(s).controller, { label: a, value: r } = o.getLabelAndValue(n);
  return {
    chart: i,
    label: a,
    parsed: o.getParsed(n),
    raw: i.data.datasets[s].data[n],
    formattedValue: r,
    dataset: o.getDataset(),
    dataIndex: n,
    datasetIndex: s,
    element: e
  };
}
function dn(i, t) {
  const e = i.chart.ctx, { body: s, footer: n, title: o } = i, { boxWidth: a, boxHeight: r } = t, l = j(t.bodyFont), c = j(t.titleFont), h = j(t.footerFont), d = o.length, u = n.length, f = s.length, g = Z(t.padding);
  let p = g.height, m = 0, b = s.reduce((y, x) => y + x.before.length + x.lines.length + x.after.length, 0);
  if (b += i.beforeBody.length + i.afterBody.length, d && (p += d * c.lineHeight + (d - 1) * t.titleSpacing + t.titleMarginBottom), b) {
    const y = t.displayColors ? Math.max(r, l.lineHeight) : l.lineHeight;
    p += f * y + (b - f) * l.lineHeight + (b - 1) * t.bodySpacing;
  }
  u && (p += t.footerMarginTop + u * h.lineHeight + (u - 1) * t.footerSpacing);
  let _ = 0;
  const v = function(y) {
    m = Math.max(m, e.measureText(y).width + _);
  };
  return e.save(), e.font = c.string, R(i.title, v), e.font = l.string, R(i.beforeBody.concat(i.afterBody), v), _ = t.displayColors ? a + 2 + t.boxPadding : 0, R(s, (y) => {
    R(y.before, v), R(y.lines, v), R(y.after, v);
  }), _ = 0, e.font = h.string, R(i.footer, v), e.restore(), m += g.width, {
    width: m,
    height: p
  };
}
function yh(i, t) {
  const { y: e, height: s } = t;
  return e < s / 2 ? "top" : e > i.height - s / 2 ? "bottom" : "center";
}
function vh(i, t, e, s) {
  const { x: n, width: o } = s, a = e.caretSize + e.caretPadding;
  if (i === "left" && n + o + a > t.width || i === "right" && n - o - a < 0)
    return !0;
}
function kh(i, t, e, s) {
  const { x: n, width: o } = e, { width: a, chartArea: { left: r, right: l } } = i;
  let c = "center";
  return s === "center" ? c = n <= (r + l) / 2 ? "left" : "right" : n <= o / 2 ? c = "left" : n >= a - o / 2 && (c = "right"), vh(c, i, t, e) && (c = "center"), c;
}
function un(i, t, e) {
  const s = e.yAlign || t.yAlign || yh(i, e);
  return {
    xAlign: e.xAlign || t.xAlign || kh(i, t, e, s),
    yAlign: s
  };
}
function Mh(i, t) {
  let { x: e, width: s } = i;
  return t === "right" ? e -= s : t === "center" && (e -= s / 2), e;
}
function Sh(i, t, e) {
  let { y: s, height: n } = i;
  return t === "top" ? s += e : t === "bottom" ? s -= n + e : s -= n / 2, s;
}
function fn(i, t, e, s) {
  const { caretSize: n, caretPadding: o, cornerRadius: a } = i, { xAlign: r, yAlign: l } = e, c = n + o, { topLeft: h, topRight: d, bottomLeft: u, bottomRight: f } = $t(a);
  let g = Mh(t, r);
  const p = Sh(t, l, c);
  return l === "center" ? r === "left" ? g += c : r === "right" && (g -= c) : r === "left" ? g -= Math.max(h, u) + n : r === "right" && (g += Math.max(d, f) + n), {
    x: Y(g, 0, s.width - t.width),
    y: Y(p, 0, s.height - t.height)
  };
}
function Xe(i, t, e) {
  const s = Z(e.padding);
  return t === "center" ? i.x + i.width / 2 : t === "right" ? i.x + i.width - s.right : i.x + s.left;
}
function gn(i) {
  return lt([], gt(i));
}
function wh(i, t, e) {
  return Lt(i, {
    tooltip: t,
    tooltipItems: e,
    type: "tooltip"
  });
}
function pn(i, t) {
  const e = t && t.dataset && t.dataset.tooltip && t.dataset.tooltip.callbacks;
  return e ? i.override(e) : i;
}
const wo = {
  beforeTitle: ut,
  title(i) {
    if (i.length > 0) {
      const t = i[0], e = t.chart.data.labels, s = e ? e.length : 0;
      if (this && this.options && this.options.mode === "dataset")
        return t.dataset.label || "";
      if (t.label)
        return t.label;
      if (s > 0 && t.dataIndex < s)
        return e[t.dataIndex];
    }
    return "";
  },
  afterTitle: ut,
  beforeBody: ut,
  beforeLabel: ut,
  label(i) {
    if (this && this.options && this.options.mode === "dataset")
      return i.label + ": " + i.formattedValue || i.formattedValue;
    let t = i.dataset.label || "";
    t && (t += ": ");
    const e = i.formattedValue;
    return A(e) || (t += e), t;
  },
  labelColor(i) {
    const e = i.chart.getDatasetMeta(i.datasetIndex).controller.getStyle(i.dataIndex);
    return {
      borderColor: e.borderColor,
      backgroundColor: e.backgroundColor,
      borderWidth: e.borderWidth,
      borderDash: e.borderDash,
      borderDashOffset: e.borderDashOffset,
      borderRadius: 0
    };
  },
  labelTextColor() {
    return this.options.bodyColor;
  },
  labelPointStyle(i) {
    const e = i.chart.getDatasetMeta(i.datasetIndex).controller.getStyle(i.dataIndex);
    return {
      pointStyle: e.pointStyle,
      rotation: e.rotation
    };
  },
  afterLabel: ut,
  afterBody: ut,
  beforeFooter: ut,
  footer: ut,
  afterFooter: ut
};
function Q(i, t, e, s) {
  const n = i[t].call(e, s);
  return typeof n > "u" ? wo[t].call(e, s) : n;
}
class mn extends yt {
  static positioners = pe;
  constructor(t) {
    super(), this.opacity = 0, this._active = [], this._eventPosition = void 0, this._size = void 0, this._cachedAnimations = void 0, this._tooltipItems = [], this.$animations = void 0, this.$context = void 0, this.chart = t.chart, this.options = t.options, this.dataPoints = void 0, this.title = void 0, this.beforeBody = void 0, this.body = void 0, this.afterBody = void 0, this.footer = void 0, this.xAlign = void 0, this.yAlign = void 0, this.x = void 0, this.y = void 0, this.height = void 0, this.width = void 0, this.caretX = void 0, this.caretY = void 0, this.labelColors = void 0, this.labelPointStyles = void 0, this.labelTextColors = void 0;
  }
  initialize(t) {
    this.options = t, this._cachedAnimations = void 0, this.$context = void 0;
  }
  _resolveAnimations() {
    const t = this._cachedAnimations;
    if (t)
      return t;
    const e = this.chart, s = this.options.setContext(this.getContext()), n = s.enabled && e.options.animation && s.animations, o = new io(this.chart, n);
    return n._cacheable && (this._cachedAnimations = Object.freeze(o)), o;
  }
  getContext() {
    return this.$context || (this.$context = wh(this.chart.getContext(), this, this._tooltipItems));
  }
  getTitle(t, e) {
    const { callbacks: s } = e, n = Q(s, "beforeTitle", this, t), o = Q(s, "title", this, t), a = Q(s, "afterTitle", this, t);
    let r = [];
    return r = lt(r, gt(n)), r = lt(r, gt(o)), r = lt(r, gt(a)), r;
  }
  getBeforeBody(t, e) {
    return gn(Q(e.callbacks, "beforeBody", this, t));
  }
  getBody(t, e) {
    const { callbacks: s } = e, n = [];
    return R(t, (o) => {
      const a = {
        before: [],
        lines: [],
        after: []
      }, r = pn(s, o);
      lt(a.before, gt(Q(r, "beforeLabel", this, o))), lt(a.lines, Q(r, "label", this, o)), lt(a.after, gt(Q(r, "afterLabel", this, o))), n.push(a);
    }), n;
  }
  getAfterBody(t, e) {
    return gn(Q(e.callbacks, "afterBody", this, t));
  }
  getFooter(t, e) {
    const { callbacks: s } = e, n = Q(s, "beforeFooter", this, t), o = Q(s, "footer", this, t), a = Q(s, "afterFooter", this, t);
    let r = [];
    return r = lt(r, gt(n)), r = lt(r, gt(o)), r = lt(r, gt(a)), r;
  }
  _createItems(t) {
    const e = this._active, s = this.chart.data, n = [], o = [], a = [];
    let r = [], l, c;
    for (l = 0, c = e.length; l < c; ++l)
      r.push(xh(this.chart, e[l]));
    return t.filter && (r = r.filter((h, d, u) => t.filter(h, d, u, s))), t.itemSort && (r = r.sort((h, d) => t.itemSort(h, d, s))), R(r, (h) => {
      const d = pn(t.callbacks, h);
      n.push(Q(d, "labelColor", this, h)), o.push(Q(d, "labelPointStyle", this, h)), a.push(Q(d, "labelTextColor", this, h));
    }), this.labelColors = n, this.labelPointStyles = o, this.labelTextColors = a, this.dataPoints = r, r;
  }
  update(t, e) {
    const s = this.options.setContext(this.getContext()), n = this._active;
    let o, a = [];
    if (!n.length)
      this.opacity !== 0 && (o = {
        opacity: 0
      });
    else {
      const r = pe[s.position].call(this, n, this._eventPosition);
      a = this._createItems(s), this.title = this.getTitle(a, s), this.beforeBody = this.getBeforeBody(a, s), this.body = this.getBody(a, s), this.afterBody = this.getAfterBody(a, s), this.footer = this.getFooter(a, s);
      const l = this._size = dn(this, s), c = Object.assign({}, r, l), h = un(this.chart, s, c), d = fn(s, c, h, this.chart);
      this.xAlign = h.xAlign, this.yAlign = h.yAlign, o = {
        opacity: 1,
        x: d.x,
        y: d.y,
        width: l.width,
        height: l.height,
        caretX: r.x,
        caretY: r.y
      };
    }
    this._tooltipItems = a, this.$context = void 0, o && this._resolveAnimations().update(this, o), t && s.external && s.external.call(this, {
      chart: this.chart,
      tooltip: this,
      replay: e
    });
  }
  drawCaret(t, e, s, n) {
    const o = this.getCaretPosition(t, s, n);
    e.lineTo(o.x1, o.y1), e.lineTo(o.x2, o.y2), e.lineTo(o.x3, o.y3);
  }
  getCaretPosition(t, e, s) {
    const { xAlign: n, yAlign: o } = this, { caretSize: a, cornerRadius: r } = s, { topLeft: l, topRight: c, bottomLeft: h, bottomRight: d } = $t(r), { x: u, y: f } = t, { width: g, height: p } = e;
    let m, b, _, v, y, x;
    return o === "center" ? (y = f + p / 2, n === "left" ? (m = u, b = m - a, v = y + a, x = y - a) : (m = u + g, b = m + a, v = y - a, x = y + a), _ = m) : (n === "left" ? b = u + Math.max(l, h) + a : n === "right" ? b = u + g - Math.max(c, d) - a : b = this.caretX, o === "top" ? (v = f, y = v - a, m = b - a, _ = b + a) : (v = f + p, y = v + a, m = b + a, _ = b - a), x = v), {
      x1: m,
      x2: b,
      x3: _,
      y1: v,
      y2: y,
      y3: x
    };
  }
  drawTitle(t, e, s) {
    const n = this.title, o = n.length;
    let a, r, l;
    if (o) {
      const c = Jt(s.rtl, this.x, this.width);
      for (t.x = Xe(this, s.titleAlign, s), e.textAlign = c.textAlign(s.titleAlign), e.textBaseline = "middle", a = j(s.titleFont), r = s.titleSpacing, e.fillStyle = s.titleColor, e.font = a.string, l = 0; l < o; ++l)
        e.fillText(n[l], c.x(t.x), t.y + a.lineHeight / 2), t.y += a.lineHeight + r, l + 1 === o && (t.y += s.titleMarginBottom - r);
    }
  }
  _drawColorBox(t, e, s, n, o) {
    const a = this.labelColors[s], r = this.labelPointStyles[s], { boxHeight: l, boxWidth: c } = o, h = j(o.bodyFont), d = Xe(this, "left", o), u = n.x(d), f = l < h.lineHeight ? (h.lineHeight - l) / 2 : 0, g = e.y + f;
    if (o.usePointStyle) {
      const p = {
        radius: Math.min(c, l) / 2,
        pointStyle: r.pointStyle,
        rotation: r.rotation,
        borderWidth: 1
      }, m = n.leftForLtr(u, c) + c / 2, b = g + l / 2;
      t.strokeStyle = o.multiKeyBackground, t.fillStyle = o.multiKeyBackground, Li(t, p, m, b), t.strokeStyle = a.borderColor, t.fillStyle = a.backgroundColor, Li(t, p, m, b);
    } else {
      t.lineWidth = O(a.borderWidth) ? Math.max(...Object.values(a.borderWidth)) : a.borderWidth || 1, t.strokeStyle = a.borderColor, t.setLineDash(a.borderDash || []), t.lineDashOffset = a.borderDashOffset || 0;
      const p = n.leftForLtr(u, c), m = n.leftForLtr(n.xPlus(u, 1), c - 2), b = $t(a.borderRadius);
      Object.values(b).some((_) => _ !== 0) ? (t.beginPath(), t.fillStyle = o.multiKeyBackground, we(t, {
        x: p,
        y: g,
        w: c,
        h: l,
        radius: b
      }), t.fill(), t.stroke(), t.fillStyle = a.backgroundColor, t.beginPath(), we(t, {
        x: m,
        y: g + 1,
        w: c - 2,
        h: l - 2,
        radius: b
      }), t.fill()) : (t.fillStyle = o.multiKeyBackground, t.fillRect(p, g, c, l), t.strokeRect(p, g, c, l), t.fillStyle = a.backgroundColor, t.fillRect(m, g + 1, c - 2, l - 2));
    }
    t.fillStyle = this.labelTextColors[s];
  }
  drawBody(t, e, s) {
    const { body: n } = this, { bodySpacing: o, bodyAlign: a, displayColors: r, boxHeight: l, boxWidth: c, boxPadding: h } = s, d = j(s.bodyFont);
    let u = d.lineHeight, f = 0;
    const g = Jt(s.rtl, this.x, this.width), p = function(S) {
      e.fillText(S, g.x(t.x + f), t.y + u / 2), t.y += u + o;
    }, m = g.textAlign(a);
    let b, _, v, y, x, k, M;
    for (e.textAlign = a, e.textBaseline = "middle", e.font = d.string, t.x = Xe(this, m, s), e.fillStyle = s.bodyColor, R(this.beforeBody, p), f = r && m !== "right" ? a === "center" ? c / 2 + h : c + 2 + h : 0, y = 0, k = n.length; y < k; ++y) {
      for (b = n[y], _ = this.labelTextColors[y], e.fillStyle = _, R(b.before, p), v = b.lines, r && v.length && (this._drawColorBox(e, t, y, g, s), u = Math.max(d.lineHeight, l)), x = 0, M = v.length; x < M; ++x)
        p(v[x]), u = d.lineHeight;
      R(b.after, p);
    }
    f = 0, u = d.lineHeight, R(this.afterBody, p), t.y -= o;
  }
  drawFooter(t, e, s) {
    const n = this.footer, o = n.length;
    let a, r;
    if (o) {
      const l = Jt(s.rtl, this.x, this.width);
      for (t.x = Xe(this, s.footerAlign, s), t.y += s.footerMarginTop, e.textAlign = l.textAlign(s.footerAlign), e.textBaseline = "middle", a = j(s.footerFont), e.fillStyle = s.footerColor, e.font = a.string, r = 0; r < o; ++r)
        e.fillText(n[r], l.x(t.x), t.y + a.lineHeight / 2), t.y += a.lineHeight + s.footerSpacing;
    }
  }
  drawBackground(t, e, s, n) {
    const { xAlign: o, yAlign: a } = this, { x: r, y: l } = t, { width: c, height: h } = s, { topLeft: d, topRight: u, bottomLeft: f, bottomRight: g } = $t(n.cornerRadius);
    e.fillStyle = n.backgroundColor, e.strokeStyle = n.borderColor, e.lineWidth = n.borderWidth, e.beginPath(), e.moveTo(r + d, l), a === "top" && this.drawCaret(t, e, s, n), e.lineTo(r + c - u, l), e.quadraticCurveTo(r + c, l, r + c, l + u), a === "center" && o === "right" && this.drawCaret(t, e, s, n), e.lineTo(r + c, l + h - g), e.quadraticCurveTo(r + c, l + h, r + c - g, l + h), a === "bottom" && this.drawCaret(t, e, s, n), e.lineTo(r + f, l + h), e.quadraticCurveTo(r, l + h, r, l + h - f), a === "center" && o === "left" && this.drawCaret(t, e, s, n), e.lineTo(r, l + d), e.quadraticCurveTo(r, l, r + d, l), e.closePath(), e.fill(), n.borderWidth > 0 && e.stroke();
  }
  _updateAnimationTarget(t) {
    const e = this.chart, s = this.$animations, n = s && s.x, o = s && s.y;
    if (n || o) {
      const a = pe[t.position].call(this, this._active, this._eventPosition);
      if (!a)
        return;
      const r = this._size = dn(this, t), l = Object.assign({}, a, this._size), c = un(e, t, l), h = fn(t, l, c, e);
      (n._to !== h.x || o._to !== h.y) && (this.xAlign = c.xAlign, this.yAlign = c.yAlign, this.width = r.width, this.height = r.height, this.caretX = a.x, this.caretY = a.y, this._resolveAnimations().update(this, h));
    }
  }
  _willRender() {
    return !!this.opacity;
  }
  draw(t) {
    const e = this.options.setContext(this.getContext());
    let s = this.opacity;
    if (!s)
      return;
    this._updateAnimationTarget(e);
    const n = {
      width: this.width,
      height: this.height
    }, o = {
      x: this.x,
      y: this.y
    };
    s = Math.abs(s) < 1e-3 ? 0 : s;
    const a = Z(e.padding), r = this.title.length || this.beforeBody.length || this.body.length || this.afterBody.length || this.footer.length;
    e.enabled && r && (t.save(), t.globalAlpha = s, this.drawBackground(o, t, n, e), qn(t, e.textDirection), o.y += a.top, this.drawTitle(o, t, e), this.drawBody(o, t, e), this.drawFooter(o, t, e), Zn(t, e.textDirection), t.restore());
  }
  getActiveElements() {
    return this._active || [];
  }
  setActiveElements(t, e) {
    const s = this._active, n = t.map(({ datasetIndex: r, index: l }) => {
      const c = this.chart.getDatasetMeta(r);
      if (!c)
        throw new Error("Cannot find a dataset at index " + r);
      return {
        datasetIndex: r,
        element: c.data[l],
        index: l
      };
    }), o = !Ze(s, n), a = this._positionChanged(n, e);
    (o || a) && (this._active = n, this._eventPosition = e, this._ignoreReplayEvents = !0, this.update(!0));
  }
  handleEvent(t, e, s = !0) {
    if (e && this._ignoreReplayEvents)
      return !1;
    this._ignoreReplayEvents = !1;
    const n = this.options, o = this._active || [], a = this._getActiveElements(t, o, e, s), r = this._positionChanged(a, t), l = e || !Ze(a, o) || r;
    return l && (this._active = a, (n.enabled || n.external) && (this._eventPosition = {
      x: t.x,
      y: t.y
    }, this.update(!0, e))), l;
  }
  _getActiveElements(t, e, s, n) {
    const o = this.options;
    if (t.type === "mouseout")
      return [];
    if (!n)
      return e.filter((r) => this.chart.data.datasets[r.datasetIndex] && this.chart.getDatasetMeta(r.datasetIndex).controller.getParsed(r.index) !== void 0);
    const a = this.chart.getElementsAtEventForMode(t, o.mode, o, s);
    return o.reverse && a.reverse(), a;
  }
  _positionChanged(t, e) {
    const { caretX: s, caretY: n, options: o } = this, a = pe[o.position].call(this, t, e);
    return a !== !1 && (s !== a.x || n !== a.y);
  }
}
var Dh = {
  id: "tooltip",
  _element: mn,
  positioners: pe,
  afterInit(i, t, e) {
    e && (i.tooltip = new mn({
      chart: i,
      options: e
    }));
  },
  beforeUpdate(i, t, e) {
    i.tooltip && i.tooltip.initialize(e);
  },
  reset(i, t, e) {
    i.tooltip && i.tooltip.initialize(e);
  },
  afterDraw(i) {
    const t = i.tooltip;
    if (t && t._willRender()) {
      const e = {
        tooltip: t
      };
      if (i.notifyPlugins("beforeTooltipDraw", {
        ...e,
        cancelable: !0
      }) === !1)
        return;
      t.draw(i.ctx), i.notifyPlugins("afterTooltipDraw", e);
    }
  },
  afterEvent(i, t) {
    if (i.tooltip) {
      const e = t.replay;
      i.tooltip.handleEvent(t.event, e, t.inChartArea) && (t.changed = !0);
    }
  },
  defaults: {
    enabled: !0,
    external: null,
    position: "average",
    backgroundColor: "rgba(0,0,0,0.8)",
    titleColor: "#fff",
    titleFont: {
      weight: "bold"
    },
    titleSpacing: 2,
    titleMarginBottom: 6,
    titleAlign: "left",
    bodyColor: "#fff",
    bodySpacing: 2,
    bodyFont: {},
    bodyAlign: "left",
    footerColor: "#fff",
    footerSpacing: 2,
    footerMarginTop: 6,
    footerFont: {
      weight: "bold"
    },
    footerAlign: "left",
    padding: 6,
    caretPadding: 2,
    caretSize: 5,
    cornerRadius: 6,
    boxHeight: (i, t) => t.bodyFont.size,
    boxWidth: (i, t) => t.bodyFont.size,
    multiKeyBackground: "#fff",
    displayColors: !0,
    boxPadding: 0,
    borderColor: "rgba(0,0,0,0)",
    borderWidth: 0,
    animation: {
      duration: 400,
      easing: "easeOutQuart"
    },
    animations: {
      numbers: {
        type: "number",
        properties: [
          "x",
          "y",
          "width",
          "height",
          "caretX",
          "caretY"
        ]
      },
      opacity: {
        easing: "linear",
        duration: 200
      }
    },
    callbacks: wo
  },
  defaultRoutes: {
    bodyFont: "font",
    footerFont: "font",
    titleFont: "font"
  },
  descriptors: {
    _scriptable: (i) => i !== "filter" && i !== "itemSort" && i !== "external",
    _indexable: !1,
    callbacks: {
      _scriptable: !1,
      _indexable: !1
    },
    animation: {
      _fallback: !1
    },
    animations: {
      _fallback: "animation"
    }
  },
  additionalOptionScopes: [
    "interaction"
  ]
}, Ch = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  Colors: Vc,
  Decimation: Hc,
  Filler: ch,
  Legend: ph,
  SubTitle: _h,
  Title: bh,
  Tooltip: Dh
});
const Ph = (i, t, e, s) => (typeof t == "string" ? (e = i.push(t) - 1, s.unshift({
  index: e,
  label: t
})) : isNaN(t) && (e = null), e);
function Ah(i, t, e, s) {
  const n = i.indexOf(t);
  if (n === -1)
    return Ph(i, t, e, s);
  const o = i.lastIndexOf(t);
  return n !== o ? e : n;
}
const Oh = (i, t) => i === null ? null : Y(Math.round(i), 0, t);
function bn(i) {
  const t = this.getLabels();
  return i >= 0 && i < t.length ? t[i] : i;
}
class Lh extends Ut {
  static id = "category";
  static defaults = {
    ticks: {
      callback: bn
    }
  };
  constructor(t) {
    super(t), this._startValue = void 0, this._valueRange = 0, this._addedLabels = [];
  }
  init(t) {
    const e = this._addedLabels;
    if (e.length) {
      const s = this.getLabels();
      for (const { index: n, label: o } of e)
        s[n] === o && s.splice(n, 1);
      this._addedLabels = [];
    }
    super.init(t);
  }
  parse(t, e) {
    if (A(t))
      return null;
    const s = this.getLabels();
    return e = isFinite(e) && s[e] === t ? e : Ah(s, t, D(e, t), this._addedLabels), Oh(e, s.length - 1);
  }
  determineDataLimits() {
    const { minDefined: t, maxDefined: e } = this.getUserBounds();
    let { min: s, max: n } = this.getMinMax(!0);
    this.options.bounds === "ticks" && (t || (s = 0), e || (n = this.getLabels().length - 1)), this.min = s, this.max = n;
  }
  buildTicks() {
    const t = this.min, e = this.max, s = this.options.offset, n = [];
    let o = this.getLabels();
    o = t === 0 && e === o.length - 1 ? o : o.slice(t, e + 1), this._valueRange = Math.max(o.length - (s ? 0 : 1), 1), this._startValue = this.min - (s ? 0.5 : 0);
    for (let a = t; a <= e; a++)
      n.push({
        value: a
      });
    return n;
  }
  getLabelForValue(t) {
    return bn.call(this, t);
  }
  configure() {
    super.configure(), this.isHorizontal() || (this._reversePixels = !this._reversePixels);
  }
  getPixelForValue(t) {
    return typeof t != "number" && (t = this.parse(t)), t === null ? NaN : this.getPixelForDecimal((t - this._startValue) / this._valueRange);
  }
  getPixelForTick(t) {
    const e = this.ticks;
    return t < 0 || t > e.length - 1 ? null : this.getPixelForValue(e[t].value);
  }
  getValueForPixel(t) {
    return Math.round(this._startValue + this.getDecimalForPixel(t) * this._valueRange);
  }
  getBasePixel() {
    return this.bottom;
  }
}
function Th(i, t) {
  const e = [], { bounds: n, step: o, min: a, max: r, precision: l, count: c, maxTicks: h, maxDigits: d, includeBounds: u } = i, f = o || 1, g = h - 1, { min: p, max: m } = t, b = !A(a), _ = !A(r), v = !A(c), y = (m - p) / (d + 1);
  let x = hs((m - p) / g / f) * f, k, M, S, w;
  if (x < 1e-14 && !b && !_)
    return [
      {
        value: p
      },
      {
        value: m
      }
    ];
  w = Math.ceil(m / x) - Math.floor(p / x), w > g && (x = hs(w * x / g / f) * f), A(l) || (k = Math.pow(10, l), x = Math.ceil(x * k) / k), n === "ticks" ? (M = Math.floor(p / x) * x, S = Math.ceil(m / x) * x) : (M = p, S = m), b && _ && o && ga((r - a) / o, x / 1e3) ? (w = Math.round(Math.min((r - a) / x, h)), x = (r - a) / w, M = a, S = r) : v ? (M = b ? a : M, S = _ ? r : S, w = c - 1, x = (S - M) / w) : (w = (S - M) / x, _e(w, Math.round(w), x / 1e3) ? w = Math.round(w) : w = Math.ceil(w));
  const C = Math.max(ds(x), ds(M));
  k = Math.pow(10, A(l) ? C : l), M = Math.round(M * k) / k, S = Math.round(S * k) / k;
  let P = 0;
  for (b && (u && M !== a ? (e.push({
    value: a
  }), M < a && P++, _e(Math.round((M + P * x) * k) / k, a, _n(a, y, i)) && P++) : M < a && P++); P < w; ++P) {
    const L = Math.round((M + P * x) * k) / k;
    if (_ && L > r)
      break;
    e.push({
      value: L
    });
  }
  return _ && u && S !== r ? e.length && _e(e[e.length - 1].value, r, _n(r, y, i)) ? e[e.length - 1].value = r : e.push({
    value: r
  }) : (!_ || S === r) && e.push({
    value: S
  }), e;
}
function _n(i, t, { horizontal: e, minRotation: s }) {
  const n = rt(s), o = (e ? Math.sin(n) : Math.cos(n)) || 1e-3, a = 0.75 * t * ("" + i).length;
  return Math.min(t / o, a);
}
class ni extends Ut {
  constructor(t) {
    super(t), this.start = void 0, this.end = void 0, this._startValue = void 0, this._endValue = void 0, this._valueRange = 0;
  }
  parse(t, e) {
    return A(t) || (typeof t == "number" || t instanceof Number) && !isFinite(+t) ? null : +t;
  }
  handleTickRangeOptions() {
    const { beginAtZero: t } = this.options, { minDefined: e, maxDefined: s } = this.getUserBounds();
    let { min: n, max: o } = this;
    const a = (l) => n = e ? n : l, r = (l) => o = s ? o : l;
    if (t) {
      const l = ht(n), c = ht(o);
      l < 0 && c < 0 ? r(0) : l > 0 && c > 0 && a(0);
    }
    if (n === o) {
      let l = o === 0 ? 1 : Math.abs(o * 0.05);
      r(o + l), t || a(n - l);
    }
    this.min = n, this.max = o;
  }
  getTickLimit() {
    const t = this.options.ticks;
    let { maxTicksLimit: e, stepSize: s } = t, n;
    return s ? (n = Math.ceil(this.max / s) - Math.floor(this.min / s) + 1, n > 1e3 && (console.warn(`scales.${this.id}.ticks.stepSize: ${s} would result generating up to ${n} ticks. Limiting to 1000.`), n = 1e3)) : (n = this.computeTickLimit(), e = e || 11), e && (n = Math.min(e, n)), n;
  }
  computeTickLimit() {
    return Number.POSITIVE_INFINITY;
  }
  buildTicks() {
    const t = this.options, e = t.ticks;
    let s = this.getTickLimit();
    s = Math.max(2, s);
    const n = {
      maxTicks: s,
      bounds: t.bounds,
      min: t.min,
      max: t.max,
      precision: e.precision,
      step: e.stepSize,
      count: e.count,
      maxDigits: this._maxDigits(),
      horizontal: this.isHorizontal(),
      minRotation: e.minRotation || 0,
      includeBounds: e.includeBounds !== !1
    }, o = this._range || this, a = Th(n, o);
    return t.bounds === "ticks" && Rn(a, this, "value"), t.reverse ? (a.reverse(), this.start = this.max, this.end = this.min) : (this.start = this.min, this.end = this.max), a;
  }
  configure() {
    const t = this.ticks;
    let e = this.min, s = this.max;
    if (super.configure(), this.options.offset && t.length) {
      const n = (s - e) / Math.max(t.length - 1, 1) / 2;
      e -= n, s += n;
    }
    this._startValue = e, this._endValue = s, this._valueRange = s - e;
  }
  getLabelForValue(t) {
    return Re(t, this.chart.options.locale, this.options.ticks.format);
  }
}
class Rh extends ni {
  static id = "linear";
  static defaults = {
    ticks: {
      callback: oi.formatters.numeric
    }
  };
  determineDataLimits() {
    const { min: t, max: e } = this.getMinMax(!0);
    this.min = W(t) ? t : 0, this.max = W(e) ? e : 1, this.handleTickRangeOptions();
  }
  computeTickLimit() {
    const t = this.isHorizontal(), e = t ? this.width : this.height, s = rt(this.options.ticks.minRotation), n = (t ? Math.sin(s) : Math.cos(s)) || 1e-3, o = this._resolveTickFontOptions(0);
    return Math.ceil(e / Math.min(40, o.lineHeight / n));
  }
  getPixelForValue(t) {
    return t === null ? NaN : this.getPixelForDecimal((t - this._startValue) / this._valueRange);
  }
  getValueForPixel(t) {
    return this._startValue + this.getDecimalForPixel(t) * this._valueRange;
  }
}
const Ce = (i) => Math.floor(St(i)), Vt = (i, t) => Math.pow(10, Ce(i) + t);
function xn(i) {
  return i / Math.pow(10, Ce(i)) === 1;
}
function yn(i, t, e) {
  const s = Math.pow(10, e), n = Math.floor(i / s);
  return Math.ceil(t / s) - n;
}
function Eh(i, t) {
  const e = t - i;
  let s = Ce(e);
  for (; yn(i, t, s) > 10; )
    s++;
  for (; yn(i, t, s) < 10; )
    s--;
  return Math.min(s, Ce(i));
}
function Fh(i, { min: t, max: e }) {
  t = it(i.min, t);
  const s = [], n = Ce(t);
  let o = Eh(t, e), a = o < 0 ? Math.pow(10, Math.abs(o)) : 1;
  const r = Math.pow(10, o), l = n > o ? Math.pow(10, n) : 0, c = Math.round((t - l) * a) / a, h = Math.floor((t - l) / r / 10) * r * 10;
  let d = Math.floor((c - h) / Math.pow(10, o)), u = it(i.min, Math.round((l + h + d * Math.pow(10, o)) * a) / a);
  for (; u < e; )
    s.push({
      value: u,
      major: xn(u),
      significand: d
    }), d >= 10 ? d = d < 15 ? 15 : 20 : d++, d >= 20 && (o++, d = 2, a = o >= 0 ? 1 : a), u = Math.round((l + h + d * Math.pow(10, o)) * a) / a;
  const f = it(i.max, u);
  return s.push({
    value: f,
    major: xn(f),
    significand: d
  }), s;
}
class zh extends Ut {
  static id = "logarithmic";
  static defaults = {
    ticks: {
      callback: oi.formatters.logarithmic,
      major: {
        enabled: !0
      }
    }
  };
  constructor(t) {
    super(t), this.start = void 0, this.end = void 0, this._startValue = void 0, this._valueRange = 0;
  }
  parse(t, e) {
    const s = ni.prototype.parse.apply(this, [
      t,
      e
    ]);
    if (s === 0) {
      this._zero = !0;
      return;
    }
    return W(s) && s > 0 ? s : null;
  }
  determineDataLimits() {
    const { min: t, max: e } = this.getMinMax(!0);
    this.min = W(t) ? Math.max(0, t) : null, this.max = W(e) ? Math.max(0, e) : null, this.options.beginAtZero && (this._zero = !0), this._zero && this.min !== this._suggestedMin && !W(this._userMin) && (this.min = t === Vt(this.min, 0) ? Vt(this.min, -1) : Vt(this.min, 0)), this.handleTickRangeOptions();
  }
  handleTickRangeOptions() {
    const { minDefined: t, maxDefined: e } = this.getUserBounds();
    let s = this.min, n = this.max;
    const o = (r) => s = t ? s : r, a = (r) => n = e ? n : r;
    s === n && (s <= 0 ? (o(1), a(10)) : (o(Vt(s, -1)), a(Vt(n, 1)))), s <= 0 && o(Vt(n, -1)), n <= 0 && a(Vt(s, 1)), this.min = s, this.max = n;
  }
  buildTicks() {
    const t = this.options, e = {
      min: this._userMin,
      max: this._userMax
    }, s = Fh(e, this);
    return t.bounds === "ticks" && Rn(s, this, "value"), t.reverse ? (s.reverse(), this.start = this.max, this.end = this.min) : (this.start = this.min, this.end = this.max), s;
  }
  getLabelForValue(t) {
    return t === void 0 ? "0" : Re(t, this.chart.options.locale, this.options.ticks.format);
  }
  configure() {
    const t = this.min;
    super.configure(), this._startValue = St(t), this._valueRange = St(this.max) - St(t);
  }
  getPixelForValue(t) {
    return (t === void 0 || t === 0) && (t = this.min), t === null || isNaN(t) ? NaN : this.getPixelForDecimal(t === this.min ? 0 : (St(t) - this._startValue) / this._valueRange);
  }
  getValueForPixel(t) {
    const e = this.getDecimalForPixel(t);
    return Math.pow(10, this._startValue + e * this._valueRange);
  }
}
function Ii(i) {
  const t = i.ticks;
  if (t.display && i.display) {
    const e = Z(t.backdropPadding);
    return D(t.font && t.font.size, N.font.size) + e.height;
  }
  return 0;
}
function Ih(i, t, e) {
  return e = V(e) ? e : [
    e
  ], {
    w: La(i, t.string, e),
    h: e.length * t.lineHeight
  };
}
function vn(i, t, e, s, n) {
  return i === s || i === n ? {
    start: t - e / 2,
    end: t + e / 2
  } : i < s || i > n ? {
    start: t - e,
    end: t
  } : {
    start: t,
    end: t + e
  };
}
function Bh(i) {
  const t = {
    l: i.left + i._padding.left,
    r: i.right - i._padding.right,
    t: i.top + i._padding.top,
    b: i.bottom - i._padding.bottom
  }, e = Object.assign({}, t), s = [], n = [], o = i._pointLabels.length, a = i.options.pointLabels, r = a.centerPointLabels ? T / o : 0;
  for (let l = 0; l < o; l++) {
    const c = a.setContext(i.getPointLabelContext(l));
    n[l] = c.padding;
    const h = i.getPointPosition(l, i.drawingArea + n[l], r), d = j(c.font), u = Ih(i.ctx, d, i._pointLabels[l]);
    s[l] = u;
    const f = G(i.getIndexAngle(l) + r), g = Math.round(Hi(f)), p = vn(g, h.x, u.w, 0, 180), m = vn(g, h.y, u.h, 90, 270);
    Vh(e, t, f, p, m);
  }
  i.setCenterPoint(t.l - e.l, e.r - t.r, t.t - e.t, e.b - t.b), i._pointLabelItems = $h(i, s, n);
}
function Vh(i, t, e, s, n) {
  const o = Math.abs(Math.sin(e)), a = Math.abs(Math.cos(e));
  let r = 0, l = 0;
  s.start < t.l ? (r = (t.l - s.start) / o, i.l = Math.min(i.l, t.l - r)) : s.end > t.r && (r = (s.end - t.r) / o, i.r = Math.max(i.r, t.r + r)), n.start < t.t ? (l = (t.t - n.start) / a, i.t = Math.min(i.t, t.t - l)) : n.end > t.b && (l = (n.end - t.b) / a, i.b = Math.max(i.b, t.b + l));
}
function Nh(i, t, e) {
  const s = i.drawingArea, { extra: n, additionalAngle: o, padding: a, size: r } = e, l = i.getPointPosition(t, s + n + a, o), c = Math.round(Hi(G(l.angle + H))), h = Yh(l.y, r.h, c), d = Hh(c), u = jh(l.x, r.w, d);
  return {
    visible: !0,
    x: l.x,
    y: h,
    textAlign: d,
    left: u,
    top: h,
    right: u + r.w,
    bottom: h + r.h
  };
}
function Wh(i, t) {
  if (!t)
    return !0;
  const { left: e, top: s, right: n, bottom: o } = i;
  return !(_t({
    x: e,
    y: s
  }, t) || _t({
    x: e,
    y: o
  }, t) || _t({
    x: n,
    y: s
  }, t) || _t({
    x: n,
    y: o
  }, t));
}
function $h(i, t, e) {
  const s = [], n = i._pointLabels.length, o = i.options, { centerPointLabels: a, display: r } = o.pointLabels, l = {
    extra: Ii(o) / 2,
    additionalAngle: a ? T / n : 0
  };
  let c;
  for (let h = 0; h < n; h++) {
    l.padding = e[h], l.size = t[h];
    const d = Nh(i, h, l);
    s.push(d), r === "auto" && (d.visible = Wh(d, c), d.visible && (c = d));
  }
  return s;
}
function Hh(i) {
  return i === 0 || i === 180 ? "center" : i < 180 ? "left" : "right";
}
function jh(i, t, e) {
  return e === "right" ? i -= t : e === "center" && (i -= t / 2), i;
}
function Yh(i, t, e) {
  return e === 90 || e === 270 ? i -= t / 2 : (e > 270 || e < 90) && (i -= t), i;
}
function Xh(i, t, e) {
  const { left: s, top: n, right: o, bottom: a } = e, { backdropColor: r } = t;
  if (!A(r)) {
    const l = $t(t.borderRadius), c = Z(t.backdropPadding);
    i.fillStyle = r;
    const h = s - c.left, d = n - c.top, u = o - s + c.width, f = a - n + c.height;
    Object.values(l).some((g) => g !== 0) ? (i.beginPath(), we(i, {
      x: h,
      y: d,
      w: u,
      h: f,
      radius: l
    }), i.fill()) : i.fillRect(h, d, u, f);
  }
}
function Uh(i, t) {
  const { ctx: e, options: { pointLabels: s } } = i;
  for (let n = t - 1; n >= 0; n--) {
    const o = i._pointLabelItems[n];
    if (!o.visible)
      continue;
    const a = s.setContext(i.getPointLabelContext(n));
    Xh(e, a, o);
    const r = j(a.font), { x: l, y: c, textAlign: h } = o;
    Yt(e, i._pointLabels[n], l, c + r.lineHeight / 2, r, {
      color: a.color,
      textAlign: h,
      textBaseline: "middle"
    });
  }
}
function Do(i, t, e, s) {
  const { ctx: n } = i;
  if (e)
    n.arc(i.xCenter, i.yCenter, t, 0, I);
  else {
    let o = i.getPointPosition(0, t);
    n.moveTo(o.x, o.y);
    for (let a = 1; a < s; a++)
      o = i.getPointPosition(a, t), n.lineTo(o.x, o.y);
  }
}
function Kh(i, t, e, s, n) {
  const o = i.ctx, a = t.circular, { color: r, lineWidth: l } = t;
  !a && !s || !r || !l || e < 0 || (o.save(), o.strokeStyle = r, o.lineWidth = l, o.setLineDash(n.dash || []), o.lineDashOffset = n.dashOffset, o.beginPath(), Do(i, e, a, s), o.closePath(), o.stroke(), o.restore());
}
function Gh(i, t, e) {
  return Lt(i, {
    label: e,
    index: t,
    type: "pointLabel"
  });
}
class qh extends ni {
  static id = "radialLinear";
  static defaults = {
    display: !0,
    animate: !0,
    position: "chartArea",
    angleLines: {
      display: !0,
      lineWidth: 1,
      borderDash: [],
      borderDashOffset: 0
    },
    grid: {
      circular: !1
    },
    startAngle: 0,
    ticks: {
      showLabelBackdrop: !0,
      callback: oi.formatters.numeric
    },
    pointLabels: {
      backdropColor: void 0,
      backdropPadding: 2,
      display: !0,
      font: {
        size: 10
      },
      callback(t) {
        return t;
      },
      padding: 5,
      centerPointLabels: !1
    }
  };
  static defaultRoutes = {
    "angleLines.color": "borderColor",
    "pointLabels.color": "color",
    "ticks.color": "color"
  };
  static descriptors = {
    angleLines: {
      _fallback: "grid"
    }
  };
  constructor(t) {
    super(t), this.xCenter = void 0, this.yCenter = void 0, this.drawingArea = void 0, this._pointLabels = [], this._pointLabelItems = [];
  }
  setDimensions() {
    const t = this._padding = Z(Ii(this.options) / 2), e = this.width = this.maxWidth - t.width, s = this.height = this.maxHeight - t.height;
    this.xCenter = Math.floor(this.left + e / 2 + t.left), this.yCenter = Math.floor(this.top + s / 2 + t.top), this.drawingArea = Math.floor(Math.min(e, s) / 2);
  }
  determineDataLimits() {
    const { min: t, max: e } = this.getMinMax(!1);
    this.min = W(t) && !isNaN(t) ? t : 0, this.max = W(e) && !isNaN(e) ? e : 0, this.handleTickRangeOptions();
  }
  computeTickLimit() {
    return Math.ceil(this.drawingArea / Ii(this.options));
  }
  generateTickLabels(t) {
    ni.prototype.generateTickLabels.call(this, t), this._pointLabels = this.getLabels().map((e, s) => {
      const n = F(this.options.pointLabels.callback, [
        e,
        s
      ], this);
      return n || n === 0 ? n : "";
    }).filter((e, s) => this.chart.getDataVisibility(s));
  }
  fit() {
    const t = this.options;
    t.display && t.pointLabels.display ? Bh(this) : this.setCenterPoint(0, 0, 0, 0);
  }
  setCenterPoint(t, e, s, n) {
    this.xCenter += Math.floor((t - e) / 2), this.yCenter += Math.floor((s - n) / 2), this.drawingArea -= Math.min(this.drawingArea / 2, Math.max(t, e, s, n));
  }
  getIndexAngle(t) {
    const e = I / (this._pointLabels.length || 1), s = this.options.startAngle || 0;
    return G(t * e + rt(s));
  }
  getDistanceFromCenterForValue(t) {
    if (A(t))
      return NaN;
    const e = this.drawingArea / (this.max - this.min);
    return this.options.reverse ? (this.max - t) * e : (t - this.min) * e;
  }
  getValueForDistanceFromCenter(t) {
    if (A(t))
      return NaN;
    const e = t / (this.drawingArea / (this.max - this.min));
    return this.options.reverse ? this.max - e : this.min + e;
  }
  getPointLabelContext(t) {
    const e = this._pointLabels || [];
    if (t >= 0 && t < e.length) {
      const s = e[t];
      return Gh(this.getContext(), t, s);
    }
  }
  getPointPosition(t, e, s = 0) {
    const n = this.getIndexAngle(t) - H + s;
    return {
      x: Math.cos(n) * e + this.xCenter,
      y: Math.sin(n) * e + this.yCenter,
      angle: n
    };
  }
  getPointPositionForValue(t, e) {
    return this.getPointPosition(t, this.getDistanceFromCenterForValue(e));
  }
  getBasePosition(t) {
    return this.getPointPositionForValue(t || 0, this.getBaseValue());
  }
  getPointLabelPosition(t) {
    const { left: e, top: s, right: n, bottom: o } = this._pointLabelItems[t];
    return {
      left: e,
      top: s,
      right: n,
      bottom: o
    };
  }
  drawBackground() {
    const { backgroundColor: t, grid: { circular: e } } = this.options;
    if (t) {
      const s = this.ctx;
      s.save(), s.beginPath(), Do(this, this.getDistanceFromCenterForValue(this._endValue), e, this._pointLabels.length), s.closePath(), s.fillStyle = t, s.fill(), s.restore();
    }
  }
  drawGrid() {
    const t = this.ctx, e = this.options, { angleLines: s, grid: n, border: o } = e, a = this._pointLabels.length;
    let r, l, c;
    if (e.pointLabels.display && Uh(this, a), n.display && this.ticks.forEach((h, d) => {
      if (d !== 0 || d === 0 && this.min < 0) {
        l = this.getDistanceFromCenterForValue(h.value);
        const u = this.getContext(d), f = n.setContext(u), g = o.setContext(u);
        Kh(this, f, l, a, g);
      }
    }), s.display) {
      for (t.save(), r = a - 1; r >= 0; r--) {
        const h = s.setContext(this.getPointLabelContext(r)), { color: d, lineWidth: u } = h;
        !u || !d || (t.lineWidth = u, t.strokeStyle = d, t.setLineDash(h.borderDash), t.lineDashOffset = h.borderDashOffset, l = this.getDistanceFromCenterForValue(e.reverse ? this.min : this.max), c = this.getPointPosition(r, l), t.beginPath(), t.moveTo(this.xCenter, this.yCenter), t.lineTo(c.x, c.y), t.stroke());
      }
      t.restore();
    }
  }
  drawBorder() {
  }
  drawLabels() {
    const t = this.ctx, e = this.options, s = e.ticks;
    if (!s.display)
      return;
    const n = this.getIndexAngle(0);
    let o, a;
    t.save(), t.translate(this.xCenter, this.yCenter), t.rotate(n), t.textAlign = "center", t.textBaseline = "middle", this.ticks.forEach((r, l) => {
      if (l === 0 && this.min >= 0 && !e.reverse)
        return;
      const c = s.setContext(this.getContext(l)), h = j(c.font);
      if (o = this.getDistanceFromCenterForValue(this.ticks[l].value), c.showLabelBackdrop) {
        t.font = h.string, a = t.measureText(r.label).width, t.fillStyle = c.backdropColor;
        const d = Z(c.backdropPadding);
        t.fillRect(-a / 2 - d.left, -o - h.size / 2 - d.top, a + d.width, h.size + d.height);
      }
      Yt(t, r.label, 0, -o, h, {
        color: c.color,
        strokeColor: c.textStrokeColor,
        strokeWidth: c.textStrokeWidth
      });
    }), t.restore();
  }
  drawTitle() {
  }
}
const ui = {
  millisecond: {
    common: !0,
    size: 1,
    steps: 1e3
  },
  second: {
    common: !0,
    size: 1e3,
    steps: 60
  },
  minute: {
    common: !0,
    size: 6e4,
    steps: 60
  },
  hour: {
    common: !0,
    size: 36e5,
    steps: 24
  },
  day: {
    common: !0,
    size: 864e5,
    steps: 30
  },
  week: {
    common: !1,
    size: 6048e5,
    steps: 4
  },
  month: {
    common: !0,
    size: 2628e6,
    steps: 12
  },
  quarter: {
    common: !1,
    size: 7884e6,
    steps: 4
  },
  year: {
    common: !0,
    size: 3154e7
  }
}, tt = /* @__PURE__ */ Object.keys(ui);
function kn(i, t) {
  return i - t;
}
function Mn(i, t) {
  if (A(t))
    return null;
  const e = i._adapter, { parser: s, round: n, isoWeekday: o } = i._parseOpts;
  let a = t;
  return typeof s == "function" && (a = s(a)), W(a) || (a = typeof s == "string" ? e.parse(a, s) : e.parse(a)), a === null ? null : (n && (a = n === "week" && (Qt(o) || o === !0) ? e.startOf(a, "isoWeek", o) : e.startOf(a, n)), +a);
}
function Sn(i, t, e, s) {
  const n = tt.length;
  for (let o = tt.indexOf(i); o < n - 1; ++o) {
    const a = ui[tt[o]], r = a.steps ? a.steps : Number.MAX_SAFE_INTEGER;
    if (a.common && Math.ceil((e - t) / (r * a.size)) <= s)
      return tt[o];
  }
  return tt[n - 1];
}
function Zh(i, t, e, s, n) {
  for (let o = tt.length - 1; o >= tt.indexOf(e); o--) {
    const a = tt[o];
    if (ui[a].common && i._adapter.diff(n, s, a) >= t - 1)
      return a;
  }
  return tt[e ? tt.indexOf(e) : 0];
}
function Jh(i) {
  for (let t = tt.indexOf(i) + 1, e = tt.length; t < e; ++t)
    if (ui[tt[t]].common)
      return tt[t];
}
function wn(i, t, e) {
  if (!e)
    i[t] = !0;
  else if (e.length) {
    const { lo: s, hi: n } = ji(e, t), o = e[s] >= t ? e[s] : e[n];
    i[o] = !0;
  }
}
function Qh(i, t, e, s) {
  const n = i._adapter, o = +n.startOf(t[0].value, s), a = t[t.length - 1].value;
  let r, l;
  for (r = o; r <= a; r = +n.add(r, 1, s))
    l = e[r], l >= 0 && (t[l].major = !0);
  return t;
}
function Dn(i, t, e) {
  const s = [], n = {}, o = t.length;
  let a, r;
  for (a = 0; a < o; ++a)
    r = t[a], n[r] = a, s.push({
      value: r,
      major: !1
    });
  return o === 0 || !e ? s : Qh(i, s, n, e);
}
class Bi extends Ut {
  static id = "time";
  static defaults = {
    bounds: "data",
    adapters: {},
    time: {
      parser: !1,
      unit: !1,
      round: !1,
      isoWeekday: !1,
      minUnit: "millisecond",
      displayFormats: {}
    },
    ticks: {
      source: "auto",
      callback: !1,
      major: {
        enabled: !1
      }
    }
  };
  constructor(t) {
    super(t), this._cache = {
      data: [],
      labels: [],
      all: []
    }, this._unit = "day", this._majorUnit = void 0, this._offsets = {}, this._normalized = !1, this._parseOpts = void 0;
  }
  init(t, e = {}) {
    const s = t.time || (t.time = {}), n = this._adapter = new tl._date(t.adapters.date);
    n.init(e), be(s.displayFormats, n.formats()), this._parseOpts = {
      parser: s.parser,
      round: s.round,
      isoWeekday: s.isoWeekday
    }, super.init(t), this._normalized = e.normalized;
  }
  parse(t, e) {
    return t === void 0 ? null : Mn(this, t);
  }
  beforeLayout() {
    super.beforeLayout(), this._cache = {
      data: [],
      labels: [],
      all: []
    };
  }
  determineDataLimits() {
    const t = this.options, e = this._adapter, s = t.time.unit || "day";
    let { min: n, max: o, minDefined: a, maxDefined: r } = this.getUserBounds();
    function l(c) {
      !a && !isNaN(c.min) && (n = Math.min(n, c.min)), !r && !isNaN(c.max) && (o = Math.max(o, c.max));
    }
    (!a || !r) && (l(this._getLabelBounds()), (t.bounds !== "ticks" || t.ticks.source !== "labels") && l(this.getMinMax(!1))), n = W(n) && !isNaN(n) ? n : +e.startOf(Date.now(), s), o = W(o) && !isNaN(o) ? o : +e.endOf(Date.now(), s) + 1, this.min = Math.min(n, o - 1), this.max = Math.max(n + 1, o);
  }
  _getLabelBounds() {
    const t = this.getLabelTimestamps();
    let e = Number.POSITIVE_INFINITY, s = Number.NEGATIVE_INFINITY;
    return t.length && (e = t[0], s = t[t.length - 1]), {
      min: e,
      max: s
    };
  }
  buildTicks() {
    const t = this.options, e = t.time, s = t.ticks, n = s.source === "labels" ? this.getLabelTimestamps() : this._generate();
    t.bounds === "ticks" && n.length && (this.min = this._userMin || n[0], this.max = this._userMax || n[n.length - 1]);
    const o = this.min, a = this.max, r = _a(n, o, a);
    return this._unit = e.unit || (s.autoSkip ? Sn(e.minUnit, this.min, this.max, this._getLabelCapacity(o)) : Zh(this, r.length, e.minUnit, this.min, this.max)), this._majorUnit = !s.major.enabled || this._unit === "year" ? void 0 : Jh(this._unit), this.initOffsets(n), t.reverse && r.reverse(), Dn(this, r, this._majorUnit);
  }
  afterAutoSkip() {
    this.options.offsetAfterAutoskip && this.initOffsets(this.ticks.map((t) => +t.value));
  }
  initOffsets(t = []) {
    let e = 0, s = 0, n, o;
    this.options.offset && t.length && (n = this.getDecimalForValue(t[0]), t.length === 1 ? e = 1 - n : e = (this.getDecimalForValue(t[1]) - n) / 2, o = this.getDecimalForValue(t[t.length - 1]), t.length === 1 ? s = o : s = (o - this.getDecimalForValue(t[t.length - 2])) / 2);
    const a = t.length < 3 ? 0.5 : 0.25;
    e = Y(e, 0, a), s = Y(s, 0, a), this._offsets = {
      start: e,
      end: s,
      factor: 1 / (e + 1 + s)
    };
  }
  _generate() {
    const t = this._adapter, e = this.min, s = this.max, n = this.options, o = n.time, a = o.unit || Sn(o.minUnit, e, s, this._getLabelCapacity(e)), r = D(n.ticks.stepSize, 1), l = a === "week" ? o.isoWeekday : !1, c = Qt(l) || l === !0, h = {};
    let d = e, u, f;
    if (c && (d = +t.startOf(d, "isoWeek", l)), d = +t.startOf(d, c ? "day" : a), t.diff(s, e, a) > 1e5 * r)
      throw new Error(e + " and " + s + " are too far apart with stepSize of " + r + " " + a);
    const g = n.ticks.source === "data" && this.getDataTimestamps();
    for (u = d, f = 0; u < s; u = +t.add(u, r, a), f++)
      wn(h, u, g);
    return (u === s || n.bounds === "ticks" || f === 1) && wn(h, u, g), Object.keys(h).sort(kn).map((p) => +p);
  }
  getLabelForValue(t) {
    const e = this._adapter, s = this.options.time;
    return s.tooltipFormat ? e.format(t, s.tooltipFormat) : e.format(t, s.displayFormats.datetime);
  }
  format(t, e) {
    const n = this.options.time.displayFormats, o = this._unit, a = e || n[o];
    return this._adapter.format(t, a);
  }
  _tickFormatFunction(t, e, s, n) {
    const o = this.options, a = o.ticks.callback;
    if (a)
      return F(a, [
        t,
        e,
        s
      ], this);
    const r = o.time.displayFormats, l = this._unit, c = this._majorUnit, h = l && r[l], d = c && r[c], u = s[e], f = c && d && u && u.major;
    return this._adapter.format(t, n || (f ? d : h));
  }
  generateTickLabels(t) {
    let e, s, n;
    for (e = 0, s = t.length; e < s; ++e)
      n = t[e], n.label = this._tickFormatFunction(n.value, e, t);
  }
  getDecimalForValue(t) {
    return t === null ? NaN : (t - this.min) / (this.max - this.min);
  }
  getPixelForValue(t) {
    const e = this._offsets, s = this.getDecimalForValue(t);
    return this.getPixelForDecimal((e.start + s) * e.factor);
  }
  getValueForPixel(t) {
    const e = this._offsets, s = this.getDecimalForPixel(t) / e.factor - e.end;
    return this.min + s * (this.max - this.min);
  }
  _getLabelSize(t) {
    const e = this.options.ticks, s = this.ctx.measureText(t).width, n = rt(this.isHorizontal() ? e.maxRotation : e.minRotation), o = Math.cos(n), a = Math.sin(n), r = this._resolveTickFontOptions(0).size;
    return {
      w: s * o + r * a,
      h: s * a + r * o
    };
  }
  _getLabelCapacity(t) {
    const e = this.options.time, s = e.displayFormats, n = s[e.unit] || s.millisecond, o = this._tickFormatFunction(t, 0, Dn(this, [
      t
    ], this._majorUnit), n), a = this._getLabelSize(o), r = Math.floor(this.isHorizontal() ? this.width / a.w : this.height / a.h) - 1;
    return r > 0 ? r : 1;
  }
  getDataTimestamps() {
    let t = this._cache.data || [], e, s;
    if (t.length)
      return t;
    const n = this.getMatchingVisibleMetas();
    if (this._normalized && n.length)
      return this._cache.data = n[0].controller.getAllParsedValues(this);
    for (e = 0, s = n.length; e < s; ++e)
      t = t.concat(n[e].controller.getAllParsedValues(this));
    return this._cache.data = this.normalize(t);
  }
  getLabelTimestamps() {
    const t = this._cache.labels || [];
    let e, s;
    if (t.length)
      return t;
    const n = this.getLabels();
    for (e = 0, s = n.length; e < s; ++e)
      t.push(Mn(this, n[e]));
    return this._cache.labels = this._normalized ? t : this.normalize(t);
  }
  normalize(t) {
    return zn(t.sort(kn));
  }
}
function Ue(i, t, e) {
  let s = 0, n = i.length - 1, o, a, r, l;
  e ? (t >= i[s].pos && t <= i[n].pos && ({ lo: s, hi: n } = bt(i, "pos", t)), { pos: o, time: r } = i[s], { pos: a, time: l } = i[n]) : (t >= i[s].time && t <= i[n].time && ({ lo: s, hi: n } = bt(i, "time", t)), { time: o, pos: r } = i[s], { time: a, pos: l } = i[n]);
  const c = a - o;
  return c ? r + (l - r) * (t - o) / c : r;
}
class td extends Bi {
  static id = "timeseries";
  static defaults = Bi.defaults;
  constructor(t) {
    super(t), this._table = [], this._minPos = void 0, this._tableRange = void 0;
  }
  initOffsets() {
    const t = this._getTimestampsForTable(), e = this._table = this.buildLookupTable(t);
    this._minPos = Ue(e, this.min), this._tableRange = Ue(e, this.max) - this._minPos, super.initOffsets(t);
  }
  buildLookupTable(t) {
    const { min: e, max: s } = this, n = [], o = [];
    let a, r, l, c, h;
    for (a = 0, r = t.length; a < r; ++a)
      c = t[a], c >= e && c <= s && n.push(c);
    if (n.length < 2)
      return [
        {
          time: e,
          pos: 0
        },
        {
          time: s,
          pos: 1
        }
      ];
    for (a = 0, r = n.length; a < r; ++a)
      h = n[a + 1], l = n[a - 1], c = n[a], Math.round((h + l) / 2) !== c && o.push({
        time: c,
        pos: a / (r - 1)
      });
    return o;
  }
  _generate() {
    const t = this.min, e = this.max;
    let s = super.getDataTimestamps();
    return (!s.includes(t) || !s.length) && s.splice(0, 0, t), (!s.includes(e) || s.length === 1) && s.push(e), s.sort((n, o) => n - o);
  }
  _getTimestampsForTable() {
    let t = this._cache.all || [];
    if (t.length)
      return t;
    const e = this.getDataTimestamps(), s = this.getLabelTimestamps();
    return e.length && s.length ? t = this.normalize(e.concat(s)) : t = e.length ? e : s, t = this._cache.all = t, t;
  }
  getDecimalForValue(t) {
    return (Ue(this._table, t) - this._minPos) / this._tableRange;
  }
  getValueForPixel(t) {
    const e = this._offsets, s = this.getDecimalForPixel(t) / e.factor - e.end;
    return Ue(this._table, s * this._tableRange + this._minPos, !0);
  }
}
var ed = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  CategoryScale: Lh,
  LinearScale: Rh,
  LogarithmicScale: zh,
  RadialLinearScale: qh,
  TimeScale: Bi,
  TimeSeriesScale: td
});
const id = [
  Qr,
  Tc,
  Ch,
  ed
];
var sd = Object.defineProperty, nd = Object.getOwnPropertyDescriptor, Rt = (i, t, e, s) => {
  for (var n = s > 1 ? void 0 : s ? nd(t, e) : t, o = i.length - 1, a; o >= 0; o--)
    (a = i[o]) && (n = (s ? a(t, e, n) : a(n)) || n);
  return s && n && sd(t, e, n), n;
};
es.register(...id);
let dt = class extends Le(Pe) {
  constructor() {
    super(...arguments), this.headline = "", this.valuePrefix = "", this.data = [], this.showComparison = !0, this.isLoading = !1;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._destroyChart();
  }
  updated(i) {
    super.updated(i), i.has("data") && this.data.length > 0 && this._updateChart();
  }
  _destroyChart() {
    this._chart && (this._chart.destroy(), this._chart = void 0);
  }
  _updateChart() {
    if (!this._canvas) return;
    this._destroyChart();
    const i = this.data.map((o) => this._formatDate(o.date)), t = this.data.map((o) => o.value), e = this.data.map((o) => o.comparisonValue), s = this.showComparison && e.some((o) => o !== null), n = [
      {
        label: "Current Period",
        data: t,
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: !0,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2
      }
    ];
    s && n.push({
      label: "Comparison Period",
      data: e,
      borderColor: "#94a3b8",
      backgroundColor: "transparent",
      fill: !1,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      borderDash: [5, 5]
    }), this._chart = new es(this._canvas, {
      type: "line",
      data: {
        labels: i,
        datasets: n
      },
      options: {
        responsive: !0,
        maintainAspectRatio: !1,
        interaction: {
          intersect: !1,
          mode: "index"
        },
        plugins: {
          legend: {
            display: s,
            position: "bottom",
            labels: {
              usePointStyle: !0,
              padding: 16,
              font: {
                family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            titleFont: {
              family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              size: 13
            },
            bodyFont: {
              family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              size: 12
            },
            callbacks: {
              label: (o) => {
                const a = o.parsed.y;
                return a == null ? "" : `${o.dataset.label}: ${this.valuePrefix}${this._formatNumber(a)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: !1
            },
            ticks: {
              font: {
                family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                size: 11
              },
              color: "#64748b",
              maxRotation: 0,
              autoSkip: !0,
              maxTicksLimit: 8
            }
          },
          y: {
            beginAtZero: !0,
            grid: {
              color: "rgba(0, 0, 0, 0.05)"
            },
            ticks: {
              font: {
                family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                size: 11
              },
              color: "#64748b",
              callback: (o) => `${this.valuePrefix}${this._formatNumber(o)}`
            }
          }
        }
      }
    });
  }
  _formatDate(i) {
    return new Date(i).toLocaleDateString(void 0, { month: "short", day: "numeric" });
  }
  _formatNumber(i) {
    return i >= 1e6 ? me(i / 1e6, 1) + "M" : i >= 1e3 ? me(i / 1e3, 1) + "K" : me(i, 2);
  }
  _getTotalValue() {
    return this.data.reduce((i, t) => i + t.value, 0);
  }
  _getPercentChange() {
    if (!this.showComparison) return 0;
    const i = this._getTotalValue(), t = this.data.reduce((e, s) => e + (s.comparisonValue ?? 0), 0);
    return t === 0 ? i > 0 ? 100 : 0 : Math.round((i - t) / Math.abs(t) * 100 * 10) / 10;
  }
  render() {
    const i = this._getTotalValue(), t = this._getPercentChange(), e = t >= 0;
    return z`
      <uui-box>
        <div class="chart-header">
          <div class="headline">${this.headline}</div>
          <div class="summary">
            <span class="total-value">${this.valuePrefix}${this._formatNumber(i)}</span>
            ${this.showComparison ? z`
                  <span class="change ${e ? "positive" : "negative"}">
                    ${e ? "↑" : "↓"} ${Math.abs(t)}%
                  </span>
                ` : ""}
          </div>
        </div>
        <div class="chart-container">
          ${this.isLoading ? z`<div class="loading"><uui-loader></uui-loader></div>` : this.data.length === 0 ? z`<div class="empty">No data available for this period</div>` : z`<canvas></canvas>`}
        </div>
      </uui-box>
    `;
  }
};
dt.styles = Ae`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: var(--uui-size-space-5);
    }

    .chart-header {
      margin-bottom: var(--uui-size-space-4);
    }

    .headline {
      font-size: var(--uui-type-small-size);
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-2);
    }

    .summary {
      display: flex;
      align-items: baseline;
      gap: var(--uui-size-space-3);
    }

    .total-value {
      font-size: var(--uui-type-h3-size);
      font-weight: 700;
    }

    .change {
      font-size: var(--uui-type-small-size);
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .change.positive {
      color: #16a34a;
      background: rgba(22, 163, 74, 0.1);
    }

    .change.negative {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }

    .chart-container {
      position: relative;
      height: 250px;
    }

    canvas {
      width: 100% !important;
      height: 100% !important;
    }

    .loading,
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--uui-color-text-alt);
    }
  `;
Rt([
  J({ type: String })
], dt.prototype, "headline", 2);
Rt([
  J({ type: String })
], dt.prototype, "valuePrefix", 2);
Rt([
  J({ type: Array })
], dt.prototype, "data", 2);
Rt([
  J({ type: Boolean })
], dt.prototype, "showComparison", 2);
Rt([
  J({ type: Boolean })
], dt.prototype, "isLoading", 2);
Rt([
  Oo("canvas")
], dt.prototype, "_canvas", 2);
Rt([
  st()
], dt.prototype, "_chart", 2);
dt = Rt([
  Oe("merchello-analytics-line-chart")
], dt);
var od = Object.defineProperty, ad = Object.getOwnPropertyDescriptor, fi = (i, t, e, s) => {
  for (var n = s > 1 ? void 0 : s ? ad(t, e) : t, o = i.length - 1, a; o >= 0; o--)
    (a = i[o]) && (n = (s ? a(t, e, n) : a(n)) || n);
  return s && n && od(t, e, n), n;
};
let ie = class extends Le(Pe) {
  constructor() {
    super(...arguments), this.data = null, this.currencySymbol = "$", this.isLoading = !1;
  }
  _getRows() {
    return this.data ? [
      { label: "Gross sales", value: this.data.grossSales, change: this.data.grossSalesChange },
      { label: "Discounts", value: this.data.discounts, change: this.data.discountsChange, isNegative: !0 },
      { label: "Returns", value: this.data.returns, change: this.data.returnsChange, isNegative: !0 },
      { label: "Net sales", value: this.data.netSales, change: this.data.netSalesChange, isBold: !0 },
      { label: "Shipping charges", value: this.data.shippingCharges, change: this.data.shippingChargesChange },
      { label: "Return fees", value: this.data.returnFees, change: this.data.returnFeesChange },
      { label: "Taxes", value: this.data.taxes, change: this.data.taxesChange },
      { label: "Total sales", value: this.data.totalSales, change: this.data.totalSalesChange, isBold: !0 }
    ] : [];
  }
  _formatCurrency(i, t) {
    const e = Math.abs(i), s = me(e, 2);
    return `${t && i > 0 ? "-" : ""}${this.currencySymbol}${s}`;
  }
  _renderChangeIndicator(i) {
    if (i === 0)
      return z`<span class="change neutral">—</span>`;
    const t = i > 0;
    return z`
      <span class="change ${t ? "positive" : "negative"}">
        ${t ? "↑" : "↓"} ${Math.abs(i)}%
      </span>
    `;
  }
  _renderRow(i) {
    return z`
      <uui-table-row>
        <uui-table-cell class="${i.isBold ? "bold" : ""}">
          ${i.label}
        </uui-table-cell>
        <uui-table-cell class="value-cell ${i.isBold ? "bold" : ""}">
          ${this._formatCurrency(i.value, i.isNegative)}
        </uui-table-cell>
        <uui-table-cell class="change-cell">
          ${this._renderChangeIndicator(i.change)}
        </uui-table-cell>
      </uui-table-row>
    `;
  }
  render() {
    return z`
      <uui-box headline="Total sales breakdown">
        ${this.isLoading ? z`
              <div class="loading">
                <uui-loader></uui-loader>
              </div>
            ` : this.data ? z`
                <uui-table class="breakdown-table">
                  ${this._getRows().map((i) => this._renderRow(i))}
                </uui-table>
              ` : z`<div class="empty">No data available</div>`}
      </uui-box>
    `;
  }
};
ie.styles = Ae`
    :host {
      display: block;
    }

    uui-box {
      --uui-box-default-padding: 0;
    }

    .loading,
    .empty {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-5);
      color: var(--uui-color-text-alt);
    }

    .breakdown-table {
      width: 100%;
    }

    uui-table-row {
      border-bottom: 1px solid var(--uui-color-border);
    }

    uui-table-row:last-child {
      border-bottom: none;
    }

    uui-table-cell {
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      font-size: var(--uui-type-small-size);
    }

    uui-table-cell.bold {
      font-weight: 600;
    }

    .value-cell {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .change-cell {
      text-align: right;
      width: 80px;
    }

    .change {
      font-size: var(--uui-type-small-size);
      font-weight: 500;
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
    }

    .change.positive {
      color: #16a34a;
      background: rgba(22, 163, 74, 0.1);
    }

    .change.negative {
      color: #dc2626;
      background: rgba(220, 38, 38, 0.1);
    }

    .change.neutral {
      color: var(--uui-color-text-alt);
    }
  `;
fi([
  J({ type: Object })
], ie.prototype, "data", 2);
fi([
  J({ type: String })
], ie.prototype, "currencySymbol", 2);
fi([
  J({ type: Boolean })
], ie.prototype, "isLoading", 2);
ie = fi([
  Oe("merchello-analytics-breakdown")
], ie);
var rd = Object.defineProperty, ld = Object.getOwnPropertyDescriptor, Co = (i) => {
  throw TypeError(i);
}, vt = (i, t, e, s) => {
  for (var n = s > 1 ? void 0 : s ? ld(t, e) : t, o = i.length - 1, a; o >= 0; o--)
    (a = i[o]) && (n = (s ? a(t, e, n) : a(n)) || n);
  return s && n && rd(t, e, n), n;
}, Po = (i, t, e) => t.has(i) || Co("Cannot " + e), Ke = (i, t, e) => (Po(i, t, "read from private field"), t.get(i)), cd = (i, t, e) => t.has(i) ? Co("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(i) : t.set(i, e), Cn = (i, t, e, s) => (Po(i, t, "write to private field"), t.set(i, e), e), kt;
let ot = class extends Le(Pe) {
  constructor() {
    super(...arguments), this._dateRange = this._getDefaultDateRange(), this._summary = null, this._salesTimeSeries = [], this._aovTimeSeries = [], this._breakdown = null, this._isLoading = !0, this._errorMessage = "", this._currencySymbol = "$", cd(this, kt, !1);
  }
  _getDefaultDateRange() {
    const i = /* @__PURE__ */ new Date(), t = /* @__PURE__ */ new Date();
    return t.setDate(t.getDate() - 30), { startDate: t, endDate: i };
  }
  connectedCallback() {
    super.connectedCallback(), Cn(this, kt, !0), this._loadSettings(), this._loadAllData();
  }
  disconnectedCallback() {
    super.disconnectedCallback(), Cn(this, kt, !1);
  }
  async _loadSettings() {
    const { data: i } = await ae.getSettings();
    i && Ke(this, kt) && (this._currencySymbol = i.currencySymbol || "$");
  }
  async _loadAllData() {
    this._isLoading = !0, this._errorMessage = "";
    const i = this._formatDateForApi(this._dateRange.startDate), t = this._formatDateForApi(this._dateRange.endDate);
    try {
      const [e, s, n, o] = await Promise.all([
        ae.getAnalyticsSummary(i, t),
        ae.getSalesTimeSeries(i, t),
        ae.getAovTimeSeries(i, t),
        ae.getSalesBreakdown(i, t)
      ]);
      if (!Ke(this, kt)) return;
      if (e.error || s.error || n.error || o.error) {
        const a = [
          e.error,
          s.error,
          n.error,
          o.error
        ].filter(Boolean);
        this._errorMessage = a[0]?.message ?? "Failed to load analytics data", this._isLoading = !1;
        return;
      }
      this._summary = e.data ?? null, this._salesTimeSeries = s.data ?? [], this._aovTimeSeries = n.data ?? [], this._breakdown = o.data ?? null;
    } catch (e) {
      if (!Ke(this, kt)) return;
      this._errorMessage = e instanceof Error ? e.message : "An unexpected error occurred";
    } finally {
      Ke(this, kt) && (this._isLoading = !1);
    }
  }
  _formatDateForApi(i) {
    return i.toISOString().split("T")[0];
  }
  _handleDateRangeChange(i) {
    this._dateRange = {
      startDate: i.detail.startDate,
      endDate: i.detail.endDate
    }, this._loadAllData();
  }
  _formatCurrency(i) {
    return `${this._currencySymbol}${i.toLocaleString(void 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }
  _formatPercent(i) {
    return `${me(i, 1)}%`;
  }
  _formatNumber(i) {
    return i.toLocaleString();
  }
  _renderKpiCards() {
    const i = this._isLoading || !this._summary;
    return z`
      <div class="kpi-grid">
        <merchello-analytics-kpi-card
          label="Gross sales"
          value=${i ? "—" : this._formatCurrency(this._summary.grossSales)}
          change=${this._summary?.grossSalesChange ?? 0}
          .sparklineData=${this._summary?.grossSalesSparkline ?? []}
          ?isLoading=${i}>
        </merchello-analytics-kpi-card>

        <merchello-analytics-kpi-card
          label="Returning customer rate"
          value=${i ? "—" : this._formatPercent(this._summary.returningCustomerRate)}
          change=${this._summary?.returningCustomerRateChange ?? 0}
          .sparklineData=${this._summary?.returningCustomerSparkline ?? []}
          ?isLoading=${i}>
        </merchello-analytics-kpi-card>

        <merchello-analytics-kpi-card
          label="Orders fulfilled"
          value=${i ? "—" : this._formatNumber(this._summary.ordersFulfilled)}
          change=${this._summary?.ordersFulfilledChange ?? 0}
          .sparklineData=${this._summary?.ordersFulfilledSparkline ?? []}
          ?isLoading=${i}>
        </merchello-analytics-kpi-card>

        <merchello-analytics-kpi-card
          label="Orders"
          value=${i ? "—" : this._formatNumber(this._summary.totalOrders)}
          change=${this._summary?.totalOrdersChange ?? 0}
          .sparklineData=${this._summary?.totalOrdersSparkline ?? []}
          ?isLoading=${i}>
        </merchello-analytics-kpi-card>
      </div>
    `;
  }
  _renderCharts() {
    return z`
      <merchello-analytics-line-chart
        headline="Total sales over time"
        valuePrefix=${this._currencySymbol}
        .data=${this._salesTimeSeries}
        ?isLoading=${this._isLoading}
        showComparison>
      </merchello-analytics-line-chart>

      <div class="bottom-section">
        <merchello-analytics-line-chart
          headline="Average order value over time"
          valuePrefix=${this._currencySymbol}
          .data=${this._aovTimeSeries}
          ?isLoading=${this._isLoading}
          showComparison>
        </merchello-analytics-line-chart>

        <merchello-analytics-breakdown
          .data=${this._breakdown}
          currencySymbol=${this._currencySymbol}
          ?isLoading=${this._isLoading}>
        </merchello-analytics-breakdown>
      </div>
    `;
  }
  _renderError() {
    return z`
      <uui-box>
        <div class="error-state">
          <uui-icon name="icon-alert"></uui-icon>
          <p>${this._errorMessage}</p>
          <uui-button
            look="primary"
            @click=${() => this._loadAllData()}
            label="Retry">
            Retry
          </uui-button>
        </div>
      </uui-box>
    `;
  }
  render() {
    return z`
      <umb-body-layout header-fit-height>
        <div class="analytics-content">
          <merchello-analytics-header
            .dateRange=${this._dateRange}
            @date-range-change=${this._handleDateRangeChange}>
          </merchello-analytics-header>

          ${this._errorMessage ? this._renderError() : z`
                ${this._renderKpiCards()}
                ${this._renderCharts()}
              `}
        </div>
      </umb-body-layout>
    `;
  }
};
kt = /* @__PURE__ */ new WeakMap();
ot.styles = Ae`
    :host {
      display: block;
      height: 100%;
    }

    .analytics-content {
      padding: var(--uui-size-layout-1);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: var(--uui-size-space-5);
      margin-bottom: var(--uui-size-space-5);
    }

    .bottom-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--uui-size-space-5);
      margin-top: var(--uui-size-space-5);
    }

    @media (max-width: 1200px) {
      .bottom-section {
        grid-template-columns: 1fr;
      }
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-space-6);
      text-align: center;
      gap: var(--uui-size-space-3);
    }

    .error-state uui-icon {
      font-size: 32px;
      color: var(--uui-color-danger);
    }

    .error-state p {
      color: var(--uui-color-text-alt);
      margin: 0;
    }

    merchello-analytics-line-chart {
      margin-bottom: var(--uui-size-space-5);
    }

    merchello-analytics-line-chart:last-of-type {
      margin-bottom: 0;
    }
  `;
vt([
  st()
], ot.prototype, "_dateRange", 2);
vt([
  st()
], ot.prototype, "_summary", 2);
vt([
  st()
], ot.prototype, "_salesTimeSeries", 2);
vt([
  st()
], ot.prototype, "_aovTimeSeries", 2);
vt([
  st()
], ot.prototype, "_breakdown", 2);
vt([
  st()
], ot.prototype, "_isLoading", 2);
vt([
  st()
], ot.prototype, "_errorMessage", 2);
vt([
  st()
], ot.prototype, "_currencySymbol", 2);
ot = vt([
  Oe("merchello-analytics-workspace")
], ot);
const gd = ot;
export {
  ot as MerchelloAnalyticsWorkspaceElement,
  gd as default
};
//# sourceMappingURL=analytics-workspace.element-Bp-gg5dR.js.map
