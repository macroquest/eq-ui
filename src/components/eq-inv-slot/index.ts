import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, BindThis, Html } from '../base-component';
import { px } from '../helpers/helpers';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';
import {
    encodeKeyModifiers,
    EventLLongUp,
    EventLClick,
    EventLLongClick,
    EventRLongUp,
    EventRClick,
    EventRLongClick
} from '../../eqevents';
import { EQ } from '../../eqengine';
import {
    AttrImage,
    AttrBackgrImage,
    AttrQuantity,
    AttrChargesEvolving,
    AttrEnabled,
    AttrTooltip,
    AttrCooldownValue,
    AttrCooldownColor
} from '../../eqconst';
import { cursorFollower } from '../../lib/eq-cursor-follower';

type EqInvSlotState = {
    isEnabled: boolean;
    isLongPress: boolean;
    longPressTimeout: NodeJS.Timeout | null;
    enabled: boolean;
};

const LONG_PRESS_DELAY = 500;

enum EqInvSlotAttributes {
    Width = 'width',
    Height = 'height',
    TooltipContent = 'tooltip-content',
    Item = 'item',
    Dispatch = 'dispatch',
    EqType = 'eq-type'
}

@Html(template)
class EqInvSlot extends BaseComponent {
    state: EqInvSlotState = {
        isEnabled: true,
        isLongPress: false,
        longPressTimeout: null,
        enabled: true
    };
    private itemInsideElement: HTMLDivElement | null = null;
    private cooldownElement!: HTMLDivElement;
    private keyPath = '';
    private itemInsideUrl: string | null = null;

    constructor() {
        super();

        this.keyPath = this.item;
    }

    get dispatch() {
        return this.getAttribute(EqInvSlotAttributes.Dispatch)!;
    }
    get item() {
        return this.getAttribute(EqInvSlotAttributes.Item)!;
    }
    get eqType() {
        return this.getAttribute(EqInvSlotAttributes.EqType);
    }
    get keyEnabled() {
        return `${this.keyPath}.${AttrEnabled}`;
    }
    get keyTooltip() {
        return `${this.keyPath}.${AttrTooltip}`;
    }
    get keyQuantity() {
        return `${this.keyPath}.${AttrQuantity}`;
    }
    get keyChargesEvolving() {
        return `${this.keyPath}.${AttrChargesEvolving}`;
    }
    get keyImage() {
        return `${this.keyPath}.${AttrImage}`;
    }
    get keyBackgrImage() {
        return `${this.keyPath}.${AttrBackgrImage}`;
    }
    get keyCooldownValue() {
        return `${this.keyPath}.${AttrCooldownValue}`;
    }
    get keyCooldownColor() {
        return `${this.keyPath}.${AttrCooldownColor}`;
    }

    get width() {
        return this.getAttribute(EqInvSlotAttributes.Width);
    }
    get height() {
        return this.getAttribute(EqInvSlotAttributes.Height);
    }
    get tooltipContent() {
        return this.getAttribute(EqInvSlotAttributes.TooltipContent);
    }

    @BindThis
    private onMousedown(e: MouseEvent) {
        // Notify cursorfollower
        cursorFollower.onDocumentMouseEvent(e);
        // NOTE: avoid calling context menu
        e.stopPropagation();

        this.state.isLongPress = false;
        if (this.state.longPressTimeout) {
            clearTimeout(this.state.longPressTimeout);
            this.state.longPressTimeout = null;
        }
        this.state.longPressTimeout = setTimeout(() => {
            this.state.isLongPress = true;

            if (this.state.longPressTimeout) {
                clearTimeout(this.state.longPressTimeout);
                this.state.longPressTimeout = null;
            }
            const evt = document.createEvent('MouseEvent');
            evt.initMouseEvent(
                'long-click',
                false,
                false,
                window,
                0,
                e.screenX,
                e.screenY,
                e.clientX,
                e.clientY,
                e.ctrlKey,
                e.altKey,
                e.shiftKey,
                e.metaKey,
                e.button,
                null
            );
            this.dispatchEvent(evt);
        }, LONG_PRESS_DELAY);
    }
    @BindThis
    private onMouseup(e: MouseEvent) {
        if (this.state.longPressTimeout) {
            clearTimeout(this.state.longPressTimeout);
            this.state.longPressTimeout = null;
        }
        if (this.state.isLongPress) {
            // NOTE: sending 'ButtonUp' events only for long presses
            let eventName = null;
            if (e.button === 0) eventName = EventLLongUp;
            if (e.button === 2) eventName = EventRLongUp;
            if (eventName) EQ.sendEvent(this.dispatch, this.keyPath, eventName, encodeKeyModifiers(e));
        } else {
            let eventName = null;
            if (e.button === 0) eventName = EventLClick;
            if (e.button === 2) eventName = EventRClick;
            if (eventName) EQ.sendEvent(this.dispatch, this.keyPath, eventName, encodeKeyModifiers(e));
        }
    }

