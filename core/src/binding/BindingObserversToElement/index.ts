import { EventHandle, Observer } from '../../observer';
import { IBindable } from '../../components';
import BindingBase, { BindingBaseArgs } from '../BindingBase';

export interface BindingObserversToElementArgs extends BindingBaseArgs {
    /**
     * 自定义更新方法
     */
    customUpdate?: (element: IBindable, observers: Observer[], paths: string[]) => void;
}

/**
 * 提供观察者与{@link IBindable}元素和观察者之间的单向绑定。来自观察者的任何更改都将传播到元素。
 */
class BindingObserversToElement extends BindingBase {
    _customUpdate: ((element: IBindable, observers: Observer[], paths: string[]) => void) | undefined;

    _events: EventHandle[] = [];

    _updateTimeout: number|undefined ;

    /**
     * 创建一个新的BindingObserversToElement实例
     *
     * @param args - 参数
     */
    constructor(args: Readonly<BindingObserversToElementArgs> = {}) {
        super(args);

        (this as any)._customUpdate = args.customUpdate;
    }

    private _linkObserver(observer: Observer, path: string) {
        this._events.push(observer.on(path + ':set', this._deferUpdateElement));
        this._events.push(observer.on(path + ':unset', this._deferUpdateElement));
        this._events.push(observer.on(path + ':insert', this._deferUpdateElement));
        this._events.push(observer.on(path + ':remove', this._deferUpdateElement));
    }

    private _deferUpdateElement = () => {
        if (this.applyingChange) return;
        this.applyingChange = true;

        this._updateTimeout = window.setTimeout(() => {
            this._updateElement();
        });
    };

    private _updateElement() {
        if (this._updateTimeout) {
            window.clearTimeout(this._updateTimeout);
            this._updateTimeout = undefined;
        }

        this._updateTimeout = undefined;
        this.applyingChange = true;

        if (!this._element) return;
        if (typeof this._customUpdate === 'function') {
            this._customUpdate(this._element, this._observers, this._paths);
        } else if (this._observers.length === 1) {
            if (this._paths.length > 1) {
                // 如果为单个观察者使用多个路径(例如曲线)，则为每个路径返回一个值数组
                this._element.value = this._paths.map((path) => {
                    return this._observers[0].has(path) ? this._observers[0].get(path) : undefined;
                });
            } else {
                this._element.value = (this._observers[0].has(this._paths[0]) ? this._observers[0].get(this._paths[0]) : undefined);
            }
        } else {
            this._element.values = this._observers.map((observer, i) => {
                const path = this._pathAt(this._paths, i);
                return observer.has(path) ? observer.get(path) : undefined;
            });
        }

        this.applyingChange = false;
    }

    link(observers: Observer|Observer[], paths: string|string[]) {
        super.link(observers, paths);

        // 链接时不要渲染更改
        if (this._element) {
            const renderChanges = this._element.renderChanges;
            this._element.renderChanges = false;
            this._updateElement();
            this._element.renderChanges = renderChanges;
        }

        if (this._observers.length === 1) {
            if (this._paths.length > 1) {
                for (let i = 0; i < this._paths.length; i++) {
                    this._linkObserver(this._observers[0], this._paths[i]);
                }
                return;
            }
        }

        for (let i = 0; i < this._observers.length; i++) {
            this._linkObserver(this._observers[i], this._pathAt(this._paths, i));
        }
    }

    /**
     * 从它的观察器集中解除绑定的链接
     */
    unlink() {
        for (const event of this._events) {
            event.unbind();
        }
        this._events.length = 0;

        if (this._updateTimeout) {
            window.clearTimeout(this._updateTimeout);
            this._updateTimeout = undefined;
        }

        super.unlink();
    }

    /**
     * 克隆BindingObserversToElement实例
     */
    clone() {
        return new BindingObserversToElement({
            customUpdate: this._customUpdate
        });
    }
}

export default BindingObserversToElement;
