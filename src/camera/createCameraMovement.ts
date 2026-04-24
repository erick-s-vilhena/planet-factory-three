import * as THREE from 'three'

type CreateCameraMovementParams = {
  camera: THREE.OrthographicCamera
  mount: HTMLDivElement
  renderer: THREE.WebGLRenderer
  target: THREE.Vector3
  updateViewport: () => void
  isZooming: () => boolean
}

export function createCameraMovement({
  camera,
  mount,
  renderer,
  target,
  updateViewport,
  isZooming,
}: CreateCameraMovementParams) {
  const worldUp = new THREE.Vector3(0, 1, 0)
  const cameraRight = new THREE.Vector3()
  const cameraUp = new THREE.Vector3()
  const horizontalPan = new THREE.Vector3()
  const verticalPan = new THREE.Vector3()
  const panOffset = new THREE.Vector3()
  const cameraForward = new THREE.Vector3()
  const DRAG_THRESHOLD = 4

  let isPanning = false
  let hasDragged = false
  let shouldBlockSelection = false
  let lastPointerX = 0
  let lastPointerY = 0
  let dragStartX = 0
  let dragStartY = 0
  const activeTouchPointers = new Set<number>()

  const panCamera = (deltaX: number, deltaY: number) => {
    const viewportWidth = Math.max(1, mount.clientWidth)
    const viewportHeight = Math.max(1, mount.clientHeight)
    const frustumWidth = camera.right - camera.left
    const frustumHeight = camera.top - camera.bottom
    const worldPerPixelX = frustumWidth / viewportWidth
    const worldPerPixelY = frustumHeight / viewportHeight

    camera.matrixWorld.extractBasis(cameraRight, cameraUp, cameraForward)

    horizontalPan.copy(cameraRight).setY(0).normalize()
    verticalPan.copy(cameraUp).projectOnPlane(worldUp)

    const verticalProjectionLength = verticalPan.length()

    if (verticalProjectionLength === 0) {
      return
    }

    verticalPan.normalize()

    panOffset
      .copy(horizontalPan)
      .multiplyScalar(-deltaX * worldPerPixelX)
      .addScaledVector(verticalPan, (deltaY * worldPerPixelY) / verticalProjectionLength)

    target.add(panOffset)
    updateViewport()
  }

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    if (event.pointerType === 'touch') {
      activeTouchPointers.add(event.pointerId)

      if (activeTouchPointers.size !== 1 || isZooming()) {
        stopPanning(event)
        return
      }
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

    if (event.pointerType === 'touch' && (activeTouchPointers.size !== 1 || isZooming())) {
      stopPanning(event)
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
    if (event?.pointerType === 'touch') {
      activeTouchPointers.delete(event.pointerId)
    }

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
    panByScreenDelta: (deltaX: number, deltaY: number) => {
      shouldBlockSelection = true
      panCamera(deltaX, deltaY)
    },
    consumeSelectionBlock: () => {
      const blocked = shouldBlockSelection
      shouldBlockSelection = false
      return blocked
    },
    attachPan: () => {
      renderer.domElement.addEventListener('pointerdown', handlePointerDown)
      renderer.domElement.addEventListener('pointermove', handlePointerMove)
      renderer.domElement.addEventListener('pointerup', stopPanning)
      renderer.domElement.addEventListener('pointercancel', stopPanning)
      renderer.domElement.addEventListener('pointerleave', stopPanning)
    },
    detachPan: () => {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointermove', handlePointerMove)
      renderer.domElement.removeEventListener('pointerup', stopPanning)
      renderer.domElement.removeEventListener('pointercancel', stopPanning)
      renderer.domElement.removeEventListener('pointerleave', stopPanning)
      renderer.domElement.style.cursor = ''
    },
  }
}
