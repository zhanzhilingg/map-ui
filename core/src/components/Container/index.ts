import Element, { ElementArgs, IFlexArgs, IParentArgs } from '../Element';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

const RESIZE_HANDLE_SIZE = 4;

const VALID_RESIZABLE_VALUES = [
    null,
    'top',
    'right',
    'bottom',
    'left'
];

const CLASS_RESIZING = pcuiClass.RESIZABLE + '-resizing';
const CLASS_RESIZABLE_HANDLE = PREFIX + 'resizable-handle';
const CLASS_CONTAINER = PREFIX + 'container';

const CLASS_DRAGGED = CLASS_CONTAINER + '-dragged';
const CLASS_DRAGGED_CHILD = CLASS_DRAGGED + '-child';

/**
 * {@link Container}构造函数的参数
 */
export interface ContainerArgs extends ElementArgs, IParentArgs, IFlexArgs {
    /**
     * 设置{@link Container}是否可调整大小以及调整大小句柄的位置。
     * 可以是'top'， 'bottom'， 'right'， 'left'中的一个。默认为' null '，禁用调整大小。
     */
    resizable?: string,
    /**
     * 设置{@link Container}在以像素为单位调整大小时可以接受的最小值。
     */
    resizeMin?: number,
    /**
     * 设置{@link Container}在以像素为单位调整大小时可以接受的最大值。
     */
    resizeMax?: number,
    /**
     * 当{@link Container}的大小被调整时调用。
     */
    onResize?: () => void,
    /**
     * 设置{@link Container}是否应该可滚动。
     */
    scrollable?: boolean,
    /**
     * 设置{@link Container}是否支持网格布局。
     */
    grid?: boolean,
    /**
     * 设置{@link Container}的align items属性。
     */
    alignItems?: string
}

/**
 * 容器是组合在一起的{@link Element}的基本构建块。
 * 容器可以包含任何其他元素，包括其他容器。
 */
class Container extends Element {
    /**
     * 当子元素被添加到容器中时触发。
     *
     * @event
     * @example
     * ```ts
     * const container = new Container();
     * container.on('append', (element: Element) => {
     *     console.log('Element added to container:', element);
     * });
     * ```
     */
    public static readonly EVENT_APPEND = 'append';

    /**
     * 当子元素从容器中移除时触发。
     *
     * @event
     * @example
     * ```ts
     * const container = new Container();
     * container.on('remove', (element: Element) => {
     *     console.log('Element removed from container:', element);
     * });
     * ```
     */
    public static readonly EVENT_REMOVE = 'remove';

    /**
     * 滚动容器时触发。本机DOM滚动事件被传递给事件处理程序。
     *
     * @event
     * @example
     * ```ts
     * const container = new Container();
     * container.on('scroll', (event: Event) => {
     *     console.log('Container scrolled:', event);
     * });
     * ```
     */
    public static readonly EVENT_SCROLL = 'scroll';

    /**
     * 当使用resize句柄调整容器大小时触发。
     *
     * @event
     * @example
     * ```ts
     * const container = new Container();
     * container.on('resize', () => {
     *     console.log('Container resized to:', container.width, container.height, 'px');
     * });
     * ```
     */
    public static readonly EVENT_RESIZE = 'resize';

    protected _scrollable = false;

    protected _flex = false;

    protected _grid = false;

    protected _domResizeHandle: HTMLDivElement|null = null;

    protected _resizeTouchId: number|null = null;

    protected _resizeData: { x: number, y: number, width: number, height: number }|null = null;

    protected _resizeHorizontally = true;

    protected _resizeMin = 100;

    protected _resizeMax = 300;

    protected _draggedStartIndex = -1;

    declare protected _domContent: HTMLElement|undefined;

    protected _resizable: string|undefined;

    constructor(args: Readonly<ContainerArgs> = {}) {
        super(args);

        this.class.add(CLASS_CONTAINER);

        (this.domContent as any) = this._dom;

        // scroll
        if (args.scrollable) {
            this.scrollable = true;
        }

        // flex
        this.flex = !!args.flex;

        // grid
        let grid = !!args.grid;
        if (grid) {
            if (this.flex) {
                console.error('Invalid Container arguments: "grid" and "flex" cannot both be true.');
                grid = false;
            }
        }
        this.grid = grid;

        // resize related
        (this.resizable as any) = args.resizable ?? null;

        if (args.resizeMin !== undefined) {
            this.resizeMin = args.resizeMin;
        }
        if (args.resizeMax !== undefined) {
            this.resizeMax = args.resizeMax;
        }
    }

