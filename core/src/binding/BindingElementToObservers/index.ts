import { Observer } from '../../observer';
import BindingBase from '../BindingBase';

/**
 * 提供{@link IBindable}元素和观察者之间的单向绑定。元素的任何更改都将传播到观察者
 * 元素的任何更改都将传播到观察者
 */
class BindingElementToObservers extends BindingBase {
    /**
     * 克隆绑定并返回一个新实例
     */
    clone() {
        return new BindingElementToObservers({
            history: this._history,
            historyPrefix: this._historyPrefix,
            historyPostfix: this._historyPostfix,
            historyName: this._historyName,
            historyCombine: this._historyCombine
        });
    }

    private _getHistoryActionName(paths: string[]) {
        return `${this._historyPrefix || ''}${this._historyName || paths[0]}${this._historyPostfix || ''}`;
    }

    //设置值(或isArrayOfValues的值为true) 给观察者
    private _setValue(value: any, isArrayOfValues: boolean) {
        if (this.applyingChange) return;
        if (!this._observers.length) return;

        this.applyingChange = true;

        // 如果我们使用的是历史记录，就复制观察者
        // 这样我们就可以在将来撤销相同的观察者
        const observers = this._observers.slice();
        const paths = this._paths.slice();
        const context = {
            observers,
            paths
        };

        const execute = () => {
            this._setValueToObservers(observers, paths, value, isArrayOfValues);
            this.emit('history:redo', context);
        };

        if (this._history) {
            let previousValues: any[] = [];
            if (observers.length === 1 && paths.length > 1) {
                previousValues = paths.map((path) => {
                    return observers[0].has(path) ? observers[0].get(path) : undefined;
                });
            } else {
                previousValues = observers.map((observer, i) => {
                    const path = this._pathAt(paths, i);
                    return observer.has(path) ? observer.get(path) : undefined;
                });
            }

            this.emit('history:init', context);

            this._history.add({
                name: this._getHistoryActionName(paths),
                redo: execute,
                combine: this._historyCombine,
                undo: () => {
                    this._setValueToObservers(observers, paths, previousValues, true);
                    this.emit('history:undo', context);
                }
            });
        }

        execute();

        this.applyingChange = false;
    }

    private _setValueToObservers(observers: Observer[], paths: string[], value: any, isArrayOfValues: boolean) {
        // 一个观察者有多条路径(如曲线)的特殊情况
        // 在这种情况下，为每个路径设置每个值
        if (observers.length === 1 && paths.length > 1) {
            for (let i = 0; i < paths.length; i++) {
                const latest: any = observers[0].latest();
                if (!latest) continue;

                let history = false;
                if (latest.history) {
                    history = latest.history.enabled;
                    latest.history.enabled = false;
                }

                const path = paths[i];
                const val = value[i];
                if (value !== undefined) {
                    this._observerSet(latest, path, val);
                } else {
                    latest.unset(path);
                }

                if (history) {
                    latest.history.enabled = true;
                }
            }
            return;
        }

        for (let i = 0; i < observers.length; i++) {
            const latest: any = observers[i].latest();
            if (!latest) continue;

            let history = false;
            if (latest.history) {
                history = latest.history.enabled;
                latest.history.enabled = false;
            }

            const path = this._pathAt(paths, i);
            const val = isArrayOfValues ? value[i] : value;
            if (value !== undefined) {
                this._observerSet(latest, path, val);
            } else {
                latest.unset(path);
            }

            if (history) {
                latest.history.enabled = true;
            }
        }
    }

    // 处理为观察者设置一个值
    // 如果该值是数组
    private _observerSet(observer: Observer, path: string, value: any) {
        // 检查路径中最后一个字段的父字段
        // 存在于观察者中，因为如果它不存在
        // 一个错误很可能会被C3触发
        const lastIndexDot = path.lastIndexOf('.');
        if (lastIndexDot > 0 && !observer.has(path.substring(0, lastIndexDot))) {
            return;
        }

        const isArray = Array.isArray(value);
        // 我们需要在将数组值传递给'set'方法之前将其切片，否则观察者会修改相同的数组实例
        observer.set(path, isArray && value ? value.slice() : value);
    }

