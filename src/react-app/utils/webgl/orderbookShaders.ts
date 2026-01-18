/**
 * WebGL Orderbook Shaders
 *
 * GPU-accelerated shaders for high-performance orderbook rendering.
 * Features:
 * - Instanced rendering for depth bars
 * - Heat map color gradient based on volume
 * - Smooth interpolation for updates
 */

// Vertex Shader: Positions depth bars based on price levels
export const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute float a_size;
  attribute float a_cumulative;
  attribute float a_side; // 0 = bid, 1 = ask
  attribute float a_index;

  uniform vec2 u_resolution;
  uniform float u_maxCumulative;
  uniform float u_levelHeight;
  uniform float u_animationProgress;

  varying float v_intensity;
  varying float v_side;

  void main() {
    // Calculate bar width based on cumulative volume
    float barWidth = (a_cumulative / u_maxCumulative);

    // Smooth interpolation for animation
    float smoothWidth = mix(0.0, barWidth, u_animationProgress);

    // Position calculation
    float x = a_position.x * smoothWidth;
    float y = (a_index * u_levelHeight) + (a_position.y * u_levelHeight);

    // Convert to clip space
    vec2 clipSpace = (vec2(x, y) / u_resolution) * 2.0 - 1.0;

    // Flip Y axis
    clipSpace.y = -clipSpace.y;

    gl_Position = vec4(clipSpace, 0.0, 1.0);

    v_intensity = a_cumulative / u_maxCumulative;
    v_side = a_side;
  }
`;

// Fragment Shader: Color gradients for Bid/Ask visualization
export const FRAGMENT_SHADER = `
  precision mediump float;

  varying float v_intensity;
  varying float v_side;

  uniform float u_opacity;

  void main() {
    // Bid color: Teal (#FCD535) → Green (#2EAD65)
    vec3 bidColor = mix(
      vec3(0.0, 0.85, 0.78),  // #FCD535
      vec3(0.18, 0.68, 0.40), // #2EAD65
      v_intensity
    );

    // Ask color: Orange (#F0B90B) → Red (#F6465D)
    vec3 askColor = mix(
      vec3(0.94, 0.73, 0.04), // #F0B90B
      vec3(0.96, 0.27, 0.36), // #F6465D
      v_intensity
    );

    // Select color based on side
    vec3 color = mix(bidColor, askColor, v_side);

    // Apply intensity and opacity
    float alpha = v_intensity * u_opacity * 0.5;

    gl_FragColor = vec4(color, alpha);
  }
