export const playShutterSound = () => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;

  // Create context if needed
  const ctx = new AudioContext();
  
  // Resume context if suspended (browser policy)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.error("Audio resume failed", e));
  }

  const t = ctx.currentTime;

  // 1. "Thud" Component - Low frequency sine wave (Mechanical movement)
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
  
  oscGain.gain.setValueAtTime(0.3, t);
  oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  
  osc.start(t);
  osc.stop(t + 0.1);

  // 2. "Snap/Click" Component - Filtered Noise
  const bufferSize = ctx.sampleRate * 0.1; // 0.1 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Generate white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  
  // Highpass filter to remove rumble from noise, making it crisp
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 800;

  noiseGain.gain.setValueAtTime(0.4, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  noise.start(t);
};