/**
 *
 * USER: chenlingguang
 * TIME: 15/2/9 下午5:51
 */

var Db = require('./Lib/MysqlDb');
var defaultConfig = require('./Conf/config');
var util = require('util');
var querystring = require('querystring');
var Common = require('./Common/common');
var extend = Common.extend;
var getPromise = Common.getPromise;
var getObject = Common.getObject;
var isString = Common.isString;
var isNumber = Common.isNumber;
var isNumberString = Common.isNumberString;
var isArray = Common.isArray;
var isObject = Common.isObject;
var isBoolean = Common.isBoolean;
var isFunction = Common.isFunction;
var isScalar = Common.isScalar;
var isEmpty = Common.isEmpty;

var Mysql = function (config) {
  this.config = extend(defaultConfig, config);
  this.tablePrefix = this.config.tablePrefix || '';
  this.tableName = '';
  this.pk = 'id';
  this.fields = {};
  this._data = {};
  this._options = {
    tablePrefix: this.tablePrefix
  };
  this.init();
};

module.exports = Mysql;

/**
 * 初始化
 */
Mysql.prototype.init = function () {
  'use strict';
  this.db = new Db(this.config);
};

/**
 * 获取表信息
 * @param table
 * @param all
 * @returns {Promise|*}
 */
Mysql.prototype.getTableFields = function (table, all) {
  'use strict';
  var self = this;
  return self.flushFields(table).then(function (fields) {
    self.fields = fields;
    return getPromise(all ? fields : fields._field);
  })
};

/**
 * 获取表信息
 * @param table
 * @returns {Promise|*}
 */
Mysql.prototype.flushFields = function (table) {
  'use strict';
  table = table || this.tableName;
  return this.db.getFields(table).then(function (data) {
    var fields = {
      '_field': Object.keys(data),
      '_autoinc': false,
      '_unique': []
    };
    var types = {};
    for (var key in data) {
      var val = data[key];
      types[key] = val.type;
      if (val.primary) {
        fields._pk = key;
        if (val.autoinc) {
          fields._autoinc = true;
        }
      } else if (val.unique) {
        fields._unique.push(key);
      }
    }
    fields._type = types;
    return fields;
  });
};

/**
 * 获取主键
 * @returns {*}
 */
Mysql.prototype.getPk = function () {
  'use strict';
  var self = this;
  if (isEmpty(self.fields)) {
    return this.getTableFields().then(function () {
      return self.fields._pk || self.pk;
    })
  }
  return this.fields._pk || this.pk;
};

/**
 * 设置表名
 * @param table
 * @returns {Mysql}
 */
Mysql.prototype.table = function (table) {
  'use strict';
  var tableName = this.tablePrefix + table;
  this.tableName = tableName;
  this._options.table = tableName;
  return this;
};

// 链操作方法列表
var methodNameList = [
  'order', 'alias', 'having', 'group',
  'lock', 'auto', 'filter', 'validate'
];
methodNameList.forEach(function (item) {
  Mysql.prototype[item] = function (data) {
    'use strict';
    this._options[item] = data;
    return this;
  };
});

/**
 * distinct
 * @param data
 * @returns {Mysql}
 */
Mysql.prototype.distinct = function (data) {
  this._options.distinct = data;
  if (isString(data)) {
    this._options.field = data;
  }
  return this;
};

/**
 * 指定查询数量
 * @param offset
 * @param length
 * @returns {Mysql}
 */
Mysql.prototype.limit = function (offset, length) {
  'use strict';
  if (offset == undefined) {
    return this;
  }
  this._options.limit = length === undefined ? offset : offset + ',' + length;
  return this;
};

/**
 * 分页
 * @param page
 * @param listRows
 * @returns {Mysql}
 */
Mysql.prototype.page = function (page, listRows) {
  'use strict';
  if (page === undefined) {
    return this;
  }
  this._options.page = listRows === undefined ? page : page + ',' + listRows;
  return this;
};

/**
 * where条件
 * @param where
 * @returns {Mysql}
 */
Mysql.prototype.where = function (where) {
  'use strict';
  if (!where) {
    return this;
  }
  if (isString(where)) {
    where = {_string: where};
  }
  this._options.where = extend(this._options.where || {}, where);
  return this;
};

