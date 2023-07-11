import Element, { ElementArgs, IBindable, IBindableArgs, IFocusable } from '../Element';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

const CLASS_RADIO_BUTTON = PREFIX + 'radio-button';
const CLASS_RADIO_BUTTON_SELECTED = CLASS_RADIO_BUTTON + '-selected';

/**
 * {@link RadioButton}构造函数的参数
 */
export interface RadioButtonArgs extends ElementArgs, IBindableArgs {}

/**
 * A radio button element.
 */
class RadioButton extends Element implements IBindable, IFocusable {
    protected _value: boolean | undefined;

    protected _renderChanges: boolean | undefined;

    constructor(args: Readonly<RadioButtonArgs> = {}) {
        super({ tabIndex: 0, ...args });

        this.class.add(CLASS_RADIO_BUTTON);
        this.class.add(pcuiClass.NOT_FLEXIBLE);

        const that = this as any;

        that.dom.addEventListener('keydown', this._onKeyDown);
        that.dom.addEventListener('focus', this._onFocus);
        that.dom.addEventListener('blur', this._onBlur);

        that.value = args.value;
        that._renderChanges = args.renderChanges;
    }

    destroy() {
        if (this._destroyed) return;

        const that = this as any;
        that.dom.removeEventListener('keydown', this._onKeyDown);
        that.dom.removeEventListener('focus', this._onFocus);
        that.dom.removeEventListener('blur', this._onBlur);

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

    protected _onFocus = (evt: FocusEvent) => {
        this.emit('focus', evt);
    };

    protected _onBlur = (evt: FocusEvent) => {
        this.emit('blur', evt);
    };

    protected _updateValue(value: boolean) {
        this.class.remove(pcuiClass.MULTIPLE_VALUES);

        if (value === this.value) return false;

        this._value = value;

        if (value) {
            this.class.add(CLASS_RADIO_BUTTON_SELECTED);
        } else {
            this.class.remove(CLASS_RADIO_BUTTON_SELECTED);
        }

        if (this.renderChanges) {
            this.flash();
        }

        this.emit('change', value);

        return true;
    }

    focus() {
        this.dom && this.dom.focus();
    }

    blur() {
        this.dom &&this.dom.blur();
    }

    set value(value) {
        const changed = this._updateValue(value as any);
        if (changed && this._binding) {
            this._binding.setValue(value);
        }
    }

    get value() {
        return this._value;
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

    set renderChanges(renderChanges) {
        this._renderChanges = renderChanges;
    }

    get renderChanges() {
        return this._renderChanges as any;
    }
}

Element.register('radio', RadioButton, { renderChanges: true });

export default RadioButton;
