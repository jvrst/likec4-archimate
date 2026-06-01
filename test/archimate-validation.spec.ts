import { test } from 'vitest'
import { likec4model } from './likec4-model'

// ── Element kind groups per ArchiMate 3.1 ───────────────────────────────────

const motivation = [
  'stakeholder', 'driver', 'assessment', 'goal', 'outcome',
  'principle', 'requirement', 'constraint', 'meaning', 'value',
]

const strategy = ['resource', 'capability', 'valueStream', 'courseOfAction']

const businessActive   = ['businessActor', 'businessRole', 'businessCollaboration', 'businessInterface']
const businessBehavior = ['businessProcess', 'businessFunction', 'businessInteraction', 'businessEvent']
const businessService  = ['businessService']
const businessPassive  = ['businessObject', 'contract', 'product']

const appActive   = ['appComponent', 'appCollaboration', 'appInterface']
const appBehavior = ['appFunction', 'appInteraction', 'appProcess', 'appEvent']
const appService  = ['appService']
const appPassive  = ['dataObject']

const techActive   = ['techNode', 'device', 'systemSoftware', 'techCollaboration', 'techInterface', 'path', 'communicationNetwork']
const techBehavior = ['techFunction', 'techProcess', 'techInteraction', 'techEvent']
const techService  = ['techService']
const techPassive  = ['artifact']

const physicalActive  = ['equipment', 'facility', 'distributionNetwork']
const physicalPassive = ['material']

const allActive   = [...businessActive,   ...appActive,   ...techActive,   ...physicalActive]
const allBehavior = [...businessBehavior, ...appBehavior, ...techBehavior]
const allService  = [...businessService,  ...appService,  ...techService]
const allPassive  = [...businessPassive,  ...appPassive,  ...techPassive,  ...physicalPassive]

// ── Helper ───────────────────────────────────────────────────────────────────

function validPairs(combinations: [string[], string[]][]): Set<string> {
  const pairs = new Set<string>()
  for (const [sources, targets] of combinations) {
    for (const s of sources) for (const t of targets) pairs.add(`${s}→${t}`)
  }
  return pairs
}

// ── Realization ──────────────────────────────────────────────────────────────
// Gives concrete form to a more abstract concept.
// Valid: behavior→service (within layer), lower-layer→upper-layer, strategy/business→motivation.

test('realization: valid source/target combinations', ({ expect }) => {
  const valid = validPairs([
    [businessBehavior,                    businessService],
    [appBehavior,                         appService],
    [techBehavior,                        techService],
    [[...appActive,  ...appService],      [...businessService, ...businessBehavior]],
    [[...techActive, ...techService],     [...appService,      ...appActive]],
    [[...strategy,   ...businessBehavior, ...businessActive], motivation],
    [motivation,                          motivation],
    [businessPassive,                     [...businessPassive, ...businessService]],
  ])

  for (const r of likec4model.relationshipsWhere({ kind: 'realization' })) {
    expect.soft(
      valid.has(`${r.source.kind}→${r.target.kind}`),
      `realization "${r.source.id}" → "${r.target.id}": ${r.source.kind} → ${r.target.kind} is not a valid ArchiMate realization`
    ).toBe(true)
  }
})

// ── Assignment ───────────────────────────────────────────────────────────────
// Active structure element is responsible for performing behavior,
// or a node hosts a passive structure element.

test('assignment: active structure → behavior/service/passive within same layer', ({ expect }) => {
  const valid = validPairs([
    [businessActive, [...businessBehavior, ...businessService, ...businessPassive, ...businessActive]],
    [appActive,      [...appBehavior,      ...appService,      ...appPassive]],
    [techActive,     [...techBehavior,     ...techService,     ...techPassive]],
    [physicalActive, physicalPassive],
  ])

  for (const r of likec4model.relationshipsWhere({ kind: 'assignment' })) {
    expect.soft(
      valid.has(`${r.source.kind}→${r.target.kind}`),
      `assignment "${r.source.id}" → "${r.target.id}": ${r.source.kind} → ${r.target.kind} is not a valid ArchiMate assignment`
    ).toBe(true)
  }
})

// ── Serving ──────────────────────────────────────────────────────────────────
// An element provides its functionality for use by another element.
// Passive structure cannot serve — it is accessed, not serving.

test('serving: source must not be passive structure or motivation', ({ expect }) => {
  const invalidSources = [...allPassive, ...motivation]

  for (const r of likec4model.relationshipsWhere({ kind: 'serving' })) {
    expect.soft(
      !invalidSources.includes(r.source.kind),
      `serving "${r.source.id}" → "${r.target.id}": ${r.source.kind} cannot be a serving source`
    ).toBe(true)
  }
})

// ── Access ───────────────────────────────────────────────────────────────────
// A behavior or active structure element reads, writes, or uses a passive structure element.