    destroy() {
        if (this._destroyed) return;
        (this.domContent as any) = null;

        if (this._domResizeHandle) {
            this._domResizeHandle.removeEventListener('mousedown', this._onResizeStart);
            window.removeEventListener('mousemove', this._onResizeMove);
            window.removeEventListener('mouseup', this._onResizeEnd);

            this._domResizeHandle.removeEventListener('touchstart', this._onResizeTouchStart);
            window.removeEventListener('touchmove', this._onResizeTouchMove);
            window.removeEventListener('touchend', this._onResizeTouchEnd);
        }

        super.destroy();
    }

    /**
     * 向容器追加一个元素
     *
     * @param {Element} element - 要追加的元素
     * @fires 'append'
     */
    append(element: any) {
        const dom = this._getDomFromElement(element);
        (this._domContent as any).appendChild(dom);
        this._onAppendChild(element);
    }

    /**
     * 在指定的引用元素之前向容器追加一个元素
     *
     * @param {Element} element - 要追加的元素
     * @param {Element} referenceElement - 将在其前面添加元素的元素
     * @fires 'append'
     */
    appendBefore(element: any, referenceElement: any) {
        const dom = this._getDomFromElement(element);
        (this._domContent as any).appendChild(dom);
        const referenceDom =  referenceElement && this._getDomFromElement(referenceElement);

        (this._domContent as any).insertBefore(dom, referenceDom);

        this._onAppendChild(element);
    }

    /**
     * 在容器的指定引用元素后面追加一个元素
     *
     * @param {Element} element - 要追加的元素
     * @param {Element} referenceElement - 将在其后面附加元素的元素
     * @fires 'append'
     */
    appendAfter(element: any, referenceElement: any) {
        const dom = this._getDomFromElement(element);
        const referenceDom = referenceElement && this._getDomFromElement(referenceElement);

        const elementBefore = referenceDom ? referenceDom.nextSibling : null;
        if (elementBefore) {
            (this._domContent as any).insertBefore(dom, elementBefore);
        } else {
            (this._domContent as any).appendChild(dom);
        }

        this._onAppendChild(element);
    }

    /**
     * 在容器的开头插入一个元素
     *
     * @param {Element} element - 要添加的元素
     * @fires 'append'
     */
    prepend(element: any) {
        const dom = this._getDomFromElement(element);
        const first = (this._domContent as any).firstChild;
        if (first) {
            (this._domContent as any).insertBefore(dom, first);
        } else {
            (this._domContent as any).appendChild(dom);
        }

        this._onAppendChild(element);
    }

    /**
     * 从容器中移除指定的子元素
     *
     * @param element - 要删除的元素
     * @fires 'remove'
     */
    remove(element: Element) {
        if (element.parent !== this) return;

        const dom = this._getDomFromElement(element);
        (this._domContent as any).removeChild(dom);

        this._onRemoveChild(element);
    }

    /**
     * 在指定的索引位置移动指定的子节点
     *
     * @param element - 要移动的元素
     * @param index - 将元素移动到的索引
     */
    move(element: Element, index: number) {
        let idx = -1;
        const dom = this.dom as any;
        for (let i = 0; i < dom.childNodes.length; i++) {
            if (dom.childNodes[i].ui === element) {
                idx = i;
                break;
            }
        }

        if (idx === -1) {
            this.appendBefore(element, dom.childNodes[index]);
        } else if (index !== idx) {
            this.remove(element);
            if (index < idx) {
                this.appendBefore(element, dom.childNodes[index]);
            } else {
                this.appendAfter(element, dom.childNodes[index - 1]);
            }
        }
    }

    /**
     * 清除容器中的所有子容器
     *
     * 为每个子元素触发'remove'。
     */
    clear() {
        const dom = this.dom as any;
        const _domContent = this._domContent as any;
        let i = _domContent.childNodes.length;
        while (i--) {
            const node = _domContent.childNodes[i];
            if (node.ui && node.ui !== this) {
                node.ui.destroy();
            }
        }

        if (this._domResizeHandle) {
            this._domResizeHandle.removeEventListener('mousedown', this._onResizeStart);
            this._domResizeHandle.removeEventListener('touchstart', this._onResizeTouchStart);
            this._domResizeHandle = null;
        }

        _domContent.innerHTML = '';

        if (this.resizable) {
            this._createResizeHandle();
            dom.appendChild(this._domResizeHandle);
        }
    }

