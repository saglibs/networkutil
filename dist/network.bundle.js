(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Core = require('./src/core');

Core.extend(Core, require('./src/iterator'));

Core.root.H = Core;

module.exports = Core;
},{"./src/core":6,"./src/iterator":10}],2:[function(require,module,exports){
/*
 * MiniCore module
 *
 * Provides a simplest set of some basic utils.
 * Should be used internally.
 */

var Mini = {};

var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
var isArrayLike = function(collection) {
    if (collection === null || collection === undefined) return 0;
    var length = collection['length'];
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
};

/**
 * Check if something is array-like
 *
 * @param collection anything to check
 * @return {boolean}
 * @type {isArrayLike}
 */
Mini.isArrayLike = isArrayLike;

/**
 * Iterates on an array. Fast and should not be used on objects.
 *
 * @param {Array} array
 * @param {Function} iteratee
 * @returns {Array} result map
 */
Mini.arrayEach = function(array, iteratee) {
    var length = array.length;

    if (isArrayLike(array) && length > 0) {
        var result = [];
        var n = length;
        length++;
        while (--length) {
            result[n - length] = iteratee(array[n - length]);
        }
        return result;
    }
};

Mini.hiddenProperty = function(v) {
    return {
        value: v,
        configurable: false,
        enumerable: false,
        writable: true
    };
};

module.exports = Mini;
},{}],3:[function(require,module,exports){
/*
 * ResultSet: Array or Element, they share the same filter/checker
 */

/**
 * Abstract ResultSet Module
 *
 * @static
 * @memberof H
 * @type {Object}
 */
var ARS = {};

var Mini = require('../mini');
var H = require('./shims');

ARS.modules = {};
ARS.checkTargets = {};
ARS.checkers = {};

var MODULE = '__Module__';

/**
 * Register a ResultSet channel
 * @param {String} identifier ResultSet channel identifier
 * @param {Array} targets ResultSet element prototypes, should always contains Array.prototype
 * @param {Function} valuePrechecker value validity prechecker function
 */
ARS.registerChannel = function(identifier, targets, valuePrechecker) {
    ARS.modules[identifier] = {};
    ARS.checkTargets[identifier] = targets;
    ARS.checkers[identifier] = valuePrechecker;

    Mini.arrayEach(targets || [], function(target) {
        if (!target[MODULE]) {
            H.addProperty(target, MODULE, Mini.hiddenProperty(MODULE));
        }
    });
};

/**
 * Inner preCheck function. used to check validity of values
 *
 * @param {*} object value to check
 * @returns {boolean}
 */
function preCheck(object) {
    return !!(ARS.checkers[object[MODULE] || ""] || function() {})(object);
}

/**
 * Register ResultSet process functions.
 *
 * TODO: integrate ResultSet.registerComponent into this function (maybe some dependency injection?)
 *
 * @param {String} channel channel identifier
 * @param {String} name target function mount point
 * @param {Function} funcGen function generator, which produces a function with checker
 * function injected. This provides ability of checking content validity to target functions.
 */
ARS.registerChannelFunction = function(channel, name, funcGen) {
    Mini.arrayEach(ARS.checkTargets[channel] || [], function(target) {
        if (target[name]) {
            //exist, do nothing. cuz preChecker is relative to current module
        } else {
            //not exist, add func to target
            // target[name] = funcGen(ARS.checkers[channel]);
            H.addProperty(target, name, Mini.hiddenProperty(funcGen(preCheck)));
        }
    });
};

/**
 * Wrapper function generator.
 *
 * @param {String} identifier channel identifier
 * @returns {wrap} wrapper function to wrap any value into specific ResultSet form
 */
ARS.wrapperGen = function(identifier) {
    //assuming prototype exists
    function transform(obj) {
        if (obj.prototype && obj.prototype.__Module__ && obj.prototype.__Module__ !== identifier) {
            obj.prototype.__Module__ = identifier;
        }
        if (obj.__proto__ && obj.__proto__.__Module__ && obj.__proto__.__Module__ !== identifier) {
            obj.__proto__.__Module__ = identifier;
        }
    }

    function transformArray(obj) {
        if (Mini.isArrayLike(obj)) {
            Mini.arrayEach(obj, transformArray);
        }
        transform(obj, identifier);
    }

    /**
     * Wrap an object to ResultSet
     *
     * @static
     * @param {Array|Object} v anything to wrap
     * @returns {*} wrapped ResultSet object
     */
    function wrap(v) {
        transformArray(v);
        return v;
    }

    return wrap;
};

module.exports = ARS;
},{"../mini":2,"./shims":15}],4:[function(require,module,exports){
var A = {};

/**
 * Reads a 32bit integer from the specific offset in a Uint8Array (big or little endian)
 *
 * @static
 * @memberof H
 * @param {Uint8Array} byteView uint8array object
 * @param {Number} [offset] byte offset
 * @param {boolean} [littleEndian] flag of is or is not little endian
 * @returns {Number}
 * @example
 *
 * H.readInt32(uint8, 0, 1)
 */
A.readInt32 = function(byteView, offset, littleEndian) {
    var a0, a1, a2, a3;
    a0 = byteView[offset];
    a1 = byteView[offset + 1];
    a2 = byteView[offset + 2];
    a3 = byteView[offset + 3];
    if (littleEndian) {
        a3 = (a3 << 24) >>> 0;
        a2 = a2 << 16;
        a1 = a1 << 8;
    } else {
        a0 = (a0 << 24) >>> 0;
        a1 = a1 << 16;
        a2 = a2 << 8;
    }
    return a3 + a2 + a1 + a0;
};

/**
 * Reads a 16bit integer from the specific offset in a Uint8Array (big or little endian)
 *
 * @static
 * @memberof H
 * @param {Uint8Array} byteView uint8array object
 * @param {Number} [offset] byte offset
 * @param {boolean} [littleEndian] flag of is or is not little endian
 * @returns {Number}
 * @example
 *
 * H.readInt16(uint8, 0, 1)
 */
A.readInt16 = function(byteView, offset, littleEndian) {
    var a0, a1;
    a0 = byteView[offset];
    a1 = byteView[offset + 1];
    if (littleEndian) {
        a1 = a1 << 8;
    } else {
        a0 = a0 << 8
    }
    return a0 + a1;
};

var native = new Int8Array(new Int16Array([1]).buffer)[0] == 1;
/**
 * Reads a 32bit float from the specific offset in a Uint8Array (big or little endian)
 *
 * @static
 * @memberof H
 * @param {Uint8Array} byteView uint8array object
 * @param {Number} [offset] byte offset
 * @param {boolean} [littleEndian] flag of is or is not little endian
 * @returns {Number}
 * @example
 *
 * H.readFloat32(uint8, 0, 1)
 */
A.readFloat32 = function(byteView, offset, littleEndian) {
    var b0, b1, b2, b3, tb1;
    var sign, exponent, mantissa;
    if (littleEndian === undefined) littleEndian = native;

    if (littleEndian) {
        b0 = byteView[offset + 3];
        b1 = byteView[offset + 2];
        b2 = byteView[offset + 1];
        b3 = byteView[offset];
    } else {
        b0 = byteView[offset];
        b1 = byteView[offset + 1];
        b2 = byteView[offset + 2];
        b3 = byteView[offset + 3];
    }

    //to prevent gc
    tb1 = b0 >> 7;
    sign = 1 - (2 * tb1);

    b0 = b0 << 1;
    tb1 = b1 >> 7;
    b0 = (b0 & 0xff);
    exponent = (b0 | tb1) - 127;

    tb1 = b1 & 0x7f;
    tb1 = tb1 << 16;
    b2 = b2 << 8;
    mantissa = tb1 | b2 | b3;

    if (exponent === 128) {
        if (mantissa !== 0) {
            return NaN;
        } else {
            return sign * Infinity;
        }
    }

    if (exponent === -127) { // Denormalized
        return sign * mantissa * Math.pow(2, -126 - 23);
    }

    return sign * (1 + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
};

module.exports = A;
},{}],5:[function(require,module,exports){
var C = require('./detect');

/*
 * Cef Interactions
 */
//noinspection JSUnresolvedVariable
var cefQuery = C.root.cefQuery || function() {
        if (this.debug) console.log(arguments[0]);
    };

/**
 * Call Cef
 *
 * @static
 * @memberof H
 * @param {string} [req] request string
 * @param {boolean} [persistent]
 * @param {Function} [onsuccess] success callback
 * @param {Function} [onfailure] failed callback
 * @returns {undefined}
 * @example
 *
 * H.callCef("selectItem:1", false, H.noop(), H.noop())
 */
C.callCef = function(req, persistent, onsuccess, onfailure) {
    return cefQuery({
        request: req || "",
        persistent: !!persistent,
        onSuccess: onsuccess || function(response) {},
        onFailure: onfailure || function(err_code, err_msg) {}
    })
};

module.exports = C;
},{"./detect":7}],6:[function(require,module,exports){
var _ = require('lodash/core');

require('./raf');

var Detect = require('./detect');
var StackTrace = require('./stacktrace');
var ArrayBufferOp = require('./arraybuffer');
var CefInteractions = require('./cef_interactions');
var Maths = require('./math');
var Objects = require('./object');
var Storage = require('./storage');
var Tester = require('./testers');
var UrlUtils = require('./urlutils');
var Uuids = require('./uuid');
var Events = require('./event');
// var Iterator = require('./iterator');
var Shims = require('./shims');
var ARS = require('./abstractresultset');
var RS = require('./resultset');

var C = {};

_.extend(C, _);
_.extend(C, Detect);
_.extend(C, StackTrace);
_.extend(C, ArrayBufferOp);
_.extend(C, CefInteractions);
_.extend(C, Maths);
_.extend(C, Objects);
_.extend(C, Storage);
_.extend(C, Tester);
_.extend(C, UrlUtils);
_.extend(C, Uuids);
_.extend(C, Events);
// _.extend(C, Iterator);
_.extend(C, Shims);
_.extend(C, RS);

C.abstraceResultSet = ARS;

C.noop = function() {
    return function() {};
};

C.now = Date.now;

/*
 * jQuery Shim
 */
//noinspection JSUnresolvedVariable
if (C.root.jQuery) {
    //noinspection JSUnresolvedVariable,JSUnusedGlobalSymbols
    C.root.jQuery.fn.extend({
        slideLeftHide: function( speed, callback ) {
            //noinspection JSUnresolvedFunction
            this.animate( {
                width: "hide",
                paddingLeft: "hide",
                paddingRight: "hide",
                marginLeft: "hide",
                marginRight: "hide"
            }, speed, callback);
        },
        slideLeftShow: function( speed, callback ) {
            //noinspection JSUnresolvedFunction
            this.animate( {
                width: "show",
                paddingLeft: "show",
                paddingRight: "show",
                marginLeft: "show",
                marginRight: "show"
            }, speed, callback);
        }
    });
}

//noinspection JSUnusedGlobalSymbols
C.extend(String.prototype, {
    replaceAll: function(s1,s2){
        return this.replace(new RegExp(s1,"gm"),s2);
    }
});

/**
 * Produce a random string in a fixed size. Output size is 16 by default.
 *
 * @static
 * @memberof H
 * @param {Number} [size] length of target string
 * @returns {string}
 */
C.nonceStr = function(size) {
    var s = "";
    var c = "0123456789qwertyuiopasdfghjklzxcvbnm";
    for (var i = 0; i < size || 16; i++) {
        s += c[parseInt(36 * Math.random())];
    }
    return s;
};

/**
 * Clear timer
 *
 * @static
 * @memberof H
 * @param timer timer to clear
 */
C.clearTimer = function(timer) {
    if (timer) {
        clearInterval(timer);
    }
};

module.exports = C;
},{"./abstractresultset":3,"./arraybuffer":4,"./cef_interactions":5,"./detect":7,"./event":9,"./math":11,"./object":12,"./raf":13,"./resultset":14,"./shims":15,"./stacktrace":16,"./storage":17,"./testers":18,"./urlutils":19,"./uuid":20,"lodash/core":23}],7:[function(require,module,exports){
/*
 * Env Detection Module
 */

var C = {};

C.isArrayLike = require('lodash/isArrayLike');

/**
 * Check if a value can be parsed to an integer
 *
 * @static
 * @memberof H
 * @param {*} i value to be checked
 * @returns {boolean}
 */
C.isInteger = function(i) {
    return  /^-?\d+$/.test(i + "") || /^(-?\d+)e(\d+)$/.test(i + "");
};

/**
 * Checks if a value can be parsed into a float.
 *
 * @static
 * @memberof H
 * @param {*} v value to be checked
 * @returns {boolean}
 */
C.isFloat = function(v) {
    return /^(-?\d+)(\.\d+)?$/.test(v + "") || /^(-?\d+)(\.\d+)?e(-?\d+)$/.test(v + "");
};

var processObj = undefined;

try {
    processObj = eval('process');
} catch (e) {}

/**
 * Flag of is in node.js environment or not.
 *
 * @static
 * @memberof H
 * @type {boolean}
 */
C.isNodejs = 'object' === typeof processObj && Object.prototype.toString.call(processObj) === '[object process]';

C.root = {};

try {
    //noinspection JSUnresolvedVariable
    C.root = GLOBAL;
} catch (e) {
    C.root = window;
}

//noinspection JSUnresolvedVariable
// C.root = C.isNodejs ? GLOBAL : window;

//noinspection JSUnresolvedVariable
var root = C.root;

//noinspection JSUnresolvedVariable
root.navigator = root.navigator || {userAgent: ""};

C.root = root;

/**
 * Get IE version.
 * Returns 0 in non-IE environment.
 *
 * @static
 * @memberof H
 * @returns {number}
 */
C.getIE = function() {
    var MSIEs = navigator.userAgent.split('MSIE ')[1] || "0";
    var DNETs = navigator.userAgent.split('rv:')[1] || "0";

    MSIEs = MSIEs.split(".")[0];
    DNETs = DNETs.split(".")[0];

    var msie = ~~MSIEs;
    var dnet = ~~DNETs;

    if (msie != 0) {
        return msie;
    }
    if (dnet != 0) {
        return dnet;
    }

    return 0;
};

/**
 * Check if is in IE or is in a specified version of IE.
 *
 * @static
 * @memberof H
 * @param {Number} [v] version to check
 * @returns {boolean}
 */
C.isIE = function(v) {
    if (v !== undefined) {
        return C.getIE() == v;
    } else {
        return C.getIE() !== 0;
    }
};

/**
 * Flag of is in IE.
 *
 * @static
 * @memberof H
 * @type {boolean}
 */
C.likeIE = !!C.getIE();

/**
 * Flag of is in browsers on iPhone.
 *
 * @static
 * @memberof H
 * @type {boolean}
 */
C.isiPhone = navigator.userAgent.indexOf('iPhone') !== -1;

/**
 * Flag of is in browsers of Lollipop systems
 * @type {boolean}
 */
C.isLollipop = navigator.userAgent.indexOf('Android 5.') !== -1;

//root.hasOwnProperty shims
if (!root.hasOwnProperty) {
    root.hasOwnProperty = function(p) {
        //Note: in IE<9, p cannot be a function (for window)
        return !!root[p];
    };
}

/**
 * Check if canvas drawing is supported in current browser.
 *
 * @static
 * @memberof H
 * @returns {boolean}
 */
C.isCanvasSupported = function () {
    if (C.isNodejs) return false;
    var canvas = document.createElement('canvas');
    return root.hasOwnProperty("__cv") ? root.__cv : root.__cv = !!(canvas.getContext && canvas.getContext('2d'));
};

/**
 * Check if webgl drawing is supported in current browser.
 *
 * @static
 * @memberof H
 * @returns {boolean}
 */
C.isWebGLSupported = function () {
    if (C.isNodejs) return false;
    var canvas = document.createElement('canvas');
    return root.hasOwnProperty("__gl") ? root.__gl : root.__gl = !!(root['WebGLRenderingContext'] && canvas.getContext('webgl'));
};

C.isCanvasSupported();
C.isWebGLSupported();

/**
 * Language string
 *
 * @static
 * @memberof H
 * @type {string}
 */
C.language = C.isNodejs ? "" : (navigator.language || navigator['browserLanguage'] || "").toLowerCase();

module.exports = C;
},{"lodash/isArrayLike":24}],8:[function(require,module,exports){
/*
 * String Encoding
 * Binary Operation
 * String Convertion
 */
var ES = {};

/*
 * Possible input
 *
 * 1 ArrayBuffer of raw data bytes
 * 2 Array of raw data bytes
 * 3 Array of char codes (UTF-16)
 * 4 Raw data string
 * 5 Unicode String
 *
 * Possible output
 *
 * 1 ArrayBuffer of raw data bytes
 * 2 Array of raw data bytes
 * 3 Array of char codes (UTF-16)
 * 4 String of raw data
 * 5 Unicode String
 */

var B10000000 = 0x80;
var B11000000 = 0xC0;
var B11100000 = 0xE0;
var B11110000 = 0xF0;
var B11111000 = 0xF8;
var B11111100 = 0xFC;
//noinspection JSUnusedLocalSymbols
var B11111110 = 0xFE;
var B00000001 = 0x01;
var B00000011 = 0x03;
var B00000111 = 0x07;
var B00001111 = 0x0F;
var B00011111 = 0x1F;
var B00111111 = 0x3F;
//noinspection JSUnusedLocalSymbols
var B01111111 = 0x7F;
var B11111111 = 0xFF;

/*
 * Used for ArrayBuffer extension
 */
//function allocByteArray(length, isBuffer) {
//    if (isBuffer) {
//        return new Int8Array(length);
//    } else {
//        return new Array(length);
//    }
//}
//
//function allocIntArray(length, isBuffer) {
//    if (isBuffer) {
//        return new Int32Array(length);
//    } else {
//        return new Array(length);
//    }
//}

/**
 * Unicode Int Array -> Unicode String
 *
 * @static
 * @memberof H
 * @param {Array|ArrayBuffer|Uint8Array} ar unicode int array or arraybuffer
 * @returns {string} unicode string
 */
function unicodeIntArrayToString(ar) {
    if (ar instanceof ArrayBuffer) {
        ar = new Uint8Array(ar);
    }
    var result = "";
    var l = ar.byteLength || ar.length;
    var length = ar.byteLength || ar.length;
    for (l += 1; --l;) {
        result += String.fromCharCode(ar[length - l]);
    }
    return result;
}

/**
 * Unicode String -> Unicode Int Array
 *
 * @static
 * @memberof H
 * @param {String} str unicode string (including ascii string)
 * @returns {Array} unicode int array
 */
function stringToUnicodeIntArray(str) {
    var length = str.length;
    var result = new Array(length);
    for (length += 1; --length;) {
        result[length - 1] = str.charCodeAt(length - 1);
    }
    return result;
}

/**
 * Utf16 String -> Byte Array (represented in UTF-8)
 *
 * @static
 * @memberof H
 * @param {String} str unicode string
 * @returns {Array} utf-8 byte array
 */
function stringToUtf8ByteArray(str) {
    var out = [], l = str.length;
    var n = str.length;
    for (l++; --l;) {
        var i = n - l;
        var c = str.charCodeAt(i);
        if (c < 0x80) {
            out[out.length] = c;
        } else if (c < 0x800) {
            out[out.length] = 0xc0 | (c >> 6);
            out[out.length] = 0x80 | (c & 0x3f);
        } else if (c < 0xd800 || c >= 0xe000) {
            out[out.length] = 0xe0 | (c >> 12);
            out[out.length] = 0x80 | ((c >> 6) & 0x3f);
            out[out.length] = 0x80 | (c & 0x3f);
        } else {
            // surrogate pair
            --l;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            c = 0x10000 + (((c & 0x3ff) << 10)
                | (str.charCodeAt(i) & 0x3ff));
            out[out.length] = 0xf0 | (c >> 18);
            out[out.length] = 0x80 | ((c >> 12) & 0x3f);
            out[out.length] = 0x80 | ((c >> 6) & 0x3f);
            out[out.length] = 0x80 | (c & 0x3f);
        }
    }
    return out;
}

/**
 * Utf16 String -> ArrayBuffer (Uint8Array) representing UTF-8
 *
 * @static
 * @memberof H
 * @param {String} str utf-16 string
 * @return {Uint8Array} utf-8 arraybuffer
 */
function stringToArrayBuffer(str) {
    var byteLength = str.length * 3;
    var isString = typeof str == 'string';
    var out = new Uint8Array(byteLength);
    var pc = 0;
    for (var i = 0; i < str.length; i++) {
        var c = isString ? str.charCodeAt(i) : str[i];
        if (c < 0x80) {
            out[out.length] = c;
            pc++;
        } else if (c < 0x800) {
            out[out.length] = 0xc0 | (c >> 6);
            out[out.length] = 0x80 | (c & 0x3f);
            pc += 2;
        } else if (c < 0xd800 || c >= 0xe000) {
            out[out.length] = 0xe0 | (c >> 12);
            out[out.length] = 0x80 | ((c >> 6) & 0x3f);
            out[out.length] = 0x80 | (c & 0x3f);
            pc += 3;
        } else {
            // surrogate pair
            --l;
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            c = 0x10000 + (((c & 0x3ff)<<10) | (c & 0x3ff));
            out[out.length] = 0xf0 | (c >> 18);
            out[out.length] = 0x80 | ((c >> 12) & 0x3f);
            out[out.length] = 0x80 | ((c >> 6) & 0x3f);
            out[out.length] = 0x80 | (c & 0x3f);
            pc += 4;
        }
    }
    if (ArrayBuffer.prototype.slice) {
        return out.slice(0, pc);
    } else {
        var output = new Uint8Array(pc);
        for (var j = 0; j < pc; j++) {
            output[j] = out[j];
        }
        return output;
    }
}

/**
 * Utf16 Array -> ArrayBuffer (Uint8Array) (in UTF-8)
 * @type {stringToArrayBuffer}
 */
var utf16ArrayToArrayBuffer = stringToArrayBuffer;

/**
 * Byte Array (UTF-8) -> Unicode String
 * Uint8Array (UTF-8) -> Unicode String **bug here**
 *
 * @static
 * @memberof H
 * @param {Array|ArrayBuffer|Uint8Array} data byte array or uint8array in UTF-8 encoding
 * @returns {string} unicode string
 */
function utf8ByteArrayToUnicodeString(data) { // array of bytes
    if (data instanceof ArrayBuffer) {
        data = new Uint8Array(data);
    }
    var str = '',
        i, l = data.byteLength || data.length, s = data.byteLength || data.length;

    for (l++; --l;) {
        i = s - l;
        if (l < 0) break;
        var value = data[i];

        //accept Unicode char code also
        if (value < 0x80 || value > 0xFF) {
            str += String.fromCharCode(value);
        } else if (value > 0xBF && value < 0xE0) {
            str += String.fromCharCode((value & 0x1F) << 6 | data[i + 1] & 0x3F);
            --l;
        } else if (value > 0xDF && value < 0xF0) {
            str += String.fromCharCode((value & 0x0F) << 12 | (data[i + 1] & 0x3F) << 6 | data[i + 2] & 0x3F);
            l -= 2;
        } else if (value < 0x100) {
            // surrogate pair
            var charCode = ((value & 0x07) << 18 | (data[i + 1] & 0x3F) << 12 | (data[i + 2] & 0x3F) << 6 | data[i + 3] & 0x3F) - 0x010000;

            str += String.fromCharCode(charCode >> 10 | 0xD800, charCode & 0x03FF | 0xDC00);
            l -= 3;
        }
    }

    return str;
}

/**
 * Byte Array (UTF-8 representation) -> Int Array (UTF-16 representation)
 * Uint8Array (UTF-8 representation) -> Int Array (UTF-16 representation)
 *
 * @static
 * @memberof H
 * @param {Array|Uint8Array|ArrayBuffer} arr byte array in UTF-8 encoding
 * @return {Array} utf-16 int array
 */
function byteArrayToUtf16Array(arr) {
    var used = 0;
    var l;
    var length = l = (arr.byteLength || arr.length), i, t, byteCount, rev;
    for (l += 1;--l;) {
        rev = 0;
        i = length - l;
        t = arr[i];
        if (t < B10000000) {
            byteCount = 0;
            rev = B11111111;
        } else if (t < B11000000) {
            //will not happen
            byteCount = 0;
            rev = B11111111;
        } else if (t < B11100000) {
            //U-00000080 - U-000007FF: 110xxxxx 10xxxxxx
            byteCount = 1;
            rev = B00011111;
        } else if (t < B11110000) {
            //U-00000800 - U-0000FFFF: 1110xxxx 10xxxxxx 10xxxxxx
            byteCount = 2;
            rev = B00001111;
        } else if (t < B11111000) {
            //U-00010000 - U-001FFFFF: 11110xxx 10xxxxxx 10xxxxxx 10xxxxxx
            byteCount = 3;
            rev = B00000111;
        }
        //NOTE: 4 and 5 are not safe, cuz `<<` operation is over 32bit (int)
        //NOTE: javascript byte operations use int(32bit)
        else if (t < B11111100) {
            //U-00200000 - U-03FFFFFF: 111110xx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
            byteCount = 4;
            rev = B00000011;
        } else {
            //U-04000000 - U-7FFFFFFF: 1111110x 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx 10xxxxxx
            byteCount = 5;
            rev = B00000001;
        }

        var allc = byteCount;
        var result = 0;
        if (byteCount) {
            for (byteCount += 1; --byteCount;) {
                //byteCount: bc -> 1
                result += ((arr[i + byteCount] & B00111111) << (6 * (allc - byteCount)));
            }
        }
        result |= (t & rev) << (allc * 6);
        arr[used++] = result;
        l -= allc;
        if (l <= 0) {
            break;
        }
    }
    arr.length = used;
    return arr;
}

/**
 * UTF-16 Int Array -> Byte Array (representing UTF-8 chars)
 *
 * @static
 * @memberof H
 * @param {Array} ia utf-16 int array
 * @returns {Array} utf-8 byte array
 */
function utf16ArrayToByteArray(ia) {
    var out = [];
    for (var i = 0; i < ia.length; i++) {
        var c = ia[i];
        if (c < 0x80) {
            out[out.length] = c;
        } else if (c < 0x800) {
            out[out.length] = 0xc0 | (c >> 6);
            out[out.length] = 0x80 | (c & 0x3f);
        } else if (c < 0xd800 || c >= 0xe000) {
            out[out.length] = 0xe0 | (c >> 12);
            out[out.length] = 0x80 | ((c >> 6) & 0x3f);
            out[out.length] = 0x80 | (c & 0x3f);
        } else {
            // surrogate pair
            // UTF-16 encodes 0x10000-0x10FFFF by
            // subtracting 0x10000 and splitting the
            // 20 bits of 0x0-0xFFFFF into two halves
            c = 0x10000 + (((c & 0x3ff) << 10)
                | (ia[i] & 0x3ff));
            out[out.length] = 0xf0 | (c >> 18);
            out[out.length] = 0x80 | ((c >> 12) & 0x3f);
            out[out.length] = 0x80 | ((c >> 6) & 0x3f);
            out[out.length] = 0x80 | (c & 0x3f);
            i++;
        }
    }
    return out;
}

/**
 * ASCII String of UTF-8 Byte Array -> Unicode String
 *
 * @static
 * @memberof H
 * @param {String} str ascii string of utf-8 byte array
 * @returns {string} unicode string in utf-16 encoding
 */
function utf8ByteStringToUnicodeString(str) {
    //bs -> ba
    //ba -> us
    return utf8ByteArrayToUnicodeString(stringToUnicodeIntArray(str));
}

/**
 * Unicode String -> ASCII String of UTF-8 Byte Array
 *
 * @static
 * @memberof H
 * @param {String} str unicode string
 * @return {String} ascii string of utf-8 encoded byte array
 */
function unicodeStringToUtf8ByteString(str) {
    //us -> ba
    //ba -> s
    return unicodeIntArrayToString(stringToUtf8ByteArray(str));
}

/**
 * Raw String (UTF-8 Bytes) -> Uint8Array
 * no validality check
 *
 * @static
 * @memberof H
 * @param {String} str ascii string in utf-8 encoding
 * @return {Uint8Array} result arraybuffer
 */
function utf8ByteStringToUint8Array(str) {
    var length = str.length;
    var out = new Uint8Array(length);
    for (var i = 0; i < length; i++) {
        out[i] = str.charCodeAt(i);
    }
    return out;
}

/*
 * `Binary String` is the binary representation of a number
 */

/**
 * Decimal String -> Binary String
 *
 * @static
 * @memberof H
 * @param {String} d string of decimal number
 * @returns {string} string of binary representation of the specific number
 */
function numberToBinaryString(d) {
    return Number(d).toString(2);
}

//noinspection JSUnusedLocalSymbols
/**
 * String (might be byte string) -> Unicode string
 * but much (1x) slower than E.ba2s(E.s2a())
 *
 * @private
 * @deprecated
 * @param {String} str unicode string
 * @returns {string} utf8 string
 */
function strintToUtf8String(str) {
    //noinspection JSDeprecatedSymbols
    return decodeURIComponent(escape(str));
}

function hex(i) {
    if (!i) return "??";
    return ("00" + (i & 0xff).toString(16)).slice(-2);
}

/**
 * Get a well-printed JSON string
 *
 * @static
 * @memberof H
 * @param {Object} jsonObject json object to encode
 */
ES.getPrettyJson = function(jsonObject) {
    return JSON.stringify(jsonObject, null, "\t");
};

/**
 * Alias of H.numberToBinaryString
 *
 * @static
 * @memberof H
 * @type {H.numberToBinaryString}
 */
ES.n2bin = numberToBinaryString;
/**
 * Get the hex representation string of a number (less than 256/0xFF)
 *
 * @static
 * @memberof H
 * @param {Number} i
 * @returns {String} hex string
 */
ES.hex = hex;

//3-5, 5-3; 3-4, 4-3; 1-4
//Array of charcode <-> Unicode String
/**
 * ArrayBuffer to ByteString
 * UnicodeIntArray to UnicodeString
 *
 * @static
 * @memberof H
 * @type {H.unicodeIntArrayToString}
 */
ES.ab2bs = ES.ua2s = unicodeIntArrayToString;
/**
 * UnicodeString to UnicodeIntArray
 *
 * @static
 * @memberof H
 * @type {H.stringToUnicodeIntArray}
 */
ES.s2ua = stringToUnicodeIntArray;

//4-5, 5-4
//Raw data string <-> Unicode String
/**
 * UnicodeString to AsciiByteString
 *
 * @static
 * @memberof H
 * @type {H.unicodeStringToUtf8ByteString}
 */
ES.us2bs = unicodeStringToUtf8ByteString;
/**
 * Utf-8 ByteString to UnicodeString
 * @type {H.utf8ByteStringToUnicodeString}
 */
ES.bs2us = utf8ByteStringToUnicodeString;

//2-5, 5-2; 2-4, 4-2; ?, 1-5
//Unicode String <-> Array of raw data bytes
/**
 * Unicode String to ByteArray
 *
 * @static
 * @memberof H
 * @type {H.stringToUtf8ByteArray}
 */
ES.s2ba = stringToUtf8ByteArray; //str to binary arr (utf8)
/**
 * ByteArray to UnicodeString
 * ArrayBuffer to UnicodeString
 *
 * @static
 * @memberof H
 * @type {H.utf8ByteArrayToUnicodeString}
 */
ES.ab2s = ES.ba2s = utf8ByteArrayToUnicodeString; //binary arr (utf8) to str

//2-3, 3-2; 1-3
/**
 * ByteArray to Utf16IntArray
 *
 * @static
 * @memberof H
 * @type {H.byteArrayToUtf16Array}
 */
ES.ba2ia = byteArrayToUtf16Array; //binary array to int array
/**
 * Utf16IntArray to ByteArray
 *
 * @static
 * @memberof H
 * @type {H.utf16ArrayToByteArray}
 */
ES.ia2ba = utf16ArrayToByteArray;

//meaningless: 1-2, 2-1

//4-1
/**
 * AsciiByteString to ArrayBuffer
 *
 * @static
 * @memberof H
 * @type {H.utf8ByteStringToUint8Array}
 */
ES.bs2ab = utf8ByteStringToUint8Array;
//5-1
/**
 * UnicodeString to ArrayBuffer(Uint8Array)
 *
 * @static
 * @memberof H
 * @type {H.stringToArrayBuffer}
 */
ES.s2ab = stringToArrayBuffer;
//3-1
/**
 * IntArray to ArrayBuffer
 *
 * @static
 * @memberof H
 * @type {stringToArrayBuffer}
 */
ES.a2ab = utf16ArrayToArrayBuffer;

//aliases
/**
 * Unicode CharArray to String, alias of H.ua2s
 *
 * @static
 * @memberof H
 * @type {*|unicodeIntArrayToString}
 */
ES.a2s = ES.ua2s; //unicode char array to str
/**
 * UnicodeString to UnicodeIntArray
 *
 * @static
 * @memberof H
 * @type {*|stringToUnicodeIntArray}
 */
ES.s2a = ES.s2ua; //str to unicode char array

/**
 * ByteArray to UnicodeIntArray, alias of E.ba2ia
 * @type {*|byteArrayToUtf16Array}
 */
ES.ba2ua = ES.ba2ia; //alias

/**
 * String to UnicodeString
 *
 * @static
 * @memberof H|E
 * @type {H.utf8ByteStringToUnicodeString}
 */
ES.s2us = ES.bs2us;

module.exports = ES;
},{}],9:[function(require,module,exports){
/*
 * Custom Event Manipulation Module
 */

var E = {};

var H = require('./uuid');
var C = require('./iterator');

/**
 * DOM event operators.
 *
 * @static
 * @memberof H
 * @type {{addHandler: E.Event.addHandler, removeHandler: E.Event.removeHandler}}
 */
E.Event = {
    /**
     * Add event handler
     *
     * @static
     * @memberof H.Event
     * @param {Element} oElement DOM element
     * @param {String} sEvent event name
     * @param {Function} fnHandler event handler
     */
    addHandler: function (oElement, sEvent, fnHandler) {
        sEvent[0] = sEvent[0].toUpperCase();
        oElement.addEventListener ? oElement.addEventListener(sEvent, fnHandler, false) : oElement.attachEvent("on" + sEvent, fnHandler)
    },
    /**
     * Remove event handler from dom element
     *
     * @static
     * @memberof H.Event
     * @param {Element} oElement DOM element
     * @param {String} sEvent event name
     * @param {Function} fnHandler event handler
     */
    removeHandler: function (oElement, sEvent, fnHandler) {
        sEvent[0] = sEvent[0].toUpperCase();
        oElement.removeEventListener ? oElement.removeEventListener(sEvent, fnHandler, false) : oElement.detachEvent("on" + sEvent, fnHandler);
        sEvent[0] = sEvent[0].toLowerCase();
        oElement.removeEventListener ? oElement.removeEventListener(sEvent, fnHandler, false) : oElement.detachEvent("on" + sEvent, fnHandler);
    }
};

/**
 * EventDispatcher
 *
 * @static
 * @memberof H
 * @returns {{listeners: {}, attachListener: H.EventDispatcher.attachListener, fire: H.EventDispatcher.fire, removeListener: H.EventDispatcher.removeListener, clearListener: H.EventDispatcher.clearListener}}
 * @constructor
 */
E.EventDispatcher = function() {
    return {
        listeners: {},
        /**
         * Attach an listener listening on a channel
         *
         * @static
         * @memberof H.EventDispatcher
         * @param {String} key channel to listen
         * @param {Function} cb listener body
         * @returns {String} UUID String, listener identifier
         */
        attachListener: function(key, cb) {
            this.listeners[key] = this.listeners[key] || {};
            //noinspection JSUnresolvedVariable
            cb.uuid = cb.uuid || H.fastUuid();
            //noinspection JSUnresolvedVariable
            this.listeners[key][cb.uuid] = cb;
            //noinspection JSUnresolvedVariable
            return cb.uuid;
        },
        /**
         * Fire event at a channel now
         *
         * @static
         * @memberof H.EventDispatcher
         * @param {String} key event channel key to fire
         * @param {*} [data] optional data to append
         */
        fire: function(key, data) {
            if (this.listeners[key]) {
                C.each(this.listeners[key], function(cb) {
                    //noinspection JSUnresolvedVariable
                    if (cb && typeof cb === 'function' && !cb.blocked) {
                        try {
                            cb(data);
                        }catch(e) {
                            console.log(e)
                        }
                    }
                });
            }
        },
        /**
         * Remove a listener from a channel.
         *
         * @static
         * @memberof H.EventDispatcher
         * @param {String} key channel name
         * @param {Function} func listener body
         */
        removeListener: function(key, func) {
            if (this.listeners[key]) {
                this.listeners[key] = C.each(this.listeners[key], function(listener) {
                    //noinspection JSUnresolvedVariable
                    if (listener.uuid !== func.uuid) return listener;
                }).merge();
            }
        },
        /**
         * Clear all listeners on a channel
         *
         * @static
         * @memberof H.EventDispatcher
         * @param {String} key channel key to clear
         */
        clearListener: function(key) {
            this.listeners[key] = undefined;
            delete this.listeners[key];
        }
    };
};

module.exports = E;
},{"./iterator":10,"./uuid":20}],10:[function(require,module,exports){
/*
 * Iterator Logic Module
 */
var C = require('lodash/core');
var Mini = require('../mini');

var I = function(template) {
    I.template = template || I.resultWrapper;
    return I;
};

/**
 * Set the default result template.
 * A result template will be used to produce a result object according to the input value.
 *
 * @static
 * @param {Function} template
 * @returns {I}
 * @constructor
 */
I.setTemplate = function(template) {
    I.template = template || I.resultWrapper;
    return I;
};

/*
 * @private
 *
 * returns a template object for the input value
 */
I.resultWrapper = function(v) {
    if (I.template !== undefined) return I.template(v);
    return (v === undefined || v === null) ? {} : (Mini.isArrayLike(v) ? [] : {});
};

/**
 * Iterates an object or an array with an iteratee and a stack of stack trace
 *
 * @static
 * @memberof H
 * @param {Array|Object} obj
 * @param {Function} fn
 * @param {Array|String} [stackStack]
 * @return {Array|Object} return mapped results of the input object
 */
I.each = function(obj, fn, stackStack) {
    stackStack = stackStack || [];
    var ret = I.resultWrapper(obj);
    if (H.debug) {
        C.each(obj, function(val, key, list) {
            try {
                var r = fn(val, key, list);
                if (r) ret[key] = r;
            } catch (e) {
                //E.printStackTrace only accepts one parameter
                e.printStackTrace(stackStack);
            }
        });
    } else {
        C.each(obj, function(val, key, list) {
            var r = fn(val, key, list);
            if (r) ret[key] = r;
        });
    }
    return ret;
};

/**
 * Just iterate the input object
 * @type {function((Array|Object), Function=): (Array|Object)}
 */
I.every = C.each;

/**
 * Iterator function with early quit.
 *
 * @static
 * @memberof H
 * @param {Array|Object} data data to iterate
 * @param {Function} fn function to yield result of each input
 * @param {Function} callable function to check if the itearting should be terminated
 * @param {Array} [stackStack] stack trace stack
 */
I.until = function(data, fn, callable, stackStack) {
    stackStack = stackStack || [];
    var ret = I.resultWrapper(data);
    //TODO: does it work? (not including `core` module here due to dependency error)
    //TODO: remove dependency on static named variable `H`
    if (H.debug) {
        C.find(data, function(val, key, list) {
            try {
                var r = fn(val, key, list);
                if (r) ret[key] = r;
                return callable(val, key, list);
            } catch (e) {
                e.printStackTrace('Nested error', stackStack);
            }
        });
    } else {
        C.find(data, function(val, key, list) {
            var r = fn(val, key, list);
            if (r) ret[key] = r;
            return callable(val, key, list);
        });
    }
    return ret;
};

/**
 * Iterate all keys on the object. (indices on arrays)
 * Would prefer H.each(H.keys())
 *
 * @static
 * @memberof H
 * @param {Array|Object} data data to iterate
 * @param {Function} callable iteratee to yield result
 */
I.eachKey = function(data, callable) {
    var keys = data;
    if (!Mini.isArrayLike(data)) {
        keys = C.keys(data);
    }
    var l = keys.length;
    var n = keys.length;
    for (l++; --l;) {
        callable(n - l, keys[n - l], data);
    }
};

/**
 * Iterate on a range of numbers.
 *
 * @static
 * @memberof H
 * @return {Array|Object}
 * @example
 *
 * H.eachIndex(4, function() {}) => 4x undefined
 * H.eachIndex(1, 4, function() {}) => 3x undefined
 * H.eachIndex(2, 4, 2, function() {}) => 1x undefined
 */
I.eachIndex = function() {
    var length = arguments.length;
    //accept 2-4 arguments only.
    if (length < 2 || length > 4) {
        return;
    }
    var start = length > 2 ? arguments[0] : 0;
    var end = length === 2 ? arguments[0] : arguments[1];
    var step = length >= 4 ? arguments[2] : 1;
    var iteratee = arguments[length - 1];

    //end, iteratee
    //start, end, iteratee
    //start, end, step, iteratee
    var rs = I.resultWrapper([]);
    var i = 0;

    if (step === 1) {
        //short for is faster than dowhile
        var ci = start;
        for (i = end - start + 1; --i;) {
            rs[ci] = iteratee(ci, ci);
            ci++;
        }
        return rs;
    } else {
        do {
            rs[start] = iteratee(start, i++);

            start += step;
        } while (start <= end);
        return rs;
    }
};

/**
 * Iterator discarding values.
 *
 * @param {Array|Object|Function} ele object to iterate
 * @param {Function} fn iteratee to produce values
 */
I.filter = function(ele, fn) {
    if (fn === undefined) {
        fn = ele;
        ele = this;
    }
    return I.each(ele, function(o) {
        if (fn(o)) {
            return o;
        }
    });
};

module.exports = I;
},{"../mini":2,"lodash/core":23}],11:[function(require,module,exports){
/*
 * Math-Related Module
 */

var Ms = {};
var C = require('../mini');
var H = require('./stacktrace');

/**
 * Sum a list of number
 *
 * @static
 * @memberof H
 * @param {Array} list
 * @returns {number}
 */
Ms.sum = function(list) {
    if (!C.isArrayLike(list)) return 0;
    var sum = 0;
    var length = list.length;
    length++;
    while(--length) {
        sum += list[length - 1];
    }
    if (isNaN(sum)) {
        H.printStackTrace("NaN!");
        return 0;
    }
    return sum;
};

/**
 * Hypot polyfill.
 *
 * @static
 * @memberof H
 * @type {Function}
 */
Ms.hypot = Math.hypot || function() {
        return Math.sqrt(Ms.sum(C.arrayEach(arguments, function(arg) {
            return arg * arg;
        })));
    };

/**
 * Log2 polyfill
 *
 * @static
 * @memberof H
 * @type {Function}
 */
Ms.log2 = Math.log2 || function(number) {
        return Math.log(number) / Math.log(2);
    };

/**
 * Check if a variable between given two numbers
 *
 * @static
 * @memberof H
 * @param {Number} v number to check
 * @param {Number} v0 margin 1
 * @param {Number} v1 margin 2
 * @returns {boolean}
 */
Ms.varInRange = function(v, v0, v1) {
    return (v - v0) * (v - v1) < 0;
};

/**
 * Check if a point [x, y] is inside the rectangle of two given points.
 *
 * @static
 * @memberof H
 * @param {Object} p point to check
 * @param {Object} p0 point 1
 * @param {Object} p1 point 2
 * @returns {boolean}
 */
Ms.pointInRect = function(p, p0, p1) {
    var result = true;
    C.arrayEach(p, function(ele, index) {
        result &= Ms.varInRange(ele, p0[index], p1[index]);
    });
    return result;
};

/**
 * Extract max value. Object not supported
 *
 * @static
 * @memberof H
 * @param list
 * @returns {number}
 */
Ms.max = function(list) {
    var mx = -Infinity;
    C.arrayEach(list, function(v) {
        if (v > mx) mx = v;
    });
    return mx;
};

/**
 * Extract min value. Object not supported
 *
 * @static
 * @memberof H
 * @param list
 * @returns {number}
 */
Ms.min = function(list) {
    var mx = Infinity;
    C.arrayEach(list, function(v) {
        if (v < mx) mx = v;
    });
    return mx;
};

//dependes on `keys` and `values`
// Ms.maxValue = function(obj) {
//     return Ms.max(C.values(obj));
// };
//
// Ms.minValue = function(obj) {
//     return Ms.min(C.values(obj));
// };

/*
 * Individual Functions
 */

/**
 * Degree to radian
 *
 * @static
 * @memberof H
 * @param {Number} degree degree value
 * @returns {number} radian value
 */
Ms.degToRad = function(degree) {
    return (degree / 180.0) * Math.PI;
};

/**
 * Radian to degree
 *
 * @static
 * @memberof H
 * @param {Number} rad radian value
 * @returns {number} degree value
 */
Ms.radToDeg = function(rad) {
    return rad * 180.0 / Math.PI;
};

/**
 * Normalize degree value to [0, 360)
 *
 * @static
 * @memberof H
 * @param {Number} degree degree value
 * @returns {number} normalized degree value
 */
Ms.standardizeDegree = function(degree) {
    var floor = Math.floor(degree / 360.0);
    return degree - floor * 360.0;
};

/**
 * Normalize radian value to [0, 2*PI)
 *
 * @static
 * @memberof H
 * @param {Number} rad radian value
 * @returns {number} normalized radian value
 */
Ms.standardizeRad = function(rad) {
    var floor = Math.floor(rad / (2 * Math.PI));
    return rad - floor * 2 * Math.PI;
};

/**
 * Convert point in rectangle coordinates to polar coordinates. (in radian)
 *
 * @static
 * @memberof H
 * @param {Array} coor rect coordinates
 * @returns {*[]} polar coordinates
 */
Ms.rectToPolar = function(coor) {
    var r = Ms.hypot(coor[0], coor[1]);
    var absTheta = Math.atan2(Math.abs(coor[1]), Math.abs(coor[0])); // in rad
    var signal = coor[0] * coor[1] < 0;
    if (coor[0] >= 0) {
        if (coor[1] >= 0) {
            return [r, absTheta];
        } else {
            return [r, 2 * Math.PI - absTheta];
        }
    } else {
        return [r, Math.PI + (signal ? -1 : 1) * absTheta];
    }
};

/**
 * Convert point in polar coordinates to rectangle coordinates.
 *
 * @static
 * @memberof H
 * @param {Array} coor polar coordinates
 * @returns {*[]} rectangle coordinates
 */
Ms.polarToRect = function(coor) {
    var cA = Math.cos(coor[1]);
    var sA = Math.sin(coor[1]);
    return [coor[0] * cA, coor[0] * sA];
};

/**
 * Convert distance in latitude to meter
 *
 * @static
 * @memberof H
 * @param {Number} delta distance represented in latitude
 * @returns {number} distance in meter
 */
Ms.latToMeter = function(delta) {//in meters
    return 40008000 * delta / 360.0;
};

/**
 * Convert distance in longtitude around some latitude to meter
 *
 * @static
 * @memberof H
 * @param {Number} lat latitude
 * @param {Number} delta distance in longtitude
 * @returns {number} distance in meter
 */
Ms.lngToMeterAtLat = function(lat, delta) {
    return delta * Math.cos(Math.PI * Math.abs(lat) / 180) * 40075040 / 360.0;
};

/**
 * Convert distance in meter to distance in latitude
 *
 * @static
 * @memberof H
 * @param {Number} meter distance in meter
 * @returns {number} distance in latitude
 */
Ms.meterToLat = function(meter) {
    return 360.0 * meter / 40008000;
};

/**
 * Convert distance in meter to distance in longtitude around some latitude
 *
 * @static
 * @memberof H
 * @param {Number} lat latitude
 * @param {Number} meter distance in meter
 * @returns {number} distance in longtitude
 */
Ms.meterToLngAtLat = function(lat, meter) {
    return 360.0 * meter / (40075040 * Math.cos(Math.PI * Math.abs(lat) / 180));
};

/**
 * Calculate the distance between two points on earth.
 * Points are represented in 2-element arrays ([longtitude, latitude])
 * Assuming the earth a perfect sphere.
 *
 * @static
 * @memberof H
 * @param {Array} p0 point 1
 * @param {Array} p1 point 2
 * @returns {number} distance in meters
 */
Ms.distOnEarth = function(p0, p1) {
    //[lng, lat], assuming earth a sphere
    return Math.PI * 6400000 * Math.acos(Math.cos(p0[0] - p1[0]) + Math.cos(p0[1] - p1[1]) - 1) / 180.0;
};

module.exports = Ms;
},{"../mini":2,"./stacktrace":16}],12:[function(require,module,exports){
/*
 * Object-Related Module
 */

var O = {};
require('./stacktrace');

//variable type to be checked
/**
 * Checks if the target string contains a charsequence.
 *
 * @static
 * @memberof H
 * @param {String} str target string
 * @param {String} sub substring to check
 * @returns {boolean}
 */
O.strContains = function(str, sub) {
    return str.indexOf(sub) !== -1;
};

/**
 * Checks if the target string contains a charsequence ignoring the char case.
 *
 * @static
 * @memberof H
 * @param {String} str target string
 * @param {String} sub substring to check
 * @returns {boolean}
 */
O.strContainsIgnoreCase = function(str, sub) {
    return str.toLowerCase().indexOf(sub.toLowerCase()) !== -1;
};

O.parseJson = function(json) {
    try {
        return JSON.parse(decodeURI(json));
    } catch (e) {
        try {
            return JSON.parse(json);
        } catch (e) {
            e.printStackTrace();
        }
    }
    return undefined;
};

/**
 * Clones the object via JSON.
 * Should be used on small plain javascript objects only.
 *
 * @static
 * @memberof H
 * @param {Array|Object} obj
 * @return {Object} cloned object
 */
O.cloneByParse = function(obj) {
    //for small objects only
    return JSON.parse(JSON.stringify(obj));
};

module.exports = O;
},{"./stacktrace":16}],13:[function(require,module,exports){
var root = require('./detect').root;

root.requestAnimationFrame = (function() {
    return root.webkitRequestAnimationFrame ||
        root.requestAnimationFrame ||
        root.mozRequestAnimationFrame ||
        root.oRequestAnimationFrame ||
        root.msRequestAnimationFrame ||
        function(callback/*, element*/){
            return root.setTimeout(callback, 1000 / 60);
        };
})();
},{"./detect":7}],14:[function(require,module,exports){
/*
 * ResultSet Module
 */
var RS = {};
var H = require('lodash/core');
var ARS = require('./abstractresultset');
var I = require('./iterator');

var RsIdentifier = '__isRS__';

//the default ResultSet should not exclude any values
//noinspection JSUnusedLocalSymbols
function checker(val) {
    return true;
}

//default channel doesn't need filter
ARS.registerChannel(RsIdentifier, [Array.prototype, Object.prototype], checker);

function registerComponent(name, func) {
    ARS.registerChannelFunction(RsIdentifier, name, function(preCheck) {
        //r-w risky?
        checker = preCheck;
        return func;
    });
}

function wrapFunction(fn) {
    return function() {
        if (checker(arguments[0])) {
            return fn.apply(this, arguments);
        }
    }
}

/*
 * ResultSet Operations
 */
/**
 * Iterates an Array or Object, promise version
 *
 * @param {*} fn iterator function
 * @returns {Array|Object} result composed by return statement
 */
function each(fn) {
    //patch `fn`
    arguments[0] = wrapFunction(arguments[0]);
    return I.each.apply(H, [this].concat(Array.prototype.slice.call(arguments)));
}

/**
 * Iterates an Array or Object, return the filtered result, promise ver
 *
 * @param {Function} fn filter function
 * @returns {Array|Object} filtered result
 */
function filter(fn) {
    fn = wrapFunction(fn);
    return I.each(this, function(o) {
        if (fn(o)) {
            return o;
        }
    });
}

/**
 * Sort an Array or values of an Object, return the sorted array, promise ver
 *
 * @param {Function} fn sort function
 * @returns {*|Array} sorted array
 */
function sortBy(fn) {
    fn = wrapFunction(fn);
    return H.sortBy(this, fn);
}

/**
 * Returns the value array of an object or itself of an array.
 *
 * @returns {*|Array}
 */
function toArray() {
    return H.values(this);
}

/**
 * Return grouped values by a grouping function of an array or an object
 *
 * @param {Function} fn grouping function
 * @returns {*}
 */
function groupBy(fn) {
    fn = wrapFunction(fn);
    return H.groupBy(this, fn);
}

/**
 * Joins an array or the value array of an object
 *
 * @param {String} separator result separator
 * @returns {string} joined string
 */
function join(separator) {
    return H.values(this).join(separator || "");
}

/**
 * Sums all numbers in an array or value array of an object
 *
 * @returns {number} sum value
 */
function sum() {
    var s = 0;
    I.each(this || [], function(v) {
        var nv = H.isInteger(v) ? parseInt(v) : (H.isFloat(v) ? parseFloat(v) : NaN);
        if (!isNaN(nv)) {
            s += nv;
        }
    });
    return s;
}

/**
 * Returns the length of an array or the value array of an object
 *
 * @returns {Number} length
 * @constructor
 */
function Length() {
    return H.values(this).length;
}

/**
 * Returns the array itself or the value array of an object
 *
 * @returns {*|Array} result array
 */
function values() {
    return H.values(this);
}

/**
 * Returns the key array of an object or the index array of an array
 *
 * @returns {*|Array} key array
 */
function keys() {
    return H.keys(this);
}

/**
 * Returns the flatten array of an nested array.
 *
 * @returns {*|Array}
 */
function flatten() {
    return H.flatten(this) || [];
}

registerComponent("each",    each);
registerComponent("filter",  filter);
registerComponent("sortBy",  sortBy);
registerComponent("toArray", toArray);
registerComponent("groupBy", groupBy);
registerComponent("join",    join);
registerComponent("sum",     sum);
registerComponent("Length",  Length);
registerComponent("values",  values);
registerComponent("keys",    keys);
registerComponent("flatten", flatten);

/**
 * Wrap an object to default ResultSet
 *
 * @static
 * @memberof H
 * @param {Array|Object} v anything to wrap
 * @returns {*} wrapped ResultSet object
 */
var wrap = ARS.wrapperGen(RsIdentifier);

RS.wrap = wrap;
/**
 * @deprecated
 * @type {wrap}
 */
RS.fastWrap = wrap;

module.exports = RS;
},{"./abstractresultset":3,"./iterator":10,"lodash/core":23}],15:[function(require,module,exports){
var S = {};

var H = require('./detect');
var root = H.root;

var noop = function() {
    return function() {};
};

var navigator = H.root.navigator || {userAgent: ""};

/**
 * Add property to object
 *
 * @static
 * @memberof H
 * @param {Object} object to operate
 * @param {String} key field to fill in
 * @param {Object} descriptor property descriptor
 */
var addProperty = noop();
//defineProperty in IE8 only accepts DOM elements as parameters, while in Safari 5 it's opposite
if (!Object.defineProperty || (0 < H.getIE() <= 8 && navigator.userAgent.indexOf('MSIE') !== -1)) {
    addProperty = function(instance, k, descriptor) {
        instance[k] = descriptor.value;

        if (isObject(descriptor[k])) {
            instance[k].ienumerable = !descriptor.enumerable;
        } else {
            if (!instance[k].ienumerables) {
                instance[k].ienumerables = [];
            }
            if (!descriptor.enumerable && instance[k].ienumerables instanceof Array) {
                instance[k].ienumerables.push(k);
            } else if (instance['ienumerables']) {
                instance['ienumerables'][k] = undefined;
                delete instance['ienumerables'][k];
            }
        }

        //configurable, writable to be impl.
    };

    addProperty.__userDefined__ = true;

    if (!Object.defineProperty) Object.defineProperty = addProperty;
} else {
    addProperty = Object.defineProperty;
}

/**
 * Create object and copy all properties into it.
 *
 * @static
 * @memberof H
 * @param {Object} base base class
 * @param {Object} reference object to copy properties from
 * @example
 *
 * var obj = H.createObject(Object.prototype, {a: 1, b: 2})
 */
var createObject = function() {
    function F() {}

    return function(o, p) {
        F.prototype = o;
        var instance = new F();
        if (p) {
            //p is a descriptor with key name k
            //is this enough for replacing H.each(H.keys ?
            for (var k in p) {
                if (p.hasOwnProperty(k)) addProperty(instance, k, p[k]);
            }
        }
        return instance;
    };
}();

//emulate legacy getter/setter API using ES5 APIs
try {
    if (!Object.prototype.__defineGetter__ &&
        addProperty({},"x",{get: function(){return true;}}).x) {
        addProperty(Object.prototype, "__defineGetter__",
            {enumerable: false, configurable: true,
                value: function(name,func)
                {addProperty(this,name,
                    {get:func,enumerable: true,configurable: true});
                }});
        addProperty(Object.prototype, "__defineSetter__",
            {enumerable: false, configurable: true,
                value: function(name,func)
                {addProperty(this,name,
                    {set:func,enumerable: true,configurable: true});
                }});
    }
} catch(defPropException) {/*Do nothing if an exception occurs*/}

// Avoid `console` errors in browsers that lack a console.
(function() {
    var method;
    var noop = function () {};
    var methods = [
        'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
        'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
        'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
        'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
    ];
    var length = methods.length;
    var console = root.console || {};
    if (!root.console) root.console = console;

    while (length--) {
        method = methods[length];

        // Only stub undefined methods.
        if (!console[method]) {
            console[method] = noop;
        }
    }
}());

//Polyfill for IE<9
if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
    };
}

S.addProperty = addProperty;
S.createObject = createObject;

module.exports = S;
},{"./detect":7}],16:[function(require,module,exports){
var C = {};

var Mini = require('../mini');

var log = (console.error || console.log);

/**
 * Generate stack trace string. (separated by `\n`)
 *
 * @static
 * @memberof H
 * @param {String} [title]
 * @returns {string} stack trace string
 */
C.getStackTrace = function(title) {
    var callstack = "Referenced From: " + (title || "");
    var e = title instanceof Error ? title : new Error(callstack);
    var split = e.stack.split('\n');
    if (split.length > 1) {
        var t = split[0];
        //remove getStackTrace itself
        split.shift();
        split.shift();
        split.unshift(t);
        return split.join('\n');
    }
    return e.stack;
};

var DefaultNestedTitle = "Nested error:";
var DefaultTitle = "Error:";

/**
 * Print stack trace stack.
 *
 * @static
 * @memberof H
 * @param {String|Error} [title] title or error of current layer
 * @param {Array} [stackStack] stack trace stack (possibly)
 * @example
 *
 * usage:
 * H.printStackTrace(string/error, stackStack)
 * H.printStackTrace(string/error)
 * H.printStackTrace(stackStack)
 * H.printStackTrace()
 * variant:
 * error.printStackTrace() -> printStackTrace(error, [])
 */
C.printStackTrace = function(title, stackStack) {
    stackStack = stackStack || [];
    if (Mini.isArrayLike(title)) {
        //noinspection JSValidateTypes for arguments
        stackStack = title;
        if (stackStack.length) {
            title = DefaultNestedTitle;
        } else {
            title = DefaultTitle;
        }
    }
    title = title || DefaultTitle;
    stackStack.unshift(C.getStackTrace(title));
    var n = stackStack.length;
    var l = stackStack.length;
    for (l++; --l;) {
        log(stackStack[n - l]);
    }
};

/**
 * Print string with stack trace in debug mode.
 *
 * @static
 * @memberof H
 * @param {String|Error} [d] content to print
 * @param {Array} [stackTrace] stack trace stack
 */
C.errlog = function(d, stackTrace) {
    if (C.debug) {
        C.printStackTrace(d);
        if (stackTrace && !C.isArrayLike(stackTrace)) {
            console.error("Referenced From: " + stackTrace);
        } else if (stackTrace && C.isArrayLike(stackTrace)) {
            for (var i = stackTrace.length - 1; i > -1; i--) {
                if (stackTrace[i]) console.error("Referenced From: " + stackTrace[i]);
            }
        }
    }
};

function printStackTrace(stackStack) {
    C.printStackTrace(this, stackStack);
}

Error.prototype.getStackTrace = C.getStackTrace;
Error.prototype.printStackTrace = printStackTrace;

module.exports = C;
},{"../mini":2}],17:[function(require,module,exports){
var C = {};
var H = require('./stacktrace');
var Detect = require('./detect');

if (Detect.isNodejs) {
    Detect.root.__sessionStorage = {};

    C.setItem = setItemFallback;
    C.getItem = getItemFallback;
    C.removeItem = removeItemFallback;
} else if (Detect.root.sessionStorage) try {
    sessionStorage.setItem('test', '1');
    sessionStorage.removeItem('test');

    /**
     * Store value to session storage.
     * In node.js environment, data will be stored in global variable `__sessionStorage` (lost on exit).
     * In browsers without sessionStorage support, will try cookie first.
     *
     * @static
     * @memberof H
     * @param key
     * @param value
     */
    C.setItem = function(key, value) {
        sessionStorage.removeItem(key);
        sessionStorage.setItem(key, value);
    };

    /**
     * Deprecated store value to session storage.
     *
     * @static
     * @memberof H
     * @deprecated
     * @param key
     * @param value
     * @type {Function}
     */
    C.secAddItem = C.setItem;

    /**
     * Remove stored value of key in session storage.
     *
     * @static
     * @memberof H
     * @param key
     */
    C.removeItem = function(key) {
        sessionStorage.removeItem(key);
    };

    /**
     * Retrieve stored value in session storage.
     *
     * @static
     * @memberof H
     * @param key
     */
    C.getItem = function(key) {
        return sessionStorage.getItem(key);
    };

} catch (e) {
    H.printStackTrace('Session Storage Not Supported');

    C.secAddItem = function(key, value) {
        setCookie(key, value, 1);
    };

    C.removeItem = function(key) {
        setCookie(key, null, 0);
    };

    C.getItem = function(key) {
        return getCookie(key);
    };
}

function setCookie(key, value, days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 86400000);
    document.cookie = key + "=" + value + "; expires=" + date.toUTCString();
}

function getCookie(key) {
    var regex = new RegExp('^\\s*' + key + '=');
    var splits = document.cookie.split(';');
    for (var i = 0; i < splits.length; i++) {
        var s = splits[i];
        var d = s.match(regex);
        if (d !== null && d.length !== 0) {
            return s.replace(regex, '');
        }
    }
}

function setItemFallback(key, value) {
    Detect.root.__sessionStorage[key] = value;
}

function getItemFallback(key) {
    return Detect.root.__sessionStorage[key];
}

function removeItemFallback(key) {
    Detect.root.__sessionStorage[key] = undefined;
}

module.exports = C;
},{"./detect":7,"./stacktrace":16}],18:[function(require,module,exports){
var C = {};

C.now = Date.now;

/**
 * Run a function, count the time consumed.
 *
 * @static
 * @memberof H
 * @param {Function} cb function to run
 * @returns {number} time in millis
 */
C.test = function(cb) {
    var o = C.now();
    cb();
    var d = C.now() - o;
    console.log(d);
    return d;
};

/**
 * Run a function, and record it in "Profile" tab in chromium.
 *
 * @static
 * @memberof H
 * @param {Function} cb function to run
 * @param {String} title title of this run
 * @returns {number} time in millis
 */
C.profile = function(cb, title) {
    console.profile(title || "Profile");
    var o = C.now();
    cb();
    var d = C.now() - o;
    //noinspection JSUnresolvedFunction
    console.profileEnd(title || "Profile");
    return d;
};

/**
 * Do something for some times
 *
 * @static
 * @memberof H
 * @param {Function} cb function to run
 * @param {Number} times times function will be executed
 */
C.repeat = function(cb, times) {
    if (times > 0) {
        do {
            cb();
        } while(times--);
    }
};

/**
 * Test some method and record the time consumption for several times.
 *
 * @static
 * @memberof H
 * @param {Function} cb function to run
 * @param {Number} times times function will be executed
 */
C.testTimes = function(cb, times) {
    C.test(function() {
        C.repeat(cb, times);
    });
};

/**
 * Profile some method for several times.
 *
 * @static
 * @memberof H
 * @param {Function} cb function to run
 * @param {Number} times times function will be executed
 * @param {String} title title of this run
 */
C.profileTimes = function(cb, times, title) {
    C.profile(function() {
        C.repeat(cb, times);
    }, title);
};

module.exports = C;
},{}],19:[function(require,module,exports){
var C = {};

var I = require('./iterator');
var D = require('./detect');

var location = D.root.location || "";

C.QueryString = function(item){
    var svalue = location.search.match(new RegExp("[\?\&]" + item + "=([^\&]*)(\&?)","i"));
    return svalue ? svalue[1] : svalue;
};

/**
 * @static
 * @memberof H
 * @deprecated
 */
C.Request = {
    QueryString: C.QueryString
};

/**
 * Generate URL with GET param string
 *
 * @static
 * @memberof H
 * @param {String} server prefix string (domain)
 * @param {String} action path of file requests
 * @param {Object} params get param object
 * @returns {string} URL string
 * @example
 *
 * H.getUrlByParams("http://abc.def/", "path/of/file", {a: 1})
 * =>
 * "http://abc.def/path/of/file?a=1"
 */
C.getUrlByParams =  function(server, action, params) {
    var paramUrl = "";
    I.each(params || {}, function(param, key) {
        paramUrl += "&" + key + "=";
        var p = "";
        if (param instanceof Array) {
            p = "[";
            var tr = "";
            I.each(param, function(val) {
                tr += ",";
                if (val instanceof Boolean ||
                    val instanceof String ||
                    val instanceof Number ||
                    typeof val === "string" ||
                    typeof val === "number") {
                    tr += "\"" + val + "\"";
                } else if (val) {
                    tr += val;
                }
            });
            p += tr.substr(1) + "]";
        } else {
            p = param;
        }
        paramUrl += p;
    });
    return (server + action + "?" + paramUrl.substr(1));
};

/**
 * Generate simple param string from an object
 *
 * @static
 * @memberof H
 * @param {Object} data param object
 * @returns {string}
 * @example
 *
 * H.param({a:1, b:2})
 * =>
 * "a=1&b=2"
 */
C.param = function(data) {
    var s = [], add = function(k, v) {
        s[s.length] = encodeURIComponent(k) + "=" + encodeURIComponent(v);
    };

    I.each(data, function(o, k) {
        add(k, o);
    });

    return s.join("&").replace(/%20/g, "+");
};

module.exports = C;
},{"./detect":7,"./iterator":10}],20:[function(require,module,exports){
var C = {};

/**
 * Generate Uuid
 *
 * @static
 * @memberof H
 * @param {Number} [len] length of target string, not specified by default
 * @param {Number} [radix] when length specified, limit possible characters in the result
 * @returns {string}
 */
C.uuid = function (len, radix) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = [], i;
    radix = radix || chars.length;

    if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
        // rfc4122, version 4 form
        var r;
        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';
        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random()*16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }
    return uuid.join('');
};