    private _addValues(values: any[]) {
        if (this.applyingChange) return;
        if (!this._observers) return;

        this.applyingChange = true;

        // 如果要使用历史记录，就复制观察者，以便将来可以撤销相同的观察者
        const observers = this._observers.slice();
        const paths = this._paths.slice();

        const records: any[] = [];
        for (let i = 0; i < observers.length; i++) {
            const path = this._pathAt(paths, i);
            const observer = observers[i];

            values.forEach((value) => {
                if (observer.get(path).indexOf(value) === -1)  {
                    records.push({
                        observer: observer,
                        path: path,
                        value: value
                    });
                }
            });
        }

        const execute = () => {
            for (const record of records) {
                const latest = record.observer.latest();
                if (!latest) continue;

                const path = record.path;

                let history = false;
                if (latest.history) {
                    history = latest.history.enabled;
                    latest.history.enabled = false;
                }

                latest.insert(path, record.value);

                if (history) {
                    latest.history.enabled = true;
                }
            }
        };

        if (this._history && records.length) {
            this._history.add({
                name: this._getHistoryActionName(paths),
                redo: execute,
                combine: this._historyCombine,
                undo: () => {
                    for (const record of records) {
                        const latest = record.observer.latest();
                        if (!latest) continue;

                        const path = record.path;

                        let history = false;
                        if (latest.history) {
                            history = latest.history.enabled;
                            latest.history.enabled = false;
                        }

                        latest.removeValue(path, record.value);

                        if (history) {
                            latest.history.enabled = true;
                        }
                    }
                }
            });
        }

        execute();

        this.applyingChange = false;
    }

    private _removeValues(values: any[]) {
        if (this.applyingChange) return;
        if (!this._observers) return;

        this.applyingChange = true;

        // 如果要使用历史记录，就复制观察者，以便将来可以撤销相同的观察者
        const observers = this._observers.slice();
        const paths = this._paths.slice();

        const records: any[] = [];
        for (let i = 0; i < observers.length; i++) {
            const path = this._pathAt(paths, i);
            const observer = observers[i];

            values.forEach((value) => {
                const ind = observer.get(path).indexOf(value);
                if (ind !== -1)  {
                    records.push({
                        observer: observer,
                        path: path,
                        value: value,
                        index: ind
                    });
                }
            });
        }

        const execute = () => {
            for (const record of records) {
                const latest = record.observer.latest();
                if (!latest) continue;

                const path = record.path;

                let history = false;
                if (latest.history) {
                    history = latest.history.enabled;
                    latest.history.enabled = false;
                }

                latest.removeValue(path, record.value);

                if (history) {
                    latest.history.enabled = true;
                }
            }
        };

        if (this._history && records.length) {
            this._history.add({
                name: this._getHistoryActionName(paths),
                redo: execute,
                combine: this._historyCombine,
                undo: () => {
                    for (const record of records) {
                        const latest = record.observer.latest();
                        if (!latest) continue;

                        const path = record.path;

                        let history = false;
                        if (latest.history) {
                            history = latest.history.enabled;
                            latest.history.enabled = false;
                        }

                        if (latest.get(path).indexOf(record.value) === -1) {
                            latest.insert(path, record.value, record.index);
                        }

                        if (history) {
                            latest.history.enabled = true;
                        }
                    }
                }
            });
        }

        execute();

        this.applyingChange = false;
    }

    setValue(value: any) {
        this._setValue(value, false);
    }

    setValues(values: any[]) {
        // 确保我们深度复制数组，因为当它们被设置为观察者时不会被克隆
        values = values.slice().map(val => (Array.isArray(val) ? val.slice() : val));
        this._setValue(values, true);
    }

    addValue(value: any) {
        this._addValues([value]);
    }

    addValues(values: any[]) {
        this._addValues(values);
    }

    removeValue(value: any) {
        this._removeValues([value]);
    }

    removeValues(values: any[]) {
        this._removeValues(values);
    }
}

export default BindingElementToObservers;