    @BindThis
    private onLongClick(e: Event) {
        const evt = e as MouseEvent;
        let eventName = null;
        if (evt.button === 0) eventName = EventLLongClick;
        if (evt.button === 2) eventName = EventRLongClick;
        if (eventName) EQ.sendEvent(this.dispatch, this.keyPath, eventName, encodeKeyModifiers(evt));
    }

    @BindThis
    private onMouseover() {
        // We received tooltip from backend
        tooltip.setElement(this, true, this.keyTooltip); // Link to tooltip key, for dynamically showing cooldown timer
    }

    bindCpp(): void {
        EQ.bindValue(this.keyEnabled, '1', this);
        EQ.bindValue(this.keyImage, '', this);
        EQ.bindValue(this.keyBackgrImage, '', this);
        EQ.bindValue(this.keyQuantity, '', this);
        EQ.bindValue(this.keyChargesEvolving, '', this);
        EQ.bindValue(this.keyTooltip, '', this);

        EQ.bindValue(this.keyCooldownValue, '', this);
        EQ.bindValue(this.keyCooldownColor, '', this);
        this.updated();
    }

    updated() {
        const enabled = EQ.getValue(this.keyEnabled);
        if (enabled !== null) {
            if (enabled === '0') {
                if (this.state.enabled) {
                    this.state.enabled = false;
                    // NOTE: we use filter here, because 'this' already has opacity from 'can-change-opacity'
                    this.style.filter = 'opacity(0)';
                    this.style.pointerEvents = 'none';
                }
                return; // Discard updating of other properties is disabled
            } else {
                if (!this.state.enabled) {
                    this.state.enabled = true;
                    this.style.filter = 'opacity(1)';
                    this.style.pointerEvents = '';
                }
            }
        }

        const quantity = EQ.getValue(this.keyQuantity);
        if (quantity !== null) {
            /** TODO: empty items are labeled red, else green */
            //	if ( m_iQuantity == 0 ) textColor = c_crRed;
            // else textColor = c_crGreen;
            
            this.querySelector('.amount')!.innerHTML = quantity;
        }
        
        const chargesEvolving = EQ.getValue(this.keyChargesEvolving);
        if (chargesEvolving !== null)
        {
            this.querySelector('.chargesEvolving')!.innerHTML = chargesEvolving;
        }

        const image = EQ.getValue(this.keyImage);
        if (image) {
            this.itemInsideUrl = image;

            if (this.itemInsideUrl && this.itemInsideElement) {
                this.itemInsideElement.style.backgroundImage =
                    this.itemInsideUrl !== '' ? `url('${this.itemInsideUrl}')` : '';
            }
        } else {
            this.itemInsideUrl = null;
            if (this.itemInsideElement) {
                this.itemInsideElement.style.backgroundImage = '';
            }
        }

        const cooldownValue = EQ.getValue(this.keyCooldownValue);
        if (cooldownValue !== null) {
            //NOTE: 0..1, '' means cooldown is disabled
            if (cooldownValue !== '') {
                this.cooldownElement.style.height = `${Number(cooldownValue) * 100}%`;
                const cooldownColor = EQ.getValue(this.keyCooldownColor);
                if (cooldownColor) {
                    this.cooldownElement.style.backgroundColor = cooldownColor;
                }
            } else {
                this.cooldownElement.style.height = '0';
            }
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.itemInsideElement = this.querySelector('.item-inside');
                this.cooldownElement = this.querySelector('.cooldown')!;

                this.style.width = px(Number(this.width));
                this.style.height = px(Number(this.height));

                this.addEventListener('mouseover', this.onMouseover);
                this.addEventListener('mousedown', this.onMousedown);
                this.addEventListener('mouseup', this.onMouseup);
                this.addEventListener('long-click', this.onLongClick);
            })
            .catch((e) => {
                console.error(e);
            });
    }
}
components.defineCustomElement('eq-inv-slot', EqInvSlot);
export default EqInvSlot;
