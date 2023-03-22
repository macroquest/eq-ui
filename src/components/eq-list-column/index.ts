import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, BindThis, Html } from '../base-component';
import { tooltip, TOOLTIP_CONTENT_ATTRIBUTE } from '../eq-tooltip';

@Html(template)
class EqListColumn extends BaseComponent {
    column!: HTMLDivElement;
    content!: HTMLDivElement;
    constructor() {
        super();
    }

    @BindThis
    onMouseover(e: MouseEvent) {
        if (this?.getBoundingClientRect().width <= this.content.getBoundingClientRect().width) {
            e.stopPropagation();
            tooltip.setElement(this, false);
        }
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.column = this.firstElementChild as HTMLDivElement;
                this.content = this.querySelector('.col-content') as HTMLDivElement;
                this.column.addEventListener('mouseover', this.onMouseover);

                if (this.column.textContent) {
                    this.setAttribute(TOOLTIP_CONTENT_ATTRIBUTE, this.column.textContent);
                }
            })
            .catch((e) => {
                console.error(e);
            });
    }
}
components.defineCustomElement('eq-list-column', EqListColumn);
export default EqListColumn;
