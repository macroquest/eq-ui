import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, BindThis, Html } from '../base-component';
import { EventColumnClick, EventSelItem } from '../../eqevents';
import { AttrColumnsWidths, AttrContent, AttrSelected, ListSeparator, ListSeparatorOuter } from '../../eqconst';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';
import { EQ } from '../../eqengine';
import type EqListColumn from '../eq-list-column';
import { px } from '../helpers/helpers';
import { windowManager } from '../../lib/eq-window-manager';
import '../eq-box';

export enum ListCellType {
    String = 0,
    Image = 1
}

export interface ListCell {
    type: ListCellType;
    value: string;
}

export interface ListRow {
    cells: Array<ListCell>;
}

type EqListState = { separators?: NodeListOf<HTMLDivElement>; selected?: number; currentColumn: number };

enum EqListAttributes {
    Item = 'item',
    Dispatch = 'dispatch',
    TooltipContent = 'tooltip-content',
    Content = 'content',
    Columns = 'columns',
    ColumnsWidth = 'columns-width',
    TemplateClass = 'template'
}

@Html(template)
class EqList extends BaseComponent {
    state: EqListState = { currentColumn: 0 };

    private keyPath: string;
    private container!: HTMLElement;
    private header!: HTMLElement;
    private scrollContainerSlot!: HTMLElement;

    constructor() {
        super();
        this.keyPath = `${this.dispatch}.${this.item}`;
    }

    private get templateClass(): string {
        return this.hasAttribute(EqListAttributes.TemplateClass)
            ? this.getAttribute(EqListAttributes.TemplateClass)!
            : '';
    }

    private get tooltipContent() {
        return this.getAttribute(EqListAttributes.TooltipContent)!;
    }

    private get item() {
        return this.getAttribute(EqListAttributes.Item)!;
    }

    private get dispatch() {
        return this.getAttribute(EqListAttributes.Dispatch)!;
    }

    private get keyColumnsWidths() {
        return `${this.keyPath}.${AttrColumnsWidths}`;
    }

    private get keyContent() {
        return `${this.keyPath}.${AttrContent}`;
    }

    private get keySelected() {
        return `${this.keyPath}.${AttrSelected}`;
    }

    private get columns() {
        return this.getAttribute(EqListAttributes.Columns)!.split(ListSeparator);
    }

    private get containerWidth() {
        return this.getBoundingClientRect().width;
    }

    private get rows(): NodeListOf<HTMLDivElement> {
        return this.querySelectorAll('.eq-list-row');
    }

    private get separators() {
        return this.state.separators!;
    }

    private set separators(separators: NodeListOf<HTMLDivElement>) {
        this.state.separators = separators;
        this.state.separators.forEach((separator, index) => {
            separator.addEventListener('mousedown', this.onMousedownResize(index));
        });
    }

    private get columnsWidth() {
        return this.getAttribute(EqListAttributes.ColumnsWidth)!.split(ListSeparator);
    }

    private set columnsWidth(value: string[]) {
        this.setAttribute(EqListAttributes.ColumnsWidth, value.join(ListSeparator));
        this.rows.forEach((row) => {
            const columns = row.querySelectorAll<EqListColumn>('.col');
            value.forEach((colWidth, colIndex) => {
                columns[colIndex].style.width = px(parseInt(colWidth));
            });
        });

        // Store values to EQ model ini as int values
        const copy = value;
        copy.forEach((colWidth, colIndex) => {
            copy[colIndex] = String(parseInt(colWidth));
        });
        EQ.updateValue(this.keyColumnsWidths, copy.join(ListSeparator), this);
    }

    private get selected() {
        return this.state.selected!;
    }

    private set selected(value: number) {
        // NOTE: remove selected class from previous selected item
        this.scrollContainerSlot.children[this.state.selected!]?.classList.remove('selected');
        // NOTE: add selected class to new selected item
        this.scrollContainerSlot.children[value]?.classList.add('selected');

        this.state.selected = value;
        EQ.updateValue(this.keySelected, String(value), this);
    }

    @BindThis
    private onMousedown(index: number) {
        return (e: MouseEvent) => {
            if (e.button !== 0) return;

            this.selected = index;

            EQ.sendEvent(this.dispatch, this.keyPath, EventSelItem, String(index));
        };
    }

    @BindThis
    private onHeaderClick(index: number) {
        return (e: MouseEvent) => {
            if (e.button !== 0) return;
            EQ.sendEvent(this.dispatch, this.keyPath, EventColumnClick, String(index));
        };
    }

    @BindThis
    private onMousedownResize(index: number) {
        return (e: Event) => {
            this.state.currentColumn = index;
            document.addEventListener('mouseup', this.onMouseupResize);
            this.container.addEventListener('mousemove', this.onMousemoveResize);
        };
    }

    @BindThis
    private onMouseupResize(e: Event) {
        this.container.removeEventListener('mousemove', this.onMousemoveResize);
    }

    @BindThis
    private onMousemoveResize(e: MouseEvent) {
        const boundary = this.state.currentColumn === 0 ? this : this.separators[this.state.currentColumn - 1];
        const { x } = boundary.getBoundingClientRect();

        const deltaX = e.clientX - x;

        this.changeColumnWidth(this.state.currentColumn, deltaX / windowManager.scaleUI);
    }

