//------------------------------------------------------------------
// This file defines events names and related utilities
//------------------------------------------------------------------
import { EqContextMenu } from './components/eq-context-menu';
import { EqEvent } from './eqengine';
import { ListSeparator } from './eqconst';

//------------------------------------------------------------------
// Key modifiers
//------------------------------------------------------------------
export const KeyModifierCtrl = 'Ctrl';
export const KeyModifierAlt = 'Alt';
export const KeyModifierShift = 'Shift';

//------------------------------------------------------------------
// Events from JS to C++
//------------------------------------------------------------------
export const EventSelItem = 'EventSelItem';
export const EventValueChange = 'EventValueChange';
export const EventAccept = 'EventAccept';
export const EventContextMenuSelItem = 'EventContextMenuSelItem';

export const EventQMarkBox = 'EventQMarkBox';
export const EventCloseBox = 'EventCloseBox';
export const EventMinimizeBox = 'EventMinimizeBox';

export const EventLClick = 'EventLClick';
export const EventLLongClick = 'EventLLongClick';
export const EventRClick = 'EventRClick';
export const EventRLongClick = 'EventRLongClick';
export const EventRButtonDown = 'EventRButtonDown';
export const EventLLongUp = 'EventLLongUp';
export const EventRLongUp = 'EventRLongUp';

export const EventWindowRectChanged = 'EventWindowRectChanged';
export const EventMouseOver = 'EventMouseOver';
export const EventMouseOut = 'EventMouseOut';

export const EventColumnClick = 'EventColumnClick';

//------------------------------------------------------------------
// Events from C++ to JS
//------------------------------------------------------------------
export const HostEventPopupContextMenu = 'HostEventPopupContextMenu';

//------------------------------------------------------------------
// Types
//------------------------------------------------------------------
const EventsNames = [
    EventSelItem,
    EventValueChange,
    EventAccept,
    EventContextMenuSelItem,
    EventQMarkBox,
    EventCloseBox,
    EventMinimizeBox,
    EventLClick,
    EventLLongClick,
    EventRClick,
    EventRLongClick,
    EventRButtonDown,
    EventLLongUp,
    EventRLongUp,
    EventWindowRectChanged,
    EventMouseOver,
    EventMouseOut,
    EventColumnClick
];

export type EventsType = typeof EventsNames[number];

//------------------------------------------------------------------
// Utility functions
//------------------------------------------------------------------
export function encodeKeyModifiers(e: MouseEvent) {
    const s = [];
    if (e.ctrlKey) s.push(KeyModifierCtrl);
    if (e.altKey) s.push(KeyModifierAlt);
    if (e.shiftKey) s.push(KeyModifierShift);
    return s.join(ListSeparator);
}

export function handleEventFromCpp(event: EqEvent) {
    switch (event.message) {
        case HostEventPopupContextMenu: {
            const menu = JSON.parse(event.params!);
            const pos = menu.pos;
            const items = menu.items;

            const c = new EqContextMenu(event.dispatch, items, pos.x, pos.y);
            c.show();

            return;
        }
    }
}

//------------------------------------------------------------------
