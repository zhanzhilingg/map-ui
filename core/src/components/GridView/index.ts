import { EventHandle } from '../../observer';

import Element from '../Element';
import Container, { ContainerArgs } from '../Container';
import GridViewItem from '../GridViewItem';
import { PREFIX } from '../../class';

const CLASS_ROOT = PREFIX + 'gridview';
const CLASS_VERTICAL = CLASS_ROOT + '-vertical';

/**
 * {@link GridView}构造函数的参数。
 */
export interface GridViewArgs extends ContainerArgs {
    /**
     * 如果为true， {@link GridView}布局将是垂直的。
     */
    vertical?: boolean;
    /**
     * 如果为true，布局将允许选择多个选项。默认为“true”。
     */
    multiSelect?: boolean;
    /**
     * 如果'true '和'multiSelect '被设置为' false '，布局将允许取消选择选项。默认为“true”。
     */
    allowDeselect?: boolean;
    /**
     * 一个过滤器函数来过滤{@link GridViewItem}与签名' (GridViewItem) =>布尔'
     */
    filterFn?: (item: GridViewItem) => boolean;
}

/**
 * 表示一个容器，该容器显示看起来像网格的可灵活包装的项列表。
 * 包含{@link GridViewItem}
 */
class GridView extends Container {
    protected _vertical: boolean;

    protected _clickFn: ((evt: MouseEvent, item: GridViewItem) => void) | undefined;

    protected _filterFn: ((item: GridViewItem) => boolean) | undefined;

    protected _filterAnimationFrame: number|null = null;

    protected _filterCanceled = false;

    protected _multiSelect: boolean;

    protected _allowDeselect: boolean;

    protected _selected: GridViewItem[] = [];

    constructor(args: Readonly<GridViewArgs> = {}) {
        super(args);

        this._vertical = !!args.vertical;
        this.class.add(this._vertical ? CLASS_VERTICAL : CLASS_ROOT);

        this.on('append', (element: Element) => {
            this._onAppendGridViewItem(element as GridViewItem);
        });
        this.on('remove', (element: Element) => {
            this._onRemoveGridViewItem(element as GridViewItem);
        });

        (this as any)._filterFn = args.filterFn;

        // GridView布局的默认选项
        this._multiSelect = args.multiSelect ?? true;
        this._allowDeselect = args.allowDeselect ?? true;
    }

    protected _onAppendGridViewItem(item: GridViewItem) {
        if (!(item instanceof GridViewItem)) return;

        let evtClick: EventHandle|null;
        if (this._clickFn)
            evtClick = item.on('click', evt => this._clickFn && this._clickFn(evt, item));
        else
            evtClick = item.on('click', evt => this._onClickItem(evt, item));
        let evtSelect = item.on('select', () => this._onSelectItem(item)) as any;

        let evtDeselect: EventHandle|null;
        if (this._allowDeselect)
            evtDeselect = item.on('deselect', () => this._onDeselectItem(item));

        if (this._filterFn && !this._filterFn(item)) {
            item.hidden = true;
        }

        item.once('griditem:remove', () => {
            evtClick && evtClick.unbind();
            evtClick = null;

            evtSelect.unbind();
            evtSelect = null;

            if (this._allowDeselect) {
                evtDeselect && evtDeselect.unbind();
                evtDeselect = null;
            }
        });
    }

    protected _onRemoveGridViewItem(item: GridViewItem) {
        if (!(item instanceof GridViewItem)) return;

        item.selected = false;

        item.emit('griditem:remove');
        item.unbind('griditem:remove');
    }

