import { Events, History, Observer } from '../../observer';
import { IBindable } from '../../components/Element';

export interface BindingBaseArgs {
    /**
     * 被绑定的元素
     */
    element?: IBindable,
    /**
     * 历史对象，用于记录撤消/重做操作
     * 如果没有提供，则不记录历史
     */
    history?: History,
    /**
     * 用于每个历史操作名称的前缀
     */
    historyPrefix?: string,
    /**
     * 用于每个历史操作名称的后缀
     */
    historyPostfix?: string,
    /**
     * 每个历史操作的名称
     */
    historyName?: string,
    /**
     * 是否合并历史操作
     */
    historyCombine?: boolean
}

/**
 * 观察者（Observers）和{@link IBindable} {@link Element}之间数据绑定的基类 
 */
class BindingBase extends Events {
    protected _observers: Observer[] = [];

    protected _paths: string[] = [];

    protected _applyingChange = false;

    protected _element?: IBindable;

    protected _history?: History;

    protected _historyPrefix?: string;

    protected _historyPostfix?: string;

    protected _historyName?: string;

    protected _historyCombine: boolean;

    protected _linked = false;

    /**
     * 创建一个新的绑定
     *
     * @param args - 参数
     */
    constructor(args: Readonly<BindingBaseArgs>) {
        super();

        this._element = args.element;

        this._history = args.history;
        this._historyPrefix = args.historyPrefix;
        this._historyPostfix = args.historyPostfix;
        this._historyName = args.historyName;
        this._historyCombine = args.historyCombine || false;
    }

    // 返回指定索引处的通道
    // 如果第一个索引不存在，则返回第一个索引处的通道
    protected _pathAt(paths: string[], index: number) {
        return paths[index] || paths[0];
    }

    /**
     * 将指定的观察者链接到指定的通道
     *
     * @param observers - 观察者
     * @param paths - 通道，绑定的行为取决于传递了多少条通道
     * 如果传递的通道和观察者数量相等，那么绑定将把每个通道映射到每个索引处的每个观察者
     * 如果传递的观察者多于通道，则索引0处的通道将用于所有观察者
     * 如果传递了一个观察者和多条通道，那么所有的通道都将用于观察者(例如曲线)
     */
    link(observers: Observer|Observer[], paths: string|string[]) {
        if (this._observers) {
            this.unlink();
        }

        this._observers = Array.isArray(observers) ? observers : [observers];
        this._paths = Array.isArray(paths) ? paths : [paths];

        this._linked = true;
    }

    /**
     * 解除观察者和通道的链接
     */
    unlink() {
        this._observers = [];
        this._paths = [];
        this._linked = false;
    }

    /**
     * 克隆的绑定,通过派生类实现
     */
    clone(): BindingBase {
        throw new Error('BindingBase#clone: Not implemented');
    }

    /**
     * 为链接通道上的链接观察者设置一个值
     *
     * @param value - The value
     */
    setValue(value: any) {
        console.log(value)
    }

    /**
     * 为链接通道上的链接观察者设置一个值数组
     *
     * @param values - The values.
     */
    setValues(values: any[]) {
        console.log(values)
    }

    /**
     * 向链接通道上的链接观察者添加(插入)一个值
     *
     * @param value - The value.
     */
    addValue(value: any) {
        console.log(value)
    }

    /**
     * 向链接通道上的链接观察者添加(插入)多个值
     *
     * @param values - The values.
     */
    addValues(values: any[]) {
        console.log(values)
    }

    /**
     * 从链接通道上的链接观察者中移除一个值
     *
     * @param value - The value.
     */
    removeValue(value: any) {
        console.log(value)
    }

    /**
     * 从链接通道的链接观察者中删除多个值
     *
     * @param values - The values.
     */
    removeValues(values: any[]) {
        console.log(values)
    }

    /**
     * 元素
     */
    set element(value: IBindable | undefined) {
        this._element = value;
    }

    get element(): IBindable | undefined {
        return this._element;
    }

    /**
     * 绑定当前是否对观察者或元素应用更改
     */
    set applyingChange(value) {
        if (this._applyingChange === value) return;

        this._applyingChange = value;
        this.emit('applyingChange', value);
    }

    get applyingChange() {
        return this._applyingChange;
    }

    /**
     * 绑定是否链接到观察器
     */
    get linked() {
        return this._linked;
    }

    /**
     * 如果使用了历史模块，是否在对观察者应用更改时合并历史操作
     */
    set historyCombine(value) {
        this._historyCombine = value;
    }

    get historyCombine() {
        return this._historyCombine;
    }

    /**
     * 当对观察者应用更改时，历史操作的名称
     */
    set historyName(value) {
        this._historyName = value;
    }

    get historyName() {
        return this._historyName;
    }

    /**
     * 作为historyName前缀的字符串
     */
    set historyPrefix(value) {
        this._historyPrefix = value;
    }

    get historyPrefix() {
        return this._historyPrefix;
    }

    /**
     * 给historyName添加后缀的字符串
     */
    set historyPostfix(value) {
        this._historyPostfix = value;
    }

    get historyPostfix() {
        return this._historyPostfix;
    }

    /**
     * 是否为绑定启用历史记录。必须首先提供有效的历史记录对象。
     */
    set historyEnabled(value) {
        if (this._history) {
            // @ts-ignore
            this._history.enabled = value;
        }
    }

    get historyEnabled() {
        // @ts-ignore
        return this._history && this._history.enabled;
    }

    /**
     * 已链接的观察者
     */
    get observers() {
        return this._observers;
    }

    /**
     * 已链接的通道
     */
    get paths() {
        return this._paths;
    }
}

export default BindingBase;
