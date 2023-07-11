import Element, { ElementArgs, IBindable, IBindableArgs, IFocusable, IPlaceholderArgs } from '../Element';
import Container from '../Container';
import TextInput from '../TextInput';
import Button from '../Button';
import Label from '../Label';
import * as pcuiClass from '../../class';
import { searchItems } from '../../helpers/search';
import { PREFIX } from '../../class';

const CLASS_SELECT_INPUT = PREFIX + 'select-input';
const CLASS_SELECT_INPUT_CONTAINER_VALUE = CLASS_SELECT_INPUT + '-container-value';
const CLASS_MULTI_SELECT = CLASS_SELECT_INPUT + '-multi';
const CLASS_DISABLED_VALUE = CLASS_SELECT_INPUT + '-disabled-value';
const CLASS_HAS_DISABLED_VALUE = CLASS_SELECT_INPUT + '-has-disabled-value';
const CLASS_ALLOW_INPUT = PREFIX + 'select-input-allow-input';
const CLASS_VALUE = CLASS_SELECT_INPUT + '-value';
const CLASS_ICON = CLASS_SELECT_INPUT + '-icon';
const CLASS_INPUT = CLASS_SELECT_INPUT + '-textinput';
const CLASS_LIST = CLASS_SELECT_INPUT + '-list';
const CLASS_TAGS = CLASS_SELECT_INPUT + '-tags';
const CLASS_TAGS_EMPTY = CLASS_SELECT_INPUT + '-tags-empty';
const CLASS_TAG = CLASS_SELECT_INPUT + '-tag';
const CLASS_TAG_NOT_EVERYWHERE = CLASS_SELECT_INPUT + '-tag-not-everywhere';
const CLASS_SHADOW = CLASS_SELECT_INPUT + '-shadow';
const CLASS_FIT_HEIGHT = CLASS_SELECT_INPUT + '-fit-height';
const CLASS_SELECTED = PREFIX + 'selected';
const CLASS_HIGHLIGHTED = CLASS_SELECT_INPUT + '-label-highlighted';
const CLASS_CREATE_NEW = CLASS_SELECT_INPUT + '-create-new';
const CLASS_OPEN = PREFIX + 'open';

const DEFAULT_BOTTOM_OFFSET = 25;

/**
 * {@link SelectInput}构造函数的参数
 */
export interface SelectInputArgs extends ElementArgs, IBindableArgs, IPlaceholderArgs {
    /**
     * 用于映射选项
     */
    optionsFn?: any;
    /**
     * 输入的默认值
     */
    defaultValue?: any;
    /**
     * 如果' true '，则输入值变成一个数组，允许选择多个选项。默认为' false '.
     */
    multiSelect?: boolean;
    /**
     * 输入的下拉选项。包含一个对象数组，格式为\{v: Any, t: String\}，其中v是值，t是选项的文本.
     */
    options?: { t: string, v: boolean | number | string }[];
    /**
     * 一个值数组，在创建新值之前对其进行检查。如果值在数组中，则不会创建该值。
     */
    invalidOptions?: Array<any>;
    /**
     * 如果' true '，则null是一个有效的输入值。默认为“false”。
     */
    allowNull?: boolean;
    /**
     * 如果为“true”，则显示一个文本字段供用户搜索值或输入新值。默认为“false”。
     */
    allowInput?: boolean;
    /**
     * 如果' true '，则输入允许从文本字段创建新值。只在allowInput为true时使用。默认为“false”。
     */
    allowCreate?: boolean;
    /**
     * 当用户选择创建新值时执行的函数。该函数接受新值作为参数。
     */
    createFn?: (value: string) => void;
    /**
     * 创建新值时要显示的占位符文本。当allowInput和allowCreate都为true时使用。
     */
    createLabelText?: string;
    /**
     * 每个值的类型。可以是'string'， 'number'或'boolean'之一。默认为'string'。
     */
    type?: 'string' | 'number' | 'boolean';
    /**
     * 为查找未包含在disabledOptions对象中的有效回退选项，应检入选项的顺序。
     */
    fallbackOrder?: Array<string>;
    /**
     * 应该禁用的所有选项值。对象的键是选项的值，这些值是在禁用选项时显示的文本。
     */
    disabledOptions?: Record<string, string>;
    /**
     * 如果提供了该函数，则每次选择一个选项时都会调用该函数。
     */
    onSelect?: (value: string) => void;
    /**
     * 要在选中选项之前的SelectInput中显示的文本。
     */
    prefix?: string;
}


