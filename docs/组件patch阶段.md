# patch阶段组件处理相关逻辑

## createElm
createElm ( vnode, insertedVnodeQueue, parentElm, refElm, nested,ownerArray, index )

core/vdom/patch.js

该函数的作用就是 为vnode生成真实的dom (被保存到了 vnode.elm 中)， 并把真实的dom插入到 parentElm 中

并且保证在 refElm 之前

```
function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    // 如果 vnode 是一个组件的话，直接由 createComponent 处理
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }
  }
```

## createComponent

core/vdom/patch.js

```
function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    let i = vnode.data
    if (isDef(i)) {
      if (isDef(i = i.hook) && isDef(i = i.init)) {
      	// 调用 init 钩子，这个钩子具体干了点什么呢？请看下一小节
      	// 如果 vnode 是一个子组件的话
        // 会创建一个子实例 componentInstance 并且 mount 它。
        i(vnode, false /* hydrating */)
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      // 上面的注释说的很清楚。init 钩子被调用之后，如果 vnode 是一个子组件的话
      // 会创建一个子实例 componentInstance 并且 mount 它。
      // componentInstance 就是一个 vm 对象
      if (isDef(vnode.componentInstance)) {
      	// 我们知道 mount 完之后，componentInstance.$el 就是真实的 dom
      	// 下面这个方法的作用就是 vnode.elm = vnode.componentInstance.$el
        initComponent(vnode, insertedVnodeQueue)
        insert(parentElm, vnode.elm, refElm)
        return true
      }
    }
  }
```

## init 钩子

core/vdom/create-component.js

```
const componentVNodeHooks = {
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      const mountedNode: any = vnode // work around flow
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  }
}
```

```
// 为Vnode创建组件实例，名称起的很清楚
export function createComponentInstanceForVnode (
  vnode: any, // we know it's MountedComponentVNode but flow doesn't
  parent: any, // activeInstance in lifecycle state
): Component {
  // 这里传入了 parent，parent 指的父级 vm
  const options: InternalComponentOptions = {
    _isComponent: true,
    _parentVnode: vnode,
    parent
  }
  return new vnode.componentOptions.Ctor(options)
}
```

## initComponent

core/vdom/patch.js

```
function initComponent (vnode, insertedVnodeQueue) {
	// 删除了一些次要逻辑
    vnode.elm = vnode.componentInstance.$el
}
```

