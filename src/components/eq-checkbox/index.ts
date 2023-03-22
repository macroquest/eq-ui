import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, BindThis, Html } from '../base-component';
import { EQ } from '../../eqengine';
import { EventSelItem } from '../../eqevents';
import { AttrEnabled, AttrChecked } from '../../eqconst';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';
enum EqCheckboxAttributes {
    Item = 'item',
    Dispatch = 'dispatch',
    TooltipContent = 'tooltip-content',
    Checked = 'checked',
    Enabled = 'enabled',
    Label = 'label',
    StateChecked = 'state-checked',
    StateDisabled = 'state-disabled'
}
@Html(template)
class EqCheckbox extends BaseComponent {
    private box: HTMLDivElement | null = null;
    private labelContainer: HTMLElement | null = null;
    private keyPath: string;

    constructor() {
        super();
        this.keyPath = `${this.dispatch}.${this.item}`;

        this.checked = '1';
        this.enabled = '1';
    }

    get label(): string {
        return this.getAttribute(EqCheckboxAttributes.Label)!;
    }

    get tooltipContent(): string | null {
        return this.getAttribute(EqCheckboxAttributes.TooltipContent);
    }

    private get item(): string {
        return this.getAttribute(EqCheckboxAttributes.Item)!;
    }

    private get dispatch(): string {
        return this.getAttribute(EqCheckboxAttributes.Dispatch)!;
    }

    private get keyChecked(): string {
        return `${this.keyPath}.${AttrChecked}`;
    }

    private get keyEnabled(): string {
        return `${this.keyPath}.${AttrEnabled}`;
    }

    private get checked(): string {
        return this.getAttribute(EqCheckboxAttributes.StateChecked)!;
    }

    private set checked(value: string | null) {
        if (value === this.checked) {
            return;
        }
        if (value == '1' || value == 'true') {
            this.setAttribute(EqCheckboxAttributes.StateChecked, value);
            this.labelContainer?.classList.add('c-yellow');
        } else {
            this.removeAttribute(EqCheckboxAttributes.StateChecked);
            this.labelContainer?.classList.remove('c-yellow');
        }
    }

    private get enabled(): string {
        const isDisabled = this.getAttribute(EqCheckboxAttributes.StateDisabled);
        return isDisabled ? '0' : '1';
    }

    private set enabled(value: string | null) {
        if (value === this.enabled) {
            return;
        }
        if (value === '1' || value === 'true') {
            this.removeAttribute(EqCheckboxAttributes.StateDisabled);
        } else {
            this.setAttribute(EqCheckboxAttributes.StateDisabled, '');
        }
    }

    @BindThis
    private onMousedown(e: MouseEvent): void {
        if (e.button !== 0) return;

        if (!this.enabled) return;
        const newChecked = !this.checked ? '1' : '0';
        this.checked = newChecked;

        EQ.sendEvent(this.dispatch, this.keyPath, EventSelItem, newChecked);
        EQ.updateValue(this.keyChecked, newChecked, this);
    }

    bindCpp(): void {
        EQ.bindValue(this.keyChecked, this.checked, this);
        EQ.bindValue(this.keyEnabled, this.enabled, this);
        this.updated();
    }

    updated(): void {
        const isChecked = EQ.getValue(this.keyChecked);
        const isEnabled = EQ.getValue(this.keyEnabled);
        this.checked = isChecked;
        this.enabled = isEnabled;

        if (this.checked) {
            this.labelContainer?.classList.add('c-yellow');
        } else {
            this.labelContainer?.classList.remove('c-yellow');
        }
    }

    connectedCallback(): void {
        this.componentRendered()
            .then(() => {
                this.querySelector('.label')!.innerHTML = this.label;
                this.box = this.querySelector('.checkbox')!;
                this.box.addEventListener('mousedown', this.onMousedown);
                this.labelContainer = this.querySelector('.label')!;
                this.labelContainer.addEventListener('mousedown', this.onMousedown);
                if (this.tooltipContent) {
                    this.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, this.tooltipContent);
                    this.addEventListener('mouseover', () => tooltip.setElement(this));
                }
            })
            .catch((e) => {
                console.error(e);
            });
    }
}
components.defineCustomElement('eq-checkbox', EqCheckbox);
export default EqCheckbox;