/**
 * 允许从下拉菜单中选择或输入标签的输入。
 */
class SelectInput extends Element implements IBindable, IFocusable {
    protected _container: Container;

    protected _containerValue: Container;

    protected _domShadow: HTMLDivElement;

    protected _allowInput: boolean | undefined;

    protected _allowCreate: boolean | undefined;

    protected _createFn?: (value: string) => void;

    protected _createLabelText?: string;

    protected _labelValue: Label;

    protected _timeoutLabelValueTabIndex: number|null = null;

    protected _labelIcon: Label;

    protected _input: TextInput;

    protected _lastInputValue: string;

    protected _suspendInputChange: boolean;

    protected _containerOptions: Container;

    protected _containerTags: Container;

    protected _type: string;

    protected _valueToText: { [key: string]: string } = {};

    protected _valueToLabel: { [key: string]: Label } = {};

    protected _labelToValue: Map<Label, any> = new Map();

    protected _labelHighlighted: Label|null = null;

    protected _optionsFn: any;

    protected _allowNull: boolean | undefined;

    protected _values: any;

    protected _value: any;

    protected _createLabelContainer: Container | undefined;

    protected _options: any;

    protected _invalidOptions: any;

    protected _renderChanges: boolean | undefined;

    protected _disabledOptions: Record<string, string> = {};

    protected _fallbackOrder: Array<string> | undefined;

    protected _disabledValue: string | undefined;

    protected _onSelect: ((value: string) => void) | undefined;

    protected _prefix = '';

    constructor(args: Readonly<SelectInputArgs> = {}) {
        super(args)
        // main container
        const container = new Container({
            dom: args.dom
        });

        const elementArgs = { ...args, dom: container.dom } as any;

        super(elementArgs);

        const that = this as any;

        this._container = container;
        this._container.parent = this;

        this.class.add(CLASS_SELECT_INPUT);

        this._containerValue = new Container({
            class: CLASS_SELECT_INPUT_CONTAINER_VALUE
        });
        this._container.append(this._containerValue);

        // focus / hover shadow element
        this._domShadow = document.createElement('div');
        this._domShadow.classList.add(CLASS_SHADOW);
        this._containerValue.append(this._domShadow);

        that._allowInput = args.allowInput;
        if (that._allowInput) {
            this.class.add(CLASS_ALLOW_INPUT);
        }

        that._allowCreate = args.allowCreate;
        this._createFn = args.createFn;
        this._createLabelText = args.createLabelText;

        // displays current value
        this._labelValue = new Label({
            class: CLASS_VALUE,
            tabIndex: 0
        });
        this._labelValue.on('click', () => {
            if (this.enabled && !this.readOnly) {
                // toggle dropdown list
                this.toggle();
            }
        });
        this._containerValue.append(this._labelValue);

        // dropdown icon
        this._labelIcon = new Label({
            class: CLASS_ICON,
            hidden: args.allowInput && args.multiSelect
        });
        this._containerValue.append(this._labelIcon);

        // input for searching or adding new entries
        this._input = new TextInput({
            class: CLASS_INPUT,
            blurOnEnter: false,
            keyChange: true
        });
        this._containerValue.append(this._input);

        this._lastInputValue = '';
        this._suspendInputChange = false;
        this._input.on('change', this._onInputChange);
        this._input.on('keydown', this._onInputKeyDown);
        this._input.on('focus', this._onFocus);
        this._input.on('blur', this._onBlur);

        if (args.placeholder) {
            this.placeholder = args.placeholder;
        }

        // dropdown list
        this._containerOptions = new Container({
            class: CLASS_LIST,
            hidden: true
        });
        this._containerValue.append(this._containerOptions);

        // tags container
        this._containerTags = new Container({
            class: CLASS_TAGS,
            flex: true,
            flexDirection: 'row',
            hidden: true
        });
        this._container.append(this._containerTags);

        if (args.multiSelect) {
            this.class.add(CLASS_MULTI_SELECT);
            this._containerTags.hidden = false;
        }

        // events
        that._labelValue.dom.addEventListener('keydown', this._onKeyDown);
        that._labelValue.dom.addEventListener('focus', this._onFocus);
        that._labelValue.dom.addEventListener('blur', this._onBlur);
        that._labelValue.dom.addEventListener('mousedown', this._onMouseDown);

        that._containerOptions.dom.addEventListener('wheel', this._onWheel, { passive: true });

        this.on('hide', () => {
            this.close();
        });

        this._type = args.type ?? 'string';

        this.invalidOptions = args.invalidOptions ?? [];
        this.options = args.options ?? [];
        this._optionsFn = args.optionsFn;

        that._allowNull = args.allowNull;

        this._values = null;

        if (args.value !== undefined) {
            this.value = args.value;
        } else if (args.defaultValue) {
            this.value = args.defaultValue;
        } else {
            this.value = null;
        }

        that._renderChanges = args.renderChanges;

        this.on('change', () => {
            this._updateInputFieldsVisibility();

            if (this.renderChanges && !this.multiSelect) {
                this._labelValue.flash();
            }
        });

        this._updateInputFieldsVisibility(false);

        that._onSelect = args.onSelect;
        that.fallbackOrder = args.fallbackOrder;
        that.disabledOptions = args.disabledOptions;
        that._prefix = args.prefix ?? '';
    }

