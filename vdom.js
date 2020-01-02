/**
 * 由于浏览器的标准过于复杂，导致一个原生DOM的属性数量高达200多个，当你在浏览器操作一个DOM的时，波及的DOM需要重绘或回流，这时这200多个属性需要销毁并重建，这个非常消耗浏览器的性能，
 * 导致浏览器性能急速下降
 * 而虚拟DOM的出现，可以让这种消耗性能的操作次数最少、范围最小
 */

// 定义节点的类型
const nodeType = {
  HTML: 'HTML',
  TEXT: 'TEXT',
  COMPONENT: 'COMPONENT'
}

// 定义子节点的数量
const childNodeNum = {
  EMPTY: 'EMPTY',
  SINGLE: 'SINGLE',
  MULTIPLE: 'MULTIPLE'
}

/**
  * 新建虚拟DOM
  * tag: 标签名称
  * attr: 标签的属性
  * children: 标签的子元素，text or html or component
  */
function createElement (tag, attr, children = null) {
  // 设置tagFlag
  let tagType
  if (typeof tag === 'string') {
    // html
    tagType = nodeType.HTML
  } else if (typeof tag === 'function') {
    // 组件
    tagType = nodeType.COMPONENT
  } else {
    // 文本节点，文本节点的tag为null
    tagType = nodeType.TEXT
  }
  
  // 设置子节点的数量
  let childrenNum
  if (!children) {
    // children为null，没有子节点
    childrenNum = childNodeNum.EMPTY
  } else if (Array.isArray(children)) {
    // children数组
    const length = children.length
    if (length === 0) {
      // 空数组，也是没有子节点
      childrenNum = childNodeNum.EMPTY
    } else {
      // 有多个子节点, 当前特殊情况，比如只有一个子元素
      childrenNum = childNodeNum.MULTIPLE
    }
  } else {
    // 字符串，文本节点
    childrenNum = childNodeNum.SINGLE
    children = createTextVnode(children)
  }

  return {
    // 标签：html元素，组件， 文本节点tag为空
    tag,
    // 标签类型
    tagType,
    // 属性
    attr,
    // 子节点
    children,
    // 子节点的数量
    childrenNum,
    // 当前vnode的真实DOM
    el: null,
    // key
    key: attr.key || null
  }
}

/**
 * 创建文本Vnode
 */
function createTextVnode (text) {
  return {
    // 文本节点tag为null
    tag: null,
    // 节点类型为text
    tagType: nodeType.TEXT,
    // 属性为null
    attr: null,
    // 文本内容
    children: text,
    // 子节点数量, 没有子节点
    childrenNum: childNodeNum.EMPTY,
    // 当前vnode的真实DOM, 该属性在后面操作DOM时会用到
    el: null,
    key: null
  }
}

/**
 * 渲染虚拟DOM为真实DOM
 * vnode: 被渲染的VDOM
 * container: 容器，父元素
 */
function render (vnode, container) {
  // 需要区分是首次渲染还是后续更新
  if (container.vnode) {
    // 非首次渲染
    patch(container.vnode, vnode, container)
  } else {
    // 首次渲染
    mount(vnode, container)
  }
  container.vnode = vnode
}

/**
 * 节点patch
 * @param {老节点} oldVnode 
 * @param {新节点} newVnode 
 * @param {节点容器} container 
 */
function patch (oldVnode, newVnode, container) {
  if (oldVnode.tagType !== newVnode.tagType) {
    // 新老节点的类型不一样，直接替换
    replaceVnode(oldVnode, newVnode, container)
    return
  }
  // 属性更新
  const el = newVnode.el = oldVnode.el  // 因为新节点还没有经过mount节点，所以它的el属性还是null, 将oldVnode.el赋值给它
  // 老节点的属性
  const oldVnodeAttr = oldVnode.attr
  // 新节点的属性
  const newVnodeAttr = newVnode.attr
  // 属性新增或更新
  if (newVnodeAttr) {
    for (let key in newVnodeAttr) {
      // 老节点的[key]属性
      let oldAttr = oldVnodeAttr[key]
      // 新节点的[key]属性
      let newAttr = newVnodeAttr[key]
      patchAttr(el, key, oldAttr, newAttr)
    }
  }
  // 删除新新节点中没有的属性
  if (oldVnodeAttr) {
    for (let key in oldVnodeAttr) {
      let oldAttr = oldVnodeAttr[key]
      // 属性[key]老节点有，新节点没有,删除
      if (oldAttr && !newVnodeAttr.hasOwnProperty(key)) {
        patchAttr(el, key, oldAttr, null)
      }
    }
  }
  // 更新子元素
  patchChildren(oldVnode.childrenNum, oldVnode.children, newVnode.childrenNum, newVnode.children, el)
}

