/* eslint-disable @typescript-eslint/member-ordering */
import components from 'coherent-gameface-components';
import { UIZ_CONTEXTMENU } from '../../eqconst';
import { EQ } from '../../eqengine';
import { EventContextMenuSelItem } from '../../eqevents';
import { windowManager } from '../../lib/eq-window-manager';
import { BindThis } from '../base-component';
import { translate } from '../helpers/helpers';

const CONTEXT_MENU_X_OFFSET = 2;
const DISTANCE_ROW_TOP_TO_SUBMENU_TOP_PX = -5;

export enum ContextMenuType {
    Item = 0,
    Submenu = 1,
    Separator = 2
}

export interface ContextMenuItem {
    type: ContextMenuType.Item;
    title: string;
    command: string;
    checked: boolean;
    enabled?: boolean;
}
export interface ContextMenuSubmenu {
    type: ContextMenuType.Submenu;
    title: string;
    items: ContextMenuAnyItem[];
    enabled?: boolean;
}
export interface ContextMenuSeparator {
    type: ContextMenuType.Separator;
}

const calcContextMenuPosition = (width: number, height: number, position: Coords, parentWidth = 0): Coords => {
    const coords = { x: position.x - CONTEXT_MENU_X_OFFSET, y: position.y };

    if (position.x + width > window.innerWidth) {
        // NOTE: if it is submenu
        if (parentWidth > 0) {
            coords.x = position.x - width - parentWidth + CONTEXT_MENU_X_OFFSET;
        } else {
            coords.x = window.innerWidth - width;
        }
    }

    if (position.y + height > window.innerHeight) {
        coords.y = window.innerHeight - height;
    }

    return coords;
};

type Coords = { x: number; y: number };

export type ContextMenuAnyItem = ContextMenuItem | ContextMenuSubmenu | ContextMenuSeparator;
/**
 * TODO: should close parent context-menu on child's item click
 */
export class EqContextMenu {
    component!: HTMLElement;
    items!: ContextMenuAnyItem[];
    itemElements!: HTMLCollection;

    children: EqContextMenu[] = [];
    parent: EqContextMenu | null = null;

    private body!: HTMLElement;
    private container!: HTMLElement;

    private isSubmenu = false;
    private x!: number;
    private y!: number;
    private dispatch!: string;

    private _isVisible!: boolean;
    private _pressedItemIndex: null | number = null;
    private _hoveredItemsSubmenu: null | EqContextMenu = null;

    constructor(dispatch: string, items: ContextMenuAnyItem[], x: number, y: number, isSubmenu = false) {
        this.dispatch = dispatch;
        this.items = items;
        this.x = x;
        this.y = y;
        this.isSubmenu = isSubmenu;

        this.attachContainer();
        this.createMenu();

        this.isVisible = false;
        this.bindCpp();
    }

    bindCpp(): void {
        //
    }

    updated() {
        //
    }

    private get isVisible() {
        return this._isVisible;
    }

    private set isVisible(value: boolean) {
        this._isVisible = value;
        if (value) {
            this.component.style.visibility = 'visible';
        } else {
            this.component.style.visibility = 'hidden';
        }

        let coords: Coords;
        if (!this.isSubmenu) {
            coords = calcContextMenuPosition(this.component.scrollWidth, this.component.scrollHeight, {
                x: this.x,
                y: this.y
            });
        } else {
            if (!this.parent) return;

            const { width: parentWidth, right: parentRight } = this.parent.component.getBoundingClientRect();
            coords = calcContextMenuPosition(
                this.component.scrollWidth,
                this.component.scrollHeight,
                {
                    x: parentRight,
                    y: this.y
                },
                parentWidth
            );
        }
        this.component.style.transform = translate(coords.x, coords.y);
    }

    private get pressedItemIndex() {
        return this._pressedItemIndex;
    }

    private set pressedItemIndex(value: null | number) {
        if (this._pressedItemIndex !== null) {
            this.itemElements[this._pressedItemIndex].classList.remove('pressed');
        }
        if (value !== null) {
            this.itemElements[value].classList.add('pressed');
        }

        this._pressedItemIndex = value;
    }

    private get hoveredItemsSubmenu() {
        return this._hoveredItemsSubmenu;
    }

    private set hoveredItemsSubmenu(submenu: null | EqContextMenu) {
        if (submenu === this._hoveredItemsSubmenu) {
            return;
        }

        this._hoveredItemsSubmenu?.hide();

        if (submenu !== null) {
            submenu.show();
            this._hoveredItemsSubmenu = submenu;
        }
    }

    @BindThis
    private onClickOutside(e: MouseEvent) {
        const target = e.target as HTMLDivElement;
        if (this.component.contains(target) || this.areChildrenUnderCursor(this.children, target)) return;
        this.hide();
    }

    @BindThis
    private onKeydown(e: KeyboardEvent) {
        if (e.keyCode === components.KEYCODES.ESCAPE) {
            this.hide();
        }
    }