    destroy() {
        if (this._destroyed) return;

        const that = this as any;
        that._labelValue.dom.removeEventListener('keydown', this._onKeyDown);
        that._labelValue.dom.removeEventListener('mousedown', this._onMouseDown);
        that._labelValue.dom.removeEventListener('focus', this._onFocus);
        that._labelValue.dom.removeEventListener('blur', this._onBlur);

        that._containerOptions.dom.removeEventListener('wheel', this._onWheel);

        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('mousedown', this._onWindowMouseDown);

        if (this._timeoutLabelValueTabIndex) {
            cancelAnimationFrame(this._timeoutLabelValueTabIndex);
            this._timeoutLabelValueTabIndex = null;
        }

        super.destroy();
    }

    protected _initializeCreateLabel() {
        const container = new Container({
            class: CLASS_CREATE_NEW,
            flex: true,
            flexDirection: 'row'
        });

        const label = new Label({
            text: this._input.value as any,
            tabIndex: -1
        });
        container.append(label);

        let evtChange = this._input.on('change', (value) => {
            // 检查标签是否在更改事件中被销毁
            if (label.destroyed) return;
            label.text = value;
            if (this.invalidOptions && this.invalidOptions.indexOf(value) !== -1) {
                if (!container.hidden) {
                    container.hidden = true;
                    this._resizeShadow();
                }
            } else {
                if (container.hidden) {
                    container.hidden = false;
                    this._resizeShadow();
                }
            }
        });

        container.on('click', (e) => {
            e.stopPropagation();

            const text = label.text;

            this.focus();
            this.close();

            if (this._createFn) {
                this._createFn(text);
            } else if (text) {
                this._onSelectValue(text);
            }
        });

        label.on('destroy', () => {
            evtChange.unbind();
            evtChange = null as any;
        });

        const labelCreateText = new Label({
            text: this._createLabelText
        });
        container.append(labelCreateText);

        this._containerOptions.append(container);

        return container;
    }

    protected _convertSingleValue(value: any) {
        if (value === null && this._allowNull) return value;

        if (this._type === 'string') {
            if (!value) {
                value = '';
            } else {
                value = value.toString();
            }
        } else if (this._type === 'number') {
            if (!value) {
                value = 0;
            } else {
                value = parseInt(value, 10);
            }
        } else if (this._type === 'boolean') {
            return !!value;
        }

        return value;
    }

    protected _convertValue(value: any) {
        if (value === null && this._allowNull) return value;

        if (this.multiSelect) {
            if (!Array.isArray(value)) return value;

            return value.map(val => this._convertSingleValue(val));
        }

        return this._convertSingleValue(value);
    }

