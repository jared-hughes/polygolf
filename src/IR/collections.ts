import { Expr, id, Identifier } from "./IR";

export interface StringGet {
  type: "StringGet";
  unicode: boolean;
  string: Expr;
  index: Expr;
  oneIndexed: boolean;
}

export interface ArrayGet {
  type: "ArrayGet";
  array: Expr;
  index: Expr;
  oneIndexed: boolean;
}

export interface ArraySet {
  type: "ArraySet";
  array: Identifier;
  index: Expr;
  value: Expr;
  oneIndexed: boolean;
}

export interface ListGet {
  type: "ListGet";
  list: Expr;
  index: Expr;
  oneIndexed: boolean;
}

export interface ListSet {
  type: "ListSet";
  list: Identifier;
  index: Expr;
  value: Expr;
  oneIndexed: boolean;
}

export interface ListPush {
  type: "ListPush";
  list: Identifier;
  value: Expr;
}

/**
 * Array constructor. Raw OK
 *
 */
export interface ArrayConstructor {
  type: "ArrayConstructor";
  exprs: Expr[];
}

/**
 * List constructor. Raw OK
 *
 */
export interface ListConstructor {
  type: "ListConstructor";
  exprs: Expr[];
}

/**
 * Getting a table value at given key. Raw OK
 *
 * table[key]
 */
export interface TableGet {
  type: "TableGet";
  table: Expr;
  key: Expr;
}

/**
 * Setting a table value at given key. Raw OK
 *
 * table[key] = value
 */
export interface TableSet {
  type: "TableSet";
  table: Identifier;
  key: Expr;
  value: Expr;
}

export function arrayConstructor(exprs: Expr[]): ArrayConstructor {
  return { type: "ArrayConstructor", exprs };
}

export function listConstructor(exprs: Expr[]): ListConstructor {
  return { type: "ListConstructor", exprs };
}

export function tableGet(table: Expr, key: Expr): TableGet {
  return { type: "TableGet", table, key };
}

export function tableSet(
  table: Identifier | string,
  key: Expr,
  value: Expr
): TableSet {
  return {
    type: "TableSet",
    table: typeof table === "string" ? id(table) : table,
    key,
    value,
  };
}

export function stringGet(
  string: Expr,
  index: Expr,
  unicode: boolean = false,
  oneIndexed: boolean = false
): StringGet {
  return { type: "StringGet", string, index, unicode, oneIndexed };
}

export function arrayGet(
  array: Expr,
  index: Expr,
  zeroIndexed = false
): ArrayGet {
  return { type: "ArrayGet", array, index, oneIndexed: zeroIndexed };
}

export function listGet(list: Expr, index: Expr, zeroIndexed = false): ListGet {
  return { type: "ListGet", list, index, oneIndexed: zeroIndexed };
}

export function listSet(
  list: Identifier | string,
  index: Expr,
  value: Expr,
  zeroIndexed = false
): ListSet {
  return {
    type: "ListSet",
    list: typeof list === "string" ? id(list) : list,
    index,
    value,
    oneIndexed: zeroIndexed,
  };
}

export function listPush(list: Identifier | string, value: Expr): ListPush {
  return {
    type: "ListPush",
    list: typeof list === "string" ? id(list) : list,
    value,
  };
}

export function arraySet(
  array: Identifier | string,
  index: Expr,
  value: Expr,
  zeroIndexed = false
): ArraySet {
  return {
    type: "ArraySet",
    array: typeof array === "string" ? id(array) : array,
    index,
    value,
    oneIndexed: zeroIndexed,
  };
}
