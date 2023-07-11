import Element from '../Element';
import Label from '../Label';
import Container, { ContainerArgs } from '../Container';
import TextInput from '../TextInput';
import * as pcuiClass from '../../class';
import { PREFIX } from '../../class';

const CLASS_ROOT = PREFIX + 'treeview-item';
const CLASS_ICON = CLASS_ROOT + '-icon';
const CLASS_TEXT = CLASS_ROOT + '-text';
const CLASS_SELECTED = CLASS_ROOT + '-selected';
const CLASS_OPEN = CLASS_ROOT + '-open';
const CLASS_CONTENTS = CLASS_ROOT + '-contents';
const CLASS_EMPTY = CLASS_ROOT + '-empty';
const CLASS_RENAME = CLASS_ROOT + '-rename';

/**
 * {@link TreeViewItem}构造函数的参数。
 */
export interface TreeViewItemArgs extends ContainerArgs {
    /**
     * 项目是否被选中。
     */
    selected?: boolean;
    /**
     * 是否可以选择项目。默认为“true”。
     */
    allowSelect?: boolean,
    /**
     * open，是否显示其子节点。
     */
    open?: boolean,
    /**
     * 是否可以拖动这个{@link TreeViewItem}。
     * 只有当父{@link TreeView}的' allowDrag '设置为' true '时才会启用。
     * 默认为“true”。
     */
    allowDrag?: boolean,
    /**
     * 是否允许删除{@link TreeViewItem}。默认为“true”。
     */
    allowDrop?: boolean,
    /**
     * {@link TreeViewItem}显示的文本。
     */
    text?: string,
    /**
     * 在{@link TreeViewItem}文本之前显示的图标。默认为'E360'。
     */
    icon?: string,
    /**
     * 一个方法，当{@link TreeViewItem}被选中时调用。
     */
    onSelect?: (deselect: () => void) => void,
    /**
     * 一个方法，当{@link TreeViewItem}被取消选中时调用。
     */
    onDeselect?: () => void
}

/**
 * TreeViewItem是层次化{@link TreeView}控件中的单个节点。
 */
class TreeViewItem extends Container {
    /**
     * 当用户选择TreeViewItem时触发。
     *
     * @event
     * @example
     * ```ts
     * treeViewItem.on('select', (item: TreeViewItem) => {
     *     console.log('TreeViewItem selected', item);
     * });
     * ```
     */
    public static readonly EVENT_SELECT = 'select';

    /**
     * 当用户取消选择TreeViewItem时触发。
     *
     * @event
     * @example
     * ```ts
     * treeViewItem.on('deselect', (item: TreeViewItem) => {
     *     console.log('TreeViewItem deselected', item);
     * });
     * ```
     */
    public static readonly EVENT_DESELECT = 'deselect';

    /**
     * 当用户打开TreeViewItem时触发。
     *
     * @event
     * @example
     * ```ts
     * treeViewItem.on('open', (item: TreeViewItem) => {
     *     console.log('TreeViewItem opened', item);
     * });
     * ```
     */
    public static readonly EVENT_OPEN = 'open';

    /**
     * 当用户关闭TreeViewItem时触发。
     *
     * @event
     * @example
     * ```ts
     * treeViewItem.on('close', (item: TreeViewItem) => {
     *     console.log('TreeViewItem closed', item);
     * });
     * ```
     */
    public static readonly EVENT_CLOSE = 'close';

    protected _containerContents: Container;

    protected _labelIcon: Label;

    protected _labelText: Label;

    protected _numChildren = 0;

    protected _treeView: any;
    // @ts-ignore
    protected _allowDrag: boolean;
    // @ts-ignore
    protected _allowDrop: boolean;
    // @ts-ignore
    protected _allowSelect: boolean;
    // @ts-ignore
    protected _icon: string;

