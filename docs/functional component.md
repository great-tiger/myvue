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

## 函数式组件的执行流程

### 测试用例

```javascript
const child = {
    functional: true,
    data: {
        a: 1,
        b: 2
    },
    render(h) {
        return h('div', { class: 'child' }, [
            h('span', { class: 'child' }, 'child')
        ])
    }
}
const vm = new Vue({
    components: { child },
    template: '<div><child></child></div>'
}).$mount()
```

### 执行流程分析

1. vm 的 mount 阶段首先会对模板进行编译为模板

   ```html
   <div><child></child></div>
   ```

   生成 render 函数

   ```javascript
   (function anonymous(
   ) {
   with(this){return _c('div',[_c('child')],1)}
   })
   ```

   接下来就是执行 render 生成 vnode

2. 我们着重看一下 

   ```javascript
   _c('child')
   ```

   的执行过程

   分别会调用 _c -> _createElement -> createComponent

   我们看一下生成组件vnode的过程

   ```javascript
   export function createComponent (
     Ctor,
     data,
     context,
     children,
     tag
   ) {
     const baseCtor = context.$options._base
     if (isObject(Ctor)) {
       Ctor = baseCtor.extend(Ctor)
     }
   
     const propsData = extractPropsFromVNodeData(data, Ctor, tag)
   
     // functional component
     if (isTrue(Ctor.options.functional)) {
       return createFunctionalComponent(Ctor, propsData, data, context, children)
     }
   
     /*
        实现比较简单，
        在 data.hook 上保存一些 patch 阶段会用到的钩子函数
        componentVNodeHooks 保存了一些内置的钩子
        下面的函数，会安装内置的钩子。如果发现已经定义过了，则通过一个新函数合并他们
     */
     installComponentHooks(data)
   
   }
   ```

   createComponent函数中会检查 Ctor.options.functional 是否为true，如果是的话直接调用 `createFunctionalComponent` 函数生成vnode。我们注意一下 `installComponentHooks(data)` ，如果是 `functional` 的话这里的代码是执行不到的。也就说 data.hook 上不会保存 `componentVNodeHooks` 中内置的钩子函数。其中一个重要的钩子函数就是 `create`,用来创建组件实例的。

3. createFunctionalComponent 是如何创建vnode的呢？

   ```javascript
   export function createFunctionalComponent (
     Ctor: Class<Component>,
     propsData: ?Object,
     data: VNodeData,
     contextVm: Component,
     children: ?Array<VNode>
   ): VNode | Array<VNode> | void {
     const options = Ctor.options
     const props = {}
     const propOptions = options.props
     
     /* 1. 生成 props */
     
     if (isDef(propOptions)) {
       // 如果定义了 propOptions,则 props 只保存要求的部分
       for (const key in propOptions) {
         props[key] = validateProp(key, propOptions, propsData || emptyObject)
       }
     } else {
       // 如果没有定义  propOptions，则 保存 data.attrs data.props 到 props
       if (isDef(data.attrs)) mergeProps(props, data.attrs)
       if (isDef(data.props)) mergeProps(props, data.props)
     }
     
     /* 2. 生成上下文 */
     const renderContext = new FunctionalRenderContext(
       data,
       props,
       children,
       contextVm,
       Ctor
     )
   
     /* 3. 调用render生成vnode */
     const vnode = options.render.call(null, renderContext._c, renderContext)
   	
     /* 4. vnode后期处理 */
     if (vnode instanceof VNode) {
       return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options)
     } else if (Array.isArray(vnode)) {
       const vnodes = normalizeChildren(vnode) || []
       const res = new Array(vnodes.length)
       for (let i = 0; i < vnodes.length; i++) {
         res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options)
       }
       return res
     }
   }
   
   function cloneAndMarkFunctionalResult (vnode, data, contextVm, options) {
     // #7817 clone node before setting fnContext, otherwise if the node is reused
     // (e.g. it was from a cached normal slot) the fnContext causes named slots
     // that should not be matched to match.
     const clone = cloneVNode(vnode)
     clone.fnContext = contextVm
     clone.fnOptions = options
     if (data.slot) {
       (clone.data || (clone.data = {})).slot = data.slot
     }
     return clone
   }
   ```

   在第三步中，该函数直接调用了 render 函数生成了 vnode。和普通组件vnode不同，普通组件vnode是怎样生成的呢？回忆一下, createComponent 方法中有如下的代码(注意：上面提到的 createComponent 是精简过的)：

   ```javascript
   const vnode = new VNode(
       `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
       data,
       undefined,
       undefined,
       undefined,
       context, { Ctor, propsData, listeners, tag, children },
       asyncFactory
   )
   ```

   对的就是上面的代码生成了一个组件vnode，特点是该vnode有componentOptions。

   通过上面的分析我们知道了函数式组件的vnode，是直接调用render函数生成的，所以就更加灵活，我们可以按需求定制。

   第四步是对生成的vnode做一些后期处理。主要有 clone ，保存 fnContext, 保存 fnOptions, 保存 data.slot。

   第二步创建了一个context，这个context会被传入到用户定义的render函数中，这个context中保存了用户render函数可以访问的一切东西。下面我们着重看一下创建上下文的过程。

   ```javascript
   export function FunctionalRenderContext (
     data: VNodeData,
     props: Object,
     children: ?Array<VNode>,
     parent: Component,
     Ctor: Class<Component>
   ) {
     const options = Ctor.options
    
     this.data = data
     this.props = props
     this.children = children
     this.parent = parent
     this.listeners = data.on || emptyObject
     this.injections = resolveInject(options.inject, parent)
     this.slots = () => resolveSlots(children, parent)
   
     this._c = (a, b, c, d) => createElement(contextVm, a, b, c, d, needNormalization)
   }
   ```

   上面的代码是经过精简过的。上下文中主要保存了一些数据。

4. 解析来进入vm的patch阶段，进而调用 createElm 生成真实的 html

   ```javascript
   function createElm (
       vnode,
       insertedVnodeQueue,
       parentElm,
       refElm,
       nested,
       ownerArray,
       index
     ) {
       if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
         return
       }
     }
   ```

   对于普通的组件vnode会调用createComponent生成html，然后直接返回。在 createComponent 中会调用 create 钩子函数实例化一个新的组件实例。然而函数式组件，没有在data.hook上保存钩子函数。所以这里在createComponent中什么都没做就返回了，接下走下来的逻辑生成html。

   > 没有调用组件的钩子函数生成组件实例，这就是为什么说函数式组件没有响应式数据和this上下文了。

### 总结

函数式组件使用到的数据，都是通过 FunctionalRenderContext 传递过去的。

自己没有data和this上下文

