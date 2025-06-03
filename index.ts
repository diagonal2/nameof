/** This casts an `object` to a `Record<string, unknown>`. It should be always safe. */
function safeCast(value: object): Record<string, unknown>;
function safeCast(value: unknown): unknown {
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
const proxyMagic = (path: string[]): any => {
    return new Proxy({}, {
        get: (_, name) => {
            if (typeof name === "string") {
                path.push(name);
                return proxyMagic(path);
            } else {
                throw new TypeError("Entity contains a non-string key type.");
            }
        }
    });
};

/**
 * Accepts a property selector.
 * It should look like `t => t.prop1.prop2.[...].propn`, although each access operator `.` may be replaced with the null-propagating operator `?.`.
 * 
 * Putting other kinds of functions will lead to unexpected results, please don't do that!
 */
type Selector<T, U = unknown> = (entity: T) => U;

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
export const nameof = <T>(selector: Selector<T>): string[] => {
    const path: string[] = [];
    const proxy = proxyMagic(path);
    selector(proxy);
    return path;
};

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
export const nameofFactory = <T>() => nameof<T>;

/**
 * This should yield the same result as just `selector(entity)`.
 * It isn't very useful, and is only included to match the overloads of {@link set}.
 * 
 * @example
 * ```ts
 * const entity = {
 *     prop1: {
 *         prop2: [1]
 *     }
 * };
 * 
 * get(entity, t => t.prop1.prop2[0]);     // Returns 1.
 * ```
 * 
 * @param entity
 * Accepts an entity of which you wish to access a property.
 * 
 * @param selector
 * {@link Selector}
 * 
 * @returns The value of the property accessed by {@link selector}
 */
export function get<T extends object, U>(entity: T, selector: Selector<T, U>): U | undefined;
/**
 * Access the property of {@link entity} specified by {@link path}, and returns its value.
 * If that property does not exist, returns `undefined`.
 * This function never throws an error.
 * 
 * @example
 * ```ts
 * const entity = {
 *     prop1: {
 *         prop2: [1]
 *     }
 * };
 * 
 * get<number>(entity, ["prop1", "prop2", "0"]);   // Returns 1.
 * ```
 * 
 * @param entity
 * Accepts an entity of which you wish to access a property.
 * 
 * @param path
 * Accepts a string array which represents a sequence of property names leading to the property you wish to access.
 * 
 * @returns The value of the property accessed by {@link path}
 */
export function get<U>(entity: object, path: string[]): U | undefined;
export function get(entity: object, selectorOrPath: ((entity: object) => unknown) | string[]): unknown {
    const path = typeof selectorOrPath === "function" ? nameof(selectorOrPath) : selectorOrPath;
    let output: unknown = entity;
    for (let i = 0; i < path.length; i++) {
        if (typeof output === "object" && output != null) {
            const object = safeCast(output);
            const key = path[i];
            if (key in object) {
                output = object[key];
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    }
    return output;
}

/**
 * This type does nothing by itself; `DelayedExpansion<U>` always equals `U`.
 * 
 * Instead it is used for altering generic type inference in {@link set}.
 * 
 * Consider the following code:
 * ```ts
 * const f1 = <U>(selector: () => U, value: U) => selector() === value;
 * const selector1 = () => 1;
 * const value1 = "one" as string | number;
 * f1(selector1, value1);      // This gives no compiler error because `U` is inferred to be `string | number`.
 * 
 * const f2 = <U>(selector: () => U, value: DelayedExpansion<U>) => selector() === value;
 * const selector2 = () => 1;
 * const value2 = "one" as string | number;
 * f2(selector2, value2);      // This gives a compiler error because `U` is inferred to be `number`.
 * ```
 */
export type DelayedExpansion<U> = U extends null        // This checks if `U` is `null`.
    ? null
    : U extends undefined                               // This checks if `U` is `undefined`.
        ? undefined
        : 0 extends (1 & U)                             // This checks if `U` is `any`.
            ? any
            : unknown extends U                         // This checks if `U` is `unknown` or `any`, but we already ruled out `any`.
                ? unknown
                : (U & {});                             // This is just `U` itself if `U` is not `null`, `undefined` or `unknown`.

/**
 * Access the property of {@link entity} specified by {@link selector}, and sets its value to {@link value}.
 * If that property does not exist, for example because {@link selector} contains the null-propagating operator `?.`, then a new property is created.
 * 
 * If TS argument types are respected, this function should only throw an error when you do something inherently problematic.
 * For example, definining a property on a primitive or setting a read-only property still throws an error.
 * 
 * @example
 * ```ts
 * type T = {
 *     prop1?: {
 *         prop2?: number;
 *     };
 * };
 * 
 * const entity1: T = {};
 * set(entity1, t => t.prop1, { prop2: 1 });   // `entity1` becomes `{ prop1: { prop2: 1 } }`.
 * 
 * const entity2: T = {};
 * set(entity2, t => t.prop1?.prop2, 2);       // `entity2` becomes `{ prop1: { prop2: 2 } }`.
 * ```
 * 
 * @param entity
 * Accepts an entity of which you wish to access a property.
 * 
 * @param selector
 * {@link Selector}
 * 
 * @param value
 * Accepts a value to which you wish to set the property.
 */
export function set<T extends object, U>(entity: T, selector: (entity: T) => U, value: DelayedExpansion<U>): void;
/**
 * Access the property of {@link entity} specified by {@link path}, and sets its value to {@link value}.
 * If that property does not exist, then a new property is created.
 * If {@link path} conflicts with an existing property, then a {@link TypeError} is thrown.
 * 
 * @example
 * ```ts
 * const entity1 = {};
 * //          or `{ prop1: undefined }`
 * //          or `{ prop1: null }`
 * //          or `{ prop1: {} }`
 * set(entity1, ["prop1", "prop2"], 1);    // `entity1` becomes `{ prop1: { prop2: 1 } }`.
 * 
 * const entity2 = { prop1b: 2 };
 * set(entity2, ["prop1", "prop2"], 1);    // `entity2` becomes `{ prop1: { prop2: 1 }, prop1b: 2 }`.
 * 
 * const entity3 = { prop1: 3 };
 * set(entity3, ["prop1", "prop2"], 1);    // Throws TypeError.
 * ```
 * 
 * @param entity
 * Accepts an entity of which you wish to access a property.
 * 
 * @param path
 * Accepts a string array which represents a sequence of property names leading to the property you wish to access.
 * 
 * @param value
 * Accepts a value to which you wish to set the property.
 */
export function set(entity: object, path: string[], value: unknown): void;
export function set(entity: object, selectorOrPath: ((entity: object) => unknown) | string[], value: unknown): void {
    const path = typeof selectorOrPath === "function" ? nameof(selectorOrPath) : selectorOrPath;
    let object = safeCast(entity);
    for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (i !== path.length - 1) {
            const value = object[key];
            if (typeof value === "object" && value != null) {
                object = safeCast(value);
            } else if (value == null) {
                const newValue: Record<string, unknown> = {};
                object[key] = newValue;
                object = newValue;
            } else {
                throw new TypeError(`Path [${path}] conflicts with the entity structure.`);
            }
        } else {
            object[key] = value;
        }
    }
}
