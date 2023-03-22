/* eslint-disable @typescript-eslint/member-ordering */
//---------------------------------------------------------
// WindowManager
// Class for managing windows Z-coords and docking
//---------------------------------------------------------
import {
    DockingRadiusPx,
    KeySystemUIScale,
    KeySystemUIVisible,
    ZClassMultiplier,
    ZCountMultiplier
} from '../../eqconst';
import EqScreen from '../../components/eq-screen';
import { EQ } from '../../eqengine';

interface StickTypeY {
    x: number;
    y: Array<number>;
}
interface StickTypeX {
    x: Array<number>;
    y: number;
}

class WindowManager {
    visibleWindows: Map<string, EqScreen> = new Map();
    windowsSet: Map<number, Set<EqScreen>> = new Map(); //Set();
    stickX: Set<StickTypeY> = new Set();
    stickY: Set<StickTypeX> = new Set();

    scaleUI = 1; // Scale of UI

    // It's called at EQ.startup
    setup() {
        this.bindCpp();
    }

    bindCpp() {
        EQ.bindValue(KeySystemUIVisible, '1', this);
        EQ.bindValue(KeySystemUIScale, '1', this);
        this.updated();
    }

    updated() {
        const isUiVisible = EQ.getValue(KeySystemUIVisible);
        if (isUiVisible !== '0') {
            document.body.style.display = '';
        } else {
            document.body.style.display = 'none';
        }

        const scaleStr = EQ.getValue(KeySystemUIScale);
        if (scaleStr !== null && scaleStr !== '') {
            const scaleUI = parseFloat(scaleStr);
            if (scaleUI !== this.scaleUI) {
                this.setScaleUi(scaleUI);
            }
        }
    }

    setScaleUi(scaleUI: number) {
        console.log('Set UI scale:', scaleUI);
        this.scaleUI = scaleUI;
        /**
         * NOTE: we can calculate scale factor like this
         *
         * @example
         * const windowWidth = window.innerWidth;
         * windowManager.scaleUIX = windowWidth / 800;
         * @see https://docs.coherent-labs.com/cpp-gameface/content_development/scalableui/
         */
        const fontSize = 10 * scaleUI;

        const rootElement = document.getElementsByTagName('html')[0];
        rootElement.style.fontSize = `${fontSize}px`;
    }

    /** Call this when window is shown */
    public windowShown(window: string, elem: EqScreen) {
        this.visibleWindows.set(window, elem);
        const zClass = elem.zClass;
        this.addToSet(elem, zClass);
        // For faster performance we don't makeActive, but only set Z for this window
        this.setWindowZ(elem, this.windowsSet.get(zClass)!.size);
    }

    /** Call this when window is hidden */
    public windowHidden(window: string) {
        if (this.visibleWindows.has(window)) {
            const elem = this.visibleWindows.get(window)!;
            this.removeFromSet(elem, elem.zClass);
            this.visibleWindows.delete(window);
        }
    }

    /**  Show window on the top of others */
    public makeActive(window: string) {
        if (this.visibleWindows.has(window)) {
            const elem = this.visibleWindows.get(window);
            if (elem) {
                let count = 0;
                const zClass = elem.zClass;
                this.removeFromSet(elem, zClass);
                this.addToSet(elem, zClass);
                const set = this.windowsSet.get(zClass)!;
                set.forEach((win) => {
                    count += 1;
                    this.setWindowZ(win, count);
                });
            }
        }
    }

    /**  zClass set from backend */
    public zClassWasUpdated(elem: EqScreen, prevZClass: number) {
        this.removeFromSet(elem, prevZClass);
        this.addToSet(elem, elem.zClass);
    }

    /**  Screen size */
    public screenSize() {
        return { w: window.innerWidth, h: window.innerHeight };
    }

    // Docking
    /** Returns window dimensions */
    public getWindowRectangle(eqWindow: string) {
        if (!this.visibleWindows.has(eqWindow)) {
            console.error('getWindowRectangle error, no visible window', eqWindow);
            return {
                x: 0,
                y: 0,
                w: 100,
                h: 100,
                x2: 100,
                y2: 100
            };
        }

        const elem = this.visibleWindows.get(eqWindow)!;
        const x = elem.positionX;
        const y = elem.positionY;
        const w = elem.width * this.scaleUI;
        const h = elem.height * this.scaleUI;
        return {
            x: x,
            y: y,
            w: w,
            h: h,
            x2: x + w,
            y2: y + h
        };
    }