    /**
     * 创建一个新的TreeViewItem。
     *
     * @param args - 参数
     */
    constructor(args: Readonly<TreeViewItemArgs> = {}) {
        super(args);

        this.class.add(CLASS_ROOT, CLASS_EMPTY);

        this._containerContents = new Container({
            class: CLASS_CONTENTS,
            flex: true,
            flexDirection: 'row',
            tabIndex: 0
        });
        this.append(this._containerContents);
        // @ts-ignore
        this._containerContents.dom.draggable = true;

        this._labelIcon = new Label({
            class: CLASS_ICON
        });
        this._containerContents.append(this._labelIcon);

        this.icon = args.icon ?? 'E360';

        this._labelText = new Label({
            class: CLASS_TEXT
        });
        this._containerContents.append(this._labelText);

        this.allowSelect = args.allowSelect ?? true;
        this.allowDrop = args.allowDrop ?? true;
        this.allowDrag = args.allowDrag ?? true;

        if (args.text) {
            this.text = args.text;
        }

        if (args.selected) {
            this.selected = args.selected;
        }

        const dom = this._containerContents.dom as any;
        dom.addEventListener('focus', this._onContentFocus);
        dom.addEventListener('blur', this._onContentBlur);
        dom.addEventListener('keydown', this._onContentKeyDown);
        dom.addEventListener('dragstart', this._onContentDragStart);
        dom.addEventListener('mousedown', this._onContentMouseDown);
        dom.addEventListener('mouseover', this._onContentMouseOver);
        dom.addEventListener('click', this._onContentClick);
        dom.addEventListener('dblclick', this._onContentDblClick);
        dom.addEventListener('contextmenu', this._onContentContextMenu);
    }

    destroy() {
        if (this._destroyed) return;

        const dom = this._containerContents.dom as any;
        dom.removeEventListener('focus', this._onContentFocus);
        dom.removeEventListener('blur', this._onContentBlur);
        dom.removeEventListener('keydown', this._onContentKeyDown);
        dom.removeEventListener('dragstart', this._onContentDragStart);
        dom.removeEventListener('mousedown', this._onContentMouseDown);
        dom.removeEventListener('mouseover', this._onContentMouseOver);
        dom.removeEventListener('click', this._onContentClick);
        dom.removeEventListener('dblclick', this._onContentDblClick);
        dom.removeEventListener('contextmenu', this._onContentContextMenu);

        window.removeEventListener('mouseup', this._onContentMouseUp);

        super.destroy();
    }

    protected _onAppendChild(element: Element) {
        super._onAppendChild(element);

        if (element instanceof TreeViewItem) {
            this._numChildren++;
            if (this._parent !== this._treeView) {
                this.class.remove(CLASS_EMPTY);
            }

            if (this._treeView) {
                this._treeView._onAppendTreeViewItem(element);
            }
        }
    }

    protected _onRemoveChild(element: Element) {
        if (element instanceof TreeViewItem) {
            this._numChildren--;
            if (this._numChildren === 0) {
                this.class.add(CLASS_EMPTY);
            }

            if (this._treeView) {
                this._treeView._onRemoveTreeViewItem(element);
            }
        }

        super._onRemoveChild(element);
    }

    protected _onContentKeyDown = (evt: KeyboardEvent) => {
        const element = evt.target as HTMLElement;
        if (element.tagName === 'INPUT') return;

        if (!this.allowSelect) return;

        if (this._treeView) {
            this._treeView._onChildKeyDown(evt, this);
        }
    };

    protected _onContentMouseDown = (evt: MouseEvent) => {
        if (!this._treeView || !this._treeView.allowDrag || !this._allowDrag) return;

        this._treeView._updateModifierKeys(evt);
        evt.stopPropagation();
    };

    protected _onContentMouseUp = (evt: MouseEvent) => {
        evt.stopPropagation();
        evt.preventDefault();

        window.removeEventListener('mouseup', this._onContentMouseUp);
        if (this._treeView) {
            this._treeView._onChildDragEnd(evt, this);
        }
    };

    protected _onContentMouseOver = (evt: MouseEvent) => {
        evt.stopPropagation();

        if (this._treeView) {
            this._treeView._onChildDragOver(evt, this);
        }

        this.emit('hover', evt);
    };

