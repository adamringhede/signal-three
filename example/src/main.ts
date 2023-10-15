import { Signal, computed, effect, signal } from '@adamringhede/signal';
import './style.css'
import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );


const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
//scene.add( cube );

camera.position.z = 5;

function animate() {
	requestAnimationFrame( animate );

  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

	renderer.render( scene, camera );
}
animate()

type Type<T> = new (...args: any[]) => T

type ElementFn<T extends (new (...args: any[]) => any) = typeof THREE.Object3D> = () => {
  type: T,
  scale: Signal<number>|number,
  material: Signal<THREE.Material>|THREE.Material,
  geometry: THREE.BufferGeometry
} 




function Cube() {
  const scale = signal(1)
  const material = signal(new THREE.MeshBasicMaterial({color: 0xfff000}))

  setInterval(() => {
    scale.update(current => {
      return Math.min(current + 0.2, 4)
    })
  }, 600)

  setInterval(() => {
    material.update(prev => new THREE.MeshBasicMaterial({color: 0xffffff * Math.random()}))
  }, 2000)

  // the alternative to this kind of syntax is 

  const createFn = () => new THREE.Mesh(new THREE.BoxGeometry(1,1,1), material())

  const updateFn = (mesh: THREE.Mesh) => {
    const s = scale()
    mesh.scale.set(s,s,s)
  }

  reactive(createFn, updateFn) // should be able to pass in children
}

type Props<T extends Record<string, unknown>> = {[K in keyof T]: Signal<T[K]>}

type ChildProps = Record<string, Signal<unknown>|unknown>
type Component<P extends ChildProps> = (props: P) => number[] 

// child function is just a way to call the component method with wrapped props so they all can be treated like signals
// this doesn't seem great though.
// I think being able to pass signals is critical.
// hwoever maybe it isn't so necesasry.
// if construct chilren within a function, that function can be called within a computed.
// A potential problem though is that the entire thing has to be recreated if any signal changes



// This example is maybe a bit basic as you can change the color without recreating the materials

// I don't like that the following solution results in potentially recreating the entire tree of children.
// The point of signals is to be more fine grained. 
// A single property of an object should be possible to change.
const opacity = signal(0.5)
const color = signal(0xfff000)

const position = signal(new THREE.Vector3())

type ComponentElement = Signal<THREE.Object3D> | Signal<ComponentElement[]> | THREE.Object3D | ComponentElement[] 

function MyComponent(): ComponentElement {
  

  const material = computed(() => {
    console.log("update material")
    return new THREE.MeshBasicMaterial({color: color()})
  })

  // the following pattern can be used to control a specific property
  // effect is used because it causes side effects, it is mutating something rather than being a pure function

  let savedPosition = new THREE.Vector3()

  const mesh = computed(() => {
    
    console.log("Create new mesh")
    return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), material())
  })


  console.log("effect 2")

  effect(() => {
    mesh().position.copy(position())
    //mesh().position.copy(savedPosition)
  })

  effect(() => {
    // Store a reference to the last one
    savedPosition = mesh().position
  })

  setInterval(() => {
    //position.mutate(p => p.x += 0.1)
    //material().color.setHex(0xffffff * Math.random())
  }, 1000) 

  /**
   * This is just illustrative.
   * Ideally, neither state nor input should be done within a rendering function
   * like this.
   * Input should be separate so that you can reuse this component.
   * 
   * For reactivity to work. You should not treat the three.js scene as your source
   * of truth as objects in it may be recreated.
   */

  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase() 
    switch (key) {
      // This will be less messier when I fixed support for mutate
      case 'a':
        position.update(p => new THREE.Vector3(p.x - 1, p.y, p.z))
        //mesh().position.x -= 1
        break
      case 'w':
        position.update(p => new THREE.Vector3(p.x, p.y + 1, p.z))
        //mesh().position.y += 1
        break
      case 'd':
        position.update(p => new THREE.Vector3(p.x + 1, p.y, p.z))
        //mesh().position.x += 1
        break
      case 's':
        position.update(p => new THREE.Vector3(p.x, p.y-1, p.z))
        //mesh().position.y -= 1
        break
    }
  })

  return [
    mesh
  ]
}

// TODO Test that this actually works.
// Not loving how complex this is though
// I am very unsure about nesting computed like this
// Like, it should work but I am not sure if may result in a memory leak
// I don't think this handles all cases.
// Would I not need an effect to add to parents?
// If this does work, I could maybe replace the other traverse children function.
// I think the problem with this is that it will not care about signals
// updating. It would never update the references to groups.
function Grouped(objects: ComponentElement[]): Signal<THREE.Group> {
  return computed(() => {
    const group = new THREE.Group()
    for (const obj of objects) {
      if (obj instanceof Array) {
        group.add(Grouped(obj)())
      } else if (typeof obj === 'function') {
        const o = obj() 
        if (o instanceof THREE.Object3D) { 
          group.add(o)
        } else {
          // It is ComponentElement[]
          group.add(Grouped(o)())
        }
        
      } else if (obj instanceof THREE.Object3D) {
        group.add(obj)
      }
    }
    return group;
  })
}


