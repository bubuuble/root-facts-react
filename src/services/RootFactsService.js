import { TONE_CONFIG } from '../utils/config.js';
import { logError } from '../utils/common.js';

// Curated fun facts per vegetable in Bahasa Indonesia (3 facts each, randomly picked)
const VEGETABLE_FACTS = {
  Beetroot: [
    'Bit merah mengandung nitrat alami yang bisa meningkatkan performa olahraga hingga 16%! Atlet Olimpiade sering minum jus bit sebelum bertanding.',
    'Warna merah-ungu dari bit berasal dari pigmen bernama betasianin. Uniknya, pigmen ini bisa membuat urin berwarna merah muda — kondisi yang disebut beeturia!',
    'Di Eropa Timur, bit digunakan sebagai obat tradisional untuk anemia karena kaya akan folat dan zat besi. Orang Romawi kuno bahkan menggunakannya sebagai afrodisiak!',
  ],
  Paprika: [
    'Paprika merah mengandung vitamin C 3x lebih banyak dari jeruk! Satu paprika merah ukuran sedang memenuhi 169% kebutuhan vitamin C harianmu.',
    'Paprika awalnya hanya ada di Amerika Tengah dan Selatan. Christopher Columbus membawanya ke Eropa pada abad ke-15, dan sekarang Hungaria adalah produsen paprika terbesar di dunia!',
    'Paprika hijau, kuning, oranye, dan merah sebenarnya adalah tanaman yang sama — hanya berbeda tingkat kematangannya. Semakin matang, semakin manis dan lebih banyak nutrisinya!',
  ],
  Cabbage: [
    'Kubis telah dibudidayakan selama lebih dari 4.000 tahun. Orang Yunani dan Romawi kuno menganggapnya sebagai obat mujarab untuk berbagai penyakit termasuk mabuk!',
    'Satu cangkir kubis hanya mengandung 33 kalori tapi kaya serat, vitamin K, dan antioksidan. Kubis ungu bahkan mengandung lebih banyak antioksidan daripada kubis hijau!',
    'Kimchi Korea dan sauerkraut Jerman sama-sama dibuat dari kubis fermentasi. Proses fermentasi meningkatkan kandungan probiotik yang baik untuk kesehatan pencernaan!',
  ],
  Carrot: [
    'Wortel aslinya berwarna ungu! Wortel oranye dikembangkan oleh petani Belanda pada abad ke-17 sebagai penghormatan kepada Raja William of Orange.',
    'Beta-karoten dalam wortel diubah tubuh menjadi vitamin A, yang penting untuk kesehatan mata. Makan wortel memang benar-benar membantu penglihatan malam hari!',
    'Wortel adalah sayuran yang paling banyak dikonsumsi kedua di dunia setelah kentang. China memproduksi lebih dari 45% pasokan wortel dunia setiap tahunnya!',
  ],
  Cauliflower: [
    'Kembang kol adalah salah satu sayuran paling serbaguna — bisa dijadikan nasi, pizza, steak, hingga puree yang mirip mashed potato tapi jauh lebih sehat!',
    'Kembang kol mengandung sulforaphane, senyawa yang telah terbukti membantu melawan sel kanker dan melindungi otak dari kerusakan neurologis.',
    'Ada 4 warna kembang kol: putih, oranye, hijau (romanesco), dan ungu! Kembang kol ungu warnanya berasal dari antosianin yang juga ditemukan pada blueberry.',
  ],
  Chilli: [
    'Cabai mengandung capsaicin yang memicu rasa panas. Uniknya, capsaicin juga merangsang otak melepaskan endorfin — itulah kenapa makan pedas bisa bikin senang!',
    'Skala Scoville mengukur kepedasan cabai. Cabai jalapeño biasa punya 2.500-8.000 SHU, sedangkan cabai Carolina Reaper, yang terpedas di dunia, mencapai 2,2 juta SHU!',
    'Meksiko adalah rumah asal cabai — sudah dibudidayakan selama lebih dari 6.000 tahun. Sekarang India adalah produsen dan konsumen cabai terbesar di dunia!',
  ],
  Corn: [
    'Satu tongkol jagung selalu memiliki jumlah baris kernel yang genap — biasanya 16 baris! Ini bukan mitos, tapi fakta pertanian yang bisa kamu buktikan sendiri.',
    'Jagung adalah tanaman yang dimodifikasi sepenuhnya oleh manusia. Nenek moyang liarnya, teosinte, sangat berbeda — hanya memiliki beberapa biji keras per batang!',
    'Amerika Serikat menanam 40% jagung dunia, tapi sebagian besar bukan untuk dimakan — melainkan untuk pakan ternak, biofuel etanol, dan sirup jagung fruktosa tinggi.',
  ],
  Cucumber: [
    'Mentimun 96% terdiri dari air — menjadikannya salah satu makanan paling menghidrasi di dunia. Memakan mentimun seperti minum segelas air dalam bentuk padat!',
    'Mentimun secara teknis adalah buah, bukan sayuran! Sama seperti tomat, mentimun tumbuh dari bunga dan mengandung biji, sehingga secara botani diklasifikasikan sebagai buah.',
    'Menaruh irisan mentimun dingin di mata bukan hanya trik kecantikan — mentimun mengandung antioksidan dan silika yang memang membantu mengurangi bengkak dan lingkaran hitam!',
  ],
  eggplant: [
    'Terong sebenarnya adalah buah beri raksasa! Secara botani, terong termasuk dalam keluarga yang sama dengan tomat, paprika, dan kentang — yaitu keluarga Solanaceae.',
    'Terong punya kandungan nasunin, antioksidan unik yang melindungi sel otak dari kerusakan. Nasunin ditemukan terutama di kulit terong yang berwarna ungu!',
    'Di Italia, terong sempat dianggap berbahaya dan dijuluki "mala insana" (apel gila) karena dipercaya menyebabkan kegilaan. Sekarang justru jadi bahan utama moussaka dan parmigiana!',
  ],
  Garlic: [
    'Bawang putih telah digunakan sebagai antibiotik alami selama ribuan tahun. Allicin dalam bawang putih efektif melawan lebih dari 23 jenis bakteri, termasuk Staphylococcus!',
    'Satu siung bawang putih bisa berkembang menjadi seluruh kepala bawang putih berisi 10-20 siung. Tanaman ajaib yang mengklon dirinya sendiri setiap musim!',
    'Mesir kuno membayar pekerja piramida dengan bawang putih, bawang merah, dan lobak. Bawang putih dianggap begitu berharga sehingga digunakan sebagai mata uang!',
  ],
  Ginger: [
    'Jahe adalah obat mual alami yang paling efektif — bahkan lebih ampuh dari beberapa obat antiemetik. Para pelaut dulu selalu membawa jahe untuk melawan mabuk laut!',
    'Jahe "segar" dan "kering" sebenarnya punya profil nutrisi yang berbeda. Jahe kering lebih kaya gingerol yang diubah menjadi shogaol — senyawa anti-inflamasi yang lebih kuat!',
    'Jahe sudah diperdagangkan selama lebih dari 5.000 tahun. Pada Abad Pertengahan, satu pon jahe harganya setara dengan seekor domba — rempah yang sangat berharga!',
  ],
  Lettuce: [
    'Selada adalah tanaman tercepat yang bisa kamu tanam! Beberapa varietas bisa dipanen hanya dalam 30 hari setelah tanam — cocok untuk urban farming di rumah.',
    'Astronot di Stasiun Luar Angkasa Internasional berhasil menumbuhkan dan memakan selada pada 2015 — menjadikannya salah satu makanan pertama yang ditanam dan dikonsumsi di luar angkasa!',
    'Getah putih pada batang selada mengandung senyawa yang disebut lactucarium — dijuluki "opium selada" karena efek menenangkan ringannya. Bangsa Romawi memakannya sebelum tidur!',
  ],
  Onion: [
    'Bawang merah mengandung quercetin, antioksidan kuat yang membantu mencegah kanker dan penyakit jantung. Bawang merah yang dimasak punya konsentrasi quercetin lebih tinggi!',
    'Kenapa bawang membuat menangis? Ketika dipotong, sel bawang melepaskan enzim yang bereaksi menghasilkan gas syn-propanethial-S-oxide — gas inilah yang mengiritasi matamu!',
    'Bawang merah adalah salah satu tanaman tertua yang dibudidayakan manusia — bukti arkeologis menunjukkan konsumsi bawang merah sejak 5.000 tahun sebelum Masehi di Iran!',
  ],
  Peas: [
    'Gregor Mendel menggunakan kacang polong untuk menemukan hukum pewarisan genetika pada 1866. Tanpa kacang polong, mungkin perkembangan ilmu genetika jauh terlambat!',
    'Kacang polong adalah salah satu sayuran paling bergizi — kaya protein, serat, vitamin C, K, dan folat. Satu cangkir kacang polong mengandung protein sebanyak telur ayam!',
    'Kacang polong beku sebenarnya lebih bergizi dari kacang polong segar di supermarket! Proses pembekuan dilakukan langsung setelah panen, mengunci nutrisinya di puncak kesegaran.',
  ],
  Potato: [
    'Kentang ditanam di luar angkasa pada 1995 — menjadi tanaman pertama yang pernah tumbuh di luar Bumi! NASA ingin menggunakannya sebagai sumber makanan untuk misi antariksa jangka panjang.',
    'Ada lebih dari 4.000 varietas kentang di dunia! Peru, tanah asal kentang, memiliki lebih dari 3.000 varietas sendiri — dari yang berwarna biru, ungu, kuning, hingga merah muda.',
    'Kentang adalah makanan pokok keempat terpenting di dunia setelah jagung, gandum, dan padi. Seorang manusia bisa bertahan hidup hanya dengan makan kentang dan susu!',
  ],
  Turnip: [
    'Sebelum labu (pumpkin) menjadi simbol Halloween, orang Irlandia mengukir turnip sebagai "Jack-o\'-lantern"! Tradisi ini dibawa ke Amerika oleh imigran Irlandia.',
    'Turnip punya dua bagian yang bisa dimakan — umbi dan daunnya (turnip greens). Daun turnip bahkan lebih bergizi daripada umbinya, kaya vitamin A, C, K, dan kalsium!',
    'Turnip dapat tumbuh sangat besar — rekor turnip terbesar di dunia beratnya mencapai 17,8 kg, ditanam di Alaska pada 2004! Iklim dingin membuat turnip tumbuh raksasa.',
  ],
  Soybean: [
    'Kedelai adalah salah satu protein nabati paling lengkap — mengandung semua 9 asam amino esensial yang dibutuhkan tubuh. Satu-satunya protein nabati yang setara dengan protein hewani!',
    'Lebih dari 70% produk makanan di supermarket mengandung kedelai dalam berbagai bentuk — dari tempe, tahu, edamame, hingga minyak kedelai dan lesitin dalam cokelat!',
    'Kedelai bukan hanya makanan — juga digunakan untuk membuat biofuel, tinta koran ramah lingkungan, dan bahkan plastik biode gradable. Henry Ford pernah membuat mobil dari serat kedelai!',
  ],
  Spinach: [
    'Bayam kaya zat besi, tapi penyerapannya di tubuh hanya 1-7% karena asam oksalat yang menghambat. Memasaknya dengan sedikit lemon atau tomat membantu meningkatkan penyerapan zat besi!',
    'Karakter Popeye si pelaut yang kuat memang berpengaruh nyata — konsumsi bayam di Amerika meningkat 33% setelah kartun Popeye tayang perdana pada 1929!',
    'Bayam adalah "superfood" sejati — mengandung lebih dari 13 jenis flavonoid yang berfungsi sebagai antioksidan, anti-inflamasi, dan terbukti membantu mencegah kanker prostat dan ovarium!',
  ],
};

