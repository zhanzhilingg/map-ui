import { EventHandle, Events, Observer } from '../../observer';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

import { BindingBase } from '../../binding';

const CLASS_ELEMENT = PREFIX + 'element';

export type HandleEvent = (arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any, arg6?: any, arg7?: any, arg8?: any) => void;

// 这些属性可以作为Element属性使用，也可以通过Element构造函数设置
const SIMPLE_CSS_PROPERTIES = [
    'flexDirection',
    'flexGrow',
    'flexBasis',
    'flexShrink',
    'flexWrap',
    'alignItems',
    'alignSelf',
    'justifyContent',
    'justifySelf'
];

// 按名称和默认参数存储元素类型
const elementRegistry: Map<string, any> = new Map();

export interface IBindable {
    /**
     * 获取/设置元素的值
     */
    value?:any
    /**
     * 获取/设置元素的多个值。如何显示它们由Element决定。
     */
    values?:Array<any>
    /**
     * 获取/设置输入是否应在更改时闪烁。
     */
    renderChanges?:boolean
}

export interface IBindableArgs {
    /**
     * 设置元素的值。
     */
    value?: any,
    /**
     * 为元素设置多个值。如何显示它们由Element决定。
     */
    values?: Array<any>,
    /**
     * 如果为true，则每个输入都会闪烁变化。
     */
    renderChanges?: boolean
}

export interface IPlaceholder {
    /**
     * 获取/设置输入的占位符文本。
     */
    placeholder?:string
}

export interface IPlaceholderArgs {
    /**
     * 设置出现在输入右侧的占位符标签。
     */
    placeholder?: string,
}

export interface IFocusable {
    /**
     * Focus on the element. 
     * 如果输入包含文本并且提供了选择，则文本将被选中
     */
    focus(select?: boolean): void

    /**
     * 取消元素的焦点
     */
    blur(): void
}


export interface IParentArgs {
    /**
     * 当前组件的子组件
     */
    children?: Element// React.ReactNode
}


export interface IFlexArgs {
    /**
     * 设置元素是否使用伸缩布局
     */
    flex?: boolean,
    /**
     * 设置元素的flexBasis CSS属性
     */
    flexBasis?: string,
    /**
     * 设置元素的“flexDirection”CSS属性
     */
    flexDirection?: string,
    /**
     * 设置元素的“flexGrow”CSS属性
     */
    flexGrow?: string,
    /**
     * 设置元素的“flexShrink”CSS属性
     */
    flexShrink?: string,
    /**
     * 设置元素的“flexWrap”CSS属性
     */
    flexWrap?: string
}

/**
 * {@link Element}构造函数的参数
 */
export interface ElementArgs {
    /**
     * 用来创建{@link Element}的HTMLElement。如果没有提供，此元素将创建一个。
     */
    dom?: HTMLElement | string;
    /**
     * 与{@link元素}一起使用的绑定。
     */
    binding?: BindingBase;
    /**
     * 如果提供了{@link Element}，并且{@link Element}是可单击的，则每次单击该元素时都会调用此函数。
     */
    onClick?: () => void,
    /**
     * 如果提供了{@link Element}，并且{@link Element}是可更改的，则该函数将在每次更改元素值时调用。
     */
    onChange?: (value: any) => void,
    /**
     * 如果提供了{@link Element}并且该元素是可移除的，则每次移除该元素时都会调用该函数。
     */
    onRemove?: () => void,
    /**
     * 设置父元素{@link Element}。
     */
    parent?: Element, // eslint-disable-line no-use-before-define
    /**
     * 将给定观察者中的路径位置的观察者属性链接到{@link Element}。
     */
    link?: { observer: Array<Observer>|Observer, path: Array<string>|string },
    /**
     * {@link Element}的HTMLElement的id属性。
     */
    id?: string,
    /**
     * {@link Element}的HTMLElement的类属性。
     */
    class?: string | string[],
    /**
     * 设置该{@link Element}是否位于层次结构的根。
     */
    isRoot?: boolean,
    /**
     * 设置是否可以与{@link Element}及其子元素交互。
     */
    enabled?: boolean,
    /**
     * 设置是否隐藏此{@link Element}。默认为“false”。
     */
    hidden?: boolean,
    /**
     * 如果' true '，这个{@link Element}将在确定该元素是否被启用时忽略其父元素的启用值。默认为“false”。
     */
    ignoreParent?: boolean,
    /**
     * 设置{@link元素}的初始宽度。
     */
    width?: number | null,
    /**
     * 设置{@link元素}的初始高度。
     */
    height?: number | null,
    /**
     * 设置{@link元素}的tabIndex。
     */
    tabIndex?: number,
    /**
     * 设置{@link Element}是否处于错误状态。
     */
    error?: boolean,
    /**
     * 为Element.dom.style设置一个初始值。
     */
    style?: string,
    /**
     * 这个{@link Element}是否是只读的。默认为“false”。
     */
    readOnly?: boolean
}

