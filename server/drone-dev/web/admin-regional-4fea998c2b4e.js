var Sc = { exports: {} }, xe = {};
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
  if (Od) return xe;
  Od = 1;
  var _ = Symbol.for("react.transitional.element"), q = Symbol.for("react.fragment");
  function R(v, F, W) {
    var Q = null;
    if (W !== void 0 && (Q = "" + W), F.key !== void 0 && (Q = "" + F.key), "key" in F) {
      W = {};
      for (var cl in F)
        cl !== "key" && (W[cl] = F[cl]);
    } else W = F;
    return F = W.ref, {
      $$typeof: _,
      type: v,
      key: Q,
      ref: F !== void 0 ? F : null,
      props: W
    };
  }
  return xe.Fragment = q, xe.jsx = R, xe.jsxs = R, xe;
}
var Md;
function fm() {
  return Md || (Md = 1, Sc.exports = im()), Sc.exports;
}
var A = fm(), gc = { exports: {} }, Be = {}, bc = { exports: {} }, Ec = {};
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
    function q(S, M) {
      var x = S.length;
      S.push(M);
      l: for (; 0 < x; ) {
        var el = x - 1 >>> 1, ul = S[el];
        if (0 < F(ul, M))
          S[el] = M, S[x] = ul, x = el;
        else break l;
      }
    }
    function R(S) {
      return S.length === 0 ? null : S[0];
    }
    function v(S) {
      if (S.length === 0) return null;
      var M = S[0], x = S.pop();
      if (x !== M) {
        S[0] = x;
        l: for (var el = 0, ul = S.length, o = ul >>> 1; el < o; ) {
          var z = 2 * (el + 1) - 1, p = S[z], U = z + 1, X = S[U];
          if (0 > F(p, x))
            U < ul && 0 > F(X, p) ? (S[el] = X, S[U] = x, el = U) : (S[el] = p, S[z] = x, el = z);
          else if (U < ul && 0 > F(X, x))
            S[el] = X, S[U] = x, el = U;
          else break l;
        }
      }
      return M;
    }
    function F(S, M) {
      var x = S.sortIndex - M.sortIndex;
      return x !== 0 ? x : S.id - M.id;
    }
    if (_.unstable_now = void 0, typeof performance == "object" && typeof performance.now == "function") {
      var W = performance;
      _.unstable_now = function() {
        return W.now();
      };
    } else {
      var Q = Date, cl = Q.now();
      _.unstable_now = function() {
        return Q.now() - cl;
      };
    }
    var O = [], b = [], G = 1, C = null, V = 3, Sl = !1, sl = !1, Dl = !1, K = !1, Ul = typeof setTimeout == "function" ? setTimeout : null, al = typeof clearTimeout == "function" ? clearTimeout : null, Ol = typeof setImmediate < "u" ? setImmediate : null;
    function Tl(S) {
      for (var M = R(b); M !== null; ) {
        if (M.callback === null) v(b);
        else if (M.startTime <= S)
          v(b), M.sortIndex = M.expirationTime, q(O, M);
        else break;
        M = R(b);
      }
    }
    function lt(S) {
      if (Dl = !1, Tl(S), !sl)
        if (R(O) !== null)
          sl = !0, zl || (zl = !0, vl());
        else {
          var M = R(b);
          M !== null && Cl(lt, M.startTime - S);
        }
    }
    var zl = !1, J = -1, wl = 5, xl = -1;
    function Vt() {
      return K ? !0 : !(_.unstable_now() - xl < wl);
    }
    function tt() {
      if (K = !1, zl) {
        var S = _.unstable_now();
        xl = S;
        var M = !0;
        try {
          l: {
            sl = !1, Dl && (Dl = !1, al(J), J = -1), Sl = !0;
            var x = V;
            try {
              t: {
                for (Tl(S), C = R(O); C !== null && !(C.expirationTime > S && Vt()); ) {
                  var el = C.callback;
                  if (typeof el == "function") {
                    C.callback = null, V = C.priorityLevel;
                    var ul = el(
                      C.expirationTime <= S
                    );
                    if (S = _.unstable_now(), typeof ul == "function") {
                      C.callback = ul, Tl(S), M = !0;
                      break t;
                    }
                    C === R(O) && v(O), Tl(S);
                  } else v(O);
                  C = R(O);
                }
                if (C !== null) M = !0;
                else {
                  var o = R(b);
                  o !== null && Cl(
                    lt,
                    o.startTime - S
                  ), M = !1;
                }
              }
              break l;
            } finally {
              C = null, V = x, Sl = !1;
            }
            M = void 0;
          }
        } finally {
          M ? vl() : zl = !1;
        }
      }
    }
    var vl;
    if (typeof Ol == "function")
      vl = function() {
        Ol(tt);
      };
    else if (typeof MessageChannel < "u") {
      var jt = new MessageChannel(), gl = jt.port2;
      jt.port1.onmessage = tt, vl = function() {
        gl.postMessage(null);
      };
    } else
      vl = function() {
        Ul(tt, 0);
      };
    function Cl(S, M) {
      J = Ul(function() {
        S(_.unstable_now());
      }, M);
    }
    _.unstable_IdlePriority = 5, _.unstable_ImmediatePriority = 1, _.unstable_LowPriority = 4, _.unstable_NormalPriority = 3, _.unstable_Profiling = null, _.unstable_UserBlockingPriority = 2, _.unstable_cancelCallback = function(S) {
      S.callback = null;
    }, _.unstable_forceFrameRate = function(S) {
      0 > S || 125 < S ? console.error(
        "forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"
      ) : wl = 0 < S ? Math.floor(1e3 / S) : 5;
    }, _.unstable_getCurrentPriorityLevel = function() {
      return V;
    }, _.unstable_next = function(S) {
      switch (V) {
        case 1:
        case 2:
        case 3:
          var M = 3;
          break;
        default:
          M = V;
      }
      var x = V;
      V = M;
      try {
        return S();
      } finally {
        V = x;
      }
    }, _.unstable_requestPaint = function() {
      K = !0;
    }, _.unstable_runWithPriority = function(S, M) {
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
      var x = V;
      V = S;
      try {
        return M();
      } finally {
        V = x;
      }
    }, _.unstable_scheduleCallback = function(S, M, x) {
      var el = _.unstable_now();
      switch (typeof x == "object" && x !== null ? (x = x.delay, x = typeof x == "number" && 0 < x ? el + x : el) : x = el, S) {
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
      return ul = x + ul, S = {
        id: G++,
        callback: M,
        priorityLevel: S,
        startTime: x,
        expirationTime: ul,
        sortIndex: -1
      }, x > el ? (S.sortIndex = x, q(b, S), R(O) === null && S === R(b) && (Dl ? (al(J), J = -1) : Dl = !0, Cl(lt, x - el))) : (S.sortIndex = ul, q(O, S), sl || Sl || (sl = !0, zl || (zl = !0, vl()))), S;
    }, _.unstable_shouldYield = Vt, _.unstable_wrapCallback = function(S) {
      var M = V;
      return function() {
        var x = V;
        V = M;
        try {
          return S.apply(this, arguments);
        } finally {
          V = x;
        }
      };
    };
  })(Ec)), Ec;
}
var Dd;
function sm() {
  return Dd || (Dd = 1, bc.exports = cm()), bc.exports;
}
var zc = { exports: {} }, Z = {};
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
  if (Ud) return Z;
  Ud = 1;
  var _ = Symbol.for("react.transitional.element"), q = Symbol.for("react.portal"), R = Symbol.for("react.fragment"), v = Symbol.for("react.strict_mode"), F = Symbol.for("react.profiler"), W = Symbol.for("react.consumer"), Q = Symbol.for("react.context"), cl = Symbol.for("react.forward_ref"), O = Symbol.for("react.suspense"), b = Symbol.for("react.memo"), G = Symbol.for("react.lazy"), C = Symbol.for("react.activity"), V = Symbol.iterator;
  function Sl(o) {
    return o === null || typeof o != "object" ? null : (o = V && o[V] || o["@@iterator"], typeof o == "function" ? o : null);
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
  }, Dl = Object.assign, K = {};
  function Ul(o, z, p) {
    this.props = o, this.context = z, this.refs = K, this.updater = p || sl;
  }
  Ul.prototype.isReactComponent = {}, Ul.prototype.setState = function(o, z) {
    if (typeof o != "object" && typeof o != "function" && o != null)
      throw Error(
        "takes an object of state variables to update or a function which returns an object of state variables."
      );
    this.updater.enqueueSetState(this, o, z, "setState");
  }, Ul.prototype.forceUpdate = function(o) {
    this.updater.enqueueForceUpdate(this, o, "forceUpdate");
  };
  function al() {
  }
  al.prototype = Ul.prototype;
  function Ol(o, z, p) {
    this.props = o, this.context = z, this.refs = K, this.updater = p || sl;
  }
  var Tl = Ol.prototype = new al();
  Tl.constructor = Ol, Dl(Tl, Ul.prototype), Tl.isPureReactComponent = !0;
  var lt = Array.isArray;
  function zl() {
  }
  var J = { H: null, A: null, T: null, S: null }, wl = Object.prototype.hasOwnProperty;
  function xl(o, z, p) {
    var U = p.ref;
    return {
      $$typeof: _,
      type: o,
      key: z,
      ref: U !== void 0 ? U : null,
      props: p
    };
  }
  function Vt(o, z) {
    return xl(o.type, z, o.props);
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
  var jt = /\/+/g;
  function gl(o, z) {
    return typeof o == "object" && o !== null && o.key != null ? vl("" + o.key) : z.toString(36);
  }
  function Cl(o) {
    switch (o.status) {
      case "fulfilled":
        return o.value;
      case "rejected":
        throw o.reason;
      default:
        switch (typeof o.status == "string" ? o.then(zl, zl) : (o.status = "pending", o.then(
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
  function S(o, z, p, U, X) {
    var $ = typeof o;
    ($ === "undefined" || $ === "boolean") && (o = null);
    var B = !1;
    if (o === null) B = !0;
    else
      switch ($) {
        case "bigint":
        case "string":
        case "number":
          B = !0;
          break;
        case "object":
          switch (o.$$typeof) {
            case _:
            case q:
              B = !0;
              break;
            case G:
              return B = o._init, S(
                B(o._payload),
                z,
                p,
                U,
                X
              );
          }
      }
    if (B)
      return X = X(o), B = U === "" ? "." + gl(o, 0) : U, lt(X) ? (p = "", B != null && (p = B.replace(jt, "$&/") + "/"), S(X, z, p, "", function(sa) {
        return sa;
      })) : X != null && (tt(X) && (X = Vt(
        X,
        p + (X.key == null || o && o.key === X.key ? "" : ("" + X.key).replace(
          jt,
          "$&/"
        ) + "/") + B
      )), z.push(X)), 1;
    B = 0;
    var yl = U === "" ? "." : U + ":";
    if (lt(o))
      for (var Ml = 0; Ml < o.length; Ml++)
        U = o[Ml], $ = yl + gl(U, Ml), B += S(
          U,
          z,
          p,
          $,
          X
        );
    else if (Ml = Sl(o), typeof Ml == "function")
      for (o = Ml.call(o), Ml = 0; !(U = o.next()).done; )
        U = U.value, $ = yl + gl(U, Ml++), B += S(
          U,
          z,
          p,
          $,
          X
        );
    else if ($ === "object") {
      if (typeof o.then == "function")
        return S(
          Cl(o),
          z,
          p,
          U,
          X
        );
      throw z = String(o), Error(
        "Objects are not valid as a React child (found: " + (z === "[object Object]" ? "object with keys {" + Object.keys(o).join(", ") + "}" : z) + "). If you meant to render a collection of children, use an array instead."
      );
    }
    return B;
  }
  function M(o, z, p) {
    if (o == null) return o;
    var U = [], X = 0;
    return S(o, U, "", "", function($) {
      return z.call(p, $, X++);
    }), U;
  }
  function x(o) {
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
    map: M,
    forEach: function(o, z, p) {
      M(
        o,
        function() {
          z.apply(this, arguments);
        },
        p
      );
    },
    count: function(o) {
      var z = 0;
      return M(o, function() {
        z++;
      }), z;
    },
    toArray: function(o) {
      return M(o, function(z) {
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
  return Z.Activity = C, Z.Children = ul, Z.Component = Ul, Z.Fragment = R, Z.Profiler = F, Z.PureComponent = Ol, Z.StrictMode = v, Z.Suspense = O, Z.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = J, Z.__COMPILER_RUNTIME = {
    __proto__: null,
    c: function(o) {
      return J.H.useMemoCache(o);
    }
  }, Z.cache = function(o) {
    return function() {
      return o.apply(null, arguments);
    };
  }, Z.cacheSignal = function() {
    return null;
  }, Z.cloneElement = function(o, z, p) {
    if (o == null)
      throw Error(
        "The argument must be a React element, but you passed " + o + "."
      );
    var U = Dl({}, o.props), X = o.key;
    if (z != null)
      for ($ in z.key !== void 0 && (X = "" + z.key), z)
        !wl.call(z, $) || $ === "key" || $ === "__self" || $ === "__source" || $ === "ref" && z.ref === void 0 || (U[$] = z[$]);
    var $ = arguments.length - 2;
    if ($ === 1) U.children = p;
    else if (1 < $) {
      for (var B = Array($), yl = 0; yl < $; yl++)
        B[yl] = arguments[yl + 2];
      U.children = B;
    }
    return xl(o.type, X, U);
  }, Z.createContext = function(o) {
    return o = {
      $$typeof: Q,
      _currentValue: o,
      _currentValue2: o,
      _threadCount: 0,
      Provider: null,
      Consumer: null
    }, o.Provider = o, o.Consumer = {
      $$typeof: W,
      _context: o
    }, o;
  }, Z.createElement = function(o, z, p) {
    var U, X = {}, $ = null;
    if (z != null)
      for (U in z.key !== void 0 && ($ = "" + z.key), z)
        wl.call(z, U) && U !== "key" && U !== "__self" && U !== "__source" && (X[U] = z[U]);
    var B = arguments.length - 2;
    if (B === 1) X.children = p;
    else if (1 < B) {
      for (var yl = Array(B), Ml = 0; Ml < B; Ml++)
        yl[Ml] = arguments[Ml + 2];
      X.children = yl;
    }
    if (o && o.defaultProps)
      for (U in B = o.defaultProps, B)
        X[U] === void 0 && (X[U] = B[U]);
    return xl(o, $, X);
  }, Z.createRef = function() {
    return { current: null };
  }, Z.forwardRef = function(o) {
    return { $$typeof: cl, render: o };
  }, Z.isValidElement = tt, Z.lazy = function(o) {
    return {
      $$typeof: G,
      _payload: { _status: -1, _result: o },
      _init: x
    };
  }, Z.memo = function(o, z) {
    return {
      $$typeof: b,
      type: o,
      compare: z === void 0 ? null : z
    };
  }, Z.startTransition = function(o) {
    var z = J.T, p = {};
    J.T = p;
    try {
      var U = o(), X = J.S;
      X !== null && X(p, U), typeof U == "object" && U !== null && typeof U.then == "function" && U.then(zl, el);
    } catch ($) {
      el($);
    } finally {
      z !== null && p.types !== null && (z.types = p.types), J.T = z;
    }
  }, Z.unstable_useCacheRefresh = function() {
    return J.H.useCacheRefresh();
  }, Z.use = function(o) {
    return J.H.use(o);
  }, Z.useActionState = function(o, z, p) {
    return J.H.useActionState(o, z, p);
  }, Z.useCallback = function(o, z) {
    return J.H.useCallback(o, z);
  }, Z.useContext = function(o) {
    return J.H.useContext(o);
  }, Z.useDebugValue = function() {
  }, Z.useDeferredValue = function(o, z) {
    return J.H.useDeferredValue(o, z);
  }, Z.useEffect = function(o, z) {
    return J.H.useEffect(o, z);
  }, Z.useEffectEvent = function(o) {
    return J.H.useEffectEvent(o);
  }, Z.useId = function() {
    return J.H.useId();
  }, Z.useImperativeHandle = function(o, z, p) {
    return J.H.useImperativeHandle(o, z, p);
  }, Z.useInsertionEffect = function(o, z) {
    return J.H.useInsertionEffect(o, z);
  }, Z.useLayoutEffect = function(o, z) {
    return J.H.useLayoutEffect(o, z);
  }, Z.useMemo = function(o, z) {
    return J.H.useMemo(o, z);
  }, Z.useOptimistic = function(o, z) {
    return J.H.useOptimistic(o, z);
  }, Z.useReducer = function(o, z, p) {
    return J.H.useReducer(o, z, p);
  }, Z.useRef = function(o) {
    return J.H.useRef(o);
  }, Z.useState = function(o) {
    return J.H.useState(o);
  }, Z.useSyncExternalStore = function(o, z, p) {
    return J.H.useSyncExternalStore(
      o,
      z,
      p
    );
  }, Z.useTransition = function() {
    return J.H.useTransition();
  }, Z.version = "19.2.0", Z;
}
var Nd;
function Oc() {
  return Nd || (Nd = 1, zc.exports = om()), zc.exports;
}
var Tc = { exports: {} }, Pl = {};
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
  var _ = Oc();
  function q(O) {
    var b = "https://react.dev/errors/" + O;
    if (1 < arguments.length) {
      b += "?args[]=" + encodeURIComponent(arguments[1]);
      for (var G = 2; G < arguments.length; G++)
        b += "&args[]=" + encodeURIComponent(arguments[G]);
    }
    return "Minified React error #" + O + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
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
  function W(O, b, G) {
    var C = 3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
    return {
      $$typeof: F,
      key: C == null ? null : "" + C,
      children: O,
      containerInfo: b,
      implementation: G
    };
  }
  var Q = _.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  function cl(O, b) {
    if (O === "font") return "";
    if (typeof b == "string")
      return b === "use-credentials" ? b : "";
  }
  return Pl.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = v, Pl.createPortal = function(O, b) {
    var G = 2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
    if (!b || b.nodeType !== 1 && b.nodeType !== 9 && b.nodeType !== 11)
      throw Error(q(299));
    return W(O, b, null, G);
  }, Pl.flushSync = function(O) {
    var b = Q.T, G = v.p;
    try {
      if (Q.T = null, v.p = 2, O) return O();
    } finally {
      Q.T = b, v.p = G, v.d.f();
    }
  }, Pl.preconnect = function(O, b) {
    typeof O == "string" && (b ? (b = b.crossOrigin, b = typeof b == "string" ? b === "use-credentials" ? b : "" : void 0) : b = null, v.d.C(O, b));
  }, Pl.prefetchDNS = function(O) {
    typeof O == "string" && v.d.D(O);
  }, Pl.preinit = function(O, b) {
    if (typeof O == "string" && b && typeof b.as == "string") {
      var G = b.as, C = cl(G, b.crossOrigin), V = typeof b.integrity == "string" ? b.integrity : void 0, Sl = typeof b.fetchPriority == "string" ? b.fetchPriority : void 0;
      G === "style" ? v.d.S(
        O,
        typeof b.precedence == "string" ? b.precedence : void 0,
        {
          crossOrigin: C,
          integrity: V,
          fetchPriority: Sl
        }
      ) : G === "script" && v.d.X(O, {
        crossOrigin: C,
        integrity: V,
        fetchPriority: Sl,
        nonce: typeof b.nonce == "string" ? b.nonce : void 0
      });
    }
  }, Pl.preinitModule = function(O, b) {
    if (typeof O == "string")
      if (typeof b == "object" && b !== null) {
        if (b.as == null || b.as === "script") {
          var G = cl(
            b.as,
            b.crossOrigin
          );
          v.d.M(O, {
            crossOrigin: G,
            integrity: typeof b.integrity == "string" ? b.integrity : void 0,
            nonce: typeof b.nonce == "string" ? b.nonce : void 0
          });
        }
      } else b == null && v.d.M(O);
  }, Pl.preload = function(O, b) {
    if (typeof O == "string" && typeof b == "object" && b !== null && typeof b.as == "string") {
      var G = b.as, C = cl(G, b.crossOrigin);
      v.d.L(O, G, {
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
  }, Pl.preloadModule = function(O, b) {
    if (typeof O == "string")
      if (b) {
        var G = cl(b.as, b.crossOrigin);
        v.d.m(O, {
          as: typeof b.as == "string" && b.as !== "script" ? b.as : void 0,
          crossOrigin: G,
          integrity: typeof b.integrity == "string" ? b.integrity : void 0
        });
      } else v.d.m(O);
  }, Pl.requestFormReset = function(O) {
    v.d.r(O);
  }, Pl.unstable_batchedUpdates = function(O, b) {
    return O(b);
  }, Pl.useFormState = function(O, b, G) {
    return Q.H.useFormState(O, b, G);
  }, Pl.useFormStatus = function() {
    return Q.H.useHostTransitionStatus();
  }, Pl.version = "19.2.0", Pl;
}
var Hd;
function vm() {
  if (Hd) return Tc.exports;
  Hd = 1;
  function _() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(_);
      } catch (q) {
        console.error(q);
      }
  }
  return _(), Tc.exports = dm(), Tc.exports;
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
  var _ = sm(), q = Oc(), R = vm();
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
  function W(l) {
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
  function Q(l) {
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
  function O(l) {
    if (W(l) !== l)
      throw Error(v(188));
  }
  function b(l) {
    var t = l.alternate;
    if (!t) {
      if (t = W(l), t === null) throw Error(v(188));
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
          if (n === a) return O(e), l;
          if (n === u) return O(e), t;
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
  var C = Object.assign, V = Symbol.for("react.element"), Sl = Symbol.for("react.transitional.element"), sl = Symbol.for("react.portal"), Dl = Symbol.for("react.fragment"), K = Symbol.for("react.strict_mode"), Ul = Symbol.for("react.profiler"), al = Symbol.for("react.consumer"), Ol = Symbol.for("react.context"), Tl = Symbol.for("react.forward_ref"), lt = Symbol.for("react.suspense"), zl = Symbol.for("react.suspense_list"), J = Symbol.for("react.memo"), wl = Symbol.for("react.lazy"), xl = Symbol.for("react.activity"), Vt = Symbol.for("react.memo_cache_sentinel"), tt = Symbol.iterator;
  function vl(l) {
    return l === null || typeof l != "object" ? null : (l = tt && l[tt] || l["@@iterator"], typeof l == "function" ? l : null);
  }
  var jt = Symbol.for("react.client.reference");
  function gl(l) {
    if (l == null) return null;
    if (typeof l == "function")
      return l.$$typeof === jt ? null : l.displayName || l.name || null;
    if (typeof l == "string") return l;
    switch (l) {
      case Dl:
        return "Fragment";
      case Ul:
        return "Profiler";
      case K:
        return "StrictMode";
      case lt:
        return "Suspense";
      case zl:
        return "SuspenseList";
      case xl:
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
        case Tl:
          var t = l.render;
          return l = l.displayName, l || (l = t.displayName || t.name || "", l = l !== "" ? "ForwardRef(" + l + ")" : "ForwardRef"), l;
        case J:
          return t = l.displayName || null, t !== null ? t : gl(l.type) || "Memo";
        case wl:
          t = l._payload, l = l._init;
          try {
            return gl(l(t));
          } catch {
          }
      }
    return null;
  }
  var Cl = Array.isArray, S = q.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, M = R.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, x = {
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
  var U = o(null), X = o(null), $ = o(null), B = o(null);
  function yl(l, t) {
    switch (p($, t), p(X, l), p(U, null), t.nodeType) {
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
    z(U), p(U, l);
  }
  function Ml() {
    z(U), z(X), z($);
  }
  function sa(l) {
    l.memoizedState !== null && p(B, l);
    var t = U.current, a = $o(t, l.type);
    t !== a && (p(X, l), p(U, a));
  }
  function qa(l) {
    X.current === l && (z(U), z(X)), B.current === l && (z(B), He._currentValue = x);
  }
  var tu, Lu;
  function Yt(l) {
    if (tu === void 0)
      try {
        throw Error();
      } catch (a) {
        var t = a.stack.trim().match(/\n( *(at )?)/);
        tu = t && t[1] || "", Lu = -1 < a.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < a.stack.indexOf("@") ? "@unknown:0:0" : "";
      }
    return `
` + tu + l + Lu;
  }
  var au = !1;
  function D(l, t) {
    if (!l || au) return "";
    au = !0;
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
      au = !1, Error.prepareStackTrace = a;
    }
    return (a = l ? l.displayName || l.name : "") ? Yt(a) : "";
  }
  function bl(l, t) {
    switch (l.tag) {
      case 26:
      case 27:
      case 5:
        return Yt(l.type);
      case 16:
        return Yt("Lazy");
      case 13:
        return l.child !== t && t !== null ? Yt("Suspense Fallback") : Yt("Suspense");
      case 19:
        return Yt("SuspenseList");
      case 0:
      case 15:
        return D(l.type, !1);
      case 11:
        return D(l.type.render, !1);
      case 1:
        return D(l.type, !0);
      case 31:
        return Yt("Activity");
      default:
        return "";
    }
  }
  function Bl(l) {
    try {
      var t = "", a = null;
      do
        t += bl(l, a), a = l, l = l.return;
      while (l);
      return t;
    } catch (u) {
      return `
Error generating stack: ` + u.message + `
` + u.stack;
    }
  }
  var Yl = Object.prototype.hasOwnProperty, Gt = _.unstable_scheduleCallback, Tt = _.unstable_cancelCallback, _t = _.unstable_shouldYield, dt = _.unstable_requestPaint, Vl = _.unstable_now, vt = _.unstable_getCurrentPriorityLevel, uu = _.unstable_ImmediatePriority, Mc = _.unstable_UserBlockingPriority, Ge = _.unstable_NormalPriority, Xd = _.unstable_LowPriority, pc = _.unstable_IdlePriority, Zd = _.log, Ld = _.unstable_setDisableYieldValue, Vu = null, yt = null;
  function oa(l) {
    if (typeof Zd == "function" && Ld(l), yt && typeof yt.setStrictMode == "function")
      try {
        yt.setStrictMode(Vu, l);
      } catch {
      }
  }
  var mt = Math.clz32 ? Math.clz32 : Jd, Vd = Math.log, Kd = Math.LN2;
  function Jd(l) {
    return l >>>= 0, l === 0 ? 32 : 31 - (Vd(l) / Kd | 0) | 0;
  }
  var Qe = 256, Xe = 262144, Ze = 4194304;
  function xa(l) {
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
  function Le(l, t, a) {
    var u = l.pendingLanes;
    if (u === 0) return 0;
    var e = 0, n = l.suspendedLanes, i = l.pingedLanes;
    l = l.warmLanes;
    var f = u & 134217727;
    return f !== 0 ? (u = f & ~n, u !== 0 ? e = xa(u) : (i &= f, i !== 0 ? e = xa(i) : a || (a = f & ~l, a !== 0 && (e = xa(a))))) : (f = u & ~n, f !== 0 ? e = xa(f) : i !== 0 ? e = xa(i) : a || (a = u & ~l, a !== 0 && (e = xa(a)))), e === 0 ? 0 : t !== 0 && t !== e && (t & n) === 0 && (n = e & -e, a = t & -t, n >= a || n === 32 && (a & 4194048) !== 0) ? t : e;
  }
  function Ku(l, t) {
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
    var l = Ze;
    return Ze <<= 1, (Ze & 62914560) === 0 && (Ze = 4194304), l;
  }
  function ei(l) {
    for (var t = [], a = 0; 31 > a; a++) t.push(l);
    return t;
  }
  function Ju(l, t) {
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
    return a = (a & 42) !== 0 ? 1 : ni(a), (a & (l.suspendedLanes | t)) !== 0 ? 0 : a;
  }
  function ni(l) {
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
  function ii(l) {
    return l &= -l, 2 < l ? 8 < l ? (l & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
  }
  function Hc() {
    var l = M.p;
    return l !== 0 ? l : (l = window.event, l === void 0 ? 32 : gd(l.type));
  }
  function Cc(l, t) {
    var a = M.p;
    try {
      return M.p = l, t();
    } finally {
      M.p = a;
    }
  }
  var da = Math.random().toString(36).slice(2), Wl = "__reactFiber$" + da, et = "__reactProps$" + da, eu = "__reactContainer$" + da, fi = "__reactEvents$" + da, $d = "__reactListeners$" + da, Fd = "__reactHandles$" + da, jc = "__reactResources$" + da, wu = "__reactMarker$" + da;
  function ci(l) {
    delete l[Wl], delete l[et], delete l[fi], delete l[$d], delete l[Fd];
  }
  function nu(l) {
    var t = l[Wl];
    if (t) return t;
    for (var a = l.parentNode; a; ) {
      if (t = a[eu] || a[Wl]) {
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
  function iu(l) {
    if (l = l[Wl] || l[eu]) {
      var t = l.tag;
      if (t === 5 || t === 6 || t === 13 || t === 31 || t === 26 || t === 27 || t === 3)
        return l;
    }
    return null;
  }
  function Wu(l) {
    var t = l.tag;
    if (t === 5 || t === 26 || t === 27 || t === 6) return l.stateNode;
    throw Error(v(33));
  }
  function fu(l) {
    var t = l[jc];
    return t || (t = l[jc] = { hoistableStyles: /* @__PURE__ */ new Map(), hoistableScripts: /* @__PURE__ */ new Map() }), t;
  }
  function Kl(l) {
    l[wu] = !0;
  }
  var qc = /* @__PURE__ */ new Set(), xc = {};
  function Ba(l, t) {
    cu(l, t), cu(l + "Capture", t);
  }
  function cu(l, t) {
    for (xc[l] = t, l = 0; l < t.length; l++)
      qc.add(t[l]);
  }
  var kd = RegExp(
    "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
  ), Bc = {}, Yc = {};
  function Id(l) {
    return Yl.call(Yc, l) ? !0 : Yl.call(Bc, l) ? !1 : kd.test(l) ? Yc[l] = !0 : (Bc[l] = !0, !1);
  }
  function Ve(l, t, a) {
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
  function Ke(l, t, a) {
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
  function Kt(l, t, a, u) {
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
  function At(l) {
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
  function si(l) {
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
  function Je(l) {
    if (l = l || (typeof document < "u" ? document : void 0), typeof l > "u") return null;
    try {
      return l.activeElement || l.body;
    } catch {
      return l.body;
    }
  }
  var lv = /[\n"\\]/g;
  function Ot(l) {
    return l.replace(
      lv,
      function(t) {
        return "\\" + t.charCodeAt(0).toString(16) + " ";
      }
    );
  }
  function oi(l, t, a, u, e, n, i, f) {
    l.name = "", i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" ? l.type = i : l.removeAttribute("type"), t != null ? i === "number" ? (t === 0 && l.value === "" || l.value != t) && (l.value = "" + At(t)) : l.value !== "" + At(t) && (l.value = "" + At(t)) : i !== "submit" && i !== "reset" || l.removeAttribute("value"), t != null ? di(l, i, At(t)) : a != null ? di(l, i, At(a)) : u != null && l.removeAttribute("value"), e == null && n != null && (l.defaultChecked = !!n), e != null && (l.checked = e && typeof e != "function" && typeof e != "symbol"), f != null && typeof f != "function" && typeof f != "symbol" && typeof f != "boolean" ? l.name = "" + At(f) : l.removeAttribute("name");
  }
  function Xc(l, t, a, u, e, n, i, f) {
    if (n != null && typeof n != "function" && typeof n != "symbol" && typeof n != "boolean" && (l.type = n), t != null || a != null) {
      if (!(n !== "submit" && n !== "reset" || t != null)) {
        si(l);
        return;
      }
      a = a != null ? "" + At(a) : "", t = t != null ? "" + At(t) : a, f || t === l.value || (l.value = t), l.defaultValue = t;
    }
    u = u ?? e, u = typeof u != "function" && typeof u != "symbol" && !!u, l.checked = f ? l.checked : !!u, l.defaultChecked = !!u, i != null && typeof i != "function" && typeof i != "symbol" && typeof i != "boolean" && (l.name = i), si(l);
  }
  function di(l, t, a) {
    t === "number" && Je(l.ownerDocument) === l || l.defaultValue === "" + a || (l.defaultValue = "" + a);
  }
  function su(l, t, a, u) {
    if (l = l.options, t) {
      t = {};
      for (var e = 0; e < a.length; e++)
        t["$" + a[e]] = !0;
      for (a = 0; a < l.length; a++)
        e = t.hasOwnProperty("$" + l[a].value), l[a].selected !== e && (l[a].selected = e), e && u && (l[a].defaultSelected = !0);
    } else {
      for (a = "" + At(a), t = null, e = 0; e < l.length; e++) {
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
    if (t != null && (t = "" + At(t), t !== l.value && (l.value = t), a == null)) {
      l.defaultValue !== t && (l.defaultValue = t);
      return;
    }
    l.defaultValue = a != null ? "" + At(a) : "";
  }
  function Lc(l, t, a, u) {
    if (t == null) {
      if (u != null) {
        if (a != null) throw Error(v(92));
        if (Cl(u)) {
          if (1 < u.length) throw Error(v(93));
          u = u[0];
        }
        a = u;
      }
      a == null && (a = ""), t = a;
    }
    a = At(t), l.defaultValue = a, u = l.textContent, u === a && u !== "" && u !== null && (l.value = u), si(l);
  }
  function ou(l, t) {
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
  function vi(l) {
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
  function we(l) {
    return uv.test("" + l) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : l;
  }
  function Jt() {
  }
  var yi = null;
  function mi(l) {
    return l = l.target || l.srcElement || window, l.correspondingUseElement && (l = l.correspondingUseElement), l.nodeType === 3 ? l.parentNode : l;
  }
  var du = null, vu = null;
  function Jc(l) {
    var t = iu(l);
    if (t && (l = t.stateNode)) {
      var a = l[et] || null;
      l: switch (l = t.stateNode, t.type) {
        case "input":
          if (oi(
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
              'input[name="' + Ot(
                "" + t
              ) + '"][type="radio"]'
            ), t = 0; t < a.length; t++) {
              var u = a[t];
              if (u !== l && u.form === l.form) {
                var e = u[et] || null;
                if (!e) throw Error(v(90));
                oi(
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
          t = a.value, t != null && su(l, !!a.multiple, t, !1);
      }
    }
  }
  var hi = !1;
  function wc(l, t, a) {
    if (hi) return l(t, a);
    hi = !0;
    try {
      var u = l(t);
      return u;
    } finally {
      if (hi = !1, (du !== null || vu !== null) && (qn(), du && (t = du, l = vu, vu = du = null, Jc(t), l)))
        for (t = 0; t < l.length; t++) Jc(l[t]);
    }
  }
  function $u(l, t) {
    var a = l.stateNode;
    if (a === null) return null;
    var u = a[et] || null;
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
  var wt = !(typeof window > "u" || typeof window.document > "u" || typeof window.document.createElement > "u"), ri = !1;
  if (wt)
    try {
      var Fu = {};
      Object.defineProperty(Fu, "passive", {
        get: function() {
          ri = !0;
        }
      }), window.addEventListener("test", Fu, Fu), window.removeEventListener("test", Fu, Fu);
    } catch {
      ri = !1;
    }
  var va = null, Si = null, We = null;
  function Wc() {
    if (We) return We;
    var l, t = Si, a = t.length, u, e = "value" in va ? va.value : va.textContent, n = e.length;
    for (l = 0; l < a && t[l] === e[l]; l++) ;
    var i = a - l;
    for (u = 1; u <= i && t[a - u] === e[n - u]; u++) ;
    return We = e.slice(l, 1 < u ? 1 - u : void 0);
  }
  function $e(l) {
    var t = l.keyCode;
    return "charCode" in l ? (l = l.charCode, l === 0 && t === 13 && (l = 13)) : l = t, l === 10 && (l = 13), 32 <= l || l === 13 ? l : 0;
  }
  function Fe() {
    return !0;
  }
  function $c() {
    return !1;
  }
  function nt(l) {
    function t(a, u, e, n, i) {
      this._reactName = a, this._targetInst = e, this.type = u, this.nativeEvent = n, this.target = i, this.currentTarget = null;
      for (var f in l)
        l.hasOwnProperty(f) && (a = l[f], this[f] = a ? a(n) : n[f]);
      return this.isDefaultPrevented = (n.defaultPrevented != null ? n.defaultPrevented : n.returnValue === !1) ? Fe : $c, this.isPropagationStopped = $c, this;
    }
    return C(t.prototype, {
      preventDefault: function() {
        this.defaultPrevented = !0;
        var a = this.nativeEvent;
        a && (a.preventDefault ? a.preventDefault() : typeof a.returnValue != "unknown" && (a.returnValue = !1), this.isDefaultPrevented = Fe);
      },
      stopPropagation: function() {
        var a = this.nativeEvent;
        a && (a.stopPropagation ? a.stopPropagation() : typeof a.cancelBubble != "unknown" && (a.cancelBubble = !0), this.isPropagationStopped = Fe);
      },
      persist: function() {
      },
      isPersistent: Fe
    }), t;
  }
  var Ya = {
    eventPhase: 0,
    bubbles: 0,
    cancelable: 0,
    timeStamp: function(l) {
      return l.timeStamp || Date.now();
    },
    defaultPrevented: 0,
    isTrusted: 0
  }, ke = nt(Ya), ku = C({}, Ya, { view: 0, detail: 0 }), ev = nt(ku), gi, bi, Iu, Ie = C({}, ku, {
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
    getModifierState: zi,
    button: 0,
    buttons: 0,
    relatedTarget: function(l) {
      return l.relatedTarget === void 0 ? l.fromElement === l.srcElement ? l.toElement : l.fromElement : l.relatedTarget;
    },
    movementX: function(l) {
      return "movementX" in l ? l.movementX : (l !== Iu && (Iu && l.type === "mousemove" ? (gi = l.screenX - Iu.screenX, bi = l.screenY - Iu.screenY) : bi = gi = 0, Iu = l), gi);
    },
    movementY: function(l) {
      return "movementY" in l ? l.movementY : bi;
    }
  }), Fc = nt(Ie), nv = C({}, Ie, { dataTransfer: 0 }), iv = nt(nv), fv = C({}, ku, { relatedTarget: 0 }), Ei = nt(fv), cv = C({}, Ya, {
    animationName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), sv = nt(cv), ov = C({}, Ya, {
    clipboardData: function(l) {
      return "clipboardData" in l ? l.clipboardData : window.clipboardData;
    }
  }), dv = nt(ov), vv = C({}, Ya, { data: 0 }), kc = nt(vv), yv = {
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
  function zi() {
    return rv;
  }
  var Sv = C({}, ku, {
    key: function(l) {
      if (l.key) {
        var t = yv[l.key] || l.key;
        if (t !== "Unidentified") return t;
      }
      return l.type === "keypress" ? (l = $e(l), l === 13 ? "Enter" : String.fromCharCode(l)) : l.type === "keydown" || l.type === "keyup" ? mv[l.keyCode] || "Unidentified" : "";
    },
    code: 0,
    location: 0,
    ctrlKey: 0,
    shiftKey: 0,
    altKey: 0,
    metaKey: 0,
    repeat: 0,
    locale: 0,
    getModifierState: zi,
    charCode: function(l) {
      return l.type === "keypress" ? $e(l) : 0;
    },
    keyCode: function(l) {
      return l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    },
    which: function(l) {
      return l.type === "keypress" ? $e(l) : l.type === "keydown" || l.type === "keyup" ? l.keyCode : 0;
    }
  }), gv = nt(Sv), bv = C({}, Ie, {
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
  }), Ic = nt(bv), Ev = C({}, ku, {
    touches: 0,
    targetTouches: 0,
    changedTouches: 0,
    altKey: 0,
    metaKey: 0,
    ctrlKey: 0,
    shiftKey: 0,
    getModifierState: zi
  }), zv = nt(Ev), Tv = C({}, Ya, {
    propertyName: 0,
    elapsedTime: 0,
    pseudoElement: 0
  }), _v = nt(Tv), Av = C({}, Ie, {
    deltaX: function(l) {
      return "deltaX" in l ? l.deltaX : "wheelDeltaX" in l ? -l.wheelDeltaX : 0;
    },
    deltaY: function(l) {
      return "deltaY" in l ? l.deltaY : "wheelDeltaY" in l ? -l.wheelDeltaY : "wheelDelta" in l ? -l.wheelDelta : 0;
    },
    deltaZ: 0,
    deltaMode: 0
  }), Ov = nt(Av), Mv = C({}, Ya, {
    newState: 0,
    oldState: 0
  }), pv = nt(Mv), Dv = [9, 13, 27, 32], Ti = wt && "CompositionEvent" in window, Pu = null;
  wt && "documentMode" in document && (Pu = document.documentMode);
  var Uv = wt && "TextEvent" in window && !Pu, Pc = wt && (!Ti || Pu && 8 < Pu && 11 >= Pu), ls = " ", ts = !1;
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
  var yu = !1;
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
    if (yu)
      return l === "compositionend" || !Ti && as(l, t) ? (l = Wc(), We = Si = va = null, yu = !1, l) : null;
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
    du ? vu ? vu.push(u) : vu = [u] : du = u, t = Zn(t, "onChange"), 0 < t.length && (a = new ke(
      "onChange",
      "change",
      null,
      a,
      u
    ), l.push({ event: a, listeners: t }));
  }
  var le = null, te = null;
  function Cv(l) {
    Zo(l, 0);
  }
  function Pe(l) {
    var t = Wu(l);
    if (Qc(t)) return l;
  }
  function is(l, t) {
    if (l === "change") return t;
  }
  var fs = !1;
  if (wt) {
    var _i;
    if (wt) {
      var Ai = "oninput" in document;
      if (!Ai) {
        var cs = document.createElement("div");
        cs.setAttribute("oninput", "return;"), Ai = typeof cs.oninput == "function";
      }
      _i = Ai;
    } else _i = !1;
    fs = _i && (!document.documentMode || 9 < document.documentMode);
  }
  function ss() {
    le && (le.detachEvent("onpropertychange", os), te = le = null);
  }
  function os(l) {
    if (l.propertyName === "value" && Pe(te)) {
      var t = [];
      ns(
        t,
        te,
        l,
        mi(l)
      ), wc(Cv, t);
    }
  }
  function jv(l, t, a) {
    l === "focusin" ? (ss(), le = t, te = a, le.attachEvent("onpropertychange", os)) : l === "focusout" && ss();
  }
  function qv(l) {
    if (l === "selectionchange" || l === "keyup" || l === "keydown")
      return Pe(te);
  }
  function xv(l, t) {
    if (l === "click") return Pe(t);
  }
  function Bv(l, t) {
    if (l === "input" || l === "change")
      return Pe(t);
  }
  function Yv(l, t) {
    return l === t && (l !== 0 || 1 / l === 1 / t) || l !== l && t !== t;
  }
  var ht = typeof Object.is == "function" ? Object.is : Yv;
  function ae(l, t) {
    if (ht(l, t)) return !0;
    if (typeof l != "object" || l === null || typeof t != "object" || t === null)
      return !1;
    var a = Object.keys(l), u = Object.keys(t);
    if (a.length !== u.length) return !1;
    for (u = 0; u < a.length; u++) {
      var e = a[u];
      if (!Yl.call(t, e) || !ht(l[e], t[e]))
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
    for (var t = Je(l.document); t instanceof l.HTMLIFrameElement; ) {
      try {
        var a = typeof t.contentWindow.location.href == "string";
      } catch {
        a = !1;
      }
      if (a) l = t.contentWindow;
      else break;
      t = Je(l.document);
    }
    return t;
  }
  function Oi(l) {
    var t = l && l.nodeName && l.nodeName.toLowerCase();
    return t && (t === "input" && (l.type === "text" || l.type === "search" || l.type === "tel" || l.type === "url" || l.type === "password") || t === "textarea" || l.contentEditable === "true");
  }
  var Gv = wt && "documentMode" in document && 11 >= document.documentMode, mu = null, Mi = null, ue = null, pi = !1;
  function hs(l, t, a) {
    var u = a.window === a ? a.document : a.nodeType === 9 ? a : a.ownerDocument;
    pi || mu == null || mu !== Je(u) || (u = mu, "selectionStart" in u && Oi(u) ? u = { start: u.selectionStart, end: u.selectionEnd } : (u = (u.ownerDocument && u.ownerDocument.defaultView || window).getSelection(), u = {
      anchorNode: u.anchorNode,
      anchorOffset: u.anchorOffset,
      focusNode: u.focusNode,
      focusOffset: u.focusOffset
    }), ue && ae(ue, u) || (ue = u, u = Zn(Mi, "onSelect"), 0 < u.length && (t = new ke(
      "onSelect",
      "select",
      null,
      t,
      a
    ), l.push({ event: t, listeners: u }), t.target = mu)));
  }
  function Ga(l, t) {
    var a = {};
    return a[l.toLowerCase()] = t.toLowerCase(), a["Webkit" + l] = "webkit" + t, a["Moz" + l] = "moz" + t, a;
  }
  var hu = {
    animationend: Ga("Animation", "AnimationEnd"),
    animationiteration: Ga("Animation", "AnimationIteration"),
    animationstart: Ga("Animation", "AnimationStart"),
    transitionrun: Ga("Transition", "TransitionRun"),
    transitionstart: Ga("Transition", "TransitionStart"),
    transitioncancel: Ga("Transition", "TransitionCancel"),
    transitionend: Ga("Transition", "TransitionEnd")
  }, Di = {}, rs = {};
  wt && (rs = document.createElement("div").style, "AnimationEvent" in window || (delete hu.animationend.animation, delete hu.animationiteration.animation, delete hu.animationstart.animation), "TransitionEvent" in window || delete hu.transitionend.transition);
  function Qa(l) {
    if (Di[l]) return Di[l];
    if (!hu[l]) return l;
    var t = hu[l], a;
    for (a in t)
      if (t.hasOwnProperty(a) && a in rs)
        return Di[l] = t[a];
    return l;
  }
  var Ss = Qa("animationend"), gs = Qa("animationiteration"), bs = Qa("animationstart"), Qv = Qa("transitionrun"), Xv = Qa("transitionstart"), Zv = Qa("transitioncancel"), Es = Qa("transitionend"), zs = /* @__PURE__ */ new Map(), Ui = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
    " "
  );
  Ui.push("scrollEnd");
  function qt(l, t) {
    zs.set(l, t), Ba(t, [l]);
  }
  var ln = typeof reportError == "function" ? reportError : function(l) {
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
  }, Mt = [], ru = 0, Ni = 0;
  function tn() {
    for (var l = ru, t = Ni = ru = 0; t < l; ) {
      var a = Mt[t];
      Mt[t++] = null;
      var u = Mt[t];
      Mt[t++] = null;
      var e = Mt[t];
      Mt[t++] = null;
      var n = Mt[t];
      if (Mt[t++] = null, u !== null && e !== null) {
        var i = u.pending;
        i === null ? e.next = e : (e.next = i.next, i.next = e), u.pending = e;
      }
      n !== 0 && Ts(a, e, n);
    }
  }
  function an(l, t, a, u) {
    Mt[ru++] = l, Mt[ru++] = t, Mt[ru++] = a, Mt[ru++] = u, Ni |= u, l.lanes |= u, l = l.alternate, l !== null && (l.lanes |= u);
  }
  function Ri(l, t, a, u) {
    return an(l, t, a, u), un(l);
  }
  function Xa(l, t) {
    return an(l, null, null, t), un(l);
  }
  function Ts(l, t, a) {
    l.lanes |= a;
    var u = l.alternate;
    u !== null && (u.lanes |= a);
    for (var e = !1, n = l.return; n !== null; )
      n.childLanes |= a, u = n.alternate, u !== null && (u.childLanes |= a), n.tag === 22 && (l = n.stateNode, l === null || l._visibility & 1 || (e = !0)), l = n, n = n.return;
    return l.tag === 3 ? (n = l.stateNode, e && t !== null && (e = 31 - mt(a), l = n.hiddenUpdates, u = l[e], u === null ? l[e] = [t] : u.push(t), t.lane = a | 536870912), n) : null;
  }
  function un(l) {
    if (50 < Oe)
      throw Oe = 0, Xf = null, Error(v(185));
    for (var t = l.return; t !== null; )
      l = t, t = l.return;
    return l.tag === 3 ? l.stateNode : null;
  }
  var Su = {};
  function Lv(l, t, a, u) {
    this.tag = l, this.key = a, this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null, this.index = 0, this.refCleanup = this.ref = null, this.pendingProps = t, this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null, this.mode = u, this.subtreeFlags = this.flags = 0, this.deletions = null, this.childLanes = this.lanes = 0, this.alternate = null;
  }
  function rt(l, t, a, u) {
    return new Lv(l, t, a, u);
  }
  function Hi(l) {
    return l = l.prototype, !(!l || !l.isReactComponent);
  }
  function Wt(l, t) {
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
  function en(l, t, a, u, e, n) {
    var i = 0;
    if (u = l, typeof l == "function") Hi(l) && (i = 1);
    else if (typeof l == "string")
      i = Wy(
        l,
        a,
        U.current
      ) ? 26 : l === "html" || l === "head" || l === "body" ? 27 : 5;
    else
      l: switch (l) {
        case xl:
          return l = rt(31, a, t, e), l.elementType = xl, l.lanes = n, l;
        case Dl:
          return Za(a.children, e, n, t);
        case K:
          i = 8, e |= 24;
          break;
        case Ul:
          return l = rt(12, a, t, e | 2), l.elementType = Ul, l.lanes = n, l;
        case lt:
          return l = rt(13, a, t, e), l.elementType = lt, l.lanes = n, l;
        case zl:
          return l = rt(19, a, t, e), l.elementType = zl, l.lanes = n, l;
        default:
          if (typeof l == "object" && l !== null)
            switch (l.$$typeof) {
              case Ol:
                i = 10;
                break l;
              case al:
                i = 9;
                break l;
              case Tl:
                i = 11;
                break l;
              case J:
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
  function Za(l, t, a, u) {
    return l = rt(7, l, u, t), l.lanes = a, l;
  }
  function Ci(l, t, a) {
    return l = rt(6, l, null, t), l.lanes = a, l;
  }
  function As(l) {
    var t = rt(18, null, null, 0);
    return t.stateNode = l, t;
  }
  function ji(l, t, a) {
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
  function pt(l, t) {
    if (typeof l == "object" && l !== null) {
      var a = Os.get(l);
      return a !== void 0 ? a : (t = {
        value: l,
        source: t,
        stack: Bl(t)
      }, Os.set(l, t), t);
    }
    return {
      value: l,
      source: t,
      stack: Bl(t)
    };
  }
  var gu = [], bu = 0, nn = null, ee = 0, Dt = [], Ut = 0, ya = null, Qt = 1, Xt = "";
  function $t(l, t) {
    gu[bu++] = ee, gu[bu++] = nn, nn = l, ee = t;
  }
  function Ms(l, t, a) {
    Dt[Ut++] = Qt, Dt[Ut++] = Xt, Dt[Ut++] = ya, ya = l;
    var u = Qt;
    l = Xt;
    var e = 32 - mt(u) - 1;
    u &= ~(1 << e), a += 1;
    var n = 32 - mt(t) + e;
    if (30 < n) {
      var i = e - e % 5;
      n = (u & (1 << i) - 1).toString(32), u >>= i, e -= i, Qt = 1 << 32 - mt(t) + e | a << e | u, Xt = n + l;
    } else
      Qt = 1 << n | a << e | u, Xt = l;
  }
  function qi(l) {
    l.return !== null && ($t(l, 1), Ms(l, 1, 0));
  }
  function xi(l) {
    for (; l === nn; )
      nn = gu[--bu], gu[bu] = null, ee = gu[--bu], gu[bu] = null;
    for (; l === ya; )
      ya = Dt[--Ut], Dt[Ut] = null, Xt = Dt[--Ut], Dt[Ut] = null, Qt = Dt[--Ut], Dt[Ut] = null;
  }
  function ps(l, t) {
    Dt[Ut++] = Qt, Dt[Ut++] = Xt, Dt[Ut++] = ya, Qt = t.id, Xt = t.overflow, ya = l;
  }
  var $l = null, _l = null, tl = !1, ma = null, Nt = !1, Bi = Error(v(519));
  function ha(l) {
    var t = Error(
      v(
        418,
        1 < arguments.length && arguments[1] !== void 0 && arguments[1] ? "text" : "HTML",
        ""
      )
    );
    throw ne(pt(t, l)), Bi;
  }
  function Ds(l) {
    var t = l.stateNode, a = l.type, u = l.memoizedProps;
    switch (t[Wl] = l, t[et] = u, a) {
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
        for (a = 0; a < pe.length; a++)
          I(pe[a], t);
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
    a = u.children, typeof a != "string" && typeof a != "number" && typeof a != "bigint" || t.textContent === "" + a || u.suppressHydrationWarning === !0 || Jo(t.textContent, a) ? (u.popover != null && (I("beforetoggle", t), I("toggle", t)), u.onScroll != null && I("scroll", t), u.onScrollEnd != null && I("scrollend", t), u.onClick != null && (t.onclick = Jt), t = !0) : t = !1, t || ha(l, !0);
  }
  function Us(l) {
    for ($l = l.return; $l; )
      switch ($l.tag) {
        case 5:
        case 31:
        case 13:
          Nt = !1;
          return;
        case 27:
        case 3:
          Nt = !0;
          return;
        default:
          $l = $l.return;
      }
  }
  function Eu(l) {
    if (l !== $l) return !1;
    if (!tl) return Us(l), tl = !0, !1;
    var t = l.tag, a;
    if ((a = t !== 3 && t !== 27) && ((a = t === 5) && (a = l.type, a = !(a !== "form" && a !== "button") || ac(l.type, l.memoizedProps)), a = !a), a && _l && ha(l), Us(l), t === 13) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(v(317));
      _l = td(l);
    } else if (t === 31) {
      if (l = l.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(v(317));
      _l = td(l);
    } else
      t === 27 ? (t = _l, Ua(l.type) ? (l = fc, fc = null, _l = l) : _l = t) : _l = $l ? Ht(l.stateNode.nextSibling) : null;
    return !0;
  }
  function La() {
    _l = $l = null, tl = !1;
  }
  function Yi() {
    var l = ma;
    return l !== null && (st === null ? st = l : st.push.apply(
      st,
      l
    ), ma = null), l;
  }
  function ne(l) {
    ma === null ? ma = [l] : ma.push(l);
  }
  var Gi = o(null), Va = null, Ft = null;
  function ra(l, t, a) {
    p(Gi, t._currentValue), t._currentValue = a;
  }
  function kt(l) {
    l._currentValue = Gi.current, z(Gi);
  }
  function Qi(l, t, a) {
    for (; l !== null; ) {
      var u = l.alternate;
      if ((l.childLanes & t) !== t ? (l.childLanes |= t, u !== null && (u.childLanes |= t)) : u !== null && (u.childLanes & t) !== t && (u.childLanes |= t), l === a) break;
      l = l.return;
    }
  }
  function Xi(l, t, a, u) {
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
              n.lanes |= a, f = n.alternate, f !== null && (f.lanes |= a), Qi(
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
        i.lanes |= a, n = i.alternate, n !== null && (n.lanes |= a), Qi(i, a, l), i = null;
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
  function zu(l, t, a, u) {
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
      } else if (e === B.current) {
        if (i = e.alternate, i === null) throw Error(v(387));
        i.memoizedState.memoizedState !== e.memoizedState.memoizedState && (l !== null ? l.push(He) : l = [He]);
      }
      e = e.return;
    }
    l !== null && Xi(
      t,
      l,
      a,
      u
    ), t.flags |= 262144;
  }
  function fn(l) {
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
  function Ka(l) {
    Va = l, Ft = null, l = l.dependencies, l !== null && (l.firstContext = null);
  }
  function Fl(l) {
    return Ns(Va, l);
  }
  function cn(l, t) {
    return Va === null && Ka(l), Ns(l, t);
  }
  function Ns(l, t) {
    var a = t._currentValue;
    if (t = { context: t, memoizedValue: a, next: null }, Ft === null) {
      if (l === null) throw Error(v(308));
      Ft = t, l.dependencies = { lanes: 0, firstContext: t }, l.flags |= 524288;
    } else Ft = Ft.next = t;
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
  }, Kv = _.unstable_scheduleCallback, Jv = _.unstable_NormalPriority, Gl = {
    $$typeof: Ol,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
  function Zi() {
    return {
      controller: new Vv(),
      data: /* @__PURE__ */ new Map(),
      refCount: 0
    };
  }
  function ie(l) {
    l.refCount--, l.refCount === 0 && Kv(Jv, function() {
      l.controller.abort();
    });
  }
  var fe = null, Li = 0, Tu = 0, _u = null;
  function wv(l, t) {
    if (fe === null) {
      var a = fe = [];
      Li = 0, Tu = wf(), _u = {
        status: "pending",
        value: void 0,
        then: function(u) {
          a.push(u);
        }
      };
    }
    return Li++, t.then(Rs, Rs), t;
  }
  function Rs() {
    if (--Li === 0 && fe !== null) {
      _u !== null && (_u.status = "fulfilled");
      var l = fe;
      fe = null, Tu = 0, _u = null;
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
    ro = Vl(), typeof t == "object" && t !== null && typeof t.then == "function" && wv(l, t), Hs !== null && Hs(l, t);
  };
  var Ja = o(null);
  function Vi() {
    var l = Ja.current;
    return l !== null ? l : El.pooledCache;
  }
  function sn(l, t) {
    t === null ? p(Ja, Ja.current) : p(Ja, t.pool);
  }
  function Cs() {
    var l = Vi();
    return l === null ? null : { parent: Gl._currentValue, pool: l };
  }
  var Au = Error(v(460)), Ki = Error(v(474)), on = Error(v(542)), dn = { then: function() {
  } };
  function js(l) {
    return l = l.status, l === "fulfilled" || l === "rejected";
  }
  function qs(l, t, a) {
    switch (a = l[a], a === void 0 ? l.push(t) : a !== t && (t.then(Jt, Jt), t = a), t.status) {
      case "fulfilled":
        return t.value;
      case "rejected":
        throw l = t.reason, Bs(l), l;
      default:
        if (typeof t.status == "string") t.then(Jt, Jt);
        else {
          if (l = El, l !== null && 100 < l.shellSuspendCounter)
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
            throw l = t.reason, Bs(l), l;
        }
        throw Wa = t, Au;
    }
  }
  function wa(l) {
    try {
      var t = l._init;
      return t(l._payload);
    } catch (a) {
      throw a !== null && typeof a == "object" && typeof a.then == "function" ? (Wa = a, Au) : a;
    }
  }
  var Wa = null;
  function xs() {
    if (Wa === null) throw Error(v(459));
    var l = Wa;
    return Wa = null, l;
  }
  function Bs(l) {
    if (l === Au || l === on)
      throw Error(v(483));
  }
  var Ou = null, ce = 0;
  function vn(l) {
    var t = ce;
    return ce += 1, Ou === null && (Ou = []), qs(Ou, l, t);
  }
  function se(l, t) {
    t = t.props.ref, l.ref = t !== void 0 ? t : null;
  }
  function yn(l, t) {
    throw t.$$typeof === V ? Error(v(525)) : (l = Object.prototype.toString.call(t), Error(
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
      return d = Wt(d, s), d.index = 0, d.sibling = null, d;
    }
    function n(d, s, y) {
      return d.index = y, l ? (y = d.alternate, y !== null ? (y = y.index, y < s ? (d.flags |= 67108866, s) : y) : (d.flags |= 67108866, s)) : (d.flags |= 1048576, s);
    }
    function i(d) {
      return l && d.alternate === null && (d.flags |= 67108866), d;
    }
    function f(d, s, y, E) {
      return s === null || s.tag !== 6 ? (s = Ci(y, d.mode, E), s.return = d, s) : (s = e(s, y), s.return = d, s);
    }
    function c(d, s, y, E) {
      var j = y.type;
      return j === Dl ? g(
        d,
        s,
        y.props.children,
        E,
        y.key
      ) : s !== null && (s.elementType === j || typeof j == "object" && j !== null && j.$$typeof === wl && wa(j) === s.type) ? (s = e(s, y.props), se(s, y), s.return = d, s) : (s = en(
        y.type,
        y.key,
        y.props,
        null,
        d.mode,
        E
      ), se(s, y), s.return = d, s);
    }
    function m(d, s, y, E) {
      return s === null || s.tag !== 4 || s.stateNode.containerInfo !== y.containerInfo || s.stateNode.implementation !== y.implementation ? (s = ji(y, d.mode, E), s.return = d, s) : (s = e(s, y.children || []), s.return = d, s);
    }
    function g(d, s, y, E, j) {
      return s === null || s.tag !== 7 ? (s = Za(
        y,
        d.mode,
        E,
        j
      ), s.return = d, s) : (s = e(s, y), s.return = d, s);
    }
    function T(d, s, y) {
      if (typeof s == "string" && s !== "" || typeof s == "number" || typeof s == "bigint")
        return s = Ci(
          "" + s,
          d.mode,
          y
        ), s.return = d, s;
      if (typeof s == "object" && s !== null) {
        switch (s.$$typeof) {
          case Sl:
            return y = en(
              s.type,
              s.key,
              s.props,
              null,
              d.mode,
              y
            ), se(y, s), y.return = d, y;
          case sl:
            return s = ji(
              s,
              d.mode,
              y
            ), s.return = d, s;
          case wl:
            return s = wa(s), T(d, s, y);
        }
        if (Cl(s) || vl(s))
          return s = Za(
            s,
            d.mode,
            y,
            null
          ), s.return = d, s;
        if (typeof s.then == "function")
          return T(d, vn(s), y);
        if (s.$$typeof === Ol)
          return T(
            d,
            cn(d, s),
            y
          );
        yn(d, s);
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
            return y = wa(y), h(d, s, y, E);
        }
        if (Cl(y) || vl(y))
          return j !== null ? null : g(d, s, y, E, null);
        if (typeof y.then == "function")
          return h(
            d,
            s,
            vn(y),
            E
          );
        if (y.$$typeof === Ol)
          return h(
            d,
            s,
            cn(d, y),
            E
          );
        yn(d, y);
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
            return E = wa(E), r(
              d,
              s,
              y,
              E,
              j
            );
        }
        if (Cl(E) || vl(E))
          return d = d.get(y) || null, g(s, d, E, j, null);
        if (typeof E.then == "function")
          return r(
            d,
            s,
            y,
            vn(E),
            j
          );
        if (E.$$typeof === Ol)
          return r(
            d,
            s,
            y,
            cn(s, E),
            j
          );
        yn(s, E);
      }
      return null;
    }
    function N(d, s, y, E) {
      for (var j = null, nl = null, H = s, w = s = 0, ll = null; H !== null && w < y.length; w++) {
        H.index > w ? (ll = H, H = null) : ll = H.sibling;
        var il = h(
          d,
          H,
          y[w],
          E
        );
        if (il === null) {
          H === null && (H = ll);
          break;
        }
        l && H && il.alternate === null && t(d, H), s = n(il, s, w), nl === null ? j = il : nl.sibling = il, nl = il, H = ll;
      }
      if (w === y.length)
        return a(d, H), tl && $t(d, w), j;
      if (H === null) {
        for (; w < y.length; w++)
          H = T(d, y[w], E), H !== null && (s = n(
            H,
            s,
            w
          ), nl === null ? j = H : nl.sibling = H, nl = H);
        return tl && $t(d, w), j;
      }
      for (H = u(H); w < y.length; w++)
        ll = r(
          H,
          d,
          w,
          y[w],
          E
        ), ll !== null && (l && ll.alternate !== null && H.delete(
          ll.key === null ? w : ll.key
        ), s = n(
          ll,
          s,
          w
        ), nl === null ? j = ll : nl.sibling = ll, nl = ll);
      return l && H.forEach(function(ja) {
        return t(d, ja);
      }), tl && $t(d, w), j;
    }
    function Y(d, s, y, E) {
      if (y == null) throw Error(v(151));
      for (var j = null, nl = null, H = s, w = s = 0, ll = null, il = y.next(); H !== null && !il.done; w++, il = y.next()) {
        H.index > w ? (ll = H, H = null) : ll = H.sibling;
        var ja = h(d, H, il.value, E);
        if (ja === null) {
          H === null && (H = ll);
          break;
        }
        l && H && ja.alternate === null && t(d, H), s = n(ja, s, w), nl === null ? j = ja : nl.sibling = ja, nl = ja, H = ll;
      }
      if (il.done)
        return a(d, H), tl && $t(d, w), j;
      if (H === null) {
        for (; !il.done; w++, il = y.next())
          il = T(d, il.value, E), il !== null && (s = n(il, s, w), nl === null ? j = il : nl.sibling = il, nl = il);
        return tl && $t(d, w), j;
      }
      for (H = u(H); !il.done; w++, il = y.next())
        il = r(H, d, w, il.value, E), il !== null && (l && il.alternate !== null && H.delete(il.key === null ? w : il.key), s = n(il, s, w), nl === null ? j = il : nl.sibling = il, nl = il);
      return l && H.forEach(function(nm) {
        return t(d, nm);
      }), tl && $t(d, w), j;
    }
    function rl(d, s, y, E) {
      if (typeof y == "object" && y !== null && y.type === Dl && y.key === null && (y = y.props.children), typeof y == "object" && y !== null) {
        switch (y.$$typeof) {
          case Sl:
            l: {
              for (var j = y.key; s !== null; ) {
                if (s.key === j) {
                  if (j = y.type, j === Dl) {
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
                  } else if (s.elementType === j || typeof j == "object" && j !== null && j.$$typeof === wl && wa(j) === s.type) {
                    a(
                      d,
                      s.sibling
                    ), E = e(s, y.props), se(E, y), E.return = d, d = E;
                    break l;
                  }
                  a(d, s);
                  break;
                } else t(d, s);
                s = s.sibling;
              }
              y.type === Dl ? (E = Za(
                y.props.children,
                d.mode,
                E,
                y.key
              ), E.return = d, d = E) : (E = en(
                y.type,
                y.key,
                y.props,
                null,
                d.mode,
                E
              ), se(E, y), E.return = d, d = E);
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
              E = ji(y, d.mode, E), E.return = d, d = E;
            }
            return i(d);
          case wl:
            return y = wa(y), rl(
              d,
              s,
              y,
              E
            );
        }
        if (Cl(y))
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
            vn(y),
            E
          );
        if (y.$$typeof === Ol)
          return rl(
            d,
            s,
            cn(d, y),
            E
          );
        yn(d, y);
      }
      return typeof y == "string" && y !== "" || typeof y == "number" || typeof y == "bigint" ? (y = "" + y, s !== null && s.tag === 6 ? (a(d, s.sibling), E = e(s, y), E.return = d, d = E) : (a(d, s), E = Ci(y, d.mode, E), E.return = d, d = E), i(d)) : a(d, s);
    }
    return function(d, s, y, E) {
      try {
        ce = 0;
        var j = rl(
          d,
          s,
          y,
          E
        );
        return Ou = null, j;
      } catch (H) {
        if (H === Au || H === on) throw H;
        var nl = rt(29, H, null, d.mode);
        return nl.lanes = E, nl.return = d, nl;
      } finally {
      }
    };
  }
  var $a = Ys(!0), Gs = Ys(!1), Sa = !1;
  function Ji(l) {
    l.updateQueue = {
      baseState: l.memoizedState,
      firstBaseUpdate: null,
      lastBaseUpdate: null,
      shared: { pending: null, lanes: 0, hiddenCallbacks: null },
      callbacks: null
    };
  }
  function wi(l, t) {
    l = l.updateQueue, t.updateQueue === l && (t.updateQueue = {
      baseState: l.baseState,
      firstBaseUpdate: l.firstBaseUpdate,
      lastBaseUpdate: l.lastBaseUpdate,
      shared: l.shared,
      callbacks: null
    });
  }
  function ga(l) {
    return { lane: l, tag: 0, payload: null, callback: null, next: null };
  }
  function ba(l, t, a) {
    var u = l.updateQueue;
    if (u === null) return null;
    if (u = u.shared, (fl & 2) !== 0) {
      var e = u.pending;
      return e === null ? t.next = t : (t.next = e.next, e.next = t), u.pending = t, t = un(l), Ts(l, null, a), t;
    }
    return an(l, u, t, a), un(l);
  }
  function oe(l, t, a) {
    if (t = t.updateQueue, t !== null && (t = t.shared, (a & 4194048) !== 0)) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Nc(l, a);
    }
  }
  function Wi(l, t) {
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
  var $i = !1;
  function de() {
    if ($i) {
      var l = _u;
      if (l !== null) throw l;
    }
  }
  function ve(l, t, a, u) {
    $i = !1;
    var e = l.updateQueue;
    Sa = !1;
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
          h !== 0 && h === Tu && ($i = !0), g !== null && (g = g.next = {
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
                Sa = !0;
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
      g === null && (c = T), e.baseState = c, e.firstBaseUpdate = m, e.lastBaseUpdate = g, n === null && (e.shared.lanes = 0), Aa |= i, l.lanes = i, l.memoizedState = T;
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
  var Mu = o(null), mn = o(0);
  function Zs(l, t) {
    l = ia, p(mn, l), p(Mu, t), ia = l | t.baseLanes;
  }
  function Fi() {
    p(mn, ia), p(Mu, Mu.current);
  }
  function ki() {
    ia = mn.current, z(Mu), z(mn);
  }
  var St = o(null), Rt = null;
  function Ea(l) {
    var t = l.alternate;
    p(jl, jl.current & 1), p(St, l), Rt === null && (t === null || Mu.current !== null || t.memoizedState !== null) && (Rt = l);
  }
  function Ii(l) {
    p(jl, jl.current), p(St, l), Rt === null && (Rt = l);
  }
  function Ls(l) {
    l.tag === 22 ? (p(jl, jl.current), p(St, l), Rt === null && (Rt = l)) : za();
  }
  function za() {
    p(jl, jl.current), p(St, St.current);
  }
  function gt(l) {
    z(St), Rt === l && (Rt = null), z(jl);
  }
  var jl = o(0);
  function hn(l) {
    for (var t = l; t !== null; ) {
      if (t.tag === 13) {
        var a = t.memoizedState;
        if (a !== null && (a = a.dehydrated, a === null || nc(a) || ic(a)))
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
  var It = 0, L = null, ml = null, Ql = null, rn = !1, pu = !1, Fa = !1, Sn = 0, ye = 0, Du = null, $v = 0;
  function Rl() {
    throw Error(v(321));
  }
  function Pi(l, t) {
    if (t === null) return !1;
    for (var a = 0; a < t.length && a < l.length; a++)
      if (!ht(l[a], t[a])) return !1;
    return !0;
  }
  function lf(l, t, a, u, e, n) {
    return It = n, L = t, t.memoizedState = null, t.updateQueue = null, t.lanes = 0, S.H = l === null || l.memoizedState === null ? M0 : rf, Fa = !1, n = a(u, e), Fa = !1, pu && (n = Ks(
      t,
      a,
      u,
      e
    )), Vs(l), n;
  }
  function Vs(l) {
    S.H = re;
    var t = ml !== null && ml.next !== null;
    if (It = 0, Ql = ml = L = null, rn = !1, ye = 0, Du = null, t) throw Error(v(300));
    l === null || Xl || (l = l.dependencies, l !== null && fn(l) && (Xl = !0));
  }
  function Ks(l, t, a, u) {
    L = l;
    var e = 0;
    do {
      if (pu && (Du = null), ye = 0, pu = !1, 25 <= e) throw Error(v(301));
      if (e += 1, Ql = ml = null, l.updateQueue != null) {
        var n = l.updateQueue;
        n.lastEffect = null, n.events = null, n.stores = null, n.memoCache != null && (n.memoCache.index = 0);
      }
      S.H = p0, n = t(a, u);
    } while (pu);
    return n;
  }
  function Fv() {
    var l = S.H, t = l.useState()[0];
    return t = typeof t.then == "function" ? me(t) : t, l = l.useState()[0], (ml !== null ? ml.memoizedState : null) !== l && (L.flags |= 1024), t;
  }
  function tf() {
    var l = Sn !== 0;
    return Sn = 0, l;
  }
  function af(l, t, a) {
    t.updateQueue = l.updateQueue, t.flags &= -2053, l.lanes &= ~a;
  }
  function uf(l) {
    if (rn) {
      for (l = l.memoizedState; l !== null; ) {
        var t = l.queue;
        t !== null && (t.pending = null), l = l.next;
      }
      rn = !1;
    }
    It = 0, Ql = ml = L = null, pu = !1, ye = Sn = 0, Du = null;
  }
  function at() {
    var l = {
      memoizedState: null,
      baseState: null,
      baseQueue: null,
      queue: null,
      next: null
    };
    return Ql === null ? L.memoizedState = Ql = l : Ql = Ql.next = l, Ql;
  }
  function ql() {
    if (ml === null) {
      var l = L.alternate;
      l = l !== null ? l.memoizedState : null;
    } else l = ml.next;
    var t = Ql === null ? L.memoizedState : Ql.next;
    if (t !== null)
      Ql = t, ml = l;
    else {
      if (l === null)
        throw L.alternate === null ? Error(v(467)) : Error(v(310));
      ml = l, l = {
        memoizedState: ml.memoizedState,
        baseState: ml.baseState,
        baseQueue: ml.baseQueue,
        queue: ml.queue,
        next: null
      }, Ql === null ? L.memoizedState = Ql = l : Ql = Ql.next = l;
    }
    return Ql;
  }
  function gn() {
    return { lastEffect: null, events: null, stores: null, memoCache: null };
  }
  function me(l) {
    var t = ye;
    return ye += 1, Du === null && (Du = []), l = qs(Du, l, t), t = L, (Ql === null ? t.memoizedState : Ql.next) === null && (t = t.alternate, S.H = t === null || t.memoizedState === null ? M0 : rf), l;
  }
  function bn(l) {
    if (l !== null && typeof l == "object") {
      if (typeof l.then == "function") return me(l);
      if (l.$$typeof === Ol) return Fl(l);
    }
    throw Error(v(438, String(l)));
  }
  function ef(l) {
    var t = null, a = L.updateQueue;
    if (a !== null && (t = a.memoCache), t == null) {
      var u = L.alternate;
      u !== null && (u = u.updateQueue, u !== null && (u = u.memoCache, u != null && (t = {
        data: u.data.map(function(e) {
          return e.slice();
        }),
        index: 0
      })));
    }
    if (t == null && (t = { data: [], index: 0 }), a === null && (a = gn(), L.updateQueue = a), a.memoCache = t, a = t.data[t.index], a === void 0)
      for (a = t.data[t.index] = Array(l), u = 0; u < l; u++)
        a[u] = Vt;
    return t.index++, a;
  }
  function Pt(l, t) {
    return typeof t == "function" ? t(l) : t;
  }
  function En(l) {
    var t = ql();
    return nf(t, ml, l);
  }
  function nf(l, t, a) {
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
        if (T !== m.lane ? (P & T) === T : (It & T) === T) {
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
            }), T === Tu && (g = !0);
          else if ((It & h) === h) {
            m = m.next, h === Tu && (g = !0);
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
            }, c === null ? (f = c = T, i = n) : c = c.next = T, L.lanes |= h, Aa |= h;
          T = m.action, Fa && a(n, T), n = m.hasEagerState ? m.eagerState : a(n, T);
        } else
          h = {
            lane: T,
            revertLane: m.revertLane,
            gesture: m.gesture,
            action: m.action,
            hasEagerState: m.hasEagerState,
            eagerState: m.eagerState,
            next: null
          }, c === null ? (f = c = h, i = n) : c = c.next = h, L.lanes |= T, Aa |= T;
        m = m.next;
      } while (m !== null && m !== t);
      if (c === null ? i = n : c.next = f, !ht(n, l.memoizedState) && (Xl = !0, g && (a = _u, a !== null)))
        throw a;
      l.memoizedState = n, l.baseState = i, l.baseQueue = c, u.lastRenderedState = n;
    }
    return e === null && (u.lanes = 0), [l.memoizedState, u.dispatch];
  }
  function ff(l) {
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
      ht(n, t.memoizedState) || (Xl = !0), t.memoizedState = n, t.baseQueue === null && (t.baseState = n), a.lastRenderedState = n;
    }
    return [n, u];
  }
  function Js(l, t, a) {
    var u = L, e = ql(), n = tl;
    if (n) {
      if (a === void 0) throw Error(v(407));
      a = a();
    } else a = t();
    var i = !ht(
      (ml || e).memoizedState,
      a
    );
    if (i && (e.memoizedState = a, Xl = !0), e = e.queue, of($s.bind(null, u, e, l), [
      l
    ]), e.getSnapshot !== t || i || Ql !== null && Ql.memoizedState.tag & 1) {
      if (u.flags |= 2048, Uu(
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
      ), El === null) throw Error(v(349));
      n || (It & 127) !== 0 || ws(u, t, a);
    }
    return a;
  }
  function ws(l, t, a) {
    l.flags |= 16384, l = { getSnapshot: t, value: a }, t = L.updateQueue, t === null ? (t = gn(), L.updateQueue = t, t.stores = [l]) : (a = t.stores, a === null ? t.stores = [l] : a.push(l));
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
    var t = Xa(l, 2);
    t !== null && ot(t, l, 2);
  }
  function cf(l) {
    var t = at();
    if (typeof l == "function") {
      var a = l;
      if (l = a(), Fa) {
        oa(!0);
        try {
          a();
        } finally {
          oa(!1);
        }
      }
    }
    return t.memoizedState = t.baseState = l, t.queue = {
      pending: null,
      lanes: 0,
      dispatch: null,
      lastRenderedReducer: Pt,
      lastRenderedState: l
    }, t;
  }
  function Is(l, t, a, u) {
    return l.baseState = a, nf(
      l,
      ml,
      typeof u == "function" ? u : Pt
    );
  }
  function kv(l, t, a, u, e) {
    if (_n(l)) throw Error(v(485));
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
        sf(l, t, m);
      } finally {
        n !== null && i.types !== null && (n.types = i.types), S.T = n;
      }
    } else
      try {
        n = a(e, u), l0(l, t, n);
      } catch (m) {
        sf(l, t, m);
      }
  }
  function l0(l, t, a) {
    a !== null && typeof a == "object" && typeof a.then == "function" ? a.then(
      function(u) {
        t0(l, t, u);
      },
      function(u) {
        return sf(l, t, u);
      }
    ) : t0(l, t, a);
  }
  function t0(l, t, a) {
    t.status = "fulfilled", t.value = a, a0(t), l.state = a, t = l.pending, t !== null && (a = t.next, a === t ? l.pending = null : (a = a.next, t.next = a, Ps(l, a)));
  }
  function sf(l, t, a) {
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
      var a = El.formState;
      if (a !== null) {
        l: {
          var u = L;
          if (tl) {
            if (_l) {
              t: {
                for (var e = _l, n = Nt; e.nodeType !== 8; ) {
                  if (!n) {
                    e = null;
                    break t;
                  }
                  if (e = Ht(
                    e.nextSibling
                  ), e === null) {
                    e = null;
                    break t;
                  }
                }
                n = e.data, e = n === "F!" || n === "F" ? e : null;
              }
              if (e) {
                _l = Ht(
                  e.nextSibling
                ), u = e.data === "F!";
                break l;
              }
            }
            ha(u);
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
      L,
      u
    ), u.dispatch = a, u = cf(!1), n = hf.bind(
      null,
      L,
      !1,
      u.queue
    ), u = at(), e = {
      state: t,
      dispatch: null,
      action: l,
      pending: null
    }, u.queue = e, a = kv.bind(
      null,
      L,
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
    if (t = nf(
      l,
      t,
      u0
    )[0], l = En(Pt)[0], typeof t == "object" && t !== null && typeof t.then == "function")
      try {
        var u = me(t);
      } catch (i) {
        throw i === Au ? on : i;
      }
    else u = t;
    t = ql();
    var e = t.queue, n = e.dispatch;
    return a !== t.memoizedState && (L.flags |= 2048, Uu(
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
  function Uu(l, t, a, u) {
    return l = { tag: l, create: a, deps: u, inst: t, next: null }, t = L.updateQueue, t === null && (t = gn(), L.updateQueue = t), a = t.lastEffect, a === null ? t.lastEffect = l.next = l : (u = a.next, a.next = l, l.next = u, t.lastEffect = l), l;
  }
  function c0() {
    return ql().memoizedState;
  }
  function zn(l, t, a, u) {
    var e = at();
    L.flags |= l, e.memoizedState = Uu(
      1 | t,
      { destroy: void 0 },
      a,
      u === void 0 ? null : u
    );
  }
  function Tn(l, t, a, u) {
    var e = ql();
    u = u === void 0 ? null : u;
    var n = e.memoizedState.inst;
    ml !== null && u !== null && Pi(u, ml.memoizedState.deps) ? e.memoizedState = Uu(t, n, a, u) : (L.flags |= l, e.memoizedState = Uu(
      1 | t,
      n,
      a,
      u
    ));
  }
  function s0(l, t) {
    zn(8390656, 8, l, t);
  }
  function of(l, t) {
    Tn(2048, 8, l, t);
  }
  function Pv(l) {
    L.flags |= 4;
    var t = L.updateQueue;
    if (t === null)
      t = gn(), L.updateQueue = t, t.events = [l];
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
    return Tn(4, 2, l, t);
  }
  function v0(l, t) {
    return Tn(4, 4, l, t);
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
    a = a != null ? a.concat([l]) : null, Tn(4, 4, y0.bind(null, t, l), a);
  }
  function df() {
  }
  function h0(l, t) {
    var a = ql();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    return t !== null && Pi(t, u[1]) ? u[0] : (a.memoizedState = [l, t], l);
  }
  function r0(l, t) {
    var a = ql();
    t = t === void 0 ? null : t;
    var u = a.memoizedState;
    if (t !== null && Pi(t, u[1]))
      return u[0];
    if (u = l(), Fa) {
      oa(!0);
      try {
        l();
      } finally {
        oa(!1);
      }
    }
    return a.memoizedState = [u, t], u;
  }
  function vf(l, t, a) {
    return a === void 0 || (It & 1073741824) !== 0 && (P & 261930) === 0 ? l.memoizedState = t : (l.memoizedState = a, l = go(), L.lanes |= l, Aa |= l, a);
  }
  function S0(l, t, a, u) {
    return ht(a, t) ? a : Mu.current !== null ? (l = vf(l, a, u), ht(l, t) || (Xl = !0), l) : (It & 42) === 0 || (It & 1073741824) !== 0 && (P & 261930) === 0 ? (Xl = !0, l.memoizedState = a) : (l = go(), L.lanes |= l, Aa |= l, t);
  }
  function g0(l, t, a, u, e) {
    var n = M.p;
    M.p = n !== 0 && 8 > n ? n : 8;
    var i = S.T, f = {};
    S.T = f, hf(l, !1, t, a);
    try {
      var c = e(), m = S.S;
      if (m !== null && m(f, c), c !== null && typeof c == "object" && typeof c.then == "function") {
        var g = Wv(
          c,
          u
        );
        he(
          l,
          t,
          g,
          zt(l)
        );
      } else
        he(
          l,
          t,
          u,
          zt(l)
        );
    } catch (T) {
      he(
        l,
        t,
        { then: function() {
        }, status: "rejected", reason: T },
        zt()
      );
    } finally {
      M.p = n, i !== null && f.types !== null && (i.types = f.types), S.T = i;
    }
  }
  function ly() {
  }
  function yf(l, t, a, u) {
    if (l.tag !== 5) throw Error(v(476));
    var e = b0(l).queue;
    g0(
      l,
      e,
      t,
      x,
      a === null ? ly : function() {
        return E0(l), a(u);
      }
    );
  }
  function b0(l) {
    var t = l.memoizedState;
    if (t !== null) return t;
    t = {
      memoizedState: x,
      baseState: x,
      baseQueue: null,
      queue: {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: Pt,
        lastRenderedState: x
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
        lastRenderedReducer: Pt,
        lastRenderedState: a
      },
      next: null
    }, l.memoizedState = t, l = l.alternate, l !== null && (l.memoizedState = t), t;
  }
  function E0(l) {
    var t = b0(l);
    t.next === null && (t = l.alternate.memoizedState), he(
      l,
      t.next.queue,
      {},
      zt()
    );
  }
  function mf() {
    return Fl(He);
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
          l = ga(a);
          var u = ba(t, l, a);
          u !== null && (ot(u, t, a), oe(u, t, a)), t = { cache: Zi() }, l.payload = t;
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
    }, _n(l) ? A0(t, a) : (a = Ri(l, t, a, u), a !== null && (ot(a, l, u), O0(a, t, u)));
  }
  function _0(l, t, a) {
    var u = zt();
    he(l, t, a, u);
  }
  function he(l, t, a, u) {
    var e = {
      lane: u,
      revertLane: 0,
      gesture: null,
      action: a,
      hasEagerState: !1,
      eagerState: null,
      next: null
    };
    if (_n(l)) A0(t, e);
    else {
      var n = l.alternate;
      if (l.lanes === 0 && (n === null || n.lanes === 0) && (n = t.lastRenderedReducer, n !== null))
        try {
          var i = t.lastRenderedState, f = n(i, a);
          if (e.hasEagerState = !0, e.eagerState = f, ht(f, i))
            return an(l, t, e, 0), El === null && tn(), !1;
        } catch {
        } finally {
        }
      if (a = Ri(l, t, e, u), a !== null)
        return ot(a, l, u), O0(a, t, u), !0;
    }
    return !1;
  }
  function hf(l, t, a, u) {
    if (u = {
      lane: 2,
      revertLane: wf(),
      gesture: null,
      action: u,
      hasEagerState: !1,
      eagerState: null,
      next: null
    }, _n(l)) {
      if (t) throw Error(v(479));
    } else
      t = Ri(
        l,
        a,
        u,
        2
      ), t !== null && ot(t, l, 2);
  }
  function _n(l) {
    var t = l.alternate;
    return l === L || t !== null && t === L;
  }
  function A0(l, t) {
    pu = rn = !0;
    var a = l.pending;
    a === null ? t.next = t : (t.next = a.next, a.next = t), l.pending = t;
  }
  function O0(l, t, a) {
    if ((a & 4194048) !== 0) {
      var u = t.lanes;
      u &= l.pendingLanes, a |= u, t.lanes = a, Nc(l, a);
    }
  }
  var re = {
    readContext: Fl,
    use: bn,
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
  re.useEffectEvent = Rl;
  var M0 = {
    readContext: Fl,
    use: bn,
    useCallback: function(l, t) {
      return at().memoizedState = [
        l,
        t === void 0 ? null : t
      ], l;
    },
    useContext: Fl,
    useEffect: s0,
    useImperativeHandle: function(l, t, a) {
      a = a != null ? a.concat([l]) : null, zn(
        4194308,
        4,
        y0.bind(null, t, l),
        a
      );
    },
    useLayoutEffect: function(l, t) {
      return zn(4194308, 4, l, t);
    },
    useInsertionEffect: function(l, t) {
      zn(4, 2, l, t);
    },
    useMemo: function(l, t) {
      var a = at();
      t = t === void 0 ? null : t;
      var u = l();
      if (Fa) {
        oa(!0);
        try {
          l();
        } finally {
          oa(!1);
        }
      }
      return a.memoizedState = [u, t], u;
    },
    useReducer: function(l, t, a) {
      var u = at();
      if (a !== void 0) {
        var e = a(t);
        if (Fa) {
          oa(!0);
          try {
            a(t);
          } finally {
            oa(!1);
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
        L,
        l
      ), [u.memoizedState, l];
    },
    useRef: function(l) {
      var t = at();
      return l = { current: l }, t.memoizedState = l;
    },
    useState: function(l) {
      l = cf(l);
      var t = l.queue, a = _0.bind(null, L, t);
      return t.dispatch = a, [l.memoizedState, a];
    },
    useDebugValue: df,
    useDeferredValue: function(l, t) {
      var a = at();
      return vf(a, l, t);
    },
    useTransition: function() {
      var l = cf(!1);
      return l = g0.bind(
        null,
        L,
        l.queue,
        !0,
        !1
      ), at().memoizedState = l, [!1, l];
    },
    useSyncExternalStore: function(l, t, a) {
      var u = L, e = at();
      if (tl) {
        if (a === void 0)
          throw Error(v(407));
        a = a();
      } else {
        if (a = t(), El === null)
          throw Error(v(349));
        (P & 127) !== 0 || ws(u, t, a);
      }
      e.memoizedState = a;
      var n = { value: a, getSnapshot: t };
      return e.queue = n, s0($s.bind(null, u, n, l), [
        l
      ]), u.flags |= 2048, Uu(
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
      var l = at(), t = El.identifierPrefix;
      if (tl) {
        var a = Xt, u = Qt;
        a = (u & ~(1 << 32 - mt(u) - 1)).toString(32) + a, t = "_" + t + "R_" + a, a = Sn++, 0 < a && (t += "H" + a.toString(32)), t += "_";
      } else
        a = $v++, t = "_" + t + "r_" + a.toString(32) + "_";
      return l.memoizedState = t;
    },
    useHostTransitionStatus: mf,
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
      return t.queue = a, t = hf.bind(
        null,
        L,
        !0,
        a
      ), a.dispatch = t, [l, t];
    },
    useMemoCache: ef,
    useCacheRefresh: function() {
      return at().memoizedState = ty.bind(
        null,
        L
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
  }, rf = {
    readContext: Fl,
    use: bn,
    useCallback: h0,
    useContext: Fl,
    useEffect: of,
    useImperativeHandle: m0,
    useInsertionEffect: d0,
    useLayoutEffect: v0,
    useMemo: r0,
    useReducer: En,
    useRef: c0,
    useState: function() {
      return En(Pt);
    },
    useDebugValue: df,
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
      var l = En(Pt)[0], t = ql().memoizedState;
      return [
        typeof l == "boolean" ? l : me(l),
        t
      ];
    },
    useSyncExternalStore: Js,
    useId: z0,
    useHostTransitionStatus: mf,
    useFormState: n0,
    useActionState: n0,
    useOptimistic: function(l, t) {
      var a = ql();
      return Is(a, ml, l, t);
    },
    useMemoCache: ef,
    useCacheRefresh: T0
  };
  rf.useEffectEvent = o0;
  var p0 = {
    readContext: Fl,
    use: bn,
    useCallback: h0,
    useContext: Fl,
    useEffect: of,
    useImperativeHandle: m0,
    useInsertionEffect: d0,
    useLayoutEffect: v0,
    useMemo: r0,
    useReducer: ff,
    useRef: c0,
    useState: function() {
      return ff(Pt);
    },
    useDebugValue: df,
    useDeferredValue: function(l, t) {
      var a = ql();
      return ml === null ? vf(a, l, t) : S0(
        a,
        ml.memoizedState,
        l,
        t
      );
    },
    useTransition: function() {
      var l = ff(Pt)[0], t = ql().memoizedState;
      return [
        typeof l == "boolean" ? l : me(l),
        t
      ];
    },
    useSyncExternalStore: Js,
    useId: z0,
    useHostTransitionStatus: mf,
    useFormState: f0,
    useActionState: f0,
    useOptimistic: function(l, t) {
      var a = ql();
      return ml !== null ? Is(a, ml, l, t) : (a.baseState = l, [l, a.queue.dispatch]);
    },
    useMemoCache: ef,
    useCacheRefresh: T0
  };
  p0.useEffectEvent = o0;
  function Sf(l, t, a, u) {
    t = l.memoizedState, a = a(u, t), a = a == null ? t : C({}, t, a), l.memoizedState = a, l.lanes === 0 && (l.updateQueue.baseState = a);
  }
  var gf = {
    enqueueSetState: function(l, t, a) {
      l = l._reactInternals;
      var u = zt(), e = ga(u);
      e.payload = t, a != null && (e.callback = a), t = ba(l, e, u), t !== null && (ot(t, l, u), oe(t, l, u));
    },
    enqueueReplaceState: function(l, t, a) {
      l = l._reactInternals;
      var u = zt(), e = ga(u);
      e.tag = 1, e.payload = t, a != null && (e.callback = a), t = ba(l, e, u), t !== null && (ot(t, l, u), oe(t, l, u));
    },
    enqueueForceUpdate: function(l, t) {
      l = l._reactInternals;
      var a = zt(), u = ga(a);
      u.tag = 2, t != null && (u.callback = t), t = ba(l, u, a), t !== null && (ot(t, l, a), oe(t, l, a));
    }
  };
  function D0(l, t, a, u, e, n, i) {
    return l = l.stateNode, typeof l.shouldComponentUpdate == "function" ? l.shouldComponentUpdate(u, n, i) : t.prototype && t.prototype.isPureReactComponent ? !ae(a, u) || !ae(e, n) : !0;
  }
  function U0(l, t, a, u) {
    l = t.state, typeof t.componentWillReceiveProps == "function" && t.componentWillReceiveProps(a, u), typeof t.UNSAFE_componentWillReceiveProps == "function" && t.UNSAFE_componentWillReceiveProps(a, u), t.state !== l && gf.enqueueReplaceState(t, t.state, null);
  }
  function ka(l, t) {
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
    ln(l);
  }
  function R0(l) {
    console.error(l);
  }
  function H0(l) {
    ln(l);
  }
  function An(l, t) {
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
  function bf(l, t, a) {
    return a = ga(a), a.tag = 3, a.payload = { element: null }, a.callback = function() {
      An(l, t);
    }, a;
  }
  function j0(l) {
    return l = ga(l), l.tag = 3, l;
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
      C0(t, a, u), typeof e != "function" && (Oa === null ? Oa = /* @__PURE__ */ new Set([this]) : Oa.add(this));
      var f = u.stack;
      this.componentDidCatch(u.value, {
        componentStack: f !== null ? f : ""
      });
    });
  }
  function uy(l, t, a, u, e) {
    if (a.flags |= 32768, u !== null && typeof u == "object" && typeof u.then == "function") {
      if (t = a.alternate, t !== null && zu(
        t,
        a,
        e,
        !0
      ), a = St.current, a !== null) {
        switch (a.tag) {
          case 31:
          case 13:
            return Rt === null ? xn() : a.alternate === null && Hl === 0 && (Hl = 3), a.flags &= -257, a.flags |= 65536, a.lanes = e, u === dn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? a.updateQueue = /* @__PURE__ */ new Set([u]) : t.add(u), Vf(l, u, e)), !1;
          case 22:
            return a.flags |= 65536, u === dn ? a.flags |= 16384 : (t = a.updateQueue, t === null ? (t = {
              transitions: null,
              markerInstances: null,
              retryQueue: /* @__PURE__ */ new Set([u])
            }, a.updateQueue = t) : (a = t.retryQueue, a === null ? t.retryQueue = /* @__PURE__ */ new Set([u]) : a.add(u)), Vf(l, u, e)), !1;
        }
        throw Error(v(435, a.tag));
      }
      return Vf(l, u, e), xn(), !1;
    }
    if (tl)
      return t = St.current, t !== null ? ((t.flags & 65536) === 0 && (t.flags |= 256), t.flags |= 65536, t.lanes = e, u !== Bi && (l = Error(v(422), { cause: u }), ne(pt(l, a)))) : (u !== Bi && (t = Error(v(423), {
        cause: u
      }), ne(
        pt(t, a)
      )), l = l.current.alternate, l.flags |= 65536, e &= -e, l.lanes |= e, u = pt(u, a), e = bf(
        l.stateNode,
        u,
        e
      ), Wi(l, e), Hl !== 4 && (Hl = 2)), !1;
    var n = Error(v(520), { cause: u });
    if (n = pt(n, a), Ae === null ? Ae = [n] : Ae.push(n), Hl !== 4 && (Hl = 2), t === null) return !0;
    u = pt(u, a), a = t;
    do {
      switch (a.tag) {
        case 3:
          return a.flags |= 65536, l = e & -e, a.lanes |= l, l = bf(a.stateNode, u, l), Wi(a, l), !1;
        case 1:
          if (t = a.type, n = a.stateNode, (a.flags & 128) === 0 && (typeof t.getDerivedStateFromError == "function" || n !== null && typeof n.componentDidCatch == "function" && (Oa === null || !Oa.has(n))))
            return a.flags |= 65536, e &= -e, a.lanes |= e, e = j0(e), q0(
              e,
              l,
              a,
              u
            ), Wi(a, e), !1;
      }
      a = a.return;
    } while (a !== null);
    return !1;
  }
  var Ef = Error(v(461)), Xl = !1;
  function kl(l, t, a, u) {
    t.child = l === null ? Gs(t, null, a, u) : $a(
      t,
      l.child,
      a,
      u
    );
  }
  function x0(l, t, a, u, e) {
    a = a.render;
    var n = t.ref;
    if ("ref" in u) {
      var i = {};
      for (var f in u)
        f !== "ref" && (i[f] = u[f]);
    } else i = u;
    return Ka(t), u = lf(
      l,
      t,
      a,
      i,
      n,
      e
    ), f = tf(), l !== null && !Xl ? (af(l, t, e), la(l, t, e)) : (tl && f && qi(t), t.flags |= 1, kl(l, t, u, e), t.child);
  }
  function B0(l, t, a, u, e) {
    if (l === null) {
      var n = a.type;
      return typeof n == "function" && !Hi(n) && n.defaultProps === void 0 && a.compare === null ? (t.tag = 15, t.type = n, Y0(
        l,
        t,
        n,
        u,
        e
      )) : (l = en(
        a.type,
        null,
        u,
        t,
        t.mode,
        e
      ), l.ref = t.ref, l.return = t, t.child = l);
    }
    if (n = l.child, !Df(l, e)) {
      var i = n.memoizedProps;
      if (a = a.compare, a = a !== null ? a : ae, a(i, u) && l.ref === t.ref)
        return la(l, t, e);
    }
    return t.flags |= 1, l = Wt(n, u), l.ref = t.ref, l.return = t, t.child = l;
  }
  function Y0(l, t, a, u, e) {
    if (l !== null) {
      var n = l.memoizedProps;
      if (ae(n, u) && l.ref === t.ref)
        if (Xl = !1, t.pendingProps = u = n, Df(l, e))
          (l.flags & 131072) !== 0 && (Xl = !0);
        else
          return t.lanes = l.lanes, la(l, t, e);
    }
    return zf(
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
        t.memoizedState = { baseLanes: 0, cachePool: null }, l !== null && sn(
          t,
          n !== null ? n.cachePool : null
        ), n !== null ? Zs(t, n) : Fi(), Ls(t);
      else
        return u = t.lanes = 536870912, Q0(
          l,
          t,
          n !== null ? n.baseLanes | a : a,
          a,
          u
        );
    } else
      n !== null ? (sn(t, n.cachePool), Zs(t, n), za(), t.memoizedState = null) : (l !== null && sn(t, null), Fi(), za());
    return kl(l, t, e, a), t.child;
  }
  function Se(l, t) {
    return l !== null && l.tag === 22 || t.stateNode !== null || (t.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    }), t.sibling;
  }
  function Q0(l, t, a, u, e) {
    var n = Vi();
    return n = n === null ? null : { parent: Gl._currentValue, pool: n }, t.memoizedState = {
      baseLanes: a,
      cachePool: n
    }, l !== null && sn(t, null), Fi(), Ls(t), l !== null && zu(l, t, u, !0), t.childLanes = e, null;
  }
  function On(l, t) {
    return t = pn(
      { mode: t.mode, children: t.children },
      l.mode
    ), t.ref = l.ref, l.child = t, t.return = l, t;
  }
  function X0(l, t, a) {
    return $a(t, l.child, null, a), l = On(t, t.pendingProps), l.flags |= 2, gt(t), t.memoizedState = null, l;
  }
  function ey(l, t, a) {
    var u = t.pendingProps, e = (t.flags & 128) !== 0;
    if (t.flags &= -129, l === null) {
      if (tl) {
        if (u.mode === "hidden")
          return l = On(t, u), t.lanes = 536870912, Se(null, l);
        if (Ii(t), (l = _l) ? (l = ld(
          l,
          Nt
        ), l = l !== null && l.data === "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: ya !== null ? { id: Qt, overflow: Xt } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = As(l), a.return = t, t.child = a, $l = t, _l = null)) : l = null, l === null) throw ha(t);
        return t.lanes = 536870912, null;
      }
      return On(t, u);
    }
    var n = l.memoizedState;
    if (n !== null) {
      var i = n.dehydrated;
      if (Ii(t), e)
        if (t.flags & 256)
          t.flags &= -257, t = X0(
            l,
            t,
            a
          );
        else if (t.memoizedState !== null)
          t.child = l.child, t.flags |= 128, t = null;
        else throw Error(v(558));
      else if (Xl || zu(l, t, a, !1), e = (a & l.childLanes) !== 0, Xl || e) {
        if (u = El, u !== null && (i = Rc(u, a), i !== 0 && i !== n.retryLane))
          throw n.retryLane = i, Xa(l, i), ot(u, l, i), Ef;
        xn(), t = X0(
          l,
          t,
          a
        );
      } else
        l = n.treeContext, _l = Ht(i.nextSibling), $l = t, tl = !0, ma = null, Nt = !1, l !== null && ps(t, l), t = On(t, u), t.flags |= 4096;
      return t;
    }
    return l = Wt(l.child, {
      mode: u.mode,
      children: u.children
    }), l.ref = t.ref, t.child = l, l.return = t, l;
  }
  function Mn(l, t) {
    var a = t.ref;
    if (a === null)
      l !== null && l.ref !== null && (t.flags |= 4194816);
    else {
      if (typeof a != "function" && typeof a != "object")
        throw Error(v(284));
      (l === null || l.ref !== a) && (t.flags |= 4194816);
    }
  }
  function zf(l, t, a, u, e) {
    return Ka(t), a = lf(
      l,
      t,
      a,
      u,
      void 0,
      e
    ), u = tf(), l !== null && !Xl ? (af(l, t, e), la(l, t, e)) : (tl && u && qi(t), t.flags |= 1, kl(l, t, a, e), t.child);
  }
  function Z0(l, t, a, u, e, n) {
    return Ka(t), t.updateQueue = null, a = Ks(
      t,
      u,
      a,
      e
    ), Vs(l), u = tf(), l !== null && !Xl ? (af(l, t, n), la(l, t, n)) : (tl && u && qi(t), t.flags |= 1, kl(l, t, a, n), t.child);
  }
  function L0(l, t, a, u, e) {
    if (Ka(t), t.stateNode === null) {
      var n = Su, i = a.contextType;
      typeof i == "object" && i !== null && (n = Fl(i)), n = new a(u, n), t.memoizedState = n.state !== null && n.state !== void 0 ? n.state : null, n.updater = gf, t.stateNode = n, n._reactInternals = t, n = t.stateNode, n.props = u, n.state = t.memoizedState, n.refs = {}, Ji(t), i = a.contextType, n.context = typeof i == "object" && i !== null ? Fl(i) : Su, n.state = t.memoizedState, i = a.getDerivedStateFromProps, typeof i == "function" && (Sf(
        t,
        a,
        i,
        u
      ), n.state = t.memoizedState), typeof a.getDerivedStateFromProps == "function" || typeof n.getSnapshotBeforeUpdate == "function" || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (i = n.state, typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount(), i !== n.state && gf.enqueueReplaceState(n, n.state, null), ve(t, u, n, e), de(), n.state = t.memoizedState), typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !0;
    } else if (l === null) {
      n = t.stateNode;
      var f = t.memoizedProps, c = ka(a, f);
      n.props = c;
      var m = n.context, g = a.contextType;
      i = Su, typeof g == "object" && g !== null && (i = Fl(g));
      var T = a.getDerivedStateFromProps;
      g = typeof T == "function" || typeof n.getSnapshotBeforeUpdate == "function", f = t.pendingProps !== f, g || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (f || m !== i) && U0(
        t,
        n,
        u,
        i
      ), Sa = !1;
      var h = t.memoizedState;
      n.state = h, ve(t, u, n, e), de(), m = t.memoizedState, f || h !== m || Sa ? (typeof T == "function" && (Sf(
        t,
        a,
        T,
        u
      ), m = t.memoizedState), (c = Sa || D0(
        t,
        a,
        c,
        u,
        h,
        m,
        i
      )) ? (g || typeof n.UNSAFE_componentWillMount != "function" && typeof n.componentWillMount != "function" || (typeof n.componentWillMount == "function" && n.componentWillMount(), typeof n.UNSAFE_componentWillMount == "function" && n.UNSAFE_componentWillMount()), typeof n.componentDidMount == "function" && (t.flags |= 4194308)) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), t.memoizedProps = u, t.memoizedState = m), n.props = u, n.state = m, n.context = i, u = c) : (typeof n.componentDidMount == "function" && (t.flags |= 4194308), u = !1);
    } else {
      n = t.stateNode, wi(l, t), i = t.memoizedProps, g = ka(a, i), n.props = g, T = t.pendingProps, h = n.context, m = a.contextType, c = Su, typeof m == "object" && m !== null && (c = Fl(m)), f = a.getDerivedStateFromProps, (m = typeof f == "function" || typeof n.getSnapshotBeforeUpdate == "function") || typeof n.UNSAFE_componentWillReceiveProps != "function" && typeof n.componentWillReceiveProps != "function" || (i !== T || h !== c) && U0(
        t,
        n,
        u,
        c
      ), Sa = !1, h = t.memoizedState, n.state = h, ve(t, u, n, e), de();
      var r = t.memoizedState;
      i !== T || h !== r || Sa || l !== null && l.dependencies !== null && fn(l.dependencies) ? (typeof f == "function" && (Sf(
        t,
        a,
        f,
        u
      ), r = t.memoizedState), (g = Sa || D0(
        t,
        a,
        g,
        u,
        h,
        r,
        c
      ) || l !== null && l.dependencies !== null && fn(l.dependencies)) ? (m || typeof n.UNSAFE_componentWillUpdate != "function" && typeof n.componentWillUpdate != "function" || (typeof n.componentWillUpdate == "function" && n.componentWillUpdate(u, r, c), typeof n.UNSAFE_componentWillUpdate == "function" && n.UNSAFE_componentWillUpdate(
        u,
        r,
        c
      )), typeof n.componentDidUpdate == "function" && (t.flags |= 4), typeof n.getSnapshotBeforeUpdate == "function" && (t.flags |= 1024)) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 1024), t.memoizedProps = u, t.memoizedState = r), n.props = u, n.state = r, n.context = c, u = g) : (typeof n.componentDidUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 4), typeof n.getSnapshotBeforeUpdate != "function" || i === l.memoizedProps && h === l.memoizedState || (t.flags |= 1024), u = !1);
    }
    return n = u, Mn(l, t), u = (t.flags & 128) !== 0, n || u ? (n = t.stateNode, a = u && typeof a.getDerivedStateFromError != "function" ? null : n.render(), t.flags |= 1, l !== null && u ? (t.child = $a(
      t,
      l.child,
      null,
      e
    ), t.child = $a(
      t,
      null,
      a,
      e
    )) : kl(l, t, a, e), t.memoizedState = n.state, l = t.child) : l = la(
      l,
      t,
      e
    ), l;
  }
  function V0(l, t, a, u) {
    return La(), t.flags |= 256, kl(l, t, a, u), t.child;
  }
  var Tf = {
    dehydrated: null,
    treeContext: null,
    retryLane: 0,
    hydrationErrors: null
  };
  function _f(l) {
    return { baseLanes: l, cachePool: Cs() };
  }
  function Af(l, t, a) {
    return l = l !== null ? l.childLanes & ~a : 0, t && (l |= Et), l;
  }
  function K0(l, t, a) {
    var u = t.pendingProps, e = !1, n = (t.flags & 128) !== 0, i;
    if ((i = n) || (i = l !== null && l.memoizedState === null ? !1 : (jl.current & 2) !== 0), i && (e = !0, t.flags &= -129), i = (t.flags & 32) !== 0, t.flags &= -33, l === null) {
      if (tl) {
        if (e ? Ea(t) : za(), (l = _l) ? (l = ld(
          l,
          Nt
        ), l = l !== null && l.data !== "&" ? l : null, l !== null && (t.memoizedState = {
          dehydrated: l,
          treeContext: ya !== null ? { id: Qt, overflow: Xt } : null,
          retryLane: 536870912,
          hydrationErrors: null
        }, a = As(l), a.return = t, t.child = a, $l = t, _l = null)) : l = null, l === null) throw ha(t);
        return ic(l) ? t.lanes = 32 : t.lanes = 536870912, null;
      }
      var f = u.children;
      return u = u.fallback, e ? (za(), e = t.mode, f = pn(
        { mode: "hidden", children: f },
        e
      ), u = Za(
        u,
        e,
        a,
        null
      ), f.return = t, u.return = t, f.sibling = u, t.child = f, u = t.child, u.memoizedState = _f(a), u.childLanes = Af(
        l,
        i,
        a
      ), t.memoizedState = Tf, Se(null, u)) : (Ea(t), Of(t, f));
    }
    var c = l.memoizedState;
    if (c !== null && (f = c.dehydrated, f !== null)) {
      if (n)
        t.flags & 256 ? (Ea(t), t.flags &= -257, t = Mf(
          l,
          t,
          a
        )) : t.memoizedState !== null ? (za(), t.child = l.child, t.flags |= 128, t = null) : (za(), f = u.fallback, e = t.mode, u = pn(
          { mode: "visible", children: u.children },
          e
        ), f = Za(
          f,
          e,
          a,
          null
        ), f.flags |= 2, u.return = t, f.return = t, u.sibling = f, t.child = u, $a(
          t,
          l.child,
          null,
          a
        ), u = t.child, u.memoizedState = _f(a), u.childLanes = Af(
          l,
          i,
          a
        ), t.memoizedState = Tf, t = Se(null, u));
      else if (Ea(t), ic(f)) {
        if (i = f.nextSibling && f.nextSibling.dataset, i) var m = i.dgst;
        i = m, u = Error(v(419)), u.stack = "", u.digest = i, ne({ value: u, source: null, stack: null }), t = Mf(
          l,
          t,
          a
        );
      } else if (Xl || zu(l, t, a, !1), i = (a & l.childLanes) !== 0, Xl || i) {
        if (i = El, i !== null && (u = Rc(i, a), u !== 0 && u !== c.retryLane))
          throw c.retryLane = u, Xa(l, u), ot(i, l, u), Ef;
        nc(f) || xn(), t = Mf(
          l,
          t,
          a
        );
      } else
        nc(f) ? (t.flags |= 192, t.child = l.child, t = null) : (l = c.treeContext, _l = Ht(
          f.nextSibling
        ), $l = t, tl = !0, ma = null, Nt = !1, l !== null && ps(t, l), t = Of(
          t,
          u.children
        ), t.flags |= 4096);
      return t;
    }
    return e ? (za(), f = u.fallback, e = t.mode, c = l.child, m = c.sibling, u = Wt(c, {
      mode: "hidden",
      children: u.children
    }), u.subtreeFlags = c.subtreeFlags & 65011712, m !== null ? f = Wt(
      m,
      f
    ) : (f = Za(
      f,
      e,
      a,
      null
    ), f.flags |= 2), f.return = t, u.return = t, u.sibling = f, t.child = u, Se(null, u), u = t.child, f = l.child.memoizedState, f === null ? f = _f(a) : (e = f.cachePool, e !== null ? (c = Gl._currentValue, e = e.parent !== c ? { parent: c, pool: c } : e) : e = Cs(), f = {
      baseLanes: f.baseLanes | a,
      cachePool: e
    }), u.memoizedState = f, u.childLanes = Af(
      l,
      i,
      a
    ), t.memoizedState = Tf, Se(l.child, u)) : (Ea(t), a = l.child, l = a.sibling, a = Wt(a, {
      mode: "visible",
      children: u.children
    }), a.return = t, a.sibling = null, l !== null && (i = t.deletions, i === null ? (t.deletions = [l], t.flags |= 16) : i.push(l)), t.child = a, t.memoizedState = null, a);
  }
  function Of(l, t) {
    return t = pn(
      { mode: "visible", children: t },
      l.mode
    ), t.return = l, l.child = t;
  }
  function pn(l, t) {
    return l = rt(22, l, null, t), l.lanes = 0, l;
  }
  function Mf(l, t, a) {
    return $a(t, l.child, null, a), l = Of(
      t,
      t.pendingProps.children
    ), l.flags |= 2, t.memoizedState = null, l;
  }
  function J0(l, t, a) {
    l.lanes |= t;
    var u = l.alternate;
    u !== null && (u.lanes |= t), Qi(l.return, t, a);
  }
  function pf(l, t, a, u, e, n) {
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
    if (f ? (i = i & 1 | 2, t.flags |= 128) : i &= 1, p(jl, i), kl(l, t, u, a), u = tl ? ee : 0, !f && l !== null && (l.flags & 128) !== 0)
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
          l = a.alternate, l !== null && hn(l) === null && (e = a), a = a.sibling;
        a = e, a === null ? (e = t.child, t.child = null) : (e = a.sibling, a.sibling = null), pf(
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
          if (l = e.alternate, l !== null && hn(l) === null) {
            t.child = e;
            break;
          }
          l = e.sibling, e.sibling = a, a = e, e = l;
        }
        pf(
          t,
          !0,
          a,
          null,
          n,
          u
        );
        break;
      case "together":
        pf(
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
  function la(l, t, a) {
    if (l !== null && (t.dependencies = l.dependencies), Aa |= t.lanes, (a & t.childLanes) === 0)
      if (l !== null) {
        if (zu(
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
      for (l = t.child, a = Wt(l, l.pendingProps), t.child = a, a.return = t; l.sibling !== null; )
        l = l.sibling, a = a.sibling = Wt(l, l.pendingProps), a.return = t;
      a.sibling = null;
    }
    return t.child;
  }
  function Df(l, t) {
    return (l.lanes & t) !== 0 ? !0 : (l = l.dependencies, !!(l !== null && fn(l)));
  }
  function ny(l, t, a) {
    switch (t.tag) {
      case 3:
        yl(t, t.stateNode.containerInfo), ra(t, Gl, l.memoizedState.cache), La();
        break;
      case 27:
      case 5:
        sa(t);
        break;
      case 4:
        yl(t, t.stateNode.containerInfo);
        break;
      case 10:
        ra(
          t,
          t.type,
          t.memoizedProps.value
        );
        break;
      case 31:
        if (t.memoizedState !== null)
          return t.flags |= 128, Ii(t), null;
        break;
      case 13:
        var u = t.memoizedState;
        if (u !== null)
          return u.dehydrated !== null ? (Ea(t), t.flags |= 128, null) : (a & t.child.childLanes) !== 0 ? K0(l, t, a) : (Ea(t), l = la(
            l,
            t,
            a
          ), l !== null ? l.sibling : null);
        Ea(t);
        break;
      case 19:
        var e = (l.flags & 128) !== 0;
        if (u = (a & t.childLanes) !== 0, u || (zu(
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
        ra(t, Gl, l.memoizedState.cache);
    }
    return la(l, t, a);
  }
  function W0(l, t, a) {
    if (l !== null)
      if (l.memoizedProps !== t.pendingProps)
        Xl = !0;
      else {
        if (!Df(l, a) && (t.flags & 128) === 0)
          return Xl = !1, ny(
            l,
            t,
            a
          );
        Xl = (l.flags & 131072) !== 0;
      }
    else
      Xl = !1, tl && (t.flags & 1048576) !== 0 && Ms(t, ee, t.index);
    switch (t.lanes = 0, t.tag) {
      case 16:
        l: {
          var u = t.pendingProps;
          if (l = wa(t.elementType), t.type = l, typeof l == "function")
            Hi(l) ? (u = ka(l, u), t.tag = 1, t = L0(
              null,
              t,
              l,
              u,
              a
            )) : (t.tag = 0, t = zf(
              null,
              t,
              l,
              u,
              a
            ));
          else {
            if (l != null) {
              var e = l.$$typeof;
              if (e === Tl) {
                t.tag = 11, t = x0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              } else if (e === J) {
                t.tag = 14, t = B0(
                  null,
                  t,
                  l,
                  u,
                  a
                );
                break l;
              }
            }
            throw t = gl(l) || l, Error(v(306, t, ""));
          }
        }
        return t;
      case 0:
        return zf(
          l,
          t,
          t.type,
          t.pendingProps,
          a
        );
      case 1:
        return u = t.type, e = ka(
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
          e = n.element, wi(l, t), ve(t, u, null, a);
          var i = t.memoizedState;
          if (u = i.cache, ra(t, Gl, u), u !== n.cache && Xi(
            t,
            [Gl],
            a,
            !0
          ), de(), u = i.element, n.isDehydrated)
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
              e = pt(
                Error(v(424)),
                t
              ), ne(e), t = V0(
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
              for (_l = Ht(l.firstChild), $l = t, tl = !0, ma = null, Nt = !0, a = Gs(
                t,
                null,
                u,
                a
              ), t.child = a; a; )
                a.flags = a.flags & -3 | 4096, a = a.sibling;
            }
          else {
            if (La(), u === e) {
              t = la(
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
        return Mn(l, t), l === null ? (a = id(
          t.type,
          null,
          t.pendingProps,
          null
        )) ? t.memoizedState = a : tl || (a = t.type, l = t.pendingProps, u = Ln(
          $.current
        ).createElement(a), u[Wl] = t, u[et] = l, Il(u, a, l), Kl(u), t.stateNode = u) : t.memoizedState = id(
          t.type,
          l.memoizedProps,
          t.pendingProps,
          l.memoizedState
        ), null;
      case 27:
        return sa(t), l === null && tl && (u = t.stateNode = ud(
          t.type,
          t.pendingProps,
          $.current
        ), $l = t, Nt = !0, e = _l, Ua(t.type) ? (fc = e, _l = Ht(u.firstChild)) : _l = e), kl(
          l,
          t,
          t.pendingProps.children,
          a
        ), Mn(l, t), l === null && (t.flags |= 4194304), t.child;
      case 5:
        return l === null && tl && ((e = u = _l) && (u = qy(
          u,
          t.type,
          t.pendingProps,
          Nt
        ), u !== null ? (t.stateNode = u, $l = t, _l = Ht(u.firstChild), Nt = !1, e = !0) : e = !1), e || ha(t)), sa(t), e = t.type, n = t.pendingProps, i = l !== null ? l.memoizedProps : null, u = n.children, ac(e, n) ? u = null : i !== null && ac(e, i) && (t.flags |= 32), t.memoizedState !== null && (e = lf(
          l,
          t,
          Fv,
          null,
          null,
          a
        ), He._currentValue = e), Mn(l, t), kl(l, t, u, a), t.child;
      case 6:
        return l === null && tl && ((l = a = _l) && (a = xy(
          a,
          t.pendingProps,
          Nt
        ), a !== null ? (t.stateNode = a, $l = t, _l = null, l = !0) : l = !1), l || ha(t)), null;
      case 13:
        return K0(l, t, a);
      case 4:
        return yl(
          t,
          t.stateNode.containerInfo
        ), u = t.pendingProps, l === null ? t.child = $a(
          t,
          null,
          u,
          a
        ) : kl(l, t, u, a), t.child;
      case 11:
        return x0(
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
        return u = t.pendingProps, ra(t, t.type, u.value), kl(l, t, u.children, a), t.child;
      case 9:
        return e = t.type._context, u = t.pendingProps.children, Ka(t), e = Fl(e), u = u(e), t.flags |= 1, kl(l, t, u, a), t.child;
      case 14:
        return B0(
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
        return Ka(t), u = Fl(Gl), l === null ? (e = Vi(), e === null && (e = El, n = Zi(), e.pooledCache = n, n.refCount++, n !== null && (e.pooledCacheLanes |= a), e = n), t.memoizedState = { parent: u, cache: e }, Ji(t), ra(t, Gl, e)) : ((l.lanes & a) !== 0 && (wi(l, t), ve(t, null, null, a), de()), e = l.memoizedState, n = t.memoizedState, e.parent !== u ? (e = { parent: u, cache: u }, t.memoizedState = e, t.lanes === 0 && (t.memoizedState = t.updateQueue.baseState = e), ra(t, Gl, u)) : (u = n.cache, ra(t, Gl, u), u !== e.cache && Xi(
          t,
          [Gl],
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
  function ta(l) {
    l.flags |= 4;
  }
  function Uf(l, t, a, u, e) {
    if ((t = (l.mode & 32) !== 0) && (t = !1), t) {
      if (l.flags |= 16777216, (e & 335544128) === e)
        if (l.stateNode.complete) l.flags |= 8192;
        else if (To()) l.flags |= 8192;
        else
          throw Wa = dn, Ki;
    } else l.flags &= -16777217;
  }
  function $0(l, t) {
    if (t.type !== "stylesheet" || (t.state.loading & 4) !== 0)
      l.flags &= -16777217;
    else if (l.flags |= 16777216, !dd(t))
      if (To()) l.flags |= 8192;
      else
        throw Wa = dn, Ki;
  }
  function Dn(l, t) {
    t !== null && (l.flags |= 4), l.flags & 16384 && (t = l.tag !== 22 ? Dc() : 536870912, l.lanes |= t, Cu |= t);
  }
  function ge(l, t) {
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
    switch (xi(t), t.tag) {
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
        return a = t.stateNode, u = null, l !== null && (u = l.memoizedState.cache), t.memoizedState.cache !== u && (t.flags |= 2048), kt(Gl), Ml(), a.pendingContext && (a.context = a.pendingContext, a.pendingContext = null), (l === null || l.child === null) && (Eu(t) ? ta(t) : l === null || l.memoizedState.isDehydrated && (t.flags & 256) === 0 || (t.flags |= 1024, Yi())), Al(t), null;
      case 26:
        var e = t.type, n = t.memoizedState;
        return l === null ? (ta(t), n !== null ? (Al(t), $0(t, n)) : (Al(t), Uf(
          t,
          e,
          null,
          u,
          a
        ))) : n ? n !== l.memoizedState ? (ta(t), Al(t), $0(t, n)) : (Al(t), t.flags &= -16777217) : (l = l.memoizedProps, l !== u && ta(t), Al(t), Uf(
          t,
          e,
          l,
          u,
          a
        )), null;
      case 27:
        if (qa(t), a = $.current, e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && ta(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(v(166));
            return Al(t), null;
          }
          l = U.current, Eu(t) ? Ds(t) : (l = ud(e, u, a), t.stateNode = l, ta(t));
        }
        return Al(t), null;
      case 5:
        if (qa(t), e = t.type, l !== null && t.stateNode != null)
          l.memoizedProps !== u && ta(t);
        else {
          if (!u) {
            if (t.stateNode === null)
              throw Error(v(166));
            return Al(t), null;
          }
          if (n = U.current, Eu(t))
            Ds(t);
          else {
            var i = Ln(
              $.current
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
            n[Wl] = t, n[et] = u;
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
            u && ta(t);
          }
        }
        return Al(t), Uf(
          t,
          t.type,
          l === null ? null : l.memoizedProps,
          t.pendingProps,
          a
        ), null;
      case 6:
        if (l && t.stateNode != null)
          l.memoizedProps !== u && ta(t);
        else {
          if (typeof u != "string" && t.stateNode === null)
            throw Error(v(166));
          if (l = $.current, Eu(t)) {
            if (l = t.stateNode, a = t.memoizedProps, u = null, e = $l, e !== null)
              switch (e.tag) {
                case 27:
                case 5:
                  u = e.memoizedProps;
              }
            l[Wl] = t, l = !!(l.nodeValue === a || u !== null && u.suppressHydrationWarning === !0 || Jo(l.nodeValue, a)), l || ha(t, !0);
          } else
            l = Ln(l).createTextNode(
              u
            ), l[Wl] = t, t.stateNode = l;
        }
        return Al(t), null;
      case 31:
        if (a = t.memoizedState, l === null || l.memoizedState !== null) {
          if (u = Eu(t), a !== null) {
            if (l === null) {
              if (!u) throw Error(v(318));
              if (l = t.memoizedState, l = l !== null ? l.dehydrated : null, !l) throw Error(v(557));
              l[Wl] = t;
            } else
              La(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Al(t), l = !1;
          } else
            a = Yi(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = a), l = !0;
          if (!l)
            return t.flags & 256 ? (gt(t), t) : (gt(t), null);
          if ((t.flags & 128) !== 0)
            throw Error(v(558));
        }
        return Al(t), null;
      case 13:
        if (u = t.memoizedState, l === null || l.memoizedState !== null && l.memoizedState.dehydrated !== null) {
          if (e = Eu(t), u !== null && u.dehydrated !== null) {
            if (l === null) {
              if (!e) throw Error(v(318));
              if (e = t.memoizedState, e = e !== null ? e.dehydrated : null, !e) throw Error(v(317));
              e[Wl] = t;
            } else
              La(), (t.flags & 128) === 0 && (t.memoizedState = null), t.flags |= 4;
            Al(t), e = !1;
          } else
            e = Yi(), l !== null && l.memoizedState !== null && (l.memoizedState.hydrationErrors = e), e = !0;
          if (!e)
            return t.flags & 256 ? (gt(t), t) : (gt(t), null);
        }
        return gt(t), (t.flags & 128) !== 0 ? (t.lanes = a, t) : (a = u !== null, l = l !== null && l.memoizedState !== null, a && (u = t.child, e = null, u.alternate !== null && u.alternate.memoizedState !== null && u.alternate.memoizedState.cachePool !== null && (e = u.alternate.memoizedState.cachePool.pool), n = null, u.memoizedState !== null && u.memoizedState.cachePool !== null && (n = u.memoizedState.cachePool.pool), n !== e && (u.flags |= 2048)), a !== l && a && (t.child.flags |= 8192), Dn(t, t.updateQueue), Al(t), null);
      case 4:
        return Ml(), l === null && kf(t.stateNode.containerInfo), Al(t), null;
      case 10:
        return kt(t.type), Al(t), null;
      case 19:
        if (z(jl), u = t.memoizedState, u === null) return Al(t), null;
        if (e = (t.flags & 128) !== 0, n = u.rendering, n === null)
          if (e) ge(u, !1);
          else {
            if (Hl !== 0 || l !== null && (l.flags & 128) !== 0)
              for (l = t.child; l !== null; ) {
                if (n = hn(l), n !== null) {
                  for (t.flags |= 128, ge(u, !1), l = n.updateQueue, t.updateQueue = l, Dn(t, l), t.subtreeFlags = 0, l = a, a = t.child; a !== null; )
                    _s(a, l), a = a.sibling;
                  return p(
                    jl,
                    jl.current & 1 | 2
                  ), tl && $t(t, u.treeForkCount), t.child;
                }
                l = l.sibling;
              }
            u.tail !== null && Vl() > Cn && (t.flags |= 128, e = !0, ge(u, !1), t.lanes = 4194304);
          }
        else {
          if (!e)
            if (l = hn(n), l !== null) {
              if (t.flags |= 128, e = !0, l = l.updateQueue, t.updateQueue = l, Dn(t, l), ge(u, !0), u.tail === null && u.tailMode === "hidden" && !n.alternate && !tl)
                return Al(t), null;
            } else
              2 * Vl() - u.renderingStartTime > Cn && a !== 536870912 && (t.flags |= 128, e = !0, ge(u, !1), t.lanes = 4194304);
          u.isBackwards ? (n.sibling = t.child, t.child = n) : (l = u.last, l !== null ? l.sibling = n : t.child = n, u.last = n);
        }
        return u.tail !== null ? (l = u.tail, u.rendering = l, u.tail = l.sibling, u.renderingStartTime = Vl(), l.sibling = null, a = jl.current, p(
          jl,
          e ? a & 1 | 2 : a & 1
        ), tl && $t(t, u.treeForkCount), l) : (Al(t), null);
      case 22:
      case 23:
        return gt(t), ki(), u = t.memoizedState !== null, l !== null ? l.memoizedState !== null !== u && (t.flags |= 8192) : u && (t.flags |= 8192), u ? (a & 536870912) !== 0 && (t.flags & 128) === 0 && (Al(t), t.subtreeFlags & 6 && (t.flags |= 8192)) : Al(t), a = t.updateQueue, a !== null && Dn(t, a.retryQueue), a = null, l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), u = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (u = t.memoizedState.cachePool.pool), u !== a && (t.flags |= 2048), l !== null && z(Ja), null;
      case 24:
        return a = null, l !== null && (a = l.memoizedState.cache), t.memoizedState.cache !== a && (t.flags |= 2048), kt(Gl), Al(t), null;
      case 25:
        return null;
      case 30:
        return null;
    }
    throw Error(v(156, t.tag));
  }
  function fy(l, t) {
    switch (xi(t), t.tag) {
      case 1:
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 3:
        return kt(Gl), Ml(), l = t.flags, (l & 65536) !== 0 && (l & 128) === 0 ? (t.flags = l & -65537 | 128, t) : null;
      case 26:
      case 27:
      case 5:
        return qa(t), null;
      case 31:
        if (t.memoizedState !== null) {
          if (gt(t), t.alternate === null)
            throw Error(v(340));
          La();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 13:
        if (gt(t), l = t.memoizedState, l !== null && l.dehydrated !== null) {
          if (t.alternate === null)
            throw Error(v(340));
          La();
        }
        return l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 19:
        return z(jl), null;
      case 4:
        return Ml(), null;
      case 10:
        return kt(t.type), null;
      case 22:
      case 23:
        return gt(t), ki(), l !== null && z(Ja), l = t.flags, l & 65536 ? (t.flags = l & -65537 | 128, t) : null;
      case 24:
        return kt(Gl), null;
      case 25:
        return null;
      default:
        return null;
    }
  }
  function F0(l, t) {
    switch (xi(t), t.tag) {
      case 3:
        kt(Gl), Ml();
        break;
      case 26:
      case 27:
      case 5:
        qa(t);
        break;
      case 4:
        Ml();
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
        kt(t.type);
        break;
      case 22:
      case 23:
        gt(t), ki(), l !== null && z(Ja);
        break;
      case 24:
        kt(Gl);
    }
  }
  function be(l, t) {
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
  function Ta(l, t, a) {
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
    a.props = ka(
      l.type,
      l.memoizedProps
    ), a.state = l.memoizedState;
    try {
      a.componentWillUnmount();
    } catch (u) {
      dl(l, t, u);
    }
  }
  function Ee(l, t) {
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
  function Zt(l, t) {
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
  function Nf(l, t, a) {
    try {
      var u = l.stateNode;
      Uy(u, l.type, a, t), u[et] = t;
    } catch (e) {
      dl(l, l.return, e);
    }
  }
  function lo(l) {
    return l.tag === 5 || l.tag === 3 || l.tag === 26 || l.tag === 27 && Ua(l.type) || l.tag === 4;
  }
  function Rf(l) {
    l: for (; ; ) {
      for (; l.sibling === null; ) {
        if (l.return === null || lo(l.return)) return null;
        l = l.return;
      }
      for (l.sibling.return = l.return, l = l.sibling; l.tag !== 5 && l.tag !== 6 && l.tag !== 18; ) {
        if (l.tag === 27 && Ua(l.type) || l.flags & 2 || l.child === null || l.tag === 4) continue l;
        l.child.return = l, l = l.child;
      }
      if (!(l.flags & 2)) return l.stateNode;
    }
  }
  function Hf(l, t, a) {
    var u = l.tag;
    if (u === 5 || u === 6)
      l = l.stateNode, t ? (a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a).insertBefore(l, t) : (t = a.nodeType === 9 ? a.body : a.nodeName === "HTML" ? a.ownerDocument.body : a, t.appendChild(l), a = a._reactRootContainer, a != null || t.onclick !== null || (t.onclick = Jt));
    else if (u !== 4 && (u === 27 && Ua(l.type) && (a = l.stateNode, t = null), l = l.child, l !== null))
      for (Hf(l, t, a), l = l.sibling; l !== null; )
        Hf(l, t, a), l = l.sibling;
  }
  function Un(l, t, a) {
    var u = l.tag;
    if (u === 5 || u === 6)
      l = l.stateNode, t ? a.insertBefore(l, t) : a.appendChild(l);
    else if (u !== 4 && (u === 27 && Ua(l.type) && (a = l.stateNode), l = l.child, l !== null))
      for (Un(l, t, a), l = l.sibling; l !== null; )
        Un(l, t, a), l = l.sibling;
  }
  function to(l) {
    var t = l.stateNode, a = l.memoizedProps;
    try {
      for (var u = l.type, e = t.attributes; e.length; )
        t.removeAttributeNode(e[0]);
      Il(t, u, a), t[Wl] = l, t[et] = a;
    } catch (n) {
      dl(l, l.return, n);
    }
  }
  var aa = !1, Zl = !1, Cf = !1, ao = typeof WeakSet == "function" ? WeakSet : Set, Jl = null;
  function cy(l, t) {
    if (l = l.containerInfo, lc = Fn, l = ms(l), Oi(l)) {
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
    for (tc = { focusedElem: l, selectionRange: a }, Fn = !1, Jl = t; Jl !== null; )
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
                  var N = ka(
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
                  ec(l);
                else if (a === 1)
                  switch (l.nodeName) {
                    case "HEAD":
                    case "HTML":
                    case "BODY":
                      ec(l);
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
        ea(l, a), u & 4 && be(5, a);
        break;
      case 1:
        if (ea(l, a), u & 4)
          if (l = a.stateNode, t === null)
            try {
              l.componentDidMount();
            } catch (i) {
              dl(a, a.return, i);
            }
          else {
            var e = ka(
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
        u & 64 && k0(a), u & 512 && Ee(a, a.return);
        break;
      case 3:
        if (ea(l, a), u & 64 && (l = a.updateQueue, l !== null)) {
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
        ea(l, a), t === null && u & 4 && P0(a), u & 512 && Ee(a, a.return);
        break;
      case 12:
        ea(l, a);
        break;
      case 31:
        ea(l, a), u & 4 && io(l, a);
        break;
      case 13:
        ea(l, a), u & 4 && fo(l, a), u & 64 && (l = a.memoizedState, l !== null && (l = l.dehydrated, l !== null && (a = Sy.bind(
          null,
          a
        ), By(l, a))));
        break;
      case 22:
        if (u = a.memoizedState !== null || aa, !u) {
          t = t !== null && t.memoizedState !== null || Zl, e = aa;
          var n = Zl;
          aa = u, (Zl = t) && !n ? na(
            l,
            a,
            (a.subtreeFlags & 8772) !== 0
          ) : ea(l, a), aa = e, Zl = n;
        }
        break;
      case 30:
        break;
      default:
        ea(l, a);
    }
  }
  function eo(l) {
    var t = l.alternate;
    t !== null && (l.alternate = null, eo(t)), l.child = null, l.deletions = null, l.sibling = null, l.tag === 5 && (t = l.stateNode, t !== null && ci(t)), l.stateNode = null, l.return = null, l.dependencies = null, l.memoizedProps = null, l.memoizedState = null, l.pendingProps = null, l.stateNode = null, l.updateQueue = null;
  }
  var pl = null, it = !1;
  function ua(l, t, a) {
    for (a = a.child; a !== null; )
      no(l, t, a), a = a.sibling;
  }
  function no(l, t, a) {
    if (yt && typeof yt.onCommitFiberUnmount == "function")
      try {
        yt.onCommitFiberUnmount(Vu, a);
      } catch {
      }
    switch (a.tag) {
      case 26:
        Zl || Zt(a, t), ua(
          l,
          t,
          a
        ), a.memoizedState ? a.memoizedState.count-- : a.stateNode && (a = a.stateNode, a.parentNode.removeChild(a));
        break;
      case 27:
        Zl || Zt(a, t);
        var u = pl, e = it;
        Ua(a.type) && (pl = a.stateNode, it = !1), ua(
          l,
          t,
          a
        ), Ue(a.stateNode), pl = u, it = e;
        break;
      case 5:
        Zl || Zt(a, t);
      case 6:
        if (u = pl, e = it, pl = null, ua(
          l,
          t,
          a
        ), pl = u, it = e, pl !== null)
          if (it)
            try {
              (pl.nodeType === 9 ? pl.body : pl.nodeName === "HTML" ? pl.ownerDocument.body : pl).removeChild(a.stateNode);
            } catch (n) {
              dl(
                a,
                t,
                n
              );
            }
          else
            try {
              pl.removeChild(a.stateNode);
            } catch (n) {
              dl(
                a,
                t,
                n
              );
            }
        break;
      case 18:
        pl !== null && (it ? (l = pl, Io(
          l.nodeType === 9 ? l.body : l.nodeName === "HTML" ? l.ownerDocument.body : l,
          a.stateNode
        ), Xu(l)) : Io(pl, a.stateNode));
        break;
      case 4:
        u = pl, e = it, pl = a.stateNode.containerInfo, it = !0, ua(
          l,
          t,
          a
        ), pl = u, it = e;
        break;
      case 0:
      case 11:
      case 14:
      case 15:
        Ta(2, a, t), Zl || Ta(4, a, t), ua(
          l,
          t,
          a
        );
        break;
      case 1:
        Zl || (Zt(a, t), u = a.stateNode, typeof u.componentWillUnmount == "function" && I0(
          a,
          t,
          u
        )), ua(
          l,
          t,
          a
        );
        break;
      case 21:
        ua(
          l,
          t,
          a
        );
        break;
      case 22:
        Zl = (u = Zl) || a.memoizedState !== null, ua(
          l,
          t,
          a
        ), Zl = u;
        break;
      default:
        ua(
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
        Xu(l);
      } catch (a) {
        dl(t, t.return, a);
      }
    }
  }
  function fo(l, t) {
    if (t.memoizedState === null && (l = t.alternate, l !== null && (l = l.memoizedState, l !== null && (l = l.dehydrated, l !== null))))
      try {
        Xu(l);
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
  function Nn(l, t) {
    var a = sy(l);
    t.forEach(function(u) {
      if (!a.has(u)) {
        a.add(u);
        var e = gy.bind(null, l, u);
        u.then(e, e);
      }
    });
  }
  function ft(l, t) {
    var a = t.deletions;
    if (a !== null)
      for (var u = 0; u < a.length; u++) {
        var e = a[u], n = l, i = t, f = i;
        l: for (; f !== null; ) {
          switch (f.tag) {
            case 27:
              if (Ua(f.type)) {
                pl = f.stateNode, it = !1;
                break l;
              }
              break;
            case 5:
              pl = f.stateNode, it = !1;
              break l;
            case 3:
            case 4:
              pl = f.stateNode.containerInfo, it = !0;
              break l;
          }
          f = f.return;
        }
        if (pl === null) throw Error(v(160));
        no(n, i, e), pl = null, it = !1, n = e.alternate, n !== null && (n.return = null), e.return = null;
      }
    if (t.subtreeFlags & 13886)
      for (t = t.child; t !== null; )
        co(t, l), t = t.sibling;
  }
  var xt = null;
  function co(l, t) {
    var a = l.alternate, u = l.flags;
    switch (l.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        ft(t, l), ct(l), u & 4 && (Ta(3, l, l.return), be(3, l), Ta(5, l, l.return));
        break;
      case 1:
        ft(t, l), ct(l), u & 512 && (Zl || a === null || Zt(a, a.return)), u & 64 && aa && (l = l.updateQueue, l !== null && (u = l.callbacks, u !== null && (a = l.shared.hiddenCallbacks, l.shared.hiddenCallbacks = a === null ? u : a.concat(u))));
        break;
      case 26:
        var e = xt;
        if (ft(t, l), ct(l), u & 512 && (Zl || a === null || Zt(a, a.return)), u & 4) {
          var n = a !== null ? a.memoizedState : null;
          if (u = l.memoizedState, a === null)
            if (u === null)
              if (l.stateNode === null) {
                l: {
                  u = l.type, a = l.memoizedProps, e = e.ownerDocument || e;
                  t: switch (u) {
                    case "title":
                      n = e.getElementsByTagName("title")[0], (!n || n[wu] || n[Wl] || n.namespaceURI === "http://www.w3.org/2000/svg" || n.hasAttribute("itemprop")) && (n = e.createElement(u), e.head.insertBefore(
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
            )) : u === null && l.stateNode !== null && Nf(
              l,
              l.memoizedProps,
              a.memoizedProps
            );
        }
        break;
      case 27:
        ft(t, l), ct(l), u & 512 && (Zl || a === null || Zt(a, a.return)), a !== null && u & 4 && Nf(
          l,
          l.memoizedProps,
          a.memoizedProps
        );
        break;
      case 5:
        if (ft(t, l), ct(l), u & 512 && (Zl || a === null || Zt(a, a.return)), l.flags & 32) {
          e = l.stateNode;
          try {
            ou(e, "");
          } catch (N) {
            dl(l, l.return, N);
          }
        }
        u & 4 && l.stateNode != null && (e = l.memoizedProps, Nf(
          l,
          e,
          a !== null ? a.memoizedProps : e
        )), u & 1024 && (Cf = !0);
        break;
      case 6:
        if (ft(t, l), ct(l), u & 4) {
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
        if (Jn = null, e = xt, xt = Vn(t.containerInfo), ft(t, l), xt = e, ct(l), u & 4 && a !== null && a.memoizedState.isDehydrated)
          try {
            Xu(t.containerInfo);
          } catch (N) {
            dl(l, l.return, N);
          }
        Cf && (Cf = !1, so(l));
        break;
      case 4:
        u = xt, xt = Vn(
          l.stateNode.containerInfo
        ), ft(t, l), ct(l), xt = u;
        break;
      case 12:
        ft(t, l), ct(l);
        break;
      case 31:
        ft(t, l), ct(l), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, Nn(l, u)));
        break;
      case 13:
        ft(t, l), ct(l), l.child.flags & 8192 && l.memoizedState !== null != (a !== null && a.memoizedState !== null) && (Hn = Vl()), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, Nn(l, u)));
        break;
      case 22:
        e = l.memoizedState !== null;
        var c = a !== null && a.memoizedState !== null, m = aa, g = Zl;
        if (aa = m || e, Zl = g || c, ft(t, l), Zl = g, aa = m, ct(l), u & 8192)
          l: for (t = l.stateNode, t._visibility = e ? t._visibility & -2 : t._visibility | 1, e && (a === null || c || aa || Zl || Ia(l)), a = null, t = l; ; ) {
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
        u & 4 && (u = l.updateQueue, u !== null && (a = u.retryQueue, a !== null && (u.retryQueue = null, Nn(l, a))));
        break;
      case 19:
        ft(t, l), ct(l), u & 4 && (u = l.updateQueue, u !== null && (l.updateQueue = null, Nn(l, u)));
        break;
      case 30:
        break;
      case 21:
        break;
      default:
        ft(t, l), ct(l);
    }
  }
  function ct(l) {
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
            var e = a.stateNode, n = Rf(l);
            Un(l, n, e);
            break;
          case 5:
            var i = a.stateNode;
            a.flags & 32 && (ou(i, ""), a.flags &= -33);
            var f = Rf(l);
            Un(l, f, i);
            break;
          case 3:
          case 4:
            var c = a.stateNode.containerInfo, m = Rf(l);
            Hf(
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
  function ea(l, t) {
    if (t.subtreeFlags & 8772)
      for (t = t.child; t !== null; )
        uo(l, t.alternate, t), t = t.sibling;
  }
  function Ia(l) {
    for (l = l.child; l !== null; ) {
      var t = l;
      switch (t.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          Ta(4, t, t.return), Ia(t);
          break;
        case 1:
          Zt(t, t.return);
          var a = t.stateNode;
          typeof a.componentWillUnmount == "function" && I0(
            t,
            t.return,
            a
          ), Ia(t);
          break;
        case 27:
          Ue(t.stateNode);
        case 26:
        case 5:
          Zt(t, t.return), Ia(t);
          break;
        case 22:
          t.memoizedState === null && Ia(t);
          break;
        case 30:
          Ia(t);
          break;
        default:
          Ia(t);
      }
      l = l.sibling;
    }
  }
  function na(l, t, a) {
    for (a = a && (t.subtreeFlags & 8772) !== 0, t = t.child; t !== null; ) {
      var u = t.alternate, e = l, n = t, i = n.flags;
      switch (n.tag) {
        case 0:
        case 11:
        case 15:
          na(
            e,
            n,
            a
          ), be(4, n);
          break;
        case 1:
          if (na(
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
          a && i & 64 && k0(n), Ee(n, n.return);
          break;
        case 27:
          to(n);
        case 26:
        case 5:
          na(
            e,
            n,
            a
          ), a && u === null && i & 4 && P0(n), Ee(n, n.return);
          break;
        case 12:
          na(
            e,
            n,
            a
          );
          break;
        case 31:
          na(
            e,
            n,
            a
          ), a && i & 4 && io(e, n);
          break;
        case 13:
          na(
            e,
            n,
            a
          ), a && i & 4 && fo(e, n);
          break;
        case 22:
          n.memoizedState === null && na(
            e,
            n,
            a
          ), Ee(n, n.return);
          break;
        case 30:
          break;
        default:
          na(
            e,
            n,
            a
          );
      }
      t = t.sibling;
    }
  }
  function jf(l, t) {
    var a = null;
    l !== null && l.memoizedState !== null && l.memoizedState.cachePool !== null && (a = l.memoizedState.cachePool.pool), l = null, t.memoizedState !== null && t.memoizedState.cachePool !== null && (l = t.memoizedState.cachePool.pool), l !== a && (l != null && l.refCount++, a != null && ie(a));
  }
  function qf(l, t) {
    l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && ie(l));
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
        ), e & 2048 && be(9, t);
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
        ), e & 2048 && (l = null, t.alternate !== null && (l = t.alternate.memoizedState.cache), t = t.memoizedState.cache, t !== l && (t.refCount++, l != null && ie(l)));
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
        ) : ze(l, t) : n._visibility & 2 ? Bt(
          l,
          t,
          a,
          u
        ) : (n._visibility |= 2, Nu(
          l,
          t,
          a,
          u,
          (t.subtreeFlags & 10256) !== 0 || !1
        )), e & 2048 && jf(i, t);
        break;
      case 24:
        Bt(
          l,
          t,
          a,
          u
        ), e & 2048 && qf(t.alternate, t);
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
  function Nu(l, t, a, u, e) {
    for (e = e && ((t.subtreeFlags & 10256) !== 0 || !1), t = t.child; t !== null; ) {
      var n = l, i = t, f = a, c = u, m = i.flags;
      switch (i.tag) {
        case 0:
        case 11:
        case 15:
          Nu(
            n,
            i,
            f,
            c,
            e
          ), be(8, i);
          break;
        case 23:
          break;
        case 22:
          var g = i.stateNode;
          i.memoizedState !== null ? g._visibility & 2 ? Nu(
            n,
            i,
            f,
            c,
            e
          ) : ze(
            n,
            i
          ) : (g._visibility |= 2, Nu(
            n,
            i,
            f,
            c,
            e
          )), e && m & 2048 && jf(
            i.alternate,
            i
          );
          break;
        case 24:
          Nu(
            n,
            i,
            f,
            c,
            e
          ), e && m & 2048 && qf(i.alternate, i);
          break;
        default:
          Nu(
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
  function ze(l, t) {
    if (t.subtreeFlags & 10256)
      for (t = t.child; t !== null; ) {
        var a = l, u = t, e = u.flags;
        switch (u.tag) {
          case 22:
            ze(a, u), e & 2048 && jf(
              u.alternate,
              u
            );
            break;
          case 24:
            ze(a, u), e & 2048 && qf(u.alternate, u);
            break;
          default:
            ze(a, u);
        }
        t = t.sibling;
      }
  }
  var Te = 8192;
  function Ru(l, t, a) {
    if (l.subtreeFlags & Te)
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
        Ru(
          l,
          t,
          a
        ), l.flags & Te && l.memoizedState !== null && $y(
          a,
          xt,
          l.memoizedState,
          l.memoizedProps
        );
        break;
      case 5:
        Ru(
          l,
          t,
          a
        );
        break;
      case 3:
      case 4:
        var u = xt;
        xt = Vn(l.stateNode.containerInfo), Ru(
          l,
          t,
          a
        ), xt = u;
        break;
      case 22:
        l.memoizedState === null && (u = l.alternate, u !== null && u.memoizedState !== null ? (u = Te, Te = 16777216, Ru(
          l,
          t,
          a
        ), Te = u) : Ru(
          l,
          t,
          a
        ));
        break;
      default:
        Ru(
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
  function _e(l) {
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
        _e(l), l.flags & 2048 && Ta(9, l, l.return);
        break;
      case 3:
        _e(l);
        break;
      case 12:
        _e(l);
        break;
      case 22:
        var t = l.stateNode;
        l.memoizedState !== null && t._visibility & 2 && (l.return === null || l.return.tag !== 13) ? (t._visibility &= -3, Rn(l)) : _e(l);
        break;
      default:
        _e(l);
    }
  }
  function Rn(l) {
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
          Ta(8, t, t.return), Rn(t);
          break;
        case 22:
          a = t.stateNode, a._visibility & 2 && (a._visibility &= -3, Rn(t));
          break;
        default:
          Rn(t);
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
          Ta(8, a, t);
          break;
        case 23:
        case 22:
          if (a.memoizedState !== null && a.memoizedState.cachePool !== null) {
            var u = a.memoizedState.cachePool.pool;
            u != null && u.refCount++;
          }
          break;
        case 24:
          ie(a.memoizedState.cache);
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
      var t = Fl(Gl), a = t.data.get(l);
      return a === void 0 && (a = l(), t.data.set(l, a)), a;
    },
    cacheSignal: function() {
      return Fl(Gl).controller.signal;
    }
  }, dy = typeof WeakMap == "function" ? WeakMap : Map, fl = 0, El = null, k = null, P = 0, ol = 0, bt = null, _a = !1, Hu = !1, xf = !1, ia = 0, Hl = 0, Aa = 0, Pa = 0, Bf = 0, Et = 0, Cu = 0, Ae = null, st = null, Yf = !1, Hn = 0, ro = 0, Cn = 1 / 0, jn = null, Oa = null, Ll = 0, Ma = null, ju = null, fa = 0, Gf = 0, Qf = null, So = null, Oe = 0, Xf = null;
  function zt() {
    return (fl & 2) !== 0 && P !== 0 ? P & -P : S.T !== null ? wf() : Hc();
  }
  function go() {
    if (Et === 0)
      if ((P & 536870912) === 0 || tl) {
        var l = Xe;
        Xe <<= 1, (Xe & 3932160) === 0 && (Xe = 262144), Et = l;
      } else Et = 536870912;
    return l = St.current, l !== null && (l.flags |= 32), Et;
  }
  function ot(l, t, a) {
    (l === El && (ol === 2 || ol === 9) || l.cancelPendingCommit !== null) && (qu(l, 0), pa(
      l,
      P,
      Et,
      !1
    )), Ju(l, a), ((fl & 2) === 0 || l !== El) && (l === El && ((fl & 2) === 0 && (Pa |= a), Hl === 4 && pa(
      l,
      P,
      Et,
      !1
    )), Lt(l));
  }
  function bo(l, t, a) {
    if ((fl & 6) !== 0) throw Error(v(327));
    var u = !a && (t & 127) === 0 && (t & l.expiredLanes) === 0 || Ku(l, t), e = u ? my(l, t) : Lf(l, t, !0), n = u;
    do {
      if (e === 0) {
        Hu && !u && pa(l, t, 0, !1);
        break;
      } else {
        if (a = l.current.alternate, n && !vy(a)) {
          e = Lf(l, t, !1), n = !1;
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
              e = Ae;
              var c = f.current.memoizedState.isDehydrated;
              if (c && (qu(f, i).flags |= 256), i = Lf(
                f,
                i,
                !1
              ), i !== 2) {
                if (xf && !c) {
                  f.errorRecoveryDisabledLanes |= n, Pa |= n, e = 4;
                  break l;
                }
                n = st, st = e, n !== null && (st === null ? st = n : st.push.apply(
                  st,
                  n
                ));
              }
              e = i;
            }
            if (n = !1, e !== 2) continue;
          }
        }
        if (e === 1) {
          qu(l, 0), pa(l, t, 0, !0);
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
              pa(
                u,
                t,
                Et,
                !_a
              );
              break l;
            case 2:
              st = null;
              break;
            case 3:
            case 5:
              break;
            default:
              throw Error(v(329));
          }
          if ((t & 62914560) === t && (e = Hn + 300 - Vl(), 10 < e)) {
            if (pa(
              u,
              t,
              Et,
              !_a
            ), Le(u, 0, !0) !== 0) break l;
            fa = t, u.timeoutHandle = Fo(
              Eo.bind(
                null,
                u,
                a,
                st,
                jn,
                Yf,
                t,
                Et,
                Pa,
                Cu,
                _a,
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
            st,
            jn,
            Yf,
            t,
            Et,
            Pa,
            Cu,
            _a,
            n,
            null,
            -0,
            0
          );
        }
      }
      break;
    } while (!0);
    Lt(l);
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
        unsuspend: Jt
      }, vo(
        t,
        n,
        T
      );
      var N = (n & 62914560) === n ? Hn - Vl() : (n & 4194048) === n ? ro - Vl() : 0;
      if (N = Fy(
        T,
        N
      ), N !== null) {
        fa = n, l.cancelPendingCommit = N(
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
        ), pa(l, n, i, !m);
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
  function pa(l, t, a, u) {
    t &= ~Bf, t &= ~Pa, l.suspendedLanes |= t, l.pingedLanes &= ~t, u && (l.warmLanes |= t), u = l.expirationTimes;
    for (var e = t; 0 < e; ) {
      var n = 31 - mt(e), i = 1 << n;
      u[n] = -1, e &= ~i;
    }
    a !== 0 && Uc(l, a, t);
  }
  function qn() {
    return (fl & 6) === 0 ? (Me(0), !1) : !0;
  }
  function Zf() {
    if (k !== null) {
      if (ol === 0)
        var l = k.return;
      else
        l = k, Ft = Va = null, uf(l), Ou = null, ce = 0, l = k;
      for (; l !== null; )
        F0(l.alternate, l), l = l.return;
      k = null;
    }
  }
  function qu(l, t) {
    var a = l.timeoutHandle;
    a !== -1 && (l.timeoutHandle = -1, Hy(a)), a = l.cancelPendingCommit, a !== null && (l.cancelPendingCommit = null, a()), fa = 0, Zf(), El = l, k = a = Wt(l.current, null), P = t, ol = 0, bt = null, _a = !1, Hu = Ku(l, t), xf = !1, Cu = Et = Bf = Pa = Aa = Hl = 0, st = Ae = null, Yf = !1, (t & 8) !== 0 && (t |= t & 32);
    var u = l.entangledLanes;
    if (u !== 0)
      for (l = l.entanglements, u &= t; 0 < u; ) {
        var e = 31 - mt(u), n = 1 << e;
        t |= l[e], u &= ~n;
      }
    return ia = t, tn(), a;
  }
  function zo(l, t) {
    L = null, S.H = re, t === Au || t === on ? (t = xs(), ol = 3) : t === Ki ? (t = xs(), ol = 4) : ol = t === Ef ? 8 : t !== null && typeof t == "object" && typeof t.then == "function" ? 6 : 1, bt = t, k === null && (Hl = 1, An(
      l,
      pt(t, l.current)
    ));
  }
  function To() {
    var l = St.current;
    return l === null ? !0 : (P & 4194048) === P ? Rt === null : (P & 62914560) === P || (P & 536870912) !== 0 ? l === Rt : !1;
  }
  function _o() {
    var l = S.H;
    return S.H = re, l === null ? re : l;
  }
  function Ao() {
    var l = S.A;
    return S.A = oy, l;
  }
  function xn() {
    Hl = 4, _a || (P & 4194048) !== P && St.current !== null || (Hu = !0), (Aa & 134217727) === 0 && (Pa & 134217727) === 0 || El === null || pa(
      El,
      P,
      Et,
      !1
    );
  }
  function Lf(l, t, a) {
    var u = fl;
    fl |= 2;
    var e = _o(), n = Ao();
    (El !== l || P !== t) && (jn = null, qu(l, t)), t = !1;
    var i = Hl;
    l: do
      try {
        if (ol !== 0 && k !== null) {
          var f = k, c = bt;
          switch (ol) {
            case 8:
              Zf(), i = 6;
              break l;
            case 3:
            case 2:
            case 9:
            case 6:
              St.current === null && (t = !0);
              var m = ol;
              if (ol = 0, bt = null, xu(l, f, c, m), a && Hu) {
                i = 0;
                break l;
              }
              break;
            default:
              m = ol, ol = 0, bt = null, xu(l, f, c, m);
          }
        }
        yy(), i = Hl;
        break;
      } catch (g) {
        zo(l, g);
      }
    while (!0);
    return t && l.shellSuspendCounter++, Ft = Va = null, fl = u, S.H = e, S.A = n, k === null && (El = null, P = 0, tn()), i;
  }
  function yy() {
    for (; k !== null; ) Oo(k);
  }
  function my(l, t) {
    var a = fl;
    fl |= 2;
    var u = _o(), e = Ao();
    El !== l || P !== t ? (jn = null, Cn = Vl() + 500, qu(l, t)) : Hu = Ku(
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
              ol = 0, bt = null, xu(l, t, n, 1);
              break;
            case 2:
            case 9:
              if (js(n)) {
                ol = 0, bt = null, Mo(t);
                break;
              }
              t = function() {
                ol !== 2 && ol !== 9 || El !== l || (ol = 7), Lt(l);
              }, n.then(t, t);
              break l;
            case 3:
              ol = 7;
              break l;
            case 4:
              ol = 5;
              break l;
            case 7:
              js(n) ? (ol = 0, bt = null, Mo(t)) : (ol = 0, bt = null, xu(l, t, n, 7));
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
              ol = 0, bt = null, xu(l, t, n, 5);
              break;
            case 6:
              ol = 0, bt = null, xu(l, t, n, 6);
              break;
            case 8:
              Zf(), Hl = 6;
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
    return Ft = Va = null, S.H = u, S.A = e, fl = a, k !== null ? 0 : (El = null, P = 0, tn(), Hl);
  }
  function hy() {
    for (; k !== null && !_t(); )
      Oo(k);
  }
  function Oo(l) {
    var t = W0(l.alternate, l, ia);
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
        uf(t);
      default:
        F0(a, t), t = k = _s(t, ia), t = W0(a, t, ia);
    }
    l.memoizedProps = l.pendingProps, t === null ? Bn(l) : k = t;
  }
  function xu(l, t, a, u) {
    Ft = Va = null, uf(t), Ou = null, ce = 0;
    var e = t.return;
    try {
      if (uy(
        l,
        e,
        t,
        a,
        P
      )) {
        Hl = 1, An(
          l,
          pt(a, l.current)
        ), k = null;
        return;
      }
    } catch (n) {
      if (e !== null) throw k = e, n;
      Hl = 1, An(
        l,
        pt(a, l.current)
      ), k = null;
      return;
    }
    t.flags & 32768 ? (tl || u === 1 ? l = !0 : Hu || (P & 536870912) !== 0 ? l = !1 : (_a = l = !0, (u === 2 || u === 9 || u === 3 || u === 6) && (u = St.current, u !== null && u.tag === 13 && (u.flags |= 16384))), po(t, l)) : Bn(t);
  }
  function Bn(l) {
    var t = l;
    do {
      if ((t.flags & 32768) !== 0) {
        po(
          t,
          _a
        );
        return;
      }
      l = t.return;
      var a = iy(
        t.alternate,
        t,
        ia
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
      Yn();
    while (Ll !== 0);
    if ((fl & 6) !== 0) throw Error(v(327));
    if (t !== null) {
      if (t === l.current) throw Error(v(177));
      if (n = t.lanes | t.childLanes, n |= Ni, Wd(
        l,
        a,
        n,
        i,
        f,
        c
      ), l === El && (k = El = null, P = 0), ju = t, Ma = l, fa = a, Gf = n, Qf = e, So = u, (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? (l.callbackNode = null, l.callbackPriority = 0, by(Ge, function() {
        return Co(), null;
      })) : (l.callbackNode = null, l.callbackPriority = 0), u = (t.flags & 13878) !== 0, (t.subtreeFlags & 13878) !== 0 || u) {
        u = S.T, S.T = null, e = M.p, M.p = 2, i = fl, fl |= 4;
        try {
          cy(l, t, a);
        } finally {
          fl = i, M.p = e, S.T = u;
        }
      }
      Ll = 1, Uo(), No(), Ro();
    }
  }
  function Uo() {
    if (Ll === 1) {
      Ll = 0;
      var l = Ma, t = ju, a = (t.flags & 13878) !== 0;
      if ((t.subtreeFlags & 13878) !== 0 || a) {
        a = S.T, S.T = null;
        var u = M.p;
        M.p = 2;
        var e = fl;
        fl |= 4;
        try {
          co(t, l);
          var n = tc, i = ms(l.containerInfo), f = n.focusedElem, c = n.selectionRange;
          if (i !== f && f && f.ownerDocument && ys(
            f.ownerDocument.documentElement,
            f
          )) {
            if (c !== null && Oi(f)) {
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
          Fn = !!lc, tc = lc = null;
        } finally {
          fl = e, M.p = u, S.T = a;
        }
      }
      l.current = t, Ll = 2;
    }
  }
  function No() {
    if (Ll === 2) {
      Ll = 0;
      var l = Ma, t = ju, a = (t.flags & 8772) !== 0;
      if ((t.subtreeFlags & 8772) !== 0 || a) {
        a = S.T, S.T = null;
        var u = M.p;
        M.p = 2;
        var e = fl;
        fl |= 4;
        try {
          uo(l, t.alternate, t);
        } finally {
          fl = e, M.p = u, S.T = a;
        }
      }
      Ll = 3;
    }
  }
  function Ro() {
    if (Ll === 4 || Ll === 3) {
      Ll = 0, dt();
      var l = Ma, t = ju, a = fa, u = So;
      (t.subtreeFlags & 10256) !== 0 || (t.flags & 10256) !== 0 ? Ll = 5 : (Ll = 0, ju = Ma = null, Ho(l, l.pendingLanes));
      var e = l.pendingLanes;
      if (e === 0 && (Oa = null), ii(a), t = t.stateNode, yt && typeof yt.onCommitFiberRoot == "function")
        try {
          yt.onCommitFiberRoot(
            Vu,
            t,
            void 0,
            (t.current.flags & 128) === 128
          );
        } catch {
        }
      if (u !== null) {
        t = S.T, e = M.p, M.p = 2, S.T = null;
        try {
          for (var n = l.onRecoverableError, i = 0; i < u.length; i++) {
            var f = u[i];
            n(f.value, {
              componentStack: f.stack
            });
          }
        } finally {
          S.T = t, M.p = e;
        }
      }
      (fa & 3) !== 0 && Yn(), Lt(l), e = l.pendingLanes, (a & 261930) !== 0 && (e & 42) !== 0 ? l === Xf ? Oe++ : (Oe = 0, Xf = l) : Oe = 0, Me(0);
    }
  }
  function Ho(l, t) {
    (l.pooledCacheLanes &= t) === 0 && (t = l.pooledCache, t != null && (l.pooledCache = null, ie(t)));
  }
  function Yn() {
    return Uo(), No(), Ro(), Co();
  }
  function Co() {
    if (Ll !== 5) return !1;
    var l = Ma, t = Gf;
    Gf = 0;
    var a = ii(fa), u = S.T, e = M.p;
    try {
      M.p = 32 > a ? 32 : a, S.T = null, a = Qf, Qf = null;
      var n = Ma, i = fa;
      if (Ll = 0, ju = Ma = null, fa = 0, (fl & 6) !== 0) throw Error(v(331));
      var f = fl;
      if (fl |= 4, mo(n.current), oo(
        n,
        n.current,
        i,
        a
      ), fl = f, Me(0, !1), yt && typeof yt.onPostCommitFiberRoot == "function")
        try {
          yt.onPostCommitFiberRoot(Vu, n);
        } catch {
        }
      return !0;
    } finally {
      M.p = e, S.T = u, Ho(l, t);
    }
  }
  function jo(l, t, a) {
    t = pt(a, t), t = bf(l.stateNode, t, 2), l = ba(l, t, 2), l !== null && (Ju(l, 2), Lt(l));
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
          if (typeof t.type.getDerivedStateFromError == "function" || typeof u.componentDidCatch == "function" && (Oa === null || !Oa.has(u))) {
            l = pt(a, l), a = j0(2), u = ba(t, a, 2), u !== null && (q0(
              a,
              u,
              t,
              l
            ), Ju(u, 2), Lt(u));
            break;
          }
        }
        t = t.return;
      }
  }
  function Vf(l, t, a) {
    var u = l.pingCache;
    if (u === null) {
      u = l.pingCache = new dy();
      var e = /* @__PURE__ */ new Set();
      u.set(t, e);
    } else
      e = u.get(t), e === void 0 && (e = /* @__PURE__ */ new Set(), u.set(t, e));
    e.has(a) || (xf = !0, e.add(a), l = ry.bind(null, l, t, a), t.then(l, l));
  }
  function ry(l, t, a) {
    var u = l.pingCache;
    u !== null && u.delete(t), l.pingedLanes |= l.suspendedLanes & a, l.warmLanes &= ~a, El === l && (P & a) === a && (Hl === 4 || Hl === 3 && (P & 62914560) === P && 300 > Vl() - Hn ? (fl & 2) === 0 && qu(l, 0) : Bf |= a, Cu === P && (Cu = 0)), Lt(l);
  }
  function qo(l, t) {
    t === 0 && (t = Dc()), l = Xa(l, t), l !== null && (Ju(l, t), Lt(l));
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
    return Gt(l, t);
  }
  var Gn = null, Bu = null, Kf = !1, Qn = !1, Jf = !1, Da = 0;
  function Lt(l) {
    l !== Bu && l.next === null && (Bu === null ? Gn = Bu = l : Bu = Bu.next = l), Qn = !0, Kf || (Kf = !0, zy());
  }
  function Me(l, t) {
    if (!Jf && Qn) {
      Jf = !0;
      do
        for (var a = !1, u = Gn; u !== null; ) {
          if (l !== 0) {
            var e = u.pendingLanes;
            if (e === 0) var n = 0;
            else {
              var i = u.suspendedLanes, f = u.pingedLanes;
              n = (1 << 31 - mt(42 | l) + 1) - 1, n &= e & ~(i & ~f), n = n & 201326741 ? n & 201326741 | 1 : n ? n | 2 : 0;
            }
            n !== 0 && (a = !0, Go(u, n));
          } else
            n = P, n = Le(
              u,
              u === El ? n : 0,
              u.cancelPendingCommit !== null || u.timeoutHandle !== -1
            ), (n & 3) === 0 || Ku(u, n) || (a = !0, Go(u, n));
          u = u.next;
        }
      while (a);
      Jf = !1;
    }
  }
  function Ey() {
    xo();
  }
  function xo() {
    Qn = Kf = !1;
    var l = 0;
    Da !== 0 && Ry() && (l = Da);
    for (var t = Vl(), a = null, u = Gn; u !== null; ) {
      var e = u.next, n = Bo(u, t);
      n === 0 ? (u.next = null, a === null ? Gn = e : a.next = e, e === null && (Bu = a)) : (a = u, (l !== 0 || (n & 3) !== 0) && (Qn = !0)), u = e;
    }
    Ll !== 0 && Ll !== 5 || Me(l), Da !== 0 && (Da = 0);
  }
  function Bo(l, t) {
    for (var a = l.suspendedLanes, u = l.pingedLanes, e = l.expirationTimes, n = l.pendingLanes & -62914561; 0 < n; ) {
      var i = 31 - mt(n), f = 1 << i, c = e[i];
      c === -1 ? ((f & a) === 0 || (f & u) !== 0) && (e[i] = wd(f, t)) : c <= t && (l.expiredLanes |= f), n &= ~f;
    }
    if (t = El, a = P, a = Le(
      l,
      l === t ? a : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u = l.callbackNode, a === 0 || l === t && (ol === 2 || ol === 9) || l.cancelPendingCommit !== null)
      return u !== null && u !== null && Tt(u), l.callbackNode = null, l.callbackPriority = 0;
    if ((a & 3) === 0 || Ku(l, a)) {
      if (t = a & -a, t === l.callbackPriority) return t;
      switch (u !== null && Tt(u), ii(a)) {
        case 2:
        case 8:
          a = Mc;
          break;
        case 32:
          a = Ge;
          break;
        case 268435456:
          a = pc;
          break;
        default:
          a = Ge;
      }
      return u = Yo.bind(null, l), a = Gt(a, u), l.callbackPriority = t, l.callbackNode = a, t;
    }
    return u !== null && u !== null && Tt(u), l.callbackPriority = 2, l.callbackNode = null, 2;
  }
  function Yo(l, t) {
    if (Ll !== 0 && Ll !== 5)
      return l.callbackNode = null, l.callbackPriority = 0, null;
    var a = l.callbackNode;
    if (Yn() && l.callbackNode !== a)
      return null;
    var u = P;
    return u = Le(
      l,
      l === El ? u : 0,
      l.cancelPendingCommit !== null || l.timeoutHandle !== -1
    ), u === 0 ? null : (bo(l, u, t), Bo(l, Vl()), l.callbackNode != null && l.callbackNode === a ? Yo.bind(null, l) : null);
  }
  function Go(l, t) {
    if (Yn()) return null;
    bo(l, t, !0);
  }
  function zy() {
    Cy(function() {
      (fl & 6) !== 0 ? Gt(
        uu,
        Ey
      ) : xo();
    });
  }
  function wf() {
    if (Da === 0) {
      var l = Tu;
      l === 0 && (l = Qe, Qe <<= 1, (Qe & 261888) === 0 && (Qe = 256)), Da = l;
    }
    return Da;
  }
  function Qo(l) {
    return l == null || typeof l == "symbol" || typeof l == "boolean" ? null : typeof l == "function" ? l : we("" + l);
  }
  function Xo(l, t) {
    var a = t.ownerDocument.createElement("input");
    return a.name = t.name, a.value = t.value, l.id && a.setAttribute("form", l.id), t.parentNode.insertBefore(a, t), l = new FormData(l), a.parentNode.removeChild(a), l;
  }
  function Ty(l, t, a, u, e) {
    if (t === "submit" && a && a.stateNode === e) {
      var n = Qo(
        (e[et] || null).action
      ), i = u.submitter;
      i && (t = (t = i[et] || null) ? Qo(t.formAction) : i.getAttribute("formAction"), t !== null && (n = t, i = null));
      var f = new ke(
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
                if (Da !== 0) {
                  var c = i ? Xo(e, i) : new FormData(e);
                  yf(
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
                typeof n == "function" && (f.preventDefault(), c = i ? Xo(e, i) : new FormData(e), yf(
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
  for (var Wf = 0; Wf < Ui.length; Wf++) {
    var $f = Ui[Wf], _y = $f.toLowerCase(), Ay = $f[0].toUpperCase() + $f.slice(1);
    qt(
      _y,
      "on" + Ay
    );
  }
  qt(Ss, "onAnimationEnd"), qt(gs, "onAnimationIteration"), qt(bs, "onAnimationStart"), qt("dblclick", "onDoubleClick"), qt("focusin", "onFocus"), qt("focusout", "onBlur"), qt(Qv, "onTransitionRun"), qt(Xv, "onTransitionStart"), qt(Zv, "onTransitionCancel"), qt(Es, "onTransitionEnd"), cu("onMouseEnter", ["mouseout", "mouseover"]), cu("onMouseLeave", ["mouseout", "mouseover"]), cu("onPointerEnter", ["pointerout", "pointerover"]), cu("onPointerLeave", ["pointerout", "pointerover"]), Ba(
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
  var pe = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
    " "
  ), Oy = new Set(
    "beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(pe)
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
              ln(g);
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
              ln(g);
            }
            e.currentTarget = null, n = c;
          }
      }
    }
  }
  function I(l, t) {
    var a = t[fi];
    a === void 0 && (a = t[fi] = /* @__PURE__ */ new Set());
    var u = l + "__bubble";
    a.has(u) || (Lo(t, l, 2, !1), a.add(u));
  }
  function Ff(l, t, a) {
    var u = 0;
    t && (u |= 4), Lo(
      a,
      l,
      u,
      t
    );
  }
  var Xn = "_reactListening" + Math.random().toString(36).slice(2);
  function kf(l) {
    if (!l[Xn]) {
      l[Xn] = !0, qc.forEach(function(a) {
        a !== "selectionchange" && (Oy.has(a) || Ff(a, !1, l), Ff(a, !0, l));
      });
      var t = l.nodeType === 9 ? l : l.ownerDocument;
      t === null || t[Xn] || (t[Xn] = !0, Ff("selectionchange", !1, t));
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
        e = vc;
    }
    a = e.bind(
      null,
      t,
      a,
      l
    ), e = void 0, !ri || t !== "touchstart" && t !== "touchmove" && t !== "wheel" || (e = !0), u ? e !== void 0 ? l.addEventListener(t, a, {
      capture: !0,
      passive: e
    }) : l.addEventListener(t, a, !0) : e !== void 0 ? l.addEventListener(t, a, {
      passive: e
    }) : l.addEventListener(t, a, !1);
  }
  function If(l, t, a, u, e) {
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
            if (i = nu(f), i === null) return;
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
      var m = n, g = mi(a), T = [];
      l: {
        var h = zs.get(l);
        if (h !== void 0) {
          var r = ke, N = l;
          switch (l) {
            case "keypress":
              if ($e(a) === 0) break l;
            case "keydown":
            case "keyup":
              r = gv;
              break;
            case "focusin":
              N = "focus", r = Ei;
              break;
            case "focusout":
              N = "blur", r = Ei;
              break;
            case "beforeblur":
            case "afterblur":
              r = Ei;
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
            if (y = E.stateNode, E = E.tag, E !== 5 && E !== 26 && E !== 27 || y === null || d === null || (E = $u(s, d), E != null && Y.push(
              De(s, E, y)
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
          if (h = l === "mouseover" || l === "pointerover", r = l === "mouseout" || l === "pointerout", h && a !== yi && (N = a.relatedTarget || a.fromElement) && (nu(N) || N[eu]))
            break l;
          if ((r || h) && (h = g.window === g ? g : (h = g.ownerDocument) ? h.defaultView || h.parentWindow : window, r ? (N = a.relatedTarget || a.toElement, r = m, N = N ? nu(N) : null, N !== null && (rl = W(N), Y = N.tag, N !== rl || Y !== 5 && Y !== 27 && Y !== 6) && (N = null)) : (r = null, N = m), r !== N)) {
            if (Y = Fc, E = "onMouseLeave", d = "onMouseEnter", s = "mouse", (l === "pointerout" || l === "pointerover") && (Y = Ic, E = "onPointerLeave", d = "onPointerEnter", s = "pointer"), rl = r == null ? h : Wu(r), y = N == null ? h : Wu(N), h = new Y(
              E,
              s + "leave",
              r,
              a,
              g
            ), h.target = rl, h.relatedTarget = y, E = null, nu(g) === m && (Y = new Y(
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
          if (h = m ? Wu(m) : window, r = h.nodeName && h.nodeName.toLowerCase(), r === "select" || r === "input" && h.type === "file")
            var nl = is;
          else if (es(h))
            if (fs)
              nl = Bv;
            else {
              nl = qv;
              var H = jv;
            }
          else
            r = h.nodeName, !r || r.toLowerCase() !== "input" || h.type !== "checkbox" && h.type !== "radio" ? m && vi(m.elementType) && (nl = is) : nl = xv;
          if (nl && (nl = nl(l, m))) {
            ns(
              T,
              nl,
              a,
              g
            );
            break l;
          }
          H && H(l, h, m), l === "focusout" && m && h.type === "number" && m.memoizedProps.value != null && di(h, "number", h.value);
        }
        switch (H = m ? Wu(m) : window, l) {
          case "focusin":
            (es(H) || H.contentEditable === "true") && (mu = H, Mi = m, ue = null);
            break;
          case "focusout":
            ue = Mi = mu = null;
            break;
          case "mousedown":
            pi = !0;
            break;
          case "contextmenu":
          case "mouseup":
          case "dragend":
            pi = !1, hs(T, a, g);
            break;
          case "selectionchange":
            if (Gv) break;
          case "keydown":
          case "keyup":
            hs(T, a, g);
        }
        var w;
        if (Ti)
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
          yu ? as(l, a) && (ll = "onCompositionEnd") : l === "keydown" && a.keyCode === 229 && (ll = "onCompositionStart");
        ll && (Pc && a.locale !== "ko" && (yu || ll !== "onCompositionStart" ? ll === "onCompositionEnd" && yu && (w = Wc()) : (va = g, Si = "value" in va ? va.value : va.textContent, yu = !0)), H = Zn(m, ll), 0 < H.length && (ll = new kc(
          ll,
          l,
          null,
          a,
          g
        ), T.push({ event: ll, listeners: H }), w ? ll.data = w : (w = us(a), w !== null && (ll.data = w)))), (w = Uv ? Nv(l, a) : Rv(l, a)) && (ll = Zn(m, "onBeforeInput"), 0 < ll.length && (H = new kc(
          "onBeforeInput",
          "beforeinput",
          null,
          a,
          g
        ), T.push({
          event: H,
          listeners: ll
        }), H.data = w)), Ty(
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
  function De(l, t, a) {
    return {
      instance: l,
      listener: t,
      currentTarget: a
    };
  }
  function Zn(l, t) {
    for (var a = t + "Capture", u = []; l !== null; ) {
      var e = l, n = e.stateNode;
      if (e = e.tag, e !== 5 && e !== 26 && e !== 27 || n === null || (e = $u(l, a), e != null && u.unshift(
        De(l, e, n)
      ), e = $u(l, t), e != null && u.push(
        De(l, e, n)
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
      f !== 5 && f !== 26 && f !== 27 || m === null || (c = m, e ? (m = $u(a, n), m != null && i.unshift(
        De(a, m, c)
      )) : e || (m = $u(a, n), m != null && i.push(
        De(a, m, c)
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
        typeof u == "string" ? t === "body" || t === "textarea" && u === "" || ou(l, u) : (typeof u == "number" || typeof u == "bigint") && t !== "body" && ou(l, "" + u);
        break;
      case "className":
        Ke(l, "class", u);
        break;
      case "tabIndex":
        Ke(l, "tabindex", u);
        break;
      case "dir":
      case "role":
      case "viewBox":
      case "width":
      case "height":
        Ke(l, a, u);
        break;
      case "style":
        Kc(l, u, n);
        break;
      case "data":
        if (t !== "object") {
          Ke(l, "data", u);
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
        u = we("" + u), l.setAttribute(a, u);
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
        u = we("" + u), l.setAttribute(a, u);
        break;
      case "onClick":
        u != null && (l.onclick = Jt);
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
        a = we("" + u), l.setAttributeNS(
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
        I("beforetoggle", l), I("toggle", l), Ve(l, "popover", u);
        break;
      case "xlinkActuate":
        Kt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:actuate",
          u
        );
        break;
      case "xlinkArcrole":
        Kt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:arcrole",
          u
        );
        break;
      case "xlinkRole":
        Kt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:role",
          u
        );
        break;
      case "xlinkShow":
        Kt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:show",
          u
        );
        break;
      case "xlinkTitle":
        Kt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:title",
          u
        );
        break;
      case "xlinkType":
        Kt(
          l,
          "http://www.w3.org/1999/xlink",
          "xlink:type",
          u
        );
        break;
      case "xmlBase":
        Kt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:base",
          u
        );
        break;
      case "xmlLang":
        Kt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:lang",
          u
        );
        break;
      case "xmlSpace":
        Kt(
          l,
          "http://www.w3.org/XML/1998/namespace",
          "xml:space",
          u
        );
        break;
      case "is":
        Ve(l, "is", u);
        break;
      case "innerText":
      case "textContent":
        break;
      default:
        (!(2 < a.length) || a[0] !== "o" && a[0] !== "O" || a[1] !== "n" && a[1] !== "N") && (a = av.get(a) || a, Ve(l, a, u));
    }
  }
  function Pf(l, t, a, u, e, n) {
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
        typeof u == "string" ? ou(l, u) : (typeof u == "number" || typeof u == "bigint") && ou(l, "" + u);
        break;
      case "onScroll":
        u != null && I("scroll", l);
        break;
      case "onScrollEnd":
        u != null && I("scrollend", l);
        break;
      case "onClick":
        u != null && (l.onclick = Jt);
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
        if (!xc.hasOwnProperty(a))
          l: {
            if (a[0] === "o" && a[1] === "n" && (e = a.endsWith("Capture"), t = a.slice(2, e ? a.length - 7 : void 0), n = l[et] || null, n = n != null ? n[a] : null, typeof n == "function" && l.removeEventListener(t, n, e), typeof u == "function")) {
              typeof n != "function" && n !== null && (a in l ? l[a] = null : l.hasAttribute(a) && l.removeAttribute(a)), l.addEventListener(t, u, e);
              break l;
            }
            a in l ? l[a] = u : u === !0 ? l.setAttribute(a, "") : Ve(l, a, u);
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
        t = n, a = i, l.multiple = !!u, t != null ? su(l, !!u, t, !1) : a != null && su(l, !!u, a, !0);
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
        for (u = 0; u < pe.length; u++)
          I(pe[u], l);
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
        if (vi(t)) {
          for (g in a)
            a.hasOwnProperty(g) && (u = a[g], u !== void 0 && Pf(
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
        oi(
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
        t = f, a = i, u = r, h != null ? su(l, !!a, h, !1) : !!u != !!a && (t != null ? su(l, !!a, t, !0) : su(l, !!a, a ? [] : "", !1));
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
        if (vi(t)) {
          for (var rl in a)
            h = a[rl], a.hasOwnProperty(rl) && h !== void 0 && !u.hasOwnProperty(rl) && Pf(
              l,
              t,
              rl,
              void 0,
              u,
              h
            );
          for (g in u)
            h = u[g], r = a[g], !u.hasOwnProperty(g) || h === r || h === void 0 && r === void 0 || Pf(
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
  var lc = null, tc = null;
  function Ln(l) {
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
  function ac(l, t) {
    return l === "textarea" || l === "noscript" || typeof t.children == "string" || typeof t.children == "number" || typeof t.children == "bigint" || typeof t.dangerouslySetInnerHTML == "object" && t.dangerouslySetInnerHTML !== null && t.dangerouslySetInnerHTML.__html != null;
  }
  var uc = null;
  function Ry() {
    var l = window.event;
    return l && l.type === "popstate" ? l === uc ? !1 : (uc = l, !0) : (uc = null, !1);
  }
  var Fo = typeof setTimeout == "function" ? setTimeout : void 0, Hy = typeof clearTimeout == "function" ? clearTimeout : void 0, ko = typeof Promise == "function" ? Promise : void 0, Cy = typeof queueMicrotask == "function" ? queueMicrotask : typeof ko < "u" ? function(l) {
    return ko.resolve(null).then(l).catch(jy);
  } : Fo;
  function jy(l) {
    setTimeout(function() {
      throw l;
    });
  }
  function Ua(l) {
    return l === "head";
  }
  function Io(l, t) {
    var a = t, u = 0;
    do {
      var e = a.nextSibling;
      if (l.removeChild(a), e && e.nodeType === 8)
        if (a = e.data, a === "/$" || a === "/&") {
          if (u === 0) {
            l.removeChild(e), Xu(t);
            return;
          }
          u--;
        } else if (a === "$" || a === "$?" || a === "$~" || a === "$!" || a === "&")
          u++;
        else if (a === "html")
          Ue(l.ownerDocument.documentElement);
        else if (a === "head") {
          a = l.ownerDocument.head, Ue(a);
          for (var n = a.firstChild; n; ) {
            var i = n.nextSibling, f = n.nodeName;
            n[wu] || f === "SCRIPT" || f === "STYLE" || f === "LINK" && n.rel.toLowerCase() === "stylesheet" || a.removeChild(n), n = i;
          }
        } else
          a === "body" && Ue(l.ownerDocument.body);
      a = e;
    } while (a);
    Xu(t);
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
  function ec(l) {
    var t = l.firstChild;
    for (t && t.nodeType === 10 && (t = t.nextSibling); t; ) {
      var a = t;
      switch (t = t.nextSibling, a.nodeName) {
        case "HTML":
        case "HEAD":
        case "BODY":
          ec(a), ci(a);
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
        if (!l[wu])
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
      if (l = Ht(l.nextSibling), l === null) break;
    }
    return null;
  }
  function xy(l, t, a) {
    if (t === "") return null;
    for (; l.nodeType !== 3; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !a || (l = Ht(l.nextSibling), l === null)) return null;
    return l;
  }
  function ld(l, t) {
    for (; l.nodeType !== 8; )
      if ((l.nodeType !== 1 || l.nodeName !== "INPUT" || l.type !== "hidden") && !t || (l = Ht(l.nextSibling), l === null)) return null;
    return l;
  }
  function nc(l) {
    return l.data === "$?" || l.data === "$~";
  }
  function ic(l) {
    return l.data === "$!" || l.data === "$?" && l.ownerDocument.readyState !== "loading";
  }
  function By(l, t) {
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
  function Ht(l) {
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
  var fc = null;
  function td(l) {
    l = l.nextSibling;
    for (var t = 0; l; ) {
      if (l.nodeType === 8) {
        var a = l.data;
        if (a === "/$" || a === "/&") {
          if (t === 0)
            return Ht(l.nextSibling);
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
    switch (t = Ln(a), l) {
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
  function Ue(l) {
    for (var t = l.attributes; t.length; )
      l.removeAttributeNode(t[0]);
    ci(l);
  }
  var Ct = /* @__PURE__ */ new Map(), ed = /* @__PURE__ */ new Set();
  function Vn(l) {
    return typeof l.getRootNode == "function" ? l.getRootNode() : l.nodeType === 9 ? l : l.ownerDocument;
  }
  var ca = M.d;
  M.d = {
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
    var l = ca.f(), t = qn();
    return l || t;
  }
  function Gy(l) {
    var t = iu(l);
    t !== null && t.tag === 5 && t.type === "form" ? E0(t) : ca.r(l);
  }
  var Yu = typeof document > "u" ? null : document;
  function nd(l, t, a) {
    var u = Yu;
    if (u && typeof t == "string" && t) {
      var e = Ot(t);
      e = 'link[rel="' + l + '"][href="' + e + '"]', typeof a == "string" && (e += '[crossorigin="' + a + '"]'), ed.has(e) || (ed.add(e), l = { rel: l, crossOrigin: a, href: t }, u.querySelector(e) === null && (t = u.createElement("link"), Il(t, "link", l), Kl(t), u.head.appendChild(t)));
    }
  }
  function Qy(l) {
    ca.D(l), nd("dns-prefetch", l, null);
  }
  function Xy(l, t) {
    ca.C(l, t), nd("preconnect", l, t);
  }
  function Zy(l, t, a) {
    ca.L(l, t, a);
    var u = Yu;
    if (u && l && t) {
      var e = 'link[rel="preload"][as="' + Ot(t) + '"]';
      t === "image" && a && a.imageSrcSet ? (e += '[imagesrcset="' + Ot(
        a.imageSrcSet
      ) + '"]', typeof a.imageSizes == "string" && (e += '[imagesizes="' + Ot(
        a.imageSizes
      ) + '"]')) : e += '[href="' + Ot(l) + '"]';
      var n = e;
      switch (t) {
        case "style":
          n = Gu(l);
          break;
        case "script":
          n = Qu(l);
      }
      Ct.has(n) || (l = C(
        {
          rel: "preload",
          href: t === "image" && a && a.imageSrcSet ? void 0 : l,
          as: t
        },
        a
      ), Ct.set(n, l), u.querySelector(e) !== null || t === "style" && u.querySelector(Ne(n)) || t === "script" && u.querySelector(Re(n)) || (t = u.createElement("link"), Il(t, "link", l), Kl(t), u.head.appendChild(t)));
    }
  }
  function Ly(l, t) {
    ca.m(l, t);
    var a = Yu;
    if (a && l) {
      var u = t && typeof t.as == "string" ? t.as : "script", e = 'link[rel="modulepreload"][as="' + Ot(u) + '"][href="' + Ot(l) + '"]', n = e;
      switch (u) {
        case "audioworklet":
        case "paintworklet":
        case "serviceworker":
        case "sharedworker":
        case "worker":
        case "script":
          n = Qu(l);
      }
      if (!Ct.has(n) && (l = C({ rel: "modulepreload", href: l }, t), Ct.set(n, l), a.querySelector(e) === null)) {
        switch (u) {
          case "audioworklet":
          case "paintworklet":
          case "serviceworker":
          case "sharedworker":
          case "worker":
          case "script":
            if (a.querySelector(Re(n)))
              return;
        }
        u = a.createElement("link"), Il(u, "link", l), Kl(u), a.head.appendChild(u);
      }
    }
  }
  function Vy(l, t, a) {
    ca.S(l, t, a);
    var u = Yu;
    if (u && l) {
      var e = fu(u).hoistableStyles, n = Gu(l);
      t = t || "default";
      var i = e.get(n);
      if (!i) {
        var f = { loading: 0, preload: null };
        if (i = u.querySelector(
          Ne(n)
        ))
          f.loading = 5;
        else {
          l = C(
            { rel: "stylesheet", href: l, "data-precedence": t },
            a
          ), (a = Ct.get(n)) && cc(l, a);
          var c = i = u.createElement("link");
          Kl(c), Il(c, "link", l), c._p = new Promise(function(m, g) {
            c.onload = m, c.onerror = g;
          }), c.addEventListener("load", function() {
            f.loading |= 1;
          }), c.addEventListener("error", function() {
            f.loading |= 2;
          }), f.loading |= 4, Kn(i, t, u);
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
    ca.X(l, t);
    var a = Yu;
    if (a && l) {
      var u = fu(a).hoistableScripts, e = Qu(l), n = u.get(e);
      n || (n = a.querySelector(Re(e)), n || (l = C({ src: l, async: !0 }, t), (t = Ct.get(e)) && sc(l, t), n = a.createElement("script"), Kl(n), Il(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function Jy(l, t) {
    ca.M(l, t);
    var a = Yu;
    if (a && l) {
      var u = fu(a).hoistableScripts, e = Qu(l), n = u.get(e);
      n || (n = a.querySelector(Re(e)), n || (l = C({ src: l, async: !0, type: "module" }, t), (t = Ct.get(e)) && sc(l, t), n = a.createElement("script"), Kl(n), Il(n, "link", l), a.head.appendChild(n)), n = {
        type: "script",
        instance: n,
        count: 1,
        state: null
      }, u.set(e, n));
    }
  }
  function id(l, t, a, u) {
    var e = (e = $.current) ? Vn(e) : null;
    if (!e) throw Error(v(446));
    switch (l) {
      case "meta":
      case "title":
        return null;
      case "style":
        return typeof a.precedence == "string" && typeof a.href == "string" ? (t = Gu(a.href), a = fu(
          e
        ).hoistableStyles, u = a.get(t), u || (u = {
          type: "style",
          instance: null,
          count: 0,
          state: null
        }, a.set(t, u)), u) : { type: "void", instance: null, count: 0, state: null };
      case "link":
        if (a.rel === "stylesheet" && typeof a.href == "string" && typeof a.precedence == "string") {
          l = Gu(a.href);
          var n = fu(
            e
          ).hoistableStyles, i = n.get(l);
          if (i || (e = e.ownerDocument || e, i = {
            type: "stylesheet",
            instance: null,
            count: 0,
            state: { loading: 0, preload: null }
          }, n.set(l, i), (n = e.querySelector(
            Ne(l)
          )) && !n._p && (i.instance = n, i.state.loading = 5), Ct.has(l) || (a = {
            rel: "preload",
            as: "style",
            href: a.href,
            crossOrigin: a.crossOrigin,
            integrity: a.integrity,
            media: a.media,
            hrefLang: a.hrefLang,
            referrerPolicy: a.referrerPolicy
          }, Ct.set(l, a), n || wy(
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
        return t = a.async, a = a.src, typeof a == "string" && t && typeof t != "function" && typeof t != "symbol" ? (t = Qu(a), a = fu(
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
  function Gu(l) {
    return 'href="' + Ot(l) + '"';
  }
  function Ne(l) {
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
  function Qu(l) {
    return '[src="' + Ot(l) + '"]';
  }
  function Re(l) {
    return "script[async]" + l;
  }
  function cd(l, t, a) {
    if (t.count++, t.instance === null)
      switch (t.type) {
        case "style":
          var u = l.querySelector(
            'style[data-href~="' + Ot(a.href) + '"]'
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
          ), Kl(u), Il(u, "style", e), Kn(u, a.precedence, l), t.instance = u;
        case "stylesheet":
          e = Gu(a.href);
          var n = l.querySelector(
            Ne(e)
          );
          if (n)
            return t.state.loading |= 4, t.instance = n, Kl(n), n;
          u = fd(a), (e = Ct.get(e)) && cc(u, e), n = (l.ownerDocument || l).createElement("link"), Kl(n);
          var i = n;
          return i._p = new Promise(function(f, c) {
            i.onload = f, i.onerror = c;
          }), Il(n, "link", u), t.state.loading |= 4, Kn(n, a.precedence, l), t.instance = n;
        case "script":
          return n = Qu(a.src), (e = l.querySelector(
            Re(n)
          )) ? (t.instance = e, Kl(e), e) : (u = a, (e = Ct.get(n)) && (u = C({}, a), sc(u, e)), l = l.ownerDocument || l, e = l.createElement("script"), Kl(e), Il(e, "link", u), l.head.appendChild(e), t.instance = e);
        case "void":
          return null;
        default:
          throw Error(v(443, t.type));
      }
    else
      t.type === "stylesheet" && (t.state.loading & 4) === 0 && (u = t.instance, t.state.loading |= 4, Kn(u, a.precedence, l));
    return t.instance;
  }
  function Kn(l, t, a) {
    for (var u = a.querySelectorAll(
      'link[rel="stylesheet"][data-precedence],style[data-precedence]'
    ), e = u.length ? u[u.length - 1] : null, n = e, i = 0; i < u.length; i++) {
      var f = u[i];
      if (f.dataset.precedence === t) n = f;
      else if (n !== e) break;
    }
    n ? n.parentNode.insertBefore(l, n.nextSibling) : (t = a.nodeType === 9 ? a.head : a, t.insertBefore(l, t.firstChild));
  }
  function cc(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.title == null && (l.title = t.title);
  }
  function sc(l, t) {
    l.crossOrigin == null && (l.crossOrigin = t.crossOrigin), l.referrerPolicy == null && (l.referrerPolicy = t.referrerPolicy), l.integrity == null && (l.integrity = t.integrity);
  }
  var Jn = null;
  function sd(l, t, a) {
    if (Jn === null) {
      var u = /* @__PURE__ */ new Map(), e = Jn = /* @__PURE__ */ new Map();
      e.set(a, u);
    } else
      e = Jn, u = e.get(a), u || (u = /* @__PURE__ */ new Map(), e.set(a, u));
    if (u.has(l)) return u;
    for (u.set(l, null), a = a.getElementsByTagName(l), e = 0; e < a.length; e++) {
      var n = a[e];
      if (!(n[wu] || n[Wl] || l === "link" && n.getAttribute("rel") === "stylesheet") && n.namespaceURI !== "http://www.w3.org/2000/svg") {
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
        var e = Gu(u.href), n = t.querySelector(
          Ne(e)
        );
        if (n) {
          t = n._p, t !== null && typeof t == "object" && typeof t.then == "function" && (l.count++, l = wn.bind(l), t.then(l, l)), a.state.loading |= 4, a.instance = n, Kl(n);
          return;
        }
        n = t.ownerDocument || t, u = fd(u), (e = Ct.get(e)) && cc(u, e), n = n.createElement("link"), Kl(n);
        var i = n;
        i._p = new Promise(function(f, c) {
          i.onload = f, i.onerror = c;
        }), Il(n, "link", u), a.instance = n;
      }
      l.stylesheets === null && (l.stylesheets = /* @__PURE__ */ new Map()), l.stylesheets.set(a, t), (t = a.state.preload) && (a.state.loading & 3) === 0 && (l.count++, a = wn.bind(l), t.addEventListener("load", a), t.addEventListener("error", a));
    }
  }
  var oc = 0;
  function Fy(l, t) {
    return l.stylesheets && l.count === 0 && $n(l, l.stylesheets), 0 < l.count || 0 < l.imgCount ? function(a) {
      var u = setTimeout(function() {
        if (l.stylesheets && $n(l, l.stylesheets), l.unsuspend) {
          var n = l.unsuspend;
          l.unsuspend = null, n();
        }
      }, 6e4 + t);
      0 < l.imgBytes && oc === 0 && (oc = 62500 * Ny());
      var e = setTimeout(
        function() {
          if (l.waitingForImages = !1, l.count === 0 && (l.stylesheets && $n(l, l.stylesheets), l.unsuspend)) {
            var n = l.unsuspend;
            l.unsuspend = null, n();
          }
        },
        (l.imgBytes > oc ? 50 : 800) + t
      );
      return l.unsuspend = a, function() {
        l.unsuspend = null, clearTimeout(u), clearTimeout(e);
      };
    } : null;
  }
  function wn() {
    if (this.count--, this.count === 0 && (this.imgCount === 0 || !this.waitingForImages)) {
      if (this.stylesheets) $n(this, this.stylesheets);
      else if (this.unsuspend) {
        var l = this.unsuspend;
        this.unsuspend = null, l();
      }
    }
  }
  var Wn = null;
  function $n(l, t) {
    l.stylesheets = null, l.unsuspend !== null && (l.count++, Wn = /* @__PURE__ */ new Map(), t.forEach(ky, l), Wn = null, wn.call(l));
  }
  function ky(l, t) {
    if (!(t.state.loading & 4)) {
      var a = Wn.get(l);
      if (a) var u = a.get(null);
      else {
        a = /* @__PURE__ */ new Map(), Wn.set(l, a);
        for (var e = l.querySelectorAll(
          "link[data-precedence],style[data-precedence]"
        ), n = 0; n < e.length; n++) {
          var i = e[n];
          (i.nodeName === "LINK" || i.getAttribute("media") !== "not all") && (a.set(i.dataset.precedence, i), u = i);
        }
        u && a.set(null, u);
      }
      e = t.instance, i = e.getAttribute("data-precedence"), n = a.get(i) || u, n === u && a.set(null, e), a.set(i, e), this.count++, u = wn.bind(this), e.addEventListener("load", u), e.addEventListener("error", u), n ? n.parentNode.insertBefore(e, n.nextSibling) : (l = l.nodeType === 9 ? l.head : l, l.insertBefore(e, l.firstChild)), t.state.loading |= 4;
    }
  }
  var He = {
    $$typeof: Ol,
    Provider: null,
    Consumer: null,
    _currentValue: x,
    _currentValue2: x,
    _threadCount: 0
  };
  function Iy(l, t, a, u, e, n, i, f, c) {
    this.tag = 1, this.containerInfo = l, this.pingCache = this.current = this.pendingChildren = null, this.timeoutHandle = -1, this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null, this.callbackPriority = 0, this.expirationTimes = ei(-1), this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0, this.entanglements = ei(0), this.hiddenUpdates = ei(null), this.identifierPrefix = u, this.onUncaughtError = e, this.onCaughtError = n, this.onRecoverableError = i, this.pooledCache = null, this.pooledCacheLanes = 0, this.formState = c, this.incompleteTransitions = /* @__PURE__ */ new Map();
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
    ), t = 1, n === !0 && (t |= 24), n = rt(3, null, null, t), l.current = n, n.stateNode = l, t = Zi(), t.refCount++, l.pooledCache = t, t.refCount++, n.memoizedState = {
      element: u,
      isDehydrated: a,
      cache: t
    }, Ji(n), l;
  }
  function yd(l) {
    return l ? (l = Su, l) : Su;
  }
  function md(l, t, a, u, e, n) {
    e = yd(e), u.context === null ? u.context = e : u.pendingContext = e, u = ga(t), u.payload = { element: a }, n = n === void 0 ? null : n, n !== null && (u.callback = n), a = ba(l, u, t), a !== null && (ot(a, l, t), oe(a, l, t));
  }
  function hd(l, t) {
    if (l = l.memoizedState, l !== null && l.dehydrated !== null) {
      var a = l.retryLane;
      l.retryLane = a !== 0 && a < t ? a : t;
    }
  }
  function dc(l, t) {
    hd(l, t), (l = l.alternate) && hd(l, t);
  }
  function rd(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = Xa(l, 67108864);
      t !== null && ot(t, l, 67108864), dc(l, 67108864);
    }
  }
  function Sd(l) {
    if (l.tag === 13 || l.tag === 31) {
      var t = zt();
      t = ni(t);
      var a = Xa(l, t);
      a !== null && ot(a, l, t), dc(l, t);
    }
  }
  var Fn = !0;
  function Py(l, t, a, u) {
    var e = S.T;
    S.T = null;
    var n = M.p;
    try {
      M.p = 2, vc(l, t, a, u);
    } finally {
      M.p = n, S.T = e;
    }
  }
  function lm(l, t, a, u) {
    var e = S.T;
    S.T = null;
    var n = M.p;
    try {
      M.p = 8, vc(l, t, a, u);
    } finally {
      M.p = n, S.T = e;
    }
  }
  function vc(l, t, a, u) {
    if (Fn) {
      var e = yc(u);
      if (e === null)
        If(
          l,
          t,
          u,
          kn,
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
          var n = iu(e);
          if (n !== null)
            switch (n.tag) {
              case 3:
                if (n = n.stateNode, n.current.memoizedState.isDehydrated) {
                  var i = xa(n.pendingLanes);
                  if (i !== 0) {
                    var f = n;
                    for (f.pendingLanes |= 2, f.entangledLanes |= 2; i; ) {
                      var c = 1 << 31 - mt(i);
                      f.entanglements[1] |= c, i &= ~c;
                    }
                    Lt(n), (fl & 6) === 0 && (Cn = Vl() + 500, Me(0));
                  }
                }
                break;
              case 31:
              case 13:
                f = Xa(n, 2), f !== null && ot(f, n, 2), qn(), dc(n, 2);
            }
          if (n = yc(u), n === null && If(
            l,
            t,
            u,
            kn,
            a
          ), n === e) break;
          e = n;
        }
        e !== null && u.stopPropagation();
      } else
        If(
          l,
          t,
          u,
          null,
          a
        );
    }
  }
  function yc(l) {
    return l = mi(l), mc(l);
  }
  var kn = null;
  function mc(l) {
    if (kn = null, l = nu(l), l !== null) {
      var t = W(l);
      if (t === null) l = null;
      else {
        var a = t.tag;
        if (a === 13) {
          if (l = Q(t), l !== null) return l;
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
    return kn = l, null;
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
        switch (vt()) {
          case uu:
            return 2;
          case Mc:
            return 8;
          case Ge:
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
  var hc = !1, Na = null, Ra = null, Ha = null, Ce = /* @__PURE__ */ new Map(), je = /* @__PURE__ */ new Map(), Ca = [], tm = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(
    " "
  );
  function bd(l, t) {
    switch (l) {
      case "focusin":
      case "focusout":
        Na = null;
        break;
      case "dragenter":
      case "dragleave":
        Ra = null;
        break;
      case "mouseover":
      case "mouseout":
        Ha = null;
        break;
      case "pointerover":
      case "pointerout":
        Ce.delete(t.pointerId);
        break;
      case "gotpointercapture":
      case "lostpointercapture":
        je.delete(t.pointerId);
    }
  }
  function qe(l, t, a, u, e, n) {
    return l === null || l.nativeEvent !== n ? (l = {
      blockedOn: t,
      domEventName: a,
      eventSystemFlags: u,
      nativeEvent: n,
      targetContainers: [e]
    }, t !== null && (t = iu(t), t !== null && rd(t)), l) : (l.eventSystemFlags |= u, t = l.targetContainers, e !== null && t.indexOf(e) === -1 && t.push(e), l);
  }
  function am(l, t, a, u, e) {
    switch (t) {
      case "focusin":
        return Na = qe(
          Na,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "dragenter":
        return Ra = qe(
          Ra,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "mouseover":
        return Ha = qe(
          Ha,
          l,
          t,
          a,
          u,
          e
        ), !0;
      case "pointerover":
        var n = e.pointerId;
        return Ce.set(
          n,
          qe(
            Ce.get(n) || null,
            l,
            t,
            a,
            u,
            e
          )
        ), !0;
      case "gotpointercapture":
        return n = e.pointerId, je.set(
          n,
          qe(
            je.get(n) || null,
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
    var t = nu(l.target);
    if (t !== null) {
      var a = W(t);
      if (a !== null) {
        if (t = a.tag, t === 13) {
          if (t = Q(a), t !== null) {
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
  function In(l) {
    if (l.blockedOn !== null) return !1;
    for (var t = l.targetContainers; 0 < t.length; ) {
      var a = yc(l.nativeEvent);
      if (a === null) {
        a = l.nativeEvent;
        var u = new a.constructor(
          a.type,
          a
        );
        yi = u, a.target.dispatchEvent(u), yi = null;
      } else
        return t = iu(a), t !== null && rd(t), l.blockedOn = a, !1;
      t.shift();
    }
    return !0;
  }
  function zd(l, t, a) {
    In(l) && a.delete(t);
  }
  function um() {
    hc = !1, Na !== null && In(Na) && (Na = null), Ra !== null && In(Ra) && (Ra = null), Ha !== null && In(Ha) && (Ha = null), Ce.forEach(zd), je.forEach(zd);
  }
  function Pn(l, t) {
    l.blockedOn === t && (l.blockedOn = null, hc || (hc = !0, _.unstable_scheduleCallback(
      _.unstable_NormalPriority,
      um
    )));
  }
  var li = null;
  function Td(l) {
    li !== l && (li = l, _.unstable_scheduleCallback(
      _.unstable_NormalPriority,
      function() {
        li === l && (li = null);
        for (var t = 0; t < l.length; t += 3) {
          var a = l[t], u = l[t + 1], e = l[t + 2];
          if (typeof u != "function") {
            if (mc(u || a) === null)
              continue;
            break;
          }
          var n = iu(a);
          n !== null && (l.splice(t, 3), t -= 3, yf(
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
  function Xu(l) {
    function t(c) {
      return Pn(c, l);
    }
    Na !== null && Pn(Na, l), Ra !== null && Pn(Ra, l), Ha !== null && Pn(Ha, l), Ce.forEach(t), je.forEach(t);
    for (var a = 0; a < Ca.length; a++) {
      var u = Ca[a];
      u.blockedOn === l && (u.blockedOn = null);
    }
    for (; 0 < Ca.length && (a = Ca[0], a.blockedOn === null); )
      Ed(a), a.blockedOn === null && Ca.shift();
    if (a = (l.ownerDocument || l).$$reactFormReplay, a != null)
      for (u = 0; u < a.length; u += 3) {
        var e = a[u], n = a[u + 1], i = e[et] || null;
        if (typeof n == "function")
          i || Td(a);
        else if (i) {
          var f = null;
          if (n && n.hasAttribute("formAction")) {
            if (e = n, i = n[et] || null)
              f = i.formAction;
            else if (mc(e) !== null) continue;
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
  function rc(l) {
    this._internalRoot = l;
  }
  ti.prototype.render = rc.prototype.render = function(l) {
    var t = this._internalRoot;
    if (t === null) throw Error(v(409));
    var a = t.current, u = zt();
    md(a, u, l, t, null, null);
  }, ti.prototype.unmount = rc.prototype.unmount = function() {
    var l = this._internalRoot;
    if (l !== null) {
      this._internalRoot = null;
      var t = l.containerInfo;
      md(l.current, 2, null, l, null, null), qn(), t[eu] = null;
    }
  };
  function ti(l) {
    this._internalRoot = l;
  }
  ti.prototype.unstable_scheduleHydration = function(l) {
    if (l) {
      var t = Hc();
      l = { blockedOn: null, target: l, priority: t };
      for (var a = 0; a < Ca.length && t !== 0 && t < Ca[a].priority; a++) ;
      Ca.splice(a, 0, l), a === 0 && Ed(l);
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
  M.findDOMNode = function(l) {
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
    var ai = __REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!ai.isDisabled && ai.supportsFiber)
      try {
        Vu = ai.inject(
          em
        ), yt = ai;
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
    ), l[eu] = t.current, kf(l), new rc(t);
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
    ), t.context = yd(null), a = t.current, u = zt(), u = ni(u), e = ga(u), e.callback = null, ba(a, e, u), a = u, t.current.lanes = a, Ju(t, a), Lt(t), l[eu] = t.current, kf(l), new ti(t);
  }, Be.version = "19.2.0", Be;
}
var jd;
function mm() {
  if (jd) return gc.exports;
  jd = 1;
  function _() {
    if (!(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"))
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(_);
      } catch (q) {
        console.error(q);
      }
  }
  return _(), gc.exports = ym(), gc.exports;
}
var hm = mm(), Nl = Oc();
class Zu extends Error {
  constructor(q, R) {
    super(R), this.status = q, this.code = R;
  }
}
let Gd = "";
async function ut(_, q, R, v) {
  var O;
  const F = new AbortController();
  let W = !1;
  const Q = () => F.abort(R == null ? void 0 : R.reason);
  R != null && R.aborted ? Q() : R == null || R.addEventListener("abort", Q, { once: !0 });
  const cl = v === void 0 ? void 0 : setTimeout(() => {
    W = !0, F.abort();
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
    if (W) throw new Zu(0, "REQUEST_TIMEOUT");
    if (!b.ok) throw new Zu(b.status, ((O = G == null ? void 0 : G.error) == null ? void 0 : O.code) ?? `HTTP_${b.status}`);
    return G;
  } catch (b) {
    throw W ? new Zu(0, "REQUEST_TIMEOUT") : b;
  } finally {
    clearTimeout(cl), R == null || R.removeEventListener("abort", Q);
  }
}
async function rm() {
  const _ = await ut("auth/me");
  return Gd = _.csrf_token, _;
}
const Sm = { QUICK_LOGIN_DISABLED: "이 서버에서는 바로 로그인이 꺼져 있습니다.", QUICK_LOGIN_UNAVAILABLE: "공용 SIM 계정을 사용할 수 없습니다. 관리자에게 확인해 주세요.", RATE_LIMITED: "접속 요청이 많습니다. 잠시 후 다시 눌러 주세요.", UNAUTHENTICATED: "세션이 만료되었습니다. 다시 로그인해 주세요.", FORBIDDEN: "이 작업의 권한이 없습니다.", REVISION_CONFLICT: "다른 사용자가 수정했습니다. 최신 내용과 초안을 비교해 주세요.", ID_CONFLICT: "요청 번호가 이미 다른 내용으로 저장되어 있습니다.", INVALID_SELECTION: "등록되지 않은 구역이 포함되어 있습니다.", MAP_UNAVAILABLE: "지도 연결이 중단되었습니다.", INVALID_CONTRACT: "입력 형식이나 범위를 확인해 주세요.", ORIGIN_REJECTED: "허용된 HTTPS 주소로 접속해 주세요.", APPEARANCE_REQUIRED: "상의와 하의 색상을 입력해 주세요." };
function qd(_) {
  return _ instanceof Zu ? Sm[_.code] ?? _.code : _ instanceof Error ? _.message : "서버 연결을 확인해 주세요.";
}
const xd = "campus-04e1b46514574d45", Ac = { altitude_m: 30, speed_mps: 3, observation_seconds: 3, return_reserve_percent: 20, priority_mode: "UNIFORM" }, ui = [
  { id: "zone-106c8e3a7e32", name: "생활구역" },
  { id: "zone-0bb1b42ef9e7", name: "강의·연구구역" },
  { id: "zone-633e575ab1ca-c-89106-799958", name: "지원구역" }
];
function gm(_) {
  return !!_ && Object.entries(Ac).every(([q, R]) => _[q] === R);
}
function bm(_) {
  var q;
  return ((q = ui.find((R) => R.id === _.source_features.source_id)) == null ? void 0 : q.name) ?? _.source_features.name ?? _.source_features.source_id ?? _.region_id;
}
function Bd([_, q]) {
  const v = 0.0066943799901413165, F = 0.9996, W = q * Math.PI / 180, Q = (_ - 129) * Math.PI / 180, cl = v / (1 - v), O = Math.sin(W), b = Math.cos(W), G = Math.tan(W), C = 6378137 / Math.sqrt(1 - v * O * O), V = G * G, Sl = cl * b * b, sl = b * Q, Dl = 6378137 * ((1 - v / 4 - 3 * v ** 2 / 64 - 5 * v ** 3 / 256) * W - (3 * v / 8 + 3 * v ** 2 / 32 + 45 * v ** 3 / 1024) * Math.sin(2 * W) + (15 * v ** 2 / 256 + 45 * v ** 3 / 1024) * Math.sin(4 * W) - 35 * v ** 3 / 3072 * Math.sin(6 * W));
  return [5e5 + F * C * (sl + (1 - V + Sl) * sl ** 3 / 6 + (5 - 18 * V + V * V + 72 * Sl - 58 * cl) * sl ** 5 / 120), F * (Dl + C * G * (sl * sl / 2 + (5 - V + 9 * Sl + 4 * Sl * Sl) * sl ** 4 / 24 + (61 - 58 * V + V * V + 600 * Sl - 330 * cl) * sl ** 6 / 720))];
}
function Em(_) {
  var Ul;
  const q = (Ul = _.result) == null ? void 0 : Ul.execution;
  if (!q) return null;
  const R = Bd(q.originGeographic), F = (q.targetGeometry.type === "Polygon" ? [q.targetGeometry.coordinates] : q.targetGeometry.coordinates).flat().map((al) => al.map((Ol) => {
    const Tl = Bd(Ol);
    return [Tl[0] - R[0], Tl[1] - R[1]];
  })), W = q.legs.flatMap((al) => al.phases), Q = W.length ? [W[0].start, ...W.map((al) => al.end)] : [], cl = (al) => [al[1], al[0]], O = [Q.map(cl), q.ingressPath.map(cl), q.returnPath.map(cl)], b = [...F.flat(), ...O.flat()];
  if (!b.length) return null;
  const G = Math.min(...b.map((al) => al[0])), C = Math.max(...b.map((al) => al[0])), V = Math.min(...b.map((al) => al[1])), Sl = Math.max(...b.map((al) => al[1])), sl = Math.min(720 / Math.max(1, C - G), 480 / Math.max(1, Sl - V)), Dl = (al) => [40 + (al[0] - G) * sl, 520 - (al[1] - V) * sl], K = (al) => al.map((Ol, Tl) => `${Tl ? "L" : "M"}${Dl(Ol).map((lt) => lt.toFixed(2)).join(",")}`).join(" ");
  return { target: F.map((al) => K(al) + "Z").join(" "), route: K(O[0]), ingress: K(O[1]), returning: K(O[2]), entry: Dl(cl(q.entryNed)), finish: O[0].length ? Dl(O[0].at(-1)) : null };
}
const zm = { QUEUED: "계산 대기", RUNNING: "계산 중", READY: "경로 준비 완료", INCOMPLETE: "목표 또는 계산 한도 미달", FAILED: "계산 실패" }, Tm = { REGIONAL_SEARCH_CONDITIONS_MISMATCH: "저장된 임무 조건이 지역수색 프로파일과 다릅니다.", REGIONAL_SEARCH_INPUT_NOT_REGISTERED: "이 공간자료는 학교 서버의 지역수색 입력으로 등록되지 않았습니다.", REGIONAL_SEARCH_REGION_NOT_REGISTERED: "이 구역은 등록된 수색 입력에 없습니다.", REGION_REVISION_MISMATCH: "구역 개정이 변경되었습니다. 임무를 다시 불러와 주세요." }, Ye = (_) => _ instanceof Zu ? Tm[_.code] ?? qd(_) : qd(_), Yd = (_) => typeof _ == "number" && Number.isFinite(_) ? `${_.toFixed(1)}초` : "—";
function _m() {
  var Ml, sa, qa, tu, Lu, Yt, au;
  const [_, q] = Nl.useState(null), [R, v] = Nl.useState([]), [F, W] = Nl.useState(null), [Q, cl] = Nl.useState(""), [O, b] = Nl.useState(null), [G, C] = Nl.useState([]), [V, Sl] = Nl.useState(""), [sl, Dl] = Nl.useState(ui[0].id), [K, Ul] = Nl.useState(null), [al, Ol] = Nl.useState([]), [Tl, lt] = Nl.useState(!1), [zl, J] = Nl.useState(!0), [wl, xl] = Nl.useState(""), [Vt, tt] = Nl.useState(""), vl = Nl.useRef(0), jt = Nl.useRef(!1), gl = Nl.useRef(!0), Cl = O == null ? void 0 : O.mission, S = (Cl == null ? void 0 : Cl.draft_revision) ?? 0, M = !!(_ != null && _.permissions.some((D) => D.drone_id === ((Cl == null ? void 0 : Cl.drone_id) ?? "sim-pi-01") && D.scopes.includes("edit"))), x = !O || ((Ml = O.spatial_draft) == null ? void 0 : Ml.release_id) === xd, el = !O || gm((sa = O.spatial_draft) == null ? void 0 : sa.conditions), ul = !!K && ["QUEUED", "RUNNING"].includes(K.state);
  async function o(D = "") {
    const bl = await ut("mission-workspaces?limit=50&after=" + encodeURIComponent(D));
    gl.current && (v((Bl) => D ? [...Bl, ...bl.items] : bl.items), W(bl.next_cursor));
  }
  Nl.useEffect(() => (gl.current = !0, rm().then(async (D) => {
    if (!gl.current) return;
    q(D), await o();
    let bl = "";
    try {
      bl = sessionStorage.getItem("school-regional-last:" + D.user_id) ?? "";
    } catch {
    }
    gl.current && bl && await z(bl);
  }).catch((D) => {
    gl.current && xl(Ye(D));
  }).finally(() => {
    gl.current && J(!1);
  }), () => {
    gl.current = !1, vl.current++;
  }), []), Nl.useEffect(() => {
    if (!(!_ || zl))
      try {
        sessionStorage.setItem("school-regional-last:" + _.user_id, Q);
      } catch {
      }
  }, [_, Q, zl]);
  async function z(D, bl) {
    const Bl = ++vl.current;
    if (cl(D), b(null), C([]), Sl(""), Ul(null), Ol([]), xl(""), tt(""), J(!!D), !!D)
      try {
        const [Yl, Gt, Tt] = await Promise.all([ut(`missions/${D}/workspace`), ut(`missions/${D}/regions`), ut(`missions/${D}/regional-search`)]);
        if (!gl.current || Bl !== vl.current) return;
        const _t = Gt.filter((vt) => vt.mission_revision === Yl.mission.draft_revision), dt = _t.find((vt) => vt.region_id === bl) ?? _t[0];
        b(Yl), C(_t), Sl((dt == null ? void 0 : dt.region_id) ?? ""), Ol(Tt);
        const Vl = Tt.find((vt) => vt.mission_revision === Yl.mission.draft_revision && vt.region_id === (dt == null ? void 0 : dt.region_id));
        if (Vl) {
          const vt = await ut(`missions/${D}/regional-search/${Vl.job_id}`);
          gl.current && Bl === vl.current && Ul(vt);
        }
      } catch (Yl) {
        gl.current && Bl === vl.current && xl(Ye(Yl));
      } finally {
        gl.current && Bl === vl.current && J(!1);
      }
  }
  async function p(D) {
    const bl = ++vl.current;
    Sl(D), Ul(null), xl(""), tt("");
    const Bl = al.find((Yl) => Yl.mission_revision === S && Yl.region_id === D);
    if (Bl) {
      J(!0);
      try {
        const Yl = await ut(`missions/${Q}/regional-search/${Bl.job_id}`);
        gl.current && bl === vl.current && Ul(Yl);
      } catch (Yl) {
        gl.current && bl === vl.current && xl(Ye(Yl));
      } finally {
        gl.current && bl === vl.current && J(!1);
      }
    }
  }
  Nl.useEffect(() => {
    if (!K || !ul || !Q) return;
    let D = !1, bl;
    const Bl = new AbortController(), Yl = vl.current, Gt = K.job_id;
    async function Tt() {
      try {
        const _t = await ut(`missions/${Q}/regional-search/${Gt}`, void 0, Bl.signal, 1e4);
        !D && Yl === vl.current && (Ul(_t), xl(""));
      } catch (_t) {
        !D && Yl === vl.current && xl("계산 상태 조회 지연 · 계산을 다시 제출하지 않습니다. " + Ye(_t));
      } finally {
        D || (bl = setTimeout(Tt, 2e3));
      }
    }
    return bl = setTimeout(Tt, 1e3), () => {
      D = !0, Bl.abort(), clearTimeout(bl);
    };
  }, [K == null ? void 0 : K.job_id, ul, Q]);
  async function U(D) {
    if (!jt.current) {
      jt.current = !0, lt(!0), xl("");
      try {
        await D();
      } catch (bl) {
        gl.current && xl(Ye(bl));
      } finally {
        jt.current = !1, gl.current && lt(!1);
      }
    }
  }
  async function X() {
    var Tt, _t;
    if (!M || !x || !el || zl || ul) return;
    let D = Q, bl = S, Bl = V;
    if (!D) {
      D = crypto.randomUUID(), await ut("missions", { mission_id: D, drone_id: "sim-pi-01", environment: "SIM" }), cl(D), await ut(`missions/${D}/map-drafts`, { request_id: crypto.randomUUID(), expected_draft_revision: 0, release_id: xd, selected_zone_ids: [sl], name: `지역수색 ${(Tt = ui.find((uu) => uu.id === sl)) == null ? void 0 : Tt.name}`, mission_type: "AREA_RECON", conditions: { ...Ac, appearance: null } });
      const [dt, Vl] = await Promise.all([ut(`missions/${D}/workspace`), ut(`missions/${D}/regions`)]);
      bl = dt.mission.draft_revision ?? 0;
      const vt = Vl.filter((uu) => uu.mission_revision === bl);
      Bl = ((_t = vt[0]) == null ? void 0 : _t.region_id) ?? "", b(dt), C(vt), Sl(Bl), await o();
    }
    if (!Bl || !bl) throw new Error("저장된 구역이 없습니다. 임무를 다시 선택하거나 기본 임무 설정에서 저장해 주세요.");
    if ((await ut(`missions/${D}/workspace`)).mission.draft_revision !== bl) throw new Zu(409, "REVISION_CONFLICT");
    const Gt = await ut(`missions/${D}/regional-search`, { job_id: crypto.randomUUID(), mission_revision: bl, region_id: Bl });
    gl.current && (Ul(Gt), Ol((dt) => [Gt, ...dt]), tt("학교 서버에서 경로를 계산합니다. 창을 닫아도 계산 결과는 저장됩니다."));
  }
  async function $() {
    const D = O == null ? void 0 : O.spatial_draft;
    !D || !M || !x || (await ut(`missions/${Q}/map-drafts`, { request_id: crypto.randomUUID(), expected_draft_revision: S, release_id: D.release_id, selected_zone_ids: D.selected_zone_ids, name: D.name, mission_type: D.mission_type, conditions: { ...D.conditions, ...Ac } }), await z(Q), tt("지역수색 조건으로 새 개정을 저장했습니다. 경로를 준비해 주세요."));
  }
  const B = K == null ? void 0 : K.result, yl = K ? Em(K) : null;
  return /* @__PURE__ */ A.jsxs("div", { className: "school-regional-content", children: [
    /* @__PURE__ */ A.jsxs("aside", { children: [
      /* @__PURE__ */ A.jsx("p", { className: "sr-eyebrow", children: "기존 알고리즘 · 목표 관측률 95%" }),
      /* @__PURE__ */ A.jsx("h3", { children: "수색 경로 준비" }),
      /* @__PURE__ */ A.jsx("p", { children: "저장된 의미구역을 선택하면 학교 서버에서 경로와 예상 관측 성능을 계산합니다." }),
      /* @__PURE__ */ A.jsxs("label", { children: [
        "수색할 서버 임무",
        /* @__PURE__ */ A.jsxs("select", { value: Q, disabled: Tl || zl, onChange: (D) => void z(D.target.value), children: [
          /* @__PURE__ */ A.jsx("option", { value: "", children: "새 지역수색 임무" }),
          Q && !R.some((D) => D.mission_id === Q) && /* @__PURE__ */ A.jsx("option", { value: Q, children: ((qa = O == null ? void 0 : O.presentation) == null ? void 0 : qa.name) ?? (Cl == null ? void 0 : Cl.name) ?? Q.slice(0, 8) }),
          R.map((D) => /* @__PURE__ */ A.jsx("option", { value: D.mission_id, children: D.name ?? D.mission_id.slice(0, 8) }, D.mission_id))
        ] })
      ] }),
      /* @__PURE__ */ A.jsxs("div", { className: "sr-actions", children: [
        /* @__PURE__ */ A.jsx("button", { disabled: Tl || zl, onClick: () => void U(async () => {
          await o(), Q && await z(Q, V);
        }), children: "목록·상태 갱신" }),
        F && /* @__PURE__ */ A.jsx("button", { disabled: Tl || zl, onClick: () => void U(() => o(F)), children: "임무 더 보기" })
      ] }),
      Q ? /* @__PURE__ */ A.jsxs("label", { children: [
        "저장 개정 ",
        S || "—",
        "의 수색 구역",
        /* @__PURE__ */ A.jsxs("select", { value: V, disabled: Tl || zl, onChange: (D) => void p(D.target.value), children: [
          !G.length && /* @__PURE__ */ A.jsx("option", { value: "", children: "저장된 구역 없음" }),
          G.map((D) => /* @__PURE__ */ A.jsx("option", { value: D.region_id, children: bm(D) }, D.region_id))
        ] })
      ] }) : /* @__PURE__ */ A.jsxs("label", { children: [
        "수색 구역",
        /* @__PURE__ */ A.jsx("select", { value: sl, disabled: Tl, onChange: (D) => Dl(D.target.value), children: ui.map((D) => /* @__PURE__ */ A.jsx("option", { value: D.id, children: D.name }, D.id)) })
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
      !x && /* @__PURE__ */ A.jsx("p", { className: "sr-warning", children: "현재 입력은 캠퍼스 자료만 지원합니다. 이 임무의 공간자료는 변경하지 않았습니다." }),
      x && !el && /* @__PURE__ */ A.jsxs("div", { className: "sr-warning", children: [
        /* @__PURE__ */ A.jsx("p", { children: "저장 조건이 지역수색과 다릅니다. 구역·이름·수색 유형을 유지하고 위 조건으로 새 개정을 저장할 수 있습니다. 기존 승인과 계획은 새 개정에 적용되지 않습니다." }),
        /* @__PURE__ */ A.jsx("button", { disabled: Tl || zl || !M, onClick: () => void U($), children: "지역수색 조건으로 새 개정 저장" })
      ] }),
      !M && !zl && /* @__PURE__ */ A.jsx("p", { children: "선택 기체의 임무 편집 권한이 필요합니다." }),
      /* @__PURE__ */ A.jsx("button", { className: "sr-primary", disabled: Tl || zl || ul || !M || !x || !el || !!Q && !V, onClick: () => void U(X), children: ul ? "경로 계산 중…" : K ? "경로 다시 계산" : "경로 준비" }),
      /* @__PURE__ */ A.jsx("p", { className: "sr-note", children: "경로 준비는 이륙·비행·임무 승인을 실행하지 않습니다. 실제 관측 기록도 증가하지 않습니다. 기본 화면의 미저장 초안은 먼저 저장해 주세요." }),
      zl && /* @__PURE__ */ A.jsx("p", { role: "status", children: "서버 임무를 확인하고 있습니다." }),
      Vt && /* @__PURE__ */ A.jsx("p", { role: "status", children: (K == null ? void 0 : K.state) === "READY" ? "계산 결과를 저장했습니다. 창을 다시 열면 마지막 임무를 불러옵니다." : Vt }),
      wl && /* @__PURE__ */ A.jsx("p", { role: "alert", className: "sr-warning", children: wl })
    ] }),
    /* @__PURE__ */ A.jsxs("article", { children: [
      /* @__PURE__ */ A.jsxs("div", { className: "sr-result-title", children: [
        /* @__PURE__ */ A.jsx("h3", { children: K ? zm[K.state] ?? K.state : "계획 경로 미리보기" }),
        /* @__PURE__ */ A.jsx("span", { children: "예측 결과" })
      ] }),
      /* @__PURE__ */ A.jsxs("dl", { className: "sr-metrics", children: [
        /* @__PURE__ */ A.jsxs("div", { children: [
          /* @__PURE__ */ A.jsx("dt", { children: "준비 계산" }),
          /* @__PURE__ */ A.jsx("dd", { children: Yd(B == null ? void 0 : B.preparationSeconds) })
        ] }),
        /* @__PURE__ */ A.jsxs("div", { children: [
          /* @__PURE__ */ A.jsx("dt", { children: "예상 95% 도달" }),
          /* @__PURE__ */ A.jsx("dd", { children: Yd((tu = B == null ? void 0 : B.plan) == null ? void 0 : tu.predictedFirstTargetSeconds) })
        ] }),
        /* @__PURE__ */ A.jsxs("div", { children: [
          /* @__PURE__ */ A.jsx("dt", { children: "예상 최종 관측률" }),
          /* @__PURE__ */ A.jsxs("dd", { children: [
            ((Yt = (Lu = B == null ? void 0 : B.plan) == null ? void 0 : Lu.predictedPercent) == null ? void 0 : Yt.toFixed(2)) ?? "—",
            ((au = B == null ? void 0 : B.plan) == null ? void 0 : au.predictedPercent) !== void 0 ? "%" : ""
          ] })
        ] }),
        /* @__PURE__ */ A.jsxs("div", { children: [
          /* @__PURE__ */ A.jsx("dt", { children: "수색 대상 면적" }),
          /* @__PURE__ */ A.jsx("dd", { children: (B == null ? void 0 : B.targetAreaM2) === void 0 ? "—" : (B.targetAreaM2 / 1e4).toFixed(2) + " ha" })
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
      (K == null ? void 0 : K.state) === "INCOMPLETE" && /* @__PURE__ */ A.jsx("p", { className: "sr-warning", children: "목표 관측률 또는 준비 계산 한도를 충족하지 못했습니다. 준비 완료 계획으로 취급하지 않습니다." }),
      (B == null ? void 0 : B.reason) && /* @__PURE__ */ A.jsx("p", { className: "sr-warning", children: B.reason }),
      K && /* @__PURE__ */ A.jsxs("details", { children: [
        /* @__PURE__ */ A.jsx("summary", { children: "계획 식별 정보" }),
        /* @__PURE__ */ A.jsxs("p", { children: [
          "작업 ",
          K.job_id,
          /* @__PURE__ */ A.jsx("br", {}),
          "임무 개정 ",
          K.mission_revision,
          /* @__PURE__ */ A.jsx("br", {}),
          "계획 ",
          K.plan_id ?? "계산 중",
          /* @__PURE__ */ A.jsx("br", {}),
          "입력 ",
          (B == null ? void 0 : B.packageId) ?? "확인 중"
        ] })
      ] })
    ] })
  ] });
}
function Am() {
  const [_, q] = Nl.useState(!1), R = Nl.useRef(null);
  return Nl.useEffect(() => {
    var v, F, W;
    _ && !((v = R.current) != null && v.open) ? (F = R.current) == null || F.showModal() : !_ && ((W = R.current) != null && W.open) && R.current.close();
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
let lu = null;
function Qd() {
  const _ = document.querySelector(".school-app .sim-header");
  if (lu && lu.header !== _ && (lu.root.unmount(), lu.host.remove(), lu = null), !_ || lu || _.querySelector(".school-regional-entry")) return;
  const q = document.createElement("div");
  q.className = "school-regional-extension", q.style.display = "contents", _.insertBefore(q, _.querySelector(".map-environment-switch"));
  const R = hm.createRoot(q);
  lu = { header: _, host: q, root: R }, R.render(/* @__PURE__ */ A.jsx(Am, {}));
}
let _c = !1;
const Om = new MutationObserver(() => {
  _c || (_c = !0, queueMicrotask(() => {
    _c = !1, Qd();
  }));
});
Om.observe(document.documentElement, { childList: !0, subtree: !0 });
Qd();
export {
  Qd as syncRegionalEntry
};
