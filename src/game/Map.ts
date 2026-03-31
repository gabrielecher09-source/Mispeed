import { WORLD_SIZE, COLORS } from '../constants';

export interface MapElement {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'building' | 'tree' | 'road' | 'obstacle';
}

export class GameMap {
  elements: MapElement[] = [];
  roads: MapElement[] = [];

  constructor() {
    this.generateMap();
  }

  generateMap() {
    // Generate Roads
    for (let x = 0; x < WORLD_SIZE.width; x += 800) {
      this.roads.push({ x, y: 0, width: 100, height: WORLD_SIZE.height, type: 'road' });
    }
    for (let y = 0; y < WORLD_SIZE.height; y += 800) {
      this.roads.push({ x: 0, y, width: WORLD_SIZE.width, height: 100, type: 'road' });
    }

    // Generate Elements (Buildings in the middle, Trees elsewhere)
    const cityStart = 2400;
    const cityEnd = 7600;

    for (let x = 0; x < WORLD_SIZE.width; x += 800) {
      for (let y = 0; y < WORLD_SIZE.height; y += 800) {
        // Check if we are in the "City Center" (Middle of the map)
        const isCity = x >= cityStart && x < cityEnd && y >= cityStart && y < cityEnd;

        if (isCity) {
          // Dense buildings in the center
          this.elements.push({
            x: x + 150,
            y: y + 150,
            width: 500,
            height: 500,
            type: 'building'
          });
        } else {
          // Trees in the outskirts
          for (let i = 0; i < 3; i++) {
            this.elements.push({
              x: x + Math.random() * 600 + 100,
              y: y + Math.random() * 600 + 100,
              width: 40,
              height: 40,
              type: 'tree'
            });
          }
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, viewport: { x: number; y: number; width: number; height: number }) {
    // Draw roads
    ctx.fillStyle = COLORS.road;
    this.roads.forEach(r => {
      if (this.isInViewport(r, viewport)) {
        ctx.fillRect(r.x - viewport.x, r.y - viewport.y, r.width, r.height);
        // Road lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        if (r.width > r.height) {
          ctx.moveTo(r.x - viewport.x, r.y + r.height / 2 - viewport.y);
          ctx.lineTo(r.x + r.width - viewport.x, r.y + r.height / 2 - viewport.y);
        } else {
          ctx.moveTo(r.x + r.width / 2 - viewport.x, r.y - viewport.y);
          ctx.lineTo(r.x + r.width / 2 - viewport.x, r.y + r.height - viewport.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });

    // Draw elements
    this.elements.forEach(e => {
      if (this.isInViewport(e, viewport)) {
        if (e.type === 'building') {
          ctx.fillStyle = '#333';
          ctx.strokeStyle = COLORS.neonBlue;
          ctx.lineWidth = 2;
          ctx.fillRect(e.x - viewport.x, e.y - viewport.y, e.width, e.height);
          ctx.strokeRect(e.x - viewport.x, e.y - viewport.y, e.width, e.height);
          
          // Windows
          ctx.fillStyle = 'rgba(0, 242, 255, 0.1)';
          for(let wx = 20; wx < e.width - 20; wx += 40) {
            for(let wy = 20; wy < e.height - 20; wy += 40) {
              ctx.fillRect(e.x + wx - viewport.x, e.y + wy - viewport.y, 20, 20);
            }
          }
        } else if (e.type === 'tree') {
          ctx.fillStyle = COLORS.grass;
          ctx.beginPath();
          ctx.arc(e.x + e.width / 2 - viewport.x, e.y + e.height / 2 - viewport.y, e.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = COLORS.neonGreen;
          ctx.stroke();
        }
      }
    });
  }

  private isInViewport(e: MapElement, v: any) {
    return e.x + e.width > v.x && e.x < v.x + v.width && e.y + e.height > v.y && e.y < v.y + v.height;
  }
}
