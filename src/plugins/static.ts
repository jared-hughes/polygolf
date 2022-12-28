import {
  getArgs,
  int,
  isFiniteBound,
  isOpCode,
  polygolfOp,
  StringLiteral,
  stringLiteral,
  variants,
  voidType,
} from "../IR";
import { getType } from "../common/getType";
import { GolfPlugin } from "../common/Language";
import { Spine } from "../common/Spine";

export const golfStringListLiteral: GolfPlugin = {
  tag: "golf",
  name: "golfStringListLiteral",
  *visit(spine: Spine) {
    const node = spine.node;
    if (
      node.kind === "ListConstructor" &&
      node.exprs.every((x) => x.kind === "StringLiteral")
    ) {
      const strings = (node.exprs as StringLiteral[]).map((x) => x.value);
      const delim = getDelim(strings);
      yield spine.replacedWithRoot(
        variants(
          delim === " "
            ? (polygolfOp(
                "text_split_whitespace",
                stringLiteral(strings.join(delim))
              ) as any) // temporary "as any" to delay making the whole code base immutable
            : polygolfOp(
                "text_split",
                stringLiteral(strings.join(delim)),
                stringLiteral(delim)
              )
        )
      );
    }
  },
};

function getDelim(strings: string[]): string {
  const string = strings.join();
  if (!/\s/.test(string)) return " ";
  for (let i = 33; i < 127; i++) {
    const c = String.fromCharCode(i);
    if (!string.includes(c)) {
      return c;
    }
  }
  let i = 0;
  while (string.includes(String(i))) {
    i++;
  }
  return String(i);
}

export const evalStaticExpr: GolfPlugin = {
  tag: "golf",
  name: "evalStaticExpr",
  *visit(spine: Spine) {
    const node = spine.node;
    if (
      "op" in node &&
      node.op !== null &&
      isOpCode(node.op) &&
      node.kind !== "MutatingBinaryOp"
    ) {
      // temporary "as any" to delay making the whole code base immutable
      const args = getArgs(node as any);
      let type = voidType;
      try {
        // encoutering nodes that we don't know the type of is fine
        type = getType(node as any, spine.root.node);
      } catch {}
      if (
        // if the inferred type of the node is a constant integer, replace it with a literal node
        type.kind === "integer" &&
        isFiniteBound(type.low) &&
        type.low === type.high
      ) {
        yield spine.replacedWithRoot(int(type.low));
      } else if (args.every((x) => x.kind === "StringLiteral")) {
        const argsVals = args.map((x) => (x as StringLiteral).value);
        if (node.op === "text_concat")
          yield spine.replacedWithRoot(
            stringLiteral(argsVals[0].concat(argsVals[1]))
          );
      }
    }
  },
};
