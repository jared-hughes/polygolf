import { PathFragment } from "../../common/traverse";
import {
  emitStringLiteral,
  joinGroups,
  needsParensPrecedence,
} from "../../common/emit";
import { Expr, IR, isSubtype, toString, Type } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitExpr(program.body, program);
}

function emitExpr(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): string[] {
  if (expr.kind === "Block") {
    if (parent.kind !== "Program") {
      return [
        "{",
        ...joinGroups(expr.children.map((x) => emitExpr(x, expr, "body"))),
        "}",
      ];
    }
    return [...joinGroups(expr.children.map((x) => emitExpr(x, expr, "body")))];
  }
  const inner = emitExprNoParens(expr);
  if (
    (fragment === "body" ||
      fragment === "consequent" ||
      fragment === "alternate" ||
      parent.kind === "Block") &&
    !("body" in expr || "consequent" in expr || "alternate" in expr)
  )
    inner.push(";");
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
  if (parent.kind === "MethodCall" && fragment === "object") {
    return expr.kind === "UnaryOp" || expr.kind === "BinaryOp";
  }
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
  switch (expr.kind) {
    case "WhileLoop":
      return emit(
        `while`,
        "(",
        expr.condition,
        ")",
        emitExpr(expr.body, expr, "body")
      );
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
        emitExpr(expr.consequent, expr, "consequent"),
        expr.alternate !== undefined
          ? ["else", ...emitExpr(expr.alternate, expr, "alternate")]
          : []
      );
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
      throw new Error(`Unexpected node (${expr.kind}) while emitting C#`);
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
        emitExpr(expr.body, expr, "body")
      );
    case "Assignment":
      return emit(expr.variable, "=", expr.expr);
    case "VarDeclarationWithAssignment":
      return emit("var", expr.assignments);
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
    case "MutatingBinaryOp":
      return emit(
        emitExpr(expr.variable, expr, "left"),
        expr.name + "=",
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
        "new",
        emitType(expr.type),
        "()",
        "{",
        join(expr.exprs, ","),
        "}"
      );

    default:
      throw new Error(
        `Unexpected node while emitting C#: ${expr.kind}: ${String(
          "op" in expr ? expr.op : ""
        )}. `
      );
  }
}

function emitType(type: Type | undefined): string {
  if (type === undefined) return "?";
  switch (type.kind) {
    case "text":
      return "string";
    case "integer":
      if (isSubtype(type, "int64")) return "int";
      break;
    case "boolean":
      return "string";
    case "void":
      return "void";
    case "Array":
      return `${emitType(type.member)}[${type.length}]`;
    case "List":
      return `List<${emitType(type.member)}>`;
    case "Set":
      return `HashSet<${emitType(type.member)}>`;
    case "Table":
      return `HashMap<${emitType(type.key)},${emitType(type.value)}>`;
  }
  throw new Error(`Cannot emit type ${toString(type)} to C#.`);
}
