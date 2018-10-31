# $attrs
## 官方解释
> 包含了父作用域中不作为 prop 被识别 (且获取) 的特性绑定 (class 和 style 除外)。
>
> 当一个组件没有声明任何 prop 时，这里会包含所有父作用域的绑定 (class 和 style 除外)，并且可以通过 v-bind="$attrs" 传入内部组件——在创建高级别的组件时非常有用。

也就是说 vm.$attrs 上包含了父级作用域中的特性绑定（不包括 class style prop)

那它到底有什么用呢？

## 源码解析
### 分析用例

```javascript
const vm = new Vue({
    template: `<foo :id="foo" bar="1"/>`,
    data: { foo: 'foo' },
    components: {
        foo: {
            props: ['bar'],
            template: `<div><div v-bind="$attrs"></div></div>`
        }
    }
}).$mount()
expect(vm.$el.children[0].id).toBe('foo')
expect(vm.$el.children[0].hasAttribute('bar')).toBe(false)
vm.foo = 'bar'
waitForUpdate(() => {
    expect(vm.$el.children[0].id).toBe('bar')
    expect(vm.$el.children[0].hasAttribute('bar')).toBe(false)
}).then(done)
```

### render 函数

```javascript
// 父组件的 render 函数 生成vnode A
ƒ anonymous() {
    with(this) { return _c('foo', { attrs: { "id": foo, "bar": "1" } }) }
}
// 子组件的 render 函数 生成vnode B
ƒ anonymous() {
    with(this) { return _c('div', [_c('div', _b({}, 'div', $attrs, false))]) }
}
```

### 创建子组件

什么时候为子组件定义的 $attrs 呢？请看下面的方法

```javascript
export function initRender (vm: Component) {
  const options = vm.$options
  const parentVnode = vm.$vnode = options._parentVnode
  const parentData = parentVnode && parentVnode.data
  defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
}
```
parentVnode 其实就是上面第一个函数生成的 vnode  A，所以parentData.attrs是什么就很明显了。

接下来，我们考虑下面这个阶段，执行子组件的render函数，生成 vnode B

```javascript
ƒ anonymous() {
    with(this) { return _c('div', [_c('div', _b({}, 'div', $attrs, false))]) }
}
```

这里有一个函数 _b 我们没有接触过，那它到底是什么呢？

```javascript
// 精简后的代码
export function bindObjectProps (
  data,
  tag,
  value,
  asProp,
  isSync
) {
  if (value) {
    let hash
    for (const key in value) {
      if (
        key === 'class' ||
        key === 'style' ||
        isReservedAttribute(key)
      ) {
        hash = data
      } else {
        // 如果key 不是 class style isReservedAttribute(key)
 		// 对于上面的例子，我们关注这个逻辑
        hash = data.domProps || (data.domProps = {})
      }
      // 如果该值还不存在
      if (!(key in hash)) {
        hash[key] = value[key]
      }
    }
  }
  return data
}
```

对于该例子，_b 函数起到的作用就是把 $attrs 中满足条件的值，保存到 data.domProps 上。

> bindObjectProps 的返回值，当做 _c 中的 data 参数。即作为 vnode 的 data。

这个 domProps 什么时候排上用场呢？

patch 阶段通过 vnode 来生成 html。通过 vnode 创建或者修改它对应的 html 的时候，会调用 create 和 update 钩子。下面的方法就是当中的一个

```javascript
function updateDOMProps (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  let key, cur
  const elm: any = vnode.elm
  const oldProps = oldVnode.data.domProps || {}
  let props = vnode.data.domProps || {}
  // 删除不需要的prop
  for (key in oldProps) {
    if (isUndef(props[key])) {
      elm[key] = ''
    }
  }
  // 添加新的prop
  for (key in props) {
    cur = props[key]
    elm[key] = cur
  }
}
```

上面的代码就是用来处理 data.domProps 的，data.domProps 代表的就是 dom 对象的 property 。