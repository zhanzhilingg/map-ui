import Element, { ElementArgs, IBindable, IBindableArgs, IFlexArgs, IFocusable, IPlaceholder, IPlaceholderArgs } from '../Element';
import NumericInput from '../NumericInput';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

const CLASS_SLIDER = PREFIX + 'slider';
const CLASS_SLIDER_CONTAINER = CLASS_SLIDER + '-container';
const CLASS_SLIDER_BAR = CLASS_SLIDER + '-bar';
const CLASS_SLIDER_HANDLE = CLASS_SLIDER + '-handle';
const CLASS_SLIDER_ACTIVE = CLASS_SLIDER + '-active';

const IS_CHROME = /Chrome\//.test(navigator.userAgent);

/**
 * {@link SliderInput} 构造函数的参数。
 */
export interface SliderInputArgs extends ElementArgs, IBindableArgs, IFlexArgs, IPlaceholderArgs {
    /**
     * 设置是否有任何keyup事件会引发更改事件
     */
    keyChange?: boolean,
    /**
     * 设置数字输入字段可以采用的最小值
     */
    min?: number,
    /**
     * 设置数字输入字段可以采用的最大值
     */
    max?: number,
    /**
     * 设置滑块字段可以采用的最小值。默认值为0。
     */
    sliderMin?: number,
    /**
     * 设置滑块字段可以采用的最大值。默认值为1。
     */
    sliderMax?: number,
    /**
     * 设置一个值可以采用的最大小数位数。默认值为2。
     */
    precision?: number,
    /**
     * 设置使用箭头键时值将增加或减少的量。按住Shift键将使用10倍的步长。
     */
    step?: number,
    /**
     * 设置该值是否可以为null。如果不是，那么它将是0而不是null。
     */
    allowNull?: boolean
}

/**
 * SliderInput显示一个NumericInput和旁边的滑块小部件。它充当NumericInput的代理。
 */
class SliderInput extends Element implements IBindable, IFocusable, IPlaceholder {
    protected _historyCombine = false;

    protected _historyPostfix: string|null= null;

    protected _numericInput: NumericInput;

    protected _sliderMin: number;

    protected _sliderMax: number;

    protected _domSlider: HTMLDivElement;

    protected _domBar: HTMLDivElement;

    protected _domHandle: HTMLDivElement;

    protected _cursorHandleOffset = 0;

    protected _touchId: number|null = null;

    /**
     * 创建新的SliderInput。
     *
     * @param args - 参数
     */
    constructor(args: Readonly<SliderInputArgs> = {}) {
        super(args);

        this.class.add(CLASS_SLIDER);

        const numericInput = new NumericInput({
            allowNull: args.allowNull,
            hideSlider: true,
            min: args.min,
            max: args.max,
            keyChange: args.keyChange,
            placeholder: args.placeholder,
            precision: args.precision ?? 2,
            renderChanges: args.renderChanges,
            step: args.step
        });

        // change event
        numericInput.on('change', (value: number) => {
            this._onValueChange(value);
        });

        // focus / blur events
        numericInput.on('focus', () => {
            this.emit('focus');
        });
        numericInput.on('blur', () => {
            this.emit('blur');
        });

        numericInput.parent = this;

        const that = this as any;

        that.dom.appendChild(numericInput.dom);

        this._numericInput = numericInput;

        this._sliderMin = args.sliderMin ?? args.min ?? 0;
        this._sliderMax = args.sliderMax ?? args.max ?? 1;

        this._domSlider = document.createElement('div');
        this._domSlider.classList.add(CLASS_SLIDER_CONTAINER);
        that.dom.appendChild(this._domSlider);

        this._domBar = document.createElement('div');
        this._domBar.classList.add(CLASS_SLIDER_BAR);
        this._domBar.ui = this;
        this._domSlider.appendChild(this._domBar);

        this._domHandle = document.createElement('div');
        this._domHandle.ui = this;
        this._domHandle.tabIndex = 0;
        this._domHandle.classList.add(CLASS_SLIDER_HANDLE);
        this._domBar.appendChild(this._domHandle);

        this._domSlider.addEventListener('mousedown', this._onMouseDown);
        this._domSlider.addEventListener('touchstart', this._onTouchStart, { passive: true });
        this._domHandle.addEventListener('keydown', this._onKeyDown);

        if (args.value !== undefined) {
            this.value = args.value;
        }
        if (args.values !== undefined) {
            this.values = args.values;
        }

        // 在构造函数中传递了0值的情况下更新句柄
        if (this.value === 0) {
            this._updateHandle(0);
        }
    }

