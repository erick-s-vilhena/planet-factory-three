import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createIsometricCamera } from './camera/createIsometricCamera'
import { createGround, GRID_SIZE } from './ground/createGround'
import { createTileInteraction } from './ground/tileInteraction'
import './App.css'

function App() {
  const mountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const mount = mountRef.current

    if (!mount) {
      return
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0f172a')
    scene.fog = new THREE.Fog('#0f172a', 45, 90)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    const {
      camera,
      updateViewport,
      isPanning,
      consumeSelectionBlock,
      attachPan,
      detachPan,
      attachZoom,
      detachZoom,
    } =
      createIsometricCamera(
        mount,
        renderer,
        GRID_SIZE,
      )
    const ground = createGround(scene)
    const tileInteraction = createTileInteraction(
      renderer,
      camera,
      ground.tiles,
      isPanning,
      consumeSelectionBlock,
    )

    const ambientLight = new THREE.AmbientLight('#dbeafe', 1.8)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight('#fff7ed', 2.4)
    directionalLight.position.set(10, 14, 8)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(2048, 2048)
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 100
    directionalLight.shadow.camera.left = -30
    directionalLight.shadow.camera.right = 30
    directionalLight.shadow.camera.top = 30
    directionalLight.shadow.camera.bottom = -30
    scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight('#93c5fd', 1.2)
    fillLight.position.set(-8, 6, -10)
    scene.add(fillLight)

    updateViewport()
    window.addEventListener('resize', updateViewport)
    attachPan()
    tileInteraction.attach()
    attachZoom()

    let frameId = 0

    const animate = () => {
      frameId = window.requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }

    animate()

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateViewport)
      tileInteraction.detach()
      detachPan()
      detachZoom()
      mount.removeChild(renderer.domElement)
      ground.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <main className="app-shell">
      <div className="scene-frame" ref={mountRef} />
      <div className="scene-overlay">
        <h1>Isometric Tile Grid</h1>
        <p>Chunk 40x40 com tiles interativos em camera ortografica isometrica.</p>
      </div>
    </main>
  )
}

export default App
