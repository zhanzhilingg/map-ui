import Element, { IBindableArgs, IPlaceholderArgs } from '../Element';
import InputElement, { InputElementArgs } from '../InputElement';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

const CLASS_TEXT_INPUT = PREFIX + 'text-input';

/**
 * {@link TextInput}构造函数的参数。
 */
export interface TextInputArgs extends InputElementArgs, IBindableArgs, IPlaceholderArgs {
    /**
     * 一种函数，用于验证输入的值，如果有效则返回“true”，否则返回“false”。如果“false”，则输入将被设置为错误状态，并且该值将不会传播到绑定。
     */
    onValidate?: (value: string) => boolean,
}

/**
 * TextInput是text类型的输入元素。
 */
class TextInput extends InputElement {
    protected _onValidate: ((value: string) => boolean) | undefined;

    constructor(args: Readonly<TextInputArgs> = {}) {
        super(args);

        this.class.add(CLASS_TEXT_INPUT);

        if (args.onValidate) {
            this.onValidate = args.onValidate;
        }
    }

    protected _onInputChange() {
        if (this._suspendInputChangeEvt) return;

        if (this._onValidate) {
            const error = !this._onValidate(this.value as any);
            this.error = error;
            if (error) {
                return;
            }
        } else {
            this.error = false;
        }

        this.emit('change', this.value);

        if (this._binding) {
            this._binding.setValue(this.value);
        }
    }

    protected _updateValue(value: string | Array<string> | null) {
        this.class.remove(pcuiClass.MULTIPLE_VALUES);

        if (value && typeof (value) === 'object') {
            if (Array.isArray(value)) {
                let isObject = false;
                for (let i = 0; i < value.length; i++) {
                    if (value[i] && typeof value[i] === 'object') {
                        isObject = true;
                        break;
                    }
                }

                value = isObject ? '[Not available]' : value.map((val) => {
                    return val === null ? 'null' : val;
                }).join(',');
            } else {
                value = '[Not available]';
            }
        }

        if (value === this.value) return false;

        this._suspendInputChangeEvt = true;
        this._domInput.value = (value === null || value === undefined) ? '' : String(value);
        this._suspendInputChangeEvt = false;

        this.emit('change', value);

        return true;
    }

    set value(value: string | Array<string>) {
        const changed = this._updateValue(value);

        if (changed) {
            // 重置错误
            this.error = false;
        }

        if (changed && this._binding) {
            this._binding.setValue(value);
        }
    }

    get value(): string | Array<string>{
        return this._domInput.value;
    }

    /* eslint accessor-pairs: 0 */
    set values(values: Array<string>) {
        const different = values.some(v => v !== values[0]);

        if (different) {
            this._updateValue(null);
            this.class.add(pcuiClass.MULTIPLE_VALUES);
        } else {
            this._updateValue(values[0]);
        }
    }

    /**
     * 获取/设置输入的验证方法。
     */
    set onValidate(value) {
        this._onValidate = value;
    }

    get onValidate() {
        return this._onValidate;
    }
}

Element.register('string', TextInput, { renderChanges: true });

export default TextInput;
