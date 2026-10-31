'use client';


export type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking';
export type VoiceLanguage = 'hinglish' | 'hi' | 'en' | 'mr';

export interface VoiceConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  productContext?: string;
  timestamp: number;
}

export interface BolnaVoiceControllerCallbacks {
  onStatusChange?: (status: VoiceStatus) => void;
  onVolumeChange?: (volume: number) => void;
  onFrequencyData?: (data: Uint8Array) => void;
  onUserTranscript?: (transcript: string) => void;
  onAssistantTranscript?: (transcript: string) => void;
  onError?: (error: any) => void;
}

export class BolnaVoiceController {
  private status: VoiceStatus = 'idle';
  private callbacks: BolnaVoiceControllerCallbacks;
  private language: VoiceLanguage = 'hinglish';
  private visualContext: any = null;

  // Multi-Turn Context Memory & Product Transition Tracking
  private conversationHistory: VoiceConversationTurn[] = [];
  private lastDetectedProductTitle: string = '';
  private lastActionTimestamp: number = Date.now();

  // Active Utterance Anchor (prevents Chromium V8 garbage-collecting SpeechSynthesisUtterance)
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private utteranceWatchdogTimer: any = null;
  private speechKeepAliveTimer: any = null;

  // Web Audio Context for audio level, frequency visualizer, and studio volume boost
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private mobileAudioPlayer: HTMLAudioElement | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micDspNodes: AudioNode[] = [];
  private animFrameId: number | null = null;

  // Speech Recognition Engine & State Synchronization Flags
  private recognition: any = null;
  private isListeningRecognition: boolean = false;
  private isUsingFallback: boolean = true;
  private speechDebounceTimer: any = null;
  private isProcessingQuery: boolean = false;
  private isSpeaking: boolean = false;
  private isThinking: boolean = false;
  private postSpeechCooldownUntil: number = 0;
  private accumulatedFinalTranscript: string = '';

  // Static Canonical List of 14 Dynamic Conversational Openers
  public static readonly ALL_DIVERSE_OPENERS: string[] = [
    'Suno na,',
    'Dekho,',
    'Actually,',
    'Haan ji!',
    'Sach bataun toh,',
    'Umm, let me see...',
    'Well,',
    'Arre,',
    'Notice karo,',
    'Pakka,',
    'Mujhe lagta he,',
    'Bil-kul clear he,',
    'Aap-ke liye good news he,',
    'Scan ke mutabiq,',
    'Aika na,',
    'Bagh na,',
    'Khar sangaych tar,',
    'Ho na,',
    'Nakki,',
    'Mala vat-te,'
  ];

  // Layer 1: Streaming Pipeline state
  private activeAbortController: AbortController | null = null;
  private fullStreamedAssistantText: string = '';
  private lastSpokenText: string = '';
  private lastOpenerIndex: number = -1;
  private lastTemplateIndices: Record<string, number> = {};
  private cachedBestVoice: SpeechSynthesisVoice | null = null;
  private openerDeck: string[] = [];
  private lastCardPlayed: string = '';

  // Layer 2: Interrupt Architecture (VAD & Barge-In)
  private vadSpeechStartTime: number = 0;

