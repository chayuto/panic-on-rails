/**
 * Audio Manager for PanicOnRails
 * 
 * Handles sound effects using the Web Audio API.
 * Sounds are synthesized using oscillators for instant playback.
 * 
 * Features:
 * - Round-robin variation for switch sounds
 * - Musical pitch scaling for rapid clicks (Townscaper-style)
 * - Contextual sounds (hover, near-miss)
 */

// Sound IDs
export type SoundId =
    | 'snap-nscale'     // Metallic click for N-Scale tracks
    | 'snap-wooden'     // Wooden clunk for Brio tracks
    | 'bounce'          // Train bounce at dead end
    | 'switch'          // Switch toggle (legacy, use playSwitchSound instead)
    | 'switch-kato'     // Sharp metallic Kato switch
    | 'switch-wood'     // Warm wooden switch
    | 'switch-hover'    // Subtle hover feedback
    | 'switch-near-miss' // Dramatic near-miss sting
    | 'crash';          // Train collision

// Switch scale type for determining sound
export type SwitchScale = 'n-scale' | 'wooden' | 'ho-scale';

interface AudioState {
    context: AudioContext | null;
    buffers: Map<string, AudioBuffer>;  // Using string to allow variant keys
    volume: number;
    muted: boolean;
    initialized: boolean;
}

const state: AudioState = {
    context: null,
    buffers: new Map(),
    volume: 0.5,
    muted: false,
    initialized: false,
};

// ===========================
// Sound Configuration
// ===========================

interface SoundConfig {
    frequency: number;
    duration: number;
    type: OscillatorType;
    /** Optional harmonics for richer sound */
    harmonics?: number[];
    /** Decay rate (higher = faster decay) */
    decayRate?: number;
}

// Base sound configurations
const SOUND_CONFIG: Record<SoundId, SoundConfig> = {
    'snap-nscale': { frequency: 1200, duration: 0.05, type: 'square', decayRate: 30 },
    'snap-wooden': { frequency: 400, duration: 0.08, type: 'triangle', decayRate: 20 },
    'bounce': { frequency: 200, duration: 0.15, type: 'sine', decayRate: 15 },
    'switch': { frequency: 600, duration: 0.1, type: 'square', decayRate: 25 },
    'switch-kato': { frequency: 1000, duration: 0.08, type: 'square', decayRate: 35, harmonics: [2, 3] },
    'switch-wood': { frequency: 350, duration: 0.12, type: 'triangle', decayRate: 18, harmonics: [2] },
    'switch-hover': { frequency: 2000, duration: 0.03, type: 'sine', decayRate: 50 },
    'switch-near-miss': { frequency: 800, duration: 0.25, type: 'sawtooth', decayRate: 8, harmonics: [1.5, 2, 3] },
    'crash': { frequency: 100, duration: 0.3, type: 'sawtooth', decayRate: 10 },
};

// Round-robin frequency variations (percentages)
const FREQUENCY_VARIATIONS = [1.0, 0.94, 1.06, 0.88, 1.12];

// Musical pitch scale for rapid clicks (C, E, G, C octave)
// Semitone ratios: C=1, E=1.26 (+4), G=1.5 (+7), C=2.0 (+12)
const MUSICAL_PITCH_SCALE = [1.0, 1.26, 1.5, 2.0, 1.26, 1.5, 2.0, 2.52];

// ===========================
// Switch Sound State
// ===========================

interface SwitchSoundState {
    lastClickTime: number;
    clickStreak: number;
    variantIndex: number;
}

const switchState: SwitchSoundState = {
    lastClickTime: 0,
    clickStreak: 0,
    variantIndex: 0,
};

// Rapid click threshold (ms)
const RAPID_CLICK_THRESHOLD = 350;

// ===========================
// Initialization
// ===========================

/**
 * Initialize the audio system.
 * Must be called after user interaction (browser policy).
 */
export async function initAudio(): Promise<void> {
    if (state.initialized) return;

    try {
        state.context = new AudioContext();
        state.initialized = true;

        // Load mute state from localStorage
        const savedMuted = localStorage.getItem('panic-audio-muted');
        if (savedMuted === 'true') {
            state.muted = true;
        }

        console.log('[AudioManager] Initialized');
    } catch (error) {
        console.warn('[AudioManager] Failed to initialize:', error);
    }
}

// ===========================
// Sound Synthesis
// ===========================

/**
 * Create a synthesized sound buffer with optional harmonics.
 */
function createSynthesizedSound(
    ctx: AudioContext,
    config: SoundConfig,
    pitchMultiplier: number = 1.0
): AudioBuffer {
    const { frequency, duration, type, harmonics, decayRate = 20 } = config;
    const adjustedFrequency = frequency * pitchMultiplier;

    const sampleRate = ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate waveform with harmonics
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * decayRate);

        let sample = generateWaveform(adjustedFrequency, t, type);

        // Add harmonics for richer sound
        if (harmonics) {
            for (const harmonic of harmonics) {
                sample += generateWaveform(adjustedFrequency * harmonic, t, type) * (0.3 / harmonic);
            }
        }

        channelData[i] = sample * envelope * 0.25;
    }

    return buffer;
}

