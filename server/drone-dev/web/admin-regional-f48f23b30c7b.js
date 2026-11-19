var rc = { exports: {} }, qe = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Od;
function im() {
  if (Od) return qe;
  Od = 1;
  var _ = Symbol.for("react.transitional.element"), q = Symbol.for("react.fragment");
  function R(v, F, J) {
    var W = null;
    if (J !== void 0 && (W = "" + J), F.key !== void 0 && (W = "" + F.key), "key" in F) {
      J = {};
      for (var cl in F)
        cl !== "key" && (J[cl] = F[cl]);
    } else J = F;
    return F = J.ref, {
      $$typeof: _,
      type: v,
      key: W,
      ref: F !== void 0 ? F : null,
      props: J
    };
  }
  return qe.Fragment = q, qe.jsx = R, qe.jsxs = R, qe;
}
var Md;
function fm() {
  return Md || (Md = 1, rc.exports = im()), rc.exports;
}
var A = fm(), Sc = { exports: {} }, Be = {}, gc = { exports: {} }, bc = {};
/**
 * @license React
 * scheduler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var pd;
function cm() {
  return pd || (pd = 1, (function(_) {
    function q(S, O) {
      var B = S.length;
      S.push(O);
      l: for (; 0 < B; ) {
        var el = B - 1 >>> 1, ul = S[el];
        if (0 < F(ul, O))
          S[el] = O, S[B] = ul, B = el;
        else break l;
      }
    }
    function R(S) {
      return S.length === 0 ? null : S[0];
    }
    function v(S) {
      if (S.length === 0) return null;
      var O = S[0], B = S.pop();
      if (B !== O) {
        S[0] = B;
        l: for (var el = 0, ul = S.length, o = ul >>> 1; el < o; ) {
          var z = 2 * (el + 1) - 1, p = S[z], D = z + 1, Q = S[D];
          if (0 > F(p, B))
            D < ul && 0 > F(Q, p) ? (S[el] = Q, S[D] = B, el = D) : (S[el] = p, S[z] = B, el = z);
          else if (D < ul && 0 > F(Q, B))
            S[el] = Q, S[D] = B, el = D;
          else break l;
        }
      }
      return O;
    }
    function F(S, O) {
      var B = S.sortIndex - O.sortIndex;
      return B !== 0 ? B : S.id - O.id;
    }
    if (_.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var J = performance;
      _.unstable_now = function() {
        return J.now();
      };
    } else {
      var W = Date, cl = W.now();
      _.unstable_now = function() {
        return W.now() - cl;
      };
    }
    var M = [], b = [], G = 1, C = null, L = 3, Sl = !1, sl = !1, Ul = !1, $ = !1, Nl = typeof setTimeout == "function" ? setTimeout : null, al = typeof clearTimeout == "function" ? clearTimeout : null, Ol = typeof setImmediate < "u" ? setImmediate : null;
    function El(S) {
      for (var O = R(b); O !== null; ) {
        if (O.callback === null) v(b);
        else if (O.startTime <= S)
          v(b), O.sortIndex = O.expirationTime, q(M, O);
        else break;
        O = R(b);
      }
    }
    function lt(S) {
      if (Ul = !1, El(S), !sl)
        if (R(M) !== null)
          sl = !0, Ml || (Ml = !0, vl());
        else {
          var O = R(b);
          O !== null && Vl(lt, O.startTime - S);
        }
    }
    var Ml = !1, V = -1, wl = 5, Bl = -1;
    function Lt() {
      return $ ? !0 : !(_.unstable_now() - Bl < wl);
    }
    function tt() {
      if ($ = !1, Ml) {
        var S = _.unstable_now();
        Bl = S;
        var O = !0;
        try {
          l: {
            sl = !1, Ul && (Ul = !1, al(V), V = -1), Sl = !0;
            var B = L;
            try {
              t: {
                for (El(S), C = R(M); C !== null && !(C.expirationTime > S && Lt()); ) {
                  var el = C.callback;
                  if (typeof el == "function") {
                    C.callback = null, L = C.priorityLevel;
                    var ul = el(
                      C.expirationTime <= S
                    );
                    if (S = _.unstable_now(), typeof ul == "function") {
                      C.callback = ul, El(S), O = !0;
                      break t;
                    }
                    C === R(M) && v(M), El(S);
                  } else v(M);
                  C = R(M);
                }
                if (C !== null) O = !0;
                else {
                  var o = R(b);
                  o !== null && Vl(
                    lt,
                    o.startTime - S
                  ), O = !1;
                }
              }
              break l;
            } finally {
              C = null, L = B, Sl = !1;
            }
            O = void 0;
          }
        } finally {
          O ? vl() : Ml = !1;
        }
      }
    }
    var vl;
    if (typeof Ol == "function")
      vl = function() {
        Ol(tt);
      };
    else if (typeof MessageChannel < "u") {
      var Ct = new MessageChannel(), bl = Ct.port2;
      Ct.port1.onmessage = tt, vl = function() {
        bl.postMessage(null);
      };
    } else
      vl = function() {
        Nl(tt, 0);
      };
    function Vl(S, O) {
      V = Nl(function() {
        S(_.unstable_now());
      }, O);
    }
    _.unstable_IdlePriority = 5, _.unstable_ImmediatePriority = 1, _.unstable_LowPriority = 4, _.unstable_NormalPriority = 3, _.unstable_Profiling = null, _.unstable_UserBlockingPriority = 2, _.unstable_cancelCallback = function(S) {
      S.callback = null;
    }, _.unstable_forceFrameRate = function(S) {
      0 > S || 125 < S ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : wl = 0 < S ? Math.floor(1e3 / S) : 5;
    }, _.unstable_getCurrentPriorityLevel = function() {
      return L;
    }, _.unstable_next = function(S) {
      switch (L) {
        case 1:
        case 2:
        case 3:
          var O = 3;
          break;
        default:
          O = L;
      }
      var B = L;
      L = O;
      try {
        return S();
      } finally {
        L = B;
      }
    }, _.unstable_requestPaint = function() {
      $ = !0;
    }, _.unstable_runWithPriority = function(S, O) {
      switch (S) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          S = 3;
      }
      var B = L;
      L = S;
      try {
        return O();
      } finally {
        L = B;
      }
    }, _.unstable_scheduleCallback = function(S, O, B) {
      var el = _.unstable_now();
      switch (typeof B == "object" && B !== null ? (B = B.delay, B = typeof B == "number" && 0 < B ? el + B : el) : B = el, S) {
        case 1:
          var ul = -1;
          break;
        case 2:
          ul = 250;
          break;
        case 5:
          ul = 1073741823;
          break;
        case 4:
          ul = 1e4;
          break;
        default:
          ul = 5e3;
      }
      return ul = B + ul, S = {
        id: G++,
        callback: O,
        priorityLevel: S,
        startTime: B,
        expirationTime: ul,
        sortIndex: -1
      }, B > el ? (S.sortIndex = B, q(b, S), R(M) === null && S === R(b) && (Ul ? (al(V), V = -1) : Ul = !0, Vl(lt, B - el))) : (S.sortIndex = ul, q(M, S), sl || Sl || (sl = !0, Ml || (Ml = !0, vl()))), S;
    }, _.unstable_shouldYield = Lt, _.unstable_wrapCallback = function(S) {
      var O = L;
      return function() {
        var B = L;
        L = O;
        try {
          return S.apply(this, arguments);
        } finally {
          L = B;
        }
      };
    };
  })(bc)), bc;
}
var Dd;
function sm() {
  return Dd || (Dd = 1, gc.exports = cm()), gc.exports;
}
var Ec = { exports: {} }, X = {};
/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Ud;
function om() {
  if (Ud) return X;
  Ud = 1;
  var _ = Symbol.for("react.transitional.element"), q = Symbol.for("react.portal"), R = Symbol.for("react.fragment"), v = Symbol.for("react.strict_mode"), F = Symbol.for("react.profiler"), J = Symbol.for("react.consumer"), W = Symbol.for("react.context"), cl = Symbol.for("react.forward_ref"), M = Symbol.for("react.suspense"), b = Symbol.for("react.memo"), G = Symbol.for("react.lazy"), C = Symbol.for("react.activity"), L = Symbol.iterator;
  function Sl(o) {
    return o === null || typeof o != "object" ? null : (o = L && o[L] || o["@@iterator"], typeof o == "function" ? o : null);
  }
  var sl = {
    isMounted: function() {
      return !1;
    },
    enqueueForceUpdate: function() {
    },
    enqueueReplaceState: function() {
    },
    enqueueSetState: function() {
    }
  }, Ul = Object.assign, $ = {};
  function Nl(o, z, p) {
    this.props = o, this.context = z, this.refs = $, this.updater = p || sl;
  }
  Nl.prototype.isReactComponent = {}, Nl.prototype.setState = function(o, z) {
    if (typeof o != "object" && typeof o != "function" && o != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, o, z, "setState");
  }, Nl.prototype.forceUpdate = function(o) {
    this.updater.enqueueForceUpdate(this, o, "forceUpdate");
  };
  function al() {
  }
  al.prototype = Nl.prototype;
  function Ol(o, z, p) {
    this.props = o, this.context = z, this.refs = $, this.updater = p || sl;
  }
  var El = Ol.prototype = new al();
  El.constructor = Ol, Ul(El, Nl.prototype), El.isPureReactComponent = !0;
  var lt = Array.isArray;
  function Ml() {
  }
  var V = { H: null, A: null, T: null, S: null }, wl = Object.prototype.hasOwnProperty;
  function Bl(o, z, p) {
    var D = p.ref;
    return {
      $$typeof: _,
      type: o,
      key: z,
      ref: D !== void 0 ? D : null,
      props: p
    };
  }
  function Lt(o, z) {
    return Bl(o.type, z, o.props);
  }
  function tt(o) {
    return typeof o == "object" && o !== null && o.$$typeof === _;
  }
  function vl(o) {
    var z = { "=": "=0", ":": "=2" };
    return "$" + o.replace(/[=:]/g, function(p) {
      return z[p];
    });
  }
  var Ct = /\/+/g;
  function bl(o, z) {
    return typeof o == "object" && o !== null && o.key != null ? vl("" + o.key) : z.toString(36);
  }
  function Vl(o) {
    switch (o.status) {
      case "fulfilled":
        return o.value;
      case "rejected":
        throw o.reason;
      default:
        switch (typeof o.status == "string" ? o.then(Ml, Ml) : (o.status = "pending", o.then(
          function(z) {
            o.status === "pending" && (o.status = "fulfilled", o.value = z);
          },
          function(z) {
            o.status === "pending" && (o.status = "rejected", o.reason = z);
          }
        )), o.status) {
          case "fulfilled":
            return o.value;
          case "rejected":
            throw o.reason;
        }
    }
    throw o;
  }
  function S(o, z, p, D, Q) {
    var w = typeof o;
    (w === "undefined" || w === "boolean") && (o = null);
    var x = !1;
    if (o === null) x = !0;
    else
      switch (w) {
        case "bigint":
        case "string":
        case "number":
          x = !0;
          break;
        case "object":
          switch (o.$$typeof) {
            case _:
            case q:
              x = !0;
              break;
            case G:
              return x = o._init, S(
                x(o._payload),
                z,
                p,
                D,
                Q
              );
          }
      }
    if (x)
      return Q = Q(o), x = D === "" ? "." + bl(o, 0) : D, lt(Q) ? (p = "", x != null && (p = x.replace(Ct, "$&/") + "/"), S(Q, z, p, "", function(ca) {
        return ca;
      })) : Q != null && (tt(Q) && (Q = Lt(
        Q,
        p + (Q.key == null || o && o.key === Q.key ? "" : ("" + Q.key).replace(
          Ct,
          "$&/"
        ) + "/") + x
      )), z.push(Q)), 1;
    x = 0;
    var yl = D === "" ? "." : D + ":";
    if (lt(o))
      for (var pl = 0; pl < o.length; pl++)
        D = o[pl], w = yl + bl(D, pl), x += S(
          D,
          z,
          p,
          w,
          Q
        );
    else if (pl = Sl(o), typeof pl == "function")
      for (o = pl.call(o), pl = 0; !(D = o.next()).done; )
        D = D.value, w = yl + bl(D, pl++), x += S(
          D,
          z,
          p,
          w,
          Q
        );
    else if (w === "object") {
      if (typeof o.then == "function")
        return S(
          Vl(o),
          z,
          p,
          D,
          Q
        );
      throw z = String(o), Error(
        "Objects are not valid as a React child (found: " + (z === "[object Object]" ? "object with keys {" + Object.keys(o).join(", ") + "}" : z) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return x;
  }
  function O(o, z, p) {
    if (o == null) return o;
    var D = [], Q = 0;
    return S(o, D, "", "", function(w) {
      return z.call(p, w, Q++);
    }), D;
  }
  function B(o) {
    if (o._status === -1) {
      var z = o._result;
      z = z(), z.then(
        function(p) {
          (o._status === 0 || o._status === -1) && (o._status = 1, o._result = p);
        },
        function(p) {
          (o._status === 0 || o._status === -1) && (o._status = 2, o._result = p);
        }
      ), o._status === -1 && (o._status = 0, o._result = z);
    }
    if (o._status === 1) return o._result.default;
    throw o._result;
  }
  var el = typeof reportError == "function" ? reportError : function(o) {
    if (typeof window == "object" && typeof window.ErrorEvent == "function") {
      var z = new window.ErrorEvent("error", {
        bubbles: !0,
        cancelable: !0,
        message: typeof o == "object" && o !== null && typeof o.message == "string" ? String(o.message) : String(o),
        error: o
      });
      if (!window.dispatchEvent(z)) return;
    } else if (typeof process == "object" && typeof process.emit == "function") {
      process.emit("uncaughtException", o);
      return;
    }
    console.error(o);
  }, ul = {
    map: O,
    forEach: function(o, z, p) {
      O(
        o,
        function() {
          z.apply(this, arguments);
        },
        p
      );
    },
    count: function(o) {
      var z = 0;
      return O(o, function() {
        z++;
      }), z;
    },
    toArray: function(o) {
      return O(o, function(z) {
        return z;
      }) || [];
    },
    only: function(o) {
      if (!tt(o))
        throw Error(
          "React.Children.only expected to receive a single React element child."
        );
      return o;
    }
  };
  return X.Activity = C, X.Children = ul, X.Component = Nl, X.Fragment = R, X.Profiler = F, X.PureComponent = Ol, X.StrictMode = v, X.Suspense = M, X.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = V, X.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(o) {
      return V.H.useMemoCache(o);
    }
  }, X.cache = function(o) {
    return function() {
      return o.apply(null, arguments);
    };
  }, X.cacheSignal = function() {
    return null;
  }, X.cloneElement = function(o, z, p) {
    if (o == null)
      throw Error(
        "The argument must be a React element, but you passed " + o + "."
      );
    var D = Ul({}, o.props), Q = o.key;
    if (z != null)
      for (w in z.key !== void 0 && (Q = "" + z.key), z)
        !wl.call(z, w) || w === "key" || w === "__self" || w === "__source" || w === "ref" && z.ref === void 0 || (D[w] = z[w]);
    var w = arguments.length - 2;
    if (w === 1) D.children = p;
    else if (1 < w) {
      for (var x = Array(w), yl = 0; yl < w; yl++)
        x[yl] = arguments[yl + 2];
      D.children = x;
    }
    return Bl(o.type, Q, D);
  }, X.createContext = function(o) {
    return o = {
      $$typeof: W,
      _currentValue: o,
      _currentValue2: o,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, o.Provider = o, o.Consumer = {
      $$typeof: J,
      _context: o
    }, o;
  }, X.createElement = function(o, z, p) {
    var D, Q = {}, w = null;
    if (z != null)
      for (D in z.key !== void 0 && (w = "" + z.key), z)
        wl.call(z, D) && D !== "key" && D !== "__self" && D !== "__source" && (Q[D] = z[D]);
    var x = arguments.length - 2;
    if (x === 1) Q.children = p;
    else if (1 < x) {
      for (var yl = Array(x), pl = 0; pl < x; pl++)
        yl[pl] = arguments[pl + 2];
      Q.children = yl;
    }
    if (o && o.defaultProps)
      for (D in x = o.defaultProps, x)
        Q[D] === void 0 && (Q[D] = x[D]);
    return Bl(o, w, Q);
  }, X.createRef = function() {
    return { current: null };
  }, X.forwardRef = function(o) {
    return { $$typeof: cl, render: o };
  }, X.isValidElement = tt, X.lazy = function(o) {
    return {
      $$typeof: G,
      _payload: { _status: -1, _result: o },
      _init: B
    };
  }, X.memo = function(o, z) {
    return {
      $$typeof: b,
      type: o,
      compare: z === void 0 ? null : z
    };
  }, X.startTransition = function(o) {
    var z = V.T, p = {};
    V.T = p;
    try {
      var D = o(), Q = V.S;
      Q !== null && Q(p, D), typeof D == "object" && D !== null && typeof D.then == "function" && D.then(Ml, el);
    } catch (w) {
      el(w);
    } finally {
      z !== null && p.types !== null && (z.types = p.types), V.T = z;
    }
  }, X.unstable_useCacheRefresh = function() {
    return V.H.useCacheRefresh();
  }, X.use = function(o) {
    return V.H.use(o);
  }, X.useActionState = function(o, z, p) {
    return V.H.useActionState(o, z, p);
  }, X.useCallback = function(o, z) {
    return V.H.useCallback(o, z);
  }, X.useContext = function(o) {
    return V.H.useContext(o);
  }, X.useDebugValue = function() {
  }, X.useDeferredValue = function(o, z) {
    return V.H.useDeferredValue(o, z);
  }, X.useEffect = function(o, z) {
    return V.H.useEffect(o, z);
  }, X.useEffectEvent = function(o) {
    return V.H.useEffectEvent(o);
  }, X.useId = function() {
    return V.H.useId();
  }, X.useImperativeHandle = function(o, z, p) {
    return V.H.useImperativeHandle(o, z, p);
  }, X.useInsertionEffect = function(o, z) {
    return V.H.useInsertionEffect(o, z);
  }, X.useLayoutEffect = function(o, z) {
    return V.H.useLayoutEffect(o, z);
  }, X.useMemo = function(o, z) {
    return V.H.useMemo(o, z);
  }, X.useOptimistic = function(o, z) {
    return V.H.useOptimistic(o, z);
  }, X.useReducer = function(o, z, p) {
    return V.H.useReducer(o, z, p);
  }, X.useRef = function(o) {
    return V.H.useRef(o);
  }, X.useState = function(o) {
    return V.H.useState(o);
  }, X.useSyncExternalStore = function(o, z, p) {
    return V.H.useSyncExternalStore(
      o,
      z,
      p
    );
  }, X.useTransition = function() {
    return V.H.useTransition();
  }, X.version = "19.2.0", X;
}
var Nd;
function Ac() {
  return Nd || (Nd = 1, Ec.exports = om()), Ec.exports;
}
var zc = { exports: {} }, Pl = {};
/**
 * @license React
 * react-dom.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Rd;
function dm() {
  if (Rd) return Pl;
  Rd = 1;
  var _ = Ac();
  function q(M) {
    var b = "https://react.dev/errors/" + M;
    if (1 < arguments.length) {
      b += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var G = 2; G < arguments.length; G++)
        b += "&args[]=" + encodeURIComponent(arguments[G]);
    }
    return "Minified React error #" + M + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function R() {
  }
  var v = {
    d: {
      f: R,
      r: function() {
        throw Error(q(522));
      },
      D: R,
      C: R,
      L: R,
      m: R,
      X: R,
      S: R,
      M: R
    },
    p: 0,
    findDOMNode: null
  }, F = Symbol.for("react.portal");
  function J(M, b, G) {
    var C = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: F,
      key: C == null ? null : "" + C,
      children: M,
      containerInfo: b,
      implementation: G
    };
  }
  var W = _.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function cl(M, b) {
    if (M === "font") return "";
    if (typeof b == "string")
      return b === "use-credentials" ? b : "";
  }
  return Pl.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = v, Pl.createPortal = function(M, b) {
    var G = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!b || b.nodeType !== 1 && b.nodeType !== 9 && b.nodeType !== 11)
      throw Error(q(299));
    return J(M, b, null, G);
  }, Pl.flushSync = function(M) {
    var b = W.T, G = v.p;
    try {
      if (W.T = null, v.p = 2, M) return M();
    } finally {
      W.T = b, v.p = G, v.d.f();
    }
  }, Pl.preconnect = function(M, b) {
    typeof M == "string" && (b ? (b = b.crossOrigin, b = typeof b == "string" ? b === "use-credentials" ? b : "" : void 0) : b = null, v.d.C(M, b));
  }, Pl.prefetchDNS = function(M) {
    typeof M == "string" && v.d.D(M);
  }, Pl.preinit = function(M, b) {
    if (typeof M == "string" && b && typeof b.as == "string") {
      var G = b.as, C = cl(G, b.crossOrigin), L = typeof b.integrity == "string" ? b.integrity : void 0, Sl = typeof b.fetchPriority == "string" ? b.fetchPriority : void 0;
      G === "style" ? v.d.S(
        M,
        typeof b.precedence == "string" ? b.precedence : void 0,
        {
          crossOrigin: C,
          integrity: L,
          fetchPriority: Sl
        }
      ) : G === "script" && v.d.X(M, {
        crossOrigin: C,
        integrity: L,
        fetchPriority: Sl,
        nonce: typeof b.nonce == "string" ? b.nonce : void 0
      });
    }
  }, Pl.preinitModule = function(M, b) {
    if (typeof M == "string")
      if (typeof b == "object" && b !== null) {
        if (b.as == null || b.as === "script") {
          var G = cl(
            b.as,
            b.crossOrigin
          );
          v.d.M(M, {
            crossOrigin: G,
            integrity: typeof b.integrity == "string" ? b.integrity : void 0,
            nonce: typeof b.nonce == "string" ? b.nonce : void 0
          });
        }
      } else b == null && v.d.M(M);
  }, Pl.preload = function(M, b) {
    if (typeof M == "string" && typeof b == "object" && b !== null && typeof b.as == "string") {
      var G = b.as, C = cl(G, b.crossOrigin);
      v.d.L(M, G, {
        crossOrigin: C,
        integrity: typeof b.integrity == "string" ? b.integrity : void 0,
        nonce: typeof b.nonce == "string" ? b.nonce : void 0,
        type: typeof b.type == "string" ? b.type : void 0,
        fetchPriority: typeof b.fetchPriority == "string" ? b.fetchPriority : void 0,
        referrerPolicy: typeof b.referrerPolicy == "string" ? b.referrerPolicy : void 0,
        imageSrcSet: typeof b.imageSrcSet == "string" ? b.imageSrcSet : void 0,
        imageSizes: typeof b.imageSizes == "string" ? b.imageSizes : void 0,
        media: typeof b.media == "string" ? b.media : void 0
      });
    }
  }, Pl.preloadModule = function(M, b) {
    if (typeof M == "string")
      if (b) {
        var G = cl(b.as, b.crossOrigin);
        v.d.m(M, {
          as: typeof b.as == "string" && b.as !== "script" ? b.as : void 0,
          crossOrigin: G,
          integrity: typeof b.integrity == "string" ? b.integrity : void 0
        });
      } else v.d.m(M);
  }, Pl.requestFormReset = function(M) {
    v.d.r(M);
  }, Pl.unstable_batchedUpdates = function(M, b) {
    return M(b);
  }, Pl.useFormState = function(M, b, G) {
    return W.H.useFormState(M, b, G);
  }, Pl.useFormStatus = function() {
    return W.H.useHostTransitionStatus();
  }, Pl.version = "19.2.0", Pl;
}
var Hd;
function vm() {
  if (Hd) return zc.exports;
  Hd = 1;
  function _() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(_);
      } catch (q) {
        console.error(q);
      }
  }
  return _(), zc.exports = dm(), zc.exports;
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
var Cd;
function ym() {
  if (Cd) return Be;
  Cd = 1;
  var _ = sm(), q = Ac(), R = vm();
  function v(l) {
    var t = "https://react.dev/errors/" + l;
    if (1 < arguments.length) {
      t += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var a = 2; a < arguments.length; a++)
        t += "&args[]=" + encodeURIComponent(arguments[a]);
    }
    return "Minified React error #" + l + "; visit " + t + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
  }
  function F(l) {
    return !(!l || l.nodeType !== 1 && l.nodeType !== 9 && l.nodeType !== 11);
  }
  function J(l) {
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
  function W(l) {
    if (l.tag === 13) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function cl(l) {
    if (l.tag === 31) {
      var t = l.memoizedState;
      if (t === null && (l = l.alternate, l !== null && (t = l.memoizedState)), t !== null) return t.dehydrated;
    }
    return null;
  }
  function M(l) {
    if (J(l) !== l)
      throw Error(v(188));
  }
  function b(l) {
    var t = l.alternate;
    if (!t) {
      if (t = J(l), t === null) throw Error(v(188));
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
          if (n === a) return M(e), l;
          if (n === u) return M(e), t;
          n = n.sibling;
        }
        throw Error(v(188));
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
          if (!i) throw Error(v(189));
        }
      }
      if (a.alternate !== u) throw Error(v(190));
    }
    if (a.tag !== 3) throw Error(v(188));
    return a.stateNode.current === a ? l : t;
  }
  function G(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l;
    for (l = l.child; l !== null; ) {
      if (t = G(l), t !== null) return t;
      l = l.sibling;
    }
    return null;
  }
  var C = Object.assign, L = Symbol.for("react.element"), Sl = Symbol.for("react.transitional.element"), sl = Symbol.for("react.portal"), Ul = Symbol.for("react.fragment"), $ = Symbol.for("react.strict_mode"), Nl = Symbol.for("react.profiler"), al = Symbol.for("react.consumer"), Ol = Symbol.for("react.context"), El = Symbol.for("react.forward_ref"), lt = Symbol.for("react.suspense"), Ml = Symbol.for("react.suspense_list"), V = Symbol.for("react.memo"), wl = Symbol.for("react.lazy"), Bl = Symbol.for("react.activity"), Lt = Symbol.for("react.memo_cache_sentinel"), tt = Symbol.iterator;
  function vl(l) {
    return l === null || typeof l != "object" ? null : (l = tt && l[tt] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var Ct = Symbol.for("react.client.reference");
  function bl(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === Ct ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case Ul:
        return "Fragment";
      case Nl:
        return "Profiler";
      case $:
        return "StrictMode";
      case lt:
        return "Suspense";
      case Ml:
        return "SuspenseList";
      case Bl:
        return "Activity";
    }
    if (typeof l == "object")
      switch (l.$$typeof) {
        case sl:
          return "Portal";
        case Ol:
          return l.displayName || "Context";
        case al:
          return (l._context.displayName || "Context") + ".Consumer";
        case El:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case V:
          return t = l.displayName || null, t !== null ? t : bl(l.type) || "Memo";
        case wl:
          t = l._payload, l = l._init;
          try {
            return bl(l(t));
          } catch {
          }
      }
    return null;
  }
  var Vl = Array.isArray, S = q.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, O = R.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, B = {
    pending: !1,
    data: null,
    method: null,
    action: null
  }, el = [], ul = -1;
  function o(l) {
    return { current: l };
  }
  function z(l) {
    0 > ul || (l.current = el[ul], el[ul] = null, ul--);
  }
  function p(l, t) {
    ul++, el[ul] = l.current, l.current = t;
  }
  var D = o(null), Q = o(null), w = o(null), x = o(null);
  function yl(l, t) {
    switch (p(w, t), p(Q, l), p(D, null), t.nodeType) {
      case 9:
      case 11:
        l = (l = t.documentElement) && (l = l.namespaceURI) ? Wo(l) : 0;
        break;
      default:
        if (l = t.tagName, t = t.namespaceURI)
          t = Wo(t), l = $o(t, l);
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
    z(D), p(D, l);
  }
  function pl() {
    z(D), z(Q), z(w);
  }
  function ca(l) {
    l.memoizedState !== null && p(x, l);
    var t = D.current, a = $o(t, l.type);
    t !== a && (p(Q, l), p(D, a));
  }
  function ja(l) {
    Q.current === l && (z(D), z(Q)), x.current === l && (z(x), Re._currentValue = B);
  }
  var lu, Xu;
  function xt(l) {
    if (lu === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        lu = t && t[1] || "", Xu = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + lu + l + Xu;
  }
  var U = !1;
  function zl(l, t) {
    if (!l || U) return "";
    U = !0;
    var a = Error.prepareStackTrace;
    Error.prepareStackTrace = void 0;
    try {
      var u = {
        DetermineComponentFrameRoot: function() {
          try {
            if (t) {
              var T = function() {
                throw Error();
              };
              if (Object.defineProperty(T.prototype, "props", {
                set: function() {
                  throw Error();
                }
              }), typeof Reflect == "object" && Reflect.construct) {
                try {
                  Reflect.construct(T, []);
                } catch (r) {
                  var h = r;
                }
                Reflect.construct(l, [], T);
              } else {
                try {
                  T.call();
                } catch (r) {
                  h = r;
                }
                l.call(T.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (r) {
                h = r;
              }
              (T = l()) && typeof T.catch == "function" && T.catch(function() {
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
        var c = i.split(`
`), m = f.split(`
`);
        for (e = u = 0; u < c.length && !c[u].includes("DetermineComponentFrameRoot"); )
          u++;
        for (; e < m.length && !m[e].includes(
          "DetermineComponentFrameRoot"
        ); )
          e++;
        if (u === c.length || e === m.length)
          for (u = c.length - 1, e = m.length - 1; 1 <= u && 0 <= e && c[u] !== m[e]; )
            e--;
        for (; 1 <= u && 0 <= e; u--, e--)
          if (c[u] !== m[e]) {
            if (u !== 1 || e !== 1)
              do
                if (u--, e--, 0 > e || c[u] !== m[e]) {
                  var g = `
` + c[u].replace(" at new ", " at ");
                  return l.displayName && g.includes("<anonymous>") && (g = g.replace("<anonymous>", l.displayName)), g;
                }
              while (1 <= u && 0 <= e);
            break;
          }
      }
    } finally {
      U = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? xt(a) : "";
  }
  function Xl(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return xt(l.type);
      case 16:
        return xt("Lazy");
      case 13:
        return l.child !== t && t !== null ? xt("Suspense Fallback") : xt("Suspense");
      case 19:
        return xt("SuspenseList");
      case 0:
      case 15:
        return zl(l.type, !1);
      case 11:
        return zl(l.type.render, !1);
      case 1:
        return zl(l.type, !0);
      case 31:
        return xt("Activity");
      default:
        return "";
    }
  }
  function Zl(l) {
    try {
      var t = "", a = null;
      do
        t += Xl(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (u) {
      return `
Error generating stack: ` + u.message + `
` + u.stack;
    }
  }
  var Yt = Object.prototype.hasOwnProperty, Tt = _.unstable_scheduleCallback, et = _.unstable_cancelCallback, vt = _.unstable_shouldYield, tu = _.unstable_requestPaint, Tl = _.unstable_now, Zu = _.unstable_getCurrentPriorityLevel, Oc = _.unstable_ImmediatePriority, Mc = _.unstable_UserBlockingPriority, Ye = _.unstable_NormalPriority, Xd = _.unstable_LowPriority, pc = _.unstable_IdlePriority, Zd = _.log, Ld = _.unstable_setDisableYieldValue, Lu = null, yt = null;
  function sa(l) {
    if (typeof Zd == "function" && Ld(l), yt && typeof yt.setStrictMode == "function")
      try {
        yt.setStrictMode(Lu, l);
      } catch {
      }
  }
  var mt = Math.clz32 ? Math.clz32 : Jd, Vd = Math.log, Kd = Math.LN2;
  function Jd(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (Vd(l) / Kd | 0) | 0;
  }
  var Ge = 256, Qe = 262144, Xe = 4194304;
  function qa(l) {
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
  function Ze(l, t, a) {
    var u = l.pendingLanes;
    if (u === 0) return 0;
    var e = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var f = u & 134217727;
    return f !== 0 ? (u = f & ~n, u !== 0 ? e = qa(u) : (i &= f, i !== 0 ? e = qa(i) : a || (a = f & ~l, a !== 0 && (e = qa(a))))) : (f = u & ~n, f !== 0 ? e = qa(f) : i !== 0 ? e = qa(i) : a || (a = u & ~l, a !== 0 && (e = qa(a)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : e;
  }
  function Vu(l, t) {
    return (l.pendingLanes & ~(l.suspendedLanes & ~l.pingedLanes) & t) === 0;
  }
  function wd(l, t) {
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
  function Dc() {
    var l = Xe;
    return Xe <<= 1, (Xe & 62914560) === 0 && (Xe = 4194304), l;
  }
  function ui(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function Ku(l, t) {
    l.pendingLanes |= t, t !== 268435456 && (l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0);
  }
  function Wd(l, t, a, u, e, n) {
    var i = l.pendingLanes;
    l.pendingLanes = a, l.suspendedLanes = 0, l.pingedLanes = 0, l.warmLanes = 0, l.expiredLanes &= a, l.entangledLanes &= a, l.errorRecoveryDisabledLanes &= a, l.shellSuspendCounter = 0;
    var f = l.entanglements, c = l.expirationTimes, m = l.hiddenUpdates;
    for (a = i & ~a; 0 < a; ) {
      var g = 31 - mt(a), T = 1 << g;
      f[g] = 0, c[g] = -1;
      var h = m[g];
      if (h !== null)
        for (m[g] = null, g = 0; g < h.length; g++) {
          var r = h[g];
          r !== null && (r.lane &= -536870913);
        }
      a &= ~T;
    }
    u !== 0 && Uc(l, u, 0), n !== 0 && e === 0 && l.tag !== 0 && (l.suspendedLanes |= n & ~(i & ~t));
  }
  function Uc(l, t, a) {
    l.pendingLanes |= t, l.suspendedLanes &= ~t;
    var u = 31 - mt(t);
    l.entangledLanes |= t, l.entanglements[u] = l.entanglements[u] | 1073741824 | a & 261930;
  }
  function Nc(l, t) {
    var a = l.entangledLanes |= t;
    for (l = l.entanglements; a; ) {
      var u = 31 - mt(a), e = 1 << u;
      e & t | l[u] & t && (l[u] |= t), a &= ~e;
    }
  }
  function Rc(l, t) {
    var a = t & -t;
    return a = (a & 42) !== 0 ? 1 : ei(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function ei(l) {
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
  function ni(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Hc() {
    var l = O.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : gd(l.type));
  }
  function Cc(l, t) {
    var a = O.p;
    try {
      return O.p = l, t();
    } finally {
      O.p = a;
    }
  }
  var oa = Math.random().toString(36).slice(2), Wl = "__reactFiber$" + oa, nt = "__reactProps$" + oa, au = "__reactContainer$" + oa, ii = "__reactEvents$" + oa, $d = "__reactListeners$" + oa, Fd = "__reactHandles$" + oa, jc = "__reactResources$" + oa, Ju = "__reactMarker$" + oa;
  function fi(l) {
    delete l[Wl], delete l[nt], delete l[ii], delete l[$d], delete l[Fd];
  }
  function uu(l) {
    var t = l[Wl];
    if (t) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[au] || a[Wl]) {
        if (a = t.alternate, t.child !== null || a !== null && a.child !== null)
          for (l = ad(l); l !== null; ) {
            if (a = l[Wl]) return a;
            l = ad(l);
          }
        return t;
      }
      l = a, a = l.parentNode;
    }
    return null;
  }
  function eu(l) {
    if (l = l[Wl] || l[au]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function wu(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(v(33));
  }
  function nu(l) {
    var t = l[jc];
    return t || (t = l[jc] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function Kl(l) {
    l[Ju] = !0;
  }
  var qc = /* @__PURE__ */ new Set(), Bc = {};
  function Ba(l, t) {
    iu(l, t), iu(l + "Capture", t);
  }
  function iu(l, t) {
    for (Bc[l] = t, l = 0; l < t.length; l++)
      qc.add(t[l]);
  }
  var kd = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), xc = {}, Yc = {};
  function Id(l) {
    return Yt.call(Yc, l) ? !0 : Yt.call(xc, l) ? !1 : kd.test(l) ? Yc[l] = !0 : (xc[l] = !0, !1);
  }
  function Le(l, t, a) {
    if (Id(t))
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
  function Ve(l, t, a) {
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
  function Vt(l, t, a, u) {
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
  function _t(l) {
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
  function Gc(l) {
    var t = l.type;
    return (l = l.nodeName) && l.toLowerCase() === "input" && (t === "checkbox" || t === "radio");
  }
  function Pd(l, t, a) {
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
  function ci(l) {
    if (!l._valueTracker) {
      var t = Gc(l) ? "checked" : "value";
      l._valueTracker = Pd(
        l,
        t,
        "" + l[t]
      );
    }
  }
  function Qc(l) {
    if (!l) return !1;
    var t = l._valueTracker;
    if (!t) return !0;
    var a = t.getValue(), u = "";
    return l && (u = Gc(l) ? l.checked ? "true" : "false" : l.value), l = u, l !== a ? (t.setValue(l), !0) : !1;
  }
  function Ke(l) {
    if (l = l || (typeof document < "u" ? document : void 0), typeof l > "u") return null;
    try {
      return l.activeElement || l.body;
    } catch {
      return l.body;
    }
  }
  var lv = /[\n"\\]/g;
  function At(l) {
    return l.replace(
      lv,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function si(l, t, a, u, e, n, i, f) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + _t(t)) : l.value !== "" + _t(t) && (l.value = "" + _t(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? oi(l, i, _t(t)) : a != null ? oi(l, i, _t(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), f != null && typeof f != "function" && typeof f != "symbol" && typeof f != "boolean" ? l.name = "" + _t(f) : l.removeAttribute("name");
  }
  function Xc(l, t, a, u, e, n, i, f) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        ci(l);
        return;
      }
      a = a != null ? "" + _t(a) : "", t = t != null ? "" + _t(t) : a, f || t === l.value || (l.value = t), l.defaultValue = t;
    }
    u = u ?? e, u = typeof u != "function" && typeof u != "symbol" && !!u, l.checked = f ? l.checked : !!u, l.defaultChecked = !!u, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), ci(l);
  }
  function oi(l, t, a) {
    t === "number" && Ke(l.ownerDocument) === l || l.defaultValue === "" + a || (l.defaultValue = "" + a);
  }
  function fu(l, t, a, u) {
    if (l = l.options, t) {
      t = {};
      for (var e = 0; e < a.length; e++)
        t["$" + a[e]] = !0;
      for (a = 0; a < l.length; a++)
        e = t.hasOwnProperty("$" + l[a].value), l[a].selected !== e && (l[a].selected = e), e && u && (l[a].defaultSelected = !0);
    } else {
      for (a = "" + _t(a), t = null, e = 0; e < l.length; e++) {
        if (l[e].value === a) {
          l[e].selected = !0, u && (l[e].defaultSelected = !0);
          return;
        }
        t !== null || l[e].disabled || (t = l[e]);
      }
      t !== null && (t.selected = !0);
    }
  }
  function Zc(l, t, a) {
    if (t != null && (t = "" + _t(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + _t(a) : "";
  }
  function Lc(l, t, a, u) {
    if (t == null) {
      if (u != null) {
        if (a != null) throw Error(v(92));
        if (Vl(u)) {
          if (1 < u.length) throw Error(v(93));
          u = u[0];
        }
        a = u;
      }
      a == null && (a = ""), t = a;
    }
    a = _t(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), ci(l);
  }
  function cu(l, t) {
    if (t) {
      var a = l.firstChild;
      if (a && a === l.lastChild && a.nodeType === 3) {
        a.nodeValue = t;
        return;
      }
    }
    l.textContent = t;
  }
  var tv = new Set(
    "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
      " "
    )
  );
  function Vc(l, t, a) {
    var u = t.indexOf("--") === 0;
    a == null || typeof a == "boolean" || a === "" ? u ? l.setProperty(t, "") : t === "float" ? l.cssFloat = "" : l[t] = "" : u ? l.setProperty(t, a) : typeof a != "number" || a === 0 || tv.has(t) ? t === "float" ? l.cssFloat = a : l[t] = ("" + a).trim() : l[t] = a + "px";
  }
  function Kc(l, t, a) {
    if (t != null && typeof t != "object")
      throw Error(v(62));
    if (l = l.style, a != null) {
      for (var u in a)
        !a.hasOwnProperty(u) || t != null && t.hasOwnProperty(u) || (u.indexOf("--") === 0 ? l.setProperty(u, "") : u === "float" ? l.cssFloat = "" : l[u] = "");
      for (var e in t)
        u = t[e], t.hasOwnProperty(e) && a[e] !== u && Vc(l, e, u);
    } else
      for (var n in t)
        t.hasOwnProperty(n) && Vc(l, n, t[n]);
  }
  function di(l) {
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
  var av = /* @__PURE__ */ new Map([
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
  ]), uv = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
  function Je(l) {
    return uv.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function Kt() {
  }
  var vi = null;
  function yi(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var su = null, ou = null;
  function Jc(l) {
    var t = eu(l);
    if (t && (l = t.stateNode)) {
      var a = l[nt] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if (si(
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
              'input[name="' + At(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var u = a[t];
              if (u !== l && u.form === l.form) {
                var e = u[nt] || null;
                if (!e) throw Error(v(90));
                si(
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
              u = a[t], u.form === l.form && Qc(u);
          }
          break l;
        case "textarea":
          Zc(l, a.value, a.defaultValue);
          break l;
        case "select":
          t = a.value, t != null && fu(l, !!a.multiple, t, !1);
      }
    }
  }
  var mi = !1;
  function wc(l, t, a) {
    if (mi) return l(t, a);
    mi = !0;
    try {
      var u = l(t);
      return u;
    } finally {
      if (mi = !1, (su !== null || ou !== null) && (jn(), su && (t = su, l = ou, ou = su = null, Jc(t), l)))
        for (t = 0; t < l.length; t++) Jc(l[t]);
    }
  }
  function Wu(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var u = a[nt] || null;
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
        v(231, t, typeof a)
      );
    return a;
  }
  var Jt = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), hi = !1;
  if (Jt)
    try {
      var $u = {};
      Object.defineProperty($u, "passive", {
        get: function() {
          hi = !0;
        }
      }), window.addEventListener("test", $u, $u), window.removeEventListener("test", $u, $u);
    } catch {
      hi = !1;
    }
  var da = null, ri = null, we = null;
  function Wc() {
    if (we) return we;
    var l, t = ri, a = t.length, u, e = "value" in da ? da.value : da.textContent, n = e.length;
    for (l = 0; l < a && t[l] === e[l]; l++) ;
    var i = a - l;
    for (u = 1; u <= i && t[a - u] === e[n - u]; u++) ;
    return we = e.slice(l, 1 < u ? 1 - u : void 0);
  }
  function We(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function $e() {
    return !0;
  }
  function $c() {
    return !1;
  }
  function it(l) {
    function t(a, u, e, n, i) {
      this._reactName = a, this._targetInst = e, this.type = u, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var f in l)
        l.hasOwnProperty(f) && (a = l[f], this[f] = a ? a(n) : n[f]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? $e : $c, this.isPropagationStopped = $c, this;
    }
    return C(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = $e);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = $e);
      },
      persist: function() {
      },
      isPersistent: $e
    }), t;
  }
  var xa = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, Fe = it(xa), Fu = C({}, xa, { view: 0, detail: 0 }), ev = it(Fu), Si, gi, ku, ke = C({}, Fu, {
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
    getModifierState: Ei,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== ku && (ku && l.type === "mousemove" ? (Si = l.screenX - ku.screenX, gi = l.screenY - ku.screenY) : gi = Si = 0, ku = l), Si);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : gi;
    }
  }), Fc = it(ke), nv = C({}, ke, { dataTransfer: 0 }), iv = it(nv), fv = C({}, Fu, { relatedTarget: 0 }), bi = it(fv), cv = C({}, xa, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), sv = it(cv), ov = C({}, xa, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), dv = it(ov), vv = C({}, xa, { data: 0 }), kc = it(vv), yv = {
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
  }, mv = {
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
  }, hv = {
    Alt: "altKey",
    Control: "ctrlKey",
    Meta: "metaKey",
    Shift: "shiftKey"
  };
  function rv(l) {
    var t = this.nativeEvent;
    return t.getModifierState ? t.getModifierState(l) : (l = hv[l]) ? !!t[l] : !1;
  }
  function Ei() {
    return rv;
  }
  var Sv = C({}, Fu, {
    key: function(l) {
      if (l.key) {
        var t = yv[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = We(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? mv[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: Ei,
    charCode: function(l) {
      return l.type === "keypress" ? We(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? We(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), gv = it(Sv), bv = C({}, ke, {
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
  }), Ic = it(bv), Ev = C({}, Fu, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: Ei
  }), zv = it(Ev), Tv = C({}, xa, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), _v = it(Tv), Av = C({}, ke, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Ov = it(Av), Mv = C({}, xa, {
    newState: 0,
    oldState: 0
  }), pv = it(Mv), Dv = [9, 13, 27, 32], zi = Jt && "CompositionEvent" in window, Iu = null;
  Jt && "documentMode" in document && (Iu = document.documentMode);
  var Uv = Jt && "TextEvent" in window && !Iu, Pc = Jt && (!zi || Iu && 8 < Iu && 11 >= Iu), ls = " ", ts = !1;
  function as(l, t) {
    switch (l) {
      case "keyup":
        return Dv.indexOf(t.keyCode) !== -1;
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
  function us(l) {
    return l = l.detail, typeof l == "object" && "data" in l ? l.data : null;
  }
  var du = !1;
  function Nv(l, t) {
    switch (l) {
      case "compositionend":
        return us(t);
      case "keypress":
        return t.which !== 32 ? null : (ts = !0, ls);
      case "textInput":
        return l = t.data, l === ls && ts ? null : l;
      default:
        return null;
    }
  }
  function Rv(l, t) {
    if (du)
      return l === "compositionend" || !zi && as(l, t) ? (l = Wc(), we = ri = da = null, du = !1, l) : null;
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
        return Pc && t.locale !== "ko" ? null : t.data;
      default:
        return null;
    }
  }
  var Hv = {
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
  function es(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t === "input" ? !!Hv[l.type] : t === "textarea";
  }
  function ns(l, t, a, u) {
    su ? ou ? ou.push(u) : ou = [u] : su = u, t = Xn(t, "onChange"), 0 < t.length && (a = new Fe(
      "onChange",
      "change",
      null,
      a,
      u
    ), l.push({ event: a, listeners: t }));
  }
  var Pu = null, le = null;
  function Cv(l) {
    Zo(l, 0);
  }
  function Ie(l) {
    var t = wu(l);
    if (Qc(t)) return l;
  }
  function is(l, t) {
    if (l === "change") return t;
  }
  var fs = !1;
  if (Jt) {
    var Ti;
    if (Jt) {
      var _i = "oninput" in document;
      if (!_i) {
        var cs = document.createElement("div");
        cs.setAttribute("oninput", "return;"), _i = typeof cs.oninput == "function";
      }
      Ti = _i;
    } else Ti = !1;
    fs = Ti && (!document.documentMode || 9 < document.documentMode);
  }
  function ss() {
    Pu && (Pu.detachEvent("onpropertychange", os), le = Pu = null);
  }
  function os(l) {
    if (l.propertyName === "value" && Ie(le)) {
      var t = [];
      ns(
        t,
        le,
        l,
        yi(l)
      ), wc(Cv, t);
    }
  }
  function jv(l, t, a) {
    l === "focusin" ? (ss(), Pu = t, le = a, Pu.attachEvent("onpropertychange", os)) : l === "focusout" && ss();
  }
  function qv(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return Ie(le);
  }
  function Bv(l, t) {
    if (l === "click") return Ie(t);
  }
  function xv(l, t) {
    if (l === "input" || l === "change")
      return Ie(t);
  }
  function Yv(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var ht = typeof Object.is == "function" ? Object.is : Yv;
  function te(l, t) {
    if (ht(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!Yt.call(t, e) || !ht(l[e], t[e]))
        return !1;
    }
    return !0;
  }
  function ds(l) {
    for (; l && l.firstChild; ) l = l.firstChild;
    return l;
  }
  function vs(l, t) {
    var a = ds(l);
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
      a = ds(a);
    }
  }
  function ys(l, t) {
    return l && t ? l === t ? !0 : l && l.nodeType === 3 ? !1 : t && t.nodeType === 3 ? ys(l, t.parentNode) : "contains" in l ? l.contains(t) : l.compareDocumentPosition ? !!(l.compareDocumentPosition(t) & 16) : !1 : !1;
  }
  function ms(l) {
    l = l != null && l.ownerDocument != null && l.ownerDocument.defaultView != null ? l.ownerDocument.defaultView : window;
    for (var t = Ke(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = Ke(l.document);
    }
    return t;
  }
  function Ai(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var Gv = Jt && "documentMode" in document && 11 >= document.documentMode, vu = null, Oi = null, ae = null, Mi = !1;
  function hs(l, t, a) {
    var u = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    Mi || vu == null || vu !== Ke(u) || (u = vu, "selectionStart" in u && Ai(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = {
      anchorNode: u.anchorNode,
      anchorOffset: u.anchorOffset,
      focusNode: u.focusNode,
      focusOffset: u.focusOffset
    }), ae && te(ae, u) || (ae = u, u = Xn(Oi, "onSelect"), 0 < u.length && (t = new Fe(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: u }), t.target = vu)));
  }
  function Ya(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var yu = {
    animationend: Ya("Animation", "AnimationEnd"),
    animationiteration: Ya("Animation", "AnimationIteration"),
    animationstart: Ya("Animation", "AnimationStart"),
    transitionrun: Ya("Transition", "TransitionRun"),
    transitionstart: Ya("Transition", "TransitionStart"),
    transitioncancel: Ya("Transition", "TransitionCancel"),
    transitionend: Ya("Transition", "TransitionEnd")
  }, pi = {}, rs = {};
  Jt && (rs = document.createElement("div").style, "AnimationEvent" in window || (delete yu.animationend.animation, delete yu.animationiteration.animation, delete yu.animationstart.animation), "TransitionEvent" in window || delete yu.transitionend.transition);
  function Ga(l) {
    if (pi[l]) return pi[l];
    if (!yu[l]) return l;
    var t = yu[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in rs)
        return pi[l] = t[a];
    return l;
  }
  var Ss = Ga("animationend"), gs = Ga("animationiteration"), bs = Ga("animationstart"), Qv = Ga("transitionrun"), Xv = Ga("transitionstart"), Zv = Ga("transitioncancel"), Es = Ga("transitionend"), zs = /* @__PURE__ */ new Map(), Di = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  Di.push("scrollEnd");
  function jt(l, t) {
    zs.set(l, t), Ba(t, [l]);
  }
  var Pe = typeof reportError == "function" ? reportError : function(l) {
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
  }, Ot = [], mu = 0, Ui = 0;
  function ln() {
    for (var l = mu, t = Ui = mu = 0; t < l; ) {
      var a = Ot[t];
      Ot[t++] = null;
      var u = Ot[t];
      Ot[t++] = null;
      var e = Ot[t];
      Ot[t++] = null;
      var n = Ot[t];
      if (Ot[t++] = null, u !== null && e !== null) {
        var i = u.pending;
        i === null ? e.next = e : (e.next = i.next, i.next = e), u.pending = e;
      }
      n !== 0 && Ts(a, e, n);
    }
  }
  function tn(l, t, a, u) {
    Ot[mu++] = l, Ot[mu++] = t, Ot[mu++] = a, Ot[mu++] = u, Ui |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function Ni(l, t, a, u) {
    return tn(l, t, a, u), an(l);
  }
  function Qa(l, t) {
    return tn(l, null, null, t), an(l);
  }
  function Ts(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - mt(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function an(l) {
    if (50 < Ae)
      throw Ae = 0, Qf = null, Error(v(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var hu = {};
  function Lv(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function rt(l, t, a, u) {
    return new Lv(l, t, a, u);
  }
  function Ri(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function wt(l, t) {
    var a = l.alternate;
    return a === null ? (a = rt(
      l.tag,
      t,
      l.key,
      l.mode
    ), a.elementType = l.elementType, a.type = l.type, a.stateNode = l.stateNode, a.alternate = l, l.alternate = a) : (a.pendingProps = t, a.type = l.type, a.flags = 0, a.subtreeFlags = 0, a.deletions = null), a.flags = l.flags & 65011712, a.childLanes = l.childLanes, a.lanes = l.lanes, a.child = l.child, a.memoizedProps = l.memoizedProps, a.memoizedState = l.memoizedState, a.updateQueue = l.updateQueue, t = l.dependencies, a.dependencies = t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }, a.sibling = l.sibling, a.index = l.index, a.ref = l.ref, a.refCleanup = l.refCleanup, a;
  }
  function _s(l, t) {
    l.flags &= 65011714;
    var a = l.alternate;
    return a === null ? (l.childLanes = 0, l.lanes = t, l.child = null, l.subtreeFlags = 0, l.memoizedProps = null, l.memoizedState = null, l.updateQueue = null, l.dependencies = null, l.stateNode = null) : (l.childLanes = a.childLanes, l.lanes = a.lanes, l.child = a.child, l.subtreeFlags = 0, l.deletions = null, l.memoizedProps = a.memoizedProps, l.memoizedState = a.memoizedState, l.updateQueue = a.updateQueue, l.type = a.type, t = a.dependencies, l.dependencies = t === null ? null : {
      lanes: t.lanes,
      firstContext: t.firstContext
    }), l;
  }
  function un(l, t, a, u, e, n) {
    var i = 0;
    if (u = l, typeof l == "function") Ri(l) && (i = 1);
    else if (typeof l == "string")
      i = Wy(
        l,
        a,
        D.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (l) {
        case Bl:
          return l = rt(31, a, t, e), l.elementType = Bl, l.lanes = n, l;
        case Ul:
          return Xa(a.children, e, n, t);
        case $:
          i = 8, e |= 24;
          break;
        case Nl:
          return l = rt(12, a, t, e | 2), l.elementType = Nl, l.lanes = n, l;
        case lt:
          return l = rt(13, a, t, e), l.elementType = lt, l.lanes = n, l;
        case Ml:
          return l = rt(19, a, t, e), l.elementType = Ml, l.lanes = n, l;
        default:
          if (typeof l == "object" && l !== null)
            switch (l.$$typeof) {
              case Ol:
                i = 10;
                break l;
              case al:
                i = 9;
                break l;
              case El:
                i = 11;
                break l;
              case V:
                i = 14;
                break l;
              case wl:
                i = 16, u = null;
                break l;
            }
          i = 29, a = Error(
            v(130, l === null ? "null" : typeof l, "")
          ), u = null;
      }
    return t = rt(i, a, t, e), t.elementType = l, t.type = u, t.lanes = n, t;
  }
  function Xa(l, t, a, u) {
    return l = rt(7, l, u, t), l.lanes = a, l;
  }
  function Hi(l, t, a) {
    return l = rt(6, l, null, t), l.lanes = a, l;
  }
  function As(l) {
    var t = rt(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function Ci(l, t, a) {
    return t = rt(
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
  var Os = /* @__PURE__ */ new WeakMap();
  function Mt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = Os.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Zl(t)
      }, Os.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Zl(t)
    };
  }
  var ru = [], Su = 0, en = null, ue = 0, pt = [], Dt = 0, va = null, Gt = 1, Qt = "";
  function Wt(l, t) {
    ru[Su++] = ue, ru[Su++] = en, en = l, ue = t;
  }
  function Ms(l, t, a) {
    pt[Dt++] = Gt, pt[Dt++] = Qt, pt[Dt++] = va, va = l;
    var u = Gt;
    l = Qt;
    var e = 32 - mt(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - mt(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, Gt = 1 << 32 - mt(t) + e | a << e | u, Qt = n + l;
    } else
      Gt = 1 << n | a << e | u, Qt = l;
  }
  function ji(l) {
    l.return !== null && (Wt(l, 1), Ms(l, 1, 0));
  }
  function qi(l) {
    for (; l === en; )
      en = ru[--Su], ru[Su] = null, ue = ru[--Su], ru[Su] = null;
    for (; l === va; )
      va = pt[--Dt], pt[Dt] = null, Qt = pt[--Dt], pt[Dt] = null, Gt = pt[--Dt], pt[Dt] = null;
  }
  function ps(l, t) {
    pt[Dt++] = Gt, pt[Dt++] = Qt, pt[Dt++] = va, Gt = t.id, Qt = t.overflow, va = l;
  }
  var $l = null, _l = null, tl = !1, ya = null, Ut = !1, Bi = Error(v(519));
  function ma(l) {
    var t = Error(
      v(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw ee(Mt(t, l)), Bi;
  }
  function Ds(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[Wl] = l, t[nt] = u, a) {
      case "dialog":
        I("cancel", t), I("close", t);
        break;
      case "iframe":
      case "object":
      case "embed":
        I("load", t);
        break;
      case "video":
      case "audio":
        for (a = 0; a < Me.length; a++)
          I(Me[a], t);
        break;
      case "source":
        I("error", t);
        break;
      case "img":
      case "image":
      case "link":
        I("error", t), I("load", t);
        break;
      case "details":
        I("toggle", t);
        break;
      case "input":
        I("invalid", t), Xc(
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
        I("invalid", t);
        break;
      case "textarea":
        I("invalid", t), Lc(t, u.value, u.defaultValue, u.children);
    }
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || Jo(t.textContent, a) ? (u.popover != null && (I("beforetoggle", t), I("toggle", t)), u.onScroll != null && I("scroll", t), u.onScrollEnd != null && I("scrollend", t), u.onClick != null && (t.onclick = Kt), t = !0) : t = !1, t || ma(l, !0);
  }
  function Us(l) {
    for ($l = l.return; $l; )
      switch ($l.tag) {
        case 5:
        case 31:
        case 13:
          Ut = !1;
          return;
        case 27:
        case 3:
          Ut = !0;
          return;
        default:
          $l = $l.return;
      }
  }
  function gu(l) {
    if (l !== $l) return !1;
    if (!tl) return Us(l), tl = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || tc(l.type, l.memoizedProps)), a = !a), a && _l && ma(l), Us(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(v(317));
      _l = td(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(v(317));
      _l = td(l);
    } else
      t === 27 ? (t = _l, Da(l.type) ? (l = ic, ic = null, _l = l) : _l = t) : _l = $l ? Rt(l.stateNode.nextSibling) : null;
    return !0;
  }
  function Za() {
    _l = $l = null, tl = !1;
  }
  function xi() {
    var l = ya;
    return l !== null && (ot === null ? ot = l : ot.push.apply(
      ot,
      l
    ), ya = null), l;
  }
  function ee(l) {
    ya === null ? ya = [l] : ya.push(l);
  }
  var Yi = o(null), La = null, $t = null;
  function ha(l, t, a) {
    p(Yi, t._currentValue), t._currentValue = a;
  }
  function Ft(l) {
    l._currentValue = Yi.current, z(Yi);
  }
  function Gi(l, t, a) {
    for (; l !== null; ) {
      var u = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, u !== null && (u.childLanes |= t)) : u !== null && (u.childLanes & t) !== t && (u.childLanes |= t), l === a) break;
      l = l.return;
    }
  }
  function Qi(l, t, a, u) {
    var e = l.child;
    for (e !== null && (e.return = l); e !== null; ) {
      var n = e.dependencies;
      if (n !== null) {
        var i = e.child;
        n = n.firstContext;
        l: for (; n !== null; ) {
          var f = n;
          n = e;
          for (var c = 0; c < t.length; c++)
            if (f.context === t[c]) {
              n.lanes |= a, f = n.alternate, f !== null && (f.lanes |= a), Gi(
                n.return,
                a,
                l
              ), u || (i = null);
              break l;
            }
          n = f.next;
        }
      } else if (e.tag === 18) {
        if (i = e.return, i === null) throw Error(v(341));
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Gi(i, a, l), i = null;
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
  function bu(l, t, a, u) {
    l = null;
    for (var e = t, n = !1; e !== null; ) {
      if (!n) {
        if ((e.flags & 524288) !== 0) n = !0;
        else if ((e.flags & 262144) !== 0) break;
      }
      if (e.tag === 10) {
        var i = e.alternate;
        if (i === null) throw Error(v(387));
        if (i = i.memoizedProps, i !== null) {
          var f = e.type;
          ht(e.pendingProps.value, i.value) || (l !== null ? l.push(f) : l = [f]);
        }
      } else if (e === x.current) {
        if (i = e.alternate, i === null) throw Error(v(387));
        i.memoizedState.memoizedState !== e.memoizedState.memoizedState && (l !== null ? l.push(Re) : l = [Re]);
      }
      e = e.return;
    }
    l !== null && Qi(
      t,
      l,
      a,
      u
    ), t.flags |= 262144;
  }
  function nn(l) {
    for (l = l.firstContext; l !== null; ) {
      if (!ht(
        l.context._currentValue,
        l.memoizedValue
      ))
        return !0;
      l = l.next;
    }
    return !1;
  }
  function Va(l) {
    La = l, $t = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function Fl(l) {
    return Ns(La, l);
  }
  function fn(l, t) {
    return La === null && Va(l), Ns(l, t);
  }
  function Ns(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, $t === null) {
      if (l === null) throw Error(v(308));
      $t = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else $t = $t.next = t;
    return a;
  }
  var Vv = typeof AbortController < "u" ? AbortController : function() {
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
  }, Kv = _.unstable_scheduleCallback, Jv = _.unstable_NormalPriority, xl = {
    $$typeof: Ol,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Xi() {
    return {
      controller: new Vv(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function ne(l) {
    l.refCount--, l.refCount === 0 && Kv(Jv, function() {
      l.controller.abort();
    });
  }
  var ie = null, Zi = 0, Eu = 0, zu = null;
  function wv(l, t) {
    if (ie === null) {
      var a = ie = [];
      Zi = 0, Eu = Jf(), zu = {
        status: "pending",
        value: void 0,
        then: function(u) {
          a.push(u);
        }
      };
    }
    return Zi++, t.then(Rs, Rs), t;
  }
  function Rs() {
    if (--Zi === 0 && ie !== null) {
      zu !== null && (zu.status = "fulfilled");
      var l = ie;
      ie = null, Eu = 0, zu = null;
      for (var t = 0; t < l.length; t++) (0, l[t])();
    }
  }
  function Wv(l, t) {
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
  var Hs = S.S;
  S.S = function(l, t) {
    ro = Tl(), typeof t == "object" && t !== null && typeof t.then == "function" && wv(l, t), Hs !== null && Hs(l, t);
  };
  var Ka = o(null);
  function Li() {
    var l = Ka.current;
    return l !== null ? l : gl.pooledCache;
  }
  function cn(l, t) {
    t === null ? p(Ka, Ka.current) : p(Ka, t.pool);
  }
  function Cs() {
    var l = Li();
    return l === null ? null : { parent: xl._currentValue, pool: l };
  }
  var Tu = Error(v(460)), Vi = Error(v(474)), sn = Error(v(542)), on = { then: function() {
  } };
  function js(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function qs(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(Kt, Kt), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, xs(l), l;
      default:
        if (typeof t.status == "string") t.then(Kt, Kt);
        else {
          if (l = gl, l !== null && 100 < l.shellSuspendCounter)
            throw Error(v(482));
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
            throw l = t.reason, xs(l), l;
        }
        throw wa = t, Tu;
    }
  }
  function Ja(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (wa = a, Tu) : a;
    }
  }
  var wa = null;
  function Bs() {
    if (wa === null) throw Error(v(459));
    var l = wa;
    return wa = null, l;
  }
  function xs(l) {
    if (l === Tu || l === sn)
      throw Error(v(483));
  }
  var _u = null, fe = 0;
  function dn(l) {
    var t = fe;
    return fe += 1, _u === null && (_u = []), qs(_u, l, t);
  }
  function ce(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function vn(l, t) {
    throw t.$$typeof === L ? Error(v(525)) : (l = Object.prototype.toString.call(t), Error(
      v(
        31,
        l === "[object Object]" ? "object with keys {" + Object.keys(t).join(", ") + "}" : l
      )
    ));
  }
  function Ys(l) {
    function t(d, s) {
      if (l) {
        var y = d.deletions;
        y === null ? (d.deletions = [s], d.flags |= 16) : y.push(s);
      }
    }
    function a(d, s) {
      if (!l) return null;
      for (; s !== null; )
        t(d, s), s = s.sibling;
      return null;
    }
    function u(d) {
      for (var s = /* @__PURE__ */ new Map(); d !== null; )
        d.key !== null ? s.set(d.key, d) : s.set(d.index, d), d = d.sibling;
      return s;
    }
    function e(d, s) {
      return d = wt(d, s), d.index = 0, d.sibling = null, d;
    }
    function n(d, s, y) {
      return d.index = y, l ? (y = d.alternate, y !== null ? (y = y.index, y < s ? (d.flags |= 67108866, s) : y) : (d.flags |= 67108866, s)) : (d.flags |= 1048576, s);
    }
    function i(d) {
      return l && d.alternate === null && (d.flags |= 67108866), d;
    }
    function f(d, s, y, E) {
      return s === null || s.tag !== 6 ? (s = Hi(y, d.mode, E), s.return = d, s) : (s = e(s, y), s.return = d, s);
    }
    function c(d, s, y, E) {
      var j = y.type;
      return j === Ul ? g(
        d,
        s,
        y.props.children,
        E,
        y.key
      ) : s !== null && (s.elementType === j || typeof j == "object" && j !== null && j.$$typeof === wl && Ja(j) === s.type) ? (s = e(s, y.props), ce(s, y), s.return = d, s) : (s = un(
        y.type,
        y.key,
        y.props,
        null,
        d.mode,
        E
      ), ce(s, y), s.return = d, s);
    }
    function m(d, s, y, E) {
      return s === null || s.tag !== 4 || s.stateNode.containerInfo !== y.containerInfo || s.stateNode.implementation !== y.implementation ? (s = Ci(y, d.mode, E), s.return = d, s) : (s = e(s, y.children || []), s.return = d, s);
    }
    function g(d, s, y, E, j) {
      return s === null || s.tag !== 7 ? (s = Xa(
        y,
        d.mode,
        E,
        j
      ), s.return = d, s) : (s = e(s, y), s.return = d, s);
    }
    function T(d, s, y) {
      if (typeof s == "string" && s !== "" || typeof s == "number" || typeof s == "bigint")
        return s = Hi(
          "" + s,
          d.mode,
          y
        ), s.return = d, s;
      if (typeof s == "object" && s !== null) {
        switch (s.$$typeof) {
          case Sl:
            return y = un(
              s.type,
              s.key,
              s.props,
              null,
              d.mode,
              y
            ), ce(y, s), y.return = d, y;
          case sl:
            return s = Ci(
              s,
              d.mode,
              y
            ), s.return = d, s;
          case wl:
            return s = Ja(s), T(d, s, y);
        }
        if (Vl(s) || vl(s))
          return s = Xa(
            s,
            d.mode,
            y,
            null
          ), s.return = d, s;
        if (typeof s.then == "function")
          return T(d, dn(s), y);
        if (s.$$typeof === Ol)
          return T(
            d,
            fn(d, s),
            y
          );
        vn(d, s);
      }
      return null;
    }
    function h(d, s, y, E) {
      var j = s !== null ? s.key : null;
      if (typeof y == "string" && y !== "" || typeof y == "number" || typeof y == "bigint")
        return j !== null ? null : f(d, s, "" + y, E);
      if (typeof y == "object" && y !== null) {
        switch (y.$$typeof) {
          case Sl:
            return y.key === j ? c(d, s, y, E) : null;
          case sl:
            return y.key === j ? m(d, s, y, E) : null;
          case wl:
            return y = Ja(y), h(d, s, y, E);
        }
        if (Vl(y) || vl(y))
          return j !== null ? null : g(d, s, y, E, null);
        if (typeof y.then == "function")
          return h(
            d,
            s,
            dn(y),
            E
          );
        if (y.$$typeof === Ol)
          return h(
            d,
            s,
            fn(d, y),
            E
          );
        vn(d, y);
      }
      return null;
    }
    function r(d, s, y, E, j) {
      if (typeof E == "string" && E !== "" || typeof E == "number" || typeof E == "bigint")
        return d = d.get(y) || null, f(s, d, "" + E, j);
      if (typeof E == "object" && E !== null) {
        switch (E.$$typeof) {
          case Sl:
            return d = d.get(
              E.key === null ? y : E.key
            ) || null, c(s, d, E, j);
          case sl:
            return d = d.get(
              E.key === null ? y : E.key
            ) || null, m(s, d, E, j);
          case wl:
            return E = Ja(E), r(
              d,
              s,
              y,
              E,
              j
            );
        }
        if (Vl(E) || vl(E))
          return d = d.get(y) || null, g(s, d, E, j, null);
        if (typeof E.then == "function")
          return r(
            d,
            s,
            y,
            dn(E),
            j
          );
        if (E.$$typeof === Ol)
          return r(
            d,
            s,
            y,
            fn(s, E),
            j
          );
        vn(s, E);
      }
      return null;
    }
    function N(d, s, y, E) {
      for (var j = null, nl = null, H = s, K = s = 0, ll = null; H !== null && K < y.length; K++) {
        H.index > K ? (ll = H, H = null) : ll = H.sibling;
        var il = h(
          d,
          H,
          y[K],
          E
        );
        if (il === null) {
          H === null && (H = ll);
          break;
        }
        l && H && il.alternate === null && t(d, H), s = n(il, s, K), nl === null ? j = il : nl.sibling = il, nl = il, H = ll;
      }
      if (K === y.length)
        return a(d, H), tl && Wt(d, K), j;
      if (H === null) {
        for (; K < y.length; K++)
          H = T(d, y[K], E), H !== null && (s = n(
            H,
            s,
            K
          ), nl === null ? j = H : nl.sibling = H, nl = H);
        return tl && Wt(d, K), j;
      }
      for (H = u(H); K < y.length; K++)
        ll = r(
          H,
          d,
          K,
          y[K],
          E
        ), ll !== null && (l && ll.alternate !== null && H.delete(
          ll.key === null ? K : ll.key
        ), s = n(
          ll,
          s,
          K
        ), nl === null ? j = ll : nl.sibling = ll, nl = ll);
      return l && H.forEach(function(Ca) {
        return t(d, Ca);
      }), tl && Wt(d, K), j;
    }
    function Y(d, s, y, E) {
      if (y == null) throw Error(v(151));
      for (var j = null, nl = null, H = s, K = s = 0, ll = null, il = y.next(); H !== null && !il.done; K++, il = y.next()) {
        H.index > K ? (ll = H, H = null) : ll = H.sibling;
        var Ca = h(d, H, il.value, E);
        if (Ca === null) {
          H === null && (H = ll);
          break;
        }
        l && H && Ca.alternate === null && t(d, H), s = n(Ca, s, K), nl === null ? j = Ca : nl.sibling = Ca, nl = Ca, H = ll;
      }
      if (il.done)
        return a(d, H), tl && Wt(d, K), j;
      if (H === null) {
        for (; !il.done; K++, il = y.next())
          il = T(d, il.value, E), il !== null && (s = n(il, s, K), nl === null ? j = il : nl.sibling = il, nl = il);
        return tl && Wt(d, K), j;
      }
      for (H = u(H); !il.done; K++, il = y.next())
        il = r(H, d, K, il.value, E), il !== null && (l && il.alternate !== null && H.delete(il.key === null ? K : il.key), s = n(il, s, K), nl === null ? j = il : nl.sibling = il, nl = il);
      return l && H.forEach(function(nm) {
        return t(d, nm);
      }), tl && Wt(d, K), j;
    }
    function rl(d, s, y, E) {
      if (typeof y == "object" && y !== null && y.type === Ul && y.key === null && (y = y.props.children), typeof y == "object" && y !== null) {
        switch (y.$$typeof) {
          case Sl:
            l: {
              for (var j = y.key; s !== null; ) {
                if (s.key === j) {
                  if (j = y.type, j === Ul) {
                    if (s.tag === 7) {
                      a(
                        d,
                        s.sibling
                      ), E = e(
                        s,
                        y.props.children
                      ), E.return = d, d = E;
                      break l;
                    }
                  } else if (s.elementType === j || typeof j == "object" && j !== null && j.$$typeof === wl && Ja(j) === s.type) {
                    a(
                      d,
                      s.sibling
                    ), E = e(s, y.props), ce(E, y), E.return = d, d = E;
                    break l;
                  }
                  a(d, s);
                  break;
                } else t(d, s);
                s = s.sibling;
              }
              y.type === Ul ? (E = Xa(
                y.props.children,
                d.mode,
                E,
                y.key
              ), E.return = d, d = E) : (E = un(
                y.type,
                y.key,
                y.props,
                null,
                d.mode,
                E
              ), ce(E, y), E.return = d, d = E);
            }
            return i(d);
          case sl:
            l: {
              for (j = y.key; s !== null; ) {
                if (s.key === j)
                  if (s.tag === 4 && s.stateNode.containerInfo === y.containerInfo && s.stateNode.implementation === y.implementation) {
                    a(
                      d,
                      s.sibling
                    ), E = e(s, y.children || []), E.return = d, d = E;
                    break l;
                  } else {
                    a(d, s);
                    break;
                  }
                else t(d, s);
                s = s.sibling;
              }
              E = Ci(y, d.mode, E), E.return = d, d = E;
            }
            return i(d);
          case wl:
            return y = Ja(y), rl(
              d,
              s,
              y,
              E
            );
        }
        if (Vl(y))
          return N(
            d,
            s,
            y,
            E
          );
        if (vl(y)) {
          if (j = vl(y), typeof j != "function") throw Error(v(150));
          return y = j.call(y), Y(
            d,
            s,
            y,
            E
          );
        }
        if (typeof y.then == "function")
          return rl(
            d,
            s,
            dn(y),
            E
          );
        if (y.$$typeof === Ol)
          return rl(
            d,
            s,
            fn(d, y),
            E
          );
        vn(d, y);
      }
      return typeof y == "string" && y !== "" || typeof y == "number" || typeof y == "bigint" ? (y = "" + y, s !== null && s.tag === 6 ? (a(d, s.sibling), E = e(s, y), E.return = d, d = E) : (a(d, s), E = Hi(y, d.mode, E), E.return = d, d = E), i(d)) : a(d, s);
    }
    return function(d, s, y, E) {
      try {
        fe = 0;
        var j = rl(
          d,
          s,
          y,
          E
        );
        return _u = null, j;
      } catch (H) {
        if (H === Tu || H === sn) throw H;
        var nl = rt(29, H, null, d.mode);
        return nl.lanes = E, nl.return = d, nl;
      } finally {
      }
    };
  }
  var Wa = Ys(!0), Gs = Ys(!1), ra = !1;
  function Ki(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function Ji(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function Sa(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function ga(l, t, a) {
    var u = l.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (fl & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = an(l), Ts(l, null, a), t;
    }
    return tn(l, u, t, a), an(l);
  }
  function se(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Nc(l, a);
    }
  }
  function wi(l, t) {
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
  var Wi = !1;
  function oe() {
    if (Wi) {
      var l = zu;
      if (l !== null) throw l;
    }
  }
  function de(l, t, a, u) {
    Wi = !1;
    var e = l.updateQueue;
    ra = !1;
    var n = e.firstBaseUpdate, i = e.lastBaseUpdate, f = e.shared.pending;
    if (f !== null) {
      e.shared.pending = null;
      var c = f, m = c.next;
      c.next = null, i === null ? n = m : i.next = m, i = c;
      var g = l.alternate;
      g !== null && (g = g.updateQueue, f = g.lastBaseUpdate, f !== i && (f === null ? g.firstBaseUpdate = m : f.next = m, g.lastBaseUpdate = c));
    }
    if (n !== null) {
      var T = e.baseState;
      i = 0, g = m = c = null, f = n;
      do {
        var h = f.lane & -536870913, r = h !== f.lane;
        if (r ? (P & h) === h : (u & h) === h) {
          h !== 0 && h === Eu && (Wi = !0), g !== null && (g = g.next = {
            lane: 0,
            tag: f.tag,
            payload: f.payload,
            callback: null,
            next: null
          });
          l: {
            var N = l, Y = f;
            h = t;
            var rl = a;
            switch (Y.tag) {
              case 1:
                if (N = Y.payload, typeof N == "function") {
                  T = N.call(rl, T, h);
                  break l;
                }
                T = N;
                break l;
              case 3:
                N.flags = N.flags & -65537 | 128;
              case 0:
                if (N = Y.payload, h = typeof N == "function" ? N.call(rl, T, h) : N, h == null) break l;
                T = C({}, T, h);
                break l;
              case 2:
                ra = !0;
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
          }, g === null ? (m = g = r, c = T) : g = g.next = r, i |= h;
        if (f = f.next, f === null) {
          if (f = e.shared.pending, f === null)
            break;
          r = f, f = r.next, r.next = null, e.lastBaseUpdate = r, e.shared.pending = null;
        }
      } while (!0);
      g === null && (c = T), e.baseState = c, e.firstBaseUpdate = m, e.lastBaseUpdate = g, n === null && (e.shared.lanes = 0), _a |= i, l.lanes = i, l.memoizedState = T;
    }
  }
  function Qs(l, t) {
    if (typeof l != "function")
      throw Error(v(191, l));
    l.call(t);
  }
  function Xs(l, t) {
    var a = l.callbacks;
    if (a !== null)
      for (l.callbacks = null, l = 0; l < a.length; l++)
        Qs(a[l], t);
  }
  var Au = o(null), yn = o(0);
  function Zs(l, t) {
    l = na, p(yn, l), p(Au, t), na = l | t.baseLanes;
  }
  function $i() {
    p(yn, na), p(Au, Au.current);
  }
  function Fi() {
    na = yn.current, z(Au), z(yn);
  }
  var St = o(null), Nt = null;
  function ba(l) {
    var t = l.alternate;
    p(jl, jl.current & 1), p(St, l), Nt === null && (t === null || Au.current !== null || t.memoizedState !== null) && (Nt = l);
  }
  function ki(l) {
    p(jl, jl.current), p(St, l), Nt === null && (Nt = l);
  }
  function Ls(l) {
    l.tag === 22 ? (p(jl, jl.current), p(St, l), Nt === null && (Nt = l)) : Ea();
  }
  function Ea() {
    p(jl, jl.current), p(St, St.current);
  }
  function gt(l) {
    z(St), Nt === l && (Nt = null), z(jl);
  }
  var jl = o(0);
  function mn(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || ec(a) || nc(a)))
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
  var kt = 0, Z = null, ml = null, Yl = null, hn = !1, Ou = !1, $a = !1, rn = 0, ve = 0, Mu = null, $v = 0;
  function Rl() {
    throw Error(v(321));
  }
  function Ii(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!ht(l[a], t[a])) return !1;
    return !0;
  }
  function Pi(l, t, a, u, e, n) {
    return kt = n, Z = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, S.H = l === null || l.memoizedState === null ? M0 : hf, $a = !1, n = a(u, e), $a = !1, Ou && (n = Ks(
      t,
      a,
      u,
      e
    )), Vs(l), n;
  }
  function Vs(l) {
    S.H = he;
    var t = ml !== null && ml.next !== null;
    if (kt = 0, Yl = ml = Z = null, hn = !1, ve = 0, Mu = null, t) throw Error(v(300));
    l === null || Gl || (l = l.dependencies, l !== null && nn(l) && (Gl = !0));
  }
  function Ks(l, t, a, u) {
    Z = l;
    var e = 0;
    do {
      if (Ou && (Mu = null), ve = 0, Ou = !1, 25 <= e) throw Error(v(301));
      if (e += 1, Yl = ml = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      S.H = p0, n = t(a, u);
    } while (Ou);
    return n;
  }
  function Fv() {
    var l = S.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? ye(t) : t, l = l.useState()[0], (ml !== null ? ml.memoizedState : null) !== l && (Z.flags |= 1024), t;
  }
  function lf() {
    var l = rn !== 0;
    return rn = 0, l;
  }
  function tf(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function af(l) {
    if (hn) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      hn = !1;
    }
    kt = 0, Yl = ml = Z = null, Ou = !1, ve = rn = 0, Mu = null;
  }
  function at() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Yl === null ? Z.memoizedState = Yl = l : Yl = Yl.next = l, Yl;
  }
  function ql() {
    if (ml === null) {
      var l = Z.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = ml.next;
    var t = Yl === null ? Z.memoizedState : Yl.next;
    if (t !== null)
      Yl = t, ml = l;
    else {
      if (l === null)
        throw Z.alternate === null ? Error(v(467)) : Error(v(310));
      ml = l, l = {
        memoizedState: ml.memoizedState,
        baseState: ml.baseState,
        baseQueue: ml.baseQueue,
        queue: ml.queue,
        next: null
      }, Yl === null ? Z.memoizedState = Yl = l : Yl = Yl.next = l;
    }
    return Yl;
  }
  function Sn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function ye(l) {
    var t = ve;
    return ve += 1, Mu === null && (Mu = []), l = qs(Mu, l, t), t = Z, (Yl === null ? t.memoizedState : Yl.next) === null && (t = t.alternate, S.H = t === null || t.memoizedState === null ? M0 : hf), l;
  }
  function gn(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return ye(l);
      if (l.$$typeof === Ol) return Fl(l);
    }
    throw Error(v(438, String(l)));
  }
  function uf(l) {
    var t = null, a = Z.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var u = Z.alternate;
      u !== null && (u = u.updateQueue, u !== null && (u = u.memoCache, u != null && (t = {
        data: u.data.map(function(e) {
          return e.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = Sn(), Z.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), u = 0; u < l; u++)
        a[u] = Lt;
    return t.index++, a;
  }
  function It(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function bn(l) {
    var t = ql();
    return ef(t, ml, l);
  }
  function ef(l, t, a) {
    var u = l.queue;
    if (u === null) throw Error(v(311));
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
      var f = i = null, c = null, m = t, g = !1;
      do {
        var T = m.lane & -536870913;
        if (T !== m.lane ? (P & T) === T : (kt & T) === T) {
          var h = m.revertLane;
          if (h === 0)
            c !== null && (c = c.next = {
              lane: 0,
              revertLane: 0,
              gesture: null,
              action: m.action,
              hasEagerState: m.hasEagerState,
              eagerState: m.eagerState,
              next: null
            }), T === Eu && (g = !0);
          else if ((kt & h) === h) {
            m = m.next, h === Eu && (g = !0);
            continue;
          } else
            T = {
              lane: 0,
              revertLane: m.revertLane,
              gesture: null,
              action: m.action,
              hasEagerState: m.hasEagerState,
              eagerState: m.eagerState,
              next: null
            }, c === null ? (f = c = T, i = n) : c = c.next = T, Z.lanes |= h, _a |= h;
          T = m.action, $a && a(n, T), n = m.hasEagerState ? m.eagerState : a(n, T);
        } else
          h = {
            lane: T,
            revertLane: m.revertLane,
            gesture: m.gesture,
            action: m.action,
            hasEagerState: m.hasEagerState,
            eagerState: m.eagerState,
            next: null
          }, c === null ? (f = c = h, i = n) : c = c.next = h, Z.lanes |= T, _a |= T;
        m = m.next;
      } while (m !== null && m !== t);
      if (c === null ? i = n : c.next = f, !ht(n, l.memoizedState) && (Gl = !0, g && (a = zu, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = c, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function nf(l) {
    var t = ql(), a = t.queue;
    if (a === null) throw Error(v(311));
    a.lastRenderedReducer = l;
    var u = a.dispatch, e = a.pending, n = t.memoizedState;
    if (e !== null) {
      a.pending = null;
      var i = e = e.next;
      do
        n = l(n, i.action), i = i.next;
      while (i !== e);
      ht(n, t.memoizedState) || (Gl = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function Js(l, t, a) {
    var u = Z, e = ql(), n = tl;
    if (n) {
      if (a === void 0) throw Error(v(407));
      a = a();
    } else a = t();
    var i = !ht(
      (ml || e).memoizedState,
      a
    );
    if (i && (e.memoizedState = a, Gl = !0), e = e.queue, sf($s.bind(null, u, e, l), [
      l
    ]), e.getSnapshot !== t || i || Yl !== null && Yl.memoizedState.tag & 1) {
      if (u.flags |= 2048, pu(
        9,
        { destroy: void 0 },
        Ws.bind(
          null,
          u,
          e,
          a,
          t
        ),
        null
      ), gl === null) throw Error(v(349));
      n || (kt & 127) !== 0 || ws(u, t, a);
    }
    return a;
  }
  function ws(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = Z.updateQueue, t === null ? (t = Sn(), Z.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
  }
  function Ws(l, t, a, u) {
    t.value = a, t.getSnapshot = u, Fs(t) && ks(l);
  }
  function $s(l, t, a) {
    return a(function() {
      Fs(t) && ks(l);
    });
  }
  function Fs(l) {
    var t = l.getSnapshot;
    l = l.value;
    try {
      var a = t();
      return !ht(l, a);
    } catch {
      return !0;
    }
  }
  function ks(l) {
    var t = Qa(l, 2);
    t !== null && dt(t, l, 2);
  }
  function ff(l) {
    var t = at();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), $a) {
        sa(!0);
        try {
          a();
        } finally {
          sa(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: It,
      lastRenderedState: l
    }, t;
  }
  function Is(l, t, a, u) {
    return l.baseState = a, ef(
      l,
      ml,
      typeof u == "function" ? u : It
    );
  }
  function kv(l, t, a, u, e) {
    if (Tn(l)) throw Error(v(485));
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
      S.T !== null ? a(!0) : n.isTransition = !1, u(n), a = t.pending, a === null ? (n.next = t.pending = n, Ps(t, n)) : (n.next = a.next, t.pending = a.next = n);
    }
  }
  function Ps(l, t) {
    var a = t.action, u = t.payload, e = l.state;
    if (t.isTransition) {
      var n = S.T, i = {};
      S.T = i;
      try {
        var f = a(e, u), c = S.S;
        c !== null && c(i, f), l0(l, t, f);
      } catch (m) {
        cf(l, t, m);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), S.T = n;
      }
    } else
      try {
        n = a(e, u), l0(l, t, n);
      } catch (m) {
        cf(l, t, m);
      }
  }
  function l0(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(u) {
        t0(l, t, u);
      },
      function(u) {
        return cf(l, t, u);
      }
    ) : t0(l, t, a);
  }
  function t0(l, t, a) {
    t.status = "fulfilled", t.value = a, a0(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, Ps(l, a)));
  }
  function cf(l, t, a) {
    var u = l.pending;
    if (l.pending = null, u !== null) {
      u = u.next;
      do
        t.status = "rejected", t.reason = a, a0(t), t = t.next;
      while (t !== u);
    }
    l.action = null;
  }
  function a0(l) {
    l = l.listeners;
    for (var t = 0; t < l.length; t++) (0, l[t])();
  }
  function u0(l, t) {
    return t;
  }
  function e0(l, t) {
    if (tl) {
      var a = gl.formState;
      if (a !== null) {
        l: {
          var u = Z;
          if (tl) {
            if (_l) {
              t: {
                for (var e = _l, n = Ut; e.nodeType !== 8; ) {
                  if (!n) {
                    e = null;
                    break t;
                  }
                  if (e = Rt(
                    e.nextSibling
                  ), e === null) {
                    e = null;
                    break t;
                  }
                }
                n = e.data, e = n === "F!" || n === "F" ? e : null;
              }
              if (e) {
                _l = Rt(
                  e.nextSibling
                ), u = e.data === "F!";
                break l;
              }
            }
            ma(u);
          }
          u = !1;
        }
        u && (t = a[0]);
      }
    }
    return a = at(), a.memoizedState = a.baseState = t, u = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: u0,
      lastRenderedState: t
    }, a.queue = u, a = _0.bind(
      null,
      Z,
      u
    ), u.dispatch = a, u = ff(!1), n = mf.bind(
      null,
      Z,
      !1,
      u.queue
    ), u = at(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, u.queue = e, a = kv.bind(
      null,
      Z,
      e,
      n,
      a
    ), e.dispatch = a, u.memoizedState = l, [t, a, !1];
  }
  function n0(l) {
    var t = ql();
    return i0(t, ml, l);
  }
  function i0(l, t, a) {
    if (t = ef(
      l,
      t,
      u0
    )[0], l = bn(It)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var u = ye(t);
      } catch (i) {
        throw i === Tu ? sn : i;
      }
    else u = t;
    t = ql();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (Z.flags |= 2048, pu(
      9,
      { destroy: void 0 },
      Iv.bind(null, e, a),
      null
    )), [u, n, l];
  }
  function Iv(l, t) {
    l.action = t;
  }
  function f0(l) {
    var t = ql(), a = ml;
    if (a !== null)
      return i0(t, a, l);
    ql(), t = t.memoizedState, a = ql();
    var u = a.queue.dispatch;
    return a.memoizedState = l, [t, u, !1];
  }
  function pu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = Z.updateQueue, t === null && (t = Sn(), Z.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function c0() {
    return ql().memoizedState;
  }
  function En(l, t, a, u) {
    var e = at();
    Z.flags |= l, e.memoizedState = pu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function zn(l, t, a, u) {
    var e = ql();
    u = u === void 0 ? null : u;
    var n = e.memoizedState.inst;
    ml !== null && u !== null && Ii(u, ml.memoizedState.deps) ? e.memoizedState = pu(t, n, a, u) : (Z.flags |= l, e.memoizedState = pu(
      1 | t,
      n,
      a,
      u
    ));
  }
  function s0(l, t) {
    En(8390656, 8, l, t);
  }
  function sf(l, t) {
    zn(2048, 8, l, t);
  }
  function Pv(l) {
    Z.flags |= 4;
    var t = Z.updateQueue;
    if (t === null)
      t = Sn(), Z.updateQueue = t, t.events = [l];
    else {
      var a = t.events;
      a === null ? t.events = [l] : a.push(l);
    }
  }
  function o0(l) {
    var t = ql().memoizedState;
    return Pv({ ref: t, nextImpl: l }), function() {
      if ((fl & 2) !== 0) throw Error(v(440));
      return t.impl.apply(void 0, arguments);
    };
  }
  function d0(l, t) {
    return zn(4, 2, l, t);
  }
  function v0(l, t) {
    return zn(4, 4, l, t);
  }
  function y0(l, t) {
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
  function m0(l, t, a) {
    a = a != null ? a.concat([l]) : null, zn(4, 4, y0.bind(null, t, l), a);
  }
  function of() {
  }
  function h0(l, t) {
    var a = ql();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && Ii(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function r0(l, t) {
    var a = ql();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    if (t !== null && Ii(t, u[1]))
      return u[0];
    if (u = l(), $a) {
      sa(!0);
      try {
        l();
      } finally {
        sa(!1);
      }
    }
    return a.memoizedState = [u, t], u;
  }
  function df(l, t, a) {
    return a === void 0 || (kt & 1073741824) !== 0 && (P & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = go(), Z.lanes |= l, _a |= l, a);
  }
  function S0(l, t, a, u) {
    return ht(a, t) ? a : Au.current !== null ? (l = df(l, a, u), ht(l, t) || (Gl = !0), l) : (kt & 42) === 0 || (kt & 1073741824) !== 0 && (P & 261930) === 0 ? (Gl = !0, l.memoizedState = a) : (l = go(), Z.lanes |= l, _a |= l, t);
  }
  function g0(l, t, a, u, e) {
    var n = O.p;
    O.p = n !== 0 && 8 > n ? n : 8;
    var i = S.T, f = {};
    S.T = f, mf(l, !1, t, a);
    try {
      var c = e(), m = S.S;
      if (m !== null && m(f, c), c !== null && typeof c == "object" && typeof c.then == "function") {
        var g = Wv(
          c,
          u
        );
        me(
          l,
          t,
          g,
          zt(l)
        );
      } else
        me(
          l,
          t,
          u,
          zt(l)
        );
    } catch (T) {
      me(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: T },
        zt()
      );
    } finally {
      O.p = n, i !== null && f.types !== null && (i.types = f.types), S.T = i;
    }
  }
  function ly() {
  }
  function vf(l, t, a, u) {
    if (l.tag !== 5) throw Error(v(476));
    var e = b0(l).queue;
    g0(
      l,
      e,
      t,
      B,
      a === null ? ly : function() {
        return E0(l), a(u);
      }
    );
  }
  function b0(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: B,
      baseState: B,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: It,
        lastRenderedState: B
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
        lastRenderedReducer: It,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function E0(l) {
    var t = b0(l);
    t.next === null && (t = l.alternate.memoizedState), me(
      l,
      t.next.queue,
      {},
      zt()
    );
  }
  function yf() {
    return Fl(Re);
  }
  function z0() {
    return ql().memoizedState;
  }
  function T0() {
    return ql().memoizedState;
  }
  function ty(l) {
    for (var t = l.return; t !== null; ) {
      switch (t.tag) {
        case 24:
        case 3:
          var a = zt();
          l = Sa(a);
          var u = ga(t, l, a);
          u !== null && (dt(u, t, a), se(u, t, a)), t = { cache: Xi() }, l.payload = t;
          return;
      }
      t = t.return;
    }
  }
  function ay(l, t, a) {
    var u = zt();
    a = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, Tn(l) ? A0(t, a) : (a = Ni(l, t, a, u), a !== null && (dt(a, l, u), O0(a, t, u)));
  }
  function _0(l, t, a) {
    var u = zt();
    me(l, t, a, u);
  }
  function me(l, t, a, u) {
    var e = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (Tn(l)) A0(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, f = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = f, ht(f, i))
            return tn(l, t, e, 0), gl === null && ln(), !1;
        } catch {
        } finally {
        }
      if (a = Ni(l, t, e, u), a !== null)
        return dt(a, l, u), O0(a, t, u), !0;
    }
    return !1;
  }
  function mf(l, t, a, u) {
    if (u = {
      lane: 2,
      revertLane: Jf(),
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, Tn(l)) {
      if (t) throw Error(v(479));
    } else
      t = Ni(
        l,
        a,
        u,
        2
      ), t !== null && dt(t, l, 2);
  }
  function Tn(l) {
    var t = l.alternate;
    return l === Z || t !== null && t === Z;
  }
  function A0(l, t) {
    Ou = hn = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function O0(l, t, a) {
    if ((a & 4194048) !== 0) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Nc(l, a);
    }
  }
  var he = {
    readContext: Fl,
    use: gn,
    useCallback: Rl,
    useContext: Rl,
    useEffect: Rl,
    useImperativeHandle: Rl,
    useLayoutEffect: Rl,
    useInsertionEffect: Rl,
    useMemo: Rl,
    useReducer: Rl,
    useRef: Rl,
    useState: Rl,
    useDebugValue: Rl,
    useDeferredValue: Rl,
    useTransition: Rl,
    useSyncExternalStore: Rl,
    useId: Rl,
    useHostTransitionStatus: Rl,
    useFormState: Rl,
    useActionState: Rl,
    useOptimistic: Rl,
    useMemoCache: Rl,
    useCacheRefresh: Rl
  };
  he.useEffectEvent = Rl;
  var M0 = {
    readContext: Fl,
    use: gn,
    useCallback: function(l, t) {
      return at().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Fl,
    useEffect: s0,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, En(
        4194308,
        4,
        y0.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return En(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      En(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = at();
      t = t === void 0 ? null : t;
      var u = l();
      if ($a) {
        sa(!0);
        try {
          l();
        } finally {
          sa(!1);
        }
      }
      return a.memoizedState = [u, t], u;
    },
    useReducer: function(l, t, a) {
      var u = at();
      if (a !== void 0) {
        var e = a(t);
        if ($a) {
          sa(!0);
          try {
            a(t);
          } finally {
            sa(!1);
          }
        }
      } else e = t;
      return u.memoizedState = u.baseState = e, l = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: l,
        lastRenderedState: e
      }, u.queue = l, l = l.dispatch = ay.bind(
        null,
        Z,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = at();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = ff(l);
      var t = l.queue, a = _0.bind(null, Z, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: of,
    useDeferredValue: function(l, t) {
      var a = at();
      return df(a, l, t);
    },
    useTransition: function() {
      var l = ff(!1);
      return l = g0.bind(
        null,
        Z,
        l.queue,
        !0,
        !1
      ), at().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = Z, e = at();
      if (tl) {
        if (a === void 0)
          throw Error(v(407));
        a = a();
      } else {
        if (a = t(), gl === null)
          throw Error(v(349));
        (P & 127) !== 0 || ws(u, t, a);
      }
      e.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return e.queue = n, s0($s.bind(null, u, n, l), [
        l
      ]), u.flags |= 2048, pu(
        9,
        { destroy: void 0 },
        Ws.bind(
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
      var l = at(), t = gl.identifierPrefix;
      if (tl) {
        var a = Qt, u = Gt;
        a = (u & ~(1 << 32 - mt(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = rn++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = $v++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: yf,
    useFormState: e0,
    useActionState: e0,
    useOptimistic: function(l) {
      var t = at();
      t.memoizedState = t.baseState = l;
      var a = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      return t.queue = a, t = mf.bind(
        null,
        Z,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: uf,
    useCacheRefresh: function() {
      return at().memoizedState = ty.bind(
        null,
        Z
      );
    },
    useEffectEvent: function(l) {
      var t = at(), a = { impl: l };
      return t.memoizedState = a, function() {
        if ((fl & 2) !== 0)
          throw Error(v(440));
        return a.impl.apply(void 0, arguments);
      };
    }
  }, hf = {
    readContext: Fl,
    use: gn,
    useCallback: h0,
    useContext: Fl,
    useEffect: sf,
    useImperativeHandle: m0,
    useInsertionEffect: d0,
    useLayoutEffect: v0,
    useMemo: r0,
    useReducer: bn,
    useRef: c0,
    useState: function() {
      return bn(It);
    },
    useDebugValue: of,
    useDeferredValue: function(l, t) {
      var a = ql();
      return S0(
        a,
        ml.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = bn(It)[0], t = ql().memoizedState;
      return [
        typeof l == "boolean" ? l : ye(l),
        t
      ];
    },
    useSyncExternalStore: Js,
    useId: z0,
    useHostTransitionStatus: yf,
    useFormState: n0,
    useActionState: n0,
    useOptimistic: function(l, t) {
      var a = ql();
      return Is(a, ml, l, t);
    },
    useMemoCache: uf,
    useCacheRefresh: T0
  };
  hf.useEffectEvent = o0;
  var p0 = {
    readContext: Fl,
    use: gn,
    useCallback: h0,
    useContext: Fl,
    useEffect: sf,
    useImperativeHandle: m0,
    useInsertionEffect: d0,
    useLayoutEffect: v0,
    useMemo: r0,
    useReducer: nf,
    useRef: c0,
    useState: function() {
      return nf(It);
    },
    useDebugValue: of,
    useDeferredValue: function(l, t) {
      var a = ql();
      return ml === null ? df(a, l, t) : S0(
        a,
        ml.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = nf(It)[0], t = ql().memoizedState;
      return [
        typeof l == "boolean" ? l : ye(l),
        t
      ];
    },
    useSyncExternalStore: Js,
    useId: z0,
    useHostTransitionStatus: yf,
    useFormState: f0,
    useActionState: f0,
    useOptimistic: function(l, t) {
      var a = ql();
      return ml !== null ? Is(a, ml, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: uf,
    useCacheRefresh: T0
  };
  p0.useEffectEvent = o0;
  function rf(l, t, a, u) {
    t = l.memoizedState, a = a(u, t), a = a == null ? t : C({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var Sf = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var u = zt(), e = Sa(u);
      e.payload = t, a != null && (e.callback = a), t = ga(l, e, u), t !== null && (dt(t, l, u), se(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = zt(), e = Sa(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = ga(l, e, u), t !== null && (dt(t, l, u), se(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = zt(), u = Sa(a);
      u.tag = 2, t != null && (u.callback = t), t = ga(l, u, a), t !== null && (dt(t, l, a), se(t, l, a));
    }
  };
  function D0(l, t, a, u, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(u, n, i) : t.prototype && t.prototype.isPureReactComponent ? !te(a, u) || !te(e, n) : !0;
  }
  function U0(l, t, a, u) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, u), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, u), t.state !== l && Sf.enqueueReplaceState(t, t.state, null);
  }
  function Fa(l, t) {
    var a = t;
    if ("ref" in t) {
      a = {};
      for (var u in t)
        u !== "ref" && (a[u] = t[u]);
    }
    if (l = l.defaultProps) {
      a === t && (a = C({}, a));
      for (var e in l)
        a[e] === void 0 && (a[e] = l[e]);
    }
    return a;
  }
  function N0(l) {
    Pe(l);
  }
  function R0(l) {
    console.error(l);
  }
  function H0(l) {
    Pe(l);
  }
  function _n(l, t) {
    try {
      var a = l.onUncaughtError;
      a(t.value, { componentStack: t.stack });
    } catch (u) {
      setTimeout(function() {
        throw u;
      });
    }
  }
  function C0(l, t, a) {
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
  function gf(l, t, a) {
    return a = Sa(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      _n(l, t);
    }, a;
  }
  function j0(l) {
    return l = Sa(l), l.tag = 3, l;
  }
  function q0(l, t, a, u) {
    var e = a.type.getDerivedStateFromError;
    if (typeof e == "function") {
      var n = u.value;
      l.payload = function() {
        return e(n);
      }, l.callback = function() {
        C0(t, a, u);
      };
    }
    var i = a.stateNode;
    i !== null && typeof i.componentDidCatch == "function" && (l.callback = function() {
      C0(t, a, u), typeof e != "function" && (Aa === null ? Aa = /* @__PURE__ */ new Set([this]) : Aa.add(this));
      var f = u.stack;
      this.componentDidCatch(u.value, {
        componentStack: f !== null ? f : ""
      });
    });
  }
  function uy(l, t, a, u, e) {
    if (a.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
      if (t = a.alternate, t !== null && bu(
        t,
        a,
        e,
        !0
      ), a = St.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
            return Nt === null ? qn() : a.alternate === null && Hl === 0 && (Hl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === on ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Lf(l, u, e)), !1;
          case 22:
            return a.flags |= 65536, u === on ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([u])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([u]) : a.add(u)), Lf(l, u, e)), !1;
        }
        throw Error(v(435, a.tag));
      }
      return Lf(l, u, e), qn(), !1;
    }
    if (tl)
      return t = St.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== Bi && (l = Error(v(422), { cause: u }), ee(Mt(l, a)))) : (u !== Bi && (t = Error(v(423), {
        cause: u
      }), ee(
        Mt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = Mt(u, a), e = gf(
        l.stateNode,
        u,
        e
      ), wi(l, e), Hl !== 4 && (Hl = 2)), !1;
    var n = Error(v(520), { cause: u });
    if (n = Mt(n, a), _e === null ? _e = [n] : _e.push(n), Hl !== 4 && (Hl = 2), t === null) return !0;
    u = Mt(u, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = e & -e, a.lanes |= l, l = gf(a.stateNode, u, l), wi(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (Aa === null || !Aa.has(n))))
            return a.flags |= 65536, e &= -e, a.lanes |= e, e = j0(e), q0(
              e,
              l,
              a,
              u
            ), wi(a, e), !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var bf = Error(v(461)), Gl = !1;
  function kl(l, t, a, u) {
    t.child = l === null ? Gs(t, null, a, u) : Wa(
      t,
      l.child,
      a,
      u
    );
  }
  function B0(l, t, a, u, e) {
    a = a.render;
    var n = t.ref;
    if ("ref" in u) {
      var i = {};
      for (var f in u)
        f !== "ref" && (i[f] = u[f]);
    } else i = u;
    return Va(t), u = Pi(
      l,
      t,
      a,
      i,
      n,
      e
    ), f = lf(), l !== null && !Gl ? (tf(l, t, e), Pt(l, t, e)) : (tl && f && ji(t), t.flags |= 1, kl(l, t, u, e), t.child);
  }
  function x0(l, t, a, u, e) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !Ri(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, Y0(
        l,
        t,
        n,
        u,
        e
      )) : (l = un(
        a.type,
        null,
        u,
        t,
        t.mode,
        e
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !pf(l, e)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : te, a(i, u) && l.ref === t.ref)
        return Pt(l, t, e);
    }
    return t.flags |= 1, l = wt(n, u), l.ref = t.ref, l.return = t, t.child = l;
  }
  function Y0(l, t, a, u, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (te(n, u) && l.ref === t.ref)
        if (Gl = !1, t.pendingProps = u = n, pf(l, e))
          (l.flags & 131072) !== 0 && (Gl = !0);
        else
          return t.lanes = l.lanes, Pt(l, t, e);
    }
    return Ef(
      l,
      t,
      a,
      u,
      e
    );
  }
  function G0(l, t, a, u) {
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
        return Q0(
          l,
          t,
          n,
          a,
          u
        );
      }
      if ((a & 536870912) !== 0)
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && cn(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? Zs(t, n) : $i(), Ls(t);
      else
        return u = t.lanes = 536870912, Q0(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (cn(t, n.cachePool), Zs(t, n), Ea(), t.memoizedState = null) : (l !== null && cn(t, null), $i(), Ea());
    return kl(l, t, e, a), t.child;
  }
  function re(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function Q0(l, t, a, u, e) {
    var n = Li();
    return n = n === null ? null : { parent: xl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && cn(t, null), $i(), Ls(t), l !== null && bu(l, t, u, !0), t.childLanes = e, null;
  }
  function An(l, t) {
    return t = Mn(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function X0(l, t, a) {
    return Wa(t, l.child, null, a), l = An(t, t.pendingProps), l.flags |= 2, gt(t), t.memoizedState = null, l;
  }
  function ey(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (tl) {
        if (u.mode === "hidden")
          return l = An(t, u), t.lanes = 536870912, re(null, l);
        if (ki(t), (l = _l) ? (l = ld(
          l,
          Ut
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: va !== null ? { id: Gt, overflow: Qt } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = As(l), a.return = t, t.child = a, $l = t, _l = null)) : l = null, l === null) throw ma(t);
        return t.lanes = 536870912, null;
      }
      return An(t, u);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (ki(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = X0(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(v(558));
      else if (Gl || bu(l, t, a, !1), e = (a & l.childLanes) !== 0, Gl || e) {
        if (u = gl, u !== null && (i = Rc(u, a), i !== 0 && i !== n.retryLane))
          throw n.retryLane = i, Qa(l, i), dt(u, l, i), bf;
        qn(), t = X0(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, _l = Rt(i.nextSibling), $l = t, tl = !0, ya = null, Ut = !1, l !== null && ps(t, l), t = An(t, u), t.flags |= 4096;
      return t;
    }
    return l = wt(l.child, {
      mode: u.mode,
      children: u.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function On(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(v(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function Ef(l, t, a, u, e) {
    return Va(t), a = Pi(
      l,
      t,
      a,
      u,
      void 0,
      e
    ), u = lf(), l !== null && !Gl ? (tf(l, t, e), Pt(l, t, e)) : (tl && u && ji(t), t.flags |= 1, kl(l, t, a, e), t.child);
  }
  function Z0(l, t, a, u, e, n) {
    return Va(t), t.updateQueue = null, a = Ks(
      t,
      u,
      a,
      e
    ), Vs(l), u = lf(), l !== null && !Gl ? (tf(l, t, n), Pt(l, t, n)) : (tl && u && ji(t), t.flags |= 1, kl(l, t, a, n), t.child);
  }
  function L0(l, t, a, u, e) {
    if (Va(t), t.stateNode === null) {
      var n = hu, i = a.contextType;
      typeof i == "object" && i !== null && (n = Fl(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = Sf, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, Ki(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Fl(i) : hu, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (rf(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && Sf.enqueueReplaceState(n, n.state, null), de(t, u, n, e), oe(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var f = t.memoizedProps, c = Fa(a, f);
      n.props = c;
      var m = n.context, g = a.contextType;
      i = hu, typeof g == "object" && g !== null && (i = Fl(g));
      var T = a.getDerivedStateFromProps;
      g = typeof T == "function" || typeof n.getSnapshotBeforeUpdate == "function", f = t.pendingProps !== f, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (f || m !== i) && U0(
        t,
        n,
        u,
        i
      ), ra = !1;
      var h = t.memoizedState;
      n.state = h, de(t, u, n, e), oe(), m = t.memoizedState, f || h !== m || ra ? (typeof T == "function" && (rf(
        t,
        a,
        T,
        u
      ), m = t.memoizedState), (c = ra || D0(
        t,
        a,
        c,
        u,
        h,
        m,
        i
      )) ? (g || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = u, t.memoizedState = m), n.props = u, n.state = m, n.context = i, u = c) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !1);
    } else {
      n = t.stateNode, Ji(l, t), i = t.memoizedProps, g = Fa(a, i), n.props = g, T = t.pendingProps, h = n.context, m = a.contextType, c = hu, typeof m == "object" && m !== null && (c = Fl(m)), f = a.getDerivedStateFromProps, (m = typeof f == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== T || h !== c) && U0(
        t,
        n,
        u,
        c
      ), ra = !1, h = t.memoizedState, n.state = h, de(t, u, n, e), oe();
      var r = t.memoizedState;
      i !== T || h !== r || ra || l !== null && l.dependencies !== null && nn(l.dependencies) ? (typeof f == "function" && (rf(
        t,
        a,
        f,
        u
      ), r = t.memoizedState), (g = ra || D0(
        t,
        a,
        g,
        u,
        h,
        r,
        c
      ) || l !== null && l.dependencies !== null && nn(l.dependencies)) ? (m || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(u, r, c), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        u,
        r,
        c
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 1024), t.memoizedProps = u, t.memoizedState = r), n.props = u, n.state = r, n.context = c, u = g) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 1024), u = !1);
    }
    return n = u, On(l, t), u = (t.flags & 128) !== 0, n || u ? (n = t.stateNode, a = u && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && u ? (t.child = Wa(
      t,
      l.child,
      null,
      e
    ), t.child = Wa(
      t,
      null,
      a,
      e
    )) : kl(l, t, a, e), t.memoizedState = n.state, l = t.child) : l = Pt(
      l,
      t,
      e
    ), l;
  }
  function V0(l, t, a, u) {
    return Za(), t.flags |= 256, kl(l, t, a, u), t.child;
  }
  var zf = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function Tf(l) {
    return { baseLanes: l, cachePool: Cs() };
  }
  function _f(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= Et), l;
  }
  function K0(l, t, a) {
    var u = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (jl.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (tl) {
        if (e ? ba(t) : Ea(), (l = _l) ? (l = ld(
          l,
          Ut
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: va !== null ? { id: Gt, overflow: Qt } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = As(l), a.return = t, t.child = a, $l = t, _l = null)) : l = null, l === null) throw ma(t);
        return nc(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      var f = u.children;
      return u = u.fallback, e ? (Ea(), e = t.mode, f = Mn(
        { mode: "hidden", children: f },
        e
      ), u = Xa(
        u,
        e,
        a,
        null
      ), f.return = t, u.return = t, f.sibling = u, t.child = f, u = t.child, u.memoizedState = Tf(a), u.childLanes = _f(
        l,
        i,
        a
      ), t.memoizedState = zf, re(null, u)) : (ba(t), Af(t, f));
    }
    var c = l.memoizedState;
    if (c !== null && (f = c.dehydrated, f !== null)) {
      if (n)
        t.flags & 256 ? (ba(t), t.flags &= -257, t = Of(
          l,
          t,
          a
        )) : t.memoizedState !== null ? (Ea(), t.child = l.child, t.flags |= 128, t = null) : (Ea(), f = u.fallback, e = t.mode, u = Mn(
          { mode: "visible", children: u.children },
          e
        ), f = Xa(
          f,
          e,
          a,
          null
        ), f.flags |= 2, u.return = t, f.return = t, u.sibling = f, t.child = u, Wa(
          t,
          l.child,
          null,
          a
        ), u = t.child, u.memoizedState = Tf(a), u.childLanes = _f(
          l,
          i,
          a
        ), t.memoizedState = zf, t = re(null, u));
      else if (ba(t), nc(f)) {
        if (i = f.nextSibling && f.nextSibling.dataset, i) var m = i.dgst;
        i = m, u = Error(v(419)), u.stack = "", u.digest = i, ee({ value: u, source: null, stack: null }), t = Of(
          l,
          t,
          a
        );
      } else if (Gl || bu(l, t, a, !1), i = (a & l.childLanes) !== 0, Gl || i) {
        if (i = gl, i !== null && (u = Rc(i, a), u !== 0 && u !== c.retryLane))
          throw c.retryLane = u, Qa(l, u), dt(i, l, u), bf;
        ec(f) || qn(), t = Of(
          l,
          t,
          a
        );
      } else
        ec(f) ? (t.flags |= 192, t.child = l.child, t = null) : (l = c.treeContext, _l = Rt(
          f.nextSibling
        ), $l = t, tl = !0, ya = null, Ut = !1, l !== null && ps(t, l), t = Af(
          t,
          u.children
        ), t.flags |= 4096);
      return t;
    }
    return e ? (Ea(), f = u.fallback, e = t.mode, c = l.child, m = c.sibling, u = wt(c, {
      mode: "hidden",
      children: u.children
    }), u.subtreeFlags = c.subtreeFlags & 65011712, m !== null ? f = wt(
      m,
      f
    ) : (f = Xa(
      f,
      e,
      a,
      null
    ), f.flags |= 2), f.return = t, u.return = t, u.sibling = f, t.child = u, re(null, u), u = t.child, f = l.child.memoizedState, f === null ? f = Tf(a) : (e = f.cachePool, e !== null ? (c = xl._currentValue, e = e.parent !== c ? { parent: c, pool: c } : e) : e = Cs(), f = {
      baseLanes: f.baseLanes | a,
      cachePool: e
    }), u.memoizedState = f, u.childLanes = _f(
      l,
      i,
      a
    ), t.memoizedState = zf, re(l.child, u)) : (ba(t), a = l.child, l = a.sibling, a = wt(a, {
      mode: "visible",
      children: u.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function Af(l, t) {
    return t = Mn(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function Mn(l, t) {
    return l = rt(22, l, null, t), l.lanes = 0, l;
  }
  function Of(l, t, a) {
    return Wa(t, l.child, null, a), l = Af(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function J0(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), Gi(l.return, t, a);
  }
  function Mf(l, t, a, u, e, n) {
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
  function w0(l, t, a) {
    var u = t.pendingProps, e = u.revealOrder, n = u.tail;
    u = u.children;
    var i = jl.current, f = (i & 2) !== 0;
    if (f ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, p(jl, i), kl(l, t, u, a), u = tl ? ue : 0, !f && l !== null && (l.flags & 128) !== 0)
      l: for (l = t.child; l !== null; ) {
        if (l.tag === 13)
          l.memoizedState !== null && J0(l, a, t);
        else if (l.tag === 19)
          J0(l, a, t);
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
          l = a.alternate, l !== null && mn(l) === null && (e = a), a = a.sibling;
        a = e, a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null), Mf(
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
          if (l = e.alternate, l !== null && mn(l) === null) {
            t.child = e;
            break;
          }
          l = e.sibling, e.sibling = a, a = e, e = l;
        }
        Mf(
          t,
          !0,
          a,
          null,
          n,
          u
        );
        break;
      case "together":
        Mf(
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
  function Pt(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), _a |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (bu(
          l,
          t,
          a,
          !1
        ), (a & t.childLanes) === 0)
          return null;
      } else return null;
    if (l !== null && t.child !== l.child)
      throw Error(v(153));
    if (t.child !== null) {
      for (l = t.child, a = wt(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = wt(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function pf(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && nn(l)));
  }
  function ny(l, t, a) {
    switch (t.tag) {
      case 3:
        yl(t, t.stateNode.containerInfo), ha(t, xl, l.memoizedState.cache), Za();
        break;
      case 27:
      case 5:
        ca(t);
        break;
      case 4:
        yl(t, t.stateNode.containerInfo);
        break;
      case 10:
        ha(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, ki(t), null;
        break;
      case 13:
        var u = t.memoizedState;
        if (u !== null)
          return u.dehydrated !== null ? (ba(t), t.flags |= 128, null) : (a & t.child.childLanes) !== 0 ? K0(l, t, a) : (ba(t), l = Pt(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        ba(t);
        break;
      case 19:
        var e = (l.flags & 128) !== 0;
        if (u = (a & t.childLanes) !== 0, u || (bu(
          l,
          t,
          a,
          !1
        ), u = (a & t.childLanes) !== 0), e) {
          if (u)
            return w0(
              l,
              t,
              a
            );
          t.flags |= 128;
        }
        if (e = t.memoizedState, e !== null && (e.rendering = null, e.tail = null, e.lastEffect = null), p(jl, jl.current), u) break;
        return null;
      case 22:
        return t.lanes = 0, G0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        ha(t, xl, l.memoizedState.cache);
    }
    return Pt(l, t, a);
  }
  function W0(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        Gl = !0;
      else {
        if (!pf(l, a) && (t.flags & 128) === 0)
          return Gl = !1, ny(
            l,
            t,
            a
          );
        Gl = (l.flags & 131072) !== 0;
      }
    else
      Gl = !1, tl && (t.flags & 1048576) !== 0 && Ms(t, ue, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var u = t.pendingProps;
          if (l = Ja(t.elementType), t.type = l, typeof l == "function")
            Ri(l) ? (u = Fa(l, u), t.tag = 1, t = L0(
              null,
              t,
              l,
              u,
              a
            )) : (t.tag = 0, t = Ef(
              null,
              t,
              l,
              u,
              a
            ));
          else {
            if (l != null) {
              var e = l.$$typeof;
              if (e === El) {
                t.tag = 11, t = B0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === V) {
                t.tag = 14, t = x0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              }
            }
            throw t = bl(l) || l, Error(v(306, t, ""));
          }
        }
        return t;
      case 0:
        return Ef(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 1:
        return u = t.type, e = Fa(
          u,
          t.pendingProps
        ), L0(
          l,
          t,
          u,
          e,
          a
        );
      case 3:
        l: {
          if (yl(
            t,
            t.stateNode.containerInfo
          ), l === null) throw Error(v(387));
          u = t.pendingProps;
          var n = t.memoizedState;
          e = n.element, Ji(l, t), de(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, ha(t, xl, u), u !== n.cache && Qi(
            t,
            [xl],
            a,
            !0
          ), oe(), u = i.element, n.isDehydrated)
            if (n = {
              element: u,
              isDehydrated: !1,
              cache: i.cache
            }, t.updateQueue.baseState = n, t.memoizedState = n, t.flags & 256) {
              t = V0(
                l,
                t,
                u,
                a
              );
              break l;
            } else if (u !== e) {
              e = Mt(
                Error(v(424)),
                t
              ), ee(e), t = V0(
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
              for (_l = Rt(l.firstChild), $l = t, tl = !0, ya = null, Ut = !0, a = Gs(
                t,
                null,
                u,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 4096, a = a.sibling;
            }
          else {
            if (Za(), u === e) {
              t = Pt(
                l,
                t,
                a
              );
              break l;
            }
            kl(l, t, u, a);
          }
          t = t.child;
        }
        return t;
      case 26:
        return On(l, t), l === null ? (a = id(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : tl || (a = t.type, l = t.pendingProps, u = Zn(
          w.current
        ).createElement(a), u[Wl] = t, u[nt] = l, Il(u, a, l), Kl(u), t.stateNode = u) : t.memoizedState = id(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return ca(t), l === null && tl && (u = t.stateNode = ud(
          t.type,
          t.pendingProps,
          w.current
        ), $l = t, Ut = !0, e = _l, Da(t.type) ? (ic = e, _l = Rt(u.firstChild)) : _l = e), kl(
          l,
          t,
          t.pendingProps.children,
          a
        ), On(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && tl && ((e = u = _l) && (u = qy(
          u,
          t.type,
          t.pendingProps,
          Ut
        ), u !== null ? (t.stateNode = u, $l = t, _l = Rt(u.firstChild), Ut = !1, e = !0) : e = !1), e || ma(t)), ca(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, tc(e, n) ? u = null : i !== null && tc(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = Pi(
          l,
          t,
          Fv,
          null,
          null,
          a
        ), Re._currentValue = e), On(l, t), kl(l, t, u, a), t.child;
      case 6:
        return l === null && tl && ((l = a = _l) && (a = By(
          a,
          t.pendingProps,
          Ut
        ), a !== null ? (t.stateNode = a, $l = t, _l = null, l = !0) : l = !1), l || ma(t)), null;
      case 13:
        return K0(l, t, a);
      case 4:
        return yl(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = Wa(
          t,
          null,
          u,
          a
        ) : kl(l, t, u, a), t.child;
      case 11:
        return B0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 7:
        return kl(
          l,
          t,
          t.pendingProps,
          a
        ), t.child;
      case 8:
        return kl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 12:
        return kl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 10:
        return u = t.pendingProps, ha(t, t.type, u.value), kl(l, t, u.children, a), t.child;
      case 9:
        return e = t.type._context, u = t.pendingProps.children, Va(t), e = Fl(e), u = u(e), t.flags |= 1, kl(l, t, u, a), t.child;
      case 14:
        return x0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 15:
        return Y0(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 19:
        return w0(l, t, a);
      case 31:
        return ey(l, t, a);
      case 22:
        return G0(
          l,
          t,
          a,
          t.pendingProps
        );
      case 24:
        return Va(t), u = Fl(xl), l === null ? (e = Li(), e === null && (e = gl, n = Xi(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, Ki(t), ha(t, xl, e)) : ((l.lanes & a) !== 0 && (Ji(l, t), de(t, null, null, a), oe()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), ha(t, xl, u)) : (u = n.cache, ha(t, xl, u), u !== e.cache && Qi(
          t,
          [xl],
          a,
          !0
        ))), kl(
          l,
          t,
          t.pendingProps.children,
          a
        ), t.child;
      case 29:
        throw t.pendingProps;
    }
    throw Error(v(156, t.tag));
  }
  function la(l) {
    l.flags |= 4;
  }
  function Df(l, t, a, u, e) {
    if ((t = (l.mode & 32) !== 0) && (t = !1), t) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (To()) l.flags |= 8192;
        else
          throw wa = on, Vi;
    } else l.flags &= -16777217;
  }
  function $0(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !dd(t))
      if (To()) l.flags |= 8192;
      else
        throw wa = on, Vi;
  }
  function pn(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? Dc() : 536870912, l.lanes |= t, Ru |= t);
  }
  function Se(l, t) {
    if (!tl)
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
  function Al(l) {
    var t = l.alternate !== null && l.alternate.child === l.child, a = 0, u = 0;
    if (t)
      for (var e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags & 65011712, u |= e.flags & 65011712, e.return = l, e = e.sibling;
    else
      for (e = l.child; e !== null; )
        a |= e.lanes | e.childLanes, u |= e.subtreeFlags, u |= e.flags, e.return = l, e = e.sibling;
    return l.subtreeFlags |= u, l.childLanes = a, t;
  }
  function iy(l, t, a) {
    var u = t.pendingProps;
    switch (qi(t), t.tag) {
      case 16:
      case 15:
      case 0:
      case 11:
      case 7:
      case 8:
      case 12:
      case 9:
      case 14:
        return Al(t), null;
      case 1:
        return Al(t), null;
      case 3:
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), Ft(xl), pl(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (gu(t) ? la(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, xi())), Al(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (la(t), n !== null ? (Al(t), $0(t, n)) : (Al(t), Df(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (la(t), Al(t), $0(t, n)) : (Al(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && la(t), Al(t), Df(
          t,
          e,
          l,
          u,
          a
        )), null;
      case 27:
        if (ja(t), a = w.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && la(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(v(166));
            return Al(t), null;
          }
          l = D.current, gu(t) ? Ds(t) : (l = ud(e, u, a), t.stateNode = l, la(t));
        }
        return Al(t), null;
      case 5:
        if (ja(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && la(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(v(166));
            return Al(t), null;
          }
          if (n = D.current, gu(t))
            Ds(t);
          else {
            var i = Zn(
              w.current
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
            n[Wl] = t, n[nt] = u;
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
            l: switch (Il(n, e, u), e) {
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
            u && la(t);
          }
        }
        return Al(t), Df(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          a
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== u && la(t);
        else {
          if (typeof u != "string" && t.stateNode === null)
            throw Error(v(166));
          if (l = w.current, gu(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = $l, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[Wl] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || Jo(l.nodeValue, a)), l || ma(t, !0);
          } else
            l = Zn(l).createTextNode(
              u
            ), l[Wl] = t, t.stateNode = l;
        }
        return Al(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = gu(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(v(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(v(557));
              l[Wl] = t;
            } else
              Za(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Al(t), l = !1;
          } else
            a = xi(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (gt(t), t) : (gt(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(v(558));
        }
        return Al(t), null;
      case 13:
        if (u = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = gu(t), u !== null && u.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(v(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(v(317));
              e[Wl] = t;
            } else
              Za(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Al(t), e = !1;
          } else
            e = xi(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (gt(t), t) : (gt(t), null);
        }
        return gt(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), pn(t, t.updateQueue), Al(t), null);
      case 4:
        return pl(), l === null && Ff(t.stateNode.containerInfo), Al(t), null;
      case 10:
        return Ft(t.type), Al(t), null;
      case 19:
        if (z(jl), u = t.memoizedState, u === null) return Al(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) Se(u, !1);
          else {
            if (Hl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = mn(l), n !== null) {
                  for (t.flags |= 128, Se(u, !1), l = n.updateQueue, t.updateQueue = l, pn(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    _s(a, l), a = a.sibling;
                  return p(
                    jl,
                    jl.current & 1 | 2
                  ), tl && Wt(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && Tl() > Hn && (t.flags |= 128, e = !0, Se(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = mn(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, pn(t, l), Se(u, !0), u.tail === null && u.tailMode === "hidden" && !n.alternate && !tl)
                return Al(t), null;
            } else
              2 * Tl() - u.renderingStartTime > Hn && a !== 536870912 && (t.flags |= 128, e = !0, Se(u, !1), t.lanes = 4194304);
          u.isBackwards ? (n.sibling = t.child, t.child = n) : (l = u.last, l !== null ? l.sibling = n : t.child = n, u.last = n);
        }
        return u.tail !== null ? (l = u.tail, u.rendering = l, u.tail = l.sibling, u.renderingStartTime = Tl(), l.sibling = null, a = jl.current, p(
          jl,
          e ? a & 1 | 2 : a & 1
        ), tl && Wt(t, u.treeForkCount), l) : (Al(t), null);
      case 22:
      case 23:
        return gt(t), Fi(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (Al(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Al(t), a = t.updateQueue, a !== null && pn(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && z(Ka), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), Ft(xl), Al(t), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(v(156, t.tag));
  }
  function fy(l, t) {
    switch (qi(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return Ft(xl), pl(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return ja(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (gt(t), t.alternate === null)
            throw Error(v(340));
          Za();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (gt(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(v(340));
          Za();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return z(jl), null;
      case 4:
        return pl(), null;
      case 10:
        return Ft(t.type), null;
      case 22:
      case 23:
        return gt(t), Fi(), l !== null && z(Ka), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return Ft(xl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function F0(l, t) {
    switch (qi(t), t.tag) {
      case 3:
        Ft(xl), pl();
        break;
      case 26:
      case 27:
      case 5:
        ja(t);
        break;
      case 4:
        pl();
        break;
      case 31:
        t.memoizedState !== null && gt(t);
        break;
      case 13:
        gt(t);
        break;
      case 19:
        z(jl);
        break;
      case 10:
        Ft(t.type);
        break;
      case 22:
      case 23:
        gt(t), Fi(), l !== null && z(Ka);
        break;
      case 24:
        Ft(xl);
    }
  }
  function ge(l, t) {
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
      dl(t, t.return, f);
    }
  }
  function za(l, t, a) {
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
              var c = a, m = f;
              try {
                m();
              } catch (g) {
                dl(
                  e,
                  c,
                  g
                );
              }
            }
          }
          u = u.next;
        } while (u !== n);
      }
    } catch (g) {
      dl(t, t.return, g);
    }
  }
  function k0(l) {
    var t = l.updateQueue;
    if (t !== null) {
      var a = l.stateNode;
      try {
        Xs(t, a);
      } catch (u) {
        dl(l, l.return, u);
      }
    }
  }
  function I0(l, t, a) {
    a.props = Fa(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (u) {
      dl(l, t, u);
    }
  }
  function be(l, t) {
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
      dl(l, t, e);
    }
  }
  function Xt(l, t) {
    var a = l.ref, u = l.refCleanup;
    if (a !== null)
      if (typeof u == "function")
        try {
          u();
        } catch (e) {
          dl(l, t, e);
        } finally {
          l.refCleanup = null, l = l.alternate, l != null && (l.refCleanup = null);
        }
      else if (typeof a == "function")
        try {
          a(null);
        } catch (e) {
          dl(l, t, e);
        }
      else a.current = null;
  }
  function P0(l) {
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
      dl(l, l.return, e);
    }
  }
  function Uf(l, t, a) {
    try {
      var u = l.stateNode;
      Uy(u, l.type, a, t), u[nt] = t;
    } catch (e) {
      dl(l, l.return, e);
    }
  }
  function lo(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && Da(l.type) || l.tag === 4;
  }
  function Nf(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || lo(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && Da(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function Rf(l, t, a) {
    var u = l.tag;
    if (u === 5 || u === 6)
      l = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(l, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(l), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = Kt));
    else if (u !== 4 && (u === 27 && Da(l.type) && (a = l.stateNode, t = null), l = l.child, l !== null))
      for (Rf(l, t, a), l = l.sibling; l !== null; )
        Rf(l, t, a), l = l.sibling;
  }
  function Dn(l, t, a) {
    var u = l.tag;
    if (u === 5 || u === 6)
      l = l.stateNode, t ? a.insertBefore(l, t) : a.appendChild(l);
    else if (u !== 4 && (u === 27 && Da(l.type) && (a = l.stateNode), l = l.child, l !== null))
      for (Dn(l, t, a), l = l.sibling; l !== null; )
        Dn(l, t, a), l = l.sibling;
  }
  function to(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var u = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      Il(t, u, a), t[Wl] = l, t[nt] = a;
    } catch (n) {
      dl(l, l.return, n);
    }
  }
  var ta = !1, Ql = !1, Hf = !1, ao = typeof WeakSet == "function" ? WeakSet : Set, Jl = null;
  function cy(l, t) {
    if (l = l.containerInfo, Pf = $n, l = ms(l), Ai(l)) {
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
            var i = 0, f = -1, c = -1, m = 0, g = 0, T = l, h = null;
            t: for (; ; ) {
              for (var r; T !== a || e !== 0 && T.nodeType !== 3 || (f = i + e), T !== n || u !== 0 && T.nodeType !== 3 || (c = i + u), T.nodeType === 3 && (i += T.nodeValue.length), (r = T.firstChild) !== null; )
                h = T, T = r;
              for (; ; ) {
                if (T === l) break t;
                if (h === a && ++m === e && (f = i), h === n && ++g === u && (c = i), (r = T.nextSibling) !== null) break;
                T = h, h = T.parentNode;
              }
              T = r;
            }
            a = f === -1 || c === -1 ? null : { start: f, end: c };
          } else a = null;
        }
      a = a || { start: 0, end: 0 };
    } else a = null;
    for (lc = { focusedElem: l, selectionRange: a }, $n = !1, Jl = t; Jl !== null; )
      if (t = Jl, l = t.child, (t.subtreeFlags & 1028) !== 0 && l !== null)
        l.return = t, Jl = l;
      else
        for (; Jl !== null; ) {
          switch (t = Jl, n = t.alternate, l = t.flags, t.tag) {
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
                  var N = Fa(
                    a.type,
                    e
                  );
                  l = u.getSnapshotBeforeUpdate(
                    N,
                    n
                  ), u.__reactInternalSnapshotBeforeUpdate = l;
                } catch (Y) {
                  dl(
                    a,
                    a.return,
                    Y
                  );
                }
              }
              break;
            case 3:
              if ((l & 1024) !== 0) {
                if (l = t.stateNode.containerInfo, a = l.nodeType, a === 9)
                  uc(l);
                else if (a === 1)
                  switch (l.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      uc(l);
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
              if ((l & 1024) !== 0) throw Error(v(163));
          }
          if (l = t.sibling, l !== null) {
            l.return = t.return, Jl = l;
            break;
          }
          Jl = t.return;
        }
  }
  function uo(l, t, a) {
    var u = a.flags;
    switch (a.tag) {
      case 0:
      case 11:
      case 15:
        ua(l, a), u & 4 && ge(5, a);
        break;
      case 1:
        if (ua(l, a), u & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              dl(a, a.return, i);
            }
          else {
            var e = Fa(
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
              dl(
                a,
                a.return,
                i
              );
            }
          }
        u & 64 && k0(a), u & 512 && be(a, a.return);
        break;
      case 3:
        if (ua(l, a), u & 64 && (l = a.updateQueue, l !== null)) {
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
            Xs(l, t);
          } catch (i) {
            dl(a, a.return, i);
          }
        }
        break;
      case 27:
        t === null && u & 4 && to(a);
      case 26:
      case 5:
        ua(l, a), t === null && u & 4 && P0(a), u & 512 && be(a, a.return);
        break;
      case 12:
        ua(l, a);
        break;
      case 31:
        ua(l, a), u & 4 && io(l, a);
        break;
      case 13:
        ua(l, a), u & 4 && fo(l, a), u & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = Sy.bind(
          null,
          a
        ), xy(l, a))));
        break;
      case 22:
        if (u = a.memoizedState !== null || ta, !u) {
          t = t !== null && t.memoizedState !== null || Ql, e = ta;
          var n = Ql;
          ta = u, (Ql = t) && !n ? ea(
            l,
            a,
            (a.subtreeFlags & 8772) !== 0
          ) : ua(l, a), ta = e, Ql = n;
        }
        break;
      case 30:
        break;
      default:
        ua(l, a);
    }
  }
  function eo(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, eo(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && fi(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var Dl = null, ft = !1;
  function aa(l, t, a) {
    for (a = a.child; a !== null; )
      no(l, t, a), a = a.sibling;
  }
  function no(l, t, a) {
    if (yt && typeof yt.onCommitFiberUnmount == "function")
      try {
        yt.onCommitFiberUnmount(Lu, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        Ql || Xt(a, t), aa(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        Ql || Xt(a, t);
        var u = Dl, e = ft;
        Da(a.type) && (Dl = a.stateNode, ft = !1), aa(
          l,
          t,
          a
        ), De(a.stateNode), Dl = u, ft = e;
        break;
      case 5:
        Ql || Xt(a, t);
      case 6:
        if (u = Dl, e = ft, Dl = null, aa(
          l,
          t,
          a
        ), Dl = u, ft = e, Dl !== null)
          if (ft)
            try {
              (Dl.nodeType === 9 ? Dl.body : Dl.nodeName === "HTML" ? Dl.ownerDocument.body : Dl).removeChild(a.stateNode);
            } catch (n) {
              dl(
                a,
                t,
                n
              );
            }
          else
            try {
              Dl.removeChild(a.stateNode);
            } catch (n) {
              dl(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        Dl !== null && (ft ? (l = Dl, Io(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), Gu(l)) : Io(Dl, a.stateNode));
        break;
      case 4:
        u = Dl, e = ft, Dl = a.stateNode.containerInfo, ft = !0, aa(
          l,
          t,
          a
        ), Dl = u, ft = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        za(2, a, t), Ql || za(4, a, t), aa(
          l,
          t,
          a
        );
        break;
      case 1:
        Ql || (Xt(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && I0(
          a,
          t,
          u
        )), aa(
          l,
          t,
          a
        );
        break;
      case 21:
        aa(
          l,
          t,
          a
        );
        break;
      case 22:
        Ql = (u = Ql) || a.memoizedState !== null, aa(
          l,
          t,
          a
        ), Ql = u;
        break;
      default:
        aa(
          l,
          t,
          a
        );
    }
  }
  function io(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null))) {
      l = l.dehydrated;
      try {
        Gu(l);
      } catch (a) {
        dl(t, t.return, a);
      }
    }
  }
  function fo(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        Gu(l);
      } catch (a) {
        dl(t, t.return, a);
      }
  }
  function sy(l) {
    switch (l.tag) {
      case 31:
      case 13:
      case 19:
        var t = l.stateNode;
        return t === null && (t = l.stateNode = new ao()), t;
      case 22:
        return l = l.stateNode, t = l._retryCache, t === null && (t = l._retryCache = new ao()), t;
      default:
        throw Error(v(435, l.tag));
    }
  }
  function Un(l, t) {
    var a = sy(l);
    t.forEach(function(u) {
      if (!a.has(u)) {
        a.add(u);
        var e = gy.bind(null, l, u);
        u.then(e, e);
      }
    });
  }
  function ct(l, t) {
    var a = t.deletions;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u], n = l, i = t, f = i;
        l: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if (Da(f.type)) {
                Dl = f.stateNode, ft = !1;
                break l;
              }
              break;
            case 5:
              Dl = f.stateNode, ft = !1;
              break l;
            case 3:
            case 4:
              Dl = f.stateNode.containerInfo, ft = !0;
              break l;
          }
          f = f.return;
        }
        if (Dl === null) throw Error(v(160));
        no(n, i, e), Dl = null, ft = !1, n = e.alternate, n !== null && (n.return = null), e.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        co(t, l), t = t.sibling;
  }
  var qt = null;
  function co(l, t) {
    var a = l.alternate, u = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        ct(t, l), st(l), u & 4 && (za(3, l, l.return), ge(3, l), za(5, l, l.return));
        break;
      case 1:
        ct(t, l), st(l), u & 512 && (Ql || a === null || Xt(a, a.return)), u & 64 && ta && (l = l.updateQueue, l !== null && (u = l.callbacks, u !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? u : a.concat(u))));
        break;
      case 26:
        var e = qt;
        if (ct(t, l), st(l), u & 512 && (Ql || a === null || Xt(a, a.return)), u & 4) {
          var n = a !== null ? a.memoizedState : null;
          if (u = l.memoizedState, a === null)
            if (u === null)
              if (l.stateNode === null) {
                l: {
                  u = l.type, a = l.memoizedProps, e = e.ownerDocument || e;
                  t: switch (u) {
                    case "title":
                      n = e.getElementsByTagName("title")[0], (!n || n[Ju] || n[Wl] || n.namespaceURI === "http://www.w3.org/2000/svg" || n.hasAttribute("itemprop")) && (n = e.createElement(u), e.head.insertBefore(
                        n,
                        e.querySelector("head > title")
                      )), Il(n, u, a), n[Wl] = l, Kl(n), u = n;
                      break l;
                    case "link":
                      var i = sd(
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
                      n = e.createElement(u), Il(n, u, a), e.head.appendChild(n);
                      break;
                    case "meta":
                      if (i = sd(
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
                      n = e.createElement(u), Il(n, u, a), e.head.appendChild(n);
                      break;
                    default:
                      throw Error(v(468, u));
                  }
                  n[Wl] = l, Kl(n), u = n;
                }
                l.stateNode = u;
              } else
                od(
                  e,
                  l.type,
                  l.stateNode
                );
            else
              l.stateNode = cd(
                e,
                u,
                l.memoizedProps
              );
          else
            n !== u ? (n === null ? a.stateNode !== null && (a = a.stateNode, a.parentNode.removeChild(a)) : n.count--, u === null ? od(
              e,
              l.type,
              l.stateNode
            ) : cd(
              e,
              u,
              l.memoizedProps
            )) : u === null && l.stateNode !== null && Uf(
              l,
              l.memoizedProps,
              a.memoizedProps
            );
        }
        break;
      case 27:
        ct(t, l), st(l), u & 512 && (Ql || a === null || Xt(a, a.return)), a !== null && u & 4 && Uf(
          l,
          l.memoizedProps,
          a.memoizedProps
        );
        break;
      case 5:
        if (ct(t, l), st(l), u & 512 && (Ql || a === null || Xt(a, a.return)), l.flags & 32) {
          e = l.stateNode;
          try {
            cu(e, "");
          } catch (N) {
            dl(l, l.return, N);
          }
        }
        u & 4 && l.stateNode != null && (e = l.memoizedProps, Uf(
          l,
          e,
          a !== null ? a.memoizedProps : e
        )), u & 1024 && (Hf = !0);
        break;
      case 6:
        if (ct(t, l), st(l), u & 4) {
          if (l.stateNode === null)
            throw Error(v(162));
          u = l.memoizedProps, a = l.stateNode;
          try {
            a.nodeValue = u;
          } catch (N) {
            dl(l, l.return, N);
          }
        }
        break;
      case 3:
        if (Kn = null, e = qt, qt = Ln(t.containerInfo), ct(t, l), qt = e, st(l), u & 4 && a !== null && a.memoizedState.isDehydrated)
          try {
            Gu(t.containerInfo);
          } catch (N) {
            dl(l, l.return, N);
          }
        Hf && (Hf = !1, so(l));
        break;
      case 4:
        u = qt, qt = Ln(
          l.stateNode.containerInfo
        ), ct(t, l), st(l), qt = u;
        break;
      case 12:
        ct(t, l), st(l);
        break;
      case 31:
        ct(t, l), st(l), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, Un(l, u)));
        break;
      case 13:
        ct(t, l), st(l), l.child.flags & 8192 && l.memoizedState !== null != (a !== null && a.memoizedState !== null) && (Rn = Tl()), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, Un(l, u)));
        break;
      case 22:
        e = l.memoizedState !== null;
        var c = a !== null && a.memoizedState !== null, m = ta, g = Ql;
        if (ta = m || e, Ql = g || c, ct(t, l), Ql = g, ta = m, st(l), u & 8192)
          l: for (t = l.stateNode, t._visibility = e ? t._visibility & -2 : t._visibility | 1, e && (a === null || c || ta || Ql || ka(l)), a = null, t = l; ; ) {
            if (t.tag === 5 || t.tag === 26) {
              if (a === null) {
                c = a = t;
                try {
                  if (n = c.stateNode, e)
                    i = n.style, typeof i.setProperty == "function" ? i.setProperty("display", "none", "important") : i.display = "none";
                  else {
                    f = c.stateNode;
                    var T = c.memoizedProps.style, h = T != null && T.hasOwnProperty("display") ? T.display : null;
                    f.style.display = h == null || typeof h == "boolean" ? "" : ("" + h).trim();
                  }
                } catch (N) {
                  dl(c, c.return, N);
                }
              }
            } else if (t.tag === 6) {
              if (a === null) {
                c = t;
                try {
                  c.stateNode.nodeValue = e ? "" : c.memoizedProps;
                } catch (N) {
                  dl(c, c.return, N);
                }
              }
            } else if (t.tag === 18) {
              if (a === null) {
                c = t;
                try {
                  var r = c.stateNode;
                  e ? Po(r, !0) : Po(c.stateNode, !1);
                } catch (N) {
                  dl(c, c.return, N);
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
        u & 4 && (u = l.updateQueue, u !== null && (a = u.retryQueue, a !== null && (u.retryQueue = null, Un(l, a))));
        break;
      case 19:
        ct(t, l), st(l), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, Un(l, u)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        ct(t, l), st(l);
    }
  }
  function st(l) {
    var t = l.flags;
    if (t & 2) {
      try {
        for (var a, u = l.return; u !== null; ) {
          if (lo(u)) {
            a = u;
            break;
          }
          u = u.return;
        }
        if (a == null) throw Error(v(160));
        switch (a.tag) {
          case 27:
            var e = a.stateNode, n = Nf(l);
            Dn(l, n, e);
            break;
          case 5:
            var i = a.stateNode;
            a.flags & 32 && (cu(i, ""), a.flags &= -33);
            var f = Nf(l);
            Dn(l, f, i);
            break;
          case 3:
          case 4:
            var c = a.stateNode.containerInfo, m = Nf(l);
            Rf(
              l,
              m,
              c
            );
            break;
          default:
            throw Error(v(161));
        }
      } catch (g) {
        dl(l, l.return, g);
      }
      l.flags &= -3;
    }
    t & 4096 && (l.flags &= -4097);
  }
  function so(l) {
    if (l.subtreeFlags & 1024)
      for (l = l.child; l !== null; ) {
        var t = l;
        so(t), t.tag === 5 && t.flags & 1024 && t.stateNode.reset(), l = l.sibling;
      }
  }
  function ua(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        uo(l, t.alternate, t), t = t.sibling;
  }
  function ka(l) {
    for (l = l.child; l !== null; ) {
      var t = l;
      switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          za(4, t, t.return), ka(t);
          break;
        case 1:
          Xt(t, t.return);
          var a = t.stateNode;
          typeof a.componentWillUnmount == "function" && I0(
            t,
            t.return,
            a
          ), ka(t);
          break;
        case 27:
          De(t.stateNode);
        case 26:
        case 5:
          Xt(t, t.return), ka(t);
          break;
        case 22:
          t.memoizedState === null && ka(t);
          break;
        case 30:
          ka(t);
          break;
        default:
          ka(t);
      }
      l = l.sibling;
    }
  }
  function ea(l, t, a) {
    for (a = a && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
      var u = t.alternate, e = l, n = t, i = n.flags;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          ea(
            e,
            n,
            a
          ), ge(4, n);
          break;
        case 1:
          if (ea(
            e,
            n,
            a
          ), u = n, e = u.stateNode, typeof e.componentDidMount == "function")
            try {
              e.componentDidMount();
            } catch (m) {
              dl(u, u.return, m);
            }
          if (u = n, e = u.updateQueue, e !== null) {
            var f = u.stateNode;
            try {
              var c = e.shared.hiddenCallbacks;
              if (c !== null)
                for (e.shared.hiddenCallbacks = null, e = 0; e < c.length; e++)
                  Qs(c[e], f);
            } catch (m) {
              dl(u, u.return, m);
            }
          }
          a && i & 64 && k0(n), be(n, n.return);
          break;
        case 27:
          to(n);
        case 26:
        case 5:
          ea(
            e,
            n,
            a
          ), a && u === null && i & 4 && P0(n), be(n, n.return);
          break;
        case 12:
          ea(
            e,
            n,
            a
          );
          break;
        case 31:
          ea(
            e,
            n,
            a
          ), a && i & 4 && io(e, n);
          break;
        case 13:
          ea(
            e,
            n,
            a
          ), a && i & 4 && fo(e, n);
          break;
        case 22:
          n.memoizedState === null && ea(
            e,
            n,
            a
          ), be(n, n.return);
          break;
        case 30:
          break;
        default:
          ea(
            e,
            n,
            a
          );
      }
      t = t.sibling;
    }
  }
  function Cf(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && ne(a));
  }
  function jf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && ne(l));
  }
  function Bt(l, t, a, u) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; )
        oo(
          l,
          t,
          a,
          u
        ), t = t.sibling;
  }
  function oo(l, t, a, u) {
    var e = t.flags;
    switch (t.tag) {
      case 0:
      case 11:
      case 15:
        Bt(
          l,
          t,
          a,
          u
        ), e & 2048 && ge(9, t);
        break;
      case 1:
        Bt(
          l,
          t,
          a,
          u
        );
        break;
      case 3:
        Bt(
          l,
          t,
          a,
          u
        ), e & 2048 && (l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && ne(l)));
        break;
      case 12:
        if (e & 2048) {
          Bt(
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
          } catch (c) {
            dl(t, t.return, c);
          }
        } else
          Bt(
            l,
            t,
            a,
            u
          );
        break;
      case 31:
        Bt(
          l,
          t,
          a,
          u
        );
        break;
      case 13:
        Bt(
          l,
          t,
          a,
          u
        );
        break;
      case 23:
        break;
      case 22:
        n = t.stateNode, i = t.alternate, t.memoizedState !== null ? n._visibility & 2 ? Bt(
          l,
          t,
          a,
          u
        ) : Ee(l, t) : n._visibility & 2 ? Bt(
          l,
          t,
          a,
          u
        ) : (n._visibility |= 2, Du(
          l,
          t,
          a,
          u,
          (t.subtreeFlags & 10256) !== 0 || !1
        )), e & 2048 && Cf(i, t);
        break;
      case 24:
        Bt(
          l,
          t,
          a,
          u
        ), e & 2048 && jf(t.alternate, t);
        break;
      default:
        Bt(
          l,
          t,
          a,
          u
        );
    }
  }
  function Du(l, t, a, u, e) {
    for (e = e && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, f = a, c = u, m = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          Du(
            n,
            i,
            f,
            c,
            e
          ), ge(8, i);
          break;
        case 23:
          break;
        case 22:
          var g = i.stateNode;
          i.memoizedState !== null ? g._visibility & 2 ? Du(
            n,
            i,
            f,
            c,
            e
          ) : Ee(
            n,
            i
          ) : (g._visibility |= 2, Du(
            n,
            i,
            f,
            c,
            e
          )), e && m & 2048 && Cf(
            i.alternate,
            i
          );
          break;
        case 24:
          Du(
            n,
            i,
            f,
            c,
            e
          ), e && m & 2048 && jf(i.alternate, i);
          break;
        default:
          Du(
            n,
            i,
            f,
            c,
            e
          );
      }
      t = t.sibling;
    }
  }
  function Ee(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, u = t, e = u.flags;
        switch (u.tag) {
          case 22:
            Ee(a, u), e & 2048 && Cf(
              u.alternate,
              u
            );
            break;
          case 24:
            Ee(a, u), e & 2048 && jf(u.alternate, u);
            break;
          default:
            Ee(a, u);
        }
        t = t.sibling;
      }
  }
  var ze = 8192;
  function Uu(l, t, a) {
    if (l.subtreeFlags & ze)
      for (l = l.child; l !== null; )
        vo(
          l,
          t,
          a
        ), l = l.sibling;
  }
  function vo(l, t, a) {
    switch (l.tag) {
      case 26:
        Uu(
          l,
          t,
          a
        ), l.flags & ze && l.memoizedState !== null && $y(
          a,
          qt,
          l.memoizedState,
          l.memoizedProps
        );
        break;
      case 5:
        Uu(
          l,
          t,
          a
        );
        break;
      case 3:
      case 4:
        var u = qt;
        qt = Ln(l.stateNode.containerInfo), Uu(
          l,
          t,
          a
        ), qt = u;
        break;
      case 22:
        l.memoizedState === null && (u = l.alternate, u !== null && u.memoizedState !== null ? (u = ze, ze = 16777216, Uu(
          l,
          t,
          a
        ), ze = u) : Uu(
          l,
          t,
          a
        ));
        break;
      default:
        Uu(
          l,
          t,
          a
        );
    }
  }
  function yo(l) {
    var t = l.alternate;
    if (t !== null && (l = t.child, l !== null)) {
      t.child = null;
      do
        t = l.sibling, l.sibling = null, l = t;
      while (l !== null);
    }
  }
  function Te(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Jl = u, ho(
            u,
            l
          );
        }
      yo(l);
    }
    if (l.subtreeFlags & 10256)
      for (l = l.child; l !== null; )
        mo(l), l = l.sibling;
  }
  function mo(l) {
    switch (l.tag) {
      case 0:
      case 11:
      case 15:
        Te(l), l.flags & 2048 && za(9, l, l.return);
        break;
      case 3:
        Te(l);
        break;
      case 12:
        Te(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, Nn(l)) : Te(l);
        break;
      default:
        Te(l);
    }
  }
  function Nn(l) {
    var t = l.deletions;
    if ((l.flags & 16) !== 0) {
      if (t !== null)
        for (var a = 0; a < t.length; a++) {
          var u = t[a];
          Jl = u, ho(
            u,
            l
          );
        }
      yo(l);
    }
    for (l = l.child; l !== null; ) {
      switch (t = l, t.tag) {
        case 0:
        case 11:
        case 15:
          za(8, t, t.return), Nn(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, Nn(t));
          break;
        default:
          Nn(t);
      }
      l = l.sibling;
    }
  }
  function ho(l, t) {
    for (; Jl !== null; ) {
      var a = Jl;
      switch (a.tag) {
        case 0:
        case 11:
        case 15:
          za(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var u = a.memoizedState.cachePool.pool;
            u != null && u.refCount++;
          }
          break;
        case 24:
          ne(a.memoizedState.cache);
      }
      if (u = a.child, u !== null) u.return = a, Jl = u;
      else
        l: for (a = l; Jl !== null; ) {
          u = Jl;
          var e = u.sibling, n = u.return;
          if (eo(u), u === a) {
            Jl = null;
            break l;
          }
          if (e !== null) {
            e.return = n, Jl = e;
            break l;
          }
          Jl = n;
        }
    }
  }
  var oy = {
    getCacheForType: function(l) {
      var t = Fl(xl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return Fl(xl).controller.signal;
    }
  }, dy = typeof WeakMap == "function" ? WeakMap : Map, fl = 0, gl = null, k = null, P = 0, ol = 0, bt = null, Ta = !1, Nu = !1, qf = !1, na = 0, Hl = 0, _a = 0, Ia = 0, Bf = 0, Et = 0, Ru = 0, _e = null, ot = null, xf = !1, Rn = 0, ro = 0, Hn = 1 / 0, Cn = null, Aa = null, Ll = 0, Oa = null, Hu = null, ia = 0, Yf = 0, Gf = null, So = null, Ae = 0, Qf = null;
  function zt() {
    return (fl & 2) !== 0 && P !== 0 ? P & -P : S.T !== null ? Jf() : Hc();
  }
  function go() {
    if (Et === 0)
      if ((P & 536870912) === 0 || tl) {
        var l = Qe;
        Qe <<= 1, (Qe & 3932160) === 0 && (Qe = 262144), Et = l;
      } else Et = 536870912;
    return l = St.current, l !== null && (l.flags |= 32), Et;
  }
  function dt(l, t, a) {
    (l === gl && (ol === 2 || ol === 9) || l.cancelPendingCommit !== null) && (Cu(l, 0), Ma(
      l,
      P,
      Et,
      !1
    )), Ku(l, a), ((fl & 2) === 0 || l !== gl) && (l === gl && ((fl & 2) === 0 && (Ia |= a), Hl === 4 && Ma(
      l,
      P,
      Et,
      !1
    )), Zt(l));
  }
  function bo(l, t, a) {
    if ((fl & 6) !== 0) throw Error(v(327));
    var u = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || Vu(l, t), e = u ? my(l, t) : Zf(l, t, !0), n = u;
    do {
      if (e === 0) {
        Nu && !u && Ma(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !vy(a)) {
          e = Zf(l, t, !1), n = !1;
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
              e = _e;
              var c = f.current.memoizedState.isDehydrated;
              if (c && (Cu(f, i).flags |= 256), i = Zf(
                f,
                i,
                !1
              ), i !== 2) {
                if (qf && !c) {
                  f.errorRecoveryDisabledLanes |= n, Ia |= n, e = 4;
                  break l;
                }
                n = ot, ot = e, n !== null && (ot === null ? ot = n : ot.push.apply(
                  ot,
                  n
                ));
              }
              e = i;
            }
            if (n = !1, e !== 2) continue;
          }
        }
        if (e === 1) {
          Cu(l, 0), Ma(l, t, 0, !0);
          break;
        }
        l: {
          switch (u = l, n = e, n) {
            case 0:
            case 1:
              throw Error(v(345));
            case 4:
              if ((t & 4194048) !== t) break;
            case 6:
              Ma(
                u,
                t,
                Et,
                !Ta
              );
              break l;
            case 2:
              ot = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(v(329));
          }
          if ((t & 62914560) === t && (e = Rn + 300 - Tl(), 10 < e)) {
            if (Ma(
              u,
              t,
              Et,
              !Ta
            ), Ze(u, 0, !0) !== 0) break l;
            ia = t, u.timeoutHandle = Fo(
              Eo.bind(
                null,
                u,
                a,
                ot,
                Cn,
                xf,
                t,
                Et,
                Ia,
                Ru,
                Ta,
                n,
                "Throttled",
                -0,
                0
              ),
              e
            );
            break l;
          }
          Eo(
            u,
            a,
            ot,
            Cn,
            xf,
            t,
            Et,
            Ia,
            Ru,
            Ta,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    Zt(l);
  }
  function Eo(l, t, a, u, e, n, i, f, c, m, g, T, h, r) {
    if (l.timeoutHandle = -1, T = t.subtreeFlags, T & 8192 || (T & 16785408) === 16785408) {
      T = {
        stylesheets: null,
        count: 0,
        imgCount: 0,
        imgBytes: 0,
        suspenseyImages: [],
        waitingForImages: !0,
        waitingForViewTransition: !1,
        unsuspend: Kt
      }, vo(
        t,
        n,
        T
      );
      var N = (n & 62914560) === n ? Rn - Tl() : (n & 4194048) === n ? ro - Tl() : 0;
      if (N = Fy(
        T,
        N
      ), N !== null) {
        ia = n, l.cancelPendingCommit = N(
          Do.bind(
            null,
            l,
            t,
            n,
            a,
            u,
            e,
            i,
            f,
            c,
            g,
            T,
            null,
            h,
            r
          )
        ), Ma(l, n, i, !m);
        return;
      }
    }
    Do(
      l,
      t,
      n,
      a,
      u,
      e,
      i,
      f,
      c
    );
  }
  function vy(l) {
    for (var t = l; ; ) {
      var a = t.tag;
      if ((a === 0 || a === 11 || a === 15) && t.flags & 16384 && (a = t.updateQueue, a !== null && (a = a.stores, a !== null)))
        for (var u = 0; u < a.length; u++) {
          var e = a[u], n = e.getSnapshot;
          e = e.value;
          try {
            if (!ht(n(), e)) return !1;
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
  function Ma(l, t, a, u) {
    t &= ~Bf, t &= ~Ia, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - mt(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && Uc(l, a, t);
  }
  function jn() {
    return (fl & 6) === 0 ? (Oe(0), !1) : !0;
  }
  function Xf() {
    if (k !== null) {
      if (ol === 0)
        var l = k.return;
      else
        l = k, $t = La = null, af(l), _u = null, fe = 0, l = k;
      for (; l !== null; )
        F0(l.alternate, l), l = l.return;
      k = null;
    }
  }
  function Cu(l, t) {
    var a = l.timeoutHandle;
    a !== -1 && (l.timeoutHandle = -1, Hy(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), ia = 0, Xf(), gl = l, k = a = wt(l.current, null), P = t, ol = 0, bt = null, Ta = !1, Nu = Vu(l, t), qf = !1, Ru = Et = Bf = Ia = _a = Hl = 0, ot = _e = null, xf = !1, (t & 8) !== 0 && (t |= t & 32);
    var u = l.entangledLanes;
    if (u !== 0)
      for (l = l.entanglements, u &= t; 0 < u; ) {
        var e = 31 - mt(u), n = 1 << e;
        t |= l[e], u &= ~n;
      }
    return na = t, ln(), a;
  }
  function zo(l, t) {
    Z = null, S.H = he, t === Tu || t === sn ? (t = Bs(), ol = 3) : t === Vi ? (t = Bs(), ol = 4) : ol = t === bf ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, bt = t, k === null && (Hl = 1, _n(
      l,
      Mt(t, l.current)
    ));
  }
  function To() {
    var l = St.current;
    return l === null ? !0 : (P & 4194048) === P ? Nt === null : (P & 62914560) === P || (P & 536870912) !== 0 ? l === Nt : !1;
  }
  function _o() {
    var l = S.H;
    return S.H = he, l === null ? he : l;
  }
  function Ao() {
    var l = S.A;
    return S.A = oy, l;
  }
  function qn() {
    Hl = 4, Ta || (P & 4194048) !== P && St.current !== null || (Nu = !0), (_a & 134217727) === 0 && (Ia & 134217727) === 0 || gl === null || Ma(
      gl,
      P,
      Et,
      !1
    );
  }
  function Zf(l, t, a) {
    var u = fl;
    fl |= 2;
    var e = _o(), n = Ao();
    (gl !== l || P !== t) && (Cn = null, Cu(l, t)), t = !1;
    var i = Hl;
    l: do
      try {
        if (ol !== 0 && k !== null) {
          var f = k, c = bt;
          switch (ol) {
            case 8:
              Xf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              St.current === null && (t = !0);
              var m = ol;
              if (ol = 0, bt = null, ju(l, f, c, m), a && Nu) {
                i = 0;
                break l;
              }
              break;
            default:
              m = ol, ol = 0, bt = null, ju(l, f, c, m);
          }
        }
        yy(), i = Hl;
        break;
      } catch (g) {
        zo(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, $t = La = null, fl = u, S.H = e, S.A = n, k === null && (gl = null, P = 0, ln()), i;
  }
  function yy() {
    for (; k !== null; ) Oo(k);
  }
  function my(l, t) {
    var a = fl;
    fl |= 2;
    var u = _o(), e = Ao();
    gl !== l || P !== t ? (Cn = null, Hn = Tl() + 500, Cu(l, t)) : Nu = Vu(
      l,
      t
    );
    l: do
      try {
        if (ol !== 0 && k !== null) {
          t = k;
          var n = bt;
          t: switch (ol) {
            case 1:
              ol = 0, bt = null, ju(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (js(n)) {
                ol = 0, bt = null, Mo(t);
                break;
              }
              t = function() {
                ol !== 2 && ol !== 9 || gl !== l || (ol = 7), Zt(l);
              }, n.then(t, t);
              break l;
            case 3:
              ol = 7;
              break l;
            case 4:
              ol = 5;
              break l;
            case 7:
              js(n) ? (ol = 0, bt = null, Mo(t)) : (ol = 0, bt = null, ju(l, t, n, 7));
              break;
            case 5:
              var i = null;
              switch (k.tag) {
                case 26:
                  i = k.memoizedState;
                case 5:
                case 27:
                  var f = k;
                  if (i ? dd(i) : f.stateNode.complete) {
                    ol = 0, bt = null;
                    var c = f.sibling;
                    if (c !== null) k = c;
                    else {
                      var m = f.return;
                      m !== null ? (k = m, Bn(m)) : k = null;
                    }
                    break t;
                  }
              }
              ol = 0, bt = null, ju(l, t, n, 5);
              break;
            case 6:
              ol = 0, bt = null, ju(l, t, n, 6);
              break;
            case 8:
              Xf(), Hl = 6;
              break l;
            default:
              throw Error(v(462));
          }
        }
        hy();
        break;
      } catch (g) {
        zo(l, g);
      }
    while (!0);
    return $t = La = null, S.H = u, S.A = e, fl = a, k !== null ? 0 : (gl = null, P = 0, ln(), Hl);
  }
  function hy() {
    for (; k !== null && !vt(); )
      Oo(k);
  }
  function Oo(l) {
    var t = W0(l.alternate, l, na);
    l.memoizedProps = l.pendingProps, t === null ? Bn(l) : k = t;
  }
  function Mo(l) {
    var t = l, a = t.alternate;
    switch (t.tag) {
      case 15:
      case 0:
        t = Z0(
          a,
          t,
          t.pendingProps,
          t.type,
          void 0,
          P
        );
        break;
      case 11:
        t = Z0(
          a,
          t,
          t.pendingProps,
          t.type.render,
          t.ref,
          P
        );
        break;
      case 5:
        af(t);
      default:
        F0(a, t), t = k = _s(t, na), t = W0(a, t, na);
    }
    l.memoizedProps = l.pendingProps, t === null ? Bn(l) : k = t;
  }
  function ju(l, t, a, u) {
    $t = La = null, af(t), _u = null, fe = 0;
    var e = t.return;
    try {
      if (uy(
        l,
        e,
        t,
        a,
        P
      )) {
        Hl = 1, _n(
          l,
          Mt(a, l.current)
        ), k = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw k = e, n;
      Hl = 1, _n(
        l,
        Mt(a, l.current)
      ), k = null;
      return;
    }
    t.flags & 32768 ? (tl || u === 1 ? l = !0 : Nu || (P & 536870912) !== 0 ? l = !1 : (Ta = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = St.current, u !== null && u.tag === 13 && (u.flags |= 16384))), po(t, l)) : Bn(t);
  }
  function Bn(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        po(
          t,
          Ta
        );
        return;
      }
      l = t.return;
      var a = iy(
        t.alternate,
        t,
        na
      );
      if (a !== null) {
        k = a;
        return;
      }
      if (t = t.sibling, t !== null) {
        k = t;
        return;
      }
      k = t = l;
    } while (t !== null);
    Hl === 0 && (Hl = 5);
  }
  function po(l, t) {
    do {
      var a = fy(l.alternate, l);
      if (a !== null) {
        a.flags &= 32767, k = a;
        return;
      }
      if (a = l.return, a !== null && (a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null), !t && (l = l.sibling, l !== null)) {
        k = l;
        return;
      }
      k = l = a;
    } while (l !== null);
    Hl = 6, k = null;
  }
  function Do(l, t, a, u, e, n, i, f, c) {
    l.cancelPendingCommit = null;
    do
      xn();
    while (Ll !== 0);
    if ((fl & 6) !== 0) throw Error(v(327));
    if (t !== null) {
      if (t === l.current) throw Error(v(177));
      if (n = t.lanes | t.childLanes, n |= Ui, Wd(
        l,
        a,
        n,
        i,
        f,
        c
      ), l === gl && (k = gl = null, P = 0), Hu = t, Oa = l, ia = a, Yf = n, Gf = e, So = u, (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, by(Ye, function() {
        return Co(), null;
      })) : (l.callbackNode = null, l.callbackPriority = 0), u = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || u) {
        u = S.T, S.T = null, e = O.p, O.p = 2, i = fl, fl |= 4;
        try {
          cy(l, t, a);
        } finally {
          fl = i, O.p = e, S.T = u;
        }
      }
      Ll = 1, Uo(), No(), Ro();
    }
  }
  function Uo() {
    if (Ll === 1) {
      Ll = 0;
      var l = Oa, t = Hu, a = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || a) {
        a = S.T, S.T = null;
        var u = O.p;
        O.p = 2;
        var e = fl;
        fl |= 4;
        try {
          co(t, l);
          var n = lc, i = ms(l.containerInfo), f = n.focusedElem, c = n.selectionRange;
          if (i !== f && f && f.ownerDocument && ys(
            f.ownerDocument.documentElement,
            f
          )) {
            if (c !== null && Ai(f)) {
              var m = c.start, g = c.end;
              if (g === void 0 && (g = m), "selectionStart" in f)
                f.selectionStart = m, f.selectionEnd = Math.min(
                  g,
                  f.value.length
                );
              else {
                var T = f.ownerDocument || document, h = T && T.defaultView || window;
                if (h.getSelection) {
                  var r = h.getSelection(), N = f.textContent.length, Y = Math.min(c.start, N), rl = c.end === void 0 ? Y : Math.min(c.end, N);
                  !r.extend && Y > rl && (i = rl, rl = Y, Y = i);
                  var d = vs(
                    f,
                    Y
                  ), s = vs(
                    f,
                    rl
                  );
                  if (d && s && (r.rangeCount !== 1 || r.anchorNode !== d.node || r.anchorOffset !== d.offset || r.focusNode !== s.node || r.focusOffset !== s.offset)) {
                    var y = T.createRange();
                    y.setStart(d.node, d.offset), r.removeAllRanges(), Y > rl ? (r.addRange(y), r.extend(s.node, s.offset)) : (y.setEnd(s.node, s.offset), r.addRange(y));
                  }
                }
              }
            }
            for (T = [], r = f; r = r.parentNode; )
              r.nodeType === 1 && T.push({
                element: r,
                left: r.scrollLeft,
                top: r.scrollTop
              });
            for (typeof f.focus == "function" && f.focus(), f = 0; f < T.length; f++) {
              var E = T[f];
              E.element.scrollLeft = E.left, E.element.scrollTop = E.top;
            }
          }
          $n = !!Pf, lc = Pf = null;
        } finally {
          fl = e, O.p = u, S.T = a;
        }
      }
      l.current = t, Ll = 2;
    }
  }
  function No() {
    if (Ll === 2) {
      Ll = 0;
      var l = Oa, t = Hu, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = S.T, S.T = null;
        var u = O.p;
        O.p = 2;
        var e = fl;
        fl |= 4;
        try {
          uo(l, t.alternate, t);
        } finally {
          fl = e, O.p = u, S.T = a;
        }
      }
      Ll = 3;
    }
  }
  function Ro() {
    if (Ll === 4 || Ll === 3) {
      Ll = 0, tu();
      var l = Oa, t = Hu, a = ia, u = So;
      (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? Ll = 5 : (Ll = 0, Hu = Oa = null, Ho(l, l.pendingLanes));
      var e = l.pendingLanes;
      if (e === 0 && (Aa = null), ni(a), t = t.stateNode, yt && typeof yt.onCommitFiberRoot == "function")
        try {
          yt.onCommitFiberRoot(
            Lu,
            t,
            void 0,
            (t.current.flags & 128) === 128
          );
        } catch {
        }
      if (u !== null) {
        t = S.T, e = O.p, O.p = 2, S.T = null;
        try {
          for (var n = l.onRecoverableError, i = 0; i < u.length; i++) {
            var f = u[i];
            n(f.value, {
              componentStack: f.stack
            });
          }
        } finally {
          S.T = t, O.p = e;
        }
      }
      (ia & 3) !== 0 && xn(), Zt(l), e = l.pendingLanes, (a & 261930) !== 0 && (e & 42) !== 0 ? l === Qf ? Ae++ : (Ae = 0, Qf = l) : Ae = 0, Oe(0);
    }
  }
  function Ho(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, ne(t)));
  }
  function xn() {
    return Uo(), No(), Ro(), Co();
  }
  function Co() {
    if (Ll !== 5) return !1;
    var l = Oa, t = Yf;
    Yf = 0;
    var a = ni(ia), u = S.T, e = O.p;
    try {
      O.p = 32 > a ? 32 : a, S.T = null, a = Gf, Gf = null;
      var n = Oa, i = ia;
      if (Ll = 0, Hu = Oa = null, ia = 0, (fl & 6) !== 0) throw Error(v(331));
      var f = fl;
      if (fl |= 4, mo(n.current), oo(
        n,
        n.current,
        i,
        a
      ), fl = f, Oe(0, !1), yt && typeof yt.onPostCommitFiberRoot == "function")
        try {
          yt.onPostCommitFiberRoot(Lu, n);
        } catch {
        }
      return !0;
    } finally {
      O.p = e, S.T = u, Ho(l, t);
    }
  }
  function jo(l, t, a) {
    t = Mt(a, t), t = gf(l.stateNode, t, 2), l = ga(l, t, 2), l !== null && (Ku(l, 2), Zt(l));
  }
  function dl(l, t, a) {
    if (l.tag === 3)
      jo(l, l, a);
    else
      for (; t !== null; ) {
        if (t.tag === 3) {
          jo(
            t,
            l,
            a
          );
          break;
        } else if (t.tag === 1) {
          var u = t.stateNode;
          if (typeof t.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Aa === null || !Aa.has(u))) {
            l = Mt(a, l), a = j0(2), u = ga(t, a, 2), u !== null && (q0(
              a,
              u,
              t,
              l
            ), Ku(u, 2), Zt(u));
            break;
          }
        }
        t = t.return;
      }
  }
  function Lf(l, t, a) {
    var u = l.pingCache;
    if (u === null) {
      u = l.pingCache = new dy();
      var e = /* @__PURE__ */ new Set();
      u.set(t, e);
    } else
      e = u.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), u.set(t, e));
    e.has(a) || (qf = !0, e.add(a), l = ry.bind(null, l, t, a), t.then(l, l));
  }
  function ry(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, gl === l && (P & a) === a && (Hl === 4 || Hl === 3 && (P & 62914560) === P && 300 > Tl() - Rn ? (fl & 2) === 0 && Cu(l, 0) : Bf |= a, Ru === P && (Ru = 0)), Zt(l);
  }
  function qo(l, t) {
    t === 0 && (t = Dc()), l = Qa(l, t), l !== null && (Ku(l, t), Zt(l));
  }
  function Sy(l) {
    var t = l.memoizedState, a = 0;
    t !== null && (a = t.retryLane), qo(l, a);
  }
  function gy(l, t) {
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
        throw Error(v(314));
    }
    u !== null && u.delete(t), qo(l, a);
  }
  function by(l, t) {
    return Tt(l, t);
  }
  var Yn = null, qu = null, Vf = !1, Gn = !1, Kf = !1, pa = 0;
  function Zt(l) {
    l !== qu && l.next === null && (qu === null ? Yn = qu = l : qu = qu.next = l), Gn = !0, Vf || (Vf = !0, zy());
  }
  function Oe(l, t) {
    if (!Kf && Gn) {
      Kf = !0;
      do
        for (var a = !1, u = Yn; u !== null; ) {
          if (l !== 0) {
            var e = u.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = u.suspendedLanes, f = u.pingedLanes;
              n = (1 << 31 - mt(42 | l) + 1) - 1, n &= e & ~(i & ~f), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, Go(u, n));
          } else
            n = P, n = Ze(
              u,
              u === gl ? n : 0,
              u.cancelPendingCommit !== null || u.timeoutHandle !== -1
            ), (n & 3) === 0 || Vu(u, n) || (a = !0, Go(u, n));
          u = u.next;
        }
      while (a);
      Kf = !1;
    }
  }
  function Ey() {
    Bo();
  }
  function Bo() {
    Gn = Vf = !1;
    var l = 0;
    pa !== 0 && Ry() && (l = pa);
    for (var t = Tl(), a = null, u = Yn; u !== null; ) {
      var e = u.next, n = xo(u, t);
      n === 0 ? (u.next = null, a === null ? Yn = e : a.next = e, e === null && (qu = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (Gn = !0)), u = e;
    }
    Ll !== 0 && Ll !== 5 || Oe(l), pa !== 0 && (pa = 0);
  }
  function xo(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - mt(n), f = 1 << i, c = e[i];
      c === -1 ? ((f & a) === 0 || (f & u) !== 0) && (e[i] = wd(f, t)) : c <= t && (l.expiredLanes |= f), n &= ~f;
    }
    if (t = gl, a = P, a = Ze(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u = l.callbackNode, a === 0 || l === t && (ol === 2 || ol === 9) || l.cancelPendingCommit !== null)
      return u !== null && u !== null && et(u), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || Vu(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (u !== null && et(u), ni(a)) {
        case 2:
        case 8:
          a = Mc;
          break;
        case 32:
          a = Ye;
          break;
        case 268435456:
          a = pc;
          break;
        default:
          a = Ye;
      }
      return u = Yo.bind(null, l), a = Tt(a, u), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return u !== null && u !== null && et(u), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function Yo(l, t) {
    if (Ll !== 0 && Ll !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (xn() && l.callbackNode !== a)
      return null;
    var u = P;
    return u = Ze(
      l,
      l === gl ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (bo(l, u, t), xo(l, Tl()), l.callbackNode != null && l.callbackNode === a ? Yo.bind(null, l) : null);
  }
  function Go(l, t) {
    if (xn()) return null;
    bo(l, t, !0);
  }
  function zy() {
    Cy(function() {
      (fl & 6) !== 0 ? Tt(
        Oc,
        Ey
      ) : Bo();
    });
  }
  function Jf() {
    if (pa === 0) {
      var l = Eu;
      l === 0 && (l = Ge, Ge <<= 1, (Ge & 261888) === 0 && (Ge = 256)), pa = l;
    }
    return pa;
  }
  function Qo(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : Je("" + l);
  }
  function Xo(l, t) {
    var a = t.ownerDocument.createElement("input");
    return a.name = t.name, a.value = t.value, l.id && a.setAttribute("form", l.id), t.parentNode.insertBefore(a, t), l = new FormData(l), a.parentNode.removeChild(a), l;
  }
  function Ty(l, t, a, u, e) {
    if (t === "submit" && a && a.stateNode === e) {
      var n = Qo(
        (e[nt] || null).action
      ), i = u.submitter;
      i && (t = (t = i[nt] || null) ? Qo(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var f = new Fe(
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
                if (pa !== 0) {
                  var c = i ? Xo(e, i) : new FormData(e);
                  vf(
                    a,
                    {
                      pending: !0,
                      data: c,
                      method: e.method,
                      action: n
                    },
                    null,
                    c
                  );
                }
              } else
                typeof n == "function" && (f.preventDefault(), c = i ? Xo(e, i) : new FormData(e), vf(
                  a,
                  {
                    pending: !0,
                    data: c,
                    method: e.method,
                    action: n
                  },
                  n,
                  c
                ));
            },
            currentTarget: e
          }
        ]
      });
    }
  }
  for (var wf = 0; wf < Di.length; wf++) {
    var Wf = Di[wf], _y = Wf.toLowerCase(), Ay = Wf[0].toUpperCase() + Wf.slice(1);
    jt(
      _y,
      "on" + Ay
    );
  }
  jt(Ss, "onAnimationEnd"), jt(gs, "onAnimationIteration"), jt(bs, "onAnimationStart"), jt("dblclick", "onDoubleClick"), jt("focusin", "onFocus"), jt("focusout", "onBlur"), jt(Qv, "onTransitionRun"), jt(Xv, "onTransitionStart"), jt(Zv, "onTransitionCancel"), jt(Es, "onTransitionEnd"), iu("onMouseEnter", ["mouseout", "mouseover"]), iu("onMouseLeave", ["mouseout", "mouseover"]), iu("onPointerEnter", ["pointerout", "pointerover"]), iu("onPointerLeave", ["pointerout", "pointerover"]), Ba(
    "onChange",
    "change click focusin focusout input keydown keyup selectionchange".split(" ")
  ), Ba(
    "onSelect",
    "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
      " "
    )
  ), Ba("onBeforeInput", [
    "compositionend",
    "keypress",
    "textInput",
    "paste"
  ]), Ba(
    "onCompositionEnd",
    "compositionend focusout keydown keypress keyup mousedown".split(" ")
  ), Ba(
    "onCompositionStart",
    "compositionstart focusout keydown keypress keyup mousedown".split(" ")
  ), Ba(
    "onCompositionUpdate",
    "compositionupdate focusout keydown keypress keyup mousedown".split(" ")
  );
  var Me = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), Oy = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(Me)
  );
  function Zo(l, t) {
    t = (t & 4) !== 0;
    for (var a = 0; a < l.length; a++) {
      var u = l[a], e = u.event;
      u = u.listeners;
      l: {
        var n = void 0;
        if (t)
          for (var i = u.length - 1; 0 <= i; i--) {
            var f = u[i], c = f.instance, m = f.currentTarget;
            if (f = f.listener, c !== n && e.isPropagationStopped())
              break l;
            n = f, e.currentTarget = m;
            try {
              n(e);
            } catch (g) {
              Pe(g);
            }
            e.currentTarget = null, n = c;
          }
        else
          for (i = 0; i < u.length; i++) {
            if (f = u[i], c = f.instance, m = f.currentTarget, f = f.listener, c !== n && e.isPropagationStopped())
              break l;
            n = f, e.currentTarget = m;
            try {
              n(e);
            } catch (g) {
              Pe(g);
            }
            e.currentTarget = null, n = c;
          }
      }
    }
  }
  function I(l, t) {
    var a = t[ii];
    a === void 0 && (a = t[ii] = /* @__PURE__ */ new Set());
    var u = l + "__bubble";
    a.has(u) || (Lo(t, l, 2, !1), a.add(u));
  }
  function $f(l, t, a) {
    var u = 0;
    t && (u |= 4), Lo(
      a,
      l,
      u,
      t
    );
  }
  var Qn = "_reactListening" + Math.random().toString(36).slice(2);
  function Ff(l) {
    if (!l[Qn]) {
      l[Qn] = !0, qc.forEach(function(a) {
        a !== "selectionchange" && (Oy.has(a) || $f(a, !1, l), $f(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Qn] || (t[Qn] = !0, $f("selectionchange", !1, t));
    }
  }
  function Lo(l, t, a, u) {
    switch (gd(t)) {
      case 2:
        var e = Py;
        break;
      case 8:
        e = lm;
        break;
      default:
        e = dc;
    }
    a = e.bind(
      null,
      t,
      a,
      l
    ), e = void 0, !hi || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (e = !0), u ? e !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: e
    }) : l.addEventListener(t, a, !0) : e !== void 0 ? l.addEventListener(t, a, {
      passive: e
    }) : l.addEventListener(t, a, !1);
  }
  function kf(l, t, a, u, e) {
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
              var c = i.tag;
              if ((c === 3 || c === 4) && i.stateNode.containerInfo === e)
                return;
              i = i.return;
            }
          for (; f !== null; ) {
            if (i = uu(f), i === null) return;
            if (c = i.tag, c === 5 || c === 6 || c === 26 || c === 27) {
              u = n = i;
              continue l;
            }
            f = f.parentNode;
          }
        }
        u = u.return;
      }
    wc(function() {
      var m = n, g = yi(a), T = [];
      l: {
        var h = zs.get(l);
        if (h !== void 0) {
          var r = Fe, N = l;
          switch (l) {
            case "keypress":
              if (We(a) === 0) break l;
            case "keydown":
            case "keyup":
              r = gv;
              break;
            case "focusin":
              N = "focus", r = bi;
              break;
            case "focusout":
              N = "blur", r = bi;
              break;
            case "beforeblur":
            case "afterblur":
              r = bi;
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
              r = Fc;
              break;
            case "drag":
            case "dragend":
            case "dragenter":
            case "dragexit":
            case "dragleave":
            case "dragover":
            case "dragstart":
            case "drop":
              r = iv;
              break;
            case "touchcancel":
            case "touchend":
            case "touchmove":
            case "touchstart":
              r = zv;
              break;
            case Ss:
            case gs:
            case bs:
              r = sv;
              break;
            case Es:
              r = _v;
              break;
            case "scroll":
            case "scrollend":
              r = ev;
              break;
            case "wheel":
              r = Ov;
              break;
            case "copy":
            case "cut":
            case "paste":
              r = dv;
              break;
            case "gotpointercapture":
            case "lostpointercapture":
            case "pointercancel":
            case "pointerdown":
            case "pointermove":
            case "pointerout":
            case "pointerover":
            case "pointerup":
              r = Ic;
              break;
            case "toggle":
            case "beforetoggle":
              r = pv;
          }
          var Y = (t & 4) !== 0, rl = !Y && (l === "scroll" || l === "scrollend"), d = Y ? h !== null ? h + "Capture" : null : h;
          Y = [];
          for (var s = m, y; s !== null; ) {
            var E = s;
            if (y = E.stateNode, E = E.tag, E !== 5 && E !== 26 && E !== 27 || y === null || d === null || (E = Wu(s, d), E != null && Y.push(
              pe(s, E, y)
            )), rl) break;
            s = s.return;
          }
          0 < Y.length && (h = new r(
            h,
            N,
            null,
            a,
            g
          ), T.push({ event: h, listeners: Y }));
        }
      }
      if ((t & 7) === 0) {
        l: {
          if (h = l === "mouseover" || l === "pointerover", r = l === "mouseout" || l === "pointerout", h && a !== vi && (N = a.relatedTarget || a.fromElement) && (uu(N) || N[au]))
            break l;
          if ((r || h) && (h = g.window === g ? g : (h = g.ownerDocument) ? h.defaultView || h.parentWindow : window, r ? (N = a.relatedTarget || a.toElement, r = m, N = N ? uu(N) : null, N !== null && (rl = J(N), Y = N.tag, N !== rl || Y !== 5 && Y !== 27 && Y !== 6) && (N = null)) : (r = null, N = m), r !== N)) {
            if (Y = Fc, E = "onMouseLeave", d = "onMouseEnter", s = "mouse", (l === "pointerout" || l === "pointerover") && (Y = Ic, E = "onPointerLeave", d = "onPointerEnter", s = "pointer"), rl = r == null ? h : wu(r), y = N == null ? h : wu(N), h = new Y(
              E,
              s + "leave",
              r,
              a,
              g
            ), h.target = rl, h.relatedTarget = y, E = null, uu(g) === m && (Y = new Y(
              d,
              s + "enter",
              N,
              a,
              g
            ), Y.target = y, Y.relatedTarget = rl, E = Y), rl = E, r && N)
              t: {
                for (Y = My, d = r, s = N, y = 0, E = d; E; E = Y(E))
                  y++;
                E = 0;
                for (var j = s; j; j = Y(j))
                  E++;
                for (; 0 < y - E; )
                  d = Y(d), y--;
                for (; 0 < E - y; )
                  s = Y(s), E--;
                for (; y--; ) {
                  if (d === s || s !== null && d === s.alternate) {
                    Y = d;
                    break t;
                  }
                  d = Y(d), s = Y(s);
                }
                Y = null;
              }
            else Y = null;
            r !== null && Vo(
              T,
              h,
              r,
              Y,
              !1
            ), N !== null && rl !== null && Vo(
              T,
              rl,
              N,
              Y,
              !0
            );
          }
        }
        l: {
          if (h = m ? wu(m) : window, r = h.nodeName && h.nodeName.toLowerCase(), r === "select" || r === "input" && h.type === "file")
            var nl = is;
          else if (es(h))
            if (fs)
              nl = xv;
            else {
              nl = qv;
              var H = jv;
            }
          else
            r = h.nodeName, !r || r.toLowerCase() !== "input" || h.type !== "checkbox" && h.type !== "radio" ? m && di(m.elementType) && (nl = is) : nl = Bv;
          if (nl && (nl = nl(l, m))) {
            ns(
              T,
              nl,
              a,
              g
            );
            break l;
          }
          H && H(l, h, m), l === "focusout" && m && h.type === "number" && m.memoizedProps.value != null && oi(h, "number", h.value);
        }
        switch (H = m ? wu(m) : window, l) {
          case "focusin":
            (es(H) || H.contentEditable === "true") && (vu = H, Oi = m, ae = null);
            break;
          case "focusout":
            ae = Oi = vu = null;
            break;
          case "mousedown":
            Mi = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            Mi = !1, hs(T, a, g);
            break;
          case "selectionchange":
            if (Gv) break;
          case "keydown":
          case "keyup":
            hs(T, a, g);
        }
        var K;
        if (zi)
          l: {
            switch (l) {
              case "compositionstart":
                var ll = "onCompositionStart";
                break l;
              case "compositionend":
                ll = "onCompositionEnd";
                break l;
              case "compositionupdate":
                ll = "onCompositionUpdate";
                break l;
            }
            ll = void 0;
          }
        else
          du ? as(l, a) && (ll = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (ll = "onCompositionStart");
        ll && (Pc && a.locale !== "ko" && (du || ll !== "onCompositionStart" ? ll === "onCompositionEnd" && du && (K = Wc()) : (da = g, ri = "value" in da ? da.value : da.textContent, du = !0)), H = Xn(m, ll), 0 < H.length && (ll = new kc(
          ll,
          l,
          null,
          a,
          g
        ), T.push({ event: ll, listeners: H }), K ? ll.data = K : (K = us(a), K !== null && (ll.data = K)))), (K = Uv ? Nv(l, a) : Rv(l, a)) && (ll = Xn(m, "onBeforeInput"), 0 < ll.length && (H = new kc(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          g
        ), T.push({
          event: H,
          listeners: ll
        }), H.data = K)), Ty(
          T,
          l,
          m,
          a,
          g
        );
      }
      Zo(T, t);
    });
  }
  function pe(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function Xn(l, t) {
    for (var a = t + "Capture", u = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = Wu(l, a), e != null && u.unshift(
        pe(l, e, n)
      ), e = Wu(l, t), e != null && u.push(
        pe(l, e, n)
      )), l.tag === 3) return u;
      l = l.return;
    }
    return [];
  }
  function My(l) {
    if (l === null) return null;
    do
      l = l.return;
    while (l && l.tag !== 5 && l.tag !== 27);
    return l || null;
  }
  function Vo(l, t, a, u, e) {
    for (var n = t._reactName, i = []; a !== null && a !== u; ) {
      var f = a, c = f.alternate, m = f.stateNode;
      if (f = f.tag, c !== null && c === u) break;
      f !== 5 && f !== 26 && f !== 27 || m === null || (c = m, e ? (m = Wu(a, n), m != null && i.unshift(
        pe(a, m, c)
      )) : e || (m = Wu(a, n), m != null && i.push(
        pe(a, m, c)
      ))), a = a.return;
    }
    i.length !== 0 && l.push({ event: t, listeners: i });
  }
  var py = /\r\n?/g, Dy = /\u0000|\uFFFD/g;
  function Ko(l) {
    return (typeof l == "string" ? l : "" + l).replace(py, `
`).replace(Dy, "");
  }
  function Jo(l, t) {
    return t = Ko(t), Ko(l) === t;
  }
  function hl(l, t, a, u, e, n) {
    switch (a) {
      case "children":
        typeof u == "string" ? t === "body" || t === "textarea" && u === "" || cu(l, u) : (typeof u == "number" || typeof u == "bigint") && t !== "body" && cu(l, "" + u);
        break;
      case "className":
        Ve(l, "class", u);
        break;
      case "tabIndex":
        Ve(l, "tabindex", u);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Ve(l, a, u);
        break;
      case "style":
        Kc(l, u, n);
        break;
      case "data":
        if (t !== "object") {
          Ve(l, "data", u);
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
        u = Je("" + u), l.setAttribute(a, u);
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
          typeof n == "function" && (a === "formAction" ? (t !== "input" && hl(l, t, "name", e.name, e, null), hl(
            l,
            t,
            "formEncType",
            e.formEncType,
            e,
            null
          ), hl(
            l,
            t,
            "formMethod",
            e.formMethod,
            e,
            null
          ), hl(
            l,
            t,
            "formTarget",
            e.formTarget,
            e,
            null
          )) : (hl(l, t, "encType", e.encType, e, null), hl(l, t, "method", e.method, e, null), hl(l, t, "target", e.target, e, null)));
        if (u == null || typeof u == "symbol" || typeof u == "boolean") {
          l.removeAttribute(a);
          break;
        }
        u = Je("" + u), l.setAttribute(a, u);
        break;
      case "onClick":
        u != null && (l.onclick = Kt);
        break;
      case "onScroll":
        u != null && I("scroll", l);
        break;
      case "onScrollEnd":
        u != null && I("scrollend", l);
        break;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(v(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(v(60));
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
        a = Je("" + u), l.setAttributeNS(
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
        I("beforetoggle", l), I("toggle", l), Le(l, "popover", u);
        break;
      case "xlinkActuate":
        Vt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          u
        );
        break;
      case "xlinkArcrole":
        Vt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          u
        );
        break;
      case "xlinkRole":
        Vt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          u
        );
        break;
      case "xlinkShow":
        Vt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          u
        );
        break;
      case "xlinkTitle":
        Vt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          u
        );
        break;
      case "xlinkType":
        Vt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          u
        );
        break;
      case "xmlBase":
        Vt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          u
        );
        break;
      case "xmlLang":
        Vt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          u
        );
        break;
      case "xmlSpace":
        Vt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          u
        );
        break;
      case "is":
        Le(l, "is", u);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N") && (a = av.get(a) || a, Le(l, a, u));
    }
  }
  function If(l, t, a, u, e, n) {
    switch (a) {
      case "style":
        Kc(l, u, n);
        break;
      case "dangerouslySetInnerHTML":
        if (u != null) {
          if (typeof u != "object" || !("__html" in u))
            throw Error(v(61));
          if (a = u.__html, a != null) {
            if (e.children != null) throw Error(v(60));
            l.innerHTML = a;
          }
        }
        break;
      case "children":
        typeof u == "string" ? cu(l, u) : (typeof u == "number" || typeof u == "bigint") && cu(l, "" + u);
        break;
      case "onScroll":
        u != null && I("scroll", l);
        break;
      case "onScrollEnd":
        u != null && I("scrollend", l);
        break;
      case "onClick":
        u != null && (l.onclick = Kt);
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
        if (!Bc.hasOwnProperty(a))
          l: {
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), t = a.slice(2, e ? a.length - 7 : void 0), n = l[nt] || null, n = n != null ? n[a] : null, typeof n == "function" && l.removeEventListener(t, n, e), typeof u == "function")) {
              typeof n != "function" && n !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(t, u, e);
              break l;
            }
            a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : Le(l, a, u);
          }
    }
  }
  function Il(l, t, a) {
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
        I("error", l), I("load", l);
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
                  throw Error(v(137, t));
                default:
                  hl(l, t, n, i, a, null);
              }
          }
        e && hl(l, t, "srcSet", a.srcSet, a, null), u && hl(l, t, "src", a.src, a, null);
        return;
      case "input":
        I("invalid", l);
        var f = n = i = e = null, c = null, m = null;
        for (u in a)
          if (a.hasOwnProperty(u)) {
            var g = a[u];
            if (g != null)
              switch (u) {
                case "name":
                  e = g;
                  break;
                case "type":
                  i = g;
                  break;
                case "checked":
                  c = g;
                  break;
                case "defaultChecked":
                  m = g;
                  break;
                case "value":
                  n = g;
                  break;
                case "defaultValue":
                  f = g;
                  break;
                case "children":
                case "dangerouslySetInnerHTML":
                  if (g != null)
                    throw Error(v(137, t));
                  break;
                default:
                  hl(l, t, u, g, a, null);
              }
          }
        Xc(
          l,
          n,
          f,
          c,
          m,
          i,
          e,
          !1
        );
        return;
      case "select":
        I("invalid", l), u = i = n = null;
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
                hl(l, t, e, f, a, null);
            }
        t = n, a = i, l.multiple = !!u, t != null ? fu(l, !!u, t, !1) : a != null && fu(l, !!u, a, !0);
        return;
      case "textarea":
        I("invalid", l), n = e = u = null;
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
                if (f != null) throw Error(v(91));
                break;
              default:
                hl(l, t, i, f, a, null);
            }
        Lc(l, u, e, n);
        return;
      case "option":
        for (c in a)
          if (a.hasOwnProperty(c) && (u = a[c], u != null))
            switch (c) {
              case "selected":
                l.selected = u && typeof u != "function" && typeof u != "symbol";
                break;
              default:
                hl(l, t, c, u, a, null);
            }
        return;
      case "dialog":
        I("beforetoggle", l), I("toggle", l), I("cancel", l), I("close", l);
        break;
      case "iframe":
      case "object":
        I("load", l);
        break;
      case "video":
      case "audio":
        for (u = 0; u < Me.length; u++)
          I(Me[u], l);
        break;
      case "image":
        I("error", l), I("load", l);
        break;
      case "details":
        I("toggle", l);
        break;
      case "embed":
      case "source":
      case "link":
        I("error", l), I("load", l);
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
        for (m in a)
          if (a.hasOwnProperty(m) && (u = a[m], u != null))
            switch (m) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(v(137, t));
              default:
                hl(l, t, m, u, a, null);
            }
        return;
      default:
        if (di(t)) {
          for (g in a)
            a.hasOwnProperty(g) && (u = a[g], u !== void 0 && If(
              l,
              t,
              g,
              u,
              a,
              void 0
            ));
          return;
        }
    }
    for (f in a)
      a.hasOwnProperty(f) && (u = a[f], u != null && hl(l, t, f, u, a, null));
  }
  function Uy(l, t, a, u) {
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
        var e = null, n = null, i = null, f = null, c = null, m = null, g = null;
        for (r in a) {
          var T = a[r];
          if (a.hasOwnProperty(r) && T != null)
            switch (r) {
              case "checked":
                break;
              case "value":
                break;
              case "defaultValue":
                c = T;
              default:
                u.hasOwnProperty(r) || hl(l, t, r, null, u, T);
            }
        }
        for (var h in u) {
          var r = u[h];
          if (T = a[h], u.hasOwnProperty(h) && (r != null || T != null))
            switch (h) {
              case "type":
                n = r;
                break;
              case "name":
                e = r;
                break;
              case "checked":
                m = r;
                break;
              case "defaultChecked":
                g = r;
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
                  throw Error(v(137, t));
                break;
              default:
                r !== T && hl(
                  l,
                  t,
                  h,
                  r,
                  u,
                  T
                );
            }
        }
        si(
          l,
          i,
          f,
          c,
          m,
          g,
          n,
          e
        );
        return;
      case "select":
        r = i = f = h = null;
        for (n in a)
          if (c = a[n], a.hasOwnProperty(n) && c != null)
            switch (n) {
              case "value":
                break;
              case "multiple":
                r = c;
              default:
                u.hasOwnProperty(n) || hl(
                  l,
                  t,
                  n,
                  null,
                  u,
                  c
                );
            }
        for (e in u)
          if (n = u[e], c = a[e], u.hasOwnProperty(e) && (n != null || c != null))
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
                n !== c && hl(
                  l,
                  t,
                  e,
                  n,
                  u,
                  c
                );
            }
        t = f, a = i, u = r, h != null ? fu(l, !!a, h, !1) : !!u != !!a && (t != null ? fu(l, !!a, t, !0) : fu(l, !!a, a ? [] : "", !1));
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
                hl(l, t, f, null, u, e);
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
                if (e != null) throw Error(v(91));
                break;
              default:
                e !== n && hl(l, t, i, e, u, n);
            }
        Zc(l, h, r);
        return;
      case "option":
        for (var N in a)
          if (h = a[N], a.hasOwnProperty(N) && h != null && !u.hasOwnProperty(N))
            switch (N) {
              case "selected":
                l.selected = !1;
                break;
              default:
                hl(
                  l,
                  t,
                  N,
                  null,
                  u,
                  h
                );
            }
        for (c in u)
          if (h = u[c], r = a[c], u.hasOwnProperty(c) && h !== r && (h != null || r != null))
            switch (c) {
              case "selected":
                l.selected = h && typeof h != "function" && typeof h != "symbol";
                break;
              default:
                hl(
                  l,
                  t,
                  c,
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
        for (var Y in a)
          h = a[Y], a.hasOwnProperty(Y) && h != null && !u.hasOwnProperty(Y) && hl(l, t, Y, null, u, h);
        for (m in u)
          if (h = u[m], r = a[m], u.hasOwnProperty(m) && h !== r && (h != null || r != null))
            switch (m) {
              case "children":
              case "dangerouslySetInnerHTML":
                if (h != null)
                  throw Error(v(137, t));
                break;
              default:
                hl(
                  l,
                  t,
                  m,
                  h,
                  u,
                  r
                );
            }
        return;
      default:
        if (di(t)) {
          for (var rl in a)
            h = a[rl], a.hasOwnProperty(rl) && h !== void 0 && !u.hasOwnProperty(rl) && If(
              l,
              t,
              rl,
              void 0,
              u,
              h
            );
          for (g in u)
            h = u[g], r = a[g], !u.hasOwnProperty(g) || h === r || h === void 0 && r === void 0 || If(
              l,
              t,
              g,
              h,
              u,
              r
            );
          return;
        }
    }
    for (var d in a)
      h = a[d], a.hasOwnProperty(d) && h != null && !u.hasOwnProperty(d) && hl(l, t, d, null, u, h);
    for (T in u)
      h = u[T], r = a[T], !u.hasOwnProperty(T) || h === r || h == null && r == null || hl(l, t, T, h, u, r);
  }
  function wo(l) {
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
  function Ny() {
    if (typeof performance.getEntriesByType == "function") {
      for (var l = 0, t = 0, a = performance.getEntriesByType("resource"), u = 0; u < a.length; u++) {
        var e = a[u], n = e.transferSize, i = e.initiatorType, f = e.duration;
        if (n && f && wo(i)) {
          for (i = 0, f = e.responseEnd, u += 1; u < a.length; u++) {
            var c = a[u], m = c.startTime;
            if (m > f) break;
            var g = c.transferSize, T = c.initiatorType;
            g && wo(T) && (c = c.responseEnd, i += g * (c < f ? 1 : (f - m) / (c - m)));
          }
          if (--u, t += 8 * (n + i) / (e.duration / 1e3), l++, 10 < l) break;
        }
      }
      if (0 < l) return t / l / 1e6;
    }
    return navigator.connection && (l = navigator.connection.downlink, typeof l == "number") ? l : 5;
  }
  var Pf = null, lc = null;
  function Zn(l) {
    return l.nodeType === 9 ? l : l.ownerDocument;
  }
  function Wo(l) {
    switch (l) {
      case "http://www.w3.org/2000/svg":
        return 1;
      case "http://www.w3.org/1998/Math/MathML":
        return 2;
      default:
        return 0;
    }
  }
  function $o(l, t) {
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
  function tc(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var ac = null;
  function Ry() {
    var l = window.event;
    return l && l.type === "popstate" ? l === ac ? !1 : (ac = l, !0) : (ac = null, !1);
  }
  var Fo = typeof setTimeout == "function" ? setTimeout : void 0, Hy = typeof clearTimeout == "function" ? clearTimeout : void 0, ko = typeof Promise == "function" ? Promise : void 0, Cy = typeof queueMicrotask == "function" ? queueMicrotask : typeof ko < "u" ? function(l) {
    return ko.resolve(null).then(l).catch(jy);
  } : Fo;
  function jy(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function Da(l) {
    return l === "head";
  }
  function Io(l, t) {
    var a = t, u = 0;
    do {
      var e = a.nextSibling;
      if (l.removeChild(a), e && e.nodeType === 8)
        if (a = e.data, a === "/$" || a === "/&") {
          if (u === 0) {
            l.removeChild(e), Gu(t);
            return;
          }
          u--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          u++;
        else if (a === "html")
          De(l.ownerDocument.documentElement);
        else if (a === "head") {
          a = l.ownerDocument.head, De(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, f = n.nodeName;
            n[Ju] || f === "SCRIPT" || f === "STYLE" || f === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && De(l.ownerDocument.body);
      a = e;
    } while (a);
    Gu(t);
  }
  function Po(l, t) {
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
  function uc(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          uc(a), fi(a);
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
  function qy(l, t, a, u) {
    for (; l.nodeType === 1; ) {
      var e = a;
      if (l.nodeName.toLowerCase() !== t.toLowerCase()) {
        if (!u && (l.nodeName !== "INPUT" || l.type !== "hidden"))
          break;
      } else if (u) {
        if (!l[Ju])
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
      if (l = Rt(l.nextSibling), l === null) break;
    }
    return null;
  }
  function By(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Rt(l.nextSibling), l === null)) return null;
    return l;
  }
  function ld(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Rt(l.nextSibling), l === null)) return null;
    return l;
  }
  function ec(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function nc(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function xy(l, t) {
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
  function Rt(l) {
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
  var ic = null;
  function td(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "/$" || a === "/&") {
          if (t === 0)
            return Rt(l.nextSibling);
          t--;
        } else
          a !== "$" && a !== "$!" && a !== "$?" && a !== "$~" && a !== "&" || t++;
      }
      l = l.nextSibling;
    }
    return null;
  }
  function ad(l) {
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
  function ud(l, t, a) {
    switch (t = Zn(a), l) {
      case "html":
        if (l = t.documentElement, !l) throw Error(v(452));
        return l;
      case "head":
        if (l = t.head, !l) throw Error(v(453));
        return l;
      case "body":
        if (l = t.body, !l) throw Error(v(454));
        return l;
      default:
        throw Error(v(451));
    }
  }
  function De(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    fi(l);
  }
  var Ht = /* @__PURE__ */ new Map(), ed = /* @__PURE__ */ new Set();
  function Ln(l) {
    return typeof l.getRootNode == "function" ? l.getRootNode() : l.nodeType === 9 ? l : l.ownerDocument;
  }
  var fa = O.d;
  O.d = {
    f: Yy,
    r: Gy,
    D: Qy,
    C: Xy,
    L: Zy,
    m: Ly,
    X: Ky,
    S: Vy,
    M: Jy
  };
  function Yy() {
    var l = fa.f(), t = jn();
    return l || t;
  }
  function Gy(l) {
    var t = eu(l);
    t !== null && t.tag === 5 && t.type === "form" ? E0(t) : fa.r(l);
  }
  var Bu = typeof document > "u" ? null : document;
  function nd(l, t, a) {
    var u = Bu;
    if (u && typeof t == "string" && t) {
      var e = At(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), ed.has(e) || (ed.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), Il(t, "link", l), Kl(t), u.head.appendChild(t)));
    }
  }
  function Qy(l) {
    fa.D(l), nd("dns-prefetch", l, null);
  }
  function Xy(l, t) {
    fa.C(l, t), nd("preconnect", l, t);
  }
  function Zy(l, t, a) {
    fa.L(l, t, a);
    var u = Bu;
    if (u && l && t) {
      var e = 'link[rel="preload"][as="' + At(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (e += '[imagesrcset="' + At(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (e += '[imagesizes="' + At(
        a.imageSizes
      ) + '"]')) : e += '[href="' + At(l) + '"]';
      var n = e;
      switch (t) {
        case "style":
          n = xu(l);
          break;
        case "script":
          n = Yu(l);
      }
      Ht.has(n) || (l = C(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Ht.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(Ue(n)) || t === "script" && u.querySelector(Ne(n)) || (t = u.createElement("link"), Il(t, "link", l), Kl(t), u.head.appendChild(t)));
    }
  }
  function Ly(l, t) {
    fa.m(l, t);
    var a = Bu;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + At(u) + '"][href="' + At(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = Yu(l);
      }
      if (!Ht.has(n) && (l = C({ rel: "modulepreload", href: l }, t), Ht.set(n, l), a.querySelector(e) === null)) {
        switch (u) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(Ne(n)))
              return;
        }
        u = a.createElement("link"), Il(u, "link", l), Kl(u), a.head.appendChild(u);
      }
    }
  }
  function Vy(l, t, a) {
    fa.S(l, t, a);
    var u = Bu;
    if (u && l) {
      var e = nu(u).hoistableStyles, n = xu(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var f = { loading: 0, preload: null };
        if (i = u.querySelector(
          Ue(n)
        ))
          f.loading = 5;
        else {
          l = C(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = Ht.get(n)) && fc(l, a);
          var c = i = u.createElement("link");
          Kl(c), Il(c, "link", l), c._p = new Promise(function(m, g) {
            c.onload = m, c.onerror = g;
          }), c.addEventListener("load", function() {
            f.loading |= 1;
          }), c.addEventListener("error", function() {
            f.loading |= 2;
          }), f.loading |= 4, Vn(i, t, u);
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
  function Ky(l, t) {
    fa.X(l, t);
    var a = Bu;
    if (a && l) {
      var u = nu(a).hoistableScripts, e = Yu(l), n = u.get(e);
      n || (n = a.querySelector(Ne(e)), n || (l = C({ src: l, async: !0 }, t), (t = Ht.get(e)) && cc(l, t), n = a.createElement("script"), Kl(n), Il(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Jy(l, t) {
    fa.M(l, t);
    var a = Bu;
    if (a && l) {
      var u = nu(a).hoistableScripts, e = Yu(l), n = u.get(e);
      n || (n = a.querySelector(Ne(e)), n || (l = C({ src: l, async: !0, type: "module" }, t), (t = Ht.get(e)) && cc(l, t), n = a.createElement("script"), Kl(n), Il(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function id(l, t, a, u) {
    var e = (e = w.current) ? Ln(e) : null;
    if (!e) throw Error(v(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (t = xu(a.href), a = nu(
          e
        ).hoistableStyles, u = a.get(t), u || (u = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, a.set(t, u)), u) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = xu(a.href);
          var n = nu(
            e
          ).hoistableStyles, i = n.get(l);
          if (i || (e = e.ownerDocument || e, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = e.querySelector(
            Ue(l)
          )) && !n._p && (i.instance = n, i.state.loading = 5), Ht.has(l) || (a = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Ht.set(l, a), n || wy(
            e,
            l,
            a,
            i.state
          ))), t && u === null)
            throw Error(v(528, ""));
          return i;
        }
        if (t && u !== null)
          throw Error(v(529, ""));
        return null;
      case "script":
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = Yu(a), a = nu(
          e
        ).hoistableScripts, u = a.get(t), u || (u = {
          type: "script",
          instance: null,
          count: 0,
          state: null
        }, a.set(t, u)), u) : { type: "void", instance: null, count: 0, state: null };
      default:
        throw Error(v(444, l));
    }
  }
  function xu(l) {
    return 'href="' + At(l) + '"';
  }
  function Ue(l) {
    return 'link[rel="stylesheet"][' + l + "]";
  }
  function fd(l) {
    return C({}, l, {
      "data-precedence": l.precedence,
      precedence: null
    });
  }
  function wy(l, t, a, u) {
    l.querySelector('link[rel="preload"][as="style"][' + t + "]") ? u.loading = 1 : (t = l.createElement("link"), u.preload = t, t.addEventListener("load", function() {
      return u.loading |= 1;
    }), t.addEventListener("error", function() {
      return u.loading |= 2;
    }), Il(t, "link", a), Kl(t), l.head.appendChild(t));
  }
  function Yu(l) {
    return '[src="' + At(l) + '"]';
  }
  function Ne(l) {
    return "script[async]" + l;
  }
  function cd(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + At(a.href) + '"]'
          );
          if (u)
            return t.instance = u, Kl(u), u;
          var e = C({}, a, {
            "data-href": a.href,
            "data-precedence": a.precedence,
            href: null,
            precedence: null
          });
          return u = (l.ownerDocument || l).createElement(
            "style"
          ), Kl(u), Il(u, "style", e), Vn(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = xu(a.href);
          var n = l.querySelector(
            Ue(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, Kl(n), n;
          u = fd(a), (e = Ht.get(e)) && fc(u, e), n = (l.ownerDocument || l).createElement("link"), Kl(n);
          var i = n;
          return i._p = new Promise(function(f, c) {
            i.onload = f, i.onerror = c;
          }), Il(n, "link", u), t.state.loading |= 4, Vn(n, a.precedence, l), t.instance = n;
        case "script":
          return n = Yu(a.src), (e = l.querySelector(
            Ne(n)
          )) ? (t.instance = e, Kl(e), e) : (u = a, (e = Ht.get(n)) && (u = C({}, a), cc(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), Kl(e), Il(e, "link", u), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(v(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (u = t.instance, t.state.loading |= 4, Vn(u, a.precedence, l));
    return t.instance;
  }
  function Vn(l, t, a) {
    for (var u = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), e = u.length ? u[u.length - 1] : null, n = e, i = 0; i < u.length; i++) {
      var f = u[i];
      if (f.dataset.precedence === t) n = f;
      else if (n !== e) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function fc(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function cc(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var Kn = null;
  function sd(l, t, a) {
    if (Kn === null) {
      var u = /* @__PURE__ */ new Map(), e = Kn = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = Kn, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[Ju] || n[Wl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
        var i = n.getAttribute(t) || "";
        i = l + i;
        var f = u.get(i);
        f ? f.push(n) : u.set(i, [n]);
      }
    }
    return u;
  }
  function od(l, t, a) {
    l = l.ownerDocument || l, l.head.insertBefore(
      a,
      t === "title" ? l.querySelector("head > title") : null
    );
  }
  function Wy(l, t, a) {
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
  function dd(l) {
    return !(l.type === "stylesheet" && (l.state.loading & 3) === 0);
  }
  function $y(l, t, a, u) {
    if (a.type === "stylesheet" && (typeof u.media != "string" || matchMedia(u.media).matches !== !1) && (a.state.loading & 4) === 0) {
      if (a.instance === null) {
        var e = xu(u.href), n = t.querySelector(
          Ue(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = Jn.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, Kl(n);
          return;
        }
        n = t.ownerDocument || t, u = fd(u), (e = Ht.get(e)) && fc(u, e), n = n.createElement("link"), Kl(n);
        var i = n;
        i._p = new Promise(function(f, c) {
          i.onload = f, i.onerror = c;
        }), Il(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = Jn.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var sc = 0;
  function Fy(l, t) {
    return l.stylesheets && l.count === 0 && Wn(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && Wn(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && sc === 0 && (sc = 62500 * Ny());
      var e = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && Wn(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > sc ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(u), clearTimeout(e);
      };
    } : null;
  }
  function Jn() {
    if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
      if (this.stylesheets) Wn(this, this.stylesheets);
      else if (this.unsuspend) {
        var l = this.unsuspend;
        this.unsuspend = null, l();
      }
    }
  }
  var wn = null;
  function Wn(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, wn = /* @__PURE__ */ new Map(), t.forEach(ky, l), wn = null, Jn.call(l));
  }
  function ky(l, t) {
    if (!(t.state.loading & 4)) {
      var a = wn.get(l);
      if (a) var u = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), wn.set(l, a);
        for (var e = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < e.length; n++) {
          var i = e[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), u = i);
        }
        u && a.set(null, u);
      }
      e = t.instance, i = e.getAttribute("data-precedence"), n = a.get(i) || u, n === u && a.set(null, e), a.set(i, e), this.count++, u = Jn.bind(this), e.addEventListener("load", u), e.addEventListener("error", u), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var Re = {
    $$typeof: Ol,
    Provider: null,
    Consumer: null,
    _currentValue: B,
    _currentValue2: B,
    _threadCount: 0
  };
  function Iy(l, t, a, u, e, n, i, f, c) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = ui(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ui(0), this.hiddenUpdates = ui(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.incompleteTransitions = /* @__PURE__ */ new Map();
  }
  function vd(l, t, a, u, e, n, i, f, c, m, g, T) {
    return l = new Iy(
      l,
      t,
      a,
      i,
      c,
      m,
      g,
      T,
      f
    ), t = 1, n === !0 && (t |= 24), n = rt(3, null, null, t), l.current = n, n.stateNode = l, t = Xi(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, Ki(n), l;
  }
  function yd(l) {
    return l ? (l = hu, l) : hu;
  }
  function md(l, t, a, u, e, n) {
    e = yd(e), u.context === null ? u.context = e : u.pendingContext = e, u = Sa(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = ga(l, u, t), a !== null && (dt(a, l, t), se(a, l, t));
  }
  function hd(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function oc(l, t) {
    hd(l, t), (l = l.alternate) && hd(l, t);
  }
  function rd(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Qa(l, 67108864);
      t !== null && dt(t, l, 67108864), oc(l, 67108864);
    }
  }
  function Sd(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = zt();
      t = ei(t);
      var a = Qa(l, t);
      a !== null && dt(a, l, t), oc(l, t);
    }
  }
  var $n = !0;
  function Py(l, t, a, u) {
    var e = S.T;
    S.T = null;
    var n = O.p;
    try {
      O.p = 2, dc(l, t, a, u);
    } finally {
      O.p = n, S.T = e;
    }
  }
  function lm(l, t, a, u) {
    var e = S.T;
    S.T = null;
    var n = O.p;
    try {
      O.p = 8, dc(l, t, a, u);
    } finally {
      O.p = n, S.T = e;
    }
  }
  function dc(l, t, a, u) {
    if ($n) {
      var e = vc(u);
      if (e === null)
        kf(
          l,
          t,
          u,
          Fn,
          a
        ), bd(l, u);
      else if (am(
        e,
        l,
        t,
        a,
        u
      ))
        u.stopPropagation();
      else if (bd(l, u), t & 4 && -1 < tm.indexOf(l)) {
        for (; e !== null; ) {
          var n = eu(e);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = qa(n.pendingLanes);
                  if (i !== 0) {
                    var f = n;
                    for (f.pendingLanes |= 2, f.entangledLanes |= 2; i; ) {
                      var c = 1 << 31 - mt(i);
                      f.entanglements[1] |= c, i &= ~c;
                    }
                    Zt(n), (fl & 6) === 0 && (Hn = Tl() + 500, Oe(0));
                  }
                }
                break;
              case 31:
              case 13:
                f = Qa(n, 2), f !== null && dt(f, n, 2), jn(), oc(n, 2);
            }
          if (n = vc(u), n === null && kf(
            l,
            t,
            u,
            Fn,
            a
          ), n === e) break;
          e = n;
        }
        e !== null && u.stopPropagation();
      } else
        kf(
          l,
          t,
          u,
          null,
          a
        );
    }
  }
  function vc(l) {
    return l = yi(l), yc(l);
  }
  var Fn = null;
  function yc(l) {
    if (Fn = null, l = uu(l), l !== null) {
      var t = J(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = W(t), l !== null) return l;
          l = null;
        } else if (a === 31) {
          if (l = cl(t), l !== null) return l;
          l = null;
        } else if (a === 3) {
          if (t.stateNode.current.memoizedState.isDehydrated)
            return t.tag === 3 ? t.stateNode.containerInfo : null;
          l = null;
        } else t !== l && (l = null);
      }
    }
    return Fn = l, null;
  }
  function gd(l) {
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
        switch (Zu()) {
          case Oc:
            return 2;
          case Mc:
            return 8;
          case Ye:
          case Xd:
            return 32;
          case pc:
            return 268435456;
          default:
            return 32;
        }
      default:
        return 32;
    }
  }
  var mc = !1, Ua = null, Na = null, Ra = null, He = /* @__PURE__ */ new Map(), Ce = /* @__PURE__ */ new Map(), Ha = [], tm = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function bd(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        Ua = null;
        break;
      case "dragenter":
      case "dragleave":
        Na = null;
        break;
      case "mouseover":
      case "mouseout":
        Ra = null;
        break;
      case "pointerover":
      case "pointerout":
        He.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        Ce.delete(t.pointerId);
    }
  }
  function je(l, t, a, u, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: u,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = eu(t), t !== null && rd(t)), l) : (l.eventSystemFlags |= u, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function am(l, t, a, u, e) {
    switch (t) {
      case "focusin":
        return Ua = je(
          Ua,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "dragenter":
        return Na = je(
          Na,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "mouseover":
        return Ra = je(
          Ra,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return He.set(
          n,
          je(
            He.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, Ce.set(
          n,
          je(
            Ce.get(n) || null,
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
  function Ed(l) {
    var t = uu(l.target);
    if (t !== null) {
      var a = J(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = W(a), t !== null) {
            l.blockedOn = t, Cc(l.priority, function() {
              Sd(a);
            });
            return;
          }
        } else if (t === 31) {
          if (t = cl(a), t !== null) {
            l.blockedOn = t, Cc(l.priority, function() {
              Sd(a);
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
  function kn(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = vc(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var u = new a.constructor(
          a.type,
          a
        );
        vi = u, a.target.dispatchEvent(u), vi = null;
      } else
        return t = eu(a), t !== null && rd(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function zd(l, t, a) {
    kn(l) && a.delete(t);
  }
  function um() {
    mc = !1, Ua !== null && kn(Ua) && (Ua = null), Na !== null && kn(Na) && (Na = null), Ra !== null && kn(Ra) && (Ra = null), He.forEach(zd), Ce.forEach(zd);
  }
  function In(l, t) {
    l.blockedOn === t && (l.blockedOn = null, mc || (mc = !0, _.unstable_scheduleCallback(
      _.unstable_NormalPriority,
      um
    )));
  }
  var Pn = null;
  function Td(l) {
    Pn !== l && (Pn = l, _.unstable_scheduleCallback(
      _.unstable_NormalPriority,
      function() {
        Pn === l && (Pn = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], u = l[t + 1], e = l[t + 2];
          if (typeof u != "function") {
            if (yc(u || a) === null)
              continue;
            break;
          }
          var n = eu(a);
          n !== null && (l.splice(t, 3), t -= 3, vf(
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
  function Gu(l) {
    function t(c) {
      return In(c, l);
    }
    Ua !== null && In(Ua, l), Na !== null && In(Na, l), Ra !== null && In(Ra, l), He.forEach(t), Ce.forEach(t);
    for (var a = 0; a < Ha.length; a++) {
      var u = Ha[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < Ha.length && (a = Ha[0], a.blockedOn === null); )
      Ed(a), a.blockedOn === null && Ha.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[nt] || null;
        if (typeof n == "function")
          i || Td(a);
        else if (i) {
          var f = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[nt] || null)
              f = i.formAction;
            else if (yc(e) !== null) continue;
          } else f = i.action;
          typeof f == "function" ? a[u + 1] = f : (a.splice(u, 3), u -= 3), Td(a);
        }
      }
  }
  function _d() {
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
  function hc(l) {
    this._internalRoot = l;
  }
  li.prototype.render = hc.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(v(409));
    var a = t.current, u = zt();
    md(a, u, l, t, null, null);
  }, li.prototype.unmount = hc.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      md(l.current, 2, null, l, null, null), jn(), t[au] = null;
    }
  };
  function li(l) {
    this._internalRoot = l;
  }
  li.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = Hc();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < Ha.length && t !== 0 && t < Ha[a].priority; a++) ;
      Ha.splice(a, 0, l), a === 0 && Ed(l);
    }
  };
  var Ad = q.version;
  if (Ad !== "19.2.0")
    throw Error(
      v(
        527,
        Ad,
        "19.2.0"
      )
    );
  O.findDOMNode = function(l) {
    var t = l._reactInternals;
    if (t === void 0)
      throw typeof l.render == "function" ? Error(v(188)) : (l = Object.keys(l).join(","), Error(v(268, l)));
    return l = b(t), l = l !== null ? G(l) : null, l = l === null ? null : l.stateNode, l;
  };
  var em = {
    bundleType: 0,
    version: "19.2.0",
    rendererPackageName: "react-dom",
    currentDispatcherRef: S,
    reconcilerVersion: "19.2.0"
  };
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
    var ti = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!ti.isDisabled && ti.supportsFiber)
      try {
        Lu = ti.inject(
          em
        ), yt = ti;
      } catch {
      }
  }
  return Be.createRoot = function(l, t) {
    if (!F(l)) throw Error(v(299));
    var a = !1, u = "", e = N0, n = R0, i = H0;
    return t != null && (t.unstable_strictMode === !0 && (a = !0), t.identifierPrefix !== void 0 && (u = t.identifierPrefix), t.onUncaughtError !== void 0 && (e = t.onUncaughtError), t.onCaughtError !== void 0 && (n = t.onCaughtError), t.onRecoverableError !== void 0 && (i = t.onRecoverableError)), t = vd(
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
      _d
    ), l[au] = t.current, Ff(l), new hc(t);
  }, Be.hydrateRoot = function(l, t, a) {
    if (!F(l)) throw Error(v(299));
    var u = !1, e = "", n = N0, i = R0, f = H0, c = null;
    return a != null && (a.unstable_strictMode === !0 && (u = !0), a.identifierPrefix !== void 0 && (e = a.identifierPrefix), a.onUncaughtError !== void 0 && (n = a.onUncaughtError), a.onCaughtError !== void 0 && (i = a.onCaughtError), a.onRecoverableError !== void 0 && (f = a.onRecoverableError), a.formState !== void 0 && (c = a.formState)), t = vd(
      l,
      1,
      !0,
      t,
      a ?? null,
      u,
      e,
      c,
      n,
      i,
      f,
      _d
    ), t.context = yd(null), a = t.current, u = zt(), u = ei(u), e = Sa(u), e.callback = null, ga(a, e, u), a = u, t.current.lanes = a, Ku(t, a), Zt(t), l[au] = t.current, Ff(l), new li(t);
  }, Be.version = "19.2.0", Be;
}
var jd;
function mm() {
  if (jd) return Sc.exports;
  jd = 1;
  function _() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(_);
      } catch (q) {
        console.error(q);
      }
  }
  return _(), Sc.exports = ym(), Sc.exports;
}
var hm = mm(), Cl = Ac();
class Qu extends Error {
  constructor(q, R) {
    super(R), this.status = q, this.code = R;
  }
}
let Gd = "";
async function ut(_, q, R, v) {
  var M;
  const F = new AbortController();
  let J = !1;
  const W = () => F.abort(R == null ? void 0 : R.reason);
  R != null && R.aborted ? W() : R == null || R.addEventListener("abort", W, { once: !0 });
  const cl = v === void 0 ? void 0 : setTimeout(() => {
    J = !0, F.abort();
  }, v);
  try {
    const b = await fetch("/api/v1/" + _, {
      method: q === void 0 ? "GET" : "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: F.signal,
      headers: { "X-Request-ID": crypto.randomUUID(), ...q === void 0 ? {} : { "Content-Type": "application/json", "X-CSRF-Token": Gd } },
      body: q === void 0 ? void 0 : JSON.stringify(q)
    }), G = await b.json().catch(() => null);
    if (J) throw new Qu(0, "REQUEST_TIMEOUT");
    if (!b.ok) throw new Qu(b.status, ((M = G == null ? void 0 : G.error) == null ? void 0 : M.code) ?? `HTTP_${b.status}`);
    return G;
  } catch (b) {
    throw J ? new Qu(0, "REQUEST_TIMEOUT") : b;
  } finally {
    clearTimeout(cl), R == null || R.removeEventListener("abort", W);
  }
}
async function rm() {
  const _ = await ut("auth/me");
  return Gd = _.csrf_token, _;
}
const Sm = { QUICK_LOGIN_DISABLED: "이 서버에서는 바로 로그인이 꺼져 있습니다.", QUICK_LOGIN_UNAVAILABLE: "공용 SIM 계정을 사용할 수 없습니다. 관리자에게 확인해 주세요.", RATE_LIMITED: "접속 요청이 많습니다. 잠시 후 다시 눌러 주세요.", UNAUTHENTICATED: "세션이 만료되었습니다. 다시 로그인해 주세요.", FORBIDDEN: "이 작업의 권한이 없습니다.", REVISION_CONFLICT: "다른 사용자가 수정했습니다. 최신 내용과 초안을 비교해 주세요.", ID_CONFLICT: "요청 번호가 이미 다른 내용으로 저장되어 있습니다.", INVALID_SELECTION: "등록되지 않은 구역이 포함되어 있습니다.", MAP_UNAVAILABLE: "지도 연결이 중단되었습니다.", INVALID_CONTRACT: "입력 형식이나 범위를 확인해 주세요.", ORIGIN_REJECTED: "허용된 HTTPS 주소로 접속해 주세요.", APPEARANCE_REQUIRED: "상의와 하의 색상을 입력해 주세요." };
function qd(_) {
  return _ instanceof Qu ? Sm[_.code] ?? _.code : _ instanceof Error ? _.message : "서버 연결을 확인해 주세요.";
}
const Bd = "campus-04e1b46514574d45", _c = { altitude_m: 30, speed_mps: 3, observation_seconds: 3, return_reserve_percent: 20, priority_mode: "UNIFORM" }, ai = [
  { id: "zone-106c8e3a7e32", name: "생활구역" },
  { id: "zone-0bb1b42ef9e7", name: "강의·연구구역" },
  { id: "zone-633e575ab1ca-c-89106-799958", name: "지원구역" }
];
function gm(_) {
  return !!_ && Object.entries(_c).every(([q, R]) => _[q] === R);
}
function bm(_) {
  var q;
  return ((q = ai.find((R) => R.id === _.source_features.source_id)) == null ? void 0 : q.name) ?? _.source_features.name ?? _.source_features.source_id ?? _.region_id;
}
function xd([_, q]) {
  const v = 0.0066943799901413165, F = 0.9996, J = q * Math.PI / 180, W = (_ - 129) * Math.PI / 180, cl = v / (1 - v), M = Math.sin(J), b = Math.cos(J), G = Math.tan(J), C = 6378137 / Math.sqrt(1 - v * M * M), L = G * G, Sl = cl * b * b, sl = b * W, Ul = 6378137 * ((1 - v / 4 - 3 * v ** 2 / 64 - 5 * v ** 3 / 256) * J - (3 * v / 8 + 3 * v ** 2 / 32 + 45 * v ** 3 / 1024) * Math.sin(2 * J) + (15 * v ** 2 / 256 + 45 * v ** 3 / 1024) * Math.sin(4 * J) - 35 * v ** 3 / 3072 * Math.sin(6 * J));
  return [5e5 + F * C * (sl + (1 - L + Sl) * sl ** 3 / 6 + (5 - 18 * L + L * L + 72 * Sl - 58 * cl) * sl ** 5 / 120), F * (Ul + C * G * (sl * sl / 2 + (5 - L + 9 * Sl + 4 * Sl * Sl) * sl ** 4 / 24 + (61 - 58 * L + L * L + 600 * Sl - 330 * cl) * sl ** 6 / 720))];
}
function Em(_) {
  var Nl;
  const q = (Nl = _.result) == null ? void 0 : Nl.execution;
  if (!q) return null;
  const R = xd(q.originGeographic), F = (q.targetGeometry.type === "Polygon" ? [q.targetGeometry.coordinates] : q.targetGeometry.coordinates).flat().map((al) => al.map((Ol) => {
    const El = xd(Ol);
    return [El[0] - R[0], El[1] - R[1]];
  })), J = q.legs.flatMap((al) => al.phases), W = J.length ? [J[0].start, ...J.map((al) => al.end)] : [], cl = (al) => [al[1], al[0]], M = [W.map(cl), q.ingressPath.map(cl), q.returnPath.map(cl)], b = [...F.flat(), ...M.flat()];
  if (!b.length) return null;
  const G = Math.min(...b.map((al) => al[0])), C = Math.max(...b.map((al) => al[0])), L = Math.min(...b.map((al) => al[1])), Sl = Math.max(...b.map((al) => al[1])), sl = Math.min(720 / Math.max(1, C - G), 480 / Math.max(1, Sl - L)), Ul = (al) => [40 + (al[0] - G) * sl, 520 - (al[1] - L) * sl], $ = (al) => al.map((Ol, El) => `${El ? "L" : "M"}${Ul(Ol).map((lt) => lt.toFixed(2)).join(",")}`).join(" ");
  return { target: F.map((al) => $(al) + "Z").join(" "), route: $(M[0]), ingress: $(M[1]), returning: $(M[2]), entry: Ul(cl(q.entryNed)), finish: M[0].length ? Ul(M[0].at(-1)) : null };
}
const zm = { QUEUED: "계산 대기", RUNNING: "계산 중", READY: "경로 준비 완료", INCOMPLETE: "목표 또는 계산 한도 미달", FAILED: "계산 실패" }, Tm = { REGIONAL_SEARCH_CONDITIONS_MISMATCH: "저장된 임무 조건이 지역수색 프로파일과 다릅니다.", REGIONAL_SEARCH_INPUT_NOT_REGISTERED: "이 공간자료는 학교 서버의 지역수색 입력으로 등록되지 않았습니다.", REGIONAL_SEARCH_REGION_NOT_REGISTERED: "이 구역은 등록된 수색 입력에 없습니다.", REGION_REVISION_MISMATCH: "구역 개정이 변경되었습니다. 임무를 다시 불러와 주세요." }, xe = (_) => _ instanceof Qu ? Tm[_.code] ?? qd(_) : qd(_), Yd = (_) => typeof _ == "number" && Number.isFinite(_) ? `${_.toFixed(1)}초` : "—";
function _m() {
  var pl, ca, ja, lu, Xu, xt;
  const [_, q] = Cl.useState(null), [R, v] = Cl.useState([]), [F, J] = Cl.useState(null), [W, cl] = Cl.useState(""), [M, b] = Cl.useState(null), [G, C] = Cl.useState([]), [L, Sl] = Cl.useState(""), [sl, Ul] = Cl.useState(ai[0].id), [$, Nl] = Cl.useState(null), [al, Ol] = Cl.useState([]), [El, lt] = Cl.useState(!1), [Ml, V] = Cl.useState(!0), [wl, Bl] = Cl.useState(""), [Lt, tt] = Cl.useState(""), vl = Cl.useRef(0), Ct = Cl.useRef(!1), bl = Cl.useRef(!0), Vl = M == null ? void 0 : M.mission, S = (Vl == null ? void 0 : Vl.draft_revision) ?? 0, O = !!(_ != null && _.permissions.some((U) => U.drone_id === ((Vl == null ? void 0 : Vl.drone_id) ?? "sim-pi-01") && U.scopes.includes("edit"))), B = !M || ((pl = M.spatial_draft) == null ? void 0 : pl.release_id) === Bd, el = !M || gm((ca = M.spatial_draft) == null ? void 0 : ca.conditions), ul = !!$ && ["QUEUED", "RUNNING"].includes($.state);
  async function o(U = "") {
    const zl = await ut("mission-workspaces?limit=50&after=" + encodeURIComponent(U));
    bl.current && (v((Xl) => U ? [...Xl, ...zl.items] : zl.items), J(zl.next_cursor));
  }
  Cl.useEffect(() => (bl.current = !0, rm().then(async (U) => {
    bl.current && (q(U), await o());
  }).catch((U) => {
    bl.current && Bl(xe(U));
  }).finally(() => {
    bl.current && V(!1);
  }), () => {
    bl.current = !1, vl.current++;
  }), []);
  async function z(U, zl) {
    const Xl = ++vl.current;
    if (cl(U), b(null), C([]), Sl(""), Nl(null), Ol([]), Bl(""), tt(""), V(!!U), !!U)
      try {
        const [Zl, Yt, Tt] = await Promise.all([ut(`missions/${U}/workspace`), ut(`missions/${U}/regions`), ut(`missions/${U}/regional-search`)]);
        if (!bl.current || Xl !== vl.current) return;
        const et = Yt.filter((Tl) => Tl.mission_revision === Zl.mission.draft_revision), vt = et.find((Tl) => Tl.region_id === zl) ?? et[0];
        b(Zl), C(et), Sl((vt == null ? void 0 : vt.region_id) ?? ""), Ol(Tt);
        const tu = Tt.find((Tl) => Tl.mission_revision === Zl.mission.draft_revision && Tl.region_id === (vt == null ? void 0 : vt.region_id));
        if (tu) {
          const Tl = await ut(`missions/${U}/regional-search/${tu.job_id}`);
          bl.current && Xl === vl.current && Nl(Tl);
        }
      } catch (Zl) {
        bl.current && Xl === vl.current && Bl(xe(Zl));
      } finally {
        bl.current && Xl === vl.current && V(!1);
      }
  }
  async function p(U) {
    const zl = ++vl.current;
    Sl(U), Nl(null), Bl(""), tt("");
    const Xl = al.find((Zl) => Zl.mission_revision === S && Zl.region_id === U);
    if (Xl) {
      V(!0);
      try {
        const Zl = await ut(`missions/${W}/regional-search/${Xl.job_id}`);
        bl.current && zl === vl.current && Nl(Zl);
      } catch (Zl) {
        bl.current && zl === vl.current && Bl(xe(Zl));
      } finally {
        bl.current && zl === vl.current && V(!1);
      }
    }
  }
  Cl.useEffect(() => {
    if (!$ || !ul || !W) return;
    let U = !1, zl;
    const Xl = new AbortController(), Zl = vl.current, Yt = $.job_id;
    async function Tt() {
      try {
        const et = await ut(`missions/${W}/regional-search/${Yt}`, void 0, Xl.signal, 1e4);
        !U && Zl === vl.current && (Nl(et), Bl(""));
      } catch (et) {
        !U && Zl === vl.current && Bl("계산 상태 조회 지연 · 계산을 다시 제출하지 않습니다. " + xe(et));
      } finally {
        U || (zl = setTimeout(Tt, 2e3));
      }
    }
    return zl = setTimeout(Tt, 1e3), () => {
      U = !0, Xl.abort(), clearTimeout(zl);
    };
  }, [$ == null ? void 0 : $.job_id, ul, W]);
  async function D(U) {
    if (!Ct.current) {
      Ct.current = !0, lt(!0), Bl("");
      try {
        await U();
      } catch (zl) {
        bl.current && Bl(xe(zl));
      } finally {
        Ct.current = !1, bl.current && lt(!1);
      }
    }
  }
  async function Q() {
    var Tt, et;
    if (!O || !B || !el || Ml || ul) return;
    let U = W, zl = S, Xl = L;
    if (!U) {
      U = crypto.randomUUID(), await ut("missions", { mission_id: U, drone_id: "sim-pi-01", environment: "SIM" }), cl(U), await ut(`missions/${U}/map-drafts`, { request_id: crypto.randomUUID(), expected_draft_revision: 0, release_id: Bd, selected_zone_ids: [sl], name: `지역수색 ${(Tt = ai.find((Zu) => Zu.id === sl)) == null ? void 0 : Tt.name}`, mission_type: "AREA_RECON", conditions: { ..._c, appearance: null } });
      const [vt, tu] = await Promise.all([ut(`missions/${U}/workspace`), ut(`missions/${U}/regions`)]);
      zl = vt.mission.draft_revision ?? 0;
      const Tl = tu.filter((Zu) => Zu.mission_revision === zl);
      Xl = ((et = Tl[0]) == null ? void 0 : et.region_id) ?? "", b(vt), C(Tl), Sl(Xl), await o();
    }
    if (!Xl || !zl) throw new Error("저장된 구역이 없습니다. 임무를 다시 선택하거나 기본 임무 설정에서 저장해 주세요.");
    if ((await ut(`missions/${U}/workspace`)).mission.draft_revision !== zl) throw new Qu(409, "REVISION_CONFLICT");
    const Yt = await ut(`missions/${U}/regional-search`, { job_id: crypto.randomUUID(), mission_revision: zl, region_id: Xl });
    bl.current && (Nl(Yt), Ol((vt) => [Yt, ...vt]), tt("학교 서버에서 경로를 계산합니다. 창을 닫아도 계산 결과는 저장됩니다."));
  }
  async function w() {
    const U = M == null ? void 0 : M.spatial_draft;
    !U || !O || !B || (await ut(`missions/${W}/map-drafts`, { request_id: crypto.randomUUID(), expected_draft_revision: S, release_id: U.release_id, selected_zone_ids: U.selected_zone_ids, name: U.name, mission_type: U.mission_type, conditions: { ...U.conditions, ..._c } }), await z(W), tt("지역수색 조건으로 새 개정을 저장했습니다. 경로를 준비해 주세요."));
  }
  const x = $ == null ? void 0 : $.result, yl = $ ? Em($) : null;
  return /* @__PURE__ */ A.jsxs("div", { className: "school-regional-content", children: [
    /* @__PURE__ */ A.jsxs("aside", { children: [
      /* @__PURE__ */ A.jsx("p", { className: "sr-eyebrow", children: "기존 알고리즘 · 목표 관측률 95%" }),
      /* @__PURE__ */ A.jsx("h3", { children: "수색 경로 준비" }),
      /* @__PURE__ */ A.jsx("p", { children: "저장된 의미구역을 선택하면 학교 서버에서 경로와 예상 관측 성능을 계산합니다." }),
      /* @__PURE__ */ A.jsxs("label", { children: [
        "수색할 서버 임무",
        /* @__PURE__ */ A.jsxs("select", { value: W, disabled: El || Ml, onChange: (U) => void z(U.target.value), children: [
          /* @__PURE__ */ A.jsx("option", { value: "", children: "새 지역수색 임무" }),
          R.map((U) => /* @__PURE__ */ A.jsx("option", { value: U.mission_id, children: U.name ?? U.mission_id.slice(0, 8) }, U.mission_id))
        ] })
      ] }),
      /* @__PURE__ */ A.jsxs("div", { className: "sr-actions", children: [
        /* @__PURE__ */ A.jsx("button", { disabled: El || Ml, onClick: () => void D(async () => {
          await o(), W && await z(W, L);
        }), children: "목록·상태 갱신" }),
        F && /* @__PURE__ */ A.jsx("button", { disabled: El || Ml, onClick: () => void D(() => o(F)), children: "임무 더 보기" })
      ] }),
      W ? /* @__PURE__ */ A.jsxs("label", { children: [
        "저장 개정 ",
        S || "—",
        "의 수색 구역",
        /* @__PURE__ */ A.jsxs("select", { value: L, disabled: El || Ml, onChange: (U) => void p(U.target.value), children: [
          !G.length && /* @__PURE__ */ A.jsx("option", { value: "", children: "저장된 구역 없음" }),
          G.map((U) => /* @__PURE__ */ A.jsx("option", { value: U.region_id, children: bm(U) }, U.region_id))
        ] })
      ] }) : /* @__PURE__ */ A.jsxs("label", { children: [
        "수색 구역",
        /* @__PURE__ */ A.jsx("select", { value: sl, disabled: El, onChange: (U) => Ul(U.target.value), children: ai.map((U) => /* @__PURE__ */ A.jsx("option", { value: U.id, children: U.name }, U.id)) })
      ] }),
      /* @__PURE__ */ A.jsxs("div", { className: "sr-profile", children: [
        /* @__PURE__ */ A.jsx("strong", { children: "검증에 사용한 수색 조건" }),
        /* @__PURE__ */ A.jsxs("p", { children: [
          "고도 30m · 기본 3m/s · 조건부 직선 4m/s",
          /* @__PURE__ */ A.jsx("br", {}),
          "유효 프레임 3개 이상 + 연속 1초",
          /* @__PURE__ */ A.jsx("br", {}),
          "지점 대기 3초 · 출발 전 계산 한도 60초"
        ] })
      ] }),
      !B && /* @__PURE__ */ A.jsx("p", { className: "sr-warning", children: "현재 입력은 캠퍼스 자료만 지원합니다. 이 임무의 공간자료는 변경하지 않았습니다." }),
      B && !el && /* @__PURE__ */ A.jsxs("div", { className: "sr-warning", children: [
        /* @__PURE__ */ A.jsx("p", { children: "저장 조건이 지역수색과 다릅니다. 구역·이름·수색 유형을 유지하고 위 조건으로 새 개정을 저장할 수 있습니다. 기존 승인과 계획은 새 개정에 적용되지 않습니다." }),
        /* @__PURE__ */ A.jsx("button", { disabled: El || Ml || !O, onClick: () => void D(w), children: "지역수색 조건으로 새 개정 저장" })
      ] }),
      !O && !Ml && /* @__PURE__ */ A.jsx("p", { children: "선택 기체의 임무 편집 권한이 필요합니다." }),
      /* @__PURE__ */ A.jsx("button", { className: "sr-primary", disabled: El || Ml || ul || !O || !B || !el || !!W && !L, onClick: () => void D(Q), children: ul ? "경로 계산 중…" : $ ? "경로 다시 계산" : "경로 준비" }),
      /* @__PURE__ */ A.jsx("p", { className: "sr-note", children: "경로 준비는 이륙·비행·임무 승인을 실행하지 않습니다. 실제 관측 기록도 증가하지 않습니다. 기본 화면의 미저장 초안은 먼저 저장해 주세요." }),
      Ml && /* @__PURE__ */ A.jsx("p", { role: "status", children: "서버 임무를 확인하고 있습니다." }),
      Lt && /* @__PURE__ */ A.jsx("p", { role: "status", children: Lt }),
      wl && /* @__PURE__ */ A.jsx("p", { role: "alert", className: "sr-warning", children: wl })
    ] }),
    /* @__PURE__ */ A.jsxs("article", { children: [
      /* @__PURE__ */ A.jsxs("div", { className: "sr-result-title", children: [
        /* @__PURE__ */ A.jsx("h3", { children: $ ? zm[$.state] ?? $.state : "계획 경로 미리보기" }),
        /* @__PURE__ */ A.jsx("span", { children: "예측 결과" })
      ] }),
      /* @__PURE__ */ A.jsxs("dl", { className: "sr-metrics", children: [
        /* @__PURE__ */ A.jsxs("div", { children: [
          /* @__PURE__ */ A.jsx("dt", { children: "준비 계산" }),
          /* @__PURE__ */ A.jsx("dd", { children: Yd(x == null ? void 0 : x.preparationSeconds) })
        ] }),
        /* @__PURE__ */ A.jsxs("div", { children: [
          /* @__PURE__ */ A.jsx("dt", { children: "예상 95% 도달" }),
          /* @__PURE__ */ A.jsx("dd", { children: Yd((ja = x == null ? void 0 : x.plan) == null ? void 0 : ja.predictedFirstTargetSeconds) })
        ] }),
        /* @__PURE__ */ A.jsxs("div", { children: [
          /* @__PURE__ */ A.jsx("dt", { children: "예상 최종 관측률" }),
          /* @__PURE__ */ A.jsxs("dd", { children: [
            ((Xu = (lu = x == null ? void 0 : x.plan) == null ? void 0 : lu.predictedPercent) == null ? void 0 : Xu.toFixed(2)) ?? "—",
            ((xt = x == null ? void 0 : x.plan) == null ? void 0 : xt.predictedPercent) !== void 0 ? "%" : ""
          ] })
        ] }),
        /* @__PURE__ */ A.jsxs("div", { children: [
          /* @__PURE__ */ A.jsx("dt", { children: "수색 대상 면적" }),
          /* @__PURE__ */ A.jsx("dd", { children: (x == null ? void 0 : x.targetAreaM2) === void 0 ? "—" : (x.targetAreaM2 / 1e4).toFixed(2) + " ha" })
        ] })
      ] }),
      yl ? /* @__PURE__ */ A.jsxs("svg", { viewBox: "0 0 800 560", role: "img", "aria-label": "계획된 지역수색 경로 지도", children: [
        /* @__PURE__ */ A.jsx("path", { d: yl.target, fill: "#314c56", stroke: "#79929c", strokeWidth: ".6", fillRule: "evenodd" }),
        /* @__PURE__ */ A.jsx("path", { d: yl.ingress, fill: "none", stroke: "#edb56b", strokeWidth: "2", strokeDasharray: "7 5" }),
        /* @__PURE__ */ A.jsx("path", { d: yl.returning, fill: "none", stroke: "#ba94eb", strokeWidth: "2", strokeDasharray: "4 5" }),
        /* @__PURE__ */ A.jsx("path", { d: yl.route, fill: "none", stroke: "#54d7df", strokeWidth: "2.3" }),
        /* @__PURE__ */ A.jsx("circle", { cx: yl.entry[0], cy: yl.entry[1], r: "5", fill: "#fff" }),
        /* @__PURE__ */ A.jsx("text", { x: yl.entry[0] + 9, y: yl.entry[1] - 7, fill: "#fff", fontSize: "13", children: "진입" }),
        yl.finish && /* @__PURE__ */ A.jsx("circle", { cx: yl.finish[0], cy: yl.finish[1], r: "5", fill: "#edb56b" }),
        /* @__PURE__ */ A.jsx("text", { x: "755", y: "28", fill: "#a8c4cc", fontSize: "14", children: "북 ↑" })
      ] }) : /* @__PURE__ */ A.jsx("div", { className: "sr-empty", children: ul ? "선택한 구역의 가림·이동·관측 조건을 계산 중입니다." : "구역을 선택하고 경로를 준비하면 여기에 표시됩니다." }),
      /* @__PURE__ */ A.jsx("p", { className: "sr-legend", children: "회색 수색 대상 · 청록 수색 경로 · 주황 점선 진입 · 보라 점선 복귀" }),
      /* @__PURE__ */ A.jsx("p", { className: "sr-note", children: "지도는 계획의 이동 구간을 표시합니다. 실제 영상으로 관측 완료된 영역이나 사람 탐지 결과가 아닙니다." }),
      ($ == null ? void 0 : $.state) === "INCOMPLETE" && /* @__PURE__ */ A.jsx("p", { className: "sr-warning", children: "목표 관측률 또는 준비 계산 한도를 충족하지 못했습니다. 준비 완료 계획으로 취급하지 않습니다." }),
      (x == null ? void 0 : x.reason) && /* @__PURE__ */ A.jsx("p", { className: "sr-warning", children: x.reason }),
      $ && /* @__PURE__ */ A.jsxs("details", { children: [
        /* @__PURE__ */ A.jsx("summary", { children: "계획 식별 정보" }),
        /* @__PURE__ */ A.jsxs("p", { children: [
          "작업 ",
          $.job_id,
          /* @__PURE__ */ A.jsx("br", {}),
          "임무 개정 ",
          $.mission_revision,
          /* @__PURE__ */ A.jsx("br", {}),
          "계획 ",
          $.plan_id ?? "계산 중",
          /* @__PURE__ */ A.jsx("br", {}),
          "입력 ",
          (x == null ? void 0 : x.packageId) ?? "확인 중"
        ] })
      ] })
    ] })
  ] });
}
function Am() {
  const [_, q] = Cl.useState(!1), R = Cl.useRef(null);
  return Cl.useEffect(() => {
    var v, F, J;
    _ && !((v = R.current) != null && v.open) ? (F = R.current) == null || F.showModal() : !_ && ((J = R.current) != null && J.open) && R.current.close();
  }, [_]), /* @__PURE__ */ A.jsxs("span", { className: "school-regional-entry", children: [
    /* @__PURE__ */ A.jsx("button", { type: "button", className: "school-regional-toggle", onClick: () => q(!0), children: "지역수색 경로" }),
    /* @__PURE__ */ A.jsxs("dialog", { ref: R, className: "school-regional-dialog", "aria-label": "지역수색 경로 설정", onCancel: () => q(!1), onClose: () => q(!1), children: [
      /* @__PURE__ */ A.jsxs("header", { children: [
        /* @__PURE__ */ A.jsxs("div", { children: [
          /* @__PURE__ */ A.jsx("small", { children: "학교 서버 · 경로 계획" }),
          /* @__PURE__ */ A.jsx("h2", { children: "지역수색 경로" })
        ] }),
        /* @__PURE__ */ A.jsx("button", { type: "button", "aria-label": "지역수색 경로 닫기", onClick: () => q(!1), children: "닫기 ×" })
      ] }),
      _ && /* @__PURE__ */ A.jsx(_m, {})
    ] })
  ] });
}
let Pa = null;
function Qd() {
  const _ = document.querySelector(".school-app .sim-header");
  if (Pa && Pa.header !== _ && (Pa.root.unmount(), Pa.host.remove(), Pa = null), !_ || Pa || _.querySelector(".school-regional-entry")) return;
  const q = document.createElement("div");
  q.className = "school-regional-extension", q.style.display = "contents", _.insertBefore(q, _.querySelector(".map-environment-switch"));
  const R = hm.createRoot(q);
  Pa = { header: _, host: q, root: R }, R.render(/* @__PURE__ */ A.jsx(Am, {}));
}
let Tc = !1;
const Om = new MutationObserver(() => {
  Tc || (Tc = !0, queueMicrotask(() => {
    Tc = !1, Qd();
  }));
});
Om.observe(document.documentElement, { childList: !0, subtree: !0 });
Qd();
export {
  Qd as syncRegionalEntry
};
