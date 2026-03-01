export interface Vector {
    x: number;
    y: number;
}

export interface EntityState {
    id: string;
    position: Vector;
    velocity: Vector;
    mass: number;
    radius: number;
    color: string;
    type: 'player' | 'bot' | 'food' | 'virus';
    name?: string;
}

export abstract class Entity {
    id: string;
    position: Vector;
    velocity: Vector;
    mass: number;
    radius: number;
    color: string;
    type: 'player' | 'bot' | 'food' | 'virus';
    name?: string;

    friction: number = 0.98;

    constructor(state: EntityState) {
        this.id = state.id;
        this.position = { ...state.position };
        this.velocity = { ...state.velocity };
        this.mass = state.mass;
        this.radius = state.radius;
        this.color = state.color;
        this.type = state.type;
        this.name = state.name;
    }

    update(dt: number) {
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        // Apply friction to velocity
        this.velocity.x *= Math.pow(this.friction, dt * 60);
        this.velocity.y *= Math.pow(this.friction, dt * 60);
    }

    abstract draw(ctx: CanvasRenderingContext2D, camera: { x: number, y: number, scale: number }): void;

    calculateRadius() {
        this.radius = Math.sqrt(this.mass / Math.PI) * 10;
    }

    addMass(amount: number) {
        this.mass += amount;
        this.calculateRadius();
    }
}

export class Food extends Entity {
    constructor(id: string, x: number, y: number, color: string) {
        super({
            id,
            position: { x, y },
            velocity: { x: 0, y: 0 },
            mass: 1,
            radius: 4,
            color,
            type: 'food'
        });
        this.calculateRadius();
    }

    draw(ctx: CanvasRenderingContext2D, _camera: { x: number, y: number, scale: number }) {
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

export class Blob extends Entity {
    target: Vector = { x: 0, y: 0 };
    speed: number = 200;

    splitTimestamp: number = 0;

    constructor(state: EntityState) {
        super(state);
        this.calculateRadius();
        this.splitTimestamp = Date.now();
    }

    update(dt: number) {
        // Basic movement towards target
        const dx = this.target.x - this.position.x;
        const dy = this.target.y - this.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            const angle = Math.atan2(dy, dx);
            // Speed decreases as mass increases
            const currentSpeed = this.speed / Math.pow(this.mass, 0.1);

            // Blend target velocity with current velocity to allow impulses (split/eject) to persist
            const targetVelX = Math.cos(angle) * currentSpeed;
            const targetVelY = Math.sin(angle) * currentSpeed;

            // Smoothly move towards target velocity
            this.velocity.x += (targetVelX - this.velocity.x) * 0.1;
            this.velocity.y += (targetVelY - this.velocity.y) * 0.1;
        }

        super.update(dt);
    }

    draw(ctx: CanvasRenderingContext2D, _camera: { x: number, y: number, scale: number }) {
        ctx.save();

        // Draw blob body
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        // Draw name
        if (this.name) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.max(12, this.radius / 2)}px Inter, system-ui`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 5;
            ctx.shadowColor = 'black';
            ctx.fillText(this.name, this.position.x, this.position.y);
        }

        ctx.restore();
    }
}

export class Virus extends Entity {
    constructor(id: string, x: number, y: number, mass: number = 50) {
        super({
            id,
            position: { x, y },
            velocity: { x: 0, y: 0 },
            mass,
            radius: 0,
            color: '#22c55e',
            type: 'virus'
        });
        this.calculateRadius();
        this.radius *= 1.1; // Viruses look slightly bigger for their mass
    }

    draw(ctx: CanvasRenderingContext2D, _camera: { x: number, y: number, scale: number }) {
        ctx.save();
        ctx.beginPath();
        const spikes = 20;
        const innerRadius = this.radius * 0.8;
        const outerRadius = this.radius;

        for (let i = 0; i < spikes * 2; i++) {
            const angle = (i * Math.PI) / spikes;
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const x = this.position.x + Math.cos(angle) * r;
            const y = this.position.y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#15803d';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
}

export type PowerUpType = 'SPEED' | 'SHIELD' | 'MASS';

export class PowerUp extends Entity {
    powerType: PowerUpType;
    duration: number = 10000; // 10 seconds default

    constructor(id: string, x: number, y: number, type: PowerUpType) {
        const colors = {
            'SPEED': '#fbbf24', // Amber/Yellow
            'SHIELD': '#22d3ee', // Cyan
            'MASS': '#f472b6'    // Pink
        };

        super({
            id,
            position: { x, y },
            velocity: { x: 0, y: 0 },
            mass: 20,
            radius: 20,
            color: colors[type],
            type: 'food' // Treat as food for basic collision, but refine in Game.ts
        });
        this.powerType = type;
        this.radius = 25;
    }

    draw(ctx: CanvasRenderingContext2D, _camera: { x: number, y: number, scale: number }) {
        ctx.save();

        // Outer glow
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.fill();

        // Inner circle
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius * 0.7, 0, Math.PI * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon/Text placeholder
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icon = this.powerType === 'SPEED' ? '⚡' : this.powerType === 'SHIELD' ? '🛡️' : '💎';
        ctx.fillText(icon, this.position.x, this.position.y);

        ctx.restore();
    }
}
