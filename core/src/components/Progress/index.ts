import Element from '../Element';
import Container, { ContainerArgs } from '../Container';
import { PREFIX } from '../../class';

const CLASS_ROOT = PREFIX + 'progress';
const CLASS_INNER = CLASS_ROOT + '-inner';

/**
 * {@link Progress}构造函数的参数
 */
export interface ProgressArgs extends ContainerArgs {
    /**
     * 设置进度条的值(介于0到100之间)
     */
    value?: number
}

/**
 * 表示可以突出显示活动进度的条
 */
class Progress extends Container {
    protected _inner = new Element({
        class: CLASS_INNER
    });

    protected _value: number | undefined;

    constructor(args: Readonly<ProgressArgs> = {}) {
        super(args);
        this.class.add(CLASS_ROOT);

        this.append(this._inner);

        if (args.value !== undefined) {
            this.value = args.value;
        }
    }

    /**
     * 获取/设置进度条的值(介于0到100之间)
     */
    set value(val) {
        if (this._value === val) return;

        this._value = val;
        (this._inner.width as any) = `${this._value}%`;
        this.emit('change', val);
    }

    get value() {
        return this._value;
    }
}

Element.register('progress', Progress);

export default Progress;