/**
 * Generate Uuid in Default Format
 *
 * @static
 * @memberof H
 * @returns {string}
 */
C.fastUuid = function() {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = new Array(36), rnd=0, r;
    for (var i = 0; i < 36; i++) {
        if (i === 8 || i === 13 || i === 18 || i === 23) {
            uuid[i] = '-';
        } else if (i === 14) {
            uuid[i] = '4';
        } else {
            if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
            r = rnd & 0xf;
            rnd = rnd >> 4;
            uuid[i] = chars[(i === 19) ? (r & 0x3) | 0x8 : r];
        }
    }
    return uuid.join('');
};

module.exports = C;
},{}],21:[function(require,module,exports){
/**
 * The base implementation of `_.property` without support for deep paths.
 *
 * @private
 * @param {string} key The key of the property to get.
 * @returns {Function} Returns the new function.
 */
function baseProperty(key) {
  return function(object) {
    return object == null ? undefined : object[key];
  };
}

module.exports = baseProperty;

},{}],22:[function(require,module,exports){
var baseProperty = require('./_baseProperty');

/**
 * Gets the "length" property value of `object`.
 *
 * **Note:** This function is used to avoid a
 * [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792) that affects
 * Safari on at least iOS 8.1-8.3 ARM64.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {*} Returns the "length" value.
 */
var getLength = baseProperty('length');

module.exports = getLength;

},{"./_baseProperty":21}],23:[function(require,module,exports){
(function (global){
/**
 * @license
 * lodash 4.8.2 (Custom Build) <https://lodash.com/>
 * Build: `lodash core -o ./dist/lodash.core.js`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
;(function() {

  /** Used as a safe reference for `undefined` in pre-ES5 environments. */
  var undefined;

  /** Used as the semantic version number. */
  var VERSION = '4.8.2';

  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /** Used to compose bitmasks for wrapper metadata. */
  var BIND_FLAG = 1,
      PARTIAL_FLAG = 32;

  /** Used to compose bitmasks for comparison styles. */
  var UNORDERED_COMPARE_FLAG = 1,
      PARTIAL_COMPARE_FLAG = 2;

  /** Used as references for various `Number` constants. */
  var INFINITY = 1 / 0,
      MAX_SAFE_INTEGER = 9007199254740991;

  /** `Object#toString` result references. */
  var argsTag = '[object Arguments]',
      arrayTag = '[object Array]',
      boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      errorTag = '[object Error]',
      funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]',
      numberTag = '[object Number]',
      objectTag = '[object Object]',
      regexpTag = '[object RegExp]',
      stringTag = '[object String]';

  /** Used to match HTML entities and HTML characters. */
  var reUnescapedHtml = /[&<>"'`]/g,
      reHasUnescapedHtml = RegExp(reUnescapedHtml.source);

  /** Used to detect unsigned integer values. */
  var reIsUint = /^(?:0|[1-9]\d*)$/;

  /** Used to map characters to HTML entities. */
  var htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;'
  };

  /** Used to determine if values are of the language type `Object`. */
  var objectTypes = {
    'function': true,
    'object': true
  };

  /** Detect free variable `exports`. */
  var freeExports = (objectTypes[typeof exports] && exports && !exports.nodeType)
    ? exports
    : undefined;

  /** Detect free variable `module`. */
  var freeModule = (objectTypes[typeof module] && module && !module.nodeType)
    ? module
    : undefined;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = (freeModule && freeModule.exports === freeExports)
    ? freeExports
    : undefined;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = checkGlobal(freeExports && freeModule && typeof global == 'object' && global);

  /** Detect free variable `self`. */
  var freeSelf = checkGlobal(objectTypes[typeof self] && self);

  /** Detect free variable `window`. */
  var freeWindow = checkGlobal(objectTypes[typeof window] && window);

  /** Detect `this` as the global object. */
  var thisGlobal = checkGlobal(objectTypes[typeof this] && this);

  /**
   * Used as a reference to the global object.
   *
   * The `this` value is used if it's the global object to avoid Greasemonkey's
   * restricted `window` object, otherwise the `window` object is used.
   */
  var root = freeGlobal ||
    ((freeWindow !== (thisGlobal && thisGlobal.window)) && freeWindow) ||
      freeSelf || thisGlobal || Function('return this')();

  /*--------------------------------------------------------------------------*/

  /**
   * Creates a new array concatenating `array` with `other`.
   *
   * @private
   * @param {Array} array The first array to concatenate.
   * @param {Array} other The second array to concatenate.
   * @returns {Array} Returns the new concatenated array.
   */
  function arrayConcat(array, other) {
    return arrayPush(copyArray(array), values);
  }

  /**
   * Appends the elements of `values` to `array`.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {Array} values The values to append.
   * @returns {Array} Returns `array`.
   */
  function arrayPush(array, values) {
    array.push.apply(array, values);
    return array;
  }

  /**
   * The base implementation of methods like `_.max` and `_.min` which accepts a
   * `comparator` to determine the extremum value.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The iteratee invoked per iteration.
   * @param {Function} comparator The comparator used to compare values.
   * @returns {*} Returns the extremum value.
   */
  function baseExtremum(array, iteratee, comparator) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      var value = array[index],
          current = iteratee(value);

      if (current != null && (computed === undefined
            ? current === current
            : comparator(current, computed)
          )) {
        var computed = current,
            result = value;
      }
    }
    return result;
  }

  /**
   * The base implementation of methods like `_.find` and `_.findKey`, without
   * support for iteratee shorthands, which iterates over `collection` using
   * `eachFunc`.
   *
   * @private
   * @param {Array|Object} collection The collection to search.
   * @param {Function} predicate The function invoked per iteration.
   * @param {Function} eachFunc The function to iterate over `collection`.
   * @param {boolean} [retKey] Specify returning the key of the found element
   *  instead of the element itself.
   * @returns {*} Returns the found element or its key, else `undefined`.
   */
  function baseFind(collection, predicate, eachFunc, retKey) {
    var result;
    eachFunc(collection, function(value, key, collection) {
      if (predicate(value, key, collection)) {
        result = retKey ? key : value;
        return false;
      }
    });
    return result;
  }

  /**
   * The base implementation of `_.reduce` and `_.reduceRight`, without support
   * for iteratee shorthands, which iterates over `collection` using `eachFunc`.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} accumulator The initial value.
   * @param {boolean} initAccum Specify using the first or last element of
   *  `collection` as the initial value.
   * @param {Function} eachFunc The function to iterate over `collection`.
   * @returns {*} Returns the accumulated value.
   */
  function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
    eachFunc(collection, function(value, index, collection) {
      accumulator = initAccum
        ? (initAccum = false, value)
        : iteratee(accumulator, value, index, collection);
    });
    return accumulator;
  }

  /**
   * The base implementation of `_.times` without support for iteratee shorthands
   * or max array length checks.
   *
   * @private
   * @param {number} n The number of times to invoke `iteratee`.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the array of results.
   */
  function baseTimes(n, iteratee) {
    var index = -1,
        result = Array(n);

    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }

  /**
   * The base implementation of `_.values` and `_.valuesIn` which creates an
   * array of `object` property values corresponding to the property names
   * of `props`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} props The property names to get values for.
   * @returns {Object} Returns the array of property values.
   */
  function baseValues(object, props) {
    return baseMap(props, function(key) {
      return object[key];
    });
  }

  /**
   * Checks if `value` is a global object.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {null|Object} Returns `value` if it's a global object, else `null`.
   */
  function checkGlobal(value) {
    return (value && value.Object === Object) ? value : null;
  }

  /**
   * Compares values to sort them in ascending order.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {number} Returns the sort order indicator for `value`.
   */
  function compareAscending(value, other) {
    if (value !== other) {
      var valIsNull = value === null,
          valIsUndef = value === undefined,
          valIsReflexive = value === value;

      var othIsNull = other === null,
          othIsUndef = other === undefined,
          othIsReflexive = other === other;

      if ((value > other && !othIsNull) || !valIsReflexive ||
          (valIsNull && !othIsUndef && othIsReflexive) ||
          (valIsUndef && othIsReflexive)) {
        return 1;
      }
      if ((value < other && !valIsNull) || !othIsReflexive ||
          (othIsNull && !valIsUndef && valIsReflexive) ||
          (othIsUndef && valIsReflexive)) {
        return -1;
      }
    }
    return 0;
  }

  /**
   * Used by `_.escape` to convert characters to HTML entities.
   *
   * @private
   * @param {string} chr The matched character to escape.
   * @returns {string} Returns the escaped character.
   */
  function escapeHtmlChar(chr) {
    return htmlEscapes[chr];
  }

  /**
   * Checks if `value` is a host object in IE < 9.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
   */
  function isHostObject(value) {
    // Many host objects are `Object` objects that can coerce to strings
    // despite having improperly defined `toString` methods.
    var result = false;
    if (value != null && typeof value.toString != 'function') {
      try {
        result = !!(value + '');
      } catch (e) {}
    }
    return result;
  }

  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */
  function isIndex(value, length) {
    value = (typeof value == 'number' || reIsUint.test(value)) ? +value : -1;
    length = length == null ? MAX_SAFE_INTEGER : length;
    return value > -1 && value % 1 == 0 && value < length;
  }

  /**
   * Converts `iterator` to an array.
   *
   * @private
   * @param {Object} iterator The iterator to convert.
   * @returns {Array} Returns the converted array.
   */
  function iteratorToArray(iterator) {
    var data,
        result = [];

    while (!(data = iterator.next()).done) {
      result.push(data.value);
    }
    return result;
  }

  /*--------------------------------------------------------------------------*/

  /** Used for built-in method references. */
  var arrayProto = Array.prototype,
      objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to generate unique IDs. */
  var idCounter = 0;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString = objectProto.toString;

  /** Used to restore the original `_` reference in `_.noConflict`. */
  var oldDash = root._;

  /** Built-in value references. */
  var Reflect = root.Reflect,
      Symbol = root.Symbol,
      Uint8Array = root.Uint8Array,
      enumerate = Reflect ? Reflect.enumerate : undefined,
      objectCreate = Object.create,
      propertyIsEnumerable = objectProto.propertyIsEnumerable;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeIsFinite = root.isFinite,
      nativeKeys = Object.keys,
      nativeMax = Math.max;

  /** Detect if properties shadowing those on `Object.prototype` are non-enumerable. */
  var nonEnumShadows = !propertyIsEnumerable.call({ 'valueOf': 1 }, 'valueOf');

  /*------------------------------------------------------------------------*/

  /**
   * Creates a `lodash` object which wraps `value` to enable implicit method
   * chain sequences. Methods that operate on and return arrays, collections,
   * and functions can be chained together. Methods that retrieve a single value
   * or may return a primitive value will automatically end the chain sequence
   * and return the unwrapped value. Otherwise, the value must be unwrapped
   * with `_#value`.
   *
   * Explicit chain sequences, which must be unwrapped with `_#value`, may be
   * enabled using `_.chain`.
   *
   * The execution of chained methods is lazy, that is, it's deferred until
   * `_#value` is implicitly or explicitly called.
   *
   * Lazy evaluation allows several methods to support shortcut fusion.
   * Shortcut fusion is an optimization to merge iteratee calls; this avoids
   * the creation of intermediate arrays and can greatly reduce the number of
   * iteratee executions. Sections of a chain sequence qualify for shortcut
   * fusion if the section is applied to an array of at least two hundred
   * elements and any iteratees accept only one argument. The heuristic for
   * whether a section qualifies for shortcut fusion is subject to change.
   *
   * Chaining is supported in custom builds as long as the `_#value` method is
   * directly or indirectly included in the build.
   *
   * In addition to lodash methods, wrappers have `Array` and `String` methods.
   *
   * The wrapper `Array` methods are:
   * `concat`, `join`, `pop`, `push`, `shift`, `sort`, `splice`, and `unshift`
   *
   * The wrapper `String` methods are:
   * `replace` and `split`
   *
   * The wrapper methods that support shortcut fusion are:
   * `at`, `compact`, `drop`, `dropRight`, `dropWhile`, `filter`, `find`,
   * `findLast`, `head`, `initial`, `last`, `map`, `reject`, `reverse`, `slice`,
   * `tail`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, and `toArray`
   *
   * The chainable wrapper methods are:
   * `after`, `ary`, `assign`, `assignIn`, `assignInWith`, `assignWith`, `at`,
   * `before`, `bind`, `bindAll`, `bindKey`, `castArray`, `chain`, `chunk`,
   * `commit`, `compact`, `concat`, `conforms`, `constant`, `countBy`, `create`,
   * `curry`, `debounce`, `defaults`, `defaultsDeep`, `defer`, `delay`,
   * `difference`, `differenceBy`, `differenceWith`, `drop`, `dropRight`,
   * `dropRightWhile`, `dropWhile`, `extend`, `extendWith`, `fill`, `filter`,
   * `flatMap`, `flatMapDeep`, `flatMapDepth`, `flatten`, `flattenDeep`,
   * `flattenDepth`, `flip`, `flow`, `flowRight`, `fromPairs`, `functions`,
   * `functionsIn`, `groupBy`, `initial`, `intersection`, `intersectionBy`,
   * `intersectionWith`, `invert`, `invertBy`, `invokeMap`, `iteratee`, `keyBy`,
   * `keys`, `keysIn`, `map`, `mapKeys`, `mapValues`, `matches`, `matchesProperty`,
   * `memoize`, `merge`, `mergeWith`, `method`, `methodOf`, `mixin`, `negate`,
   * `nthArg`, `omit`, `omitBy`, `once`, `orderBy`, `over`, `overArgs`,
   * `overEvery`, `overSome`, `partial`, `partialRight`, `partition`, `pick`,
   * `pickBy`, `plant`, `property`, `propertyOf`, `pull`, `pullAll`, `pullAllBy`,
   * `pullAllWith`, `pullAt`, `push`, `range`, `rangeRight`, `rearg`, `reject`,
   * `remove`, `rest`, `reverse`, `sampleSize`, `set`, `setWith`, `shuffle`,
   * `slice`, `sort`, `sortBy`, `splice`, `spread`, `tail`, `take`, `takeRight`,
   * `takeRightWhile`, `takeWhile`, `tap`, `throttle`, `thru`, `toArray`,
   * `toPairs`, `toPairsIn`, `toPath`, `toPlainObject`, `transform`, `unary`,
   * `union`, `unionBy`, `unionWith`, `uniq`, `uniqBy`, `uniqWith`, `unset`,
   * `unshift`, `unzip`, `unzipWith`, `update`, `updateWith`, `values`,
   * `valuesIn`, `without`, `wrap`, `xor`, `xorBy`, `xorWith`, `zip`,
   * `zipObject`, `zipObjectDeep`, and `zipWith`
   *
   * The wrapper methods that are **not** chainable by default are:
   * `add`, `attempt`, `camelCase`, `capitalize`, `ceil`, `clamp`, `clone`,
   * `cloneDeep`, `cloneDeepWith`, `cloneWith`, `deburr`, `divide`, `each`,
   * `eachRight`, `endsWith`, `eq`, `escape`, `escapeRegExp`, `every`, `find`,
   * `findIndex`, `findKey`, `findLast`, `findLastIndex`, `findLastKey`, `first`,
   * `floor`, `forEach`, `forEachRight`, `forIn`, `forInRight`, `forOwn`,
   * `forOwnRight`, `get`, `gt`, `gte`, `has`, `hasIn`, `head`, `identity`,
   * `includes`, `indexOf`, `inRange`, `invoke`, `isArguments`, `isArray`,
   * `isArrayBuffer`, `isArrayLike`, `isArrayLikeObject`, `isBoolean`, `isBuffer`,
   * `isDate`, `isElement`, `isEmpty`, `isEqual`, `isEqualWith`, `isError`,
   * `isFinite`, `isFunction`, `isInteger`, `isLength`, `isMap`, `isMatch`,
   * `isMatchWith`, `isNaN`, `isNative`, `isNil`, `isNull`, `isNumber`,
   * `isObject`, `isObjectLike`, `isPlainObject`, `isRegExp`, `isSafeInteger`,
   * `isSet`, `isString`, `isUndefined`, `isTypedArray`, `isWeakMap`, `isWeakSet`,
   * `join`, `kebabCase`, `last`, `lastIndexOf`, `lowerCase`, `lowerFirst`,
   * `lt`, `lte`, `max`, `maxBy`, `mean`, `meanBy`, `min`, `minBy`, `multiply`,
   * `noConflict`, `noop`, `now`, `pad`, `padEnd`, `padStart`, `parseInt`,
   * `pop`, `random`, `reduce`, `reduceRight`, `repeat`, `result`, `round`,
   * `runInContext`, `sample`, `shift`, `size`, `snakeCase`, `some`, `sortedIndex`,
   * `sortedIndexBy`, `sortedLastIndex`, `sortedLastIndexBy`, `startCase`,
   * `startsWith`, `subtract`, `sum`, `sumBy`, `template`, `times`, `toInteger`,
   * `toJSON`, `toLength`, `toLower`, `toNumber`, `toSafeInteger`, `toString`,
   * `toUpper`, `trim`, `trimEnd`, `trimStart`, `truncate`, `unescape`,
   * `uniqueId`, `upperCase`, `upperFirst`, `value`, and `words`
   *
   * @name _
   * @constructor
   * @category Seq
   * @param {*} value The value to wrap in a `lodash` instance.
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * function square(n) {
   *   return n * n;
   * }
   *
   * var wrapped = _([1, 2, 3]);
   *
   * // Returns an unwrapped value.
   * wrapped.reduce(_.add);
   * // => 6
   *
   * // Returns a wrapped value.
   * var squares = wrapped.map(square);
   *
   * _.isArray(squares);
   * // => false
   *
   * _.isArray(squares.value());
   * // => true
   */
  function lodash(value) {
    return value instanceof LodashWrapper
      ? value
      : new LodashWrapper(value);
  }

  /**
   * The base constructor for creating `lodash` wrapper objects.
   *
   * @private
   * @param {*} value The value to wrap.
   * @param {boolean} [chainAll] Enable explicit method chain sequences.
   */
  function LodashWrapper(value, chainAll) {
    this.__wrapped__ = value;
    this.__actions__ = [];
    this.__chain__ = !!chainAll;
  }

  LodashWrapper.prototype = baseCreate(lodash.prototype);
  LodashWrapper.prototype.constructor = LodashWrapper;

  /*------------------------------------------------------------------------*/

  /**
   * Used by `_.defaults` to customize its `_.assignIn` use.
   *
   * @private
   * @param {*} objValue The destination value.
   * @param {*} srcValue The source value.
   * @param {string} key The key of the property to assign.
   * @param {Object} object The parent object of `objValue`.
   * @returns {*} Returns the value to assign.
   */
  function assignInDefaults(objValue, srcValue, key, object) {
    if (objValue === undefined ||
        (eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key))) {
      return srcValue;
    }
    return objValue;
  }

  /**
   * Assigns `value` to `key` of `object` if the existing value is not equivalent
   * using [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
   * for equality comparisons.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {string} key The key of the property to assign.
   * @param {*} value The value to assign.
   */
  function assignValue(object, key, value) {
    var objValue = object[key];
    if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
        (value === undefined && !(key in object))) {
      object[key] = value;
    }
  }

  /**
   * The base implementation of `_.create` without support for assigning
   * properties to the created object.
   *
   * @private
   * @param {Object} prototype The object to inherit from.
   * @returns {Object} Returns the new object.
   */
  function baseCreate(proto) {
    return isObject(proto) ? objectCreate(proto) : {};
  }

  /**
   * The base implementation of `_.delay` and `_.defer` which accepts an array
   * of `func` arguments.
   *
   * @private
   * @param {Function} func The function to delay.
   * @param {number} wait The number of milliseconds to delay invocation.
   * @param {Object} args The arguments to provide to `func`.
   * @returns {number} Returns the timer id.
   */
  function baseDelay(func, wait, args) {
    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    return setTimeout(function() { func.apply(undefined, args); }, wait);
  }

  /**
   * The base implementation of `_.forEach` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array|Object} Returns `collection`.
   */
  var baseEach = createBaseEach(baseForOwn);

  /**
   * The base implementation of `_.every` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if all elements pass the predicate check,
   *  else `false`
   */
  function baseEvery(collection, predicate) {
    var result = true;
    baseEach(collection, function(value, index, collection) {
      result = !!predicate(value, index, collection);
      return result;
    });
    return result;
  }

  /**
   * The base implementation of `_.filter` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function baseFilter(collection, predicate) {
    var result = [];
    baseEach(collection, function(value, index, collection) {
      if (predicate(value, index, collection)) {
        result.push(value);
      }
    });
    return result;
  }

  /**
   * The base implementation of `_.flatten` with support for restricting flattening.
   *
   * @private
   * @param {Array} array The array to flatten.
   * @param {number} depth The maximum recursion depth.
   * @param {boolean} [isStrict] Restrict flattening to arrays-like objects.
   * @param {Array} [result=[]] The initial result value.
   * @returns {Array} Returns the new flattened array.
   */
  function baseFlatten(array, depth, isStrict, result) {
    result || (result = []);

    var index = -1,
        length = array.length;

    while (++index < length) {
      var value = array[index];
      if (depth > 0 && isArrayLikeObject(value) &&
          (isStrict || isArray(value) || isArguments(value))) {
        if (depth > 1) {
          // Recursively flatten arrays (susceptible to call stack limits).
          baseFlatten(value, depth - 1, isStrict, result);
        } else {
          arrayPush(result, value);
        }
      } else if (!isStrict) {
        result[result.length] = value;
      }
    }
    return result;
  }

  /**
   * The base implementation of `baseForOwn` which iterates over `object`
   * properties returned by `keysFunc` invoking `iteratee` for each property.
   * Iteratee functions may exit iteration early by explicitly returning `false`.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @returns {Object} Returns `object`.
   */
  var baseFor = createBaseFor();

  /**
   * The base implementation of `_.forOwn` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Object} Returns `object`.
   */
  function baseForOwn(object, iteratee) {
    return object && baseFor(object, iteratee, keys);
  }

  /**
   * The base implementation of `_.functions` which creates an array of
   * `object` function property names filtered from `props`.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @param {Array} props The property names to filter.
   * @returns {Array} Returns the new array of filtered property names.
   */
  function baseFunctions(object, props) {
    return baseFilter(props, function(key) {
      return isFunction(object[key]);
    });
  }

  /**
   * The base implementation of `_.isEqual` which supports partial comparisons
   * and tracks traversed objects.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @param {Function} [customizer] The function to customize comparisons.
   * @param {boolean} [bitmask] The bitmask of comparison flags.
   *  The bitmask may be composed of the following flags:
   *     1 - Unordered comparison
   *     2 - Partial comparison
   * @param {Object} [stack] Tracks traversed `value` and `other` objects.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   */
  function baseIsEqual(value, other, customizer, bitmask, stack) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || (!isObject(value) && !isObjectLike(other))) {
      return value !== value && other !== other;
    }
    return baseIsEqualDeep(value, other, baseIsEqual, customizer, bitmask, stack);
  }

  /**
   * A specialized version of `baseIsEqual` for arrays and objects which performs
   * deep comparisons and tracks traversed objects enabling objects with circular
   * references to be compared.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} [customizer] The function to customize comparisons.
   * @param {number} [bitmask] The bitmask of comparison flags. See `baseIsEqual`
   *  for more details.
   * @param {Object} [stack] Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function baseIsEqualDeep(object, other, equalFunc, customizer, bitmask, stack) {
    var objIsArr = isArray(object),
        othIsArr = isArray(other),
        objTag = arrayTag,
        othTag = arrayTag;

    if (!objIsArr) {
      objTag = objectToString.call(object);
      objTag = objTag == argsTag ? objectTag : objTag;
    }
    if (!othIsArr) {
      othTag = objectToString.call(other);
      othTag = othTag == argsTag ? objectTag : othTag;
    }
    var objIsObj = objTag == objectTag && !isHostObject(object),
        othIsObj = othTag == objectTag && !isHostObject(other),
        isSameTag = objTag == othTag;

    stack || (stack = []);
    var stacked = find(stack, function(entry) {
      return entry[0] === object;
    });
    if (stacked && stacked[1]) {
      return stacked[1] == other;
    }
    stack.push([object, other]);
    if (isSameTag && !objIsObj) {
      var result = (objIsArr || isTypedArray(object))
        ? equalArrays(object, other, equalFunc, customizer, bitmask, stack)
        : equalByTag(object, other, objTag, equalFunc, customizer, bitmask, stack);
      stack.pop();
      return result;
    }
    if (!(bitmask & PARTIAL_COMPARE_FLAG)) {
      var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
          othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

      if (objIsWrapped || othIsWrapped) {
        var objUnwrapped = objIsWrapped ? object.value() : object,
            othUnwrapped = othIsWrapped ? other.value() : other;

        var result = equalFunc(objUnwrapped, othUnwrapped, customizer, bitmask, stack);
        stack.pop();
        return result;
      }
    }
    if (!isSameTag) {
      return false;
    }
    var result = equalObjects(object, other, equalFunc, customizer, bitmask, stack);
    stack.pop();
    return result;
  }

  /**
   * The base implementation of `_.iteratee`.
   *
   * @private
   * @param {*} [value=_.identity] The value to convert to an iteratee.
   * @returns {Function} Returns the iteratee.
   */
  function baseIteratee(func) {
    if (typeof func == 'function') {
      return func;
    }
    if (func == null) {
      return identity;
    }
    return (typeof func == 'object' ? baseMatches : baseProperty)(func);
  }

  /**
   * The base implementation of `_.keys` which doesn't skip the constructor
   * property of prototypes or treat sparse arrays as dense.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function baseKeys(object) {
    return nativeKeys(Object(object));
  }

  /**
   * The base implementation of `_.keysIn` which doesn't skip the constructor
   * property of prototypes or treat sparse arrays as dense.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function baseKeysIn(object) {
    object = object == null ? object : Object(object);

    var result = [];
    for (var key in object) {
      result.push(key);
    }
    return result;
  }

  // Fallback for IE < 9 with es6-shim.
  if (enumerate && !propertyIsEnumerable.call({ 'valueOf': 1 }, 'valueOf')) {
    baseKeysIn = function(object) {
      return iteratorToArray(enumerate(object));
    };
  }

  /**
   * The base implementation of `_.map` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function baseMap(collection, iteratee) {
    var index = -1,
        result = isArrayLike(collection) ? Array(collection.length) : [];

    baseEach(collection, function(value, key, collection) {
      result[++index] = iteratee(value, key, collection);
    });
    return result;
  }

  /**
   * The base implementation of `_.matches` which doesn't clone `source`.
   *
   * @private
   * @param {Object} source The object of property values to match.
   * @returns {Function} Returns the new function.
   */
  function baseMatches(source) {
    var props = keys(source);
    return function(object) {
      var length = props.length;
      if (object == null) {
        return !length;
      }
      object = Object(object);
      while (length--) {
        var key = props[length];
        if (!(key in object &&
              baseIsEqual(source[key], object[key], undefined, UNORDERED_COMPARE_FLAG | PARTIAL_COMPARE_FLAG)
            )) {
          return false;
        }
      }
      return true;
    };
  }

  /**
   * The base implementation of `_.pick` without support for individual
   * property identifiers.
   *
   * @private
   * @param {Object} object The source object.
   * @param {string[]} props The property identifiers to pick.
   * @returns {Object} Returns the new object.
   */
  function basePick(object, props) {
    object = Object(object);
    return reduce(props, function(result, key) {
      if (key in object) {
        result[key] = object[key];
      }
      return result;
    }, {});
  }

  /**
   * The base implementation of `_.property` without support for deep paths.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @returns {Function} Returns the new function.
   */
  function baseProperty(key) {
    return function(object) {
      return object == null ? undefined : object[key];
    };
  }

  /**
   * The base implementation of `_.slice` without an iteratee call guard.
   *
   * @private
   * @param {Array} array The array to slice.
   * @param {number} [start=0] The start position.
   * @param {number} [end=array.length] The end position.
   * @returns {Array} Returns the slice of `array`.
   */
  function baseSlice(array, start, end) {
    var index = -1,
        length = array.length;

    if (start < 0) {
      start = -start > length ? 0 : (length + start);
    }
    end = end > length ? length : end;
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : ((end - start) >>> 0);
    start >>>= 0;

    var result = Array(length);
    while (++index < length) {
      result[index] = array[index + start];
    }
    return result;
  }

  /**
   * Copies the values of `source` to `array`.
   *
   * @private
   * @param {Array} source The array to copy values from.
   * @param {Array} [array=[]] The array to copy values to.
   * @returns {Array} Returns `array`.
   */
  function copyArray(source) {
    return baseSlice(source, 0, source.length);
  }

  /**
   * The base implementation of `_.some` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if any element passes the predicate check,
   *  else `false`.
   */
  function baseSome(collection, predicate) {
    var result;

    baseEach(collection, function(value, index, collection) {
      result = predicate(value, index, collection);
      return !result;
    });
    return !!result;
  }

  /**
   * The base implementation of `wrapperValue` which returns the result of
   * performing a sequence of actions on the unwrapped `value`, where each
   * successive action is supplied the return value of the previous.
   *
   * @private
   * @param {*} value The unwrapped value.
   * @param {Array} actions Actions to perform to resolve the unwrapped value.
   * @returns {*} Returns the resolved value.
   */
  function baseWrapperValue(value, actions) {
    var result = value;
    return reduce(actions, function(result, action) {
      return action.func.apply(action.thisArg, arrayPush([result], action.args));
    }, result);
  }

  /**
   * Copies properties of `source` to `object`.
   *
   * @private
   * @param {Object} source The object to copy properties from.
   * @param {Array} props The property identifiers to copy.
   * @param {Object} [object={}] The object to copy properties to.
   * @returns {Object} Returns `object`.
   */
  var copyObject = copyObjectWith;

  /**
   * This function is like `copyObject` except that it accepts a function to
   * customize copied values.
   *
   * @private
   * @param {Object} source The object to copy properties from.
   * @param {Array} props The property identifiers to copy.
   * @param {Object} [object={}] The object to copy properties to.
   * @param {Function} [customizer] The function to customize copied values.
   * @returns {Object} Returns `object`.
   */
  function copyObjectWith(source, props, object, customizer) {
    object || (object = {});

    var index = -1,
        length = props.length;

    while (++index < length) {
      var key = props[index];

      var newValue = customizer
        ? customizer(object[key], source[key], key, object, source)
        : source[key];

      assignValue(object, key, newValue);
    }
    return object;
  }

  /**
   * Creates a function like `_.assign`.
   *
   * @private
   * @param {Function} assigner The function to assign values.
   * @returns {Function} Returns the new assigner function.
   */
  function createAssigner(assigner) {
    return rest(function(object, sources) {
      var index = -1,
          length = sources.length,
          customizer = length > 1 ? sources[length - 1] : undefined;

      customizer = typeof customizer == 'function'
        ? (length--, customizer)
        : undefined;

      object = Object(object);
      while (++index < length) {
        var source = sources[index];
        if (source) {
          assigner(object, source, index, customizer);
        }
      }
      return object;
    });
  }

  /**
   * Creates a `baseEach` or `baseEachRight` function.
   *
   * @private
   * @param {Function} eachFunc The function to iterate over a collection.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseEach(eachFunc, fromRight) {
    return function(collection, iteratee) {
      if (collection == null) {
        return collection;
      }
      if (!isArrayLike(collection)) {
        return eachFunc(collection, iteratee);
      }
      var length = collection.length,
          index = fromRight ? length : -1,
          iterable = Object(collection);

      while ((fromRight ? index-- : ++index < length)) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection;
    };
  }

  /**
   * Creates a base function for methods like `_.forIn` and `_.forOwn`.
   *
   * @private
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseFor(fromRight) {
    return function(object, iteratee, keysFunc) {
      var index = -1,
          iterable = Object(object),
          props = keysFunc(object),
          length = props.length;

      while (length--) {
        var key = props[fromRight ? length : ++index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object;
    };
  }

  /**
   * Creates a function that produces an instance of `Ctor` regardless of
   * whether it was invoked as part of a `new` expression or by `call` or `apply`.
   *
   * @private
   * @param {Function} Ctor The constructor to wrap.
   * @returns {Function} Returns the new wrapped function.
   */
  function createCtorWrapper(Ctor) {
    return function() {
      // Use a `switch` statement to work with class constructors. See
      // http://ecma-international.org/ecma-262/6.0/#sec-ecmascript-function-objects-call-thisargument-argumentslist
      // for more details.
      var args = arguments;
      var thisBinding = baseCreate(Ctor.prototype),
          result = Ctor.apply(thisBinding, args);

      // Mimic the constructor's `return` behavior.
      // See https://es5.github.io/#x13.2.2 for more details.
      return isObject(result) ? result : thisBinding;
    };
  }

  /**
   * Creates a function that wraps `func` to invoke it with the `this` binding
   * of `thisArg` and `partials` prepended to the arguments it receives.
   *
   * @private
   * @param {Function} func The function to wrap.
   * @param {number} bitmask The bitmask of wrapper flags. See `createWrapper`
   *  for more details.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {Array} partials The arguments to prepend to those provided to
   *  the new function.
   * @returns {Function} Returns the new wrapped function.
   */
  function createPartialWrapper(func, bitmask, thisArg, partials) {
    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    var isBind = bitmask & BIND_FLAG,
        Ctor = createCtorWrapper(func);

    function wrapper() {
      var argsIndex = -1,
          argsLength = arguments.length,
          leftIndex = -1,
          leftLength = partials.length,
          args = Array(leftLength + argsLength),
          fn = (this && this !== root && this instanceof wrapper) ? Ctor : func;

      while (++leftIndex < leftLength) {
        args[leftIndex] = partials[leftIndex];
      }
      while (argsLength--) {
        args[leftIndex++] = arguments[++argsIndex];
      }
      return fn.apply(isBind ? thisArg : this, args);
    }
    return wrapper;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for arrays with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Array} array The array to compare.
   * @param {Array} other The other array to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} customizer The function to customize comparisons.
   * @param {number} bitmask The bitmask of comparison flags. See `baseIsEqual`
   *  for more details.
   * @param {Object} stack Tracks traversed `array` and `other` objects.
   * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
   */
  function equalArrays(array, other, equalFunc, customizer, bitmask, stack) {
    var index = -1,
        isPartial = bitmask & PARTIAL_COMPARE_FLAG,
        isUnordered = bitmask & UNORDERED_COMPARE_FLAG,
        arrLength = array.length,
        othLength = other.length;

    if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
      return false;
    }
    var result = true;

    // Ignore non-index properties.
    while (++index < arrLength) {
      var arrValue = array[index],
          othValue = other[index];

      var compared;
      if (compared !== undefined) {
        if (compared) {
          continue;
        }
        result = false;
        break;
      }
      // Recursively compare arrays (susceptible to call stack limits).
      if (isUnordered) {
        if (!baseSome(other, function(othValue) {
              return arrValue === othValue ||
                equalFunc(arrValue, othValue, customizer, bitmask, stack);
            })) {
          result = false;
          break;
        }
      } else if (!(
            arrValue === othValue ||
              equalFunc(arrValue, othValue, customizer, bitmask, stack)
          )) {
        result = false;
        break;
      }
    }
    return result;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for comparing objects of
   * the same `toStringTag`.
   *
   * **Note:** This function only supports comparing values with tags of
   * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {string} tag The `toStringTag` of the objects to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} customizer The function to customize comparisons.
   * @param {number} bitmask The bitmask of comparison flags. See `baseIsEqual`
   *  for more details.
   * @param {Object} stack Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalByTag(object, other, tag, equalFunc, customizer, bitmask, stack) {
    switch (tag) {

      case boolTag:
      case dateTag:
        // Coerce dates and booleans to numbers, dates to milliseconds and
        // booleans to `1` or `0` treating invalid dates coerced to `NaN` as
        // not equal.
        return +object == +other;

      case errorTag:
        return object.name == other.name && object.message == other.message;

      case numberTag:
        // Treat `NaN` vs. `NaN` as equal.
        return (object != +object) ? other != +other : object == +other;

      case regexpTag:
      case stringTag:
        // Coerce regexes to strings and treat strings, primitives and objects,
        // as equal. See http://www.ecma-international.org/ecma-262/6.0/#sec-regexp.prototype.tostring
        // for more details.
        return object == (other + '');

    }
    return false;
  }

  /**
   * A specialized version of `baseIsEqualDeep` for objects with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Function} customizer The function to customize comparisons.
   * @param {number} bitmask The bitmask of comparison flags. See `baseIsEqual`
   *  for more details.
   * @param {Object} stack Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalObjects(object, other, equalFunc, customizer, bitmask, stack) {
    var isPartial = bitmask & PARTIAL_COMPARE_FLAG,
        objProps = keys(object),
        objLength = objProps.length,
        othProps = keys(other),
        othLength = othProps.length;

    if (objLength != othLength && !isPartial) {
      return false;
    }
    var index = objLength;
    while (index--) {
      var key = objProps[index];
      if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
        return false;
      }
    }
    var result = true;

    var skipCtor = isPartial;
    while (++index < objLength) {
      key = objProps[index];
      var objValue = object[key],
          othValue = other[key];

      var compared;
      // Recursively compare objects (susceptible to call stack limits).
      if (!(compared === undefined
            ? (objValue === othValue || equalFunc(objValue, othValue, customizer, bitmask, stack))
            : compared
          )) {
        result = false;
        break;
      }
      skipCtor || (skipCtor = key == 'constructor');
    }
    if (result && !skipCtor) {
      var objCtor = object.constructor,
          othCtor = other.constructor;

      // Non `Object` object instances with different constructors are not equal.
      if (objCtor != othCtor &&
          ('constructor' in object && 'constructor' in other) &&
          !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
            typeof othCtor == 'function' && othCtor instanceof othCtor)) {
        result = false;
      }
    }
    return result;
  }

  /**
   * Gets the "length" property value of `object`.
   *
   * **Note:** This function is used to avoid a
   * [JIT bug](https://bugs.webkit.org/show_bug.cgi?id=142792) that affects
   * Safari on at least iOS 8.1-8.3 ARM64.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {*} Returns the "length" value.
   */
  var getLength = baseProperty('length');

  /**
   * Creates an array of index keys for `object` values of arrays,
   * `arguments` objects, and strings, otherwise `null` is returned.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array|null} Returns index keys, else `null`.
   */
  function indexKeys(object) {
    var length = object ? object.length : undefined;
    if (isLength(length) &&
        (isArray(object) || isString(object) || isArguments(object))) {
      return baseTimes(length, String);
    }
    return null;
  }

  /**
   * Checks if `value` is likely a prototype object.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
   */
  function isPrototype(value) {
    var Ctor = value && value.constructor,
        proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

    return value === proto;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates an array with all falsey values removed. The values `false`, `null`,
   * `0`, `""`, `undefined`, and `NaN` are falsey.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to compact.
   * @returns {Array} Returns the new array of filtered values.
   * @example
   *
   * _.compact([0, 1, false, 2, '', 3]);
   * // => [1, 2, 3]
   */
  function compact(array) {
    return baseFilter(array, Boolean);
  }

  /**
   * Creates a new array concatenating `array` with any additional arrays
   * and/or values.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Array
   * @param {Array} array The array to concatenate.
   * @param {...*} [values] The values to concatenate.
   * @returns {Array} Returns the new concatenated array.
   * @example
   *
   * var array = [1];
   * var other = _.concat(array, 2, [3], [[4]]);
   *
   * console.log(other);
   * // => [1, 2, 3, [4]]
   *
   * console.log(array);
   * // => [1]
   */
  function concat() {
    var length = arguments.length,
        array = castArray(arguments[0]);

    if (length < 2) {
      return length ? copyArray(array) : [];
    }
    var args = Array(length - 1);
    while (length--) {
      args[length - 1] = arguments[length];
    }
    return arrayConcat(array, baseFlatten(args, 1));
  }

  /**
   * Flattens `array` a single level deep.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to flatten.
   * @returns {Array} Returns the new flattened array.
   * @example
   *
   * _.flatten([1, [2, [3, [4]], 5]]);
   * // => [1, 2, [3, [4]], 5]
   */
  function flatten(array) {
    var length = array ? array.length : 0;
    return length ? baseFlatten(array, 1) : [];
  }

  /**
   * Recursively flattens `array`.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Array
   * @param {Array} array The array to flatten.
   * @returns {Array} Returns the new flattened array.
   * @example
   *
   * _.flattenDeep([1, [2, [3, [4]], 5]]);
   * // => [1, 2, 3, 4, 5]
   */
  function flattenDeep(array) {
    var length = array ? array.length : 0;
    return length ? baseFlatten(array, INFINITY) : [];
  }

  /**
   * Gets the first element of `array`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @alias first
   * @category Array
   * @param {Array} array The array to query.
   * @returns {*} Returns the first element of `array`.
   * @example
   *
   * _.head([1, 2, 3]);
   * // => 1
   *
   * _.head([]);
   * // => undefined
   */
  function head(array) {
    return array ? array[0] : undefined;
  }

  /**
   * Gets the index at which the first occurrence of `value` is found in `array`
   * using [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
   * for equality comparisons. If `fromIndex` is negative, it's used as the offset
   * from the end of `array`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to search.
   * @param {*} value The value to search for.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   * @example
   *
   * _.indexOf([1, 2, 1, 2], 2);
   * // => 1
   *
   * // Search from the `fromIndex`.
   * _.indexOf([1, 2, 1, 2], 2, 2);
   * // => 3
   */
  function indexOf(array, value, fromIndex) {
    var length = array ? array.length : 0;
    if (typeof fromIndex == 'number') {
      fromIndex = fromIndex < 0 ? nativeMax(length + fromIndex, 0) : fromIndex;
    } else {
      fromIndex = 0;
    }
    var index = (fromIndex || 0) - 1,
        isReflexive = value === value;

    while (++index < length) {
      var other = array[index];
      if ((isReflexive ? other === value : other !== other)) {
        return index;
      }
    }
    return -1;
  }

  /**
   * Gets the last element of `array`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to query.
   * @returns {*} Returns the last element of `array`.
   * @example
   *
   * _.last([1, 2, 3]);
   * // => 3
   */
  function last(array) {
    var length = array ? array.length : 0;
    return length ? array[length - 1] : undefined;
  }

  /**
   * Creates a slice of `array` from `start` up to, but not including, `end`.
   *
   * **Note:** This method is used instead of
   * [`Array#slice`](https://mdn.io/Array/slice) to ensure dense arrays are
   * returned.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Array
   * @param {Array} array The array to slice.
   * @param {number} [start=0] The start position.
   * @param {number} [end=array.length] The end position.
   * @returns {Array} Returns the slice of `array`.
   */
  function slice(array, start, end) {
    var length = array ? array.length : 0;
    start = start == null ? 0 : +start;
    end = end === undefined ? length : +end;
    return length ? baseSlice(array, start, end) : [];
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates a `lodash` wrapper instance that wraps `value` with explicit method
   * chain sequences enabled. The result of such sequences must be unwrapped
   * with `_#value`.
   *
   * @static
   * @memberOf _
   * @since 1.3.0
   * @category Seq
   * @param {*} value The value to wrap.
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var users = [
   *   { 'user': 'barney',  'age': 36 },
   *   { 'user': 'fred',    'age': 40 },
   *   { 'user': 'pebbles', 'age': 1 }
   * ];
   *
   * var youngest = _
   *   .chain(users)
   *   .sortBy('age')
   *   .map(function(o) {
   *     return o.user + ' is ' + o.age;
   *   })
   *   .head()
   *   .value();
   * // => 'pebbles is 1'
   */
  function chain(value) {
    var result = lodash(value);
    result.__chain__ = true;
    return result;
  }

  /**
   * This method invokes `interceptor` and returns `value`. The interceptor
   * is invoked with one argument; (value). The purpose of this method is to
   * "tap into" a method chain sequence in order to modify intermediate results.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Seq
   * @param {*} value The value to provide to `interceptor`.
   * @param {Function} interceptor The function to invoke.
   * @returns {*} Returns `value`.
   * @example
   *
   * _([1, 2, 3])
   *  .tap(function(array) {
   *    // Mutate input array.
   *    array.pop();
   *  })
   *  .reverse()
   *  .value();
   * // => [2, 1]
   */
  function tap(value, interceptor) {
    interceptor(value);
    return value;
  }

  /**
   * This method is like `_.tap` except that it returns the result of `interceptor`.
   * The purpose of this method is to "pass thru" values replacing intermediate
   * results in a method chain sequence.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Seq
   * @param {*} value The value to provide to `interceptor`.
   * @param {Function} interceptor The function to invoke.
   * @returns {*} Returns the result of `interceptor`.
   * @example
   *
   * _('  abc  ')
   *  .chain()
   *  .trim()
   *  .thru(function(value) {
   *    return [value];
   *  })
   *  .value();
   * // => ['abc']
   */
  function thru(value, interceptor) {
    return interceptor(value);
  }

  /**
   * Creates a `lodash` wrapper instance with explicit method chain sequences enabled.
   *
   * @name chain
   * @memberOf _
   * @since 0.1.0
   * @category Seq
   * @returns {Object} Returns the new `lodash` wrapper instance.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 40 }
   * ];
   *
   * // A sequence without explicit chaining.
   * _(users).head();
   * // => { 'user': 'barney', 'age': 36 }
   *
   * // A sequence with explicit chaining.
   * _(users)
   *   .chain()
   *   .head()
   *   .pick('user')
   *   .value();
   * // => { 'user': 'barney' }
   */
  function wrapperChain() {
    return chain(this);
  }

  /**
   * Executes the chain sequence to resolve the unwrapped value.
   *
   * @name value
   * @memberOf _
   * @since 0.1.0
   * @alias toJSON, valueOf
   * @category Seq
   * @returns {*} Returns the resolved unwrapped value.
   * @example
   *
   * _([1, 2, 3]).value();
   * // => [1, 2, 3]
   */
  function wrapperValue() {
    return baseWrapperValue(this.__wrapped__, this.__actions__);
  }

  /*------------------------------------------------------------------------*/

  /**
   * Checks if `predicate` returns truthy for **all** elements of `collection`.
   * Iteration is stopped once `predicate` returns falsey. The predicate is
   * invoked with three arguments: (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Array|Function|Object|string} [predicate=_.identity]
   *  The function invoked per iteration.
   * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
   * @returns {boolean} Returns `true` if all elements pass the predicate check,
   *  else `false`.
   * @example
   *
   * _.every([true, 1, null, 'yes'], Boolean);
   * // => false
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': false },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * // The `_.matches` iteratee shorthand.
   * _.every(users, { 'user': 'barney', 'active': false });
   * // => false
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.every(users, ['active', false]);
   * // => true
   *
   * // The `_.property` iteratee shorthand.
   * _.every(users, 'active');
   * // => false
   */
  function every(collection, predicate, guard) {
    predicate = guard ? undefined : predicate;
    return baseEvery(collection, baseIteratee(predicate));
  }

  /**
   * Iterates over elements of `collection`, returning an array of all elements
   * `predicate` returns truthy for. The predicate is invoked with three
   * arguments: (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Array|Function|Object|string} [predicate=_.identity]
   *  The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': true },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * _.filter(users, function(o) { return !o.active; });
   * // => objects for ['fred']
   *
   * // The `_.matches` iteratee shorthand.
   * _.filter(users, { 'age': 36, 'active': true });
   * // => objects for ['barney']
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.filter(users, ['active', false]);
   * // => objects for ['fred']
   *
   * // The `_.property` iteratee shorthand.
   * _.filter(users, 'active');
   * // => objects for ['barney']
   */
  function filter(collection, predicate) {
    return baseFilter(collection, baseIteratee(predicate));
  }

  /**
   * Iterates over elements of `collection`, returning the first element
   * `predicate` returns truthy for. The predicate is invoked with three
   * arguments: (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to search.
   * @param {Array|Function|Object|string} [predicate=_.identity]
   *  The function invoked per iteration.
   * @returns {*} Returns the matched element, else `undefined`.
   * @example
   *
   * var users = [
   *   { 'user': 'barney',  'age': 36, 'active': true },
   *   { 'user': 'fred',    'age': 40, 'active': false },
   *   { 'user': 'pebbles', 'age': 1,  'active': true }
   * ];
   *
   * _.find(users, function(o) { return o.age < 40; });
   * // => object for 'barney'
   *
   * // The `_.matches` iteratee shorthand.
   * _.find(users, { 'age': 1, 'active': true });
   * // => object for 'pebbles'
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.find(users, ['active', false]);
   * // => object for 'fred'
   *
   * // The `_.property` iteratee shorthand.
   * _.find(users, 'active');
   * // => object for 'barney'
   */
  function find(collection, predicate) {
    return baseFind(collection, baseIteratee(predicate), baseEach);
  }

  /**
   * Iterates over elements of `collection` invoking `iteratee` for each element.
   * The iteratee is invoked with three arguments: (value, index|key, collection).
   * Iteratee functions may exit iteration early by explicitly returning `false`.
   *
   * **Note:** As with other "Collections" methods, objects with a "length"
   * property are iterated like arrays. To avoid this behavior use `_.forIn`
   * or `_.forOwn` for object iteration.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @alias each
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @returns {Array|Object} Returns `collection`.
   * @example
   *
   * _([1, 2]).forEach(function(value) {
   *   console.log(value);
   * });
   * // => Logs `1` then `2`.
   *
   * _.forEach({ 'a': 1, 'b': 2 }, function(value, key) {
   *   console.log(key);
   * });
   * // => Logs 'a' then 'b' (iteration order is not guaranteed).
   */
  function forEach(collection, iteratee) {
    return baseEach(collection, baseIteratee(iteratee));
  }

  /**
   * Creates an array of values by running each element in `collection` thru
   * `iteratee`. The iteratee is invoked with three arguments:
   * (value, index|key, collection).
   *
   * Many lodash methods are guarded to work as iteratees for methods like
   * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
   *
   * The guarded methods are:
   * `ary`, `chunk`, `curry`, `curryRight`, `drop`, `dropRight`, `every`,
   * `fill`, `invert`, `parseInt`, `random`, `range`, `rangeRight`, `repeat`,
   * `sampleSize`, `slice`, `some`, `sortBy`, `take`, `takeRight`, `template`,
   * `trim`, `trimEnd`, `trimStart`, and `words`
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Array|Function|Object|string} [iteratee=_.identity]
   *  The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   * @example
   *
   * function square(n) {
   *   return n * n;
   * }
   *
   * _.map([4, 8], square);
   * // => [16, 64]
   *
   * _.map({ 'a': 4, 'b': 8 }, square);
   * // => [16, 64] (iteration order is not guaranteed)
   *
   * var users = [
   *   { 'user': 'barney' },
   *   { 'user': 'fred' }
   * ];
   *
   * // The `_.property` iteratee shorthand.
   * _.map(users, 'user');
   * // => ['barney', 'fred']
   */
  function map(collection, iteratee) {
    return baseMap(collection, baseIteratee(iteratee));
  }

  /**
   * Reduces `collection` to a value which is the accumulated result of running
   * each element in `collection` thru `iteratee`, where each successive
   * invocation is supplied the return value of the previous. If `accumulator`
   * is not given the first element of `collection` is used as the initial
   * value. The iteratee is invoked with four arguments:
   * (accumulator, value, index|key, collection).
   *
   * Many lodash methods are guarded to work as iteratees for methods like
   * `_.reduce`, `_.reduceRight`, and `_.transform`.
   *
   * The guarded methods are:
   * `assign`, `defaults`, `defaultsDeep`, `includes`, `merge`, `orderBy`,
   * and `sortBy`
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @param {*} [accumulator] The initial value.
   * @returns {*} Returns the accumulated value.
   * @example
   *
   * _.reduce([1, 2], function(sum, n) {
   *   return sum + n;
   * }, 0);
   * // => 3
   *
   * _.reduce({ 'a': 1, 'b': 2, 'c': 1 }, function(result, value, key) {
   *   (result[value] || (result[value] = [])).push(key);
   *   return result;
   * }, {});
   * // => { '1': ['a', 'c'], '2': ['b'] } (iteration order is not guaranteed)
   */
  function reduce(collection, iteratee, accumulator) {
    return baseReduce(collection, baseIteratee(iteratee), accumulator, arguments.length < 3, baseEach);
  }

  /**
   * Gets the size of `collection` by returning its length for array-like
   * values or the number of own enumerable string keyed properties for objects.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to inspect.
   * @returns {number} Returns the collection size.
   * @example
   *
   * _.size([1, 2, 3]);
   * // => 3
   *
   * _.size({ 'a': 1, 'b': 2 });
   * // => 2
   *
   * _.size('pebbles');
   * // => 7
   */
  function size(collection) {
    if (collection == null) {
      return 0;
    }
    collection = isArrayLike(collection) ? collection : keys(collection);
    return collection.length;
  }

  /**
   * Checks if `predicate` returns truthy for **any** element of `collection`.
   * Iteration is stopped once `predicate` returns truthy. The predicate is
   * invoked with three arguments: (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Array|Function|Object|string} [predicate=_.identity]
   *  The function invoked per iteration.
   * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
   * @returns {boolean} Returns `true` if any element passes the predicate check,
   *  else `false`.
   * @example
   *
   * _.some([null, 0, 'yes', false], Boolean);
   * // => true
   *
   * var users = [
   *   { 'user': 'barney', 'active': true },
   *   { 'user': 'fred',   'active': false }
   * ];
   *
   * // The `_.matches` iteratee shorthand.
   * _.some(users, { 'user': 'barney', 'active': false });
   * // => false
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.some(users, ['active', false]);
   * // => true
   *
   * // The `_.property` iteratee shorthand.
   * _.some(users, 'active');
   * // => true
   */
  function some(collection, predicate, guard) {
    predicate = guard ? undefined : predicate;
    return baseSome(collection, baseIteratee(predicate));
  }

  /**
   * Creates an array of elements, sorted in ascending order by the results of
   * running each element in a collection thru each iteratee. This method
   * performs a stable sort, that is, it preserves the original sort order of
   * equal elements. The iteratees are invoked with one argument: (value).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {...(Array|Array[]|Function|Function[]|Object|Object[]|string|string[])}
   *  [iteratees=[_.identity]] The iteratees to sort by, specified individually
   *  or in arrays.
   * @returns {Array} Returns the new sorted array.
   * @example
   *
   * var users = [
   *   { 'user': 'fred',   'age': 48 },
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 40 },
   *   { 'user': 'barney', 'age': 34 }
   * ];
   *
   * _.sortBy(users, function(o) { return o.user; });
   * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 40]]
   *
   * _.sortBy(users, ['user', 'age']);
   * // => objects for [['barney', 34], ['barney', 36], ['fred', 40], ['fred', 48]]
   *
   * _.sortBy(users, 'user', function(o) {
   *   return Math.floor(o.age / 10);
   * });
   * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 40]]
   */
  function sortBy(collection, iteratee) {
    var index = 0;
    iteratee = baseIteratee(iteratee);

    return baseMap(baseMap(collection, function(value, key, collection) {
      return { 'value': value, 'index': index++, 'criteria': iteratee(value, key, collection) };
    }).sort(function(object, other) {
      return compareAscending(object.criteria, other.criteria) || (object.index - other.index);
    }), baseProperty('value'));
  }

  /*------------------------------------------------------------------------*/

  /**
   * Creates a function that invokes `func`, with the `this` binding and arguments
   * of the created function, while it's called less than `n` times. Subsequent
   * calls to the created function return the result of the last `func` invocation.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Function
   * @param {number} n The number of calls at which `func` is no longer invoked.
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * jQuery(element).on('click', _.before(5, addContactToList));
   * // => allows adding up to 4 contacts to the list
   */
  function before(n, func) {
    var result;
    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    n = toInteger(n);
    return function() {
      if (--n > 0) {
        result = func.apply(this, arguments);
      }
      if (n <= 1) {
        func = undefined;
      }
      return result;
    };
  }

  /**
   * Creates a function that invokes `func` with the `this` binding of `thisArg`
   * and `partials` prepended to the arguments it receives.
   *
   * The `_.bind.placeholder` value, which defaults to `_` in monolithic builds,
   * may be used as a placeholder for partially applied arguments.
   *
   * **Note:** Unlike native `Function#bind` this method doesn't set the "length"
   * property of bound functions.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to bind.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {...*} [partials] The arguments to be partially applied.
   * @returns {Function} Returns the new bound function.
   * @example
   *
   * var greet = function(greeting, punctuation) {
   *   return greeting + ' ' + this.user + punctuation;
   * };
   *
   * var object = { 'user': 'fred' };
   *
   * var bound = _.bind(greet, object, 'hi');
   * bound('!');
   * // => 'hi fred!'
   *
   * // Bound with placeholders.
   * var bound = _.bind(greet, object, _, '!');
   * bound('hi');
   * // => 'hi fred!'
   */
  var bind = rest(function(func, thisArg, partials) {
    return createPartialWrapper(func, BIND_FLAG | PARTIAL_FLAG, thisArg, partials);
  });

  /**
   * Defers invoking the `func` until the current call stack has cleared. Any
   * additional arguments are provided to `func` when it's invoked.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to defer.
   * @param {...*} [args] The arguments to invoke `func` with.
   * @returns {number} Returns the timer id.
   * @example
   *
   * _.defer(function(text) {
   *   console.log(text);
   * }, 'deferred');
   * // => Logs 'deferred' after one or more milliseconds.
   */
  var defer = rest(function(func, args) {
    return baseDelay(func, 1, args);
  });

  /**
   * Invokes `func` after `wait` milliseconds. Any additional arguments are
   * provided to `func` when it's invoked.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to delay.
   * @param {number} wait The number of milliseconds to delay invocation.
   * @param {...*} [args] The arguments to invoke `func` with.
   * @returns {number} Returns the timer id.
   * @example
   *
   * _.delay(function(text) {
   *   console.log(text);
   * }, 1000, 'later');
   * // => Logs 'later' after one second.
   */
  var delay = rest(function(func, wait, args) {
    return baseDelay(func, toNumber(wait) || 0, args);
  });

  /**
   * Creates a function that negates the result of the predicate `func`. The
   * `func` predicate is invoked with the `this` binding and arguments of the
   * created function.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Function
   * @param {Function} predicate The predicate to negate.
   * @returns {Function} Returns the new function.
   * @example
   *
   * function isEven(n) {
   *   return n % 2 == 0;
   * }
   *
   * _.filter([1, 2, 3, 4, 5, 6], _.negate(isEven));
   * // => [1, 3, 5]
   */
  function negate(predicate) {
    if (typeof predicate != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    return function() {
      return !predicate.apply(this, arguments);
    };
  }

  /**
   * Creates a function that is restricted to invoking `func` once. Repeat calls
   * to the function return the value of the first invocation. The `func` is
   * invoked with the `this` binding and arguments of the created function.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new restricted function.
   * @example
   *
   * var initialize = _.once(createApplication);
   * initialize();
   * initialize();
   * // `initialize` invokes `createApplication` once
   */
  function once(func) {
    return before(2, func);
  }

  /**
   * Creates a function that invokes `func` with the `this` binding of the
   * created function and arguments from `start` and beyond provided as
   * an array.
   *
   * **Note:** This method is based on the
   * [rest parameter](https://mdn.io/rest_parameters).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Function
   * @param {Function} func The function to apply a rest parameter to.
   * @param {number} [start=func.length-1] The start position of the rest parameter.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var say = _.rest(function(what, names) {
   *   return what + ' ' + _.initial(names).join(', ') +
   *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
   * });
   *
   * say('hello', 'fred', 'barney', 'pebbles');
   * // => 'hello fred, barney, & pebbles'
   */
  function rest(func, start) {
    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    start = nativeMax(start === undefined ? (func.length - 1) : toInteger(start), 0);
    return function() {
      var args = arguments,
          index = -1,
          length = nativeMax(args.length - start, 0),
          array = Array(length);

      while (++index < length) {
        array[index] = args[start + index];
      }
      var otherArgs = Array(start + 1);
      index = -1;
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = array;
      return func.apply(this, otherArgs);
    };
  }

  /*------------------------------------------------------------------------*/

  /**
   * Casts `value` as an array if it's not one.
   *
   * @static
   * @memberOf _
   * @since 4.4.0
   * @category Lang
   * @param {*} value The value to inspect.
   * @returns {Array} Returns the cast array.
   * @example
   *
   * _.castArray(1);
   * // => [1]
   *
   * _.castArray({ 'a': 1 });
   * // => [{ 'a': 1 }]
   *
   * _.castArray('abc');
   * // => ['abc']
   *
   * _.castArray(null);
   * // => [null]
   *
   * _.castArray(undefined);
   * // => [undefined]
   *
   * _.castArray();
   * // => []
   *
   * var array = [1, 2, 3];
   * console.log(_.castArray(array) === array);
   * // => true
   */
  function castArray() {
    if (!arguments.length) {
      return [];
    }
    var value = arguments[0];
    return isArray(value) ? value : [value];
  }

  /**
   * Creates a shallow clone of `value`.
   *
   * **Note:** This method is loosely based on the
   * [structured clone algorithm](https://mdn.io/Structured_clone_algorithm)
   * and supports cloning arrays, array buffers, booleans, date objects, maps,
   * numbers, `Object` objects, regexes, sets, strings, symbols, and typed
   * arrays. The own enumerable properties of `arguments` objects are cloned
   * as plain objects. An empty object is returned for uncloneable values such
   * as error objects, functions, DOM nodes, and WeakMaps.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to clone.
   * @returns {*} Returns the cloned value.
   * @example
   *
   * var objects = [{ 'a': 1 }, { 'b': 2 }];
   *
   * var shallow = _.clone(objects);
   * console.log(shallow[0] === objects[0]);
   * // => true
   */
  function clone(value) {
    if (!isObject(value)) {
      return value;
    }
    return isArray(value) ? copyArray(value) : copyObject(value, keys(value));
  }

  /**
   * Performs a
   * [`SameValueZero`](http://ecma-international.org/ecma-262/6.0/#sec-samevaluezero)
   * comparison between two values to determine if they are equivalent.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   * @example
   *
   * var object = { 'user': 'fred' };
   * var other = { 'user': 'fred' };
   *
   * _.eq(object, object);
   * // => true
   *
   * _.eq(object, other);
   * // => false
   *
   * _.eq('a', 'a');
   * // => true
   *
   * _.eq('a', Object('a'));
   * // => false
   *
   * _.eq(NaN, NaN);
   * // => true
   */
  function eq(value, other) {
    return value === other || (value !== value && other !== other);
  }

  /**
   * Checks if `value` is greater than `other`.
   *
   * @static
   * @memberOf _
   * @since 3.9.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if `value` is greater than `other`,
   *  else `false`.
   * @example
   *
   * _.gt(3, 1);
   * // => true
   *
   * _.gt(3, 3);
   * // => false
   *
   * _.gt(1, 3);
   * // => false
   */
  function gt(value, other) {
    return value > other;
  }

  /**
   * Checks if `value` is likely an `arguments` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isArguments(function() { return arguments; }());
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  function isArguments(value) {
    // Safari 8.1 incorrectly makes `arguments.callee` enumerable in strict mode.
    return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
      (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
  }

  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @type {Function}
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(document.body.children);
   * // => false
   *
   * _.isArray('abc');
   * // => false
   *
   * _.isArray(_.noop);
   * // => false
   */
  var isArray = Array.isArray;

  /**
   * Checks if `value` is array-like. A value is considered array-like if it's
   * not a function and has a `value.length` that's an integer greater than or
   * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
   * @example
   *
   * _.isArrayLike([1, 2, 3]);
   * // => true
   *
   * _.isArrayLike(document.body.children);
   * // => true
   *
   * _.isArrayLike('abc');
   * // => true
   *
   * _.isArrayLike(_.noop);
   * // => false
   */
  function isArrayLike(value) {
    return value != null && isLength(getLength(value)) && !isFunction(value);
  }

  /**
   * This method is like `_.isArrayLike` except that it also checks if `value`
   * is an object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an array-like object,
   *  else `false`.
   * @example
   *
   * _.isArrayLikeObject([1, 2, 3]);
   * // => true
   *
   * _.isArrayLikeObject(document.body.children);
   * // => true
   *
   * _.isArrayLikeObject('abc');
   * // => false
   *
   * _.isArrayLikeObject(_.noop);
   * // => false
   */
  function isArrayLikeObject(value) {
    return isObjectLike(value) && isArrayLike(value);
  }

  /**
   * Checks if `value` is classified as a boolean primitive or object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isBoolean(false);
   * // => true
   *
   * _.isBoolean(null);
   * // => false
   */
  function isBoolean(value) {
    return value === true || value === false ||
      (isObjectLike(value) && objectToString.call(value) == boolTag);
  }

  /**
   * Checks if `value` is classified as a `Date` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isDate(new Date);
   * // => true
   *
   * _.isDate('Mon April 23 2012');
   * // => false
   */
  function isDate(value) {
    return isObjectLike(value) && objectToString.call(value) == dateTag;
  }

  /**
   * Checks if `value` is an empty object, collection, map, or set.
   *
   * Objects are considered empty if they have no own enumerable string keyed
   * properties.
   *
   * Array-like values such as `arguments` objects, arrays, buffers, strings, or
   * jQuery-like collections are considered empty if they have a `length` of `0`.
   * Similarly, maps and sets are considered empty if they have a `size` of `0`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is empty, else `false`.
   * @example
   *
   * _.isEmpty(null);
   * // => true
   *
   * _.isEmpty(true);
   * // => true
   *
   * _.isEmpty(1);
   * // => true
   *
   * _.isEmpty([1, 2, 3]);
   * // => false
   *
   * _.isEmpty({ 'a': 1 });
   * // => false
   */
  function isEmpty(value) {
    if (isArrayLike(value) &&
        (isArray(value) || isString(value) ||
          isFunction(value.splice) || isArguments(value))) {
      return !value.length;
    }
    for (var key in value) {
      if (hasOwnProperty.call(value, key)) {
        return false;
      }
    }
    return !(nonEnumShadows && keys(value).length);
  }

  /**
   * Performs a deep comparison between two values to determine if they are
   * equivalent.
   *
   * **Note:** This method supports comparing arrays, array buffers, booleans,
   * date objects, error objects, maps, numbers, `Object` objects, regexes,
   * sets, strings, symbols, and typed arrays. `Object` objects are compared
   * by their own, not inherited, enumerable properties. Functions and DOM
   * nodes are **not** supported.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent,
   *  else `false`.
   * @example
   *
   * var object = { 'user': 'fred' };
   * var other = { 'user': 'fred' };
   *
   * _.isEqual(object, other);
   * // => true
   *
   * object === other;
   * // => false
   */
  function isEqual(value, other) {
    return baseIsEqual(value, other);
  }

  /**
   * Checks if `value` is a finite primitive number.
   *
   * **Note:** This method is based on
   * [`Number.isFinite`](https://mdn.io/Number/isFinite).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a finite number,
   *  else `false`.
   * @example
   *
   * _.isFinite(3);
   * // => true
   *
   * _.isFinite(Number.MAX_VALUE);
   * // => true
   *
   * _.isFinite(3.14);
   * // => true
   *
   * _.isFinite(Infinity);
   * // => false
   */
  function isFinite(value) {
    return typeof value == 'number' && nativeIsFinite(value);
  }

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in Safari 8 which returns 'object' for typed array and weak map constructors,
    // and PhantomJS 1.9 which returns 'function' for `NodeList` instances.
    var tag = isObject(value) ? objectToString.call(value) : '';
    return tag == funcTag || tag == genTag;
  }

  /**
   * Checks if `value` is a valid array-like length.
   *
   * **Note:** This function is loosely based on
   * [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a valid length,
   *  else `false`.
   * @example
   *
   * _.isLength(3);
   * // => true
   *
   * _.isLength(Number.MIN_VALUE);
   * // => false
   *
   * _.isLength(Infinity);
   * // => false
   *
   * _.isLength('3');
   * // => false
   */
  function isLength(value) {
    return typeof value == 'number' &&
      value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/6.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike(value) {
    return !!value && typeof value == 'object';
  }

  /**
   * Checks if `value` is `NaN`.
   *
   * **Note:** This method is based on
   * [`Number.isNaN`](https://mdn.io/Number/isNaN) and is not the same as
   * global [`isNaN`](https://mdn.io/isNaN) which returns `true` for
   * `undefined` and other non-number values.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
   * @example
   *
   * _.isNaN(NaN);
   * // => true
   *
   * _.isNaN(new Number(NaN));
   * // => true
   *
   * isNaN(undefined);
   * // => true
   *
   * _.isNaN(undefined);
   * // => false
   */
  function isNaN(value) {
    // An `NaN` primitive is the only value that is not equal to itself.
    // Perform the `toStringTag` check first to avoid errors with some
    // ActiveX objects in IE.
    return isNumber(value) && value != +value;
  }

  /**
   * Checks if `value` is `null`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is `null`, else `false`.
   * @example
   *
   * _.isNull(null);
   * // => true
   *
   * _.isNull(void 0);
   * // => false
   */
  function isNull(value) {
    return value === null;
  }

  /**
   * Checks if `value` is classified as a `Number` primitive or object.
   *
   * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are
   * classified as numbers, use the `_.isFinite` method.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isNumber(3);
   * // => true
   *
   * _.isNumber(Number.MIN_VALUE);
   * // => true
   *
   * _.isNumber(Infinity);
   * // => true
   *
   * _.isNumber('3');
   * // => false
   */
  function isNumber(value) {
    return typeof value == 'number' ||
      (isObjectLike(value) && objectToString.call(value) == numberTag);
  }

  /**
   * Checks if `value` is classified as a `RegExp` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isRegExp(/abc/);
   * // => true
   *
   * _.isRegExp('/abc/');
   * // => false
   */
  function isRegExp(value) {
    return isObject(value) && objectToString.call(value) == regexpTag;
  }

  /**
   * Checks if `value` is classified as a `String` primitive or object.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is correctly classified,
   *  else `false`.
   * @example
   *
   * _.isString('abc');
   * // => true
   *
   * _.isString(1);
   * // => false
   */
  function isString(value) {
    return typeof value == 'string' ||
      (!isArray(value) && isObjectLike(value) && objectToString.call(value) == stringTag);
  }

  /**
   * Checks if `value` is `undefined`.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
   * @example
   *
   * _.isUndefined(void 0);
   * // => true
   *
   * _.isUndefined(null);
   * // => false
   */
  function isUndefined(value) {
    return value === undefined;
  }

  /**
   * Checks if `value` is less than `other`.
   *
   * @static
   * @memberOf _
   * @since 3.9.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if `value` is less than `other`,
   *  else `false`.
   * @example
   *
   * _.lt(1, 3);
   * // => true
   *
   * _.lt(3, 3);
   * // => false
   *
   * _.lt(3, 1);
   * // => false
   */
  function lt(value, other) {
    return value < other;
  }

  /**
   * Converts `value` to an array.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {Array} Returns the converted array.
   * @example
   *
   * _.toArray({ 'a': 1, 'b': 2 });
   * // => [1, 2]
   *
   * _.toArray('abc');
   * // => ['a', 'b', 'c']
   *
   * _.toArray(1);
   * // => []
   *
   * _.toArray(null);
   * // => []
   */
  function toArray(value) {
    if (!isArrayLike(value)) {
      return values(value);
    }
    return value.length ? copyArray(value) : [];
  }

  /**
   * Converts `value` to an integer.
   *
   * **Note:** This function is loosely based on
   * [`ToInteger`](http://www.ecma-international.org/ecma-262/6.0/#sec-tointeger).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {number} Returns the converted integer.
   * @example
   *
   * _.toInteger(3);
   * // => 3
   *
   * _.toInteger(Number.MIN_VALUE);
   * // => 0
   *
   * _.toInteger(Infinity);
   * // => 1.7976931348623157e+308
   *
   * _.toInteger('3');
   * // => 3
   */
  var toInteger = Number;

  /**
   * Converts `value` to a number.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {number} Returns the number.
   * @example
   *
   * _.toNumber(3);
   * // => 3
   *
   * _.toNumber(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toNumber(Infinity);
   * // => Infinity
   *
   * _.toNumber('3');
   * // => 3
   */
  var toNumber = Number;

  /**
   * Converts `value` to a string if it's not one. An empty string is returned
   * for `null` and `undefined` values. The sign of `-0` is preserved.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   * @example
   *
   * _.toString(null);
   * // => ''
   *
   * _.toString(-0);
   * // => '-0'
   *
   * _.toString([1, 2, 3]);
   * // => '1,2,3'
   */
  function toString(value) {
    if (typeof value == 'string') {
      return value;
    }
    return value == null ? '' : (value + '');
  }

  /*------------------------------------------------------------------------*/

  /**
   * Assigns own enumerable string keyed properties of source objects to the
   * destination object. Source objects are applied from left to right.
   * Subsequent sources overwrite property assignments of previous sources.
   *
   * **Note:** This method mutates `object` and is loosely based on
   * [`Object.assign`](https://mdn.io/Object/assign).
   *
   * @static
   * @memberOf _
   * @since 0.10.0
   * @category Object
   * @param {Object} object The destination object.
   * @param {...Object} [sources] The source objects.
   * @returns {Object} Returns `object`.
   * @example
   *
   * function Foo() {
   *   this.c = 3;
   * }
   *
   * function Bar() {
   *   this.e = 5;
   * }
   *
   * Foo.prototype.d = 4;
   * Bar.prototype.f = 6;
   *
   * _.assign({ 'a': 1 }, new Foo, new Bar);
   * // => { 'a': 1, 'c': 3, 'e': 5 }
   */
  var assign = createAssigner(function(object, source) {
    copyObject(source, keys(source), object);
  });

  /**
   * This method is like `_.assign` except that it iterates over own and
   * inherited source properties.
   *
   * **Note:** This method mutates `object`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @alias extend
   * @category Object
   * @param {Object} object The destination object.
   * @param {...Object} [sources] The source objects.
   * @returns {Object} Returns `object`.
   * @example
   *
   * function Foo() {
   *   this.b = 2;
   * }
   *
   * function Bar() {
   *   this.d = 4;
   * }
   *
   * Foo.prototype.c = 3;
   * Bar.prototype.e = 5;
   *
   * _.assignIn({ 'a': 1 }, new Foo, new Bar);
   * // => { 'a': 1, 'b': 2, 'c': 3, 'd': 4, 'e': 5 }
   */
  var assignIn = createAssigner(function(object, source) {
    copyObject(source, keysIn(source), object);
  });

  /**
   * This method is like `_.assignIn` except that it accepts `customizer`
   * which is invoked to produce the assigned values. If `customizer` returns
   * `undefined` assignment is handled by the method instead. The `customizer`
   * is invoked with five arguments: (objValue, srcValue, key, object, source).
   *
   * **Note:** This method mutates `object`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @alias extendWith
   * @category Object
   * @param {Object} object The destination object.
   * @param {...Object} sources The source objects.
   * @param {Function} [customizer] The function to customize assigned values.
   * @returns {Object} Returns `object`.
   * @example
   *
   * function customizer(objValue, srcValue) {
   *   return _.isUndefined(objValue) ? srcValue : objValue;
   * }
   *
   * var defaults = _.partialRight(_.assignInWith, customizer);
   *
   * defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
   * // => { 'a': 1, 'b': 2 }
   */
  var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
    copyObjectWith(source, keysIn(source), object, customizer);
  });

  /**
   * Creates an object that inherits from the `prototype` object. If a
   * `properties` object is given its own enumerable string keyed properties
   * are assigned to the created object.
   *
   * @static
   * @memberOf _
   * @since 2.3.0
   * @category Object
   * @param {Object} prototype The object to inherit from.
   * @param {Object} [properties] The properties to assign to the object.
   * @returns {Object} Returns the new object.
   * @example
   *
   * function Shape() {
   *   this.x = 0;
   *   this.y = 0;
   * }
   *
   * function Circle() {
   *   Shape.call(this);
   * }
   *
   * Circle.prototype = _.create(Shape.prototype, {
   *   'constructor': Circle
   * });
   *
   * var circle = new Circle;
   * circle instanceof Circle;
   * // => true
   *
   * circle instanceof Shape;
   * // => true
   */
  function create(prototype, properties) {
    var result = baseCreate(prototype);
    return properties ? assign(result, properties) : result;
  }

  /**
   * Assigns own and inherited enumerable string keyed properties of source
   * objects to the destination object for all destination properties that
   * resolve to `undefined`. Source objects are applied from left to right.
   * Once a property is set, additional values of the same property are ignored.
   *
   * **Note:** This method mutates `object`.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The destination object.
   * @param {...Object} [sources] The source objects.
   * @returns {Object} Returns `object`.
   * @example
   *
   * _.defaults({ 'user': 'barney' }, { 'age': 36 }, { 'user': 'fred' });
   * // => { 'user': 'barney', 'age': 36 }
   */
  var defaults = rest(function(args) {
    args.push(undefined, assignInDefaults);
    return assignInWith.apply(undefined, args);
  });

  /**
   * Checks if `path` is a direct property of `object`.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path to check.
   * @returns {boolean} Returns `true` if `path` exists, else `false`.
   * @example
   *
   * var object = { 'a': { 'b': { 'c': 3 } } };
   * var other = _.create({ 'a': _.create({ 'b': _.create({ 'c': 3 }) }) });
   *
   * _.has(object, 'a');
   * // => true
   *
   * _.has(object, 'a.b.c');
   * // => true
   *
   * _.has(object, ['a', 'b', 'c']);
   * // => true
   *
   * _.has(other, 'a');
   * // => false
   */
  function has(object, path) {
    return object != null && hasOwnProperty.call(object, path);
  }

  /**
   * Creates an array of the own enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects. See the
   * [ES spec](http://ecma-international.org/ecma-262/6.0/#sec-object.keys)
   * for more details.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keys(new Foo);
   * // => ['a', 'b'] (iteration order is not guaranteed)
   *
   * _.keys('hi');
   * // => ['0', '1']
   */
  function keys(object) {
    var isProto = isPrototype(object);
    if (!(isProto || isArrayLike(object))) {
      return baseKeys(object);
    }
    var indexes = indexKeys(object),
        skipIndexes = !!indexes,
        result = indexes || [],
        length = result.length;

    for (var key in object) {
      if (hasOwnProperty.call(object, key) &&
          !(skipIndexes && (key == 'length' || isIndex(key, length))) &&
          !(isProto && key == 'constructor')) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Creates an array of the own and inherited enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keysIn(new Foo);
   * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
   */
  function keysIn(object) {
    var index = -1,
        isProto = isPrototype(object),
        props = baseKeysIn(object),
        propsLength = props.length,
        indexes = indexKeys(object),
        skipIndexes = !!indexes,
        result = indexes || [],
        length = result.length;

    while (++index < propsLength) {
      var key = props[index];
      if (!(skipIndexes && (key == 'length' || isIndex(key, length))) &&
          !(key == 'constructor' && (isProto || !hasOwnProperty.call(object, key)))) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Creates an object composed of the picked `object` properties.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The source object.
   * @param {...(string|string[])} [props] The property identifiers to pick,
   *  specified individually or in arrays.
   * @returns {Object} Returns the new object.
   * @example
   *
   * var object = { 'a': 1, 'b': '2', 'c': 3 };
   *
   * _.pick(object, ['a', 'c']);
   * // => { 'a': 1, 'c': 3 }
   */
  var pick = rest(function(object, props) {
    return object == null ? {} : basePick(object, baseFlatten(props, 1));
  });

  /**
   * This method is like `_.get` except that if the resolved value is a
   * function it's invoked with the `this` binding of its parent object and
   * its result is returned.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to resolve.
   * @param {*} [defaultValue] The value returned for `undefined` resolved values.
   * @returns {*} Returns the resolved value.
   * @example
   *
   * var object = { 'a': [{ 'b': { 'c1': 3, 'c2': _.constant(4) } }] };
   *
   * _.result(object, 'a[0].b.c1');
   * // => 3
   *
   * _.result(object, 'a[0].b.c2');
   * // => 4
   *
   * _.result(object, 'a[0].b.c3', 'default');
   * // => 'default'
   *
   * _.result(object, 'a[0].b.c3', _.constant('default'));
   * // => 'default'
   */
  function result(object, path, defaultValue) {
    var value = object == null ? undefined : object[path];
    if (value === undefined) {
      value = defaultValue;
    }
    return isFunction(value) ? value.call(object) : value;
  }

  /**
   * Creates an array of the own enumerable string keyed property values of `object`.
   *
   * **Note:** Non-object values are coerced to objects.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property values.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.values(new Foo);
   * // => [1, 2] (iteration order is not guaranteed)
   *
   * _.values('hi');
   * // => ['h', 'i']
   */
  function values(object) {
    return object ? baseValues(object, keys(object)) : [];
  }

  /*------------------------------------------------------------------------*/

  /**
   * Converts the characters "&", "<", ">", '"', "'", and "\`" in `string` to
   * their corresponding HTML entities.
   *
   * **Note:** No other characters are escaped. To escape additional
   * characters use a third-party library like [_he_](https://mths.be/he).
   *
   * Though the ">" character is escaped for symmetry, characters like
   * ">" and "/" don't need escaping in HTML and have no special meaning
   * unless they're part of a tag or unquoted attribute value. See
   * [Mathias Bynens's article](https://mathiasbynens.be/notes/ambiguous-ampersands)
   * (under "semi-related fun fact") for more details.
   *
   * Backticks are escaped because in IE < 9, they can break out of
   * attribute values or HTML comments. See [#59](https://html5sec.org/#59),
   * [#102](https://html5sec.org/#102), [#108](https://html5sec.org/#108), and
   * [#133](https://html5sec.org/#133) of the
   * [HTML5 Security Cheatsheet](https://html5sec.org/) for more details.
   *
   * When working with HTML you should always
   * [quote attribute values](http://wonko.com/post/html-escaping) to reduce
   * XSS vectors.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category String
   * @param {string} [string=''] The string to escape.
   * @returns {string} Returns the escaped string.
   * @example
   *
   * _.escape('fred, barney, & pebbles');
   * // => 'fred, barney, &amp; pebbles'
   */
  function escape(string) {
    string = toString(string);
    return (string && reHasUnescapedHtml.test(string))
      ? string.replace(reUnescapedHtml, escapeHtmlChar)
      : string;
  }

  /*------------------------------------------------------------------------*/

  /**
   * This method returns the first argument given to it.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {*} value Any value.
   * @returns {*} Returns `value`.
   * @example
   *
   * var object = { 'user': 'fred' };
   *
   * _.identity(object) === object;
   * // => true
   */
  function identity(value) {
    return value;
  }

  /**
   * Creates a function that invokes `func` with the arguments of the created
   * function. If `func` is a property name the created function returns the
   * property value for a given element. If `func` is an array or object the
   * created function returns `true` for elements that contain the equivalent
   * source properties, otherwise it returns `false`.
   *
   * @static
   * @since 4.0.0
   * @memberOf _
   * @category Util
   * @param {*} [func=_.identity] The value to convert to a callback.
   * @returns {Function} Returns the callback.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': true },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * // The `_.matches` iteratee shorthand.
   * _.filter(users, _.iteratee({ 'user': 'barney', 'active': true }));
   * // => [{ 'user': 'barney', 'age': 36, 'active': true }]
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.filter(users, _.iteratee(['user', 'fred']));
   * // => [{ 'user': 'fred', 'age': 40 }]
   *
   * // The `_.property` iteratee shorthand.
   * _.map(users, _.iteratee('user'));
   * // => ['barney', 'fred']
   *
   * // Create custom iteratee shorthands.
   * _.iteratee = _.wrap(_.iteratee, function(iteratee, func) {
   *   return !_.isRegExp(func) ? iteratee(func) : function(string) {
   *     return func.test(string);
   *   };
   * });
   *
   * _.filter(['abc', 'def'], /ef/);
   * // => ['def']
   */
  var iteratee = baseIteratee;

  /**
   * Creates a function that performs a partial deep comparison between a given
   * object and `source`, returning `true` if the given object has equivalent
   * property values, else `false`. The created function is equivalent to
   * `_.isMatch` with a `source` partially applied.
   *
   * **Note:** This method supports comparing the same values as `_.isEqual`.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Util
   * @param {Object} source The object of property values to match.
   * @returns {Function} Returns the new function.
   * @example
   *
   * var users = [
   *   { 'user': 'barney', 'age': 36, 'active': true },
   *   { 'user': 'fred',   'age': 40, 'active': false }
   * ];
   *
   * _.filter(users, _.matches({ 'age': 40, 'active': false }));
   * // => [{ 'user': 'fred', 'age': 40, 'active': false }]
   */
  function matches(source) {
    return baseMatches(assign({}, source));
  }

  /**
   * Adds all own enumerable string keyed function properties of a source
   * object to the destination object. If `object` is a function then methods
   * are added to its prototype as well.
   *
   * **Note:** Use `_.runInContext` to create a pristine `lodash` function to
   * avoid conflicts caused by modifying the original.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {Function|Object} [object=lodash] The destination object.
   * @param {Object} source The object of functions to add.
   * @param {Object} [options={}] The options object.
   * @param {boolean} [options.chain=true] Specify whether mixins are chainable.
   * @returns {Function|Object} Returns `object`.
   * @example
   *
   * function vowels(string) {
   *   return _.filter(string, function(v) {
   *     return /[aeiou]/i.test(v);
   *   });
   * }
   *
   * _.mixin({ 'vowels': vowels });
   * _.vowels('fred');
   * // => ['e']
   *
   * _('fred').vowels().value();
   * // => ['e']
   *
   * _.mixin({ 'vowels': vowels }, { 'chain': false });
   * _('fred').vowels();
   * // => ['e']
   */
  function mixin(object, source, options) {
    var props = keys(source),
        methodNames = baseFunctions(source, props);

    if (options == null &&
        !(isObject(source) && (methodNames.length || !props.length))) {
      options = source;
      source = object;
      object = this;
      methodNames = baseFunctions(source, keys(source));
    }
    var chain = (isObject(options) && 'chain' in options) ? options.chain : true,
        isFunc = isFunction(object);

    baseEach(methodNames, function(methodName) {
      var func = source[methodName];
      object[methodName] = func;
      if (isFunc) {
        object.prototype[methodName] = function() {
          var chainAll = this.__chain__;
          if (chain || chainAll) {
            var result = object(this.__wrapped__),
                actions = result.__actions__ = copyArray(this.__actions__);

            actions.push({ 'func': func, 'args': arguments, 'thisArg': object });
            result.__chain__ = chainAll;
            return result;
          }
          return func.apply(object, arrayPush([this.value()], arguments));
        };
      }
    });

    return object;
  }

  /**
   * Reverts the `_` variable to its previous value and returns a reference to
   * the `lodash` function.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @returns {Function} Returns the `lodash` function.
   * @example
   *
   * var lodash = _.noConflict();
   */
  function noConflict() {
    if (root._ === this) {
      root._ = oldDash;
    }
    return this;
  }

  /**
   * A no-operation function that returns `undefined` regardless of the
   * arguments it receives.
   *
   * @static
   * @memberOf _
   * @since 2.3.0
   * @category Util
   * @example
   *
   * var object = { 'user': 'fred' };
   *
   * _.noop(object) === undefined;
   * // => true
   */
  function noop() {
    // No operation performed.
  }

  /**
   * Generates a unique ID. If `prefix` is given the ID is appended to it.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {string} [prefix=''] The value to prefix the ID with.
   * @returns {string} Returns the unique ID.
   * @example
   *
   * _.uniqueId('contact_');
   * // => 'contact_104'
   *
   * _.uniqueId();
   * // => '105'
   */
  function uniqueId(prefix) {
    var id = ++idCounter;
    return toString(prefix) + id;
  }

  /*------------------------------------------------------------------------*/

  /**
   * Computes the maximum value of `array`. If `array` is empty or falsey
   * `undefined` is returned.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Math
   * @param {Array} array The array to iterate over.
   * @returns {*} Returns the maximum value.
   * @example
   *
   * _.max([4, 2, 8, 6]);
   * // => 8
   *
   * _.max([]);
   * // => undefined
   */
  function max(array) {
    return (array && array.length)
      ? baseExtremum(array, identity, gt)
      : undefined;
  }

  /**
   * Computes the minimum value of `array`. If `array` is empty or falsey
   * `undefined` is returned.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Math
   * @param {Array} array The array to iterate over.
   * @returns {*} Returns the minimum value.
   * @example
   *
   * _.min([4, 2, 8, 6]);
   * // => 2
   *
   * _.min([]);
   * // => undefined
   */
  function min(array) {
    return (array && array.length)
      ? baseExtremum(array, identity, lt)
      : undefined;
  }

  /*------------------------------------------------------------------------*/

  // Add methods that return wrapped values in chain sequences.
  lodash.assignIn = assignIn;
  lodash.before = before;
  lodash.bind = bind;
  lodash.chain = chain;
  lodash.compact = compact;
  lodash.concat = concat;
  lodash.create = create;
  lodash.defaults = defaults;
  lodash.defer = defer;
  lodash.delay = delay;
  lodash.filter = filter;
  lodash.flatten = flatten;
  lodash.flattenDeep = flattenDeep;
  lodash.iteratee = iteratee;
  lodash.keys = keys;
  lodash.map = map;
  lodash.matches = matches;
  lodash.mixin = mixin;
  lodash.negate = negate;
  lodash.once = once;
  lodash.pick = pick;
  lodash.slice = slice;
  lodash.sortBy = sortBy;
  lodash.tap = tap;
  lodash.thru = thru;
  lodash.toArray = toArray;
  lodash.values = values;

  // Add aliases.
  lodash.extend = assignIn;

  // Add methods to `lodash.prototype`.
  mixin(lodash, lodash);

  /*------------------------------------------------------------------------*/

  // Add methods that return unwrapped values in chain sequences.
  lodash.clone = clone;
  lodash.escape = escape;
  lodash.every = every;
  lodash.find = find;
  lodash.forEach = forEach;
  lodash.has = has;
  lodash.head = head;
  lodash.identity = identity;
  lodash.indexOf = indexOf;
  lodash.isArguments = isArguments;
  lodash.isArray = isArray;
  lodash.isBoolean = isBoolean;
  lodash.isDate = isDate;
  lodash.isEmpty = isEmpty;
  lodash.isEqual = isEqual;
  lodash.isFinite = isFinite;
  lodash.isFunction = isFunction;
  lodash.isNaN = isNaN;
  lodash.isNull = isNull;
  lodash.isNumber = isNumber;
  lodash.isObject = isObject;
  lodash.isRegExp = isRegExp;
  lodash.isString = isString;
  lodash.isUndefined = isUndefined;
  lodash.last = last;
  lodash.max = max;
  lodash.min = min;
  lodash.noConflict = noConflict;
  lodash.noop = noop;
  lodash.reduce = reduce;
  lodash.result = result;
  lodash.size = size;
  lodash.some = some;
  lodash.uniqueId = uniqueId;

  // Add aliases.
  lodash.each = forEach;
  lodash.first = head;

  mixin(lodash, (function() {
    var source = {};
    baseForOwn(lodash, function(func, methodName) {
      if (!hasOwnProperty.call(lodash.prototype, methodName)) {
        source[methodName] = func;
      }
    });
    return source;
  }()), { 'chain': false });

  /*------------------------------------------------------------------------*/

  /**
   * The semantic version number.
   *
   * @static
   * @memberOf _
   * @type {string}
   */
  lodash.VERSION = VERSION;

  // Add `Array` methods to `lodash.prototype`.
  baseEach(['pop', 'join', 'replace', 'reverse', 'split', 'push', 'shift', 'sort', 'splice', 'unshift'], function(methodName) {
    var func = (/^(?:replace|split)$/.test(methodName) ? String.prototype : arrayProto)[methodName],
        chainName = /^(?:push|sort|unshift)$/.test(methodName) ? 'tap' : 'thru',
        retUnwrapped = /^(?:pop|join|replace|shift)$/.test(methodName);

    lodash.prototype[methodName] = function() {
      var args = arguments;
      if (retUnwrapped && !this.__chain__) {
        var value = this.value();
        return func.apply(isArray(value) ? value : [], args);
      }
      return this[chainName](function(value) {
        return func.apply(isArray(value) ? value : [], args);
      });
    };
  });

  // Add chain sequence methods to the `lodash` wrapper.
  lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;

  /*--------------------------------------------------------------------------*/

  // Expose lodash on the free variable `window` or `self` when available. This
  // prevents errors in cases where lodash is loaded by a script tag in the presence
  // of an AMD loader. See http://requirejs.org/docs/errors.html#mismatch for more details.
  (freeWindow || freeSelf || {})._ = lodash;

  // Some AMD build optimizers like r.js check for condition patterns like the following:
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    // Define as an anonymous module so, through path mapping, it can be
    // referenced as the "underscore" module.
    define(function() {
      return lodash;
    });
  }
  // Check for `exports` after `define` in case a build optimizer adds an `exports` object.
  else if (freeExports && freeModule) {
    // Export for Node.js.
    if (moduleExports) {
      (freeModule.exports = lodash)._ = lodash;
    }
    // Export for CommonJS support.
    freeExports._ = lodash;
  }
  else {
    // Export to the global object.
    root._ = lodash;
  }
}.call(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],24:[function(require,module,exports){
var getLength = require('./_getLength'),
    isFunction = require('./isFunction'),
    isLength = require('./isLength');

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(getLength(value)) && !isFunction(value);
}

module.exports = isArrayLike;

},{"./_getLength":22,"./isFunction":25,"./isLength":26}],25:[function(require,module,exports){
var isObject = require('./isObject');

/** `Object#toString` result references. */
var funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified,
 *  else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 8 which returns 'object' for typed array and weak map constructors,
  // and PhantomJS 1.9 which returns 'function' for `NodeList` instances.
  var tag = isObject(value) ? objectToString.call(value) : '';
  return tag == funcTag || tag == genTag;
}

module.exports = isFunction;

},{"./isObject":27}],26:[function(require,module,exports){
/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This function is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/6.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length,
 *  else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

module.exports = isLength;

},{}],27:[function(require,module,exports){
/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/6.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = isObject;

},{}],28:[function(require,module,exports){
var H = require('coreutil/core');
var N = require('./src/network');

H.root.N = N;

module.exports = N;
},{"./src/network":29,"coreutil/core":1}],29:[function(require,module,exports){

var N = {};

var C = require('coreutil/core');
var Enc = null;
var Parser = require('./parse');

var noop = function() {};

C.root.serverPath = N.serverPath = "http://dev.indoorstar.com/ids/";
C.root.dataServer = N.dataServer = "http://indoorstar.com:6601/";
C.root.innerServer = N.innerServer = "http://dev.indoorstar.com:6603/ids/";

N.setActionHeader = function(url) {
    C.root.serverPath = N.serverPath = url;
};

N.setEncActionHeader = function(url) {
    C.root.innerServer = N.innerServer = url;
};

N.injectEncryptionModule = function(E) {
    Enc = E;
};

/**
 * parses action response, assumes a {dmst} structure
 *
 * input:
 * string
 * arraybuffer
 * object
 *
 * type:
 * `string`: string
 * `object`: object
 * `buffer`: arraybuffer
 *
 * @param actionResult input data
 * @param type desired output format of `d`
 * @return {Object} responseObject with data in `d`
 * @throws {Error} error with error message
 */
function parseActionResponse(actionResult, type) {
    if (!actionResult) throw new Error('Empty Response');
    if (actionResult instanceof ArrayBuffer) {
        if (type && type == 'buffer') {
            actionResult = Parser.parseActionBufferDepth1(actionResult);
        } else if (type && type == 'string') {
            actionResult = Parser.parseArrayBufferToJsonWithStringInD(actionResult);
        } else {//} if (type && type == 'object') { //default
            actionResult = Parser.parseArrayBufferToJsonObject(actionResult);
        }
    }
    //for json object
    if (!actionResult.hasOwnProperty('s')) throw new Error('Invalid Response');
    if (actionResult.s !== 0) throw new Error(actionResult.m || 'Unknown Error');
    var hasBody = actionResult.d != null && actionResult.d != "null";
    if (hasBody) {
        try {
            return JSON.parse(actionResult.d);
        } catch (e) {
            //if not a json, this will fail very quickly
            if (Enc) {
                try {
                    return Enc.handleActionRaw(actionResult.d);
                } catch (e) {
                    console.warn("Decode rawdata failed!");
                    return actionResult.d;
                }
            } else {
                console.warn("No encryption module found in network module!");
                return actionResult.d; //no encryption module
            }
        }
    }
    return actionResult.d;
}

function parseHeaders(headerString) {
    var hs = (headerString || "").split("\r\n") || [];
    var rs = {};
    for (var i = 0; i < hs.length; i++) {
        var f = (hs[i] || "").indexOf(":");
        if (f !== -1) {
            rs[hs[i].substring(0, f)] = hs[i].substring(f + 1, hs[i].length).trim();
        }
    }
    return rs;
}

var executors = {
    'arraybuffer': 'arrayBuffer',
    'raw': 'text',
    'json': 'json',
    'blob': 'blob',
    'form': 'formData'
};

var prepareRequest = function(url, method, async, data, type, callback, errback, trace) {
    var req = {};
    req.request = new XMLHttpRequest();

    req.open = function() {
        req.request.open();
    };
    req.cancel = function() {
        req.request.abort();
    };

    //var isBuffer = type == 'arraybuffer';

    if (type == executors.arraybuffer) {
        req.request.responseType = "arraybuffer";
    } else if (type == executors.blob) {
        req.request.responseType = "blob";
    }

    req.request.onreadystatechange = function() {
        if (req.request.readyState === 3) {
            if (!req.headers) {
                req.headers = parseHeaders(req.request.getAllResponseHeaders());
            }
        } else if (req.request.readyState === 4 && (req.request.status === 200 || req.request.status === 0)) {
            if (type == executors.json) {
                callback(JSON.parse(req.request.responseText));
            } else {
                callback(req.request.response || req.request.responseText);
            }
        } else if (req.request.readyState === 4) {
            errback(trace);
        }
    };

    req.request.open(method, url, async);

    req.setRange = function(start, end) {
        start = ~~start;
        end = ~~end;
        if (!isNaN(start) && !isNaN(end)) req.request.setRequestHeader("Range", "bytes=" + start + "-" + end);
    };

    var send = function() {
        if (method === "POST") {
            setTimeout(function() {
                if (req.request.readyState === 1) {
                    req.request.send(C.param(data));
                }
            }, 0);
        } else {
            setTimeout(function() {
                if (req.request.readyState === 1) {
                    req.request.send(null);
                }
            }, 0);
        }
    };

    req.send = function() {
        try {
            send();
        } catch (e) {}
    };

    return req;
};

var innerGetRequest = function(url, type, callback, errback, trace) {
    prepareRequest(url, 'GET', true, null, type, callback, errback, trace).send();
};

var innerPostRequest = function(url, type, data, callback, errback, trace) {
    prepareRequest(url, 'POST', true, data, null, callback, errback, trace).send();
};

N.getRequest = function(url, callback, errback, type) {
    return innerGetRequest(url, executors[type || 'raw'], callback, errback);
};

N.getJson = function(url, callback, errback, overrideType) {
    return innerGetRequest(url, executors[overrideType || 'json'], callback, errback);
};

N.getBuffer = function(url, callback, errback) {
    return innerGetRequest(url, executors.arraybuffer, callback, errback);
};

N.getBlob = function(url, callback, errback) {
    return innerGetRequest(url, executors.blob, callback, errback);
};

N.getForm = function(url, callback, errback) {
    return innerGetRequest(url, executors.form, callback, errback);
};

N.getRaw = function(url, callback, errback) {
    return innerGetRequest(url, executors.arraybuffer, function(d) {
        try {
            callback(Enc.handleActionRaw(d));
        } catch (e) {
            callback(d);
        }
    }, errback);
};

N.postRequest = function(url, body, callback, errback) {
    return innerPostRequest(url, {}, body, callback, errback);
};

N.postForm = function(url, form, callback, errback) {
    return N.postRequest(url, new FormData(form), callback, errback);
};

N.postJson = function(url, json, callback, errback) {
    return innerPostRequest(url, {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }, json, callback, errback);
};

N.postFile = function(url, file, callback, errback) {
    file = file instanceof File ? file : file.files[0];
    var form = new FormData();
    form.append('file', file);
    N.postForm(url, form, callback, errback);
};

N.cGetAction = function(server, action, params, callback, errback, type) {
    return N.getBuffer(C.getUrlByParams(server, action, params), function(obj) {
        (callback || noop)(parseActionResponse(obj, type));
    }, errback);
};

N.getAction = function(action, params, callback, errback) {
    return N.cGetAction(N.serverPath, action, params, callback, errback);
};

N.get = N.getRequest;

N.cPostAction = function(server, action, params, data, callback, errback) {
    return N.postRequest(C.getUrlByParams(server, action, params), C.param(data), callback, errback);
};

N.postAction = function(action, params, data, callback, errback) {
    return N.cPostAction(N.serverPath, action, params, data, callback, errback);
};

N.post = N.postRequest;

module.exports = N;
},{"./parse":30,"coreutil/core":1}],30:[function(require,module,exports){

var encoding = require('coreutil/src/encoding');

var Parse = {};

var QUOTE = '"'.charCodeAt(0);
var SQUOTE = "'".charCodeAt(0);
var COLON = ":".charCodeAt(0);
var COMMA = ",".charCodeAt(0);
var D = 'd'.charCodeAt(0);
var M = 'm'.charCodeAt(0);
var S = 's'.charCodeAt(0);
var T = 't'.charCodeAt(0);

function parseArrayBufferToJsonObject(arraybuffer) {
    return JSON.parse(encoding.ab2s(arraybuffer));
}

function parseArrayBufferToJsonWithStringInD(arraybuffer) {
    var obj = parseArrayBufferJsonDepth1(arraybuffer);

    if (obj.d && obj.d instanceof ArrayBuffer) {
        obj.d = encoding.ba2s(obj.d);
    }

    return obj;
}

//parse dmst to simple object with arraybuffer in `d`
function parseArrayBufferJsonDepth1(arraybuffer) {
    var uint = new Uint8Array(arraybuffer);
    var length = uint.length;

    if (length < 14) {
        return JSON.parse(encoding.ab2s(arraybuffer));
    }

    var quoteSense = false;
    var lastQuote = null;
    var swap;

    //dStart: d block start, should be `"` in string or `n` in null
    //mStart, sStart, tStart: header start, should be `"` or `d`/`s`/`t`
    var dStart = 0, mStart = 0, sStart = 0, tStart = 0;

    //generally speaking, `d` in head and `m,s,t` in tail
    SearchD:
        for (var i = 0; i < length; i++) {
            swap = uint[i];
            switch (swap) {
                case QUOTE:
                case SQUOTE:
                    lastQuote = swap;
                    quoteSense = true;
                    break;
                case D:
                    if (!quoteSense && (length - i) > 1 && uint[i + 1] === COLON) {
                        //catch 'd'
                        dStart = i + 2;
                        break SearchD;
                    }
                    if ((quoteSense && (length - i) > 2 && uint[i + 1] === lastQuote &&
                        uint[i + 2] === COLON)) {
                        //catch "d": or 'd':
                        dStart = i + 3;
                        break SearchD;
                    }
                    quoteSense = false;
                    break;
                default:
                    quoteSense = false;
                    break;
            }
        }

    var colonSense = false;
    quoteSense = false;

    SearchMST:
        for (i = length + 1; --i;) {
            var got = undefined;
            swap = uint[i - 1];
            switch (swap) {
                case QUOTE:
                case SQUOTE:
                    if (colonSense) {
                        colonSense = false;
                        quoteSense = true;
                    }
                    lastQuote = swap;
                    break;
                case COLON:
                    colonSense = true;
                    break;
                case M:
                case S:
                case T:
                    if (i > 4 && quoteSense) {
                        //expect next quote
                        if (uint[i - 2] === lastQuote) {
                            //got it
                            got = i - 4;
                        }
                    } else if (i > 3 && colonSense && uint[i - 2] === COMMA) {
                        //got it
                        got = i - 3;
                    }
                    if (got !== undefined) {
                        switch (swap) {
                            case M:
                                mStart = got;
                                break;
                            case S:
                                sStart = got;
                                break;
                            case T:
                                tStart = got;
                                break;
                            default:
                                break;
                        }
                        if (mStart && tStart && sStart) {
                            break SearchMST;
                        }
                    }
                    colonSense = false;
                    quoteSense = false;
                    break;
                default:
                    colonSense = false;
                    quoteSense = false;
            }
        }

    if (mStart && sStart && tStart && dStart) {
        //found
        var min = mStart;
        if (min > sStart) min = sStart;
        if (min > tStart) min = tStart;
        //string should be cut by 2 bytes
        if (uint[min] === QUOTE || uint[min] === SQUOTE) {
            if (uint[dStart] === QUOTE || uint[dStart] === SQUOTE) {
                dStart++;
                min--;
            }
        }
        var dBuffer = arraybuffer.slice(dStart, min + 1); //inc, exc
        var leftLength = length - dBuffer.byteLength;
        var leftBuffer = new ArrayBuffer(leftLength);
        var left = new Uint8Array(leftBuffer);
        for (var j = 0; j < dStart; j++) {
            left[j] = uint[j];
        }
        for (var k = min + 1; k < length; k++) {
            left[j++] = uint[k];
        }
        var obj = JSON.parse(encoding.ab2s(leftBuffer));
        obj.d = dBuffer;
        return obj;
    } else {
        return JSON.parse(encoding.ab2s(arraybuffer));
    }
}

Parse.parseArrayBufferToJsonObject = parseArrayBufferToJsonObject;
Parse.parseArrayBufferToJsonWithStringInD = parseArrayBufferToJsonWithStringInD;
Parse.parseActionBufferDepth1 = parseArrayBufferJsonDepth1;

module.exports = Parse;
},{"coreutil/src/encoding":8}]},{},[28]);