    protected _onClickItem(evt: MouseEvent, item: GridViewItem) {
        if ((evt.ctrlKey || evt.metaKey) && this._multiSelect) {
            item.selected = !item.selected;
        } else if (evt.shiftKey && this._multiSelect) {
            const lastSelected = this._selected[this._selected.length - 1] as any;
            if (lastSelected) {
                const comparePosition = lastSelected.dom.compareDocumentPosition(item.dom);
                if (comparePosition & Node.DOCUMENT_POSITION_FOLLOWING) {
                    let sibling = lastSelected.nextSibling;
                    while (sibling) {
                        sibling.selected = true;
                        if (sibling === item) break;

                        sibling = sibling.nextSibling;
                    }
                } else {
                    let sibling = lastSelected.previousSibling;
                    while (sibling) {
                        sibling.selected = true;
                        if (sibling === item) break;

                        sibling = sibling.previousSibling;
                    }
                }
            } else {
                item.selected = true;
            }
        } else {
            let othersSelected = false;
            let i = this._selected.length;
            while (i--) {
                if (this._selected[i] && this._selected[i] !== item) {
                    this._selected[i].selected = false;
                    othersSelected = true;
                }
            }

            if (othersSelected) {
                item.selected = true;
            } else {
                item.selected = !item.selected;
            }
        }
    }

    protected _onSelectItem(item: GridViewItem) {
        this._selected.push(item);
        this.emit('select', item);
    }

    protected _onDeselectItem(item: GridViewItem) {
        const index = this._selected.indexOf(item);
        if (index !== -1) {
            this._selected.splice(index, 1);
            this.emit('deselect', item);
        }
    }

    /**
     * 取消选择所有选定的网格视图项。
     */
    deselect() {
        let i = this._selected.length;
        while (i--) {
            if (this._selected[i]) {
                this._selected[i].selected = false;
            }
        }
    }

    /**
     * 使用构造函数中提供的筛选函数筛选网格视图项。
     */
    filter() {
        this.forEachChild((child) => {
            if (child instanceof GridViewItem) {
                (child.hidden as any) = this._filterFn && !this._filterFn(child);
            }
        });
    }

    /**
     * 通过只允许指定数量的网格视图项操作异步过滤网格视图项。触发以下事件:
     *
     * - filter:start - 开始过滤时
     * - filter:end - 过滤结束时
     * - filter:delay - 当一个动画帧被请求处理另一批时
     * - filter:cancel - 取消过滤时
     *
     * @param batchLimit - 在请求另一个动画帧之前要显示的最大项目数
     */
    filterAsync(batchLimit = 100) {
        let i = 0;
        const children = (this.dom as any).childNodes;
        const len = children.length;

        this.emit('filter:start');

        this._filterCanceled = false;

        const next = () => {
            this._filterAnimationFrame = null;
            let visible = 0;
            for (; i < len && visible < batchLimit; i++) {
                if (this._filterCanceled) {
                    this._filterCanceled = false;
                    this.emit('filter:cancel');
                    return;
                }

                const child = children[i].ui;
                if (child instanceof GridViewItem) {
                    if (this._filterFn && !this._filterFn(child)) {
                        child.hidden = true;
                    } else {
                        child.hidden = false;
                        visible++;
                    }
                }
            }

            if (i < len) {
                this.emit('filter:delay');
                this._filterAnimationFrame = requestAnimationFrame(next);
            } else {
                this.emit('filter:end');
            }
        };

        next();
    }

    /**
     * 取消异步过滤
     */
    filterAsyncCancel() {
        if (this._filterAnimationFrame) {
            cancelAnimationFrame(this._filterAnimationFrame);
            this._filterAnimationFrame = null;
        } else {
            this._filterCanceled = true;
        }
    }

    destroy() {
        if (this._destroyed) return;

        if (this._filterAnimationFrame) {
            cancelAnimationFrame(this._filterAnimationFrame);
            this._filterAnimationFrame = null;
        }

        super.destroy();
    }

    /**
     * 获取选定的gridviewitem
     */
    get selected() {
        return this._selected.slice();
    }

    /**
     * 获取网格布局是否为垂直
     */
    get vertical() {
        return this._vertical;
    }
}

export default GridView;
