# 函数式组件

## 什么是函数式组件

先看一个例子

```javascript
Vue.component('my-component', {
  functional: true,
  // Props 可选
  props: {
    // ...
  },
  // 为了弥补缺少的实例
  // 提供第二个参数作为上下文
  render: function (createElement, context) {
    // ...
  }
})
```

上面就是一个函数式组件即 `functional` 为true的组件

那这个特性有什么特点呢？

> 官网给出的答案是：函数式组件无响应式数据、无this上下文。

该特性有什么优点及使用场景呢？

官网给出的解释

1. 因为函数式组件只是一个函数，所以渲染开销也低很多
2. 程序化地在多个组件中选择一个
3. 在将 children, props, data 传递给子组件之前操作它们

对应理解第二点可以看一下官网给出的第二个例子

```javascript
var EmptyList = { /* ... */ }
var TableList = { /* ... */ }
var OrderedList = { /* ... */ }
var UnorderedList = { /* ... */ }

Vue.component('smart-list', {
  functional: true,
  props: {
    items: {
      type: Array,
      required: true
    },
    isOrdered: Boolean
  },
  render: function (createElement, context) {
    function appropriateListComponent () {
      var items = context.props.items
		
      if (items.length === 0)           return EmptyList
      if (typeof items[0] === 'object') return TableList
      if (context.props.isOrdered)      return OrderedList

      return UnorderedList
    }
	// createElement 第一个参数可以传入object类型的。这个object就是组件的定义。
    return createElement(
      appropriateListComponent(),
      context.data,
      context.children
    )
  }
})
```