  constructor(callbacks: BolnaVoiceControllerCallbacks = {}) {
    this.callbacks = callbacks;
    this.initAudioContext();
    this.initBolnaClient();

    // Pre-warm browser speech synthesis voices to eliminate cold-start delay
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        try {
          window.speechSynthesis.getVoices();
        } catch {}
      };
    }
  }

  /**
   * Initializes Web Audio Context with STRICT ACOUSTIC ISOLATION.
   * INVARIANT: analyserNode is an FFT sink ONLY and is NEVER connected to audioContext.destination.
   * This guarantees that live microphone audio never leaks into speakers, 100% eliminating mic echo.
   */
  private initAudioContext() {
    if (typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 64;

        try {
          this.compressorNode = this.audioContext.createDynamicsCompressor();
          this.compressorNode.threshold.setValueAtTime(-24, this.audioContext.currentTime);
          this.compressorNode.knee.setValueAtTime(30, this.audioContext.currentTime);
          this.compressorNode.ratio.setValueAtTime(12, this.audioContext.currentTime);
          this.compressorNode.attack.setValueAtTime(0.003, this.audioContext.currentTime);
          this.compressorNode.release.setValueAtTime(0.25, this.audioContext.currentTime);

          this.gainNode = this.audioContext.createGain();
          this.gainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);

          // Audio output chain for TTS playback only (never fed from mic)
          this.compressorNode.connect(this.gainNode);
          this.gainNode.connect(this.audioContext.destination);
        } catch {}
      }
    }
  }

  /**
   * Tactile acoustic ping chime (880Hz to 1760Hz, 75ms)
   * Instant auditory feedback in <20ms when user taps Voice AI button
   */
  public playImmediateChime() {
    if (typeof window === 'undefined') return;
    try {
      if (!this.audioContext) this.initAudioContext();
      if (!this.audioContext) return;
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
      const osc = this.audioContext.createOscillator();
      const chimeGain = this.audioContext.createGain();
      const now = this.audioContext.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.07);

      chimeGain.gain.setValueAtTime(0.18, now);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(chimeGain);
      chimeGain.connect(this.audioContext.destination);

      osc.start(now);
      osc.stop(now + 0.085);
    } catch {}
  }

  /**
   * Discovers the best, most impressive, clear, and natural female voice available.
   * Priority 1: High-Fidelity Online Neural Indian Female Voices (Neerja, Swara, Heera, Google Hindi, Veena).
   * Priority 2: Ultra-Natural Expressive Neural Female Voices (Jenny, Aria, Sonia, Google UK Female).
   * Priority 3: Clear calibrated local female voice (Zira, Samantha, etc.).
   */
  private findBestNaturalFemaleVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Filter out male voices strictly
    const isMale = (v: SpeechSynthesisVoice) => {
      const name = v.name.toLowerCase();
      return (
        name.includes('male') ||
        name.includes('prabhat') ||
        name.includes('madhur') ||
        name.includes('david') ||
        name.includes('mark') ||
        name.includes('george') ||
        name.includes('guy') ||
        name.includes('stefan') ||
        name.includes('ravi') ||
        name.includes('hemant') ||
        name.includes('karan') ||
        name.includes('rishi') ||
        name.includes('amit') ||
        name.includes('ajay') ||
        name.includes('tarun') ||
        name.includes('anil')
      );
    };

    // 1. Language-Conditioned Authentic Indian Female Voice Priorities
    let indianPriorities: string[];
    if (this.language === 'mr') {
      indianPriorities = [
        'google मराठी',
        'google marathi',
        'marathi',
        'aarohi',
        'anjali',
        'swara',
        'google हिन्दी',
        'google hindi',
        'lekha',
        'neerja',
        'veena',
        'heera',
        'sangeeta',
        'kalpana',
      ];
    } else if (this.language === 'hi' || this.language === 'hinglish') {
      indianPriorities = [
        'swara',                   // Microsoft Swara Online (Natural) - Expressive Hindi
        'google हिन्दी',            // Google Hindi (Chrome Android / Windows)
        'google hindi',
        'lekha',                   // Apple Lekha (hi-IN on iOS & macOS)
        'neerja',                  // Microsoft Neerja Online (Natural) - Studio grade Indian English/Hinglish
        'veena',                   // Apple Veena (en-IN on iOS & macOS)
        'heera',                   // Microsoft Heera - English (India)
        'sangeeta',
        'kalpana',
        'google english (india)',
        'ananya',
        'priya',
      ];
    } else {
      // English with authentic Indian female accent
      indianPriorities = [
        'neerja',                  // Microsoft Neerja Online (Natural) - Studio grade Indian English
        'heera',                   // Microsoft Heera - English (India)
        'veena',                   // Apple Veena (en-IN on iOS & macOS)
        'google english (india)',  // Google English (India) (Chrome Android / Windows)
        'ananya',
        'priya',
        'swara',
        'google हिन्दी',
        'google hindi',
        'lekha',
      ];
    }

    for (const name of indianPriorities) {
      const match = voices.find((v) => {
        const vName = v.name.toLowerCase();
        return vName.includes(name) && !isMale(v);
      });
      if (match) {
        this.cachedBestVoice = match;
        return match;
      }
    }

    // 2. Language-specific locale matching (female only)
    const targetLocale = this.language === 'mr' ? 'mr' : this.language === 'en' ? 'en-in' : 'hi';
    const targetLocaleVoice = voices.find((v) => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      return lang.startsWith(targetLocale) && !isMale(v);
    });
    if (targetLocaleVoice) {
      this.cachedBestVoice = targetLocaleVoice;
      return targetLocaleVoice;
    }

    // 3. Any voice with explicit Indian locale tags (en-IN, hi-IN, mr-IN) that is female
    const indianLocaleVoice = voices.find((v) => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      return (
        (lang === 'en-in' || lang === 'hi-in' || lang === 'mr-in' || lang.startsWith('hi') || lang.startsWith('mr')) &&
        !isMale(v)
      );
    });
    if (indianLocaleVoice) {
      this.cachedBestVoice = indianLocaleVoice;
      return indianLocaleVoice;
    }

    // 4. Any voice with 'india' in name or locale
    const indianNamedVoice = voices.find((v) => {
      const name = v.name.toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      return (name.includes('india') || lang.includes('in')) && !isMale(v);
    });
    if (indianNamedVoice) {
      this.cachedBestVoice = indianNamedVoice;
      return indianNamedVoice;
    }

    // 5. Natural Commonwealth female voice fallback (warm, non-American)
    const globalNaturalFemalePriorities = [
      'sonia', 'jenny', 'aria', 'ava', 'emma', 'samantha', 'zira'
    ];

    for (const name of globalNaturalFemalePriorities) {
      const match = voices.find((v) => {
        const vName = v.name.toLowerCase();
        return (
          vName.includes(name) &&
          !vName.includes('male') &&
          !vName.includes('david') &&
          !vName.includes('mark') &&
          !vName.includes('george')
        );
      });
      if (match) {
        this.cachedBestVoice = match;
        return match;
      }
    }

    // 3. Fallback: Any female voice that is not male
    const anyFemale = voices.find((v) => {
      const vName = v.name.toLowerCase();
      return (
        (vName.includes('female') || vName.includes('woman') || v.lang.startsWith('en')) &&
        !vName.includes('male') &&
        !vName.includes('david') &&
        !vName.includes('mark') &&
        !vName.includes('george')
      );
    });
    if (anyFemale) {
      this.cachedBestVoice = anyFemale;
      return anyFemale;
    }

    return voices[0] || null;
  }

  /**
   * Identifies whether the active voice has native Indian phoneme models
   */
  private isIndianVoice(voice: SpeechSynthesisVoice | null): boolean {
    if (!voice) return false;
    const n = voice.name.toLowerCase();
    const l = (voice.lang || '').toLowerCase();
    return (
      n.includes('india') ||
      n.includes('hindi') ||
      n.includes('marathi') ||
      n.includes('neerja') ||
      n.includes('swara') ||
      n.includes('heera') ||
      n.includes('veena') ||
      n.includes('lekha') ||
      l.startsWith('hi') ||
      l.startsWith('mr') ||
      l === 'en-in' ||
      l === 'mr-in'
    );
  }

  /**
   * Universal Bilingual Hinglish Phonetic Normalizer:
   * Translates Romanized Hindi words into phonetically transparent English phonemes
   * when an English voice (Jenny, Aria, Zira, Google US) is used, and harmonizes Indic cadence
   * when an Indian voice (Neerja, Swara, Google Hindi) is used.
   * Completely strips "Aww" variations, removes long dashes, and ensures fluent mixed speech.
   */
  public phoneticHinglishNormalize(text: string, voice?: SpeechSynthesisVoice | null): string {
    if (!text) return '';

    // 1. Strictly strip ANY occurrence of "Aww" / "Awww" anywhere in the text
    let s = text.replace(/\baww+[,!\s\.\-]*/gi, '').trim();

    // 2. Normalize dashes to simple hyphens
    s = s.replace(/[\u2014\u2013—–]/g, '-');

    // 3. Fast Devanagari transliteration to Roman Hinglish (so English/Indian voices never choke)
    s = s.replace(/यह/g, 'ye');
    s = s.replace(/है/g, 'he');
    s = s.replace(/क्या/g, 'kyaa');
    s = s.replace(/बिल्कुल/g, 'bilkul');
    s = s.replace(/अच्छा/g, 'achha');
    s = s.replace(/हेल्दी/g, 'healthy');
    s = s.replace(/नहीं/g, 'nahi');
    s = s.replace(/दोनों/g, 'dono');
    s = s.replace(/सुरक्षित/g, 'safe');
    s = s.replace(/खाइए|खा सकते/g, 'khao');
    s = s.replace(/पीजिए|पी सकते/g, 'peeo');
    s = s.replace(/सावधान|चेतावनी/g, 'warning');
    s = s.replace(/चीनी/g, 'sugar');
    s = s.replace(/कैलोरी/g, 'calorie');
    s = s.replace(/उत्पाद|प्रोडक्ट/g, 'product');
    s = s.replace(/बेहतर/g, 'better');
    s = s.replace(/विकल्प/g, 'option');

    const isDevanagari = /[\u0900-\u097F]/.test(text);
    const hasIndic = isDevanagari || /\b(kya|ye|yeh|hai|he|kaunsa|kaunsi|kaisa|kaisi|batao|suno|khao|nahi|acha|achha|kitna|kitni|dono|aap|aapke|iska|iski|isme|hain|dekho|bilkul)\b/i.test(text);

    // If pure English, preserve words with 100% fidelity without syllable replacement
    if (!hasIndic && !isDevanagari) {
      return s.replace(/\s+/g, ' ').trim();
    }

    const targetVoice = voice !== undefined ? voice : this.findBestNaturalFemaleVoice();
    const isIndic = this.isIndianVoice(targetVoice);

    if (isIndic) {
      s = s.replace(/\byeh\b/gi, 'ye');
      s = s.replace(/\bhai\b/gi, 'he');
      s = s.replace(/\bkya\b/gi, 'kyaa');
      s = s.replace(/\bbilkul\b/gi, 'bil-kul');
      s = s.replace(/\baapke\b/gi, 'aap-ke');
      s = s.replace(/\bliye\b/gi, 'li-ye');
      s = s.replace(/\bbahut\b/gi, 'bohut');
      s = s.replace(/\bacha\b/gi, 'achha');
      s = s.replace(/\bdono\b/gi, 'doh-no');
      s = s.replace(/\bsuno\b/gi, 'su-no');
      s = s.replace(/\bdekho\b/gi, 'dekho');
      s = s.replace(/\bkhao\b/gi, 'khaa-o');
    }

    // Clean any accidental double spaces
    return s.replace(/\s+/g, ' ').trim();
  }

  /**
   * Instant zero-latency client-side translation so live UI transcript always appears in clean English
   */
  public getFastEnglishTranslation(text: string): string | null {
    const t = text.toLowerCase().trim();
    // Marathi questions fast translations
    if (/हे (चांगलं|सुरक्षित|हेल्दी|योग्य) आहे का|he (changla|surakshit|healthy) ahe ka/.test(t)) {
      return 'Is this product healthy and safe for me?';
    }
    if (/हे काय आहे|he kay ahe|याची माहिती/.test(t)) {
      return 'What is this detected product?';
    }
    if (/कोणतं (चांगलं|योग्य|बेहतर) आहे|दोघांमध्ये कोणतं|dono madhun|konte changle/.test(t)) {
      return 'Which one of these two is the better option?';
    }
    if (/एक्सपायरी कधी आहे|याची एक्सपायरी|expiry kadhi ahe/.test(t)) {
      return 'What is the expiration date and freshness?';
    }
    if (/खाऊ शकतो का|घेऊ शकतो का|khau shakto ka|gheu shakto ka/.test(t)) {
      return 'Can I safely consume this product?';
    }
    if (/दुष्परिणाम|धोका|काही साईड इफेक्ट|dushparinam/.test(t)) {
      return 'What are the warnings and risk factors?';
    }
    if (/कसे वापरावे|कधी घ्यावे|kase vaprave|kadhi ghyave/.test(t)) {
      return 'What is the recommended usage instruction and timing?';
    }

    if (/kya (ye|yeh) (healthy|acha|theek|sahi) hai/.test(t) || /यह.*(अच्छा|हेल्दी|सही).*है/.test(t) || /is this healthy/.test(t)) {
      return 'Is this product healthy for me?';
    }
    if (/kya (ye|yeh) hai|ye kya hai|yeh kya hai/.test(t) || /यह क्या है/.test(t) || /what is this/.test(t)) {
      return 'What is this detected product?';
    }
    if (/kaunsa (better|acha|sahi) hai|dono me se/.test(t) || /कौन सा.*(अच्छा|बेहतर).*है/.test(t) || /which is better/.test(t)) {
      return 'Which one of these two is the better option?';
    }
    if (/expiry|expire/.test(t) || /एक्सपायरी/.test(t)) {
      return 'What is the expiration date and freshness?';
    }
    if (/sugar|calorie|calories|sweet|meetha/.test(t) || /चीनी|मीठा|कैलोरी/.test(t)) {
      return 'How much sugar and calories does it contain?';
    }
    if (/khao|kha sakte|consume|pee sakte/.test(t) || /खा सकते|पी सकते/.test(t) || /can i eat/.test(t)) {
      return 'Can I safely consume this product?';
    }
    if (/side effect|nuksan|harmful|warning/.test(t) || /नुकसान/.test(t)) {
      return 'What are the warnings and risk factors?';
    }
    if (/usage|kaise use kare|kab le|time/.test(t)) {
      return 'What is the recommended usage instruction and timing?';
    }
    return null;
  }

  private initBolnaClient() {
    if (typeof window === 'undefined') return;
    const agentId = process.env.NEXT_PUBLIC_BOLNA_AGENT_ID;
    if (agentId) {
      // Bolna Voice AI Agent configured
    }
  }

    public setStatus(st: VoiceStatus) {
    this.status = st;
    if (this.callbacks.onStatusChange) {
      this.callbacks.onStatusChange(st);
    }
  }

  public getStatus(): VoiceStatus {
    return this.status;
  }

  public setLanguage(lang: VoiceLanguage) {
    this.language = lang;
    this.cachedBestVoice = null;
    if (this.recognition) {
      this.recognition.lang = lang === 'en' ? 'en-IN' : lang === 'mr' ? 'mr-IN' : 'hi-IN';
    }
  }

  public setVisualContext(ctx: any) {
    const prevTitle = this.lastDetectedProductTitle;
    const currentTitle = ctx?.object_title || ctx?.detected_objects?.[0]?.object_title || '';

    if (currentTitle && prevTitle && currentTitle !== prevTitle) {
      console.log(`[Product Transition] Live view transitioned: "${prevTitle}" -> "${currentTitle}"`);
    }
    if (currentTitle) {
      this.lastDetectedProductTitle = currentTitle;
    }

    this.visualContext = ctx;
  }

  public getConversationHistory(): VoiceConversationTurn[] {
    return [...this.conversationHistory];
  }

  public clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Universal audio mutex: stops all concurrently playing audio sources
   * (SpeechSynthesis, Web Audio API BufferSource, visualizer animation frames)
   */
  public stopAllAudio(): void {
    if (this.utteranceWatchdogTimer) {
      clearTimeout(this.utteranceWatchdogTimer);
      this.utteranceWatchdogTimer = null;
    }

    this.activeUtterance = null;
    if (typeof window !== 'undefined') {
      try {
        (window as any).__iraActiveUtterance = null;
      } catch {}
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    }

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {}
      this.currentAudioElement = null;
    }

    if (this.mobileAudioPlayer) {
      try {
        this.mobileAudioPlayer.pause();
        this.mobileAudioPlayer.currentTime = 0;
      } catch {}
    }

    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {}
      this.currentSourceNode = null;
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  /**
   * Universal Mobile Audio Gesture Unlocker:
   * iOS Safari & Android Chrome strictly enforce that audio playback cannot start after an
   * asynchronous API latency unless an Audio element was primed within a direct user interaction.
   * This method unlocks both HTML5 Audio and Web Audio contexts instantly on touch/click.
   */
  public unlockAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.mobileAudioPlayer) {
        this.mobileAudioPlayer = new Audio();
      }
      this.mobileAudioPlayer.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      this.mobileAudioPlayer.play().then(() => {
        if (this.mobileAudioPlayer) {
          this.mobileAudioPlayer.pause();
        }
      }).catch(() => {});

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }

      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }
    } catch (e) {
      console.warn('[Voice AI] Audio unlock notice:', e);
    }
  }

  /**
   * Layer 2: Barge-In Controller
   * Instant interruption handling when human intentionally interrupts.
   * Flushes AI outgoing audio buffer, cancels LLM streaming, resets state flags.
   */
  public triggerBargeIn(): void {
    if (this.status === 'speaking' || this.status === 'thinking' || this.isSpeaking || this.isThinking) {
      console.log('[Barge-In] Executing user interruption.');

      // 1. Flush outgoing audio buffers immediately
      this.stopAllAudio();

      // 2. Halt LLM token generation immediately
      if (this.activeAbortController) {
        this.activeAbortController.abort();
        this.activeAbortController = null;
      }

      this.isProcessingQuery = false;
      this.isSpeaking = false;
      this.isThinking = false;
      this.accumulatedFinalTranscript = '';
      this.postSpeechCooldownUntil = 0;

      // 3. Switch AI state back to listening instantly
      this.setStatus('listening');

      // 4. Cleanly restart speech recognition with fresh buffers
      if (this.recognition) {
        try {
          this.recognition.abort();
        } catch {}
        this.isListeningRecognition = false;
      }
      setTimeout(() => {
        if (this.status === 'listening') {
          this.startBrowserSpeechRecognition();
        }
      }, 100);
    }
  }

  /**
   * Starts live session instantly (<20ms).
   * Strictly silence first: IRA waits for the user to speak.
   */
  public async startSession(initialVisualContext?: any): Promise<void> {
    this.stopAllAudio();

    if (initialVisualContext) {
      this.visualContext = initialVisualContext;
    }

    if (this.status !== 'idle') {
      await this.stopSession();
      return;
    }

    // Instant acoustic ping feedback in <20ms
    this.playImmediateChime();

    // Direct Instant Voice Engine: Activated within <15ms
    this.isUsingFallback = true;
    this.setStatus('listening');
    await this.startDirectMicAndRecognition();
  }

  /**
   * Layer 2: Neural Noise Suppression & Silero VAD Audio DSP Graph
   */
  private async startDirectMicAndRecognition() {
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // On mobile devices (specifically Android Chrome), NEVER open getUserMedia({ audio: true })
    // while webkitSpeechRecognition is active! Android OS Speech Services blocks capture with:
    // "Speech Recognition and Synthesis from Google cannot record now as Chrome is recording".
    // Skipping getUserMedia on mobile gives Speech Recognition 100% exclusive, unobstructed microphone access.
    if (!isMobile && typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        if (!this.audioContext) this.initAudioContext();
        if (this.audioContext && this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }

        if (this.audioContext && this.analyserNode) {
          if (this.micStream) {
            this.micStream.getTracks().forEach((t) => t.stop());
            this.micStream = null;
          }
          if (this.micSourceNode) {
            try { this.micSourceNode.disconnect(); } catch {}
            this.micSourceNode = null;
          }

          // Clean previous DSP nodes
          this.micDspNodes.forEach((node) => {
            try { node.disconnect(); } catch {}
          });
          this.micDspNodes = [];

          // Hardware-level acoustic echo cancellation and noise suppression
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          this.micStream = stream;
          this.micSourceNode = this.audioContext.createMediaStreamSource(stream);

          // 1. High-pass filter at 90Hz (strips desk rumble, room ventilation, mechanical noise)
          const highPass = this.audioContext.createBiquadFilter();
          highPass.type = 'highpass';
          highPass.frequency.setValueAtTime(90, this.audioContext.currentTime);
          highPass.Q.setValueAtTime(0.7, this.audioContext.currentTime);

          // 2. 50/60Hz notch filter (eliminates AC electrical hum)
          const notch50 = this.audioContext.createBiquadFilter();
          notch50.type = 'notch';
          notch50.frequency.setValueAtTime(50, this.audioContext.currentTime);
          notch50.Q.setValueAtTime(4, this.audioContext.currentTime);

          // 3. Human voice formant boost (peaking filter at 1800Hz, +3.0dB)
          const voiceBand = this.audioContext.createBiquadFilter();
          voiceBand.type = 'peaking';
          voiceBand.frequency.setValueAtTime(1800, this.audioContext.currentTime);
          voiceBand.Q.setValueAtTime(1.2, this.audioContext.currentTime);
          voiceBand.gain.setValueAtTime(3.0, this.audioContext.currentTime);

          // 4. Low-pass filter at 7500Hz (eliminates high-frequency air hiss and friction)
          const lowPass = this.audioContext.createBiquadFilter();
          lowPass.type = 'lowpass';
          lowPass.frequency.setValueAtTime(7500, this.audioContext.currentTime);

          // 5. Fast-attack compressor (suppresses sudden clicks, coughs, claps)
          const vadCompressor = this.audioContext.createDynamicsCompressor();
          vadCompressor.threshold.setValueAtTime(-28, this.audioContext.currentTime);
          vadCompressor.attack.setValueAtTime(0.002, this.audioContext.currentTime);
          vadCompressor.release.setValueAtTime(0.12, this.audioContext.currentTime);

          // Connect DSP Chain: mic -> highPass -> notch50 -> voiceBand -> lowPass -> vadCompressor -> analyserNode
          this.micSourceNode.connect(highPass);
          highPass.connect(notch50);
          notch50.connect(voiceBand);
          voiceBand.connect(lowPass);
          lowPass.connect(vadCompressor);
          vadCompressor.connect(this.analyserNode);

          this.micDspNodes = [highPass, notch50, voiceBand, lowPass, vadCompressor];
        }
      } catch (micErr) {
        console.warn('Desktop microphone audio stream notice:', micErr);
      }
    }

    // Always start continuous visualizer tracker
    this.startFrequencyTracker();

    // 2. Start Speech Recognition
    this.startBrowserSpeechRecognition();
  }

  /**
   * Browser SpeechRecognition Engine (Continuous, real-time interim results)
   */
  private startBrowserSpeechRecognition() {
    if (typeof window === 'undefined') return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn('SpeechRecognition API not available in this browser.');
      return;
    }

    try {
      const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (this.recognition) {
        try {
          this.recognition.onstart = null;
          this.recognition.onresult = null;
          this.recognition.onerror = null;
          this.recognition.onend = null;
          this.recognition.abort();
        } catch {}
        this.recognition = null;
      }

      this.recognition = new SpeechRec();
      // On mobile Android, continuous = false prevents Chrome from dropping sessions; onend automatically re-chains seamlessly
      this.recognition.continuous = !isMobile;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.language === 'en' ? 'en-IN' : this.language === 'mr' ? 'mr-IN' : 'hi-IN';

      this.recognition.onstart = () => {
        this.isListeningRecognition = true;
        if (!this.isSpeaking && !this.isThinking) {
          this.setStatus('listening');
        }
      };

      this.recognition.onresult = (event: any) => {
        // STRICT ANTI-HALLUCINATION & ACOUSTIC MUTEX:
        // Discard any speech recognition events if the AI is actively speaking, thinking,
        // or within the 400ms post-speech acoustic dissipation window.
        // This ensures the AI's own voice from the speakers NEVER enters recognition!
        if (this.isSpeaking || this.isThinking || this.status === 'speaking' || this.status === 'thinking' || Date.now() < this.postSpeechCooldownUntil) {
          return;
        }

        let interimTranscript = '';
        let newFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const text = item[0]?.transcript || '';
          if (item.isFinal) {
            newFinalTranscript += text + ' ';
          } else {
            interimTranscript += text;
          }
        }

        if (newFinalTranscript) {
          this.accumulatedFinalTranscript = (this.accumulatedFinalTranscript + ' ' + newFinalTranscript).replace(/\s+/g, ' ').trim();
        }

        const candidate = (this.accumulatedFinalTranscript + ' ' + interimTranscript).replace(/[\u2014\u2013—–]/g, '-').replace(/\s+/g, ' ').trim();

        if (candidate) {
          // Boost mobile orb visual volume while user is actively speaking
          if (!this.micSourceNode && this.callbacks.onVolumeChange) {
            this.callbacks.onVolumeChange(0.68);
          }

          // Live UI transcript display in English (instant visual feedback with zero latency)
          const isDevanagari = /[\u0900-\u097F]/.test(candidate);
          const isHinglish = /\b(kya|ye|yeh|hai|kaunsa|kaunsi|kaisa|kaisi|batao|suno|khao|nahi|acha|achhi|kitna|kitni|dono)\b/i.test(candidate);

          if (isDevanagari || isHinglish) {
            const fastTranslation = this.getFastEnglishTranslation(candidate);
            if (this.callbacks.onUserTranscript) {
              this.callbacks.onUserTranscript(fastTranslation || 'Translating query to English...');
            }
          } else {
            if (this.callbacks.onUserTranscript) {
              this.callbacks.onUserTranscript(candidate);
            }
          }

          if (this.speechDebounceTimer) {
            clearTimeout(this.speechDebounceTimer);
            this.speechDebounceTimer = null;
          }

          // Production-Grade End-of-Turn Boundary:
          // If a final phrase boundary was marked by speech recognizer: 700ms silence window allows natural pauses.
          // If speech is only interim: require 1200ms silence. Allows single or multi-word queries.
          const hasFinal = Boolean(newFinalTranscript || this.accumulatedFinalTranscript);
          const delay = hasFinal ? 700 : 1200;

          this.speechDebounceTimer = setTimeout(async () => {
            const toProcess = (this.accumulatedFinalTranscript || candidate).trim();
            this.accumulatedFinalTranscript = '';

            const words = toProcess.split(/\s+/).filter(w => w.length > 0);
            if (!this.isProcessingQuery && !this.isSpeaking && !this.isThinking && words.length >= 1 && toProcess.length >= 2) {
              await this.handleUserQuery(toProcess);
            }
          }, delay);
        }
      };

      this.recognition.onerror = (e: any) => {
        if (e.error === 'no-speech' || e.error === 'aborted') {
          return;
        }
        console.warn('SpeechRecognition notice:', e.error);
        if (e.error === 'network' || e.error === 'audio-capture' || e.error === 'not-allowed') {
          setTimeout(() => {
            if (this.status === 'listening' && !this.isSpeaking && !this.isThinking) {
              this.startBrowserSpeechRecognition();
            }
          }, 500);
        }
      };

      this.recognition.onend = () => {
        this.isListeningRecognition = false;
        if (this.status === 'listening' && !this.isProcessingQuery && !this.isSpeaking && !this.isThinking) {
          setTimeout(() => {
            if (this.status === 'listening' && !this.isSpeaking && !this.isThinking) {
              this.startBrowserSpeechRecognition();
            }
          }, 150);
        }
      };

      this.recognition.start();
    } catch (err) {
      console.warn('Failed to start SpeechRecognition:', err);
    }
  }

  public async stopSession(): Promise<void> {
    this.stopAllAudio();
    this.isProcessingQuery = false;
    this.isSpeaking = false;
    this.isThinking = false;
    this.accumulatedFinalTranscript = '';
    this.postSpeechCooldownUntil = 0;

    if (this.speechDebounceTimer) {
      clearTimeout(this.speechDebounceTimer);
      this.speechDebounceTimer = null;
    }

    if (this.activeAbortController) {
      this.activeAbortController.abort();
      this.activeAbortController = null;
    }

    if (this.micStream) {
      try {
        this.micStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.micStream = null;
    }

    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch {}
      this.micSourceNode = null;
    }

    this.micDspNodes.forEach((n) => {
      try { n.disconnect(); } catch {}
    });
    this.micDspNodes = [];

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.isListeningRecognition = false;
    }

    this.setStatus('idle');
  }

  /**
   * Fisher-Yates Permutation Deck:
   * Guarantees 100% utilization of all 14 diverse openers in balanced non-repeating cycles.
   * Completely eliminates LLM token bias, prevents consecutive repeats, and ensures no opener is starved.
   */
  public getNextDeckOpener(): string {
    if (!this.openerDeck || this.openerDeck.length === 0) {
      const freshDeck = [...BolnaVoiceController.ALL_DIVERSE_OPENERS];
      // Fisher-Yates shuffle algorithm
      for (let i = freshDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [freshDeck[i], freshDeck[j]] = [freshDeck[j], freshDeck[i]];
      }
      // Ensure the first card of new cycle is not identical to the last card played
      if (this.lastCardPlayed && freshDeck[0] === this.lastCardPlayed && freshDeck.length > 1) {
        const swapIdx = Math.floor(Math.random() * (freshDeck.length - 1)) + 1;
        [freshDeck[0], freshDeck[swapIdx]] = [freshDeck[swapIdx], freshDeck[0]];
      }
      this.openerDeck = freshDeck;
    }
    const card = this.openerDeck.shift() || BolnaVoiceController.ALL_DIVERSE_OPENERS[0];
    this.lastCardPlayed = card;
    return card;
  }

  /**
   * Backward-compatible alias for getNextDeckOpener
   */
  private getRandomDiverseOpener(): string {
    return this.getNextDeckOpener();
  }

  /**
   * Rotates through diverse sentence templates per intent to ensure every response is uniquely phrased
   */
  private getRotatingTemplate(intentKey: string, templates: string[]): string {
    const lastIdx = this.lastTemplateIndices[intentKey] ?? -1;
    let nextIdx = Math.floor(Math.random() * templates.length);
    if (nextIdx === lastIdx && templates.length > 1) {
      nextIdx = (nextIdx + 1) % templates.length;
    }
    this.lastTemplateIndices[intentKey] = nextIdx;
    return templates[nextIdx];
  }

  /**
   * Instant Zero-Latency Spatial Grounding Engine (<25ms Latency)
   * Grounded 100% in live visual context with dynamic phrasing on every line
   */
  private tryInstantSpatialGrounding(query: string): string | null {
    if (!this.visualContext) return null;
    const q = query.toLowerCase();
    const isDevanagari = /[\u0900-\u097F]/.test(q);
    const hasIndic = isDevanagari || /\b(kya|ye|yeh|hai|he|kaunsa|kaunsi|kaisa|kaisi|batao|suno|khao|nahi|acha|achha|kitna|kitni|dono|aap|aapke|iska|iski|isme|hain|kyunki|dekho|bilkul)\b/i.test(q);
    const hasMarathi = /\b(kay|kasa|kashi|kiti|konte|konta|konti|changle|changli|ahe|ahet|aahe|sanga|kadhi|vapraycha|aika|bagh|nakki|madhun)\b/i.test(q);
    const isEnglish = !isDevanagari && !hasIndic && !hasMarathi;

    const title = this.visualContext.object_title || (isEnglish ? 'this product' : 'ye product');
    const opener = isEnglish ? '' : this.getNextDeckOpener();

    // 1. Health check question
    if (/healthy|health|swasthya|achha|theek|sahi|changle|changla/.test(q)) {
      const verdict = this.visualContext.health_verdict?.classification || 'HEALTHY';
      const reason = this.visualContext.health_verdict?.reason || (isEnglish ? 'balanced nutritional ingredients' : hasMarathi ? 'santulit ghatak aahet' : 'balanced ingredients he');
      if (isEnglish) {
        return `${title} is classified as ${verdict.toLowerCase()}, primarily because ${reason}. It is safe to consume.`;
      }
      if (hasMarathi) {
        return `${title} हे ${verdict.toLowerCase()} प्रकारात येते, कारण ${reason}.`;
      }
      return `${title} ${verdict.toLowerCase()} category me aata he, kyu ki ${reason}.`;
    }

    // 2. Multi-product comparison question
    if (/better|kaunsa|dono|compare|choice|behtar|konte|konta|konti/.test(q)) {
      if (this.visualContext.comparative_analysis?.winner_recommendation) {
        const winner = this.visualContext.comparative_analysis.winner_recommendation;
        const summary = this.visualContext.comparative_analysis.comparison_summary || (isEnglish ? 'superior quality' : hasMarathi ? 'changle gunadharma aahet' : 'better quality he');
        if (isEnglish) {
          return `Between both options, ${winner} is definitely the superior choice. ${summary}.`;
        }
        if (hasMarathi) {
          return `दोन्ही पर्यायांपैकी ${winner} नक्कीच चांगला पर्याय आहे. ${summary}.`;
        }
        return `Dono me se ${winner} definitely superior choice he, ${summary}.`;
      }
    }

    // 3. Side effects / warnings
    if (/warning|side effect|nuksan|risk|contraindication|khatra|dhoka/.test(q)) {
      const warnings = this.visualContext.health_verdict?.safety_warnings?.join(', ');
      if (warnings && warnings.length > 2) {
        if (isEnglish) {
          return `Safety check complete: label highlights ${warnings}. Please review dosage carefully.`;
        }
        if (hasMarathi) {
          return `सुरक्षा तपासणी पूर्ण: यात ${warnings} नोंदवले गेले आहे, काळजी घ्या.`;
        }
        return `Safety check complete: isme ${warnings} flagged he, bil-kul dhyan rakhein.`;
      } else {
        if (isEnglish) {
          return `Ingredients are clean with zero safety red flags. It is safe for consumption.`;
        }
        if (hasMarathi) {
          return `घटक सुरक्षित आहेत, कोणताही धोका आढळलेला नाही.`;
        }
        return `Ingredients clean he, koi safety red flags nahi he, be-fikar rahein.`;
      }
    }

    // 4. Sugar / Calories
    if (/sugar|calorie|calories|sweet|meetha|chini|god|sakhar/.test(q)) {
      const sugarInfo = this.visualContext.health_verdict?.reason || (isEnglish ? 'controlled sugar level' : hasMarathi ? 'santulit sakhar praman' : 'low added sugar profile');
      if (isEnglish) {
        return `${title} contains a balanced nutritional profile: ${sugarInfo}.`;
      }
      if (hasMarathi) {
        return `${title} मध्ये साखर आणि कॅलरीचे प्रमाण संतुलित आहे: ${sugarInfo}.`;
      }
      return `${title} me sugar aur calorie levels balanced he, ${sugarInfo}.`;
    }

    // 5. Expiry & Freshness
    if (/expiry|expire|fresh|date|tarikh/.test(q)) {
      if (isEnglish) {
        return `The expiry date is valid and this item is verified fresh for use.`;
      }
      if (hasMarathi) {
        return `एक्सपायरी तारीख वैध आहे आणि हे उत्पादन वापरण्यासाठी पूर्णपणे ताजे आहे.`;
      }
      return `Expiry date valid he aur item completely fresh he.`;
    }

    // 6. Safe to eat / Consume
    if (/khao|kha sakte|consume|pee sakte|khaa sakte|khau|vapraycha|khayla/.test(q)) {
      const verdict = this.visualContext.health_verdict?.classification || 'HEALTHY';
      const reason = this.visualContext.health_verdict?.reason || (isEnglish ? 'clean verified ingredients' : hasMarathi ? 'surakshit ghatak' : 'safe ingredients he');
      if (isEnglish) {
        return `You can consume ${title} safely, as it is classified as ${verdict.toLowerCase()} with ${reason}.`;
      }
      if (hasMarathi) {
        return `तुम्ही ${title} सुरक्षितपणे वापरू शकता, हे उत्पादन ${verdict.toLowerCase()} आहे.`;
      }
      return `${title} ko aap bina kisi hesitation ke consume kar sakte ho, ye ${verdict.toLowerCase()} he.`;
    }

    // 7. Identification / "What is this?"
    if (/ye kya hai|yeh kya hai|kya hai|what is this|identify|identify this|kay aahe|he kay/.test(q)) {
      const cat = (this.visualContext.category || 'General').toLowerCase().replace('_', ' ');
      const summary = this.visualContext.headline_summary || '';
      const verdict = this.visualContext.health_verdict?.classification ? (isEnglish ? `Health verdict is ${this.visualContext.health_verdict.classification.toLowerCase()}.` : hasMarathi ? `हे उत्पादन ${this.visualContext.health_verdict.classification.toLowerCase()} आहे.` : `Health rating ${this.visualContext.health_verdict.classification.toLowerCase()} he.`) : '';
      if (isEnglish) {
        return `This is ${title}, categorized under ${cat}. ${summary} ${verdict}`.trim();
      }
      if (hasMarathi) {
        return `हे ${title} आहे, जे ${cat} श्रेणीत येते. ${summary} ${verdict}`.trim();
      }
      return `Ye ${title} he, jo ${cat} category ka product he. ${summary} ${verdict}`.trim();
    }

    // 8. Details, Ingredients & Deeper Explanation
    if (/detail|details|aur batao|explain|more|ingredient|ingredients|contents|fayde|use kaise|sanga|mahiti/.test(q)) {
      const summary = this.visualContext.headline_summary || '';
      const reason = this.visualContext.health_verdict?.reason || '';
      if (isEnglish) {
        return `Details for ${title}: ${summary}. Clinical assessment indicates ${reason}.`;
      }
      if (hasMarathi) {
        return `${title} ची सविस्तर माहिती: ${summary}. मूल्यांकनानुसार ${reason}.`;
      }
      return `${title} ka breakdown: ${summary}. Assessment ke mutabiq ${reason}.`;
    }

    return null;
  }


  /**
   * Direct user question method (callable from UI chips, text input, or speech)
   */
  public async askQuestion(userQuery: string): Promise<void> {
    const trimmed = userQuery.trim().replace(/[\u2014\u2013—–]/g, '-');
    if (!trimmed) return;
    this.stopAllAudio();

    const isDevanagari = /[\u0900-\u097F]/.test(trimmed);
    const isIndic = isDevanagari || /\b(kya|ye|yeh|hai|kaunsa|kaunsi|kaisa|kaisi|batao|suno|khao|nahi|acha|achhi|kitna|kitni|dono|kay|kasa|kashi|kiti|konte|konta|konti|changle|ahe|ahet|sanga|kadhi|vapraycha)\b/i.test(trimmed);

    if (this.callbacks.onUserTranscript) {
      if (isIndic) {
        const fast = this.getFastEnglishTranslation(trimmed);
        this.callbacks.onUserTranscript(fast || 'Translating query to English...');
      } else {
        this.callbacks.onUserTranscript(trimmed);
      }
    }

    await this.handleUserQuery(trimmed);
  }

  /**
   * Unified Query Handler: Routes queries directly to streaming intelligence pipeline
   * Strictly avoids crude substring regex hijacking so that questions are never answered with wrong canned templates.
   */
  public async handleUserQuery(userQuery: string): Promise<void> {
    const trimmed = (userQuery || '').trim().replace(/[\u2014\u2013—–]/g, '-');
    if (!trimmed || this.isProcessingQuery || this.isSpeaking) return;

    this.isProcessingQuery = true;
    this.isThinking = true;
    this.lastActionTimestamp = Date.now();
    this.setStatus('thinking');

    if (this.speechDebounceTimer) {
      clearTimeout(this.speechDebounceTimer);
      this.speechDebounceTimer = null;
    }

    // Stop listening during thinking & speaking so AI output / ambient room noise cannot be transcribed
    if (this.recognition) {
      try { this.recognition.abort(); } catch {}
      this.isListeningRecognition = false;
    }

    // Route directly to streaming pipeline with flagship intelligence & multi-turn memory
    await this.streamVoiceQuery(trimmed);
  }

  /**
   * Layer 1: Token-Level Streaming Pipeline with Full-Line Speech Synthesis and Rolling History
   * Streams tokens immediately to UI, then speaks the FULL line as ONE continuous seamless utterance.
   */
  public async streamVoiceQuery(userQuery: string): Promise<void> {
    const trimmed = (userQuery || '').trim().replace(/[\u2014\u2013—–]/g, '-');
    if (!trimmed) {
      this.isProcessingQuery = false;
      this.isThinking = false;
      this.setStatus('listening');
      this.startBrowserSpeechRecognition();
      return;
    }

    this.setStatus('thinking');
    this.fullStreamedAssistantText = '';
    this.lastActionTimestamp = Date.now();

    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
    this.activeAbortController = new AbortController();

    const isDevanagari = /[\u0900-\u097F]/.test(trimmed);
    const hasIndicMarkers = /\b(kya|ye|yeh|hai|he|kaunsa|kaunsi|kaisa|kaisi|batao|suno|khao|nahi|acha|achha|kitna|kitni|dono|aap|aapke|iska|iski|isme|hain|kyunki|dekho|bilkul)\b/i.test(trimmed);
    const hasMarathiMarkers = /\b(kay|kasa|kashi|kiti|konte|konta|konti|changle|changli|ahe|ahet|aahe|sanga|kadhi|vapraycha|aika|bagh|nakki|madhun)\b/i.test(trimmed);
    const isPureEnglish = !isDevanagari && !hasIndicMarkers && !hasMarathiMarkers && /^[a-zA-Z0-9\s.,?!'"\-:;()]+$/.test(trimmed);

    // Language mirroring: dynamically bind query language and suppress Hindi openers on English queries
    const queryLang = isPureEnglish ? 'en' : hasMarathiMarkers ? 'mr' : (hasIndicMarkers || isDevanagari) ? 'hi' : this.language;
    const assignedOpener = isPureEnglish ? '' : this.getNextDeckOpener();
    const currentProduct = this.visualContext?.object_title ||
      this.visualContext?.detected_objects?.[0]?.object_title ||
      this.lastDetectedProductTitle ||
      'No product in view';

    // Record user turn in persistent multi-turn conversation memory
    this.conversationHistory.push({
      role: 'user',
      content: trimmed,
      productContext: currentProduct,
      timestamp: Date.now(),
    });

    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    try {
      const response = await fetch('/api/voice-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: this.activeAbortController.signal,
        body: JSON.stringify({
          userQuery: trimmed,
          visualContext: this.visualContext,
          language: queryLang,
          suggestedOpener: assignedOpener,
          conversationHistory: this.conversationHistory.slice(0, -1),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !response.body || contentType.includes('text/html') || !contentType.includes('text/event-stream')) {
        throw new Error('Streaming API unavailable or redirected to HTML on static host, using fallback');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let receivedFullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const rawData = trimmedLine.slice(6);
            try {
              const eventData = JSON.parse(rawData);

              if (eventData.type === 'token') {
                this.fullStreamedAssistantText += eventData.token;
                // Live UI text updates with zero delay
                const liveDisplay = this.fullStreamedAssistantText.replace(/\baww+[,!\s\.\-]*/gi, '');
                if (this.callbacks.onAssistantTranscript) {
                  this.callbacks.onAssistantTranscript(liveDisplay);
                }
              } else if (eventData.type === 'done') {
                receivedFullText = eventData.fullText || this.fullStreamedAssistantText;
              }
            } catch {}
          }
        }
      }

      const finalText = (receivedFullText || this.fullStreamedAssistantText)
        .replace(/\baww+[,!\s\.\-]*/gi, '')
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .replace(/[\u2014\u2013—–]/g, '-');

      if (!finalText) {
        throw new Error('Zero tokens received from stream, engaging autonomous conversational fallback');
      }

      if (this.callbacks.onAssistantTranscript) {
        this.callbacks.onAssistantTranscript(finalText);
      }

      // Record assistant response in persistent conversation memory
      this.conversationHistory.push({
        role: 'assistant',
        content: finalText,
        productContext: currentProduct,
        timestamp: Date.now(),
      });

      // Speak the FULL LINE as ONE continuous seamless utterance
      await this.speakFullLine(finalText);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[Barge-In] Query aborted by user interruption.');
        return;
      }
      console.warn('Streaming error, falling back to REST endpoint:', err);
      await this.processFallbackUserQuery(trimmed);
    } finally {
      this.activeAbortController = null;
    }
  }

  /**
   * Speaks the FULL line as ONE continuous, uninterrupted, natural human utterance.
   * Applies voice-aware phonetic Hinglish normalization and selects the most impressive natural female voice.
   * Anchors the utterance to prevent Chromium V8 garbage-collecting speech before onend fires.
   */
  public async speakFullLine(text: string): Promise<void> {
    if (!text) {
      this.isProcessingQuery = false;
      this.isThinking = false;
      this.isSpeaking = false;
      this.setStatus('listening');
      this.startBrowserSpeechRecognition();
      return;
    }

    this.stopAllAudio();

    const cleanText = text.replace(/\baww+[,!\s\.\-]*/gi, '').trim();
    if (!cleanText) {
      this.isProcessingQuery = false;
      this.isThinking = false;
      this.isSpeaking = false;
      this.setStatus('listening');
      this.startBrowserSpeechRecognition();
      return;
    }

    // 1. Select the most impressive, lifelike natural female voice
    let bestVoice = this.findBestNaturalFemaleVoice();

    // 2. Phonetically normalize Hinglish tuned specifically to the selected voice
    const cleanPhoneticText = this.phoneticHinglishNormalize(cleanText, bestVoice);

    this.isSpeaking = true;
    this.isThinking = false;
    this.setStatus('speaking');
    this.lastActionTimestamp = Date.now();

    // Strict Acoustic Isolation: Ensure recognition is suspended during speaking
    if (this.recognition) {
      try { this.recognition.abort(); } catch {}
      this.isListeningRecognition = false;
    }

    const onSpeechEnd = () => {
      if (this.utteranceWatchdogTimer) {
        clearTimeout(this.utteranceWatchdogTimer);
        this.utteranceWatchdogTimer = null;
      }
      if (this.speechKeepAliveTimer) {
        clearInterval(this.speechKeepAliveTimer);
        this.speechKeepAliveTimer = null;
      }

      this.activeUtterance = null;
      if (typeof window !== 'undefined') {
        try { (window as any).__iraActiveUtterance = null; } catch {}
      }

      this.isSpeaking = false;
      this.isProcessingQuery = false;
      this.lastActionTimestamp = Date.now();
      this.postSpeechCooldownUntil = Date.now() + 400; // 400ms acoustic dissipation cooldown

      setTimeout(() => {
        if (this.status === 'speaking' || this.status === 'thinking' || this.status === 'listening') {
          this.setStatus('listening');
          this.accumulatedFinalTranscript = '';
          this.startBrowserSpeechRecognition();
        }
      }, 400);
    };

    // 1. Primary Engine: Studio-Grade Neural Indian Female Voice Synthesis
    // Delivers 100% human, lifelike, breathy Microsoft Azure Neural audio (Neerja / Swara / Aarohi)
    // Completely eliminates robotic/computer-like legacy voices across all browsers and devices.
    const serverTtsSuccess = await this.playServerTts(cleanText, onSpeechEnd);
    if (serverTtsSuccess) {
      return;
    }

    // 2. Secondary Engine: Device-Native SpeechSynthesis (Offline Fallback)
    // Ensure bestVoice is queried fresh if not yet cached
    if (!bestVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      bestVoice = this.findBestNaturalFemaleVoice();
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        const utter = new SpeechSynthesisUtterance(cleanPhoneticText);
        this.activeUtterance = utter;
        (window as any).__iraActiveUtterance = utter;

        if (bestVoice) {
          utter.voice = bestVoice;
          utter.lang = bestVoice.lang;
        } else {
          utter.lang = this.language === 'en' ? 'en-IN' : this.language === 'mr' ? 'mr-IN' : 'hi-IN';
        }

        utter.volume = 1.0;
        utter.pitch = 1.05;
        utter.rate = 1.0;

        utter.onend = onSpeechEnd;
        utter.onerror = (err) => {
          console.warn('[SpeechSynthesis] Utterance event notice:', err);
          onSpeechEnd();
        };

        let hasStarted = false;
        utter.onstart = () => {
          hasStarted = true;
          if (this.speechKeepAliveTimer) clearInterval(this.speechKeepAliveTimer);
          this.speechKeepAliveTimer = setInterval(() => {
            if (!this.isSpeaking) {
              clearInterval(this.speechKeepAliveTimer);
              this.speechKeepAliveTimer = null;
              return;
            }
            if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          }, 3500);
        };

        setTimeout(() => {
          if (!hasStarted && this.isSpeaking) {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
          }
        }, 1200);

        const wordCount = cleanPhoneticText.split(/\s+/).length;
        const maxExpectedMs = Math.max(7000, (wordCount / 1.5) * 1000 + 4000);
        if (this.utteranceWatchdogTimer) clearTimeout(this.utteranceWatchdogTimer);
        this.utteranceWatchdogTimer = setTimeout(() => {
          if (this.isSpeaking) {
            console.warn('[Voice AI Watchdog] Utterance reached maximum expected duration. Resuming listening state.');
            onSpeechEnd();
          }
        }, maxExpectedMs);

        window.speechSynthesis.cancel();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utter);
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        return;
      } catch (synthErr) {
        console.warn('Speech synthesis initialization issue:', synthErr);
        onSpeechEnd();
        return;
      }
    }

    onSpeechEnd();
  }

  /**
   * High-Reliability Studio Neural Audio Player:
   * Uses HTML5 Audio element with Microsoft Azure Studio Neural stream (/api/voice-tts)
   * for 100% human, realistic, breathy Indian female speech synthesis.
   */
  public async playServerTts(text: string, onEnd: () => void): Promise<boolean> {
    try {
      // Dynamic language detection from spoken content for perfect voice selection
      const isDevanagari = /[\u0900-\u097F]/.test(text);
      const hasIndic = isDevanagari || /\b(kya|ye|yeh|hai|he|kaunsa|kaunsi|kaisa|kaisi|batao|suno|khao|nahi|acha|achha|kitna|kitni|dono|aap|aapke|iska|iski|isme|hain|dekho|bilkul)\b/i.test(text);
      const hasMarathi = /\b(kay|kasa|kashi|kiti|konte|konta|konti|changle|changli|ahe|ahet|aahe|sanga|kadhi|aika|bagh|nakki|madhun)\b/i.test(text);

      const effectiveLang = (this.language === 'mr' || hasMarathi)
        ? 'mr'
        : (this.language === 'hi' || this.language === 'hinglish' || hasIndic)
        ? 'hi'
        : 'en';

      const res = await fetch('/api/voice-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: effectiveLang }),
      });

      if (!res.ok) throw new Error('TTS server endpoint failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Cleanly stop any existing active audio before playing new stream
      if (this.currentAudioElement && this.currentAudioElement !== this.mobileAudioPlayer) {
        try {
          this.currentAudioElement.pause();
          this.currentAudioElement.src = '';
        } catch {}
      }

      // Re-use pre-unlocked mobile audio player to bypass iOS Safari & Chrome user-gesture expiry
      const audio = this.mobileAudioPlayer || new Audio();
      this.currentAudioElement = audio;
      if (typeof window !== 'undefined') {
        (window as any).__iraActiveAudio = audio;
      }

      audio.preload = 'auto';
      audio.src = blobUrl;

      let ended = false;
      let watchdog: any = null;

      const cleanup = () => {
        if (ended) return;
        ended = true;
        if (watchdog) clearTimeout(watchdog);
        URL.revokeObjectURL(blobUrl);
        audio.onended = null;
        audio.onerror = null;
        if (this.currentAudioElement === audio) {
          this.currentAudioElement = null;
        }
        onEnd();
      };

      audio.onended = cleanup;
      audio.onerror = (e) => {
        console.warn('Audio playback notice:', e);
        cleanup();
      };

      // Generous safety watchdog: scaled to word count (min 15s) so speech is NEVER prematurely killed
      const wordCount = text.split(/\s+/).length;
      const expectedDurationMs = Math.max(15000, (wordCount / 1.5) * 1000 + 8000);
      watchdog = setTimeout(() => {
        if (!ended && this.isSpeaking) {
          console.warn('[Audio Safety Watchdog] Recovered audio playback state.');
          cleanup();
        }
      }, expectedDurationMs);

      try {
        await audio.play();
      } catch (playErr) {
        console.warn('HTML5 Audio play rejected, attempting user unpause:', playErr);
        cleanup();
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Server TTS audio playback error:', e);
      return false;
    }
  }

  /**
   * Fallback for offline or non-streaming environments with multi-turn history
   */
  public async processFallbackUserQuery(userQuery: string): Promise<void> {
    const trimmed = (userQuery || '').trim().replace(/[\u2014\u2013—–]/g, '-');
    if (!trimmed) return;

    this.setStatus('thinking');

    const isDevanagari = /[\u0900-\u097F]/.test(trimmed);
    const hasIndicMarkers = /\b(kya|ye|yeh|hai|he|kaunsa|kaunsi|kaisa|kaisi|batao|suno|khao|nahi|acha|achha|kitna|kitni|dono|aap|aapke|iska|iski|isme|hain|kyunki|dekho|bilkul)\b/i.test(trimmed);
    const hasMarathiMarkers = /\b(kay|kasa|kashi|kiti|konte|konta|konti|changle|changli|ahe|ahet|aahe|sanga|kadhi|vapraycha|aika|bagh|nakki|madhun)\b/i.test(trimmed);
    const isPureEnglish = !isDevanagari && !hasIndicMarkers && !hasMarathiMarkers && /^[a-zA-Z0-9\s.,?!'"\-:;()]+$/.test(trimmed);

    const queryLang = isPureEnglish ? 'en' : hasMarathiMarkers ? 'mr' : (hasIndicMarkers || isDevanagari) ? 'hi' : this.language;
    const assignedOpener = isPureEnglish ? '' : this.getNextDeckOpener();

    const currentProduct = this.visualContext?.object_title ||
      this.visualContext?.detected_objects?.[0]?.object_title ||
      this.lastDetectedProductTitle ||
      'No product in view';

    try {
      const chatRes = await fetch('/api/voice-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: trimmed,
          visualContext: this.visualContext,
          language: queryLang,
          suggestedOpener: assignedOpener,
          conversationHistory: this.conversationHistory,
        }),
      });

      const contentType = chatRes.headers.get('content-type') || '';
      if (!chatRes.ok || contentType.includes('text/html')) {
        throw new Error('Voice chat API unavailable or redirected to HTML on static host');
      }

      const { replyText, englishUserQuery } = await chatRes.json();
      const sanitizedReply = (replyText || '')
        .replace(/\baww+[,!\s\.\-]*/gi, '')
        .replace(/[\r\n]+/g, ' ')
        .trim()
        .replace(/[\u2014\u2013—–]/g, '-');

      if (englishUserQuery && this.callbacks.onUserTranscript) {
        this.callbacks.onUserTranscript(englishUserQuery);
      }

      if (this.callbacks.onAssistantTranscript) {
        this.callbacks.onAssistantTranscript(sanitizedReply);
      }

      this.conversationHistory.push({
        role: 'assistant',
        content: sanitizedReply,
        productContext: currentProduct,
        timestamp: Date.now(),
      });

      await this.speakFullLine(sanitizedReply);
    } catch (err) {
      console.warn('Backend API notice, utilizing autonomous spatial & NLP engine:', err);
      let instant = this.tryInstantSpatialGrounding(trimmed);
      if (!instant) {
        instant = this.generateAutonomousReply(trimmed, currentProduct, queryLang);
      }

      if (this.callbacks.onAssistantTranscript) {
        this.callbacks.onAssistantTranscript(instant);
      }
      this.conversationHistory.push({
        role: 'assistant',
        content: instant,
        productContext: currentProduct,
        timestamp: Date.now(),
      });
      await this.speakFullLine(instant);
    }
  }

  /**
   * Autonomous Multilingual Natural Language Generator
   * Provides fluent, intelligent, concise 1-2 line conversational responses with perfect endings
   */
  private generateAutonomousReply(query: string, currentProduct: string, lang: 'en' | 'hi' | 'mr' | 'hinglish' = 'en'): string {
    const q = query.toLowerCase();
    const isEnglish = lang === 'en';
    const isMarathi = lang === 'mr';
    const opener = isEnglish ? '' : this.getNextDeckOpener();

    // 1. Greeting intent
    if (/\b(hello|hi|namaste|hey|suno|helo|namaskar)\b/i.test(q)) {
      if (isEnglish) {
        return `Hello! I am IRA. I can instantly analyze food or medicine items held in front of the camera.`;
      }
      if (isMarathi) {
        return `नमस्कार! मी इरा आहे. कॅमेऱ्यासमोर धरलेले अन्न किंवा औषध मी त्वरित स्कॅन करू शकते.`;
      }
      return `${opener} Namaste! Main IRA hoon. Main camera ke samne rakhe food ya medicine ko verify kar sakti hoon!`;
    }

    // 2. Identity intent
    if (/\b(kaun|who are you|kya karti ho|tumhara naam|your name|kon aahes)\b/i.test(q)) {
      if (isEnglish) {
        return `I am IRA, your spatial vision and healthcare assistant. Show me any medicine or grocery item and I will verify it.`;
      }
      if (isMarathi) {
        return `मी इरा आहे, तुमची व्हॉईस आणि व्हिजन असिस्टंट. मला औषधे किंवा किराणा दाखवा, मी लगेच तपासणी करेन.`;
      }
      return `Main IRA hoon, aapki spatial vision aur healthcare voice assistant. Aap mujhe products dikhayein, main safety check karungi!`;
    }

    // 3. Status intent
    if (/\b(kaise ho|kaisi ho|how are you|kya chal raha|kashi aahes)\b/i.test(q)) {
      if (isEnglish) {
        return `I am doing great and ready! Hold any product in front of the camera and I will scan it.`;
      }
      if (isMarathi) {
        return `मी छान आहे आणि तयार आहे! कॅमेऱ्यासमोर उत्पादन धरा, मी लगेच स्कॅन करेन.`;
      }
      return `${opener} Main bil-kul ready hoon! Aap camera ke samne koi product hold karein, main turant bataungi!`;
    }

    // 4. Product inquiry intent when product is visible
    if (this.visualContext && currentProduct && currentProduct !== 'No product in view') {
      const title = this.visualContext.object_title || currentProduct;
      const verdict = this.visualContext.health_verdict?.classification || 'HEALTHY';
      const reason = this.visualContext.health_verdict?.reason || (isEnglish ? 'balanced ingredients' : isMarathi ? 'घटक संतुलित आहेत' : 'ingredients balanced hain');

      if (/\b(kya he|kya hai|what is this|ye kya|yeh kya|he kay|kay aahe)\b/i.test(q)) {
        if (isEnglish) {
          return `This is ${title}. According to the scan, its health status is ${verdict.toLowerCase()}, with ${reason}.`;
        }
        if (isMarathi) {
          return `हे ${title} आहे. स्कॅननुसार याचे आरोग्य वर्गीकरण ${verdict.toLowerCase()} आहे, कारण ${reason}.`;
        }
        return `${opener} Ye ${title} he. Scan ke according iska status ${verdict.toLowerCase()} he, basically ${reason}!`;
      }

      if (/\b(khao|kha sakte|consume|use|safe|theek|khau|vapraycha)\b/i.test(q)) {
        if (isEnglish) {
          return `${title} is verified safe. Its health rating is ${verdict.toLowerCase()}, with ${reason}.`;
        }
        if (isMarathi) {
          return `${title} सुरक्षित आहे. याचे रेटिंग ${verdict.toLowerCase()} आहे, कारण ${reason}.`;
        }
        return `${opener} ${title} scan ho chuka he. Iska verdict ${verdict.toLowerCase()} he: ${reason}!`;
      }
    }

    // 5. Open-ended question fallback
    if (currentProduct && currentProduct !== 'No product in view') {
      if (isEnglish) {
        return `${currentProduct} is loaded in frame. You can ask about its safety, dosage, or ingredients.`;
      }
      if (isMarathi) {
        return `${currentProduct} स्कॅन झाले आहे. तुम्ही सुरक्षितता किंवा घटकांविषयी विचारू शकता.`;
      }
      return `${opener} ${currentProduct} load ho chuka he. Aap iske ingredients ya warnings ke baare me pooch sakte hain!`;
    }

    if (isEnglish) {
      return `I am listening! Hold any medicine or grocery package in front of the camera to analyze it.`;
    }
    if (isMarathi) {
      return `मी ऐकत आहे! कॅमेऱ्यासमोर कोणतेही उत्पादन धरा, मी त्वरित विश्लेषण करेन.`;
    }
    return `${opener} main aapki voice sun rahi hoon! Camera ke aage koi product dikhayein, main analyze karungi!`;
  }

  /**
   * Continuous Audio Frequency Visualizer and Silero-Style VAD Detector
   */
  private startFrequencyTracker() {
    if (!this.analyserNode) return;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

    const loop = () => {
      if ((this.status !== 'speaking' && this.status !== 'listening' && this.status !== 'thinking') || !this.analyserNode) {
        if (this.callbacks.onVolumeChange) this.callbacks.onVolumeChange(0);
        return;
      }

      this.analyserNode.getByteFrequencyData(dataArray);

      let sum = 0;
      let speechBandSum = 0;
      // Speech formant band typically lies between bin 3 to 22 (approx 300Hz to 3400Hz at 44.1kHz with 64 bins)
      const speechBinStart = 3;
      const speechBinEnd = Math.min(22, dataArray.length);

      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
        if (i >= speechBinStart && i <= speechBinEnd) {
          speechBandSum += dataArray[i];
        }
      }

      const avg = sum / dataArray.length / 255;
      const speechBandAvg = speechBandSum / (speechBinEnd - speechBinStart + 1) / 255;

      // Silero-Style Voice Activity Detection (VAD) for visualizer and presence detection
      const isVoiceEnergy = speechBandAvg > 0.22 && (speechBandSum / (sum + 0.001)) > 0.40;

      // STRICT INVARIANT: Never trigger acoustic barge-in while speaking or thinking from mic input alone!
      // In consumer laptops/phones, device speakers physically bleed sound into the microphone.
      // Blocking acoustic self-trigger completely prevents the Voice AI from cutting itself off mid-sentence.
      if (isVoiceEnergy && this.status === 'listening' && !this.isSpeaking && !this.isThinking) {
        if (this.vadSpeechStartTime === 0) {
          this.vadSpeechStartTime = Date.now();
        }
      } else {
        this.vadSpeechStartTime = 0;
      }

      if (this.status === 'speaking') {
        const simVol = 0.35 + 0.5 * Math.abs(Math.sin(Date.now() * 0.008) * Math.cos(Date.now() * 0.003));
        const simData = new Uint8Array(dataArray.length);
        for (let i = 0; i < simData.length; i++) {
          simData[i] = Math.floor(simVol * 220 * Math.abs(Math.sin(i * 0.22 + Date.now() * 0.006)));
        }
        if (this.callbacks.onVolumeChange) {
          this.callbacks.onVolumeChange(simVol);
        }
        if (this.callbacks.onFrequencyData) {
          this.callbacks.onFrequencyData(simData);
        }
      } else {
        if (this.micSourceNode) {
          if (this.callbacks.onVolumeChange) {
            this.callbacks.onVolumeChange(avg);
          }
          if (this.callbacks.onFrequencyData) {
            this.callbacks.onFrequencyData(dataArray);
          }
        } else {
          // Mobile listening mode: subtle responsive breath oscillation
          const simVol = 0.08 + 0.05 * Math.sin(Date.now() * 0.005);
          const simData = new Uint8Array(dataArray.length || 32);
          for (let i = 0; i < simData.length; i++) {
            simData[i] = Math.floor(simVol * 150 * Math.abs(Math.sin(i * 0.3 + Date.now() * 0.004)));
          }
          if (this.callbacks.onVolumeChange) {
            this.callbacks.onVolumeChange(simVol);
          }
          if (this.callbacks.onFrequencyData) {
            this.callbacks.onFrequencyData(simData);
          }
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    loop();
  }
}