`;

// Helper functions for WebGL setup
export function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

export function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export interface OrderbookLevel {
  price: number;
  size: number;
  total: number;
}

export interface WebGLOrderbookRenderer {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  buffers: {
    position: WebGLBuffer;
    size: WebGLBuffer;
    cumulative: WebGLBuffer;
    side: WebGLBuffer;
    index: WebGLBuffer;
  };
  uniforms: {
    resolution: WebGLUniformLocation;
    maxCumulative: WebGLUniformLocation;
    levelHeight: WebGLUniformLocation;
    animationProgress: WebGLUniformLocation;
    opacity: WebGLUniformLocation;
  };
  attributes: {
    position: number;
    size: number;
    cumulative: number;
    side: number;
    index: number;
  };
}

export function initializeWebGLRenderer(canvas: HTMLCanvasElement): WebGLOrderbookRenderer | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });

  if (!gl) {
    console.error('WebGL not supported');
    return null;
  }

  // Create shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);

  if (!vertexShader || !fragmentShader) return null;

  // Create program
  const program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) return null;

  // Create buffers
  const positionBuffer = gl.createBuffer();
  const sizeBuffer = gl.createBuffer();
  const cumulativeBuffer = gl.createBuffer();
  const sideBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();

  if (!positionBuffer || !sizeBuffer || !cumulativeBuffer || !sideBuffer || !indexBuffer) {
    console.error('Failed to create buffers');
    return null;
  }

  // Get attribute locations
  const positionLoc = gl.getAttribLocation(program, 'a_position');
  const sizeLoc = gl.getAttribLocation(program, 'a_size');
  const cumulativeLoc = gl.getAttribLocation(program, 'a_cumulative');
  const sideLoc = gl.getAttribLocation(program, 'a_side');
  const indexLoc = gl.getAttribLocation(program, 'a_index');

  // Get uniform locations
  const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
  const maxCumulativeLoc = gl.getUniformLocation(program, 'u_maxCumulative');
  const levelHeightLoc = gl.getUniformLocation(program, 'u_levelHeight');
  const animationProgressLoc = gl.getUniformLocation(program, 'u_animationProgress');
  const opacityLoc = gl.getUniformLocation(program, 'u_opacity');

  if (!resolutionLoc || !maxCumulativeLoc || !levelHeightLoc || !animationProgressLoc || !opacityLoc) {
    console.error('Failed to get uniform locations');
    return null;
  }

  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  return {
    gl,
    program,
    buffers: {
      position: positionBuffer,
      size: sizeBuffer,
      cumulative: cumulativeBuffer,
      side: sideBuffer,
      index: indexBuffer,
    },
    uniforms: {
      resolution: resolutionLoc,
      maxCumulative: maxCumulativeLoc,
      levelHeight: levelHeightLoc,
      animationProgress: animationProgressLoc,
      opacity: opacityLoc,
    },
    attributes: {
      position: positionLoc,
      size: sizeLoc,
      cumulative: cumulativeLoc,
      side: sideLoc,
      index: indexLoc,
    },
  };
}

export function renderOrderbook(
  renderer: WebGLOrderbookRenderer,
  bids: OrderbookLevel[],
  asks: OrderbookLevel[],
  options: {
    width: number;
    height: number;
    animationProgress: number;
    opacity: number;
  }
): void {
  const { gl, program, buffers, uniforms, attributes } = renderer;
  const { width, height, animationProgress, opacity } = options;

  // Set viewport
  gl.viewport(0, 0, width, height);

  // Clear with transparent background
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Use program
  gl.useProgram(program);

  // Set uniforms
  gl.uniform2f(uniforms.resolution, width, height);
  gl.uniform1f(uniforms.animationProgress, animationProgress);
  gl.uniform1f(uniforms.opacity, opacity);

  // Calculate max cumulative for scaling
  const maxBidCumulative = bids.length > 0 ? bids[bids.length - 1].total : 1;
  const maxAskCumulative = asks.length > 0 ? asks[asks.length - 1].total : 1;
  const maxCumulative = Math.max(maxBidCumulative, maxAskCumulative);
  gl.uniform1f(uniforms.maxCumulative, maxCumulative);

  // Calculate level height
  const totalLevels = bids.length + asks.length;
  const levelHeight = height / Math.max(totalLevels, 1);
  gl.uniform1f(uniforms.levelHeight, levelHeight);

  // Prepare vertex data
  const positions: number[] = [];
  const sizes: number[] = [];
  const cumulatives: number[] = [];
  const sides: number[] = [];
  const indices: number[] = [];

  // Add asks (top half)
  asks.forEach((level, i) => {
    // Two triangles per bar (6 vertices)
    // Triangle 1: top-left, top-right, bottom-left
    positions.push(0, 0, width, 0, 0, 1);
    // Triangle 2: top-right, bottom-right, bottom-left
    positions.push(width, 0, width, 1, 0, 1);

    for (let j = 0; j < 6; j++) {
      sizes.push(level.size);
      cumulatives.push(level.total);
      sides.push(1); // Ask
      indices.push(i);
    }
  });

  // Add bids (bottom half)
  bids.forEach((level, i) => {
    // Two triangles per bar
    positions.push(0, 0, width, 0, 0, 1);
    positions.push(width, 0, width, 1, 0, 1);

    for (let j = 0; j < 6; j++) {
      sizes.push(level.size);
      cumulatives.push(level.total);
      sides.push(0); // Bid
      indices.push(asks.length + i);
    }
  });

  // Upload buffer data
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(attributes.position);
  gl.vertexAttribPointer(attributes.position, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.size);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(attributes.size);
  gl.vertexAttribPointer(attributes.size, 1, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.cumulative);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cumulatives), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(attributes.cumulative);
  gl.vertexAttribPointer(attributes.cumulative, 1, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.side);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sides), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(attributes.side);
  gl.vertexAttribPointer(attributes.side, 1, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.index);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(indices), gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(attributes.index);
  gl.vertexAttribPointer(attributes.index, 1, gl.FLOAT, false, 0, 0);

  // Draw
  const vertexCount = (bids.length + asks.length) * 6;
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
}

export function disposeRenderer(renderer: WebGLOrderbookRenderer): void {
  const { gl, program, buffers } = renderer;

  gl.deleteBuffer(buffers.position);
  gl.deleteBuffer(buffers.size);
  gl.deleteBuffer(buffers.cumulative);
  gl.deleteBuffer(buffers.side);
  gl.deleteBuffer(buffers.index);
  gl.deleteProgram(program);
}
