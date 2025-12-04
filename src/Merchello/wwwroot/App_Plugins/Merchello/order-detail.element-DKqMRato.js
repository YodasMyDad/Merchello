import { LitElement as st, nothing as m, html as n, css as nt, state as g, customElement as ot, property as Mi, unsafeHTML as Li } from "@umbraco-cms/backoffice/external/lit";
import { d as Ot } from "./marked.esm-B6IoMkOX.js";
import { UmbElementMixin as lt } from "@umbraco-cms/backoffice/element-api";
import { UMB_WORKSPACE_CONTEXT as Zt } from "@umbraco-cms/backoffice/workspace";
import { UmbModalToken as Le, UMB_MODAL_MANAGER_CONTEXT as dt } from "@umbraco-cms/backoffice/modal";
import { b as tt, a as R, d as Nt } from "./formatting-B7Ourlxi.js";
import { M as U } from "./merchello-api-DudNt7x5.js";
import { I as le, P as Pt } from "./order.types-FU1fblt8.js";
const {
  entries: Jt,
  setPrototypeOf: Ft,
  isFrozen: Ri,
  getPrototypeOf: Ii,
  getOwnPropertyDescriptor: zi
} = Object;
let {
  freeze: C,
  seal: M,
  create: it
} = Object, {
  apply: at,
  construct: rt
} = typeof Reflect < "u" && Reflect;
C || (C = function(t) {
  return t;
});
M || (M = function(t) {
  return t;
});
at || (at = function(t, a) {
  for (var s = arguments.length, o = new Array(s > 2 ? s - 2 : 0), u = 2; u < s; u++)
    o[u - 2] = arguments[u];
  return t.apply(a, o);
});
rt || (rt = function(t) {
  for (var a = arguments.length, s = new Array(a > 1 ? a - 1 : 0), o = 1; o < a; o++)
    s[o - 1] = arguments[o];
  return new t(...s);
});
const Ce = k(Array.prototype.forEach), Oi = k(Array.prototype.lastIndexOf), Ut = k(Array.prototype.pop), de = k(Array.prototype.push), Ni = k(Array.prototype.splice), Me = k(String.prototype.toLowerCase), Ve = k(String.prototype.toString), Ke = k(String.prototype.match), ce = k(String.prototype.replace), Pi = k(String.prototype.indexOf), Fi = k(String.prototype.trim), L = k(Object.prototype.hasOwnProperty), x = k(RegExp.prototype.test), ue = Ui(TypeError);
function k(e) {
  return function(t) {
    t instanceof RegExp && (t.lastIndex = 0);
    for (var a = arguments.length, s = new Array(a > 1 ? a - 1 : 0), o = 1; o < a; o++)
      s[o - 1] = arguments[o];
    return at(e, t, s);
  };
}
function Ui(e) {
  return function() {
    for (var t = arguments.length, a = new Array(t), s = 0; s < t; s++)
      a[s] = arguments[s];
    return rt(e, a);
  };
}
function c(e, t) {
  let a = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Me;
  Ft && Ft(e, null);
  let s = t.length;
  for (; s--; ) {
    let o = t[s];
    if (typeof o == "string") {
      const u = a(o);
      u !== o && (Ri(t) || (t[s] = u), o = u);
    }
    e[o] = !0;
  }
  return e;
}
function Hi(e) {
  for (let t = 0; t < e.length; t++)
    L(e, t) || (e[t] = null);
  return e;
}
function P(e) {
  const t = it(null);
  for (const [a, s] of Jt(e))
    L(e, a) && (Array.isArray(s) ? t[a] = Hi(s) : s && typeof s == "object" && s.constructor === Object ? t[a] = P(s) : t[a] = s);
  return t;
}
function pe(e, t) {
  for (; e !== null; ) {
    const s = zi(e, t);
    if (s) {
      if (s.get)
        return k(s.get);
      if (typeof s.value == "function")
        return k(s.value);
    }
    e = Ii(e);
  }
  function a() {
    return null;
  }
  return a;
}
const Ht = C(["a", "abbr", "acronym", "address", "area", "article", "aside", "audio", "b", "bdi", "bdo", "big", "blink", "blockquote", "body", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "content", "data", "datalist", "dd", "decorator", "del", "details", "dfn", "dialog", "dir", "div", "dl", "dt", "element", "em", "fieldset", "figcaption", "figure", "font", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "map", "mark", "marquee", "menu", "menuitem", "meter", "nav", "nobr", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "search", "section", "select", "shadow", "slot", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "tt", "u", "ul", "var", "video", "wbr"]), Ze = C(["svg", "a", "altglyph", "altglyphdef", "altglyphitem", "animatecolor", "animatemotion", "animatetransform", "circle", "clippath", "defs", "desc", "ellipse", "enterkeyhint", "exportparts", "filter", "font", "g", "glyph", "glyphref", "hkern", "image", "inputmode", "line", "lineargradient", "marker", "mask", "metadata", "mpath", "part", "path", "pattern", "polygon", "polyline", "radialgradient", "rect", "stop", "style", "switch", "symbol", "text", "textpath", "title", "tref", "tspan", "view", "vkern"]), Je = C(["feBlend", "feColorMatrix", "feComponentTransfer", "feComposite", "feConvolveMatrix", "feDiffuseLighting", "feDisplacementMap", "feDistantLight", "feDropShadow", "feFlood", "feFuncA", "feFuncB", "feFuncG", "feFuncR", "feGaussianBlur", "feImage", "feMerge", "feMergeNode", "feMorphology", "feOffset", "fePointLight", "feSpecularLighting", "feSpotLight", "feTile", "feTurbulence"]), Gi = C(["animate", "color-profile", "cursor", "discard", "font-face", "font-face-format", "font-face-name", "font-face-src", "font-face-uri", "foreignobject", "hatch", "hatchpath", "mesh", "meshgradient", "meshpatch", "meshrow", "missing-glyph", "script", "set", "solidcolor", "unknown", "use"]), Qe = C(["math", "menclose", "merror", "mfenced", "mfrac", "mglyph", "mi", "mlabeledtr", "mmultiscripts", "mn", "mo", "mover", "mpadded", "mphantom", "mroot", "mrow", "ms", "mspace", "msqrt", "mstyle", "msub", "msup", "msubsup", "mtable", "mtd", "mtext", "mtr", "munder", "munderover", "mprescripts"]), Wi = C(["maction", "maligngroup", "malignmark", "mlongdiv", "mscarries", "mscarry", "msgroup", "mstack", "msline", "msrow", "semantics", "annotation", "annotation-xml", "mprescripts", "none"]), Gt = C(["#text"]), Wt = C(["accept", "action", "align", "alt", "autocapitalize", "autocomplete", "autopictureinpicture", "autoplay", "background", "bgcolor", "border", "capture", "cellpadding", "cellspacing", "checked", "cite", "class", "clear", "color", "cols", "colspan", "controls", "controlslist", "coords", "crossorigin", "datetime", "decoding", "default", "dir", "disabled", "disablepictureinpicture", "disableremoteplayback", "download", "draggable", "enctype", "enterkeyhint", "exportparts", "face", "for", "headers", "height", "hidden", "high", "href", "hreflang", "id", "inert", "inputmode", "integrity", "ismap", "kind", "label", "lang", "list", "loading", "loop", "low", "max", "maxlength", "media", "method", "min", "minlength", "multiple", "muted", "name", "nonce", "noshade", "novalidate", "nowrap", "open", "optimum", "part", "pattern", "placeholder", "playsinline", "popover", "popovertarget", "popovertargetaction", "poster", "preload", "pubdate", "radiogroup", "readonly", "rel", "required", "rev", "reversed", "role", "rows", "rowspan", "spellcheck", "scope", "selected", "shape", "size", "sizes", "slot", "span", "srclang", "start", "src", "srcset", "step", "style", "summary", "tabindex", "title", "translate", "type", "usemap", "valign", "value", "width", "wrap", "xmlns", "slot"]), et = C(["accent-height", "accumulate", "additive", "alignment-baseline", "amplitude", "ascent", "attributename", "attributetype", "azimuth", "basefrequency", "baseline-shift", "begin", "bias", "by", "class", "clip", "clippathunits", "clip-path", "clip-rule", "color", "color-interpolation", "color-interpolation-filters", "color-profile", "color-rendering", "cx", "cy", "d", "dx", "dy", "diffuseconstant", "direction", "display", "divisor", "dur", "edgemode", "elevation", "end", "exponent", "fill", "fill-opacity", "fill-rule", "filter", "filterunits", "flood-color", "flood-opacity", "font-family", "font-size", "font-size-adjust", "font-stretch", "font-style", "font-variant", "font-weight", "fx", "fy", "g1", "g2", "glyph-name", "glyphref", "gradientunits", "gradienttransform", "height", "href", "id", "image-rendering", "in", "in2", "intercept", "k", "k1", "k2", "k3", "k4", "kerning", "keypoints", "keysplines", "keytimes", "lang", "lengthadjust", "letter-spacing", "kernelmatrix", "kernelunitlength", "lighting-color", "local", "marker-end", "marker-mid", "marker-start", "markerheight", "markerunits", "markerwidth", "maskcontentunits", "maskunits", "max", "mask", "mask-type", "media", "method", "mode", "min", "name", "numoctaves", "offset", "operator", "opacity", "order", "orient", "orientation", "origin", "overflow", "paint-order", "path", "pathlength", "patterncontentunits", "patterntransform", "patternunits", "points", "preservealpha", "preserveaspectratio", "primitiveunits", "r", "rx", "ry", "radius", "refx", "refy", "repeatcount", "repeatdur", "restart", "result", "rotate", "scale", "seed", "shape-rendering", "slope", "specularconstant", "specularexponent", "spreadmethod", "startoffset", "stddeviation", "stitchtiles", "stop-color", "stop-opacity", "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-opacity", "stroke", "stroke-width", "style", "surfacescale", "systemlanguage", "tabindex", "tablevalues", "targetx", "targety", "transform", "transform-origin", "text-anchor", "text-decoration", "text-rendering", "textlength", "type", "u1", "u2", "unicode", "values", "viewbox", "visibility", "version", "vert-adv-y", "vert-origin-x", "vert-origin-y", "width", "word-spacing", "wrap", "writing-mode", "xchannelselector", "ychannelselector", "x", "x1", "x2", "xmlns", "y", "y1", "y2", "z", "zoomandpan"]), Bt = C(["accent", "accentunder", "align", "bevelled", "close", "columnsalign", "columnlines", "columnspan", "denomalign", "depth", "dir", "display", "displaystyle", "encoding", "fence", "frame", "height", "href", "id", "largeop", "length", "linethickness", "lspace", "lquote", "mathbackground", "mathcolor", "mathsize", "mathvariant", "maxsize", "minsize", "movablelimits", "notation", "numalign", "open", "rowalign", "rowlines", "rowspacing", "rowspan", "rspace", "rquote", "scriptlevel", "scriptminsize", "scriptsizemultiplier", "selection", "separator", "separators", "stretchy", "subscriptshift", "supscriptshift", "symmetric", "voffset", "width", "xmlns"]), ke = C(["xlink:href", "xml:id", "xlink:title", "xml:space", "xmlns:xlink"]), Bi = M(/\{\{[\w\W]*|[\w\W]*\}\}/gm), Yi = M(/<%[\w\W]*|[\w\W]*%>/gm), ji = M(/\$\{[\w\W]*/gm), qi = M(/^data-[\-\w.\u00B7-\uFFFF]+$/), Xi = M(/^aria-[\-\w]+$/), Qt = M(
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  // eslint-disable-line no-useless-escape
), Vi = M(/^(?:\w+script|data):/i), Ki = M(
  /[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g
  // eslint-disable-line no-control-regex
), ei = M(/^html$/i), Zi = M(/^[a-z][.\w]*(-[.\w]+)+$/i);
var Yt = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  ARIA_ATTR: Xi,
  ATTR_WHITESPACE: Ki,
  CUSTOM_ELEMENT: Zi,
  DATA_ATTR: qi,
  DOCTYPE_NAME: ei,
  ERB_EXPR: Yi,
  IS_ALLOWED_URI: Qt,
  IS_SCRIPT_OR_DATA: Vi,
  MUSTACHE_EXPR: Bi,
  TMPLIT_EXPR: ji
});
const me = {
  element: 1,
  text: 3,
  // Deprecated
  progressingInstruction: 7,
  comment: 8,
  document: 9
}, Ji = function() {
  return typeof window > "u" ? null : window;
}, Qi = function(t, a) {
  if (typeof t != "object" || typeof t.createPolicy != "function")
    return null;
  let s = null;
  const o = "data-tt-policy-suffix";
  a && a.hasAttribute(o) && (s = a.getAttribute(o));
  const u = "dompurify" + (s ? "#" + s : "");
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
function ti() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Ji();
  const t = (d) => ti(d);
  if (t.version = "3.3.0", t.removed = [], !e || !e.document || e.document.nodeType !== me.document || !e.Element)
    return t.isSupported = !1, t;
  let {
    document: a
  } = e;
  const s = a, o = s.currentScript, {
    DocumentFragment: u,
    HTMLTemplateElement: v,
    Node: Re,
    Element: ct,
    NodeFilter: ie,
    NamedNodeMap: li = e.NamedNodeMap || e.MozNamedAttrMap,
    HTMLFormElement: di,
    DOMParser: ci,
    trustedTypes: _e
  } = e, ae = ct.prototype, ui = pe(ae, "cloneNode"), pi = pe(ae, "remove"), mi = pe(ae, "nextSibling"), fi = pe(ae, "childNodes"), be = pe(ae, "parentNode");
  if (typeof v == "function") {
    const d = a.createElement("template");
    d.content && d.content.ownerDocument && (a = d.content.ownerDocument);
  }
  let S, re = "";
  const {
    implementation: Ie,
    createNodeIterator: hi,
    createDocumentFragment: gi,
    getElementsByTagName: vi
  } = a, {
    importNode: _i
  } = s;
  let w = jt();
  t.isSupported = typeof Jt == "function" && typeof be == "function" && Ie && Ie.createHTMLDocument !== void 0;
  const {
    MUSTACHE_EXPR: ze,
    ERB_EXPR: Oe,
    TMPLIT_EXPR: Ne,
    DATA_ATTR: bi,
    ARIA_ATTR: yi,
    IS_SCRIPT_OR_DATA: Ti,
    ATTR_WHITESPACE: ut,
    CUSTOM_ELEMENT: Ei
  } = Yt;
  let {
    IS_ALLOWED_URI: pt
  } = Yt, _ = null;
  const mt = c({}, [...Ht, ...Ze, ...Je, ...Qe, ...Gt]);
  let y = null;
  const ft = c({}, [...Wt, ...et, ...Bt, ...ke]);
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
  })), se = null, Pe = null;
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
  let ht = !0, Fe = !0, gt = !1, vt = !0, X = !1, ye = !0, W = !1, Ue = !1, He = !1, V = !1, Te = !1, Ee = !1, _t = !0, bt = !1;
  const Ai = "user-content-";
  let Ge = !0, ne = !1, K = {}, Z = null;
  const yt = c({}, ["annotation-xml", "audio", "colgroup", "desc", "foreignobject", "head", "iframe", "math", "mi", "mn", "mo", "ms", "mtext", "noembed", "noframes", "noscript", "plaintext", "script", "style", "svg", "template", "thead", "title", "video", "xmp"]);
  let Tt = null;
  const Et = c({}, ["audio", "video", "img", "source", "image", "track"]);
  let We = null;
  const At = c({}, ["alt", "class", "for", "id", "label", "name", "pattern", "placeholder", "role", "summary", "title", "value", "style", "xmlns"]), Ae = "http://www.w3.org/1998/Math/MathML", Se = "http://www.w3.org/2000/svg", z = "http://www.w3.org/1999/xhtml";
  let J = z, Be = !1, Ye = null;
  const Si = c({}, [Ae, Se, z], Ve);
  let we = c({}, ["mi", "mo", "mn", "ms", "mtext"]), xe = c({}, ["annotation-xml"]);
  const wi = c({}, ["title", "style", "font", "a", "script"]);
  let oe = null;
  const xi = ["application/xhtml+xml", "text/html"], Ci = "text/html";
  let b = null, Q = null;
  const ki = a.createElement("form"), St = function(i) {
    return i instanceof RegExp || i instanceof Function;
  }, je = function() {
    let i = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    if (!(Q && Q === i)) {
      if ((!i || typeof i != "object") && (i = {}), i = P(i), oe = // eslint-disable-next-line unicorn/prefer-includes
      xi.indexOf(i.PARSER_MEDIA_TYPE) === -1 ? Ci : i.PARSER_MEDIA_TYPE, b = oe === "application/xhtml+xml" ? Ve : Me, _ = L(i, "ALLOWED_TAGS") ? c({}, i.ALLOWED_TAGS, b) : mt, y = L(i, "ALLOWED_ATTR") ? c({}, i.ALLOWED_ATTR, b) : ft, Ye = L(i, "ALLOWED_NAMESPACES") ? c({}, i.ALLOWED_NAMESPACES, Ve) : Si, We = L(i, "ADD_URI_SAFE_ATTR") ? c(P(At), i.ADD_URI_SAFE_ATTR, b) : At, Tt = L(i, "ADD_DATA_URI_TAGS") ? c(P(Et), i.ADD_DATA_URI_TAGS, b) : Et, Z = L(i, "FORBID_CONTENTS") ? c({}, i.FORBID_CONTENTS, b) : yt, se = L(i, "FORBID_TAGS") ? c({}, i.FORBID_TAGS, b) : P({}), Pe = L(i, "FORBID_ATTR") ? c({}, i.FORBID_ATTR, b) : P({}), K = L(i, "USE_PROFILES") ? i.USE_PROFILES : !1, ht = i.ALLOW_ARIA_ATTR !== !1, Fe = i.ALLOW_DATA_ATTR !== !1, gt = i.ALLOW_UNKNOWN_PROTOCOLS || !1, vt = i.ALLOW_SELF_CLOSE_IN_ATTR !== !1, X = i.SAFE_FOR_TEMPLATES || !1, ye = i.SAFE_FOR_XML !== !1, W = i.WHOLE_DOCUMENT || !1, V = i.RETURN_DOM || !1, Te = i.RETURN_DOM_FRAGMENT || !1, Ee = i.RETURN_TRUSTED_TYPE || !1, He = i.FORCE_BODY || !1, _t = i.SANITIZE_DOM !== !1, bt = i.SANITIZE_NAMED_PROPS || !1, Ge = i.KEEP_CONTENT !== !1, ne = i.IN_PLACE || !1, pt = i.ALLOWED_URI_REGEXP || Qt, J = i.NAMESPACE || z, we = i.MATHML_TEXT_INTEGRATION_POINTS || we, xe = i.HTML_INTEGRATION_POINTS || xe, f = i.CUSTOM_ELEMENT_HANDLING || {}, i.CUSTOM_ELEMENT_HANDLING && St(i.CUSTOM_ELEMENT_HANDLING.tagNameCheck) && (f.tagNameCheck = i.CUSTOM_ELEMENT_HANDLING.tagNameCheck), i.CUSTOM_ELEMENT_HANDLING && St(i.CUSTOM_ELEMENT_HANDLING.attributeNameCheck) && (f.attributeNameCheck = i.CUSTOM_ELEMENT_HANDLING.attributeNameCheck), i.CUSTOM_ELEMENT_HANDLING && typeof i.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements == "boolean" && (f.allowCustomizedBuiltInElements = i.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements), X && (Fe = !1), Te && (V = !0), K && (_ = c({}, Gt), y = [], K.html === !0 && (c(_, Ht), c(y, Wt)), K.svg === !0 && (c(_, Ze), c(y, et), c(y, ke)), K.svgFilters === !0 && (c(_, Je), c(y, et), c(y, ke)), K.mathMl === !0 && (c(_, Qe), c(y, Bt), c(y, ke))), i.ADD_TAGS && (typeof i.ADD_TAGS == "function" ? q.tagCheck = i.ADD_TAGS : (_ === mt && (_ = P(_)), c(_, i.ADD_TAGS, b))), i.ADD_ATTR && (typeof i.ADD_ATTR == "function" ? q.attributeCheck = i.ADD_ATTR : (y === ft && (y = P(y)), c(y, i.ADD_ATTR, b))), i.ADD_URI_SAFE_ATTR && c(We, i.ADD_URI_SAFE_ATTR, b), i.FORBID_CONTENTS && (Z === yt && (Z = P(Z)), c(Z, i.FORBID_CONTENTS, b)), Ge && (_["#text"] = !0), W && c(_, ["html", "head", "body"]), _.table && (c(_, ["tbody"]), delete se.tbody), i.TRUSTED_TYPES_POLICY) {
        if (typeof i.TRUSTED_TYPES_POLICY.createHTML != "function")
          throw ue('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
        if (typeof i.TRUSTED_TYPES_POLICY.createScriptURL != "function")
          throw ue('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
        S = i.TRUSTED_TYPES_POLICY, re = S.createHTML("");
      } else
        S === void 0 && (S = Qi(_e, o)), S !== null && typeof re == "string" && (re = S.createHTML(""));
      C && C(i), Q = i;
    }
  }, wt = c({}, [...Ze, ...Je, ...Gi]), xt = c({}, [...Qe, ...Wi]), $i = function(i) {
    let r = be(i);
    (!r || !r.tagName) && (r = {
      namespaceURI: J,
      tagName: "template"
    });
    const l = Me(i.tagName), p = Me(r.tagName);
    return Ye[i.namespaceURI] ? i.namespaceURI === Se ? r.namespaceURI === z ? l === "svg" : r.namespaceURI === Ae ? l === "svg" && (p === "annotation-xml" || we[p]) : !!wt[l] : i.namespaceURI === Ae ? r.namespaceURI === z ? l === "math" : r.namespaceURI === Se ? l === "math" && xe[p] : !!xt[l] : i.namespaceURI === z ? r.namespaceURI === Se && !xe[p] || r.namespaceURI === Ae && !we[p] ? !1 : !xt[l] && (wi[l] || !wt[l]) : !!(oe === "application/xhtml+xml" && Ye[i.namespaceURI]) : !1;
  }, I = function(i) {
    de(t.removed, {
      element: i
    });
    try {
      be(i).removeChild(i);
    } catch {
      pi(i);
    }
  }, B = function(i, r) {
    try {
      de(t.removed, {
        attribute: r.getAttributeNode(i),
        from: r
      });
    } catch {
      de(t.removed, {
        attribute: null,
        from: r
      });
    }
    if (r.removeAttribute(i), i === "is")
      if (V || Te)
        try {
          I(r);
        } catch {
        }
      else
        try {
          r.setAttribute(i, "");
        } catch {
        }
  }, Ct = function(i) {
    let r = null, l = null;
    if (He)
      i = "<remove></remove>" + i;
    else {
      const h = Ke(i, /^[\r\n\t ]+/);
      l = h && h[0];
    }
    oe === "application/xhtml+xml" && J === z && (i = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + i + "</body></html>");
    const p = S ? S.createHTML(i) : i;
    if (J === z)
      try {
        r = new ci().parseFromString(p, oe);
      } catch {
      }
    if (!r || !r.documentElement) {
      r = Ie.createDocument(J, "template", null);
      try {
        r.documentElement.innerHTML = Be ? re : p;
      } catch {
      }
    }
    const E = r.body || r.documentElement;
    return i && l && E.insertBefore(a.createTextNode(l), E.childNodes[0] || null), J === z ? vi.call(r, W ? "html" : "body")[0] : W ? r.documentElement : E;
  }, kt = function(i) {
    return hi.call(
      i.ownerDocument || i,
      i,
      // eslint-disable-next-line no-bitwise
      ie.SHOW_ELEMENT | ie.SHOW_COMMENT | ie.SHOW_TEXT | ie.SHOW_PROCESSING_INSTRUCTION | ie.SHOW_CDATA_SECTION,
      null
    );
  }, qe = function(i) {
    return i instanceof di && (typeof i.nodeName != "string" || typeof i.textContent != "string" || typeof i.removeChild != "function" || !(i.attributes instanceof li) || typeof i.removeAttribute != "function" || typeof i.setAttribute != "function" || typeof i.namespaceURI != "string" || typeof i.insertBefore != "function" || typeof i.hasChildNodes != "function");
  }, $t = function(i) {
    return typeof Re == "function" && i instanceof Re;
  };
  function O(d, i, r) {
    Ce(d, (l) => {
      l.call(t, i, r, Q);
    });
  }
  const Dt = function(i) {
    let r = null;
    if (O(w.beforeSanitizeElements, i, null), qe(i))
      return I(i), !0;
    const l = b(i.nodeName);
    if (O(w.uponSanitizeElement, i, {
      tagName: l,
      allowedTags: _
    }), ye && i.hasChildNodes() && !$t(i.firstElementChild) && x(/<[/\w!]/g, i.innerHTML) && x(/<[/\w!]/g, i.textContent) || i.nodeType === me.progressingInstruction || ye && i.nodeType === me.comment && x(/<[/\w]/g, i.data))
      return I(i), !0;
    if (!(q.tagCheck instanceof Function && q.tagCheck(l)) && (!_[l] || se[l])) {
      if (!se[l] && Lt(l) && (f.tagNameCheck instanceof RegExp && x(f.tagNameCheck, l) || f.tagNameCheck instanceof Function && f.tagNameCheck(l)))
        return !1;
      if (Ge && !Z[l]) {
        const p = be(i) || i.parentNode, E = fi(i) || i.childNodes;
        if (E && p) {
          const h = E.length;
          for (let $ = h - 1; $ >= 0; --$) {
            const N = ui(E[$], !0);
            N.__removalCount = (i.__removalCount || 0) + 1, p.insertBefore(N, mi(i));
          }
        }
      }
      return I(i), !0;
    }
    return i instanceof ct && !$i(i) || (l === "noscript" || l === "noembed" || l === "noframes") && x(/<\/no(script|embed|frames)/i, i.innerHTML) ? (I(i), !0) : (X && i.nodeType === me.text && (r = i.textContent, Ce([ze, Oe, Ne], (p) => {
      r = ce(r, p, " ");
    }), i.textContent !== r && (de(t.removed, {
      element: i.cloneNode()
    }), i.textContent = r)), O(w.afterSanitizeElements, i, null), !1);
  }, Mt = function(i, r, l) {
    if (_t && (r === "id" || r === "name") && (l in a || l in ki))
      return !1;
    if (!(Fe && !Pe[r] && x(bi, r))) {
      if (!(ht && x(yi, r))) {
        if (!(q.attributeCheck instanceof Function && q.attributeCheck(r, i))) {
          if (!y[r] || Pe[r]) {
            if (
              // First condition does a very basic check if a) it's basically a valid custom element tagname AND
              // b) if the tagName passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              // and c) if the attribute name passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.attributeNameCheck
              !(Lt(i) && (f.tagNameCheck instanceof RegExp && x(f.tagNameCheck, i) || f.tagNameCheck instanceof Function && f.tagNameCheck(i)) && (f.attributeNameCheck instanceof RegExp && x(f.attributeNameCheck, r) || f.attributeNameCheck instanceof Function && f.attributeNameCheck(r, i)) || // Alternative, second condition checks if it's an `is`-attribute, AND
              // the value passes whatever the user has configured for CUSTOM_ELEMENT_HANDLING.tagNameCheck
              r === "is" && f.allowCustomizedBuiltInElements && (f.tagNameCheck instanceof RegExp && x(f.tagNameCheck, l) || f.tagNameCheck instanceof Function && f.tagNameCheck(l)))
            ) return !1;
          } else if (!We[r]) {
            if (!x(pt, ce(l, ut, ""))) {
              if (!((r === "src" || r === "xlink:href" || r === "href") && i !== "script" && Pi(l, "data:") === 0 && Tt[i])) {
                if (!(gt && !x(Ti, ce(l, ut, "")))) {
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
  }, Lt = function(i) {
    return i !== "annotation-xml" && Ke(i, Ei);
  }, Rt = function(i) {
    O(w.beforeSanitizeAttributes, i, null);
    const {
      attributes: r
    } = i;
    if (!r || qe(i))
      return;
    const l = {
      attrName: "",
      attrValue: "",
      keepAttr: !0,
      allowedAttributes: y,
      forceKeepAttr: void 0
    };
    let p = r.length;
    for (; p--; ) {
      const E = r[p], {
        name: h,
        namespaceURI: $,
        value: N
      } = E, ee = b(h), Xe = N;
      let T = h === "value" ? Xe : Fi(Xe);
      if (l.attrName = ee, l.attrValue = T, l.keepAttr = !0, l.forceKeepAttr = void 0, O(w.uponSanitizeAttribute, i, l), T = l.attrValue, bt && (ee === "id" || ee === "name") && (B(h, i), T = Ai + T), ye && x(/((--!?|])>)|<\/(style|title|textarea)/i, T)) {
        B(h, i);
        continue;
      }
      if (ee === "attributename" && Ke(T, "href")) {
        B(h, i);
        continue;
      }
      if (l.forceKeepAttr)
        continue;
      if (!l.keepAttr) {
        B(h, i);
        continue;
      }
      if (!vt && x(/\/>/i, T)) {
        B(h, i);
        continue;
      }
      X && Ce([ze, Oe, Ne], (zt) => {
        T = ce(T, zt, " ");
      });
      const It = b(i.nodeName);
      if (!Mt(It, ee, T)) {
        B(h, i);
        continue;
      }
      if (S && typeof _e == "object" && typeof _e.getAttributeType == "function" && !$)
        switch (_e.getAttributeType(It, ee)) {
          case "TrustedHTML": {
            T = S.createHTML(T);
            break;
          }
          case "TrustedScriptURL": {
            T = S.createScriptURL(T);
            break;
          }
        }
      if (T !== Xe)
        try {
          $ ? i.setAttributeNS($, h, T) : i.setAttribute(h, T), qe(i) ? I(i) : Ut(t.removed);
        } catch {
          B(h, i);
        }
    }
    O(w.afterSanitizeAttributes, i, null);
  }, Di = function d(i) {
    let r = null;
    const l = kt(i);
    for (O(w.beforeSanitizeShadowDOM, i, null); r = l.nextNode(); )
      O(w.uponSanitizeShadowNode, r, null), Dt(r), Rt(r), r.content instanceof u && d(r.content);
    O(w.afterSanitizeShadowDOM, i, null);
  };
  return t.sanitize = function(d) {
    let i = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, r = null, l = null, p = null, E = null;
    if (Be = !d, Be && (d = "<!-->"), typeof d != "string" && !$t(d))
      if (typeof d.toString == "function") {
        if (d = d.toString(), typeof d != "string")
          throw ue("dirty is not a string, aborting");
      } else
        throw ue("toString is not a function");
    if (!t.isSupported)
      return d;
    if (Ue || je(i), t.removed = [], typeof d == "string" && (ne = !1), ne) {
      if (d.nodeName) {
        const N = b(d.nodeName);
        if (!_[N] || se[N])
          throw ue("root node is forbidden and cannot be sanitized in-place");
      }
    } else if (d instanceof Re)
      r = Ct("<!---->"), l = r.ownerDocument.importNode(d, !0), l.nodeType === me.element && l.nodeName === "BODY" || l.nodeName === "HTML" ? r = l : r.appendChild(l);
    else {
      if (!V && !X && !W && // eslint-disable-next-line unicorn/prefer-includes
      d.indexOf("<") === -1)
        return S && Ee ? S.createHTML(d) : d;
      if (r = Ct(d), !r)
        return V ? null : Ee ? re : "";
    }
    r && He && I(r.firstChild);
    const h = kt(ne ? d : r);
    for (; p = h.nextNode(); )
      Dt(p), Rt(p), p.content instanceof u && Di(p.content);
    if (ne)
      return d;
    if (V) {
      if (Te)
        for (E = gi.call(r.ownerDocument); r.firstChild; )
          E.appendChild(r.firstChild);
      else
        E = r;
      return (y.shadowroot || y.shadowrootmode) && (E = _i.call(s, E, !0)), E;
    }
    let $ = W ? r.outerHTML : r.innerHTML;
    return W && _["!doctype"] && r.ownerDocument && r.ownerDocument.doctype && r.ownerDocument.doctype.name && x(ei, r.ownerDocument.doctype.name) && ($ = "<!DOCTYPE " + r.ownerDocument.doctype.name + `>
` + $), X && Ce([ze, Oe, Ne], (N) => {
      $ = ce($, N, " ");
    }), S && Ee ? S.createHTML($) : $;
  }, t.setConfig = function() {
    let d = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    je(d), Ue = !0;
  }, t.clearConfig = function() {
    Q = null, Ue = !1;
  }, t.isValidAttribute = function(d, i, r) {
    Q || je({});
    const l = b(d), p = b(i);
    return Mt(l, p, r);
  }, t.addHook = function(d, i) {
    typeof i == "function" && de(w[d], i);
  }, t.removeHook = function(d, i) {
    if (i !== void 0) {
      const r = Oi(w[d], i);
      return r === -1 ? void 0 : Ni(w[d], r, 1)[0];
    }
    return Ut(w[d]);
  }, t.removeHooks = function(d) {
    w[d] = [];
  }, t.removeAllHooks = function() {
    w = jt();
  }, t;
}
var ea = ti();
const ta = new Le("Merchello.Fulfillment.Modal", {
  modal: {
    type: "sidebar",
    size: "large"
  }
}), ia = new Le("Merchello.ShipmentEdit.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var aa = Object.defineProperty, ra = Object.getOwnPropertyDescriptor, ii = (e) => {
  throw TypeError(e);
}, ve = (e, t, a, s) => {
  for (var o = s > 1 ? void 0 : s ? ra(t, a) : t, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (o = (s ? v(t, a, o) : v(o)) || o);
  return s && o && aa(t, a, o), o;
}, ai = (e, t, a) => t.has(e) || ii("Cannot " + a), $e = (e, t, a) => (ai(e, t, "read from private field"), a ? a.call(e) : t.get(e)), qt = (e, t, a) => t.has(e) ? ii("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), Xt = (e, t, a, s) => (ai(e, t, "write to private field"), t.set(e, a), a), fe, he;
let j = class extends lt(st) {
  constructor() {
    super(), this._invoiceId = null, this._fulfillmentData = null, this._isLoading = !0, this._errorMessage = null, qt(this, fe), qt(this, he), this.consumeContext(Zt, (e) => {
      Xt(this, fe, e), this.observe($e(this, fe).order, (t) => {
        t?.id && t.id !== this._invoiceId && (this._invoiceId = t.id, this._loadShipments());
      });
    }), this.consumeContext(dt, (e) => {
      Xt(this, he, e);
    });
  }
  async _loadShipments() {
    if (!this._invoiceId) return;
    this._isLoading = !0, this._errorMessage = null;
    const { data: e, error: t } = await U.getFulfillmentSummary(this._invoiceId);
    t ? this._errorMessage = t.message : this._fulfillmentData = e ?? null, this._isLoading = !1;
  }
  async _handleEditShipment(e) {
    if (!$e(this, he)) return;
    (await $e(this, he).open(this, ia, {
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
    this._loadShipments(), this._invoiceId && $e(this, fe)?.load(this._invoiceId);
  }
  _renderShipmentCard(e, t) {
    const a = this._getCarrierClass(e.carrier);
    return n`
      <div class="shipment-card">
        <div class="shipment-header">
          <div class="header-left">
            ${e.carrier ? n`<span class="carrier-badge ${a}">${e.carrier}</span>` : n`<span class="carrier-badge">No carrier</span>`}
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
          ${e.trackingNumber ? n`
                <div class="detail-row">
                  <span class="label">Tracking:</span>
                  <span class="value tracking-value">
                    ${e.trackingUrl ? n`<a href="${e.trackingUrl}" target="_blank" rel="noopener"
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
          ${e.actualDeliveryDate ? n`
                <div class="detail-row">
                  <span class="label">Delivered:</span>
                  <span class="value delivered">${tt(e.actualDeliveryDate)}</span>
                </div>
              ` : m}
        </div>

        <div class="shipment-items">
          <h4>Items in shipment</h4>
          ${e.lineItems.map(
      (s) => n`
              <div class="item-row">
                <div class="item-image">
                  ${s.imageUrl ? n`<img src="${s.imageUrl}" alt="${s.name}" />` : n`<div class="placeholder-image"></div>`}
                </div>
                <div class="item-info">
                  <div class="item-name">${s.name || "Unknown item"}</div>
                  ${s.sku ? n`<div class="item-sku">${s.sku}</div>` : m}
                </div>
                <div class="item-qty">x${s.quantity}</div>
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
      return n`<div class="loading"><uui-loader></uui-loader></div>`;
    if (this._errorMessage)
      return n`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          ${this._errorMessage}
        </div>
      `;
    if (!this._fulfillmentData)
      return n`<div class="empty">No order data available</div>`;
    const e = [];
    for (const t of this._fulfillmentData.orders)
      for (const a of t.shipments)
        e.push({ shipment: a, warehouseName: t.warehouseName });
    return e.length === 0 ? n`
        <div class="empty-state">
          <uui-icon name="icon-box"></uui-icon>
          <h3>No shipments yet</h3>
          <p>Use the "Fulfil" button on the Details tab to create shipments for this order.</p>
        </div>
      ` : n`
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
j.styles = nt`
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
  g()
], j.prototype, "_invoiceId", 2);
ve([
  g()
], j.prototype, "_fulfillmentData", 2);
ve([
  g()
], j.prototype, "_isLoading", 2);
ve([
  g()
], j.prototype, "_errorMessage", 2);
j = ve([
  ot("merchello-shipments-view")
], j);
const sa = new Le("Merchello.ManualPayment.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
}), na = new Le("Merchello.Refund.Modal", {
  modal: {
    type: "sidebar",
    size: "small"
  }
});
var oa = Object.defineProperty, la = Object.getOwnPropertyDescriptor, ri = (e) => {
  throw TypeError(e);
}, te = (e, t, a, s) => {
  for (var o = s > 1 ? void 0 : s ? la(t, a) : t, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (o = (s ? v(t, a, o) : v(o)) || o);
  return s && o && oa(t, a, o), o;
}, si = (e, t, a) => t.has(e) || ri("Cannot " + a), De = (e, t, a) => (si(e, t, "read from private field"), t.get(e)), da = (e, t, a) => t.has(e) ? ri("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), ca = (e, t, a, s) => (si(e, t, "write to private field"), t.set(e, a), a), Y;
let G = class extends lt(st) {
  constructor() {
    super(), this.invoiceId = "", this._payments = [], this._status = null, this._isLoading = !0, this._errorMessage = null, da(this, Y), this.consumeContext(dt, (e) => {
      ca(this, Y, e);
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
    if (!De(this, Y) || !this._status) return;
    (await De(this, Y).open(this, sa, {
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
    if (!De(this, Y)) return;
    (await De(this, Y).open(this, na, {
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
    const t = e.paymentType === Pt.Refund || e.paymentType === Pt.PartialRefund;
    return n`
      <div class="payment-item ${t ? "refund" : ""}">
        <div class="payment-main">
          <div class="payment-info">
            <div class="payment-method">
              ${t ? n`<uui-icon name="icon-undo"></uui-icon>` : n`<uui-icon name="icon-credit-card"></uui-icon>`}
              <span>${e.paymentMethod ?? "Payment"}</span>
              ${e.paymentProviderAlias ? n`<span class="provider-badge">${e.paymentProviderAlias}</span>` : m}
            </div>
            <div class="payment-date">${tt(e.dateCreated)}</div>
            ${e.transactionId ? n`<div class="transaction-id">ID: ${e.transactionId}</div>` : m}
            ${e.description ? n`<div class="payment-description">${e.description}</div>` : m}
            ${e.refundReason ? n`<div class="refund-reason">Reason: ${e.refundReason}</div>` : m}
          </div>
          <div class="payment-amount ${t ? "negative" : ""}">
            ${t ? "-" : ""}${R(Math.abs(e.amount))}
          </div>
          <div class="payment-actions">
            ${!t && e.refundableAmount > 0 ? n`
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
        ${e.refunds && e.refunds.length > 0 ? n`
              <div class="refunds-list">
                ${e.refunds.map((a) => this._renderPayment(a))}
              </div>
            ` : m}
      </div>
    `;
  }
  render() {
    if (this._isLoading)
      return n`
        <div class="loading">
          <uui-loader></uui-loader>
        </div>
      `;
    if (this._errorMessage)
      return n`
        <div class="error">
          <uui-icon name="icon-alert"></uui-icon>
          <span>${this._errorMessage}</span>
        </div>
      `;
    const e = this._status;
    return n`
      <div class="payment-panel">
        <!-- Payment Status Summary -->
        <div class="status-summary">
          <div class="status-header">
            <span class="status-badge ${e ? this._getStatusBadgeClass(e.status) : "unpaid"}">
              ${e?.statusDisplay ?? "Unknown"}
            </span>
            ${e && e.balanceDue > 0 ? n`
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

          ${e ? n`
                <div class="status-details">
                  <div class="status-row">
                    <span>Invoice Total</span>
                    <span>${R(e.invoiceTotal)}</span>
                  </div>
                  <div class="status-row">
                    <span>Total Paid</span>
                    <span class="positive">${R(e.totalPaid)}</span>
                  </div>
                  ${e.totalRefunded > 0 ? n`
                        <div class="status-row">
                          <span>Total Refunded</span>
                          <span class="negative">-${R(e.totalRefunded)}</span>
                        </div>
                      ` : m}
                  <div class="status-row total">
                    <span>Balance Due</span>
                    <span class="${e.balanceDue > 0 ? "negative" : ""}">
                      ${R(e.balanceDue)}
                    </span>
                  </div>
                </div>
              ` : m}
        </div>

        <!-- Payments List -->
        <div class="payments-section">
          <h3>Payment History</h3>
          ${this._payments.length === 0 ? n`<p class="no-payments">No payments recorded yet.</p>` : n`
                <div class="payments-list">
                  ${this._payments.map((t) => this._renderPayment(t))}
                </div>
              `}
        </div>
      </div>
    `;
  }
};
Y = /* @__PURE__ */ new WeakMap();
G.styles = nt`
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
  Mi({ type: String })
], G.prototype, "invoiceId", 2);
te([
  g()
], G.prototype, "_payments", 2);
te([
  g()
], G.prototype, "_status", 2);
te([
  g()
], G.prototype, "_isLoading", 2);
te([
  g()
], G.prototype, "_errorMessage", 2);
G = te([
  ot("merchello-payment-panel")
], G);
var ua = Object.defineProperty, pa = Object.getOwnPropertyDescriptor, ni = (e) => {
  throw TypeError(e);
}, D = (e, t, a, s) => {
  for (var o = s > 1 ? void 0 : s ? pa(t, a) : t, u = e.length - 1, v; u >= 0; u--)
    (v = e[u]) && (o = (s ? v(t, a, o) : v(o)) || o);
  return s && o && ua(t, a, o), o;
}, oi = (e, t, a) => t.has(e) || ni("Cannot " + a), H = (e, t, a) => (oi(e, t, "read from private field"), t.get(e)), Vt = (e, t, a) => t.has(e) ? ni("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, a), Kt = (e, t, a, s) => (oi(e, t, "write to private field"), t.set(e, a), a), F, ge;
let A = class extends lt(st) {
  constructor() {
    super(), this._order = null, this._isLoading = !0, this._activeTab = "details", this._newNoteText = "", this._visibleToCustomer = !1, this._isPostingNote = !1, this._noteError = null, this._editingSection = null, this._editFormData = {}, this._isSavingAddress = !1, this._validationErrors = {}, this._countries = [], Vt(this, F), Vt(this, ge), this.consumeContext(Zt, (e) => {
      Kt(this, F, e), H(this, F) && this.observe(H(this, F).order, (t) => {
        this._order = t ?? null, this._isLoading = !t;
      });
    }), this.consumeContext(dt, (e) => {
      Kt(this, ge, e);
    }), this._loadCountries();
  }
  async _loadCountries() {
    const { data: e } = await U.getCountries();
    e && (this._countries = e);
  }
  async _openFulfillmentModal() {
    if (!this._order || !H(this, ge)) return;
    await H(this, ge).open(this, ta, {
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
    e.name && t.push(e.name), e.addressOne && t.push(e.addressOne), e.addressTwo && t.push(e.addressTwo);
    const a = [e.townCity, e.countyState, e.postalCode].filter(Boolean).join(" ");
    return a && t.push(a), e.country && t.push(e.country), e.phone && t.push(e.phone), t;
  }
  _renderMarkdown(e) {
    Ot.setOptions({ breaks: !0, gfm: !0 });
    const t = Ot.parse(e), a = ea.sanitize(t);
    return Li(a);
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
    } else this._editingSection === "shipping" ? e = await U.updateShippingAddress(this._order.id, this._editFormData) : e = await U.updateBillingAddress(this._order.id, this._editFormData);
    if (this._isSavingAddress = !1, e.error) {
      console.error("Failed to save address:", e.error);
      return;
    }
    this._editingSection = null, this._editFormData = {}, this._validationErrors = {}, H(this, F)?.load(this._order.id);
  }
  _updateFormField(e, t) {
    if (this._editFormData = { ...this._editFormData, [e]: t || null }, this._validationErrors[e]) {
      const { [e]: a, ...s } = this._validationErrors;
      this._validationErrors = s;
    }
  }
  _renderInput(e, t, a, s = "text") {
    const o = !!this._validationErrors[e];
    return n`
      <div class="form-field ${o ? "has-error" : ""}">
        <uui-input
          type=${s}
          label=${t}
          placeholder=${a}
          .value=${this._editFormData[e] || ""}
          @input=${(u) => this._updateFormField(e, u.target.value)}
        ></uui-input>
        ${o ? n`<span class="field-error">${this._validationErrors[e]}</span>` : m}
      </div>
    `;
  }
  _renderCountrySelect() {
    const e = !!this._validationErrors.countryCode;
    return n`
      <div class="form-field ${e ? "has-error" : ""}">
        <uui-select
          label="Country"
          placeholder="Select country"
          .value=${this._editFormData.countryCode || ""}
          @change=${(t) => {
      const a = t.target, s = this._countries.find((o) => o.code === a.value);
      if (this._editFormData = {
        ...this._editFormData,
        countryCode: a.value || null,
        country: s?.name || null
      }, this._validationErrors.countryCode) {
        const { countryCode: o, ...u } = this._validationErrors;
        this._validationErrors = u;
      }
    }}
        >
          <option value="">Select country...</option>
          ${this._countries.map((t) => n`
            <option value=${t.code} ?selected=${this._editFormData.countryCode === t.code}>${t.name}</option>
          `)}
        </uui-select>
        ${e ? n`<span class="field-error">${this._validationErrors.countryCode}</span>` : m}
      </div>
    `;
  }
  _renderFulfillmentCard(e) {
    const t = this._getStatusLabel(e.status), a = this._order?.fulfillmentStatus === "Fulfilled", s = e.status >= 50 ? "shipped" : "unfulfilled";
    return n`
      <div class="card fulfillment-card">
        <div class="card-header">
          <span class="status-badge ${s}">${t}</span>
          <span class="shipping-method">${e.deliveryMethod}</span>
        </div>
        <div class="line-items">
          ${e.lineItems.map(
      (o) => n`
              <div class="line-item">
                <div class="item-image">
                  ${o.imageUrl ? n`<img src="${o.imageUrl}" alt="${o.name}" />` : n`<div class="placeholder-image"></div>`}
                </div>
                <div class="item-details">
                  <div class="item-name">${o.name}</div>
                  <div class="item-sku">${o.sku}</div>
                </div>
                <div class="item-price">${R(o.amount)} x ${o.quantity}</div>
                <div class="item-total">${R(o.amount * o.quantity)}</div>
              </div>
            `
    )}
        </div>
        <div class="card-footer">
          <uui-button
            look="${a ? "secondary" : "primary"}"
            label="${a ? "Fulfilled" : "Fulfil"}"
            ?disabled=${a}
            @click=${a ? m : this._openFulfillmentModal}
          >
            ${a ? "Fulfilled" : "Fulfil"}
          </uui-button>
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
    return n`<div class="loading"><uui-loader></uui-loader></div>`;
  }
  _renderNotFoundState() {
    return n`<div class="error">Order not found</div>`;
  }
  render() {
    if (this._isLoading)
      return this._renderLoadingState();
    if (!this._order)
      return this._renderNotFoundState();
    const e = this._order;
    return n`
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
          ${Nt(e.dateCreated)} from ${e.channel}
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
        ${this._activeTab === "shipments" ? n`<merchello-shipments-view></merchello-shipments-view>` : this._activeTab === "payments" ? n`
              <merchello-payment-panel
                invoiceId=${e.id}
                @payment-recorded=${this._handlePaymentChange}
                @refund-processed=${this._handlePaymentChange}
              ></merchello-payment-panel>
            ` : n`
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
                  <span>${e.orders.reduce((t, a) => t + a.lineItems.reduce((s, o) => s + o.quantity, 0), 0)} items</span>
                  <span>${R(e.subTotal)}</span>
                </div>
                <div class="summary-row">
                  <span>Shipping</span>
                  <span>${e.orders[0]?.deliveryMethod || "Standard"}</span>
                  <span>${R(e.shippingCost)}</span>
                </div>
                <div class="summary-row total">
                  <span>Total</span>
                  <span></span>
                  <span>${R(e.total)}</span>
                </div>
                <div class="summary-row">
                  <span>Paid</span>
                  <span></span>
                  <span>${R(e.amountPaid)}</span>
                </div>
              </div>
            </div>

            <!-- Timeline -->
            <div class="card timeline-card">
              <h3>Timeline</h3>
              <div class="timeline-input">
                <textarea
                  placeholder="Leave a comment..."
                  .value=${this._newNoteText}
                  @input=${(t) => {
      this._newNoteText = t.target.value, this._noteError = null;
    }}
                  rows="2"
                ></textarea>
                <div class="timeline-actions">
                  <label class="customer-visible-checkbox">
                    <input
                      type="checkbox"
                      .checked=${this._visibleToCustomer}
                      @change=${(t) => this._visibleToCustomer = t.target.checked}
                    />
                    Visible to customer
                  </label>
                  <uui-button
                    look="primary"
                    label="Post"
                    ?disabled=${!this._newNoteText.trim() || this._isPostingNote}
                    @click=${this._handlePostNote}
                  >
                    ${this._isPostingNote ? "Posting..." : "Post"}
                  </uui-button>
                </div>
                ${this._noteError ? n`<div class="note-error">${this._noteError}</div>` : m}
              </div>
              <div class="timeline-events">
                ${e.notes.length === 0 ? n`<div class="no-notes">No timeline events yet</div>` : [...e.notes].sort((t, a) => new Date(a.date).getTime() - new Date(t.date).getTime()).map(
      (t) => n`
                          <div class="timeline-event ${t.visibleToCustomer ? "customer-visible" : ""}">
                            ${t.visibleToCustomer ? n`<span class="customer-badge">Customer visible</span>` : m}
                            <div class="event-time">${Nt(t.date)}</div>
                            <div class="event-text markdown-content">${this._renderMarkdown(t.text)}</div>
                            ${t.author ? n`<div class="event-author">by ${t.author}</div>` : m}
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
                <div class="muted">1 order</div>
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Contact information</span>
                  ${this._editingSection !== "contact" ? n`
                    <button class="edit-btn" title="Edit" @click=${() => this._startEditing("contact")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </button>
                  ` : m}
                </div>
                ${this._editingSection === "contact" ? n`
                  <div class="edit-form">
                    ${this._renderInput("email", "Email", "Email address", "email")}
                    <div class="edit-actions">
                      <uui-button look="secondary" label="Cancel" @click=${this._cancelEditing} ?disabled=${this._isSavingAddress}>Cancel</uui-button>
                      <uui-button look="primary" label="Save" @click=${this._saveEditing} ?disabled=${this._isSavingAddress}>
                        ${this._isSavingAddress ? "Saving..." : "Save"}
                      </uui-button>
                    </div>
                  </div>
                ` : n`
                  ${e.billingAddress?.email ? n`<a href="mailto:${e.billingAddress.email}">${e.billingAddress.email}</a>` : n`<span class="muted">No email</span>`}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Shipping address</span>
                  ${this._editingSection !== "shipping" ? n`
                    <button class="edit-btn" title="Edit" @click=${() => this._startEditing("shipping")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </button>
                  ` : m}
                </div>
                ${this._editingSection === "shipping" ? n`
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
                ` : n`
                  <div class="address">
                    ${this._formatAddress(e.shippingAddress).map((t) => n`<div>${t}</div>`)}
                  </div>
                  ${this._getGoogleMapsUrl(e.shippingAddress) ? n`<a href=${this._getGoogleMapsUrl(e.shippingAddress)} target="_blank" rel="noopener noreferrer" class="view-map">View map</a>` : m}
                `}
              </div>
              <div class="section">
                <div class="section-header">
                  <span>Billing address</span>
                  ${this._editingSection !== "billing" ? n`
                    <button class="edit-btn" title="Edit" @click=${() => this._startEditing("billing")}>
                      <uui-icon name="icon-edit"></uui-icon>
                    </button>
                  ` : m}
                </div>
                ${this._editingSection === "billing" ? n`
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
                ` : n`
                  ${e.billingAddress === e.shippingAddress ? n`<span class="muted">Same as shipping address</span>` : n`
                        <div class="address">
                          ${this._formatAddress(e.billingAddress).map((t) => n`<div>${t}</div>`)}
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
A.styles = nt`
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

    .timeline-input {
      margin-bottom: var(--uui-size-space-4);
    }

    .timeline-input textarea {
      width: 100%;
      padding: var(--uui-size-space-2);
      border: 1px solid var(--uui-color-border);
      border-radius: var(--uui-border-radius);
      margin-bottom: var(--uui-size-space-2);
      box-sizing: border-box;
      resize: vertical;
      font-family: inherit;
      font-size: inherit;
    }

    .timeline-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--uui-size-space-2);
    }

    .customer-visible-checkbox {
      display: flex;
      align-items: center;
      gap: var(--uui-size-space-1);
      font-size: 0.875rem;
      color: var(--uui-color-text-alt);
      cursor: pointer;
    }

    .customer-visible-checkbox input {
      cursor: pointer;
    }

    .note-error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: var(--uui-size-space-2);
    }

    .timeline-events {
      border-top: 1px solid var(--uui-color-border);
      padding-top: var(--uui-size-space-3);
    }

    .timeline-event {
      padding: var(--uui-size-space-2) 0;
      border-bottom: 1px solid var(--uui-color-border);
    }

    .timeline-event.customer-visible {
      background: #e8f4fd;
      border-left: 3px solid #0078d4;
      padding-left: var(--uui-size-space-3);
      margin-left: calc(-1 * var(--uui-size-space-2));
      padding-right: var(--uui-size-space-2);
    }

    .customer-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 500;
      color: #0078d4;
      background: #cce5ff;
      padding: 2px 6px;
      border-radius: 10px;
      margin-bottom: var(--uui-size-space-1);
    }

    .event-time {
      font-size: 0.75rem;
      color: var(--uui-color-text-alt);
    }

    .no-notes {
      color: var(--uui-color-text-alt);
      font-style: italic;
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
D([
  g()
], A.prototype, "_order", 2);
D([
  g()
], A.prototype, "_isLoading", 2);
D([
  g()
], A.prototype, "_activeTab", 2);
D([
  g()
], A.prototype, "_newNoteText", 2);
D([
  g()
], A.prototype, "_visibleToCustomer", 2);
D([
  g()
], A.prototype, "_isPostingNote", 2);
D([
  g()
], A.prototype, "_noteError", 2);
D([
  g()
], A.prototype, "_editingSection", 2);
D([
  g()
], A.prototype, "_editFormData", 2);
D([
  g()
], A.prototype, "_isSavingAddress", 2);
D([
  g()
], A.prototype, "_validationErrors", 2);
D([
  g()
], A.prototype, "_countries", 2);
A = D([
  ot("merchello-order-detail")
], A);
const Ta = A;
export {
  A as MerchelloOrderDetailElement,
  Ta as default
};
//# sourceMappingURL=order-detail.element-DKqMRato.js.map