    destroy() {
        if (this._destroyed) return;

        const that = this as any;

        this._domSlider.removeEventListener('mousedown', this._onMouseDown);
        this._domSlider.removeEventListener('touchstart', this._onTouchStart);

        this._domHandle.removeEventListener('keydown', this._onKeyDown);

        that.dom.removeEventListener('mouseup', this._onMouseUp);
        that.dom.removeEventListener('mousemove', this._onMouseMove);
        that.dom.removeEventListener('touchmove', this._onTouchMove);
        that.dom.removeEventListener('touchend', this._onTouchEnd);

        super.destroy();
    }

    protected _onMouseDown = (evt: MouseEvent) => {
        if (evt.button !== 0 || !this.enabled || this.readOnly) return;
        this._onSlideStart(evt.pageX);
    };

    protected _onMouseMove = (evt: MouseEvent) => {
        evt.stopPropagation();
        evt.preventDefault();
        this._onSlideMove(evt.pageX);
    };

    protected _onMouseUp = (evt: MouseEvent) => {
        evt.stopPropagation();
        evt.preventDefault();
        this._onSlideEnd(evt.pageX);
    };

    protected _onTouchStart = (evt: TouchEvent) => {
        if (!this.enabled || this.readOnly) return;

        for (let i = 0; i < evt.changedTouches.length; i++) {
            const touch = evt.changedTouches[i];
            const node = touch.target as Node;

            if (!node.ui || node.ui !== this)
                continue;

            this._touchId = touch.identifier;
            this._onSlideStart(touch.pageX);
            break;
        }
    };

    protected _onTouchMove = (evt: TouchEvent) => {
        for (let i = 0; i < evt.changedTouches.length; i++) {
            const touch = evt.changedTouches[i];

            if (touch.identifier !== this._touchId)
                continue;

            evt.stopPropagation();
            evt.preventDefault();

            this._onSlideMove(touch.pageX);
            break;
        }
    };

    protected _onTouchEnd = (evt: TouchEvent) => {
        for (let i = 0; i < evt.changedTouches.length; i++) {
            const touch = evt.changedTouches[i];

            if (touch.identifier !== this._touchId)
                continue;

            evt.stopPropagation();
            evt.preventDefault();

            this._onSlideEnd(touch.pageX);
            this._touchId = null;
            break;
        }
    };

    protected _onKeyDown = (evt: KeyboardEvent) => {
        if (evt.key === 'Escape') {
            this.blur();
            return;
        }
        const that = this as any;

        if (!this.enabled || this.readOnly) return;

        // move slider with left / right arrow keys
        if (evt.key !== 'ArrowLeft' && evt.key !== 'ArrowRight') return;

        evt.stopPropagation();
        evt.preventDefault();
        let x = evt.key === 'ArrowLeft' ? -1 : 1;
        if (evt.shiftKey) {
            x *= 10;
        }

        this.value += x * that.step;
    };

    protected _updateHandle(value: number) {
        const left = Math.max(0, Math.min(1, ((value || 0) - this._sliderMin) / (this._sliderMax - this._sliderMin))) * 100;
        const handleWidth = this._domHandle.getBoundingClientRect().width;
        this._domHandle.style.left = `calc(${left}% + ${handleWidth / 2}px)`;
    }

    protected _onValueChange(value: number) {
        this._updateHandle(value);
        if (!this._suppressChange) {
            this.emit('change', value);
        }

        if (this._binding) {
            this._binding.setValue(value);
        }
    }

    // 计算光标x和控制柄中间之间的距离（以像素为单位）。
    // 如果光标不在控制柄上，则将偏移设置为0
    protected _calculateCursorHandleOffset(pageX: number) {
        // 不知道为什么，但左侧需要几个像素的边距来正确确定光标是否在手柄上（在Chrome中）
        const margin = IS_CHROME ? 2 : 0;
        const rect = this._domHandle.getBoundingClientRect();
        const left = rect.left - margin;
        const right = rect.right;
        if (pageX >= left && pageX <= right) {
            this._cursorHandleOffset = pageX - (left + (right - left) / 2);
        } else {
            this._cursorHandleOffset = 0;
        }

        return this._cursorHandleOffset;
    }

