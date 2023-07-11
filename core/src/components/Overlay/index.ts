import Element, { ElementArgs } from '../Element';
import Container from '../Container';
import { PREFIX } from '../../class';

const CLASS_OVERLAY = PREFIX + 'overlay';
const CLASS_OVERLAY_INNER = CLASS_OVERLAY + '-inner';
const CLASS_OVERLAY_CLICKABLE = CLASS_OVERLAY + '-clickable';
const CLASS_OVERLAY_TRANSPARENT = CLASS_OVERLAY + '-transparent';
const CLASS_OVERLAY_CONTENT = CLASS_OVERLAY + '-content';

/**
 * {@link Overlay}构造函数的参数
 */
export interface OverlayArgs extends ElementArgs {
    /**
     * 是否可以通过点击隐藏覆盖层
     */
    clickable?: boolean,
    /**
     * 覆盖层是否透明
     */
    transparent?: boolean,
}

/**
 * 覆盖元素
 */
class Overlay extends Container {
    protected _domClickableOverlay: HTMLDivElement;

    constructor(args: Readonly<OverlayArgs> = {}) {
        super(args);

        this.class.add(CLASS_OVERLAY);

        const that = this as any;

        this._domClickableOverlay = document.createElement('div');
        this._domClickableOverlay.ui = this;
        this._domClickableOverlay.classList.add(CLASS_OVERLAY_INNER);
        that.dom.appendChild(this._domClickableOverlay);

        this._domClickableOverlay.addEventListener('mousedown', this._onMouseDown);

        this.domContent = document.createElement('div');
        this.domContent.ui = this;
        this.domContent.classList.add(CLASS_OVERLAY_CONTENT);
        that.dom.appendChild(this.domContent);

        this.clickable = args.clickable || false;
        this.transparent = args.transparent || false;
    }

    destroy() {
        if (this._destroyed) return;

        this._domClickableOverlay.removeEventListener('mousedown', this._onMouseDown);

        super.destroy();
    }

    protected _onMouseDown = (evt: MouseEvent) => {
        if (!this.clickable) return;

        // 某些领域可能是焦点
        document.body.blur();

        // 等到模糊完成
        requestAnimationFrame(() => {
            this.hidden = true;
        });

        evt.preventDefault();
    };

    /**
     * 定位覆盖在特定的x, y坐标
     *
     * @param x - The x coordinate.
     * @param y - The y coordinate.
     */
    position(x: number, y: number) {
        const area = this._domClickableOverlay.getBoundingClientRect();
        const rect = this.domContent.getBoundingClientRect();

        x = Math.max(0, Math.min(area.width - rect.width, x));
        y = Math.max(0, Math.min(area.height - rect.height, y));

        this.domContent.style.position = 'absolute';
        this.domContent.style.left = `${x}px`;
        this.domContent.style.top = `${y}px`;
    }

    /**
     * 是否可以通过点击隐藏覆盖层
     */
    set clickable(value) {
        if (value) {
            this.class.add(CLASS_OVERLAY_CLICKABLE);
        } else {
            this.class.remove(CLASS_OVERLAY_CLICKABLE);
        }
    }

    get clickable() {
        return this.class.contains(CLASS_OVERLAY_CLICKABLE);
    }

    /**
     * 覆盖层是否透明
     */
    set transparent(value) {
        if (value) {
            this.class.add(CLASS_OVERLAY_TRANSPARENT);
        } else {
            this.class.remove(CLASS_OVERLAY_TRANSPARENT);
        }
    }

    get transparent() {
        return this.class.contains(CLASS_OVERLAY_TRANSPARENT);
    }
}

Element.register('overlay', Overlay);

export default Overlay;
