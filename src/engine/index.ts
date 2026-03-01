import { Blob, Entity, Food } from './Entities';

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private lastTime: number = 0;
    private entities: Entity[] = [];
    private playerBlobs: Blob[] = [];
    private camera = { x: 0, y: 0, scale: 1 };
    private worldSize = 5000;
    private mousePos = { x: 0, y: 0 };
    private onGameOver: (stats: { mass: number }) => void;

    constructor(canvas: HTMLCanvasElement, onGameOver: (stats: { mass: number }) => void) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d')!;
        this.onGameOver = onGameOver;
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Initialize player
        const player = new Blob({
            id: 'player-1',
            position: { x: 0, y: 0 },
            velocity: { x: 0, y: 0 },
            mass: 15,
            radius: 0,
            color: '#3b82f6',
            type: 'player',
            name: 'YOU'
        });

        this.playerBlobs.push(player);
        this.entities.push(player);

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
            if (entity instanceof Blob) {
                if (entity.type === 'bot') {
                    // Simple bot logic: wander around
                    if (Math.random() < 0.01) {
                        entity.target = {
                            x: entity.position.x + (Math.random() - 0.5) * 500,
                            y: entity.position.y + (Math.random() - 0.5) * 500
                        };
                    }
                } else if (entity.type === 'player') {
                    // Follow mouse
                    entity.target = this.mouseToWorld(this.mousePos.x, this.mousePos.y);
                }
            }
            entity.update(dt);

            // Enforce world boundaries
            const halfSize = this.worldSize / 2;
            entity.position.x = Math.max(-halfSize + entity.radius, Math.min(halfSize - entity.radius, entity.position.x));
            entity.position.y = Math.max(-halfSize + entity.radius, Math.min(halfSize - entity.radius, entity.position.y));
        });

        // Handle collisions
        this.checkCollisions();

        // Camera follow group center
        if (this.playerBlobs.length > 0) {
            let avgX = 0, avgY = 0, totalMass = 0;
            this.playerBlobs.forEach(b => {
                avgX += b.position.x * b.mass;
                avgY += b.position.y * b.mass;
                totalMass += b.mass;
            });
            this.camera.x = avgX / totalMass;
            this.camera.y = avgY / totalMass;

            // Zoom out as total mass gets bigger
            const targetScale = Math.max(0.15, 1 / (1 + (Math.sqrt(totalMass) * 5 - 20) / 100));
            this.camera.scale += (targetScale - this.camera.scale) * 0.1;
        }
    }

    private mouseToWorld(x: number, y: number) {
        return {
            x: (x - this.canvas.width / 2) / this.camera.scale + this.camera.x,
            y: (y - this.canvas.height / 2) / this.camera.scale + this.camera.y
        };
    }

    private checkCollisions() {
        const food = this.entities.filter(e => e instanceof Food) as Food[];
        const bots = this.entities.filter(e => e instanceof Blob && e.type === 'bot') as Blob[];

        this.playerBlobs.forEach(blob => {
            // Eat food
            for (let i = food.length - 1; i >= 0; i--) {
                const item = food[i];
                const dx = blob.position.x - item.position.x;
                const dy = blob.position.y - item.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < blob.radius) {
                    blob.addMass(item.mass);
                    this.entities = this.entities.filter(e => e !== item);
                    this.spawnFood(1);
                }
            }

            // Eat bots
            bots.forEach(bot => {
                const dx = blob.position.x - bot.position.x;
                const dy = blob.position.y - bot.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < blob.radius && blob.mass > bot.mass * 1.1) {
                    blob.addMass(bot.mass);
                    this.entities = this.entities.filter(e => e !== bot);
                    this.spawnBots(1);
                } else if (dist < bot.radius && bot.mass > blob.mass * 1.1) {
                    // Bot eats player blob
                    this.playerBlobs = this.playerBlobs.filter(b => b !== blob);
                    this.entities = this.entities.filter(e => e !== blob);
                }
            });

            // Merge with other player blobs
            this.playerBlobs.forEach(other => {
                if (blob === other) return;
                const dx = blob.position.x - other.position.x;
                const dy = blob.position.y - other.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Merging logic: both blobs must be old enough
                const now = Date.now();
                const canMerge = (now - blob.splitTimestamp > 15000) && (now - other.splitTimestamp > 15000);

                if (dist < (blob.radius + other.radius) * 0.8) {
                    if (canMerge) {
                        blob.addMass(other.mass);
                        this.playerBlobs = this.playerBlobs.filter(b => b !== other);
                        this.entities = this.entities.filter(e => e !== other);
                    } else {
                        // Collision/Pushing logic
                        const angle = Math.atan2(dy, dx);
                        const pushDist = (blob.radius + other.radius) - dist;
                        other.position.x -= Math.cos(angle) * pushDist * 0.1;
                        other.position.y -= Math.sin(angle) * pushDist * 0.1;
                    }
                }
            });
        });

        // Bot vs Bot collisions
        bots.forEach(bot => {
            bots.forEach(other => {
                if (bot === other) return;
                const dx = bot.position.x - other.position.x;
                const dy = bot.position.y - other.position.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < bot.radius && bot.mass > other.mass * 1.1) {
                    bot.addMass(other.mass);
                    this.entities = this.entities.filter(e => e !== other);
                    this.spawnBots(1);
                }
            });
        });

        // Check for Game Over
        if (this.playerBlobs.length === 0) {
            this.handleGameOver();
        }
    }

    private handleGameOver() {
        console.log("GAME OVER");
        const finalMass = this.getPlayerMass();
        this.onGameOver({ mass: finalMass });

        const player = new Blob({
            id: `player-${Date.now()}`,
            position: { x: (Math.random() - 0.5) * 1000, y: (Math.random() - 0.5) * 1000 },
            velocity: { x: 0, y: 0 },
            mass: 15,
            radius: 0,
            color: '#3b82f6',
            type: 'player',
            name: 'YOU'
        });
        this.playerBlobs = [player];
        this.entities.push(player);
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
        this.mousePos = { x, y };
    }

    public setPlayerName(name: string) {
        this.playerBlobs.forEach(b => b.name = name);
    }

    public getPlayerMass(): number {
        return Math.floor(this.playerBlobs.reduce((sum, b) => sum + b.mass, 0));
    }

    public getLeaderboard() {
        return this.entities
            .filter(e => e instanceof Blob)
            .map(e => ({ name: (e as Blob).name, mass: Math.floor(e.mass) }))
            .sort((a, b) => b.mass - a.mass)
            .slice(0, 10);
    }

    public split() {
        if (this.playerBlobs.length >= 16) return;

        const newBlobs: Blob[] = [];
        this.playerBlobs.forEach(blob => {
            if (blob.mass >= 35) {
                const halfMass = blob.mass / 2;
                blob.mass = halfMass;
                blob.calculateRadius();
                blob.splitTimestamp = Date.now();

                const mouseWorld = this.mouseToWorld(this.mousePos.x, this.mousePos.y);
                const angle = Math.atan2(mouseWorld.y - blob.position.y, mouseWorld.x - blob.position.x);

                const splitBlob = new Blob({
                    id: `player-${Date.now()}-${Math.random()}`,
                    position: { ...blob.position },
                    velocity: {
                        x: Math.cos(angle) * 800,
                        y: Math.sin(angle) * 800
                    },
                    mass: halfMass,
                    radius: 0,
                    color: blob.color,
                    type: 'player',
                    name: blob.name
                });

                newBlobs.push(splitBlob);
            }
        });

        newBlobs.forEach(b => {
            this.playerBlobs.push(b);
            this.entities.push(b);
        });
    }

    public ejectMass() {
        this.playerBlobs.forEach(blob => {
            if (blob.mass >= 35) {
                const ejectMass = 15;
                blob.mass -= ejectMass;
                blob.calculateRadius();

                const mouseWorld = this.mouseToWorld(this.mousePos.x, this.mousePos.y);
                const angle = Math.atan2(mouseWorld.y - blob.position.y, mouseWorld.x - blob.position.x);

                const food = new Food(
                    `food-eject-${Date.now()}-${Math.random()}`,
                    blob.position.x + Math.cos(angle) * (blob.radius + 20),
                    blob.position.y + Math.sin(angle) * (blob.radius + 20),
                    blob.color
                );
                food.mass = ejectMass * 0.8;
                food.calculateRadius();
                food.velocity = {
                    x: Math.cos(angle) * 600,
                    y: Math.sin(angle) * 600
                };

                this.entities.push(food);
            }
        });
    }
}
