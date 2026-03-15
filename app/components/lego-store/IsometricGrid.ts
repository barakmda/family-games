/**
 * Isometric Grid System
 * Converts between grid coordinates and screen (pixel) coordinates
 * for a 2.5D isometric view.
 */

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;

/** Convert grid coordinates to screen (pixel) coordinates */
export function gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
  return {
    x: (gridX - gridY) * (TILE_WIDTH / 2),
    y: (gridX + gridY) * (TILE_HEIGHT / 2),
  };
}

/** Convert screen coordinates to grid coordinates */
export function screenToGrid(screenX: number, screenY: number): { gridX: number; gridY: number } {
  const gridX = (screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2;
  const gridY = (screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2;
  return { gridX: Math.round(gridX), gridY: Math.round(gridY) };
}

/** Get the 4 corner points of an isometric tile for drawing */
export function getTileCorners(screenX: number, screenY: number): [number, number][] {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;
  return [
    [screenX, screenY - hh],     // top
    [screenX + hw, screenY],     // right
    [screenX, screenY + hh],     // bottom
    [screenX - hw, screenY],     // left
  ];
}

/** Get screen center offset for a grid of given dimensions */
export function getGridCenter(gridWidth: number, gridHeight: number, canvasWidth: number, canvasHeight: number) {
  // Center of the grid in screen space
  const topLeft = gridToScreen(0, 0);
  const topRight = gridToScreen(gridWidth - 1, 0);
  const bottomLeft = gridToScreen(0, gridHeight - 1);
  const bottomRight = gridToScreen(gridWidth - 1, gridHeight - 1);

  const minX = Math.min(topLeft.x, bottomLeft.x) - TILE_WIDTH / 2;
  const maxX = Math.max(topRight.x, bottomRight.x) + TILE_WIDTH / 2;
  const minY = topLeft.y - TILE_HEIGHT / 2;
  const maxY = Math.max(bottomLeft.y, bottomRight.y) + TILE_HEIGHT / 2;

  const gridPixelWidth = maxX - minX;
  const gridPixelHeight = maxY - minY;

  return {
    offsetX: (canvasWidth - gridPixelWidth) / 2 - minX,
    offsetY: (canvasHeight - gridPixelHeight) / 2 - minY + 20, // slight vertical offset
    gridPixelWidth,
    gridPixelHeight,
  };
}

/** Draw an isometric tile (diamond shape) */
export function drawIsometricTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  fillColor: string,
  strokeColor: string = 'rgba(0,0,0,0.1)',
  lineWidth: number = 1,
): void {
  const corners = getTileCorners(screenX, screenY);
  ctx.beginPath();
  ctx.moveTo(corners[0][0], corners[0][1]);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i][0], corners[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/** Draw an isometric box (cube) with top, left side, and right side faces */
export function drawIsometricBox(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  height: number, // in pixels (visual height)
  topColor: string,
  leftColor: string,
  rightColor: string,
): void {
  const hw = TILE_WIDTH / 2;
  const hh = TILE_HEIGHT / 2;

  // Right face
  ctx.beginPath();
  ctx.moveTo(screenX, screenY + hh);           // front bottom
  ctx.lineTo(screenX + hw, screenY);            // right
  ctx.lineTo(screenX + hw, screenY - height);   // right top
  ctx.lineTo(screenX, screenY + hh - height);   // front top
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Left face
  ctx.beginPath();
  ctx.moveTo(screenX, screenY + hh);           // front bottom
  ctx.lineTo(screenX - hw, screenY);            // left
  ctx.lineTo(screenX - hw, screenY - height);   // left top
  ctx.lineTo(screenX, screenY + hh - height);   // front top
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.stroke();

  // Top face
  ctx.beginPath();
  ctx.moveTo(screenX, screenY - hh - height);   // back top
  ctx.lineTo(screenX + hw, screenY - height);    // right top
  ctx.lineTo(screenX, screenY + hh - height);    // front top
  ctx.lineTo(screenX - hw, screenY - height);    // left top
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.stroke();
}

/** Draw a circle-based character at isometric position */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  emoji: string,
  shadowRadius: number = 12,
): void {
  // Shadow
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + 4, shadowRadius, shadowRadius / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fill();

  // Emoji
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, screenX, screenY - 12);
}

/** Lerp between two grid positions (for smooth movement) */
export function lerpGridToScreen(
  fromGX: number, fromGY: number,
  toGX: number, toGY: number,
  progress: number,
  offsetX: number, offsetY: number,
): { x: number; y: number } {
  const from = gridToScreen(fromGX, fromGY);
  const to = gridToScreen(toGX, toGY);
  return {
    x: from.x + (to.x - from.x) * progress + offsetX,
    y: from.y + (to.y - from.y) * progress + offsetY,
  };
}
