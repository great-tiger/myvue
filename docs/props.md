# props

## 概述

父组件可以通过 prop 特性, 向子组件传值, 官网给出了下面的例子

```javascript
Vue.component('blog-post', {
  // 在 JavaScript 中是 camelCase 的
  props: ['postTitle'],
  template: '<h3>{{ postTitle }}</h3>'
})

<!-- 在 HTML 中是 kebab-case 的 -->
<blog-post post-title="hello!"></blog-post>
```

还可以

```javascript
<blog-post :post-title="msg"></blog-post>
```

[例子](https://jsfiddle.net/chenlihu118/w5f9aq2k/6/)

对于这个例子，我们需要说明一下几点:

1. blog-post 组件内部不提倡改变 prop 传入的值。会提示如下错误。

   > Avoid mutating a prop directly since the value will be overwritten whenever the parent component re-renders. Instead, use a data or computed property based on the prop's value. Prop being mutated: "postTitle" 
   >
   > 避免直接改变prop的值，因为父组件重新渲染的时候，这个值会被重写。
   >
   > 建议基于prop的值，使用 data 和 计算属性  
   >
   > [官网详细解释](https://cn.vuejs.org/v2/guide/components-props.html#%E5%8D%95%E5%90%91%E6%95%B0%E6%8D%AE%E6%B5%81)


2. 如果我们传入 prop 是一个对象的时候(A)，A对象内部的值我们是可以改变的。这时候改变 A.key 会触发父子组件的重新渲染 [例子](https://jsfiddle.net/chenlihu118/sL2a8qm1/6/)

   官方解释:

   > 注意在 JavaScript 中对象和数组是通过引用传入的，所以对于一个数组或对象类型的 prop 来说，在子组件中改变这个对象或数组本身**将会**影响到父组件的状态。

## 原理解析

### 解析范例

```javascript
// 步骤一
const Comp = Vue.extend({
    props: ['msg'],
    template: '<div>{{ msg }} {{ $props.msg }}</div>'
})
// 步骤二
const vm = new Comp({
    propsData: {
        msg: 'foo'
    }
}).$mount()
```

1. 步骤一

   官方解释:

   > 使用基础 Vue 构造器，创建一个“子类”。参数是一个包含组件选项的对象

   我们这里把 Comp 理解成一个组件构造器

2. 步骤二

   实例化一个组件，并mount它。propsData 就是向该组件传递的 prop 值。

### 步骤一

vue.extend 最核心的逻辑

```javascript
Vue.extend = function (extendOptions) {
    const Super = this
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super
    return Sub
}
```

mergeOptions 这里请看这里。

### 步骤二

这里是本文讲述的重点

实例化组件的时候，会进入init阶段中的initState

```javascript
export function initState (vm) {
  const opts = vm.$options
  if (opts.props) initProps(vm, opts.props)
}

function initProps (vm, propsOptions) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  for (const key in propsOptions) {
    const value = propsData[key]
    defineReactive(props, key, value)
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
}
```

通过 proxy(vm, `_props`, key) 的处理，当我们需要访问 msg 的时候，会从 _props 中取值。最终数据的来源是 $options.propsData。

接下来就进入mount阶段了，这个阶段执行逻辑请看这里