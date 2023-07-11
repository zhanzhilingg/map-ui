import { Observer } from '../../observer';
import * as utils from '../../helpers/utils';
import Element, { ElementArgs, IBindable, IBindableArgs, IFocusable } from '../Element';
import Container from '../Container';
import Panel from '../Panel';
import NumericInput from '../NumericInput';
import Button from '../Button';
import { PREFIX } from '../../class';

const CLASS_ARRAY_INPUT = PREFIX + 'array-input';
const CLASS_ARRAY_EMPTY = PREFIX + 'array-empty';
const CLASS_ARRAY_SIZE = CLASS_ARRAY_INPUT + '-size';
const CLASS_ARRAY_CONTAINER = CLASS_ARRAY_INPUT + '-items';
const CLASS_ARRAY_ELEMENT = CLASS_ARRAY_INPUT + '-item';
const CLASS_ARRAY_DELETE = CLASS_ARRAY_ELEMENT + '-delete';

/**
 * {@link ArrayInput}构造函数的参数
 */
export interface ArrayInputArgs extends ElementArgs, IBindableArgs {
    /**
     * 数组可以保存的值的类型，可以是下列情况之一:
     *
     * - `boolean`
     * - `number`
     * - `string`
     * - `vec2`
     * - `vec3`
     * - `vec4`
     *
     * 默认为' string '
     */
    type?: 'boolean' | 'number' | 'string' | 'vec2' | 'vec3' | 'vec4';
    /**
     * 每个数组元素的参数
     */
    elementArgs?: Array<any>;
    /**
     * 如果' true '，则不允许编辑数组的元素数量
     */
    fixedSize?: boolean;
    /**
     * 如果为true，则数组将使用面板渲染。默认为“false”。
     */
    usePanels?: boolean;
    /**
     * 用于指定数组中每个元素的默认值。默认为' null '
     */
    getDefaultFn?: () => any;
}

/**
 * 元素，该元素允许编辑值数组
 */
class ArrayInput extends Element implements IFocusable, IBindable {
    /**
     * 当数组元素被链接到观察者时触发
     *
     * @event
     * @example
     * ```ts
     * arrayInput.on('linkElement', (element: Element, index: number, path: string) => {
     *     console.log(`Element ${index} is now linked to ${path}`);
     * });
     * ```
     */
    public static readonly EVENT_LINK_ELEMENT: 'linkElement';

    /**
     * 当数组元素与观察器断开链接时触发
     *
     * @event
     * @example
     * ```ts
     * arrayInput.on('unlinkElement', (element: Element, index: number) => {
     *     console.log(`Element ${index} is now unlinked`);
     * });
     * ```
     */
    public static readonly EVENT_UNLINK_ELEMENT: 'unlinkElement';

    static DEFAULTS = {
        boolean: false,
        number: 0,
        string: '',
        vec2: [0, 0],
        vec3: [0, 0, 0],
        vec4: [0, 0, 0, 0]
    };

    protected _container: Container;

    protected _usePanels: boolean;

    protected _fixedSize: boolean;

    protected _inputSize: NumericInput;

    protected _suspendSizeChangeEvt = false;

    protected _containerArray: Container;

    protected _arrayElements: any;

    protected _suspendArrayElementEvts = false;

    protected _arrayElementChangeTimeout: number|null = null;

    protected _getDefaultFn: any;

    protected _valueType: string;

    protected _elementType: string;

    protected _elementArgs: any;

    protected _values: any[];

    protected _renderChanges: boolean = false;

