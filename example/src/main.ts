import { Signal, computed, effect, signal } from '@adamringhede/signal';
import './style.css'
import * as THREE from 'three';
import { ComponentElement, traverseComponents } from '../../src'

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

const opacity = signal(0.5)
const color = signal(0xfff000)
let contextKey = 0

const position = signal(new THREE.Vector3())

const MyContext = defineContext<TestContext>()


function MyComponent(): ComponentElement {
  const material = computed(() => {
    console.log("update material")
    return new THREE.MeshBasicMaterial({color: color()})
  })

  const testContext = MyContext.getContext()
  console.log({ testContext, value: testContext.foo() })

  const mesh = computed(() => {
    console.log("Create new mesh")
    return new THREE.Mesh(new THREE.BoxGeometry(1,1,1), material())
  })

  effect(() => {
    mesh().position.copy(position())
    //mesh().position.copy(savedPosition)
  })
  
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


type TestContext = {
  foo: Signal<number>
}

const contextStack: Record<string, unknown[]> = {}

function defineContext<T>() {
  const key = (++contextKey).toString()
  return {
    provideContext<R>(value: T, fn: () => R): R {
      return _provideContext(key, value, fn)
    },
    getContext(): T {
      return _getContext<T>(key)
    }
  }
}

function _provideContext<T, R>(key: string, ctx: T, fn: () => R) {
  if (contextStack[key] == null) {
    contextStack[key] = []
  }
  contextStack[key].push(ctx)
  // This only works because the functions are not async
  const result = fn()
  contextStack[key].pop()
  return result
} 

function _getContext<T>(key: string): T {
  if (contextStack[key] == null || contextStack[key].length == 0) {
    throw Error(`No context provided for key ${key}`)
  }
  return contextStack[key][contextStack[key].length-1] as T
}

const shouldShow = signal(true)
function ParentComponent(): ComponentElement {
  const testContext: TestContext = {foo: signal(1)}
  const mc = MyContext.provideContext(testContext, () => MyComponent())
  //return [mc]
  return computed(() => shouldShow() ? [mc] : [])
}

const root = ParentComponent()

console.log(traverseComponents(root, scene))

setInterval(() => {
  color.update(v => 0xffffff * Math.random())
  //opacity.update(v => v += 0.01)
  //position.update(p => { return new THREE.Vector3(1,0,0).add(p) })
  //shouldShow.update(v => !v)
}, 1000)


/**
 * 
 * Downside of this?
 * 
 * There is no concept of entities. 
 * This is purely for rendering. 
 * 
 * I think this is why I don't like react's approach but maybe there 
 * is something to it. 
 * 
 * You could keep your entities as models in a world as an array signal
 * You use this signal add a rendered representation of them.
 * You could then have a component simply of characters
 * 
 * Adding and removing could be an issue if this array becomes very large
 * but I guess it could be optimized.
 * 
 * You can have a world containing entities. 
 * 
 * How about physics? How does physics play a part here?
 * In your component you could create a physics body.
 * The entity provides all the data as input to both the mesh and the physics body.
 * 
 * Use a physics world from a world context.
 * Add your body to the physics world.
 * On each physics step, update the transform of the rendered object
 * based on the physics body. 
 * 
 * The properties of the physics body could also be changed with signals and effects
 * 
 */




