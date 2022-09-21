import { Expr, IR, Program } from "../IR";
import { expandVariants } from "./expandVariants";
import { programToPath, Path } from "./traverse";
import { Language, IdentifierGenerator, OpTransformOutput } from "./Language";
import { getType } from "./getType";

function applyLanguageToVariant(
  language: Language,
  program: IR.Program
): string {
  const path = programToPath(program);
  // Apply each visitor sequentially, re-walking the tree for each one
  // A different option is to merge visitors together (like Babel) to apply
  // them simultaneously, but be careful to go in order between the plugins
  for (const visitor of language.plugins) {
    path.visit(visitor);
  }
  if (language.dependencyMap !== undefined) {
    addDependencies(path, language.dependencyMap);
  }
  const identMap = getIdentMap(path, language.identGen);
  if (language.opMap !== undefined) {
    path.visit(mapOps(language.opMap, program));
  }
  path.visit(nameIdents(identMap));
  return language.emitter(program);
}

function addDependencies(
  programPath: Path<IR.Program>,
  dependencyMap: Map<string, string>
) {
  programPath.visit({
    enter(path: Path) {
      const node = path.node;
      let op: string = node.type;
      if (node.type === "BinaryOp" || node.type === "UnaryOp") op = node.op;
      if (node.type === "FunctionCall") op = node.name;
      if (node.type === "MethodCall") op = node.name;
      if (dependencyMap.has(op)) {
        programPath.node.dependencies.add(dependencyMap.get(op)!);
      }
    },
  });
}

function getIdentMap(
  path: Path<IR.Program>,
  identGen: IdentifierGenerator
): Map<string, string> {
  // First, try mapping as many idents as possible to their preferred versions
  const inputNames = path.getUsedIdentifiers();
  const outputNames = new Set<string>();
  const result = new Map<string, string>();
  for (const iv of inputNames) {
    for (const preferred of identGen.preferred(iv)) {
      if (!outputNames.has(preferred)) {
        outputNames.add(preferred);
        result.set(iv, preferred);
        break;
      }
    }
  }
  // Then, try mapping those that remained unmapped to one of the short ident names
  const shortNames = identGen.short;
  for (const iv of inputNames) {
    if (!result.has(iv)) {
      for (const short of shortNames) {
        if (!outputNames.has(short)) {
          outputNames.add(short);
          result.set(iv, short);
          break;
        }
      }
    }
  }
  // Finally, map all remaining idents to some general ident
  let i = 0;
  for (const iv of inputNames) {
    if (!result.has(iv)) {
      while (true) {
        const general = identGen.general(i++);
        if (!outputNames.has(general)) {
          outputNames.add(general);
          result.set(iv, general);
          break;
        }
      }
    }
  }
  return result;
}

function nameIdents(identMap: Map<string, string>) {
  return {
    enter(path: Path) {
      if (path.node.type === "Identifier") {
        const outputName = identMap.get(path.node.name);
        if (outputName === undefined) {
          throw new Error("Programming error. Incomplete identMap.");
        }
        path.node.name = outputName;
      }
    },
  };
}

function mapOps(opMap: Map<string, OpTransformOutput>, program: Program) {
  return {
    enter(path: Path) {
      const node = path.node;
      if (node.type === "BinaryOp" || node.type === "UnaryOp") {
        const f = opMap.get(node.op);
        if (f === undefined) {
          throw new Error(`Unsupported operator ${node.op}!`);
        }
        if (typeof f === "string") {
          node.name = f;
        } else if (Array.isArray(f)) {
          node.name = f[0];
          node.precedence = f[1];
        } else {
          let replacement: Expr;
          if (node.type === "BinaryOp") {
            replacement = f(node.left, node.right);
          } else {
            replacement = f(node.arg, node.arg);
          }
          if ("op" in replacement) replacement.op = node.op;
          replacement.valueType = getType(node, program);
          path.replaceWith(replacement);
        }
      }
    },
  };
}

export function applyLanguageToVariants(
  language: Language,
  programs: IR.Program[]
): string {
  let result: string | null = null;
  const errors = new Map<string, number>();
  let mostCommonErrorCount = 0;
  let mostCommonError = "";
  programs.forEach((x) => {
    try {
      const compiled = applyLanguageToVariant(language, x);
      if (result === null || result.length > compiled.length) {
        result = compiled;
      }
    } catch (err) {
      if (err instanceof Error) {
        errors.set(err.message, (errors.get(err.message) ?? 0) + 1);
        if (errors.get(err.message)! > mostCommonErrorCount) {
          mostCommonErrorCount++;
          mostCommonError = err.message;
        }
      }
    }
  });
  if (result !== null) return result;
  throw new Error(
    (programs.length > 1
      ? "No variant could be compiled. Most common error follows. "
      : "") + mostCommonError
  );
}

export function applyLanguage(language: Language, program: IR.Program): string {
  return applyLanguageToVariants(language, expandVariants(program));
}
