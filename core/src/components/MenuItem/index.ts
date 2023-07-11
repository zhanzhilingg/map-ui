import { Observer } from '../../observer';
import Element, { IBindable } from '../Element';
import Container, { ContainerArgs } from '../Container';
import Label from '../Label';
import { PREFIX } from '../../class';

const CLASS_MENU_ITEM = PREFIX + 'menu-item';
const CLASS_MENU_ITEM_CONTENT = CLASS_MENU_ITEM + '-content';
const CLASS_MENU_ITEM_CHILDREN = CLASS_MENU_ITEM + '-children';
const CLASS_MENU_ITEM_HAS_CHILDREN = CLASS_MENU_ITEM + '-has-children';

/**
 * {@link MenuItem}构造函数的参数。
 */
export interface MenuItemArgs extends ContainerArgs {
    value?: any;
    /**
     * 菜单项是否有子菜单项
     */
    hasChildren?: boolean;
    /**
     * 设置菜单项上显示的文本
     */
    text?: string;
    /**
     * 设置菜单项图标的CSS代码。如'E401'(注意省略了'\\'字符)。
     */
    icon?: string;
    /**
     * 设置父菜单元素
     */
    menu?: any;
    /**
     * 设置选择菜单项时调用的函数
     */
    onSelect?: (evt?: MouseEvent) => void;
    /**
     * 设置确定在显示菜单时是否应启用菜单项的函数
     */
    onIsEnabled?: () => boolean;
    /**
     * 设置一个函数，该函数决定在显示Menu时MenuItem是否应该可见
     */
    onIsVisible?: () => boolean;
    /**
     * MenuItem构造函数数据的数组。如果定义，子菜单项将被创建并添加到菜单项中
     */
    items?: Array<MenuItemArgs>;
}

/**
 * MenuItem是一个附加在{@link Menu}上的可选择选项。
 * MenuItem也可以包含子MenuItem(通过将它们附加到MenuItem)。
 * 这对于显示嵌套菜单非常有用。
 */
class MenuItem extends Container implements IBindable {
    protected _containerContent: Container;

    protected _numChildren = 0;

    protected _icon: string|null|undefined = null;

    protected _labelText: Label;

    protected _containerItems: Container;

    protected _menu: any = null;

    protected _onSelect: ((evt?: MouseEvent) => void) | undefined;

    protected _onIsEnabled: (() => boolean) | undefined;

    protected _onIsVisible: (() => boolean) | undefined;

    protected _renderChanges: boolean | undefined;

    constructor(args: Readonly<MenuItemArgs> = {}) {
        super(args);

        this.class.add(CLASS_MENU_ITEM);

        this._containerContent = new Container({
            class: CLASS_MENU_ITEM_CONTENT,
            flex: true,
            flexDirection: 'row'
        });
        this.append(this._containerContent);

        this._labelText = new Label();
        this._containerContent.append(this._labelText);

        this._containerItems = new Container({
            class: CLASS_MENU_ITEM_CHILDREN
        });
        this.append(this._containerItems);
        const that = this as any;
        that.domContent = this._containerItems.dom;

        this.text = args.text || 'Untitled';

        that.dom.addEventListener('click', this._onClickMenuItem);

        if (args.value) {
            this.value = args.value;
        }
        if (args.icon) {
            this.icon = args.icon;
        }
        if (args.binding) {
            this.binding = args.binding;
        }

        this.onIsEnabled = args.onIsEnabled;
        this.onSelect = args.onSelect;
        this.onIsVisible = args.onIsVisible;

        if (args.items) {
            args.items.forEach((item) => {
                const menuItem = new MenuItem(item);
                this.append(menuItem);
            });
        }
    }

    destroy() {
        if (this.destroyed) return;

        const that = this as any;
        that.dom.removeEventListener('click', this._onClickMenuItem);

        super.destroy();
    }

