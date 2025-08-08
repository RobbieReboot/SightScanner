import * as tf from '@tensorflow/tfjs';

export interface GradCamResult {
  heatmap: tf.Tensor2D;
  metrics: {
    percentAffected: number;
    centroid: { x: number; y: number };
    lccSize: number;
    symLR: number;
    symTB: number;
  };
}

/**
 * Compute Grad-CAM heatmap for a given model and input
 * @param model - TensorFlow.js model
 * @param inputTensor - Input tensor [1, height, width, 1]
 * @param classIndex - Target class index for Grad-CAM
 * @returns GradCAM heatmap and computed metrics
 */
export async function computeGradCAM(
  model: tf.LayersModel,
  inputTensor: tf.Tensor4D,
  classIndex: number = 0
): Promise<GradCamResult> {
  // Get the last convolutional layer for Grad-CAM
  const convLayerName = getLastConvLayerName(model);
  
  if (!convLayerName) {
    throw new Error('No convolutional layer found in model');
  }
  
  // Create a model that outputs both the final prediction and conv layer activations
  const gradModel = tf.model({
    inputs: model.input,
    outputs: [
      Array.isArray(model.output) ? model.output[0] : model.output,
      Array.isArray(model.getLayer(convLayerName).output) 
        ? model.getLayer(convLayerName).output[0] 
        : model.getLayer(convLayerName).output
    ]
  });
  
  // Compute gradients
  const [predictions, convOutputs] = await tf.tidy(() => {
    const result = gradModel.predict(inputTensor) as tf.Tensor[];
    return [result[0] as tf.Tensor2D, result[1] as tf.Tensor4D];
  });
  
  // Compute gradients of class score with respect to conv layer
  const gradFunction = tf.grad((x: tf.Tensor4D) => {
    const [preds] = gradModel.predict(x) as tf.Tensor[];
    return (preds as tf.Tensor2D).gather([classIndex], 1);
  });
  
  const grads = gradFunction(inputTensor) as tf.Tensor4D;
  
  // Global average pooling of gradients
  const pooledGrads = tf.mean(grads, [0, 1, 2]);
  
  // Multiply conv outputs by pooled gradients
  const weightedConvOutputs = tf.mul(convOutputs.squeeze([0]), pooledGrads.expandDims(0).expandDims(0));
  
  // Sum across channels and apply ReLU
  const heatmap = tf.relu(tf.sum(weightedConvOutputs, -1)) as tf.Tensor2D;
  
  // Normalize heatmap to 0-1 range
  const normalizedHeatmap = normalizeHeatmap(heatmap);
  
  // Compute metrics
  const metrics = await computeMetrics(normalizedHeatmap);
  
  // Clean up intermediate tensors
  predictions.dispose();
  convOutputs.dispose();
  grads.dispose();
  pooledGrads.dispose();
  weightedConvOutputs.dispose();
  heatmap.dispose();
  gradModel.dispose();
  
  return {
    heatmap: normalizedHeatmap,
    metrics
  };
}

/**
 * Find the last convolutional layer in the model
 */
function getLastConvLayerName(model: tf.LayersModel): string | null {
  const layers = model.layers;
  
  // Search backwards for conv2d layer
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer.getClassName() === 'Conv2D') {
      return layer.name;
    }
  }
  
  return null;
}

/**
 * Normalize heatmap to 0-1 range
 */
function normalizeHeatmap(heatmap: tf.Tensor2D): tf.Tensor2D {
  return tf.tidy(() => {
    const min = tf.min(heatmap);
    const max = tf.max(heatmap);
    const range = tf.sub(max, min);
    
    // Avoid division by zero
    const normalizedRange = tf.where(
      tf.equal(range, 0),
      tf.ones(range.shape),
      range
    );
    
    return tf.div(tf.sub(heatmap, min), normalizedRange);
  }) as tf.Tensor2D;
}

/**
 * Compute various metrics from the heatmap
 */