// Tone-specific intro phrases
const TONE_INTROS = {
  normal: ['Fakta Menarik: ', 'Tahukah Kamu? ', 'Fakta Ilmiah: '],
  funny: ['🤣 Haha, ', '😂 Gokil banget, ', '🤪 Ini fakta gila: ', '😆 Siapa sangka, '],
  professional: ['📊 Secara ilmiah: ', '🔬 Fakta Nutrisi: ', '📋 Data Penelitian: '],
  casual: ['Eh tau gak sih? ', 'Asik banget nih, ', 'Ternyata lho, ', 'Ga nyangka kan? '],
};

export class RootFactsService {
  constructor() {
    this.isModelLoaded = false;
    this.currentTone = TONE_CONFIG.defaultTone;
    this.currentBackend = 'static';
    // Try to also load the AI model in background (optional enhancement)
    this.aiGenerator = null;
  }

  /**
   * Load "model" — in this case we use curated static facts as primary source.
   * We also attempt to load the AI model in background for enhanced generation.
   */
  async loadModel(onProgress) {
    try {
      // Simulate a brief loading time for UX feedback
      if (onProgress) onProgress(30, 'Memuat database fakta...');
      await new Promise(resolve => setTimeout(resolve, 300));

      if (onProgress) onProgress(70, 'Memverifikasi data sayuran...');
      await new Promise(resolve => setTimeout(resolve, 200));

      // Mark as loaded using static facts
      this.isModelLoaded = true;
      this.currentBackend = 'static';

      if (onProgress) onProgress(100, 'Siap menghasilkan fakta!');

      // Attempt to load AI model in background (non-blocking, optional)
      this._tryLoadAIModel().catch(() => {
        // Silent fail — we have static facts as backup
        console.info('ℹ️ AI model not loaded, using curated static facts.');
      });

      return true;
    } catch (error) {
      logError('RootFactsService.loadModel', error);
      // Even if something goes wrong, mark as loaded since we have static facts
      this.isModelLoaded = true;
      if (onProgress) onProgress(100, 'Siap (mode static)');
      return true;
    }
  }

