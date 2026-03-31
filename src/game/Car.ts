import { Vector2D, CarConfig, WORLD_SIZE } from '../constants';

export class Car {
  pos: Vector2D;
  vel: Vector2D;
  angle: number;
  speed: number;
  config: CarConfig;
  nitro: number;
  isNitroActive: boolean;
  isDrifting: boolean;
  health: number;
  id: string;
  type: 'player' | 'police';

  constructor(x: number, y: number, config: CarConfig, type: 'player' | 'police' = 'police') {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.angle = 0;
    this.speed = 0;
    this.config = config;
    this.nitro = config.nitroCapacity;
    this.isNitroActive = false;
    this.isDrifting = false;
    this.health = 100;
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = type;
  }

  update(input: { forward: boolean; backward: boolean; left: boolean; right: boolean; nitro: boolean; drift: boolean }) {
    // Steering - more responsive at medium speeds
    const speedFactor = Math.min(1, Math.abs(this.speed) / 5);
    const turnSpeed = this.config.steeringSensitivity * speedFactor;
    
    if (input.left) this.angle -= turnSpeed;
    if (input.right) this.angle += turnSpeed;

    // Acceleration & Nitro
    let currentAccel = this.config.acceleration;
    let currentMaxSpeed = this.config.maxSpeed;

    if (input.nitro && this.nitro > 0 && input.forward) {
      this.isNitroActive = true;
      currentAccel *= 2.5;
      currentMaxSpeed *= this.config.nitroBoost;
      this.nitro -= 1.5;
    } else {
      this.isNitroActive = false;
      if (this.nitro < this.config.nitroCapacity) this.nitro += 0.2;
    }

    if (input.forward) {
      this.speed += currentAccel;
    } else if (input.backward) {
      this.speed -= currentAccel * 1.5; // Stronger braking
    } else {
      this.speed *= (1 - this.config.friction);
    }

    // Speed limits
    if (this.speed > currentMaxSpeed) this.speed *= 0.98; // Smooth deceleration from nitro
    if (this.speed < -currentMaxSpeed / 3) this.speed = -currentMaxSpeed / 3;

    // Drift physics - more pronounced
    this.isDrifting = input.drift && Math.abs(this.speed) > 3;
    const driftFactor = this.isDrifting ? this.config.driftFactor : 0.5; // Even lower default drift factor for instant responsiveness

    // Velocity calculation with momentum
    const targetVelX = Math.cos(this.angle) * this.speed;
    const targetVelY = Math.sin(this.angle) * this.speed;

    this.vel.x = this.vel.x * driftFactor + targetVelX * (1 - driftFactor);
    this.vel.y = this.vel.y * driftFactor + targetVelY * (1 - driftFactor);

    // Position update
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;

    // World boundaries
    this.pos.x = Math.max(0, Math.min(WORLD_SIZE.width, this.pos.x));
    this.pos.y = Math.max(0, Math.min(WORLD_SIZE.height, this.pos.y));
  }
}