    // 使用指定的选项更新值
    protected _onSelectValue(value: any) {
        value = this._convertSingleValue(value);

        if (!this.multiSelect) {
            this.value = value;
            return;
        }

        if (this._values) {
            let dirty = false;
            this._values.forEach((arr: any) => {
                if (!arr) {
                    arr = [value];
                    dirty = true;
                } else {
                    if (arr.indexOf(value) === -1) {
                        arr.push(value);
                        dirty = true;
                    }
                }
            });

            if (dirty) {
                this._onMultipleValuesChange(this._values);

                this.emit('change', this.value);

                if (this._binding) {
                    this._binding.addValues([value]);
                }
            }
        } else {
            if (!this._value || !Array.isArray(this._value)) {
                this.value = [value];
            } else {
                if (this._value.indexOf(value) === -1) {
                    this._value.push(value);

                    this._addTag(value);

                    this.emit('change', this.value);

                    if (this._binding) {
                        this._binding.addValues([value]);
                    }
                }
            }
        }
    }

    protected _highlightLabel(label: Label|null) {
        const that = this as any;
        if (this._labelHighlighted === label) return;

        if (this._labelHighlighted) {
            this._labelHighlighted.class.remove(CLASS_HIGHLIGHTED);
        }

        this._labelHighlighted = label;

        if (this._labelHighlighted) {
            this._labelHighlighted.class.add(CLASS_HIGHLIGHTED);

                // scroll into view if necessary
            const labelTop = that._labelHighlighted.dom.offsetTop;
            const scrollTop = that._containerOptions.dom.scrollTop;
            if (labelTop < scrollTop) {
                that._containerOptions.dom.scrollTop = labelTop;
            } else if (labelTop + this._labelHighlighted.height > this._containerOptions.height + scrollTop) {
                that._containerOptions.dom.scrollTop = labelTop + this._labelHighlighted.height - this._containerOptions.height;
            }
        }
    }

    // 当值改变时，显示正确的标题
    protected _onValueChange(value: any) {
        if (!this.multiSelect) {
            this._labelValue.value = this._prefix + (this._valueToText[value] || '');

            value = '' + value;
            for (const key in this._valueToLabel) {
                const label = this._valueToLabel[key];
                if (key === value) {
                    label.class.add(CLASS_SELECTED);
                } else {
                    label.class.remove(CLASS_SELECTED);
                }
            }
        } else {
            this._labelValue.value = '';
            this._containerTags.clear();
            this._containerTags.class.add(CLASS_TAGS_EMPTY);

            if (value && Array.isArray(value)) {
                for (const val of value) {
                    this._addTag(val);
                    const label = this._valueToLabel[val];
                    if (label) {
                        label.class.add(CLASS_SELECTED);
                    }
                }

                for (const key in this._valueToLabel) {
                    const label = this._valueToLabel[key];
                    if (value.indexOf(this._convertSingleValue(key)) !== -1) {
                        label.class.add(CLASS_SELECTED);
                    } else {
                        label.class.remove(CLASS_SELECTED);
                    }
                }
            }
        }
    }

    protected _onMultipleValuesChange(values: any) {
        this._labelValue.value = '';
        this._containerTags.clear();
        this._containerTags.class.add(CLASS_TAGS_EMPTY);

        const tags: any = {};
        const valueCounts: any = {};
        values.forEach((arr: any) => {
            if (!arr) return;
            arr.forEach((val: any) => {
                if (!tags[val]) {
                    tags[val] = this._addTag(val);
                    valueCounts[val] = 1;
                } else {
                    valueCounts[val]++;
                }
            });
        });

        // 为并非到处都存在的标签添加特殊的类
        for (const val in valueCounts) {
            if (valueCounts[val] !== values.length) {
                tags[val].class.add(CLASS_TAG_NOT_EVERYWHERE);
                const label = this._valueToLabel[val];
                if (label) {
                    label.class.remove(CLASS_SELECTED);
                }
            }
        }
    }

