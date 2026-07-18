import { TONE_CONFIG } from '../utils/config.js';
import { pipeline, env } from '@huggingface/transformers';
import { isWebGPUSupported, logError } from '../utils/common.js';

export class RootFactsService {
  constructor() {
    this.generator = null;
    this.isModelLoaded = false;
    this.isGenerating = false;
    this.config = null;
    this.currentBackend = null;
    this.currentTone = TONE_CONFIG.defaultTone;
  }

  /**
   * [Basic] Muat model dan inisialisasi pipeline text2text-generation
   * [Advance] Implementasikan strategi Backend Adaptive (WebGPU → WASM/WebGL)
   */
  async loadModel(onProgress) {
    try {
      // Konfigurasi path local/CDN
      env.allowLocalModels = false; // Mengunduh dari Hugging Face Hub (CDN)

      let device = 'wasm';
      let useWebGPU = false;
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter !== null) {
            useWebGPU = true;
          }
        } catch (e) {
          console.warn('WebGPU requestAdapter failed for generator:', e);
        }
      }

      if (useWebGPU) {
        device = 'webgpu';
        this.currentBackend = 'webgpu';
      } else {
        device = 'wasm';
        this.currentBackend = 'wasm';
      }

      if (onProgress) onProgress(10, `Inisialisasi pipeline (${this.currentBackend.toUpperCase()})...`);

      // Menggunakan model ringan Xenova/LaMini-Flan-T5-77M
      const modelName = 'Xenova/LaMini-Flan-T5-77M';

      this.generator = await pipeline('text2text-generation', modelName, {
        device: device,
        progress_callback: (data) => {
          if (data.status === 'progress') {
            const percentage = Math.round(data.progress);
            if (onProgress) {
              onProgress(percentage, `Mengunduh model AI: ${percentage}%`);
            }
          } else if (data.status === 'ready') {
            if (onProgress) {
              onProgress(100, 'Model AI Siap');
            }
          }
        }
      });

      this.isModelLoaded = true;
      return true;
    } catch (error) {
      logError('RootFactsService.loadModel', error);
      throw error;
    }
  }

  /**
   * [Advance] Konfigurasi tone fakta yang dihasilkan
   */
  setTone(tone) {
    this.currentTone = tone;
  }

  /**
   * [Basic] Lakukan prediksi pada elemen gambar yang diberikan dan kembalikan hasilnya
   * [Skilled] Konfigurasikan parameter generasi berdasarkan kebutuhan
   * [Advance] Implemenasikan parameter tone untuk mengatur nada fakta yang dihasilkan
   */
  async generateFacts(vegetableName) {
    if (!this.isReady()) {
      throw new Error('Model AI belum siap');
    }

    this.isGenerating = true;

    try {
      // Tentukan prompt sesuai nada (tone)
      let tonePrompt = '';
      switch (this.currentTone) {
      case 'funny':
        tonePrompt = `Berikan 1 fakta unik yang sangat lucu, konyol, dan menghibur tentang sayuran ${vegetableName} dalam Bahasa Indonesia secara singkat dan santai.`;
        break;
      case 'professional':
        tonePrompt = `Berikan 1 fakta edukatif, ilmiah, profesional mengenai kandungan gizi dan manfaat kesehatan dari sayuran ${vegetableName} dalam Bahasa Indonesia secara terperinci.`;
        break;
      case 'casual':
        tonePrompt = `Berikan 1 fakta santai dan seru tentang sayuran ${vegetableName} dalam Bahasa Indonesia seperti sedang mengobrol akrab dengan teman karib.`;
        break;
      case 'normal':
      default:
        tonePrompt = `Berikan 1 fakta ilmiah singkat, menarik, dan informatif tentang sayuran ${vegetableName} dalam Bahasa Indonesia.`;
        break;
      }

      // [Skilled] Parameter generasi yang optimal
      const generationConfig = {
        max_new_tokens: 150,
        temperature: 0.7,
        top_k: 50,
        top_p: 0.9,
        do_sample: true
      };

      const result = await this.generator(tonePrompt, generationConfig);

      this.isGenerating = false;
      if (result && result[0] && result[0].generated_text) {
        return result[0].generated_text.trim();
      }
      return 'Gagal menghasilkan fakta menarik.';
    } catch (error) {
      this.isGenerating = false;
      logError('RootFactsService.generateFacts', error);
      throw error;
    }
  }

  /**
   * [Basic] Periksa apakah model sudah dimuat dan siap digunakan
   */
  isReady() {
    return this.isModelLoaded && this.generator !== null;
  }

  getBackend() {
    return this.currentBackend;
  }
}