/**
 * 所有UI元素的基类
 */
class Element extends Events {
    /**
     * 当元素被启用时触发
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('enable', () => {
     *     console.log('Element enabled');
     * });
     * ```
     */
    public static readonly EVENT_ENABLE = 'enable';

    /**
     * 当元素被禁用时触发
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('disable', () => {
     *     console.log('Element disabled');
     * });
     * ```
     */
    public static readonly EVENT_DISABLE = 'disable';

    /**
     * 当元素被隐藏时触发
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('hide', () => {
     *     console.log('Element hidden');
     * });
     * ```
     */
    public static readonly EVENT_HIDE = 'hide';

    /**
     * 当元素或其父元素被隐藏时触发
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('hideToRoot', () => {
     *     console.log('Element or one of its parents hidden');
     * });
     * ```
     */
    public static readonly EVENT_HIDE_TO_ROOT = 'hideToRoot';

    /**
     * 元素停止隐藏时触发
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('show', () => {
     *     console.log('Element shown');
     * });
     * ```
     */
    public static readonly EVENT_SHOW = 'show';

    /**
     * 当元素及其所有父元素变为可见时触发
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('showToRoot', () => {
     *     console.log('Element and all of its parents shown');
     * });
     * ```
     */
    public static readonly EVENT_SHOW_TO_ROOT = 'showToRoot';

    /**
     * 当元素的readOnly属性改变时触发
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('readOnly', (readOnly: boolean) => {
     *     console.log(`Element is now ${readOnly ? 'read only' : 'editable'}`);
     * });
     * ```
     */
    public static readonly EVENT_READ_ONLY = 'readOnly';

    /**
     * 当元素的父元素被设置时触发
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('parent', (parent: Element) => {
     *     console.log(`Element's parent is now ${parent}`);
     * });
     * ```
     */
    public static readonly EVENT_PARENT = 'parent';

    /**
     * 当鼠标点击元素时触发，但只有当元素被启用时才会触发。原生DOM MouseEvent作为参数传递给事件处理程序。
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('click', (evt: MouseEvent) => {
     *     console.log('Element clicked');
     * });
     * ```
     */
    public static readonly EVENT_CLICK = 'click';

    /**
     * 当鼠标悬停在元素上时触发。原生DOM MouseEvent作为参数传递给事件处理程序。
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('hover', (evt: MouseEvent) => {
     *     console.log('Element hovered');
     * });
     * ```
     */
    public static readonly EVENT_HOVER = 'hover';

    /**
     * 当鼠标停止悬停在元素上时触发。原生DOM MouseEvent作为参数传递给事件处理程序。
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('hoverend', (evt: MouseEvent) => {
     *     console.log('Element hover ended');
     * });
     * ```
     */
    public static readonly EVENT_HOVER_END = 'hoverend';

    /**
     * 元素被销毁后触发。DOM元素和所有者元素实例都作为参数传递给事件处理程序。
     *
     * @event
     * @example
     * ```ts
     * const element = new Element();
     * element.on('destroy', (dom: HTMLElement, element: Element) => {
     *     console.log('Element destroyed');
     * });
     * ```
     */
    public static readonly EVENT_DESTROY = 'destroy';

    protected _destroyed = false;

    protected _parent: Element|null = null; // eslint-disable-line no-use-before-define

    protected _eventsParent: EventHandle[] = [];

    protected _dom: HTMLElement |undefined |null;

    protected _hiddenParents: boolean;

    protected _flashTimeout: number|null = null;

    protected _suppressChange = false;

    protected _binding: BindingBase|undefined|null;

    protected _ignoreParent: boolean|undefined;

    protected _enabled: boolean|undefined;

    protected _readOnly: boolean|undefined;

