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
  const [localExcluded, setLocalExcluded] = useState(excluded);
  const [pending, startTransition] = useTransition();

  function handleChange(checked: boolean) {
    const newExcluded = !checked;
    setLocalExcluded(newExcluded);
    startTransition(async () => {
      const result = await adminUpdateCircleExcludedAction(circleId, newExcluded);
      if (!result.success) setLocalExcluded(excluded); // revert on error
    });
  }

  return (
    <Switch
      checked={!localExcluded}
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
  const committedValue = overrideScore !== null ? String(overrideScore) : "";
  const [value, setValue] = useState(committedValue);
  const [pending, startTransition] = useTransition();
  const isDirty = value !== committedValue;

  const parsed = value.trim() === "" ? null : Number(value);
  const isInvalid = parsed !== null && (isNaN(parsed) || parsed < 0 || parsed > 100);

  function handleSave() {
    if (isInvalid) return;
    startTransition(async () => {
      const result = await adminUpdateCircleOverrideScoreAction(circleId, parsed);
      if (result.success) setValue(parsed !== null ? String(parsed) : "");
    });
  }

  function handleReset() {
    setValue(committedValue);
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
        className={`h-7 w-16 text-xs tabular-nums ${isInvalid ? "border-destructive" : ""}`}
        disabled={pending}
      />
      {isDirty && (
        <>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={handleSave}
            disabled={pending || isInvalid}
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
