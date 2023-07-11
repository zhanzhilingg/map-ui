import Element from '../Element';
import InputElement, { InputElementArgs } from '../InputElement';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

const CLASS_NUMERIC_INPUT = PREFIX + 'numeric-input';
const CLASS_NUMERIC_INPUT_SLIDER_CONTROL = CLASS_NUMERIC_INPUT + '-slider-control';
const CLASS_NUMERIC_INPUT_SLIDER_CONTROL_ACTIVE = CLASS_NUMERIC_INPUT_SLIDER_CONTROL + '-active';
const CLASS_NUMERIC_INPUT_SLIDER_CONTROL_HIDDEN = CLASS_NUMERIC_INPUT_SLIDER_CONTROL + '-hidden';

const REGEX_COMMA = /,/g;

/**
 * {@link NumericInput}构造函数的参数。
 */
export interface NumericInputArgs extends InputElementArgs {
    /**
     * 设置该字段可以接受的最小值。
     */
    min?: number,
    /**
     * 设置该字段可以接受的最大值。
     */
    max?: number,
    /**
     * 设置该字段的十进制精度。默认为2。
     */
    precision?: number,
    /**
     * 设置使用方向键和滑块输入时增加或减少值的数量。
     */
    step?: number,
    /**
     * 设置使用方向键和滑块输入按住shift键时增加或减少的值。默认为{@link NumericInput#step} * 0.1。
     */
    stepPrecision?: number,
    /**
     * 隐藏输入鼠标拖动滑块。
     */
    hideSlider?: boolean,
    /**
     * 设置值是否可以为' null '。如果不是，那么它将是0而不是' null '。
     */
    allowNull?: boolean
}

/**
 * NumericInput表示一个保存数字的输入元素。
 */
class NumericInput extends InputElement {
    protected _min: number | null;

    protected _max: number | null;

    protected _allowNull: boolean;

    protected _precision: number;

    protected _step: number | undefined;

    protected _stepPrecision: number | undefined;

    protected _oldValue: number | undefined;

    protected _historyCombine: boolean;

    protected _historyPostfix: string | null;

    protected _sliderPrevValue: number;

    protected _sliderControl: Element | undefined;

    protected _sliderMovement: number | undefined;

    protected _sliderUsed = false;

    constructor(args: Readonly<NumericInputArgs> = {}) {
        super(args)
        const textInputArgs = { ...args };
        // 删除value，因为希望将它设置在其他参数之后
        delete textInputArgs.value;
        delete textInputArgs.renderChanges;

        super(textInputArgs);

        this.class.add(CLASS_NUMERIC_INPUT);

        this._min = args.min ?? null;
        this._max = args.max ?? null;
        this._allowNull = args.allowNull ?? false;
        this._precision = args.precision ?? 7;

        const that = this as any;

        if (Number.isFinite(args.step)) {
            that._step = args.step;
        } else if (args.precision) {
            that._step = 10 / Math.pow(10, args.precision);
        } else {
            that._step = 1;
        }

        if (Number.isFinite(args.stepPrecision)) {
            this._stepPrecision = args.stepPrecision;
        } else {
            this._stepPrecision = that._step * 0.1;
        }

        this._oldValue = undefined;
        if (Number.isFinite(args.value)) {
            this.value = args.value;
        } else if (!this._allowNull) {
            this.value = 0;
        }

        this._historyCombine = false;
        this._historyPostfix = null;
        this._sliderPrevValue = 0;

        that.renderChanges = args.renderChanges;

        if (!args.hideSlider) {
            this._sliderControl = new Element();
            this._sliderControl.class.add(CLASS_NUMERIC_INPUT_SLIDER_CONTROL);
            that.dom.append(this._sliderControl.dom);

            that._sliderControl.dom.addEventListener('mousedown', this._onSliderMouseDown);
            that._sliderControl.dom.addEventListener('mouseup', this._onSliderMouseUp);

            document.addEventListener('pointerlockchange', this._onPointerLockChange, false);
        }
    }