    // 用于与遗留ui框架的向后兼容性
    protected _getDomFromElement(element: any) {
        if (element.dom) {
            return element.dom;
        }

        if (element.element) {
            // console.log('Legacy ui.Element passed to Container', this.class, element.class);
            return element.element;
        }

        return element;
    }

    protected _onAppendChild(element: Element) {
        element.parent = this;
        this.emit('append', element);
    }

    protected _onRemoveChild(element: Element) {
        (element.parent as any) = null;
        this.emit('remove', element);
    }

    protected _onScroll = (evt: Event) => {
        this.emit('scroll', evt);
    };

    protected _createResizeHandle() {
        const handle = document.createElement('div');
        handle.classList.add(CLASS_RESIZABLE_HANDLE);
        handle.ui = this;

        handle.addEventListener('mousedown', this._onResizeStart);
        handle.addEventListener('touchstart', this._onResizeTouchStart, { passive: false });

        this._domResizeHandle = handle;
    }

    protected _onResizeStart = (evt: MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        window.addEventListener('mousemove', this._onResizeMove);
        window.addEventListener('mouseup', this._onResizeEnd);

        this._resizeStart();
    };

    protected _onResizeMove = (evt: MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        this._resizeMove(evt.clientX, evt.clientY);
    };

    protected _onResizeEnd = (evt: MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        window.removeEventListener('mousemove', this._onResizeMove);
        window.removeEventListener('mouseup', this._onResizeEnd);

        this._resizeEnd();
    };

    protected _onResizeTouchStart = (evt: TouchEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        for (let i = 0; i < evt.changedTouches.length; i++) {
            const touch = evt.changedTouches[i];
            if (touch.target === this._domResizeHandle) {
                this._resizeTouchId = touch.identifier;
            }
        }

        window.addEventListener('touchmove', this._onResizeTouchMove);
        window.addEventListener('touchend', this._onResizeTouchEnd);

        this._resizeStart();
    };

    protected _onResizeTouchMove = (evt: TouchEvent) => {
        for (let i = 0; i < evt.changedTouches.length; i++) {
            const touch = evt.changedTouches[i];
            if (touch.identifier !== this._resizeTouchId) {
                continue;
            }

            evt.stopPropagation();
            evt.preventDefault();

            this._resizeMove(touch.clientX, touch.clientY);

            break;
        }
    };

    protected _onResizeTouchEnd = (evt: TouchEvent) => {
        for (let i = 0; i < evt.changedTouches.length; i++) {
            const touch = evt.changedTouches[i];
            if (touch.identifier === this._resizeTouchId) {
                continue;
            }

            this._resizeTouchId = null;

            evt.preventDefault();
            evt.stopPropagation();

            window.removeEventListener('touchmove', this._onResizeTouchMove);
            window.removeEventListener('touchend', this._onResizeTouchEnd);

            this._resizeEnd();

            break;
        }
    };

    protected _resizeStart() {
        this.class.add(CLASS_RESIZING);
    }

    protected _resizeMove(x: number, y: number) {
        // 如果我们还没有初始化resizeData，现在就初始化
        if (!this._resizeData) {
            this._resizeData = {
                x: x,
                y: y,
                width: (this.dom as any).clientWidth,
                height: (this.dom as any).clientHeight
            };

            return;
        }

        if (this._resizeHorizontally) {
            // 水平调整
            let offsetX = this._resizeData.x - x;

            if (this._resizable === 'right') {
                offsetX = -offsetX;
            }

            this.width = RESIZE_HANDLE_SIZE + Math.max(this._resizeMin, Math.min(this._resizeMax, (this._resizeData.width + offsetX)));
        } else {
            // 垂直调整
            let offsetY = this._resizeData.y - y;

            if (this._resizable === 'bottom') {
                offsetY = -offsetY;
            }

            this.height = Math.max(this._resizeMin, Math.min(this._resizeMax, (this._resizeData.height + offsetY)));
        }

        this.emit('resize');
    }

    protected _resizeEnd() {
        this._resizeData = null;
        this.class.remove(CLASS_RESIZING);
    }

    /**
     * 调整容器的大小
     *
     * @param x - 要调整宽度大小的像素数
     * @param y - 调整高度大小的像素数
     */
    resize(x: number, y: number) {
        x = x || 0;
        y = y || 0;

        this._resizeStart();
        this._resizeMove(0, 0);
        this._resizeMove(-x + RESIZE_HANDLE_SIZE, -y);
        this._resizeEnd();
    }

