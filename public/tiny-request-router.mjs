// @ts-nocheck
/*!
 * tiny-request-router v1.2.2 by berstend
 * https://github.com/berstend/tiny-request-router#readme
 * @license MIT
 */
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

var __assign = function () {
  __assign =
    Object.assign ||
    function __assign(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s)
          if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
      }
      return t;
    };
  return __assign.apply(this, arguments);
};

/**
 * Tokenize input string.
 */
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === '*' || char === '+' || char === '?') {
      tokens.push({type: 'MODIFIER', index: i, value: str[i++]});
      continue;
    }
    if (char === '\\') {
      tokens.push({type: 'ESCAPED_CHAR', index: i++, value: str[i++]});
      continue;
    }
    if (char === '{') {
      tokens.push({type: 'OPEN', index: i, value: str[i++]});
      continue;
    }
    if (char === '}') {
      tokens.push({type: 'CLOSE', index: i, value: str[i++]});
      continue;
    }
    if (char === ':') {
      var name = '';
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          (code >= 48 && code <= 57) ||
          // `A-Z`
          (code >= 65 && code <= 90) ||
          // `a-z`
          (code >= 97 && code <= 122) ||
          // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name) throw new TypeError('Missing parameter name at ' + i);
      tokens.push({type: 'NAME', index: i, value: name});
      i = j;
      continue;
    }
    if (char === '(') {
      var count = 1;
      var pattern = '';
      var j = i + 1;
      if (str[j] === '?') {
        throw new TypeError('Pattern cannot start with "?" at ' + j);
      }
      while (j < str.length) {
        if (str[j] === '\\') {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ')') {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === '(') {
          count++;
          if (str[j + 1] !== '?') {
            throw new TypeError('Capturing groups are not allowed at ' + j);
          }
        }
        pattern += str[j++];
      }
      if (count) throw new TypeError('Unbalanced pattern at ' + i);
      if (!pattern) throw new TypeError('Missing pattern at ' + i);
      tokens.push({type: 'PATTERN', index: i, value: pattern});
      i = j;
      continue;
    }
    tokens.push({type: 'CHAR', index: i, value: str[i++]});
  }
  tokens.push({type: 'END', index: i, value: ''});
  return tokens;
}
/**
 * Parse a string for the raw tokens.
 */
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes,
    prefixes = _a === void 0 ? './' : _a;
  var defaultPattern = '[^' + escapeString(options.delimiter || '/#?') + ']+?';
  var result = [];
  var key = 0;
  var i = 0;
  var path = '';
  var tryConsume = function (type) {
    if (i < tokens.length && tokens[i].type === type) return tokens[i++].value;
  };
  var mustConsume = function (type) {
    var value = tryConsume(type);
    if (value !== undefined) return value;
    var _a = tokens[i],
      nextType = _a.type,
      index = _a.index;
    throw new TypeError(
      'Unexpected ' + nextType + ' at ' + index + ', expected ' + type
    );
  };
  var consumeText = function () {
    var result = '';
    var value;
    // tslint:disable-next-line
    while ((value = tryConsume('CHAR') || tryConsume('ESCAPED_CHAR'))) {
      result += value;
    }
    return result;
  };
  while (i < tokens.length) {
    var char = tryConsume('CHAR');
    var name = tryConsume('NAME');
    var pattern = tryConsume('PATTERN');
    if (name || pattern) {
      var prefix = char || '';
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = '';
      }
      if (path) {
        result.push(path);
        path = '';
      }
      result.push({
        name: name || key++,
        prefix: prefix,
        suffix: '',
        pattern: pattern || defaultPattern,
        modifier: tryConsume('MODIFIER') || ''
      });
      continue;
    }
    var value = char || tryConsume('ESCAPED_CHAR');
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = '';
    }
    var open = tryConsume('OPEN');
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume('NAME') || '';
      var pattern_1 = tryConsume('PATTERN') || '';
      var suffix = consumeText();
      mustConsume('CLOSE');
      result.push({
        name: name_1 || (pattern_1 ? key++ : ''),
        pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
        prefix: prefix,
        suffix: suffix,
        modifier: tryConsume('MODIFIER') || ''
      });
      continue;
    }
    mustConsume('END');
  }
  return result;
}
/**
 * Escape a regular expression string.
 */
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1');
}
/**
 * Get the flags for a regexp from the options.
 */
function flags(options) {
  return options && options.sensitive ? '' : 'i';
}
/**
 * Pull out keys from a regexp.
 */
