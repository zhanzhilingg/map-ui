import * as pcuiClass from '../../class';
import Element from '../Element';
import Container, { ContainerArgs } from '../Container';
import Label from '../Label';
import Button from '../Button';
import { PREFIX } from '../../class';

const CLASS_PANEL = PREFIX + 'panel';
const CLASS_PANEL_HEADER = CLASS_PANEL + '-header';
const CLASS_PANEL_HEADER_TITLE = CLASS_PANEL_HEADER + '-title';
const CLASS_PANEL_CONTENT = CLASS_PANEL + '-content';
const CLASS_PANEL_HORIZONTAL = CLASS_PANEL + '-horizontal';
const CLASS_PANEL_SORTABLE_ICON = CLASS_PANEL + '-sortable-icon';
const CLASS_PANEL_REMOVE = CLASS_PANEL + '-remove';

/**
 * {@link Panel}构造函数的参数。
 */
export interface PanelArgs extends ContainerArgs {
    /**
     * 设置元素是否可折叠。
     */
    collapsible?: boolean,
    /**
     * 设置元素是否应该折叠。
     */
    collapsed?: boolean,
    /**
     * 设置面板是否可以重新排序。
     */
    sortable?: boolean,
    /**
     * 设置面板是否水平折叠-当它是侧面板的情况。默认为“false”。
     */
    collapseHorizontally?: boolean,
    /**
     * 设置是否可以移除面板。
     */
    removable?: boolean,
    /**
     * 标题的高度(以像素为单位)。默认为32。
     */
    headerSize?: number,
    /**
     * 面板的标题文本。默认为空字符串。
     */
    headerText?: string,
    /**
     * Sets the panel type.
     */
    panelType?: 'normal',
    /**
     * 用于内容容器的DOM元素。
     */
    content?: HTMLElement
    /**
     * 用于头容器的DOM元素。
     */
    header?: HTMLElement
}

/**
 * 面板是一个{@link Container}，
 * 它本身包含一个头部容器和一个内容容器。
 * 各自的容器函数使用内容容器工作。
 * 也可以在面板的页眉中添加元素。
 */
class Panel extends Container {
    /**
     * 面板坍塌时触发
     *
     * @event
     * @example
     * ```ts
     * const panel = new Panel();
     * panel.on('collapse', () => {
     *     console.log('Panel collapsed');
     * });
     * ```
     */
    public static readonly EVENT_COLLAPSE = 'collapse';

    /**
     * 面板膨胀时触发
     *
     * @event
     * @example
     * ```ts
     * const panel = new Panel();
     * panel.on('expand', () => {
     *     console.log('Panel expanded');
     * });
     * ```
     */
    public static readonly EVENT_EXPAND = 'expand';

    protected _suspendReflow: boolean;

    protected _reflowTimeout: number|null = null;

    protected _widthBeforeCollapse: string|null = null;

    protected _heightBeforeCollapse: string|null = null;

    protected _iconSort: Label|null = null;

    protected _btnRemove: Button|null = null;

    protected _containerContent: Container | undefined;

    protected _containerHeader: Container | undefined;

    protected _labelTitle: Label | undefined;

    protected _collapsible: boolean | undefined;

    protected _collapseHorizontally: boolean | undefined;

    protected _draggedChild: this | undefined;

    protected _collapsed: boolean | undefined;

    protected _sortable: boolean | undefined;

    protected _headerSize: number | undefined;

    protected _onDragEndEvt: (event: MouseEvent) => void;

    /**
     * 创建一个新的面板
     *
     * @param args - 扩展容器构造函数参数。所有可设置的属性也可以通过构造函数设置。
     */
    constructor(args: Readonly<PanelArgs> = {}) {
        super(args)
        const containerArgs = { ...args, flex: true };
        delete containerArgs.grid;
        delete containerArgs.flexDirection;
        delete containerArgs.scrollable;

        super(containerArgs);

        const that = this as any;

        this.class.add(CLASS_PANEL);

        if (args.panelType) {
            this.class.add(CLASS_PANEL + '-' + args.panelType);
        }

        
        // 在初始化时，不要在每次更新时调用reflow
        this._suspendReflow = true;

        // 初始化 header container
        this._initializeHeader(args);

        // 初始化 content container
        this._initializeContent(args);

        // header 尺寸
        this.headerSize = args.headerSize ?? 32;

        // collapse 相关变量
        this.collapsible = args.collapsible || false;
        this.collapsed = args.collapsed || false;
        this.collapseHorizontally = args.collapseHorizontally || false;

        this.sortable = args.sortable || false;
        this.removable = args.removable || !!args.onRemove || false;

        // 设置内容容器为content DOM元素。从现在开始，调用面板上的append函数将把元素附加到内容容器中。
        that.domContent = that._containerContent.dom;

        // 在所有字段初始化之后执行流
        this._suspendReflow = false;
        this._reflow();

        this._onDragEndEvt = this._onDragEnd.bind(this);
    }

