export class InputManager {
    private onMove: (x: number, y: number) => void;
    private onSplit: () => void;
    private onEject: () => void;

    private controlMode: 'follow' | 'joystick' = 'follow';
    private buttonPosition: 'left' | 'right' = 'right';
    private isJoystickActive = false;
    private joystickStartPos = { x: 0, y: 0 };
    private joystickCurrentPos = { x: 0, y: 0 };
    private joystickMaxRadius = 50;

    constructor(handlers: {
        onMove: (x: number, y: number) => void;
        onSplit: () => void;
        onEject: () => void;
    }) {
        this.onMove = handlers.onMove;
        this.onSplit = handlers.onSplit;
        this.onEject = handlers.onEject;

        this.initMouse();
        this.initKeyboard();
        this.initTouch();
        this.initUI();
    }

    private initMouse() {
        window.addEventListener('mousemove', (e) => {
            if (this.controlMode === 'follow') {
                this.onMove(e.clientX, e.clientY);
            }
        });
    }

    private initKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                this.onSplit();
            } else if (e.code === 'KeyW') {
                this.onEject();
            }
        });
    }

    private initTouch() {
        const joystickContainer = document.getElementById('joystickContainer');
        const joystickKnob = document.getElementById('joystickKnob');

        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];

                // If in follow mode, treat like mouse
                if (this.controlMode === 'follow') {
                    this.onMove(touch.clientX, touch.clientY);
                }
                // Joystick logic handled via container events
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                if (this.controlMode === 'follow') {
                    this.onMove(touch.clientX, touch.clientY);
                }
            }
            e.preventDefault();
        }, { passive: false });

        // Joystick Event Listeners
        if (joystickContainer && joystickKnob) {
            joystickContainer.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                const rect = joystickContainer.getBoundingClientRect();
                this.joystickStartPos = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
                this.isJoystickActive = true;
                e.stopPropagation();
            });

            window.addEventListener('touchmove', (e) => {
                if (!this.isJoystickActive) return;

                const touch = e.touches[0]; // Simplified: just track the first touch

                if (touch) {
                    const dx = touch.clientX - this.joystickStartPos.x;
                    const dy = touch.clientY - this.joystickStartPos.y;
                    const angle = Math.atan2(dy, dx);
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    const limitedDist = Math.min(dist, this.joystickMaxRadius);
                    const moveX = Math.cos(angle) * limitedDist;
                    const moveY = Math.sin(angle) * limitedDist;

                    joystickKnob.style.transform = `translate(${moveX}px, ${moveY}px)`;

                    // Convert joystick vector to screen "target" for the engine
                    const screenCenterX = window.innerWidth / 2;
                    const screenCenterY = window.innerHeight / 2;
                    this.onMove(
                        screenCenterX + Math.cos(angle) * 1000,
                        screenCenterY + Math.sin(angle) * 1000
                    );
                }
            });

            window.addEventListener('touchend', () => {
                if (this.isJoystickActive) {
                    this.isJoystickActive = false;
                    joystickKnob.style.transform = `translate(0px, 0px)`;
                    // Keep current target or stop? Usually keep last direction in IO games
                }
            });
        }
    }

    private initUI() {
        const splitBtn = document.getElementById('splitBtn');
        const throwBtn = document.getElementById('throwBtn');

        splitBtn?.addEventListener('touchstart', (e) => {
            this.onSplit();
            e.stopPropagation();
        });

        throwBtn?.addEventListener('touchstart', (e) => {
            this.onEject();
            e.stopPropagation();
        });

        // Mouse support for buttons too
        splitBtn?.addEventListener('mousedown', (e) => {
            this.onSplit();
            e.stopPropagation();
        });
        throwBtn?.addEventListener('mousedown', (e) => {
            this.onEject();
            e.stopPropagation();
        });
    }

    public setControlMode(mode: 'follow' | 'joystick') {
        this.controlMode = mode;
        const joystickContainer = document.getElementById('joystickContainer');
        const actionButtons = document.getElementById('actionButtons');

        if (mode === 'joystick') {
            if (joystickContainer) joystickContainer.style.display = 'flex';
            if (actionButtons) actionButtons.style.display = 'flex';
        } else {
            if (joystickContainer) joystickContainer.style.display = 'none';
            if (actionButtons) actionButtons.style.display = 'none';
        }
    }

    public setButtonPosition(position: 'left' | 'right') {
        this.buttonPosition = position;
        const joystickContainer = document.getElementById('joystickContainer');
        const actionButtons = document.getElementById('actionButtons');

        if (position === 'left') {
            actionButtons?.classList.add('left');
            joystickContainer?.classList.add('right');
        } else {
            actionButtons?.classList.remove('left');
            joystickContainer?.classList.remove('right');
        }
    }
}
