import components from 'coherent-gameface-components';
import { BaseComponent, Html } from '../base-component';
import template from './template.html';
import { EQ } from '../../eqengine';
import { clamp } from '../helpers/helpers';
import { AttrVisible, GaugeFullDraw } from '../../eqconst';

interface RGB {
    R: number;
    G: number;
    B: number;
}

const TINT_CHANGE = 80;

enum EqProgressBarAttributes {
    Item = 'item',
    Dispatch = 'dispatch',
    FillValue = 'exp-value',
    GaugeType = 'gauge-type',
    GaugeTint = 'gauge-tint',
    AltFillValue = 'alt-fill-value',
    AltGaugeType = 'alt-gauge-type',
    AltGaugeTint = 'alt-gauge-tint',
    MiddleGaugeTint = 'middle-gauge-tint'
}

export interface EqProgressBarValue {
    value: string;
    color: RGB | null;
}

@Html(template)
class EqProgressBar extends BaseComponent {
    private keyPath: string;
    private progressContainer!: HTMLDivElement;
    private linesContainer!: HTMLDivElement;
    private altContainer!: HTMLDivElement;
    private visible: boolean;
    gaugeTint: RGB;
    altGaugeTint: RGB;

    constructor() {
        super();
        this.keyPath = `${this.dispatch}.${this.item}`;
        this.value = '0%';
        this.altValue = '0%';
        this.visible = true;
    }

    get keyVisible() {
        return `${this.keyPath}.${AttrVisible}`;
    }

    private get item(): string {
        return this.getAttribute(EqProgressBarAttributes.Item)!;
    }
    private get dispatch() {
        return this.getAttribute(EqProgressBarAttributes.Dispatch) ?? '';
    }
    private get gaugeType(): string {
        return this.getAttribute(EqProgressBarAttributes.GaugeType)!;
    }

    private get defaultGaugeTint(): RGB {
        return this.hasAttribute(EqProgressBarAttributes.GaugeTint)
            ? this.convertToRGB(this.getAttribute(EqProgressBarAttributes.GaugeTint)!)
            : ({
                  R: 0,
                  G: 0,
                  B: 0
              } as RGB);
    }

    private get middleGaugeTint(): RGB {
        return this.hasAttribute(EqProgressBarAttributes.MiddleGaugeTint)
            ? this.convertToRGB(this.getAttribute(EqProgressBarAttributes.MiddleGaugeTint)!)
            : ({
                  R: 0,
                  G: 0,
                  B: 0
              } as RGB);
    }

    private get altGaugeType(): string {
        return this.getAttribute(EqProgressBarAttributes.AltGaugeType)!;
    }

    private get defaultAltGaugeTint(): RGB {
        return this.hasAttribute(EqProgressBarAttributes.AltGaugeTint)
            ? this.convertToRGB(this.getAttribute(EqProgressBarAttributes.AltGaugeTint)!)
            : ({
                  R: 0,
                  G: 0,
                  B: 0
              } as RGB);
    }

    private get value(): string {
        return this.getAttribute(EqProgressBarAttributes.FillValue)!;
    }

    private set value(value: string | null) {
        if (!value) {
            this.removeAttribute(EqProgressBarAttributes.FillValue);
        } else {
            this.setAttribute(EqProgressBarAttributes.FillValue, value);
        }
    }

    private get altValue(): string {
        return this.getAttribute(EqProgressBarAttributes.AltFillValue)!;
    }

    private set altValue(value: string | null) {
        if (!value) {
            this.removeAttribute(EqProgressBarAttributes.AltFillValue);
        } else {
            this.setAttribute(EqProgressBarAttributes.AltFillValue, value);
        }
    }

    bindCpp(): void {
        EQ.bindValue(this.keyVisible, '1', this);
        EQ.bindValue(this.gaugeType, this.value, this);
        EQ.bindValue(this.altGaugeType, this.altValue, this);
        EQ.registerKeySentEachFrame(this.gaugeType);
        EQ.registerKeySentEachFrame(this.altGaugeType);
        this.updated();
    }

