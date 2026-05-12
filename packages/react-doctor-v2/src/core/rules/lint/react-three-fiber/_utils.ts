import { isNodeOfType } from "../utils.js";
import type { EsTreeNode, Rule, RuleContext } from "../utils.js";

export const THREE_ALLOCATING_CONSTRUCTORS = new Set([
  "Box3",
  "BufferGeometry",
  "Color",
  "Euler",
  "Group",
  "Matrix4",
  "Mesh",
  "Object3D",
  "Quaternion",
  "Raycaster",
  "Vector2",
  "Vector3",
]);

export const isUseFrameCall = (node: EsTreeNode): boolean =>
  isNodeOfType(node, "CallExpression") &&
  isNodeOfType(node.callee, "Identifier") &&
  node.callee.name === "useFrame";

export type { EsTreeNode, Rule, RuleContext };
export { isNodeOfType } from "../utils.js";
