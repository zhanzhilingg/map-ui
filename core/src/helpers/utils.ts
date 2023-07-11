export function deepCopy(data: any) {
  if (data == null || typeof (data) !== 'object')
      return data;

  if (data instanceof Array) {
      const arr: any[] = [];
      for (let i = 0; i < data.length; i++) {
          arr[i] = deepCopy(data[i]);
      }
      return arr;
  }

  const obj: any = { };
  for (const key in data) {
      if (data.hasOwnProperty(key))
          obj[key] = deepCopy(data[key]);
  }
  return obj;
}

export function arrayEquals(lhs: Array<any>, rhs: Array<any>) {
  if (!lhs)
      return false;

  if (!rhs)
      return false;

  if (lhs.length !== rhs.length)
      return false;

  for (let i = 0, l = lhs.length; i < l; i++) {
      if (lhs[i] instanceof Array && rhs[i] instanceof Array) {
          if (!lhs[i].equals(rhs[i]))
              return false;
      } else if (lhs[i] !== rhs[i]) {
          return false;
      }
  }
  return true;
}

const _typeLookup = function () {
	const result = {} as any;
	const names = ['Array', 'Object', 'Function', 'Date', 'RegExp', 'Float32Array'];
	for (let i = 0; i < names.length; i++) {
        result['[object ' + names[i] + ']'] = names[i].toLowerCase();
    }
	return result;
}();
export function type(obj:any):string {
	if (obj === null) {
		return 'null';
	}
	const type = typeof obj;
	if (type === 'undefined' || type === 'number' || type === 'string' || type === 'boolean') {
		return type;
	}
	return (_typeLookup as any)[Object.prototype.toString.call(obj)];
}
export function extend(target:Object, ex:Object) {
	for (const prop in ex) {
		const copy = (ex as any)[prop];
		if (type(copy) === 'object') {
			(target as any)[prop] = extend({}, copy);
		} else if (type(copy) === 'array') {
			(target as any)[prop] = extend([], copy);
		} else {
			(target as any)[prop] = copy;
		}
	}
	return target;
}