    /** Create sticking points */
    public initiateDocking(window: string) {
        this.stickX.clear();
        this.stickY.clear();
        const winRect = this.getWindowRectangle(window);
        const screenSize = this.screenSize();
        this.stickX
            .add({ x: 0, y: [-winRect.h, screenSize.h] })
            .add({ x: screenSize.w - 1 - winRect.w, y: [-winRect.h, screenSize.h] });
        this.stickY
            .add({ y: 0, x: [-winRect.w, screenSize.w] })
            .add({ y: screenSize.h - 1 - winRect.h, x: [-winRect.w, screenSize.w] });

        for (const winPair of this.visibleWindows) {
            const otherWindow = winPair[0];
            if (otherWindow !== window) {
                const rect = this.getWindowRectangle(otherWindow);
                const xLeft = rect.x - winRect.w;
                const yAbove = rect.y - winRect.h;
                if (rect.x >= 0 && rect.x < screenSize.w) {
                    this.stickX
                        .add({ x: rect.x, y: [yAbove, yAbove] })
                        .add({ x: rect.x, y: [rect.y2, rect.y2] })
                        .add({ x: xLeft, y: [yAbove, rect.y2] });
                }
                if (rect.x2 >= 0 && rect.x2 < screenSize.w) {
                    this.stickX
                        .add({ x: rect.x2, y: [yAbove, rect.y2] })
                        .add({ x: rect.x2 - winRect.w, y: [yAbove, yAbove] })
                        .add({ x: rect.x2 - winRect.w, y: [rect.y2, rect.y2] });
                }
                if (rect.y >= 0 && rect.y < screenSize.h) {
                    this.stickY
                        .add({ y: rect.y, x: [xLeft, xLeft] })
                        .add({ y: rect.y, x: [rect.x2, rect.x2] })
                        .add({ y: yAbove, x: [xLeft, rect.x2] });
                }
                if (rect.y2 >= 0 && rect.y2 < screenSize.h) {
                    this.stickY
                        .add({ y: rect.y2, x: [xLeft, rect.x2] })
                        .add({ y: rect.y2 - winRect.h, x: [xLeft, xLeft] })
                        .add({ y: rect.y2 - winRect.h, x: [rect.x2, rect.x2] });
                }
            }
        }
    }

    public distanceToSegment(x: number, segment: Array<number>) {
        if (x < segment[0]) return segment[0] - x;
        if (x > segment[1] - 1) return x - (segment[1] - 1);
        return 0;
    }

    /** Apply docking by stich to points. Returns updated coordinates as {x:x, y:y} */
    public applyDocking(x: number, y: number) {
        // Control that position is inside screen
        const screenSize = this.screenSize();
        if (x >= screenSize.w) x = screenSize.w - 1;
        if (y >= screenSize.h) y = screenSize.h - 1;
        const r = DockingRadiusPx * this.scaleUI;
        const found = { x: x, distX: r, y: y, distY: r };
        for (const stickX of this.stickX) {
            if (this.distanceToSegment(y, stickX.y) <= r) {
                const distX = Math.abs(x - stickX.x);
                if (distX <= found.distX) {
                    found.x = stickX.x;
                    found.distX = distX;
                }
            }
        }
        for (const stickY of this.stickY) {
            if (this.distanceToSegment(x, stickY.x) <= r) {
                const distY = Math.abs(y - stickY.y);
                if (distY <= found.distY) {
                    found.y = stickY.y;
                    found.distY = distY;
                }
            }
        }
        return { x: found.x, y: found.y };
    }

    setWindowZ(elem: EqScreen, count: number) {
        this.setElemZ(elem, elem.zClass, count);
    }

    setElemZ(elem: HTMLElement, zClass: number, count: number) {
        const z = zClass * ZClassMultiplier + count * ZCountMultiplier;
        elem.style.zIndex = String(z);
    }

    private addToSet(elem: EqScreen, zClass: number) {
        if (!this.windowsSet.has(zClass)) {
            this.windowsSet.set(zClass, new Set());
        }
        const set = this.windowsSet.get(zClass)!;
        set.add(elem);
    }

    private removeFromSet(elem: EqScreen, zClass: number) {
        if (this.windowsSet.has(zClass)) {
            const classSet = this.windowsSet.get(zClass);
            classSet?.delete(elem);
        }
    }
}

export const windowManager = new WindowManager();
