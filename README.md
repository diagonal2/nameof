# @diagonal2/nameof

Provides a type-safe way to access (get/set) object properties.

## Install

Install with [npm](https://www.npmjs.com/):

```sh
$ npm install --save @diagonal2/nameof
```

## Usage

This package only makes sense if you're using [TypeScript](https://www.typescriptlang.org/).

Use `nameof` to get a string path from a property selector function.

```ts
type T = {
    prop1a: {
         prop2a: number;
    };
    prop1b?: {
         prop2b: number;
    } | null;
};

nameof<T>(t => t.prop1a.prop2a);    // Returns `["prop1a", "prop2a"]`.
nameof<T>(t => t.prop1b?.prop2b);   // Returns `["prop1b", "prop2b"]`.
```

Use `nameofFactory` to reuse `nameof` without repeating the generic type parameter.

```ts
const nameof = nameofFactory<T>();

nameof(t => t.prop1a.prop2a);   // Returns `["prop1a", "prop2a"]`.
nameof(t => t.prop1b?.prop2b);  // Returns `["prop1b", "prop2b"]`.
```

Use `get` to get the value of a property. The property may be described by a selector function or a string array.

```ts
const entity = {
    prop1a: {
        prop2a: [1]
    }
};

get(entity, t => t.prop1a.prop2a[0]);           // Returns 1.
get<number>(entity, ["prop1", "prop2", "0"]);   // Returns 1.
```

Use `set` to set the value of a property. The property may be described by a selector function or a string array.

```ts
type T = {
    prop1?: {
        prop2?: number;
    }
};
const entity1: T = {};
set(entity1, t => t.prop1?.prop2, 1);   // `entity1` becomes `{ prop1: { prop2: 1 } }`.

const entity2 = {};
set(entity2, ["prop1", "prop2"], 1);    // `entity2` becomes `{ prop1: { prop2: 1 } }`.
```

The entire reason why `nameof` was created is that I was unsatisfied with the type-safety issues in [rc-table](https://www.npmjs.com/package/rc-table).
In particular, the `dataIndex` property of `ColumnType` did not have a strict type-check:

```ts
type T = {
    prop1: number;
    prop2: string;
};

const columns: ColumnType<T>[] = [
    {
      title: "Prop 1",
      dataIndex: "prop1x"       // No compiler error
    },
    {
      title: "Prop 2",
      dataIndex: ["prop2x"]     // No compiler error
    }
];
```

This package solves that problem:

```ts
const nameof = nameofFactory<T>();

const columns: ColumnType<T>[] = [
    {
      title: "Prop 1",
      dataIndex: nameof(t => t.prop1)   // Compiler will issue an error if "prop1" is misspelled.
    },
    {
      title: "Prop 2",
      dataIndex: nameof(t => t.prop2)
    }
];
```

## Caveats

This package only makes sense if you use TypeScript, where you can benefit from the compiler autocompleting property selectors `t => t.prop`, etc.
If you use plain JavaScript, then `t => t.prop` provides no benefit over `["prop"]`, so this package won't benefit you.

Also, converting property selector functions to string arrays requires extensive use of [Proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).
Proxies are known to be slow. If your application is performance-critical, avoid this package.

## License

Released under the [MIT License](LICENSE.txt).
Copyright © 2025, https://github.com/diagonal2.