function regexpToRegexp(path, keys) {
  if (!keys) return path;
  // Use a negative lookahead to match only capturing groups.
  var groups = path.source.match(/\((?!\?)/g);
  if (groups) {
    for (var i = 0; i < groups.length; i++) {
      keys.push({
        name: i,
        prefix: '',
        suffix: '',
        modifier: '',
        pattern: ''
      });
    }
  }
  return path;
}
/**
 * Transform an array into a regexp.
 */
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function (path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp('(?:' + parts.join('|') + ')', flags(options));
}
/**
 * Create a path regexp from string input.
 */
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
/**
 * Expose a function for taking tokens and returning a RegExp.
 */
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict,
    strict = _a === void 0 ? false : _a,
    _b = options.start,
    start = _b === void 0 ? true : _b,
    _c = options.end,
    end = _c === void 0 ? true : _c,
    _d = options.encode,
    encode =
      _d === void 0
        ? function (x) {
            return x;
          }
        : _d;
  var endsWith = '[' + escapeString(options.endsWith || '') + ']|$';
  var delimiter = '[' + escapeString(options.delimiter || '/#?') + ']';
  var route = start ? '^' : '';
  // Iterate over the tokens and create our regexp string.
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === 'string') {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys) keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === '+' || token.modifier === '*') {
            var mod = token.modifier === '*' ? '?' : '';
            route +=
              '(?:' +
              prefix +
              '((?:' +
              token.pattern +
              ')(?:' +
              suffix +
              prefix +
              '(?:' +
              token.pattern +
              '))*)' +
              suffix +
              ')' +
              mod;
          } else {
            route +=
              '(?:' +
              prefix +
              '(' +
              token.pattern +
              ')' +
              suffix +
              ')' +
              token.modifier;
          }
        } else {
          route += '(' + token.pattern + ')' + token.modifier;
        }
      } else {
        route += '(?:' + prefix + suffix + ')' + token.modifier;
      }
    }
  }
  if (end) {
    if (!strict) route += delimiter + '?';
    route += !options.endsWith ? '$' : '(?=' + endsWith + ')';
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited =
      typeof endToken === 'string'
        ? delimiter.indexOf(endToken[endToken.length - 1]) > -1
        : // tslint:disable-next-line
          endToken === undefined;
    if (!strict) {
      route += '(?:' + delimiter + '(?=' + endsWith + '))?';
    }
    if (!isEndDelimited) {
      route += '(?=' + delimiter + '|' + endsWith + ')';
    }
  }
  return new RegExp(route, flags(options));
}
/**
 * Normalize the given path string, returning a regular expression.
 *
 * An empty array can be passed in for the keys, which will hold the
 * placeholder key descriptions. For example, using `/user/:id`, `keys` will
 * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
 */
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp) return regexpToRegexp(path, keys);
  if (Array.isArray(path)) return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}

/**
 * Tiny request router. Allows overloading of handler type to be fully type safe.
 *
 * @example
 * import { Router, Method, Params } from 'tiny-request-router'
 *
 * // Let the router know that handlers are async functions returning a Response
 * type Handler = (params: Params) => Promise<Response>
 *
 * const router = new Router<Handler>()
 */
var Router = /** @class */ (function () {
  function Router() {
    /** List of all registered routes. */
    this.routes = [];
  }
  /** Add a route that matches any method. */
  Router.prototype.all = function (path, handler, options) {
    if (options === void 0) {
      options = {};
    }
    return this._push('ALL', path, handler, options);
  };
  /** Add a route that matches the GET method. */
  Router.prototype.get = function (path, handler, options) {
    if (options === void 0) {
      options = {};
    }
    return this._push('GET', path, handler, options);
  };
  /** Add a route that matches the POST method. */
  Router.prototype.post = function (path, handler, options) {
    if (options === void 0) {
      options = {};
    }
    return this._push('POST', path, handler, options);
  };
  /** Add a route that matches the PUT method. */
  Router.prototype.put = function (path, handler, options) {
    if (options === void 0) {
      options = {};
    }
    return this._push('PUT', path, handler, options);
  };
  /** Add a route that matches the PATCH method. */
  Router.prototype.patch = function (path, handler, options) {
    if (options === void 0) {
      options = {};
    }
    return this._push('PATCH', path, handler, options);
  };
  /** Add a route that matches the DELETE method. */
  Router.prototype['delete'] = function (path, handler, options) {
    if (options === void 0) {
      options = {};
    }
    return this._push('DELETE', path, handler, options);
  };
  /** Add a route that matches the HEAD method. */
  Router.prototype.head = function (path, handler, options) {
    if (options === void 0) {
      options = {};
    }
    return this._push('HEAD', path, handler, options);
  };
  /** Add a route that matches the OPTIONS method. */
  Router.prototype.options = function (path, handler, options) {
    if (options === void 0) {
      options = {};
    }
    return this._push('OPTIONS', path, handler, options);
  };
  /**
   * Match the provided method and path against the list of registered routes.
   *
   * @example
   * router.get('/foobar', async () => new Response('Hello'))
   *
   * const match = router.match('GET', '/foobar')
   * if (match) {
   *   // Call the async function of that match
   *   const response = await match.handler()
   *   console.log(response) // => Response('Hello')
   * }
   */
  Router.prototype.match = function (method, path) {
    for (var _i = 0, _a = this.routes; _i < _a.length; _i++) {
      var route = _a[_i];
      // Skip immediately if method doesn't match
      if (route.method !== method && route.method !== 'ALL') continue;
      // Speed optimizations for catch all wildcard routes
      if (route.path === '(.*)') {
        return __assign(__assign({}, route), {params: {0: route.path}});
      }
      if (route.path === '/' && route.options.end === false) {
        return __assign(__assign({}, route), {params: {}});
      }
      // If method matches try to match path regexp
      var matches = route.regexp.exec(path);
      if (!matches || !matches.length) continue;
      return __assign(__assign({}, route), {
        matches: matches,
        params: keysToParams(matches, route.keys)
      });
    }
    return null;
  };
  Router.prototype._push = function (method, path, handler, options) {
    var keys = [];
    if (path === '*') {
      path = '(.*)';
    }
    var regexp = pathToRegexp(path, keys, options);
    this.routes.push({
      method: method,
      path: path,
      handler: handler,
      keys: keys,
      options: options,
      regexp: regexp
    });
    return this;
  };
  return Router;
})();
// Convert an array of keys and matches to a params object
var keysToParams = function (matches, keys) {
  var params = {};
  for (var i = 1; i < matches.length; i++) {
    var key = keys[i - 1];
    var prop = key.name;
    var val = matches[i];
    if (val !== undefined) {
      params[prop] = val;
    }
  }
  return params;
};

export {Router, pathToRegexp};
//# sourceMappingURL=router.browser.mjs.map
