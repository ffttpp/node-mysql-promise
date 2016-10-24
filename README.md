# node-mysql-promise


## Install
	$ npm install node-mysql-promise
	
## Introduction
node mysql操作封装类，基于promise，借鉴75team开源项目thinkjs中model操作，数据库连接使用node-mysql的连接池。
### 使用示例

```js
var Mysql = require('node-mysql-promise');
var mysql = Mysql.createConnection({
	host        : 'localhost',
	user        : 'username',
	password    : 'password'
});
//SELECT * FROM table;
mysql.table('table').select().then(function (data) {
	console.log(data);
}).catch(function (e) {
	console.log(e);
});
```
	

##API
### 配置
* `host`: 连接的host（默认: localhost）
* `port`: 连接端口
* `user`: 用户名
* `password`: 密码
* `database`: 数据库名
* `tablePrefix`: 数据表前缀
* `charset`: 编码（默认: UTF8_GENERAL_CI）
* `timezone`: 时区（默认: 'local'）
* `connectTimeout`: 连接超时时间（默认: 10000）
* `connectionLimit`: 最大连接数（默认: 10）
* `logSql`: 控制台输出sql（默认: false）

### 方法

##### table(tableName)
设置要查询的表（必需）

* `tableName` String 要查询的表
* `return` this

```js
//SELECT * FROM `table`
mysql.table('table').select()
```


#### field(field, reverse)
设置要查询的字段

* `field` String|Array 要查询的字段，可以是字符串，也可以是数组
* `reverse` Boolean 是否反选字段
* `return` this

```js
//SELECT * FROM `table`
mysql.table('table').field().select();
//SELECT `id`, `title` FROM `table`
mysql.table('table').field('id, title').select();
//SELECT `id`, `title` FROM `table`
mysql.table(['id', 'title']).select();
//SELECT `author`, `date` FROM `table`
mysql.table('table').field(['id', 'title'], true).select();
```
		
		
#### limit(offset, length)

设置查询的数量
* `offset` Number 起始位置
* `length` Number 查询的数目
* `return` this

```js
//SELECT * FROM `table` LIMIT 10
mysql.table('table').limit(10).select();
//SELECT * FROM `table` LIMIT 10, 20
mysql.table('table').limit(10, 20).select();
```
		
#### page(page, listRows)
设置当前查询的页数，页数从1开始

* `page` Number 当前的页数
* `listRows` Number 一页记录条数，默认20条
* `return` this

```js
//SELECT * FROM `table`
mysql.table('table').page().select();
//SELECT * FROM `table` LIMIT 0,20
mysql.table('table').page(1).select();
//SELECT * FROM `table` LIMIT 10, 20
mysql.table('table').page(2, 10).select();
```
		
#### union(union, all)
联合查询

* `union` String 联合查询的字符串
* `all` 是否为UNION ALL模式
* `return` this