    protected _onSlideStart(pageX: number) {
        this._domHandle.focus();
        if (this._touchId === null) {
            window.addEventListener('mousemove', this._onMouseMove);
            window.addEventListener('mouseup', this._onMouseUp);
        } else {
            window.addEventListener('touchmove', this._onTouchMove);
            window.addEventListener('touchend', this._onTouchEnd);
        }

        this.class.add(CLASS_SLIDER_ACTIVE);

        const that = this as any;
        // 计算光标句柄偏移量。如果存在偏移，则表示光标位于控制柄上，因此在光标移动之前不要移动控制柄。
        if (!this._calculateCursorHandleOffset(pageX)) {
            this._onSlideMove(pageX);
        }

        if (this.binding) {
            that._historyCombine = this.binding.historyCombine;
            that._historyPostfix = this.binding.historyPostfix;

            that.binding.historyCombine = true;
            that.binding.historyPostfix = `(${Date.now()})`;
        }
    }

    protected _onSlideMove(pageX: number) {
        const rect = this._domBar.getBoundingClientRect();
        // 将pageX减少初始光标句柄偏移量
        pageX -= this._cursorHandleOffset;
        const x = Math.max(0, Math.min(1, (pageX - rect.left) / rect.width));

        const range = this._sliderMax - this._sliderMin;
        let value = (x * range) + this._sliderMin;
        value = parseFloat(value.toFixed(this.precision));

        this.value = value;
    }

    protected _onSlideEnd(pageX: number) {
        //当滑动结束时，如果光标不再在控制柄上，则仅移动控制柄
        if (!this._calculateCursorHandleOffset(pageX)) {
            this._onSlideMove(pageX);
        }
        const that = this as any;

        this.class.remove(CLASS_SLIDER_ACTIVE);

        if (this._touchId === null) {
            window.removeEventListener('mousemove', this._onMouseMove);
            window.removeEventListener('mouseup', this._onMouseUp);
        } else {
            window.removeEventListener('touchmove', this._onTouchMove);
            window.removeEventListener('touchend', this._onTouchEnd);
        }

        if (this.binding) {
            that.binding.historyCombine = this._historyCombine;
            that.binding.historyPostfix = this._historyPostfix;

            that._historyCombine = false;
            that._historyPostfix = null;
        }

    }

    focus() {
        this._numericInput.focus();
    }

    blur() {
        this._domHandle.blur();
        this._numericInput.blur();
    }

    /**
     * 获取/设置滑块字段可以采用的最小值。
     */
    set sliderMin(value) {
        if (this._sliderMin === value) return;

        this._sliderMin = value;
        this._updateHandle(this.value);
    }

    get sliderMin() {
        return this._sliderMin;
    }

    /**
     * 获取/设置滑块字段可以采用的最大值。
     */
    set sliderMax(value) {
        if (this._sliderMax === value) return;

        this._sliderMax = value;
        this._updateHandle(this.value);
    }

    get sliderMax() {
        return this._sliderMax;
    }

    set value(value) {
        this._numericInput.value = value;
        if (this._numericInput.class.contains(pcuiClass.MULTIPLE_VALUES)) {
            this.class.add(pcuiClass.MULTIPLE_VALUES);
        } else {
            this.class.remove(pcuiClass.MULTIPLE_VALUES);
        }
    }

    get value() {
        return this._numericInput.value;
    }

    /* eslint accessor-pairs: 0 */
    set values(values: Array<number>) {
        this._numericInput.values = values;
        if (this._numericInput.class.contains(pcuiClass.MULTIPLE_VALUES)) {
            this.class.add(pcuiClass.MULTIPLE_VALUES);
        } else {
            this.class.remove(pcuiClass.MULTIPLE_VALUES);
        }
    }

    set renderChanges(value) {
        this._numericInput.renderChanges = value;
    }

    get renderChanges() {
        return this._numericInput.renderChanges;
    }

    /**
     * 获取/设置数字输入字段可以采用的最小值。
     */
    set min(value) {
        this._numericInput.min = value;
    }

    get min() {
        return this._numericInput.min;
    }

    /**
     * 获取/设置数字输入字段可以接受的最大值。
     */
    set max(value) {
        this._numericInput.max = value;
    }

    get max() {
        return this._numericInput.max;
    }

    /**
     * 获取/设置使用箭头键时该值将增加或减少的量。按住Shift键将使用10倍的步长。
     */
    set step(value) {
        this._numericInput.step = value;
    }

    get step() {
        return this._numericInput.step;
    }

    /**
     * 获取/设置一个值可以采用的最大小数位数。
     */
    set precision(value) {
        this._numericInput.precision = value;
    }

    get precision() {
        return this._numericInput.precision;
    }

    set keyChange(value) {
        this._numericInput.keyChange = value;
    }

    get keyChange() {
        return this._numericInput.keyChange;
    }

    set placeholder(value) {
        this._numericInput.placeholder = value;
    }

    get placeholder() {
        return this._numericInput.placeholder;
    }
}

Element.register('slider', SliderInput, { renderChanges: true });

export default SliderInput;
