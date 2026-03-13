"use client";

import { useTransition, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import {
  adminUpdateCircleExcludedAction,
  adminUpdateCircleOverrideScoreAction,
} from "@/app/actions/admin";

// ── Toggle exclu ──────────────────────────────────────────────────────────────

export function ExcludedToggle({
  circleId,
  excluded,
}: {
  circleId: string;
  excluded: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    startTransition(async () => {
      await adminUpdateCircleExcludedAction(circleId, !checked);
    });
  }

  return (
    <Switch
      checked={!excluded}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label="Visible sur Explorer"
    />
  );
}

// ── Override score ────────────────────────────────────────────────────────────

export function OverrideScoreInput({
  circleId,
  overrideScore,
}: {
  circleId: string;
  overrideScore: number | null;
}) {
  const [value, setValue] = useState(overrideScore !== null ? String(overrideScore) : "");
  const [pending, startTransition] = useTransition();
  const isDirty = value !== (overrideScore !== null ? String(overrideScore) : "");

  function handleSave() {
    const parsed = value.trim() === "" ? null : Number(value);
    if (parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 100)) return;
    startTransition(async () => {
      await adminUpdateCircleOverrideScoreAction(circleId, parsed);
    });
  }

  function handleReset() {
    setValue(overrideScore !== null ? String(overrideScore) : "");
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="—"
        className="h-7 w-16 text-xs tabular-nums"
        disabled={pending}
      />
      {isDirty && (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={handleSave}
            disabled={pending}
          >
            <Check className="size-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={handleReset}
            disabled={pending}
          >
            <X className="size-3" />
          </Button>
        </>
      )}
    </div>
  );
}
