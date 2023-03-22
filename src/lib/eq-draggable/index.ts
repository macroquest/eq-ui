import components from 'coherent-gameface-components';
import { BindThis } from '../../components/base-component';

interface Coords {
    x: number;
    y: number;
}
interface Options {
    initialX?: number;
    initialY?: number;
    onStart?: () => void;
    onFinish?: () => void;
    onChangePosition: (x: number, y: number) => void;
    stopPropagation?: { onMouseDown: boolean };
}
export class Draggable {
    private root!: HTMLElement;
    private options?: Options;
    private controlSelectors!: HTMLElement[];
    private x!: number;
    private y!: number;
    private cursorPosition: Coords | null = null;

    constructor(root: HTMLElement, controlSelectors: HTMLElement[], options: Options) {
        this.root = root;
        this.controlSelectors = controlSelectors;
        this.options = options;

        this.setCoordinates({ x: this.options?.initialX ?? 0, y: this.options?.initialY ?? 0 });

        this.addListeners();
    }

    @BindThis
    private onMouseUp() {
        if (this.options?.onFinish) {
            this.options?.onFinish();
        }
        this.controlSelectors.forEach((selector) => {
            selector.addEventListener('mousemove', this.onMouseMove);
        });
        components.waitForFrames(() => {
            document?.removeEventListener('mouseup', this.onMouseUp);
            document?.removeEventListener('mousemove', this.onDrag);
        }, 1);
    }
    @BindThis
    private onDrag(e: MouseEvent) {
        const x = e.clientX - this.cursorPosition!.x;
        const y = e.clientY - this.cursorPosition!.y;

        this.x = x;
        this.y = y;
        this.options?.onChangePosition(this.x, this.y);
    }
    @BindThis
    private onMouseMove(e: MouseEvent) {
        if (e.button !== 0) return;

        const x = e.clientX - this.x; // x position within the element.
        const y = e.clientY - this.y; // y position within the element.

        this.cursorPosition = { x, y };
    }
    @BindThis
    private onMouseDown(e: MouseEvent) {
        if (e.button !== 0) return;
        if (this.options?.onStart) {
            this.options?.onStart();
        }
        if (this.options?.stopPropagation?.onMouseDown) {
            e.stopPropagation();
        }

        this.controlSelectors.forEach((selector) => {
            selector.removeEventListener('mousemove', this.onMouseMove);
        });
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('mousemove', this.onDrag);
    }

    public setCoordinates(coords: Partial<Coords>) {
        this.x = coords.x ?? this.x;
        this.y = coords.y ?? this.y;
    }

    public destroy() {
        this.controlSelectors.forEach((selector) => {
            selector.removeEventListener('mousedown', this.onMouseDown);
            selector.removeEventListener('mousemove', this.onMouseMove);
        });
    }

    private addListeners() {
        this.controlSelectors.forEach((selector) => {
            selector.addEventListener('mousedown', this.onMouseDown);
            selector.addEventListener('mousemove', this.onMouseMove);
        });
    }
}