    protected _onContentDragStart = (evt: DragEvent) => {
        evt.stopPropagation();
        evt.preventDefault();

        if (!this._treeView || !this._treeView.allowDrag) return;

        if (this.class.contains(CLASS_RENAME)) return;

        this._treeView._onChildDragStart(evt, this);

        window.addEventListener('mouseup', this._onContentMouseUp);
    };

    protected _onContentClick = (evt: MouseEvent) => {
        if (!this.allowSelect || evt.button !== 0) return;

        const element = evt.target as HTMLElement;
        if (element.tagName === 'INPUT') return;

        evt.stopPropagation();
        // @ts-ignore
        const rect = this._containerContents.dom.getBoundingClientRect();
        if (this._numChildren > 0 && evt.clientX - rect.left < 0) {
            this.open = !this.open;
            if (evt.altKey) {
                // 也适用于所有的子节点
                this._dfs((item: TreeViewItem) => {
                    item.open = this.open;
                });
            }
            this.focus();
        } else if (this._treeView) {
            this._treeView._onChildClick(evt, this);
        }
    };

    protected _dfs(fn: (item: TreeViewItem) => void) {
        fn(this);
        let child = this.firstChild;
        while (child) {
            child._dfs(fn);
            child = child.nextSibling;
        }
    }

    protected _onContentDblClick = (evt: MouseEvent) => {
        if (!this._treeView || !this._treeView.allowRenaming || evt.button !== 0) return;

        const element = evt.target as HTMLElement;
        if (element.tagName === 'INPUT') return;

        evt.stopPropagation();
        // @ts-ignore
        const rect = this._containerContents.dom.getBoundingClientRect();
        if (this.numChildren && evt.clientX - rect.left < 0) {
            return;
        }

        if (this.allowSelect) {
            this._treeView.deselect();
            this._treeView._onChildClick(evt, this);
        }

        this.rename();
    };

    protected _onContentContextMenu = (evt: MouseEvent) => {
        if (this._treeView && this._treeView._onContextMenu) {
            this._treeView._onContextMenu(evt, this);
        }
    };

    // @ts-ignore
    protected _onContentFocus = (evt: FocusEvent) => {
        this.emit('focus');
    };

    // @ts-ignore
    protected _onContentBlur = (evt: FocusEvent) => {
        this.emit('blur');
    };

    rename() {
        this.class.add(CLASS_RENAME);

        // 显示文本输入以输入新文本
        const textInput = new TextInput({
            renderChanges: false,
            value: this.text,
            class: pcuiClass.FONT_REGULAR
        });

        textInput.on('blur', () => {
            textInput.destroy();
        });

        textInput.on('destroy', () => {
            this.class.remove(CLASS_RENAME);
            this.focus();
        });

        textInput.on('change', (value: string) => {
            value = value.trim();
            if (value) {
                this.text = value;
                textInput.destroy();
            }
        });

        textInput.on('disable', () => {
            // 确保文本输入是可编辑的，即使该树项被禁用
            textInput.input.removeAttribute('readonly');
        });

        this._containerContents.append(textInput);

        textInput.focus(true);
    }

    focus() {
        // @ts-ignore
        this._containerContents.dom.focus();
    }

    blur() {
        // @ts-ignore
        this._containerContents.dom.blur();
    }

    /**
     * 项目是否被选中
     */
    set selected(value) {
        if (value === this.selected) {
            if (value) {
                this.focus();
            }

            return;
        }

        if (value) {
            this._containerContents.class.add(CLASS_SELECTED);
            this.emit('select', this);
            if (this._treeView) {
                this._treeView._onChildSelected(this);
            }

            this.focus();
        } else {
            this._containerContents.class.remove(CLASS_SELECTED);
            this.blur();
            this.emit('deselect', this);
            if (this._treeView) {
                this._treeView._onChildDeselected(this);
            }
        }
    }

    get selected() {
        return this._containerContents.class.contains(CLASS_SELECTED);
    }

    /**
     * 由TreeViewItem显示的文本。
     */
    set text(value) {
        if (this._labelText.value !== value) {
            this._labelText.value = value;
            if (this._treeView) {
                this._treeView._onChildRename(this, value);
            }
        }
    }

    get text() {
        return this._labelText.value;
    }

