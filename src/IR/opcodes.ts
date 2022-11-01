export const BinaryOpCodeArray = [
  // (num, num) => num
  "add",
  "sub",
  "mul",
  "div",
  "trunc_div",
  "exp",
  "mod",
  "rem",
  "bit_and",
  "bit_or",
  "bit_xor",
  "gcd",
  "min",
  "max",
  // (num, num) => bool
  "lt",
  "leq",
  "eq",
  "neq",
  "geq",
  "gt",
  // (bool, bool) => bool
  "or",
  "and",
  // membership
  "array_contains",
  "list_contains",
  "table_contains_key",
  "set_contains",
  // collection get
  "array_get",
  "list_get",
  "table_get",
  "text_get_byte",
  // other
  "list_push",
  "text_concat",
  "repeat",
  "text_contains",
  "text_find",
  "text_split",
  "text_get_char",
  "join_using",
  "right_align",
  "int_to_bin_aligned",
  "int_to_hex_aligned",
  "simplify_fraction",
];
export type BinaryOpCode = typeof BinaryOpCodeArray[number];

export const UnaryOpCodeArray = [
  "argv_get",
  "abs",
  "bit_not",
  "neg",
  "not",
  "int_to_text",
  "int_to_bin",
  "int_to_hex",
  "text_to_int",
  "bool_to_int",
  "byte_to_char",
  "cardinality",
  "text_length",
  "text_split_whitespace",
  "sorted",
  "join",
  "text_reversed",
];
export type UnaryOpCode = typeof UnaryOpCodeArray[number];

export const OpCodeArray = [
  ...BinaryOpCodeArray,
  ...UnaryOpCodeArray,
  "true",
  "false",
  "argv",
  "print",
  "println",
  "text_replace",
  "text_get_slice",
  // collection set
  "array_set",
  "list_set",
  "table_set",
];

export type OpCode = typeof OpCodeArray[number];

export function flipOpCode(op: BinaryOpCode): BinaryOpCode | null {
  switch (op) {
    case "add":
    case "mul":
    case "eq":
    case "neq":
    case "bit_and":
    case "bit_or":
    case "bit_xor":
      return op;
    case "lt":
      return "gt";
    case "gt":
      return "lt";
    case "leq":
      return "geq";
    case "geq":
      return "leq";
  }
  return null;
}

export function booleanNotOpCode(op: BinaryOpCode): BinaryOpCode | null {
  switch (op) {
    case "lt":
      return "geq";
    case "gt":
      return "leq";
    case "leq":
      return "gt";
    case "geq":
      return "lt";
  }
  return null;
}

export function getDefaultPrecedence(op: BinaryOpCode | UnaryOpCode): number {
  switch (op) {
    case "exp":
      return 130;
    case "neg":
      return 120;
    case "repeat":
    case "mul":
    case "div":
    case "mod":
      return 110;
    case "add":
    case "sub":
      return 100;
    case "bit_and":
      return 80;
    case "bit_xor":
      return 70;
    case "bit_or":
      return 60;
    case "text_concat":
      return 50;
    case "lt":
    case "gt":
    case "leq":
    case "geq":
    case "eq":
    case "neq":
    case "array_contains":
    case "set_contains":
    case "list_contains":
    case "inmap":
      return 40;
    case "not":
      return 30;
    case "and":
      return 20;
    case "or":
      return 10;
    default:
      return 0;
  }
}