    protected _onAppendChild(element: Element) {
        super._onAppendChild(element);

        this._numChildren++;
        if (element instanceof MenuItem) {
            this.class.add(CLASS_MENU_ITEM_HAS_CHILDREN);
            element.menu = this.menu;
        }
    }

    protected _onRemoveChild(element: Element) {
        if (element instanceof MenuItem) {
            this._numChildren--;
            if (this._numChildren === 0) {
                this.class.remove(CLASS_MENU_ITEM_HAS_CHILDREN);
            }
            element.menu = null;
        }
        super._onRemoveChild(element);
    }

    protected _onClickMenuItem = (evt: MouseEvent) => {
        evt.preventDefault();
        evt.stopPropagation();
        if (this.enabled) {
            if (this._onSelect)
                this._onSelect(evt);
            this.emit('select');

            if (this.menu) {
                this.menu.hidden = true;
            }
        }
    };

    link(observers: Observer|Observer[], paths: string|string[]) {
        super.link(observers, paths);
        this._labelText.link(observers, paths);
    }

    unlink() {
        super.unlink();
        this._labelText.unlink();
    }

    /**
     * 选择菜单项，当用户单击菜单项时也会自动发生。
     */
    select() {
        if (!this.enabled) return;
        if (this._onSelect) {
            this._onSelect();
        }
        this.emit('select');

        if (this.menu) {
            this.menu.hidden = true;
        }
    }

    /**
     * 获取/设置菜单项上显示的文本。
     */
    set text(value) {
        this._labelText.text = value;
    }

    get text() {
        return this._labelText.text;
    }

    set value(value) {
        this.text = value;
    }

    get value() {
        return this.text;
    }

    /* eslint accessor-pairs: 0 */
    set values(values: string[]) {
        this._labelText.values = values;
    }

    /**
     * 获取/设置菜单项图标的CSS代码。如'E401'(注意省略了'\\'字符)。
     */
    set icon(value) {
        if (this._icon === value || !(value as any).match(/^E[0-9]{0,4}$/)) return;
        this._icon = value;
        if (value) {
            // set data-icon attribute but first convert the value to a code point
            (this._labelText as any).dom.setAttribute('data-icon', String.fromCodePoint(parseInt(value, 16)));
        } else {
            (this._labelText as any).dom.removeAttribute('data-icon');
        }
    }

    get icon() {
        return this._icon;
    }

    /**
     * 获取/设置MenuItem标签的绑定
     */
    set binding(value) {
        this._labelText.binding = value;
    }

    get binding() {
        return this._labelText.binding;
    }

    /**
     * 获取/设置菜单
     */
    set menu(value) {
        this._menu = value;
        const _containerItems = this._containerItems as any;
        // set menu on child menu items
        if (!this._containerItems.destroyed) {
            for (const child of _containerItems.dom.childNodes) {
                if (child.ui instanceof MenuItem) {
                    child.ui.menu = value;
                }
            }
        }
    }

    get menu() {
        return this._menu;
    }

    /**
     * 获取/设置选中MenuItem时调用的函数
     */
    set onSelect(value) {
        this._onSelect = value;
    }

    get onSelect() {
        return this._onSelect;
    }

    /**
     * 获取/设置在启用或禁用MenuItem时调用的函数
     */
    set onIsEnabled(value) {
        this._onIsEnabled = value;
    }

    get onIsEnabled() {
        return this._onIsEnabled;
    }

    /**
     * 获取/设置当MenuItem可见或隐藏时调用的函数
     */
    set onIsVisible(value) {
        this._onIsVisible = value;
    }

    get onIsVisible() {
        return this._onIsVisible;
    }

    /**
     * 返回MenuItem是否有子项
     */
    get hasChildren() {
        return this._numChildren > 0;
    }

    set renderChanges(value) {
        this._renderChanges = value;
    }

    get renderChanges() {
        return this._renderChanges as any;
    }
}

export default MenuItem;
