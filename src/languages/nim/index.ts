import { functionCall, id, indexCall, int, polygolfOp } from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import { divToTruncdiv, modToRem } from "../../plugins/divisionOps";
import { mapOps, useIndexCalls } from "../../plugins/ops";
import { addDependencies } from "../../plugins/dependencies";
import {
  addImports,
  addVarDeclarations,
  useUFCS,
  useUnsignedDivision,
} from "./plugins";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
import { useInclusiveForRange } from "../../plugins/loops";
import { evalStaticIntegers } from "../../plugins/static";

const nimLanguage: Language = {
  name: "Nim",
  emitter: emitProgram,
  plugins: [
    tempVarToMultipleAssignment,
    modToRem,
    divToTruncdiv,
    useInclusiveForRange,
    useIndexCalls(),
    mapOps([
      [
        "argv_get",
        (x) => functionCall([polygolfOp("add", x[0], int(1n))], "paramStr"),
      ],
    ]),
    mapOps([
      ["str_get_byte", (x) => functionCall([indexCall(x[0], x[1])], "ord")],
      ["str_length", (x) => functionCall(x, "len")],
      ["int_to_str", "$"],
      ["repeat", (x) => functionCall(x, "repeat")],
      ["add", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["truncdiv", "div"],
      ["exp", "^"],
      ["rem", "mod"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "and"],
      ["or", "or"],
      ["str_concat", ["&", 150, false]],
      ["not", ["not", 150]],
      ["neg", ["-", 150]],
      ["str_to_int", (x) => functionCall(x, "parseInt")],
      ["print", (x) => functionCall([id("stdout"), x[0]], "write")],
      ["println", (x) => functionCall(x, "echo")],
      ["min", (x) => functionCall(x, "min")],
      ["max", (x) => functionCall(x, "max")],
      ["abs", (x) => functionCall(x, "abs")],
      ["bool_to_int", (x) => functionCall(x, "int")],
      ["byte_to_char", (x) => functionCall(x, "chr")],
    ]),
    useUFCS,
    useUnsignedDivision,
    evalStaticIntegers,
    addDependencies([
      ["^", "math"],
      ["repeat", "strutils"],
      ["paramStr", "os"],
    ]),
    addImports,
    renameIdents(),
    addVarDeclarations,
  ],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      (/[A-Za-z0-9_]/.test(a[a.length - 1]) && /[A-Za-z0-9_]/.test(b[0])) ||
      ("=+-*/<>@$~&%|!?^.:\\".includes(a[a.length - 1]) &&
        "=+-*/<>@$~&%|!?^.:\\".includes(b[0])) ||
      (/[A-Za-z]/.test(a[a.length - 1]) && b[0] === `"`)
  ),
};

export default nimLanguage;