test('access: source must be active/behavior/service and target must be passive structure', ({ expect }) => {
  const validSources = [...allActive, ...allBehavior, ...allService]

  for (const r of likec4model.relationshipsWhere({ kind: 'access' })) {
    expect.soft(
      validSources.includes(r.source.kind),
      `access "${r.source.id}" → "${r.target.id}": ${r.source.kind} is not a valid access source`
    ).toBe(true)
    expect.soft(
      allPassive.includes(r.target.kind),
      `access "${r.source.id}" → "${r.target.id}": ${r.target.kind} is not passive structure (access target must be passive)`
    ).toBe(true)
  }
})

// ── Triggering ───────────────────────────────────────────────────────────────
// Causal or temporal ordering between behavior elements or events.
// Active structure may also trigger events (e.g. a component emitting an event).

test('triggering: source and target must be behavior, service, or active structure', ({ expect }) => {
  const valid = [...allActive, ...allBehavior, ...allService]

  for (const r of likec4model.relationshipsWhere({ kind: 'triggering' })) {
    expect.soft(
      valid.includes(r.source.kind),
      `triggering "${r.source.id}" → "${r.target.id}": ${r.source.kind} cannot trigger`
    ).toBe(true)
    expect.soft(
      valid.includes(r.target.kind),
      `triggering "${r.source.id}" → "${r.target.id}": ${r.target.kind} cannot be triggered`
    ).toBe(true)
  }
})

// ── Flow ─────────────────────────────────────────────────────────────────────
// Transfer of information, goods, or money between behavior elements.

test('flow: source and target must be behavior, service, or passive structure', ({ expect }) => {
  const valid = [...allBehavior, ...allService, ...allPassive]

  for (const r of likec4model.relationshipsWhere({ kind: 'flow' })) {
    expect.soft(
      valid.includes(r.source.kind),
      `flow "${r.source.id}" → "${r.target.id}": ${r.source.kind} is not a valid flow source`
    ).toBe(true)
    expect.soft(
      valid.includes(r.target.kind),
      `flow "${r.source.id}" → "${r.target.id}": ${r.target.kind} is not a valid flow target`
    ).toBe(true)
  }
})

// ── Influence ────────────────────────────────────────────────────────────────
// An element affects another, primarily within the Motivation aspect.

test('influence: target must be a motivation or strategy element', ({ expect }) => {
  const validTargets = [...motivation, ...strategy]

  for (const r of likec4model.relationshipsWhere({ kind: 'influence' })) {
    expect.soft(
      validTargets.includes(r.target.kind),
      `influence "${r.source.id}" → "${r.target.id}": ${r.target.kind} is not a valid influence target (must be motivation or strategy)`
    ).toBe(true)
  }
})

// ── Specialization ───────────────────────────────────────────────────────────
// One element is a more specific form of another of the same type.

test('specialization: source and target must be the same element kind', ({ expect }) => {
  for (const r of likec4model.relationshipsWhere({ kind: 'specialization' })) {
    expect.soft(
      r.source.kind === r.target.kind,
      `specialization "${r.source.id}" → "${r.target.id}": source kind "${r.source.kind}" must match target kind "${r.target.kind}"`
    ).toBe(true)
  }
})

// ── Composition & Aggregation ────────────────────────────────────────────────
// Structural containment within the same layer.

test('composition: source and target must be in the same ArchiMate layer', ({ expect }) => {
  const layers = [
    [...motivation],
    [...strategy],
    [...businessActive, ...businessBehavior, ...businessService, ...businessPassive],
    [...appActive,      ...appBehavior,      ...appService,      ...appPassive],
    [...techActive,     ...techBehavior,     ...techService,     ...techPassive],
    [...physicalActive, ...physicalPassive],
  ]

  function layerOf(kind: string): number {
    return layers.findIndex(l => l.includes(kind))
  }

  for (const r of likec4model.relationshipsWhere({ kind: 'composition' })) {
    expect.soft(
      layerOf(r.source.kind) === layerOf(r.target.kind),
      `composition "${r.source.id}" → "${r.target.id}": ${r.source.kind} and ${r.target.kind} are in different layers`
    ).toBe(true)
  }
})

test('aggregation: source and target must be in the same ArchiMate layer', ({ expect }) => {
  const layers = [
    [...motivation],
    [...strategy],
    [...businessActive, ...businessBehavior, ...businessService, ...businessPassive],
    [...appActive,      ...appBehavior,      ...appService,      ...appPassive],
    [...techActive,     ...techBehavior,     ...techService,     ...techPassive],
    [...physicalActive, ...physicalPassive],
  ]

  function layerOf(kind: string): number {
    return layers.findIndex(l => l.includes(kind))
  }

  for (const r of likec4model.relationshipsWhere({ kind: 'aggregation' })) {
    expect.soft(
      layerOf(r.source.kind) === layerOf(r.target.kind),
      `aggregation "${r.source.id}" → "${r.target.id}": ${r.source.kind} and ${r.target.kind} are in different layers`
    ).toBe(true)
  }
})
