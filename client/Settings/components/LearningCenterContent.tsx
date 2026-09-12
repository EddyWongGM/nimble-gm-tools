import * as React from "react";

export interface LearningCenterShowMe {
  label: string;
  tab: string;
}

export interface LearningCenterItem {
  id: string;
  title: string;
  body: React.ReactNode;
  showMe?: LearningCenterShowMe;
}

export interface LearningCenterGroup {
  id: string;
  title: string;
  items: LearningCenterItem[];
}

// The "Learning Nimble" group (class/topic one-pager guides) is deliberately
// left out until the V1 guides ship (plans/private/GUIDES_ONEPAGER.md) - see
// plans/LEARNING_CENTER_PLAN.md's sequencing note. Add it here once
// public/guides/ exists.
export const learningCenterGroups: LearningCenterGroup[] = [
  {
    id: "encounter-basics",
    title: "Encounter Basics",
    items: [
      {
        id: "encounter-basics.heroes-vs-monsters",
        title: "Adding Heroes vs. Monsters",
        body: "Monsters get cloned when added from the library - each copy only exists for the current encounter. Heroes are unique and persist their changes (HP, tags, notes) across encounters."
      },
      {
        id: "encounter-basics.damage-and-healing",
        title: "Applying damage and healing",
        body: "Apply negative damage to heal a combatant. Temporary HP overwrites any temporary HP a combatant already has rather than stacking with it, matching the Nimble rules."
      },
      {
        id: "encounter-basics.turn-taken",
        title: "Marking a combatant's turn taken",
        body: "Nimble doesn't use a strict turn order - mark a combatant's turn as taken when they act, instead of stepping through a fixed initiative list."
      },
      {
        id: "encounter-basics.hidden-combatants",
        title: "Hidden combatants",
        body: "Hold Alt while clicking a library entry to add it to the encounter hidden from the Player View."
      },
      {
        id: "encounter-basics.multi-select",
        title: "Multi-select combatants",
        body: "Hold a modifier key while clicking to select multiple combatants at once, then apply damage or tags to all of them together."
      }
    ]
  },
  {
    id: "rooms",
    title: "Rooms",
    items: [
      {
        id: "rooms.what-is-a-room",
        title: "What a Room is",
        body: "A Room is a non-combat info card for read-aloud text and GM notes - not a monster. It's excluded from difficulty math, hidden from the Player View by default, and has no HP bar."
      },
      {
        id: "rooms.creating-one",
        title: "Creating a Room",
        body: "Make a StatBlock in the Monsters library and set Player to \"Room.\" The form collapses to just a Name and a large Description field - write your read-aloud text there."
      },
      {
        id: "rooms.gm-secrets",
        title: "GM-only secrets, traps, and loot",
        body: "Use the \"Update Persistent Notes\" command (default key Y on a selected combatant) to keep GM-only notes on a Room or any combatant. Toolbar/inline buttons for it can be enabled in Settings → Commands.",
        showMe: { label: "Open Commands settings", tab: "Commands" }
      },
      {
        id: "rooms.persisting",
        title: "Persisting a Room",
        body: "Use \"Save Current Location\" at the bottom of the Encounters tab. Reuse the same Name and Folder each time to overwrite instead of duplicating - notes only persist once you re-save this way."
      },
      {
        id: "rooms.real-monsters",
        title: "A Room can hold real monsters too",
        body: "Add actual monsters to the same combatants list alongside the room-info entry - a Room doesn't have to be empty."
      }
    ]
  },
  {
    id: "custom-fields",
    title: "Custom Fields",
    items: [
      {
        id: "custom-fields.defining",
        title: "Defining a custom statblock field",
        body: "Custom Statblock Fields let you define your own name/default-value field on statblocks, and optionally show it as a column in the Combatants list. This is part of Legendary Tier, under its Settings tab once you've supported the project on Patreon."
      }
    ]
  },
  {
    id: "tags-conditions",
    title: "Tags & Conditions",
    items: [
      {
        id: "tags-conditions.auto-expiring",
        title: "Auto-expiring tags",
        body: "Tags can be set to disappear automatically after a set number of rounds, so temporary conditions clean themselves up without manual bookkeeping."
      },
      {
        id: "tags-conditions.concentration",
        title: "Automatic Concentration reminders",
        body: "Tag a combatant \"Concentrating\" to get an automatic reminder to check Concentration when they take damage. This can be disabled in Options.",
        showMe: { label: "Open Options settings", tab: "Options" }
      }
    ]
  },
  {
    id: "library-management",
    title: "Library Management",
    items: [
      {
        id: "library-management.library-manager",
        title: "Library Manager",
        body: "Bulk move, delete, or export multiple library entries at once. Enable it from the Commands tab.",
        showMe: { label: "Open Commands settings", tab: "Commands" }
      },
      {
        id: "library-management.edit-unique-monster",
        title: "\"Edit Unique Monster\" command",
        body: "Make ad-hoc changes to a single monster in the current encounter without touching its library copy."
      }
    ]
  },
  {
    id: "scaling-difficulty",
    title: "Scaling & Difficulty",
    items: [
      {
        id: "scaling-difficulty.legendary-monsters",
        title: "Legendary monsters",
        body: "Legendary monsters enter combat with HP scaled to match the number of heroes present."
      },
      {
        id: "scaling-difficulty.scalable-normal-monsters",
        title: "Scalable Normal monsters",
        body: "Opt a Normal monster into scaling its HP by hero count, the same way Legendary monsters do, without making it a full Legendary monster."
      }
    ]
  },
  {
    id: "player-view",
    title: "Player View",
    items: [
      {
        id: "player-view.sharing-url",
        title: "Sharing the Player View",
        body: "Share the Player View URL to any device (a TV, tablet, or a player's own phone) to give everyone a synced, read-only view of the encounter."
      },
      {
        id: "player-view.qualitative-hp",
        title: "NPC HP shown qualitatively",
        body: "By default, monster HP shows as a qualitative indicator (like \"Bloodied\") rather than exact numbers in the Player View. This is configurable in Options.",
        showMe: { label: "Open Options settings", tab: "Options" }
      }
    ]
  },
  {
    id: "inventory",
    title: "Inventory",
    items: [
      {
        id: "inventory.enabling",
        title: "Enabling Inventory",
        body: "Turn on the Inventory feature in Options, then use a combatant's \"Add Item\" command to start tracking items on a hero.",
        showMe: { label: "Open Options settings", tab: "Options" }
      }
    ]
  },
  {
    id: "settings-shortcuts",
    title: "Settings & Shortcuts",
    items: [
      {
        id: "settings-shortcuts.keybindings",
        title: "Keybindings and advanced commands",
        body: "Every command's keybinding, toolbar visibility, and inline visibility can be customized from the Commands tab.",
        showMe: { label: "Open Commands settings", tab: "Commands" }
      },
      {
        id: "settings-shortcuts.export-data",
        title: "Exporting your data",
        body: "This app is in a beta state - periodically export your user data from About as a safety net in case anything goes wrong.",
        showMe: { label: "Open About", tab: "About" }
      }
    ]
  },
  {
    id: "account",
    title: "Account",
    items: [
      {
        id: "account.account-sync",
        title: "Account Sync",
        body: "Pledge on Patreon to unlock Account Sync, which keeps your Heroes and Encounters available across any device you sign in on.",
        showMe: { label: "Open Account settings", tab: "Account" }
      }
    ]
  }
];