async function computeMetrics(heatmap: tf.Tensor2D): Promise<{
  percentAffected: number;
  centroid: { x: number; y: number };
  lccSize: number;
  symLR: number;
  symTB: number;
}> {
  const heatmapData = await heatmap.data();
  const [height, width] = heatmap.shape;
  
  // Convert to 2D array for easier processing
  const heatmapArray: number[][] = [];
  for (let i = 0; i < height; i++) {
    heatmapArray[i] = [];
    for (let j = 0; j < width; j++) {
      heatmapArray[i][j] = heatmapData[i * width + j];
    }
  }
  
  // Threshold for considering a pixel "affected" (activation > 0.5)
  const threshold = 0.5;
  
  // Calculate percent affected
  let affectedPixels = 0;
  const totalPixels = height * width;
  
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if (heatmapArray[i][j] > threshold) {
        affectedPixels++;
      }
    }
  }
  
  const percentAffected = (affectedPixels / totalPixels) * 100;
  
  // Calculate centroid
  let sumX = 0, sumY = 0, sumIntensity = 0;
  
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const intensity = heatmapArray[i][j];
      sumX += j * intensity;
      sumY += i * intensity;
      sumIntensity += intensity;
    }
  }
  
  const centroid = {
    x: sumIntensity > 0 ? sumX / sumIntensity : width / 2,
    y: sumIntensity > 0 ? sumY / sumIntensity : height / 2
  };
  
  // Calculate largest connected component (simplified)
  const lccSize = calculateLCC(heatmapArray, threshold);
  
  // Calculate symmetry scores
  const symLR = calculateLeftRightSymmetry(heatmapArray);
  const symTB = calculateTopBottomSymmetry(heatmapArray);
  
  return {
    percentAffected,
    centroid,
    lccSize,
    symLR,
    symTB
  };
}

/**
 * Calculate largest connected component size (simplified version)
 */
function calculateLCC(heatmap: number[][], threshold: number): number {
  const height = heatmap.length;
  const width = heatmap[0].length;
  const visited = Array(height).fill(null).map(() => Array(width).fill(false));
  let maxSize = 0;
  
  const dfs = (row: number, col: number): number => {
    if (row < 0 || row >= height || col < 0 || col >= width || 
        visited[row][col] || heatmap[row][col] <= threshold) {
      return 0;
    }
    
    visited[row][col] = true;
    let size = 1;
    
    // Check 4-connected neighbors
    size += dfs(row + 1, col);
    size += dfs(row - 1, col);
    size += dfs(row, col + 1);
    size += dfs(row, col - 1);
    
    return size;
  };
  
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      if (!visited[i][j] && heatmap[i][j] > threshold) {
        const componentSize = dfs(i, j);
        maxSize = Math.max(maxSize, componentSize);
      }
    }
  }
  
  return maxSize;
}

/**
 * Calculate left-right symmetry score (0-1, where 1 is perfectly symmetric)
 */
function calculateLeftRightSymmetry(heatmap: number[][]): number {
  const height = heatmap.length;
  const width = heatmap[0].length;
  let totalDiff = 0;
  let totalIntensity = 0;
  
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < Math.floor(width / 2); j++) {
      const leftPixel = heatmap[i][j];
      const rightPixel = heatmap[i][width - 1 - j];
      
      totalDiff += Math.abs(leftPixel - rightPixel);
      totalIntensity += Math.max(leftPixel, rightPixel);
    }
  }
  
  return totalIntensity > 0 ? Math.max(0, 1 - (totalDiff / totalIntensity)) : 1;
}

/**
 * Calculate top-bottom symmetry score (0-1, where 1 is perfectly symmetric)
 */
function calculateTopBottomSymmetry(heatmap: number[][]): number {
  const height = heatmap.length;
  const width = heatmap[0].length;
  let totalDiff = 0;
  let totalIntensity = 0;
  
  for (let i = 0; i < Math.floor(height / 2); i++) {
    for (let j = 0; j < width; j++) {
      const topPixel = heatmap[i][j];
      const bottomPixel = heatmap[height - 1 - i][j];
      
      totalDiff += Math.abs(topPixel - bottomPixel);
      totalIntensity += Math.max(topPixel, bottomPixel);
    }
  }
  
  return totalIntensity > 0 ? Math.max(0, 1 - (totalDiff / totalIntensity)) : 1;
}

/**
 * Convert heatmap tensor to ImageData for canvas rendering
 */
export async function heatmapToImageData(
  heatmap: tf.Tensor2D,
  width: number,
  height: number
): Promise<ImageData> {
  // Resize heatmap to target dimensions
  const expanded = heatmap.expandDims(-1) as tf.Tensor3D;
  const resized = tf.image.resizeBilinear(expanded, [height, width]);
  const heatmapData = await resized.squeeze().data();
  
  // Create ImageData with heatmap colors
  const imageData = new ImageData(width, height);
  
  for (let i = 0; i < heatmapData.length; i++) {
    const intensity = heatmapData[i];
    const pixelIndex = i * 4;
    
    // Use a red-yellow colormap
    imageData.data[pixelIndex] = Math.floor(255 * intensity);     // Red
    imageData.data[pixelIndex + 1] = Math.floor(255 * intensity * 0.5); // Green
    imageData.data[pixelIndex + 2] = 0;                           // Blue
    imageData.data[pixelIndex + 3] = Math.floor(180 * intensity); // Alpha
  }
  
  resized.dispose();
  expanded.dispose();
  return imageData;
}

// TODO: Add support for different colormap options
// TODO: Optimize Grad-CAM computation for larger models
// TODO: Add batch processing for multiple scans
