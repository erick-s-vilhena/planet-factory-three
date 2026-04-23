import * as THREE from 'three'

type CreateCameraMovementParams = {
  camera: THREE.OrthographicCamera
  mount: HTMLDivElement
  renderer: THREE.WebGLRenderer
  target: THREE.Vector3
  updateViewport: () => void
}

export function createCameraMovement({
  camera,
  mount,
  renderer,
  target,
  updateViewport,
}: CreateCameraMovementParams) {
  const worldUp = new THREE.Vector3(0, 1, 0)
  const cameraRight = new THREE.Vector3()
  const cameraUp = new THREE.Vector3()
  const horizontalPan = new THREE.Vector3()
  const verticalPan = new THREE.Vector3()
  const panOffset = new THREE.Vector3()
  const DRAG_THRESHOLD = 4

  let isPanning = false
  let hasDragged = false
  let shouldBlockSelection = false
  let lastPointerX = 0
  let lastPointerY = 0
  let dragStartX = 0
  let dragStartY = 0

  const panCamera = (deltaX: number, deltaY: number) => {
    const viewportWidth = Math.max(1, mount.clientWidth)
    const viewportHeight = Math.max(1, mount.clientHeight)
    const frustumWidth = camera.right - camera.left
    const frustumHeight = camera.top - camera.bottom
    const worldPerPixelX = frustumWidth / viewportWidth
    const worldPerPixelY = frustumHeight / viewportHeight

    camera.matrixWorld.extractBasis(cameraRight, cameraUp, new THREE.Vector3())

    horizontalPan.copy(cameraRight).setY(0).normalize()
    verticalPan.copy(cameraUp).projectOnPlane(worldUp).normalize()

    panOffset
      .copy(horizontalPan)
      .multiplyScalar(-deltaX * worldPerPixelX)
      .addScaledVector(verticalPan, deltaY * worldPerPixelY)

    target.add(panOffset)
    updateViewport()
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    event.preventDefault()
    isPanning = true
    hasDragged = false
    lastPointerX = event.clientX
    lastPointerY = event.clientY
    dragStartX = event.clientX
    dragStartY = event.clientY
    renderer.domElement.setPointerCapture(event.pointerId)
    if (event.pointerType === 'mouse') {
      renderer.domElement.style.cursor = 'grabbing'
    }
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!isPanning) {
      return
    }

    const deltaX = event.clientX - lastPointerX
    const deltaY = event.clientY - lastPointerY

    lastPointerX = event.clientX
    lastPointerY = event.clientY

    if (!hasDragged) {
      const dragDistance = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY)
      hasDragged = dragDistance >= DRAG_THRESHOLD
    }

    panCamera(deltaX, deltaY)
  }

  const stopPanning = (event?: PointerEvent) => {
    if (!isPanning) {
      return
    }

    shouldBlockSelection = hasDragged
    isPanning = false
    hasDragged = false
    if (event && renderer.domElement.hasPointerCapture(event.pointerId)) {
      renderer.domElement.releasePointerCapture(event.pointerId)
    }
    renderer.domElement.style.cursor = ''
  }

  return {
    isPanning: () => isPanning,
    consumeSelectionBlock: () => {
      const blocked = shouldBlockSelection
      shouldBlockSelection = false
      return blocked
    },
    attachPan: () => {
      renderer.domElement.addEventListener('pointerdown', handlePointerDown)
      renderer.domElement.addEventListener('pointermove', handlePointerMove)
      renderer.domElement.addEventListener('pointerup', stopPanning)
      renderer.domElement.addEventListener('pointerleave', stopPanning)
      renderer.domElement.addEventListener('pointercancel', stopPanning)
    },
    detachPan: () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerup', stopPanning)
      renderer.domElement.removeEventListener('pointerleave', stopPanning)
      renderer.domElement.removeEventListener('pointercancel', stopPanning)
      renderer.domElement.style.cursor = ''
    },
  }
}