    public show() {
        components.waitForFrames(() => {
            this.isVisible = true;
            if (!this.isSubmenu) {
                document.addEventListener('mousedown', this.onClickOutside);
            }
        }, 2);
        document.addEventListener('keydown', this.onKeydown);
    }

    public hide() {
        this.isVisible = false;
        this.pressedItemIndex = null;

        document.removeEventListener('mousedown', this.onClickOutside);
        document.removeEventListener('keydown', this.onKeydown);

        this.children.forEach((child) => {
            child.hide();
        });

        this.destroy();
    }

    public addChild(child: EqContextMenu) {
        this.children.push(child);
    }

    public setParent(parent: EqContextMenu) {
        this.parent = parent;
    }

    private onItemMouseup(item: ContextMenuItem) {
        this.pressedItemIndex = null;

        EQ.sendEvent(this.dispatch, '', EventContextMenuSelItem, item.command);
        // NOTE: close all parents menus
        let parent = this.parent;

        while (parent) {
            parent.hide();
            parent = parent.parent;
        }
        this.hide();
    }

    private destroy() {
        document.body.removeChild(this.component);
    }

    private areChildrenUnderCursor(children: EqContextMenu[], target: HTMLDivElement) {
        for (const child of children) {
            if (child.component.contains(target)) {
                return true;
            }
            if (child.children.length && this.areChildrenUnderCursor(child.children, target)) {
                return true;
            }
        }
        return false;
    }

    private attachContainer() {
        this.component = document.createElement('context-menu');
        this.component.classList.add('WDT_RoundedNoTitle');
        this.container = document.createElement('div');
        this.container.classList.add('container');
        this.component.appendChild(this.container);

        const cssClasses = [
            'window-frame-top-left',
            'window-frame-top',
            'window-frame-top-right',
            'window-frame-right-top',
            'window-frame-right',
            'window-frame-right-bottom',
            'window-frame-bottom-right',
            'window-frame-bottom',
            'window-frame-bottom-left',
            'window-frame-left-top',
            'window-frame-left',
            'window-frame-left-bottom',
            'window-body'
        ];

        cssClasses.forEach((cssClass) => {
            const el = document.createElement('div');
            el.classList.add(cssClass);
            this.container.appendChild(el);
        });

        this.body = this.container.querySelector('.window-body')!;
        const bgColor = document.createElement('div');
        bgColor.classList.add('background-color');
        const bg = document.createElement('div');
        bg.classList.add('background');
        bgColor.appendChild(bg);
        this.body.appendChild(bgColor);

        windowManager.setElemZ(this.component, UIZ_CONTEXTMENU, 0);
        document.body.appendChild(this.component);
    }

    private createMenuItem(item: ContextMenuItem, index: number) {
        const row = document.createElement('item');
        row.classList.add('item');
        if (item.checked) {
            row.classList.add('checked');
        }
        row.textContent = item.title;

        if (item.enabled === false) {
            row.classList.add('disabled');
        } else {
            row.addEventListener('mousedown', () => {
                this.pressedItemIndex = index;
            });
            row.addEventListener('mouseup', () => this.onItemMouseup(item));
            row.addEventListener('mouseover', () => {
                this.hoveredItemsSubmenu = null;
            });
        }
        return row;
    }

    private createSubmenu(item: ContextMenuSubmenu, index: number) {
        const row = document.createElement('submenu');
        row.classList.add('item');
        row.classList.add('submenu');
        row.textContent = item.title;
        if (item.enabled === false) {
            row.classList.add('disabled');
        } else {
            let subContextMenu!: EqContextMenu;
            row.addEventListener('mouseover', () => {
                const { right, y } = row.getBoundingClientRect();
                subContextMenu = new EqContextMenu(
                    this.dispatch,
                    item.items,
                    right,
                    y + DISTANCE_ROW_TOP_TO_SUBMENU_TOP_PX,
                    true
                );
                subContextMenu.setParent(this);
                this.addChild(subContextMenu);

                this.hoveredItemsSubmenu = subContextMenu;
            });

            row.addEventListener('mousedown', () => {
                this.pressedItemIndex = index;
            });
        }
        return row;
    }

    private createSeparator(item: ContextMenuSeparator, index: number) {
        const row = document.createElement('eq-separator');

        row.addEventListener('mouseover', () => {
            this.hoveredItemsSubmenu = null;
        });
        return row;
    }

    private createMenu() {
        const tempContainer = document.createElement('div');

        for (const [index, item] of this.items.entries()) {
            switch (item.type) {
                case ContextMenuType.Item:
                    tempContainer.appendChild(this.createMenuItem(item, index));
                    break;
                case ContextMenuType.Submenu:
                    tempContainer.appendChild(this.createSubmenu(item, index));
                    break;
                case ContextMenuType.Separator:
                    tempContainer.appendChild(this.createSeparator(item, index));
                    break;
            }
        }
        this.itemElements = tempContainer.children;

        for (const child of this.itemElements) {
            this.body.appendChild(child);
        }
    }
}
