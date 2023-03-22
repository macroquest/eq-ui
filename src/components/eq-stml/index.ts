import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, Html } from '../base-component';
import { EQ } from '../../eqengine';
import { AttrContent } from '../../eqconst';
import '../eq-box';

const convertBrBr = (content: string) => {
    return content.replace(/<br><br>/gi, '<div class="brbr"></div>');
};

const convertBr = (content: string) => {
    return content.replace(/<br>/gi, '<div class="br"></div>');
};

const convertC = (container: HTMLElement) => {
    for (const c of container.getElementsByTagName('c')) {
        const span = document.createElement('span');
        const color = c.getAttributeNames()[0].replace(/"|'/g, '');
        span.style.color = color;
        span.textContent = c.textContent;
        container.insertBefore(span, c);
        container.removeChild(c);
    }
};

enum EqStmlAttributes {
    Item = 'item',
    Content = 'content',
    Dispatch = 'dispatch',
    TemplateClass = 'template'
}

@Html(template)
class EqStml extends BaseComponent {
    private keyPath: string;
    private container!: HTMLElement;
    private scrollContainerSlot!: HTMLElement;

    constructor() {
        super();
        this.keyPath = `${this.dispatch}.${this.item}`;
    }

    private get dispatch() {
        return this.getAttribute(EqStmlAttributes.Dispatch);
    }

    private get item() {
        return this.getAttribute(EqStmlAttributes.Item);
    }

    private get keyContent() {
        return `${this.keyPath}.${AttrContent}`;
    }

    private get templateClass(): string {
        return this.hasAttribute(EqStmlAttributes.TemplateClass)
            ? this.getAttribute(EqStmlAttributes.TemplateClass)!
            : '';
    }

    bindCpp(): void {
        EQ.bindValue(this.keyContent, '', this);
        this.updated();
    }

    updated() {
        const content = EQ.getValue(this.keyContent);
        if (content === null) return;

        this.scrollContainerSlot.innerHTML = convertBr(convertBrBr(content));

        convertC(this.scrollContainerSlot);
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.container = this.querySelector('.eq-stml-container')!;
                this.scrollContainerSlot = this.container.querySelector('component-slot[data-name="content"]')!;
                this.scrollContainerSlot.style.display = 'flex';
                this.scrollContainerSlot.style.flexWrap = 'wrap';
                this.scrollContainerSlot.style.lineHeight = '1.7rem';
                const eqBoxes = this.querySelectorAll('eq-box')!;
                eqBoxes.forEach((eqBox) => eqBox.setAttribute('template', this.templateClass));
            })
            .catch((e) => {
                console.error(e);
            });
    }
}
components.defineCustomElement('eq-stml', EqStml);
export default EqStml;
