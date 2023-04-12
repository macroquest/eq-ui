import components from 'coherent-gameface-components';
import { BaseComponent, BindThis, Html } from '../base-component';
import template from './template.html';
import { EQ } from '../../eqengine';
import { EventSelItem } from '../../eqevents';
import { px } from '../helpers/helpers';
import '../eq-box';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';
import { config } from '../../components-config';
import { AttrChoices, AttrSelected, AttrVisible } from '../../eqconst';

enum EqDropDownAttributes {
    Choices = 'choices',
    Dispatch = 'dispatch',
    Item = 'item',
    Height = 'height',
    ListHeight = 'list-height',
    TemplateClass = 'template',
    TooltipContent = 'tooltip-content',
    Width = 'width',
    Expanded = 'expanded'
}

interface EqDropDownState {
    _isExpanded: boolean;
    _selectedIndex: number;
    _selectedOptions: HTMLElement[];
    _options: HTMLElement[];
}

@Html(template)
class EqDropDown extends BaseComponent {
    private hasBeenConnected: boolean;
    private defaultConfig = config.ComboBox;
    private keyPath: string;
    visible: boolean;

    private state: EqDropDownState = { _isExpanded: false, _selectedIndex: 0, _selectedOptions: [], _options: [] };

    constructor() {
        super();

        this.hasBeenConnected = false;

        this.keyPath = `${this.dispatch}.${this.item}`;
        this.visible = true;
    }

    private get dispatch(): string {
        return this.getAttribute(EqDropDownAttributes.Dispatch)!;
    }

    private get item(): string {
        return this.getAttribute(EqDropDownAttributes.Item)!;
    }

    private get keyChoices() {
        return `${this.keyPath}.${AttrChoices}`;
    }
    private get keySelected() {
        return `${this.keyPath}.${AttrSelected}`;
    }

    private get selectedOption(): HTMLElement {
        return this.state._options[this.state._selectedIndex ?? 0];
    }

    private get choices(): Array<string> {
        return this.getAttribute(EqDropDownAttributes.Choices)?.split('|') || [];
    }

    private get width(): number {
        return this.hasAttribute(EqDropDownAttributes.Width)
            ? Number(this.getAttribute(EqDropDownAttributes.Width))!
            : 125;
    }

    private get height(): number {
        return this.hasAttribute(EqDropDownAttributes.Height)
            ? Number(this.getAttribute(EqDropDownAttributes.Height)!)
            : 20;
    }

    private get listHeight(): number {
        return this.hasAttribute(EqDropDownAttributes.ListHeight)
            ? Number(this.getAttribute(EqDropDownAttributes.ListHeight)!)
            : 80;
    }

    private get templateClass(): string {
        return this.hasAttribute(EqDropDownAttributes.TemplateClass)
            ? this.getAttribute(EqDropDownAttributes.TemplateClass)!
            : '';
    }

    private get tooltipContent(): string | null {
        return this.getAttribute(EqDropDownAttributes.TooltipContent);
    }

    private get selectedOptions(): HTMLElement[] {
        return this.state._selectedOptions;
    }

    private set selectedOptions(value: HTMLElement[]) {
        this.state._selectedOptions = value;
    }

    private get isExpanded() {
        return this.state._isExpanded;
    }

