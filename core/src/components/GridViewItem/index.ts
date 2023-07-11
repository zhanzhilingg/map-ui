import { Observer } from '../../observer';
import { IFocusable } from '../Element';
import Container, { ContainerArgs } from '../Container';
import Label from '../Label';
import BindingObserversToElement from '../../binding/BindingObserversToElement';
import RadioButton from '../RadioButton';
import { PREFIX } from '../../class';

const CLASS_ROOT = PREFIX + 'gridview-item';
const CLASS_ROOT_RADIO = PREFIX + 'gridview-radio-container';
const CLASS_SELECTED = CLASS_ROOT + '-selected';
const CLASS_TEXT = CLASS_ROOT + '-text';
const CLASS_RADIO_BUTTON = PREFIX + 'gridview-radiobtn';

/**
 * {@link GridViewItem}构造函数的参数
 */
export interface GridViewItemArgs extends ContainerArgs {
    /**
     * {@link GridViewItem}的类型。可以是' null '或'radio'。
     */
    type?: string;
    /**
     * 如果为“true”，则允许选择该项目。默认为“true”。
     */
    allowSelect?: boolean;
    /**
     * 项目是否被选中。
     */
    selected?: boolean;
    /**
     * 该项目的文本。默认为“”。
     */
    text?: string;
    /**
     * 设置{@link GridViewItem}的tabIndex。默认为0。
     */
    tabIndex?: number;
}

/**
 *  表示{@link GridView}中使用的网格视图项。
 */
class GridViewItem extends Container implements IFocusable {
    protected _selected: boolean;

    protected _radioButton: RadioButton | undefined | null;

    protected _labelText: Label;

    protected _type: string | null;

    protected _allowSelect: boolean | undefined;

    constructor(args: Readonly<GridViewItemArgs> = {}) {
        super({ tabIndex: 0, ...args });

        this.allowSelect = args.allowSelect ?? true;
        this._type = args.type ?? null;
        this._selected = false;

        if (args.type === 'radio') {
            this.class.add(CLASS_ROOT_RADIO);

            this._radioButton = new RadioButton({
                class: CLASS_RADIO_BUTTON,
                binding: new BindingObserversToElement()
            });

            // @ts-ignore Remove radio button click event listener
            this._radioButton.dom.removeEventListener('click', this._radioButton._onClick);
            // @ts-ignore Remove radio button click event listener
            this._radioButton.dom.addEventListener('click', this._onRadioButtonClick);

            this.append(this._radioButton);
        } else {
            this.class.add(CLASS_ROOT);
        }

        this._labelText = new Label({
            class: CLASS_TEXT,
            binding: new BindingObserversToElement(),
            text: args.text ?? ''
        });

        this.append(this._labelText);

        // @ts-ignore Remove radio button click event listener
        this.dom.addEventListener('focus', this._onFocus);
        // @ts-ignore Remove radio button click event listener
        this.dom.addEventListener('blur', this._onBlur);
    }

    destroy() {
        if (this._destroyed) return;
        
        this.dom && this.dom.removeEventListener('focus', this._onFocus);
        this.dom && this.dom.removeEventListener('blur', this._onBlur);

        super.destroy();
    }

    protected _onRadioButtonClick = () => {
        if (!this._radioButton) return;
        this._radioButton.value = this.selected;
    };

    protected _onFocus = () => {
        this.emit('focus');
    };

    protected _onBlur = () => {
        this.emit('blur');
    };

    focus() {
        this.dom && this.dom.focus();
    }

    blur() {
        this.dom && this.dom.blur();
    }

    link(observers: Observer|Observer[], paths: string|string[]) {
        this._labelText.link(observers, paths);
    }

    unlink() {
        this._labelText.unlink();
    }

    /**
     * 如果为true，则允许选择项目。默认为“true”。
     */
    set allowSelect(value) {
        this._allowSelect = value;
    }

    get allowSelect() {
        return this._allowSelect;
    }

    /**
     * 项目是否被选中。
     */
    set selected(value) {
        if (value) {
            this.focus();
        }

        if (this._selected === value) return;

        this._selected = value;

        if (value) {
            // 更新单选按钮(如果存在)
            if (this._radioButton)
                this._radioButton.value = value;
            else
                this.class.add(CLASS_SELECTED);

            this.emit('select', this);
        } else {
            // 更新单选按钮(如果存在)
            if (this._radioButton)
                this._radioButton.value = false;
            else
                this.class.remove(CLASS_SELECTED);

            this.emit('deselect', this);
        }
    }

    get selected() {
        return this._selected;
    }

    /**
     * 该项目的文本。
     */
    set text(value) {
        this._labelText.text = value;
    }

    get text() {
        return this._labelText.text;
    }

    /**
     * 返回下一个可见的同级网格视图项。
     */
    get nextSibling():any {
        let sibling = this.dom && this.dom.nextSibling;
        while (sibling) {
            if (sibling.ui instanceof GridViewItem && !sibling.ui.hidden) {
                return sibling.ui;
            }

            sibling = sibling.nextSibling;
        }

        return null;
    }

    /**
     * 返回前一个可见的同级网格视图项。
     */
    get previousSibling():any {
        let sibling = this.dom && this.dom.previousSibling;
        while (sibling) {
            if (sibling.ui instanceof GridViewItem && !sibling.ui.hidden) {
                return sibling.ui;
            }

            sibling = sibling.previousSibling;
        }

        return null;
    }
}

export default GridViewItem;
