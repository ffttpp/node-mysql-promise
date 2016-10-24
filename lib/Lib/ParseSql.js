/**
 *
 * USER: chenlingguang
 * TIME: 15/3/4 上午10:10
 */

'use strict';
var Common = require('../Common/common');
var isString = Common.isString;
var isNumberString = Common.isNumberString;
var isArray = Common.isArray;
var isObject = Common.isObject;
var isBoolean =Common.isBoolean;
var isScalar = Common.isScalar;
var ucfirst = Common.ucfirst;

module.exports = {
  selectSql: 'SELECT%DISTINCT% %FIELD% FROM %TABLE%%JOIN%%WHERE%%GROUP%%HAVING%%ORDER%%LIMIT% %UNION%%COMMENT%',
  //where条件里的表达式
  comparison: {
    'EQ': '=',
    'NEQ': '!=',
    '<>': '!=',
    'GT': '>',
    'EGT': '>=',
    'LT': '<',
    'ELT': '<=',
    'NOTLIKE': 'NOT LIKE',
    'LIKE': 'LIKE',
    'IN': 'IN',
    'NOTIN': 'NOT IN'
  },
  parseKey: function (key) {
    key = (key || '').trim();
    if (!(/[,\'\"\*\(\)`.\s]/.test(key))) {
      key = '`' + key + '`';
    }
    return key;
  },
  /**
   * 解析value
   * @param value
   */
  parseValue: function (value) {
    var self = this;
    if (isString(value)) {
      value = '\'' + this.escapeString(value) + '\'';
    } else if (isArray(value)) {
      if ((value[0] + '').toLowerCase() === 'exp') {
        value = value[1];
      }else{
        value = value.map(function(item){
          return self.parseValue(item);
        });
      }
    } else if (isBoolean(value)) {
      value = value ? '1' : '0';
    } else if (value === null) {
      value = 'null';
    }
    return value;
  },
  /**
   * 解析set集合
   * @param data
   * @returns {string}
   */
  parseSet: function (data) {
    var self = this;
    data = data || {};
    var set = [];
    for (var key in data) {
      var value = self.parseValue(data[key]);
      if (isScalar(value)) {
        set.push(self.parseKey(key) + '=' + value);
      }
    }
    return 'SET ' + set.join(',');
  },
  /**
   * 解析field
   * @param fields
   * parseField('name')
   * parseField('name, email')
   * parseFiled(['name', 'email'])
   * parseField({
     *  'xxx_name': 'name',
     *  'xxx_email': 'email'
     * })
   * @returns {*}
   */
  parseField: function (fields) {
    var self = this;
    if (isString(fields) && fields.indexOf(',') > -1) {
      fields = fields.split(',');
    }
    if (isArray(fields)) {
      return fields.map(function (item) {
        return self.parseKey(item);
      }).join(',')
    } else if (isObject(fields)) {
      var data = [];
      for (var key in fields) {
        data.push(self.parseKey(key) + ' AS ' + self.parseKey(fields[key]));
      }
      return data.join(',')
    } else if (isString(fields) && fields) {
      return this.parseKey(fields);
    }
    return '*';
  },
  /**
   * 解析table别名
   * @param tables
   * @returns {string}
   */
  parseTable: function (tables) {
    var self = this;
    if (isString(tables)) {
      tables = tables.split(',');
    }
    if (isArray(tables)) {
      return tables.map(function (item) {
        return self.parseKey(item);
      }).join(',');
    } else if (isObject(tables)) {
      var data = [];
      for (var key in tables) {
        data.push(self.parseKey(key) + ' AS ' + self.parseKey(tables[key]));
      }
      return data.join(',')
    }
    return '';
  },
  /**
   * 解析where条件
   * @param where
   * @returns {string}
   */
  parseWhere: function (where) {
    var self = this;
    var whereStr = '';
    where = where || {};
    if (isString(where)) {
      whereStr = where;
    } else {
      //定义逻辑运算规则
      var oList = ['AND', 'OR', 'XOR'];
      var operate = (where._logic + '').toUpperCase();
      delete where._logic;
      operate = oList.indexOf(operate) > -1 ? ' ' + operate + ' ' : ' AND ';

      //key值的安全检测正则
      var keySafeRegExp = /^[\w\|\&\-\.\(\)\,]+$/;
      var multi = where._multi;
      delete where._multi;

      var val;
      var fn = function (item, i) {
        var v = multi ? val[i] : val;
        return '(' + self.parseWhereItem(self.parseKey(item), v) + ')';
      };
      for(var key in where){
        key = key.trim();
        val = where[key];
        whereStr += '( ';
        if (key.indexOf('_') === 0) {
          // 解析特殊条件表达式
          whereStr += this.parseSpecialWhere(key, val);
        }else{
          if (!keySafeRegExp.test(key)) {
            console.log(key + ' is not safe');
            continue;
          }
          var arr;
          // 支持 name|title|nickname 方式定义查询字段
          if (key.indexOf('|') > -1) {
            arr = key.split('|');
            whereStr += arr.map(fn).join(' OR ');
          }else if (key.indexOf('&') > -1) {
            arr = key.split('&');
            whereStr += arr.map(fn).join(' AND ');
          }else{
            whereStr += this.parseWhereItem(this.parseKey(key), val);
          }
        }
        whereStr += ' )' + operate;
      }
      whereStr = whereStr.substr(0, whereStr.length - operate.length);
    }
    return whereStr ? (' WHERE ' + whereStr) : '';
  },
  /**
   * 解析单个where条件
   * @param key
   * @param value
   * @returns {string}
   */
  parseWhereItem: function (key, val) {
    if (isObject(val)) { // {id: {'<': 10, '>': 1}}
      var logic = (val._logic || 'AND').toUpperCase();
      delete val._logic;
      var result = [];
      for(var opr in val){
        var nop = opr.toUpperCase();
        nop = this.comparison[nop] || nop;
        result.push(key + ' ' + nop + ' ' + this.parseValue(val[opr]));
      }
      return result.join(' ' + logic + ' ');
    }else if (!isArray(val)) {
      return key + ' = ' + this.parseValue(val);
    }
    var whereStr = '';
    var data;
    if (isString(val[0])) {
      var val0 = val[0].toUpperCase();
      val0 = this.comparison[val0] || val0;
      if (/^(=|!=|>|>=|<|<=)$/.test(val0)) { // 比较运算
        whereStr += key + ' ' + val0 + ' ' + this.parseValue(val[1]);
      }else if (/^(NOT\s+LIKE|LIKE)$/.test(val0)) { // 模糊查找
        if (isArray(val[1])) { //多个like
          var likeLogic = (val[2] || 'OR').toUpperCase();
          var likesLogic = ['AND','OR','XOR'];
          var self = this;
          if (likesLogic.indexOf(likeLogic) > -1) {
            var like = val[1].map(function(item){
              return key + ' ' + val0 + ' ' + self.parseValue(item);
            }).join(' ' + likeLogic + ' ');
            whereStr += '(' + like + ')';
          }
        }else{
          whereStr += key + ' ' + val0 + ' ' + this.parseValue(val[1]);
        }
      }else if(val0 === 'EXP'){ // 使用表达式
        whereStr += '(' + key + ' ' + val[1] + ')';
      }else if(val0 === 'IN' || val0 === 'NOT IN'){ // IN 运算
        if (val[2] === 'exp') {
          whereStr += key + ' ' + val0 + ' ' + val[1];
        }else{
          if (isString(val[1])) {
            val[1] = val[1].split(',');
          }
          //如果不是数组，自动转为数组
          if (!isArray(val[1])) {
            val[1] = [val[1]];
          }
          val[1] = this.parseValue(val[1]);
          //如果只有一个值，那么变成＝或者!=
          if (val[1].length === 1) {
            whereStr += key + (val0 === 'IN' ? ' = ' : ' != ') + val[1];
          }else{
            whereStr += key + ' ' + val0 + ' (' + val[1].join(',') + ')';
          }
        }
      }else if(val0 === 'BETWEEN'){ // BETWEEN运算
        data = isString(val[1]) ? val[1].split(',') : val[1];
        if (!isArray(data)) {
          data = [val[1], val[2]];
        }
        whereStr += ' (' + key + ' ' + val0 + ' ' + this.parseValue(data[0]);
        whereStr += ' AND ' + this.parseValue(data[1]) + ')';
      }else{
        console.log('_EXPRESS_ERROR_', key, val);
        return '';
      }
    }else{
      var length = val.length;
      var rule = 'AND';
      if (isString(val[length - 1])) {
        var last = val[length - 1].toUpperCase();
        if (last && ['AND', 'OR', 'XOR'].indexOf(last) > -1) {
          rule = last;
          length--;
        }
      }
      for(var i = 0; i < length; i++){
        var isArr = isArray(val[i]);
        data = isArr ? val[i][1] : val[i];
        var exp = ((isArr ? val[i][0] : '') + '').toUpperCase();
        if (exp === 'EXP') {
          whereStr += '(' + key + ' ' + data + ') ' + rule + ' ';
        }else{
          var op = isArr ? (this.comparison[val[i][0].toUpperCase()] || val[i][0]) : '=';
          whereStr += '(' + key + ' ' + op + ' ' + this.parseValue(data) + ') ' + rule + ' ';
        }
      }
      whereStr = whereStr.substr(0, whereStr.length - 4);
    }
    return whereStr;
  },
  /**
   * 解析特殊where条件
   * @param key
   * @param val
   * @returns {*}
   */
  parseSpecialWhere: function (key, val) {
    switch(key){
      // 字符串模式查询条件
      case '_string':
        return val;
      // 复合查询条件
      case '_complex':
        return this.parseWhere(val).substr(6);
      // 字符串模式查询条件
      case '_query':
        var where = isString(val) ? querystring.parse(val) : val;
        var op = ' AND ';
        if ('_logic' in where) {
          op = ' ' + where._logic.toUpperCase() + ' ';
          delete where._logic;
        }
        var arr = [];
        for(var name in where){
          val = where[name];
          val = this.parseKey(name) + ' = ' + this.parseValue(val);
          arr.push(val);
        }
        return arr.join(op);
      default:
        return '';
    }
    return '';
  },
  /**
   * 解析limit条件
   * @param limit
   * @returns {string}
   */
  parseLimit: function(limit){
    if (!limit) {
      return '';
    }
    limit = (limit + '').split(',');
    var data = [];
    for(var i = 0; i < Math.min(2, limit.length); i++){
      data[i] = limit[i] | 0;
    }
    return ' LIMIT ' + data.join(',');
  },
  /**
   * 解析join
   * @param join
   * @param options
   * @returns {string}
   */
  parseJoin: function (join, options) {
    console.log(options);
    if (!join) {
      return '';
    }
    var joinStr = '';
    var defaultJoin = ' LEFT JOIN ';
    if (isArray(join)) {
      var joins = {
        'left': ' LEFT JOIN ',
        'right': ' RIGHT JOIN ',
        'inner': ' INNER JOIN '
      };
      join.forEach(function(val){
        if (isString(val)) {//字符串，直接拼接
          var hasJoin = val.toLowerCase().indexOf(' join ') > -1;
          joinStr += (hasJoin ? ' ' : defaultJoin) + val;
        }else if (isObject(val)) {
          var ret = [];
          if (!('on' in val)) {
            for(var key in val){
              var v = val[key];
              v.table = key;
              ret.push(v);
            }
          }else{
            ret.push(val);
          }
          ret.forEach(function(item){
            var joinType = joins[item.join] || item.join || defaultJoin;
            // join 表中包含空格、tab等，认为是sql语句使用情况，与buildSql结合使用
            var table = item.table.trim();
            if( /\s+/.test(table) ) {
              if( table.indexOf('(') !== 0 ) {
                table = '(' + table + ')';
              }
              joinStr += joinType + table;
            } else {
              table = options.tablePrefix + table;
              joinStr += joinType + '`' + table + '`';
            }
            if (item.as) {
              joinStr += ' AS ' + item.as;
            }
            //ON条件
            if (item.on) {
              var mTable = options.alias || options.table;
              var jTable = item.as || table;
              //多个＝条件
              if (isObject(item.on)) {
                var where = [];
                for(var key in item.on){
                  where.push([
                    key.indexOf('.') > -1 ? key : (mTable + '.`' + key + '`'),
                    '=',
                    item.on[key].indexOf('.') > -1 ? item.on[key] : (jTable + '.`' + item.on[key] + '`')
                  ].join(''));
                }
                joinStr += ' ON (' + where.join(' AND ') + ')';
              }else{
                if (isString(item.on)) {
                  item.on = item.on.split(/\s*,\s*/);
                }
                joinStr += ' ON ' + (item.on[0].indexOf('.') > -1 ? item.on[0] : (mTable + '.`' + item.on[0] + '`'));
                joinStr += '=' + (item.on[1].indexOf('.') > -1 ? item.on[1] : (jTable + '.`' + item.on[1] + '`'));
              }
            }
          })
        }
      });
    }else{
      joinStr += defaultJoin + join;
    }
    return joinStr;
  },
  /**
   * 解析order
   * @param order
   * @returns {string}
   */
  parseOrder: function(order){
    var self = this;
    if (isArray(order)) {
      order = order.map(function(item){
        return self.parseKey(item);
      }).join(',');
    }else if (isObject(order)) {
      var arr = [];
      for(var key in order){
        var val = order[key];
        val = this.parseKey(key) + ' ' + val;
        arr.push(val);
      }
      order = arr.join(',');
    }
    return order ? (' ORDER BY ' + order) : '';
  },
  /**
   * 解析group
   * @param group
   * @returns {string}
   */
  parseGroup: function(group){
    if (!group) {
      return '';
    }
    if (isString(group)) {
      group = group.split(',');
    }
    var result = [];
    group.forEach(function(item){
      item = item.trim();
      if (!item) {
        return;
      }
      if (item.indexOf('.') === -1) {
        result.push('`' + item + '`');
      }else{
        item = item.split('.');
        result.push(item[0] + '.`' + item[1] + '`');
      }
    })
    if (!result.length) {
      return '';
    }
    return ' GROUP BY ' + result.join(',');
  },
  /**
   * 解析having
   * @param having
   * @returns {string}
   */
  parseHaving: function(having){
    return having ? (' HAVING ' + having) : '';
  },
  /**
   * 解析注释
   * @param comment
   * @returns {string}
   */
  parseComment: function(comment){
    return comment ? (' /* ' + comment + '*/') : '';
  },
  /**
   * 解析distinct
   * @param distinct
   * @returns {string}
   */
  parseDistinct: function(distinct){
    return distinct ? ' Distinct ' : '';
  },
  /**
   * 解析union
   * @param union
   * @returns {string}
   */
  parseUnion: function(union){
    if (!union) {
      return '';
    }
    if (isArray(union)) {
      var self = this;
      var sql = '';
      union.forEach(function(item){
        sql += item.all ? 'UNION ALL ' : 'UNION ';
        sql += '(' + (isObject(item.union) ? self.buildSelectSql(item.union).trim() : item.union) + ') ';
      });
      return sql;
    }else{
      return 'UNION (' + (isObject(union) ? this.buildSelectSql(union).trim() : union) + ') ';
    }
  },
  /**
   * 解析lock
   * @param lock
   * @returns {string}
   */
  parseLock: function(lock){
    if (!lock) {
      return '';
    }
    return ' FOR UPDATE ';
  },
  /**
   * page 转成limit
   * @param options
   * @returns {*|{}}
   */
  pageToLimit: function(options){
    options = options || {};
    //根据page生成limit
    if ('page' in options) {
      var page = options.page + '';
      var listRows = 0;
      if (page.indexOf(',') > -1) {
        page = page.split(',');
        listRows = page[1] | 0;
        page = page[0];
      }
      page = parseInt(page, 10) || 1;
      if (!listRows) {
        listRows = isNumberString(options.limit) ? options.limit : this.config.listRows;
      }
      var offset = listRows * (page - 1);
      options.limit = offset + ',' + listRows;
    }
    return options;
  },
  /**
   * 拼接select语句
   * @param options
   * @returns {type[]|promise}
   */
  buildSelectSql: function(options){
    options = this.pageToLimit(options);
    var sql = this.parseSql(this.selectSql, options);
    sql += this.parseLock(options.lock);
    return sql;
  },
  /**
   * 解析sql
   * @param sql
   * @param options
   * @returns {string}
   */
  parseSql: function(sql, options){
    options = options || {};
    var self = this;
    return sql.replace(/\%([A-Z]+)\%/g, function(a, type){
      type = type.toLowerCase();
      return self['parse' + ucfirst(type)](options[type] || '', options);
    }).replace(/__([A-Z_-]+)__/g, function(a, b){
      return '`' + b.toLowerCase() + '`';
    });
  },
  /**
   * 转义字符
   * @param str
   * @returns {*}
   */
  escapeString: function(str){
    if (!str) {
      return '';
    }
    return str.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
      switch(s) {
        case '\0':
          return '\\0';
        case '\n':
          return '\\n';
        case '\r':
          return '\\r';
        case '\b':
          return '\\b';
        case '\t':
          return '\\t';
        case '\x1a':
          return '\\Z';
        default:
          return '\\'+s;
      }
    });
  }
}