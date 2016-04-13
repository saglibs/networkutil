
var N = {};

var C = require('coreutil/core');
var Enc = null;
var Parser = require('./parse');

var noop = function() {};

C.root.serverPath = N.serverPath = "http://dev.indoorstar.com/ids/";
C.root.dataServer = N.dataServer = "http://indoorstar.com:6601/";
C.root.innerServer = N.innerServer = "http://dev.indoorstar.com:6603/ids/";

N.__catching = true;

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

    if (C.root.H.debug) {
        //TODO: should add a StackTraceStack class and a context tree
        trace = trace || [];
        if (!C.isArrayLike(trace) || typeof trace == 'string') {
            trace = [trace];
        }
        trace.unshift(C.getStackTrace());
        //noinspection JSUnusedGlobalSymbols
        this.stackTrace = trace;
        var oldCb = callback;
        var errCb = errback;
        if (callback) {
            callback.stackTrace = trace;
        }
        if (errback) {
            errback.stackTrace = trace;
        }
        var env = this;
        env.__catching = true;
        if (oldCb) callback = function() {
            var __ = C.__catching;
            C.__catching = true;
            try {
                oldCb.apply(env, arguments);
            } catch (e) {
                C.printStackTrace(trace);
            }
            C.__catching = __;
        };
        if (errCb) errback = function() {
            var __ = C.__catching;
            C.__catching = true;
            try {
                errCb.apply(env, arguments);
            } catch (e) {
                C.printStackTrace(trace);
            }
            C.__catching = __;
        };
    }

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

N.getRequest = function(url, callback, errback, type, trace) {
    return innerGetRequest(url, executors[type || 'raw'], callback, errback, trace);
};

N.getJson = function(url, callback, errback, overrideType, trace) {
    return innerGetRequest(url, executors[overrideType || 'json'], callback, errback, trace);
};

N.getBuffer = function(url, callback, errback, trace) {
    return innerGetRequest(url, executors.arraybuffer, callback, errback, trace);
};

N.getBlob = function(url, callback, errback, trace) {
    return innerGetRequest(url, executors.blob, callback, errback, trace);
};

N.getForm = function(url, callback, errback, trace) {
    return innerGetRequest(url, executors.form, callback, errback, trace);
};

N.getRaw = function(url, callback, errback, trace) {
    return innerGetRequest(url, executors.arraybuffer, function(d) {
        try {
            callback(Enc.handleActionRaw(d));
        } catch (e) {
            callback(d);
        }
    }, errback, trace);
};

N.postRequest = function(url, body, callback, errback, trace) {
    return innerPostRequest(url, {}, body, callback, errback, trace);
};

N.postForm = function(url, form, callback, errback, trace) {
    return N.postRequest(url, new FormData(form), callback, errback, trace);
};

N.postJson = function(url, json, callback, errback, trace) {
    return innerPostRequest(url, {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    }, json, callback, errback, trace);
};

N.postFile = function(url, file, callback, errback, trace) {
    file = file instanceof File ? file : file.files[0];
    var form = new FormData();
    form.append('file', file);
    N.postForm(url, form, callback, errback, trace);
};

N.cGetAction = function(server, action, params, callback, errback, type, trace) {
    if (typeof errback != 'function' && trace === undefined) {
        //assume trace here
        trace = type;
        type = errback;
        errback = noop;
    }
    if (typeof type != 'string' && trace === undefined) {
        trace = type;
        type = null;
    }
    return N.getBuffer(C.getUrlByParams(server, action, params), function(obj) {
        (callback || noop)(parseActionResponse(obj, type));
    }, errback, trace);
};

N.getAction = function(action, params, callback, errback, trace) {
    return N.cGetAction(N.serverPath, action, params, callback, errback, trace);
};

N.get = N.getRequest;

N.cPostAction = function(server, action, params, data, callback, errback, trace) {
    if (typeof errback != 'function' && trace === undefined) {
        //assume trace here
        trace = errback;
        errback = noop;
    }
    return N.postRequest(C.getUrlByParams(server, action, params), C.param(data), callback, errback, trace);
};

N.postAction = function(action, params, data, callback, errback, trace) {
    return N.cPostAction(N.serverPath, action, params, data, callback, errback, trace);
};

N.post = N.postRequest;

module.exports = N;