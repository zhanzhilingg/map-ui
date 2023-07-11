import Container, { ContainerArgs } from '../Container';
import Element from '../Element';
import TreeViewItem from '../TreeViewItem';
import { searchItems } from '../../helpers/search';
import { PREFIX } from '../../class';

const CLASS_ROOT = PREFIX + 'treeview';
const CLASS_DRAGGED_ITEM = CLASS_ROOT + '-item-dragged';
const CLASS_DRAGGED_HANDLE = CLASS_ROOT + '-drag-handle';
const CLASS_FILTERING = CLASS_ROOT + '-filtering';
const CLASS_FILTER_RESULT = CLASS_FILTERING + '-result';

const DRAG_AREA_INSIDE = 'inside';
const DRAG_AREA_BEFORE = 'before';
const DRAG_AREA_AFTER = 'after';

/**
 * {@link TreeView}构造函数的参数。
 */
export interface TreeViewArgs extends ContainerArgs {
    /**
     * 是否允许拖动{@link TreeViewItem}。默认为“true”。
     */
    allowDrag?: boolean,
    /**
     * 是否允许重新排序{@link TreeViewItem}s。默认为“true”。
     */
    allowReordering?: boolean,
    /**
     * 是否允许通过双击来重命名{@link TreeViewItem}s。默认为“false”。
     */
    allowRenaming?: boolean,
    /**
     * 搜索{@link TreeViewItem}s并仅显示与筛选器相关的筛选器。
     */
    filter?: string,
    /**
     * 当我们右键单击{@link TreeViewItem}时要调用的函数。
     */
    onContextMenu?: (evt: MouseEvent, item: TreeViewItem) => void,
    /**
     * 当我们尝试重新解析树项时要调用的函数。
     * 如果提供了函数，则{@link TreeView}将不会对树项进行重新排序，
     * 而是依赖于该函数根据其认为合适的方式对其进行重新排序。
     */
    onReparent?: any,
    /**
     * 拖动时要滚动的元素。默认为此{@link TreeView}的DOM元素。
     */
    dragScrollElement?: HTMLElement
}

/**
 * 可以像层次结构一样显示TreeView的容器。TreeView包含 {@link TreeViewItem}s.
 */
class TreeView extends Container {
    /**
     *当用户开始拖动选定的TreeViewItems时触发。
     *
     * @event
     * @example
     * ```ts
     * const treeView = new TreeView({
     *     allowDrag: true // this is the default but we're showing it here for clarity
     * });
     * treeView.on('dragstart', (items) => {
     *     console.log(`Drag started of ${items.length} items');
     * });
     * ```
     */
    public static readonly EVENT_DRAGSTART = 'dragstart';

    /**
     * 当用户停止拖动选定的TreeViewItems时触发。
     *
     * @event
     * @example
     * ```ts
     * const treeView = new TreeView({
     *     allowDrag: true // this is the default but we're showing it here for clarity
     * });
     * treeView.on('dragend', () => {
     *     console.log('Drag ended');
     * });
     * ```
     */
    public static readonly EVENT_DRAGEND = 'dragend';

    /**
     * 当用户准备TreeViewItems时触发。
     *
     * @event
     * @example
     * ```ts
     * const treeView = new TreeView();
     * treeView.on('reparent', (reparented: { item: TreeViewItem; oldParent: Element; }[]) => {
     *     console.log(`Reparented ${reparented.length} items`);
     * });
     * ```
     */
    public static readonly EVENT_REPARENT = 'reparent';

    /**
     * 当用户选择TreeViewItem时触发。
     *
     * @event
     * @example
     * ```ts
     * const treeView = new TreeView();
     * treeView.on('select', (item: TreeViewItem) => {
     *     console.log(`Selected item ${item.text}`);
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
     * const treeView = new TreeView();
     * treeView.on('deselect', (item: TreeViewItem) => {
     *     console.log(`Deselected item ${item.text}`);
     * });
     * ```
     */
    public static readonly EVENT_DESELECT = 'deselect';

    /**
     * 当用户重命名TreeViewItem时触发。
     *
     * @event
     * @example
     * ```ts
     * const treeView = new TreeView();
     * treeView.on('rename', (item: TreeViewItem, name: string) => {
     *     console.log(`Renamed item to ${name}`);
     * });
     * ```
     */
    public static readonly EVENT_RENAME = 'rename';

    protected _selectedItems: TreeViewItem[] = [];

    protected _dragItems: TreeViewItem[] = [];