    constructor(args: Readonly<ArrayInputArgs> = {}) {
        super();
        const container = new Container({
            dom: args.dom,
            flex: true
        });

        const elementArgs = { ...args, dom: container.dom };
        // 删除绑定，因为我们希望稍后设置它
        delete elementArgs.binding;

        super(elementArgs as any);

        this._container = container;
        this._container.parent = this;

        this.class.add(CLASS_ARRAY_INPUT, CLASS_ARRAY_EMPTY);

        this._usePanels = args.usePanels ?? false;

        this._fixedSize = !!args.fixedSize;

        this._inputSize = new NumericInput({
            class: [CLASS_ARRAY_SIZE],
            placeholder: 'Array Size',
            value: 0,
            hideSlider: true,
            step: 1,
            precision: 0,
            min: 0,
            readOnly: this._fixedSize
        });
        this._inputSize.on('change', (value: number) => {
            this._onSizeChange(value);
        });
        this._inputSize.on('focus', () => {
            this.emit('focus');
        });
        this._inputSize.on('blur', () => {
            this.emit('blur');
        });
        this._container.append(this._inputSize);

        this._containerArray = new Container({
            class: CLASS_ARRAY_CONTAINER,
            hidden: true
        });
        this._containerArray.on('append', () => {
            this._containerArray.hidden = false;
        });
        this._containerArray.on('remove', () => {
            this._containerArray.hidden = this._arrayElements.length === 0;
        });
        this._container.append(this._containerArray);

        this._getDefaultFn = args.getDefaultFn ?? null;

        // @ts-ignore
        let valueType = args.elementArgs && args.elementArgs.type || args.type;
        if (!ArrayInput.DEFAULTS.hasOwnProperty(valueType)) {
            valueType = 'string';
        }

        this._valueType = valueType;
        this._elementType = args.type ?? 'string';
        if (args.elementArgs) {
            this._elementArgs = args.elementArgs;
        } else {
            delete (elementArgs as any).dom;
            this._elementArgs = elementArgs;
        }

        this._arrayElements = [];

        // 现在设置绑定
        (this as any).binding = args.binding;

        this._values = [];

        if (args.value) {
            this.value = args.value;
        }

        this.renderChanges = args.renderChanges || false;
    }

    destroy() {
        if (this._destroyed) return;

        this._arrayElements.length = 0;

        super.destroy();
    }

    protected _onSizeChange(size: number) {
        // 如果size显式为0，那么添加空类size也可以为null，因此不要只检查size
        if (size === 0) {
            this.class.add(CLASS_ARRAY_EMPTY);
        } else {
            this.class.remove(CLASS_ARRAY_EMPTY);
        }

        if (size === null) return;
        if (this._suspendSizeChangeEvt) return;

        // 初始化每个新数组元素的默认值
        let defaultValue: any;
        const initDefaultValue = () => {
            if (this._getDefaultFn) {
                defaultValue = this._getDefaultFn();
            } else {
                defaultValue = ArrayInput.DEFAULTS[this._valueType as keyof typeof ArrayInput.DEFAULTS];
                if (this._valueType === 'curveset') {
                    defaultValue = utils.deepCopy(defaultValue);
                    if (Array.isArray(this._elementArgs.curves)) {
                        for (let i = 0; i < this._elementArgs.curves.length; i++) {
                            defaultValue.keys.push([0, 0]);
                        }
                    }
                } else if (this._valueType === 'gradient') {
                    defaultValue = utils.deepCopy(defaultValue);
                    if (this._elementArgs.channels) {
                        for (let i = 0; i < this._elementArgs.channels; i++) {
                            defaultValue.keys.push([0, 1]);
                        }
                    }
                }
            }
        };

        // 调整大小的数组
        const values = this._values.map((array) => {
            if (!array) {
                array = new Array(size);
                for (let i = 0; i < size; i++) {
                    array[i] = utils.deepCopy(ArrayInput.DEFAULTS[this._valueType as keyof typeof ArrayInput.DEFAULTS]);
                    if (defaultValue === undefined) initDefaultValue();
                    array[i] = utils.deepCopy(defaultValue);
                }
            } else if (array.length < size) {
                const newArray = new Array(size - array.length);
                for (let i = 0; i < newArray.length; i++) {
                    newArray[i] = utils.deepCopy(ArrayInput.DEFAULTS[this._valueType as keyof typeof ArrayInput.DEFAULTS]);
                    if (defaultValue === undefined) initDefaultValue();
                    newArray[i] = utils.deepCopy(defaultValue);
                }
                array = array.concat(newArray);
            } else {
                const newArray = new Array(size);
                for (let i = 0; i < size; i++) {
                    newArray[i] = utils.deepCopy(array[i]);
                }
                array = newArray;
            }

            return array;
        });

        if (!values.length) {
            const array = new Array(size);
            for (let i = 0; i < size; i++) {
                array[i] = utils.deepCopy(ArrayInput.DEFAULTS[this._valueType as keyof typeof ArrayInput.DEFAULTS]);
                if (defaultValue === undefined) initDefaultValue();
                array[i] = utils.deepCopy(defaultValue);
            }
            values.push(array);
        }

        this._updateValues(values, true);
    }

