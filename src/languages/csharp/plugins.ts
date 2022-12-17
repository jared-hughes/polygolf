import { Path } from "../../common/traverse";
import { assignment, varDeclarationWithAssignment } from "../../IR";

const declared: Set<string> = new Set<string>();
export const addVarDeclarations = {
  enter(path: Path) {
    const node = path.node;
    if (node.kind === "Program") {
      declared.clear();
    } else if (
      node.kind === "VarDeclarationWithAssignment" &&
      node.assignments.kind === "Assignment" &&
      node.assignments.variable.kind === "Identifier"
    ) {
      declared.add(node.assignments.variable.name);
    } else if (
      node.kind === "Assignment" &&
      node.variable.kind === "Identifier" &&
      !declared.has(node.variable.name)
    ) {
      path.replaceWith(
        varDeclarationWithAssignment(assignment(node.variable, node.expr))
      );
    }
  },
};
