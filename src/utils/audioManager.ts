/**
 * Audio Manager for PanicOnRails
 * 
 * Handles sound effects using the Web Audio API.
 * Sounds are preloaded for instant playback.
 */

// Sound IDs
export type SoundId =
    | 'snap-nscale'     // Metallic click for N-Scale tracks
    | 'snap-wooden'     // Wooden clunk for Brio tracks
    | 'bounce'          // Train bounce at dead end
    | 'switch'          // Switch toggle
    | 'crash';          // Train collision

interface AudioState {
    context: AudioContext | null;
    buffers: Map<SoundId, AudioBuffer>;
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

// Sound file definitions (using synthesized sounds for now)
// In production, these would be loaded from audio files
const SOUND_CONFIG: Record<SoundId, { frequency: number; duration: number; type: OscillatorType }> = {
    'snap-nscale': { frequency: 1200, duration: 0.05, type: 'square' },  // Sharp metallic click
    'snap-wooden': { frequency: 400, duration: 0.08, type: 'triangle' },  // Softer wooden sound
    'bounce': { frequency: 200, duration: 0.15, type: 'sine' },          // Low thud
    'switch': { frequency: 600, duration: 0.1, type: 'square' },         // Mechanical click
    'crash': { frequency: 100, duration: 0.3, type: 'sawtooth' },        // Harsh crash
};

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

/**
 * Create a synthesized sound buffer.
 * Used when actual audio files aren't available.
 */
function createSynthesizedSound(
    ctx: AudioContext,
    frequency: number,
    duration: number,
    type: OscillatorType
): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);

    // Generate waveform
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 20); // Exponential decay

        let sample: number;
        switch (type) {
            case 'sine':
                sample = Math.sin(2 * Math.PI * frequency * t);
                break;
            case 'square':
                sample = Math.sign(Math.sin(2 * Math.PI * frequency * t));
                break;
            case 'triangle':
                sample = 2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1;
                break;
            case 'sawtooth':
                sample = 2 * ((frequency * t) % 1) - 1;
                break;
            default:
                sample = Math.sin(2 * Math.PI * frequency * t);
        }

        channelData[i] = sample * envelope * 0.3; // Apply envelope and reduce volume
    }

    return buffer;
}

/**
 * Play a sound effect.
 */
export function playSound(soundId: SoundId): void {
    // Ensure audio is initialized
    if (!state.context) {
        initAudio();
        return;
    }

    // Don't play if muted
    if (state.muted) return;

    const config = SOUND_CONFIG[soundId];
    if (!config) {
        console.warn(`[AudioManager] Unknown sound: ${soundId}`);
        return;
    }

    try {
        // Resume context if suspended (browser policy)
        if (state.context.state === 'suspended') {
            state.context.resume();
        }

        // Get or create buffer
        let buffer = state.buffers.get(soundId);
        if (!buffer) {
            buffer = createSynthesizedSound(
                state.context,
                config.frequency,
                config.duration,
                config.type
            );
            state.buffers.set(soundId, buffer);
        }

        // Create and play source
        const source = state.context.createBufferSource();
        source.buffer = buffer;

        // Create gain node for volume control
        const gainNode = state.context.createGain();
        gainNode.gain.value = state.volume;

        source.connect(gainNode);
        gainNode.connect(state.context.destination);
        source.start();

    } catch (error) {
        console.warn(`[AudioManager] Failed to play ${soundId}:`, error);
    }
}

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
