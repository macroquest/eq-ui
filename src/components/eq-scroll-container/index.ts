import components from 'coherent-gameface-components';
import template from './template.html';
import { Attributes, BaseComponent, BindThis, Html } from '../base-component';
import { Draggable } from '../../lib/eq-draggable';
import { px } from '../helpers/helpers';

const SCROLL_OFFSET = 10;
const LONG_PRESS_DELAY = 100;
const SCROLL_INTERVAL = 40;
const ARROW_MAX_HEIGHT = 22;
const SCROLL_MIN_HEIGHT = 54;

type EqScrollContainerState = {
    isLongPress: boolean;
    interval?: NodeJS.Timeout;
    longPressTimeout?: NodeJS.Timeout;
};

enum EqScrollContainerAttributes {
    Horizontal = 'horizontal',
    Autohide = 'autohide',
    Disabled = 'disabled',
    Height = 'height'
}
const watchedAttributes = [EqScrollContainerAttributes.Disabled] as const;

@Attributes(watchedAttributes)
@Html(template)
class EqScrollContainer extends BaseComponent {
    private state: EqScrollContainerState = { isLongPress: false };
    private container!: HTMLElement;
    private content!: HTMLElement;
    private slotContent!: HTMLElement;
    private scrollbar!: HTMLElement;
    private track!: HTMLElement;
    private arrowUp!: HTMLElement;
    private arrowDown!: HTMLElement;
    private handle!: HTMLElement;
    private slotObserver!: MutationObserver;

    private draggableRef!: Draggable;

    constructor() {
        super();

        const mutation: MutationCallback = (mutationList) => {
            for (const mutation of mutationList) {
                if (mutation.type === 'childList') {
                    components.waitForFrames(() => {
                        this.currentScrollOnScrollAreaInPixels = 0;
                        this.resize();
                    }, 2);
                }
            }
        };
        this.slotObserver = new MutationObserver(mutation);
    }

    private get isVertical() {
        return !this.hasAttribute(EqScrollContainerAttributes.Horizontal);
    }

    private get isAutohide() {
        return this.hasAttribute(EqScrollContainerAttributes.Autohide);
    }

    private get handleSize() {
        const containerRect = this.content.getBoundingClientRect();
        const size = this.isVertical
            ? containerRect.height / this.maxScrollOnScrollAreaInPixels
            : containerRect.width / this.maxScrollOnScrollAreaInPixels;
        if (size >= 1 || isNaN(size)) return 1;
        return size;
    }

    private get height(): string {
        return this.getAttribute(EqScrollContainerAttributes.Height) || '0';
    }

    private get handleOffset() {
        const offset = this.isVertical
            ? this.currentScrollOnScrollAreaInPixels / this.slotContentRect.height
            : this.currentScrollOnScrollAreaInPixels / this.slotContentRect.width;
        return offset;
    }

    private get slotContentRect() {
        return this.slotContent.getBoundingClientRect();
    }

    private get trackRect() {
        return this.track.getBoundingClientRect();
    }

    private get maxScrollOnScrollAreaInPixels() {
        if (this.isVertical) {
            return this.content.scrollHeight;
        } else {
            return this.content.scrollWidth;
        }
    }

    private get currentScrollOnScrollAreaInPixels() {
        if (this.isVertical) {
            return this.content.scrollTop;
        } else {
            return this.content.scrollLeft;
        }
    }

    private set currentScrollOnScrollAreaInPixels(value) {
        if (this.isVertical) {
            this.content.scrollTop = value;
        } else {
            this.content.scrollLeft = value;
        }
    }

