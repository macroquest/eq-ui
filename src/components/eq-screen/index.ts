import components from 'coherent-gameface-components';
import template from './template.html';
import { clamp, px, translate } from '../helpers/helpers';
import { Attributes, BaseComponent, BindThis, Html } from '../base-component';
import { EQ } from '../../eqengine';
import { Draggable } from '../../lib/eq-draggable';
import { windowManager } from '../../lib/eq-window-manager';
import type EqScrollContainer from '../eq-scroll-container';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';
import {
    AttrLocked,
    AttrMinimized,
    AttrOpacity,
    AttrBackgroundTintColor,
    AttrTitle,
    AttrBackgroundUseTexture,
    AttrVisible,
    ListSeparator,
    AttrZClass,
    AttrIniState,
    AttrMovement,
    UIZ_WINDOWS
} from '../../eqconst';
import {
    EventCloseBox,
    EventMinimizeBox,
    EventMouseOut,
    EventMouseOver,
    EventQMarkBox,
    EventRButtonDown,
    EventWindowRectChanged
} from '../../eqevents';
import type EqList from '../eq-list';

const MIN_WIDTH = 93;
const MINIMIZED_WIDTH = 188;
const MIN_HEIGHT = 20;

type EqScreenState = {
    resizeAxis: 'x' | 'y' | 'xy' | null;
    isMinimized: boolean;
    rightFrameCoordinate: number;
    bottomFrameCoordinate: number;
    opacity: string;
    backgroundUseTexture: boolean;
    backgroundTintColor: string;
    zClass: number;
    lastIniState: string;
    x: number;
    y: number;
    w: number;
    h: number;
};

enum EqScreenAttributes {
    Draggable = 'draggable',
    Sizable = 'sizable',
    Minimizebox = 'minimizebox',
    Closebox = 'closebox',
    Qmarkbox = 'qmarkbox',
    Titlebar = 'titlebar',
    Item = 'item',
    Title = 'title',
    X = 'x',
    Y = 'y',
    Width = 'width',
    Height = 'height',
    Visible = 'visible',
    Content = 'content',
    Overflow = 'overflow'
}
const watchedAttributes = [EqScreenAttributes.Sizable, EqScreenAttributes.Draggable, EqScreenAttributes.Title] as const;

@Html(template)
@Attributes(watchedAttributes)
class EqScreen extends BaseComponent {
    private state: EqScreenState = {
        resizeAxis: null,
        isMinimized: false,
        rightFrameCoordinate: 0,
        bottomFrameCoordinate: 0,
        opacity: '1',
        backgroundUseTexture: true,
        backgroundTintColor: '',
        zClass: UIZ_WINDOWS,
        lastIniState: '',
        x: 0,
        y: 0,
        w: 0,
        h: 0
    };
    private keyPath: string;
    private container!: HTMLElement;

    private draggableRef: Draggable | null = null;

    private minimizeBtn!: HTMLDivElement;
    private closeBtn!: HTMLDivElement;
    private qmarkBtn!: HTMLDivElement;

    private titleElement!: HTMLSpanElement;
    private titlebar!: HTMLDivElement;
    private frameRight!: HTMLDivElement;
    private frameRightTop!: HTMLDivElement;
    private frameRightBottom!: HTMLDivElement;
    private frameBottom!: HTMLDivElement;
    private frameBottomLeft!: HTMLDivElement;
    private frameBottomRight!: HTMLDivElement;
    private frameLeft!: HTMLDivElement;
    private frameLeftTop!: HTMLDivElement;
    private frameLeftBottom!: HTMLDivElement;
    private frameTop!: HTMLDivElement;
    private frameTopLeft!: HTMLDivElement;
    private frameTopRight!: HTMLDivElement;

    private currentResizeControl: HTMLDivElement | null = null;

    private scrollContainers!: NodeListOf<EqScrollContainer>;
    private eqLists!: NodeListOf<EqList>;

    constructor() {
        super();
        this.keyPath = this.item;

        if (this.isItemValid === null) EQ.fail("'window' has no 'item' attribute");

        this.positionX = parseInt(this.attrPosX);
        this.positionY = parseInt(this.attrPosY);
        this.width = parseInt(this.attrPosW);
        this.height = parseInt(this.attrPosH);

        this.zClass = UIZ_WINDOWS;
        this.bindCpp();
    }

