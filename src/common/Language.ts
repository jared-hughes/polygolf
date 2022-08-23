import { IR, Visitor } from "IR";

export interface Language {
  name: string;
  /** The visitors are applied in left-to-right order. */
  plugins: Visitor[];
  emitter: Emitter;
  identGen: IdentifierGenerator;
}

export interface IdentifierGenerator {
  preferred: (original: string) => string[];
  short: string[];
  general: (i: number) => string;
}

export type Emitter = (program: IR.Program) => string;

export var defaultIdentGen = {
  preferred(original: string) {
    let lower = original[0].toLowerCase();
    let upper = original[0].toUpperCase();
    return [original[0], original[0] == lower ? upper : lower];
  },
  short: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  general: (i: number) => "v" + i.toString(),
};