    protected _hidden: boolean|undefined;

    protected _hasError: boolean|undefined;

    protected _domContent: HTMLElement|undefined;

    protected _onClickEvt: (evt: Event) => void;

    constructor(args: Readonly<ElementArgs> = {}) {
        super();

        if (typeof args.dom === 'string') {
            this._dom = document.createElement(args.dom);
        } else if (args.dom instanceof Node) {
            this._dom = args.dom;
        } else {
            this._dom = document.createElement('div');
        }

        if (args.id !== undefined) {
            this._dom.id = args.id;
        }

        // add ui reference
        this._dom.ui = this;

        this._onClickEvt = this._onClick.bind(this);

        // add event listeners
        this._dom.addEventListener('click', this._onClickEvt);
        this._dom.addEventListener('mouseover', this._onMouseOver);
        this._dom.addEventListener('mouseout', this._onMouseOut);

        // add css classes
        this._dom.classList.add(CLASS_ELEMENT, pcuiClass.FONT_REGULAR);

        // add user classes
        if (args.class) {
            const classes = Array.isArray(args.class) ? args.class : [args.class];
            for (const cls of classes) {
                this._dom.classList.add(cls);
            }
        }

        this.enabled = args.enabled !== undefined ? args.enabled : true;
        this._hiddenParents = !args.isRoot;
        this.hidden = args.hidden ?? false;
        this.readOnly = args.readOnly ?? false;
        this.ignoreParent = args.ignoreParent ?? false;

        if (args.width !== undefined) {
            (this.width as any) = args.width;
        }
        if (args.height !== undefined) {
            (this.height as any) = args.height;
        }
        if (args.tabIndex !== undefined) {
            this.tabIndex = args.tabIndex;
        }

        // 从args中复制CSS属性
        for (const key in args) {
            // @ts-ignore
            if (args[key] === undefined) continue;
            if (SIMPLE_CSS_PROPERTIES.indexOf(key) !== -1) {
                // @ts-ignore
                this[key] = args[key];
            }
        }

        // 设置绑定对象
        if (args.binding) {
            this.binding = args.binding;
        }
    }

    /**
     * 销毁元素及其事件
     */
    destroy() {
        if (this._destroyed) return;

        this._destroyed = true;

        if (this.binding) {
            (this.binding as any) = null;
        } else {
            this.unlink();
        }

        if (this.parent) {
            const parent = this.parent;

            for (const event of this._eventsParent) {
                event.unbind();
            }
            this._eventsParent.length = 0;

            // 从parent中移除元素，
            // 检查parent是否已经被销毁，
            // 因为我们不想在被销毁的父元素上发出事件，
            // 因为它很容易导致null异常
            // @ts-ignore
            if (parent.remove && !parent._destroyed) {
                // @ts-ignore
                parent.remove(this);
            }

            // 将parent设置为null并从parent dom中删除。由于覆盖或其他条件，上面的移除无法工作
            this._parent = null;
            // 对于父元素已经被销毁的元素，不要手动调用removeChild。
            // 例如，当我们销毁一个有许多子节点的TreeViewItem时，这将触发每个子元素调用dom.parentelelement.removechild (dom)。
            // 但是我们不需要从它们的父DOM元素中删除所有这些DOM元素，因为根DOM元素无论如何都会被销毁。
            // 这在某些情况下对摧毁速度有很大的影响。
            if (!parent._destroyed && this._dom && this._dom.parentElement) {
                this._dom.parentElement.removeChild(this._dom);
            }
        }

        const dom = this._dom;
        if (dom) {
            // remove event listeners
            dom.removeEventListener('click', this._onClickEvt);
            dom.removeEventListener('mouseover', this._onMouseOver);
            dom.removeEventListener('mouseout', this._onMouseOut);

            // remove ui reference
            delete (dom as any).ui;

            this._dom = undefined;
        }

        if (this._flashTimeout) {
            window.clearTimeout(this._flashTimeout);
        }

        this.emit('destroy', dom, this);

        this.unbind();
    }

    /**
     * 将指定的观察者和路径链接到Element的数据绑定
     *
     * @param observers 一组观察者或单个观察者
     * @param paths - 观察者的路径或映射到每个独立观察者的路径数组
     */
    link(observers: Observer|Observer[], paths: string|string[]) {
        if (this._binding) {
            this._binding.link(observers, paths);
        }
    }

