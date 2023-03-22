/* eslint-disable no-undef */
import '../lib/cohtml';
import './lib/eq-cursor-follower';
// NOTE: imports html files for windows
import './windows';
import './components/eq-toggle-button';
import './components/eq-screen';
import './components/eq-checkbox';
import './components/eq-scroll-container';
import './components/eq-list';
import './components/eq-list-column';
import './components/eq-stml';
import './components/eq-button';
import './components/eq-separator';
import './components/eq-progress-bar';
import './components/eq-label';
import './components/eq-drop-down';
import './components/eq-tabs';
import './components/eq-box';
import './components/eq-inv-slot';
import './components/eq-image';
import './components/eq-vertical-layout';
import './components/eq-input';
import './components/eq-slider';
import './index.css';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- NOTE: Don't delete this, it's required for correct bundling
import components from 'coherent-gameface-components';
import { EQ } from './eqengine';

declare global {
    interface Window {
        /**
         * Debugging tools for printing available values at localhost:9444 console:
         * - Print values:
         *   @example window.printValues() - prints all keys and their values
         *   @example window.printValues("inventorywindow") - prints keys containing "inventorywindow" and their values
         *   Search is case-insensitive.
         */
        printValues: typeof EQ['printValues'];
        /**
         * - Change values:
         *  @example updateValue('LABELTYPE_HP', '60') to change user's level to '60'
         *  @example updateValue("InventoryWindow.ProgressionList.Content",	'[{"cells":[{"type":0,"value":"Goblinoid"},{"type":0,"value":"1/5"},{"type":0,"value":"Orc Brute"},{"type":0,"value":"13%"}]}]')
         */
        updateValue: typeof EQ['updateValue'];
        scaleFactor: number;
    }
}

window.printValues = EQ.printValues.bind(EQ);
window.updateValue = EQ.updateValue.bind(EQ);

try {
    engine.whenReady
        .then(() => {
            EQ.startup();
        })
        .catch((e) => {
            console.error('Error during startup', e);
        });
} catch (e) {
    console.error("Perhaps, you didn't import cohtml.js", e);
}