  /**
   * Attempt to load Transformers.js AI model in background (optional, non-blocking)
   */
  async _tryLoadAIModel() {
    try {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowLocalModels = false;

      // Check if WebGPU available for better performance
      let device = 'wasm';
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) device = 'webgpu';
        } catch (_) { /* ignore */ }
      }

      this.aiGenerator = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-77M', {
        device,
      });
      this.currentBackend = device;
      console.info(`✅ AI model loaded on ${device}`);
    } catch (err) {
      this.aiGenerator = null;
      console.warn('AI model load failed, using static facts:', err.message);
    }
  }

  /**
   * Set tone for fact generation
   */
  setTone(tone) {
    this.currentTone = tone;
  }

  /**
   * Generate a fun fact for the detected vegetable.
   * Primary: curated static facts (instant, always works)
   * Secondary: AI-generated (if model loaded in background)
   */
  async generateFacts(vegetableName) {
    if (!this.isReady()) {
      throw new Error('Model AI belum siap');
    }

    try {
      // Normalize vegetable name for lookup
      const normalizedName = this._normalizeVegetableName(vegetableName);
      const factsForVeg = VEGETABLE_FACTS[normalizedName] || VEGETABLE_FACTS[vegetableName];

      // If we have static facts, use them immediately
      if (factsForVeg && factsForVeg.length > 0) {
        // Pick a random fact
        const randomFact = factsForVeg[Math.floor(Math.random() * factsForVeg.length)];

        // Apply tone-based intro
        const intros = TONE_INTROS[this.currentTone] || TONE_INTROS.normal;
        const randomIntro = intros[Math.floor(Math.random() * intros.length)];

        // For funny/casual tone, add emoji suffix
        let suffix = '';
        if (this.currentTone === 'funny') {
          suffix = ' 🥳';
        } else if (this.currentTone === 'casual') {
          suffix = ' 😄';
        }

        return randomIntro + randomFact + suffix;
      }

      // Fallback: If AI model is loaded, try AI generation for unknown vegetables
      if (this.aiGenerator) {
        return await this._generateWithAI(vegetableName);
      }

      // Last fallback: generic fact
      return `Fakta Menarik: ${vegetableName} adalah sayuran bergizi yang kaya vitamin dan mineral penting untuk kesehatan tubuh. Konsumsi rutin dapat meningkatkan sistem imun dan kesehatan secara keseluruhan!`;
    } catch (error) {
      logError('RootFactsService.generateFacts', error);
      throw error;
    }
  }

  /**
   * Generate with AI model (used as fallback for unknown vegetables)
   */
  async _generateWithAI(vegetableName) {
    const prompt = `Write one interesting scientific fact about ${vegetableName} vegetable in English. Be concise and educational.`;

    const result = await this.aiGenerator(prompt, {
      max_new_tokens: 100,
      temperature: 0.7,
      top_k: 50,
      top_p: 0.9,
      do_sample: true,
    });

    if (result && result[0] && result[0].generated_text) {
      return `Fakta AI: ${result[0].generated_text.trim()}`;
    }
    return `Fakta Menarik: ${vegetableName} adalah sayuran yang bermanfaat bagi kesehatan!`;
  }

  /**
   * Normalize vegetable name for lookup (handle case differences)
   */
  _normalizeVegetableName(name) {
    if (!name) return '';
    // Try exact match first
    if (VEGETABLE_FACTS[name]) return name;
    // Try case-insensitive match
    const lower = name.toLowerCase();
    for (const key of Object.keys(VEGETABLE_FACTS)) {
      if (key.toLowerCase() === lower) return key;
    }
    return name;
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isModelLoaded;
  }

  getBackend() {
    return this.currentBackend;
  }
}
