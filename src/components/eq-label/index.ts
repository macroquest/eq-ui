import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, BindThis, Html } from '../base-component';
import { px } from '../helpers/helpers';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';
import { EQ } from '../../eqengine';
import { AttrColor, AttrVisible } from '../../eqconst';

enum EqLabelAttributes {
    Item = 'item',
    Dispatch = 'dispatch',
    Text = 'text',
    Width = 'width',
    Height = 'height',
    TooltipContent = 'tooltip-content',
    LabelType = 'label-type',
    /** Used in CSS file */
    NoWrap = 'no-wrap',
    /** Used in CSS file */
    AlignRight = 'align-right'
}

@Html(template)
class EqLabel extends BaseComponent {
    private keyPath: string;
    textElement!: HTMLDivElement;
    visible: boolean;
    constructor() {
        super();
        this.keyPath = `${this.dispatch}.${this.item}`;
        this.visible = true;
    }
    get item() {
        return this.getAttribute(EqLabelAttributes.Item);
    }
    get dispatch() {
        return this.getAttribute(EqLabelAttributes.Dispatch) ?? '';
    }
    get text() {
        return this.getAttribute(EqLabelAttributes.Text)!;
    }
    get width() {
        return this.getAttribute(EqLabelAttributes.Width);
    }
    get height() {
        return this.getAttribute(EqLabelAttributes.Height);
    }
    get tooltipContent() {
        return this.getAttribute(EqLabelAttributes.TooltipContent);
    }
    get labelType() {
        return this.getAttribute(EqLabelAttributes.LabelType);
    }
    get labelTypeColor() {
        if (this.labelType) {
            return `${this.labelType}.${AttrColor}`;
        } else {
            return '';
        }
    }

    get keyVisible() {
        return `${this.keyPath}.${AttrVisible}`;
    }

    @BindThis
    private onMouseover() {
        tooltip.setElement(this);
    }

    bindCpp(): void {
        EQ.bindValue(this.keyVisible, '1', this);
        if (this.labelType) {
            EQ.bindValue(this.labelType, this.text, this, { notifyNow: true });
            EQ.registerKeySentEachFrame(this.labelType);
            EQ.bindValue(this.labelTypeColor, '', this, { notifyNow: true });
            // NOTE: We don't need to add color to "sent each frame", it's updated automatically with labelType
        }
        this.updated();
    }

    updated() {
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
        if (this.labelType) {
            const text = EQ.getValue(this.labelType);
            if (text !== null) {
                this.textElement.innerHTML = text;
            }
            const color = EQ.getValue(this.labelTypeColor);
            if (color && color.length > 0) {
                this.style.color = color;
            }
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.textElement = this.querySelector('.text')!;
                this.textElement.innerHTML = this.text;
                if (this.width) {
                    this.style.width = px(Number(this.width));
                }
                if (this.height) {
                    this.style.height = px(Number(this.height));
                }

                if (this.tooltipContent) {
                    this.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, this.tooltipContent);
                    this.addEventListener('mouseover', this.onMouseover);
                }
            })
            .catch((e) => {
                console.error(e);
            });
    }
}
components.defineCustomElement('eq-label', EqLabel);
export default EqLabel;