    destroy() {
        if (this.destroyed) return;

        const that = this as any;
        if (that._sliderControl) {
            that._sliderControl.dom.removeEventListener('mousedown', this._onSliderMouseDown);
            that._sliderControl.dom.removeEventListener('mouseup', this._onSliderMouseUp);

            that._sliderControl.dom.removeEventListener("mousemove", this._onSliderMouseMove, false);
            that._sliderControl.dom.removeEventListener("wheel", this._onSliderMouseWheel);

            document.removeEventListener('pointerlockchange', this._onPointerLockChange, false);
        }

        super.destroy();
    }

    protected _updatePosition(movement: number, shiftKey: boolean) {
        const that = this as any;
        // 每100像素移动一步或步精度
        that._sliderMovement += movement / 100 * (shiftKey ? that._stepPrecision : that._step);
        that.value = that._sliderPrevValue + that._sliderMovement;
    }

    protected _onSliderMouseWheel = (evt: WheelEvent) => {
        this._updatePosition(evt.deltaY, evt.shiftKey);
    };

    protected _onSliderMouseMove = (evt: MouseEvent) => {
        this._updatePosition(evt.movementX, evt.shiftKey);
    };

    protected _onSliderMouseDown = () => {
        const that = this as any;
        that._sliderControl.dom.requestPointerLock();
        this._sliderMovement = 0.0;
        this._sliderPrevValue = this.value;
        this._sliderUsed = true;
        if (this.binding) {
            this._historyCombine = this.binding.historyCombine;
            that._historyPostfix = this.binding.historyPostfix;

            this.binding.historyCombine = true;
            this.binding.historyPostfix = `(${Date.now()})`;
        }
    };

    protected _onSliderMouseUp = () => {
        const that = this as any;
        document.exitPointerLock();
        if (!this._sliderUsed) return;
        this._sliderUsed = false;
        this.value = this._sliderPrevValue + that._sliderMovement;

        if (that.binding) {
            that.binding.historyCombine = this._historyCombine;
            that.binding.historyPostfix = this._historyPostfix;

            this._historyCombine = false;
            this._historyPostfix = null;
        }
        this.focus();
    };

    protected _onInputChange() {    //evt: Event
        // 获取输入的内容，将其规范化并将其设置为当前值
        this.value = this._normalizeValue(this._domInput.value);
    }

    protected _onInputKeyDown(evt: KeyboardEvent) {
        if (!this.enabled || this.readOnly) return;

        const that = this as any;
        // 用方向键增加/减少数值
        if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
            const inc = evt.key === 'ArrowDown' ? -1 : 1;
            this.value += (evt.shiftKey ? that._stepPrecision : that._step) * inc;
        }

