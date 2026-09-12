import * as React from "react";
import { useCallback, useState } from "react";
import { LegacySynchronousLocalStore } from "../../Utility/LegacySynchronousLocalStore";
import { learningCenterGroups } from "./LearningCenterContent";

const PROGRESS_KEY = "LearningCenterProgress";

function loadProgress(): Record<string, boolean> {
  return (
    LegacySynchronousLocalStore.Load<Record<string, boolean>>(
      LegacySynchronousLocalStore.User,
      PROGRESS_KEY
    ) ?? {}
  );
}

interface LearningCenterProps {
  goToTab: (tab: string) => void;
}

export function LearningCenter(props: LearningCenterProps) {
  const [progress, setProgress] = useState<Record<string, boolean>>(
    loadProgress
  );

  const toggleItem = useCallback((id: string, checked: boolean) => {
    setProgress(previous => {
      const next = { ...previous, [id]: checked };
      LegacySynchronousLocalStore.Save(
        LegacySynchronousLocalStore.User,
        PROGRESS_KEY,
        next
      );
      return next;
    });
  }, []);

  const totalItems = learningCenterGroups.reduce(
    (sum, group) => sum + group.items.length,
    0
  );
  const learnedCount = learningCenterGroups.reduce(
    (sum, group) =>
      sum + group.items.filter(item => progress[item.id]).length,
    0
  );

  return (
    <div className="tab-content learning-center">
      <p className="learning-center__progress">
        {learnedCount} / {totalItems} learned
      </p>
      {learningCenterGroups.map(group => (
        <details key={group.id} className="learning-center__group">
          <summary>{group.title}</summary>
          {group.items.map(item => (
            <details key={item.id} className="learning-center__item">
              <summary>
                <label
                  className="learning-center__checkbox"
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={!!progress[item.id]}
                    onChange={e => toggleItem(item.id, e.target.checked)}
                  />
                </label>
                <span className="learning-center__title">{item.title}</span>
              </summary>
              <div className="learning-center__body">
                <p>{item.body}</p>
                {item.showMe && (
                  <a
                    href="#"
                    className="learning-center__show-me"
                    onClick={e => {
                      e.preventDefault();
                      props.goToTab(item.showMe.tab);
                    }}
                  >
                    {item.showMe.label}
                  </a>
                )}
              </div>
            </details>
          ))}
        </details>
      ))}
    </div>
  );
}
