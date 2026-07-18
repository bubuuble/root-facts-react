import { useRef, useState, useEffect } from 'react';
import Header from './components/Header';
import CameraSection from './components/CameraSection';
import InfoPanel from './components/InfoPanel';
import { useAppState } from './hooks/useAppState';
import { DetectionService } from './services/DetectionService';
import { CameraService } from './services/CameraService';
import { RootFactsService } from './services/RootFactsService';
import { APP_CONFIG } from './utils/config';

function App() {
  const { state, actions } = useAppState();
  const detectionCleanupRef = useRef(null);
  const isRunningRef = useRef(false);
  const [currentTone, setCurrentTone] = useState('normal');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // References to instantiated services
  const detectorRef = useRef(null);
  const cameraRef = useRef(null);
  const generatorRef = useRef(null);

  // Debounce/Stabilization refs for detection
  const consecutiveCountRef = useRef(0);
  const lastClassRef = useRef(null);
  const lastGeneratedClassRef = useRef(null);
  const isGeneratingRef = useRef(false);

  // TODO [Basic] Inisialisasi layanan deteksi, kamera, dan generator fakta saat aplikasi dimuat
  useEffect(() => {
    let active = true;

    const initServices = async () => {
      try {
        const detector = new DetectionService();
        const camera = new CameraService();
        const generator = new RootFactsService();

        detectorRef.current = detector;
        cameraRef.current = camera;
        generatorRef.current = generator;

        if (active) {
          actions.setServices({ detector, camera, generator });
        }

        // Muat model deteksi (0% - 30% progress)
        if (active) actions.setModelStatus('Memuat Model Deteksi...');
        await detector.loadModel((progress, msg) => {
          if (active) {
            const mappedProgress = Math.round(progress * 0.3);
            setLoadingProgress((prev) => Math.max(prev, mappedProgress));
            actions.setModelStatus(`Deteksi: ${progress}% (${msg})`);
          }
        });

        // Muat model generator fakta (30% - 100% progress)
        if (active) actions.setModelStatus('Memuat Model Generator Fakta...');
        await generator.loadModel((progress, msg) => {
          if (active) {
            const mappedProgress = 30 + Math.round(progress * 0.7);
            setLoadingProgress((prev) => Math.max(prev, mappedProgress));
            actions.setModelStatus(`Generator: ${progress}% (${msg})`);
          }
        });

        // Muat daftar kamera yang tersedia
        await camera.loadCameras();

        if (active) {
          setLoadingProgress(100);
          actions.setModelStatus('Model AI Siap');

          // Aktifkan kamera dan loop deteksi secara otomatis
          try {
            await camera.startCamera('default');
            isRunningRef.current = true;
            actions.setRunning(true);
            actions.setAppState('idle');
            actions.setFunFactData('waiting'); // Tampilkan pesan panduan awal
            startDetectionLoop();
          } catch (camErr) {
            console.warn('Auto start camera failed:', camErr);
            actions.setError('Kamera tidak dapat dimulai secara otomatis. Harap izinkan akses kamera.');
          }
        }
      } catch (err) {
        if (active) {
          actions.setError(err.message || 'Gagal menginisialisasi layanan.');
          actions.setModelStatus('Inisialisasi Gagal');
        }
      }
    };

    initServices();

    // TODO [Basic] Bersihkan sumber daya saat komponen ditinggalkan
    return () => {
      active = false;
      isRunningRef.current = false;
      if (detectionCleanupRef.current) {
        cancelAnimationFrame(detectionCleanupRef.current);
      }
      if (cameraRef.current) {
        cameraRef.current.stopCamera();
      }
      if (detectorRef.current) {
        detectorRef.current.dispose();
      }
    };
  }, []);

  // Hentikan kamera dan loop deteksi
  const stopCameraAndDetection = () => {
    isRunningRef.current = false;
    actions.setRunning(false);

    if (detectionCleanupRef.current) {
      cancelAnimationFrame(detectionCleanupRef.current);
      detectionCleanupRef.current = null;
    }

    if (cameraRef.current) {
      cameraRef.current.stopCamera();
    }

    consecutiveCountRef.current = 0;
    lastClassRef.current = null;
    lastGeneratedClassRef.current = null;
    isGeneratingRef.current = false;
    actions.resetResults();
  };

  // TODO [Basic] Fungsi untuk memulai loop deteksi
  const startDetectionLoop = () => {
    if (!isRunningRef.current) return;

    let lastFrameTime = 0;
    const startTime = performance.now();
    const WARMUP_DELAY = 1500; // 1.5 detik warmup agar hardware kamera siap dan tidak hitam

    const runLoop = async (timestamp) => {
      if (!isRunningRef.current) return;

      // Berikan jeda pemanasan agar frame tidak dibaca saat masih hitam/loading
      if (timestamp - startTime < WARMUP_DELAY) {
        detectionCleanupRef.current = requestAnimationFrame(runLoop);
        return;
      }

      const camera = cameraRef.current;
      const detector = detectorRef.current;
      const generator = generatorRef.current;

      if (camera && detector && generator && camera.isReady()) {
        const fps = camera.getFPS();
        const interval = 1000 / fps;
        const elapsed = timestamp - lastFrameTime;

        if (elapsed >= interval) {
          lastFrameTime = timestamp;

          // Ambil frame dan lakukan prediksi
          const videoElement = camera.captureFrame();
          if (videoElement) {
            const prediction = await detector.predict(videoElement);

            if (prediction) {
              // SELALU perbarui hasil deteksi di UI (real-time name & confidence bar)
              actions.setAppState('result');
              actions.setDetectionResult(prediction);

              // Threshold confidence (50% agar lebih responsif)
              const CONFIDENCE_THRESHOLD = 0.50;

              // Jika prediksi valid di atas threshold confidence
              if (prediction.score >= CONFIDENCE_THRESHOLD) {
                if (prediction.className === lastClassRef.current) {
                  consecutiveCountRef.current += 1;
                } else {
                  lastClassRef.current = prediction.className;
                  consecutiveCountRef.current = 1;
                }

                // Trigger setelah 5 frame stabil (~0.15-0.3 detik tergantung FPS)
                if (consecutiveCountRef.current >= 5) {
                  // Jika mendeteksi sayuran yang BERBEDA dan tidak sedang memproses, buat fakta baru
                  if (prediction.className !== lastGeneratedClassRef.current && !isGeneratingRef.current) {
                    lastGeneratedClassRef.current = prediction.className;
                    isGeneratingRef.current = true;
                    actions.setFunFactData(null); // Tampilkan spinner loading fakta menarik

                    // Generate fakta di background tanpa menghentikan kamera
                    (async () => {
                      try {
                        const fact = await generator.generateFacts(prediction.className);
                        actions.setFunFactData(fact);
                      } catch (err) {
                        actions.setFunFactData('error');
                        console.warn('Gagal memuat fakta:', err.message);
                      } finally {
                        isGeneratingRef.current = false;
                      }
                    })();
                  }
                }
              } else {
                // Perlahan kurangi counter jika sayuran hilang agar transisi smooth
                consecutiveCountRef.current = Math.max(0, consecutiveCountRef.current - 1);

                // Jika belum ada fakta yang pernah dibuat dan tidak sedang memproses, tunjukkan status waiting
                if (!isGeneratingRef.current && !lastGeneratedClassRef.current) {
                  actions.setFunFactData('waiting');
                }
              }
            }
          }
        }
      }

      detectionCleanupRef.current = requestAnimationFrame(runLoop);
    };

    detectionCleanupRef.current = requestAnimationFrame(runLoop);
  };

  // TODO [Basic] Fungsi untuk memulai dan menghentikan kamera
  const handleToggleCamera = async () => {
    const camera = cameraRef.current;
    if (!camera) return;

    if (state.isRunning) {
      stopCameraAndDetection();
    } else {
      try {
        actions.setError(null);
        actions.resetResults();
        actions.setFunFactData('waiting'); // Reset ke waiting state
        lastGeneratedClassRef.current = null;
        lastClassRef.current = null;
        consecutiveCountRef.current = 0;
        isGeneratingRef.current = false;

        const cameraSelect = document.getElementById('camera-select');
        const selectedId = cameraSelect ? cameraSelect.value : 'default';

        await camera.startCamera(selectedId);

        isRunningRef.current = true;
        actions.setRunning(true);
        actions.setAppState('idle');

        startDetectionLoop();
      } catch (err) {
        actions.setError(err.message || 'Gagal mengaktifkan kamera.');
        stopCameraAndDetection();
      }
    }
  };

  // TODO [Advance] Fungsi untuk mengubah nada fakta yang dihasilkan
  const handleToneChange = (tone) => {
    setCurrentTone(tone);
    if (generatorRef.current) {
      generatorRef.current.setTone(tone);
    }
  };

  // TODO [Skilled] Fungsi untuk menyalin fakta ke clipboard
  const handleCopyFact = async () => {
    if (state.funFactData && state.funFactData !== 'error') {
      try {
        await navigator.clipboard.writeText(state.funFactData);
        alert('Fakta menarik berhasil disalin ke clipboard!');
      } catch (err) {
        actions.setError('Gagal menyalin ke clipboard.');
      }
    }
  };

  return (
    <div className="app-container">
      <Header modelStatus={state.modelStatus} loadingProgress={loadingProgress} />

      <main className="main-content">
        <CameraSection
          isRunning={state.isRunning}
          onToggleCamera={handleToggleCamera}
          onToneChange={handleToneChange}
          services={state.services}
          modelStatus={state.modelStatus}
          error={state.error}
          currentTone={currentTone}
        />

        <InfoPanel
          appState={state.appState}
          detectionResult={state.detectionResult}
          funFactData={state.funFactData}
          error={state.error}
          onCopyFact={handleCopyFact}
        />
      </main>

      <footer className="footer">
        <p>Powered by TensorFlow.js & Transformers.js</p>
      </footer>

      {state.error && (
        <div style={{
          position: 'fixed',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '380px',
          padding: '0.875rem 1rem',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-md)',
          color: '#991b1b',
          fontSize: '0.8125rem',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000
        }}>
          <strong>Error:</strong> {state.error}
          <button
            onClick={() => actions.setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#991b1b',
              padding: 0,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