/**
 * 设置查询字段
 * @param field
 * @param reverse
 * @returns {Mysql}
 */
Mysql.prototype.field = function (field, reverse) {
  'use strict';
  if (isArray(field)) {
    field = field.join(',');
  } else if (!field) {
    field = '*';
  }
  this._options.field = field;
  this._options.fieldReverse = reverse;
  return this;
};

/**
 * 联合查询
 * @param union
 * @param all
 * @returns {Mysql}
 */
Mysql.prototype.union = function (union, all) {
  'use strict';
  if (!union) {
    return this;
  }
  if (!this._options.union) {
    this._options.union = [];
  }
  this._options.union.push({
    union: union,
    all: all
  });
  return this;
};

/**
 * .join({
 *   'xxx': {
 *     join: 'left',
 *     as: 'c',
 *     on: ['id', 'cid']
 *   }
 * })
 * 联合查询
 * @param join
 * @returns {Mysql}
 */
Mysql.prototype.join = function (join) {
  'use strict';
  if (!join) {
    return this;
  }
  if (!this._options.join) {
    this._options.join = [];
  }
  if (isArray(join)) {
    this._options.join = this._options.join.concat(join);
  } else {
    this._options.join.push(join);
  }
  return this;
};

/**
 * 解析条件
 * @param oriOpts
 * @param extraOptions
 * @returns {Promise|*}
 */
Mysql.prototype.parseOptions = function (oriOpts, extraOptions) {
  'use strict';
  var self = this;
  var options;
  if (isScalar(oriOpts)) {
    options = extend({}, self._options);
  } else {
    options = extend({}, self._options, oriOpts, extraOptions);
  }
  //查询过后清空sql表达式组装 避免影响下次查询
  this._options = {
    tablePrefix: this.tablePrefix
  };
  //获取表名
  var table = options.table || self.tableName;
  //数据表别名
  if (options.alias) {
    options.table += ' AS ' + options.alias;
  }
  var promise = this.getTableFields(table).then(function (fields) {
    if (isScalar(oriOpts)) {
      options = extend(options, self.parseWhereOptions(oriOpts), extraOptions);
    }
    return fields;
  });
  return promise.then(function (fields) {
    // 字段类型验证
    if (isObject(options.where) && !isEmpty(fields)) {
      var keyReg = /[\.\|\&]/;
      // 对数组查询条件进行字段类型检查
      for (var key in options.where) {
        var val = options.where[key];
        key = key.trim();
        if (fields.indexOf(key) > -1) {
          if (isScalar(val) || !val) {
            options.where[key] = self.parseType(options.where, key)[key];
          }
        } else if (key[0] !== '_' && !keyReg.test(key)) { //字段名不合法，报错
          return getPromise(new Error('field `' + key + '` in where condition is not valid'), true);
        }
      }
    }
    //field反选
    if (options.field && options.fieldReverse) {
      //fieldReverse设置为false
      options.fieldReverse = false;
      var optionsField = options.field.split(',');
      options.field = fields.filter(function (item) {
        if (optionsField.indexOf(item) > -1) {
          return;
        }
        return item;
      }).join(',');
    }
    return options;
  });
};

/**
 * 数据类型检测
 * @param data
 * @param key
 * @returns {*}
 */
Mysql.prototype.parseType = function (data, key) {
  'use strict';
  var fieldType = this.fields._type[key] || '';
  if (fieldType.indexOf('bigint') === -1 && fieldType.indexOf('int') > -1) {
    data[key] = parseInt(data[key], 10) || 0;
  } else if (fieldType.indexOf('double') > -1 || fieldType.indexOf('float') > -1) {
    data[key] = parseFloat(data[key]) || 0.0;
  } else if (fieldType.indexOf('bool') > -1) {
    data[key] = !!data[key];
  }
  return data;
};

/**
 * 对插入到数据库中的数据进行处理，要在parseOptions后执行
 * @param data
 * @returns {type[]}
 */