    private set isExpanded(isExpanded: boolean) {
        if (isExpanded) {
            this.setAttribute(EqDropDownAttributes.Expanded, '');
            this.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, '');
        } else {
            this.removeAttribute(EqDropDownAttributes.Expanded);
            if (this.tooltipContent) {
                this.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, this.tooltipContent);
            }
        }
        tooltip.updateContent();

        this.state._isExpanded = isExpanded;
    }

    get keyVisible() {
        return `${this.keyPath}.${AttrVisible}`;
    }

    @BindThis
    onSelection(element: HTMLElement): void {
        if (!element.classList.contains('option')) return;
        this.updateElementsSelectedness(element);
        this.updateSelectedOptions(element);
        const selected = element.getAttribute('index') || ''; // -1 means no selection
        EQ.updateValue(this.keySelected, selected, null);
        EQ.sendEvent(this.dispatch, this.keyPath, EventSelItem, selected);
    }

    @BindThis
    private onMouseover() {
        tooltip.setElement(this);
    }

    @BindThis
    private onMousedown(event: MouseEvent) {
        if ((event.target as HTMLDivElement).getAttribute('item') === this.item) {
            this.toggleOptions();
        } else {
            this.closeOptions();
        }
    }

    addSelectElements(): void {
        const container = this.querySelector('.eq-option-container')!;
        const customSelect = document.createElement('eq-select');
        const optionsContainer = document.createElement('div');
        optionsContainer.classList.add('eq-select-options-container');
        customSelect.appendChild(optionsContainer);
        container.appendChild(customSelect);
    }

    updateOptions(): void {
        const optionsContainer = this.querySelector('.eq-select-options-container')!;
        optionsContainer.textContent = ''; // Clear options
        this.state._options = [];
        for (let k = 0; k < this.choices.length; k++) {
            const newOption = document.createElement('div');
            newOption.setAttribute('id', this.choices[k]);
            newOption.setAttribute('name', this.choices[k]);
            newOption.setAttribute('value', this.choices[k]);
            newOption.setAttribute('index', String(k));
            newOption.classList.add('option');
            newOption.classList.add('option-' + k);
            newOption.textContent = this.choices[k];
            this.state._options.push(newOption);
            optionsContainer.appendChild(newOption);
        }
    }

    insertArrowElement(rootContainer: Element | null): void {
        const arrow = document.createElement('div');
        arrow.classList.add('custom-select-arrow');
        arrow.setAttribute('can-change-opacity', '');
        rootContainer?.appendChild(arrow);
    }

    resetSelectedOption(): void {
        if (!this.choices.length) {
            this.selectedOptions = [];
            return;
        }

        const defaultOption = document.createElement('div');
        defaultOption.setAttribute('id', this.choices[0]);
        defaultOption.setAttribute('name', this.choices[0]);
        defaultOption.setAttribute('value', this.choices[0]);
        defaultOption.classList.add('option');
        defaultOption.textContent = this.choices[0];

        this.selectedOptions = [defaultOption];
    }

    insertValuePlaceholder(): void {
        const selectedOptionValue = this.selectedOption ? this.selectedOption.textContent : '';
        const placeholder = this.querySelector('.eq-select-value');

        // if there's already a placeholder just change it's name
        if (placeholder) {
            placeholder.textContent = selectedOptionValue;
            return;
        }

        const selectedPlaceholder = document.createElement('div');
        selectedPlaceholder.setAttribute('tabindex', '0');
        selectedPlaceholder.setAttribute('item', this.item);
        selectedPlaceholder.classList.add('eq-select-value');
        selectedPlaceholder.textContent = selectedOptionValue;

        const container = this.querySelector('.eq-drop-down')!;
        container.appendChild(selectedPlaceholder);
        this.insertArrowElement(container);
    }

    toggleOptions(): void {
        const optionsContainer = this.querySelector('.eq-dropdown-container')! as HTMLElement;
        const displayStyle = this.isExpanded ? 'none' : 'block';
        this.isExpanded = !this.isExpanded;
        optionsContainer.style.display = displayStyle;
        optionsContainer.style.visibility = 'visible';
    }

    closeOptions(): void {
        const optionsContainer = this.querySelector('.eq-dropdown-container')! as HTMLElement;
        this.isExpanded = false;
        optionsContainer.style.display = 'none';
    }

    updateElementsSelectedness(element: HTMLElement): void {
        this.removeSelectedClassName();
        element.classList.add('scroll-item--selected');
    }

    updateSelectedOptions(option: HTMLElement): void {
        if (this.selectedOptions.includes(option)) return;
        this.selectedOptions = [option];
        this.insertValuePlaceholder();
    }

    removeSelectedClassName(): void {
        this.choices.forEach((option, index) => {
            this.querySelector('.option-' + index)!.classList.remove('scroll-item--selected');
        });
    }

    addEventListeners(): void {
        this.addEventListener('mousedown', (event) => {
            this.onSelection(event.target as HTMLElement);
        });

        document.addEventListener('mousedown', this.onMousedown);
    }

    bindCpp(): void {
        EQ.bindValue(this.keyChoices, '', this, { transient: true });
        EQ.bindValue(this.keySelected, '', this, { transient: true });
        this.updated();
    }

    updated() {
        const newChoices = EQ.getValue(this.keyChoices);
        if (newChoices !== null) {
            this.setAttribute(EqDropDownAttributes.Choices, newChoices);
            this.updateOptions();
            this.resetSelectedOption();
            this.insertValuePlaceholder();
        }
        const newSelected = EQ.getValue(this.keySelected);
        if (newSelected !== null) {
            this.state._selectedIndex = Number(newSelected);
            this.updateOptions();
            this.resetSelectedOption();
            this.insertValuePlaceholder();
        }
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

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                if (this.hasBeenConnected) return;
                this.hasBeenConnected = true;

                this.addSelectElements();
                if (!this.choices) return;
                this.updateOptions();

                if (!this.selectedOptions.length) this.resetSelectedOption();

                this.insertValuePlaceholder();
                this.selectedOption?.classList.add('scroll-item--selected');
                this.addEventListeners();

                const eqBoxes = this.querySelectorAll('eq-box')!;
                eqBoxes.forEach((eqBox) => eqBox.setAttribute('template', this.templateClass));

                const eqBoxBody = this.querySelector('eq-box')! as HTMLDivElement;
                eqBoxBody.style.width = px(this.width + 5);
                eqBoxBody.style.height = px(this.height);

                const eqDropDownContainer = this.querySelector('.eq-dropdown-container')! as HTMLDivElement;
                eqDropDownContainer.style.width = px(this.width);
                eqDropDownContainer.style.top = px(this.height);

                const selectContainer = this.querySelector('.eq-select-value')! as HTMLDivElement;
                selectContainer.style.width = px(this.width);

                if (this.tooltipContent) {
                    this.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, this.tooltipContent);
                    this.addEventListener('mouseover', this.onMouseover);
                }
            })
            .catch((e) => {
                console.error(e);
            });
    }

    disconnectedCallback(): void {
        document.removeEventListener('mousedown', this.onMousedown);
    }
}

components.defineCustomElement('eq-drop-down', EqDropDown);
export default EqDropDown;
