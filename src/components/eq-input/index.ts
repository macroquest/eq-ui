import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, BindThis, Html } from '../base-component';
import { EQ } from '../../eqengine';
import { AttrEditMode, AttrSetFocus, AttrText } from '../../eqconst';
import '../eq-box';
import { EventAccept, EventValueChange } from '../../eqevents';

enum EqInputAttributes {
    Item = 'item',
    Dispatch = 'dispatch',
    TemplateClass = 'template'
}
interface EqInputState {
    value: string;
    editMode: string;
}

/** Only 'Normal' and 'NumericOnly' are supported*/
enum EqInputEditMode {
    Normal = 'Normal', // All characters allowed (except specified in the m_sFilterChars string)
    Name = 'Name', // First character capitalized, rest are lowercase, alpha only.
    AlphaOnly = 'AlphaOnly', // only characters that iswalpha() returns true for are accepted.
    NumericOnly = 'NumericOnly', // only characters that iswdigit() returns true for are accepted.
    AlphaNumOnly = 'AlphaNumOnly' // only characters that iswalnum() returns true for are accepted.
}

@Html(template)
class EqInput extends BaseComponent {
    private keyPath: string;
    private state: EqInputState = { value: '', editMode: EqInputEditMode.Normal };
    private input!: HTMLInputElement;

    constructor() {
        super();

        this.keyPath = `${this.dispatch}.${this.item}`;
    }

    private get dispatch() {
        return this.getAttribute(EqInputAttributes.Dispatch)!;
    }

    private get item() {
        return this.getAttribute(EqInputAttributes.Item);
    }

    private get keyText() {
        return `${this.keyPath}.${AttrText}`;
    }

    private get keyEditMode() {
        return `${this.keyPath}.${AttrEditMode}`;
    }

    private get keySetFocus() {
        return `${this.keyPath}.${AttrSetFocus}`;
    }

    private get templateClass(): string {
        return this.hasAttribute(EqInputAttributes.TemplateClass)
            ? this.getAttribute(EqInputAttributes.TemplateClass)!
            : '';
    }

    private get value() {
        return this.state.value;
    }
    private set value(value: string) {
        this.state.value = value;
        this.input.value = value;
    }

    private get editMode() {
        return this.state.editMode;
    }
    private set editMode(editMode: string) {
        this.state.editMode = editMode;
    }

    @BindThis
    onInput(event: Event) {
        this.value = this.filterInput((event.target as HTMLInputElement).value);
        EQ.updateValue(this.keyText, this.value, this);
        EQ.sendEvent(this.dispatch, this.keyPath, EventValueChange, this.value);
    }

    @BindThis
    onKeyDown(event: KeyboardEvent) {
        if (event.keyCode === components.KEYCODES.ENTER) {
            // Enter pressed
            this.input.blur(); // Loose focus
            EQ.sendEvent(this.dispatch, this.keyPath, EventAccept, this.value);
        }
    }

    bindCpp(): void {
        EQ.bindValue(this.keyText, '', this);
        EQ.bindValue(this.keyEditMode, EqInputEditMode.Normal, this);
        EQ.bindValue(this.keySetFocus, '', this);
        this.updated();
    }

    updated() {
        const value = EQ.getValue(this.keyText);
        if (value !== null) {
            this.value = value;
        }
        const editMode = EQ.getValue(this.keyEditMode);
        if (editMode !== null) {
            this.editMode = editMode;
        }
        const setFocus = EQ.getValue(this.keySetFocus);
        if (setFocus === '1') {
            EQ.updateValue(this.keySetFocus, '0', this); // Reset event value
            this.input.focus();
            const len = this.input.value.length;
            this.input.setSelectionRange(len, len); // Go cursor to the end of the line
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.input = this.querySelector('input')!;
                const eqBoxes = this.querySelectorAll('eq-box')!;

                this.input.addEventListener('input', this.onInput);
                this.input.addEventListener('keydown', this.onKeyDown);

                eqBoxes.forEach((eqBox) => eqBox.setAttribute('template', this.templateClass));
            })
            .catch((e) => {
                console.error(e);
            });
    }

    private filterInput(value: string) {
        if (this.state.editMode == EqInputEditMode.NumericOnly) {
            return value.replace(/\D/g, '');
        }
        return value;
    }
}
components.defineCustomElement('eq-input', EqInput);
export default EqInput;
