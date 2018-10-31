# listeners

## $listeners 简介

该特性是 v2.4 中增加的

### vm.$listeners

包含了父作用域中的   (不含 `.native` 修饰器的)   `v-on` 事件监听器。

它可以通过 `v-on="$listeners"` 传入内部组件——在创建更高层次的组件时非常有用。

### 使用范例

对于一个组件

```html
<base-input v-on:focus="onFocus"></base-input>
```

如何把组件上定义的事件，绑定到组件模板内特定的元素上呢？
```html
<label>
    {{ label }}
    <input v-on="$listeners">
</label>
```

$listeners 到底是什么呢？下面看一下

```json
{
  focus: function (event) { /* ... */ }
}
```

上面是最简单的使用方式，具体的使用范例可以查看[官方文档](https://cn.vuejs.org/v2/guide/components-custom-events.html#%E5%B0%86%E5%8E%9F%E7%94%9F%E4%BA%8B%E4%BB%B6%E7%BB%91%E5%AE%9A%E5%88%B0%E7%BB%84%E4%BB%B6)

## $listeners 相关源码分析

### $listeners 的生成

> src/core/instance/render.js

```javascript
export function initRender (vm: Component) {
  const options = vm.$options
  const parentVnode = vm.$vnode = options._parentVnode 
  const renderContext = parentVnode && parentVnode.context
  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  const parentData = parentVnode && parentVnode.data
  defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
}
```

上面的代码生成了vm.$listeners。那代码中的 _parentListeners 从哪里来的呢？

> src/core/vdom/create-component.js

创建组件 vnode, 删除了无关的代码

```javascript
export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  
  data = data || {}

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  // data.on 为组件的自定义事件
  // 我们把 listeners 作为 vnode 的 componentOptions 传入，
  // 它是在子组件初始化阶段中处理的，所以它的处理环境是子组件。
  const listeners = data.on

  /*
    这里真正创建 VNode 了，有一点需要注意一下，没有传入 children。
    而是在 componentOptions 传入了 children
  */
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  return vnode
}
```

render.js 中用到的 _parentListeners 其实就是上面代码中传入的 listeners。

const listeners = data.on 中 data.on 来源于使用组件时绑定的事件。

>通过上面的分析，我们可以知道只有组件vm才有$listeners

### v-on="$listeners"

源码是如何把 $listeners 的事件绑定到元素上的呢？

我们先看一下下面的代码

```javascript
const vm = new Vue({
    template: `<div v-on="events">button</div>`,
    data: {
        events: {
            'click': function() {
                console.log('click')
            },
            'mouseover': function() {
                console.log('mouseover')
            }
        }
    }
}).$mount('#app')
```
> 我们可以通过 `events` 同时给div绑定多个事件。`$listeners` 的结构和`events`的结构是相同的，不同的是 `$listeners` 中事件处理器的作用域是父作用域

对于上面的代码生成的 render 函数如下:

```javascript
(function anonymous(
) {
with(this){return _c('div',_g({},events),[_v("button")])}
})
```

我们注意到了 _g ，这个是干什么的呢？

> core/instance/render-helpers/bind-object-listeners.js

通过名字再结合代码，我们可以知道 _g 就是在处理事件处理器为对象的情况

```javascript
export function bindObjectListeners (data, value) {
  if (value) {
    if (!isPlainObject(value)) {
      // value 不是对象就提示错误
      process.env.NODE_ENV !== 'production' && warn(
        'v-on without argument expects an Object value',
        this
      )
    } else {
      // 把 value 中定义的事件，拷贝到 data.on 上。
      // 如果已经存在了就合并
      const on = data.on = data.on ? extend({}, data.on) : {}
      for (const key in value) {
        const existing = on[key]
        const ours = value[key]
        on[key] = existing ? [].concat(existing, ours) : ours
      }
    }
  }
  return data
}
```

具体事件是如何绑定的请查看事件处理相关章节




