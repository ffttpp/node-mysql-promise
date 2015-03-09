/**
 *
 * USER: chenlingguang
 * TIME: 15/2/9 下午5:51
 */

var Mysql = require('./lib/Mysql');
exports.createConnection = function (config) {
  return new Mysql(config);
};