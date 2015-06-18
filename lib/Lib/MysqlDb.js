/**
 * mysql 数据库
 * USER: chenlingguang
 * TIME: 15/2/9 下午5:52
 */

var MysqlSocket = require('./MysqlSocket');
var parseSql = require('./ParseSql');
var Common = require('../Common/common');
var extend = Common.extend;
var getDefer = Common.getDefer;
var getPromise = Common.getPromise;
var isString = Common.isString;
var isNumberString = Common.isNumberString;
var isArray = Common.isArray;
var isObject = Common.isObject;
var isBoolean =Common.isBoolean;
var isScalar = Common.isScalar;

function MysqlDb (config) {
  'use strict';
  this.config = config;
  this.init();
}

exports = module.exports = MysqlDb;

/**
 * 初始化
 */
MysqlDb.prototype.init = function () {
  'use strict';
  this.mysql = new MysqlSocket(this.config);
};

/**
 * 获取表字段信息
 * @param tableName
 * @returns {*|Bluebird.Promise|Promise}
 */
MysqlDb.prototype.getFields = function (tableName) {
  'use strict';
  var self = this;
  var sql = "SHOW COLUMNS FROM " + self.parseKey(tableName);
  return self.mysql.query(sql).then(function (data) {
    var ret = {};
    data.forEach(function (item) {
      ret[item.Field] = {
        'name': item.Field,
        'type': item.Type,
        'notnull': item.Null === '',
        'default': item.Default,
        'primary': item.Key === 'PRI',
        'unique': item.Key === 'UNI',
        'autoinc': item.Extra.toLowerCase() === 'auto_increment'
      }
    });
    return ret;
  })
};

/**
 * 获取数据库的表信息
 * @param dbName
 * @returns {*|Bluebird.Promise|Promise}
 */
MysqlDb.prototype.getTables = function (dbName) {
  'use strict';
  var sql = 'SHOW TABLES';
  if (dbName) {
    sql += ' FROM ' + dbName;
  }
  return this.query(sql).then(function(data){
    return data.map(function(item){
      for(var key in item){
        return item[key];
      }
    });
  });
};

/**
 * 解析key
 * @param key
 * @returns {string}
 */
MysqlDb.prototype.parseKey = function (key) {
  'use strict';
  key = (key || '').trim();
  if (!(/[,\'\"\*\(\)`.\s]/.test(key))) {
    key = '`' + key + '`';
  }
  return key;
};

/**
 * 执行select操作
 * @param options
 * @returns {*}
 */
MysqlDb.prototype.select = function (options) {
  'use strict';
  var self = this;
  var sql;
  if (isString(options) && options.toUpperCase().indexOf('SELECT') > -1) {
    sql = options;
  } else {
    options = options || {};
    sql = parseSql.buildSelectSql(options);
  }
  return self.query(sql);
};

/**
 * 执行update操作
 * @param data
 * @param options
 * @returns {*|Bluebird.Promise|Promise|*}
 */
MysqlDb.prototype.update = function(data, options) {
  'use strict';
  options = options || {};
  var sql = [
    'UPDATE ',
    parseSql.parseTable(options.table),
    parseSql.parseSet(data),
    parseSql.parseWhere(options.where),
    parseSql.parseOrder(options.order),
    parseSql.parseLimit(options.limit),
    parseSql.parseLock(options.lock),
    parseSql.parseComment(options.comment)
  ].join('');
  return this.execute(sql);
};

/**
 * 插入一条数据
 * @param data
 * @param options
 * @param replace
 * @returns {*|Bluebird.Promise|Promise|*}
 */
MysqlDb.prototype.insert = function (data, options, replace) {
  'use strict';
  data = data || {};
  options = options || {};
  var values = [];
  var fields = [];
  for (var key in data) {
    var val = parseSql.parseValue(data[key]);
    if (isScalar(key)) {
      values.push(val);
      fields.push(this.parseKey(key))
    }
  }
  var sql = (replace ? 'REPLACE' : 'INSERT') + ' INTO ';
  sql += parseSql.parseTable(options.table);
  sql += ' (' + fields.join(',') + ')';
  sql += ' VALUES (' + values.join(',') + ')';
  sql += parseSql.parseLock(options.lock) + parseSql.parseComment(options.comment);
  return this.execute(sql);
};

/**
 * 插入多条数据
 * @param data
 * @param options
 * @param replace
 * @returns {*|Bluebird.Promise|Promise|*}
 */
MysqlDb.prototype.insertAll = function (data, options, replace) {
  'use strict';
  var self = this;
  var fields = Object.keys(data[0]);
  fields = fields.map(function (item) {
    return self.parseKey(item);
  }).join(',');
  var values = data.map(function (item) {
    var value = [];
    for (var key in item) {
      if (isScalar(key)) {
        value.push(parseSql.parseValue(item[key]));
      }
    }
    return '(' + value.join(',') + ')';
  }).join(',');
  var sql = (replace ? 'REPLACE' : 'INSERT') + ' INTO ';
  sql += parseSql.parseTable(options.table);
  sql += ' (' + fields + ') VALUES ' + values;
  return self.execute(sql);
};

/**
 * 执行delete操作
 * @param options
 * @returns {*|Bluebird.Promise|Promise|*}
 */
MysqlDb.prototype.delete = function (options) {
  'use strict';
  options = options || {};
  var sql = [
    'DELETE FROM ',
    parseSql.parseTable(options.table),
    parseSql.parseWhere(options.where),
    parseSql.parseOrder(options.order),
    parseSql.parseLimit(options.limit),
    parseSql.parseLock(options.lock),
    parseSql.parseComment(options.comment)
  ].join('');
  return this.execute(sql);
};

/**
 * 执行sql
 * @param sql
 * @returns {*|type[]}
 */
MysqlDb.prototype.query = function (sql) {
  'use strict';
  var self = this;
  return self.mysql.query(sql);
};

/**
 * 执行sql，返回影响行数
 * @param sql
 * @returns {*|Bluebird.Promise|Promise}
 */
MysqlDb.prototype.execute = function (sql) {
  'use strict';
  var self = this;
  return self.query(sql).then(function (data) {
    if (data.insertId) {
      return  data.insertId;
    }
    return data.affectedRows || 0;
  });
};


/**
 * 关闭连接
 */
MysqlDb.prototype.close = function () {
  'use strict';
  this.mysql.close();
};

/**
 * 启动事务
 * @returns {*|Bluebird.Promise|Promise|*}
 */
MysqlDb.prototype.startTrans = function () {
  'use strict';
  return this.execute('START TRANSACTION');
};

/**
 * 提交事务
 * @returns {*|Bluebird.Promise|Promise|*}
 */
MysqlDb.prototype.commit = function () {
  'use strict';
  return this.execute('COMMIT');
};

/**
 * 回滚事务
 * @returns {*|Bluebird.Promise|Promise|*}
 */
MysqlDb.prototype.rollback = function () {
  'use strict';
  return this.execute('ROLLBACK');
};
