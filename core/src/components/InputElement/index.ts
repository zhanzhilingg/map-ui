import Element, { ElementArgs, IBindable, IBindableArgs, IFocusable, IPlaceholder, IPlaceholderArgs } from '../Element';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

const CLASS_INPUT_ELEMENT = PREFIX + 'input-element';

/**
 * {@link InputElement}构造函数的参数。
 */
export interface InputElementArgs extends ElementArgs, IBindableArgs, IPlaceholderArgs {
    /**
     * 设置按下Enter是否会模糊(取消对焦)字段。默认为“true”。
     */
    blurOnEnter?: boolean,
    /**
     * 设置按下Escape是否会模糊(取消对焦)区域。默认为“true”。
     */
    blurOnEscape?: boolean,
    /**
     * 设置是否有任何上键事件将导致触发更改事件。
     */
    keyChange?: boolean,
    /**
     * 与{@link InputElement}相关联的输入元素。如果没有提供，将创建一个。
     */
    input?: HTMLInputElement
}

/**
 * InputElement是一个管理输入DOM元素的抽象类。它是{@link TextInput}和{@link NumericInput}的超类。它不打算直接使用。
 */
abstract class InputElement extends Element implements IBindable, IFocusable, IPlaceholder {
    protected _domInput: HTMLInputElement;

    protected _suspendInputChangeEvt: boolean;

    protected _prevValue: string|undefined|null;

    protected _keyChange: boolean | undefined;

    protected _renderChanges: boolean | undefined;

    protected _blurOnEnter: boolean | undefined;

    protected _blurOnEscape: boolean | undefined;

    protected _onInputKeyDownEvt: (evt: KeyboardEvent) => void;

    protected _onInputChangeEvt: (evt: Event) => void;

    constructor(args: InputElementArgs = {}) {
        super(args);

        this.class.add(CLASS_INPUT_ELEMENT);

        let input = args.input;
        if (!input) {
            input = document.createElement('input');
            input.type = 'text';
        }

        input.ui = this;
        input.tabIndex = 0;
        input.autocomplete = "off";

        this._onInputKeyDownEvt = this._onInputKeyDown.bind(this);
        this._onInputChangeEvt = this._onInputChange.bind(this);

        input.addEventListener('change', this._onInputChangeEvt);
        input.addEventListener('keydown', this._onInputKeyDownEvt);
        input.addEventListener('focus', this._onInputFocus);
        input.addEventListener('blur', this._onInputBlur);
        input.addEventListener('contextmenu', this._onInputCtxMenu, false);

        this.dom && this.dom.appendChild(input);

        this._domInput = input;

        this._suspendInputChangeEvt = false;

        if (args.value !== undefined) {
            this._domInput.value = args.value;
        }
        this.placeholder = args.placeholder ?? '';
        this.renderChanges = args.renderChanges ?? false;
        this.blurOnEnter = args.blurOnEnter ?? true;
        this.blurOnEscape = args.blurOnEscape ?? true;
        this.keyChange = args.keyChange ?? false;
        this._prevValue = null;

        this.on('change', () => {
            if (this.renderChanges) {
                this.flash();
            }
        });
        this.on('disable', this._updateInputReadOnly);
        this.on('enable', this._updateInputReadOnly);
        this.on('readOnly', this._updateInputReadOnly);

        this._updateInputReadOnly();
    }

    destroy() {
        if (this._destroyed) return;

        const input = this._domInput;

        input.removeEventListener('change', this._onInputChangeEvt);
        input.removeEventListener('keydown', this._onInputKeyDownEvt);
        input.removeEventListener('focus', this._onInputFocus);
        input.removeEventListener('blur', this._onInputBlur);
        input.removeEventListener('keyup', this._onInputKeyUp);
        input.removeEventListener('contextmenu', this._onInputCtxMenu);

        super.destroy();
    }

    protected _onInputFocus = (evt: FocusEvent) => {
        this.class.add(pcuiClass.FOCUS);
        this.emit('focus', evt);
        this._prevValue = this._domInput.value;
    };

    protected _onInputBlur = (evt: FocusEvent) => {
        this.class.remove(pcuiClass.FOCUS);
        this.emit('blur', evt);
    };

    protected _onInputKeyDown(evt: KeyboardEvent) {
        if (evt.key === 'Enter' && this.blurOnEnter) {
            // 如果keyChange为true(因为更改事件)，则在模糊时不触发输入更改事件(因为更改事件)将在当前值之前被触发
            this._suspendInputChangeEvt = !!this.keyChange;
            this._domInput.blur();
            this._suspendInputChangeEvt = false;
        } else if (evt.key === 'Escape') {
            this._suspendInputChangeEvt = true;
            const prev = this._domInput.value;
            (this._domInput.value as any) = this._prevValue;
            this._suspendInputChangeEvt = false;

            // 手动触发变更事件
            if (this.keyChange && prev !== this._prevValue) {
                this._onInputChange();
            }

            if (this.blurOnEscape) {
                this._domInput.blur();
            }
        }

        this.emit('keydown', evt);
    }

    protected _onInputChange() {}   //evt: Event

    protected _onInputKeyUp = (evt: KeyboardEvent) => {
        if (evt.key !== 'Escape') {
            this._onInputChange();
        }

        this.emit('keyup', evt);
    };

    protected _onInputCtxMenu = () => { // evt: MouseEvent
        this._domInput.select();
    };

    protected _updateInputReadOnly = () => {
        const readOnly = !this.enabled || this.readOnly;
        if (readOnly) {
            this._domInput.setAttribute('readonly', 'true');
        } else {
            this._domInput.removeAttribute('readonly');
        }
    };

    focus(select?: boolean) {
        this._domInput.focus();
        if (select) {
            this._domInput.select();
        }
    }

    blur() {
        this._domInput.blur();
    }

    set placeholder(value: string) {
        if (!this.dom) return
        if (value) {
            this.dom.setAttribute('placeholder', value);
        } else {
            this.dom.removeAttribute('placeholder');
        }
    }

    get placeholder(): string {
        if (!this.dom) return ''
        return this.dom.getAttribute('placeholder') ?? '';
    }


    /**
     * 获取/设置在输入DOM元素上调用keyup时要调用的方法。
     */
    set keyChange(value) {
        if (this._keyChange === value) return;

        this._keyChange = value;
        if (value) {
            this._domInput.addEventListener('keyup', this._onInputKeyUp);
        } else {
            this._domInput.removeEventListener('keyup', this._onInputKeyUp);
        }
    }

    get keyChange() {
        return this._keyChange;
    }

    /**
     * 获取输入DOM元素。
     */
    get input() {
        return this._domInput;
    }

    /**
     * 获取/设置按下回车键时输入是否应该模糊。
     */
    set blurOnEnter(value: boolean) {
        this._blurOnEnter = value;
    }

    get blurOnEnter(): boolean {
        return this._blurOnEnter as any;
    }

    /**
     * 获取/设置按下转义键时输入是否应该模糊。
     */
    set blurOnEscape(value: boolean) {
        this._blurOnEscape = value;
    }

    get blurOnEscape(): boolean {
        return this._blurOnEscape as any;
    }

    abstract set value(value: any);

    abstract get value(): any;

    abstract set values(value: Array<any>);

    abstract get values(): Array<any>;

    set renderChanges(value: boolean) {
        this._renderChanges = value;
    }

    get renderChanges(): boolean {
        return this._renderChanges as any;
    }
}

export default InputElement;