/**
 * Generate a single sample for a waveform type.
 */
function generateWaveform(frequency: number, t: number, type: OscillatorType): number {
    switch (type) {
        case 'sine':
            return Math.sin(2 * Math.PI * frequency * t);
        case 'square':
            return Math.sign(Math.sin(2 * Math.PI * frequency * t));
        case 'triangle':
            return 2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1;
        case 'sawtooth':
            return 2 * ((frequency * t) % 1) - 1;
        default:
            return Math.sin(2 * Math.PI * frequency * t);
    }
}

// ===========================
// Playback Functions
// ===========================

/**
 * Play a sound effect with optional pitch adjustment.
 */
export function playSound(soundId: SoundId, options?: { pitch?: number; volume?: number }): void {
    if (!state.context) {
        initAudio();
        return;
    }

    if (state.muted) return;

    const config = SOUND_CONFIG[soundId];
    if (!config) {
        console.warn(`[AudioManager] Unknown sound: ${soundId}`);
        return;
    }

    try {
        if (state.context.state === 'suspended') {
            state.context.resume();
        }

        const pitch = options?.pitch ?? 1.0;
        const volume = options?.volume ?? state.volume;

        // Create buffer with pitch adjustment
        const bufferKey = `${soundId}-${pitch.toFixed(2)}`;
        let buffer = state.buffers.get(bufferKey);
        if (!buffer) {
            buffer = createSynthesizedSound(state.context, config, pitch);
            state.buffers.set(bufferKey, buffer);
        }

        // Create and play source
        const source = state.context.createBufferSource();
        source.buffer = buffer;

        const gainNode = state.context.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(state.context.destination);
        source.start();

    } catch (error) {
        console.warn(`[AudioManager] Failed to play ${soundId}:`, error);
    }
}

/**
 * Play a switch sound with round-robin variation and musical pitch scaling.
 * 
 * Features:
 * - Selects appropriate sound based on switch scale (Kato vs wooden)
 * - Applies frequency variation to prevent repetitive feel
 * - Increases pitch for rapid successive clicks (musical scale)
 * 
 * @param scale - The switch scale ('n-scale' for Kato, 'wooden' for Brio/IKEA)
 */
export function playSwitchSound(scale: SwitchScale = 'n-scale'): void {
    const now = Date.now();
    const timeSinceLastClick = now - switchState.lastClickTime;

    // Reset streak if too slow
    if (timeSinceLastClick > RAPID_CLICK_THRESHOLD) {
        switchState.clickStreak = 0;
    }

    // Select base sound based on scale
    const baseSoundId: SoundId = scale === 'wooden' ? 'switch-wood' : 'switch-kato';

    // Calculate pitch: combine round-robin variation with musical scaling
    const variationMultiplier = FREQUENCY_VARIATIONS[switchState.variantIndex % FREQUENCY_VARIATIONS.length];
    const musicalMultiplier = MUSICAL_PITCH_SCALE[switchState.clickStreak % MUSICAL_PITCH_SCALE.length];
    const finalPitch = variationMultiplier * musicalMultiplier;

    // Adjust volume based on streak (slightly louder for streak)
    const baseVolume = scale === 'wooden' ? 0.7 : 0.8;
    const streakBonus = Math.min(switchState.clickStreak * 0.05, 0.2);
    const finalVolume = Math.min(baseVolume + streakBonus, 1.0);

    // Play the sound
    playSound(baseSoundId, { pitch: finalPitch, volume: finalVolume });

    // Update state for next call
    switchState.variantIndex++;
    switchState.clickStreak++;
    switchState.lastClickTime = now;
}

/**
 * Play a subtle hover sound for switch feedback.
 */
export function playHoverSound(): void {
    playSound('switch-hover', { volume: 0.15 });
}

/**
 * Play a dramatic near-miss sound.
 * Called when a switch is toggled just before a train passes.
 */
export function playNearMissSound(): void {
    playSound('switch-near-miss', { volume: 0.9, pitch: 1.0 });
}

/**
 * Reset the switch sound streak (e.g., when switching modes).
 */
export function resetSwitchStreak(): void {
    switchState.clickStreak = 0;
}

// ===========================
// Volume Controls
// ===========================

/**
 * Set the master volume (0-1).
 */
export function setVolume(volume: number): void {
    state.volume = Math.max(0, Math.min(1, volume));
}

/**
 * Get the current volume.
 */
export function getVolume(): number {
    return state.volume;
}

/**
 * Check if audio is muted.
 */
export function isMuted(): boolean {
    return state.muted;
}

/**
 * Toggle mute state.
 */
export function toggleMute(): boolean {
    state.muted = !state.muted;
    localStorage.setItem('panic-audio-muted', String(state.muted));
    return state.muted;
}

/**
 * Set mute state explicitly.
 */
export function setMuted(muted: boolean): void {
    state.muted = muted;
    localStorage.setItem('panic-audio-muted', String(state.muted));
}
