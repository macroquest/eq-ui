import components from 'coherent-gameface-components';
import { EQ } from '../../eqengine';

export abstract class BaseComponent extends HTMLElement {
    /**
     * Initialized by Attributes decorator
     */
    private static observedAttributes: readonly string[];
    /**
     * Initialized by Html decorator
     */
    private template!: string;

    bindCpp?(): void;
    unbindCpp(): void {
        EQ.removeNotifications(this);
    }

    protected attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
    protected disconnectedCallback?(): void;
    protected adoptedCallback?(): void;
    protected updated?(): void;

    protected async componentRendered() {
        try {
            this.style.opacity = '0';
            const result = await components.loadResource(this);
            this.template = result.template;
            components.renderOnce(this);
        } catch (err: any) {
            console.error(err);
        } finally {
            components.waitForFrames(() => {
                this.style.opacity = '1';
            });
        }
    }
    protected abstract connectedCallback(): void;
}
/**
 * Adds template to component
 * @param template {string} - valid HTML string
 */
export function Html(template: string) {
    return <T extends { new (...args: any[]): any }>(constructor: T) => {
        return class WithTemplate extends constructor {
            template = template;
        };
    };
}
/**
 * Adds static observedAttributes getter to component
 * @param attributes {string[]} - observed attributes
 * @see  https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks
 */
export function Attributes(attributes: readonly string[]) {
    return <T extends { new (...args: any[]): any }>(constructor: T) => {
        return class WithAttributes extends constructor {
            static get observedAttributes() {
                return attributes;
            }
        };
    };
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function BindThis<T extends Function>(
    target: object,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
): TypedPropertyDescriptor<T> | void {
    if (!descriptor || typeof descriptor.value !== 'function') {
        throw new TypeError(`Only methods can be decorated with @bind. <${propertyKey}> is not a method!`);
    }

    return {
        configurable: true,
        get(this: T): T {
            const bound: T = descriptor.value!.bind(this);
            Object.defineProperty(this, propertyKey, {
                value: bound,
                configurable: true,
                writable: true
            });
            return bound;
        }
    };
}
