


## Idea

### Reactive scene

Your scene is constructed with functions that can return 0 or more objects dynamically based on state.

By using signals as arguments, you can give users of your function the ability to make fine grained changes to avoid reconstructing large parts of the scene.



### Difference from React Three Fiber

* Reactivity is accomplished without triggering your render function every time some state changes. If this is more or less performant is currently not known.
* There is no need for JSX. Only Javascript/Typescript is needed. There is no syntactic wrapper around Three.js like with JSX. You are still using regular Three.js Javascript code. 




## Example

### Changing properties

The following example illustrates how parameters can be used to mutate an object. Whenever the color signal changes value, the effect will be triggered to update the material. 

```ts

function Ball({ color } = { color: Signal<THREE.ColorRepresentation> }) {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 10),
        new THREE.MeshBasicMaterial({color: 0x000000})
    )

    effect(() => {
        mesh.material.color = color()
    })

    return mesh 
}

```

The above example is as performant as it can be. It avoids creating new objects and geometry whenever the color changes. An alternative shown below is more succinct but it would require creating new objects every time a signal it is dependent on changes. 

```ts

function Ball({ color } = { color: Signal<THREE.ColorRepresentation> }) {
    return computed(() => new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 10),
        new THREE.MeshBasicMaterial({color: color()})
    ))  
}

```

#### Updating position of an object
Let's say we build on the example above. The example below will use two signals in one effect. When either of the signal changes, the effect will be triggered. In this way we can apply the given position even if the mesh object is recreated. 

```ts

function Ball({ color, position } = { 
    color: Signal<THREE.ColorRepresentation>,
    position: Signal<THREE.Vector3>
}) {
    const mesh = computed(() => new THREE.Mesh(
        new THREE.SphereGeometry(1, 10, 10),
        new THREE.MeshBasicMaterial({color: color()})
    ))
    effect(() => {
        mesh().position.copy(position())
    })
    return mesh 
}

```


### Dynamic children
You can use signals to decide if an object should be in the scene or not. This can be done by using a computed function. Because the computed function is using a signal in the expression, every time the value of that signal changes, this computed function will get reevaluated. 


```ts
function Basket(containsBall: Signal<boolean>) {
    const redBall = Ball({ color: 0xff0000 })
    const blueBall = Ball({ color: 0x0000ff })
    return computed(() => containsBall() ? [redBall, blueBall] : [])
}

function Root() {
    const containsBall = signal(true)
    // Toggle the value of the signal every 1 second
    setInterval(() => containsBall.update(value => !value), 1000)

    return Basket(containsBall)
}
```
