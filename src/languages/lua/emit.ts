import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): string {
  return emitBlock(program.block);
}

function emitBlock(block: IR.Block): string {
  return block.children.map((stmt) => emitStatement(stmt, block)).join("\n");
}

function emitStatement(stmt: IR.Statement, parent: IR.Block): string {
  switch (stmt.type) {
    case "WhileLoop":
      return (
        `while ${emitExpr(stmt.condition, stmt)} do\n` +
        emitBlock(stmt.body) +
        `\nend`
      );
    case "ForRangeInclusive": {
      const increment =
        stmt.increment === null ? "" : "," + emitExpr(stmt.increment, stmt);
      return (
        `for ${emitExpr(stmt.variable, stmt)}=${emitExpr(stmt.low, stmt)},` +
        `${emitExpr(stmt.high, stmt)}${increment} do\n` +
        emitBlock(stmt.body) +
        `\nend`
      );
    }
    case "IfStatement":
      return (
        `if ${emitExpr(stmt.condition, stmt)}then\n` +
        emitBlock(stmt.consequent) +
        "\nelse\n" +
        emitBlock(stmt.alternate) +
        "\nend"
      );
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForRange":
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(`Unexpected node (${stmt.type}) while emitting Lua`);
    default:
      return emitExpr(stmt, parent);
  }
}

function emitExpr(expr: IR.Expr, parent: IR.Node): string {
  const inner = emitExprNoParens(expr);
  return needsParens(expr, parent) ? "(" + inner + ")" : inner;
}

/**
 * Does expr need parens around it to override precedence?
 * This does not include needing parens for stuff like function calls
 */
function needsParens(expr: IR.Expr, parent: IR.Node): boolean {
  if (
    parent.type === "MethodCall" &&
    expr === parent.object &&
    expr.type !== "Identifier" &&
    expr.type !== "ArrayGet"
  )
    return true;
  if (parent.type !== "BinaryOp") return false;
  if (expr.type !== "BinaryOp") return false;
  // over-parenthesizes here
  // TODO: check precedence and stuff
  return true;
}

function emitExprNoParens(expr: IR.Expr): string {
  switch (expr.type) {
    case "Assignment":
      return `${emitExpr(expr.variable, expr)}=${emitExpr(expr.expr, expr)}`;
    case "Application":
      throw new Error("Applications should have been removed");
    case "Identifier":
      return expr.name;
    case "StringLiteral":
      // TODO: special string handling
      return JSON.stringify(expr.value);
    case "IntegerLiteral":
      // TODO: avoid exponential notation e.g. 1e20
      return expr.value.toString();
    case "FunctionCall":
      return (
        expr.func +
        "(" +
        expr.args.map((arg) => emitExpr(arg, expr)).join(",") +
        ")"
      );
    case "MethodCall":
      return (
        emitExpr(expr.object, expr) +
        ":" +
        expr.method +
        "(" +
        expr.args.map((arg) => emitExpr(arg, expr)).join(",") +
        ")"
      );
    case "BinaryOp":
      return emitExpr(expr.left, expr) + expr.op + emitExpr(expr.right, expr);
    case "UnaryOp":
      return expr.op + emitExpr(expr.arg, expr);
    case "ArrayGet":
      return (
        emitExpr(expr.array, expr) + "[" + emitExpr(expr.index, expr) + "]"
      );
    default:
      throw new Error(`Unexpected node while emitting Lua: ${expr.type}. `);
  }
}
