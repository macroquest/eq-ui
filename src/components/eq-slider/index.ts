import components from 'coherent-gameface-components';
import template from './template.html';
import { Attributes, BaseComponent, BindThis, Html } from '../base-component';
import { EQ } from '../../eqengine';
import { AttrMax, AttrMin, AttrStep, AttrValue } from '../../eqconst';
import { clamp } from '../helpers/helpers';
import { EventValueChange } from '../../eqevents';

enum EqSliderAttributes {
    Item = 'item',
    Value = 'value',
    Dispatch = 'dispatch',
    Min = 'min',
    Max = 'max',
    Step = 'step'
}
interface EqSliderState {
    value: number;
    isPressed: boolean;
    isHovered: boolean;
}

const watchedAttributes = [EqSliderAttributes.Min, EqSliderAttributes.Max, EqSliderAttributes.Step] as const;

@Html(template)
@Attributes(watchedAttributes)
class EqSlider extends BaseComponent {
    private keyPath: string;
    private thumb!: HTMLDivElement;
    private track!: HTMLDivElement;
    private percentsInOneStep = 0;

    private state: EqSliderState = { value: 0, isPressed: false, isHovered: false };

    constructor() {
        super();
        this.keyPath = `${this.dispatch}.${this.item}`;
    }

    private get dispatch() {
        return this.getAttribute(EqSliderAttributes.Dispatch)!;
    }

    private get item() {
        return this.getAttribute(EqSliderAttributes.Item);
    }

    private get min() {
        return Number(this.getAttribute(EqSliderAttributes.Min) ?? 0);
    }

    private get max() {
        return Number(this.getAttribute(EqSliderAttributes.Max) ?? 100);
    }

    private get step() {
        return Number(this.getAttribute(EqSliderAttributes.Step) ?? 1);
    }

    private get steps() {
        return (this.max - this.min) / this.step;
    }

    private get keyValue() {
        return `${this.keyPath}.${AttrValue}`;
    }

    private get keyMax() {
        return `${this.keyPath}.${AttrMax}`;
    }

    private get keyMin() {
        return `${this.keyPath}.${AttrMin}`;
    }

    private get keyStep() {
        return `${this.keyPath}.${AttrStep}`;
    }

    private get trackRect() {
        return this.track.getBoundingClientRect();
    }

    private get value() {
        return this.state.value;
    }

    private set value(value: number) {
        this.state.value = value;
        this.updateGeometry();
    }

    private get isPressed() {
        return this.state.isPressed;
    }

    private set isPressed(value: boolean) {
        this.state.isPressed = value;
        if (value) {
            this.classList.add('pressed');
        } else {
            this.classList.remove('pressed');
        }
    }

    private get isHovered() {
        return this.state.isHovered;
    }

    private set isHovered(value: boolean) {
        this.state.isHovered = value;
        if (value) {
            this.thumb.classList.add('hovered');
        } else {
            this.thumb.classList.remove('hovered');
        }
    }

    @BindThis
    private onMousedownTrack(e: MouseEvent) {
        if (e.button !== 0) return;
        this.isHovered = true;
        this.isPressed = true;
        this.updateThumbPosition();
        this.setValueFromMousePos(e.clientX);

        document.addEventListener('mouseup', this.onMouseupTrack);
        document.addEventListener('mousemove', this.onMousemoveTrack);
    }

    @BindThis
    private onMouseupTrack(e: MouseEvent) {
        this.isHovered = false;
        this.isPressed = false;
        this.makeThumbInactive();
        document?.removeEventListener('mousemove', this.onMousemoveTrack);
        this.updated(); // Load value from backend for some very special case (we block reading this during drag)
    }

    @BindThis
    private onMousemoveTrack(e: MouseEvent) {
        if (e.button !== 0) return;
        this.makeThumbActive();
        this.updateThumbPosition();
        this.setValueFromMousePos(e.clientX);
    }

    bindCpp(): void {
        EQ.bindValue(this.keyValue, String(this.value), this);
        EQ.bindValue(this.keyMin, String(this.min), this);
        EQ.bindValue(this.keyMax, String(this.max), this);
        EQ.bindValue(this.keyStep, String(this.step), this);
        this.updated();
    }

    updated() {
        if (this.isPressed) return; // Ignore external events during dragging

        const value = EQ.getValue(this.keyValue);
        const max = EQ.getValue(this.keyMax);
        if (max !== null) {
            this.setAttribute(EqSliderAttributes.Max, max);
        }
        const min = EQ.getValue(this.keyMin);
        if (min !== null) {
            this.setAttribute(EqSliderAttributes.Min, min);
        }
        const step = EQ.getValue(this.keyStep);
        if (step !== null) {
            this.setAttribute(EqSliderAttributes.Step, step);
        }
        if (value !== null) {
            this.value = Number(value);
        }
    }

    attributeChangedCallback(
        name: typeof watchedAttributes[number],
        oldValue: string | null,
        newValue: string | null
    ): void {
        switch (name) {
            case EqSliderAttributes.Step:
            case EqSliderAttributes.Min:
            case EqSliderAttributes.Max: {
                this.updateGeometry();
            }
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.thumb = this.querySelector('.thumb')!;
                this.track = this.querySelector('.track')!;

                this.track.addEventListener('mousedown', this.onMousedownTrack);
            })
            .catch((e) => {
                console.error(e);
            });
    }
    private makeThumbActive() {
        document.body.classList.add('ignore-events');
        this.thumb.style.pointerEvents = 'all';
    }
    private makeThumbInactive() {
        document.body.classList.remove('ignore-events');
        this.thumb.style.pointerEvents = '';
    }
    private setValueFromMousePos(clientX: number) {
        const { left, width } = this.trackRect;
        const currentPos = clamp(clientX - left, 0, width);
        this.value = Math.round((currentPos / width) * this.steps);

        const valueStr = String(this.value);
        EQ.updateValue(this.keyValue, valueStr, this);
        EQ.sendEvent(this.dispatch, this.keyPath, EventValueChange, valueStr);
    }

    private updateGeometry() {
        this.percentsInOneStep = 100 / this.steps;
        this.updateThumbPosition();
    }

    private updateThumbPosition() {
        this.thumb.style.left = `${this.percentsInOneStep * this.value}%`;
    }
}
components.defineCustomElement('eq-slider', EqSlider);
export default EqSlider;
