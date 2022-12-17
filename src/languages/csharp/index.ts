import {
  functionCall,
  id,
  indexCall,
  methodCall,
  polygolfOp,
  propertyCall,
} from "../../IR";
import { Language } from "../../common/Language";

import emitProgram from "./emit";
import { mapOps, useIndexCalls } from "../../plugins/ops";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
import { evalStaticExpr, golfStringListLiteral } from "../../plugins/static";
import { divToTruncdiv, modToRem } from "../../plugins/divisionOps";
import { forRangeToForCLike } from "../../plugins/loops";
import { addVarDeclarations } from "./plugins";
import { addMutatingBinaryOp } from "../../plugins/binaryOps";

const csharpLanguage: Language = {
  name: "C#",
  emitter: emitProgram,
  plugins: [
    tempVarToMultipleAssignment,
    modToRem,
    divToTruncdiv,
    golfStringListLiteral(false),
    forRangeToForCLike,
    useIndexCalls(),
    mapOps([
      [
        "text_get_slice",
        (x) =>
          methodCall(x[0], [x[1], polygolfOp("add", x[1], x[2])], "Substring"),
      ],
    ]),
    mapOps([
      ["argv_get", (x) => indexCall(id("args", true), x[0])],
      ["true", (_) => id("true", true)],
      ["false", (_) => id("false", true)],
      ["text_length", (x) => propertyCall(x[0], "Length")],
      ["list_push", (x) => methodCall(x[0], [x[1]], "Add")],
      ["text_split", (x) => methodCall(x[0], [x[1]], "Split")],
      ["int_to_text", (x) => methodCall(x[0], [], "ToString")],
      ["repeat", (x) => functionCall(x, "new String")],
      ["print", (x) => functionCall(x, "Console.Write")],
      ["println", (x) => functionCall(x, "Console.WriteLine")],
      ["min", (x) => functionCall(x, "Math.Min")],
      ["max", (x) => functionCall(x, "Math.Max")],
      ["abs", (x) => functionCall(x, "Math.Abs")],
      ["add", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["trunc_div", "/"],
      ["pow", (x) => functionCall(x, "Math.Pow")],
      ["rem", "%"],
      ["bit_and", "&"],
      ["bit_or", "|"],
      ["bit_xor", "^"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "&&"],
      ["or", "||"],
      ["not", "!"],
      ["text_concat", ["+", 100, false]],
      ["neg", "-"],
      ["bit_not", "~"],
      ["text_to_int", (x) => functionCall(x, "int.Parse")],
      ["argv", (x) => id("argv", true)],
    ]),
    addMutatingBinaryOp,
    evalStaticExpr,
    addVarDeclarations,
    renameIdents(),
  ],
};

export default csharpLanguage;
