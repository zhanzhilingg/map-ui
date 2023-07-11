import Element, { IFocusable } from '../Element';
import Container, { ContainerArgs } from '../Container';
import MenuItem, { MenuItemArgs } from '../MenuItem';
import { PREFIX } from '../../class';

const CLASS_MENU = PREFIX + 'menu';
const CLASS_MENU_ITEMS = CLASS_MENU + '-items';

/**
 * {@link Menu}构造函数的参数。
 */
export interface MenuArgs extends ContainerArgs {
    /**
     * {@link MenuItemArgs}的数组。如果传递了这些参数，则将创建新的MenuItems并将其添加到菜单中。
     */
    items?: MenuItemArgs[];
    /**
     * 设置是否隐藏{@link Menu}。默认为“true”。
     */
    hidden?: boolean; 
    /**
     * 设置{@link Menu}的tabIndex。默认为1。
     */
    tabIndex?: number;
}

/**
 * 菜单是一个{@link MenuItem}的列表，它可以包含子菜单项。
 * 用于显示上下文菜单和嵌套菜单。
 * 注意，必须将Menu附加到根元素，然后进行相应的定位。
 */
class Menu extends Container implements IFocusable {
    protected _containerMenuItems: Container;

    constructor(args: Readonly<MenuArgs> = {}) {
        super({ tabIndex: 1, ...args });

        this.hidden = args.hidden ?? true;

        this.class.add(CLASS_MENU);

        this._containerMenuItems = new Container({
            class: CLASS_MENU_ITEMS,
            flex: true,
            flexDirection: 'column'
        });
        this.append(this._containerMenuItems);

        const that = this as any;

        that.domContent = this._containerMenuItems.dom;

        this.on('click', this._onClickMenu);
        this.on('show', () => {
            this._onShowMenu();
        });
        that.dom.addEventListener('contextmenu', this._onClickMenu);
        that.dom.addEventListener('keydown', this._onKeyDown);

        if (args.items) {
            args.items.forEach((item: MenuItemArgs) => {
                const menuItem = new MenuItem(item);
                this.append(menuItem);
            });
        }
    }

    destroy() {
        if (this.destroyed) return;

        const that = this as any;

        that.dom.removeEventListener('keydown', this._onKeyDown);
        that.dom.removeEventListener('contextmenu', this._onClickMenu);
        that.dom.removeEventListener('focus', this._onFocus);
        that.dom.removeEventListener('blur', this._onBlur);

        super.destroy();
    }

    protected _onAppendChild(element: Element) {
        if (element instanceof MenuItem) {
            element.menu = this;
        }
    }

    protected _onRemoveChild(element: Element) {
        if (element instanceof MenuItem) {
            element.menu = null;
        }
    }

    protected _onClickMenu = (evt: MouseEvent) => {
        const that = this as any;
        if (!that._containerMenuItems.dom.contains(evt.target as Node)) {
            this.hidden = true;
        }
    };

    protected _onFocus = (evt: FocusEvent) => {
        this.emit('focus', evt);
    };

    protected _onBlur = (evt: FocusEvent) => {
        this.emit('blur', evt);
    };

    protected _filterMenuItems(item: MenuItem) {
        if (!(item instanceof MenuItem)) return;

        if (item.onIsEnabled) {
            item.enabled = item.onIsEnabled();
        }
        if (item.onIsVisible) {
            item.hidden = !item.onIsVisible();
        }

        // @ts-ignore
        for (const child of item._containerItems.dom.childNodes) {
            this._filterMenuItems(child.ui as MenuItem);
        }
    }

    protected _onShowMenu() {
        this.focus();

        const that = this as any;
        // 筛选子菜单项
        for (const child of that._containerMenuItems.dom.childNodes) {
            this._filterMenuItems(child.ui as MenuItem);
        }
    }

    protected _onKeyDown = (evt: KeyboardEvent) => {
        if (this.hidden) return;

        if (evt.key === 'Escape') {
            this.hidden = true;
        }
    };

    protected _limitSubmenuAtScreenEdges(item: MenuItem) {
        if (!(item instanceof MenuItem) || !item.hasChildren) return;

        // @ts-ignore
        const containerItems = item._containerItems as any;

        containerItems.style.top = '';
        containerItems.style.left = '';
        containerItems.style.right = '';

        const rect = containerItems.dom.getBoundingClientRect();
        // 限制屏幕的底部/顶部
        if (rect.bottom > window.innerHeight) {
            containerItems.style.top = -(rect.bottom - window.innerHeight) + 'px';
        }
        if (rect.right > window.innerWidth) {
            containerItems.style.left = 'auto';
            containerItems.style.right = '100%';
        }

        for (const child of containerItems.dom.childNodes) {
            this._limitSubmenuAtScreenEdges(child.ui as MenuItem);
        }
    }

    focus() {
        this.dom && this.dom.focus();
    }

    blur() {
        this.dom && this.dom.blur();
    }

    /**
     * 将菜单的左上角定位在指定的坐标上。
     *
     * @param x - The x coordinate.
     * @param y - The y coordinate.
     * @example
     * ```ts
     * // 在鼠标位置打开上下文菜单
     * window.addEventListener('contextmenu', (event) => {
     *     event.stopPropagation();
     *     event.preventDefault();
     *
     *     menu.hidden = false;
     *     menu.position(event.clientX, event.clientY);
     * });
     * ```
     */
    position(x: number, y: number) {
        const that = this as any;
        const rect = that._containerMenuItems.dom.getBoundingClientRect();

        let left = (x || 0);
        let top = (y || 0);

        // 限制屏幕的底部/顶部
        if (top + rect.height > window.innerHeight) {
            top = window.innerHeight - rect.height;
        } else if (top < 0) {
            top = 0;
        }
        if (left + rect.width > window.innerWidth) {
            left = window.innerWidth - rect.width;
        } else if (left < 0) {
            left = 0;
        }

        this._containerMenuItems.style.left = left + 'px';
        this._containerMenuItems.style.top = top + 'px';

        for (const child of that._containerMenuItems.dom.childNodes) {
            this._limitSubmenuAtScreenEdges(child.ui as MenuItem);
        }
    }

    /**
     *从菜单中删除所有当前菜单项
     */
    clear() {
        this._containerMenuItems.clear();
    }
}

export default Menu;