    protected _createArrayElement() {
        const args = Object.assign({}, this._elementArgs);
        if (args.binding) {
            args.binding = args.binding.clone();
        } else if (this._binding) {
            args.binding = this._binding.clone();
        }

        // 设置renderChanges后值设置，以防止闪烁的初始值设置
        args.renderChanges = false;

        let container;
        if (this._usePanels) {
            container = new Panel({
                headerText: `[${this._arrayElements.length}]`,
                removable: !this._fixedSize,
                collapsible: true,
                class: [CLASS_ARRAY_ELEMENT, CLASS_ARRAY_ELEMENT + '-' + this._elementType]
            });
        } else {
            container = new Container({
                flex: true,
                flexDirection: 'row',
                alignItems: 'center',
                class: [CLASS_ARRAY_ELEMENT, CLASS_ARRAY_ELEMENT + '-' + this._elementType]
            });
        }

        if (this._elementType === 'json' && args.attributes) {
            args.attributes = args.attributes.map((attr: any) => {
                if (!attr.path) return attr;

                // 修复包含数组元素索引的路径
                attr = Object.assign({}, attr);
                const parts = attr.path.split('.');
                parts.splice(parts.length - 1, 0, this._arrayElements.length);
                attr.path = parts.join('.');

                return attr;
            });
        }

        const element = Element.create(this._elementType, args);
        container.append(element);

        element.renderChanges = this.renderChanges;

        const entry = {
            container: container,
            element: element
        };

        this._arrayElements.push(entry);

        if (!this._usePanels) {
            if (!this._fixedSize) {
                const btnDelete = new Button({
                    icon: 'E289',
                    size: 'small',
                    class: CLASS_ARRAY_DELETE,
                    tabIndex: -1 // 跳过TAB上的按钮
                });
                btnDelete.on('click', () => {
                    this._removeArrayElement(entry);
                });

                container.append(btnDelete);
            }
        } else {
            container.on('click:remove', () => {
                this._removeArrayElement(entry);
            });
        }

        element.on('change', (value: any) => {
            this._onArrayElementChange(entry, value);
        });

        this._containerArray.append(container);

        return entry;
    }

    protected _removeArrayElement(entry: any) {
        const index = this._arrayElements.indexOf(entry);
        if (index === -1) return;

        // 从值中的每个数组中删除行
        const values = this._values.map((array) => {
            if (!array) return null;
            array.splice(index, 1);
            return array;
        });

        this._updateValues(values, true);
    }

    protected _onArrayElementChange(entry: any, value: any) {
        if (this._suspendArrayElementEvts) return;

        const index = this._arrayElements.indexOf(entry);
        if (index === -1) return;

        // 将值设置为值中每个数组的同一行
        this._values.forEach((array) => {
            if (array && array.length > index) {
                array[index] = value;
            }
        });
        // 在这里使用超时，
        // 因为当我们的值发生变化时，
        // 它们将首先在每个数组元素上触发变化事件。
        // 然而，由于整个数组发生了变化，我们稍后将从'_updateValues'函数中触发'change'事件。
        // 我们只想在只有数组元素改变值而不是整个数组改变值的情况下触发一个'change'事件，
        // 所以等一会儿再触发改变事件，
        // 否则_updateValues函数会取消这个超时并为整个数组触发一个改变事件
        this._arrayElementChangeTimeout = window.setTimeout(() => {
            this._arrayElementChangeTimeout = null;
            this.emit('change', this.value);
        });
    }

    protected _linkArrayElement(element: any, index: number) {
        const observers = (this._binding as any).observers;
        const paths = (this._binding as any).paths;
        const useSinglePath = paths.length === 1 || observers.length !== paths.length;
        element.unlink();
        element.value = null;

        this.emit('unlinkElement', element, index);

        const path = (useSinglePath ? paths[0] + `.${index}` : paths.map((path: string) => `${path}.${index}`));
        element.link(observers, path);

        this.emit('linkElement', element, index, path);
    }

