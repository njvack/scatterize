(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/papaparse/papaparse.min.js
  var require_papaparse_min = __commonJS({
    "node_modules/papaparse/papaparse.min.js"(exports, module) {
      ((e, t) => {
        "function" == typeof define && define.amd ? define([], t) : "object" == typeof module && "undefined" != typeof exports ? module.exports = t() : e.Papa = t();
      })(exports, function r() {
        var n = "undefined" != typeof self ? self : "undefined" != typeof window ? window : void 0 !== n ? n : {};
        var d, s = !n.document && !!n.postMessage, a = n.IS_PAPA_WORKER || false, o = {}, h = 0, v2 = {};
        function u4(e) {
          this._handle = null, this._finished = false, this._completed = false, this._halted = false, this._input = null, this._baseIndex = 0, this._partialLine = "", this._rowCount = 0, this._start = 0, this._nextChunk = null, this.isFirstChunk = true, this._completeResults = { data: [], errors: [], meta: {} }, function(e3) {
            var t = b(e3);
            t.chunkSize = parseInt(t.chunkSize), e3.step || e3.chunk || (t.chunkSize = null);
            this._handle = new i(t), (this._handle.streamer = this)._config = t;
          }.call(this, e), this.parseChunk = function(t, e3) {
            var i2 = parseInt(this._config.skipFirstNLines) || 0;
            if (this.isFirstChunk && 0 < i2) {
              let e4 = this._config.newline;
              e4 || (r2 = this._config.quoteChar || '"', e4 = this._handle.guessLineEndings(t, r2)), t = [...t.split(e4).slice(i2)].join(e4);
            }
            this.isFirstChunk && U(this._config.beforeFirstChunk) && void 0 !== (r2 = this._config.beforeFirstChunk(t)) && (t = r2), this.isFirstChunk = false, this._halted = false;
            var i2 = this._partialLine + t, r2 = (this._partialLine = "", this._handle.parse(i2, this._baseIndex, !this._finished));
            if (!this._handle.paused() && !this._handle.aborted()) {
              t = r2.meta.cursor, i2 = (this._finished || (this._partialLine = i2.substring(t - this._baseIndex), this._baseIndex = t), r2 && r2.data && (this._rowCount += r2.data.length), this._finished || this._config.preview && this._rowCount >= this._config.preview);
              if (a) n.postMessage({ results: r2, workerId: v2.WORKER_ID, finished: i2 });
              else if (U(this._config.chunk) && !e3) {
                if (this._config.chunk(r2, this._handle), this._handle.paused() || this._handle.aborted()) return void (this._halted = true);
                this._completeResults = r2 = void 0;
              }
              return this._config.step || this._config.chunk || (this._completeResults.data = this._completeResults.data.concat(r2.data), this._completeResults.errors = this._completeResults.errors.concat(r2.errors), this._completeResults.meta = r2.meta), this._completed || !i2 || !U(this._config.complete) || r2 && r2.meta.aborted || (this._config.complete(this._completeResults, this._input), this._completed = true), i2 || r2 && r2.meta.paused || this._nextChunk(), r2;
            }
            this._halted = true;
          }, this._sendError = function(e3) {
            U(this._config.error) ? this._config.error(e3) : a && this._config.error && n.postMessage({ workerId: v2.WORKER_ID, error: e3, finished: false });
          };
        }
        function f(e) {
          var r2;
          (e = e || {}).chunkSize || (e.chunkSize = v2.RemoteChunkSize), u4.call(this, e), this._nextChunk = s ? function() {
            this._readChunk(), this._chunkLoaded();
          } : function() {
            this._readChunk();
          }, this.stream = function(e3) {
            this._input = e3, this._nextChunk();
          }, this._readChunk = function() {
            if (this._finished) this._chunkLoaded();
            else {
              if (r2 = new XMLHttpRequest(), this._config.withCredentials && (r2.withCredentials = this._config.withCredentials), s || (r2.onload = y2(this._chunkLoaded, this), r2.onerror = y2(this._chunkError, this)), r2.open(this._config.downloadRequestBody ? "POST" : "GET", this._input, !s), this._config.downloadRequestHeaders) {
                var e3, t = this._config.downloadRequestHeaders;
                for (e3 in t) r2.setRequestHeader(e3, t[e3]);
              }
              var i2;
              this._config.chunkSize && (i2 = this._start + this._config.chunkSize - 1, r2.setRequestHeader("Range", "bytes=" + this._start + "-" + i2));
              try {
                r2.send(this._config.downloadRequestBody);
              } catch (e4) {
                this._chunkError(e4.message);
              }
              s && 0 === r2.status && this._chunkError();
            }
          }, this._chunkLoaded = function() {
            4 === r2.readyState && (r2.status < 200 || 400 <= r2.status ? this._chunkError() : (this._start += this._config.chunkSize || r2.responseText.length, this._finished = !this._config.chunkSize || this._start >= ((e3) => null !== (e3 = e3.getResponseHeader("Content-Range")) ? parseInt(e3.substring(e3.lastIndexOf("/") + 1)) : -1)(r2), this.parseChunk(r2.responseText)));
          }, this._chunkError = function(e3) {
            e3 = r2.statusText || e3;
            this._sendError(new Error(e3));
          };
        }
        function l(e) {
          (e = e || {}).chunkSize || (e.chunkSize = v2.LocalChunkSize), u4.call(this, e);
          var i2, r2, n2 = "undefined" != typeof FileReader;
          this.stream = function(e3) {
            this._input = e3, r2 = e3.slice || e3.webkitSlice || e3.mozSlice, n2 ? ((i2 = new FileReader()).onload = y2(this._chunkLoaded, this), i2.onerror = y2(this._chunkError, this)) : i2 = new FileReaderSync(), this._nextChunk();
          }, this._nextChunk = function() {
            this._finished || this._config.preview && !(this._rowCount < this._config.preview) || this._readChunk();
          }, this._readChunk = function() {
            var e3 = this._input, t = (this._config.chunkSize && (t = Math.min(this._start + this._config.chunkSize, this._input.size), e3 = r2.call(e3, this._start, t)), i2.readAsText(e3, this._config.encoding));
            n2 || this._chunkLoaded({ target: { result: t } });
          }, this._chunkLoaded = function(e3) {
            this._start += this._config.chunkSize, this._finished = !this._config.chunkSize || this._start >= this._input.size, this.parseChunk(e3.target.result);
          }, this._chunkError = function() {
            this._sendError(i2.error);
          };
        }
        function c(e) {
          var i2;
          u4.call(this, e = e || {}), this.stream = function(e3) {
            return i2 = e3, this._nextChunk();
          }, this._nextChunk = function() {
            var e3, t;
            if (!this._finished) return e3 = this._config.chunkSize, i2 = e3 ? (t = i2.substring(0, e3), i2.substring(e3)) : (t = i2, ""), this._finished = !i2, this.parseChunk(t);
          };
        }
        function p(e) {
          u4.call(this, e = e || {});
          var t = [], i2 = true, r2 = false;
          this.pause = function() {
            u4.prototype.pause.apply(this, arguments), this._input.pause();
          }, this.resume = function() {
            u4.prototype.resume.apply(this, arguments), this._input.resume();
          }, this.stream = function(e3) {
            this._input = e3, this._input.on("data", this._streamData), this._input.on("end", this._streamEnd), this._input.on("error", this._streamError);
          }, this._checkIsFinished = function() {
            r2 && 1 === t.length && (this._finished = true);
          }, this._nextChunk = function() {
            this._checkIsFinished(), t.length ? this.parseChunk(t.shift()) : i2 = true;
          }, this._streamData = y2(function(e3) {
            try {
              t.push("string" == typeof e3 ? e3 : e3.toString(this._config.encoding)), i2 && (i2 = false, this._checkIsFinished(), this.parseChunk(t.shift()));
            } catch (e4) {
              this._streamError(e4);
            }
          }, this), this._streamError = y2(function(e3) {
            this._streamCleanUp(), this._sendError(e3);
          }, this), this._streamEnd = y2(function() {
            this._streamCleanUp(), r2 = true, this._streamData("");
          }, this), this._streamCleanUp = y2(function() {
            this._input.removeListener("data", this._streamData), this._input.removeListener("end", this._streamEnd), this._input.removeListener("error", this._streamError);
          }, this);
        }
        function i(m2) {
          var n2, s2, a2, t, o2 = Math.pow(2, 53), h2 = -o2, u5 = /^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/, d2 = /^((\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)))$/, i2 = this, r2 = 0, f2 = 0, l2 = false, e = false, c2 = [], p2 = { data: [], errors: [], meta: {} };
          function y3(e3) {
            return "greedy" === m2.skipEmptyLines ? "" === e3.join("").trim() : 1 === e3.length && 0 === e3[0].length;
          }
          function g2() {
            if (p2 && a2 && (k("Delimiter", "UndetectableDelimiter", "Unable to auto-detect delimiting character; defaulted to '" + v2.DefaultDelimiter + "'"), a2 = false), m2.skipEmptyLines && (p2.data = p2.data.filter(function(e4) {
              return !y3(e4);
            })), _2()) {
              let t3 = function(e4, t4) {
                U(m2.transformHeader) && (e4 = m2.transformHeader(e4, t4)), c2.push(e4);
              };
              var t2 = t3;
              if (p2) if (Array.isArray(p2.data[0])) {
                for (var e3 = 0; _2() && e3 < p2.data.length; e3++) p2.data[e3].forEach(t3);
                p2.data.splice(0, 1);
              } else p2.data.forEach(t3);
            }
            function i3(e4, t3) {
              for (var i4 = m2.header ? {} : [], r4 = 0; r4 < e4.length; r4++) {
                var n3 = r4, s3 = e4[r4], s3 = ((e6, t4) => ((e7) => (m2.dynamicTypingFunction && void 0 === m2.dynamicTyping[e7] && (m2.dynamicTyping[e7] = m2.dynamicTypingFunction(e7)), true === (m2.dynamicTyping[e7] || m2.dynamicTyping)))(e6) ? "true" === t4 || "TRUE" === t4 || "false" !== t4 && "FALSE" !== t4 && (((e7) => {
                  if (u5.test(e7)) {
                    e7 = parseFloat(e7);
                    if (h2 < e7 && e7 < o2) return 1;
                  }
                })(t4) ? parseFloat(t4) : d2.test(t4) ? new Date(t4) : "" === t4 ? null : t4) : t4)(n3 = m2.header ? r4 >= c2.length ? "__parsed_extra" : c2[r4] : n3, s3 = m2.transform ? m2.transform(s3, n3) : s3);
                "__parsed_extra" === n3 ? (i4[n3] = i4[n3] || [], i4[n3].push(s3)) : i4[n3] = s3;
              }
              return m2.header && (r4 > c2.length ? k("FieldMismatch", "TooManyFields", "Too many fields: expected " + c2.length + " fields but parsed " + r4, f2 + t3) : r4 < c2.length && k("FieldMismatch", "TooFewFields", "Too few fields: expected " + c2.length + " fields but parsed " + r4, f2 + t3)), i4;
            }
            var r3;
            p2 && (m2.header || m2.dynamicTyping || m2.transform) && (r3 = 1, !p2.data.length || Array.isArray(p2.data[0]) ? (p2.data = p2.data.map(i3), r3 = p2.data.length) : p2.data = i3(p2.data, 0), m2.header && p2.meta && (p2.meta.fields = c2), f2 += r3);
          }
          function _2() {
            return m2.header && 0 === c2.length;
          }
          function k(e3, t2, i3, r3) {
            e3 = { type: e3, code: t2, message: i3 };
            void 0 !== r3 && (e3.row = r3), p2.errors.push(e3);
          }
          U(m2.step) && (t = m2.step, m2.step = function(e3) {
            p2 = e3, _2() ? g2() : (g2(), 0 !== p2.data.length && (r2 += e3.data.length, m2.preview && r2 > m2.preview ? s2.abort() : (p2.data = p2.data[0], t(p2, i2))));
          }), this.parse = function(e3, t2, i3) {
            var r3 = m2.quoteChar || '"', r3 = (m2.newline || (m2.newline = this.guessLineEndings(e3, r3)), a2 = false, m2.delimiter ? U(m2.delimiter) && (m2.delimiter = m2.delimiter(e3), p2.meta.delimiter = m2.delimiter) : ((r3 = ((e4, t3, i4, r4, n3) => {
              var s3, a3, o3, h3;
              n3 = n3 || [",", "	", "|", ";", v2.RECORD_SEP, v2.UNIT_SEP];
              for (var u6 = 0; u6 < n3.length; u6++) {
                for (var d3, f3 = n3[u6], l3 = 0, c3 = 0, p3 = 0, g3 = (o3 = void 0, new E({ comments: r4, delimiter: f3, newline: t3, preview: 10 }).parse(e4)), _3 = 0; _3 < g3.data.length; _3++) i4 && y3(g3.data[_3]) ? p3++ : (d3 = g3.data[_3].length, c3 += d3, void 0 === o3 ? o3 = d3 : 0 < d3 && (l3 += Math.abs(d3 - o3), o3 = d3));
                0 < g3.data.length && (c3 /= g3.data.length - p3), (void 0 === a3 || l3 <= a3) && (void 0 === h3 || h3 < c3) && 1.99 < c3 && (a3 = l3, s3 = f3, h3 = c3);
              }
              return { successful: !!(m2.delimiter = s3), bestDelimiter: s3 };
            })(e3, m2.newline, m2.skipEmptyLines, m2.comments, m2.delimitersToGuess)).successful ? m2.delimiter = r3.bestDelimiter : (a2 = true, m2.delimiter = v2.DefaultDelimiter), p2.meta.delimiter = m2.delimiter), b(m2));
            return m2.preview && m2.header && r3.preview++, n2 = e3, s2 = new E(r3), p2 = s2.parse(n2, t2, i3), g2(), l2 ? { meta: { paused: true } } : p2 || { meta: { paused: false } };
          }, this.paused = function() {
            return l2;
          }, this.pause = function() {
            l2 = true, s2.abort(), n2 = U(m2.chunk) ? "" : n2.substring(s2.getCharIndex());
          }, this.resume = function() {
            i2.streamer._halted ? (l2 = false, i2.streamer.parseChunk(n2, true)) : setTimeout(i2.resume, 3);
          }, this.aborted = function() {
            return e;
          }, this.abort = function() {
            e = true, s2.abort(), p2.meta.aborted = true, U(m2.complete) && m2.complete(p2), n2 = "";
          }, this.guessLineEndings = function(e3, t2) {
            e3 = e3.substring(0, 1048576);
            var t2 = new RegExp(P(t2) + "([^]*?)" + P(t2), "gm"), i3 = (e3 = e3.replace(t2, "")).split("\r"), t2 = e3.split("\n"), e3 = 1 < t2.length && t2[0].length < i3[0].length;
            if (1 === i3.length || e3) return "\n";
            for (var r3 = 0, n3 = 0; n3 < i3.length; n3++) "\n" === i3[n3][0] && r3++;
            return r3 >= i3.length / 2 ? "\r\n" : "\r";
          };
        }
        function P(e) {
          return e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }
        function E(C) {
          var S = (C = C || {}).delimiter, O = C.newline, x2 = C.comments, I = C.step, A = C.preview, T = C.fastMode, D2 = null, L = false, F = null == C.quoteChar ? '"' : C.quoteChar, j = F;
          if (void 0 !== C.escapeChar && (j = C.escapeChar), ("string" != typeof S || -1 < v2.BAD_DELIMITERS.indexOf(S)) && (S = ","), x2 === S) throw new Error("Comment character same as delimiter");
          true === x2 ? x2 = "#" : ("string" != typeof x2 || -1 < v2.BAD_DELIMITERS.indexOf(x2)) && (x2 = false), "\n" !== O && "\r" !== O && "\r\n" !== O && (O = "\n");
          var z = 0, M = false;
          this.parse = function(i2, t, r2) {
            if ("string" != typeof i2) throw new Error("Input must be a string");
            var n2 = i2.length, e = S.length, s2 = O.length, a2 = x2.length, o2 = U(I), h2 = [], u5 = [], d2 = [], f2 = z = 0;
            if (!i2) return w();
            if (T || false !== T && -1 === i2.indexOf(F)) {
              for (var l2 = i2.split(O), c2 = 0; c2 < l2.length; c2++) {
                if (d2 = l2[c2], z += d2.length, c2 !== l2.length - 1) z += O.length;
                else if (r2) return w();
                if (!x2 || d2.substring(0, a2) !== x2) {
                  if (o2) {
                    if (h2 = [], k(d2.split(S)), R(), M) return w();
                  } else k(d2.split(S));
                  if (A && A <= c2) return h2 = h2.slice(0, A), w(true);
                }
              }
              return w();
            }
            for (var p2 = i2.indexOf(S, z), g2 = i2.indexOf(O, z), _2 = new RegExp(P(j) + P(F), "g"), m2 = i2.indexOf(F, z); ; ) if (i2[z] === F) for (m2 = z, z++; ; ) {
              if (-1 === (m2 = i2.indexOf(F, m2 + 1))) return r2 || u5.push({ type: "Quotes", code: "MissingQuotes", message: "Quoted field unterminated", row: h2.length, index: z }), E2();
              if (m2 === n2 - 1) return E2(i2.substring(z, m2).replace(_2, F));
              if (F === j && i2[m2 + 1] === j) m2++;
              else if (F === j || 0 === m2 || i2[m2 - 1] !== j) {
                -1 !== p2 && p2 < m2 + 1 && (p2 = i2.indexOf(S, m2 + 1));
                var y3 = v3(-1 === (g2 = -1 !== g2 && g2 < m2 + 1 ? i2.indexOf(O, m2 + 1) : g2) ? p2 : Math.min(p2, g2));
                if (i2.substr(m2 + 1 + y3, e) === S) {
                  d2.push(i2.substring(z, m2).replace(_2, F)), i2[z = m2 + 1 + y3 + e] !== F && (m2 = i2.indexOf(F, z)), p2 = i2.indexOf(S, z), g2 = i2.indexOf(O, z);
                  break;
                }
                y3 = v3(g2);
                if (i2.substring(m2 + 1 + y3, m2 + 1 + y3 + s2) === O) {
                  if (d2.push(i2.substring(z, m2).replace(_2, F)), b2(m2 + 1 + y3 + s2), p2 = i2.indexOf(S, z), m2 = i2.indexOf(F, z), o2 && (R(), M)) return w();
                  if (A && h2.length >= A) return w(true);
                  break;
                }
                u5.push({ type: "Quotes", code: "InvalidQuotes", message: "Trailing quote on quoted field is malformed", row: h2.length, index: z }), m2++;
              }
            }
            else if (x2 && 0 === d2.length && i2.substring(z, z + a2) === x2) {
              if (-1 === g2) return w();
              z = g2 + s2, g2 = i2.indexOf(O, z), p2 = i2.indexOf(S, z);
            } else if (-1 !== p2 && (p2 < g2 || -1 === g2)) d2.push(i2.substring(z, p2)), z = p2 + e, p2 = i2.indexOf(S, z);
            else {
              if (-1 === g2) break;
              if (d2.push(i2.substring(z, g2)), b2(g2 + s2), o2 && (R(), M)) return w();
              if (A && h2.length >= A) return w(true);
            }
            return E2();
            function k(e3) {
              h2.push(e3), f2 = z;
            }
            function v3(e3) {
              var t2 = 0;
              return t2 = -1 !== e3 && (e3 = i2.substring(m2 + 1, e3)) && "" === e3.trim() ? e3.length : t2;
            }
            function E2(e3) {
              return r2 || (void 0 === e3 && (e3 = i2.substring(z)), d2.push(e3), z = n2, k(d2), o2 && R()), w();
            }
            function b2(e3) {
              z = e3, k(d2), d2 = [], g2 = i2.indexOf(O, z);
            }
            function w(e3) {
              if (C.header && !t && h2.length && !L) {
                var s3 = h2[0], a3 = /* @__PURE__ */ Object.create(null), o3 = new Set(s3);
                let n3 = false;
                for (let r3 = 0; r3 < s3.length; r3++) {
                  let i3 = s3[r3];
                  if (a3[i3 = U(C.transformHeader) ? C.transformHeader(i3, r3) : i3]) {
                    let e4, t2 = a3[i3];
                    for (; e4 = i3 + "_" + t2, t2++, o3.has(e4); ) ;
                    o3.add(e4), s3[r3] = e4, a3[i3]++, n3 = true, (D2 = null === D2 ? {} : D2)[e4] = i3;
                  } else a3[i3] = 1, s3[r3] = i3;
                  o3.add(i3);
                }
                n3 && console.warn("Duplicate headers found and renamed."), L = true;
              }
              return { data: h2, errors: u5, meta: { delimiter: S, linebreak: O, aborted: M, truncated: !!e3, cursor: f2 + (t || 0), renamedHeaders: D2 } };
            }
            function R() {
              I(w()), h2 = [], u5 = [];
            }
          }, this.abort = function() {
            M = true;
          }, this.getCharIndex = function() {
            return z;
          };
        }
        function g(e) {
          var t = e.data, i2 = o[t.workerId], r2 = false;
          if (t.error) i2.userError(t.error, t.file);
          else if (t.results && t.results.data) {
            var n2 = { abort: function() {
              r2 = true, _(t.workerId, { data: [], errors: [], meta: { aborted: true } });
            }, pause: m, resume: m };
            if (U(i2.userStep)) {
              for (var s2 = 0; s2 < t.results.data.length && (i2.userStep({ data: t.results.data[s2], errors: t.results.errors, meta: t.results.meta }, n2), !r2); s2++) ;
              delete t.results;
            } else U(i2.userChunk) && (i2.userChunk(t.results, n2, t.file), delete t.results);
          }
          t.finished && !r2 && _(t.workerId, t.results);
        }
        function _(e, t) {
          var i2 = o[e];
          U(i2.userComplete) && i2.userComplete(t), i2.terminate(), delete o[e];
        }
        function m() {
          throw new Error("Not implemented.");
        }
        function b(e) {
          if ("object" != typeof e || null === e) return e;
          var t, i2 = Array.isArray(e) ? [] : {};
          for (t in e) i2[t] = b(e[t]);
          return i2;
        }
        function y2(e, t) {
          return function() {
            e.apply(t, arguments);
          };
        }
        function U(e) {
          return "function" == typeof e;
        }
        return v2.parse = function(e, t) {
          var i2 = (t = t || {}).dynamicTyping || false;
          U(i2) && (t.dynamicTypingFunction = i2, i2 = {});
          if (t.dynamicTyping = i2, t.transform = !!U(t.transform) && t.transform, !t.worker || !v2.WORKERS_SUPPORTED) return i2 = null, v2.NODE_STREAM_INPUT, "string" == typeof e ? (e = ((e3) => 65279 !== e3.charCodeAt(0) ? e3 : e3.slice(1))(e), i2 = new (t.download ? f : c)(t)) : true === e.readable && U(e.read) && U(e.on) ? i2 = new p(t) : (n.File && e instanceof File || e instanceof Object) && (i2 = new l(t)), i2.stream(e);
          (i2 = (() => {
            var e3;
            return !!v2.WORKERS_SUPPORTED && (e3 = (() => {
              var e4 = n.URL || n.webkitURL || null, t2 = r.toString();
              return v2.BLOB_URL || (v2.BLOB_URL = e4.createObjectURL(new Blob(["var global = (function() { if (typeof self !== 'undefined') { return self; } if (typeof window !== 'undefined') { return window; } if (typeof global !== 'undefined') { return global; } return {}; })(); global.IS_PAPA_WORKER=true; ", "(", t2, ")();"], { type: "text/javascript" })));
            })(), (e3 = new n.Worker(e3)).onmessage = g, e3.id = h++, o[e3.id] = e3);
          })()).userStep = t.step, i2.userChunk = t.chunk, i2.userComplete = t.complete, i2.userError = t.error, t.step = U(t.step), t.chunk = U(t.chunk), t.complete = U(t.complete), t.error = U(t.error), delete t.worker, i2.postMessage({ input: e, config: t, workerId: i2.id });
        }, v2.unparse = function(e, t) {
          var n2 = false, _2 = true, m2 = ",", y3 = "\r\n", s2 = '"', a2 = s2 + s2, i2 = false, r2 = null, o2 = false, h2 = ((() => {
            if ("object" == typeof t) {
              if ("string" != typeof t.delimiter || v2.BAD_DELIMITERS.filter(function(e3) {
                return -1 !== t.delimiter.indexOf(e3);
              }).length || (m2 = t.delimiter), "boolean" != typeof t.quotes && "function" != typeof t.quotes && !Array.isArray(t.quotes) || (n2 = t.quotes), "boolean" != typeof t.skipEmptyLines && "string" != typeof t.skipEmptyLines || (i2 = t.skipEmptyLines), "string" == typeof t.newline && (y3 = t.newline), "string" == typeof t.quoteChar && (s2 = t.quoteChar), "boolean" == typeof t.header && (_2 = t.header), Array.isArray(t.columns)) {
                if (0 === t.columns.length) throw new Error("Option columns is empty");
                r2 = t.columns;
              }
              void 0 !== t.escapeChar && (a2 = t.escapeChar + s2), t.escapeFormulae instanceof RegExp ? o2 = t.escapeFormulae : "boolean" == typeof t.escapeFormulae && t.escapeFormulae && (o2 = /^[=+\-@\t\r].*$/);
            }
          })(), new RegExp(P(s2), "g"));
          "string" == typeof e && (e = JSON.parse(e));
          if (Array.isArray(e)) {
            if (!e.length || Array.isArray(e[0])) return u5(null, e, i2);
            if ("object" == typeof e[0]) return u5(r2 || Object.keys(e[0]), e, i2);
          } else if ("object" == typeof e) return "string" == typeof e.data && (e.data = JSON.parse(e.data)), Array.isArray(e.data) && (e.fields || (e.fields = e.meta && e.meta.fields || r2), e.fields || (e.fields = Array.isArray(e.data[0]) ? e.fields : "object" == typeof e.data[0] ? Object.keys(e.data[0]) : []), Array.isArray(e.data[0]) || "object" == typeof e.data[0] || (e.data = [e.data])), u5(e.fields || [], e.data || [], i2);
          throw new Error("Unable to serialize unrecognized input");
          function u5(e3, t2, i3) {
            var r3 = "", n3 = ("string" == typeof e3 && (e3 = JSON.parse(e3)), "string" == typeof t2 && (t2 = JSON.parse(t2)), Array.isArray(e3) && 0 < e3.length), s3 = !Array.isArray(t2[0]);
            if (n3 && _2) {
              for (var a3 = 0; a3 < e3.length; a3++) 0 < a3 && (r3 += m2), r3 += k(e3[a3], a3);
              0 < t2.length && (r3 += y3);
            }
            for (var o3 = 0; o3 < t2.length; o3++) {
              var h3 = (n3 ? e3 : t2[o3]).length, u6 = false, d2 = n3 ? 0 === Object.keys(t2[o3]).length : 0 === t2[o3].length;
              if (i3 && !n3 && (u6 = "greedy" === i3 ? "" === t2[o3].join("").trim() : 1 === t2[o3].length && 0 === t2[o3][0].length), "greedy" === i3 && n3) {
                for (var f2 = [], l2 = 0; l2 < h3; l2++) {
                  var c2 = s3 ? e3[l2] : l2;
                  f2.push(t2[o3][c2]);
                }
                u6 = "" === f2.join("").trim();
              }
              if (!u6) {
                for (var p2 = 0; p2 < h3; p2++) {
                  0 < p2 && !d2 && (r3 += m2);
                  var g2 = n3 && s3 ? e3[p2] : p2;
                  r3 += k(t2[o3][g2], p2);
                }
                o3 < t2.length - 1 && (!i3 || 0 < h3 && !d2) && (r3 += y3);
              }
            }
            return r3;
          }
          function k(e3, t2) {
            var i3, r3;
            return null == e3 ? "" : e3.constructor === Date ? JSON.stringify(e3).slice(1, 25) : (r3 = false, o2 && "string" == typeof e3 && o2.test(e3) && (e3 = "'" + e3, r3 = true), i3 = e3.toString().replace(h2, a2), (r3 = r3 || true === n2 || "function" == typeof n2 && n2(e3, t2) || Array.isArray(n2) && n2[t2] || ((e4, t3) => {
              for (var i4 = 0; i4 < t3.length; i4++) if (-1 < e4.indexOf(t3[i4])) return true;
              return false;
            })(i3, v2.BAD_DELIMITERS) || -1 < i3.indexOf(m2) || " " === i3.charAt(0) || " " === i3.charAt(i3.length - 1)) ? s2 + i3 + s2 : i3);
          }
        }, v2.RECORD_SEP = String.fromCharCode(30), v2.UNIT_SEP = String.fromCharCode(31), v2.BYTE_ORDER_MARK = "\uFEFF", v2.BAD_DELIMITERS = ["\r", "\n", '"', v2.BYTE_ORDER_MARK], v2.WORKERS_SUPPORTED = !s && !!n.Worker, v2.NODE_STREAM_INPUT = 1, v2.LocalChunkSize = 10485760, v2.RemoteChunkSize = 5242880, v2.DefaultDelimiter = ",", v2.Parser = E, v2.ParserHandle = i, v2.NetworkStreamer = f, v2.FileStreamer = l, v2.StringStreamer = c, v2.ReadableStreamStreamer = p, n.jQuery && ((d = n.jQuery).fn.parse = function(o2) {
          var i2 = o2.config || {}, h2 = [];
          return this.each(function(e3) {
            if (!("INPUT" === d(this).prop("tagName").toUpperCase() && "file" === d(this).attr("type").toLowerCase() && n.FileReader) || !this.files || 0 === this.files.length) return true;
            for (var t = 0; t < this.files.length; t++) h2.push({ file: this.files[t], inputElem: this, instanceConfig: d.extend({}, i2) });
          }), e(), this;
          function e() {
            if (0 === h2.length) U(o2.complete) && o2.complete();
            else {
              var e3, t, i3, r2, n2 = h2[0];
              if (U(o2.before)) {
                var s2 = o2.before(n2.file, n2.inputElem);
                if ("object" == typeof s2) {
                  if ("abort" === s2.action) return e3 = "AbortError", t = n2.file, i3 = n2.inputElem, r2 = s2.reason, void (U(o2.error) && o2.error({ name: e3 }, t, i3, r2));
                  if ("skip" === s2.action) return void u5();
                  "object" == typeof s2.config && (n2.instanceConfig = d.extend(n2.instanceConfig, s2.config));
                } else if ("skip" === s2) return void u5();
              }
              var a2 = n2.instanceConfig.complete;
              n2.instanceConfig.complete = function(e4) {
                U(a2) && a2(e4, n2.file, n2.inputElem), u5();
              }, v2.parse(n2.file, n2.instanceConfig);
            }
          }
          function u5() {
            h2.splice(0, 1), e();
          }
        }), a && (n.onmessage = function(e) {
          e = e.data;
          void 0 === v2.WORKER_ID && e && (v2.WORKER_ID = e.workerId);
          "string" == typeof e.input ? n.postMessage({ workerId: v2.WORKER_ID, results: v2.parse(e.input, e.config), finished: true }) : (n.File && e.input instanceof File || e.input instanceof Object) && (e = v2.parse(e.input, e.config)) && n.postMessage({ workerId: v2.WORKER_ID, results: e, finished: true });
        }), (f.prototype = Object.create(u4.prototype)).constructor = f, (l.prototype = Object.create(u4.prototype)).constructor = l, (c.prototype = Object.create(c.prototype)).constructor = c, (p.prototype = Object.create(u4.prototype)).constructor = p, v2;
      });
    }
  });

  // node_modules/is-any-array/lib/index.js
  var require_lib = __commonJS({
    "node_modules/is-any-array/lib/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.isAnyArray = void 0;
      var toString = Object.prototype.toString;
      function isAnyArray(value) {
        const tag = toString.call(value);
        return tag.endsWith("Array]") && !tag.includes("Big");
      }
      exports.isAnyArray = isAnyArray;
    }
  });

  // node_modules/ml-array-max/lib/index.js
  var require_lib2 = __commonJS({
    "node_modules/ml-array-max/lib/index.js"(exports, module) {
      "use strict";
      var isAnyArray = require_lib();
      function max3(input, options = {}) {
        if (!isAnyArray.isAnyArray(input)) {
          throw new TypeError("input must be an array");
        }
        if (input.length === 0) {
          throw new TypeError("input must not be empty");
        }
        const { fromIndex = 0, toIndex = input.length } = options;
        if (fromIndex < 0 || fromIndex >= input.length || !Number.isInteger(fromIndex)) {
          throw new Error("fromIndex must be a positive integer smaller than length");
        }
        if (toIndex <= fromIndex || toIndex > input.length || !Number.isInteger(toIndex)) {
          throw new Error(
            "toIndex must be an integer greater than fromIndex and at most equal to length"
          );
        }
        let maxValue = input[fromIndex];
        for (let i = fromIndex + 1; i < toIndex; i++) {
          if (input[i] > maxValue) maxValue = input[i];
        }
        return maxValue;
      }
      module.exports = max3;
    }
  });

  // node_modules/ml-array-min/lib/index.js
  var require_lib3 = __commonJS({
    "node_modules/ml-array-min/lib/index.js"(exports, module) {
      "use strict";
      var isAnyArray = require_lib();
      function min2(input, options = {}) {
        if (!isAnyArray.isAnyArray(input)) {
          throw new TypeError("input must be an array");
        }
        if (input.length === 0) {
          throw new TypeError("input must not be empty");
        }
        const { fromIndex = 0, toIndex = input.length } = options;
        if (fromIndex < 0 || fromIndex >= input.length || !Number.isInteger(fromIndex)) {
          throw new Error("fromIndex must be a positive integer smaller than length");
        }
        if (toIndex <= fromIndex || toIndex > input.length || !Number.isInteger(toIndex)) {
          throw new Error(
            "toIndex must be an integer greater than fromIndex and at most equal to length"
          );
        }
        let minValue = input[fromIndex];
        for (let i = fromIndex + 1; i < toIndex; i++) {
          if (input[i] < minValue) minValue = input[i];
        }
        return minValue;
      }
      module.exports = min2;
    }
  });

  // node_modules/ml-array-rescale/lib/index.js
  var require_lib4 = __commonJS({
    "node_modules/ml-array-rescale/lib/index.js"(exports, module) {
      "use strict";
      var isAnyArray = require_lib();
      var max3 = require_lib2();
      var min2 = require_lib3();
      function _interopDefaultLegacy(e) {
        return e && typeof e === "object" && "default" in e ? e : { "default": e };
      }
      var max__default = /* @__PURE__ */ _interopDefaultLegacy(max3);
      var min__default = /* @__PURE__ */ _interopDefaultLegacy(min2);
      function rescale(input, options = {}) {
        if (!isAnyArray.isAnyArray(input)) {
          throw new TypeError("input must be an array");
        } else if (input.length === 0) {
          throw new TypeError("input must not be empty");
        }
        let output;
        if (options.output !== void 0) {
          if (!isAnyArray.isAnyArray(options.output)) {
            throw new TypeError("output option must be an array if specified");
          }
          output = options.output;
        } else {
          output = new Array(input.length);
        }
        const currentMin = min__default["default"](input);
        const currentMax = max__default["default"](input);
        if (currentMin === currentMax) {
          throw new RangeError(
            "minimum and maximum input values are equal. Cannot rescale a constant array"
          );
        }
        const {
          min: minValue = options.autoMinMax ? currentMin : 0,
          max: maxValue = options.autoMinMax ? currentMax : 1
        } = options;
        if (minValue >= maxValue) {
          throw new RangeError("min option must be smaller than max option");
        }
        const factor = (maxValue - minValue) / (currentMax - currentMin);
        for (let i = 0; i < input.length; i++) {
          output[i] = (input[i] - currentMin) * factor + minValue;
        }
        return output;
      }
      module.exports = rescale;
    }
  });

  // node_modules/ml-matrix/matrix.js
  var require_matrix = __commonJS({
    "node_modules/ml-matrix/matrix.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var isAnyArray = require_lib();
      var rescale = require_lib4();
      var indent = " ".repeat(2);
      var indentData = " ".repeat(4);
      function inspectMatrix() {
        return inspectMatrixWithOptions(this);
      }
      function inspectMatrixWithOptions(matrix2, options = {}) {
        const {
          maxRows = 15,
          maxColumns = 10,
          maxNumSize = 8,
          padMinus = "auto"
        } = options;
        return `${matrix2.constructor.name} {
${indent}[
${indentData}${inspectData(matrix2, maxRows, maxColumns, maxNumSize, padMinus)}
${indent}]
${indent}rows: ${matrix2.rows}
${indent}columns: ${matrix2.columns}
}`;
      }
      function inspectData(matrix2, maxRows, maxColumns, maxNumSize, padMinus) {
        const { rows, columns: columns2 } = matrix2;
        const maxI = Math.min(rows, maxRows);
        const maxJ = Math.min(columns2, maxColumns);
        const result = [];
        if (padMinus === "auto") {
          padMinus = false;
          loop: for (let i = 0; i < maxI; i++) {
            for (let j = 0; j < maxJ; j++) {
              if (matrix2.get(i, j) < 0) {
                padMinus = true;
                break loop;
              }
            }
          }
        }
        for (let i = 0; i < maxI; i++) {
          let line = [];
          for (let j = 0; j < maxJ; j++) {
            line.push(formatNumber(matrix2.get(i, j), maxNumSize, padMinus));
          }
          result.push(`${line.join(" ")}`);
        }
        if (maxJ !== columns2) {
          result[result.length - 1] += ` ... ${columns2 - maxColumns} more columns`;
        }
        if (maxI !== rows) {
          result.push(`... ${rows - maxRows} more rows`);
        }
        return result.join(`
${indentData}`);
      }
      function formatNumber(num, maxNumSize, padMinus) {
        return (num >= 0 && padMinus ? ` ${formatNumber2(num, maxNumSize - 1)}` : formatNumber2(num, maxNumSize)).padEnd(maxNumSize);
      }
      function formatNumber2(num, len) {
        let str = num.toString();
        if (str.length <= len) return str;
        let fix = num.toFixed(len);
        if (fix.length > len) {
          fix = num.toFixed(Math.max(0, len - (fix.length - len)));
        }
        if (fix.length <= len && !fix.startsWith("0.000") && !fix.startsWith("-0.000")) {
          return fix;
        }
        let exp = num.toExponential(len);
        if (exp.length > len) {
          exp = num.toExponential(Math.max(0, len - (exp.length - len)));
        }
        return exp.slice(0);
      }
      function installMathOperations(AbstractMatrix3, Matrix4) {
        AbstractMatrix3.prototype.add = function add(value) {
          if (typeof value === "number") return this.addS(value);
          return this.addM(value);
        };
        AbstractMatrix3.prototype.addS = function addS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) + value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.addM = function addM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) + matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.add = function add(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.add(value);
        };
        AbstractMatrix3.prototype.sub = function sub(value) {
          if (typeof value === "number") return this.subS(value);
          return this.subM(value);
        };
        AbstractMatrix3.prototype.subS = function subS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) - value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.subM = function subM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) - matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.sub = function sub(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.sub(value);
        };
        AbstractMatrix3.prototype.subtract = AbstractMatrix3.prototype.sub;
        AbstractMatrix3.prototype.subtractS = AbstractMatrix3.prototype.subS;
        AbstractMatrix3.prototype.subtractM = AbstractMatrix3.prototype.subM;
        AbstractMatrix3.subtract = AbstractMatrix3.sub;
        AbstractMatrix3.prototype.mul = function mul(value) {
          if (typeof value === "number") return this.mulS(value);
          return this.mulM(value);
        };
        AbstractMatrix3.prototype.mulS = function mulS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) * value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.mulM = function mulM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) * matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.mul = function mul(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.mul(value);
        };
        AbstractMatrix3.prototype.multiply = AbstractMatrix3.prototype.mul;
        AbstractMatrix3.prototype.multiplyS = AbstractMatrix3.prototype.mulS;
        AbstractMatrix3.prototype.multiplyM = AbstractMatrix3.prototype.mulM;
        AbstractMatrix3.multiply = AbstractMatrix3.mul;
        AbstractMatrix3.prototype.div = function div(value) {
          if (typeof value === "number") return this.divS(value);
          return this.divM(value);
        };
        AbstractMatrix3.prototype.divS = function divS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) / value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.divM = function divM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) / matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.div = function div(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.div(value);
        };
        AbstractMatrix3.prototype.divide = AbstractMatrix3.prototype.div;
        AbstractMatrix3.prototype.divideS = AbstractMatrix3.prototype.divS;
        AbstractMatrix3.prototype.divideM = AbstractMatrix3.prototype.divM;
        AbstractMatrix3.divide = AbstractMatrix3.div;
        AbstractMatrix3.prototype.mod = function mod(value) {
          if (typeof value === "number") return this.modS(value);
          return this.modM(value);
        };
        AbstractMatrix3.prototype.modS = function modS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) % value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.modM = function modM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) % matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.mod = function mod(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.mod(value);
        };
        AbstractMatrix3.prototype.modulus = AbstractMatrix3.prototype.mod;
        AbstractMatrix3.prototype.modulusS = AbstractMatrix3.prototype.modS;
        AbstractMatrix3.prototype.modulusM = AbstractMatrix3.prototype.modM;
        AbstractMatrix3.modulus = AbstractMatrix3.mod;
        AbstractMatrix3.prototype.and = function and(value) {
          if (typeof value === "number") return this.andS(value);
          return this.andM(value);
        };
        AbstractMatrix3.prototype.andS = function andS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) & value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.andM = function andM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) & matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.and = function and(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.and(value);
        };
        AbstractMatrix3.prototype.or = function or(value) {
          if (typeof value === "number") return this.orS(value);
          return this.orM(value);
        };
        AbstractMatrix3.prototype.orS = function orS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) | value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.orM = function orM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) | matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.or = function or(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.or(value);
        };
        AbstractMatrix3.prototype.xor = function xor(value) {
          if (typeof value === "number") return this.xorS(value);
          return this.xorM(value);
        };
        AbstractMatrix3.prototype.xorS = function xorS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) ^ value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.xorM = function xorM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) ^ matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.xor = function xor(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.xor(value);
        };
        AbstractMatrix3.prototype.leftShift = function leftShift(value) {
          if (typeof value === "number") return this.leftShiftS(value);
          return this.leftShiftM(value);
        };
        AbstractMatrix3.prototype.leftShiftS = function leftShiftS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) << value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.leftShiftM = function leftShiftM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) << matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.leftShift = function leftShift(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.leftShift(value);
        };
        AbstractMatrix3.prototype.signPropagatingRightShift = function signPropagatingRightShift(value) {
          if (typeof value === "number") return this.signPropagatingRightShiftS(value);
          return this.signPropagatingRightShiftM(value);
        };
        AbstractMatrix3.prototype.signPropagatingRightShiftS = function signPropagatingRightShiftS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) >> value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.signPropagatingRightShiftM = function signPropagatingRightShiftM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) >> matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.signPropagatingRightShift = function signPropagatingRightShift(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.signPropagatingRightShift(value);
        };
        AbstractMatrix3.prototype.rightShift = function rightShift(value) {
          if (typeof value === "number") return this.rightShiftS(value);
          return this.rightShiftM(value);
        };
        AbstractMatrix3.prototype.rightShiftS = function rightShiftS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) >>> value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.rightShiftM = function rightShiftM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) >>> matrix2.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.rightShift = function rightShift(matrix2, value) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.rightShift(value);
        };
        AbstractMatrix3.prototype.zeroFillRightShift = AbstractMatrix3.prototype.rightShift;
        AbstractMatrix3.prototype.zeroFillRightShiftS = AbstractMatrix3.prototype.rightShiftS;
        AbstractMatrix3.prototype.zeroFillRightShiftM = AbstractMatrix3.prototype.rightShiftM;
        AbstractMatrix3.zeroFillRightShift = AbstractMatrix3.rightShift;
        AbstractMatrix3.prototype.not = function not() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, ~this.get(i, j));
            }
          }
          return this;
        };
        AbstractMatrix3.not = function not(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.not();
        };
        AbstractMatrix3.prototype.abs = function abs2() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.abs(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.abs = function abs2(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.abs();
        };
        AbstractMatrix3.prototype.acos = function acos() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.acos(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.acos = function acos(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.acos();
        };
        AbstractMatrix3.prototype.acosh = function acosh() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.acosh(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.acosh = function acosh(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.acosh();
        };
        AbstractMatrix3.prototype.asin = function asin() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.asin(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.asin = function asin(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.asin();
        };
        AbstractMatrix3.prototype.asinh = function asinh() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.asinh(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.asinh = function asinh(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.asinh();
        };
        AbstractMatrix3.prototype.atan = function atan() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.atan(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.atan = function atan(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.atan();
        };
        AbstractMatrix3.prototype.atanh = function atanh() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.atanh(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.atanh = function atanh(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.atanh();
        };
        AbstractMatrix3.prototype.cbrt = function cbrt() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.cbrt(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.cbrt = function cbrt(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.cbrt();
        };
        AbstractMatrix3.prototype.ceil = function ceil() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.ceil(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.ceil = function ceil(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.ceil();
        };
        AbstractMatrix3.prototype.clz32 = function clz32() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.clz32(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.clz32 = function clz32(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.clz32();
        };
        AbstractMatrix3.prototype.cos = function cos() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.cos(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.cos = function cos(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.cos();
        };
        AbstractMatrix3.prototype.cosh = function cosh() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.cosh(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.cosh = function cosh(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.cosh();
        };
        AbstractMatrix3.prototype.exp = function exp() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.exp(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.exp = function exp(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.exp();
        };
        AbstractMatrix3.prototype.expm1 = function expm1() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.expm1(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.expm1 = function expm1(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.expm1();
        };
        AbstractMatrix3.prototype.floor = function floor() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.floor(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.floor = function floor(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.floor();
        };
        AbstractMatrix3.prototype.fround = function fround() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.fround(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.fround = function fround(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.fround();
        };
        AbstractMatrix3.prototype.log = function log() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.log(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.log = function log(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.log();
        };
        AbstractMatrix3.prototype.log1p = function log1p() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.log1p(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.log1p = function log1p(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.log1p();
        };
        AbstractMatrix3.prototype.log10 = function log10() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.log10(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.log10 = function log10(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.log10();
        };
        AbstractMatrix3.prototype.log2 = function log2() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.log2(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.log2 = function log2(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.log2();
        };
        AbstractMatrix3.prototype.round = function round() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.round(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.round = function round(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.round();
        };
        AbstractMatrix3.prototype.sign = function sign() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.sign(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.sign = function sign(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.sign();
        };
        AbstractMatrix3.prototype.sin = function sin() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.sin(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.sin = function sin(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.sin();
        };
        AbstractMatrix3.prototype.sinh = function sinh() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.sinh(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.sinh = function sinh(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.sinh();
        };
        AbstractMatrix3.prototype.sqrt = function sqrt2() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.sqrt(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.sqrt = function sqrt2(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.sqrt();
        };
        AbstractMatrix3.prototype.tan = function tan() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.tan(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.tan = function tan(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.tan();
        };
        AbstractMatrix3.prototype.tanh = function tanh() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.tanh(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.tanh = function tanh(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.tanh();
        };
        AbstractMatrix3.prototype.trunc = function trunc() {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, Math.trunc(this.get(i, j)));
            }
          }
          return this;
        };
        AbstractMatrix3.trunc = function trunc(matrix2) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.trunc();
        };
        AbstractMatrix3.pow = function pow2(matrix2, arg0) {
          const newMatrix = new Matrix4(matrix2);
          return newMatrix.pow(arg0);
        };
        AbstractMatrix3.prototype.pow = function pow2(value) {
          if (typeof value === "number") return this.powS(value);
          return this.powM(value);
        };
        AbstractMatrix3.prototype.powS = function powS(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) ** value);
            }
          }
          return this;
        };
        AbstractMatrix3.prototype.powM = function powM(matrix2) {
          matrix2 = Matrix4.checkMatrix(matrix2);
          if (this.rows !== matrix2.rows || this.columns !== matrix2.columns) {
            throw new RangeError("Matrices dimensions must be equal");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) ** matrix2.get(i, j));
            }
          }
          return this;
        };
      }
      function checkRowIndex(matrix2, index, outer) {
        let max3 = outer ? matrix2.rows : matrix2.rows - 1;
        if (index < 0 || index > max3) {
          throw new RangeError("Row index out of range");
        }
      }
      function checkColumnIndex(matrix2, index, outer) {
        let max3 = outer ? matrix2.columns : matrix2.columns - 1;
        if (index < 0 || index > max3) {
          throw new RangeError("Column index out of range");
        }
      }
      function checkRowVector(matrix2, vector) {
        if (vector.to1DArray) {
          vector = vector.to1DArray();
        }
        if (vector.length !== matrix2.columns) {
          throw new RangeError(
            "vector size must be the same as the number of columns"
          );
        }
        return vector;
      }
      function checkColumnVector(matrix2, vector) {
        if (vector.to1DArray) {
          vector = vector.to1DArray();
        }
        if (vector.length !== matrix2.rows) {
          throw new RangeError("vector size must be the same as the number of rows");
        }
        return vector;
      }
      function checkRowIndices(matrix2, rowIndices) {
        if (!isAnyArray.isAnyArray(rowIndices)) {
          throw new TypeError("row indices must be an array");
        }
        for (let i = 0; i < rowIndices.length; i++) {
          if (rowIndices[i] < 0 || rowIndices[i] >= matrix2.rows) {
            throw new RangeError("row indices are out of range");
          }
        }
      }
      function checkColumnIndices(matrix2, columnIndices) {
        if (!isAnyArray.isAnyArray(columnIndices)) {
          throw new TypeError("column indices must be an array");
        }
        for (let i = 0; i < columnIndices.length; i++) {
          if (columnIndices[i] < 0 || columnIndices[i] >= matrix2.columns) {
            throw new RangeError("column indices are out of range");
          }
        }
      }
      function checkRange(matrix2, startRow, endRow, startColumn, endColumn) {
        if (arguments.length !== 5) {
          throw new RangeError("expected 4 arguments");
        }
        checkNumber("startRow", startRow);
        checkNumber("endRow", endRow);
        checkNumber("startColumn", startColumn);
        checkNumber("endColumn", endColumn);
        if (startRow > endRow || startColumn > endColumn || startRow < 0 || startRow >= matrix2.rows || endRow < 0 || endRow >= matrix2.rows || startColumn < 0 || startColumn >= matrix2.columns || endColumn < 0 || endColumn >= matrix2.columns) {
          throw new RangeError("Submatrix indices are out of range");
        }
      }
      function newArray(length, value = 0) {
        let array3 = [];
        for (let i = 0; i < length; i++) {
          array3.push(value);
        }
        return array3;
      }
      function checkNumber(name, value) {
        if (typeof value !== "number") {
          throw new TypeError(`${name} must be a number`);
        }
      }
      function checkNonEmpty(matrix2) {
        if (matrix2.isEmpty()) {
          throw new Error("Empty matrix has no elements to index");
        }
      }
      function sumByRow(matrix2) {
        let sum2 = newArray(matrix2.rows);
        for (let i = 0; i < matrix2.rows; ++i) {
          for (let j = 0; j < matrix2.columns; ++j) {
            sum2[i] += matrix2.get(i, j);
          }
        }
        return sum2;
      }
      function sumByColumn(matrix2) {
        let sum2 = newArray(matrix2.columns);
        for (let i = 0; i < matrix2.rows; ++i) {
          for (let j = 0; j < matrix2.columns; ++j) {
            sum2[j] += matrix2.get(i, j);
          }
        }
        return sum2;
      }
      function sumAll(matrix2) {
        let v2 = 0;
        for (let i = 0; i < matrix2.rows; i++) {
          for (let j = 0; j < matrix2.columns; j++) {
            v2 += matrix2.get(i, j);
          }
        }
        return v2;
      }
      function productByRow(matrix2) {
        let sum2 = newArray(matrix2.rows, 1);
        for (let i = 0; i < matrix2.rows; ++i) {
          for (let j = 0; j < matrix2.columns; ++j) {
            sum2[i] *= matrix2.get(i, j);
          }
        }
        return sum2;
      }
      function productByColumn(matrix2) {
        let sum2 = newArray(matrix2.columns, 1);
        for (let i = 0; i < matrix2.rows; ++i) {
          for (let j = 0; j < matrix2.columns; ++j) {
            sum2[j] *= matrix2.get(i, j);
          }
        }
        return sum2;
      }
      function productAll(matrix2) {
        let v2 = 1;
        for (let i = 0; i < matrix2.rows; i++) {
          for (let j = 0; j < matrix2.columns; j++) {
            v2 *= matrix2.get(i, j);
          }
        }
        return v2;
      }
      function varianceByRow(matrix2, unbiased, mean2) {
        const rows = matrix2.rows;
        const cols = matrix2.columns;
        const variance = [];
        for (let i = 0; i < rows; i++) {
          let sum1 = 0;
          let sum2 = 0;
          let x2 = 0;
          for (let j = 0; j < cols; j++) {
            x2 = matrix2.get(i, j) - mean2[i];
            sum1 += x2;
            sum2 += x2 * x2;
          }
          if (unbiased) {
            variance.push((sum2 - sum1 * sum1 / cols) / (cols - 1));
          } else {
            variance.push((sum2 - sum1 * sum1 / cols) / cols);
          }
        }
        return variance;
      }
      function varianceByColumn(matrix2, unbiased, mean2) {
        const rows = matrix2.rows;
        const cols = matrix2.columns;
        const variance = [];
        for (let j = 0; j < cols; j++) {
          let sum1 = 0;
          let sum2 = 0;
          let x2 = 0;
          for (let i = 0; i < rows; i++) {
            x2 = matrix2.get(i, j) - mean2[j];
            sum1 += x2;
            sum2 += x2 * x2;
          }
          if (unbiased) {
            variance.push((sum2 - sum1 * sum1 / rows) / (rows - 1));
          } else {
            variance.push((sum2 - sum1 * sum1 / rows) / rows);
          }
        }
        return variance;
      }
      function varianceAll(matrix2, unbiased, mean2) {
        const rows = matrix2.rows;
        const cols = matrix2.columns;
        const size = rows * cols;
        let sum1 = 0;
        let sum2 = 0;
        let x2 = 0;
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            x2 = matrix2.get(i, j) - mean2;
            sum1 += x2;
            sum2 += x2 * x2;
          }
        }
        if (unbiased) {
          return (sum2 - sum1 * sum1 / size) / (size - 1);
        } else {
          return (sum2 - sum1 * sum1 / size) / size;
        }
      }
      function centerByRow(matrix2, mean2) {
        for (let i = 0; i < matrix2.rows; i++) {
          for (let j = 0; j < matrix2.columns; j++) {
            matrix2.set(i, j, matrix2.get(i, j) - mean2[i]);
          }
        }
      }
      function centerByColumn(matrix2, mean2) {
        for (let i = 0; i < matrix2.rows; i++) {
          for (let j = 0; j < matrix2.columns; j++) {
            matrix2.set(i, j, matrix2.get(i, j) - mean2[j]);
          }
        }
      }
      function centerAll(matrix2, mean2) {
        for (let i = 0; i < matrix2.rows; i++) {
          for (let j = 0; j < matrix2.columns; j++) {
            matrix2.set(i, j, matrix2.get(i, j) - mean2);
          }
        }
      }
      function getScaleByRow(matrix2) {
        const scale2 = [];
        for (let i = 0; i < matrix2.rows; i++) {
          let sum2 = 0;
          for (let j = 0; j < matrix2.columns; j++) {
            sum2 += matrix2.get(i, j) ** 2 / (matrix2.columns - 1);
          }
          scale2.push(Math.sqrt(sum2));
        }
        return scale2;
      }
      function scaleByRow(matrix2, scale2) {
        for (let i = 0; i < matrix2.rows; i++) {
          for (let j = 0; j < matrix2.columns; j++) {
            matrix2.set(i, j, matrix2.get(i, j) / scale2[i]);
          }
        }
      }
      function getScaleByColumn(matrix2) {
        const scale2 = [];
        for (let j = 0; j < matrix2.columns; j++) {
          let sum2 = 0;
          for (let i = 0; i < matrix2.rows; i++) {
            sum2 += matrix2.get(i, j) ** 2 / (matrix2.rows - 1);
          }
          scale2.push(Math.sqrt(sum2));
        }
        return scale2;
      }
      function scaleByColumn(matrix2, scale2) {
        for (let i = 0; i < matrix2.rows; i++) {
          for (let j = 0; j < matrix2.columns; j++) {
            matrix2.set(i, j, matrix2.get(i, j) / scale2[j]);
          }
        }
      }
      function getScaleAll(matrix2) {
        const divider = matrix2.size - 1;
        let sum2 = 0;
        for (let j = 0; j < matrix2.columns; j++) {
          for (let i = 0; i < matrix2.rows; i++) {
            sum2 += matrix2.get(i, j) ** 2 / divider;
          }
        }
        return Math.sqrt(sum2);
      }
      function scaleAll(matrix2, scale2) {
        for (let i = 0; i < matrix2.rows; i++) {
          for (let j = 0; j < matrix2.columns; j++) {
            matrix2.set(i, j, matrix2.get(i, j) / scale2);
          }
        }
      }
      var AbstractMatrix2 = class _AbstractMatrix {
        static from1DArray(newRows, newColumns, newData) {
          let length = newRows * newColumns;
          if (length !== newData.length) {
            throw new RangeError("data length does not match given dimensions");
          }
          let newMatrix = new Matrix3(newRows, newColumns);
          for (let row = 0; row < newRows; row++) {
            for (let column = 0; column < newColumns; column++) {
              newMatrix.set(row, column, newData[row * newColumns + column]);
            }
          }
          return newMatrix;
        }
        static rowVector(newData) {
          let vector = new Matrix3(1, newData.length);
          for (let i = 0; i < newData.length; i++) {
            vector.set(0, i, newData[i]);
          }
          return vector;
        }
        static columnVector(newData) {
          let vector = new Matrix3(newData.length, 1);
          for (let i = 0; i < newData.length; i++) {
            vector.set(i, 0, newData[i]);
          }
          return vector;
        }
        static zeros(rows, columns2) {
          return new Matrix3(rows, columns2);
        }
        static ones(rows, columns2) {
          return new Matrix3(rows, columns2).fill(1);
        }
        static rand(rows, columns2, options = {}) {
          if (typeof options !== "object") {
            throw new TypeError("options must be an object");
          }
          const { random = Math.random } = options;
          let matrix2 = new Matrix3(rows, columns2);
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns2; j++) {
              matrix2.set(i, j, random());
            }
          }
          return matrix2;
        }
        static randInt(rows, columns2, options = {}) {
          if (typeof options !== "object") {
            throw new TypeError("options must be an object");
          }
          const { min: min2 = 0, max: max3 = 1e3, random = Math.random } = options;
          if (!Number.isInteger(min2)) throw new TypeError("min must be an integer");
          if (!Number.isInteger(max3)) throw new TypeError("max must be an integer");
          if (min2 >= max3) throw new RangeError("min must be smaller than max");
          let interval2 = max3 - min2;
          let matrix2 = new Matrix3(rows, columns2);
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns2; j++) {
              let value = min2 + Math.round(random() * interval2);
              matrix2.set(i, j, value);
            }
          }
          return matrix2;
        }
        static eye(rows, columns2, value) {
          if (columns2 === void 0) columns2 = rows;
          if (value === void 0) value = 1;
          let min2 = Math.min(rows, columns2);
          let matrix2 = this.zeros(rows, columns2);
          for (let i = 0; i < min2; i++) {
            matrix2.set(i, i, value);
          }
          return matrix2;
        }
        static diag(data2, rows, columns2) {
          let l = data2.length;
          if (rows === void 0) rows = l;
          if (columns2 === void 0) columns2 = rows;
          let min2 = Math.min(l, rows, columns2);
          let matrix2 = this.zeros(rows, columns2);
          for (let i = 0; i < min2; i++) {
            matrix2.set(i, i, data2[i]);
          }
          return matrix2;
        }
        static min(matrix1, matrix2) {
          matrix1 = this.checkMatrix(matrix1);
          matrix2 = this.checkMatrix(matrix2);
          let rows = matrix1.rows;
          let columns2 = matrix1.columns;
          let result = new Matrix3(rows, columns2);
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns2; j++) {
              result.set(i, j, Math.min(matrix1.get(i, j), matrix2.get(i, j)));
            }
          }
          return result;
        }
        static max(matrix1, matrix2) {
          matrix1 = this.checkMatrix(matrix1);
          matrix2 = this.checkMatrix(matrix2);
          let rows = matrix1.rows;
          let columns2 = matrix1.columns;
          let result = new this(rows, columns2);
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns2; j++) {
              result.set(i, j, Math.max(matrix1.get(i, j), matrix2.get(i, j)));
            }
          }
          return result;
        }
        static checkMatrix(value) {
          return _AbstractMatrix.isMatrix(value) ? value : new Matrix3(value);
        }
        static isMatrix(value) {
          return value != null && value.klass === "Matrix";
        }
        get size() {
          return this.rows * this.columns;
        }
        apply(callback) {
          if (typeof callback !== "function") {
            throw new TypeError("callback must be a function");
          }
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              callback.call(this, i, j);
            }
          }
          return this;
        }
        to1DArray() {
          let array3 = [];
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              array3.push(this.get(i, j));
            }
          }
          return array3;
        }
        to2DArray() {
          let copy3 = [];
          for (let i = 0; i < this.rows; i++) {
            copy3.push([]);
            for (let j = 0; j < this.columns; j++) {
              copy3[i].push(this.get(i, j));
            }
          }
          return copy3;
        }
        toJSON() {
          return this.to2DArray();
        }
        isRowVector() {
          return this.rows === 1;
        }
        isColumnVector() {
          return this.columns === 1;
        }
        isVector() {
          return this.rows === 1 || this.columns === 1;
        }
        isSquare() {
          return this.rows === this.columns;
        }
        isEmpty() {
          return this.rows === 0 || this.columns === 0;
        }
        isSymmetric() {
          if (this.isSquare()) {
            for (let i = 0; i < this.rows; i++) {
              for (let j = 0; j <= i; j++) {
                if (this.get(i, j) !== this.get(j, i)) {
                  return false;
                }
              }
            }
            return true;
          }
          return false;
        }
        isDistance() {
          if (!this.isSymmetric()) return false;
          for (let i = 0; i < this.rows; i++) {
            if (this.get(i, i) !== 0) return false;
          }
          return true;
        }
        isEchelonForm() {
          let i = 0;
          let j = 0;
          let previousColumn = -1;
          let isEchelonForm = true;
          let checked = false;
          while (i < this.rows && isEchelonForm) {
            j = 0;
            checked = false;
            while (j < this.columns && checked === false) {
              if (this.get(i, j) === 0) {
                j++;
              } else if (this.get(i, j) === 1 && j > previousColumn) {
                checked = true;
                previousColumn = j;
              } else {
                isEchelonForm = false;
                checked = true;
              }
            }
            i++;
          }
          return isEchelonForm;
        }
        isReducedEchelonForm() {
          let i = 0;
          let j = 0;
          let previousColumn = -1;
          let isReducedEchelonForm = true;
          let checked = false;
          while (i < this.rows && isReducedEchelonForm) {
            j = 0;
            checked = false;
            while (j < this.columns && checked === false) {
              if (this.get(i, j) === 0) {
                j++;
              } else if (this.get(i, j) === 1 && j > previousColumn) {
                checked = true;
                previousColumn = j;
              } else {
                isReducedEchelonForm = false;
                checked = true;
              }
            }
            for (let k = j + 1; k < this.rows; k++) {
              if (this.get(i, k) !== 0) {
                isReducedEchelonForm = false;
              }
            }
            i++;
          }
          return isReducedEchelonForm;
        }
        echelonForm() {
          let result = this.clone();
          let h = 0;
          let k = 0;
          while (h < result.rows && k < result.columns) {
            let iMax = h;
            for (let i = h; i < result.rows; i++) {
              if (result.get(i, k) > result.get(iMax, k)) {
                iMax = i;
              }
            }
            if (result.get(iMax, k) === 0) {
              k++;
            } else {
              result.swapRows(h, iMax);
              let tmp = result.get(h, k);
              for (let j = k; j < result.columns; j++) {
                result.set(h, j, result.get(h, j) / tmp);
              }
              for (let i = h + 1; i < result.rows; i++) {
                let factor = result.get(i, k) / result.get(h, k);
                result.set(i, k, 0);
                for (let j = k + 1; j < result.columns; j++) {
                  result.set(i, j, result.get(i, j) - result.get(h, j) * factor);
                }
              }
              h++;
              k++;
            }
          }
          return result;
        }
        reducedEchelonForm() {
          let result = this.echelonForm();
          let m = result.columns;
          let n = result.rows;
          let h = n - 1;
          while (h >= 0) {
            if (result.maxRow(h) === 0) {
              h--;
            } else {
              let p = 0;
              let pivot = false;
              while (p < n && pivot === false) {
                if (result.get(h, p) === 1) {
                  pivot = true;
                } else {
                  p++;
                }
              }
              for (let i = 0; i < h; i++) {
                let factor = result.get(i, p);
                for (let j = p; j < m; j++) {
                  let tmp = result.get(i, j) - factor * result.get(h, j);
                  result.set(i, j, tmp);
                }
              }
              h--;
            }
          }
          return result;
        }
        set() {
          throw new Error("set method is unimplemented");
        }
        get() {
          throw new Error("get method is unimplemented");
        }
        repeat(options = {}) {
          if (typeof options !== "object") {
            throw new TypeError("options must be an object");
          }
          const { rows = 1, columns: columns2 = 1 } = options;
          if (!Number.isInteger(rows) || rows <= 0) {
            throw new TypeError("rows must be a positive integer");
          }
          if (!Number.isInteger(columns2) || columns2 <= 0) {
            throw new TypeError("columns must be a positive integer");
          }
          let matrix2 = new Matrix3(this.rows * rows, this.columns * columns2);
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns2; j++) {
              matrix2.setSubMatrix(this, this.rows * i, this.columns * j);
            }
          }
          return matrix2;
        }
        fill(value) {
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, value);
            }
          }
          return this;
        }
        neg() {
          return this.mulS(-1);
        }
        getRow(index) {
          checkRowIndex(this, index);
          let row = [];
          for (let i = 0; i < this.columns; i++) {
            row.push(this.get(index, i));
          }
          return row;
        }
        getRowVector(index) {
          return Matrix3.rowVector(this.getRow(index));
        }
        setRow(index, array3) {
          checkRowIndex(this, index);
          array3 = checkRowVector(this, array3);
          for (let i = 0; i < this.columns; i++) {
            this.set(index, i, array3[i]);
          }
          return this;
        }
        swapRows(row1, row2) {
          checkRowIndex(this, row1);
          checkRowIndex(this, row2);
          for (let i = 0; i < this.columns; i++) {
            let temp = this.get(row1, i);
            this.set(row1, i, this.get(row2, i));
            this.set(row2, i, temp);
          }
          return this;
        }
        getColumn(index) {
          checkColumnIndex(this, index);
          let column = [];
          for (let i = 0; i < this.rows; i++) {
            column.push(this.get(i, index));
          }
          return column;
        }
        getColumnVector(index) {
          return Matrix3.columnVector(this.getColumn(index));
        }
        setColumn(index, array3) {
          checkColumnIndex(this, index);
          array3 = checkColumnVector(this, array3);
          for (let i = 0; i < this.rows; i++) {
            this.set(i, index, array3[i]);
          }
          return this;
        }
        swapColumns(column1, column2) {
          checkColumnIndex(this, column1);
          checkColumnIndex(this, column2);
          for (let i = 0; i < this.rows; i++) {
            let temp = this.get(i, column1);
            this.set(i, column1, this.get(i, column2));
            this.set(i, column2, temp);
          }
          return this;
        }
        addRowVector(vector) {
          vector = checkRowVector(this, vector);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) + vector[j]);
            }
          }
          return this;
        }
        subRowVector(vector) {
          vector = checkRowVector(this, vector);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) - vector[j]);
            }
          }
          return this;
        }
        mulRowVector(vector) {
          vector = checkRowVector(this, vector);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) * vector[j]);
            }
          }
          return this;
        }
        divRowVector(vector) {
          vector = checkRowVector(this, vector);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) / vector[j]);
            }
          }
          return this;
        }
        addColumnVector(vector) {
          vector = checkColumnVector(this, vector);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) + vector[i]);
            }
          }
          return this;
        }
        subColumnVector(vector) {
          vector = checkColumnVector(this, vector);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) - vector[i]);
            }
          }
          return this;
        }
        mulColumnVector(vector) {
          vector = checkColumnVector(this, vector);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) * vector[i]);
            }
          }
          return this;
        }
        divColumnVector(vector) {
          vector = checkColumnVector(this, vector);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              this.set(i, j, this.get(i, j) / vector[i]);
            }
          }
          return this;
        }
        mulRow(index, value) {
          checkRowIndex(this, index);
          for (let i = 0; i < this.columns; i++) {
            this.set(index, i, this.get(index, i) * value);
          }
          return this;
        }
        mulColumn(index, value) {
          checkColumnIndex(this, index);
          for (let i = 0; i < this.rows; i++) {
            this.set(i, index, this.get(i, index) * value);
          }
          return this;
        }
        max(by) {
          if (this.isEmpty()) {
            return NaN;
          }
          switch (by) {
            case "row": {
              const max3 = new Array(this.rows).fill(Number.NEGATIVE_INFINITY);
              for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                  if (this.get(row, column) > max3[row]) {
                    max3[row] = this.get(row, column);
                  }
                }
              }
              return max3;
            }
            case "column": {
              const max3 = new Array(this.columns).fill(Number.NEGATIVE_INFINITY);
              for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                  if (this.get(row, column) > max3[column]) {
                    max3[column] = this.get(row, column);
                  }
                }
              }
              return max3;
            }
            case void 0: {
              let max3 = this.get(0, 0);
              for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                  if (this.get(row, column) > max3) {
                    max3 = this.get(row, column);
                  }
                }
              }
              return max3;
            }
            default:
              throw new Error(`invalid option: ${by}`);
          }
        }
        maxIndex() {
          checkNonEmpty(this);
          let v2 = this.get(0, 0);
          let idx = [0, 0];
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              if (this.get(i, j) > v2) {
                v2 = this.get(i, j);
                idx[0] = i;
                idx[1] = j;
              }
            }
          }
          return idx;
        }
        min(by) {
          if (this.isEmpty()) {
            return NaN;
          }
          switch (by) {
            case "row": {
              const min2 = new Array(this.rows).fill(Number.POSITIVE_INFINITY);
              for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                  if (this.get(row, column) < min2[row]) {
                    min2[row] = this.get(row, column);
                  }
                }
              }
              return min2;
            }
            case "column": {
              const min2 = new Array(this.columns).fill(Number.POSITIVE_INFINITY);
              for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                  if (this.get(row, column) < min2[column]) {
                    min2[column] = this.get(row, column);
                  }
                }
              }
              return min2;
            }
            case void 0: {
              let min2 = this.get(0, 0);
              for (let row = 0; row < this.rows; row++) {
                for (let column = 0; column < this.columns; column++) {
                  if (this.get(row, column) < min2) {
                    min2 = this.get(row, column);
                  }
                }
              }
              return min2;
            }
            default:
              throw new Error(`invalid option: ${by}`);
          }
        }
        minIndex() {
          checkNonEmpty(this);
          let v2 = this.get(0, 0);
          let idx = [0, 0];
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              if (this.get(i, j) < v2) {
                v2 = this.get(i, j);
                idx[0] = i;
                idx[1] = j;
              }
            }
          }
          return idx;
        }
        maxRow(row) {
          checkRowIndex(this, row);
          if (this.isEmpty()) {
            return NaN;
          }
          let v2 = this.get(row, 0);
          for (let i = 1; i < this.columns; i++) {
            if (this.get(row, i) > v2) {
              v2 = this.get(row, i);
            }
          }
          return v2;
        }
        maxRowIndex(row) {
          checkRowIndex(this, row);
          checkNonEmpty(this);
          let v2 = this.get(row, 0);
          let idx = [row, 0];
          for (let i = 1; i < this.columns; i++) {
            if (this.get(row, i) > v2) {
              v2 = this.get(row, i);
              idx[1] = i;
            }
          }
          return idx;
        }
        minRow(row) {
          checkRowIndex(this, row);
          if (this.isEmpty()) {
            return NaN;
          }
          let v2 = this.get(row, 0);
          for (let i = 1; i < this.columns; i++) {
            if (this.get(row, i) < v2) {
              v2 = this.get(row, i);
            }
          }
          return v2;
        }
        minRowIndex(row) {
          checkRowIndex(this, row);
          checkNonEmpty(this);
          let v2 = this.get(row, 0);
          let idx = [row, 0];
          for (let i = 1; i < this.columns; i++) {
            if (this.get(row, i) < v2) {
              v2 = this.get(row, i);
              idx[1] = i;
            }
          }
          return idx;
        }
        maxColumn(column) {
          checkColumnIndex(this, column);
          if (this.isEmpty()) {
            return NaN;
          }
          let v2 = this.get(0, column);
          for (let i = 1; i < this.rows; i++) {
            if (this.get(i, column) > v2) {
              v2 = this.get(i, column);
            }
          }
          return v2;
        }
        maxColumnIndex(column) {
          checkColumnIndex(this, column);
          checkNonEmpty(this);
          let v2 = this.get(0, column);
          let idx = [0, column];
          for (let i = 1; i < this.rows; i++) {
            if (this.get(i, column) > v2) {
              v2 = this.get(i, column);
              idx[0] = i;
            }
          }
          return idx;
        }
        minColumn(column) {
          checkColumnIndex(this, column);
          if (this.isEmpty()) {
            return NaN;
          }
          let v2 = this.get(0, column);
          for (let i = 1; i < this.rows; i++) {
            if (this.get(i, column) < v2) {
              v2 = this.get(i, column);
            }
          }
          return v2;
        }
        minColumnIndex(column) {
          checkColumnIndex(this, column);
          checkNonEmpty(this);
          let v2 = this.get(0, column);
          let idx = [0, column];
          for (let i = 1; i < this.rows; i++) {
            if (this.get(i, column) < v2) {
              v2 = this.get(i, column);
              idx[0] = i;
            }
          }
          return idx;
        }
        diag() {
          let min2 = Math.min(this.rows, this.columns);
          let diag = [];
          for (let i = 0; i < min2; i++) {
            diag.push(this.get(i, i));
          }
          return diag;
        }
        norm(type2 = "frobenius") {
          switch (type2) {
            case "max":
              return this.max();
            case "frobenius":
              return Math.sqrt(this.dot(this));
            default:
              throw new RangeError(`unknown norm type: ${type2}`);
          }
        }
        cumulativeSum() {
          let sum2 = 0;
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              sum2 += this.get(i, j);
              this.set(i, j, sum2);
            }
          }
          return this;
        }
        dot(vector2) {
          if (_AbstractMatrix.isMatrix(vector2)) vector2 = vector2.to1DArray();
          let vector1 = this.to1DArray();
          if (vector1.length !== vector2.length) {
            throw new RangeError("vectors do not have the same size");
          }
          let dot = 0;
          for (let i = 0; i < vector1.length; i++) {
            dot += vector1[i] * vector2[i];
          }
          return dot;
        }
        mmul(other) {
          other = Matrix3.checkMatrix(other);
          let m = this.rows;
          let n = this.columns;
          let p = other.columns;
          let result = new Matrix3(m, p);
          let Bcolj = new Float64Array(n);
          for (let j = 0; j < p; j++) {
            for (let k = 0; k < n; k++) {
              Bcolj[k] = other.get(k, j);
            }
            for (let i = 0; i < m; i++) {
              let s = 0;
              for (let k = 0; k < n; k++) {
                s += this.get(i, k) * Bcolj[k];
              }
              result.set(i, j, s);
            }
          }
          return result;
        }
        mpow(scalar) {
          if (!this.isSquare()) {
            throw new RangeError("Matrix must be square");
          }
          if (!Number.isInteger(scalar) || scalar < 0) {
            throw new RangeError("Exponent must be a non-negative integer");
          }
          let result = Matrix3.eye(this.rows);
          let bb2 = this;
          for (let e = scalar; e >= 1; e /= 2) {
            if ((e & 1) !== 0) {
              result = result.mmul(bb2);
            }
            bb2 = bb2.mmul(bb2);
          }
          return result;
        }
        strassen2x2(other) {
          other = Matrix3.checkMatrix(other);
          let result = new Matrix3(2, 2);
          const a11 = this.get(0, 0);
          const b11 = other.get(0, 0);
          const a12 = this.get(0, 1);
          const b12 = other.get(0, 1);
          const a21 = this.get(1, 0);
          const b21 = other.get(1, 0);
          const a22 = this.get(1, 1);
          const b22 = other.get(1, 1);
          const m1 = (a11 + a22) * (b11 + b22);
          const m2 = (a21 + a22) * b11;
          const m3 = a11 * (b12 - b22);
          const m4 = a22 * (b21 - b11);
          const m5 = (a11 + a12) * b22;
          const m6 = (a21 - a11) * (b11 + b12);
          const m7 = (a12 - a22) * (b21 + b22);
          const c00 = m1 + m4 - m5 + m7;
          const c01 = m3 + m5;
          const c10 = m2 + m4;
          const c11 = m1 - m2 + m3 + m6;
          result.set(0, 0, c00);
          result.set(0, 1, c01);
          result.set(1, 0, c10);
          result.set(1, 1, c11);
          return result;
        }
        strassen3x3(other) {
          other = Matrix3.checkMatrix(other);
          let result = new Matrix3(3, 3);
          const a00 = this.get(0, 0);
          const a01 = this.get(0, 1);
          const a02 = this.get(0, 2);
          const a10 = this.get(1, 0);
          const a11 = this.get(1, 1);
          const a12 = this.get(1, 2);
          const a20 = this.get(2, 0);
          const a21 = this.get(2, 1);
          const a22 = this.get(2, 2);
          const b00 = other.get(0, 0);
          const b01 = other.get(0, 1);
          const b02 = other.get(0, 2);
          const b10 = other.get(1, 0);
          const b11 = other.get(1, 1);
          const b12 = other.get(1, 2);
          const b20 = other.get(2, 0);
          const b21 = other.get(2, 1);
          const b22 = other.get(2, 2);
          const m1 = (a00 + a01 + a02 - a10 - a11 - a21 - a22) * b11;
          const m2 = (a00 - a10) * (-b01 + b11);
          const m3 = a11 * (-b00 + b01 + b10 - b11 - b12 - b20 + b22);
          const m4 = (-a00 + a10 + a11) * (b00 - b01 + b11);
          const m5 = (a10 + a11) * (-b00 + b01);
          const m6 = a00 * b00;
          const m7 = (-a00 + a20 + a21) * (b00 - b02 + b12);
          const m8 = (-a00 + a20) * (b02 - b12);
          const m9 = (a20 + a21) * (-b00 + b02);
          const m10 = (a00 + a01 + a02 - a11 - a12 - a20 - a21) * b12;
          const m11 = a21 * (-b00 + b02 + b10 - b11 - b12 - b20 + b21);
          const m12 = (-a02 + a21 + a22) * (b11 + b20 - b21);
          const m13 = (a02 - a22) * (b11 - b21);
          const m14 = a02 * b20;
          const m15 = (a21 + a22) * (-b20 + b21);
          const m16 = (-a02 + a11 + a12) * (b12 + b20 - b22);
          const m17 = (a02 - a12) * (b12 - b22);
          const m18 = (a11 + a12) * (-b20 + b22);
          const m19 = a01 * b10;
          const m20 = a12 * b21;
          const m21 = a10 * b02;
          const m22 = a20 * b01;
          const m23 = a22 * b22;
          const c00 = m6 + m14 + m19;
          const c01 = m1 + m4 + m5 + m6 + m12 + m14 + m15;
          const c02 = m6 + m7 + m9 + m10 + m14 + m16 + m18;
          const c10 = m2 + m3 + m4 + m6 + m14 + m16 + m17;
          const c11 = m2 + m4 + m5 + m6 + m20;
          const c12 = m14 + m16 + m17 + m18 + m21;
          const c20 = m6 + m7 + m8 + m11 + m12 + m13 + m14;
          const c21 = m12 + m13 + m14 + m15 + m22;
          const c22 = m6 + m7 + m8 + m9 + m23;
          result.set(0, 0, c00);
          result.set(0, 1, c01);
          result.set(0, 2, c02);
          result.set(1, 0, c10);
          result.set(1, 1, c11);
          result.set(1, 2, c12);
          result.set(2, 0, c20);
          result.set(2, 1, c21);
          result.set(2, 2, c22);
          return result;
        }
        mmulStrassen(y2) {
          y2 = Matrix3.checkMatrix(y2);
          let x2 = this.clone();
          let r1 = x2.rows;
          let c1 = x2.columns;
          let r2 = y2.rows;
          let c2 = y2.columns;
          if (c1 !== r2) {
            console.warn(
              `Multiplying ${r1} x ${c1} and ${r2} x ${c2} matrix: dimensions do not match.`
            );
          }
          function embed(mat, rows, cols) {
            let r3 = mat.rows;
            let c3 = mat.columns;
            if (r3 === rows && c3 === cols) {
              return mat;
            } else {
              let resultat = _AbstractMatrix.zeros(rows, cols);
              resultat = resultat.setSubMatrix(mat, 0, 0);
              return resultat;
            }
          }
          let r = Math.max(r1, r2);
          let c = Math.max(c1, c2);
          x2 = embed(x2, r, c);
          y2 = embed(y2, r, c);
          function blockMult(a, b, rows, cols) {
            if (rows <= 512 || cols <= 512) {
              return a.mmul(b);
            }
            if (rows % 2 === 1 && cols % 2 === 1) {
              a = embed(a, rows + 1, cols + 1);
              b = embed(b, rows + 1, cols + 1);
            } else if (rows % 2 === 1) {
              a = embed(a, rows + 1, cols);
              b = embed(b, rows + 1, cols);
            } else if (cols % 2 === 1) {
              a = embed(a, rows, cols + 1);
              b = embed(b, rows, cols + 1);
            }
            let halfRows = parseInt(a.rows / 2, 10);
            let halfCols = parseInt(a.columns / 2, 10);
            let a11 = a.subMatrix(0, halfRows - 1, 0, halfCols - 1);
            let b11 = b.subMatrix(0, halfRows - 1, 0, halfCols - 1);
            let a12 = a.subMatrix(0, halfRows - 1, halfCols, a.columns - 1);
            let b12 = b.subMatrix(0, halfRows - 1, halfCols, b.columns - 1);
            let a21 = a.subMatrix(halfRows, a.rows - 1, 0, halfCols - 1);
            let b21 = b.subMatrix(halfRows, b.rows - 1, 0, halfCols - 1);
            let a22 = a.subMatrix(halfRows, a.rows - 1, halfCols, a.columns - 1);
            let b22 = b.subMatrix(halfRows, b.rows - 1, halfCols, b.columns - 1);
            let m1 = blockMult(
              _AbstractMatrix.add(a11, a22),
              _AbstractMatrix.add(b11, b22),
              halfRows,
              halfCols
            );
            let m2 = blockMult(_AbstractMatrix.add(a21, a22), b11, halfRows, halfCols);
            let m3 = blockMult(a11, _AbstractMatrix.sub(b12, b22), halfRows, halfCols);
            let m4 = blockMult(a22, _AbstractMatrix.sub(b21, b11), halfRows, halfCols);
            let m5 = blockMult(_AbstractMatrix.add(a11, a12), b22, halfRows, halfCols);
            let m6 = blockMult(
              _AbstractMatrix.sub(a21, a11),
              _AbstractMatrix.add(b11, b12),
              halfRows,
              halfCols
            );
            let m7 = blockMult(
              _AbstractMatrix.sub(a12, a22),
              _AbstractMatrix.add(b21, b22),
              halfRows,
              halfCols
            );
            let c11 = _AbstractMatrix.add(m1, m4);
            c11.sub(m5);
            c11.add(m7);
            let c12 = _AbstractMatrix.add(m3, m5);
            let c21 = _AbstractMatrix.add(m2, m4);
            let c22 = _AbstractMatrix.sub(m1, m2);
            c22.add(m3);
            c22.add(m6);
            let result = _AbstractMatrix.zeros(2 * c11.rows, 2 * c11.columns);
            result = result.setSubMatrix(c11, 0, 0);
            result = result.setSubMatrix(c12, c11.rows, 0);
            result = result.setSubMatrix(c21, 0, c11.columns);
            result = result.setSubMatrix(c22, c11.rows, c11.columns);
            return result.subMatrix(0, rows - 1, 0, cols - 1);
          }
          return blockMult(x2, y2, r, c);
        }
        scaleRows(options = {}) {
          if (typeof options !== "object") {
            throw new TypeError("options must be an object");
          }
          const { min: min2 = 0, max: max3 = 1 } = options;
          if (!Number.isFinite(min2)) throw new TypeError("min must be a number");
          if (!Number.isFinite(max3)) throw new TypeError("max must be a number");
          if (min2 >= max3) throw new RangeError("min must be smaller than max");
          let newMatrix = new Matrix3(this.rows, this.columns);
          for (let i = 0; i < this.rows; i++) {
            const row = this.getRow(i);
            if (row.length > 0) {
              rescale(row, { min: min2, max: max3, output: row });
            }
            newMatrix.setRow(i, row);
          }
          return newMatrix;
        }
        scaleColumns(options = {}) {
          if (typeof options !== "object") {
            throw new TypeError("options must be an object");
          }
          const { min: min2 = 0, max: max3 = 1 } = options;
          if (!Number.isFinite(min2)) throw new TypeError("min must be a number");
          if (!Number.isFinite(max3)) throw new TypeError("max must be a number");
          if (min2 >= max3) throw new RangeError("min must be smaller than max");
          let newMatrix = new Matrix3(this.rows, this.columns);
          for (let i = 0; i < this.columns; i++) {
            const column = this.getColumn(i);
            if (column.length) {
              rescale(column, {
                min: min2,
                max: max3,
                output: column
              });
            }
            newMatrix.setColumn(i, column);
          }
          return newMatrix;
        }
        flipRows() {
          const middle = Math.ceil(this.columns / 2);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < middle; j++) {
              let first = this.get(i, j);
              let last = this.get(i, this.columns - 1 - j);
              this.set(i, j, last);
              this.set(i, this.columns - 1 - j, first);
            }
          }
          return this;
        }
        flipColumns() {
          const middle = Math.ceil(this.rows / 2);
          for (let j = 0; j < this.columns; j++) {
            for (let i = 0; i < middle; i++) {
              let first = this.get(i, j);
              let last = this.get(this.rows - 1 - i, j);
              this.set(i, j, last);
              this.set(this.rows - 1 - i, j, first);
            }
          }
          return this;
        }
        kroneckerProduct(other) {
          other = Matrix3.checkMatrix(other);
          let m = this.rows;
          let n = this.columns;
          let p = other.rows;
          let q = other.columns;
          let result = new Matrix3(m * p, n * q);
          for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
              for (let k = 0; k < p; k++) {
                for (let l = 0; l < q; l++) {
                  result.set(p * i + k, q * j + l, this.get(i, j) * other.get(k, l));
                }
              }
            }
          }
          return result;
        }
        kroneckerSum(other) {
          other = Matrix3.checkMatrix(other);
          if (!this.isSquare() || !other.isSquare()) {
            throw new Error("Kronecker Sum needs two Square Matrices");
          }
          let m = this.rows;
          let n = other.rows;
          let AxI = this.kroneckerProduct(Matrix3.eye(n, n));
          let IxB = Matrix3.eye(m, m).kroneckerProduct(other);
          return AxI.add(IxB);
        }
        transpose() {
          let result = new Matrix3(this.columns, this.rows);
          for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.columns; j++) {
              result.set(j, i, this.get(i, j));
            }
          }
          return result;
        }
        sortRows(compareFunction = compareNumbers) {
          for (let i = 0; i < this.rows; i++) {
            this.setRow(i, this.getRow(i).sort(compareFunction));
          }
          return this;
        }
        sortColumns(compareFunction = compareNumbers) {
          for (let i = 0; i < this.columns; i++) {
            this.setColumn(i, this.getColumn(i).sort(compareFunction));
          }
          return this;
        }
        subMatrix(startRow, endRow, startColumn, endColumn) {
          checkRange(this, startRow, endRow, startColumn, endColumn);
          let newMatrix = new Matrix3(
            endRow - startRow + 1,
            endColumn - startColumn + 1
          );
          for (let i = startRow; i <= endRow; i++) {
            for (let j = startColumn; j <= endColumn; j++) {
              newMatrix.set(i - startRow, j - startColumn, this.get(i, j));
            }
          }
          return newMatrix;
        }
        subMatrixRow(indices, startColumn, endColumn) {
          if (startColumn === void 0) startColumn = 0;
          if (endColumn === void 0) endColumn = this.columns - 1;
          if (startColumn > endColumn || startColumn < 0 || startColumn >= this.columns || endColumn < 0 || endColumn >= this.columns) {
            throw new RangeError("Argument out of range");
          }
          let newMatrix = new Matrix3(indices.length, endColumn - startColumn + 1);
          for (let i = 0; i < indices.length; i++) {
            for (let j = startColumn; j <= endColumn; j++) {
              if (indices[i] < 0 || indices[i] >= this.rows) {
                throw new RangeError(`Row index out of range: ${indices[i]}`);
              }
              newMatrix.set(i, j - startColumn, this.get(indices[i], j));
            }
          }
          return newMatrix;
        }
        subMatrixColumn(indices, startRow, endRow) {
          if (startRow === void 0) startRow = 0;
          if (endRow === void 0) endRow = this.rows - 1;
          if (startRow > endRow || startRow < 0 || startRow >= this.rows || endRow < 0 || endRow >= this.rows) {
            throw new RangeError("Argument out of range");
          }
          let newMatrix = new Matrix3(endRow - startRow + 1, indices.length);
          for (let i = 0; i < indices.length; i++) {
            for (let j = startRow; j <= endRow; j++) {
              if (indices[i] < 0 || indices[i] >= this.columns) {
                throw new RangeError(`Column index out of range: ${indices[i]}`);
              }
              newMatrix.set(j - startRow, i, this.get(j, indices[i]));
            }
          }
          return newMatrix;
        }
        setSubMatrix(matrix2, startRow, startColumn) {
          matrix2 = Matrix3.checkMatrix(matrix2);
          if (matrix2.isEmpty()) {
            return this;
          }
          let endRow = startRow + matrix2.rows - 1;
          let endColumn = startColumn + matrix2.columns - 1;
          checkRange(this, startRow, endRow, startColumn, endColumn);
          for (let i = 0; i < matrix2.rows; i++) {
            for (let j = 0; j < matrix2.columns; j++) {
              this.set(startRow + i, startColumn + j, matrix2.get(i, j));
            }
          }
          return this;
        }
        selection(rowIndices, columnIndices) {
          checkRowIndices(this, rowIndices);
          checkColumnIndices(this, columnIndices);
          let newMatrix = new Matrix3(rowIndices.length, columnIndices.length);
          for (let i = 0; i < rowIndices.length; i++) {
            let rowIndex = rowIndices[i];
            for (let j = 0; j < columnIndices.length; j++) {
              let columnIndex = columnIndices[j];
              newMatrix.set(i, j, this.get(rowIndex, columnIndex));
            }
          }
          return newMatrix;
        }
        trace() {
          let min2 = Math.min(this.rows, this.columns);
          let trace = 0;
          for (let i = 0; i < min2; i++) {
            trace += this.get(i, i);
          }
          return trace;
        }
        clone() {
          return this.constructor.copy(this, new Matrix3(this.rows, this.columns));
        }
        /**
         * @template {AbstractMatrix} M
         * @param {AbstractMatrix} from
         * @param {M} to
         * @return {M}
         */
        static copy(from, to) {
          for (const [row, column, value] of from.entries()) {
            to.set(row, column, value);
          }
          return to;
        }
        sum(by) {
          switch (by) {
            case "row":
              return sumByRow(this);
            case "column":
              return sumByColumn(this);
            case void 0:
              return sumAll(this);
            default:
              throw new Error(`invalid option: ${by}`);
          }
        }
        product(by) {
          switch (by) {
            case "row":
              return productByRow(this);
            case "column":
              return productByColumn(this);
            case void 0:
              return productAll(this);
            default:
              throw new Error(`invalid option: ${by}`);
          }
        }
        mean(by) {
          const sum2 = this.sum(by);
          switch (by) {
            case "row": {
              for (let i = 0; i < this.rows; i++) {
                sum2[i] /= this.columns;
              }
              return sum2;
            }
            case "column": {
              for (let i = 0; i < this.columns; i++) {
                sum2[i] /= this.rows;
              }
              return sum2;
            }
            case void 0:
              return sum2 / this.size;
            default:
              throw new Error(`invalid option: ${by}`);
          }
        }
        variance(by, options = {}) {
          if (typeof by === "object") {
            options = by;
            by = void 0;
          }
          if (typeof options !== "object") {
            throw new TypeError("options must be an object");
          }
          const { unbiased = true, mean: mean2 = this.mean(by) } = options;
          if (typeof unbiased !== "boolean") {
            throw new TypeError("unbiased must be a boolean");
          }
          switch (by) {
            case "row": {
              if (!isAnyArray.isAnyArray(mean2)) {
                throw new TypeError("mean must be an array");
              }
              return varianceByRow(this, unbiased, mean2);
            }
            case "column": {
              if (!isAnyArray.isAnyArray(mean2)) {
                throw new TypeError("mean must be an array");
              }
              return varianceByColumn(this, unbiased, mean2);
            }
            case void 0: {
              if (typeof mean2 !== "number") {
                throw new TypeError("mean must be a number");
              }
              return varianceAll(this, unbiased, mean2);
            }
            default:
              throw new Error(`invalid option: ${by}`);
          }
        }
        standardDeviation(by, options) {
          if (typeof by === "object") {
            options = by;
            by = void 0;
          }
          const variance = this.variance(by, options);
          if (by === void 0) {
            return Math.sqrt(variance);
          } else {
            for (let i = 0; i < variance.length; i++) {
              variance[i] = Math.sqrt(variance[i]);
            }
            return variance;
          }
        }
        center(by, options = {}) {
          if (typeof by === "object") {
            options = by;
            by = void 0;
          }
          if (typeof options !== "object") {
            throw new TypeError("options must be an object");
          }
          const { center = this.mean(by) } = options;
          switch (by) {
            case "row": {
              if (!isAnyArray.isAnyArray(center)) {
                throw new TypeError("center must be an array");
              }
              centerByRow(this, center);
              return this;
            }
            case "column": {
              if (!isAnyArray.isAnyArray(center)) {
                throw new TypeError("center must be an array");
              }
              centerByColumn(this, center);
              return this;
            }
            case void 0: {
              if (typeof center !== "number") {
                throw new TypeError("center must be a number");
              }
              centerAll(this, center);
              return this;
            }
            default:
              throw new Error(`invalid option: ${by}`);
          }
        }
        scale(by, options = {}) {
          if (typeof by === "object") {
            options = by;
            by = void 0;
          }
          if (typeof options !== "object") {
            throw new TypeError("options must be an object");
          }
          let scale2 = options.scale;
          switch (by) {
            case "row": {
              if (scale2 === void 0) {
                scale2 = getScaleByRow(this);
              } else if (!isAnyArray.isAnyArray(scale2)) {
                throw new TypeError("scale must be an array");
              }
              scaleByRow(this, scale2);
              return this;
            }
            case "column": {
              if (scale2 === void 0) {
                scale2 = getScaleByColumn(this);
              } else if (!isAnyArray.isAnyArray(scale2)) {
                throw new TypeError("scale must be an array");
              }
              scaleByColumn(this, scale2);
              return this;
            }
            case void 0: {
              if (scale2 === void 0) {
                scale2 = getScaleAll(this);
              } else if (typeof scale2 !== "number") {
                throw new TypeError("scale must be a number");
              }
              scaleAll(this, scale2);
              return this;
            }
            default:
              throw new Error(`invalid option: ${by}`);
          }
        }
        toString(options) {
          return inspectMatrixWithOptions(this, options);
        }
        [Symbol.iterator]() {
          return this.entries();
        }
        /**
         * iterator from left to right, from top to bottom
         * yield [row, column, value]
         * @returns {Generator<[number, number, number], void, void>}
         */
        *entries() {
          for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
              yield [row, col, this.get(row, col)];
            }
          }
        }
        /**
         * iterator from left to right, from top to bottom
         * yield value
         * @returns {Generator<number, void, void>}
         */
        *values() {
          for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.columns; col++) {
              yield this.get(row, col);
            }
          }
        }
      };
      AbstractMatrix2.prototype.klass = "Matrix";
      if (typeof Symbol !== "undefined") {
        AbstractMatrix2.prototype[Symbol.for("nodejs.util.inspect.custom")] = inspectMatrix;
      }
      function compareNumbers(a, b) {
        return a - b;
      }
      function isArrayOfNumbers(array3) {
        return array3.every((element) => {
          return typeof element === "number";
        });
      }
      AbstractMatrix2.random = AbstractMatrix2.rand;
      AbstractMatrix2.randomInt = AbstractMatrix2.randInt;
      AbstractMatrix2.diagonal = AbstractMatrix2.diag;
      AbstractMatrix2.prototype.diagonal = AbstractMatrix2.prototype.diag;
      AbstractMatrix2.identity = AbstractMatrix2.eye;
      AbstractMatrix2.prototype.negate = AbstractMatrix2.prototype.neg;
      AbstractMatrix2.prototype.tensorProduct = AbstractMatrix2.prototype.kroneckerProduct;
      var Matrix3 = class _Matrix extends AbstractMatrix2 {
        /**
         * @type {Float64Array[]}
         */
        data;
        /**
         * Init an empty matrix
         * @param {number} nRows
         * @param {number} nColumns
         */
        #initData(nRows, nColumns) {
          this.data = [];
          if (Number.isInteger(nColumns) && nColumns >= 0) {
            for (let i = 0; i < nRows; i++) {
              this.data.push(new Float64Array(nColumns));
            }
          } else {
            throw new TypeError("nColumns must be a positive integer");
          }
          this.rows = nRows;
          this.columns = nColumns;
        }
        constructor(nRows, nColumns) {
          super();
          if (_Matrix.isMatrix(nRows)) {
            this.#initData(nRows.rows, nRows.columns);
            _Matrix.copy(nRows, this);
          } else if (Number.isInteger(nRows) && nRows >= 0) {
            this.#initData(nRows, nColumns);
          } else if (isAnyArray.isAnyArray(nRows)) {
            const arrayData = nRows;
            nRows = arrayData.length;
            nColumns = nRows ? arrayData[0].length : 0;
            if (typeof nColumns !== "number") {
              throw new TypeError(
                "Data must be a 2D array with at least one element"
              );
            }
            this.data = [];
            for (let i = 0; i < nRows; i++) {
              if (arrayData[i].length !== nColumns) {
                throw new RangeError("Inconsistent array dimensions");
              }
              if (!isArrayOfNumbers(arrayData[i])) {
                throw new TypeError("Input data contains non-numeric values");
              }
              this.data.push(Float64Array.from(arrayData[i]));
            }
            this.rows = nRows;
            this.columns = nColumns;
          } else {
            throw new TypeError(
              "First argument must be a positive number or an array"
            );
          }
        }
        set(rowIndex, columnIndex, value) {
          this.data[rowIndex][columnIndex] = value;
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.data[rowIndex][columnIndex];
        }
        removeRow(index) {
          checkRowIndex(this, index);
          this.data.splice(index, 1);
          this.rows -= 1;
          return this;
        }
        addRow(index, array3) {
          if (array3 === void 0) {
            array3 = index;
            index = this.rows;
          }
          checkRowIndex(this, index, true);
          array3 = Float64Array.from(checkRowVector(this, array3));
          this.data.splice(index, 0, array3);
          this.rows += 1;
          return this;
        }
        removeColumn(index) {
          checkColumnIndex(this, index);
          for (let i = 0; i < this.rows; i++) {
            const newRow = new Float64Array(this.columns - 1);
            for (let j = 0; j < index; j++) {
              newRow[j] = this.data[i][j];
            }
            for (let j = index + 1; j < this.columns; j++) {
              newRow[j - 1] = this.data[i][j];
            }
            this.data[i] = newRow;
          }
          this.columns -= 1;
          return this;
        }
        addColumn(index, array3) {
          if (typeof array3 === "undefined") {
            array3 = index;
            index = this.columns;
          }
          checkColumnIndex(this, index, true);
          array3 = checkColumnVector(this, array3);
          for (let i = 0; i < this.rows; i++) {
            const newRow = new Float64Array(this.columns + 1);
            let j = 0;
            for (; j < index; j++) {
              newRow[j] = this.data[i][j];
            }
            newRow[j++] = array3[i];
            for (; j < this.columns + 1; j++) {
              newRow[j] = this.data[i][j - 1];
            }
            this.data[i] = newRow;
          }
          this.columns += 1;
          return this;
        }
      };
      installMathOperations(AbstractMatrix2, Matrix3);
      var SymmetricMatrix2 = class _SymmetricMatrix extends AbstractMatrix2 {
        /** @type {Matrix} */
        #matrix;
        get size() {
          return this.#matrix.size;
        }
        get rows() {
          return this.#matrix.rows;
        }
        get columns() {
          return this.#matrix.columns;
        }
        get diagonalSize() {
          return this.rows;
        }
        /**
         * not the same as matrix.isSymmetric()
         * Here is to check if it's instanceof SymmetricMatrix without bundling issues
         *
         * @param value
         * @returns {boolean}
         */
        static isSymmetricMatrix(value) {
          return Matrix3.isMatrix(value) && value.klassType === "SymmetricMatrix";
        }
        /**
         * @param diagonalSize
         * @return {SymmetricMatrix}
         */
        static zeros(diagonalSize) {
          return new this(diagonalSize);
        }
        /**
         * @param diagonalSize
         * @return {SymmetricMatrix}
         */
        static ones(diagonalSize) {
          return new this(diagonalSize).fill(1);
        }
        /**
         * @param {number | AbstractMatrix | ArrayLike<ArrayLike<number>>} diagonalSize
         * @return {this}
         */
        constructor(diagonalSize) {
          super();
          if (Matrix3.isMatrix(diagonalSize)) {
            if (!diagonalSize.isSymmetric()) {
              throw new TypeError("not symmetric data");
            }
            this.#matrix = Matrix3.copy(
              diagonalSize,
              new Matrix3(diagonalSize.rows, diagonalSize.rows)
            );
          } else if (Number.isInteger(diagonalSize) && diagonalSize >= 0) {
            this.#matrix = new Matrix3(diagonalSize, diagonalSize);
          } else {
            this.#matrix = new Matrix3(diagonalSize);
            if (!this.isSymmetric()) {
              throw new TypeError("not symmetric data");
            }
          }
        }
        clone() {
          const matrix2 = new _SymmetricMatrix(this.diagonalSize);
          for (const [row, col, value] of this.upperRightEntries()) {
            matrix2.set(row, col, value);
          }
          return matrix2;
        }
        toMatrix() {
          return new Matrix3(this);
        }
        get(rowIndex, columnIndex) {
          return this.#matrix.get(rowIndex, columnIndex);
        }
        set(rowIndex, columnIndex, value) {
          this.#matrix.set(rowIndex, columnIndex, value);
          this.#matrix.set(columnIndex, rowIndex, value);
          return this;
        }
        removeCross(index) {
          this.#matrix.removeRow(index);
          this.#matrix.removeColumn(index);
          return this;
        }
        addCross(index, array3) {
          if (array3 === void 0) {
            array3 = index;
            index = this.diagonalSize;
          }
          const row = array3.slice();
          row.splice(index, 1);
          this.#matrix.addRow(index, row);
          this.#matrix.addColumn(index, array3);
          return this;
        }
        /**
         * @param {Mask[]} mask
         */
        applyMask(mask) {
          if (mask.length !== this.diagonalSize) {
            throw new RangeError("Mask size do not match with matrix size");
          }
          const sidesToRemove = [];
          for (const [index, passthroughs] of mask.entries()) {
            if (passthroughs) continue;
            sidesToRemove.push(index);
          }
          sidesToRemove.reverse();
          for (const sideIndex of sidesToRemove) {
            this.removeCross(sideIndex);
          }
          return this;
        }
        /**
         * Compact format upper-right corner of matrix
         * iterate from left to right, from top to bottom.
         *
         * ```
         *   A B C D
         * A 1 2 3 4
         * B 2 5 6 7
         * C 3 6 8 9
         * D 4 7 9 10
         * ```
         *
         * will return compact 1D array `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`
         *
         * length is S(i=0, n=sideSize) => 10 for a 4 sideSized matrix
         *
         * @returns {number[]}
         */
        toCompact() {
          const { diagonalSize } = this;
          const compact = new Array(diagonalSize * (diagonalSize + 1) / 2);
          for (let col = 0, row = 0, index = 0; index < compact.length; index++) {
            compact[index] = this.get(row, col);
            if (++col >= diagonalSize) col = ++row;
          }
          return compact;
        }
        /**
         * @param {number[]} compact
         * @return {SymmetricMatrix}
         */
        static fromCompact(compact) {
          const compactSize = compact.length;
          const diagonalSize = (Math.sqrt(8 * compactSize + 1) - 1) / 2;
          if (!Number.isInteger(diagonalSize)) {
            throw new TypeError(
              `This array is not a compact representation of a Symmetric Matrix, ${JSON.stringify(
                compact
              )}`
            );
          }
          const matrix2 = new _SymmetricMatrix(diagonalSize);
          for (let col = 0, row = 0, index = 0; index < compactSize; index++) {
            matrix2.set(col, row, compact[index]);
            if (++col >= diagonalSize) col = ++row;
          }
          return matrix2;
        }
        /**
         * half iterator upper-right-corner from left to right, from top to bottom
         * yield [row, column, value]
         *
         * @returns {Generator<[number, number, number], void, void>}
         */
        *upperRightEntries() {
          for (let row = 0, col = 0; row < this.diagonalSize; void 0) {
            const value = this.get(row, col);
            yield [row, col, value];
            if (++col >= this.diagonalSize) col = ++row;
          }
        }
        /**
         * half iterator upper-right-corner from left to right, from top to bottom
         * yield value
         *
         * @returns {Generator<[number, number, number], void, void>}
         */
        *upperRightValues() {
          for (let row = 0, col = 0; row < this.diagonalSize; void 0) {
            const value = this.get(row, col);
            yield value;
            if (++col >= this.diagonalSize) col = ++row;
          }
        }
      };
      SymmetricMatrix2.prototype.klassType = "SymmetricMatrix";
      var DistanceMatrix2 = class _DistanceMatrix extends SymmetricMatrix2 {
        /**
         * not the same as matrix.isSymmetric()
         * Here is to check if it's instanceof SymmetricMatrix without bundling issues
         *
         * @param value
         * @returns {boolean}
         */
        static isDistanceMatrix(value) {
          return SymmetricMatrix2.isSymmetricMatrix(value) && value.klassSubType === "DistanceMatrix";
        }
        constructor(sideSize) {
          super(sideSize);
          if (!this.isDistance()) {
            throw new TypeError("Provided arguments do no produce a distance matrix");
          }
        }
        set(rowIndex, columnIndex, value) {
          if (rowIndex === columnIndex) value = 0;
          return super.set(rowIndex, columnIndex, value);
        }
        addCross(index, array3) {
          if (array3 === void 0) {
            array3 = index;
            index = this.diagonalSize;
          }
          array3 = array3.slice();
          array3[index] = 0;
          return super.addCross(index, array3);
        }
        toSymmetricMatrix() {
          return new SymmetricMatrix2(this);
        }
        clone() {
          const matrix2 = new _DistanceMatrix(this.diagonalSize);
          for (const [row, col, value] of this.upperRightEntries()) {
            if (row === col) continue;
            matrix2.set(row, col, value);
          }
          return matrix2;
        }
        /**
         * Compact format upper-right corner of matrix
         * no diagonal (only zeros)
         * iterable from left to right, from top to bottom.
         *
         * ```
         *   A B C D
         * A 0 1 2 3
         * B 1 0 4 5
         * C 2 4 0 6
         * D 3 5 6 0
         * ```
         *
         * will return compact 1D array `[1, 2, 3, 4, 5, 6]`
         *
         * length is S(i=0, n=sideSize-1) => 6 for a 4 side sized matrix
         *
         * @returns {number[]}
         */
        toCompact() {
          const { diagonalSize } = this;
          const compactLength = (diagonalSize - 1) * diagonalSize / 2;
          const compact = new Array(compactLength);
          for (let col = 1, row = 0, index = 0; index < compact.length; index++) {
            compact[index] = this.get(row, col);
            if (++col >= diagonalSize) col = ++row + 1;
          }
          return compact;
        }
        /**
         * @param {number[]} compact
         */
        static fromCompact(compact) {
          const compactSize = compact.length;
          if (compactSize === 0) {
            return new this(0);
          }
          const diagonalSize = (Math.sqrt(8 * compactSize + 1) + 1) / 2;
          if (!Number.isInteger(diagonalSize)) {
            throw new TypeError(
              `This array is not a compact representation of a DistanceMatrix, ${JSON.stringify(
                compact
              )}`
            );
          }
          const matrix2 = new this(diagonalSize);
          for (let col = 1, row = 0, index = 0; index < compactSize; index++) {
            matrix2.set(col, row, compact[index]);
            if (++col >= diagonalSize) col = ++row + 1;
          }
          return matrix2;
        }
      };
      DistanceMatrix2.prototype.klassSubType = "DistanceMatrix";
      var BaseView = class extends AbstractMatrix2 {
        constructor(matrix2, rows, columns2) {
          super();
          this.matrix = matrix2;
          this.rows = rows;
          this.columns = columns2;
        }
      };
      var MatrixColumnView2 = class extends BaseView {
        constructor(matrix2, column) {
          checkColumnIndex(matrix2, column);
          super(matrix2, matrix2.rows, 1);
          this.column = column;
        }
        set(rowIndex, columnIndex, value) {
          this.matrix.set(rowIndex, this.column, value);
          return this;
        }
        get(rowIndex) {
          return this.matrix.get(rowIndex, this.column);
        }
      };
      var MatrixColumnSelectionView2 = class extends BaseView {
        constructor(matrix2, columnIndices) {
          checkColumnIndices(matrix2, columnIndices);
          super(matrix2, matrix2.rows, columnIndices.length);
          this.columnIndices = columnIndices;
        }
        set(rowIndex, columnIndex, value) {
          this.matrix.set(rowIndex, this.columnIndices[columnIndex], value);
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.matrix.get(rowIndex, this.columnIndices[columnIndex]);
        }
      };
      var MatrixFlipColumnView2 = class extends BaseView {
        constructor(matrix2) {
          super(matrix2, matrix2.rows, matrix2.columns);
        }
        set(rowIndex, columnIndex, value) {
          this.matrix.set(rowIndex, this.columns - columnIndex - 1, value);
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.matrix.get(rowIndex, this.columns - columnIndex - 1);
        }
      };
      var MatrixFlipRowView2 = class extends BaseView {
        constructor(matrix2) {
          super(matrix2, matrix2.rows, matrix2.columns);
        }
        set(rowIndex, columnIndex, value) {
          this.matrix.set(this.rows - rowIndex - 1, columnIndex, value);
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.matrix.get(this.rows - rowIndex - 1, columnIndex);
        }
      };
      var MatrixRowView2 = class extends BaseView {
        constructor(matrix2, row) {
          checkRowIndex(matrix2, row);
          super(matrix2, 1, matrix2.columns);
          this.row = row;
        }
        set(rowIndex, columnIndex, value) {
          this.matrix.set(this.row, columnIndex, value);
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.matrix.get(this.row, columnIndex);
        }
      };
      var MatrixRowSelectionView2 = class extends BaseView {
        constructor(matrix2, rowIndices) {
          checkRowIndices(matrix2, rowIndices);
          super(matrix2, rowIndices.length, matrix2.columns);
          this.rowIndices = rowIndices;
        }
        set(rowIndex, columnIndex, value) {
          this.matrix.set(this.rowIndices[rowIndex], columnIndex, value);
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.matrix.get(this.rowIndices[rowIndex], columnIndex);
        }
      };
      var MatrixSelectionView2 = class extends BaseView {
        constructor(matrix2, rowIndices, columnIndices) {
          checkRowIndices(matrix2, rowIndices);
          checkColumnIndices(matrix2, columnIndices);
          super(matrix2, rowIndices.length, columnIndices.length);
          this.rowIndices = rowIndices;
          this.columnIndices = columnIndices;
        }
        set(rowIndex, columnIndex, value) {
          this.matrix.set(
            this.rowIndices[rowIndex],
            this.columnIndices[columnIndex],
            value
          );
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.matrix.get(
            this.rowIndices[rowIndex],
            this.columnIndices[columnIndex]
          );
        }
      };
      var MatrixSubView2 = class extends BaseView {
        constructor(matrix2, startRow, endRow, startColumn, endColumn) {
          checkRange(matrix2, startRow, endRow, startColumn, endColumn);
          super(matrix2, endRow - startRow + 1, endColumn - startColumn + 1);
          this.startRow = startRow;
          this.startColumn = startColumn;
        }
        set(rowIndex, columnIndex, value) {
          this.matrix.set(
            this.startRow + rowIndex,
            this.startColumn + columnIndex,
            value
          );
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.matrix.get(
            this.startRow + rowIndex,
            this.startColumn + columnIndex
          );
        }
      };
      var MatrixTransposeView2 = class extends BaseView {
        constructor(matrix2) {
          super(matrix2, matrix2.columns, matrix2.rows);
        }
        set(rowIndex, columnIndex, value) {
          this.matrix.set(columnIndex, rowIndex, value);
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.matrix.get(columnIndex, rowIndex);
        }
      };
      var WrapperMatrix1D2 = class extends AbstractMatrix2 {
        constructor(data2, options = {}) {
          const { rows = 1 } = options;
          if (data2.length % rows !== 0) {
            throw new Error("the data length is not divisible by the number of rows");
          }
          super();
          this.rows = rows;
          this.columns = data2.length / rows;
          this.data = data2;
        }
        set(rowIndex, columnIndex, value) {
          let index = this._calculateIndex(rowIndex, columnIndex);
          this.data[index] = value;
          return this;
        }
        get(rowIndex, columnIndex) {
          let index = this._calculateIndex(rowIndex, columnIndex);
          return this.data[index];
        }
        _calculateIndex(row, column) {
          return row * this.columns + column;
        }
      };
      var WrapperMatrix2D2 = class extends AbstractMatrix2 {
        constructor(data2) {
          super();
          this.data = data2;
          this.rows = data2.length;
          this.columns = data2[0].length;
        }
        set(rowIndex, columnIndex, value) {
          this.data[rowIndex][columnIndex] = value;
          return this;
        }
        get(rowIndex, columnIndex) {
          return this.data[rowIndex][columnIndex];
        }
      };
      function wrap2(array3, options) {
        if (isAnyArray.isAnyArray(array3)) {
          if (array3[0] && isAnyArray.isAnyArray(array3[0])) {
            return new WrapperMatrix2D2(array3);
          } else {
            return new WrapperMatrix1D2(array3, options);
          }
        } else {
          throw new Error("the argument is not an array");
        }
      }
      var LuDecomposition2 = class {
        constructor(matrix2) {
          matrix2 = WrapperMatrix2D2.checkMatrix(matrix2);
          let lu = matrix2.clone();
          let rows = lu.rows;
          let columns2 = lu.columns;
          let pivotVector = new Float64Array(rows);
          let pivotSign = 1;
          let i, j, k, p, s, t, v2;
          let LUcolj, kmax;
          for (i = 0; i < rows; i++) {
            pivotVector[i] = i;
          }
          LUcolj = new Float64Array(rows);
          for (j = 0; j < columns2; j++) {
            for (i = 0; i < rows; i++) {
              LUcolj[i] = lu.get(i, j);
            }
            for (i = 0; i < rows; i++) {
              kmax = Math.min(i, j);
              s = 0;
              for (k = 0; k < kmax; k++) {
                s += lu.get(i, k) * LUcolj[k];
              }
              LUcolj[i] -= s;
              lu.set(i, j, LUcolj[i]);
            }
            p = j;
            for (i = j + 1; i < rows; i++) {
              if (Math.abs(LUcolj[i]) > Math.abs(LUcolj[p])) {
                p = i;
              }
            }
            if (p !== j) {
              for (k = 0; k < columns2; k++) {
                t = lu.get(p, k);
                lu.set(p, k, lu.get(j, k));
                lu.set(j, k, t);
              }
              v2 = pivotVector[p];
              pivotVector[p] = pivotVector[j];
              pivotVector[j] = v2;
              pivotSign = -pivotSign;
            }
            if (j < rows && lu.get(j, j) !== 0) {
              for (i = j + 1; i < rows; i++) {
                lu.set(i, j, lu.get(i, j) / lu.get(j, j));
              }
            }
          }
          this.LU = lu;
          this.pivotVector = pivotVector;
          this.pivotSign = pivotSign;
        }
        isSingular() {
          let data2 = this.LU;
          let col = data2.columns;
          for (let j = 0; j < col; j++) {
            if (data2.get(j, j) === 0) {
              return true;
            }
          }
          return false;
        }
        solve(value) {
          value = Matrix3.checkMatrix(value);
          let lu = this.LU;
          let rows = lu.rows;
          if (rows !== value.rows) {
            throw new Error("Invalid matrix dimensions");
          }
          if (this.isSingular()) {
            throw new Error("LU matrix is singular");
          }
          let count2 = value.columns;
          let X2 = value.subMatrixRow(this.pivotVector, 0, count2 - 1);
          let columns2 = lu.columns;
          let i, j, k;
          for (k = 0; k < columns2; k++) {
            for (i = k + 1; i < columns2; i++) {
              for (j = 0; j < count2; j++) {
                X2.set(i, j, X2.get(i, j) - X2.get(k, j) * lu.get(i, k));
              }
            }
          }
          for (k = columns2 - 1; k >= 0; k--) {
            for (j = 0; j < count2; j++) {
              X2.set(k, j, X2.get(k, j) / lu.get(k, k));
            }
            for (i = 0; i < k; i++) {
              for (j = 0; j < count2; j++) {
                X2.set(i, j, X2.get(i, j) - X2.get(k, j) * lu.get(i, k));
              }
            }
          }
          return X2;
        }
        get determinant() {
          let data2 = this.LU;
          if (!data2.isSquare()) {
            throw new Error("Matrix must be square");
          }
          let determinant3 = this.pivotSign;
          let col = data2.columns;
          for (let j = 0; j < col; j++) {
            determinant3 *= data2.get(j, j);
          }
          return determinant3;
        }
        get lowerTriangularMatrix() {
          let data2 = this.LU;
          let rows = data2.rows;
          let columns2 = data2.columns;
          let X2 = new Matrix3(rows, columns2);
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns2; j++) {
              if (i > j) {
                X2.set(i, j, data2.get(i, j));
              } else if (i === j) {
                X2.set(i, j, 1);
              } else {
                X2.set(i, j, 0);
              }
            }
          }
          return X2;
        }
        get upperTriangularMatrix() {
          let data2 = this.LU;
          let rows = data2.rows;
          let columns2 = data2.columns;
          let X2 = new Matrix3(rows, columns2);
          for (let i = 0; i < rows; i++) {
            for (let j = 0; j < columns2; j++) {
              if (i <= j) {
                X2.set(i, j, data2.get(i, j));
              } else {
                X2.set(i, j, 0);
              }
            }
          }
          return X2;
        }
        get pivotPermutationVector() {
          return Array.from(this.pivotVector);
        }
      };
      function hypotenuse(a, b) {
        let r = 0;
        if (Math.abs(a) > Math.abs(b)) {
          r = b / a;
          return Math.abs(a) * Math.sqrt(1 + r * r);
        }
        if (b !== 0) {
          r = a / b;
          return Math.abs(b) * Math.sqrt(1 + r * r);
        }
        return 0;
      }
      var QrDecomposition3 = class {
        constructor(value) {
          value = WrapperMatrix2D2.checkMatrix(value);
          let qr = value.clone();
          let m = value.rows;
          let n = value.columns;
          let rdiag = new Float64Array(n);
          let i, j, k, s;
          for (k = 0; k < n; k++) {
            let nrm = 0;
            for (i = k; i < m; i++) {
              nrm = hypotenuse(nrm, qr.get(i, k));
            }
            if (nrm !== 0) {
              if (qr.get(k, k) < 0) {
                nrm = -nrm;
              }
              for (i = k; i < m; i++) {
                qr.set(i, k, qr.get(i, k) / nrm);
              }
              qr.set(k, k, qr.get(k, k) + 1);
              for (j = k + 1; j < n; j++) {
                s = 0;
                for (i = k; i < m; i++) {
                  s += qr.get(i, k) * qr.get(i, j);
                }
                s = -s / qr.get(k, k);
                for (i = k; i < m; i++) {
                  qr.set(i, j, qr.get(i, j) + s * qr.get(i, k));
                }
              }
            }
            rdiag[k] = -nrm;
          }
          this.QR = qr;
          this.Rdiag = rdiag;
        }
        solve(value) {
          value = Matrix3.checkMatrix(value);
          let qr = this.QR;
          let m = qr.rows;
          if (value.rows !== m) {
            throw new Error("Matrix row dimensions must agree");
          }
          if (!this.isFullRank()) {
            throw new Error("Matrix is rank deficient");
          }
          let count2 = value.columns;
          let X2 = value.clone();
          let n = qr.columns;
          let i, j, k, s;
          for (k = 0; k < n; k++) {
            for (j = 0; j < count2; j++) {
              s = 0;
              for (i = k; i < m; i++) {
                s += qr.get(i, k) * X2.get(i, j);
              }
              s = -s / qr.get(k, k);
              for (i = k; i < m; i++) {
                X2.set(i, j, X2.get(i, j) + s * qr.get(i, k));
              }
            }
          }
          for (k = n - 1; k >= 0; k--) {
            for (j = 0; j < count2; j++) {
              X2.set(k, j, X2.get(k, j) / this.Rdiag[k]);
            }
            for (i = 0; i < k; i++) {
              for (j = 0; j < count2; j++) {
                X2.set(i, j, X2.get(i, j) - X2.get(k, j) * qr.get(i, k));
              }
            }
          }
          return X2.subMatrix(0, n - 1, 0, count2 - 1);
        }
        isFullRank() {
          let columns2 = this.QR.columns;
          for (let i = 0; i < columns2; i++) {
            if (this.Rdiag[i] === 0) {
              return false;
            }
          }
          return true;
        }
        get upperTriangularMatrix() {
          let qr = this.QR;
          let n = qr.columns;
          let X2 = new Matrix3(n, n);
          let i, j;
          for (i = 0; i < n; i++) {
            for (j = 0; j < n; j++) {
              if (i < j) {
                X2.set(i, j, qr.get(i, j));
              } else if (i === j) {
                X2.set(i, j, this.Rdiag[i]);
              } else {
                X2.set(i, j, 0);
              }
            }
          }
          return X2;
        }
        get orthogonalMatrix() {
          let qr = this.QR;
          let rows = qr.rows;
          let columns2 = qr.columns;
          let X2 = new Matrix3(rows, columns2);
          let i, j, k, s;
          for (k = columns2 - 1; k >= 0; k--) {
            for (i = 0; i < rows; i++) {
              X2.set(i, k, 0);
            }
            X2.set(k, k, 1);
            for (j = k; j < columns2; j++) {
              if (qr.get(k, k) !== 0) {
                s = 0;
                for (i = k; i < rows; i++) {
                  s += qr.get(i, k) * X2.get(i, j);
                }
                s = -s / qr.get(k, k);
                for (i = k; i < rows; i++) {
                  X2.set(i, j, X2.get(i, j) + s * qr.get(i, k));
                }
              }
            }
          }
          return X2;
        }
      };
      var SingularValueDecomposition2 = class {
        constructor(value, options = {}) {
          value = WrapperMatrix2D2.checkMatrix(value);
          if (value.isEmpty()) {
            throw new Error("Matrix must be non-empty");
          }
          let m = value.rows;
          let n = value.columns;
          const {
            computeLeftSingularVectors = true,
            computeRightSingularVectors = true,
            autoTranspose = false
          } = options;
          let wantu = Boolean(computeLeftSingularVectors);
          let wantv = Boolean(computeRightSingularVectors);
          let swapped = false;
          let a;
          if (m < n) {
            if (!autoTranspose) {
              a = value.clone();
              console.warn(
                "Computing SVD on a matrix with more columns than rows. Consider enabling autoTranspose"
              );
            } else {
              a = value.transpose();
              m = a.rows;
              n = a.columns;
              swapped = true;
              let aux = wantu;
              wantu = wantv;
              wantv = aux;
            }
          } else {
            a = value.clone();
          }
          let nu = Math.min(m, n);
          let ni = Math.min(m + 1, n);
          let s = new Float64Array(ni);
          let U = new Matrix3(m, nu);
          let V = new Matrix3(n, n);
          let e = new Float64Array(n);
          let work = new Float64Array(m);
          let si = new Float64Array(ni);
          for (let i = 0; i < ni; i++) si[i] = i;
          let nct = Math.min(m - 1, n);
          let nrt = Math.max(0, Math.min(n - 2, m));
          let mrc = Math.max(nct, nrt);
          for (let k = 0; k < mrc; k++) {
            if (k < nct) {
              s[k] = 0;
              for (let i = k; i < m; i++) {
                s[k] = hypotenuse(s[k], a.get(i, k));
              }
              if (s[k] !== 0) {
                if (a.get(k, k) < 0) {
                  s[k] = -s[k];
                }
                for (let i = k; i < m; i++) {
                  a.set(i, k, a.get(i, k) / s[k]);
                }
                a.set(k, k, a.get(k, k) + 1);
              }
              s[k] = -s[k];
            }
            for (let j = k + 1; j < n; j++) {
              if (k < nct && s[k] !== 0) {
                let t = 0;
                for (let i = k; i < m; i++) {
                  t += a.get(i, k) * a.get(i, j);
                }
                t = -t / a.get(k, k);
                for (let i = k; i < m; i++) {
                  a.set(i, j, a.get(i, j) + t * a.get(i, k));
                }
              }
              e[j] = a.get(k, j);
            }
            if (wantu && k < nct) {
              for (let i = k; i < m; i++) {
                U.set(i, k, a.get(i, k));
              }
            }
            if (k < nrt) {
              e[k] = 0;
              for (let i = k + 1; i < n; i++) {
                e[k] = hypotenuse(e[k], e[i]);
              }
              if (e[k] !== 0) {
                if (e[k + 1] < 0) {
                  e[k] = 0 - e[k];
                }
                for (let i = k + 1; i < n; i++) {
                  e[i] /= e[k];
                }
                e[k + 1] += 1;
              }
              e[k] = -e[k];
              if (k + 1 < m && e[k] !== 0) {
                for (let i = k + 1; i < m; i++) {
                  work[i] = 0;
                }
                for (let i = k + 1; i < m; i++) {
                  for (let j = k + 1; j < n; j++) {
                    work[i] += e[j] * a.get(i, j);
                  }
                }
                for (let j = k + 1; j < n; j++) {
                  let t = -e[j] / e[k + 1];
                  for (let i = k + 1; i < m; i++) {
                    a.set(i, j, a.get(i, j) + t * work[i]);
                  }
                }
              }
              if (wantv) {
                for (let i = k + 1; i < n; i++) {
                  V.set(i, k, e[i]);
                }
              }
            }
          }
          let p = Math.min(n, m + 1);
          if (nct < n) {
            s[nct] = a.get(nct, nct);
          }
          if (m < p) {
            s[p - 1] = 0;
          }
          if (nrt + 1 < p) {
            e[nrt] = a.get(nrt, p - 1);
          }
          e[p - 1] = 0;
          if (wantu) {
            for (let j = nct; j < nu; j++) {
              for (let i = 0; i < m; i++) {
                U.set(i, j, 0);
              }
              U.set(j, j, 1);
            }
            for (let k = nct - 1; k >= 0; k--) {
              if (s[k] !== 0) {
                for (let j = k + 1; j < nu; j++) {
                  let t = 0;
                  for (let i = k; i < m; i++) {
                    t += U.get(i, k) * U.get(i, j);
                  }
                  t = -t / U.get(k, k);
                  for (let i = k; i < m; i++) {
                    U.set(i, j, U.get(i, j) + t * U.get(i, k));
                  }
                }
                for (let i = k; i < m; i++) {
                  U.set(i, k, -U.get(i, k));
                }
                U.set(k, k, 1 + U.get(k, k));
                for (let i = 0; i < k - 1; i++) {
                  U.set(i, k, 0);
                }
              } else {
                for (let i = 0; i < m; i++) {
                  U.set(i, k, 0);
                }
                U.set(k, k, 1);
              }
            }
          }
          if (wantv) {
            for (let k = n - 1; k >= 0; k--) {
              if (k < nrt && e[k] !== 0) {
                for (let j = k + 1; j < n; j++) {
                  let t = 0;
                  for (let i = k + 1; i < n; i++) {
                    t += V.get(i, k) * V.get(i, j);
                  }
                  t = -t / V.get(k + 1, k);
                  for (let i = k + 1; i < n; i++) {
                    V.set(i, j, V.get(i, j) + t * V.get(i, k));
                  }
                }
              }
              for (let i = 0; i < n; i++) {
                V.set(i, k, 0);
              }
              V.set(k, k, 1);
            }
          }
          let pp = p - 1;
          let eps = Number.EPSILON;
          while (p > 0) {
            let k, kase;
            for (k = p - 2; k >= -1; k--) {
              if (k === -1) {
                break;
              }
              const alpha = Number.MIN_VALUE + eps * Math.abs(s[k] + Math.abs(s[k + 1]));
              if (Math.abs(e[k]) <= alpha || Number.isNaN(e[k])) {
                e[k] = 0;
                break;
              }
            }
            if (k === p - 2) {
              kase = 4;
            } else {
              let ks;
              for (ks = p - 1; ks >= k; ks--) {
                if (ks === k) {
                  break;
                }
                let t = (ks !== p ? Math.abs(e[ks]) : 0) + (ks !== k + 1 ? Math.abs(e[ks - 1]) : 0);
                if (Math.abs(s[ks]) <= eps * t) {
                  s[ks] = 0;
                  break;
                }
              }
              if (ks === k) {
                kase = 3;
              } else if (ks === p - 1) {
                kase = 1;
              } else {
                kase = 2;
                k = ks;
              }
            }
            k++;
            switch (kase) {
              case 1: {
                let f = e[p - 2];
                e[p - 2] = 0;
                for (let j = p - 2; j >= k; j--) {
                  let t = hypotenuse(s[j], f);
                  let cs = s[j] / t;
                  let sn = f / t;
                  s[j] = t;
                  if (j !== k) {
                    f = -sn * e[j - 1];
                    e[j - 1] = cs * e[j - 1];
                  }
                  if (wantv) {
                    for (let i = 0; i < n; i++) {
                      t = cs * V.get(i, j) + sn * V.get(i, p - 1);
                      V.set(i, p - 1, -sn * V.get(i, j) + cs * V.get(i, p - 1));
                      V.set(i, j, t);
                    }
                  }
                }
                break;
              }
              case 2: {
                let f = e[k - 1];
                e[k - 1] = 0;
                for (let j = k; j < p; j++) {
                  let t = hypotenuse(s[j], f);
                  let cs = s[j] / t;
                  let sn = f / t;
                  s[j] = t;
                  f = -sn * e[j];
                  e[j] = cs * e[j];
                  if (wantu) {
                    for (let i = 0; i < m; i++) {
                      t = cs * U.get(i, j) + sn * U.get(i, k - 1);
                      U.set(i, k - 1, -sn * U.get(i, j) + cs * U.get(i, k - 1));
                      U.set(i, j, t);
                    }
                  }
                }
                break;
              }
              case 3: {
                const scale2 = Math.max(
                  Math.abs(s[p - 1]),
                  Math.abs(s[p - 2]),
                  Math.abs(e[p - 2]),
                  Math.abs(s[k]),
                  Math.abs(e[k])
                );
                const sp = s[p - 1] / scale2;
                const spm1 = s[p - 2] / scale2;
                const epm1 = e[p - 2] / scale2;
                const sk = s[k] / scale2;
                const ek = e[k] / scale2;
                const b = ((spm1 + sp) * (spm1 - sp) + epm1 * epm1) / 2;
                const c = sp * epm1 * (sp * epm1);
                let shift = 0;
                if (b !== 0 || c !== 0) {
                  if (b < 0) {
                    shift = 0 - Math.sqrt(b * b + c);
                  } else {
                    shift = Math.sqrt(b * b + c);
                  }
                  shift = c / (b + shift);
                }
                let f = (sk + sp) * (sk - sp) + shift;
                let g = sk * ek;
                for (let j = k; j < p - 1; j++) {
                  let t = hypotenuse(f, g);
                  if (t === 0) t = Number.MIN_VALUE;
                  let cs = f / t;
                  let sn = g / t;
                  if (j !== k) {
                    e[j - 1] = t;
                  }
                  f = cs * s[j] + sn * e[j];
                  e[j] = cs * e[j] - sn * s[j];
                  g = sn * s[j + 1];
                  s[j + 1] = cs * s[j + 1];
                  if (wantv) {
                    for (let i = 0; i < n; i++) {
                      t = cs * V.get(i, j) + sn * V.get(i, j + 1);
                      V.set(i, j + 1, -sn * V.get(i, j) + cs * V.get(i, j + 1));
                      V.set(i, j, t);
                    }
                  }
                  t = hypotenuse(f, g);
                  if (t === 0) t = Number.MIN_VALUE;
                  cs = f / t;
                  sn = g / t;
                  s[j] = t;
                  f = cs * e[j] + sn * s[j + 1];
                  s[j + 1] = -sn * e[j] + cs * s[j + 1];
                  g = sn * e[j + 1];
                  e[j + 1] = cs * e[j + 1];
                  if (wantu && j < m - 1) {
                    for (let i = 0; i < m; i++) {
                      t = cs * U.get(i, j) + sn * U.get(i, j + 1);
                      U.set(i, j + 1, -sn * U.get(i, j) + cs * U.get(i, j + 1));
                      U.set(i, j, t);
                    }
                  }
                }
                e[p - 2] = f;
                break;
              }
              case 4: {
                if (s[k] <= 0) {
                  s[k] = s[k] < 0 ? -s[k] : 0;
                  if (wantv) {
                    for (let i = 0; i <= pp; i++) {
                      V.set(i, k, -V.get(i, k));
                    }
                  }
                }
                while (k < pp) {
                  if (s[k] >= s[k + 1]) {
                    break;
                  }
                  let t = s[k];
                  s[k] = s[k + 1];
                  s[k + 1] = t;
                  if (wantv && k < n - 1) {
                    for (let i = 0; i < n; i++) {
                      t = V.get(i, k + 1);
                      V.set(i, k + 1, V.get(i, k));
                      V.set(i, k, t);
                    }
                  }
                  if (wantu && k < m - 1) {
                    for (let i = 0; i < m; i++) {
                      t = U.get(i, k + 1);
                      U.set(i, k + 1, U.get(i, k));
                      U.set(i, k, t);
                    }
                  }
                  k++;
                }
                p--;
                break;
              }
            }
          }
          if (swapped) {
            let tmp = V;
            V = U;
            U = tmp;
          }
          this.m = m;
          this.n = n;
          this.s = s;
          this.U = U;
          this.V = V;
        }
        solve(value) {
          let Y2 = value;
          let e = this.threshold;
          let scols = this.s.length;
          let Ls = Matrix3.zeros(scols, scols);
          for (let i = 0; i < scols; i++) {
            if (Math.abs(this.s[i]) <= e) {
              Ls.set(i, i, 0);
            } else {
              Ls.set(i, i, 1 / this.s[i]);
            }
          }
          let U = this.U;
          let V = this.rightSingularVectors;
          let VL = V.mmul(Ls);
          let vrows = V.rows;
          let urows = U.rows;
          let VLU = Matrix3.zeros(vrows, urows);
          for (let i = 0; i < vrows; i++) {
            for (let j = 0; j < urows; j++) {
              let sum2 = 0;
              for (let k = 0; k < scols; k++) {
                sum2 += VL.get(i, k) * U.get(j, k);
              }
              VLU.set(i, j, sum2);
            }
          }
          return VLU.mmul(Y2);
        }
        solveForDiagonal(value) {
          return this.solve(Matrix3.diag(value));
        }
        inverse() {
          let V = this.V;
          let e = this.threshold;
          let vrows = V.rows;
          let vcols = V.columns;
          let X2 = new Matrix3(vrows, this.s.length);
          for (let i = 0; i < vrows; i++) {
            for (let j = 0; j < vcols; j++) {
              if (Math.abs(this.s[j]) > e) {
                X2.set(i, j, V.get(i, j) / this.s[j]);
              }
            }
          }
          let U = this.U;
          let urows = U.rows;
          let ucols = U.columns;
          let Y2 = new Matrix3(vrows, urows);
          for (let i = 0; i < vrows; i++) {
            for (let j = 0; j < urows; j++) {
              let sum2 = 0;
              for (let k = 0; k < ucols; k++) {
                sum2 += X2.get(i, k) * U.get(j, k);
              }
              Y2.set(i, j, sum2);
            }
          }
          return Y2;
        }
        get condition() {
          return this.s[0] / this.s[Math.min(this.m, this.n) - 1];
        }
        get norm2() {
          return this.s[0];
        }
        get rank() {
          let tol = Math.max(this.m, this.n) * this.s[0] * Number.EPSILON;
          let r = 0;
          let s = this.s;
          for (let i = 0, ii = s.length; i < ii; i++) {
            if (s[i] > tol) {
              r++;
            }
          }
          return r;
        }
        get diagonal() {
          return Array.from(this.s);
        }
        get threshold() {
          return Number.EPSILON / 2 * Math.max(this.m, this.n) * this.s[0];
        }
        get leftSingularVectors() {
          return this.U;
        }
        get rightSingularVectors() {
          return this.V;
        }
        get diagonalMatrix() {
          return Matrix3.diag(this.s);
        }
      };
      function inverse2(matrix2, useSVD = false) {
        matrix2 = WrapperMatrix2D2.checkMatrix(matrix2);
        if (useSVD) {
          return new SingularValueDecomposition2(matrix2).inverse();
        } else {
          return solve3(matrix2, Matrix3.eye(matrix2.rows));
        }
      }
      function solve3(leftHandSide, rightHandSide, useSVD = false) {
        leftHandSide = WrapperMatrix2D2.checkMatrix(leftHandSide);
        rightHandSide = WrapperMatrix2D2.checkMatrix(rightHandSide);
        if (useSVD) {
          return new SingularValueDecomposition2(leftHandSide).solve(rightHandSide);
        } else {
          return leftHandSide.isSquare() ? new LuDecomposition2(leftHandSide).solve(rightHandSide) : new QrDecomposition3(leftHandSide).solve(rightHandSide);
        }
      }
      function determinant2(matrix2) {
        matrix2 = Matrix3.checkMatrix(matrix2);
        if (matrix2.isSquare()) {
          if (matrix2.columns === 0) {
            return 1;
          }
          let a, b, c, d;
          if (matrix2.columns === 2) {
            a = matrix2.get(0, 0);
            b = matrix2.get(0, 1);
            c = matrix2.get(1, 0);
            d = matrix2.get(1, 1);
            return a * d - b * c;
          } else if (matrix2.columns === 3) {
            let subMatrix0, subMatrix1, subMatrix2;
            subMatrix0 = new MatrixSelectionView2(matrix2, [1, 2], [1, 2]);
            subMatrix1 = new MatrixSelectionView2(matrix2, [1, 2], [0, 2]);
            subMatrix2 = new MatrixSelectionView2(matrix2, [1, 2], [0, 1]);
            a = matrix2.get(0, 0);
            b = matrix2.get(0, 1);
            c = matrix2.get(0, 2);
            return a * determinant2(subMatrix0) - b * determinant2(subMatrix1) + c * determinant2(subMatrix2);
          } else {
            return new LuDecomposition2(matrix2).determinant;
          }
        } else {
          throw Error("determinant can only be calculated for a square matrix");
        }
      }
      function xrange(n, exception) {
        let range2 = [];
        for (let i = 0; i < n; i++) {
          if (i !== exception) {
            range2.push(i);
          }
        }
        return range2;
      }
      function dependenciesOneRow(error, matrix2, index, thresholdValue = 1e-9, thresholdError = 1e-9) {
        if (error > thresholdError) {
          return new Array(matrix2.rows + 1).fill(0);
        } else {
          let returnArray = matrix2.addRow(index, [0]);
          for (let i = 0; i < returnArray.rows; i++) {
            if (Math.abs(returnArray.get(i, 0)) < thresholdValue) {
              returnArray.set(i, 0, 0);
            }
          }
          return returnArray.to1DArray();
        }
      }
      function linearDependencies2(matrix2, options = {}) {
        const { thresholdValue = 1e-9, thresholdError = 1e-9 } = options;
        matrix2 = Matrix3.checkMatrix(matrix2);
        let n = matrix2.rows;
        let results = new Matrix3(n, n);
        for (let i = 0; i < n; i++) {
          let b = Matrix3.columnVector(matrix2.getRow(i));
          let Abis = matrix2.subMatrixRow(xrange(n, i)).transpose();
          let svd = new SingularValueDecomposition2(Abis);
          let x2 = svd.solve(b);
          let error = Matrix3.sub(b, Abis.mmul(x2)).abs().max();
          results.setRow(
            i,
            dependenciesOneRow(error, x2, i, thresholdValue, thresholdError)
          );
        }
        return results;
      }
      function pseudoInverse2(matrix2, threshold = Number.EPSILON) {
        matrix2 = Matrix3.checkMatrix(matrix2);
        if (matrix2.isEmpty()) {
          return matrix2.transpose();
        }
        let svdSolution = new SingularValueDecomposition2(matrix2, { autoTranspose: true });
        let U = svdSolution.leftSingularVectors;
        let V = svdSolution.rightSingularVectors;
        let s = svdSolution.diagonal;
        for (let i = 0; i < s.length; i++) {
          if (Math.abs(s[i]) > threshold) {
            s[i] = 1 / s[i];
          } else {
            s[i] = 0;
          }
        }
        return V.mmul(Matrix3.diag(s).mmul(U.transpose()));
      }
      function covariance2(xMatrix, yMatrix = xMatrix, options = {}) {
        xMatrix = new Matrix3(xMatrix);
        let yIsSame = false;
        if (typeof yMatrix === "object" && !Matrix3.isMatrix(yMatrix) && !isAnyArray.isAnyArray(yMatrix)) {
          options = yMatrix;
          yMatrix = xMatrix;
          yIsSame = true;
        } else {
          yMatrix = new Matrix3(yMatrix);
        }
        if (xMatrix.rows !== yMatrix.rows) {
          throw new TypeError("Both matrices must have the same number of rows");
        }
        const { center = true } = options;
        if (center) {
          xMatrix = xMatrix.center("column");
          if (!yIsSame) {
            yMatrix = yMatrix.center("column");
          }
        }
        const cov = xMatrix.transpose().mmul(yMatrix);
        for (let i = 0; i < cov.rows; i++) {
          for (let j = 0; j < cov.columns; j++) {
            cov.set(i, j, cov.get(i, j) * (1 / (xMatrix.rows - 1)));
          }
        }
        return cov;
      }
      function correlation2(xMatrix, yMatrix = xMatrix, options = {}) {
        xMatrix = new Matrix3(xMatrix);
        let yIsSame = false;
        if (typeof yMatrix === "object" && !Matrix3.isMatrix(yMatrix) && !isAnyArray.isAnyArray(yMatrix)) {
          options = yMatrix;
          yMatrix = xMatrix;
          yIsSame = true;
        } else {
          yMatrix = new Matrix3(yMatrix);
        }
        if (xMatrix.rows !== yMatrix.rows) {
          throw new TypeError("Both matrices must have the same number of rows");
        }
        const { center = true, scale: scale2 = true } = options;
        if (center) {
          xMatrix.center("column");
          if (!yIsSame) {
            yMatrix.center("column");
          }
        }
        if (scale2) {
          xMatrix.scale("column");
          if (!yIsSame) {
            yMatrix.scale("column");
          }
        }
        const sdx = xMatrix.standardDeviation("column", { unbiased: true });
        const sdy = yIsSame ? sdx : yMatrix.standardDeviation("column", { unbiased: true });
        const corr = xMatrix.transpose().mmul(yMatrix);
        for (let i = 0; i < corr.rows; i++) {
          for (let j = 0; j < corr.columns; j++) {
            corr.set(
              i,
              j,
              corr.get(i, j) * (1 / (sdx[i] * sdy[j])) * (1 / (xMatrix.rows - 1))
            );
          }
        }
        return corr;
      }
      var EigenvalueDecomposition2 = class {
        constructor(matrix2, options = {}) {
          const { assumeSymmetric = false } = options;
          matrix2 = WrapperMatrix2D2.checkMatrix(matrix2);
          if (!matrix2.isSquare()) {
            throw new Error("Matrix is not a square matrix");
          }
          if (matrix2.isEmpty()) {
            throw new Error("Matrix must be non-empty");
          }
          let n = matrix2.columns;
          let V = new Matrix3(n, n);
          let d = new Float64Array(n);
          let e = new Float64Array(n);
          let value = matrix2;
          let i, j;
          let isSymmetric = false;
          if (assumeSymmetric) {
            isSymmetric = true;
          } else {
            isSymmetric = matrix2.isSymmetric();
          }
          if (isSymmetric) {
            for (i = 0; i < n; i++) {
              for (j = 0; j < n; j++) {
                V.set(i, j, value.get(i, j));
              }
            }
            tred2(n, e, d, V);
            tql2(n, e, d, V);
          } else {
            let H = new Matrix3(n, n);
            let ort = new Float64Array(n);
            for (j = 0; j < n; j++) {
              for (i = 0; i < n; i++) {
                H.set(i, j, value.get(i, j));
              }
            }
            orthes(n, H, ort, V);
            hqr2(n, e, d, V, H);
          }
          this.n = n;
          this.e = e;
          this.d = d;
          this.V = V;
        }
        get realEigenvalues() {
          return Array.from(this.d);
        }
        get imaginaryEigenvalues() {
          return Array.from(this.e);
        }
        get eigenvectorMatrix() {
          return this.V;
        }
        get diagonalMatrix() {
          let n = this.n;
          let e = this.e;
          let d = this.d;
          let X2 = new Matrix3(n, n);
          let i, j;
          for (i = 0; i < n; i++) {
            for (j = 0; j < n; j++) {
              X2.set(i, j, 0);
            }
            X2.set(i, i, d[i]);
            if (e[i] > 0) {
              X2.set(i, i + 1, e[i]);
            } else if (e[i] < 0) {
              X2.set(i, i - 1, e[i]);
            }
          }
          return X2;
        }
      };
      function tred2(n, e, d, V) {
        let f, g, h, i, j, k, hh, scale2;
        for (j = 0; j < n; j++) {
          d[j] = V.get(n - 1, j);
        }
        for (i = n - 1; i > 0; i--) {
          scale2 = 0;
          h = 0;
          for (k = 0; k < i; k++) {
            scale2 = scale2 + Math.abs(d[k]);
          }
          if (scale2 === 0) {
            e[i] = d[i - 1];
            for (j = 0; j < i; j++) {
              d[j] = V.get(i - 1, j);
              V.set(i, j, 0);
              V.set(j, i, 0);
            }
          } else {
            for (k = 0; k < i; k++) {
              d[k] /= scale2;
              h += d[k] * d[k];
            }
            f = d[i - 1];
            g = Math.sqrt(h);
            if (f > 0) {
              g = -g;
            }
            e[i] = scale2 * g;
            h = h - f * g;
            d[i - 1] = f - g;
            for (j = 0; j < i; j++) {
              e[j] = 0;
            }
            for (j = 0; j < i; j++) {
              f = d[j];
              V.set(j, i, f);
              g = e[j] + V.get(j, j) * f;
              for (k = j + 1; k <= i - 1; k++) {
                g += V.get(k, j) * d[k];
                e[k] += V.get(k, j) * f;
              }
              e[j] = g;
            }
            f = 0;
            for (j = 0; j < i; j++) {
              e[j] /= h;
              f += e[j] * d[j];
            }
            hh = f / (h + h);
            for (j = 0; j < i; j++) {
              e[j] -= hh * d[j];
            }
            for (j = 0; j < i; j++) {
              f = d[j];
              g = e[j];
              for (k = j; k <= i - 1; k++) {
                V.set(k, j, V.get(k, j) - (f * e[k] + g * d[k]));
              }
              d[j] = V.get(i - 1, j);
              V.set(i, j, 0);
            }
          }
          d[i] = h;
        }
        for (i = 0; i < n - 1; i++) {
          V.set(n - 1, i, V.get(i, i));
          V.set(i, i, 1);
          h = d[i + 1];
          if (h !== 0) {
            for (k = 0; k <= i; k++) {
              d[k] = V.get(k, i + 1) / h;
            }
            for (j = 0; j <= i; j++) {
              g = 0;
              for (k = 0; k <= i; k++) {
                g += V.get(k, i + 1) * V.get(k, j);
              }
              for (k = 0; k <= i; k++) {
                V.set(k, j, V.get(k, j) - g * d[k]);
              }
            }
          }
          for (k = 0; k <= i; k++) {
            V.set(k, i + 1, 0);
          }
        }
        for (j = 0; j < n; j++) {
          d[j] = V.get(n - 1, j);
          V.set(n - 1, j, 0);
        }
        V.set(n - 1, n - 1, 1);
        e[0] = 0;
      }
      function tql2(n, e, d, V) {
        let g, h, i, j, k, l, m, p, r, dl1, c, c2, c3, el1, s, s2;
        for (i = 1; i < n; i++) {
          e[i - 1] = e[i];
        }
        e[n - 1] = 0;
        let f = 0;
        let tst1 = 0;
        let eps = Number.EPSILON;
        for (l = 0; l < n; l++) {
          tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
          m = l;
          while (m < n) {
            if (Math.abs(e[m]) <= eps * tst1) {
              break;
            }
            m++;
          }
          if (m > l) {
            do {
              g = d[l];
              p = (d[l + 1] - g) / (2 * e[l]);
              r = hypotenuse(p, 1);
              if (p < 0) {
                r = -r;
              }
              d[l] = e[l] / (p + r);
              d[l + 1] = e[l] * (p + r);
              dl1 = d[l + 1];
              h = g - d[l];
              for (i = l + 2; i < n; i++) {
                d[i] -= h;
              }
              f = f + h;
              p = d[m];
              c = 1;
              c2 = c;
              c3 = c;
              el1 = e[l + 1];
              s = 0;
              s2 = 0;
              for (i = m - 1; i >= l; i--) {
                c3 = c2;
                c2 = c;
                s2 = s;
                g = c * e[i];
                h = c * p;
                r = hypotenuse(p, e[i]);
                e[i + 1] = s * r;
                s = e[i] / r;
                c = p / r;
                p = c * d[i] - s * g;
                d[i + 1] = h + s * (c * g + s * d[i]);
                for (k = 0; k < n; k++) {
                  h = V.get(k, i + 1);
                  V.set(k, i + 1, s * V.get(k, i) + c * h);
                  V.set(k, i, c * V.get(k, i) - s * h);
                }
              }
              p = -s * s2 * c3 * el1 * e[l] / dl1;
              e[l] = s * p;
              d[l] = c * p;
            } while (Math.abs(e[l]) > eps * tst1);
          }
          d[l] = d[l] + f;
          e[l] = 0;
        }
        for (i = 0; i < n - 1; i++) {
          k = i;
          p = d[i];
          for (j = i + 1; j < n; j++) {
            if (d[j] < p) {
              k = j;
              p = d[j];
            }
          }
          if (k !== i) {
            d[k] = d[i];
            d[i] = p;
            for (j = 0; j < n; j++) {
              p = V.get(j, i);
              V.set(j, i, V.get(j, k));
              V.set(j, k, p);
            }
          }
        }
      }
      function orthes(n, H, ort, V) {
        let low = 0;
        let high = n - 1;
        let f, g, h, i, j, m;
        let scale2;
        for (m = low + 1; m <= high - 1; m++) {
          scale2 = 0;
          for (i = m; i <= high; i++) {
            scale2 = scale2 + Math.abs(H.get(i, m - 1));
          }
          if (scale2 !== 0) {
            h = 0;
            for (i = high; i >= m; i--) {
              ort[i] = H.get(i, m - 1) / scale2;
              h += ort[i] * ort[i];
            }
            g = Math.sqrt(h);
            if (ort[m] > 0) {
              g = -g;
            }
            h = h - ort[m] * g;
            ort[m] = ort[m] - g;
            for (j = m; j < n; j++) {
              f = 0;
              for (i = high; i >= m; i--) {
                f += ort[i] * H.get(i, j);
              }
              f = f / h;
              for (i = m; i <= high; i++) {
                H.set(i, j, H.get(i, j) - f * ort[i]);
              }
            }
            for (i = 0; i <= high; i++) {
              f = 0;
              for (j = high; j >= m; j--) {
                f += ort[j] * H.get(i, j);
              }
              f = f / h;
              for (j = m; j <= high; j++) {
                H.set(i, j, H.get(i, j) - f * ort[j]);
              }
            }
            ort[m] = scale2 * ort[m];
            H.set(m, m - 1, scale2 * g);
          }
        }
        for (i = 0; i < n; i++) {
          for (j = 0; j < n; j++) {
            V.set(i, j, i === j ? 1 : 0);
          }
        }
        for (m = high - 1; m >= low + 1; m--) {
          if (H.get(m, m - 1) !== 0) {
            for (i = m + 1; i <= high; i++) {
              ort[i] = H.get(i, m - 1);
            }
            for (j = m; j <= high; j++) {
              g = 0;
              for (i = m; i <= high; i++) {
                g += ort[i] * V.get(i, j);
              }
              g = g / ort[m] / H.get(m, m - 1);
              for (i = m; i <= high; i++) {
                V.set(i, j, V.get(i, j) + g * ort[i]);
              }
            }
          }
        }
      }
      function hqr2(nn, e, d, V, H) {
        let n = nn - 1;
        let low = 0;
        let high = nn - 1;
        let eps = Number.EPSILON;
        let exshift = 0;
        let norm = 0;
        let p = 0;
        let q = 0;
        let r = 0;
        let s = 0;
        let z = 0;
        let iter = 0;
        let i, j, k, l, m, t, w, x2, y2;
        let ra, sa, vr, vi;
        let notlast, cdivres;
        for (i = 0; i < nn; i++) {
          if (i < low || i > high) {
            d[i] = H.get(i, i);
            e[i] = 0;
          }
          for (j = Math.max(i - 1, 0); j < nn; j++) {
            norm = norm + Math.abs(H.get(i, j));
          }
        }
        while (n >= low) {
          l = n;
          while (l > low) {
            s = Math.abs(H.get(l - 1, l - 1)) + Math.abs(H.get(l, l));
            if (s === 0) {
              s = norm;
            }
            if (Math.abs(H.get(l, l - 1)) < eps * s) {
              break;
            }
            l--;
          }
          if (l === n) {
            H.set(n, n, H.get(n, n) + exshift);
            d[n] = H.get(n, n);
            e[n] = 0;
            n--;
            iter = 0;
          } else if (l === n - 1) {
            w = H.get(n, n - 1) * H.get(n - 1, n);
            p = (H.get(n - 1, n - 1) - H.get(n, n)) / 2;
            q = p * p + w;
            z = Math.sqrt(Math.abs(q));
            H.set(n, n, H.get(n, n) + exshift);
            H.set(n - 1, n - 1, H.get(n - 1, n - 1) + exshift);
            x2 = H.get(n, n);
            if (q >= 0) {
              z = p >= 0 ? p + z : p - z;
              d[n - 1] = x2 + z;
              d[n] = d[n - 1];
              if (z !== 0) {
                d[n] = x2 - w / z;
              }
              e[n - 1] = 0;
              e[n] = 0;
              x2 = H.get(n, n - 1);
              s = Math.abs(x2) + Math.abs(z);
              p = x2 / s;
              q = z / s;
              r = Math.sqrt(p * p + q * q);
              p = p / r;
              q = q / r;
              for (j = n - 1; j < nn; j++) {
                z = H.get(n - 1, j);
                H.set(n - 1, j, q * z + p * H.get(n, j));
                H.set(n, j, q * H.get(n, j) - p * z);
              }
              for (i = 0; i <= n; i++) {
                z = H.get(i, n - 1);
                H.set(i, n - 1, q * z + p * H.get(i, n));
                H.set(i, n, q * H.get(i, n) - p * z);
              }
              for (i = low; i <= high; i++) {
                z = V.get(i, n - 1);
                V.set(i, n - 1, q * z + p * V.get(i, n));
                V.set(i, n, q * V.get(i, n) - p * z);
              }
            } else {
              d[n - 1] = x2 + p;
              d[n] = x2 + p;
              e[n - 1] = z;
              e[n] = -z;
            }
            n = n - 2;
            iter = 0;
          } else {
            x2 = H.get(n, n);
            y2 = 0;
            w = 0;
            if (l < n) {
              y2 = H.get(n - 1, n - 1);
              w = H.get(n, n - 1) * H.get(n - 1, n);
            }
            if (iter === 10) {
              exshift += x2;
              for (i = low; i <= n; i++) {
                H.set(i, i, H.get(i, i) - x2);
              }
              s = Math.abs(H.get(n, n - 1)) + Math.abs(H.get(n - 1, n - 2));
              x2 = y2 = 0.75 * s;
              w = -0.4375 * s * s;
            }
            if (iter === 30) {
              s = (y2 - x2) / 2;
              s = s * s + w;
              if (s > 0) {
                s = Math.sqrt(s);
                if (y2 < x2) {
                  s = -s;
                }
                s = x2 - w / ((y2 - x2) / 2 + s);
                for (i = low; i <= n; i++) {
                  H.set(i, i, H.get(i, i) - s);
                }
                exshift += s;
                x2 = y2 = w = 0.964;
              }
            }
            iter = iter + 1;
            m = n - 2;
            while (m >= l) {
              z = H.get(m, m);
              r = x2 - z;
              s = y2 - z;
              p = (r * s - w) / H.get(m + 1, m) + H.get(m, m + 1);
              q = H.get(m + 1, m + 1) - z - r - s;
              r = H.get(m + 2, m + 1);
              s = Math.abs(p) + Math.abs(q) + Math.abs(r);
              p = p / s;
              q = q / s;
              r = r / s;
              if (m === l) {
                break;
              }
              if (Math.abs(H.get(m, m - 1)) * (Math.abs(q) + Math.abs(r)) < eps * (Math.abs(p) * (Math.abs(H.get(m - 1, m - 1)) + Math.abs(z) + Math.abs(H.get(m + 1, m + 1))))) {
                break;
              }
              m--;
            }
            for (i = m + 2; i <= n; i++) {
              H.set(i, i - 2, 0);
              if (i > m + 2) {
                H.set(i, i - 3, 0);
              }
            }
            for (k = m; k <= n - 1; k++) {
              notlast = k !== n - 1;
              if (k !== m) {
                p = H.get(k, k - 1);
                q = H.get(k + 1, k - 1);
                r = notlast ? H.get(k + 2, k - 1) : 0;
                x2 = Math.abs(p) + Math.abs(q) + Math.abs(r);
                if (x2 !== 0) {
                  p = p / x2;
                  q = q / x2;
                  r = r / x2;
                }
              }
              if (x2 === 0) {
                break;
              }
              s = Math.sqrt(p * p + q * q + r * r);
              if (p < 0) {
                s = -s;
              }
              if (s !== 0) {
                if (k !== m) {
                  H.set(k, k - 1, -s * x2);
                } else if (l !== m) {
                  H.set(k, k - 1, -H.get(k, k - 1));
                }
                p = p + s;
                x2 = p / s;
                y2 = q / s;
                z = r / s;
                q = q / p;
                r = r / p;
                for (j = k; j < nn; j++) {
                  p = H.get(k, j) + q * H.get(k + 1, j);
                  if (notlast) {
                    p = p + r * H.get(k + 2, j);
                    H.set(k + 2, j, H.get(k + 2, j) - p * z);
                  }
                  H.set(k, j, H.get(k, j) - p * x2);
                  H.set(k + 1, j, H.get(k + 1, j) - p * y2);
                }
                for (i = 0; i <= Math.min(n, k + 3); i++) {
                  p = x2 * H.get(i, k) + y2 * H.get(i, k + 1);
                  if (notlast) {
                    p = p + z * H.get(i, k + 2);
                    H.set(i, k + 2, H.get(i, k + 2) - p * r);
                  }
                  H.set(i, k, H.get(i, k) - p);
                  H.set(i, k + 1, H.get(i, k + 1) - p * q);
                }
                for (i = low; i <= high; i++) {
                  p = x2 * V.get(i, k) + y2 * V.get(i, k + 1);
                  if (notlast) {
                    p = p + z * V.get(i, k + 2);
                    V.set(i, k + 2, V.get(i, k + 2) - p * r);
                  }
                  V.set(i, k, V.get(i, k) - p);
                  V.set(i, k + 1, V.get(i, k + 1) - p * q);
                }
              }
            }
          }
        }
        if (norm === 0) {
          return;
        }
        for (n = nn - 1; n >= 0; n--) {
          p = d[n];
          q = e[n];
          if (q === 0) {
            l = n;
            H.set(n, n, 1);
            for (i = n - 1; i >= 0; i--) {
              w = H.get(i, i) - p;
              r = 0;
              for (j = l; j <= n; j++) {
                r = r + H.get(i, j) * H.get(j, n);
              }
              if (e[i] < 0) {
                z = w;
                s = r;
              } else {
                l = i;
                if (e[i] === 0) {
                  H.set(i, n, w !== 0 ? -r / w : -r / (eps * norm));
                } else {
                  x2 = H.get(i, i + 1);
                  y2 = H.get(i + 1, i);
                  q = (d[i] - p) * (d[i] - p) + e[i] * e[i];
                  t = (x2 * s - z * r) / q;
                  H.set(i, n, t);
                  H.set(
                    i + 1,
                    n,
                    Math.abs(x2) > Math.abs(z) ? (-r - w * t) / x2 : (-s - y2 * t) / z
                  );
                }
                t = Math.abs(H.get(i, n));
                if (eps * t * t > 1) {
                  for (j = i; j <= n; j++) {
                    H.set(j, n, H.get(j, n) / t);
                  }
                }
              }
            }
          } else if (q < 0) {
            l = n - 1;
            if (Math.abs(H.get(n, n - 1)) > Math.abs(H.get(n - 1, n))) {
              H.set(n - 1, n - 1, q / H.get(n, n - 1));
              H.set(n - 1, n, -(H.get(n, n) - p) / H.get(n, n - 1));
            } else {
              cdivres = cdiv(0, -H.get(n - 1, n), H.get(n - 1, n - 1) - p, q);
              H.set(n - 1, n - 1, cdivres[0]);
              H.set(n - 1, n, cdivres[1]);
            }
            H.set(n, n - 1, 0);
            H.set(n, n, 1);
            for (i = n - 2; i >= 0; i--) {
              ra = 0;
              sa = 0;
              for (j = l; j <= n; j++) {
                ra = ra + H.get(i, j) * H.get(j, n - 1);
                sa = sa + H.get(i, j) * H.get(j, n);
              }
              w = H.get(i, i) - p;
              if (e[i] < 0) {
                z = w;
                r = ra;
                s = sa;
              } else {
                l = i;
                if (e[i] === 0) {
                  cdivres = cdiv(-ra, -sa, w, q);
                  H.set(i, n - 1, cdivres[0]);
                  H.set(i, n, cdivres[1]);
                } else {
                  x2 = H.get(i, i + 1);
                  y2 = H.get(i + 1, i);
                  vr = (d[i] - p) * (d[i] - p) + e[i] * e[i] - q * q;
                  vi = (d[i] - p) * 2 * q;
                  if (vr === 0 && vi === 0) {
                    vr = eps * norm * (Math.abs(w) + Math.abs(q) + Math.abs(x2) + Math.abs(y2) + Math.abs(z));
                  }
                  cdivres = cdiv(
                    x2 * r - z * ra + q * sa,
                    x2 * s - z * sa - q * ra,
                    vr,
                    vi
                  );
                  H.set(i, n - 1, cdivres[0]);
                  H.set(i, n, cdivres[1]);
                  if (Math.abs(x2) > Math.abs(z) + Math.abs(q)) {
                    H.set(
                      i + 1,
                      n - 1,
                      (-ra - w * H.get(i, n - 1) + q * H.get(i, n)) / x2
                    );
                    H.set(
                      i + 1,
                      n,
                      (-sa - w * H.get(i, n) - q * H.get(i, n - 1)) / x2
                    );
                  } else {
                    cdivres = cdiv(
                      -r - y2 * H.get(i, n - 1),
                      -s - y2 * H.get(i, n),
                      z,
                      q
                    );
                    H.set(i + 1, n - 1, cdivres[0]);
                    H.set(i + 1, n, cdivres[1]);
                  }
                }
                t = Math.max(Math.abs(H.get(i, n - 1)), Math.abs(H.get(i, n)));
                if (eps * t * t > 1) {
                  for (j = i; j <= n; j++) {
                    H.set(j, n - 1, H.get(j, n - 1) / t);
                    H.set(j, n, H.get(j, n) / t);
                  }
                }
              }
            }
          }
        }
        for (i = 0; i < nn; i++) {
          if (i < low || i > high) {
            for (j = i; j < nn; j++) {
              V.set(i, j, H.get(i, j));
            }
          }
        }
        for (j = nn - 1; j >= low; j--) {
          for (i = low; i <= high; i++) {
            z = 0;
            for (k = low; k <= Math.min(j, high); k++) {
              z = z + V.get(i, k) * H.get(k, j);
            }
            V.set(i, j, z);
          }
        }
      }
      function cdiv(xr, xi, yr, yi) {
        let r, d;
        if (Math.abs(yr) > Math.abs(yi)) {
          r = yi / yr;
          d = yr + r * yi;
          return [(xr + r * xi) / d, (xi - r * xr) / d];
        } else {
          r = yr / yi;
          d = yi + r * yr;
          return [(r * xr + xi) / d, (r * xi - xr) / d];
        }
      }
      var CholeskyDecomposition2 = class {
        constructor(value) {
          value = WrapperMatrix2D2.checkMatrix(value);
          if (!value.isSymmetric()) {
            throw new Error("Matrix is not symmetric");
          }
          let a = value;
          let dimension = a.rows;
          let l = new Matrix3(dimension, dimension);
          let positiveDefinite = true;
          let i, j, k;
          for (j = 0; j < dimension; j++) {
            let d = 0;
            for (k = 0; k < j; k++) {
              let s = 0;
              for (i = 0; i < k; i++) {
                s += l.get(k, i) * l.get(j, i);
              }
              s = (a.get(j, k) - s) / l.get(k, k);
              l.set(j, k, s);
              d = d + s * s;
            }
            d = a.get(j, j) - d;
            positiveDefinite &&= d > 0;
            l.set(j, j, Math.sqrt(Math.max(d, 0)));
            for (k = j + 1; k < dimension; k++) {
              l.set(j, k, 0);
            }
          }
          this.L = l;
          this.positiveDefinite = positiveDefinite;
        }
        isPositiveDefinite() {
          return this.positiveDefinite;
        }
        solve(value) {
          value = WrapperMatrix2D2.checkMatrix(value);
          let l = this.L;
          let dimension = l.rows;
          if (value.rows !== dimension) {
            throw new Error("Matrix dimensions do not match");
          }
          if (this.isPositiveDefinite() === false) {
            throw new Error("Matrix is not positive definite");
          }
          let count2 = value.columns;
          let B2 = value.clone();
          let i, j, k;
          for (k = 0; k < dimension; k++) {
            for (j = 0; j < count2; j++) {
              for (i = 0; i < k; i++) {
                B2.set(k, j, B2.get(k, j) - B2.get(i, j) * l.get(k, i));
              }
              B2.set(k, j, B2.get(k, j) / l.get(k, k));
            }
          }
          for (k = dimension - 1; k >= 0; k--) {
            for (j = 0; j < count2; j++) {
              for (i = k + 1; i < dimension; i++) {
                B2.set(k, j, B2.get(k, j) - B2.get(i, j) * l.get(i, k));
              }
              B2.set(k, j, B2.get(k, j) / l.get(k, k));
            }
          }
          return B2;
        }
        get lowerTriangularMatrix() {
          return this.L;
        }
      };
      var nipals = class {
        constructor(X2, options = {}) {
          X2 = WrapperMatrix2D2.checkMatrix(X2);
          let { Y: Y2 } = options;
          const {
            scaleScores = false,
            maxIterations = 1e3,
            terminationCriteria = 1e-10
          } = options;
          let u4;
          if (Y2) {
            if (isAnyArray.isAnyArray(Y2) && typeof Y2[0] === "number") {
              Y2 = Matrix3.columnVector(Y2);
            } else {
              Y2 = WrapperMatrix2D2.checkMatrix(Y2);
            }
            if (Y2.rows !== X2.rows) {
              throw new Error("Y should have the same number of rows as X");
            }
            u4 = Y2.getColumnVector(0);
          } else {
            u4 = X2.getColumnVector(0);
          }
          let diff = 1;
          let t, q, w, tOld;
          for (let counter = 0; counter < maxIterations && diff > terminationCriteria; counter++) {
            w = X2.transpose().mmul(u4).div(u4.transpose().mmul(u4).get(0, 0));
            w = w.div(w.norm());
            t = X2.mmul(w).div(w.transpose().mmul(w).get(0, 0));
            if (counter > 0) {
              diff = t.clone().sub(tOld).pow(2).sum();
            }
            tOld = t.clone();
            if (Y2) {
              q = Y2.transpose().mmul(t).div(t.transpose().mmul(t).get(0, 0));
              q = q.div(q.norm());
              u4 = Y2.mmul(q).div(q.transpose().mmul(q).get(0, 0));
            } else {
              u4 = t;
            }
          }
          if (Y2) {
            let p = X2.transpose().mmul(t).div(t.transpose().mmul(t).get(0, 0));
            p = p.div(p.norm());
            let xResidual = X2.clone().sub(t.clone().mmul(p.transpose()));
            let residual = u4.transpose().mmul(t).div(t.transpose().mmul(t).get(0, 0));
            let yResidual = Y2.clone().sub(
              t.clone().mulS(residual.get(0, 0)).mmul(q.transpose())
            );
            this.t = t;
            this.p = p.transpose();
            this.w = w.transpose();
            this.q = q;
            this.u = u4;
            this.s = t.transpose().mmul(t);
            this.xResidual = xResidual;
            this.yResidual = yResidual;
            this.betas = residual;
          } else {
            this.w = w.transpose();
            this.s = t.transpose().mmul(t).sqrt();
            if (scaleScores) {
              this.t = t.clone().div(this.s.get(0, 0));
            } else {
              this.t = t;
            }
            this.xResidual = X2.sub(t.mmul(w.transpose()));
          }
        }
      };
      exports.AbstractMatrix = AbstractMatrix2;
      exports.CHO = CholeskyDecomposition2;
      exports.CholeskyDecomposition = CholeskyDecomposition2;
      exports.DistanceMatrix = DistanceMatrix2;
      exports.EVD = EigenvalueDecomposition2;
      exports.EigenvalueDecomposition = EigenvalueDecomposition2;
      exports.LU = LuDecomposition2;
      exports.LuDecomposition = LuDecomposition2;
      exports.Matrix = Matrix3;
      exports.MatrixColumnSelectionView = MatrixColumnSelectionView2;
      exports.MatrixColumnView = MatrixColumnView2;
      exports.MatrixFlipColumnView = MatrixFlipColumnView2;
      exports.MatrixFlipRowView = MatrixFlipRowView2;
      exports.MatrixRowSelectionView = MatrixRowSelectionView2;
      exports.MatrixRowView = MatrixRowView2;
      exports.MatrixSelectionView = MatrixSelectionView2;
      exports.MatrixSubView = MatrixSubView2;
      exports.MatrixTransposeView = MatrixTransposeView2;
      exports.NIPALS = nipals;
      exports.Nipals = nipals;
      exports.QR = QrDecomposition3;
      exports.QrDecomposition = QrDecomposition3;
      exports.SVD = SingularValueDecomposition2;
      exports.SingularValueDecomposition = SingularValueDecomposition2;
      exports.SymmetricMatrix = SymmetricMatrix2;
      exports.WrapperMatrix1D = WrapperMatrix1D2;
      exports.WrapperMatrix2D = WrapperMatrix2D2;
      exports.correlation = correlation2;
      exports.covariance = covariance2;
      exports.default = Matrix3;
      exports.determinant = determinant2;
      exports.inverse = inverse2;
      exports.linearDependencies = linearDependencies2;
      exports.pseudoInverse = pseudoInverse2;
      exports.solve = solve3;
      exports.wrap = wrap2;
    }
  });

  // src/state.js
  var DEFAULTS = {
    src: null,
    x: 0,
    y: 1,
    m: "ols",
    n: [],
    c: [],
    h: null,
    xl: null,
    yl: null
  };
  function parseIntList(s) {
    if (!s) return [];
    return s.split(",").map((v2) => parseInt(v2, 10)).filter((v2) => !isNaN(v2));
  }
  function parseFloatList(s) {
    if (!s) return null;
    const vals = s.split(",").map(Number);
    return vals.length && vals.every((v2) => !isNaN(v2)) ? vals : null;
  }
  function parseIntOrNull(s) {
    if (s == null || s === "") return null;
    const v2 = parseInt(s, 10);
    return isNaN(v2) ? null : v2;
  }
  function parseState(hashStr) {
    const raw = new URLSearchParams(hashStr);
    return {
      src: raw.get("src") ?? DEFAULTS.src,
      x: raw.has("x") ? parseInt(raw.get("x"), 10) : DEFAULTS.x,
      y: raw.has("y") ? parseInt(raw.get("y"), 10) : DEFAULTS.y,
      m: raw.get("m") ?? DEFAULTS.m,
      n: raw.has("n") ? parseIntList(raw.get("n")) : [...DEFAULTS.n],
      c: raw.has("c") ? parseIntList(raw.get("c")) : [...DEFAULTS.c],
      h: parseIntOrNull(raw.get("h")),
      xl: raw.has("xl") ? parseFloatList(raw.get("xl")) : DEFAULTS.xl,
      yl: raw.has("yl") ? parseFloatList(raw.get("yl")) : DEFAULTS.yl
    };
  }
  function serializeState(state) {
    const params = new URLSearchParams();
    if (state.src != null) {
      params.set("src", state.src);
      params.set("x", String(state.x ?? DEFAULTS.x));
      params.set("y", String(state.y ?? DEFAULTS.y));
      params.set("m", state.m ?? DEFAULTS.m);
    }
    if (state.h != null) params.set("h", String(state.h));
    for (const key of ["n", "c", "xl", "yl"]) {
      if (state[key]?.length) params.set(key, state[key].join(","));
    }
    return params.toString();
  }
  function getState() {
    return parseState(window.location.hash.slice(1));
  }
  function setState(partial) {
    const next = { ...getState(), ...partial };
    window.location.hash = serializeState(next);
  }
  function onStateChange(callback) {
    window.addEventListener("hashchange", () => callback(getState()));
  }

  // src/data.js
  var import_papaparse = __toESM(require_papaparse_min(), 1);

  // src/localfile.js
  var PREFIX = "local:";
  var NAME_SUFFIX = ":name";
  async function hashText(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }
  async function storeLocalFile(file) {
    const text = await file.text();
    const hash = await hashText(text);
    const key = `${PREFIX}${hash}`;
    try {
      localStorage.setItem(key, text);
      localStorage.setItem(key + NAME_SUFFIX, file.name);
    } catch {
      throw new Error("File too large for browser storage (limit ~5 MB). Try a smaller CSV.");
    }
    return key;
  }
  function localFileName(key) {
    return localStorage.getItem(key + NAME_SUFFIX) ?? key;
  }
  function readLocalText(key) {
    const text = localStorage.getItem(key);
    if (text == null) {
      throw new Error("Local file not found in browser storage. Try dropping the file again.");
    }
    return text;
  }

  // src/data.js
  function transformUrl(url) {
    let u4;
    try {
      u4 = new URL(url);
    } catch {
      return url;
    }
    if (u4.hostname === "docs.google.com" && u4.pathname.includes("/spreadsheets/")) {
      const idMatch = u4.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
      if (idMatch) {
        const gid = u4.searchParams.get("gid") ?? new URLSearchParams(u4.hash.slice(1)).get("gid") ?? "0";
        return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
      }
    }
    if (u4.hostname === "github.com") {
      const match = u4.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
      if (match) {
        return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}`;
      }
    }
    if (u4.hostname === "gist.github.com") {
      const match = u4.pathname.match(/^\/([^/]+)\/([a-f0-9]+)\/?$/);
      if (match) {
        return `https://gist.githubusercontent.com/${match[1]}/${match[2]}/raw/`;
      }
    }
    return url;
  }
  function parseCsvText(text) {
    const result = import_papaparse.default.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true
    });
    const serious = result.errors.filter((e) => e.type !== "Delimiter");
    if (serious.length) throw new Error(`CSV parse error: ${serious[0].message}`);
    if (!result.data.length) throw new Error("The CSV appears to be empty.");
    return result.data;
  }
  async function fetchData(url) {
    if (url.startsWith("local:")) {
      return parseCsvText(readLocalText(url));
    }
    const fetchUrl = transformUrl(url);
    let response;
    try {
      response = await fetch(fetchUrl);
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(
          'Could not fetch this URL. For Google Sheets: File \u2192 Share \u2192 "Anyone with the link". For other CSVs, the server must send CORS headers.',
          { cause: err }
        );
      }
      throw err;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return parseCsvText(await response.text());
  }

  // node_modules/d3-array/src/ascending.js
  function ascending(a, b) {
    return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  // node_modules/d3-array/src/descending.js
  function descending(a, b) {
    return a == null || b == null ? NaN : b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
  }

  // node_modules/d3-array/src/bisector.js
  function bisector(f) {
    let compare1, compare2, delta;
    if (f.length !== 2) {
      compare1 = ascending;
      compare2 = (d, x2) => ascending(f(d), x2);
      delta = (d, x2) => f(d) - x2;
    } else {
      compare1 = f === ascending || f === descending ? f : zero;
      compare2 = f;
      delta = f;
    }
    function left(a, x2, lo = 0, hi = a.length) {
      if (lo < hi) {
        if (compare1(x2, x2) !== 0) return hi;
        do {
          const mid = lo + hi >>> 1;
          if (compare2(a[mid], x2) < 0) lo = mid + 1;
          else hi = mid;
        } while (lo < hi);
      }
      return lo;
    }
    function right(a, x2, lo = 0, hi = a.length) {
      if (lo < hi) {
        if (compare1(x2, x2) !== 0) return hi;
        do {
          const mid = lo + hi >>> 1;
          if (compare2(a[mid], x2) <= 0) lo = mid + 1;
          else hi = mid;
        } while (lo < hi);
      }
      return lo;
    }
    function center(a, x2, lo = 0, hi = a.length) {
      const i = left(a, x2, lo, hi - 1);
      return i > lo && delta(a[i - 1], x2) > -delta(a[i], x2) ? i - 1 : i;
    }
    return { left, center, right };
  }
  function zero() {
    return 0;
  }

  // node_modules/d3-array/src/number.js
  function number(x2) {
    return x2 === null ? NaN : +x2;
  }

  // node_modules/d3-array/src/bisect.js
  var ascendingBisect = bisector(ascending);
  var bisectRight = ascendingBisect.right;
  var bisectLeft = ascendingBisect.left;
  var bisectCenter = bisector(number).center;
  var bisect_default = bisectRight;

  // node_modules/d3-array/src/count.js
  function count(values, valueof) {
    let count2 = 0;
    if (valueof === void 0) {
      for (let value of values) {
        if (value != null && (value = +value) >= value) {
          ++count2;
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if ((value = valueof(value, ++index, values)) != null && (value = +value) >= value) {
          ++count2;
        }
      }
    }
    return count2;
  }

  // node_modules/d3-array/src/extent.js
  function extent(values, valueof) {
    let min2;
    let max3;
    if (valueof === void 0) {
      for (const value of values) {
        if (value != null) {
          if (min2 === void 0) {
            if (value >= value) min2 = max3 = value;
          } else {
            if (min2 > value) min2 = value;
            if (max3 < value) max3 = value;
          }
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if ((value = valueof(value, ++index, values)) != null) {
          if (min2 === void 0) {
            if (value >= value) min2 = max3 = value;
          } else {
            if (min2 > value) min2 = value;
            if (max3 < value) max3 = value;
          }
        }
      }
    }
    return [min2, max3];
  }

  // node_modules/d3-array/src/identity.js
  function identity(x2) {
    return x2;
  }

  // node_modules/d3-array/src/array.js
  var array = Array.prototype;
  var slice = array.slice;
  var map = array.map;

  // node_modules/d3-array/src/constant.js
  function constant(x2) {
    return () => x2;
  }

  // node_modules/d3-array/src/ticks.js
  var e10 = Math.sqrt(50);
  var e5 = Math.sqrt(10);
  var e2 = Math.sqrt(2);
  function tickSpec(start2, stop, count2) {
    const step = (stop - start2) / Math.max(0, count2), power = Math.floor(Math.log10(step)), error = step / Math.pow(10, power), factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
    let i1, i2, inc;
    if (power < 0) {
      inc = Math.pow(10, -power) / factor;
      i1 = Math.round(start2 * inc);
      i2 = Math.round(stop * inc);
      if (i1 / inc < start2) ++i1;
      if (i2 / inc > stop) --i2;
      inc = -inc;
    } else {
      inc = Math.pow(10, power) * factor;
      i1 = Math.round(start2 / inc);
      i2 = Math.round(stop / inc);
      if (i1 * inc < start2) ++i1;
      if (i2 * inc > stop) --i2;
    }
    if (i2 < i1 && 0.5 <= count2 && count2 < 2) return tickSpec(start2, stop, count2 * 2);
    return [i1, i2, inc];
  }
  function ticks(start2, stop, count2) {
    stop = +stop, start2 = +start2, count2 = +count2;
    if (!(count2 > 0)) return [];
    if (start2 === stop) return [start2];
    const reverse = stop < start2, [i1, i2, inc] = reverse ? tickSpec(stop, start2, count2) : tickSpec(start2, stop, count2);
    if (!(i2 >= i1)) return [];
    const n = i2 - i1 + 1, ticks2 = new Array(n);
    if (reverse) {
      if (inc < 0) for (let i = 0; i < n; ++i) ticks2[i] = (i2 - i) / -inc;
      else for (let i = 0; i < n; ++i) ticks2[i] = (i2 - i) * inc;
    } else {
      if (inc < 0) for (let i = 0; i < n; ++i) ticks2[i] = (i1 + i) / -inc;
      else for (let i = 0; i < n; ++i) ticks2[i] = (i1 + i) * inc;
    }
    return ticks2;
  }
  function tickIncrement(start2, stop, count2) {
    stop = +stop, start2 = +start2, count2 = +count2;
    return tickSpec(start2, stop, count2)[2];
  }
  function tickStep(start2, stop, count2) {
    stop = +stop, start2 = +start2, count2 = +count2;
    const reverse = stop < start2, inc = reverse ? tickIncrement(stop, start2, count2) : tickIncrement(start2, stop, count2);
    return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
  }

  // node_modules/d3-array/src/nice.js
  function nice(start2, stop, count2) {
    let prestep;
    while (true) {
      const step = tickIncrement(start2, stop, count2);
      if (step === prestep || step === 0 || !isFinite(step)) {
        return [start2, stop];
      } else if (step > 0) {
        start2 = Math.floor(start2 / step) * step;
        stop = Math.ceil(stop / step) * step;
      } else if (step < 0) {
        start2 = Math.ceil(start2 * step) / step;
        stop = Math.floor(stop * step) / step;
      }
      prestep = step;
    }
  }

  // node_modules/d3-array/src/threshold/sturges.js
  function thresholdSturges(values) {
    return Math.max(1, Math.ceil(Math.log(count(values)) / Math.LN2) + 1);
  }

  // node_modules/d3-array/src/bin.js
  function bin() {
    var value = identity, domain = extent, threshold = thresholdSturges;
    function histogram(data2) {
      if (!Array.isArray(data2)) data2 = Array.from(data2);
      var i, n = data2.length, x2, step, values = new Array(n);
      for (i = 0; i < n; ++i) {
        values[i] = value(data2[i], i, data2);
      }
      var xz = domain(values), x0 = xz[0], x1 = xz[1], tz = threshold(values, x0, x1);
      if (!Array.isArray(tz)) {
        const max3 = x1, tn = +tz;
        if (domain === extent) [x0, x1] = nice(x0, x1, tn);
        tz = ticks(x0, x1, tn);
        if (tz[0] <= x0) step = tickIncrement(x0, x1, tn);
        if (tz[tz.length - 1] >= x1) {
          if (max3 >= x1 && domain === extent) {
            const step2 = tickIncrement(x0, x1, tn);
            if (isFinite(step2)) {
              if (step2 > 0) {
                x1 = (Math.floor(x1 / step2) + 1) * step2;
              } else if (step2 < 0) {
                x1 = (Math.ceil(x1 * -step2) + 1) / -step2;
              }
            }
          } else {
            tz.pop();
          }
        }
      }
      var m = tz.length, a = 0, b = m;
      while (tz[a] <= x0) ++a;
      while (tz[b - 1] > x1) --b;
      if (a || b < m) tz = tz.slice(a, b), m = b - a;
      var bins = new Array(m + 1), bin2;
      for (i = 0; i <= m; ++i) {
        bin2 = bins[i] = [];
        bin2.x0 = i > 0 ? tz[i - 1] : x0;
        bin2.x1 = i < m ? tz[i] : x1;
      }
      if (isFinite(step)) {
        if (step > 0) {
          for (i = 0; i < n; ++i) {
            if ((x2 = values[i]) != null && x0 <= x2 && x2 <= x1) {
              bins[Math.min(m, Math.floor((x2 - x0) / step))].push(data2[i]);
            }
          }
        } else if (step < 0) {
          for (i = 0; i < n; ++i) {
            if ((x2 = values[i]) != null && x0 <= x2 && x2 <= x1) {
              const j = Math.floor((x0 - x2) * step);
              bins[Math.min(m, j + (tz[j] <= x2))].push(data2[i]);
            }
          }
        }
      } else {
        for (i = 0; i < n; ++i) {
          if ((x2 = values[i]) != null && x0 <= x2 && x2 <= x1) {
            bins[bisect_default(tz, x2, 0, m)].push(data2[i]);
          }
        }
      }
      return bins;
    }
    histogram.value = function(_) {
      return arguments.length ? (value = typeof _ === "function" ? _ : constant(_), histogram) : value;
    };
    histogram.domain = function(_) {
      return arguments.length ? (domain = typeof _ === "function" ? _ : constant([_[0], _[1]]), histogram) : domain;
    };
    histogram.thresholds = function(_) {
      return arguments.length ? (threshold = typeof _ === "function" ? _ : constant(Array.isArray(_) ? slice.call(_) : _), histogram) : threshold;
    };
    return histogram;
  }

  // node_modules/d3-array/src/max.js
  function max(values, valueof) {
    let max3;
    if (valueof === void 0) {
      for (const value of values) {
        if (value != null && (max3 < value || max3 === void 0 && value >= value)) {
          max3 = value;
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if ((value = valueof(value, ++index, values)) != null && (max3 < value || max3 === void 0 && value >= value)) {
          max3 = value;
        }
      }
    }
    return max3;
  }

  // node_modules/d3-array/src/range.js
  function range(start2, stop, step) {
    start2 = +start2, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start2, start2 = 0, 1) : n < 3 ? 1 : +step;
    var i = -1, n = Math.max(0, Math.ceil((stop - start2) / step)) | 0, range2 = new Array(n);
    while (++i < n) {
      range2[i] = start2 + i * step;
    }
    return range2;
  }

  // node_modules/d3-dispatch/src/dispatch.js
  var noop = { value: () => {
  } };
  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }
  function Dispatch(_) {
    this._ = _;
  }
  function parseTypenames(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return { type: t, name };
    });
  }
  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _ = this._, T = parseTypenames(typename + "", _), t, i = -1, n = T.length;
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        return;
      }
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
      }
      return this;
    },
    copy: function() {
      var copy3 = {}, _ = this._;
      for (var t in _) copy3[t] = _[t].slice();
      return new Dispatch(copy3);
    },
    call: function(type2, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type2)) throw new Error("unknown type: " + type2);
      for (t = this._[type2], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type2, that, args) {
      if (!this._.hasOwnProperty(type2)) throw new Error("unknown type: " + type2);
      for (var t = this._[type2], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };
  function get(type2, name) {
    for (var i = 0, n = type2.length, c; i < n; ++i) {
      if ((c = type2[i]).name === name) {
        return c.value;
      }
    }
  }
  function set(type2, name, callback) {
    for (var i = 0, n = type2.length; i < n; ++i) {
      if (type2[i].name === name) {
        type2[i] = noop, type2 = type2.slice(0, i).concat(type2.slice(i + 1));
        break;
      }
    }
    if (callback != null) type2.push({ name, value: callback });
    return type2;
  }
  var dispatch_default = dispatch;

  // node_modules/d3-selection/src/namespaces.js
  var xhtml = "http://www.w3.org/1999/xhtml";
  var namespaces_default = {
    svg: "http://www.w3.org/2000/svg",
    xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  // node_modules/d3-selection/src/namespace.js
  function namespace_default(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces_default.hasOwnProperty(prefix) ? { space: namespaces_default[prefix], local: name } : name;
  }

  // node_modules/d3-selection/src/creator.js
  function creatorInherit(name) {
    return function() {
      var document2 = this.ownerDocument, uri = this.namespaceURI;
      return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
    };
  }
  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }
  function creator_default(name) {
    var fullname = namespace_default(name);
    return (fullname.local ? creatorFixed : creatorInherit)(fullname);
  }

  // node_modules/d3-selection/src/selector.js
  function none() {
  }
  function selector_default(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  // node_modules/d3-selection/src/selection/select.js
  function select_default(select) {
    if (typeof select !== "function") select = selector_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/d3-selection/src/array.js
  function array2(x2) {
    return x2 == null ? [] : Array.isArray(x2) ? x2 : Array.from(x2);
  }

  // node_modules/d3-selection/src/selectorAll.js
  function empty() {
    return [];
  }
  function selectorAll_default(selector) {
    return selector == null ? empty : function() {
      return this.querySelectorAll(selector);
    };
  }

  // node_modules/d3-selection/src/selection/selectAll.js
  function arrayAll(select) {
    return function() {
      return array2(select.apply(this, arguments));
    };
  }
  function selectAll_default(select) {
    if (typeof select === "function") select = arrayAll(select);
    else select = selectorAll_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }
    return new Selection(subgroups, parents);
  }

  // node_modules/d3-selection/src/matcher.js
  function matcher_default(selector) {
    return function() {
      return this.matches(selector);
    };
  }
  function childMatcher(selector) {
    return function(node) {
      return node.matches(selector);
    };
  }

  // node_modules/d3-selection/src/selection/selectChild.js
  var find = Array.prototype.find;
  function childFind(match) {
    return function() {
      return find.call(this.children, match);
    };
  }
  function childFirst() {
    return this.firstElementChild;
  }
  function selectChild_default(match) {
    return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/d3-selection/src/selection/selectChildren.js
  var filter = Array.prototype.filter;
  function children() {
    return Array.from(this.children);
  }
  function childrenFilter(match) {
    return function() {
      return filter.call(this.children, match);
    };
  }
  function selectChildren_default(match) {
    return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
  }

  // node_modules/d3-selection/src/selection/filter.js
  function filter_default(match) {
    if (typeof match !== "function") match = matcher_default(match);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Selection(subgroups, this._parents);
  }

  // node_modules/d3-selection/src/selection/sparse.js
  function sparse_default(update) {
    return new Array(update.length);
  }

  // node_modules/d3-selection/src/selection/enter.js
  function enter_default() {
    return new Selection(this._enter || this._groups.map(sparse_default), this._parents);
  }
  function EnterNode(parent, datum2) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum2;
  }
  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) {
      return this._parent.insertBefore(child, this._next);
    },
    insertBefore: function(child, next) {
      return this._parent.insertBefore(child, next);
    },
    querySelector: function(selector) {
      return this._parent.querySelector(selector);
    },
    querySelectorAll: function(selector) {
      return this._parent.querySelectorAll(selector);
    }
  };

  // node_modules/d3-selection/src/constant.js
  function constant_default(x2) {
    return function() {
      return x2;
    };
  }

  // node_modules/d3-selection/src/selection/data.js
  function bindIndex(parent, group, enter, update, exit, data2) {
    var i = 0, node, groupLength = group.length, dataLength = data2.length;
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data2[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data2[i]);
      }
    }
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }
  function bindKey(parent, group, enter, update, exit, data2, key) {
    var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data2.length, keyValues = new Array(groupLength), keyValue;
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
        if (nodeByKeyValue.has(keyValue)) {
          exit[i] = node;
        } else {
          nodeByKeyValue.set(keyValue, node);
        }
      }
    }
    for (i = 0; i < dataLength; ++i) {
      keyValue = key.call(parent, data2[i], i, data2) + "";
      if (node = nodeByKeyValue.get(keyValue)) {
        update[i] = node;
        node.__data__ = data2[i];
        nodeByKeyValue.delete(keyValue);
      } else {
        enter[i] = new EnterNode(parent, data2[i]);
      }
    }
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
        exit[i] = node;
      }
    }
  }
  function datum(node) {
    return node.__data__;
  }
  function data_default(value, key) {
    if (!arguments.length) return Array.from(this, datum);
    var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
    if (typeof value !== "function") value = constant_default(value);
    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j], group = groups[j], groupLength = group.length, data2 = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data2.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
      bind(parent, group, enterGroup, updateGroup, exitGroup, data2, key);
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength) ;
          previous._next = next || null;
        }
      }
    }
    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }
  function arraylike(data2) {
    return typeof data2 === "object" && "length" in data2 ? data2 : Array.from(data2);
  }

  // node_modules/d3-selection/src/selection/exit.js
  function exit_default() {
    return new Selection(this._exit || this._groups.map(sparse_default), this._parents);
  }

  // node_modules/d3-selection/src/selection/join.js
  function join_default(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    if (typeof onenter === "function") {
      enter = onenter(enter);
      if (enter) enter = enter.selection();
    } else {
      enter = enter.append(onenter + "");
    }
    if (onupdate != null) {
      update = onupdate(update);
      if (update) update = update.selection();
    }
    if (onexit == null) exit.remove();
    else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  // node_modules/d3-selection/src/selection/merge.js
  function merge_default(context) {
    var selection2 = context.selection ? context.selection() : context;
    for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Selection(merges, this._parents);
  }

  // node_modules/d3-selection/src/selection/order.js
  function order_default() {
    for (var groups = this._groups, j = -1, m = groups.length; ++j < m; ) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  }

  // node_modules/d3-selection/src/selection/sort.js
  function sort_default(compare) {
    if (!compare) compare = ascending2;
    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }
    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }
    return new Selection(sortgroups, this._parents).order();
  }
  function ascending2(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  // node_modules/d3-selection/src/selection/call.js
  function call_default() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  // node_modules/d3-selection/src/selection/nodes.js
  function nodes_default() {
    return Array.from(this);
  }

  // node_modules/d3-selection/src/selection/node.js
  function node_default() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }
    return null;
  }

  // node_modules/d3-selection/src/selection/size.js
  function size_default() {
    let size = 0;
    for (const node of this) ++size;
    return size;
  }

  // node_modules/d3-selection/src/selection/empty.js
  function empty_default() {
    return !this.node();
  }

  // node_modules/d3-selection/src/selection/each.js
  function each_default(callback) {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }
    return this;
  }

  // node_modules/d3-selection/src/selection/attr.js
  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }
  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }
  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }
  function attrFunction(name, value) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (v2 == null) this.removeAttribute(name);
      else this.setAttribute(name, v2);
    };
  }
  function attrFunctionNS(fullname, value) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (v2 == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v2);
    };
  }
  function attr_default(name, value) {
    var fullname = namespace_default(name);
    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
    }
    return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
  }

  // node_modules/d3-selection/src/window.js
  function window_default(node) {
    return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
  }

  // node_modules/d3-selection/src/selection/style.js
  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }
  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }
  function styleFunction(name, value, priority) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (v2 == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v2, priority);
    };
  }
  function style_default(name, value, priority) {
    return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
  }
  function styleValue(node, name) {
    return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  // node_modules/d3-selection/src/selection/property.js
  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }
  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }
  function propertyFunction(name, value) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (v2 == null) delete this[name];
      else this[name] = v2;
    };
  }
  function property_default(name, value) {
    return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
  }

  // node_modules/d3-selection/src/selection/classed.js
  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }
  function classList(node) {
    return node.classList || new ClassList(node);
  }
  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }
  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };
  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }
  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }
  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }
  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }
  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }
  function classed_default(name, value) {
    var names = classArray(name + "");
    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }
    return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
  }

  // node_modules/d3-selection/src/selection/text.js
  function textRemove() {
    this.textContent = "";
  }
  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction(value) {
    return function() {
      var v2 = value.apply(this, arguments);
      this.textContent = v2 == null ? "" : v2;
    };
  }
  function text_default(value) {
    return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
  }

  // node_modules/d3-selection/src/selection/html.js
  function htmlRemove() {
    this.innerHTML = "";
  }
  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }
  function htmlFunction(value) {
    return function() {
      var v2 = value.apply(this, arguments);
      this.innerHTML = v2 == null ? "" : v2;
    };
  }
  function html_default(value) {
    return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
  }

  // node_modules/d3-selection/src/selection/raise.js
  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }
  function raise_default() {
    return this.each(raise);
  }

  // node_modules/d3-selection/src/selection/lower.js
  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }
  function lower_default() {
    return this.each(lower);
  }

  // node_modules/d3-selection/src/selection/append.js
  function append_default(name) {
    var create2 = typeof name === "function" ? name : creator_default(name);
    return this.select(function() {
      return this.appendChild(create2.apply(this, arguments));
    });
  }

  // node_modules/d3-selection/src/selection/insert.js
  function constantNull() {
    return null;
  }
  function insert_default(name, before) {
    var create2 = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
    return this.select(function() {
      return this.insertBefore(create2.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  // node_modules/d3-selection/src/selection/remove.js
  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }
  function remove_default() {
    return this.each(remove);
  }

  // node_modules/d3-selection/src/selection/clone.js
  function selection_cloneShallow() {
    var clone = this.cloneNode(false), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function selection_cloneDeep() {
    var clone = this.cloneNode(true), parent = this.parentNode;
    return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
  }
  function clone_default(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  // node_modules/d3-selection/src/selection/datum.js
  function datum_default(value) {
    return arguments.length ? this.property("__data__", value) : this.node().__data__;
  }

  // node_modules/d3-selection/src/selection/on.js
  function contextListener(listener) {
    return function(event) {
      listener.call(this, event, this.__data__);
    };
  }
  function parseTypenames2(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return { type: t, name };
    });
  }
  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }
  function onAdd(typename, value, options) {
    return function() {
      var on = this.__on, o, listener = contextListener(value);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.options);
          this.addEventListener(o.type, o.listener = listener, o.options = options);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, options);
      o = { type: typename.type, name: typename.name, value, listener, options };
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }
  function on_default(typename, value, options) {
    var typenames = parseTypenames2(typename + ""), i, n = typenames.length, t;
    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }
    on = value ? onAdd : onRemove;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
    return this;
  }

  // node_modules/d3-selection/src/selection/dispatch.js
  function dispatchEvent(node, type2, params) {
    var window2 = window_default(node), event = window2.CustomEvent;
    if (typeof event === "function") {
      event = new event(type2, params);
    } else {
      event = window2.document.createEvent("Event");
      if (params) event.initEvent(type2, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type2, false, false);
    }
    node.dispatchEvent(event);
  }
  function dispatchConstant(type2, params) {
    return function() {
      return dispatchEvent(this, type2, params);
    };
  }
  function dispatchFunction(type2, params) {
    return function() {
      return dispatchEvent(this, type2, params.apply(this, arguments));
    };
  }
  function dispatch_default2(type2, params) {
    return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type2, params));
  }

  // node_modules/d3-selection/src/selection/iterator.js
  function* iterator_default() {
    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) yield node;
      }
    }
  }

  // node_modules/d3-selection/src/selection/index.js
  var root = [null];
  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }
  function selection() {
    return new Selection([[document.documentElement]], root);
  }
  function selection_selection() {
    return this;
  }
  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: select_default,
    selectAll: selectAll_default,
    selectChild: selectChild_default,
    selectChildren: selectChildren_default,
    filter: filter_default,
    data: data_default,
    enter: enter_default,
    exit: exit_default,
    join: join_default,
    merge: merge_default,
    selection: selection_selection,
    order: order_default,
    sort: sort_default,
    call: call_default,
    nodes: nodes_default,
    node: node_default,
    size: size_default,
    empty: empty_default,
    each: each_default,
    attr: attr_default,
    style: style_default,
    property: property_default,
    classed: classed_default,
    text: text_default,
    html: html_default,
    raise: raise_default,
    lower: lower_default,
    append: append_default,
    insert: insert_default,
    remove: remove_default,
    clone: clone_default,
    datum: datum_default,
    on: on_default,
    dispatch: dispatch_default2,
    [Symbol.iterator]: iterator_default
  };
  var selection_default = selection;

  // node_modules/d3-selection/src/select.js
  function select_default2(selector) {
    return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
  }

  // node_modules/d3-selection/src/sourceEvent.js
  function sourceEvent_default(event) {
    let sourceEvent;
    while (sourceEvent = event.sourceEvent) event = sourceEvent;
    return event;
  }

  // node_modules/d3-selection/src/pointer.js
  function pointer_default(event, node) {
    event = sourceEvent_default(event);
    if (node === void 0) node = event.currentTarget;
    if (node) {
      var svg = node.ownerSVGElement || node;
      if (svg.createSVGPoint) {
        var point2 = svg.createSVGPoint();
        point2.x = event.clientX, point2.y = event.clientY;
        point2 = point2.matrixTransform(node.getScreenCTM().inverse());
        return [point2.x, point2.y];
      }
      if (node.getBoundingClientRect) {
        var rect = node.getBoundingClientRect();
        return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
      }
    }
    return [event.pageX, event.pageY];
  }

  // node_modules/d3-color/src/define.js
  function define_default(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }
  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  // node_modules/d3-color/src/color.js
  function Color() {
  }
  var darker = 0.7;
  var brighter = 1 / darker;
  var reI = "\\s*([+-]?\\d+)\\s*";
  var reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*";
  var reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
  var reHex = /^#([0-9a-f]{3,8})$/;
  var reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`);
  var reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`);
  var reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`);
  var reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`);
  var reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`);
  var reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
  var named = {
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    rebeccapurple: 6697881,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  };
  define_default(Color, color, {
    copy(channels) {
      return Object.assign(new this.constructor(), this, channels);
    },
    displayable() {
      return this.rgb().displayable();
    },
    hex: color_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHex8: color_formatHex8,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });
  function color_formatHex() {
    return this.rgb().formatHex();
  }
  function color_formatHex8() {
    return this.rgb().formatHex8();
  }
  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }
  function color_formatRgb() {
    return this.rgb().formatRgb();
  }
  function color(format2) {
    var m, l;
    format2 = (format2 + "").trim().toLowerCase();
    return (m = reHex.exec(format2)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format2)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format2)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format2)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format2)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format2)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format2) ? rgbn(named[format2]) : format2 === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
  }
  function rgbn(n) {
    return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
  }
  function rgba(r, g, b, a) {
    if (a <= 0) r = g = b = NaN;
    return new Rgb(r, g, b, a);
  }
  function rgbConvert(o) {
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Rgb();
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }
  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }
  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }
  define_default(Rgb, rgb, extend(Color, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb() {
      return this;
    },
    clamp() {
      return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
    },
    displayable() {
      return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex,
    // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatHex8: rgb_formatHex8,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));
  function rgb_formatHex() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
  }
  function rgb_formatHex8() {
    return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
  }
  function rgb_formatRgb() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
  }
  function clampa(opacity) {
    return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
  }
  function clampi(value) {
    return Math.max(0, Math.min(255, Math.round(value) || 0));
  }
  function hex(value) {
    value = clampi(value);
    return (value < 16 ? "0" : "") + value.toString(16);
  }
  function hsla(h, s, l, a) {
    if (a <= 0) h = s = l = NaN;
    else if (l <= 0 || l >= 1) h = s = NaN;
    else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a);
  }
  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Hsl();
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r = o.r / 255, g = o.g / 255, b = o.b / 255, min2 = Math.min(r, g, b), max3 = Math.max(r, g, b), h = NaN, s = max3 - min2, l = (max3 + min2) / 2;
    if (s) {
      if (r === max3) h = (g - b) / s + (g < b) * 6;
      else if (g === max3) h = (b - r) / s + 2;
      else h = (r - g) / s + 4;
      s /= l < 0.5 ? max3 + min2 : 2 - max3 - min2;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }
  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }
  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }
  define_default(Hsl, hsl, extend(Color, {
    brighter(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb() {
      var h = this.h % 360 + (this.h < 0) * 360, s = isNaN(h) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    clamp() {
      return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
    },
    displayable() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl() {
      const a = clampa(this.opacity);
      return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
    }
  }));
  function clamph(value) {
    value = (value || 0) % 360;
    return value < 0 ? value + 360 : value;
  }
  function clampt(value) {
    return Math.max(0, Math.min(1, value || 0));
  }
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60 : h < 180 ? m2 : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60 : m1) * 255;
  }

  // node_modules/d3-interpolate/src/basis.js
  function basis(t1, v0, v1, v2, v3) {
    var t2 = t1 * t1, t3 = t2 * t1;
    return ((1 - 3 * t1 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
  }
  function basis_default(values) {
    var n = values.length - 1;
    return function(t) {
      var i = t <= 0 ? t = 0 : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n), v1 = values[i], v2 = values[i + 1], v0 = i > 0 ? values[i - 1] : 2 * v1 - v2, v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
      return basis((t - i / n) * n, v0, v1, v2, v3);
    };
  }

  // node_modules/d3-interpolate/src/basisClosed.js
  function basisClosed_default(values) {
    var n = values.length;
    return function(t) {
      var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n), v0 = values[(i + n - 1) % n], v1 = values[i % n], v2 = values[(i + 1) % n], v3 = values[(i + 2) % n];
      return basis((t - i / n) * n, v0, v1, v2, v3);
    };
  }

  // node_modules/d3-interpolate/src/constant.js
  var constant_default2 = (x2) => () => x2;

  // node_modules/d3-interpolate/src/color.js
  function linear(a, d) {
    return function(t) {
      return a + t * d;
    };
  }
  function exponential(a, b, y2) {
    return a = Math.pow(a, y2), b = Math.pow(b, y2) - a, y2 = 1 / y2, function(t) {
      return Math.pow(a + t * b, y2);
    };
  }
  function gamma(y2) {
    return (y2 = +y2) === 1 ? nogamma : function(a, b) {
      return b - a ? exponential(a, b, y2) : constant_default2(isNaN(a) ? b : a);
    };
  }
  function nogamma(a, b) {
    var d = b - a;
    return d ? linear(a, d) : constant_default2(isNaN(a) ? b : a);
  }

  // node_modules/d3-interpolate/src/rgb.js
  var rgb_default = (function rgbGamma(y2) {
    var color2 = gamma(y2);
    function rgb2(start2, end) {
      var r = color2((start2 = rgb(start2)).r, (end = rgb(end)).r), g = color2(start2.g, end.g), b = color2(start2.b, end.b), opacity = nogamma(start2.opacity, end.opacity);
      return function(t) {
        start2.r = r(t);
        start2.g = g(t);
        start2.b = b(t);
        start2.opacity = opacity(t);
        return start2 + "";
      };
    }
    rgb2.gamma = rgbGamma;
    return rgb2;
  })(1);
  function rgbSpline(spline) {
    return function(colors) {
      var n = colors.length, r = new Array(n), g = new Array(n), b = new Array(n), i, color2;
      for (i = 0; i < n; ++i) {
        color2 = rgb(colors[i]);
        r[i] = color2.r || 0;
        g[i] = color2.g || 0;
        b[i] = color2.b || 0;
      }
      r = spline(r);
      g = spline(g);
      b = spline(b);
      color2.opacity = 1;
      return function(t) {
        color2.r = r(t);
        color2.g = g(t);
        color2.b = b(t);
        return color2 + "";
      };
    };
  }
  var rgbBasis = rgbSpline(basis_default);
  var rgbBasisClosed = rgbSpline(basisClosed_default);

  // node_modules/d3-interpolate/src/numberArray.js
  function numberArray_default(a, b) {
    if (!b) b = [];
    var n = a ? Math.min(b.length, a.length) : 0, c = b.slice(), i;
    return function(t) {
      for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
      return c;
    };
  }
  function isNumberArray(x2) {
    return ArrayBuffer.isView(x2) && !(x2 instanceof DataView);
  }

  // node_modules/d3-interpolate/src/array.js
  function genericArray(a, b) {
    var nb = b ? b.length : 0, na = a ? Math.min(nb, a.length) : 0, x2 = new Array(na), c = new Array(nb), i;
    for (i = 0; i < na; ++i) x2[i] = value_default(a[i], b[i]);
    for (; i < nb; ++i) c[i] = b[i];
    return function(t) {
      for (i = 0; i < na; ++i) c[i] = x2[i](t);
      return c;
    };
  }

  // node_modules/d3-interpolate/src/date.js
  function date_default(a, b) {
    var d = /* @__PURE__ */ new Date();
    return a = +a, b = +b, function(t) {
      return d.setTime(a * (1 - t) + b * t), d;
    };
  }

  // node_modules/d3-interpolate/src/number.js
  function number_default(a, b) {
    return a = +a, b = +b, function(t) {
      return a * (1 - t) + b * t;
    };
  }

  // node_modules/d3-interpolate/src/object.js
  function object_default(a, b) {
    var i = {}, c = {}, k;
    if (a === null || typeof a !== "object") a = {};
    if (b === null || typeof b !== "object") b = {};
    for (k in b) {
      if (k in a) {
        i[k] = value_default(a[k], b[k]);
      } else {
        c[k] = b[k];
      }
    }
    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }

  // node_modules/d3-interpolate/src/string.js
  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
  var reB = new RegExp(reA.source, "g");
  function zero2(b) {
    return function() {
      return b;
    };
  }
  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }
  function string_default(a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
    a = a + "", b = b + "";
    while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) {
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs;
        else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) {
        if (s[i]) s[i] += bm;
        else s[++i] = bm;
      } else {
        s[++i] = null;
        q.push({ i, x: number_default(am, bm) });
      }
      bi = reB.lastIndex;
    }
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs;
      else s[++i] = bs;
    }
    return s.length < 2 ? q[0] ? one(q[0].x) : zero2(b) : (b = q.length, function(t) {
      for (var i2 = 0, o; i2 < b; ++i2) s[(o = q[i2]).i] = o.x(t);
      return s.join("");
    });
  }

  // node_modules/d3-interpolate/src/value.js
  function value_default(a, b) {
    var t = typeof b, c;
    return b == null || t === "boolean" ? constant_default2(b) : (t === "number" ? number_default : t === "string" ? (c = color(b)) ? (b = c, rgb_default) : string_default : b instanceof color ? rgb_default : b instanceof Date ? date_default : isNumberArray(b) ? numberArray_default : Array.isArray(b) ? genericArray : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object_default : number_default)(a, b);
  }

  // node_modules/d3-interpolate/src/round.js
  function round_default(a, b) {
    return a = +a, b = +b, function(t) {
      return Math.round(a * (1 - t) + b * t);
    };
  }

  // node_modules/d3-interpolate/src/transform/decompose.js
  var degrees = 180 / Math.PI;
  var identity2 = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };
  function decompose_default(a, b, c, d, e, f) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
    if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
    if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX,
      scaleY
    };
  }

  // node_modules/d3-interpolate/src/transform/parse.js
  var svgNode;
  function parseCss(value) {
    const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
    return m.isIdentity ? identity2 : decompose_default(m.a, m.b, m.c, m.d, m.e, m.f);
  }
  function parseSvg(value) {
    if (value == null) return identity2;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity2;
    value = value.matrix;
    return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  // node_modules/d3-interpolate/src/transform/index.js
  function interpolateTransform(parse, pxComma, pxParen, degParen) {
    function pop(s) {
      return s.length ? s.pop() + " " : "";
    }
    function translate(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push("translate(", null, pxComma, null, pxParen);
        q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
      } else if (xb || yb) {
        s.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }
    function rotate(a, b, s, q) {
      if (a !== b) {
        if (a - b > 180) b += 360;
        else if (b - a > 180) a += 360;
        q.push({ i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number_default(a, b) });
      } else if (b) {
        s.push(pop(s) + "rotate(" + b + degParen);
      }
    }
    function skewX(a, b, s, q) {
      if (a !== b) {
        q.push({ i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number_default(a, b) });
      } else if (b) {
        s.push(pop(s) + "skewX(" + b + degParen);
      }
    }
    function scale2(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push(pop(s) + "scale(", null, ",", null, ")");
        q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
      } else if (xb !== 1 || yb !== 1) {
        s.push(pop(s) + "scale(" + xb + "," + yb + ")");
      }
    }
    return function(a, b) {
      var s = [], q = [];
      a = parse(a), b = parse(b);
      translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
      rotate(a.rotate, b.rotate, s, q);
      skewX(a.skewX, b.skewX, s, q);
      scale2(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
      a = b = null;
      return function(t) {
        var i = -1, n = q.length, o;
        while (++i < n) s[(o = q[i]).i] = o.x(t);
        return s.join("");
      };
    };
  }
  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  // node_modules/d3-timer/src/timer.js
  var frame = 0;
  var timeout = 0;
  var interval = 0;
  var pokeDelay = 1e3;
  var taskHead;
  var taskTail;
  var clockLast = 0;
  var clockNow = 0;
  var clockSkew = 0;
  var clock = typeof performance === "object" && performance.now ? performance : Date;
  var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
    setTimeout(f, 17);
  };
  function now() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }
  function clearNow() {
    clockNow = 0;
  }
  function Timer() {
    this._call = this._time = this._next = null;
  }
  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function(callback, delay, time) {
      if (typeof callback !== "function") throw new TypeError("callback is not a function");
      time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
      if (!this._next && taskTail !== this) {
        if (taskTail) taskTail._next = this;
        else taskHead = this;
        taskTail = this;
      }
      this._call = callback;
      this._time = time;
      sleep();
    },
    stop: function() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };
  function timer(callback, delay, time) {
    var t = new Timer();
    t.restart(callback, delay, time);
    return t;
  }
  function timerFlush() {
    now();
    ++frame;
    var t = taskHead, e;
    while (t) {
      if ((e = clockNow - t._time) >= 0) t._call.call(void 0, e);
      t = t._next;
    }
    --frame;
  }
  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame = timeout = 0;
    try {
      timerFlush();
    } finally {
      frame = 0;
      nap();
      clockNow = 0;
    }
  }
  function poke() {
    var now2 = clock.now(), delay = now2 - clockLast;
    if (delay > pokeDelay) clockSkew -= delay, clockLast = now2;
  }
  function nap() {
    var t0, t1 = taskHead, t2, time = Infinity;
    while (t1) {
      if (t1._call) {
        if (time > t1._time) time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t2 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t2 : taskHead = t2;
      }
    }
    taskTail = t0;
    sleep(time);
  }
  function sleep(time) {
    if (frame) return;
    if (timeout) timeout = clearTimeout(timeout);
    var delay = time - clockNow;
    if (delay > 24) {
      if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval) interval = clearInterval(interval);
    } else {
      if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
      frame = 1, setFrame(wake);
    }
  }

  // node_modules/d3-timer/src/timeout.js
  function timeout_default(callback, delay, time) {
    var t = new Timer();
    delay = delay == null ? 0 : +delay;
    t.restart((elapsed) => {
      t.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t;
  }

  // node_modules/d3-transition/src/transition/schedule.js
  var emptyOn = dispatch_default("start", "end", "cancel", "interrupt");
  var emptyTween = [];
  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;
  function schedule_default(node, name, id2, index, group, timing) {
    var schedules = node.__transition;
    if (!schedules) node.__transition = {};
    else if (id2 in schedules) return;
    create(node, id2, {
      name,
      index,
      // For context during callback.
      group,
      // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }
  function init(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }
  function set2(node, id2) {
    var schedule = get2(node, id2);
    if (schedule.state > STARTED) throw new Error("too late; already running");
    return schedule;
  }
  function get2(node, id2) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id2])) throw new Error("transition not found");
    return schedule;
  }
  function create(node, id2, self2) {
    var schedules = node.__transition, tween;
    schedules[id2] = self2;
    self2.timer = timer(schedule, 0, self2.time);
    function schedule(elapsed) {
      self2.state = SCHEDULED;
      self2.timer.restart(start2, self2.delay, self2.time);
      if (self2.delay <= elapsed) start2(elapsed - self2.delay);
    }
    function start2(elapsed) {
      var i, j, n, o;
      if (self2.state !== SCHEDULED) return stop();
      for (i in schedules) {
        o = schedules[i];
        if (o.name !== self2.name) continue;
        if (o.state === STARTED) return timeout_default(start2);
        if (o.state === RUNNING) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("interrupt", node, node.__data__, o.index, o.group);
          delete schedules[i];
        } else if (+i < id2) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("cancel", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }
      }
      timeout_default(function() {
        if (self2.state === STARTED) {
          self2.state = RUNNING;
          self2.timer.restart(tick, self2.delay, self2.time);
          tick(elapsed);
        }
      });
      self2.state = STARTING;
      self2.on.call("start", node, node.__data__, self2.index, self2.group);
      if (self2.state !== STARTING) return;
      self2.state = STARTED;
      tween = new Array(n = self2.tween.length);
      for (i = 0, j = -1; i < n; ++i) {
        if (o = self2.tween[i].value.call(node, node.__data__, self2.index, self2.group)) {
          tween[++j] = o;
        }
      }
      tween.length = j + 1;
    }
    function tick(elapsed) {
      var t = elapsed < self2.duration ? self2.ease.call(null, elapsed / self2.duration) : (self2.timer.restart(stop), self2.state = ENDING, 1), i = -1, n = tween.length;
      while (++i < n) {
        tween[i].call(node, t);
      }
      if (self2.state === ENDING) {
        self2.on.call("end", node, node.__data__, self2.index, self2.group);
        stop();
      }
    }
    function stop() {
      self2.state = ENDED;
      self2.timer.stop();
      delete schedules[id2];
      for (var i in schedules) return;
      delete node.__transition;
    }
  }

  // node_modules/d3-transition/src/interrupt.js
  function interrupt_default(node, name) {
    var schedules = node.__transition, schedule, active, empty2 = true, i;
    if (!schedules) return;
    name = name == null ? null : name + "";
    for (i in schedules) {
      if ((schedule = schedules[i]).name !== name) {
        empty2 = false;
        continue;
      }
      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i];
    }
    if (empty2) delete node.__transition;
  }

  // node_modules/d3-transition/src/selection/interrupt.js
  function interrupt_default2(name) {
    return this.each(function() {
      interrupt_default(this, name);
    });
  }

  // node_modules/d3-transition/src/transition/tween.js
  function tweenRemove(id2, name) {
    var tween0, tween1;
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = tween0 = tween;
        for (var i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1 = tween1.slice();
            tween1.splice(i, 1);
            break;
          }
        }
      }
      schedule.tween = tween1;
    };
  }
  function tweenFunction(id2, name, value) {
    var tween0, tween1;
    if (typeof value !== "function") throw new Error();
    return function() {
      var schedule = set2(this, id2), tween = schedule.tween;
      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();
        for (var t = { name, value }, i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1[i] = t;
            break;
          }
        }
        if (i === n) tween1.push(t);
      }
      schedule.tween = tween1;
    };
  }
  function tween_default(name, value) {
    var id2 = this._id;
    name += "";
    if (arguments.length < 2) {
      var tween = get2(this.node(), id2).tween;
      for (var i = 0, n = tween.length, t; i < n; ++i) {
        if ((t = tween[i]).name === name) {
          return t.value;
        }
      }
      return null;
    }
    return this.each((value == null ? tweenRemove : tweenFunction)(id2, name, value));
  }
  function tweenValue(transition2, name, value) {
    var id2 = transition2._id;
    transition2.each(function() {
      var schedule = set2(this, id2);
      (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
    });
    return function(node) {
      return get2(node, id2).value[name];
    };
  }

  // node_modules/d3-transition/src/transition/interpolate.js
  function interpolate_default(a, b) {
    var c;
    return (typeof b === "number" ? number_default : b instanceof color ? rgb_default : (c = color(b)) ? (b = c, rgb_default) : string_default)(a, b);
  }

  // node_modules/d3-transition/src/transition/attr.js
  function attrRemove2(name) {
    return function() {
      this.removeAttribute(name);
    };
  }
  function attrRemoveNS2(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }
  function attrConstant2(name, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttribute(name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function attrConstantNS2(fullname, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function attrFunction2(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttribute(name);
      string0 = this.getAttribute(name);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function attrFunctionNS2(fullname, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function attr_default2(name, value) {
    var fullname = namespace_default(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
    return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS2 : attrFunction2)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS2 : attrRemove2)(fullname) : (fullname.local ? attrConstantNS2 : attrConstant2)(fullname, i, value));
  }

  // node_modules/d3-transition/src/transition/attrTween.js
  function attrInterpolate(name, i) {
    return function(t) {
      this.setAttribute(name, i.call(this, t));
    };
  }
  function attrInterpolateNS(fullname, i) {
    return function(t) {
      this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
    };
  }
  function attrTweenNS(fullname, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween(name, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function attrTween_default(name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    var fullname = namespace_default(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  // node_modules/d3-transition/src/transition/delay.js
  function delayFunction(id2, value) {
    return function() {
      init(this, id2).delay = +value.apply(this, arguments);
    };
  }
  function delayConstant(id2, value) {
    return value = +value, function() {
      init(this, id2).delay = value;
    };
  }
  function delay_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id2, value)) : get2(this.node(), id2).delay;
  }

  // node_modules/d3-transition/src/transition/duration.js
  function durationFunction(id2, value) {
    return function() {
      set2(this, id2).duration = +value.apply(this, arguments);
    };
  }
  function durationConstant(id2, value) {
    return value = +value, function() {
      set2(this, id2).duration = value;
    };
  }
  function duration_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id2, value)) : get2(this.node(), id2).duration;
  }

  // node_modules/d3-transition/src/transition/ease.js
  function easeConstant(id2, value) {
    if (typeof value !== "function") throw new Error();
    return function() {
      set2(this, id2).ease = value;
    };
  }
  function ease_default(value) {
    var id2 = this._id;
    return arguments.length ? this.each(easeConstant(id2, value)) : get2(this.node(), id2).ease;
  }

  // node_modules/d3-transition/src/transition/easeVarying.js
  function easeVarying(id2, value) {
    return function() {
      var v2 = value.apply(this, arguments);
      if (typeof v2 !== "function") throw new Error();
      set2(this, id2).ease = v2;
    };
  }
  function easeVarying_default(value) {
    if (typeof value !== "function") throw new Error();
    return this.each(easeVarying(this._id, value));
  }

  // node_modules/d3-transition/src/transition/filter.js
  function filter_default2(match) {
    if (typeof match !== "function") match = matcher_default(match);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }
    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  // node_modules/d3-transition/src/transition/merge.js
  function merge_default2(transition2) {
    if (transition2._id !== this._id) throw new Error();
    for (var groups0 = this._groups, groups1 = transition2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }
    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }
    return new Transition(merges, this._parents, this._name, this._id);
  }

  // node_modules/d3-transition/src/transition/on.js
  function start(name) {
    return (name + "").trim().split(/^|\s+/).every(function(t) {
      var i = t.indexOf(".");
      if (i >= 0) t = t.slice(0, i);
      return !t || t === "start";
    });
  }
  function onFunction(id2, name, listener) {
    var on0, on1, sit = start(name) ? init : set2;
    return function() {
      var schedule = sit(this, id2), on = schedule.on;
      if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
      schedule.on = on1;
    };
  }
  function on_default2(name, listener) {
    var id2 = this._id;
    return arguments.length < 2 ? get2(this.node(), id2).on.on(name) : this.each(onFunction(id2, name, listener));
  }

  // node_modules/d3-transition/src/transition/remove.js
  function removeFunction(id2) {
    return function() {
      var parent = this.parentNode;
      for (var i in this.__transition) if (+i !== id2) return;
      if (parent) parent.removeChild(this);
    };
  }
  function remove_default2() {
    return this.on("end.remove", removeFunction(this._id));
  }

  // node_modules/d3-transition/src/transition/select.js
  function select_default3(select) {
    var name = this._name, id2 = this._id;
    if (typeof select !== "function") select = selector_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule_default(subgroup[i], name, id2, i, subgroup, get2(node, id2));
        }
      }
    }
    return new Transition(subgroups, this._parents, name, id2);
  }

  // node_modules/d3-transition/src/transition/selectAll.js
  function selectAll_default2(select) {
    var name = this._name, id2 = this._id;
    if (typeof select !== "function") select = selectorAll_default(select);
    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children2 = select.call(node, node.__data__, i, group), child, inherit2 = get2(node, id2), k = 0, l = children2.length; k < l; ++k) {
            if (child = children2[k]) {
              schedule_default(child, name, id2, k, children2, inherit2);
            }
          }
          subgroups.push(children2);
          parents.push(node);
        }
      }
    }
    return new Transition(subgroups, parents, name, id2);
  }

  // node_modules/d3-transition/src/transition/selection.js
  var Selection2 = selection_default.prototype.constructor;
  function selection_default2() {
    return new Selection2(this._groups, this._parents);
  }

  // node_modules/d3-transition/src/transition/style.js
  function styleNull(name, interpolate) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
    };
  }
  function styleRemove2(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }
  function styleConstant2(name, interpolate, value1) {
    var string00, string1 = value1 + "", interpolate0;
    return function() {
      var string0 = styleValue(this, name);
      return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
    };
  }
  function styleFunction2(name, interpolate, value) {
    var string00, string10, interpolate0;
    return function() {
      var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
      if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }
  function styleMaybeRemove(id2, name) {
    var on0, on1, listener0, key = "style." + name, event = "end." + key, remove2;
    return function() {
      var schedule = set2(this, id2), on = schedule.on, listener = schedule.value[key] == null ? remove2 || (remove2 = styleRemove2(name)) : void 0;
      if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
      schedule.on = on1;
    };
  }
  function style_default2(name, value, priority) {
    var i = (name += "") === "transform" ? interpolateTransformCss : interpolate_default;
    return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove2(name)) : typeof value === "function" ? this.styleTween(name, styleFunction2(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant2(name, i, value), priority).on("end.style." + name, null);
  }

  // node_modules/d3-transition/src/transition/styleTween.js
  function styleInterpolate(name, i, priority) {
    return function(t) {
      this.style.setProperty(name, i.call(this, t), priority);
    };
  }
  function styleTween(name, value, priority) {
    var t, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
      return t;
    }
    tween._value = value;
    return tween;
  }
  function styleTween_default(name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

  // node_modules/d3-transition/src/transition/text.js
  function textConstant2(value) {
    return function() {
      this.textContent = value;
    };
  }
  function textFunction2(value) {
    return function() {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }
  function text_default2(value) {
    return this.tween("text", typeof value === "function" ? textFunction2(tweenValue(this, "text", value)) : textConstant2(value == null ? "" : value + ""));
  }

  // node_modules/d3-transition/src/transition/textTween.js
  function textInterpolate(i) {
    return function(t) {
      this.textContent = i.call(this, t);
    };
  }
  function textTween(value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
      return t0;
    }
    tween._value = value;
    return tween;
  }
  function textTween_default(value) {
    var key = "text";
    if (arguments.length < 1) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error();
    return this.tween(key, textTween(value));
  }

  // node_modules/d3-transition/src/transition/transition.js
  function transition_default() {
    var name = this._name, id0 = this._id, id1 = newId();
    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          var inherit2 = get2(node, id0);
          schedule_default(node, name, id1, i, group, {
            time: inherit2.time + inherit2.delay + inherit2.duration,
            delay: 0,
            duration: inherit2.duration,
            ease: inherit2.ease
          });
        }
      }
    }
    return new Transition(groups, this._parents, name, id1);
  }

  // node_modules/d3-transition/src/transition/end.js
  function end_default() {
    var on0, on1, that = this, id2 = that._id, size = that.size();
    return new Promise(function(resolve, reject) {
      var cancel = { value: reject }, end = { value: function() {
        if (--size === 0) resolve();
      } };
      that.each(function() {
        var schedule = set2(this, id2), on = schedule.on;
        if (on !== on0) {
          on1 = (on0 = on).copy();
          on1._.cancel.push(cancel);
          on1._.interrupt.push(cancel);
          on1._.end.push(end);
        }
        schedule.on = on1;
      });
      if (size === 0) resolve();
    });
  }

  // node_modules/d3-transition/src/transition/index.js
  var id = 0;
  function Transition(groups, parents, name, id2) {
    this._groups = groups;
    this._parents = parents;
    this._name = name;
    this._id = id2;
  }
  function transition(name) {
    return selection_default().transition(name);
  }
  function newId() {
    return ++id;
  }
  var selection_prototype = selection_default.prototype;
  Transition.prototype = transition.prototype = {
    constructor: Transition,
    select: select_default3,
    selectAll: selectAll_default2,
    selectChild: selection_prototype.selectChild,
    selectChildren: selection_prototype.selectChildren,
    filter: filter_default2,
    merge: merge_default2,
    selection: selection_default2,
    transition: transition_default,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: on_default2,
    attr: attr_default2,
    attrTween: attrTween_default,
    style: style_default2,
    styleTween: styleTween_default,
    text: text_default2,
    textTween: textTween_default,
    remove: remove_default2,
    tween: tween_default,
    delay: delay_default,
    duration: duration_default,
    ease: ease_default,
    easeVarying: easeVarying_default,
    end: end_default,
    [Symbol.iterator]: selection_prototype[Symbol.iterator]
  };

  // node_modules/d3-ease/src/cubic.js
  function cubicInOut(t) {
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  }

  // node_modules/d3-ease/src/math.js
  function tpmt(x2) {
    return (Math.pow(2, -10 * x2) - 9765625e-10) * 1.0009775171065494;
  }

  // node_modules/d3-ease/src/exp.js
  function expOut(t) {
    return 1 - tpmt(t);
  }

  // node_modules/d3-transition/src/selection/transition.js
  var defaultTiming = {
    time: null,
    // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };
  function inherit(node, id2) {
    var timing;
    while (!(timing = node.__transition) || !(timing = timing[id2])) {
      if (!(node = node.parentNode)) {
        throw new Error(`transition ${id2} not found`);
      }
    }
    return timing;
  }
  function transition_default2(name) {
    var id2, timing;
    if (name instanceof Transition) {
      id2 = name._id, name = name._name;
    } else {
      id2 = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
    }
    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          schedule_default(node, name, id2, i, group, timing || inherit(node, id2));
        }
      }
    }
    return new Transition(groups, this._parents, name, id2);
  }

  // node_modules/d3-transition/src/selection/index.js
  selection_default.prototype.interrupt = interrupt_default2;
  selection_default.prototype.transition = transition_default2;

  // node_modules/d3-brush/src/brush.js
  var { abs, max: max2, min } = Math;
  function number1(e) {
    return [+e[0], +e[1]];
  }
  function number2(e) {
    return [number1(e[0]), number1(e[1])];
  }
  var X = {
    name: "x",
    handles: ["w", "e"].map(type),
    input: function(x2, e) {
      return x2 == null ? null : [[+x2[0], e[0][1]], [+x2[1], e[1][1]]];
    },
    output: function(xy) {
      return xy && [xy[0][0], xy[1][0]];
    }
  };
  var Y = {
    name: "y",
    handles: ["n", "s"].map(type),
    input: function(y2, e) {
      return y2 == null ? null : [[e[0][0], +y2[0]], [e[1][0], +y2[1]]];
    },
    output: function(xy) {
      return xy && [xy[0][1], xy[1][1]];
    }
  };
  var XY = {
    name: "xy",
    handles: ["n", "w", "e", "s", "nw", "ne", "sw", "se"].map(type),
    input: function(xy) {
      return xy == null ? null : number2(xy);
    },
    output: function(xy) {
      return xy;
    }
  };
  function type(t) {
    return { type: t };
  }

  // node_modules/d3-path/src/path.js
  var pi = Math.PI;
  var tau = 2 * pi;
  var epsilon = 1e-6;
  var tauEpsilon = tau - epsilon;
  function append(strings) {
    this._ += strings[0];
    for (let i = 1, n = strings.length; i < n; ++i) {
      this._ += arguments[i] + strings[i];
    }
  }
  function appendRound(digits) {
    let d = Math.floor(digits);
    if (!(d >= 0)) throw new Error(`invalid digits: ${digits}`);
    if (d > 15) return append;
    const k = 10 ** d;
    return function(strings) {
      this._ += strings[0];
      for (let i = 1, n = strings.length; i < n; ++i) {
        this._ += Math.round(arguments[i] * k) / k + strings[i];
      }
    };
  }
  var Path = class {
    constructor(digits) {
      this._x0 = this._y0 = // start of current subpath
      this._x1 = this._y1 = null;
      this._ = "";
      this._append = digits == null ? append : appendRound(digits);
    }
    moveTo(x2, y2) {
      this._append`M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}`;
    }
    closePath() {
      if (this._x1 !== null) {
        this._x1 = this._x0, this._y1 = this._y0;
        this._append`Z`;
      }
    }
    lineTo(x2, y2) {
      this._append`L${this._x1 = +x2},${this._y1 = +y2}`;
    }
    quadraticCurveTo(x1, y1, x2, y2) {
      this._append`Q${+x1},${+y1},${this._x1 = +x2},${this._y1 = +y2}`;
    }
    bezierCurveTo(x1, y1, x2, y2, x3, y3) {
      this._append`C${+x1},${+y1},${+x2},${+y2},${this._x1 = +x3},${this._y1 = +y3}`;
    }
    arcTo(x1, y1, x2, y2, r) {
      x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
      if (r < 0) throw new Error(`negative radius: ${r}`);
      let x0 = this._x1, y0 = this._y1, x21 = x2 - x1, y21 = y2 - y1, x01 = x0 - x1, y01 = y0 - y1, l01_2 = x01 * x01 + y01 * y01;
      if (this._x1 === null) {
        this._append`M${this._x1 = x1},${this._y1 = y1}`;
      } else if (!(l01_2 > epsilon)) ;
      else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon) || !r) {
        this._append`L${this._x1 = x1},${this._y1 = y1}`;
      } else {
        let x20 = x2 - x0, y20 = y2 - y0, l21_2 = x21 * x21 + y21 * y21, l20_2 = x20 * x20 + y20 * y20, l21 = Math.sqrt(l21_2), l01 = Math.sqrt(l01_2), l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2), t01 = l / l01, t21 = l / l21;
        if (Math.abs(t01 - 1) > epsilon) {
          this._append`L${x1 + t01 * x01},${y1 + t01 * y01}`;
        }
        this._append`A${r},${r},0,0,${+(y01 * x20 > x01 * y20)},${this._x1 = x1 + t21 * x21},${this._y1 = y1 + t21 * y21}`;
      }
    }
    arc(x2, y2, r, a0, a1, ccw) {
      x2 = +x2, y2 = +y2, r = +r, ccw = !!ccw;
      if (r < 0) throw new Error(`negative radius: ${r}`);
      let dx = r * Math.cos(a0), dy = r * Math.sin(a0), x0 = x2 + dx, y0 = y2 + dy, cw = 1 ^ ccw, da2 = ccw ? a0 - a1 : a1 - a0;
      if (this._x1 === null) {
        this._append`M${x0},${y0}`;
      } else if (Math.abs(this._x1 - x0) > epsilon || Math.abs(this._y1 - y0) > epsilon) {
        this._append`L${x0},${y0}`;
      }
      if (!r) return;
      if (da2 < 0) da2 = da2 % tau + tau;
      if (da2 > tauEpsilon) {
        this._append`A${r},${r},0,1,${cw},${x2 - dx},${y2 - dy}A${r},${r},0,1,${cw},${this._x1 = x0},${this._y1 = y0}`;
      } else if (da2 > epsilon) {
        this._append`A${r},${r},0,${+(da2 >= pi)},${cw},${this._x1 = x2 + r * Math.cos(a1)},${this._y1 = y2 + r * Math.sin(a1)}`;
      }
    }
    rect(x2, y2, w, h) {
      this._append`M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}h${w = +w}v${+h}h${-w}Z`;
    }
    toString() {
      return this._;
    }
  };
  function path() {
    return new Path();
  }
  path.prototype = Path.prototype;

  // node_modules/robust-predicates/esm/util.js
  var epsilon2 = 11102230246251565e-32;
  var splitter = 134217729;
  var resulterrbound = (3 + 8 * epsilon2) * epsilon2;
  function sum(elen, e, flen, f, h) {
    let Q, Qnew, hh, bvirt;
    let enow = e[0];
    let fnow = f[0];
    let eindex = 0;
    let findex = 0;
    if (fnow > enow === fnow > -enow) {
      Q = enow;
      enow = e[++eindex];
    } else {
      Q = fnow;
      fnow = f[++findex];
    }
    let hindex = 0;
    if (eindex < elen && findex < flen) {
      if (fnow > enow === fnow > -enow) {
        Qnew = enow + Q;
        hh = Q - (Qnew - enow);
        enow = e[++eindex];
      } else {
        Qnew = fnow + Q;
        hh = Q - (Qnew - fnow);
        fnow = f[++findex];
      }
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
      while (eindex < elen && findex < flen) {
        if (fnow > enow === fnow > -enow) {
          Qnew = Q + enow;
          bvirt = Qnew - Q;
          hh = Q - (Qnew - bvirt) + (enow - bvirt);
          enow = e[++eindex];
        } else {
          Qnew = Q + fnow;
          bvirt = Qnew - Q;
          hh = Q - (Qnew - bvirt) + (fnow - bvirt);
          fnow = f[++findex];
        }
        Q = Qnew;
        if (hh !== 0) {
          h[hindex++] = hh;
        }
      }
    }
    while (eindex < elen) {
      Qnew = Q + enow;
      bvirt = Qnew - Q;
      hh = Q - (Qnew - bvirt) + (enow - bvirt);
      enow = e[++eindex];
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
    }
    while (findex < flen) {
      Qnew = Q + fnow;
      bvirt = Qnew - Q;
      hh = Q - (Qnew - bvirt) + (fnow - bvirt);
      fnow = f[++findex];
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
    }
    if (Q !== 0 || hindex === 0) {
      h[hindex++] = Q;
    }
    return hindex;
  }
  function estimate(elen, e) {
    let Q = e[0];
    for (let i = 1; i < elen; i++) Q += e[i];
    return Q;
  }
  function vec(n) {
    return new Float64Array(n);
  }

  // node_modules/robust-predicates/esm/orient2d.js
  var ccwerrboundA = (3 + 16 * epsilon2) * epsilon2;
  var ccwerrboundB = (2 + 12 * epsilon2) * epsilon2;
  var ccwerrboundC = (9 + 64 * epsilon2) * epsilon2 * epsilon2;
  var B = vec(4);
  var C1 = vec(8);
  var C2 = vec(12);
  var D = vec(16);
  var u = vec(4);
  function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
    let acxtail, acytail, bcxtail, bcytail;
    let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
    const acx = ax - cx;
    const bcx = bx - cx;
    const acy = ay - cy;
    const bcy = by - cy;
    s1 = acx * bcy;
    c = splitter * acx;
    ahi = c - (c - acx);
    alo = acx - ahi;
    c = splitter * bcy;
    bhi = c - (c - bcy);
    blo = bcy - bhi;
    s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    t1 = acy * bcx;
    c = splitter * acy;
    ahi = c - (c - acy);
    alo = acy - ahi;
    c = splitter * bcx;
    bhi = c - (c - bcx);
    blo = bcx - bhi;
    t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
    _i = s0 - t0;
    bvirt = s0 - _i;
    B[0] = s0 - (_i + bvirt) + (bvirt - t0);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 - t1;
    bvirt = _0 - _i;
    B[1] = _0 - (_i + bvirt) + (bvirt - t1);
    u32 = _j + _i;
    bvirt = u32 - _j;
    B[2] = _j - (u32 - bvirt) + (_i - bvirt);
    B[3] = u32;
    let det = estimate(4, B);
    let errbound = ccwerrboundB * detsum;
    if (det >= errbound || -det >= errbound) {
      return det;
    }
    bvirt = ax - acx;
    acxtail = ax - (acx + bvirt) + (bvirt - cx);
    bvirt = bx - bcx;
    bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
    bvirt = ay - acy;
    acytail = ay - (acy + bvirt) + (bvirt - cy);
    bvirt = by - bcy;
    bcytail = by - (bcy + bvirt) + (bvirt - cy);
    if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
      return det;
    }
    errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det);
    det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
    if (det >= errbound || -det >= errbound) return det;
    s1 = acxtail * bcy;
    c = splitter * acxtail;
    ahi = c - (c - acxtail);
    alo = acxtail - ahi;
    c = splitter * bcy;
    bhi = c - (c - bcy);
    blo = bcy - bhi;
    s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    t1 = acytail * bcx;
    c = splitter * acytail;
    ahi = c - (c - acytail);
    alo = acytail - ahi;
    c = splitter * bcx;
    bhi = c - (c - bcx);
    blo = bcx - bhi;
    t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
    _i = s0 - t0;
    bvirt = s0 - _i;
    u[0] = s0 - (_i + bvirt) + (bvirt - t0);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 - t1;
    bvirt = _0 - _i;
    u[1] = _0 - (_i + bvirt) + (bvirt - t1);
    u32 = _j + _i;
    bvirt = u32 - _j;
    u[2] = _j - (u32 - bvirt) + (_i - bvirt);
    u[3] = u32;
    const C1len = sum(4, B, 4, u, C1);
    s1 = acx * bcytail;
    c = splitter * acx;
    ahi = c - (c - acx);
    alo = acx - ahi;
    c = splitter * bcytail;
    bhi = c - (c - bcytail);
    blo = bcytail - bhi;
    s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    t1 = acy * bcxtail;
    c = splitter * acy;
    ahi = c - (c - acy);
    alo = acy - ahi;
    c = splitter * bcxtail;
    bhi = c - (c - bcxtail);
    blo = bcxtail - bhi;
    t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
    _i = s0 - t0;
    bvirt = s0 - _i;
    u[0] = s0 - (_i + bvirt) + (bvirt - t0);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 - t1;
    bvirt = _0 - _i;
    u[1] = _0 - (_i + bvirt) + (bvirt - t1);
    u32 = _j + _i;
    bvirt = u32 - _j;
    u[2] = _j - (u32 - bvirt) + (_i - bvirt);
    u[3] = u32;
    const C2len = sum(C1len, C1, 4, u, C2);
    s1 = acxtail * bcytail;
    c = splitter * acxtail;
    ahi = c - (c - acxtail);
    alo = acxtail - ahi;
    c = splitter * bcytail;
    bhi = c - (c - bcytail);
    blo = bcytail - bhi;
    s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
    t1 = acytail * bcxtail;
    c = splitter * acytail;
    ahi = c - (c - acytail);
    alo = acytail - ahi;
    c = splitter * bcxtail;
    bhi = c - (c - bcxtail);
    blo = bcxtail - bhi;
    t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
    _i = s0 - t0;
    bvirt = s0 - _i;
    u[0] = s0 - (_i + bvirt) + (bvirt - t0);
    _j = s1 + _i;
    bvirt = _j - s1;
    _0 = s1 - (_j - bvirt) + (_i - bvirt);
    _i = _0 - t1;
    bvirt = _0 - _i;
    u[1] = _0 - (_i + bvirt) + (bvirt - t1);
    u32 = _j + _i;
    bvirt = u32 - _j;
    u[2] = _j - (u32 - bvirt) + (_i - bvirt);
    u[3] = u32;
    const Dlen = sum(C2len, C2, 4, u, D);
    return D[Dlen - 1];
  }
  function orient2d(ax, ay, bx, by, cx, cy) {
    const detleft = (ay - cy) * (bx - cx);
    const detright = (ax - cx) * (by - cy);
    const det = detleft - detright;
    const detsum = Math.abs(detleft + detright);
    if (Math.abs(det) >= ccwerrboundA * detsum) return det;
    return -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
  }

  // node_modules/robust-predicates/esm/orient3d.js
  var o3derrboundA = (7 + 56 * epsilon2) * epsilon2;
  var o3derrboundB = (3 + 28 * epsilon2) * epsilon2;
  var o3derrboundC = (26 + 288 * epsilon2) * epsilon2 * epsilon2;
  var bc = vec(4);
  var ca = vec(4);
  var ab = vec(4);
  var at_b = vec(4);
  var at_c = vec(4);
  var bt_c = vec(4);
  var bt_a = vec(4);
  var ct_a = vec(4);
  var ct_b = vec(4);
  var bct = vec(8);
  var cat = vec(8);
  var abt = vec(8);
  var u2 = vec(4);
  var _8 = vec(8);
  var _8b = vec(8);
  var _16 = vec(8);
  var _12 = vec(12);
  var fin = vec(192);
  var fin2 = vec(192);

  // node_modules/robust-predicates/esm/incircle.js
  var iccerrboundA = (10 + 96 * epsilon2) * epsilon2;
  var iccerrboundB = (4 + 48 * epsilon2) * epsilon2;
  var iccerrboundC = (44 + 576 * epsilon2) * epsilon2 * epsilon2;
  var bc2 = vec(4);
  var ca2 = vec(4);
  var ab2 = vec(4);
  var aa = vec(4);
  var bb = vec(4);
  var cc = vec(4);
  var u3 = vec(4);
  var v = vec(4);
  var axtbc = vec(8);
  var aytbc = vec(8);
  var bxtca = vec(8);
  var bytca = vec(8);
  var cxtab = vec(8);
  var cytab = vec(8);
  var abt2 = vec(8);
  var bct2 = vec(8);
  var cat2 = vec(8);
  var abtt = vec(4);
  var bctt = vec(4);
  var catt = vec(4);
  var _82 = vec(8);
  var _162 = vec(16);
  var _16b = vec(16);
  var _16c = vec(16);
  var _32 = vec(32);
  var _32b = vec(32);
  var _48 = vec(48);
  var _64 = vec(64);
  var fin3 = vec(1152);
  var fin22 = vec(1152);

  // node_modules/robust-predicates/esm/insphere.js
  var isperrboundA = (16 + 224 * epsilon2) * epsilon2;
  var isperrboundB = (5 + 72 * epsilon2) * epsilon2;
  var isperrboundC = (71 + 1408 * epsilon2) * epsilon2 * epsilon2;
  var ab3 = vec(4);
  var bc3 = vec(4);
  var cd = vec(4);
  var de = vec(4);
  var ea = vec(4);
  var ac = vec(4);
  var bd = vec(4);
  var ce = vec(4);
  var da = vec(4);
  var eb = vec(4);
  var abc = vec(24);
  var bcd = vec(24);
  var cde = vec(24);
  var dea = vec(24);
  var eab = vec(24);
  var abd = vec(24);
  var bce = vec(24);
  var cda = vec(24);
  var deb = vec(24);
  var eac = vec(24);
  var adet = vec(1152);
  var bdet = vec(1152);
  var cdet = vec(1152);
  var ddet = vec(1152);
  var edet = vec(1152);
  var abdet = vec(2304);
  var cddet = vec(2304);
  var cdedet = vec(3456);
  var deter = vec(5760);
  var _83 = vec(8);
  var _8b2 = vec(8);
  var _8c = vec(8);
  var _163 = vec(16);
  var _24 = vec(24);
  var _482 = vec(48);
  var _48b = vec(48);
  var _96 = vec(96);
  var _192 = vec(192);
  var _384x = vec(384);
  var _384y = vec(384);
  var _384z = vec(384);
  var _768 = vec(768);
  var xdet = vec(96);
  var ydet = vec(96);
  var zdet = vec(96);
  var fin4 = vec(1152);

  // node_modules/delaunator/index.js
  var EPSILON = Math.pow(2, -52);
  var EDGE_STACK = new Uint32Array(512);
  var Delaunator = class _Delaunator {
    static from(points, getX = defaultGetX, getY = defaultGetY) {
      const n = points.length;
      const coords = new Float64Array(n * 2);
      for (let i = 0; i < n; i++) {
        const p = points[i];
        coords[2 * i] = getX(p);
        coords[2 * i + 1] = getY(p);
      }
      return new _Delaunator(coords);
    }
    constructor(coords) {
      const n = coords.length >> 1;
      if (n > 0 && typeof coords[0] !== "number") throw new Error("Expected coords to contain numbers.");
      this.coords = coords;
      const maxTriangles = Math.max(2 * n - 5, 0);
      this._triangles = new Uint32Array(maxTriangles * 3);
      this._halfedges = new Int32Array(maxTriangles * 3);
      this._hashSize = Math.ceil(Math.sqrt(n));
      this._hullPrev = new Uint32Array(n);
      this._hullNext = new Uint32Array(n);
      this._hullTri = new Uint32Array(n);
      this._hullHash = new Int32Array(this._hashSize);
      this._ids = new Uint32Array(n);
      this._dists = new Float64Array(n);
      this.update();
    }
    update() {
      const { coords, _hullPrev: hullPrev, _hullNext: hullNext, _hullTri: hullTri, _hullHash: hullHash } = this;
      const n = coords.length >> 1;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < n; i++) {
        const x2 = coords[2 * i];
        const y2 = coords[2 * i + 1];
        if (x2 < minX) minX = x2;
        if (y2 < minY) minY = y2;
        if (x2 > maxX) maxX = x2;
        if (y2 > maxY) maxY = y2;
        this._ids[i] = i;
      }
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      let i0, i1, i2;
      for (let i = 0, minDist = Infinity; i < n; i++) {
        const d = dist(cx, cy, coords[2 * i], coords[2 * i + 1]);
        if (d < minDist) {
          i0 = i;
          minDist = d;
        }
      }
      const i0x = coords[2 * i0];
      const i0y = coords[2 * i0 + 1];
      for (let i = 0, minDist = Infinity; i < n; i++) {
        if (i === i0) continue;
        const d = dist(i0x, i0y, coords[2 * i], coords[2 * i + 1]);
        if (d < minDist && d > 0) {
          i1 = i;
          minDist = d;
        }
      }
      let i1x = coords[2 * i1];
      let i1y = coords[2 * i1 + 1];
      let minRadius = Infinity;
      for (let i = 0; i < n; i++) {
        if (i === i0 || i === i1) continue;
        const r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i], coords[2 * i + 1]);
        if (r < minRadius) {
          i2 = i;
          minRadius = r;
        }
      }
      let i2x = coords[2 * i2];
      let i2y = coords[2 * i2 + 1];
      if (minRadius === Infinity) {
        for (let i = 0; i < n; i++) {
          this._dists[i] = coords[2 * i] - coords[0] || coords[2 * i + 1] - coords[1];
        }
        quicksort(this._ids, this._dists, 0, n - 1);
        const hull = new Uint32Array(n);
        let j = 0;
        for (let i = 0, d0 = -Infinity; i < n; i++) {
          const id2 = this._ids[i];
          const d = this._dists[id2];
          if (d > d0) {
            hull[j++] = id2;
            d0 = d;
          }
        }
        this.hull = hull.subarray(0, j);
        this.triangles = new Uint32Array(0);
        this.halfedges = new Uint32Array(0);
        return;
      }
      if (orient2d(i0x, i0y, i1x, i1y, i2x, i2y) < 0) {
        const i = i1;
        const x2 = i1x;
        const y2 = i1y;
        i1 = i2;
        i1x = i2x;
        i1y = i2y;
        i2 = i;
        i2x = x2;
        i2y = y2;
      }
      const center = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
      this._cx = center.x;
      this._cy = center.y;
      for (let i = 0; i < n; i++) {
        this._dists[i] = dist(coords[2 * i], coords[2 * i + 1], center.x, center.y);
      }
      quicksort(this._ids, this._dists, 0, n - 1);
      this._hullStart = i0;
      let hullSize = 3;
      hullNext[i0] = hullPrev[i2] = i1;
      hullNext[i1] = hullPrev[i0] = i2;
      hullNext[i2] = hullPrev[i1] = i0;
      hullTri[i0] = 0;
      hullTri[i1] = 1;
      hullTri[i2] = 2;
      hullHash.fill(-1);
      hullHash[this._hashKey(i0x, i0y)] = i0;
      hullHash[this._hashKey(i1x, i1y)] = i1;
      hullHash[this._hashKey(i2x, i2y)] = i2;
      this.trianglesLen = 0;
      this._addTriangle(i0, i1, i2, -1, -1, -1);
      for (let k = 0, xp, yp; k < this._ids.length; k++) {
        const i = this._ids[k];
        const x2 = coords[2 * i];
        const y2 = coords[2 * i + 1];
        if (k > 0 && Math.abs(x2 - xp) <= EPSILON && Math.abs(y2 - yp) <= EPSILON) continue;
        xp = x2;
        yp = y2;
        if (i === i0 || i === i1 || i === i2) continue;
        let start2 = 0;
        for (let j = 0, key = this._hashKey(x2, y2); j < this._hashSize; j++) {
          start2 = hullHash[(key + j) % this._hashSize];
          if (start2 !== -1 && start2 !== hullNext[start2]) break;
        }
        start2 = hullPrev[start2];
        let e = start2, q;
        while (q = hullNext[e], orient2d(x2, y2, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1]) >= 0) {
          e = q;
          if (e === start2) {
            e = -1;
            break;
          }
        }
        if (e === -1) continue;
        let t = this._addTriangle(e, i, hullNext[e], -1, -1, hullTri[e]);
        hullTri[i] = this._legalize(t + 2);
        hullTri[e] = t;
        hullSize++;
        let n2 = hullNext[e];
        while (q = hullNext[n2], orient2d(x2, y2, coords[2 * n2], coords[2 * n2 + 1], coords[2 * q], coords[2 * q + 1]) < 0) {
          t = this._addTriangle(n2, i, q, hullTri[i], -1, hullTri[n2]);
          hullTri[i] = this._legalize(t + 2);
          hullNext[n2] = n2;
          hullSize--;
          n2 = q;
        }
        if (e === start2) {
          while (q = hullPrev[e], orient2d(x2, y2, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1]) < 0) {
            t = this._addTriangle(q, i, e, -1, hullTri[e], hullTri[q]);
            this._legalize(t + 2);
            hullTri[q] = t;
            hullNext[e] = e;
            hullSize--;
            e = q;
          }
        }
        this._hullStart = hullPrev[i] = e;
        hullNext[e] = hullPrev[n2] = i;
        hullNext[i] = n2;
        hullHash[this._hashKey(x2, y2)] = i;
        hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
      }
      this.hull = new Uint32Array(hullSize);
      for (let i = 0, e = this._hullStart; i < hullSize; i++) {
        this.hull[i] = e;
        e = hullNext[e];
      }
      this.triangles = this._triangles.subarray(0, this.trianglesLen);
      this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
    }
    _hashKey(x2, y2) {
      return Math.floor(pseudoAngle(x2 - this._cx, y2 - this._cy) * this._hashSize) % this._hashSize;
    }
    _legalize(a) {
      const { _triangles: triangles, _halfedges: halfedges, coords } = this;
      let i = 0;
      let ar = 0;
      while (true) {
        const b = halfedges[a];
        const a0 = a - a % 3;
        ar = a0 + (a + 2) % 3;
        if (b === -1) {
          if (i === 0) break;
          a = EDGE_STACK[--i];
          continue;
        }
        const b0 = b - b % 3;
        const al = a0 + (a + 1) % 3;
        const bl = b0 + (b + 2) % 3;
        const p0 = triangles[ar];
        const pr = triangles[a];
        const pl = triangles[al];
        const p1 = triangles[bl];
        const illegal = inCircle(
          coords[2 * p0],
          coords[2 * p0 + 1],
          coords[2 * pr],
          coords[2 * pr + 1],
          coords[2 * pl],
          coords[2 * pl + 1],
          coords[2 * p1],
          coords[2 * p1 + 1]
        );
        if (illegal) {
          triangles[a] = p1;
          triangles[b] = p0;
          const hbl = halfedges[bl];
          if (hbl === -1) {
            let e = this._hullStart;
            do {
              if (this._hullTri[e] === bl) {
                this._hullTri[e] = a;
                break;
              }
              e = this._hullPrev[e];
            } while (e !== this._hullStart);
          }
          this._link(a, hbl);
          this._link(b, halfedges[ar]);
          this._link(ar, bl);
          const br = b0 + (b + 1) % 3;
          if (i < EDGE_STACK.length) {
            EDGE_STACK[i++] = br;
          }
        } else {
          if (i === 0) break;
          a = EDGE_STACK[--i];
        }
      }
      return ar;
    }
    _link(a, b) {
      this._halfedges[a] = b;
      if (b !== -1) this._halfedges[b] = a;
    }
    // add a new triangle given vertex indices and adjacent half-edge ids
    _addTriangle(i0, i1, i2, a, b, c) {
      const t = this.trianglesLen;
      this._triangles[t] = i0;
      this._triangles[t + 1] = i1;
      this._triangles[t + 2] = i2;
      this._link(t, a);
      this._link(t + 1, b);
      this._link(t + 2, c);
      this.trianglesLen += 3;
      return t;
    }
  };
  function pseudoAngle(dx, dy) {
    const p = dx / (Math.abs(dx) + Math.abs(dy));
    return (dy > 0 ? 3 - p : 1 + p) / 4;
  }
  function dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }
  function inCircle(ax, ay, bx, by, cx, cy, px, py) {
    const dx = ax - px;
    const dy = ay - py;
    const ex = bx - px;
    const ey = by - py;
    const fx = cx - px;
    const fy = cy - py;
    const ap = dx * dx + dy * dy;
    const bp = ex * ex + ey * ey;
    const cp = fx * fx + fy * fy;
    return dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0;
  }
  function circumradius(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax;
    const dy = by - ay;
    const ex = cx - ax;
    const ey = cy - ay;
    const bl = dx * dx + dy * dy;
    const cl = ex * ex + ey * ey;
    const d = 0.5 / (dx * ey - dy * ex);
    const x2 = (ey * bl - dy * cl) * d;
    const y2 = (dx * cl - ex * bl) * d;
    return x2 * x2 + y2 * y2;
  }
  function circumcenter(ax, ay, bx, by, cx, cy) {
    const dx = bx - ax;
    const dy = by - ay;
    const ex = cx - ax;
    const ey = cy - ay;
    const bl = dx * dx + dy * dy;
    const cl = ex * ex + ey * ey;
    const d = 0.5 / (dx * ey - dy * ex);
    const x2 = ax + (ey * bl - dy * cl) * d;
    const y2 = ay + (dx * cl - ex * bl) * d;
    return { x: x2, y: y2 };
  }
  function quicksort(ids, dists, left, right) {
    if (right - left <= 20) {
      for (let i = left + 1; i <= right; i++) {
        const temp = ids[i];
        const tempDist = dists[temp];
        let j = i - 1;
        while (j >= left && dists[ids[j]] > tempDist) ids[j + 1] = ids[j--];
        ids[j + 1] = temp;
      }
    } else {
      const median = left + right >> 1;
      let i = left + 1;
      let j = right;
      swap(ids, median, i);
      if (dists[ids[left]] > dists[ids[right]]) swap(ids, left, right);
      if (dists[ids[i]] > dists[ids[right]]) swap(ids, i, right);
      if (dists[ids[left]] > dists[ids[i]]) swap(ids, left, i);
      const temp = ids[i];
      const tempDist = dists[temp];
      while (true) {
        do
          i++;
        while (dists[ids[i]] < tempDist);
        do
          j--;
        while (dists[ids[j]] > tempDist);
        if (j < i) break;
        swap(ids, i, j);
      }
      ids[left + 1] = ids[j];
      ids[j] = temp;
      if (right - i + 1 >= j - left) {
        quicksort(ids, dists, i, right);
        quicksort(ids, dists, left, j - 1);
      } else {
        quicksort(ids, dists, left, j - 1);
        quicksort(ids, dists, i, right);
      }
    }
  }
  function swap(arr, i, j) {
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  function defaultGetX(p) {
    return p[0];
  }
  function defaultGetY(p) {
    return p[1];
  }

  // node_modules/d3-delaunay/src/path.js
  var epsilon3 = 1e-6;
  var Path2 = class {
    constructor() {
      this._x0 = this._y0 = // start of current subpath
      this._x1 = this._y1 = null;
      this._ = "";
    }
    moveTo(x2, y2) {
      this._ += `M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}`;
    }
    closePath() {
      if (this._x1 !== null) {
        this._x1 = this._x0, this._y1 = this._y0;
        this._ += "Z";
      }
    }
    lineTo(x2, y2) {
      this._ += `L${this._x1 = +x2},${this._y1 = +y2}`;
    }
    arc(x2, y2, r) {
      x2 = +x2, y2 = +y2, r = +r;
      const x0 = x2 + r;
      const y0 = y2;
      if (r < 0) throw new Error("negative radius");
      if (this._x1 === null) this._ += `M${x0},${y0}`;
      else if (Math.abs(this._x1 - x0) > epsilon3 || Math.abs(this._y1 - y0) > epsilon3) this._ += "L" + x0 + "," + y0;
      if (!r) return;
      this._ += `A${r},${r},0,1,1,${x2 - r},${y2}A${r},${r},0,1,1,${this._x1 = x0},${this._y1 = y0}`;
    }
    rect(x2, y2, w, h) {
      this._ += `M${this._x0 = this._x1 = +x2},${this._y0 = this._y1 = +y2}h${+w}v${+h}h${-w}Z`;
    }
    value() {
      return this._ || null;
    }
  };

  // node_modules/d3-delaunay/src/polygon.js
  var Polygon = class {
    constructor() {
      this._ = [];
    }
    moveTo(x2, y2) {
      this._.push([x2, y2]);
    }
    closePath() {
      this._.push(this._[0].slice());
    }
    lineTo(x2, y2) {
      this._.push([x2, y2]);
    }
    value() {
      return this._.length ? this._ : null;
    }
  };

  // node_modules/d3-delaunay/src/voronoi.js
  var Voronoi = class {
    constructor(delaunay, [xmin, ymin, xmax, ymax] = [0, 0, 960, 500]) {
      if (!((xmax = +xmax) >= (xmin = +xmin)) || !((ymax = +ymax) >= (ymin = +ymin))) throw new Error("invalid bounds");
      this.delaunay = delaunay;
      this._circumcenters = new Float64Array(delaunay.points.length * 2);
      this.vectors = new Float64Array(delaunay.points.length * 2);
      this.xmax = xmax, this.xmin = xmin;
      this.ymax = ymax, this.ymin = ymin;
      this._init();
    }
    update() {
      this.delaunay.update();
      this._init();
      return this;
    }
    _init() {
      const { delaunay: { points, hull, triangles }, vectors } = this;
      let bx, by;
      const circumcenters = this.circumcenters = this._circumcenters.subarray(0, triangles.length / 3 * 2);
      for (let i = 0, j = 0, n = triangles.length, x2, y2; i < n; i += 3, j += 2) {
        const t1 = triangles[i] * 2;
        const t2 = triangles[i + 1] * 2;
        const t3 = triangles[i + 2] * 2;
        const x12 = points[t1];
        const y12 = points[t1 + 1];
        const x22 = points[t2];
        const y22 = points[t2 + 1];
        const x3 = points[t3];
        const y3 = points[t3 + 1];
        const dx = x22 - x12;
        const dy = y22 - y12;
        const ex = x3 - x12;
        const ey = y3 - y12;
        const ab4 = (dx * ey - dy * ex) * 2;
        if (Math.abs(ab4) < 1e-9) {
          if (bx === void 0) {
            bx = by = 0;
            for (const i2 of hull) bx += points[i2 * 2], by += points[i2 * 2 + 1];
            bx /= hull.length, by /= hull.length;
          }
          const a = 1e9 * Math.sign((bx - x12) * ey - (by - y12) * ex);
          x2 = (x12 + x3) / 2 - a * ey;
          y2 = (y12 + y3) / 2 + a * ex;
        } else {
          const d = 1 / ab4;
          const bl = dx * dx + dy * dy;
          const cl = ex * ex + ey * ey;
          x2 = x12 + (ey * bl - dy * cl) * d;
          y2 = y12 + (dx * cl - ex * bl) * d;
        }
        circumcenters[j] = x2;
        circumcenters[j + 1] = y2;
      }
      let h = hull[hull.length - 1];
      let p0, p1 = h * 4;
      let x0, x1 = points[2 * h];
      let y0, y1 = points[2 * h + 1];
      vectors.fill(0);
      for (let i = 0; i < hull.length; ++i) {
        h = hull[i];
        p0 = p1, x0 = x1, y0 = y1;
        p1 = h * 4, x1 = points[2 * h], y1 = points[2 * h + 1];
        vectors[p0 + 2] = vectors[p1] = y0 - y1;
        vectors[p0 + 3] = vectors[p1 + 1] = x1 - x0;
      }
    }
    render(context) {
      const buffer = context == null ? context = new Path2() : void 0;
      const { delaunay: { halfedges, inedges, hull }, circumcenters, vectors } = this;
      if (hull.length <= 1) return null;
      for (let i = 0, n = halfedges.length; i < n; ++i) {
        const j = halfedges[i];
        if (j < i) continue;
        const ti = Math.floor(i / 3) * 2;
        const tj = Math.floor(j / 3) * 2;
        const xi = circumcenters[ti];
        const yi = circumcenters[ti + 1];
        const xj = circumcenters[tj];
        const yj = circumcenters[tj + 1];
        this._renderSegment(xi, yi, xj, yj, context);
      }
      let h0, h1 = hull[hull.length - 1];
      for (let i = 0; i < hull.length; ++i) {
        h0 = h1, h1 = hull[i];
        const t = Math.floor(inedges[h1] / 3) * 2;
        const x2 = circumcenters[t];
        const y2 = circumcenters[t + 1];
        const v2 = h0 * 4;
        const p = this._project(x2, y2, vectors[v2 + 2], vectors[v2 + 3]);
        if (p) this._renderSegment(x2, y2, p[0], p[1], context);
      }
      return buffer && buffer.value();
    }
    renderBounds(context) {
      const buffer = context == null ? context = new Path2() : void 0;
      context.rect(this.xmin, this.ymin, this.xmax - this.xmin, this.ymax - this.ymin);
      return buffer && buffer.value();
    }
    renderCell(i, context) {
      const buffer = context == null ? context = new Path2() : void 0;
      const points = this._clip(i);
      if (points === null || !points.length) return;
      context.moveTo(points[0], points[1]);
      let n = points.length;
      while (points[0] === points[n - 2] && points[1] === points[n - 1] && n > 1) n -= 2;
      for (let i2 = 2; i2 < n; i2 += 2) {
        if (points[i2] !== points[i2 - 2] || points[i2 + 1] !== points[i2 - 1])
          context.lineTo(points[i2], points[i2 + 1]);
      }
      context.closePath();
      return buffer && buffer.value();
    }
    *cellPolygons() {
      const { delaunay: { points } } = this;
      for (let i = 0, n = points.length / 2; i < n; ++i) {
        const cell = this.cellPolygon(i);
        if (cell) cell.index = i, yield cell;
      }
    }
    cellPolygon(i) {
      const polygon = new Polygon();
      this.renderCell(i, polygon);
      return polygon.value();
    }
    _renderSegment(x0, y0, x1, y1, context) {
      let S;
      const c0 = this._regioncode(x0, y0);
      const c1 = this._regioncode(x1, y1);
      if (c0 === 0 && c1 === 0) {
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
      } else if (S = this._clipSegment(x0, y0, x1, y1, c0, c1)) {
        context.moveTo(S[0], S[1]);
        context.lineTo(S[2], S[3]);
      }
    }
    contains(i, x2, y2) {
      if ((x2 = +x2, x2 !== x2) || (y2 = +y2, y2 !== y2)) return false;
      return this.delaunay._step(i, x2, y2) === i;
    }
    *neighbors(i) {
      const ci = this._clip(i);
      if (ci) for (const j of this.delaunay.neighbors(i)) {
        const cj = this._clip(j);
        if (cj) loop: for (let ai = 0, li = ci.length; ai < li; ai += 2) {
          for (let aj = 0, lj = cj.length; aj < lj; aj += 2) {
            if (ci[ai] === cj[aj] && ci[ai + 1] === cj[aj + 1] && ci[(ai + 2) % li] === cj[(aj + lj - 2) % lj] && ci[(ai + 3) % li] === cj[(aj + lj - 1) % lj]) {
              yield j;
              break loop;
            }
          }
        }
      }
    }
    _cell(i) {
      const { circumcenters, delaunay: { inedges, halfedges, triangles } } = this;
      const e0 = inedges[i];
      if (e0 === -1) return null;
      const points = [];
      let e = e0;
      do {
        const t = Math.floor(e / 3);
        points.push(circumcenters[t * 2], circumcenters[t * 2 + 1]);
        e = e % 3 === 2 ? e - 2 : e + 1;
        if (triangles[e] !== i) break;
        e = halfedges[e];
      } while (e !== e0 && e !== -1);
      return points;
    }
    _clip(i) {
      if (i === 0 && this.delaunay.hull.length === 1) {
        return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
      }
      const points = this._cell(i);
      if (points === null) return null;
      const { vectors: V } = this;
      const v2 = i * 4;
      return this._simplify(V[v2] || V[v2 + 1] ? this._clipInfinite(i, points, V[v2], V[v2 + 1], V[v2 + 2], V[v2 + 3]) : this._clipFinite(i, points));
    }
    _clipFinite(i, points) {
      const n = points.length;
      let P = null;
      let x0, y0, x1 = points[n - 2], y1 = points[n - 1];
      let c0, c1 = this._regioncode(x1, y1);
      let e0, e1 = 0;
      for (let j = 0; j < n; j += 2) {
        x0 = x1, y0 = y1, x1 = points[j], y1 = points[j + 1];
        c0 = c1, c1 = this._regioncode(x1, y1);
        if (c0 === 0 && c1 === 0) {
          e0 = e1, e1 = 0;
          if (P) P.push(x1, y1);
          else P = [x1, y1];
        } else {
          let S, sx0, sy0, sx1, sy1;
          if (c0 === 0) {
            if ((S = this._clipSegment(x0, y0, x1, y1, c0, c1)) === null) continue;
            [sx0, sy0, sx1, sy1] = S;
          } else {
            if ((S = this._clipSegment(x1, y1, x0, y0, c1, c0)) === null) continue;
            [sx1, sy1, sx0, sy0] = S;
            e0 = e1, e1 = this._edgecode(sx0, sy0);
            if (e0 && e1) this._edge(i, e0, e1, P, P.length);
            if (P) P.push(sx0, sy0);
            else P = [sx0, sy0];
          }
          e0 = e1, e1 = this._edgecode(sx1, sy1);
          if (e0 && e1) this._edge(i, e0, e1, P, P.length);
          if (P) P.push(sx1, sy1);
          else P = [sx1, sy1];
        }
      }
      if (P) {
        e0 = e1, e1 = this._edgecode(P[0], P[1]);
        if (e0 && e1) this._edge(i, e0, e1, P, P.length);
      } else if (this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2)) {
        return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
      }
      return P;
    }
    _clipSegment(x0, y0, x1, y1, c0, c1) {
      const flip = c0 < c1;
      if (flip) [x0, y0, x1, y1, c0, c1] = [x1, y1, x0, y0, c1, c0];
      while (true) {
        if (c0 === 0 && c1 === 0) return flip ? [x1, y1, x0, y0] : [x0, y0, x1, y1];
        if (c0 & c1) return null;
        let x2, y2, c = c0 || c1;
        if (c & 8) x2 = x0 + (x1 - x0) * (this.ymax - y0) / (y1 - y0), y2 = this.ymax;
        else if (c & 4) x2 = x0 + (x1 - x0) * (this.ymin - y0) / (y1 - y0), y2 = this.ymin;
        else if (c & 2) y2 = y0 + (y1 - y0) * (this.xmax - x0) / (x1 - x0), x2 = this.xmax;
        else y2 = y0 + (y1 - y0) * (this.xmin - x0) / (x1 - x0), x2 = this.xmin;
        if (c0) x0 = x2, y0 = y2, c0 = this._regioncode(x0, y0);
        else x1 = x2, y1 = y2, c1 = this._regioncode(x1, y1);
      }
    }
    _clipInfinite(i, points, vx0, vy0, vxn, vyn) {
      let P = Array.from(points), p;
      if (p = this._project(P[0], P[1], vx0, vy0)) P.unshift(p[0], p[1]);
      if (p = this._project(P[P.length - 2], P[P.length - 1], vxn, vyn)) P.push(p[0], p[1]);
      if (P = this._clipFinite(i, P)) {
        for (let j = 0, n = P.length, c0, c1 = this._edgecode(P[n - 2], P[n - 1]); j < n; j += 2) {
          c0 = c1, c1 = this._edgecode(P[j], P[j + 1]);
          if (c0 && c1) j = this._edge(i, c0, c1, P, j), n = P.length;
        }
      } else if (this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2)) {
        P = [this.xmin, this.ymin, this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax];
      }
      return P;
    }
    _edge(i, e0, e1, P, j) {
      while (e0 !== e1) {
        let x2, y2;
        switch (e0) {
          case 5:
            e0 = 4;
            continue;
          // top-left
          case 4:
            e0 = 6, x2 = this.xmax, y2 = this.ymin;
            break;
          // top
          case 6:
            e0 = 2;
            continue;
          // top-right
          case 2:
            e0 = 10, x2 = this.xmax, y2 = this.ymax;
            break;
          // right
          case 10:
            e0 = 8;
            continue;
          // bottom-right
          case 8:
            e0 = 9, x2 = this.xmin, y2 = this.ymax;
            break;
          // bottom
          case 9:
            e0 = 1;
            continue;
          // bottom-left
          case 1:
            e0 = 5, x2 = this.xmin, y2 = this.ymin;
            break;
        }
        if ((P[j] !== x2 || P[j + 1] !== y2) && this.contains(i, x2, y2)) {
          P.splice(j, 0, x2, y2), j += 2;
        }
      }
      return j;
    }
    _project(x0, y0, vx, vy) {
      let t = Infinity, c, x2, y2;
      if (vy < 0) {
        if (y0 <= this.ymin) return null;
        if ((c = (this.ymin - y0) / vy) < t) y2 = this.ymin, x2 = x0 + (t = c) * vx;
      } else if (vy > 0) {
        if (y0 >= this.ymax) return null;
        if ((c = (this.ymax - y0) / vy) < t) y2 = this.ymax, x2 = x0 + (t = c) * vx;
      }
      if (vx > 0) {
        if (x0 >= this.xmax) return null;
        if ((c = (this.xmax - x0) / vx) < t) x2 = this.xmax, y2 = y0 + (t = c) * vy;
      } else if (vx < 0) {
        if (x0 <= this.xmin) return null;
        if ((c = (this.xmin - x0) / vx) < t) x2 = this.xmin, y2 = y0 + (t = c) * vy;
      }
      return [x2, y2];
    }
    _edgecode(x2, y2) {
      return (x2 === this.xmin ? 1 : x2 === this.xmax ? 2 : 0) | (y2 === this.ymin ? 4 : y2 === this.ymax ? 8 : 0);
    }
    _regioncode(x2, y2) {
      return (x2 < this.xmin ? 1 : x2 > this.xmax ? 2 : 0) | (y2 < this.ymin ? 4 : y2 > this.ymax ? 8 : 0);
    }
    _simplify(P) {
      if (P && P.length > 4) {
        for (let i = 0; i < P.length; i += 2) {
          const j = (i + 2) % P.length, k = (i + 4) % P.length;
          if (P[i] === P[j] && P[j] === P[k] || P[i + 1] === P[j + 1] && P[j + 1] === P[k + 1]) {
            P.splice(j, 2), i -= 2;
          }
        }
        if (!P.length) P = null;
      }
      return P;
    }
  };

  // node_modules/d3-delaunay/src/delaunay.js
  var tau2 = 2 * Math.PI;
  var pow = Math.pow;
  function pointX(p) {
    return p[0];
  }
  function pointY(p) {
    return p[1];
  }
  function collinear(d) {
    const { triangles, coords } = d;
    for (let i = 0; i < triangles.length; i += 3) {
      const a = 2 * triangles[i], b = 2 * triangles[i + 1], c = 2 * triangles[i + 2], cross = (coords[c] - coords[a]) * (coords[b + 1] - coords[a + 1]) - (coords[b] - coords[a]) * (coords[c + 1] - coords[a + 1]);
      if (cross > 1e-10) return false;
    }
    return true;
  }
  function jitter(x2, y2, r) {
    return [x2 + Math.sin(x2 + y2) * r, y2 + Math.cos(x2 - y2) * r];
  }
  var Delaunay = class _Delaunay {
    static from(points, fx = pointX, fy = pointY, that) {
      return new _Delaunay("length" in points ? flatArray(points, fx, fy, that) : Float64Array.from(flatIterable(points, fx, fy, that)));
    }
    constructor(points) {
      this._delaunator = new Delaunator(points);
      this.inedges = new Int32Array(points.length / 2);
      this._hullIndex = new Int32Array(points.length / 2);
      this.points = this._delaunator.coords;
      this._init();
    }
    update() {
      this._delaunator.update();
      this._init();
      return this;
    }
    _init() {
      const d = this._delaunator, points = this.points;
      if (d.hull && d.hull.length > 2 && collinear(d)) {
        this.collinear = Int32Array.from({ length: points.length / 2 }, (_, i) => i).sort((i, j) => points[2 * i] - points[2 * j] || points[2 * i + 1] - points[2 * j + 1]);
        const e = this.collinear[0], f = this.collinear[this.collinear.length - 1], bounds = [points[2 * e], points[2 * e + 1], points[2 * f], points[2 * f + 1]], r = 1e-8 * Math.hypot(bounds[3] - bounds[1], bounds[2] - bounds[0]);
        for (let i = 0, n = points.length / 2; i < n; ++i) {
          const p = jitter(points[2 * i], points[2 * i + 1], r);
          points[2 * i] = p[0];
          points[2 * i + 1] = p[1];
        }
        this._delaunator = new Delaunator(points);
      } else {
        delete this.collinear;
      }
      const halfedges = this.halfedges = this._delaunator.halfedges;
      const hull = this.hull = this._delaunator.hull;
      const triangles = this.triangles = this._delaunator.triangles;
      const inedges = this.inedges.fill(-1);
      const hullIndex = this._hullIndex.fill(-1);
      for (let e = 0, n = halfedges.length; e < n; ++e) {
        const p = triangles[e % 3 === 2 ? e - 2 : e + 1];
        if (halfedges[e] === -1 || inedges[p] === -1) inedges[p] = e;
      }
      for (let i = 0, n = hull.length; i < n; ++i) {
        hullIndex[hull[i]] = i;
      }
      if (hull.length <= 2 && hull.length > 0) {
        this.triangles = new Int32Array(3).fill(-1);
        this.halfedges = new Int32Array(3).fill(-1);
        this.triangles[0] = hull[0];
        inedges[hull[0]] = 1;
        if (hull.length === 2) {
          inedges[hull[1]] = 0;
          this.triangles[1] = hull[1];
          this.triangles[2] = hull[1];
        }
      }
    }
    voronoi(bounds) {
      return new Voronoi(this, bounds);
    }
    *neighbors(i) {
      const { inedges, hull, _hullIndex, halfedges, triangles, collinear: collinear2 } = this;
      if (collinear2) {
        const l = collinear2.indexOf(i);
        if (l > 0) yield collinear2[l - 1];
        if (l < collinear2.length - 1) yield collinear2[l + 1];
        return;
      }
      const e0 = inedges[i];
      if (e0 === -1) return;
      let e = e0, p0 = -1;
      do {
        yield p0 = triangles[e];
        e = e % 3 === 2 ? e - 2 : e + 1;
        if (triangles[e] !== i) return;
        e = halfedges[e];
        if (e === -1) {
          const p = hull[(_hullIndex[i] + 1) % hull.length];
          if (p !== p0) yield p;
          return;
        }
      } while (e !== e0);
    }
    find(x2, y2, i = 0) {
      if ((x2 = +x2, x2 !== x2) || (y2 = +y2, y2 !== y2)) return -1;
      const i0 = i;
      let c;
      while ((c = this._step(i, x2, y2)) >= 0 && c !== i && c !== i0) i = c;
      return c;
    }
    _step(i, x2, y2) {
      const { inedges, hull, _hullIndex, halfedges, triangles, points } = this;
      if (inedges[i] === -1 || !points.length) return (i + 1) % (points.length >> 1);
      let c = i;
      let dc = pow(x2 - points[i * 2], 2) + pow(y2 - points[i * 2 + 1], 2);
      const e0 = inedges[i];
      let e = e0;
      do {
        let t = triangles[e];
        const dt = pow(x2 - points[t * 2], 2) + pow(y2 - points[t * 2 + 1], 2);
        if (dt < dc) dc = dt, c = t;
        e = e % 3 === 2 ? e - 2 : e + 1;
        if (triangles[e] !== i) break;
        e = halfedges[e];
        if (e === -1) {
          e = hull[(_hullIndex[i] + 1) % hull.length];
          if (e !== t) {
            if (pow(x2 - points[e * 2], 2) + pow(y2 - points[e * 2 + 1], 2) < dc) return e;
          }
          break;
        }
      } while (e !== e0);
      return c;
    }
    render(context) {
      const buffer = context == null ? context = new Path2() : void 0;
      const { points, halfedges, triangles } = this;
      for (let i = 0, n = halfedges.length; i < n; ++i) {
        const j = halfedges[i];
        if (j < i) continue;
        const ti = triangles[i] * 2;
        const tj = triangles[j] * 2;
        context.moveTo(points[ti], points[ti + 1]);
        context.lineTo(points[tj], points[tj + 1]);
      }
      this.renderHull(context);
      return buffer && buffer.value();
    }
    renderPoints(context, r) {
      if (r === void 0 && (!context || typeof context.moveTo !== "function")) r = context, context = null;
      r = r == void 0 ? 2 : +r;
      const buffer = context == null ? context = new Path2() : void 0;
      const { points } = this;
      for (let i = 0, n = points.length; i < n; i += 2) {
        const x2 = points[i], y2 = points[i + 1];
        context.moveTo(x2 + r, y2);
        context.arc(x2, y2, r, 0, tau2);
      }
      return buffer && buffer.value();
    }
    renderHull(context) {
      const buffer = context == null ? context = new Path2() : void 0;
      const { hull, points } = this;
      const h = hull[0] * 2, n = hull.length;
      context.moveTo(points[h], points[h + 1]);
      for (let i = 1; i < n; ++i) {
        const h2 = 2 * hull[i];
        context.lineTo(points[h2], points[h2 + 1]);
      }
      context.closePath();
      return buffer && buffer.value();
    }
    hullPolygon() {
      const polygon = new Polygon();
      this.renderHull(polygon);
      return polygon.value();
    }
    renderTriangle(i, context) {
      const buffer = context == null ? context = new Path2() : void 0;
      const { points, triangles } = this;
      const t0 = triangles[i *= 3] * 2;
      const t1 = triangles[i + 1] * 2;
      const t2 = triangles[i + 2] * 2;
      context.moveTo(points[t0], points[t0 + 1]);
      context.lineTo(points[t1], points[t1 + 1]);
      context.lineTo(points[t2], points[t2 + 1]);
      context.closePath();
      return buffer && buffer.value();
    }
    *trianglePolygons() {
      const { triangles } = this;
      for (let i = 0, n = triangles.length / 3; i < n; ++i) {
        yield this.trianglePolygon(i);
      }
    }
    trianglePolygon(i) {
      const polygon = new Polygon();
      this.renderTriangle(i, polygon);
      return polygon.value();
    }
  };
  function flatArray(points, fx, fy, that) {
    const n = points.length;
    const array3 = new Float64Array(n * 2);
    for (let i = 0; i < n; ++i) {
      const p = points[i];
      array3[i * 2] = fx.call(that, p, i, points);
      array3[i * 2 + 1] = fy.call(that, p, i, points);
    }
    return array3;
  }
  function* flatIterable(points, fx, fy, that) {
    let i = 0;
    for (const p of points) {
      yield fx.call(that, p, i, points);
      yield fy.call(that, p, i, points);
      ++i;
    }
  }

  // node_modules/d3-format/src/formatDecimal.js
  function formatDecimal_default(x2) {
    return Math.abs(x2 = Math.round(x2)) >= 1e21 ? x2.toLocaleString("en").replace(/,/g, "") : x2.toString(10);
  }
  function formatDecimalParts(x2, p) {
    if (!isFinite(x2) || x2 === 0) return null;
    var i = (x2 = p ? x2.toExponential(p - 1) : x2.toExponential()).indexOf("e"), coefficient = x2.slice(0, i);
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x2.slice(i + 1)
    ];
  }

  // node_modules/d3-format/src/exponent.js
  function exponent_default(x2) {
    return x2 = formatDecimalParts(Math.abs(x2)), x2 ? x2[1] : NaN;
  }

  // node_modules/d3-format/src/formatGroup.js
  function formatGroup_default(grouping, thousands) {
    return function(value, width) {
      var i = value.length, t = [], j = 0, g = grouping[0], length = 0;
      while (i > 0 && g > 0) {
        if (length + g + 1 > width) g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width) break;
        g = grouping[j = (j + 1) % grouping.length];
      }
      return t.reverse().join(thousands);
    };
  }

  // node_modules/d3-format/src/formatNumerals.js
  function formatNumerals_default(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  // node_modules/d3-format/src/formatSpecifier.js
  var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;
  function formatSpecifier(specifier) {
    if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
    var match;
    return new FormatSpecifier({
      fill: match[1],
      align: match[2],
      sign: match[3],
      symbol: match[4],
      zero: match[5],
      width: match[6],
      comma: match[7],
      precision: match[8] && match[8].slice(1),
      trim: match[9],
      type: match[10]
    });
  }
  formatSpecifier.prototype = FormatSpecifier.prototype;
  function FormatSpecifier(specifier) {
    this.fill = specifier.fill === void 0 ? " " : specifier.fill + "";
    this.align = specifier.align === void 0 ? ">" : specifier.align + "";
    this.sign = specifier.sign === void 0 ? "-" : specifier.sign + "";
    this.symbol = specifier.symbol === void 0 ? "" : specifier.symbol + "";
    this.zero = !!specifier.zero;
    this.width = specifier.width === void 0 ? void 0 : +specifier.width;
    this.comma = !!specifier.comma;
    this.precision = specifier.precision === void 0 ? void 0 : +specifier.precision;
    this.trim = !!specifier.trim;
    this.type = specifier.type === void 0 ? "" : specifier.type + "";
  }
  FormatSpecifier.prototype.toString = function() {
    return this.fill + this.align + this.sign + this.symbol + (this.zero ? "0" : "") + (this.width === void 0 ? "" : Math.max(1, this.width | 0)) + (this.comma ? "," : "") + (this.precision === void 0 ? "" : "." + Math.max(0, this.precision | 0)) + (this.trim ? "~" : "") + this.type;
  };

  // node_modules/d3-format/src/formatTrim.js
  function formatTrim_default(s) {
    out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
      switch (s[i]) {
        case ".":
          i0 = i1 = i;
          break;
        case "0":
          if (i0 === 0) i0 = i;
          i1 = i;
          break;
        default:
          if (!+s[i]) break out;
          if (i0 > 0) i0 = 0;
          break;
      }
    }
    return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
  }

  // node_modules/d3-format/src/formatPrefixAuto.js
  var prefixExponent;
  function formatPrefixAuto_default(x2, p) {
    var d = formatDecimalParts(x2, p);
    if (!d) return prefixExponent = void 0, x2.toPrecision(p);
    var coefficient = d[0], exponent = d[1], i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1, n = coefficient.length;
    return i === n ? coefficient : i > n ? coefficient + new Array(i - n + 1).join("0") : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i) : "0." + new Array(1 - i).join("0") + formatDecimalParts(x2, Math.max(0, p + i - 1))[0];
  }

  // node_modules/d3-format/src/formatRounded.js
  function formatRounded_default(x2, p) {
    var d = formatDecimalParts(x2, p);
    if (!d) return x2 + "";
    var coefficient = d[0], exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1) : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

  // node_modules/d3-format/src/formatTypes.js
  var formatTypes_default = {
    "%": (x2, p) => (x2 * 100).toFixed(p),
    "b": (x2) => Math.round(x2).toString(2),
    "c": (x2) => x2 + "",
    "d": formatDecimal_default,
    "e": (x2, p) => x2.toExponential(p),
    "f": (x2, p) => x2.toFixed(p),
    "g": (x2, p) => x2.toPrecision(p),
    "o": (x2) => Math.round(x2).toString(8),
    "p": (x2, p) => formatRounded_default(x2 * 100, p),
    "r": formatRounded_default,
    "s": formatPrefixAuto_default,
    "X": (x2) => Math.round(x2).toString(16).toUpperCase(),
    "x": (x2) => Math.round(x2).toString(16)
  };

  // node_modules/d3-format/src/identity.js
  function identity_default(x2) {
    return x2;
  }

  // node_modules/d3-format/src/locale.js
  var map2 = Array.prototype.map;
  var prefixes = ["y", "z", "a", "f", "p", "n", "\xB5", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y"];
  function locale_default(locale2) {
    var group = locale2.grouping === void 0 || locale2.thousands === void 0 ? identity_default : formatGroup_default(map2.call(locale2.grouping, Number), locale2.thousands + ""), currencyPrefix = locale2.currency === void 0 ? "" : locale2.currency[0] + "", currencySuffix = locale2.currency === void 0 ? "" : locale2.currency[1] + "", decimal = locale2.decimal === void 0 ? "." : locale2.decimal + "", numerals = locale2.numerals === void 0 ? identity_default : formatNumerals_default(map2.call(locale2.numerals, String)), percent = locale2.percent === void 0 ? "%" : locale2.percent + "", minus = locale2.minus === void 0 ? "\u2212" : locale2.minus + "", nan = locale2.nan === void 0 ? "NaN" : locale2.nan + "";
    function newFormat(specifier, options) {
      specifier = formatSpecifier(specifier);
      var fill = specifier.fill, align = specifier.align, sign = specifier.sign, symbol = specifier.symbol, zero3 = specifier.zero, width = specifier.width, comma = specifier.comma, precision = specifier.precision, trim = specifier.trim, type2 = specifier.type;
      if (type2 === "n") comma = true, type2 = "g";
      else if (!formatTypes_default[type2]) precision === void 0 && (precision = 12), trim = true, type2 = "g";
      if (zero3 || fill === "0" && align === "=") zero3 = true, fill = "0", align = "=";
      var prefix = (options && options.prefix !== void 0 ? options.prefix : "") + (symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type2) ? "0" + type2.toLowerCase() : ""), suffix = (symbol === "$" ? currencySuffix : /[%p]/.test(type2) ? percent : "") + (options && options.suffix !== void 0 ? options.suffix : "");
      var formatType = formatTypes_default[type2], maybeSuffix = /[defgprs%]/.test(type2);
      precision = precision === void 0 ? 6 : /[gprs]/.test(type2) ? Math.max(1, Math.min(21, precision)) : Math.max(0, Math.min(20, precision));
      function format2(value) {
        var valuePrefix = prefix, valueSuffix = suffix, i, n, c;
        if (type2 === "c") {
          valueSuffix = formatType(value) + valueSuffix;
          value = "";
        } else {
          value = +value;
          var valueNegative = value < 0 || 1 / value < 0;
          value = isNaN(value) ? nan : formatType(Math.abs(value), precision);
          if (trim) value = formatTrim_default(value);
          if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;
          valuePrefix = (valueNegative ? sign === "(" ? sign : minus : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
          valueSuffix = (type2 === "s" && !isNaN(value) && prefixExponent !== void 0 ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");
          if (maybeSuffix) {
            i = -1, n = value.length;
            while (++i < n) {
              if (c = value.charCodeAt(i), 48 > c || c > 57) {
                valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                value = value.slice(0, i);
                break;
              }
            }
          }
        }
        if (comma && !zero3) value = group(value, Infinity);
        var length = valuePrefix.length + value.length + valueSuffix.length, padding = length < width ? new Array(width - length + 1).join(fill) : "";
        if (comma && zero3) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";
        switch (align) {
          case "<":
            value = valuePrefix + value + valueSuffix + padding;
            break;
          case "=":
            value = valuePrefix + padding + value + valueSuffix;
            break;
          case "^":
            value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length);
            break;
          default:
            value = padding + valuePrefix + value + valueSuffix;
            break;
        }
        return numerals(value);
      }
      format2.toString = function() {
        return specifier + "";
      };
      return format2;
    }
    function formatPrefix2(specifier, value) {
      var e = Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3, k = Math.pow(10, -e), f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier), { suffix: prefixes[8 + e / 3] });
      return function(value2) {
        return f(k * value2);
      };
    }
    return {
      format: newFormat,
      formatPrefix: formatPrefix2
    };
  }

  // node_modules/d3-format/src/defaultLocale.js
  var locale;
  var format;
  var formatPrefix;
  defaultLocale({
    thousands: ",",
    grouping: [3],
    currency: ["$", ""]
  });
  function defaultLocale(definition) {
    locale = locale_default(definition);
    format = locale.format;
    formatPrefix = locale.formatPrefix;
    return locale;
  }

  // node_modules/d3-format/src/precisionFixed.js
  function precisionFixed_default(step) {
    return Math.max(0, -exponent_default(Math.abs(step)));
  }

  // node_modules/d3-format/src/precisionPrefix.js
  function precisionPrefix_default(step, value) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent_default(value) / 3))) * 3 - exponent_default(Math.abs(step)));
  }

  // node_modules/d3-format/src/precisionRound.js
  function precisionRound_default(step, max3) {
    step = Math.abs(step), max3 = Math.abs(max3) - step;
    return Math.max(0, exponent_default(max3) - exponent_default(step)) + 1;
  }

  // node_modules/d3-scale/src/init.js
  function initRange(domain, range2) {
    switch (arguments.length) {
      case 0:
        break;
      case 1:
        this.range(domain);
        break;
      default:
        this.range(range2).domain(domain);
        break;
    }
    return this;
  }
  function initInterpolator(domain, interpolator) {
    switch (arguments.length) {
      case 0:
        break;
      case 1: {
        if (typeof domain === "function") this.interpolator(domain);
        else this.range(domain);
        break;
      }
      default: {
        this.domain(domain);
        if (typeof interpolator === "function") this.interpolator(interpolator);
        else this.range(interpolator);
        break;
      }
    }
    return this;
  }

  // node_modules/d3-scale/src/constant.js
  function constants(x2) {
    return function() {
      return x2;
    };
  }

  // node_modules/d3-scale/src/number.js
  function number3(x2) {
    return +x2;
  }

  // node_modules/d3-scale/src/continuous.js
  var unit = [0, 1];
  function identity3(x2) {
    return x2;
  }
  function normalize(a, b) {
    return (b -= a = +a) ? function(x2) {
      return (x2 - a) / b;
    } : constants(isNaN(b) ? NaN : 0.5);
  }
  function clamper(a, b) {
    var t;
    if (a > b) t = a, a = b, b = t;
    return function(x2) {
      return Math.max(a, Math.min(b, x2));
    };
  }
  function bimap(domain, range2, interpolate) {
    var d0 = domain[0], d1 = domain[1], r0 = range2[0], r1 = range2[1];
    if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
    else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
    return function(x2) {
      return r0(d0(x2));
    };
  }
  function polymap(domain, range2, interpolate) {
    var j = Math.min(domain.length, range2.length) - 1, d = new Array(j), r = new Array(j), i = -1;
    if (domain[j] < domain[0]) {
      domain = domain.slice().reverse();
      range2 = range2.slice().reverse();
    }
    while (++i < j) {
      d[i] = normalize(domain[i], domain[i + 1]);
      r[i] = interpolate(range2[i], range2[i + 1]);
    }
    return function(x2) {
      var i2 = bisect_default(domain, x2, 1, j) - 1;
      return r[i2](d[i2](x2));
    };
  }
  function copy(source, target) {
    return target.domain(source.domain()).range(source.range()).interpolate(source.interpolate()).clamp(source.clamp()).unknown(source.unknown());
  }
  function transformer() {
    var domain = unit, range2 = unit, interpolate = value_default, transform2, untransform, unknown, clamp = identity3, piecewise, output, input;
    function rescale() {
      var n = Math.min(domain.length, range2.length);
      if (clamp !== identity3) clamp = clamper(domain[0], domain[n - 1]);
      piecewise = n > 2 ? polymap : bimap;
      output = input = null;
      return scale2;
    }
    function scale2(x2) {
      return x2 == null || isNaN(x2 = +x2) ? unknown : (output || (output = piecewise(domain.map(transform2), range2, interpolate)))(transform2(clamp(x2)));
    }
    scale2.invert = function(y2) {
      return clamp(untransform((input || (input = piecewise(range2, domain.map(transform2), number_default)))(y2)));
    };
    scale2.domain = function(_) {
      return arguments.length ? (domain = Array.from(_, number3), rescale()) : domain.slice();
    };
    scale2.range = function(_) {
      return arguments.length ? (range2 = Array.from(_), rescale()) : range2.slice();
    };
    scale2.rangeRound = function(_) {
      return range2 = Array.from(_), interpolate = round_default, rescale();
    };
    scale2.clamp = function(_) {
      return arguments.length ? (clamp = _ ? true : identity3, rescale()) : clamp !== identity3;
    };
    scale2.interpolate = function(_) {
      return arguments.length ? (interpolate = _, rescale()) : interpolate;
    };
    scale2.unknown = function(_) {
      return arguments.length ? (unknown = _, scale2) : unknown;
    };
    return function(t, u4) {
      transform2 = t, untransform = u4;
      return rescale();
    };
  }
  function continuous() {
    return transformer()(identity3, identity3);
  }

  // node_modules/d3-scale/src/tickFormat.js
  function tickFormat(start2, stop, count2, specifier) {
    var step = tickStep(start2, stop, count2), precision;
    specifier = formatSpecifier(specifier == null ? ",f" : specifier);
    switch (specifier.type) {
      case "s": {
        var value = Math.max(Math.abs(start2), Math.abs(stop));
        if (specifier.precision == null && !isNaN(precision = precisionPrefix_default(step, value))) specifier.precision = precision;
        return formatPrefix(specifier, value);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        if (specifier.precision == null && !isNaN(precision = precisionRound_default(step, Math.max(Math.abs(start2), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
        break;
      }
      case "f":
      case "%": {
        if (specifier.precision == null && !isNaN(precision = precisionFixed_default(step))) specifier.precision = precision - (specifier.type === "%") * 2;
        break;
      }
    }
    return format(specifier);
  }

  // node_modules/d3-scale/src/linear.js
  function linearish(scale2) {
    var domain = scale2.domain;
    scale2.ticks = function(count2) {
      var d = domain();
      return ticks(d[0], d[d.length - 1], count2 == null ? 10 : count2);
    };
    scale2.tickFormat = function(count2, specifier) {
      var d = domain();
      return tickFormat(d[0], d[d.length - 1], count2 == null ? 10 : count2, specifier);
    };
    scale2.nice = function(count2) {
      if (count2 == null) count2 = 10;
      var d = domain();
      var i0 = 0;
      var i1 = d.length - 1;
      var start2 = d[i0];
      var stop = d[i1];
      var prestep;
      var step;
      var maxIter = 10;
      if (stop < start2) {
        step = start2, start2 = stop, stop = step;
        step = i0, i0 = i1, i1 = step;
      }
      while (maxIter-- > 0) {
        step = tickIncrement(start2, stop, count2);
        if (step === prestep) {
          d[i0] = start2;
          d[i1] = stop;
          return domain(d);
        } else if (step > 0) {
          start2 = Math.floor(start2 / step) * step;
          stop = Math.ceil(stop / step) * step;
        } else if (step < 0) {
          start2 = Math.ceil(start2 * step) / step;
          stop = Math.floor(stop * step) / step;
        } else {
          break;
        }
        prestep = step;
      }
      return scale2;
    };
    return scale2;
  }
  function linear2() {
    var scale2 = continuous();
    scale2.copy = function() {
      return copy(scale2, linear2());
    };
    initRange.apply(scale2, arguments);
    return linearish(scale2);
  }

  // node_modules/d3-scale/src/sequential.js
  function transformer2() {
    var x0 = 0, x1 = 1, t0, t1, k10, transform2, interpolator = identity3, clamp = false, unknown;
    function scale2(x2) {
      return x2 == null || isNaN(x2 = +x2) ? unknown : interpolator(k10 === 0 ? 0.5 : (x2 = (transform2(x2) - t0) * k10, clamp ? Math.max(0, Math.min(1, x2)) : x2));
    }
    scale2.domain = function(_) {
      return arguments.length ? ([x0, x1] = _, t0 = transform2(x0 = +x0), t1 = transform2(x1 = +x1), k10 = t0 === t1 ? 0 : 1 / (t1 - t0), scale2) : [x0, x1];
    };
    scale2.clamp = function(_) {
      return arguments.length ? (clamp = !!_, scale2) : clamp;
    };
    scale2.interpolator = function(_) {
      return arguments.length ? (interpolator = _, scale2) : interpolator;
    };
    function range2(interpolate) {
      return function(_) {
        var r0, r1;
        return arguments.length ? ([r0, r1] = _, interpolator = interpolate(r0, r1), scale2) : [interpolator(0), interpolator(1)];
      };
    }
    scale2.range = range2(value_default);
    scale2.rangeRound = range2(round_default);
    scale2.unknown = function(_) {
      return arguments.length ? (unknown = _, scale2) : unknown;
    };
    return function(t) {
      transform2 = t, t0 = t(x0), t1 = t(x1), k10 = t0 === t1 ? 0 : 1 / (t1 - t0);
      return scale2;
    };
  }
  function copy2(source, target) {
    return target.domain(source.domain()).interpolator(source.interpolator()).clamp(source.clamp()).unknown(source.unknown());
  }
  function sequential() {
    var scale2 = linearish(transformer2()(identity3));
    scale2.copy = function() {
      return copy2(scale2, sequential());
    };
    return initInterpolator.apply(scale2, arguments);
  }

  // node_modules/d3-scale-chromatic/src/colors.js
  function colors_default(specifier) {
    var n = specifier.length / 6 | 0, colors = new Array(n), i = 0;
    while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
    return colors;
  }

  // node_modules/d3-scale-chromatic/src/categorical/Paired.js
  var Paired_default = colors_default("a6cee31f78b4b2df8a33a02cfb9a99e31a1cfdbf6fff7f00cab2d66a3d9affff99b15928");

  // node_modules/d3-scale-chromatic/src/sequential-multi/viridis.js
  function ramp(range2) {
    var n = range2.length;
    return function(t) {
      return range2[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
    };
  }
  var viridis_default = ramp(colors_default("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));
  var magma = ramp(colors_default("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf"));
  var inferno = ramp(colors_default("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4"));
  var plasma = ramp(colors_default("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));

  // node_modules/d3-shape/src/constant.js
  function constant_default4(x2) {
    return function constant2() {
      return x2;
    };
  }

  // node_modules/d3-shape/src/math.js
  var sqrt = Math.sqrt;
  var pi2 = Math.PI;
  var halfPi = pi2 / 2;
  var tau3 = 2 * pi2;

  // node_modules/d3-shape/src/path.js
  function withPath(shape) {
    let digits = 3;
    shape.digits = function(_) {
      if (!arguments.length) return digits;
      if (_ == null) {
        digits = null;
      } else {
        const d = Math.floor(_);
        if (!(d >= 0)) throw new RangeError(`invalid digits: ${_}`);
        digits = d;
      }
      return shape;
    };
    return () => new Path(digits);
  }

  // node_modules/d3-shape/src/array.js
  var slice2 = Array.prototype.slice;
  function array_default(x2) {
    return typeof x2 === "object" && "length" in x2 ? x2 : Array.from(x2);
  }

  // node_modules/d3-shape/src/curve/linear.js
  function Linear(context) {
    this._context = context;
  }
  Linear.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._point = 0;
    },
    lineEnd: function() {
      if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x2, y2) {
      x2 = +x2, y2 = +y2;
      switch (this._point) {
        case 0:
          this._point = 1;
          this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
          break;
        case 1:
          this._point = 2;
        // falls through
        default:
          this._context.lineTo(x2, y2);
          break;
      }
    }
  };
  function linear_default(context) {
    return new Linear(context);
  }

  // node_modules/d3-shape/src/point.js
  function x(p) {
    return p[0];
  }
  function y(p) {
    return p[1];
  }

  // node_modules/d3-shape/src/line.js
  function line_default(x2, y2) {
    var defined = constant_default4(true), context = null, curve = linear_default, output = null, path2 = withPath(line);
    x2 = typeof x2 === "function" ? x2 : x2 === void 0 ? x : constant_default4(x2);
    y2 = typeof y2 === "function" ? y2 : y2 === void 0 ? y : constant_default4(y2);
    function line(data2) {
      var i, n = (data2 = array_default(data2)).length, d, defined0 = false, buffer;
      if (context == null) output = curve(buffer = path2());
      for (i = 0; i <= n; ++i) {
        if (!(i < n && defined(d = data2[i], i, data2)) === defined0) {
          if (defined0 = !defined0) output.lineStart();
          else output.lineEnd();
        }
        if (defined0) output.point(+x2(d, i, data2), +y2(d, i, data2));
      }
      if (buffer) return output = null, buffer + "" || null;
    }
    line.x = function(_) {
      return arguments.length ? (x2 = typeof _ === "function" ? _ : constant_default4(+_), line) : x2;
    };
    line.y = function(_) {
      return arguments.length ? (y2 = typeof _ === "function" ? _ : constant_default4(+_), line) : y2;
    };
    line.defined = function(_) {
      return arguments.length ? (defined = typeof _ === "function" ? _ : constant_default4(!!_), line) : defined;
    };
    line.curve = function(_) {
      return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
    };
    line.context = function(_) {
      return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
    };
    return line;
  }

  // node_modules/d3-shape/src/area.js
  function area_default(x0, y0, y1) {
    var x1 = null, defined = constant_default4(true), context = null, curve = linear_default, output = null, path2 = withPath(area);
    x0 = typeof x0 === "function" ? x0 : x0 === void 0 ? x : constant_default4(+x0);
    y0 = typeof y0 === "function" ? y0 : y0 === void 0 ? constant_default4(0) : constant_default4(+y0);
    y1 = typeof y1 === "function" ? y1 : y1 === void 0 ? y : constant_default4(+y1);
    function area(data2) {
      var i, j, k, n = (data2 = array_default(data2)).length, d, defined0 = false, buffer, x0z = new Array(n), y0z = new Array(n);
      if (context == null) output = curve(buffer = path2());
      for (i = 0; i <= n; ++i) {
        if (!(i < n && defined(d = data2[i], i, data2)) === defined0) {
          if (defined0 = !defined0) {
            j = i;
            output.areaStart();
            output.lineStart();
          } else {
            output.lineEnd();
            output.lineStart();
            for (k = i - 1; k >= j; --k) {
              output.point(x0z[k], y0z[k]);
            }
            output.lineEnd();
            output.areaEnd();
          }
        }
        if (defined0) {
          x0z[i] = +x0(d, i, data2), y0z[i] = +y0(d, i, data2);
          output.point(x1 ? +x1(d, i, data2) : x0z[i], y1 ? +y1(d, i, data2) : y0z[i]);
        }
      }
      if (buffer) return output = null, buffer + "" || null;
    }
    function arealine() {
      return line_default().defined(defined).curve(curve).context(context);
    }
    area.x = function(_) {
      return arguments.length ? (x0 = typeof _ === "function" ? _ : constant_default4(+_), x1 = null, area) : x0;
    };
    area.x0 = function(_) {
      return arguments.length ? (x0 = typeof _ === "function" ? _ : constant_default4(+_), area) : x0;
    };
    area.x1 = function(_) {
      return arguments.length ? (x1 = _ == null ? null : typeof _ === "function" ? _ : constant_default4(+_), area) : x1;
    };
    area.y = function(_) {
      return arguments.length ? (y0 = typeof _ === "function" ? _ : constant_default4(+_), y1 = null, area) : y0;
    };
    area.y0 = function(_) {
      return arguments.length ? (y0 = typeof _ === "function" ? _ : constant_default4(+_), area) : y0;
    };
    area.y1 = function(_) {
      return arguments.length ? (y1 = _ == null ? null : typeof _ === "function" ? _ : constant_default4(+_), area) : y1;
    };
    area.lineX0 = area.lineY0 = function() {
      return arealine().x(x0).y(y0);
    };
    area.lineY1 = function() {
      return arealine().x(x0).y(y1);
    };
    area.lineX1 = function() {
      return arealine().x(x1).y(y0);
    };
    area.defined = function(_) {
      return arguments.length ? (defined = typeof _ === "function" ? _ : constant_default4(!!_), area) : defined;
    };
    area.curve = function(_) {
      return arguments.length ? (curve = _, context != null && (output = curve(context)), area) : curve;
    };
    area.context = function(_) {
      return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), area) : context;
    };
    return area;
  }

  // node_modules/d3-shape/src/symbol/circle.js
  var circle_default = {
    draw(context, size) {
      const r = sqrt(size / pi2);
      context.moveTo(r, 0);
      context.arc(0, 0, r, 0, tau3);
    }
  };

  // node_modules/d3-shape/src/symbol/diamond.js
  var tan30 = sqrt(1 / 3);
  var tan30_2 = tan30 * 2;
  var diamond_default = {
    draw(context, size) {
      const y2 = sqrt(size / tan30_2);
      const x2 = y2 * tan30;
      context.moveTo(0, -y2);
      context.lineTo(x2, 0);
      context.lineTo(0, y2);
      context.lineTo(-x2, 0);
      context.closePath();
    }
  };

  // node_modules/d3-shape/src/symbol.js
  function Symbol2(type2, size) {
    let context = null, path2 = withPath(symbol);
    type2 = typeof type2 === "function" ? type2 : constant_default4(type2 || circle_default);
    size = typeof size === "function" ? size : constant_default4(size === void 0 ? 64 : +size);
    function symbol() {
      let buffer;
      if (!context) context = buffer = path2();
      type2.apply(this, arguments).draw(context, +size.apply(this, arguments));
      if (buffer) return context = null, buffer + "" || null;
    }
    symbol.type = function(_) {
      return arguments.length ? (type2 = typeof _ === "function" ? _ : constant_default4(_), symbol) : type2;
    };
    symbol.size = function(_) {
      return arguments.length ? (size = typeof _ === "function" ? _ : constant_default4(+_), symbol) : size;
    };
    symbol.context = function(_) {
      return arguments.length ? (context = _ == null ? null : _, symbol) : context;
    };
    return symbol;
  }

  // node_modules/d3-shape/src/curve/basis.js
  function point(that, x2, y2) {
    that._context.bezierCurveTo(
      (2 * that._x0 + that._x1) / 3,
      (2 * that._y0 + that._y1) / 3,
      (that._x0 + 2 * that._x1) / 3,
      (that._y0 + 2 * that._y1) / 3,
      (that._x0 + 4 * that._x1 + x2) / 6,
      (that._y0 + 4 * that._y1 + y2) / 6
    );
  }
  function Basis(context) {
    this._context = context;
  }
  Basis.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 = this._y0 = this._y1 = NaN;
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 3:
          point(this, this._x1, this._y1);
        // falls through
        case 2:
          this._context.lineTo(this._x1, this._y1);
          break;
      }
      if (this._line || this._line !== 0 && this._point === 1) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x2, y2) {
      x2 = +x2, y2 = +y2;
      switch (this._point) {
        case 0:
          this._point = 1;
          this._line ? this._context.lineTo(x2, y2) : this._context.moveTo(x2, y2);
          break;
        case 1:
          this._point = 2;
          break;
        case 2:
          this._point = 3;
          this._context.lineTo((5 * this._x0 + this._x1) / 6, (5 * this._y0 + this._y1) / 6);
        // falls through
        default:
          point(this, x2, y2);
          break;
      }
      this._x0 = this._x1, this._x1 = x2;
      this._y0 = this._y1, this._y1 = y2;
    }
  };
  function basis_default2(context) {
    return new Basis(context);
  }

  // node_modules/d3-zoom/src/transform.js
  function Transform(k, x2, y2) {
    this.k = k;
    this.x = x2;
    this.y = y2;
  }
  Transform.prototype = {
    constructor: Transform,
    scale: function(k) {
      return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
    },
    translate: function(x2, y2) {
      return x2 === 0 & y2 === 0 ? this : new Transform(this.k, this.x + this.k * x2, this.y + this.k * y2);
    },
    apply: function(point2) {
      return [point2[0] * this.k + this.x, point2[1] * this.k + this.y];
    },
    applyX: function(x2) {
      return x2 * this.k + this.x;
    },
    applyY: function(y2) {
      return y2 * this.k + this.y;
    },
    invert: function(location) {
      return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
    },
    invertX: function(x2) {
      return (x2 - this.x) / this.k;
    },
    invertY: function(y2) {
      return (y2 - this.y) / this.k;
    },
    rescaleX: function(x2) {
      return x2.copy().domain(x2.range().map(this.invertX, this).map(x2.invert, x2));
    },
    rescaleY: function(y2) {
      return y2.copy().domain(y2.range().map(this.invertY, this).map(y2.invert, y2));
    },
    toString: function() {
      return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
    }
  };
  var identity4 = new Transform(1, 0, 0);
  transform.prototype = Transform.prototype;
  function transform(node) {
    while (!node.__zoom) if (!(node = node.parentNode)) return identity4;
    return node.__zoom;
  }

  // node_modules/ml-matrix/matrix.mjs
  var matrix = __toESM(require_matrix(), 1);
  var Matrix2 = matrix.Matrix;
  var QrDecomposition2 = matrix.QrDecomposition;
  var matrix_default = matrix.default.Matrix ? matrix.default.Matrix : matrix.Matrix;
  var solve2 = matrix.solve;

  // src/stats/common.js
  var Z95 = 1.9599639845400536;
  var RANK_MODELS = /* @__PURE__ */ new Set(["spearman", "theilsen"]);
  var LANCZOS_G = 7;
  var LANCZOS_C = [
    0.9999999999998099,
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9984369578019572e-21,
    15056327351493116e-23
  ];
  function logGamma(x2) {
    if (x2 < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * x2)) - logGamma(1 - x2);
    }
    x2 -= 1;
    let a = LANCZOS_C[0];
    const t = x2 + LANCZOS_G + 0.5;
    for (let i = 1; i < LANCZOS_G + 2; i++) a += LANCZOS_C[i] / (x2 + i);
    return 0.5 * Math.log(2 * Math.PI) + (x2 + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function betaCF(a, b, x2) {
    const MAXIT = 100;
    const EPS = 3e-7;
    const FPMIN = 1e-30;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x2 / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa2 = m * (b - m) * x2 / ((qam + m2) * (a + m2));
      d = 1 + aa2 * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa2 / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      h *= d * c;
      aa2 = -(a + m) * (qab + m) * x2 / ((a + m2) * (qap + m2));
      d = 1 + aa2 * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa2 / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  }
  function incompleteBeta(a, b, x2) {
    if (x2 < 0 || x2 > 1) throw new RangeError(`x=${x2} outside [0,1]`);
    if (x2 === 0) return 0;
    if (x2 === 1) return 1;
    const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x2) + b * Math.log(1 - x2));
    return x2 < (a + 1) / (a + b + 2) ? bt * betaCF(a, b, x2) / a : 1 - bt * betaCF(b, a, 1 - x2) / b;
  }
  function tPValue(t, df) {
    const x2 = df / (df + t * t);
    return incompleteBeta(df / 2, 0.5, x2);
  }
  function _olsNuisanceFit(y2, nuisanceMatrix) {
    const n = y2.length;
    const dm = Array.from({ length: n }, (_, i) => [1, ...nuisanceMatrix.map((col) => col[i])]);
    const X2 = new Matrix2(dm);
    const b = new QrDecomposition2(X2).solve(Matrix2.columnVector(y2)).getColumn(0);
    const residuals2 = y2.map((yi, i) => yi - dm[i].reduce((s, xij, j) => s + xij * b[j], 0));
    return { X: X2, b, residuals: residuals2 };
  }
  function residualize(y2, nuisanceMatrix) {
    return _olsNuisanceFit(y2, nuisanceMatrix).residuals;
  }
  function solveLinear(A, b) {
    return solve2(new Matrix2(A), Matrix2.columnVector(b)).getColumn(0);
  }
  function diagInverse(M) {
    const k = M.length;
    return Array.from({ length: k }, (_, j) => {
      const e = new Array(k).fill(0);
      e[j] = 1;
      return solveLinear(M, e)[j];
    });
  }
  function mean(arr) {
    return arr.reduce((s, v2) => s + v2, 0) / arr.length;
  }
  function stdev(arr) {
    const mu = mean(arr);
    return Math.sqrt(arr.reduce((s, v2) => s + (v2 - mu) ** 2, 0) / (arr.length - 1));
  }
  function rank(arr) {
    const n = arr.length;
    const idx = Array.from({ length: n }, (_, i2) => i2).sort((a, b) => arr[a] - arr[b]);
    const ranks = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && arr[idx[j]] === arr[idx[j + 1]]) j++;
      const avgRank = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[idx[k]] = avgRank;
      i = j + 1;
    }
    return ranks;
  }
  function residualizeWithStats(y2, nuisanceMatrix) {
    const { X: X2, b, residuals: residuals2 } = _olsNuisanceFit(y2, nuisanceMatrix);
    const n = y2.length;
    const p = nuisanceMatrix.length;
    const ssr = residuals2.reduce((s, r) => s + r * r, 0);
    const dfResidual = n - p - 1;
    const s2 = ssr / dfResidual;
    const diagXtX = diagInverse(X2.transpose().mmul(X2).to2DArray());
    const partialR2 = nuisanceMatrix.map((_, k) => {
      const j = k + 1;
      const t2 = b[j] ** 2 / (diagXtX[j] * s2);
      return t2 / (t2 + dfResidual);
    });
    return { residuals: residuals2, partialR2 };
  }

  // src/plot/scatterplot.js
  var PAIRED = Paired_default;
  function readPalette() {
    const cs = getComputedStyle(document.documentElement);
    const v2 = (name) => cs.getPropertyValue(name).trim();
    return {
      point: v2("--color-point"),
      regline: v2("--color-regline"),
      censored: v2("--color-censored"),
      bg: v2("--color-bg"),
      text: v2("--color-text"),
      muted: v2("--color-text-muted"),
      font: v2("--font-sans")
    };
  }
  function tQ95(df) {
    const z = Z95, z2 = z * z;
    return z + (z2 * z + z) / (4 * df) + (5 * z2 * z2 * z + 16 * z2 * z + 3 * z) / (96 * df * df) + (3 * z2 * z2 * z2 * z + 19 * z2 * z2 * z + 17 * z2 * z - 15 * z) / (384 * df * df * df);
  }
  var MARGIN_DESKTOP = { top: 24, right: 24, bottom: 68, left: 88 };
  var MARGIN_MOBILE = { top: 16, right: 16, bottom: 52, left: 56 };
  var TICK_LEN = 5;
  var SUPERTICK_LEN = 14;
  var CORNER_R = 5;
  var POINT_R = 4.5;
  var POINT_R_MIN = 1.5;
  var POINT_R_HOVER_DELTA = 2;
  var KDE_MAX_PX = 20;
  var KDE_GRID_N = 120;
  function scaledPointR(n) {
    return Math.max(POINT_R_MIN, POINT_R * Math.pow(Math.min(1, 50 / n), 0.25));
  }
  var SNAP_PX = 2;
  var JITTER = 0.15;
  var MAX_HOVER_DIST = 40;
  var CORNER_BOT_STRIP_Y = 28;
  var CORNER_LEFT_STRIP_X = 60;
  function fiveNum(arr) {
    const s = [...arr].sort((a, b) => a - b);
    const n = s.length;
    const q = (p) => s[Math.round(p * (n - 1))];
    return [s[0], q(0.25), q(0.5), q(0.75), s[n - 1]];
  }
  function fmtNum(v2) {
    if (v2 == null || !Number.isFinite(v2)) return "";
    if (Math.abs(v2) >= 1e4 || Math.abs(v2) < 1e-3 && v2 !== 0) {
      return v2.toExponential(2);
    }
    const s = v2.toPrecision(4);
    return String(parseFloat(s));
  }
  function silvermanBandwidth(vals) {
    const n = vals.length;
    if (n < 2) return 1;
    const sorted = [...vals].sort((a, b) => a - b);
    const mean2 = vals.reduce((s2, v2) => s2 + v2, 0) / n;
    const std = Math.sqrt(vals.reduce((s2, v2) => s2 + (v2 - mean2) ** 2, 0) / (n - 1));
    const q1 = sorted[Math.floor(0.25 * (n - 1))];
    const q3 = sorted[Math.floor(0.75 * (n - 1))];
    const s = Math.min(std, (q3 - q1) / 1.34) || std;
    if (!s) return 1;
    return 1.06 * s * Math.pow(n, -0.2);
  }
  function computeKDE(vals, domainMin, domainMax) {
    const bw = silvermanBandwidth(vals);
    const n = vals.length;
    const twoBwSq = 2 * bw * bw;
    const norm = n * bw * Math.sqrt(2 * Math.PI);
    return Array.from({ length: KDE_GRID_N }, (_, i) => {
      const v2 = domainMin + i * (domainMax - domainMin) / (KDE_GRID_N - 1);
      const density = vals.reduce((s, vi) => s + Math.exp(-((v2 - vi) * (v2 - vi)) / twoBwSq), 0) / norm;
      return { v: v2, density };
    });
  }
  function cornerMarkerPos(px, py, xScale, yScale, innerW, innerH) {
    const sx = xScale(px);
    const sy = yScale(py);
    const outL = sx < 0, outR = sx > innerW;
    const outT = sy < 0, outB = sy > innerH;
    if (!outL && !outR && !outT && !outB) return null;
    const PAD = CORNER_R + 2;
    const mx = outL ? -CORNER_LEFT_STRIP_X : outR ? innerW + PAD : Math.max(0, Math.min(innerW, sx));
    const my = outT ? -PAD : outB ? innerH + CORNER_BOT_STRIP_Y : Math.max(0, Math.min(innerH, sy));
    return { x: mx, y: my, outL, outB };
  }
  function computeBand(r, key, [x0, x1], nPts) {
    if (!r) return null;
    const xs = Array.from({ length: nPts }, (_, i) => x0 + i * (x1 - x0) / (nPts - 1));
    if (key === "ols" && r.sigma != null && r.xMean != null && r.sxx != null) {
      const t = tQ95(r.dfResidual);
      return xs.map((xv) => {
        const fit = r.intercept + r.slope * xv;
        const hw = t * r.sigma * Math.sqrt(1 / r.n + (xv - r.xMean) ** 2 / r.sxx);
        return { x: xv, lo: fit - hw, hi: fit + hw };
      });
    }
    if (key === "robust" && r.covIntSlope != null) {
      return xs.map((xv) => {
        const fit = r.intercept + r.slope * xv;
        const varFit = r.seIntercept ** 2 + 2 * xv * r.covIntSlope + xv ** 2 * r.seSlope ** 2;
        const hw = Z95 * Math.sqrt(Math.max(0, varFit));
        return { x: xv, lo: fit - hw, hi: fit + hw };
      });
    }
    if (key === "theilsen" && r.slopeCILow != null) {
      return xs.map((xv) => {
        const yA = r.interceptCILow + r.slopeCILow * xv;
        const yB = r.interceptCIHigh + r.slopeCIHigh * xv;
        return { x: xv, lo: Math.min(yA, yB), hi: Math.max(yA, yB) };
      });
    }
    return null;
  }
  function buildColorOf(points, groupColorType, fallbackColor = "currentColor") {
    const groupValues = points.map((p) => p.group).filter((g) => g != null);
    if (groupColorType === "continuous" && groupValues.length) {
      const [lo, hi] = extent(groupValues);
      const colorScale = sequential(viridis_default).domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]);
      return (p) => p.group == null ? fallbackColor : colorScale(p.group);
    }
    const groups = [...new Set(groupValues.map(String))].sort();
    return (p) => {
      if (p.group == null || groups.length === 0) return fallbackColor;
      return PAIRED[groups.indexOf(String(p.group)) % PAIRED.length];
    };
  }
  function createScatterplot(svgEl, overlaySvgEl) {
    const palette = readPalette();
    const svg = select_default2(svgEl);
    const overlaySvg = select_default2(overlaySvgEl);
    const defs = svg.append("defs");
    const clipId = "plot-clip-" + Math.random().toString(36).slice(2);
    const clipRect = defs.append("clipPath").attr("id", clipId).append("rect");
    svg.append("rect").attr("class", "plot-bg").attr("fill", palette.bg).attr("width", "100%").attr("height", "100%");
    const canvas = svg.append("g").attr("class", "canvas");
    const xAxisG = canvas.append("g").attr("class", "x-axis");
    const yAxisG = canvas.append("g").attr("class", "y-axis");
    const xAxisLabelsG = canvas.append("g").attr("class", "x-axis-labels");
    const yAxisLabelsG = canvas.append("g").attr("class", "y-axis-labels");
    const plotArea = canvas.append("g").attr("class", "plot-area").attr("clip-path", `url(#${clipId})`);
    const xKdeEl = plotArea.append("path").attr("class", "kde--x").style("fill", "#aaa").style("fill-opacity", "0.35").style("stroke", "none").style("pointer-events", "none");
    const yKdeEl = plotArea.append("path").attr("class", "kde--y").style("fill", "#aaa").style("fill-opacity", "0.35").style("stroke", "none").style("pointer-events", "none");
    const ciBandEl = plotArea.append("path").attr("class", "ci-band").style("fill", palette.regline).style("fill-opacity", "0.12").style("stroke", "none").style("pointer-events", "none");
    const regLineEl = plotArea.append("line").attr("class", "regression-line").style("stroke", palette.regline).style("stroke-width", "1.75").style("fill", "none");
    const pointsG = plotArea.append("g").attr("class", "points");
    const cornersG = canvas.append("g").attr("class", "corners");
    const legendG = canvas.append("g").attr("class", "legend");
    const overlayCanvas = overlaySvg.append("g").attr("class", "overlay-canvas");
    const xStripRect = overlayCanvas.append("rect").attr("class", "axis-strip axis-strip--x").attr("fill", palette.bg).style("pointer-events", "none");
    const yStripRect = overlayCanvas.append("rect").attr("class", "axis-strip axis-strip--y").attr("fill", palette.bg).style("pointer-events", "none");
    const axisLabelsG = overlayCanvas.append("g").attr("class", "axis-labels");
    const cornersOverlayG = overlayCanvas.append("g").attr("class", "corners-overlay").style("pointer-events", "none");
    const hoverG = overlayCanvas.append("g").attr("class", "hover-layer").style("pointer-events", "none");
    const legendLabelsG = overlayCanvas.append("g").attr("class", "legend-labels").style("pointer-events", "none");
    const legendHoverG = overlayCanvas.append("g").attr("class", "legend-hover").style("pointer-events", "none");
    let prevState = /* @__PURE__ */ new Map();
    let currentHoverIdx = null;
    let lastMousePos = null;
    let _plotState = null;
    let _pointR = POINT_R;
    let _pointRHover = POINT_R + POINT_R_HOVER_DELTA;
    let _legendState = null;
    function update({
      points,
      modelResult,
      xLabel = "x",
      yLabel = "y",
      modelKey = "ols",
      groupColorType = "categorical",
      groupLabel = null,
      customXTicks = null,
      customYTicks = null,
      onPointClick = () => {
      },
      onPointHover = () => {
      }
    }) {
      clearHover();
      onPointHover(null);
      currentHoverIdx = null;
      const { width: W, height: H } = svgEl.getBoundingClientRect();
      if (W === 0 || H === 0) return;
      const MARGIN = W < 420 ? MARGIN_MOBILE : MARGIN_DESKTOP;
      const iW = W - MARGIN.left - MARGIN.right;
      const iH = H - MARGIN.top - MARGIN.bottom;
      svg.attr("viewBox", `0 0 ${W} ${H}`);
      canvas.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      clipRect.attr("width", iW).attr("height", iH);
      overlaySvg.attr("viewBox", `0 0 ${W} ${H}`);
      overlayCanvas.attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
      xStripRect.attr("x", -MARGIN.left).attr("y", iH + TICK_LEN).attr("width", iW + MARGIN.left + MARGIN.right).attr("height", MARGIN.bottom - TICK_LEN);
      yStripRect.attr("x", -MARGIN.left).attr("y", -MARGIN.top).attr("width", MARGIN.left - TICK_LEN).attr("height", iH + MARGIN.top + MARGIN.bottom);
      const active = points.filter((p) => !p.censored);
      if (!active.length) return;
      _pointR = scaledPointR(active.length);
      _pointRHover = _pointR + POINT_R_HOVER_DELTA;
      const xExt = extent(active, (p) => p.displayX);
      const yExt = extent(active, (p) => p.displayY);
      const xPad = (xExt[1] - xExt[0]) * 0.06 || 1;
      const yPad = (yExt[1] - yExt[0]) * 0.06 || 1;
      const xScale = linear2().domain([xExt[0] - xPad, xExt[1] + xPad]).range([0, iW]);
      const yScale = linear2().domain([yExt[0] - yPad, yExt[1] + yPad]).range([iH, 0]);
      xAxisG.attr("transform", `translate(0,${iH})`);
      yAxisG.attr("transform", `translate(0,0)`);
      drawAxis(xAxisG, active.map((p) => p.displayX), xScale, iH, iW, "x");
      drawAxis(yAxisG, active.map((p) => p.displayY), yScale, iH, iW, "y");
      xAxisLabelsG.selectAll("*").remove();
      drawAxisLabels(
        xAxisLabelsG,
        active.map((p) => p.displayX),
        xScale,
        iH,
        iW,
        "x",
        xLabel,
        customXTicks,
        MARGIN
      );
      yAxisLabelsG.selectAll("*").remove();
      drawAxisLabels(
        yAxisLabelsG,
        active.map((p) => p.displayY),
        yScale,
        iH,
        iW,
        "y",
        yLabel,
        customYTicks,
        MARGIN
      );
      axisLabelsG.selectAll("*").remove();
      drawAxisLabels(
        axisLabelsG,
        active.map((p) => p.displayX),
        xScale,
        iH,
        iW,
        "x",
        xLabel,
        customXTicks,
        MARGIN
      );
      drawAxisLabels(
        axisLabelsG,
        active.map((p) => p.displayY),
        yScale,
        iH,
        iW,
        "y",
        yLabel,
        customYTicks,
        MARGIN
      );
      const xVals = active.map((p) => p.displayX).filter(Number.isFinite);
      const yVals = active.map((p) => p.displayY).filter(Number.isFinite);
      function drawKdeStrip(el, vals, scale2, orient) {
        const kdeData = computeKDE(vals, scale2.domain()[0], scale2.domain()[1]);
        const maxD = max(kdeData, (d) => d.density);
        if (!maxD) {
          el.style("display", "none");
          return;
        }
        let areaGen;
        if (orient === "x") {
          areaGen = area_default().x((d) => scale2(d.v)).y0(iH).y1((d) => iH - d.density / maxD * KDE_MAX_PX).curve(basis_default2);
        } else {
          areaGen = area_default().y((d) => scale2(d.v)).x0(0).x1((d) => d.density / maxD * KDE_MAX_PX).curve(basis_default2);
        }
        const isNew = !el.attr("d");
        el.style("display", null).datum(kdeData);
        if (isNew) {
          el.attr("d", areaGen);
        } else {
          el.transition(transition().duration(200).ease(expOut)).attr("d", areaGen);
        }
      }
      drawKdeStrip(xKdeEl, xVals, xScale, "x");
      drawKdeStrip(yKdeEl, yVals, yScale, "y");
      const T = transition().duration(200).ease(expOut);
      const hasLine = modelResult && modelResult.slope != null && modelResult.intercept != null;
      if (hasLine) {
        const x0 = xScale.domain()[0];
        const x1 = xScale.domain()[1];
        const ly0 = yScale(modelResult.intercept + modelResult.slope * x0);
        const ly1 = yScale(modelResult.intercept + modelResult.slope * x1);
        const isNew = !regLineEl.attr("x1");
        regLineEl.style("display", null);
        if (isNew) {
          regLineEl.attr("x1", xScale(x0)).attr("y1", ly0).attr("x2", xScale(x1)).attr("y2", ly1);
        } else {
          regLineEl.transition(T).attr("x1", xScale(x0)).attr("y1", ly0).attr("x2", xScale(x1)).attr("y2", ly1);
        }
      } else {
        regLineEl.interrupt().style("display", "none");
      }
      const bandData = computeBand(modelResult, modelKey, xScale.domain(), 60);
      if (bandData) {
        const areaGen = area_default().x((d) => xScale(d.x)).y0((d) => yScale(d.lo)).y1((d) => yScale(d.hi));
        ciBandEl.style("display", null).datum(bandData).attr("d", areaGen);
      } else {
        ciBandEl.style("display", "none");
      }
      const colorOf = buildColorOf(active, groupColorType, palette.point);
      drawLegend({ active, groupColorType, groupLabel, colorOf, modelResult, iW, iH });
      const allPoints = points.map((p) => {
        const sx = xScale(p.displayX);
        const sy = yScale(p.displayY);
        const corner = p.censored ? cornerMarkerPos(p.displayX, p.displayY, xScale, yScale, iW, iH) : null;
        return { ...p, sx, sy, corner };
      });
      const newPointMap = new Map(allPoints.map((p) => [p.index, p]));
      _plotState = { allPoints, iH, colorOf, xScale, yScale };
      const circlePoints = allPoints.filter((p) => !p.censored || !p.corner);
      pointsG.selectAll(".point").data(circlePoints, (d) => d.index).join(
        (enter) => {
          const nodes = enter.append("circle").attr("class", "point").attr("r", _pointR).attr("cx", (d) => {
            const p = prevState.get(d.index);
            return p?.isCorner ? p.cornerX : d.sx;
          }).attr("cy", (d) => {
            const p = prevState.get(d.index);
            return p?.isCorner ? p.cornerY : d.sy;
          });
          nodes.transition(T).attr("cx", (d) => d.sx).attr("cy", (d) => d.sy);
          return nodes;
        },
        (update2) => update2.call(
          (sel) => sel.transition(T).attr("cx", (d) => d.sx).attr("cy", (d) => d.sy)
        ),
        (exit) => {
          exit.each(function(d) {
            const next = newPointMap.get(d.index);
            if (next?.corner) {
              select_default2(this).raise().transition(T).attr("cx", next.corner.x).attr("cy", next.corner.y).remove();
            } else {
              select_default2(this).remove();
            }
          });
        }
      ).attr("r", _pointR).classed("point--active", (d) => !d.censored).classed("point--censored", (d) => d.censored).style("fill", (d) => d.censored ? "none" : colorOf(d)).style("stroke", (d) => d.censored ? palette.censored : "none").style("stroke-width", (d) => d.censored ? "1.25px" : null).style("opacity", (d) => {
        if (d.censored) return 0.7;
        return d.weight != null ? 0.15 + 0.7 * d.weight : 0.85;
      }).style("cursor", "pointer").on("click", (event, d) => {
        event.stopPropagation();
        onPointClick(d.index);
      });
      const cornerPoints = allPoints.filter((p) => p.corner);
      cornersG.selectAll(".point--corner").data(cornerPoints, (d) => d.index).join(
        (enter) => enter.append("path").attr("class", "point--corner").attr("transform", (d) => `translate(${d.corner.x},${d.corner.y})`).on("click", (event, d) => {
          event.stopPropagation();
          onPointClick(d.index);
        }),
        (update2) => update2.call(
          (sel) => sel.transition(T).attr("transform", (d) => `translate(${d.corner.x},${d.corner.y})`)
        ),
        (exit) => exit.remove()
      ).attr("d", Symbol2().type(diamond_default).size(60)).style("fill", "none").style("stroke", palette.censored).style("stroke-width", "1.5").style("opacity", "0.8").style("cursor", "pointer");
      cornersOverlayG.selectAll(".point--corner").data(cornerPoints, (d) => d.index).join(
        (enter) => enter.append("path").attr("class", "point--corner"),
        (update2) => update2,
        (exit) => exit.remove()
      ).attr("transform", (d) => `translate(${d.corner.x},${d.corner.y})`).attr("d", Symbol2().type(diamond_default).size(60)).attr("data-cx", (d) => d.corner.outB ? d.corner.x : null).attr("data-cy", (d) => d.corner.outL ? d.corner.y : null).style("fill", "none").style("stroke", palette.censored).style("stroke-width", "1.5").style("opacity", "0.8");
      const gridMap = /* @__PURE__ */ new Map();
      for (const p of allPoints) {
        const px = p.corner ? p.corner.x : p.sx;
        const py = p.corner ? p.corner.y : p.sy;
        const key = `${Math.round(px / SNAP_PX)},${Math.round(py / SNAP_PX)}`;
        if (!gridMap.has(key)) gridMap.set(key, p);
      }
      const voronoiPoints = [...gridMap.values()];
      overlayCanvas.selectAll("rect.interaction-rect").remove();
      if (voronoiPoints.length >= 2) {
        let handleHover = function(mx, my) {
          const i = delaunay.find(mx, my);
          const d = voronoiPoints[i];
          const px = d.corner ? d.corner.x : d.sx;
          const py = d.corner ? d.corner.y : d.sy;
          if (Math.hypot(mx - px, my - py) > MAX_HOVER_DIST) {
            if (currentHoverIdx !== null) {
              currentHoverIdx = null;
              clearHover();
              onPointHover(null);
              interactionRect.style("cursor", "default");
            }
            return;
          }
          if (i === currentHoverIdx) return;
          currentHoverIdx = i;
          clearHover();
          interactionRect.style("cursor", "pointer");
          if (d.censored) {
            showCensorHover(d, xScale, yScale, iH, iW);
            onPointHover(null);
          } else {
            showHover(d, iH, colorOf(d));
            onPointHover(d.index);
          }
        };
        const vx = (d) => (d.corner ? d.corner.x : d.sx) + (Math.random() * 2 - 1) * JITTER;
        const vy = (d) => (d.corner ? d.corner.y : d.sy) + (Math.random() * 2 - 1) * JITTER;
        const delaunay = Delaunay.from(voronoiPoints, vx, vy);
        const LEFT_EXT = CORNER_LEFT_STRIP_X + CORNER_R + 2;
        const BOT_EXT = CORNER_BOT_STRIP_Y + CORNER_R + 2;
        const EDGE_VP = CORNER_R + 2;
        const interactionRect = overlayCanvas.append("rect").attr("class", "interaction-rect").attr("x", -LEFT_EXT).attr("y", -EDGE_VP).attr("width", iW + LEFT_EXT + EDGE_VP).attr("height", iH + EDGE_VP + BOT_EXT).style("fill", "none").style("pointer-events", "all").style("cursor", "default");
        interactionRect.on("mousemove", (event) => {
          const [mx, my] = pointer_default(event);
          lastMousePos = [mx, my];
          handleHover(mx, my);
        }).on("mouseleave", () => {
          lastMousePos = null;
          if (currentHoverIdx !== null) {
            currentHoverIdx = null;
            clearHover();
            onPointHover(null);
          }
          interactionRect.style("cursor", "default");
        }).on("click", () => {
          if (currentHoverIdx === null) return;
          onPointClick(voronoiPoints[currentHoverIdx].index);
        });
        if (lastMousePos) handleHover(...lastMousePos);
      }
      prevState = new Map(allPoints.map((p) => [p.index, {
        sx: p.sx,
        sy: p.sy,
        cornerX: p.corner?.x,
        cornerY: p.corner?.y,
        isCorner: !!p.corner
      }]));
    }
    function drawHoverSuperticks(xPos, xVal, yPos, yVal, iH) {
      hoverG.append("line").classed("tick-mark--hover", true).style("stroke", palette.text).style("stroke-width", "1.5").attr("x1", xPos).attr("y1", iH + 1).attr("x2", xPos).attr("y2", iH + SUPERTICK_LEN);
      hoverG.append("text").classed("tick-label--hover", true).style("fill", palette.text).style("font-size", "13px").style("font-family", palette.font).style("font-weight", "600").attr("x", xPos).attr("y", iH + SUPERTICK_LEN + 3).attr("text-anchor", "middle").attr("dominant-baseline", "hanging").text(fmtNum(xVal));
      hoverG.append("line").classed("tick-mark--hover", true).style("stroke", palette.text).style("stroke-width", "1.5").attr("x1", -1).attr("y1", yPos).attr("x2", -SUPERTICK_LEN).attr("y2", yPos);
      hoverG.append("text").classed("tick-label--hover", true).style("fill", palette.text).style("font-size", "13px").style("font-family", palette.font).style("font-weight", "600").attr("x", -SUPERTICK_LEN - 3).attr("y", yPos).attr("text-anchor", "end").attr("dominant-baseline", "middle").text(fmtNum(yVal));
      suppressOverlappingItems(true, xPos);
      suppressOverlappingItems(false, yPos);
    }
    function showHover(d, iH, color2) {
      hoverG.selectAll("*").remove();
      hoverG.append("circle").attr("cx", d.sx).attr("cy", d.sy).attr("r", _pointRHover).attr("fill", color2).attr("stroke", palette.text).attr("stroke-width", 1.5).style("pointer-events", "none");
      drawHoverSuperticks(d.sx, d.displayX, d.sy, d.displayY, iH);
      if (_legendState && d.group != null) updateLegendHover(d.group);
    }
    function showCensorHover(d, xScale, yScale, iH, iW) {
      const cx = d.corner ? d.corner.x : d.sx;
      const cy = d.corner ? d.corner.y : d.sy;
      hoverG.selectAll("*").remove();
      if (d.corner) {
        hoverG.append("path").attr("transform", `translate(${cx},${cy})`).attr("d", Symbol2().type(diamond_default).size(60)).attr("fill", palette.censored).attr("stroke", "none").attr("opacity", 1).style("pointer-events", "none");
      } else {
        hoverG.append("circle").attr("cx", cx).attr("cy", cy).attr("r", _pointRHover).attr("fill", "none").attr("stroke", palette.censored).attr("stroke-width", 2).style("pointer-events", "none");
      }
      const xPos = d.corner ? Math.max(0, Math.min(iW, d.corner.x)) : xScale(d.displayX);
      const yPos = d.corner ? Math.max(0, Math.min(iH, d.corner.y)) : yScale(d.displayY);
      drawHoverSuperticks(xPos, d.displayX, yPos, d.displayY, iH);
    }
    function suppressOverlappingItems(isX, hoverPos) {
      const selector = isX ? "text.tick-label--x" : "text.tick-label--y";
      axisLabelsG.selectAll(selector).each(function() {
        const el = select_default2(this);
        const pos = +(isX ? el.attr("x") : el.attr("y"));
        const box = this.getBBox();
        const half = isX ? box.width / 2 : box.height / 2;
        if (Math.abs(pos - hoverPos) <= half + 2) el.style("display", "none");
      });
      const cornerAttr = isX ? "data-cx" : "data-cy";
      const DIAMOND_HALF = CORNER_R + 1;
      cornersOverlayG.selectAll(".point--corner").each(function() {
        const pos = +select_default2(this).attr(cornerAttr);
        if (!isNaN(pos) && Math.abs(pos - hoverPos) <= DIAMOND_HALF + 2)
          select_default2(this).style("display", "none");
      });
    }
    function clearHover() {
      hoverG.selectAll("*").remove();
      legendHoverG.selectAll("*").remove();
      axisLabelsG.selectAll(".tick-label--x, .tick-label--y").style("display", null);
      cornersOverlayG.selectAll(".point--corner").style("display", null);
      legendLabelsG.selectAll(".tick-label--legend").style("display", null);
    }
    function drawLegend({ active, groupColorType, groupLabel, colorOf, modelResult, iW, iH }) {
      legendG.selectAll("*").remove();
      legendLabelsG.selectAll("*").remove();
      legendHoverG.selectAll("*").remove();
      _legendState = null;
      if (!groupLabel) return;
      const groupValues = active.map((p) => p.group).filter((g) => g != null);
      if (!groupValues.length) return;
      const isLeft = (modelResult?.slope ?? 0) >= 0;
      if (groupColorType === "continuous") {
        drawContinuousLegend({ groupValues, groupLabel, colorOf, isLeft, iW });
      } else {
        drawCategoricalLegend({ groupValues, groupLabel, colorOf, isLeft, iW });
      }
    }
    function drawCategoricalLegend({ groupValues, groupLabel, colorOf, isLeft, iW }) {
      const PAD = 8, ITEM_H = 18, CR = 5, FS = 10, ITEM_TEXT_X = CR * 2 + 6, OUTER_PAD = 12;
      const groups = [...new Set(groupValues.map(String))].sort().slice(0, 10);
      legendG.append("text").style("font-family", palette.font).style("font-size", `${FS}px`).style("font-weight", "700").style("fill", palette.text).attr("x", PAD).attr("y", PAD + FS).text(groupLabel);
      groups.forEach((g, i) => {
        const localCy = PAD + FS + 10 + i * ITEM_H + CR;
        const localCx = PAD + CR;
        legendG.append("circle").attr("cx", localCx).attr("cy", localCy).attr("r", CR).style("fill", colorOf({ group: g })).style("stroke", "none");
        legendG.append("text").style("font-family", palette.font).style("font-size", `${FS}px`).style("fill", palette.text).attr("x", PAD + ITEM_TEXT_X).attr("y", localCy).attr("dominant-baseline", "middle").text(g);
      });
      const bb2 = legendG.node().getBBox();
      legendG.insert("rect", ":first-child").attr("x", bb2.x - PAD).attr("y", bb2.y - PAD).attr("width", bb2.width + 2 * PAD).attr("height", bb2.height + 2 * PAD).attr("rx", 4).style("fill", palette.bg).style("fill-opacity", "0.88").style("stroke", palette.muted).style("stroke-width", "0.5");
      const lx = isLeft ? OUTER_PAD : iW - (bb2.width + 2 * PAD) - OUTER_PAD;
      const ly = OUTER_PAD;
      const tx = lx - (bb2.x - PAD);
      const ty = ly - (bb2.y - PAD);
      legendG.attr("transform", `translate(${tx},${ty})`);
      _legendState = {
        type: "categorical",
        items: groups.map((g, i) => ({
          g,
          canvasCx: tx + PAD + CR,
          canvasCy: ty + PAD + FS + 10 + i * ITEM_H + CR
        })),
        CR
      };
    }
    function drawContinuousLegend({ groupValues, groupLabel, colorOf, isLeft, iW }) {
      const PAD = 8, FS = 10, LINE_LEN = 12, BAR_H = 100, TICK_LEN2 = 6, TICK_GAP = 4, OUTER_PAD = 12;
      const vals = groupValues.map(Number).filter(isFinite);
      if (!vals.length) return;
      const sorted = [...vals].sort(ascending);
      const [lo, hi] = extent(sorted);
      const thermoScale = linear2().domain(lo === hi ? [lo - 1, hi + 1] : [lo, hi]).range([BAR_H - 1, 1]);
      const Y0 = PAD + FS + 10;
      legendG.append("text").style("font-family", palette.font).style("font-size", `${FS}px`).style("font-weight", "700").style("fill", palette.text).attr("x", PAD).attr("y", PAD + FS).text(groupLabel);
      legendG.append("line").attr("x1", PAD).attr("y1", Y0).attr("x2", PAD).attr("y2", Y0 + BAR_H).style("stroke", palette.muted).style("stroke-width", "1");
      for (const v2 of vals) {
        const y2 = Y0 + thermoScale(v2);
        legendG.append("line").attr("x1", PAD).attr("y1", y2).attr("x2", PAD + LINE_LEN).attr("y2", y2).style("stroke", colorOf({ group: v2 })).style("stroke-width", "1").style("opacity", "0.5");
      }
      for (const v2 of fiveNum(sorted)) {
        const y2 = Y0 + thermoScale(v2);
        legendG.append("text").classed("tick-label--legend", true).style("font-family", palette.font).style("font-size", `${FS}px`).style("fill", palette.text).attr("x", PAD + LINE_LEN + TICK_GAP).attr("y", y2).attr("dominant-baseline", "middle").text(fmtNum(v2));
      }
      const bb2 = legendG.node().getBBox();
      legendG.insert("rect", ":first-child").attr("x", bb2.x - PAD).attr("y", bb2.y - PAD).attr("width", bb2.width + 2 * PAD).attr("height", bb2.height + 2 * PAD).attr("rx", 4).style("fill", palette.bg).style("fill-opacity", "0.88").style("stroke", palette.muted).style("stroke-width", "0.5");
      const lx = isLeft ? OUTER_PAD : iW - (bb2.width + 2 * PAD) - OUTER_PAD;
      const ly = OUTER_PAD;
      const tx = lx - (bb2.x - PAD);
      const ty = ly - (bb2.y - PAD);
      legendG.attr("transform", `translate(${tx},${ty})`);
      legendLabelsG.selectAll("*").remove();
      legendLabelsG.attr("transform", `translate(${tx},${ty})`);
      legendLabelsG.append("rect").attr("x", PAD + LINE_LEN + TICK_GAP - 2).attr("y", Y0 - 7).attr("width", bb2.x + bb2.width - (PAD + LINE_LEN + TICK_GAP) + 4).attr("height", BAR_H + 14).style("fill", palette.bg);
      for (const v2 of fiveNum(sorted)) {
        const y2 = Y0 + thermoScale(v2);
        legendLabelsG.append("text").classed("tick-label--legend", true).style("font-family", palette.font).style("font-size", `${FS}px`).style("fill", palette.text).attr("x", PAD + LINE_LEN + TICK_GAP).attr("y", y2).attr("dominant-baseline", "middle").text(fmtNum(v2));
      }
      _legendState = {
        type: "continuous",
        thermoScale,
        Y0,
        spineLocalX: PAD,
        LINE_LEN,
        TICK_GAP,
        colorOf,
        tx,
        ty
      };
    }
    function updateLegendHover(groupVal) {
      legendHoverG.selectAll("*").remove();
      if (!_legendState) return;
      if (_legendState.type === "categorical") {
        const key = String(groupVal);
        const item = _legendState.items.find((it) => it.g === key);
        if (!item) return;
        legendHoverG.append("circle").attr("cx", item.canvasCx).attr("cy", item.canvasCy).attr("r", _legendState.CR + 2).style("fill", "none").style("stroke", palette.text).style("stroke-width", "1.5px");
      } else {
        const { thermoScale, Y0, spineLocalX, LINE_LEN, TICK_GAP, colorOf, tx, ty } = _legendState;
        const localY = Y0 + thermoScale(+groupVal);
        const canvasY = ty + localY;
        const canvasX0 = tx + spineLocalX;
        legendHoverG.append("line").attr("x1", canvasX0).attr("y1", canvasY).attr("x2", canvasX0 + LINE_LEN).attr("y2", canvasY).style("stroke", colorOf({ group: +groupVal })).style("stroke-width", "2px").style("opacity", "1");
        legendHoverG.append("text").style("fill", palette.text).style("font-size", "10px").style("font-family", palette.font).style("font-weight", "600").attr("x", canvasX0 + LINE_LEN + TICK_GAP).attr("y", canvasY).attr("text-anchor", "start").attr("dominant-baseline", "middle").text(fmtNum(+groupVal));
        legendLabelsG.selectAll(".tick-label--legend").each(function() {
          const el = select_default2(this);
          if (Math.abs(+el.attr("y") - localY) < 8) el.style("display", "none");
        });
      }
    }
    function drawAxis(g, vals, scale2, iH, iW, orient) {
      g.selectAll("*").remove();
      const isX = orient === "x";
      g.append("line").classed("axis-line", true).style("stroke", "#555").style("stroke-width", "1").attr("x1", 0).attr("y1", 0).attr("x2", isX ? iW : 0).attr("y2", isX ? 0 : iH);
      const finiteVals = vals.filter(Number.isFinite);
      const inRange = finiteVals.filter((v2) => v2 >= scale2.domain()[0] && v2 <= scale2.domain()[1]);
      for (const v2 of inRange) {
        const pos = scale2(v2);
        g.append("line").classed("tick-mark", true).style("stroke", "#333").style("stroke-width", "0.75").style("opacity", "0.3").attr("x1", isX ? pos : 0).attr("y1", isX ? 0 : pos).attr("x2", isX ? pos : -TICK_LEN).attr("y2", isX ? TICK_LEN : pos);
      }
    }
    function drawAxisLabels(g, vals, scale2, iH, iW, orient, label, customTicks, margin) {
      const isX = orient === "x";
      const len = isX ? iW : iH;
      const labelClass = isX ? "tick-label--x" : "tick-label--y";
      const finiteVals = vals.filter(Number.isFinite);
      const labels = customTicks ?? fiveNum(finiteVals);
      for (const v2 of labels) {
        const pos = scale2(v2);
        if (pos < -2 || pos > len + 2) continue;
        const fmt = fmtNum(v2);
        if (isX) {
          g.append("text").classed("tick-label", true).classed(labelClass, true).style("fill", palette.muted).style("font-size", "13px").style("font-family", palette.font).attr("x", pos).attr("y", iH + TICK_LEN + 3).attr("text-anchor", "middle").attr("dominant-baseline", "hanging").text(fmt);
        } else {
          g.append("text").classed("tick-label", true).classed(labelClass, true).style("fill", palette.muted).style("font-size", "13px").style("font-family", palette.font).attr("x", -TICK_LEN - 3).attr("y", pos).attr("text-anchor", "end").attr("dominant-baseline", "middle").text(fmt);
        }
      }
      if (isX) {
        g.append("text").classed("axis-label", true).style("fill", palette.text).style("font-size", "14px").style("font-family", palette.font).style("font-weight", "500").attr("x", iW / 2).attr("y", iH + TICK_LEN + 42).attr("text-anchor", "middle").text(label);
      } else {
        g.append("text").classed("axis-label", true).style("fill", palette.text).style("font-size", "14px").style("font-family", palette.font).style("font-weight", "500").attr("transform", `rotate(-90)`).attr("x", -iH / 2).attr("y", -(margin.left - 15)).attr("text-anchor", "middle").text(label);
      }
    }
    function clear() {
      pointsG.selectAll("*").remove();
      cornersG.selectAll("*").remove();
      cornersOverlayG.selectAll("*").remove();
      legendG.selectAll("*").remove();
      _legendState = null;
      clearHover();
      axisLabelsG.selectAll("*").remove();
      xAxisLabelsG.selectAll("*").remove();
      yAxisLabelsG.selectAll("*").remove();
      overlayCanvas.selectAll("rect.interaction-rect").remove();
      xAxisG.selectAll("*").remove();
      yAxisG.selectAll("*").remove();
      regLineEl.style("display", "none");
      ciBandEl.style("display", "none");
      xKdeEl.style("display", "none");
      yKdeEl.style("display", "none");
    }
    function highlightPoint(index) {
      currentHoverIdx = null;
      clearHover();
      if (index == null || !_plotState) return;
      const d = _plotState.allPoints.find((p) => p.index === index);
      if (!d || d.censored) return;
      hoverG.append("circle").attr("cx", d.sx).attr("cy", d.sy).attr("r", _pointRHover).attr("fill", _plotState.colorOf(d)).style("pointer-events", "none");
    }
    return { update, clear, highlightPoint };
  }

  // src/plot/diagnostics.js
  function readPalette2() {
    const cs = getComputedStyle(document.documentElement);
    const v2 = (name) => cs.getPropertyValue(name).trim();
    return {
      point: v2("--color-point"),
      regline: v2("--color-regline"),
      censored: v2("--color-censored"),
      bg: v2("--color-bg"),
      text: v2("--color-text"),
      muted: v2("--color-text-muted"),
      font: v2("--font-sans")
    };
  }
  function normalQuantile(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const a = [
      -39.69683028665376,
      220.9460984245205,
      -275.9285104469687,
      138.357751867269,
      -30.66479806614716,
      2.506628277459239
    ];
    const b = [
      -54.47609879822406,
      161.5858368580409,
      -155.6989798598866,
      66.80131188771972,
      -13.28068155288572
    ];
    const c = [
      -0.007784894002430293,
      -0.3223964580411365,
      -2.400758277161838,
      -2.549732539343734,
      4.374664141464968,
      2.938163982698783
    ];
    const d = [
      0.007784695709041462,
      0.3224671290700398,
      2.445134137142996,
      3.754408661907416
    ];
    const pLo = 0.02425, pHi = 1 - pLo;
    if (p < pLo) {
      const q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHi) {
      const q = p - 0.5, r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      const q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
  }
  function normalPDF(x2, mu, sigma) {
    const z = (x2 - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }
  var DIAG_MARGIN = { top: 8, right: 8, bottom: 20, left: 8 };
  function createDiagnostics(container, overlayContainer, { onQQHover = null } = {}) {
    const palette = readPalette2();
    const svg = select_default2(container);
    const overlaySvg = overlayContainer ? select_default2(overlayContainer) : null;
    let diagState = null;
    let lastResiduals = null;
    let lastActiveIndices = null;
    function update({ residuals: residuals2, activeIndices, hoveredIndex: hoveredIndex2 = null, pointColors = null }) {
      if (!residuals2 || residuals2.length < 3) {
        svg.selectAll("*").remove();
        if (overlaySvg) overlaySvg.selectAll("*").remove();
        diagState = null;
        lastResiduals = null;
        lastActiveIndices = null;
        return;
      }
      if (residuals2 !== lastResiduals || activeIndices !== lastActiveIndices) {
        diagState = fullDraw(svg, overlaySvg, residuals2, activeIndices, pointColors, palette);
        lastResiduals = residuals2;
        lastActiveIndices = activeIndices;
        if (diagState && onQQHover) setupQQInteraction(diagState, onQQHover);
      }
      highlightDiag(diagState, activeIndices, hoveredIndex2);
    }
    function clear() {
      svg.selectAll("*").remove();
      if (overlaySvg) overlaySvg.selectAll("*").remove();
      diagState = null;
      lastResiduals = null;
      lastActiveIndices = null;
    }
    return { update, clear };
  }
  function fullDraw(svg, overlaySvg, residuals2, activeIndices, pointColors, palette) {
    const { width: W, height: H } = svg.node().getBoundingClientRect();
    if (W === 0 || H === 0) return null;
    const m = DIAG_MARGIN;
    const iW = W - m.left - m.right;
    const iH = H - m.top - m.bottom;
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${W} ${H}`);
    const n = residuals2.length;
    const mu = mean(residuals2);
    const sd = stdev(residuals2);
    const yExt = extent(residuals2);
    const yPad = (yExt[1] - yExt[0]) * 0.1 || sd * 0.3 || 1;
    const yScale = linear2().domain([yExt[0] - yPad, yExt[1] + yPad]).range([iH, 0]);
    const panelW = iW / 2;
    const sharedAxisX = m.left + panelW;
    const innerG = svg.append("g").attr("transform", `translate(0, ${m.top})`);
    innerG.append("line").classed("diag-axis", true).style("stroke", "#999").style("stroke-width", "0.75").style("fill", "none").attr("x1", sharedAxisX).attr("y1", 0).attr("x2", sharedAxisX).attr("y2", iH);
    for (const v2 of yScale.ticks(4)) {
      const y2 = yScale(v2);
      innerG.append("line").classed("diag-axis", true).style("stroke", "#999").style("stroke-width", "0.75").style("fill", "none").attr("x1", sharedAxisX - 3).attr("y1", y2).attr("x2", sharedAxisX).attr("y2", y2);
    }
    const distG = innerG.append("g").attr("transform", `translate(${m.left}, 0)`);
    drawDist(distG, residuals2, n, mu, sd, panelW, iH, yScale, palette);
    const fringeG = innerG.append("g").attr("class", "diag-fringe-group");
    for (const r of residuals2) {
      fringeG.append("line").classed("diag-fringe", true).style("stroke", palette.muted).style("stroke-width", "0.75").style("opacity", "0.4").attr("x1", sharedAxisX - 4).attr("y1", yScale(r)).attr("x2", sharedAxisX).attr("y2", yScale(r));
    }
    const qqG = innerG.append("g").attr("transform", `translate(${sharedAxisX}, 0)`);
    const { sortedWithIdx, theoretical, xScale: qqXScale } = drawQQ(qqG, residuals2, n, iH, yScale, panelW, pointColors, palette);
    const qqHitPoints = sortedWithIdx.map(({ i }, si) => ({
      localX: qqXScale(theoretical[si]),
      localY: yScale(sortedWithIdx[si].r),
      rowIndex: activeIndices[i]
    }));
    const qqDelaunay = Delaunay.from(qqHitPoints, (p) => p.localX, (p) => p.localY);
    let overlayInnerG = null;
    let overlayQqG = null;
    if (overlaySvg) {
      overlaySvg.selectAll("*").remove();
      overlaySvg.attr("viewBox", `0 0 ${W} ${H}`);
      overlayInnerG = overlaySvg.append("g").attr("transform", `translate(0, ${m.top})`);
      overlayQqG = overlayInnerG.append("g").attr("transform", `translate(${sharedAxisX}, 0)`);
    }
    return {
      svg,
      innerG,
      fringeG,
      qqG,
      overlayInnerG,
      overlayQqG,
      yScale,
      iH,
      m,
      sharedAxisX,
      residuals: residuals2,
      sortedWithIdx,
      theoretical,
      qqXScale,
      qqHitPoints,
      qqDelaunay,
      qqPanelW: panelW,
      palette,
      hasHover: false
    };
  }
  function drawDist(g, residuals2, n, mu, sd, panelW, iH, yScale, palette) {
    const k = Math.round(Math.sqrt(n));
    if (k <= 20) {
      const binGen = bin().domain(yScale.domain()).thresholds(k);
      const bins = binGen(residuals2);
      const maxDensity = max(bins, (b) => {
        const bw = b.x1 - b.x0;
        return bw > 0 ? b.length / (n * bw) : 0;
      });
      const normalPeak = normalPDF(mu, mu, sd);
      const xMax = Math.max(maxDensity, normalPeak) * 1.1 || 1;
      const xScale = linear2().domain([0, xMax]).range([panelW, 0]);
      g.selectAll(".diag-bar").data(bins).join("rect").classed("diag-bar", true).style("fill", "#b8cce4").style("stroke", "#8aaccf").style("stroke-width", "0.5").attr("x", (b) => {
        const bw = b.x1 - b.x0;
        const density = bw > 0 ? b.length / (n * bw) : 0;
        return xScale(density);
      }).attr("y", (b) => yScale(b.x1)).attr("width", (b) => {
        const bw = b.x1 - b.x0;
        const density = bw > 0 ? b.length / (n * bw) : 0;
        return Math.max(0, panelW - xScale(density));
      }).attr("height", (b) => Math.max(0, yScale(b.x0) - yScale(b.x1)));
      const curveVals = range(yScale.domain()[0], yScale.domain()[1] + sd / 20, sd / 20);
      const line = line_default().y((v2) => yScale(v2)).x((v2) => xScale(normalPDF(v2, mu, sd)));
      g.append("path").classed("diag-curve", true).style("fill", "none").style("stroke", palette.regline).style("stroke-width", "1").attr("d", line(curveVals));
    } else {
      let kde = function(x2) {
        return residuals2.reduce((sum2, r) => {
          const z = (x2 - r) / h;
          return sum2 + Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
        }, 0) / (n * h);
      };
      const sorted = [...residuals2].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(n * 0.25)];
      const q3 = sorted[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const h = 0.9 * Math.min(sd, iqr / 1.34) * Math.pow(n, -0.2) || sd * 0.1;
      const [yLo, yHi] = yScale.domain();
      const step = (yHi - yLo) / 80;
      const evalPts = range(yLo, yHi + step, step);
      const densities = evalPts.map(kde);
      const normalDensities = evalPts.map((v2) => normalPDF(v2, mu, sd));
      const xMax = Math.max(max(densities), max(normalDensities)) * 1.1 || 1;
      const xScale = linear2().domain([0, xMax]).range([panelW, 0]);
      const area = area_default().y((_, i) => yScale(evalPts[i])).x0(panelW).x1((d) => xScale(d));
      g.append("path").classed("diag-bar", true).style("fill", "#b8cce4").style("stroke", "#8aaccf").style("stroke-width", "0.5").attr("d", area(densities));
      const normalLine = line_default().y((_, i) => yScale(evalPts[i])).x((d) => xScale(d));
      g.append("path").classed("diag-curve", true).style("fill", "none").style("stroke", palette.regline).style("stroke-width", "1").attr("d", normalLine(normalDensities));
    }
  }
  function drawQQ(g, residuals2, n, iH, yScale, panelW, pointColors, palette) {
    const sortedWithIdx = residuals2.map((r, i) => ({ r, i })).sort((a, b) => a.r - b.r);
    const theoretical = sortedWithIdx.map((_, i) => normalQuantile((i + 0.5) / n));
    const xExt = extent(theoretical);
    const xPad = (xExt[1] - xExt[0]) * 0.08;
    const xScale = linear2().domain([xExt[0] - xPad, xExt[1] + xPad]).range([0, panelW]);
    const q1t = normalQuantile(0.25), q3t = normalQuantile(0.75);
    const q1s = sortedWithIdx[Math.floor(n * 0.25)].r;
    const q3s = sortedWithIdx[Math.floor(n * 0.75)].r;
    const slope = (q3s - q1s) / (q3t - q1t);
    const intercept = q1s - slope * q1t;
    const xd = xScale.domain();
    g.append("line").classed("diag-curve", true).style("fill", "none").style("stroke", palette.regline).style("stroke-width", "1").attr("x1", xScale(xd[0])).attr("y1", yScale(intercept + slope * xd[0])).attr("x2", xScale(xd[1])).attr("y2", yScale(intercept + slope * xd[1]));
    const pointsLayer = g.append("g").attr("class", "qq-points");
    sortedWithIdx.forEach(({ r, i }, si) => {
      const color2 = pointColors ? pointColors[i] : palette.point;
      pointsLayer.append("circle").classed("diag-point", true).style("opacity", "0.7").attr("cx", xScale(theoretical[si])).attr("cy", yScale(r)).attr("r", 2.5).attr("fill", color2);
    });
    return { sortedWithIdx, theoretical, xScale };
  }
  var MAX_QQ_HOVER_DIST = 20;
  function setupQQInteraction(state, onQQHover) {
    if (!state.overlayQqG) return;
    const { overlayQqG, qqHitPoints, qqDelaunay, qqPanelW, iH } = state;
    let lastSi = null;
    function showQQPointHover(si) {
      overlayQqG.selectAll(".diag-point--qq-hovered").remove();
      overlayQqG.append("circle").classed("diag-point--qq-hovered", true).style("fill", state.palette.regline).style("opacity", "1").style("pointer-events", "none").attr("cx", state.qqXScale(state.theoretical[si])).attr("cy", state.yScale(state.sortedWithIdx[si].r)).attr("r", 4);
    }
    function clearQQPointHover() {
      overlayQqG.selectAll(".diag-point--qq-hovered").remove();
    }
    overlayQqG.append("rect").attr("x", 0).attr("y", 0).attr("width", qqPanelW).attr("height", iH).style("fill", "none").style("pointer-events", "all").on("mousemove", (event) => {
      const [mx, my] = pointer_default(event);
      const si = qqDelaunay.find(mx, my);
      const p = qqHitPoints[si];
      if (!p || Math.hypot(mx - p.localX, my - p.localY) > MAX_QQ_HOVER_DIST) {
        if (lastSi !== null) {
          lastSi = null;
          clearQQPointHover();
          onQQHover(null);
        }
        return;
      }
      if (si === lastSi) return;
      lastSi = si;
      showQQPointHover(si);
      onQQHover(p.rowIndex);
    }).on("mouseleave", () => {
      lastSi = null;
      clearQQPointHover();
      onQQHover(null);
    });
  }
  function highlightDiag(state, activeIndices, hoveredIndex2) {
    if (!state) return;
    const hoverInnerG = state.overlayInnerG ?? state.innerG;
    const hoverQqG = state.overlayQqG ?? state.qqG;
    if (state.hasHover) {
      hoverInnerG.selectAll(".diag-fringe--hovered").remove();
      hoverQqG.selectAll(".diag-point--hovered").remove();
      state.hasHover = false;
    }
    if (hoveredIndex2 == null) return;
    const i = activeIndices ? activeIndices.indexOf(hoveredIndex2) : -1;
    if (i < 0) return;
    const r = state.residuals[i];
    const y2 = state.yScale(r);
    hoverInnerG.append("line").classed("diag-fringe--hovered", true).style("stroke", state.palette.regline).style("stroke-width", "1.5").style("opacity", "1").style("pointer-events", "none").attr("x1", state.sharedAxisX - 6).attr("y1", y2).attr("x2", state.sharedAxisX).attr("y2", y2);
    const si = state.sortedWithIdx.findIndex((d) => d.i === i);
    if (si >= 0) {
      hoverQqG.append("circle").classed("diag-point--hovered", true).style("fill", state.palette.regline).style("opacity", "1").style("pointer-events", "none").attr("cx", state.qqXScale(state.theoretical[si])).attr("cy", state.yScale(state.sortedWithIdx[si].r)).attr("r", 4);
    }
    state.hasHover = true;
  }

  // src/plot/dashboard.js
  var MODEL_DISPLAY_NAMES = { ols: "OLS", robust: "Robust", spearman: "Spearman", theilsen: "Theil-Sen" };
  function populateControls(colMeta2, state) {
    const numericCols = colMeta2.filter((c) => c.isNumeric).map((c) => c.name);
    const nonNumericCols = colMeta2.filter((c) => !c.isNumeric).map((c) => c.name);
    const allCols = colMeta2.map((c) => c.name);
    populateColumnSelect("x-select", numericCols, nonNumericCols, state.x);
    populateColumnSelect("y-select", numericCols, nonNumericCols, state.y);
    populateColumnSelect("group-select", allCols, [], state.h, true);
    populateNuisanceList(numericCols, nonNumericCols, state);
    const modelSelect = document.getElementById("model-select");
    modelSelect.value = state.m;
    updateNuisanceAvailability(state.m);
  }
  function populateColumnSelect(id2, activeCols, disabledCols, selectedIndex, allowNone = false) {
    const el = document.getElementById(id2);
    if (!el) return;
    el.innerHTML = "";
    if (allowNone) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "None";
      el.appendChild(opt);
    }
    activeCols.forEach((col, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = col;
      if (i === selectedIndex) opt.selected = true;
      el.appendChild(opt);
    });
    if (disabledCols.length) {
      const sep = document.createElement("option");
      sep.disabled = true;
      sep.textContent = "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500";
      el.appendChild(sep);
      disabledCols.forEach((col) => {
        const opt = document.createElement("option");
        opt.disabled = true;
        opt.textContent = col;
        el.appendChild(opt);
      });
    }
    if (allowNone && selectedIndex == null) el.value = "";
  }
  function populateNuisanceList(numericCols, nonNumericCols, state) {
    const list = document.getElementById("nuisance-list");
    if (!list) return;
    list.innerHTML = "";
    const selected = new Set(state.n);
    numericCols.forEach((col, i) => {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = String(i);
      cb.checked = selected.has(i);
      cb.addEventListener("change", () => {
        const checked = [...list.querySelectorAll("input:not([disabled]):checked")].map((c) => parseInt(c.value, 10));
        setState({ n: checked });
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(" " + col));
      list.appendChild(label);
    });
    nonNumericCols.forEach((col) => {
      const label = document.createElement("label");
      label.style.opacity = "0.4";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.disabled = true;
      cb.dataset.nonnumeric = "true";
      label.appendChild(cb);
      label.appendChild(document.createTextNode(" " + col));
      list.appendChild(label);
    });
  }
  function updateNuisanceAvailability(modelKey) {
    const list = document.getElementById("nuisance-list");
    const note = document.getElementById("nuisance-note");
    const isRank = RANK_MODELS.has(modelKey);
    if (list) {
      list.querySelectorAll("input:not([data-nonnumeric])").forEach((cb) => {
        cb.disabled = isRank;
      });
      list.style.opacity = isRank ? "0.4" : "1";
    }
    if (note) note.hidden = !isRank;
  }
  function syncControls(state) {
    const xSel = document.getElementById("x-select");
    const ySel = document.getElementById("y-select");
    const mSel = document.getElementById("model-select");
    const gSel = document.getElementById("group-select");
    if (xSel) xSel.value = String(state.x);
    if (ySel) ySel.value = String(state.y);
    if (mSel) mSel.value = state.m;
    if (gSel) gSel.value = state.h != null ? String(state.h) : "";
  }
  function bindControls() {
    const xSel = document.getElementById("x-select");
    const ySel = document.getElementById("y-select");
    const mSel = document.getElementById("model-select");
    const gSel = document.getElementById("group-select");
    xSel?.addEventListener("change", () => setState({ x: parseInt(xSel.value, 10) }));
    ySel?.addEventListener("change", () => setState({ y: parseInt(ySel.value, 10) }));
    mSel?.addEventListener("change", () => {
      const newM = mSel.value;
      const nuisancePatch = RANK_MODELS.has(newM) ? { n: [] } : {};
      setState({ m: newM, ...nuisancePatch });
      updateNuisanceAvailability(newM);
    });
    gSel?.addEventListener("change", () => {
      setState({ h: gSel.value !== "" ? parseInt(gSel.value, 10) : null });
    });
  }
  function fmtNum2(v2, decimals) {
    if (Math.abs(v2) >= 1e4) return v2.toExponential(3);
    return v2.toFixed(decimals);
  }
  var FMT = {
    coef: (v2) => v2 == null ? "\u2014" : fmtNum2(v2, 4),
    stat: (v2) => v2 == null ? "\u2014" : fmtNum2(v2, 3),
    pval: (v2) => {
      if (v2 == null) return "\u2014";
      if (v2 < 1e-3) return "<0.001";
      return v2.toFixed(3);
    },
    r2: (v2) => v2 == null ? "\u2014" : v2.toFixed(3),
    n: (v2) => v2 == null ? "\u2014" : String(v2)
  };
  function updateStats({
    modelResult,
    modelKey,
    n,
    nCensored,
    nuisanceNames = [],
    nuisancePartialR2 = []
  }) {
    const el = document.getElementById("stats-model");
    if (!el) return;
    el.innerHTML = "";
    if (!modelResult) {
      el.innerHTML = '<p class="stats-label">No results</p>';
      return;
    }
    const hasNuisance = nuisanceNames.length > 0 && (modelKey === "ols" || modelKey === "robust");
    const rows = buildStatRows(modelResult, modelKey, hasNuisance);
    const title = MODEL_DISPLAY_NAMES[modelKey] ?? modelKey;
    const hasNuisanceStats = nuisanceNames.length > 0 && nuisancePartialR2.length > 0 && (modelKey === "ols" || modelKey === "robust");
    const nuisanceRows = hasNuisanceStats ? nuisanceNames.map(
      (name, i) => `<tr><td>${name}</td><td>${FMT.r2(nuisancePartialR2[i])}</td></tr>`
    ).join("") : "";
    const html = `
    <h3>${title}</h3>
    <table class="stats-table">
      ${rows.map(([label, val]) => `<tr><td>${label}</td><td>${val}</td></tr>`).join("")}
      ${hasNuisanceStats ? `
        <tr><td colspan="2"><hr class="stats-divider"></td></tr>
        <tr><td colspan="2" class="stats-nuisance-header">nuisance partial R\xB2</td></tr>
        ${nuisanceRows}
      ` : ""}
    </table>
  `;
    el.innerHTML = html;
    const descEl = document.getElementById("stats-desc");
    if (descEl) {
      descEl.innerHTML = `
      <h3>Sample</h3>
      <table class="stats-table">
        <tr><td>n (active)</td><td>${FMT.n(n)}</td></tr>
        ${nCensored > 0 ? `<tr><td>censored</td><td>${FMT.n(nCensored)}</td></tr>` : ""}
      </table>
    `;
    }
  }
  var PARAMETRIC_ROWS = (r) => [
    ["slope", FMT.coef(r.slope)],
    ["SE", FMT.coef(r.seSlope)],
    ["t", FMT.stat(r.tSlope)],
    ["p", FMT.pval(r.pSlope)]
  ];
  function buildStatRows(r, key, hasNuisance = false) {
    switch (key) {
      case "ols": {
        const r2Rows = hasNuisance ? [
          ["R\xB2 (full model)", FMT.r2(r.fullModelRSquared)],
          ["adj. R\xB2 (full model)", FMT.r2(r.fullModelAdjRSquared)],
          ["R\xB2 (partial, X)", FMT.r2(r.rSquared)]
        ] : [
          ["R\xB2", FMT.r2(r.rSquared)],
          ["adj. R\xB2", FMT.r2(r.adjRSquared)]
        ];
        return [...PARAMETRIC_ROWS(r), ...r2Rows, ["intercept", FMT.coef(r.intercept)]];
      }
      case "robust":
        return [...PARAMETRIC_ROWS(r), ["intercept", FMT.coef(r.intercept)]];
      case "spearman":
        return [
          ["\u03C1", FMT.stat(r.rho)],
          ["p", FMT.pval(r.pValue)],
          ["slope", FMT.coef(r.slope)],
          ["intercept", FMT.coef(r.intercept)]
        ];
      case "theilsen":
        return [
          ["slope", FMT.coef(r.slope)],
          ["intercept", FMT.coef(r.intercept)],
          ["\u03C4", FMT.stat(r.tau)],
          ["p", FMT.pval(r.pValue)]
        ];
      default:
        return Object.entries(r).filter(([, v2]) => typeof v2 === "number").map(([k, v2]) => [k, FMT.coef(v2)]);
    }
  }

  // src/stats/ols.js
  function ols(x2, y2, nuisance = []) {
    const yFit = nuisance.length ? residualize(y2, nuisance) : y2;
    const n = x2.length;
    const dm = Array.from({ length: n }, (_, i) => [1, x2[i]]);
    const X2 = new Matrix2(dm);
    const Y2 = Matrix2.columnVector(yFit);
    const b = new QrDecomposition2(X2).solve(Y2).getColumn(0);
    const intercept = b[0];
    const slope = b[1];
    const xMean = x2.reduce((s, v2) => s + v2, 0) / n;
    const sxx = x2.reduce((s, v2) => s + (v2 - xMean) ** 2, 0);
    const yMean = yFit.reduce((s, v2) => s + v2, 0) / n;
    const resids = yFit.map((yi, i) => yi - (intercept + slope * x2[i]));
    const ssr = resids.reduce((s, r) => s + r * r, 0);
    const sst = yFit.reduce((s, yi) => s + (yi - yMean) ** 2, 0);
    const rSquared = 1 - ssr / sst;
    const adjRSquared = 1 - (1 - rSquared) * (n - 1) / (n - 2);
    const yMeanOrig = y2.reduce((s, v2) => s + v2, 0) / n;
    const sstOrig = y2.reduce((s, yi) => s + (yi - yMeanOrig) ** 2, 0);
    const fullModelRSquared = 1 - ssr / sstOrig;
    const s2 = ssr / (n - 2);
    const sigma = Math.sqrt(s2);
    const dfResidual = n - 2;
    const diagInv = diagInverse(X2.transpose().mmul(X2).to2DArray());
    const seIntercept = Math.sqrt(diagInv[0] * s2);
    const seSlope = Math.sqrt(diagInv[1] * s2);
    const tSlope = slope / seSlope;
    const tIntercept = intercept / seIntercept;
    return {
      slope,
      intercept,
      rSquared,
      adjRSquared,
      fullModelRSquared,
      seSlope,
      seIntercept,
      tSlope,
      tIntercept,
      pSlope: tPValue(Math.abs(tSlope), dfResidual),
      pIntercept: tPValue(Math.abs(tIntercept), dfResidual),
      residuals: resids,
      n,
      dfResidual,
      xMean,
      sxx,
      sigma
    };
  }

  // src/stats/robust.js
  var TUKEY_C = 4.685;
  function arrayMedian(arr) {
    const s = arr.slice().sort((a, b) => a - b);
    const m = s.length;
    return m % 2 === 0 ? (s[m / 2 - 1] + s[m / 2]) / 2 : s[(m - 1) / 2];
  }
  function bisquareWeights(r, scale2) {
    return r.map((ri) => {
      const u4 = ri / (TUKEY_C * scale2);
      return Math.abs(u4) >= 1 ? 0 : (1 - u4 * u4) ** 2;
    });
  }
  function doWls(dm, y2, w, n, k) {
    const XtWX = Array.from({ length: k }, () => new Array(k).fill(0));
    const XtWy = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < k; j++) {
        XtWy[j] += dm[i][j] * w[i] * y2[i];
        for (let l = 0; l < k; l++) XtWX[j][l] += dm[i][j] * w[i] * dm[i][l];
      }
    }
    return { b: solveLinear(XtWX, XtWy), XtWX };
  }
  function residuals(dm, y2, b) {
    return y2.map((yi, i) => yi - dm[i].reduce((sum2, xij, j) => sum2 + xij * b[j], 0));
  }
  function madScale(r) {
    const s = arrayMedian(r.map(Math.abs)) / 0.6745;
    return s < 1e-10 ? 1e-10 : s;
  }
  function robust(x2, y2, nuisance = []) {
    const n = x2.length;
    const dm = Array.from({ length: n }, (_, i) => [1, x2[i], ...nuisance.map((col) => col[i])]);
    const k = dm[0].length;
    const ones = new Array(n).fill(1);
    let { b } = doWls(dm, y2, ones, n, k);
    let r = residuals(dm, y2, b);
    let scale2 = madScale(r);
    let w = bisquareWeights(r, scale2);
    for (let iter = 0; iter < 20; iter++) {
      const bPrev = b.slice();
      ({ b } = doWls(dm, y2, w, n, k));
      if (b.every((bj, j) => Math.abs(bj - bPrev[j]) <= 1e-4 * (Math.abs(bPrev[j]) + 1e-3))) break;
      r = residuals(dm, y2, b);
      scale2 = madScale(r);
      w = bisquareWeights(r, scale2);
    }
    const { XtWX } = doWls(dm, y2, w, n, k);
    const s2 = scale2 * scale2;
    const diagInv = diagInverse(XtWX);
    const e1 = new Array(k).fill(0);
    e1[1] = 1;
    const covIntSlope = solveLinear(XtWX, e1)[0] * s2;
    const slope = b[1];
    const intercept = b[0];
    const seSlope = Math.sqrt(diagInv[1] * s2);
    const seIntercept = Math.sqrt(diagInv[0] * s2);
    return {
      slope,
      intercept,
      seSlope,
      seIntercept,
      covIntSlope,
      tSlope: slope / seSlope,
      tIntercept: intercept / seIntercept,
      scale: scale2,
      weights: w,
      residuals: r,
      n
    };
  }

  // src/stats/spearman.js
  function spearman(x2, y2) {
    const n = x2.length;
    const rx = rank(x2);
    const ry = rank(y2);
    const rxMean = rx.reduce((s, v2) => s + v2, 0) / n;
    const ryMean = ry.reduce((s, v2) => s + v2, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = rx[i] - rxMean;
      const dy = ry[i] - ryMean;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const rho = num / Math.sqrt(denX * denY);
    const t = rho * Math.sqrt((n - 2) / (1 - rho * rho));
    const pValue = tPValue(Math.abs(t), n - 2);
    const xMean = x2.reduce((s, v2) => s + v2, 0) / n;
    const yMean = y2.reduce((s, v2) => s + v2, 0) / n;
    const sdX = Math.sqrt(x2.reduce((s, v2) => s + (v2 - xMean) ** 2, 0) / (n - 1));
    const sdY = Math.sqrt(y2.reduce((s, v2) => s + (v2 - yMean) ** 2, 0) / (n - 1));
    const slope = sdX > 0 ? rho * sdY / sdX : 0;
    const intercept = yMean - slope * xMean;
    return { rho, pValue, n, slope, intercept };
  }

  // src/stats/theilsen.js
  function arrayMedian2(arr) {
    const s = arr.slice().sort((a, b) => a - b);
    const m = s.length;
    return m % 2 === 0 ? (s[m / 2 - 1] + s[m / 2]) / 2 : s[(m - 1) / 2];
  }
  function tieGroupSizes(arr) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const sizes = [];
    let i = 0;
    while (i < sorted.length) {
      let j = i + 1;
      while (j < sorted.length && sorted[j] === sorted[i]) j++;
      if (j - i > 1) sizes.push(j - i);
      i = j;
    }
    return sizes;
  }
  function normalUpperTail(z) {
    if (z <= 0) return 0.5;
    if (z < 6) {
      const t = 1 / (1 + 0.3275911 * z / Math.SQRT2);
      const erf = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z / 2);
      return (1 - erf) / 2;
    }
    const logPhi = -z * z / 2 - 0.5 * Math.log(2 * Math.PI);
    let sum2 = 0, term = 1 / z;
    for (let k = 0; k <= 60; k++) {
      sum2 += term;
      const next = -term * (2 * k + 1) / (z * z);
      if (Math.abs(next) >= Math.abs(term)) break;
      term = next;
    }
    return Math.exp(logPhi) * sum2;
  }
  function kendall(x2, y2) {
    const n = x2.length;
    const N = n * (n - 1) / 2;
    let S = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        S += Math.sign(x2[j] - x2[i]) * Math.sign(y2[j] - y2[i]);
    const xt = tieGroupSizes(x2);
    const yt = tieGroupSizes(y2);
    const Tx = xt.reduce((s, t) => s + t * (t - 1) / 2, 0);
    const Ty = yt.reduce((s, u4) => s + u4 * (u4 - 1) / 2, 0);
    const tau4 = S / Math.sqrt((N - Tx) * (N - Ty));
    const v0 = n * (n - 1) * (2 * n + 5);
    const vt = xt.reduce((s, t) => s + t * (t - 1) * (2 * t + 5), 0);
    const vu = yt.reduce((s, u4) => s + u4 * (u4 - 1) * (2 * u4 + 5), 0);
    let varS = (v0 - vt - vu) / 18;
    if (n >= 3) {
      const ct3 = xt.reduce((s, t) => s + t * (t - 1) * (t - 2), 0);
      const cu3 = yt.reduce((s, u4) => s + u4 * (u4 - 1) * (u4 - 2), 0);
      varS += ct3 * cu3 / (9 * n * (n - 1) * (n - 2));
    }
    const ct2 = xt.reduce((s, t) => s + t * (t - 1), 0);
    const cu2 = yt.reduce((s, u4) => s + u4 * (u4 - 1), 0);
    varS += ct2 * cu2 / (2 * n * (n - 1));
    const pValue = 2 * normalUpperTail(Math.abs(S) / Math.sqrt(varS));
    return { tau: tau4, pValue };
  }
  function theilSen(x2, y2) {
    const n = x2.length;
    const slopes = [];
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (x2[j] !== x2[i]) slopes.push((y2[j] - y2[i]) / (x2[j] - x2[i]));
    const sortedSlopes = slopes.slice().sort((a, b) => a - b);
    const N = sortedSlopes.length;
    const slope = N % 2 === 0 ? (sortedSlopes[N / 2 - 1] + sortedSlopes[N / 2]) / 2 : sortedSlopes[(N - 1) / 2];
    const intercept = arrayMedian2(y2.map((yi, i) => yi - slope * x2[i]));
    const K = 1.9599639845400536 * Math.sqrt(n * (n - 1) * (2 * n + 5) / 18);
    const C = Math.floor((N - K) / 2);
    let slopeCILow = null, slopeCIHigh = null, interceptCILow = null, interceptCIHigh = null;
    if (C >= 0 && N - C - 1 < N) {
      slopeCILow = sortedSlopes[C];
      slopeCIHigh = sortedSlopes[N - C - 1];
      interceptCILow = arrayMedian2(y2.map((yi, i) => yi - slopeCILow * x2[i]));
      interceptCIHigh = arrayMedian2(y2.map((yi, i) => yi - slopeCIHigh * x2[i]));
    }
    const { tau: tau4, pValue } = kendall(x2, y2);
    return { slope, intercept, tau: tau4, pValue, n, slopeCILow, slopeCIHigh, interceptCILow, interceptCIHigh };
  }

  // src/main.js
  var data = null;
  var columns = [];
  var colMeta = [];
  var MODELS = { ols, robust, spearman, theilsen: theilSen };
  var scatter = null;
  var diagnostics = null;
  var hoveredIndex = null;
  var currentPointColors = null;
  var LOAD_BLANK_DELAY = 250;
  var loadingTimer = null;
  function classifyColumns(data2) {
    if (!data2.length) return [];
    const n = data2.length;
    return Object.keys(data2[0]).map((col) => {
      const values = data2.map((row) => row[col]);
      const numericCount = values.filter((v2) => typeof v2 === "number" && !isNaN(v2)).length;
      const distinctCount = new Set(values.filter((v2) => v2 != null && v2 !== "").map(String)).size;
      const isNumeric = numericCount >= 3;
      const isCategorical = distinctCount <= Math.max(10, n * 0.05);
      const colorType = isCategorical ? "categorical" : isNumeric ? "continuous" : "string";
      return { name: col, isNumeric, colorType };
    });
  }
  async function loadData(url) {
    showError(null);
    setLoading(true, url);
    try {
      data = await fetchData(url);
      colMeta = classifyColumns(data);
      columns = colMeta.filter((c) => c.isNumeric).map((c) => c.name);
      window._allColumns = colMeta.map((c) => c.name);
      return true;
    } catch (err) {
      showError(err.message);
      data = null;
      columns = [];
      return false;
    } finally {
      setLoading(false);
    }
  }
  function render() {
    const state = getState();
    if (!data || !columns.length) {
      showEmptyState(true);
      scatter?.clear();
      diagnostics?.clear();
      updateStats({ modelResult: null, modelKey: state.m });
      return;
    }
    showEmptyState(false);
    const allCols = window._allColumns ?? columns;
    const xColName = columns[state.x] ?? columns[0];
    const yColName = columns[state.y] ?? columns[1] ?? columns[0];
    const hColName = state.h != null ? allCols[state.h] : null;
    const groupColorType = hColName ? colMeta.find((c) => c.name === hColName)?.colorType ?? "categorical" : "categorical";
    const censored = new Set(state.c);
    const nuisanceNames = !RANK_MODELS.has(state.m) && state.n.length ? state.n.map((i) => columns[i]).filter(Boolean) : [];
    const nuisClash = nuisanceNames.filter((n) => n === xColName || n === yColName);
    if (nuisClash.length) {
      showError(`Warning: "${nuisClash.join('", "')}" is selected as both a model variable and a nuisance covariate \u2014 results will be misleading.`);
    } else {
      showError(null);
    }
    const activeIndices = data.map((_, i) => i).filter((i) => !censored.has(i) && Number.isFinite(data[i][xColName]) && Number.isFinite(data[i][yColName]) && nuisanceNames.every((col) => Number.isFinite(data[i][col])));
    if (!activeIndices.length) {
      showEmptyState(false);
      return;
    }
    const xAll = data.map((row) => row[xColName]);
    const yAll = data.map((row) => row[yColName]);
    const xActive = activeIndices.map((i) => xAll[i]);
    let yActive = activeIndices.map((i) => yAll[i]);
    const yActiveOrig = yActive.slice();
    let isResidualized = false;
    let nuisancePartialR2 = [];
    let nNuisance = 0;
    if (nuisanceNames.length) {
      const nuisData = nuisanceNames.map((col) => activeIndices.map((i) => data[i][col]));
      try {
        const result = residualizeWithStats(yActive, nuisData);
        yActive = result.residuals;
        nuisancePartialR2 = result.partialR2;
        isResidualized = true;
        nNuisance = nuisanceNames.length;
      } catch (e) {
        showError(`Residualization failed: ${e.message}`);
        return;
      }
    }
    let displayX = xActive;
    let displayY = yActive;
    if (state.m === "spearman") {
      displayX = rank(xActive);
      displayY = rank(yActive);
    }
    const modelFn = MODELS[state.m] ?? ols;
    let modelResult;
    try {
      modelResult = modelFn(displayX, displayY);
    } catch (err) {
      showError(`Model error: ${err.message}`);
      return;
    }
    if (isResidualized && state.m === "ols" && modelResult.residuals) {
      const n = yActiveOrig.length;
      const yMeanOrig = yActiveOrig.reduce((s, v2) => s + v2, 0) / n;
      const sstOrig = yActiveOrig.reduce((s, yi) => s + (yi - yMeanOrig) ** 2, 0);
      const ssr = modelResult.residuals.reduce((s, r) => s + r * r, 0);
      const fmR2 = 1 - ssr / sstOrig;
      const dfFull = n - 2 - nNuisance;
      modelResult = {
        ...modelResult,
        fullModelRSquared: fmR2,
        fullModelAdjRSquared: 1 - (1 - fmR2) * (n - 1) / dfFull
      };
    }
    const activeDisplayY = new Map(activeIndices.map((origIdx, ai) => [origIdx, displayY[ai]]));
    const activeDisplayX = new Map(activeIndices.map((origIdx, ai) => [origIdx, displayX[ai]]));
    const activeWeights = state.m === "robust" && modelResult.weights ? new Map(activeIndices.map((origIdx, ai) => [origIdx, modelResult.weights[ai]])) : null;
    const points = data.map((row, i) => {
      const isCensored = censored.has(i);
      const dispX = activeDisplayX.get(i) ?? row[xColName];
      const dispY = activeDisplayY.get(i) ?? row[yColName];
      return {
        index: i,
        displayX: dispX,
        displayY: dispY,
        originalX: row[xColName],
        originalY: row[yColName],
        group: hColName ? row[hColName] : null,
        censored: isCensored,
        weight: activeWeights ? activeWeights.get(i) ?? null : null
      };
    });
    const active = points.filter((p) => !p.censored);
    const colorOf = buildColorOf(active, groupColorType, readPalette().point);
    currentPointColors = activeIndices.map((i) => colorOf(points[i]));
    scatter.update({
      points,
      modelResult,
      xLabel: xColName,
      yLabel: isResidualized ? `Residualized ${yColName}` : yColName,
      modelKey: state.m,
      groupColorType,
      groupLabel: hColName,
      customXTicks: state.xl,
      customYTicks: state.yl,
      onPointClick: (index) => toggleCensor(index),
      onPointHover: (index) => {
        hoveredIndex = index;
        updateDiagnostics(modelResult, activeIndices);
      }
    });
    updateStats({
      modelResult,
      modelKey: state.m,
      xLabel: xColName,
      yLabel: yColName,
      n: activeIndices.length,
      nCensored: censored.size,
      nuisanceNames,
      nuisancePartialR2
    });
    const diagEl = document.getElementById("diag-plots");
    const hasDiag = (state.m === "ols" || state.m === "robust") && modelResult?.residuals?.length;
    if (diagEl) diagEl.classList.toggle("hidden", !hasDiag);
    updateDiagnostics(modelResult, activeIndices);
    syncControls(state);
  }
  function updateDiagnostics(modelResult, activeIndices) {
    const state = getState();
    if ((state.m === "ols" || state.m === "robust") && modelResult?.residuals?.length) {
      diagnostics.update({
        residuals: modelResult.residuals,
        activeIndices,
        hoveredIndex,
        pointColors: currentPointColors
      });
    } else {
      diagnostics?.clear();
    }
  }
  function toggleCensor(index) {
    const state = getState();
    const c = new Set(state.c);
    if (c.has(index)) c.delete(index);
    else c.add(index);
    setState({ c: [...c].sort((a, b) => a - b) });
  }
  function showEmptyState(show) {
    const el = document.getElementById("empty-state");
    if (el) el.classList.toggle("hidden", !show);
  }
  function showError(msg) {
    const banner = document.getElementById("error-banner");
    const msgEl = document.getElementById("error-message");
    if (!banner || !msgEl) return;
    if (msg) {
      msgEl.textContent = msg;
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }
  function setLoading(on, url) {
    const btn = document.getElementById("load-btn");
    if (btn) {
      btn.disabled = on;
      btn.textContent = on ? "Loading\u2026" : "Load";
    }
    if (on) {
      showEmptyState(false);
      document.body.style.cursor = "wait";
      loadingTimer = setTimeout(() => {
        const msgEl = document.getElementById("loading-message");
        if (msgEl) msgEl.textContent = `Loading data from ${url}`;
        document.getElementById("loading-state")?.classList.remove("hidden");
      }, LOAD_BLANK_DELAY);
    } else {
      clearTimeout(loadingTimer);
      loadingTimer = null;
      document.body.style.cursor = "";
      document.getElementById("loading-state")?.classList.add("hidden");
    }
  }
  function toggleHelp() {
    const modal = document.getElementById("help-modal");
    if (!modal) return;
    if (modal.open) modal.close();
    else modal.showModal();
  }
  function setupKeyboard() {
    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
      if (e.key === "?") {
        toggleHelp();
        return;
      }
      const state = getState();
      const nCols = columns.length;
      if (!nCols) return;
      const MODEL_KEYS = ["ols", "robust", "spearman", "theilsen"];
      const mIdx = MODEL_KEYS.indexOf(state.m);
      switch (e.key) {
        case "j":
          setState({ y: Math.min(state.y + 1, nCols - 1) });
          break;
        case "k":
          setState({ y: Math.max(state.y - 1, 0) });
          break;
        case "u":
          setState({ x: Math.max(state.x - 1, 0) });
          break;
        case "i":
          setState({ x: Math.min(state.x + 1, nCols - 1) });
          break;
        case "o":
          setState({ m: MODEL_KEYS[Math.max(mIdx - 1, 0)] });
          break;
        case "p":
          setState({ m: MODEL_KEYS[Math.min(mIdx + 1, MODEL_KEYS.length - 1)] });
          break;
        case "c":
          setState({ c: [] });
          break;
      }
    });
  }
  function setupFileDrop() {
    const overlay = document.getElementById("drop-overlay");
    const urlInput = document.getElementById("source-url");
    let dragDepth = 0;
    document.addEventListener("dragenter", (e) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      dragDepth++;
      overlay?.classList.add("visible");
    });
    document.addEventListener("dragleave", () => {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) overlay?.classList.remove("visible");
    });
    document.addEventListener("dragover", (e) => e.preventDefault());
    document.addEventListener("drop", async (e) => {
      e.preventDefault();
      dragDepth = 0;
      overlay?.classList.remove("visible");
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      let key;
      try {
        key = await storeLocalFile(file);
      } catch (err) {
        showError(err.message);
        return;
      }
      if (urlInput) urlInput.value = file.name;
      setState({ src: key, x: 0, y: 1, m: "ols", n: [], c: [], h: null });
    });
  }
  function exportFilename(ext) {
    const state = getState();
    const xName = columns[state.x] ?? `col${state.x ?? "x"}`;
    const yName = columns[state.y] ?? `col${state.y ?? "y"}`;
    return `scatterize-${xName}-vs-${yName}.${ext}`;
  }
  var _fontBase64 = null;
  async function fetchFontBase64() {
    if (_fontBase64) return _fontBase64;
    const resp = await fetch("fonts/LeagueSpartan-VF.woff2");
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    _fontBase64 = btoa(binary);
    return _fontBase64;
  }
  function downloadSVG(svgEl, filename) {
    const clone = svgEl.cloneNode(true);
    const blob = new Blob(
      ['<?xml version="1.0" encoding="UTF-8"?>\n', new XMLSerializer().serializeToString(clone)],
      { type: "image/svg+xml" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function downloadPNG(svgEl, filename) {
    const scale2 = 2;
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const fontBase64 = await fetchFontBase64();
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("width", width);
    clone.setAttribute("height", height);
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `@font-face { font-family: "League Spartan"; src: url("data:font/woff2;base64,${fontBase64}") format("woff2"); font-weight: 100 900; }`;
    clone.insertBefore(style, clone.firstChild);
    const svgStr = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width * scale2;
        canvas.height = height * scale2;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale2, scale2);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
          resolve();
        }, "image/png");
      };
      img.src = url;
    });
  }
  function setupShareModal() {
    const shareBtn = document.getElementById("share-btn");
    const modal = document.getElementById("share-modal");
    if (!shareBtn || !modal) return;
    shareBtn.addEventListener("click", () => {
      const state = getState();
      const isParametric = state.m === "ols" || state.m === "robust";
      const isLocal = state.src?.startsWith("local:");
      document.getElementById("svg-filename").value = exportFilename("svg");
      document.getElementById("svg-diag-filename").value = exportFilename("svg").replace(".svg", "-diagnostics.svg");
      document.getElementById("png-filename").value = exportFilename("png");
      document.getElementById("png-diag-filename").value = exportFilename("png").replace(".png", "-diagnostics.png");
      document.getElementById("svg-diag-row").hidden = !isParametric;
      document.getElementById("png-diag-row").hidden = !isParametric;
      const urlInput = document.getElementById("share-url");
      const copyBtn = document.getElementById("copy-url-btn");
      const localNote = document.getElementById("local-note");
      if (urlInput) {
        urlInput.value = window.location.href;
        urlInput.disabled = isLocal;
      }
      if (copyBtn) copyBtn.disabled = isLocal;
      if (localNote) localNote.hidden = !isLocal;
      modal.showModal();
    });
    modal.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) e.currentTarget.close();
    });
    modal.addEventListener("cancel", (e) => e.currentTarget.close());
    document.getElementById("svg-download-btn")?.addEventListener("click", () => {
      const svgEl = document.getElementById("scatter-svg");
      if (!svgEl) return;
      const raw = document.getElementById("svg-filename")?.value || exportFilename("svg");
      downloadSVG(svgEl, raw.endsWith(".svg") ? raw : `${raw}.svg`);
    });
    document.getElementById("svg-diag-download-btn")?.addEventListener("click", () => {
      const svgEl = document.getElementById("diag-combined");
      if (!svgEl) return;
      const raw = document.getElementById("svg-diag-filename")?.value || exportFilename("svg").replace(".svg", "-diagnostics.svg");
      downloadSVG(svgEl, raw.endsWith(".svg") ? raw : `${raw}.svg`);
    });
    document.getElementById("png-download-btn")?.addEventListener("click", async () => {
      const svgEl = document.getElementById("scatter-svg");
      if (!svgEl) return;
      const raw = document.getElementById("png-filename")?.value || exportFilename("png");
      await downloadPNG(svgEl, raw.endsWith(".png") ? raw : `${raw}.png`);
    });
    document.getElementById("png-diag-download-btn")?.addEventListener("click", async () => {
      const svgEl = document.getElementById("diag-combined");
      if (!svgEl) return;
      const raw = document.getElementById("png-diag-filename")?.value || exportFilename("png").replace(".png", "-diagnostics.png");
      await downloadPNG(svgEl, raw.endsWith(".png") ? raw : `${raw}.png`);
    });
    document.getElementById("copy-url-btn")?.addEventListener("click", () => {
      const btn = document.getElementById("copy-url-btn");
      navigator.clipboard.writeText(window.location.href).then(() => {
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = "Copy";
        }, 1500);
      });
    });
  }
  document.addEventListener("DOMContentLoaded", async () => {
    scatter = createScatterplot(
      document.getElementById("scatter-svg"),
      document.getElementById("overlay-svg")
    );
    const combinedSvg = document.getElementById("diag-combined");
    const diagOverlay = document.getElementById("diag-overlay");
    diagnostics = combinedSvg ? createDiagnostics(combinedSvg, diagOverlay, {
      onQQHover: (index) => scatter.highlightPoint(index)
    }) : { update: () => {
    }, clear: () => {
    } };
    bindControls();
    setupKeyboard();
    setupShareModal();
    setupFileDrop();
    onStateChange(async (state2) => {
      const urlInput2 = document.getElementById("source-url");
      if (urlInput2) {
        urlInput2.value = state2.src ? state2.src.startsWith("local:") ? localFileName(state2.src) : state2.src : "";
      }
      const currentSrc = data ? window._loadedSrc ?? null : null;
      if (state2.src && state2.src !== currentSrc) {
        const ok = await loadData(state2.src);
        if (ok) {
          window._loadedSrc = state2.src;
          populateControls(colMeta, state2);
        }
      } else if (!state2.src && data) {
        data = null;
        columns = [];
        window._loadedSrc = null;
      }
      render();
    });
    let _resizeBusy = false;
    let _resizePending = false;
    function renderOnResize() {
      if (_resizeBusy) {
        _resizePending = true;
        return;
      }
      _resizeBusy = true;
      render();
      _resizeBusy = false;
      if (_resizePending) {
        _resizePending = false;
        setTimeout(renderOnResize, 0);
      }
    }
    window.addEventListener("resize", renderOnResize);
    const state = getState();
    const urlInput = document.getElementById("source-url");
    if (urlInput && state.src) {
      urlInput.value = state.src.startsWith("local:") ? localFileName(state.src) : state.src;
    }
    if (state.src) {
      const ok = await loadData(state.src);
      if (ok) {
        window._loadedSrc = state.src;
        populateControls(colMeta, state);
      }
    }
    render();
    document.getElementById("load-btn")?.addEventListener("click", () => {
      const url = document.getElementById("source-url")?.value?.trim();
      if (!url) return;
      setState({ src: url, x: 0, y: 1, m: "ols", n: [], c: [], h: null });
    });
    document.getElementById("source-url")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("load-btn")?.click();
    });
    document.getElementById("error-close")?.addEventListener("click", () => showError(null));
    document.getElementById("help-btn")?.addEventListener("click", toggleHelp);
    document.getElementById("help-modal")?.addEventListener("click", (e) => {
      if (e.target === e.currentTarget) e.currentTarget.close();
    });
  });
})();
/*! Bundled license information:

papaparse/papaparse.min.js:
  (* @license
  Papa Parse
  v5.5.3
  https://github.com/mholt/PapaParse
  License: MIT
  *)
*/