    /**
     * 解除元素与其观察器的链接
     */
    unlink() {
        if (this._binding) {
            this._binding.unlink();
        }
    }

    /**
     * 在元素上触发一个flash动画
     */
    flash() {
        if (this._flashTimeout) return;

        this.class.add(pcuiClass.FLASH);
        this._flashTimeout = window.setTimeout(() => {
            this._flashTimeout = null;
            this.class.remove(pcuiClass.FLASH);
        }, 200);
    }

    protected _onClick(evt: Event) {
        if (this.enabled) {
            this.emit('click', evt);
        }
    }

    protected _onMouseOver = (evt: MouseEvent) => {
        this.emit('hover', evt);
    };

    protected _onMouseOut = (evt: MouseEvent) => {
        this.emit('hoverend', evt);
    };

    protected _onHiddenToRootChange(hiddenToRoot: boolean) {
        this.emit(hiddenToRoot ? 'hideToRoot' : 'showToRoot');
    }

    protected _onEnabledChange(enabled: boolean) {
        if (enabled) {
            this.class.remove(pcuiClass.DISABLED);
        } else {
            this.class.add(pcuiClass.DISABLED);
        }

        this.emit(enabled ? 'enable' : 'disable');
    }

    protected _onParentDestroy() {
        this.destroy();
    }

    protected _onParentDisable() {
        if (this._ignoreParent) return;
        if (this._enabled) {
            this._onEnabledChange(false);
        }
    }

    protected _onParentEnable() {
        if (this._ignoreParent) return;
        if (this._enabled) {
            this._onEnabledChange(true);
        }
    }

    protected _onParentShowToRoot() {
        const oldHiddenToRoot = this.hiddenToRoot;
        this._hiddenParents = false;
        if (oldHiddenToRoot !== this.hiddenToRoot) {
            this._onHiddenToRootChange(this.hiddenToRoot);
        }
    }

    protected _onParentHideToRoot() {
        const oldHiddenToRoot = this.hiddenToRoot;
        this._hiddenParents = true;
        if (oldHiddenToRoot !== this.hiddenToRoot) {
            this._onHiddenToRootChange(this.hiddenToRoot);
        }
    }

    protected _onReadOnlyChange(readOnly: boolean) {
        if (readOnly) {
            this.class.add(pcuiClass.READONLY);
        } else {
            this.class.remove(pcuiClass.READONLY);
        }

        this.emit('readOnly', readOnly);
    }

    protected _onParentReadOnlyChange(readOnly: boolean) {
        if (this._ignoreParent) return;
        if (readOnly) {
            if (!this._readOnly) {
                this._onReadOnlyChange(true);
            }
        } else {
            if (!this._readOnly) {
                this._onReadOnlyChange(false);
            }
        }
    }

    unbind(name?: string, fn?: HandleEvent): Events {
        return super.unbind(name as any, fn as any);
    }

    /**
     * @param type - 要引用的元素类型
     * @param cls - 元素的实际类
     * @param defaultArguments - 创建此类型时的默认参数
     */
    static register<Type>(type: string, cls: new () => Type, defaultArguments?: any) {
        elementRegistry.set(type, { cls, defaultArguments });
    }

    /**
     * @param type - 注销的类型
     */
    static unregister(type: string) {
        elementRegistry.delete(type);
    }

    /**
     * 创建所需类型的新元素
     *
     * @param type - 元素的类型(由Element#register注册)
     * @param args - 元素的参数
     * @returns 如果没有找到类型，则为新元素或未定义
     */
    static create(type: string, args: ElementArgs): any {
        const entry = elementRegistry.get(type);
        if (!entry) {
            console.error('Invalid type passed to Element.create:', type);
            return undefined;
        }

        const cls = entry.cls;
        const clsArgs = { ...entry.defaultArguments, ...args };

        return new cls(clsArgs);
    }


    /**
     * 获取/设置是否启用Element或其父链。默认为“true”。
     */
    set enabled(value: boolean) {
        if (this._enabled === value) return;

        // 如果在层次结构中启用
        const enabled = this.enabled;

        this._enabled = value;

        // 只有当层次结构状态改变时才触发事件
        if (enabled !== value) {
            this._onEnabledChange(value);
        }
    }