    destroy() {
        if (this._destroyed) return;

        if (this._reflowTimeout) {
            cancelAnimationFrame(this._reflowTimeout);
            this._reflowTimeout = null;
        }

        window.removeEventListener('mouseup', this._onDragEndEvt);
        window.removeEventListener('mouseleave', this._onDragEndEvt);
        window.removeEventListener('mousemove', this._onDragMove);

        super.destroy();
    }

    protected _initializeHeader(args: PanelArgs) {
        // header container
        this._containerHeader = new Container({
            flex: true,
            flexDirection: 'row',
            class: [CLASS_PANEL_HEADER, pcuiClass.FONT_BOLD]
        });

        // header title
        this._labelTitle = new Label({
            text: args.headerText,
            class: [CLASS_PANEL_HEADER_TITLE, pcuiClass.FONT_BOLD]
        });
        this._containerHeader.append(this._labelTitle);

        const that = this as any;
        // 使用本机点击监听器，因为Element#click事件只有在元素被启用时才会触发。
        // 然而，我们仍然希望捕获标题单击事件，以便折叠它们
        that._containerHeader.dom.addEventListener('click', this._onHeaderClick);

        this.append(this._containerHeader);
    }

    protected _onHeaderClick = (evt: MouseEvent) => {
        const that = this as any;
        if (!this._collapsible) return;
        if (evt.target !== this.header.dom && evt.target !== that._labelTitle.dom) return;

        // toggle collapsed
        this.collapsed = !this.collapsed;
    };

    protected _onClickRemove(evt: MouseEvent) {
        evt.preventDefault();
        evt.stopPropagation();

        this.emit('click:remove');
    }

    protected _initializeContent(args: PanelArgs) {
        // containers container
        this._containerContent = new Container({
            class: CLASS_PANEL_CONTENT,
            grid: args.grid,
            flex: args.flex,
            flexDirection: args.flexDirection,
            scrollable: args.scrollable,
            dom: args.content
        });

        this.append(this._containerContent);
    }

    // 根据需要折叠或展开面板
    protected _reflow() {
        if (this._suspendReflow) {
            return;
        }

        if (this._reflowTimeout) {
            cancelAnimationFrame(this._reflowTimeout);
            this._reflowTimeout = null;
        }

        if (this.hidden || !this.collapsible) return;
        
        const that = this as any;

        if (this.collapsed && this.collapseHorizontally) {
            that._containerHeader.style.top = -that.headerSize + 'px';
        } else {
            that._containerHeader.style.top = '';
        }

        // 依赖于内容的宽度/高度，必须等待1帧才能得到最终的值
        this._reflowTimeout = requestAnimationFrame(() => {
            this._reflowTimeout = null;

            if (this.collapsed) {
                // 记住崩溃前的大小
                if (!this._widthBeforeCollapse) {
                    this._widthBeforeCollapse = this.style.width;
                }
                if (!this._heightBeforeCollapse) {
                    this._heightBeforeCollapse = this.style.height;
                }

                if (this._collapseHorizontally) {
                    that.height = '';
                    that.width = this.headerSize;
                } else {
                    that.height = this.headerSize;
                }

                // 在获取宽度和高度后添加折叠类，
                // 因为如果我们在此之前添加它，
                // 因为溢出:隐藏，我们可能会得到不准确的宽度/高度。
                this.class.add(pcuiClass.COLLAPSED);
            } else {
                // 首先移除折叠的类，然后恢复宽度和高度(与折叠的顺序相反)
                this.class.remove(pcuiClass.COLLAPSED);

                if (this._collapseHorizontally) {
                    that.height = '';
                    if (this._widthBeforeCollapse !== null) {
                        that.width = this._widthBeforeCollapse;
                    }
                } else {
                    if (this._heightBeforeCollapse !== null) {
                        that.height = this._heightBeforeCollapse;
                    }
                }

                // 在崩溃前重置
                this._widthBeforeCollapse = null;
                this._heightBeforeCollapse = null;
            }
        });
    }

