export class InputManager {
    private onMove: (x: number, y: number) => void;
    private onSplit: () => void;
    private onEject: () => void;

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
    }

    private initMouse() {
        window.addEventListener('mousemove', (e) => {
            this.onMove(e.clientX, e.clientY);
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
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                this.onMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) {
                this.onMove(e.touches[0].clientX, e.touches[0].clientY);
            }
            e.preventDefault(); // Prevent scrolling while playing
        }, { passive: false });
    }
}