    protected _addTag(value: any) {
        const container = new Container({
            flex: true,
            flexDirection: 'row',
            class: CLASS_TAG
        });

        container.append(new Label({
            text: this._valueToText[value] || value
        }));

        const btnRemove = new Button({
            size: 'small',
            icon: 'E132',
            tabIndex: -1
        });

        container.append(btnRemove);

        btnRemove.on('click', () => this._removeTag(container, value));

        this._containerTags.append(container);
        this._containerTags.class.remove(CLASS_TAGS_EMPTY);

        const label = this._valueToLabel[value];
        if (label) {
            label.class.add(CLASS_SELECTED);
        }

        // @ts-ignore
        container.value = value;

        return container;
    }

    protected _removeTag(tagElement: Container, value: string) {
        tagElement.destroy();

        const label = this._valueToLabel[value];
        if (label) {
            label.class.remove(CLASS_SELECTED);
        }

        if (this._values) {
            this._values.forEach((arr: string[]) => {
                if (!arr) return;
                const idx = arr.indexOf(value);
                if (idx !== -1) {
                    arr.splice(idx, 1);
                }
            });
        } else if (this._value && Array.isArray(this._value)) {
            const idx = this._value.indexOf(value);
            if (idx !== -1) {
                this._value.splice(idx, 1);
            }
        }

        this.emit('change', this.value);

        if (this._binding) {
            this._binding.removeValues([value]);
        }
    }

    protected _onInputChange = (value: any) => {
        if (this._suspendInputChange) return;

        if (this._lastInputValue === value) return;

        this.open();

        this._lastInputValue = value;

        this._filterOptions(value);
    };

    protected _filterOptions(filter: any) {
        // 首先删除所有选项，然后搜索最佳匹配选项，并按最佳匹配顺序添加它们
        const containerDom = this._containerOptions.dom as any;
        while (containerDom.firstChild) {
            containerDom.removeChild(containerDom.lastChild);
        }

        if (filter) {
            const searchOptions = this.options.map((option: any) => {
                return [option.t, option.v];
            });
            const searchResults = searchItems(searchOptions, filter);
            searchResults.forEach((value: any) => {
                const label = this._valueToLabel[value];
                containerDom.appendChild(label.dom);
            });

        } else {
            for (const option of this._options) {
                const label = this._valueToLabel[option.v];
                containerDom.appendChild(label.dom);
            }
        }

        // 在末尾添加create label
        if (this._createLabelContainer) {
            containerDom.appendChild(this._createLabelContainer.dom);
        }

        if (containerDom.firstChild) {
            this._highlightLabel(containerDom.firstChild.ui as Label);
        }

        this._resizeShadow();
    }

    protected _onInputKeyDown = (evt: KeyboardEvent) => {
        if (evt.key === 'Enter' && this.enabled && !this.readOnly) {
            evt.stopPropagation();
            evt.preventDefault();

            // on enter
            let value;

            if (this._labelHighlighted && this._labelToValue.has(this._labelHighlighted)) {
                value = this._labelToValue.get(this._labelHighlighted);
            } else {
                value = this._input.value;
            }

            if (value !== undefined) {
                this.focus();
                this.close();

                if (this._valueToText[value]) {
                    this._onSelectValue(value);
                } else if (this._allowCreate) {
                    if (this._createFn) {
                        this._createFn(value);
                    } else {
                        this._onSelectValue(value);
                    }
                }

                return;
            }
        }

        this._onKeyDown(evt);
    };

    protected _onWindowMouseDown = (evt: MouseEvent) => {
        if (this.dom && !this.dom.contains(evt.target as Node)) {
            this.close();
        }
    };

