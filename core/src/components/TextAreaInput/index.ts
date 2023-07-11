import Element from '../Element';
import TextInput, { TextInputArgs } from '../TextInput';
import { PREFIX } from '../../class';

const CLASS_TEXT_AREA_INPUT = PREFIX + 'text-area-input';
const CLASS_TEXT_AREA_INPUT_RESIZABLE = CLASS_TEXT_AREA_INPUT + '-resizable';
const CLASS_TEXT_AREA_INPUT_RESIZABLE_NONE = CLASS_TEXT_AREA_INPUT_RESIZABLE + '-none';
const CLASS_TEXT_AREA_INPUT_RESIZABLE_BOTH = CLASS_TEXT_AREA_INPUT_RESIZABLE + '-both';
const CLASS_TEXT_AREA_INPUT_RESIZABLE_HORIZONTAL = CLASS_TEXT_AREA_INPUT_RESIZABLE + '-horizontal';
const CLASS_TEXT_AREA_INPUT_RESIZABLE_VERTICAL = CLASS_TEXT_AREA_INPUT_RESIZABLE + '-vertical';

/**
 * {@link TextAreaInput}构造函数的参数
 */
export interface TextAreaInputArgs extends TextInputArgs {
    /**
     * 设置可以调整文本区域大小的方向。“both”、“horizontal”、“vertical”或“none”之一。默认为“none”。
     */
    resizable?: 'horizontal' | 'vertical' | 'both' | 'none'
}

/**
 * TextAreaInput包装一个textarea元素。它与{@link TextInput}具有相同的接口。
 */
class TextAreaInput extends TextInput {
    constructor(args: Readonly<TextAreaInputArgs> = {}) {
        args = Object.assign({
            input: document.createElement('textarea')
        }, args);

        super(args);

        this.class.add(CLASS_TEXT_AREA_INPUT);
        switch (args.resizable) {
            case 'both':
                this.class.add(CLASS_TEXT_AREA_INPUT_RESIZABLE_BOTH);
                break;
            case 'horizontal':
                this.class.add(CLASS_TEXT_AREA_INPUT_RESIZABLE_HORIZONTAL);
                break;
            case 'vertical':
                this.class.add(CLASS_TEXT_AREA_INPUT_RESIZABLE_VERTICAL);
                break;
            case 'none':
            default:
                this.class.add(CLASS_TEXT_AREA_INPUT_RESIZABLE_NONE);
                break;
        }
    }

    protected _onInputKeyDown(evt: KeyboardEvent) {
        if ((evt.key === 'Escape' && this.blurOnEscape) || (evt.key === 'Enter' && this.blurOnEnter && !evt.shiftKey)) {
            this._domInput.blur();
        }

        this.emit('keydown', evt);
    }
}

Element.register('text', TextAreaInput, { renderChanges: true });

export default TextAreaInput;