    protected _onDragStart = (evt: MouseEvent) => {
        if (!this.enabled || this.readOnly) return;

        evt.stopPropagation();
        evt.preventDefault();

        window.addEventListener('mouseup', this._onDragEndEvt);
        window.addEventListener('mouseleave', this._onDragEndEvt);
        window.addEventListener('mousemove', this._onDragMove);

        this.emit('dragstart');
        // @ts-ignore accessing protected methods
        if (this.parent && this.parent._onChildDragStart) {
            // @ts-ignore accessing protected methods
            this.parent._onChildDragStart(evt, this);
        }
    };

    protected _onDragMove = (evt: MouseEvent) => {
        this.emit('dragmove');
        // @ts-ignore accessing protected methods
        if (this.parent && this.parent._onChildDragStart) {
            // @ts-ignore accessing protected methods
            this.parent._onChildDragMove(evt, this);
        }
    };

    protected _onDragEnd(evt: MouseEvent) {
        window.removeEventListener('mouseup', this._onDragEndEvt);
        window.removeEventListener('mouseleave', this._onDragEndEvt);
        window.removeEventListener('mousemove', this._onDragMove);

        if (this._draggedChild === this) {
            this._draggedChild = undefined;
        }

        this.emit('dragend');
        // @ts-ignore accessing protected methods
        if (this.parent && this.parent._onChildDragStart) {
            // @ts-ignore accessing protected methods
            this.parent._onChildDragEnd(evt, this);
        }
    }

    /**
     * 获取/设置元素是否可折叠。
     */
    set collapsible(value) {
        if (value === this._collapsible) return;

        this._collapsible = value;

        if (value) {
            this.class.add(pcuiClass.COLLAPSIBLE);
        } else {
            this.class.remove(pcuiClass.COLLAPSIBLE);
        }

        this._reflow();

        if (this.collapsed) {
            this.emit(value ? 'collapse' : 'expand');
        }

    }

    get collapsible() {
        return this._collapsible;
    }

    /**
     * 获取/设置元素是否应该折叠。
     */
    set collapsed(value) {
        if (this._collapsed === value) return;

        this._collapsed = value;

        this._reflow();

        if (this.collapsible) {
            this.emit(value ? 'collapse' : 'expand');
        }
    }

    get collapsed() {
        return this._collapsed;
    }

    /**
     * 获取/设置面板是否可以重新排序。
     */
    set sortable(value) {
        if (this._sortable === value) return;

        this._sortable = value;

        const that = this as any;

        if (value) {
            this._iconSort = new Label({
                class: CLASS_PANEL_SORTABLE_ICON
            });

            that._iconSort.dom.addEventListener('mousedown', this._onDragStart);

            this.header.prepend(this._iconSort);
        } else if (this._iconSort) {
            this._iconSort.destroy();
            this._iconSort = null;
        }
    }

    get sortable() {
        return this._sortable;
    }

    /**
     * 获取/设置是否可以删除面板
     */
    set removable(value) {
        if (this.removable === value) return;

        const that = this as any;
        if (value) {
            this._btnRemove = new Button({
                icon: 'E289',
                class: CLASS_PANEL_REMOVE
            });
            this._btnRemove.on('click', this._onClickRemove.bind(this));
            this.header.append(this._btnRemove);
        } else {
            that._btnRemove.destroy();
            this._btnRemove = null;
        }
    }

    get removable() {
        return !!this._btnRemove;
    }

    /**
     * 获取/设置面板是否水平折叠-这将是侧面板的情况。默认为“false”。
     */
    set collapseHorizontally(value) {
        if (this._collapseHorizontally === value) return;

        this._collapseHorizontally = value;
        if (value) {
            this.class.add(CLASS_PANEL_HORIZONTAL);
        } else {
            this.class.remove(CLASS_PANEL_HORIZONTAL);
        }

        this._reflow();
    }

    get collapseHorizontally() {
        return this._collapseHorizontally;
    }

    /**
     * 获取内容容器。
     */
    get content(): Container {
        return this._containerContent as any;
    }

    /**
     * 获取标头容器。
     */
    get header(): Container {
        return this._containerHeader as any;
    }

    /**
     * 面板的标题文本。默认为空字符串。
     */
    set headerText(value) {
        const that = this as any;
        that._labelTitle.text = value;
    }

    get headerText() {
        const that = this as any;
        return that._labelTitle.text;
    }

    /**
     * 标题的高度(以像素为单位)。默认为32。
     */
    set headerSize(value) {
        const that = this as any;
        this._headerSize = value;
        const style = that._containerHeader.dom.style;
        style.height = Math.max(0, value as any) + 'px';
        style.lineHeight = style.height;
        this._reflow();
    }

    get headerSize() {
        return this._headerSize;
    }
}

Element.register('panel', Panel);

export default Panel;