    protected _onKeyDown = (evt: KeyboardEvent) => {
        // 失焦和ESC时关闭选项列表
        if (evt.key === 'Escape') {
            this.close();
            return;
        }

        if (evt.key === 'Tab') {
            this.close();
            return;
        }

        if (!this.enabled || this.readOnly) return;

        if (evt.key === 'Enter' && !this._allowInput) {
            if (this._labelHighlighted && this._labelToValue.has(this._labelHighlighted)) {
                this._onSelectValue(this._labelToValue.get(this._labelHighlighted));
                this.close();
            }

            return;
        }

        if (evt.key !== 'ArrowUp' && evt.key !== 'ArrowDown') {
            return;
        }

        evt.stopPropagation();
        evt.preventDefault();

        if ((this._allowInput || this.multiSelect) && this._containerOptions.hidden) {
            this.open();
            return;
        }

        if (this._containerOptions.hidden) {
            if (!this._options.length) return;

            let index = -1;
            for (let i = 0; i < this._options.length; i++) {
                if (this._options[i].v === this.value) {
                    index = i;
                    break;
                }
            }

            if (evt.key === 'ArrowUp') {
                index--;
            } else if (evt.key === 'ArrowDown') {
                index++;
            }

            if (index >= 0 && index < this._options.length) {
                this._onSelectValue(this._options[index].v);
            }
        } else {
            if (!(this._containerOptions as any).dom.childNodes.length) return;

            if (!this._labelHighlighted) {
                this._highlightLabel((this._containerOptions as any).dom.childNodes[0].ui as Label);
            } else {
                let highlightedLabelDom = this._labelHighlighted.dom as any;
                do {
                    if (evt.key === 'ArrowUp') {
                        highlightedLabelDom = highlightedLabelDom.previousSibling;
                    } else if (evt.key === 'ArrowDown') {
                        highlightedLabelDom = highlightedLabelDom.nextSibling;
                    }
                } while (highlightedLabelDom && highlightedLabelDom.ui.hidden);

                if (highlightedLabelDom) {
                    this._highlightLabel(highlightedLabelDom.ui as Label);
                }
            }
        }
    };

    protected _resizeShadow() {
        this._domShadow.style.height = (this._containerValue.height + this._containerOptions.height) + 'px';
    }

    protected _onMouseDown = () => {
        if (!this._allowInput) {
            this.focus();
        }
    };

    protected _onFocus = () => {
        this.class.add(pcuiClass.FOCUS);
        this.emit('focus');
        if (!this._input.hidden) {
            this.open();
        }
    };

    protected _onBlur = () => {
        this.class.remove(pcuiClass.FOCUS);
        this.emit('blur');
    };

    protected _onWheel = (evt: WheelEvent) => {
        // 当在select input上滚动时，防止在其他东西上滚动，比如viewport
        evt.stopPropagation();
    };

    protected _updateInputFieldsVisibility(focused?: boolean) {
        let showInput = false;
        let focusInput = false;

        if (this._allowInput) {
            if (focused) {
                showInput = true;
                focusInput = true;
            } else {
                showInput = this.multiSelect || !this._valueToLabel[this.value];
            }
        }

        this._labelValue.hidden = showInput;
        this._labelIcon.hidden = showInput;
        this._input.hidden = !showInput;

        if (focusInput) {
            this._input.focus();
        }

        if (!this._labelValue.hidden) {
            // 防止标签在输入未聚焦后立即聚焦
            this._labelValue.tabIndex = -1;

            if (!this._timeoutLabelValueTabIndex) {
                this._timeoutLabelValueTabIndex = requestAnimationFrame(() => {
                    this._timeoutLabelValueTabIndex = null;
                    this._labelValue.tabIndex = 0;
                });
            }
        }

    }

    focus() {
        const that = this as any;
        if (this._input.hidden) {
            that._labelValue.dom.focus();
        } else {
            this._input.focus();
        }
    }

    blur() {
        const that = this as any;
        if (this._allowInput) {
            this._input.blur();
        } else {
            that._labelValue.dom.blur();
        }
    }