    updated() {
        const isVisible = EQ.getValue(this.keyVisible);
        if (isVisible !== null) {
            if (isVisible === '0') {
                if (this.visible) {
                    this.visible = false;
                    // NOTE: we use filter here, because 'this' already has opacity from 'can-change-opacity'
                    this.style.filter = 'opacity(0)';
                    this.style.pointerEvents = 'none';
                }
                return; // Discard further updating
            } else {
                if (!this.visible) {
                    this.visible = true;
                    this.style.filter = 'opacity(1)';
                    this.style.pointerEvents = '';
                }
            }
        }

        // Possible values are 0%..100% and full-draw
        const value = this.parseValue(EQ.getValue(this.gaugeType)!);
        this.value = value.value;
        this.progressContainer.style.width = this.value;
        this.gaugeTint = value.color !== null ? value.color : this.defaultGaugeTint;

        this.linesContainer.style.width = ((this.widthToNumber(this.value) * 5) % 100) + '%';

        const altValue = this.parseValue(EQ.getValue(this.altGaugeType)!);
        this.altValue = altValue.value;
        this.altContainer.style.width = this.altValue;
        this.altGaugeTint = altValue.color !== null ? altValue.color : this.defaultAltGaugeTint;

        this.setBackgroundColors();
    }

    parseValue(value: string): EqProgressBarValue {
        if (value === GaugeFullDraw) {
            const v = {
                value: '100%',
                color: { R: 128, G: 0, B: 0 } // c_crSTMLMaroon
            };
            return v;
        } else {
            const v = {
                value: value,
                color: null
            };
            return v;
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.gaugeTint = this.defaultGaugeTint;
                this.altGaugeTint = this.defaultAltGaugeTint;
                this.setBackgroundColors();
                this.setGaugesHeights();
                this.progressContainer = this.querySelector('.progress-fill')!;
                this.linesContainer = this.querySelector('.middle-fill')!;
                this.altContainer = this.querySelector('.alt-progress-fill')!;
                this.progressContainer.style.width = this.value;
                this.linesContainer.style.width = ((this.widthToNumber(this.value) * 5) % 100) + '%';
                this.altContainer.style.width = this.altValue;
            })
            .catch((e) => {
                console.error(e);
            });
    }

    setGaugesHeights() {
        const mainProgress = this.querySelector('.tint') as HTMLDivElement;
        const altProgress = this.querySelector('.alt-tint') as HTMLDivElement;
        const middleContainer = this.querySelector('.middle-tint') as HTMLDivElement;

        if (this.hasAttribute(EqProgressBarAttributes.AltGaugeType)) {
            mainProgress.style.height = '33%';
            altProgress.style.height = '20%'; //'33%';
        } else {
            mainProgress.style.height = '65%';
            altProgress.style.height = '0';
        }

        if (this.hasAttribute(EqProgressBarAttributes.MiddleGaugeTint)) {
            middleContainer.style.height = '15%';
        } else {
            middleContainer.style.height = '0';
        }
    }

    changeDown(v: number) {
        return clamp(v - TINT_CHANGE, 0, 255);
    }
    changeUp(v: number) {
        return clamp(v + TINT_CHANGE, 0, 255);
    }

    setBackgroundColors(): void {
        const mainProgress = this.querySelector('.tint') as HTMLDivElement;
        const altProgress = this.querySelector('.alt-tint') as HTMLDivElement;
        const middleContainer = this.querySelector('.middle-tint') as HTMLDivElement;

        const gaugeTint = this.gaugeTint;
        const altGaugeTint = this.altGaugeTint;

        mainProgress.style.backgroundColor = `rgb(${gaugeTint.R}, ${gaugeTint.G}, ${gaugeTint.B})`;
        mainProgress.style.backgroundImage = `linear-gradient(0deg, rgb(
            ${this.changeDown(gaugeTint.R)}, 
            ${this.changeDown(gaugeTint.G)}, 
            ${this.changeDown(gaugeTint.B)}), rgb(
                ${this.changeUp(gaugeTint.R)}, 
                ${this.changeUp(gaugeTint.G)}, 
                ${this.changeUp(gaugeTint.B)}))`;

        altProgress.style.backgroundImage = `linear-gradient(0deg, rgb(
            ${this.changeDown(altGaugeTint.R)}, 
            ${this.changeDown(altGaugeTint.G)}, 
            ${this.changeDown(altGaugeTint.B)}), rgb(
                ${this.changeUp(altGaugeTint.R)}, 
                ${this.changeUp(altGaugeTint.G)}, 
                ${this.changeUp(altGaugeTint.B)}))`;

        middleContainer.style.backgroundColor = `rgb(${this.middleGaugeTint.R}, ${this.middleGaugeTint.G}, ${this.middleGaugeTint.B})`;
    }

    private widthToNumber(width: string): number {
        return Number(width.slice(0, -1));
    }

    private convertToRGB(tint: string): RGB {
        const tintArr = tint.split('|');
        return {
            R: Number(tintArr[0]) || 0,
            G: Number(tintArr[1]) || 0,
            B: Number(tintArr[2]) || 0
        } as RGB;
    }
}

components.defineCustomElement('eq-progress-bar', EqProgressBar);
export default EqProgressBar;