    protected _getDraggedChildIndex(draggedChild: Element) {
        const dom = this.dom as any;
        for (let i = 0; i < dom.childNodes.length; i++) {
            if (dom.childNodes[i].ui  === draggedChild) {
                return i;
            }
        }

        return -1;
    }

    protected _onChildDragStart(evt: MouseEvent, childPanel: Element) {
        this.class.add(CLASS_DRAGGED_CHILD);

        this._draggedStartIndex = this._getDraggedChildIndex(childPanel);

        childPanel.class.add(CLASS_DRAGGED);

        this.emit('child:dragstart', childPanel, this._draggedStartIndex, evt);
    }

    protected _onChildDragMove(evt: MouseEvent, childPanel: Element) {
        const dom = this.dom as any;
        const rect = dom.getBoundingClientRect();

        const dragOut = (evt.clientX < rect.left || evt.clientX > rect.right || evt.clientY < rect.top || evt.clientY > rect.bottom);

        const childPanelIndex = this._getDraggedChildIndex(childPanel);

        if (dragOut) {
            childPanel.class.remove(CLASS_DRAGGED);
            if (this._draggedStartIndex !== childPanelIndex) {
                this.remove(childPanel);
                if (this._draggedStartIndex < childPanelIndex) {
                    this.appendBefore(childPanel, dom.childNodes[this._draggedStartIndex]);
                } else {
                    this.appendAfter(childPanel, dom.childNodes[this._draggedStartIndex - 1]);
                }
            }

            return;
        }

        childPanel.class.add(CLASS_DRAGGED);

        const y = evt.clientY - rect.top;
        let ind = null;

        // hovered script
        for (let i = 0; i < dom.childNodes.length; i++) {
            const otherPanel = dom.childNodes[i].ui as any;
            const otherTop = otherPanel.dom.offsetTop;
            if (i < childPanelIndex) {
                if (y <= otherTop + otherPanel.header.height) {
                    ind = i;
                    break;
                }
            } else if (i > childPanelIndex) {
                const h = childPanel.height as any;
                if (y +  h>= otherTop + otherPanel.height) {
                    ind = i;
                    break;
                }
            }
        }

        if (ind !== null && childPanelIndex !== ind) {
            this.remove(childPanel);
            if (ind < childPanelIndex) {
                this.appendBefore(childPanel, dom.childNodes[ind]);
            } else {
                this.appendAfter(childPanel, dom.childNodes[ind - 1]);
            }
        }
    }

    protected _onChildDragEnd(evt: MouseEvent, childPanel: Element) {
        this.class.remove(CLASS_DRAGGED_CHILD);

        childPanel.class.remove(CLASS_DRAGGED);

        const index = this._getDraggedChildIndex(childPanel);

        this.emit('child:dragend', childPanel, index, this._draggedStartIndex, evt);

        this._draggedStartIndex = -1;
    }

    /**
     * 使用提供的函数遍历每个子元素。要提前退出迭代，从函数返回' false '。
     *
     * @param fn - 为每个子元素调用的函数
     */
    forEachChild(fn: (child: Element, index: number) => void | false) {
        const dom = this.dom as any;
        for (let i = 0; i < dom.childNodes.length; i++) {
            const node = dom.childNodes[i].ui;
            if (node) {
                const result = fn(node, i);
                if (result === false) {
                    // early out
                    break;
                }
            }
        }
    }

    /**
     * 如果当前节点包含根节点，递归地将其子节点附加到该节点并返回。否则返回当前节点。还要将每个子元素添加到父元素的键名下。
     *
     * @param node -dom结构中的当前元素，必须递归遍历并附加到其父元素
     * @param node.root - dom结构的根节点
     * @param node.children - 根节点的子节点
     * @returns 递归追加的元素节点
     *
     */
    protected _buildDomNode(node: { [x: string]: any; root?: any; children?: any; }): Container {
        const keys = Object.keys(node);
        let rootNode: Container;
        if (keys.includes('root')) {
            rootNode = this._buildDomNode(node.root);
            node.children.forEach((childNode: any) => {
                const childNodeElement = this._buildDomNode(childNode);
                if (childNodeElement !== null) {
                    rootNode.append(childNodeElement);
                }
            });
        } else {
            rootNode = node[keys[0]];
            // @ts-ignore
            this[`_${keys[0]}`] = rootNode;
        }
        return rootNode;
    }