/**
 * 更新子节点
 * 情况：
 * 1、老元素没有子节点 2、 老元素有一个子节点 3、老元素有多个子节点
 * 1、新元素没有子节点 2、 新元素有一个子节点 3、新元素有多个子节点
 * @param {老元素的子节点数量} oldVnodeChildrenNum 
 * @param {老元素的子节点} oldVnodeChildren 
 * @param {新元素的子节点数量} newVnodeChildrenNum 
 * @param {新元素的子节点} newVnodeChildren 
 * @param {父元素} container 
 */
function patchChildren(oldVnodeChildrenNum, oldVnodeChildren, newVnodeChildrenNum, newVnodeChildren, container) {
  switch (oldVnodeChildrenNum) {
    case childNodeNum.EMPTY:
      switch(newVnodeChildrenNum) {
        case childNodeNum.EMPTY:
          // 老元素没有子节点，新元素没有子节点
          break;
        case childNodeNum.SINGLE:
          // 老元素没有子节点，新元素有一个子节点，添加节点
          mount(newVnodeChildren, container)
          break;
        case childNodeNum.MULTIPLE:
          // 老元素没有子节点，新元素有多个子节点，添加节点
          for (let i = 0; i < newVnodeChildren.length; i++) {
            mount(newVnodeChildren[i], container)
          }
          break;
      }
      break;
    case childNodeNum.SINGLE:
      switch(newVnodeChildrenNum) {
        case childNodeNum.EMPTY:
          // 老元素有一个子节点，新元素没有子节点
          container.removeChild(oldVnodeChildren.el)
          break;
        case childNodeNum.SINGLE:
          // 老元素有一个子节点，新元素也有一个子节点
          patch(oldVnodeChildren, newVnodeChildren, container)
          break;
        case childNodeNum.MULTIPLE:
          // 老元素有一个子节点，新元素有多个子节点
        container.removeChild(oldVnodeChildren.el)
        for (let i = 0; i < newVnodeChildren.length; i++) {
          mount(newVnodeChildren[i], container)
        }
          break;
      }
      break;
    case childNodeNum.MULTIPLE:
      switch(newVnodeChildrenNum) {
        case childNodeNum.EMPTY:
          // 老元素有多个子节点，新元素没有子节点
        for (let i = 0; i < oldVnodeChildren.length; i++) {
          container.removeChild(oldVnodeChildren[i])
        }
          break;
        case childNodeNum.SINGLE:
          // 老元素有多个子节点，新元素只有一个子节点
          for (let i = 0; i < oldVnodeChildren.length; i++) {
            container.removeChild(oldVnodeChildren[i])
          }
          mount(newVnodeChildren, container)
          break;
        case childNodeNum.MULTIPLE:
          // 新老元素都有多个子节点，这里就是最复杂的逻辑了，也就是diff所在，各家的优化策略都不一样，这里采用vue的策略
          const oldCh = oldVnodeChildren
          const newCh = newVnodeChildren
          let oldStartId = 0, oldEndId = oldCh.length - 1, newStartId = 0, newEndId = newCh.length - 1
          while (oldStartId <= oldEndId && newStartId <= newEndId) {
            if (!oldCh[oldStartId]) {
              oldStartId++
            }
            if (!newCh[newStartId]) {
              newStartId++
            }
            if (oldCh[oldStartId].key === newCh[newStartId].key) {
              // 假设老开始和新开始是相同
              patch(oldCh[oldStartId], newCh[newStartId], container)
              oldStartId++
              newStartId++
            } else if (oldCh[oldStartId].key === newCh[newEndId].key) {
              // 假设老开始和新结束相同
              patch(oldCh[oldStartId], newCh[newEndId], container)
              // 将老开始移动到最后
              container.insertBefore(oldCh[oldStartId].el, null)
              oldStartId++
              newEndId--
            } else if (newCh[newStartId].key == oldCh[oldEndId].key) {
              // 假设新开始和老结束相同
              patch(oldCh[oldEndId], newCh[newStartId], container)
              container.insertBefore(oldCh[oldEndId].el, oldCh[oldStartId].el)
              oldEndId--
              newStartId++
            } else if (newCh[newEndId].key === oldCh[oldEndId.key]) {
              // 假设新结束和老结束相同
              patch(oldCh[oldEndId], newCh[newEndId], container)
              oldEndId--
              newEndId--
            } else {
              // 以上四种假设都没命中，则开始遍老元素，看新开始在老元素的什么位置
              let findVnode = false
              for (let i = 0; i <= oldEndId; i++) {
                if (newCh[newStartId].key === oldCh[i].key) {
                  // 新开始在老i位置找到了,将老i元素移动到新开始的位置
                  findVnode = true
                  patch(oldCh[i], newCh[newStartId], container)
                  // 两个相同元素，只有当老元素所在的位置下标大于新元素所在位置下标时才会进行移动，将老元素移动到老元素队列的新元素下标所在位置
                  if (i > newStartId) {
                    container.insertBefore(oldCh[i].el, oldCh[newStartId].el)
                  }
                  oldStartId++
                  newStartId++
                  break; 
                }
              }
              if (!findVnode) {
                // 说明新开始在老元素V中没找到，插入
                mount(newCh[newStartId], container, oldCh[oldStartId].el)
                newStartId++
              }
            }
          }
          if (oldStartId <= oldEndId) {
            // 说明新元素先遍历完成，删掉没有遍历到的老元素
            for (let i = oldStartId; i <= oldEndId; i++) {
              container.removeChild(oldCh[i].el)
            }
          } else if (newStartId <= newEndId) {
            // 说明老元素先遍历完成，增加没有遍历到的新元素
            for (let i = newStartId; i <= newEndId; i++) {
              mount(newCh[i], container)
            }
          }
          break;
      }
      break;
  }
}

