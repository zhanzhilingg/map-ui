import Element from '../Element';
import Container, { ContainerArgs } from '../Container';
import Label from '../Label';
import { PREFIX } from '../../class';

const CLASS_ROOT = PREFIX + 'code';
const CLASS_INNER = CLASS_ROOT + '-inner';

/**
 * {@link Code}构造函数的参数
 */
export interface CodeArgs extends ContainerArgs {
    /**
     * 设置要在代码块中显示的文本
     */
    text?: string
}

/**
 * 表示一个代码块
 */
class Code extends Container {
    protected _inner: Label;

    protected _text: string|undefined;

    constructor(args: Readonly<CodeArgs> = {}) {
        super(args);

        this.class.add(CLASS_ROOT);

        this._inner = new Label({
            class: CLASS_INNER
        });
        this.append(this._inner);

        if (args.text) {
            this.text = args.text;
        }
    }

    /**
     * 获取/设置要在代码块中显示的文本
     */
    set text(value) {
        this._text = value;
        (this._inner.text as any) = value;
    }

    get text() {
        return this._text;
    }
}

Element.register('code', Code);

export default Code;