    protected _allowDrag: boolean;

    protected _allowReordering: boolean;

    protected _allowRenaming: boolean;

    protected _dragging = false;

    protected _dragOverItem: TreeViewItem|null = null;

    protected _dragArea = DRAG_AREA_INSIDE;

    protected _dragScroll = 0;

    protected _dragScrollInterval: number|null = null;

    protected _dragHandle: Element;

    protected _dragScrollElement: any;

    protected _onContextMenu: (evt: MouseEvent, item: TreeViewItem) => void;

    protected _onReparentFn: any;

    protected _pressedCtrl = false;

    protected _pressedShift = false;

    protected _filter: string|null = null;

    protected _filterResults: TreeViewItem[] = [];

    protected _wasDraggingAllowedBeforeFiltering: boolean;

    /**
     * 创建一个新的TreeView。
     *
     * @param args - 参数
     */
    constructor(args: Readonly<TreeViewArgs> = {}) {
        super(args);

        this.class.add(CLASS_ROOT);

        this._allowDrag = args.allowDrag ?? true;
        this._allowReordering = args.allowReordering ?? true;
        this._allowRenaming = args.allowRenaming ?? false;
        this._dragHandle = new Element({
            class: CLASS_DRAGGED_HANDLE
        });
        this._dragScrollElement = args.dragScrollElement || this;
        this.append(this._dragHandle);

        this._onContextMenu = args.onContextMenu as any;
        this._onReparentFn = args.onReparent;

        this._wasDraggingAllowedBeforeFiltering = this._allowDrag;

        window.addEventListener('keydown', this._updateModifierKeys);
        window.addEventListener('keyup', this._updateModifierKeys);
        // @ts-ignore
        window.addEventListener('mousedown', this._updateModifierKeys);
        this.dom && this.dom.addEventListener('mouseleave', this._onMouseLeave);
        this._dragHandle.dom && this._dragHandle.dom.addEventListener('mousemove', this._onDragMove);
        this._dragHandle.on('destroy', (dom) => {
            dom.removeEventListener('mousemove', this._onDragMove);
        });
    }

    destroy() {
        if (this._destroyed) return;

        window.removeEventListener('keydown', this._updateModifierKeys);
        window.removeEventListener('keyup', this._updateModifierKeys);
        // @ts-ignore
        window.removeEventListener('mousedown', this._updateModifierKeys);
        window.removeEventListener('mousemove', this._onMouseMove);
        // @ts-ignore
        this.dom.removeEventListener('mouseleave', this._onMouseLeave);

        if (this._dragScrollInterval) {
            window.clearInterval(this._dragScrollInterval);
            this._dragScrollInterval = null;
        }

        super.destroy();
    }

    protected _updateModifierKeys = (evt: KeyboardEvent) => {
        this._pressedCtrl = evt.ctrlKey || evt.metaKey;
        this._pressedShift = evt.shiftKey;
    };

    /**
     * 查找下一个当前未隐藏的树项目。
     *
     * @param currentItem - 当前的 tree item.
     * @returns 下一个可见的 tree item.
     */
    protected _findNextVisibleTreeItem(currentItem: TreeViewItem): TreeViewItem|null {
        if (currentItem.numChildren > 0 && currentItem.open) {
            return currentItem.firstChild;
        }

        const sibling = currentItem.nextSibling;
        if (sibling) return sibling;

        let parent = currentItem.parent;
        if (!(parent instanceof TreeViewItem)) return null;

        let parentSibling = parent.nextSibling;
        while (!parentSibling) {
            parent = parent.parent;
            if (!(parent instanceof TreeViewItem)) {
                break;
            }

            parentSibling = parent.nextSibling;
        }

        return parentSibling;
    }

    /**
     * 查找指定树项的最后一个可见子 tree item.
     *
     * @param currentItem - 当前 item.
     * @returns 最后一个 child item.
     */
    protected _findLastVisibleChildTreeItem(currentItem: TreeViewItem) {
        if (!currentItem.numChildren || !currentItem.open) return null;

        let lastChild = currentItem.lastChild;
        while (lastChild && lastChild.numChildren && lastChild.open) {
            lastChild = lastChild.lastChild;
        }

        return lastChild;
    }