    @BindThis
    private onScroll(e: Event) {
        this.updateHandle();
        if (this.isVertical) {
            this.draggableRef.setCoordinates({
                y: (this.currentScrollOnScrollAreaInPixels / this.slotContentRect.height) * this.trackRect.height
            });
        } else {
            this.draggableRef.setCoordinates({
                x: (this.currentScrollOnScrollAreaInPixels / this.slotContentRect.width) * this.trackRect.width
            });
        }
    }
    @BindThis
    private onMousedownArrowUp(e: MouseEvent) {
        if (e.button !== 0) return;

        this.arrowUp.classList.add('pressed');

        const toScroll = () => {
            this.currentScrollOnScrollAreaInPixels -= SCROLL_OFFSET;
            this.updateHandle();
        };

        this.state.longPressTimeout = setTimeout(() => {
            this.state.isLongPress = true;
            this.state.interval = setInterval(() => {
                toScroll();
            }, SCROLL_INTERVAL);
        }, LONG_PRESS_DELAY);

        if (!this.state.isLongPress) {
            toScroll();
        }
    }
    @BindThis
    private onMousedownArrowDown(e: MouseEvent) {
        if (e.button !== 0) return;

        this.arrowDown.classList.add('pressed');

        const toScroll = () => {
            this.currentScrollOnScrollAreaInPixels += SCROLL_OFFSET;
            this.updateHandle();
        };

        this.state.longPressTimeout = setTimeout(() => {
            this.state.isLongPress = true;
            this.state.interval = setInterval(() => {
                toScroll();
            }, SCROLL_INTERVAL);
        }, LONG_PRESS_DELAY);

        if (!this.state.isLongPress) {
            toScroll();
        }
    }
    @BindThis
    private onMouseupArrowUp() {
        this.arrowUp.classList.remove('pressed');
        this.state.isLongPress = false;
        if (this.state.interval) {
            clearInterval(this.state.interval);
        }
        if (this.state.longPressTimeout) {
            clearTimeout(this.state.longPressTimeout);
        }
    }
    @BindThis
    private onMouseupArrowDown() {
        this.arrowDown.classList.remove('pressed');
        this.state.isLongPress = false;
        if (this.state.interval) {
            clearInterval(this.state.interval);
        }
        if (this.state.longPressTimeout) {
            clearTimeout(this.state.longPressTimeout);
        }
    }
    @BindThis
    private onTrackMousedown(e: MouseEvent) {
        if (e.button !== 0) return;

        const trackOffset = this.isVertical ? this.trackRect.top : this.trackRect.left;
        const trackBoundary = this.isVertical ? this.trackRect.height : this.trackRect.width;
        const cursorPosition = this.isVertical ? e.clientY : e.clientX;

        const cursorRelativePosition = cursorPosition - trackOffset;
        const cursorRelativePositionPercents = cursorRelativePosition / trackBoundary;

        this.currentScrollOnScrollAreaInPixels = this.slotContentRect.height * cursorRelativePositionPercents;

        this.updateHandle();
    }

    shouldSetCustomHeight(): boolean {
        return this.hasAttribute(EqScrollContainerAttributes.Height);
    }

