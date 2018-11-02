# $ref

## 官方解释

`ref` 被用来给`元素`或`子组件`注册引用信息。引用信息将会注册在`父组件`的 `$refs`对象上。如果在普通的 DOM 元素上使用，引用指向的就是 DOM 元素；如果用在子组件上，引用就指向组件实例：

```javascript
<!-- `vm.$refs.p` will be the DOM node -->
<p ref="p">hello</p>

<!-- `vm.$refs.child` will be the child component instance -->
<child-component ref="child"></child-component>
```

当 `v-for` 用于元素或组件的时候，引用信息将是包含 DOM 节点或组件实例的数组。

> 关于 ref 注册时间的重要说明：因为 ref 本身是作为渲染结果被创建的，在初始渲染的时候你不能访问它们 - 它们还不存在！`$refs` 也不是响应式的，因此你不应该试图用它在模板中做数据绑定。

## 源码解析

### $refs 哪里定义的

> core/instance/init.js

```javascript
export function initMixin (Vue) {
  Vue.prototype._init = function (options) {
    initLifecycle(vm)
  }
}
```

initLifecycle 里面定义了`$refs` , 我们看一下代码

> core/instance/lifecycle.js

```javascript
export function initLifecycle (vm) {
  vm.$refs = {}
}
```

这时候 `$refs` 出现了。注意一下从这里可以看出 `$refs` 就是普通的对象，不是响应式的。

### $refs 的更新在哪里呢

> core/vnode/modules/ref.js

```javascript
import { remove, isDef } from 'shared/util'

export default {
  create (_, vnode) {
    registerRef(vnode)
  },
  update (oldVnode, vnode) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true)
      registerRef(vnode)
    }
  },
  destroy (vnode) {
    registerRef(vnode, true)
  }
}

export function registerRef(vnode, isRemoval) {
  const key = vnode.data.ref
  if (!isDef(key)) return

  const vm = vnode.context
  // 如果是组件则是 vnode.componentInstance 否则为 vnode.elm
  const ref = vnode.componentInstance || vnode.elm
  const refs = vm.$refs
  if (isRemoval) {
    if (Array.isArray(refs[key])) {
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      refs[key] = undefined
    }
  } else {
    if (vnode.data.refInFor) {
      if (!Array.isArray(refs[key])) {
        refs[key] = [ref]
      } else if (refs[key].indexOf(ref) < 0) {
        refs[key].push(ref)
      }
    } else {
      refs[key] = ref
    }
  }
  console.log(vnode, isRemoval)
}

```

create,update,destroy 什么时候调用呢？这个过程可以具体查看 patch 阶段的解释

