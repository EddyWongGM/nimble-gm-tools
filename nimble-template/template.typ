#let darkred = rgb("#540808")
#let darkyellow = rgb("#fcba03")

#let nimblemodule(
  title: "",
  author: "",
  printable: false,
  font-size: 12pt,
  paper: "a4",
  body) = {
  set page("a4",
    background: image(
      "img/background-full.png", 
      height: 100%, fit: "cover"),
    margin: (x: 14%, y: 4cm),
  )

  set document(author: author, title: title)
  
  set text(
    font: "Avenir Next LT Pro",
    size: font-size,
    lang: "en",
    fill: black
  )
  
  show heading.where(level: 1): it => {
    set par(leading: 3em)
    set text(font: "Avenir Next LT Pro")
    text(size: 24pt, it.body)
  }

  show heading.where(depth: 2): it => {
    set text(size: 20pt, font: "IBM Plex Serif")
    it.body
  }

  show heading.where(depth: 3): it => {
    set text(size: 14pt)
    it.body
  }

  body
}

#let nimble-chapter(
  body,
  background: "",
  title: "Chapter"
) = {
  page(
    background: image(background, height: 100%, width: 100%, fit: "cover")
  )[
    #place(bottom + center)[
      #text(font: "Avenir Next LT Pro", size: 56pt, fill: white, stroke: black, weight: "extrabold")[#title]
    ]
  ]
}

#let nimble-margin(body, margin-width: 40pt, margin: "") = {
  grid(
    columns: (margin-width, 1fr),
    align: (right, left),
    gutter: 18pt,
    text(fill: rgb(120,120,120), weight: "bold")[_#margin _],
    [#body]
  )
}

#let nimble-level(
  body,
  level: 1
) = {
  nimble-margin(body, margin-width: 40pt, margin: [LEVEL #level])
}

#let nimble-spell(
  body, 
  name: "Spell",
  actions: 1,
  tier: 0,
  concentration: "",
  material: "",
  upcast: "",
  higher-levels: ""
) = {
  nimble-margin(
    margin-width: 50pt,
    margin: [
      #v(0.25em)
      #if tier == 0 {
        [CANTRIP]
      }else{
        [TIER #tier]
      }\
      #if actions == 1 {
        [#actions ACTION]
      }else if actions == 10 {
        [#calc.floor(actions / 10) MINUTE]
      }else if actions > 10 {
        [#calc.floor(actions / 10) MINUTES]
      }else{
        [#actions ACTIONS]
      }
  ])[
    === #name

    #if concentration != "" {
      [_(Concentration, up to #concentration.)_]
    }
    #body\
    #if higher-levels != "" {
      [*Higher levels:* #upcast]
    }
    #if upcast != "" {
      [*Upcasting:* #upcast]
    }
  ]
}

#let nimble-note(body) = {
  set rect(
    fill: rgb(212, 205, 187),
    inset: 10pt,
    radius: 5pt,
    width: 100%
  )

  rect[#body]
}

#let nimble-class(
  body, name: "", 
  key_stats: "None", 
  saves: "None", 
  hit_die_size: 8,
  armor: "None", 
  weapons: "STR"
) = {
  nimble-margin[
      #text(font: "Avenir Next LT Pro", weight: "extrabold", size: 28pt)[*#name*]

      #v(-3mm)

      #grid(
        align: left,
        columns: (90pt, 1fr),
        [
          *Key Stats:* #key_stats\
          *Saves:* #saves

        ],
        [
          *Health Dice:* 1d#hit_die_size (starting HP: #calc.ceil((3 * hit_die_size + 1) / 2))\
          *Armor:* #armor #h(4mm) *Weapons:* #weapons
        ]
      )
    ]

    v(5mm)
}

#let nimble-subclass(name, class, body, symbol: "artwork/class.png", description: "") = {
  align(center)[
    #image(symbol, width: 30%)

    #v(-8mm)

    #set text(font: "Avenir Next LT Pro")

    #text(size: 28pt, weight: "extrabold")[#name]

    #v(-6mm)

    #text(size: 14pt)[#class Subclass]
  ]

  v(6mm)

  align(center)[
    #description
  ]

  v(5mm)
}

#let nimble-monster(stats) = {
  nimble-note[
    #place(top + right, dy: 1mm)[
      #set text(weight: "bold", fill: rgb(120, 120, 120))
      CR #stats.challenge
    ]
    #align(center)[
      #set text(font: "Avenir Next LT Pro", weight: "bold", size: 16pt)
      #upper(stats.name)
    ]
    #rect(fill: rgb(191, 184, 151), width: 100%, outset: 3.5mm, inset: 0mm, radius: 0mm)[
      #align(center)[
        #for skill in stats.traits {
          [
            *#skill.at(0).* #skill.at(1)

          ]
        }
      ]
    ]
    #v(2mm)
    #for action in stats.actions {
      [
        *#action.at(0).* #action.at(1)

      ]
    }

    #line(stroke: white, length: 100%)
    #v(-4mm)
    #align(center)[
      #set text(weight: "semibold", fill: rgb(120, 120, 120), size: 14pt)
      #text(size: 20pt)[»] #upper[*#stats.speed*]
      #h(3mm)
      #text(size: 20pt)[#str.from-unicode(9829)]
  *#stats.hp*
    ]
    #v(-1mm)
  ]
}

#let nimble-table(name, columns: (1fr, 4fr), ..contents) = [
  *#smallcaps(text(size: 1.3em)[#name])*
  #v(-1em)
  #table(
  columns: columns,
  align: (col, row) =>
   if col == 0 { center }
    else { left },
  fill: (col, row) => if calc.odd(row+1) { rgb("#aaaaaa00") } else { rgb("#cac4b5") },
  inset: 10pt,
  stroke: none,
  // align: horizon,
  ..contents
  )
]