    /**
     * 查找指定tree item 的上一个可见tree item
     *
     * @param currentItem - 当前 item.
     * @returns 上一个 item.
     */
    protected _findPreviousVisibleTreeItem(currentItem: TreeViewItem) {
        const sibling = currentItem.previousSibling;
        if (sibling) {
            if (sibling.numChildren > 0 && sibling.open)  {
                return this._findLastVisibleChildTreeItem(sibling);
            }

            return sibling;
        }

        const parent = currentItem.parent;
        if (!(parent instanceof TreeViewItem)) return null;

        return parent;
    }

    /**
     * 获取指定的开始 tree item 和结束树项之间的可见 tree item。
     *
     * @param startChild - 第一个 tree item.
     * @param endChild - 最后一个 tree item.
     */
    protected _getChildrenRange(startChild: TreeViewItem|null, endChild: TreeViewItem): TreeViewItem[] {
        const result = [];

        // 如果我们当前正在过滤tree item 视图项，请选择搜索结果
        if (this._filterResults.length) {
            const filterResults = this.dom && this.dom.querySelectorAll(`.${CLASS_ROOT}-item.${CLASS_FILTER_RESULT}`);

            let startIndex = -1;
            let endIndex = -1;

            if (filterResults) {

                for (let i = 0; i < filterResults.length; i++) {
                    const item = filterResults[i].ui;
    
                    if (item === startChild) {
                        startIndex = i;
                    } else if (item === endChild) {
                        endIndex = i;
                    }
    
                    if (startIndex !== -1 && endIndex !== -1) {
                        const start = (startIndex < endIndex ? startIndex : endIndex);
                        const end = (startIndex < endIndex ? endIndex : startIndex);
                        for (let j = start; j <= end; j++) {
                            result.push(filterResults[j].ui as TreeViewItem);
                        }
    
                        break;
                    }
                }
            }
        } else {
            // 如果我们没有过滤树视图，那么找到下一个可见的tree item
            let current = startChild;
            const rectStart = (startChild as any).dom.getBoundingClientRect();
            const rectEnd = (startChild as any).dom.getBoundingClientRect();

            if (rectStart.top < rectEnd.top) {
                while (current && current !== endChild) {
                    current = this._findNextVisibleTreeItem(current);
                    if (current && current !== endChild) {
                        result.push(current);
                    }
                }
            } else {
                while (current && current !== endChild) {
                    current = this._findPreviousVisibleTreeItem(current);
                    if (current && current !== endChild) {
                        result.push(current);
                    }
                }
            }

            result.push(endChild);

        }

        return result;
    }

    protected _onAppendChild(element: Element) {
        super._onAppendChild(element);

        if (element instanceof TreeViewItem) {
            this._onAppendTreeViewItem(element);
        }
    }

    protected _onRemoveChild(element: Element) {
        if (element instanceof TreeViewItem) {
            this._onRemoveTreeViewItem(element);
        }

        super._onRemoveChild(element);
    }

    protected _onAppendTreeViewItem(item: TreeViewItem) {
        item.treeView = this;

        if (this._filter) {
            // 如果新项满足当前筛选器，则向筛选结果添加新项
            this._searchItems([[item.text, item]], this._filter);
        }

        // 对元素的所有子元素执行相同的操作
        item.forEachChild((child) => {
            if (child instanceof TreeViewItem) {
                this._onAppendTreeViewItem(child);
            }
        });
    }

    protected _onRemoveTreeViewItem(item: TreeViewItem) {
        item.selected = false;

        // 对元素的所有子元素执行相同的操作
        item.forEachChild((child) => {
            if (child instanceof TreeViewItem) {
                this._onRemoveTreeViewItem(child);
            }
        });
    }

