import { describe, expect, it } from "vite-plus/test";
import { runRule } from "../../../test-utils/run-rule.js";
import { activityWrapsEffectHeavySubtree } from "./activity-wraps-effect-heavy-subtree.js";

describe("activity-wraps-effect-heavy-subtree", () => {
  it("flags Activity wrapping an effect-heavy same-file component", () => {
    const code = `
      import { Activity, useEffect } from "react";
      const EditProfileSheet = ({ user }) => {
        useEffect(() => { subscribe(user.id); return () => unsubscribe(user.id); }, [user.id]);
        useEffect(() => { trackOpen(user.id); }, [user.id]);
        return null;
      };
      const Screen = ({ open, user }) => (
        <Activity mode={open ? "visible" : "hidden"}>
          <EditProfileSheet user={user} />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toContain("EditProfileSheet");
  });

  it("flags Activity wrapping a component with useLayoutEffect", () => {
    const code = `
      import { Activity, useLayoutEffect } from "react";
      const Sheet = () => {
        useLayoutEffect(() => measure(), []);
        return null;
      };
      const Screen = ({ open }) => (
        <Activity mode={open ? "visible" : "hidden"}>
          <Sheet />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(1);
  });

  it("flags Activity wrapping multiple effectful children", () => {
    const code = `
      import { Activity, useEffect } from "react";
      const Header = () => { useEffect(() => bind(), []); return null; };
      const Body = () => { useEffect(() => observe(), []); return null; };
      const Screen = ({ open }) => (
        <Activity mode={open ? "visible" : "hidden"}>
          <Header />
          <Body />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].message).toContain("Header");
    expect(result.diagnostics[0].message).toContain("Body");
  });

  it("flags Activity aliased import (unstable_Activity as Activity)", () => {
    const code = `
      import { unstable_Activity as Activity, useEffect } from "react";
      const Sheet = () => { useEffect(() => subscribe(), []); return null; };
      const Screen = ({ open }) => (
        <Activity mode={open ? "visible" : "hidden"}>
          <Sheet />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(1);
  });

  it('does NOT flag Activity with static `mode="hidden"` (pinned, no toggle)', () => {
    // Regression: static `mode="hidden"` is also non-toggleable —
    // there's no hide/show cycle, so no Effect teardown / recreate.
    // The rule must only fire on truly dynamic mode expressions.
    const code = `
      import { Activity, useEffect } from "react";
      const Sheet = () => { useEffect(() => subscribe(), []); return null; };
      const Screen = () => (
        <Activity mode="hidden">
          <Sheet />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('does NOT flag Activity with static `mode={"hidden"}` JSXExpressionContainer', () => {
    const code = `
      import { Activity, useEffect } from "react";
      const Sheet = () => { useEffect(() => subscribe(), []); return null; };
      const Screen = () => (
        <Activity mode={"hidden"}>
          <Sheet />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag Activity with statically visible mode (no toggle)", () => {
    const code = `
      import { Activity, useEffect } from "react";
      const Sheet = () => { useEffect(() => subscribe(), []); return null; };
      const Screen = () => (
        <Activity mode="visible">
          <Sheet />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag Activity without a mode prop (defaults to visible)", () => {
    const code = `
      import { Activity, useEffect } from "react";
      const Sheet = () => { useEffect(() => subscribe(), []); return null; };
      const Screen = () => (
        <Activity>
          <Sheet />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag Activity wrapping an effect-free component", () => {
    const code = `
      import { Activity } from "react";
      const Spinner = () => <div />;
      const Screen = ({ open }) => (
        <Activity mode={open ? "visible" : "hidden"}>
          <Spinner />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag Activity wrapping a component not defined in the same file (v1 scope)", () => {
    const code = `
      import { Activity } from "react";
      import { EditProfileSheet } from "./profile";
      const Screen = ({ open }) => (
        <Activity mode={open ? "visible" : "hidden"}>
          <EditProfileSheet />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag a user-component named Activity not imported from react", () => {
    const code = `
      import { Activity } from "./calendar";
      import { useEffect } from "react";
      const Entry = () => { useEffect(() => subscribe(), []); return null; };
      const Screen = () => (
        <Activity mode="open">
          <Entry />
        </Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("flags <React.Activity> via the React default-import namespace", () => {
    const code = `
      import React, { useEffect } from "react";
      const Sheet = () => { useEffect(() => subscribe(), []); return null; };
      const Screen = ({ open }) => (
        <React.Activity mode={open ? "visible" : "hidden"}>
          <Sheet />
        </React.Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(1);
  });

  it('flags <React.Activity> via `import * as React from "react"`', () => {
    const code = `
      import * as React from "react";
      const Sheet = () => { React.useEffect(() => subscribe(), []); return null; };
      const Screen = ({ open }) => (
        <React.Activity mode={open ? "visible" : "hidden"}>
          <Sheet />
        </React.Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(1);
  });

  it("does NOT flag <Calendar.Activity> (namespace isn't a React import)", () => {
    const code = `
      import * as Calendar from "./calendar";
      import { useEffect } from "react";
      const Entry = () => { useEffect(() => subscribe(), []); return null; };
      const Screen = ({ open }) => (
        <Calendar.Activity mode={open ? "visible" : "hidden"}>
          <Entry />
        </Calendar.Activity>
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("does NOT flag an Activity child with no JSX children", () => {
    const code = `
      import { Activity } from "react";
      const Screen = ({ open }) => (
        <Activity mode={open ? "visible" : "hidden"} />
      );
    `;
    const result = runRule(activityWrapsEffectHeavySubtree, code);
    expect(result.diagnostics).toHaveLength(0);
  });
});
