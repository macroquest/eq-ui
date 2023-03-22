import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, BindThis, Html } from '../base-component';
import { EQ } from '../../eqengine';
import { EventSelItem } from '../../eqevents';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';
import { AttrEnabled, AttrChecked, AttrHotkey } from '../../eqconst';

enum EqToggleButtonAttributes {
    Item = 'item',
    Dispatch = 'dispatch',
    TooltipContent = 'tooltip-content',
    Checked = 'checked',
    Enabled = 'enabled',
    Hotkey = 'hotkey',
    Text = 'text'
}

@Html(template)
class EqToggleButton extends BaseComponent {
    private keyPath: string;

    constructor() {
        super();
        this.keyPath = `${this.dispatch}.${this.item}`;
        this.addEventListener('mousedown', this.onMousedown);
    }

    get item() {
        return this.getAttribute(EqToggleButtonAttributes.Item)!;
    }

    get dispatch() {
        return this.getAttribute(EqToggleButtonAttributes.Dispatch)!;
    }
    get text() {
        return this.getAttribute(EqToggleButtonAttributes.Text);
    }

    get tooltipContent() {
        return String(this.getAttribute(EqToggleButtonAttributes.TooltipContent));
    }

    private get keyChecked() {
        return `${this.keyPath}.${AttrChecked}`;
    }
    private get keyEnabled() {
        return `${this.keyPath}.${AttrEnabled}`;
    }
    private get keyHotkey() {
        return `${this.keyPath}.${AttrHotkey}`;
    }

    @BindThis
    onMousedown(e: MouseEvent) {
        if (e.button !== 0) return;

        EQ.sendEvent(this.dispatch, this.keyPath, EventSelItem, '');
    }

    bindCpp(): void {
        EQ.bindValue(this.keyChecked, '0', this);
        EQ.bindValue(this.keyEnabled, '1', this);
        this.updated();
    }

    updated() {
        const currentValue = EQ.getValue(this.keyChecked);
        if (currentValue === '1' || currentValue === 'true') {
            this.classList.add('checked', currentValue);
        } else {
            this.classList.remove('checked');
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                if (this.text) {
                    this.querySelector('.text')!.innerHTML = this.text;
                }
                components.waitForFrames(() => {
                    this.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, this.tooltipContent + EQ.getValue(this.keyHotkey));
                }, 1);

                this.addEventListener('mouseover', () => {
                    tooltip.setElement(this);
                });
            })
            .catch((e) => {
                console.error(e);
            });
    }
}
components.defineCustomElement('eq-toggle-button', EqToggleButton);
export default EqToggleButton;
