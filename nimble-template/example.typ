#import "template.typ": *

#show: nimblemodule.with(
  font-size: 11pt
)

#let elementary(body) = {
  rect(fill: white, stroke: black, radius: 5pt, inset: 10pt)[
    #text(size: 14pt, fill: rgb(160, 160, 160))[*Elementary magic* #h(2mm) (available for all casters)]
    #body
  ]
}

#nimble-chapter(
  background: "artwork/heroes.jpg",
  title: "Heroic Boons"
)[
]

#page(columns: 2)[
= Character creation

+ *Class.* Choose one of the following 12 classes: #upper[Artificer, Bard, Berserker, Cleric, Commander, Druid, Hunter, Oathsworn, Rogue, Zephyr, Warlock, Wizard].\
  Denote your advantaged (+) and disadvantaged (--) save. Note your class's special abilities on your character sheet.
+ *Base stats.* Choose one of the following three arrays and assign the scores to your four base stats Strength (STR), Dexterity (DEX), Intelligence (INT) and Willpower (WIL). Recommended to put your highest stats to your the KEY scores (see your class).
  #align(center)[
    *Standard:* +2, +2, +0, -1\
    *Balanced:* +2, +1, +1, +0\
    *Min-Max:* +3, +1, +0, -2]
+ *Skills.* For each of your skills, note the bonus from the relevant stat (e.g. +2 on INT gives you +2 on Arcana). In addition, distribute *3 skill points* between these skills (spread across at least 2 different skills). Each gives +1 to the relevant skill.
+ *Ancestry and Background.* Choose an ancestry and a background and note their special abilities on your character sheet.
+ *Further stats.* Note your starting Health Points (see your class), your Health Dice size and maximum amount (usually equal to your level), your Speed (usually 30 ft.), your Initiative (usually equal to your DEX) and your inventory slots (10+STR).
+ *Languages.* Each character speaks Common and INT further languages. In addition, your ancestry may grant you additional languages.
  - *Common.* Spoken by most creatures.
  - *Elvish.* Spoken by elves and some gnomes.
  - *Dwarvish.* Spoken by dwarves and some gnomes.

+ *Heroic Boon.* Choose a Heroic Boon from the following list.
+ *Equipment.* You start with common clothes,  a backpack, a bedroll, a weapon of your choice, rations (d6) and a pouch with 40 gp which you can spend to buy further non-magic starting equipment.

= Leveling Up

+ *Health Points.* Roll your Health Die, rerolling 1s, and add that to your maximum HP. Increase your Health Dice maximum by 1.
+ *Extra skill point.* Gain 1 skill point. You can't have more than LVL skill points in a single skill (maximum: 8).
+ *Class features.* Gain new class features for your level.
+ *Other adjustments.* If any of your base stats increases, make sure to adjust other elements incluenced by this stat as well.

= Heroic Boons

When creating a character, choose a heroic boon from this list in addition to the usual steps from character creation.

*Skill Expert.* Gain 2 additional skill points. Maximum skill points you can have in a single stat increased by 1.

*Magic Initiate.* You know two options from the Essence cantrips.

*Animal Friend.* #lorem(15)

*Two Weapon Fighter.* #lorem(15)

*Crafter.* #lorem(20)

#nimble-monster((
  name: "Mind Bender",
  armor: "MED",
  hp: 40,
  speed: "30 ft.",
  challenge: "2",
  traits: (
    ("Shadow Prawler", "Double movement speed in shadows and darkness."),
  ),
  actions: (
    ("Bite & Stab (2x)", "1d6+2. On crit: Prone."),
  )
))
]

#nimble-table(
  "Swords and Knives",
  columns: (80pt, 1fr, 2fr, 50pt),
  [*Item*], [*Damage*], [*Properties*], [*Cost*],
  [Dagger], [1d4 + STR/DEX], [Concealable, Light, Throwable (20ft.), Vicious], [10 gp],
  [Shortsword], [1d6 + STR/DEX], [Light, Throwable (20ft.)], [10 gp],
  [Longsword], [1d10 + STR], [2-Handed], [10 gp]
)

*Light.* Can be used for two weapon fighting.
    
*Vicious.* On a crit, roll 2 additional dice instead of one.

