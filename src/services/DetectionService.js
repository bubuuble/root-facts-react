import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import { logError, validateModelMetadata } from '../utils/common.js';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
    this.currentBackend = null;
  }

  /**
   * Load model dengan adaptive backend strategy (WebGPU → WebGL → CPU)
   */
  async loadModel(onProgress) {
    try {
      // Backend Adaptive: coba WebGPU → WebGL → CPU
      let backendSet = false;

      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter !== null) {
            await tf.setBackend('webgpu');
            await tf.ready();
            this.currentBackend = 'webgpu';
            backendSet = true;
          }
        } catch (e) {
          console.warn('WebGPU gagal, mencoba WebGL:', e.message);
        }
      }

      if (!backendSet) {
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          this.currentBackend = 'webgl';
          backendSet = true;
        } catch (webglErr) {
          console.warn('WebGL gagal, menggunakan CPU:', webglErr.message);
          await tf.setBackend('cpu');
          await tf.ready();
          this.currentBackend = 'cpu';
        }
      }

      if (onProgress) onProgress(20, `Backend: ${this.currentBackend.toUpperCase()}`);

      // Muat metadata model
      const metadataRes = await fetch('/model/metadata.json');
      if (!metadataRes.ok) throw new Error('Metadata model tidak ditemukan');

      if (onProgress) onProgress(40, 'Memuat metadata...');

      const metadata = await metadataRes.json();
      if (!validateModelMetadata(metadata)) {
        throw new Error('Metadata model tidak valid');
      }
      this.labels = metadata.labels;
      this.imageSize = metadata.imageSize || 224;

      if (onProgress) onProgress(60, 'Memuat model TF.js...');

      // Muat model TF.js LayersModel
      this.model = await tf.loadLayersModel('/model/model.json');

      if (onProgress) onProgress(85, 'Warming up model...');

      // Warm-up inference agar JIT compilation selesai
      const warmupResult = tf.tidy(() => {
        const dummyInput = tf.zeros([1, this.imageSize, this.imageSize, 3]);
        return this.model.predict(dummyInput);
      });
      warmupResult.dispose();

      if (onProgress) onProgress(100, 'Model siap');

      return true;
    } catch (error) {
      logError('DetectionService.loadModel', error);
      throw error;
    }
  }

  /**
   * Prediksi gambar menggunakan model Teachable Machine (MobileNetV2)
   * Preprocessing: resize → center crop → normalize [0, 1]
   */
  async predict(imageElement) {
    if (!this.isLoaded()) return null;

    try {
      const imageSize = this.imageSize || 224;

      // tf.tidy untuk memory management otomatis
      const predictionTensor = tf.tidy(() => {
        // Ambil pixel dari video/image element
        const img = tf.browser.fromPixels(imageElement);
        const [height, width] = img.shape;

        // Center crop: ambil area kotak tengah agar aspect ratio terjaga
        const size = Math.min(height, width);
        const startX = Math.floor((width - size) / 2);
        const startY = Math.floor((height - size) / 2);

        const cropped = img.slice([startY, startX, 0], [size, size, 3]);

        // Resize ke ukuran model (224x224 untuk Teachable Machine)
        const resized = tf.image.resizeBilinear(cropped, [imageSize, imageSize]);

        // Normalize ke [0, 1] — ini yang benar untuk Teachable Machine MobileNetV2
        // Teachable Machine menggunakan preprocessing: pixel / 255.0
        const normalized = resized.toFloat().div(tf.scalar(255.0));

        // Add batch dimension [1, H, W, C]
        return normalized.expandDims(0);
      });

      // Jalankan prediksi di luar tidy agar bisa async
      const outputTensor = this.model.predict(predictionTensor);
      predictionTensor.dispose();

      // Ambil data scores
      const rawData = await outputTensor.data();
      outputTensor.dispose();

      // Apply softmax secara manual untuk memastikan probability distribution valid
      const scores = this._softmax(Array.from(rawData));

      // Cari prediksi tertinggi
      let maxIndex = 0;
      let maxScore = 0;

      for (let i = 0; i < scores.length; i++) {
        if (scores[i] > maxScore) {
          maxScore = scores[i];
          maxIndex = i;
        }
      }

      return {
        className: this.labels[maxIndex],
        score: maxScore,
        isValid: true,
        allPredictions: scores.map((score, i) => ({
          className: this.labels[i],
          score,
        })),
      };
    } catch (error) {
      logError('DetectionService.predict', error);
      return null;
    }
  }

  /**
   * Softmax function untuk memastikan output berupa probability distribution
   */
  _softmax(arr) {
    const max = Math.max(...arr);
    const exps = arr.map(x => Math.exp(x - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(x => x / sum);
  }

  /**
   * Periksa apakah model sudah dimuat dan siap
   */
  isLoaded() {
    return this.model !== null && this.labels.length > 0;
  }

  /**
   * Bersihkan resource TF.js
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
  }

  getBackend() {
    return this.currentBackend;
  }
}