    public changeColumnWidth(col: number | 'last', deltaX: number) {
        if (col === 'last') {
            return;
        }
        const componentWidth = deltaX >= 0 ? deltaX : 0;

        const columnsWidthCopy = [...this.columnsWidth];
        columnsWidthCopy[col] = String(componentWidth);

        this.columnsWidth = columnsWidthCopy;
    }

    bindCpp(): void {
        EQ.bindValue(this.keyColumnsWidths, this.columnsWidth.join(ListSeparator), this);
        EQ.bindValue(this.keyContent, '', this, { transient: true });
        EQ.bindValue(this.keySelected, '', this, { transient: true });
        this.updated();
    }

    updated() {
        this.fillContent();
        const columnsWidth = EQ.getValue(this.keyColumnsWidths);
        if (columnsWidth !== null && columnsWidth.length > 0) {
            this.columnsWidth = columnsWidth.split(ListSeparator);
        }
        const newSelected = EQ.getValue(this.keySelected);
        if (newSelected !== null && newSelected !== '') {
            this.selected = Number(newSelected);
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.container = this.querySelector('.eq-list-container')!;
                this.header = this.container.querySelector('.eq-list-header')!;
                this.scrollContainerSlot = this.container.querySelector('component-slot[data-name="content"]')!;

                const eqBoxes = this.querySelectorAll('eq-box')!;
                eqBoxes.forEach((eqBox) => eqBox.setAttribute('template', this.templateClass));

                this.fillHeader();
                components.waitForFrames(() => {
                    // NOTE: just to trigger attributes setting
                    this.columnsWidth = [...this.columnsWidth];
                }, 3);

                this.scrollContainerSlot.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, this.tooltipContent);
                this.header.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, this.tooltipContent);

                this.scrollContainerSlot.addEventListener('mouseover', () => {
                    tooltip.setElement(this.scrollContainerSlot);
                });

                this.header.addEventListener('mouseover', () => {
                    tooltip.setElement(this.header);
                });
            })
            .catch((e) => {
                console.error(e);
            });
    }

    private fillHeader() {
        this.header.innerHTML = this.columns.reduce((acc, colTitle, index, arr) => {
            const isLastItem = index === arr.length - 1;
            const column = `<eq-list-column header class="col"><component-slot data-name="eq-list-column-content"><div class="col-content">${colTitle}</div></component-slot></eq-list-column>`;
            const separator = isLastItem
                ? ''
                : `<div class="eq-list-separator" can-change-opacity>
                        <div class="eq-list-separator-img"></div>
                    </div>`;
            return (acc += column + separator);
        }, '');
        const headers = this.header.querySelectorAll('.col') as NodeListOf<HTMLDivElement>;
        headers.forEach((element, index) => element.addEventListener('mousedown', this.onHeaderClick(index)));
        this.separators = this.header.querySelectorAll('.eq-list-separator');
    }

    private fillContent() {
        //** TODO remove content rows event listeners */
        this.scrollContainerSlot.textContent = ''; // Clear content

        const content = EQ.getValue(this.keyContent);
        let isJson = false;

        if (!content) return;

        try {
            isJson = JSON.parse(content);
        } catch (e) {
            //console.error('content not a json', e);
        }

        // TODO: move parsing to eqengine
        // Parse
        let items = isJson ? JSON.parse(content) : content.split(ListSeparatorOuter);
        let row!: HTMLElement;
        let rowContainer!: HTMLElement;
        if (!isJson) {
            items = items as Array<string>;
            for (let i = 0; i < items.length; i++) {
                row = document.createElement('div');
                row.classList.add('eq-list-content');
                row.classList.add('eq-list-row');
                const item = items[i].split(ListSeparator);
                this.scrollContainerSlot.appendChild(row);
                for (const colContent of item) {
                    const col = document.createElement('eq-list-column');
                    col.classList.add('col');
                    col.innerHTML = `<component-slot data-name="eq-list-column-content"><div class="col-content">${colContent}</div>a</component-slot>`;
                    row.appendChild(col);
                }
            }
        } else {
            items = items as Array<ListRow>;
            items.forEach((row: ListRow) => {
                rowContainer = document.createElement('div');
                rowContainer.classList.add('eq-list-content');
                rowContainer.classList.add('eq-list-row');
                this.scrollContainerSlot.appendChild(rowContainer);
                row.cells.forEach((cell, index) => {
                    const col = document.createElement('eq-list-column');
                    col.classList.add('col');

                    //TODO: find attribute in xml templates
                    const textAlign = Number.isNaN(+cell.value) ? 't-a-left' : 't-a-right';
                    switch (cell.type) {
                        case ListCellType.String:
                            col.innerHTML = `<component-slot data-name="eq-list-column-content" class="full-width">
                                                <div class="${textAlign}"><div class="col-content">${cell.value}</div></div>
                                            </component-slot>`;
                            break;
                        case ListCellType.Image:
                            col.innerHTML = `<component-slot data-name="eq-list-column-content">
                                <div>
                                    <div class="col-content">
                                       <div class="img" style="background: url('${cell.value}')" can-change-opacity></div>
                                    </div>
                                </div></component-slot>`;

                            break;
                        default:
                            break;
                    }

                    rowContainer.appendChild(col);
                });
            });
        }

        for (let i = 0; i < this.scrollContainerSlot.childElementCount; i += 1) {
            (this.scrollContainerSlot.children[i] as HTMLDivElement).addEventListener('mousedown', this.onMousedown(i));
        }
    }
}

components.defineCustomElement('eq-list', EqList);
export default EqList;