#nimble-table(
  "Axes and Clubs",
  columns: (80pt, 1fr, 2fr, 50pt),
  [*Item*], [*Damage*], [*Properties*], [*Cost*],
  [Club], [1d4 + STR], [Brutal], [10 gp],
  [Hand Axe], [1d8 + STR], [], [10 gp],
  [Battleaxe], [2d6 + STR], [2-Handed], [10 gp]
)
*Brutal.* On a crit, the target must make a DC10 STR save against being dazed.

#nimble-table(
  "Other melee weapons", 
  columns: (80pt, 1fr, 2fr, 50pt),
  [*Item*], [*Damage*], [*Properties*], [*Cost*],
  [Rapier], [1d6 + DEX], [Reach 10ft.], [10 gp],
  [Spear], [1d6 + STR/DEX], [Light, Throwable (20ft.)], [10 gp],
  [Morningstar], [], [Brutal], [10 gp],
  [Quarterstaff], [1d8 + STR], [], [10 gp]
)

#nimble-table(
  "Bows", 
  columns: (80pt, 1fr, 2fr, 50pt),
  [*Item*], [*Damage*], [*Properties*], [*Cost*],
  [Shortbow], [1d6 + DEX], [2-Handed, Range 10-90 ft.], [10 gp],
  [Longbow], [1d8 + DEX], [2-Handed, Range 10-120ft., Req. 1 STR], [10 gp],
  [Crossbow], [4d4 + DEX], [2-Handed, Load: 1 Action, Range 5-60 ft.], [10 gp],
  [Handheld Ballista], [1d20 + DEX], [2-Handed, Load: 2 Actions, Range 5-60 ft., Req. 2 STR], [10 gp]
)
*Load.* Requires extra actions to load.

#pagebreak()

#nimble-class(
  name: "MAGE",
  key_stats: "INT, WIS",
  saves: "WILL+, STR--",
  armor: "Cloth",
  weapons: "Daggers, Staves, Wands",
  hit_die_size: 8
)[]

#nimble-level(level: 1)[
  *Elemental Spellcasting.* You know Fire, Ice and Lightning cantrips and 1 additional elementary magic cantrip of your choice.
]
#nimble-level(level: 2)[
  *Tier 1 spells.* You unlock Tier 1 Fire, Lightning and Ice spells and get a mana pool to cast these spells. This mana pool's maximum is always equal to #box[INT+2$times$LVL] and recharges on a Long Rest.\
]
#nimble-level(level: 3)[
  *Mage Subclass.* Choose a Mage subclass.
]
#nimble-level(level: 4)[
  *Tier 2 spells.* You may now cast Tier 2 spells and upcast spells at Tier 2.
]
#nimble-level(level: 1)[
  *Elemental Spellcasting.* Choose two of the following schools: Fire, Lightning, Ice. You learn their cantrips.\
]
#nimble-level(level: 2)[
  *Mage Subclass.* Choose a subclass.
  *Tier 1 spells.* You unlock Tier 1 Fire, Lightning and Ice spells and get a mana pool to cast these spells. This mana pool's maximum is always equal to #box[INT+2$times$LVL] and recharges on a Long Rest.\

  #nimble-note[*Magic* A thing that allows you to do real cool stuff.]
]
#nimble-level(level: 4)[
  *Tier 2 spells.* You may now cast Tier 2 spells and upcast spells at Tier 2.
]

#pagebreak()

#nimble-subclass("Illusionist", "Mage", symbol: "artwork/illusionist.png", description: "Illusionists specialize on playing tricking others' minds, making them believe they see things that aren't real.")[]

#nimble-level(level: 3)[
  *Visage Weaver.* You learn the Illusory Image spell (detailed below).

  *Sound Weaver.* Action: Create a sound that you could create with your own voice within 50 ft. (example: a scream or a few spoken words or a short melody).

  #nimble-note[
    *Examining illusions.* Unless they have a reason to be suspicious, creatures treat illusions as if they were real. Physical interactions reveal the illusory nature because things can pass through them.
  ]
]
#nimble-level(level: 7)[
  *Permanent illusion.* You can cause your illusions to last even after the spell ends. If you do so, they remain inanimate and freeze where they were when the spell expired.
]
#nimble-level(level: 11)[
  *Master illusionist.* When you create an illusory image, you can make it include sound for free, and the illusion also includes sensory effects such as heat if appropriate.
]
#nimble-level(level: 15)[
  *Intelligent illusion.* When you create a permanent illusion, you may describe a specific trigger that activates the illusion again, causing it to behave in a pre-defined way for up to 10 minutes, just as if the spell was cast again, even if you are not near it. The illusion can even take part in simple conversations.
]

