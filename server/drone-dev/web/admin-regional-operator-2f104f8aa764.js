import { createRegionalExecutionControls } from "/operator-sim-controls.js?v=20261025";
var dc = { exports: {} }, Te = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Eo;
function av() {
  if (Eo) return Te;
  Eo = 1;
  var _ = Symbol.for("react.transitional.element"), O = Symbol.for("react.fragment");
  function N(m, j, B) {
    var C = null;
    if (B !== void 0 && (C = "" + B), j.key !== void 0 && (C = "" + j.key), "key" in j) {
      B = {};
      for (var el in j)
        el !== "key" && (B[el] = j[el]);
    } else B = j;
    return j = B.ref, {
      $$typeof: _,
      type: m,
      key: C,
      ref: j !== void 0 ? j : null,
      props: B
    };
  }
  return Te.Fragment = O, Te.jsx = N, Te.jsxs = N, Te;
}
var To;
function uv() {
  return To || (To = 1, dc.exports = av()), dc.exports;
}
var M = uv(), oc = { exports: {} }, ze = {}, mc = { exports: {} }, yc = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var zo;
function ev() {
  return zo || (zo = 1, (function(_) {
    function O(E, U) {
      var X = E.length;
      E.push(U);
      l: for (; 0 < X; ) {
        var fl = X - 1 >>> 1, dl = E[fl];
        if (0 < j(dl, U))
          E[fl] = U, E[X] = dl, X = fl;
        else break l;
      }
    }
    function N(E) {
      return E.length === 0 ? null : E[0];
    }
    function m(E) {
      if (E.length === 0) return null;
      var U = E[0], X = E.pop();
      if (X !== U) {
        E[0] = X;
        l: for (var fl = 0, dl = E.length, c = dl >>> 1; fl < c; ) {
          var g = 2 * (fl + 1) - 1, p = E[g], D = g + 1, G = E[D];
          if (0 > j(p, X))
            D < dl && 0 > j(G, p) ? (E[fl] = G, E[D] = X, fl = D) : (E[fl] = p, E[g] = X, fl = g);
          else if (D < dl && 0 > j(G, X))
            E[fl] = G, E[D] = X, fl = D;
          else break l;
        }
      }
      return U;
    }
    function j(E, U) {
      var X = E.sortIndex - U.sortIndex;
      return X !== 0 ? X : E.id - U.id;
    }
    if (_.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var B = performance;
      _.unstable_now = function() {
        return B.now();
      };
    } else {
      var C = Date, el = C.now();
      _.unstable_now = function() {
        return C.now() - el;
      };
    }
    var z = [], S = [], x = 1, H = null, V = 3, ol = !1, I = !1, sl = !1, Ml = !1, W = typeof setTimeout == "function" ? setTimeout : null, Dl = typeof clearTimeout == "function" ? clearTimeout : null, Q = typeof setImmediate < "u" ? setImmediate : null;
    function ml(E) {
      for (var U = N(S); U !== null; ) {
        if (U.callback === null) m(S);
        else if (U.startTime <= E)
          m(S), U.sortIndex = U.expirationTime, O(z, U);
        else break;
        U = N(S);
      }
    }
    function Ul(E) {
      if (sl = !1, ml(E), !I)
        if (N(z) !== null)
          I = !0, hl || (hl = !0, Zl());
        else {
          var U = N(S);
          U !== null && al(Ul, U.startTime - E);
        }
    }
    var hl = !1, $ = -1, Nl = 5, Xl = -1;
    function ut() {
      return Ml ? !0 : !(_.unstable_now() - Xl < Nl);
    }
    function et() {
      if (Ml = !1, hl) {
        var E = _.unstable_now();
        Xl = E;
        var U = !0;
        try {
          l: {
            I = !1, sl && (sl = !1, Dl($), $ = -1), ol = !0;
            var X = V;
            try {
              t: {
                for (ml(E), H = N(z); H !== null && !(H.expirationTime > E && ut()); ) {
                  var fl = H.callback;
                  if (typeof fl == "function") {
                    H.callback = null, V = H.priorityLevel;
                    var dl = fl(
                      H.expirationTime <= E
                    );
                    if (E = _.unstable_now(), typeof dl == "function") {
                      H.callback = dl, ml(E), U = !0;
                      break t;
                    }
                    H === N(z) && m(z), ml(E);
                  } else m(z);
                  H = N(z);
                }
                if (H !== null) U = !0;
                else {
                  var c = N(S);
                  c !== null && al(
                    Ul,
                    c.startTime - E
                  ), U = !1;
                }
              }
              break l;
            } finally {
              H = null, V = X, ol = !1;
            }
            U = void 0;
          }
        } finally {
          U ? Zl() : hl = !1;
        }
      }
    }
    var Zl;
    if (typeof Q == "function")
      Zl = function() {
        Q(et);
      };
    else if (typeof MessageChannel < "u") {
      var Nt = new MessageChannel(), Mt = Nt.port2;
      Nt.port1.onmessage = et, Zl = function() {
        Mt.postMessage(null);
      };
    } else
      Zl = function() {
        W(et, 0);
      };
    function al(E, U) {
      $ = W(function() {
        E(_.unstable_now());
      }, U);
    }
    _.unstable_IdlePriority = 5, _.unstable_ImmediatePriority = 1, _.unstable_LowPriority = 4, _.unstable_NormalPriority = 3, _.unstable_Profiling = null, _.unstable_UserBlockingPriority = 2, _.unstable_cancelCallback = function(E) {
      E.callback = null;
    }, _.unstable_forceFrameRate = function(E) {
      0 > E || 125 < E ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : Nl = 0 < E ? Math.floor(1e3 / E) : 5;
    }, _.unstable_getCurrentPriorityLevel = function() {
      return V;
    }, _.unstable_next = function(E) {
      switch (V) {
        case 1:
        case 2:
        case 3:
          var U = 3;
          break;
        default:
          U = V;
      }
      var X = V;
      V = U;
      try {
        return E();
      } finally {
        V = X;
      }
    }, _.unstable_requestPaint = function() {
      Ml = !0;
    }, _.unstable_runWithPriority = function(E, U) {
      switch (E) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          E = 3;
      }
      var X = V;
      V = E;
      try {
        return U();
      } finally {
        V = X;
      }
    }, _.unstable_scheduleCallback = function(E, U, X) {
      var fl = _.unstable_now();
      switch (typeof X == "object" && X !== null ? (X = X.delay, X = typeof X == "number" && 0 < X ? fl + X : fl) : X = fl, E) {
        case 1:
          var dl = -1;
          break;
        case 2:
          dl = 250;
          break;
        case 5:
          dl = 1073741823;
          break;
        case 4:
          dl = 1e4;
          break;
        default:
          dl = 5e3;
      }
      return dl = X + dl, E = {
        id: x++,
        callback: U,
        priorityLevel: E,
        startTime: X,
        expirationTime: dl,
        sortIndex: -1
      }, X > fl ? (E.sortIndex = X, O(S, E), N(z) === null && E === N(S) && (sl ? (Dl($), $ = -1) : sl = !0, al(Ul, X - fl))) : (E.sortIndex = dl, O(z, E), I || ol || (I = !0, hl || (hl = !0, Zl()))), E;
    }, _.unstable_shouldYield = ut, _.unstable_wrapCallback = function(E) {
      var U = V;
      return function() {
        var X = V;
        V = U;
        try {
          return E.apply(this, arguments);
        } finally {
          V = X;
        }
      };
    };
  })(yc)), yc;
}
var Ao;
function nv() {
  return Ao || (Ao = 1, mc.exports = ev()), mc.exports;
}
var vc = { exports: {} }, K = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var _o;
function iv() {
  if (_o) return K;
  _o = 1;
  var _ = Symbol.for("react.transitional.element"), O = Symbol.for("react.portal"), N = Symbol.for("react.fragment"), m = Symbol.for("react.strict_mode"), j = Symbol.for("react.profiler"), B = Symbol.for("react.consumer"), C = Symbol.for("react.context"), el = Symbol.for("react.forward_ref"), z = Symbol.for("react.suspense"), S = Symbol.for("react.memo"), x = Symbol.for("react.lazy"), H = Symbol.for("react.activity"), V = Symbol.iterator;
  function ol(c) {
    return c === null || typeof c != "object" ? null : (c = V && c[V] || c["@@iterator"], typeof c == "function" ? c : null);
  }
  var I = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, sl = Object.assign, Ml = {};
  function W(c, g, p) {
    this.props = c, this.context = g, this.refs = Ml, this.updater = p || I;
  }
  W.prototype.isReactComponent = {}, W.prototype.setState = function(c, g) {
    if (typeof c != "object" && typeof c != "function" && c != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, c, g, "setState");
  }, W.prototype.forceUpdate = function(c) {
    this.updater.enqueueForceUpdate(this, c, "forceUpdate");
  };
  function Dl() {
  }
  Dl.prototype = W.prototype;
  function Q(c, g, p) {
    this.props = c, this.context = g, this.refs = Ml, this.updater = p || I;
  }
  var ml = Q.prototype = new Dl();
  ml.constructor = Q, sl(ml, W.prototype), ml.isPureReactComponent = !0;
  var Ul = Array.isArray;
  function hl() {
  }
  var $ = { H: null, A: null, T: null, S: null }, Nl = Object.prototype.hasOwnProperty;
  function Xl(c, g, p) {
    var D = p.ref;
    return {
      $$typeof: _,
      type: c,
      key: g,
      ref: D !== void 0 ? D : null,
      props: p
    };
  }
  function ut(c, g) {
    return Xl(c.type, g, c.props);
  }
  function et(c) {
    return typeof c == "object" && c !== null && c.$$typeof === _;
  }
  function Zl(c) {
    var g = { "=": "=0", ":": "=2" };
    return "$" + c.replace(/[=:]/g, function(p) {
      return g[p];
    });
  }
  var Nt = /\/+/g;
  function Mt(c, g) {
    return typeof c == "object" && c !== null && c.key != null ? Zl("" + c.key) : g.toString(36);
  }
  function al(c) {
    switch (c.status) {
      case "fulfilled":
        return c.value;
      case "rejected":
        throw c.reason;
      default:
        switch (typeof c.status == "string" ? c.then(hl, hl) : (c.status = "pending", c.then(
          function(g) {
            c.status === "pending" && (c.status = "fulfilled", c.value = g);
          },
          function(g) {
            c.status === "pending" && (c.status = "rejected", c.reason = g);
          }
        )), c.status) {
          case "fulfilled":
            return c.value;
          case "rejected":
            throw c.reason;
        }
    }
    throw c;
  }
  function E(c, g, p, D, G) {
    var L = typeof c;
    (L === "undefined" || L === "boolean") && (c = null);
    var P = !1;
    if (c === null) P = !0;
    else
      switch (L) {
        case "bigint":
        case "string":
        case "number":
          P = !0;
          break;
        case "object":
          switch (c.$$typeof) {
            case _:
            case O:
              P = !0;
              break;
            case x:
              return P = c._init, E(
                P(c._payload),
                g,
                p,
                D,
                G
              );
          }
      }
    if (P)
      return G = G(c), P = D === "" ? "." + Mt(c, 0) : D, Ul(G) ? (p = "", P != null && (p = P.replace(Nt, "$&/") + "/"), E(G, g, p, "", function(Du) {
        return Du;
      })) : G != null && (et(G) && (G = ut(
        G,
        p + (G.key == null || c && c.key === G.key ? "" : ("" + G.key).replace(
          Nt,
          "$&/"
        ) + "/") + P
      )), g.push(G)), 1;
    P = 0;
    var _l = D === "" ? "." : D + ":";
    if (Ul(c))
      for (var Rl = 0; Rl < c.length; Rl++)
        D = c[Rl], L = _l + Mt(D, Rl), P += E(
          D,
          g,
          p,
          L,
          G
        );
    else if (Rl = ol(c), typeof Rl == "function")
      for (c = Rl.call(c), Rl = 0; !(D = c.next()).done; )
        D = D.value, L = _l + Mt(D, Rl++), P += E(
          D,
          g,
          p,
          L,
          G
        );
    else if (L === "object") {
      if (typeof c.then == "function")
        return E(
          al(c),
          g,
          p,
          D,
          G
        );
      throw g = String(c), Error(
        "Objects are not valid as a React child (found: " + (g === "[object Object]" ? "object with keys {" + Object.keys(c).join(", ") + "}" : g) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return P;
  }
  function U(c, g, p) {
    if (c == null) return c;
    var D = [], G = 0;
    return E(c, D, "", "", function(L) {
      return g.call(p, L, G++);
    }), D;
  }
  function X(c) {
    if (c._status === -1) {
      var g = c._result;
      g = g(), g.then(
        function(p) {
          (c._status === 0 || c._status === -1) && (c._status = 1, c._result = p);
        },
        function(p) {
          (c._status === 0 || c._status === -1) && (c._status = 2, c._result = p);
        }
      ), c._status === -1 && (c._status = 0, c._result = g);
    }
    if (c._status === 1) return c._result.default;
    throw c._result;
  }
  var fl = typeof reportError == "function" ? reportError : function(c) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var g = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof c == "object" && c !== null && typeof c.message == "string" ? String(c.message) : String(c),
        error: c
      });
      if (!window.dispatchEvent(g)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", c);
      return;
    }
    console.error(c);
  }, dl = {
    map: U,
    forEach: function(c, g, p) {
      U(
        c,
        function() {
          g.apply(this, arguments);
        },
        p
      );
    },
    count: function(c) {
      var g = 0;
      return U(c, function() {
        g++;
      }), g;
    },
    toArray: function(c) {
      return U(c, function(g) {
        return g;
      }) || [];
    },
    only: function(c) {
      if (!et(c))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return c;
    }
  };
  return K.Activity = H, K.Children = dl, K.Component = W, K.Fragment = N, K.Profiler = j, K.PureComponent = Q, K.StrictMode = m, K.Suspense = z, K.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = $, K.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(c) {
      return $.H.useMemoCache(c);
    }
  }, K.cache = function(c) {
    return function() {
      return c.apply(null, arguments);
    };
  }, K.cacheSignal = function() {
    return null;
  }, K.cloneElement = function(c, g, p) {
    if (c == null)
      throw Error(
        "The argument must be a React element, but you passed " + c + "."
      );
    var D = sl({}, c.props), G = c.key;
    if (g != null)
      for (L in g.key !== void 0 && (G = "" + g.key), g)
        !Nl.call(g, L) || L === "key" || L === "__self" || L === "__source" || L === "ref" && g.ref === void 0 || (D[L] = g[L]);
    var L = arguments.length - 2;
    if (L === 1) D.children = p;
    else if (1 < L) {
      for (var P = Array(L), _l = 0; _l < L; _l++)
        P[_l] = arguments[_l + 2];
      D.children = P;
    }
    return Xl(c.type, G, D);
  }, K.createContext = function(c) {
    return c = {
      $$typeof: C,
      _currentValue: c,
      _currentValue2: c,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, c.Provider = c, c.Consumer = {
      $$typeof: B,
      _context: c
    }, c;
  }, K.createElement = function(c, g, p) {
    var D, G = {}, L = null;
    if (g != null)
      for (D in g.key !== void 0 && (L = "" + g.key), g)
        Nl.call(g, D) && D !== "key" && D !== "__self" && D !== "__source" && (G[D] = g[D]);
    var P = arguments.length - 2;
    if (P === 1) G.children = p;
    else if (1 < P) {
      for (var _l = Array(P), Rl = 0; Rl < P; Rl++)
        _l[Rl] = arguments[Rl + 2];
      G.children = _l;
    }
    if (c && c.defaultProps)
      for (D in P = c.defaultProps, P)
        G[D] === void 0 && (G[D] = P[D]);
    return Xl(c, L, G);
  }, K.createRef = function() {
    return { current: null };
  }, K.forwardRef = function(c) {
    return { $$typeof: el, render: c };
  }, K.isValidElement = et, K.lazy = function(c) {
    return {
      $$typeof: x,
      _payload: { _status: -1, _result: c },
      _init: X
    };
  }, K.memo = function(c, g) {
    return {
      $$typeof: S,
      type: c,
      compare: g === void 0 ? null : g
    };
  }, K.startTransition = function(c) {
    var g = $.T, p = {};
    $.T = p;
    try {
      var D = c(), G = $.S;
      G !== null && G(p, D), typeof D == "object" && D !== null && typeof D.then == "function" && D.then(hl, fl);
    } catch (L) {
      fl(L);
    } finally {
      g !== null && p.types !== null && (g.types = p.types), $.T = g;
    }
  }, K.unstable_useCacheRefresh = function() {
    return $.H.useCacheRefresh();
  }, K.use = function(c) {
    return $.H.use(c);
  }, K.useActionState = function(c, g, p) {
    return $.H.useActionState(c, g, p);
  }, K.useCallback = function(c, g) {
    return $.H.useCallback(c, g);
  }, K.useContext = function(c) {
    return $.H.useContext(c);
  }, K.useDebugValue = function() {
  }, K.useDeferredValue = function(c, g) {
    return $.H.useDeferredValue(c, g);
  }, K.useEffect = function(c, g) {
    return $.H.useEffect(c, g);
  }, K.useEffectEvent = function(c) {
    return $.H.useEffectEvent(c);
  }, K.useId = function() {
    return $.H.useId();
  }, K.useImperativeHandle = function(c, g, p) {
    return $.H.useImperativeHandle(c, g, p);
  }, K.useInsertionEffect = function(c, g) {
    return $.H.useInsertionEffect(c, g);
  }, K.useLayoutEffect = function(c, g) {
    return $.H.useLayoutEffect(c, g);
  }, K.useMemo = function(c, g) {
    return $.H.useMemo(c, g);
  }, K.useOptimistic = function(c, g) {
    return $.H.useOptimistic(c, g);
  }, K.useReducer = function(c, g, p) {
    return $.H.useReducer(c, g, p);
  }, K.useRef = function(c) {
    return $.H.useRef(c);
  }, K.useState = function(c) {
    return $.H.useState(c);
  }, K.useSyncExternalStore = function(c, g, p) {
    return $.H.useSyncExternalStore(
      c,
      g,
      p
    );
  }, K.useTransition = function() {
    return $.H.useTransition();
  }, K.version = "19.2.0", K;
}
var Mo;
function Sc() {
  return Mo || (Mo = 1, vc.exports = iv()), vc.exports;
}
var hc = { exports: {} }, Wl = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var po;
function fv() {
  if (po) return Wl;
  po = 1;
  var _ = Sc();
  function O(z) {
    var S = "https://react.dev/errors/" + z;
    if (1 < arguments.length) {
      S += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var x = 2; x < arguments.length; x++)
        S += "&args[]=" + encodeURIComponent(arguments[x]);
    }
    return "Minified React error #" + z + "; visit " + S + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function N() {
  }
  var m = {
    d: {
      f: N,
      r: function() {
        throw Error(O(522));
      },
      D: N,
      C: N,
      L: N,
      m: N,
      X: N,
      S: N,
      M: N
    },
    p: 0,
    findDOMNode: null
  }, j = Symbol.for("react.portal");
  function B(z, S, x) {
    var H = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: j,
      key: H == null ? null : "" + H,
      children: z,
      containerInfo: S,
      implementation: x
    };
  }
  var C = _.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function el(z, S) {
    if (z === "font") return "";
    if (typeof S == "string")
      return S === "use-credentials" ? S : "";
  }
  return Wl.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = m, Wl.createPortal = function(z, S) {
    var x = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!S || S.nodeType !== 1 && S.nodeType !== 9 && S.nodeType !== 11)
      throw Error(O(299));
    return B(z, S, null, x);
  }, Wl.flushSync = function(z) {
    var S = C.T, x = m.p;
    try {
      if (C.T = null, m.p = 2, z) return z();
    } finally {
      C.T = S, m.p = x, m.d.f();
    }
  }, Wl.preconnect = function(z, S) {
    typeof z == "string" && (S ? (S = S.crossOrigin, S = typeof S == "string" ? S === "use-credentials" ? S : "" : void 0) : S = null, m.d.C(z, S));
  }, Wl.prefetchDNS = function(z) {
    typeof z == "string" && m.d.D(z);
  }, Wl.preinit = function(z, S) {
    if (typeof z == "string" && S && typeof S.as == "string") {
      var x = S.as, H = el(x, S.crossOrigin), V = typeof S.integrity == "string" ? S.integrity : void 0, ol = typeof S.fetchPriority == "string" ? S.fetchPriority : void 0;
      x === "style" ? m.d.S(
        z,
        typeof S.precedence == "string" ? S.precedence : void 0,
        {
          crossOrigin: H,
          integrity: V,
          fetchPriority: ol
        }
      ) : x === "script" && m.d.X(z, {
        crossOrigin: H,
        integrity: V,
        fetchPriority: ol,
        nonce: typeof S.nonce == "string" ? S.nonce : void 0
      });
    }
  }, Wl.preinitModule = function(z, S) {
    if (typeof z == "string")
      if (typeof S == "object" && S !== null) {
        if (S.as == null || S.as === "script") {
          var x = el(
            S.as,
            S.crossOrigin
          );
          m.d.M(z, {
            crossOrigin: x,
            integrity: typeof S.integrity == "string" ? S.integrity : void 0,
            nonce: typeof S.nonce == "string" ? S.nonce : void 0
          });
        }
      } else S == null && m.d.M(z);
  }, Wl.preload = function(z, S) {
    if (typeof z == "string" && typeof S == "object" && S !== null && typeof S.as == "string") {
      var x = S.as, H = el(x, S.crossOrigin);
      m.d.L(z, x, {
        crossOrigin: H,
        integrity: typeof S.integrity == "string" ? S.integrity : void 0,
        nonce: typeof S.nonce == "string" ? S.nonce : void 0,
        type: typeof S.type == "string" ? S.type : void 0,
        fetchPriority: typeof S.fetchPriority == "string" ? S.fetchPriority : void 0,
        referrerPolicy: typeof S.referrerPolicy == "string" ? S.referrerPolicy : void 0,
        imageSrcSet: typeof S.imageSrcSet == "string" ? S.imageSrcSet : void 0,
        imageSizes: typeof S.imageSizes == "string" ? S.imageSizes : void 0,
        media: typeof S.media == "string" ? S.media : void 0
      });
    }
  }, Wl.preloadModule = function(z, S) {
    if (typeof z == "string")
      if (S) {
        var x = el(S.as, S.crossOrigin);
        m.d.m(z, {
          as: typeof S.as == "string" && S.as !== "script" ? S.as : void 0,
          crossOrigin: x,
          integrity: typeof S.integrity == "string" ? S.integrity : void 0
        });
      } else m.d.m(z);
  }, Wl.requestFormReset = function(z) {
    m.d.r(z);
  }, Wl.unstable_batchedUpdates = function(z, S) {
    return z(S);
  }, Wl.useFormState = function(z, S, x) {
    return C.H.useFormState(z, S, x);
  }, Wl.useFormStatus = function() {
    return C.H.useHostTransitionStatus();
  }, Wl.version = "19.2.0", Wl;
}
var Oo;
function cv() {
  if (Oo) return hc.exports;
  Oo = 1;
  function _() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(_);
      } catch (O) {
        console.error(O);
      }
  }
  return _(), hc.exports = fv(), hc.exports;
}
/**
 * @license React
 * react-dom-client.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Do;
function sv() {
  if (Do) return ze;
  Do = 1;
  var _ = nv(), O = Sc(), N = cv();
  function m(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function j(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function B(l) {
    var t = l, a = l;
    if (l.alternate) for (; t.return; ) t = t.return;
    else {
      l = t;
      do
        t = l, (t.flags & 4098) !== 0 && (a = t.return), l = t.return;
      while (l);
    }
    return t.tag === 3 ? a : null;
  }
  function C(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function el(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function z(l) {
    if (B(l) !== l)
      throw Error(m(188));
  }
  function S(l) {
    var t = l.alternate;
    if (!t) {
      if (t = B(l), t === null) throw Error(m(188));
      return t !== l ? null : l;
    }
    for (var a = l, u = t; ; ) {
      var e = a.return;
      if (e === null) break;
      var n = e.alternate;
      if (n === null) {
        if (u = e.return, u !== null) {
          a = u;
          continue;
        }
        break;
      }
      if (e.child === n.child) {
        for (n = e.child; n; ) {
          if (n === a) return z(e), l;
          if (n === u) return z(e), t;
          n = n.sibling;
        }
        throw Error(m(188));
      }
      if (a.return !== u.return) a = e, u = n;
      else {
        for (var i = !1, f = e.child; f; ) {
          if (f === a) {
            i = !0, a = e, u = n;
            break;
          }
          if (f === u) {
            i = !0, u = e, a = n;
            break;
          }
          f = f.sibling;
        }
        if (!i) {
          for (f = n.child; f; ) {
            if (f === a) {
              i = !0, a = n, u = e;
              break;
            }
            if (f === u) {
              i = !0, u = n, a = e;
              break;
            }
            f = f.sibling;
          }
          if (!i) throw Error(m(189));
        }
      }
      if (a.alternate !== u) throw Error(m(190));
    }
    if (a.tag !== 3) throw Error(m(188));
    return a.stateNode.current === a ? l : t;
  }
  function x(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l;
    for (l = l.child; l !== null; ) {
      if (t = x(l), t !== null) return t;
      l = l.sibling;
    }
    return null;
  }
  var H = Object.assign, V = Symbol.for("react.element"), ol = Symbol.for("react.transitional.element"), I = Symbol.for("react.portal"), sl = Symbol.for("react.fragment"), Ml = Symbol.for("react.strict_mode"), W = Symbol.for("react.profiler"), Dl = Symbol.for("react.consumer"), Q = Symbol.for("react.context"), ml = Symbol.for("react.forward_ref"), Ul = Symbol.for("react.suspense"), hl = Symbol.for("react.suspense_list"), $ = Symbol.for("react.memo"), Nl = Symbol.for("react.lazy"), Xl = Symbol.for("react.activity"), ut = Symbol.for("react.memo_cache_sentinel"), et = Symbol.iterator;
  function Zl(l) {
    return l === null || typeof l != "object" ? null : (l = et && l[et] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var Nt = Symbol.for("react.client.reference");
  function Mt(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === Nt ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case sl:
        return "Fragment";
      case W:
        return "Profiler";
      case Ml:
        return "StrictMode";
      case Ul:
        return "Suspense";
      case hl:
        return "SuspenseList";
      case Xl:
        return "Activity";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case I:
          return "Portal";
        case Q:
          return l.displayName || "Context";
        case Dl:
          return (l._context.displayName || "Context") + ".Consumer";
        case ml:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case $:
          return t = l.displayName || null, t !== null ? t : Mt(l.type) || "Memo";
        case Nl:
          t = l._payload, l = l._init;
          try {
            return Mt(l(t));
          } catch {
          }
      }
    return null;
  }
  var al = Array.isArray, E = O.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, U = N.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, X = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, fl = [], dl = -1;
  function c(l) {
    return { current: l };
  }
  function g(l) {
    0 > dl || (l.current = fl[dl], fl[dl] = null, dl--);
  }
  function p(l, t) {
    dl++, fl[dl] = l.current, l.current = t;
  }
  var D = c(null), G = c(null), L = c(null), P = c(null);
  function _l(l, t) {
    switch (p(L, t), p(G, l), p(D, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? Zd(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = Zd(t), l = Ld(t, l);
        else
          switch (l) {
            case "svg":
              l = 1;
              break;
            case "math":
              l = 2;
              break;
            default:
              l = 0;
          }
    }
    g(D), p(D, l);
  }
  function Rl() {
    g(D), g(G), g(L);
  }
  function Du(l) {
    l.memoizedState !== null && p(P, l);
    var t = D.current, a = Ld(t, l.type);
    t !== a && (p(G, l), p(D, a));
  }
  function pe(l) {
    G.current === l && (g(D), g(G)), P.current === l && (g(P), Se._currentValue = X);
  }
  var Kn, gc;
  function _a(l) {
    if (Kn === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        Kn = t && t[1] || "", gc = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + Kn + l + gc;
  }
  var Jn = !1;
  function wn(l, t) {
    if (!l || Jn) return "";
    Jn = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var u = {
        DetermineComponentFrameRoot: function() {
          try {
            if (t) {
              var A = function() {
                throw Error();
              };
              if (Object.defineProperty(A.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(A, []);
                } catch (r) {
                  var h = r;
                }
                Reflect.construct(l, [], A);
              } else {
                try {
                  A.call();
                } catch (r) {
                  h = r;
                }
                l.call(A.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (r) {
                h = r;
              }
              (A = l()) && typeof A.catch == "function" && A.catch(function() {
              });
            }
          } catch (r) {
            if (r && h && typeof r.stack == "string")
              return [r.stack, h.stack];
          }
          return [null, null];
        }
      };
      u.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
      var e = Object.getOwnPropertyDescriptor(
        u.DetermineComponentFrameRoot,
        "name"
      );
      e && e.configurable && Object.defineProperty(
        u.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
      var n = u.DetermineComponentFrameRoot(), i = n[0], f = n[1];
      if (i && f) {
        var s = i.split(`
`), v = f.split(`
`);
        for (e = u = 0; u < s.length && !s[u].includes("DetermineComponentFrameRoot"); )
          u++;
        for (; e < v.length && !v[e].includes(
          "DetermineComponentFrameRoot"
        ); )
          e++;
        if (u === s.length || e === v.length)
          for (u = s.length - 1, e = v.length - 1; 1 <= u && 0 <= e && s[u] !== v[e]; )
            e--;
        for (; 1 <= u && 0 <= e; u--, e--)
          if (s[u] !== v[e]) {
            if (u !== 1 || e !== 1)
              do
                if (u--, e--, 0 > e || s[u] !== v[e]) {
                  var b = `
` + s[u].replace(" at new ", " at ");
                  return l.displayName && b.includes("<anonymous>") && (b = b.replace("<anonymous>", l.displayName)), b;
                }
              while (1 <= u && 0 <= e);
            break;
          }
      }
    } finally {
      Jn = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? _a(a) : "";
  }
  function jo(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return _a(l.type);
      case 16:
        return _a("Lazy");
      case 13:
        return l.child !== t && t !== null ? _a("Suspense Fallback") : _a("Suspense");
      case 19:
        return _a("SuspenseList");
      case 0:
      case 15:
        return wn(l.type, !1);
      case 11:
        return wn(l.type.render, !1);
      case 1:
        return wn(l.type, !0);
      case 31:
        return _a("Activity");
      default:
        return "";
    }
  }
  function bc(l) {
    try {
      var t = "", a = null;
      do
        t += jo(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (u) {
      return `
Error generating stack: ` + u.message + `
` + u.stack;
    }
  }
  var Wn = Object.prototype.hasOwnProperty, $n = _.unstable_scheduleCallback, Fn = _.unstable_cancelCallback, Co = _.unstable_shouldYield, xo = _.unstable_requestPaint, nt = _.unstable_now, qo = _.unstable_getCurrentPriorityLevel, Ec = _.unstable_ImmediatePriority, Tc = _.unstable_UserBlockingPriority, Oe = _.unstable_NormalPriority, Yo = _.unstable_LowPriority, zc = _.unstable_IdlePriority, Bo = _.log, Go = _.unstable_setDisableYieldValue, Uu = null, it = null;
  function Pt(l) {
    if (typeof Bo == "function" && Go(l), it && typeof it.setStrictMode == "function")
      try {
        it.setStrictMode(Uu, l);
      } catch {
      }
  }
  var ft = Math.clz32 ? Math.clz32 : Zo, Qo = Math.log, Xo = Math.LN2;
  function Zo(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (Qo(l) / Xo | 0) | 0;
  }
  var De = 256, Ue = 262144, Ne = 4194304;
  function Ma(l) {
    var t = l & 42;
    if (t !== 0) return t;
    switch (l & -l) {
      case 1:
        return 1;
      case 2:
        return 2;
      case 4:
        return 4;
      case 8:
        return 8;
      case 16:
        return 16;
      case 32:
        return 32;
      case 64:
        return 64;
      case 128:
        return 128;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
        return l & 261888;
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return l & 3932160;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return l & 62914560;
      case 67108864:
        return 67108864;
      case 134217728:
        return 134217728;
      case 268435456:
        return 268435456;
      case 536870912:
        return 536870912;
      case 1073741824:
        return 0;
      default:
        return l;
    }
  }
  function Re(l, t, a) {
    var u = l.pendingLanes;
    if (u === 0) return 0;
    var e = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var f = u & 134217727;
    return f !== 0 ? (u = f & ~n, u !== 0 ? e = Ma(u) : (i &= f, i !== 0 ? e = Ma(i) : a || (a = f & ~l, a !== 0 && (e = Ma(a))))) : (f = u & ~n, f !== 0 ? e = Ma(f) : i !== 0 ? e = Ma(i) : a || (a = u & ~l, a !== 0 && (e = Ma(a)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : e;
  }
  function Nu(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function Lo(l, t) {
    switch (l) {
      case 1:
      case 2:
      case 4:
      case 8:
      case 64:
        return t + 250;
      case 16:
      case 32:
      case 128:
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
        return t + 5e3;
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        return -1;
      case 67108864:
      case 134217728:
      case 268435456:
      case 536870912:
      case 1073741824:
        return -1;
      default:
        return -1;
    }
  }
  function Ac() {
    var l = Ne;
    return Ne <<= 1, (Ne & 62914560) === 0 && (Ne = 4194304), l;
  }
  function kn(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function Ru(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function Vo(l, t, a, u, e, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var f = l.entanglements, s = l.expirationTimes, v = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var b = 31 - ft(a), A = 1 << b;
      f[b] = 0, s[b] = -1;
      var h = v[b];
      if (h !== null)
        for (v[b] = null, b = 0; b < h.length; b++) {
          var r = h[b];
          r !== null && (r.lane &= -536870913);
        }
      a &= ~A;
    }
    u !== 0 && _c(l, u, 0), n !== 0 && e === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function _c(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var u = 31 - ft(t);
    l.entangledLanes |= t, l.entanglements[u] = l.entanglements[u] | 1073741824 | a & 261930;
  }
  function Mc(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var u = 31 - ft(a), e = 1 << u;
      e & t | l[u] & t && (l[u] |= t), a &= ~e;
    }
  }
  function pc(l, t) {
    var a = t & -t;
    return a = (a & 42) !== 0 ? 1 : In(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function In(l) {
    switch (l) {
      case 2:
        l = 1;
        break;
      case 8:
        l = 4;
        break;
      case 32:
        l = 16;
        break;
      case 256:
      case 512:
      case 1024:
      case 2048:
      case 4096:
      case 8192:
      case 16384:
      case 32768:
      case 65536:
      case 131072:
      case 262144:
      case 524288:
      case 1048576:
      case 2097152:
      case 4194304:
      case 8388608:
      case 16777216:
      case 33554432:
        l = 128;
        break;
      case 268435456:
        l = 134217728;
        break;
      default:
        l = 0;
    }
    return l;
  }
  function Pn(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Oc() {
    var l = U.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : yo(l.type));
  }
  function Dc(l, t) {
    var a = U.p;
    try {
      return U.p = l, t();
    } finally {
      U.p = a;
    }
  }
  var la = Math.random().toString(36).slice(2), Ll = "__reactFiber$" + la, Fl = "__reactProps$" + la, Va = "__reactContainer$" + la, li = "__reactEvents$" + la, Ko = "__reactListeners$" + la, Jo = "__reactHandles$" + la, Uc = "__reactResources$" + la, Hu = "__reactMarker$" + la;
  function ti(l) {
    delete l[Ll], delete l[Fl], delete l[li], delete l[Ko], delete l[Jo];
  }
  function Ka(l) {
    var t = l[Ll];
    if (t) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[Va] || a[Ll]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = Fd(l); l !== null; ) {
            if (a = l[Ll]) return a;
            l = Fd(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function Ja(l) {
    if (l = l[Ll] || l[Va]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function ju(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(m(33));
  }
  function wa(l) {
    var t = l[Uc];
    return t || (t = l[Uc] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function Gl(l) {
    l[Hu] = !0;
  }
  var Nc = /* @__PURE__ */ new Set(), Rc = {};
  function pa(l, t) {
    Wa(l, t), Wa(l + "Capture", t);
  }
  function Wa(l, t) {
    for (Rc[l] = t, l = 0; l < t.length; l++)
      Nc.add(t[l]);
  }
  var wo = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), Hc = {}, jc = {};
  function Wo(l) {
    return Wn.call(jc, l) ? !0 : Wn.call(Hc, l) ? !1 : wo.test(l) ? jc[l] = !0 : (Hc[l] = !0, !1);
  }
  function He(l, t, a) {
    if (Wo(t))
      if (a === null) l.removeAttribute(t);
      else {
        switch (typeof a) {
          case "undefined":
          case "function":
          case "symbol":
            l.removeAttribute(t);
            return;
          case "boolean":
            var u = t.toLowerCase().slice(0, 5);
            if (u !== "data-" && u !== "aria-") {
              l.removeAttribute(t);
              return;
            }
        }
        l.setAttribute(t, "" + a);
      }
  }
  function je(l, t, a) {
    if (a === null) l.removeAttribute(t);
    else {
      switch (typeof a) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(t);
          return;
      }
      l.setAttribute(t, "" + a);
    }
  }
  function xt(l, t, a, u) {
    if (u === null) l.removeAttribute(a);
    else {
      switch (typeof u) {
        case "undefined":
        case "function":
        case "symbol":
        case "boolean":
          l.removeAttribute(a);
          return;
      }
      l.setAttributeNS(t, a, "" + u);
    }
  }
  function ht(l) {
    switch (typeof l) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
      case "undefined":
        return l;
      case "object":
        return l;
      default:
        return "";
    }
  }
  function Cc(l) {
    var t = l.type;
    return (l = l.nodeName) && l.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function $o(l, t, a) {
    var u = Object.getOwnPropertyDescriptor(
      l.constructor.prototype,
      t
    );
    if (!l.hasOwnProperty(t) && typeof u < "u" && typeof u.get == "function" && typeof u.set == "function") {
      var e = u.get, n = u.set;
      return Object.defineProperty(l, t, {
        configurable: !0,
        get: function() {
          return e.call(this);
        },
        set: function(i) {
          a = "" + i, n.call(this, i);
        }
      }), Object.defineProperty(l, t, {
        enumerable: u.enumerable
      }), {
        getValue: function() {
          return a;
        },
        setValue: function(i) {
          a = "" + i;
        },
        stopTracking: function() {
          l._valueTracker = null, delete l[t];
        }
      };
    }
  }
  function ai(l) {
    if (!l._valueTracker) {
      var t = Cc(l) ? "checked" : "value";
      l._valueTracker = $o(
        l,
        t,
        "" + l[t]
      );
    }
  }
  function xc(l) {
    if (!l) return !1;
    var t = l._valueTracker;
    if (!t) return !0;
    var a = t.getValue(), u = "";
    return l && (u = Cc(l) ? l.checked ? "true" : "false" : l.value), l = u, l !== a ? (t.setValue(l), !0) : !1;
  }
  function Ce(l) {
    if (l = l || (typeof document < "u" ? document : void 0), typeof l > "u") return null;
    try {
      return l.activeElement || l.body;
    } catch {
      return l.body;
    }
  }
  var Fo = /[\n"\\]/g;
  function rt(l) {
    return l.replace(
      Fo,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function ui(l, t, a, u, e, n, i, f) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + ht(t)) : l.value !== "" + ht(t) && (l.value = "" + ht(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? ei(l, i, ht(t)) : a != null ? ei(l, i, ht(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), f != null && typeof f != "function" && typeof f != "symbol" && typeof f != "boolean" ? l.name = "" + ht(f) : l.removeAttribute("name");
  }
  function qc(l, t, a, u, e, n, i, f) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        ai(l);
        return;
      }
      a = a != null ? "" + ht(a) : "", t = t != null ? "" + ht(t) : a, f || t === l.value || (l.value = t), l.defaultValue = t;
    }
    u = u ?? e, u = typeof u != "function" && typeof u != "symbol" && !!u, l.checked = f ? l.checked : !!u, l.defaultChecked = !!u, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), ai(l);
  }
  function ei(l, t, a) {
    t === "number" && Ce(l.ownerDocument) === l || l.defaultValue === "" + a || (l.defaultValue = "" + a);
  }
  function $a(l, t, a, u) {
    if (l = l.options, t) {
      t = {};
      for (var e = 0; e < a.length; e++)
        t["$" + a[e]] = !0;
      for (a = 0; a < l.length; a++)
        e = t.hasOwnProperty("$" + l[a].value), l[a].selected !== e && (l[a].selected = e), e && u && (l[a].defaultSelected = !0);
    } else {
      for (a = "" + ht(a), t = null, e = 0; e < l.length; e++) {
        if (l[e].value === a) {
          l[e].selected = !0, u && (l[e].defaultSelected = !0);
          return;
        }
        t !== null || l[e].disabled || (t = l[e]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Yc(l, t, a) {
    if (t != null && (t = "" + ht(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + ht(a) : "";
  }
  function Bc(l, t, a, u) {
    if (t == null) {
      if (u != null) {
        if (a != null) throw Error(m(92));
        if (al(u)) {
          if (1 < u.length) throw Error(m(93));
          u = u[0];
        }
        a = u;
      }
      a == null && (a = ""), t = a;
    }
    a = ht(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), ai(l);
  }
  function Fa(l, t) {
    if (t) {
      var a = l.firstChild;
      if (a && a === l.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    l.textContent = t;
  }
  var ko = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function Gc(l, t, a) {
    var u = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? u ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : u ? l.setProperty(t, a) : typeof a != "number" || a === 0 || ko.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
  }
  function Qc(l, t, a) {
    if (t != null && typeof t != "object")
      throw Error(m(62));
    if (l = l.style, a != null) {
      for (var u in a)
        !a.hasOwnProperty(u) || t != null && t.hasOwnProperty(u) || (u.indexOf("--") === 0 ? l.setProperty(u, "") : u === "float" ? l.cssFloat = "" : l[u] = "");
      for (var e in t)
        u = t[e], t.hasOwnProperty(e) && a[e] !== u && Gc(l, e, u);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && Gc(l, n, t[n]);
  }
  function ni(l) {
    if (l.indexOf("-") === -1) return !1;
    switch (l) {
      case "annotation-xml":
      case "color-profile":
      case "font-face":
      case "font-face-src":
      case "font-face-uri":
      case "font-face-format":
      case "font-face-name":
      case "missing-glyph":
        return !1;
      default:
        return !0;
    }
  }
  var Io = /* @__PURE__ */ new Map([
    ["acceptCharset", "accept-charset"],
    ["htmlFor", "for"],
    ["httpEquiv", "http-equiv"],
    ["crossOrigin", "crossorigin"],
    ["accentHeight", "accent-height"],
    ["alignmentBaseline", "alignment-baseline"],
    ["arabicForm", "arabic-form"],
    ["baselineShift", "baseline-shift"],
    ["capHeight", "cap-height"],
    ["clipPath", "clip-path"],
    ["clipRule", "clip-rule"],
    ["colorInterpolation", "color-interpolation"],
    ["colorInterpolationFilters", "color-interpolation-filters"],
    ["colorProfile", "color-profile"],
    ["colorRendering", "color-rendering"],
    ["dominantBaseline", "dominant-baseline"],
    ["enableBackground", "enable-background"],
    ["fillOpacity", "fill-opacity"],
    ["fillRule", "fill-rule"],
    ["floodColor", "flood-color"],
    ["floodOpacity", "flood-opacity"],
    ["fontFamily", "font-family"],
    ["fontSize", "font-size"],
    ["fontSizeAdjust", "font-size-adjust"],
    ["fontStretch", "font-stretch"],
    ["fontStyle", "font-style"],
    ["fontVariant", "font-variant"],
    ["fontWeight", "font-weight"],
    ["glyphName", "glyph-name"],
    ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
    ["glyphOrientationVertical", "glyph-orientation-vertical"],
    ["horizAdvX", "horiz-adv-x"],
    ["horizOriginX", "horiz-origin-x"],
    ["imageRendering", "image-rendering"],
    ["letterSpacing", "letter-spacing"],
    ["lightingColor", "lighting-color"],
    ["markerEnd", "marker-end"],
    ["markerMid", "marker-mid"],
    ["markerStart", "marker-start"],
    ["overlinePosition", "overline-position"],
    ["overlineThickness", "overline-thickness"],
    ["paintOrder", "paint-order"],
    ["panose-1", "panose-1"],
    ["pointerEvents", "pointer-events"],
    ["renderingIntent", "rendering-intent"],
    ["shapeRendering", "shape-rendering"],
    ["stopColor", "stop-color"],
    ["stopOpacity", "stop-opacity"],
    ["strikethroughPosition", "strikethrough-position"],
    ["strikethroughThickness", "strikethrough-thickness"],
    ["strokeDasharray", "stroke-dasharray"],
    ["strokeDashoffset", "stroke-dashoffset"],
    ["strokeLinecap", "stroke-linecap"],
    ["strokeLinejoin", "stroke-linejoin"],
    ["strokeMiterlimit", "stroke-miterlimit"],
    ["strokeOpacity", "stroke-opacity"],
    ["strokeWidth", "stroke-width"],
    ["textAnchor", "text-anchor"],
    ["textDecoration", "text-decoration"],
    ["textRendering", "text-rendering"],
    ["transformOrigin", "transform-origin"],
    ["underlinePosition", "underline-position"],
    ["underlineThickness", "underline-thickness"],
    ["unicodeBidi", "unicode-bidi"],
    ["unicodeRange", "unicode-range"],
    ["unitsPerEm", "units-per-em"],
    ["vAlphabetic", "v-alphabetic"],
    ["vHanging", "v-hanging"],
    ["vIdeographic", "v-ideographic"],
    ["vMathematical", "v-mathematical"],
    ["vectorEffect", "vector-effect"],
    ["vertAdvY", "vert-adv-y"],
    ["vertOriginX", "vert-origin-x"],
    ["vertOriginY", "vert-origin-y"],
    ["wordSpacing", "word-spacing"],
    ["writingMode", "writing-mode"],
    ["xmlnsXlink", "xmlns:xlink"],
    ["xHeight", "x-height"]
  ]), Po = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function xe(l) {
    return Po.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function qt() {
  }
  var ii = null;
  function fi(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var ka = null, Ia = null;
  function Xc(l) {
    var t = Ja(l);
    if (t && (l = t.stateNode)) {
      var a = l[Fl] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if (ui(
            l,
            a.value,
            a.defaultValue,
            a.defaultValue,
            a.checked,
            a.defaultChecked,
            a.type,
            a.name
          ), t = a.name, a.type === "radio" && t != null) {
            for (a = l; a.parentNode; ) a = a.parentNode;
            for (a = a.querySelectorAll(
              'input[name="' + rt(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var u = a[t];
              if (u !== l && u.form === l.form) {
                var e = u[Fl] || null;
                if (!e) throw Error(m(90));
                ui(
                  u,
                  e.value,
                  e.defaultValue,
                  e.defaultValue,
                  e.checked,
                  e.defaultChecked,
                  e.type,
                  e.name
                );
              }
            }
            for (t = 0; t < a.length; t++)
              u = a[t], u.form === l.form && xc(u);
          }
          break l;
        case "textarea":
          Yc(l, a.value, a.defaultValue);
          break l;
        case "select":
          t = a.value, t != null && $a(l, !!a.multiple, t, !1);
      }
    }
  }
  var ci = !1;
  function Zc(l, t, a) {
    if (ci) return l(t, a);
    ci = !0;
    try {
      var u = l(t);
      return u;
    } finally {
      if (ci = !1, (ka !== null || Ia !== null) && (An(), ka && (t = ka, l = Ia, Ia = ka = null, Xc(t), l)))
        for (t = 0; t < l.length; t++) Xc(l[t]);
    }
  }
  function Cu(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var u = a[Fl] || null;
    if (u === null) return null;
    a = u[t];
    l: switch (t) {
      case "onClick":
      case "onClickCapture":
      case "onDoubleClick":
      case "onDoubleClickCapture":
      case "onMouseDown":
      case "onMouseDownCapture":
      case "onMouseMove":
      case "onMouseMoveCapture":
      case "onMouseUp":
      case "onMouseUpCapture":
      case "onMouseEnter":
        (u = !u.disabled) || (l = l.type, u = !(l === "button" || l === "input" || l === "select" || l === "textarea")), l = !u;
        break l;
      default:
        l = !1;
    }
    if (l) return null;
    if (a && typeof a != "function")
      throw Error(
        m(231, t, typeof a)
      );
    return a;
  }
  var Yt = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), si = !1;
  if (Yt)
    try {
      var xu = {};
      Object.defineProperty(xu, "passive", {
        get: function() {
          si = !0;
        }
      }), window.addEventListener("test", xu, xu), window.removeEventListener("test", xu, xu);
    } catch {
      si = !1;
    }
  var ta = null, di = null, qe = null;
  function Lc() {
    if (qe) return qe;
    var l, t = di, a = t.length, u, e = "value" in ta ? ta.value : ta.textContent, n = e.length;
    for (l = 0; l < a && t[l] === e[l]; l++) ;
    var i = a - l;
    for (u = 1; u <= i && t[a - u] === e[n - u]; u++) ;
    return qe = e.slice(l, 1 < u ? 1 - u : void 0);
  }
  function Ye(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function Be() {
    return !0;
  }
  function Vc() {
    return !1;
  }
  function kl(l) {
    function t(a, u, e, n, i) {
      this._reactName = a, this._targetInst = e, this.type = u, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var f in l)
        l.hasOwnProperty(f) && (a = l[f], this[f] = a ? a(n) : n[f]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? Be : Vc, this.isPropagationStopped = Vc, this;
    }
    return H(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = Be);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = Be);
      },
      persist: function() {
      },
      isPersistent: Be
    }), t;
  }
  var Oa = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Ge = kl(Oa), qu = H({}, Oa, { view: 0, detail: 0 }), lm = kl(qu), oi, mi, Yu, Qe = H({}, qu, {
    screenX: 0,
    screenY: 0,
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    getModifierState: vi,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== Yu && (Yu && l.type === "mousemove" ? (oi = l.screenX - Yu.screenX, mi = l.screenY - Yu.screenY) : mi = oi = 0, Yu = l), oi);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : mi;
    }
  }), Kc = kl(Qe), tm = H({}, Qe, { dataTransfer: 0 }), am = kl(tm), um = H({}, qu, { relatedTarget: 0 }), yi = kl(um), em = H({}, Oa, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), nm = kl(em), im = H({}, Oa, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), fm = kl(im), cm = H({}, Oa, { data: 0 }), Jc = kl(cm), sm = {
    Esc: "Escape",
    Spacebar: " ",
    Left: "ArrowLeft",
    Up: "ArrowUp",
    Right: "ArrowRight",
    Down: "ArrowDown",
    Del: "Delete",
    Win: "OS",
    Menu: "ContextMenu",
    Apps: "ContextMenu",
    Scroll: "ScrollLock",
    MozPrintableKey: "Unidentified"
  }, dm = {
    8: "Backspace",
    9: "Tab",
    12: "Clear",
    13: "Enter",
    16: "Shift",
    17: "Control",
    18: "Alt",
    19: "Pause",
    20: "CapsLock",
    27: "Escape",
    32: " ",
    33: "PageUp",
    34: "PageDown",
    35: "End",
    36: "Home",
    37: "ArrowLeft",
    38: "ArrowUp",
    39: "ArrowRight",
    40: "ArrowDown",
    45: "Insert",
    46: "Delete",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "NumLock",
    145: "ScrollLock",
    224: "Meta"
  }, om = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function mm(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = om[l]) ? !!t[l] : !1;
  }
  function vi() {
    return mm;
  }
  var ym = H({}, qu, {
    key: function(l) {
      if (l.key) {
        var t = sm[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = Ye(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? dm[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: vi,
    charCode: function(l) {
      return l.type === "keypress" ? Ye(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? Ye(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), vm = kl(ym), hm = H({}, Qe, {
    pointerId: 0,
    width: 0,
    height: 0,
    pressure: 0,
    tangentialPressure: 0,
    tiltX: 0,
    tiltY: 0,
    twist: 0,
    pointerType: 0,
    isPrimary: 0
  }), wc = kl(hm), rm = H({}, qu, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: vi
  }), Sm = kl(rm), gm = H({}, Oa, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), bm = kl(gm), Em = H({}, Qe, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Tm = kl(Em), zm = H({}, Oa, {
    newState: 0,
    oldState: 0
  }), Am = kl(zm), _m = [9, 13, 27, 32], hi = Yt && "CompositionEvent" in window, Bu = null;
  Yt && "documentMode" in document && (Bu = document.documentMode);
  var Mm = Yt && "TextEvent" in window && !Bu, Wc = Yt && (!hi || Bu && 8 < Bu && 11 >= Bu), $c = " ", Fc = !1;
  function kc(l, t) {
    switch (l) {
      case "keyup":
        return _m.indexOf(t.keyCode) !== -1;
      case "keydown":
        return t.keyCode !== 229;
      case "keypress":
      case "mousedown":
      case "focusout":
        return !0;
      default:
        return !1;
    }
  }
  function Ic(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var Pa = !1;
  function pm(l, t) {
    switch (l) {
      case "compositionend":
        return Ic(t);
      case "keypress":
        return t.which !== 32 ? null : (Fc = !0, $c);
      case "textInput":
        return l = t.data, l === $c && Fc ? null : l;
      default:
        return null;
    }
  }
  function Om(l, t) {
    if (Pa)
      return l === "compositionend" || !hi && kc(l, t) ? (l = Lc(), qe = di = ta = null, Pa = !1, l) : null;
    switch (l) {
      case "paste":
        return null;
      case "keypress":
        if (!(t.ctrlKey || t.altKey || t.metaKey) || t.ctrlKey && t.altKey) {
          if (t.char && 1 < t.char.length)
            return t.char;
          if (t.which) return String.fromCharCode(t.which);
        }
        return null;
      case "compositionend":
        return Wc && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var Dm = {
    color: !0,
    date: !0,
    datetime: !0,
    "datetime-local": !0,
    email: !0,
    month: !0,
    number: !0,
    password: !0,
    range: !0,
    search: !0,
    tel: !0,
    text: !0,
    time: !0,
    url: !0,
    week: !0
  };
  function Pc(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t === "input" ? !!Dm[l.type] : t === "textarea";
  }
  function ls(l, t, a, u) {
    ka ? Ia ? Ia.push(u) : Ia = [u] : ka = u, t = Nn(t, "onChange"), 0 < t.length && (a = new Ge(
      "onChange",
      "change",
      null,
      a,
      u
    ), l.push({ event: a, listeners: t }));
  }
  var Gu = null, Qu = null;
  function Um(l) {
    qd(l, 0);
  }
  function Xe(l) {
    var t = ju(l);
    if (xc(t)) return l;
  }
  function ts(l, t) {
    if (l === "change") return t;
  }
  var as = !1;
  if (Yt) {
    var ri;
    if (Yt) {
      var Si = "oninput" in document;
      if (!Si) {
        var us = document.createElement("div");
        us.setAttribute("oninput", "return;"), Si = typeof us.oninput == "function";
      }
      ri = Si;
    } else ri = !1;
    as = ri && (!document.documentMode || 9 < document.documentMode);
  }
  function es() {
    Gu && (Gu.detachEvent("onpropertychange", ns), Qu = Gu = null);
  }
  function ns(l) {
    if (l.propertyName === "value" && Xe(Qu)) {
      var t = [];
      ls(
        t,
        Qu,
        l,
        fi(l)
      ), Zc(Um, t);
    }
  }
  function Nm(l, t, a) {
    l === "focusin" ? (es(), Gu = t, Qu = a, Gu.attachEvent("onpropertychange", ns)) : l === "focusout" && es();
  }
  function Rm(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return Xe(Qu);
  }
  function Hm(l, t) {
    if (l === "click") return Xe(t);
  }
  function jm(l, t) {
    if (l === "input" || l === "change")
      return Xe(t);
  }
  function Cm(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var ct = typeof Object.is == "function" ? Object.is : Cm;
  function Xu(l, t) {
    if (ct(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!Wn.call(t, e) || !ct(l[e], t[e]))
        return !1;
    }
    return !0;
  }
  function is(l) {
    for (; l && l.firstChild; ) l = l.firstChild;
    return l;
  }
  function fs(l, t) {
    var a = is(l);
    l = 0;
    for (var u; a; ) {
      if (a.nodeType === 3) {
        if (u = l + a.textContent.length, l <= t && u >= t)
          return { node: a, offset: t - l };
        l = u;
      }
      l: {
        for (; a; ) {
          if (a.nextSibling) {
            a = a.nextSibling;
            break l;
          }
          a = a.parentNode;
        }
        a = void 0;
      }
      a = is(a);
    }
  }
  function cs(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? cs(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function ss(l) {
    l = l != null && l.ownerDocument != null && l.ownerDocument.defaultView != null ? l.ownerDocument.defaultView : window;
    for (var t = Ce(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = Ce(l.document);
    }
    return t;
  }
  function gi(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var xm = Yt && "documentMode" in document && 11 >= document.documentMode, lu = null, bi = null, Zu = null, Ei = !1;
  function ds(l, t, a) {
    var u = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    Ei || lu == null || lu !== Ce(u) || (u = lu, "selectionStart" in u && gi(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = {
      anchorNode: u.anchorNode,
      anchorOffset: u.anchorOffset,
      focusNode: u.focusNode,
      focusOffset: u.focusOffset
    }), Zu && Xu(Zu, u) || (Zu = u, u = Nn(bi, "onSelect"), 0 < u.length && (t = new Ge(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: u }), t.target = lu)));
  }
  function Da(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var tu = {
    animationend: Da("Animation", "AnimationEnd"),
    animationiteration: Da("Animation", "AnimationIteration"),
    animationstart: Da("Animation", "AnimationStart"),
    transitionrun: Da("Transition", "TransitionRun"),
    transitionstart: Da("Transition", "TransitionStart"),
    transitioncancel: Da("Transition", "TransitionCancel"),
    transitionend: Da("Transition", "TransitionEnd")
  }, Ti = {}, os = {};
  Yt && (os = document.createElement("div").style, "AnimationEvent" in window || (delete tu.animationend.animation, delete tu.animationiteration.animation, delete tu.animationstart.animation), "TransitionEvent" in window || delete tu.transitionend.transition);
  function Ua(l) {
    if (Ti[l]) return Ti[l];
    if (!tu[l]) return l;
    var t = tu[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in os)
        return Ti[l] = t[a];
    return l;
  }
  var ms = Ua("animationend"), ys = Ua("animationiteration"), vs = Ua("animationstart"), qm = Ua("transitionrun"), Ym = Ua("transitionstart"), Bm = Ua("transitioncancel"), hs = Ua("transitionend"), rs = /* @__PURE__ */ new Map(), zi = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  zi.push("scrollEnd");
  function pt(l, t) {
    rs.set(l, t), pa(t, [l]);
  }
  var Ze = typeof reportError == "function" ? reportError : function(l) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var t = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof l == "object" && l !== null && typeof l.message == "string" ? String(l.message) : String(l),
        error: l
      });
      if (!window.dispatchEvent(t)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", l);
      return;
    }
    console.error(l);
  }, St = [], au = 0, Ai = 0;
  function Le() {
    for (var l = au, t = Ai = au = 0; t < l; ) {
      var a = St[t];
      St[t++] = null;
      var u = St[t];
      St[t++] = null;
      var e = St[t];
      St[t++] = null;
      var n = St[t];
      if (St[t++] = null, u !== null && e !== null) {
        var i = u.pending;
        i === null ? e.next = e : (e.next = i.next, i.next = e), u.pending = e;
      }
      n !== 0 && Ss(a, e, n);
    }
  }
  function Ve(l, t, a, u) {
    St[au++] = l, St[au++] = t, St[au++] = a, St[au++] = u, Ai |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function _i(l, t, a, u) {
    return Ve(l, t, a, u), Ke(l);
  }
  function Na(l, t) {
    return Ve(l, null, null, t), Ke(l);
  }
  function Ss(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - ft(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function Ke(l) {
    if (50 < de)
      throw de = 0, Cf = null, Error(m(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var uu = {};
  function Gm(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function st(l, t, a, u) {
    return new Gm(l, t, a, u);
  }
  function Mi(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function Bt(l, t) {
    var a = l.alternate;
    return a === null ? (a = st(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 65011712, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function gs(l, t) {
    l.flags &= 65011714;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function Je(l, t, a, u, e, n) {
    var i = 0;
    if (u = l, typeof l == "function") Mi(l) && (i = 1);
    else if (typeof l == "string")
      i = Vy(
        l,
        a,
        D.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (l) {
        case Xl:
          return l = st(31, a, t, e), l.elementType = Xl, l.lanes = n, l;
        case sl:
          return Ra(a.children, e, n, t);
        case Ml:
          i = 8, e |= 24;
          break;
        case W:
          return l = st(12, a, t, e | 2), l.elementType = W, l.lanes = n, l;
        case Ul:
          return l = st(13, a, t, e), l.elementType = Ul, l.lanes = n, l;
        case hl:
          return l = st(19, a, t, e), l.elementType = hl, l.lanes = n, l;
        default:
          if (typeof l == "object" && l !== null)
            switch (l.$$typeof) {
              case Q:
                i = 10;
                break l;
              case Dl:
                i = 9;
                break l;
              case ml:
                i = 11;
                break l;
              case $:
                i = 14;
                break l;
              case Nl:
                i = 16, u = null;
                break l;
            }
          i = 29, a = Error(
            m(130, l === null ? "null" : typeof l, "")
          ), u = null;
      }
    return t = st(i, a, t, e), t.elementType = l, t.type = u, t.lanes = n, t;
  }
  function Ra(l, t, a, u) {
    return l = st(7, l, u, t), l.lanes = a, l;
  }
  function pi(l, t, a) {
    return l = st(6, l, null, t), l.lanes = a, l;
  }
  function bs(l) {
    var t = st(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function Oi(l, t, a) {
    return t = st(
      4,
      l.children !== null ? l.children : [],
      l.key,
      t
    ), t.lanes = a, t.stateNode = {
      containerInfo: l.containerInfo,
      pendingChildren: null,
      implementation: l.implementation
    }, t;
  }
  var Es = /* @__PURE__ */ new WeakMap();
  function gt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = Es.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: bc(t)
      }, Es.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: bc(t)
    };
  }
  var eu = [], nu = 0, we = null, Lu = 0, bt = [], Et = 0, aa = null, Rt = 1, Ht = "";
  function Gt(l, t) {
    eu[nu++] = Lu, eu[nu++] = we, we = l, Lu = t;
  }
  function Ts(l, t, a) {
    bt[Et++] = Rt, bt[Et++] = Ht, bt[Et++] = aa, aa = l;
    var u = Rt;
    l = Ht;
    var e = 32 - ft(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - ft(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, Rt = 1 << 32 - ft(t) + e | a << e | u, Ht = n + l;
    } else
      Rt = 1 << n | a << e | u, Ht = l;
  }
  function Di(l) {
    l.return !== null && (Gt(l, 1), Ts(l, 1, 0));
  }
  function Ui(l) {
    for (; l === we; )
      we = eu[--nu], eu[nu] = null, Lu = eu[--nu], eu[nu] = null;
    for (; l === aa; )
      aa = bt[--Et], bt[Et] = null, Ht = bt[--Et], bt[Et] = null, Rt = bt[--Et], bt[Et] = null;
  }
  function zs(l, t) {
    bt[Et++] = Rt, bt[Et++] = Ht, bt[Et++] = aa, Rt = t.id, Ht = t.overflow, aa = l;
  }
  var Vl = null, Tl = null, ul = !1, ua = null, Tt = !1, Ni = Error(m(519));
  function ea(l) {
    var t = Error(
      m(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw Vu(gt(t, l)), Ni;
  }
  function As(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[Ll] = l, t[Fl] = u, a) {
      case "dialog":
        k("cancel", t), k("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        k("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < me.length; a++)
          k(me[a], t);
        break;
      case "source":
        k("error", t);
        break;
      case "img":
      case "image":
      case "link":
        k("error", t), k("load", t);
        break;
      case "details":
        k("toggle", t);
        break;
      case "input":
        k("invalid", t), qc(
          t,
          u.value,
          u.defaultValue,
          u.checked,
          u.defaultChecked,
          u.type,
          u.name,
          !0
        );
        break;
      case "select":
        k("invalid", t);
        break;
      case "textarea":
        k("invalid", t), Bc(t, u.value, u.defaultValue, u.children);
    }
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || Qd(t.textContent, a) ? (u.popover != null && (k("beforetoggle", t), k("toggle", t)), u.onScroll != null && k("scroll", t), u.onScrollEnd != null && k("scrollend", t), u.onClick != null && (t.onclick = qt), t = !0) : t = !1, t || ea(l, !0);
  }
  function _s(l) {
    for (Vl = l.return; Vl; )
      switch (Vl.tag) {
        case 5:
        case 31:
        case 13:
          Tt = !1;
          return;
        case 27:
        case 3:
          Tt = !0;
          return;
        default:
          Vl = Vl.return;
      }
  }
  function iu(l) {
    if (l !== Vl) return !1;
    if (!ul) return _s(l), ul = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || $f(l.type, l.memoizedProps)), a = !a), a && Tl && ea(l), _s(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(m(317));
      Tl = $d(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(m(317));
      Tl = $d(l);
    } else
      t === 27 ? (t = Tl, ga(l.type) ? (l = lc, lc = null, Tl = l) : Tl = t) : Tl = Vl ? At(l.stateNode.nextSibling) : null;
    return !0;
  }
  function Ha() {
    Tl = Vl = null, ul = !1;
  }
  function Ri() {
    var l = ua;
    return l !== null && (tt === null ? tt = l : tt.push.apply(
      tt,
      l
    ), ua = null), l;
  }
  function Vu(l) {
    ua === null ? ua = [l] : ua.push(l);
  }
  var Hi = c(null), ja = null, Qt = null;
  function na(l, t, a) {
    p(Hi, t._currentValue), t._currentValue = a;
  }
  function Xt(l) {
    l._currentValue = Hi.current, g(Hi);
  }
  function ji(l, t, a) {
    for (; l !== null; ) {
      var u = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, u !== null && (u.childLanes |= t)) : u !== null && (u.childLanes & t) !== t && (u.childLanes |= t), l === a) break;
      l = l.return;
    }
  }
  function Ci(l, t, a, u) {
    var e = l.child;
    for (e !== null && (e.return = l); e !== null; ) {
      var n = e.dependencies;
      if (n !== null) {
        var i = e.child;
        n = n.firstContext;
        l: for (; n !== null; ) {
          var f = n;
          n = e;
          for (var s = 0; s < t.length; s++)
            if (f.context === t[s]) {
              n.lanes |= a, f = n.alternate, f !== null && (f.lanes |= a), ji(
                n.return,
                a,
                l
              ), u || (i = null);
              break l;
            }
          n = f.next;
        }
      } else if (e.tag === 18) {
        if (i = e.return, i === null) throw Error(m(341));
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), ji(i, a, l), i = null;
      } else i = e.child;
      if (i !== null) i.return = e;
      else
        for (i = e; i !== null; ) {
          if (i === l) {
            i = null;
            break;
          }
          if (e = i.sibling, e !== null) {
            e.return = i.return, i = e;
            break;
          }
          i = i.return;
        }
      e = i;
    }
  }
  function fu(l, t, a, u) {
    l = null;
    for (var e = t, n = !1; e !== null; ) {
      if (!n) {
        if ((e.flags & 524288) !== 0) n = !0;
        else if ((e.flags & 262144) !== 0) break;
      }
      if (e.tag === 10) {
        var i = e.alternate;
        if (i === null) throw Error(m(387));
        if (i = i.memoizedProps, i !== null) {
          var f = e.type;
          ct(e.pendingProps.value, i.value) || (l !== null ? l.push(f) : l = [f]);
        }
      } else if (e === P.current) {
        if (i = e.alternate, i === null) throw Error(m(387));
        i.memoizedState.memoizedState !== e.memoizedState.memoizedState && (l !== null ? l.push(Se) : l = [Se]);
      }
      e = e.return;
    }
    l !== null && Ci(
      t,
      l,
      a,
      u
    ), t.flags |= 262144;
  }
  function We(l) {
    for (l = l.firstContext; l !== null; ) {
      if (!ct(
        l.context._currentValue,
        l.memoizedValue
      ))
        return !0;
      l = l.next;
    }
    return !1;
  }
  function Ca(l) {
    ja = l, Qt = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function Kl(l) {
    return Ms(ja, l);
  }
  function $e(l, t) {
    return ja === null && Ca(l), Ms(l, t);
  }
  function Ms(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, Qt === null) {
      if (l === null) throw Error(m(308));
      Qt = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else Qt = Qt.next = t;
    return a;
  }
  var Qm = typeof AbortController < "u" ? AbortController : function() {
    var l = [], t = this.signal = {
      aborted: !1,
      addEventListener: function(a, u) {
        l.push(u);
      }
    };
    this.abort = function() {
      t.aborted = !0, l.forEach(function(a) {
        return a();
      });
    };
  }, Xm = _.unstable_scheduleCallback, Zm = _.unstable_NormalPriority, Cl = {
    $$typeof: Q,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function xi() {
    return {
      controller: new Qm(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function Ku(l) {
    l.refCount--, l.refCount === 0 && Xm(Zm, function() {
      l.controller.abort();
    });
  }
  var Ju = null, qi = 0, cu = 0, su = null;
  function Lm(l, t) {
    if (Ju === null) {
      var a = Ju = [];
      qi = 0, cu = Qf(), su = {
        status: "pending",
        value: void 0,
        then: function(u) {
          a.push(u);
        }
      };
    }
    return qi++, t.then(ps, ps), t;
  }
  function ps() {
    if (--qi === 0 && Ju !== null) {
      su !== null && (su.status = "fulfilled");
      var l = Ju;
      Ju = null, cu = 0, su = null;
      for (var t = 0; t < l.length; t++) (0, l[t])();
    }
  }
  function Vm(l, t) {
    var a = [], u = {
      status: "pending",
      value: null,
      reason: null,
      then: function(e) {
        a.push(e);
      }
    };
    return l.then(
      function() {
        u.status = "fulfilled", u.value = t;
        for (var e = 0; e < a.length; e++) (0, a[e])(t);
      },
      function(e) {
        for (u.status = "rejected", u.reason = e, e = 0; e < a.length; e++)
          (0, a[e])(void 0);
      }
    ), u;
  }
  var Os = E.S;
  E.S = function(l, t) {
    dd = nt(), typeof t == "object" && t !== null && typeof t.then == "function" && Lm(l, t), Os !== null && Os(l, t);
  };
  var xa = c(null);
  function Yi() {
    var l = xa.current;
    return l !== null ? l : El.pooledCache;
  }
  function Fe(l, t) {
    t === null ? p(xa, xa.current) : p(xa, t.pool);
  }
  function Ds() {
    var l = Yi();
    return l === null ? null : { parent: Cl._currentValue, pool: l };
  }
  var du = Error(m(460)), Bi = Error(m(474)), ke = Error(m(542)), Ie = { then: function() {
  } };
  function Us(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function Ns(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(qt, qt), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Hs(l), l;
      default:
        if (typeof t.status == "string") t.then(qt, qt);
        else {
          if (l = El, l !== null && 100 < l.shellSuspendCounter)
            throw Error(m(482));
          l = t, l.status = "pending", l.then(
            function(u) {
              if (t.status === "pending") {
                var e = t;
                e.status = "fulfilled", e.value = u;
              }
            },
            function(u) {
              if (t.status === "pending") {
                var e = t;
                e.status = "rejected", e.reason = u;
              }
            }
          );
        }
        switch (t.status) {
          case "fulfilled":
            return t.value;
          case "rejected":
            throw l = t.reason, Hs(l), l;
        }
        throw Ya = t, du;
    }
  }
  function qa(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (Ya = a, du) : a;
    }
  }
  var Ya = null;
  function Rs() {
    if (Ya === null) throw Error(m(459));
    var l = Ya;
    return Ya = null, l;
  }
  function Hs(l) {
    if (l === du || l === ke)
      throw Error(m(483));
  }
  var ou = null, wu = 0;
  function Pe(l) {
    var t = wu;
    return wu += 1, ou === null && (ou = []), Ns(ou, l, t);
  }
  function Wu(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function ln(l, t) {
    throw t.$$typeof === V ? Error(m(525)) : (l = Object.prototype.toString.call(t), Error(
      m(
        31,
        l === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : l
      )
    ));
  }
  function js(l) {
    function t(o, d) {
      if (l) {
        var y = o.deletions;
        y === null ? (o.deletions = [d], o.flags |= 16) : y.push(d);
      }
    }
    function a(o, d) {
      if (!l) return null;
      for (; d !== null; )
        t(o, d), d = d.sibling;
      return null;
    }
    function u(o) {
      for (var d = /* @__PURE__ */ new Map(); o !== null; )
        o.key !== null ? d.set(o.key, o) : d.set(o.index, o), o = o.sibling;
      return d;
    }
    function e(o, d) {
      return o = Bt(o, d), o.index = 0, o.sibling = null, o;
    }
    function n(o, d, y) {
      return o.index = y, l ? (y = o.alternate, y !== null ? (y = y.index, y < d ? (o.flags |= 67108866, d) : y) : (o.flags |= 67108866, d)) : (o.flags |= 1048576, d);
    }
    function i(o) {
      return l && o.alternate === null && (o.flags |= 67108866), o;
    }
    function f(o, d, y, T) {
      return d === null || d.tag !== 6 ? (d = pi(y, o.mode, T), d.return = o, d) : (d = e(d, y), d.return = o, d);
    }
    function s(o, d, y, T) {
      var Y = y.type;
      return Y === sl ? b(
        o,
        d,
        y.props.children,
        T,
        y.key
      ) : d !== null && (d.elementType === Y || typeof Y == "object" && Y !== null && Y.$$typeof === Nl && qa(Y) === d.type) ? (d = e(d, y.props), Wu(d, y), d.return = o, d) : (d = Je(
        y.type,
        y.key,
        y.props,
        null,
        o.mode,
        T
      ), Wu(d, y), d.return = o, d);
    }
    function v(o, d, y, T) {
      return d === null || d.tag !== 4 || d.stateNode.containerInfo !== y.containerInfo || d.stateNode.implementation !== y.implementation ? (d = Oi(y, o.mode, T), d.return = o, d) : (d = e(d, y.children || []), d.return = o, d);
    }
    function b(o, d, y, T, Y) {
      return d === null || d.tag !== 7 ? (d = Ra(
        y,
        o.mode,
        T,
        Y
      ), d.return = o, d) : (d = e(d, y), d.return = o, d);
    }
    function A(o, d, y) {
      if (typeof d == "string" && d !== "" || typeof d == "number" || typeof d == "bigint")
        return d = pi(
          "" + d,
          o.mode,
          y
        ), d.return = o, d;
      if (typeof d == "object" && d !== null) {
        switch (d.$$typeof) {
          case ol:
            return y = Je(
              d.type,
              d.key,
              d.props,
              null,
              o.mode,
              y
            ), Wu(y, d), y.return = o, y;
          case I:
            return d = Oi(
              d,
              o.mode,
              y
            ), d.return = o, d;
          case Nl:
            return d = qa(d), A(o, d, y);
        }
        if (al(d) || Zl(d))
          return d = Ra(
            d,
            o.mode,
            y,
            null
          ), d.return = o, d;
        if (typeof d.then == "function")
          return A(o, Pe(d), y);
        if (d.$$typeof === Q)
          return A(
            o,
            $e(o, d),
            y
          );
        ln(o, d);
      }
      return null;
    }
    function h(o, d, y, T) {
      var Y = d !== null ? d.key : null;
      if (typeof y == "string" && y !== "" || typeof y == "number" || typeof y == "bigint")
        return Y !== null ? null : f(o, d, "" + y, T);
      if (typeof y == "object" && y !== null) {
        switch (y.$$typeof) {
          case ol:
            return y.key === Y ? s(o, d, y, T) : null;
          case I:
            return y.key === Y ? v(o, d, y, T) : null;
          case Nl:
            return y = qa(y), h(o, d, y, T);
        }
        if (al(y) || Zl(y))
          return Y !== null ? null : b(o, d, y, T, null);
        if (typeof y.then == "function")
          return h(
            o,
            d,
            Pe(y),
            T
          );
        if (y.$$typeof === Q)
          return h(
            o,
            d,
            $e(o, y),
            T
          );
        ln(o, y);
      }
      return null;
    }
    function r(o, d, y, T, Y) {
      if (typeof T == "string" && T !== "" || typeof T == "number" || typeof T == "bigint")
        return o = o.get(y) || null, f(d, o, "" + T, Y);
      if (typeof T == "object" && T !== null) {
        switch (T.$$typeof) {
          case ol:
            return o = o.get(
              T.key === null ? y : T.key
            ) || null, s(d, o, T, Y);
          case I:
            return o = o.get(
              T.key === null ? y : T.key
            ) || null, v(d, o, T, Y);
          case Nl:
            return T = qa(T), r(
              o,
              d,
              y,
              T,
              Y
            );
        }
        if (al(T) || Zl(T))
          return o = o.get(y) || null, b(d, o, T, Y, null);
        if (typeof T.then == "function")
          return r(
            o,
            d,
            y,
            Pe(T),
            Y
          );
        if (T.$$typeof === Q)
          return r(
            o,
            d,
            y,
            $e(d, T),
            Y
          );
        ln(d, T);
      }
      return null;
    }
    function R(o, d, y, T) {
      for (var Y = null, nl = null, q = d, w = d = 0, tl = null; q !== null && w < y.length; w++) {
        q.index > w ? (tl = q, q = null) : tl = q.sibling;
        var il = h(
          o,
          q,
          y[w],
          T
        );
        if (il === null) {
          q === null && (q = tl);
          break;
        }
        l && q && il.alternate === null && t(o, q), d = n(il, d, w), nl === null ? Y = il : nl.sibling = il, nl = il, q = tl;
      }
      if (w === y.length)
        return a(o, q), ul && Gt(o, w), Y;
      if (q === null) {
        for (; w < y.length; w++)
          q = A(o, y[w], T), q !== null && (d = n(
            q,
            d,
            w
          ), nl === null ? Y = q : nl.sibling = q, nl = q);
        return ul && Gt(o, w), Y;
      }
      for (q = u(q); w < y.length; w++)
        tl = r(
          q,
          o,
          w,
          y[w],
          T
        ), tl !== null && (l && tl.alternate !== null && q.delete(
          tl.key === null ? w : tl.key
        ), d = n(
          tl,
          d,
          w
        ), nl === null ? Y = tl : nl.sibling = tl, nl = tl);
      return l && q.forEach(function(Aa) {
        return t(o, Aa);
      }), ul && Gt(o, w), Y;
    }
    function Z(o, d, y, T) {
      if (y == null) throw Error(m(151));
      for (var Y = null, nl = null, q = d, w = d = 0, tl = null, il = y.next(); q !== null && !il.done; w++, il = y.next()) {
        q.index > w ? (tl = q, q = null) : tl = q.sibling;
        var Aa = h(o, q, il.value, T);
        if (Aa === null) {
          q === null && (q = tl);
          break;
        }
        l && q && Aa.alternate === null && t(o, q), d = n(Aa, d, w), nl === null ? Y = Aa : nl.sibling = Aa, nl = Aa, q = tl;
      }
      if (il.done)
        return a(o, q), ul && Gt(o, w), Y;
      if (q === null) {
        for (; !il.done; w++, il = y.next())
          il = A(o, il.value, T), il !== null && (d = n(il, d, w), nl === null ? Y = il : nl.sibling = il, nl = il);
        return ul && Gt(o, w), Y;
      }
      for (q = u(q); !il.done; w++, il = y.next())
        il = r(q, o, w, il.value, T), il !== null && (l && il.alternate !== null && q.delete(il.key === null ? w : il.key), d = n(il, d, w), nl === null ? Y = il : nl.sibling = il, nl = il);
      return l && q.forEach(function(tv) {
        return t(o, tv);
      }), ul && Gt(o, w), Y;
    }
    function gl(o, d, y, T) {
      if (typeof y == "object" && y !== null && y.type === sl && y.key === null && (y = y.props.children), typeof y == "object" && y !== null) {
        switch (y.$$typeof) {
          case ol:
            l: {
              for (var Y = y.key; d !== null; ) {
                if (d.key === Y) {
                  if (Y = y.type, Y === sl) {
                    if (d.tag === 7) {
                      a(
                        o,
                        d.sibling
                      ), T = e(
                        d,
                        y.props.children
                      ), T.return = o, o = T;
                      break l;
                    }
                  } else if (d.elementType === Y || typeof Y == "object" && Y !== null && Y.$$typeof === Nl && qa(Y) === d.type) {
                    a(
                      o,
                      d.sibling
                    ), T = e(d, y.props), Wu(T, y), T.return = o, o = T;
                    break l;
                  }
                  a(o, d);
                  break;
                } else t(o, d);
                d = d.sibling;
              }
              y.type === sl ? (T = Ra(
                y.props.children,
                o.mode,
                T,
                y.key
              ), T.return = o, o = T) : (T = Je(
                y.type,
                y.key,
                y.props,
                null,
                o.mode,
                T
              ), Wu(T, y), T.return = o, o = T);
            }
            return i(o);
          case I:
            l: {
              for (Y = y.key; d !== null; ) {
                if (d.key === Y)
                  if (d.tag === 4 && d.stateNode.containerInfo === y.containerInfo && d.stateNode.implementation === y.implementation) {
                    a(
                      o,
                      d.sibling
                    ), T = e(d, y.children || []), T.return = o, o = T;
                    break l;
                  } else {
                    a(o, d);
                    break;
                  }
                else t(o, d);
                d = d.sibling;
              }
              T = Oi(y, o.mode, T), T.return = o, o = T;
            }
            return i(o);
          case Nl:
            return y = qa(y), gl(
              o,
              d,
              y,
              T
            );
        }
        if (al(y))
          return R(
            o,
            d,
            y,
            T
          );
        if (Zl(y)) {
          if (Y = Zl(y), typeof Y != "function") throw Error(m(150));
          return y = Y.call(y), Z(
            o,
            d,
            y,
            T
          );
        }
        if (typeof y.then == "function")
          return gl(
            o,
            d,
            Pe(y),
            T
          );
        if (y.$$typeof === Q)
          return gl(
            o,
            d,
            $e(o, y),
            T
          );
        ln(o, y);
      }
      return typeof y == "string" && y !== "" || typeof y == "number" || typeof y == "bigint" ? (y = "" + y, d !== null && d.tag === 6 ? (a(o, d.sibling), T = e(d, y), T.return = o, o = T) : (a(o, d), T = pi(y, o.mode, T), T.return = o, o = T), i(o)) : a(o, d);
    }
    return function(o, d, y, T) {
      try {
        wu = 0;
        var Y = gl(
          o,
          d,
          y,
          T
        );
        return ou = null, Y;
      } catch (q) {
        if (q === du || q === ke) throw q;
        var nl = st(29, q, null, o.mode);
        return nl.lanes = T, nl.return = o, nl;
      } finally {
      }
    };
  }
  var Ba = js(!0), Cs = js(!1), ia = !1;
  function Gi(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Qi(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function fa(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function ca(l, t, a) {
    var u = l.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (cl & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = Ke(l), Ss(l, null, a), t;
    }
    return Ve(l, u, t, a), Ke(l);
  }
  function $u(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Mc(l, a);
    }
  }
  function Xi(l, t) {
    var a = l.updateQueue, u = l.alternate;
    if (u !== null && (u = u.updateQueue, a === u)) {
      var e = null, n = null;
      if (a = a.firstBaseUpdate, a !== null) {
        do {
          var i = {
            lane: a.lane,
            tag: a.tag,
            payload: a.payload,
            callback: null,
            next: null
          };
          n === null ? e = n = i : n = n.next = i, a = a.next;
        } while (a !== null);
        n === null ? e = n = t : n = n.next = t;
      } else e = n = t;
      a = {
        baseState: u.baseState,
        firstBaseUpdate: e,
        lastBaseUpdate: n,
        shared: u.shared,
        callbacks: u.callbacks
      }, l.updateQueue = a;
      return;
    }
    l = a.lastBaseUpdate, l === null ? a.firstBaseUpdate = t : l.next = t, a.lastBaseUpdate = t;
  }
  var Zi = !1;
  function Fu() {
    if (Zi) {
      var l = su;
      if (l !== null) throw l;
    }
  }
  function ku(l, t, a, u) {
    Zi = !1;
    var e = l.updateQueue;
    ia = !1;
    var n = e.firstBaseUpdate, i = e.lastBaseUpdate, f = e.shared.pending;
    if (f !== null) {
      e.shared.pending = null;
      var s = f, v = s.next;
      s.next = null, i === null ? n = v : i.next = v, i = s;
      var b = l.alternate;
      b !== null && (b = b.updateQueue, f = b.lastBaseUpdate, f !== i && (f === null ? b.firstBaseUpdate = v : f.next = v, b.lastBaseUpdate = s));
    }
    if (n !== null) {
      var A = e.baseState;
      i = 0, b = v = s = null, f = n;
      do {
        var h = f.lane & -536870913, r = h !== f.lane;
        if (r ? (ll & h) === h : (u & h) === h) {
          h !== 0 && h === cu && (Zi = !0), b !== null && (b = b.next = {
            lane: 0,
            tag: f.tag,
            payload: f.payload,
            callback: null,
            next: null
          });
          l: {
            var R = l, Z = f;
            h = t;
            var gl = a;
            switch (Z.tag) {
              case 1:
                if (R = Z.payload, typeof R == "function") {
                  A = R.call(gl, A, h);
                  break l;
                }
                A = R;
                break l;
              case 3:
                R.flags = R.flags & -65537 | 128;
              case 0:
                if (R = Z.payload, h = typeof R == "function" ? R.call(gl, A, h) : R, h == null) break l;
                A = H({}, A, h);
                break l;
              case 2:
                ia = !0;
            }
          }
          h = f.callback, h !== null && (l.flags |= 64, r && (l.flags |= 8192), r = e.callbacks, r === null ? e.callbacks = [h] : r.push(h));
        } else
          r = {
            lane: h,
            tag: f.tag,
            payload: f.payload,
            callback: f.callback,
            next: null
          }, b === null ? (v = b = r, s = A) : b = b.next = r, i |= h;
        if (f = f.next, f === null) {
          if (f = e.shared.pending, f === null)
            break;
          r = f, f = r.next, r.next = null, e.lastBaseUpdate = r, e.shared.pending = null;
        }
      } while (!0);
      b === null && (s = A), e.baseState = s, e.firstBaseUpdate = v, e.lastBaseUpdate = b, n === null && (e.shared.lanes = 0), ya |= i, l.lanes = i, l.memoizedState = A;
    }
  }
  function xs(l, t) {
    if (typeof l != "function")
      throw Error(m(191, l));
    l.call(t);
  }
  function qs(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        xs(a[l], t);
  }
  var mu = c(null), tn = c(0);
  function Ys(l, t) {
    l = Ft, p(tn, l), p(mu, t), Ft = l | t.baseLanes;
  }
  function Li() {
    p(tn, Ft), p(mu, mu.current);
  }
  function Vi() {
    Ft = tn.current, g(mu), g(tn);
  }
  var dt = c(null), zt = null;
  function sa(l) {
    var t = l.alternate;
    p(Hl, Hl.current & 1), p(dt, l), zt === null && (t === null || mu.current !== null || t.memoizedState !== null) && (zt = l);
  }
  function Ki(l) {
    p(Hl, Hl.current), p(dt, l), zt === null && (zt = l);
  }
  function Bs(l) {
    l.tag === 22 ? (p(Hl, Hl.current), p(dt, l), zt === null && (zt = l)) : da();
  }
  function da() {
    p(Hl, Hl.current), p(dt, dt.current);
  }
  function ot(l) {
    g(dt), zt === l && (zt = null), g(Hl);
  }
  var Hl = c(0);
  function an(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || If(a) || Pf(a)))
          return t;
      } else if (t.tag === 19 && (t.memoizedProps.revealOrder === "forwards" || t.memoizedProps.revealOrder === "backwards" || t.memoizedProps.revealOrder === "unstable_legacy-backwards" || t.memoizedProps.revealOrder === "together")) {
        if ((t.flags & 128) !== 0) return t;
      } else if (t.child !== null) {
        t.child.return = t, t = t.child;
        continue;
      }
      if (t === l) break;
      for (; t.sibling === null; ) {
        if (t.return === null || t.return === l) return null;
        t = t.return;
      }
      t.sibling.return = t.return, t = t.sibling;
    }
    return null;
  }
  var Zt = 0, J = null, rl = null, xl = null, un = !1, yu = !1, Ga = !1, en = 0, Iu = 0, vu = null, Km = 0;
  function pl() {
    throw Error(m(321));
  }
  function Ji(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!ct(l[a], t[a])) return !1;
    return !0;
  }
  function wi(l, t, a, u, e, n) {
    return Zt = n, J = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, E.H = l === null || l.memoizedState === null ? T0 : sf, Ga = !1, n = a(u, e), Ga = !1, yu && (n = Qs(
      t,
      a,
      u,
      e
    )), Gs(l), n;
  }
  function Gs(l) {
    E.H = te;
    var t = rl !== null && rl.next !== null;
    if (Zt = 0, xl = rl = J = null, un = !1, Iu = 0, vu = null, t) throw Error(m(300));
    l === null || ql || (l = l.dependencies, l !== null && We(l) && (ql = !0));
  }
  function Qs(l, t, a, u) {
    J = l;
    var e = 0;
    do {
      if (yu && (vu = null), Iu = 0, yu = !1, 25 <= e) throw Error(m(301));
      if (e += 1, xl = rl = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      E.H = z0, n = t(a, u);
    } while (yu);
    return n;
  }
  function Jm() {
    var l = E.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? Pu(t) : t, l = l.useState()[0], (rl !== null ? rl.memoizedState : null) !== l && (J.flags |= 1024), t;
  }
  function Wi() {
    var l = en !== 0;
    return en = 0, l;
  }
  function $i(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function Fi(l) {
    if (un) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      un = !1;
    }
    Zt = 0, xl = rl = J = null, yu = !1, Iu = en = 0, vu = null;
  }
  function $l() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return xl === null ? J.memoizedState = xl = l : xl = xl.next = l, xl;
  }
  function jl() {
    if (rl === null) {
      var l = J.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = rl.next;
    var t = xl === null ? J.memoizedState : xl.next;
    if (t !== null)
      xl = t, rl = l;
    else {
      if (l === null)
        throw J.alternate === null ? Error(m(467)) : Error(m(310));
      rl = l, l = {
        memoizedState: rl.memoizedState,
        baseState: rl.baseState,
        baseQueue: rl.baseQueue,
        queue: rl.queue,
        next: null
      }, xl === null ? J.memoizedState = xl = l : xl = xl.next = l;
    }
    return xl;
  }
  function nn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function Pu(l) {
    var t = Iu;
    return Iu += 1, vu === null && (vu = []), l = Ns(vu, l, t), t = J, (xl === null ? t.memoizedState : xl.next) === null && (t = t.alternate, E.H = t === null || t.memoizedState === null ? T0 : sf), l;
  }
  function fn(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return Pu(l);
      if (l.$$typeof === Q) return Kl(l);
    }
    throw Error(m(438, String(l)));
  }
  function ki(l) {
    var t = null, a = J.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var u = J.alternate;
      u !== null && (u = u.updateQueue, u !== null && (u = u.memoCache, u != null && (t = {
        data: u.data.map(function(e) {
          return e.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = nn(), J.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), u = 0; u < l; u++)
        a[u] = ut;
    return t.index++, a;
  }
  function Lt(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function cn(l) {
    var t = jl();
    return Ii(t, rl, l);
  }
  function Ii(l, t, a) {
    var u = l.queue;
    if (u === null) throw Error(m(311));
    u.lastRenderedReducer = a;
    var e = l.baseQueue, n = u.pending;
    if (n !== null) {
      if (e !== null) {
        var i = e.next;
        e.next = n.next, n.next = i;
      }
      t.baseQueue = e = n, u.pending = null;
    }
    if (n = l.baseState, e === null) l.memoizedState = n;
    else {
      t = e.next;
      var f = i = null, s = null, v = t, b = !1;
      do {
        var A = v.lane & -536870913;
        if (A !== v.lane ? (ll & A) === A : (Zt & A) === A) {
          var h = v.revertLane;
          if (h === 0)
            s !== null && (s = s.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }), A === cu && (b = !0);
          else if ((Zt & h) === h) {
            v = v.next, h === cu && (b = !0);
            continue;
          } else
            A = {
              lane: 0,
              revertLane: v.revertLane,
              gesture: null,
              action: v.action,
              hasEagerState: v.hasEagerState,
              eagerState: v.eagerState,
              next: null
            }, s === null ? (f = s = A, i = n) : s = s.next = A, J.lanes |= h, ya |= h;
          A = v.action, Ga && a(n, A), n = v.hasEagerState ? v.eagerState : a(n, A);
        } else
          h = {
            lane: A,
            revertLane: v.revertLane,
            gesture: v.gesture,
            action: v.action,
            hasEagerState: v.hasEagerState,
            eagerState: v.eagerState,
            next: null
          }, s === null ? (f = s = h, i = n) : s = s.next = h, J.lanes |= A, ya |= A;
        v = v.next;
      } while (v !== null && v !== t);
      if (s === null ? i = n : s.next = f, !ct(n, l.memoizedState) && (ql = !0, b && (a = su, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = s, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function Pi(l) {
    var t = jl(), a = t.queue;
    if (a === null) throw Error(m(311));
    a.lastRenderedReducer = l;
    var u = a.dispatch, e = a.pending, n = t.memoizedState;
    if (e !== null) {
      a.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      ct(n, t.memoizedState) || (ql = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function Xs(l, t, a) {
    var u = J, e = jl(), n = ul;
    if (n) {
      if (a === void 0) throw Error(m(407));
      a = a();
    } else a = t();
    var i = !ct(
      (rl || e).memoizedState,
      a
    );
    if (i && (e.memoizedState = a, ql = !0), e = e.queue, af(Vs.bind(null, u, e, l), [
      l
    ]), e.getSnapshot !== t || i || xl !== null && xl.memoizedState.tag & 1) {
      if (u.flags |= 2048, hu(
        9,
        { destroy: void 0 },
        Ls.bind(
          null,
          u,
          e,
          a,
          t
        ),
        null
      ), El === null) throw Error(m(349));
      n || (Zt & 127) !== 0 || Zs(u, t, a);
    }
    return a;
  }
  function Zs(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = J.updateQueue, t === null ? (t = nn(), J.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
  }
  function Ls(l, t, a, u) {
    t.value = a, t.getSnapshot = u, Ks(t) && Js(l);
  }
  function Vs(l, t, a) {
    return a(function() {
      Ks(t) && Js(l);
    });
  }
  function Ks(l) {
    var t = l.getSnapshot;
    l = l.value;
    try {
      var a = t();
      return !ct(l, a);
    } catch {
      return !0;
    }
  }
  function Js(l) {
    var t = Na(l, 2);
    t !== null && at(t, l, 2);
  }
  function lf(l) {
    var t = $l();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), Ga) {
        Pt(!0);
        try {
          a();
        } finally {
          Pt(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Lt,
      lastRenderedState: l
    }, t;
  }
  function ws(l, t, a, u) {
    return l.baseState = a, Ii(
      l,
      rl,
      typeof u == "function" ? u : Lt
    );
  }
  function wm(l, t, a, u, e) {
    if (on(l)) throw Error(m(485));
    if (l = t.action, l !== null) {
      var n = {
        payload: e,
        action: l,
        next: null,
        isTransition: !0,
        status: "pending",
        value: null,
        reason: null,
        listeners: [],
        then: function(i) {
          n.listeners.push(i);
        }
      };
      E.T !== null ? a(!0) : n.isTransition = !1, u(n), a = t.pending, a === null ? (n.next = t.pending = n, Ws(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function Ws(l, t) {
    var a = t.action, u = t.payload, e = l.state;
    if (t.isTransition) {
      var n = E.T, i = {};
      E.T = i;
      try {
        var f = a(e, u), s = E.S;
        s !== null && s(i, f), $s(l, t, f);
      } catch (v) {
        tf(l, t, v);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), E.T = n;
      }
    } else
      try {
        n = a(e, u), $s(l, t, n);
      } catch (v) {
        tf(l, t, v);
      }
  }
  function $s(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(u) {
        Fs(l, t, u);
      },
      function(u) {
        return tf(l, t, u);
      }
    ) : Fs(l, t, a);
  }
  function Fs(l, t, a) {
    t.status = "fulfilled", t.value = a, ks(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, Ws(l, a)));
  }
  function tf(l, t, a) {
    var u = l.pending;
    if (l.pending = null, u !== null) {
      u = u.next;
      do
        t.status = "rejected", t.reason = a, ks(t), t = t.next;
      while (t !== u);
    }
    l.action = null;
  }
  function ks(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function Is(l, t) {
    return t;
  }
  function Ps(l, t) {
    if (ul) {
      var a = El.formState;
      if (a !== null) {
        l: {
          var u = J;
          if (ul) {
            if (Tl) {
              t: {
                for (var e = Tl, n = Tt; e.nodeType !== 8; ) {
                  if (!n) {
                    e = null;
                    break t;
                  }
                  if (e = At(
                    e.nextSibling
                  ), e === null) {
                    e = null;
                    break t;
                  }
                }
                n = e.data, e = n === "F!" || n === "F" ? e : null;
              }
              if (e) {
                Tl = At(
                  e.nextSibling
                ), u = e.data === "F!";
                break l;
              }
            }
            ea(u);
          }
          u = !1;
        }
        u && (t = a[0]);
      }
    }
    return a = $l(), a.memoizedState = a.baseState = t, u = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Is,
      lastRenderedState: t
    }, a.queue = u, a = g0.bind(
      null,
      J,
      u
    ), u.dispatch = a, u = lf(!1), n = cf.bind(
      null,
      J,
      !1,
      u.queue
    ), u = $l(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, u.queue = e, a = wm.bind(
      null,
      J,
      e,
      n,
      a
    ), e.dispatch = a, u.memoizedState = l, [t, a, !1];
  }
  function l0(l) {
    var t = jl();
    return t0(t, rl, l);
  }
  function t0(l, t, a) {
    if (t = Ii(
      l,
      t,
      Is
    )[0], l = cn(Lt)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var u = Pu(t);
      } catch (i) {
        throw i === du ? ke : i;
      }
    else u = t;
    t = jl();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (J.flags |= 2048, hu(
      9,
      { destroy: void 0 },
      Wm.bind(null, e, a),
      null
    )), [u, n, l];
  }
  function Wm(l, t) {
    l.action = t;
  }
  function a0(l) {
    var t = jl(), a = rl;
    if (a !== null)
      return t0(t, a, l);
    jl(), t = t.memoizedState, a = jl();
    var u = a.queue.dispatch;
    return a.memoizedState = l, [t, u, !1];
  }
  function hu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = J.updateQueue, t === null && (t = nn(), J.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function u0() {
    return jl().memoizedState;
  }
  function sn(l, t, a, u) {
    var e = $l();
    J.flags |= l, e.memoizedState = hu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function dn(l, t, a, u) {
    var e = jl();
    u = u === void 0 ? null : u;
    var n = e.memoizedState.inst;
    rl !== null && u !== null && Ji(u, rl.memoizedState.deps) ? e.memoizedState = hu(t, n, a, u) : (J.flags |= l, e.memoizedState = hu(
      1 | t,
      n,
      a,
      u
    ));
  }
  function e0(l, t) {
    sn(8390656, 8, l, t);
  }
  function af(l, t) {
    dn(2048, 8, l, t);
  }
  function $m(l) {
    J.flags |= 4;
    var t = J.updateQueue;
    if (t === null)
      t = nn(), J.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function n0(l) {
    var t = jl().memoizedState;
    return $m({ ref: t, nextImpl: l }), function() {
      if ((cl & 2) !== 0) throw Error(m(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function i0(l, t) {
    return dn(4, 2, l, t);
  }
  function f0(l, t) {
    return dn(4, 4, l, t);
  }
  function c0(l, t) {
    if (typeof t == "function") {
      l = l();
      var a = t(l);
      return function() {
        typeof a == "function" ? a() : t(null);
      };
    }
    if (t != null)
      return l = l(), t.current = l, function() {
        t.current = null;
      };
  }
  function s0(l, t, a) {
    a = a != null ? a.concat([l]) : null, dn(4, 4, c0.bind(null, t, l), a);
  }
  function uf() {
  }
  function d0(l, t) {
    var a = jl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && Ji(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function o0(l, t) {
    var a = jl();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    if (t !== null && Ji(t, u[1]))
      return u[0];
    if (u = l(), Ga) {
      Pt(!0);
      try {
        l();
      } finally {
        Pt(!1);
      }
    }
    return a.memoizedState = [u, t], u;
  }
  function ef(l, t, a) {
    return a === void 0 || (Zt & 1073741824) !== 0 && (ll & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = md(), J.lanes |= l, ya |= l, a);
  }
  function m0(l, t, a, u) {
    return ct(a, t) ? a : mu.current !== null ? (l = ef(l, a, u), ct(l, t) || (ql = !0), l) : (Zt & 42) === 0 || (Zt & 1073741824) !== 0 && (ll & 261930) === 0 ? (ql = !0, l.memoizedState = a) : (l = md(), J.lanes |= l, ya |= l, t);
  }
  function y0(l, t, a, u, e) {
    var n = U.p;
    U.p = n !== 0 && 8 > n ? n : 8;
    var i = E.T, f = {};
    E.T = f, cf(l, !1, t, a);
    try {
      var s = e(), v = E.S;
      if (v !== null && v(f, s), s !== null && typeof s == "object" && typeof s.then == "function") {
        var b = Vm(
          s,
          u
        );
        le(
          l,
          t,
          b,
          vt(l)
        );
      } else
        le(
          l,
          t,
          u,
          vt(l)
        );
    } catch (A) {
      le(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: A },
        vt()
      );
    } finally {
      U.p = n, i !== null && f.types !== null && (i.types = f.types), E.T = i;
    }
  }
  function Fm() {
  }
  function nf(l, t, a, u) {
    if (l.tag !== 5) throw Error(m(476));
    var e = v0(l).queue;
    y0(
      l,
      e,
      t,
      X,
      a === null ? Fm : function() {
        return h0(l), a(u);
      }
    );
  }
  function v0(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: X,
      baseState: X,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Lt,
        lastRenderedState: X
      },
      next: null
    };
    var a = {};
    return t.next = {
      memoizedState: a,
      baseState: a,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Lt,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function h0(l) {
    var t = v0(l);
    t.next === null && (t = l.alternate.memoizedState), le(
      l,
      t.next.queue,
      {},
      vt()
    );
  }
  function ff() {
    return Kl(Se);
  }
  function r0() {
    return jl().memoizedState;
  }
  function S0() {
    return jl().memoizedState;
  }
  function km(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = vt();
          l = fa(a);
          var u = ca(t, l, a);
          u !== null && (at(u, t, a), $u(u, t, a)), t = { cache: xi() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function Im(l, t, a) {
    var u = vt();
    a = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, on(l) ? b0(t, a) : (a = _i(l, t, a, u), a !== null && (at(a, l, u), E0(a, t, u)));
  }
  function g0(l, t, a) {
    var u = vt();
    le(l, t, a, u);
  }
  function le(l, t, a, u) {
    var e = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (on(l)) b0(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, f = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = f, ct(f, i))
            return Ve(l, t, e, 0), El === null && Le(), !1;
        } catch {
        } finally {
        }
      if (a = _i(l, t, e, u), a !== null)
        return at(a, l, u), E0(a, t, u), !0;
    }
    return !1;
  }
  function cf(l, t, a, u) {
    if (u = {
      lane: 2,
      revertLane: Qf(),
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, on(l)) {
      if (t) throw Error(m(479));
    } else
      t = _i(
        l,
        a,
        u,
        2
      ), t !== null && at(t, l, 2);
  }
  function on(l) {
    var t = l.alternate;
    return l === J || t !== null && t === J;
  }
  function b0(l, t) {
    yu = un = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function E0(l, t, a) {
    if ((a & 4194048) !== 0) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Mc(l, a);
    }
  }
  var te = {
    readContext: Kl,
    use: fn,
    useCallback: pl,
    useContext: pl,
    useEffect: pl,
    useImperativeHandle: pl,
    useLayoutEffect: pl,
    useInsertionEffect: pl,
    useMemo: pl,
    useReducer: pl,
    useRef: pl,
    useState: pl,
    useDebugValue: pl,
    useDeferredValue: pl,
    useTransition: pl,
    useSyncExternalStore: pl,
    useId: pl,
    useHostTransitionStatus: pl,
    useFormState: pl,
    useActionState: pl,
    useOptimistic: pl,
    useMemoCache: pl,
    useCacheRefresh: pl
  };
  te.useEffectEvent = pl;
  var T0 = {
    readContext: Kl,
    use: fn,
    useCallback: function(l, t) {
      return $l().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Kl,
    useEffect: e0,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, sn(
        4194308,
        4,
        c0.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return sn(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      sn(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = $l();
      t = t === void 0 ? null : t;
      var u = l();
      if (Ga) {
        Pt(!0);
        try {
          l();
        } finally {
          Pt(!1);
        }
      }
      return a.memoizedState = [u, t], u;
    },
    useReducer: function(l, t, a) {
      var u = $l();
      if (a !== void 0) {
        var e = a(t);
        if (Ga) {
          Pt(!0);
          try {
            a(t);
          } finally {
            Pt(!1);
          }
        }
      } else e = t;
      return u.memoizedState = u.baseState = e, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: e
      }, u.queue = l, l = l.dispatch = Im.bind(
        null,
        J,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = $l();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = lf(l);
      var t = l.queue, a = g0.bind(null, J, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: uf,
    useDeferredValue: function(l, t) {
      var a = $l();
      return ef(a, l, t);
    },
    useTransition: function() {
      var l = lf(!1);
      return l = y0.bind(
        null,
        J,
        l.queue,
        !0,
        !1
      ), $l().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = J, e = $l();
      if (ul) {
        if (a === void 0)
          throw Error(m(407));
        a = a();
      } else {
        if (a = t(), El === null)
          throw Error(m(349));
        (ll & 127) !== 0 || Zs(u, t, a);
      }
      e.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return e.queue = n, e0(Vs.bind(null, u, n, l), [
        l
      ]), u.flags |= 2048, hu(
        9,
        { destroy: void 0 },
        Ls.bind(
          null,
          u,
          n,
          a,
          t
        ),
        null
      ), a;
    },
    useId: function() {
      var l = $l(), t = El.identifierPrefix;
      if (ul) {
        var a = Ht, u = Rt;
        a = (u & ~(1 << 32 - ft(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = en++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = Km++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: ff,
    useFormState: Ps,
    useActionState: Ps,
    useOptimistic: function(l) {
      var t = $l();
      t.memoizedState = t.baseState = l;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = a, t = cf.bind(
        null,
        J,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: ki,
    useCacheRefresh: function() {
      return $l().memoizedState = km.bind(
        null,
        J
      );
    },
    useEffectEvent: function(l) {
      var t = $l(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((cl & 2) !== 0)
          throw Error(m(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, sf = {
    readContext: Kl,
    use: fn,
    useCallback: d0,
    useContext: Kl,
    useEffect: af,
    useImperativeHandle: s0,
    useInsertionEffect: i0,
    useLayoutEffect: f0,
    useMemo: o0,
    useReducer: cn,
    useRef: u0,
    useState: function() {
      return cn(Lt);
    },
    useDebugValue: uf,
    useDeferredValue: function(l, t) {
      var a = jl();
      return m0(
        a,
        rl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = cn(Lt)[0], t = jl().memoizedState;
      return [
        typeof l == "boolean" ? l : Pu(l),
        t
      ];
    },
    useSyncExternalStore: Xs,
    useId: r0,
    useHostTransitionStatus: ff,
    useFormState: l0,
    useActionState: l0,
    useOptimistic: function(l, t) {
      var a = jl();
      return ws(a, rl, l, t);
    },
    useMemoCache: ki,
    useCacheRefresh: S0
  };
  sf.useEffectEvent = n0;
  var z0 = {
    readContext: Kl,
    use: fn,
    useCallback: d0,
    useContext: Kl,
    useEffect: af,
    useImperativeHandle: s0,
    useInsertionEffect: i0,
    useLayoutEffect: f0,
    useMemo: o0,
    useReducer: Pi,
    useRef: u0,
    useState: function() {
      return Pi(Lt);
    },
    useDebugValue: uf,
    useDeferredValue: function(l, t) {
      var a = jl();
      return rl === null ? ef(a, l, t) : m0(
        a,
        rl.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = Pi(Lt)[0], t = jl().memoizedState;
      return [
        typeof l == "boolean" ? l : Pu(l),
        t
      ];
    },
    useSyncExternalStore: Xs,
    useId: r0,
    useHostTransitionStatus: ff,
    useFormState: a0,
    useActionState: a0,
    useOptimistic: function(l, t) {
      var a = jl();
      return rl !== null ? ws(a, rl, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: ki,
    useCacheRefresh: S0
  };
  z0.useEffectEvent = n0;
  function df(l, t, a, u) {
    t = l.memoizedState, a = a(u, t), a = a == null ? t : H({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var of = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var u = vt(), e = fa(u);
      e.payload = t, a != null && (e.callback = a), t = ca(l, e, u), t !== null && (at(t, l, u), $u(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = vt(), e = fa(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = ca(l, e, u), t !== null && (at(t, l, u), $u(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = vt(), u = fa(a);
      u.tag = 2, t != null && (u.callback = t), t = ca(l, u, a), t !== null && (at(t, l, a), $u(t, l, a));
    }
  };
  function A0(l, t, a, u, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(u, n, i) : t.prototype && t.prototype.isPureReactComponent ? !Xu(a, u) || !Xu(e, n) : !0;
  }
  function _0(l, t, a, u) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, u), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, u), t.state !== l && of.enqueueReplaceState(t, t.state, null);
  }
  function Qa(l, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var u in t)
        u !== "ref" && (a[u] = t[u]);
    }
    if (l = l.defaultProps) {
      a === t && (a = H({}, a));
      for (var e in l)
        a[e] === void 0 && (a[e] = l[e]);
    }
    return a;
  }
  function M0(l) {
    Ze(l);
  }
  function p0(l) {
    console.error(l);
  }
  function O0(l) {
    Ze(l);
  }
  function mn(l, t) {
    try {
      var a = l.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function D0(l, t, a) {
    try {
      var u = l.onCaughtError;
      u(a.value, {
        componentStack: a.stack,
        errorBoundary: t.tag === 1 ? t.stateNode : null
      });
    } catch (e) {
      setTimeout(function() {
        throw e;
      });
    }
  }
  function mf(l, t, a) {
    return a = fa(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      mn(l, t);
    }, a;
  }
  function U0(l) {
    return l = fa(l), l.tag = 3, l;
  }
  function N0(l, t, a, u) {
    var e = a.type.getDerivedStateFromError;
    if (typeof e == "function") {
      var n = u.value;
      l.payload = function() {
        return e(n);
      }, l.callback = function() {
        D0(t, a, u);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      D0(t, a, u), typeof e != "function" && (va === null ? va = /* @__PURE__ */ new Set([this]) : va.add(this));
      var f = u.stack;
      this.componentDidCatch(u.value, {
        componentStack: f !== null ? f : ""
      });
    });
  }
  function Pm(l, t, a, u, e) {
    if (a.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
      if (t = a.alternate, t !== null && fu(
        t,
        a,
        e,
        !0
      ), a = dt.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
            return zt === null ? _n() : a.alternate === null && Ol === 0 && (Ol = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === Ie ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Yf(l, u, e)), !1;
          case 22:
            return a.flags |= 65536, u === Ie ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([u])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([u]) : a.add(u)), Yf(l, u, e)), !1;
        }
        throw Error(m(435, a.tag));
      }
      return Yf(l, u, e), _n(), !1;
    }
    if (ul)
      return t = dt.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== Ni && (l = Error(m(422), { cause: u }), Vu(gt(l, a)))) : (u !== Ni && (t = Error(m(423), {
        cause: u
      }), Vu(
        gt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = gt(u, a), e = mf(
        l.stateNode,
        u,
        e
      ), Xi(l, e), Ol !== 4 && (Ol = 2)), !1;
    var n = Error(m(520), { cause: u });
    if (n = gt(n, a), se === null ? se = [n] : se.push(n), Ol !== 4 && (Ol = 2), t === null) return !0;
    u = gt(u, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = e & -e, a.lanes |= l, l = mf(a.stateNode, u, l), Xi(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (va === null || !va.has(n))))
            return a.flags |= 65536, e &= -e, a.lanes |= e, e = U0(e), N0(
              e,
              l,
              a,
              u
            ), Xi(a, e), !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var yf = Error(m(461)), ql = !1;
  function Jl(l, t, a, u) {
    t.child = l === null ? Cs(t, null, a, u) : Ba(
      t,
      l.child,
      a,
      u
    );
  }
  function R0(l, t, a, u, e) {
    a = a.render;
    var n = t.ref;
    if ("ref" in u) {
      var i = {};
      for (var f in u)
        f !== "ref" && (i[f] = u[f]);
    } else i = u;
    return Ca(t), u = wi(
      l,
      t,
      a,
      i,
      n,
      e
    ), f = Wi(), l !== null && !ql ? ($i(l, t, e), Vt(l, t, e)) : (ul && f && Di(t), t.flags |= 1, Jl(l, t, u, e), t.child);
  }
  function H0(l, t, a, u, e) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !Mi(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, j0(
        l,
        t,
        n,
        u,
        e
      )) : (l = Je(
        a.type,
        null,
        u,
        t,
        t.mode,
        e
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !Tf(l, e)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : Xu, a(i, u) && l.ref === t.ref)
        return Vt(l, t, e);
    }
    return t.flags |= 1, l = Bt(n, u), l.ref = t.ref, l.return = t, t.child = l;
  }
  function j0(l, t, a, u, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (Xu(n, u) && l.ref === t.ref)
        if (ql = !1, t.pendingProps = u = n, Tf(l, e))
          (l.flags & 131072) !== 0 && (ql = !0);
        else
          return t.lanes = l.lanes, Vt(l, t, e);
    }
    return vf(
      l,
      t,
      a,
      u,
      e
    );
  }
  function C0(l, t, a, u) {
    var e = u.children, n = l !== null ? l.memoizedState : null;
    if (l === null && t.stateNode === null && (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), u.mode === "hidden") {
      if ((t.flags & 128) !== 0) {
        if (n = n !== null ? n.baseLanes | a : a, l !== null) {
          for (u = t.child = l.child, e = 0; u !== null; )
            e = e | u.lanes | u.childLanes, u = u.sibling;
          u = e & ~n;
        } else u = 0, t.child = null;
        return x0(
          l,
          t,
          n,
          a,
          u
        );
      }
      if ((a & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && Fe(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? Ys(t, n) : Li(), Bs(t);
      else
        return u = t.lanes = 536870912, x0(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (Fe(t, n.cachePool), Ys(t, n), da(), t.memoizedState = null) : (l !== null && Fe(t, null), Li(), da());
    return Jl(l, t, e, a), t.child;
  }
  function ae(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function x0(l, t, a, u, e) {
    var n = Yi();
    return n = n === null ? null : { parent: Cl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && Fe(t, null), Li(), Bs(t), l !== null && fu(l, t, u, !0), t.childLanes = e, null;
  }
  function yn(l, t) {
    return t = hn(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function q0(l, t, a) {
    return Ba(t, l.child, null, a), l = yn(t, t.pendingProps), l.flags |= 2, ot(t), t.memoizedState = null, l;
  }
  function ly(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (ul) {
        if (u.mode === "hidden")
          return l = yn(t, u), t.lanes = 536870912, ae(null, l);
        if (Ki(t), (l = Tl) ? (l = Wd(
          l,
          Tt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: aa !== null ? { id: Rt, overflow: Ht } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = bs(l), a.return = t, t.child = a, Vl = t, Tl = null)) : l = null, l === null) throw ea(t);
        return t.lanes = 536870912, null;
      }
      return yn(t, u);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Ki(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = q0(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(m(558));
      else if (ql || fu(l, t, a, !1), e = (a & l.childLanes) !== 0, ql || e) {
        if (u = El, u !== null && (i = pc(u, a), i !== 0 && i !== n.retryLane))
          throw n.retryLane = i, Na(l, i), at(u, l, i), yf;
        _n(), t = q0(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, Tl = At(i.nextSibling), Vl = t, ul = !0, ua = null, Tt = !1, l !== null && zs(t, l), t = yn(t, u), t.flags |= 4096;
      return t;
    }
    return l = Bt(l.child, {
      mode: u.mode,
      children: u.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function vn(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(m(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function vf(l, t, a, u, e) {
    return Ca(t), a = wi(
      l,
      t,
      a,
      u,
      void 0,
      e
    ), u = Wi(), l !== null && !ql ? ($i(l, t, e), Vt(l, t, e)) : (ul && u && Di(t), t.flags |= 1, Jl(l, t, a, e), t.child);
  }
  function Y0(l, t, a, u, e, n) {
    return Ca(t), t.updateQueue = null, a = Qs(
      t,
      u,
      a,
      e
    ), Gs(l), u = Wi(), l !== null && !ql ? ($i(l, t, n), Vt(l, t, n)) : (ul && u && Di(t), t.flags |= 1, Jl(l, t, a, n), t.child);
  }
  function B0(l, t, a, u, e) {
    if (Ca(t), t.stateNode === null) {
      var n = uu, i = a.contextType;
      typeof i == "object" && i !== null && (n = Kl(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = of, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, Gi(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Kl(i) : uu, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (df(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && of.enqueueReplaceState(n, n.state, null), ku(t, u, n, e), Fu(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var f = t.memoizedProps, s = Qa(a, f);
      n.props = s;
      var v = n.context, b = a.contextType;
      i = uu, typeof b == "object" && b !== null && (i = Kl(b));
      var A = a.getDerivedStateFromProps;
      b = typeof A == "function" || typeof n.getSnapshotBeforeUpdate == "function", f = t.pendingProps !== f, b || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (f || v !== i) && _0(
        t,
        n,
        u,
        i
      ), ia = !1;
      var h = t.memoizedState;
      n.state = h, ku(t, u, n, e), Fu(), v = t.memoizedState, f || h !== v || ia ? (typeof A == "function" && (df(
        t,
        a,
        A,
        u
      ), v = t.memoizedState), (s = ia || A0(
        t,
        a,
        s,
        u,
        h,
        v,
        i
      )) ? (b || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = u, t.memoizedState = v), n.props = u, n.state = v, n.context = i, u = s) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !1);
    } else {
      n = t.stateNode, Qi(l, t), i = t.memoizedProps, b = Qa(a, i), n.props = b, A = t.pendingProps, h = n.context, v = a.contextType, s = uu, typeof v == "object" && v !== null && (s = Kl(v)), f = a.getDerivedStateFromProps, (v = typeof f == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== A || h !== s) && _0(
        t,
        n,
        u,
        s
      ), ia = !1, h = t.memoizedState, n.state = h, ku(t, u, n, e), Fu();
      var r = t.memoizedState;
      i !== A || h !== r || ia || l !== null && l.dependencies !== null && We(l.dependencies) ? (typeof f == "function" && (df(
        t,
        a,
        f,
        u
      ), r = t.memoizedState), (b = ia || A0(
        t,
        a,
        b,
        u,
        h,
        r,
        s
      ) || l !== null && l.dependencies !== null && We(l.dependencies)) ? (v || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(u, r, s), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        u,
        r,
        s
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 1024), t.memoizedProps = u, t.memoizedState = r), n.props = u, n.state = r, n.context = s, u = b) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 1024), u = !1);
    }
    return n = u, vn(l, t), u = (t.flags & 128) !== 0, n || u ? (n = t.stateNode, a = u && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && u ? (t.child = Ba(
      t,
      l.child,
      null,
      e
    ), t.child = Ba(
      t,
      null,
      a,
      e
    )) : Jl(l, t, a, e), t.memoizedState = n.state, l = t.child) : l = Vt(
      l,
      t,
      e
    ), l;
  }
  function G0(l, t, a, u) {
    return Ha(), t.flags |= 256, Jl(l, t, a, u), t.child;
  }
  var hf = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function rf(l) {
    return { baseLanes: l, cachePool: Ds() };
  }
  function Sf(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= yt), l;
  }
  function Q0(l, t, a) {
    var u = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (Hl.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (ul) {
        if (e ? sa(t) : da(), (l = Tl) ? (l = Wd(
          l,
          Tt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: aa !== null ? { id: Rt, overflow: Ht } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = bs(l), a.return = t, t.child = a, Vl = t, Tl = null)) : l = null, l === null) throw ea(t);
        return Pf(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      var f = u.children;
      return u = u.fallback, e ? (da(), e = t.mode, f = hn(
        { mode: "hidden", children: f },
        e
      ), u = Ra(
        u,
        e,
        a,
        null
      ), f.return = t, u.return = t, f.sibling = u, t.child = f, u = t.child, u.memoizedState = rf(a), u.childLanes = Sf(
        l,
        i,
        a
      ), t.memoizedState = hf, ae(null, u)) : (sa(t), gf(t, f));
    }
    var s = l.memoizedState;
    if (s !== null && (f = s.dehydrated, f !== null)) {
      if (n)
        t.flags & 256 ? (sa(t), t.flags &= -257, t = bf(
          l,
          t,
          a
        )) : t.memoizedState !== null ? (da(), t.child = l.child, t.flags |= 128, t = null) : (da(), f = u.fallback, e = t.mode, u = hn(
          { mode: "visible", children: u.children },
          e
        ), f = Ra(
          f,
          e,
          a,
          null
        ), f.flags |= 2, u.return = t, f.return = t, u.sibling = f, t.child = u, Ba(
          t,
          l.child,
          null,
          a
        ), u = t.child, u.memoizedState = rf(a), u.childLanes = Sf(
          l,
          i,
          a
        ), t.memoizedState = hf, t = ae(null, u));
      else if (sa(t), Pf(f)) {
        if (i = f.nextSibling && f.nextSibling.dataset, i) var v = i.dgst;
        i = v, u = Error(m(419)), u.stack = "", u.digest = i, Vu({ value: u, source: null, stack: null }), t = bf(
          l,
          t,
          a
        );
      } else if (ql || fu(l, t, a, !1), i = (a & l.childLanes) !== 0, ql || i) {
        if (i = El, i !== null && (u = pc(i, a), u !== 0 && u !== s.retryLane))
          throw s.retryLane = u, Na(l, u), at(i, l, u), yf;
        If(f) || _n(), t = bf(
          l,
          t,
          a
        );
      } else
        If(f) ? (t.flags |= 192, t.child = l.child, t = null) : (l = s.treeContext, Tl = At(
          f.nextSibling
        ), Vl = t, ul = !0, ua = null, Tt = !1, l !== null && zs(t, l), t = gf(
          t,
          u.children
        ), t.flags |= 4096);
      return t;
    }
    return e ? (da(), f = u.fallback, e = t.mode, s = l.child, v = s.sibling, u = Bt(s, {
      mode: "hidden",
      children: u.children
    }), u.subtreeFlags = s.subtreeFlags & 65011712, v !== null ? f = Bt(
      v,
      f
    ) : (f = Ra(
      f,
      e,
      a,
      null
    ), f.flags |= 2), f.return = t, u.return = t, u.sibling = f, t.child = u, ae(null, u), u = t.child, f = l.child.memoizedState, f === null ? f = rf(a) : (e = f.cachePool, e !== null ? (s = Cl._currentValue, e = e.parent !== s ? { parent: s, pool: s } : e) : e = Ds(), f = {
      baseLanes: f.baseLanes | a,
      cachePool: e
    }), u.memoizedState = f, u.childLanes = Sf(
      l,
      i,
      a
    ), t.memoizedState = hf, ae(l.child, u)) : (sa(t), a = l.child, l = a.sibling, a = Bt(a, {
      mode: "visible",
      children: u.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function gf(l, t) {
    return t = hn(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function hn(l, t) {
    return l = st(22, l, null, t), l.lanes = 0, l;
  }
  function bf(l, t, a) {
    return Ba(t, l.child, null, a), l = gf(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function X0(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), ji(l.return, t, a);
  }
  function Ef(l, t, a, u, e, n) {
    var i = l.memoizedState;
    i === null ? l.memoizedState = {
      isBackwards: t,
      rendering: null,
      renderingStartTime: 0,
      last: u,
      tail: a,
      tailMode: e,
      treeForkCount: n
    } : (i.isBackwards = t, i.rendering = null, i.renderingStartTime = 0, i.last = u, i.tail = a, i.tailMode = e, i.treeForkCount = n);
  }
  function Z0(l, t, a) {
    var u = t.pendingProps, e = u.revealOrder, n = u.tail;
    u = u.children;
    var i = Hl.current, f = (i & 2) !== 0;
    if (f ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, p(Hl, i), Jl(l, t, u, a), u = ul ? Lu : 0, !f && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && X0(l, a, t);
        else if (l.tag === 19)
          X0(l, a, t);
        else if (l.child !== null) {
          l.child.return = l, l = l.child;
          continue;
        }
        if (l === t) break l;
        for (; l.sibling === null; ) {
          if (l.return === null || l.return === t)
            break l;
          l = l.return;
        }
        l.sibling.return = l.return, l = l.sibling;
      }
    switch (e) {
      case "forwards":
        for (a = t.child, e = null; a !== null; )
          l = a.alternate, l !== null && an(l) === null && (e = a), a = a.sibling;
        a = e, a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null), Ef(
          t,
          !1,
          e,
          a,
          n,
          u
        );
        break;
      case "backwards":
      case "unstable_legacy-backwards":
        for (a = null, e = t.child, t.child = null; e !== null; ) {
          if (l = e.alternate, l !== null && an(l) === null) {
            t.child = e;
            break;
          }
          l = e.sibling, e.sibling = a, a = e, e = l;
        }
        Ef(
          t,
          !0,
          a,
          null,
          n,
          u
        );
        break;
      case "together":
        Ef(
          t,
          !1,
          null,
          null,
          void 0,
          u
        );
        break;
      default:
        t.memoizedState = null;
    }
    return t.child;
  }
  function Vt(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), ya |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (fu(
          l,
          t,
          a,
          !1
        ), (a & t.childLanes) === 0)
          return null;
      } else return null;
    if (l !== null && t.child !== l.child)
      throw Error(m(153));
    if (t.child !== null) {
      for (l = t.child, a = Bt(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = Bt(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function Tf(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && We(l)));
  }
  function ty(l, t, a) {
    switch (t.tag) {
      case 3:
        _l(t, t.stateNode.containerInfo), na(t, Cl, l.memoizedState.cache), Ha();
        break;
      case 27:
      case 5:
        Du(t);
        break;
      case 4:
        _l(t, t.stateNode.containerInfo);
        break;
      case 10:
        na(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, Ki(t), null;
        break;
      case 13:
        var u = t.memoizedState;
        if (u !== null)
          return u.dehydrated !== null ? (sa(t), t.flags |= 128, null) : (a & t.child.childLanes) !== 0 ? Q0(l, t, a) : (sa(t), l = Vt(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        sa(t);
        break;
      case 19:
        var e = (l.flags & 128) !== 0;
        if (u = (a & t.childLanes) !== 0, u || (fu(
          l,
          t,
          a,
          !1
        ), u = (a & t.childLanes) !== 0), e) {
          if (u)
            return Z0(
              l,
              t,
              a
            );
          t.flags |= 128;
        }
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), p(Hl, Hl.current), u) break;
        return null;
      case 22:
        return t.lanes = 0, C0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        na(t, Cl, l.memoizedState.cache);
    }
    return Vt(l, t, a);
  }
  function L0(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        ql = !0;
      else {
        if (!Tf(l, a) && (t.flags & 128) === 0)
          return ql = !1, ty(
            l,
            t,
            a
          );
        ql = (l.flags & 131072) !== 0;
      }
    else
      ql = !1, ul && (t.flags & 1048576) !== 0 && Ts(t, Lu, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var u = t.pendingProps;
          if (l = qa(t.elementType), t.type = l, typeof l == "function")
            Mi(l) ? (u = Qa(l, u), t.tag = 1, t = B0(
              null,
              t,
              l,
              u,
              a
            )) : (t.tag = 0, t = vf(
              null,
              t,
              l,
              u,
              a
            ));
          else {
            if (l != null) {
              var e = l.$$typeof;
              if (e === ml) {
                t.tag = 11, t = R0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === $) {
                t.tag = 14, t = H0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              }
            }
            throw t = Mt(l) || l, Error(m(306, t, ""));
          }
        }
        return t;
      case 0:
        return vf(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 1:
        return u = t.type, e = Qa(
          u,
          t.pendingProps
        ), B0(
          l,
          t,
          u,
          e,
          a
        );
      case 3:
        l: {
          if (_l(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(m(387));
          u = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, Qi(l, t), ku(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, na(t, Cl, u), u !== n.cache && Ci(
            t,
            [Cl],
            a,
            !0
          ), Fu(), u = i.element, n.isDehydrated)
            if (n = {
              element: u,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = G0(
                l,
                t,
                u,
                a
              );
              break l;
            } else if (u !== e) {
              e = gt(
                Error(m(424)),
                t
              ), Vu(e), t = G0(
                l,
                t,
                u,
                a
              );
              break l;
            } else {
              switch (l = t.stateNode.containerInfo, l.nodeType) {
                case 9:
                  l = l.body;
                  break;
                default:
                  l = l.nodeName === "HTML" ? l.ownerDocument.body : l;
              }
              for (Tl = At(l.firstChild), Vl = t, ul = !0, ua = null, Tt = !0, a = Cs(
                t,
                null,
                u,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 4096, a = a.sibling;
            }
          else {
            if (Ha(), u === e) {
              t = Vt(
                l,
                t,
                a
              );
              break l;
            }
            Jl(l, t, u, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return vn(l, t), l === null ? (a = lo(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : ul || (a = t.type, l = t.pendingProps, u = Rn(
          L.current
        ).createElement(a), u[Ll] = t, u[Fl] = l, wl(u, a, l), Gl(u), t.stateNode = u) : t.memoizedState = lo(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return Du(t), l === null && ul && (u = t.stateNode = kd(
          t.type,
          t.pendingProps,
          L.current
        ), Vl = t, Tt = !0, e = Tl, ga(t.type) ? (lc = e, Tl = At(u.firstChild)) : Tl = e), Jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), vn(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && ul && ((e = u = Tl) && (u = Ry(
          u,
          t.type,
          t.pendingProps,
          Tt
        ), u !== null ? (t.stateNode = u, Vl = t, Tl = At(u.firstChild), Tt = !1, e = !0) : e = !1), e || ea(t)), Du(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, $f(e, n) ? u = null : i !== null && $f(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = wi(
          l,
          t,
          Jm,
          null,
          null,
          a
        ), Se._currentValue = e), vn(l, t), Jl(l, t, u, a), t.child;
      case 6:
        return l === null && ul && ((l = a = Tl) && (a = Hy(
          a,
          t.pendingProps,
          Tt
        ), a !== null ? (t.stateNode = a, Vl = t, Tl = null, l = !0) : l = !1), l || ea(t)), null;
      case 13:
        return Q0(l, t, a);
      case 4:
        return _l(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = Ba(
          t,
          null,
          u,
          a
        ) : Jl(l, t, u, a), t.child;
      case 11:
        return R0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return Jl(
          l,
          t,
          t.pendingProps,
          a
        ), t.child;
      case 8:
        return Jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return Jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return u = t.pendingProps, na(t, t.type, u.value), Jl(l, t, u.children, a), t.child;
      case 9:
        return e = t.type._context, u = t.pendingProps.children, Ca(t), e = Kl(e), u = u(e), t.flags |= 1, Jl(l, t, u, a), t.child;
      case 14:
        return H0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 15:
        return j0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 19:
        return Z0(l, t, a);
      case 31:
        return ly(l, t, a);
      case 22:
        return C0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        return Ca(t), u = Kl(Cl), l === null ? (e = Yi(), e === null && (e = El, n = xi(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, Gi(t), na(t, Cl, e)) : ((l.lanes & a) !== 0 && (Qi(l, t), ku(t, null, null, a), Fu()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), na(t, Cl, u)) : (u = n.cache, na(t, Cl, u), u !== e.cache && Ci(
          t,
          [Cl],
          a,
          !0
        ))), Jl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(m(156, t.tag));
  }
  function Kt(l) {
    l.flags |= 4;
  }
  function zf(l, t, a, u, e) {
    if ((t = (l.mode & 32) !== 0) && (t = !1), t) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (rd()) l.flags |= 8192;
        else
          throw Ya = Ie, Bi;
    } else l.flags &= -16777217;
  }
  function V0(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !no(t))
      if (rd()) l.flags |= 8192;
      else
        throw Ya = Ie, Bi;
  }
  function rn(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? Ac() : 536870912, l.lanes |= t, bu |= t);
  }
  function ue(l, t) {
    if (!ul)
      switch (l.tailMode) {
        case "hidden":
          t = l.tail;
          for (var a = null; t !== null; )
            t.alternate !== null && (a = t), t = t.sibling;
          a === null ? l.tail = null : a.sibling = null;
          break;
        case "collapsed":
          a = l.tail;
          for (var u = null; a !== null; )
            a.alternate !== null && (u = a), a = a.sibling;
          u === null ? t || l.tail === null ? l.tail = null : l.tail.sibling = null : u.sibling = null;
      }
  }
  function zl(l) {
    var t = l.alternate !== null && l.alternate.child === l.child, a = 0, u = 0;
    if (t)
      for (var e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags & 65011712, u |= e.flags & 65011712, e.return = l, e = e.sibling;
    else
      for (e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags, u |= e.flags, e.return = l, e = e.sibling;
    return l.subtreeFlags |= u, l.childLanes = a, t;
  }
  function ay(l, t, a) {
    var u = t.pendingProps;
    switch (Ui(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return zl(t), null;
      case 1:
        return zl(t), null;
      case 3:
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), Xt(Cl), Rl(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (iu(t) ? Kt(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, Ri())), zl(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (Kt(t), n !== null ? (zl(t), V0(t, n)) : (zl(t), zf(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (Kt(t), zl(t), V0(t, n)) : (zl(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && Kt(t), zl(t), zf(
          t,
          e,
          l,
          u,
          a
        )), null;
      case 27:
        if (pe(t), a = L.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Kt(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(m(166));
            return zl(t), null;
          }
          l = D.current, iu(t) ? As(t) : (l = kd(e, u, a), t.stateNode = l, Kt(t));
        }
        return zl(t), null;
      case 5:
        if (pe(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && Kt(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(m(166));
            return zl(t), null;
          }
          if (n = D.current, iu(t))
            As(t);
          else {
            var i = Rn(
              L.current
            );
            switch (n) {
              case 1:
                n = i.createElementNS(
                  "http://www.w3.org/2000/svg",
                  e
                );
                break;
              case 2:
                n = i.createElementNS(
                  "http://www.w3.org/1998/Math/MathML",
                  e
                );
                break;
              default:
                switch (e) {
                  case "svg":
                    n = i.createElementNS(
                      "http://www.w3.org/2000/svg",
                      e
                    );
                    break;
                  case "math":
                    n = i.createElementNS(
                      "http://www.w3.org/1998/Math/MathML",
                      e
                    );
                    break;
                  case "script":
                    n = i.createElement("div"), n.innerHTML = "<script><\/script>", n = n.removeChild(
                      n.firstChild
                    );
                    break;
                  case "select":
                    n = typeof u.is == "string" ? i.createElement("select", {
                      is: u.is
                    }) : i.createElement("select"), u.multiple ? n.multiple = !0 : u.size && (n.size = u.size);
                    break;
                  default:
                    n = typeof u.is == "string" ? i.createElement(e, { is: u.is }) : i.createElement(e);
                }
            }
            n[Ll] = t, n[Fl] = u;
            l: for (i = t.child; i !== null; ) {
              if (i.tag === 5 || i.tag === 6)
                n.appendChild(i.stateNode);
              else if (i.tag !== 4 && i.tag !== 27 && i.child !== null) {
                i.child.return = i, i = i.child;
                continue;
              }
              if (i === t) break l;
              for (; i.sibling === null; ) {
                if (i.return === null || i.return === t)
                  break l;
                i = i.return;
              }
              i.sibling.return = i.return, i = i.sibling;
            }
            t.stateNode = n;
            l: switch (wl(n, e, u), e) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                u = !!u.autoFocus;
                break l;
              case "img":
                u = !0;
                break l;
              default:
                u = !1;
            }
            u && Kt(t);
          }
        }
        return zl(t), zf(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          a
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== u && Kt(t);
        else {
          if (typeof u != "string" && t.stateNode === null)
            throw Error(m(166));
          if (l = L.current, iu(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = Vl, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[Ll] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || Qd(l.nodeValue, a)), l || ea(t, !0);
          } else
            l = Rn(l).createTextNode(
              u
            ), l[Ll] = t, t.stateNode = l;
        }
        return zl(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = iu(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(m(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(m(557));
              l[Ll] = t;
            } else
              Ha(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            zl(t), l = !1;
          } else
            a = Ri(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (ot(t), t) : (ot(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(m(558));
        }
        return zl(t), null;
      case 13:
        if (u = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = iu(t), u !== null && u.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(m(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(m(317));
              e[Ll] = t;
            } else
              Ha(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            zl(t), e = !1;
          } else
            e = Ri(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (ot(t), t) : (ot(t), null);
        }
        return ot(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), rn(t, t.updateQueue), zl(t), null);
      case 4:
        return Rl(), l === null && Vf(t.stateNode.containerInfo), zl(t), null;
      case 10:
        return Xt(t.type), zl(t), null;
      case 19:
        if (g(Hl), u = t.memoizedState, u === null) return zl(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) ue(u, !1);
          else {
            if (Ol !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = an(l), n !== null) {
                  for (t.flags |= 128, ue(u, !1), l = n.updateQueue, t.updateQueue = l, rn(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    gs(a, l), a = a.sibling;
                  return p(
                    Hl,
                    Hl.current & 1 | 2
                  ), ul && Gt(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && nt() > Tn && (t.flags |= 128, e = !0, ue(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = an(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, rn(t, l), ue(u, !0), u.tail === null && u.tailMode === "hidden" && !n.alternate && !ul)
                return zl(t), null;
            } else
              2 * nt() - u.renderingStartTime > Tn && a !== 536870912 && (t.flags |= 128, e = !0, ue(u, !1), t.lanes = 4194304);
          u.isBackwards ? (n.sibling = t.child, t.child = n) : (l = u.last, l !== null ? l.sibling = n : t.child = n, u.last = n);
        }
        return u.tail !== null ? (l = u.tail, u.rendering = l, u.tail = l.sibling, u.renderingStartTime = nt(), l.sibling = null, a = Hl.current, p(
          Hl,
          e ? a & 1 | 2 : a & 1
        ), ul && Gt(t, u.treeForkCount), l) : (zl(t), null);
      case 22:
      case 23:
        return ot(t), Vi(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (zl(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : zl(t), a = t.updateQueue, a !== null && rn(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && g(xa), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), Xt(Cl), zl(t), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(m(156, t.tag));
  }
  function uy(l, t) {
    switch (Ui(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return Xt(Cl), Rl(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return pe(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (ot(t), t.alternate === null)
            throw Error(m(340));
          Ha();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (ot(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(m(340));
          Ha();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return g(Hl), null;
      case 4:
        return Rl(), null;
      case 10:
        return Xt(t.type), null;
      case 22:
      case 23:
        return ot(t), Vi(), l !== null && g(xa), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return Xt(Cl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function K0(l, t) {
    switch (Ui(t), t.tag) {
      case 3:
        Xt(Cl), Rl();
        break;
      case 26:
      case 27:
      case 5:
        pe(t);
        break;
      case 4:
        Rl();
        break;
      case 31:
        t.memoizedState !== null && ot(t);
        break;
      case 13:
        ot(t);
        break;
      case 19:
        g(Hl);
        break;
      case 10:
        Xt(t.type);
        break;
      case 22:
      case 23:
        ot(t), Vi(), l !== null && g(xa);
        break;
      case 24:
        Xt(Cl);
    }
  }
  function ee(l, t) {
    try {
      var a = t.updateQueue, u = a !== null ? a.lastEffect : null;
      if (u !== null) {
        var e = u.next;
        a = e;
        do {
          if ((a.tag & l) === l) {
            u = void 0;
            var n = a.create, i = a.inst;
            u = n(), i.destroy = u;
          }
          a = a.next;
        } while (a !== e);
      }
    } catch (f) {
      vl(t, t.return, f);
    }
  }
  function oa(l, t, a) {
    try {
      var u = t.updateQueue, e = u !== null ? u.lastEffect : null;
      if (e !== null) {
        var n = e.next;
        u = n;
        do {
          if ((u.tag & l) === l) {
            var i = u.inst, f = i.destroy;
            if (f !== void 0) {
              i.destroy = void 0, e = t;
              var s = a, v = f;
              try {
                v();
              } catch (b) {
                vl(
                  e,
                  s,
                  b
                );
              }
            }
          }
          u = u.next;
        } while (u !== n);
      }
    } catch (b) {
      vl(t, t.return, b);
    }
  }
  function J0(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        qs(t, a);
      } catch (u) {
        vl(l, l.return, u);
      }
    }
  }
  function w0(l, t, a) {
    a.props = Qa(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (u) {
      vl(l, t, u);
    }
  }
  function ne(l, t) {
    try {
      var a = l.ref;
      if (a !== null) {
        switch (l.tag) {
          case 26:
          case 27:
          case 5:
            var u = l.stateNode;
            break;
          case 30:
            u = l.stateNode;
            break;
          default:
            u = l.stateNode;
        }
        typeof a == "function" ? l.refCleanup = a(u) : a.current = u;
      }
    } catch (e) {
      vl(l, t, e);
    }
  }
  function jt(l, t) {
    var a = l.ref, u = l.refCleanup;
    if (a !== null)
      if (typeof u == "function")
        try {
          u();
        } catch (e) {
          vl(l, t, e);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (e) {
          vl(l, t, e);
        }
      else a.current = null;
  }
  function W0(l) {
    var t = l.type, a = l.memoizedProps, u = l.stateNode;
    try {
      l: switch (t) {
        case "button":
        case "input":
        case "select":
        case "textarea":
          a.autoFocus && u.focus();
          break l;
        case "img":
          a.src ? u.src = a.src : a.srcSet && (u.srcset = a.srcSet);
      }
    } catch (e) {
      vl(l, l.return, e);
    }
  }
  function Af(l, t, a) {
    try {
      var u = l.stateNode;
      My(u, l.type, a, t), u[Fl] = t;
    } catch (e) {
      vl(l, l.return, e);
    }
  }
  function $0(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && ga(l.type) || l.tag === 4;
  }
  function _f(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || $0(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && ga(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function Mf(l, t, a) {
    var u = l.tag;
    if (u === 5 || u === 6)
      l = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(l, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(l), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = qt));
    else if (u !== 4 && (u === 27 && ga(l.type) && (a = l.stateNode, t = null), l = l.child, l !== null))
      for (Mf(l, t, a), l = l.sibling; l !== null; )
        Mf(l, t, a), l = l.sibling;
  }
  function Sn(l, t, a) {
    var u = l.tag;
    if (u === 5 || u === 6)
      l = l.stateNode, t ? a.insertBefore(l, t) : a.appendChild(l);
    else if (u !== 4 && (u === 27 && ga(l.type) && (a = l.stateNode), l = l.child, l !== null))
      for (Sn(l, t, a), l = l.sibling; l !== null; )
        Sn(l, t, a), l = l.sibling;
  }
  function F0(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var u = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      wl(t, u, a), t[Ll] = l, t[Fl] = a;
    } catch (n) {
      vl(l, l.return, n);
    }
  }
  var Jt = !1, Yl = !1, pf = !1, k0 = typeof WeakSet == "function" ? WeakSet : Set, Ql = null;
  function ey(l, t) {
    if (l = l.containerInfo, wf = Bn, l = ss(l), gi(l)) {
      if ("selectionStart" in l)
        var a = {
          start: l.selectionStart,
          end: l.selectionEnd
        };
      else
        l: {
          a = (a = l.ownerDocument) && a.defaultView || window;
          var u = a.getSelection && a.getSelection();
          if (u && u.rangeCount !== 0) {
            a = u.anchorNode;
            var e = u.anchorOffset, n = u.focusNode;
            u = u.focusOffset;
            try {
              a.nodeType, n.nodeType;
            } catch {
              a = null;
              break l;
            }
            var i = 0, f = -1, s = -1, v = 0, b = 0, A = l, h = null;
            t: for (; ; ) {
              for (var r; A !== a || e !== 0 && A.nodeType !== 3 || (f = i + e), A !== n || u !== 0 && A.nodeType !== 3 || (s = i + u), A.nodeType === 3 && (i += A.nodeValue.length), (r = A.firstChild) !== null; )
                h = A, A = r;
              for (; ; ) {
                if (A === l) break t;
                if (h === a && ++v === e && (f = i), h === n && ++b === u && (s = i), (r = A.nextSibling) !== null) break;
                A = h, h = A.parentNode;
              }
              A = r;
            }
            a = f === -1 || s === -1 ? null : { start: f, end: s };
          } else a = null;
        }
      a = a || { start: 0, end: 0 };
    } else a = null;
    for (Wf = { focusedElem: l, selectionRange: a }, Bn = !1, Ql = t; Ql !== null; )
      if (t = Ql, l = t.child, (t.subtreeFlags & 1028) !== 0 && l !== null)
        l.return = t, Ql = l;
      else
        for (; Ql !== null; ) {
          switch (t = Ql, n = t.alternate, l = t.flags, t.tag) {
            case 0:
              if ((l & 4) !== 0 && (l = t.updateQueue, l = l !== null ? l.events : null, l !== null))
                for (a = 0; a < l.length; a++)
                  e = l[a], e.ref.impl = e.nextImpl;
              break;
            case 11:
            case 15:
              break;
            case 1:
              if ((l & 1024) !== 0 && n !== null) {
                l = void 0, a = t, e = n.memoizedProps, n = n.memoizedState, u = a.stateNode;
                try {
                  var R = Qa(
                    a.type,
                    e
                  );
                  l = u.getSnapshotBeforeUpdate(
                    R,
                    n
                  ), u.__reactInternalSnapshotBeforeUpdate = l;
                } catch (Z) {
                  vl(
                    a,
                    a.return,
                    Z
                  );
                }
              }
              break;
            case 3:
              if ((l & 1024) !== 0) {
                if (l = t.stateNode.containerInfo, a = l.nodeType, a === 9)
                  kf(l);
                else if (a === 1)
                  switch (l.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      kf(l);
                      break;
                    default:
                      l.textContent = "";
                  }
              }
              break;
            case 5:
            case 26:
            case 27:
            case 6:
            case 4:
            case 17:
              break;
            default:
              if ((l & 1024) !== 0) throw Error(m(163));
          }
          if (l = t.sibling, l !== null) {
            l.return = t.return, Ql = l;
            break;
          }
          Ql = t.return;
        }
  }
  function I0(l, t, a) {
    var u = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        Wt(l, a), u & 4 && ee(5, a);
        break;
      case 1:
        if (Wt(l, a), u & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              vl(a, a.return, i);
            }
          else {
            var e = Qa(
              a.type,
              t.memoizedProps
            );
            t = t.memoizedState;
            try {
              l.componentDidUpdate(
                e,
                t,
                l.__reactInternalSnapshotBeforeUpdate
              );
            } catch (i) {
              vl(
                a,
                a.return,
                i
              );
            }
          }
        u & 64 && J0(a), u & 512 && ne(a, a.return);
        break;
      case 3:
        if (Wt(l, a), u & 64 && (l = a.updateQueue, l !== null)) {
          if (t = null, a.child !== null)
            switch (a.child.tag) {
              case 27:
              case 5:
                t = a.child.stateNode;
                break;
              case 1:
                t = a.child.stateNode;
            }
          try {
            qs(l, t);
          } catch (i) {
            vl(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && u & 4 && F0(a);
      case 26:
      case 5:
        Wt(l, a), t === null && u & 4 && W0(a), u & 512 && ne(a, a.return);
        break;
      case 12:
        Wt(l, a);
        break;
      case 31:
        Wt(l, a), u & 4 && td(l, a);
        break;
      case 13:
        Wt(l, a), u & 4 && ad(l, a), u & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = yy.bind(
          null,
          a
        ), jy(l, a))));
        break;
      case 22:
        if (u = a.memoizedState !== null || Jt, !u) {
          t = t !== null && t.memoizedState !== null || Yl, e = Jt;
          var n = Yl;
          Jt = u, (Yl = t) && !n ? $t(
            l,
            a,
            (a.subtreeFlags & 8772) !== 0
          ) : Wt(l, a), Jt = e, Yl = n;
        }
        break;
      case 30:
        break;
      default:
        Wt(l, a);
    }
  }
  function P0(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, P0(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && ti(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var Al = null, Il = !1;
  function wt(l, t, a) {
    for (a = a.child; a !== null; )
      ld(l, t, a), a = a.sibling;
  }
  function ld(l, t, a) {
    if (it && typeof it.onCommitFiberUnmount == "function")
      try {
        it.onCommitFiberUnmount(Uu, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        Yl || jt(a, t), wt(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        Yl || jt(a, t);
        var u = Al, e = Il;
        ga(a.type) && (Al = a.stateNode, Il = !1), wt(
          l,
          t,
          a
        ), ve(a.stateNode), Al = u, Il = e;
        break;
      case 5:
        Yl || jt(a, t);
      case 6:
        if (u = Al, e = Il, Al = null, wt(
          l,
          t,
          a
        ), Al = u, Il = e, Al !== null)
          if (Il)
            try {
              (Al.nodeType === 9 ? Al.body : Al.nodeName === "HTML" ? Al.ownerDocument.body : Al).removeChild(a.stateNode);
            } catch (n) {
              vl(
                a,
                t,
                n
              );
            }
          else
            try {
              Al.removeChild(a.stateNode);
            } catch (n) {
              vl(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        Al !== null && (Il ? (l = Al, Jd(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), Ou(l)) : Jd(Al, a.stateNode));
        break;
      case 4:
        u = Al, e = Il, Al = a.stateNode.containerInfo, Il = !0, wt(
          l,
          t,
          a
        ), Al = u, Il = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        oa(2, a, t), Yl || oa(4, a, t), wt(
          l,
          t,
          a
        );
        break;
      case 1:
        Yl || (jt(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && w0(
          a,
          t,
          u
        )), wt(
          l,
          t,
          a
        );
        break;
      case 21:
        wt(
          l,
          t,
          a
        );
        break;
      case 22:
        Yl = (u = Yl) || a.memoizedState !== null, wt(
          l,
          t,
          a
        ), Yl = u;
        break;
      default:
        wt(
          l,
          t,
          a
        );
    }
  }
  function td(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        Ou(l);
      } catch (a) {
        vl(t, t.return, a);
      }
    }
  }
  function ad(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        Ou(l);
      } catch (a) {
        vl(t, t.return, a);
      }
  }
  function ny(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new k0()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new k0()), t;
      default:
        throw Error(m(435, l.tag));
    }
  }
  function gn(l, t) {
    var a = ny(l);
    t.forEach(function(u) {
      if (!a.has(u)) {
        a.add(u);
        var e = vy.bind(null, l, u);
        u.then(e, e);
      }
    });
  }
  function Pl(l, t) {
    var a = t.deletions;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u], n = l, i = t, f = i;
        l: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if (ga(f.type)) {
                Al = f.stateNode, Il = !1;
                break l;
              }
              break;
            case 5:
              Al = f.stateNode, Il = !1;
              break l;
            case 3:
            case 4:
              Al = f.stateNode.containerInfo, Il = !0;
              break l;
          }
          f = f.return;
        }
        if (Al === null) throw Error(m(160));
        ld(n, i, e), Al = null, Il = !1, n = e.alternate, n !== null && (n.return = null), e.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        ud(t, l), t = t.sibling;
  }
  var Ot = null;
  function ud(l, t) {
    var a = l.alternate, u = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        Pl(t, l), lt(l), u & 4 && (oa(3, l, l.return), ee(3, l), oa(5, l, l.return));
        break;
      case 1:
        Pl(t, l), lt(l), u & 512 && (Yl || a === null || jt(a, a.return)), u & 64 && Jt && (l = l.updateQueue, l !== null && (u = l.callbacks, u !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? u : a.concat(u))));
        break;
      case 26:
        var e = Ot;
        if (Pl(t, l), lt(l), u & 512 && (Yl || a === null || jt(a, a.return)), u & 4) {
          var n = a !== null ? a.memoizedState : null;
          if (u = l.memoizedState, a === null)
            if (u === null)
              if (l.stateNode === null) {
                l: {
                  u = l.type, a = l.memoizedProps, e = e.ownerDocument || e;
                  t: switch (u) {
                    case "title":
                      n = e.getElementsByTagName("title")[0], (!n || n[Hu] || n[Ll] || n.namespaceURI === "http://www.w3.org/2000/svg" || n.hasAttribute("itemprop")) && (n = e.createElement(u), e.head.insertBefore(
                        n,
                        e.querySelector("head > title")
                      )), wl(n, u, a), n[Ll] = l, Gl(n), u = n;
                      break l;
                    case "link":
                      var i = uo(
                        "link",
                        "href",
                        e
                      ).get(u + (a.href || ""));
                      if (i) {
                        for (var f = 0; f < i.length; f++)
                          if (n = i[f], n.getAttribute("href") === (a.href == null || a.href === "" ? null : a.href) && n.getAttribute("rel") === (a.rel == null ? null : a.rel) && n.getAttribute("title") === (a.title == null ? null : a.title) && n.getAttribute("crossorigin") === (a.crossOrigin == null ? null : a.crossOrigin)) {
                            i.splice(f, 1);
                            break t;
                          }
                      }
                      n = e.createElement(u), wl(n, u, a), e.head.appendChild(n);
                      break;
                    case "meta":
                      if (i = uo(
                        "meta",
                        "content",
                        e
                      ).get(u + (a.content || ""))) {
                        for (f = 0; f < i.length; f++)
                          if (n = i[f], n.getAttribute("content") === (a.content == null ? null : "" + a.content) && n.getAttribute("name") === (a.name == null ? null : a.name) && n.getAttribute("property") === (a.property == null ? null : a.property) && n.getAttribute("http-equiv") === (a.httpEquiv == null ? null : a.httpEquiv) && n.getAttribute("charset") === (a.charSet == null ? null : a.charSet)) {
                            i.splice(f, 1);
                            break t;
                          }
                      }
                      n = e.createElement(u), wl(n, u, a), e.head.appendChild(n);
                      break;
                    default:
                      throw Error(m(468, u));
                  }
                  n[Ll] = l, Gl(n), u = n;
                }
                l.stateNode = u;
              } else
                eo(
                  e,
                  l.type,
                  l.stateNode
                );
            else
              l.stateNode = ao(
                e,
                u,
                l.memoizedProps
              );
          else
            n !== u ? (n === null ? a.stateNode !== null && (a = a.stateNode, a.parentNode.removeChild(a)) : n.count--, u === null ? eo(
              e,
              l.type,
              l.stateNode
            ) : ao(
              e,
              u,
              l.memoizedProps
            )) : u === null && l.stateNode !== null && Af(
              l,
              l.memoizedProps,
              a.memoizedProps
            );
        }
        break;
      case 27:
        Pl(t, l), lt(l), u & 512 && (Yl || a === null || jt(a, a.return)), a !== null && u & 4 && Af(
          l,
          l.memoizedProps,
          a.memoizedProps
        );
        break;
      case 5:
        if (Pl(t, l), lt(l), u & 512 && (Yl || a === null || jt(a, a.return)), l.flags & 32) {
          e = l.stateNode;
          try {
            Fa(e, "");
          } catch (R) {
            vl(l, l.return, R);
          }
        }
        u & 4 && l.stateNode != null && (e = l.memoizedProps, Af(
          l,
          e,
          a !== null ? a.memoizedProps : e
        )), u & 1024 && (pf = !0);
        break;
      case 6:
        if (Pl(t, l), lt(l), u & 4) {
          if (l.stateNode === null)
            throw Error(m(162));
          u = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = u;
          } catch (R) {
            vl(l, l.return, R);
          }
        }
        break;
      case 3:
        if (Cn = null, e = Ot, Ot = Hn(t.containerInfo), Pl(t, l), Ot = e, lt(l), u & 4 && a !== null && a.memoizedState.isDehydrated)
          try {
            Ou(t.containerInfo);
          } catch (R) {
            vl(l, l.return, R);
          }
        pf && (pf = !1, ed(l));
        break;
      case 4:
        u = Ot, Ot = Hn(
          l.stateNode.containerInfo
        ), Pl(t, l), lt(l), Ot = u;
        break;
      case 12:
        Pl(t, l), lt(l);
        break;
      case 31:
        Pl(t, l), lt(l), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, gn(l, u)));
        break;
      case 13:
        Pl(t, l), lt(l), l.child.flags & 8192 && l.memoizedState !== null != (a !== null && a.memoizedState !== null) && (En = nt()), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, gn(l, u)));
        break;
      case 22:
        e = l.memoizedState !== null;
        var s = a !== null && a.memoizedState !== null, v = Jt, b = Yl;
        if (Jt = v || e, Yl = b || s, Pl(t, l), Yl = b, Jt = v, lt(l), u & 8192)
          l: for (t = l.stateNode, t._visibility = e ? t._visibility & -2 : t._visibility | 1, e && (a === null || s || Jt || Yl || Xa(l)), a = null, t = l; ; ) {
            if (t.tag === 5 || t.tag === 26) {
              if (a === null) {
                s = a = t;
                try {
                  if (n = s.stateNode, e)
                    i = n.style, typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none";
                  else {
                    f = s.stateNode;
                    var A = s.memoizedProps.style, h = A != null && A.hasOwnProperty("display") ? A.display : null;
                    f.style.display = h == null || typeof h == "boolean" ? "" : ("" + h).trim();
                  }
                } catch (R) {
                  vl(s, s.return, R);
                }
              }
            } else if (t.tag === 6) {
              if (a === null) {
                s = t;
                try {
                  s.stateNode.nodeValue = e ? "" : s.memoizedProps;
                } catch (R) {
                  vl(s, s.return, R);
                }
              }
            } else if (t.tag === 18) {
              if (a === null) {
                s = t;
                try {
                  var r = s.stateNode;
                  e ? wd(r, !0) : wd(s.stateNode, !1);
                } catch (R) {
                  vl(s, s.return, R);
                }
              }
            } else if ((t.tag !== 22 && t.tag !== 23 || t.memoizedState === null || t === l) && t.child !== null) {
              t.child.return = t, t = t.child;
              continue;
            }
            if (t === l) break l;
            for (; t.sibling === null; ) {
              if (t.return === null || t.return === l) break l;
              a === t && (a = null), t = t.return;
            }
            a === t && (a = null), t.sibling.return = t.return, t = t.sibling;
          }
        u & 4 && (u = l.updateQueue, u !== null && (a = u.retryQueue, a !== null && (u.retryQueue = null, gn(l, a))));
        break;
      case 19:
        Pl(t, l), lt(l), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, gn(l, u)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        Pl(t, l), lt(l);
    }
  }
  function lt(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, u = l.return; u !== null; ) {
          if ($0(u)) {
            a = u;
            break;
          }
          u = u.return;
        }
        if (a == null) throw Error(m(160));
        switch (a.tag) {
          case 27:
            var e = a.stateNode, n = _f(l);
            Sn(l, n, e);
            break;
          case 5:
            var i = a.stateNode;
            a.flags & 32 && (Fa(i, ""), a.flags &= -33);
            var f = _f(l);
            Sn(l, f, i);
            break;
          case 3:
          case 4:
            var s = a.stateNode.containerInfo, v = _f(l);
            Mf(
              l,
              v,
              s
            );
            break;
          default:
            throw Error(m(161));
        }
      } catch (b) {
        vl(l, l.return, b);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function ed(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        ed(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), l = l.sibling;
      }
  }
  function Wt(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        I0(l, t.alternate, t), t = t.sibling;
  }
  function Xa(l) {
    for (l = l.child; l !== null; ) {
      var t = l;
      switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          oa(4, t, t.return), Xa(t);
          break;
        case 1:
          jt(t, t.return);
          var a = t.stateNode;
          typeof a.componentWillUnmount == "function" && w0(
            t,
            t.return,
            a
          ), Xa(t);
          break;
        case 27:
          ve(t.stateNode);
        case 26:
        case 5:
          jt(t, t.return), Xa(t);
          break;
        case 22:
          t.memoizedState === null && Xa(t);
          break;
        case 30:
          Xa(t);
          break;
        default:
          Xa(t);
      }
      l = l.sibling;
    }
  }
  function $t(l, t, a) {
    for (a = a && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
      var u = t.alternate, e = l, n = t, i = n.flags;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          $t(
            e,
            n,
            a
          ), ee(4, n);
          break;
        case 1:
          if ($t(
            e,
            n,
            a
          ), u = n, e = u.stateNode, typeof e.componentDidMount == "function")
            try {
              e.componentDidMount();
            } catch (v) {
              vl(u, u.return, v);
            }
          if (u = n, e = u.updateQueue, e !== null) {
            var f = u.stateNode;
            try {
              var s = e.shared.hiddenCallbacks;
              if (s !== null)
                for (e.shared.hiddenCallbacks = null, e = 0; e < s.length; e++)
                  xs(s[e], f);
            } catch (v) {
              vl(u, u.return, v);
            }
          }
          a && i & 64 && J0(n), ne(n, n.return);
          break;
        case 27:
          F0(n);
        case 26:
        case 5:
          $t(
            e,
            n,
            a
          ), a && u === null && i & 4 && W0(n), ne(n, n.return);
          break;
        case 12:
          $t(
            e,
            n,
            a
          );
          break;
        case 31:
          $t(
            e,
            n,
            a
          ), a && i & 4 && td(e, n);
          break;
        case 13:
          $t(
            e,
            n,
            a
          ), a && i & 4 && ad(e, n);
          break;
        case 22:
          n.memoizedState === null && $t(
            e,
            n,
            a
          ), ne(n, n.return);
          break;
        case 30:
          break;
        default:
          $t(
            e,
            n,
            a
          );
      }
      t = t.sibling;
    }
  }
  function Of(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && Ku(a));
  }
  function Df(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Ku(l));
  }
  function Dt(l, t, a, u) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; )
        nd(
          l,
          t,
          a,
          u
        ), t = t.sibling;
  }
  function nd(l, t, a, u) {
    var e = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Dt(
          l,
          t,
          a,
          u
        ), e & 2048 && ee(9, t);
        break;
      case 1:
        Dt(
          l,
          t,
          a,
          u
        );
        break;
      case 3:
        Dt(
          l,
          t,
          a,
          u
        ), e & 2048 && (l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && Ku(l)));
        break;
      case 12:
        if (e & 2048) {
          Dt(
            l,
            t,
            a,
            u
          ), l = t.stateNode;
          try {
            var n = t.memoizedProps, i = n.id, f = n.onPostCommit;
            typeof f == "function" && f(
              i,
              t.alternate === null ? "mount" : "update",
              l.passiveEffectDuration,
              -0
            );
          } catch (s) {
            vl(t, t.return, s);
          }
        } else
          Dt(
            l,
            t,
            a,
            u
          );
        break;
      case 31:
        Dt(
          l,
          t,
          a,
          u
        );
        break;
      case 13:
        Dt(
          l,
          t,
          a,
          u
        );
        break;
      case 23:
        break;
      case 22:
        n = t.stateNode, i = t.alternate, t.memoizedState !== null ? n._visibility & 2 ? Dt(
          l,
          t,
          a,
          u
        ) : ie(l, t) : n._visibility & 2 ? Dt(
          l,
          t,
          a,
          u
        ) : (n._visibility |= 2, ru(
          l,
          t,
          a,
          u,
          (t.subtreeFlags & 10256) !== 0 || !1
        )), e & 2048 && Of(i, t);
        break;
      case 24:
        Dt(
          l,
          t,
          a,
          u
        ), e & 2048 && Df(t.alternate, t);
        break;
      default:
        Dt(
          l,
          t,
          a,
          u
        );
    }
  }
  function ru(l, t, a, u, e) {
    for (e = e && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, f = a, s = u, v = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          ru(
            n,
            i,
            f,
            s,
            e
          ), ee(8, i);
          break;
        case 23:
          break;
        case 22:
          var b = i.stateNode;
          i.memoizedState !== null ? b._visibility & 2 ? ru(
            n,
            i,
            f,
            s,
            e
          ) : ie(
            n,
            i
          ) : (b._visibility |= 2, ru(
            n,
            i,
            f,
            s,
            e
          )), e && v & 2048 && Of(
            i.alternate,
            i
          );
          break;
        case 24:
          ru(
            n,
            i,
            f,
            s,
            e
          ), e && v & 2048 && Df(i.alternate, i);
          break;
        default:
          ru(
            n,
            i,
            f,
            s,
            e
          );
      }
      t = t.sibling;
    }
  }
  function ie(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, u = t, e = u.flags;
        switch (u.tag) {
          case 22:
            ie(a, u), e & 2048 && Of(
              u.alternate,
              u
            );
            break;
          case 24:
            ie(a, u), e & 2048 && Df(u.alternate, u);
            break;
          default:
            ie(a, u);
        }
        t = t.sibling;
      }
  }
  var fe = 8192;
  function Su(l, t, a) {
    if (l.subtreeFlags & fe)
      for (l = l.child; l !== null; )
        id(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function id(l, t, a) {
    switch (l.tag) {
      case 26:
        Su(
          l,
          t,
          a
        ), l.flags & fe && l.memoizedState !== null && Ky(
          a,
          Ot,
          l.memoizedState,
          l.memoizedProps
        );
        break;
      case 5:
        Su(
          l,
          t,
          a
        );
        break;
      case 3:
      case 4:
        var u = Ot;
        Ot = Hn(l.stateNode.containerInfo), Su(
          l,
          t,
          a
        ), Ot = u;
        break;
      case 22:
        l.memoizedState === null && (u = l.alternate, u !== null && u.memoizedState !== null ? (u = fe, fe = 16777216, Su(
          l,
          t,
          a
        ), fe = u) : Su(
          l,
          t,
          a
        ));
        break;
      default:
        Su(
          l,
          t,
          a
        );
    }
  }
  function fd(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function ce(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Ql = u, sd(
            u,
            l
          );
        }
      fd(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        cd(l), l = l.sibling;
  }
  function cd(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        ce(l), l.flags & 2048 && oa(9, l, l.return);
        break;
      case 3:
        ce(l);
        break;
      case 12:
        ce(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, bn(l)) : ce(l);
        break;
      default:
        ce(l);
    }
  }
  function bn(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Ql = u, sd(
            u,
            l
          );
        }
      fd(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          oa(8, t, t.return), bn(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, bn(t));
          break;
        default:
          bn(t);
      }
      l = l.sibling;
    }
  }
  function sd(l, t) {
    for (; Ql !== null; ) {
      var a = Ql;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          oa(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var u = a.memoizedState.cachePool.pool;
            u != null && u.refCount++;
          }
          break;
        case 24:
          Ku(a.memoizedState.cache);
      }
      if (u = a.child, u !== null) u.return = a, Ql = u;
      else
        l: for (a = l; Ql !== null; ) {
          u = Ql;
          var e = u.sibling, n = u.return;
          if (P0(u), u === a) {
            Ql = null;
            break l;
          }
          if (e !== null) {
            e.return = n, Ql = e;
            break l;
          }
          Ql = n;
        }
    }
  }
  var iy = {
    getCacheForType: function(l) {
      var t = Kl(Cl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return Kl(Cl).controller.signal;
    }
  }, fy = typeof WeakMap == "function" ? WeakMap : Map, cl = 0, El = null, F = null, ll = 0, yl = 0, mt = null, ma = !1, gu = !1, Uf = !1, Ft = 0, Ol = 0, ya = 0, Za = 0, Nf = 0, yt = 0, bu = 0, se = null, tt = null, Rf = !1, En = 0, dd = 0, Tn = 1 / 0, zn = null, va = null, Bl = 0, ha = null, Eu = null, kt = 0, Hf = 0, jf = null, od = null, de = 0, Cf = null;
  function vt() {
    return (cl & 2) !== 0 && ll !== 0 ? ll & -ll : E.T !== null ? Qf() : Oc();
  }
  function md() {
    if (yt === 0)
      if ((ll & 536870912) === 0 || ul) {
        var l = Ue;
        Ue <<= 1, (Ue & 3932160) === 0 && (Ue = 262144), yt = l;
      } else yt = 536870912;
    return l = dt.current, l !== null && (l.flags |= 32), yt;
  }
  function at(l, t, a) {
    (l === El && (yl === 2 || yl === 9) || l.cancelPendingCommit !== null) && (Tu(l, 0), ra(
      l,
      ll,
      yt,
      !1
    )), Ru(l, a), ((cl & 2) === 0 || l !== El) && (l === El && ((cl & 2) === 0 && (Za |= a), Ol === 4 && ra(
      l,
      ll,
      yt,
      !1
    )), Ct(l));
  }
  function yd(l, t, a) {
    if ((cl & 6) !== 0) throw Error(m(327));
    var u = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || Nu(l, t), e = u ? dy(l, t) : qf(l, t, !0), n = u;
    do {
      if (e === 0) {
        gu && !u && ra(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !cy(a)) {
          e = qf(l, t, !1), n = !1;
          continue;
        }
        if (e === 2) {
          if (n = t, l.errorRecoveryDisabledLanes & n)
            var i = 0;
          else
            i = l.pendingLanes & -536870913, i = i !== 0 ? i : i & 536870912 ? 536870912 : 0;
          if (i !== 0) {
            t = i;
            l: {
              var f = l;
              e = se;
              var s = f.current.memoizedState.isDehydrated;
              if (s && (Tu(f, i).flags |= 256), i = qf(
                f,
                i,
                !1
              ), i !== 2) {
                if (Uf && !s) {
                  f.errorRecoveryDisabledLanes |= n, Za |= n, e = 4;
                  break l;
                }
                n = tt, tt = e, n !== null && (tt === null ? tt = n : tt.push.apply(
                  tt,
                  n
                ));
              }
              e = i;
            }
            if (n = !1, e !== 2) continue;
          }
        }
        if (e === 1) {
          Tu(l, 0), ra(l, t, 0, !0);
          break;
        }
        l: {
          switch (u = l, n = e, n) {
            case 0:
            case 1:
              throw Error(m(345));
            case 4:
              if ((t & 4194048) !== t) break;
            case 6:
              ra(
                u,
                t,
                yt,
                !ma
              );
              break l;
            case 2:
              tt = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(m(329));
          }
          if ((t & 62914560) === t && (e = En + 300 - nt(), 10 < e)) {
            if (ra(
              u,
              t,
              yt,
              !ma
            ), Re(u, 0, !0) !== 0) break l;
            kt = t, u.timeoutHandle = Vd(
              vd.bind(
                null,
                u,
                a,
                tt,
                zn,
                Rf,
                t,
                yt,
                Za,
                bu,
                ma,
                n,
                "Throttled",
                -0,
                0
              ),
              e
            );
            break l;
          }
          vd(
            u,
            a,
            tt,
            zn,
            Rf,
            t,
            yt,
            Za,
            bu,
            ma,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    Ct(l);
  }
  function vd(l, t, a, u, e, n, i, f, s, v, b, A, h, r) {
    if (l.timeoutHandle = -1, A = t.subtreeFlags, A & 8192 || (A & 16785408) === 16785408) {
      A = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: !0,
        waitingForViewTransition: !1,
        unsuspend: qt
      }, id(
        t,
        n,
        A
      );
      var R = (n & 62914560) === n ? En - nt() : (n & 4194048) === n ? dd - nt() : 0;
      if (R = Jy(
        A,
        R
      ), R !== null) {
        kt = n, l.cancelPendingCommit = R(
          zd.bind(
            null,
            l,
            t,
            n,
            a,
            u,
            e,
            i,
            f,
            s,
            b,
            A,
            null,
            h,
            r
          )
        ), ra(l, n, i, !v);
        return;
      }
    }
    zd(
      l,
      t,
      n,
      a,
      u,
      e,
      i,
      f,
      s
    );
  }
  function cy(l) {
    for (var t = l; ; ) {
      var a = t.tag;
      if ((a === 0 || a === 11 || a === 15) && t.flags & 16384 && (a = t.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var u = 0; u < a.length; u++) {
          var e = a[u], n = e.getSnapshot;
          e = e.value;
          try {
            if (!ct(n(), e)) return !1;
          } catch {
            return !1;
          }
        }
      if (a = t.child, t.subtreeFlags & 16384 && a !== null)
        a.return = t, t = a;
      else {
        if (t === l) break;
        for (; t.sibling === null; ) {
          if (t.return === null || t.return === l) return !0;
          t = t.return;
        }
        t.sibling.return = t.return, t = t.sibling;
      }
    }
    return !0;
  }
  function ra(l, t, a, u) {
    t &= ~Nf, t &= ~Za, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - ft(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && _c(l, a, t);
  }
  function An() {
    return (cl & 6) === 0 ? (oe(0), !1) : !0;
  }
  function xf() {
    if (F !== null) {
      if (yl === 0)
        var l = F.return;
      else
        l = F, Qt = ja = null, Fi(l), ou = null, wu = 0, l = F;
      for (; l !== null; )
        K0(l.alternate, l), l = l.return;
      F = null;
    }
  }
  function Tu(l, t) {
    var a = l.timeoutHandle;
    a !== -1 && (l.timeoutHandle = -1, Dy(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), kt = 0, xf(), El = l, F = a = Bt(l.current, null), ll = t, yl = 0, mt = null, ma = !1, gu = Nu(l, t), Uf = !1, bu = yt = Nf = Za = ya = Ol = 0, tt = se = null, Rf = !1, (t & 8) !== 0 && (t |= t & 32);
    var u = l.entangledLanes;
    if (u !== 0)
      for (l = l.entanglements, u &= t; 0 < u; ) {
        var e = 31 - ft(u), n = 1 << e;
        t |= l[e], u &= ~n;
      }
    return Ft = t, Le(), a;
  }
  function hd(l, t) {
    J = null, E.H = te, t === du || t === ke ? (t = Rs(), yl = 3) : t === Bi ? (t = Rs(), yl = 4) : yl = t === yf ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, mt = t, F === null && (Ol = 1, mn(
      l,
      gt(t, l.current)
    ));
  }
  function rd() {
    var l = dt.current;
    return l === null ? !0 : (ll & 4194048) === ll ? zt === null : (ll & 62914560) === ll || (ll & 536870912) !== 0 ? l === zt : !1;
  }
  function Sd() {
    var l = E.H;
    return E.H = te, l === null ? te : l;
  }
  function gd() {
    var l = E.A;
    return E.A = iy, l;
  }
  function _n() {
    Ol = 4, ma || (ll & 4194048) !== ll && dt.current !== null || (gu = !0), (ya & 134217727) === 0 && (Za & 134217727) === 0 || El === null || ra(
      El,
      ll,
      yt,
      !1
    );
  }
  function qf(l, t, a) {
    var u = cl;
    cl |= 2;
    var e = Sd(), n = gd();
    (El !== l || ll !== t) && (zn = null, Tu(l, t)), t = !1;
    var i = Ol;
    l: do
      try {
        if (yl !== 0 && F !== null) {
          var f = F, s = mt;
          switch (yl) {
            case 8:
              xf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              dt.current === null && (t = !0);
              var v = yl;
              if (yl = 0, mt = null, zu(l, f, s, v), a && gu) {
                i = 0;
                break l;
              }
              break;
            default:
              v = yl, yl = 0, mt = null, zu(l, f, s, v);
          }
        }
        sy(), i = Ol;
        break;
      } catch (b) {
        hd(l, b);
      }
    while (!0);
    return t && l.shellSuspendCounter++, Qt = ja = null, cl = u, E.H = e, E.A = n, F === null && (El = null, ll = 0, Le()), i;
  }
  function sy() {
    for (; F !== null; ) bd(F);
  }
  function dy(l, t) {
    var a = cl;
    cl |= 2;
    var u = Sd(), e = gd();
    El !== l || ll !== t ? (zn = null, Tn = nt() + 500, Tu(l, t)) : gu = Nu(
      l,
      t
    );
    l: do
      try {
        if (yl !== 0 && F !== null) {
          t = F;
          var n = mt;
          t: switch (yl) {
            case 1:
              yl = 0, mt = null, zu(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (Us(n)) {
                yl = 0, mt = null, Ed(t);
                break;
              }
              t = function() {
                yl !== 2 && yl !== 9 || El !== l || (yl = 7), Ct(l);
              }, n.then(t, t);
              break l;
            case 3:
              yl = 7;
              break l;
            case 4:
              yl = 5;
              break l;
            case 7:
              Us(n) ? (yl = 0, mt = null, Ed(t)) : (yl = 0, mt = null, zu(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (F.tag) {
                case 26:
                  i = F.memoizedState;
                case 5:
                case 27:
                  var f = F;
                  if (i ? no(i) : f.stateNode.complete) {
                    yl = 0, mt = null;
                    var s = f.sibling;
                    if (s !== null) F = s;
                    else {
                      var v = f.return;
                      v !== null ? (F = v, Mn(v)) : F = null;
                    }
                    break t;
                  }
              }
              yl = 0, mt = null, zu(l, t, n, 5);
              break;
            case 6:
              yl = 0, mt = null, zu(l, t, n, 6);
              break;
            case 8:
              xf(), Ol = 6;
              break l;
            default:
              throw Error(m(462));
          }
        }
        oy();
        break;
      } catch (b) {
        hd(l, b);
      }
    while (!0);
    return Qt = ja = null, E.H = u, E.A = e, cl = a, F !== null ? 0 : (El = null, ll = 0, Le(), Ol);
  }
  function oy() {
    for (; F !== null && !Co(); )
      bd(F);
  }
  function bd(l) {
    var t = L0(l.alternate, l, Ft);
    l.memoizedProps = l.pendingProps, t === null ? Mn(l) : F = t;
  }
  function Ed(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = Y0(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          ll
        );
        break;
      case 11:
        t = Y0(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          ll
        );
        break;
      case 5:
        Fi(t);
      default:
        K0(a, t), t = F = gs(t, Ft), t = L0(a, t, Ft);
    }
    l.memoizedProps = l.pendingProps, t === null ? Mn(l) : F = t;
  }
  function zu(l, t, a, u) {
    Qt = ja = null, Fi(t), ou = null, wu = 0;
    var e = t.return;
    try {
      if (Pm(
        l,
        e,
        t,
        a,
        ll
      )) {
        Ol = 1, mn(
          l,
          gt(a, l.current)
        ), F = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw F = e, n;
      Ol = 1, mn(
        l,
        gt(a, l.current)
      ), F = null;
      return;
    }
    t.flags & 32768 ? (ul || u === 1 ? l = !0 : gu || (ll & 536870912) !== 0 ? l = !1 : (ma = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = dt.current, u !== null && u.tag === 13 && (u.flags |= 16384))), Td(t, l)) : Mn(t);
  }
  function Mn(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        Td(
          t,
          ma
        );
        return;
      }
      l = t.return;
      var a = ay(
        t.alternate,
        t,
        Ft
      );
      if (a !== null) {
        F = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        F = t;
        return;
      }
      F = t = l;
    } while (t !== null);
    Ol === 0 && (Ol = 5);
  }
  function Td(l, t) {
    do {
      var a = uy(l.alternate, l);
      if (a !== null) {
        a.flags &= 32767, F = a;
        return;
      }
      if (a = l.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (l = l.sibling, l !== null)) {
        F = l;
        return;
      }
      F = l = a;
    } while (l !== null);
    Ol = 6, F = null;
  }
  function zd(l, t, a, u, e, n, i, f, s) {
    l.cancelPendingCommit = null;
    do
      pn();
    while (Bl !== 0);
    if ((cl & 6) !== 0) throw Error(m(327));
    if (t !== null) {
      if (t === l.current) throw Error(m(177));
      if (n = t.lanes | t.childLanes, n |= Ai, Vo(
        l,
        a,
        n,
        i,
        f,
        s
      ), l === El && (F = El = null, ll = 0), Eu = t, ha = l, kt = a, Hf = n, jf = e, od = u, (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, hy(Oe, function() {
        return Od(), null;
      })) : (l.callbackNode = null, l.callbackPriority = 0), u = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || u) {
        u = E.T, E.T = null, e = U.p, U.p = 2, i = cl, cl |= 4;
        try {
          ey(l, t, a);
        } finally {
          cl = i, U.p = e, E.T = u;
        }
      }
      Bl = 1, Ad(), _d(), Md();
    }
  }
  function Ad() {
    if (Bl === 1) {
      Bl = 0;
      var l = ha, t = Eu, a = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || a) {
        a = E.T, E.T = null;
        var u = U.p;
        U.p = 2;
        var e = cl;
        cl |= 4;
        try {
          ud(t, l);
          var n = Wf, i = ss(l.containerInfo), f = n.focusedElem, s = n.selectionRange;
          if (i !== f && f && f.ownerDocument && cs(
            f.ownerDocument.documentElement,
            f
          )) {
            if (s !== null && gi(f)) {
              var v = s.start, b = s.end;
              if (b === void 0 && (b = v), "selectionStart" in f)
                f.selectionStart = v, f.selectionEnd = Math.min(
                  b,
                  f.value.length
                );
              else {
                var A = f.ownerDocument || document, h = A && A.defaultView || window;
                if (h.getSelection) {
                  var r = h.getSelection(), R = f.textContent.length, Z = Math.min(s.start, R), gl = s.end === void 0 ? Z : Math.min(s.end, R);
                  !r.extend && Z > gl && (i = gl, gl = Z, Z = i);
                  var o = fs(
                    f,
                    Z
                  ), d = fs(
                    f,
                    gl
                  );
                  if (o && d && (r.rangeCount !== 1 || r.anchorNode !== o.node || r.anchorOffset !== o.offset || r.focusNode !== d.node || r.focusOffset !== d.offset)) {
                    var y = A.createRange();
                    y.setStart(o.node, o.offset), r.removeAllRanges(), Z > gl ? (r.addRange(y), r.extend(d.node, d.offset)) : (y.setEnd(d.node, d.offset), r.addRange(y));
                  }
                }
              }
            }
            for (A = [], r = f; r = r.parentNode; )
              r.nodeType === 1 && A.push({
                element: r,
                left: r.scrollLeft,
                top: r.scrollTop
              });
            for (typeof f.focus == "function" && f.focus(), f = 0; f < A.length; f++) {
              var T = A[f];
              T.element.scrollLeft = T.left, T.element.scrollTop = T.top;
            }
          }
          Bn = !!wf, Wf = wf = null;
        } finally {
          cl = e, U.p = u, E.T = a;
        }
      }
      l.current = t, Bl = 2;
    }
  }
  function _d() {
    if (Bl === 2) {
      Bl = 0;
      var l = ha, t = Eu, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = E.T, E.T = null;
        var u = U.p;
        U.p = 2;
        var e = cl;
        cl |= 4;
        try {
          I0(l, t.alternate, t);
        } finally {
          cl = e, U.p = u, E.T = a;
        }
      }
      Bl = 3;
    }
  }
  function Md() {
    if (Bl === 4 || Bl === 3) {
      Bl = 0, xo();
      var l = ha, t = Eu, a = kt, u = od;
      (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? Bl = 5 : (Bl = 0, Eu = ha = null, pd(l, l.pendingLanes));
      var e = l.pendingLanes;
      if (e === 0 && (va = null), Pn(a), t = t.stateNode, it && typeof it.onCommitFiberRoot == "function")
        try {
          it.onCommitFiberRoot(
            Uu,
            t,
            void 0,
            (t.current.flags & 128) === 128
          );
        } catch {
        }
      if (u !== null) {
        t = E.T, e = U.p, U.p = 2, E.T = null;
        try {
          for (var n = l.onRecoverableError, i = 0; i < u.length; i++) {
            var f = u[i];
            n(f.value, {
              componentStack: f.stack
            });
          }
        } finally {
          E.T = t, U.p = e;
        }
      }
      (kt & 3) !== 0 && pn(), Ct(l), e = l.pendingLanes, (a & 261930) !== 0 && (e & 42) !== 0 ? l === Cf ? de++ : (de = 0, Cf = l) : de = 0, oe(0);
    }
  }
  function pd(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, Ku(t)));
  }
  function pn() {
    return Ad(), _d(), Md(), Od();
  }
  function Od() {
    if (Bl !== 5) return !1;
    var l = ha, t = Hf;
    Hf = 0;
    var a = Pn(kt), u = E.T, e = U.p;
    try {
      U.p = 32 > a ? 32 : a, E.T = null, a = jf, jf = null;
      var n = ha, i = kt;
      if (Bl = 0, Eu = ha = null, kt = 0, (cl & 6) !== 0) throw Error(m(331));
      var f = cl;
      if (cl |= 4, cd(n.current), nd(
        n,
        n.current,
        i,
        a
      ), cl = f, oe(0, !1), it && typeof it.onPostCommitFiberRoot == "function")
        try {
          it.onPostCommitFiberRoot(Uu, n);
        } catch {
        }
      return !0;
    } finally {
      U.p = e, E.T = u, pd(l, t);
    }
  }
  function Dd(l, t, a) {
    t = gt(a, t), t = mf(l.stateNode, t, 2), l = ca(l, t, 2), l !== null && (Ru(l, 2), Ct(l));
  }
  function vl(l, t, a) {
    if (l.tag === 3)
      Dd(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          Dd(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var u = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (va === null || !va.has(u))) {
            l = gt(a, l), a = U0(2), u = ca(t, a, 2), u !== null && (N0(
              a,
              u,
              t,
              l
            ), Ru(u, 2), Ct(u));
            break;
          }
        }
        t = t.return;
      }
  }
  function Yf(l, t, a) {
    var u = l.pingCache;
    if (u === null) {
      u = l.pingCache = new fy();
      var e = /* @__PURE__ */ new Set();
      u.set(t, e);
    } else
      e = u.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), u.set(t, e));
    e.has(a) || (Uf = !0, e.add(a), l = my.bind(null, l, t, a), t.then(l, l));
  }
  function my(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, El === l && (ll & a) === a && (Ol === 4 || Ol === 3 && (ll & 62914560) === ll && 300 > nt() - En ? (cl & 2) === 0 && Tu(l, 0) : Nf |= a, bu === ll && (bu = 0)), Ct(l);
  }
  function Ud(l, t) {
    t === 0 && (t = Ac()), l = Na(l, t), l !== null && (Ru(l, t), Ct(l));
  }
  function yy(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), Ud(l, a);
  }
  function vy(l, t) {
    var a = 0;
    switch (l.tag) {
      case 31:
      case 13:
        var u = l.stateNode, e = l.memoizedState;
        e !== null && (a = e.retryLane);
        break;
      case 19:
        u = l.stateNode;
        break;
      case 22:
        u = l.stateNode._retryCache;
        break;
      default:
        throw Error(m(314));
    }
    u !== null && u.delete(t), Ud(l, a);
  }
  function hy(l, t) {
    return $n(l, t);
  }
  var On = null, Au = null, Bf = !1, Dn = !1, Gf = !1, Sa = 0;
  function Ct(l) {
    l !== Au && l.next === null && (Au === null ? On = Au = l : Au = Au.next = l), Dn = !0, Bf || (Bf = !0, Sy());
  }
  function oe(l, t) {
    if (!Gf && Dn) {
      Gf = !0;
      do
        for (var a = !1, u = On; u !== null; ) {
          if (l !== 0) {
            var e = u.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = u.suspendedLanes, f = u.pingedLanes;
              n = (1 << 31 - ft(42 | l) + 1) - 1, n &= e & ~(i & ~f), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, jd(u, n));
          } else
            n = ll, n = Re(
              u,
              u === El ? n : 0,
              u.cancelPendingCommit !== null || u.timeoutHandle !== -1
            ), (n & 3) === 0 || Nu(u, n) || (a = !0, jd(u, n));
          u = u.next;
        }
      while (a);
      Gf = !1;
    }
  }
  function ry() {
    Nd();
  }
  function Nd() {
    Dn = Bf = !1;
    var l = 0;
    Sa !== 0 && Oy() && (l = Sa);
    for (var t = nt(), a = null, u = On; u !== null; ) {
      var e = u.next, n = Rd(u, t);
      n === 0 ? (u.next = null, a === null ? On = e : a.next = e, e === null && (Au = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (Dn = !0)), u = e;
    }
    Bl !== 0 && Bl !== 5 || oe(l), Sa !== 0 && (Sa = 0);
  }
  function Rd(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - ft(n), f = 1 << i, s = e[i];
      s === -1 ? ((f & a) === 0 || (f & u) !== 0) && (e[i] = Lo(f, t)) : s <= t && (l.expiredLanes |= f), n &= ~f;
    }
    if (t = El, a = ll, a = Re(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u = l.callbackNode, a === 0 || l === t && (yl === 2 || yl === 9) || l.cancelPendingCommit !== null)
      return u !== null && u !== null && Fn(u), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || Nu(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (u !== null && Fn(u), Pn(a)) {
        case 2:
        case 8:
          a = Tc;
          break;
        case 32:
          a = Oe;
          break;
        case 268435456:
          a = zc;
          break;
        default:
          a = Oe;
      }
      return u = Hd.bind(null, l), a = $n(a, u), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return u !== null && u !== null && Fn(u), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function Hd(l, t) {
    if (Bl !== 0 && Bl !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (pn() && l.callbackNode !== a)
      return null;
    var u = ll;
    return u = Re(
      l,
      l === El ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (yd(l, u, t), Rd(l, nt()), l.callbackNode != null && l.callbackNode === a ? Hd.bind(null, l) : null);
  }
  function jd(l, t) {
    if (pn()) return null;
    yd(l, t, !0);
  }
  function Sy() {
    Uy(function() {
      (cl & 6) !== 0 ? $n(
        Ec,
        ry
      ) : Nd();
    });
  }
  function Qf() {
    if (Sa === 0) {
      var l = cu;
      l === 0 && (l = De, De <<= 1, (De & 261888) === 0 && (De = 256)), Sa = l;
    }
    return Sa;
  }
  function Cd(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : xe("" + l);
  }
  function xd(l, t) {
    var a = t.ownerDocument.createElement("input");
    return a.name = t.name, a.value = t.value, l.id && a.setAttribute("form", l.id), t.parentNode.insertBefore(a, t), l = new FormData(l), a.parentNode.removeChild(a), l;
  }
  function gy(l, t, a, u, e) {
    if (t === "submit" && a && a.stateNode === e) {
      var n = Cd(
        (e[Fl] || null).action
      ), i = u.submitter;
      i && (t = (t = i[Fl] || null) ? Cd(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var f = new Ge(
        "action",
        "action",
        null,
        u,
        e
      );
      l.push({
        event: f,
        listeners: [
          {
            instance: null,
            listener: function() {
              if (u.defaultPrevented) {
                if (Sa !== 0) {
                  var s = i ? xd(e, i) : new FormData(e);
                  nf(
                    a,
                    {
                      pending: !0,
                      data: s,
                      method: e.method,
                      action: n
                    },
                    null,
                    s
                  );
                }
              } else
                typeof n == "function" && (f.preventDefault(), s = i ? xd(e, i) : new FormData(e), nf(
                  a,
                  {
                    pending: !0,
                    data: s,
                    method: e.method,
                    action: n
                  },
                  n,
                  s
                ));
            },
            currentTarget: e
          }
        ]
      });
    }
  }
  for (var Xf = 0; Xf < zi.length; Xf++) {
    var Zf = zi[Xf], by = Zf.toLowerCase(), Ey = Zf[0].toUpperCase() + Zf.slice(1);
    pt(
      by,
      "on" + Ey
    );
  }
  pt(ms, "onAnimationEnd"), pt(ys, "onAnimationIteration"), pt(vs, "onAnimationStart"), pt("dblclick", "onDoubleClick"), pt("focusin", "onFocus"), pt("focusout", "onBlur"), pt(qm, "onTransitionRun"), pt(Ym, "onTransitionStart"), pt(Bm, "onTransitionCancel"), pt(hs, "onTransitionEnd"), Wa("onMouseEnter", ["mouseout", "mouseover"]), Wa("onMouseLeave", ["mouseout", "mouseover"]), Wa("onPointerEnter", ["pointerout", "pointerover"]), Wa("onPointerLeave", ["pointerout", "pointerover"]), pa(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), pa(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), pa("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), pa(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), pa(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), pa(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var me = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), Ty = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(me)
  );
  function qd(l, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < l.length; a++) {
      var u = l[a], e = u.event;
      u = u.listeners;
      l: {
        var n = void 0;
        if (t)
          for (var i = u.length - 1; 0 <= i; i--) {
            var f = u[i], s = f.instance, v = f.currentTarget;
            if (f = f.listener, s !== n && e.isPropagationStopped())
              break l;
            n = f, e.currentTarget = v;
            try {
              n(e);
            } catch (b) {
              Ze(b);
            }
            e.currentTarget = null, n = s;
          }
        else
          for (i = 0; i < u.length; i++) {
            if (f = u[i], s = f.instance, v = f.currentTarget, f = f.listener, s !== n && e.isPropagationStopped())
              break l;
            n = f, e.currentTarget = v;
            try {
              n(e);
            } catch (b) {
              Ze(b);
            }
            e.currentTarget = null, n = s;
          }
      }
    }
  }
  function k(l, t) {
    var a = t[li];
    a === void 0 && (a = t[li] = /* @__PURE__ */ new Set());
    var u = l + "__bubble";
    a.has(u) || (Yd(t, l, 2, !1), a.add(u));
  }
  function Lf(l, t, a) {
    var u = 0;
    t && (u |= 4), Yd(
      a,
      l,
      u,
      t
    );
  }
  var Un = "_reactListening" + Math.random().toString(36).slice(2);
  function Vf(l) {
    if (!l[Un]) {
      l[Un] = !0, Nc.forEach(function(a) {
        a !== "selectionchange" && (Ty.has(a) || Lf(a, !1, l), Lf(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Un] || (t[Un] = !0, Lf("selectionchange", !1, t));
    }
  }
  function Yd(l, t, a, u) {
    switch (yo(t)) {
      case 2:
        var e = $y;
        break;
      case 8:
        e = Fy;
        break;
      default:
        e = nc;
    }
    a = e.bind(
      null,
      t,
      a,
      l
    ), e = void 0, !si || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (e = !0), u ? e !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: e
    }) : l.addEventListener(t, a, !0) : e !== void 0 ? l.addEventListener(t, a, {
      passive: e
    }) : l.addEventListener(t, a, !1);
  }
  function Kf(l, t, a, u, e) {
    var n = u;
    if ((t & 1) === 0 && (t & 2) === 0 && u !== null)
      l: for (; ; ) {
        if (u === null) return;
        var i = u.tag;
        if (i === 3 || i === 4) {
          var f = u.stateNode.containerInfo;
          if (f === e) break;
          if (i === 4)
            for (i = u.return; i !== null; ) {
              var s = i.tag;
              if ((s === 3 || s === 4) && i.stateNode.containerInfo === e)
                return;
              i = i.return;
            }
          for (; f !== null; ) {
            if (i = Ka(f), i === null) return;
            if (s = i.tag, s === 5 || s === 6 || s === 26 || s === 27) {
              u = n = i;
              continue l;
            }
            f = f.parentNode;
          }
        }
        u = u.return;
      }
    Zc(function() {
      var v = n, b = fi(a), A = [];
      l: {
        var h = rs.get(l);
        if (h !== void 0) {
          var r = Ge, R = l;
          switch (l) {
            case "keypress":
              if (Ye(a) === 0) break l;
            case "keydown":
            case "keyup":
              r = vm;
              break;
            case "focusin":
              R = "focus", r = yi;
              break;
            case "focusout":
              R = "blur", r = yi;
              break;
            case "beforeblur":
            case "afterblur":
              r = yi;
              break;
            case "click":
              if (a.button === 2) break l;
            case "auxclick":
            case "dblclick":
            case "mousedown":
            case "mousemove":
            case "mouseup":
            case "mouseout":
            case "mouseover":
            case "contextmenu":
              r = Kc;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              r = am;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              r = Sm;
              break;
            case ms:
            case ys:
            case vs:
              r = nm;
              break;
            case hs:
              r = bm;
              break;
            case "scroll":
            case "scrollend":
              r = lm;
              break;
            case "wheel":
              r = Tm;
              break;
            case "copy":
            case "cut":
            case "paste":
              r = fm;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              r = wc;
              break;
            case "toggle":
            case "beforetoggle":
              r = Am;
          }
          var Z = (t & 4) !== 0, gl = !Z && (l === "scroll" || l === "scrollend"), o = Z ? h !== null ? h + "Capture" : null : h;
          Z = [];
          for (var d = v, y; d !== null; ) {
            var T = d;
            if (y = T.stateNode, T = T.tag, T !== 5 && T !== 26 && T !== 27 || y === null || o === null || (T = Cu(d, o), T != null && Z.push(
              ye(d, T, y)
            )), gl) break;
            d = d.return;
          }
          0 < Z.length && (h = new r(
            h,
            R,
            null,
            a,
            b
          ), A.push({ event: h, listeners: Z }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (h = l === "mouseover" || l === "pointerover", r = l === "mouseout" || l === "pointerout", h && a !== ii && (R = a.relatedTarget || a.fromElement) && (Ka(R) || R[Va]))
            break l;
          if ((r || h) && (h = b.window === b ? b : (h = b.ownerDocument) ? h.defaultView || h.parentWindow : window, r ? (R = a.relatedTarget || a.toElement, r = v, R = R ? Ka(R) : null, R !== null && (gl = B(R), Z = R.tag, R !== gl || Z !== 5 && Z !== 27 && Z !== 6) && (R = null)) : (r = null, R = v), r !== R)) {
            if (Z = Kc, T = "onMouseLeave", o = "onMouseEnter", d = "mouse", (l === "pointerout" || l === "pointerover") && (Z = wc, T = "onPointerLeave", o = "onPointerEnter", d = "pointer"), gl = r == null ? h : ju(r), y = R == null ? h : ju(R), h = new Z(
              T,
              d + "leave",
              r,
              a,
              b
            ), h.target = gl, h.relatedTarget = y, T = null, Ka(b) === v && (Z = new Z(
              o,
              d + "enter",
              R,
              a,
              b
            ), Z.target = y, Z.relatedTarget = gl, T = Z), gl = T, r && R)
              t: {
                for (Z = zy, o = r, d = R, y = 0, T = o; T; T = Z(T))
                  y++;
                T = 0;
                for (var Y = d; Y; Y = Z(Y))
                  T++;
                for (; 0 < y - T; )
                  o = Z(o), y--;
                for (; 0 < T - y; )
                  d = Z(d), T--;
                for (; y--; ) {
                  if (o === d || d !== null && o === d.alternate) {
                    Z = o;
                    break t;
                  }
                  o = Z(o), d = Z(d);
                }
                Z = null;
              }
            else Z = null;
            r !== null && Bd(
              A,
              h,
              r,
              Z,
              !1
            ), R !== null && gl !== null && Bd(
              A,
              gl,
              R,
              Z,
              !0
            );
          }
        }
        l: {
          if (h = v ? ju(v) : window, r = h.nodeName && h.nodeName.toLowerCase(), r === "select" || r === "input" && h.type === "file")
            var nl = ts;
          else if (Pc(h))
            if (as)
              nl = jm;
            else {
              nl = Rm;
              var q = Nm;
            }
          else
            r = h.nodeName, !r || r.toLowerCase() !== "input" || h.type !== "checkbox" && h.type !== "radio" ? v && ni(v.elementType) && (nl = ts) : nl = Hm;
          if (nl && (nl = nl(l, v))) {
            ls(
              A,
              nl,
              a,
              b
            );
            break l;
          }
          q && q(l, h, v), l === "focusout" && v && h.type === "number" && v.memoizedProps.value != null && ei(h, "number", h.value);
        }
        switch (q = v ? ju(v) : window, l) {
          case "focusin":
            (Pc(q) || q.contentEditable === "true") && (lu = q, bi = v, Zu = null);
            break;
          case "focusout":
            Zu = bi = lu = null;
            break;
          case "mousedown":
            Ei = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Ei = !1, ds(A, a, b);
            break;
          case "selectionchange":
            if (xm) break;
          case "keydown":
          case "keyup":
            ds(A, a, b);
        }
        var w;
        if (hi)
          l: {
            switch (l) {
              case "compositionstart":
                var tl = "onCompositionStart";
                break l;
              case "compositionend":
                tl = "onCompositionEnd";
                break l;
              case "compositionupdate":
                tl = "onCompositionUpdate";
                break l;
            }
            tl = void 0;
          }
        else
          Pa ? kc(l, a) && (tl = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (tl = "onCompositionStart");
        tl && (Wc && a.locale !== "ko" && (Pa || tl !== "onCompositionStart" ? tl === "onCompositionEnd" && Pa && (w = Lc()) : (ta = b, di = "value" in ta ? ta.value : ta.textContent, Pa = !0)), q = Nn(v, tl), 0 < q.length && (tl = new Jc(
          tl,
          l,
          null,
          a,
          b
        ), A.push({ event: tl, listeners: q }), w ? tl.data = w : (w = Ic(a), w !== null && (tl.data = w)))), (w = Mm ? pm(l, a) : Om(l, a)) && (tl = Nn(v, "onBeforeInput"), 0 < tl.length && (q = new Jc(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          b
        ), A.push({
          event: q,
          listeners: tl
        }), q.data = w)), gy(
          A,
          l,
          v,
          a,
          b
        );
      }
      qd(A, t);
    });
  }
  function ye(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function Nn(l, t) {
    for (var a = t + "Capture", u = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = Cu(l, a), e != null && u.unshift(
        ye(l, e, n)
      ), e = Cu(l, t), e != null && u.push(
        ye(l, e, n)
      )), l.tag === 3) return u;
      l = l.return;
    }
    return [];
  }
  function zy(l) {
    if (l === null) return null;
    do
      l = l.return;
    while (l && l.tag !== 5 && l.tag !== 27);
    return l || null;
  }
  function Bd(l, t, a, u, e) {
    for (var n = t._reactName, i = []; a !== null && a !== u; ) {
      var f = a, s = f.alternate, v = f.stateNode;
      if (f = f.tag, s !== null && s === u) break;
      f !== 5 && f !== 26 && f !== 27 || v === null || (s = v, e ? (v = Cu(a, n), v != null && i.unshift(
        ye(a, v, s)
      )) : e || (v = Cu(a, n), v != null && i.push(
        ye(a, v, s)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var Ay = /\r\n?/g, _y = /\u0000|\uFFFD/g;
  function Gd(l) {
    return (typeof l == "string" ? l : "" + l).replace(Ay, `
`).replace(_y, "");
  }
  function Qd(l, t) {
    return t = Gd(t), Gd(l) === t;
  }
  function Sl(l, t, a, u, e, n) {
    switch (a) {
      case "children":
        typeof u == "string" ? t === "body" || t === "textarea" && u === "" || Fa(l, u) : (typeof u == "number" || typeof u == "bigint") && t !== "body" && Fa(l, "" + u);
        break;
      case "className":
        je(l, "class", u);
        break;
      case "tabIndex":
        je(l, "tabindex", u);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        je(l, a, u);
        break;
      case "style":
        Qc(l, u, n);
        break;
      case "data":
        if (t !== "object") {
          je(l, "data", u);
          break;
        }
      case "src":
      case "href":
        if (u === "" && (t !== "a" || a !== "href")) {
          l.removeAttribute(a);
          break;
        }
        if (u == null || typeof u == "function" || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = xe("" + u), l.setAttribute(a, u);
        break;
      case "action":
      case "formAction":
        if (typeof u == "function") {
          l.setAttribute(
            a,
            "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')"
          );
          break;
        } else
          typeof n == "function" && (a === "formAction" ? (t !== "input" && Sl(l, t, "name", e.name, e, null), Sl(
            l,
            t,
            "formEncType",
            e.formEncType,
            e,
            null
          ), Sl(
            l,
            t,
            "formMethod",
            e.formMethod,
            e,
            null
          ), Sl(
            l,
            t,
            "formTarget",
            e.formTarget,
            e,
            null
          )) : (Sl(l, t, "encType", e.encType, e, null), Sl(l, t, "method", e.method, e, null), Sl(l, t, "target", e.target, e, null)));
        if (u == null || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = xe("" + u), l.setAttribute(a, u);
        break;
      case "onClick":
        u != null && (l.onclick = qt);
        break;
      case "onScroll":
        u != null && k("scroll", l);
        break;
      case "onScrollEnd":
        u != null && k("scrollend", l);
        break;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(m(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(m(60));
            l.innerHTML = a;
          }
        }
        break;
      case "multiple":
        l.multiple = u && typeof u != "function" && typeof u != "symbol";
        break;
      case "muted":
        l.muted = u && typeof u != "function" && typeof u != "symbol";
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "defaultValue":
      case "defaultChecked":
      case "innerHTML":
      case "ref":
        break;
      case "autoFocus":
        break;
      case "xlinkHref":
        if (u == null || typeof u == "function" || typeof u == "boolean" || typeof u == "symbol") {
          l.removeAttribute("xlink:href");
          break;
        }
        a = xe("" + u), l.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          a
        );
        break;
      case "contentEditable":
      case "spellCheck":
      case "draggable":
      case "value":
      case "autoReverse":
      case "externalResourcesRequired":
      case "focusable":
      case "preserveAlpha":
        u != null && typeof u != "function" && typeof u != "symbol" ? l.setAttribute(a, "" + u) : l.removeAttribute(a);
        break;
      case "inert":
      case "allowFullScreen":
      case "async":
      case "autoPlay":
      case "controls":
      case "default":
      case "defer":
      case "disabled":
      case "disablePictureInPicture":
      case "disableRemotePlayback":
      case "formNoValidate":
      case "hidden":
      case "loop":
      case "noModule":
      case "noValidate":
      case "open":
      case "playsInline":
      case "readOnly":
      case "required":
      case "reversed":
      case "scoped":
      case "seamless":
      case "itemScope":
        u && typeof u != "function" && typeof u != "symbol" ? l.setAttribute(a, "") : l.removeAttribute(a);
        break;
      case "capture":
      case "download":
        u === !0 ? l.setAttribute(a, "") : u !== !1 && u != null && typeof u != "function" && typeof u != "symbol" ? l.setAttribute(a, u) : l.removeAttribute(a);
        break;
      case "cols":
      case "rows":
      case "size":
      case "span":
        u != null && typeof u != "function" && typeof u != "symbol" && !isNaN(u) && 1 <= u ? l.setAttribute(a, u) : l.removeAttribute(a);
        break;
      case "rowSpan":
      case "start":
        u == null || typeof u == "function" || typeof u == "symbol" || isNaN(u) ? l.removeAttribute(a) : l.setAttribute(a, u);
        break;
      case "popover":
        k("beforetoggle", l), k("toggle", l), He(l, "popover", u);
        break;
      case "xlinkActuate":
        xt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          u
        );
        break;
      case "xlinkArcrole":
        xt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          u
        );
        break;
      case "xlinkRole":
        xt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          u
        );
        break;
      case "xlinkShow":
        xt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          u
        );
        break;
      case "xlinkTitle":
        xt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          u
        );
        break;
      case "xlinkType":
        xt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          u
        );
        break;
      case "xmlBase":
        xt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          u
        );
        break;
      case "xmlLang":
        xt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          u
        );
        break;
      case "xmlSpace":
        xt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          u
        );
        break;
      case "is":
        He(l, "is", u);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N") && (a = Io.get(a) || a, He(l, a, u));
    }
  }
  function Jf(l, t, a, u, e, n) {
    switch (a) {
      case "style":
        Qc(l, u, n);
        break;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(m(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(m(60));
            l.innerHTML = a;
          }
        }
        break;
      case "children":
        typeof u == "string" ? Fa(l, u) : (typeof u == "number" || typeof u == "bigint") && Fa(l, "" + u);
        break;
      case "onScroll":
        u != null && k("scroll", l);
        break;
      case "onScrollEnd":
        u != null && k("scrollend", l);
        break;
      case "onClick":
        u != null && (l.onclick = qt);
        break;
      case "suppressContentEditableWarning":
      case "suppressHydrationWarning":
      case "innerHTML":
      case "ref":
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        if (!Rc.hasOwnProperty(a))
          l: {
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), t = a.slice(2, e ? a.length - 7 : void 0), n = l[Fl] || null, n = n != null ? n[a] : null, typeof n == "function" && l.removeEventListener(t, n, e), typeof u == "function")) {
              typeof n != "function" && n !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(t, u, e);
              break l;
            }
            a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : He(l, a, u);
          }
    }
  }
  function wl(l, t, a) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "img":
        k("error", l), k("load", l);
        var u = !1, e = !1, n;
        for (n in a)
          if (a.hasOwnProperty(n)) {
            var i = a[n];
            if (i != null)
              switch (n) {
                case "src":
                  u = !0;
                  break;
                case "srcSet":
                  e = !0;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  throw Error(m(137, t));
                default:
                  Sl(l, t, n, i, a, null);
              }
          }
        e && Sl(l, t, "srcSet", a.srcSet, a, null), u && Sl(l, t, "src", a.src, a, null);
        return;
      case "input":
        k("invalid", l);
        var f = n = i = e = null, s = null, v = null;
        for (u in a)
          if (a.hasOwnProperty(u)) {
            var b = a[u];
            if (b != null)
              switch (u) {
                case "name":
                  e = b;
                  break;
                case "type":
                  i = b;
                  break;
                case "checked":
                  s = b;
                  break;
                case "defaultChecked":
                  v = b;
                  break;
                case "value":
                  n = b;
                  break;
                case "defaultValue":
                  f = b;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (b != null)
                    throw Error(m(137, t));
                  break;
                default:
                  Sl(l, t, u, b, a, null);
              }
          }
        qc(
          l,
          n,
          f,
          s,
          v,
          i,
          e,
          !1
        );
        return;
      case "select":
        k("invalid", l), u = i = n = null;
        for (e in a)
          if (a.hasOwnProperty(e) && (f = a[e], f != null))
            switch (e) {
              case "value":
                n = f;
                break;
              case "defaultValue":
                i = f;
                break;
              case "multiple":
                u = f;
              default:
                Sl(l, t, e, f, a, null);
            }
        t = n, a = i, l.multiple = !!u, t != null ? $a(l, !!u, t, !1) : a != null && $a(l, !!u, a, !0);
        return;
      case "textarea":
        k("invalid", l), n = e = u = null;
        for (i in a)
          if (a.hasOwnProperty(i) && (f = a[i], f != null))
            switch (i) {
              case "value":
                u = f;
                break;
              case "defaultValue":
                e = f;
                break;
              case "children":
                n = f;
                break;
              case "dangerouslySetInnerHTML":
                if (f != null) throw Error(m(91));
                break;
              default:
                Sl(l, t, i, f, a, null);
            }
        Bc(l, u, e, n);
        return;
      case "option":
        for (s in a)
          if (a.hasOwnProperty(s) && (u = a[s], u != null))
            switch (s) {
              case "selected":
                l.selected = u && typeof u != "function" && typeof u != "symbol";
                break;
              default:
                Sl(l, t, s, u, a, null);
            }
        return;
      case "dialog":
        k("beforetoggle", l), k("toggle", l), k("cancel", l), k("close", l);
        break;
      case "iframe":
      case "object":
        k("load", l);
        break;
      case "video":
      case "audio":
        for (u = 0; u < me.length; u++)
          k(me[u], l);
        break;
      case "image":
        k("error", l), k("load", l);
        break;
      case "details":
        k("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        k("error", l), k("load", l);
      case "area":
      case "base":
      case "br":
      case "col":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "track":
      case "wbr":
      case "menuitem":
        for (v in a)
          if (a.hasOwnProperty(v) && (u = a[v], u != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(m(137, t));
              default:
                Sl(l, t, v, u, a, null);
            }
        return;
      default:
        if (ni(t)) {
          for (b in a)
            a.hasOwnProperty(b) && (u = a[b], u !== void 0 && Jf(
              l,
              t,
              b,
              u,
              a,
              void 0
            ));
          return;
        }
    }
    for (f in a)
      a.hasOwnProperty(f) && (u = a[f], u != null && Sl(l, t, f, u, a, null));
  }
  function My(l, t, a, u) {
    switch (t) {
      case "div":
      case "span":
      case "svg":
      case "path":
      case "a":
      case "g":
      case "p":
      case "li":
        break;
      case "input":
        var e = null, n = null, i = null, f = null, s = null, v = null, b = null;
        for (r in a) {
          var A = a[r];
          if (a.hasOwnProperty(r) && A != null)
            switch (r) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                s = A;
              default:
                u.hasOwnProperty(r) || Sl(l, t, r, null, u, A);
            }
        }
        for (var h in u) {
          var r = u[h];
          if (A = a[h], u.hasOwnProperty(h) && (r != null || A != null))
            switch (h) {
              case "type":
                n = r;
                break;
              case "name":
                e = r;
                break;
              case "checked":
                v = r;
                break;
              case "defaultChecked":
                b = r;
                break;
              case "value":
                i = r;
                break;
              case "defaultValue":
                f = r;
                break;
              case "children":
              case "dangerouslySetInnerHTML":
                if (r != null)
                  throw Error(m(137, t));
                break;
              default:
                r !== A && Sl(
                  l,
                  t,
                  h,
                  r,
                  u,
                  A
                );
            }
        }
        ui(
          l,
          i,
          f,
          s,
          v,
          b,
          n,
          e
        );
        return;
      case "select":
        r = i = f = h = null;
        for (n in a)
          if (s = a[n], a.hasOwnProperty(n) && s != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                r = s;
              default:
                u.hasOwnProperty(n) || Sl(
                  l,
                  t,
                  n,
                  null,
                  u,
                  s
                );
            }
        for (e in u)
          if (n = u[e], s = a[e], u.hasOwnProperty(e) && (n != null || s != null))
            switch (e) {
              case "value":
                h = n;
                break;
              case "defaultValue":
                f = n;
                break;
              case "multiple":
                i = n;
              default:
                n !== s && Sl(
                  l,
                  t,
                  e,
                  n,
                  u,
                  s
                );
            }
        t = f, a = i, u = r, h != null ? $a(l, !!a, h, !1) : !!u != !!a && (t != null ? $a(l, !!a, t, !0) : $a(l, !!a, a ? [] : "", !1));
        return;
      case "textarea":
        r = h = null;
        for (f in a)
          if (e = a[f], a.hasOwnProperty(f) && e != null && !u.hasOwnProperty(f))
            switch (f) {
              case "value":
                break;
              case "children":
                break;
              default:
                Sl(l, t, f, null, u, e);
            }
        for (i in u)
          if (e = u[i], n = a[i], u.hasOwnProperty(i) && (e != null || n != null))
            switch (i) {
              case "value":
                h = e;
                break;
              case "defaultValue":
                r = e;
                break;
              case "children":
                break;
              case "dangerouslySetInnerHTML":
                if (e != null) throw Error(m(91));
                break;
              default:
                e !== n && Sl(l, t, i, e, u, n);
            }
        Yc(l, h, r);
        return;
      case "option":
        for (var R in a)
          if (h = a[R], a.hasOwnProperty(R) && h != null && !u.hasOwnProperty(R))
            switch (R) {
              case "selected":
                l.selected = !1;
                break;
              default:
                Sl(
                  l,
                  t,
                  R,
                  null,
                  u,
                  h
                );
            }
        for (s in u)
          if (h = u[s], r = a[s], u.hasOwnProperty(s) && h !== r && (h != null || r != null))
            switch (s) {
              case "selected":
                l.selected = h && typeof h != "function" && typeof h != "symbol";
                break;
              default:
                Sl(
                  l,
                  t,
                  s,
                  h,
                  u,
                  r
                );
            }
        return;
      case "img":
      case "link":
      case "area":
      case "base":
      case "br":
      case "col":
      case "embed":
      case "hr":
      case "keygen":
      case "meta":
      case "param":
      case "source":
      case "track":
      case "wbr":
      case "menuitem":
        for (var Z in a)
          h = a[Z], a.hasOwnProperty(Z) && h != null && !u.hasOwnProperty(Z) && Sl(l, t, Z, null, u, h);
        for (v in u)
          if (h = u[v], r = a[v], u.hasOwnProperty(v) && h !== r && (h != null || r != null))
            switch (v) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (h != null)
                  throw Error(m(137, t));
                break;
              default:
                Sl(
                  l,
                  t,
                  v,
                  h,
                  u,
                  r
                );
            }
        return;
      default:
        if (ni(t)) {
          for (var gl in a)
            h = a[gl], a.hasOwnProperty(gl) && h !== void 0 && !u.hasOwnProperty(gl) && Jf(
              l,
              t,
              gl,
              void 0,
              u,
              h
            );
          for (b in u)
            h = u[b], r = a[b], !u.hasOwnProperty(b) || h === r || h === void 0 && r === void 0 || Jf(
              l,
              t,
              b,
              h,
              u,
              r
            );
          return;
        }
    }
    for (var o in a)
      h = a[o], a.hasOwnProperty(o) && h != null && !u.hasOwnProperty(o) && Sl(l, t, o, null, u, h);
    for (A in u)
      h = u[A], r = a[A], !u.hasOwnProperty(A) || h === r || h == null && r == null || Sl(l, t, A, h, u, r);
  }
  function Xd(l) {
    switch (l) {
      case "css":
      case "script":
      case "font":
      case "img":
      case "image":
      case "input":
      case "link":
        return !0;
      default:
        return !1;
    }
  }
  function py() {
    if (typeof performance.getEntriesByType == "function") {
      for (var l = 0, t = 0, a = performance.getEntriesByType("resource"), u = 0; u < a.length; u++) {
        var e = a[u], n = e.transferSize, i = e.initiatorType, f = e.duration;
        if (n && f && Xd(i)) {
          for (i = 0, f = e.responseEnd, u += 1; u < a.length; u++) {
            var s = a[u], v = s.startTime;
            if (v > f) break;
            var b = s.transferSize, A = s.initiatorType;
            b && Xd(A) && (s = s.responseEnd, i += b * (s < f ? 1 : (f - v) / (s - v)));
          }
          if (--u, t += 8 * (n + i) / (e.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var wf = null, Wf = null;
  function Rn(l) {
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  function Zd(l) {
    switch (l) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function Ld(l, t) {
    if (l === 0)
      switch (t) {
        case "svg":
          return 1;
        case "math":
          return 2;
        default:
          return 0;
      }
    return l === 1 && t === "foreignObject" ? 0 : l;
  }
  function $f(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var Ff = null;
  function Oy() {
    var l = window.event;
    return l && l.type === "popstate" ? l === Ff ? !1 : (Ff = l, !0) : (Ff = null, !1);
  }
  var Vd = typeof setTimeout == "function" ? setTimeout : void 0, Dy = typeof clearTimeout == "function" ? clearTimeout : void 0, Kd = typeof Promise == "function" ? Promise : void 0, Uy = typeof queueMicrotask == "function" ? queueMicrotask : typeof Kd < "u" ? function(l) {
    return Kd.resolve(null).then(l).catch(Ny);
  } : Vd;
  function Ny(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function ga(l) {
    return l === "head";
  }
  function Jd(l, t) {
    var a = t, u = 0;
    do {
      var e = a.nextSibling;
      if (l.removeChild(a), e && e.nodeType === 8)
        if (a = e.data, a === "/$" || a === "/&") {
          if (u === 0) {
            l.removeChild(e), Ou(t);
            return;
          }
          u--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          u++;
        else if (a === "html")
          ve(l.ownerDocument.documentElement);
        else if (a === "head") {
          a = l.ownerDocument.head, ve(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, f = n.nodeName;
            n[Hu] || f === "SCRIPT" || f === "STYLE" || f === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && ve(l.ownerDocument.body);
      a = e;
    } while (a);
    Ou(t);
  }
  function wd(l, t) {
    var a = l;
    l = 0;
    do {
      var u = a.nextSibling;
      if (a.nodeType === 1 ? t ? (a._stashedDisplay = a.style.display, a.style.display = "none") : (a.style.display = a._stashedDisplay || "", a.getAttribute("style") === "" && a.removeAttribute("style")) : a.nodeType === 3 && (t ? (a._stashedText = a.nodeValue, a.nodeValue = "") : a.nodeValue = a._stashedText || ""), u && u.nodeType === 8)
        if (a = u.data, a === "/$") {
          if (l === 0) break;
          l--;
        } else
          a !== "$" && a !== "$?" && a !== "$~" && a !== "$!" || l++;
      a = u;
    } while (a);
  }
  function kf(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          kf(a), ti(a);
          continue;
        case "SCRIPT":
        case "STYLE":
          continue;
        case "LINK":
          if (a.rel.toLowerCase() === "stylesheet") continue;
      }
      l.removeChild(a);
    }
  }
  function Ry(l, t, a, u) {
    for (; l.nodeType === 1; ) {
      var e = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!u && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (u) {
        if (!l[Hu])
          switch (t) {
            case "meta":
              if (!l.hasAttribute("itemprop")) break;
              return l;
            case "link":
              if (n = l.getAttribute("rel"), n === "stylesheet" && l.hasAttribute("data-precedence"))
                break;
              if (n !== e.rel || l.getAttribute("href") !== (e.href == null || e.href === "" ? null : e.href) || l.getAttribute("crossorigin") !== (e.crossOrigin == null ? null : e.crossOrigin) || l.getAttribute("title") !== (e.title == null ? null : e.title))
                break;
              return l;
            case "style":
              if (l.hasAttribute("data-precedence")) break;
              return l;
            case "script":
              if (n = l.getAttribute("src"), (n !== (e.src == null ? null : e.src) || l.getAttribute("type") !== (e.type == null ? null : e.type) || l.getAttribute("crossorigin") !== (e.crossOrigin == null ? null : e.crossOrigin)) && n && l.hasAttribute("async") && !l.hasAttribute("itemprop"))
                break;
              return l;
            default:
              return l;
          }
      } else if (t === "input" && l.type === "hidden") {
        var n = e.name == null ? null : "" + e.name;
        if (e.type === "hidden" && l.getAttribute("name") === n)
          return l;
      } else return l;
      if (l = At(l.nextSibling), l === null) break;
    }
    return null;
  }
  function Hy(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = At(l.nextSibling), l === null)) return null;
    return l;
  }
  function Wd(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = At(l.nextSibling), l === null)) return null;
    return l;
  }
  function If(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function Pf(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function jy(l, t) {
    var a = l.ownerDocument;
    if (l.data === "$~") l._reactRetry = t;
    else if (l.data !== "$?" || a.readyState !== "loading")
      t();
    else {
      var u = function() {
        t(), a.removeEventListener("DOMContentLoaded", u);
      };
      a.addEventListener("DOMContentLoaded", u), l._reactRetry = u;
    }
  }
  function At(l) {
    for (; l != null; l = l.nextSibling) {
      var t = l.nodeType;
      if (t === 1 || t === 3) break;
      if (t === 8) {
        if (t = l.data, t === "$" || t === "$!" || t === "$?" || t === "$~" || t === "&" || t === "F!" || t === "F")
          break;
        if (t === "/$" || t === "/&") return null;
      }
    }
    return l;
  }
  var lc = null;
  function $d(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "/$" || a === "/&") {
          if (t === 0)
            return At(l.nextSibling);
          t--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || t++;
      }
      l = l.nextSibling;
    }
    return null;
  }
  function Fd(l) {
    l = l.previousSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "$" || a === "$!" || a === "$?" || a === "$~" || a === "&") {
          if (t === 0) return l;
          t--;
        } else a !== "/$" && a !== "/&" || t++;
      }
      l = l.previousSibling;
    }
    return null;
  }
  function kd(l, t, a) {
    switch (t = Rn(a), l) {
      case "html":
        if (l = t.documentElement, !l) throw Error(m(452));
        return l;
      case "head":
        if (l = t.head, !l) throw Error(m(453));
        return l;
      case "body":
        if (l = t.body, !l) throw Error(m(454));
        return l;
      default:
        throw Error(m(451));
    }
  }
  function ve(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    ti(l);
  }
  var _t = /* @__PURE__ */ new Map(), Id = /* @__PURE__ */ new Set();
  function Hn(l) {
    return typeof l.getRootNode == "function" ? l.getRootNode() : l.nodeType === 9 ? l : l.ownerDocument;
  }
  var It = U.d;
  U.d = {
    f: Cy,
    r: xy,
    D: qy,
    C: Yy,
    L: By,
    m: Gy,
    X: Xy,
    S: Qy,
    M: Zy
  };
  function Cy() {
    var l = It.f(), t = An();
    return l || t;
  }
  function xy(l) {
    var t = Ja(l);
    t !== null && t.tag === 5 && t.type === "form" ? h0(t) : It.r(l);
  }
  var _u = typeof document > "u" ? null : document;
  function Pd(l, t, a) {
    var u = _u;
    if (u && typeof t == "string" && t) {
      var e = rt(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), Id.has(e) || (Id.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), wl(t, "link", l), Gl(t), u.head.appendChild(t)));
    }
  }
  function qy(l) {
    It.D(l), Pd("dns-prefetch", l, null);
  }
  function Yy(l, t) {
    It.C(l, t), Pd("preconnect", l, t);
  }
  function By(l, t, a) {
    It.L(l, t, a);
    var u = _u;
    if (u && l && t) {
      var e = 'link[rel="preload"][as="' + rt(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (e += '[imagesrcset="' + rt(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (e += '[imagesizes="' + rt(
        a.imageSizes
      ) + '"]')) : e += '[href="' + rt(l) + '"]';
      var n = e;
      switch (t) {
        case "style":
          n = Mu(l);
          break;
        case "script":
          n = pu(l);
      }
      _t.has(n) || (l = H(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), _t.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(he(n)) || t === "script" && u.querySelector(re(n)) || (t = u.createElement("link"), wl(t, "link", l), Gl(t), u.head.appendChild(t)));
    }
  }
  function Gy(l, t) {
    It.m(l, t);
    var a = _u;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + rt(u) + '"][href="' + rt(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = pu(l);
      }
      if (!_t.has(n) && (l = H({ rel: "modulepreload", href: l }, t), _t.set(n, l), a.querySelector(e) === null)) {
        switch (u) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(re(n)))
              return;
        }
        u = a.createElement("link"), wl(u, "link", l), Gl(u), a.head.appendChild(u);
      }
    }
  }
  function Qy(l, t, a) {
    It.S(l, t, a);
    var u = _u;
    if (u && l) {
      var e = wa(u).hoistableStyles, n = Mu(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var f = { loading: 0, preload: null };
        if (i = u.querySelector(
          he(n)
        ))
          f.loading = 5;
        else {
          l = H(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = _t.get(n)) && tc(l, a);
          var s = i = u.createElement("link");
          Gl(s), wl(s, "link", l), s._p = new Promise(function(v, b) {
            s.onload = v, s.onerror = b;
          }), s.addEventListener("load", function() {
            f.loading |= 1;
          }), s.addEventListener("error", function() {
            f.loading |= 2;
          }), f.loading |= 4, jn(i, t, u);
        }
        i = {
          type: "stylesheet",
          instance: i,
          count: 1,
          state: f
        }, e.set(n, i);
      }
    }
  }
  function Xy(l, t) {
    It.X(l, t);
    var a = _u;
    if (a && l) {
      var u = wa(a).hoistableScripts, e = pu(l), n = u.get(e);
      n || (n = a.querySelector(re(e)), n || (l = H({ src: l, async: !0 }, t), (t = _t.get(e)) && ac(l, t), n = a.createElement("script"), Gl(n), wl(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Zy(l, t) {
    It.M(l, t);
    var a = _u;
    if (a && l) {
      var u = wa(a).hoistableScripts, e = pu(l), n = u.get(e);
      n || (n = a.querySelector(re(e)), n || (l = H({ src: l, async: !0, type: "module" }, t), (t = _t.get(e)) && ac(l, t), n = a.createElement("script"), Gl(n), wl(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function lo(l, t, a, u) {
    var e = (e = L.current) ? Hn(e) : null;
    if (!e) throw Error(m(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (t = Mu(a.href), a = wa(
          e
        ).hoistableStyles, u = a.get(t), u || (u = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, a.set(t, u)), u) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = Mu(a.href);
          var n = wa(
            e
          ).hoistableStyles, i = n.get(l);
          if (i || (e = e.ownerDocument || e, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = e.querySelector(
            he(l)
          )) && !n._p && (i.instance = n, i.state.loading = 5), _t.has(l) || (a = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, _t.set(l, a), n || Ly(
            e,
            l,
            a,
            i.state
          ))), t && u === null)
            throw Error(m(528, ""));
          return i;
        }
        if (t && u !== null)
          throw Error(m(529, ""));
        return null;
      case "script":
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = pu(a), a = wa(
          e
        ).hoistableScripts, u = a.get(t), u || (u = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, a.set(t, u)), u) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(m(444, l));
    }
  }
  function Mu(l) {
    return 'href="' + rt(l) + '"';
  }
  function he(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function to(l) {
    return H({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function Ly(l, t, a, u) {
    l.querySelector('link[rel="preload"][as="style"][' + t + "]") ? u.loading = 1 : (t = l.createElement("link"), u.preload = t, t.addEventListener("load", function() {
      return u.loading |= 1;
    }), t.addEventListener("error", function() {
      return u.loading |= 2;
    }), wl(t, "link", a), Gl(t), l.head.appendChild(t));
  }
  function pu(l) {
    return '[src="' + rt(l) + '"]';
  }
  function re(l) {
    return "script[async]" + l;
  }
  function ao(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + rt(a.href) + '"]'
          );
          if (u)
            return t.instance = u, Gl(u), u;
          var e = H({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return u = (l.ownerDocument || l).createElement(
            "style"
          ), Gl(u), wl(u, "style", e), jn(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = Mu(a.href);
          var n = l.querySelector(
            he(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, Gl(n), n;
          u = to(a), (e = _t.get(e)) && tc(u, e), n = (l.ownerDocument || l).createElement("link"), Gl(n);
          var i = n;
          return i._p = new Promise(function(f, s) {
            i.onload = f, i.onerror = s;
          }), wl(n, "link", u), t.state.loading |= 4, jn(n, a.precedence, l), t.instance = n;
        case "script":
          return n = pu(a.src), (e = l.querySelector(
            re(n)
          )) ? (t.instance = e, Gl(e), e) : (u = a, (e = _t.get(n)) && (u = H({}, a), ac(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), Gl(e), wl(e, "link", u), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(m(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (u = t.instance, t.state.loading |= 4, jn(u, a.precedence, l));
    return t.instance;
  }
  function jn(l, t, a) {
    for (var u = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), e = u.length ? u[u.length - 1] : null, n = e, i = 0; i < u.length; i++) {
      var f = u[i];
      if (f.dataset.precedence === t) n = f;
      else if (n !== e) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function tc(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function ac(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var Cn = null;
  function uo(l, t, a) {
    if (Cn === null) {
      var u = /* @__PURE__ */ new Map(), e = Cn = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = Cn, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[Hu] || n[Ll] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(t) || "";
        i = l + i;
        var f = u.get(i);
        f ? f.push(n) : u.set(i, [n]);
      }
    }
    return u;
  }
  function eo(l, t, a) {
    l = l.ownerDocument || l, l.head.insertBefore(
      a,
      t === "title" ? l.querySelector("head > title") : null
    );
  }
  function Vy(l, t, a) {
    if (a === 1 || t.itemProp != null) return !1;
    switch (l) {
      case "meta":
      case "title":
        return !0;
      case "style":
        if (typeof t.precedence != "string" || typeof t.href != "string" || t.href === "")
          break;
        return !0;
      case "link":
        if (typeof t.rel != "string" || typeof t.href != "string" || t.href === "" || t.onLoad || t.onError)
          break;
        switch (t.rel) {
          case "stylesheet":
            return l = t.disabled, typeof t.precedence == "string" && l == null;
          default:
            return !0;
        }
      case "script":
        if (t.async && typeof t.async != "function" && typeof t.async != "symbol" && !t.onLoad && !t.onError && t.src && typeof t.src == "string")
          return !0;
    }
    return !1;
  }
  function no(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function Ky(l, t, a, u) {
    if (a.type === "stylesheet" && (typeof u.media != "string" || matchMedia(u.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var e = Mu(u.href), n = t.querySelector(
          he(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = xn.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, Gl(n);
          return;
        }
        n = t.ownerDocument || t, u = to(u), (e = _t.get(e)) && tc(u, e), n = n.createElement("link"), Gl(n);
        var i = n;
        i._p = new Promise(function(f, s) {
          i.onload = f, i.onerror = s;
        }), wl(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = xn.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var uc = 0;
  function Jy(l, t) {
    return l.stylesheets && l.count === 0 && Yn(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && Yn(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && uc === 0 && (uc = 62500 * py());
      var e = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && Yn(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > uc ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(u), clearTimeout(e);
      };
    } : null;
  }
  function xn() {
    if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
      if (this.stylesheets) Yn(this, this.stylesheets);
      else if (this.unsuspend) {
        var l = this.unsuspend;
        this.unsuspend = null, l();
      }
    }
  }
  var qn = null;
  function Yn(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, qn = /* @__PURE__ */ new Map(), t.forEach(wy, l), qn = null, xn.call(l));
  }
  function wy(l, t) {
    if (!(t.state.loading & 4)) {
      var a = qn.get(l);
      if (a) var u = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), qn.set(l, a);
        for (var e = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < e.length; n++) {
          var i = e[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), u = i);
        }
        u && a.set(null, u);
      }
      e = t.instance, i = e.getAttribute("data-precedence"), n = a.get(i) || u, n === u && a.set(null, e), a.set(i, e), this.count++, u = xn.bind(this), e.addEventListener("load", u), e.addEventListener("error", u), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var Se = {
    $$typeof: Q,
    Provider: null,
    Consumer: null,
    _currentValue: X,
    _currentValue2: X,
    _threadCount: 0
  };
  function Wy(l, t, a, u, e, n, i, f, s) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = kn(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = kn(0), this.hiddenUpdates = kn(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = s, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function io(l, t, a, u, e, n, i, f, s, v, b, A) {
    return l = new Wy(
      l,
      t,
      a,
      i,
      s,
      v,
      b,
      A,
      f
    ), t = 1, n === !0 && (t |= 24), n = st(3, null, null, t), l.current = n, n.stateNode = l, t = xi(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, Gi(n), l;
  }
  function fo(l) {
    return l ? (l = uu, l) : uu;
  }
  function co(l, t, a, u, e, n) {
    e = fo(e), u.context === null ? u.context = e : u.pendingContext = e, u = fa(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = ca(l, u, t), a !== null && (at(a, l, t), $u(a, l, t));
  }
  function so(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function ec(l, t) {
    so(l, t), (l = l.alternate) && so(l, t);
  }
  function oo(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Na(l, 67108864);
      t !== null && at(t, l, 67108864), ec(l, 67108864);
    }
  }
  function mo(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = vt();
      t = In(t);
      var a = Na(l, t);
      a !== null && at(a, l, t), ec(l, t);
    }
  }
  var Bn = !0;
  function $y(l, t, a, u) {
    var e = E.T;
    E.T = null;
    var n = U.p;
    try {
      U.p = 2, nc(l, t, a, u);
    } finally {
      U.p = n, E.T = e;
    }
  }
  function Fy(l, t, a, u) {
    var e = E.T;
    E.T = null;
    var n = U.p;
    try {
      U.p = 8, nc(l, t, a, u);
    } finally {
      U.p = n, E.T = e;
    }
  }
  function nc(l, t, a, u) {
    if (Bn) {
      var e = ic(u);
      if (e === null)
        Kf(
          l,
          t,
          u,
          Gn,
          a
        ), vo(l, u);
      else if (Iy(
        e,
        l,
        t,
        a,
        u
      ))
        u.stopPropagation();
      else if (vo(l, u), t & 4 && -1 < ky.indexOf(l)) {
        for (; e !== null; ) {
          var n = Ja(e);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = Ma(n.pendingLanes);
                  if (i !== 0) {
                    var f = n;
                    for (f.pendingLanes |= 2, f.entangledLanes |= 2; i; ) {
                      var s = 1 << 31 - ft(i);
                      f.entanglements[1] |= s, i &= ~s;
                    }
                    Ct(n), (cl & 6) === 0 && (Tn = nt() + 500, oe(0));
                  }
                }
                break;
              case 31:
              case 13:
                f = Na(n, 2), f !== null && at(f, n, 2), An(), ec(n, 2);
            }
          if (n = ic(u), n === null && Kf(
            l,
            t,
            u,
            Gn,
            a
          ), n === e) break;
          e = n;
        }
        e !== null && u.stopPropagation();
      } else
        Kf(
          l,
          t,
          u,
          null,
          a
        );
    }
  }
  function ic(l) {
    return l = fi(l), fc(l);
  }
  var Gn = null;
  function fc(l) {
    if (Gn = null, l = Ka(l), l !== null) {
      var t = B(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = C(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = el(t), l !== null) return l;
          l = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          l = null;
        } else t !== l && (l = null);
      }
    }
    return Gn = l, null;
  }
  function yo(l) {
    switch (l) {
      case "beforetoggle":
      case "cancel":
      case "click":
      case "close":
      case "contextmenu":
      case "copy":
      case "cut":
      case "auxclick":
      case "dblclick":
      case "dragend":
      case "dragstart":
      case "drop":
      case "focusin":
      case "focusout":
      case "input":
      case "invalid":
      case "keydown":
      case "keypress":
      case "keyup":
      case "mousedown":
      case "mouseup":
      case "paste":
      case "pause":
      case "play":
      case "pointercancel":
      case "pointerdown":
      case "pointerup":
      case "ratechange":
      case "reset":
      case "resize":
      case "seeked":
      case "submit":
      case "toggle":
      case "touchcancel":
      case "touchend":
      case "touchstart":
      case "volumechange":
      case "change":
      case "selectionchange":
      case "textInput":
      case "compositionstart":
      case "compositionend":
      case "compositionupdate":
      case "beforeblur":
      case "afterblur":
      case "beforeinput":
      case "blur":
      case "fullscreenchange":
      case "focus":
      case "hashchange":
      case "popstate":
      case "select":
      case "selectstart":
        return 2;
      case "drag":
      case "dragenter":
      case "dragexit":
      case "dragleave":
      case "dragover":
      case "mousemove":
      case "mouseout":
      case "mouseover":
      case "pointermove":
      case "pointerout":
      case "pointerover":
      case "scroll":
      case "touchmove":
      case "wheel":
      case "mouseenter":
      case "mouseleave":
      case "pointerenter":
      case "pointerleave":
        return 8;
      case "message":
        switch (qo()) {
          case Ec:
            return 2;
          case Tc:
            return 8;
          case Oe:
          case Yo:
            return 32;
          case zc:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var cc = !1, ba = null, Ea = null, Ta = null, ge = /* @__PURE__ */ new Map(), be = /* @__PURE__ */ new Map(), za = [], ky = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function vo(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        ba = null;
        break;
      case "dragenter":
      case "dragleave":
        Ea = null;
        break;
      case "mouseover":
      case "mouseout":
        Ta = null;
        break;
      case "pointerover":
      case "pointerout":
        ge.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        be.delete(t.pointerId);
    }
  }
  function Ee(l, t, a, u, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: u,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = Ja(t), t !== null && oo(t)), l) : (l.eventSystemFlags |= u, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function Iy(l, t, a, u, e) {
    switch (t) {
      case "focusin":
        return ba = Ee(
          ba,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "dragenter":
        return Ea = Ee(
          Ea,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "mouseover":
        return Ta = Ee(
          Ta,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return ge.set(
          n,
          Ee(
            ge.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, be.set(
          n,
          Ee(
            be.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
    }
    return !1;
  }
  function ho(l) {
    var t = Ka(l.target);
    if (t !== null) {
      var a = B(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = C(a), t !== null) {
            l.blockedOn = t, Dc(l.priority, function() {
              mo(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = el(a), t !== null) {
            l.blockedOn = t, Dc(l.priority, function() {
              mo(a);
            });
            return;
          }
        } else if (t === 3 && a.stateNode.current.memoizedState.isDehydrated) {
          l.blockedOn = a.tag === 3 ? a.stateNode.containerInfo : null;
          return;
        }
      }
    }
    l.blockedOn = null;
  }
  function Qn(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = ic(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var u = new a.constructor(
          a.type,
          a
        );
        ii = u, a.target.dispatchEvent(u), ii = null;
      } else
        return t = Ja(a), t !== null && oo(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function ro(l, t, a) {
    Qn(l) && a.delete(t);
  }
  function Py() {
    cc = !1, ba !== null && Qn(ba) && (ba = null), Ea !== null && Qn(Ea) && (Ea = null), Ta !== null && Qn(Ta) && (Ta = null), ge.forEach(ro), be.forEach(ro);
  }
  function Xn(l, t) {
    l.blockedOn === t && (l.blockedOn = null, cc || (cc = !0, _.unstable_scheduleCallback(
      _.unstable_NormalPriority,
      Py
    )));
  }
  var Zn = null;
  function So(l) {
    Zn !== l && (Zn = l, _.unstable_scheduleCallback(
      _.unstable_NormalPriority,
      function() {
        Zn === l && (Zn = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], u = l[t + 1], e = l[t + 2];
          if (typeof u != "function") {
            if (fc(u || a) === null)
              continue;
            break;
          }
          var n = Ja(a);
          n !== null && (l.splice(t, 3), t -= 3, nf(
            n,
            {
              pending: !0,
              data: e,
              method: a.method,
              action: u
            },
            u,
            e
          ));
        }
      }
    ));
  }
  function Ou(l) {
    function t(s) {
      return Xn(s, l);
    }
    ba !== null && Xn(ba, l), Ea !== null && Xn(Ea, l), Ta !== null && Xn(Ta, l), ge.forEach(t), be.forEach(t);
    for (var a = 0; a < za.length; a++) {
      var u = za[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < za.length && (a = za[0], a.blockedOn === null); )
      ho(a), a.blockedOn === null && za.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[Fl] || null;
        if (typeof n == "function")
          i || So(a);
        else if (i) {
          var f = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[Fl] || null)
              f = i.formAction;
            else if (fc(e) !== null) continue;
          } else f = i.action;
          typeof f == "function" ? a[u + 1] = f : (a.splice(u, 3), u -= 3), So(a);
        }
      }
  }
  function go() {
    function l(n) {
      n.canIntercept && n.info === "react-transition" && n.intercept({
        handler: function() {
          return new Promise(function(i) {
            return e = i;
          });
        },
        focusReset: "manual",
        scroll: "manual"
      });
    }
    function t() {
      e !== null && (e(), e = null), u || setTimeout(a, 20);
    }
    function a() {
      if (!u && !navigation.transition) {
        var n = navigation.currentEntry;
        n && n.url != null && navigation.navigate(n.url, {
          state: n.getState(),
          info: "react-transition",
          history: "replace"
        });
      }
    }
    if (typeof navigation == "object") {
      var u = !1, e = null;
      return navigation.addEventListener("navigate", l), navigation.addEventListener("navigatesuccess", t), navigation.addEventListener("navigateerror", t), setTimeout(a, 100), function() {
        u = !0, navigation.removeEventListener("navigate", l), navigation.removeEventListener("navigatesuccess", t), navigation.removeEventListener("navigateerror", t), e !== null && (e(), e = null);
      };
    }
  }
  function sc(l) {
    this._internalRoot = l;
  }
  Ln.prototype.render = sc.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(m(409));
    var a = t.current, u = vt();
    co(a, u, l, t, null, null);
  }, Ln.prototype.unmount = sc.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      co(l.current, 2, null, l, null, null), An(), t[Va] = null;
    }
  };
  function Ln(l) {
    this._internalRoot = l;
  }
  Ln.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = Oc();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < za.length && t !== 0 && t < za[a].priority; a++) ;
      za.splice(a, 0, l), a === 0 && ho(l);
    }
  };
  var bo = O.version;
  if (bo !== "19.2.0")
    throw Error(
      m(
        527,
        bo,
        "19.2.0"
      )
    );
  U.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(m(188)) : (l = Object.keys(l).join(","), Error(m(268, l)));
    return l = S(t), l = l !== null ? x(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var lv = {
    bundleType: 0,
    version: "19.2.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: E,
    reconcilerVersion: "19.2.0"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var Vn = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!Vn.isDisabled && Vn.supportsFiber)
      try {
        Uu = Vn.inject(
          lv
        ), it = Vn;
      } catch {
      }
  }
  return ze.createRoot = function(l, t) {
    if (!j(l)) throw Error(m(299));
    var a = !1, u = "", e = M0, n = p0, i = O0;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (u = t.identifierPrefix), t.onUncaughtError !== void 0 && (e = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = io(
      l,
      1,
      !1,
      null,
      null,
      a,
      u,
      null,
      e,
      n,
      i,
      go
    ), l[Va] = t.current, Vf(l), new sc(t);
  }, ze.hydrateRoot = function(l, t, a) {
    if (!j(l)) throw Error(m(299));
    var u = !1, e = "", n = M0, i = p0, f = O0, s = null;
    return a != null && (a.unstable_strictMode === !0 && (u = !0), a.identifierPrefix !== void 0 && (e = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (f = a.onRecoverableError), a.formState !== void 0 && (s = a.formState)), t = io(
      l,
      1,
      !0,
      t,
      a ?? null,
      u,
      e,
      s,
      n,
      i,
      f,
      go
    ), t.context = fo(null), a = t.current, u = vt(), u = In(u), e = fa(u), e.callback = null, ca(a, e, u), a = u, t.current.lanes = a, Ru(t, a), Ct(t), l[Va] = t.current, Vf(l), new Ln(t);
  }, ze.version = "19.2.0", ze;
}
var Uo;
function dv() {
  if (Uo) return oc.exports;
  Uo = 1;
  function _() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(_);
      } catch (O) {
        console.error(O);
      }
  }
  return _(), oc.exports = sv(), oc.exports;
}
var ov = dv(), bl = Sc();
class _e extends Error {
  constructor(O, N) {
    super(N), this.status = O, this.code = N;
  }
}
let Ro = "";
async function Ut(_, O, N, m) {
  var z;
  const j = new AbortController();
  let B = !1;
  const C = () => j.abort(N == null ? void 0 : N.reason);
  N != null && N.aborted ? C() : N == null || N.addEventListener("abort", C, { once: !0 });
  const el = m === void 0 ? void 0 : setTimeout(() => {
    B = !0, j.abort();
  }, m);
  try {
    const S = await fetch("/api/v1/" + _, {
      method: O === void 0 ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: j.signal,
      headers: { "X-Request-ID": crypto.randomUUID(), ...O === void 0 ? {} : { "Content-Type": "application/json", "X-CSRF-Token": Ro } },
      body: O === void 0 ? void 0 : JSON.stringify(O)
    }), x = await S.json().catch(() => null);
    if (B) throw new _e(0, "REQUEST_TIMEOUT");
    if (!S.ok) throw new _e(S.status, ((z = x == null ? void 0 : x.error) == null ? void 0 : z.code) ?? `HTTP_${S.status}`);
    return x;
  } catch (S) {
    throw B ? new _e(0, "REQUEST_TIMEOUT") : S;
  } finally {
    clearTimeout(el), N == null || N.removeEventListener("abort", C);
  }
}
async function mv() {
  const _ = await Ut("auth/me");
  return Ro = _.csrf_token, _;
}
const yv = { QUICK_LOGIN_DISABLED: "이 서버에서는 바로 로그인이 꺼져 있습니다.", QUICK_LOGIN_UNAVAILABLE: "공용 SIM 계정을 사용할 수 없습니다. 관리자에게 확인해 주세요.", RATE_LIMITED: "접속 요청이 많습니다. 잠시 후 다시 눌러 주세요.", UNAUTHENTICATED: "세션이 만료되었습니다. 다시 로그인해 주세요.", FORBIDDEN: "이 작업의 권한이 없습니다.", REVISION_CONFLICT: "다른 사용자가 수정했습니다. 최신 내용과 초안을 비교해 주세요.", ID_CONFLICT: "요청 번호가 이미 다른 내용으로 저장되어 있습니다.", INVALID_SELECTION: "등록되지 않은 구역이 포함되어 있습니다.", MAP_UNAVAILABLE: "지도 연결이 중단되었습니다.", INVALID_CONTRACT: "입력 형식이나 범위를 확인해 주세요.", ORIGIN_REJECTED: "허용된 HTTPS 주소로 접속해 주세요.", APPEARANCE_REQUIRED: "상의와 하의 색상을 입력해 주세요." };
function Ae(_) {
  return _ instanceof _e ? yv[_.code] ?? _.code : _ instanceof Error ? _.message : "서버 연결을 확인해 주세요.";
}
const vv = { altitude_m: 30, speed_mps: 3, observation_seconds: 3, return_reserve_percent: 20, priority_mode: "UNIFORM" };
function No([_, O]) {
  const m = 0.0066943799901413165, j = 0.9996, B = O * Math.PI / 180, C = (_ - 129) * Math.PI / 180, el = m / (1 - m), z = Math.sin(B), S = Math.cos(B), x = Math.tan(B), H = 6378137 / Math.sqrt(1 - m * z * z), V = x * x, ol = el * S * S, I = S * C, sl = 6378137 * ((1 - m / 4 - 3 * m ** 2 / 64 - 5 * m ** 3 / 256) * B - (3 * m / 8 + 3 * m ** 2 / 32 + 45 * m ** 3 / 1024) * Math.sin(2 * B) + (15 * m ** 2 / 256 + 45 * m ** 3 / 1024) * Math.sin(4 * B) - 35 * m ** 3 / 3072 * Math.sin(6 * B));
  return [5e5 + j * H * (I + (1 - V + ol) * I ** 3 / 6 + (5 - 18 * V + V * V + 72 * ol - 58 * el) * I ** 5 / 120), j * (sl + H * x * (I * I / 2 + (5 - V + 9 * ol + 4 * ol * ol) * I ** 4 / 24 + (61 - 58 * V + V * V + 600 * ol - 330 * el) * I ** 6 / 720))];
}
function hv(_) {
  var Dl;
  const O = (Dl = _.result) == null ? void 0 : Dl.execution;
  if (!O) return null;
  const N = No(O.originGeographic), j = (O.targetGeometry.type === "Polygon" ? [O.targetGeometry.coordinates] : O.targetGeometry.coordinates).flat().map((Q) => Q.map((ml) => {
    const Ul = No(ml);
    return [Ul[0] - N[0], Ul[1] - N[1]];
  })), B = O.legs.flatMap((Q) => Q.phases), C = B.length ? [B[0].start, ...B.map((Q) => Q.end)] : [], el = (Q) => [Q[1], Q[0]], z = [C.map(el), O.ingressPath.map(el), O.returnPath.map(el)], S = [...j.flat(), ...z.flat()];
  if (!S.length) return null;
  const x = Math.min(...S.map((Q) => Q[0])), H = Math.max(...S.map((Q) => Q[0])), V = Math.min(...S.map((Q) => Q[1])), ol = Math.max(...S.map((Q) => Q[1])), I = Math.min(720 / Math.max(1, H - x), 480 / Math.max(1, ol - V)), sl = (Q) => [40 + (Q[0] - x) * I, 520 - (Q[1] - V) * I], Ml = (Q) => Q.map((ml, Ul) => `${Ul ? "L" : "M"}${sl(ml).map((hl) => hl.toFixed(2)).join(",")}`).join(" "), W = (Q) => Q ? Q.type === "GeometryCollection" ? Q.geometries.map(W).join(" ") : (Q.type === "Polygon" ? [Q.coordinates] : Q.type === "MultiPolygon" ? Q.coordinates : []).flat().map((Ul) => Ml(Ul) + "Z").join(" ") : "";
  return { xy: sl, d: Ml, geometry: W, target: j.map((Q) => Ml(Q) + "Z").join(" "), route: Ml(z[0]), ingress: Ml(z[1]), returning: Ml(z[2]), entry: sl(el(O.entryNed)), finish: z[0].length ? sl(z[0].at(-1)) : null };
}
function rv(_, O) {
  var el;
  const N = (el = _.result) == null ? void 0 : el.execution;
  if (!N) return null;
  let m = 0, j = N.entryNed, B = N.entryYaw ?? 0;
  const C = [[j[1], j[0]]];
  for (const z of N.legs) {
    for (const S of z.phases) {
      const x = Math.max(0, Math.min(1, (O - m) / S.seconds));
      if (j = S.start.map((H, V) => H + (S.end[V] - H) * x), B = S.yaw + S.delta * x, C.push([j[1], j[0]]), m += S.seconds, O <= m) return { pos: [j[1], j[0]], yaw: B, passed: C };
    }
    if (m += z.otherSeconds ?? 0, O <= m) return { pos: [j[1], j[0]], yaw: B, passed: C };
  }
  return { pos: [j[1], j[0]], yaw: B, passed: C };
}
const Sv = { QUEUED: "계산 대기", RUNNING: "계산 중", READY: "경로 준비 완료", INCOMPLETE: "목표 또는 계산 한도 미달", FAILED: "계산 실패" }, Me = (_) => typeof _ == "number" && Number.isFinite(_) ? `${_.toFixed(1)}초` : "—";
function gv({ job: _, coverage: O }) {
  var sl, Ml;
  const [N, m] = bl.useState(0), [j, B] = bl.useState(!1), C = bl.useMemo(() => hv(_), [_]), el = bl.useMemo(() => {
    var W;
    return ((W = O == null ? void 0 : O.cells) == null ? void 0 : W.map((Dl) => ({ ...Dl, path: (C == null ? void 0 : C.geometry(Dl.geometry)) ?? "" }))) ?? [];
  }, [O, C]), z = (O == null ? void 0 : O.seconds) ?? ((Ml = (sl = _.result) == null ? void 0 : sl.plan) == null ? void 0 : Ml.predictedSearchSeconds) ?? 0;
  if (bl.useEffect(() => {
    m(0), B(!1);
  }, [_.job_id]), bl.useEffect(() => {
    if (!j) return;
    const W = setInterval(() => m((Dl) => Math.min(z, Dl + 2)), 100);
    return () => clearInterval(W);
  }, [j, z]), bl.useEffect(() => {
    N >= z && B(!1);
  }, [N, z]), !C) return /* @__PURE__ */ M.jsx("div", { className: "sr-empty", children: "이 계획에는 표시할 실행 경로가 없습니다." });
  const S = rv(_, N), x = S ? C.xy(S.pos) : C.entry, H = el.filter((W) => W.completedAt !== null && W.completedAt <= N + 1e-8), V = H.reduce((W, Dl) => W + Dl.areaM2, 0), ol = (O == null ? void 0 : O.targetAreaM2) ?? 0, I = (O == null ? void 0 : O.state) === "READY";
  return /* @__PURE__ */ M.jsxs(M.Fragment, { children: [
    /* @__PURE__ */ M.jsxs("svg", { viewBox: "0 0 800 560", role: "img", "aria-label": "시간별 예상 관측 지도", children: [
      /* @__PURE__ */ M.jsx("path", { d: C.target, fill: "#854a38", stroke: "#bd816b", strokeWidth: ".5", fillRule: "evenodd" }),
      /* @__PURE__ */ M.jsx("path", { d: C.geometry(O == null ? void 0 : O.forest), fill: "#425843", fillRule: "evenodd" }),
      /* @__PURE__ */ M.jsx("path", { d: C.geometry(O == null ? void 0 : O.canopy), fill: "#5b7270", fillRule: "evenodd" }),
      /* @__PURE__ */ M.jsx("path", { d: C.geometry(O == null ? void 0 : O.buildings), fill: "#87939e", stroke: "#b8c1c8", strokeWidth: ".5", fillRule: "evenodd" }),
      /* @__PURE__ */ M.jsx("path", { d: H.map((W) => W.path).join(" "), fill: "#53ae9b", fillRule: "evenodd" }),
      /* @__PURE__ */ M.jsx("path", { d: C.ingress, fill: "none", stroke: "#edb56b", strokeWidth: "1.5", strokeDasharray: "7 5" }),
      /* @__PURE__ */ M.jsx("path", { d: C.returning, fill: "none", stroke: "#ba94eb", strokeWidth: "1.5", strokeDasharray: "4 5" }),
      /* @__PURE__ */ M.jsx("path", { d: C.route, fill: "none", stroke: "#a7b6c2", strokeWidth: "1", opacity: ".5" }),
      /* @__PURE__ */ M.jsx("path", { d: C.d((S == null ? void 0 : S.passed) ?? []), fill: "none", stroke: "#80f2ed", strokeWidth: "2.6" }),
      /* @__PURE__ */ M.jsx("circle", { cx: C.entry[0], cy: C.entry[1], r: "4", fill: "#fff" }),
      /* @__PURE__ */ M.jsx("g", { transform: `translate(${x[0]},${x[1]}) rotate(${(S == null ? void 0 : S.yaw) ?? 0})`, children: /* @__PURE__ */ M.jsx("path", { d: "M0,-11 L7,8 L0,4 L-7,8 Z", fill: "#fff", stroke: "#172c3a", strokeWidth: "2" }) }),
      /* @__PURE__ */ M.jsx("text", { x: "745", y: "28", fill: "#c8dbe2", fontSize: "14", children: "북 ↑" })
    ] }),
    /* @__PURE__ */ M.jsxs("div", { className: "sr-timeline", children: [
      /* @__PURE__ */ M.jsxs("div", { className: "sr-time-label", children: [
        /* @__PURE__ */ M.jsxs("strong", { children: [
          "구역 진입 후 ",
          Me(N)
        ] }),
        /* @__PURE__ */ M.jsxs("span", { children: [
          Me(z),
          "까지"
        ] })
      ] }),
      /* @__PURE__ */ M.jsxs("label", { className: "sr-slider-label", children: [
        "수색 시간",
        /* @__PURE__ */ M.jsx("input", { "aria-label": "수색 시간", type: "range", min: "0", max: z, step: "0.2", value: N, onChange: (W) => {
          B(!1), m(Number(W.target.value));
        } })
      ] }),
      /* @__PURE__ */ M.jsxs("div", { className: "sr-actions", children: [
        /* @__PURE__ */ M.jsx("button", { onClick: () => B(!j), disabled: !z || N >= z, children: j ? "일시 정지" : "시간순 재생" }),
        /* @__PURE__ */ M.jsx("button", { onClick: () => {
          B(!1), m(0);
        }, children: "처음" }),
        /* @__PURE__ */ M.jsx("button", { onClick: () => {
          B(!1), m(z);
        }, children: "종료 시점" })
      ] }),
      /* @__PURE__ */ M.jsxs("div", { className: "sr-coverage", children: [
        /* @__PURE__ */ M.jsx("strong", { children: I ? `예상 관측 완료 ${(100 * V / ol).toFixed(2)}%` : "시간별 관측 영역 준비" }),
        /* @__PURE__ */ M.jsx("span", { children: I ? `완료 ${Math.round(V).toLocaleString()}㎡ · 미관측 ${Math.round(ol - V).toLocaleString()}㎡` : (O == null ? void 0 : O.state) === "FAILED" ? "관측 지도 계산 실패 · 경로 결과는 보존됩니다." : "셀별 연속 관측 시간을 계산하고 있습니다." }),
        I && /* @__PURE__ */ M.jsx("progress", { "aria-label": "예상 관측 완료도", value: V, max: ol })
      ] })
    ] }),
    /* @__PURE__ */ M.jsx("p", { className: "sr-legend", children: "주황 미관측 · 초록 관측 완료 · 회색 건물 · 짙은 녹색 수목 제외 · 흰 화살표 기체/카메라 방향 · 청록 지난 경로" }),
    /* @__PURE__ */ M.jsx("p", { className: "sr-note", children: "지도·건물·지형 가림과 연속 프레임 기준을 적용한 예측입니다. 실제 영상 관측 기록과는 별도입니다. 진입·복귀 점선은 수색 시간에 포함하지 않습니다." }),
    I && /* @__PURE__ */ M.jsxs("p", { className: "sr-note", children: [
      "관측 지도 계산 ",
      Me(O.computeSeconds),
      " · 경로 준비 계산과 별도 · 실제 관측 기록 추가 0건"
    ] })
  ] });
}
const OperatorSimExecution = createRegionalExecutionControls(bl);
function bv() {
  const [executionLock, setExecutionLock] = bl.useState(false);
  var E, U, X, fl, dl;
  const [_, O] = bl.useState(null), [N, m] = bl.useState([]), [j, B] = bl.useState(""), [C, el] = bl.useState(null), [z, S] = bl.useState(null), [x, H] = bl.useState(null), [V, ol] = bl.useState(!1), [I, sl] = bl.useState(!0), [Ml, W] = bl.useState(""), [Dl, Q] = bl.useState(""), ml = bl.useRef(0), Ul = bl.useRef(!1), hl = bl.useRef(!0), $ = bl.useRef(null), Nl = N.find((c) => c.id === j), Xl = !!(_ != null && _.permissions.some((c) => c.drone_id === "sim-pi-01" && c.scopes.includes("edit"))), ut = !!z && ["QUEUED", "RUNNING"].includes(z.state);
  async function et(c) {
    const g = ++ml.current;
    B(c.id), el(c.latest), S(null), H(null), W(""), Q(""), sl(!0);
    try {
      if (c.latest) {
        const p = c.latest, D = await Ut(`missions/${p.mission_id}/regional-search/${p.job_id}`);
        hl.current && g === ml.current && S(D);
      }
    } catch (p) {
      hl.current && g === ml.current && W(Ae(p));
    } finally {
      hl.current && g === ml.current && sl(!1);
    }
  }
  async function Zl(c) {
    const g = await Ut("simulations/regional-search/regions");
    if (!hl.current) return;
    m(g.regions);
    const p = g.regions.find((D) => D.id === c) ?? g.regions[0];
    p ? await et(p) : sl(!1);
  }
  bl.useEffect(() => (hl.current = !0, mv().then(async (c) => {
    if (!hl.current) return;
    O(c);
    let g = "";
    try {
      g = sessionStorage.getItem("school-regional-source:" + c.user_id) || JSON.parse(sessionStorage.getItem("test-regional:" + c.user_id) || "null")?.source || "";
    } catch {
    }
    await Zl(g);
  }).catch((c) => {
    hl.current && (W(Ae(c)), sl(!1));
  }), () => {
    hl.current = !1, ml.current++;
  }), []), bl.useEffect(() => {
    if (_ && j) try {
      sessionStorage.setItem("school-regional-source:" + _.user_id, j);
    } catch {
    }
  }, [_, j]), bl.useEffect(() => {
    if (!z || !ut || !C) return;
    let c = !1, g;
    const p = new AbortController(), D = ml.current;
    async function G() {
      try {
        const L = await Ut(`missions/${C.mission_id}/regional-search/${z.job_id}`, void 0, p.signal, 1e4);
        !c && D === ml.current && (S(L), W(""));
      } catch (L) {
        !c && D === ml.current && W("상태 조회 지연 · 재제출하지 않습니다. " + Ae(L));
      } finally {
        c || (g = setTimeout(G, 2e3));
      }
    }
    return g = setTimeout(G, 1e3), () => {
      c = !0, p.abort(), clearTimeout(g);
    };
  }, [z == null ? void 0 : z.job_id, ut, C == null ? void 0 : C.mission_id]), bl.useEffect(() => {
    if (H(null), (z == null ? void 0 : z.state) !== "READY" || !C) return;
    let c = !1, g, p = !1;
    const D = new AbortController(), G = ml.current, L = `missions/${C.mission_id}/regional-search/${z.job_id}/preview`;
    async function P() {
      try {
        const _l = await Ut(L, void 0, D.signal, 1e4);
        if (c || G !== ml.current) return;
        if (_l.resultHash !== z.result_hash) throw new Error("계획과 관측 지도 버전이 다릅니다.");
        H(_l), _l.state === "NOT_REQUESTED" && Xl && !p && (p = !0, await Ut(L, {}, D.signal, 1e4)), !["READY", "FAILED"].includes(_l.state) && !(_l.state === "NOT_REQUESTED" && !Xl) && (g = setTimeout(P, 1500));
      } catch (_l) {
        !c && G === ml.current && W("관측 지도 조회: " + Ae(_l));
      }
    }
    return P(), () => {
      c = !0, D.abort(), clearTimeout(g);
    };
  }, [z == null ? void 0 : z.job_id, z == null ? void 0 : z.state, C == null ? void 0 : C.mission_id, Xl]);
  async function Nt(c) {
    if (!Ul.current) {
      Ul.current = !0, ol(!0), W("");
      try {
        await c();
      } catch (g) {
        hl.current && W(Ae(g));
      } finally {
        Ul.current = !1, hl.current && ol(!1);
      }
    }
  }
  async function Mt() {
    if (!Nl || !Xl || ut || I || executionLock) return;
    let c = $.current;
    (!c || c.source !== j) && (c = $.current = { source: j, mid: crypto.randomUUID(), draftId: crypto.randomUUID() }), await Ut("missions", { mission_id: c.mid, drone_id: "sim-pi-01", environment: "SIM" }), await Ut(`missions/${c.mid}/map-drafts`, { request_id: c.draftId, expected_draft_revision: 0, release_id: Nl.releaseId, selected_zone_ids: [j], name: `지역수색 ${Nl.name}`, mission_type: "AREA_RECON", conditions: { ...vv, appearance: null } });
    const [g, p] = await Promise.all([Ut(`missions/${c.mid}/workspace`), Ut(`missions/${c.mid}/regions`)]), D = g.mission.draft_revision ?? 0, G = p.find((P) => P.mission_revision === D && P.source_features.source_id === j);
    if (!G || D !== 1) throw new _e(409, "REVISION_CONFLICT");
    const L = await Ut(`missions/${c.mid}/regional-search`, { job_id: c.draftId, mission_revision: D, region_id: G.region_id });
    hl.current && (el({ mission_id: c.mid, mission_revision: D, region_id: G.region_id, job_id: L.job_id, state: L.state }), S(L), Q("구역의 경로를 계산하고 서버에 저장합니다."), $.current = null);
  }
  const al = z == null ? void 0 : z.result;
  return /* @__PURE__ */ M.jsxs("div", { className: "school-regional-content", children: [
    /* @__PURE__ */ M.jsxs("aside", { children: [
      /* @__PURE__ */ M.jsx("p", { className: "sr-eyebrow", children: "의미구역 선택 · 목표 관측률 95%" }),
      /* @__PURE__ */ M.jsx("h3", { children: "어느 구역을 수색할까요?" }),
      /* @__PURE__ */ M.jsxs("label", { children: [
        "수색할 의미구역",
        /* @__PURE__ */ M.jsxs("select", { value: j, disabled: V || executionLock, onChange: (c) => {
          const g = N.find((p) => p.id === c.target.value);
          g && et(g);
        }, children: [
          !N.length && /* @__PURE__ */ M.jsx("option", { value: "", children: "구역 목록 확인 중" }),
          N.map((c) => /* @__PURE__ */ M.jsx("option", { value: c.id, children: c.name }, c.id))
        ] })
      ] }),
      Nl && /* @__PURE__ */ M.jsxs("p", { className: "sr-note", children: [
        "의미구역 면적 ",
        (Nl.areaM2 / 1e4).toFixed(2),
        " ha · 건물·수목 제외 후 수색 면적은 결과에 표시합니다."
      ] }),
      /* @__PURE__ */ M.jsx("div", { className: "sr-actions", children: /* @__PURE__ */ M.jsx("button", { disabled: V || I || executionLock, onClick: () => void Nt(() => Zl(j)), children: "구역·결과 갱신" }) }),
      /* @__PURE__ */ M.jsxs("div", { className: "sr-profile", children: [
        /* @__PURE__ */ M.jsx("strong", { children: "기존 수색 조건 유지" }),
        /* @__PURE__ */ M.jsxs("p", { children: [
          "고도 30m · 기본 3m/s · 조건부 직선 4m/s",
          /* @__PURE__ */ M.jsx("br", {}),
          "유효 프레임 3개 이상 + 연속 1초",
          /* @__PURE__ */ M.jsx("br", {}),
          "지점 대기 3초 · 경로 준비 한도 60초",
          /* @__PURE__ */ M.jsx("br", {}),
          "확인된 높이 우선 · 높이 없으면 지상 층수 × 4m"
        ] })
      ] }),
      /* @__PURE__ */ M.jsx("button", { className: "sr-primary", disabled: V || I || ut || !Xl || !Nl || executionLock, onClick: () => void Nt(Mt), children: ut ? "경로 계산 중…" : z ? "선택 구역 경로 다시 계산" : "선택 구역 경로 계산" }),
      /* @__PURE__ */ M.jsx("p", { className: "sr-note", children: "구역 선택 시 저장된 최신 결과를 불러옵니다. 계산 버튼은 계획만 생성합니다." }),
      M.jsx(OperatorSimExecution, { account: _, selection: Nl, binding: C, job: z, onLockChange: setExecutionLock }),
      !Xl && !I && /* @__PURE__ */ M.jsx("p", { children: "경로 생성에는 임무 편집 권한이 필요합니다." }),
      I && /* @__PURE__ */ M.jsx("p", { role: "status", children: "선택 구역의 저장 결과를 확인하고 있습니다." }),
      Dl && /* @__PURE__ */ M.jsx("p", { role: "status", children: Dl }),
      Ml && /* @__PURE__ */ M.jsx("p", { role: "alert", className: "sr-warning", children: Ml })
    ] }),
    /* @__PURE__ */ M.jsxs("article", { children: [
      /* @__PURE__ */ M.jsxs("div", { className: "sr-result-title", children: [
        /* @__PURE__ */ M.jsx("h3", { children: z ? Sv[z.state] ?? z.state : "계획 경로 미리보기" }),
        /* @__PURE__ */ M.jsx("span", { children: "예측 · 실제 관측과 별도" })
      ] }),
      /* @__PURE__ */ M.jsxs("dl", { className: "sr-metrics", children: [
        /* @__PURE__ */ M.jsxs("div", { children: [
          /* @__PURE__ */ M.jsx("dt", { children: "경로 준비 계산" }),
          /* @__PURE__ */ M.jsx("dd", { children: Me(al == null ? void 0 : al.preparationSeconds) })
        ] }),
        /* @__PURE__ */ M.jsxs("div", { children: [
          /* @__PURE__ */ M.jsx("dt", { children: "예상 95% 도달" }),
          /* @__PURE__ */ M.jsx("dd", { children: Me((x == null ? void 0 : x.state) === "READY" ? x.first95Seconds : (E = al == null ? void 0 : al.plan) == null ? void 0 : E.predictedFirstTargetSeconds) })
        ] }),
        /* @__PURE__ */ M.jsxs("div", { children: [
          /* @__PURE__ */ M.jsx("dt", { children: "예상 최종 관측률" }),
          /* @__PURE__ */ M.jsxs("dd", { children: [
            ((X = (x == null ? void 0 : x.state) === "READY" ? x.percent : (U = al == null ? void 0 : al.plan) == null ? void 0 : U.predictedPercent) == null ? void 0 : X.toFixed(2)) ?? "—",
            ((fl = al == null ? void 0 : al.plan) == null ? void 0 : fl.predictedPercent) !== void 0 ? "%" : ""
          ] })
        ] }),
        /* @__PURE__ */ M.jsxs("div", { children: [
          /* @__PURE__ */ M.jsx("dt", { children: "수색 대상 면적" }),
          /* @__PURE__ */ M.jsx("dd", { children: (al == null ? void 0 : al.targetAreaM2) === void 0 ? "—" : (al.targetAreaM2 / 1e4).toFixed(2) + " ha" })
        ] })
      ] }),
      (dl = z == null ? void 0 : z.result) != null && dl.execution ? /* @__PURE__ */ M.jsx(gv, { job: z, coverage: x }) : /* @__PURE__ */ M.jsx("div", { className: "sr-empty", children: ut ? "가림·이동·관측 조건을 계산하고 있습니다." : "의미구역을 선택하고 경로를 계산해 주세요." }),
      (z == null ? void 0 : z.state) === "INCOMPLETE" && /* @__PURE__ */ M.jsx("p", { className: "sr-warning", children: "목표 관측률 또는 준비 계산 한도 미달입니다. 실행 준비 완료로 취급하지 않습니다." }),
      (al == null ? void 0 : al.reason) && /* @__PURE__ */ M.jsx("p", { className: "sr-warning", children: al.reason }),
      z && /* @__PURE__ */ M.jsxs("details", { children: [
        /* @__PURE__ */ M.jsx("summary", { children: "계획·입력 식별 정보" }),
        /* @__PURE__ */ M.jsxs("p", { children: [
          "작업 ",
          z.job_id,
          /* @__PURE__ */ M.jsx("br", {}),
          "내부 임무 ",
          C == null ? void 0 : C.mission_id,
          " · 개정 ",
          z.mission_revision,
          /* @__PURE__ */ M.jsx("br", {}),
          "계획 ",
          z.plan_id ?? "계산 중",
          /* @__PURE__ */ M.jsx("br", {}),
          "입력 ",
          (al == null ? void 0 : al.packageId) ?? "확인 중",
          /* @__PURE__ */ M.jsx("br", {}),
          "건물 입력 ",
          (x == null ? void 0 : x.buildingActivityVersion) ?? "확인 중"
        ] })
      ] })
    ] })
  ] });
}
function Ev() {
  const [_, O] = bl.useState(!1), N = bl.useRef(null), opened = bl.useRef(false);
  if (_) opened.current = true;
  return bl.useEffect(() => {
    var m, j, B;
    _ && !((m = N.current) != null && m.open) ? (j = N.current) == null || j.showModal() : !_ && ((B = N.current) != null && B.open) && N.current.close();
  }, [_]), /* @__PURE__ */ M.jsxs("span", { className: "school-regional-entry", children: [
    /* @__PURE__ */ M.jsx("button", { type: "button", className: "school-regional-toggle", onClick: () => O(!0), children: "지역수색 경로" }),
    /* @__PURE__ */ M.jsxs("dialog", { ref: N, className: "school-regional-dialog", "aria-label": "지역수색 경로 설정", onCancel: () => O(!1), onClose: () => O(!1), children: [
      /* @__PURE__ */ M.jsxs("header", { children: [
        /* @__PURE__ */ M.jsxs("div", { children: [
          /* @__PURE__ */ M.jsx("small", { children: "학교 서버 · 의미구역 경로 계획" }),
          /* @__PURE__ */ M.jsx("h2", { children: "지역수색 경로" })
        ] }),
        /* @__PURE__ */ M.jsx("button", { type: "button", "aria-label": "지역수색 경로 닫기", onClick: () => O(!1), children: "닫기 ×" })
      ] }),
      opened.current && /* @__PURE__ */ M.jsx(bv, {})
    ] })
  ] });
}
let La = null;
function Ho() {
  const _ = document.querySelector(".school-app .sim-header");
  if (La && La.header !== _ && (La.root.unmount(), La.host.remove(), La = null), !_ || La || _.querySelector(".school-regional-entry")) return;
  const O = document.createElement("div");
  O.className = "school-regional-extension", O.style.display = "contents", _.insertBefore(O, _.querySelector(".map-environment-switch"));
  const N = ov.createRoot(O);
  La = { header: _, host: O, root: N }, N.render(/* @__PURE__ */ M.jsx(Ev, {}));
}
let rc = !1;
const Tv = new MutationObserver(() => {
  rc || (rc = !0, queueMicrotask(() => {
    rc = !1, Ho();
  }));
});
Tv.observe(document.documentElement, { childList: !0, subtree: !0 });
Ho();
export {
  Ho as syncRegionalEntry
};
