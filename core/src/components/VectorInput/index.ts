import { Observer } from '../../observer';
import Element, { ElementArgs, IBindable, IBindableArgs, IFocusable, IPlaceholder, IPlaceholderArgs } from '../Element';
import NumericInput from '../NumericInput';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

const CLASS_VECTOR_INPUT = PREFIX + 'vector-input';

/**
 * {@link VectorInput}构造函数的参数。
 */
export interface VectorInputArgs extends ElementArgs, IPlaceholderArgs, IBindableArgs {
    /**
     * 向量的维数。可以在2到4之间。默认为3。
     */
    dimensions?: number;
    /**
     * 每个向量元素的最小值。
     */
    min?: number;
    /**
     * 每个向量元素的最大值。
     */
    max?: number;
    /**
     * 对每个矢量元素使用箭头键或滑动块时的增量步骤。
     */
    step?: number;
    /**
     * 每个向量元素的十进制精度。默认为7。
     */
    precision?: number;
    /**
     *  按住Shift键并对每个矢量元素使用箭头键或滑动块时的增量步骤。
     */
    stepPrecision?: number;
}

/**
 * 一个矢量输入。向量可以有2到4个维度，每个维度是{@link NumericInput}。
 */
class VectorInput extends Element implements IBindable, IFocusable, IPlaceholder {
    protected _inputs: NumericInput[] = [];

    protected _applyingChange = false;

    constructor(args: Readonly<VectorInputArgs> = {}) {
        super(args)
        const elementArgs = { ...args };
        // 在创建输入后设置绑定
        delete elementArgs.binding;

        super(elementArgs);

        this.class.add(CLASS_VECTOR_INPUT);

        const dimensions = Math.max(2, Math.min(4, args.dimensions ?? 3));

        for (let i = 0; i < dimensions; i++) {
            const input = new NumericInput({
                min: args.min,
                max: args.max,
                precision: args.precision ?? 7,
                step: args.step ?? 1,
                stepPrecision: args.stepPrecision,
                renderChanges: args.renderChanges,
                placeholder: args.placeholder ? (Array.isArray(args.placeholder) ? args.placeholder[i] : args.placeholder) : null
            });
            input.on('change', () => {
                this._onInputChange();
            });
            input.on('focus', () => {
                this.emit('focus');
            });
            input.on('blur', () => {
                this.emit('blur');
            });
            // @ts-ignore
            this.dom.appendChild(input.dom);
            input.parent = this;

            this._inputs.push(input);
        }

        // 在创建输入之后设置绑定，因为我们在重写的setter中依赖它们
        if (args.binding) {
            this.binding = args.binding;
        }

        if (args.value !== undefined) {
            this.value = args.value;
        }
    }

    protected _onInputChange() {
        if (this._applyingChange) return;

        // 检查我们的输入是否有MULTIPLE_VALUES类，如果有，也继承它
        const multipleValues = this._inputs.some(input => input.class.contains(pcuiClass.MULTIPLE_VALUES));

        if (multipleValues) {
            this.class.add(pcuiClass.MULTIPLE_VALUES);
        } else {
            this.class.remove(pcuiClass.MULTIPLE_VALUES);
        }

        this.emit('change', this.value);
    }

    protected _updateValue(value: number[]) {
        this.class.remove(pcuiClass.MULTIPLE_VALUES);

        if (JSON.stringify(this.value) === JSON.stringify(value)) return false;

        this._applyingChange = true;

        this._inputs.forEach((input, i) => {
            // 在使用时禁用每个单独输入的绑定
            // 整个向量值的'value' setter。这是因为
            // 我们不希望每个输入都发出自己的绑定事件
            // 因为我们在这里设置了整个向量值
            const binding = input.binding;
            let applyingChange = false;
            if (binding) {
                applyingChange = binding.applyingChange;
                binding.applyingChange = true;
            }
            // @ts-ignore
            input.value = (value && value[i] !== undefined ? value[i] : null);
            if (binding) {
                binding.applyingChange = applyingChange;
            }
        });

        this.emit('change', this.value);

        this._applyingChange = false;

        return true;
    }

