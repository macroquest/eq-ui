import { BindThis } from '../../components/base-component';
import { px, translate } from '../../components/helpers/helpers';
import { EQ } from '../../eqengine';
import { AttrBackgrImage, AttrEnabled, AttrImage, AttrQuantity, AttrText, KeyNameCursorAttachment } from '../../eqconst';

const CURSOR_FOLLOWER_OFFSET_X = 10;
const CURSOR_FOLLOWER_OFFSET_Y = 10;
const CURSOR_FOLLOWER_ELEMENT_TAG = 'cursor-follower';

class CursorFollower {
    container!: HTMLDivElement;
    item!: HTMLDivElement;
    quantityContainer!: HTMLDivElement;
    textContainer!: HTMLDivElement;
    isShown = false;
    itemsUrl = '';
    backgroundUrl = '';
    startX = 0;
    startY = 0;
    enabled = false;

    private keyPath: string;

    constructor() {
        this.container = document.createElement(CURSOR_FOLLOWER_ELEMENT_TAG) as HTMLDivElement;
        this.container.style.position = 'relative';
        this.item = document.createElement('div') as HTMLDivElement;
        this.item.style.position = 'absolute';
        this.item.style.top = '0';
        this.item.style.bottom = '0';
        this.item.style.left = '0';
        this.item.style.right = '0';
        this.container.appendChild(this.item);
        this.hide();
        document.body.appendChild(this.container);

        this.keyPath = `${KeyNameCursorAttachment}`;
        this.bindCpp();
        // Registering mouse events to store cursor follower starting position
        document.addEventListener('mousedown', this.onDocumentMouseEvent);
        document.addEventListener('mouseup', this.onDocumentMouseEvent);
    }

    private get keyEnabled() {
        return `${this.keyPath}.${AttrEnabled}`;
    }
    private get keyBackgrImage() {
        return `${this.keyPath}.${AttrBackgrImage}`;
    }
    private get keyImage() {
        return `${this.keyPath}.${AttrImage}`;
    }
    private get keyQuantity() {
        return `${this.keyPath}.${AttrQuantity}`;
    }
    private get keyText() {
        return `${this.keyPath}.${AttrText}`;
    }

    /** Listener for global mouse event to update starting position of cursor follower */
    @BindThis
    onDocumentMouseEvent(e: MouseEvent) {
        this.startX = e.clientX;
        this.startY = e.clientY;
    }

    @BindThis
    onMousemove(e: MouseEvent) {
        this.showAtPosition(e.clientX, e.clientY);
    }

    bindCpp(): void {
        EQ.bindValue(this.keyEnabled, '0', this);
        EQ.bindValue(this.keyBackgrImage, '', this);
        EQ.bindValue(this.keyImage, '', this);
        EQ.bindValue(this.keyQuantity, '', this);
        EQ.bindValue(this.keyText, '', this);
        // this.updated(); // Not required here
    }

    updated() {
        const enabled = EQ.getValue(this.keyEnabled) === '1';
        if (enabled !== this.enabled || enabled == '1' ) {
            this.enabled = enabled;
            // Note: The implementation assumes that image, background and quantity
            // are set in the same frame with Enabled and don't changes
            if (enabled) {
                const imageUrl = EQ.getValue(this.keyImage);
                const backgroundUrl = EQ.getValue(this.keyBackgrImage);
                const quantity = EQ.getValue(this.keyQuantity);
                const text = EQ.getValue(this.keyText);
				this.removeItem();
				this.removeBackground();
				console.log('CursorAttachment CLEANED');
                if (imageUrl || backgroundUrl) {
                    this.show();
                    this.container.classList.add('picked-inv-item');
                    this.showAtPosition(this.startX, this.startY);
                }
                if (imageUrl) {
                    this.addItem(imageUrl);
                    this.addText(text);
                    this.addQuantity(quantity);
                    
                    this.showAtPosition(this.startX, this.startY);
                } else {
                    this.removeItem();
                    console.log('CursorAttachment show error - empty image URL');
                }
                if (backgroundUrl) {
                    this.addBackground(backgroundUrl);
                } else {
                    this.removeBackground();
                }
            } else {
                this.hide();
                this.container.classList.remove('picked-inv-item');
                this.removeItem();
                this.removeBackground();
            }
        }
    }

    showAtPosition(x: number, y: number) {
        this.container.style.transform = translate(x + CURSOR_FOLLOWER_OFFSET_X, y + CURSOR_FOLLOWER_OFFSET_Y);
        this.container.style.display = 'block';
    }

    show() {
        this.isShown = true;
        document.addEventListener('mousemove', this.onMousemove);
    }

    hide() {
        this.isShown = false;
        document?.removeEventListener('mousemove', this.onMousemove);
        this.container.style.display = 'none';
        if (this.quantityContainer) {
            this.container.removeChild(this.quantityContainer);
        }
    }

    addItem(url: string) {
        this.itemsUrl = url;
        this.item.style.backgroundImage = `url('${url}')`;
        this.item.style.backgroundSize = `100%`;
    }
    addBackground(url: string) {
        this.backgroundUrl = url;
        this.container.style.backgroundImage = `url('${url}')`;
        this.container.style.backgroundSize = `100%`;
    }

    addQuantity(quantity: string | null) {
        if (this.quantityContainer) {
            this.container.removeChild(this.quantityContainer);
        }
        if (quantity) {
            this.quantityContainer = document.createElement('div');
            this.quantityContainer.innerHTML = String(quantity);
            this.quantityContainer.style.position = 'absolute';
            this.quantityContainer.style.bottom = '0';
            this.quantityContainer.style.right = '0';
            this.quantityContainer.style.color = 'var(--c_crWhite)';
            this.quantityContainer.style.backgroundColor = 'var(--c_crVDkGray)';
            this.quantityContainer.style.fontSize = px(10);
            this.quantityContainer.style.lineHeight = px(11);
            this.container.appendChild(this.quantityContainer);
        } 
    }

    addText(text: string | null) {
        if (this.textContainer) {
            this.container.removeChild(this.textContainer);
        }
        if (text) {
            this.textContainer = document.createElement('div');
            this.textContainer.innerHTML = text;
            this.textContainer.style.position = 'absolute';
            this.textContainer.style.top = '50%';
            this.textContainer.style.left = '50%';
            this.textContainer.style.transform = 'translate(-50%, -50%)';
            this.textContainer.style.color = 'var(--c_crWhite)';
            this.textContainer.style.overflowWrap = 'break-word';
            this.textContainer.style.textAlign = 'center';
            this.textContainer.style.fontSize = px(10);
            this.textContainer.style.lineHeight = px(11);
            this.textContainer.style.maxHeight = px(33);
            this.textContainer.style.overflow = 'hidden';
            this.container.appendChild(this.textContainer);
        }
    }

    removeItem() {
        this.itemsUrl = '';
        this.item.style.backgroundImage = '';
    }
    removeBackground() {
        this.backgroundUrl = '';
        this.container.style.backgroundImage = '';
    }
}

export const cursorFollower = new CursorFollower();
