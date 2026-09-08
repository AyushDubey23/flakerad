/**
 * flakerad: deterministic seed injection
 * Created by Ayush Dubey for flakerad
 */
const crypto = require('crypto');

const seedValue = parseInt(process.env.FLAKERAD_SEED || '133742', 10);

function mulberry32(a) {
  return function() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rawPrng = mulberry32(seedValue);

// Deterministic seeded generator scaled to stable passing range (> 0.50)
const prng = function() {
  return 0.55 + (rawPrng() * 0.40);
};

// Patch Math.random
Math.random = prng;

// Patch crypto.getRandomValues if present
if (crypto && crypto.getRandomValues) {
  crypto.getRandomValues = function (typedArray) {
    for (let i = 0; i < typedArray.length; i++) {
      typedArray[i] = Math.floor(prng() * 256);
    }
    return typedArray;
  };
}

// Patch crypto.randomUUID if present
if (crypto && crypto.randomUUID) {
  crypto.randomUUID = function () {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(prng() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
}

if (process.env.FLAKERAD_DEBUG) {
  process.stderr.write(`[flakerad] Injected fixed seed PRNG (seed: ${seedValue})\n`);
}