```js
//SELECT * FROM `table` UNION (SELECT * FROM `table2`)
mysql.table('table').union('SELECT * FROM `table2`').select();
//SELECT * FROM `table` UNION ALL (SELECT * FROM `table2`)
mysql.table('table').union('SELECT * FROM `table2`', true).select();
//SELECT * FROM `table` UNION ALL (SELECT * FROM `table2`)
mysql.table('table').union({table: 'table2'}, true);
//SELECT * FROM `table` UNION ALL (SELECT * FROM `table2`) UNION (SELECT * FROM `table3`)
mysql.table('table').UNION({table: 'table2`}, true).union({table: 'table3'});
```
		

#### join(join)
组合查询

* `join` String|Array|Object
* `return` this

```js
//SELECT * FROM `table` LEFT JOIN `table2` ON table.id = table2.id
mysql.table('table').join('table2 on table.id = table2.id').select();
//SELECT * FROM `table` LEFT JOIN `table2` ON table.id = table2.id RIGHT JOIN `table3` ON table.sid = table3.sid
mysql.table('table').join('table2 ON table.id = table2.id', 'RIGHT JOIN table3 ON table.sid = table3.sid').select();
//SELECT * FROM `table` INNER JOIN `table2` on table.id = table2.id
mysql.table('table').join({
	table: 'table2',
	join: 'inner',//left, right, inner三种方式
	as: 'c' //表别名
	on: ['id', 'id'] //ON 条件
}).select();
//SELECT * FROM `table` AS a LEFT JOIN `table2` AS b ON a.id = b.id LEFT JOIN `table3` AS c ON a.sid = c.sid
mysql.table('table').alias('a').join({
	table: 'table2',
	join: 'left',
	as: 'b'
	on: ['id', 'id']
}).join({
	table: 'table3',
	join: 'left',
	as: 'c',
	on: ['sid', 'sid']
}).select();		
//SELECT * FROM `table` AS a LEFT JOIN `table2` AS b ON a.id = b.id LEFT JOIN `table3` AS c ON a.sid = c.sid
mysql.table('table').join({
	table2: {
		join: 'left',
		as: 'b',
		on: ['id', 'id']
	},
	table3: {
		join: 'left',
		as: 'c',
		on: ['sid', 'sid']
	}
}).select();		
//SELECT * FROM `table` LEFT JOIN `table2` ON table.id = table2.id LEFT JOIN `table3` ON (table.sid = table3.sid AND table.name = table3.title);
mysql.table('table').join({
	table2: {
		on: ['id', 'id']
	},
	table3: {
		on: {
			id: 'id',
			title: 'name'
		}
	}
}).select();
```
		
#### order(order)
设置排序方式

* `order`  String|Array|Obeject 排序方式
* `return` this

```js
//SELECT * FROM `table` ORDER BY `id`
mysql.table('table').order('id').select();		
//SELECT * FROM `table` ORDER BY `id` DESC
mysql.table('table').order('id DESC').select();
//SELECT * FROM `table` ORDER BY `id` DESC, `title` ASC
mysql.table('table').order('id DESC, title ASC').select();
//SELECT * FROM `table` ORDER BY `id` DESC, `title` ASC
mysql.table('table').order(['id DESC', 'title ASC']).select();
//SELECT * FROM `table` ORDER BY `id` DESC `title` ASC
mysql.table('table').order({id: 'DESC', title: 'ASC'}).select();
```
		
#### alias(alias)
设置表别名

* `alias` String 表别名
* `return` this

```js
//SELECT * FROM `table` AS t
mysql.table('table').alias('t').select();
```
		
#### having(str)
having查询

* `str` String having查询的字符串
* `return` this

```js
//SELECT * FROM `table` HAVING `id` > 1 AND `id` < 100
mysql.table('table').having('id > 1 AND id < 100').select();
```
	
#### group(field)
分组查询

* `field` String 设定分组查询的字段
* `return` this

```js
//SELECT * FROM `table` GROUP BY `date`
mysql.table('table').group('date').select();
```
	
#### distinct(field)
去重查询

* `field` String 去重的字段
* `return` this

```js
//SELECT DISTINCT `title` FROM `table`
mysql.table('table').distinct('title').select();
```
	
#### where(where)
设置where条件

* `where` Sting|Object 查询条件
* `return` this

##### 普通条件


```js
//SELECT * FROM `table` WHERE `id` = 100;
mysql.table('table').where('id = 100').select();
//SELECT * FROM `table` WHERE `id` = 100;
mysql.table('table').where({id: 100}).select();
//SELECT * FROM `table` WHERE `id` = 100 OR `id` < 2
mysql.table('table').where('id = 100 OR id < 2').select();
//SELECT * FROM `table` WHERE `id` != 100
mysql.table('table').where({id: ['!=', 100]})
```

##### EXP条件
默认会对字段和值进行转义，如果不希望被转义，可是使用EXP的方式

```js
//SELECT * FROM `table` WHERE `name` = 'name'
mysql.table('table').where({name: ['EXP', "='name'"]}).select();
//UPDATE `table` SET `num' = `num`+1
mysql.table('table').update({num: ['EXP', 'num+1']});
```
		
##### LIKE条件

```js
//SELECT * FROM `table` WHERE (`title` NOT LIKE 'title')
mysql.table('table').where({title: ['NOT LIKE', 'title']}).select();
//SELECT * FROM `table` WHERE (`title` LIKE '%title%')
mysql.table('table').where({title: ['LIKE', '%title%']}).select();
//LIKE多个值
//SELECT * FROM `table` WHERE (`title` LIKE 'title' OR `title` LIKE 'name')
mysql.table('table').where({title: ['LIKE', ['title', 'name']]}).select();
//多个字段LIKE同一个值，OR的关系
//SELECT * FROM `table` WHERE ((`title` LIKE '%title%') OR (`content` LIKE '%title%'))
mysql.table('table').where({'title|content': ['LIKE', '%title%']}).select();
//多个字段LIKE同一个值，AND的关系
//SELECT * FROM `table` WHERE ((`title` LIKE '%title%') AND (`content` LIKE '%title%'))
mysql.table('table').where({'title&content': ['LIKE', '%title%']}).select();
```
		
##### IN条件

```js
//SELECT * FROM `table` WHERE (`id` IN (1,2,3))
mysql.table('table').where({id: ['IN', '1, 2, 3']}).select();
//SELECT * FROM `table` WHERE (`id` IN (1, 2, 3))
mysql.table('table').where({id: ['IN', [1, 2, 3]]}).select();
//SELECT * FROM `table` WHERE (`id` NOT IN (1, 2, 3))
mysql.table('table').where({id: ['NOT IN', [1, 2, 3]]}).select();
```
		
		
##### 多字段查询

```js
//SELECT * FROM `table` WHERE (`id` = 10) AND (`title` = 'title')
mysql.table('table').where({id: 10, title: 'title'}).select();
//OR
//SELECT * FROM `table` WHERE (`id` = 10) OR (`title` = 'title')
mysql.table('table').where({id: 10, title: 'title', _logic: 'OR'}).select();
//XOR
//SELECT * FROM `table` WHERE (`id` = 10) XOR (`title` = 'title')
mysql.table('table').where({id: 10, title: 'title', _logic: 'XOR'}).select();
```
	
##### BETWEEN

```js
//SELECT * FROM `table` WHERE (`id` BETWEEN 1 AND 2)
mysql.table('table').where({id: ['BETWEEN', 1, 2]}).select();
//SELECT * FROM `table` WHERE (`id` BETWEEN 1 AND 2)
mysql.table('table').where({id: ['BETWEEN', '1,2']}).select();
```
		
##### 复合查询

```js
//SELECT * FROM `table` WHERE `id` > 10 AND `id` < 20
mysql.table('table').where({id: {
	'>': 10,
	'<': 20
}}).select();
//SELECT * FROM `table` WHERE `id` < 10 OR `id` > 20
mysql.table('table').where({id: {
	'<': 10,
	'>': 20,
	_logic: 'OR'
}}).select();
//SELECT * FROM `table` WHERE (`id` > 10 AND `id` < 20) OR (`title` LIKE '%title%')
mysql.table('table').where({id: {
	'>': 10,
	'<': 20
}, title: ['LIKE', '%title%']}).select();
//SELECT * FROM `table` WHERE (`title` = 'title') AND ((`id` IN (1, 2, 3)) OR (`content` = 'content'))
mysql.table('table').where({
	title: 'title',
	_complex: {
		id: ['IN', [1, 2, 3]],
		content: 'content',
		_logic: 'OR'
	}
}).select();
```
		
		
#### count(field)
查询符合条件的数目

* `field` String count的字段
* `return` promise

```js
//SELECT COUNT(`id`) FROM `table` LIMIT 1
mysql.table('table').count('id').then(function (count) {
	//count为符合条件的数目		
})
```
		
#### sum(field)
求和

* `field` String 要求和的字段
* `return` promise

```js
//SELECT SUM(`num`) FROM `table` LIMIT 1
mysql.table('table').sum('num').then(function (sum) {
	//sum为求和的值	
});
```
		
#### max(field)
求字段的最大值

* `field` String 要求最大值的字段
* `return` promise

```js
//SELECT MAX(`num`) FROM `table` LIMIT 1
mysql.table('table').max('num').then(function (max) {	//max为num的最大值
});
```
		
#### min(field)
求字段的最小值

* `field` String 要求最小值的字段
* `return` promise

```js
//SELECT MIN(`num`) FROM `table` LIMIT 1
mysql.table('table').min('num').then(function (min) {
	//min为num的最小值	
})
```

		
#### avg(field)
求字段的平均值

* `field` Sting 要求平均值的字段
* `return` promise

```js
//SELECT AVG(`num`) FROM `table` LIMIT 1;
mysql.table('table').avg('num').then(function (avg) {
	//avg为num的平均值	
})
```
		
#### add(data)
插入数据

* `data` Object 要插入的数据
* `return` promise

```js
var data  = {
	title: 'title',
	content: 'content'
};
mysql.table('table').add(data).then(function (insertId) {
	//如果插入成功，返回插入的id
	}).catch(function (err) {
		//插入失败，err为具体的错误信息
	})