/**
 * 新节点替换老节点
 * @param {*} oldVnode 
 * @param {*} newVnode 
 * @param {*} container 
 */
function replaceVnode (oldVnode, newVnode, container) {
  container.removeNode(oldVnode.el)
  mount(newVnode, container)
}

/**
 * 首次渲染
 */
function mount (vnode, container, referenceNode = null) {
  const { tag, tagType, children } = vnode
  if (tagType === nodeType.HTML) {
    // html节点
    mountHTML(vnode, container, referenceNode)
  } else if (tagType === nodeType.TEXT) {
    // 文本节点
    mountText(vnode, container)
  }
}

/**
 * 创建html节点
 */
function mountHTML (vnode, container, referenceNode) {
  const { tag, tagType, attr, children, childrenNum} = vnode

  // 创建元素
  const dom = document.createElement(tag)
  // 为vnode的el属性赋值真实的DOM元素
  vnode.el = dom

  // 处理样式
  if (attr) {
    // 遍历每个样式，并将每个样式patch到元素上
    for (let key in attr) {
      // 由于是首次渲染，所以没有老的样式
      patchAttr(vnode.el, key, null, attr[key])
    }
  }

  // 处理子元素
  if (childrenNum !== childNodeNum.EMPTY) {
    // 说明有子元素存在
    if (childrenNum  === childNodeNum.SINGLE) {
      // 只有一个子元素，调用mount方法，在当前DOM上渲染该子元素
      mount(children, vnode.el)
    } else if (childrenNum  === childNodeNum.MULTIPLE) {
      // 说明有多个子元素， 循环遍历挂载这些子元素
      children.forEach(child => {
        mount(child, vnode.el)
      })
    }
  }

  // 挂载DOM到容器节点
  referenceNode ? container.insertBefore(vnode.el, referenceNode) : container.appendChild(dom)
}

/**
 * 创建文本节点
 */
function mountText (vnode, container) {
  const dom = document.createTextNode(vnode.children)
  vnode.el = dom
  container.appendChild(dom)
}

/**
 * 为元素patch样式
 * el: 元素
 * key: 样式属性
 * oldAttr: 老的样式
 * newAttr: 新的样式
 */
function patchAttr(el, key, oldAttr, newAttr) {
  switch (key) {
    // style属性, style: { color: 'red', ...}
    case 'style':
      // 新增或更新
      for (let attr in newAttr) {
        el.style[attr] = newAttr[attr]
      }
      // 删除
      for (let attr in oldAttr) {
        if (!newAttr.hasOwnProperty(attr)) {
          el.style[attr] = ''
        }
      }
      break;
    // class属性
    case 'class':
      el.className = newAttr
      break;
    // 点击事件
    case '@click':
      // 点击事件，老的存在，则先移除老的事件
      if (oldAttr) {
        el.removeEventListener(key.slice(1), oldAttr)
      }
      // 添上新的事件处理函数
      if (newAttr) {
        el.addEventListener(key.slice(1), newAttr)
      }
      break;
    default:
      el.setAttribute(key, newAttr)
  }
}