    link(observers: Observer|Observer[], paths: string|string[]) {
        super.link(observers, paths);
        observers = Array.isArray(observers) ? observers : [observers];
        paths = Array.isArray(paths) ? paths : [paths];

        const useSinglePath = paths.length === 1 || observers.length !== paths.length;
        if (useSinglePath) {
            for (let i = 0; i < this._inputs.length; i++) {
                // 将观察者链接到path。i 代表每个维度
                this._inputs[i].link(observers, paths[0] + `.${i}`);
            }
        } else {
            for (let i = 0; i < this._inputs.length; i++) {
                // 链接观察者到路径[i]。i 代表每个维度
                this._inputs[i].link(observers, paths.map(path => `${path}.${i}`));
            }

        }
    }

    unlink() {
        super.unlink();
        for (const input of this._inputs) {
            input.unlink();
        }
    }

    focus() {
        this._inputs[0].focus();
    }

    blur() {
        for (const input of this._inputs) {
            input.blur();
        }
    }

    set value(value) {
        if (typeof value === 'string') {
            try {
                // 尝试解析字符串
                value = JSON.parse(value);
                // 如果字符串可以转换为数组，但其中一些值不是数字
                // 然后也使用默认数组
                if (Array.isArray(value) && value.some(i => !Number.isFinite(i))) {
                    throw new Error('VectorInput value set to string which doesn\'t contain an array of numbers');
                }
            } catch (e) {
                console.error(e);
                value = [];
            }
        }
        if (!Array.isArray(value)) {
            value = [];
        }

        const changed = this._updateValue(value);

        if (changed && this._binding) {
            this._binding.setValue(value);
        }
    }

    get value() {
        return this._inputs.map(input => input.value);
    }

    /* eslint accessor-pairs: 0 */
    set values(values: Array<any>) {
        // 为每个维度创建一个数组(例如x一个数组y一个数组z一个数组)
        values = this._inputs.map((_, i) => values.map((arr) => {
            return arr ? arr[i] : undefined;
        }));

        this._inputs.forEach((input, i) => {
            input.values = values[i];
        });
    }

    // 覆盖绑定设置器，为每个输入设置绑定克隆
    set binding(value) {
        super.binding = value;
        for (const input of this._inputs) {
            // @ts-ignore
            input.binding = value ? value.clone() : null;
        }
    }

    // 必须重写getter，因为 已经重写了setter
    get binding() {
        return super.binding;
    }

    set placeholder(value: any) {
        for (let i = 0; i < this._inputs.length; i++) {
            this._inputs[i].placeholder = value[i] || value || null;
        }
    }

    get placeholder() {
        return this._inputs.map(input => input.placeholder);
    }

    /**
     * 获取该向量所拥有的数字输入数组。
     */
    get inputs() {
        return this._inputs.slice();
    }

    set renderChanges(value) {
        for (const input of this._inputs) {
            input.renderChanges = value;
        }
    }

    get renderChanges() {
        return this._inputs[0].renderChanges;
    }

    /**
     * 获取/设置该向量的所有输入可接受的最小值。
     */
    set min(value) {
        for (const input of this._inputs) {
            input.min = value;
        }
    }

    get min() {
        return this._inputs[0].min;
    }

    /**
     * 获取/设置该向量的所有输入可接受的最大值。
     */
    set max(value) {
        for (const input of this._inputs) {
            input.max = value;
        }
    }

    get max() {
        return this._inputs[0].max;
    }

    /**
     * 获取/设置向量的所有输入支持的最大小数位数。
     */
    set precision(value) {
        for (const input of this._inputs) {
            input.precision = value;
        }
    }

    get precision() {
        return this._inputs[0].precision;
    }

    /**
     * 获取/设置当对向量的所有输入使用箭头键和滑块输入时将增加或减少的值。
     */
    set step(value) {
        for (const input of this._inputs) {
            input.step = value;
        }
    }

    get step() {
        return this._inputs[0].step;
    }
}

Element.register('vec2', VectorInput, { dimensions: 2, renderChanges: true });
Element.register('vec3', VectorInput, { dimensions: 3, renderChanges: true });
Element.register('vec4', VectorInput, { dimensions: 4, renderChanges: true });

export default VectorInput;
