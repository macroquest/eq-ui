import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, BindThis, Html } from '../base-component';
import { cohColorMatrix, px } from '../helpers/helpers';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';
import { EventSelItem } from '../../eqevents';
import { EQ } from '../../eqengine';
import { AttrEnabled, AttrText, ListSeparator, AttrVisible } from '../../eqconst';

type EqButtonState = {
    isPressed: boolean;
    isEnabled: boolean;
    isMousedown: boolean;
};

enum EqButtonAttributes {
    BackgroundTint = 'background-tint',
    Disabled = 'disabled',
    Dispatch = 'dispatch',
    Item = 'item',
    Height = 'height',
    Text = 'text',
    TextTint = 'text-tint',
    TooltipContent = 'tooltip-content',
    Width = 'width'
}

@Html(template)
class EqButton extends BaseComponent {
    state: EqButtonState = { isPressed: false, isEnabled: true, isMousedown: false };

    private keyPath = '';
    private background!: HTMLDivElement;
    private textElement!: HTMLDivElement;
    visible: boolean;

    constructor() {
        super();

        this.keyPath = `${this.dispatch}.${this.item}`;
        this.visible = true;
    }

    get dispatch() {
        return this.getAttribute(EqButtonAttributes.Dispatch)!;
    }

    get disabled(): boolean {
        return this.hasAttribute(EqButtonAttributes.Disabled);
    }

    get item() {
        return this.getAttribute(EqButtonAttributes.Item)!;
    }

    get text() {
        return this.getAttribute(EqButtonAttributes.Text)!;
    }

    get keyEnabled() {
        return `${this.keyPath}.${AttrEnabled}`;
    }

    get keyText() {
        return `${this.keyPath}.${AttrText}`;
    }

    get width() {
        return this.getAttribute(EqButtonAttributes.Width);
    }

    get height() {
        return this.getAttribute(EqButtonAttributes.Height);
    }

    get backgroundTint() {
        return this.getAttribute(EqButtonAttributes.BackgroundTint);
    }

    get textTint() {
        return this.getAttribute(EqButtonAttributes.TextTint);
    }

    get tooltipContent() {
        return this.getAttribute(EqButtonAttributes.TooltipContent);
    }

    private get isPressed() {
        return this.state.isPressed;
    }
    
    get keyVisible() {
        return `${this.keyPath}.${AttrVisible}`;
    }

    private set isPressed(value: boolean) {
        this.state.isPressed = value;
        if (value) {
            this.classList.add('pressed');
        } else {
            this.classList.remove('pressed');
        }
    }

    private get isDisabled() {
        return !this.state.isEnabled;
    }

    private set isDisabled(value: boolean) {
        if (value) {
            this.state.isEnabled = false;
            this.classList.add('disabled');
            this.background.style.filter = '';
            this.textElement.style.filter = '';
        } else {
            this.state.isEnabled = true;
            this.classList.remove('disabled');
            this.addBackgroundTint();
            this.addTextTint();
        }
    }

    @BindThis
    private onMousedown(e: MouseEvent) {
        if (e.button !== 0) return;
        this.isPressed = true;
        this.state.isMousedown = true;
    }

    @BindThis
    private onMouseup(e: MouseEvent) {
        if (this.state.isMousedown) {
            EQ.sendEvent(this.dispatch, this.keyPath, EventSelItem, '');
        }
        this.isPressed = false;
        this.state.isMousedown = false;
    }

    @BindThis
    private onMouseover() {
        if (this.state.isMousedown) {
            this.isPressed = true;
        }
        tooltip.setElement(this);
    }

    @BindThis
    private onMouseout() {
        this.isPressed = false;
    }

    updated() {
        const text = EQ.getValue(this.keyText);
        if (text !== null) {
            this.textElement.innerHTML = text;
        }
        const enabled = EQ.getValue(this.keyEnabled);

        this.isDisabled = enabled === '0' || enabled === 'false' ? true : false;

        const isVisible = EQ.getValue(this.keyVisible);
        if (isVisible !== null) {
            if (isVisible === '0') {
                if (this.visible) {
                    this.visible = false;
                    // NOTE: we use filter here, because BaseComponent sets opacity=1 at third frame
                    this.style.filter = 'opacity(0)';
                    this.style.pointerEvents = 'none';
                }
                return;
            } else {
                if (!this.visible) {
                    this.visible = true;
                    this.style.filter = 'opacity(1)';
                    this.style.pointerEvents = '';
                }
            }
        }
    }

    bindCpp(): void {
        EQ.bindValue(this.keyText, this.text, this);
        EQ.bindValue(this.keyEnabled, '1', this);
        this.updated();
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.background = this.querySelector('.background')!;
                this.textElement = this.querySelector('.text')!;
                this.textElement.innerHTML = this.text;
                this.style.width = px(Number(this.width));
                this.style.height = px(Number(this.height));

                if (this.disabled) {
                    this.isDisabled = true;
                }

                if (!this.isDisabled) {
                    this.addTextTint();
                    this.addBackgroundTint();
                }

                if (this.tooltipContent) {
                    this.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, this.tooltipContent);
                    this.addEventListener('mouseover', this.onMouseover);
                }
                this.addEventListener('mousedown', this.onMousedown);
                this.addEventListener('mouseup', this.onMouseup);
                this.addEventListener('mouseout', this.onMouseout);
            })
            .catch((e) => {
                console.error(e);
            });
    }

    private addBackgroundTint() {
        if (!this.backgroundTint) return;
        const [r, g, b] = this.backgroundTint.split(ListSeparator).map((color) => Number(color) / 255);

        this.background.style.filter = cohColorMatrix(r, g, b);
    }
    private addTextTint() {
        if (!this.textTint) return;

        const [r, g, b] = this.textTint.split(ListSeparator).map((color) => Number(color) / 255);

        this.textElement.style.filter = cohColorMatrix(r, g, b);
    }
}

components.defineCustomElement('eq-button', EqButton);
export default EqButton;