    get isDraggable() {
        return this.hasAttribute(EqScreenAttributes.Draggable);
    }
    set isDraggable(draggable: boolean) {
        if (draggable) this.setAttribute(EqScreenAttributes.Draggable, '');
        else this.removeAttribute(EqScreenAttributes.Draggable);
    }
    get isSizable() {
        return this.hasAttribute(EqScreenAttributes.Sizable);
    }
    get hasMinimizebox() {
        return this.hasAttribute(EqScreenAttributes.Minimizebox);
    }
    get hasClosebox() {
        return this.hasAttribute(EqScreenAttributes.Closebox);
    }
    get hasQmarkbox() {
        return this.hasAttribute(EqScreenAttributes.Qmarkbox);
    }
    get hasTitlebar() {
        return this.hasAttribute(EqScreenAttributes.Titlebar);
    }

    get item() {
        return this.getAttribute(EqScreenAttributes.Item)!;
    }
    get isItemValid() {
        return this.item !== null;
    }
    get title() {
        return this.getAttribute(EqScreenAttributes.Title)!;
    }

    get positionX() {
        return this.state.x;
    }
    set positionX(value: number) {
        this.state.x = value;
    }

    get positionY() {
        return this.state.y;
    }
    set positionY(value: number) {
        this.state.y = value;
    }

    get height() {
        return this.state.h;
    }
    set height(value: number) {
        this.state.h = value;
    }

    get width() {
        return this.state.w;
    }
    set width(value: number) {
        this.state.w = value;
    }

    get zClass() {
        return this.state.zClass;
    }
    set zClass(z: number) {
        const prevZClass = this.state.zClass;
        this.state.zClass = z;
        windowManager.zClassWasUpdated(this, prevZClass);
    }

    private get attrPosX() {
        return this.getAttribute(EqScreenAttributes.X)!;
    }

    private get attrPosY() {
        return this.getAttribute(EqScreenAttributes.Y)!;
    }

    private get attrPosW() {
        return this.getAttribute(EqScreenAttributes.Width)!;
    }

    private get attrPosH() {
        return this.getAttribute(EqScreenAttributes.Height)!;
    }

    private get keyTitle() {
        return `${this.keyPath}.${AttrTitle}`;
    }

    private get keyZClass() {
        return `${this.keyPath}.${AttrZClass}`;
    }

    private get keyMinimized() {
        return `${this.keyPath}.${AttrMinimized}`;
    }

    private get keyLocked() {
        return `${this.keyPath}.${AttrLocked}`;
    }

    private get keyOpacity() {
        return `${this.keyPath}.${AttrOpacity}`;
    }

    private get keyBackgroundUseTexture() {
        return `${this.keyPath}.${AttrBackgroundUseTexture}`;
    }

    private get keyBackgroundTintColor() {
        return `${this.keyPath}.${AttrBackgroundTintColor}`;
    }

    private get keyVisible() {
        const v = this.getAttribute(EqScreenAttributes.Visible);
        return v ? v : `${this.keyPath}.${AttrVisible}`;
    }

    private get keyMovement() {
        return `${this.keyPath}.${AttrMovement}`;
    }

    private get keyIniState() {
        return `${this.keyPath}.${AttrIniState}`;
    }

    private get isMinimized() {
        return this.state.isMinimized;
    }
    private set isMinimized(isMinimized: boolean) {
        this.state.isMinimized = isMinimized;

        EQ.updateValue(this.keyMinimized, isMinimized ? '1' : '0', this);

        const body = this.container?.querySelector('.window-body') as HTMLElement;

        if (isMinimized) {
            body.style.display = 'none';
            // NOTE: we have to use 2 different transitions to make the same behavior as EQ has
            this.container.style.transition = 'width 300ms linear 0s, height 0ms linear 0ms';
            this.container.style.height = '0';
            this.container.style.width = px(MINIMIZED_WIDTH);
            // NOTE: changes tooltip content
            this.minimizeBtn.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, 'Restore this window');

            this.removeAttribute(EqScreenAttributes.Sizable);
        } else {
            body.style.display = '';
            this.container.style.transition = 'width 300ms linear 0s, height 0ms linear 300ms';
            this.container.style.height = px(this.height);
            this.container.style.width = px(this.width);
            // NOTE: changes tooltip content
            this.minimizeBtn.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, 'Minimize this window');

