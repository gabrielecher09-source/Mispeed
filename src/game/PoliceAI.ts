import { Car } from './Car';
import { Vector2D } from '../constants';

export class PoliceAI extends Car {
  target: Car | null = null;
  state: 'patrol' | 'chase' | 'intercept' | 'box-in' = 'patrol';
  patrolPoint: Vector2D;

  constructor(x: number, y: number, config: any) {
    super(x, y, config, 'police');
    this.patrolPoint = { x, y };
  }

  updateAI(player: Car) {
    const dist = Math.hypot(player.pos.x - this.pos.x, player.pos.y - this.pos.y);
    
    if (dist < 1000) {
      this.state = 'chase';
      if (dist < 200) this.state = 'intercept';
    } else {
      this.state = 'patrol';
    }

    const input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      nitro: false,
      drift: false
    };

    if (this.state === 'chase' || this.state === 'intercept') {
      // Direct pursuit logic
      const targetPos = { ...player.pos };
      
      // Predict player position if far away
      if (dist > 300) {
        targetPos.x += player.vel.x * 20;
        targetPos.y += player.vel.y * 20;
      }

      const angleToTarget = Math.atan2(targetPos.y - this.pos.y, targetPos.x - this.pos.x);
      let angleDiff = angleToTarget - this.angle;

      // Normalize angle
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (angleDiff > 0.05) input.right = true;
      if (angleDiff < -0.05) input.left = true;

      input.forward = true;
      
      // Use nitro if far away or closing in for a ram
      if (dist > 300 || dist < 100) input.nitro = true;
      
      // Drift if sharp turn needed
      if (Math.abs(angleDiff) > 0.4) input.drift = true;
    } else {
      // Patrol logic (move towards patrol point)
      const angleToPatrol = Math.atan2(this.patrolPoint.y - this.pos.y, this.patrolPoint.x - this.pos.x);
      let angleDiff = angleToPatrol - this.angle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      if (Math.hypot(this.patrolPoint.x - this.pos.x, this.patrolPoint.y - this.pos.y) > 50) {
        if (angleDiff > 0.1) input.right = true;
        if (angleDiff < -0.1) input.left = true;
        input.forward = true;
      }
    }

    super.update(input);
  }
}