        super._onInputKeyDown(evt);
    }

    protected _isScrolling() {
        if (!this._sliderControl) return false;
        return document.pointerLockElement === this._sliderControl.dom;
    }

    protected _onPointerLockChange = () => {
        const that = this as any;
        if (this._isScrolling()) {
            that._sliderControl.dom.addEventListener("mousemove", this._onSliderMouseMove, false);
            that._sliderControl.dom.addEventListener("wheel", this._onSliderMouseWheel, { passive: true });
            that._sliderControl.class.add(CLASS_NUMERIC_INPUT_SLIDER_CONTROL_ACTIVE);
        } else {
            that._sliderControl.dom.removeEventListener("mousemove", this._onSliderMouseMove, false);
            that._sliderControl.dom.removeEventListener("wheel", this._onSliderMouseWheel);
            that._sliderControl.class.remove(CLASS_NUMERIC_INPUT_SLIDER_CONTROL_ACTIVE);
        }
    };

    protected _normalizeValue(value: any) {
        try {
            if (typeof value === 'string') {
                // 检查是否为0
                if (value === '0') return 0;

                // 用点代替逗号(对于某些国际键盘)
                value = value.replace(REGEX_COMMA, '.');

                // remove spaces
                value = value.replace(/\s/g, '');

                // 对输入进行消毒，使其只允许求值简短的数学表达式
                value = value.match(/^[*/+\-0-9().]+$/);
                if (value !== null && value[0].length < 20) {
                    let expression = value[0];
                    const operators = ['+', '-', '/', '*'];
                    operators.forEach((operator) => {
                        const expressionArr = expression.split(operator);
                        expressionArr.forEach((_: any, i: number) => {
                            expressionArr[i] = expressionArr[i].replace(/^0+/, '');
                        });
                        expression = expressionArr.join(operator);
                    });
                    // eslint-disable-next-line
                    value = Function('"use strict";return (' + expression + ')')();
                }
            }
        } catch (error) {
            value = null;
        }

        if (value === null || isNaN(value)) {
            if (this._allowNull) {
                return null;
            }

            value = 0;
        }

        // 逼近 min max
        if (this.min !== null && value < this.min) {
            value = this.min;
        }
        if (this.max !== null && value > this.max) {
            value = this.max;
        }

        // 修复精度
        if (this.precision !== null) {
            value = parseFloat(Number(value).toFixed(this.precision));
        }

        return value;
    }

    protected _updateValue(value: number|null, force?: boolean) {
        const different = (value !== this._oldValue || force);

        // 总是将值设置为输入，因为我们总是希望它显示一个实际的数字或什么都不显示
        this._oldValue = value as any;
        if (value === null) {
            this._domInput.value = '';
        } else {
            this._domInput.value = String(value);
        }

        this.class.remove(pcuiClass.MULTIPLE_VALUES);

        if (different) {
            this.emit('change', value);
        }

        return different;
    }

    set value(value: number) {
        value = this._normalizeValue(value);
        const forceUpdate = this.class.contains(pcuiClass.MULTIPLE_VALUES) && value === null && this._allowNull;
        const changed = this._updateValue(value, forceUpdate);

        if (changed && this.binding) {
            this.binding.setValue(value);
        }
        if (this._sliderControl) {
            this._sliderControl.class.remove(CLASS_NUMERIC_INPUT_SLIDER_CONTROL_HIDDEN);
        }
    }

    get value() : number  {
        const val = this._domInput.value;
        const outValue = (val !== '' ? parseFloat(val) : null) as any;
        return outValue;
    }

    /* eslint accessor-pairs: 0 */
    set values(values: number[]) {
        const normalizedValues = values.map(v => this._normalizeValue(v));
        const different = normalizedValues.some(v => v !== normalizedValues[0]);

        if (different) {
            this._updateValue(null);
            this.class.add(pcuiClass.MULTIPLE_VALUES);
            if (this._sliderControl) {
                this._sliderControl.class.add(CLASS_NUMERIC_INPUT_SLIDER_CONTROL_HIDDEN);
            }
        } else {
            this._updateValue(normalizedValues[0]);
            if (this._sliderControl) {
                this._sliderControl.class.remove(CLASS_NUMERIC_INPUT_SLIDER_CONTROL_HIDDEN);
            }
        }
    }

    /**
     * 获取/设置该字段可以取的最小值
     */
    set min(value) {
        if (this._min === value) return;
        this._min = value;

        // reset value
        if (this._min !== null) {
            this.value = this.value; // eslint-disable-line no-self-assign
        }
    }

    get min() {
        return this._min;
    }

    /**
     * 获取/设置该字段可以接受的最大值
     */
    set max(value) {
        if (this._max === value) return;
        this._max = value;

        // reset value
        if (this._max !== null) {
            this.value = this.value; // eslint-disable-line no-self-assign
        }
    }

    get max() {
        return this._max;
    }

    /**
     * 获取/设置输入的精度
     */
    set precision(value) {
        if (this._precision === value) return;
        this._precision = value;

        // reset value
        if (this._precision !== null) {
            this.value = this.value; // eslint-disable-line no-self-assign
        }
    }

    get precision() {
        return this._precision;
    }

    /**
     * 获取/设置使用箭头键和滑块输入时将增加或减少的值。
     */
    set step(value) {
        this._step = value;
    }

    get step() {
        return this._step;
    }
}

Element.register('number', NumericInput, { renderChanges: true });

export default NumericInput;
