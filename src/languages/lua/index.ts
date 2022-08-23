import { Language } from "../../common/Language";
import { removeMutatingBinaryOp } from "../../plugins/mutatingBinaryOps";

import emitProgram from "./emit";
import transformBuiltins from "./transformBuiltins";

const luaLanguage: Language = {
  name: "Lua",
  plugins: [removeMutatingBinaryOp, transformBuiltins],
  emitter: emitProgram,
};

export default luaLanguage;
