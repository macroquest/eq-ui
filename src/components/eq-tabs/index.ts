import components from 'coherent-gameface-components';
import { Attributes, BaseComponent, BindThis, Html } from '../base-component';
import template from './template.html';
import panelTemplate from './panel-template.html';
import headingTemplate from './heading-template.html';
import EqScrollContainer from '../eq-scroll-container';
import { EQ } from '../../eqengine';
import { EventSelItem } from '../../eqevents';
import { AttrIndex } from '../../eqconst';

let tabsCounter = 0;
let panelsCounter = 0;

const KEYCODES = components.KEYCODES;

enum EqTabsAttributes {
    Item = 'item',
    Dispatch = 'dispatch'
}

@Html(template)
class EqTabs extends BaseComponent {
    private scrollContainers!: NodeListOf<EqScrollContainer>;
    private keyPath = '';

    constructor() {
        super();

        this.keyPath = `${this.dispatch}.${this.item}`;
    }

    get dispatch() {
        return this.getAttribute(EqTabsAttributes.Dispatch)!;
    }
    get item() {
        return this.getAttribute(EqTabsAttributes.Item)!;
    }

    get keyIndex() {
        return `${this.keyPath}.${AttrIndex}`;
    }

    /**
     * Called on keydown.
     * Gets the currently pressed key from the event and calls a function based
     * on the key code.
     */
    @BindThis
    onKeyDown(event: KeyboardEvent) {
        if ((event.target as HTMLElement).tagName.toLowerCase() !== 'eq-tab-heading' || event.altKey) return;

        // The switch-case will determine which tab should be marked as active
        // depending on the key that was pressed.
        let newTab;
        switch (event.keyCode) {
            case KEYCODES.LEFT:
            case KEYCODES.UP:
                newTab = this.getPrevTab();
                break;

            case KEYCODES.RIGHT:
            case KEYCODES.DOWN:
                newTab = this.getNextTab();
                break;

            case KEYCODES.HOME:
                newTab = this.getFirstTab();
                break;

            case KEYCODES.END:
                newTab = this.getLastTab();
                break;
            default:
                return;
        }

        event.preventDefault();
        this.selectTab(newTab);
    }

    /**
     * Called when the user clicks on the tab component.
     */
    @BindThis
    onMousedown(event: MouseEvent) {
        const target = event.target as HTMLElement;
        // avoid all cases except when the target is a tab heading.
        for (const [index, tab] of this.getAllTabs().entries()) {
            if (tab.contains(target)) {
                this.selectTab(tab as EqTabHeading);
                /** TODO we call event from mouse down only, because target.index is buggy */
                EQ.updateValue(this.keyIndex, String(index), null);
                EQ.sendEvent(this.dispatch, this.keyPath, EventSelItem, String(index));
                break;
            }
        }
    }

    /**
     * Gets a panel which should be opened by a specific tab.
     */
    getPanelForTab(tab: EqTabHeading): EqTabPanel {
        return this.querySelector(`eq-tab-panel[index="${tab.getAttribute('index')}"]`)!;
    }

    /**
     * Gets all TabHeading child elements of the current Tab component.
     */
    getAllTabs(): EqTabHeading[] {
        return Array.from(this.getElementsByTagName('eq-tab-heading') as HTMLCollectionOf<EqTabHeading>);
    }

    /**
     * Gets all TabPanel child element of the current Tab component.
     */
    getAllPanels(): Array<EqTabPanel> {
        return Array.from(this.getElementsByTagName('eq-tab-panel') as HTMLCollectionOf<EqTabPanel>);
    }

    /**
     * Sets all tabs and panels in an inactive state.
     * No tab is selected and no panel is visible.
     */
    reset() {
        const tabs = this.getAllTabs();
        const panels = this.getAllPanels();

        tabs.forEach((tab) => (tab.selected = false));
        panels.forEach((panel) => (panel.selected = false));
    }

    /**
     * Attaches the keydown and mousedown event listeners for keyboard and mouse
     * controls respectively.
     */
    attachEventListeners() {
        this.addEventListener('keydown', this.onKeyDown);
        this.addEventListener('mousedown', this.onMousedown);
    }
    /**
     * Sets a tab and its corresponding panel in an active state.
     * The tab is highlighted and the panel is visible.
     */
    selectTab(newTab: EqTabHeading) {
        // Deselect all tabs and hide all panels.
        this.reset();

        // Get the panel that the `newTab` is associated with.
        const newPanel = this.getPanelForTab(newTab);
        // If that panel doesn’t exist, abort.
        if (!newPanel) {
            console.error(`Could not find tab panel corresponding to tab ${newPanel}`);
            return;
        }
        newTab.selected = true;
        newPanel.selected = true;
        newTab.focus();
        this.scrollContainers = this.querySelectorAll('eq-scroll-container');
        this.scrollContainers.forEach((scrollContainer) => {
            scrollContainer.resize();
        });
    }

