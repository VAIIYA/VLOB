import { Blob, Entity, Food } from './Entities';

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lastTime: number = 0;
    private entities: Entity[] = [];
    private player: Blob;
    private camera = { x: 0, y: 0, scale: 1 };
    private worldSize = 5000;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Initialize player
        this.player = new Blob({
            id: 'player-1',
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            mass: 10,
            radius: 0,
            color: '#3b82f6',
            type: 'player',
            name: 'YOU'
        });

        this.entities.push(this.player);

        // Initial food
        this.spawnFood(200);
        // Initial bots
        this.spawnBots(10);

        requestAnimationFrame(this.loop.bind(this));
    }

    private resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    private spawnFood(count: number) {
        const colors = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * this.worldSize;
            const y = (Math.random() - 0.5) * this.worldSize;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.entities.push(new Food(`food-${Date.now()}-${i}`, x, y, color));
        }
    }

    private spawnBots(count: number) {
        const names = ['Rex', 'Zorg', 'Alpha', 'Beta', 'Gamer', 'Bot99', 'Blobbie'];
        const colors = ['#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * this.worldSize;
            const y = (Math.random() - 0.5) * this.worldSize;
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.entities.push(new Blob({
                id: `bot-${i}`,
                position: { x, y },
                velocity: { x: 0, y: 0 },
                mass: 10 + Math.random() * 20,
                radius: 0,
                color,
                type: 'bot',
                name: names[Math.floor(Math.random() * names.length)]
            }));
        }
    }

    private loop(time: number) {
        const dt = (time - this.lastTime) / 1000;
        this.lastTime = time;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop.bind(this));
    }

    private update(dt: number) {
        // Update player target from mouse (will be handled by InputManager later)
        // For now, let's just make it follow mouse directly if we have events

        this.entities.forEach(entity => {
            if (entity instanceof Blob && entity.type === 'bot') {
                // Simple bot logic: wander around
                if (Math.random() < 0.01) {
                    entity.target = {
                        x: entity.position.x + (Math.random() - 0.5) * 500,
                        y: entity.position.y + (Math.random() - 0.5) * 500
                    };
                }
            }
            entity.update(dt);
        });

        // Handle collisions
        this.checkCollisions();

        // Camera follow player
        this.camera.x = this.player.position.x;
        this.camera.y = this.player.position.y;

        // Zoom out as player gets bigger
        const targetScale = Math.max(0.2, 1 / (1 + (this.player.radius - 20) / 100));
        this.camera.scale += (targetScale - this.camera.scale) * 0.1;
    }

    private checkCollisions() {
        const blobs = this.entities.filter(e => e instanceof Blob) as Blob[];
        const food = this.entities.filter(e => e instanceof Food) as Food[];

        blobs.forEach(blob => {
            // Eat food
            for (let i = food.length - 1; i >= 0; i--) {
                const item = food[i];
                const dx = blob.position.x - item.position.x;
                const dy = blob.position.y - item.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < blob.radius) {
                    blob.addMass(item.mass);
                    this.entities = this.entities.filter(e => e !== item);
                    // Respawn food
                    this.spawnFood(1);
                }
            }

            // Eat other blobs
            blobs.forEach(other => {
                if (blob === other) return;
                const dx = blob.position.x - other.position.x;
                const dy = blob.position.y - other.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < blob.radius && blob.mass > other.mass * 1.1) {
                    blob.addMass(other.mass);
                    this.entities = this.entities.filter(e => e !== other);
                    if (other === this.player) {
                        console.log("GAME OVER");
                        // Reset player for now
                        this.player.mass = 10;
                        this.player.calculateRadius();
                        this.player.position = { x: 0, y: 0 };
                    } else {
                        this.spawnBots(1);
                    }
                }
            });
        });
    }

    private draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        // Apply camera transformation
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(this.camera.scale, this.camera.scale);
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Draw grid
        this.drawGrid();

        // Draw world border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 10;
        this.ctx.strokeRect(-this.worldSize / 2, -this.worldSize / 2, this.worldSize, this.worldSize);

        // Draw entities
        this.entities.sort((a, b) => a.mass - b.mass).forEach(entity => {
            entity.draw(this.ctx, this.camera);
        });

        this.ctx.restore();
    }

    private drawGrid() {
        const gridSize = 100;
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        for (let x = -this.worldSize / 2; x <= this.worldSize / 2; x += gridSize) {
            this.ctx.moveTo(x, -this.worldSize / 2);
            this.ctx.lineTo(x, this.worldSize / 2);
        }
        for (let y = -this.worldSize / 2; y <= this.worldSize / 2; y += gridSize) {
            this.ctx.moveTo(-this.worldSize / 2, y);
            this.ctx.lineTo(this.worldSize / 2, y);
        }
        this.ctx.stroke();
    }

    public setPlayerTarget(x: number, y: number) {
        // Convert screen center-relative mouse to world coordinates
        const worldX = (x - this.canvas.width / 2) / this.camera.scale + this.camera.x;
        const worldY = (y - this.canvas.height / 2) / this.camera.scale + this.camera.y;
        this.player.target = { x: worldX, y: worldY };
    }

    public setPlayerName(name: string) {
        this.player.name = name;
    }

    public getPlayerMass(): number {
        return Math.floor(this.player.mass);
    }

    public getLeaderboard() {
        return this.entities
            .filter(e => e instanceof Blob)
            .map(e => ({ name: (e as Blob).name, mass: Math.floor(e.mass) }))
            .sort((a, b) => b.mass - a.mass)
            .slice(0, 10);
    }

    public split() {
        // Implementation for splitting the player blob
        // This would involve creating a new blob with half the player's mass
        // and giving it an initial velocity away from the original blob.
        // For now, it's a placeholder.
        console.log("Player split action triggered.");
    }

    public ejectMass() {
        // Implementation for ejecting mass from the player blob
        // This would involve reducing player's mass and creating a small food pellet
        // in the direction of player's movement or target.
        // For now, it's a placeholder.
        console.log("Player eject mass action triggered.");
    }
}
