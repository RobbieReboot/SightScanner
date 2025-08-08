# Model Directory

This directory should contain a TensorFlow.js model for sight analysis classification.

## Required Files:
- `model.json` - Model architecture and metadata
- `model_weights.bin` - Model weights in binary format (or numbered weight files)

## Model Requirements:
- Input shape: `[batch_size, height, width, 1]` (grayscale grid data)
- Output: Classification probabilities
- Should contain at least one Conv2D layer for Grad-CAM analysis

## To Add a Real Model:
1. Train a model using TensorFlow/Keras
2. Convert to TensorFlow.js format using `tensorflowjs_converter`
3. Place the generated files in this directory

## Placeholder:
Currently this directory contains placeholder files for development.
Replace with actual trained model for production use.
