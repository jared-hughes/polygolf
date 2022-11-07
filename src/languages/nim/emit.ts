import {
  emitStringLiteral,
  hasChildWithBlock,
  joinGroups,
  needsParensPrecedence,
} from "../../common/emit";
import { PathFragment } from "../../common/traverse";
import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitStatement(program.body, program);
}

function emitBlock(block: IR.Expr, parent: IR.Node): string[] {
  const children = block.type === "Block" ? block.children : [block];
  if (hasChildWithBlock(block)) {
    if (parent.type === "Program") {
      return joinGroups(
        children.map((stmt) => emitStatement(stmt, block)),
        "\n"
      );
    }
    return [
      "$INDENT$",
      "\n",
      ...joinGroups(
        children.map((stmt) => emitStatement(stmt, block)),
        "\n"
      ),
      "$DEDENT$",
    ];
  }
  return joinGroups(
    children.map((stmt) => emitStatement(stmt, block)),
    ";"
  );
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): string[] {
  switch (stmt.type) {
    case "Block":
      return emitBlock(stmt, parent);
    case "VarDeclarationWithAssignment":
      if (stmt.requiresBlock) {
        const variables =
          stmt.assignments.type === "Assignment"
            ? [stmt.assignments.variable]
            : stmt.assignments.variables;
        const exprs =
          stmt.assignments.type === "Assignment"
            ? [stmt.assignments.expr]
            : stmt.assignments.exprs;

        return [
          "var",
          "$INDENT$",
          "\n",
          ...joinGroups(
            variables.map((v, i) => [
              ...emitExprNoParens(v),
              "=",
              ...emitExprNoParens(exprs[i]),
            ]),
            "\n"
          ),
          "$DEDENT$",
        ];
      }
      return ["var", ...emitExprNoParens(stmt.assignments)];
    case "ImportStatement":
      return [
        stmt.name,
        ...joinGroups(
          stmt.modules.map((x) => [x]),
          ","
        ),
      ];
    case "WhileLoop":
      return [
        `while`,
        ...emitExpr(stmt.condition, stmt),
        ":",
        ...emitBlock(stmt.body, stmt),
      ];
    case "ForRange": {
      const increment = emitExpr(stmt.increment, stmt);
      const low =
        stmt.low.type === "IntegerLiteral" &&
        stmt.low.value === 0n &&
        stmt.inclusive
          ? []
          : emitExpr(stmt.low, stmt);
      if (increment.length === 1 && increment[0] === "1") {
        return [
          "for",
          ...emitExpr(stmt.variable, stmt),
          "in",
          ...low,
          stmt.inclusive ? ".." : "..<",
          ...emitExpr(stmt.high, stmt),
          ":",
          ...emitBlock(stmt.body, stmt),
        ];
      }
      if (!stmt.inclusive) {
        throw new Error("Ranges with steps must be inclusive in Nim.");
      }
      return [
        "for",
        ...emitExpr(stmt.variable, stmt),
        "in",
        "countup",
        "(",
        ...emitExpr(stmt.low, stmt),
        ",",
        ...emitExpr(stmt.high, stmt),
        ",",
        ...emitExpr(stmt.increment, stmt),
        ")",
        ":",
        ...emitBlock(stmt.body, stmt),
      ];
    }
    case "IfStatement":
      return [
        "if",
        ...emitExpr(stmt.condition, stmt),
        ":",
        ...emitBlock(stmt.consequent, stmt),
        ...(stmt.alternate !== undefined
          ? ["else", ":", ...emitBlock(stmt.alternate, stmt)]
          : []),
      ];
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(`Unexpected node (${stmt.type}) while emitting Nim`);
    default:
      return emitExpr(stmt, parent);
  }
}

function emitExpr(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): string[] {
  const inner = emitExprNoParens(
    expr,
    parent.type === "BinaryOp" && fragment === "left"
  );
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
  if (parent.type === "MethodCall" && fragment === "object") {
    return expr.type === "UnaryOp" || expr.type === "BinaryOp";
  }
  return false;
}

function emitExprNoParens(
  expr: IR.Expr,
  expressionContinues: boolean = false
): string[] {
  switch (expr.type) {
    case "Assignment":
      return [
        ...emitExpr(expr.variable, expr),
        "=",
        ...emitExpr(expr.expr, expr),
      ];
    case "ManyToManyAssignment":
      return [
        "(",
        ...joinGroups(
          expr.variables.map((v) => emitExprNoParens(v)),
          ","
        ),
        ")",
        "=",
        "(",
        ...joinGroups(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
        ")",
      ];
    case "MutatingBinaryOp":
      return [
        ...emitExpr(expr.variable, expr),
        expr.name + "=",
        ...emitExpr(expr.right, expr),
      ];
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
          `"""`,
          [
            [`\\`, `\\\\`],
            [`"""`, `\\"""`],
          ],
        ],
        [
          [`r"`, `"`],
          [
            [`"`, `""`],
            [`\n`, null],
            [`\r`, null],
          ],
        ],
      ]);
    case "IntegerLiteral":
      return [expr.value.toString()];
    case "FunctionCall":
      if (expr.args.length === 1 && expr.args[0].type === "StringLiteral") {
        return [expr.ident.name, "", ...emitExpr(expr.args[0], expr)];
      }
      if (expressionContinues || expr.args.length > 1)
        return [
          expr.ident.name,
          "(",
          ...joinGroups(
            expr.args.map((arg) => emitExpr(arg, expr)),
            ","
          ),
          ")",
        ];
      return [
        expr.ident.name,
        ...joinGroups(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
      ];
    case "MethodCall":
      if (expressionContinues || expr.args.length > 1)
        return [
          ...emitExpr(expr.object, expr, "object"),
          ".",
          expr.ident.name,
          ...(expr.args.length > 0
            ? [
                "(",
                ...joinGroups(
                  expr.args.map((arg) => emitExpr(arg, expr)),
                  ","
                ),
                ")",
              ]
            : []),
        ];
      else
        return [
          ...emitExpr(expr.object, expr),
          ".",
          expr.ident.name,
          ...(expr.args.length > 0
            ? [
                ...joinGroups(
                  expr.args.map((arg) => emitExpr(arg, expr)),
                  ","
                ),
              ]
            : []),
        ];
    case "BinaryOp":
      return [
        ...emitExpr(expr.left, expr, "left"),
        expr.name,
        ...emitExpr(expr.right, expr, "right"),
      ];
    case "UnaryOp":
      return [expr.name, ...emitExpr(expr.arg, expr)];
    case "ListConstructor":
      return [
        "@",
        "[",
        ...joinGroups(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
        "]",
      ];
    case "IndexCall":
      if (expr.oneIndexed)
        throw new Error("Nim only supports zeroIndexed access.");
      return [
        ...emitExprNoParens(expr.collection),
        "[",
        ...emitExprNoParens(expr.index),
        "]",
      ];

    default:
      throw new Error(
        `Unexpected node while emitting Nim: ${expr.type}: ${
          "op" in expr ? expr.op : ""
        }. `
      );
  }
}
