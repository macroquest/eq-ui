import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, Html } from '../base-component';

@Html(template)
class EqSeparator extends BaseComponent {
    connectedCallback() {
        // NOTE: calling this function inside the constructor leads to c++ crash
        this.setAttribute('can-change-opacity', '');
        this.componentRendered().catch((e) => {
            console.error(e);
        });
    }
}
components.defineCustomElement('eq-separator', EqSeparator);
export default EqSeparator;