    /**
     * 接受一个mapui元素数组，
     * 每个元素都可以包含自己的子元素，
     * 并将它们附加到该容器中。
     * 使用_buildDomNode递归地遍历这些子元素
     *
     * @param dom - 附加到此容器的子元素数组
     *
     * @example
     * buildDom([
     *     {
     *         child1: pcui.Label()
     *     },
     *     {
     *         root: {
     *             container1: pcui.Container()
     *         },
     *         children: [
     *             {
     *                 child2: pcui.Label()
     *             },
     *             {
     *                 child3: pcui.Label()
     *             }
     *         ]
     *     }
     * ]);
     */
    buildDom(dom: any[]) {
        dom.forEach((node: any) => {
            const builtNode = this._buildDomNode(node);
            this.append(builtNode);
        });
    }

    /**
     * 获取/设置元素是否支持伸缩布局
     */
    set flex(value: boolean) {
        if (value === this._flex) return;

        this._flex = value;

        if (value) {
            this.class.add(pcuiClass.FLEX);
        } else {
            this.class.remove(pcuiClass.FLEX);
        }
    }

    get flex(): boolean {
        return this._flex;
    }

    /**
     * 获取/设置元素是否支持网格布局
     */
    set grid(value: boolean) {
        if (value === this._grid) return;

        this._grid = value;

        if (value) {
            this.class.add(pcuiClass.GRID);
        } else {
            this.class.remove(pcuiClass.GRID);
        }
    }

    get grid(): boolean {
        return this._grid;
    }

    /**
     * 获取/设置元素是否应该可滚动
     */
    set scrollable(value: boolean) {
        if (this._scrollable === value) return;

        this._scrollable = value;

        if (value) {
            this.class.add(pcuiClass.SCROLLABLE);
        } else {
            this.class.remove(pcuiClass.SCROLLABLE);
        }

    }

    get scrollable(): boolean {
        return this._scrollable;
    }

    /**
     * 获取/设置元素是否可调整大小以及调整大小句柄的位置。
     * 可以是'top'， 'bottom'， 'right'， 'left'中的一个。设置为空以禁用调整大小。
     */
    set resizable(value: string) {

        if (value === this._resizable) return;

        if (VALID_RESIZABLE_VALUES.indexOf(value) === -1) {
            console.error('Invalid resizable value: must be one of ' + VALID_RESIZABLE_VALUES.join(','));
            return;
        }

        // remove old class
        if (this._resizable) {
            this.class.remove(`${pcuiClass.RESIZABLE}-${this._resizable}`);
        }

        this._resizable = value;
        this._resizeHorizontally = (value === 'right' || value === 'left');

        if (value) {
            // add resize class and create / append resize handle
            this.class.add(pcuiClass.RESIZABLE);
            this.class.add(`${pcuiClass.RESIZABLE}-${value}`);

            if (!this._domResizeHandle) {
                this._createResizeHandle();
            }
            (this._dom as any).appendChild(this._domResizeHandle);
        } else {
            // remove resize class and resize handle
            this.class.remove(pcuiClass.RESIZABLE);
            if (this._domResizeHandle) {
                (this._dom as any).removeChild(this._domResizeHandle);
            }
        }
    }

    get resizable(): string {
        return this._resizable as any;
    }

    /**
     *获取/设置元素在以像素为单位调整大小时可以接受的最小值
     */
    set resizeMin(value: number) {
        this._resizeMin = Math.max(0, Math.min(value, this._resizeMax));
    }

    get resizeMin(): number {
        return this._resizeMin;
    }

    /**
     * 获取/设置元素在以像素为单位调整大小时可以接受的最大值
     */
    set resizeMax(value: number) {
        this._resizeMax = Math.max(this._resizeMin, value);
    }

    get resizeMax(): number {
        return this._resizeMax;
    }

    /**
     * 用作所有子元素的容器的内部DOM元素
     * 可以被派生类覆盖
     */
    set domContent(value: HTMLElement) {
        if (this._domContent === value) return;

        if (this._domContent) {
            this._domContent.removeEventListener('scroll', this._onScroll);
        }

        this._domContent = value;

        if (this._domContent) {
            this._domContent.addEventListener('scroll', this._onScroll);
        }
    }

    get domContent(): HTMLElement {
        return this._domContent as any;
    }
}

Element.register('container', Container);

export default Container;