Mysql.prototype.parseData = function (data) {
  'use strict';
  //因为会对data进行修改，所以这里需要深度拷贝
  data = extend({}, data);
  var key;
  if (!isEmpty(this.fields)) {
    for (key in data) {
      var val = data[key];
      if (this.fields._field.indexOf(key) === -1) {
        delete data[key];
      } else if (isScalar(val)) {
        data = this.parseType(data, key);
      }
    }
  }
  //安全过滤
  if (isFunction(this._options.filter)) {
    for (key in data) {
      var ret = this._options.filter.call(this, key, data[key]);
      if (ret === undefined) {
        delete data[key];
      } else {
        data[key] = ret;
      }
    }
    delete this._options.filter;
  }
  return data;
};

/**
 * 插入数据
 * @param data
 * @param options
 * @param replace
 * @returns {*}
 */
Mysql.prototype.add = function (data, options, replace) {
  'use strict';
  if (options === true) {
    replace = true;
    options = {};
  }
  //copy data
  data = extend({}, this._data, data);
  this._data = {};
  if (isEmpty(data)) {
    return getPromise(new Error('_DATA_TYPE_INVALID_'), true);
  }
  var self = this;
  //解析后的选项
  var parsedOptions = {};
  //解析后的数据
  var parsedData = {};
  return this.parseOptions(options).then(function (options) {
    parsedOptions = options;
    return data;
  }).then(function (data) {
    parsedData = data;
    data = self.parseData(data);
    return self.db.insert(data, parsedOptions, replace);
  }).then(function (insertId) {
    return insertId;
  });
};

/**
 * 当前条件的数据不存在才插入数据
 * @param data
 * @param where
 * @param returnType
 * @returns {*|Bluebird.Promise|Promise}
 */
Mysql.prototype.thenAdd = function (data, where, returnType) {
  'use strict';
  if (where === true) {
    returnType = true;
    where = '';
  }
  var self = this;
  return this.where(where).find().then(function (findData) {
    if (!isEmpty(findData)) {
      var idValue = findData[self.getPk()];
      return returnType ? {id: idValue, type: 'exist'} : idValue;
    }
    return self.table(self.tableName).add(data).then(function (insertId) {
      return returnType ? {id: insertId, type: 'add'} : insertId;
    });
  });
};

/**
 * 插入多条数据
 * @param data
 * @param options
 * @param replace
 * @returns {*}
 */
Mysql.prototype.addAll = function (data, options, replace) {
  'use strict';
  if (!isArray(data) || !isObject(data[0])) {
    return getPromise(new Error('_DATA_TYPE_INVALID_'), true);
  }
  if (options === true) {
    replace = true;
    options = {};
  }
  var self = this;
  return this.parseOptions(options).then(function (options) {
    return self.db.insertAll(data, options, replace);
  }).then(function (insertId) {
    return insertId;
  });
};

/**
 * 删除数据
 * @param options
 * @returns {Promise|*}
 */
Mysql.prototype.delete = function (options) {
  'use strict';
  var self = this;
  var parsedOptions = {};
  return this.parseOptions(options).then(function (options) {
    parsedOptions = options;
    return self.db.delete(options);
  }).then(function (affectedRows) {
    return affectedRows;
  });
};

/**
 * 更新数据
 * @param data
 * @param options
 * @returns {*}
 */
Mysql.prototype.update = function (data, options) {
  'use strict';
  var self = this;
  data = extend({}, this._data, data);
  this._data = {};
  if (isEmpty(data)) {
    return getPromise(new Error('_DATA_TYPE_INVALID_'), true);
  }
  var parsedOptions = {};
  var parsedData = {};
  return this.parseOptions(options).then(function (options) {
    parsedOptions = options;
    return data;
  }).then(function (data) {
    var pk = self.getPk();
    parsedData = data;
    data = self.parseData(data);
    if (isEmpty(parsedOptions.where)) {
      // 如果存在主键数据 则自动作为更新条件
      if (!isEmpty(data[pk])) {
        parsedOptions.where = getObject(pk, data[pk]);
        delete data[pk];
      } else {
        return getPromise(new Error('_OPERATION_WRONG_'), true);
      }
    } else {
      parsedData[pk] = parsedOptions.where[pk];
    }
    return self.db.update(data, parsedOptions);
  }).then(function (affectedRows) {
    return affectedRows;
  });
};

