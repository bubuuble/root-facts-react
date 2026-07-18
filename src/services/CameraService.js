import { logError, getCameraErrorMessage } from '../utils/common.js';

export class CameraService {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.config = null;
    this.fps = 30;
    this.availableCameras = [];
  }

  setVideoElement(videoElement) {
    this.video = videoElement;
  }

  setCanvasElement(canvasElement) {
    this.canvas = canvasElement;
  }

  /**
   * [Basic] Dapatkan daftar perangkat input video yang tersedia
   */
  async loadCameras() {
    try {
      // Minta izin kamera terlebih dahulu agar label perangkat muncul
      await navigator.mediaDevices.getUserMedia({ video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableCameras = devices.filter((d) => d.kind === 'videoinput');
      return this.availableCameras;
    } catch (error) {
      logError('CameraService.loadCameras', error);
      throw new Error(getCameraErrorMessage(error));
    }
  }

  /**
   * [Basic] Dapatkan constraints kamera berdasarkan konfigurasi
   */
  _buildConstraints(selectedCameraId) {
    if (selectedCameraId === 'front') {
      return {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };
    }

    if (selectedCameraId === 'default' || !selectedCameraId) {
      return {
        video: {
          facingMode: 'environment', // Kamera belakang sebagai default
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      };
    }

    // Jika parameter berupa device ID spesifik
    return {
      video: {
        deviceId: { exact: selectedCameraId },
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    };
  }

  /**
   * [Basic] Memulai kamera dengan perangkat yang dipilih
   */
  async startCamera(selectedCameraId) {
    try {
      // Hentikan stream yang sedang berjalan dulu
      this.stopCamera();

      const constraints = this._buildConstraints(selectedCameraId);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (this.video) {
        this.video.srcObject = this.stream;
        await new Promise((resolve, reject) => {
          this.video.onloadedmetadata = resolve;
          this.video.onerror = reject;
          setTimeout(reject, 5000); // timeout 5 detik
        });
        await this.video.play();
      }

      return true;
    } catch (error) {
      logError('CameraService.startCamera', error);
      throw new Error(getCameraErrorMessage(error));
    }
  }

  /**
   * [Basic] Menghentikan kamera dan membersihkan sumber daya
   */
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  /**
   * [Skilled] Mengatur FPS kamera (digunakan oleh detection loop)
   */
  setFPS(fps) {
    this.fps = Math.max(1, Math.min(60, Number(fps)));
  }

  getFPS() {
    return this.fps;
  }

  /**
   * [Basic] Ambil frame saat ini ke canvas dan kembalikan sebagai ImageData
   */
  captureFrame() {
    if (!this.isReady() || !this.canvas) return null;

    const { videoWidth, videoHeight } = this.video;
    if (!videoWidth || !videoHeight) return null;

    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;

    const ctx = this.canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0, videoWidth, videoHeight);

    return this.video; // TF.js bisa langsung dari elemen video
  }

  /**
   * [Basic] Periksa apakah kamera sedang aktif
   */
  isActive() {
    return this.stream !== null && this.stream.active;
  }

  /**
   * [Basic] Periksa apakah elemen video siap digunakan
   */
  isReady() {
    return (
      this.video !== null &&
      this.video.readyState >= HTMLVideoElement.HAVE_ENOUGH_DATA &&
      this.video.videoWidth > 0
    );
  }

  getAvailableCameras() {
    return this.availableCameras;
  }
}