            this.setAttribute(EqScreenAttributes.Sizable, '');
        }
        // NOTE: updates tooltip content
        tooltip.updateContent();
    }

    @BindThis
    onMouseDown(e: MouseEvent) {
        if (e.button === 0) {
            this.makeWindowActive();
        }
        if (e.button === 2) {
            const coords = e.clientX.toString() + ',' + e.clientY.toString();
            EQ.sendEvent(this.item, this.item, EventRButtonDown, coords);
        }
    }
    @BindThis
    onMouseOver() {
        EQ.sendEvent(this.item, this.item, EventMouseOver);
    }

    @BindThis
    onMouseOut() {
        EQ.sendEvent(this.item, this.item, EventMouseOut);
    }

    @BindThis
    private onResizeMousedown(e: MouseEvent) {
        if (e.button !== 0) return;
        const target = e.target as HTMLDivElement;
        const { right, bottom } = this.getBoundingClientRect();
        this.state.rightFrameCoordinate = right;
        this.state.bottomFrameCoordinate = bottom;
        // NOTE: remove minimize/restore transition before resizing
        this.container.style.transition = '';
        this.currentResizeControl = e.target as HTMLDivElement;
        this.makeWindowActive();
        e.stopPropagation();
        if (
            [
                this.frameLeft,
                this.frameLeftTop,
                this.frameLeftBottom,
                this.frameRight,
                this.frameRightTop,
                this.frameRightBottom
            ].includes(target)
        ) {
            this.state.resizeAxis = 'x';
        }
        if ([this.frameBottom, this.frameTop].includes(target)) {
            this.state.resizeAxis = 'y';
        }
        if (
            [
                this.frameBottomRight,
                this.frameBottomLeft,
                this.frameTopLeft,
                this.frameTopRight,
                this.frameLeftTop,
                this.frameLeftBottom,
                this.frameRightTop,
                this.frameRightBottom
            ].includes(target)
        ) {
            this.state.resizeAxis = 'xy';
        }

        document.addEventListener('mousemove', this.onResizeMousemove);
        document.addEventListener('mouseup', this.onResizeMouseup);
    }
    @BindThis
    private onResizeMouseup() {
        this.currentResizeControl = null;

        this.storeIniState();

        document?.removeEventListener('mousemove', this.onResizeMousemove);
        document?.removeEventListener('mouseup', this.onResizeMouseup);
    }
    @BindThis
    private onResizeMousemove(e: MouseEvent) {
        const { right, left, bottom, top } = this.getBoundingClientRect();
        if (this.state.resizeAxis?.includes('x')) {
            if (
                [
                    this.frameRight,
                    this.frameRightBottom,
                    this.frameRightTop,
                    this.frameBottomRight,
                    this.frameTopRight
                ].includes(this.currentResizeControl!)
            ) {
                this.width = clamp(e.clientX - left, MIN_WIDTH) / windowManager.scaleUI;
            }
            if (
                [
                    this.frameLeft,
                    this.frameLeftBottom,
                    this.frameLeftTop,
                    this.frameBottomLeft,
                    this.frameTopLeft
                ].includes(this.currentResizeControl!)
            ) {
                if (e.clientX + MIN_WIDTH <= this.state.rightFrameCoordinate!) {
                    this.width = clamp(right - e.clientX, MIN_WIDTH) / windowManager.scaleUI;
                    this.positionX = e.clientX;
                }
            }
        }
        if (this.state.resizeAxis?.includes('y')) {
            if (
                [
                    this.frameBottom,
                    this.frameLeftBottom,
                    this.frameRightBottom,
                    this.frameBottomRight,
                    this.frameBottomLeft
                ].includes(this.currentResizeControl!)
            ) {
                this.height = clamp(e.clientY - top, MIN_HEIGHT) / windowManager.scaleUI;
            }
            if (
                [this.frameTop, this.frameLeftTop, this.frameRightTop, this.frameTopRight, this.frameTopLeft].includes(
                    this.currentResizeControl!
                )
            ) {
                if (e.clientY + MIN_HEIGHT <= this.state.bottomFrameCoordinate!) {
                    this.height = clamp(bottom - e.clientY, MIN_HEIGHT) / windowManager.scaleUI;
                    this.positionY = e.clientY;
                }
            }
        }

        this.scrollContainers.forEach((scrollContainer) => {
            scrollContainer.resize();
        });
        this.eqLists.forEach((eqList) => {
            eqList.changeColumnWidth('last', this.positionX);
        });
        this.updatedPos();
    }
    @BindThis
    private onMinimizeDown(e: MouseEvent) {
        if (e.button !== 0) return;

        e.stopPropagation();

        this.minimizeBtn.classList.add('pressed');
        document.addEventListener('mouseup', this.onMinimizeUp);
    }
    @BindThis
    private onMinimizeUp(e: MouseEvent) {
        this.minimizeBtn.classList.remove('pressed');
        document.removeEventListener('mouseup', this.onMinimizeUp);
    }
    @BindThis
    private onMinimizeClick(e: MouseEvent) {
        this.isMinimized = !this.isMinimized; /** This updates value with key keyMinimized */

        EQ.sendEvent(this.item, this.keyPath, EventMinimizeBox, this.isMinimized ? '1' : '0');
    }
    @BindThis
    private onCloseDown(e: MouseEvent) {
        if (e.button !== 0) return;

        e.stopPropagation();

        this.closeBtn.classList.add('pressed');
        document.addEventListener('mouseup', this.onCloseUp);
    }
    @BindThis
    private onCloseUp(e: MouseEvent) {
        this.closeBtn.classList.remove('pressed');
        document.removeEventListener('mouseup', this.onCloseUp);
    }
    @BindThis
    private onCloseClick(e: MouseEvent) {
        EQ.updateValue(this.keyVisible, '0', null);
        EQ.sendEvent(this.item, this.item, EventCloseBox);
    }
    @BindThis
    private onQmarkDown(e: MouseEvent) {
        if (e.button !== 0) return;

        e.stopPropagation();

        this.qmarkBtn.classList.add('pressed');
        document.addEventListener('mouseup', this.onQmarkUp);
    }
    @BindThis
    private onQmarkUp(e: MouseEvent) {
        this.qmarkBtn.classList.remove('pressed');
        document.removeEventListener('mouseup', this.onQmarkUp);
    }
    @BindThis
    private onQmarkClick(e: MouseEvent) {
        EQ.sendEvent(this.item, this.keyPath, EventQMarkBox);
    }

    storeIniState() {
        EQ.sendEvent(this.item, this.keyPath, EventWindowRectChanged);

        // Saving line for INI as xRelativeCenter|yRelativeCenter|width|height
        const screenSize = windowManager.screenSize();
        const state = [
            (this.positionX + this.width / 2) / screenSize.w,
            (this.positionY + this.height / 2) / screenSize.h
        ];
        if (this.isSizable) {
            state.push(this.width);
            state.push(this.height);
        }
        const stateStr = state.join(ListSeparator);
        EQ.updateValue(this.keyIniState, stateStr, this);

        this.state.lastIniState = ''; // we are ready to read from ini
    }

    loadIniState() {
        const stateStr = EQ.getValue(this.keyIniState);
        if (stateStr === null) return;
        this.state.lastIniState = stateStr;
        const screenSize = windowManager.screenSize();
        if (stateStr !== null && stateStr !== '') {
            const state = stateStr.split(ListSeparator);
            if (this.isSizable && state.length >= 4) {
                this.width = parseInt(state[2]);
                this.height = parseInt(state[3]);
            }
            if (state.length >= 2) {
                let x = parseFloat(state[0]!) * screenSize.w - this.width / 2;
                let y = parseFloat(state[1]!) * screenSize.h - this.height / 2;
                x = Math.floor(clamp(x, 0, screenSize.w - this.width / 2));
                y = Math.floor(clamp(y, 0, screenSize.h - this.height / 2));
                this.positionX = x;
                this.positionY = y;
            }
            this.updatedPos();
        }
        this.state.lastIniState = ''; // we are ready to read from ini
    }

    updatedPos() {
        this.style.transform = translate(this.positionX, this.positionY);
        this.container.style.width = this.isMinimized ? String(MINIMIZED_WIDTH) : px(this.width);
        this.container.style.height = this.isMinimized ? String(MINIMIZED_WIDTH) : px(this.height);
        this.draggableRef?.setCoordinates({ x: this.positionX, y: this.positionY });
    }

    bindCpp(): void {
        // NOTE: on Visible changes we will bind/unbind children
        EQ.bindValue(this.keyVisible, '1', this);

        EQ.bindValue(this.keyOpacity, '1', this);
        EQ.bindValue(this.keyBackgroundUseTexture, '1', this);
        EQ.bindValue(this.keyBackgroundTintColor, '#ffffff', this);

        EQ.bindValue(this.keyTitle, this.title, this);

        EQ.bindValue(this.keyZClass, '0', this);
        EQ.bindValue(this.keyMinimized, '0', this); // Minimized property is synced with C++, no need to store to Ini
        EQ.bindValue(this.keyLocked, '0', this);

        EQ.bindValue(this.keyMovement, '', this);
        EQ.bindValue(this.keyIniState, '', this);

        // this.updated(); // Not required here
    }

    updated() {
        if (EQ.getValue(this.keyVisible) === '0') {
            if (this.style.visibility !== 'hidden') {
                // Hide window
                this.style.visibility = 'hidden';
                // NOTE: unbind eq-components from CPP updates
                this.querySelectorAll('*').forEach((el) => {
                    const element = el as BaseComponent;
                    if (element.tagName.includes('EQ-')) {
                        element?.unbindCpp?.();
                    }
                });
                windowManager.windowHidden(this.item);
                return; // Because window is hidden, discard other values changes
            }
        } else {
            if (this.style.visibility !== 'visible') {
                // Show window
                this.style.visibility = 'visible';
                // NOTE: bind eq-components to CPP updates
                this.querySelectorAll('*').forEach((el) => {
                    const element = el as BaseComponent;
                    if (element.tagName.includes('EQ-')) {
                        element?.bindCpp?.();
                    }
                });
                this.updatedPos();
                windowManager.windowShown(this.item, this);
            }
        }

        const zClassStr = EQ.getValue(this.keyZClass);
        if (zClassStr !== null) {
            const z = parseInt(zClassStr);
            if (z !== this.zClass) {
                this.zClass = z;
            }
        }

        const minimized = EQ.getValue(this.keyMinimized) === '1';
        if (minimized !== this.isMinimized) {
            this.isMinimized = minimized;
        }
        const locked = EQ.getValue(this.keyLocked) === '1';

        if (locked === this.isDraggable) {
            this.isDraggable = !locked;
        }

        const opacity = EQ.getValue(this.keyOpacity);
        if (opacity !== null && opacity !== this.state.opacity) {
            const elementsWithChangeableOpacity = this.querySelectorAll('[can-change-opacity]');
            this.state.opacity = opacity;
            elementsWithChangeableOpacity.forEach((el) => {
                (el as HTMLDivElement).style.opacity = opacity;
            });
        }

        const backgroundUseTexture = EQ.getValue(this.keyBackgroundUseTexture) === '1' ? true : false;
        if (backgroundUseTexture !== this.state.backgroundUseTexture) {
            this.state.backgroundUseTexture = backgroundUseTexture;
            const bg = this.querySelector('.background') as HTMLDivElement;
            if (!backgroundUseTexture) {
                bg.style.backgroundImage = 'none';
            } else {
                bg.style.backgroundImage = '';
            }
        }

        const backgroundTintColor = EQ.getValue(this.keyBackgroundTintColor);
        if (backgroundTintColor !== null && backgroundTintColor !== this.state.backgroundTintColor) {
            this.state.backgroundTintColor = backgroundTintColor;
            const bgColor = this.querySelector('.background-color') as HTMLDivElement;
            const bg = this.querySelector('.background') as HTMLDivElement;
            bgColor.style.backgroundColor = backgroundTintColor;
            bg.style.mixBlendMode = 'multiply';
        }

        const title = EQ.getValue(this.keyTitle);
        if (title !== null) {
            this.setAttribute(EqScreenAttributes.Title, title);
        }

        const iniState = EQ.getValue(this.keyIniState);
        if (iniState !== null && iniState !== '' && iniState !== this.state.lastIniState) {
            this.loadIniState();
        }

        const movement = EQ.getValue(this.keyMovement);
        if (movement !== null && movement !== '') {
            this.moveWindow(movement);
            EQ.updateValue(this.keyMovement, '', this); // reset "event"
        }
    }
    makeWindowActive() {
        windowManager.makeActive(this.item);
    }

    moveWindow(movement: string) {
        const scr = windowManager.screenSize();
        if (movement === 'Center') {
            this.positionX = Math.floor((scr.w - this.width) / 2);
            this.positionY = Math.floor((scr.h - this.height) / 2);
        }
        if (movement === 'Left') {
            this.positionX = 0;
        }
        if (movement === 'Right') {
            this.positionX = scr.w - this.width;
        }
        if (movement === 'Top') {
            this.positionY = 0;
        }
        if (movement === 'Bottom') {
            this.positionY = scr.h - this.height;
        }
        this.updatedPos();
        this.storeIniState();
    }

    attributeChangedCallback(
        name: typeof watchedAttributes[number],
        oldValue: string | null,
        newValue: string | null
    ): void {
        switch (name) {
            case EqScreenAttributes.Title: {
                if (this.titleElement) {
                    this.titleElement.innerHTML = this.title;
                }
                break;
            }
            case EqScreenAttributes.Sizable:
                components.waitForFrames(() => {
                    if (newValue !== null) {
                        [
                            this.frameRight,
                            this.frameRightTop,
                            this.frameRightBottom,
                            this.frameBottom,
                            this.frameBottomLeft,
                            this.frameBottomRight,
                            this.frameLeft,
                            this.frameLeftTop,
                            this.frameLeftBottom,
                            this.frameTop,
                            this.frameTopLeft,
                            this.frameTopRight
                        ].forEach((el) => el.addEventListener('mousedown', this.onResizeMousedown));
                    } else {
                        [
                            this.frameRight,
                            this.frameRightTop,
                            this.frameRightBottom,
                            this.frameBottom,
                            this.frameBottomLeft,
                            this.frameBottomRight,
                            this.frameLeft,
                            this.frameLeftTop,
                            this.frameLeftBottom,
                            this.frameTop,
                            this.frameTopLeft,
                            this.frameTopRight
                        ].forEach((el) => el.removeEventListener('mousedown', this.onResizeMousedown));
                    }
                }, 1);
                break;

            case EqScreenAttributes.Draggable:
                components.waitForFrames(() => {
                    if (newValue !== null) {
                        const controls = [];
                        if (!this.isSizable) {
                            controls.push(
                                this.frameRight,
                                this.frameBottom,
                                this.frameLeft,
                                this.frameTopLeft,
                                this.frameLeftTop,
                                this.frameRightTop,
                                this.frameTopRight,
                                this.frameBottomLeft,
                                this.frameLeftBottom,
                                this.frameBottomRight,
                                this.frameRightBottom
                            );
                        }
                        if (this.titlebar) {
                            controls.push(this.titlebar);
                        }
                        this.draggableRef = new Draggable(this, controls, {
                            initialX: this.positionX,
                            initialY: this.positionY,
                            onStart: () => {
                                windowManager.initiateDocking(this.item);
                            },
                            onChangePosition: (x, y) => {
                                const dockedPos = windowManager.applyDocking(x, y);
                                this.positionX = dockedPos.x;
                                this.positionY = dockedPos.y;
                                this.updatedPos();
                            },
                            onFinish: () => {
                                this.storeIniState();
                            }
                        });
                    } else {
                        this.draggableRef?.destroy();
                        this.draggableRef = null;
                    }
                }, 1);
                break;
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.titleElement = this.querySelector('.title')!;
                this.titleElement.innerHTML = this.title;
                this.container = this.firstElementChild as HTMLElement;

                this.addEventListener('mousedown', this.onMouseDown);

                this.addEventListener('mouseover', this.onMouseOver);
                this.addEventListener('mouseout', this.onMouseOut);

                this.frameRight = this.querySelector('.window-frame-right')!;
                this.frameBottom = this.querySelector('.window-frame-bottom')!;
                this.frameTop = this.querySelector('.window-frame-top')!;
                this.frameLeft = this.querySelector('.window-frame-left')!;
                this.frameBottomRight = this.querySelector('.window-frame-bottom-right')!;
                this.frameRightBottom = this.querySelector('.window-frame-right-bottom')!;
                this.frameBottomLeft = this.querySelector('.window-frame-bottom-left')!;
                this.frameLeftBottom = this.querySelector('.window-frame-left-bottom')!;
                this.frameTopRight = this.querySelector('.window-frame-top-right')!;
                this.frameRightTop = this.querySelector('.window-frame-right-top')!;
                this.frameTopLeft = this.querySelector('.window-frame-top-left')!;
                this.frameLeftTop = this.querySelector('.window-frame-left-top')!;

                const body = this.container?.querySelector('.window-body') as HTMLElement;
                if (this.hasAttribute(EqScreenAttributes.Overflow)) {
                    body.style.overflow = this.getAttribute(EqScreenAttributes.Overflow) ?? '';
                }

                if (this.hasMinimizebox) {
                    this.minimizeBtn = this.querySelector('eq-screen .titlebar-left .minimize')!;
                    this.minimizeBtn.style.display = 'block';
                    this.minimizeBtn.addEventListener('mousedown', this.onMinimizeDown);
                    this.minimizeBtn.addEventListener('click', this.onMinimizeClick);
                    this.minimizeBtn.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, 'Minimize this window');
                    this.minimizeBtn.addEventListener('mouseover', () => {
                        tooltip.setElement(this.minimizeBtn);
                    });
                }
                if (this.hasClosebox) {
                    this.closeBtn = this.querySelector('eq-screen .titlebar-right .close')!;
                    this.closeBtn.style.display = 'block';
                    this.closeBtn.addEventListener('mousedown', this.onCloseDown);
                    this.closeBtn.addEventListener('click', this.onCloseClick);
                    this.closeBtn.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, 'Close this window');
                    this.closeBtn.addEventListener('mouseover', () => {
                        tooltip.setElement(this.closeBtn);
                    });
                }
                if (this.hasQmarkbox) {
                    this.qmarkBtn = this.querySelector('eq-screen .titlebar-right .qmark')!;
                    this.qmarkBtn.style.display = 'block';
                    this.qmarkBtn.addEventListener('mousedown', this.onQmarkDown);
                    this.qmarkBtn.addEventListener('click', this.onQmarkClick);
                    this.qmarkBtn.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, 'Click for help about this window.');
                    this.qmarkBtn.addEventListener('mouseover', () => {
                        tooltip.setElement(this.qmarkBtn);
                    });
                }
                if (this.hasTitlebar) {
                    this.titlebar = this.querySelector('eq-screen .titlebar')!;
                    this.titlebar.style.display = 'flex';
                }

                this.scrollContainers = this.querySelectorAll('eq-scroll-container');
                this.eqLists = this.querySelectorAll('eq-list');
            })
            .catch((e) => {
                console.error(e);
            });
    }

    disconnectedCallback() {
        this.draggableRef?.destroy();

        this.frameRight?.removeEventListener('mousedown', this.onResizeMousedown);
        this.frameBottom?.removeEventListener('mousedown', this.onResizeMousedown);
        this.frameBottomRight?.removeEventListener('mousedown', this.onResizeMousedown);
        components.waitForFrames(() => {
            this.removeEventListener('mousedown', this.onMouseDown);
            document.removeEventListener('mouseup', this.onResizeMouseup);
        }, 1);
    }
}
components.defineCustomElement('eq-screen', EqScreen);
export default EqScreen;