/**
 * 更新单个字段的值
 * @param field
 * @param value
 * @returns {*}
 */
Mysql.prototype.updateField = function (field, value) {
  'use strict';
  var data = {};
  if (isObject(field)) {
    data = field;
  } else {
    data[field] = value;
  }
  return this.update(data);
};

/**
 * 字段增长
 * @param field
 * @param step
 * @returns {*}
 */
Mysql.prototype.updateInc = function (field, step) {
  'use strict';
  step = parseInt(step, 10) || 1;
  return this.updateField(field, ['exp', field + '+' + step]);
};

/**
 * 字段减少
 * @param field
 * @param step
 * @returns {*}
 */
Mysql.prototype.updateDec = function (field, step) {
  'use strict';
  step = parseInt(step, 10) || 1;
  return this.updateField(field, ['exp', field + '-' + step]);
};

/**
 * 解析options中简洁的where条件
 * @param options
 * @returns {*|{}}
 */
Mysql.prototype.parseWhereOptions = function (options) {
  'use strict';
  if (isNumber(options) || isString(options)) {
    var pk = this.getPk();
    options += '';
    var where = {};
    if (options.indexOf(',') > -1) {
      where[pk] = ['IN', options];
    } else {
      where[pk] = options;
    }
    options = {
      where: where
    };
  }
  return options || {};
};

/**
 * 查询一条数据
 * @param options
 * @returns {Promise|*}
 */
Mysql.prototype.find = function (options) {
  'use strict';
  var self = this;
  var parsedOptions = {};
  return this.parseOptions(options, {limit: 1}).then(function (options) {
    parsedOptions = options;
    return self.db.select(options);
  }).then(function (data) {
    return data[0] || {};
  });
};

/**
 * 查询数据
 * @param options
 * @returns {Promise|*}
 */
Mysql.prototype.select = function (options) {
  'use strict';
  var self = this;
  var parsedOptions = {};
  return this.parseOptions(options).then(function (options) {
    parsedOptions = options;
    return self.db.select(options);
  }).then(function (result) {
    return result;
  });
};

/**
 * 返回数据里含有count信息的查询
 * @param options
 * @param pageFlag      当页面不合法时的处理方式，true为获取第一页，false为获取最后一页，undefined获取为空
 * @returns {Promise|*}
 */
Mysql.prototype.countSelect = function (options, pageFlag) {
  'use strict';
  if (isBoolean(options)) {
    pageFlag = options;
    options = {};
  }
  var self = this;
  //解析后的options
  var parsedOptions = {};
  var result = {};
  return this.parseOptions(options).then(function (options) {
    parsedOptions = options;
    return self.options({
      where: options.where,
      cache: options.cache,
      join: options.join,
      alias: options.alias,
      table: options.table
    }).count((options.alias || self.tableName) + '.' + self.getPk());
  }).then(function (count) {
    var pageOptions = self.parsePage(parsedOptions);
    var totalPage = Math.ceil(count / pageOptions.num);
    if (isBoolean(pageFlag)) {
      if (pageOptions.page > totalPage) {
        pageOptions.page = pageFlag === true ? 1 : totalPage;
      }
      parsedOptions.page = pageOptions.page + ',' + pageOptions.num;
    }
    result = extend({count: count, total: totalPage}, pageOptions);
    if (!parsedOptions.page) {
      parsedOptions.page = pageOptions.page;
    }
    return self.select(parsedOptions);
  }).then(function (data) {
    result.data = data;
    return result;
  });
};

/**
 *
 * @param field
 * @param one
 * @returns {*}
 */

Mysql.prototype.getField = function (field, one) {
  'use strict';
  var self = this;
  return this.parseOptions({'field': field}).then(function (options) {
    if (isNumber(one)) {
      options.limit = one;
    } else if (one === true) {
      options.limit = 1;
    }
    return self.db.select(options);
  }).then(function (data) {
    var multi = field.indexOf(',') > -1;
    if (multi) {
      var fields = field.split(/\s*,\s*/);
      var result = {};
      fields.forEach(function (item) {
        result[item] = [];
      });
      data.every(function (item) {
        fields.forEach(function (fItem) {
          if (one === true) {
            result[fItem] = item[fItem];
          } else {
            result[fItem].push(item[fItem]);
          }
        });
        return one !== true;
      });
      return result;
    } else {
      data = data.map(function (item) {
        return Object.values(item)[0];
      });
      return one === true ? data[0] : data;
    }
  });
};