#v(1fr)

#nimble-note[
    #nimble-spell(
  name: "Illusory Image",
  tier: 1,
  actions: 3,
  concentration: "10 minutes",
  upcast: "For each additional mana spent, choose: +2ft. size, +40ft. range or add sound to the illusion."
)[
  You create a purely visual illusion in an empty space within 30ft. that fits into a 2ft. cube. The image can move as you like.]
]

#nimble-chapter(
  title: "Spells",
  background: "artwork/magic.jpg"
)[
  == How to learn spells

  This chapter extends the "Spells" chapter from the Nimble 2e core rules. The core rules still apply unless stated otherwise. There are two types of spells: Combat spells (organized into six schools: Fire, Ice, Lightning, Wind, Radiant and Necrotic) and General spells.

  Classes get access to certain schools of combat spells (e.g. Radiant spells for an Oathsworn). The rules for these lists are unchanged, but there are a few additions to each list.

  In contrast to combat spells, general spells are not grouped into schools and have to be learned individually. They are not primarily designed for use in combat, but there might be some situations in combat where some of these spells are useful. Whenever a class gives access to a new tier of spells (including cantrips), you also learn a general spell of your choice. At level 1, this has to be a cantrip. At higher levels, can also choose a tiered spell.
]

/*
= UPCATED CORE SCHOOLS

Add the following spells to the respective schools.

== Fire spells

== Ice spells

== Lightning spells

== Wind spells

== Radiant spells

== Necrotic spells

= ELEMENTARY MAGIC
Magic tricks are among the simplest forms of magic. Many of them are used to introduce apprentices to magic because they are relatively easy to learn and it does not require a lot of effort for experienced spellcasters to use them.


#nimble-note[
  *Mana check.*
  Whenever you use an Elementary Magic cantrip, make a DC10 KEY check and lose 1 mana on a failure.
]

#nimble-spell(
  name: "Druidcraft"
)[*Nature.*]

#nimble-spell(
  name: "Prestidigitation"
)[Only heat/cool or soil/clean]

#nimble-spell(
  name: "Thaumaturgy"
)[]

#pagebreak()

= Fire spells
#lorem(30)

#elementary[
  #nimble-spell(
    name: "Control Flames"
  )[*Fire.* Control flames or produce flame]
]

#pagebreak()

= Ice spells
#lorem(39)

#elementary[
  #nimble-spell(
    name: "Shape Water",
    actions: 10
  )[*Ice.* Shape water or ice, let it freeze]
]

#pagebreak()

= Radiant spells
#lorem(25)

#elementary[
#nimble-spell(
  name: "Light"
)[*Divine.*]
]

#pagebreak()

= Wind spells
#lorem(30)

#elementary[
  #nimble-spell(
    name: "Gust"
  )[*Wind.*]
]

#pagebreak()

= Lightning spells
#lorem(42)

#nimble-spell(
  name: "(Lightning)"
)[*Lightning.*]

#pagebreak()

= Necrotic spells
#lorem(23)

#nimble-spell(
  name: "(Necrotic)"
)[*Necrotic.*]

#pagebreak()
*/

= ENCHANTMENT
Enchantment magic is used to manipulate other beings' mind and body. 

*Targets.* Unless stated otherwise, the following spells can only affect humanoid creatures and beasts.

*Range.* Enchantment spells have a range of 50ft.

Whenever a creature succeeds on its save against an enchantment spell, it is immune against this spell for 24 hours if used by the same spellcaster.

#elementary[
  #nimble-spell(
    name: "Calm Emotions",
    tier: 0
  )[]
]

#nimble-spell(
  name: "Sleep",
  tier: 1,
  actions: 2,
  upcast: "+1 target for each additional mana spent"
)[A target within 30ft. that is not doing something particularly exciting when you cast this spell falls asleep for 1 hour.]

