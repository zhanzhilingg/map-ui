import * as pcuiClass from '../../class';
import Element, { ElementArgs, IBindable, IBindableArgs, IFlexArgs, IPlaceholder, IPlaceholderArgs } from '../Element';

import { PREFIX } from '../../class';

const CLASS_LABEL = PREFIX + 'label';

/**
 * {@link Label}构造函数的参数。
 */
export interface LabelArgs extends ElementArgs, IBindableArgs, IPlaceholderArgs, IFlexArgs {
    /**
     * 设置标签的文本。
     */
    text?: string,
    /**
     * 如果' true '， {@link https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML innerHTML}属性将被用来设置文本。
     * 否则，将使用{@link https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent textContent}。
     * 默认为“false”。
     */
    unsafe?: boolean,
    /**
     * 如果' true '，则使用标签的文本作为本地HTML工具提示。默认为“false”。
     */
    nativeTooltip?: boolean,
    /**
     * 如果为“true”，则可以单击标签以选择文本。默认为“false”。
     */
    allowTextSelection?: boolean,
    /**
     * 用于此组件的DOM元素或其类型。默认为'span'。
     */
    dom?: HTMLElement | string,
    /**
     * 设置Label的值。默认为“”。
     */
    value?: string
}

/**
 * Label是一个简单的span元素，用于显示一些文本。
 */
class Label extends Element implements IPlaceholder, IBindable {
    protected _unsafe: boolean;

    protected _text: string | undefined;

    protected _renderChanges: boolean | undefined;

    constructor(args: Readonly<LabelArgs> = {}) {
        super({ dom: 'span', ...args });

        this.class.add(CLASS_LABEL);

        this._unsafe = args.unsafe ?? false;
        this.text = args.text ?? args.value ?? '';

        if (args.allowTextSelection) {
            this.class.add(pcuiClass.DEFAULT_MOUSEDOWN);
        }

        if (args.nativeTooltip) {
            (this.dom as any).title = this.text;
        }
        (this.placeholder as any) = args.placeholder;

        (this.renderChanges as any) = args.renderChanges;

        this.on('change', () => {
            if (this.renderChanges) {
                this.flash();
            }
        });
    }

    protected _updateText(value: string) {
        this.class.remove(pcuiClass.MULTIPLE_VALUES);

        if (this._text === value) return false;

        this._text = value;

        if (this._unsafe) {
            (this._dom as any).innerHTML = value;
        } else {
            (this._dom as any).textContent = value;
        }

        this.emit('change', value);

        return true;
    }

    /**
     * 获取/设置Label的文本。
     */
    set text(value: string) {
        if (value === undefined || value === null) {
            value = '';
        }

        const changed = this._updateText(value);

        if (changed && this._binding) {
            this._binding.setValue(value);
        }
    }

    get text(): string {
        return this._text as any;
    }

    set value(value: string) {
        this.text = value;
    }

    get value(): string {
        return this.text;
    }

    /* eslint accessor-pairs: 0 */
    set values(values: string[]) {
        const different = values.some(v => v !== values[0]);

        if (different) {
            this._updateText('');
            this.class.add(pcuiClass.MULTIPLE_VALUES);
        } else {
            this._updateText(values[0]);
        }
    }

    set placeholder(value: string) {
        if (value) {
            (this.dom as any).setAttribute('placeholder', value);
        } else {
            (this.dom as any).removeAttribute('placeholder');
        }
    }

    get placeholder(): string {
        return (this.dom as any).getAttribute('placeholder');
    }

    set renderChanges(value: boolean) {
        this._renderChanges = value;
    }

    get renderChanges(): boolean {
        return this._renderChanges as any;
    }
}

Element.register('label', Label);

export default Label;