    get enabled(): boolean {
        if (this._ignoreParent) return !!this._enabled;
        return !!this._enabled && (!this._parent || this._parent.enabled);
    }

    /**
     * 获取/设置元素是否忽略父事件和变量状态。
     */
    set ignoreParent(value) {
        this._ignoreParent = value;
        this._onEnabledChange(this.enabled);
        this._onReadOnlyChange(this.readOnly);
    }

    get ignoreParent() {
        return this._ignoreParent;
    }

    /**
     * 获取此元素的根DOM节点。
     */
    get dom(): HTMLElement|null {
        return this._dom as any;
    }

    /**
     * 获取/设置父元素。
     */
    set parent(value: Element) {
        if (value === this._parent) return;

        const oldEnabled = this.enabled;
        const oldReadonly = this.readOnly;
        const oldHiddenToRoot = this.hiddenToRoot;

        if (this._parent) {
            for (let i = 0; i < this._eventsParent.length; i++) {
                this._eventsParent[i].unbind();
            }
            this._eventsParent.length = 0;
        }

        this._parent = value;

        if (this._parent) {
            this._eventsParent.push(this._parent.once('destroy', this._onParentDestroy.bind(this)));
            this._eventsParent.push(this._parent.on('disable', this._onParentDisable.bind(this)));
            this._eventsParent.push(this._parent.on('enable', this._onParentEnable.bind(this)));
            this._eventsParent.push(this._parent.on('readOnly', this._onParentReadOnlyChange.bind(this)));
            this._eventsParent.push(this._parent.on('showToRoot', this._onParentShowToRoot.bind(this)));
            this._eventsParent.push(this._parent.on('hideToRoot', this._onParentHideToRoot.bind(this)));

            this._hiddenParents = this._parent.hiddenToRoot;
        } else {
            this._hiddenParents = true;
        }

        this.emit('parent', this._parent);

        const newEnabled = this.enabled;
        if (newEnabled !== oldEnabled) {
            this._onEnabledChange(newEnabled);
        }

        const newReadonly = this.readOnly;
        if (newReadonly !== oldReadonly) {
            this._onReadOnlyChange(newReadonly);
        }

        const hiddenToRoot = this.hiddenToRoot;
        if (hiddenToRoot !== oldHiddenToRoot) {
            this._onHiddenToRootChange(hiddenToRoot);
        }
    }

    get parent(): Element {
        return this._parent as any;
    }

    /**
     * 获取/设置元素是否隐藏。
     */
    set hidden(value: boolean) {
        if (value === this._hidden) return;

        const oldHiddenToRoot = this.hiddenToRoot;

        this._hidden = value;

        if (value) {
            this.class.add(pcuiClass.HIDDEN);
        } else {
            this.class.remove(pcuiClass.HIDDEN);
        }

        this.emit(value ? 'hide' : 'show');

        if (this.hiddenToRoot !== oldHiddenToRoot) {
            this._onHiddenToRootChange(this.hiddenToRoot);
        }
    }

    get hidden(): boolean {
        return this._hidden as any;
    }


    /**
     * 获取元素是否一直隐藏到根节点。如果元素本身或它的父元素是隐藏的，则为真。
     */
    get hiddenToRoot(): boolean {
        return this._hidden || this._hiddenParents;
    }


    /**
     * 获取/设置元素是否为只读。
     */
    set readOnly(value: boolean) {
        if (this._readOnly === value) return;
        this._readOnly = value;

        this._onReadOnlyChange(value);
    }

    get readOnly(): boolean {
        if (this._ignoreParent) return this._readOnly as any;
        return this._readOnly || !!(this._parent && (this._parent as any).readOnly);
    }


    /**
     * 获取/设置元素是否处于错误状态。
     */
    set error(value: boolean) {
        if (this._hasError === value) return;
        this._hasError = value;
        if (value) {
            this.class.add(pcuiClass.ERROR);
        } else {
            this.class.remove(pcuiClass.ERROR);
        }
    }

    get error(): boolean {
        return this._hasError as any;
    }

    /**
     * 快捷键Element.dom.style。
     */
    get style(): CSSStyleDeclaration {
        return (this as any)._dom.style;
    }

    /**
     * 获取底层DOM元素的' DOMTokenList '。这实际上是' element.dom.classList '的快捷方式。
     */
    get class(): DOMTokenList {
        return (this as any)._dom.classList;
    }

