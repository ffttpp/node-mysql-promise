/**
 *
 * USER: chenlingguang
 * TIME: 15/2/9 下午5:52
 */


module.exports = function () {
  return {
    //当前SQL
    sql: '',
    //SQL列表
    modelSql: {},
    //配置信息
    config: '',
    //事务次数
    transTimes: 0,
    //最后插入id
    lastInsertId: 0,
    //查询等待
    queryWaiting: {},
    //用于查询的sql语句，所有select语句根据该语句解析
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
    /**
     * 初始化
     * @param config
     */
    init: function (config) {
      this.config = config;
    },
    initConnect: function () {
      return this.getConnect();
    }
  };
};