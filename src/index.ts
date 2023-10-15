import { Signal, effect } from '@adamringhede/signal'
import * as THREE from 'three'

export type ComponentElement = Signal<THREE.Object3D> | Signal<ComponentElement[]> | THREE.Object3D | ComponentElement[] 

const registeredEffects = new WeakMap<ComponentElement, THREE.Group>()

export function traverseComponents(c: ComponentElement, parent: THREE.Object3D): THREE.Object3D[] {
  const result: THREE.Object3D[] = []
  if (c instanceof Array) {
    for (const child of c) {
      result.push(...traverseComponents(child, parent))
    }
  } else if (c != null) {
    if (c instanceof THREE.Object3D) {
      parent.add(c)
      result.push(c)
    } else if (!registeredEffects.has(c)) {
      /*
      Don't want to register the same effect more than once.
      This would happen when we traverse components.
      The point of the effect further down is to ensure the parent-child 
      relationship is updated in case it changes. 
      However, this effect only needs to be triggered once.
      */
      const dynamicGroup = new THREE.Group()
      registeredEffects.set(c, dynamicGroup)
      result.push(dynamicGroup)
      let previousChildren: THREE.Object3D[] = []
      parent.add(dynamicGroup)

      effect(() => {
        const child = c()
        // Using a set timeout to avoid nested effect calls which currently is not supported
        // This should not be needed if an effect context stack is used
        setTimeout(() => {
          const directChildren = traverseComponents(child, dynamicGroup)
          result.push(...directChildren)

          const removedChildren = previousChildren.filter(p => directChildren.every(c => c.id !== p.id))
          dynamicGroup.remove(...removedChildren)
          if (directChildren.length > 0) {
            dynamicGroup.add(...directChildren)
          }

          previousChildren = directChildren
        }, 20)
      })
    } else if (registeredEffects.has(c)) {
      result.push(registeredEffects.get(c)!)
    }
  }
  return result;
}