import Element, { ElementArgs } from '../Element';

const CLASS_ROOT = 'map-ui-divider';

/**
 *表示两个元素之间的垂直分隔
 */
class Divider extends Element {
    constructor(args: Readonly<ElementArgs> = {}) {
        super(args);

        this.class.add(CLASS_ROOT);
    }
}

Element.register('divider', Divider);

export default Divider;
