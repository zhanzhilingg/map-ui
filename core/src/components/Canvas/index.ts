import Element, { ElementArgs } from '../Element';
import { PREFIX } from '../../class';

const CLASS_ROOT = PREFIX + 'canvas';

/**
 * {@link Canvas}构造函数的参数
 */
export interface CanvasArgs extends ElementArgs {
    /**
     * 画布是否应该使用{@link https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio devicePixelRatio}。
     * 默认为“false”。
     */
    useDevicePixelRatio?: boolean;
}

/**
 * 表示一个画布
 */
class Canvas extends Element {
    protected _width = 300;

    protected _height = 150;

    protected _ratio = 1;

    constructor(args: Readonly<CanvasArgs> = {}) {
        super({ dom: 'canvas', ...args });

        this.class.add(CLASS_ROOT);

        const { useDevicePixelRatio = false } = args;
        this._ratio = useDevicePixelRatio ? window.devicePixelRatio : 1;

        // 在单击+拖动时禁用
        (this.dom as any).onselectstart = () => {   //evt: Event
            return false;
        };
    }

    /**
     *使用给定的宽度和高度参数调整画布的大小
     *
     * @param width - 画布的新宽度
     * @param height - 画布的新高度
     */
    resize(width: number, height: number) {
        if (this._width === width && this._height === height)
            return;

        this._width = width;
        this._height = height;

        const canvas = this._dom as HTMLCanvasElement;
        canvas.width = this.pixelWidth;
        canvas.height = this.pixelHeight;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        this.emit('resize', width, height);
    }

    /**
     * 获取/设置画布的宽度
     */
    set width(value: number) {
        if (this._width === value)
            return;

        this._width = value;

        const canvas = this._dom as HTMLCanvasElement;
        canvas.width = this.pixelWidth;
        canvas.style.width = value + 'px';

        this.emit('resize', this._width, this._height);
    }

    get width(): number {
        return this._width;
    }


    /**
     * 获取/设置画布的高度
     */
    set height(value: number) {
        if (this._height === value)
            return;

        this._height = value;

        const canvas = this._dom as HTMLCanvasElement;
        canvas.height = this.pixelHeight;
        canvas.style.height = value + 'px';

        this.emit('resize', this._width, this._height);
    }

    get height(): number {
        return this._height;
    }

    /**
     * 获取画布的像素宽度
     */
    get pixelWidth(): number {
        return Math.floor(this._width * this._ratio);
    }

    /**
     * 获取画布的像素高度
     */
    get pixelHeight(): number {
        return Math.floor(this._height * this._ratio);
    }

    /**
     * 获取画布的像素比率
     */
    get pixelRatio(): number {
        return this._ratio;
    }
}

Element.register('canvas', Canvas);

export default Canvas;
