import * as tf from '@tensorflow/tfjs';

/**
 * Load a TensorFlow.js model from the public/models directory
 * @param modelName - Name of the model directory
 * @returns Promise<tf.LayersModel>
 */
export async function loadModel(modelName: string): Promise<tf.LayersModel> {
  try {
    const path = `/models/${modelName}/model.json`;
    console.log(`Loading model from: ${path}`);
    const model = await tf.loadLayersModel(path);
    console.log(`Model ${modelName} loaded successfully`);
    return model;
  } catch (error) {
    console.error(`Failed to load model ${modelName}:`, error);
    throw new Error(`Failed to load model ${modelName}: ${error}`);
  }
}

/**
 * Convert scan grid data to a tensor format suitable for model inference
 * @param scanData - Boolean grid data from scan
 * @param gridHeight - Height of the grid
 * @param gridWidth - Width of the grid
 * @returns tf.Tensor4D with shape [1, gridHeight, gridWidth, 1]
 */
export function convertScanDataToTensor(
  scanData: boolean[][],
  gridHeight: number,
  gridWidth: number
): tf.Tensor4D {
  // Convert boolean array to float32 array
  const flatData = new Float32Array(gridHeight * gridWidth);
  let index = 0;
  
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      flatData[index] = scanData[row] && scanData[row][col] ? 1.0 : 0.0;
      index++;
    }
  }
  
  // Create tensor with shape [1, height, width, 1] for model input
  return tf.tensor4d(flatData, [1, gridHeight, gridWidth, 1]);
}

/**
 * Preprocess scan data for model input
 * @param scanData - Raw scan data from Supabase
 * @returns Processed tensor and metadata
 */
export function preprocessScanData(scanData: any) {
  // Extract grid data from scan data structure
  const { gridData, screenDimensions, settings } = scanData;
  
  // Determine grid dimensions
  const gridSize = settings?.gridSize || 20;
  const cols = Math.floor(screenDimensions.width / gridSize);
  const rows = Math.floor(screenDimensions.height / gridSize);
  
  // Convert trails to boolean grid if needed
  let booleanGrid: boolean[][];
  
  if (scanData.gridData && Array.isArray(scanData.gridData) && scanData.gridData.length > 0) {
    // Use existing boolean grid data
    booleanGrid = scanData.gridData;
  } else if (scanData.trails) {
    // Convert trail data to boolean grid
    booleanGrid = Array(rows).fill(null).map(() => Array(cols).fill(false));
    
    scanData.trails.forEach((trail: Array<{x: number, y: number}>) => {
      trail.forEach(point => {
        const gridX = Math.floor(point.x / gridSize);
        const gridY = Math.floor(point.y / gridSize);
        if (gridX >= 0 && gridX < cols && gridY >= 0 && gridY < rows) {
          booleanGrid[gridY][gridX] = true;
        }
      });
    });
  } else {
    // Create empty grid
    booleanGrid = Array(rows).fill(null).map(() => Array(cols).fill(false));
  }
  
  const tensor = convertScanDataToTensor(booleanGrid, rows, cols);
  
  return {
    tensor,
    gridDimensions: { rows, cols },
    gridSize,
    booleanGrid
  };
}

/**
 * Dispose of tensors to prevent memory leaks
 * @param tensors - Array of tensors to dispose
 */
export function disposeTensors(...tensors: (tf.Tensor | undefined)[]): void {
  tensors.forEach(tensor => {
    if (tensor) {
      tensor.dispose();
    }
  });
}

// TODO: Add web worker support for model loading and inference
// TODO: Add model caching to avoid reloading
// TODO: Add batch processing support for multiple scans