    resize() {
        components.waitForFrames(() => {
            if (this.isAutohide) {
                if (this.handleSize > 0.99) {
                    this.scrollbar.style.display = 'none';
                    this.container.style.paddingRight = '0';
                } else {
                    this.scrollbar.style.display = '';
                    this.container.style.paddingRight = '';
                }
            }
            const scrollbarHeight = this.scrollbar.getBoundingClientRect().height;
            if (this.trackRect.height === 0 && scrollbarHeight < SCROLL_MIN_HEIGHT) {
                this.arrowUp.style.height = px(Math.min((scrollbarHeight - SCROLL_OFFSET) / 2, ARROW_MAX_HEIGHT));
                this.arrowDown.style.height = px(Math.min((scrollbarHeight - SCROLL_OFFSET) / 2, ARROW_MAX_HEIGHT));
            } else {
                this.arrowUp.style.height =
                    this.arrowUp.getBoundingClientRect().height < ARROW_MAX_HEIGHT
                        ? px(Math.min((scrollbarHeight - SCROLL_OFFSET) / 2, ARROW_MAX_HEIGHT))
                        : px(ARROW_MAX_HEIGHT);
                this.arrowDown.style.height =
                    this.arrowDown.getBoundingClientRect().height < ARROW_MAX_HEIGHT
                        ? px(Math.min((scrollbarHeight - SCROLL_OFFSET) / 2, ARROW_MAX_HEIGHT))
                        : px(ARROW_MAX_HEIGHT);
            }

            this.updateHandle();
        });
    }
    attributeChangedCallback(
        name: typeof watchedAttributes[number],
        oldValue: string | null,
        newValue: string | null
    ): void {
        switch (name) {
            case EqScrollContainerAttributes.Disabled:
                if (newValue !== null) {
                    this.handle.style.display = 'none';
                } else {
                    this.handle.style.display = '';
                }
                break;
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.container = this.querySelector('.container')!;
                this.content = this.querySelector('.content')!;
                this.slotContent = this.querySelector('.content')!.firstElementChild as HTMLElement;
                this.scrollbar = this.querySelector('.scrollbar')!;
                this.track = this.querySelector('.track')!;
                this.arrowUp = this.querySelector('.arrow-up')!;
                this.arrowDown = this.querySelector('.arrow-down')!;
                this.handle = this.querySelector('.handle')!;

                this.slotObserver.observe(this.slotContent, { childList: true, subtree: true });

                if (!this.isVertical) {
                    this.container.classList.add('horizontal');
                }
                if (this.shouldSetCustomHeight()) {
                    this.container.style.height = this.height;
                }

                components.waitForFrames(() => {
                    this.draggableRef = new Draggable(this.track, [this.handle], {
                        initialX: this.currentScrollOnScrollAreaInPixels,
                        initialY: this.currentScrollOnScrollAreaInPixels,
                        stopPropagation: { onMouseDown: true },
                        onChangePosition: (x, y) => {
                            if (this.isVertical) {
                                this.currentScrollOnScrollAreaInPixels =
                                    (y / this.trackRect.height) * this.slotContentRect.height;
                            } else {
                                this.currentScrollOnScrollAreaInPixels =
                                    (x / this.trackRect.width) * this.slotContentRect.width;
                            }
                            this.updateHandle();
                        }
                    });
                }, 1);

                this.content.addEventListener('scroll', this.onScroll);
                this.arrowUp.addEventListener('mousedown', this.onMousedownArrowUp);
                document.addEventListener('mouseup', this.onMouseupArrowUp);
                this.arrowDown.addEventListener('mousedown', this.onMousedownArrowDown);
                document.addEventListener('mouseup', this.onMouseupArrowDown);
                this.track.addEventListener('mousedown', this.onTrackMousedown);
                this.handle.addEventListener('click', (e: MouseEvent) => e.stopPropagation());

                components.waitForFrames(() => this.resize());
            })
            .catch((e) => {
                console.error(e);
            });
    }

    disconnectedCallback(): void {
        this.slotObserver.disconnect();
        this.draggableRef?.destroy();
        document.removeEventListener('mouseup', this.onMouseupArrowUp);
        document.removeEventListener('mouseup', this.onMouseupArrowDown);
    }

    private updateHandle() {
        if (this.handleSize === 1) {
            this.setAttribute(EqScrollContainerAttributes.Disabled, '');
        } else {
            this.removeAttribute(EqScrollContainerAttributes.Disabled);
        }
        if (this.isVertical) {
            this.handle.style.height = this.handleSize * 100 + '%';
            this.handle.style.top = this.handleOffset * 100 + '%';
            this.draggableRef.setCoordinates({
                y: this.handleOffset * this.trackRect.height
            });
        } else {
            this.handle.style.width = this.handleSize * 100 + '%';
            this.handle.style.left = this.handleOffset * 100 + '%';
            this.draggableRef.setCoordinates({
                x: this.handleOffset * this.trackRect.width
            });
        }
    }
}
components.defineCustomElement('eq-scroll-container', EqScrollContainer);
export default EqScrollContainer;
