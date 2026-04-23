import * as THREE from 'three'
import { ISOMETRIC_FRUSTUM_FACTOR } from './cameraConstants'

type CreateIsometricPerspectiveParams = {
  camera: THREE.OrthographicCamera
  mount: HTMLDivElement
  renderer: THREE.WebGLRenderer
  gridSize: number
  target: THREE.Vector3
  visibleTiles: () => number
}

export function createIsometricPerspective({
  camera,
  mount,
  renderer,
  gridSize,
  target,
  visibleTiles,
}: CreateIsometricPerspectiveParams) {
  const cameraDirection = new THREE.Vector3(1, 1, 1).normalize()

  const updateViewport = () => {
    const { clientWidth, clientHeight } = mount
    const aspect = clientWidth / clientHeight
    const frustumSize = visibleTiles() * ISOMETRIC_FRUSTUM_FACTOR

    camera.left = (-frustumSize * aspect) / 2
    camera.right = (frustumSize * aspect) / 2
    camera.top = frustumSize / 2
    camera.bottom = -frustumSize / 2
    camera.near = 0.1
    camera.far = 100

    const distance = gridSize * 1.1
    camera.position.copy(target).addScaledVector(cameraDirection, distance)
    camera.lookAt(target)
    camera.updateMatrixWorld()
    camera.updateProjectionMatrix()

    renderer.setSize(clientWidth, clientHeight)
  }

  return {
    updateViewport,
  }
}
