import { Path } from "../../common/traverse";
import { assignment, varDeclarationWithAssignment } from "../../IR";

const declared: Set<string> = new Set<string>();
export const addVarDeclarations = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Program") {
      declared.clear();
    } else if (
      node.type === "VarDeclarationWithAssignment" &&
      node.assignments.type === "Assignment" &&
      node.assignments.variable.type === "Identifier"
    ) {
      declared.add(node.assignments.variable.name);
    } else if (
      node.type === "Assignment" &&
      node.variable.type === "Identifier" &&
      !declared.has(node.variable.name)
    ) {
      path.replaceWith(
        varDeclarationWithAssignment(assignment(node.variable, node.expr))
      );
    }
  },
};
