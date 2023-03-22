import { translate } from '../helpers/helpers';
import { debounce } from 'throttle-debounce';
import { BindThis } from '../base-component';
import { EQ } from '../../eqengine';
import { TOOLTIP_RELATIVE_Z } from '../../eqconst';

const TOOLTIP_OFFSET_X = 0;
const TOOLTIP_OFFSET_Y = -16;
const CURSOR_HEIGHT = 38;

const calcTooltipPosition = (width: number, height: number, position: { x: number; y: number }) => {
    const coords = { x: position.x, y: position.y };

    if (position.x + width > window.innerWidth) {
        coords.x = window.innerWidth - width;
    }

    if (position.x < 0) {
        coords.x = 0;
    }

    if (position.y + height > window.innerHeight) {
        coords.y = window.innerHeight - height;
    }

    if (position.y < 0) {
        coords.y = position.y + CURSOR_HEIGHT;
    }

    return coords;
};

export const TOOLTIP_CONTENT_ATTRIBUTE = 'tooltip-content-attribute';

export class EqTooltip {
    private container!: HTMLElement;
    private contentBox!: HTMLElement;
    private element!: HTMLElement;
    private key: string | null;
    private _isVisible = false;

    private debouncedMousemove = debounce(500, this.onMousemove);

    constructor() {
        this.key = null;
        this.attachContainer();
    }

    public get isVisible() {
        return this._isVisible;
    }

    private set isVisible(value: boolean) {
        this._isVisible = value;
        if (value) {
            this.container.style.visibility = 'visible';
        } else {
            this.container.style.visibility = 'hidden';
        }
    }

    @BindThis
    private onMousemove(evt: MouseEvent) {
        const { scrollHeight, scrollWidth } = this.container;
        const { x, y } = calcTooltipPosition(scrollWidth, scrollHeight, {
            x: evt.clientX + TOOLTIP_OFFSET_X,
            y: evt.clientY + TOOLTIP_OFFSET_Y
        });

        this.container.style.transform = translate(x, y);

        this.show();
    }
    @BindThis
    private onMouseout(evt: MouseEvent) {
        this.debouncedMousemove?.cancel({ upcomingOnly: true });
        this.hide();
    }

    // Show tooltip
    // if key isn't null, text is binded to a given key
    public setElement(element: HTMLElement, isDebounce = true, key: string | null = null) {
        this.unbindKey();
        this.removeElementListeners();
        this.element = element;
        this.addElementListeners(isDebounce);

        if (key !== null) {
            EQ.bindValue(key, '', this);
            this.key = key;
            this.updated();
        } else {
            this.updateContent();
        }
    }

    public unbindKey() {
        EQ.removeNotifications(this);
        this.key = null;
    }

    public show() {
        this.isVisible = true;
    }

    public hide() {
        this.isVisible = false;
    }

    // Static update from element's attribute
    public updateContent() {
        let content = '';
        if (this.element) {
            content = this.element.getAttribute(TOOLTIP_CONTENT_ATTRIBUTE) || '';
        }
        if (content === 'null') {
            content = '';
        }
        this.contentBox.textContent = content;
    }

    // Dynamic update from key
    public updated() {
        if (this.key !== null) {
            const text = EQ.getValue(this.key);
            this.contentBox.textContent = text;
        }
    }

    private addElementListeners(isDebounced?: boolean) {
        this.element.addEventListener('mousemove', isDebounced ? this.debouncedMousemove : this.onMousemove);
        this.element.addEventListener('mouseout', this.onMouseout);
    }

    private removeElementListeners() {
        this.element?.removeEventListener('mousemove', this.onMousemove);
        this.element?.removeEventListener('mousemove', this.debouncedMousemove);
        this.element?.removeEventListener('mouseout', this.onMouseout);
    }

    private attachContainer() {
        this.container = document.createElement('tooltip');
        this.container.classList.add('tooltip');
        this.contentBox = document.createElement('div');
        this.contentBox.classList.add('content');
        const background = document.createElement('div');
        background.classList.add('tooltip-background');
        this.container.appendChild(background);
        this.container.appendChild(this.contentBox);

        this.container.style.zIndex = TOOLTIP_RELATIVE_Z;
        this.isVisible = false;
        document.body.appendChild(this.container);
    }
}

export const tooltip = new EqTooltip();
