# 组件更新解析
## 测试用例
```javascript
const vm = new Vue({
    template: `<foo :foo="foo"/>`,
    data: { foo: 'foo' },
    components: {
        foo: {
            props: ['foo'],
            template: `<div>{{foo}}</div>`
        }
    }
}).$mount()
vm.foo = 'new foo'
```

## 执行流程

我们主要分析一下

```javascript
vm.foo = 'new foo'
```

引起的组件更新的过程。当给 vm.foo 执行赋值的时候，会触发 vm 组件的更新过程。我们分析的目的是查明白怎么触发子组件的更新过程的。

> src/core/instance/lifecycle.js

```javascript
export function mountComponent (vm, el, hydrating) {
    updateComponent = () => {
      // vm._update 更新dom。 vm._render() 生成虚拟dom。
      vm._update(vm._render(), hydrating)
    }
}
```

vm.render() 方法主要调用编译生成的render函数生成虚拟dom。编译生成的render函数如下：

```javascript
(function anonymous(
) {
with(this){return _c('foo',{attrs:{"foo":foo}})}
})
```

vm._update 的作用就是更新真实的dom，其实真正干活的是`vm.__patch__` 方法。我们看下面的代码就知道了。

> src/core/instance/lifecycle.js

```javascript
Vue.prototype._update = function(vnode: VNode, hydrating ? : boolean) {
	const prevVnode = vm._vnode
    if (!prevVnode) {
        // initial render 初次渲染
        vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */ )
    } else {
        // updates 更新时
        vm.$el = vm.__patch__(prevVnode, vnode)
    }
}
```

我们现在讨论的情况下会执行 

```javascript
vm.$el = vm.__patch__(prevVnode, vnode)
```

接下来进入到patch阶段了。本文主题是想搞明白子组件是怎么更新的。我接着往下看吧。

```javascript
// 对于本例会执行 patchVnode 
function patch (oldVnode, vnode, hydrating, removeOnly) {
    patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly)
    return vnode.elm
}
function patchVnode (oldVnode, vnode, insertedVnodeQueue, removeOnly) {
    let i
    const data = vnode.data
    /*
      vnode 是一个组件 vnode 的时候，会执行 prepatch 的方法，
      它的定义在 src/core/vdom/create-component.js 中
    */
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      i(oldVnode, vnode)
    }

    /*
      因为根节点肯定是相同的，这里处理根节点上的属性等等
    */
    if (isDef(data) && isPatchable(vnode)) {
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      /*
        vnode 是一个组件 vnode 的时候，会执行 update 的方法，
        它的定义在 src/core/vdom/create-component.js 中
      */
      if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
	
    // ...... diff 算法，省略......
  	
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    }
  }
```

对于上面的 patchVnode 方法，其实是包含diff 算法的，我们本文不关注这个，先忽略了。主要保留了三种钩子的调用。分别是： prepatch 、 update 、 postpatch 。

对于本例接下来会执行 prepatch 方法。

> src/core/vdom/create-component.js

```javascript
const componentVNodeHooks = {
  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    const options = vnode.componentOptions
    // 注意这里是使用的是旧的 组件实例。
    // 所以 child 上的 props 是响应式的。
    // 组件实例共用可以省去那些工作？ 模板编译，可以省去options合并等等。
    // 我们要做的就是更新那些改变的部分就可以了。
    const child = vnode.componentInstance = oldVnode.componentInstance
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  }
}

export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  // update props
  if (propsData && vm.$options.props) {
    toggleObserving(false)
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      const propOptions: any = vm.$options.props
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }
}
```

上面的代码注意一下

```javascript
props[key] = validateProp(key, propOptions, propsData, vm)
```

给props设置新值，会重新出发foo组件实例的_update 方法。接下来就该进行foo组件的更新了。为什么会触发更新呢？因为组件实例在创建的时候，会把options上的props 设置成响应式的。

```javascript
function initProps (vm: Component, propsOptions: Object) {
  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    defineReactive(props, key, value)
  }
}
```