#nimble-spell(
  name: "Fear",
  tier: 1,
  actions: 1,
  upcast: "+1 target for each additional mana spent. If at least 5 mana is spent, the targets flee and are utterly terrified for 1 hour."
)[
  A target within 30ft. becomes frightened of you on a failed *WILL save*. If you are no longer near it, the spell ends.

  #nimble-note[*Frightened.* The creature waits cautiously and is generally afraid of you, but does not flee. It does not take actions, but the spell ends if the creature or any of its allies is involved in combat.]
]

#nimble-spell(
  name: "Command",
  tier: 2,
  actions: 2
)[On a failed *WILL save*, a target within 30ft. acts according to your suggested actions for a few seconds unless that action requires a great amount of effort (such as attacking someone or casting a spell).]

#nimble-spell(
  name: "Shrink",
  tier: 2
)[You or an adjacent creature shrink to half their original size in all dimensions, granting them -3 STR. The effect ends after 10 minutes. Unwilling creatures can make a *WILL save* to prevent this.]

#nimble-spell(
  name: "Grow",
  tier: 3
)[You or an adjacent creature grow to twice their original size in all dimensions, granting them +3 STR and -3 DEX. The effect ends after 10 minutes. Unwilling creatures can make a *WILL save* to prevent this.]

#nimble-spell(
  name: "Dominate",
  tier: 3,
  actions: 10,
  concentration: "1 hour",
  upcast: "For each additional mana spent: +1 hour or +1 maximum target level."
)[A target within 30ft. is taken over by you on a failed *WILL save*. You can control its actions with precise instructions, but it has no self-initiative otherwise and stands passively, only reacting to immediate danger. The target's self-initiative is so small that it can't cast spells or answer questions with anything else than _yes_ or _no_. The spell ends if the target drops below half of its maximum hit points or if any of your commands is against the target's nature. This spell cannot affect creatures above level 1 (beasts count as 2 levels lower).]

/*
#pagebreak()

= ILLUSION
Illusion magic is used to create illusory sounds and images without actually creating any real object. Stronger illusion magic might also create the impression of sensing other effects such as heat and smell. Because illusions are immaterial and things can pass through them, physical interactions with illusions reveal their illusory nature.

#nimble-note[
  *Examining an illusion.* Creatures may attempt an Examination check against the spellcaster's save DC to discern the illusion for what it is on a success (e.g. as part of an Awareness action). Normally, it they have no reason to be suspicious, creatures do not attempt such a check.
]

#elementary[
  #nimble-spell(
    name: "Ghost Sound",
    concentration: "1 minute"
  )[You create a sound that you could create with your own voice within 30ft. Casting this spell again when it ends causes the sound to continue naturally.]

  #nimble-spell(
    name: "Minor Illusion",
    concentration: "1 minute"
  )[You create an immobile, purely visual illusion within 30ft. that fits into a 3ft. cube.]
]

#nimble-spell(
  name: "Illusory Image",
  tier: 1,
  actions: 3,
  concentration: "10 minutes",
  upcast: "+3ft. size for each additional mana spent. If at least 3 mana is spent, you can cause the image to include sound. If at least 5 mana is spent, you can cause it to include sensoric effects as well."
)[You create a purely visual illusion in an empty space within 30ft. that fits into a 3ft. cube. The image can move as you like.]

#nimble-spell(
  name: "Invisibility",
  tier: 1,
  actions: 3,
  concentration: "10 minutes",
  upcast: "+10 minutes for each additional mana spent."
)[You and everything you are wearing or carrying become invisible until the spell ends. It is still possible to sense your heat, sound and smell.]

#nimble-spell(
  name: "Programmed Illusion",
  tier: 5,
  actions: 10
)[]

#pagebreak()

= DISPLACEMENT
Displacement magic is used to manipulate the location of creatures, objects and particles, mostly for moving them.

#elementary[
  #nimble-spell(
    name: "Fetch Object"
  )[Cause an object within 30ft. with a weight of up to 10 pounds to slowly float towards you in a straight line.]
]

#nimble-spell(
  name: "Telekinesis",
  tier: 1,
  actions: 3,
  concentration: "1 minute"
)[You can move and manipulate objects within 30ft. in the same way you could with your own hands.]

#nimble-spell(
  name: "Reduce/Enlarge"
)[]

#nimble-spell(
  name: "Silence",
  concentration: "1 minute",
  tier: 2
)[In a 30ft. radius centered at you, all sound is significantly muffled: Normal conversations become barely noticeable, screams become normal conversations.]

#nimble-spell(
  name: "Levitate",
  tier: 3,
  actions: 2,
  concentration: "1 minute"
)[A target within 30ft. (willing creature or object) loses its gravity. However, it does not float into any particular direction on its own.]

#nimble-spell(
  name: "Teleportation Circle",
  actions: 10,
  tier: 5,
  upcast: "+1 creature for each additional mana spent"
)[You and up to KEY willing creatures teleport to a teleportation circle you created beforehand, provided the circle is still intact at the time of casting.]

#nimble-spell(
  name: "Teleport",
  actions: 2,
  tier: 7
)[]

#pagebreak()

= DIVINATION
Divination magic is used to gain information.

#elementary[
  #nimble-spell(
    name: "Detect Magic",
    tier: 0,
    actions: 10,
    concentration: "1 minute"
  )[You sense the presence of magic within 30ft. of you and get an intuition for its strength, but not for its location or type.]

  #nimble-spell(
    name: "Message",
    upcast: "For each mana spent, multiply the range by 5."
  )[Range: 300ft.]
]

#nimble-spell(
  name: "Detect Aura",
  tier: 2,
  actions: 10,
  concentration: "10 minutes",
  upcast: "If you spend at least 5 mana, you see a translucent aura of all kinds of spellcraft and magical beings within range, revealing illusions and invisibility to you."
)[You sense the presence of magic effects and beings with a demonic, divine, elemental, primal or necromantic aura within 90ft. and their general direction and strength. You also sense the presence of other magic effects in the area, but not their type.]

#nimble-spell(
  name: "Detect Poison"
)[Possibly also disease.]

#nimble-spell(
  name: "Find Person",
  tier: 1,
  actions: 10,
  concentration: "10 minutes"
)[Choose a person of which you know the name and have a personal object (such as a hair tuft or a trinket). You know the direction of their location get a rough idea how far away they are.]

#nimble-spell(
  name: "Darkvision",
  tier: 2
)[Essentially infrared sight to simulate darkvision]

#nimble-spell(
  name: "Sense Emotions",
  tier: 1,
  actions: 10,
  upcast: "+1 mana: Learn the most present thought in the target's mind."
)[You sense the general mood of a creature within 30ft. of you.]

#nimble-spell(
  name: "Speak with Nature",
  tier: 1,
  actions: 10,
  concentration: "10 minutes",
  upcast: "If you spend 1 additional mana, you can understand plants as well."
)[Gain the ability to understand and speak the language of animals. You can only talk about primitive concepts and ideas due to the limitations of the animal's language and its intelligence. *Maybe move away from DIVINATION*]

#nimble-spell(
  name: "Hear the Ghosts",
  tier: 3
)[]

#nimble-spell(
  name: "Augury",
  tier: 5,
  actions: 10
)[]

#pagebreak()

= ABJURATION

#nimble-spell(
  name: "Absorb Elements"
)[]

#nimble-spell(
  name: "Arcane Lock",
  tier: 2,
  actions: 10
)[Touch a lock (e.g. of a door or chest) and choose a passphrase by saying it aloud. It becomes locked and can only be opened again by saying the passphrase.]

#nimble-spell(
  name: "Circle of Resistance",
  actions: 10,
  tier: 1
)[Like Protection from Good and Evil or possible Bless variant with effects only on saving throws]

#nimble-spell(
  name: "Nondetection Circle",
  actions: 100,
  tier: 3
)[You create a 30ft. radius sphere that protects its interior from being detected by magic.]

#nimble-spell(
  name: "Circle of Protection",
  tier: 3,
  actions: 100
)[Alarm when someone enters the circle, ]

#nimble-spell(
  name: "Dispel Magic",
  tier: 2,
  actions: 10
)[]

#nimble-spell(
  name: "Counterspell",
  tier: 3,
  actions: 3
)[_(Reaction, when you see a creature within 30ft. casting a spell.)_ You disrupt a target in the process of casting a spell. On a failed *STR save*, the spell has no effect and the target cannot cast spells during this turn. The target does not lose mana for attempting to cast the spell.]
*/