
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