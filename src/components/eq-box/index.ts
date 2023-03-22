import components from 'coherent-gameface-components';
import template from './template.html';
import { BaseComponent, Html } from '../base-component';

enum EqBoxAttributes {
    StyleBorder = 'style-border',
    StyleTooltip = 'style-tooltip',
    StyleVerticalScroll = 'style-vscroll',
    StyleHorizontalScroll = 'style-hscroll',
    StyleTransparent = 'style-transparent',
    TemplateClass = 'template',
    LeftAnchorOffset = 'left-anchor-ofset',
    TopAnchorOffset = 'top-anchor-offset',
    RightAnchorOffset = 'right-anchor-offset',
    BottomAnchorOffset = 'bottom-anchor-offset'
}

@Html(template)
class EqBox extends BaseComponent {
    constructor() {
        super();
    }

    get styleBorder(): boolean {
        return this.hasAttribute(EqBoxAttributes.StyleBorder);
    }

    get styleTooltip(): boolean {
        return this.hasAttribute(EqBoxAttributes.StyleTooltip);
    }

    get styleVerticalScroll(): boolean {
        return this.hasAttribute(EqBoxAttributes.StyleVerticalScroll);
    }

    get styleHorizontalScroll(): boolean {
        return this.hasAttribute(EqBoxAttributes.StyleHorizontalScroll);
    }

    get styleTransparent(): boolean {
        return this.hasAttribute(EqBoxAttributes.StyleTransparent);
    }

    get templateClass(): string {
        return this.hasAttribute(EqBoxAttributes.TemplateClass)
            ? this.getAttribute(EqBoxAttributes.TemplateClass)!
            : '';
    }

    get leftAnchorOffset(): number {
        return this.hasAttribute(EqBoxAttributes.LeftAnchorOffset)
            ? Number(this.getAttribute(EqBoxAttributes.LeftAnchorOffset)!)
            : 0;
    }

    get rightAnchorOffset(): number {
        return this.hasAttribute(EqBoxAttributes.RightAnchorOffset)
            ? Number(this.getAttribute(EqBoxAttributes.RightAnchorOffset)!)
            : 0;
    }

    get topAnchorOffset(): number {
        return this.hasAttribute(EqBoxAttributes.TopAnchorOffset)
            ? Number(this.getAttribute(EqBoxAttributes.TopAnchorOffset)!)
            : 0;
    }

    get bottomAnchorOffset(): number {
        return this.hasAttribute(EqBoxAttributes.BottomAnchorOffset)
            ? Number(this.getAttribute(EqBoxAttributes.BottomAnchorOffset)!)
            : 0;
    }

    connectedCallback() {
        this.componentRendered()
            .then(() => {
                this.classList.add(this.templateClass);

                if (this.styleBorder) {
                    const borderContainers = [
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
                        'window-frame-left-bottom'
                    ];

                    borderContainers.forEach((elem) => {
                        const divElement = this.querySelector('.' + elem);
                        if (divElement) {
                            (divElement as HTMLDivElement).classList.add('d-block');
                        }
                    });
                }
            })
            .catch((e) => {
                console.error(e);
            });
    }
}

components.defineCustomElement('eq-box', EqBox);
export default EqBox;