    // 当子TreeViewItem上的键按下时调用
    protected _onChildKeyDown(evt: KeyboardEvent, item: TreeViewItem) {
        if (['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].indexOf(evt.key) === -1) return;

        evt.preventDefault();
        evt.stopPropagation();

        if (evt.key === 'ArrowDown') {
            // 选择下一个树项
            if (this._selectedItems.length) {
                const next = this._findNextVisibleTreeItem(item);
                if (next) {
                    if (this._pressedShift || this._pressedCtrl) {
                        next.selected = true;
                    } else {
                        this._selectSingleItem(next);
                    }
                }
            }
        } else if (evt.key === 'ArrowUp') {
            // 选择前一个树项
            if (this._selectedItems.length) {
                const prev = this._findPreviousVisibleTreeItem(item);
                if (prev) {
                    if (this._pressedShift || this._pressedCtrl) {
                        prev.selected = true;
                    } else {
                        this._selectSingleItem(prev);
                    }
                }
            }

        } else if (evt.key === 'ArrowLeft') {
            // 关闭选中的树项
            if (item.parent !== this) {
                item.open = false;
            }
        } else if (evt.key === 'ArrowRight') {
            // 打开选定的树项
            item.open = true;
        } else if (evt.key === 'Tab') {
            // tab
            // skip
        }
    }

    // 当我们点击子TreeViewItem时调用
    protected _onChildClick(evt: MouseEvent, item: TreeViewItem) {
        if (evt.button !== 0) return;
        if (!item.allowSelect) return;

        if (this._pressedCtrl) {
            // 按下Ctrl键时切换选择
            item.selected = !item.selected;
        } else if (this._pressedShift) {
            // 按shift添加到选择中
            if (!this._selectedItems.length || this._selectedItems.length === 1 && this._selectedItems[0] === item) {
                item.selected = true;
                return;
            }

            const selected = this._selectedItems[this._selectedItems.length - 1];
            this._openHierarchy(selected);

            const children = this._getChildrenRange(selected, item);
            children.forEach((child) => {
                if (child.allowSelect) {
                    child.selected = true;
                }
            });

        } else {
            // 取消选择其他项目
            this._selectSingleItem(item);
        }
    }

    /**
     * 首先遍历层次结构深度，在每个子TreeViewItem上调用指定的函数。
     *
     * @param fn - 要调用的函数。该函数接受TreeViewItem作为参数。
     */
    protected _traverseDepthFirst(fn: (item: TreeViewItem) => void) {
        function traverse(item: Element) {
            if (!item || !(item instanceof TreeViewItem)) return;

            fn(item);

            if (item.numChildren) {
                for (const child of (item.dom as any).childNodes) {
                    traverse(child.ui);
                }
            }
        }
        for (const child of (this.dom as any).childNodes) {
            traverse(child.ui);
        }
    }

    /**
     * 对所有树项进行深度优先遍历，并为它们分配顺序，以便我们知道哪个在另一个之上。性能方面，这意味着它每次遍历所有树项，但即使有15 - 20 K的实体，似乎也相当快。
     */
    protected _getTreeOrder(): Map<TreeViewItem, number> {
        const treeOrder = new Map<TreeViewItem, number>();
        let order = 0;

        this._traverseDepthFirst((item: TreeViewItem) => {
            treeOrder.set(item, order++);
        });

        return treeOrder;
    }

    protected _getChildIndex(item: TreeViewItem, parent: TreeViewItem) {
        return Array.prototype.indexOf.call((parent as any).dom.childNodes, item.dom) - 1;
    }

    // 当我们开始拖拽一个TreeViewItem时调用。
    // @ts-ignore
    protected _onChildDragStart(evt: MouseEvent, item: TreeViewItem) {
        if (!this.allowDrag || this._dragging) return;

        this._dragItems = [];

        if (this._selectedItems.indexOf(item) !== -1) {
            const dragged = [];

            // 检查要拖动的所有选定项距离根的深度是否相同
            let desiredDepth = -1;
            for (let i = 0; i < this._selectedItems.length; i++) {
                let parent = this._selectedItems[i].parent;
                let depth = 0;
                let isChild = false;
                while (parent && parent instanceof TreeViewItem) {
                    // 如果父项已经在拖动项中，则跳过此项的深度计算
                    if (this._selectedItems.indexOf(parent) !== -1) {
                        isChild = true;
                        break;
                    }

                    depth++;
                    parent = parent.parent;
                }

                if (!isChild) {
                    if (desiredDepth === -1) {
                        desiredDepth = depth;
                    } else if (desiredDepth !== depth) {
                        return;
                    }

                    dragged.push(this._selectedItems[i]);
                }
            }

            // 向每个项目添加拖动类
            this._dragItems = dragged;
        } else {
            item.class.add(CLASS_DRAGGED_ITEM);
            this._dragItems.push(item);
        }

        if (this._dragItems.length) {
            this._dragItems.forEach((item) => {
                item.class.add(CLASS_DRAGGED_ITEM);
            });

            this.isDragging = true;

            this.emit('dragstart', this._dragItems.slice());
        }
    }

    // 当我们停止拖拽TreeViewItem时调用。
    protected _onChildDragEnd() {   //evt: MouseEvent, item: TreeViewItem
        if (!this.allowDrag || !this._dragging) return;

        this._dragItems.forEach(item => item.class.remove(CLASS_DRAGGED_ITEM));

        // 如果根被拖拽，那么不允许重父，因为我们不想重父
        let isRootDragged = false;
        for (let i = 0; i < this._dragItems.length; i++) {
            if (this._dragItems[i].parent === this)  {
                isRootDragged = true;
                break;
            }
        }

        if (!isRootDragged && this._dragOverItem) {
            if (this._dragItems.length > 1) {
                // 根据层次结构中的顺序对项目进行排序
                const treeOrder = this._getTreeOrder() as any;
                this._dragItems.sort((a, b) => {
                    return treeOrder.get(a) - treeOrder.get(b);
                });
            }

            if (this._dragItems.length) {
                // 相应的物品
                const reparented: any[] = [];

                // 如果我们没有_onReparentFn，那么在DOM中重新放置所有拖动项
                if (!this._onReparentFn) {
                    // 首先从它们的父项中删除所有项
                    this._dragItems.forEach((item) => {
                        if (item.parent === this._dragOverItem && this._dragArea === DRAG_AREA_INSIDE) return;

                        reparented.push({
                            item: item,
                            oldParent: item.parent
                        });
                        (item.parent as Container).remove(item);
                    });

                    // 现在是重显项
                    reparented.forEach((r, i) => {
                        if (this._dragArea === DRAG_AREA_BEFORE) {
                            // 如果拖到TreeViewItem之前…
                            r.newParent = (this._dragOverItem as any).parent as Container;
                            r.newParent.appendBefore(r.item, this._dragOverItem);
                            r.newChildIndex = this._getChildIndex(r.item, r.newParent);
                        } else if (this._dragArea === DRAG_AREA_INSIDE) {
                            // 如果拖进TreeViewItem…
                            r.newParent = this._dragOverItem;
                            r.newParent.append(r.item);
                            r.newParent.open = true;
                            r.newChildIndex = this._getChildIndex(r.item, r.newParent);
                        } else if (this._dragArea === DRAG_AREA_AFTER) {
                            // 如果拖到TreeViewItem之后…
                            r.newParent = (this._dragOverItem as any).parent as Container;
                            r.newParent.appendAfter(r.item, i > 0 ? reparented[i - 1].item : this._dragOverItem);
                            r.newChildIndex = this._getChildIndex(r.item, r.newParent);
                        }
                    });

                } else {
                    // 如果我们有一个_onReparentFn，
                    // 那么我们不会在这里执行reparenting，
                    // 而是计算新的索引，
                    // 并将该数据传递给parent函数来执行reparenting

                    const fakeDom: { parent: TreeViewItem; children: ChildNode[]; }[] = [];

                    const getChildren = (treeviewItem: TreeViewItem) => {
                        let idx = fakeDom.findIndex(entry => entry.parent === treeviewItem);
                        if (idx === -1) { 
                            fakeDom.push({ parent: treeviewItem, children: [...(treeviewItem.dom as any).childNodes] });
                            idx = fakeDom.length - 1;
                        }

                        return fakeDom[idx].children;
                    };

                    this._dragItems.forEach((item) => {
                        if (item.parent === this._dragOverItem && this._dragArea === DRAG_AREA_INSIDE) return;

                        reparented.push({
                            item: item,
                            oldParent: item.parent
                        });

                        // 添加父节点的子节点数组到fakeDom数组
                        const parentChildren = getChildren(item.parent as TreeViewItem);

                        // 从fakeDom的子数组中删除这个元素
                        const childIdx = parentChildren.indexOf(item.dom as any);
                        parentChildren.splice(childIdx, 1);
                    });

                    // now reparent items
                    reparented.forEach((r, i) => {
                        if (this._dragArea === DRAG_AREA_BEFORE) {
                            // 如果拖到TreeViewItem之前…
                            r.newParent = (this._dragOverItem as any).parent;
                            const parentChildren = getChildren((this._dragOverItem as any).parent as TreeViewItem);
                            const index = parentChildren.indexOf((this._dragOverItem as any).dom);
                            parentChildren.splice(index, 0, r.item.dom);
                            r.newChildIndex = index;
                        } else if (this._dragArea === DRAG_AREA_INSIDE) {
                            // 如果拖进TreeViewItem…
                            r.newParent = this._dragOverItem;
                            const parentChildren = getChildren(this._dragOverItem as any);
                            parentChildren.push(r.item.dom);
                            r.newChildIndex = parentChildren.length - 1;
                        } else if (this._dragArea === DRAG_AREA_AFTER) {
                            // 如果拖到TreeViewItem之后…
                            r.newParent = (this._dragOverItem as any).parent;
                            const parentChildren = getChildren((this._dragOverItem as any).parent as TreeViewItem);
                            const after = i > 0 ? reparented[i - 1].item : this._dragOverItem;
                            const index = parentChildren.indexOf(after.dom);
                            parentChildren.splice(index + 1, 0, r.item.dom);
                            r.newChildIndex = index + 1;
                        }

                        // 从新的子索引中减去1，以计算每个树视图项内部的额外节点
                        r.newChildIndex--;
                    });
                }

                if (reparented.length) {
                    if (this._onReparentFn) {
                        this._onReparentFn(reparented);
                    }

                    this.emit('reparent', reparented);
                }
            }
        }

        this._dragItems = [];

        this.isDragging = false;

        this.emit('dragend');
    }

    // 当我们拖拽一个TreeViewItem时调用。
    protected _onChildDragOver(evt: MouseEvent, item: TreeViewItem) {
        if (!this._allowDrag || !this._dragging) return;

        if (item.allowDrop && this._dragItems.indexOf(item) === -1) {
            this._dragOverItem = item;
        } else {
            this._dragOverItem = null;
        }

        this._updateDragHandle();
        this._onDragMove(evt);
    }

    // 当鼠标光标离开树视图时调用。
    protected _onMouseLeave = () => {   // evt: MouseEvent
        if (!this._allowDrag || !this._dragging) return;

        this._dragOverItem = null;
        this._updateDragHandle();
    };

    // 当鼠标拖动时移动时调用
    protected _onMouseMove = (evt: MouseEvent) => {
        if (!this._dragging) return;

        // 确定当我们向边缘拖动时是否需要滚动树视图
        const rect = this.dom && this.dom.getBoundingClientRect();
        this._dragScroll = 0;
        let top = rect && rect.top;

        let bottom = rect && rect.bottom;
        if (this._dragScrollElement !== this) {
            const dragScrollRect = this._dragScrollElement.dom.getBoundingClientRect();
            top = Math.max(top + this._dragScrollElement.dom.scrollTop, dragScrollRect.top);
            bottom = Math.min(bottom + this._dragScrollElement.dom.scrollTop, dragScrollRect.bottom);
        }

        top = Math.max(0, top as any);
        bottom = Math.min(bottom as any, document.body.clientHeight);

        if (evt.pageY < top + 32 && this._dragScrollElement.dom.scrollTop > 0) {
            this._dragScroll = -1;
        } else if (evt.pageY > bottom - 32 && this._dragScrollElement.dom.scrollHeight > this._dragScrollElement.height + this._dragScrollElement.dom.scrollTop) {
            this._dragScroll = 1;
        }
    };

    // 如果我们向边缘拖动，请滚动树视图
    protected _scrollWhileDragging() {
        if (!this._dragging) return;
        if (this._dragScroll === 0) return;

        this._dragScrollElement.dom.scrollTop += this._dragScroll * 8;
        this._dragOverItem = null;
        this._updateDragHandle();
    }

    // 在拖拽手柄时调用
    protected _onDragMove = (evt: MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();

        const that = this as any;

        if (!this._allowDrag || !this._dragOverItem) return;

        const rect = (this._dragHandle as any).dom.getBoundingClientRect();
        const area = Math.floor((evt.clientY - rect.top) / rect.height * 5);

        const oldArea = this._dragArea;
        const oldDragOver = this._dragOverItem;

        if (this._dragOverItem.parent === this) {
            let parent = false;
            for (let i = 0; i < this._dragItems.length; i++) {
                if (this._dragItems[i].parent === this._dragOverItem) {
                    parent = true;
                    this._dragOverItem = null;
                    break;
                }
            }

            if (!parent) {
                this._dragArea = DRAG_AREA_INSIDE;
            }
        } else {
            // 检查我们是否试图将item拖放到它的子元素中
            let invalid = false;
            for (let i = 0; i < this._dragItems.length; i++) {
                if (that._dragItems[i].dom.contains(this._dragOverItem.dom)) {
                    invalid = true;
                    break;
                }
            }

            if (invalid) {
                this._dragOverItem = null; 
            } else if (this._allowReordering && area <= 1 && this._dragItems.indexOf(that._dragOverItem.previousSibling) === -1) {
                this._dragArea = DRAG_AREA_BEFORE; 
            } else if (this._allowReordering && area >= 4 && this._dragItems.indexOf(that._dragOverItem.nextSibling) === -1 && (this._dragOverItem.numChildren === 0 || !this._dragOverItem.open)) {
                this._dragArea = DRAG_AREA_AFTER;
            } else {
                let parent = false;
                if (this._allowReordering && this._dragOverItem.open) {
                    for (let i = 0; i < this._dragItems.length; i++) {
                        if (this._dragItems[i].parent === this._dragOverItem) {
                            parent = true;
                            this._dragArea = DRAG_AREA_BEFORE;
                            break;
                        }
                    }
                }
                if (!parent)
                    this._dragArea = DRAG_AREA_INSIDE;
            }
        }

        if (oldArea !== this._dragArea || oldDragOver !== this._dragOverItem) {
            this._updateDragHandle();
        }
    };

    // 更新 drag handle position and size
    protected _updateDragHandle(dragOverItem?: TreeViewItem, force?: boolean) {
        if (!force && (!this._allowDrag || !this._dragging)) return;

        if (!dragOverItem) {// @ts-ignore
            dragOverItem = this._dragOverItem;
        }

        if (!dragOverItem || dragOverItem.hidden || !dragOverItem.parentsOpen) {
            this._dragHandle.hidden = true;
        } else {
            // @ts-ignore
            const rect = dragOverItem._containerContents.dom.getBoundingClientRect();

            this._dragHandle.hidden = false;
            this._dragHandle.class.remove(DRAG_AREA_AFTER, DRAG_AREA_BEFORE, DRAG_AREA_INSIDE);
            this._dragHandle.class.add(this._dragArea);

            const top = rect.top;
            let left = rect.left;
            let width = rect.width;// @ts-ignore
            if (this.dom.parentElement) {
                // @ts-ignore
                const parentRect = this.dom.parentElement.getBoundingClientRect();
                left = Math.max(left, parentRect.left);
                // @ts-ignore
                width = Math.min(width, this.dom.parentElement.clientWidth - left + parentRect.left);
            }

            this._dragHandle.style.top = top  + 'px';
            this._dragHandle.style.left = left + 'px';
            this._dragHandle.style.width = (width - 7) + 'px';
        }
    }

    /**
     * 打开指定项的所有父项
     *
     * @param endItem - 结束树视图项
     */
    protected _openHierarchy(endItem: TreeViewItem) {
        endItem.parentsOpen = true;
    }

    /**
     * 选择树视图项
     *
     * @param item - 树视图项
     */
    protected _selectSingleItem(item: TreeViewItem) {
        let i = this._selectedItems.length;
        let othersSelected = false;
        while (i--) {
            if (this._selectedItems[i] && this._selectedItems[i] !== item) {
                this._selectedItems[i].selected = false;
                othersSelected = true;
            }
        }

        if (othersSelected) {
            item.selected = true;
        } else {
            item.selected = !item.selected;
        }
    }

    /**
     * 当子树视图项被选中时调用。
     *
     * @param item - The tree view item.
     */
    protected _onChildSelected(item: TreeViewItem) {
        this._selectedItems.push(item);
        this._openHierarchy(item);
        this.emit('select', item);
    }

    /**
     * 当子树视图项被取消选中时调用。
     *
     * @param item - The tree view item.
     */
    protected _onChildDeselected(item: TreeViewItem) {
        const index = this._selectedItems.indexOf(item);
        if (index !== -1) {
            this._selectedItems.splice(index, 1);
            this.emit('deselect', item);
        }
    }

    /**
     * 重命名子树视图项时调用。
     *
     * @param item - The tree view item.
     * @param newName - The new name.
     */
    protected _onChildRename(item: TreeViewItem, newName: string) {
        if (this._filter) {
            // 取消对该项的过滤
            item.class.remove(CLASS_FILTER_RESULT);
            const index = this._filterResults.indexOf(item);
            if (index !== -1) {
                this._filterResults.splice(index, 1);
            }

            // 看看我们能否将它包含在当前过滤器中
            this._searchItems([[item.text, item]], this._filter);
        }
        this.emit('rename', item, newName);
    }

    protected _searchItems(searchArr: [string, TreeViewItem][], filter: string) {
        const results = searchItems(searchArr, filter);
        if (!results.length) return;

        results.forEach((item: TreeViewItem) => {
            this._filterResults.push(item);
            item.class.add(CLASS_FILTER_RESULT);
        });
    }

    /**
     * 搜索树视图。
     *
     * @param filter - 搜索过滤器
     */
    protected _applyFilter(filter: string) {
        this._clearFilter();

        this._wasDraggingAllowedBeforeFiltering = this._allowDrag;
        this._allowDrag = false;

        this.class.add(CLASS_FILTERING);

        const search: [string, TreeViewItem][] = [];
        this._traverseDepthFirst((item) => {
            search.push([item.text, item]);
        });

        this._searchItems(search, filter);
    }

    /**
     * 清除搜索过滤器。
     */
    protected _clearFilter() {
        this._filterResults.forEach((item) => {
            if (item.destroyed) return;
            item.class.remove(CLASS_FILTER_RESULT);
        });
        this._filterResults.length = 0;

        this.class.remove(CLASS_FILTERING);

        this._allowDrag = this._wasDraggingAllowedBeforeFiltering;
    }

    /**
     * 显示给定树项上的drag handle
     *
     * @param treeItem - The tree item.
     */
    showDragHandle(treeItem: TreeViewItem) {
        this._updateDragHandle(treeItem, true);
    }

    /**
     * 取消选择所有选定的树视图项。
     */
    deselect() {
        let i = this._selectedItems.length;
        while (i--) {
            if (this._selectedItems[i]) {
                this._selectedItems[i].selected = false;
            }
        }
    }

    /**
     * 移除所有子树视图项。
     */
    clearTreeItems() {
        // @ts-ignore
        let i = this.dom.childNodes.length;
        while (i--) {
            // @ts-ignore
            const dom = this.dom.childNodes[i];
            if (!dom) continue;
            const ui = dom.ui;
            if (ui instanceof TreeViewItem) {
                ui.destroy();
            }
        }

        this._selectedItems = [];
        this._dragItems = [];
        this._allowDrag = this._wasDraggingAllowedBeforeFiltering;
    }

    /**
     * 是否允许拖动TreeViewItem。
     */
    set allowDrag(value: boolean) {
        this._allowDrag = value;
        if (this._filter) {
            this._wasDraggingAllowedBeforeFiltering = value;
        }
    }

    get allowDrag(): boolean {
        return this._allowDrag;
    }

    /**
     * 是否允许重新排序treeviewitem。
     */
    set allowReordering(value: boolean) {
        this._allowReordering = value;
    }

    get allowReordering(): boolean {
        return this._allowReordering;
    }

    /**
     * 是否允许重命名treeviewitem通过双击它们。
     */
    set allowRenaming(value: boolean) {
        this._allowRenaming = value;
    }

    get allowRenaming(): boolean {
        return this._allowRenaming;
    }

    /**
     * TreeViewItem当前是否被拖拽。
     */
    set isDragging(value: boolean) {
        if (this._dragging === value) return;

        if (value) {
            this._dragging = true;
            this._updateDragHandle();

            // 手柄鼠标移动滚动时拖动，如果需要
            if (this.scrollable || this._dragScrollElement !== this) {
                window.removeEventListener('mousemove', this._onMouseMove);
                window.addEventListener('mousemove', this._onMouseMove);
                if (!this._dragScrollInterval) {
                    this._dragScrollInterval = window.setInterval(() => {
                        this._scrollWhileDragging();
                    }, 1000 / 60);
                }
            }
        } else {
            this._dragOverItem = null;
            this._updateDragHandle();

            this._dragging = false;

            window.removeEventListener('mousemove', this._onMouseMove);
            if (this._dragScrollInterval) {
                window.clearInterval(this._dragScrollInterval);
                this._dragScrollInterval = null;
            }
        }
    }

    get isDragging(): boolean {
        return this._dragging;
    }

    /**
     * 返回所有当前选定的treeviewitem。
     */
    get selected(): Array<TreeViewItem> {
        return this._selectedItems.slice();
    }

    /**
     * 一个过滤器，搜索treeviewitem并只显示与过滤器相关的那些。
     */
    set filter(value) {
        if (this._filter === value) return;

        this._filter = value;

        if (value) {
            this._applyFilter(value);
        } else {
            this._clearFilter();
        }
    }

    get filter() {
        return this._filter;
    }

    /**
     * 当前是否按下Ctrl。
     */
    get pressedCtrl(): boolean {
        return this._pressedCtrl;
    }

    /**
     * 当前是否按下“Shift”键。
     */
    get pressedShift(): boolean {
        return this._pressedShift;
    }
}

export default TreeView;
