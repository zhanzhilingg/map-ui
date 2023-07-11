import Element, { ElementArgs, IBindable, IBindableArgs, IFocusable } from '../Element';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

const CLASS_BOOLEAN_INPUT = PREFIX + 'boolean-input';
const CLASS_BOOLEAN_INPUT_TICKED = CLASS_BOOLEAN_INPUT + '-ticked';
const CLASS_BOOLEAN_INPUT_TOGGLE = CLASS_BOOLEAN_INPUT + '-toggle';

/**
 * {@link BooleanInput}构造函数的参数。
 */
export interface BooleanInputArgs extends ElementArgs, IBindableArgs {
    /**
     * 设置{@link BooleanInput}的tabIndex。默认为0。
     */
    tabIndex?: number,
    /**
     * 复选框的类型。目前可以是' null '或'toggle'。
     */
    type?: string
}

/**
 * 复选框
 */
class BooleanInput extends Element implements IBindable, IFocusable {
    protected _value: boolean | null;

    protected _renderChanges: boolean = false;

    constructor(args: Readonly<BooleanInputArgs> = {}) {
        super({ tabIndex: 0, ...args });

        if (args.type === 'toggle') {
            this.class.add(CLASS_BOOLEAN_INPUT_TOGGLE);
        } else {
            this.class.add(CLASS_BOOLEAN_INPUT);
        }
        this.class.add(pcuiClass.NOT_FLEXIBLE);

        (this.dom as any).addEventListener('keydown', this._onKeyDown);
        (this.dom as any).addEventListener('focus', this._onFocus);
        (this.dom as any).addEventListener('blur', this._onBlur);

        this._value = null;
        if (args.value !== undefined) {
            this.value = args.value;
        }

        this.renderChanges = args.renderChanges ?? false;
    }

    destroy() {
        if (this._destroyed) return;

        (this.dom as any).removeEventListener('keydown', this._onKeyDown);
        (this.dom as any).removeEventListener('focus', this._onFocus);
        (this.dom as any).removeEventListener('blur', this._onBlur);

        super.destroy();
    }

    protected _onClick(evt: MouseEvent) {
        if (this.enabled) {
            this.focus();
        }

        if (this.enabled && !this.readOnly) {
            this.value = !this.value;
        }

        return super._onClick(evt);
    }

    protected _onKeyDown = (evt: KeyboardEvent) => {
        if (evt.key === 'Escape') {
            this.blur();
            return;
        }

        if (!this.enabled || this.readOnly) return;

        if (evt.key === ' ') {
            evt.stopPropagation();
            evt.preventDefault();
            this.value = !this.value;
        }
    };

    protected _onFocus = () => {
        this.emit('focus');
    };

    protected _onBlur = () => {
        this.emit('blur');
    };

    protected _updateValue(value: boolean) {
        this.class.remove(pcuiClass.MULTIPLE_VALUES);

        if (value === this.value) return false;

        this._value = value;

        if (value) {
            this.class.add(CLASS_BOOLEAN_INPUT_TICKED);
        } else {
            this.class.remove(CLASS_BOOLEAN_INPUT_TICKED);
        }

        if (this.renderChanges) {
            this.flash();
        }

        this.emit('change', value);

        return true;
    }

    focus() {
        (this.dom as any).focus();
    }

    blur() {
        (this.dom as any).blur();
    }

    set value(value: boolean) {
        const changed = this._updateValue(value);
        if (changed && this._binding) {
            this._binding.setValue(value);
        }
    }

    get value(): boolean {
        return !!this._value;
    }

    /* eslint accessor-pairs: 0 */
    set values(values: boolean[]) {
        const different = values.some(v => v !== values[0]);

        if (different) {
            this._updateValue(false);
            this.class.add(pcuiClass.MULTIPLE_VALUES);
        } else {
            this._updateValue(values[0]);
        }
    }

    set renderChanges(value: boolean) {
        this._renderChanges = value;
    }

    get renderChanges(): boolean {
        return this._renderChanges;
    }
}

Element.register('boolean', BooleanInput, { renderChanges: true });

export default BooleanInput;