// Could I make a ball sentient?



const shouldShow = signal(true)
function ParentComponent(): ComponentElement {
  
  /*
  I need a way to now add components as children. 
  Ideally components can have a variable amount of children but if I were to ignore that for now
  They would each return an array of 0 or more 
  */

  const mc = MyComponent()
  //return [mc]
  return computed(() => shouldShow() ? [mc] : [])
}

const root = ParentComponent()



const registeredEffects = new WeakMap<ComponentElement, THREE.Group>()
function traverseComponents(c: ComponentElement, parent: THREE.Object3D): THREE.Object3D[] {
  const result = []
  if (c instanceof Array) {
    /// Don't think using a group is necessarily useful here.
    // Ids will be different so it is hard to diff
    ///const group = new THREE.Group()
    for (const child of c) {
      result.push(...traverseComponents(child, parent))

      //result.push(...traverseComponents(child, group))
    }
    //parent.add(group)
    //result.push(group)
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
      

      // TODO Handle the case that an effect is registered, but I still need to return child objects
      // maybe. not really sure 


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
          // check that no direct children contains a previous child to know it is removed
          const removedChildren = previousChildren.filter(p => directChildren.every(c => c.id !== p.id))
          console.log({directChildren, removedChildren})
          dynamicGroup.remove(...removedChildren)
          if (directChildren.length > 0) {
            dynamicGroup.add(...directChildren)
          }

          previousChildren = directChildren
        }, 20)

      })

      // traverse here now however, if c is dynamic, I need to know check differences to remove 
    } else if (registeredEffects.has(c)) {
      result.push(registeredEffects.get(c)!)
    }
  }
  return result;
}

console.log(traverseComponents(root, scene))

console.log(ParentComponent())

//effect(() => {
  
//})

// Until I have made it possible to have effects within effects I can query every second
setInterval(() => {
  color.update(v => 0xffffff * Math.random())
  //opacity.update(v => v += 0.01)
  //position.update(p => { return new THREE.Vector3(1,0,0).add(p) })
  //shouldShow.update(v => !v)
}, 1000)


function child<P extends ChildProps, C extends Component<P>>(component: C, props: P) {
  const wrappedProps: ChildProps = {}
  for (const [key,value] of Object.entries(props)) {
    // Should be a more reliable way of checking if it is a signal to support passing in functions as input.
    wrappedProps[key] = typeof value == 'function' ? value : signal(value)
  }
  component(props as P)
}


function Other({}: Props<{}>) {
  child(Ball, {color: signal(0xfff000)})

  return [3]
}
function Ball({ color }: Props<{color: number}>) {
  console.log(color())
  return [5]
}



// Maybe if props are sent to some special function and not the function itself. 
// I could wrap primitive values in a function to make it compatible

// Passing props that can change to another would require using signals as n input
// I could wrape something to always accept signals

/*
An alternative could be to just use the create method and then have a reference to the object
to speicfy the update elsewhere
*/

// Would like to be able to just return the reactive object
// This should be added to a child to another. 

// could pass in an array of children as the last parameter or have some function.

// composing multiple other objects could be even easier
// as you only need to specify your children 

function reactive<T extends THREE.Object3D>(createFn: () => T, updateFn?: (obj: T) => void) {
  const object = computed(createFn)
  
  let obj = object()
  effect(() => {
    scene.remove(scene)
    obj = object()
    //scene.add(obj)
  })

  effect(() => {
    const obj = object()
    if (updateFn != null) updateFn(obj)
  })

} 

Cube()

/**
 * take the cube call. 
 * make a computed that creas a mesh
 * the scale is then applied using an effect
 */
/*
function createObject() {
  const fn = Cube()
  
  // I think updating any signal will cause this to recompute
  // This is why scale should be a signal rather than the value
  
  const object = computed(() => {
    const element = fn()
    console.log("Construct element")
    if (element.type === THREE.Mesh) {
      return new THREE.Mesh(element.geometry, typeof element.material === 'function' ? element.material() : element.material)
    }
    return new element.type()
  })

  // using the same compute in a single effect causes it to be called twice
  // storing the first instance like this works but it shouldn't be needed
  let materialized = object()
  const recreated = effect(() => {
    console.log("first", materialized.id)
    scene.remove(materialized)
    materialized = object()
    scene.add(materialized)
  })

  const updates = effect(() => {
    // it gets the cached object without needing to recompute it
    // uses signals that can change without recreating the object
    let materialized = object()
    console.log("second", materialized.id)
    const element = fn()
    const scale = typeof element.scale === 'function' ? element.scale() : element.scale 
    materialized.scale.set(scale, scale, scale)
  })


  // replace with new instances

  
}


createObject()*/

/*

Goal is to be able to the following stuff reactively.
Ideally in a way that doesn't require recreation of objects.

Mesh
Gometry
Material
Group

*/