    protected _updateValues(values: any, applyToBinding: boolean) {
        this._values = values || [];

        this._suspendArrayElementEvts = true;
        this._suspendSizeChangeEvt = true;

        // 将值应用于绑定
        if (applyToBinding && this._binding) {
            this._binding.setValues(values);
        }
        // 数组的每一行保存该行的所有值
        const valuesPerRow: any[] = [];
        // 保存每个数组的长度
        const arrayLengths: any[] = [];

        values.forEach((array: any) => {
            if (!array) return;

            arrayLengths.push(array.length);

            array.forEach((item: any, i: number) => {
                if (!valuesPerRow[i]) {
                    valuesPerRow[i] = [];
                }

                valuesPerRow[i].push(item);
            });
        });

        let lastElementIndex = -1;
        for (let i = 0; i < valuesPerRow.length; i++) {
            // 如果该行上的值数与数组数不匹配，则停止添加行
            if (valuesPerRow[i].length !== values.length) {
                break;
            }

            // 如果行不存在，则创建行
            if (!this._arrayElements[i]) {
                this._createArrayElement();
            }

            // 绑定到该行的观察者，或者只显示值
            if (this._binding && this._binding.observers) {
                this._linkArrayElement(this._arrayElements[i].element, i);
            } else {
                if (valuesPerRow[i].length > 1) {
                    this._arrayElements[i].element.values = valuesPerRow[i];
                } else {
                    this._arrayElements[i].element.value = valuesPerRow[i][0];
                }
            }

            lastElementIndex = i;
        }

        // 销毁那些不再符合我们价值观的元素
        for (let i = this._arrayElements.length - 1; i > lastElementIndex; i--) {
            this._arrayElements[i].container.destroy();
            this._arrayElements.splice(i, 1);
        }


        this._inputSize.values = arrayLengths;

        this._suspendSizeChangeEvt = false;
        this._suspendArrayElementEvts = false;

        if (this._arrayElementChangeTimeout) {
            window.clearTimeout(this._arrayElementChangeTimeout);
            this._arrayElementChangeTimeout = null;
        }

        this.emit('change', this.value);
    }

    focus() {
        this._inputSize.focus();
    }

    blur() {
        this._inputSize.blur();
    }

    unlink() {
        super.unlink();
        this._arrayElements.forEach((entry: { element: Element; }) => {
            entry.element.unlink();
        });
    }

    link(observers: Observer|Observer[], paths: string|string[]) {
        super.link(observers, paths);
        this._arrayElements.forEach((entry: { element: Element; }, index: number) => {
            this._linkArrayElement(entry.element, index);
        });
    }

    /**
     * 对每个数组元素执行指定的函数
     *
     * @param fn - 执行带有signature (element, index) => bool的函数。如果函数返回' false '，则迭代将提前结束。
     */
    forEachArrayElement(fn: (element: Element, index: number) => false | void) {
        this._containerArray.forEachChild((element, i) => {
            return fn((element.dom as any).firstChild.ui, i);
        });
    }

    // 重写绑定设置器，为每个数组元素创建相同类型的绑定
    set binding(value) {
        super.binding = value;

        this._arrayElements.forEach((entry: { element: Element; }) => {
            (entry.element.binding as any) = value ? value.clone() : null;
        });
    }

    get binding() {
        return super.binding;
    }

    set value(value) {
        if (!Array.isArray(value)) {
            value = [];
        }

        const current = this.value || [];
        if (utils.arrayEquals(current, value)) return;

        // 更新值和绑定
        this._updateValues(new Array(this._values.length || 1).fill(value), true);
    }

    get value() {
        // 从数组元素的值构造值
        return this._arrayElements.map((entry: { element: { value: any; }; }) => entry.element.value);
    }

    /* eslint accessor-pairs: 0 */
    set values(values: any) {
        if (utils.arrayEquals(this._values, values)) return;
        // 更新值，但不更新绑定
        this._updateValues(values, false);
    }

    set renderChanges(value) {
        this._renderChanges = value;
        this._arrayElements.forEach((entry: { element: { renderChanges: any; }; }) => {
            entry.element.renderChanges = value;
        });
    }

    get renderChanges() {
        return this._renderChanges;
    }
}

for (const type in ArrayInput.DEFAULTS) {
    Element.register(`array:${type}`, ArrayInput, { type: type, renderChanges: true });
}
Element.register('array:select', ArrayInput, { type: 'select', renderChanges: true });

export default ArrayInput;