    /**
     * 打开下拉菜单
     */
    open() {
        if (!this._containerOptions.hidden || !this.enabled || this.readOnly) return;

        this._updateInputFieldsVisibility(true);

        // 自动更新选项（如有必要）
        if (this._optionsFn) {
            this.options = this._optionsFn();
        }

        const that = this as any;
        if (that._containerOptions.dom.childNodes.length === 0) return;

        // 高亮显示显示当前值的标签
        this._containerOptions.forEachChild((label: any) => {
            label.hidden = false;
            if (this._labelToValue.get(label) === this.value) {
                this._highlightLabel(label);
            }
        });
        if (!this._labelHighlighted) {
            this._highlightLabel(that._containerOptions.dom.childNodes[0].ui as Label);
        }

        // 显示选项
        this._containerOptions.hidden = false;
        this.class.add(CLASS_OPEN);

        // 在整个窗口上注册keydown
        window.addEventListener('keydown', this._onKeyDown);
        // 在整个窗口上注册mousedown
        window.addEventListener('mousedown', this._onWindowMouseDown);

        // 如果下拉列表位于窗口下方，则将其显示在字段上方
        const startField = this._allowInput ? this._input.dom : this._labelValue.dom as any;
        const rect = startField.getBoundingClientRect();
        let fitHeight = (rect.bottom + this._containerOptions.height + DEFAULT_BOTTOM_OFFSET >= window.innerHeight);
        if (fitHeight && rect.top - this._containerOptions.height < 0) {
            // 如果将它显示在字段上方意味着其中一些将不可见
            // 则将其显示在下方，并将最大高度调整为最大可用空间
            fitHeight = false;
            this._containerOptions.style.maxHeight = (window.innerHeight - rect.bottom - DEFAULT_BOTTOM_OFFSET) + 'px';
        }

        if (fitHeight) {
            this.class.add(CLASS_FIT_HEIGHT);
        } else {
            this.class.remove(CLASS_FIT_HEIGHT);
        }

        // 调整外部阴影的大小以适应元素和下拉列表
        // 我们需要这个，因为下拉列表是position:absolute
        this._resizeShadow();
    }

    /**
     * 关闭下拉菜单
     */
    close() {
        // 这里有一个潜在的错误，
        // 如果用户自己设置了最大高度，那么这将被覆盖
        this._containerOptions.style.maxHeight = '';

        this._highlightLabel(null);

        this._updateInputFieldsVisibility(false);

        this._suspendInputChange = true;
        this._input.value = '';
        if (this._lastInputValue) {
            this._lastInputValue = '';
            this._filterOptions(null);
        }
        this._suspendInputChange = false;

        if (this._containerOptions.hidden) return;

        this._containerOptions.hidden = true;

        this._domShadow.style.height = '';

        this.class.remove(CLASS_OPEN);
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('mousedown', this._onWindowMouseDown);
    }

    /**
     * 切换下拉菜单
     */
    toggle() {
        if (this._containerOptions.hidden) {
            this.open();
        } else {
            this.close();
        }
    }

    unlink() {
        super.unlink();

        if (!this._containerOptions.hidden) {
            this.close();
        }
    }

    _updateValue(value: string) {
        if (value === this._value) return;
        this._value = value;
        this._onValueChange(value);

        if (!this._suppressChange) {
            this.emit('change', value);
        }

        if (this._binding) {
            this._binding.setValue(value);
        }
    }

    _updateDisabledValue(value: string) {
        const labels: Record<string, Label> = {};
        this._containerOptions.forEachChild((label: any) => {
            labels[label.dom.id] = label;
            if (this._disabledOptions[label.dom.id]) {
                label.enabled = false;
                label.text = this._disabledOptions[label.dom.id];
            } else {
                label.enabled = true;
                label.text = this._valueToText[label.dom.id];
            }
            label.class.remove(CLASS_DISABLED_VALUE);
        });

        const disabledValue = this._disabledOptions[value] ? value : null;
        let newValue = null;
        if (disabledValue) {
            if (this._fallbackOrder) {
                for (let i = 0; i < this._fallbackOrder.length; i++) {
                    if (this._fallbackOrder[i] === value) continue;
                    newValue = this._fallbackOrder[i];
                    break;
                }
            }
            this.disabledValue = disabledValue;
            labels[disabledValue].class.add(CLASS_DISABLED_VALUE);
        } else if (this._disabledValue) {
            newValue = this._disabledValue;
            this.disabledValue = null;
        } else {
            newValue = value;
            this.disabledValue = null;
        }
        return newValue;
    }

