# slot 处理过程
## 总体概述

每一个vue实例，最终渲染到页面上都要经历如下几个阶段

1. 编译模板生成code，即render函数
2. 执行render函数生成 vnode
3. patch 阶段，对比新旧vnode，生成新的html。

## 使用范例

[地址](https://jsfiddle.net/chenlihu118/zLg8xauo/15/)

```javascript
const makeOption = name => ({
    name,
    template: `<div><slot></slot></div>`
})
var v = new Vue({
    template: `
        <div>
          <outer><span>{{msg}}</span></outer>
        </div>
      `,
    data: {
        msg: 'outer'
    },
    components: {
        outer: makeOption('outer')
    }
}).$mount()
```

生成的html

```html
<div>
    <div>
        <span>outer</span>
    </div>
</div>
```

outer 是一个组件，vue 允许组件模板定义中使用插槽 slot。插槽的内容由组件的使用者灵活指定。

如上面的例子中: outer 组件插槽的内容被指定成了模板

```html
<span>{{msg}}</span>
```

注意一下上述模板的作用域为父组件

## 模板编译、生成code、生成 vnode

模板

```html
<div>
    <outer><span>{{msg}}</span></outer>
</div>
```

对应的render函数如下

```javascript
(function anonymous(
) {
with(this){return _c('div',[_c('outer',[_c('span',[_v(_s(msg))])])],1)}
})
```

_v 对应 createTextVnode,生成 text vnode 的时候，msg 以被求值。作用域就是this。

_c 对应 createElement (vdom/create-element.js)生成 vnode。

_c('outer',……) 的时候，因为 outer 为组件，所以会调用 createComponent (vdom/create-component.js) 生成组件 vnode

createComponent 主要逻辑

```javascript
export function createComponent (
  Ctor,
  data,
  context,
  children,
  tag
) {
  // 生成构造函数
  const baseCtor = context.$options._base
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor)
  }

  // install component management hooks onto the placeholder node
  /*
     实现比较简单，
     在 data.hook 上保存一些 patch 阶段会用到的钩子函数
     componentVNodeHooks 保存了一些内置的钩子
     下面的函数，会安装内置的钩子。如果发现已经定义过了，则通过一个新函数合并他们
  */
  installComponentHooks(data)
  
  /*
  	对于组件它的 children 保存在了 componentOptions 上
  	还有 Ctor 等
  */
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data,
    undefined,
    undefined,
    undefined,
    context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  return vnode
}
```

通过上面的分析，执行完render函数，vnode就正常生成了。其中我们也阐述了，组件vnode和普通vnode的不同。vnode生成了，下一步就该进行 update 了，即 patch 阶段。

### patch阶段

因为此时没有 oldVnode，所以主要是通过调用 createElm 生成vnode对应的真正的 html

```javascript
function patch(oldVnode, vnode, hydrating, removeOnly) {
    if (isUndef(oldVnode)) {
        // empty mount (likely as component), create new root element
        // 对于组件mount的时候，在 options 中没有指定 el,在调用 $mount 的时候，也没有指定。
        // 所以这里的 oldVnode 为空
        createElm(vnode, insertedVnodeQueue)
    }
}
```

因为本文主要在解析 slot，所以我们只关注相关的部分。如果碰到一个组件vnode，则直接调用 createComponent 为组件vnode生成html

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
```

我们发现 createComponent 并没有直接创建组件html，而是调用 init 钩子

```javascript
function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
     let i = vnode.data
     if (isDef(i)) {
       if (isDef(i = i.hook) && isDef(i = i.init)) {
         i(vnode, false /*hydrating*/)
       }
       if (isDef(vnode.componentInstance)) {
         initComponent(vnode, insertedVnodeQueue)
         insert(parentElm, vnode.elm, refElm)
         return true
       }
     }
  }
```

init钩子中主要干了点什么呢？我们知道一个组件，其实就是一个新的vue实例。我们只需要实例化一个新的vue实例并mount它就可以了。

```javascript
const componentVNodeHooks = {
  init (vnode, hydrating) {
    // 这里需要注意一点 child.$mount 会生成 $el 这里的HTML是在 vnode.componentInstance
    // 上，并没有为 vnode.elm 赋值。
    // 在 patch 阶段中 createElm 为 vnode生成 elm .对于组件会调用 patch.js 中的
    // createComment 生成 elm
    const child = vnode.componentInstance = createComponentInstanceForVnode(
      vnode,
      activeInstance
    )
    child.$mount(hydrating ? vnode.elm : undefined, hydrating)
  }
}

export function createComponentInstanceForVnode(
  vnode,
  parent
) {
  const options = {
    _isComponent: true,
    _parentVnode: vnode,
    parent
  }

  return new vnode.componentOptions.Ctor(options)
}
```

接下来我们主要分析一下，outer组件实例的创建过程

### outer组件实例的创建过程

##### init 阶段 

```javascript
Vue.prototype._init = function (options) {
    if (options && options._isComponent) {
      /*
        这里其实也是合并 options。对于组件采用下面的这种方式，而没有采用 mergeOptions
        是因为 initInternalComponent 更高效
      */
      initInternalComponent(vm, options)
    }
    initRender(vm)
 }
// 这里只关注 children。这里的 children 就是上面实例化组件 vnode 时传入的
// <outer>这里元素对应的vnode</outer>
export function initInternalComponent (vm, options) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  const vnodeComponentOptions = parentVnode.componentOptions
  opts._renderChildren = vnodeComponentOptions.children
}
```

关于这个children，我们下面有用。

解析生成 vm.$slots

```javascript
export function initRender (vm) {
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
}
export function resolveSlots ( children, context ) {
  const slots = {}
  for (let i = 0, l = children.length; i < l; i++) {
    const child = children[i]
    if (...) {
      
    } else {
      (slots.default || (slots.default = [])).push(child)
    }
  }
  return slots
}

```



##### render 函数

```javascript
(function anonymous(
) {
with(this){return _c('div',[_t("default")],2)}
})
```

_t 就是 renderSlot , 对于当前例子删减后的主要逻辑, 可以理解成伪代码

```javascript
export function renderSlot (name, fallback, props, bindObject) {
  const slotNodes = this.$slots[name] 
    if (slotNodes) {
      slotNodes._rendered = true
    }
  return  nodes = slotNodes || fallback
}

```

到这里成功把 componentOptions.children 替换了插槽。接下来的执行逻辑雷同，不再继续分析了。



 





