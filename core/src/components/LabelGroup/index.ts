import Element from '../Element';
import Container, { ContainerArgs } from '../Container';
import Label from '../Label';
import { PREFIX } from '../../class';

const CLASS_LABEL_GROUP = PREFIX + 'label-group';
const CLASS_LABEL_TOP = CLASS_LABEL_GROUP + '-align-top';

/**
 * {@link LabelGroup}构造函数的参数。
 */
export interface LabelGroupArgs extends ContainerArgs {
    /**
     * 标签文本。默认为“Label”。
     */
    text?: string;
    /**
     * 由标签组包装的{@link Element}。
     */
    field?: Element;
    /**
     * 是否在组的顶部对齐标签。默认为' false '，它将在中心对齐。
     */
    labelAlignTop?: boolean;
    /**
     * 向标签添加本地工具提示。
     */
    nativeTooltip?: boolean;
}

/**
 * 表示一个由{@link Element}和{@link Label}组成的组。用于标记字段的行。
 */
class LabelGroup extends Container {
    protected _label: Label;

    protected _field: Element | null;

    constructor(args: Readonly<LabelGroupArgs> = {}) {
        super(args);

        this.class.add(CLASS_LABEL_GROUP);

        this._label = new Label({
            text: args.text ?? 'Label',
            nativeTooltip: args.nativeTooltip
        });
        this.append(this._label);

        this._field = args.field ?? null;
        if (this._field) {
            this.append(this._field);
        }

        (this.labelAlignTop as any) = args.labelAlignTop;
    }

    /**
     * The label element.
     */
    get label() {
        return this._label;
    }

    /**
     * The field element.
     */
    get field() {
        return this._field;
    }

    /**
     * 设置/获取标签的文本。
     */
    set text(value) {
        this._label.text = value;
    }

    get text() {
        return this._label.text;
    }

    /**
     * 设置/获取是否在组的顶部对齐标签。默认为' false '，它将在中心对齐。
     */
    set labelAlignTop(value) {
        if (value) {
            this.class.add(CLASS_LABEL_TOP);
        } else {
            this.class.remove(CLASS_LABEL_TOP);
        }
    }

    get labelAlignTop() {
        return this.class.contains(CLASS_LABEL_TOP);
    }
}

Element.register('labelgroup', LabelGroup);

export default LabelGroup;