    set options(value) {
        if (this._options && JSON.stringify(this._options) === JSON.stringify(value)) return;

        this._containerOptions.clear();
        this._labelHighlighted = null;
        this._valueToText = {};
        this._valueToLabel = {};
        this._options = value;

        // 将每个 选项值->标题对 存储在选项索引中
        for (const option of this._options) {
            this._valueToText[option.v] = option.t;
            if (option.v === '') return;

            const label = new Label({
                text: option.t,
                tabIndex: -1,
                id: option.v
            });

            this._labelToValue.set(label, option.v);

            // 将标签也存储在索引中
            this._valueToLabel[option.v] = label;

            // 单击某个选项时，将其设置为值并关闭下拉列表
            label.on('click', (e) => {
                e.stopPropagation();
                this._onSelectValue(option.v);
                this.close();
                if (this._onSelect) {
                    this._onSelect(this.value);
                }
            });
            this._containerOptions.append(label);
        }
        const that = this as any;
        that._createLabelContainer = null;
        if (this._createLabelText) {
            this._createLabelContainer = this._initializeCreateLabel();
        }

        if (this.multiSelect && this._values) {
            this._onMultipleValuesChange(this._values);
        } else {
            this._onValueChange(this.value);
        }

        if (this._lastInputValue) {
            this._filterOptions(this._lastInputValue);
        }
    }

    get options() {
        return this._options.slice();
    }

    set invalidOptions(value) {
        this._invalidOptions = value || null;
    }

    get invalidOptions() {
        return this._invalidOptions;
    }

    set disabledValue(value: string | null) {
        const that = this as any;
        that._disabledValue = value;
        if (this._disabledValue !== null) {
            this.class.add(CLASS_HAS_DISABLED_VALUE);
        } else {
            this.class.remove(CLASS_HAS_DISABLED_VALUE);
        }
    }

    set disabledOptions(value: any) {
        if (JSON.stringify(this._disabledOptions) === JSON.stringify(value)) return;
        this._disabledOptions = value || {};
        const newValue = this._updateDisabledValue(this._value) as any;
        this._updateValue(newValue);
    }

    set fallbackOrder(value: string[]) {
        this._fallbackOrder = value || null;
    }

    get multiSelect() {
        return this.class.contains(CLASS_MULTI_SELECT);
    }

    set value(value) {
        this._values = null;

        this._suspendInputChange = true;
        this._input.value = '';
        if (this._lastInputValue) {
            this._lastInputValue = '';
            this._filterOptions(null);
        }
        this._suspendInputChange = false;

        this.class.remove(pcuiClass.MULTIPLE_VALUES);

        value = this._convertValue(value);

        if (this._value === value || this.multiSelect && this._value && this._value.equals(value)) {
            // 如果值为null，因为我们显示了多个值，但有人想实际将所有观察者的值设置为null，那么请确保我们不会提前返回
            if (value !== null || !this._allowNull || !this.class.contains(pcuiClass.MULTIPLE_VALUES)) {
                return;
            }
        }

        this.disabledValue = null;
        this._updateValue(value);
    }

    get value() {
        if (!this.multiSelect) {
            return this._value;
        }

        // 如果多选，则根据当前可见的标记构造数组值
        const result: any = [];
        (this._containerTags.dom as any).childNodes.forEach((dom:any) => {
            // @ts-ignore
            result.push(dom.ui.value);
        });

        return result;
    }

    /* eslint accessor-pairs: 0 */
    set values(values: Array<any>) {
        values = values.map((value) => {
            return this._convertValue(value);
        });

        let different = false;
        const value = values[0];
        const multiSelect = this.multiSelect;

        this._values = null;

        for (let i = 1; i < values.length; i++) {
            if (values[i] !== value && (!multiSelect || !values[i] || !values[i].equals(value))) {
                different = true;
                break;
            }
        }

        if (different) {
            this._labelValue.values = values;

            // 显示所有不同的标记
            if (multiSelect) {
                this._values = values;
                this._value = null;
                this._onMultipleValuesChange(this._values);
                this.emit('change', this.value);
            } else {
                if (this._value !== null) {
                    this._value = null;
                    this.emit('change', null);
                }
            }

            this.class.add(pcuiClass.MULTIPLE_VALUES);
        } else {
            this.value = values[0];
        }
    }

    set placeholder(value) {
        this._input.placeholder = value;
    }

    get placeholder() {
        return this._input.placeholder;
    }

    set renderChanges(value: boolean) {
        this._renderChanges = value;
    }

    get renderChanges() {
        return this._renderChanges as any;
    }
}

Element.register('select', SelectInput, { renderChanges: true });
Element.register('multiselect', SelectInput, { multiSelect: true, renderChanges: true });
Element.register('tags', SelectInput, { allowInput: true, allowCreate: true, multiSelect: true, renderChanges: true });

export default SelectInput;