    /**
     * Gets the previous tab in the tabs list.
     * If the current tab is the first one - returns the last tab.
     */
    getPrevTab(): EqTabHeading {
        const tabs = this.getAllTabs();

        const newIdx = tabs.findIndex((tab) => tab.selected) - 1;
        // Add `tabs.length` to make sure the index is a positive number
        // and get the modulus to wrap around if necessary.
        return tabs[(newIdx + tabs.length) % tabs.length];
    }

    /**
     * Gets the first tab in the tabs list.
     */
    getFirstTab(): EqTabHeading {
        const tabs = this.getAllTabs();
        return tabs[0];
    }

    /**
     * Gets the next tab in the tabs list.
     * If the current tab is the last one - returns the first tab.
     */
    getNextTab(): EqTabHeading {
        const tabs = this.getAllTabs();
        const newIdx = tabs.findIndex((tab) => tab.selected) + 1;
        return tabs[newIdx % tabs.length];
    }

    /**
     * Gets the last tab.
     */
    getLastTab(): EqTabHeading {
        const tabs = this.getAllTabs();
        return tabs[tabs.length - 1];
    }

    bindCpp(): void {
        EQ.bindValue(this.keyIndex, '0', this);
        this.updated();
    }

    updated() {
        const newIndex = EQ.getValue(this.keyIndex);
        if (newIndex !== null) {
            /** @TODO Switch to tab Number(newIndex) */
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                /** @TODO Strangely "componentRendered()" is called twice for Inventory Window tabs */
                components.waitForFrames(() => {
                    this.selectTab(this.getAllTabs()[0]);
                    this.attachEventListeners();
                }, 1);
            })
            .catch((err) => console.error(err));
    }
}
enum EqTabHeadingAttributes {
    Selected = 'selected'
}
const eqTabHeadingWatchedAttributes = [EqTabHeadingAttributes.Selected] as const;
@Html(headingTemplate)
@Attributes(eqTabHeadingWatchedAttributes)
class EqTabHeading extends BaseComponent {
    private _index!: number;
    constructor() {
        super();

        this.selected = false;
    }

    get selected() {
        return this.getAttribute('selected') === 'true';
    }

    set selected(value: boolean) {
        if (value) {
            this.setAttribute('selected', String(value));
            this.classList.add('active-tab');
        } else {
            this.classList.remove('active-tab');
            this.removeAttribute('selected');
        }
    }

    get index() {
        return this._index;
    }

    set index(value: number) {
        this._index = value;
        this.setAttribute('index', String(value));
    }
    attributeChangedCallback(
        name: typeof eqTabHeadingWatchedAttributes[number],
        oldValue: 'true' | 'false',
        newValue: 'true' | 'false'
    ) {
        const value = this.hasAttribute('selected');
        this.setAttribute('tabindex', value ? '0' : '-1');
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                if (!this.index) {
                    /** @TODO It works buggy, rendered order may vary */
                    this.index = tabsCounter++;
                }
            })
            .catch((err) => console.error(err));
    }
}

enum EqTabPanelAttributes {
    Selected = 'selected'
}

const eqTabPanelWatchedAttributes = [EqTabPanelAttributes.Selected] as const;

@Html(panelTemplate)
@Attributes(eqTabPanelWatchedAttributes)
class EqTabPanel extends BaseComponent {
    private _index!: number;
    constructor() {
        super();

        this.selected = false;
    }

    get selected() {
        return this.getAttribute('selected') === 'true';
    }

    set selected(value: boolean) {
        if (value) {
            this.setAttribute('selected', String(value));
            this.classList.add('active-panel');
        } else {
            this.classList.remove('active-panel');
            this.removeAttribute('selected');
        }
    }

    get index() {
        return this._index;
    }

    set index(value: number) {
        this._index = value;
        this.setAttribute('index', String(value));
    }

    attributeChangedCallback(
        name: typeof eqTabPanelWatchedAttributes[number],
        oldValue: 'true' | 'false',
        newValue: 'true' | 'false'
    ) {
        if (name === EqTabPanelAttributes.Selected) {
            this.style.display = newValue === 'true' ? 'block' : 'none';
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                if (!this.index) {
                    /** @TODO It works buggy, rendered order may vary */
                    this.index = panelsCounter++;
                }
                if (this.hasAttribute('overflow')) {
                    (this.querySelector('.window-body')! as HTMLDivElement).style.overflow =
                        this.getAttribute('overflow') || 'hidden';
                }
            })
            .catch((err) => console.error(err));
    }
}

components.defineCustomElement('eq-tabs', EqTabs);
components.defineCustomElement('eq-tab-heading', EqTabHeading);
components.defineCustomElement('eq-tab-panel', EqTabPanel);

export { EqTabs, EqTabHeading, EqTabPanel };
