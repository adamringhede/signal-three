import { Signal, computed, effect, signal } from '@adamringhede/signal';
import './style.css'
import * as THREE from 'three';
import { ComponentElement, traverseComponents } from '../../src/traverse'
import { defineContext } from '../../src'

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
    withRotation(Container([mesh]), signal(new THREE.Euler(0,0,Math.PI/4)))
  ]
}

// A problem with containers can be that they are currently setting up 

function getRef(comp: ComponentElement): THREE.Object3D {
  if (comp instanceof Array) {
    return Container(comp)
  } else if (typeof comp === 'function') {
    return comp()
  } else {
    return comp
  }
}

function withPosition(comp: ComponentElement, position: Signal<THREE.Vector3>): ComponentElement {
  effect(() => {
    getRef(comp).position.copy(position())
  })
  return comp
}

function withRotation(comp: ComponentElement, rotation: Signal<THREE.Euler>): ComponentElement {
  effect(() => {
    getRef(comp).rotation.copy(rotation())
  })
  return comp
}

function withScale(comp: ComponentElement, scale: Signal<THREE.Vector3>): ComponentElement {
  effect(() => {
    getRef(comp).scale.copy(scale())
  })
  return comp
}

type TransformSignal = {
  rotation: Signal<THREE.Euler>
  position: Signal<THREE.Vector3>
  scale: Signal<THREE.Vector3>
} 
function withTransform(comp: ComponentElement, { rotation, scale, position }: TransformSignal) {
  withPosition(comp, position)
  withRotation(comp, rotation)
  withScale(comp, scale)
  return comp
}

function Container(objects: ComponentElement): THREE.Group {
  const group = new THREE.Group()
  traverseComponents(objects, group)
  return group 
}


type TestContext = {
  foo: Signal<number>
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
  shouldShow.update(v => !v)
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
 * 
 * How to handle input
 * 
 * If you want to make an object clickable,
 * create a raycaster somewhere in a context.
 * 
 * Register your object as some sort of target.
 * In your single location for the raycaster, look at that object as a potential target.
 * The raycaster should only have a weak reference though as that object may be removed in the future.
 * This can be dangerous. It would be important to somehow deregister event listeners.
 * Maybe computed and effects should be able to provide a cleanup function.
 * Whenever an effect is destroyed, it should call cleanups. 
 * 
 * https://angular.io/guide/signals#effect-cleanup-functions
 * 
 * I still need to ensure that the effect gets destroyed which I am not sure if it will right now.
 * 
 * This is realistically only possible by having some global thing that can collect all calls to effect. 
 * I would need a wrapper in my library for this.
 * 
 */




