"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameofFactory = exports.nameof = void 0;
exports.get = get;
exports.set = set;
function safeCast(value) {
    return value;
}
/**
 * Returns an "apparently empty object".
 * However when you access a property, it does not return `undefined`.
 * Instead it records the name of the accessed property, append it to {@link path}, and returns another "apparently empty object".
 *
 * It's kind of hard to explain this in words.
 * Copy {@link proxyMagic} and {@link nameof} to TS playground, and try it with some complex type T!
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const proxyMagic = (path) => {
    return new Proxy({}, {
        get: (_, name) => {
            if (typeof name === "string") {
                path.push(name);
                return proxyMagic(path);
            }
            else {
                throw new TypeError("Entity contains a non-string key type.");
            }
        }
    });
};
/**
 * Given a property selector, returns a string array containing the sequence of accessed property names.
 *
 * @example
 * ```ts
 * type T = {
 *     prop1a: {
 *          prop2a: number;
 *     };
 *     prop1b?: {
 *          prop2b: number;
 *     } | null;
 * };
 *
 * nameof<T>(t => t.prop1a.prop2a);    // Returns `["prop1a", "prop2a"]`.
 * nameof<T>(t => t.prop1b?.prop2b);   // Returns `["prop1b", "prop2b"]`.
 * ```
 *
 * @param selector
 * {@link Selector}
 *
 * @returns An string array describing the property selector
 */
const nameof = (selector) => {
    const path = [];
    const proxy = proxyMagic(path);
    selector(proxy);
    return path;
};
exports.nameof = nameof;
/**
 * When using {@link nameof}, you need to specify the generic parameter `T` every time.
 * This gets clumsy if you need to use {@link nameof} for the same parameter multiple times.
 * In this case, use this function to generate a {@link nameof} with the generic parameter pre-specified.
 *
 * @example
 * ```ts
 * type T = {
 *     prop1a: number;
 *     prop1b: number;
 * };
 *
 * const nameof = nameofFactory<T>();
 *
 * nameof(t => t.prop1a);
 * nameof(t => t.prop1b);
 * ```
 *
 * @returns The {@link nameof} function with defined generic parameter
 */
const nameofFactory = () => exports.nameof;
exports.nameofFactory = nameofFactory;
function get(entity, selectorOrPath) {
    const path = typeof selectorOrPath === "function" ? (0, exports.nameof)(selectorOrPath) : selectorOrPath;
    let output = entity;
    for (let i = 0; i < path.length; i++) {
        if (typeof output === "object" && output != null) {
            const object = safeCast(output);
            const key = path[i];
            if (key in object) {
                output = object[key];
            }
            else {
                return undefined;
            }
        }
        else {
            return undefined;
        }
    }
    return output;
}
function set(entity, selectorOrPath, value) {
    const path = typeof selectorOrPath === "function" ? (0, exports.nameof)(selectorOrPath) : selectorOrPath;
    let object = safeCast(entity);
    for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (i !== path.length - 1) {
            const value = object[key];
            if (typeof value === "object" && value != null) {
                object = safeCast(value);
            }
            else if (value == null) {
                const newValue = {};
                object[key] = newValue;
                object = newValue;
            }
            else {
                throw new TypeError(`Path [${path}] conflicts with the entity structure.`);
            }
        }
        else {
            object[key] = value;
        }
    }
}
