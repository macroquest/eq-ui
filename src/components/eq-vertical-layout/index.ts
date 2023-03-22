import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, BindThis, Html } from '../base-component';
import '../eq-box';
import { clamp, px } from '../helpers/helpers';
import EqScrollContainer from '../eq-scroll-container';
import { windowManager } from '../../lib/eq-window-manager';

enum EqVerticalLayoutAttributes {
    Autostretch = 'autostretch',
    StyleDividers = 'style-dividers'
}

const MIN_HEIGHT = 50;

@Html(template)
class EqBox extends BaseComponent {
    scrollContainers!: NodeListOf<EqScrollContainer>;
    mouseDownY = 0;
    container!: HTMLDivElement;
    divider!: HTMLDivElement;
    topFrame!: HTMLDivElement;
    bottomFrame!: HTMLDivElement;
    rect!: DOMRect;

    constructor() {
        super();
    }

    get autostretch(): boolean {
        return this.hasAttribute(EqVerticalLayoutAttributes.StyleDividers);
    }

    get styleDividers(): boolean {
        return this.hasAttribute(EqVerticalLayoutAttributes.StyleDividers);
    }

    @BindThis
    onResizeMouseDown(event: MouseEvent): void {
        this.rect = this.getBoundingClientRect();
        this.mouseDownY = event.clientY - this.rect.y;
        this.topFrame.classList.add('cursor-resize');
        this.bottomFrame.classList.add('cursor-resize');
        document.addEventListener('mousemove', this.resize);
        document.addEventListener('mouseup', this.onResizeMouseup);
    }

    @BindThis
    onResizeMouseup(): void {
        document?.removeEventListener('mousemove', this.resize);
        document?.removeEventListener('mouseup', this.onResizeMouseup);
        this.topFrame.classList.remove('cursor-resize');
        this.bottomFrame.classList.remove('cursor-resize');
    }

    @BindThis
    resize(event: MouseEvent): void {
        const change = this.mouseDownY - (event.clientY - this.rect.y);
        const newTopHeight = clamp(this.topFrame.getBoundingClientRect().height - change);
        const newBottomHeight = clamp(this.bottomFrame.getBoundingClientRect().height + change);
        if (newTopHeight > MIN_HEIGHT && newBottomHeight > MIN_HEIGHT) {
            this.topFrame.style.height = px(newTopHeight / windowManager.scaleUI);
            this.bottomFrame.style.height = px(newBottomHeight / windowManager.scaleUI);
            this.mouseDownY -= change;

            this.scrollContainers.forEach((scrollContainer) => {
                scrollContainer.resize();
            });
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.container = this.querySelector('.vertical-layout')! as HTMLDivElement;
                this.divider = this.querySelector('.divider')! as HTMLDivElement;
                this.divider.addEventListener('mousedown', (event) => this.onResizeMouseDown(event as MouseEvent));
                this.topFrame = this.querySelector('.top')! as HTMLDivElement;
                this.bottomFrame = this.querySelector('.bottom')! as HTMLDivElement;
                this.scrollContainers = this.querySelectorAll('eq-scroll-container');
            })
            .catch((e) => {
                console.error(e);
            });
    }
}

components.defineCustomElement('eq-vertical-layout', EqBox);
export default EqBox;
