import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import { isWebGPUSupported, logError, validateModelMetadata } from '../utils/common.js';

export class DetectionService {
  constructor() {
    this.model = null;
    this.labels = [];
    this.config = null;
    this.currentBackend = null;
  }

  /**
   * [Basic] Muat model dan metadata secara bersamaan, lalu simpan ke instance
   * [Advance] Implementasikan strategi Backend Adaptive (WebGPU → WebGL)
   */
  async loadModel(onProgress) {
    try {
      // [Advance] Backend Adaptive: coba WebGPU dahulu dengan verifikasi GPU Adapter
      let useWebGPU = false;
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter !== null) {
            useWebGPU = true;
          }
        } catch (e) {
          console.warn('WebGPU requestAdapter failed, falling back:', e);
        }
      }

      if (useWebGPU) {
        try {
          await tf.setBackend('webgpu');
          await tf.ready();
          this.currentBackend = 'webgpu';
        } catch (err) {
          console.warn('WebGPU setBackend failed, falling back to WebGL:', err);
          try {
            await tf.setBackend('webgl');
            await tf.ready();
            this.currentBackend = 'webgl';
          } catch (webglErr) {
            console.warn('WebGL failed, falling back to CPU:', webglErr);
            await tf.setBackend('cpu');
            await tf.ready();
            this.currentBackend = 'cpu';
          }
        }
      } else {
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          this.currentBackend = 'webgl';
        } catch (webglErr) {
          console.warn('WebGL failed, falling back to CPU:', webglErr);
          await tf.setBackend('cpu');
          await tf.ready();
          this.currentBackend = 'cpu';
        }
      }

      if (onProgress) onProgress(20, `Backend: ${this.currentBackend.toUpperCase()}`);

      // Muat metadata dan model secara paralel
      const [metadataRes] = await Promise.all([
        fetch('/model/metadata.json'),
      ]);

      if (onProgress) onProgress(40, 'Memuat metadata...');

      const metadata = await metadataRes.json();
      if (!validateModelMetadata(metadata)) {
        throw new Error('Metadata model tidak valid');
      }
      this.labels = metadata.labels;

      if (onProgress) onProgress(60, 'Memuat model TF.js...');

      // Muat model TF.js LayersModel
      this.model = await tf.loadLayersModel('/model/model.json');

      if (onProgress) onProgress(80, 'Warming up model...');

      // Warm-up: jalankan dummy inference agar JIT compilation selesai
      tf.tidy(() => {
        const dummyInput = tf.zeros([1, 224, 224, 3]);
        this.model.predict(dummyInput);
      });

      if (onProgress) onProgress(100, 'Model siap');

      return true;
    } catch (error) {
      logError('DetectionService.loadModel', error);
      throw error;
    }
  }

  /**
   * [Basic] Lakukan prediksi pada elemen gambar yang diberikan
   * [Advance] Memory management dengan tf.tidy() dan dispose
   */
  async predict(imageElement) {
    if (!this.isLoaded()) return null;

    let inputTensor = null;
    const predictions = null;

    try {
      // [Advance] tf.tidy untuk memory management otomatis
      const predictionData = tf.tidy(() => {
        const img = tf.browser.fromPixels(imageElement);
        const [height, width] = img.shape;

        // Ambil area kotak tengah (center crop) agar aspect ratio terjaga (tidak gepeng)
        const size = Math.min(height, width);
        const startX = Math.round((width - size) / 2);
        const startY = Math.round((height - size) / 2);

        const cropped = img.slice([startY, startX, 0], [size, size, 3]);

        // Preprocess: resize ke 224x224, normalize ke [-1, 1] dengan pembagi 127.5
        inputTensor = tf.image.resizeBilinear(cropped, [224, 224])
          .expandDims(0)
          .toFloat()
          .div(tf.scalar(127.5))
          .sub(tf.scalar(1.0));

        return this.model.predict(inputTensor);
      });

      // Ambil data dari tensor (di luar tidy agar bisa await)
      const data = await predictionData.data();
      predictionData.dispose();

      // Cari prediksi dengan confidence tertinggi
      let maxIndex = 0;
      let maxScore = 0;

      for (let i = 0; i < data.length; i++) {
        if (data[i] > maxScore) {
          maxScore = data[i];
          maxIndex = i;
        }
      }

      return {
        className: this.labels[maxIndex],
        score: maxScore,
        isValid: true,
        allPredictions: Array.from(data).map((score, i) => ({
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
   * [Basic] Periksa apakah model sudah dimuat dan siap digunakan
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
