import Element from '../Element';
import Container, { ContainerArgs } from '../Container';
import { PREFIX } from '../../class';

const CLASS_INFOBOX = PREFIX + 'infobox';

/**
 * {@link InfoBox}构造函数的参数。
 */
export interface InfoBoxArgs extends ContainerArgs {
    /**
     * {@link InfoBox}图标的CSS代码。如。'E401'(注意我们省略了'\\'字符)。默认为“”。
     * 内置图标值有:
     *
     * - 'E218' - warning
     * - 'E400' - info
     */
    icon?: string;
    /**
     * 设置{@link InfoBox}的标题。默认为“”。
     */
    title?: string;
    /**
     * 设置{@link InfoBox}的“文本”。默认为“”。
     */
    text?: string;
    /**
     * 如果' true '， {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML innerHTML}属性将被用来设置文本。
     * 否则，将使用{@link https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent textContent}。默认为“false”。
     */
    unsafe?: boolean;
}

/**
 * 信息框
 */
class InfoBox extends Container {
    protected _titleElement = new Element();

    protected _textElement = new Element();

    protected _unsafe: boolean;

    protected _icon: string | undefined;

    protected _title: string | undefined;

    protected _text: string | undefined;

    constructor(args: Readonly<InfoBoxArgs> = {}) {
        super(args);

        this.class.add(CLASS_INFOBOX);

        this.append(this._titleElement);
        this.append(this._textElement);

        this._unsafe = args.unsafe ?? false;
        this.icon = args.icon ?? '';
        this.title = args.title ?? '';
        this.text = args.text ?? '';
    }

    /**
     * 设置信息框的图标。
     */
    set icon(value) {
        if (this._icon === value) return;
        this._icon = value;
        if (value) {
            // set data-icon attribute but first convert the value to a code point
            this.dom && this.dom.setAttribute('data-icon', String.fromCodePoint(parseInt(value, 16)));
        } else {
            this.dom && this.dom.removeAttribute('data-icon');
        }
    }

    get icon() {
        return this._icon;
    }

    /**
     * 设置信息框的标题。
     */
    set title(value) {
        if (this._title === value) return;
        this._title = value;
        const dom = this._titleElement.dom as any
        if (this._unsafe) {
            dom.innerHTML = value;
        } else {
            dom.textContent  = value;
        }
    }

    get title() {
        return this._title;
    }

    /**
     * 设置信息框的文本。
     */
    set text(value) {
        if (this._text === value) return;
        this._text = value;
        const dom = this._titleElement.dom as any
        if (this._unsafe) {
            dom.innerHTML = value;
        } else {
            dom.textContent = value;
        }
    }

    get text() {
        return this._text;
    }
}

Element.register('infobox', InfoBox);

export default InfoBox;