/**
 * SQL查询
 * @param sql
 * @param parse
 * @returns {Promise|*}
 */
Mysql.prototype.query = function (sql, parse) {
  'use strict';
  var self = this;
  if (parse !== undefined && !isBoolean(parse) && !isArray(parse)) {
    parse = [].slice.call(arguments, 1);
  }
  sql = self.parseSql(sql, parse);
  return self.db.select(sql).then(function (data) {
    self._options = {};
    return data;
  });
};

/**
 * 执行SQL语句，返回影响行数或者插入id
 * @param sql
 * @param parse
 * @returns {*|*|Bluebird.Promise|Promise|type[]}
 */
Mysql.prototype.execute = function(sql, parse){
  'use strict';
  if (parse !== undefined && !isBoolean(parse) && !isArray(parse)) {
    parse = [].slice.call(arguments, 1);
  }
  sql = this.parseSql(sql, parse);
  return this.db.execute(sql);
};

/**
 * 解析sql语句
 * @type {void|*}
 */
Mysql.prototype.parseSql = function (sql, parse) {
  'use strict';
  if (parse === undefined) {
    parse = [];
  } else if (!isArray(parse)) {
    parse = [parse];
  }
  parse.unshift(sql);
  sql = util.format.apply(null, parse);
  var map = {
    '__TABLE__': '`' + this.tableName + '`'
  };
  var self = this;
  sql = sql.replace(/__([A-Z]+)__/g, function (a, b) {
    return map[a] || ('`' + b.toLowerCase() + '`');
  });
  return sql;
};

['count', 'sum', 'min', 'max', 'avg'].forEach(function (item) {
  Mysql.prototype[item] = function (field) {
    'use strict';
    field = field || this.pk;
    return this.getField(item.toUpperCase() + '(' + field + ') AS `' + item + '`', true);
  }
});

/**
 * 设置操作选项
 * @param options
 * @returns {*}
 */
Mysql.prototype.options = function (options) {
  'use strict';
  if (options === true) {
    return this._options;
  }
  this._options = options;
  return this;
};

/**
 * 设置数据对象值
 * @param data
 * @returns {*}
 */
Mysql.prototype.data = function (data) {
  'use strict';
  if (data === true) {
    return this._data;
  }
  if (isString(data)) {
    data = querystring.parse(data);
  }
  this._data = data;
  return this;
};

/**
 * 启动事务
 * @returns {Promise|*}
 */
Mysql.prototype.startTrans = function () {
  'use strict';
  var self = this;
  return self.db.commit().then(function () {
    return self.db.startTrans();
  })
};

/**
 * 提交事务
 * @returns {*|Bluebird.Promise|Promise|*}
 */
Mysql.prototype.commit = function () {
  'use strict';
  return this.db.commit();
};

/**
 * 回滚事务
 * @returns {*|Bluebird.Promise|Promise|*}
 */
Mysql.prototype.rollback = function () {
  'use strict';
  return this.db.rollback();
};

/**
 * 关闭连接
 * @returns {*}
 */
Mysql.prototype.close = function () {
  'use strict';
  return this.db.close();
};

/**
 * 解析page
 * @param options
 * @returns {*}
 */
Mysql.prototype.parsePage = function (options) {
  'use strict';
  if ('page' in options) {
    var page = options.page + '';
    var num = 0;
    if (page.indexOf(',') > -1) {
      page = page.split(',');
      num = parseInt(page[1], 10);
      page = page[0];
    }
    num = num || this.config.listRows;
    page = parseInt(page, 10) || 1;
    return {
      page: page,
      num: num
    };
  }
  return {
    page: 1,
    num: this.config.listRows
  };
};

Object.values = function (obj) {
  'use strict';
  var values = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      values.push(obj[key])
    }
  }
  return values;
};