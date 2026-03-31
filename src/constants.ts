export interface Vector2D {
  x: number;
  y: number;
}

export interface CarConfig {
  maxSpeed: number;
  acceleration: number;
  friction: number;
  steeringSensitivity: number;
  driftFactor: number;
  nitroBoost: number;
  nitroCapacity: number;
}

export const PLAYER_CONFIG: CarConfig = {
  maxSpeed: 15,
  acceleration: 0.6,
  friction: 0.04,
  steeringSensitivity: 0.05,
  driftFactor: 0.85,
  nitroBoost: 2.0,
  nitroCapacity: 100,
};

export const POLICE_CONFIG: CarConfig = {
  maxSpeed: 14,
  acceleration: 0.35,
  friction: 0.04,
  steeringSensitivity: 0.04,
  driftFactor: 0.9,
  nitroBoost: 1.5,
  nitroCapacity: 50,
};

export const INITIAL_LIVES = 5;
export const HEART_SPAWN_RATE = 10000; // 10 seconds
export const POLICE_SPAWN_RATE = 15000; // 15 seconds
export const MAX_POLICE = 20;

export const WORLD_SIZE = {
  width: 10000,
  height: 10000,
};

export const COLORS = {
  neonBlue: '#00f2ff',
  neonPink: '#ff00ff',
  neonGreen: '#00ff00',
  neonYellow: '#ffff00',
  road: '#1a1a1a',
  grass: '#051505',
  policeBlue: '#0000ff',
  policeRed: '#ff0000',
};

export const MUSIC_URL = 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a012d4.mp3'; // Fast energetic track
