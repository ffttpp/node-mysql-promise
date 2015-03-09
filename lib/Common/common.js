/**
 *
 * USER: chenlingguang
 * TIME: 15/2/10 下午2:45
 */

'use strict';

var Promise = global.Promise;

/**
 * Promise 如果不支持Promise，引用es6-promise
 */
if (!Promise) {
  Promise = require('es6-promise').Promise;
}

exports.Promise = Promise;

/**
 * 继承
 * @returns {T}
 */
var extend = exports.extend = function () {
  'use strict';
  var args = [].slice.call(arguments);
  var deep = true;
  var target = args.shift();
  if (isBoolean(target)) {
    deep = target;
    target = args.shift();
  }
  target = target || {};
  var length = args.length;
  var options, name, src, copy, copyAsArray, clone;
  for (var i = 0; i < length; i++) {
    options = args[i] || {};
    for (name in options) {
      src = target[name];
      copy = options[name];
      if (src && src === copy) {
        continue;
      }
      if (deep && copy && (isObject(copy) || (copyAsArray = isArray(copy) ))) {
        if (copyAsArray) {
          copyAsArray = false;
          clone = [];
        } else {
          clone = src && isObject(src) ? src : {};
        }
        target[name] = extend(deep, clone, copy);
      } else {
        target[name] = copy;
      }
    }
  }
  return target;
};

/**
 * 生成一个promise,如果传入的参数是promise则直接返回
 * @param  {[type]} obj [description]
 * @return {[type]}     [description]
 */
var getPromise = exports.getPromise = function (obj, reject) {
  'use strict';
  if (isPromise(obj)) {
    return obj;
  }
  if (reject) {
    return Promise.reject(obj);
  }
  return Promise.resolve(obj);
};

/**
 * 生成一个defer对象
 * @return {[type]} [description]
 */
var getDefer = exports.getDefer = function () {
  'use strict';
  var deferred = {};
  deferred.promise = new Promise(function (resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
};

/**
 * 生成一个object
 * @type {Function}
 */
var getObject = exports.getObject = function(key, value){
  'use strict';
  var obj = {};
  if (!isArray(key)) {
    obj[key] = value;
    return obj;
  }
  key.forEach(function(item, i){
    obj[item] = value[i];
  });
  return obj;
};

/**
 * 首字母大写
 * @type {Function}
 */
var ucfirst = exports.ucfirst = function(name){
  'use strict';
  name = (name || '') + '';
  return name.substr(0,1).toUpperCase() + name.substr(1).toLowerCase();
};

var toString = Object.prototype.toString;

/**
 * 是否是boolean
 * @param obj
 * @returns {boolean}
 */
var isBoolean = exports.isBoolean = function (obj) {
  'use strict';
  return toString.call(obj) === '[object Boolean]';
};

/**
 * 是否是个数字
 * @param obj
 * @returns {boolean}
 */
var isNumber = exports.isNumber = function(obj){
  'use strict';
  return toString.call(obj) === '[object Number]';
};

/**
 * 是否是个字符串
 * @param obj
 * @returns {boolean}
 */
var isString = exports.isString = function(obj){
  'use strict';
  return toString.call(obj) === '[object String]';
};

/**
 * 是否为数字组成的字符串
 * @type {RegExp}
 */
var numberReg = /^((\-?\d*\.?\d*(?:e[+-]?\d*(?:\d?\.?|\.?\d?)\d*)?)|(0[0-7]+)|(0x[0-9a-f]+))$/i;
var isNumberString = exports.isNumberString = function(obj){
  'use strict';
  return numberReg.test(obj);
};
/**
 * 是否是个对象
 * @param obj
 * @returns {boolean}
 */
var isObject = exports.isObject = function (obj) {
  'use strict';
  if (Buffer.isBuffer(obj)) {
    return false;
  }
  return toString.call(obj) === '[object Object]';
};

/**
 * 判断是否是个数组
 * @type {Function}
 */
var isArray = exports.isArray = Array.isArray;

/**
 * 是否是个函数
 * @param obj
 * @returns {boolean}
 */
var isFunction = exports.isFunction = function(obj){
  'use strict';
  return typeof obj === 'function';
};

/**
 * 判断是否是个promise
 * @param obj
 * @returns {boolean}
 */
var isPromise = exports.isPromise = function (obj) {
  'use strict';
  return !!(obj && typeof obj.then === 'function');
};

/**
 * 判断是否是个标量
 * @param obj
 * @returns {*}
 */
var isScalar = exports.isScalar = function(obj){
  'use strict';
  return isBoolean(obj) || isNumber(obj) || isString(obj);
};

/**
 * 判断是否为空
 * @type {Function}
 */
var isEmpty = exports.isEmpty = function(obj){
  'use strict';
  if (isObject(obj)) {
    var key;
    for(key in obj){
      return false;
    }
    return true;
  }else if (isArray(obj)) {
    return obj.length === 0;
  }else if (isString(obj)) {
    return obj.length === 0;
  }else if (isNumber(obj)) {
    return obj === 0;
  }else if (obj === null || obj === undefined) {
    return true;
  }else if (isBoolean(obj)) {
    return !obj;
  }
  return false;
};