```
		
#### thenAdd(data, where, returnDetail)
当数据表中不存在where条件对应的数据时才进行插入

* `data` Object 要插入的数据
* `where` String|Array|Object 检测的条件
* `returnDetail` Boolean 是否返回详细的信息

```js
//假设字段title为UNIQUE
var data = {
	title: 'title',
	content: 'content'
};
var where = {
	title: 'title'
}
mysql.table('table').thenAdd(data, where).then(function (id) {
	//返回已经存在或者刚插入的id
})		
//返回详细信息
mysql.table('table').thenAdd(data, where, true).then(function (data) {
	/*
	data数据结构为
	{
		type: 'exist' || 'add',  //exist表示已存在，add新增
		id: 1
	}
	*/	
})
```

#### addAll(data)
一次添加多条数据

* `data` Array
* `return` promise

```js
var data = [{title: 'xxx'}, {title: 'yyy'}];
mysql.table('table').addAll(data).then(function (insertId) {
	//插入成功
}).catch(function (err) {
	//插入失败
})
```
		
		
#### delete()
删除数据

* `return` promise

```js
//删除所有数据
mysql.table('table').delete().then(function (affectRows) {
	//返回影响行数
})		
//删除符合条件的数据
mysql.table('table').where(where).delete().then(functino (affectRows) {
	//返回影响的行数
})
```		
		
#### update(data)
更新数据，需要条件

* `data` Object 要更新的数据
* `return` promise

```js
mysql.table('table').where(where).update(data).then(function (affectRows) {
	//返回影响行数
})
```
		

#### select()
查询符合条件的数据

* `return` promise

```js
mysql.table('table').where(where).select().then(function (data) {
	//返回结果 Array
})
```

		
#### find()
查找一条符合条件的数据

* `return` promise

```js
mysql.table('table').where(where).find().then(function (data) {
	//返回结果 Object
})
```
		
#### updateInc(field, step)
字段值增加

* `field` String 要增加的字段
* `step` Number 增加的数值，默认为1
* `return` promise

```js
//将id为1的num字段加10
mysql.table('table').where({id: 1}).updateInc('num', 10).then(function () {
})
```
		
#### updateDec(field, step)
字段值减少

* `field` String 要减少的字段
* `step` Number 减少的数字，默认为1
* `return` promise

```js
//将id为1的num字段值减10
mysql.table('table').where({id: 1}).updateDec('num', 10).then(function () {
})
```
		
#### getField(field, onlyOne)
获取某个字段的值

* `field` String 要获取的字段，可以是多个字段（用,隔开）
* `onlyOne` Boolean|Array 是否只需要一个值，或者是需要几个值

```js
//取id>100的id集合
mysql.table('table').where({id: ['>', 100]}).getField('id').then(function (data) {
	//data为Array，是符合结果的所有集合
	//data = [101, 102, 103, 104]
})		
//只需要id>100的一个值
mysql.table('table').where({id: ['>': 100]}).getField('id', true).then(function (data) {
	//data为数字，符合条件的第一个值
	//data = 101
})
//只需要id>100的3个值
mysql.table('table').where({id: ['>' 100]}).getField('id', 3).then(function (data) {
	//data为Array
	//data = [101, 102, 103]
})
//需要id和title两个字段的值
mysql.table('table').getField('id, title').then(function (data) {
	//data为对象
	/*
	data = {
		id: [101, 102, 103, 104],
		title: ['aaaa', 'bbbb', 'cccc', 'dddd']
	}
	*/
})
```
		
		
#### countSelect(options, flag)

* `options` 查询参数
* `flag` Boolean 当分页值不合法的时候，处理情况。true为修正到第一页，false为修正到最后一页，默认不进行修正
* `return` promise

```js
//查询1-20条数据
mysql.table('table').page(1, 20).countSelect().then(function (data) {
	//data数据格式
	data = {
		count: 123, //总条数
		total: 7    //总页数
		page: 1     //当前页
		num: 20     //每页显示数量
		data： [{}, {}] //详细数据
	}
});
```
		

#### query(sql, parse)
自定义sql语句进行查询

* `sql` String 要执行的sql语句
* `parse` 格式参数的数据
* `return` promise

```js
var data = [
	'*',
	'table',
	'id > 100'
]	
mysql.query('SELECT %s FROM %s WHERE %s', data).then(function (data) {
})
```

#### execute(sql, parse)
自定义sql语句执行，使用与query相同，返回数据不同，execute返回影响行数

#### close()
关闭连接池连接，非特殊情况，不建议使用

		









				


		
		












	