    /**
     * 获取/设置元素的宽度，以像素为单位。也可以是空字符串来删除它。
     */
    set width(value: number) {
        let valueStr:string = '';
        if (typeof value === 'number') {
            valueStr = String(value) + 'px';
        }
        this.style.width = valueStr;
    }

    get width(): number {
        return (this._dom as any).clientWidth;
    }

    /**
     * 获取/设置元素的高度，以像素为单位。也可以是空字符串来删除它。
     */
    set height(value: number) {
        let valueStr:string = '';
        if (typeof value === 'number') {
            valueStr = String(value) + 'px';
        }
        this.style.height = valueStr;
    }

    get height(): number {
        return (this._dom as any).clientHeight;
    }


    /**
     * 获取/设置元素的tabIndex。
     */
    set tabIndex(value: number) {
        (this._dom as any).tabIndex = value;
    }

    get tabIndex(): number {
        return (this._dom as any).tabIndex;
    }

    /**
     * 获取/设置元素的Binding对象。
     */
    set binding(value: BindingBase) {
        if (this._binding === value) return;

        let prevObservers;
        let prevPaths;

        if (this._binding) {
            prevObservers = this._binding.observers;
            prevPaths = this._binding.paths;

            this.unlink();
            this._binding.element = undefined;
            this._binding = null;
        }

        this._binding = value;

        if (this._binding) {
            // @ts-ignore
            this._binding.element = this;
            if (prevObservers && prevPaths) {
                this.link(prevObservers, prevPaths);
            }
        }
    }

    get binding(): BindingBase {
        return this._binding as any;
    }

    get destroyed(): boolean {
        return this._destroyed;
    }

    // CSS proxy accessors

    /**
     * 获取/设置flex-direction CSS属性。
     */
    set flexDirection(value) {
        this.style.flexDirection = value;
    }

    get flexDirection() {
        return this.style.flexDirection;
    }

    /**
     * 获取/设置flex-grow CSS属性。
     */
    set flexGrow(value) {
        this.style.flexGrow = value;
    }

    get flexGrow() {
        return this.style.flexGrow;
    }

    /**
     * 获取/设置基于弹性的CSS属性。
     */
    set flexBasis(value) {
        this.style.flexBasis = value;
    }

    get flexBasis() {
        return this.style.flexBasis;
    }

    /**
     * 获取/设置flex-shrink CSS属性。
     */
    set flexShrink(value) {
        this.style.flexShrink = value;
    }

    get flexShrink() {
        return this.style.flexShrink;
    }

    /**
     *获取/设置flex-wrap CSS属性。
     */
    set flexWrap(value) {
        this.style.flexWrap = value;
    }

    get flexWrap() {
        return this.style.flexWrap;
    }

    /**
     * 获取/设置align-items CSS属性。
     */
    set alignItems(value) {
        this.style.alignItems = value;
    }

    get alignItems() {
        return this.style.alignItems;
    }

    /**
     * 获取/设置align-self CSS属性。
     */
    set alignSelf(value) {
        this.style.alignSelf = value;
    }

    get alignSelf() {
        return this.style.alignSelf;
    }

    /**
     * 获取/设置justify-content CSS属性。
     */
    set justifyContent(value) {
        this.style.justifyContent = value;
    }

    get justifyContent() {
        return this.style.justifyContent;
    }

    /**
     * 获取/设置justify-self CSS属性。
     */
    set justifySelf(value) {
        this.style.justifySelf = value;
    }

    get justifySelf() {
        return this.style.justifySelf;
    }

    /* 兼容性y */
    // 需要兼容后将其移除

    /** @ignore */
    set disabled(value: boolean) {
        this.enabled = !value;
    }

    /** @ignore */
    get disabled(): boolean {
        return !this.enabled;
    }

    /** @ignore */
    set element(value: HTMLElement) {
        this._dom = value;
    }

    /** @ignore */
    get element(): HTMLElement {
        return this.dom as any;
    }

    /** @ignore */
    set innerElement(value: HTMLElement) {
        this._domContent = value;
    }

    /** @ignore */
    get innerElement(): HTMLElement {
        return this._domContent as any;
    }
}

// 在引用所有者元素的基本Node接口上声明一个附加属性
declare global {
    interface Node { // eslint-disable-line no-unused-vars
        ui: Element;
    }
}

export default Element;
