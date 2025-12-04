import { LitElement as nt, nothing as m, html as s, css as ot, state as h, customElement as st, property as $i, unsafeHTML as zi } from "@umbraco-cms/backoffice/external/lit";
import { d as Ot } from "./marked.esm-B6IoMkOX.js";
import { UmbElementMixin as lt } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as Kt } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as Me, UMB_MODAL_MANAGER_CONTEXT as dt } from "@umbraco-cms/backoffice/modal";
import { UMB_CURRENT_USER_CONTEXT as Mi } from "@umbraco-cms/backoffice/current-user";
import { b as tt, a as L, d as Li } from "./formatting-Cv63Ksgk.js";
import { M as U } from "./merchello-api-TrKABjdM.js";
import { I as le, P as Nt } from "./order.types-FU1fblt8.js";
const {
  entries: Zt,
  setPrototypeOf: Pt,
  isFrozen: Ri,
  getPrototypeOf: Ii,
  getOwnPropertyDescriptor: Oi
} = Object;
let {
  freeze: C,
  seal: z,
  create: it
} = Object, {
  apply: at,
  construct: rt
} = typeof Reflect < "u" && Reflect;
C || (C = function(t) {
  return t;
});
z || (z = function(t) {
  return t;
});
at || (at = function(t, a) {
  for (var r = arguments.length, o = new Array(r > 2 ? r - 2 : 0), u = 2; u < r; u++)
    o[u - 2] = arguments[u];
  return t.apply(a, o);
});
rt || (rt = function(t) {
  for (var a = arguments.length, r = new Array(a > 1 ? a - 1 : 0), o = 1; o < a; o++)
    r[o - 1] = arguments[o];
  return new t(...r);
});
const Ce = k(Array.prototype.forEach), Ni = k(Array.prototype.lastIndexOf), Ft = k(Array.prototype.pop), de = k(Array.prototype.push), Pi = k(Array.prototype.splice), ze = k(String.prototype.toLowerCase), Ve = k(String.prototype.toString), Ke = k(String.prototype.match), ue = k(String.prototype.replace), Fi = k(String.prototype.indexOf), Ui = k(String.prototype.trim), M = k(Object.prototype.hasOwnProperty), S = k(RegExp.prototype.test), ce = Hi(TypeError);
function k(e) {
  return function(t) {
    t instanceof RegExp && (t.lastIndex = 0);
    for (var a = arguments.length, r = new Array(a > 1 ? a - 1 : 0), o = 1; o < a; o++)
      r[o - 1] = arguments[o];
    return at(e, t, r);
  };
}
function Hi(e) {
  return function() {
    for (var t = arguments.length, a = new Array(t), r = 0; r < t; r++)
      a[r] = arguments[r];
    return rt(e, a);
  };
}
function c(e, t) {
  let a = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : ze;
  Pt && Pt(e, null);
  let r = t.length;
  for (; r--; ) {
    let o = t[r];
    if (typeof o == "string") {
      const u = a(o);
      u !== o && (Ri(t) || (t[r] = u), o = u);
    }
    e[o] = !0;
  }
  return e;
}
function Gi(e) {
  for (let t = 0; t < e.length; t++)
    M(e, t) || (e[t] = null);
  return e;
}
function P(e) {
  const t = it(null);
  for (const [a, r] of Zt(e))
    M(e, a) && (Array.isArray(r) ? t[a] = Gi(r) : r && typeof r == "object" && r.constructor === Object ? t[a] = P(r) : t[a] = r);
  return t;
}
function pe(e, t) {
  for (; e !== null; ) {
    const r = Oi(e, t);
    if (r) {
      if (r.get)
        return k(r.get);
      if (typeof r.value == "function")
        return k(r.value);
    }
    e = Ii(e);
  }
  function a() {
    return null;
  }
  return a;
}
const Ut = C(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]), Ze = C(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]), Je = C(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]), Bi = C(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]), Qe = C(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]), Wi = C(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]), Ht = C(["#text"]), Gt = C(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns", "slot"]), et = C(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]), Bt = C(["accent", "accentunder", "align", "bevelled", "close", "columnsalign", "columnlines", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lspace", "lquote", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]), ke = C(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]), ji = z(/\{\{[\w\W]*|[\w\W]*\}\}/gm), Yi = z(/<%[\w\W]*|[\w\W]*%>/gm), qi = z(/\$\{[\w\W]*/gm), Xi = z(/^data-[\-\w.\u00B7-\uFFFF]+$/), Vi = z(/^aria-[\-\w]+$/), Jt = z(
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  // eslint-disable-line no-useless-escape
), Ki = z(/^(?:\w+script|data):/i), Zi = z(
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
  // eslint-disable-line no-control-regex
), Qt = z(/^html$/i), Ji = z(/^[a-z][.\w]*(-[.\w]+)+$/i);
var Wt = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ARIA_ATTR: Vi,
  ATTR_WHITESPACE: Zi,
  CUSTOM_ELEMENT: Ji,
  DATA_ATTR: Xi,
  DOCTYPE_NAME: Qt,
  ERB_EXPR: Yi,
  IS_ALLOWED_URI: Jt,
  IS_SCRIPT_OR_DATA: Ki,
  MUSTACHE_EXPR: ji,
  TMPLIT_EXPR: qi
});
const me = {
  element: 1,
  text: 3,
  // Deprecated
  progressingInstruction: 7,
  comment: 8,
  document: 9
}, Qi = function() {
  return typeof window > "u" ? null : window;
}, ea = function(t, a) {
  if (typeof t != "object" || typeof t.createPolicy != "function")
    return null;
  let r = null;
  const o = "data-tt-policy-suffix";
  a && a.hasAttribute(o) && (r = a.getAttribute(o));
  const u = "dompurify" + (r ? "#" + r : "");
  try {
    return t.createPolicy(u, {
      createHTML(v) {
        return v;
      },
      createScriptURL(v) {
        return v;
      }
    });
  } catch {
    return console.warn("TrustedTypes policy " + u + " could not be created."), null;
  }
}, jt = function() {
  return {
    afterSanitizeAttributes: [],
    afterSanitizeElements: [],
    afterSanitizeShadowDOM: [],
    beforeSanitizeAttributes: [],
    beforeSanitizeElements: [],
    beforeSanitizeShadowDOM: [],
    uponSanitizeAttribute: [],
    uponSanitizeElement: [],
    uponSanitizeShadowNode: []
  };
};
function ei() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Qi();
  const t = (d) => ei(d);
  if (t.version = "3.3.0", t.removed = [], !e || !e.document || e.document.nodeType !== me.document || !e.Element)
    return t.isSupported = !1, t;
  let {
    document: a
  } = e;
  const r = a, o = r.currentScript, {
    DocumentFragment: u,
    HTMLTemplateElement: v,
    Node: Le,
    Element: ut,
    NodeFilter: ie,
    NamedNodeMap: si = e.NamedNodeMap || e.MozNamedAttrMap,
    HTMLFormElement: li,
    DOMParser: di,
    trustedTypes: _e
  } = e, ae = ut.prototype, ui = pe(ae, "cloneNode"), ci = pe(ae, "remove"), pi = pe(ae, "nextSibling"), mi = pe(ae, "childNodes"), be = pe(ae, "parentNode");
  if (typeof v == "function") {
    const d = a.createElement("template");
    d.content && d.content.ownerDocument && (a = d.content.ownerDocument);
  }
  let w, re = "";
  const {
    implementation: Re,
    createNodeIterator: fi,
    createDocumentFragment: hi,
    getElementsByTagName: gi
  } = a, {
    importNode: vi
  } = r;
  let A = jt();
  t.isSupported = typeof Zt == "function" && typeof be == "function" && Re && Re.createHTMLDocument !== void 0;
  const {
    MUSTACHE_EXPR: Ie,
    ERB_EXPR: Oe,
    TMPLIT_EXPR: Ne,
    DATA_ATTR: _i,
    ARIA_ATTR: bi,
    IS_SCRIPT_OR_DATA: yi,
    ATTR_WHITESPACE: ct,
    CUSTOM_ELEMENT: Ti
  } = Wt;
  let {
    IS_ALLOWED_URI: pt
  } = Wt, _ = null;
  const mt = c({}, [...Ut, ...Ze, ...Je, ...Qe, ...Ht]);
  let y = null;
  const ft = c({}, [...Gt, ...et, ...Bt, ...ke]);
  let f = Object.seal(it(null, {
    tagNameCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    attributeNameCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    allowCustomizedBuiltInElements: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: !1
    }
  })), ne = null, Pe = null;
  const q = Object.seal(it(null, {
    tagCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    },
    attributeCheck: {
      writable: !0,
      configurable: !1,
      enumerable: !0,
      value: null
    }
  }));
  let ht = !0, Fe = !0, gt = !1, vt = !0, X = !1, ye = !0, B = !1, Ue = !1, He = !1, V = !1, Te = !1, Ee = !1, _t = !0, bt = !1;
  const Ei = "user-content-";
  let Ge = !0, oe = !1, K = {}, Z = null;
  const yt = c({}, ["annotation-xml", "audio", "colgroup", "desc", "foreignobject", "head", "iframe", "math", "mi", "mn", "mo", "ms", "mtext", "noembed", "noframes", "noscript", "plaintext", "script", "style", "svg", "template", "thead", "title", "video", "xmp"]);
  let Tt = null;
  const Et = c({}, ["audio", "video", "img", "source", "image", "track"]);
  let Be = null;
  const xt = c({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]), xe = "http://www.w3.org/1998/Math/MathML", we = "http://www.w3.org/2000/svg", I = "http://www.w3.org/1999/xhtml";
  let J = I, We = !1, je = null;
  const xi = c({}, [xe, we, I], Ve);
  let Ae = c({}, ["mi", "mo", "mn", "ms", "mtext"]), Se = c({}, ["annotation-xml"]);
  const wi = c({}, ["title", "style", "font", "a", "script"]);
  let se = null;
  const Ai = ["application/xhtml+xml", "text/html"], Si = "text/html";
  let b = null, Q = null;
  const Ci = a.createElement("form"), wt = function(i) {
    return i instanceof RegExp || i instanceof Function;
  }, Ye = function() {
    let i = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (!(Q && Q === i)) {
      if ((!i || typeof i != "object") && (i = {}), i = P(i), se = // eslint-disable-next-line unicorn/prefer-includes
      Ai.indexOf(i.PARSER_MEDIA_TYPE) === -1 ? Si : i.PARSER_MEDIA_TYPE, b = se === "application/xhtml+xml" ? Ve : ze, _ = M(i, "ALLOWED_TAGS") ? c({}, i.ALLOWED_TAGS, b) : mt, y = M(i, "ALLOWED_ATTR") ? c({}, i.ALLOWED_ATTR, b) : ft, je = M(i, "ALLOWED_NAMESPACES") ? c({}, i.ALLOWED_NAMESPACES, Ve) : xi, Be = M(i, "ADD_URI_SAFE_ATTR") ? c(P(xt), i.ADD_URI_SAFE_ATTR, b) : xt, Tt = M(i, "ADD_DATA_URI_TAGS") ? c(P(Et), i.ADD_DATA_URI_TAGS, b) : Et, Z = M(i, "FORBID_CONTENTS") ? c({}, i.FORBID_CONTENTS, b) : yt, ne = M(i, "FORBID_TAGS") ? c({}, i.FORBID_TAGS, b) : P({}), Pe = M(i, "FORBID_ATTR") ? c({}, i.FORBID_ATTR, b) : P({}), K = M(i, "USE_PROFILES") ? i.USE_PROFILES : !1, ht = i.ALLOW_ARIA_ATTR !== !1, Fe = i.ALLOW_DATA_ATTR !== !1, gt = i.ALLOW_UNKNOWN_PROTOCOLS || !1, vt = i.ALLOW_SELF_CLOSE_IN_ATTR !== !1, X = i.SAFE_FOR_TEMPLATES || !1, ye = i.SAFE_FOR_XML !== !1, B = i.WHOLE_DOCUMENT || !1, V = i.RETURN_DOM || !1, Te = i.RETURN_DOM_FRAGMENT || !1, Ee = i.RETURN_TRUSTED_TYPE || !1, He = i.FORCE_BODY || !1, _t = i.SANITIZE_DOM !== !1, bt = i.SANITIZE_NAMED_PROPS || !1, Ge = i.KEEP_CONTENT !== !1, oe = i.IN_PLACE || !1, pt = i.ALLOWED_URI_REGEXP || Jt, J = i.NAMESPACE || I, Ae = i.MATHML_TEXT_INTEGRATION_POINTS || Ae, Se = i.HTML_INTEGRATION_POINTS || Se, f = i.CUSTOM_ELEMENT_HANDLING || {}, i.CUSTOM_ELEMENT_HANDLING && wt(i.CUSTOM_ELEMENT_HANDLING.tagNameCheck) && (f.tagNameCheck = i.CUSTOM_ELEMENT_HANDLING.tagNameCheck), i.CUSTOM_ELEMENT_HANDLING && wt(i.CUSTOM_ELEMENT_HANDLING.attributeNameCheck) && (f.attributeNameCheck = i.CUSTOM_ELEMENT_HANDLING.attributeNameCheck), i.CUSTOM_ELEMENT_HANDLING && typeof i.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements == "boolean" && (f.allowCustomizedBuiltInElements = i.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements), X && (Fe = !1), Te && (V = !0), K && (_ = c({}, Ht), y = [], K.html === !0 && (c(_, Ut), c(y, Gt)), K.svg === !0 && (c(_, Ze), c(y, et), c(y, ke)), K.svgFilters === !0 && (c(_, Je), c(y, et), c(y, ke)), K.mathMl === !0 && (c(_, Qe), c(y, Bt), c(y, ke))), i.ADD_TAGS && (typeof i.ADD_TAGS == "function" ? q.tagCheck = i.ADD_TAGS : (_ === mt && (_ = P(_)), c(_, i.ADD_TAGS, b))), i.ADD_ATTR && (typeof i.ADD_ATTR == "function" ? q.attributeCheck = i.ADD_ATTR : (y === ft && (y = P(y)), c(y, i.ADD_ATTR, b))), i.ADD_URI_SAFE_ATTR && c(Be, i.ADD_URI_SAFE_ATTR, b), i.FORBID_CONTENTS && (Z === yt && (Z = P(Z)), c(Z, i.FORBID_CONTENTS, b)), Ge && (_["#text"] = !0), B && c(_, ["html", "head", "body"]), _.table && (c(_, ["tbody"]), delete ne.tbody), i.TRUSTED_TYPES_POLICY) {
        if (typeof i.TRUSTED_TYPES_POLICY.createHTML != "function")
          throw ce('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
        if (typeof i.TRUSTED_TYPES_POLICY.createScriptURL != "function")
          throw ce('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
        w = i.TRUSTED_TYPES_POLICY, re = w.createHTML("");
      } else
        w === void 0 && (w = ea(_e, o)), w !== null && typeof re == "string" && (re = w.createHTML(""));
      C && C(i), Q = i;
    }
  }, At = c({}, [...Ze, ...Je, ...Bi]), St = c({}, [...Qe, ...Wi]), ki = function(i) {
    let n = be(i);
    (!n || !n.tagName) && (n = {
      namespaceURI: J,
      tagName: "template"
    });
    const l = ze(i.tagName), p = ze(n.tagName);
    return je[i.namespaceURI] ? i.namespaceURI === we ? n.namespaceURI === I ? l === "svg" : n.namespaceURI === xe ? l === "svg" && (p === "annotation-xml" || Ae[p]) : !!At[l] : i.namespaceURI === xe ? n.namespaceURI === I ? l === "math" : n.namespaceURI === we ? l === "math" && Se[p] : !!St[l] : i.namespaceURI === I ? n.namespaceURI === we && !Se[p] || n.namespaceURI === xe && !Ae[p] ? !1 : !St[l] && (wi[l] || !At[l]) : !!(se === "application/xhtml+xml" && je[i.namespaceURI]) : !1;
  }, R = function(i) {
    de(t.removed, {
      element: i
    });
    try {
      be(i).removeChild(i);
    } catch {
      ci(i);
    }
  }, W = function(i, n) {
    try {
      de(t.removed, {
        attribute: n.getAttributeNode(i),
        from: n
      });
    } catch {
      de(t.removed, {
        attribute: null,
        from: n
      });
    }
    if (n.removeAttribute(i), i === "is")
      if (V || Te)
        try {
          R(n);
        } catch {
        }
      else
        try {
          n.setAttribute(i, "");
        } catch {
        }
  }, Ct = function(i) {
    let n = null, l = null;
    if (He)
      i = "<remove></remove>" + i;
    else {
      const g = Ke(i, /^[\r\n\t ]+/);
      l = g && g[0];
    }
    se === "application/xhtml+xml" && J === I && (i = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + i + "</body></html>");
    const p = w ? w.createHTML(i) : i;
    if (J === I)
      try {
        n = new di().parseFromString(p, se);
      } catch {
      }
    if (!n || !n.documentElement) {
      n = Re.createDocument(J, "template", null);
      try {
        n.documentElement.innerHTML = We ? re : p;
      } catch {
      }
    }
    const x = n.body || n.documentElement;
    return i && l && x.insertBefore(a.createTextNode(l), x.childNodes[0] || null), J === I ? gi.call(n, B ? "html" : "body")[0] : B ? n.documentElement : x;
  }, kt = function(i) {
    return fi.call(
      i.ownerDocument || i,
      i,
      // eslint-disable-next-line no-bitwise
      ie.SHOW_ELEMENT | ie.SHOW_COMMENT | ie.SHOW_TEXT | ie.SHOW_PROCESSING_INSTRUCTION | ie.SHOW_CDATA_SECTION,
      null
    );
  }, qe = function(i) {
    return i instanceof li && (typeof i.nodeName != "string" || typeof i.textContent != "string" || typeof i.removeChild != "function" || !(i.attributes instanceof si) || typeof i.removeAttribute != "function" || typeof i.setAttribute != "function" || typeof i.namespaceURI != "string" || typeof i.insertBefore != "function" || typeof i.hasChildNodes != "function");
  }, Dt = function(i) {
    return typeof Le == "function" && i instanceof Le;
  };
  function O(d, i, n) {
    Ce(d, (l) => {
      l.call(t, i, n, Q);
    });
  }
  const $t = function(i) {
    let n = null;
    if (O(A.beforeSanitizeElements, i, null), qe(i))
      return R(i), !0;
    const l = b(i.nodeName);
    if (O(A.uponSanitizeElement, i, {
      tagName: l,
      allowedTags: _
    }), ye && i.hasChildNodes() && !Dt(i.firstElementChild) && S(/<[/\w!]/g, i.innerHTML) && S(/<[/\w!]/g, i.textContent) || i.nodeType === me.progressingInstruction || ye && i.nodeType === me.comment && S(/<[/\w]/g, i.data))
      return R(i), !0;
    if (!(q.tagCheck instanceof Function && q.tagCheck(l)) && (!_[l] || ne[l])) {
      if (!ne[l] && Mt(l) && (f.tagNameCheck instanceof RegExp && S(f.tagNameCheck, l) || f.tagNameCheck instanceof Function && f.tagNameCheck(l)))
        return !1;
      if (Ge && !Z[l]) {
        const p = be(i) || i.parentNode, x = mi(i) || i.childNodes;
        if (x && p) {
          const g = x.length;
          for (let D = g - 1; D >= 0; --D) {
            const N = ui(x[D], !0);
            N.__removalCount = (i.__removalCount || 0) + 1, p.insertBefore(N, pi(i));
          }
        }
      }
      return R(i), !0;
    }
    return i instanceof ut && !ki(i) || (l === "noscript" || l === "noembed" || l === "noframes") && S(/<\/no(script|embed|frames)/i, i.innerHTML) ? (R(i), !0) : (X && i.nodeType === me.text && (n = i.textContent, Ce([Ie, Oe, Ne], (p) => {
      n = ue(n, p, " ");
    }), i.textContent !== n && (de(t.removed, {
      element: i.cloneNode()
    }), i.textContent = n)), O(A.afterSanitizeElements, i, null), !1);
  }, zt = function(i, n, l) {
    if (_t && (n === "id" || n === "name") && (l in a || l in Ci))
      return !1;
    if (!(Fe && !Pe[n] && S(_i, n))) {
      if (!(ht && S(bi, n))) {
        if (!(q.attributeCheck instanceof Function && q.attributeCheck(n, i))) {
          if (!y[n] || Pe[n]) {
            if (
              // First condition does a very basic check if a) it's basically a valid custom element tagname AND
              // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
              !(Mt(i) && (f.tagNameCheck instanceof RegExp && S(f.tagNameCheck, i) || f.tagNameCheck instanceof Function && f.tagNameCheck(i)) && (f.attributeNameCheck instanceof RegExp && S(f.attributeNameCheck, n) || f.attributeNameCheck instanceof Function && f.attributeNameCheck(n, i)) || // Alternative, second condition checks if it's an `is`-attribute, AND
              // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              n === "is" && f.allowCustomizedBuiltInElements && (f.tagNameCheck instanceof RegExp && S(f.tagNameCheck, l) || f.tagNameCheck instanceof Function && f.tagNameCheck(l)))
            ) return !1;
          } else if (!Be[n]) {
            if (!S(pt, ue(l, ct, ""))) {
              if (!((n === "src" || n === "xlink:href" || n === "href") && i !== "script" && Fi(l, "data:") === 0 && Tt[i])) {
                if (!(gt && !S(yi, ue(l, ct, "")))) {
                  if (l)
                    return !1;
                }
              }
            }
          }
        }
      }
    }
    return !0;
  }, Mt = function(i) {
    return i !== "annotation-xml" && Ke(i, Ti);
  }, Lt = function(i) {
    O(A.beforeSanitizeAttributes, i, null);
    const {
      attributes: n
    } = i;
    if (!n || qe(i))
      return;
    const l = {
      attrName: "",
      attrValue: "",
      keepAttr: !0,
      allowedAttributes: y,
      forceKeepAttr: void 0
    };
    let p = n.length;
    for (; p--; ) {
      const x = n[p], {
        name: g,
        namespaceURI: D,
        value: N
      } = x, ee = b(g), Xe = N;
      let T = g === "value" ? Xe : Ui(Xe);
      if (l.attrName = ee, l.attrValue = T, l.keepAttr = !0, l.forceKeepAttr = void 0, O(A.uponSanitizeAttribute, i, l), T = l.attrValue, bt && (ee === "id" || ee === "name") && (W(g, i), T = Ei + T), ye && S(/((--!?|])>)|<\/(style|title|textarea)/i, T)) {
        W(g, i);
        continue;
      }
      if (ee === "attributename" && Ke(T, "href")) {
        W(g, i);
        continue;
      }
      if (l.forceKeepAttr)
        continue;
      if (!l.keepAttr) {
        W(g, i);
        continue;
      }
      if (!vt && S(/\/>/i, T)) {
        W(g, i);
        continue;
      }
      X && Ce([Ie, Oe, Ne], (It) => {
        T = ue(T, It, " ");
      });
      const Rt = b(i.nodeName);
      if (!zt(Rt, ee, T)) {
        W(g, i);
        continue;
      }
      if (w && typeof _e == "object" && typeof _e.getAttributeType == "function" && !D)
        switch (_e.getAttributeType(Rt, ee)) {
          case "TrustedHTML": {
            T = w.createHTML(T);
            break;
          }
          case "TrustedScriptURL": {
            T = w.createScriptURL(T);
            break;
          }
        }
      if (T !== Xe)
        try {
          D ? i.setAttributeNS(D, g, T) : i.setAttribute(g, T), qe(i) ? R(i) : Ft(t.removed);
        } catch {
          W(g, i);
        }
    }
    O(A.afterSanitizeAttributes, i, null);
  }, Di = function d(i) {
    let n = null;
    const l = kt(i);
    for (O(A.beforeSanitizeShadowDOM, i, null); n = l.nextNode(); )
      O(A.uponSanitizeShadowNode, n, null), $t(n), Lt(n), n.content instanceof u && d(n.content);
    O(A.afterSanitizeShadowDOM, i, null);
  };
  return t.sanitize = function(d) {
    let i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = null, l = null, p = null, x = null;
    if (We = !d, We && (d = "<!-->"), typeof d != "string" && !Dt(d))
      if (typeof d.toString == "function") {
        if (d = d.toString(), typeof d != "string")
          throw ce("dirty is not a string, aborting");
      } else
        throw ce("toString is not a function");
    if (!t.isSupported)
      return d;
    if (Ue || Ye(i), t.removed = [], typeof d == "string" && (oe = !1), oe) {
      if (d.nodeName) {
        const N = b(d.nodeName);
        if (!_[N] || ne[N])
          throw ce("root node is forbidden and cannot be sanitized in-place");
      }
    } else if (d instanceof Le)
      n = Ct("<!---->"), l = n.ownerDocument.importNode(d, !0), l.nodeType === me.element && l.nodeName === "BODY" || l.nodeName === "HTML" ? n = l : n.appendChild(l);
    else {
      if (!V && !X && !B && // eslint-disable-next-line unicorn/prefer-includes
      d.indexOf("<") === -1)
        return w && Ee ? w.createHTML(d) : d;
      if (n = Ct(d), !n)
        return V ? null : Ee ? re : "";
    }
    n && He && R(n.firstChild);
    const g = kt(oe ? d : n);
    for (; p = g.nextNode(); )
      $t(p), Lt(p), p.content instanceof u && Di(p.content);
    if (oe)
      return d;
    if (V) {
      if (Te)
        for (x = hi.call(n.ownerDocument); n.firstChild; )
          x.appendChild(n.firstChild);
      else
        x = n;
      return (y.shadowroot || y.shadowrootmode) && (x = vi.call(r, x, !0)), x;
    }
    let D = B ? n.outerHTML : n.innerHTML;
    return B && _["!doctype"] && n.ownerDocument && n.ownerDocument.doctype && n.ownerDocument.doctype.name && S(Qt, n.ownerDocument.doctype.name) && (D = "<!DOCTYPE " + n.ownerDocument.doctype.name + `>
` + D), X && Ce([Ie, Oe, Ne], (N) => {
      D = ue(D, N, " ");
    }), w && Ee ? w.createHTML(D) : D;
  }, t.setConfig = function() {
    let d = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    Ye(d), Ue = !0;
  }, t.clearConfig = function() {
    Q = null, Ue = !1;
  }, t.isValidAttribute = function(d, i, n) {
    Q || Ye({});
    const l = b(d), p = b(i);
    return zt(l, p, n);
  }, t.addHook = function(d, i) {
    typeof i == "function" && de(A[d], i);
  }, t.removeHook = function(d, i) {
    if (i !== void 0) {
      const n = Ni(A[d], i);
      return n === -1 ? void 0 : Pi(A[d], n, 1)[0];
    }
    return Ft(A[d]);
  }, t.removeHooks = function(d) {
    A[d] = [];
  }, t.removeAllHooks = function() {
    A = jt();
  }, t;
}
var ta = ei();
const ia = new Me("Merchello.Fulfillment.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), aa = new Me("Merchello.ShipmentEdit.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var ra = Object.defineProperty, na = Object.getOwnPropertyDescriptor, ti = (e) => {
  throw TypeError(e);
}, ve = (e, t, a, r) => {
  for (var o = r > 1 ? void 0 : r ? na(t, a) : t, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (o = (r ? v(t, a, o) : v(o)) || o);
  return r && o && ra(t, a, o), o;
}, ii = (e, t, a) => t.has(e) || ti("Cannot " + a), De = (e, t, a) => (ii(e, t, "read from private field"), a ? a.call(e) : t.get(e)), Yt = (e, t, a) => t.has(e) ? ti("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), qt = (e, t, a, r) => (ii(e, t, "write to private field"), t.set(e, a), a), fe, he;
let Y = class extends lt(nt) {
  constructor() {
    super(), this._invoiceId = null, this._fulfillmentData = null, this._isLoading = !0, this._errorMessage = null, Yt(this, fe), Yt(this, he), this.consumeContext(Kt, (e) => {
      qt(this, fe, e), this.observe(De(this, fe).order, (t) => {
        t?.id && t.id !== this._invoiceId && (this._invoiceId = t.id, this._loadShipments());
      });
    }), this.consumeContext(dt, (e) => {
      qt(this, he, e);
    });
  }
  async _loadShipments() {
    if (!this._invoiceId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await U.getFulfillmentSummary(this._invoiceId);
    t ? this._errorMessage = t.message : this._fulfillmentData = e ?? null, this._isLoading = !1;
  }
  async _handleEditShipment(e) {
    if (!De(this, he)) return;
    (await De(this, he).open(this, aa, {
      data: { shipment: e }
    }).onSubmit().catch(() => {
    }))?.updated && this._loadShipments();
  }
  async _handleDeleteShipment(e) {
    if (!confirm(
      "Are you sure you want to delete this shipment? This will release the items back to unfulfilled."
    )) return;
    const { error: a } = await U.deleteShipment(e.id);
    if (a) {
      alert(a.message);
      return;
    }
    this._loadShipments(), this._invoiceId && De(this, fe)?.load(this._invoiceId);
  }
  _renderShipmentCard(e, t) {
    const a = this._getCarrierClass(e.carrier);
    return s`
      <div class="shipment-card">
        <div class="shipment-header">
          <div class="header-left">
            ${e.carrier ? s`<span class="carrier-badge ${a}">${e.carrier}</span>` : s`<span class="carrier-badge">No carrier</span>`}
            <span class="shipment-date">Created ${tt(e.dateCreated)}</span>
          </div>
          <div class="header-right">
            <uui-button look="secondary" compact label="Edit" @click=${() => this._handleEditShipment(e)}>
              <uui-icon name="icon-edit"></uui-icon>
              Edit
            </uui-button>
            <uui-button
              look="secondary"
              compact
              label="Delete"
              color="danger"
              @click=${() => this._handleDeleteShipment(e)}
            >
              <uui-icon name="icon-delete"></uui-icon>
            </uui-button>
          </div>
        </div>

        <div class="shipment-details">
          <div class="detail-row">
            <span class="label">Warehouse:</span>
            <span class="value">${t}</span>
          </div>
          ${e.trackingNumber ? s`
                <div class="detail-row">
                  <span class="label">Tracking:</span>
                  <span class="value tracking-value">
                    ${e.trackingUrl ? s`<a href="${e.trackingUrl}" target="_blank" rel="noopener"
                          >${e.trackingNumber}</a
                        >` : e.trackingNumber}
                    <button
                      class="copy-btn"
                      title="Copy tracking number"
                      @click=${() => this._copyToClipboard(e.trackingNumber)}
                    >
                      <uui-icon name="icon-documents"></uui-icon>
                    </button>
                  </span>
                </div>
              ` : m}
          ${e.actualDeliveryDate ? s`
                <div class="detail-row">
                  <span class="label">Delivered:</span>
                  <span class="value delivered">${tt(e.actualDeliveryDate)}</span>
                </div>
              ` : m}
        </div>

        <div class="shipment-items">
          <h4>Items in shipment</h4>
          ${e.lineItems.map(
      (r) => s`
              <div class="item-row">
                <div class="item-image">
                  ${r.imageUrl ? s`<img src="${r.imageUrl}" alt="${r.name}" />` : s`<div class="placeholder-image"></div>`}
                </div>
                <div class="item-info">
                  <div class="item-name">${r.name || "Unknown item"}</div>
                  ${r.sku ? s`<div class="item-sku">${r.sku}</div>` : m}
                </div>
                <div class="item-qty">x${r.quantity}</div>
              </div>
            `
    )}
        </div>
      </div>
    `;
  }
  _getCarrierClass(e) {
    if (!e) return "";
    const t = e.toLowerCase();
    return t.includes("ups") ? "ups" : t.includes("fedex") ? "fedex" : t.includes("dhl") ? "dhl" : t.includes("usps") ? "usps" : t.includes("royal mail") ? "royalmail" : "";
  }
  async _copyToClipboard(e) {
    try {
      await navigator.clipboard.writeText(e);
    } catch (t) {
      console.error("Failed to copy to clipboard", t);
    }
  }
  render() {
    if (this._isLoading)
      return s`<div class="loading"><uui-loader></uui-loader></div>`;
    if (this._errorMessage)
      return s`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          ${this._errorMessage}
        </div>
      `;
    if (!this._fulfillmentData)
      return s`<div class="empty">No order data available</div>`;
    const e = [];
    for (const t of this._fulfillmentData.orders)
      for (const a of t.shipments)
        e.push({ shipment: a, warehouseName: t.warehouseName });
    return e.length === 0 ? s`
        <div class="empty-state">
          <uui-icon name="icon-box"></uui-icon>
          <h3>No shipments yet</h3>
          <p>Use the "Fulfil" button on the Details tab to create shipments for this order.</p>
        </div>
      ` : s`
      <div class="shipments-view">
        <div class="header">
          <h2>Shipments</h2>
          <div class="summary">
            <span class="status-badge ${this._fulfillmentData.overallStatus.toLowerCase()}">
              ${this._fulfillmentData.overallStatus}
            </span>
            <span class="count">${e.length} shipment${e.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        <div class="shipments-list">
          ${e.map(({ shipment: t, warehouseName: a }) => this._renderShipmentCard(t, a))}
        </div>
      </div>
    `;
  }
};
fe = /* @__PURE__ */ new WeakMap();
he = /* @__PURE__ */ new WeakMap();
Y.styles = ot`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-2);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: #f8d7da;
      color: #721c24;
      border-radius: var(--uui-border-radius);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--uui-size-layout-4);
      text-align: center;
      color: var(--uui-color-text-alt);
    }

    .empty-state uui-icon {
      font-size: 48px;
      margin-bottom: var(--uui-size-space-4);
      opacity: 0.5;
    }

    .empty-state h3 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: 1.25rem;
    }

    .empty-state p {
      margin: 0;
      max-width: 400px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
    }

    .header h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .summary {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      text-transform: capitalize;
    }

    .status-badge.fulfilled {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.partial {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.unfulfilled {
      background: #f8d7da;
      color: #721c24;
    }

    .count {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .shipments-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-4);
    }

    .shipment-card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .shipment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
      padding-bottom: var(--uui-size-space-3);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
    }

    .header-right {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .carrier-badge {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      background: var(--uui-color-surface-alt);
      color: var(--uui-color-text);
    }

    .carrier-badge.ups {
      background: #351c15;
      color: #ffb500;
    }

    .carrier-badge.fedex {
      background: #4d148c;
      color: #ff6600;
    }

    .carrier-badge.dhl {
      background: #ffcc00;
      color: #d40511;
    }

    .carrier-badge.usps {
      background: #004b87;
      color: white;
    }

    .carrier-badge.royalmail {
      background: #e4002b;
      color: white;
    }

    .shipment-date {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .shipment-details {
      margin-bottom: var(--uui-size-space-3);
    }

    .detail-row {
      display: flex;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-1) 0;
      font-size: 0.875rem;
    }

    .detail-row .label {
      color: var(--uui-color-text-alt);
      min-width: 80px;
    }

    .detail-row .value {
      font-weight: 500;
    }

    .tracking-value {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .tracking-value a {
      color: var(--uui-color-interactive);
    }

    .copy-btn {
      background: none;
      border: none;
      padding: 2px;
      cursor: pointer;
      color: var(--uui-color-text-alt);
      opacity: 0.6;
    }

    .copy-btn:hover {
      opacity: 1;
    }

    .delivered {
      color: #155724;
    }

    .shipment-items {
      background: var(--uui-color-surface-alt);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .shipment-items h4 {
      margin: 0 0 var(--uui-size-space-2);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--uui-color-text-alt);
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) 0;
    }

    .item-row:not(:last-child) {
      border-bottom: 1px solid var(--uui-color-border);
    }

    .item-image img,
    .placeholder-image {
      width: 40px;
      height: 40px;
      border-radius: var(--uui-border-radius);
      object-fit: cover;
    }

    .placeholder-image {
      background: var(--uui-color-surface);
    }

    .item-info {
      flex: 1;
    }

    .item-name {
      font-weight: 500;
      font-size: 0.875rem;
    }

    .item-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .item-qty {
      font-weight: 600;
      font-size: 0.875rem;
    }
  `;
ve([
  h()
], Y.prototype, "_invoiceId", 2);
ve([
  h()
], Y.prototype, "_fulfillmentData", 2);
ve([
  h()
], Y.prototype, "_isLoading", 2);
ve([
  h()
], Y.prototype, "_errorMessage", 2);
Y = ve([
  st("merchello-shipments-view")
], Y);
const oa = new Me("Merchello.ManualPayment.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
}), sa = new Me("Merchello.Refund.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var la = Object.defineProperty, da = Object.getOwnPropertyDescriptor, ai = (e) => {
  throw TypeError(e);
}, te = (e, t, a, r) => {
  for (var o = r > 1 ? void 0 : r ? da(t, a) : t, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (o = (r ? v(t, a, o) : v(o)) || o);
  return r && o && la(t, a, o), o;
}, ri = (e, t, a) => t.has(e) || ai("Cannot " + a), $e = (e, t, a) => (ri(e, t, "read from private field"), t.get(e)), ua = (e, t, a) => t.has(e) ? ai("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), ca = (e, t, a, r) => (ri(e, t, "write to private field"), t.set(e, a), a), j;
let G = class extends lt(nt) {
  constructor() {
    super(), this.invoiceId = "", this._payments = [], this._status = null, this._isLoading = !0, this._errorMessage = null, ua(this, j), this.consumeContext(dt, (e) => {
      ca(this, j, e);
    });
  }
  connectedCallback() {
    super.connectedCallback(), this.invoiceId && this._loadPayments();
  }
  updated(e) {
    e.has("invoiceId") && this.invoiceId && this._loadPayments();
  }
  async _loadPayments() {
    if (this.invoiceId) {
      this._isLoading = !0, this._errorMessage = null;
      try {
        const [e, t] = await Promise.all([
          U.getInvoicePayments(this.invoiceId),
          U.getPaymentStatus(this.invoiceId)
        ]);
        if (e.error) {
          this._errorMessage = e.error.message, this._isLoading = !1;
          return;
        }
        if (t.error) {
          this._errorMessage = t.error.message, this._isLoading = !1;
          return;
        }
        this._payments = e.data ?? [], this._status = t.data ?? null;
      } catch (e) {
        this._errorMessage = e instanceof Error ? e.message : "Failed to load payments";
      }
      this._isLoading = !1;
    }
  }
  async _openManualPaymentModal() {
    if (!$e(this, j) || !this._status) return;
    (await $e(this, j).open(this, oa, {
      data: {
        invoiceId: this.invoiceId,
        balanceDue: this._status.balanceDue
      }
    }).onSubmit().catch(() => {
    }))?.recorded && (await this._loadPayments(), this.dispatchEvent(new CustomEvent("payment-recorded", {
      detail: { invoiceId: this.invoiceId },
      bubbles: !0,
      composed: !0
    })));
  }
  async _openRefundModal(e) {
    if (!$e(this, j)) return;
    (await $e(this, j).open(this, sa, {
      data: { payment: e }
    }).onSubmit().catch(() => {
    }))?.refunded && (await this._loadPayments(), this.dispatchEvent(new CustomEvent("refund-processed", {
      detail: { invoiceId: this.invoiceId },
      bubbles: !0,
      composed: !0
    })));
  }
  _getStatusBadgeClass(e) {
    switch (e) {
      case le.Paid:
        return "paid";
      case le.PartiallyPaid:
        return "partial";
      case le.Refunded:
      case le.PartiallyRefunded:
        return "refunded";
      case le.AwaitingPayment:
        return "awaiting";
      default:
        return "unpaid";
    }
  }
  _renderPayment(e) {
    const t = e.paymentType === Nt.Refund || e.paymentType === Nt.PartialRefund;
    return s`
      <div class="payment-item ${t ? "refund" : ""}">
        <div class="payment-main">
          <div class="payment-info">
            <div class="payment-method">
              ${t ? s`<uui-icon name="icon-undo"></uui-icon>` : s`<uui-icon name="icon-credit-card"></uui-icon>`}
              <span>${e.paymentMethod ?? "Payment"}</span>
              ${e.paymentProviderAlias ? s`<span class="provider-badge">${e.paymentProviderAlias}</span>` : m}
            </div>
            <div class="payment-date">${tt(e.dateCreated)}</div>
            ${e.transactionId ? s`<div class="transaction-id">ID: ${e.transactionId}</div>` : m}
            ${e.description ? s`<div class="payment-description">${e.description}</div>` : m}
            ${e.refundReason ? s`<div class="refund-reason">Reason: ${e.refundReason}</div>` : m}
          </div>
          <div class="payment-amount ${t ? "negative" : ""}">
            ${t ? "-" : ""}${L(Math.abs(e.amount))}
          </div>
          <div class="payment-actions">
            ${!t && e.refundableAmount > 0 ? s`
                  <uui-button
                    look="secondary"
                    label="Refund"
                    @click=${() => this._openRefundModal(e)}
                  >
                    Refund
                  </uui-button>
                ` : m}
          </div>
        </div>
        ${e.refunds && e.refunds.length > 0 ? s`
              <div class="refunds-list">
                ${e.refunds.map((a) => this._renderPayment(a))}
              </div>
            ` : m}
      </div>
    `;
  }
  render() {
    if (this._isLoading)
      return s`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      `;
    if (this._errorMessage)
      return s`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      `;
    const e = this._status;
    return s`
      <div class="payment-panel">
        <!-- Payment Status Summary -->
        <div class="status-summary">
          <div class="status-header">
            <span class="status-badge ${e ? this._getStatusBadgeClass(e.status) : "unpaid"}">
              ${e?.statusDisplay ?? "Unknown"}
            </span>
            ${e && e.balanceDue > 0 ? s`
                  <uui-button
                    look="primary"
                    label="Record Payment"
                    @click=${this._openManualPaymentModal}
                  >
                    <uui-icon name="icon-add"></uui-icon>
                    Record Payment
                  </uui-button>
                ` : m}
          </div>

          ${e ? s`
                <div class="status-details">
                  <div class="status-row">
                    <span>Invoice Total</span>
                    <span>${L(e.invoiceTotal)}</span>
                  </div>
                  <div class="status-row">
                    <span>Total Paid</span>
                    <span class="positive">${L(e.totalPaid)}</span>
                  </div>
                  ${e.totalRefunded > 0 ? s`
                        <div class="status-row">
                          <span>Total Refunded</span>
                          <span class="negative">-${L(e.totalRefunded)}</span>
                        </div>
                      ` : m}
                  <div class="status-row total">
                    <span>Balance Due</span>
                    <span class="${e.balanceDue > 0 ? "negative" : ""}">
                      ${L(e.balanceDue)}
                    </span>
                  </div>
                </div>
              ` : m}
        </div>

        <!-- Payments List -->
        <div class="payments-section">
          <h3>Payment History</h3>
          ${this._payments.length === 0 ? s`<p class="no-payments">No payments recorded yet.</p>` : s`
                <div class="payments-list">
                  ${this._payments.map((t) => this._renderPayment(t))}
                </div>
              `}
        </div>
      </div>
    `;
  }
};
j = /* @__PURE__ */ new WeakMap();
G.styles = ot`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-1);
    }

    .error {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-4);
      background: var(--uui-color-danger-standalone);
      color: var(--uui-color-danger-contrast);
      border-radius: var(--uui-border-radius);
    }

    .payment-panel {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-5);
    }

    .status-summary {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status-badge.paid {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.partial {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.unpaid {
      background: #f8d7da;
      color: #721c24;
    }

    .status-badge.awaiting {
      background: #cce5ff;
      color: #004085;
    }

    .status-badge.refunded {
      background: #e2e3e5;
      color: #383d41;
    }

    .status-details {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .status-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .status-row.total {
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
      font-weight: 600;
    }

    .positive {
      color: var(--uui-color-positive);
    }

    .negative {
      color: var(--uui-color-danger);
    }

    .payments-section h3 {
      margin: 0 0 var(--uui-size-space-3) 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .no-payments {
      color: var(--uui-color-text-alt);
      font-style: italic;
    }

    .payments-list {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .payment-item {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-3);
    }

    .payment-item.refund {
      background: var(--uui-color-surface-alt);
      border-left: 3px solid var(--uui-color-warning);
    }

    .payment-main {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: var(--uui-size-space-3);
      align-items: start;
    }

    .payment-info {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-1);
    }

    .payment-method {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-weight: 500;
    }

    .provider-badge {
      font-size: 0.75rem;
      padding: 1px 6px;
      background: var(--uui-color-surface-alt);
      border-radius: 8px;
      color: var(--uui-color-text-alt);
    }

    .payment-date,
    .transaction-id,
    .payment-description,
    .refund-reason {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .refund-reason {
      font-style: italic;
    }

    .payment-amount {
      font-weight: 600;
      font-size: 1rem;
    }

    .payment-amount.negative {
      color: var(--uui-color-danger);
    }

    .refunds-list {
      margin-top: var(--uui-size-space-3);
      padding-left: var(--uui-size-space-4);
      border-left: 2px solid var(--uui-color-border);
    }

    .refunds-list .payment-item {
      margin-bottom: var(--uui-size-space-2);
    }

    .refunds-list .payment-item:last-child {
      margin-bottom: 0;
    }
  `;
te([
  $i({ type: String })
], G.prototype, "invoiceId", 2);
te([
  h()
], G.prototype, "_payments", 2);
te([
  h()
], G.prototype, "_status", 2);
te([
  h()
], G.prototype, "_isLoading", 2);
te([
  h()
], G.prototype, "_errorMessage", 2);
G = te([
  st("merchello-payment-panel")
], G);
var pa = Object.defineProperty, ma = Object.getOwnPropertyDescriptor, ni = (e) => {
  throw TypeError(e);
}, $ = (e, t, a, r) => {
  for (var o = r > 1 ? void 0 : r ? ma(t, a) : t, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (o = (r ? v(t, a, o) : v(o)) || o);
  return r && o && pa(t, a, o), o;
}, oi = (e, t, a) => t.has(e) || ni("Cannot " + a), H = (e, t, a) => (oi(e, t, "read from private field"), t.get(e)), Xt = (e, t, a) => t.has(e) ? ni("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), Vt = (e, t, a, r) => (oi(e, t, "write to private field"), t.set(e, a), a), F, ge;
let E = class extends lt(nt) {
  constructor() {
    super(), this._order = null, this._isLoading = !0, this._activeTab = "details", this._newNoteText = "", this._visibleToCustomer = !1, this._isPostingNote = !1, this._noteError = null, this._editingSection = null, this._editFormData = {}, this._isSavingAddress = !1, this._validationErrors = {}, this._countries = [], Xt(this, F), Xt(this, ge), this.consumeContext(Kt, (e) => {
      Vt(this, F, e), H(this, F) && this.observe(H(this, F).order, (t) => {
        this._order = t ?? null, this._isLoading = !t;
      });
    }), this.consumeContext(dt, (e) => {
      Vt(this, ge, e);
    }), this.consumeContext(Mi, (e) => {
      this.observe(e?.currentUser, (t) => {
        this._currentUser = t;
      });
    }), this._loadCountries();
  }
  async _loadCountries() {
    const { data: e } = await U.getCountries();
    e && (this._countries = e);
  }
  _getGravatarUrl(e, t = 40) {
    return e ? `https://www.gravatar.com/avatar/${this._simpleHash(e.toLowerCase().trim())}?d=mp&s=${t}` : null;
  }
  _simpleHash(e) {
    let t = 3735928559, a = 1103547991;
    for (let o = 0; o < e.length; o++) {
      const u = e.charCodeAt(o);
      t = Math.imul(t ^ u, 2654435761), a = Math.imul(a ^ u, 1597334677);
    }
    return t = Math.imul(t ^ t >>> 16, 2246822507), t ^= Math.imul(a ^ a >>> 13, 3266489909), a = Math.imul(a ^ a >>> 16, 2246822507), a ^= Math.imul(t ^ t >>> 13, 3266489909), (4294967296 * (2097151 & a) + (t >>> 0)).toString(16).padStart(32, "0");
  }
  async _openFulfillmentModal() {
    if (!this._order || !H(this, ge)) return;
    await H(this, ge).open(this, ia, {
      data: { invoiceId: this._order.id }
    }).onSubmit().catch(() => {
    }), H(this, F)?.load(this._order.id);
  }
  _getPaymentStatusBadgeClass(e) {
    switch (e) {
      case 30:
        return "paid";
      case 20:
        return "partial";
      case 50:
      // Refunded
      case 40:
        return "refunded";
      case 10:
        return "awaiting";
      default:
        return "unpaid";
    }
  }
  _formatAddress(e) {
    if (!e) return ["No address"];
    const t = [];
    e.name && t.push(e.name), e.company && t.push(e.company), e.addressOne && t.push(e.addressOne), e.addressTwo && t.push(e.addressTwo);
    const a = [e.townCity, e.countyState, e.postalCode].filter(Boolean).join(" ");
    return a && t.push(a), e.country && t.push(e.country), e.phone && t.push(e.phone), t;
  }
  _renderMarkdown(e) {
    Ot.setOptions({ breaks: !0, gfm: !0 });
    const t = Ot.parse(e), a = ta.sanitize(t);
    return zi(a);
  }
  _getGoogleMapsUrl(e) {
    if (!e) return "";
    const t = [e.townCity, e.postalCode, e.country].filter(Boolean);
    return t.length === 0 ? "" : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.join(", "))}`;
  }
  _startEditing(e) {
    this._order && (e === "contact" ? this._editFormData = { email: this._order.billingAddress?.email || "" } : e === "shipping" ? this._editFormData = this._order.shippingAddress ? { ...this._order.shippingAddress } : {} : e === "billing" && (this._editFormData = this._order.billingAddress ? { ...this._order.billingAddress } : {}), this._editingSection = e, this._validationErrors = {});
  }
  _cancelEditing() {
    this._editingSection = null, this._editFormData = {}, this._validationErrors = {};
  }
  _validateEmail(e) {
    return e ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) : !0;
  }
  _validateAddress() {
    const e = {}, t = this._editFormData;
    return this._editingSection === "contact" ? t.email && !this._validateEmail(t.email) && (e.email = "Please enter a valid email address") : (t.name?.trim() || (e.name = "Name is required"), t.addressOne?.trim() || (e.addressOne = "Address is required"), t.townCity?.trim() || (e.townCity = "Town/City is required"), t.postalCode?.trim() || (e.postalCode = "Postal code is required"), t.countryCode || (e.countryCode = "Country is required")), this._validationErrors = e, Object.keys(e).length === 0;
  }
  async _saveEditing() {
    if (!this._order || !this._editingSection || !this._validateAddress())
      return;
    this._isSavingAddress = !0;
    let e;
    if (this._editingSection === "contact") {
      const t = {
        ...this._order.billingAddress,
        email: this._editFormData.email || null
      };
      e = await U.updateBillingAddress(this._order.id, t);
    } else if (this._editingSection === "shipping") {
      const t = {
        ...this._order.shippingAddress,
        ...this._editFormData
      };
      e = await U.updateShippingAddress(this._order.id, t);
    } else {
      const t = {
        ...this._order.billingAddress,
        ...this._editFormData
      };
      e = await U.updateBillingAddress(this._order.id, t);
    }
    if (this._isSavingAddress = !1, e.error) {
      console.error("Failed to save address:", e.error);
      return;
    }
    this._editingSection = null, this._editFormData = {}, this._validationErrors = {}, H(this, F)?.load(this._order.id);
  }
  _updateFormField(e, t) {
    if (this._editFormData = { ...this._editFormData, [e]: t || null }, this._validationErrors[e]) {
      const { [e]: a, ...r } = this._validationErrors;
      this._validationErrors = r;
    }
  }
  _renderInput(e, t, a, r = "text") {
    const o = !!this._validationErrors[e];
    return s`
      <div class="form-field ${o ? "has-error" : ""}">
        <uui-input
          type=${r}
          label=${t}
          placeholder=${a}
          .value=${this._editFormData[e] || ""}
          @input=${(u) => this._updateFormField(e, u.target.value)}
        ></uui-input>
        ${o ? s`<span class="field-error">${this._validationErrors[e]}</span>` : m}
      </div>
    `;
  }
  _renderCountrySelect() {
    const e = !!this._validationErrors.countryCode;
    return s`
      <div class="form-field ${e ? "has-error" : ""}">
        <uui-select
          label="Country"
          placeholder="Select country"
          .value=${this._editFormData.countryCode || ""}
          @change=${(t) => {
      const a = t.target, r = this._countries.find((o) => o.code === a.value);
      if (this._editFormData = {
        ...this._editFormData,
        countryCode: a.value || null,
        country: r?.name || null
      }, this._validationErrors.countryCode) {
        const { countryCode: o, ...u } = this._validationErrors;
        this._validationErrors = u;
      }
    }}
        >
          <option value="">Select country...</option>
          ${this._countries.map((t) => s`
            <option value=${t.code} ?selected=${this._editFormData.countryCode === t.code}>${t.name}</option>
          `)}
        </uui-select>
        ${e ? s`<span class="field-error">${this._validationErrors.countryCode}</span>` : m}
      </div>
    `;
  }
  _renderFulfillmentCard(e) {
    const t = this._getStatusLabel(e.status), a = this._order?.fulfillmentStatus === "Fulfilled", r = e.status >= 50 ? "shipped" : "unfulfilled";
    return s`
      <div class="card fulfillment-card">
        <div class="fulfillment-header">
          <span class="fulfillment-status-badge ${r}">
            <uui-icon name="icon-box"></uui-icon>
            ${t}
          </span>
        </div>
        <div class="fulfillment-shipping-method">
          <uui-icon name="icon-truck"></uui-icon>
          <span>${e.deliveryMethod}</span>
        </div>
        <div class="fulfillment-line-items">
          ${e.lineItems.map(
      (o) => s`
              <div class="fulfillment-line-item">
                <div class="fulfillment-item-image">
                  ${o.imageUrl ? s`<img src="${o.imageUrl}" alt="${o.name}" />` : s`<div class="fulfillment-placeholder-image"></div>`}
                </div>
                <div class="fulfillment-item-details">
                  <div class="fulfillment-item-name">${o.name}</div>
                  <div class="fulfillment-item-variant">${o.sku || ""}</div>
                </div>
                <div class="fulfillment-item-pricing">
                  <span class="fulfillment-item-price">${L(o.amount)}</span>
                  <span class="fulfillment-item-multiply">×</span>
                  <span class="fulfillment-item-qty">${o.quantity}</span>
                </div>
                <div class="fulfillment-item-total">${L(o.amount * o.quantity)}</div>
              </div>
            `
    )}
        </div>
        <div class="fulfillment-footer">
          <div class="fulfillment-actions">
            <uui-button
              look="${a ? "secondary" : "primary"}"
              label="${a ? "Fulfilled" : "Fulfil"}"
              ?disabled=${a}
              @click=${a ? m : this._openFulfillmentModal}
            >
              ${a ? "Fulfilled" : "Fulfil"}
            </uui-button>
            <uui-button look="outline" label="Create shipping label">
              Create shipping label
            </uui-button>
          </div>
        </div>
      </div>
    `;
  }
  _getStatusLabel(e) {
    return {
      0: "Pending",
      10: "Awaiting Stock",
      20: "Ready to Fulfill",
      30: "Processing",
      40: "Partially Shipped",
      50: "Shipped",
      60: "Completed",
      70: "Cancelled",
      80: "On Hold"
    }[e] || "Unknown";
  }
  _getDateGroupLabel(e) {
    const t = /* @__PURE__ */ new Date(), a = new Date(t);
    a.setDate(a.getDate() - 1);
    const r = e.toDateString() === t.toDateString(), o = e.toDateString() === a.toDateString();
    return r ? "Today" : o ? "Yesterday" : e.toLocaleDateString(void 0, { weekday: "long", month: "long", day: "numeric" });
  }
  _formatTimeOnly(e) {
    return new Date(e).toLocaleTimeString(void 0, { hour: "2-digit", minute: "2-digit" });
  }
  _groupNotesByDate(e) {
    const t = /* @__PURE__ */ new Map(), a = [...e].sort((r, o) => new Date(o.date).getTime() - new Date(r.date).getTime());
    for (const r of a) {
      const o = new Date(r.date), u = this._getDateGroupLabel(o);
      t.has(u) || t.set(u, []), t.get(u).push(r);
    }
    return t;
  }
  _handleTabClick(e) {
    this._activeTab = e;
  }
  _handlePaymentChange() {
    this._order && H(this, F)?.load(this._order.id);
  }
  async _handlePostNote() {
    if (!this._order || !this._newNoteText.trim()) return;
    this._isPostingNote = !0, this._noteError = null;
    const { error: e } = await U.addInvoiceNote(this._order.id, {
      text: this._newNoteText.trim(),
      visibleToCustomer: this._visibleToCustomer
    });
    if (this._isPostingNote = !1, e) {
      this._noteError = e.message || "Failed to post note", console.error("Failed to post note:", e);
      return;
    }
    this._newNoteText = "", this._visibleToCustomer = !1, H(this, F)?.load(this._order.id);
  }
  _renderLoadingState() {
    return s`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderNotFoundState() {
    return s`<div class="error">Order not found</div>`;
  }
  render() {
    if (this._isLoading)
      return this._renderLoadingState();
    if (!this._order)
      return this._renderNotFoundState();
    const e = this._order;
    return s`
      <div class="order-detail">
        <!-- Header -->
        <div class="order-header">
          <div class="header-left">
            <h1>${e.invoiceNumber || "Order"}</h1>
            <span class="badge ${this._getPaymentStatusBadgeClass(e.paymentStatus)}">${e.paymentStatusDisplay}</span>
            <span class="badge ${e.fulfillmentStatus.toLowerCase().replace(" ", "-")}">${e.fulfillmentStatus}</span>
          </div>
          <div class="header-right">
            <uui-button look="secondary" label="Refund">Refund</uui-button>
            <uui-button look="secondary" label="Edit">Edit</uui-button>
            <uui-button look="secondary" label="More actions">More actions</uui-button>
          </div>
        </div>
        <div class="order-meta">
          ${Li(e.dateCreated)} from ${e.channel}
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab ${this._activeTab === "details" ? "active" : ""}"
            @click=${() => this._handleTabClick("details")}
          >
            Details
          </button>
          <button
            class="tab ${this._activeTab === "shipments" ? "active" : ""}"
            @click=${() => this._handleTabClick("shipments")}
          >
            Shipments
          </button>
          <button
            class="tab ${this._activeTab === "payments" ? "active" : ""}"
            @click=${() => this._handleTabClick("payments")}
          >
            Payments
          </button>
        </div>

        <!-- Tab Content -->
        ${this._activeTab === "shipments" ? s`<merchello-shipments-view></merchello-shipments-view>` : this._activeTab === "payments" ? s`
              <merchello-payment-panel
                invoiceId=${e.id}
                @payment-recorded=${this._handlePaymentChange}
                @refund-processed=${this._handlePaymentChange}
              ></merchello-payment-panel>
            ` : s`
        <!-- Main Content -->
        <div class="order-content">
          <!-- Left Column -->
          <div class="main-column">
            <!-- Fulfillment Cards -->
            ${e.orders.map((t) => this._renderFulfillmentCard(t))}

            <!-- Payment Summary -->
            <div class="card payment-card">
              <div class="card-header">
                <input type="checkbox" checked disabled />
                <span>${e.paymentStatusDisplay}</span>
              </div>
              <div class="payment-summary">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <span>${e.orders.reduce((t, a) => t + a.lineItems.reduce((r, o) => r + o.quantity, 0), 0)} items</span>
                  <span>${L(e.subTotal)}</span>
                </div>
                <div class="summary-row">
                  <span>Shipping</span>
                  <span>${e.orders[0]?.deliveryMethod || "Standard"}</span>
                  <span>${L(e.shippingCost)}</span>
                </div>
                <div class="summary-row total">
                  <span>Total</span>
                  <span></span>
                  <span>${L(e.total)}</span>
                </div>
                <div class="summary-row">
                  <span>Paid</span>
                  <span></span>
                  <span>${L(e.amountPaid)}</span>
                </div>
              </div>
            </div>

            <!-- Timeline -->
            <div class="card timeline-card">
              <h3>Timeline</h3>
              <div class="timeline-comment-box">
                <div class="timeline-avatar">
                  ${this._currentUser?.email ? s`<img src="${this._getGravatarUrl(this._currentUser.email)}" alt="Avatar" />` : s`<uui-icon name="icon-user"></uui-icon>`}
                </div>
                <div class="timeline-input-wrapper">
                  <textarea
                    placeholder="Leave a comment..."
                    .value=${this._newNoteText}
                    @input=${(t) => {
      this._newNoteText = t.target.value, this._noteError = null;
    }}
                    rows="2"
                  ></textarea>
                  <div class="timeline-toolbar">
                    <uui-button
                      look="primary"
                      label="Post"
                      ?disabled=${!this._newNoteText.trim() || this._isPostingNote}
                      @click=${this._handlePostNote}
                    >
                      ${this._isPostingNote ? "Posting..." : "Post"}
                    </uui-button>
                  </div>
                  ${this._noteError ? s`<div class="note-error">${this._noteError}</div>` : m}
                </div>
              </div>
              <div class="timeline-visibility-note">
                <label class="customer-visible-checkbox">
                  <input
                    type="checkbox"
                    .checked=${this._visibleToCustomer}
                    @change=${(t) => this._visibleToCustomer = t.target.checked}
                  />
                  Visible to customer
                </label>
                <span class="visibility-hint">Only you and other staff can see comments</span>
              </div>
              <div class="timeline-events-container">
                ${e.notes.length === 0 ? s`<div class="no-notes">No timeline events yet</div>` : Array.from(this._groupNotesByDate(e.notes).entries()).map(
      ([t, a]) => s`
                        <div class="timeline-date-group">
                          <div class="timeline-date-header">${t}</div>
                          <div class="timeline-events">
                            ${a.map(
        (r) => s`
                                <div class="timeline-event ${r.visibleToCustomer ? "customer-visible" : ""}">
                                  <div class="timeline-event-dot"></div>
                                  <div class="timeline-event-content">
                                    ${r.visibleToCustomer ? s`<span class="customer-badge">Customer visible</span>` : m}
                                    <div class="event-text markdown-content">${this._renderMarkdown(r.text)}</div>
                                    ${r.author ? s`<span class="event-author">by ${r.author}</span>` : m}
                                  </div>
                                  <div class="timeline-event-time">${this._formatTimeOnly(r.date)}</div>
                                </div>
                              `
      )}
                          </div>
                        </div>
                      `
    )}
              </div>
            </div>
          </div>

          <!-- Right Column (Sidebar) -->
          <div class="sidebar">
            <!-- Customer -->
            <div class="card">
              <h3>Customer</h3>
              <div class="customer-info">
                <a href="#" class="customer-name">${e.billingAddress?.name || "Unknown"}</a>
                <div class="muted">${e.customerOrderCount} ${e.customerOrderCount === 1 ? "order" : "orders"}</div>
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Contact information</span>
                  ${this._editingSection !== "contact" ? s`
                    <button class="edit-btn" title="Edit" @click=${() => this._startEditing("contact")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </button>
                  ` : m}
                </div>
                ${this._editingSection === "contact" ? s`
                  <div class="edit-form">
                    ${this._renderInput("email", "Email", "Email address", "email")}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? "Saving..." : "Save"}
                      </uui-button>
                    </div>
                  </div>
                ` : s`
                  ${e.billingAddress?.email ? s`<a href="mailto:${e.billingAddress.email}">${e.billingAddress.email}</a>` : s`<span class="muted">No email</span>`}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Shipping address</span>
                  ${this._editingSection !== "shipping" ? s`
                    <button class="edit-btn" title="Edit" @click=${() => this._startEditing("shipping")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </button>
                  ` : m}
                </div>
                ${this._editingSection === "shipping" ? s`
                  <div class="edit-form">
                    ${this._renderInput("name", "Name", "Name")}
                    ${this._renderInput("company", "Company", "Company")}
                    ${this._renderInput("addressOne", "Address Line 1", "Address Line 1")}
                    ${this._renderInput("addressTwo", "Address Line 2", "Address Line 2")}
                    ${this._renderInput("townCity", "Town/City", "Town/City")}
                    ${this._renderInput("countyState", "County/State", "County/State")}
                    ${this._renderInput("postalCode", "Postal Code", "Postal Code")}
                    ${this._renderCountrySelect()}
                    ${this._renderInput("phone", "Phone", "Phone", "tel")}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? "Saving..." : "Save"}
                      </uui-button>
                    </div>
                  </div>
                ` : s`
                  <div class="address">
                    ${this._formatAddress(e.shippingAddress).map((t) => s`<div>${t}</div>`)}
                  </div>
                  ${this._getGoogleMapsUrl(e.shippingAddress) ? s`<a href=${this._getGoogleMapsUrl(e.shippingAddress)} target="_blank" rel="noopener noreferrer" class="view-map">View map</a>` : m}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Billing address</span>
                  ${this._editingSection !== "billing" ? s`
                    <button class="edit-btn" title="Edit" @click=${() => this._startEditing("billing")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </button>
                  ` : m}
                </div>
                ${this._editingSection === "billing" ? s`
                  <div class="edit-form">
                    ${this._renderInput("name", "Name", "Name")}
                    ${this._renderInput("company", "Company", "Company")}
                    ${this._renderInput("addressOne", "Address Line 1", "Address Line 1")}
                    ${this._renderInput("addressTwo", "Address Line 2", "Address Line 2")}
                    ${this._renderInput("townCity", "Town/City", "Town/City")}
                    ${this._renderInput("countyState", "County/State", "County/State")}
                    ${this._renderInput("postalCode", "Postal Code", "Postal Code")}
                    ${this._renderCountrySelect()}
                    ${this._renderInput("phone", "Phone", "Phone", "tel")}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? "Saving..." : "Save"}
                      </uui-button>
                    </div>
                  </div>
                ` : s`
                  ${e.billingAddress === e.shippingAddress ? s`<span class="muted">Same as shipping address</span>` : s`
                        <div class="address">
                          ${this._formatAddress(e.billingAddress).map((t) => s`<div>${t}</div>`)}
                        </div>
                      `}
                `}
              </div>
            </div>

            <!-- Tags -->
            <div class="card">
              <div class="card-header-with-action">
                <h3>Tags</h3>
                <button class="edit-btn" title="Edit">
                  <uui-icon name="icon-edit"></uui-icon>
                </button>
              </div>
              <input type="text" placeholder="Add tags..." class="tags-input" />
            </div>
          </div>
        </div>
        `}
      </div>
    `;
  }
};
F = /* @__PURE__ */ new WeakMap();
ge = /* @__PURE__ */ new WeakMap();
E.styles = ot`
    :host {
      display: block;
      padding: var(--uui-size-layout-1);
      background: var(--uui-color-background);
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: var(--uui-size-layout-2);
    }

    .error {
      padding: var(--uui-size-space-4);
      background: #f8d7da;
      color: #721c24;
      border-radius: var(--uui-border-radius);
    }

    .order-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-2);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .header-left h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
    }

    .header-right {
      display: flex;
      gap: var(--uui-size-space-2);
    }

    .order-meta {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
      margin-bottom: var(--uui-size-space-4);
    }

    .tabs {
      display: flex;
      gap: var(--uui-size-space-1);
      border-bottom: 1px solid var(--uui-color-border);
      margin-bottom: var(--uui-size-space-4);
    }

    .tab {
      padding: var(--uui-size-space-2) var(--uui-size-space-4);
      border: none;
      background: none;
      cursor: pointer;
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: var(--uui-color-text);
    }

    .tab.active {
      color: var(--uui-color-text);
      border-bottom-color: var(--uui-color-current);
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .badge.paid {
      background: #d4edda;
      color: #155724;
    }

    .badge.unpaid {
      background: #f8d7da;
      color: #721c24;
    }

    .badge.fulfilled {
      background: #d4edda;
      color: #155724;
    }

    .badge.unfulfilled {
      background: #fff3cd;
      color: #856404;
    }

    .order-content {
      display: grid;
      grid-template-columns: 1fr 350px;
      gap: var(--uui-size-space-4);
    }

    @media (max-width: 1024px) {
      .order-content {
        grid-template-columns: 1fr;
      }
    }

    .card {
      background: var(--uui-color-surface);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      padding: var(--uui-size-space-4);
      margin-bottom: var(--uui-size-space-4);
    }

    .card h3 {
      margin: 0 0 var(--uui-size-space-3);
      font-size: 0.875rem;
      font-weight: 600;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      margin-bottom: var(--uui-size-space-3);
    }

    .card-header-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-3);
    }

    .card-header-with-action h3 {
      margin: 0;
    }

    .card-footer {
      margin-top: var(--uui-size-space-3);
      padding-top: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }

    /* Fulfillment Card - Shopify-like styling */
    .fulfillment-card {
      padding: 0;
      overflow: hidden;
    }

    .fulfillment-header {
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .fulfillment-status-badge {
      display: inline-flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.8125rem;
      font-weight: 600;
      background: #fef3c7;
      color: #92400e;
    }

    .fulfillment-status-badge uui-icon {
      font-size: 1rem;
    }

    .fulfillment-status-badge.shipped {
      background: #d1fae5;
      color: #065f46;
    }

    .fulfillment-shipping-method {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      padding: var(--uui-size-space-3) var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
      font-size: 0.875rem;
      color: var(--uui-color-text);
    }

    .fulfillment-shipping-method uui-icon {
      color: var(--uui-color-text-alt);
    }

    .fulfillment-line-items {
      display: flex;
      flex-direction: column;
    }

    .fulfillment-line-item {
      display: grid;
      grid-template-columns: 56px 1fr auto auto;
      gap: var(--uui-size-space-4);
      align-items: center;
      padding: var(--uui-size-space-4);
      border-bottom: 1px solid var(--uui-color-border);
    }

    .fulfillment-line-item:last-child {
      border-bottom: none;
    }

    .fulfillment-item-image img,
    .fulfillment-placeholder-image {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid var(--uui-color-border);
    }

    .fulfillment-placeholder-image {
      background: var(--uui-color-surface-alt);
    }

    .fulfillment-item-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .fulfillment-item-name {
      font-weight: 500;
      font-size: 0.875rem;
      color: var(--uui-color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .fulfillment-item-variant {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .fulfillment-item-pricing {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      white-space: nowrap;
    }

    .fulfillment-item-multiply {
      color: var(--uui-color-text-alt);
    }

    .fulfillment-item-qty {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      height: 24px;
      padding: 0 6px;
      background: var(--uui-color-surface-alt);
      border-radius: 4px;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .fulfillment-item-total {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--uui-color-text);
      text-align: right;
      white-space: nowrap;
    }

    .fulfillment-footer {
      padding: var(--uui-size-space-4);
      border-top: 1px solid var(--uui-color-border);
      background: var(--uui-color-surface);
    }

    .fulfillment-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--uui-size-space-3);
    }

    .fulfillment-actions uui-button-group {
      display: flex;
    }

    /* Legacy styles for backward compatibility */
    .status-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 500;
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.shipped {
      background: #d4edda;
      color: #155724;
    }

    .shipping-method {
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
    }

    .line-items {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-3);
    }

    .line-item {
      display: grid;
      grid-template-columns: 50px 1fr auto auto;
      gap: var(--uui-size-space-3);
      align-items: center;
    }

    .item-image img,
    .placeholder-image {
      width: 50px;
      height: 50px;
      border-radius: var(--uui-border-radius);
      object-fit: cover;
    }

    .placeholder-image {
      background: var(--uui-color-surface-alt);
    }

    .item-name {
      font-weight: 500;
    }

    .item-sku {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .item-price,
    .item-total {
      font-size: 0.875rem;
    }

    .payment-summary {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .summary-row {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: var(--uui-size-space-2);
      font-size: 0.875rem;
    }

    .summary-row.total {
      font-weight: 600;
      padding-top: var(--uui-size-space-2);
      border-top: 1px solid var(--uui-color-border);
    }

    /* Timeline - Shopify-like styling */
    .timeline-card {
      padding: var(--uui-size-space-4);
    }

    .timeline-comment-box {
      display: flex;
      gap: var(--uui-size-space-3);
      margin-bottom: var(--uui-size-space-3);
    }

    .timeline-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--uui-color-surface-alt);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--uui-color-text-alt);
      overflow: hidden;
    }

    .timeline-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .timeline-avatar uui-icon {
      font-size: 1.25rem;
    }

    .timeline-input-wrapper {
      flex: 1;
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      overflow: hidden;
    }

    .timeline-input-wrapper textarea {
      width: 100%;
      padding: var(--uui-size-space-3);
      border: none;
      box-sizing: border-box;
      resize: none;
      font-family: inherit;
      font-size: 0.875rem;
      min-height: 60px;
    }

    .timeline-input-wrapper textarea:focus {
      outline: none;
    }

    .timeline-toolbar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
      background: var(--uui-color-surface);
      border-top: 1px solid var(--uui-color-border);
    }

    .note-error {
      color: #dc3545;
      font-size: 0.875rem;
      padding: var(--uui-size-space-2) var(--uui-size-space-3);
    }

    .timeline-visibility-note {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-4);
      padding-left: 52px; /* Align with input (40px avatar + 12px gap) */
    }

    .customer-visible-checkbox {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-2);
      font-size: 0.8125rem;
      color: var(--uui-color-text);
      cursor: pointer;
    }

    .customer-visible-checkbox input {
      cursor: pointer;
    }

    .visibility-hint {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
    }

    .timeline-events-container {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-4);
    }

    .timeline-date-group {
      margin-bottom: var(--uui-size-space-4);
    }

    .timeline-date-header {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--uui-color-text-alt);
      margin-bottom: var(--uui-size-space-3);
    }

    .timeline-events {
      position: relative;
      padding-left: var(--uui-size-space-5);
    }

    .timeline-events::before {
      content: '';
      position: absolute;
      left: 5px;
      top: 8px;
      bottom: 8px;
      width: 1px;
      background: var(--uui-color-border);
    }

    .timeline-event {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--uui-size-space-3);
      padding: var(--uui-size-space-2) 0;
      position: relative;
    }

    .timeline-event-dot {
      position: absolute;
      left: calc(-1 * var(--uui-size-space-5) + 2px);
      top: 10px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--uui-color-text-alt);
    }

    .timeline-event.customer-visible .timeline-event-dot {
      background: #0078d4;
    }

    .timeline-event-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .customer-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 500;
      color: #0078d4;
      background: #cce5ff;
      padding: 2px 8px;
      border-radius: 10px;
      width: fit-content;
    }

    .event-text {
      font-size: 0.875rem;
      color: var(--uui-color-text);
      line-height: 1.5;
    }

    .event-author {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .timeline-event-time {
      font-size: 0.8125rem;
      color: var(--uui-color-text-alt);
      white-space: nowrap;
    }

    .no-notes {
      color: var(--uui-color-text-alt);
      font-style: italic;
      padding: var(--uui-size-space-2);
    }

    .sidebar .card {
      margin-bottom: var(--uui-size-space-3);
    }

    .muted {
      color: var(--uui-color-text-alt);
      font-size: 0.875rem;
    }

    .customer-name {
      color: var(--uui-color-interactive);
      text-decoration: none;
      font-weight: 500;
    }

    .section {
      margin-top: var(--uui-size-space-3);
      padding-top: var(--uui-size-space-3);
      border-top: 1px solid var(--uui-color-border);
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--uui-size-space-2);
      font-weight: 500;
      font-size: 0.875rem;
    }

    .address {
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .view-map {
      display: inline-block;
      margin-top: var(--uui-size-space-2);
      color: var(--uui-color-interactive);
      font-size: 0.875rem;
    }

    .edit-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: var(--uui-size-space-1);
      color: var(--uui-color-text-alt);
    }

    .edit-btn:hover {
      color: var(--uui-color-interactive);
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--uui-size-space-2);
    }

    .edit-form uui-input,
    .edit-form uui-select {
      width: 100%;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-field.has-error uui-input,
    .form-field.has-error uui-select {
      --uui-input-border-color: #dc3545;
    }

    .field-error {
      color: #dc3545;
      font-size: 0.75rem;
    }

    .edit-actions {
      display: flex;
      gap: var(--uui-size-space-2);
      justify-content: flex-end;
      margin-top: var(--uui-size-space-2);
    }

    .tags-input {
      width: 100%;
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      box-sizing: border-box;
    }

    /* Markdown content styles for timeline notes */
    .markdown-content {
      line-height: 1.5;
    }

    .markdown-content p {
      margin: 0 0 var(--uui-size-space-2) 0;
    }

    .markdown-content p:last-child {
      margin-bottom: 0;
    }

    .markdown-content ul,
    .markdown-content ol {
      margin: var(--uui-size-space-2) 0;
      padding-left: var(--uui-size-space-5);
    }

    .markdown-content li {
      margin: var(--uui-size-space-1) 0;
    }

    .markdown-content code {
      background: var(--uui-color-surface-alt);
      padding: 1px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.875em;
    }

    .markdown-content pre {
      background: var(--uui-color-surface-alt);
      padding: var(--uui-size-space-2);
      border-radius: var(--uui-border-radius);
      overflow-x: auto;
      margin: var(--uui-size-space-2) 0;
    }

    .markdown-content pre code {
      background: none;
      padding: 0;
    }

    .markdown-content a {
      color: var(--uui-color-interactive);
    }

    .markdown-content strong {
      font-weight: 600;
    }

    .markdown-content blockquote {
      border-left: 3px solid var(--uui-color-border-emphasis);
      margin: var(--uui-size-space-2) 0;
      padding-left: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
    }
  `;
$([
  h()
], E.prototype, "_order", 2);
$([
  h()
], E.prototype, "_isLoading", 2);
$([
  h()
], E.prototype, "_activeTab", 2);
$([
  h()
], E.prototype, "_newNoteText", 2);
$([
  h()
], E.prototype, "_visibleToCustomer", 2);
$([
  h()
], E.prototype, "_isPostingNote", 2);
$([
  h()
], E.prototype, "_noteError", 2);
$([
  h()
], E.prototype, "_currentUser", 2);
$([
  h()
], E.prototype, "_editingSection", 2);
$([
  h()
], E.prototype, "_editFormData", 2);
$([
  h()
], E.prototype, "_isSavingAddress", 2);
$([
  h()
], E.prototype, "_validationErrors", 2);
$([
  h()
], E.prototype, "_countries", 2);
E = $([
  st("merchello-order-detail")
], E);
const xa = E;
export {
  E as MerchelloOrderDetailElement,
  xa as default
};
//# sourceMappingURL=order-detail.element-DsHU4Iwv.js.map
