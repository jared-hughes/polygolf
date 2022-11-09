import { PathFragment } from "../../common/traverse";
import {
  emitStringLiteral,
  joinGroups,
  needsParensPrecedence,
} from "../../common/emit";
import { Expr, IR, ValueType } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitExpr(program.body, program);
}

function emitExpr(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): string[] {
  const inner = emitExprNoParens(expr);
  return needsParens(expr, parent, fragment) ? ["(", ...inner, ")"] : inner;
}

/**
 * Does expr need parens around it to override precedence?
 * This does not include needing parens for stuff like function calls
 */
function needsParens(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): boolean {
  if (needsParensPrecedence(expr, parent, fragment)) {
    return true;
  }
  if (
    parent.type === "MethodCall" &&
    expr === parent.object &&
    expr.type !== "Identifier" &&
    expr.type !== "IndexCall"
  )
    return true;
  return false;
}

function emitExprNoParens(expr: IR.Expr): string[] {
  function emit(...data: (string | Expr | (string | Expr)[])[]) {
    const result: string[] = [];
    for (const part of data) {
      if (typeof part === "string") {
        result.push(part);
      } else if (part instanceof Array) {
        for (const x of part) {
          if (typeof x === "string") result.push(x);
          else result.push(...emitExpr(x, expr));
        }
      } else {
        result.push(...emitExpr(part, expr));
      }
    }
    return result;
  }
  function join(exprs: Expr[], ...sep: string[]) {
    return joinGroups(
      exprs.map((x) => emitExpr(x, expr)),
      ...sep
    );
  }
  switch (expr.type) {
    case "Block":
      return join(expr.children, ";");
    case "WhileLoop":
      return emit(`while`, expr.condition, "do", expr.body, "end");
    case "ManyToManyAssignment":
      return emit(
        "(",
        join(expr.variables, ","),
        ")",
        "=",
        "(",
        join(expr.exprs, ","),
        ")"
      );
    case "IfStatement":
      return emit(
        "if",
        "(",
        expr.condition,
        ")",
        expr.consequent,
        expr.alternate !== undefined ? ["else", expr.alternate] : []
      );
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
      throw new Error(`Unexpected node (${expr.type}) while emitting C#`);
    case "ForCLike":
      return emit(
        "for",
        "(",
        expr.init,
        ";",
        expr.condition,
        ";",
        expr.append,
        ")",
        expr.body
      );
    case "Assignment":
      return emit(expr.variable, "=", expr.expr);
    case "Identifier":
      return [expr.name];
    case "StringLiteral":
      return emitStringLiteral(expr.value, [
        [
          `"`,
          [
            [`\\`, `\\\\`],
            [`\n`, `\\n`],
            [`\r`, `\\r`],
            [`"`, `\\"`],
          ],
        ],
        [
          `'`,
          [
            [`\\`, `\\\\`],
            [`\n`, `\\n`],
            [`\r`, `\\r`],
            [`'`, `\\'`],
          ],
        ],
        [
          [`[[`, `]]`],
          [
            [`[[`, null],
            [`]]`, null],
          ],
        ],
      ]);
    case "IntegerLiteral":
      return [expr.value.toString()];
    case "FunctionCall":
      return emit(expr.ident, "(", join(expr.args, ","), ")");
    case "MethodCall":
      if (expr.property) return emit(expr.object, ".", expr.ident);
      return emit(expr.object, ".", expr.ident, "(", join(expr.args, ","), ")");
    case "BinaryOp":
      return emit(
        emitExpr(expr.left, expr, "left"),
        expr.name,
        emitExpr(expr.right, expr, "right")
      );
    case "UnaryOp":
      return emit(expr.name, expr.arg);
    case "IndexCall":
      if (expr.oneIndexed)
        throw new Error("C# only supports zero indexed access.");
      return emit(expr.collection, "[", expr.index, "]");
    case "ListConstructor":
      return emit(
        "new List<",
        emitType(expr.valueType),
        ">()",
        "{",
        join(expr.exprs, ","),
        "}"
      );

    default:
      throw new Error(
        `Unexpected node while emitting C#: ${expr.type}: ${String(
          "op" in expr ? expr.op : ""
        )}. `
      );
  }
}

function emitType(valueType: ValueType | undefined): string {
  if (valueType === undefined) return "?";
  if (valueType.type === "text") return "string";
  return "TODO";
}