    /**
     * 获取显示文本的内部标签。
     */
    get textLabel() {
        return this._labelText;
    }

    /**
     * 获取显示图标的内部标签。
     */
    get iconLabel() {
        return this._labelIcon;
    }

    /**
     * 是否显示自己子节点
     */
    set open(value) {
        if (this.open === value) return;
        if (value) {
            if (!this.numChildren) return;

            this.class.add(CLASS_OPEN);
            this.emit('open', this);
        } else {
            this.class.remove(CLASS_OPEN);
            this.emit('close', this);
        }
    }

    get open() {
        return this.class.contains(CLASS_OPEN) || this.parent === this._treeView;
    }

    /**
     * 该项的父项是打开还是关闭。
     */
    set parentsOpen(value) {
        let parent = this.parent;
        while (parent && parent instanceof TreeViewItem) {
            parent.open = value;
            parent = parent.parent;
        }
    }

    get parentsOpen() {
        let parent = this.parent;
        while (parent && parent instanceof TreeViewItem) {
            if (!parent.open) return false;
            parent = parent.parent;
        }

        return true;
    }

    /**
     * 是否允许在树项目上删除。
     */
    set allowDrop(value) {
        this._allowDrop = value;
    }

    get allowDrop() {
        return this._allowDrop;
    }

    /**
     *是否可以拖动此树项。只有当父树视图的allowDrag为true时才会生效。
     */
    set allowDrag(value) {
        this._allowDrag = value;
    }

    get allowDrag() {
        return this._allowDrag;
    }

    /**
     * 是否可以选择项目。
     */
    set allowSelect(value) {
        this._allowSelect = value;
    }

    get allowSelect() {
        return this._allowSelect;
    }

    /**
     * 获取/设置父TreeView。
     */
    set treeView(value) {
        this._treeView = value;
    }

    get treeView() {
        return this._treeView;
    }

    /**
     * 直系子节点的数量。
     */
    get numChildren() {
        return this._numChildren;
    }

    /**
     * 获取第一个子项。
     */
    // @ts-ignore
    get firstChild() {
        if (this._numChildren) {
            // @ts-ignore
            for (const child of this.dom.childNodes) {
                if (child.ui instanceof TreeViewItem) {
                    return child.ui as TreeViewItem;
                }
            }
        }

        return null;
    }

    /**
     * 获取最后一个子项。
     */
    // @ts-ignore
    get lastChild() {
        if (this._numChildren) {
            // @ts-ignore
            for (let i = this.dom.childNodes.length - 1; i >= 0; i--) {
                // @ts-ignore
                if (this.dom.childNodes[i].ui instanceof TreeViewItem) {
                    // @ts-ignore
                    return this.dom.childNodes[i].ui as TreeViewItem;
                }
            }
        }

        return null;
    }

    /**
     * 获取第一个兄弟项。
     */
    get nextSibling() {
        // @ts-ignore
        let sibling = this.dom.nextSibling;
        while (sibling && !(sibling.ui instanceof TreeViewItem)) {
            sibling = sibling.nextSibling;
        }

        return sibling && sibling.ui as TreeViewItem;
    }

    /**
     * 获取最后一个兄弟项。
     */
    get previousSibling() {
        // @ts-ignore
        let sibling = this.dom.previousSibling;
        while (sibling && !(sibling.ui instanceof TreeViewItem)) {
            sibling = sibling.previousSibling;
        }

        return sibling && sibling.ui as TreeViewItem;
    }

    /**
     * 在TreeViewItem文本之前显示的图标。
     */
    set icon(value) {
        if (this._icon === value || !value.match(/^E[0-9]{0,4}$/)) return;
        this._icon = value;
        if (value) {
            // @ts-ignore
            // 设置data-icon属性，但首先将值转换为代码点
            this._labelIcon.dom.setAttribute('data-icon', String.fromCodePoint(parseInt(value, 16)));
        } else {
            // @ts-ignore
            this._labelIcon.dom.removeAttribute('data-icon');
        }
    }

    get icon() {
        return this._icon;
    }
}

export default TreeViewItem;
