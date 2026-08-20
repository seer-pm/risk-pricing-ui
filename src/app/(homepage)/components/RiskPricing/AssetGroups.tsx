"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  countEditedAssets,
  useRiskPredictionStore,
} from "@/store/riskMarketStore";

import { RiskPricingOutcome } from "@/hooks/useMarketData";

import ArrowDown from "@/assets/svg/arrow-down.svg";

import { cn } from "@/utils";

import { FOCUS_RING } from "@/consts/styles";

import {
  ASSET_CATEGORIES,
  type AssetCategoryId,
  getAssetCategory,
} from "./constants";

import RiskPricing from ".";

const OPEN_GROUPS_STORAGE_KEY = "risk-open-asset-groups";

type AssetGroup = {
  id: AssetCategoryId;
  label: string;
  color: string;
  assets: RiskPricingOutcome[];
};

/**
 * How many assets in this group the user has moved off the market estimate.
 *
 * With the groups shut by default this badge is the only thing that says where
 * someone's work is after a reload, and the only visible sign that a drag on
 * the No To All strip - which rewrites every asset at once - did anything.
 */
const EditedBadge = ({ assets }: { assets: RiskPricingOutcome[] }) => {
  const edited = useRiskPredictionStore(
    useCallback((state) => countEditedAssets(state, assets), [assets]),
  );

  if (edited === 0) return null;

  return (
    <span className="bg-klerosUIComponentsMediumBlue text-klerosUIComponentsPrimaryBlue rounded-full px-2 py-0.5 text-xs font-semibold">
      {edited} edited
    </span>
  );
};

const GroupSection = ({
  group,
  isOpen,
  hasBeenOpened,
  onToggle,
}: {
  group: AssetGroup;
  isOpen: boolean;
  hasBeenOpened: boolean;
  onToggle: (id: AssetCategoryId) => void;
}) => {
  const { id, label, color, assets } = group;
  const bodyId = `asset-group-${id}`;

  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={bodyId}
        onClick={() => onToggle(id)}
        className={cn(
          "bg-klerosUIComponentsWhiteBackground border-klerosUIComponentsStroke border",
          "hover-medium-blue hover-short-transition cursor-pointer",
          "rounded-base flex w-full items-center gap-3 px-4 py-3 md:px-8",
          FOCUS_RING,
        )}
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-klerosUIComponentsPrimaryText text-lg font-semibold">
          {label}
        </span>
        <span className="text-klerosUIComponentsSecondaryText text-sm font-semibold">
          {assets.length}
        </span>
        <EditedBadge assets={assets} />
        <ArrowDown
          className={cn(
            "ml-auto size-3.5 shrink-0 transition-transform [&_path]:fill-current",
            "text-klerosUIComponentsPrimaryText",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Mounted on first open and kept mounted afterwards, so re-opening a
          group restores whichever cards were expanded inside it. Until then the
          33 sliders and 33 Credora panels never mount at all, which is most of
          what this page used to cost on load. */}
      {hasBeenOpened ? (
        <div
          id={bodyId}
          className={cn(
            "flex flex-col gap-4 pt-4 pl-0 md:pl-4",
            !isOpen && "hidden",
          )}
        >
          {assets.map((outcome) => (
            <RiskPricing key={outcome.outcomeId} outcome={outcome} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

/**
 * The 33 asset cards, split into the four categories the rest of the page
 * already colours by. Shut by default: as one flat list this was a ~2,700px
 * wall that buried everything below it.
 */
const AssetGroups = ({ assets }: { assets: RiskPricingOutcome[] }) => {
  const groups = useMemo(
    () =>
      ASSET_CATEGORIES.map(({ id, label, color }) => ({
        id,
        label,
        color,
        // Partitioning by category already yields the grouped order, so there
        // is nothing left for sortAssetsByCategory to do here; the filter keeps
        // the market's own order inside each group.
        assets: assets.filter(
          ({ outcome }) => getAssetCategory(outcome).id === id,
        ),
      })).filter(({ assets: members }) => members.length > 0),
    [assets],
  );

  const [openIds, setOpenIds] = useState<AssetCategoryId[]>([]);
  const [openedIds, setOpenedIds] = useState<AssetCategoryId[]>([]);

  // Restored after mount rather than during render: reading localStorage while
  // rendering would make the server's "all shut" markup disagree with the
  // client's and blow up hydration.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(OPEN_GROUPS_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as AssetCategoryId[];
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      setOpenIds(parsed);
      setOpenedIds(parsed);
    } catch {
      // A malformed entry is not worth failing the page over.
    }
  }, []);

  const persist = useCallback((ids: AssetCategoryId[]) => {
    setOpenIds(ids);
    setOpenedIds((opened) => [
      ...opened,
      ...ids.filter((id) => !opened.includes(id)),
    ]);
    try {
      window.localStorage.setItem(OPEN_GROUPS_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Private-mode storage failures must not break the toggle.
    }
  }, []);

  const toggle = useCallback(
    (id: AssetCategoryId) =>
      persist(
        openIds.includes(id)
          ? openIds.filter((openId) => openId !== id)
          : [...openIds, id],
      ),
    [openIds, persist],
  );

  const allOpen = openIds.length === groups.length;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => persist(allOpen ? [] : groups.map(({ id }) => id))}
          className={cn(
            "text-klerosUIComponentsPrimaryBlue rounded-base cursor-pointer px-1 text-sm font-semibold hover:underline",
            FOCUS_RING,
          )}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {groups.map((group) => (
        <GroupSection
          key={group.id}
          group={group}
          isOpen={openIds.includes(group.id)}
          hasBeenOpened={openedIds.includes(group.id)}
          onToggle={toggle}
        />
      ))}
    </div>
  );
};

export default AssetGroups;
