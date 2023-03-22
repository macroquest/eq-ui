/**
 * eq-image is an image (animation) responding to the mouse press.
 * Used at Inventory Window autoequip slot IW_CharacterView / ClassAnim
 * Much of code is similar with eq-inv-slot
 */
import components from 'coherent-gameface-components';
import template from './template.html';
import { Attributes, BaseComponent, BindThis, Html } from '../base-component';
import { px } from '../helpers/helpers';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';
import { encodeKeyModifiers, EventLClick, EventRClick } from '../../eqevents';
import { EQ } from '../../eqengine';
import { AttrImage, AttrEnabled, AttrTooltip } from '../../eqconst';

type EqImageState = {
    itemInsideUrl: string | null;
    itemInsideElement: HTMLDivElement | null;
};

enum EqImageAttributes {
    Width = 'width',
    Height = 'height',
    ImageWidth = 'image-width',
    ImageHeight = 'image-height',
    TooltipContent = 'tooltip-content',
    Item = 'item',
    Dispatch = 'dispatch'
}
const watchedAttributes = [EqImageAttributes.TooltipContent] as const;

@Attributes(watchedAttributes)
@Html(template)
class EqImage extends BaseComponent {
    state: EqImageState = {
        itemInsideElement: null,
        itemInsideUrl: null
    };
    private keyPath = '';

    constructor() {
        super();

        this.keyPath = `${this.dispatch}.${this.item}`;
    }

    get dispatch() {
        return this.getAttribute(EqImageAttributes.Dispatch)!;
    }
    get item() {
        return this.getAttribute(EqImageAttributes.Item)!;
    }
    get keyEnabled() {
        return `${this.keyPath}.${AttrEnabled}`;
    }
    get keyTooltip() {
        return `${this.keyPath}.${AttrTooltip}`;
    }
    get keyImage() {
        return `${this.keyPath}.${AttrImage}`;
    }
    get width() {
        return this.getAttribute(EqImageAttributes.Width) || 0;
    }
    get height() {
        return this.getAttribute(EqImageAttributes.Height) || 0;
    }

    get imageWidth() {
        return this.getAttribute(EqImageAttributes.ImageWidth) || 0;
    }
    get imageHeight() {
        return this.getAttribute(EqImageAttributes.ImageHeight) || 0;
    }
    get tooltipContent() {
        return this.getAttribute(EqImageAttributes.TooltipContent);
    }

    @BindThis
    private onMouseup(e: MouseEvent) {
        let eventName = null;
        if (e.button === 0) eventName = EventLClick;
        if (e.button === 2) eventName = EventRClick;
        if (eventName) EQ.sendEvent(this.dispatch, this.keyPath, eventName, encodeKeyModifiers(e));
    }

    @BindThis
    private onMouseover() {
        if (this.tooltipContent) {
            tooltip.setElement(this);
        }
    }

    bindCpp(): void {
        EQ.bindValue(this.keyEnabled, '1', this, { notifyNow: false });
        EQ.bindValue(this.keyImage, '', this, { notifyNow: false });
        EQ.bindValue(this.keyTooltip, '', this, { notifyNow: false });
        this.updated();
    }

    updated() {
        const enabled = EQ.getValue(this.keyEnabled);
        if (enabled !== null) {
            if (enabled === '0') {
                this.style.opacity = '0';
                this.style.pointerEvents = 'none';
            } else {
                this.style.opacity = '1';
                this.style.pointerEvents = '';
            }
        }
        const tooltipText = EQ.getValue(this.keyTooltip);
        if (tooltipText !== null) {
            if (tooltipText !== '') {
                this.setAttribute(EqImageAttributes.TooltipContent, tooltipText);
            }
        }
        const image = EQ.getValue(this.keyImage);
        if (image) {
            this.state.itemInsideUrl = image;

            if (this.state.itemInsideUrl && this.state.itemInsideElement) {
                this.state.itemInsideElement.style.backgroundImage =
                    this.state.itemInsideUrl !== '' ? `url('${this.state.itemInsideUrl}')` : '';
            }
        } else {
            this.state.itemInsideUrl = null;
            if (this.state.itemInsideElement) {
                this.state.itemInsideElement.style.backgroundImage = '';
            }
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.state.itemInsideElement = this.querySelector('.item-inside');
                this.style.width = px(Number(this.width));
                this.style.height = px(Number(this.height));

                const container = this.querySelector('.container')! as HTMLDivElement;
                container.style.height = px(Number(this.imageHeight));
                container.style.width = px(Number(this.imageWidth));

                this.addEventListener('mouseup', this.onMouseup);
            })
            .catch((e) => {
                console.error(e);
            });
    }

    protected attributeChangedCallback(
        name: typeof watchedAttributes[number],
        oldValue: string | null,
        newValue: string | null
    ): void {
        switch (name) {
            case EqImageAttributes.TooltipContent: {
                if (newValue) {
                    this.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, newValue);
                    this.addEventListener('mouseover', this.onMouseover);
                }
            }
        }
    }
}
components.defineCustomElement('eq-image', EqImage);
export default EqImage;
