import Element, { ElementArgs } from '../Element';
import { PREFIX } from '../../class';

const CLASS_BUTTON = PREFIX + 'button';

/**
 * {@link Button}构造函数的参数。
 */
export interface ButtonArgs extends ElementArgs {
    /**
     * 如果' true '， {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML innerHTML}属性将被用来设置文本。
     * 否则，将使用{@link https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent textContent}。
     * 默认为“false”。
     */
    unsafe?: boolean;
    /**
     * 设置按钮的文本。默认为""。
     */
    text?: string,
    /**
     * 按钮图标的CSS代码。如'E401'(注意省略了'\\'字符)。默认为""。
     */
    icon?: string,
    /**
     * 设置按钮的“size”类型。可以是'small'或'null '。默认为'small '。
     */
    size?: 'small'
}

/**
 * 用户输入与点击交互
 */
class Button extends Element {
    protected _unsafe: boolean;

    protected _text: string | undefined;

    protected _icon: string | undefined;

    protected _size: string | undefined | null;

    constructor(args: Readonly<ButtonArgs> = {}) {
        super({ dom: 'button', ...args });

        this.class.add(CLASS_BUTTON);

        this._unsafe = !!args.unsafe;

        (this.text as any) = args.text;
        (this.size as any) = args.size;
        (this.icon as any) = args.icon;

        (this.dom as any).addEventListener('keydown', this._onKeyDown);
    }

    destroy() {
        if (this._destroyed) return;

        (this.dom as any).removeEventListener('keydown', this._onKeyDown);

        super.destroy();
    }

    protected _onKeyDown = (evt: KeyboardEvent) => {
        if (evt.key === 'Escape') {
            this.blur();
        } else if (evt.key === 'Enter') {
            this._onClick(evt);
        }
    };

    protected _onClick(evt: Event) {
        this.blur();
        if (this.readOnly) return;

        super._onClick(evt);
    }

    focus() {
        (this.dom as any).focus();
    }

    blur() {
        (this.dom as any).blur();
    }

    /**
     * 获取/设置按钮的文本
     */
    set text(value: string) {
        if (this._text === value) return;
        this._text = value;
        if (this._unsafe) {
            (this.dom as any).innerHTML = value;
        } else {
            (this.dom as any).textContent = value;
        }
    }

    get text(): string {
        return this._text as any;
    }

    /**
     * 按钮图标的CSS代码。如'E401'(注意省略了'\\'字符)。
     */
    set icon(value: string) {
        if (this._icon === value || !value.match(/^E[0-9]{0,4}$/)) return;
        this._icon = value;
        if (value) {
            // 设置data-icon属性，但首先将值转换为代码点
            (this.dom as any).setAttribute('data-icon', String.fromCodePoint(parseInt(value, 16)));
        } else {
            (this.dom as any).removeAttribute('data-icon');
        }
    }

    get icon(): string {
        return this._icon as any;
    }

    /**
     * 获取/设置按钮的'size'类型。可以是null或small。
     */
    set size(value: string) {
        if (this._size === value) return;
        if (this._size) {
            this.class.remove(PREFIX + '' + this._size);
            this._size = null;
        }

        this._size = value;

        if (this._size) {
            this.class.add(PREFIX + '' + this._size);
        }
    }

    get size(): string {
        return this._size  as any;
    }
}

Element.register('button', Button);

export default Button;
